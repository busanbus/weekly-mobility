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
          cursor: pointer;
          position: relative;
          z-index: 1201;
          width: 24px;
          height: 18px;
        }
        .burger-btn .line {
          position: absolute;
          height: 2.5px;
          width: 100%;
          background-color: #1A1D29;
          border-radius: 4px;
          transition: all 0.25s ease-in-out;
        }
        .burger-btn .line1 { top: 0; }
        .burger-btn .line2 { top: 50%; transform: translateY(-50%); }
        .burger-btn .line3 { bottom: 0; }

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
            display: block !important;
            position: relative;
            top: 0;
            right: 0;
            margin-left: auto;
            margin-right: 48px;
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
            display: block;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.25);
            z-index: 1200;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1);
          }
          .mobile-menu-overlay.open {
            opacity: 1;
            visibility: visible;
          }
          .mobile-menu {
            display: block;
            position: fixed;
            top: 0; right: 0;
            width: 64vw;
            max-width: 256px;
            height: 100vh;
            background: #fff;
            box-shadow: -2px 0 16px rgba(0,0,0,0.10);
            z-index: 1202;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
            visibility: hidden;
          }
          .mobile-menu.open {
            visibility: visible;
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
          .lang-popover {
            right: 50%;
            left: 50%;
            transform: translateX(-50%);
            min-width: 180px;
            width: 90vw;
            max-width: 320px;
            top: 44px;
            z-index: 4000;
          }
          .mobile-menu .lang-popover {
            position: absolute;
            right: 50%;
            left: 50%;
            transform: translateX(-50%);
            min-width: 180px;
            width: 90vw;
            max-width: 320px;
            top: 44px;
            z-index: 5000;
          }
        }
        .close-btn {
          display: block;
          background: none;
          border: none;
          font-size: 2.2rem;
          color: #1A1D29;
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
        .lang-popover-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          margin-left: 8px;
        }
        .lang-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 18px 0 12px;
          height: 40px;
          background: #fff;
          border: 1.5px solid var(--border-light, #e8eaed);
          border-radius: 9999px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          font-size: 1.08rem;
          cursor: pointer;
          transition: box-shadow 0.2s, border 0.2s, background 0.2s;
          position: relative;
        }
        .lang-btn:focus, .lang-btn:hover {
          /* border: 1.5px solid #0066FF; */
          background: #e6f1ff;
          box-shadow: 0 6px 24px rgba(0,102,255,0.10);
          transform: translateY(-2px);
          transition: box-shadow 0.18s, background 0.18s, transform 0.18s;
        }
        .lang-flag img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          margin: 0;
          padding: 0;
        }
        .lang-arrow {
          font-size: 0.8rem;
          margin-left: 4px;
          color: var(--text-secondary, #5A6573);
        }
        .lang-popover {
          position: absolute;
          top: 48px;
          right: 0;
          background: #fff;
          border: 1.5px solid var(--border-light, #e8eaed);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          min-width: 140px;
          z-index: 3000;
          animation: fadeInPop 0.18s cubic-bezier(0.4,0,0.2,1);
          padding: 8px;
        }
        @keyframes fadeInPop {
          0% { opacity: 0; transform: translateY(-8px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lang-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 24px;
          font-size: 1.08rem;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 12px;
          transition: background 0.18s;
          width: 100%;
          box-sizing: border-box;
        }
        .lang-option:hover, .lang-option:focus {
          background: #f0f4ff;
        }
        .lang-label {
          font-family: 'Inter', 'Noto Sans KR', 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
          font-weight: 700;
          font-size: 1.15rem;
          color: #1A1D29;
          letter-spacing: -0.01em;
        }
      </style>
      <nav class="nav-bg">
        <div class="nav-inner">
          <a class="nav-logo" href="../../../index.html">
            <img src="../../../images/logo.png" alt="로고" />
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
            <div class="lang-popover-wrapper">
              <button class="lang-btn" aria-label="언어 선택" tabindex="0">
                <span class="lang-flag" data-lang="ko">
                  <img src="https://hatscripts.github.io/circle-flags/flags/kr.svg" alt="한국 국기" />
                </span>
                <span class="lang-label">한국어</span>
                <span class="lang-arrow">▼</span>
              </button>
              <div class="lang-popover" style="display:none;">
                <button class="lang-option" data-lang="ko" aria-label="한국어">
                  <span class="lang-flag">
                    <img src="https://hatscripts.github.io/circle-flags/flags/kr.svg" alt="한국 국기" />
                  </span>
                  <span class="lang-label">한국어</span>
                </button>
                <button class="lang-option" data-lang="en" aria-label="English">
                  <span class="lang-flag">
                    <img src="https://hatscripts.github.io/circle-flags/flags/us.svg" alt="미국 국기" />
                  </span>
                  <span class="lang-label">English</span>
                </button>
                <button class="lang-option" data-lang="zh" aria-label="중국어">
                  <span class="lang-flag">
                    <img src="https://hatscripts.github.io/circle-flags/flags/cn.svg" alt="중국 국기" />
                  </span>
                  <span class="lang-label">中文</span>
                </button>
                <button class="lang-option" data-lang="jp" aria-label="일본어">
                  <span class="lang-flag">
                    <img src="https://hatscripts.github.io/circle-flags/flags/jp.svg" alt="일본 국기" />
                  </span>
                  <span class="lang-label">日本語</span>
                </button>
              </div>
            </div>
          </div>
          <button class="burger-btn" aria-label="메뉴 열기" tabindex="0">
            <span class="line line1"></span>
            <span class="line line2"></span>
            <span class="line line3"></span>
          </button>
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
            <div class="lang-popover-wrapper">
              <button class="lang-btn" aria-label="언어 선택" tabindex="0">
                <span class="lang-flag" data-lang="ko">
                  <img src="https://hatscripts.github.io/circle-flags/flags/kr.svg" alt="한국 국기" />
                </span>
                <span class="lang-label">한국어</span>
                <span class="lang-arrow">▼</span>
              </button>
              <div class="lang-popover" style="display:none;">
                <button class="lang-option" data-lang="ko" aria-label="한국어">
                  <span class="lang-flag">
                    <img src="https://hatscripts.github.io/circle-flags/flags/kr.svg" alt="한국 국기" />
                  </span>
                  <span class="lang-label">한국어</span>
                </button>
                <button class="lang-option" data-lang="en" aria-label="English">
                  <span class="lang-flag">
                    <img src="https://hatscripts.github.io/circle-flags/flags/us.svg" alt="미국 국기" />
                  </span>
                  <span class="lang-label">English</span>
                </button>
                <button class="lang-option" data-lang="zh" aria-label="중국어">
                  <span class="lang-flag">
                    <img src="https://hatscripts.github.io/circle-flags/flags/cn.svg" alt="중국 국기" />
                  </span>
                  <span class="lang-label">中文</span>
                </button>
                <button class="lang-option" data-lang="jp" aria-label="일본어">
                  <span class="lang-flag">
                    <img src="https://hatscripts.github.io/circle-flags/flags/jp.svg" alt="일본 국기" />
                  </span>
                  <span class="lang-label">日本語</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    `;

    // DOM 요소 참조
    this.searchBox = shadow.querySelector('.search-box');
    this.searchInput = shadow.querySelector('.search-input');
    this.searchResults = shadow.querySelector('.search-results');
    this.burgerBtn = shadow.querySelector('.burger-btn');
    this.mobileMenu = shadow.querySelector('.mobile-menu');
    this.mobileMenuOverlay = shadow.querySelector('.mobile-menu-overlay');
    this.closeBtn = shadow.querySelector('.close-btn');

    // 언어 팝오버 관련
    this.langPopoverWrapper = shadow.querySelector('.lang-popover-wrapper');
    this.langBtn = shadow.querySelector('.lang-btn');
    this.langPopover = shadow.querySelector('.lang-popover');
    this.langFlag = this.langBtn.querySelector('.lang-flag img');
    this.langLabel = this.langBtn.querySelector('.lang-label');

    // 모바일 메뉴 언어 버튼/팝오버
    this.mobileLangBtn = this.mobileMenu ? this.mobileMenu.querySelector('.lang-btn') : null;
    this.mobileLangPopover = this.mobileMenu ? this.mobileMenu.querySelector('.lang-popover') : null;
    this.mobileLangFlag = this.mobileLangBtn ? this.mobileLangBtn.querySelector('.lang-flag img') : null;
    this.mobileLangLabel = this.mobileLangBtn ? this.mobileLangBtn.querySelector('.lang-label') : null;

    // SVG 생성 함수
    function createKORSVG() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '24');
      svg.setAttribute('viewBox', '0 0 32 32');
      svg.innerHTML = "<circle fill='#fff' cx='16' cy='16' r='16'/><ellipse fill='#c60c30' cx='16' cy='16' rx='7' ry='7'/><ellipse fill='#003478' cx='16' cy='16' rx='4.5' ry='4.5'/>";
      return svg;
    }
    function createENGSVG() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '24');
      svg.setAttribute('viewBox', '0 0 32 32');
      svg.innerHTML = "<circle fill='#fff' cx='16' cy='16' r='16'/><g><rect fill='#00247d' width='32' height='32'/><g><rect fill='#fff' y='13' width='32' height='6'/><rect fill='#fff' x='13' width='6' height='32'/></g><g><rect fill='#cf142b' y='15' width='32' height='2'/><rect fill='#cf142b' x='15' width='2' height='32'/></g></g>";
      return svg;
    }
    // 최초 렌더링 시 SVG 삽입
    this.langFlag.innerHTML = '';
    this.langFlag.appendChild(createKORSVG());

    // 언어 팝오버 관련
    this.langPopoverWrapper = shadow.querySelector('.lang-popover-wrapper');
    this.langBtn = shadow.querySelector('.lang-btn');
    this.langPopover = shadow.querySelector('.lang-popover');
    this.langFlag = this.langBtn.querySelector('.lang-flag img');
    this.langLabel = this.langBtn.querySelector('.lang-label');

    // 언어 팝오버 이벤트 연결 함수 (공통화)
    function setupLangPopoverEvents(btn, popover, flagImg, labelSpan) {
      if (!btn || !popover) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = popover.style.display === 'block';
        popover.style.display = isOpen ? 'none' : 'block';
      });
      document.addEventListener('click', (e) => {
        if (!btn.parentElement.contains(e.target)) {
          popover.style.display = 'none';
        }
      });
      popover.querySelectorAll('.lang-option').forEach(optionBtn => {
        optionBtn.addEventListener('click', (e) => {
          const lang = optionBtn.getAttribute('data-lang');
          popover.style.display = 'none';
          // 국기 이미지와 언어명 교체
          let flagUrl = '';
          let altText = '';
          let labelText = '';
          if (lang === 'ko') {
            flagUrl = 'https://hatscripts.github.io/circle-flags/flags/kr.svg';
            altText = '한국 국기';
            labelText = '한국어';
          } else if (lang === 'en') {
            flagUrl = 'https://hatscripts.github.io/circle-flags/flags/us.svg';
            altText = '미국 국기';
            labelText = 'English';
          } else if (lang === 'zh') {
            flagUrl = 'https://hatscripts.github.io/circle-flags/flags/cn.svg';
            altText = '중국 국기';
            labelText = '中文';
          } else if (lang === 'jp') {
            flagUrl = 'https://hatscripts.github.io/circle-flags/flags/jp.svg';
            altText = '일본 국기';
            labelText = '日本語';
          }
          if (flagImg) {
            flagImg.src = flagUrl;
            flagImg.alt = altText;
          }
          if (labelSpan) {
            labelSpan.textContent = labelText;
          }
          // 기존 언어 변경 로직 호출 (ko/en만 실제 페이지 이동)
          if (lang === 'en' && !window.location.pathname.includes('/en/')) {
            let newPath = window.location.pathname.replace(/\/en\//, '/');
            if (!window.location.pathname.includes('/en/')) {
              const lastSlashIndex = window.location.pathname.lastIndexOf('/');
              const path = window.location.pathname.substring(0, lastSlashIndex);
              const file = window.location.pathname.substring(lastSlashIndex + 1);
              if (path === '' && file === 'index.html') {
                newPath = `/en/`;
              } else {
                newPath = `${path}/en/${file}`;
              }
              window.location.href = newPath.replace('//', '/');
            }
          } else if (lang === 'ko' && window.location.pathname.includes('/en/')) {
            const newPath = window.location.pathname.replace('/en/', '/');
            window.location.href = newPath.replace('//', '/');
          } else {
            // zh, jp는 현재 페이지 이동 없이 국기만 바뀜
          }
        });
      });
    }

    // 데스크탑/모바일 모두 이벤트 연결
    setupLangPopoverEvents(this.langBtn, this.langPopover, this.langFlag, this.langLabel);
    setupLangPopoverEvents(this.mobileLangBtn, this.mobileLangPopover, this.mobileLangFlag, this.mobileLangLabel);

    // 공통 언어 변경 함수
    const handleLanguageChange = (selectedLang) => {
      // 두 드롭다운 값 동기화 (이벤트 없이)
      if (this.langPopover) this.langPopover.style.display = 'none';
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

  updateLanguageSelector() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/en/')) {
      this.langPopover.style.display = 'block';
    } else {
      this.langPopover.style.display = 'none';
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