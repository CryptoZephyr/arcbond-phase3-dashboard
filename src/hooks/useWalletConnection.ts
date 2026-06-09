// src/hooks/useWalletConnection.ts
// Wallet connection lifecycle: MetaMask connect, account/chain change handling, session registration

"use client";

import { useCallback, useEffect, useState } from "react";
import { ARC_CHAIN_ID } from "@/lib/constants";

type NetworkStatus = "synced" | "syncing" | "error";

async function registerUserSession(address: string) {
    try {
        await fetch("/api/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: address }),
        });
    } catch (err) {
        console.error("Failed to register session:", err);
    }
}

export function useWalletConnection() {
    const [userAddress, setUserAddress] = useState<string>("");
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>("syncing");

    const checkChainId = useCallback(async () => {
        if (typeof window !== "undefined" && (window as any).ethereum) {
            try {
                const chainIdHex = await (window as any).ethereum.request({ method: "eth_chainId" });
                const chainId = parseInt(chainIdHex, 16);
                setNetworkStatus(chainId === ARC_CHAIN_ID ? "synced" : "error");
            } catch (err) {
                console.error("Failed to check chain ID:", err);
                setNetworkStatus("error");
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).ethereum) {
            const handleChainChanged = (chainIdHex: string) => {
                const chainId = parseInt(chainIdHex, 16);
                setNetworkStatus(chainId === ARC_CHAIN_ID ? "synced" : "error");
            };

            (window as any).ethereum.on("chainChanged", handleChainChanged);
            checkChainId();

            return () => {
                if ((window as any).ethereum.removeListener) {
                    (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
                }
            };
        }
    }, [checkChainId]);

    const connectWallet = useCallback(async () => {
        if (typeof window !== "undefined" && (window as any).ethereum) {
            try {
                const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
                setUserAddress(accounts[0]);
                registerUserSession(accounts[0]);
                await checkChainId();
            } catch (err) {
                console.error("User rejected wallet connection:", err);
            }
        } else {
            throw new Error("MetaMask extension not found. Please install MetaMask to connect.");
        }
    }, [checkChainId]);

    const setNetworkError = useCallback(() => setNetworkStatus("error"), []);

    return { userAddress, networkStatus, connectWallet, setNetworkError };
}
