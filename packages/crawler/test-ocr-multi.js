const Tesseract = require('tesseract.js');

async function analyzeEventImages(images) {
  console.log(`🚀 총 ${images.length}개의 이미지 분석 시작...`);
  
  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i];
    console.log(`\n--- [이미지 ${i+1}] ---`);
    console.log(`🔗 URL: ${imageUrl}`);
    
    try {
      const result = await Tesseract.recognize(
        imageUrl,
        'kor+eng',
        { logger: m => {
          if (m.status === 'recognizing text' && Math.round(m.progress * 100) % 25 === 0) {
            console.log(`[${i+1}] ${m.status}: ${Math.round(m.progress * 100)}%`);
          }
        }}
      );
      
      const text = result.data.text;
      console.log('✅ 추출된 텍스트 일부:');
      console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      
      // 패턴 매칭
      const percentMatch = text.match(/(\d+)\s*%/);
      const moneyMatch = text.match(/(\d+)\s*만/);
      
      if (percentMatch || moneyMatch) {
        console.log('💡 핵심 규칙 발견!');
        if (percentMatch) console.log(`👉 할인율: ${percentMatch[0]}`);
        if (moneyMatch) console.log(`👉 한도: ${moneyMatch[0]}원`);
      }
      
    } catch (err) {
      console.error(`❌ 이미지 ${i+1} 분석 실패:`, err.message);
    }
  }
}

const paycoImages = [
  "https://image.univstore.com/20260501_payment_payco_101_web_eventpage.jpg",
  "https://image.univstore.com/20260501_payment_payco_notice_web_eventpage.jpg"
];

analyzeEventImages(paycoImages);
