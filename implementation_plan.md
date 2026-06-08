# ArcBond — Full Implementation Plan

---

# ═══════════════════════════════════════════════
# 🤖 RULES FOR HERMES — READ BEFORE ANYTHING ELSE
# ═══════════════════════════════════════════════

> [!CAUTION]
> These rules are absolute. They override any default behavior. Do not begin any work until every rule below is understood and acknowledged.

## RULE 1 — MANDATORY PRE-READ (DO THIS FIRST, BEFORE ANY CODE)

Before writing or modifying a single line of code, you MUST read the following two files in full and confirm you have understood them:

1. **Smart Contract** → `C:\Users\HomePC\arcbond\contracts\ArcBond.sol`
2. **This Plan** → Read every section of this document from top to bottom

After reading both, state out loud what ArcBond's sole purpose is, and confirm which phase you are starting on. Do not proceed until this is done.

---

## RULE 2 — WORKSPACE LOCKDOWN

You are working on **ONE project and ONE project only**:

```
C:\Users\HomePC\arcbond-phase3-dashboard\
```

**You MUST NOT:**
- Read, reference, copy, or take any values from any other directory on this machine
- Touch `C:\Users\HomePC\arcbond\` (the Hardhat contract repo) — read it for reference only, never modify it
- Touch `C:\Users\HomePC\arcbond-phase1-test\` — off limits entirely
- Touch `C:\Users\HomePC\arc\`, `C:\Users\HomePC\arc-wallet-project\`, `C:\Users\HomePC\dcw-wallet\`, or any other project folder on this desktop
- Use any wallet address, API key, contract address, or configuration value from any project other than `arcbond-phase3-dashboard`
- Hardcode any values from other projects. All constants must come from `arcbond-phase3-dashboard/src/lib/constants.ts` or the `.env.local` file already in `arcbond-phase3-dashboard`

---

## RULE 3 — STAY STRICTLY WITHIN THE PLAN

- You execute **only what this plan describes**, in the order it describes it
- You do NOT add features, refactor things, rename things, or make "improvements" that are not listed here
- If you think something should be done differently, **stop, explain your concern, and wait for approval** before doing anything
- Do not skip phases or jump ahead — complete each phase fully before moving to the next
- Do not modify the smart contract (`ArcBond.sol`) under any circumstances — it is already deployed and verified on-chain

---

## RULE 4 — STOP AT EVERY 🛑 MANUAL STEP

Throughout this plan you will see markers like this:

> 🛑 **MANUAL STEP — STOP HERE**

When you encounter one:
1. **Stop all code changes immediately**
2. Tell the user exactly what they need to do manually, step by step
3. Wait for the user to confirm the manual step is complete
4. Only then continue to the next item

Manual steps exist because they involve things you cannot do: generating API keys, signing blockchain transactions, provisioning cloud services, setting secret environment variables, or interacting with external wallets.

---

## RULE 5 — ENVIRONMENT VARIABLES

- **Never** hardcode secrets, API keys, wallet IDs, or private values directly into source files
- All secrets go in `arcbond-phase3-dashboard/.env.local`
- If you need a new env var to exist, **stop and tell the user** what variable name is needed, what it should contain, and where to get the value — then wait for confirmation before using it in code
- Do not read `.env.local` and extract values to use elsewhere — reference them only as `process.env.VARIABLE_NAME`

---

## RULE 6 — NO UNILATERAL PACKAGE INSTALLS

- If a new npm package is needed, list it and explain why before installing
- Wait for user acknowledgment before running `npm install` or modifying `package.json`

---

## RULE 7 — ONE PHASE AT A TIME

- Complete every task in a phase before declaring it done
- At the end of each phase, summarize exactly what was changed and ask the user to verify before moving to the next phase
- If any task in a phase is blocked (e.g., waiting for a manual step), say so clearly and list what is blocked

---

# ═══════════════════════════════════════════════
# CONTEXT: WHAT ARCBOND IS (FROM THE CONTRACT)
# ═══════════════════════════════════════════════

ArcBond is a **three-layer trustless coordination and settlement protocol for AI agents on Arc L1**.

**Layer 1 — Agent Identity**: Every actor must hold an ERC-8004 NFT from the IdentityRegistry (`0x8004A818BFB912233c491871b3d84c89A494BD9e`) and call `bindAgentId()` on the ArcBond contract before participating.

**Layer 2 — Agent Bonding**: Two agents post mutual collateral into a `Bond` (split by basis points). The bond state machine is: `Pending → Active → Released/Slashed`. Bonds enforce skin-in-the-game. An `ARBITRATOR_ROLE` can slash a bond and impact reputation. A `createBond` requires 1% protocol fee.

**Layer 3 — Job Escrow (ERC-8183)**: A `client` posts a job (optionally linked to an active bond). A `provider` submits a deliverable hash. An `evaluator` settles (complete or reject). Either party can `raiseDispute` which moves the job to `Arbitration` where an arbitrator decides. Settlement takes 2% fee, arbitration takes 1%. Every state transition auto-syncs reputation back to the ERC-8004 IdentityRegistry.

**Arc's USDC**: On Arc L1, USDC is the **native gas token** — it is sent as `msg.value`, not via ERC-20 `approve/transfer`. The ArcBond `deposit()` function is `payable` and uses `msg.value`. Withdrawals use `.call{value: amount}`.

**Deployed Contract Address**: `0xf5E644C25185949F90fF983c3f4f3d2E773eD9E2` (Arc Testnet)

---

# ═══════════════════════════════════════════════
# PHASE 1 — CRITICAL BUG FIXES
# ═══════════════════════════════════════════════

> [!IMPORTANT]
> Nothing in the app works correctly until these are fixed. Execute every item in this phase before touching anything else.

### Task 1.1 — Fix Missing ABIs in `arcbond-abi.ts`

**File**: `src/lib/arcbond-abi.ts`

Add the following missing function ABI entries to `ARCBOND_ABI`. Do not remove any existing entries:

```ts
// createBond
{
  type: "function",
  name: "createBond",
  inputs: [
    { name: "counterparty", type: "address" },
    { name: "collateral", type: "uint256" },
    { name: "initiatorSplitBPS", type: "uint16" }
  ],
  outputs: [{ name: "bondId", type: "uint256" }],
  stateMutability: "nonpayable"
},
// approveBond
{
  type: "function",
  name: "approveBond",
  inputs: [{ name: "bondId", type: "uint256" }],
  outputs: [],
  stateMutability: "nonpayable"
},
// releaseBond
{
  type: "function",
  name: "releaseBond",
  inputs: [{ name: "bondId", type: "uint256" }],
  outputs: [],
  stateMutability: "nonpayable"
},
// slashBond
{
  type: "function",
  name: "slashBond",
  inputs: [
    { name: "bondId", type: "uint256" },
    { name: "slashInitiator", type: "bool" }
  ],
  outputs: [],
  stateMutability: "nonpayable"
},
// raiseDispute
{
  type: "function",
  name: "raiseDispute",
  inputs: [{ name: "jobId", type: "uint256" }],
  outputs: [],
  stateMutability: "nonpayable"
},
// arbitrateJob
{
  type: "function",
  name: "arbitrateJob",
  inputs: [
    { name: "jobId", type: "uint256" },
    { name: "providerWins", type: "bool" }
  ],
  outputs: [],
  stateMutability: "nonpayable"
},
// expireJob
{
  type: "function",
  name: "expireJob",
  inputs: [{ name: "jobId", type: "uint256" }],
  outputs: [],
  stateMutability: "nonpayable"
},
// collectFees
{
  type: "function",
  name: "collectFees",
  inputs: [{ name: "recipient", type: "address" }],
  outputs: [],
  stateMutability: "nonpayable"
},
// hasRole
{
  type: "function",
  name: "hasRole",
  inputs: [
    { name: "role", type: "bytes32" },
    { name: "account", type: "address" }
  ],
  outputs: [{ type: "bool" }],
  stateMutability: "view"
},
// pause
{
  type: "function",
  name: "pause",
  inputs: [],
  outputs: [],
  stateMutability: "nonpayable"
},
// unpause
{
  type: "function",
  name: "unpause",
  inputs: [],
  outputs: [],
  stateMutability: "nonpayable"
}
```

Also add all 14 contract event ABIs for future WebSocket subscription (Phase 2):
```ts
{ type: "event", name: "AgentIdBound", inputs: [{ name: "agent", type: "address", indexed: true }, { name: "agentId", type: "uint256", indexed: true }] },
{ type: "event", name: "Deposited", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
{ type: "event", name: "Withdrawn", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
{ type: "event", name: "BondCreated", inputs: [{ name: "bondId", type: "uint256", indexed: true }, { name: "initiatorAgentId", type: "uint256", indexed: true }, { name: "counterpartyAgentId", type: "uint256", indexed: true }, { name: "collateral", type: "uint256" }, { name: "initiatorSplit", type: "uint16" }, { name: "counterpartySplit", type: "uint16" }] },
{ type: "event", name: "BondApproved", inputs: [{ name: "bondId", type: "uint256", indexed: true }] },
{ type: "event", name: "BondSlashed", inputs: [{ name: "bondId", type: "uint256", indexed: true }, { name: "slashedAgent", type: "address" }, { name: "amount", type: "uint256" }] },
{ type: "event", name: "BondReleased", inputs: [{ name: "bondId", type: "uint256", indexed: true }] },
{ type: "event", name: "JobCreated", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "client", type: "address", indexed: true }, { name: "provider", type: "address", indexed: true }, { name: "evaluator", type: "address" }, { name: "expiredAt", type: "uint256" }, { name: "hook", type: "address" }] },
{ type: "event", name: "JobFunded", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "budget", type: "uint256" }] },
{ type: "event", name: "JobApproved", inputs: [{ name: "jobId", type: "uint256", indexed: true }] },
{ type: "event", name: "DeliverableSubmitted", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "deliverableHash", type: "bytes32" }] },
{ type: "event", name: "JobCompleted", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "reasonHash", type: "bytes32" }, { name: "payout", type: "uint256" }] },
{ type: "event", name: "JobRejected", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "reasonHash", type: "bytes32" }] },
{ type: "event", name: "JobExpired", inputs: [{ name: "jobId", type: "uint256", indexed: true }] },
{ type: "event", name: "JobArbitrated", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "arbitrator", type: "address" }, { name: "providerWins", type: "bool" }] },
{ type: "event", name: "ReputationSynced", inputs: [{ name: "agentId", type: "uint256", indexed: true }, { name: "delta", type: "int256" }, { name: "reason", type: "string" }] },
{ type: "event", name: "FeesCollected", inputs: [{ name: "admin", type: "address", indexed: true }, { name: "amount", type: "uint256" }] }
```

---

### Task 1.2 — Fix Decimal Inconsistency

**Problem**: `CreateJobModal.tsx` uses `parseEther(budget)` (18 decimals) while `wallet-operations.ts` uses `parseUnits(amount, 6)`. This means jobs are posted with budgets in 18-decimal format but deposits use 6 decimals — the ArcBond `approveJob` balance check will always fail.

**Decision**: Arc's native USDC on-chain behaves as 18-decimal wei (like ETH). Standardize everything to **18 decimals** across all files. The `wallet-operations.ts` deposit must also use `parseUnits(amount, 18)`.

**Files to change**:
- `src/components/CreateJobModal.tsx` — `parseEther(budget)` is correct, leave it. Remove the 6-decimal logic.
- `src/lib/wallet-operations.ts` — Change `parseUnits(amountUsdc, 6)` to `parseUnits(amountUsdc, 18)` on both deposit and withdraw functions.
- `src/hooks/useRealtimeBalance.ts` — `ARC_USDC_DECIMALS = 18` is already correct. Leave it.
- `src/lib/constants.ts` — Add `export const ARC_USDC_DECIMALS = 18` as the canonical source of truth. Use this constant in all other files instead of hardcoded `18` or `6`.

---

### Task 1.3 — Fix the Deposit Flow to Target ArcBond Contract

**Problem**: The current `depositToLedger` in `wallet-operations.ts` calls `approve` + `deposit` on a Circle Gateway contract. This does NOT update `balances[user]` inside the ArcBond contract. The ArcBond contract's `deposit()` is `payable` — it receives Arc native USDC as `msg.value`.

**What to build**: The deposit button in the frontend should call `ArcBond.deposit()` via MetaMask with `msg.value` set to the amount. This is a direct on-chain call from the user's wallet.

**File**: `src/app/api/deposit/route.ts`

Change the route so it no longer calls `depositToLedger` from `wallet-operations.ts`. Instead, the deposit must happen **client-side via MetaMask** (the user signs the transaction with their own wallet). The API route should only handle the database record after the on-chain tx is confirmed.

**File**: `src/app/page.tsx` — `handleDeposit` function

Replace the server-side deposit call with a client-side MetaMask call:
```ts
// Client calls ArcBond.deposit() with msg.value — payable function
const txHash = await walletClient.writeContract({
  address: ARCBOND_ADDRESS,
  abi: ARCBOND_ABI,
  functionName: "deposit",
  value: parseUnits(operationAmount, ARC_USDC_DECIMALS),
  account: userAddress as `0x${string}`,
});
// Wait for receipt, then POST to /api/deposit to log the DB record
```

> 🛑 **MANUAL STEP — STOP HERE**
>
> The user must confirm:
> 1. Their MetaMask wallet has Arc Testnet configured and has native USDC balance to test with
> 2. They are okay with deposit transactions being signed directly from MetaMask (not the Circle MPC wallet)
>
> Do not proceed until the user confirms.

---

### Task 1.4 — Fix `globals.css` Dark Panel

**File**: `src/app/globals.css`

Change `.surface-panel-dark` so it is actually dark (currently identical to `.surface-panel`):

```css
.surface-panel-dark {
    @apply border border-slate-700 bg-slate-900 p-5 shadow-sm sm:p-6;
    border-radius: 8px;
}
```

---

### Task 1.5 — Fix `BondTimeline` Always-Empty Bug

**File**: `src/app/page.tsx`

The `<BondTimeline>` is passed `bondId={null}` which forces it to always render "No bond data available". 

- Add a `selectedBondId` state variable (same pattern as `selectedJobId`)
- Pass `selectedBondId` to `useArcBondData` as the first argument (currently `undefined`)
- Pass `selectedBondId` to `<BondTimeline bondId={selectedBondId}>`
- The user's most recent bond (from their agent data) should be the default selected bond

---

### Task 1.6 — Fix `JobsMarketplace` Corrupt DB Write on Status Update

**File**: `src/components/JobsMarketplace.tsx`

On status update (FUND, SUBMIT, COMPLETE, REJECT), the DB sync currently writes:
```ts
clientAddress: userAddress,   // WRONG — always the caller
providerAddress: userAddress, // WRONG — always the caller
evaluatorAddress: userAddress,// WRONG — always the caller
description: "",              // WRONG — empty
budget: "0",                  // WRONG — zero
```

Fix: Pass the actual `job` object data for all fields. The upsert should receive the real `clientAddress`, `providerAddress`, `evaluatorAddress`, `description`, and `budget` from the existing `job` object, not from `userAddress`:
```ts
body: JSON.stringify({
  id: jobId,
  clientAddress: job.clientAddress,
  providerAddress: job.providerAddress,
  evaluatorAddress: job.evaluatorAddress,
  description: job.description,
  budget: job.budget,
  status: nextStatus,
  expiredAt: job.expiredAt,
  txHash,
}),
```

---

### Task 1.7 — Fix `networkStatus` Hardcoded to `"synced"`

**File**: `src/app/page.tsx`

Replace hardcoded `networkStatus="synced"` with a dynamic value:
- Add a `networkStatus` state: `useState<"synced" | "syncing" | "error">("syncing")`
- After wallet connects, check the chain ID: if it matches `ARC_CHAIN_ID (5042002)` → `"synced"`, else → `"error"`
- If the RPC call in `useArcBondData` errors → set `"error"`
- Listen to MetaMask `chainChanged` event to update dynamically

---

### ✅ Phase 1 Completion Check

Before declaring Phase 1 done, verify every item:
- [ ] All 11 missing functions added to `arcbond-abi.ts`
- [ ] All 17 events added to `arcbond-abi.ts`
- [ ] Decimal constant unified to 18 across all files
- [ ] Deposit calls ArcBond contract directly via MetaMask
- [ ] `surface-panel-dark` is actually dark
- [ ] `BondTimeline` receives a real `bondId`
- [ ] `JobsMarketplace` DB writes correct job data on status updates
- [ ] `networkStatus` is dynamic

**After confirming all items above, summarize changes to the user and wait for approval before starting Phase 2.**

---

# ═══════════════════════════════════════════════
# PHASE 2 — WEBSOCKET & EVENT-DRIVEN ARCHITECTURE
# ═══════════════════════════════════════════════

> [!IMPORTANT]
> Currently the app has 9 simultaneous polling intervals firing every 3 seconds. This phase replaces on-chain state polling with real-time event subscriptions. The polling for balance display can remain at a longer interval (10s) — it is acceptable for balances.

### Task 2.1 — Add WebSocket Server

Since Next.js App Router does not support WebSocket upgrades natively, use a **custom Next.js server** with the `ws` library.

> 🛑 **MANUAL STEP — STOP HERE**
>
> The user must run this command in the `arcbond-phase3-dashboard` directory:
> ```
> npm install ws
> npm install --save-dev @types/ws
> ```
> Confirm installation is complete before proceeding.

**File to create**: `server.ts` (in root of `arcbond-phase3-dashboard`)

This file replaces the default Next.js dev server. It:
1. Creates an HTTP server that passes requests to Next.js
2. Creates a `WebSocketServer` attached to the HTTP server
3. Uses viem's `watchContractEvent` with a WebSocket transport to subscribe to all ArcBond events
4. On each event, broadcasts a typed JSON message to all connected browser clients
5. Handles client connect/disconnect cleanly

```ts
// server.ts — Custom Next.js server with WebSocket support
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
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

  wss.on("connection", (ws) => {
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
  // NOTE: Arc Testnet WebSocket RPC endpoint — confirm correct URL with user
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
          broadcast({ type: eventName, payload: log });
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
```

> 🛑 **MANUAL STEP — STOP HERE**
>
> The user must confirm the Arc Testnet **WebSocket RPC endpoint**. The HTTP RPC is `https://rpc.testnet.arc.network`. The WebSocket equivalent is likely `wss://rpc.testnet.arc.network` but this must be confirmed.
> Ask the user: "What is the Arc Testnet WebSocket RPC URL?" and wait for their answer before hardcoding it.

---

### Task 2.2 — Update `package.json` Scripts

**File**: `package.json`

Change the `dev` script to use the custom server:
```json
"scripts": {
  "dev": "ts-node --project tsconfig.server.json server.ts",
  "build": "next build",
  "start": "NODE_ENV=production ts-node --project tsconfig.server.json server.ts"
}
```

Also add `ts-node` if not already installed:

> 🛑 **MANUAL STEP — STOP HERE**
>
> User must run:
> ```
> npm install --save-dev ts-node
> ```
> Confirm before proceeding.

Create `tsconfig.server.json` in the root for the server compilation:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2017",
    "noEmit": false,
    "outDir": ".server-build"
  },
  "include": ["server.ts", "src/lib/**/*"]
}
```

---

### Task 2.3 — Create `useArcBondEvents` Hook

**File to create**: `src/hooks/useArcBondEvents.ts`

This hook connects to the WebSocket server and receives live contract events:

```ts
"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface ArcBondEvent {
  type: string;
  payload: Record<string, unknown>;
  receivedAt: number;
}

export function useArcBondEvents(onEvent?: (event: ArcBondEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ArcBondEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const wsUrl = `ws://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        const event: ArcBondEvent = { ...data, receivedAt: Date.now() };
        setLastEvent(event);
        onEventRef.current?.(event);
      } catch {
        console.warn("[useArcBondEvents] Failed to parse WS message:", msg.data);
      }
    };

    return () => ws.close();
  }, []);

  return { connected, lastEvent };
}
```

---

### Task 2.4 — Wire Events into `page.tsx`

**File**: `src/app/page.tsx`

Add `useArcBondEvents` hook. On relevant events, trigger data refetches instead of polling:

```ts
useArcBondEvents((event) => {
  // Job events — refresh jobs list
  if (["JobCreated","JobFunded","JobApproved","DeliverableSubmitted",
       "JobCompleted","JobRejected","JobExpired","JobArbitrated"].includes(event.type)) {
    fetchJobs();
    fetchProtocolStats();
  }
  // Bond events — refresh bond state
  if (["BondCreated","BondApproved","BondSlashed","BondReleased"].includes(event.type)) {
    // trigger bond refetch (selectedBondId state update if needed)
    fetchProtocolStats();
  }
  // Balance events
  if (["Deposited","Withdrawn"].includes(event.type)) {
    fetchUserTransactions();
    fetchProtocolStats();
  }
  // Agent events
  if (event.type === "AgentIdBound") {
    fetchUserAgents();
  }
});
```

Reduce the `setInterval` polling intervals:
- `fetchProtocolStats` interval: change from 3000ms to **15000ms** (15 seconds)
- `fetchUserTransactions`, `fetchUserAgents`, `fetchJobs` intervals: change from 3000ms to **10000ms** (10 seconds)
- Balance hooks (`useRealtimeBalance`, `useMetaMaskBalance`): change `BALANCE_POLL_INTERVAL_MS` in `constants.ts` from 3000 to **8000** (8 seconds)

---

### Task 2.5 — Add WebSocket Connection Status to Header

**File**: `src/components/Header.tsx`

Add a WebSocket connection indicator alongside the network status dot. Pass a `wsConnected: boolean` prop and show a secondary indicator:
- Green dot: WS connected
- Grey dot: WS disconnected

---

### ✅ Phase 2 Completion Check

- [ ] `server.ts` created and runs custom HTTP + WebSocket server
- [ ] `tsconfig.server.json` created
- [ ] `package.json` dev script updated
- [ ] WebSocket subscribes to all 17 ArcBond events
- [ ] `useArcBondEvents` hook created
- [ ] Events trigger refetches in `page.tsx`
- [ ] Polling intervals reduced
- [ ] WS connection indicator in Header

**Summarize changes to user and wait for approval before Phase 3.**

---

# ═══════════════════════════════════════════════
# PHASE 3 — BOND SYSTEM UI
# ═══════════════════════════════════════════════

> [!IMPORTANT]
> Bond creation, approval, release, and slashing are the core trust mechanism of ArcBond. Currently 0% implemented in the frontend. This phase builds the complete bond lifecycle UI.

### Task 3.1 — Create `CreateBondModal.tsx`

**File to create**: `src/components/CreateBondModal.tsx`

This modal allows a user to create a bond with a counterparty:

**Form fields**:
- Counterparty address (text input, `0x...`)
- Collateral amount (number input, USDC)
- Initiator split (slider, 0%–100%, stored as BPS: 0–10000)
- Display: counterparty split (auto-calculated as `100% - initiatorSplit%`)

**Pre-flight checks before submitting**:
1. Check `agentIds[userAddress]` — if `0`, show error: "You must bind an agent ID before creating a bond. Go to the Agents tab."
2. Check `agentIds[counterpartyAddress]` — if `0`, show error: "Counterparty has no bound agent ID."
3. Check `balances[userAddress]` in ArcBond — must be `>= collateral`. Show error if insufficient.
4. Display the 1% bonding fee deduction clearly: "Fee: X USDC (1%). Net collateral locked: Y USDC."

**On submit**:
```ts
const txHash = await walletClient.writeContract({
  address: ARCBOND_ADDRESS,
  abi: ARCBOND_ABI,
  functionName: "createBond",
  args: [counterparty, parseUnits(collateral, ARC_USDC_DECIMALS), initiatorSplitBPS],
  account: userAddress,
});
```
- Wait for receipt
- Log to DB via `/api/user` POST with bond data
- Show success with Bond ID

---

### Task 3.2 — Create `ApproveBondModal.tsx`

**File to create**: `src/components/ApproveBondModal.tsx`

Shown when the connected user is the counterparty of a Pending bond:
- Display bond details (initiator, collateral, splits)
- Display counterparty's required stake amount
- Check `balances[counterpartyAddress]` is sufficient
- "Approve Bond" button → calls `approveBond(bondId)`
- On success: bond transitions to `Active`

---

### Task 3.3 — Add Bond Actions to `BondTimeline.tsx`

**File**: `src/components/BondTimeline.tsx`

Add action buttons based on bond status and user role:

| Bond Status | User Role | Button |
|---|---|---|
| `Pending` | Counterparty | "Approve Bond" → `approveBond(bondId)` |
| `Active` | Initiator or Counterparty | "Release Bond" → `releaseBond(bondId)` |
| `Active` | Has `ARBITRATOR_ROLE` | "Slash Bond" → show party selector → `slashBond(bondId, slashInitiator)` |

To check if user is arbitrator, call:
```ts
const isArbitrator = await publicClient.readContract({
  address: ARCBOND_ADDRESS,
  abi: ARCBOND_ABI,
  functionName: "hasRole",
  args: [keccak256(toBytes("ARBITRATOR_ROLE")), userAddress],
});
```

---

### Task 3.4 — Add Bond List to Agents Tab

**File**: `src/app/page.tsx` (Agents tab section)

Below the existing agent cards, add a "My Bonds" section:
- Fetch bonds where user is initiator or counterparty. Since the contract has no `getBondsByUser` view, query the DB for bonds recorded during creation.
- Add a `Bond` model to the Prisma schema and API (see Phase 7 for full DB changes — for now, store bond IDs from `BondCreated` events received via WebSocket)
- List each bond with: Bond ID, counterparty (truncated), status pill, collateral amount
- Clicking a bond sets `selectedBondId` (so BondTimeline updates)

Add "Create Bond" button in the Agents tab header.

---

### ✅ Phase 3 Completion Check

- [ ] `CreateBondModal.tsx` built with pre-flight checks and fee display
- [ ] `ApproveBondModal.tsx` built
- [ ] `BondTimeline.tsx` has contextual action buttons
- [ ] Arbitrator role check implemented
- [ ] Bond list visible in Agents tab
- [ ] "Create Bond" button accessible

**Summarize and wait for approval before Phase 4.**

---

# ═══════════════════════════════════════════════
# PHASE 4 — ARBITRATION & DISPUTE SYSTEM
# ═══════════════════════════════════════════════

### Task 4.1 — Add "Raise Dispute" to `JobsMarketplace.tsx`

**File**: `src/components/JobsMarketplace.tsx`

When `job.status === "SUBMITTED"` and user is client or provider, show a "Raise Dispute" button:
- Display a warning before confirming: "Raising a dispute charges 1% of the job budget (X USDC) as arbitration fee. This fee is non-refundable."
- On confirm: call `raiseDispute(jobId)`
- Update DB status to `"ARBITRATION"` after tx confirms

---

### Task 4.2 — Add "Expire Job" to `JobsMarketplace.tsx`

**File**: `src/components/JobsMarketplace.tsx`

For each job, display `expiredAt` as a readable date in the table (add an "Expires" column).

If `Date.now() / 1000 >= job.expiredAt` and `job.status` is `OPEN`, `FUNDED`, or `SUBMITTED`:
- Show "Expire" button (grey, small)
- On click: call `expireJob(jobId)`
- Update DB status to `"EXPIRED"` after tx confirms

---

### Task 4.3 — Create `ArbitratorPanel.tsx`

**File to create**: `src/components/ArbitratorPanel.tsx`

This component is shown only when the connected wallet has `ARBITRATOR_ROLE`:

```ts
// Check for ARBITRATOR_ROLE on mount
const ARBITRATOR_ROLE = keccak256(toBytes("ARBITRATOR_ROLE"));
const isArbitrator = await publicClient.readContract({
  address: ARCBOND_ADDRESS,
  abi: ARCBOND_ABI,
  functionName: "hasRole",
  args: [ARBITRATOR_ROLE, userAddress],
});
```

If not arbitrator: render nothing (do not show this component at all).

If arbitrator: render a panel showing all jobs with status `ARBITRATION`:
- Job ID, client address, provider address, budget
- Two buttons per job: **"Provider Wins"** and **"Client Wins"**
- Each calls `arbitrateJob(jobId, providerWins: boolean)`
- Show reputation impact preview: "Provider +3 rep, Client -2 rep" or "Provider -5 rep, Client +2 rep"

> 🛑 **MANUAL STEP — STOP HERE**
>
> The user must confirm: does their wallet currently hold the `ARBITRATOR_ROLE` on the deployed ArcBond contract? They need to verify this either via the contract on Arcscan or by calling `hasRole` directly.
> Do not hardcode any wallet address as an arbitrator. Wait for user confirmation.

---

### Task 4.4 — Add Arbitrator Tab to Navigation

**File**: `src/app/page.tsx`

Add an "Arbitrator" tab to the sidebar nav list. Only display it after role check returns true. Inside the tab, render `<ArbitratorPanel userAddress={userAddress} />`.

---

### ✅ Phase 4 Completion Check

- [ ] "Raise Dispute" button in `JobsMarketplace` with fee warning
- [ ] "Expire" button with deadline display in `JobsMarketplace`
- [ ] `ArbitratorPanel.tsx` built with role check
- [ ] Arbitrator tab in navigation (conditional on role)
- [ ] All actions update DB after on-chain confirmation

**Summarize and wait for approval before Phase 5.**

---

# ═══════════════════════════════════════════════
# PHASE 5 — REPUTATION SYSTEM
# ═══════════════════════════════════════════════

### Task 5.1 — Create `ReputationBadge.tsx`

**File to create**: `src/components/ReputationBadge.tsx`

Fetches and displays `reputationOf(agentId)` from the contract:
- Positive score: green badge with `+N`
- Negative score: red badge with `−N`
- Zero: grey badge with `0`
- Includes a small tooltip/label: "On-chain ERC-8004 Reputation"

```ts
const rep = await publicClient.readContract({
  address: ARCBOND_ADDRESS,
  abi: ARCBOND_ABI,
  functionName: "reputationOf",
  args: [agentId],
});
```

---

### Task 5.2 — Add Reputation to `AgentCard.tsx`

**File**: `src/components/AgentCard.tsx`

Import and render `<ReputationBadge agentId={BigInt(agent.agentId)} />` inside each agent card. Display it prominently alongside the agent name.

---

### Task 5.3 — Log Reputation Events from WebSocket

**File**: `src/app/api/user/route.ts` (or a new `src/app/api/reputation/route.ts`)

When the WebSocket server receives a `ReputationSynced` event, the server broadcasts it. The frontend receives it via `useArcBondEvents`. Add a handler that POSTs reputation events to the API for DB logging.

Add `ReputationEvent` model to the Prisma schema:
```prisma
model ReputationEvent {
  id        String @id @default(uuid())
  agentId   String
  delta     Int
  reason    String
  timestamp Int
  txHash    String @unique
}
```

> 🛑 **MANUAL STEP — STOP HERE**
>
> After adding the new Prisma model, the user must run:
> ```
> npx prisma migrate dev --name add_reputation_events
> ```
> in the `arcbond-phase3-dashboard` directory. Wait for confirmation before proceeding.

---

### ✅ Phase 5 Completion Check

- [ ] `ReputationBadge.tsx` built and fetches live on-chain rep
- [ ] Reputation shown on every `AgentCard`
- [ ] `ReputationEvent` model in schema
- [ ] Reputation events logged via WebSocket → API → DB

**Summarize and wait for approval before Phase 6.**

---

# ═══════════════════════════════════════════════
# PHASE 6 — ADMIN PANEL
# ═══════════════════════════════════════════════

### Task 6.1 — Create Admin Tab

**File**: `src/app/page.tsx`

Add "Admin" tab to the sidebar. Only visible when wallet has `DEFAULT_ADMIN_ROLE` or `OPERATOR_ROLE`.

---

### Task 6.2 — Create `AdminPanel.tsx`

**File to create**: `src/components/AdminPanel.tsx`

Sections:

**Protocol Fees Section**:
- Display live `protocolFees` value (from `useArcBondData`)
- "Collect Fees" button with recipient address input → calls `collectFees(recipient)`

> 🛑 **MANUAL STEP — STOP HERE**
>
> The user must confirm the recipient address for fee collection. Do not default to any address. Ask the user: "What address should collected protocol fees be sent to?" and wait for their answer.

**Protocol Control Section**:
- Display current `paused` status
- If not paused: "Pause Protocol" button → `pause()`
- If paused: "Unpause Protocol" button → `unpause()`
- Include a warning before pausing: "Pausing will halt all deposits, bonds, and jobs until unpaused."

**Role Management Section**:
- Grant Arbitrator Role: input address → calls `grantRole(ARBITRATOR_ROLE, address)`
- Revoke Arbitrator Role: input address → calls `revokeRole(ARBITRATOR_ROLE, address)`
- Grant Operator Role: input address → calls `grantRole(OPERATOR_ROLE, address)`

---

### ✅ Phase 6 Completion Check

- [ ] Admin tab in nav (role-gated)
- [ ] Fee display and collection UI
- [ ] Pause/unpause controls
- [ ] Role management form

**Summarize and wait for approval before Phase 7.**

---

# ═══════════════════════════════════════════════
# PHASE 7 — DATABASE OVERHAUL
# ═══════════════════════════════════════════════

> [!CAUTION]
> The current SQLite `dev.db` file will be wiped on every production deployment. This phase migrates to PostgreSQL. This is a destructive change to the database configuration.

> 🛑 **MANUAL STEP — STOP HERE — BEFORE ANY CODE CHANGES**
>
> The user must:
> 1. Choose and provision a PostgreSQL database. Options: Supabase (free tier), Railway, Neon, or PlanetScale.
> 2. Copy the `DATABASE_URL` connection string (format: `postgresql://user:pass@host:port/dbname`)
> 3. Add it to `arcbond-phase3-dashboard/.env.local`:
>    ```
>    DATABASE_URL="postgresql://your-connection-string-here"
>    ```
> 4. Confirm the connection string is in place before Hermes touches `schema.prisma`
>
> Do NOT proceed until the user provides confirmation.

### Task 7.1 — Update `schema.prisma`

**File**: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  walletAddress String        @id
  ensName       String?
  registeredAt  Int
  lastLogin     Int?
  agents        UserAgent[]
  transactions  Transaction[]
}

model UserAgent {
  id           String  @id @default(uuid())
  userId       String
  agentId      String
  name         String?
  description  String?
  isActive     Boolean @default(true)
  registeredAt Int
  address      String  @default("")
  user         User    @relation(fields: [userId], references: [walletAddress], onDelete: Cascade)
}

model Transaction {
  id          String  @id @default(uuid())
  userId      String
  type        String
  amount      String
  fromAddress String
  toAddress   String
  txHash      String  @unique
  status      String
  timestamp   Int
  sourceChain String?
  user        User    @relation(fields: [userId], references: [walletAddress], onDelete: Cascade)
}

model Job {
  id               String @id
  clientAddress    String
  providerAddress  String
  evaluatorAddress String
  description      String
  budget           String
  status           String
  expiredAt        Int
  txHash           String @unique
  createdAt        Int
  bondId           String?
}

model Bond {
  id                  String @id
  initiatorAddress    String
  counterpartyAddress String
  initiatorAgentId    String
  counterpartyAgentId String
  collateral          String
  initiatorSplit      Int
  counterpartySplit   Int
  status              Int
  createdAt           Int
  txHash              String @unique
}

model ReputationEvent {
  id        String @id @default(uuid())
  agentId   String
  delta     Int
  reason    String
  timestamp Int
  txHash    String @unique
}
```

> 🛑 **MANUAL STEP — STOP HERE**
>
> After Hermes updates `schema.prisma`, the user must run:
> ```
> npx prisma migrate dev --name postgresql_migration
> npx prisma generate
> ```
> in the `arcbond-phase3-dashboard` directory.
> Confirm migration ran without errors before proceeding.

---

### Task 7.2 — Add Bond API Endpoint

**File to create**: `src/app/api/bonds/route.ts`

`GET` — fetch bonds by user address (initiator or counterparty)
`POST` — log a new bond record to the DB (called after `BondCreated` event)

---

### ✅ Phase 7 Completion Check

- [ ] `schema.prisma` updated to PostgreSQL
- [ ] `Bond` and `ReputationEvent` models added
- [ ] Migration run and confirmed by user
- [ ] Bond API route created

**Summarize and wait for approval before Phase 8.**

---

# ═══════════════════════════════════════════════
# PHASE 8 — UX & ARCHITECTURE CLEANUP
# ═══════════════════════════════════════════════

### Task 8.1 — Split `page.tsx` (765 lines) into Logical Pieces

**Files to create**:
- `src/hooks/useWalletConnection.ts` — extract wallet connect, account change, chain change logic
- `src/context/WalletContext.tsx` — React context to share `userAddress` globally (eliminates prop drilling)
- `src/hooks/useProtocolData.ts` — extract all data-fetching functions and their intervals

---

### Task 8.2 — Remove Duplicate Public Client Instances

`useRealtimeBalance.ts`, `useMetaMaskBalance.ts`, `wallet-operations.ts`, and `protocol/stats/route.ts` all call `createPublicClient` with identical config. All client-side hooks should import the shared `publicClient` from `src/lib/viem-client.ts`. (Server-side routes need their own instance due to SSR isolation — leave those.)

---

### Task 8.3 — Fix `PrimaryBalance` to Show ArcBond Ledger Balance

**File**: `src/components/PrimaryBalance.tsx`

The primary balance currently shows the Circle MPC wallet balance. Change it to show:
- **ArcBond Protocol Ledger Balance**: `balances[userAddress]` read from the contract
- This is what the user actually has available for bonds and jobs

Add a secondary line below showing the raw wallet balance (via `useMetaMaskBalance`). Label them clearly:
- "Protocol Balance" (usable for bonds/jobs)
- "Wallet Balance" (raw on-chain USDC)

---

### Task 8.4 — Add `ARBITRATOR_ROLE` and `OPERATOR_ROLE` Constants to `constants.ts`

**File**: `src/lib/constants.ts`

```ts
import { keccak256, toBytes } from "viem";
export const ARBITRATOR_ROLE = keccak256(toBytes("ARBITRATOR_ROLE"));
export const OPERATOR_ROLE = keccak256(toBytes("OPERATOR_ROLE"));
export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
```

Use these constants everywhere — never re-derive `keccak256("ARBITRATOR_ROLE")` inline.

---

### ✅ Phase 8 Completion Check

- [ ] `page.tsx` split into logical hooks and context
- [ ] Duplicate `publicClient` instances removed
- [ ] `PrimaryBalance` shows ArcBond ledger balance
- [ ] Role constants added to `constants.ts`

**Summarize all Phase 8 changes to user. Full plan execution complete.**

---

# ═══════════════════════════════════════════════
# FINAL VERIFICATION CHECKLIST
# ═══════════════════════════════════════════════

> 🛑 **MANUAL STEP — USER MUST VERIFY ALL OF THESE**
>
> Hermes should present this checklist to the user and ask them to test each item manually:

- [ ] `npm run dev` starts without errors, WebSocket server connects
- [ ] MetaMask connects to Arc Testnet, `networkStatus` shows "synced"
- [ ] Deposit via MetaMask calls `ArcBond.deposit()` — confirm on Arcscan that `balances[user]` increases
- [ ] Bind agent ID — confirm `AgentIdBound` event fires in real-time in the UI
- [ ] Create bond with a second test wallet — `BondCreated` event updates UI within 1 second
- [ ] Second wallet approves bond — `BondApproved` fires, bond shows Active
- [ ] Post a job linked to the active bond
- [ ] Fund, submit deliverable, complete full job lifecycle
- [ ] Raise a dispute and arbitrate it
- [ ] Expire a past-deadline job
- [ ] Admin panel: view protocol fees, collect them, pause the protocol
- [ ] Reputation scores visible on agent cards after job completions
- [ ] Database persists after server restart (PostgreSQL)

---

*Plan prepared by Antigravity | ArcBond smart contract deployed at `0xf5E644C25185949F90fF983c3f4f3d2E773eD9E2` on Arc Testnet*
