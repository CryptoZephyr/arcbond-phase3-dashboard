// src/hooks/useAgentData.ts
// Queries real-time on-chain balances and bound agent IDs for any specified address

import { useEffect, useRef, useState } from "react";
import { publicClient } from "@/lib/viem-client";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { ARCBOND_ADDRESS, BALANCE_POLL_INTERVAL_MS } from "@/lib/constants";

export interface AgentData {
    address: string;
    ledgerBalance: bigint;
    boundAgentId: bigint;
  reputation: bigint;
}

export function useAgentData(walletAddress: string) {
    const [agentData, setAgentData] = useState<AgentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestRef = useRef(0);
    const isFirstLoadRef = useRef(true);

    useEffect(() => {
        if (!walletAddress) {
            setAgentData(null);
            setLoading(false);
            return;
        }

        const fetchAgentData = async () => {
            const myRequestId = ++requestRef.current;

            // Only show loading spinner on first load, not on interval polls
            if (isFirstLoadRef.current) {
                setLoading(true);
                isFirstLoadRef.current = false;
            }

            try {
                const [balance, bound] = await Promise.all([
                    publicClient.readContract({
                        address: ARCBOND_ADDRESS,
                        abi: ARCBOND_ABI,
                        functionName: "balances",
                        args: [walletAddress as `0x${string}`],
                    }),
                    publicClient.readContract({
                        address: ARCBOND_ADDRESS,
                        abi: ARCBOND_ABI,
                        functionName: "agentIds",
                        args: [walletAddress as `0x${string}`],
                    }),
                ]);

                // Guard: only update state if this is still the latest request
                if (requestRef.current !== myRequestId) return;

                setAgentData({
                    address: walletAddress,
                    ledgerBalance: balance as bigint,
                    boundAgentId: bound as bigint,
                    reputation: BigInt(0),
                });
                setLoading(false);
                setError(null);
            } catch (err) {
                // Guard: only update state if this is still the latest request
                if (requestRef.current !== myRequestId) return;

                const errorMsg = err instanceof Error ? err.message : "Query failed";
                setError(errorMsg);
                setLoading(false);
                // Keep last-known agentData on transient errors (do not clear it)
            }
        };

        fetchAgentData();

        // Poll using centralized interval constant for consistency
        const interval = setInterval(fetchAgentData, BALANCE_POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [walletAddress]);

    return { agentData, loading, error };
}



