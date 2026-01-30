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
  if (isWi
