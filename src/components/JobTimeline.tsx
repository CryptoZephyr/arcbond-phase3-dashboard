// src/components/JobTimeline.tsx
// Visualizes the on-chain execution lifecycle, descriptions, and escrows of active jobs

import { formatEther } from "viem";
import { JOB_STATUS_LABELS, JobStatus, ARC_EXPLORER } from "@/lib/constants";

interface JobTimelineProps {
    job: {
        id: bigint;
        client: string;
        provider: string;
        evaluator: string;
        description: string;
        budget: bigint;
        expiredAt: bigint;
        status: number;
        hook: string;
        deliverableHash: string;
        reasonHash: string;
        bondId: bigint;
    } | null;
    jobId: bigint | null;
    txHash?: string;
}

export function JobTimeline({ job, jobId, txHash }: JobTimelineProps) {
    if (!job || !jobId) {
        return (
            <div className="surface-panel-dark">
                <h3 className="mb-4 text-lg font-extrabold text-slate-950">Job Lifecycle</h3>
                <p className="text-sm font-semibold text-slate-500">No job data available</p>
            </div>
        );
    }

    const status = job.status as JobStatus;
    const statusLabel = JOB_STATUS_LABELS[status] || "Unknown";
    const explorerUrl = txHash ? `${ARC_EXPLORER}/tx/${txHash}` : null;

    const states = [
        { label: "Open", value: JobStatus.Open },
        { label: "Funded", value: JobStatus.Funded },
        { label: "Submitted", value: JobStatus.Submitted },
        { label: "Completed", value: JobStatus.Completed },
    ];

    return (
        <div className="surface-panel-dark">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-extrabold text-slate-950">Job {jobId.toString()}</h3>
                {explorerUrl && (
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-teal-600 hover:underline">
                        Tx
                    </a>
                )}
            </div>

            <div className="space-y-4 text-sm">
                <div>
                    <p className="text-slate-500 mb-1">Description</p>
                    <p className="text-slate-950">{job.description || "N/A"}</p>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Client:</span>
                    <span className="text-teal-600 font-mono font-bold">
                        {job.client.slice(0, 10)}...{job.client.slice(-8)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-400">Provider:</span>
                    <span className="text-teal-300 font-mono font-bold">
                        {job.provider.slice(0, 10)}...{job.provider.slice(-8)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-400">Budget:</span>
                    <span className="text-white font-bold">{formatEther(job.budget)} USDC</span>
                </div>

                <div className="border-t border-slate-700 pt-4">
                    <p className="text-slate-400 text-xs mb-3">Status Timeline</p>
                    <div className="grid grid-cols-2 gap-2">
                        {states.map((state, idx) => (
                            <button
                                key={idx}
                                disabled
                                className={`px-3 py-2 text-xs font-bold transition ${status >= state.value
                                    ? "bg-teal-400 text-slate-950"
                                    : "bg-slate-800 text-slate-500"
                                    }`}
                                style={{ borderRadius: 8 }}
                            >
                                {state.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-teal-300 font-bold mt-3 text-center text-sm">Current Status: {statusLabel}</p>
                </div>
            </div>
        </div>
    );
}
