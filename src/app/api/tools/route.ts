import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  const tools = store.getTools();
  const executions = store.getExecutions();
  const ledger = store.getLedger();

  return NextResponse.json({
    tools,
    executions,
    ledger,
    stats: {
      totalTools: tools.length,
      totalRuns: tools.reduce((acc: number, t: any) => acc + (t.totalRuns || 0), 0),
      totalRevenueCents: tools.reduce((acc: number, t: any) => acc + (t.revenueEarnedCents || 0), 0),
    }
  });
}
