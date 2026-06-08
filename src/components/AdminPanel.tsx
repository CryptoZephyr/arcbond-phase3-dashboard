"use client";

import { useState } from "react";
import { createWalletClient, custom, keccak256, toBytes } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { ARCBOND_ADDRESS, ARBITRATOR_ROLE, OPERATOR_ROLE } from "@/lib/constants";

interface AdminPanelProps {
  userAddress: string;
  protocolFees: string;
}

export function AdminPanel({ userAddress, protocolFees }: AdminPanelProps) {
  const [feeRecipient, setFeeRecipient] = useState("");
  const [roleAddress, setRoleAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getWalletClient = () =>
    createWalletClient({
      chain: arcTestnet,
      transport: custom((window as any).ethereum),
    });

  const handleCollectFees = async () => {
    if (!feeRecipient) return setError("Enter a recipient address.");
    setLoading(true); setError(null); setSuccess(null);
    try {
      const wc = getWalletClient();
      const txHash = await wc.writeContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: "collectFees",
        args: [feeRecipient as `0x${string}`],
        account: userAddress as `0x${string}`,
      });
      setSuccess(`Fees collected. Hash: ${txHash.slice(0, 10)}...`);
      setFeeRecipient("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to collect fees.");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (pause: boolean) => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const wc = getWalletClient();
      const txHash = await wc.writeContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: pause ? "pause" : "unpause",
        args: [],
        account: userAddress as `0x${string}`,
      });
      setSuccess(`Protocol ${pause ? "paused" : "unpaused"}. Hash: ${txHash.slice(0, 10)}...`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRole = async (grant: boolean, role: `0x${string}`) => {
    if (!roleAddress) return setError("Enter an address.");
    setLoading(true); setError(null); setSuccess(null);
    try {
      const wc = getWalletClient();
      const txHash = await wc.writeContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: grant ? "grantRole" : "revokeRole",
        args: [role, roleAddress as `0x${string}`],
        account: userAddress as `0x${string}`,
      });
      setSuccess(`Role ${grant ? "granted" : "revoked"}. Hash: ${txHash.slice(0, 10)}...`);
      setRoleAddress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Admin only</p>
        <h2 className="page-title">Admin Panel</h2>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {success && <p className="text-sm font-semibold text-green-600">{success}</p>}

      {/* FEES */}
      <section className="surface-panel flex flex-col gap-4">
        <h3 className="section-title">Protocol Fees</h3>
        <p className="text-sm text-slate-500">Accumulated: <span className="font-bold text-slate-900">{protocolFees} USDC</span></p>
        <input
          type="text"
          placeholder="Recipient address (0x...)"
          value={feeRecipient}
          onChange={(e) => setFeeRecipient(e.target.value)}
          className="form-field"
        />
        <button onClick={handleCollectFees} disabled={loading} className="btn-primary w-fit">
          Collect Fees
        </button>
      </section>

      {/* PAUSE */}
      <section className="surface-panel flex flex-col gap-4">
        <h3 className="section-title">Protocol Control</h3>
        <p className="text-sm text-amber-600 font-medium">Warning: Pausing halts all deposits, bonds, and jobs until unpaused.</p>
        <div className="flex gap-3">
          <button onClick={() => handlePause(true)} disabled={loading} className="btn-ink">
            Pause Protocol
          </button>
          <button onClick={() => handlePause(false)} disabled={loading} className="btn-primary">
            Unpause Protocol
          </button>
        </div>
      </section>

      {/* ROLES */}
      <section className="surface-panel flex flex-col gap-4">
        <h3 className="section-title">Role Management</h3>
        <input
          type="text"
          placeholder="Wallet address (0x...)"
          value={roleAddress}
          onChange={(e) => setRoleAddress(e.target.value)}
          className="form-field"
        />
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleRole(true, ARBITRATOR_ROLE)} disabled={loading} className="btn-primary">
            Grant Arbitrator
          </button>
          <button onClick={() => handleRole(false, ARBITRATOR_ROLE)} disabled={loading} className="btn-ink">
            Revoke Arbitrator
          </button>
          <button onClick={() => handleRole(true, OPERATOR_ROLE)} disabled={loading} className="btn-primary">
            Grant Operator
          </button>
          <button onClick={() => handleRole(false, OPERATOR_ROLE)} disabled={loading} className="btn-ink">
            Revoke Operator
          </button>
        </div>
      </section>
    </div>
  );
}
