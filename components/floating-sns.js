class FloatingSNS extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
  
      shadow.innerHTML = `
        <style>
          .floating-sns {
            position: fixed;
            right: 90px;
            top: 15%;
            transform: translateY(0);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 12px;
            background: transparent;
            box-shadow: none;
          }
          .sns-toggle-btn {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0066FF 0%, #003DD1 100%);
            box-shadow: 0 4px 16px rgba(0,0,0,0.13);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
            padding: 0;
            outline: none;
            color: #fff;
            font-family: 'Noto Sans KR', sans-serif;
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.5px;
          }
          .sns-toggle-btn .sns-icon {
            margin-bottom: 2px;
          }
          .sns-list {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 16px;
            margin-bottom: 0;
            transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s;
            max-height: 0;
            opacity: 0;
            overflow: visible;
            background: transparent;
            box-shadow: none;
          }
          .sns-list.open {
            max-height: 300px;
            opacity: 1;
            margin-bottom: 8px;
          }
          .sns-btn {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            box-shadow: 0 4px 16px rgba(0,0,0,0.13);
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            padding: 0;
            background: transparent;
            transition: box-shadow 0.2s, transform 0.2s, background 0.2s, opacity 0.3s, transform 0.4s;
            opacity: 0;
            transform: translateY(20px);
          }
          .sns-list.open .sns-btn {
            opacity: 1;
            transform: translateY(0);
            transition:
              opacity 0.4s cubic-bezier(0.4,0,0.2,1),
              transform 0.4s cubic-bezier(0.4,0,0.2,1);
          }
          .sns-list.open .sns-btn:nth-child(1) { transition-delay: 0.05s; }
          .sns-list.open .sns-btn:nth-child(2) { transition-delay: 0.15s; }
          .sns-list.open .sns-btn:nth-child(3) { transition-delay: 0.25s; }
          .sns-btn.insta {
            background: linear-gradient(135deg, #E1306C 0%, #F56040 100%);
          }
          .sns-btn.youtube {
            background: #FF0000;
          }
          .sns-btn.naver {
            background: #03C75A;
          }
          .sns-btn img {
            width: 28px;
            height: 28px;
            filter: brightness(0) invert(1);
            display: block;
            background: transparent;
          }
          .sns-btn.naver img {
            width: 22px;
            height: 22px;
          }
          @media (max-width: 600px) {
            .floating-sns {
              right: 18px;
              top: 18%;
              transform: translateY(0);
              gap: 8px;
            }
            .sns-toggle-btn {
              width: 42px;
              height: 42px;
            }
            .sns-btn {
              width: 42px;
              height: 42px;
            }
            .sns-btn img,
            .sns-toggle-btn img {
              width: 20px;
              height: 20px;
            }
            .sns-btn.naver img {
              width: 16px;
              height: 16px;
            }
          }
        </style>
        <div class="floating-sns">
          <button class="sns-toggle-btn" title="SNS 열기" aria-label="SNS 열기">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white">
              <circle cx="5" cy="12" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="19" cy="12" r="2"/>
            </svg>
          </button>
          <div class="sns-list">
            <a href="https://www.instagram.com/busholic_busan/" target="_blank" class="sns-btn insta" title="인스타그램">
              <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg" alt="인스타그램" />
            </a>
            <a href="https://www.youtube.com/channel/UCrBrdoITKYxidD_pqJnPCcg" target="_blank" class="sns-btn youtube" title="유튜브">
              <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg" alt="유튜브" />
            </a>
            <a href="https://blog.naver.com/busholic" target="_blank" class="sns-btn naver" title="네이버블로그">
              <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/naver.svg" alt="네이버블로그" />
            </a>
          </div>
        </div>
      `;

      // 토글 기능 추가
      setTimeout(() => {
        const toggleBtn = shadow.querySelector('.sns-toggle-btn');
        const snsList = shadow.querySelector('.sns-list');
        if (toggleBtn && snsList) {
          toggleBtn.addEventListener('click', () => {
            snsList.classList.toggle('open');
          });
          // 외부에서 SNS 펼침 상태를 닫을 수 있도록 이벤트 리스너 추가
          window.addEventListener('close-floating-sns', () => {
            snsList.classList.remove('open');
          });
        }
      }, 0);
    }
  }
  
  customElements.define('floating-sns', FloatingSNS);
  