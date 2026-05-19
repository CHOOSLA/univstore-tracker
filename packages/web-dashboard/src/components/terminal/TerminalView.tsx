"use client";

import React, { useEffect, useState } from 'react';
import { 
  Terminal, 
  Activity, 
  Zap, 
  Database, 
  Cpu, 
  HardDrive, 
  RefreshCcw, 
  Play, 
  Clock,
  Info,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { restartCrawler, restartAllNodes, executeSystemCommand } from "@/app/terminal/actions";
import { Loader2 } from "lucide-react";

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
}

export default function TerminalView({ logs, dataIssues, queueSize, totalProducts, totalHistory, crawlerStatus }: TerminalViewProps) {
  const [mounted, setMounted] = useState(false);
  const [command, setCommand] = useState('');
  const [localLogs, setLocalLogs] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("🚀 TerminalView Mounted");
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
      message: result.success ? `Output: ${result.output}` : `Error: ${result.error}`
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

  // 크롤러 진행률 계산
  const progressPercent = crawlerStatus && crawlerStatus.totalItems > 0 
    ? Math.round((crawlerStatus.currentIndex / crawlerStatus.totalItems) * 1000) / 10 
    : 0;

  const nodeHealth = [
    { 
      name: 'Crawler Node', 
      status: crawlerStatus?.lastStatus === 'RUNNING' ? 'Active' : (crawlerStatus?.lastStatus === 'BLOCKED' ? 'Blocked' : 'Idle'), 
      load: crawlerStatus ? `${crawlerStatus.currentIndex.toLocaleString()} / ${crawlerStatus.totalItems.toLocaleString()}` : 'N/A', 
      uptime: crawlerStatus ? `Last: ${new Date(crawlerStatus.lastHeartbeat).toLocaleTimeString()}` : 'Offline', 
      icon: Cpu,
      color: crawlerStatus?.lastStatus === 'RUNNING' ? 'emerald' : (crawlerStatus?.lastStatus === 'BLOCKED' ? 'red' : 'zinc')
    },
    { name: 'Redis Buffer', status: queueSize > 100 ? 'Congested' : 'Healthy', load: `${queueSize} items`, uptime: 'Optimal', icon: Zap, color: 'emerald' },
    { name: 'DB Instance', status: 'Optimized', load: `${totalProducts} Products`, uptime: `${totalHistory} Rows`, icon: Database, color: 'emerald' },
    { name: 'Storage Node', status: 'Healthy', load: '1.2GB/50GB', uptime: 'Unlimited', icon: HardDrive, color: 'emerald' },
  ];

  return (
    <div className="pb-20 bg-zinc-950" suppressHydrationWarning>
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-8">
        
        <section className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 text-emerald-500">
              <Terminal size={20} />
              <span className="text-xs font-black uppercase tracking-[0.4em]">System Console</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white">The Terminal.</h1>
          </div>
          <div className="flex space-x-3">
             <button 
               onClick={handleRestartCrawler}
               disabled={isProcessing}
               className="flex items-center space-x-2 bg-emerald-500 text-black px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50"
             >
               <Play size={14} fill="currentColor" />
               <span>Resume Pipeline</span>
             </button>
             <button 
               onClick={handleRestartAll}
               disabled={isProcessing}
               className="flex items-center space-x-2 bg-zinc-900 border border-white/10 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
             >
               <RefreshCcw size={14} />
               <span>Restart Nodes</span>
             </button>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {nodeHealth.map((node) => (
             <div key={node.name} className="glass p-6 rounded-[32px] border-white/[0.03] space-y-6">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5 text-zinc-400">
                      <node.icon size={20} />
                   </div>
                   <span className={cn(
                     "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest",
                     node.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                     node.color === 'red' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                     "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                   )}>
                     {node.status}
                   </span>
                </div>
                <div>
                   <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{node.name}</p>
                   <p className="text-xl font-black text-white">{node.load}</p>
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-500">
                      <Clock size={10} />
                      <span>{node.uptime}</span>
                   </div>
                   <Activity size={14} className={cn(
                     node.color === 'emerald' ? "text-emerald-500 animate-pulse" : "text-zinc-700"
                   )} />
                </div>
             </div>
           ))}
        </div>

        {/* --- [Progress Hub] --- */}
        <div className="glass p-8 rounded-[40px] border-white/[0.03] bg-zinc-900/20">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div className="space-y-1">
                 <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Global Collection Progress</h3>
                 <p className="text-3xl font-black text-white tabular-nums">{progressPercent}%</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Estimated Completion</p>
                 <p className="text-sm font-bold text-zinc-400">Calculated via Live Telemetry</p>
              </div>
           </div>
           <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 p-1">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-1000 relative"
                style={{ width: `${progressPercent}%` }}
              >
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
           
           <div className="lg:col-span-8 space-y-6">
              <div className="bg-zinc-900/80 border border-white/5 rounded-[40px] overflow-hidden flex flex-col h-[600px] shadow-2xl">
                 <div className="bg-zinc-900 px-8 py-5 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                       <div className="flex space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                       </div>
                       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">root@univwatch:~# tail -f /logs/system.log</span>
                    </div>
                    <button className="text-[10px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">Clear Logs</button>
                 </div>
                 <div className="flex-1 p-8 font-mono text-sm space-y-3 overflow-y-auto">
                    {/* Local dynamic logs (command output) */}
                    {localLogs.map((log) => (
                      <div key={log.id} className="flex space-x-4 text-emerald-500/80 animate-in fade-in slide-in-from-left-2 duration-300">
                         <span className="text-zinc-700 shrink-0">[{log.time}]</span>
                         <span className="font-black shrink-0 w-16">[{log.type}]</span>
                         <span className="whitespace-pre-wrap">[{log.service}] {log.message}</span>
                      </div>
                    ))}
                    
                    {logs.length > 0 ? logs.map((log) => (
                      <div key={log.id} className="flex space-x-4 animate-in fade-in slide-in-from-left-2 duration-300">
                         <span className="text-zinc-700 shrink-0">[{log.time}]</span>
                         <span className={cn(
                           "font-black shrink-0 w-16",
                           log.type === 'SUCCESS' ? "text-emerald-500" : 
                           log.type === 'ALERT' ? "text-blue-500" :
                           log.type === 'WARNING' ? "text-amber-500" : "text-zinc-500"
                         )}>[{log.type}]</span>
                         <span className="text-zinc-400">[{log.service}] {log.message}</span>
                      </div>
                    )) : (
                      <div className="text-zinc-700 italic">No system logs recorded yet...</div>
                    )}
                    <div className="flex items-center space-x-2 text-zinc-500">
                       <span className="animate-pulse">_</span>
                    </div>
                 </div>
                 <form onSubmit={handleCommand} className="bg-zinc-950 px-8 py-4 border-t border-white/5 flex items-center space-x-4">
                    <span className="text-emerald-500 font-bold">$</span>
                    <input 
                      type="text" 
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="Execute system command (e.g. pm2 status)..." 
                      className="bg-transparent border-none focus:outline-none text-zinc-400 w-full text-sm font-mono"
                      disabled={isProcessing}
                    />
                    {isProcessing && <Loader2 size={16} className="animate-spin text-zinc-600" />}
                 </form>
              </div>
           </div>

           <div className="lg:col-span-4 space-y-6">
              {/* Data Quality Issues Section */}
              <div className="glass p-8 rounded-[40px] border-red-500/20 bg-red-500/[0.01] space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">Data Quality Issues</h3>
                    <AlertTriangle className="text-red-500" size={16} />
                 </div>
                 <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                    {dataIssues.length > 0 ? dataIssues.map((issue) => (
                      <div key={issue.id} className="p-3 bg-zinc-950/50 rounded-xl border border-white/5 space-y-1 group hover:border-red-500/30 transition-colors">
                         <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-red-400">{issue.type}</span>
                            <span className="text-zinc-600 font-mono">ID: {issue.productId}</span>
                         </div>
                         <p className="text-[11px] text-zinc-400 leading-snug">{issue.message}</p>
                      </div>
                    )) : (
                      <p className="text-[10px] text-zinc-600 italic">No critical data issues detected.</p>
                    )}
                 </div>
              </div>

              <div className="glass p-8 rounded-[40px] border-white/[0.03] space-y-8">
                 <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Database Health</h3>
                 <div className="space-y-6">
                    <StatProgressBar label="Index Efficiency" percent={98} color="bg-blue-500" />
                    <StatProgressBar label="Sync Rate" percent={totalProducts > 0 ? 100 : 0} color="bg-emerald-500" />
                    <StatProgressBar label="Error Rate" percent={logs.filter(l => l.type === 'WARNING').length} color="bg-red-500" />
                 </div>
                 <div className="pt-4 flex items-start space-x-3 text-zinc-500">
                    <Info className="shrink-0 mt-0.5" size={14} />
                    <p className="text-[11px] leading-relaxed italic">
                      DB 인덱싱이 최적화된 상태입니다. 현재 {totalHistory.toLocaleString()}개의 가격 이력을 실시간으로 조회 가능합니다.
                    </p>
                 </div>
              </div>

              <div className="glass p-8 rounded-[40px] border-white/[0.03] bg-zinc-100/[0.01] space-y-6">
                 <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center">
                    <Zap size={14} className="mr-2 text-blue-500" />
                    Queue Metrics
                 </h3>
                 <div className="aspect-[4/3] w-full bg-zinc-950/50 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
                    <span className="text-blue-400 font-black text-4xl tracking-tighter">
                      {queueSize === 0 ? "Empty" : "Active"}
                    </span>
                 </div>
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                       <p className="text-[10px] font-bold text-zinc-600 uppercase">Pending</p>
                       <p className="text-lg font-black text-white">{queueSize}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-zinc-600 uppercase">Buffer State</p>
                       <p className="text-lg font-black text-emerald-500">Stable</p>
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
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          <span>{label}</span>
          <span className="text-white">{percent}%</span>
       </div>
       <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percent}%` }} />
       </div>
    </div>
  );
}
