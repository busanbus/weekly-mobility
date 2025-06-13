class FloatingChatbot extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .floating-chatbot {
          position: fixed;
          right: 32px;
          bottom: 60px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .chatbot-btn {
          display: flex;
          align-items: center;
          background: #fff;
          border-radius: 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.13);
          border: none;
          padding: 10px 20px 10px 14px;
          font-size: 16px;
          font-weight: 600;
          color: #0066FF;
          cursor: pointer;
          transition: box-shadow 0.2s, background 0.2s;
          gap: 10px;
          position: relative;
        }
        .chatbot-btn:hover {
          background: #f0f6ff;
          box-shadow: 0 8px 32px rgba(0,102,255,0.13);
        }
        .chatbot-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chatbot-popup {
          display: flex;
          flex-direction: column;
          position: absolute;
          right: 0;
          bottom: 60px;
          width: 400px;
          height: 520px;
          max-width: 98vw;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          border: 1px solid #e8eaed;
          z-index: 10001;
          overflow: hidden;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateY(30px) scale(0.98);
          transition: opacity 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.4,0,0.2,1), visibility 0.28s;
        }
        .chatbot-popup.active {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateY(0) scale(1);
        }
        .chatbot-popup-header {
          background: linear-gradient(135deg, #0066FF 0%, #003DD1 100%);
          color: #fff;
          padding: 8px 15px;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top-left-radius: 18px;
          border-top-right-radius: 18px;
          user-select: none;
        }
        .chatbot-header-icon {
          margin-right: 8px;
          display: flex;
          align-items: center;
        }
        .chatbot-popup-close {
          background: none;
          border: none;
          color: #fff;
          font-size: 30px;
          cursor: pointer;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.18s;
        }
        .chatbot-popup-close:hover {
          background: rgba(255,255,255,0.18);
        }
        .chatbot-popup-body {
          padding: 18px 20px 12px 20px;
          font-size: 15px;
          color: #222;
          flex: 1;
          overflow-y: auto;
          background: #f9fafb;
        }
        .chatbot-message {
          display: flex;
          margin-bottom: 10px;
        }
        .chatbot-message.bot {
          justify-content: flex-start;
        }
        .chatbot-message.user {
          justify-content: flex-end;
        }
        .chatbot-message-bubble {
          background: #fff;
          border-radius: 16px;
          padding: 12px 16px;
          border: 1px solid #e0e4ea;
          font-size: 15px;
          color: #222;
          max-width: 80%;
          word-break: break-word;
        }
        .chatbot-message.user .chatbot-message-bubble {
          background: #0066FF;
          color: #fff;
        }
        .chatbot-popup-input {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-top: 1px solid #e8eaed;
          background: #fff;
          gap: 12px;
        }
        .chatbot-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e0e4ea;
          border-radius: 24px;
          font-size: 14px;
          outline: none;
          background: #f9fafb;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .chatbot-input:focus {
          border-color: #0066FF;
          box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
        }
        .chatbot-send-btn {
          background: linear-gradient(135deg, #0066FF 0%, #003DD1 100%);
          color: #fff;
          border: none;
          padding: 12px 20px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
          min-width: 60px;
        }
        .chatbot-send-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3);
          background: linear-gradient(135deg, #003DD1 0%, #0050c8 100%);
        }
        .chatbot-send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .chatbot-unread-badge {
          position: absolute;
          top: -12px;
          left: 0;
          width: 22px;
          height: 22px;
          background: #FF3B30;
          color: #fff;
          border-radius: 50%;
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
          z-index: 2;
          padding: 0;
          pointer-events: none;
          border: 2px solid #fff;
        }
        .chatbot-label-pc { display: inline; }
        .chatbot-label-mobile { display: none; }
        @media (max-width: 600px) {
          .floating-chatbot {
            right: 12px;
            left: auto;
            bottom: 24px;
          }
          .chatbot-popup {
            position: fixed;
            left: 0 !important;
            right: 0;
            bottom: 10vh;
            width: 100vw;
            max-width: 100vw;
            height: 60vh;
            max-height: 60vh;
            border-radius: 18px 18px 0 0;
            display: flex;
            flex-direction: column;
          }
          .chatbot-popup-body {
            flex: 1 1 auto;
            min-height: 0;
            max-height: none;
          }
          .chatbot-popup-input {
            flex-shrink: 0;
          }
          .chatbot-unread-badge {
            left: auto;
            right: 0;
          }
          .chatbot-label-pc { display: none; }
          .chatbot-label-mobile { display: inline; }
        }
        .chatbot-popup-scroll-btn {
          position: absolute;
          left: 50%;
          bottom: 70px;
          transform: translateX(-50%);
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          border: 1.5px solid #e0e4ea;
          transition: background 0.15s;
        }
        .chatbot-popup-scroll-btn:hover {
          background: #f0f6ff;
        }
        @media (max-width: 600px) {
          .chatbot-popup-scroll-btn {
            bottom: 90px;
            width: 44px;
            height: 44px;
          }
        }
      </style>
      <div class="floating-chatbot">
        <button class="chatbot-btn" id="chatbot-float-btn">
          <span class="chatbot-icon">
            <img src="https://img.icons8.com/fluency/48/000000/chatbot.png" alt="챗봇" style="width:28px;height:28px;display:block;" />
          </span>
          <span class="chatbot-label-pc">위모(WeMo) 챗봇</span>
          <span class="chatbot-label-mobile">위모(WeMo)</span>
        </button>
        <span class="chatbot-unread-badge" id="chatbot-unread-badge">1</span>
        <div class="chatbot-popup" id="chatbot-popup">
          <div class="chatbot-popup-header">
            <span class="chatbot-header-icon">
              <img src="https://api.iconify.design/material-symbols/directions-bus.svg?color=%23fff" alt="버스" style="width:20px;height:20px;display:block;" />
            </span>
            <span>모빌리티 트렌드 위모(WeMo) 챗봇</span>
            <button class="chatbot-popup-close" id="chatbot-popup-close">×</button>
          </div>
          <div class="chatbot-popup-body">
            <div class="chatbot-messages-area"></div>
          </div>
          <div class="chatbot-popup-input">
            <input type="text" class="chatbot-input" id="chatbot-input" placeholder="모빌리티 관련 질문을 입력하세요..." autocomplete="off" />
            <button class="chatbot-send-btn" id="chatbot-send">전송</button>
          </div>
          <div class="chatbot-popup-scroll-btn" id="chatbot-scroll-btn" title="최신 메시지로 이동">
            <svg width="28" height="28" viewBox="0 0 24 24"><path fill="#0066FF" d="M12 16.5l-6-6 1.41-1.41L12 13.67l4.59-4.58L18 10.5z"/></svg>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      const btn = shadow.getElementById('chatbot-float-btn');
      const popup = shadow.getElementById('chatbot-popup');
      const closeBtn = shadow.getElementById('chatbot-popup-close');
      const input = shadow.getElementById('chatbot-input');
      const sendBtn = shadow.getElementById('chatbot-send');
      const messagesArea = shadow.querySelector('.chatbot-messages-area');
      const header = shadow.querySelector('.chatbot-popup-header');

      // 드래그 관련 변수
      let isDragging = false;
      let offsetX, offsetY;

      // 헤더에 mousedown 이벤트 추가
      header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - popup.getBoundingClientRect().left;
        offsetY = e.clientY - popup.getBoundingClientRect().top;
      });

      // mousemove 이벤트 추가
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const left = e.clientX - offsetX;
        const top = e.clientY - offsetY;
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
      });

      // mouseup 이벤트 추가
      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // 대화 내역 저장/복원 함수
      const STORAGE_KEY = 'wemo-chat-history';
      const INITIAL_MESSAGE_VIEWED_KEY = 'wemo-initial-message-viewed';

      function saveHistory(history) {
        // 최근 100개 메시지만 저장
        const MAX_HISTORY = 100;
        let trimmed = history;
        if (history.length > MAX_HISTORY) {
          trimmed = history.slice(history.length - MAX_HISTORY);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      }
      function loadHistory() {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch { return []; }
      }
      function updateUnreadBadge() {
        // 이 함수는 뱃지를 동적으로 업데이트할 필요가 없으므로 비워둡니다.
      }
      function renderHistory() {
        if (!messagesArea) return;
        messagesArea.innerHTML = '';
        const history = loadHistory();
        history.forEach(msg => {
          const div = document.createElement('div');
          div.className = 'chatbot-message ' + (msg.role === 'user' ? 'user' : 'bot');
          const bubble = document.createElement('div');
          bubble.className = 'chatbot-message-bubble';
          bubble.innerHTML = msg.text;
          div.appendChild(bubble);
          messagesArea.appendChild(div);
        });
        // 항상 최신 메시지가 보이도록 스크롤 내리기 (실제 스크롤 영역은 popupBody)
        const popupBody = shadow.querySelector('.chatbot-popup-body');
        if (popupBody) setTimeout(() => {
          popupBody.scrollTo({ top: popupBody.scrollHeight, behavior: 'smooth' });
        }, 10);
      }

      // 페이지 로드 시 뱃지 표시 로직
      const initialBadgeElement = shadow.getElementById('chatbot-unread-badge');
      
      if (initialBadgeElement) {
        if (localStorage.getItem(INITIAL_MESSAGE_VIEWED_KEY) !== 'true') {
          initialBadgeElement.style.display = 'flex';
        } else {
          initialBadgeElement.style.display = 'none';
        }
      }

      // 대화 기록이 비어있을 때만 기본 메시지를 추가합니다.
      if (loadHistory().length === 0) {
        saveHistory([
          { role: 'bot', text: '🚌 안녕하세요! 저는 모빌리티 정보를 제공하는 위모(WeMo) 챗봇입니다.<br>무엇이든 물어보세요!' }
        ]);
      }

      // 메시지 전송 핸들러
      async function sendMessage() {
        const value = input.value.trim();
        if (!value) return;
        const history = loadHistory();
        history.push({ role: 'user', text: value });
        saveHistory(history);
        renderHistory();
        input.value = '';
        // 로딩 메시지 추가
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chatbot-message bot';
        const bubble = document.createElement('div');
        bubble.className = 'chatbot-message-bubble';
        bubble.innerHTML = '답변을 생성하고 있습니다...';
        loadingDiv.appendChild(bubble);
        messagesArea.appendChild(loadingDiv);
        setTimeout(() => { messagesArea.scrollTop = messagesArea.scrollHeight; }, 10);
        try {
          const response = await fetch('https://bubuchatbot-api.haman97.workers.dev/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: value })
          });
          if (!response.ok) throw new Error('API 오류');
          const data = await response.json();
          // 로딩 메시지 제거
          loadingDiv.remove();
          let botResponse = '죄송합니다. 응답을 받을 수 없습니다. 다시 시도해주세요.';
          if (data.choices && data.choices[0] && data.choices[0].message) {
            botResponse = data.choices[0].message.content.replace(/\n/g, '<br>');
          }
          history.push({ role: 'bot', text: botResponse });
          saveHistory(history);
          renderHistory();
          setTimeout(() => { messagesArea.scrollTop = messagesArea.scrollHeight; }, 10);
        } catch (e) {
          loadingDiv.remove();
          history.push({ role: 'bot', text: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
          saveHistory(history);
          renderHistory();
        }
      }
      if (sendBtn && input) {
        sendBtn.onclick = sendMessage;
        input.onkeydown = e => { if (e.key === 'Enter') sendMessage(); };
      }
      if (btn && popup && closeBtn) {
        btn.addEventListener('click', () => {
          window.dispatchEvent(new Event('close-floating-sns'));
          popup.classList.toggle('active');

          // 챗봇 버튼 클릭 시 뱃지 제거 및 기본 메시지 확인 상태 저장
          if (initialBadgeElement) {
            initialBadgeElement.style.display = 'none';
          }
          localStorage.setItem(INITIAL_MESSAGE_VIEWED_KEY, 'true');

          if (popup.classList.contains('active')) {
            renderHistory();
            setTimeout(() => { messagesArea.scrollTop = messagesArea.scrollHeight; }, 10);
          }
        });
        closeBtn.addEventListener('click', () => {
          popup.classList.remove('active');
        });
      }

      // 최신 메시지로 이동 버튼 동작
      const scrollBtn = shadow.getElementById('chatbot-scroll-btn');
      const popupBody = shadow.querySelector('.chatbot-popup-body');
      if (scrollBtn && popupBody) {
        scrollBtn.onclick = () => {
          setTimeout(() => {
            popupBody.scrollTo({ top: popupBody.scrollHeight, behavior: 'smooth' });
          }, 10);
        };
      }
    }, 0);
  }
}
customElements.define('floating-chatbot', FloatingChatbot); 