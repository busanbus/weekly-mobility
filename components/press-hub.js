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
   *  same-origin (localhost:8000) 으로 서빙된다면 빈 문자열로 두어 상대경로 사용.
   *  file:// 또는 8000 이외 포트에서 열린 경우엔 강제로 localhost:8000 으로.
   */
  function resolveApiBase() {
    if (location.protocol === 'file:') return 'http://localhost:8000';
    if (location.port && location.port !== '8000') {
      // Live Server 등에서 열었을 때
      return `${location.protocol}//${location.hostname}:8000`;
    }
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

    state.sources.forEach((src) => {
      const chip = document.createElement('label');
      chip.className = 'ph-source-chip';
      chip.style.setProperty('--src-color', src.color || '#0066ff');
      if (!src.enabled) chip.dataset.disabled = 'true';

      chip.innerHTML = `
        <span class="dot"></span>
        <input type="checkbox" value="${src.id}" ${src.enabled ? 'checked' : 'disabled'}>
        <span>${escapeHtml(src.name)}</span>
        ${src.enabled ? '' : '<span style="font-size:0.72rem;opacity:0.7;">(준비중)</span>'}
      `;

      const cb = chip.querySelector('input');
      if (src.enabled) {
        state.selectedIds.add(src.id);
        cb.addEventListener('change', () => {
          if (cb.checked) state.selectedIds.add(src.id);
          else state.selectedIds.delete(src.id);
        });
      }
      wrap.appendChild(chip);
    });
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
    // 출처 칩이라도 placeholder 로 그려둠
    const wrap = $('#ph-sources');
    wrap.innerHTML =
      '<span style="color:var(--gray-500);font-size:0.9rem;">백엔드 연결 후 출처 목록이 표시됩니다.</span>';
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
      const okStats = Object.values(data.stats || {}).filter((s) => s.ok);
      const okSummary = okStats.map((s) => `${s.name} ${s.count}건`).join(' · ');

      if (partial.length > 0) {
        const failList = partial.map((s) => `${s.name}: ${s.error}`).join('<br>');
        setStatus(
          'warning',
          `<div>
            <strong>일부 출처 가져오기 실패</strong> (${elapsed}s)<br>
            성공: ${okSummary || '없음'}<br>
            <small>${escapeHtml(failList)}</small>
          </div>`
        );
      } else if (state.items.length === 0) {
        setStatus('empty', `<span class="big">📭</span><span>해당 기간 보도자료가 없습니다.</span>`);
      } else {
        setStatus(
          'success',
          `✅ <strong>${data.total}건</strong> 가져옴 — ${okSummary} <small>(${elapsed}s)</small>`
        );
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
      state.filteredItems = state.items;
    } else {
      // 필터 대상: 제목/분류/담당부서 (출처는 제외)
      state.filteredItems = state.items.filter((it) =>
        [it.title, it.category, it.dept].some(
          (v) => (v || '').toLowerCase().includes(k)
        )
      );
    }
    render();
  }

  function render() {
    const wrap = $('#ph-table-wrap');
    const tbody = $('#ph-tbody');
    const countEl = $('#ph-count');

    countEl.textContent = `총 ${state.filteredItems.length}건${
      state.keyword ? ` (전체 ${state.items.length}건 중 필터 적용)` : ''
    }`;

    if (state.filteredItems.length === 0) {
      wrap.style.display = 'none';
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
            <td class="ph-cell-num">${escapeHtml(it.num) || idx + 1}</td>
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
  }

  // ──────────────────────────────────────────────────────────────────
  // 5) 이벤트 바인딩
  // ──────────────────────────────────────────────────────────────────
  function bindEvents() {
    $('#ph-fetch-btn').addEventListener('click', fetchAll);

    $('#ph-filter').addEventListener('input', (e) => {
      state.keyword = e.target.value;
      applyFilter();
    });

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
