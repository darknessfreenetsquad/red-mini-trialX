'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const parse5 = require('parse5');

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const app = require('../index');
const server = app.listen(0);
after(() => server.close());
const request = (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);

test('both HTML documents parse without errors and their inline scripts compile', () => {
  for (const file of ['main.html', 'status.html']) {
    const html = fs.readFileSync(file, 'utf8');
    const errors = [];
    parse5.parse(html, { onParseError: error => errors.push(`${error.code} at ${error.startLine}:${error.startCol}`) });
    assert.deepEqual(errors, [], file);
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
      if (match[1].trim()) assert.doesNotThrow(() => new vm.Script(match[1], { filename: file }));
    }
    if (file === 'status.html') assert.doesNotMatch(html, /dashboardToken|createDashboardToken|\/code\/token/);
  }
});

test('frontend pages, redirect and status API are served', async () => {
  const redirect = await request('/', { redirect: 'manual' });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), '/status');
  for (const path of ['/status', '/pair']) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /<!DOCTYPE html>/i);
  }
  const response = await request('/api/status');
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, 'online');
  assert.equal(data.database, 'not_configured');
  assert.equal(data.activeSessions, 0);
  assert.deepEqual(data.sessions, []);
  assert.ok(data.uptime >= 0);
});

test('pairing validates input and fails safely when database is not configured', async () => {
  const send = number => request('/code', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number })
  });
  assert.equal((await send('123')).status, 400);
  assert.equal((await send({ bad: 'type' })).status, 400);
  const unavailable = await send('+27 63 498 8678');
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).error, /not configured/i);
  assert.equal((await request('/code?number=27634988678')).status, 404);
});

test('pairing and reconnect are public but still validate input and configuration', async () => {
  const response = await request('/code/connect-all', { method: 'POST' });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /supabase/i);
  const pairResponse = await request('/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: '27634988678' }) });
  assert.equal(pairResponse.status, 503);
  assert.equal((await request('/code/token', { method: 'POST' })).status, 404);
});
