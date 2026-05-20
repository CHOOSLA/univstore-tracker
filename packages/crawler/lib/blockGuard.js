/**
 * BlockGuard
 * - 차단 발생을 sliding window로 카운트하고, 임계값 초과 시 DirectApi를 in-memory에서 비활성화.
 * - 비활성화 후 일정 시간 동안 추가 차단이 없으면 자동 복귀.
 * - PM2 restart 없이 런타임에서 안전 모드로 전환되는 보호 메커니즘.
 */
class BlockGuard {
  constructor({ windowMs = 3600_000, threshold = 3, recoveryMs = 3600_000 } = {}) {
    this.windowMs = windowMs;        // 차단 카운트 윈도우 (기본 1시간)
    this.threshold = threshold;       // 윈도우 내 차단 허용 횟수
    this.recoveryMs = recoveryMs;     // 자동 복귀 대기 시간
    this.blockTimestamps = [];
    this.disabled = false;
    this.disabledAt = null;
  }

  /**
   * 차단 발생을 기록하고 임계값을 넘으면 비활성화 상태로 전환.
   * @returns {{ action: 'NOTED' | 'DISABLED', count: number }}
   */
  recordBlock(now = Date.now()) {
    this.blockTimestamps.push(now);
    this._cleanup(now);

    if (!this.disabled && this.blockTimestamps.length >= this.threshold) {
      this.disabled = true;
      this.disabledAt = now;
      return { action: 'DISABLED', count: this.blockTimestamps.length };
    }
    return { action: 'NOTED', count: this.blockTimestamps.length };
  }

  /**
   * 비활성화된 상태에서 일정 시간 추가 차단이 없으면 활성 상태로 복귀.
   * @returns {boolean} 복귀했으면 true
   */
  maybeRecover(now = Date.now()) {
    if (!this.disabled) return false;
    this._cleanup(now);
    if (this.blockTimestamps.length === 0 && now - this.disabledAt >= this.recoveryMs) {
      this.disabled = false;
      this.disabledAt = null;
      return true;
    }
    return false;
  }

  /**
   * DirectApi가 현재 사용 가능한지 (env flag와 in-memory 비활성화 상태 모두 고려).
   */
  isDirectApiActive() {
    return process.env.USE_DIRECT_API === 'true' && !this.disabled;
  }

  _cleanup(now) {
    this.blockTimestamps = this.blockTimestamps.filter(t => now - t < this.windowMs);
  }
}

const blockGuard = new BlockGuard();

/**
 * Telegram으로 시스템 알림을 발송. 봇 토큰/채팅 ID가 없으면 조용히 무시.
 */
async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      console.warn('⚠️ Telegram 알림 응답 비정상:', res.status);
    }
  } catch (err) {
    console.warn('⚠️ Telegram 알림 실패:', err.message);
  }
}

module.exports = { BlockGuard, blockGuard, sendTelegramAlert };
