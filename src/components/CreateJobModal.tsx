// src/components/CreateJobModal.tsx
// Modal form to execute on-chain escrow job creation (postJob) via MetaMask and log to SQLite

"use client";

import { useState, useEffect } from "react";
import { createWalletClient, custom, parseEther, createPublicClient, http } from "viem";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { arcTestnet } from "@/lib/arc-chain";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { ARCBOND_ADDRESS } from "@/lib/constants";

interface CreateJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    userAddress: string;
    onSuccess: () => void;
}

export function CreateJobModal({ isOpen, onClose, userAddress, onSuccess }: CreateJobModalProps) {
    const [provider, setProvider] = useState("");
    const [evaluator, setEvaluator] = useState("");
    const [budget, setBudget] = useState("");
    const [durationDays, setDurationDays] = useState("7");
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setProvider("");
            setEvaluator("");
            setBudget("");
            setDurationDays("7");
            setDescription("");
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!provider || !evaluator || !budget || !description) {
            setError("Please fill out all required fields.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (typeof window === "undefined" || !(window as any).ethereum) {
                throw new Error("No browser wallet extension detected.");
            }

            const hexChainId = `0x${arcTestnet.id.toString(16)}`;

            try {
                await (window as any).ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: hexChainId }],
                });
            } catch (switchError: any) {
                if (switchError.code === 4902) {
                    await (window as any).ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [
                            {
                                chainId: hexChainId,
                                chainName: arcTestnet.name,
                                rpcUrls: arcTestnet.rpcUrls.default.http,
                                nativeCurrency: arcTestnet.nativeCurrency,
                                blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
                            },
                        ],
                    });
                } else {
                    throw new Error("Please switch your wallet network to Arc Testnet.");
                }
            }

            const walletClient = createWalletClient({
                chain: arcTestnet,
                transport: custom((window as any).ethereum),
            });
            const publicClient = createPublicClient({
                chain: arcTestnet,
                transport: http(),
            });

            const budgetWei = parseEther(budget);
            const durationSeconds = parseInt(durationDays) * 86400;
            const expiredAt = Math.floor(Date.now() / 1000) + durationSeconds;

            console.log(`[ArcBond] Posting job escrow for ${budget} USDC...`);

            const txHash = await walletClient.writeContract({
                address: ARCBOND_ADDRESS,
                abi: ARCBOND_ABI,
                functionName: "postJob",
                args: [
                    provider as `0x${string}`,
                    evaluator as `0x${string}`,
                    budgetWei,
                    BigInt(expiredAt),
                    description,
                    "0x0000000000000000000000000000000000000000",
                    BigInt(0)
                ],
                account: userAddress as `0x${string}`,
            });

            await publicClient.waitForTransactionReceipt({ hash: txHash });
            const jobCount = await publicClient.readContract({
                address: ARCBOND_ADDRESS,
                abi: ARCBOND_ABI,
                functionName: "jobCount",
            });

            console.log(`[ArcBond] Job posted: ${txHash}. Synced on-chain Job ID #${jobCount}. Syncing database...`);

            // Changed endpoint from /api/jobs to /api/user
            const response = await fetchWithRetry("/api/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: (jobCount as bigint).toString(),
                    clientAddress: userAddress,
                    providerAddress: provider,
                    evaluatorAddress: evaluator,
                    description: description,
                    budget: budget,
                    status: "OPEN",
                    expiredAt,
                    txHash,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to log job to database.");
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error("Job creation failed:", err);
            setError(err instanceof Error ? err.message : "Job creation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg border border-slate-800 bg-slate-950 p-6 shadow-2xl sm:p-8" style={{ borderRadius: 8 }}>
                <h3 className="mb-2 text-xl font-extrabold text-white">Create Escrow Job</h3>
                <p className="mb-6 text-xs font-semibold text-slate-400">Deploy a secure job escrow agreement utilizing native USDC settlement</p>

                <form onSubmit={handleCreateJob} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="eyebrow mb-2 block text-slate-400">Provider Agent Address</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                disabled={loading}
                                className="w-full border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-bold text-white outline-none transition focus:border-teal-400"
                                style={{ borderRadius: 8 }}
                            />
                        </div>
                        <div>
                            <label className="eyebrow mb-2 block text-slate-400">Evaluator Address</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={evaluator}
                                onChange={(e) => setEvaluator(e.target.value)}
                                disabled={loading}
                                className="w-full border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-bold text-white outline-none transition focus:border-teal-400"
                                style={{ borderRadius: 8 }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="eyebrow mb-2 block text-slate-400">Job Budget (USDC)</label>
                            <input
                                type="number"
                                placeholder="e.g. 10.0"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                disabled={loading}
                                className="w-full border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-teal-400"
                                style={{ borderRadius: 8 }}
                            />
                        </div>
                        <div>
                            <label className="eyebrow mb-2 block text-slate-400">Duration (Days)</label>
                            <select
                                value={durationDays}
                                onChange={(e) => setDurationDays(e.target.value)}
                                disabled={loading}
                                className="w-full border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-teal-400"
                                style={{ borderRadius: 8 }}
                            >
                                <option value="1">1 Day</option>
                                <option value="3">3 Days</option>
                                <option value="7">7 Days</option>
                                <option value="14">14 Days</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="eyebrow mb-2 block text-slate-400">Job Task Description</label>
                        <textarea
                            placeholder="Describe target prediction, trading logic, or scraping parameters"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            rows={3}
                            className="w-full resize-none border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-teal-400"
                            style={{ borderRadius: 8 }}
                        />
                    </div>

                    {error && (
                        <p className="border border-red-900/30 bg-red-950/40 p-3 text-center text-xs font-bold text-red-400" style={{ borderRadius: 8 }}>{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 bg-slate-800 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                            style={{ borderRadius: 8 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !budget}
                            className="flex-1 bg-teal-500 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50"
                            style={{ borderRadius: 8 }}
                        >
                            {loading ? "Posting..." : "Post Job Escrow"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
