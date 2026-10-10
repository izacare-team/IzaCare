/* ===================== XSS 방지 =====================
   html`` 태그드 템플릿 — 삽입되는 ${값}을 자동으로 HTML 이스케이프한다.
   중첩된 html`` 결과, 그 배열, raw()로 감싼 값만 그대로 삽입된다.

   ⚠ 화면을 새로 만들 때도 반드시 html`` 을 쓸 것.
     그냥 `` 로 만들어 innerHTML에 넣으면 XSS가 다시 열린다.
   ⚠ 이스케이프는 HTML 문맥만 막아준다. onclick="fn('${값}')" 처럼
     속성 안의 JS 문자열에는 사용자 입력을 넣지 말 것 (&#39;로 바뀌어도
     브라우저가 다시 '로 되돌리므로 탈출이 가능하다). data-* 속성을 쓸 것. */
class SafeHtml {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
const raw = v => new SafeHtml(String(v));
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escVal(v) {
  if (v instanceof SafeHtml) return v.s;
  if (Array.isArray(v)) return v.map(escVal).join('');
  if (v === null || v === undefined || v === false) return '';
  return String(v).replace(/[&<>"']/g, c => ESC_MAP[c]);
}

function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += escVal(vals[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/* ===================== 공통 유틸 ===================== */
const $view = document.getElementById('view');
let me = null;                  // 로그인 사용자 {id, username, displayName, role}
const isOwner = () => me?.role === 'OWNER';
const fmtD = d => d ? d.replaceAll('-', '/').slice(5) : '';   // 2026-08-20 → 08/20
// toISOString()은 UTC라 한국 시간 새벽 0~9시에 날짜가 하루 밀린다 — 시차만큼 당겨서 현지 날짜를 얻는다
const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

async function api(url, opt) {
  const res = await fetch(url, opt);
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && !url.startsWith('/api/auth/')) {
    me = null; go('login');
    throw new Error(body?.error ?? '로그인이 필요합니다.');
  }
  if (!res.ok) throw new Error(body?.error ?? 'HTTP ' + res.status);
  return body;
}
const postJson = (url, data) => api(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});

function go(route, arg) { location.hash = arg !== undefined ? route + '/' + arg : route; }

/* ===================== 테마 (라이트 / 다크) ===================== */

function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  // 모바일 주소창 색도 함께 (CSS 변수는 여기서 못 읽으므로 값을 직접 지정)
  const meta = document.getElementById('themeColor');
  if (meta) meta.content = dark ? '#1c1e21' : '#ffffff';
}

function toggleTheme() {
  const dark = !isDark();
  applyTheme(dark);
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) { /* 무시 */ }
}

/** 헤더에 넣을 테마 버튼 — 라이트일 땐 달, 다크일 땐 해가 보인다 */
function themeButtonHtml() {
  return html`<button class="icon-btn" title="라이트/다크 전환" onclick="toggleTheme()">
    <svg class="mi mi-light" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-5.4-5.4c0-1.81.9-3.4 2.26-4.4A9.4 9.4 0 0 0 12 3z"/></svg>
    <svg class="mi mi-dark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-4.5a1 1 0 0 1 1 1V5a1 1 0 0 1-2 0V3.5a1 1 0 0 1 1-1zm0 16a1 1 0 0 1 1 1v1.5a1 1 0 0 1-2 0V19.5a1 1 0 0 1 1-1zM3.5 11H5a1 1 0 0 1 0 2H3.5a1 1 0 0 1 0-2zm15.5 0h1.5a1 1 0 0 1 0 2H19a1 1 0 0 1 0-2zM5.64 4.22 6.7 5.28a1 1 0 0 1-1.42 1.42L4.22 5.64a1 1 0 0 1 1.42-1.42zm12.72 12.72 1.06 1.06a1 1 0 0 1-1.42 1.42l-1.06-1.06a1 1 0 0 1 1.42-1.42zM18.36 4.22a1 1 0 0 1 1.42 1.42L18.72 6.7a1 1 0 0 1-1.42-1.42zM5.28 17.3a1 1 0 0 1 1.42 1.42l-1.06 1.06a1 1 0 0 1-1.42-1.42z"/></svg>
  </button>`;
}

function topbar(title, backTo, extraHtml = '') {
  return html`<div class="topbar">
    ${backTo !== undefined ? html`<button class="back" onclick="go('${backTo}')">←</button>` : ''}
    <h1>${title}</h1><div class="spacer"></div>${extraHtml}
  </div>`;
}

/* ===================== 라우터 ===================== */
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', async () => {
  try { me = await api('/api/auth/me'); } catch { me = null; }
  render();
});

function render() {
  closeStockSheet();   // 화면 전환 시 열려 있던 액션 시트 정리
  const [route, arg] = (location.hash.replace('#', '') || 'home').split('/');
  const authRoutes = ['login', 'signup'];
  document.getElementById('bottomNav').style.display = me ? 'flex' : 'none';

  if (!me && !authRoutes.includes(route)) { viewLogin(); return; }
  if (me && authRoutes.includes(route)) { go('home'); return; }

  document.querySelectorAll('.nav-pill').forEach(b =>
    b.classList.toggle('on', b.dataset.r === route));
  const views = {
    login: viewLogin, signup: viewSignup, staff: viewStaff,
    home: viewHome, stock: viewStock, inbound: () => viewInbound(arg), dispose: viewDispose,
    audit: viewAudit, attendance: viewAttendance, calendar: viewCalendar,
    reports: viewReports, 'report-new': viewReportNew, report: () => viewReportDetail(arg),
    reserve: viewReserve, 'course-list': viewCourseList,
    'reserve-new': viewReserveNew, 'reserve-list': viewReserveList,
    reservation: () => viewReservationDetail(arg), tables: viewTables,
    settings: viewSettings
  };
  (views[route] ?? viewHome)();
  window.scrollTo(0, 0);
}

function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'error');
}
