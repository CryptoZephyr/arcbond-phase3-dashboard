import { formatEther } from "viem";
import { useAgentData } from "@/hooks/useAgentData";
import ReputationBadge from "./ReputationBadge";

const UNBOUND_AGENT_ID = BigInt(0);

interface AgentCardProps {
    agent: {
        address: string;
        agentId?: string;
        name?: string | null;
        description?: string | null;
    };
    title?: string;
}

function CardSkeleton() {
    return <span className="inline-block h-4 w-16 animate-pulse rounded bg-slate-200 align-middle" />;
}

export function AgentCard({ agent, title }: AgentCardProps) {
    const address = agent.address || "0x0000000000000000000000000000000000000000";
    const { agentData, loading } = useAgentData(address);

    const boundId = agentData ? agentData.boundAgentId : UNBOUND_AGENT_ID;
    const isBound = boundId > UNBOUND_AGENT_ID;
    const balance = agentData ? agentData.ledgerBalance : BigInt(0);

    return (
        <div className="surface-panel">
            <h3 className="mb-4 text-lg font-extrabold text-slate-950">
                {title || agent.name || `Agent ${address.slice(0, 6)}`}
            </h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-500">Address:</span>
                    <span className="font-mono text-xs font-bold text-teal-600">
                        {address.slice(0, 10)}...{address.slice(-8)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-500">On-Chain ID (ERC-8004):</span>
                    {loading ? (
                        <CardSkeleton />
                    ) : (
                        <span className={isBound ? "font-bold text-emerald-600" : "font-bold text-red-500"}>
                            {isBound ? boundId.toString() : "Unregistered"}
                        </span>
                    )}
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-500">Ledger Balance:</span>
                    {loading ? (
                        <CardSkeleton />
                    ) : (
                        <span className="font-mono font-bold text-slate-950">
                            {formatEther(balance)} USDC
                        </span>
                    )}
                </div>
                <div className="border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-500">Reputation:</span>
                    {agentData && !loading && (
                        <ReputationBadge reputation={Number(agentData.reputation ?? 0)} />
                    )}
                </div>
            </div>
        </div>
    );
}





