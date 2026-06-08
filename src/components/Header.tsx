"use client";

import { CircleCheck, Zap } from "lucide-react";

interface HeaderProps {
    userAddress?: string;
    networkStatus?: "syncing" | "synced" | "error";
    wsConnected?: boolean;
    onConnect?: () => void;
}

export function Header({ userAddress, networkStatus = "synced", wsConnected = false, onConnect }: HeaderProps) {
    const statusColor =
        networkStatus === "synced"
            ? "bg-emerald-500"
            : networkStatus === "syncing"
                ? "bg-amber-500"
                : "bg-red-500";

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                {/* LOGO */}
                <div className="flex items-center gap-3">
                    <div className="logo-mark">
                        <span className="relative z-10 font-mono text-sm font-bold">A</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-extrabold text-slate-950">ArcBond</h1>
                        <p className="text-xs font-semibold text-slate-500">
                            Agent settlement layer
                        </p>
                    </div>
                </div>

                {/* STATUS & CONNECTION INFO */}
                <div className="flex items-center gap-4">
                    {/* Network Status */}
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className={`h-2 w-2 rounded-full ${statusColor} shadow-sm`} />
                        <span className="text-xs font-semibold text-slate-700">
                            {networkStatus === "synced"
                                ? "Arc Testnet"
                                : networkStatus === "syncing"
                                    ? "Syncing..."
                                    : "Wrong Network"}
                        </span>
                    </div>

                    {/* WebSocket Connection Indicator */}
                    <div
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        title={wsConnected ? "Live events: connected" : "Live events: disconnected"}
                    >
                        <div className={`h-2 w-2 rounded-full shadow-sm transition-colors duration-300 ${wsConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
                        <span className={`text-xs font-semibold ${wsConnected ? "text-emerald-700" : "text-slate-500"}`}>
                            WS
                        </span>
                    </div>

                    {/* Wallet Connection */}
                    {userAddress ? (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <CircleCheck className="h-4 w-4 text-emerald-600" />
                            <span className="font-mono text-xs font-semibold text-slate-700">
                                {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="text-xs font-semibold text-slate-500">Wallet not connected</div>
                            <button
                                onClick={onConnect}
                                className="btn-primary text-xs px-3 py-2"
                                aria-label="Connect Wallet"
                            >
                                Connect
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
