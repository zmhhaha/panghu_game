import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import express from 'express';
import { router as combo } from './combo-cache.js';
import { router as duel } from './duel-cache.js';
import { apiClient } from '../../../../packages/api-client/src/index.js';

test('judge requests and frontend calls never reuse an earlier model result', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => new Response(JSON.stringify({ generation: ++calls }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
  const app = express();
  app.use(express.json());
  app.use('/combo', combo);
  app.use('/duel', duel);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
  async function post(path: string): Promise<{ generation: number }> {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path, method: 'POST',
        headers: { 'content-type': 'application/json' } }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
      });
      req.on('error', reject);
      req.end(JSON.stringify({ moveA: 'a', moveB: 'b', distance: 1 }));
    });
  }
  try {
    for (const path of ['/combo/judge', '/duel/judge']) {
      const first = await post(path);
      const second = await post(path);
      assert.notEqual(first.generation, second.generation);
    }
    const first = await apiClient.combo.judge({ moveA: 'a', moveB: 'b' });
    const second = await apiClient.combo.judge({ moveA: 'a', moveB: 'b' });
    assert.notDeepEqual(first, second);
    assert.equal(calls, 6);
  } finally {
    globalThis.fetch = original;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
