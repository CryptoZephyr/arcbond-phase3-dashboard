// src/hooks/useMultiChainBalances.ts
// Polls user USDC balances dynamically across Arc L1, Base Sepolia, and Arbitrum Sepolia

import { useEffect, useState, useRef } from "react";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { baseSepolia, arbitrumSepolia } from "viem/chains";
import { BALANCE_POLL_INTERVAL_MS, formatUsdcFromBigInt } from "@/lib/constants";

const ARC_USDC = "0x3600000000000000000000000000000000000000";
const BASE_SEPOLIA_USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
const ARBITRUM_SEPOLIA_USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

const ARC_DECIMALS = 18;
const BASE_DECIMALS = 6;
const ARB_DECIMALS = 6;

const arcClient = createPublicClient({ chain: arcTestnet, transport: http() });
const baseClient = createPublicClient({ chain: baseSepolia, transport: http() });
const arbClient = createPublicClient({ chain: arbitrumSepolia, transport: http() });

const ERC20_ABI = [
    {
        type: "function",
        name: "balanceOf",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
] as const;

export function useMultiChainBalances(walletAddress: string, refreshInterval = BALANCE_POLL_INTERVAL_MS) {
    const [balances, setBalances] = useState({ arc: "0.00", base: "0.00", arb: "0.00" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestRef = useRef(0);
    const isFirstLoadRef = useRef(true);

    useEffect(() => {
        if (!walletAddress) {
            setBalances({ arc: "0.00", base: "0.00", arb: "0.00" });
            setLoading(false);
            setError(null);
            isFirstLoadRef.current = true;
            return;
        }

        const fetchBalances = async () => {
            const myRequestId = ++requestRef.current;
            // Only show loading spinner on first load to avoid flicker
            if (isFirstLoadRef.current) {
                setLoading(true);
                isFirstLoadRef.current = false;
            }

            try {
                setError(null);
                const [rawArc, rawBase, rawArb] = await Promise.all([
                    arcClient.readContract({
                        address: ARC_USDC,
                        abi: ERC20_ABI,
                        functionName: "balanceOf",
                        args: [walletAddress as `0x${string}`],
                    }),
                    baseClient.readContract({
                        address: BASE_SEPOLIA_USDC,
                        abi: ERC20_ABI,
                        functionName: "balanceOf",
                        args: [walletAddress as `0x${string}`],
                    }),
                    arbClient.readContract({
                        address: ARBITRUM_SEPOLIA_USDC,
                        abi: ERC20_ABI,
                        functionName: "balanceOf",
                        args: [walletAddress as `0x${string}`],
                    }),
                ]);

                // Guard against stale responses
                if (requestRef.current !== myRequestId) return;

                const arcUsdc = formatUsdcFromBigInt(rawArc as bigint, ARC_DECIMALS);
                const baseUsdc = formatUsdcFromBigInt(rawBase as bigint, BASE_DECIMALS);
                const arbUsdc = formatUsdcFromBigInt(rawArb as bigint, ARB_DECIMALS);

                setBalances({ arc: arcUsdc, base: baseUsdc, arb: arbUsdc });
            } catch (error) {
                // Guard against stale responses
                if (requestRef.current !== myRequestId) return;

                const errorMsg = error instanceof Error ? error.message : "Failed to fetch balances";
                console.error("Multi-chain balance fetch failed:", error);
                setError(errorMsg);
                // Keep last-known balances instead of zeroing on transient error
            } finally {
                // Only clear loading on first load; subsequent polls don't show spinner
                if (myRequestId === requestRef.current) {
                    setLoading(false);
                }
            }
        };

        fetchBalances();

        const interval = setInterval(fetchBalances, refreshInterval);
        return () => clearInterval(interval);
    }, [walletAddress, refreshInterval]);

    return { balances, loading, error };
}