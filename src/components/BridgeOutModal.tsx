// src/components/BridgeOutModal.tsx
// Outbound CCTP Bridge modal form facilitating withdrawals from Arc L1 to external chains
// Phase 3: added Circle attestation pending notice after successful bridge submission

"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, Link2 } from "lucide-react";

interface BridgeOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    userAddress: string;
    currentArcBalance: string;
}

export function BridgeOutModal({ isOpen, onClose, userAddress, currentArcBalance }: BridgeOutModalProps) {
    const [destinationChain, setDestinationChain] = useState<"BASE" | "ARBITRUM" | "ETHEREUM">("BASE");
    const [amount, setAmount] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);

    // Automatically pre-fill the recipient address with the user's connected address
    useEffect(() => {
        if (userAddress) {
            setRecipientAddress(userAddress);
        }
    }, [userAddress]);

    // Reset form state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setAmount("");
            setError(null);
            setSuccess(null);
            setBridgeTxHash(null);
            setLoading(false);
            setDestinationChain("BASE");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBridgeOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount.");
            return;
        }

        if (parseFloat(amount) > parseFloat(currentArcBalance)) {
            setError("Insufficient balance in your Arc ledger.");
            return;
        }

        if (!recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
            setError("Please enter a valid 42-character EVM recipient address.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/bridge-out", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    destinationChain,
                    amount,
                    recipientAddress,
                    sourceAddress: userAddress,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Bridge execution failed.");

            setSuccess(`Withdrawal successfully initiated! Destination: ${destinationChain}`);
            setBridgeTxHash(data.bridgeTxHash || null);
            setAmount("");
        } catch (err) {
            console.error("Outbound bridging failed:", err);
            setError(err instanceof Error ? err.message : "Outbound bridge failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md border border-slate-800 bg-slate-950 p-6 shadow-2xl sm:p-8" style={{ borderRadius: 8 }}>
                <h3 className="mb-2 text-xl font-extrabold text-white">Withdraw (Bridge Out)</h3>
                <p className="mb-6 text-xs font-medium text-slate-400">Bridge your USDC from Arc L1 directly back to Base, Arbitrum, or Ethereum</p>

                {success ? (
                    <div className="space-y-6 text-center py-4">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-teal-700/30 bg-teal-950/40" style={{ borderRadius: 8 }}>
                            <Link2 className="h-8 w-8 text-teal-300" />
                        </div>
                        <h4 className="text-lg font-bold text-white">Bridge Initiated!</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            Your CCTP burn transaction was submitted on Arc L1. Your USDC will be minted on your destination wallet on {destinationChain} in approximately 60 seconds.
                        </p>

                        {bridgeTxHash && (
                            <div className="border border-slate-800 bg-slate-900 p-4 text-left" style={{ borderRadius: 8 }}>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Arc L1 Transaction</p>
                                <a
                                    href={`https://testnet.arcscan.app/tx/${bridgeTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block break-all font-mono text-xs text-teal-300 hover:underline"
                                >
                                    {bridgeTxHash}
                                </a>
                            </div>
                        )}

                        {/* Phase 3: Circle attestation pending notice */}
                        <div className="flex items-center justify-center gap-2 border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-400" style={{ borderRadius: 8 }}>
                            <div className="w-3 h-3 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin flex-shrink-0" />
                            <span>Pending Circle attestation — USDC minting on {destinationChain} (~60s)</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setSuccess(null);
                                setBridgeTxHash(null);
                                onClose();
                            }}
                            className="w-full bg-teal-500 py-4 text-sm font-bold text-white transition hover:bg-teal-600"
                            style={{ borderRadius: 8 }}
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleBridgeOut} className="space-y-4">
                        <div>
                            <label className="eyebrow mb-2 block text-slate-400">Select Destination Chain</label>
                            <select
                                value={destinationChain}
                                onChange={(e) => setDestinationChain(e.target.value as any)}
                                disabled={loading}
                                className="w-full border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-teal-400"
                                style={{ borderRadius: 8 }}
                            >
                                <option value="BASE">Base Sepolia</option>
                                <option value="ARBITRUM">Arbitrum Sepolia</option>
                                <option value="ETHEREUM">Ethereum Sepolia</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="eyebrow text-slate-400">Amount to Withdraw (USDC)</label>
                                <button
                                    type="button"
                                    onClick={() => setAmount(currentArcBalance)}
                                    className="text-[10px] font-bold text-teal-300 hover:underline"
                                >
                                    Max: {parseFloat(currentArcBalance).toFixed(2)} USDC
                                </button>
                            </div>
                            <input
                                type="number"
                                placeholder="e.g. 5.0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={loading}
                                className="w-full border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-teal-400"
                                style={{ borderRadius: 8 }}
                            />
                        </div>

                        <div>
                            <label className="eyebrow mb-2 block text-slate-400">Recipient Address (on Destination Chain)</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                disabled={loading}
                                className="w-full border border-slate-800 bg-slate-900 px-4 py-3 font-mono text-xs font-bold text-white outline-none transition focus:border-teal-400"
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
                                disabled={loading || !amount}
                                className="flex-1 bg-teal-500 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50"
                                style={{ borderRadius: 8 }}
                            >
                                {loading ? "Processing..." : "Withdraw"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
