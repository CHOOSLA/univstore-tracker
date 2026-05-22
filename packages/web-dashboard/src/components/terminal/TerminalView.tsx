"use client";

import React, { useEffect, useState } from 'react';
import { 
  Terminal as TerminalIcon, 
  Activity, 
  Zap, 
  Database, 
  Cpu, 
  HardDrive, 
  RefreshCcw, 
  Play, 
  Clock,
  Info,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { restartCrawler, restartAllNodes, executeSystemCommand } from "@/app/terminal/actions";

interface SystemLogEntry {
  id: number;
  time: string;
  type: string;
  service: string;
  message: string;
}

interface DataIssueEntry {
  id: number;
  productId: string;
  type: string;
  message: string;
  timestamp: string;
}

interface TerminalViewProps {
  logs: SystemLogEntry[];
  dataIssues: DataIssueEntry[];
  queueSize: number;
  totalProducts: number;
  totalHistory: number;
  crawlerStatus: {
    totalItems: number;
    currentIndex: number;
    lastStatus: string;
    lastHeartbeat: string;
  } | null;
  storageMetrics: {
    diskUsed: string;
    diskTotal: string;
    diskPercent: number;
    dbSize: string;
  };
}

export default function TerminalView({ 
  logs: initialLogs, 
  dataIssues, 
  queueSize, 
  totalProducts, 
  totalHistory: initialHistory, 
  crawlerStatus: initialStatus,
  storageMetrics
}: TerminalViewProps) {
  const [mounted, setMounted] = useState(false);
  const [command, setCommand] = useState('');
  const [localLogs, setLocalLogs] = useState<any[]>([]);
  const [dbLogs, setDbLogs] = useState(initialLogs);
  const [liveStatus, setLiveStatus] = useState(initialStatus);
  const [liveHistory, setLiveHistory] = useState(initialHistory);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // SSE 연결 설정
    const eventSource = new EventSource('/api/terminal/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.logs) setDbLogs(data.logs);
        if (data.crawlerStatus) setLiveStatus(data.crawlerStatus);
        if (data.totalHistory) setLiveHistory(data.totalHistory);
      } catch (e) {
        console.error("SSE parsing error", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection Failed:", err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const cmd = command.trim();
    setCommand('');
    setIsProcessing(true);

    const result = await executeSystemCommand(cmd);
    setIsProcessing(false);

    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      type: result.success ? 'SUCCESS' : 'WARNING',
      service: 'SYSTEM',
      message: result.success ? `Result: ${result.output}` : `Error: ${result.error}`
    };

    setLocalLogs(prev => [newLog, ...prev]);
  };

  const handleRestartCrawler = async () => {
    if (!confirm('크롤러를 재시작하시겠습니까?')) return;
    setIsProcessing(true);
    const res = await restartCrawler();
    setIsProcessing(false);
    if (res.success) alert('크롤러 재시작 명령이 전송되었습니다.');
  };

  const handleRestartAll = async () => {
    if (!confirm('모든 노드를 재시작하시겠습니까?')) return;
    setIsProcessing(true);
    const res = await restartAllNodes();
    setIsProcessing(false);
    if (res.success) alert('전체 재시작 명령이 전송되었습니다.');
  };

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Console...</div>;
  }

  const currentIdx = liveStatus?.currentIndex || 0;
  const totalItems = liveStatus?.totalItems || 32979;
  const progressPercent = totalItems > 0 ? Math.min(Math.round((currentIdx / totalItems) * 100), 100) : 0;
  
  const isBlocked = liveStatus?.lastStatus === 'BLOCKED';
  const isRunning = liveStatus?.lastStatus === 'RUNNING';

  return (
    <div className="pb-20 bg-zinc-950" suppressHydrationWarning>
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 space-y-6 md:space-y-10">
        
        {/* Progress Hub Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3 md:space-y-4">
            <div className="flex items-center space-x-3 text-emerald-500">
              <div className={cn(
                "w-2 md:w-2.5 h-2 md:h-2.5 rounded-full animate-pulse",
                isRunning ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : 
                isBlocked ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-zinc-700"
              )} />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">
                {isRunning ? "Pipeline Active" : isBlocked ? "Pipeline Blocked" : "System Standby"}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-none">The Terminal.</h1>
            
            <div className="pt-4 md:pt-6 space-y-3 md:space-y-4 max-w-2xl">
               <div className="flex justify-between items-end">
                  <div className="space-y-0.5 md:space-y-1">
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">Global Scan Depth</p>
                    <p className="text-xl md:text-3xl font-black text-white">{currentIdx.toLocaleString()} <span className="text-zinc-700 text-sm md:text-base font-bold">/ {totalItems.toLocaleString()} items</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-0.5 md:mb-1">Coverage</p>
                    <p className="text-2xl md:text-4xl font-black text-emerald-500 tracking-tighter">{progressPercent}%</p>
                  </div>
               </div>
               <div className="h-3 md:h-4 w-full bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden p-1">
                  <div 
                    className={cn(
                      "h-full rounded-xl transition-all duration-1000 ease-out",
                      isBlocked ? "bg-red-500" : "bg-gradient-to-r from-blue-600 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    )}
                    style={{ width: `${progressPercent}%` }} 
                  />
               </div>
            </div>
          </div>
          
          <div className="lg:col-span-4 flex justify-start lg:justify-end space-x-2 md:space-x-3 pt-4 lg:pt-10">
             <button 
               onClick={handleRestartCrawler}
               disabled={isProcessing}
               className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-emerald-500 text-black px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50"
             >
               <Play size={14} fill="currentColor" />
               <span>Resume</span>
             </button>
             <button 
               onClick={handleRestartAll}
               disabled={isProcessing}
               className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-zinc-900 border border-white/10 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
             >
               <RefreshCcw size={14} />
               <span>Restart</span>
             </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
           <div className="lg:col-span-8">
              <div className="glass rounded-[32px] md:rounded-[40px] border-white/5 bg-zinc-900/30 overflow-hidden flex flex-col h-[500px] md:h-[650px] relative">
                 <div className="bg-zinc-950/80 px-4 md:px-8 py-3 md:py-4 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
                    <div className="flex items-center space-x-3">
                       <div className="hidden sm:flex space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                       </div>
                       <span className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest sm:ml-4 font-mono truncate">root@univwatch:~# live_telemetry</span>
                    </div>
                    <button onClick={() => setLocalLogs([])} className="text-[9px] md:text-[10px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">Clear</button>
                 </div>

                 <div className="flex-1 p-4 md:p-8 font-mono text-[11px] md:text-sm space-y-2 md:space-y-3 overflow-y-auto custom-scrollbar">
                    {localLogs.map((log) => (
                      <div key={log.id} className="flex space-x-3 md:space-x-4 text-emerald-400 animate-in fade-in slide-in-from-left-2 duration-300">
                         <span className="text-zinc-700 shrink-0">[{log.time}]</span>
                         <span className="font-black shrink-0 w-12 md:w-16">[{log.type}]</span>
                         <span className="whitespace-pre-wrap">{log.message}</span>
                      </div>
                    ))}
                    {dbLogs.length > 0 ? dbLogs.map((log) => (
                      <div key={log.id} className="flex space-x-3 md:space-x-4 animate-in fade-in slide-in-from-left-2 duration-300">
                         <span className="text-zinc-700 shrink-0">[{log.time}]</span>
                         <span className={cn(
                           "font-black shrink-0 w-12 md:w-16",
                           log.type === 'SUCCESS' ? "text-emerald-500" : 
                           log.type === 'ALERT' ? "text-blue-500" :
                           log.type === 'WARNING' ? "text-amber-500" : "text-zinc-500"
                         )}>[{log.type}]</span>
                         <span className="text-zinc-400">[{log.service}] {log.message}</span>
                      </div>
                    )) : (
                      <div className="text-zinc-700 italic">Connecting to live feed...</div>
                    )}
                    <div className="flex items-center space-x-2 text-zinc-500">
                       <span className="animate-pulse">_</span>
                    </div>
                 </div>

                 <form onSubmit={handleCommand} className="bg-zinc-950 px-4 md:px-8 py-3 md:py-5 border-t border-white/5 flex items-center space-x-3 md:space-x-4">
                    <span className="text-emerald-500 font-bold font-mono">$</span>
                    <input 
                      type="text" 
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="Execute command..." 
                      className="bg-transparent border-none focus:outline-none text-zinc-300 w-full text-xs md:text-sm font-mono placeholder:text-zinc-700"
                      disabled={isProcessing}
                    />
                    {isProcessing && <Loader2 size={14} className="animate-spin text-zinc-600" />}
                 </form>
              </div>
           </div>

           <div className="lg:col-span-4 space-y-6">
              {/* Storage Node */}
              <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] border-white/[0.03] space-y-5 md:space-y-6">
                 <div className="flex justify-between items-center px-1 md:px-2">
                    <h3 className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center">
                       <HardDrive size={14} className="mr-2 text-amber-500" />
                       Storage Node
                    </h3>
                    <span className="hidden sm:block text-[9px] md:text-[10px] font-black text-amber-500/50 uppercase tracking-tighter">SSD Optimized</span>
                 </div>
                 <div className="space-y-5 md:space-y-6">
                    <div className="bg-zinc-950/50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 space-y-3 md:space-y-4">
                       <div className="flex justify-between items-end">
                          <p className="text-[9px] md:text-[10px] font-bold text-zinc-600 uppercase">Disk Usage</p>
                          <p className="text-lg md:text-xl font-black text-white">{storageMetrics.diskUsed} <span className="text-zinc-700 text-[10px] md:text-xs">/ {storageMetrics.diskTotal}</span></p>
                       </div>
                       <div className="h-1.5 md:h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-1000", storageMetrics.diskPercent > 90 ? "bg-red-500" : "bg-amber-500")} style={{ width: `${storageMetrics.diskPercent}%` }} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                       <div className="bg-zinc-950/50 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 space-y-0.5 md:space-y-1">
                          <p className="text-[8px] md:text-[9px] font-bold text-zinc-600 uppercase">Database</p>
                          <p className="text-sm md:text-base font-black text-white truncate">{storageMetrics.dbSize}</p>
                       </div>
                       <div className="bg-zinc-950/50 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 space-y-0.5 md:space-y-1">
                          <p className="text-[8px] md:text-[9px] font-bold text-zinc-600 uppercase">Logs Size</p>
                          <p className="text-sm md:text-base font-black text-emerald-500">Minimal</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] border-white/[0.03] space-y-6 md:space-y-8">
                 <h3 className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest">Database Health</h3>
                 <div className="space-y-5 md:space-y-6">
                    <StatProgressBar label="Index Efficiency" percent={98} color="bg-blue-500" />
                    <StatProgressBar label="Sync Rate" percent={totalProducts > 0 ? 100 : 0} color="bg-emerald-500" />
                    <StatProgressBar label="Error Rate" percent={dbLogs.filter(l => l.type === 'WARNING').length} color="bg-red-500" />
                 </div>
              </div>

              <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] border-white/[0.03] bg-zinc-100/[0.01] space-y-5 md:space-y-6">
                 <h3 className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center">
                    <Zap size={14} className="mr-2 text-blue-500" />
                    Queue Metrics
                 </h3>
                 <div className="aspect-[4/3] w-full bg-zinc-950/50 rounded-xl md:rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
                    <span className="text-blue-400 font-black text-2xl md:text-4xl tracking-tighter">{queueSize === 0 ? "Empty" : "Active"}</span>
                 </div>
                 <div className="grid grid-cols-2 gap-3 md:gap-4 text-center">
                    <div>
                       <p className="text-[9px] md:text-[10px] font-bold text-zinc-600 uppercase">Pending</p>
                       <p className="text-base md:text-lg font-black text-white">{queueSize.toLocaleString()}</p>
                    </div>
                    <div>
                       <p className="text-[9px] md:text-[10px] font-bold text-zinc-600 uppercase">Buffer State</p>
                       <p className={cn("text-sm md:text-lg font-black truncate", queueSize === 0 ? "text-emerald-500" : queueSize < 100 ? "text-blue-500" : queueSize < 500 ? "text-amber-500" : "text-red-500")}>
                         {queueSize === 0 ? "Empty" : queueSize < 100 ? "Stable" : queueSize < 500 ? "Busy" : "Backlogged"}
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

function StatProgressBar({ label, percent, color }: any) {
  return (
    <div className="space-y-1.5 md:space-y-2">
       <div className="flex justify-between text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          <span>{label}</span>
          <span className="text-white">{percent}%</span>
       </div>
       <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percent}%` }} />
       </div>
    </div>
  );
}
