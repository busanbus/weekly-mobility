class MainNavNoLang extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          font-family: 'Noto Sans KR', 'Inter', sans-serif;
        }
        .nav-bg {
          width: 100%;
          background: var(--bg-card, #fff);
          border-bottom: 1px solid var(--border-light, #e8eaed);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
        }
        .nav-inner {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          min-height: 70px;
          padding: 0 32px;
        }
        .nav-left {
          display: flex;
          align-items: center;
          gap: 18px;
          justify-content: flex-start;
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: flex-end;
          margin-left: auto;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          margin-right: 70px;
        }
        .nav-logo img {
          height: 48px;
          width: auto;
          display: block;
        }
        .nav-link {
          color: var(--text-primary, #1A1D29);
          text-decoration: none;
          font-weight: 600;
          font-size: 1.22rem;
          font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', sans-serif;
          padding: 12px 16px;
          border-radius: 8px;
          transition: background 0.2s;
          letter-spacing: -0.02em;
        }
        .nav-link:hover {
          background: var(--secondary-blue, #E6F1FF);
        }
        .nav-link.nav-about,
        .nav-link.nav-archive {
          display: none !important;
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
          gap: 3px;
          background: none;
          border: none;
          cursor: pointer;
          width: 32px;
          height: 32px;
        }
        
        .burger-btn span {
          width: 20px;
          height: 2px;
          background: var(--text-primary, #1A1D29);
          border-radius: 1px;
          transition: all 0.3s ease;
        }
        
        .burger-btn.open span:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }
        .burger-btn.open span:nth-child(2) {
          opacity: 0;
        }
        .burger-btn.open span:nth-child(3) {
          transform: rotate(-45deg) translate(7px, -6px);
        }
        
        .mobile-menu {
          position: fixed;
          top: 0;
          left: -100%;
          width: 280px;
          height: 100vh;
          background: #fff;
          z-index: 1200;
          transition: left 0.3s ease;
          box-shadow: 2px 0 20px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
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
          background: rgba(0,0,0,0.5);
          z-index: 1100;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s, visibility 0.3s;
        }
        
        .mobile-menu-overlay.open {
          opacity: 1;
          visibility: visible;
        }
        
        .mobile-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 20px;
          border-bottom: 1px solid var(--border-light, #e8eaed);
        }
        
        .mobile-menu-header img {
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
          flex: 1;
        }
        
        .mobile-nav-link {
          display: block;
          padding: 16px 0;
          color: var(--text-primary, #1A1D29);
          text-decoration: none;
          font-size: 1.1rem;
          font-weight: 500;
          border-bottom: 1px solid var(--border-light, #e8eaed);
        }
        
        .mobile-nav-link:hover {
          color: var(--primary-blue, #0066FF);
        }
        .mobile-nav-link.nav-about,
        .mobile-nav-link.nav-archive {
          display: none !important;
        }
        
        @media (max-width: 700px) {
          .search-form {
            display: none !important;
          }
          .nav-inner {
            max-width: none;
            width: 100%;
            margin: 0;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            padding: 0 16px;
            min-height: 56px;
            position: relative;
            box-sizing: border-box;
          }
          .nav-left {
            display: none;
          }
          .nav-logo {
            margin-right: 0;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
          }
          .nav-logo img {
            height: 36px;
            width: auto;
            display: block;
          }
          .nav-right {
            display: none;
          }
          .burger-btn {
            display: flex !important;
            position: relative;
            width: 24px;
            height: 18px;
            background: none;
            border: none;
            cursor: pointer;
            flex-shrink: 0;
          }
          .mobile-right-actions {
            display: flex !important;
            align-items: center;
            gap: 12px;
            margin-left: auto;
          }
          .mobile-search-wrapper {
            display: flex !important;
            position: relative;
            flex-shrink: 0;
          }
          .mobile-search-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: none;
            border: none;
            cursor: pointer;
            border-radius: 50%;
            transition: background 0.2s;
          }
          .mobile-search-btn:hover {
            background: rgba(0, 0, 0, 0.05);
          }
          .mobile-search-btn svg {
            width: 24px;
            height: 24px;
            stroke: #1A1D29;
            stroke-width: 2;
          }
          .mobile-search-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            display: none;
            align-items: flex-start;
            justify-content: center;
            padding-top: 80px;
          }
          .mobile-search-overlay.open {
            display: flex;
          }
          .mobile-search-container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin: 0 20px;
            width: calc(100% - 40px);
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          .mobile-search-form {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
          }
          .mobile-search-input {
            flex: 1;
            border: none;
            background: none;
            outline: none;
            font-size: 16px;
            color: #1A1D29;
          }
          .mobile-search-input::placeholder {
            color: #8f95a1;
          }
          .mobile-search-submit {
            background: var(--primary-blue, #0066FF);
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }
          .mobile-search-cancel {
            background: #f0f0f0;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            color: #666;
            font-size: 14px;
            cursor: pointer;
          }
          .mobile-search-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
          }
        }
        
        /* PC에서는 모바일 검색 기능 완전 숨김 */
        @media (min-width: 701px) {
          .mobile-search-wrapper {
            display: none !important;
          }
          .mobile-search-overlay {
            display: none !important;
          }
          .mobile-search-container {
            display: none !important;
          }
        }
      </style>
      <nav class="nav-bg">
        <div class="nav-inner">
          <a class="nav-logo" href="https://busanbus.github.io/weekly-mobility">
            <img src="https://i.ibb.co/svMm1DPr/logo.png" alt="로고" />
          </a>
          <div class="nav-left">
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
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div class="mobile-right-actions">
            <div class="mobile-search-wrapper">
              <button class="mobile-search-btn" aria-label="검색" tabindex="0">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <!-- 모바일 검색 오버레이 -->
        <div class="mobile-search-overlay">
          <div class="mobile-search-container">
            <div class="mobile-search-form">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <circle cx="11" cy="11" r="8" stroke="#8f95a1" stroke-width="2"></circle>
                <path d="m21 21-4.35-4.35" stroke="#8f95a1" stroke-width="2"></path>
              </svg>
              <input 
                type="text" 
                class="mobile-search-input" 
                placeholder="검색어를 입력하세요..." 
                autocomplete="off">
            </div>
            <div class="mobile-search-actions">
              <button class="mobile-search-cancel">취소</button>
              <button class="mobile-search-submit">검색</button>
            </div>
          </div>
        </div>
        
        <!-- 모바일 메뉴 오버레이 -->
        <div class="mobile-menu-overlay"></div>
        
        <!-- 모바일 메뉴 -->
        <div class="mobile-menu">
          <div class="mobile-menu-header">
            <img src="https://i.ibb.co/svMm1DPr/logo.png" alt="로고" />
            <button class="close-btn" aria-label="메뉴 닫기">×</button>
          </div>
          <div class="mobile-menu-content">
            <a href="https://busanbus.github.io/weekly-mobility/" class="mobile-nav-link">홈</a>
            <a href="/weekly-mobility/about.html" class="mobile-nav-link nav-about">소개</a>
            <a href="/weekly-mobility/archive/" class="mobile-nav-link nav-archive">아카이브</a>
          </div>
        </div>
      </nav>
    `;

    // DOM 요소 참조
    this.searchForm = shadow.querySelector('.search-form');
    this.searchInput = shadow.querySelector('.search-input');
    this.searchBtn = shadow.querySelector('.search-btn');
    this.burgerBtn = shadow.querySelector('.burger-btn');
    this.mobileMenu = shadow.querySelector('.mobile-menu');
    this.mobileMenuOverlay = shadow.querySelector('.mobile-menu-overlay');
    this.closeBtn = shadow.querySelector('.close-btn');

    // 모바일 검색 요소들
    this.mobileSearchBtn = shadow.querySelector('.mobile-search-btn');
    this.mobileSearchOverlay = shadow.querySelector('.mobile-search-overlay');
    this.mobileSearchInput = shadow.querySelector('.mobile-search-input');
    this.mobileSearchSubmit = shadow.querySelector('.mobile-search-submit');
    this.mobileSearchCancel = shadow.querySelector('.mobile-search-cancel');

    // 이벤트 리스너 설정
    this.setupEventListeners();
    this.setupSearchForm();
  }

  setupEventListeners() {
    // 햄버거 메뉴 토글
    if (this.burgerBtn) {
      this.burgerBtn.addEventListener('click', () => {
        this.toggleMobileMenu();
      });
    }

    // 모바일 메뉴 닫기
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    }

    // 오버레이 클릭으로 메뉴 닫기
    if (this.mobileMenuOverlay) {
      this.mobileMenuOverlay.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    }

    // 모바일 검색 이벤트
    if (this.mobileSearchBtn) {
      this.mobileSearchBtn.addEventListener('click', () => {
        this.openMobileSearch();
      });
    }

    if (this.mobileSearchCancel) {
      this.mobileSearchCancel.addEventListener('click', () => {
        this.closeMobileSearch();
      });
    }

    if (this.mobileSearchSubmit) {
      this.mobileSearchSubmit.addEventListener('click', () => {
        this.performMobileSearch();
      });
    }

    if (this.mobileSearchInput) {
      this.mobileSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performMobileSearch();
        }
      });
    }

    if (this.mobileSearchOverlay) {
      this.mobileSearchOverlay.addEventListener('click', (e) => {
        if (e.target === this.mobileSearchOverlay) {
          this.closeMobileSearch();
        }
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

  toggleMobileMenu() {
    const isOpen = this.mobileMenu.classList.contains('open');
    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  openMobileMenu() {
    this.mobileMenu.classList.add('open');
    this.mobileMenuOverlay.classList.add('open');
    this.burgerBtn.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  closeMobileMenu() {
    this.mobileMenu.classList.remove('open');
    this.mobileMenuOverlay.classList.remove('open');
    this.burgerBtn.classList.remove('open');
    document.body.style.overflow = '';
  }

  // 모바일 검색 관련 메서드들
  openMobileSearch() {
    if (this.mobileSearchOverlay) {
      this.mobileSearchOverlay.classList.add('open');
      setTimeout(() => {
        if (this.mobileSearchInput) {
          this.mobileSearchInput.focus();
        }
      }, 100);
    }
  }

  closeMobileSearch() {
    if (this.mobileSearchOverlay) {
      this.mobileSearchOverlay.classList.remove('open');
      if (this.mobileSearchInput) {
        this.mobileSearchInput.value = '';
      }
    }
  }

  performMobileSearch() {
    const query = this.mobileSearchInput ? this.mobileSearchInput.value.trim() : '';
    
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

customElements.define('main-nav-no-lang', MainNavNoLang);