import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import process from 'node:process'

const baseUrl = (process.env.PMS_BASE_URL || 'http://localhost:8090/api').replace(/\/$/, '')
const mysql = process.env.MYSQL_BIN || 'mysql'
const dbHost = process.env.DB_HOST || '127.0.0.1'
const dbPort = process.env.DB_PORT || '3306'
const dbName = process.env.DB_NAME || 'pms_xkzoom'
const dbUser = process.env.DB_APP_USER || 'pms_app'
const dbPassword = process.env.DB_APP_PASSWORD || 'Pms@App2026Secure'
const testUsername = 'tenant_isolation_test'
const tenantCode = 'TENANT_ISOLATION_TEST'
const propertyCode = 'TENANT_ISOLATION_PROPERTY'

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
  const body = await response.json()
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}`)
  return body
}

async function login(username, password) {
  const body = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
  assert.equal(body.code, 200, `login failed: ${JSON.stringify(body)}`)
  assert.ok(body.data.token)
  assert.ok(body.data.tenantId)
  return {
    tenantId: body.data.tenantId,
    headers: { Authorization: `Bearer ${body.data.token}` }
  }
}

function cleanup() {
  sql(`
    DELETE FROM property WHERE code = '${propertyCode}';
    DELETE FROM user WHERE username = '${testUsername}';
    DELETE FROM tenant WHERE code = '${tenantCode}';
  `)
}

try {
  cleanup()
  sql(`
    INSERT INTO tenant (code, name, status)
    VALUES ('${tenantCode}', '隔离测试租户', 1);
    SET @test_tenant_id = LAST_INSERT_ID();
    INSERT INTO user (
      tenant_id, username, password, real_name, role, status, created_at, updated_at, deleted
    )
    SELECT
      @test_tenant_id, '${testUsername}', password, '隔离测试用户',
      'ADMIN', 1, NOW(), NOW(), 0
    FROM user
    WHERE username = 'admin' AND deleted = 0
    LIMIT 1;
  `)

  const primary = await login('admin', 'admin123')
  const secondary = await login(testUsername, 'admin123')
  assert.notEqual(primary.tenantId, secondary.tenantId)

  const primaryBefore = await request('/properties?current=1&size=100', {
    headers: primary.headers
  })
  assert.equal(primaryBefore.code, 200)
  assert.equal(
    primaryBefore.data.records.some((item) => item.code === propertyCode),
    false
  )

  const created = await request('/properties', {
    method: 'POST',
    headers: secondary.headers,
    body: JSON.stringify({
      name: '隔离验证物业',
      code: propertyCode,
      status: 1
    })
  })
  assert.equal(created.code, 200, JSON.stringify(created))
  assert.ok(created.data.id)
  const propertyId = created.data.id

  const persistedTenantId = Number(
    sql(`SELECT tenant_id FROM property WHERE id = ${Number(propertyId)}`)
  )
  assert.equal(persistedTenantId, secondary.tenantId)

  const secondaryList = await request('/properties?current=1&size=100', {
    headers: secondary.headers
  })
  assert.equal(secondaryList.code, 200)
  assert.equal(secondaryList.data.total, 1)
  assert.equal(secondaryList.data.records[0].code, propertyCode)

  const primaryList = await request('/properties?current=1&size=100', {
    headers: primary.headers
  })
  assert.equal(primaryList.code, 200)
  assert.equal(
    primaryList.data.records.some((item) => item.code === propertyCode),
    false
  )

  const forbiddenRead = await request(`/properties/${propertyId}`, {
    headers: primary.headers
  })
  assert.notEqual(forbiddenRead.code, 200)

  const forbiddenReference = await request('/room-types', {
    method: 'POST',
    headers: primary.headers,
    body: JSON.stringify({
      propertyId,
      name: '越权关联房型',
      code: 'CROSS_TENANT_REFERENCE',
      basePrice: 1,
      status: 1
    })
  })
  assert.notEqual(forbiddenReference.code, 200)

  await request(`/properties/${propertyId}`, {
    method: 'PUT',
    headers: primary.headers,
    body: JSON.stringify({ name: '越权修改', code: propertyCode, status: 1 })
  })

  const ownerRead = await request(`/properties/${propertyId}`, {
    headers: secondary.headers
  })
  assert.equal(ownerRead.code, 200)
  assert.equal(ownerRead.data.name, '隔离验证物业')

  console.log(
    `Tenant isolation smoke passed: tenant ${primary.tenantId} cannot read or modify tenant ${secondary.tenantId} data`
  )
} finally {
  cleanup()
}
