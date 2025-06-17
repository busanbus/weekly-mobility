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
          gap: 18px;
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
        }
        .search-input {
          padding: 10px 36px 10px 16px;
          border: 1px solid var(--border-light, #e8eaed);
          border-radius: 8px;
          font-size: 1.08rem;
          outline: none;
          background: var(--bg-primary, #fafbfc);
          transition: border 0.2s;
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
        @media (max-width: 700px) {
          .nav-inner {
            flex-direction: column;
            align-items: stretch;
            padding: 0 10px;
            min-height: 48px;
          }
          .nav-left, .nav-right {
            gap: 10px;
            justify-content: flex-start;
          }
        }
      </style>
      <nav class="nav-bg">
        <div class="nav-inner">
          <div class="nav-left">
            <a class="nav-logo" href="/weekly-mobility/">
              <img src="/images/logo.png" alt="로고" />
            </a>
            <a class="nav-link" href="/weekly-mobility/">홈</a>
            <a class="nav-link" href="/weekly-mobility/about.html">소개</a>
            <a class="nav-link" href="/weekly-mobility/archive/">아카이브</a>
          </div>
          <div class="nav-right">
            <div class="search-box">
              <input class="search-input" type="text" placeholder="카드뉴스 검색..." />
              <span class="search-icon">🔍</span>
              <div class="search-results"></div>
            </div>
            <select class="lang-select">
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </nav>
    `;

    // DOM 요소 참조
    this.searchBox = shadow.querySelector('.search-box');
    this.searchInput = shadow.querySelector('.search-input');
    this.searchResults = shadow.querySelector('.search-results');
    this.langSelect = shadow.querySelector('.lang-select');

    // 이벤트 리스너 설정
    this.setupEventListeners();
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

    // 언어 선택
    this.langSelect.addEventListener('change', e => {
      if(e.target.value === 'en') {
        window.location.href = '/weekly-mobility/en/';
      } else {
        window.location.href = '/weekly-mobility/';
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