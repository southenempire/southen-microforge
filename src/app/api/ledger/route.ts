import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  const ledger = store.getLedger();
  const executions = store.getExecutions();
  const tools = store.getTools();

  return NextResponse.json({
    success: true,
    ledger,
    executions,
    stats: {
      totalEntries: ledger.length,
      totalCaptured: ledger.filter(e => e.entryType === 'PAYMENT_CAPTURED').length,
      totalReleased: ledger.filter(e => e.entryType === 'HOLD_RELEASED').length,
      totalReserved: ledger.filter(e => e.entryType === 'HOLD_RESERVED').length,
      revenueEarnedCents: tools.reduce((acc: number, t: any) => acc + (t.revenueEarnedCents || 0), 0)
    }
  });
}
