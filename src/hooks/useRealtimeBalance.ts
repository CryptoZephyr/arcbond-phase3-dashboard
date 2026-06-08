// src/hooks/useRealtimeBalance.ts
// Hook to query and poll the native USDC balance of any wallet on Arc Testnet

import { useEffect, useState, useRef } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { BALANCE_POLL_INTERVAL_MS, formatUsdcFromBigInt, ARC_USDC_DECIMALS } from "@/lib/constants";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// Self-contained public client to read from Arc Testnet RPC
const localPublicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(),
});

export function useRealtimeBalance(walletAddress: string, refreshInterval = BALANCE_POLL_INTERVAL_MS) {
    const [balance, setBalance] = useState<string>("0.00");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
    const requestRef = useRef(0);
    const isFirstLoadRef = useRef(true);

    useEffect(() => {
        if (!walletAddress) {
            setBalance("0.00");
            setLoading(false);
            setError(null);
            setLastUpdate(Date.now());
            isFirstLoadRef.current = true;
            return;
        }

        const fetchBalance = async () => {
            const myRequestId = ++requestRef.current;
            // Only show loading spinner on first load to avoid flicker
            if (isFirstLoadRef.current) {
                setLoading(true);
                isFirstLoadRef.current = false;
            }

            try {
                setError(null);
                // Read balance from Arc native USDC contract
                const balanceRaw = await localPublicClient.readContract({
                    address: USDC_ADDRESS,
                    abi: [
                        {
                            type: "function",
                            name: "balanceOf",
                            inputs: [{ name: "account", type: "address" }],
                            outputs: [{ name: "", type: "uint256" }],
                            stateMutability: "view",
                        },
                    ],
                    functionName: "balanceOf",
                    args: [walletAddress as `0x${string}`],
                });

                // Guard against stale responses: only update if this is the latest request
                if (requestRef.current !== myRequestId) return;

                // Arc's native USDC uses 18-decimal representation for balances
                const formattedBalance = formatUsdcFromBigInt(balanceRaw as bigint, ARC_USDC_DECIMALS);
                setBalance(formattedBalance);
                setLastUpdate(Date.now());
            } catch (error) {
                // Guard against stale responses
                if (requestRef.current !== myRequestId) return;

                const errorMsg = error instanceof Error ? error.message : "Failed to fetch balance";
                console.error("Realtime balance query failed:", error);
                setError(errorMsg);
                // Keep last-known balance instead of zeroing on transient error
            } finally {
                // Only clear loading on first load; subsequent polls don't show spinner
                if (myRequestId === requestRef.current) {
                    setLoading(false);
                }
            }
        };

        fetchBalance();

        const interval = setInterval(fetchBalance, refreshInterval);
        return () => clearInterval(interval);
    }, [walletAddress, refreshInterval]);

    return { balance, loading, error, lastUpdate };
}
