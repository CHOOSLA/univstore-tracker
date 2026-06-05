"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { User as UserIcon, Loader2, Check, Trash2, AlertTriangle } from "lucide-react";
import { updateMyName, deleteMyAccount } from "@/app/settings/actions";

interface Props {
  initialName: string;
  email: string | null;
}

export default function AccountSection({ initialName, email }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const res = await updateMyName(name);
    setSaving(false);
    if (res.success) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const remove = async () => {
    setDeleting(true);
    const res = await deleteMyAccount();
    if (res.success) {
      await signOut({ callbackUrl: "/" });
    } else {
      setDeleting(false);
    }
  };

  return (
    <div className="glass p-8 md:p-10 rounded-[40px] border-white/[0.04] space-y-8">
      <div className="flex items-center gap-2 text-zinc-300">
        <UserIcon size={18} />
        <h3 className="text-lg font-black text-white tracking-tight">계정</h3>
      </div>

      {/* 표시 이름 */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">표시 이름</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="이름"
            className="flex-1 min-w-0 bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={save}
            disabled={saving || !name.trim() || name.trim() === initialName}
            className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 rounded-2xl font-black text-sm flex items-center justify-center min-w-[64px]"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : "저장"}
          </button>
        </div>
        {email && <p className="text-xs text-zinc-600">{email}</p>}
      </div>

      {/* 회원 탈퇴 */}
      <div className="pt-6 border-t border-white/5 space-y-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-red-400/70">위험 구역</p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-sm font-black text-zinc-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={15} /> 회원 탈퇴
          </button>
        ) : (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-2 text-red-400">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm font-bold leading-relaxed">
                탈퇴하면 계정과 모든 데이터(관심상품·목표가·텔레그램 연동)가 삭제되고 즉시 로그아웃됩니다. 같은 소셜 계정으로 다시 로그인하면 새 계정으로 시작됩니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={remove}
                disabled={deleting}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-black text-sm"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} 탈퇴 확정
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl font-black text-sm text-zinc-400 hover:text-white border border-white/10"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
