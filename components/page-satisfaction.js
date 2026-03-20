/**
 * 주간 페이지 만족도 평가 (웹 컴포넌트)
 *
 * 사용 예 (news-grid 와 mobility-footer 사이):
 * <page-satisfaction year="2026" month="3" week="2" lang="ko"></page-satisfaction>
 * <script type="module" src="../components/page-satisfaction.js"></script>
 *
 * 선택 속성:
 * - submit-url : GAS WebApp URL. 없으면 제출 시 payload만 alert + console (UI 테스트용)
 * - allow-repeat : 있으면 중복 제출 방지(localStorage)를 끔 (로컬 UI 테스트용)
 */
class PageSatisfaction extends HTMLElement {
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

    const lang = (this.getAttribute('lang') || 'ko').toLowerCase();
    const year = this.getAttribute('year') || '';
    const month = this.getAttribute('month') || '';
    const week = this.getAttribute('week') || '';
    const submitUrl = (this.getAttribute('submit-url') || '').trim();
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

    /** 채워진 별 filled개 + 빈 별 (5-filled)개 (점수 5~1) */
    const starsMarkup = (filled) => {
      const starPath =
        'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';
      let html = '<span class="row-stars" aria-hidden="true">';
      for (let i = 0; i < 5; i++) {
        const isOn = i < filled;
        html += isOn
          ? `<svg class="star star--filled" viewBox="0 0 24 24"><path d="${starPath}"/></svg>`
          : `<svg class="star star--empty" viewBox="0 0 24 24"><path d="${starPath}"/></svg>`;
      }
      html += '</span>';
      return html;
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Noto Sans KR', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --ps-primary: #0066ff;
          --ps-primary-dark: #0052cc;
          --ps-text: #1a1d29;
          --ps-muted: #5a6573;
          --ps-border: #e8eaed;
          --ps-bg: #ffffff;
        }

        * {
          box-sizing: border-box;
        }

        .card {
          margin: 24px auto 10px;
          max-width: 1280px;
          border: 1px solid var(--border-light, var(--ps-border));
          border-radius: var(--border-radius, 12px);
          background: var(--bg-card, var(--ps-bg));
          box-shadow: var(--shadow-lg, 0 1px 2px rgba(0, 0, 0, 0.04));
          overflow: hidden;
        }

        .card-body {
          padding: 16px 18px;
        }

        .form-panel[hidden],
        .done-panel[hidden] {
          display: none !important;
        }

        .done-panel {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .done-panel .check-wrap {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid #86efac;
          background: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .done-panel .check {
          width: 16px;
          height: 16px;
          color: #16a34a;
        }

        .done-title {
          margin: 0 0 4px;
          font-size: 1.12rem;
          font-weight: 700;
          color: var(--ps-text);
        }

        .done-desc {
          margin: 0;
          font-size: 0.96rem;
          line-height: 1.6;
          color: var(--ps-muted);
        }

        .head {
          margin-bottom: 50px;
          text-align: center;
        }

        .question {
          margin: 0;
          font-size: 1.33rem;
          line-height: 1.45;
          font-weight: 700;
          color: var(--ps-text);
        }

        .options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 16px;
          align-items: center;
          justify-content: center;
        }

        .score-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          color: var(--ps-text);
          font-size: 1.08rem;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          padding: 2px 0;
        }

        .score-row input {
          width: 18px;
          height: 18px;
          margin: 0;
          accent-color: var(--ps-primary);
          cursor: pointer;
        }

        .score-row .row-label {
          font-weight: 500;
          line-height: 1.2;
        }

        .row-stars {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          margin-left: 1px;
          line-height: 0;
        }

        .row-stars .star {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
        }

        .star--filled {
          fill: #f59e0b;
          stroke: none;
        }

        .star--empty {
          fill: none;
          stroke: #cbd5e1;
          stroke-width: 1.45;
          stroke-linejoin: round;
        }

        .feedback-block {
          width: 100%;
          display: none;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed var(--ps-border);
        }

        .options-foot {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 36px;
          margin-bottom: 0;
          padding: 0 22px;
          width: 100%;
        }

        .feedback-block.visible {
          display: block;
        }

        .feedback-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
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
          font-size: 1.01rem;
          font-weight: 600;
          color: var(--ps-text);
          margin-bottom: 8px;
        }

        .feedback-area {
          width: 100%;
          min-height: 108px;
          padding: 12px 14px;
          font-size: 1.05rem;
          line-height: 1.6;
          border: 1px solid #dbe1e8;
          border-radius: 8px;
          resize: vertical;
          font-family: inherit;
          background: #fff;
        }

        .feedback-area:focus {
          outline: none;
          border-color: var(--ps-primary);
          box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.15);
        }

        .hint {
          font-size: 0.92rem;
          font-weight: 500;
          color: #dc2626;
          margin-top: 6px;
          display: none;
        }

        .hint.visible {
          display: block;
        }

        .foot {
          display: flex;
          justify-content: flex-end;
          margin-top: 0;
          align-self: flex-end;
        }

        .submit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 10px 18px;
          font-size: 0.92rem;
          font-weight: 700;
          color: #fff;
          border: 1px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          background: var(--ps-primary);
          box-shadow: 0 3px 8px rgba(0, 102, 255, 0.2);
          transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--ps-primary-dark);
          box-shadow: 0 4px 10px rgba(0, 82, 204, 0.25);
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .submit-btn svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .card {
            margin: 20px auto 8px;
            border-radius: 10px;
          }

          .card-body {
            padding: 14px 12px;
          }

          .question {
            font-size: 1.22rem;
          }

          .head {
            margin-bottom: 12px;
            text-align: left;
          }

          .options-foot {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 0;
          }

          .options {
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-start;
            gap: 9px;
          }

          .score-row {
            width: 100%;
            font-size: 1.05rem;
          }

          .row-stars .star {
            width: 14px;
            height: 14px;
          }

          .foot {
            margin-top: 12px;
            align-self: stretch;
          }

          .submit-btn {
            width: 100%;
            min-height: 42px;
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
                ${[5, 4, 3, 2, 1].map((score) => `
                  <label class="score-row" data-score="${score}">
                    <input type="radio" name="ps-score" value="${score}" aria-label="${String(t.labels[score]).replace(/"/g, '&quot;')}" />
                    <span class="row-label">${t.shortLabels[score]}</span>
                    ${starsMarkup(score)}
                  </label>
                `).join('')}
              </div>

              <div class="foot">
                <button type="button" class="submit-btn submit-btn-main" part="submit">
                  ${t.submit}
                </button>
              </div>
            </div>

            <div class="feedback-block" part="feedback-block">
              <label class="feedback-label" for="ps-feedback">${t.feedbackLabel}</label>
              <textarea id="ps-feedback" class="feedback-area" maxlength="2000" placeholder="${t.feedbackPlaceholder}" rows="4"></textarea>
              <p class="hint" part="hint">${t.feedbackRequired}</p>

              <div class="feedback-actions">
                <button type="button" class="submit-btn submit-btn-feedback" part="submit">
                  ${t.submit}
                </button>
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
    const feedbackBlock = root.querySelector('.feedback-block');
    const feedbackEl = root.querySelector('#ps-feedback');
    const hint = root.querySelector('.hint');
    const btnMain = root.querySelector('.submit-btn-main');
    const btnFeedback = root.querySelector('.submit-btn-feedback');

    const updateFeedbackVisibility = () => {
      const selected = root.querySelector('input[name="ps-score"]:checked');
      const score = selected ? parseInt(selected.value, 10) : null;
      const low = score === 1 || score === 2;
      feedbackBlock.classList.toggle('visible', low);
      hint.classList.remove('visible');
      if (!low) feedbackEl.value = '';

      // 1·2점이면 제출 버튼을 textarea 하단에 표시
      if (btnMain) btnMain.style.display = low ? 'none' : '';
      if (btnFeedback) btnFeedback.style.display = low ? '' : 'none';
    };

    radios.forEach((r) => {
      r.addEventListener('change', updateFeedbackVisibility);
    });

    const markSubmitted = () => {
      if (allowRepeat || typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem(storageKey, '1');
      } catch (_) {}
      if (formPanel) formPanel.setAttribute('hidden', '');
      if (donePanel) donePanel.removeAttribute('hidden');
    };

    const setButtonsDisabled = (disabled) => {
      if (btnMain) btnMain.disabled = disabled;
      if (btnFeedback) btnFeedback.disabled = disabled;
    };

    const submitHandler = async () => {
      if (alreadyDone && !allowRepeat) return;

      const selected = root.querySelector('input[name="ps-score"]:checked');
      if (!selected) {
        alert(t.alertSelect);
        return;
      }
      const score = parseInt(selected.value, 10);
      const feedback = (feedbackEl.value || '').trim();
      if ((score === 1 || score === 2) && !feedback) {
        hint.classList.add('visible');
        feedbackEl.focus();
        return;
      }
      hint.classList.remove('visible');

      const payload = {
        year: year === '' ? null : parseInt(year, 10),
        month: month === '' ? null : parseInt(month, 10),
        week: week === '' ? null : parseInt(week, 10),
        lang,
        score,
        scoreLabel: t.labelByScore[score],
        feedback: score === 1 || score === 2 ? feedback : '',
        pageUrl: typeof location !== 'undefined' ? location.href : '',
        submittedAt: new Date().toISOString(),
      };

      if (!submitUrl) {
        console.log('[page-satisfaction] 테스트 제출 (submit-url 미설정):', payload);
        alert(t.demoThanks + '\n\n' + JSON.stringify(payload, null, 2));
        markSubmitted();
        alreadyDone = true;
        return;
      }

      setButtonsDisabled(true);
      try {
        const res = await fetch(submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json;charset=UTF-8' },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {}
        if (!res.ok || (json && json.success === false)) {
          throw new Error((json && json.error) || text || res.statusText);
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

    if (btnMain) btnMain.addEventListener('click', submitHandler);
    if (btnFeedback) btnFeedback.addEventListener('click', submitHandler);
  }

  _strings(lang) {
    const ko = {
      ariaLabel: '페이지 만족도 평가',
      badge: '만족도',
      subline: '점수를 선택한 뒤 평가하기를 눌러 주세요. 소중한 의견은 서비스 개선에 활용됩니다.',
      question: '이 페이지에서 제공하는 정보를 평가해주세요!',
      scoreGroup: '만족도 점수',
      shortLabels: { 5: '매우만족', 4: '만족', 3: '보통', 2: '불만족', 1: '매우불만족' },
      labels: {
        5: '매우만족(5점)',
        4: '만족(4점)',
        3: '보통(3점)',
        2: '불만족(2점)',
        1: '매우불만족(1점)',
      },
      labelByScore: {
        5: '매우만족',
        4: '만족',
        3: '보통',
        2: '불만족',
        1: '매우불만족',
      },
      submit: '제출하기',
      feedbackLabel: '개선의견',
      feedbackPlaceholder: '불편하셨던 점이나 개선 아이디어를 적어 주세요.',
      feedbackRequired: '불만족·매우불만족 선택 시 개선의견을 입력해 주세요.',
      alertSelect: '만족도를 선택해 주세요.',
      demoThanks: '[UI 테스트] 아래 내용이 시트로 보내질 데이터 예시입니다.',
      thanks: '평가가 접수되었습니다. 소중한 의견 감사합니다.',
      error: '전송에 실패했습니다.',
      alreadyTitle: '이미 평가를 제출하셨습니다.',
      alreadyDesc: '같은 주차 페이지에서는 한 번만 평가할 수 있습니다. 다른 기기나 브라우저에서는 다시 보일 수 있습니다.',
    };

    const en = {
      ariaLabel: 'Page satisfaction survey',
      badge: 'Feedback',
      subline: 'Select a score, then tap Submit. Your input helps us improve.',
      question: 'Are you satisfied with the content and usability of this page?',
      scoreGroup: 'Satisfaction score',
      shortLabels: { 5: 'Very satisfied', 4: 'Satisfied', 3: 'Neutral', 2: 'Dissatisfied', 1: 'Very dissatisfied' },
      labels: {
        5: 'Very satisfied (5)',
        4: 'Satisfied (4)',
        3: 'Neutral (3)',
        2: 'Dissatisfied (2)',
        1: 'Very dissatisfied (1)',
      },
      labelByScore: {
        5: 'Very satisfied',
        4: 'Satisfied',
        3: 'Neutral',
        2: 'Dissatisfied',
        1: 'Very dissatisfied',
      },
      submit: 'Submit',
      feedbackLabel: 'Suggestions',
      feedbackPlaceholder: 'Please share what we can improve.',
      feedbackRequired: 'Please enter feedback when selecting dissatisfied or very dissatisfied.',
      alertSelect: 'Please select a rating.',
      demoThanks: '[UI test] Sample payload that would be sent to the sheet:',
      thanks: 'Thank you for your feedback.',
      error: 'Submission failed.',
      alreadyTitle: 'You have already submitted feedback.',
      alreadyDesc: 'Only one response per week page is allowed in this browser.',
    };

    const cn = {
      ariaLabel: '页面满意度评价',
      badge: '满意度',
      subline: '请选择分数后点击提交。您的意见将用于改进服务。',
      question: '您对当前页面的内容和使用便利性满意吗？',
      scoreGroup: '满意度',
      shortLabels: { 5: '非常满意', 4: '满意', 3: '一般', 2: '不满意', 1: '非常不满意' },
      labels: {
        5: '非常满意(5分)',
        4: '满意(4分)',
        3: '一般(3分)',
        2: '不满意(2分)',
        1: '非常不满意(1分)',
      },
      labelByScore: { 5: '非常满意', 4: '满意', 3: '一般', 2: '不满意', 1: '非常不满意' },
      submit: '提交评价',
      feedbackLabel: '改进意见',
      feedbackPlaceholder: '请填写您的不便或改进建议。',
      feedbackRequired: '选择不满意或非常不满意时，请填写改进意见。',
      alertSelect: '请选择满意度。',
      demoThanks: '[界面测试] 将提交到表格的示例数据：',
      thanks: '感谢您的评价。',
      error: '提交失败。',
      alreadyTitle: '您已提交过评价。',
      alreadyDesc: '同一周页面在本浏览器中仅可评价一次。',
    };

    const jp = {
      ariaLabel: 'ページ満足度アンケート',
      badge: '満足度',
      subline: '点数を選んでから「評価する」を押してください。ご意見は改善に役立てます。',
      question: '現在ご覧のページの内容や使いやすさに満足していますか？',
      scoreGroup: '満足度',
      shortLabels: { 5: '大変満足', 4: '満足', 3: '普通', 2: '不満', 1: '大変不満' },
      labels: {
        5: '大変満足(5点)',
        4: '満足(4点)',
        3: '普通(3点)',
        2: '不満(2点)',
        1: '大変不満(1点)',
      },
      labelByScore: { 5: '大変満足', 4: '満足', 3: '普通', 2: '不満', 1: '大変不満' },
      submit: '評価する',
      feedbackLabel: '改善のご意見',
      feedbackPlaceholder: 'ご不便な点や改善案をご記入ください。',
      feedbackRequired: '不満・大変不満を選んだ場合は、ご意見の入力が必要です。',
      alertSelect: '満足度を選択してください。',
      demoThanks: '[UIテスト] シートに送るデータの例：',
      thanks: 'ご回答ありがとうございました。',
      error: '送信に失敗しました。',
      alreadyTitle: 'すでに回答済みです。',
      alreadyDesc: '同じ週のページでは、このブラウザでは1回のみ回答できます。',
    };

    const map = { ko, en, cn, jp };
    return map[lang] || ko;
  }
}

customElements.define('page-satisfaction', PageSatisfaction);
