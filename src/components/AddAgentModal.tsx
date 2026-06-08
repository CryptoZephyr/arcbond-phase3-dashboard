// src/components/AddAgentModal.tsx
// Frontend form to execute on-chain agent binding with high-contrast success view and unified ABI imports

"use client";

import { useState, useEffect } from "react";
import { createWalletClient, custom, createPublicClient, http } from "viem";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { arcTestnet } from "@/lib/arc-chain";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { IDENTITY_ABI } from "@/lib/identity-abi"; // Imported to resolve duplicate ABI declarations
import { ARCBOND_ADDRESS, IDENTITY_REGISTRY } from "@/lib/constants";
import { Sparkles } from "lucide-react";

interface AddAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    userAddress: string;
    onSuccess: () => void;
}

export function AddAgentModal({ isOpen, onClose, userAddress, onSuccess }: AddAgentModalProps) {
    const [creationMode, setCreationMode] = useState<"MINT" | "EXISTING">("MINT");
    const [agentId, setAgentId] = useState("");
    const [agentName, setAgentName] = useState("");
    const [agentDesc, setAgentDesc] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mintedIdResult, setMintedIdResult] = useState<string | null>(null);
    const [txHashResult, setTxHashResult] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setAgentId("");
            setAgentName("");
            setAgentDesc("");
            setError(null);
            setLoading(false);
            setMintedIdResult(null);
            setTxHashResult(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
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

            let finalAgentId = agentId;

            if (creationMode === "MINT") {
                console.log("[Arc L1] Minting new ERC-8004 Agent ID on global registry...");

                const testMetadataUri = "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei";

                const mintTxHash = await walletClient.writeContract({
                    address: IDENTITY_REGISTRY,
                    abi: IDENTITY_ABI, // Safely points to your unified identity-abi.ts file
                    functionName: "register",
                    args: [testMetadataUri],
                    account: userAddress as `0x${string}`,
                });

                console.log(`[Arc L1] Mint transaction submitted: ${mintTxHash}. Waiting for finality...`);
                const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTxHash });

                const transferSignature =
                    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
                const transferLog = receipt.logs.find(
                    (log) => log.topics?.[0]?.toLowerCase() === transferSignature
                );
                if (!transferLog || !transferLog.topics[3]) {
                    throw new Error("Failed to extract minted Agent ID from transaction receipt.");
                }

                const mintedIdDecimal = BigInt(transferLog.topics[3]).toString();
                finalAgentId = mintedIdDecimal;
                console.log(`[Arc L1] Mint successful! Generated Agent ID: ${finalAgentId}`);
            }

            console.log(`[ArcBond] Binding Agent ID ${finalAgentId} to contract...`);
            const bindTxHash = await walletClient.writeContract({
                address: ARCBOND_ADDRESS,
                abi: ARCBOND_ABI,
                functionName: "bindAgentId",
                args: [BigInt(finalAgentId)],
                account: userAddress as `0x${string}`,
            });

            console.log(`[ArcBond] Binding transaction submitted: ${bindTxHash}. Waiting for finality...`);
            await publicClient.waitForTransactionReceipt({ hash: bindTxHash });
            console.log(`[ArcBond] Binding confirmed: ${bindTxHash}. Syncing database...`);

            const response = await fetchWithRetry("/api/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: userAddress,
                    agentId: finalAgentId,
                    name: agentName || `Agent #${finalAgentId}`,
                    description: agentDesc,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to sync database record.");
            }

            setMintedIdResult(finalAgentId);
            setTxHashResult(bindTxHash);
        } catch (err) {
            console.error("Agent registration workflow failed:", err);
            setError(err instanceof Error ? err.message : "Workflow execution failed.");
        } finally {
            setLoading(false);
        }
    };

    if (mintedIdResult) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md border border-slate-800 bg-slate-950 p-6 text-center shadow-2xl sm:p-8" style={{ borderRadius: 8 }}>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-teal-700/30 bg-teal-950/40" style={{ borderRadius: 8 }}>
                        <Sparkles className="h-8 w-8 text-teal-300" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white mb-2">Agent Registered!</h3>
                    <p className="text-xs text-slate-400 mb-6 font-semibold">Your on-chain ERC-8004 identity has been bound successfully</p>

                    <div className="mb-6 border border-slate-800 bg-slate-900 p-6" style={{ borderRadius: 8 }}>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Your Agent ID</p>
                        <p className="select-all font-mono text-4xl font-black text-teal-300">
                            {mintedIdResult}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2">Click or double-tap to select and copy</p>
                    </div>

                    {txHashResult && (
                        <div className="text-xs text-slate-400 mb-6">
                            <span>Transaction Hash: </span>
                            <a
                                href={`https://testnet.arcscan.app/tx/${txHashResult}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 block font-mono text-teal-300 hover:underline"
                            >
                                {txHashResult.slice(0, 16)}...{txHashResult.slice(-8)}
                            </a>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setMintedIdResult(null);
                            setTxHashResult(null);
                            onSuccess();
                            onClose();
                        }}
                        className="w-full bg-teal-500 py-4 text-sm font-bold text-white transition hover:bg-teal-600"
                        style={{ borderRadius: 8 }}
                    >
                        Got it, Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md border border-slate-800 bg-slate-950 p-6 shadow-2xl sm:p-8" style={{ borderRadius: 8 }}>
                <h3 className="text-xl font-extrabold text-white mb-2">Register & Bind Agent</h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">Provision a secure ERC-8004 identity on Arc L1</p>

                <div className="mb-6 grid grid-cols-2 gap-2 border border-slate-800 bg-slate-900 p-1.5" style={{ borderRadius: 8 }}>
                    <button
                        type="button"
                        onClick={() => {
                            setCreationMode("MINT");
                            setError(null);
                        }}
                        className={`px-3 py-2 text-xs font-bold transition ${creationMode === "MINT" ? "bg-teal-500 text-white" : "text-slate-400 hover:text-white"}`}
                        style={{ borderRadius: 6 }}
                    >
                        Mint New ID
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCreationMode("EXISTING");
                            setError(null);
                        }}
                        className={`px-3 py-2 text-xs font-bold transition ${creationMode === "EXISTING" ? "bg-teal-500 text-white" : "text-slate-400 hover:text-white"}`}
                        style={{ borderRadius: 6 }}
                    >
                        Bind Existing ID
                    </button>
                </div>

                <form onSubmit={handleAction} className="space-y-4">
                    {creationMode === "EXISTING" && (
                        <div>
                            <label className="eyebrow mb-2 block text-slate-400">ERC-8004 Agent ID</label>
                            <input
                                type="number"
                                placeholder="e.g. 16425"
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value)}
                                disabled={loading}
                                className="w-full border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-teal-400"
                                style={{ borderRadius: 8 }}
                            />
                        </div>
                    )}

                    <div>
                        <label className="eyebrow mb-2 block text-slate-400">Friendly Agent Name</label>
                        <input
                            type="text"
                            placeholder="e.g. My Arbitrage Agent"
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            disabled={loading}
                            className="w-full border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-teal-400"
                            style={{ borderRadius: 8 }}
                        />
                    </div>

                    <div>
                        <label className="eyebrow mb-2 block text-slate-400">Description</label>
                        <textarea
                            placeholder="Describe your agent parameters..."
                            value={agentDesc}
                            onChange={(e) => setAgentDesc(e.target.value)}
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
                            disabled={loading || (creationMode === "EXISTING" && !agentId)}
                            className="flex-1 bg-teal-500 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50"
                            style={{ borderRadius: 8 }}
                        >
                            {loading ? "Processing..." : creationMode === "MINT" ? "Mint & Bind" : "Bind Agent"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
