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
        contact: '문의 : 부산시내버스운송사업조합 전략기획팀',
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
}

customElements.define('mobility-footer', MobilityFooter);