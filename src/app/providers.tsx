// src/app/providers.tsx
// Client-side provider stack: wagmi + react-query, then wallet context

"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi-config";
import { WalletProvider } from "@/context/WalletContext";

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <WalletProvider>{children}</WalletProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
