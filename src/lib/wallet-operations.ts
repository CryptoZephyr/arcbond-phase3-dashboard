// src/lib/wallet-operations.ts
// Phase 4 - Circle Developer-Controlled Wallets Integration with Robust Polling

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { createPublicClient, formatUnits, http, parseUnits } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { ARC_USDC_DECIMALS } from "@/lib/constants";

// Gateway Wallet Contract and Native USDC on Arc Testnet
const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const CIRCLE_WALLET_ADDRESS =
    (process.env.NEXT_PUBLIC_MPC_WALLET_ADDRESS as `0x${string}`) ||
    "0xf2ea8b9ba9a914e9c4441038de30d5685b1c3ee8";

const localPublicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(),
});

const ERC20_ABI = [
    {
        type: "function",
        name: "balanceOf",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
] as const;

// Initialize the Circle SDK client
const circleClient = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

/**
 * Helper utility to poll Circle for transaction finalization and retrieve the on-chain txHash.
 * Handles both flat and nested transaction payload responses seamlessly.
 */
async function waitForTxHash(transactionId: string): Promise<string> {
    const maxAttempts = 15;
    const intervalMs = 1500; // Poll every 1.5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));

        try {
            const txResponse = await circleClient.getTransaction({ id: transactionId });
            const data = txResponse.data as any;

            // Robust payload extraction (handles SDK response wrapping variations)
            const txData = data?.transaction || data;
            const state = txData?.state;
            const txHash = txData?.txHash;

            console.log(`[Circle SDK] Poll #${attempt + 1} - State: ${state} | Hash: ${txHash || "None yet"}`);

            // If we successfully retrieved the on-chain hash, return it immediately
            if (txHash) {
                return txHash;
            }

            if (state === "FAILED") {
                throw new Error(`Transaction ${transactionId} failed on-chain.`);
            }
        } catch (err) {
            console.warn(`[Circle SDK] Polling attempt ${attempt + 1} failed with error:`, err);
            if (err instanceof Error && err.message.includes("failed on-chain")) {
                throw err;
            }
        }
    }

    throw new Error(`Timed out waiting for on-chain transaction hash for ${transactionId}.`);
}

async function assertCircleWalletBalance(amountWei: bigint) {
    const balance = await localPublicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [CIRCLE_WALLET_ADDRESS],
    });

    if (balance < amountWei) {
        throw new Error(
            `Insufficient Circle wallet balance. Available ${formatUnits(balance, ARC_USDC_DECIMALS)} USDC, required ${formatUnits(amountWei, ARC_USDC_DECIMALS)} USDC.`
        );
    }
}

/**
 * Deposits USDC into the protocol ledger via the Gateway Wallet contract.
 * @param _agentAddress Unused in Circle MPC execution, retained for interface compatibility.
 * @param amountUsdc Amount of USDC (Arc uses 18 decimals).
 */
export async function depositToLedger(
    _agentAddress: string,
    amountUsdc: string
): Promise<{ txHash: string; status: string }> {
    try {
        const amountWei = parseUnits(amountUsdc, ARC_USDC_DECIMALS);
        await assertCircleWalletBalance(amountWei);

        if (!process.env.CIRCLE_WALLET_ID) {
            throw new Error("CIRCLE_WALLET_ID environment variable is missing.");
        }

        // Step 1: Approve Gateway Wallet to spend USDC from the MPC wallet
        console.log(`[Circle SDK] Approving Gateway Wallet to spend ${amountUsdc} USDC...`);
        const approveTxResponse = await circleClient.createContractExecutionTransaction({
            walletId: process.env.CIRCLE_WALLET_ID,
            contractAddress: USDC_ADDRESS,
            abiFunctionSignature: "approve(address,uint256)",
            abiParameters: [GATEWAY_WALLET_ADDRESS, amountWei.toString()],
            fee: {
                type: "level",
                config: {
                    feeLevel: "MEDIUM"
                }
            }
        });

        const approveId = approveTxResponse.data?.id;
        if (!approveId) throw new Error("Failed to retrieve Approve Transaction ID.");

        console.log(`[Circle SDK] Approve INITIATED (ID: ${approveId}). Waiting for hash...`);
        const approveTxHash = await waitForTxHash(approveId);
        console.log(`[Circle SDK] Approve output resolved to: ${approveTxHash}`);

        // Step 2: Call deposit on the Gateway Wallet contract
        console.log(`[Circle SDK] Executing Gateway deposit...`);
        const depositTxResponse = await circleClient.createContractExecutionTransaction({
            walletId: process.env.CIRCLE_WALLET_ID,
            contractAddress: GATEWAY_WALLET_ADDRESS,
            abiFunctionSignature: "deposit(address,uint256)",
            abiParameters: [USDC_ADDRESS, amountWei.toString()],
            fee: {
                type: "level",
                config: {
                    feeLevel: "MEDIUM"
                }
            }
        });

        const depositId = depositTxResponse.data?.id;
        if (!depositId) throw new Error("Failed to retrieve Deposit Transaction ID.");

        console.log(`[Circle SDK] Deposit INITIATED (ID: ${depositId}). Waiting for hash...`);
        const depositTxHash = await waitForTxHash(depositId);
        console.log(`[Circle SDK] Deposit output resolved to: ${depositTxHash}`);

        return {
            txHash: depositTxHash,
            status: "CONFIRMED",
        };
    } catch (error) {
        console.error("Deposit to Gateway failed:", error);
        throw error;
    }
}

/**
 * Directs standard USDC transfers out of the MPC wallet to a target recipient.
 * @param _agentAddress Unused, retained for interface compatibility.
 * @param amountUsdc Amount of USDC.
 * @param recipientAddress Recipient wallet address.
 */
export async function withdrawFromLedger(
    _agentAddress: string,
    amountUsdc: string,
    recipientAddress: string
): Promise<{ txHash: string; status: string }> {
    try {
        const amountWei = parseUnits(amountUsdc, ARC_USDC_DECIMALS);
        await assertCircleWalletBalance(amountWei);

        if (!process.env.CIRCLE_WALLET_ID) {
            throw new Error("CIRCLE_WALLET_ID environment variable is missing.");
        }

        console.log(`[Circle SDK] Initiating withdrawal of ${amountUsdc} USDC to ${recipientAddress}...`);
        const transferTxResponse = await circleClient.createContractExecutionTransaction({
            walletId: process.env.CIRCLE_WALLET_ID,
            contractAddress: USDC_ADDRESS,
            abiFunctionSignature: "transfer(address,uint256)",
            abiParameters: [recipientAddress, amountWei.toString()],
            fee: {
                type: "level",
                config: {
                    feeLevel: "MEDIUM"
                }
            }
        });

        const withdrawId = transferTxResponse.data?.id;
        if (!withdrawId) throw new Error("Failed to retrieve Withdrawal Transaction ID.");

        console.log(`[Circle SDK] Withdrawal INITIATED (ID: ${withdrawId}). Waiting for hash...`);
        const withdrawTxHash = await waitForTxHash(withdrawId);
        console.log(`[Circle SDK] Withdrawal output resolved to: ${withdrawTxHash}`);

        return {
            txHash: withdrawTxHash || "",
            status: "CONFIRMED",
        };
    } catch (error) {
        console.error("Withdrawal failed:", error);
        throw error;
    }
}
