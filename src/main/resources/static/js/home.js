/* ===================== 홈 ===================== */
async function viewHome() {
  $view.innerHTML = topbar(`${me.storeName} 매장관리`, undefined, html`
      <span class="hint" style="font-weight:700; white-space:nowrap">${me.displayName}</span>
      <button class="icon-btn bell" title="알림" onclick="toggleAlertPanel()">
        <svg class="mi" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
        <span id="alertBadge" class="bell-badge" style="display:none">0</span></button>
      ${themeButtonHtml()}
      <button class="icon-btn" title="로그아웃" onclick="doLogout()">
        <svg class="mi" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
      </button>`) + html`
    <div id="alertPanel" class="sketch2 alert-panel" hidden></div>
    ${isOwner() ? html`<div id="dashCard"></div>` : ''}
    ${isOwner() ? html`<div id="dashDetail" class="sketch2 dash-detail" hidden></div>` : ''}
    <div class="home-grid">
      <div class="notice-box sketch">
        <h2>Notice</h2>
        <div id="noticeList" class="hint">불러오는 중...</div>
        ${isOwner() ? html`
        <form id="noticeForm" style="margin-top:14px">
          <textarea name="title" class="notice-input" rows="3"
                    placeholder="공지 내용을 입력하세요" required></textarea>
          <div style="display:flex; gap:8px; margin-top:8px">
            <input name="eventDate" type="date" value="${today()}" style="flex:1">
            <button class="act" style="padding:6px 18px">등록</button>
          </div>
        </form>` : ''}
      </div>
      <div class="side-btns">
        <button class="side-btn b-gray"   onclick="go('attendance')">출근</button>
        <button class="side-btn b-blue"   onclick="go('calendar')">일정</button>
        <button class="side-btn b-red"    onclick="go('reports')">일보</button>
        <button class="side-btn b-purple" onclick="go('reserve')">예약</button>
        ${isOwner() ? html`<button class="side-btn b-green" onclick="go('staff')">직원</button>` : ''}
        ${isOwner() ? html`<button class="side-btn b-gray" onclick="go('settings')">설정</button>` : ''}
      </div>
    </div>
    <p id="homeMsg" class="msg"></p>`;

  const form = document.getElementById('noticeForm');
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await postJson('/api/notices', { title: f.get('title'), eventDate: f.get('eventDate') });
      loadNotices(); e.target.reset();
      e.target.eventDate.value = today();
    } catch (err) { showMsg('homeMsg', err.message, false); }
  };
  loadNotices();
  refreshAlerts();
  if (isOwner()) loadDashboard();
}

/** 사장님 홈 대시보드 요약 */
async function loadDashboard() {
  try {
    const d = await api('/api/dashboard');
    const card = document.getElementById('dashCard');
    if (!card) return;
    card.className = 'sketch2 dash-card';
    card.innerHTML = DASH_STATS.map(s => html`
      <button class="dash-stat ${s.cls}" data-k="${s.key}" onclick="toggleDashDetail('${s.key}')">
        <span class="num">${d[s.field]}</span>
        <span class="label">${s.label}</span>
      </button>`).join('');
  } catch { /* 무시 */ }
}

/** 대시보드 항목 정의 — 숫자를 누르면 같은 key로 상세를 펼친다 */
const DASH_STATS = [
  { key: 'todayReservations', field: 'todayReservations', label: '오늘 예약', cls: 'purple', empty: '오늘 예약이 없습니다.' },
  { key: 'onDuty',            field: 'onDutyCount',       label: '근무 중',   cls: 'green',  empty: '현재 근무 중인 직원이 없습니다.' },
  { key: 'lowStock',          field: 'lowStockCount',     label: '재고 부족', cls: 'red',    empty: '부족한 품목이 없습니다.' },
  { key: 'unreadAlerts',      field: 'unreadAlerts',      label: '새 알림',   cls: 'blue',   empty: '새로운 알림이 없습니다.' }
];

let dashOpenKey = null;

/** 숫자 카드를 눌러 상세 목록을 펼치거나 접는다 */
async function toggleDashDetail(key) {
  const box = document.getElementById('dashDetail');
  if (!box) return;

  // 같은 항목을 다시 누르면 닫기
  if (dashOpenKey === key && !box.hidden) {
    box.hidden = true; dashOpenKey = null; markActiveStat(null); return;
  }
  dashOpenKey = key;
  markActiveStat(key);
  box.hidden = false;

  const meta = DASH_STATS.find(s => s.key === key);
  box.innerHTML = html`<div class="dash-detail-head">${meta.label}</div>
    <p class="hint" style="margin:8px 2px">불러오는 중...</p>`;

  try {
    const detail = await api('/api/dashboard/details');
    const rows = detail[key] ?? [];
    box.innerHTML = html`<div class="dash-detail-head">${meta.label}
        <span class="count">${rows.length}</span></div>`
      + (rows.length === 0
          ? html`<p class="hint" style="margin:8px 2px">${meta.empty}</p>`
          : html`<ul class="dash-detail-list">${rows.map(r => r.route
              ? html`<li><button class="detail-link"
                     onclick="openAlert('${r.route}', ${r.arg === null ? 'null' : `'${r.arg}'`})">
                     <span class="txt">${r.text}</span><span class="chev">›</span></button></li>`
              : html`<li>${r.text}</li>`)}</ul>`);
  } catch (e) {
    box.innerHTML = html`<p class="msg error" style="margin:6px 2px">${e.message}</p>`;
  }
}

function markActiveStat(key) {
  document.querySelectorAll('.dash-stat').forEach(b =>
    b.classList.toggle('on', b.dataset.k === key));
}
