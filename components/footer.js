class MobilityFooter extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    
    // 언어 설정 (속성에서 가져오거나 기본값 사용)
    const lang = this.getAttribute('lang') || 'ko';
    
    // 다국어 텍스트
    const translations = {
      ko: {
        title: '모빌리티 주간 동향',
        description: '모빌리티의 트렌드와 정책 동향을 매주 정리하여 전해드립니다.',
        contact: '문의 : 부산시버스운송사업조합 전략기획팀',
        email: '이메일:',
        copyright: '© 2025 Busan Metrobus Company Association. All rights reserved.'
      },
      en: {
        title: 'Weekly Mobility Trends',
        description: 'We provide a weekly summary of mobility trends and policy developments.',
        contact: 'Contact: Busan Metrobus Company Association, Strategic Planning Team',
        email: 'Email:',
        copyright: '© 2025 Busan Metrobus Company Association. All rights reserved.'
      },
      cn: {
        title: '移动出行周动态',
        description: '每周整理并分享移动出行的趋势和政策动态。',
        contact: '咨询：釜山市内公交运输事业组合战略规划团队',
        email: '邮箱：',
        copyright: '© 2025 Busan Metrobus Company Association. All rights reserved.'
      },
      jp: {
        title: 'モビリティ週間動向',
        description: 'モビリティのトレンドと政策動向を毎週まとめてお伝えします。',
        contact: 'お問い合わせ：釜山市内バス運送事業組合 戦略企画チーム',
        email: 'メール：',
        copyright: '© 2025 Busan Metrobus Company Association. All rights reserved.'
      }
    };
    
    const text = translations[lang] || translations.ko;

    shadow.innerHTML = `
      <style>
        .footer {
          background: var(--surface-color, #ffffff);
          border-top: 1px solid var(--border-color, #e5e7eb);
          padding: 8px 0 20px 0;
          margin-top: 20px;
          text-align: center;
        }
        
        .footer-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .footer-title {
          font-size: 19px;
          font-weight: 700;
          color: var(--text-primary, #1f2937);
          margin-bottom: 10px;
          font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .footer-description {
          font-size: 14px;
          color: var(--text-secondary, #6b7280);
          margin-bottom: 12px;
          line-height: 1.6;
          font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .footer-contact {
          font-size: 13px;
          color: var(--text-secondary, #6b7280);
          margin-bottom: 8px;
          font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .footer-contact a {
          color: var(--primary-blue, #3b82f6);
          text-decoration: underline;
        }
        
        .footer-copyright {
          font-size: 12px;
          color: var(--text-tertiary, #9ca3af);
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        @media (max-width: 768px) {
          .footer {
            padding: 32px 0;
            margin-top: 40px;
          }
          
          .footer-content {
            padding: 0 16px;
          }
          
          .footer-title {
            font-size: 20px;
          }
          
          .footer-description {
            font-size: 14px;
          }
        }
      </style>
      <footer class="footer">
        <div class="footer-content">
          <h3 class="footer-title">${text.title}</h3>
          <p class="footer-description">
            ${text.description}
          </p>
          <p class="footer-contact">
            ${text.contact}<br>
            ${text.email} <a href="mailto:chha@busanbus.or.kr">chha@busanbus.or.kr</a>
          </p>
          <div class="footer-copyright">
            ${text.copyright}
          </div>
        </div>
      </footer>
    `;
  }

  connectedCallback() {
    // 2026 아카이브 주차 페이지에서는 만족도 컴포넌트를 자동 주입한다.
    // (수동 태그가 있으면 중복 주입하지 않음)
    const AUTO_INJECT_SATISFACTION = true;
    if (!AUTO_INJECT_SATISFACTION) return;

    const lang = (this.getAttribute('lang') || 'ko').toLowerCase();

    // /weekly-mobility/archive/2026/03/week2.html
    // /weekly-mobility/archive/2026/03/en/week2.html  (en/cn/jp)
    const m =
      typeof location !== 'undefined'
        ? location.pathname.match(/\/archive\/(\d{4})\/(\d{2})\/(?:(en|cn|jp)\/)?(week\d+)\.html$/)
        : null;
    if (!m) return;

    const year = m[1];
    const month = String(parseInt(m[2], 10)); // '03' -> '3'
    const week = String(parseInt(m[4].replace(/^week/, ''), 10)); // 'week2' -> '2'
    if (year !== '2026') return;

    // 1) page-satisfaction 태그가 없으면 주입
    if (!document.querySelector('page-satisfaction')) {
      const ps = document.createElement('page-satisfaction');
      ps.setAttribute('year', year);
      ps.setAttribute('month', month);
      ps.setAttribute('week', week);
      ps.setAttribute('lang', lang);

      // mobility-footer 바로 위(같은 컨테이너 내부)에 삽입
      const parent = this.parentNode;
      if (parent && parent.insertBefore) {
        parent.insertBefore(ps, this);
      } else if (document.body) {
        document.body.appendChild(ps);
      }
    }

    // 2) page-satisfaction custom element가 등록되지 않았다면 CDN에서 로드
    // (HTML에 상대경로 스크립트가 있더라도, 로딩 순서 때문에 먼저 정의가 안 될 수 있어 방어적으로 처리)
    if (!customElements.get('page-satisfaction')) {
      const SCRIPT_ID = 'ps-page-satisfaction-loader';
      if (!document.getElementById(SCRIPT_ID)) {
        const s = document.createElement('script');
        s.id = SCRIPT_ID;
        s.type = 'module';
        // 상대경로(깊이에 따른 ../..)를 피하기 위해 CDN 절대경로 사용
        s.src =
          'https://cdn.jsdelivr.net/gh/busanbus/weekly-mobility/components/page-satisfaction.js';
        document.head ? document.head.appendChild(s) : document.documentElement.appendChild(s);
      }
    }
  }
}

customElements.define('mobility-footer', MobilityFooter);
