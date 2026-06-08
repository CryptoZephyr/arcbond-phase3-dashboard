import { createPublicClient, http } from "viem";
import { ARC_RPC, ARC_CHAIN_ID } from "./constants";

// Custom Arc Testnet chain definition
const arcTestnet = {
    id: ARC_CHAIN_ID,
    name: "Arc Testnet",
    network: "arc-testnet",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: {
        default: { http: [ARC_RPC] },
    },
    blockExplorers: {
        default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
    },
};

export const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_RPC),
});