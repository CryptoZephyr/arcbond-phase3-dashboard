// src/components/BondTimeline.tsx
// Visualizes the on-chain lifecycle and splits of active agent collateral bonds

import { formatEther } from "viem";
import { BOND_STATUS_LABELS, BondStatus, ARC_EXPLORER, ARCBOND_ADDRESS, ARBITRATOR_ROLE } from "@/lib/constants";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { createWalletClient, custom } from "viem";
import { useState, useEffect } from "react";
import { publicClient } from "@/lib/viem-client";
import { arcTestnet } from "@/lib/arc-chain";

interface BondTimelineProps {
    bond: {
        initiatorAgentId: bigint;
        counterpartyAgentId: bigint;
        initiator: string;
        counterparty: string;
        collateral: bigint;
        initiatorSplit: number;
        counterpartySplit: number;
        status: number;
        createdAt: bigint;
    } | null;
    bondId: bigint | null;
    txHash?: string;
    userAddress?: string;
}

export function BondTimeline({ bond, bondId, txHash, userAddress }: BondTimelineProps) {
    const [isArbitrator, setIsArbitrator] = useState(false);

    useEffect(() => {
        async function checkRole() {
            if (!userAddress) {
                setIsArbitrator(false);
                return;
            }
            try {
                const hasArbitrator = await publicClient.readContract({
                    address: ARCBOND_ADDRESS,
                    abi: ARCBOND_ABI,
                    // Note: ARBITRATOR_ROLE is already keccak256 hashed in constants
                    args: [ARBITRATOR_ROLE, userAddress as `0x${string}`],
                    functionName: "hasRole",
                });
                setIsArbitrator(!!hasArbitrator);
            } catch (err) {
                console.error("Error checking arbitrator role:", err);
                setIsArbitrator(false);
            }
        }
        checkRole();
    }, [userAddress]);
    if (!bond || !bondId) {
        return (
            <div className="surface-panel-dark">
                <h3 className="mb-4 text-lg font-extrabold text-white">Bond Lifecycle</h3>
                <p className="text-sm font-semibold text-slate-400">No bond data available</p>
            </div>
        );
    }

    const status = bond.status as BondStatus;
    const statusLabel = BOND_STATUS_LABELS[status] || "Unknown";
    const explorerUrl = txHash ? `${ARC_EXPLORER}/tx/${txHash}` : null;

    const states = [
        { label: "Pending", value: BondStatus.Pending },
        { label: "Active", value: BondStatus.Active },
        { label: "Released", value: BondStatus.Released },
    ];

    // Convert contract basis points (BPS) out of 10,000 into clean percentages
    const initiatorPercentage = (bond.initiatorSplit / 100).toFixed(1);
    const counterpartyPercentage = (bond.counterpartySplit / 100).toFixed(1);

    return (
        <div className="surface-panel-dark">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-extrabold text-white">Bond {bondId.toString()}</h3>
                {explorerUrl && (
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-teal-300 hover:underline">
                        Tx
                    </a>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Initiator:</span>
                    <span className="text-teal-300 font-mono font-bold">
                        {bond.initiator.slice(0, 10)}...{bond.initiator.slice(-8)}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Counterparty:</span>
                    <span className="text-teal-300 font-mono font-bold">
                        {bond.counterparty.slice(0, 10)}...{bond.counterparty.slice(-8)}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Collateral:</span>
                    <span className="text-white font-bold">{formatEther(bond.collateral)} USDC</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Split Ratio:</span>
                    <span className="text-white font-semibold">
                        {initiatorPercentage}% / {counterpartyPercentage}%
                    </span>
                </div>

                <div className="border-t border-slate-700 pt-4">
                    <p className="text-slate-400 text-xs mb-3">Status Timeline</p>
                    <div className="flex gap-2">
                        {states.map((state, idx) => (
                            <div key={idx} className="flex-1">
                                <button
                                    disabled
                                className={`w-full px-3 py-2 text-xs font-bold transition ${status >= state.value
                                        ? "bg-teal-400 text-slate-950"
                                        : "bg-slate-800 text-slate-500"
                                        }`}
                                    style={{ borderRadius: 8 }}
                                >
                                    {state.label}
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="text-teal-300 font-bold mt-3 text-center text-sm">Current Status: {statusLabel}</p>

                    {/* Action Buttons */}
                    {status === BondStatus.Pending && bond.counterparty.toLowerCase() === userAddress?.toLowerCase() && (
                      <button
                        className="mt-2 w-full bg-teal-500 text-slate-950 font-bold py-2 rounded"
                        onClick={async () => {
                          const wc = createWalletClient({
                            chain: arcTestnet,
                            transport: custom((window as any).ethereum),
                          });
                          await wc.writeContract({
                            address: ARCBOND_ADDRESS,
                            abi: ARCBOND_ABI,
                            functionName: "approveBond",
                            args: [bondId],
                            account: userAddress as `0x${string}`,
                          });
                        }}
                      >
                        Approve Bond
                      </button>
                    )}

                    {status === BondStatus.Active && (
                      <>
                        <button
                          className="mt-2 w-full bg-teal-600 text-white font-bold py-2 rounded"
                          onClick={async () => {
                            const wc = createWalletClient({
                              chain: arcTestnet,
                              transport: custom((window as any).ethereum),
                            });
                            await wc.writeContract({
                              address: ARCBOND_ADDRESS,
                              abi: ARCBOND_ABI,
                              functionName: "releaseBond",
                              args: [bondId],
                              account: userAddress as `0x${string}`,
                            });
                          }}
                        >
                          Release Bond
                        </button>
                        {isArbitrator && (
                          <div className="mt-2 flex space-x-2">
                            <button
                              className="flex-1 bg-red-600 text-white py-2 rounded"
                              onClick={async () => {
                                const wc = createWalletClient({
                                  chain: arcTestnet,
                                  transport: custom((window as any).ethereum),
                                });
                                await wc.writeContract({
                                  address: ARCBOND_ADDRESS,
                                  abi: ARCBOND_ABI,
                                  functionName: "slashBond",
                                  args: [bondId, true],
                                  account: userAddress as `0x${string}`,
                                });
                              }}
                            >
                              Slash Initiator
                            </button>
                            <button
                              className="flex-1 bg-red-600 text-white py-2 rounded"
                              onClick={async () => {
                                const wc = createWalletClient({
                                  chain: arcTestnet,
                                  transport: custom((window as any).ethereum),
                                });
                                await wc.writeContract({
                                  address: ARCBOND_ADDRESS,
                                  abi: ARCBOND_ABI,
                                  functionName: "slashBond",
                                  args: [bondId, false],
                                  account: userAddress as `0x${string}`,
                                });
                              }}
                            >
                              Slash Counterparty
                            </button>
                          </div>
                        )}
                      </>
                    )}
                </div>
            </div>
        </div>
    );
}
