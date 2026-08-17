import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import process from 'node:process'

// 房价日历“清除覆盖 / 跳过已覆盖”语义的真实 MySQL smoke（issue #4）：
// 覆盖新增、更新、跳过、删除、幂等、校验、跨租户拒绝与并发唯一性。

const baseUrl = (process.env.PMS_BASE_URL || 'http://localhost:8090/api').replace(/\/$/, '')
const mysql = process.env.MYSQL_BIN || 'mysql'
const dbHost = process.env.DB_HOST || '127.0.0.1'
const dbPort = process.env.DB_PORT || '3306'
const dbName = process.env.DB_NAME || 'pms_xkzoom'
const dbUser = process.env.DB_APP_USER || 'pms_app'
const dbPassword = process.env.DB_APP_PASSWORD || 'Pms@App2026Secure'
const loginPassword = process.env.PMS_TEST_PASSWORD || 'admin123'

const tenantCodeA = 'RATE_CAL_SMOKE_A'
const tenantCodeB = 'RATE_CAL_SMOKE_B'
const userA = 'rate_cal_smoke_a'
const userB = 'rate_cal_smoke_b'
const propertyCode = 'RATE_CAL_SMOKE_PROPERTY'
const roomTypeCode = 'RATE_CAL_SMOKE_ROOM'
const ratePlanCode = 'RATE_CAL_SMOKE_PLAN'

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const day1 = day(40)
const day2 = day(41)
const day3 = day(42)
const day4 = day(43)

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
    INSERT INTO tenant (code, name, status) VALUES ('${tenantCodeA}', '房价日历冒烟A', 1);
    SET @tidA = LAST_INSERT_ID();
    INSERT INTO tenant (code, name, status) VALUES ('${tenantCodeB}', '房价日历冒烟B', 1);
    SET @tidB = LAST_INSERT_ID();

    INSERT INTO user (
      tenant_id, username, password, real_name, role, status, created_at, updated_at, deleted
    )
    SELECT @tidA, '${userA}', password, '房价日历冒烟A', 'ADMIN', 1, NOW(), NOW(), 0
      FROM user WHERE username = 'admin' AND deleted = 0 LIMIT 1;
    INSERT INTO user (
      tenant_id, username, password, real_name, role, status, created_at, updated_at, deleted
    )
    SELECT @tidB, '${userB}', password, '房价日历冒烟B', 'ADMIN', 1, NOW(), NOW(), 0
      FROM user WHERE username = 'admin' AND deleted = 0 LIMIT 1;

    INSERT INTO property (tenant_id, name, code, status)
      VALUES (@tidA, '房价日历冒烟物业', '${propertyCode}', 1);
    SET @pid = LAST_INSERT_ID();

    INSERT INTO room_type (tenant_id, property_id, name, code, base_price, max_occupancy, status)
      VALUES (@tidA, @pid, '冒烟标间', '${roomTypeCode}', 500.00, 2, 1);
    SET @rtid = LAST_INSERT_ID();

    INSERT INTO rate_plan (
      tenant_id, property_id, room_type_id, name, code, base_price, currency, active
    ) VALUES (
      @tidA, @pid, @rtid, '冒烟基础价', '${ratePlanCode}', 500.00, 'CNY', 1
    );
  `)

  const ids = sql(`
    SELECT CONCAT(t.id, ',', p.id, ',', rt.id, ',', rp.id)
    FROM tenant t
    JOIN property p ON p.tenant_id = t.id AND p.code = '${propertyCode}'
    JOIN room_type rt ON rt.tenant_id = t.id AND rt.code = '${roomTypeCode}'
    JOIN rate_plan rp ON rp.tenant_id = t.id AND rp.code = '${ratePlanCode}'
    WHERE t.code = '${tenantCodeA}';
  `).split(',').map(Number)
  const [tenantId, , roomTypeId, ratePlanId] = ids
  assert.ok(ids.every(Number.isFinite), `failed to create fixtures: ${ids}`)

  const login = async (username) => {
    const data = await mustOk('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: loginPassword })
    })
    return { Authorization: `Bearer ${data.token}` }
  }
  const authA = await login(userA)

  const rateCalendarCount = (stayDate) => Number(sql(`
    SELECT COUNT(*) FROM rate_calendar
    WHERE tenant_id = ${tenantId} AND rate_plan_id = ${ratePlanId} AND stay_date = '${stayDate}';
  `))
  const priceOf = (stayDate) => sql(`
    SELECT price FROM rate_calendar
    WHERE tenant_id = ${tenantId} AND rate_plan_id = ${ratePlanId} AND stay_date = '${stayDate}';
  `)

  // 1) 单日 upsert 新增显式覆盖
  await mustOk('/rate-calendar', {
    method: 'POST',
    headers: authA,
    body: JSON.stringify({
      ratePlanId, roomTypeId, stayDate: day1, price: 688.0, available: 1, remarks: '冒烟覆盖'
    })
  })
  assert.equal(rateCalendarCount(day1), 1, 'upsert should create exactly one row')
  assert.equal(priceOf(day1), '688.00')

  // 2) skipOverridden=true：已有覆盖保持不变，缺失日按请求创建
  const skippedBatch = await mustOk('/rate-calendar/batch', {
    method: 'POST',
    headers: authA,
    body: JSON.stringify({
      ratePlanId, roomTypeId, fromDate: day1, toDate: day3,
      mode: 'FIXED', value: 400.0, skipOverridden: true, closeRoom: false, remarks: null
    })
  })
  assert.deepEqual(
    { inserted: skippedBatch.inserted, updated: skippedBatch.updated, skipped: skippedBatch.skipped },
    { inserted: 2, updated: 0, skipped: 1 },
    `skipOverridden=true counts: ${JSON.stringify(skippedBatch)}`
  )
  assert.equal(priceOf(day1), '688.00', 'existing override must stay untouched')
  assert.equal(priceOf(day2), '400.00')
  assert.equal(priceOf(day3), '400.00')

  // 3) skipOverridden=false：范围内每天 upsert
  const fullBatch = await mustOk('/rate-calendar/batch', {
    method: 'POST',
    headers: authA,
    body: JSON.stringify({
      ratePlanId, roomTypeId, fromDate: day1, toDate: day2,
      mode: 'FIXED', value: 300.0, skipOverridden: false, closeRoom: false, remarks: null
    })
  })
  assert.deepEqual(
    { inserted: fullBatch.inserted, updated: fullBatch.updated, skipped: fullBatch.skipped },
    { inserted: 0, updated: 2, skipped: 0 },
    `skipOverridden=false counts: ${JSON.stringify(fullBatch)}`
  )
  assert.equal(priceOf(day1), '300.00')
  assert.equal(priceOf(day2), '300.00')

  // 4) 清除覆盖：行被删除；重复清除幂等
  const cleared = await mustOk(`/rate-calendar?ratePlanId=${ratePlanId}&stayDate=${day1}`, {
    method: 'DELETE',
    headers: authA
  })
  assert.equal(cleared, true, 'first clear should report true')
  assert.equal(rateCalendarCount(day1), 0, 'explicit row must be gone after clear')
  const clearedAgain = await mustOk(`/rate-calendar?ratePlanId=${ratePlanId}&stayDate=${day1}`, {
    method: 'DELETE',
    headers: authA
  })
  assert.equal(clearedAgain, false, 'second clear should be idempotent false')

  // 5) 校验拒绝：反向日期 / 未知 mode / 房型不匹配
  const reversed = await request('/rate-calendar/batch', {
    method: 'POST',
    headers: authA,
    body: JSON.stringify({
      ratePlanId, roomTypeId, fromDate: day3, toDate: day1, mode: 'FIXED', value: 100.0
    })
  })
  assert.equal(reversed.body.code, 400, `reversed range should be rejected: ${JSON.stringify(reversed.body)}`)

  const badMode = await request('/rate-calendar/batch', {
    method: 'POST',
    headers: authA,
    body: JSON.stringify({
      ratePlanId, roomTypeId, fromDate: day1, toDate: day2, mode: 'MAGIC', value: 100.0
    })
  })
  assert.equal(badMode.body.code, 400, `unknown mode should be rejected: ${JSON.stringify(badMode.body)}`)

  const mismatched = await request('/rate-calendar/batch', {
    method: 'POST',
    headers: authA,
    body: JSON.stringify({
      ratePlanId, roomTypeId: roomTypeId + 1000000, fromDate: day1, toDate: day2,
      mode: 'FIXED', value: 100.0
    })
  })
  assert.equal(mismatched.body.code, 400, `room type mismatch should be rejected: ${JSON.stringify(mismatched.body)}`)
  assert.equal(mismatched.body.message, '房价计划与房型不匹配')

  // 6) 跨租户：B 租户引用 A 的计划，统一拒绝且不泄露存在性
  const authB = await login(userB)
  const crossTenant = await request('/rate-calendar/batch', {
    method: 'POST',
    headers: authB,
    body: JSON.stringify({
      ratePlanId, roomTypeId, fromDate: day1, toDate: day2, mode: 'FIXED', value: 100.0
    })
  })
  assert.equal(crossTenant.body.code, 400, `cross-tenant plan should be rejected: ${JSON.stringify(crossTenant.body)}`)
  assert.equal(crossTenant.body.message, '房价计划不存在或无权访问')

  // 7) 并发同日 upsert：租户级唯一键下无重复行
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      request('/rate-calendar', {
        method: 'POST',
        headers: authA,
        body: JSON.stringify({
          ratePlanId, roomTypeId, stayDate: day4,
          price: 320.0 + index, available: 1, remarks: '并发冒烟'
        })
      })
    )
  )
  assert.ok(
    concurrent.every((item) => item.body.code === 200),
    `concurrent upserts should all succeed idempotently: ${JSON.stringify(concurrent.map((i) => i.body.code))}`
  )
  assert.equal(rateCalendarCount(day4), 1, 'concurrent upserts must not create duplicate rows')

  console.log(
    'Rate calendar smoke passed: insert/update/skip counts verified; clear deletes the explicit row '
      + 'and is idempotent; validation and cross-tenant requests rejected; 8 concurrent upserts kept 1 row'
  )
} finally {
  cleanup()
}
