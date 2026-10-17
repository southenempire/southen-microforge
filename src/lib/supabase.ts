import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { MicroTool, ExecutionRun, LedgerEntry } from './types';

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
      console.warn('[Supabase] Initialization error:', e);
      return null;
    }
  }
  return null;
}

// Durable local file persistence fallback for serverless lambdas
const TMP_FILE = path.join('/tmp', 'microforge_state.json');

function readLocalState(): { tools: MicroTool[]; executions: ExecutionRun[]; ledger: LedgerEntry[] } {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return { tools: [], executions: [], ledger: [] };
}

function writeLocalState(state: { tools: MicroTool[]; executions: ExecutionRun[]; ledger: LedgerEntry[] }) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(state), 'utf8');
  } catch (e) {
    // ignore
  }
}

/**
 * Fetch all micro tools, prioritizing Supabase table public.micro_tools
 */
export async function getPersistedTools(fallbackTools: MicroTool[]): Promise<MicroTool[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('micro_tools').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          description: d.description,
          priceCents: d.price_cents || 10,
          currency: d.currency || 'USD',
          category: d.category || 'API Tools',
          systemPrompt: d.system_prompt,
          status: d.status || 'active',
          stripeProductId: d.stripe_product_id,
          stripePriceId: d.stripe_price_id,
          stripePaymentUrl: d.stripe_payment_url || 'https://buy.stripe.com/test_cNifZgfy10SXgnMeYkdfG00',
          sandboxId: d.sandbox_id || 'sb_microvm_firecracker',
          totalRuns: d.total_runs || 0,
          revenueEarnedCents: d.revenue_earned_cents || 0,
          createdAt: d.created_at || new Date().toISOString(),
          sampleInput: d.sample_input || { text: 'Sample input' },
          generatedCode: d.generated_code,
          testSuite: d.test_suite,
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch micro_tools:', err);
    }
  }

  // Check /tmp local file state
  const local = readLocalState();
  if (local.tools && local.tools.length > 0) {
    const map = new Map<string, MicroTool>();
    fallbackTools.forEach(t => map.set(t.id, t));
    local.tools.forEach(t => map.set(t.id, t));
    return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return fallbackTools;
}

/**
 * Fetch append-only ledger entries, prioritizing Supabase table public.ledger_entries
 */
export async function getPersistedLedger(fallbackLedger: LedgerEntry[]): Promise<LedgerEntry[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('ledger_entries').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          executionId: d.execution_id,
          toolId: d.metadata?.toolId || d.tool_id || 'tool_custom',
          toolName: d.metadata?.toolName || d.tool_name || 'MicroForge Tool',
          entryType: d.entry_type,
          amountCents: d.amount_cents,
          currency: d.currency || 'USD',
          timestamp: d.created_at,
          details: d.metadata?.details || d.details || `${d.entry_type} ($${(d.amount_cents / 100).toFixed(2)})`,
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch ledger_entries:', err);
    }
  }

  const local = readLocalState();
  if (local.ledger && local.ledger.length > 0) {
    const map = new Map<string, LedgerEntry>();
    fallbackLedger.forEach(l => map.set(l.id, l));
    local.ledger.forEach(l => map.set(l.id, l));
    return Array.from(map.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  return fallbackLedger;
}

/**
 * Persist an execution to Supabase + local cache
 */
export async function persistExecution(exec: ExecutionRun) {
  const local = readLocalState();
  local.executions = [exec, ...local.executions.filter(e => e.id !== exec.id)];
  writeLocalState(local);

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
      error_message: exec.errorMessage,
      completed_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[Supabase] Error inserting execution:', err);
  }
}

/**
 * Persist an append-only ledger entry to Supabase + local cache
 */
export async function persistLedgerEntry(entry: LedgerEntry) {
  const local = readLocalState();
  local.ledger = [entry, ...local.ledger.filter(l => l.id !== entry.id)];
  writeLocalState(local);

  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('ledger_entries').insert({
      id: entry.id,
      execution_id: entry.executionId,
      entry_type: entry.entryType,
      amount_cents: entry.amountCents,
      currency: entry.currency || 'USD',
      metadata: { 
        details: entry.details, 
        toolId: entry.toolId, 
        toolName: entry.toolName 
      }
    });
  } catch (err) {
    console.warn('[Supabase] Error inserting ledger entry:', err);
  }
}

/**
 * Persist a newly generated tool to Supabase + local cache
 */
export async function persistTool(tool: MicroTool) {
  const local = readLocalState();
  local.tools = [tool, ...local.tools.filter(t => t.id !== tool.id)];
  writeLocalState(local);

  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('micro_tools').upsert({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      system_prompt: tool.systemPrompt,
      generated_code: tool.generatedCode,
      test_suite: tool.testSuite,
      price_cents: tool.priceCents,
      currency: tool.currency,
      stripe_product_id: tool.stripeProductId,
      stripe_price_id: tool.stripePriceId,
      stripe_payment_url: tool.stripePaymentUrl,
      sandbox_id: tool.sandboxId,
      status: tool.status,
      created_at: tool.createdAt
    });
  } catch (err) {
    console.warn('[Supabase] Error inserting tool:', err);
  }
}

// Backwards-compatible aliases for store.ts
export const syncExecutionToSupabase = persistExecution;
export const syncLedgerToSupabase = persistLedgerEntry;
