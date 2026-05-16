"use client";

import React from 'react';
import { 
  Terminal, 
  Activity, 
  Zap, 
  Database, 
  Cpu, 
  HardDrive, 
  RefreshCcw, 
  Play, 
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Terminal Mock Data ---
const MOCK_LOGS = [
  { time: '01:42:05', type: 'SUCCESS', msg: '[Crawler] Successfully fetched sitemap. Found 1,242 items.' },
  { time: '01:42:12', type: 'INFO', msg: '[Redis] Pushed batch [138746, 138929] to queue.' },
  { time: '01:42:15', type: 'SUCCESS', msg: '[Worker] Processed ID 138746. Price drop -9.1% detected.' },
  { time: '01:42:16', type: 'ALERT', msg: '[Telegram] Alert sent to Chat ID 7968628859.' },
  { time: '01:43:01', type: 'INFO', msg: '[Crawler] Jitter wait: 2.4s before next request.' },
  { time: '01:43:04', type: 'SUCCESS', msg: '[DB] Upserted product metadata for ID 140221.' },
  { time: '01:43:10', type: 'WARNING', msg: '[Crawler] Page 138002 returned 404 (Not Found). Skipping.' },
];

const NODE_HEALTH = [
  { name: 'Crawler Node', status: 'Active', load: '12%', uptime: '14d 02h', icon: Cpu },
  { name: 'Redis Buffer', status: 'Healthy', load: '0.02ms', uptime: '45d 18h', icon: Zap },
  { name: 'DB Instance', status: 'Optimized', load: '8% CPU', uptime: '180d 04h', icon: Database },
  { name: 'Storage Node', status: 'Healthy', load: '1.2GB/50GB', uptime: 'Unlimited', icon: HardDrive },
];

export default function TerminalPage() {
  return (
    <div className="pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-8">
        
        {/* Page Header */}
        <section className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 text-emerald-500">
              <Terminal size={20} />
              <span className="text-xs font-black uppercase tracking-[0.4em]">System Console</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white">The Terminal.</h1>
          </div>
          <div className="flex space-x-3">
             <button className="flex items-center space-x-2 bg-emerald-500 text-black px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">
               <Play size={14} fill="currentColor" />
               <span>Resume Pipeline</span>
             </button>
             <button className="flex items-center space-x-2 bg-zinc-900 border border-white/10 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
               <RefreshCcw size={14} />
               <span>Restart Nodes</span>
             </button>
          </div>
        </section>

        {/* Infrastructure Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {NODE_HEALTH.map((node) => (
             <div key={node.name} className="glass p-6 rounded-[32px] border-white/[0.03] space-y-6">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5 text-zinc-400">
                      <node.icon size={20} />
                   </div>
                   <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
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
                   <Activity size={14} className="text-emerald-500 opacity-50" />
                </div>
             </div>
           ))}
        </div>

        {/* Main Terminal Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
           
           {/* Live Feed (Left) */}
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
                    {MOCK_LOGS.map((log, i) => (
                      <div key={i} className="flex space-x-4 animate-in fade-in slide-in-from-left-2 duration-300">
                         <span className="text-zinc-700 shrink-0">[{log.time}]</span>
                         <span className={cn(
                           "font-black shrink-0 w-16",
                           log.type === 'SUCCESS' ? "text-emerald-500" : 
                           log.type === 'ALERT' ? "text-blue-500" :
                           log.type === 'WARNING' ? "text-amber-500" : "text-zinc-500"
                         )}>[{log.type}]</span>
                         <span className="text-zinc-400">{log.msg}</span>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2 text-zinc-500">
                       <span className="animate-pulse">_</span>
                    </div>
                 </div>
                 <div className="bg-zinc-950 px-8 py-4 border-t border-white/5 flex items-center space-x-4">
                    <span className="text-emerald-500 font-bold">$</span>
                    <input 
                      type="text" 
                      placeholder="Execute system command..." 
                      className="bg-transparent border-none focus:outline-none text-zinc-400 w-full text-sm font-mono"
                    />
                 </div>
              </div>
           </div>

           {/* System Insights (Right) */}
           <div className="lg:col-span-4 space-y-6">
              <div className="glass p-8 rounded-[40px] border-white/[0.03] space-y-8">
                 <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Database Health</h3>
                 <div className="space-y-6">
                    <StatProgressBar label="Index Efficiency" percent={98} color="bg-blue-500" />
                    <StatProgressBar label="Query Cache Hit" percent={85} color="bg-emerald-500" />
                    <StatProgressBar label="Write Latency" percent={12} color="bg-amber-500" />
                 </div>
                 <div className="pt-4 flex items-start space-x-3 text-zinc-500">
                    <Info className="shrink-0 mt-0.5" size={14} />
                    <p className="text-[11px] leading-relaxed italic">
                      DB 인덱싱이 최적화된 상태입니다. 현재 12.5만 개의 가격 이력을 초당 0.12ms 속도로 조회 가능합니다.
                    </p>
                 </div>
              </div>

              <div className="glass p-8 rounded-[40px] border-white/[0.03] bg-zinc-100/[0.01] space-y-6">
                 <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center">
                    <Zap size={14} className="mr-2 text-blue-500" />
                    Queue Congestion
                 </h3>
                 <div className="aspect-[4/3] w-full bg-zinc-950/50 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
                    <span className="text-blue-500 font-black text-4xl tracking-tighter">Optimal</span>
                 </div>
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                       <p className="text-[10px] font-bold text-zinc-600 uppercase">Pending</p>
                       <p className="text-lg font-black text-white">0</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-zinc-600 uppercase">Processed/m</p>
                       <p className="text-lg font-black text-white">428</p>
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

function Info({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  );
}
