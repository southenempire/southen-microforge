import { MicroTool, ExecutionRun, LedgerEntry } from './types';

// In-Memory Database store with pre-populated demo data and dynamic additions
class MicroForgeStore {
  private tools: Map<string, MicroTool> = new Map();
  private executions: ExecutionRun[] = [];
  private ledger: LedgerEntry[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const t1: MicroTool = {
      id: 'tool_markdown_sanitizer',
      name: 'Markdown & Rich Text Sanitizer',
      slug: 'markdown-sanitizer',
      description: 'Strips markdown syntax, normalizes whitespace, extracts links, and produces clean plaintext for LLM context windows.',
      priceCents: 5,
      currency: 'USD',
      category: 'Data Extraction',
      systemPrompt: 'Sanitize markdown and extract hyperlinks',
      status: 'active',
      stripeProductId: 'prod_markdown_sanitizer',
      stripePriceId: 'price_markdown_sanitizer',
      stripePaymentUrl: 'https://buy.stripe.com/test_cNifZgfy10SXgnMeYkdfG00',
      sandboxId: 'sb_microvm_firecracker_01',
      totalRuns: 42,
      revenueEarnedCents: 210,
      createdAt: '2026-10-17T12:30:00Z',
      sampleInput: {
        text: '# Special Announcement\nVisit [Stripe](https://stripe.com) or [CreateOS](https://createos.sh) for **awesome** agents!'
      },
      generatedCode: `function run(input) {
  if (!input || typeof input.text !== 'string') {
    throw new Error('Input must contain a string property "text"');
  }
  const raw = input.text;
  const linkRegex = /\\[([^\\]]+)\\]\\(([^)]+)\\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(raw)) !== null) {
    links.push({ title: match[1], url: match[2] });
  }
  const plainText = raw.replace(/^#+\\s+/gm, '').replace(/\\*\\*(.*?)\\*\\*/g, '$1').replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, '$1').trim();
  return {
    success: true,
    plainText,
    wordCount: plainText.split(/\\s+/).filter(Boolean).length,
    linksExtracted: links,
    processedAt: new Date().toISOString()
  };
}
module.exports = { run };`,
      testSuite: `const assert = require('assert');
const { run } = require('./app.js');
const res = run({ text: '# Hello **World** [link](https://test.com)' });
assert.strictEqual(res.success, true);
assert.strictEqual(res.plainText, 'Hello World link');
console.log('ALL TESTS PASSED GREEN');`
    };

    const t2: MicroTool = {
      id: 'tool_csv_to_sql',
      name: 'CSV to Typed SQL Batch Generator',
      slug: 'csv-to-sql',
      description: 'Converts raw CSV table data into batched, sanitized SQL INSERT statements with automated type inference.',
      priceCents: 10,
      currency: 'USD',
      category: 'Developer Utility',
      systemPrompt: 'Transform CSV to SQL inserts with type casting',
      status: 'active',
      stripeProductId: 'prod_csv_to_sql',
      stripePriceId: 'price_csv_to_sql',
      stripePaymentUrl: 'https://buy.stripe.com/test_cNifZgfy10SXgnMeYkdfG00',
      sandboxId: 'sb_microvm_firecracker_02',
      totalRuns: 19,
      revenueEarnedCents: 190,
      createdAt: '2026-10-17T13:15:00Z',
      sampleInput: {
        tableName: 'users',
        csv: 'id,name,role,credits\n1,Alice,builder,100\n2,Bob,runner,250'
      },
      generatedCode: `function run(input) {
  if (!input || !input.csv || !input.tableName) {
    throw new Error('Required fields: "csv" and "tableName"');
  }
  const lines = input.csv.trim().split('\\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(',').map(v => v.trim()));
  const sql = rows.map(row => {
    const values = row.map(val => (!isNaN(val) && val !== '') ? val : "'" + val.replace(/'/g, "''") + "'");
    return \`INSERT INTO \${input.tableName} (\${headers.join(', ')}) VALUES (\${values.join(', ')});\`;
  });
  return { success: true, totalRows: rows.length, sql: sql.join('\\n'), columns: headers };
}
module.exports = { run };`,
      testSuite: `const assert = require('assert');
const { run } = require('./app.js');
const res = run({ tableName: 'customers', csv: 'id,name\\n1,Acme' });
assert.strictEqual(res.success, true);
console.log('ALL TESTS PASSED GREEN');`
    };

    this.tools.set(t1.id, t1);
    this.tools.set(t2.id, t2);

    // Initial Ledger Entries (Append-only)
    this.ledger.push(
      {
        id: 'ledg_001',
        executionId: 'exec_001',
        toolId: t1.id,
        toolName: t1.name,
        entryType: 'HOLD_RESERVED',
        amountCents: 5,
        currency: 'USD',
        timestamp: '2026-10-17T13:42:10Z',
        details: 'Two-Phase Pre-Auth Hold on Stripe'
      },
      {
        id: 'ledg_002',
        executionId: 'exec_001',
        toolId: t1.id,
        toolName: t1.name,
        entryType: 'PAYMENT_CAPTURED',
        amountCents: 5,
        currency: 'USD',
        timestamp: '2026-10-17T13:42:11Z',
        details: 'Execution verified (200 OK in CreateOS Sandbox) -> Captured'
      },
      {
        id: 'ledg_003',
        executionId: 'exec_002',
        toolId: t2.id,
        toolName: t2.name,
        entryType: 'HOLD_RESERVED',
        amountCents: 10,
        currency: 'USD',
        timestamp: '2026-10-17T14:05:22Z',
        details: 'Two-Phase Pre-Auth Hold on Stripe'
      },
      {
        id: 'ledg_004',
        executionId: 'exec_002',
        toolId: t2.id,
        toolName: t2.name,
        entryType: 'PAYMENT_CAPTURED',
        amountCents: 10,
        currency: 'USD',
        timestamp: '2026-10-17T14:05:23Z',
        details: 'Execution verified (200 OK in CreateOS Sandbox) -> Captured'
      }
    );
  }

  getTools(): MicroTool[] {
    return Array.from(this.tools.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getTool(id: string): MicroTool | undefined {
    return this.tools.get(id);
  }

  addTool(tool: MicroTool) {
    this.tools.set(tool.id, tool);
  }

  getLedger(): LedgerEntry[] {
    return [...this.ledger].reverse();
  }

  addLedgerEntry(entry: LedgerEntry) {
    this.ledger.push(entry);
  }

  getExecutions(): ExecutionRun[] {
    return [...this.executions].reverse();
  }

  addExecution(exec: ExecutionRun) {
    this.executions.push(exec);
    const tool = this.tools.get(exec.toolId);
    if (tool && exec.state === 'captured') {
      tool.totalRuns += 1;
      tool.revenueEarnedCents += exec.capturedAmountCents;
    }
  }
}

// Global singleton instance
const globalStore = (global as any).__microforge_store || new MicroForgeStore();
if (process.env.NODE_ENV !== 'production') {
  (global as any).__microforge_store = globalStore;
}

export const store = globalStore;
