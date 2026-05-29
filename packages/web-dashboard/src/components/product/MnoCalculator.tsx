"use client";

import React, { useMemo, useState } from "react";
import { Calculator, Smartphone, Phone, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MnoPhonePlan {
  id: number;
  name: string;
  monthPrice: number;
  dataAmount?: string | null;
  voiceAmount?: string | null;
  publicDeviceChangeAmount: number;
  publicNumberPortabilityAmount: number;
  publicNewSubscriptionAmount: number;
  additionalPublicDeviceAmount: number;
  additionalPublicNumberAmount: number;
  additionalPublicNewAmount: number;
  additionalOptionalDeviceAmount: number;
  additionalOptionalNumberAmount: number;
  additionalOptionalNewAmount: number;
  isDefault: boolean;
}

export interface MnoOptionData {
  deviceColors: string[];
  deviceCapacities: string[];
  registrationTypes: string[];
  baseColor: string | null;
  baseCapacity: string | null;
  phonePlans: MnoPhonePlan[];
}

interface Props {
  devicePrice: number; // price2 = 기기 가격 (기본 옵션 기준)
  option: MnoOptionData;
}

type RegistrationType = "DEVICE_CHANGE" | "NUMBER_CHANGE" | "NEW";
type ContractMonths = 12 | 24;
type DiscountKind = "PUBLIC" | "OPTIONAL"; // 공시지원금 / 선택약정 25%

const REG_LABEL: Record<RegistrationType, string> = {
  DEVICE_CHANGE: "기기변경",
  NUMBER_CHANGE: "번호이동",
  NEW: "신규가입",
};

/**
 * 통신사 상품 실질 부담금 계산기.
 * 입력: 가입유형, 약정 기간, 요금제, 할인 방식
 * 출력: 월 통신비, 월 기기 할부, 24개월 총액, 공시/선약 차액
 */
export default function MnoCalculator({ devicePrice, option }: Props) {
  const availableRegTypes = (option.registrationTypes.length > 0
    ? option.registrationTypes
    : ["DEVICE_CHANGE", "NUMBER_CHANGE", "NEW"]) as RegistrationType[];

  const defaultPlan = option.phonePlans.find(p => p.isDefault) ?? option.phonePlans[0];
  const [regType, setRegType] = useState<RegistrationType>(availableRegTypes[0]);
  const [contractMonths, setContractMonths] = useState<ContractMonths>(24);
  const [planId, setPlanId] = useState<number>(defaultPlan?.id ?? 0);
  const [discountKind, setDiscountKind] = useState<DiscountKind>("PUBLIC");

  const plan = option.phonePlans.find(p => p.id === planId) ?? defaultPlan;

  const result = useMemo(() => {
    if (!plan) return null;

    // 공시지원금: 가입유형별 base + additional
    const publicSupport = (() => {
      switch (regType) {
        case "DEVICE_CHANGE":
          return plan.publicDeviceChangeAmount + plan.additionalPublicDeviceAmount;
        case "NUMBER_CHANGE":
          return plan.publicNumberPortabilityAmount + plan.additionalPublicNumberAmount;
        case "NEW":
          return plan.publicNewSubscriptionAmount + plan.additionalPublicNewAmount;
      }
    })();

    // 선택약정 25%: 요금제의 25% × 약정개월
    const optionalDiscount = Math.round(plan.monthPrice * 0.25 * contractMonths);

    // 선택약정 시 추가 할인 (가입유형별)
    const optionalExtra = (() => {
      switch (regType) {
        case "DEVICE_CHANGE": return plan.additionalOptionalDeviceAmount;
        case "NUMBER_CHANGE": return plan.additionalOptionalNumberAmount;
        case "NEW":           return plan.additionalOptionalNewAmount;
      }
    })();

    const appliedDiscount = discountKind === "PUBLIC"
      ? publicSupport
      : optionalDiscount + optionalExtra;

    const devicePayable = Math.max(0, devicePrice - appliedDiscount);
    const deviceMonth = Math.round(devicePayable / contractMonths);
    const monthTotal = deviceMonth + plan.monthPrice;
    const contractTotal = monthTotal * contractMonths;

    return {
      publicSupport,
      optionalDiscount: optionalDiscount + optionalExtra,
      appliedDiscount,
      devicePayable,
      deviceMonth,
      monthTotal,
      contractTotal,
    };
  }, [plan, regType, contractMonths, discountKind, devicePrice]);

  if (!plan || !result) return null;

  return (
    <div className="glass rounded-[32px] md:rounded-[40px] p-5 md:p-7 border-white/[0.04] space-y-5 md:space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 pb-4 md:pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Calculator className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-white uppercase tracking-tight">
              실질가 계산기
            </h3>
            <p className="text-[10px] md:text-xs text-zinc-500 font-medium mt-0.5">
              가입유형·약정·요금제 조합별 월 부담금
            </p>
          </div>
        </div>
      </div>

      {/* 옵션 셀렉터 */}
      <div className="space-y-4">
        {/* 가입 유형 */}
        <Selector
          label="가입 유형"
          options={availableRegTypes.map(t => ({ value: t, label: REG_LABEL[t] }))}
          value={regType}
          onChange={v => setRegType(v as RegistrationType)}
        />

        {/* 약정 */}
        <Selector
          label="약정"
          options={[
            { value: "24", label: "24개월" },
            { value: "12", label: "12개월" },
          ]}
          value={String(contractMonths)}
          onChange={v => setContractMonths(Number(v) as ContractMonths)}
        />

        {/* 할인 방식 */}
        <Selector
          label="할인 방식"
          options={[
            { value: "PUBLIC", label: `공시지원금 ₩${result.publicSupport.toLocaleString()}` },
            { value: "OPTIONAL", label: `선택약정 ₩${result.optionalDiscount.toLocaleString()}` },
          ]}
          value={discountKind}
          onChange={v => setDiscountKind(v as DiscountKind)}
        />

        {/* 요금제 (드롭다운) */}
        <div className="space-y-2">
          <label className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest">
            요금제
          </label>
          <select
            value={planId}
            onChange={e => setPlanId(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-xl px-4 py-3 text-sm md:text-base font-bold text-white outline-none transition-colors"
          >
            {option.phonePlans.map(p => (
              <option key={p.id} value={p.id} className="bg-zinc-950">
                {p.name} (₩{p.monthPrice.toLocaleString()}/월)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 결과 */}
      <div className="pt-4 md:pt-5 border-t border-white/5 space-y-3 md:space-y-4">
        <ResultRow
          icon={<Smartphone className="w-3.5 h-3.5" />}
          label="기기 할부"
          sub={`기기가 ₩${devicePrice.toLocaleString()} − 할인 ₩${result.appliedDiscount.toLocaleString()} ÷ ${contractMonths}개월`}
          value={`₩${result.deviceMonth.toLocaleString()}`}
          accent="text-zinc-300"
        />
        <ResultRow
          icon={<Phone className="w-3.5 h-3.5" />}
          label="통신비"
          sub={plan.name}
          value={`₩${plan.monthPrice.toLocaleString()}`}
          accent="text-zinc-300"
        />
        <div className="pt-3 md:pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest">
              월 부담금
            </p>
            <p className="text-[10px] md:text-xs text-zinc-600 font-medium">
              {contractMonths}개월 총 ₩{result.contractTotal.toLocaleString()}
            </p>
          </div>
          <p className="text-2xl md:text-4xl font-black text-amber-400 tabular-nums leading-none">
            ₩{result.monthTotal.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 사용 가능한 옵션 */}
      {(option.deviceColors.length > 0 || option.deviceCapacities.length > 0) && (
        <div className="pt-4 md:pt-5 border-t border-white/5 space-y-2">
          <p className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest">
            사용 가능한 옵션
          </p>
          {option.deviceCapacities.length > 0 && (
            <p className="text-xs md:text-sm text-zinc-400">
              <span className="text-zinc-600">용량 · </span>
              {option.deviceCapacities.join(", ")}
            </p>
          )}
          {option.deviceColors.length > 0 && (
            <p className="text-xs md:text-sm text-zinc-400">
              <span className="text-zinc-600">색상 · </span>
              {option.deviceColors.join(", ")}
            </p>
          )}
          {(option.baseColor || option.baseCapacity) && (
            <p className="text-[10px] md:text-xs text-zinc-600 font-medium">
              기준 옵션: {[option.baseCapacity, option.baseColor].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      )}

      {/* 면책 */}
      <p className="text-[10px] md:text-xs text-zinc-600 leading-relaxed font-medium">
        <CreditCard className="w-3 h-3 inline mr-1 -mt-0.5" />
        선택약정 25%는 약정 기간 동안의 월 통신비 25% 할인 가정. 실제 약관·부가서비스·위약금에 따라 차이가 있을 수 있으니 univstore에서 최종 확인하세요.
      </p>
    </div>
  );
}

function Selector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold border transition-colors",
              value === opt.value
                ? "bg-white text-black border-white"
                : "bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultRow({
  icon,
  label,
  sub,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="text-zinc-500 mt-0.5">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs md:text-sm font-bold text-zinc-300 leading-none">{label}</p>
          <p className="text-[10px] md:text-xs text-zinc-600 font-medium mt-1 truncate">{sub}</p>
        </div>
      </div>
      <p className={cn("font-black tabular-nums shrink-0 text-sm md:text-base", accent)}>{value}</p>
    </div>
  );
}
