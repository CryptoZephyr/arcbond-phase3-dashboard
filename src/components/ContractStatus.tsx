// src/components/ContractStatus.tsx
// Displays globally accumulated metrics queried directly from the Arc L1 contract state

import { formatEther } from "viem";
import { ArcBondContractState } from "@/hooks/useArcBondData";
import { ARC_EXPLORER, ARCBOND_ADDRESS } from "@/lib/constants";

interface ContractStatusProps {
    state: ArcBondContractState;
}

export function ContractStatus({ state }: ContractStatusProps) {
    const explorerUrl = `${ARC_EXPLORER}/address/${ARCBOND_ADDRESS}`;

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-panel-dark">
                <p className="eyebrow mb-2 text-slate-400">Bond Count</p>
                <p className="text-2xl font-extrabold text-white">{state.bondCount.toString()}</p>
            </div>
            <div className="surface-panel-dark">
                <p className="eyebrow mb-2 text-slate-400">Job Count</p>
                <p className="text-2xl font-extrabold text-white">{state.jobCount.toString()}</p>
            </div>
            <div className="surface-panel-dark">
                <p className="eyebrow mb-2 text-slate-400">Protocol Fees</p>
                <p className="text-2xl font-extrabold text-white">{parseFloat(formatEther(state.protocolFees)).toFixed(2)} USDC</p>
            </div>
            <div className="surface-panel-dark">
                <p className="eyebrow mb-2 text-slate-400">Status</p>
                <p className={`text-2xl font-extrabold ${state.paused ? "text-amber-300" : "text-lime-300"}`}>
                    {state.paused ? "Paused" : "Active"}
                </p>
            </div>
        </div>
    );
}
