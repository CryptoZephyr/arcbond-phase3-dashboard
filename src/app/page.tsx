// src/app/page.tsx
// Unified coordinate hub integrating modular views, MetaMask, CCTP bridging, and database routers
// Phase 3: skeleton loaders, responsive grids, scrollable ledger

"use client";

import { useState, useEffect, useRef, Fragment } from "react";
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
import { useAccount, useReadContract } from 'wagmi';
import { DEFAULT_ADMIN_ROLE, OPERATOR_ROLE } from '@/lib/constants';
import { useRealtimeBalance } from "@/hooks/useRealtimeBalance";
import { useMetaMaskBalance } from "@/hooks/useMetaMaskBalance";
import { useArcBondData } from "@/hooks/useArcBondData";
import { useArcBondEvents } from "@/hooks/useArcBondEvents";
import { Header } from "@/components/Header";
import { CreateBondModal } from "@/components/CreateBondModal";
import { MyBonds } from "@/components/MyBonds";
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
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { createWalletClient, custom, parseUnits } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { BALANCE_POLL_INTERVAL_MS, ARC_CHAIN_ID, ARCBOND_ADDRESS, ARC_USDC_DECIMALS } from "@/lib/constants";
import { debounce } from "@/lib/debounce";

interface ProtocolStats {
  totalVolume: string;
  protocolFees: string;
  pendingSettlements: string;
}

interface TransactionRecord {
  id: string;
  type: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  status: string;
  timestamp: number;
  sourceChain?: string | null;
}

interface UserAgentRecord {
  id: string;
  agentId: string;
  name: string;
  description: string;
  isActive: boolean;
  registeredAt: number;
  address: string;
  ledgerBalance: bigint;
  boundAgentId: bigint;
}

interface EscrowJobRecord {
  id: string;
  clientAddress: string;
  providerAddress: string;
  evaluatorAddress: string;
  description: string;
  budget: string;
  status: string;
  expiredAt: number;
  txHash: string;
  createdAt: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("Analytics");
  const [activeWalletTab, setActiveWalletTab] = useState("Payment Wallets");
  const [operationAmount, setOperationAmount] = useState("");

  const [bridgeSourceChain, setBridgeSourceChain] = useState<"Base_Sepolia" | "Arbitrum_Sepolia">("Base_Sepolia");
  const [bridgeAmount, setBridgeAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<"synced" | "syncing" | "error">("syncing");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userAddress, setUserAddress] = useState<string>("");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [stats, setStats] = useState<ProtocolStats>({
    totalVolume: "0.00",
    protocolFees: "0.00",
    pendingSettlements: "0.00",
  });

  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [userAgents, setUserAgents] = useState<UserAgentRecord[]>([]);

  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [jobs, setJobs] = useState<EscrowJobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<bigint | undefined>(undefined);
  const [selectedBondId, setSelectedBondId] = useState<bigint | undefined>(undefined);

  const { address: connectedWalletAddress } = useAccount();
  const [hasAdminRole, setHasAdminRole] = useState(false);

  const { data: isAdminRole } = useReadContract({
    address: ARCBOND_ADDRESS,
    abi: ARCBOND_ABI,
    functionName: 'hasRole',
    args: [DEFAULT_ADMIN_ROLE, userAddress as `0x${string}`],
    query: { enabled: !!userAddress },
  });

  const { data: isOperatorRole } = useReadContract({
    address: ARCBOND_ADDRESS,
    abi: ARCBOND_ABI,
    functionName: 'hasRole',
    args: [OPERATOR_ROLE, userAddress as `0x${string}`],
    query: { enabled: !!userAddress },
  });

  useEffect(() => {
    setHasAdminRole(!!isAdminRole || !!isOperatorRole);
  }, [isAdminRole, isOperatorRole]);

  const mpcWalletAddress = process.env.NEXT_PUBLIC_MPC_WALLET_ADDRESS || "0xf2ea8b9ba9a914e9c4441038de30d5685b1c3ee8";

  const { state: arcBondState, error: arcBondError } = useArcBondData(selectedBondId, selectedJobId);

  const { balance: nativeBalance, loading: balanceLoading, error: nativeError, lastUpdate: balanceUpdateTime } = useRealtimeBalance(mpcWalletAddress, BALANCE_POLL_INTERVAL_MS);
  const { balance: metaMaskBalance, loading: metaMaskBalanceLoading, error: metaMaskError } = useMetaMaskBalance(userAddress, BALANCE_POLL_INTERVAL_MS);

  // Debounce registerUserSession to prevent duplicate posts on rapid address changes
  const debouncedRegisterRef = useRef<ReturnType<typeof debounce> | null>(null);

  const registerUserSession = async (address: string) => {
    try {
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
    } catch (err) {
      console.error("Failed to register session:", err);
    }
  };

  const fetchUserAgents = async () => {
    if (!userAddress) return;
    try {
      const response = await fetch(`/api/user?userId=${userAddress}&type=agents`);
      const data = await response.json();
      if (response.ok && data.success) {
        setUserAgents(data.agents);
      }
    } catch (err) {
      console.error("Failed to fetch user agents:", err);
    }
  };

  const fetchJobs = async () => {
    if (!userAddress) return;
    try {
      const response = await fetch(`/api/user?userId=${userAddress}&type=jobs`);
      const data = await response.json();
      if (response.ok && data.success) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
  };

  const fetchUserTransactions = async () => {
    if (!userAddress) return;
    try {
      const response = await fetch(`/api/transactions?userId=${userAddress}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Failed to fetch user transactions:", err);
    }
  };

  const fetchProtocolStats = async () => {
    try {
      const response = await fetch("/api/protocol/stats");
      const data = await response.json();
      if (response.ok && data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch protocol stats:", err);
    }
  };

  useEffect(() => {
    // Initialize debounced registerUserSession on first render
    if (!debouncedRegisterRef.current) {
      debouncedRegisterRef.current = debounce((address: string) => {
        registerUserSession(address);
      }, 300);
    }
  }, []);
  useEffect(() => {
    if (!jobs.length) {
      setSelectedJobId(undefined);
      return;
    }

    const maxOnChainJobId = arcBondState?.jobCount ?? BigInt(0);
    const validJobIds = jobs
      .map((job) => {
        try {
          return BigInt(job.id);
        } catch {
          return null;
        }
      })
      .filter((id): id is bigint => id !== null && id > BigInt(0) && id <= maxOnChainJobId);

    if (!validJobIds.length) {
      setSelectedJobId(undefined);
      return;
    }

    const selectedExists = selectedJobId
      ? validJobIds.some((id) => id === selectedJobId)
      : false;

    if (!selectedExists) {
      setSelectedJobId(validJobIds[0]);
    }
  }, [jobs, selectedJobId, arcBondState?.jobCount]);

  useEffect(() => {
    if (selectedBondId === undefined && arcBondState?.bondCount && arcBondState.bondCount > BigInt(0)) {
      setSelectedBondId(arcBondState.bondCount);
    }
  }, [arcBondState?.bondCount, selectedBondId]);

  // Connect to WebSocket for real‑time events
  const { wsConnected, latestEvent } = useArcBondEvents();

  // Initial fetch and fallback polling (15000 ms) for protocol stats
  useEffect(() => {
    fetchProtocolStats();
    const interval = setInterval(fetchProtocolStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // React to incoming WS events and trigger specific refetches
  useEffect(() => {
    if (!latestEvent) return;
    const { type } = latestEvent;
    // Bond lifecycle events
    if (["BondCreated","BondApproved","BondSlashed","BondReleased"].includes(type)) {
      fetchProtocolStats();
    }
    // Balance‑related events
    if (["Deposited","Withdrawn"].includes(type)) {
      fetchUserTransactions();
      fetchProtocolStats();
    }
    // Agent events
    if (type === "AgentIdBound") {
      fetchUserAgents();
    }
    // Job events — names match exact ArcBond contract event names
    if (["JobCreated","JobFunded","JobApproved","DeliverableSubmitted","JobCompleted","JobRejected","JobArbitrated","JobExpired"].includes(type)) {
      fetchJobs();
      fetchProtocolStats();
    }
  }, [latestEvent]);

  useEffect(() => {
    if (!userAddress) {
      setTransactions([]);
      setUserAgents([]);
      setJobs([]);
      return;
    }

    fetchUserTransactions();
    fetchUserAgents();
    fetchJobs();

    const interval = setInterval(() => {
      fetchUserTransactions();
      fetchUserAgents();
      fetchJobs();
    }, 10000);

    return () => clearInterval(interval);
  }, [userAddress]);

  const checkChainId = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({
          method: "eth_chainId",
        });
        const chainId = parseInt(chainIdHex, 16);
        if (chainId === ARC_CHAIN_ID) {
          setNetworkStatus("synced");
        } else {
          setNetworkStatus("error");
        }
      } catch (err) {
        console.error("Failed to check chain ID:", err);
        setNetworkStatus("error");
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16);
        if (chainId === ARC_CHAIN_ID) {
          setNetworkStatus("synced");
        } else {
          setNetworkStatus("error");
        }
      };

      (window as any).ethereum.on("chainChanged", handleChainChanged);

      // Perform initial check
      checkChainId();

      return () => {
        if ((window as any).ethereum.removeListener) {
          (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [userAddress]);

  useEffect(() => {
    if (arcBondError) {
      setNetworkStatus("error");
    }
  }, [arcBondError]);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        });
        setUserAddress(accounts[0]);
        registerUserSession(accounts[0]);
        await checkChainId();
      } catch (err) {
        console.error("User rejected wallet connection:", err);
      }
    } else {
      setError("MetaMask extension not found. Please install MetaMask to connect.");
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
      <Header userAddress={userAddress} networkStatus={networkStatus} wsConnected={wsConnected} onConnect={connectWallet} />
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
                  amount={nativeBalance}
                  loading={balanceLoading}
                  error={nativeError}
                  lastUpdate={balanceUpdateTime}
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




