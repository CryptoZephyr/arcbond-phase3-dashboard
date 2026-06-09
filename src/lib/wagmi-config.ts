// src/lib/wagmi-config.ts
// Shared wagmi configuration for Arc Testnet (injected/MetaMask connector)

import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "@/lib/arc-chain";
import { ARC_RPC } from "@/lib/constants";

export const wagmiConfig = createConfig({
    chains: [arcTestnet],
    connectors: [injected()],
    transports: {
        [arcTestnet.id]: http(ARC_RPC),
    },
});
