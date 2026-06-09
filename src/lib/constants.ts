// src/lib/constants.ts
// Platform constants and enum definitions for Arc L1 and ArcBond

import { formatUnits, keccak256, toBytes } from "viem";

// Polling intervals for consistency across all hooks
export const BALANCE_POLL_INTERVAL_MS = 8000;

// Format USDC BigInt to decimal string with consistent precision
export function formatUsdcFromBigInt(balance: bigint, decimals: number): string {
    try {
        return parseFloat(formatUnits(balance, decimals)).toFixed(2);
    } catch {
        return "0.00";
    }
}

export const ARCBOND_ADDRESS =
    (process.env.NEXT_PUBLIC_ARCBOND_ADDRESS as `0x${string}`) ||
    "0xf5E644C25185949F90fF983c3f4f3d2E773eD9E2";

export const IDENTITY_REGISTRY =
    (process.env.NEXT_PUBLIC_IDENTITY_REGISTRY as `0x${string}`) ||
    "0x8004A818BFB912233c491871b3d84c89A494BD9e";

export const ARC_RPC =
    process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.testnet.arc.network";

// Explorer base URL for Arc Testnet (can be overridden via env var)
export const ARC_EXPLORER =
    process.env.NEXT_PUBLIC_ARC_EXPLORER || "https://explorer.testnet.arc.network";

export const ARC_CHAIN_ID = 5042002;

// Role identifiers (bytes32 hashes) – used with hasRole checks
export const ARBITRATOR_ROLE = keccak256(toBytes("ARBITRATOR_ROLE"));
export const OPERATOR_ROLE = keccak256(toBytes("OPERATOR_ROLE"));
export const DEFAULT_ADMIN_ROLE =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

export const ARC_USDC_DECIMALS = 18;


export enum BondStatus {
    Pending = 0,
    Active = 1,
    Slashed = 2,
    Released = 3,
}

export enum JobStatus {
    Open = 0,
    Funded = 1,
    Submitted = 2,
    Completed = 3,
    Rejected = 4,
    Arbitration = 5,
    Expired = 6,
}

export const BOND_STATUS_LABELS: Record<BondStatus, string> = {
    [BondStatus.Pending]: "Pending",
    [BondStatus.Active]: "Active",
    [BondStatus.Slashed]: "Slashed",
    [BondStatus.Released]: "Released",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
    [JobStatus.Open]: "Open",
    [JobStatus.Funded]: "Funded",
    [JobStatus.Submitted]: "Submitted",
    [JobStatus.Completed]: "Completed",
    [JobStatus.Rejected]: "Rejected",
    [JobStatus.Arbitration]: "Arbitration",
    [JobStatus.Expired]: "Expired",
};