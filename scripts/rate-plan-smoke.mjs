import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import process from 'node:process'

// 房价计划显式上下文 smoke（issue #5）：
// 双租户 × 双房型 × 同房型双计划的正向与负向用例，验证
// “一条 rate plan 绑定一个 room type”的写入校验与日历按计划隔离。

const baseUrl = (process.env.PMS_BASE_URL || 'http://localhost:8090/api').replace(/\/$/, '')
const mysql = process.env.MYSQL_BIN || 'mysql'
const dbHost = process.env.DB_HOST || '127.0.0.1'
const dbPort = process.env.DB_PORT || '3306'
const dbName = process.env.DB_NAME || 'pms_xkzoom'
const dbUser = process.env.DB_APP_USER || 'pms_app'
const dbPassword = process.env.DB_APP_PASSWORD || 'Pms@App2026Secure'
const loginPassword = process.env.PMS_TEST_PASSWORD || 'admin123'

const tenantCodeA = 'RATE_PLAN_SMOKE_A'
const tenantCodeB = 'RATE_PLAN_SMOKE_B'
const userA = 'rate_plan_smoke_a'
const userB = 'rate_plan_smoke_b'
const property1Code = 'RATE_PLAN_SMOKE_P1'
const property2Code = 'RATE_PLAN_SMOKE_P2'
const roomType1Code = 'RATE_PLAN_SMOKE_RT1'
const roomType2Code = 'RATE_PLAN_SMOKE_RT2'

const day1 = new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10)
const day2 = new Date(Date.now() + 51 * 86400000).toISOString().slice(0, 10)

function sql(statement) {
  return execFileSync(
    mysql,
    ['-h', dbHost, '-P', dbPort, '-u', dbUser, '-D', dbName, '-N', '-B', '-e', statement],
    {
      encoding: 'utf8',
      env: { ...process.env, MYSQL_PWD: dbPassword },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  ).trim()
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
}

async function mustOk(path, options = {}) {
  const { status, body } = await request(path, options)
  assert.equal(status, 200, `${path} returned HTTP ${status}: ${JSON.stringify(body)}`)
  assert.ok(body && (body.code === 200 || body.code === 0), `${path} envelope: ${JSON.stringify(body)}`)
  return body.data
}

function cleanup() {
  sql(`
    DELETE FROM audit_log WHERE tenant_id IN (SELECT id FROM tenant WHERE code IN ('${tenantCodeA}', '${tenantCodeB}'));
    DELETE rc FROM rate_calendar rc
      JOIN tenant t ON t.id = rc.tenant_id
      WHERE t.code IN ('${tenantCodeA}', '${tenantCodeB}');
    DELETE rp FROM rate_plan rp
      JOIN tenant t ON t.id = rp.tenant_id
      WHERE t.code IN ('${tenantCodeA}', '${tenantCodeB}');
    DELETE rt FROM room_type rt
      JOIN tenant t ON t.id = rt.tenant_id
      WHERE t.code IN ('${tenantCodeA}', '${tenantCodeB}');
    DELETE p FROM property p
      JOIN tenant t ON t.id = p.tenant_id
      WHERE t.code IN ('${tenantCodeA}', '${tenantCodeB}');
    DELETE FROM user WHERE username IN ('${userA}', '${userB}');
    DELETE FROM tenant WHERE code IN ('${tenantCodeA}', '${tenantCodeB}');
  `)
}

try {
  cleanup()
  sql(`
    INSERT INTO tenant (code, name, status) VALUES ('${tenantCodeA}', '计划冒烟A', 1);
    SET @tidA = LAST_INSERT_ID();
    INSERT INTO tenant (code, name, status) VALUES ('${tenantCodeB}', '计划冒烟B', 1);
    SET @tidB = LAST_INSERT_ID();

    INSERT INTO user (tenant_id, username, password, real_name, role, status, created_at, updated_at, deleted)
    SELECT @tidA, '${userA}', password, '计划冒烟A', 'ADMIN', 1, NOW(), NOW(), 0
      FROM user WHERE username = 'admin' AND deleted = 0 LIMIT 1;
    INSERT INTO user (tenant_id, username, password, real_name, role, status, created_at, updated_at, deleted)
    SELECT @tidB, '${userB}', password, '计划冒烟B', 'ADMIN', 1, NOW(), NOW(), 0
      FROM user WHERE username = 'admin' AND deleted = 0 LIMIT 1;

    INSERT INTO property (tenant_id, name, code, status) VALUES (@tidA, '计划冒烟物业一', '${property1Code}', 1);
    SET @p1 = LAST_INSERT_ID();
    INSERT INTO property (tenant_id, name, code, status) VALUES (@tidA, '计划冒烟物业二', '${property2Code}', 1);

    INSERT INTO room_type (tenant_id, property_id, name, code, base_price, max_occupancy, status)
      VALUES (@tidA, @p1, '计划冒烟房型一', '${roomType1Code}', 480.00, 2, 1);
    INSERT INTO room_type (tenant_id, property_id, name, code, base_price, max_occupancy, status)
      VALUES (@tidA, @p1, '计划冒烟房型二', '${roomType2Code}', 560.00, 4, 1);
  `)

  const ids = sql(`
    SELECT CONCAT(t.id, ',', p1.id, ',', p2.id, ',', rt1.id, ',', rt2.id)
    FROM tenant t
    JOIN property p1 ON p1.tenant_id = t.id AND p1.code = '${property1Code}'
    JOIN property p2 ON p2.tenant_id = t.id AND p2.code = '${property2Code}'
    JOIN room_type rt1 ON rt1.tenant_id = t.id AND rt1.code = '${roomType1Code}'
    JOIN room_type rt2 ON rt2.tenant_id = t.id AND rt2.code = '${roomType2Code}'
    WHERE t.code = '${tenantCodeA}';
  `).split(',').map(Number)
  const [tenantId, property1Id, property2Id, roomType1Id, roomType2Id] = ids
  assert.ok(ids.every(Number.isFinite), `failed to create fixtures: ${ids}`)

  const login = async (username) => {
    const data = await mustOk('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: loginPassword })
    })
    return { Authorization: `Bearer ${data.token}` }
  }
  const authA = await login(userA)
  const authB = await login(userB)

  const createPlan = (auth, body) =>
    request('/rate-plans', { method: 'POST', headers: auth, body: JSON.stringify(body) })

  // ===== 正向：同房型双计划 + 跨房型，均显式绑定 =====
  const planBody = (roomTypeId, name, code, basePrice) => ({
    propertyId: property1Id, roomTypeId, name, code, basePrice, currency: 'CNY',
    mealPlan: '', minNights: 1, maxNights: 99, description: '', active: 1
  })
  const plan1 = (await mustOk('/rate-plans', {
    method: 'POST', headers: authA,
    body: JSON.stringify({ ...planBody(roomType1Id, '标准价一', 'RP_SMOKE_1', 480) })
  }))
  const plan2 = (await mustOk('/rate-plans', {
    method: 'POST', headers: authA,
    body: JSON.stringify({ ...planBody(roomType1Id, '周末价一', 'RP_SMOKE_2', 620) })
  }))
  const plan3 = (await mustOk('/rate-plans', {
    method: 'POST', headers: authA,
    body: JSON.stringify({ ...planBody(roomType2Id, '标准价二', 'RP_SMOKE_3', 560) })
  }))
  assert.ok(plan1.id && plan2.id && plan3.id, 'plans must be created with ids')
  assert.equal(plan1.roomTypeId, roomType1Id)
  assert.equal(plan1.propertyId, property1Id)

  // 同房型双计划：日历按显式计划隔离
  await mustOk('/rate-calendar', {
    method: 'POST', headers: authA,
    body: JSON.stringify({
      ratePlanId: plan1.id, roomTypeId: roomType1Id, stayDate: day1, price: 488, available: 1
    })
  })
  await mustOk('/rate-calendar', {
    method: 'POST', headers: authA,
    body: JSON.stringify({
      ratePlanId: plan2.id, roomTypeId: roomType1Id, stayDate: day1, price: 699, available: 1
    })
  })
  const cal1 = await mustOk(`/rate-calendar?roomTypeId=${roomType1Id}&ratePlanId=${plan1.id}&from=${day1}&to=${day2}`, { headers: authA })
  const cal2 = await mustOk(`/rate-calendar?roomTypeId=${roomType1Id}&ratePlanId=${plan2.id}&from=${day1}&to=${day2}`, { headers: authA })
  assert.equal(cal1.length, 1, 'plan1 calendar must expose only its own row')
  assert.equal(cal1[0].price, 488)
  assert.equal(cal2.length, 1, 'plan2 calendar must expose only its own row')
  assert.equal(cal2[0].price, 699)

  // 更新：改名不动绑定
  const renamed = await mustOk(`/rate-plans/${plan1.id}`, {
    method: 'PUT', headers: authA, body: JSON.stringify({ name: '标准价一改' })
  })
  assert.equal(renamed.name, '标准价一改')
  assert.equal(renamed.roomTypeId, roomType1Id)

  // ===== 负向：校验拒绝 =====
  const expectBizError = async (promise, expectedMessage) => {
    const { body } = await promise
    assert.equal(body.code, 400, `expected business error, got: ${JSON.stringify(body)}`)
    assert.equal(body.message, expectedMessage)
  }

  // 跨物业：计划物业二 + 房型一（属物业一）
  await expectBizError(
    createPlan(authA, { ...planBody(roomType1Id, '跨物业', 'RP_SMOKE_X1', 100), propertyId: property2Id }),
    '物业与房型不匹配'
  )
  // 房型不存在 / 跨租户不可见
  await expectBizError(
    createPlan(authA, { ...planBody(9999999, '幽灵房型', 'RP_SMOKE_X2', 100) }),
    '房型不存在或无权访问'
  )
  // 租户 B 引用租户 A 的房型
  await expectBizError(
    createPlan(authB, { ...planBody(roomType1Id, '跨租户', 'RP_SMOKE_X3', 100) }),
    '房型不存在或无权访问'
  )
  // 空名称
  await expectBizError(
    createPlan(authA, { ...planBody(roomType1Id, '  ', 'RP_SMOKE_X4', 100) }),
    '计划名称不能为空'
  )
  // 日历查询缺 ratePlanId
  const noPlan = await request(`/rate-calendar?roomTypeId=${roomType1Id}&from=${day1}&to=${day2}`, { headers: authA })
  assert.notEqual(noPlan.body?.code, 200, 'calendar query without ratePlanId must be rejected')
  // 日历查询计划与房型不匹配
  await expectBizError(
    request(`/rate-calendar?roomTypeId=${roomType2Id}&ratePlanId=${plan1.id}&from=${day1}&to=${day2}`, { headers: authA }),
    '房价计划与房型不匹配'
  )
  // 租户 B 用 A 的计划写日历
  await expectBizError(
    request('/rate-calendar', {
      method: 'POST', headers: authB,
      body: JSON.stringify({ ratePlanId: plan1.id, roomTypeId: roomType1Id, stayDate: day2, price: 100 })
    }),
    '房价计划不存在或无权访问'
  )

  // ===== 审计：计划创建（非 GET）已记录 request id / 资源路径 / 成功状态 =====
  const audit = sql(`
    SELECT COUNT(*) FROM audit_log
    WHERE tenant_id = ${tenantId}
      AND action = 'POST'
      AND resource LIKE '%/api/rate-plans%';
  `)
  assert.ok(Number(audit) >= 3, `rate-plan POST writes must be audited, got ${audit}`)
  const auditSample = sql(`
    SELECT CONCAT(LENGTH(request_id) > 0, ',', resource LIKE '%/api/rate-plans%', ',', success)
    FROM audit_log
    WHERE tenant_id = ${tenantId} AND action = 'POST' AND resource LIKE '%/api/rate-plans%'
    LIMIT 1;
  `)
  assert.equal(auditSample, '1,1,1', `audit row must carry request id, resource and success: ${auditSample}`)

  console.log(
    'Rate plan smoke passed: explicit roomType/property binding enforced; dual plans on one room type '
      + 'keep isolated calendars; cross-property/cross-tenant/mismatched requests rejected; writes audited'
  )
} finally {
  cleanup()
}
