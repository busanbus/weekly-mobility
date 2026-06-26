/**
 * Press Hub 프론트엔드 컨트롤러
 * ─────────────────────────────────────────────────────────────
 * 백엔드 (FastAPI, server/main.py) 와 통신해 보도자료를 가져옵니다.
 *
 * - 같은 origin 으로 정적/HTML 이 함께 서빙되는 환경 가정 (http://localhost:8000)
 *   → CORS 문제가 자동으로 사라짐.
 * - 백엔드가 꺼져 있는 file:// 또는 다른 dev 서버 환경에서는
 *   친절한 안내 메시지를 띄움.
 *
 * 콘솔 디버그:
 *   __pressHubDebug()              → 마지막 응답 원본 출력
 *   __pressHubDebug('molit', 7)    → 최근 7일치를 강제로 다시 호출
 */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /** 백엔드 베이스 URL.
   *  FastAPI가 HTML과 API를 함께 서빙하는 경우에는 현재 origin의 상대경로를 사용한다.
   *  그래야 localhost뿐 아니라 내부망 IP(예: 192.168.x.x:8001) 접속도 그대로 동작한다.
   */
  function resolveApiBase() {
    if (location.protocol === 'file:') return 'http://localhost:8001';
    if (location.hostname.endsWith('github.io')) return 'http://localhost:8001';
    return '';
  }
  const API_BASE = resolveApiBase();

  // 상태 컨테이너
  const state = {
    sources: [],          // [{id, name, color, enabled}]
    selectedIds: new Set(),
    items: [],            // 마지막 응답의 items
    filteredItems: [],
    keyword: '',
    sort: {
      date: 'desc',
      source: null,
    },
    lastResponse: null,
    fetching: false,
  };

  // ──────────────────────────────────────────────────────────────────
  // 유틸
  // ──────────────────────────────────────────────────────────────────
  const fmtDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const escapeHtml = (s = '') =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const highlight = (text, keyword) => {
    const safe = escapeHtml(text || '');
    if (!keyword) return safe;
    const k = keyword.trim();
    if (!k) return safe;
    try {
      const re = new RegExp(`(${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
      return safe.replace(re, '<mark>$1</mark>');
    } catch {
      return safe;
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // UI 헬퍼: 상태 메시지
  // ──────────────────────────────────────────────────────────────────
  const statusEl = $('#ph-status');
  const setStatus = (kind, html) => {
    if (!kind) {
      statusEl.innerHTML = '';
      return;
    }
    const cls = `ph-${kind}`;
    statusEl.innerHTML = `<div class="${cls}">${html}</div>`;
  };

  // ──────────────────────────────────────────────────────────────────
  // 1) 출처 목록 로드 → 칩 렌더
  // ──────────────────────────────────────────────────────────────────

  function getEnabledSources() {
    return state.sources.filter((src) => src.enabled);
  }

  function buildStatusChips(stats) {
    return stats
      .map(
        (s) =>
          `<span class="ph-status-chip">${escapeHtml(s.name)} <strong>${s.count}</strong>건</span>`
      )
      .join('');
  }

  // 출처별 건수를 기본 접힘 상태로 보여주는 토글 블록
  function buildStatusBreakdown(stats) {
    const chips = buildStatusChips(stats);
    if (!chips) return '';
    return `
      <details class="ph-status-details">
        <summary class="ph-status-details__summary">
          출처별 건수 <span class="ph-status-details__state"></span>
        </summary>
        <div class="ph-status-card__breakdown">${chips}</div>
      </details>
    `;
  }

  function buildFetchSuccessMessage(data, elapsed) {
    const okStats = Object.values(data.stats || {}).filter((s) => s.ok);

    return `
      <div class="ph-status-card">
        <div class="ph-status-card__head">
          <span class="ph-status-card__icon" aria-hidden="true">✅</span>
          <div class="ph-status-card__title-wrap">
            <strong class="ph-status-card__title">총 ${data.total}건 불러오기 완료</strong>
            <span class="ph-status-card__meta">${elapsed}초 소요 · ${okStats.length}개 출처</span>
          </div>
        </div>
        ${buildStatusBreakdown(okStats)}
      </div>
    `;
  }

  function buildFetchWarningMessage(data, elapsed) {
    const partial = Object.values(data.stats || {}).filter((s) => !s.ok);
    const okStats = Object.values(data.stats || {}).filter((s) => s.ok);
    const failItems = partial
      .map(
        (s) =>
          `<div class="ph-status-fail-item"><strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.error || '알 수 없는 오류')}</div>`
      )
      .join('');

    return `
      <div class="ph-status-card">
        <div class="ph-status-card__head">
          <span class="ph-status-card__icon" aria-hidden="true">⚠️</span>
          <div class="ph-status-card__title-wrap">
            <strong class="ph-status-card__title">일부 출처 가져오기 실패</strong>
            <span class="ph-status-card__meta">${elapsed}초 소요 · 성공 ${okStats.length}개 / 실패 ${partial.length}개</span>
          </div>
        </div>
        ${buildStatusBreakdown(okStats)}
        ${failItems ? `<div class="ph-status-card__failures">${failItems}</div>` : ''}
      </div>
    `;
  }

  async function loadSources() {
    try {
      const res = await fetch(`${API_BASE}/api/sources`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.sources = await res.json();
    } catch (err) {
      console.error('[press-hub] /api/sources 호출 실패', err);
      renderBackendDownNotice(err);
      return;
    }
    renderSourceChips();
  }

  function renderSourceChips() {
    const wrap = $('#ph-sources');
    wrap.innerHTML = '';
    state.selectedIds.clear();

    const enabledSources = getEnabledSources();
    enabledSources.forEach((src) => state.selectedIds.add(src.id));

    state.sources.forEach((src) => {
      const chip = document.createElement('label');
      chip.className = 'ph-source-chip';
      if (!src.enabled) chip.dataset.disabled = 'true';

      chip.innerHTML = `
        <input type="checkbox" value="${src.id}" data-source-id="${src.id}" ${src.enabled ? 'checked' : 'disabled'}>
        <span>${escapeHtml(src.name)}</span>
        ${src.enabled ? '' : '<span style="font-size:0.72rem;opacity:0.7;">준비중</span>'}
      `;

      const cb = chip.querySelector('input');
      if (src.enabled) {
        cb.addEventListener('change', () => {
          if (cb.checked) state.selectedIds.add(src.id);
          else state.selectedIds.delete(src.id);
        });
      }
      wrap.appendChild(chip);
    });

    bindSourceTools(enabledSources);
  }

  function bindSourceTools(enabledSources) {
    const wrap = $('#ph-sources');
    const setAll = (checked) => {
      enabledSources.forEach((src) => {
        const cb = wrap.querySelector(`[data-source-id="${src.id}"]`);
        if (checked) state.selectedIds.add(src.id);
        else state.selectedIds.delete(src.id);
        if (cb) cb.checked = checked;
      });
    };
    const selectAllBtn = $('#ph-select-all');
    const deselectAllBtn = $('#ph-deselect-all');
    if (selectAllBtn) selectAllBtn.onclick = () => setAll(true);
    if (deselectAllBtn) deselectAllBtn.onclick = () => setAll(false);
  }

  function renderBackendDownNotice(err) {
    setStatus(
      'error',
      `<div>
        <strong>백엔드 연결 실패</strong> ─ ${escapeHtml(String(err?.message || err))}<br>
        <small>
          ① <code>server\\start.bat</code> 을 실행했는지<br>
          ② 브라우저 주소가 <code>http://localhost:8000/press-hub.html</code> 인지<br>
          확인해 주세요.
        </small>
      </div>`
    );
    // 출처 선택 영역 placeholder
    const wrap = $('#ph-sources');
    wrap.innerHTML =
      '<div style="padding:8px 2px;color:var(--gray-500);font-size:0.88rem;">서버를 실행한 뒤 페이지를 새로고침해 주세요.</div>';
    $('#ph-fetch-btn').disabled = true;
  }

  // ──────────────────────────────────────────────────────────────────
  // 2) 기간 컨트롤
  // ──────────────────────────────────────────────────────────────────
  function initPeriod() {
    const today = new Date();
    const last7 = new Date();
    last7.setDate(today.getDate() - 6); // 7일치 = 6일 전부터 오늘까지

    $('#ph-from').value = fmtDate(last7);
    $('#ph-to').value = fmtDate(today);

    // 빠른 기간 버튼
    $$('#ph-quick-period button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days, 10);
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - (days - 1));
        $('#ph-from').value = fmtDate(from);
        $('#ph-to').value = fmtDate(to);
        $$('#ph-quick-period button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // 직접 날짜 변경 시 active 해제
    ['#ph-from', '#ph-to'].forEach((sel) => {
      $(sel).addEventListener('change', () => {
        $$('#ph-quick-period button').forEach((b) => b.classList.remove('active'));
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 3) 데이터 가져오기
  // ──────────────────────────────────────────────────────────────────
  async function fetchAll() {
    if (state.fetching) return;
    if (state.selectedIds.size === 0) {
      setStatus('warning', '⚠️ 출처를 1개 이상 선택해 주세요.');
      return;
    }

    const from = $('#ph-from').value;
    const to = $('#ph-to').value;
    if (!from || !to) {
      setStatus('warning', '⚠️ 시작일과 종료일을 모두 선택해 주세요.');
      return;
    }
    if (from > to) {
      setStatus('warning', '⚠️ 시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }

    const sources = [...state.selectedIds].join(',');
    const url = `${API_BASE}/api/press?from=${from}&to=${to}&sources=${sources}`;

    state.fetching = true;
    const btn = $('#ph-fetch-btn');
    btn.classList.add('loading');
    btn.disabled = true;
    setStatus('loading', `<span class="spinner-inline"></span> 보도자료를 가져오는 중… <small>(${from} ~ ${to})</small>`);

    const t0 = performance.now();
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }
      state.lastResponse = data;
      state.items = data.items || [];
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

      // 결과 메타 메시지
      const partial = Object.values(data.stats || {}).filter((s) => !s.ok);

      if (partial.length > 0) {
        setStatus('warning', buildFetchWarningMessage(data, elapsed));
      } else if (state.items.length === 0) {
        setStatus('empty', `<span class="big">📭</span><span>해당 기간 보도자료가 없습니다.</span>`);
      } else {
        setStatus('success', buildFetchSuccessMessage(data, elapsed));
      }

      applyFilter();
    } catch (err) {
      console.error('[press-hub] fetch 실패', err);
      setStatus(
        'error',
        `<div>
          <strong>요청 실패</strong> ─ ${escapeHtml(String(err?.message || err))}<br>
          <small>백엔드(<code>server\\start.bat</code>)가 실행 중인지 확인해 주세요.</small>
        </div>`
      );
    } finally {
      state.fetching = false;
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 4) 필터 / 렌더 / CSV
  // ──────────────────────────────────────────────────────────────────
  function applyFilter() {
    const k = state.keyword.trim().toLowerCase();
    if (!k) {
      state.filteredItems = [...state.items];
    } else {
      // 필터 대상: 제목/분류/담당부서 (출처는 제외)
      state.filteredItems = state.items.filter((it) =>
        [it.title, it.category, it.dept].some(
          (v) => (v || '').toLowerCase().includes(k)
        )
      );
    }
    applySort();
    render();
  }

  function applySort() {
    const dateDir = state.sort.date === 'asc' ? 1 : -1;
    const sourceDir = state.sort.source === 'asc' ? 1 : state.sort.source === 'desc' ? -1 : 0;
    state.filteredItems.sort((a, b) => {
      const as = a.sourceName || a.source || '';
      const bs = b.sourceName || b.source || '';
      const ad = a.date || '';
      const bd = b.date || '';

      // 출처 정렬이 켜져 있으면 출처별로 먼저 묶고, 각 출처 안에서 작성일을 정렬한다.
      if (sourceDir !== 0) {
        const sourceCompare = as.localeCompare(bs, 'ko');
        if (sourceCompare !== 0) return sourceCompare * sourceDir;
        if (ad !== bd) return ad > bd ? dateDir : -dateDir;
        return (a.title || '').localeCompare(b.title || '', 'ko');
      }

      // 출처 정렬이 꺼져 있으면 기존처럼 전체 결과를 작성일 기준으로 정렬한다.
      if (ad !== bd) return ad > bd ? dateDir : -dateDir;
      return (a.title || '').localeCompare(b.title || '', 'ko');
    });
    updateSortIndicators();
  }

  function updateSortIndicators() {
    const dateIndicator = $('[data-sort-indicator="date"]');
    const sourceIndicator = $('[data-sort-indicator="source"]');
    if (dateIndicator) dateIndicator.textContent = state.sort.date === 'asc' ? '↑' : '↓';
    if (sourceIndicator) sourceIndicator.textContent = state.sort.source ? (state.sort.source === 'asc' ? '↑' : '↓') : '';

    const sortSelect = $('#ph-sort-select');
    if (sortSelect) {
      let value;
      if (state.sort.source === 'asc') value = 'source-asc';
      else if (state.sort.source === 'desc') value = 'source-desc';
      else value = state.sort.date === 'asc' ? 'date-asc' : 'date-desc';
      sortSelect.value = value;
    }
  }

  function render() {
    const wrap = $('#ph-table-wrap');
    const toolbar = $('#ph-table-toolbar');
    const sortMobile = $('#ph-sort-mobile');
    const tbody = $('#ph-tbody');
    const countEl = $('#ph-count');

    countEl.textContent = `총 ${state.filteredItems.length}건${
      state.keyword ? ` (전체 ${state.items.length}건 중 필터 적용)` : ''
    }`;

    if (state.filteredItems.length === 0) {
      wrap.style.display = 'none';
      if (sortMobile) sortMobile.style.display = 'none';
      toolbar.style.display = state.items.length > 0 ? '' : 'none';
      if (state.items.length > 0) {
        setStatus(
          'empty',
          `<span class="big">🔎</span><span>검색한 내용이 없습니다.</span><small>키워드를 바꾸거나 비워서 다시 검색해 주세요.</small>`
        );
      }
      return;
    }

    const sourceColorById = Object.fromEntries(
      state.sources.map((s) => [s.id, s.color || '#0066ff'])
    );

    tbody.innerHTML = state.filteredItems
      .map((it, idx) => {
        const color = sourceColorById[it.source] || '#0066ff';
        const linkAttrs = it.link
          ? `href="${escapeHtml(it.link)}" target="_blank" rel="noopener"`
          : 'href="#" onclick="return false;" style="color:var(--gray-500);cursor:default;"';

        return `
          <tr>
            <td class="ph-cell-num">${idx + 1}</td>
            <td class="ph-cell-cat">${
              it.category
                ? `<span class="ph-cat-badge">${escapeHtml(it.category)}</span>`
                : '<span style="color:var(--gray-400)">-</span>'
            }</td>
            <td class="ph-cell-title">
              <a class="ph-title-link" ${linkAttrs}>${highlight(it.title, state.keyword)}</a>
            </td>
            <td class="ph-cell-dept">${
              it.dept
                ? escapeHtml(it.dept)
                : '<span style="color:var(--gray-400)">-</span>'
            }</td>
            <td class="ph-cell-date">${escapeHtml(it.date) || '-'}</td>
            <td class="ph-cell-source">
              <span class="ph-source-badge" style="--src-color:${color}">
                <span class="dot"></span>${escapeHtml(it.sourceName || it.source)}
              </span>
            </td>
          </tr>`;
      })
      .join('');

    wrap.style.display = '';
    toolbar.style.display = '';
    if (sortMobile) sortMobile.style.display = '';
    if (statusEl.querySelector('.ph-empty')) {
      setStatus(null);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 5) 이벤트 바인딩
  // ──────────────────────────────────────────────────────────────────
  function applySearchControls() {
    state.keyword = $('#ph-filter').value;
    applyFilter();
  }

  function resetResultControls() {
    $('#ph-filter').value = '';
    state.keyword = '';
    state.sort.date = 'desc';
    state.sort.source = null;
    applyFilter();
  }

  function bindEvents() {
    $('#ph-fetch-btn').addEventListener('click', fetchAll);

    $('#ph-search-btn').addEventListener('click', applySearchControls);
    $('#ph-reset-btn').addEventListener('click', resetResultControls);

    $('#ph-filter').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applySearchControls();
      }
    });

    $$('[data-sort-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.sortKey;
        if (key === 'date') {
          state.sort.date = state.sort.date === 'asc' ? 'desc' : 'asc';
        } else if (key === 'source') {
          state.sort.source = state.sort.source === 'asc' ? 'desc' : 'asc';
        } else {
          return;
        }
        applyFilter();
      });
    });

    // 모바일 전용 정렬 드롭다운
    const sortSelect = $('#ph-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        switch (sortSelect.value) {
          case 'date-asc':
            state.sort.date = 'asc';
            state.sort.source = null;
            break;
          case 'source-asc':
            state.sort.source = 'asc';
            break;
          case 'source-desc':
            state.sort.source = 'desc';
            break;
          case 'date-desc':
          default:
            state.sort.date = 'desc';
            state.sort.source = null;
            break;
        }
        applyFilter();
      });
    }

    // Ctrl/Cmd + Enter 로 빠르게 불러오기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        fetchAll();
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 6) 콘솔 디버그
  // ──────────────────────────────────────────────────────────────────
  window.__pressHubDebug = async (sourceId, days = 7, page = 1) => {
    if (!sourceId) {
      console.log('마지막 응답:', state.lastResponse);
      console.log('마지막 items:', state.items);
      console.log('사용법: __pressHubDebug("molit") 또는 __pressHubDebug("molit", 14, 1)');
      return state.lastResponse;
    }
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (days - 1));
    const range = `from=${fmtDate(from)}&to=${fmtDate(to)}`;

    // 1) 정상 엔드포인트
    const apiUrl = `${API_BASE}/api/press?${range}&sources=${sourceId}`;
    console.log('GET', apiUrl);
    const res = await fetch(apiUrl);
    const data = await res.json().catch(() => null);
    console.log('  → 응답:', data);

    // 2) raw HTML 디버그 엔드포인트
    const dbgUrl = `${API_BASE}/api/debug/${sourceId}?${range}&page=${page}`;
    console.log('GET', dbgUrl);
    const dres = await fetch(dbgUrl);
    const ddata = await dres.json().catch(() => null);
    console.log('  → raw 응답 헤더 / 본문 일부:', ddata);
    if (ddata && ddata.html_head) {
      console.log('--- HTML head (앞부분) ---');
      console.log(ddata.html_head);
    }
    return { api: data, raw: ddata };
  };

  window.__pressHubClearCache = async () => {
    const r = await fetch(`${API_BASE}/api/cache/clear`, { method: 'POST' });
    const j = await r.json();
    console.log('캐시 클리어 결과:', j);
    return j;
  };

  // ──────────────────────────────────────────────────────────────────
  // 부팅
  // ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    initPeriod();
    bindEvents();
    await loadSources();
  });
})();
