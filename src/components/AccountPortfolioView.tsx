// src/components/AccountPortfolioView.tsx
// Displays live multi-chain USDC balances and integrates the CCTP Outbound Bridge withdrawal modal

"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useMultiChainBalances } from "@/hooks/useMultiChainBalances";
import { BridgeOutModal } from "./BridgeOutModal";

interface AccountPortfolioViewProps {
    userAddress: string;
}

// Reusable skeleton bar for balance loading states
function BalanceSkeleton() {
    return <span className="inline-block h-7 w-28 animate-pulse rounded bg-slate-200 align-middle" />;
}

export function AccountPortfolioView({ userAddress }: AccountPortfolioViewProps) {
    const [isBridgeOutOpen, setIsBridgeOutOpen] = useState(false);

    const { balances, loading, error } = useMultiChainBalances(userAddress, 3000);

    if (!userAddress) {
        return (
            <section className="surface-panel">
                <p className="text-sm font-semibold text-slate-500">Please connect your MetaMask wallet to view your portfolio balances.</p>
            </section>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <section className="surface-panel">
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="eyebrow mb-2">Portfolio</p>
                        <h2 className="page-title">Account Portfolio</h2>
                        <p className="mt-2 text-sm font-medium text-slate-500">Cross-chain balances tracked natively using Circle App Kit</p>
                    </div>
                    <button
                        onClick={() => setIsBridgeOutOpen(true)}
                        className="btn-ink w-fit"
                    >
                        <ArrowUpRight className="w-4 h-4" /> Withdraw (Bridge Out)
                    </button>
                </div>

                {error && (
                    <div className="mb-4 border border-red-300 bg-red-50 p-4 text-sm text-red-800" style={{ borderRadius: 8 }}>
                        <strong>Error fetching balances:</strong> {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                    <div className="wallet-card flex h-36 flex-col justify-between bg-gradient-to-br from-teal-50 to-white">
                        <span className="eyebrow text-teal-700">Arc L1 Balance</span>
                        <p className="text-2xl font-extrabold text-slate-950">
                            {loading ? <BalanceSkeleton /> : `${balances.arc} USDC`}
                        </p>
                    </div>

                    <div className="wallet-card flex h-36 flex-col justify-between">
                        <span className="eyebrow">Base Sepolia Balance</span>
                        <p className="text-2xl font-extrabold text-slate-950">
                            {loading ? <BalanceSkeleton /> : `${balances.base} USDC`}
                        </p>
                    </div>

                    <div className="wallet-card flex h-36 flex-col justify-between">
                        <span className="eyebrow">Arbitrum Sepolia Balance</span>
                        <p className="text-2xl font-extrabold text-slate-950">
                            {loading ? <BalanceSkeleton /> : `${balances.arb} USDC`}
                        </p>
                    </div>

                </div>
            </section>

            <BridgeOutModal
                isOpen={isBridgeOutOpen}
                onClose={() => setIsBridgeOutOpen(false)}
                userAddress={userAddress}
                currentArcBalance={balances.arc}
            />
        </div>
    );
}
