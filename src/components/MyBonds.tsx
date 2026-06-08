// src/components/MyBonds.tsx
"use client";

import { useEffect, useState } from "react";
import { BOND_STATUS_LABELS, BondStatus } from "@/lib/constants";

export function MyBonds({
  userAddress,
  onSelectBond,
}: {
  userAddress: string | undefined;
  onSelectBond: (bondId: bigint) => void;
}) {
  const [bonds, setBonds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) return;
    setLoading(true);
    fetch(`/api/bonds?address=${userAddress}`)
      .then((r) => r.json())
      .then((data) => {
        setBonds(data.bonds ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userAddress]);

  if (!userAddress) return null;
  if (loading) return <p className="text-slate-400">Loading bonds…</p>;
  if (bonds.length === 0) return <p className="text-slate-400">No bonds found.</p>;

  return (
    <div className="grid gap-4">
      {bonds.map((b) => (
        <div
          key={b.id}
          className="surface-panel-dark p-3 flex justify-between items-center cursor-pointer hover:bg-slate-800"
          onClick={() => onSelectBond(BigInt(b.id))}
        >
          <div>
            <p className="text-teal-300 font-mono">Bond #{b.id}</p>
            <p className="text-sm text-slate-400">
              Counterparty: {b.counterparty.slice(0, 8)}...{b.counterparty.slice(-6)}
            </p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${b.status === BondStatus.Active ? "bg-teal-500 text-slate-950" : "bg-slate-700 text-slate-400"}`}> 
            {BOND_STATUS_LABELS[b.status as BondStatus]}
          </span>
        </div>
      ))}
    </div>
  );
}
