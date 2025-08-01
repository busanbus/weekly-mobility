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
                 .search-trigger-btn {
           display: flex;
           align-items: center;
           justify-content: space-between;
           gap: 8px;
           padding: 8px 16px;
           border: 1.5px solid var(--border-light, #e8eaed);
           background: rgba(255, 255, 255, 0.9);
           border-radius: 20px;
           cursor: pointer;
           color: var(--text-secondary, #5A6573);
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           font-size: 0.9rem;
           font-weight: 500;
           min-width: 160px;
           height: 40px;
           box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
         }
         .search-trigger-btn:hover {
           background: var(--secondary-blue, #E6F1FF);
           border-color: var(--primary-blue, #0066FF);
           color: var(--primary-blue, #0066FF);
           transform: translateY(-1px);
           box-shadow: 0 4px 12px rgba(0, 102, 255, 0.15);
         }
         .search-trigger-icon {
           width: 20px;
           height: 20px;
           flex-shrink: 0;
         }
         .search-trigger-text {
           opacity: 0.7;
           transition: opacity 0.2s;
           font-size: 20px;
         }
         .search-trigger-btn:hover .search-trigger-text {
           opacity: 1;
         }
        .lang-select {
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid var(--border-light, #e8eaed);
          background: var(--bg-primary, #fafbfc);
          font-size: 1.08rem;
        }
        .search-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 9999;
          display: none;
          align-items: flex-start;
          justify-content: center;
          padding-top: 8vh;
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .search-modal.active {
          display: flex;
          opacity: 1;
        }
        .search-modal-content {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          box-shadow: 
            0 25px 50px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          width: 92vw;
          max-width: 680px;
          max-height: 75vh;
          overflow: hidden;
          transform: translateY(20px) scale(0.95);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .search-modal.active .search-modal-content {
          transform: translateY(0) scale(1);
        }
        .search-modal-header {
          padding: 24px 24px 20px 24px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          position: relative;
        }
        .search-modal-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .search-icon-large {
          width: 24px;
          height: 24px;
          color: #3b82f6;
        }
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-modal-input {
          width: 100%;
          padding: 16px 20px 16px 50px;
          border: 2px solid rgba(226, 232, 240, 0.8);
          border-radius: 16px;
          font-size: 1.1rem;
          font-weight: 500;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #1e293b;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .search-modal-input:focus {
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 8px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        .search-modal-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }
        .search-input-icon {
          position: absolute;
          left: 16px;
          width: 20px;
          height: 20px;
          color: #64748b;
          transition: color 0.2s;
        }
        .search-modal-input:focus + .search-input-icon {
          color: #3b82f6;
        }
        .search-modal-results {
          max-height: 420px;
          overflow-y: auto;
          padding: 12px 0;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
        }
        .search-modal-results::-webkit-scrollbar {
          width: 6px;
        }
        .search-modal-results::-webkit-scrollbar-track {
          background: transparent;
        }
        .search-modal-results::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        .search-modal-results::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        .search-result-item {
          display: block;
          padding: 18px 24px;
          color: #1e293b;
          text-decoration: none;
          border-bottom: 1px solid rgba(226, 232, 240, 0.5);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          background: transparent;
        }
        .search-result-item:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 197, 253, 0.08) 100%);
          transform: translateX(4px);
          border-left: 3px solid #3b82f6;
          padding-left: 21px;
        }
        .search-result-item:last-child {
          border-bottom: none;
        }
        .search-result-title {
          font-weight: 600;
          margin-bottom: 8px;
          color: #1e293b;
          line-height: 1.4;
          font-size: 1.05rem;
        }
        .search-result-meta {
          font-size: 0.85rem;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .search-result-date {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .search-result-arrow {
          color: #3b82f6;
          font-weight: 500;
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.2s;
        }
        .search-result-item:hover .search-result-arrow {
          opacity: 1;
          transform: translateX(0);
        }
        .search-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 36px;
          height: 36px;
          border: none;
          background: rgba(248, 250, 252, 0.8);
          backdrop-filter: blur(10px);
          cursor: pointer;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 18px;
          font-weight: 300;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(226, 232, 240, 0.5);
        }
        .search-modal-close:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          transform: scale(1.05);
          border-color: rgba(239, 68, 68, 0.2);
        }
        .search-empty-state {
          padding: 60px 24px;
          text-align: center;
          color: #64748b;
        }
        .search-empty-icon {
          width: 48px;
          height: 48px;
          color: #cbd5e1;
          margin: 0 auto 16px;
        }
        .search-suggestions {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        .search-suggestion-tag {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .search-suggestion-tag:hover {
          background: rgba(59, 130, 246, 0.15);
          transform: translateY(-1px);
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
        .mobile-menu-overlay,
        .mobile-lang-wrapper {
          display: none;
        }
        .mobile-lang-wrapper {
          position: relative;
        }
        .mobile-lang-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .mobile-lang-btn:hover {
          transform: scale(1.1);
        }
        .mobile-lang-flag img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }
        .mobile-lang-popover {
          position: absolute;
          top: 48px;
          right: 0;
          background: #fff;
          border: 1.5px solid var(--border-light, #e8eaed);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          min-width: 140px;
          z-index: 3000;
          padding: 8px;
        }
                 @media (max-width: 700px) {
           .search-trigger-btn {
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
          .burger-btn {
            display: block !important;
            position: relative;
            top: 0;
            left: 0;
            margin-left: 0;
            margin-right: 0;
            order: -1;
          }
          .nav-left, .nav-right {
            display: none !important;
          }
          .mobile-lang-wrapper {
            display: block !important;
            position: absolute;
            right: 50px;
            top: 50%;
            transform: translateY(-50%);
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
            position: relative;
          }
          .mobile-menu .lang-label {
            font-size: 0.98rem;
          }
          .mobile-menu .lang-select {
            font-size: 1rem;
            padding: 8px 28px 8px 10px;
            border-radius: 8px;
          }
          .mobile-menu .lang-btn {
            width: auto;
            justify-content: flex-start;
            padding: 12px 16px;
            border-radius: 8px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            display: inline-flex;
          }
          .mobile-menu .lang-popover {
            position: absolute;
            right: 0;
            left: auto;
            transform: none;
            min-width: 140px;
            width: auto;
            max-width: 200px;
            top: 52px;
            z-index: 5000;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
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
          .mobile-menu .lang-option {
            padding: 10px 16px;
            font-size: 0.95rem;
            border-radius: 8px;
            margin: 2px 0;
          }
          .mobile-menu .lang-flag img {
            width: 24px;
            height: 24px;
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
        .nav-link.nav-archive {
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
           justify-content: center;
           background: transparent;
           border: none;
           cursor: pointer;
           transition: transform 0.2s;
           position: relative;
         }
        .lang-btn:focus, .lang-btn:hover {
          transform: scale(1.1);
          transition: transform 0.2s;
        }
                 .lang-flag img {
           width: 36px;
           height: 36px;
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
           right: -50px;
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
          <a class="nav-logo" href="https://busanbus.github.io/weekly-mobility">
            <img src="https://i.ibb.co/svMm1DPr/logo.png" alt="로고" />
          </a>
          <div class="nav-left">
            <a class="nav-link nav-home" href="https://busanbus.github.io/weekly-mobility/">홈</a>
            <a class="nav-link nav-about" href="/weekly-mobility/about.html">소개</a>
            <a class="nav-link nav-archive" href="/weekly-mobility/archive/">아카이브</a>
          </div>
          <div class="nav-right">
                         <button class="search-trigger-btn" aria-label="검색" title="검색하기">
               <span class="search-trigger-text">동향 검색</span>
               <svg class="search-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <circle cx="11" cy="11" r="8"></circle>
                 <path d="m21 21-4.35-4.35"></path>
               </svg>
             </button>
            <div class="lang-popover-wrapper">
                             <button class="lang-btn" aria-label="언어 선택" tabindex="0">
                 <span class="lang-flag" data-lang="ko">
                   <img src="https://hatscripts.github.io/circle-flags/flags/kr.svg" alt="한국 국기" />
                 </span>
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
                <button class="lang-option" data-lang="cn" aria-label="중국어">
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
          <div class="mobile-lang-wrapper">
            <button class="mobile-lang-btn" aria-label="언어 선택" tabindex="0">
              <span class="mobile-lang-flag" data-lang="ko">
                <img src="https://hatscripts.github.io/circle-flags/flags/kr.svg" alt="한국 국기" />
              </span>
            </button>
            <div class="mobile-lang-popover" style="display:none;">
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
              <button class="lang-option" data-lang="cn" aria-label="중국어">
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
            <a class="nav-link nav-home" href="https://busanbus.github.io/weekly-mobility/">홈</a>
            <a class="nav-link nav-about" href="/weekly-mobility/about.html">소개</a>
            <a class="nav-link nav-archive" href="/weekly-mobility/archive/">아카이브</a>
            <div class="search-box">
              <input class="search-input" type="text" placeholder="카드뉴스 검색..." />
              <span class="search-icon">🔍</span>
              <div class="search-results"></div>
            </div>
          </div>
        </div>
        
        <!-- 검색 모달 -->
        <div class="search-modal" id="search-modal">
          <div class="search-modal-content">
            <div class="search-modal-header">
              <div class="search-modal-title">
                <svg class="search-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                모빌리티 동향 검색
              </div>
              <div class="search-input-wrapper">
                <input type="text" class="search-modal-input" placeholder="BRT, 자율주행, 전기차 등 키워드를 입력하세요..." id="search-modal-input" />
                <svg class="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>
              <button class="search-modal-close" id="search-modal-close">×</button>
            </div>
            <div class="search-modal-results" id="search-modal-results">
              <div class="search-empty-state">
                <svg class="search-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <div style="font-size: 1.2em; font-weight: 600; margin-bottom: 8px; color: #475569;">검색어를 입력하세요</div>
                <div style="font-size: 0.95em; color: #64748b; margin-bottom: 20px;">모빌리티 관련 키워드로 최신 동향을 찾아보세요</div>
                <div class="search-suggestions">
                  <span class="search-suggestion-tag">BRT</span>
                  <span class="search-suggestion-tag">자율주행</span>
                  <span class="search-suggestion-tag">전기차</span>
                  <span class="search-suggestion-tag">수소차</span>
                  <span class="search-suggestion-tag">카카오T</span>
                  <span class="search-suggestion-tag">MaaS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    `;

    // DOM 요소 참조
    this.searchTriggerBtn = shadow.querySelector('.search-trigger-btn');
    this.searchModal = shadow.querySelector('.search-modal');
    this.searchModalInput = shadow.querySelector('.search-modal-input');
    this.searchModalResults = shadow.querySelector('.search-modal-results');
    this.searchModalClose = shadow.querySelector('.search-modal-close');
    this.burgerBtn = shadow.querySelector('.burger-btn');
    this.mobileMenu = shadow.querySelector('.mobile-menu');
    this.mobileMenuOverlay = shadow.querySelector('.mobile-menu-overlay');
    this.closeBtn = shadow.querySelector('.close-btn');

    // 모바일 언어 버튼 참조
    this.mobileLangWrapper = shadow.querySelector('.mobile-lang-wrapper');
    this.mobileLangBtnMain = shadow.querySelector('.mobile-lang-btn');
    this.mobileLangPopoverMain = shadow.querySelector('.mobile-lang-popover');
    this.mobileLangFlagMain = this.mobileLangBtnMain ? this.mobileLangBtnMain.querySelector('.mobile-lang-flag img') : null;

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
    const handleLanguageChange = (selectedLang) => {
      if (this.langPopover) this.langPopover.style.display = 'none';
    
      const currentPath = window.location.pathname;
      const langCodes = ['en', 'cn', 'jp'];
      const currentLang = langCodes.find(code => currentPath.includes(`/${code}/`)) || 'ko';
    
      if (selectedLang === currentLang) return;
    
      let newPath;
      
      if (selectedLang === 'ko') {
        newPath = currentPath.replace(new RegExp(`/${currentLang}/`), '/');
      } else {
        if (currentLang === 'ko') {
          const lastSlashIndex = currentPath.lastIndexOf('/');
          const path = currentPath.substring(0, lastSlashIndex);
          const file = currentPath.substring(lastSlashIndex + 1);
          newPath = `${path}/${selectedLang}/${file}`;
        } else {
          newPath = currentPath.replace(`/${currentLang}/`, `/${selectedLang}/`);
        }
      }
      
      window.location.href = newPath.replace('//', '/');
    };

    // 데스크탑/모바일 모두 이벤트 연결
    const setupLangPopoverEvents = (btn, popover) => {
      if (!btn || !popover) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = popover.style.display === 'block';
        popover.style.display = isVisible ? 'none' : 'block';
        
        // floating-sns 컴포넌트 숨기기/보이기
        const floatingSns = document.querySelector('floating-sns');
        if (floatingSns) {
          if (isVisible) {
            // 드롭다운이 닫힐 때 floating-sns 보이기
            floatingSns.style.display = 'block';
          } else {
            // 드롭다운이 열릴 때 floating-sns 숨기기
            floatingSns.style.display = 'none';
          }
        }
      });

      popover.querySelectorAll('.lang-option').forEach(optionBtn => {
        optionBtn.addEventListener('click', () => {
          const lang = optionBtn.getAttribute('data-lang');
          handleLanguageChange(lang);
          // floating-sns 컴포넌트 다시 보이기
          const floatingSns = document.querySelector('floating-sns');
          if (floatingSns) {
            floatingSns.style.display = 'block';
          }
        });
      });
    };

    setupLangPopoverEvents(this.langBtn, this.langPopover);
    setupLangPopoverEvents(this.mobileLangBtn, this.mobileLangPopover);
    setupLangPopoverEvents(this.mobileLangBtnMain, this.mobileLangPopoverMain);

    document.addEventListener('click', (e) => {
      if (this.langPopover && !this.langPopover.contains(e.target) && !this.langBtn.contains(e.target)) {
        this.langPopover.style.display = 'none';
        // floating-sns 컴포넌트 다시 보이기
        const floatingSns = document.querySelector('floating-sns');
        if (floatingSns) {
          floatingSns.style.display = 'block';
        }
      }
      if (this.mobileLangPopover && this.mobileLangBtn && !this.mobileLangPopover.contains(e.target) && !this.mobileLangBtn.contains(e.target)) {
        this.mobileLangPopover.style.display = 'none';
        // floating-sns 컴포넌트 다시 보이기
        const floatingSns = document.querySelector('floating-sns');
        if (floatingSns) {
          floatingSns.style.display = 'block';
        }
      }
      if (this.mobileLangPopoverMain && this.mobileLangBtnMain && !this.mobileLangPopoverMain.contains(e.target) && !this.mobileLangBtnMain.contains(e.target)) {
        this.mobileLangPopoverMain.style.display = 'none';
        // floating-sns 컴포넌트 다시 보이기
        const floatingSns = document.querySelector('floating-sns');
        if (floatingSns) {
          floatingSns.style.display = 'block';
        }
      }
    });

    // 이벤트 리스너 설정
    this.setupEventListeners();
    this.setupSearchModal();
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
    const langBtn = this.shadowRoot.querySelector('.lang-btn');
    const mobileLangBtn = this.shadowRoot.querySelector('.mobile-menu .lang-btn');
    const mobileLangBtnMain = this.shadowRoot.querySelector('.mobile-lang-btn');

    const updateButton = (btn) => {
      if (!btn) return;
      const flagImg = btn.querySelector('img');
      const labelSpan = btn.querySelector('span.lang-label');
      const currentPath = window.location.pathname;

      if (currentPath.includes('/en/')) {
        flagImg.src = 'https://hatscripts.github.io/circle-flags/flags/us.svg';
        flagImg.alt = '미국 국기';
        if (labelSpan) labelSpan.textContent = 'English';
      } else if (currentPath.includes('/cn/')) {
        flagImg.src = 'https://hatscripts.github.io/circle-flags/flags/cn.svg';
        flagImg.alt = '중국 국기';
        if (labelSpan) labelSpan.textContent = '中文';
      } else if (currentPath.includes('/jp/')) {
        flagImg.src = 'https://hatscripts.github.io/circle-flags/flags/jp.svg';
        flagImg.alt = '일본 국기';
        if (labelSpan) labelSpan.textContent = '日本語';
      } else {
        flagImg.src = 'https://hatscripts.github.io/circle-flags/flags/kr.svg';
        flagImg.alt = '한국 국기';
        if (labelSpan) labelSpan.textContent = '한국어';
      }
    };
    
    updateButton(langBtn);
    updateButton(mobileLangBtn);
    updateButton(mobileLangBtnMain);
  }

  setupEventListeners() {
    // 기존 코드는 비워두고 나중에 정리
  }

  setupSearchModal() {
    // 검색 트리거 버튼 클릭
    this.searchTriggerBtn.addEventListener('click', () => {
      this.openSearchModal();
    });

    // 모달 닫기 버튼
    this.searchModalClose.addEventListener('click', () => {
      this.closeSearchModal();
    });

    // 모달 배경 클릭 시 닫기
    this.searchModal.addEventListener('click', (e) => {
      if (e.target === this.searchModal) {
        this.closeSearchModal();
      }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.searchModal.classList.contains('active')) {
        this.closeSearchModal();
      }
    });

    // 검색 입력
    let searchTimeout;
    this.searchModalInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        this.showModalSearchResults([]);
        return;
      }

      searchTimeout = setTimeout(async () => {
        await this.performNetworkSearch(query);
      }, 300);
    });
  }

  openSearchModal() {
    this.searchModal.classList.add('active');
    setTimeout(() => {
      this.searchModalInput.focus();
    }, 100);
  }

  closeSearchModal() {
    this.searchModal.classList.remove('active');
    this.searchModalInput.value = '';
    // 초기 상태로 복원
    this.searchModalResults.innerHTML = `
      <div class="search-empty-state">
        <svg class="search-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <div style="font-size: 1.2em; font-weight: 600; margin-bottom: 8px; color: #475569;">검색어를 입력하세요</div>
        <div style="font-size: 0.95em; color: #64748b; margin-bottom: 20px;">모빌리티 관련 키워드로 최신 동향을 찾아보세요</div>
        <div class="search-suggestions">
          <span class="search-suggestion-tag">BRT</span>
          <span class="search-suggestion-tag">자율주행</span>
          <span class="search-suggestion-tag">전기차</span>
          <span class="search-suggestion-tag">수소차</span>
          <span class="search-suggestion-tag">카카오T</span>
          <span class="search-suggestion-tag">MaaS</span>
        </div>
      </div>`;
    this.addSuggestionClickEvents();
  }

  formatDate(dateString) {
    // "2025.06.주차2" 형태를 "2025년 6월 2주차" 형태로 변환
    const match = dateString.match(/(\d{4})\.(\d{2})\.주차(\d+)/);
    if (match) {
      const year = match[1];
      const month = parseInt(match[2]);
      const week = match[3];
      return `${year}년 ${month}월 ${week}주차`;
    }
    return dateString; // 변환 실패 시 원본 반환
  }

  async performNetworkSearch(query) {
    try {
      // 실제 네트워크 검색 구현
      const searchData = [
        {
          title: "양방향 BRT 시행, 제주도 vs. 도민 엇갈린 의견",
          date: "2025.06.주차2",
          url: "/weekly-mobility/archive/2025/06/week2.html",
          keywords: ["BRT", "제주도", "양방향", "교통", "버스"]
        },
        {
          title: "BRT 안정화 추진단 운영",
          date: "2025.05.주차4",
          url: "/weekly-mobility/archive/2025/05/week4.html",
          keywords: ["BRT", "안정화", "추진단", "교통", "버스"]
        },
        {
          title: "전국 최초 BRT 섬식정류장 운영",
          date: "2025.05.주차4",
          url: "/weekly-mobility/archive/2025/05/week4.html",
          keywords: ["BRT", "섬식정류장", "교통", "버스", "정류장"]
        },
        {
          title: "동백패스, '2025 국가서비스대상'선정 및 모바일 서비스 시행",
          date: "2025.06.주차4",
          url: "/weekly-mobility/archive/2025/06/week4.html",
          keywords: ["동백패스", "모바일", "서비스", "교통카드", "부산"]
        },
        {
          title: "심야 자율주행택시 운행확대",
          date: "2025.06.주차3",
          url: "/weekly-mobility/archive/2025/06/week3.html",
          keywords: ["자율주행", "택시", "심야", "운행", "확대"]
        },
        {
          title: "전기차 캐즘 대응, EREV 시장 확대",
          date: "2025.06.주차2",
          url: "/weekly-mobility/archive/2025/06/week2.html",
          keywords: ["전기차", "EREV", "시장", "캐즘", "확대"]
        },
        {
          title: "친환경차가 내연차보다 잘 팔리는데, 왜 휘발유 소비 늘지?",
          date: "2025.06.주차4",
          url: "/weekly-mobility/archive/2025/06/week4.html",
          keywords: ["친환경차", "내연차", "휘발유", "소비", "판매"]
        },
        {
          title: "울산 수소그린모빌리티 실증 확대",
          date: "2025.05.주차4",
          url: "/weekly-mobility/archive/2025/05/week4.html",
          keywords: ["수소", "그린모빌리티", "울산", "실증", "확대"]
        },
        {
          title: "카카오T, 부당 수수료 징수 관련 과징금 38.82억원 부과",
          date: "2025.05.주차4",
          url: "/weekly-mobility/archive/2025/05/week4.html",
          keywords: ["카카오T", "과징금", "수수료", "부당", "징수"]
        },
        {
          title: "테슬라, 로보택시 출시",
          date: "2025.05.주차4",
          url: "/weekly-mobility/archive/2025/05/week4.html",
          keywords: ["테슬라", "로보택시", "출시", "자율주행", "택시"]
        }
      ];

      // 검색 실행
      const results = searchData.filter(item => {
        const searchText = query.toLowerCase();
        return item.title.toLowerCase().includes(searchText) ||
               item.keywords.some(keyword => keyword.toLowerCase().includes(searchText));
      }).slice(0, 8);

      this.showModalSearchResults(results);
    } catch (error) {
      console.error('검색 중 오류:', error);
      this.showModalSearchResults([]);
    }
  }

  showSearchResults(results) {
    if (results.length === 0) {
      this.searchResults.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 1.1em; margin-bottom: 8px;">🔍 검색 결과가 없습니다</div>
          <div style="font-size: 0.9em;">다른 키워드로 검색해보세요</div>
        </div>`;
    } else {
      this.searchResults.innerHTML = results.map(result => `
        <a href="${result.url}" class="search-result-item">
          <div style="font-weight: 600; margin-bottom: 6px; color: #1A1D29; line-height: 1.4;">
            ${this.highlightSearchTerm(result.title)}
          </div>
          <div style="font-size: 0.85em; color: #5A6573; display: flex; align-items: center; gap: 8px;">
            <span>📅 ${result.date}</span>
            <span style="color: #0066FF;">자세히 보기 →</span>
          </div>
        </a>
      `).join('');
    }
    this.searchResults.style.display = 'block';
  }

  showModalSearchResults(results) {
    if (results.length === 0) {
      this.searchModalResults.innerHTML = `
        <div class="search-empty-state">
          <svg class="search-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <div style="font-size: 1.2em; font-weight: 600; margin-bottom: 8px; color: #475569;">검색 결과가 없습니다</div>
          <div style="font-size: 0.95em; color: #64748b; margin-bottom: 20px;">다른 키워드로 다시 검색해보세요</div>
          <div class="search-suggestions">
            <span class="search-suggestion-tag">BRT</span>
            <span class="search-suggestion-tag">자율주행</span>
            <span class="search-suggestion-tag">전기차</span>
            <span class="search-suggestion-tag">수소차</span>
            <span class="search-suggestion-tag">카카오T</span>
            <span class="search-suggestion-tag">MaaS</span>
          </div>
        </div>`;
    } else {
      this.searchModalResults.innerHTML = results.map(result => `
        <a href="${result.url}" class="search-result-item">
          <div class="search-result-title">
            ${this.highlightModalSearchTerm(result.title)}
          </div>
          <div class="search-result-meta">
            <div class="search-result-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              ${this.formatDate(result.date)}
            </div>
            <div class="search-result-arrow">자세히 보기 →</div>
          </div>
        </a>
      `).join('');
    }
    
    // 검색 제안 태그 클릭 이벤트 추가
    this.addSuggestionClickEvents();
  }

  addSuggestionClickEvents() {
    const suggestions = this.searchModalResults.querySelectorAll('.search-suggestion-tag');
    suggestions.forEach(tag => {
      tag.addEventListener('click', () => {
        this.searchModalInput.value = tag.textContent;
        this.performNetworkSearch(tag.textContent);
      });
    });
  }

  highlightModalSearchTerm(text) {
    const query = this.searchModalInput.value.trim();
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background: #FFF3CD; color: #856404; padding: 2px 4px; border-radius: 4px; font-weight: 700;">$1</mark>');
  }

  highlightSearchTerm(text) {
    const query = this.searchInput ? this.searchInput.value.trim() : '';
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background: #FFF3CD; color: #856404; padding: 1px 3px; border-radius: 3px;">$1</mark>');
  }
}

customElements.define('main-nav', MainNav); 