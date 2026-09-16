import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';

function createMockDb(initialValue = 42) {
  let counter = initialValue;
  return {
    prepare(query) {
      return {
        async first() {
          if (query.includes('SELECT value FROM counters')) {
            return { value: counter };
          }
          if (query.includes('UPDATE counters')) {
            counter += 1;
            return { value: counter };
          }
          return null;
        }
      };
    }
  };
}

test('Worker handles CORS preflight OPTIONS correctly', async () => {
  const req = new Request('http://localhost/stats', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://tranhuuquyet.github.io'
    }
  });
  const res = await worker.fetch(req, { DB: createMockDb() });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://tranhuuquyet.github.io');
  assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('POST'));
});

test('Worker GET /stats returns current total opens', async () => {
  const req = new Request('http://localhost/stats', {
    method: 'GET',
    headers: {
      'Origin': 'https://tranhuuquyet.github.io'
    }
  });
  const res = await worker.fetch(req, { DB: createMockDb(100) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.totalOpens, 100);
});

test('Worker POST /open-case atomically increments and returns new total', async () => {
  const db = createMockDb(100);
  const req = new Request('http://localhost/open-case', {
    method: 'POST',
    headers: {
      'Origin': 'https://tranhuuquyet.github.io',
      'CF-Connecting-IP': '192.0.2.1'
    }
  });

  const res1 = await worker.fetch(req, { DB: db });
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.totalOpens, 101);

  const res2 = await worker.fetch(req, { DB: db });
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.totalOpens, 102);
});

test('Worker GET /invalid-route returns 404', async () => {
  const req = new Request('http://localhost/invalid-route', {
    method: 'GET',
    headers: {
      'Origin': 'https://tranhuuquyet.github.io'
    }
  });
  const res = await worker.fetch(req, { DB: createMockDb() });
  assert.equal(res.status, 404);
});

