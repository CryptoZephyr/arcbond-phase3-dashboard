// src/context/WalletContext.tsx
// Shares wallet connection state globally to eliminate userAddress prop drilling

"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWalletConnection } from "@/hooks/useWalletConnection";

type NetworkStatus = "synced" | "syncing" | "error";

interface WalletContextValue {
    userAddress: string;
    networkStatus: NetworkStatus;
    connectWallet: () => Promise<void>;
    setNetworkError: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
    const wallet = useWalletConnection();
    return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}

export function useWallet() {
    const ctx = useContext(WalletContext);
    if (!ctx) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return ctx;
}
