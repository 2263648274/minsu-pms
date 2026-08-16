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
const loginPassword = process.env.PMS_TEST_PASSWORD || 'admin123'
const testUsername = 'booking_concurrency_test'
const tenantCode = 'BOOKING_CONCURRENCY_TEST'
const propertyCode = 'BOOKING_CONCURRENCY_PROPERTY'
const roomTypeCode = 'BOOKING_CONCURRENCY_ROOM'

const checkInDate = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10)
const checkOutDate = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10)

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

function cleanup() {
  sql(`
    DELETE FROM audit_log WHERE tenant_id IN (SELECT id FROM tenant WHERE code = '${tenantCode}');
    DELETE b FROM booking b
      JOIN tenant t ON t.id = b.tenant_id
      WHERE t.code = '${tenantCode}';
    DELETE i FROM inventory i
      JOIN tenant t ON t.id = i.tenant_id
      WHERE t.code = '${tenantCode}';
    DELETE c FROM customer c
      JOIN tenant t ON t.id = c.tenant_id
      WHERE t.code = '${tenantCode}';
    DELETE rt FROM room_type rt
      JOIN tenant t ON t.id = rt.tenant_id
      WHERE t.code = '${tenantCode}';
    DELETE p FROM property p
      JOIN tenant t ON t.id = p.tenant_id
      WHERE t.code = '${tenantCode}';
    DELETE FROM user WHERE username = '${testUsername}';
    DELETE FROM tenant WHERE code = '${tenantCode}';
  `)
}

try {
  cleanup()
  sql(`
    INSERT INTO tenant (code, name, status)
      VALUES ('${tenantCode}', '订单并发测试租户', 1);
    SET @tid = LAST_INSERT_ID();

    INSERT INTO user (
      tenant_id, username, password, real_name, role, status, created_at, updated_at, deleted
    )
    SELECT @tid, '${testUsername}', password, '订单并发测试用户',
           'ADMIN', 1, NOW(), NOW(), 0
      FROM user
      WHERE username = 'admin' AND deleted = 0
      LIMIT 1;

    INSERT INTO property (tenant_id, name, code, status)
      VALUES (@tid, '订单并发测试物业', '${propertyCode}', 1);
    SET @pid = LAST_INSERT_ID();

    INSERT INTO room_type (
      tenant_id, property_id, name, code, base_price, max_occupancy, status
    ) VALUES (
      @tid, @pid, '并发单间', '${roomTypeCode}', 100.00, 2, 1
    );
    SET @rtid = LAST_INSERT_ID();

    INSERT INTO customer (tenant_id, name, phone)
      VALUES (@tid, '并发测试客人', '13900000000');
    SET @cid = LAST_INSERT_ID();

    INSERT INTO inventory (
      tenant_id, room_type_id, stay_date, total_rooms, sold_rooms, blocked_rooms, status
    ) VALUES (
      @tid, @rtid, '${checkInDate}', 1, 0, 0, 'OPEN'
    );
  `)

  const ids = sql(`
    SELECT CONCAT(t.id, ',', p.id, ',', rt.id, ',', c.id)
    FROM tenant t
    JOIN property p ON p.tenant_id = t.id AND p.code = '${propertyCode}'
    JOIN room_type rt ON rt.tenant_id = t.id AND rt.code = '${roomTypeCode}'
    JOIN customer c ON c.tenant_id = t.id AND c.phone = '13900000000'
    WHERE t.code = '${tenantCode}';
  `).split(',').map(Number)
  const [tenantId, propertyId, roomTypeId, customerId] = ids
  assert.ok(ids.every(Number.isFinite), `failed to create fixtures: ${ids}`)

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: testUsername, password: loginPassword })
  })
  assert.equal(login.code, 200, JSON.stringify(login))
  assert.equal(login.data.tenantId, tenantId)
  const auth = { Authorization: `Bearer ${login.data.token}` }

  const payload = {
    propertyId,
    roomTypeId,
    customerId,
    guestName: '并发测试客人',
    guestPhone: '13900000000',
    checkInDate,
    checkOutDate,
    rooms: 1,
    guests: 1,
    totalAmount: 100,
    source: 'DIRECT'
  }

  const sharedKey = 'booking-concurrency-same-request'
  const sameKeyResults = await Promise.all(
    Array.from({ length: 10 }, () =>
      request('/bookings', {
        method: 'POST',
        headers: { ...auth, 'Idempotency-Key': sharedKey },
        body: JSON.stringify(payload)
      })
    )
  )
  assert.ok(sameKeyResults.every((item) => item.code === 200), JSON.stringify(sameKeyResults))
  const sameIds = new Set(sameKeyResults.map((item) => item.data.id))
  assert.equal(sameIds.size, 1, 'same idempotency key created multiple bookings')
  const firstBookingId = sameKeyResults[0].data.id
  const mismatchedRetry = await request('/bookings', {
    method: 'POST',
    headers: { ...auth, 'Idempotency-Key': sharedKey },
    body: JSON.stringify({ ...payload, totalAmount: 101 })
  })
  assert.notEqual(mismatchedRetry.code, 200)
  assert.equal(Number(sql(`
    SELECT sold_rooms FROM inventory
    WHERE tenant_id = ${tenantId}
      AND room_type_id = ${roomTypeId}
      AND stay_date = '${checkInDate}'
  `)), 1)

  const cancellations = await Promise.all(
    Array.from({ length: 5 }, () =>
      request(`/bookings/${firstBookingId}/cancel`, {
        method: 'POST',
        headers: auth
      })
    )
  )
  assert.ok(cancellations.every((item) => item.code === 200), JSON.stringify(cancellations))
  assert.equal(Number(sql(`
    SELECT sold_rooms FROM inventory
    WHERE tenant_id = ${tenantId}
      AND room_type_id = ${roomTypeId}
      AND stay_date = '${checkInDate}'
  `)), 0)

  const competingResults = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      request('/bookings', {
        method: 'POST',
        headers: { ...auth, 'Idempotency-Key': `booking-competing-${index}-request` },
        body: JSON.stringify(payload)
      })
    )
  )
  const successes = competingResults.filter((item) => item.code === 200)
  const rejected = competingResults.filter((item) => item.code !== 200)
  assert.equal(successes.length, 1, JSON.stringify(competingResults))
  assert.equal(rejected.length, 7, JSON.stringify(competingResults))
  assert.equal(Number(sql(`
    SELECT sold_rooms FROM inventory
    WHERE tenant_id = ${tenantId}
      AND room_type_id = ${roomTypeId}
      AND stay_date = '${checkInDate}'
  `)), 1)

  console.log(
    'Booking concurrency smoke passed: 10 idempotent retries created 1 booking; '
      + '5 concurrent cancellations released once; 8 competing requests sold 1 room'
  )
} finally {
  cleanup()
}
