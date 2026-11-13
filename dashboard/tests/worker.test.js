import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../worker/index.js'

const statsRequest = (options) => new Request('https://dashboard.example/_aegis/stats', options)

test('unconfigured stats return 503 JSON instead of a successful empty feed', async () => {
  const response = await worker.fetch(statsRequest(), {})
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.match((await response.json()).error, /HONEYPOT/)
})

test('stats only accepts GET and does not call the honeypot for mutations', async () => {
  const response = await worker.fetch(statsRequest({ method: 'POST' }), {
    HONEYPOT: { fetch() { assert.fail('must not contact the honeypot') } },
  })
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('Allow'), 'GET')
})

test('service binding forwards the fixed stats path without browser cookies or query parameters', async () => {
  const payload = { intercepted: [], total: 77 }
  const response = await worker.fetch(new Request('https://dashboard.example/_aegis/stats?path=/admin', {
    headers: { Cookie: 'session=private', Authorization: 'Bearer private' },
  }), {
    HONEYPOT: {
      async fetch(request) {
        assert.equal(request.url, 'https://honeypot.internal/_aegis/stats')
        assert.equal(request.method, 'GET')
        assert.equal(request.headers.get('Cookie'), null)
        assert.equal(request.headers.get('Authorization'), null)
        return Response.json(payload, { headers: { 'Set-Cookie': 'untrusted=value', 'Cache-Control': 'max-age=600' } })
      },
    },
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), payload)
  assert.equal(response.headers.get('Set-Cookie'), null)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
})

test('upstream failures preserve their HTTP status', async () => {
  const response = await worker.fetch(statsRequest(), {
    HONEYPOT: { async fetch() { return Response.json({ error: 'Unavailable' }, { status: 503 }) } },
  })
  assert.equal(response.status, 503)
})

test('service exceptions return a retryable 502', async () => {
  const response = await worker.fetch(statsRequest(), {
    HONEYPOT: { async fetch() { throw new Error('connection failed') } },
  })
  assert.equal(response.status, 502)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
})

test('preserves the existing starter API route', async () => {
  assert.deepEqual(await (await worker.fetch(new Request('https://dashboard.example/api/'), {})).json(), { name: 'Cloudflare' })
})

test('unknown Worker routes return 404', async () => {
  assert.equal((await worker.fetch(new Request('https://dashboard.example/unknown'), {})).status, 404)
})
