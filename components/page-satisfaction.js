/**
 * 주간 페이지 만족도 평가 (웹 컴포넌트)
 *
 * 사용 예 (news-grid 와 mobility-footer 사이):
 * <page-satisfaction year="2026" month="3" week="2" lang="ko"></page-satisfaction>
 * <script type="module" src="../components/page-satisfaction.js"></script>
 *
 * 선택 속성:
 * - submit-url : GAS WebApp URL.
 *   - 이 속성이 없으면 기본값(하드코딩된 WebApp URL)으로 전송
 *   - 빈 문자열(`submit-url=""`)이면 제출 시 payload만 alert + console (UI 테스트용)
 * - allow-repeat : 있으면 중복 제출 방지(localStorage)를 끔 (로컬 UI 테스트용)
 */
class PageSatisfaction extends HTMLElement {
  static UI_VERSION = '2026-03-26-three-scale-emoji';
  static GLOBALLY_DISABLED = false;
  static _storageKey(year, month, week, lang) {
    const path =
      typeof location !== 'undefined'
        ? (location.pathname || '').replace(/\/+$/, '') || '/'
        : '/';
    return `weekly-mobility:ps:v1|y=${year || '_'}|m=${month || '_'}|w=${week || '_'}|l=${lang}|p=${encodeURIComponent(path)}`;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (this._rendered) return;
    this._rendered = true;

    // 운영/테스트 중 잠시 비활성화: 모든 week 페이지에서 컴포넌트 UI를 숨김
    // - 현재 브라우저만 영향을 받음
    //   예) DevTools 콘솔에서:
    //     localStorage.setItem('ps:disable', '1'); location.reload();
    // - 다시 켜기:
    //     localStorage.removeItem('ps:disable'); location.reload();
    const disabledByFlag =
      PageSatisfaction.GLOBALLY_DISABLED === true ||
      (typeof window !== 'undefined' && window.__PS_DISABLED__ === true) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('ps:disable') === '1') ||
      this.hasAttribute('disabled');
    if (disabledByFlag) {
      try {
        this.style.display = 'none';
      } catch (_) {}
      return;
    }

    this.setAttribute('data-ui-version', PageSatisfaction.UI_VERSION);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[page-satisfaction] ui version:', PageSatisfaction.UI_VERSION);
    }

    const lang = (this.getAttribute('lang') || 'ko').toLowerCase();
    const year = this.getAttribute('year') || '';
    const month = this.getAttribute('month') || '';
    const week = this.getAttribute('week') || '';
    const DEFAULT_SUBMIT_URL =
      'https://script.google.com/macros/s/AKfycbyLfSmsQ4lN17ijkUrGC4fx5IiYIDy7_JeX2Cup_MXeqhEvEe9XZ6z_wxMZykQQQ_WM/exec';
    const submitUrlAttrRaw = this.getAttribute('submit-url');
    const submitUrlAttr = (submitUrlAttrRaw || '').trim();
    const submitUrl = submitUrlAttrRaw === null ? DEFAULT_SUBMIT_URL : submitUrlAttr;
    const allowRepeat = this.hasAttribute('allow-repeat');

    const t = this._strings(lang);
    const storageKey = PageSatisfaction._storageKey(year, month, week, lang);
    let alreadyDone = false;
    if (!allowRepeat && typeof localStorage !== 'undefined') {
      try {
        alreadyDone = localStorage.getItem(storageKey) === '1';
      } catch (_) {
        /* private mode 등 */
      }
    }

    const emojiByScore = {
      3: '😊',
      2: '😐',
      1: '😕',
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Noto Sans KR', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --ps-primary: #0066ff;
          --ps-primary-dark: #0052cc;
          --ps-primary-soft: #e8f0ff;
          --ps-accent-start: #4f8cff;
          --ps-accent-end: #0052cc;
          --ps-gold-start: #fbbf24;
          --ps-gold-end: #f59e0b;
          --ps-text: #0f172a;
          --ps-muted: #64748b;
          --ps-border: #e6e9ef;
          --ps-border-strong: #d5dae2;
          --ps-bg: #ffffff;
          --ps-bg-soft: #f8fafc;
        }

        * {
          box-sizing: border-box;
        }

        .card {
          position: relative;
          margin: 28px auto 12px;
          max-width: 1280px;
          border: 1px solid var(--ps-border);
          border-radius: 18px;
          background: var(--ps-bg);
          box-shadow:
            0 1px 0 rgba(15, 23, 42, 0.03),
            0 12px 32px -18px rgba(15, 23, 42, 0.18),
            0 4px 12px -6px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .card-body {
          padding: 24px 24px 32px;
        }

        .form-panel[hidden],
        .done-panel[hidden] {
          display: none !important;
        }

        /* ========== DONE PANEL ========== */
        .done-panel {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 4px 0;
        }

        .done-panel .check-wrap {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d1fadf 0%, #a7f3d0 100%);
          border: 1px solid #86efac;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 14px -6px rgba(16, 163, 74, 0.35);
        }

        .done-panel .check {
          width: 20px;
          height: 20px;
          color: #15803d;
        }

        .done-title {
          margin: 2px 0 4px;
          font-size: 1.08rem;
          font-weight: 700;
          color: var(--ps-text);
          letter-spacing: -0.01em;
        }

        .done-desc {
          margin: 0;
          font-size: 0.94rem;
          line-height: 1.6;
          color: var(--ps-muted);
        }

        /* ========== HEAD ========== */
        .head {
          margin-bottom: 42px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          width: 100%;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          background: #f0f4ff;
          color: #0066ff;
          font-size: 12px;
          font-weight: 600;
          border-radius: 20px;
          padding: 6px 12px;
          margin-bottom: 0;
          width: fit-content;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          align-self: flex-start;
        }

        .badge-dot {
          display: none;
        }

        .question {
          margin: 0 0 12px;
          font-size: 20px;
          line-height: 1.4;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #1a1d29;
          text-align: center;
        }

        .subline {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.55;
          color: var(--ps-muted);
          max-width: 560px;
        }

        /* ========== OPTIONS (star rows) ========== */
        .options-foot {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 22px;
          margin-bottom: 0;
          padding: 0;
          width: 100%;
        }

        .options {
          display: flex;
          flex-wrap: wrap;
          gap: 72px;
          align-items: flex-start;
          justify-content: center;
          width: 100%;
        }

        .face-option {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          padding: 2px;
          background: transparent;
          border: none;
          transition: transform 0.15s ease;
        }

        .face-option:hover {
          transform: translateY(-2px);
        }

        /* visually hidden radio input (접근성 유지) */
        .face-option input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .face-emoji {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 49.68px;
          line-height: 1;
          transition: transform 0.15s ease;
          /* 이모지가 OS별로 색감이 살도록 */
          font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji',
            'Segoe UI Symbol', sans-serif;
        }

        .face-option:hover .face-emoji {
          transform: scale(1.08);
        }

        .face-option:has(input:checked) .face-emoji {
          filter: drop-shadow(0 0 6px rgba(0, 102, 255, 0.2));
        }

        .face-option input:focus-visible + .face-emoji {
          outline: 2px solid var(--ps-primary);
          outline-offset: 6px;
          border-radius: 8px;
        }

        .face-label {
          font-size: 0.92rem;
          font-weight: 500;
          color: var(--ps-muted);
          line-height: 1.3;
          transition: color 0.18s ease;
        }

        .face-option:has(input:checked) .face-label {
          color: var(--ps-text);
          font-weight: 600;
        }

        /* ========== FEEDBACK ========== */
        .feedback-block {
          width: 100%;
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          margin-top: 0;
          padding-top: 0;
          border-top: 1px dashed transparent;
          transition: max-height 0.35s ease, opacity 0.3s ease,
            margin-top 0.3s ease, padding-top 0.3s ease,
            border-color 0.3s ease;
        }

        .feedback-block.visible {
          max-height: 600px;
          opacity: 1;
          margin-top: 20px;
          padding-top: 18px;
          border-top-color: var(--ps-border);
        }

        .feedback-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
          width: 100%;
        }

        .submit-btn-feedback {
          display: none;
        }

        .feedback-block.visible .submit-btn-feedback {
          display: inline-flex;
        }

        .feedback-label {
          display: block;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--ps-text);
          margin-bottom: 8px;
        }

        .feedback-area {
          width: 100%;
          min-height: 112px;
          padding: 12px 14px;
          font-size: 1.02rem;
          line-height: 1.6;
          border: 1px solid var(--ps-border-strong);
          border-radius: 12px;
          resize: vertical;
          font-family: inherit;
          background: #fff;
          color: var(--ps-text);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .feedback-area::placeholder {
          font-size: 0.97rem;
          color: #94a3b8;
        }

        .feedback-area:hover {
          border-color: #b9c2d0;
        }

        .feedback-area:focus {
          outline: none;
          border-color: var(--ps-primary);
          box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.14);
        }

        .hint {
          font-size: 0.88rem;
          font-weight: 500;
          color: #dc2626;
          margin-top: 8px;
          display: none;
        }

        .hint.visible {
          display: block;
        }

        /* ========== SUBMIT BUTTON (news-link 스타일 기반, 크기 업) ========== */
        .submit-btn {
          background: linear-gradient(135deg, #0066ff 0%, #003dd1 100%);
          color: white;
          text-decoration: none;
          padding: 10px 26px;
          border-radius: 50px;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 48px;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
        }

        .submit-btn::after {
          content: "→";
          font-size: 18px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 102, 255, 0.3);
        }

        .submit-btn:hover:not(:disabled)::after {
          transform: translateX(4px);
        }

        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        /* ========== MOBILE ========== */
        @media (max-width: 768px) {
          .card {
            margin: 1px auto 8px;
            border-radius: 14px;
          }

          .card-body {
            padding: 20px 20px 20px;
          }

          .head {
            margin-bottom: 22px;
            text-align: center;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            width: 100%;
          }

          .question {
            font-size: 20px;
          }

          .subline {
            font-size: 0.86rem;
          }

          .options-foot {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            padding: 0;
          }

          .options {
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-around;
            gap: 12px;
          }

          .face-option {
            flex: 1 1 0;
            gap: 18px;
            flex-direction: column;
          }

          .face-emoji {
            font-size: 43.056px;
          }

          .face-label {
            font-size: 0.88rem;
          }

          .submit-btn {
            width: 100%;
            font-size: 16.5px;
            border-radius: 12px;
          }

          .feedback-area {
            border-radius: 10px;
          }
        }
      </style>

      <section class="card" aria-label="${t.ariaLabel}">
        <div class="card-body">
          <div class="done-panel" part="done-panel" ${alreadyDone ? '' : 'hidden'}>
            <div class="check-wrap" aria-hidden="true">
              <svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div>
              <p class="done-title">${t.alreadyTitle}</p>
              <p class="done-desc">${t.alreadyDesc}</p>
            </div>
          </div>

          <div class="form-panel" part="form-panel" ${alreadyDone ? 'hidden' : ''}>
            <div class="head">
              <h2 class="question">${t.question}</h2>
            </div>

            <div class="options-foot">
              <div class="options" role="radiogroup" aria-label="${t.scoreGroup}">
                ${[3, 2, 1].map((score) => `
                  <label class="face-option" data-score="${score}">
                    <input type="radio" name="ps-score" value="${score}" aria-label="${String(t.labels[score]).replace(/"/g, '&quot;')}" />
                    <span class="face-emoji" aria-hidden="true">${emojiByScore[score]}</span>
                    <span class="face-label">${t.shortLabels[score]}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="feedback-block" part="feedback-block">
              <label class="feedback-label" for="ps-feedback">${t.feedbackLabel}</label>
              <textarea id="ps-feedback" class="feedback-area" maxlength="2000" placeholder="${t.feedbackPlaceholder}" rows="4"></textarea>
              <p class="hint" part="hint">${t.feedbackRequired}</p>

              <div class="feedback-actions">
                <button type="button" class="submit-btn submit-btn-feedback" part="submit">${t.submit}</button>
              </div>
            </div>

          </div>
        </div>
      </section>
    `;

    const root = this.shadowRoot;
    const formPanel = root.querySelector('.form-panel');
    const donePanel = root.querySelector('.done-panel');
    const radios = root.querySelectorAll('input[name="ps-score"]');
    const faceOptions = root.querySelectorAll('.face-option');
    const feedbackBlock = root.querySelector('.feedback-block');
    const feedbackEl = root.querySelector('#ps-feedback');
    const hint = root.querySelector('.hint');
    const btnFeedback = root.querySelector('.submit-btn-feedback');

    const updateFloatingSnsVisibility = (isFeedbackVisible) => {
      const isMobile =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 768px)').matches;
      const shouldHide = isMobile && isFeedbackVisible;
      const snsNodes = typeof document !== 'undefined' ? document.querySelectorAll('floating-sns') : [];

      snsNodes.forEach((el) => {
        if (shouldHide) {
          if (el.dataset.psDisplayBackup === undefined) {
            el.dataset.psDisplayBackup = el.style.display || '';
          }
          el.style.display = 'none';
          return;
        }

        if (el.dataset.psDisplayBackup !== undefined) {
          el.style.display = el.dataset.psDisplayBackup;
          delete el.dataset.psDisplayBackup;
        }
      });
    };

    const updateFeedbackVisibility = () => {
      const selected = root.querySelector('input[name="ps-score"]:checked');
      const score = selected ? parseInt(selected.value, 10) : null;
      // 1점(별로에요) 선택 시에만 개선의견 폼 노출
      const low = score === 1;
      feedbackBlock.classList.toggle('visible', low);
      hint.classList.remove('visible');
      if (!low) feedbackEl.value = '';

      // 별로에요 선택 시에만 textarea 하단 제출 버튼 표시
      if (btnFeedback) btnFeedback.style.display = low ? '' : 'none';
      updateFloatingSnsVisibility(low);
    };

    radios.forEach((r) => {
      r.addEventListener('change', updateFeedbackVisibility);
    });
    faceOptions.forEach((option) => {
      option.addEventListener('click', () => {
        if (alreadyDone && !allowRepeat) return;
        const input = option.querySelector('input[name="ps-score"]');
        if (!input) return;
        input.checked = true;
        const score = parseInt(input.value, 10);
        updateFeedbackVisibility();
        if (score === 2 || score === 3) {
          submitScore(score, '');
        }
      });
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateFeedbackVisibility);
    }

    const markSubmitted = () => {
      if (allowRepeat || typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem(storageKey, '1');
      } catch (_) {}
      if (formPanel) formPanel.setAttribute('hidden', '');
      if (donePanel) donePanel.removeAttribute('hidden');
    };

    const setButtonsDisabled = (disabled) => {
      if (btnFeedback) btnFeedback.disabled = disabled;
    };

    const submitScore = async (score, feedback) => {
      const payload = {
        year: year === '' ? null : parseInt(year, 10),
        month: month === '' ? null : parseInt(month, 10),
        week: week === '' ? null : parseInt(week, 10),
        lang,
        score,
        scoreLabel: t.labelByScore[score],
        feedback: score === 1 ? feedback : '',
        pageUrl: typeof location !== 'undefined' ? location.href : '',
        user_agent: typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '',
        submittedAt: new Date().toISOString(),
      };

      if (!submitUrl) {
        console.log('[page-satisfaction] 테스트 제출 (submit-url 비어있음):', payload);
        alert(t.demoThanks + '\n\n' + JSON.stringify(payload, null, 2));
        markSubmitted();
        alreadyDone = true;
        return;
      }

      setButtonsDisabled(true);
      try {
        // GAS WebApp은 CORS 헤더를 임의로 추가하기가 어려워 로컬(127.0.0.1)에서
        // 일반 fetch(JSON, application/json)로는 preflight(OPTIONS) 단계에서 차단될 수 있음.
        // 그래서 preflight가 없는 전송 방식(sendBeacon / no-cors)을 우선 사용한다.
        const payloadText = JSON.stringify(payload);

        let sent = false;
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          try {
            const blob = new Blob([payloadText], { type: 'text/plain;charset=UTF-8' });
            sent = navigator.sendBeacon(submitUrl, blob);
          } catch (_) {
            sent = false;
          }
        }

        if (!sent) {
          // no-cors로 보내면 응답 본문/상태를 읽을 수 없지만, 전송 자체는 가능.
          await fetch(submitUrl, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: payloadText,
          });
        }

        alert(t.thanks);
        markSubmitted();
        alreadyDone = true;
        radios.forEach((r) => {
          r.checked = false;
        });
        feedbackEl.value = '';
        updateFeedbackVisibility();
      } catch (e) {
        console.error(e);
        alert(t.error + '\n' + (e.message || ''));
      } finally {
        setButtonsDisabled(false);
      }
    };

    if (btnFeedback) {
      btnFeedback.addEventListener('click', () => {
        if (alreadyDone && !allowRepeat) return;
        const selected = root.querySelector('input[name="ps-score"]:checked');
        const score = selected ? parseInt(selected.value, 10) : null;
        if (score !== 1) {
          alert(t.alertSelect);
          return;
        }
        const feedback = (feedbackEl.value || '').trim();
        if (!feedback) {
          hint.classList.add('visible');
          feedbackEl.focus();
          return;
        }
        hint.classList.remove('visible');
        submitScore(1, feedback);
      });
    }
    updateFeedbackVisibility();
  }

  _strings(lang) {
    const ko = {
      ariaLabel: '주간동향 피드백',
      badge: '만족도',
      question: '이번 주 주간동향 어떠셨나요?',
      scoreGroup: '주간동향 반응',
      shortLabels: { 3: '좋아요', 2: '보통이에요', 1: '별로에요' },
      labels: {
        3: '좋아요',
        2: '보통이에요',
        1: '별로에요',
      },
      labelByScore: {
        3: '좋아요',
        2: '보통이에요',
        1: '별로에요',
      },
      submit: '제출하기',
      feedbackLabel: '개선의견',
      feedbackPlaceholder: '어떤 점이 아쉬우셨나요? 자유롭게 알려 주세요.',
      feedbackRequired: '‘별로에요’ 선택 시 개선의견을 입력해 주세요.',
      alertSelect: '반응을 선택해 주세요.',
      demoThanks: '[UI 테스트] 아래 내용이 시트로 보내질 데이터 예시입니다.',
      thanks: '만족도 조사에 참가해주셔서 감사합니다!',
      error: '전송에 실패했습니다.',
      alreadyTitle: '이미 의견을 남기셨어요.',
      alreadyDesc: '같은 주차 페이지에서는 한 번만 의견을 남길 수 있어요.',
    };

    const en = {
      ariaLabel: 'Weekly briefing feedback',
      badge: 'Feedback',
      question: "How did you find this week's briefing?",
      scoreGroup: 'Reaction',
      shortLabels: { 3: 'Helpful', 2: 'Okay', 1: 'Not helpful' },
      labels: {
        3: 'Helpful',
        2: 'Okay',
        1: 'Not helpful',
      },
      labelByScore: {
        3: 'Helpful',
        2: 'Okay',
        1: 'Not helpful',
      },
      submit: 'Submit',
      feedbackLabel: 'Suggestions',
      feedbackPlaceholder: 'Let us know what could be better.',
      feedbackRequired: 'Please share a suggestion when selecting “Not helpful”.',
      alertSelect: 'Please choose a reaction.',
      demoThanks: '[UI test] Sample payload that would be sent to the sheet:',
      thanks: 'Thanks for your feedback!',
      error: 'Submission failed.',
      alreadyTitle: "You've already shared your reaction.",
      alreadyDesc: 'Only one response per week page is allowed in this browser.',
    };

    const cn = {
      ariaLabel: '周报反馈',
      badge: '反馈',
      question: '本期周报您觉得如何？',
      scoreGroup: '反馈',
      shortLabels: { 3: '不错', 2: '还行', 1: '一般' },
      labels: {
        3: '不错',
        2: '还行',
        1: '一般',
      },
      labelByScore: {
        3: '不错',
        2: '还行',
        1: '一般',
      },
      submit: '提交',
      feedbackLabel: '改进建议',
      feedbackPlaceholder: '哪些地方可以改进？欢迎留言。',
      feedbackRequired: '选择“一般”时请留下改进建议。',
      alertSelect: '请选择一项。',
      demoThanks: '[界面测试] 将提交到表格的示例数据：',
      thanks: '感谢您的反馈！',
      error: '提交失败。',
      alreadyTitle: '您已提交过反馈。',
      alreadyDesc: '同一周页面在本浏览器中仅可反馈一次。',
    };

    const jp = {
      ariaLabel: '週報フィードバック',
      badge: 'フィードバック',
      question: '今週のレポートはいかがでしたか？',
      scoreGroup: 'フィードバック',
      shortLabels: { 3: 'よかった', 2: 'ふつう', 1: 'いまいち' },
      labels: {
        3: 'よかった',
        2: 'ふつう',
        1: 'いまいち',
      },
      labelByScore: {
        3: 'よかった',
        2: 'ふつう',
        1: 'いまいち',
      },
      submit: '送信',
      feedbackLabel: 'ご意見',
      feedbackPlaceholder: '改善点やご感想をご記入ください。',
      feedbackRequired: '「いまいち」を選んだ場合はご意見をご記入ください。',
      alertSelect: '反応を選んでください。',
      demoThanks: '[UIテスト] シートに送るデータの例：',
      thanks: 'フィードバックをありがとうございました！',
      error: '送信に失敗しました。',
      alreadyTitle: 'すでにご回答いただきました。',
      alreadyDesc: '同じ週のページでは、このブラウザでは1回のみ回答できます。',
    };

    const map = { ko, en, cn, jp };
    return map[lang] || ko;
  }
}

// 중복 정의 방지: 일부 페이지는 로컬 스크립트 + footer 주입(CDN) 모두 로드될 수 있음
if (!customElements.get('page-satisfaction')) {
  customElements.define('page-satisfaction', PageSatisfaction);
}
