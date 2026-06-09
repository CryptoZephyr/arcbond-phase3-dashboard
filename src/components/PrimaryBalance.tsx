"use client";

import { RefreshCw } from "lucide-react";

interface PrimaryBalanceProps {
    // ArcBond protocol ledger balance — usable for bonds/jobs
    protocolAmount: string;
    // Raw on-chain wallet USDC balance
    walletAmount: string;
    loading: boolean;
    error: string | null;
    walletLoading?: boolean;
    walletError?: string | null;
    onRefresh?: () => void;
}

export function PrimaryBalance({
    protocolAmount,
    walletAmount,
    loading,
    error,
    walletLoading,
    walletError,
    onRefresh,
}: PrimaryBalanceProps) {
    return (
        <div className="surface-panel">
            <div className="flex items-end justify-between">
                <div>
                    <p className="eyebrow mb-2">Protocol Balance</p>
                    {loading ? (
                        <div className="mb-2">
                            <div className="inline-block h-10 w-32 animate-pulse rounded bg-slate-200" />
                        </div>
                    ) : error ? (
                        <div className="text-sm font-semibold text-red-600">Failed to load balance</div>
                    ) : (
                        <h2 className="text-4xl font-extrabold text-slate-950">
                            ${protocolAmount}{" "}
                            <span className="text-lg font-semibold text-slate-400">USDC</span>
                        </h2>
                    )}
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        Usable for bonds &amp; jobs (ArcBond ledger)
                    </p>

                    <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="eyebrow mb-1">Wallet Balance</p>
                        {walletLoading ? (
                            <div className="inline-block h-5 w-24 animate-pulse rounded bg-slate-200" />
                        ) : walletError ? (
                            <span className="text-sm font-semibold text-red-600">Failed to load</span>
                        ) : (
                            <p className="text-lg font-bold text-slate-700">
                                ${walletAmount}{" "}
                                <span className="text-xs font-semibold text-slate-400">USDC</span>
                            </p>
                        )}
                        <p className="mt-0.5 text-xs font-medium text-slate-500">Raw on-chain USDC</p>
                    </div>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-2 transition hover:bg-slate-100 disabled:opacity-50"
                        title="Refresh balance"
                    >
                        <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
                    </button>
                )}
            </div>
        </div>
    );
}
