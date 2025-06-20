class MainNav extends HTMLElement {
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
          justify-content: space-between;
          min-height: 70px;
          padding: 0 32px;
        }
        .nav-left {
          display: flex;
          align-items: center;
          gap: 18px;
          justify-content: center;
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: flex-end;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          margin-right: 32px;
        }
        .nav-logo img {
          height: 48px;
          width: auto;
          display: block;
        }
        .nav-link {
          color: var(--text-primary, #1A1D29);
          text-decoration: none;
          font-weight: 500;
          font-size: 1.15rem;
          padding: 12px 16px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .nav-link:hover {
          background: var(--secondary-blue, #E6F1FF);
        }
        .search-box {
          position: relative;
          width: 120px;
          max-width: 120px;
          min-width: 0;
        }
        .search-input {
          padding: 10px 36px 10px 16px;
          border: 1px solid var(--border-light, #e8eaed);
          border-radius: 8px;
          font-size: 1.08rem;
          outline: none;
          background: var(--bg-primary, #fafbfc);
          transition: border 0.2s;
          width: 120px;
          max-width: 120px;
          min-width: 0;
        }
        .search-input:focus {
          border: 1.5px solid var(--primary-blue, #0066FF);
        }
        .search-icon {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
          color: var(--text-secondary, #5A6573);
        }
        .lang-select {
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid var(--border-light, #e8eaed);
          background: var(--bg-primary, #fafbfc);
          font-size: 1.08rem;
        }
        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          margin-top: 8px;
          box-shadow: var(--shadow-lg);
          max-height: 400px;
          overflow-y: auto;
          display: none;
          z-index: 1000;
        }
        .search-result-item {
          display: block;
          padding: 12px 16px;
          color: var(--text-primary);
          text-decoration: none;
          border-bottom: 1px solid var(--border-light);
          transition: background 0.2s;
        }
        .search-result-item:hover {
          background: var(--bg-secondary);
        }
        .burger-btn {
          display: none;
          background: none;
          border: none;
          font-size: 2rem;
          color: var(--primary-blue, #0066FF);
          cursor: pointer;
          position: relative;
          z-index: 1201;
        }
        .mobile-menu,
        .mobile-menu-overlay {
          display: none;
        }
        @media (max-width: 700px) {
          .nav-inner {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            padding: 0 16px;
            min-height: 48px;
          }
          .nav-logo {
            margin-right: 0;
          }
          .nav-logo img {
            height: 36px;
            width: auto;
            display: block;
          }
          .burger-btn {
            display: block;
            position: relative;
            top: 0;
            right: 0;
            margin-left: auto;
            margin-right: 24px;
          }
          .nav-left, .nav-right {
            display: none !important;
          }
          body {
            padding-top: 48px !important;
          }
          .header {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          .mobile-menu-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.25);
            z-index: 1200;
          }
          .mobile-menu {
            display: none;
            position: fixed;
            top: 0; right: 0;
            width: 80vw;
            max-width: 320px;
            height: 100vh;
            background: #fff;
            box-shadow: -2px 0 16px rgba(0,0,0,0.10);
            z-index: 1202;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          }
          .mobile-menu.open {
            display: block;
            transform: translateX(0);
          }
          .mobile-menu-content {
            display: flex;
            flex-direction: column;
            gap: 18px;
            padding: 32px 20px 20px 20px;
          }
          .mobile-menu .nav-link {
            font-size: 1.15rem;
            padding: 12px 0;
          }
          .mobile-menu .search-box,
          .mobile-menu .search-input {
            width: 80vw;
            max-width: 80vw;
          }
          .mobile-menu .lang-select-wrapper {
            margin-left: 0;
            padding: 0;
            box-shadow: none;
            border-radius: 8px;
            background: none;
          }
          .mobile-menu .lang-label {
            font-size: 0.98rem;
          }
          .mobile-menu .lang-select {
            font-size: 1rem;
            padding: 8px 28px 8px 10px;
            border-radius: 8px;
          }
          .nav-bg {
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .search-box,
          .search-input,
          .mobile-menu .search-box,
          .mobile-menu .search-input {
            width: 80vw;
            max-width: 80vw;
          }
          .mobile-menu .nav-link.nav-about,
          .mobile-menu .nav-link.nav-archive,
          .mobile-menu .search-box {
            display: none !important;
          }
          .mobile-menu .nav-link.nav-home {
            display: none !important;
          }
        }
        .close-btn {
          display: block;
          background: none;
          border: none;
          font-size: 2.2rem;
          color: var(--primary-blue, #0066FF);
          cursor: pointer;
          position: absolute;
          top: 12px;
          right: 18px;
          z-index: 1300;
        }
        .lang-select-wrapper {
          min-width: 0;
        }
        .nav-link.nav-about,
        .nav-link.nav-archive,
        .search-box {
          display: none !important;
        }
        .nav-link.nav-home {
          display: none !important;
        }
      </style>
      <nav class="nav-bg">
        <div class="nav-inner">
          <a class="nav-logo" href="/index.html">
            <img src="/images/logo.png" alt="로고" />
          </a>
          <div class="nav-left">
            <a class="nav-link nav-home" href="/index.html">홈</a>
            <a class="nav-link nav-about" href="/weekly-mobility/about.html">소개</a>
            <a class="nav-link nav-archive" href="/weekly-mobility/archive/">아카이브</a>
          </div>
          <div class="nav-right">
            <div class="search-box">
              <input class="search-input" type="text" placeholder="카드뉴스 검색..." />
              <span class="search-icon">🔍</span>
              <div class="search-results"></div>
            </div>
            <div class="lang-select-wrapper">
              <label for="lang-select" class="lang-label">🌐 언어</label>
              <select id="lang-select" class="lang-select">
                <option value="ko">🇰🇷 한국어</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>
          <button class="burger-btn" aria-label="메뉴 열기" tabindex="0">☰</button>
        </div>
        <div class="mobile-menu-overlay"></div>
        <div class="mobile-menu">
          <button class="close-btn" aria-label="메뉴 닫기" tabindex="0">×</button>
          <div class="mobile-menu-content">
            <a class="nav-link nav-home" href="/index.html">홈</a>
            <a class="nav-link nav-about" href="/weekly-mobility/about.html">소개</a>
            <a class="nav-link nav-archive" href="/weekly-mobility/archive/">아카이브</a>
            <div class="search-box">
              <input class="search-input" type="text" placeholder="카드뉴스 검색..." />
              <span class="search-icon">🔍</span>
              <div class="search-results"></div>
            </div>
            <div class="lang-select-wrapper">
              <label for="lang-select-mobile" class="lang-label">🌐 언어</label>
              <select id="lang-select-mobile" class="lang-select">
                <option value="ko">🇰🇷 한국어</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>
        </div>
      </nav>
    `;

    // DOM 요소 참조
    this.searchBox = shadow.querySelector('.search-box');
    this.searchInput = shadow.querySelector('.search-input');
    this.searchResults = shadow.querySelector('.search-results');
    this.langSelect = shadow.querySelector('.lang-select');
    this.burgerBtn = shadow.querySelector('.burger-btn');
    this.mobileMenu = shadow.querySelector('.mobile-menu');
    this.mobileMenuOverlay = shadow.querySelector('.mobile-menu-overlay');
    this.closeBtn = shadow.querySelector('.close-btn');
    this.langSelectMobile = shadow.querySelector('#lang-select-mobile');

    // 공통 언어 변경 함수
    const handleLanguageChange = (selectedLang) => {
      // 두 드롭다운 값 동기화 (이벤트 없이)
      if (this.langSelect) this.langSelect.value = selectedLang;
      if (this.langSelectMobile) this.langSelectMobile.value = selectedLang;
      // 페이지 이동 로직
      const currentPath = window.location.pathname;
      let newPath;
      if (selectedLang === 'en') {
        if (!currentPath.includes('/en/')) {
          const lastSlashIndex = currentPath.lastIndexOf('/');
          const path = currentPath.substring(0, lastSlashIndex);
          const file = currentPath.substring(lastSlashIndex + 1);
          if (path === '' && file === 'index.html') {
            newPath = `/en/`;
          } else {
            newPath = `${path}/en/${file}`;
          }
          window.location.href = newPath.replace('//', '/');
        }
      } else if (selectedLang === 'ko') {
        if (currentPath.includes('/en/')) {
          newPath = currentPath.replace('/en/', '/');
          window.location.href = newPath.replace('//', '/');
        }
      }
    };

    // 이벤트 리스너 설정
    this.setupEventListeners();
    this.updateLanguageSelector();

    // 햄버거 메뉴 동작
    if (this.burgerBtn && this.mobileMenu && this.mobileMenuOverlay) {
      this.burgerBtn.addEventListener('click', () => {
        // 모바일 메뉴 열릴 때 언어 드롭다운 동기화
        if (this.langSelectMobile) {
          let lang = 'ko';
          if (document.documentElement.lang) {
            lang = document.documentElement.lang;
          } else if (window.location.pathname.includes('/en/')) {
            lang = 'en';
          }
          this.langSelectMobile.value = lang;
        }
        this.mobileMenu.classList.add('open');
        this.mobileMenuOverlay.style.display = 'block';
      });
      this.mobileMenuOverlay.addEventListener('click', () => {
        this.mobileMenu.classList.remove('open');
        this.mobileMenuOverlay.style.display = 'none';
      });
    }

    if (this.closeBtn && this.mobileMenu && this.mobileMenuOverlay) {
      this.closeBtn.addEventListener('click', () => {
        this.mobileMenu.classList.remove('open');
        this.mobileMenuOverlay.style.display = 'none';
      });
    }

    // 언어 드롭다운 동기화 및 이벤트 연결
    if (this.langSelect) {
      this.langSelect.addEventListener('change', (e) => {
        handleLanguageChange(e.target.value);
      });
    }
    if (this.langSelectMobile) {
      this.langSelectMobile.addEventListener('change', (e) => {
        handleLanguageChange(e.target.value);
      });
    }
  }

  updateLanguageSelector() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/en/')) {
      this.langSelect.value = 'en';
    } else {
      this.langSelect.value = 'ko';
    }
  }

  setupEventListeners() {
    // 검색 기능
    let searchTimeout;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        this.searchResults.style.display = 'none';
        return;
      }

      searchTimeout = setTimeout(() => {
        // 임시 검색 결과
        const mockResults = [
          { title: '2025년 6월 2주차 모빌리티 동향', date: '2025.06.16', url: '/archive/2025/06/week2.html' },
          { title: '2025년 6월 1주차 모빌리티 동향', date: '2025.06.09', url: '/archive/2025/06/week1.html' }
        ].filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.date.includes(query)
        );
        
        this.showSearchResults(mockResults);
      }, 300);
    });

    // 검색창 외부 클릭 시 결과 숨기기
    document.addEventListener('click', (e) => {
      if (!this.searchBox.contains(e.target)) {
        this.searchResults.style.display = 'none';
      }
    });
  }

  showSearchResults(results) {
    this.searchResults.innerHTML = results.length ? results.map(result => `
      <a href="${result.url}" class="search-result-item">
        <div style="font-weight: 500; margin-bottom: 4px;">${result.title}</div>
        <div style="font-size: 0.9em; color: var(--text-secondary);">${result.date}</div>
      </a>
    `).join('') : '<div style="padding: 16px; text-align: center; color: var(--text-secondary);">검색 결과가 없습니다.</div>';
    this.searchResults.style.display = 'block';
  }
}

customElements.define('main-nav', MainNav); 