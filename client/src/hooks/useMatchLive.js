/* global EventSource */
import { useState, useEffect, useRef } from 'react';

/**
 * Custom React hook for live single-match updates via SSE.
 *
 * @param {string} matchId
 * @param {function} [onEvent] Optional callback invoked on every incoming broadcast event
 * @returns {{ isConnected: boolean, lastEvent: object|null }}
 */
export function useMatchLive(matchId, onEvent) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!matchId) {
      setIsConnected(false);
      return;
    }

    const sseUrl = `/api/matches/${matchId}/live`;
    let eventSource = null;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };

      const handleEvent = (type) => (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventPayload = { type, data, timestamp: Date.now() };
          setLastEvent(eventPayload);
          if (onEventRef.current) {
            onEventRef.current(eventPayload);
          }
        } catch {
          // Heartbeat or malformed event
        }
      };

      eventSource.addEventListener('connected', handleEvent('connected'));
      eventSource.addEventListener('match_started', handleEvent('match_started'));
      eventSource.addEventListener('match_completed', handleEvent('match_completed'));
      eventSource.addEventListener('match_cancelled', handleEvent('match_cancelled'));
      eventSource.addEventListener('performance_event_added', handleEvent('performance_event_added'));
    } catch {
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      setIsConnected(false);
    };
  }, [matchId]);

  return { isConnected, lastEvent };
}
