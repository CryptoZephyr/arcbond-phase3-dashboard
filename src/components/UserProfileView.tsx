"use client";

import { useState, useEffect } from "react";
import { User, ShieldCheck, Activity } from "lucide-react";

interface UserProfileViewProps {
    userAddress: string;
}

interface ProfileStats {
    profileAgeDays: number;
    activeAgentsCount: number;
    totalVolume: string;
}

export function UserProfileView({ userAddress }: UserProfileViewProps) {
    const [stats, setStats] = useState<ProfileStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userAddress) {
            setStats(null);
            setLoading(false);
            return;
        }

        // Changed endpoint from /api/user/stats to consolidated /api/user?type=stats
        const fetchProfileStats = async () => {
            try {
                const response = await fetch(`/api/user?userId=${userAddress}&type=stats`);
                const data = await response.json();
                if (response.ok && data.success) {
                    setStats(data.stats);
                }
            } catch (error) {
                console.error("Profile statistics fetch failed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileStats();

        const interval = setInterval(fetchProfileStats, 10000);
        return () => clearInterval(interval);
    }, [userAddress]);

    if (!userAddress) {
        return (
            <section className="surface-panel">
                <p className="text-sm font-semibold text-slate-500">Please connect your MetaMask wallet to view your profile.</p>
            </section>
        );
    }

    return (
        <section className="surface-panel">
            <div className="mb-6">
                <p className="eyebrow mb-2">Profile</p>
                <h2 className="page-title">User Profile</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">On-chain registration and account statistics</p>
            </div>

            {loading && !stats ? (
                <p className="text-sm font-semibold text-slate-500">Querying profile records...</p>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                    <div className="wallet-card flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center bg-slate-950 text-white" style={{ borderRadius: 8 }}>
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="eyebrow">Account Age</p>
                            <p className="mt-0.5 text-2xl font-extrabold text-slate-950">
                                {stats?.profileAgeDays} <span className="text-xs font-semibold text-slate-500">Days</span>
                            </p>
                        </div>
                    </div>

                    <div className="wallet-card flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center bg-teal-500 text-white" style={{ borderRadius: 8 }}>
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="eyebrow">Bound Agents</p>
                            <p className="mt-0.5 text-2xl font-extrabold text-slate-950">
                                {stats?.activeAgentsCount} <span className="text-xs font-semibold text-slate-500">Active</span>
                            </p>
                        </div>
                    </div>

                    <div className="wallet-card flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center bg-lime-300 text-slate-950" style={{ borderRadius: 8 }}>
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="eyebrow">Total Volume</p>
                            <p className="mt-0.5 text-2xl font-extrabold text-slate-950">
                                {stats?.totalVolume} <span className="text-xs font-semibold text-slate-500">USDC</span>
                            </p>
                        </div>
                    </div>

                </div>
            )}
        </section>
    );
}
