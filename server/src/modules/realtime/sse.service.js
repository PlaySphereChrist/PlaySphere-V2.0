'use strict';

/**
 * Server-Sent Events (SSE) Broadcaster for PlaySphere
 * 
 * Manages live client connections for tournament brackets and match score updates.
 * Sends periodic keepalive pings to prevent proxy/browser timeouts.
 */
class SseService {
  constructor() {
    // Map of channelName -> Set of response objects
    this.channels = new Map();

    // Start 25-second heartbeat ping across all active clients
    this.heartbeatInterval = setInterval(() => {
      this._sendHeartbeat();
    }, 25000);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Register a new client response to an SSE channel
   * @param {string} channel e.g. "tournaments:uuid" or "matches:uuid"
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  subscribe(channel, req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if reverse-proxied
    res.flushHeaders?.();

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    const clientSet = this.channels.get(channel);
    clientSet.add(res);

    // Initial connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ channel, timestamp: new Date().toISOString() })}\n\n`);

    const cleanup = () => {
      if (this.channels.has(channel)) {
        const set = this.channels.get(channel);
        set.delete(res);
        if (set.size === 0) {
          this.channels.delete(channel);
        }
      }
    };

    req.on('close', cleanup);
    req.on('end', cleanup);
    res.on('finish', cleanup);
  }

  /**
   * Broadcast an event to all subscribers of a channel
   * @param {string} channel
   * @param {string} eventType e.g. "match_score_updated", "fixture_updated"
   * @param {object} payload
   */
  broadcast(channel, eventType, payload = {}) {
    const clients = this.channels.get(channel);
    if (!clients || clients.size === 0) return;

    const data = JSON.stringify({
      ...payload,
      _timestamp: new Date().toISOString()
    });
    const message = `event: ${eventType}\ndata: ${data}\n\n`;

    for (const res of clients) {
      try {
        res.write(message);
      } catch (_err) {
        // Socket closed prematurely
        clients.delete(res);
      }
    }
  }

  /**
   * Broadcast to tournament channel and optionally match channel
   * @param {string} tournamentId
   * @param {string} eventType
   * @param {object} payload
   */
  broadcastTournament(tournamentId, eventType, payload = {}) {
    if (tournamentId) {
      this.broadcast(`tournaments:${tournamentId}`, eventType, payload);
    }
  }

  /**
   * Broadcast to a specific match channel
   * @param {string} matchId
   * @param {string} eventType
   * @param {object} payload
   */
  broadcastMatch(matchId, eventType, payload = {}) {
    if (matchId) {
      this.broadcast(`matches:${matchId}`, eventType, payload);
    }
  }

  /**
   * Send heartbeat to keep connections alive
   */
  _sendHeartbeat() {
    for (const [channel, clients] of this.channels.entries()) {
      for (const res of clients) {
        try {
          res.write(': keepalive\n\n');
        } catch {
          clients.delete(res);
        }
      }
      if (clients.size === 0) {
        this.channels.delete(channel);
      }
    }
  }

  getClientCount(channel) {
    return this.channels.get(channel)?.size || 0;
  }
}

module.exports = new SseService();
