/* ===================== 출근 ===================== */
async function viewAttendance() {
  $view.innerHTML = topbar('출근', 'home') + html`
    <p class="page-sub" id="atDay">${me.displayName}님의 근태</p>
    <div class="clock-list" id="clockList">불러오는 중...</div>
    <p id="atMsg" class="msg" style="text-align:center"></p>`
    + (isOwner() ? html`
    <div class="sketch2" style="padding:14px; margin-top:20px">
      <h3 style="margin:0 0 8px">직원 근태 수정</h3>
      <p class="hint" style="margin-top:0">퇴근을 깜빡한 기록처럼, 직원이 더는 스스로 고칠 수 없는
        지난 근태를 사장님이 직접 바로잡습니다. 비워 두면 그 항목은 지워집니다.</p>
      <label class="field"><span>날짜</span>
        <input id="atFixDate" type="date" value="${today()}" onchange="loadAttendanceFix()"></label>
      <div id="atFixList">불러오는 중...</div>
    </div>` : '');
  loadAttendance();
  if (isOwner()) loadAttendanceFix();
}

/** 사장님용 — 날짜를 골라 그날 전 직원의 근태를 보고 시각을 고친다 */
async function loadAttendanceFix() {
  const date = document.getElementById('atFixDate').value;
  const box = document.getElementById('atFixList');
  box.innerHTML = '불러오는 중...';
  try {
    const list = await api('/api/attendance?date=' + date);
    const FIELD = { clockIn: '출근', breakAt: '휴게 시작', breakEnd: '휴게 종료', clockOut: '퇴근' };
    box.innerHTML = list.length === 0
      ? '<p class="hint">그 날 근태 기록이 없습니다</p>'
      : list.map(a => html`
        <div class="audit-row sketch2" style="flex-direction:column; align-items:stretch; gap:8px; margin-top:10px">
          <strong>${a.staffName}</strong>
          <div style="display:flex; gap:10px; flex-wrap:wrap">
            ${Object.entries(FIELD).map(([k, label]) => html`
              <label style="font-size:0.85rem; display:flex; flex-direction:column; gap:2px">${label}
                <input type="time" id="fix-${a.id}-${k}" value="${a[k] ? a[k].slice(0, 5) : ''}"></label>`).join('')}
          </div>
          <button class="act" style="align-self:flex-end; padding:5px 12px; font-size:0.9rem"
                  onclick="saveAttendanceFix(${a.id})">저장</button>
          <p id="atFixMsg-${a.id}" class="msg" style="margin:0"></p>
        </div>`).join('');
  } catch (e) { box.innerHTML = html`<p class="msg error">${e.message}</p>`; }
}
async function saveAttendanceFix(id) {
  const get = k => document.getElementById(`fix-${id}-${k}`).value || null;
  try {
    await api(`/api/attendance/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clockIn: get('clockIn'), breakAt: get('breakAt'),
        breakEnd: get('breakEnd'), clockOut: get('clockOut')
      })
    });
    showMsg(`atFixMsg-${id}`, '저장했습니다.', true);
  } catch (e) { showMsg(`atFixMsg-${id}`, e.message, false); }
}
async function loadAttendance() {
  const a = await api('/api/attendance/today');
  const t = v => v ? v.slice(0, 5) : '';
  // 자정을 넘겨 일하는 중이면 달력 날짜와 영업일이 다르다 — 어느 날 근무로 기록되는지 밝혀 준다
  const day = document.getElementById('atDay');
  if (day) {
    day.innerHTML = html`${me.displayName}님의 근태 · ${a.workDate}`
      + (a.workDate !== today()
         ? html`<span class="hint"> (심야 근무 — ${fmtD(a.workDate)} 영업일로 기록됩니다)</span>` : '');
  }
  // 각 단계는 하루에 한 번만 — 이미 찍었거나 아직 순서가 아니면 버튼을 잠근다
  const steps = [
    { action: 'clock-in',  label: '출근',      at: a.clockIn,  ready: !a.clockIn },
    { action: 'break',     label: '휴게 시작', at: a.breakAt,  ready: !!a.clockIn && !a.breakAt && !a.clockOut },
    { action: 'break-end', label: '휴게 종료', at: a.breakEnd, ready: !!a.breakAt && !a.breakEnd && !a.clockOut },
    { action: 'clock-out', label: '퇴근',      at: a.clockOut,
      ready: !!a.clockIn && !a.clockOut && (!a.breakAt || !!a.breakEnd) }
  ];
  // 아직 안 찍었으면 라벨만, 찍었으면 라벨(작게) + 기록된 시각(크게)
  document.getElementById('clockList').innerHTML = steps.map(s => html`
    <button class="clock-btn${s.at ? ' done' : ''}" ${s.ready ? '' : 'disabled'}
            onclick="clock('${s.action}')">
      ${s.at
        ? html`<span class="clock-cap">${s.label}</span><span class="clock-at">${t(s.at)}</span>`
        : html`<span class="clock-label">${s.label}</span>`}
    </button>`).join('')
    + (a.locationLabel ? html`<p class="hint" style="text-align:center; margin-top:6px">
         출근 위치 — ${a.locationLabel}</p>` : '');
}
let clocking = false;
async function clock(action) {
  // 위치 확인에 몇 초가 걸리는 동안 버튼이 살아 있으면 연타로 중복 요청이 쌓인다.
  if (clocking) return;
  clocking = true;
  document.querySelectorAll('#clockList .clock-btn').forEach(b => b.disabled = true);
  try {
    // 출근만 위치를 확인한다. 위치를 못 받아도 출근은 그대로 진행되고 '미확인'으로 기록된다.
    if (action === 'clock-in') showMsg('atMsg', '위치 확인 중...', true);
    const where = action === 'clock-in' ? await currentPosition() : {};
    const a = await postJson('/api/attendance/clock', { action, ...where });
    if (action === 'clock-in') {
      showMsg('atMsg', a.locationLabel ?? '출근했습니다',
              a.locationCheck === 'GPS_OK' || a.locationCheck === 'IP_OK');
    }
  } catch (e) { showMsg('atMsg', e.message, false); }
  finally { clocking = false; loadAttendance(); }   // 다시 그리면서 버튼 잠금도 풀린다
}

/**
 * 현재 위치. 권한 거부·미지원·시간초과면 좌표 없이 진행한다 —
 * 위치가 없다고 출근을 막으면 GPS가 안 잡히는 지하 매장에서 아무도 못 찍는다.
 * (https 또는 localhost 에서만 동작한다. http로 접속하면 브라우저가 요청 자체를 거부한다)
 */
function currentPosition() {
  if (!navigator.geolocation) return Promise.resolve({});
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

/* ===================== 가게 설정 › 출근 위치 확인 (지도 · 매장 Wi-Fi) =====================
   화면 틀은 settings.js 의 loadSettings() 가 그리고, 이 영역의 동작만 여기서 맡는다. */
/* ---- 매장 위치 지도 (사장님 설정 화면에서만 씀) ---- */
let storeMap = null, storeMarker = null, storeCircle = null, leafletLoading = null;

/**
 * Leaflet을 설정 화면을 열 때만 내려받는다.
 * 알바가 매일 쓰는 출근·재고 화면에까지 지도 라이브러리를 얹을 이유가 없다.
 */
function loadLeaflet() {
  if (leafletLoading) return leafletLoading;
  leafletLoading = new Promise((resolve, reject) => {
    const base = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.';
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = base + 'min.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = base + 'min.js';
    js.onload = resolve;
    js.onerror = () => { leafletLoading = null; reject(new Error('지도를 불러오지 못했습니다. 인터넷 연결을 확인하세요.')); };
    document.head.appendChild(js);
  });
  return leafletLoading;
}

/** 저장된 좌표(없으면 현재 위치)를 중심으로 지도를 띄운다 */
async function initStoreMap(saved) {
  const box = document.getElementById('storeMap');
  if (!box) return;
  try { await loadLeaflet(); } catch (e) { box.innerHTML = html`<p class="hint" style="padding:12px">${e.message}</p>`; return; }
  if (!document.getElementById('storeMap')) return;   // 그 사이 다른 화면으로 이동함

  let lat = saved?.latitude, lng = saved?.longitude;
  if (lat == null) {                       // 미설정이면 현재 위치에서 시작한다
    const where = await currentPosition();
    lat = where.latitude ?? 37.5665;       // 위치도 못 받으면 서울시청을 임시 중심으로
    lng = where.longitude ?? 126.9780;
  }
  const radius = Number(document.getElementById('stRadius')?.value) || 200;

  storeMap = L.map('storeMap').setView([lat, lng], 18);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap'
  }).addTo(storeMap);

  storeCircle = L.circle([lat, lng], { radius, color: '#c96', weight: 2, fillOpacity: 0.15 }).addTo(storeMap);
  storeMarker = L.marker([lat, lng], { draggable: true }).addTo(storeMap);
  fitToCircle();   // 반경이 화면을 넘어가면 원이 안 보이므로 원에 맞춰 줌을 잡는다
  storeMarker.on('drag', e => moveStorePin(e.target.getLatLng()));
  storeMap.on('click', e => { storeMarker.setLatLng(e.latlng); moveStorePin(e.latlng); });
}

/** 핀을 옮기면 반경 원도 따라간다 (저장은 별도 버튼) */
function moveStorePin(latlng) {
  storeCircle.setLatLng(latlng);
  const label = document.getElementById('stCoordLabel');
  if (label) label.textContent = '저장 안 됨 (이동함)';
}

function onRadiusChange(value) {
  document.getElementById('stRadiusLabel').textContent = value + 'm';
  if (storeCircle) storeCircle.setRadius(Number(value));
}

/** 원 전체가 보이도록 줌을 맞춘다 (슬라이더를 놓았을 때만 — 끄는 도중에 튀면 어지럽다) */
function fitToCircle() {
  if (storeMap && storeCircle) storeMap.fitBounds(storeCircle.getBounds(), { padding: [16, 16] });
}

/** 핀을 지금 내 위치로 점프 */
async function pinToCurrentPosition() {
  showMsg('stLocMsg', '위치 확인 중...', true);
  const where = await currentPosition();
  if (where.latitude === undefined) {
    showMsg('stLocMsg', '위치를 가져올 수 없습니다. 위치 권한을 허용했는지, https 또는 localhost로 접속했는지 확인하세요.', false);
    return;
  }
  const latlng = [where.latitude, where.longitude];
  storeMarker.setLatLng(latlng);
  storeMap.setView(latlng, 18);
  moveStorePin(storeMarker.getLatLng());
  showMsg('stLocMsg', '현재 위치로 핀을 옮겼습니다. 확인 후 "이 위치로 저장"을 누르세요.', true);
}

/** 지도에서 맞춘 핀 위치와 반경을 서버에 저장 */
async function saveStoreLocation() {
  if (!storeMarker) { showMsg('stLocMsg', '지도가 아직 준비되지 않았습니다.', false); return; }
  const { lat, lng } = storeMarker.getLatLng();
  try {
    await api('/api/store/attendance-location', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng,
                             radius: Number(document.getElementById('stRadius').value) })
    });
    document.getElementById('stCoordLabel').textContent = '설정됨';
    showMsg('stLocMsg', '매장 위치를 저장했습니다.', true);
  } catch (e) { showMsg('stLocMsg', e.message, false); }
}
async function setStoreIp() {
  try { await postJson('/api/store/attendance-ip', {}); loadSettings(); }
  catch (e) { showMsg('stLocMsg', e.message, false); }
}
async function clearStoreIp() {
  try { await api('/api/store/attendance-ip', { method: 'DELETE' }); loadSettings(); }
  catch (e) { showMsg('stLocMsg', e.message, false); }
}
