"use client";

import { RefreshCw } from "lucide-react";

interface PrimaryBalanceProps {
    amount: string;
    loading: boolean;
    error: string | null;
    lastUpdate?: number;
    onRefresh?: () => void;
}

export function PrimaryBalance({
    amount,
    loading,
    error,
    lastUpdate,
    onRefresh,
}: PrimaryBalanceProps) {
    const getTimeAgo = (timestamp?: number) => {
        if (!timestamp) return "unknown";
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 5) return "now";
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    return (
        <div className="surface-panel">
            <div className="flex items-end justify-between">
                <div>
                    <p className="eyebrow mb-2">Your Arc Balance</p>
                    {loading ? (
                        <div className="mb-2">
                            <div className="inline-block h-10 w-32 animate-pulse rounded bg-slate-200" />
                        </div>
                    ) : error ? (
                        <div className="text-sm font-semibold text-red-600">
                            Failed to load balance
                        </div>
                    ) : (
                        <h2 className="text-4xl font-extrabold text-slate-950">
                            ${amount}{" "}
                            <span className="text-lg font-semibold text-slate-400">USDC</span>
                        </h2>
                    )}
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        {loading ? (
                            "Updating..."
                        ) : error ? (
                            <span className="text-red-600">{error}</span>
                        ) : (
                            <>
                                ✓ Synced {getTimeAgo(lastUpdate)}
                            </>
                        )}
                    </p>
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
