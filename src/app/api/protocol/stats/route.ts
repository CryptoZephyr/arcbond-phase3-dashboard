// src/app/api/protocol/stats/route.ts
// Aggregates live on-chain fee data and database-logged deposit volumes

import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/arc-chain";
import { ARCBOND_ABI } from "@/lib/arcbond-abi";
import { ARCBOND_ADDRESS } from "@/lib/constants";
import { db } from "@/lib/db";

const localPublicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(),
});

export async function GET() {
    try {
        // 1. Read collected protocol fees directly from Arc L1.
        // If RPC is temporarily unavailable, keep API stable by returning DB-backed stats with fee fallback.
        let protocolFeesFormatted = "0.00";
        try {
            const rawFees = await localPublicClient.readContract({
                address: ARCBOND_ADDRESS,
                abi: ARCBOND_ABI,
                functionName: "protocolFees",
            });
            protocolFeesFormatted = (Number(rawFees) / 1e18).toFixed(2);
        } catch (rpcError) {
            console.warn("Protocol fees RPC unavailable, using fee fallback 0.00:", rpcError);
        }

        // 2. Query SQLite and derive all displayed aggregates locally.
        const allTransactions = await db.transaction.findMany();
        const deposits = allTransactions.filter((tx: any) => tx.type === "DEPOSIT");

        const totalVolumeNum = deposits.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);
        const totalVolumeFormatted = totalVolumeNum.toFixed(2);

        // 3. Query SQLite to sum up pending/active escrow budgets
        const pendingJobs = await db.job.findMany({
            where: {
                status: { in: ["OPEN", "FUNDED", "SUBMITTED"] },
            },
        });
        const pendingSettlementsNum = pendingJobs.reduce((sum: number, job: any) => sum + parseFloat(job.budget), 0);
        const pendingSettlementsFormatted = pendingSettlementsNum.toFixed(2);

        return NextResponse.json({
            success: true,
            stats: {
                totalVolume: totalVolumeFormatted,
                protocolFees: protocolFeesFormatted,
                pendingSettlements: pendingSettlementsFormatted,
            },
        });
    } catch (error) {
        console.error("Protocol stats compilation failed:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to query stats",
            },
            { status: 500 }
        );
    }
}



