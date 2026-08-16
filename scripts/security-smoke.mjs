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
const staffUsername = 'security_smoke_staff'
const channelCode = 'SECURITY_SMOKE'
const requestId = `security-smoke-${Date.now()}`

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
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const body = await response.json()
  return { response, body }
}

async function login(username, password) {
  const { response, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
  assert.equal(response.status, 200)
  assert.equal(body.code, 200, JSON.stringify(body))
  return { Authorization: `Bearer ${body.data.token}` }
}

function cleanup() {
  sql(`
    DELETE FROM audit_log WHERE username = '${staffUsername}' OR request_id = '${requestId}';
    DELETE FROM channel WHERE code = '${channelCode}';
    DELETE FROM user WHERE username = '${staffUsername}';
  `)
}

try {
  cleanup()
  sql(`
    INSERT INTO user (
      tenant_id, username, password, real_name, role, status, created_at, updated_at, deleted
    )
    SELECT tenant_id, '${staffUsername}', password, 'Security Smoke Staff',
           'STAFF', 1, NOW(), NOW(), 0
    FROM user WHERE username = 'admin' AND deleted = 0 LIMIT 1;
  `)

  const adminHeaders = await login('admin', 'admin123')
  const staffHeaders = await login(staffUsername, 'admin123')

  const staffDenied = await request('/channels', {
    method: 'POST',
    headers: staffHeaders,
    body: JSON.stringify({ code: channelCode, name: 'Should Not Exist', appSecret: 'bad' })
  })
  assert.equal(staffDenied.response.status, 403)
  assert.equal(staffDenied.body.code, 403)
  assert.equal(sql(`SELECT COUNT(*) FROM channel WHERE code = '${channelCode}'`), '0')

  const created = await request('/channels', {
    method: 'POST',
    headers: { ...adminHeaders, 'X-Request-ID': requestId },
    body: JSON.stringify({
      code: channelCode,
      name: 'Security Smoke Channel',
      appKey: 'smoke-key',
      appSecret: 'plain-secret-must-never-be-returned',
      enabled: 0
    })
  })
  assert.equal(created.response.status, 200)
  assert.equal(created.body.code, 200, JSON.stringify(created.body))
  assert.equal(created.body.data.appSecret, '********')

  const storedSecret = sql(`SELECT app_secret FROM channel WHERE code = '${channelCode}'`)
  assert.ok(storedSecret.startsWith('enc:v1:'))
  assert.equal(storedSecret.includes('plain-secret'), false)

  const listed = await request('/channels', { headers: staffHeaders })
  assert.equal(listed.body.code, 200)
  const channel = listed.body.data.find((item) => item.code === channelCode)
  assert.equal(channel.appSecret, '********')

  const staffAuditDenied = await request('/audit-logs', { headers: staffHeaders })
  assert.equal(staffAuditDenied.response.status, 403)
  assert.equal(staffAuditDenied.body.code, 403)

  const adminAudit = await request('/audit-logs?action=POST&size=100', { headers: adminHeaders })
  assert.equal(adminAudit.response.status, 200)
  assert.equal(adminAudit.body.code, 200)
  assert.ok(adminAudit.body.data.records.some((item) => item.requestId === requestId))

  const auditCount = Number(sql(`
    SELECT COUNT(*) FROM audit_log
    WHERE request_id = '${requestId}'
      AND action = 'POST'
      AND resource = '/api/channels'
      AND success = 1
  `))
  assert.equal(auditCount, 1)

  console.log('Security smoke passed: STAFF configuration and audit access denied; OTA secret encrypted and masked; admin mutation audited')
} finally {
  cleanup()
}
