/* ===================== 일정 (달력) ===================== */
let calY, calM;   // 표시 중인 연/월
async function viewCalendar(keepMonth) {
  if (!keepMonth) { const d = new Date(); calY = d.getFullYear(); calM = d.getMonth() + 1; }
  $view.innerHTML = topbar('일정', 'home',
    isOwner() ? html`<button class="act" style="padding:5px 12px; font-size:0.9rem"
                         onclick="toggleScheduleForm()">근무 등록</button>` : '') + html`
    <div id="schedForm" hidden class="sketch2" style="padding:14px; margin-bottom:14px"></div>
    <div class="cal-head">
      <button onclick="moveMonth(-1)">◀</button>
      <h2>${calY}년 ${String(calM).padStart(2, '0')}월</h2>
      <button onclick="moveMonth(1)">▶</button>
    </div>
    <div class="cal-grid sketch2" style="padding:10px" id="calGrid"></div>
    <div class="day-events" id="dayEvents"></div>`;

  const [notices, reservations, schedules] = await Promise.all([
    api('/api/notices'),
    api(`/api/reservations/month?year=${calY}&month=${calM}`),
    api(`/api/schedules/month?year=${calY}&month=${calM}`)
  ]);
  const events = {};
  const types = {};
  const addEv = (date, text, type) => {
    (events[date] ??= []).push(text);
    (types[date] ??= new Set()).add(type);
  };
  notices.filter(n => n.eventDate?.startsWith(`${calY}-${String(calM).padStart(2, '0')}`))
         .forEach(n => addEv(n.eventDate, `📢 ${n.title}`, 'notice'));
  reservations.forEach(r => addEv(r.reserveDate,
      `📅 예약 ${r.timeSlot} ${r.people}명 (테이블 ${r.tableNumbers.join(', ')})`, 'resv'));
  schedules.forEach(s => addEv(s.workDate,
      `🕒 ${s.memberName} 근무 ${s.startTime ? s.startTime.slice(0, 5) : ''}`
      + `${s.endTime ? '~' + s.endTime.slice(0, 5) : ''}`, 'sched'));

  const grid = document.getElementById('calGrid');
  grid.innerHTML = ['일','월','화','수','목','금','토'].map((d, i) =>
    html`<span class="dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}"
           style="color:${i === 0 ? 'var(--red)' : i === 6 ? 'var(--blue)' : 'inherit'}">${d}</span>`).join('');

  const first = new Date(calY, calM - 1, 1).getDay();
  const days = new Date(calY, calM, 0).getDate();
  for (let i = 0; i < first; i++) grid.innerHTML += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const dateStr = `${calY}-${String(calM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = (first + d - 1) % 7;
    // 날짜 숫자를 <span>으로 감싸야 정확한 원이 그려진다 (칸은 가로가 더 넓음)
    grid.innerHTML += html`<button class="cal-cell ${dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''}`
      + html`${dateStr === today() ? ' today' : ''}" onclick="showDay('${dateStr}', this)">`
      + html`<span class="d">${d}</span>`
      + html`${calDots(types[dateStr])}</button>`;
  }
  window._calEvents = events;
}

/** 날짜별 점 — 공지=빨강, 근무=보라, 예약=노랑. 여러 종류면 나란히 표시. */
function calDots(set) {
  if (!set || set.size === 0) return '';
  const dots = ['notice', 'sched', 'resv'].filter(t => set.has(t))
      .map(c => `<span class="dot ${c}"></span>`).join('');
  return new SafeHtml(`<span class="cal-dots">${dots}</span>`);
}
function moveMonth(d) {
  calM += d;
  if (calM === 0) { calM = 12; calY--; }
  if (calM === 13) { calM = 1; calY++; }
  viewCalendar(true);
}

/* 근무 스케줄 등록 (사장님 전용) — 등록하면 해당 직원에게 알림이 간다 */
async function toggleScheduleForm() {
  const box = document.getElementById('schedForm');
  if (!box.hidden) { box.hidden = true; return; }
  schedDates = [];
  { const n = new Date(); schedCalY = n.getFullYear(); schedCalM = n.getMonth() + 1; }
  const members = (await api('/api/admin/members'))
    .filter(m => m.status === 'ACTIVE');
  box.innerHTML = html`
    <h3 style="margin:0 0 10px">근무 스케줄 등록</h3>
    <label class="field"><span>직원</span>
      <select id="sc-member">${members.map(m =>
        html`<option value="${m.id}">${m.displayName}</option>`)}</select></label>
    <label class="field" style="margin-bottom:6px"><span>근무일 — 달력에서 드래그로 여러 날, 개별 탭으로 추가/해제</span></label>
    <div class="sc-cal-wrap sketch2" style="padding:10px; margin-bottom:10px">
      <div class="sc-cal-head">
        <button type="button" onclick="schedCalMove(-1)">◀</button>
        <b id="sc-cal-title"></b>
        <button type="button" onclick="schedCalMove(1)">▶</button>
      </div>
      <div id="sc-cal" class="sc-cal-grid"></div>
    </div>
    <div id="sc-dateChips" style="display:flex; flex-wrap:wrap; gap:6px; margin:0 0 14px"></div>
    <div style="display:flex; gap:8px">
      <label class="field" style="flex:1"><span>시작</span>
        <input id="sc-start" type="time" value="18:00"></label>
      <label class="field" style="flex:1"><span>종료</span>
        <input id="sc-end" type="time" value="22:00"></label>
    </div>
    <label class="field"><span>메모</span><input id="sc-memo" placeholder="예: 홀 담당"></label>
    <div style="text-align:center">
      <button class="act" onclick="submitSchedule()">등록 + 알림 발송</button></div>
    <p id="scMsg" class="msg" style="text-align:center"></p>`;
  box.hidden = false;
  renderSchedCal();
  bindSchedCal();
}
let schedDates = [];
let schedCalY, schedCalM;
let _scDrag = null;   // 드래그 중 상태: {anchor, current, base(Set), mode}

function schedCalMove(d) {
  schedCalM += d;
  if (schedCalM === 0)  { schedCalM = 12; schedCalY--; }
  if (schedCalM === 13) { schedCalM = 1;  schedCalY++; }
  renderSchedCal();
}
function isoOf(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
/** 폼 안 미니달력 그리기 — 선택된 날은 파랗게, 오늘은 테두리로 */
function renderSchedCal() {
  const grid = document.getElementById('sc-cal');
  if (!grid) return;
  document.getElementById('sc-cal-title').textContent =
    `${schedCalY}년 ${String(schedCalM).padStart(2, '0')}월`;
  const dows = ['일', '월', '화', '수', '목', '금', '토'];
  let h = dows.map(w => html`<div class="sc-cal-dow">${w}</div>`).join('');
  const first = new Date(schedCalY, schedCalM - 1, 1).getDay();
  const days = new Date(schedCalY, schedCalM, 0).getDate();
  for (let i = 0; i < first; i++) h += html`<div class="sc-cal-day blank"></div>`;
  for (let d = 1; d <= days; d++) {
    const iso = isoOf(schedCalY, schedCalM, d);
    const dow = (first + d - 1) % 7;
    const cls = ['sc-cal-day', dow === 0 ? 'sun' : dow === 6 ? 'sat' : '',
                 schedDates.includes(iso) ? 'sel' : '', iso === today() ? 'today' : '']
                .filter(Boolean).join(' ');
    h += html`<div class="${cls}" data-date="${iso}">${d}</div>`;
  }
  grid.innerHTML = h;
  updateSchedSummary();
}
function rangeDates(a, b) {
  let s = new Date(a), e = new Date(b);
  if (s > e) { const t = s; s = e; e = t; }
  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(isoOf(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  }
  return out;
}
/** 드래그 중 미리보기: 기준 선택(base)에 앵커~현재 범위를 add/remove로 적용 */
function scDragSet() {
  if (!_scDrag) return new Set(schedDates);
  const set = new Set(_scDrag.base);
  for (const iso of rangeDates(_scDrag.anchor, _scDrag.current)) {
    if (_scDrag.mode === 'add') set.add(iso); else set.delete(iso);
  }
  return set;
}
function paintSchedCal(set) {
  document.querySelectorAll('#sc-cal .sc-cal-day[data-date]').forEach(c => {
    c.classList.toggle('sel', set.has(c.dataset.date));
  });
}
function scCellAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest('.sc-cal-day[data-date]');
}
/** 드래그 + 개별 탭 — 터치/마우스 모두 지원 (스크롤 방지는 touch-action:none) */
function bindSchedCal() {
  const grid = document.getElementById('sc-cal');
  if (!grid || grid._bound) return;
  grid._bound = true;
  grid.addEventListener('pointerdown', e => {
    const cell = e.target.closest('.sc-cal-day[data-date]');
    if (!cell) return;
    e.preventDefault();
    const iso = cell.dataset.date;
    _scDrag = { anchor: iso, current: iso, base: new Set(schedDates),
                mode: schedDates.includes(iso) ? 'remove' : 'add' };
    try { grid.setPointerCapture(e.pointerId); } catch (_) {}
    paintSchedCal(scDragSet());
  });
  grid.addEventListener('pointermove', e => {
    if (!_scDrag) return;
    const cell = scCellAt(e.clientX, e.clientY);
    if (!cell) return;
    _scDrag.current = cell.dataset.date;
    paintSchedCal(scDragSet());
  });
  const end = () => {
    if (!_scDrag) return;
    schedDates = [...scDragSet()].sort();
    _scDrag = null;
    updateSchedSummary();
  };
  grid.addEventListener('pointerup', end);
  grid.addEventListener('pointercancel', end);
}
function removeSchedDate(d) { schedDates = schedDates.filter(x => x !== d); renderSchedCal(); }
function updateSchedSummary() {
  const box = document.getElementById('sc-dateChips');
  if (!box) return;
  box.innerHTML = schedDates.length === 0
    ? html`<span class="hint">근무일을 달력에서 선택하세요</span>`
    : html`<span class="hint" style="width:100%">선택 ${schedDates.length}일</span>`
      + schedDates.map(d =>
          html`<span class="date-chip">${fmtD(d)}<button type="button" onclick="removeSchedDate('${d}')">×</button></span>`).join('');
}
async function submitSchedule() {
  const memberId = Number(document.getElementById('sc-member').value);
  const dates = schedDates.slice();
  if (dates.length === 0) { showMsg('scMsg', '근무일을 1개 이상 선택하세요.', false); return; }
  const startTime = document.getElementById('sc-start').value;
  const endTime = document.getElementById('sc-end').value;
  const memo = document.getElementById('sc-memo').value;
  try {
    let name = '';
    for (const d of dates) {
      const s = await postJson('/api/schedules', { memberId, workDate: d, startTime, endTime, memo });
      name = s.memberName;
    }
    showMsg('scMsg', `${name}님에게 ${dates.length}일 근무를 등록하고 알림을 보냈습니다.`, true);
    schedDates = [];
    viewCalendar(true);
  } catch (e) { showMsg('scMsg', e.message, false); }
}
function showDay(dateStr, cell) {
  document.querySelectorAll('.cal-cell.sel').forEach(c => c.classList.remove('sel'));
  if (cell) cell.classList.add('sel');
  const evs = window._calEvents[dateStr] ?? [];
  document.getElementById('dayEvents').innerHTML =
    html`<h3>${fmtD(dateStr)}</h3>` + (evs.length === 0
      ? '<p class="hint">일정이 없습니다</p>'
      : '<ul class="plain">' + evs.map(e => html`<li>${e}</li>`).join('') + '</ul>');
}
