/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  K-MUDANG AI Module v1.0.0                                                ║
 * ║  Progressive Enhancement - Zero Modification to Existing Code             ║
 * ║                                                                           ║
 * ║  Patent: 10-2026-0010452                                                  ║
 * ║  API: https://k-mudang.vercel.app                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
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
    ENDPOINTS: {
      fortune: '/api/fortune',
      match: '/api/match',
      test: '/api/test'
    },
    TIERS: {
      free: { model: 'claude-3-haiku', price: 0, label: '무료 AI 운세' },
      premium: { model: 'claude-sonnet-4', price: 5000, label: '프리미엄 AI 운세' }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLES (동적 주입)
  // ═══════════════════════════════════════════════════════════════════════════
  const STYLES = `
    /* AI Module Modal */
    .kmudang-ai-modal {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 99999;
      overflow-y: auto;
      padding: 20px;
      animation: kmFadeIn 0.3s ease;
    }
    @keyframes kmFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .kmudang-ai-modal.show { display: flex; justify-content: center; align-items: flex-start; }
    
    .kmudang-ai-container {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid rgba(212,175,55,0.5);
      border-radius: 20px;
      max-width: 600px;
      width: 100%;
      margin: 20px auto;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.2);
      position: relative;
    }
    
    .kmudang-ai-close {
      position: absolute;
      top: 15px; right: 20px;
      background: none;
      border: none;
      color: #888;
      font-size: 28px;
      cursor: pointer;
      transition: color 0.2s;
    }
    .kmudang-ai-close:hover { color: #D4AF37; }
    
    .kmudang-ai-header {
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(212,175,55,0.3);
    }
    .kmudang-ai-header h2 {
      font-family: 'Cinzel Decorative', serif;
      color: #D4AF37;
      font-size: 1.8rem;
      margin: 0 0 10px 0;
    }
    .kmudang-ai-header p {
      color: #888;
      font-size: 0.9rem;
      margin: 0;
    }
    
    /* AI Response Content */
    .kmudang-ai-content {
      color: #ddd;
      line-height: 1.8;
    }
    .kmudang-ai-headline {
      font-size: 1.4rem;
      color: #FFD700;
      text-align: center;
      margin-bottom: 20px;
      padding: 15px;
      background: rgba(212,175,55,0.1);
      border-radius: 10px;
    }
    .kmudang-ai-body {
      font-size: 1rem;
      color: #ccc;
      text-align: justify;
      margin-bottom: 20px;
    }
    .kmudang-ai-advice {
      background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1));
      border-left: 4px solid #D4AF37;
      padding: 15px 20px;
      border-radius: 0 10px 10px 0;
      margin-bottom: 20px;
    }
    .kmudang-ai-advice strong {
      color: #D4AF37;
      display: block;
      margin-bottom: 8px;
    }
    .kmudang-ai-lucky {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 20px;
    }
    .kmudang-ai-lucky-item {
      background: rgba(0,0,0,0.3);
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .kmudang-ai-lucky-item span {
      display: block;
      color: #888;
      font-size: 0.75rem;
      margin-bottom: 5px;
    }
    .kmudang-ai-lucky-item strong {
      color: #FFD700;
      font-size: 1rem;
    }
    
    /* Loading State */
    .kmudang-ai-loading {
      text-align: center;
      padding: 60px 20px;
    }
    .kmudang-ai-spinner {
      width: 50px; height: 50px;
      border: 3px solid rgba(212,175,55,0.2);
      border-top-color: #D4AF37;
      border-radius: 50%;
      animation: kmSpin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes kmSpin {
      to { transform: rotate(360deg); }
    }
    .kmudang-ai-loading p {
      color: #888;
      font-size: 0.9rem;
    }
    
    /* Error State */
    .kmudang-ai-error {
      text-align: center;
      padding: 40px 20px;
      color: #ff6b6b;
    }
    
    /* Buttons */
    .kmudang-ai-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 28px;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
      margin-bottom: 10px;
    }
    .kmudang-ai-btn-free {
      background: linear-gradient(135deg, #2d3748, #1a202c);
      color: #D4AF37;
      border: 1px solid rgba(212,175,55,0.5);
    }
    .kmudang-ai-btn-free:hover {
      background: linear-gradient(135deg, #3d4758, #2a303c);
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    }
    .kmudang-ai-btn-premium {
      background: linear-gradient(135deg, #D4AF37, #B8860B);
      color: #1a1a2e;
    }
    .kmudang-ai-btn-premium:hover {
      background: linear-gradient(135deg, #FFD700, #D4AF37);
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(212,175,55,0.4);
    }
    .kmudang-ai-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }
    
    /* Injected Button in Existing UI */
    .kmudang-ai-inject-btn {
      margin-top: 20px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .kmudang-ai-inject-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
    }
    .kmudang-ai-inject-btn:active {
      transform: translateY(-1px);
    }
    
    /* Tier Badge */
    .kmudang-tier-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
      margin-left: 8px;
    }
    .kmudang-tier-free { background: #4a5568; color: #a0aec0; }
    .kmudang-tier-premium { background: #D4AF37; color: #1a1a2e; }
  `;

  // ═══════════════════════════════════════════════════════════════════════════
  // INJECT STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'kmudang-ai-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  function createModal() {
    const modal = document.createElement('div');
    modal.id = 'kmudang-ai-modal';
    modal.className = 'kmudang-ai-modal';
    modal.innerHTML = `
      <div class="kmudang-ai-container">
        <button class="kmudang-ai-close" onclick="window.KMudangAI.closeModal()">&times;</button>
        <div class="kmudang-ai-header">
          <h2>🔮 AI Fortune Reading</h2>
          <p>Powered by Claude AI · Patent 10-2026-0010452</p>
        </div>
        <div id="kmudang-ai-body">
          <!-- Dynamic content -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.KMudangAI.closeModal();
    });
    
    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.KMudangAI.closeModal();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INJECT AI BUTTON INTO EXISTING UI
  // ═══════════════════════════════════════════════════════════════════════════
  function injectAIButton() {
    // 기존 AI 해석 카드 (#card-ai) 찾기
    const aiCard = document.getElementById('card-ai');
    if (!aiCard) {
      console.warn('[K-MUDANG AI] #card-ai not found, retrying...');
      setTimeout(injectAIButton, 1000);
      return;
    }
    
    // 이미 주입됐으면 스킵
    if (document.getElementById('kmudang-ai-inject-wrapper')) return;
    
    // 버튼 컨테이너 생성
    const wrapper = document.createElement('div');
    wrapper.id = 'kmudang-ai-inject-wrapper';
    wrapper.style.cssText = 'margin-top: 25px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(212,175,55,0.2);';
    wrapper.innerHTML = `
      <p style="text-align:center; color:#888; font-size:0.9rem; margin-bottom:15px;">
        ✨ Get personalized AI interpretation based on your chart
      </p>
      <button class="kmudang-ai-inject-btn" onclick="window.KMudangAI.openModal()">
        🤖 Get AI Fortune Reading
      </button>
      <p style="text-align:center; color:#666; font-size:0.75rem; margin-top:10px;">
        Free tier available · Premium for deeper insights
      </p>
    `;
    
    aiCard.appendChild(wrapper);
    console.log('[K-MUDANG AI] ✅ AI button injected successfully');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL CONTENT GENERATORS
  // ═══════════════════════════════════════════════════════════════════════════
  function renderTierSelection() {
    const body = document.getElementById('kmudang-ai-body');
    body.innerHTML = `
      <div style="padding: 20px 0;">
        <button class="kmudang-ai-btn kmudang-ai-btn-free" onclick="window.KMudangAI.getFortune('free')">
          🆓 무료 AI 운세 <span class="kmudang-tier-badge kmudang-tier-free">Haiku</span>
        </button>
        <button class="kmudang-ai-btn kmudang-ai-btn-premium" onclick="window.KMudangAI.getFortune('premium')">
          ⭐ 프리미엄 AI 운세 <span class="kmudang-tier-badge kmudang-tier-premium">Sonnet</span>
        </button>
        <div style="margin-top:20px; padding:15px; background:rgba(0,0,0,0.2); border-radius:8px;">
          <p style="color:#888; font-size:0.85rem; margin:0;">
            <strong style="color:#D4AF37;">무료:</strong> 기본 운세 해석 (Haiku 모델)<br>
            <strong style="color:#FFD700;">프리미엄:</strong> 심층 분석 + 구체적 조언 (Sonnet 모델)
          </p>
        </div>
      </div>
    `;
  }

  function renderLoading(tier) {
    const body = document.getElementById('kmudang-ai-body');
    body.innerHTML = `
      <div class="kmudang-ai-loading">
        <div class="kmudang-ai-spinner"></div>
        <p>🔮 AI가 당신의 사주를 분석 중입니다...</p>
        <p style="color:#666; font-size:0.8rem; margin-top:10px;">
          Using ${tier === 'premium' ? 'Claude Sonnet 4' : 'Claude Haiku'} Model
        </p>
      </div>
    `;
  }

  function renderResult(data) {
    const body = document.getElementById('kmudang-ai-body');
    const fortune = data.fortune || {};
    
    body.innerHTML = `
      <div class="kmudang-ai-content">
        <div class="kmudang-ai-headline">
          ${fortune.headline || '🔮 Your AI Fortune Reading'}
        </div>
        
        <div class="kmudang-ai-body">
          ${fortune.body || 'Unable to generate fortune. Please try again.'}
        </div>
        
        ${fortune.advice ? `
        <div class="kmudang-ai-advice">
          <strong>💡 Today's Advice</strong>
          ${fortune.advice}
        </div>
        ` : ''}
        
        ${fortune.lucky ? `
        <div class="kmudang-ai-lucky">
          ${fortune.lucky.color ? `
          <div class="kmudang-ai-lucky-item">
            <span>Lucky Color</span>
            <strong>🎨 ${fortune.lucky.color}</strong>
          </div>
          ` : ''}
          ${fortune.lucky.direction ? `
          <div class="kmudang-ai-lucky-item">
            <span>Lucky Direction</span>
            <strong>🧭 ${fortune.lucky.direction}</strong>
          </div>
          ` : ''}
          ${fortune.lucky.time ? `
          <div class="kmudang-ai-lucky-item">
            <span>Lucky Time</span>
            <strong>⏰ ${fortune.lucky.time}</strong>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <div style="margin-top:25px; text-align:center;">
          <button class="kmudang-ai-btn kmudang-ai-btn-free" onclick="window.KMudangAI.renderTierSelection()">
            ← Get Another Reading
          </button>
        </div>
        
        <p style="text-align:center; color:#666; font-size:0.7rem; margin-top:15px;">
          Model: ${data.model || 'unknown'} · Generated: ${new Date().toLocaleString()}
        </p>
      </div>
    `;
  }

  function renderError(message) {
    const body = document.getElementById('kmudang-ai-body');
    body.innerHTML = `
      <div class="kmudang-ai-error">
        <p style="font-size:3rem; margin-bottom:15px;">😢</p>
        <p style="font-size:1.1rem; margin-bottom:10px;">Something went wrong</p>
        <p style="color:#888; font-size:0.9rem; margin-bottom:20px;">${message}</p>
        <button class="kmudang-ai-btn kmudang-ai-btn-free" onclick="window.KMudangAI.renderTierSelection()">
          Try Again
        </button>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════════════════
  async function callFortuneAPI(tier) {
    // 전역 변수에서 데이터 가져오기
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
    
    console.log('[K-MUDANG AI] Calling API:', payload);
    
    const response = await fetch(`${CONFIG.API_BASE}${CONFIG.ENDPOINTS.fortune}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  window.KMudangAI = {
    // Open modal with tier selection
    openModal: function() {
      // 사주 분석이 완료됐는지 확인
      if (!window.SAJU || !window.BIRTH_YEAR) {
        if (typeof toast === 'function') {
          toast('Please analyze your birth chart first! 🔮');
        } else {
          alert('Please analyze your birth chart first!');
        }
        return;
      }
      
      const modal = document.getElementById('kmudang-ai-modal');
      if (modal) {
        modal.classList.add('show');
        renderTierSelection();
      }
    },
    
    // Close modal
    closeModal: function() {
      const modal = document.getElementById('kmudang-ai-modal');
      if (modal) modal.classList.remove('show');
    },
    
    // Get fortune (called from tier selection)
    getFortune: async function(tier) {
      renderLoading(tier);
      
      try {
        const result = await callFortuneAPI(tier);
        
        if (result.success) {
          renderResult(result);
        } else {
          renderError(result.error || 'Unknown error occurred');
        }
      } catch (err) {
        console.error('[K-MUDANG AI] Error:', err);
        renderError(err.message);
      }
    },
    
    // Re-render tier selection
    renderTierSelection: renderTierSelection,
    
    // Test API connection
    testAPI: async function() {
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
    console.log('[K-MUDANG AI] 🚀 Initializing AI Module v1.0.0...');
    
    injectStyles();
    createModal();
    
    // 결과 페이지가 표시될 때 버튼 주입
    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver((mutations) => {
      const resultDiv = document.getElementById('saju-result');
      if (resultDiv && resultDiv.style.display !== 'none') {
        injectAIButton();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    
    // 초기 체크 (이미 결과가 표시된 경우)
    setTimeout(() => {
      const resultDiv = document.getElementById('saju-result');
      if (resultDiv && resultDiv.style.display !== 'none') {
        injectAIButton();
      }
    }, 1000);
    
    console.log('[K-MUDANG AI] ✅ Module ready. Call KMudangAI.testAPI() to verify connection.');
  }

  // DOM Ready 시 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
