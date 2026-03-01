#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
K-MUDANG 3언어 일관성 자동 검증 시스템 v1.0
사용법: python verify_consistency.py ko.html en.html jp.html
출력: audit_report.json, fix_patches.py
"""

import re, sys, json, os
from datetime import datetime

# ── 60갑자 정의 ─────────────────────────────────────────────────────────────
GAPJA = [
    '甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉',
    '甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未',
    '甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅','辛卯','壬辰','癸巳',
    '甲午','乙未','丙申','丁酉','戊戌','己亥','庚子','辛丑','壬寅','癸卯',
    '甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑',
    '甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥'
]

# ── 배우자운 극성 판단 단어 목록 ─────────────────────────────────────────────
SPOUSE_NEG = {
    'ko': ['갈등','어려','힘든','조심','약할','분리','충돌','이별','냉정','주의','복잡','어긋'],
    'en': ['conflict','difficult','caution','weak','strain','friction','turbulence','unstable','challenge'],
    'jp': ['葛藤','困難','注意','弱','別離','衝突','苦労','トラブル','難しい','問題']
}
SPOUSE_POS = {
    'ko': ['좋습','안정','원만','행복','성실','든든','귀인','지지','아름','화목'],
    'en': ['stable','harmonious','supportive','good','strong','great','blessed','excellent'],
    'jp': ['安定','良い','堅実','幸せ','円満','支え','穏','充実','優秀','幸福']
}

# ── 신살 라벨 정의 ────────────────────────────────────────────────────────────
# KO 기준 올바른 라벨 (프롬프트 룰 기반)
SINSSAL_CORRECT = {
    '귀문관살': {'ko': '중', 'en': 'Neutral', 'jp': '中'},
    '화개살':   {'ko': '중', 'en': 'Neutral', 'jp': '中'},
    '학당귀인': {'ko': '길', 'en': 'Auspicious', 'jp': '吉'},
    '천의성':   {'ko': '길', 'en': 'Auspicious', 'jp': '吉'},
    '양인살':   {'ko': '중', 'en': 'Neutral', 'jp': '中'},
    '도화살':   {'ko': '중', 'en': 'Neutral', 'jp': '中'},
    '백호살':   {'ko': '중', 'en': 'Neutral', 'jp': '中'},
    '역마살':   {'ko': '중', 'en': 'Neutral', 'jp': '中'},
}

# ── 필수 섹션 체크 ────────────────────────────────────────────────────────────
REQUIRED_SECTIONS = {
    'ko': ['공망 전실', '탈공(脫空)', '脫空', '공망이 채워', '공망을 깨뜨림', 'voidBreakDesc'],
    'en': ['VOID BREAK', 'Void Break', 'breaks Void', 'void break'],
    'jp': ['脱空', '空亡填実', '空亡が満たされ', '空亡を破'],
}

RATING_SECTIONS = {
    'ko': ['세운 평가', '돌파의 해', '突破', '大運 評價', '대운 평가'],
    'en': ['Annual Rating', 'BREAKTHROUGH', 'VOLATILE', 'NEUTRAL'],
    'jp': ['歳運評価', '突破', '好転', 'ブレイクスルー'],
}

# ────────────────────────────────────────────────────────────────────────────
class ConsistencyAuditor:
    def __init__(self, ko_path, en_path, jp_path):
        self.files = {'ko': ko_path, 'en': en_path, 'jp': jp_path}
        self.html = {}
        self.issues = []
        self.patches = []
        
        for lang, path in self.files.items():
            with open(path, encoding='utf-8') as f:
                self.html[lang] = f.read()
        print(f"✅ 파일 로드 완료: KO({len(self.html['ko'])//1024}KB) EN({len(self.html['en'])//1024}KB) JP({len(self.html['jp'])//1024}KB)")

    # ── 데이터 추출 ──────────────────────────────────────────────────────────

    def extract_prompt_ilju_db(self, html):
        """프롬프트 주입용 일주론 DB 추출 (t, d, s 필드)"""
        pattern = r"'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])'\s*:\s*\{t:'([^']*)',d:'([^']*)',s:'([^']*)'\}"
        return {m[0]: {'t': m[1], 'd': m[2], 's': m[3]} for m in re.findall(pattern, html)}

    def extract_ui_ilju_db(self, html):
        """UI 표시용 일주 DB 추출 (name, desc 필드)"""
        pattern = r"'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])'\s*:\s*\{[^}]*?name\s*:\s*'([^']+)'"
        return dict(re.findall(pattern, html))

    def get_spouse_polarity(self, text, lang):
        """텍스트의 배우자운 극성 반환: 'pos' | 'neg' | 'neutral'"""
        neg_count = sum(1 for w in SPOUSE_NEG[lang] if w in text)
        pos_count = sum(1 for w in SPOUSE_POS[lang] if w in text)
        if neg_count > pos_count: return 'neg'
        if pos_count > neg_count: return 'pos'
        return 'neutral'

    def detect_sinssal_label(self, html, lang):
        """신살 라벨 추출"""
        results = {}
        # 귀문관살 라벨 패턴
        for sinssal_ko, correct in SINSSAL_CORRECT.items():
            # KO
            if lang == 'ko':
                m = re.search(rf'{sinssal_ko}\(([흉중길])\)', html)
                if m:
                    results[sinssal_ko] = m.group(1)
            elif lang == 'en':
                # Spirit Gate, Canopy Star 등 영어명 매핑
                en_map = {
                    '귀문관살': 'Spirit Gate',
                    '화개살': 'Canopy Star',
                    '학당귀인': 'Academy Noble',
                    '천의성': 'Heavenly Doctor',
                }
                en_name = en_map.get(sinssal_ko)
                if en_name:
                    m = re.search(rf'{re.escape(en_name)}[^)]*\(([^)]+)\)', html)
                    if m:
                        results[sinssal_ko] = m.group(1).strip()
            elif lang == 'jp':
                jp_map = {
                    '귀문관살': '鬼門関殺',
                    '화개살': '華蓋殺',
                    '학당귀인': '学堂貴人',
                    '천의성': '天醫星',
                }
                jp_name = jp_map.get(sinssal_ko)
                if jp_name:
                    m = re.search(rf'{jp_name}\(([吉中凶])\)', html)
                    if m:
                        results[sinssal_ko] = m.group(1)
        return results

    # ── 검증 로직 ────────────────────────────────────────────────────────────

    def check_1_ilju_db_completeness(self):
        """CHECK 1: 60갑자 DB 완전성 검증"""
        print("\n[CHECK 1] 일주론 DB 완전성 (60갑자 × 3언어)")
        dbs = {lang: self.extract_prompt_ilju_db(self.html[lang]) for lang in ['ko','en','jp']}
        
        for lang, db in dbs.items():
            missing = [g for g in GAPJA if g not in db]
            if missing:
                self.issues.append({
                    'severity': 'CRITICAL',
                    'check': '일주론 DB 완전성',
                    'lang': lang,
                    'desc': f'{lang.upper()} DB에서 {len(missing)}개 간지 누락: {missing}'
                })
                print(f"  ❌ {lang.upper()}: {len(missing)}개 누락 - {missing}")
            else:
                print(f"  ✅ {lang.upper()}: 60개 완전")
        
        return dbs

    def check_2_spouse_polarity(self, dbs):
        """CHECK 2: 배우자운 극성 불일치 탐지"""
        print("\n[CHECK 2] 배우자운(s필드) 극성 3언어 일치성")
        found = 0
        for g in GAPJA:
            po = {}
            texts = {}
            for lang in ['ko','en','jp']:
                s = dbs[lang].get(g, {}).get('s', '')
                po[lang] = self.get_spouse_polarity(s, lang)
                texts[lang] = s
            
            # KO와 JP 극성이 다르면 이슈
            if po['ko'] != 'neutral' and po['jp'] != 'neutral' and po['ko'] != po['jp']:
                found += 1
                issue = {
                    'severity': 'HIGH',
                    'check': '배우자운 극성 불일치',
                    'gapja': g,
                    'polarity': po,
                    'texts': texts
                }
                self.issues.append(issue)
                print(f"  ❌ {g}: KO={po['ko']}({texts['ko'][:30]}) ≠ JP={po['jp']}({texts['jp'][:30]})")
                
                # 패치 생성 (JP가 KO/EN 기준으로 수정 필요)
                if po['ko'] == po['en']:  # KO/EN 일치 → JP가 버그
                    self.patches.append({
                        'type': 'ilju_s_field',
                        'gapja': g,
                        'lang': 'jp',
                        'current': texts['jp'],
                        'reference_ko': texts['ko'],
                        'reference_en': texts['en'],
                        'action': 'JP 배우자운을 KO/EN 기준으로 검토 후 수정 필요'
                    })
        
        if found == 0:
            print(f"  ✅ 전체 60갑자 배우자운 극성 일치")
        else:
            print(f"  → 총 {found}개 불일치 감지")

    def check_3_sinssal_labels(self):
        """CHECK 3: 신살 라벨(길/중/흉) 일관성"""
        print("\n[CHECK 3] 신살 라벨(길/중/흉) 언어 간 일관성")
        labels = {lang: self.detect_sinssal_label(self.html[lang], lang) for lang in ['ko','en','jp']}
        
        # 귀문관살 특별 검사 (Rule 66에서 Neutral로 명시)
        target = '귀문관살'
        correct = {'ko': '중', 'en': 'Neutral', 'jp': '中'}
        
        for lang in ['ko','jp']:  # EN은 이미 Neutral
            actual = labels[lang].get(target)
            if actual and actual != correct[lang]:
                self.issues.append({
                    'severity': 'MEDIUM',
                    'check': '신살 라벨 오분류',
                    'lang': lang,
                    'sinssal': target,
                    'current': actual,
                    'expected': correct[lang],
                    'desc': f'{lang.upper()} 귀문관살 라벨: {actual} → {correct[lang]} 수정 필요 (Rule 66: 초직관+불안 = 중립)'
                })
                print(f"  ❌ {lang.upper()} {target}: 현재={actual} → 예상={correct[lang]}")
                
                # 패치 생성
                if lang == 'ko':
                    self.patches.append({
                        'type': 'sinssal_label',
                        'lang': 'ko',
                        'sinssal': target,
                        'find': f'{target}(흉)',
                        'replace': f'{target}(중)',
                        'scope': '신살 라벨 생성 함수'
                    })
                elif lang == 'jp':
                    self.patches.append({
                        'type': 'sinssal_label',
                        'lang': 'jp',
                        'sinssal': target,
                        'find': '鬼門関殺(凶)',
                        'replace': '鬼門関殺(中)',
                        'scope': '신살 라벨 생성 함수'
                    })
                    
        # 나머지 신살 확인
        for lang in ['ko','en','jp']:
            print(f"  {lang.upper()} 신살 라벨: {labels[lang]}")

    def check_4_required_sections(self):
        """CHECK 4: 필수 섹션 존재 여부"""
        print("\n[CHECK 4] 필수 섹션 존재 여부 (공망 전실, 세운 Rating 등)")
        
        # 공망 전실
        print("  [공망 전실]")
        for lang in ['ko','en','jp']:
            found = any(kw in self.html[lang] for kw in REQUIRED_SECTIONS[lang])
            if lang == 'en':  # EN은 있어야 함
                status = "✅ 있음" if found else "❌ 없음"
            else:  # KO, JP는 없으면 개선 필요
                status = "✅ 있음" if found else "⚠️ 없음 (개선 권장)"
            print(f"    {lang.upper()}: {status}")
            if not found and lang != 'en':
                self.issues.append({
                    'severity': 'LOW',
                    'check': '공망 전실 섹션 누락',
                    'lang': lang,
                    'desc': f'{lang.upper()} 공망 전실(세운에서 공망이 채워지는 해) 섹션 누락'
                })
        
        # 세운 Rating
        print("  [세운 Rating 레이블]")
        for lang in ['ko','en','jp']:
            found = any(kw in self.html[lang] for kw in RATING_SECTIONS[lang])
            status = "✅ 있음" if found else "⚠️ 없음"
            print(f"    {lang.upper()}: {status}")

    def check_5_dinjim_combine_en(self):
        """CHECK 5: EN 丁壬合 BUREAU 오표기"""
        print("\n[CHECK 5] EN 丁壬合 합화(合化) 표기 검증")
        
        en_html = self.html['en']
        
        # 수정 여부 확인: 天合 제외 필터가 적용됐는지
        fix_applied = "i.t !== '天合'" in en_html or 'i.t != "天合"' in en_html
        old_bug = "filter(i => i.t && i.t.includes('合'))" in en_html and "i.t !== '天合'" not in en_html
        
        if old_bug:
            print(f"  ❌ EN BUREAU 필터에 天合 미제외: 천간합이 합국으로 오분류됨")
            self.issues.append({
                'severity': 'HIGH',
                'check': '丁壬合 합화 오표기',
                'lang': 'en',
                'desc': '丁壬合은 申月(金旺) 기준 합화 불성립. BUREAU 필터에 天合 포함 → AI가 합화 완성으로 오독',
                'fix': "filter에 && i.t !== '天合' 추가"
            })
            self.patches.append({
                'type': 'bureau_label',
                'lang': 'en',
                'find': "filter(i => i.t && i.t.includes('合'))",
                'replace': "filter(i => i.t && i.t.includes('合') && i.t !== '天合')",
                'scope': 'BUREAU criticalFeatures 생성부'
            })
        elif fix_applied:
            print(f"  ✅ 수정 완료: BUREAU 필터에서 天合 제외됨")
        else:
            print(f"  ℹ️ 패턴 미발견 - 구조 변경됐을 수 있음, 수동 확인 권장")

    def check_6_void_yanggin(self):
        """CHECK 6: 壬水 양인 子 공망 조합 특수 해석"""
        print("\n[CHECK 6] 壬水 양인(子) = 공망 특수 케이스 해석")
        
        # 壬水 사주에서 양인 子가 공망일 때의 특별 해석이 있는지 확인
        for lang, html in self.html.items():
            patterns = {
                'ko': ['양인.*공망', '공망.*양인', '양인이 공망'],
                'en': ['Sheep Blade.*void', 'void.*Sword Edge', 'sword edge.*void'],
                'jp': ['羊刃.*空亡', '空亡.*羊刃']
            }
            found = any(re.search(p, html, re.IGNORECASE) for p in patterns[lang])
            status = "✅ 있음" if found else "⚠️ 없음 (추가 권장)"
            print(f"  {lang.upper()}: 양인-공망 특수 해석 {status}")

    def check_7_quadruple_self_punishment(self):
        """CHECK 7: 동일 지지 4개 쿼드러플 룰 공백"""
        print("\n[CHECK 7] 동일 지지 4개(쿼드러플 자형) 룰 커버리지")
        
        for lang, html in self.html.items():
            patterns = {
                'ko': ['4개.*같은.*지지', '지지.*4개', '쿼드러플'],
                'en': ['quadruple', 'four.*same.*branch', '4.*identical.*branch'],
                'jp': ['四重', '4つの同じ', '同じ地支.*4']
            }
            found = any(re.search(p, html, re.IGNORECASE) for p in patterns[lang])
            status = "✅ 있음" if found else "⚠️ 없음 (Rule 53 상위 케이스 미정의)"
            print(f"  {lang.upper()}: {status}")
        
        self.issues.append({
            'severity': 'LOW',
            'check': '쿼드러플 자형 룰 공백',
            'lang': 'all',
            'desc': 'Rule 53은 트리플(3개)까지만 정의. 동일 지지 4개 이상 케이스 미처리',
            'recommendation': 'Rule 53 하단에 추가: 동일지지 4개 이상 = 종격 수준 판단 필수 + 최고 경고 등급'
        })

    def check_8_naeum_consistency(self):
        """CHECK 8: 납음오행 일간-납음 일치 케이스 해석"""
        print("\n[CHECK 8] 납음오행 특수 케이스 (일간=납음 동일 시)")
        
        # 壬戌 = 大海水(水) = 壬水와 동일 → Rule 87에서 "다른 경우"만 정의
        for lang, html in self.html.items():
            patterns = {
                'ko': ['납음.*같은', '일간.*납음.*동일', '보이는 것이 전부'],
                'en': ['same.*naeum', 'naeum.*same.*day master', 'transparent'],
                'jp': ['納音.*同じ', '日干.*納音.*同一']
            }
            found = any(re.search(p, html, re.IGNORECASE) for p in patterns[lang])
            print(f"  {lang.upper()}: 납음=일간 동일 케이스 해석 {'✅' if found else '⚠️ 없음'}")

    def check_9_early_midnight_system(self):
        """CHECK 9: 조자시/早子時 방식 명시 여부"""
        print("\n[CHECK 9] 자시(子時) 방식 명시 여부")
        
        checks = {
            'ko': ['조자시', '早子時'],
            'en': ['Early.*Midnight', 'early-midnight', 'Early Midnight', '早子時'],
            'jp': ['早子時', '조자시', 'アーリー']
        }
        for lang in ['ko','en','jp']:
            found = any(kw.lower() in self.html[lang].lower() for kw in checks[lang])
            if lang == 'en' and not found:
                status = "❌ 없음 (KO/JP에는 명시됨)"
                self.issues.append({
                    'severity': 'LOW',
                    'check': '자시 방식 미명시',
                    'lang': 'en',
                    'desc': 'EN에 Early Midnight(早子時) 방식 미명시. KO/JP는 명시됨.',
                    'recommendation': 'Birth time adjustment note에 Early Midnight system 추가'
                })
            else:
                status = "✅ 있음" if found else "ℹ️ 없음"
            print(f"  {lang.upper()}: {status}")

    # ── 리포트 생성 ──────────────────────────────────────────────────────────

    def generate_report(self):
        """감사 리포트 및 패치 파일 생성"""
        
        # 심각도별 분류
        critical = [i for i in self.issues if i.get('severity') == 'CRITICAL']
        high = [i for i in self.issues if i.get('severity') == 'HIGH']
        medium = [i for i in self.issues if i.get('severity') == 'MEDIUM']
        low = [i for i in self.issues if i.get('severity') == 'LOW']
        
        print("\n" + "="*70)
        print("📊 최종 감사 리포트")
        print("="*70)
        print(f"🔴 CRITICAL: {len(critical)}건")
        print(f"🟠 HIGH:     {len(high)}건")
        print(f"🟡 MEDIUM:   {len(medium)}건")
        print(f"🟢 LOW:      {len(low)}건")
        print(f"📋 패치 항목: {len(self.patches)}건")
        print()
        
        for sev, items in [('🔴 CRITICAL', critical), ('🟠 HIGH', high), 
                           ('🟡 MEDIUM', medium), ('🟢 LOW', low)]:
            if items:
                print(f"\n{sev}:")
                for i, item in enumerate(items, 1):
                    print(f"  {i}. [{item.get('lang','').upper()}] {item.get('check')}: {item.get('desc','')[:100]}")
        
        # JSON 리포트 저장
        report = {
            'generated': datetime.now().isoformat(),
            'summary': {
                'critical': len(critical),
                'high': len(high),
                'medium': len(medium),
                'low': len(low),
                'patches': len(self.patches)
            },
            'issues': self.issues,
            'patches': self.patches
        }
        
        with open('audit_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n✅ audit_report.json 저장 완료")
        
        # 패치 스크립트 생성
        self.generate_patch_script()
        
        return report

    def generate_patch_script(self):
        """fix_patches.py 자동 생성"""
        
        patch_code = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
K-MUDANG 자동 패치 스크립트 - audit_report.json 기반 자동 생성
실행: python fix_patches.py [--dry-run]
"""
import sys, shutil, re
from datetime import datetime

DRY_RUN = '--dry-run' in sys.argv

def patch_file(path, find, replace, description):
    with open(path, encoding='utf-8') as f:
        content = f.read()
    
    if find not in content:
        print(f"  ⚠️ 패턴 미발견 (이미 수정됐거나 위치 변경): {description}")
        print(f"     찾는 패턴: {repr(find[:60])}")
        return False
    
    count = content.count(find)
    new_content = content.replace(find, replace)
    
    if not DRY_RUN:
        # 백업
        backup = path + f'.bak.{datetime.now().strftime(\"%Y%m%d_%H%M%S\")}'
        shutil.copy2(path, backup)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✅ [{count}개 위치] 수정 완료: {description}")
        print(f"     백업: {backup}")
    else:
        print(f"  [DRY-RUN] {count}개 위치에서 수정 예정: {description}")
    return True

print("K-MUDANG 패치 스크립트 실행")
print("="*60)

'''
        
        for p in self.patches:
            ptype = p.get('type', '')
            lang = p.get('lang', '')
            
            if ptype == 'sinssal_label':
                file_map = {'ko': 'ko.html', 'en': 'en.html', 'jp': 'jp.html'}
                patch_code += f"""
# PATCH: {p.get('lang','').upper()} {p.get('sinssal','')} 라벨 수정
print("\\n[PATCH] {p.get('lang','').upper()} {p.get('sinssal','')} 라벨: {p.get('find','')} → {p.get('replace','')}")
patch_file(
    '{file_map.get(lang, lang+".html")}',
    {repr(p.get('find',''))},
    {repr(p.get('replace',''))},
    '{p.get("sinssal","")} 라벨 수정 ({p.get("lang","").upper()})'
)
"""
            elif ptype == 'bureau_label':
                patch_code += f"""
# PATCH: EN 丁壬合 BUREAU 표기 수정
print("\\n[PATCH] EN 丁壬合 합화 오표기 수정")
patch_file(
    'en.html',
    {repr(p.get('find',''))},
    {repr(p.get('replace',''))},
    '丁壬合 합화 불성립 명시 (申月 금왕월 기준)'
)
"""
            elif ptype == 'ilju_s_field':
                patch_code += f"""
# PATCH: {p.get('lang','').upper()} {p.get('gapja','')} 배우자운 - 수동 검토 필요
# 현재 JP: {repr(p.get('current','')[:60])}
# 참조 KO: {repr(p.get('reference_ko','')[:60])}
# 참조 EN: {repr(p.get('reference_en','')[:60])}
# → 자동 패치 불가: 번역 검토 후 수동 수정 권장
print("\\n[MANUAL] {p.get('gapja','')} JP 배우자운 수동 검토 필요")
print("  현재 JP: {p.get('current','')[:60]}")
print("  참조 KO: {p.get('reference_ko','')[:60]}")
"""

        patch_code += """
print("\\n" + "="*60)
print("패치 완료. 반드시 Golden Master 테스트 실행:")
print("  node saju_golden_test.js verify ko.html golden_master.json")
print("  node saju_golden_test.js verify en.html golden_master_match_en.json")
"""
        
        with open('fix_patches.py', 'w', encoding='utf-8') as f:
            f.write(patch_code)
        print(f"✅ fix_patches.py 저장 완료")

    # ── 메인 실행 ────────────────────────────────────────────────────────────

    def run_all(self):
        print("🔍 K-MUDANG 3언어 일관성 감사 시작")
        print("="*70)
        
        dbs = self.check_1_ilju_db_completeness()
        self.check_2_spouse_polarity(dbs)
        self.check_3_sinssal_labels()
        self.check_4_required_sections()
        self.check_5_dinjim_combine_en()
        self.check_6_void_yanggin()
        self.check_7_quadruple_self_punishment()
        self.check_8_naeum_consistency()
        self.check_9_early_midnight_system()
        
        return self.generate_report()


# ── 진입점 ──────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("사용법: python verify_consistency.py ko.html en.html jp.html")
        sys.exit(1)
    
    ko_path, en_path, jp_path = sys.argv[1], sys.argv[2], sys.argv[3]
    
    for p in [ko_path, en_path, jp_path]:
        if not os.path.exists(p):
            print(f"❌ 파일 없음: {p}")
            sys.exit(1)
    
    auditor = ConsistencyAuditor(ko_path, en_path, jp_path)
    report = auditor.run_all()
    
    critical = report['summary']['critical']
    high = report['summary']['high']
    
    sys.exit(1 if (critical + high) > 0 else 0)
