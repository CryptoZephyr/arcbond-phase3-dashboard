// src/app/page.tsx
// Unified coordinate hub integrating modular views, MetaMask, CCTP bridging, and database routers
// Phase 3: skeleton loaders, responsive grids, scrollable ledger

"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Settings,
  Briefcase,
  Plus,
  ChevronRight,
  Sparkles,
  Link2,
  Shield
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useProtocolData } from "@/hooks/useProtocolData";
import { useMetaMaskBalance } from "@/hooks/useMetaMaskBalance";
import { Header } from "@/components/Header";
import { PrimaryBalance } from "@/components/PrimaryBalance";
import { AgentCard } from "@/components/AgentCard";
import { BondTimeline } from "@/components/BondTimeline";
import { JobTimeline } from "@/components/JobTimeline";
import { ContractStatus } from "@/components/ContractStatus";
import { AddAgentModal } from "@/components/AddAgentModal";
import { CreateJobModal } from "@/components/CreateJobModal";
import { JobsMarketplace } from "@/components/JobsMarketplace";
import { UserProfileView } from "@/components/UserProfileView";
import { AccountPortfolioView } from "@/components/AccountPortfolioView";
import { AdminPanel } from "@/components/AdminPanel";
import { createWalletClient, custom, parseUnits } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { BALANCE_POLL_INTERVAL_MS, ARCBOND_ADDRESS, ARC_USDC_DECIMALS } from "@/lib/constants";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Analytics");
  const [operationAmount, setOperationAmount] = useState("");

  const [bridgeSourceChain, setBridgeSourceChain] = useState<"Base_Sepolia" | "Arbitrum_Sepolia">("Base_Sepolia");
  const [bridgeAmount, setBridgeAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);

  const { userAddress, networkStatus, connectWallet, setNetworkError } = useWallet();

  const {
    transactions,
    userAgents,
    jobs,
    stats,
    selectedJobId,
    selectedBondId,
    arcBondState,
    arcBondError,
    wsConnected,
    hasAdminRole,
    protocolBalance,
    fetchUserAgents,
    fetchJobs,
    fetchUserTransactions,
    fetchProtocolStats,
  } = useProtocolData(userAddress);

  const mpcWalletAddress = process.env.NEXT_PUBLIC_MPC_WALLET_ADDRESS || "0xf2ea8b9ba9a914e9c4441038de30d5685b1c3ee8";

  const {
    balance: metaMaskBalance,
    loading: metaMaskBalanceLoading,
    error: metaMaskError,
  } = useMetaMaskBalance(userAddress, BALANCE_POLL_INTERVAL_MS);

  useEffect(() => {
    if (arcBondError) {
      setNetworkError();
    }
  }, [arcBondError, setNetworkError]);

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet.");
    }
  };

  const handleBridge = async () => {
    if (!bridgeAmount || parseFloat(bridgeAmount) <= 0) {
      setError("Please enter a valid bridge amount.");
      return;
    }
    if (!userAddress) {
      setError("Please connect your MetaMask wallet first.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Lazy-load the heavy Circle SDKs only when a bridge is actually initiated,
      // keeping them out of the initial client bundle.
      const [{ AppKit }, { createViemAdapterFromProvider }] = await Promise.all([
        import("@circle-fin/app-kit"),
        import("@circle-fin/adapter-viem-v2"),
      ]);

      const adapter = await createViemAdapterFromProvider({
        provider: (window as any).ethereum,
        capabilities: { addressContext: "user-controlled" }
      });

      const kit = new AppKit();

      console.log(`[Circle App Kit] Initiating client-side CCTP bridge from ${bridgeSourceChain}...`);

      const result = await kit.bridge({
        from: { adapter, chain: bridgeSourceChain as any },
        to: { recipientAddress: mpcWalletAddress, chain: "Arc_Testnet" as any, useForwarder: true },
        amount: bridgeAmount,
        token: "USDC"
      });

      const bridgeTxHash = (result as any).txHash || (result as any).id || "unknown";

      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userAddress,
          type: "BRIDGE",
          amount: bridgeAmount,
          fromAddress: userAddress,
          toAddress: mpcWalletAddress,
          txHash: bridgeTxHash,
          status: "PENDING",
          sourceChain: bridgeSourceChain
        })
      });

      setSuccess(`CCTP Bridge successfully completed! Hash: ${bridgeTxHash.slice(0, 10)}...`);
      setBridgeAmount("");
      fetchUserTransactions();
      fetchProtocolStats();
    } catch (err) {
      console.error("Client-side bridging failed:", err);
      setError(err instanceof Error ? err.message : "Bridge execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!userAddress) {
      setError("Please connect your MetaMask wallet before depositing.");
      return;
    }
    if (!operationAmount || parseFloat(operationAmount) <= 0) {
      setError("Please enter a valid deposit amount.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // --- MetaMask client‑side deposit ---
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom((window as any).ethereum),
      });
      const txHash = await walletClient.writeContract({
        address: ARCBOND_ADDRESS,
        abi: ARCBOND_ABI,
        functionName: "deposit",
        value: parseUnits(operationAmount, ARC_USDC_DECIMALS),
        account: userAddress as `0x${string}`,
      });
      // Log the deposit in the backend DB (no on‑chain call here)
      const logResponse = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userAddress,
          agentAddress: userAddress,
          amountUsdc: operationAmount,
          txHash,
          status: "CONFIRMED",
        }),
      });
      const logData = await logResponse.json();
      if (!logResponse.ok) throw new Error(logData.error || "Deposit logging failed");

      setSuccess(`Deposit confirmed. Hash: ${txHash?.slice(0, 10)}...`);
      setOperationAmount("");
      fetchUserTransactions();
      fetchProtocolStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userAddress) {
      setError("Please connect your MetaMask wallet before withdrawing.");
      return;
    }
    if (!operationAmount || parseFloat(operationAmount) <= 0) {
      setError("Please enter a valid withdrawal amount.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userAddress,
          agentAddress: mpcWalletAddress,
          amountUsdc: operationAmount,
          recipientAddress: userAddress,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Withdrawal failed");

      setSuccess(`Withdrawal confirmed. Hash: ${data.txHash?.slice(0, 10)}...`);
      setOperationAmount("");
      fetchUserTransactions();
      fetchProtocolStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header userAddress={userAddress} networkStatus={networkStatus} wsConnected={wsConnected} onConnect={handleConnect} />
      <div className="app-shell">
        <div className="app-frame">

          {/* LEFT SIDEBAR */}
          <aside className="app-sidebar flex w-full flex-col justify-between gap-5 p-4 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:w-64 lg:p-5">
            <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { name: "Analytics", icon: LineChart },
                { name: "Agents", icon: Sparkles, badge: userAgents.length > 0 ? userAgents.length.toString() : undefined },
                { name: "Jobs Escrow", icon: Briefcase, badge: jobs.length > 0 ? jobs.length.toString() : undefined },
                { name: "User Profile", icon: User },
                { name: "Account", icon: Wallet },
                { name: "Settings", icon: Settings },
                ...(hasAdminRole ? [{ name: "Admin", icon: Shield }] : []),
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveTab(item.name);
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`nav-item ${activeTab === item.name ? "nav-item-active" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge ? (
                    <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="hidden w-3.5 h-3.5 opacity-40 lg:block" />
                  )}
                </button>
              ))}
            </nav>
            <button
              onClick={() => setIsAddAgentOpen(true)}
              className="btn-primary w-full"
            >
              <Plus className="w-4 h-4" /> Bind Agent
            </button>
          </aside>

          {/* DYNAMIC CONTENT AREA */}
          <main className="app-main">

            {activeTab === "Analytics" && (
              <>
                {/* PRIMARY BALANCE DISPLAY */}
                <PrimaryBalance
                  protocolAmount={protocolBalance}
                  walletAmount={metaMaskBalance}
                  loading={false}
                  error={null}
                  walletLoading={metaMaskBalanceLoading}
                  walletError={metaMaskError}
                />

                {/* QUICK ACTIONS */}
                <section className="surface-panel">
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button onClick={handleDeposit} disabled={loading} className="btn-primary flex-1 sm:flex-none">
                      <ArrowDownLeft className="w-4 h-4" /> Deposit
                    </button>
                    <button onClick={handleWithdraw} disabled={loading} className="btn-ink flex-1 sm:flex-none">
                      <ArrowUpRight className="w-4 h-4" /> Withdraw
                    </button>
                    <button
                      onClick={handleBridge}
                      disabled={loading || !bridgeAmount}
                      className="btn-primary flex-1 sm:flex-none"
                    >
                      <Link2 className="w-4 h-4" /> Bridge In
                    </button>
                  </div>
                  {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
                  {success && <p className="mt-3 text-sm font-semibold text-green-600">{success}</p>}
                </section>

                {/* PROTOCOL STATS */}
                <section className="surface-panel">
                  <div className="mb-4">
                    <h3 className="section-title">Protocol Overview</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="metric-card">
                      <p className="eyebrow">Total Volume</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-slate-950">
                        {stats.totalVolume} <span className="text-sm font-semibold text-slate-400">USDC</span>
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">Aggregated deposits</p>
                    </div>
                    <div className="metric-card">
                      <p className="eyebrow">Protocol Fees</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-slate-950">
                        {stats.protocolFees} <span className="text-sm font-semibold text-slate-400">USDC</span>
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">Treasury collected</p>
                    </div>
                    <div className="metric-card">
                      <p className="eyebrow">Pending Settlements</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-slate-950">
                        {stats.pendingSettlements} <span className="text-sm font-semibold text-slate-400">USDC</span>
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">Awaiting verification</p>
                    </div>
                  </div>
                </section>

                {/* OPERATION INPUT & BRIDGE FORM */}
                <section className="surface-panel">
                  <div className="mb-4">
                    <h3 className="section-title">Cross-Chain Bridge</h3>
                    <p className="mt-1 text-sm text-slate-500">Bridge USDC from Base or Arbitrum to Arc</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="eyebrow mb-2 block">Source Blockchain</label>
                      <select
                        value={bridgeSourceChain}
                        onChange={(e) => setBridgeSourceChain(e.target.value as any)}
                        disabled={loading}
                        className="form-field"
                      >
                        <option value="Base_Sepolia">Base Sepolia</option>
                        <option value="Arbitrum_Sepolia">Arbitrum Sepolia</option>
                      </select>
                    </div>
                    <div>
                      <label className="eyebrow mb-2 block">Amount (USDC)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={bridgeAmount}
                        onChange={(e) => setBridgeAmount(e.target.value)}
                        disabled={loading}
                        className="form-field"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="eyebrow mb-2 block">Deposit/Withdraw Amount</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={operationAmount}
                      onChange={(e) => setOperationAmount(e.target.value)}
                      disabled={loading}
                      className="form-field"
                    />
                  </div>
                </section>

                {/* TRANSACTIONS LEDGER */}
                <section className="surface-panel">
                  <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="section-title">Transactions Ledger</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">Real-time audit records from Arc L1</p>
                    </div>
                    <button className="btn-secondary w-fit">
                      View All
                    </button>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
                    {transactions.length === 0 ? (
                      <p className="empty-state">No transactions recorded on this account yet.</p>
                    ) : (
                      transactions.map((tx) => (
                        <div key={tx.id} className="flex flex-col justify-between gap-3 border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-300 sm:flex-row sm:items-center" style={{ borderRadius: 8 }}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-white text-slate-600 shadow-sm" style={{ borderRadius: 8 }}>
                              {tx.type === "DEPOSIT" || tx.type === "BRIDGE" ? (
                                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-950">
                                {tx.type === "DEPOSIT" && "Deposit to ArcBond Ledger"}
                                {tx.type === "WITHDRAW" && "USDC Withdrawal"}
                                {tx.type === "BRIDGE" && `Bridge from ${tx.sourceChain}`}
                              </h4>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-500">Hash: {tx.txHash?.slice(0, 10)}... | {new Date(tx.timestamp * 1000).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-extrabold text-slate-950">
                              {tx.type === "DEPOSIT" || tx.type === "BRIDGE" ? "+" : "-"} {parseFloat(tx.amount).toFixed(2)} USDC
                            </p>
                            <a
                              href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-teal-600 hover:underline"
                            >
                              View Tx
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}

            {/* MODULE 1: DYNAMIC AGENTS DIRECTORY VIEW */}
            {activeTab === "Agents" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="eyebrow mb-2">Identity layer</p>
                    <h2 className="page-title">Agents Coordination</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">Track on-chain identities, registration status, and ledger balances</p>
                  </div>
                  <button
                    onClick={() => setIsAddAgentOpen(true)}
                    className="btn-primary w-fit"
                  >
                    <Plus className="w-4 h-4" /> Bind New Agent
                  </button>
                </div>

                {arcBondState && <ContractStatus state={arcBondState} />}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userAgents.length === 0 ? (
                    <div className="empty-state md:col-span-2">
                      No on-chain bound agents found. Connect your wallet and bind your first agent identity.
                    </div>
                  ) : (
                    userAgents.map((agent: any) => (
                      <AgentCard key={agent.id} agent={agent} title={agent.name} />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* MODULE 2: DYNAMIC ON-CHAIN JOBS MARKETPLACE */}
            {activeTab === "Jobs Escrow" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="eyebrow mb-2">Escrow operations</p>
                    <h2 className="page-title">Jobs & Escrow Lifecycle</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">Real-time status tracking of agent performance bonds and service agreements</p>
                  </div>
                  <button
                    onClick={() => setIsCreateJobOpen(true)}
                    className="btn-primary w-fit"
                  >
                    <Plus className="w-4 h-4" /> Create Escrow Job
                  </button>
                </div>

                <JobsMarketplace
                  jobs={jobs}
                  userAddress={userAddress}
                  onSuccess={fetchJobs}
                  maxOnChainJobId={arcBondState?.jobCount}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {arcBondState && (
                    <BondTimeline bond={arcBondState.bond || null} bondId={selectedBondId ?? null} userAddress={userAddress} />
                  )}
                  {arcBondState && (
                    <JobTimeline job={arcBondState.job || null} jobId={selectedJobId ?? null} />
                  )}
                </div>
              </div>
            )}

            {/* MODULE 3: USER PROFILE & ACCOUNT PORTFOLIO */}
            {activeTab === "User Profile" && (
              <UserProfileView userAddress={userAddress} />
            )}

            {activeTab === "Account" && (
              <AccountPortfolioView userAddress={userAddress} />
            )}

            {activeTab === "Admin" && hasAdminRole && (
              <AdminPanel userAddress={userAddress} protocolFees={stats.protocolFees} />
            )}

            {activeTab === "Settings" && (
              <section className="surface-panel">
                <h2 className="section-title">Settings</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">This module is active and under construction on Arc Testnet.</p>
              </section>
            )}

          </main>

          {/* MODAL: ADD & BIND AGENTS */}
          {isAddAgentOpen && (
            <AddAgentModal
              isOpen={isAddAgentOpen}
              onClose={() => setIsAddAgentOpen(false)}
              userAddress={userAddress}
              onSuccess={fetchUserAgents}
            />
          )}

          {/* MODAL: CREATE ESCROW JOBS */}
          {isCreateJobOpen && (
            <CreateJobModal
              isOpen={isCreateJobOpen}
              onClose={() => setIsCreateJobOpen(false)}
              userAddress={userAddress}
              onSuccess={fetchJobs}
            />
          )}

        </div>
      </div>
    </>
  );
}
