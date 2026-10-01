'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const sseService = require('../../src/modules/realtime/sse.service');

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.headers = {};
    this.chunks = [];
  }
  setHeader(name, val) {
    this.headers[name] = val;
  }
  write(chunk) {
    this.chunks.push(chunk);
    return true;
  }
}

class MockRequest extends EventEmitter {}

test('sseService sets correct headers and sends initial connected event', () => {
  const req = new MockRequest();
  const res = new MockResponse();

  sseService.subscribe('tournaments:t1', req, res);

  assert.equal(res.headers['Content-Type'], 'text/event-stream');
  assert.equal(res.headers['Cache-Control'], 'no-cache, no-transform');
  assert.equal(res.headers['Connection'], 'keep-alive');

  assert.equal(res.chunks.length, 1);
  assert.match(res.chunks[0], /event: connected/);
  assert.match(res.chunks[0], /"channel":"tournaments:t1"/);
  assert.equal(sseService.getClientCount('tournaments:t1'), 1);

  // Trigger client close
  req.emit('close');
  assert.equal(sseService.getClientCount('tournaments:t1'), 0);
});

test('sseService broadcasts events to connected clients in channel', () => {
  const req1 = new MockRequest();
  const res1 = new MockResponse();
  const req2 = new MockRequest();
  const res2 = new MockResponse();

  sseService.subscribe('tournaments:t2', req1, res1);
  sseService.subscribe('tournaments:t2', req2, res2);

  sseService.broadcastTournament('t2', 'match_completed', { matchId: 'm1', winner: 'Team A' });

  assert.equal(res1.chunks.length, 2);
  assert.match(res1.chunks[1], /event: match_completed/);
  assert.match(res1.chunks[1], /"matchId":"m1"/);
  assert.match(res1.chunks[1], /"winner":"Team A"/);

  assert.equal(res2.chunks.length, 2);
  assert.match(res2.chunks[1], /event: match_completed/);

  req1.emit('close');
  req2.emit('close');
  assert.equal(sseService.getClientCount('tournaments:t2'), 0);
});
