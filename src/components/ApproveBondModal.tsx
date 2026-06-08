// src/components/ApproveBondModal.tsx
"use client";

import { useState } from "react";
import { createWalletClient, custom } from "viem";
import { ARCBOND_ADDRESS } from "@/lib/constants";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { arcTestnet } from "@/lib/arc-chain";

export function ApproveBondModal({
  bondId,
  collateral,
  counterparty,
  userAddress,
  onClose,
}: {
  bondId: bigint;
  collateral: string;
  counterparty: string;
  userAddress: string | undefined;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setError(null);
    if (!userAddress) return setError("Connect wallet first.");
    setLoading(true);
    try {
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom((window as any).ethereum),
      });

      const txHash = await walletClient.writeContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: "approveBond",
        args: [bondId],
        account: userAddress as `0x${string}`,
      });

      await fetch("/api/bonds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, bondId: bondId.toString() }),
      });

      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="surface-panel-dark p-6 w-96">
        <h2 className="text-lg font-bold mb-4 text-white">Approve Bond</h2>

        {error && <p className="text-red-400 mb-2">{error}</p>}

        <p className="text-sm text-slate-300 mb-2">
          Counterparty: <span className="font-mono">{counterparty.slice(0, 10)}...{counterparty.slice(-8)}</span>
        </p>
        <p className="text-sm text-slate-300 mb-2">
          Collateral: <strong>{collateral} USDC</strong>
        </p>

        <div className="flex justify-end space-x-2 mt-4">
          <button
            className="px-4 py-2 bg-slate-600 text-white rounded disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-teal-500 text-slate-950 rounded disabled:opacity-50"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? "Approving…" : "Approve Bond"}
          </button>
        </div>
      </div>
    </div>
  );
}
