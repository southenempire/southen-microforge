'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, ShieldCheck, CheckCircle2, 
  AlertCircle, RefreshCw, Code2, Play, ExternalLink, 
  Layers, Lock, Database, ArrowRight, Copy, Check,
  Cpu, Box, Activity, Plus, Search, Filter,
  ArrowUpRight, Clock, FileCode2, TerminalSquare,
  BookOpen, Key, User, X, Sun, Moon,
  Webhook, FileText, CheckCheck, Wallet, Sparkles
} from 'lucide-react';
import { MicroTool, ExecutionRun, LedgerEntry, AgentStep } from '@/lib/types';
import ThreeHeroMesh from '@/components/ThreeHeroMesh';

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<'workbench' | 'forge' | 'ledger' | 'docs'>('workbench');
  const [tools, setTools] = useState<MicroTool[]>([]);
  const [executions, setExecutions] = useState<ExecutionRun[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState({ totalTools: 0, totalRuns: 0, totalRevenueCents: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  // Forge Form State
  const [prompt, setPrompt] = useState('');
  const [priceCents, setPriceCents] = useState(10);
  const [isForging, setIsForging] = useState(false);
  const [forgeSteps, setForgeSteps] = useState<AgentStep[]>([]);
  const [currentTool, setCurrentTool] = useState<MicroTool | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'code' | 'test'>('code');
  const [copiedCode, setCopiedCode] = useState(false);

  // Playground Execution State
  const [selectedTool, setSelectedTool] = useState<MicroTool | null>(null);
  const [playgroundInput, setPlaygroundInput] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Docs Code Snippet Tab
  const [docsLang, setDocsLang] = useState<'curl' | 'node' | 'python' | 'langchain'>('curl');

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

  const copyApiKey = () => {
    navigator.clipboard.writeText('sk_forge_live_9a87f2b1c4e9082ac33d');
    setCopiedApiKey(true);
    setTimeout(() => setCopiedApiKey(false), 2000);
  };

  const categories = ['All', ...Array.from(new Set(tools.map(t => t.category)))];
  const filteredTools = tools.filter(t => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-sans ${
      isDark 
        ? 'bg-[#09090b] text-zinc-100 bg-grid-dark selection:bg-indigo-900 selection:text-indigo-200' 
        : 'bg-[#f8fafc] text-slate-900 bg-grid-light selection:bg-indigo-100 selection:text-indigo-900'
    }`}>
      
      {/* Ambient Top Glow (Stripe/CreateOS Style) */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 70% 35% at 50% -10%, rgba(99, 102, 241, 0.18), transparent)'
            : 'radial-gradient(ellipse 70% 35% at 50% -10%, rgba(99, 102, 241, 0.12), transparent)'
        }}
      />

      {/* Top Navbar */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors ${
        isDark ? 'border-zinc-800/80 bg-zinc-950/80' : 'border-slate-200/90 bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative z-10">
          
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('workbench')}>
              {/* Custom Geometric 3D Anvil/Forge SVG Logo */}
              <svg className="h-8 w-8 shrink-0 drop-shadow-sm" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#forge-grad)" />
                <path d="M7 11L16 6L25 11L16 16L7 11Z" fill="#38BDF8" fillOpacity="0.95" />
                <path d="M7 11L16 16V26L7 21V11Z" fill="#6366F1" fillOpacity="0.85" />
                <path d="M25 11L16 16V26L25 21V11Z" fill="#818CF8" fillOpacity="0.95" />
                <circle cx="16" cy="16" r="2.5" fill="#FFFFFF" fillOpacity="0.9" />
                <defs>
                  <linearGradient id="forge-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0F172A" />
                    <stop offset="1" stopColor="#312E81" />
                  </linearGradient>
                </defs>
              </svg>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold tracking-tight text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    MicroForge
                  </span>
                  <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                    isDark ? 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                  }`}>
                    Engine v1.4
                  </span>
                </div>
                <p className={`text-[10px] font-mono leading-none mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Firecracker Micro-VMs & Stripe Rails
                </p>
              </div>
            </div>

            {/* Live Cluster Pill */}
            <div className={`hidden lg:flex items-center gap-2 pl-4 ml-2 border-l text-[11px] font-mono ${
              isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-200 text-slate-500'
            }`}>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cluster: Online (CreateOS)</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className={`flex items-center border rounded-xl p-1 text-xs font-medium transition-colors ${
            isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('workbench')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'workbench'
                  ? (isDark ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Box className="h-3.5 w-3.5" />
              <span>Endpoints ({tools.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('forge')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'forge'
                  ? (isDark ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Compiler Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? (isDark ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'docs'
                  ? (isDark ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>API & Docs</span>
            </button>
          </nav>

          {/* Right Action Bar (Theme toggle + Auth Modal) */}
          <div className="flex items-center gap-2.5">
            {/* Dark/Light Mode Switcher */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Developer Auth / Console Profile Button */}
            <button
              onClick={() => setShowAuthModal(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                isAuthenticated
                  ? (isDark 
                      ? 'bg-zinc-900 border-indigo-500/50 text-indigo-300 hover:bg-zinc-800' 
                      : 'bg-white border-indigo-300 text-indigo-600 hover:bg-indigo-50')
                  : (isDark 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600')
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
              <span>{isAuthenticated ? 'Console: Connected' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full flex flex-col gap-6 relative z-10">

        {/* Hero Banner with Interactive 3D Three.js Firecracker Cluster & Metrics */}
        <div className={`rounded-2xl border p-6 relative overflow-hidden transition-colors ${
          isDark 
            ? 'bg-gradient-to-r from-zinc-900/90 via-zinc-900/50 to-indigo-950/30 border-zinc-800/80' 
            : 'bg-gradient-to-r from-white via-slate-50 to-indigo-50/60 border-slate-200 shadow-sm'
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 w-fit">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                <span>CreateOS × Stripe Projects Hackathon (Oct 2026)</span>
              </div>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                The Autonomous Forge for Monetized Micro-Agents
              </h1>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Compile natural language requirements into isolated Linux micro-VMs, verify logic with self-healing test assertions, and monetize endpoints via Two-Phase Stripe rails.
              </p>

              {/* Quick Metrics Capsule */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <div className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>ENDPOINTS</div>
                  <div className={`text-lg font-bold font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{tools.length}</div>
                  <div className="text-[10px] text-emerald-500 font-mono">100% active</div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <div className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>SANDBOX RUNS</div>
                  <div className={`text-lg font-bold font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.totalRuns}</div>
                  <div className="text-[10px] text-cyan-500 font-mono">avg 12ms</div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <div className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>SETTLED REV</div>
                  <div className="text-lg font-bold font-mono mt-0.5 text-emerald-400">${(stats.totalRevenueCents / 100).toFixed(2)}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Stripe machine</div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <div className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>SAFETY</div>
                  <div className={`text-lg font-bold font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>100%</div>
                  <div className="text-[10px] text-indigo-400 font-mono">Zero loss fail-safe</div>
                </div>
              </div>
            </div>

            {/* Right Interactive 3D Three.js Column */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[220px]">
              <div className={`absolute inset-0 rounded-xl border pointer-events-none transition-colors ${
                isDark ? 'border-zinc-800/40 bg-zinc-950/30' : 'border-slate-200/40 bg-white/30'
              }`} />
              <ThreeHeroMesh theme={theme} />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full border text-[10px] font-mono pointer-events-none whitespace-nowrap bg-zinc-900/80 border-zinc-700/60 text-zinc-400">
                ● 3D Firecracker Cluster Mesh (Interactive)
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: ENDPOINTS WORKBENCH (ALIVE & INTERACTIVE)
        ========================================================================= */}
        {activeTab === 'workbench' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left Column: Tool Catalog Roster */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                    Active Micro-Tools Catalog
                  </h2>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Select an endpoint to execute live in the sandbox
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('forge')}
                  className={`text-xs font-mono flex items-center gap-1 transition-colors ${
                    isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                  }`}
                >
                  <Plus className="h-3 w-3" />
                  <span>Forge Tool</span>
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className={`absolute left-2.5 top-2.5 h-3.5 w-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tools by name, slug, or tag..."
                    className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono transition-colors focus:outline-none ${
                      isDark 
                        ? 'bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:border-zinc-700' 
                        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 rounded-lg transition-colors font-medium ${
                        selectedCategory === cat
                          ? (isDark ? 'bg-zinc-800 text-white' : 'bg-slate-200 text-slate-900')
                          : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-800')
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools List */}
              <div className="flex flex-col gap-3">
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
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? (isDark 
                              ? 'bg-zinc-900 border-indigo-500/80 shadow-lg shadow-indigo-950/20' 
                              : 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20')
                          : (isDark 
                              ? 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300')
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-xs ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                              {tool.name}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {tool.category}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono block mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            POST /api/execute?slug={tool.slug}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-lg shrink-0">
                          ${(tool.priceCents / 100).toFixed(2)}/run
                        </span>
                      </div>

                      <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        {tool.description}
                      </p>

                      <div className={`flex items-center justify-between mt-3 pt-2.5 border-t text-[11px] font-mono ${
                        isDark ? 'border-zinc-800/60 text-zinc-400' : 'border-slate-100 text-slate-500'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span>{tool.totalRuns} calls</span>
                          <span className="text-emerald-500">${(tool.revenueEarnedCents / 100).toFixed(2)} rev</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Firecracker VM</span>
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
                <div className={`border rounded-2xl p-6 flex flex-col gap-4 transition-colors ${
                  isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className={`flex items-start justify-between pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                          {selectedTool.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          Sandboxed & Serving
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        {selectedTool.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyCurlSnippet(selectedTool)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                          isDark 
                            ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200' 
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                        }`}
                        title="Copy cURL command"
                      >
                        {copiedCurl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCurl ? 'Copied' : 'cURL'}</span>
                      </button>

                      <a
                        href={selectedTool.stripePaymentUrl || 'https://buy.stripe.com/test_cNifZgfy10SXgnMeYkdfG00'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white transition-colors shadow-sm"
                      >
                        <span>Stripe Checkout</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Input Payload Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-mono font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        JSON PAYLOAD (INSPECT / EDIT)
                      </span>
                      <button
                        type="button"
                        onClick={() => setPlaygroundInput(JSON.stringify(selectedTool.sampleInput, null, 2))}
                        className={`text-[11px] font-mono transition-colors ${
                          isDark ? 'text-indigo-400 hover:underline' : 'text-indigo-600 hover:underline'
                        }`}
                      >
                        Reset Default Payload
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={playgroundInput}
                      onChange={(e) => setPlaygroundInput(e.target.value)}
                      className={`w-full border rounded-xl p-3 text-xs font-mono transition-colors resize-none leading-relaxed focus:outline-none ${
                        isDark 
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'
                      }`}
                    />
                  </div>

                  {/* Execution Trigger Bar */}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                      Two-Phase State Machine: <span className="text-blue-400 font-semibold">Reserve Hold</span> $\to$ <span className="text-purple-400 font-semibold">Firecracker VM</span> $\to$ <span className="text-emerald-400 font-semibold">Capture</span>
                    </div>
                    <button
                      onClick={handleExecute}
                      disabled={isExecuting}
                      className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Executing in Micro-VM...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Execute Run (${(selectedTool.priceCents / 100).toFixed(2)})</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Execution Response Pane */}
                  {executionResult && (
                    <div className={`border rounded-xl p-4 transition-colors ${
                      isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2 text-xs font-mono">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Status: 200 OK · Execution Latency: {executionResult.durationMs}ms</span>
                        </div>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                          Hold Captured · Execution ID: {executionResult.executionId}
                        </span>
                      </div>
                      <pre className={`text-xs font-mono overflow-x-auto max-h-56 leading-relaxed p-3 rounded-lg border ${
                        isDark ? 'bg-zinc-900/60 border-emerald-950/60 text-emerald-300' : 'bg-emerald-50/40 border-emerald-200 text-emerald-800'
                      }`}>
                        <code>{JSON.stringify(executionResult.output, null, 2)}</code>
                      </pre>
                    </div>
                  )}

                  {executionError && (
                    <div className="border border-amber-800/80 rounded-xl bg-amber-950/20 p-4">
                      <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2 font-semibold">
                        <AlertCircle className="h-4 w-4" />
                        <span>Fail-Safe Activated: Financial hold released ($0.00 charged)</span>
                      </div>
                      <pre className="text-xs font-mono text-amber-300">
                        <code>{executionError}</code>
                      </pre>
                    </div>
                  )}

                  {/* Isolated Guest Module Inspector */}
                  <div className={`pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-mono font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        ISOLATED GUEST CODE (app.js)
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedTool.generatedCode)}
                        className={`text-[11px] font-mono flex items-center gap-1 ${
                          isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className={`border rounded-xl p-3.5 text-xs font-mono overflow-x-auto max-h-48 leading-relaxed ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <code>{selectedTool.generatedCode}</code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className={`border rounded-2xl p-12 text-center text-xs font-mono ${
                  isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-400'
                }`}>
                  Select an endpoint from the catalog to run tests and inspect telemetry.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: COMPILER STUDIO (NATURAL LANGUAGE -> FIRECRACKER MICRO-VM)
        ========================================================================= */}
        {activeTab === 'forge' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left Prompt & Configuration Column */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className={`border rounded-2xl p-6 transition-colors ${
                isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-base font-semibold flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                    <FileCode2 className="h-4 w-4 text-indigo-400" />
                    <span>Micro-Tool Specification</span>
                  </h2>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    Agent Compiler
                  </span>
                </div>
                <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Describe your tool requirements. The agent synthesizes TypeScript logic, boots an ephemeral CreateOS Firecracker micro-VM to execute tests, and wires Stripe machine billing rails.
                </p>

                <form onSubmit={handleForge}>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Build an API that takes messy markdown text, extracts all hyperlinks, strips syntax, and outputs clean plaintext with word counts..."
                    className={`w-full border rounded-xl p-3 text-xs font-mono transition-colors resize-none leading-relaxed focus:outline-none ${
                      isDark 
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-indigo-500 placeholder-zinc-600' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 placeholder-slate-400'
                    }`}
                  />

                  {/* Preset Pills */}
                  <div className="mt-3">
                    <span className={`text-[11px] font-mono block mb-1.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      Quick Templates:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPrompt('Build an API that takes markdown text, extracts all hyperlinks, strips syntax, and outputs clean plaintext with word counts')}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                          isDark 
                            ? 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/60 text-zinc-300' 
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        }`}
                      >
                        Markdown Sanitizer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt('Convert raw CSV table data into typed batched SQL INSERT statements')}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                          isDark 
                            ? 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/60 text-zinc-300' 
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        }`}
                      >
                        CSV to SQL Generator
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompt('Validate arbitrary JSON payloads, infer schema types, and format output cleanly with byte size statistics')}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                          isDark 
                            ? 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/60 text-zinc-300' 
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        }`}
                      >
                        JSON Schema Inspector
                      </button>
                    </div>
                  </div>

                  {/* Price Setting */}
                  <div className={`mt-5 pt-4 border-t flex items-center justify-between ${
                    isDark ? 'border-zinc-800/80' : 'border-slate-200'
                  }`}>
                    <div>
                      <span className={`text-xs font-semibold block ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                        Per-Call Execution Price
                      </span>
                      <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        Stripe machine payment tier
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 border rounded-xl p-1 ${
                      isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      {[5, 10, 25, 50].map((cents) => (
                        <button
                          key={cents}
                          type="button"
                          onClick={() => setPriceCents(cents)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                            priceCents === cents
                              ? 'bg-indigo-600 text-white font-medium'
                              : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900')
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
                    className="mt-5 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isForging ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Compiling & Running Firecracker Tests...</span>
                      </>
                    ) : (
                      <>
                        <TerminalSquare className="h-4 w-4" />
                        <span>Compile, Verify & Provision</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Security Standards Callout */}
              <div className={`border rounded-2xl p-4 text-xs font-mono transition-colors ${
                isDark ? 'bg-zinc-900/20 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Kaggle Vibe Coding Security Certified</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Guest modules execute inside isolated CreateOS Firecracker micro-VMs with eBPF network boundaries. Secrets remain in host memory and are never exposed to guest runtimes.
                </p>
              </div>
            </div>

            {/* Right Diagnostic Terminal / Pipeline Column */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className={`border rounded-2xl p-6 flex flex-col gap-4 transition-colors ${
                isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-indigo-400" />
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                      CreateOS Sandbox Telemetry
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Firecracker Cluster Ready
                    </span>
                  </div>
                </div>

                {/* Status Ticker / Telemetry Steps */}
                {forgeSteps.length > 0 ? (
                  <div className="space-y-2.5 font-mono text-xs">
                    {forgeSteps.map((step, idx) => (
                      <div key={idx} className={`border rounded-xl p-3.5 ${
                        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {step.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                            {step.status === 'running' && <RefreshCw className="h-4 w-4 text-blue-400 animate-spin shrink-0" />}
                            {step.status === 'failed' && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />}
                            <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{step.label}</span>
                          </div>
                          <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {step.timestamp?.slice(11, 19)}
                          </span>
                        </div>
                        {step.detail && (
                          <div className={`mt-2 text-[11px] pl-5 border-l ml-2 ${
                            isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-300 text-slate-600'
                          }`}>
                            {step.detail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ALIVE IDLE TELEMETRY STATE */
                  <div className={`border rounded-xl p-5 font-mono text-xs space-y-2.5 ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-slate-900 text-zinc-200 border-slate-800'
                  }`}>
                    <div className="text-emerald-400 flex items-center justify-between pb-2 border-b border-zinc-800">
                      <span>// Live Micro-VM Telemetry Stream</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Micro-VM Hypervisor:</span>
                      <span className="text-white font-semibold">AWS Firecracker v1.7.0</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Kernel Architecture:</span>
                      <span className="text-white font-semibold">Linux 6.1.102 (eBPF Sandboxed)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Sandbox Image:</span>
                      <span className="text-white font-semibold">devbox:1 (s-1vcpu-1gb)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Memory Cap:</span>
                      <span className="text-white font-semibold">1024 MB / Container</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Stripe Projects Context:</span>
                      <span className="text-purple-300 font-semibold">acct_1URdRvPmUIoLYsaZ (Rails Active)</span>
                    </div>
                    <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-400">
                      Enter a specification on the left to compile, verify, and deploy a live monetized micro-tool.
                    </div>
                  </div>
                )}

                {/* Output Inspector once compiled */}
                {currentTool && (
                  <div className={`mt-2 pt-4 border-t flex flex-col gap-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveCodeTab('code')}
                          className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors ${
                            activeCodeTab === 'code' 
                              ? (isDark ? 'bg-zinc-800 text-white' : 'bg-slate-200 text-slate-900') 
                              : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-800')
                          }`}
                        >
                          Module (app.js)
                        </button>
                        <button
                          onClick={() => setActiveCodeTab('test')}
                          className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors ${
                            activeCodeTab === 'test' 
                              ? (isDark ? 'bg-zinc-800 text-white' : 'bg-slate-200 text-slate-900') 
                              : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-800')
                          }`}
                        >
                          Test Suite (test.js)
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(activeCodeTab === 'code' ? currentTool.generatedCode : currentTool.testSuite)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-colors ${
                            isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTool(currentTool);
                            setPlaygroundInput(JSON.stringify(currentTool.sampleInput, null, 2));
                            setActiveTab('workbench');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <span>Test in Workbench</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <pre className={`border rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
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
            {/* Two-Phase Commit State Machine Protocol Graphic */}
            <div className={`border rounded-2xl p-6 transition-colors ${
              isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-indigo-400" />
                <h3 className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  Two-Phase Commit Protocol: Zero Financial Risk
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className={`border rounded-xl p-4 relative ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] text-blue-400 font-bold mb-1">PHASE 01 / PRE-AUTH</div>
                  <div className={`text-sm font-semibold mb-1.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                    Stripe Hold Reserved
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Stripe authorization hold placed via machine credentials. Funds are temporarily earmarked; no charge is settled yet.
                  </p>
                </div>

                <div className={`border rounded-xl p-4 relative ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] text-purple-400 font-bold mb-1">PHASE 02 / EXECUTION</div>
                  <div className={`text-sm font-semibold mb-1.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                    CreateOS Micro-VM Run
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Guest code executes in isolated Linux container with memory caps and strict 5000ms hardware timeout watchdog.
                  </p>
                </div>

                <div className={`border rounded-xl p-4 relative ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[10px] text-emerald-400 font-bold mb-1">PHASE 03 / SETTLEMENT</div>
                  <div className={`text-sm font-semibold mb-1.5 text-emerald-400`}>
                    Capture or Auto-Release
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Exit Code 0 $\to$ Funds captured to seller. Runtime error or timeout $\to$ Hold released instantly, buyer billed $0.00.
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className={`border rounded-2xl p-6 overflow-hidden transition-colors ${
              isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                    Append-Only Financial Audit Trail
                  </h3>
                </div>
                <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  {ledger.length} immutable records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className={`border-b text-[11px] ${
                    isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">TIMESTAMP</th>
                      <th className="py-2.5 px-3">MICRO-TOOL</th>
                      <th className="py-2.5 px-3">EVENT</th>
                      <th className="py-2.5 px-3">AMOUNT</th>
                      <th className="py-2.5 px-3">AUDIT DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200'}`}>
                    {ledger.map((entry) => (
                      <tr key={entry.id} className={isDark ? 'hover:bg-zinc-900/40' : 'hover:bg-slate-50'}>
                        <td className={`py-2.5 px-3 text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {entry.timestamp.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className={`py-2.5 px-3 font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                          {entry.toolName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.entryType === 'PAYMENT_CAPTURED'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : entry.entryType === 'HOLD_RESERVED'
                                ? (isDark ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-200 text-slate-800 border-slate-300')
                                : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                            }`}
                          >
                            {entry.entryType}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 font-medium ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                          {entry.amountCents > 0 ? `+$${(entry.amountCents / 100).toFixed(2)}` : '$0.00'}
                        </td>
                        <td className={`py-2.5 px-3 text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                          {entry.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: API & AGENT INTEGRATION DOCUMENTATION (NEW)
        ========================================================================= */}
        {activeTab === 'docs' && (
          <div className="flex flex-col gap-6 flex-1">
            <div className={`border rounded-2xl p-6 transition-colors ${
              isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Agent Integration & Developer Protocol
                </h2>
              </div>
              <p className={`text-xs max-w-3xl leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Learn how autonomous agents, LangChain pipelines, Cursor, and backend microservices discover, execute, and pay for MicroForge tools via machine rails.
              </p>

              {/* Integration Modes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className={`p-4 rounded-xl border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
                    <Webhook className="h-4 w-4" />
                    <span>Mode 1: Zero-Install Black-Box API</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    External agents invoke `POST /api/execute` with arbitrary JSON payloads. Code runs inside CreateOS Firecracker micro-VMs without exposing guest code or host secrets.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                    <Code2 className="h-4 w-4" />
                    <span>Mode 2: OpenAPI & MCP Function Calling</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Agents query `GET /api/tools` to ingest dynamic Model Context Protocol (MCP) tool schemas, enabling autonomous agents to choose and invoke tools on the fly.
                  </p>
                </div>
              </div>

              {/* Code Integration Explorer */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xs font-mono font-bold tracking-wider ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    INTEGRATION CODE EXAMPLES
                  </h3>

                  {/* Language Switcher */}
                  <div className={`flex items-center gap-1 border rounded-lg p-1 text-xs font-mono ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    {(['curl', 'node', 'python', 'langchain'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setDocsLang(lang)}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          docsLang === lang
                            ? 'bg-indigo-600 text-white font-medium'
                            : (isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900')
                        }`}
                      >
                        {lang === 'curl' ? 'cURL' : lang === 'node' ? 'Node.js' : lang === 'python' ? 'Python' : 'LangChain / MCP'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Block */}
                <div className={`border rounded-xl overflow-hidden ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-900 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                    <span>Example: Calling Markdown Sanitizer via Two-Phase Commit</span>
                    <button
                      onClick={() => copyToClipboard(
                        docsLang === 'curl' 
                          ? `curl -X POST https://southen-microforge.vercel.app/api/execute \\\n  -H "Content-Type: application/json" \\\n  -d '{"toolId": "tool_markdown_sanitizer", "inputPayload": {"text": "# Hello world"}}'`
                          : docsLang === 'node'
                          ? `const res = await fetch('https://southen-microforge.vercel.app/api/execute', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    toolId: 'tool_markdown_sanitizer',\n    inputPayload: { text: '# Hello world' }\n  })\n});\nconst data = await res.json();\nconsole.log(data);`
                          : docsLang === 'python'
                          ? `import requests\n\nres = requests.post(\n  'https://southen-microforge.vercel.app/api/execute',\n  json={\n    'toolId': 'tool_markdown_sanitizer',\n    'inputPayload': {'text': '# Hello world'}\n  }\n)\nprint(res.json())`
                          : `from langchain.tools import Tool\nimport requests\n\ndef run_microforge_tool(text: str):\n    res = requests.post(\n        'https://southen-microforge.vercel.app/api/execute',\n        json={'toolId': 'tool_markdown_sanitizer', 'inputPayload': {'text': text}}\n    )\n    return res.json().get('output')\n\nmicro_tool = Tool(\n    name='MarkdownSanitizer',\n    func=run_microforge_tool,\n    description='Sanitizes raw markdown and extracts links via CreateOS Firecracker VM'\n)`
                      )}
                      className="hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
                    <code>
                      {docsLang === 'curl' && `curl -X POST https://southen-microforge.vercel.app/api/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "toolId": "tool_markdown_sanitizer",
    "inputPayload": {
      "text": "# Hackathon Announcement\\nVisit [Stripe](https://stripe.com) and [CreateOS](https://createos.sh)!"
    }
  }'`}
                      {docsLang === 'node' && `// Node.js (v18+) Native Fetch
const res = await fetch('https://southen-microforge.vercel.app/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toolId: 'tool_markdown_sanitizer',
    inputPayload: {
      text: '# Hackathon Announcement\\nVisit [Stripe](https://stripe.com)'
    }
  })
});

const data = await res.json();
console.log('Sandbox Output:', data.output);
console.log('Latency:', data.durationMs, 'ms');`}
                      {docsLang === 'python' && `import requests

url = "https://southen-microforge.vercel.app/api/execute"
payload = {
    "toolId": "tool_markdown_sanitizer",
    "inputPayload": {
        "text": "# Hackathon Announcement\\nVisit [Stripe](https://stripe.com)"
    }
}

response = requests.post(url, json=payload)
data = response.json()

print(f"Status: {data['state']}")
print(f"Output: {data['output']}")`}
                      {docsLang === 'langchain' && `from langchain.tools import Tool
import requests

def call_microforge(payload_str: str):
    """Invokes sandboxed CreateOS micro-tool with Stripe Two-Phase settlement."""
    url = "https://southen-microforge.vercel.app/api/execute"
    res = requests.post(url, json={
        "toolId": "tool_markdown_sanitizer",
        "inputPayload": {"text": payload_str}
    })
    return res.json().get("output")

microforge_tool = Tool(
    name="MarkdownSanitizer",
    func=call_microforge,
    description="Sanitizes markdown text and extracts URLs inside an isolated Firecracker micro-VM"
)`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Developer Console / Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md border rounded-2xl p-6 shadow-2xl relative transition-all ${
            isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setShowAuthModal(false)}
              className={`absolute right-4 top-4 p-1 rounded-lg transition-colors ${
                isDark ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-base">Developer Console Profile</h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>CreateOS & Stripe Projects Auth</p>
              </div>
            </div>

            {/* Profile Info Card */}
            <div className={`p-4 rounded-xl border mb-4 space-y-3 font-mono text-xs ${
              isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Account Identity:</span>
                <span className="font-semibold text-emerald-400">southen03@gmail.com</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Cluster Plan:</span>
                <span className="font-semibold text-indigo-400">CreateOS Pro (10 vCPUs)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Stripe Connect:</span>
                <span className="font-semibold text-purple-400">acct_1URdRvPmUIoLYsaZ</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Live Machine API Key:</span>
                  <button
                    onClick={copyApiKey}
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedApiKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedApiKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className={`p-2 rounded border font-mono text-[11px] truncate ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  sk_forge_live_9a87f2b1c4e9082ac33d
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition-colors"
            >
              Close Console Window
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`border-t py-6 px-6 text-xs font-mono transition-colors ${
        isDark ? 'border-zinc-800/80 text-zinc-500' : 'border-slate-200 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-zinc-400">MicroForge</span>
            <span>·</span>
            <span>Built for CreateOS × Stripe Projects Hackathon (Oct 2026)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-500">● CreateOS Firecracker Nodes Ready</span>
            <span className="text-purple-400">● Stripe Rails Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
