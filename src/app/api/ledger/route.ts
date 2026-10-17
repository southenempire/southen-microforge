import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getPersistedLedger, getPersistedTools } from '@/lib/supabase';

export async function GET() {
  const ledger = await getPersistedLedger(store.getLedger());
  const executions = store.getExecutions();
  const tools = await getPersistedTools(store.getTools());

  return NextResponse.json({
    success: true,
    ledger,
    executions,
    stats: {
      totalEntries: ledger.length,
      totalCaptured: ledger.filter((e: any) => e.entryType === 'PAYMENT_CAPTURED').length,
      totalReleased: ledger.filter((e: any) => e.entryType === 'HOLD_RELEASED').length,
      totalReserved: ledger.filter((e: any) => e.entryType === 'HOLD_RESERVED').length,
      revenueEarnedCents: tools.reduce((acc: number, t: any) => acc + (t.revenueEarnedCents || 0), 0)
    }
  });
}
