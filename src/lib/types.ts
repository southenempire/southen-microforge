export type ToolStatus = 'draft' | 'testing' | 'active' | 'failed';

export interface MicroTool {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  category: string;
  systemPrompt: string;
  generatedCode: string;
  testSuite: string;
  status: ToolStatus;
  stripeProductId?: string;
  stripePriceId?: string;
  stripePaymentUrl?: string;
  sandboxId?: string;
  totalRuns: number;
  revenueEarnedCents: number;
  createdAt: string;
  sampleInput: Record<string, any>;
}

export type ExecutionState = 'reserved' | 'executing' | 'captured' | 'released' | 'failed';

export interface ExecutionRun {
  id: string;
  toolId: string;
  toolName: string;
  state: ExecutionState;
  inputPayload: Record<string, any>;
  outputPayload?: Record<string, any>;
  errorMessage?: string;
  durationMs: number;
  stripePaymentIntentId?: string;
  reservedAmountCents: number;
  capturedAmountCents: number;
  createdAt: string;
}

export type LedgerEntryType = 'HOLD_RESERVED' | 'HOLD_RELEASED' | 'PAYMENT_CAPTURED' | 'REFUND';

export interface LedgerEntry {
  id: string;
  executionId: string;
  toolId: string;
  toolName: string;
  entryType: LedgerEntryType;
  amountCents: number;
  currency: string;
  timestamp: string;
  details: string;
}

export interface AgentStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
  timestamp?: string;
}
