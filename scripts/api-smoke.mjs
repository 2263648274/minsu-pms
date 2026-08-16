import assert from 'node:assert/strict'
import process from 'node:process'

const baseUrl = (process.env.PMS_BASE_URL || 'http://localhost:8090/api').replace(/\/$/, '')
const username = process.env.PMS_TEST_USERNAME || 'admin'
const password = process.env.PMS_TEST_PASSWORD || 'admin123'

const checks = []

async function call(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const body = await response.json().catch(() => null)
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}`)
  assert.ok(body && typeof body === 'object', `${path} did not return JSON`)
  assert.ok(body.code === 200 || body.code === 0, `${path} returned envelope code ${body.code}`)
  checks.push(path)
  return body.data
}

const health = await call('/health')
assert.equal(health.status, 'UP', 'health status must be UP')

const login = await call('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
})
const token = login.token || login.accessToken
assert.ok(token, 'login response did not contain a token')
const auth = { Authorization: `Bearer ${token}` }

const today = new Date()
const end = today.toISOString().slice(0, 10)
const startDate = new Date(today.getTime() - 13 * 86400000).toISOString().slice(0, 10)
const range = `from=${startDate}&to=${end}`

const dashboard = await call('/dashboard/overview', { headers: auth })
assert.equal(typeof dashboard.totalRooms, 'number', 'dashboard totalRooms must be numeric')

const overview = await call(`/reports/overview?${range}`, { headers: auth })
assert.equal(typeof overview.revenue, 'number', 'report revenue must be numeric')
for (const endpoint of ['trend', 'channel-breakdown', 'roomtype-breakdown']) {
  const data = await call(`/reports/${endpoint}?${range}`, { headers: auth })
  assert.ok(Array.isArray(data), `${endpoint} must return an array`)
}

const bookings = await call('/bookings?current=1&size=5', { headers: auth })
assert.ok(Array.isArray(bookings.records), 'bookings must return a page')

const customers = await call('/customers?current=1&size=5', { headers: auth })
assert.ok(Array.isArray(customers.records), 'customers must return a page')
if (customers.records[0]?.id) {
  const detail = await call(`/customers/${customers.records[0].id}`, { headers: auth })
  assert.ok(detail.customer, 'customer detail must contain customer')
  assert.ok(Array.isArray(detail.history), 'customer detail history must be an array')
}

const syncLogs = await call('/sync-logs?current=1&size=5', { headers: auth })
assert.ok(Array.isArray(syncLogs.records), 'sync logs must return a page')

const roomTypes = await call('/room-types?current=1&size=5', { headers: auth })
assert.ok(Array.isArray(roomTypes.records), 'room types must return a page')
if (roomTypes.records[0]?.id) {
  const inventory = await call(
    `/inventory?roomTypeId=${roomTypes.records[0].id}&from=${startDate}&to=${end}`,
    { headers: auth }
  )
  assert.ok(Array.isArray(inventory), 'inventory must return an array')
}

console.log(`API smoke passed: ${checks.length} read-only checks against ${baseUrl}`)
