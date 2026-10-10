/* ===================== 가게 설정 (사장님) ===================== */
async function viewSettings() {
  $view.innerHTML = topbar('가게 설정', 'home') + html`<div id="settingsBody">불러오는 중...</div>`;
  loadSettings();
}
async function loadSettings() {
  const s = await api('/api/store');
  const t = v => v ? v.slice(0, 5) : '';
  document.getElementById('settingsBody').innerHTML = html`
    <div class="sketch" style="padding:16px; margin-bottom:14px">
      <label class="field"><span>가게 이름</span><input id="stName" value="${s.name}"></label>
      <div style="display:flex; gap:8px">
        <label class="field" style="flex:1"><span>오픈</span>
          <input id="stOpen" type="time" value="${t(s.open)}"></label>
        <label class="field" style="flex:1"><span>마감</span>
          <input id="stClose" type="time" value="${t(s.close)}"></label>
      </div>
        <button class="act" style="width:100%" onclick="saveStore()">저장</button>
    </div>

    <div class="code-card">
      <div class="code-card-label">가게 코드 · 직원 가입/로그인용</div>
      <div class="code-card-value">
        <span class="code-text">${s.code ?? '-'}</span>
        <button class="code-copy" onclick="copyCode(event, '${s.code ?? ''}')">📋 복사</button>
      </div>
      <button class="code-regen" onclick="regenCode()">코드 재발급</button>
      <p class="code-hint">재발급하면 이전 코드는 즉시 무효화됩니다.</p>
    </div>

    <div class="sketch" style="padding:16px; margin-bottom:14px">
      <h3 style="margin:0 0 8px">출근 위치 확인</h3>
      <p class="hint" style="margin-top:0">직원이 매장 밖에서 출근을 찍으면 기록에 표시됩니다
        (출근을 막지는 않습니다). GPS와 매장 Wi-Fi 중 <b>하나만 맞아도 정상</b>으로 봅니다.</p>
      <div id="storeMap" style="height:260px; border-radius:10px; margin-bottom:8px;
                                border:2px solid #d9d2bc; background:#efeade"></div>
      <p class="hint" style="margin:4px 0">핀을 끌거나 지도를 눌러 매장 위치를 맞추세요.
        원이 출근으로 인정되는 범위입니다.</p>
      <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:8px">
        <label class="field" style="flex:1; margin:0">
          <span>허용 반경 <b id="stRadiusLabel">${s.attendanceLocation?.radius ?? 200}m</b>
            — 실내·지하는 GPS 오차가 커서 넉넉히</span>
          <input id="stRadius" type="range" min="20" max="1000" step="10"
                 value="${s.attendanceLocation?.radius ?? 200}"
                 oninput="onRadiusChange(this.value)" onchange="fitToCircle()"></label>
        <button class="act gray" style="padding:8px 12px; font-size:0.9rem; white-space:nowrap"
                onclick="pinToCurrentPosition()">현재 위치로</button>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding:6px 0; border-bottom:2px solid #d9d2bc">
        <span>📍 매장 좌표 <b id="stCoordLabel">${s.attendanceLocation?.latitude
          ? html`설정됨` : html`미설정`}</b></span>
        <button class="act" style="padding:5px 12px; font-size:0.9rem"
                onclick="saveStoreLocation()">이 위치로 저장</button>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0">
        <span>📶 매장 Wi-Fi ${s.attendanceLocation?.allowedIp
          ? html`<b>${s.attendanceLocation.allowedIp}</b>`
          : html`<b>미설정</b>`}</span>
        <span style="display:flex; gap:6px">
          <button class="act gray" style="padding:5px 12px; font-size:0.9rem"
                  onclick="setStoreIp()">현재 IP로 설정</button>
          ${s.attendanceLocation?.allowedIp
            ? html`<button class="del" onclick="clearStoreIp()">해제</button>` : ''}
        </span>
      </div>
      <p class="hint" style="margin:0">좌표와 Wi-Fi 모두 <b>매장 안에서, 매장 Wi-Fi에 연결한 채</b> 설정해야 합니다.</p>
      <p id="stLocMsg" class="msg"></p>
    </div>

    <div class="sketch" style="padding:16px">
      <h3 style="margin:0 0 8px">테이블 구성</h3>
      <div id="stTables">${s.tables.map(tb => html`
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:6px 0; border-bottom:2px solid #d9d2bc">
          <span><b>${tb.number}번</b> · ${tb.capacity}인</span>
          <button class="del" onclick="delTable(${tb.id})">삭제</button>
        </div>`)}</div>
      <div style="display:flex; gap:8px; margin-top:10px; align-items:flex-end">
        <label class="field" style="flex:1; margin:0"><span>번호</span>
          <input id="tbNum" type="number" min="1"></label>
        <label class="field" style="flex:1; margin:0"><span>정원</span>
          <input id="tbCap" type="number" min="1" value="2"></label>
        <button class="act" style="padding:8px 14px" onclick="addTable()">추가</button>
      </div>
    </div>

    <div class="sketch" style="padding:16px; margin-top:14px">
      <h3 style="margin:0 0 8px">코스 메뉴</h3>
      <p class="hint" style="margin-top:0">코스는 "음료·술 무제한" 여부로 묶여 표시됩니다.
        시간제한(분)은 선택 사항이며, 값을 넣으면 그 시간이 지난 뒤 테이블이 자동으로 공석 처리됩니다.</p>
      <div id="stCourses">${courseGroupsHtml(s.courses, (c, g) => html`
        <li class="course-row course-item static cg-${g.accent}">
          <span class="c-name">${c.name}</span>
          <span class="c-right">
            ${c.durationMinutes ? html`<span class="badge-timed">${c.durationMinutes}분</span>` : ''}
            <button class="del" onclick="delCourse(${c.id})">삭제</button>
          </span>
        </li>`)}</div>
      <label class="field" style="margin-top:10px"><span>코스 이름</span>
        <input id="crsName" placeholder="예: 모둠사시미 코스"></label>
      <div style="display:flex; gap:8px; align-items:flex-end">
        <label class="field" style="flex:2; margin:0"><span>종류</span>
          <select id="crsRefill">
            <option value="false">일반 코스</option>
            <option value="true">무제한 리필</option>
          </select></label>
        <label class="field" style="flex:1; margin:0"><span>시간제한(분)</span>
          <input id="crsDuration" type="number" min="1" placeholder="없음"></label>
        <button class="act" style="padding:11px 16px" onclick="addCourse()">추가</button>
      </div>
    </div>
    <p id="stMsg2" class="msg" style="text-align:center"></p>`;

  storeMap = storeMarker = storeCircle = null;   // 화면을 다시 그렸으므로 이전 지도는 버린다
  if (s.attendanceLocation) initStoreMap(s.attendanceLocation);   // 사장님에게만 내려온다
}
async function saveStore() {
  try {
    await api('/api/store', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('stName').value,
        open: document.getElementById('stOpen').value,
        close: document.getElementById('stClose').value
      })});
    // 헤더 타이틀 갱신을 위해 세션 정보 다시 로드
    try { me = await api('/api/auth/me'); } catch {}
    showMsg('stMsg2', '저장되었습니다.', true);
  } catch (e) { showMsg('stMsg2', e.message, false); }
}
async function regenCode() {
  if (!confirm('코드를 재발급할까요?\n이전 코드로는 더 이상 가입·로그인할 수 없습니다.')) return;
  try { await postJson('/api/store/regenerate-code', {}); loadSettings(); }
  catch (e) { showMsg('stMsg2', e.message, false); }
}
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
