// src/components/CreateBondModal.tsx
"use client";

import { useState, useMemo } from "react";
import { createWalletClient, custom, parseUnits } from "viem";
import { ARCBOND_ADDRESS, ARC_USDC_DECIMALS } from "@/lib/constants";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { arcTestnet } from "@/lib/arc-chain";

export function CreateBondModal({
  userAddress,
  onClose,
}: {
  userAddress: string | undefined;
  onClose: () => void;
}) {
  const [counterparty, setCounterparty] = useState("");
  const [collateral, setCollateral] = useState("");
  const [initiatorSplit, setInitiatorSplit] = useState(5000); // BPS (50%)
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const counterpartySplit = 10000 - initiatorSplit;
  const fee = useMemo(() => {
    const col = Number(collateral || "0");
    return (col * 0.01).toFixed(2);
  }, [collateral]);

  const netCollateral = useMemo(() => {
    const col = Number(collateral || "0");
    return (col - Number(fee)).toFixed(2);
  }, [collateral, fee]);

  async function handleCreate() {
    setError(null);
    if (!userAddress) return setError("Connect wallet first.");
    if (!counterparty) return setError("Counterparty address required.");
    if (!collateral || Number(collateral) <= 0)
      return setError("Collateral must be > 0.");

    setLoading(true);
    try {
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom((window as any).ethereum),
      });

      const txHash = await walletClient.writeContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: "createBond",
        args: [
          counterparty as `0x${string}`,
          parseUnits(collateral, ARC_USDC_DECIMALS),
          initiatorSplit,
        ],
        account: userAddress as `0x${string}`,
      });

      await fetch("/api/bonds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, counterparty, collateral, initiatorSplit }),
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
        <h2 className="text-lg font-bold mb-4 text-white">Create Bond</h2>

        {error && <p className="text-red-400 mb-2">{error}</p>}

        <label className="block text-sm text-slate-300 mb-1">Counterparty address</label>
        <input
          className="w-full p-2 rounded bg-slate-800 text-white mb-3"
          placeholder="0x..."
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />

        <label className="block text-sm text-slate-300 mb-1">Collateral (USDC)</label>
        <input
          type="number"
          className="w-full p-2 rounded bg-slate-800 text-white mb-3"
          placeholder="e.g. 100"
          value={collateral}
          onChange={(e) => setCollateral(e.target.value)}
        />

        <label className="block text-sm text-slate-300 mb-1">Initiator split (% of collateral)</label>
        <input
          type="range"
          min={0}
          max={10000}
          step={100}
          value={initiatorSplit}
          onChange={(e) => setInitiatorSplit(Number(e.target.value))}
          className="w-full mb-2"
        />
        <p className="text-xs text-slate-400 mb-2">
          Initiator: {(initiatorSplit / 100).toFixed(1)}% &nbsp;|&nbsp;
          Counterparty: {(counterpartySplit / 100).toFixed(1)}%
        </p>

        <p className="text-xs text-slate-400 mb-2">
          1 % protocol fee: {fee} USDC → Net collateral locked: {netCollateral} USDC
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
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Creating…" : "Create Bond"}
          </button>
        </div>
      </div>
    </div>
  );
}
