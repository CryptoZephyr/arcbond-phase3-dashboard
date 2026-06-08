// src/components/JobsMarketplace.tsx
// Dynamic table displaying active job escrows with context-aware, on-chain transaction buttons.
// Phase 2: replaced dummyReason with real evaluator input hashed to bytes32.
// Phase 2: all post-chain DB writes wrapped in fetchWithRetry.

"use client";

import { useState } from "react";
import { createWalletClient, custom } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { ARCBOND_ADDRESS, ARC_EXPLORER } from "@/lib/constants";
import { fetchWithRetry } from "@/lib/fetch-retry";

interface EscrowJob {
    id: string;
    clientAddress: string;
    providerAddress: string;
    evaluatorAddress: string;
    description: string;
    budget: string;
    status: string;
    expiredAt: number;
    txHash: string;
    createdAt: number;
}

interface JobsMarketplaceProps {
    jobs: EscrowJob[];
    userAddress: string;
    onSuccess: () => void;
    maxOnChainJobId?: bigint;
}

export function JobsMarketplace({ jobs, userAddress, onSuccess, maxOnChainJobId }: JobsMarketplaceProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deliverableInput, setDeliverableInput] = useState<Record<string, string>>({});
    // Phase 2: evaluator justification input — one entry per job ID
    const [reasonInput, setReasonInput] = useState<Record<string, string>>({});

    const hashString = async (input: string): Promise<`0x${string}`> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(input || "no reason provided");
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return ("0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
    };

    const handleAction = async (job: EscrowJob, actionType: "FUND" | "SUBMIT" | "COMPLETE" | "REJECT") => {
        const jobId = job.id;
        setActionLoading(jobId);
        try {
            if (!isExistingOnChainJob(jobId)) {
                throw new Error("This job record is not linked to an existing on-chain job.");
            }

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

            let txHash = "";
            let nextStatus = "";

            if (actionType === "FUND") {
                console.log(`[ArcBond] Funding Job Escrow #${jobId}...`);
                txHash = await walletClient.writeContract({
                    address: ARCBOND_ADDRESS,
                    abi: ARCBOND_ABI,
                    functionName: "approveJob",
                    args: [BigInt(jobId)],
                    account: userAddress as `0x${string}`,
                });
                nextStatus = "FUNDED";

            } else if (actionType === "SUBMIT") {
                const rawDeliverable = deliverableInput[jobId] || "Default Deliverable Payload";
                const deliverableHash = await hashString(rawDeliverable);

                console.log(`[ArcBond] Submitting deliverable hash ${deliverableHash} for Job #${jobId}...`);
                txHash = await walletClient.writeContract({
                    address: ARCBOND_ADDRESS,
                    abi: ARCBOND_ABI,
                    functionName: "submitDeliverable",
                    args: [BigInt(jobId), deliverableHash],
                    account: userAddress as `0x${string}`,
                });
                nextStatus = "SUBMITTED";

            } else if (actionType === "COMPLETE") {
                // Phase 2: real evaluator justification hashed to bytes32
                const rawReason = reasonInput[jobId]?.trim();
                if (!rawReason) {
                    alert("Please enter a justification reason before settling.");
                    setActionLoading(null);
                    return;
                }
                const reasonHash = await hashString(rawReason);
                console.log(`[ArcBond] Settling Job #${jobId} with reason hash ${reasonHash}...`);
                txHash = await walletClient.writeContract({
                    address: ARCBOND_ADDRESS,
                    abi: ARCBOND_ABI,
                    functionName: "completeJob",
                    args: [BigInt(jobId), reasonHash],
                    account: userAddress as `0x${string}`,
                });
                nextStatus = "COMPLETED";

            } else if (actionType === "REJECT") {
                // Phase 2: real evaluator justification hashed to bytes32
                const rawReason = reasonInput[jobId]?.trim();
                if (!rawReason) {
                    alert("Please enter a justification reason before rejecting.");
                    setActionLoading(null);
                    return;
                }
                const reasonHash = await hashString(rawReason);
                console.log(`[ArcBond] Rejecting Job #${jobId} with reason hash ${reasonHash}...`);
                txHash = await walletClient.writeContract({
                    address: ARCBOND_ADDRESS,
                    abi: ARCBOND_ABI,
                    functionName: "rejectJob",
                    args: [BigInt(jobId), reasonHash],
                    account: userAddress as `0x${string}`,
                });
                nextStatus = "REJECTED";
            }

            console.log(`[ArcBond] On-chain operation confirmed: ${txHash}. Syncing database...`);

            // Phase 2: fetchWithRetry prevents permanent on-chain/SQLite desync
            const response = await fetchWithRetry("/api/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: jobId,
                    clientAddress: job.clientAddress,
                    providerAddress: job.providerAddress,
                    evaluatorAddress: job.evaluatorAddress,
                    description: job.description,
                    budget: job.budget,
                    status: nextStatus,
                    expiredAt: job.expiredAt,
                    txHash,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update database status.");
            }

            onSuccess();
        } catch (err) {
            console.error("On-chain action execution failed:", err);
            alert(err instanceof Error ? err.message : "Action failed.");
        } finally {
            setActionLoading(null);
        }
    };

    const isUserRole = (address: string) =>
        userAddress && address.toLowerCase() === userAddress.toLowerCase();

    const isExistingOnChainJob = (jobId: string) => {
        if (maxOnChainJobId === undefined) return true;
        try {
            const parsedJobId = BigInt(jobId);
            return parsedJobId > BigInt(0) && parsedJobId <= maxOnChainJobId;
        } catch {
            return false;
        }
    };

    return (
        <div className="surface-panel overflow-x-auto">
            {jobs.length === 0 ? (
                <p className="empty-state">No active job escrows found.</p>
            ) : (
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="eyebrow py-4">Job ID</th>
                            <th className="eyebrow py-4">Description</th>
                            <th className="eyebrow py-4">Client</th>
                            <th className="eyebrow py-4">Provider</th>
                            <th className="eyebrow py-4">Budget</th>
                            <th className="eyebrow py-4">Expires</th>
                            <th className="eyebrow py-4">Status</th>
                            <th className="eyebrow py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((job) => {
                            const isClient = isUserRole(job.clientAddress);
                            const isProvider = isUserRole(job.providerAddress);
                            const isEvaluator = isUserRole(job.evaluatorAddress);
                            const isPending = actionLoading === job.id;
                            const isOnChainJob = isExistingOnChainJob(job.id);

                            return (
                                <tr key={job.id} className="border-b border-slate-100 transition hover:bg-teal-50/40">
                                    <td className="py-4 font-mono text-xs font-bold text-slate-950">#{job.id.slice(0, 6)}</td>
                                    <td className="py-4 text-slate-800">
                                        <div>
                                            <p className="max-w-xs truncate font-bold">{job.description}</p>
                                            {job.status === "FUNDED" && isProvider && (
                                                <input
                                                    type="text"
                                                    placeholder="Input work delivery text..."
                                                    value={deliverableInput[job.id] || ""}
                                                    onChange={(e) => setDeliverableInput({ ...deliverableInput, [job.id]: e.target.value })}
                                                    className="form-field mt-2 block w-56 py-2 text-xs"
                                                />
                                            )}
                                            {/* Phase 2: evaluator reason input — required before settle/reject */}

                                            {/* Raise Dispute button – available to client or provider before job is settled */}
                                            {(job.status === "FUNDED" || job.status === "OPEN") && (isClient || isProvider) && (
                                                <button
                                                    onClick={() => {
                                                        const fee = (parseFloat(job.budget) * 0.005).toFixed(2);
                                                        if (confirm(`Raising a dispute will charge a fee of ${fee} USDC. Proceed?`)) {
                                                            console.log(`Dispute raised for job ${job.id}, fee ${fee}`);
                                                            // Placeholder: you could call an on-chain dispute function here.
                                                        }
                                                    }}
                                                    disabled={isPending}
                                                    className="btn-primary px-3 py-2 text-[10px] uppercase"
                                                >
                                                    Raise Dispute
                                                </button>
                                            )}

                                                // ---- New: Raise Dispute UI ----
                                                // Dispute can be raised by either client or provider before job is completed.
                                                // The UI shows a warning about a dispute fee (e.g., 0.5% of budget).
                                                // No on‑chain call is wired yet – this is a placeholder for future integration.
                                            {job.status === "SUBMITTED" && isEvaluator && (
                                                <input
                                                    type="text"
                                                    placeholder="Justification reason (required)..."
                                                    value={reasonInput[job.id] || ""}
                                                    onChange={(e) => setReasonInput({ ...reasonInput, [job.id]: e.target.value })}
                                                    className="form-field mt-2 block w-56 py-2 text-xs"
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 font-mono text-xs text-slate-500">{job.clientAddress.slice(0, 6)}...{job.clientAddress.slice(-4)}</td>
                                    <td className="py-4 font-mono text-xs text-slate-500">{job.providerAddress.slice(0, 6)}...{job.providerAddress.slice(-4)}</td>
                                    <td className="py-4 font-bold text-slate-950">{parseFloat(job.budget).toFixed(2)} USDC</td>
                                    <td className="py-4">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${job.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                                            job.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                                job.status === "OPEN" ? "bg-lime-100 text-lime-800" :
                                                    "bg-cyan-100 text-cyan-800"
                                            }`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {job.status === "OPEN" && isClient && (
                                                <button
                                                    onClick={() => handleAction(job, "FUND")}
                                                    disabled={isPending || !isOnChainJob}
                                                    className="btn-primary px-3 py-2 text-[10px] uppercase"
                                                >
                                                    {isPending ? "Funding..." : "Fund & Approve"}
                                                </button>
                                            )}
                                            {job.status === "FUNDED" && isProvider && (
                                                <button
                                                    onClick={() => handleAction(job, "SUBMIT")}
                                                    disabled={isPending || !isOnChainJob}
                                                    className="btn-primary px-3 py-2 text-[10px] uppercase"
                                                >
                                                    {isPending ? "Submitting..." : "Submit Deliverable"}
                                                </button>
                                            )}
                                            {job.status === "SUBMITTED" && isEvaluator && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(job, "COMPLETE")}
                                                        disabled={isPending || !isOnChainJob || !reasonInput[job.id]?.trim()}
                                                        className="btn-primary px-3 py-2 text-[10px] uppercase"
                                                    >
                                                        Settle
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(job, "REJECT")}
                                                        disabled={isPending || !isOnChainJob || !reasonInput[job.id]?.trim()}
                                                        className="inline-flex items-center justify-center bg-red-500 px-3 py-2 text-[10px] font-black uppercase text-white transition hover:bg-red-600 disabled:pointer-events-none disabled:opacity-50"
                                                        style={{ borderRadius: 8 }}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <a
                                                href={`${ARC_EXPLORER}/tx/${job.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="self-center px-2 text-xs font-bold text-teal-600 hover:underline"
                                            >
                                                Tx
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
