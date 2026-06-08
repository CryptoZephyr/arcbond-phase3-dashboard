// src/lib/constantsServer.ts
// Minimal constants needed by the custom WS server (no enums, plain values)
export const ARC_RPC = process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.testnet.arc.network";
export const ARC_CHAIN_ID = 5042002;
export const ARCBOND_ADDRESS = (process.env.NEXT_PUBLIC_ARCBOND_ADDRESS as `0x${string}`) || "0xf5E644C25185949F90fF983c3f4f3d2E773eD9E2";
