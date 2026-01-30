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

function getStemBranch(year, month, day) {
  const baseYear = 1984;
  const yearDiff = year - baseYear;
  const yearStemIdx = ((yearDiff % 10) + 10) % 10;
  const yearBranchIdx = ((yearDiff % 12) + 12) % 12;
  const monthStemIdx = ((yearStemIdx * 2 + month) % 10 + 10) % 10;
  const monthBranchIdx = ((month + 1) % 12 + 12) % 12;
  const dayNum = Math.floor((new Date(year, month - 1, day) - new Date(1900, 0, 1)) / 86400000);
  const dayStemIdx = ((dayNum + 10) % 10 + 10) % 10;
  const dayBranchIdx = ((dayNum + 10) % 12 + 12) % 12;
  
  return {
    year: { s: STEM[yearStemIdx], b: BRANCH[yearBranchIdx], si: yearStemIdx, bi: yearBranchIdx },
    month: { s: STEM[monthStemIdx], b: BRANCH[monthBranchIdx], si: monthStemIdx, bi: monthBranchIdx },
    day: { s: STEM[dayStemIdx], b: BRANCH[dayBranchIdx], si: dayStemIdx, bi: dayBranchIdx }
  };
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
  ['year', 'month', 'day'].forEach(p => {
    if (saju[p].b.e === dmEl) score += 5;
    if (saju[p].s.e === dmEl) score += 3;
    if (EL_PRODUCE[saju[p].s.e] === dmEl) score += 2;
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
  return { yong, hee, gi };
}

function calcMatchScore(mySaju, pSaju, myGods, pGods, mode) {
  let score = 50;
  const factors = [];
  
  const myDsi = mySaju.day.si;
  const pDsi = pSaju.day.si;
  const myDbi = mySaju.day.bi;
  const pDbi = pSaju.day.bi;
  
  // 천간합 (+25)
  const ganHap = [[0,5],[1,6],[2,7],[3,8],[4,9]];
  for (const [a, b] of ganHap) {
    if ((myDsi === a && pDsi === b) || (myDsi === b && pDsi === a)) {
      score += 25;
      factors.push({ name: '천간합', score: 25, desc: '일간이 서로 합' });
      break;
    }
  }
  
  // 지지합 (+20)
  const jiHap = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
  for (const [a, b] of jiHap) {
    if ((myDbi === a && pDbi === b) || (myDbi === b && pDbi === a)) {
      score += 20;
      factors.push({ name: '지지합', score: 20, desc: '일지가 서로 합' });
      break;
    }
  }
  
  // 지지충 (-15)
  const jiChung = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
  for (const [a, b] of jiChung) {
    if ((myDbi === a && pDbi === b) || (myDbi === b && pDbi === a)) {
      score -= 15;
      factors.push({ name: '지지충', score: -15, desc: '일지가 서로 충' });
      break;
    }
  }
  
  // 용신 매칭 (+15)
  const pElCounts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  ['year', 'month', 'day'].forEach(p => {
    pElCounts[pSaju[p].s.e]++;
    pElCounts[pSaju[p].b.e]++;
  });
  if (pElCounts[myGods.yong] >= 2) {
    score += 15;
    factors.push({ name: '용신풍부', score: 15, desc: '상대가 내 용신을 보유' });
  } else if (pElCounts[myGods.yong] >= 1) {
    score += 8;
    factors.push({ name: '용신보유', score: 8, desc: '상대가 내 용신을 보유' });
  }
  
  // 조후 보완 (+15)
  const myMbi = mySaju.month.bi;
  const pMbi = pSaju.month.bi;
  const myWinter = [0, 1, 11].includes(myMbi);
  const mySummer = [5, 6, 7].includes(myMbi);
  const pWinter = [0, 1, 11].includes(pMbi);
  const pSummer = [5, 6, 7].includes(pMbi);
  
  if ((myWinter && pSummer) || (mySummer && pWinter)) {
    score += 15;
    factors.push({ name: '조후보완', score: 15, desc: '한난이 서로 보완' });
  }
  
  return { score: Math.max(0, Math.min(100, score)), factors };
}

function getGrade(score) {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function generateSystemPrompt(mode) {
  const modeText = mode === 'business' ? '비즈니스 파트너' : '연인/배우자';
  return `당신은 K-MUDANG의 AI 궁합 분석 엔진입니다.
두 사람의 사주 데이터를 바탕으로 ${modeText} 궁합을 분석합니다.

[절대 규칙]
1. 제공된 점수와 등급을 그대로 사용하세요
2. 친근하고 따뜻한 말투 사용
3. 부정적 내용도 희망적으로 리프레이밍
4. 200자 이내로 간결하게

[출력 형식]
반드시 다음 JSON 형식으로만 응답:
{
  "chemistry": "두 사람의 케미 한 줄 요약 (이모지 포함)",
  "strengths": ["강점1", "강점2"],
  "cautions": ["주의점1"],
  "advice": "조언 한 마디"
}`;
}

function buildUserPrompt(mySaju, pSaju, myStr, pStr, myGods, pGods, matchResult, mode) {
  const modeText = mode === 'business' ? '비즈니스' : '연애';
  return `[나의 사주]
일주: ${mySaju.day.s.c}${mySaju.day.b.c} (${myStr.type}, ${myStr.pct}%)
용신: ${ELEMENT[myGods.yong].k}

[상대 사주]
일주: ${pSaju.day.s.c}${pSaju.day.b.c} (${pStr.type}, ${pStr.pct}%)
용신: ${ELEMENT[pGods.yong].k}

[궁합 분석 결과]
점수: ${matchResult.score}점 (${getGrade(matchResult.score)}등급)
주요 요소: ${matchResult.factors.map(f => f.name + '(' + (f.score > 0 ? '+' : '') + f.score + ')').join(', ') || '특이사항 없음'}

[분석 모드]
${modeText} 궁합

위 데이터를 바탕으로 궁합 해석을 작성해주세요.`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { my, partner, mode, tier } = req.body;
    
    if (!my?.year || !my?.month || !my?.day || !partner?.year || !partner?.month || !partner?.day) {
      return res.status(400).json({ error: 'my and partner birth data required' });
    }
    
    const mySaju = getStemBranch(parseInt(my.year), parseInt(my.month), parseInt(my.day));
    const pSaju = getStemBranch(parseInt(partner.year), parseInt(partner.month), parseInt(partner.day));
    
    const myStr = calcStrength(mySaju);
    const pStr = calcStrength(pSaju);
    
    const myGods = calcGods(mySaju, myStr);
    const pGods = calcGods(pSaju, pStr);
    
    const matchMode = mode === 'business' ? 'business' : 'romance';
    const matchResult = calcMatchScore(mySaju, pSaju, myGods, pGods, matchMode);
    const grade = getGrade(matchResult.score);
    
    // 무료: Haiku, 유료: Sonnet
    const model = tier === 'premium' ? 'claude-sonnet-4-20250514' : 'claude-3-haiku-20240307';
    
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const response = await client.messages.create({
      model: model,
      max_tokens: 1024,
      system: generateSystemPrompt(matchMode),
      messages: [{ role: 'user', content: buildUserPrompt(mySaju, pSaju, myStr, pStr, myGods, pGods, matchResult, matchMode) }]
    });
    
    const text = response.content[0].text;
    let aiResult;
    try {
      aiResult = JSON.parse(text);
    } catch {
      aiResult = { chemistry: '서로를 보완하는 인연 💫', strengths: ['서로 다른 매력'], cautions: ['소통에 노력 필요'], advice: '서로를 이해하려는 마음이 중요해요' };
    }
    
    return res.status(200).json({
      success: true,
      my: {
        saju: `${mySaju.day.s.c}${mySaju.day.b.c}`,
        strength: myStr,
        yong: myGods.yong
      },
      partner: {
        saju: `${pSaju.day.s.c}${pSaju.day.b.c}`,
        strength: pStr,
        yong: pGods.yong
      },
      match: {
        score: matchResult.score,
        grade: grade,
        factors: matchResult.factors
      },
      analysis: aiResult,
      mode: matchMode,
      model: model
    });
    
  } catch (error) {
    console.error('Match API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
