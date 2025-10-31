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
            gap: 20px;
          }
          .sns-btn {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            box-shadow: 0 4px 16px rgba(0,0,0,0.13);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
            border: none;
            padding: 0;
            background: #fff;
          }
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
            width: 34px;
            height: 34px;
            filter: brightness(0) invert(1);
            display: block;
          }
          .sns-btn.busanbus { background: #FFffff; }
          .sns-btn.busanbus img { filter: none; width: 36px; height: 33px; }
          .sns-btn:hover {
            box-shadow: 0 0 0 6px rgba(0,0,0,0.08);
            transform: translateY(-2px) scale(1.07);
          }
          .sns-btn:active,
          .sns-btn:focus {
            box-shadow: none;
            transform: none;
            outline: none;
          }
          .sns-btn.naver img {
            width: 28px;
            height: 28px;
          }
          .sns-btn.kakao {
            background: #FEE500;
          }
          .sns-btn.kakao img {
            width: 36px;
            height: 36px;
            background: none;
            border-radius: 0;
            display: block;
            margin: 0 auto;
            filter: none;
          }
          @media (max-width: 600px) {
            .floating-sns {
              right: 18px;
              top: 55%;
              transform: translateY(0);
              gap: 14px;
            }
            .sns-btn {
              width: 52px;
              height: 52px;
            }
            .sns-btn img {
              width: 28px;
              height: 28px;
            }
            .sns-btn.naver img {
              width: 22px;
              height: 22px;
            }
            .sns-btn.kakao img {
              width: 32px;
              height: 32px;
              padding: 2px;
            }
            .sns-btn.busanbus img { width: 36px; height: 36px; }
          }
        </style>
        <div class="floating-sns">
          <a href="https://www.busanbus.or.kr/#/" target="_blank" class="sns-btn busanbus" title="부산시내버스운송사업조합">
            <img src="https://cdn.jsdelivr.net/gh/busanbus/weekly-mobility/images/bubuslogo.png" alt="부산버스 로고" />
          </a>
          <a href="https://www.instagram.com/busholic_busan/" target="_blank" class="sns-btn insta" title="인스타그램">
            <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg" alt="인스타그램" />
          </a>
          <a href="https://www.youtube.com/channel/UCrBrdoITKYxidD_pqJnPCcg" target="_blank" class="sns-btn youtube" title="유튜브">
            <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg" alt="유튜브" />
          </a>
          <a href="https://blog.naver.com/busholic" target="_blank" class="sns-btn naver" title="네이버블로그">
            <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/naver.svg" alt="네이버블로그" />
          </a>
          <a href="http://pf.kakao.com/_xbcLxin" target="_blank" class="sns-btn kakao" title="카카오톡 채널">
            <img src="https://t1.daumcdn.net/cfile/tistory/99FE484C5C3451F218" alt="카카오톡 채널" />
          </a>
        </div>
      `;
    }
  }
  
  customElements.define('floating-sns', FloatingSNS);
  
