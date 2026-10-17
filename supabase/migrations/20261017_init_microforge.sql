-- ============================================================================
-- MicroForge / SouthenEmpire Two-Phase Ledger & Micro-Tool Schema
-- Implements: Reserve -> Execute -> Capture / Release with Append-Only Ledger
-- Compatible with Supabase PostgreSQL
-- ============================================================================

-- 1. Micro-Tools Catalog
CREATE TABLE IF NOT EXISTS public.micro_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    system_prompt TEXT NOT NULL,
    generated_code TEXT NOT NULL,
    test_suite TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'testing', 'active', 'failed', 'paused')),
    
    -- Pricing Rails
    price_cents INTEGER NOT NULL DEFAULT 10,
    currency TEXT NOT NULL DEFAULT 'usd',
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    stripe_payment_url TEXT,
    
    -- Deployment metadata
    sandbox_id TEXT,
    live_endpoint_url TEXT,
    health_status TEXT DEFAULT 'healthy',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Execution Runs (Tracking Two-Phase Lifecycle)
CREATE TABLE IF NOT EXISTS public.tool_executions (
    id TEXT PRIMARY KEY,
    tool_id TEXT NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Two-Phase State Machine
    state TEXT NOT NULL DEFAULT 'reserved' 
        CHECK (state IN ('reserved', 'executing', 'captured', 'released', 'failed')),
    
    -- Inputs & Outputs
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- Stripe Two-Phase Transaction References
    stripe_payment_intent_id TEXT,
    reserved_amount_cents INTEGER NOT NULL,
    captured_amount_cents INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    completed_at TIMESTAMPTZ
);

-- 3. Append-Only Financial Ledger (Tamper-Proof)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    account_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('HOLD_RESERVED', 'HOLD_RELEASED', 'PAYMENT_CAPTURED', 'FEE_DEDUCTED', 'REFUND')),
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    stripe_charge_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Enforce Append-Only Guarantee on Ledger
CREATE OR REPLACE FUNCTION prevent_ledger_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Financial Ledger entries are immutable and cannot be updated or deleted!';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON public.ledger_entries;
CREATE TRIGGER trg_prevent_ledger_update
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_tampering();

-- Indexes for high-throughput gateway queries
CREATE INDEX IF NOT EXISTS idx_micro_tools_slug ON public.micro_tools(slug);
CREATE INDEX IF NOT EXISTS idx_executions_tool_id ON public.tool_executions(tool_id);
CREATE INDEX IF NOT EXISTS idx_ledger_execution_id ON public.ledger_entries(execution_id);
