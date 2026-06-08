// server.ts — Custom Next.js server with WebSocket support
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import WebSocket from "ws";
const { WebSocketServer } = require("ws");
import { createPublicClient, webSocket } from "viem";
import { arcTestnet } from "./src/lib/arc-chain";
import { ARCBOND_ABI } from "./src/lib/arcbond-abi";
import { ARCBOND_ADDRESS } from "./src/lib/constants";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ArcBond event names to watch
const WATCHED_EVENTS = [
  "BondCreated", "BondApproved", "BondSlashed", "BondReleased",
  "JobCreated", "JobFunded", "JobApproved", "DeliverableSubmitted",
  "JobCompleted", "JobRejected", "JobExpired", "JobArbitrated",
  "ReputationSynced", "FeesCollected", "AgentIdBound",
  "Deposited", "Withdrawn"
] as const;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  const broadcast = (message: object) => {
    const payload = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  // Subscribe to Arc L1 events via WebSocket RPC
  const wsClient = createPublicClient({
    chain: arcTestnet,
    transport: webSocket("wss://rpc.testnet.arc.network"),
  });

  WATCHED_EVENTS.forEach((eventName) => {
    wsClient.watchContractEvent({
      address: ARCBOND_ADDRESS,
      abi: ARCBOND_ABI,
      eventName: eventName as any,
      onLogs: (logs) => {
        logs.forEach((log) => {
          // Broadcast serialized logs to client. Convert BigInt values to string representation
          const serialize = (obj: any): any => {
            if (typeof obj === "bigint") return obj.toString();
            if (Array.isArray(obj)) return obj.map(serialize);
            if (obj && typeof obj === "object") {
              const res: any = {};
              for (const k in obj) {
                res[k] = serialize(obj[k]);
              }
              return res;
            }
            return obj;
          };
          broadcast({ type: eventName, payload: serialize(log) });
          console.log(`[ArcBond Event] ${eventName}`, log);
        });
      },
    });
  });

  server.listen(PORT, () => {
    console.log(`> ArcBond server ready on http://localhost:${PORT}`);
    console.log(`> WebSocket server ready on ws://localhost:${PORT}/ws`);
  });
});




