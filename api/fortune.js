const Anthropic = require('@anthropic-ai/sdk').default;

const STEM = [
  { c: '甲', k: '갑', e: 'wood', p: true },
  { c: '乙', k: '을', e: 'wood', p: false },
  { c: '丙', k: '병', e: 'fire', p: true },
  { c: '丁', k: '정', e: 'fire', p: false },
  { c: '戊', k: '무', e: 'earth', p: true },
  { c: '己', k: '기', e: 'earth', p: false },
  { c: '庚', k: '경', e: 'metal', p: true },
  { c: '辛', k: '신', e: 'metal', p: false },
  { c: '壬', k: '임', e: 'water', p: true },
  { c: '癸', k: '계', e: 'water', p: false }
];

const BRANCH = [
  { c: '子', k: '자', e: 'water', a: '쥐' },
  { c: '丑', k: '축', e: 'earth', a: '소' },
  { c: '寅', k: '인', e: 'wood', a: '호랑이' },
  { c: '卯', k: '묘', e: 'wood', a: '토끼' },
  { c: '辰', k: '진', e: 'earth', a: '용' },
  { c: '巳', k: '사', e: 'fire', a: '뱀' },
  { c: '午', k: '오', e: 'fire', a: '말' },
  { c: '未', k: '미', e: 'earth', a: '양' },
  { c: '申', k: '신', e: 'metal', a: '원숭이' },
  { c: '酉', k: '유', e: 'metal', a: '닭' },
  { c: '戌', k: '술', e: 'earth', a: '개' },
  { c: '亥', k: '해', e: 'water', a: '돼지' }
];

const ELEMENT = {
  wood: { k: '木', color: '초록색', dir: '동쪽' },
  fire: { k: '火', color: '빨간색', dir: '남쪽' },
  earth: { k: '土', color: '노란색', dir: '중앙' },
  metal: { k: '金', color: '흰색', dir: '서쪽' },
  water: { k: '水', color: '검정색', dir: '북쪽' }
};

const EL_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
const EL_PRODUCE = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };

function getStemBranch(year, month, day, hour) {
  const baseYear = 1984;
  const yearDiff = year - baseYear;
  const yearStemIdx = ((yearDiff % 10) + 10) % 10;
  const yearBranchIdx = ((yearDiff % 12) + 12) % 12;
  const monthStemIdx = ((yearStemIdx * 2 + month) % 10 + 10) % 10;
  const monthBranchIdx = ((month + 1) % 12 + 12) % 12;
  const dayNum = Math.floor((new Date(year, month - 1, day) - new Date(1900, 0, 1)) / 86400000);
  const dayStemIdx = ((dayNum + 10) % 10 + 10) % 10;
  const dayBranchIdx = ((dayNum + 10) % 12 + 12) % 12;
  const hourBranchIdx = hour !== undefined ? Math.floor((hour + 1) / 2) % 12 : null;
  const hourStemIdx = hour !== undefined ? ((dayStemIdx * 2 + hourBranchIdx) % 10 + 10) % 10 : null;
  
  return {
    year: { s: STEM[yearStemIdx], b: BRANCH[yearBranchIdx], si: yearStemIdx, bi: yearBranchIdx },
    month: { s: STEM[monthStemIdx], b: BRANCH[monthBranchIdx], si: monthStemIdx, bi: monthBranchIdx },
    day: { s: STEM[dayStemIdx], b: BRANCH[dayBranchIdx], si: dayStemIdx, bi: dayBranchIdx },
    hour: hour !== undefined ? { s: STEM[hourStemIdx], b: BRANCH[hourBranchIdx], si: hourStemIdx, bi: hourBranchIdx } : null
  };
}

function countElements(saju) {
  const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  ['year', 'month', 'day', 'hour'].forEach(p => {
    if (saju[p]) {
      counts[saju[p].s.e]++;
      counts[saju[p].b.e]++;
    }
  });
  return counts;
}

function calcStrength(saju) {
  const dm = saju.day.s;
  const dmEl = dm.e;
  let score = 50;
  const mbi = saju.month.bi;
  const seasonBonus = {
    wood: [0, 0, 15, 15, 5, -10, -15, -10, -15, -15, 0, 5],
    fire: [-10, -5, 5, 10, 10, 15, 15, 10, -5, -10, -5, -15],
    earth: [0, 10, 0, -5, 10, 5, 5, 10, 5, 0, 10, 0],
    metal: [-10, 5, -15, -15, -5, -10, -15, 5, 15, 15, 10, 0],
    water: [15, 5, 0, -10, -10, -15, -15, -10, 5, 10, 5, 15]
  };
  score += seasonBonus[dmEl]?.[mbi] || 0;
  ['year', 'month', 'day', 'hour'].forEach(p => {
    if (saju[p]) {
      if (saju[p].b.e === dmEl) score += 5;
      if (saju[p].s.e === dmEl) score += 3;
      if (EL_PRODUCE[saju[p].s.e] === dmEl) score += 2;
    }
  });
  const pct = Math.max(10, Math.min(90, score));
  return { type: pct >= 55 ? 'strong' : pct <= 45 ? 'weak' : 'balanced', pct };
}

function calcGods(saju, strength) {
  const dmEl = saju.day.s.e;
  const mbi = saju.month.bi;
  const isWinter = [0, 1, 11].includes(mbi);
  const isSummer = [5, 6, 7].includes(mbi);
  let yong, hee, gi;
  if (isWinter) { yong = 'fire'; hee = 'earth'; gi = 'water'; }
  else if (isSummer) { yong = 'water'; hee = 'metal'; gi = 'fire'; }
  else if (strength.type === 'strong') {
    yong = EL_ORDER[(EL_ORDER.indexOf(dmEl) + 1) % 5];
    hee = EL_ORDER[(EL_ORDER.indexOf(dmEl) + 2) % 5];
    gi = dmEl;
  } else {
    yong = EL_ORDER[(EL_ORDER.indexOf(dmEl) + 4) % 5];
    hee = dmEl;
    gi = EL_ORDER[(EL_ORDER.indexOf(dmEl) + 1) % 5];
  }
  return { yong, hee, gi, isWinter, isSummer };
}

function generateSystemPrompt() {
  return `당신은 K-MUDANG의 AI 운세 해석 엔진 "령(靈)"입니다.
사주명리학 데이터를 기반으로 현대적이고 감성적인 운세를 작성합니다.

[절대 규칙]
1. 제공된 사주 데이터의 수치/판정을 절대 변경하지 마세요
2. 전문 용어는 일상 언어로 번역하세요
3. "~해요" 친근한 말투 사용
4. 부정적 내용도 희망적 관점으로 리프레이밍
5. 300자 이내로 작성
6. 이모지 적절히 활용

[금지사항]
- 죽음, 큰 사고, 재앙 등 극단적 부정 예언
- 복권 당첨, 대박 등 비현실적 긍정 예언

[출력 형식]
반드시 다음 JSON 형식으로만 응답:
{
  "headline": "한 줄 요약 (15자 이내, 이모지 포함)",
  "body": "본문 (300자 이내)",
  "advice": "오늘의 한 마디 (20자 이내)",
  "lucky": {
    "time": "행운의 시간",
    "color": "행운의 색",
    "direction": "행운의 방향"
  }
}`;
}

function buildUserPrompt(saju, elCounts, strength, gods) {
  const dm = saju.day.s;
  const today = new Date();
  const todayStr = `${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;
  
  return `[사주 원국]
일간(Day Master): ${dm.c}(${dm.k}) - ${ELEMENT[dm.e].k}(${dm.e})
년주: ${saju.year.s.c}${saju.year.b.c}
월주: ${saju.month.s.c}${saju.month.b.c}
일주: ${saju.day.s.c}${saju.day.b.c}
${saju.hour ? `시주: ${saju.hour.s.c}${saju.hour.b.c}` : '시주: 미입력'}

[오행 분포]
木${elCounts.wood} 火${elCounts.fire} 土${elCounts.earth} 金${elCounts.metal} 水${elCounts.water}

[신강/신약]
${strength.type === 'strong' ? '신강' : strength.type === 'weak' ? '신약' : '중화'} (${strength.pct}%)

[용신/희신/기신]
용신: ${ELEMENT[gods.yong].k}(${gods.yong})
희신: ${ELEMENT[gods.hee].k}(${gods.hee})
기신: ${ELEMENT[gods.gi].k}(${gods.gi})

[오늘 날짜]
${todayStr}

위 사주 데이터를 바탕으로 오늘의 운세를 작성해주세요.`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { year, month, day, hour, tier } = req.body;
    if (!year || !month || !day) {
      return res.status(400).json({ error: 'year, month, day required' });
    }
    
    const saju = getStemBranch(parseInt(year), parseInt(month), parseInt(day), hour ? parseInt(hour) : undefined);
    const elCounts = countElements(saju);
    const strength = calcStrength(saju);
    const gods = calcGods(saju, strength);
    
    const model = tier === 'premium' ? 'claude-sonnet-4-20250514' : 'claude-3-5-haiku-20241022';
    
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const response = await client.messages.create({
      model: model,
      max_tokens: 1024,
      system: generateSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(saju, elCounts, strength, gods) }]
    });
    
    const text = response.content[0].text;
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { headline: '🔮 오늘의 운세', body: text, advice: '좋은 하루 되세요', lucky: { time: '오전', color: ELEMENT[gods.yong].color, direction: ELEMENT[gods.yong].dir } };
    }
    
    return res.status(200).json({
      success: true,
      saju: {
        year: `${saju.year.s.c}${saju.year.b.c}`,
        month: `${saju.month.s.c}${saju.month.b.c}`,
        day: `${saju.day.s.c}${saju.day.b.c}`,
        hour: saju.hour ? `${saju.hour.s.c}${saju.hour.b.c}` : null
      },
      dayMaster: { hanja: saju.day.s.c, hangul: saju.day.s.k, element: saju.day.s.e },
      strength: strength,
      gods: { yong: gods.yong, hee: gods.hee, gi: gods.gi },
      fortune: result,
      model: model
    });
    
  } catch (error) {
    console.error('Fortune API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
