"use client";

import React, { useState } from 'react';
import { 
  Save, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Settings2,
  Percent,
  CreditCard,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateBenefitRule, createBenefitRule, deleteBenefitRule } from "@/app/settings/benefits/actions";

interface BenefitRule {
  id: number;
  pattern: string;
  rate: number;
  maxLimit: number;
  label: string;
  isActive: boolean;
}

interface BenefitRuleManagerProps {
  initialRules: BenefitRule[];
}

export default function BenefitRuleManager({ initialRules }: BenefitRuleManagerProps) {
  const [rules, setRules] = useState<BenefitRule[]>(initialRules);
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [status, setStatus] = useState<{ id: number, type: 'success' | 'error', message: string } | null>(null);

  const handleUpdate = async (id: number) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    setIsSaving(id);
    const result = await updateBenefitRule(id, {
      rate: rule.rate,
      maxLimit: rule.maxLimit,
      isActive: rule.isActive,
      label: rule.label
    });

    setIsSaving(null);
    if (result.success) {
      setStatus({ id, type: 'success', message: '적용되었습니다.' });
      setTimeout(() => setStatus(null), 3000);
    } else {
      setStatus({ id, type: 'error', message: result.error || '실패했습니다.' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 룰을 삭제하시겠습니까?')) return;
    
    const result = await deleteBenefitRule(id);
    if (result.success) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  const handleAddField = () => {
    // This is a simplified approach; in a real app you'd have a separate form
    const pattern = prompt('정규식 패턴을 입력하세요 (예: 페이코머니.*5만)');
    if (!pattern) return;
    
    const label = prompt('표시될 라벨을 입력하세요 (예: 페이코머니 3% 할인)');
    if (!label) return;

    createBenefitRule({
      pattern,
      label,
      rate: 0.03,
      maxLimit: 50000
    }).then(res => {
      if (res.success) window.location.reload();
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white flex items-center">
            <Settings2 className="mr-3 text-blue-500" size={24} />
            Benefit Policy Engine
          </h2>
          <p className="text-zinc-500 text-sm">결제 혜택 문구에 따른 실질 할인율을 정의합니다.</p>
        </div>
        <button 
          onClick={handleAddField}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} className="mr-2" />
          Add New Rule
        </button>
      </div>

      <div className="grid gap-6">
        {rules.map((rule) => (
          <div key={rule.id} className={cn(
            "glass p-8 rounded-[40px] border-white/[0.03] transition-all relative overflow-hidden",
            !rule.isActive && "opacity-50 grayscale"
          )}>
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Pattern Info */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Target size={14} className="text-zinc-500" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Matching Pattern</span>
                </div>
                <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 font-mono text-sm text-blue-400">
                  {rule.pattern}
                </div>
                <input 
                  type="text" 
                  value={rule.label}
                  onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, label: e.target.value } : r))}
                  className="w-full bg-transparent border-none text-white font-black text-xl focus:ring-0 p-0"
                  placeholder="Rule Label"
                />
              </div>

              {/* Rate & Limit */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Percent size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Discount Rate</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      value={rule.rate}
                      onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, rate: parseFloat(e.target.value) } : r))}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500/50 transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-bold">RATE</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 font-bold">{(rule.rate * 100).toFixed(0)}% 할인 적용</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CreditCard size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Max Limit</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={rule.maxLimit}
                      onChange={(e) => setRules(rules.map(r => r.id === rule.id ? { ...r, maxLimit: parseInt(e.target.value) } : r))}
                      className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500/50 transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-bold">KRW</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 font-bold">최대 {rule.maxLimit.toLocaleString()}원</p>
                </div>
              </div>

              {/* Actions */}
              <div className="lg:col-span-3 flex items-center justify-end space-x-3">
                <button 
                  onClick={() => setRules(rules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    rule.isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-zinc-900 text-zinc-600 border-white/5"
                  )}
                >
                  {rule.isActive ? 'Active' : 'Disabled'}
                </button>
                
                <button 
                  onClick={() => handleUpdate(rule.id)}
                  disabled={isSaving === rule.id}
                  className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  {isSaving === rule.id ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Save size={20} />
                  )}
                </button>

                <button 
                  onClick={() => handleDelete(rule.id)}
                  className="p-3 bg-zinc-900 border border-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {status?.id === rule.id && (
              <div className={cn(
                "mt-6 p-4 rounded-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2",
                status.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
              )}>
                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm font-bold">{status.message}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="glass p-8 rounded-[40px] border-amber-500/20 bg-amber-500/[0.02]">
        <div className="flex items-start space-x-4">
          <AlertCircle className="text-amber-500 shrink-0 mt-1" size={24} />
          <div className="space-y-2">
            <h4 className="font-black text-white uppercase tracking-widest text-sm">Calculation Logic</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">
              할인 금액은 <code className="text-blue-400 bg-zinc-900 px-1 rounded">MIN(상품가 × 할인율, 최대 한도)</code> 로 계산됩니다. 
              패턴은 정규식(Regex)으로 처리되므로, 여러 조건을 조합할 때 주의하세요. 
              변경사항은 저장 즉시 모든 상품의 상세 페이지에 반영됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
