const Tesseract = require('tesseract.js');

async function testOCR() {
  const imageUrl = 'https://image.univstore.com/20260316_payment_kbpay_eventlist.jpg';
  console.log(`🔍 이미지 분석 시작: ${imageUrl}`);
  
  try {
    const result = await Tesseract.recognize(
      imageUrl,
      'kor+eng', // 한글과 영어 동시 인식
      { logger: m => console.log(m.status + ': ' + Math.round(m.progress * 100) + '%') }
    );
    
    console.log('\n--- [추출된 텍스트] ---');
    console.log(result.data.text);
    
    // 핵심 정보 추출 테스트
    const percentMatch = result.data.text.match(/(\d+)\s*%/);
    const moneyMatch = result.data.text.match(/(\d+)\s*만/);
    
    console.log('\n--- [자동 분석 결과] ---');
    console.log(`할인율 감지: ${percentMatch ? percentMatch[0] : '미발견'}`);
    console.log(`한도 감지: ${moneyMatch ? moneyMatch[0] + '원' : '미발견'}`);
    
  } catch (err) {
    console.error('❌ OCR 실패:', err.message);
  }
}

testOCR();
