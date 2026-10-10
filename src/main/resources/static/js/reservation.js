/* ===================== 예약 ===================== */
const TIME_SLOTS = ['17:00','18:00','19:00','20:00','21:00','22:00'];
let draft = { date: null, timeSlot: null, people: null, tableIds: [], customerName: '', courseName: null };

/** 예약 메뉴 — 코스 예약 / 코스 없이 예약 / 예약 확인으로 분기 */
async function viewReserve() {
  $view.innerHTML = topbar('예약', 'home') + html`
    <div class="menu-btns">
      <button class="act" onclick="go('course-list')">코스 예약</button>
      <button class="act" onclick="draft.courseName=null; go('reserve-new')">코스 없이 예약</button>
      <button class="act gray" onclick="go('reserve-list')">예약 확인</button>
    </div>`;
}

/**
 * 코스를 "음료·술 무제한 / 무제한 아님" 두 묶음으로 나눠 그린다.
 * 초록 줄은 묶음 제목이라 누를 수 없고, 실제 코스(파란 줄)만 선택 대상이다.
 * @param renderItem 코스 하나를 <li>로 그리는 함수 (화면마다 내용이 다름)
 */
function courseGroupsHtml(courses, renderItem) {
  const groups = [
    { accent: 'refill', title: '음료, 술 무제한 코스', items: courses.filter(c => c.unlimitedRefill) },
    { accent: 'normal', title: '일반 코스',           items: courses.filter(c => !c.unlimitedRefill) }
  ];
  return html`<ul class="plain course-list">${groups.map(g => html`
      <li class="course-group-head cg-${g.accent}">${g.title}</li>
      ${g.items.length === 0
        ? html`<li class="course-group-empty">등록된 코스가 없습니다</li>`
        : g.items.map(c => renderItem(c, g))}`)}</ul>`;
}

/** 코스 예약 — 코스를 먼저 고르면 예약 받기 화면으로 이동 */
async function viewCourseList() {
  $view.innerHTML = topbar('코스 예약', 'reserve')
    + html`<p class="page-sub">예약하실 코스를 선택해주세요</p>`
    + html`<div id="courseList">불러오는 중...</div>`;
  const box = document.getElementById('courseList');
  try {
    const s = await api('/api/store');
    box.innerHTML = s.courses.length === 0
      ? '<p class="hint">등록된 코스가 없습니다. 가게 설정에서 코스를 추가해 주세요.</p>'
      : courseGroupsHtml(s.courses, (c, g) => html`
          <li class="course-row course-item cg-${g.accent}"
              data-name="${c.name}" onclick="pickCourse(this)">
            <span class="c-name">${c.name}</span>
            <span class="c-right"><span class="c-radio" aria-hidden="true"></span></span>
          </li>`);
  } catch (e) {
    box.innerHTML = html`<p class="msg error">${e.message}</p>`;
  }
}
function pickCourse(el) { draft.courseName = el.dataset.name; go('reserve-new'); }
/** 예약 확인 — 날짜별로 묶어서 보여주고, 누르면 상세로 */
async function viewReserveList() {
  $view.innerHTML = topbar('예약 확인', 'reserve') + html`<div id="rlist">불러오는 중...</div>`;
  try {
    const list = await api('/api/reservations/upcoming');
    const box = document.getElementById('rlist');
    if (list.length === 0) {
      box.innerHTML = '<p class="hint">예정된 예약이 없습니다.</p>';
      return;
    }
    let rows = '', lastDate = null;
    for (const r of list) {
      if (r.reserveDate !== lastDate) {
        lastDate = r.reserveDate;
        rows += html`<div class="date-head">${fmtD(r.reserveDate)}</div>`;
      }
      rows += html`<div class="resv-row" onclick="go('reservation', ${r.id})">
          <span>${r.customerName || '(이름 없음)'}${r.courseName ? ' · ' + r.courseName : ''}</span>
          <span>${r.people}명
            ${r.status === 'ACTIVE'
              ? html`<span class="badge-seated">사용중</span>`
              : html`<span class="badge-free">공석</span>`}</span>
        </div>`;
    }
    box.innerHTML = rows;
  } catch (e) {
    document.getElementById('rlist').innerHTML =
      html`<p class="msg error">${e.message}</p>`;
  }
}

/** 예약 상세 — 예약자·날짜·시간·인원·테이블 + 공석 처리 / 예약 취소 */
async function viewReservationDetail(id) {
  let r;
  try { r = await api('/api/reservations/' + id); }
  catch (e) { $view.innerHTML = topbar('예약 확인', 'reserve-list')
      + html`<p class="msg error">${e.message}</p>`; return; }

  const [, mm, dd] = r.reserveDate.split('-');
  $view.innerHTML = topbar('예약 확인', 'reserve-list') + html`
    <div class="sketch resv-detail">
      <div class="who">${r.customerName || '(이름 없음)'}</div>
      <div>${r.courseName || '코스 없이 예약'}</div>
      <div>${Number(mm)}월 ${Number(dd)}일</div>
      <div>${r.timeSlot}</div>
      <div>${r.people}명</div>
      <div>테이블 ${r.tableNumbers.join(', ')}번
        <span class="hint">(총 ${r.totalCapacity}석)</span></div>
      <div>${r.status === 'ACTIVE'
        ? html`<span class="badge-seated">사용중</span>`
        : html`<span class="badge-free">공석</span>`}</div>
      <div style="text-align:right; margin-top:14px">
        ${r.status === 'ACTIVE'
          ? html`<button class="ack-btn" onclick="releaseFromDetail(${r.id})">공석 처리</button>
                 <button class="act danger" style="padding:6px 16px"
                         onclick="cancelFromDetail(${r.id})">예약취소</button>` : ''}
      </div>
    </div>
    <p id="rdMsg" class="msg" style="text-align:center"></p>`;
}
async function releaseFromDetail(id) {
  try {
    await postJson(`/api/reservations/${id}/release`, {});
    viewReservationDetail(id);
  } catch (e) { showMsg('rdMsg', e.message, false); }
}
async function cancelFromDetail(id) {
  if (!confirm('이 예약을 취소할까요?')) return;
  try {
    await api('/api/reservations/' + id, { method: 'DELETE' });
    go('reserve-list');
  } catch (e) { showMsg('rdMsg', e.message, false); }
}

/** 예약 받기 — 날짜·시간·인원·테이블을 골라 새 예약을 등록 (코스 예약이면 draft.courseName이 채워져 있음) */
async function viewReserveNew() {
  draft.date ??= today();
  $view.innerHTML = topbar(draft.courseName ? '코스 예약' : '코스 없이 예약', 'reserve') + html`
    ${draft.courseName ? html`<div class="sketch2" style="padding:10px 14px; margin-bottom:14px; text-align:center; font-weight:700">${draft.courseName}</div>` : ''}
    <label class="field"><span>날짜</span>
      <input id="rvDate" type="date" value="${draft.date}" onchange="draft.date=this.value; draft.tableIds=[]; render()"></label>
    <label class="field"><span>시간</span>
      <select id="rvTime" onchange="draft.timeSlot=this.value; draft.tableIds=[]">
        <option value="">선택</option>
        ${TIME_SLOTS.map(t => html`<option ${draft.timeSlot === t ? 'selected' : ''}>${t}</option>`)}
      </select></label>
    <label class="field"><span>인원</span>
      <select id="rvPeople" onchange="draft.people=Number(this.value)">
        <option value="">선택</option>
        ${[1,2,3,4,5,6,7,8].map(n => html`<option ${draft.people === n ? 'selected' : ''} value="${n}">${n}명</option>`)}
      </select></label>
    <label class="field"><span>예약자명</span>
      <input id="rvName" value="${draft.customerName}" placeholder="예약자 이름"
             oninput="draft.customerName=this.value"></label>
    <button class="act gray" onclick="openTableMap()">테이블 선택
      ${draft.tableIds.length ? ` — ${draft.tableIds.join(', ')}번` : ''}</button>
    <p class="hint" style="margin-top:6px">인원이 많으면 테이블을 여러 개 선택해 붙여 앉힐 수 있습니다.
       배정된 테이블은 <strong>공석 처리하기 전까지</strong> 계속 사용중으로 표시됩니다.</p>
    <div style="text-align:center; margin-top:20px">
      <button class="act" onclick="submitReserve()">확정</button>
    </div>
    <p id="rvMsg" class="msg" style="text-align:center"></p>
    <h3 style="margin-top:26px">이 날짜의 예약</h3>
    <ul class="plain" id="rvList">불러오는 중...</ul>`;
  loadDayReservations();
}
async function loadDayReservations() {
  const list = await api('/api/reservations?date=' + draft.date);
  document.getElementById('rvList').innerHTML = list.length === 0
    ? '<li class="hint">예약이 없습니다</li>'
    : list.map(r => html`<li>
        <div>${r.timeSlot} · 테이블 ${r.tableNumbers.join(', ')}번 · ${r.people}명
          ${r.customerName ? '· ' + r.customerName : ''}
          ${r.courseName ? '· ' + r.courseName : ''}
          ${r.status === 'ACTIVE'
            ? html`<span class="badge-seated">사용중</span>`
            : html`<span class="badge-free">공석</span>`}</div>
        <div style="margin-top:4px">
          ${r.status === 'ACTIVE'
            ? html`<button class="ack-btn" onclick="releaseReserve(${r.id})">공석 처리</button>
                   <button class="del" style="border:none;background:none;color:var(--red);cursor:pointer;font-family:inherit"
                           onclick="cancelReserve(${r.id})">예약 취소</button>` : ''}
        </div></li>`).join('');
}

/** 손님이 나간 뒤 — 테이블을 비워 다시 배정 가능하게 만든다 */
async function releaseReserve(id) {
  try {
    await postJson(`/api/reservations/${id}/release`, {});
    showMsg('rvMsg', '공석 처리했습니다. 이제 이 테이블을 다시 배정할 수 있어요.', true);
    loadDayReservations();
  } catch (e) { showMsg('rvMsg', e.message, false); }
}
async function cancelReserve(id) {
  await api('/api/reservations/' + id, { method: 'DELETE' });
  loadDayReservations();
}
function openTableMap() {
  if (!draft.timeSlot) { showMsg('rvMsg', '시간을 먼저 선택하세요.', false); return; }
  go('tables');
}

async function viewTables() {
  if (!draft.timeSlot) { go('reserve-new'); return; }
  $view.innerHTML = topbar(`테이블 선택 (${fmtD(draft.date)} ${draft.timeSlot})`, 'reserve-new')
    + html`<div id="tableMapWrap"></div>`;
  // 코스를 같이 넘겨야 서버가 이 예약이 끝나는 시각을 알고, 그 뒤에 잡힌 예약과 안 겹치는 테이블을 열어 준다
  window._tables = await api(`/api/tables?date=${draft.date}&timeSlot=${draft.timeSlot}`
    + (draft.courseName ? `&courseName=${encodeURIComponent(draft.courseName)}` : ''));
  renderTableMap();
}

/** 여러 테이블을 눌러 선택/해제 — 정원 합계가 인원 이상이면 확정 가능 */
function renderTableMap() {
  const tables = window._tables ?? [];
  const picked = tables.filter(t => draft.tableIds.includes(t.id));
  const seats = picked.reduce((s, t) => s + t.capacity, 0);
  const need = draft.people ?? 0;
  const enough = picked.length > 0 && seats >= need;

  document.getElementById('tableMapWrap').innerHTML = html`
    <p class="hint" style="text-align:center">
      빨간 테이블은 사용중(공석 처리 전) · 여러 개를 눌러 붙여 앉힐 수 있습니다</p>
    <div class="table-grid">` + tables.map(t => html`
      <button class="tbl-cell ${t.reserved ? 'reserved' : ''} ${draft.tableIds.includes(t.id) ? 'sel' : ''}"
              ${t.reserved ? 'disabled' : html`onclick="toggleTable(${t.id})"`}>
        <span class="tno">${t.number}</span><small>${t.capacity}인</small>
      </button>`).join('') + html`</div>
    <div class="sketch2" style="padding:12px; margin-top:14px; text-align:center">
      <div style="font-weight:700; font-size:1.1rem">
        선택 ${picked.length}개 · 총 ${seats}석 / 인원 ${need}명
        <span style="color:${enough ? 'var(--green)' : 'var(--red)'}">
          ${picked.length === 0 ? '' : (enough ? '✓' : '자리 부족')}</span>
      </div>
      <div class="hint">${picked.length
        ? '테이블 ' + picked.map(t => t.number).sort((a,b)=>a-b).join(', ') + '번'
        : '테이블을 선택하세요'}</div>
      <button class="act" style="margin-top:10px" onclick="go('reserve-new')">선택 완료</button>
    </div>`;
}
function toggleTable(id) {
  const i = draft.tableIds.indexOf(id);
  if (i >= 0) draft.tableIds.splice(i, 1); else draft.tableIds.push(id);
  renderTableMap();
}

/** 화면 중앙에 뜨는 확정 팝업 — 1.8초 뒤 자동으로 닫히고, 눌러도 닫힌다 */
function showToast(text, icon = '✅') {
  const back = document.createElement('div');
  back.className = 'toast-backdrop';
  back.innerHTML = html`<div class="toast-pop"><div class="ic">${icon}</div><div class="tx">${text}</div></div>`;
  const close = () => back.remove();
  back.addEventListener('click', close);
  document.body.appendChild(back);
  setTimeout(close, 1800);
}
async function submitReserve() {
  if (!draft.timeSlot || !draft.people || draft.tableIds.length === 0) {
    showMsg('rvMsg', '시간·인원·테이블을 모두 선택하세요.', false); return;
  }
  try {
    await postJson('/api/reservations', {
      reserveDate: draft.date, timeSlot: draft.timeSlot, people: draft.people,
      tableIds: draft.tableIds, customerName: draft.customerName, courseName: draft.courseName
    });
    showToast('예약이 확정되었습니다', '🎉');
    showMsg('rvMsg', '예약이 확정되었습니다.', true);
    draft.tableIds = []; draft.timeSlot = null; draft.people = null;
    loadDayReservations();
  } catch (e) { showMsg('rvMsg', e.message, false); }
}

/* ===================== 가게 설정 › 테이블 · 코스 =====================
   화면 틀은 settings.js 의 loadSettings() 가 그리고, 추가·삭제 동작만 여기서 맡는다. */
async function addTable() {
  try {
    await postJson('/api/store/tables', {
      number: Number(document.getElementById('tbNum').value),
      capacity: Number(document.getElementById('tbCap').value)
    });
    loadSettings();
  } catch (e) { showMsg('stMsg2', e.message, false); }
}
async function delTable(id) {
  try { await api('/api/store/tables/' + id, { method: 'DELETE' }); loadSettings(); }
  catch (e) { showMsg('stMsg2', e.message, false); }
}
async function addCourse() {
  try {
    const name = document.getElementById('crsName').value.trim();
    if (!name) return;
    const durationMinutes = Number(document.getElementById('crsDuration').value) || null;
    const unlimitedRefill = document.getElementById('crsRefill').value === 'true';
    await postJson('/api/store/courses', { name, durationMinutes, unlimitedRefill });
    loadSettings();
  } catch (e) { showMsg('stMsg2', e.message, false); }
}
async function delCourse(id) {
  try { await api('/api/store/courses/' + id, { method: 'DELETE' }); loadSettings(); }
  catch (e) { showMsg('stMsg2', e.message, false); }
}
