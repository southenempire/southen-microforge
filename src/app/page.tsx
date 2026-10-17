'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, ShieldCheck, Zap, DollarSign, CheckCircle2, 
  AlertCircle, RefreshCw, Code2, Play, ExternalLink, 
  Layers, Lock, Database, ArrowRight, Sparkles, Copy, Check
} from 'lucide-react';
import { MicroTool, ExecutionRun, LedgerEntry, AgentStep } from '@/lib/types';
import confetti from 'canvas-confetti';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'forge' | 'store' | 'ledger'>('forge');
  const [tools, setTools] = useState<MicroTool[]>([]);
  const [executions, setExecutions] = useState<ExecutionRun[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState({ totalTools: 0, totalRuns: 0, totalRevenueCents: 0 });

  // Forge Form State
  const [prompt, setPrompt] = useState('');
  const [priceCents, setPriceCents] = useState(10);
  const [isForging, setIsForging] = useState(false);
  const [forgeSteps, setForgeSteps] = useState<AgentStep[]>([]);
  const [currentTool, setCurrentTool] = useState<MicroTool | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Playground Execution State
  const [selectedTool, setSelectedTool] = useState<MicroTool | null>(null);
  const [playgroundInput, setPlaygroundInput] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

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
    setForgeSteps([
      { id: '1', label: 'Interpreting natural language requirements', status: 'running', detail: 'Generating type-safe API schema...' }
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
        fetchData();
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.7 } });
      } else {
        alert(data.error || 'Failed to forge tool');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
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
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
      } else {
        setExecutionError(data.error || 'Execution failed and hold was released.');
      }
      fetchData();
    } catch (err: any) {
      setExecutionError(err.message || 'Network error');
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-blue-600/30 selection:text-blue-200">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-blue-500/10">
              <div className="h-full w-full bg-zinc-950 rounded-[7px] flex items-center justify-center">
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-white text-base">MicroForge</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                  by SouthenEmpire
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Autonomous Developer Agent for Monetized Micro-Tools</p>
            </div>
          </div>

          {/* Infrastructure Health Status */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/40 border border-blue-800/50 text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              CreateOS Micro-VM
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-800/50 text-purple-300">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
              Stripe Projects Rails
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              Two-Phase Ledger
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setActiveTab('forge')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'forge'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Agent Studio
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'store'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Playground & Store ({tools.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'ledger'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Two-Phase Ledger
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>ACTIVE MICRO-TOOLS</span>
              <Code2 className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">{tools.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Verified in Firecracker Micro-VMs</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>SANDBOX EXECUTIONS</span>
              <Play className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">{stats.totalRuns}</div>
            <div className="text-[11px] text-zinc-500 mt-1">100% Isolated eBPF network</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>CAPTURED REVENUE</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
              ${(stats.totalRevenueCents / 100).toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Stripe Machine Payments</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>FINANCIAL SAFETY</span>
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">100%</div>
            <div className="text-[11px] text-zinc-500 mt-1">Zero charge on failed runs</div>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: AGENT FORGE STUDIO
        ========================================================================= */}
        {activeTab === 'forge' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Prompt & Controls Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <h2 className="text-base font-semibold text-zinc-100">Describe Your Micro-Tool</h2>
                </div>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  MicroForge interprets your natural language specification, writes the logic, boots a CreateOS sandbox to run automated tests, wires Stripe billing rails, and serves a live monetized endpoint.
                </p>

                <form onSubmit={handleForge}>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Build an API that takes messy markdown text, extracts all hyperlinks, strips syntax, and outputs clean plaintext..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors font-mono resize-none"
                  />

                  {/* Preset Pills */}
                  <div className="mt-3">
                    <span className="text-[11px] font-mono text-zinc-500 block mb-1.5">Try a prompt template:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPrompt('Build an API that takes markdown text, extracts all hyperlinks, strips syntax, and outputs clean plaintext with word counts')}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 transition-colors"
                      >
                        Markdown Sanitizer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt('Convert raw CSV table data into typed batched SQL INSERT statements')}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 transition-colors"
                      >
                        CSV to SQL Generator
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt('Validate arbitrary JSON payloads, infer schema types, and format output cleanly with byte size statistics')}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 transition-colors"
                      >
                        JSON Schema Inspector
                      </button>
                    </div>
                  </div>

                  {/* Price Setting */}
                  <div className="mt-6 pt-5 border-t border-zinc-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-200 block">Execution Price</span>
                      <span className="text-[11px] text-zinc-500">Charged per successful run</span>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                      {[5, 10, 25, 50].map((cents) => (
                        <button
                          key={cents}
                          type="button"
                          onClick={() => setPriceCents(cents)}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                            priceCents === cents
                              ? 'bg-blue-600 text-white font-medium'
                              : 'text-zinc-400 hover:text-zinc-200'
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
                    className="mt-6 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isForging ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Autonomous Agent Working...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>Forge & Deploy Micro-Tool</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Security Guardrail Callout */}
              <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-xl p-4 text-xs">
                <div className="flex items-center gap-2 text-zinc-300 font-medium mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Kaggle Vibe Coding Security Standard</span>
                </div>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  Generated micro-tools execute inside isolated CreateOS Firecracker micro-VMs. Outbound network calls are restricted by eBPF, and Stripe API keys are never exposed to guest code.
                </p>
              </div>
            </div>

            {/* Right Agent Telemetry & Code Inspector */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Agent Execution Pipeline */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-100">Live Agent Pipeline</h3>
                  </div>
                  {isForging && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                      Synthesizing in Sandbox...
                    </span>
                  )}
                </div>

                {forgeSteps.length === 0 ? (
                  <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs">
                    Enter a prompt and click "Forge & Deploy Micro-Tool" to watch the autonomous agent synthesize, sandbox, test, and wire monetization.
                  </div>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    {forgeSteps.map((step, idx) => (
                      <div key={idx} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {step.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                            {step.status === 'running' && <RefreshCw className="h-4 w-4 text-blue-400 animate-spin shrink-0" />}
                            {step.status === 'failed' && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />}
                            <span className="text-zinc-200 font-medium">{step.label}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500">{step.timestamp?.slice(11, 19)}</span>
                        </div>
                        {step.detail && (
                          <div className="mt-2 text-[11px] text-zinc-400 pl-6 border-l border-zinc-800 ml-2">
                            {step.detail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Code Inspector (when tool is forged) */}
              {currentTool && (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">{currentTool.name}</h4>
                      <span className="text-xs font-mono text-emerald-400">
                        Status: Verified Green · ${(currentTool.priceCents / 100).toFixed(2)}/run
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(currentTool.generatedCode)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition-colors"
                      >
                        {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTool(currentTool);
                          setPlaygroundInput(JSON.stringify(currentTool.sampleInput, null, 2));
                          setActiveTab('store');
                        }}
                        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Open in Playground</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-64 leading-relaxed">
                      <code>{currentTool.generatedCode}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: MICRO-TOOLS STOREFRONT & PLAYGROUND
        ========================================================================= */}
        {activeTab === 'store' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Tool Selector List */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-zinc-300 font-mono flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-400" />
                <span>MONETIZED MICRO-TOOL DIRECTORY</span>
              </h3>

              <div className="space-y-3">
                {tools.map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => {
                      setSelectedTool(tool);
                      setPlaygroundInput(JSON.stringify(tool.sampleInput, null, 2));
                      setExecutionResult(null);
                      setExecutionError(null);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedTool?.id === tool.id
                        ? 'bg-zinc-900 border-blue-500/80 shadow-md shadow-blue-500/5'
                        : 'bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm text-zinc-100">{tool.name}</span>
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ${(tool.priceCents / 100).toFixed(2)}/run
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{tool.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-2.5">
                      <span>Runs: {tool.totalRuns}</span>
                      <span>Revenue: ${(tool.revenueEarnedCents / 100).toFixed(2)}</span>
                      <span className="text-blue-400 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Micro-VM
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Playground Column */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {selectedTool ? (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">{selectedTool.name}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{selectedTool.description}</p>
                    </div>
                    <div className="text-right">
                      <a
                        href={selectedTool.stripePaymentUrl || 'https://buy.stripe.com/test_cNifZgfy10SXgnMeYkdfG00'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white transition-colors"
                      >
                        <span>Stripe Checkout</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Input Editor */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-mono text-zinc-400">JSON INPUT PAYLOAD</label>
                      <button
                        type="button"
                        onClick={() => setPlaygroundInput(JSON.stringify(selectedTool.sampleInput, null, 2))}
                        className="text-[11px] text-blue-400 hover:underline"
                      >
                        Reset Sample Input
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={playgroundInput}
                      onChange={(e) => setPlaygroundInput(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Run Button */}
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer font-mono"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Running Two-Phase Commit (Reserve -&gt; Exec -&gt; Capture)...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Execute with Two-Phase Protection (${(selectedTool.priceCents / 100).toFixed(2)})</span>
                      </>
                    )}
                  </button>

                  {/* Execution Output */}
                  {executionResult && (
                    <div className="mt-6 pt-5 border-t border-zinc-800">
                      <div className="flex items-center justify-between mb-2 text-xs font-mono">
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          SUCCESSFUL CAPTURE ({executionResult.durationMs}ms)
                        </span>
                        <span className="text-zinc-500">Stripe ID: {executionResult.executionId}</span>
                      </div>
                      <pre className="bg-zinc-950 border border-emerald-950/60 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-56">
                        <code>{JSON.stringify(executionResult.output, null, 2)}</code>
                      </pre>
                    </div>
                  )}

                  {executionError && (
                    <div className="mt-6 pt-5 border-t border-zinc-800">
                      <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>FAIL-SAFE ACTIVATED: Hold released, customer charged $0.00</span>
                      </div>
                      <pre className="bg-zinc-950 border border-amber-950/60 rounded-xl p-4 text-xs font-mono text-amber-300">
                        <code>{executionError}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-sm">
                  Select a micro-tool to test execution
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: TWO-PHASE FINANCIAL LEDGER
        ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="flex flex-col gap-8">
            {/* Architectural Diagram */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Two-Phase Financial Commit Architecture</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                  <div className="text-[10px] text-zinc-500 mb-1">PHASE 1</div>
                  <div className="text-sm font-semibold text-blue-400 mb-2">Reserve Hold</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Stripe authorization hold is placed with manual capture. Funds are reserved; no charge is executed yet.
                  </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                  <div className="text-[10px] text-zinc-500 mb-1">PHASE 2</div>
                  <div className="text-sm font-semibold text-purple-400 mb-2">Sandbox Execute</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Untrusted micro-tool code runs inside isolated CreateOS Micro-VM with strict timeout and memory limits.
                  </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative">
                  <div className="text-[10px] text-zinc-500 mb-1">PHASE 3</div>
                  <div className="text-sm font-semibold text-emerald-400 mb-2">Capture or Release</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    If 200 OK $\rightarrow$ Capture funds. If 500 or timeout $\rightarrow$ Release hold instantly so buyer pays $0.
                  </p>
                </div>
              </div>
            </div>

            {/* Immutable Ledger Table */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Append-Only Financial Audit Trail</h3>
                </div>
                <span className="text-xs font-mono text-zinc-500">{ledger.length} immutable records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">TIMESTAMP</th>
                      <th className="py-2.5 px-3">MICRO-TOOL</th>
                      <th className="py-2.5 px-3">EVENT TYPE</th>
                      <th className="py-2.5 px-3">AMOUNT</th>
                      <th className="py-2.5 px-3">AUDIT DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-900/30">
                        <td className="py-2.5 px-3 text-zinc-500">{entry.timestamp.replace('T', ' ').slice(0, 19)}</td>
                        <td className="py-2.5 px-3 text-zinc-200 font-medium">{entry.toolName}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              entry.entryType === 'PAYMENT_CAPTURED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : entry.entryType === 'HOLD_RESERVED'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {entry.entryType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">
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
      <footer className="mt-16 border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-500 font-mono">
        Built for CreateOS × Stripe Projects Hackathon · Team SouthenEmpire
      </footer>
    </div>
  );
}
