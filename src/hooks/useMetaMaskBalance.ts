// src/hooks/useMetaMaskBalance.ts
// Hook to query and poll the connected MetaMask wallet's native USDC balance

import { useEffect, useState, useRef } from "react";
import { publicClient } from "@/lib/viem-client";
import { BALANCE_POLL_INTERVAL_MS, formatUsdcFromBigInt } from "@/lib/constants";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const ARC_USDC_DECIMALS = 18;

export function useMetaMaskBalance(walletAddress: string, refreshInterval = BALANCE_POLL_INTERVAL_MS) {
    const [balance, setBalance] = useState<string>("0.00");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
    const requestRef = useRef(0);
    const isFirstLoadRef = useRef(true);

    useEffect(() => {
        if (!walletAddress) {
            setBalance("0.00");
            setError(null);
            setLoading(false);
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
                const balanceRaw = await publicClient.readContract({
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

                // Guard against stale responses
                if (requestRef.current !== myRequestId) return;

                const formattedBalance = formatUsdcFromBigInt(balanceRaw as bigint, ARC_USDC_DECIMALS);
                setBalance(formattedBalance);
                setLastUpdate(Date.now());
            } catch (error) {
                // Guard against stale responses
                if (requestRef.current !== myRequestId) return;

                const errorMsg = error instanceof Error ? error.message : "Failed to fetch balance";
                console.error("MetaMask balance fetch failed:", error);
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

    return { balance, loading, error, lastUpdated: new Date(lastUpdate) };
}