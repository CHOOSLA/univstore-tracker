"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Send, QrCode, RefreshCw, CheckCircle, Clipboard } from 'lucide-react';

interface TelegramConnectorProps {
  botUsername: string;
}

export default function TelegramConnector({ botUsername }: TelegramConnectorProps) {
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      let storedToken = localStorage.getItem('univwatch_subscriber_token');
      if (!storedToken) {
        // 비회원 식별용 고유 토큰 발급 (UW- + 6자리 난수)
        storedToken = 'UW-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem('univwatch_subscriber_token', storedToken);
      }
      setToken(storedToken);
    }
  }, []);

  const handleRegenerate = () => {
    if (!confirm('토큰을 재발급 받으시면 기존 텔레그램 채팅 연동 정보가 만료되며, 기존 알림 설정을 새로 연결해야 합니다. 진행하시겠습니까?')) return;
    const newToken = 'UW-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('univwatch_subscriber_token', newToken);
    setToken(newToken);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted || !token) {
    return <div className="h-48 bg-zinc-900/30 rounded-[32px] border border-white/5" />;
  }

  const botLink = `https://t.me/${botUsername}?start=${token}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=255-255-255&bgcolor=9-9-11&data=${encodeURIComponent(botLink)}`;

  return (
    <div className="glass p-8 md:p-10 rounded-[40px] border-blue-500/20 bg-blue-500/[0.01] space-y-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[50px] -mr-16 -mt-16" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center space-x-2 text-blue-500">
            <Send size={18} className="fill-blue-500/10" />
            <h3 className="text-xs font-black uppercase tracking-widest">Telegram Personal Binding</h3>
          </div>
          <h4 className="text-2xl font-black text-white tracking-tight">개인 알림 채널 연동</h4>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
            가입이나 번거로운 양식 없이, 텔레그램 봇 대화방 진입 한 번으로 격리된 알림 수신 채널을 활성화합니다. 
            아래의 QR 코드를 스캔하거나 연동 시작 버튼을 눌러주세요.
          </p>
        </div>
        
        <div className="flex items-center space-x-3 bg-zinc-950 p-2.5 rounded-2xl border border-white/5 shrink-0">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-3">Identifier:</span>
          <span className="text-sm font-black text-blue-400 font-mono select-all bg-zinc-900 px-3 py-1.5 rounded-xl border border-white/5">{token}</span>
          <button 
            onClick={handleCopy}
            className="p-2 bg-zinc-900 border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white rounded-xl transition-all"
            title="토큰 복사"
          >
            {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
          </button>
          <button 
            onClick={handleRegenerate}
            className="p-2 bg-zinc-900 border border-white/5 hover:border-white/20 text-zinc-400 hover:text-red-400 rounded-xl transition-all"
            title="토큰 재발급"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-4 border-t border-white/5">
        
        {/* Left: Mobile QR Code */}
        <div className="md:col-span-4 flex flex-col items-center justify-center space-y-3">
          <div className="w-48 h-48 bg-zinc-950 rounded-3xl p-4 border border-white/10 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={qrCodeUrl} alt="Telegram Sync QR" className="w-full h-full object-contain relative z-10 filter invert dark:invert-0" />
          </div>
          <div className="flex items-center space-x-1.5 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
            <QrCode size={12} />
            <span>Mobile QR Scan</span>
          </div>
        </div>

        {/* Right: Steps Guide */}
        <div className="md:col-span-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                모바일 카메라로 좌측 <strong>QR 코드를 스캔</strong>하거나, 하단의 <strong>텔레그램 연동 시작</strong> 버튼을 탭하여 봇과의 1:1 대화방을 엽니다.
              </p>
            </div>
            <div className="flex items-start space-x-4">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                채팅방 하단의 <strong>[시작 / START]</strong> 버튼을 눌러 고유 식별 코드가 담긴 매핑 인증 메시지를 봇에게 자동 전송합니다.
              </p>
            </div>
            <div className="flex items-start space-x-4">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                <strong>&quot;인증 성공&quot;</strong> 텔레그램 답장을 수신한 뒤, 이제 전체 상품에 대한 가격 하락 알림을 실시간으로 본 채팅방에서 받아보실 수 있습니다.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link 
              href={botLink}
              target="_blank"
              className="flex items-center justify-center space-x-2 bg-white text-black h-14 rounded-2xl font-black text-sm hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
            >
              <Send size={16} className="fill-black" />
              <span>텔레그램 연동 시작하기</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
