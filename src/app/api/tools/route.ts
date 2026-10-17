import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format');
  const tools = store.getTools();
  const executions = store.getExecutions();
  const ledger = store.getLedger();

  if (format === 'openai' || format === 'agent') {
    const agentTools = tools.map((t: any) => ({
      type: 'function',
      function: {
        name: t.slug.replace(/-/g, '_'),
        description: `${t.description} [MicroForge Isolation: Firecracker micro-VM. Per-run cost: $${(t.priceCents / 100).toFixed(2)}]`,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Object.entries(t.sampleInput || {}).map(([key, val]) => [
              key,
              { 
                type: typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string',
                description: `Parameter ${key} for ${t.name}`
              }
            ])
          ),
          required: Object.keys(t.sampleInput || {})
        }
      }
    }));
    return NextResponse.json({
      provider: 'MicroForge',
      protocol: 'OpenAI Tools Function Calling (2026)',
      endpoint: 'https://southen-microforge.vercel.app/api/execute',
      billing: 'Two-Phase Stripe Rails (Pre-auth Hold -> Isolated Firecracker Micro-VM -> Capture)',
      tools: agentTools
    });
  }

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
