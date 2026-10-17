import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (supabaseUrl && supabaseKey) {
    try {
      client = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });
      return client;
    } catch (e) {
      console.warn('[Supabase] Initialization skipped or invalid credentials:', e);
      return null;
    }
  }
  return null;
}

export interface SupabaseMicroTool {
  id: string;
  name: string;
  slug: string;
  description: string;
  system_prompt: string;
  generated_code: string;
  test_suite: string;
  price_cents: number;
  stripe_price_id?: string;
  status: string;
}

export interface SupabaseExecution {
  id: string;
  tool_id: string;
  state: 'reserved' | 'executing' | 'captured' | 'released' | 'failed';
  input_payload: any;
  output_payload?: any;
  reserved_amount_cents: number;
  captured_amount_cents?: number;
  execution_time_ms?: number;
}

export interface SupabaseLedgerEntry {
  id: string;
  execution_id: string;
  entry_type: 'HOLD_RESERVED' | 'HOLD_RELEASED' | 'PAYMENT_CAPTURED' | 'FEE_DEDUCTED' | 'REFUND';
  amount_cents: number;
  currency: string;
  details?: string;
}

/**
 * Asynchronously syncs an execution record to Supabase if configured.
 * Safely catches and logs errors so the runtime is never blocked.
 */
export async function syncExecutionToSupabase(exec: any) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('tool_executions').upsert({
      id: exec.id,
      tool_id: exec.toolId,
      state: exec.state,
      input_payload: exec.inputPayload,
      output_payload: exec.outputPayload,
      stripe_payment_intent_id: exec.stripePaymentIntentId,
      reserved_amount_cents: exec.reservedAmountCents,
      captured_amount_cents: exec.capturedAmountCents,
      execution_time_ms: exec.durationMs,
      completed_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Supabase Sync Error]: Failed to upsert execution', err);
  }
}

/**
 * Asynchronously records an append-only financial ledger entry to Supabase.
 */
export async function syncLedgerToSupabase(entry: any) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('ledger_entries').insert({
      id: entry.id,
      execution_id: entry.executionId,
      entry_type: entry.entryType,
      amount_cents: entry.amountCents,
      currency: entry.currency || 'USD',
      metadata: { details: entry.details, toolId: entry.toolId, toolName: entry.toolName }
    });
  } catch (err) {
    console.warn('[Supabase Sync Error]: Failed to insert ledger entry', err);
  }
}
