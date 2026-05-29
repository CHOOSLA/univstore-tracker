/**
 * /api/mno/item/{id} 응답에서 옵션 메타데이터를 추출해 MnoOption 형태로 정규화.
 *
 * 추출 대상:
 *  - 색상/용량/가입유형 옵션 리스트
 *  - 기본 옵션 (price2가 가리키는 조합)
 *  - 요금제 배열 (실질가 계산기에서 사용)
 */

function safeString(v) {
  return typeof v === 'string' ? v : null;
}

function safeNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function dedupeNonEmpty(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(safeString).filter(s => s && s.length > 0))];
}

/**
 * mno API 응답을 받아 MnoOption upsert에 사용할 데이터를 반환.
 * 입력이 mno 응답이 아니면 null.
 */
function extractMnoOption(apiData) {
  if (!apiData || typeof apiData !== 'object') return null;
  // mno 응답의 시그니처: optionPickerItems가 array로 존재
  if (!Array.isArray(apiData.optionPickerItems) && !Array.isArray(apiData.mnoPhonePlans)) {
    return null;
  }

  const deviceCapacities = dedupeNonEmpty(apiData.option1Text);
  const deviceColors = dedupeNonEmpty(apiData.option2Text);
  const registrationTypes = dedupeNonEmpty(apiData.registrationDisplayOption);

  const basePicker = apiData.optionPickers || {};
  const baseCapacity = safeString(basePicker.option1_text);
  const baseColor = safeString(basePicker.option2_text);

  const rawPlans = Array.isArray(apiData.mnoPhonePlans) ? apiData.mnoPhonePlans : [];
  const phonePlans = rawPlans.map(p => ({
    id: safeNumber(p.phonePlanId),
    name: safeString(p.phonePlanName) || '',
    monthPrice: safeNumber(p.phoneMonthPrice),
    dataAmount: safeString(p.dataAmount),
    voiceAmount: safeString(p.voiceAmount),
    // 공시지원금 (가입유형별)
    publicDeviceChangeAmount: safeNumber(p.publicDeviceChangeAmount),
    publicNumberPortabilityAmount: safeNumber(p.publicNumberPortabilityAmount),
    publicNewSubscriptionAmount: safeNumber(p.publicNewSubscriptionAmount),
    // 추가 공시지원금
    additionalPublicDeviceAmount: safeNumber(p.additionalPublicDeviceAmount),
    additionalPublicNumberAmount: safeNumber(p.additionalPublicNumberAmount),
    additionalPublicNewAmount: safeNumber(p.additionalPublicNewAmount),
    // 선택약정 추가 할인
    additionalOptionalDeviceAmount: safeNumber(p.additionalOptionalDeviceAmount),
    additionalOptionalNumberAmount: safeNumber(p.additionalOptionalNumberAmount),
    additionalOptionalNewAmount: safeNumber(p.additionalOptionalNewAmount),
    isDefault: p.isDefault === true,
  }));

  return {
    deviceColors,
    deviceCapacities,
    registrationTypes,
    baseColor,
    baseCapacity,
    phonePlans,
  };
}

module.exports = { extractMnoOption };
