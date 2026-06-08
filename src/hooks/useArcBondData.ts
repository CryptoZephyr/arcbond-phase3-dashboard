// src/hooks/useArcBondData.ts
// Polls and fetches live on-chain data for globally accumulated stats, individual bonds, and jobs

import { useEffect, useState, useRef } from "react";
import { publicClient } from "@/lib/viem-client";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { ARCBOND_ADDRESS, BALANCE_POLL_INTERVAL_MS } from "@/lib/constants";

const FIRST_CONTRACT_ID = BigInt(0);

export interface ArcBondContractState {
    bondCount: bigint;
    jobCount: bigint;
    paused: boolean;
    protocolFees: bigint;
    bond?: {
        initiatorAgentId: bigint;
        counterpartyAgentId: bigint;
        initiator: string;
        counterparty: string;
        collateral: bigint;
        initiatorSplit: number;
        counterpartySplit: number;
        status: number;
        createdAt: bigint;
    };
    job?: {
        id: bigint;
        client: string;
        provider: string;
        evaluator: string;
        description: string;
        budget: bigint;
        expiredAt: bigint;
        status: number;
        hook: string;
        deliverableHash: string;
        reasonHash: string;
        bondId: bigint;
    };
}

type BondContractData = NonNullable<ArcBondContractState["bond"]>;
type JobContractData = NonNullable<ArcBondContractState["job"]>;

export function useArcBondData(bondId?: bigint, jobId?: bigint, refreshInterval = BALANCE_POLL_INTERVAL_MS) {
    const [state, setState] = useState<ArcBondContractState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestRef = useRef(0);

    useEffect(() => {
        const fetchData = async () => {
            const myRequestId = ++requestRef.current;
            try {
                setError(null);
                setLoading(true);
                const [bondCount, jobCount, paused, protocolFees] = await Promise.all([
                    publicClient.readContract({
                        address: ARCBOND_ADDRESS,
                        abi: ARCBOND_ABI,
                        functionName: "bondCount",
                    }),
                    publicClient.readContract({
                        address: ARCBOND_ADDRESS,
                        abi: ARCBOND_ABI,
                        functionName: "jobCount",
                    }),
                    publicClient.readContract({
                        address: ARCBOND_ADDRESS,
                        abi: ARCBOND_ABI,
                        functionName: "paused",
                    }),
                    publicClient.readContract({
                        address: ARCBOND_ADDRESS,
                        abi: ARCBOND_ABI,
                        functionName: "protocolFees",
                    }),
                ]);

                // Guard against stale responses
                if (requestRef.current !== myRequestId) return;

                const newState: ArcBondContractState = {
                    bondCount: bondCount as bigint,
                    jobCount: jobCount as bigint,
                    paused: paused as boolean,
                    protocolFees: protocolFees as bigint,
                };

                if (bondId && bondId > FIRST_CONTRACT_ID && bondId <= (bondCount as bigint)) {
                    try {
                        const bond = await publicClient.readContract({
                            address: ARCBOND_ADDRESS,
                            abi: ARCBOND_ABI,
                            functionName: "getBond",
                            args: [bondId],
                        });
                        newState.bond = bond as BondContractData;
                    } catch {
                        // Ignore missing/non-existent bond IDs without collapsing global state.
                    }
                }

                if (jobId && jobId > FIRST_CONTRACT_ID && jobId <= (jobCount as bigint)) {
                    try {
                        const job = await publicClient.readContract({
                            address: ARCBOND_ADDRESS,
                            abi: ARCBOND_ABI,
                            functionName: "getJob",
                            args: [jobId],
                        });
                        newState.job = job as JobContractData;
                    } catch {
                        // Ignore missing/non-existent job IDs without collapsing global state.
                    }
                }

                // Final stale-response check before setState
                if (requestRef.current === myRequestId) {
                    setState(newState);
                }
            } catch (err) {
                // Guard against stale responses
                if (requestRef.current !== myRequestId) return;
                setError(err instanceof Error ? err.message : "Query failed");
            } finally {
                // Only clear loading if this request is still current
                if (requestRef.current === myRequestId) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        const interval = setInterval(fetchData, refreshInterval);
        return () => clearInterval(interval);
    }, [bondId, jobId, refreshInterval]);

    return { state, loading, error };
}
