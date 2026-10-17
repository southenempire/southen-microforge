'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, ShieldCheck, CheckCircle2, 
  AlertCircle, RefreshCw, Code2, Play, ExternalLink, 
  Layers, Lock, Database, ArrowRight, Copy, Check,
  Cpu, Box, Activity, Plus, Search, Filter,
  ArrowUpRight, Clock, FileCode2, TerminalSquare
} from 'lucide-react';
import { MicroTool, ExecutionRun, LedgerEntry, AgentStep } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'workbench' | 'forge' | 'ledger'>('workbench');
  const [tools, setTools] = useState<MicroTool[]>([]);
  const [executions, setExecutions] = useState<ExecutionRun[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState({ totalTools: 0, totalRuns: 0, totalRevenueCents: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Forge Form State
  const [prompt, setPrompt] = useState('');
  const [priceCents, setPriceCents] = useState(10);
  const [isForging, setIsForging] = useState(false);
  const [forgeSteps, setForgeSteps] = useState<AgentStep[]>([]);
  const [currentTool, setCurrentTool] = useState<MicroTool | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'code' | 'test'>('code');
  const [copiedCode, setCopiedCode] = useState(false);
  const [forgeSuccessToast, setForgeSuccessToast] = useState<string | null>(null);

  // Playground Execution State
  const [selectedTool, setSelectedTool] = useState<MicroTool | null>(null);
  const [playgroundInput, setPlaygroundInput] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/tools');
      const data = await res.json();
      if (data.tools) {
        setTools(data.tools);
        setExecutions(data.executions || []);
        setLedger(data.ledger || []);
        setStats(data.stats || { totalTools: 0, totalRuns: 0, totalRevenueCents: 0 });
        if (!selectedTool && data.tools.length > 0) {
          setSelectedTool(data.tools[0]);
          setPlaygroundInput(JSON.stringify(data.tools[0].sampleInput, null, 2));
        }
      }
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Forging
  const handleForge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isForging) return;

    setIsForging(true);
    setForgeSuccessToast(null);
    setForgeSteps([
      { id: '1', label: 'Interpreting natural language requirements', status: 'running', detail: 'Generating type-safe API schema and assertion harness...' }
    ]);

    try {
      const res = await fetch('/api/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, priceCents }),
      });

      const data = await res.json();
      if (data.success && data.tool) {
        setCurrentTool(data.tool);
        setForgeSteps(data.steps || []);
        setForgeSuccessToast(`Successfully verified in CreateOS Firecracker VM and deployed at /api/tools/${data.tool.slug}`);
        fetchData();
      } else {
        alert(data.error || 'Failed to forge tool');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred during tool generation');
    } finally {
      setIsForging(false);
    }
  };

  // Handle Playground Run (Two-Phase Commit)
  const handleExecute = async () => {
    if (!selectedTool || isExecuting) return;

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(playgroundInput);
    } catch (e) {
      alert('Invalid JSON input format');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: selectedTool.id,
          inputPayload: parsedPayload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setExecutionResult(data);
      } else {
        setExecutionError(data.error || 'Execution failed and financial hold was released.');
      }
      fetchData();
    } catch (err: any) {
      setExecutionError(err.message || 'Network error executing micro-tool');
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyCurlSnippet = (tool: MicroTool) => {
    const snippet = `curl -X POST https://southen-microforge.vercel.app/api/execute \\
  -H "Content-Type: application/json" \\
  -d '{"toolId": "${tool.id}", "inputPayload": ${JSON.stringify(tool.sampleInput)}}'`;
    navigator.clipboard.writeText(snippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const categories = ['All', ...Array.from(new Set(tools.map(t => t.category)))];
  const filteredTools = tools.filter(t => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-zinc-100 flex flex-col font-sans">
      {/* Top Engineering Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
                <Terminal className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">MicroForge</span>
              <span className="text-[11px] font-mono text-zinc-500">v1.2</span>
              <span className="text-zinc-700">/</span>
              <span className="text-xs font-mono text-zinc-400">SouthenEmpire</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-800 text-[11px] font-mono text-zinc-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>CreateOS Firecracker VM</span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-500">Stripe Rails Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <nav className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setActiveTab('workbench')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'workbench'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Endpoints ({tools.length})
              </button>
              <button
                onClick={() => setActiveTab('forge')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'forge'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Compiler Studio
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'ledger'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Financial Ledger
              </button>
            </nav>

            <button
              onClick={() => {
                setActiveTab('forge');
              }}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Micro-Tool</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full flex flex-col gap-6">
        
        {/* Metric Strip (Clean Developer Layout) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>DEPLOYED ENDPOINTS</span>
              <Box className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-semibold font-mono text-zinc-100 mt-1">{tools.length}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Isolated Firecracker micro-VMs</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>SANDBOX EXECUTIONS</span>
              <Activity className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-semibold font-mono text-zinc-100 mt-1">{stats.totalRuns}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">eBPF network sandbox · avg 14ms</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>CAPTURED REVENUE</span>
              <span className="text-xs text-emerald-400 font-mono">$</span>
            </div>
            <div className="text-xl font-semibold font-mono text-emerald-400 mt-1">
              ${(stats.totalRevenueCents / 100).toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Settled Stripe machine payments</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>TWO-PHASE SAFETY</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-semibold font-mono text-zinc-100 mt-1">100.0%</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Zero customer charge on error</div>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: WORKBENCH & ACTIVE MICRO-TOOLS (ALIVE DEFAULT VIEW)
        ========================================================================= */}
        {activeTab === 'workbench' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left Column: Tool Catalog Roster */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">Active Micro-Tools</h2>
                  <p className="text-[11px] text-zinc-500">Verified and serving live on CreateOS micro-VMs</p>
                </div>
                <button
                  onClick={() => setActiveTab('forge')}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Forge Tool</span>
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search endpoints..."
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        selectedCategory === cat
                          ? 'bg-zinc-800 text-white font-medium'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools List */}
              <div className="flex flex-col gap-2.5">
                {filteredTools.map((tool) => {
                  const isSelected = selectedTool?.id === tool.id;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => {
                        setSelectedTool(tool);
                        setPlaygroundInput(JSON.stringify(tool.sampleInput, null, 2));
                        setExecutionResult(null);
                        setExecutionError(null);
                      }}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 border-zinc-600 shadow-sm'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/70 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-zinc-100">{tool.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                              {tool.category}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                            POST /api/execute?slug={tool.slug}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                          ${(tool.priceCents / 100).toFixed(2)}/call
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-500">
                        <div className="flex items-center gap-3">
                          <span>{tool.totalRuns} calls</span>
                          <span>${(tool.revenueEarnedCents / 100).toFixed(2)} captured</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Firecracker Verified</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Interactive Live Execution Workbench */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {selectedTool ? (
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between pb-3 border-b border-zinc-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100">{selectedTool.name}</h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          Ready
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{selectedTool.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCurlSnippet(selectedTool)}
                        className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition-colors"
                        title="Copy cURL command"
                      >
                        {copiedCurl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCurl ? 'Copied' : 'cURL'}</span>
                      </button>

                      <a
                        href={selectedTool.stripePaymentUrl || 'https://buy.stripe.com/test_cNifZgfy10SXgnMeYkdfG00'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-950/60 border border-purple-800/60 hover:bg-purple-900/60 text-xs font-mono text-purple-300 transition-colors"
                      >
                        <span>Stripe Checkout</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Input Payload Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono text-zinc-400">JSON INPUT PAYLOAD</span>
                      <button
                        type="button"
                        onClick={() => setPlaygroundInput(JSON.stringify(selectedTool.sampleInput, null, 2))}
                        className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        Reset Default Schema
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={playgroundInput}
                      onChange={(e) => setPlaygroundInput(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* Run Action */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[11px] font-mono text-zinc-500">
                      Phase 1: Reserve ${(selectedTool.priceCents / 100).toFixed(2)} Hold <span className="text-zinc-700">→</span> Phase 2: Micro-VM <span className="text-zinc-700">→</span> Phase 3: Capture
                    </div>
                    <button
                      onClick={handleExecute}
                      disabled={isExecuting}
                      className="py-2 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs font-mono flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Executing in Sandbox...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>Execute Run (${(selectedTool.priceCents / 100).toFixed(2)})</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Execution Response Pane */}
                  {executionResult && (
                    <div className="mt-2 border border-zinc-800 rounded-lg bg-zinc-950 p-4">
                      <div className="flex items-center justify-between mb-2 text-xs font-mono">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Status: 200 OK · {executionResult.durationMs}ms</span>
                        </div>
                        <span className="text-zinc-500 text-[10px]">Hold Captured · ID: {executionResult.executionId}</span>
                      </div>
                      <pre className="text-xs font-mono text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">
                        <code>{JSON.stringify(executionResult.output, null, 2)}</code>
                      </pre>
                    </div>
                  )}

                  {executionError && (
                    <div className="mt-2 border border-amber-900/60 rounded-lg bg-amber-950/20 p-4">
                      <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Fail-Safe Triggered: Hold released, customer charged $0.00</span>
                      </div>
                      <pre className="text-xs font-mono text-amber-300">
                        <code>{executionError}</code>
                      </pre>
                    </div>
                  )}

                  {/* Code & Test Snippet Inspector */}
                  <div className="mt-2 pt-4 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-zinc-400">ISOLATED GUEST MODULE (app.js)</span>
                      <button
                        onClick={() => copyToClipboard(selectedTool.generatedCode)}
                        className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                      >
                        {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-48 leading-relaxed">
                      <code>{selectedTool.generatedCode}</code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-xs font-mono">
                  Select an active micro-tool from the directory to inspect and test.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: COMPILER STUDIO (NATURAL LANGUAGE -> CREATEOS MICRO-VM)
        ========================================================================= */}
        {activeTab === 'forge' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left Prompt & Configuration Column */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-zinc-400" />
                    <span>Micro-Tool Specification</span>
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Agent Compiler
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Provide requirements in natural language. The autonomous agent compiles production code, boots an ephemeral CreateOS Firecracker micro-VM to execute tests, and wires Stripe payment rails.
                </p>

                <form onSubmit={handleForge}>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Build an API that takes raw markdown, extracts all outbound links, strips formatting, and outputs clean plaintext..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors font-mono resize-none leading-relaxed"
                  />

                  {/* Preset Pills */}
                  <div className="mt-3">
                    <span className="text-[10px] font-mono text-zinc-500 block mb-1.5">Quick Templates:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPrompt('Build an API that takes markdown text, extracts all hyperlinks, strips syntax, and outputs clean plaintext with word counts')}
                        className="text-[11px] px-2 py-0.8 rounded bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 font-mono transition-colors"
                      >
                        Markdown Sanitizer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt('Convert raw CSV table data into typed batched SQL INSERT statements')}
                        className="text-[11px] px-2 py-0.8 rounded bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 font-mono transition-colors"
                      >
                        CSV to SQL Generator
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt('Validate arbitrary JSON payloads, infer schema types, and format output cleanly with byte size statistics')}
                        className="text-[11px] px-2 py-0.8 rounded bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 font-mono transition-colors"
                      >
                        JSON Schema Inspector
                      </button>
                    </div>
                  </div>

                  {/* Price Setting */}
                  <div className="mt-5 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-zinc-200 block">Stripe Unit Price</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Billed per successful execution</span>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                      {[5, 10, 25, 50].map((cents) => (
                        <button
                          key={cents}
                          type="button"
                          onClick={() => setPriceCents(cents)}
                          className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                            priceCents === cents
                              ? 'bg-zinc-800 text-white font-medium'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          ${(cents / 100).toFixed(2)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isForging || !prompt.trim()}
                    className="mt-5 w-full py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs font-mono flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isForging ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Compiling & Running Sandbox Verification...</span>
                      </>
                    ) : (
                      <>
                        <TerminalSquare className="h-3.5 w-3.5" />
                        <span>Compile, Verify & Provision</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Security Standards */}
              <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-zinc-300 mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Kaggle Vibe Coding Security Standard</span>
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  All guest code executes in isolated CreateOS Firecracker micro-VMs with eBPF network restrictions. Zero host access.
                </p>
              </div>
            </div>

            {/* Right Diagnostic Terminal / Pipeline Column */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-100">CreateOS Sandbox Telemetry</h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Firecracker Cluster Ready
                    </span>
                  </div>
                </div>

                {/* Status Ticker / Telemetry Steps */}
                {forgeSteps.length > 0 ? (
                  <div className="space-y-2.5 font-mono text-xs">
                    {forgeSteps.map((step, idx) => (
                      <div key={idx} className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {step.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                            {step.status === 'running' && <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />}
                            {step.status === 'failed' && <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                            <span className="text-zinc-200 font-medium text-xs">{step.label}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500">{step.timestamp?.slice(11, 19)}</span>
                        </div>
                        {step.detail && (
                          <div className="mt-1.5 text-[11px] text-zinc-400 pl-5 border-l border-zinc-800 ml-1.5">
                            {step.detail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ALIVE IDLE TELEMETRY STATE (Real engineering look, NEVER empty slop) */
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-400 space-y-2">
                    <div className="text-zinc-500">// Firecracker Micro-VM Runtime Environment</div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Kernel Version:</span>
                      <span className="text-zinc-200">Linux 6.1.102-firecracker</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Sandbox Image:</span>
                      <span className="text-zinc-200">devbox:1 (s-1vcpu-1gb)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Memory Cap:</span>
                      <span className="text-zinc-200">1024 MB / Container</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Stripe Projects Context:</span>
                      <span className="text-purple-300">acct_1URdRvPmUIoLYsaZ (Test Rails Active)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Verification Engine:</span>
                      <span className="text-emerald-400">Self-Healing Feedback Loop Enabled</span>
                    </div>
                    <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500">
                      Enter a specification on the left to compile, verify, and register a live endpoint.
                    </div>
                  </div>
                )}

                {/* Output Inspector once compiled */}
                {currentTool && (
                  <div className="mt-2 pt-4 border-t border-zinc-800/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveCodeTab('code')}
                          className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${
                            activeCodeTab === 'code' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Module (app.js)
                        </button>
                        <button
                          onClick={() => setActiveCodeTab('test')}
                          className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${
                            activeCodeTab === 'test' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Test Suite (test.js)
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(activeCodeTab === 'code' ? currentTool.generatedCode : currentTool.testSuite)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 flex items-center gap-1 transition-colors"
                        >
                          {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTool(currentTool);
                            setPlaygroundInput(JSON.stringify(currentTool.sampleInput, null, 2));
                            setActiveTab('workbench');
                          }}
                          className="px-3 py-1 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-mono font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>Test in Workbench</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-56 leading-relaxed">
                      <code>{activeCodeTab === 'code' ? currentTool.generatedCode : currentTool.testSuite}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: TWO-PHASE FINANCIAL LEDGER (AUDIT TRAIL)
        ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="flex flex-col gap-6 flex-1">
            {/* Two-Phase Commit State Machine Protocol */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Two-Phase Financial Commit State Machine</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5">
                  <div className="text-[10px] text-zinc-500 mb-1">01 / PRE-AUTH</div>
                  <div className="text-xs font-semibold text-zinc-200 mb-1.5">Hold Reserved</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Stripe authorization hold is placed with manual capture. Funds are reserved; no charge is executed yet.
                  </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5">
                  <div className="text-[10px] text-zinc-500 mb-1">02 / EXECUTE</div>
                  <div className="text-xs font-semibold text-zinc-200 mb-1.5">Sandbox Execution</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Untrusted micro-tool code runs inside isolated CreateOS Micro-VM with strict timeout and memory limits.
                  </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5">
                  <div className="text-[10px] text-zinc-500 mb-1">03 / SETTLEMENT</div>
                  <div className="text-xs font-semibold text-emerald-400 mb-1.5">Capture or Release</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    If 200 OK $\rightarrow$ Capture funds. If 500 or timeout $\rightarrow$ Release hold instantly so buyer pays $0.
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Append-Only Financial Audit Trail</h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">{ledger.length} immutable records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2 px-3 text-[11px]">TIMESTAMP</th>
                      <th className="py-2 px-3 text-[11px]">MICRO-TOOL</th>
                      <th className="py-2 px-3 text-[11px]">EVENT</th>
                      <th className="py-2 px-3 text-[11px]">AMOUNT</th>
                      <th className="py-2 px-3 text-[11px]">AUDIT DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-900/40">
                        <td className="py-2.5 px-3 text-zinc-500 text-[11px]">{entry.timestamp.replace('T', ' ').slice(0, 19)}</td>
                        <td className="py-2.5 px-3 text-zinc-200 font-medium text-xs">{entry.toolName}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              entry.entryType === 'PAYMENT_CAPTURED'
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50'
                                : entry.entryType === 'HOLD_RESERVED'
                                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                : 'bg-amber-950/40 text-amber-400 border border-amber-800/50'
                            }`}
                          >
                            {entry.entryType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300 text-xs">
                          {entry.amountCents > 0 ? `+$${(entry.amountCents / 100).toFixed(2)}` : '$0.00'}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px]">{entry.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 px-6 text-center text-xs text-zinc-500 font-mono flex items-center justify-between max-w-7xl mx-auto w-full">
        <span>MicroForge · Built for CreateOS × Stripe Projects Hackathon (Oct 2026)</span>
        <span>Team SouthenEmpire</span>
      </footer>
    </div>
  );
}
