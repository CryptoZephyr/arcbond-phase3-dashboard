// src/app/api/user/route.ts
// Single verified endpoint handling all Users, Stats, Agents, and Escrow Jobs database queries

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const type = searchParams.get("type") || "profile";

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const lowerUserId = userId.toLowerCase();

        // Case A: Query dynamic Jobs Marketplace logs
        if (type === "jobs") {
            const jobs = await db.job.findMany({
                where: {
                    OR: [
                        { clientAddress: lowerUserId },
                        { providerAddress: lowerUserId },
                        { evaluatorAddress: lowerUserId }
                    ]
                },
                orderBy: { createdAt: "desc" }
            });
            return NextResponse.json({
                success: true,
                jobs,
            });
        }

        // Case B: Query dynamic Agent Directory logs
        if (type === "agents") {
            const agents = await db.userAgent.findMany({
                where: { userId: lowerUserId },
                orderBy: { registeredAt: "desc" },
            });
            return NextResponse.json({
                success: true,
                agents,
            });
        }

        // Case C: Query dynamic User Portfolio & Profile Stats
        if (type === "stats") {
            const user = await db.user.findUnique({
                where: { walletAddress: lowerUserId },
            });

            if (!user) {
                return NextResponse.json({ success: false, exists: false }, { status: 404 });
            }

            const agentCount = await db.userAgent.count({
                where: { userId: lowerUserId },
            });

            const transactions = await db.transaction.findMany({
                where: { userId: lowerUserId },
            });

            const totalVolumeNum = transactions.reduce((sum: number, tx: any) => {
                if (tx.type === "DEPOSIT" || tx.type === "WITHDRAW") {
                    return sum + parseFloat(tx.amount);
                }
                return sum;
            }, 0);

            return NextResponse.json({
                success: true,
                stats: {
                    profileAgeDays: Math.floor((Math.floor(Date.now() / 1000) - user.registeredAt) / 86400) || 0,
                    activeAgentsCount: agentCount,
                    totalVolume: totalVolumeNum.toFixed(2),
                },
            });
        }

        // Case D: Query standard User Profile session logs
        const user = await db.user.findUnique({
            where: { walletAddress: lowerUserId },
        });

        if (!user) {
            return NextResponse.json({ success: false, exists: false }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            exists: true,
            user,
        });
    } catch (error) {
        console.error("User API GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch user data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Case A: Escrow Job logging
        if (body.clientAddress) {
            const { id, clientAddress, providerAddress, evaluatorAddress, description, budget, status, expiredAt, txHash } = body;
            const now = Math.floor(Date.now() / 1000);

            const job = await db.job.upsert({
                where: { id: id.toString() },
                update: { status },
                create: {
                    id: id.toString(),
                    clientAddress: clientAddress.toLowerCase(),
                    providerAddress: providerAddress.toLowerCase(),
                    evaluatorAddress: evaluatorAddress.toLowerCase(),
                    description,
                    budget,
                    status,
                    expiredAt: parseInt(expiredAt),
                    txHash,
                    createdAt: now
                }
            });

            return NextResponse.json({
                success: true,
                job,
            });
        }

        // Case B: Agent Binding logging
        if (body.agentId) {
            const { userId, agentId, name, description } = body;
            const now = Math.floor(Date.now() / 1000);

            await db.user.upsert({
                where: { walletAddress: userId.toLowerCase() },
                update: { lastLogin: now },
                create: { walletAddress: userId.toLowerCase(), registeredAt: now, lastLogin: now }
            });

            const agent = await db.userAgent.create({
                data: {
                    userId: userId.toLowerCase(),
                    agentId: agentId.toString(),
                    name: name || `Agent #${agentId}`,
                    description: description || "",
                    address: userId.toLowerCase(),
                    registeredAt: now,
                },
            });

            return NextResponse.json({
                success: true,
                agent,
            });
        }

        // Case C: User Onboarding session logging
        const { walletAddress } = body;
        if (!walletAddress) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const now = Math.floor(Date.now() / 1000);
        const user = await db.user.upsert({
            where: { walletAddress: walletAddress.toLowerCase() },
            update: { lastLogin: now },
            create: {
                walletAddress: walletAddress.toLowerCase(),
                registeredAt: now,
                lastLogin: now,
            },
        });

        return NextResponse.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("User API POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to process request" }, { status: 500 });
    }
}