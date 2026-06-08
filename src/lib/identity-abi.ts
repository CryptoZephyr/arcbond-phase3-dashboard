// src/lib/identity-abi.ts
// Unified on-chain ABI definition for Arc L1's global ERC-8004 IdentityRegistry contract

export const IDENTITY_ABI = [
    {
        type: "function",
        name: "ownerOf",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "reputationOf",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ name: "", type: "int256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isActive",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "register",
        inputs: [{ name: "metadataURI", type: "string" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "nonpayable",
    }
] as const;