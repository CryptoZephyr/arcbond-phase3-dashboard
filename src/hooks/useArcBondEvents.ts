"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook that connects to the local ArcBond WebSocket server.
 * It provides a boolean indicating if the WS is currently connected, and the
 * most recent event payload received from the server.
 *
 * The payload shape mirrors the broadcast from `server.ts`:
 * {
 *   type: string;        // Event name, e.g. "BondCreated"
 *   payload: any;        // Serialized log object (BigInts converted to strings)
 * }
 */
export interface ArcBondEvent {
  type: string;
  payload: Record<string, unknown>;
  receivedAt: number;
}

export function useArcBondEvents(onEvent?: (event: ArcBondEvent) => void) {
  const [wsConnected, setWsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState<ArcBondEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      // Connect using window.location.host so it works on any port
      const wsUrl = `ws://${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }
        setWsConnected(true);
        console.log("[useArcBondEvents] WebSocket connected");
      };

      ws.onclose = () => {
        if (destroyed) return;
        setWsConnected(false);
        console.log("[useArcBondEvents] WebSocket disconnected — retrying in 3s");
        // Auto-reconnect
        retryTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        // onclose will fire after onerror and handle reconnect
        if (destroyed) return;
        setWsConnected(false);
      };

      ws.onmessage = (msg) => {
        if (destroyed) return;
        try {
          const data = JSON.parse(msg.data);
          const event: ArcBondEvent = { ...data, receivedAt: Date.now() };
          setLatestEvent(event);
          onEventRef.current?.(event);
        } catch (err) {
          console.warn("[useArcBondEvents] Failed to parse WS message:", msg.data);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return { wsConnected, latestEvent };
}
