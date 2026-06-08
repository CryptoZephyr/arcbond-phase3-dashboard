// src/app/api/reputation/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { agentId, delta, reason } = await request.json();
    if (!agentId || typeof delta !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    await db.reputationEvent.create({
      data: {
        agentId,
        score: delta,
        reason,
        createdAt: Math.floor(Date.now() / 1000),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reputation API error:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

