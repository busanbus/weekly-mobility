/**
 * 검색 결과 페이지용 네비게이션 (다국어 기능 제외)
 */
class SearchNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
    
    // DOM 요소 참조
    this.searchForm = this.shadowRoot.querySelector('.search-form');
    this.searchInput = this.shadowRoot.querySelector('.search-input');
    this.searchBtn = this.shadowRoot.querySelector('.search-btn');
    this.burgerBtn = this.shadowRoot.querySelector('.burger-btn');
    this.mobileMenu = this.shadowRoot.querySelector('.mobile-menu');
    this.mobileMenuOverlay = this.shadowRoot.querySelector('.mobile-menu-overlay');
    this.closeBtn = this.shadowRoot.querySelector('.close-btn');

    // 이벤트 리스너 설정
    this.setupEventListeners();
    this.setupSearchForm();
  }

  render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          position: sticky;
          top: 0;
          z-index: 1000;
        }
        nav {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-light, #e8eaed);
          position: relative;
        }
        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          min-height: 60px;
        }
        .nav-logo {
          margin-right: 70px;
        }
        .nav-logo img {
          height: 40px;
          width: auto;
          display: block;
        }
        .nav-left {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 24px;
        }
        .nav-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .nav-link {
          padding: 8px 16px;
          text-decoration: none;
          color: var(--text-primary, #2c3e50);
          border-radius: 8px;
          transition: all 0.2s ease;
          font-size: 1.22rem;
          font-weight: 600;
          font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', sans-serif;
          letter-spacing: -0.02em;
        }
        .nav-link:hover {
          background: var(--secondary-blue, #E6F1FF);
        }
        .search-form {
          display: flex;
          align-items: center;
          gap: 0;
          position: relative;
          background: white;
          border: 2px solid var(--primary-blue, #0066FF);
          border-radius: 6px;
          overflow: hidden;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 102, 255, 0.12);
          height: 36px;
        }
        
        .search-form:hover {
          border-color: var(--primary-blue, #0066FF);
        }
        
        .search-form:focus-within {
          border-color: var(--primary-blue, #0066FF);
          box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.25), 0 3px 8px rgba(0, 102, 255, 0.15);
        }
        
        .search-input {
          padding: 8px 14px;
          border: none;
          background: transparent;
          color: var(--text-primary, #2c3e50);
          font-size: 15px;
          font-weight: 400;
          width: 180px;
          height: 100%;
          outline: none;
          line-height: 1.4;
        }
        
        .search-input::placeholder {
          color: var(--text-tertiary, #8f95a1);
          font-size: 15px;
        }
        
        .search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 100%;
          border: none;
          background: var(--primary-blue, #0066FF);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .search-btn:hover {
          background: var(--primary-blue-dark, #0052cc);
        }
        
        .search-btn:active {
          background: var(--primary-blue-darker, #003d99);
          transform: scale(0.98);
        }
        
        .search-btn-icon {
          width: 18px;
          height: 18px;
          stroke: white;
          stroke-width: 2.5;
        }
        
        .burger-btn {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 40px;
          height: 40px;
          background: transparent;
          border: none;
          cursor: pointer;
          position: relative;
        }
        
        .burger-btn .line {
          width: 20px;
          height: 2px;
          background: var(--text-primary, #2c3e50);
          border-radius: 1px;
          transition: all 0.3s ease;
          position: absolute;
        }
        
        .burger-btn .line1 { top: 12px; }
        .burger-btn .line2 { top: 19px; }
        .burger-btn .line3 { top: 26px; }
        
        .burger-btn.open .line1 {
          top: 50%;
          transform: translateY(-50%) rotate(45deg);
        }
        .burger-btn.open .line2 {
          opacity: 0;
        }
        .burger-btn.open .line3 {
          bottom: 50%;
          transform: translateY(50%) rotate(-45deg);
        }

        .mobile-menu,
        .mobile-menu-overlay {
          display: none;
        }
        
        @media (max-width: 700px) {
          .search-form {
            display: none !important;
          }
          .nav-inner {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            min-height: 56px;
            position: relative;
          }
          .nav-left {
            display: flex !important;
            align-items: center;
          }
          .nav-left .nav-link {
            display: none !important;
          }
          .nav-logo {
            margin-right: 0;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
          }
          .nav-logo img {
            height: 36px;
            width: auto;
            display: block;
          }
          .nav-right {
            display: none !important;
          }
          .burger-btn {
            display: flex;
          }
          .mobile-menu {
            position: fixed;
            top: 0;
            left: -100%;
            width: 280px;
            height: 100vh;
            background: white;
            transition: left 0.3s ease;
            z-index: 1001;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          }
          .mobile-menu.open {
            left: 0;
          }
          .mobile-menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 1000;
          }
          .mobile-menu-overlay.open {
            opacity: 1;
            visibility: visible;
          }
          .mobile-menu-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-light, #e8eaed);
          }
          .mobile-menu-logo img {
            height: 32px;
          }
          .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: var(--text-secondary, #5A6573);
            cursor: pointer;
            padding: 4px;
            line-height: 1;
          }
          .mobile-menu-content {
            padding: 20px;
          }
          .mobile-nav-link {
            display: block;
            padding: 12px 0;
            text-decoration: none;
            color: var(--text-primary, #2c3e50);
            font-size: 1.1rem;
            font-weight: 500;
            border-bottom: 1px solid var(--border-light, #e8eaed);
          }
          .mobile-nav-link:hover {
            color: var(--primary-blue, #0066FF);
          }
        }
      </style>
      
      <nav>
        <div class="nav-inner">
          <div class="nav-left">
            <a href="/weekly-mobility/" class="nav-logo">
              <img src="/weekly-mobility/images/logo.svg" alt="모빌리티 주간동향 로고" />
            </a>
            <a class="nav-link nav-home" href="https://busanbus.github.io/weekly-mobility/">홈</a>
            <a class="nav-link nav-about" href="/weekly-mobility/about.html">소개</a>
            <a class="nav-link nav-archive" href="/weekly-mobility/archive/">아카이브</a>
          </div>
          <div class="nav-right">
            <form class="search-form" role="search">
              <input 
                type="text" 
                class="search-input" 
                placeholder="동향 검색..." 
                aria-label="검색어 입력"
                autocomplete="off"
                spellcheck="false">
              <button type="submit" class="search-btn" aria-label="검색 실행" title="검색하기">
                <svg class="search-btn-icon" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </button>
            </form>
          </div>
          <button class="burger-btn" aria-label="메뉴 열기">
            <span class="line line1"></span>
            <span class="line line2"></span>
            <span class="line line3"></span>
          </button>
        </div>
        
        <!-- 모바일 메뉴 -->
        <div class="mobile-menu-overlay"></div>
        <div class="mobile-menu">
          <div class="mobile-menu-header">
            <div class="mobile-menu-logo">
              <img src="/weekly-mobility/images/logo.svg" alt="모빌리티 주간동향 로고" />
            </div>
            <button class="close-btn" aria-label="메뉴 닫기">×</button>
          </div>
          <div class="mobile-menu-content">
            <a href="https://busanbus.github.io/weekly-mobility/" class="mobile-nav-link">홈</a>
            <a href="/weekly-mobility/about.html" class="mobile-nav-link">소개</a>
            <a href="/weekly-mobility/archive/" class="mobile-nav-link">아카이브</a>
          </div>
        </div>
      </nav>
    `;
  }

  setupEventListeners() {
    // 햄버거 메뉴 동작
    if (this.burgerBtn && this.mobileMenu && this.mobileMenuOverlay) {
      this.burgerBtn.addEventListener('click', () => {
        const isOpen = this.mobileMenu.classList.contains('open');
        this.burgerBtn.classList.toggle('open', !isOpen);
        if (isOpen) {
          this.mobileMenu.classList.remove('open');
          this.mobileMenuOverlay.classList.remove('open');
        } else {
          this.mobileMenu.classList.add('open');
          this.mobileMenuOverlay.classList.add('open');
        }
      });
      this.mobileMenuOverlay.addEventListener('click', () => {
        this.mobileMenu.classList.remove('open');
        this.mobileMenuOverlay.classList.remove('open');
        this.burgerBtn.classList.remove('open');
      });
    }

    if (this.closeBtn && this.mobileMenu && this.mobileMenuOverlay) {
      this.closeBtn.addEventListener('click', () => {
        this.mobileMenu.classList.remove('open');
        this.mobileMenuOverlay.classList.remove('open');
        this.burgerBtn.classList.remove('open');
      });
    }
  }

  setupSearchForm() {
    if (!this.searchForm || !this.searchInput || !this.searchBtn) return;

    // 폼 제출 이벤트 (검색 버튼 클릭 또는 Enter 키)
    this.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.performSearch();
    });

    // Enter 키 이벤트
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch();
      }
    });
  }

  performSearch() {
    const query = this.searchInput.value.trim();
    
    if (!query) {
      alert('검색어를 입력해주세요.');
      return;
    }

    if (query.length < 2) {
      alert('검색어는 2글자 이상 입력해주세요.');
      return;
    }

    // 검색 결과 페이지로 이동
    const searchUrl = `/weekly-mobility/search-results.html?q=${encodeURIComponent(query)}`;
    window.location.href = searchUrl;
  }
}

customElements.define('search-nav', SearchNav);