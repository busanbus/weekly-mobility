// ===== 모빌리티 챗봇 JavaScript =====
class MobilityChatbot {
  constructor() {
    this.apiUrl = 'https://bubuchatbot-api.haman97.workers.dev/';
    this.isOpen = false;
    this.isLoading = false;
    
    this.initElements();
    this.bindEvents();
  }
  
  initElements() {
    this.toggleBtn = document.getElementById('chatbot-toggle');
    this.container = document.getElementById('chatbot-container');
    this.closeBtn = document.getElementById('chatbot-close');
    this.messagesArea = document.getElementById('chatbot-messages');
    this.input = document.getElementById('chatbot-input');
    this.sendBtn = document.getElementById('chatbot-send');
  }
  
  bindEvents() {
    // 챗봇 열기/닫기
    this.toggleBtn.addEventListener('click', () => this.toggleChatbot());
    this.closeBtn.addEventListener('click', () => this.closeChatbot());
    
    // 메시지 전송
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // 컨테이너 외부 클릭시 닫기
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          !this.container.contains(e.target) && 
          !this.toggleBtn.contains(e.target)) {
        this.closeChatbot();
      }
    });
  }
  
  toggleChatbot() {
    if (this.isOpen) {
      this.closeChatbot();
    } else {
      this.openChatbot();
    }
  }
  
  openChatbot() {
    this.isOpen = true;
    this.container.style.display = 'flex';
    
    // 애니메이션을 위한 지연
    setTimeout(() => {
      this.container.classList.add('active');
    }, 10);
    
    // 입력창에 포커스
    setTimeout(() => {
      this.input.focus();
    }, 300);
  }
  
  closeChatbot() {
    this.isOpen = false;
    this.container.classList.remove('active');
    
    // 애니메이션 완료 후 숨김
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 300);
  }
  
  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isLoading) return;
    
    // 사용자 메시지 추가
    this.addMessage(message, 'user');
    this.input.value = '';
    
    // 로딩 상태
    this.setLoading(true);
    this.showLoadingMessage();
    
    try {
      // API 호출
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 로딩 메시지 제거
      this.removeLoadingMessage();
      
      // 봇 응답 추가
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const botResponse = data.choices[0].message.content;
        this.addMessage(botResponse, 'bot');
      } else {
        this.addMessage('죄송합니다. 응답을 받을 수 없습니다. 다시 시도해주세요.', 'bot');
      }
      
    } catch (error) {
      console.error('Chatbot API Error:', error);
      this.removeLoadingMessage();
      this.addMessage('죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'bot');
    } finally {
      this.setLoading(false);
    }
  }
  
  addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = content.replace(/\n/g, '<br>'); // 오타 수정: /n -> /\n/
    
    messageDiv.appendChild(contentDiv);
    this.messagesArea.appendChild(messageDiv);
    
    // 스크롤을 맨 아래로
    this.scrollToBottom();
  }
  
  showLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message loading-message';
    loadingDiv.id = 'loading-message';
    
    loadingDiv.innerHTML = `
      <div class="message-content">
          <span>답변을 생성하고 있습니다</span>
          <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          </div>
      </div>
    `;
    
    this.messagesArea.appendChild(loadingDiv);
    this.scrollToBottom();
  }
  
  removeLoadingMessage() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      loadingMessage.remove();
    }
  }
  
  setLoading(loading) {
    this.isLoading = loading;
    this.sendBtn.disabled = loading;
    this.input.disabled = loading;
    
    if (loading) {
      this.sendBtn.textContent = '전송중...';
    } else {
      this.sendBtn.textContent = '전송';
    }
  }
  
  scrollToBottom() {
    setTimeout(() => {
      this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }, 100);
  }
}

// 페이지 로드 완료 후 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
  new MobilityChatbot();
});
// 불필요한 중괄호 제거