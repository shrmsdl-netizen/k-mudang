/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  K-MUDANG AI Module v1.1.0                                                ║
 * ║  Progressive Enhancement - Fortune + Match API Integration               ║
 * ║                                                                           ║
 * ║  Patent: 10-2026-0010452                                                  ║
 * ║  API: https://k-mudang.vercel.app                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * CHANGELOG:
 * - v1.0.0: Fortune API 연동
 * - v1.1.0: Match API 연동 추가, UI 개선, 에러 핸들링 강화
 * 
 * 사용법: index.html의 </body> 직전에 삽입
 * <script src="k-mudang-ai-module.js"></script>
 */

(function() {
  'use strict';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  const CONFIG = {
    API_BASE: 'https://k-mudang.vercel.app',
    VERSION: '1.1.0',
    ENDPOINTS: {
      fortune: '/api/fortune',
      match: '/api/match',
      test: '/api/test'
    },
    TIERS: {
      free: { model: 'claude-3-haiku', price: 0, priceKRW: '₩0', label: '무료 AI' },
      premium: { model: 'claude-sonnet-4', price: 5000, priceKRW: '₩5,000', label: '프리미엄' }
    },
    MATCH_PRICE: {
      free: { priceKRW: '₩0', label: '무료 궁합 분석' },
      premium: { priceKRW: '₩7,000', label: '프리미엄 궁합 분석' }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  const STYLES = `
    /* ===== K-MUDANG AI Module Styles ===== */
    
    /* Modal Base */
    .km-modal {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 99999;
      overflow-y: auto;
      padding: 20px;
      animation: kmFadeIn 0.3s ease;
      backdrop-filter: blur(5px);
    }
    @keyframes kmFadeIn { from { opacity: 0; } to { opacity: 1; } }
    .km-modal.show { display: flex; justify-content: center; align-items: flex-start; }
    
    /* Modal Container */
    .km-container {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%);
      border: 2px solid rgba(212,175,55,0.4);
      border-radius: 24px;
      max-width: 650px;
      width: 100%;
      margin: 20px auto;
      padding: 35px;
      box-shadow: 
        0 25px 80px rgba(0,0,0,0.6),
        0 0 60px rgba(212,175,55,0.15),
        inset 0 1px 0 rgba(255,255,255,0.05);
      position: relative;
    }
    
    /* Close Button */
    .km-close {
      position: absolute;
      top: 18px; right: 22px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #888;
      font-size: 24px;
      width: 40px; height: 40px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .km-close:hover { 
      color: #D4AF37; 
      border-color: rgba(212,175,55,0.5);
      background: rgba(212,175,55,0.1);
      transform: rotate(90deg);
    }
    
    /* Header */
    .km-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 25px;
      border-bottom: 1px solid rgba(212,175,55,0.2);
    }
    .km-header h2 {
      font-family: 'Cinzel Decorative', 'Noto Serif KR', serif;
      background: linear-gradient(135deg, #FFD700, #FFA500, #FFD700);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 1.9rem;
      margin: 0 0 12px 0;
      letter-spacing: 2px;
    }
    .km-header p {
      color: #666;
      font-size: 0.85rem;
      margin: 0;
    }
    .km-header .km-badge {
      display: inline-block;
      background: rgba(212,175,55,0.15);
      border: 1px solid rgba(212,175,55,0.3);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.7rem;
      color: #D4AF37;
      margin-top: 10px;
    }
    
    /* Content Area */
    .km-content { color: #ddd; line-height: 1.9; }
    
    /* Result Sections */
    .km-headline {
      font-size: 1.5rem;
      text-align: center;
      margin-bottom: 25px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05));
      border-radius: 16px;
      border: 1px solid rgba(212,175,55,0.2);
    }
    .km-headline-fortune { color: #FFD700; }
    .km-headline-match { 
      background: linear-gradient(135deg, rgba(255,105,180,0.15), rgba(255,105,180,0.05));
      border-color: rgba(255,105,180,0.3);
      color: #FF69B4;
    }
    
    .km-body {
      font-size: 1rem;
      color: #bbb;
      text-align: justify;
      margin-bottom: 25px;
      padding: 0 5px;
    }
    
    .km-advice {
      background: linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05));
      border-left: 4px solid #D4AF37;
      padding: 18px 22px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 25px;
    }
    .km-advice strong {
      color: #D4AF37;
      display: block;
      margin-bottom: 10px;
      font-size: 0.95rem;
    }
    .km-advice p { margin: 0; color: #aaa; }
    
    /* Match-specific: Score Display */
    .km-match-score {
      text-align: center;
      padding: 30px;
      background: linear-gradient(135deg, rgba(255,105,180,0.1), rgba(255,215,0,0.05));
      border-radius: 16px;
      margin-bottom: 25px;
    }
    .km-match-score .score-number {
      font-size: 4rem;
      font-weight: 900;
      background: linear-gradient(135deg, #FF69B4, #FFD700);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .km-match-score .score-label {
      color: #888;
      font-size: 0.9rem;
      margin-top: 5px;
    }
    
    /* Match: Chemistry Section */
    .km-chemistry {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 25px;
    }
    .km-chemistry-item {
      padding: 15px;
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .km-chemistry-item.good { border-left: 3px solid #4CAF50; }
    .km-chemistry-item.caution { border-left: 3px solid #FF9800; }
    .km-chemistry-item h4 {
      color: #888;
      font-size: 0.8rem;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .km-chemistry-item p { color: #ccc; margin: 0; font-size: 0.9rem; }
    
    /* Lucky Items Grid */
    .km-lucky {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 25px;
    }
    .km-lucky-item {
      background: rgba(0,0,0,0.4);
      padding: 15px 12px;
      border-radius: 10px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.03);
    }
    .km-lucky-item span {
      display: block;
      color: #666;
      font-size: 0.7rem;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .km-lucky-item strong {
      color: #FFD700;
      font-size: 0.95rem;
    }
    
    /* Loading State */
    .km-loading {
      text-align: center;
      padding: 80px 20px;
    }
    .km-spinner {
      width: 60px; height: 60px;
      border: 4px solid rgba(212,175,55,0.15);
      border-top-color: #D4AF37;
      border-radius: 50%;
      animation: kmSpin 0.8s linear infinite;
      margin: 0 auto 25px;
    }
    @keyframes kmSpin { to { transform: rotate(360deg); } }
    .km-loading p { color: #888; font-size: 1rem; }
    .km-loading .km-model-info {
      color: #555;
      font-size: 0.8rem;
      margin-top: 15px;
      padding: 8px 15px;
      background: rgba(0,0,0,0.3);
      border-radius: 20px;
      display: inline-block;
    }
    
    /* Error State */
    .km-error {
      text-align: center;
      padding: 50px 20px;
    }
    .km-error-icon { font-size: 4rem; margin-bottom: 20px; }
    .km-error-title { color: #ff6b6b; font-size: 1.2rem; margin-bottom: 10px; }
    .km-error-msg { color: #888; font-size: 0.9rem; margin-bottom: 25px; }
    
    /* Buttons */
    .km-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 30px;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
      margin-bottom: 12px;
    }
    .km-btn-free {
      background: linear-gradient(135deg, #2d3748, #1a202c);
      color: #D4AF37;
      border: 1px solid rgba(212,175,55,0.4);
    }
    .km-btn-free:hover {
      background: linear-gradient(135deg, #3d4758, #2a303c);
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    }
    .km-btn-premium {
      background: linear-gradient(135deg, #D4AF37, #B8860B);
      color: #1a1a2e;
    }
    .km-btn-premium:hover {
      background: linear-gradient(135deg, #FFD700, #D4AF37);
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(212,175,55,0.4);
    }
    .km-btn-match {
      background: linear-gradient(135deg, #FF69B4, #C71585);
      color: white;
    }
    .km-btn-match:hover {
      background: linear-gradient(135deg, #FF85C1, #E91E8C);
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(255,105,180,0.4);
    }
    .km-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }
    .km-btn-secondary {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      color: #888;
    }
    .km-btn-secondary:hover {
      border-color: rgba(212,175,55,0.5);
      color: #D4AF37;
    }
    
    /* Tier Badge */
    .km-tier {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
      margin-left: 8px;
      vertical-align: middle;
    }
    .km-tier-free { background: #4a5568; color: #a0aec0; }
    .km-tier-premium { background: #D4AF37; color: #1a1a2e; }
    
    /* Tier Selection Cards */
    .km-tier-card {
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 15px;
      cursor: pointer;
      transition: all 0.3s;
      border: 2px solid transparent;
    }
    .km-tier-card:hover { transform: translateY(-2px); }
    .km-tier-card-free {
      background: rgba(74,85,104,0.2);
      border-color: rgba(74,85,104,0.4);
    }
    .km-tier-card-free:hover { border-color: rgba(160,174,192,0.6); }
    .km-tier-card-premium {
      background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05));
      border-color: rgba(212,175,55,0.4);
    }
    .km-tier-card-premium:hover { border-color: rgba(212,175,55,0.8); }
    .km-tier-card h4 { margin: 0 0 8px 0; font-size: 1.1rem; }
    .km-tier-card p { margin: 0; font-size: 0.85rem; color: #888; }
    .km-tier-card .km-price { 
      font-size: 1.3rem; 
      font-weight: 700; 
      margin-top: 10px;
    }
    
    /* Injected Buttons */
    .km-inject-btn {
      margin-top: 20px;
      padding: 18px 28px;
      border: none;
      border-radius: 14px;
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: all 0.3s ease;
    }
    .km-inject-fortune {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    }
    .km-inject-fortune:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5);
    }
    .km-inject-match {
      background: linear-gradient(135deg, #FF69B4 0%, #C71585 100%);
      box-shadow: 0 4px 20px rgba(255, 105, 180, 0.4);
    }
    .km-inject-match:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 30px rgba(255, 105, 180, 0.5);
    }
    
    /* Footer */
    .km-footer {
      text-align: center;
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .km-footer p {
      color: #555;
      font-size: 0.75rem;
      margin: 0;
    }
    
    /* Responsive */
    @media (max-width: 600px) {
      .km-container { padding: 25px 20px; margin: 10px; }
      .km-header h2 { font-size: 1.5rem; }
      .km-lucky { grid-template-columns: 1fr 1fr; }
      .km-chemistry { grid-template-columns: 1fr; }
    }
  `;

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  let currentMode = null; // 'fortune' | 'match'
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INJECT STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  function injectStyles() {
    if (document.getElementById('km-styles')) return;
    const style = document.createElement('style');
    style.id = 'km-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  function createModal() {
    if (document.getElementById('km-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'km-modal';
    modal.className = 'km-modal';
    modal.innerHTML = `
      <div class="km-container">
        <button class="km-close" onclick="window.KMudangAI.close()">&times;</button>
        <div class="km-header">
          <h2 id="km-title">🔮 AI Fortune</h2>
          <p>Powered by Claude AI</p>
          <span class="km-badge">Patent 10-2026-0010452</span>
        </div>
        <div id="km-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Backdrop click close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.KMudangAI.close();
    });
    
    // ESC close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.KMudangAI.close();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INJECT BUTTONS
  // ═══════════════════════════════════════════════════════════════════════════
  function injectFortuneButton() {
    const aiCard = document.getElementById('card-ai');
    if (!aiCard || document.getElementById('km-fortune-wrapper')) return;
    
    const wrapper = document.createElement('div');
    wrapper.id = 'km-fortune-wrapper';
    wrapper.style.cssText = 'margin-top:25px;padding:25px;background:linear-gradient(135deg,rgba(102,126,234,0.1),rgba(118,75,162,0.05));border-radius:16px;border:1px solid rgba(102,126,234,0.2);';
    wrapper.innerHTML = `
      <p style="text-align:center;color:#a0aec0;font-size:0.95rem;margin-bottom:18px;">
        ✨ Get personalized AI fortune reading based on your chart
      </p>
      <button class="km-inject-btn km-inject-fortune" onclick="window.KMudangAI.openFortune()">
        🤖 Get AI Fortune Reading
      </button>
      <p style="text-align:center;color:#666;font-size:0.75rem;margin-top:12px;">
        Free tier available · Premium for deeper insights
      </p>
    `;
    aiCard.appendChild(wrapper);
    console.log('[K-MUDANG AI] ✅ Fortune button injected');
  }

  function injectMatchButton() {
    const matchResult = document.getElementById('match-result');
    if (!matchResult || document.getElementById('km-match-wrapper')) return;
    
    // 궁합 결과 내의 AI 섹션 찾기
    const aiSection = matchResult.querySelector('.card.gold');
    if (!aiSection) return;
    
    const wrapper = document.createElement('div');
    wrapper.id = 'km-match-wrapper';
    wrapper.style.cssText = 'margin-top:20px;padding:25px;background:linear-gradient(135deg,rgba(255,105,180,0.1),rgba(199,21,133,0.05));border-radius:16px;border:1px solid rgba(255,105,180,0.2);';
    wrapper.innerHTML = `
      <p style="text-align:center;color:#FF69B4;font-size:0.95rem;margin-bottom:18px;">
        💕 Get AI-powered compatibility analysis
      </p>
      <button class="km-inject-btn km-inject-match" onclick="window.KMudangAI.openMatch()">
        💕 Get AI Compatibility Analysis
      </button>
      <p style="text-align:center;color:#666;font-size:0.75rem;margin-top:12px;">
        Deep relationship insights powered by Claude AI
      </p>
    `;
    
    // 기존 "Copy for AI" 버튼 앞에 삽입
    aiSection.insertBefore(wrapper, aiSection.querySelector('div[style*="text-align:center"]'));
    console.log('[K-MUDANG AI] ✅ Match button injected');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  function setTitle(title) {
    document.getElementById('km-title').innerHTML = title;
  }
  
  function renderTierSelection(mode) {
    currentMode = mode;
    const isFortune = mode === 'fortune';
    
    setTitle(isFortune ? '🔮 AI Fortune Reading' : '💕 AI Compatibility Analysis');
    
    const body = document.getElementById('km-body');
    body.innerHTML = `
      <div style="padding:10px 0;">
        <div class="km-tier-card km-tier-card-free" onclick="window.KMudangAI.execute('free')">
          <h4 style="color:#a0aec0;">🆓 ${isFortune ? '무료 AI 운세' : '무료 AI 궁합 분석'}</h4>
          <p>Quick insights using Claude Haiku</p>
          <div class="km-price" style="color:#a0aec0;">FREE</div>
        </div>
        
        <div class="km-tier-card km-tier-card-premium" onclick="window.KMudangAI.execute('premium')">
          <h4 style="color:#FFD700;">⭐ ${isFortune ? '프리미엄 AI 운세' : '프리미엄 AI 궁합 분석'}</h4>
          <p>Deep analysis using Claude Sonnet 4</p>
          <div class="km-price" style="color:#FFD700;">${isFortune ? '₩5,000' : '₩7,000'}</div>
        </div>
        
        <div style="margin-top:20px;padding:18px;background:rgba(0,0,0,0.3);border-radius:10px;">
          <p style="color:#666;font-size:0.85rem;margin:0;line-height:1.7;">
            <strong style="color:#a0aec0;">무료:</strong> 기본 ${isFortune ? '운세' : '궁합'} 해석 (Haiku 모델)<br>
            <strong style="color:#FFD700;">프리미엄:</strong> 심층 분석 + 구체적 조언 (Sonnet 4 모델)
          </p>
        </div>
      </div>
    `;
  }

  function renderLoading(tier) {
    const body = document.getElementById('km-body');
    const isFortune = currentMode === 'fortune';
    const modelName = tier === 'premium' ? 'Claude Sonnet 4' : 'Claude Haiku';
    
    body.innerHTML = `
      <div class="km-loading">
        <div class="km-spinner"></div>
        <p>${isFortune ? '🔮 AI가 당신의 사주를 분석 중입니다...' : '💕 AI가 두 분의 인연을 분석 중입니다...'}</p>
        <span class="km-model-info">Using ${modelName}</span>
      </div>
    `;
  }

  function renderFortuneResult(data) {
    const fortune = data.fortune || {};
    const body = document.getElementById('km-body');
    
    body.innerHTML = `
      <div class="km-content">
        <div class="km-headline km-headline-fortune">
          ${fortune.headline || '🔮 Your AI Fortune Reading'}
        </div>
        
        <div class="km-body">
          ${fortune.body || 'Unable to generate fortune. Please try again.'}
        </div>
        
        ${fortune.advice ? `
        <div class="km-advice">
          <strong>💡 Today's Advice</strong>
          <p>${fortune.advice}</p>
        </div>
        ` : ''}
        
        ${fortune.lucky ? `
        <div class="km-lucky">
          ${fortune.lucky.color ? `
          <div class="km-lucky-item">
            <span>Lucky Color</span>
            <strong>🎨 ${fortune.lucky.color}</strong>
          </div>
          ` : ''}
          ${fortune.lucky.direction ? `
          <div class="km-lucky-item">
            <span>Direction</span>
            <strong>🧭 ${fortune.lucky.direction}</strong>
          </div>
          ` : ''}
          ${fortune.lucky.time ? `
          <div class="km-lucky-item">
            <span>Lucky Time</span>
            <strong>⏰ ${fortune.lucky.time}</strong>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <div style="margin-top:30px; display:flex; gap:10px;">
          <button class="km-btn km-btn-secondary" style="flex:1;" onclick="window.KMudangAI.openFortune()">
            ← Another Reading
          </button>
          <button class="km-btn km-btn-free" style="flex:1;" onclick="window.KMudangAI.close()">
            Done ✓
          </button>
        </div>
        
        <div class="km-footer">
          <p>Model: ${data.model || 'unknown'} · ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
  }

  function renderMatchResult(data) {
    const analysis = data.analysis || {};
    const match = data.match || {};
    const body = document.getElementById('km-body');
    
    body.innerHTML = `
      <div class="km-content">
        <div class="km-match-score">
          <div class="score-number">${match.score || 0}</div>
          <div class="score-label">${match.grade || 'Compatibility Score'}</div>
        </div>
        
        ${analysis.chemistry ? `
        <div class="km-headline km-headline-match">
          💕 ${analysis.chemistry}
        </div>
        ` : ''}
        
        <div class="km-chemistry">
          ${analysis.strengths ? `
          <div class="km-chemistry-item good">
            <h4>✨ Strengths</h4>
            <p>${analysis.strengths}</p>
          </div>
          ` : ''}
          ${analysis.cautions ? `
          <div class="km-chemistry-item caution">
            <h4>⚠️ Cautions</h4>
            <p>${analysis.cautions}</p>
          </div>
          ` : ''}
        </div>
        
        ${analysis.advice ? `
        <div class="km-advice" style="border-left-color:#FF69B4;">
          <strong style="color:#FF69B4;">💡 Relationship Advice</strong>
          <p>${analysis.advice}</p>
        </div>
        ` : ''}
        
        <div style="margin-top:30px; display:flex; gap:10px;">
          <button class="km-btn km-btn-secondary" style="flex:1;" onclick="window.KMudangAI.openMatch()">
            ← Analyze Again
          </button>
          <button class="km-btn km-btn-match" style="flex:1;" onclick="window.KMudangAI.close()">
            Done ✓
          </button>
        </div>
        
        <div class="km-footer">
          <p>Model: ${data.model || 'unknown'} · ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
  }

  function renderError(message) {
    const body = document.getElementById('km-body');
    body.innerHTML = `
      <div class="km-error">
        <div class="km-error-icon">😢</div>
        <div class="km-error-title">Something went wrong</div>
        <div class="km-error-msg">${message}</div>
        <button class="km-btn km-btn-free" onclick="window.KMudangAI.retry()">
          🔄 Try Again
        </button>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════════════════
  async function callFortuneAPI(tier) {
    const year = window.BIRTH_YEAR;
    const month = window.BIRTH_MONTH;
    const day = window.BIRTH_DAY;
    const hour = window.BIRTH_HOUR;
    
    if (!year || !month || !day) {
      throw new Error('Please analyze your birth chart first!');
    }
    
    const payload = {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: hour ? parseInt(hour) : 12,
      tier: tier
    };
    
    console.log('[K-MUDANG AI] Fortune API call:', payload);
    
    const response = await fetch(`${CONFIG.API_BASE}${CONFIG.ENDPOINTS.fortune}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }

  async function callMatchAPI(tier) {
    // 내 정보
    const myYear = window.BIRTH_YEAR;
    const myMonth = window.BIRTH_MONTH;
    const myDay = window.BIRTH_DAY;
    
    if (!myYear || !myMonth || !myDay) {
      throw new Error('Please analyze your birth chart first!');
    }
    
    // 상대방 정보
    const pSaju = window.PARTNER_SAJU;
    if (!pSaju) {
      throw new Error('Please analyze compatibility first!');
    }
    
    // 상대방 생년월일 추출 (DOM에서)
    const pYear = parseInt(document.getElementById('match-year')?.value);
    const pMonth = parseInt(document.getElementById('match-month')?.value);
    const pDay = parseInt(document.getElementById('match-day')?.value);
    const mode = document.getElementById('match-mode')?.value || 'romance';
    
    if (!pYear || !pMonth || !pDay) {
      throw new Error('Partner birth info not found');
    }
    
    const payload = {
      my: {
        year: parseInt(myYear),
        month: parseInt(myMonth),
        day: parseInt(myDay)
      },
      partner: {
        year: pYear,
        month: pMonth,
        day: pDay
      },
      mode: mode,
      tier: tier
    };
    
    console.log('[K-MUDANG AI] Match API call:', payload);
    
    const response = await fetch(`${CONFIG.API_BASE}${CONFIG.ENDPOINTS.match}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  window.KMudangAI = {
    version: CONFIG.VERSION,
    
    // Open fortune modal
    openFortune: function() {
      if (!window.SAJU || !window.BIRTH_YEAR) {
        if (typeof toast === 'function') toast('Please analyze your birth chart first! 🔮');
        else alert('Please analyze your birth chart first!');
        return;
      }
      document.getElementById('km-modal').classList.add('show');
      renderTierSelection('fortune');
    },
    
    // Open match modal
    openMatch: function() {
      if (!window.SAJU || !window.PARTNER_SAJU) {
        if (typeof toast === 'function') toast('Please analyze compatibility first! 💕');
        else alert('Please analyze compatibility first!');
        return;
      }
      document.getElementById('km-modal').classList.add('show');
      renderTierSelection('match');
    },
    
    // Close modal
    close: function() {
      document.getElementById('km-modal').classList.remove('show');
    },
    
    // Execute API call
    execute: async function(tier) {
      renderLoading(tier);
      
      try {
        let result;
        if (currentMode === 'fortune') {
          result = await callFortuneAPI(tier);
          if (result.success) renderFortuneResult(result);
          else renderError(result.error || 'Unknown error');
        } else {
          result = await callMatchAPI(tier);
          if (result.success) renderMatchResult(result);
          else renderError(result.error || 'Unknown error');
        }
      } catch (err) {
        console.error('[K-MUDANG AI] Error:', err);
        renderError(err.message);
      }
    },
    
    // Retry
    retry: function() {
      renderTierSelection(currentMode);
    },
    
    // Test API connection
    test: async function() {
      try {
        const res = await fetch(`${CONFIG.API_BASE}${CONFIG.ENDPOINTS.test}`);
        const data = await res.json();
        console.log('[K-MUDANG AI] API Test:', data);
        return data;
      } catch (err) {
        console.error('[K-MUDANG AI] API Test Failed:', err);
        return { error: err.message };
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  function init() {
    console.log(`[K-MUDANG AI] 🚀 Initializing AI Module v${CONFIG.VERSION}...`);
    
    injectStyles();
    createModal();
    
    // DOM 변경 감지하여 버튼 주입
    const observer = new MutationObserver(() => {
      // Fortune 결과 체크
      const sajuResult = document.getElementById('saju-result');
      if (sajuResult && sajuResult.style.display !== 'none') {
        injectFortuneButton();
      }
      
      // Match 결과 체크
      const matchResult = document.getElementById('match-result');
      if (matchResult && matchResult.style.display !== 'none') {
        injectMatchButton();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    
    // 초기 체크
    setTimeout(() => {
      const sajuResult = document.getElementById('saju-result');
      if (sajuResult && sajuResult.style.display !== 'none') injectFortuneButton();
      
      const matchResult = document.getElementById('match-result');
      if (matchResult && matchResult.style.display !== 'none') injectMatchButton();
    }, 1000);
    
    console.log('[K-MUDANG AI] ✅ Ready. API:', CONFIG.API_BASE);
    console.log('[K-MUDANG AI] 💡 Commands: KMudangAI.test(), KMudangAI.openFortune(), KMudangAI.openMatch()');
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
