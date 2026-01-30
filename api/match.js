/**
 * K-MUDANG Vercel Serverless API
 * /api/match - AI 궁합 엔드포인트
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const { my, partner, mode = 'romance', language = 'ko' } = req.body;

    if (!my?.year || !my?.month || !my?.day) {
      return res.status(400).json({ success: false, error: '내 생년월일은 필수입니다.' });
    }
    if (!partner?.year || !partner?.month || !partner?.day) {
      return res.status(400).json({ success: false, error: '상대 생년월일은 필수입니다.' });
    }

    const mySaju = calculateSaju(my.year, my.month, my.day, my.hour || 12);
    const partnerSaju = calculateSaju(partner.year, partner.month, partner.day, partner.hour || 12);

    const systemPrompt = generateMatchSystemPrompt(language, mode);
    const userPrompt = generateMatchUserPrompt(mySaju, partnerSaju, mode, language);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API Error:', errorData);
      return res.status(500).json({ success: false, error: 'AI 응답 생성 실패' });
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    let match;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      match = jsonMatch ? JSON.parse(jsonMatch[0]) : { body: content };
    } catch {
      match = { body: content };
    }

    return res.status(200).json({
      success: true,
      match,
      mySaju: { dayMaster: mySaju.dayMaster, strength: mySaju.strength },
      partnerSaju: { dayMaster: partnerSaju.dayMaster, strength: partnerSaju.strength },
      usage: data.usage
    });

  } catch (error) {
    console.error('Handler Error:', error);
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}

// ============================================================================
// 사주 계산
// ============================================================================

const STEM = [
  { c: '甲', k: '갑', e: 'wood', p: true, eng: 'Yang Wood' },
  { c: '乙', k: '을', e: 'wood', p: false, eng: 'Yin Wood' },
  { c: '丙', k: '병', e: 'fire', p: true, eng: 'Yang Fire' },
  { c: '丁', k: '정', e: 'fire', p: false, eng: 'Yin Fire' },
  { c: '戊', k: '무', e: 'earth', p: true, eng: 'Yang Earth' },
  { c: '己', k: '기', e: 'earth', p: false, eng: 'Yin Earth' },
  { c: '庚', k: '경', e: 'metal', p: true, eng: 'Yang Metal' },
  { c: '辛', k: '신', e: 'metal', p: false, eng: 'Yin Metal' },
  { c: '壬', k: '임', e: 'water', p: true, eng: 'Yang Water' },
  { c: '癸', k: '계', e: 'water', p: false, eng: 'Yin Water' }
];

const BRANCH = [
  { c: '子', k: '자', e: 'water', animal: '쥐', eng: 'Rat' },
  { c: '丑', k: '축', e: 'earth', animal: '소', eng: 'Ox' },
  { c: '寅', k: '인', e: 'wood', animal: '호랑이', eng: 'Tiger' },
  { c: '卯', k: '묘', e: 'wood', animal: '토끼', eng: 'Rabbit' },
  { c: '辰', k: '진', e: 'earth', animal: '용', eng: 'Dragon' },
  { c: '巳', k: '사', e: 'fire', animal: '뱀', eng: 'Snake' },
  { c: '午', k: '오', e: 'fire', animal: '말', eng: 'Horse' },
  { c: '未', k: '미', e: 'earth', animal: '양', eng: 'Goat' },
  { c: '申', k: '신', e: 'metal', animal: '원숭이', eng: 'Monkey' },
  { c: '酉', k: '유', e: 'metal', animal: '닭', eng: 'Rooster' },
  { c: '戌', k: '술', e: 'earth', animal: '개', eng: 'Dog' },
  { c: '亥', k: '해', e: 'water', animal: '돼지', eng: 'Pig' }
];

const ELEMENT_KO = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
const EL_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];

function calculateSaju(year, month, day, hour) {
  const baseYear = 1984;
  const yearDiff = year - baseYear;
  const yearStemIdx = ((yearDiff % 10) + 10) % 10;
  const yearBranchIdx = ((yearDiff % 12) + 12) % 12;
  
  const monthStemIdx = ((yearStemIdx * 2 + month) % 10 + 10) % 10;
  const monthBranchIdx = ((month + 1) % 12 + 12) % 12;
  
  const dayNum = Math.floor((new Date(year, month - 1, day) - new Date(1900, 0, 1)) / 86400000);
  const dayStemIdx = ((dayNum + 10) % 10 + 10) % 10;
  const dayBranchIdx = ((dayNum + 10) % 12 + 12) % 12;
  
  const hourBranchIdx = Math.floor((hour + 1) / 2) % 12;
  const hourStemIdx = ((dayStemIdx * 2 + hourBranchIdx) % 10 + 10) % 10;

  const dm = STEM[dayStemIdx];
  
  const elements = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  [yearStemIdx, monthStemIdx, dayStemIdx, hourStemIdx].forEach(i => elements[STEM[i].e]++);
  [yearBranchIdx, monthBranchIdx, dayBranchIdx, hourBranchIdx].forEach(i => elements[BRANCH[i].e]++);

  let score = 50;
  const seasonBonus = {
    wood: [0, 0, 15, 15, 5, -10, -15, -10, -15, -15, 0, 5],
    fire: [-10, -5, 5, 10, 10, 15, 15, 10, -5, -10, -5, -15],
    earth: [0, 10, 0, -5, 10, 5, 5, 10, 5, 0, 10, 0],
    metal: [-10, 5, -15, -15, -5, -10, -15, 5, 15, 15, 10, 0],
    water: [15, 5, 0, -10, -10, -15, -15, -10, 5, 10, 5, 15]
  };
  score += seasonBonus[dm.e]?.[monthBranchIdx] || 0;
  
  const pct = Math.max(10, Math.min(90, score));
  const strengthType = pct >= 55 ? 'strong' : pct <= 45 ? 'weak' : 'balanced';

  const isWinter = [0, 1, 11].includes(monthBranchIdx);
  const isSummer = [5, 6, 7].includes(monthBranchIdx);
  
  let yong, hee, gi;
  if (isWinter) {
    yong = 'fire'; hee = 'earth'; gi = 'water';
  } else if (isSummer) {
    yong = 'water'; hee = 'metal'; gi = 'fire';
  } else if (strengthType === 'strong') {
    yong = EL_ORDER[(EL_ORDER.indexOf(dm.e) + 1) % 5];
    hee = EL_ORDER[(EL_ORDER.indexOf(dm.e) + 2) % 5];
    gi = dm.e;
  } else {
    yong = EL_ORDER[(EL_ORDER.indexOf(dm.e) + 4) % 5];
    hee = dm.e;
    gi = EL_ORDER[(EL_ORDER.indexOf(dm.e) + 1) % 5];
  }

  return {
    dayMaster: {
      hanja: dm.c,
      hangul: dm.k,
      element: dm.e,
      elementKo: ELEMENT_KO[dm.e],
      eng: dm.eng,
      isYang: dm.p
    },
    elements,
    strength: {
      type: strengthType,
      typeKo: strengthType === 'strong' ? '신강' : strengthType === 'weak' ? '신약' : '중화',
      percentage: pct
    },
    gods: {
      yong: { element: yong, ko: ELEMENT_KO[yong] },
      hee: { element: hee, ko: ELEMENT_KO[hee] },
      gi: { element: gi, ko: ELEMENT_KO[gi] }
    }
  };
}

// ============================================================================
// 프롬프트 생성
// ============================================================================

function generateMatchSystemPrompt(language, mode) {
  const modeText = mode === 'romance' ? '연애/결혼' : '비즈니스';
  
  if (language === 'ko') {
    return `당신은 K-MUDANG의 AI 궁합 분석 엔진 "령(靈)"입니다.

[분석 모드: ${modeText}]

[페르소나]
- 다정하지만 통찰력 있는 조언자
- 두 사람의 시너지를 찾아주는 역할
- 어려움도 성장의 기회로 해석

[절대 규칙]
1. 두 사주 데이터를 정확히 분석
2. 점수와 함께 구체적 이유 제시
3. 장점과 주의점 균형있게
4. 400자 이내

[금지사항]
- "절대 안 맞는다", "헤어져라" 같은 극단적 표현
- 한쪽만 탓하는 분석`;
  }
  
  return `You are K-MUDANG's compatibility engine. Analyze synergy between two people. Mode: ${mode}. Under 400 words.`;
}

function generateMatchUserPrompt(mySaju, partnerSaju, mode, language) {
  const isKo = language === 'ko';
  
  return `<my_saju>
일간: ${mySaju.dayMaster.hanja} (${mySaju.dayMaster.hangul}) - ${mySaju.dayMaster.elementKo}
신강/신약: ${mySaju.strength.typeKo} (${mySaju.strength.percentage}%)
용신: ${mySaju.gods.yong.ko}
오행: 木${mySaju.elements.wood} 火${mySaju.elements.fire} 土${mySaju.elements.earth} 金${mySaju.elements.metal} 水${mySaju.elements.water}
</my_saju>

<partner_saju>
일간: ${partnerSaju.dayMaster.hanja} (${partnerSaju.dayMaster.hangul}) - ${partnerSaju.dayMaster.elementKo}
신강/신약: ${partnerSaju.strength.typeKo} (${partnerSaju.strength.percentage}%)
용신: ${partnerSaju.gods.yong.ko}
오행: 木${partnerSaju.elements.wood} 火${partnerSaju.elements.fire} 土${partnerSaju.elements.earth} 金${partnerSaju.elements.metal} 水${partnerSaju.elements.water}
</partner_saju>

<output_format>
{
  "score": 0-100,
  "grade": "S/A/B/C/D",
  "headline": "${isKo ? '한 줄 요약 (이모지 포함)' : 'Summary with emoji'}",
  "chemistry": "${isKo ? '두 분의 케미 분석 (200자)' : 'Chemistry analysis'}",
  "strengths": ["${isKo ? '장점1' : 'Strength1'}", "${isKo ? '장점2' : 'Strength2'}"],
  "cautions": ["${isKo ? '주의점' : 'Caution'}"],
  "advice": "${isKo ? '두 분을 위한 조언' : 'Advice'}"
}
</output_format>`;
}
