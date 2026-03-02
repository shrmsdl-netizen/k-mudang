#!/usr/bin/env node
/**
 * K-MUDANG Saju Golden Master Test
 * ==================================
 * Usage:
 *   node saju_golden_test.js generate ko.html golden_master.json
 *   node saju_golden_test.js generate en.html golden_master_en.json
 *   node saju_golden_test.js generate jp.html golden_master_jp.json
 *   node saju_golden_test.js verify ko.html golden_master.json
 *   node saju_golden_test.js verify en.html golden_master_en.json
 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

// ── Engine Loader (multi-language) ──────────────────────────────────────────────
function loadEngine(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const noop = () => {};

  // Find the script block containing calcYearPillar (main calc block)
  const calcFuncIdx = html.indexOf('function calcYearPillar');
  if (calcFuncIdx === -1) throw new Error(`calcYearPillar not found in ${htmlPath}`);
  const mainScriptStart = html.lastIndexOf('<script', calcFuncIdx);
  const mainTagEnd = html.indexOf('>', mainScriptStart) + 1;
  const mainScriptEnd = html.indexOf('<\/script>', calcFuncIdx);
  let mainBlock = html.slice(mainTagEnd, mainScriptEnd);

  // Check if we need a preceding constants block (KO/JP pattern)
  // EN has everything in one block; KO/JP split constants into earlier script
  const needsConstBlock = !mainBlock.includes('const BRANCH_CLASH') && !mainBlock.includes('const STEM =');
  let codeBlocks = [];
  
  if (needsConstBlock) {
    // Find the block with BRANCH_CLASH (Korean constants)
    const branchIdx = html.indexOf('const BRANCH_CLASH');
    if (branchIdx !== -1 && branchIdx < mainScriptStart) {
      const constStart = html.lastIndexOf('<script', branchIdx);
      const constTagEnd = html.indexOf('>', constStart) + 1;
      const constEnd = html.indexOf('<\/script>', branchIdx);
      codeBlocks.push(html.slice(constTagEnd, constEnd));
    }
  }
  codeBlocks.push(mainBlock);
  let code = codeBlocks.join('\n');

  // Patch out DOM triggers
  code = code.replace(
    /if\s*\(document\.readyState\s*===\s*['"]loading['"]\)\s*\{[^}]*document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*(\w+)\s*\);\s*\}\s*else\s*\{\s*\1\(\s*\);\s*\}/g,
    ';'
  );
  code = code.replace(/new Image\(\)/g, '({src:"",onload:null,onerror:null})');

  const ctx = {
    console, Date, Math, parseInt, parseFloat, isNaN, isFinite,
    Array, Object, String, Number, Boolean, JSON, RegExp, Error, Map, Set,
    URLSearchParams, encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    document: {
      getElementById: () => null, querySelector: () => null,
      querySelectorAll: () => ({ forEach: noop, length: 0, item: () => null }),
      addEventListener: noop, removeEventListener: noop,
      createElement: () => ({
        style: {}, classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
        innerHTML: '', textContent: '', appendChild: noop,
        getContext: () => null, width: 0, height: 0,
      }),
      documentElement: { innerHTML: '', style: {}, classList: { add: noop } },
      body: { classList: { add: noop, remove: noop, contains: () => false, toggle: noop } },
      fonts: { ready: Promise.resolve(), load: () => Promise.resolve() },
      readyState: 'complete', title: '',
    },
    navigator: { language: 'en', serviceWorker: { register: () => Promise.resolve({}) }, share: null },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    Image: function () { return { src: '', onload: null, onerror: null }; },
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
    gtag: noop, dataLayer: [], location: { href: '' }, alert: noop, confirm: () => false,
    Kakao: { init: noop, isInitialized: () => true, Share: { sendDefault: noop } },
  };
  const win = {
    matchMedia: () => ({ matches: false, addListener: noop, removeListener: noop }),
    location: { href: '' }, history: { pushState: noop, replaceState: noop },
    screen: {}, addEventListener: noop, removeEventListener: noop, open: () => null,
  };
  Object.assign(win, ctx);
  ctx.window = win;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { timeout: 30000 });
  return ctx;
}


// ── Test Vector Definitions ────────────────────────────────────
// 110 test cases: 80 individual + 30 match
// Format: { id, type, input, expected (set during generate) }
const INDIVIDUAL_VECTORS = [
  // ─ Heavenly Stems variety ─
  { id: 0,  y:1990, m:1, d:1,  h:0, g:'m', loc:'Asia/Seoul' },
  { id: 1,  y:1985, m:3, d:10, h:3, g:'f', loc:'Asia/Seoul' },
  { id: 2,  y:1992, m:6, d:20, h:5, g:'m', loc:'Asia/Seoul' },
  { id: 3,  y:1978, m:9, d:25, h:7, g:'f', loc:'Asia/Seoul' },
  { id: 4,  y:2000, m:12,d:31, h:11,g:'m', loc:'Asia/Seoul' },
  { id: 5,  y:1965, m:7, d:7,  h:6, g:'f', loc:'Asia/Seoul' },
  { id: 6,  y:1975, m:2, d:4,  h:0, g:'m', loc:'Asia/Seoul' }, // 立春 경계
  { id: 7,  y:1980, m:11,d:15, h:9, g:'f', loc:'Asia/Seoul' },
  { id: 8,  y:1955, m:5, d:20, h:4, g:'m', loc:'Asia/Seoul' }, // UTC+8:30+DST era
  { id: 9,  y:1948, m:8, d:1,  h:6, g:'f', loc:'Asia/Seoul' }, // DST era
  { id: 10, y:2026, m:1, d:28, h:0, g:'m', loc:'Asia/Seoul' }, // current year
  { id: 11, y:1999, m:2, d:28, h:11,g:'f', loc:'Asia/Seoul' },
  { id: 12, y:2000, m:2, d:29, h:5, g:'m', loc:'Asia/Seoul' }, // leap day
  { id: 13, y:1970, m:4, d:15, h:8, g:'f', loc:'Asia/Seoul' },
  { id: 14, y:1983, m:8, d:8,  h:8, g:'m', loc:'Asia/Seoul' }, // 8888
  { id: 15, y:1993, m:10,d:10, h:10,g:'f', loc:'Asia/Seoul' },
  { id: 16, y:1960, m:1, d:1,  h:0, g:'m', loc:'Asia/Seoul' }, // UTC+8:30 end era
  { id: 17, y:1942, m:3, d:21, h:3, g:'f', loc:'Asia/Seoul' }, // old era
  // ─ 60 Gapja sampling (all 60 day pillars) ─
  { id: 18, y:1994, m:5, d:22, h:5, g:'m', loc:'Asia/Seoul' }, // 甲子일
  { id: 19, y:1994, m:5, d:23, h:3, g:'f', loc:'Asia/Seoul' }, // 乙丑일
  { id: 20, y:2001, m:1, d:24, h:7, g:'m', loc:'Asia/Seoul' }, // 丙寅일
  { id: 21, y:1996, m:3, d:12, h:9, g:'f', loc:'Asia/Seoul' },
  { id: 22, y:1997, m:7, d:4,  h:5, g:'m', loc:'Asia/Seoul' },
  { id: 23, y:1998, m:11,d:19, h:11,g:'f', loc:'Asia/Seoul' },
  { id: 24, y:2002, m:4, d:3,  h:6, g:'m', loc:'Asia/Seoul' },
  { id: 25, y:2003, m:8, d:17, h:0, g:'f', loc:'Asia/Seoul' },
  { id: 26, y:2004, m:12,d:31, h:10,g:'m', loc:'Asia/Seoul' },
  { id: 27, y:2005, m:2, d:15, h:4, g:'f', loc:'Asia/Seoul' },
  // ─ 극한(极寒) 사주 - 조후 패널티 검증 핵심 ─
  { id: 28, y:1982, m:11,d:20, h:5, g:'m', loc:'Asia/Seoul' }, // 壬子년 水月
  { id: 29, y:1992, m:12,d:15, h:3, g:'f', loc:'Asia/Seoul' }, // 壬申년 水月
  { id: 30, y:1976, m:11,d:30, h:7, g:'m', loc:'Asia/Seoul' }, // 丙辰년 水月
  { id: 31, y:1953, m:12,d:1,  h:5, g:'f', loc:'Asia/Seoul' }, // 癸巳년
  { id: 32, y:1959, m:11,d:15, h:0, g:'m', loc:'Asia/Seoul' }, // 己亥년 水月
  // ─ 극조(极燥) 사주 ─
  { id: 33, y:1966, m:6, d:15, h:9, g:'f', loc:'Asia/Seoul' }, // 丙午년 火月
  { id: 34, y:1977, m:7, d:20, h:11,g:'m', loc:'Asia/Seoul' }, // 丁巳년 火月
  { id: 35, y:1987, m:6, d:1,  h:6, g:'f', loc:'Asia/Seoul' }, // 丁卯년 火月
  // ─ 格局 샘플 (正官/偏官/食神/傷官/正財/偏財/印綬/偏印/比劫) ─
  { id: 36, y:1972, m:5, d:15, h:5, g:'m', loc:'Asia/Seoul' },
  { id: 37, y:1969, m:9, d:3,  h:9, g:'f', loc:'Asia/Seoul' },
  { id: 38, y:1958, m:7, d:28, h:4, g:'m', loc:'Asia/Seoul' },
  { id: 39, y:1963, m:4, d:17, h:7, g:'f', loc:'Asia/Seoul' },
  { id: 40, y:1971, m:10,d:5,  h:11,g:'m', loc:'Asia/Seoul' },
  { id: 41, y:1974, m:3, d:22, h:0, g:'f', loc:'Asia/Seoul' },
  { id: 42, y:1979, m:8, d:9,  h:6, g:'m', loc:'Asia/Seoul' },
  { id: 43, y:1981, m:1, d:30, h:8, g:'f', loc:'Asia/Seoul' },
  { id: 44, y:1984, m:6, d:11, h:10,g:'m', loc:'Asia/Seoul' },
  { id: 45, y:1986, m:2, d:25, h:3, g:'f', loc:'Asia/Seoul' },
  // ─ EN Global cities ─
  { id: 46, y:1990, m:6, d:15, h:5, g:'m', loc:'America/New_York' },
  { id: 47, y:1985, m:3, d:10, h:7, g:'f', loc:'America/Los_Angeles' },
  { id: 48, y:1992, m:9, d:20, h:9, g:'m', loc:'Europe/London' },
  { id: 49, y:1978, m:12,d:25, h:3, g:'f', loc:'Europe/Paris' },
  { id: 50, y:2000, m:4, d:5,  h:6, g:'m', loc:'Asia/Tokyo' },
  { id: 51, y:1995, m:7, d:18, h:5, g:'f', loc:'Asia/Shanghai' },
  { id: 52, y:1988, m:2, d:14, h:0, g:'m', loc:'Asia/Singapore' },
  { id: 53, y:1975, m:8, d:30, h:11,g:'f', loc:'America/Sao_Paulo' },
  { id: 54, y:1983, m:11,d:11, h:7, g:'m', loc:'Australia/Sydney' },
  { id: 55, y:1970, m:1, d:1,  h:4, g:'f', loc:'Asia/Dubai' },
  // ─ Boundary/edge cases ─
  { id: 56, y:1940, m:1, d:1,  h:0, g:'m', loc:'Asia/Seoul' }, // 最古년
  { id: 57, y:2100, m:12,d:31, h:11,g:'f', loc:'Asia/Seoul' }, // 最遠년
  { id: 58, y:1984, m:2, d:4,  h:5, g:'m', loc:'Asia/Seoul' }, // 立春일
  { id: 59, y:2024, m:2, d:4,  h:5, g:'f', loc:'Asia/Seoul' }, // 立春일
  { id: 60, y:1990, m:12,d:22, h:5, g:'m', loc:'Asia/Seoul' }, // 冬至
  { id: 61, y:1990, m:6, d:21, h:11,g:'f', loc:'Asia/Seoul' }, // 夏至
  { id: 62, y:2000, m:1, d:1,  h:0, g:'m', loc:'Asia/Seoul' }, // Y2K
  { id: 63, y:1976, m:2, d:16, h:0, g:'f', loc:'Asia/Seoul' }, // 丙辰년 立春後
  { id: 64, y:1944, m:6, d:6,  h:5, g:'m', loc:'Asia/Seoul' }, // WWII era
  { id: 65, y:2026, m:12,d:31, h:11,g:'f', loc:'Asia/Seoul' }, // future
  // ─ getNext10Years / 大運 精密 계산 검증 ─
  { id: 66, y:1995, m:3, d:15, h:6, g:'m', loc:'Asia/Seoul' },
  { id: 67, y:1988, m:11,d:7,  h:9, g:'f', loc:'Asia/Seoul' },
  { id: 68, y:2003, m:7, d:23, h:4, g:'m', loc:'Asia/Seoul' },
  { id: 69, y:1975, m:12,d:10, h:7, g:'f', loc:'Asia/Seoul' },
  { id: 70, y:1968, m:4, d:28, h:5, g:'m', loc:'Asia/Seoul' },
  // ─ 用神 variety ─
  { id: 71, y:1991, m:8, d:15, h:8, g:'m', loc:'Asia/Seoul' },
  { id: 72, y:1987, m:2, d:19, h:6, g:'f', loc:'Asia/Seoul' },
  { id: 73, y:1993, m:4, d:5,  h:0, g:'m', loc:'Asia/Seoul' },
  { id: 74, y:1976, m:7, d:30, h:10,g:'f', loc:'Asia/Seoul' },
  { id: 75, y:1969, m:10,d:12, h:3, g:'m', loc:'Asia/Seoul' },
  { id: 76, y:1980, m:5, d:22, h:7, g:'f', loc:'Asia/Seoul' },
  { id: 77, y:1985, m:9, d:8,  h:9, g:'m', loc:'Asia/Seoul' },
  { id: 78, y:1994, m:1, d:17, h:5, g:'f', loc:'Asia/Seoul' },
  { id: 79, y:2010, m:6, d:12, h:11,g:'m', loc:'Asia/Seoul' },
];

const MATCH_VECTORS = [];

// ── Core computation ───────────────────────────────────────────
function computeIndividual(ctx, v) {
  const loc = v.loc || 'Asia/Seoul';
  // Adjust time for location
  let adjY = v.y, adjM = v.m, adjD = v.d, adjH = v.h;
  if (ctx.adjustTime) {
    const adj = ctx.adjustTime(v.y, v.m, v.d, v.h, loc);
    adjY = adj.y; adjM = adj.m; adjD = adj.d; adjH = adj.h;
  }
  
  const yp = ctx.calcYearPillar(adjY, adjM, adjD, adjH, adjM === undefined ? 0 : 0);
  const mp = ctx.calcMonthPillar(adjY, adjM, adjD, adjH);
  const dp = ctx.calcDayPillar(adjY, adjM, adjD);
  const hp = ctx.calcHourPillar(dp.s, adjH);
  const saju = { year: yp, month: mp, day: dp, hour: hp };
  
  const gods = ctx.calcGods ? ctx.calcGods(saju, v.g) : null;
  const strength = ctx.calcStrength ? ctx.calcStrength(saju) : null;
  const format = ctx.calcFormat ? ctx.calcFormat(saju, gods, v.g) : (ctx.calcGuksik ? ctx.calcGuksik(saju, gods) : null);
  
  // Year luck 2026
  const yl2026 = ctx.calcYearLuck ? ctx.calcYearLuck(2026, saju, gods) : null;
  
  // Monthly luck for 2026 months
  const monthLucks = [];
  if (ctx.calcMonthLuck && gods) {
    for (let mo = 1; mo <= 12; mo++) {
      const ml = ctx.calcMonthLuck(2026, mo, saju, gods);
      monthLucks.push({ mo, score: ml?.score ?? null });
    }
  }
  
  // Best 10 years
  let best10 = null;
  if (ctx.getNext10Years) {
    try {
      const r10 = ctx.getNext10Years(saju, v.y, v.g, gods, v.m, v.d, v.h);
      // getNext10Years returns { years: [...], bestYear, worstYear }
      const arr = Array.isArray(r10) ? r10 : (r10?.years || []);
      best10 = { totalScore: arr.reduce((s, y) => s + (y.score || 0), 0), bestYear: r10?.bestYear || null };
    } catch(e) {}
  }
  
  return {
    pillars: {
      year: yp?.s?.c + yp?.b?.c,
      month: mp?.s?.c + mp?.b?.c,
      day: dp?.s?.c + dp?.b?.c,
      hour: hp?.s?.c + hp?.b?.c,
    },
    gods: gods ? { yong: gods.yong, gi: gods.gi, hee: gods.hee } : null,
    strength: strength ? { score: strength.score, verdict: strength.verdict } : null,
    format: format ? (format.name || format.god || JSON.stringify(format).substring(0, 50)) : null,
    yl2026: yl2026 ? { score: yl2026.score, rating: yl2026.rating } : null,
    monthLucks: monthLucks.length ? monthLucks : null,
    best10: best10,
  };
}

function computeMatch(ctx, v) {
  if (!ctx.analyzeMatchAdvanced && !ctx.analyzeMatchCore) return null;
  const inp = v.input||v; const p1 = inp.p1, p2 = inp.p2, g = inp.g, mode = inp.mode;
  
  const make = (y,m,d,h,gdr) => {
    const effH = (h!=null&&h>=0&&h<12)?h:-1; const adj = ctx.adjustTime ? ctx.adjustTime(y,m,d,effH,'Asia/Seoul') : {y,m,d,h};
    const yp=ctx.calcYearPillar(adj.y,adj.m,adj.d,adj.h);
    const mp=ctx.calcMonthPillar(adj.y,adj.m,adj.d,adj.h);
    const dp=ctx.calcDayPillar(adj.y,adj.m,adj.d);
    const hp=(adj.h!=null && adj.h>=0)?ctx.calcHourPillar(dp.s,adj.h):null;
    const saju={year:yp,month:mp,day:dp,hour:hp};
    const gods=ctx.calcGods?ctx.calcGods(saju,gdr):null;
    const str=ctx.calcStrength?ctx.calcStrength(saju):null;
    return {saju,gods,str};
  };
  
  const my = make(p1[0],p1[1],p1[2],p1[3],g[0]);
  const pt = make(p2[0],p2[1],p2[2],p2[3],g[1]);
  
  try {
    const result = ctx.analyzeMatchAdvanced(
      my.saju, my.gods, my.str,
      pt.saju, pt.gods, pt.str,
      mode
    );
    return { score: result?.score, cats: result?.categories };
  } catch(e) {
    return { error: e.message.substring(0, 100) };
  }
}

// ── Generate Mode ──────────────────────────────────────────────
function generate(htmlPath, outputPath) {
  console.log(`\n[GENERATE] Loading engine from ${path.basename(htmlPath)}...`);
  const ctx = loadEngine(htmlPath);
  console.log(`✅ Engine loaded`);
  
  const results = [];
  let ok = 0, fail = 0;
  
  for (const v of INDIVIDUAL_VECTORS) {
    try {
      const result = computeIndividual(ctx, v);
      results.push({ id: v.id, type: 'individual', input: v, output: result });
      ok++;
    } catch(e) {
      results.push({ id: v.id, type: 'individual', input: v, error: e.message.substring(0,100) });
      fail++;
      console.log(`  ⚠️  id=${v.id} error: ${e.message.substring(0,80)}`);
    }
  }
  
  for (const v of MATCH_VECTORS) {
    try {
      const result = computeMatch(ctx, v);
      results.push({ id: `m${v.id}`, type: 'match', input: v.input, output: result });
      ok++;
    } catch(e) {
      results.push({ id: `m${v.id}`, type: 'match', input: v.input, error: e.message.substring(0,100) });
      fail++;
    }
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✅ Golden master generated: ${outputPath}`);
  console.log(`   Total: ${results.length} | OK: ${ok} | Failed: ${fail}`);
  
  // Sample output
  const sample = results.find(r => r.output?.pillars);
  if (sample) {
    console.log(`\nSample (id=${sample.id}): ${JSON.stringify(sample.output).substring(0, 200)}`);
  }
}

// ── Verify Mode ────────────────────────────────────────────────
function verify(htmlPath, goldenPath) {
  console.log(`\n[VERIFY] ${path.basename(htmlPath)} vs ${path.basename(goldenPath)}`);
  const ctx = loadEngine(htmlPath);
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
  console.log(`✅ Engine loaded. Golden records: ${golden.length}`);
  
  let pass = 0, changed = 0, error = 0;
  const changes = [];
  
  for (const rec of golden) {
    if (rec.error) continue;
    try {
      let current;
      if (rec.type === 'individual') {
        current = computeIndividual(ctx, rec.input);
      } else if (rec.type === 'match') {
        current = computeMatch(ctx, rec.input);
      }
      
      const goldenStr = JSON.stringify(rec.output);
      const currentStr = JSON.stringify(current);
      
      if (goldenStr === currentStr) {
        pass++;
      } else {
        changed++;
        changes.push({
          id: rec.id,
          type: rec.type,
          input: rec.input,
          golden: rec.output,
          current,
        });
      }
    } catch(e) {
      error++;
      changes.push({ id: rec.id, type: rec.type, error: e.message.substring(0, 100) });
    }
  }
  
  console.log(`\n═══════════════════════════════════════`);
  console.log(`PASS: ${pass} | CHANGED: ${changed} | ERROR: ${error}`);
  console.log(`═══════════════════════════════════════`);
  
  if (changes.length > 0) {
    console.log(`\n⚠️  CHANGES DETECTED (${changes.length}):`);
    changes.forEach(c => {
      console.log(`\n  [id=${c.id} type=${c.type}]`);
      if (c.error) { console.log(`    ERROR: ${c.error}`); return; }
      // Show diffs
      const g = c.golden, cu = c.current;
      if (g?.pillars && cu?.pillars) {
        if (JSON.stringify(g.pillars) !== JSON.stringify(cu.pillars))
          console.log(`    Pillars: ${JSON.stringify(g.pillars)} → ${JSON.stringify(cu.pillars)}`);
      }
      if (g?.yl2026?.score !== cu?.yl2026?.score)
        console.log(`    YL2026 score: ${g?.yl2026?.score} → ${cu?.yl2026?.score}`);
      if (JSON.stringify(g?.monthLucks) !== JSON.stringify(cu?.monthLucks)) {
        const gScores = (g?.monthLucks||[]).map(ml=>ml.score);
        const cScores = (cu?.monthLucks||[]).map(ml=>ml.score);
        const diffs = gScores.map((s,i)=>s!==cScores[i]?`M${i+1}:${s}→${cScores[i]}`:null).filter(Boolean);
        if (diffs.length) console.log(`    MonthLuck diffs: ${diffs.join(', ')}`);
      }
      if (JSON.stringify(g?.gods) !== JSON.stringify(cu?.gods))
        console.log(`    Gods: ${JSON.stringify(g?.gods)} → ${JSON.stringify(cu?.gods)}`);
      if (g?.format !== cu?.format)
        console.log(`    Format: ${g?.format} → ${cu?.format}`);
      if (JSON.stringify(g?.best10) !== JSON.stringify(cu?.best10))
        console.log(`    Best10: ${JSON.stringify(g?.best10)} → ${JSON.stringify(cu?.best10)}`);
      if (g?.score !== cu?.score)
        console.log(`    Match score: ${g?.score} → ${cu?.score}`);
    });
    console.log(`\n  → If these are intentional changes, run 'generate' to update golden master.`);
  } else {
    console.log(`\n✅ ALL MATCH - No unintended changes detected. Safe to deploy.`);
  }
  
  return changed + error;
}

// ── CLI ────────────────────────────────────────────────────────
const [,, mode, htmlPath, goldenPath] = process.argv;
if (!mode || !htmlPath || !goldenPath) {
  console.log('Usage: node saju_golden_test.js [generate|verify] <html> <golden.json>');
  process.exit(1);
}
if (mode === 'generate') {
  generate(htmlPath, goldenPath);
} else if (mode === 'verify') {
  const nChanged = verify(htmlPath, goldenPath);
  process.exit(nChanged > 0 ? 1 : 0);
} else {
  console.error('Unknown mode:', mode);
  process.exit(1);
}
