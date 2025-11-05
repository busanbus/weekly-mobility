class HomeIndexFooter extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        .footer {
          background: var(--gray-900, #0f172a);
          color: white;
          padding: 56px 0 28px 0;
          margin-top: 0;
        }
        
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          text-align: center;
        }
        
        .footer-title {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 12px;
        }
        
        .footer-subtitle {
          font-size: 1rem;
          opacity: 0.8;
          margin-bottom: 18px;
        }
        
        .footer-info {
          font-size: 0.97rem;
          opacity: 0.7;
          line-height: 1.8;
          margin-bottom: 18px;
        }
        
        .footer-links {
          margin-top: 12px;
        }
        
        .footer-links a {
          color: #fff;
          text-decoration: underline;
          font-weight: 500;
        }
        
        .footer-links span {
          margin: 0 8px;
          color: #888;
        }
        
        @media (max-width: 768px) {
          .footer {
            padding: 40px 0 24px 0;
          }
          
          .footer-content {
            padding: 0 16px;
          }
          
          .footer-title {
            font-size: 1.2rem;
          }
          
          .footer-subtitle {
            font-size: 0.95rem;
          }
          
          .footer-info {
            font-size: 0.9rem;
          }
        }
      </style>
      <footer class="footer">
        <div class="footer-content">
          <div class="footer-title">모빌리티 주간동향</div>
          <div class="footer-subtitle">
            부산시내버스운송사업조합이 제공하는 대중교통·모빌리티 정책 트렌드 서비스
          </div>
          <div class="footer-info">
            본 사이트의 모든 자료는 공공 목적의 정보 제공을 위해 제작되었으며,<br>
            무단 복제 및 상업적 이용을 금지합니다.<br>
            © 2025 Busan Metrobus Company Association. All rights reserved.
          </div>
          <div class="footer-links">
            <a href="mailto:chha@busanbus.or.kr">문의하기</a>
            <span>|</span>
            <a href="https://busanbus.or.kr" target="_blank" rel="noopener noreferrer">공식 홈페이지</a>
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('home-index-footer', HomeIndexFooter);

