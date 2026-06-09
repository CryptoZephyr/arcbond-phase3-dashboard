// src/hooks/useProtocolData.ts
// Centralizes all protocol data fetching: transactions, agents, jobs, stats, on-chain
// bond/job state, real-time WebSocket reactions, role checks, and the ArcBond ledger balance.

"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { useArcBondData } from "@/hooks/useArcBondData";
import { useArcBondEvents } from "@/hooks/useArcBondEvents";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import {
    ARCBOND_ADDRESS,
    ARC_USDC_DECIMALS,
    DEFAULT_ADMIN_ROLE,
    OPERATOR_ROLE,
    formatUsdcFromBigInt,
} from "@/lib/constants";

export interface ProtocolStats {
    totalVolume: string;
    protocolFees: string;
    pendingSettlements: string;
}

export interface TransactionRecord {
    id: string;
    type: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
    txHash: string;
    status: string;
    timestamp: number;
    sourceChain?: string | null;
}

export interface UserAgentRecord {
    id: string;
    agentId: string;
    name: string;
    description: string;
    isActive: boolean;
    registeredAt: number;
    address: string;
    ledgerBalance: bigint;
    boundAgentId: bigint;
}

export interface EscrowJobRecord {
    id: string;
    clientAddress: string;
    providerAddress: string;
    evaluatorAddress: string;
    description: string;
    budget: string;
    status: string;
    expiredAt: number;
    txHash: string;
    createdAt: number;
}

export function useProtocolData(userAddress: string) {
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [userAgents, setUserAgents] = useState<UserAgentRecord[]>([]);
    const [jobs, setJobs] = useState<EscrowJobRecord[]>([]);
    const [stats, setStats] = useState<ProtocolStats>({
        totalVolume: "0.00",
        protocolFees: "0.00",
        pendingSettlements: "0.00",
    });

    const [selectedJobId, setSelectedJobId] = useState<bigint | undefined>(undefined);
    const [selectedBondId, setSelectedBondId] = useState<bigint | undefined>(undefined);

    const { state: arcBondState, error: arcBondError } = useArcBondData(selectedBondId, selectedJobId);
    const { wsConnected, latestEvent } = useArcBondEvents();

    // Role checks
    const [hasAdminRole, setHasAdminRole] = useState(false);

    const { data: isAdminRole } = useReadContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: "hasRole",
        args: [DEFAULT_ADMIN_ROLE, userAddress as `0x${string}`],
        query: { enabled: !!userAddress },
    });

    const { data: isOperatorRole } = useReadContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: "hasRole",
        args: [OPERATOR_ROLE, userAddress as `0x${string}`],
        query: { enabled: !!userAddress },
    });

    useEffect(() => {
        setHasAdminRole(!!isAdminRole || !!isOperatorRole);
    }, [isAdminRole, isOperatorRole]);

    // ArcBond protocol ledger balance: balances[userAddress]
    const { data: ledgerBalanceRaw } = useReadContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: "balances",
        args: [userAddress as `0x${string}`],
        query: { enabled: !!userAddress },
    });

    const protocolBalance =
        ledgerBalanceRaw !== undefined && ledgerBalanceRaw !== null
            ? formatUsdcFromBigInt(ledgerBalanceRaw as bigint, ARC_USDC_DECIMALS)
            : "0.00";

    // --- Fetchers ---
    const fetchUserAgents = async () => {
        if (!userAddress) return;
        try {
            const response = await fetch(`/api/user?userId=${userAddress}&type=agents`);
            const data = await response.json();
            if (response.ok && data.success) setUserAgents(data.agents);
        } catch (err) {
            console.error("Failed to fetch user agents:", err);
        }
    };

    const fetchJobs = async () => {
        if (!userAddress) return;
        try {
            const response = await fetch(`/api/user?userId=${userAddress}&type=jobs`);
            const data = await response.json();
            if (response.ok && data.success) setJobs(data.jobs);
        } catch (err) {
            console.error("Failed to fetch jobs:", err);
        }
    };

    const fetchUserTransactions = async () => {
        if (!userAddress) return;
        try {
            const response = await fetch(`/api/transactions?userId=${userAddress}`);
            const data = await response.json();
            if (response.ok && data.success) setTransactions(data.transactions);
        } catch (err) {
            console.error("Failed to fetch user transactions:", err);
        }
    };

    const fetchProtocolStats = async () => {
        try {
            const response = await fetch("/api/protocol/stats");
            const data = await response.json();
            if (response.ok && data.success) setStats(data.stats);
        } catch (err) {
            console.error("Failed to fetch protocol stats:", err);
        }
    };

    // Keep selectedJobId valid against on-chain job count
    useEffect(() => {
        if (!jobs.length) {
            setSelectedJobId(undefined);
            return;
        }

        const maxOnChainJobId = arcBondState?.jobCount ?? BigInt(0);
        const validJobIds = jobs
            .map((job) => {
                try {
                    return BigInt(job.id);
                } catch {
                    return null;
                }
            })
            .filter((id): id is bigint => id !== null && id > BigInt(0) && id <= maxOnChainJobId);

        if (!validJobIds.length) {
            setSelectedJobId(undefined);
            return;
        }

        const selectedExists = selectedJobId ? validJobIds.some((id) => id === selectedJobId) : false;
        if (!selectedExists) setSelectedJobId(validJobIds[0]);
    }, [jobs, selectedJobId, arcBondState?.jobCount]);

    useEffect(() => {
        if (selectedBondId === undefined && arcBondState?.bondCount && arcBondState.bondCount > BigInt(0)) {
            setSelectedBondId(arcBondState.bondCount);
        }
    }, [arcBondState?.bondCount, selectedBondId]);

    // Initial fetch and fallback polling (15000 ms) for protocol stats
    useEffect(() => {
        fetchProtocolStats();
        const interval = setInterval(fetchProtocolStats, 15000);
        return () => clearInterval(interval);
    }, []);

    // React to incoming WS events and trigger specific refetches
    useEffect(() => {
        if (!latestEvent) return;
        const { type } = latestEvent;
        if (["BondCreated", "BondApproved", "BondSlashed", "BondReleased"].includes(type)) {
            fetchProtocolStats();
        }
        if (["Deposited", "Withdrawn"].includes(type)) {
            fetchUserTransactions();
            fetchProtocolStats();
        }
        if (type === "AgentIdBound") {
            fetchUserAgents();
        }
        if (
            [
                "JobCreated",
                "JobFunded",
                "JobApproved",
                "DeliverableSubmitted",
                "JobCompleted",
                "JobRejected",
                "JobArbitrated",
                "JobExpired",
            ].includes(type)
        ) {
            fetchJobs();
            fetchProtocolStats();
        }
    }, [latestEvent]);

    // Per-user data fetch + 10s polling
    useEffect(() => {
        if (!userAddress) {
            setTransactions([]);
            setUserAgents([]);
            setJobs([]);
            return;
        }

        fetchUserTransactions();
        fetchUserAgents();
        fetchJobs();

        const interval = setInterval(() => {
            fetchUserTransactions();
            fetchUserAgents();
            fetchJobs();
        }, 10000);

        return () => clearInterval(interval);
    }, [userAddress]);

    return {
        transactions,
        userAgents,
        jobs,
        stats,
        selectedJobId,
        setSelectedJobId,
        selectedBondId,
        setSelectedBondId,
        arcBondState,
        arcBondError,
        wsConnected,
        hasAdminRole,
        protocolBalance,
        fetchUserAgents,
        fetchJobs,
        fetchUserTransactions,
        fetchProtocolStats,
    };
}
