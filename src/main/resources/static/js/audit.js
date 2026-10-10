/* ===================== 실사 (AI 사진 인식) ===================== */
let currentAudit = null;
let scanShots = [];             // 촬영해 둔 사진들 {blob, url} — 아직 서버에 안 보낸 것
const MAX_SHOTS = 8;

function viewAudit() {
  clearScanShots();
  $view.innerHTML = topbar('실사', 'home') + html`
    <p class="hint">냉장고·주류고·창고를 나눠 찍고 한 번에 인식시키세요.
       AI가 품목과 개수를 세서 기록(장부)과 비교합니다. 미등록 품목은 확정 시 자동 등록됩니다.</p>
    <div style="display:flex; gap:8px; margin-bottom:8px">
      <label class="act" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px">📷 촬영
        <input type="file" accept="image/*" capture="environment" hidden onchange="addScanShots(this)"></label>
      <label class="act gray" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px">🖼️ 파일 선택
        <input type="file" accept="image/*" multiple hidden onchange="addScanShots(this)"></label>
    </div>
    <div id="scanThumbs" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px"></div>
    <div id="scanRun" hidden style="margin-bottom:8px">
      <button class="act" onclick="runScan()">AI 인식 시작</button>
    </div>
    <p id="scanMsg" class="msg"></p>
    <div id="auditLines"></div>
    <div id="auditActions" hidden style="text-align:center; margin:14px 0">
      <button class="act" onclick="confirmAudit()">확정 (재고 반영)</button>
      <button class="act gray" onclick="cancelAudit()">취소</button>
    </div>
    <p id="confirmMsg" class="msg" style="text-align:center"></p>`;
}

function clearScanShots() {
  scanShots.forEach(s => URL.revokeObjectURL(s.url));
  scanShots = [];
}

/** 촬영/선택한 사진을 대기 목록에 담는다 (여러 번 찍어 모을 수 있음) */
async function addScanShots(input) {
  try {
    for (const file of input.files) {
      if (scanShots.length >= MAX_SHOTS) {
        showMsg('scanMsg', `사진은 ${MAX_SHOTS}장까지만 올릴 수 있습니다`, false);
        break;
      }
      const blob = await shrinkImage(file);
      scanShots.push({ blob, url: URL.createObjectURL(blob) });
    }
  } catch (err) { showMsg('scanMsg', err.message, false); }
  finally { input.value = ''; renderScanThumbs(); }
}

/**
 * 폰 사진은 한 장에 3~5MB라 그대로 올리면 업로드도 AI 호출도 느리다.
 * 긴 변 1280px JPEG로 줄여서 보낸다 — 병 개수를 세는 데는 이 해상도로 충분하다.
 */
function shrinkImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('이미지 변환에 실패했습니다')),
                    'image/jpeg', 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('이미지를 읽을 수 없습니다')); };
    img.src = src;
  });
}

function renderScanThumbs() {
  const box = document.getElementById('scanThumbs');
  if (!box) return;
  box.replaceChildren(...scanShots.map((shot, i) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative';
    const img = document.createElement('img');
    img.src = shot.url;                                  // 로컬 blob — 사용자가 방금 찍은 사진
    img.style.cssText = 'width:72px; height:72px; object-fit:cover; border-radius:8px';
    const del = document.createElement('button');
    del.textContent = '×';
    del.title = '이 사진 빼기';
    del.style.cssText = 'position:absolute; top:-6px; right:-6px; width:22px; height:22px;'
                      + 'border-radius:50%; border:none; background:#333; color:#fff; cursor:pointer';
    del.onclick = () => { URL.revokeObjectURL(shot.url); scanShots.splice(i, 1); renderScanThumbs(); };
    wrap.append(img, del);
    return wrap;
  }));
  document.getElementById('scanRun').hidden = scanShots.length === 0;
}

/** 모아둔 사진을 한 번에 보내 하나의 실사로 인식시킨다 */
async function runScan() {
  if (!scanShots.length) return;
  showMsg('scanMsg', `AI 인식 중... (사진 ${scanShots.length}장)`, true);
  try {
    const fd = new FormData();
    scanShots.forEach((shot, i) => fd.append('images', shot.blob, `scan${i}.jpg`));
    const res = await fetch('/api/audits/scan', { method: 'POST', body: fd });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    clearScanShots();
    renderScanThumbs();
    showMsg('scanMsg', `인식 완료 — ${body.lines.length}개 품목`, true);
    renderAuditLines(body);
  } catch (err) { showMsg('scanMsg', err.message, false); }
}

function renderAuditLines(audit) {
  currentAudit = audit;
  const photos = Array.from({ length: audit.imageCount }, (_, i) => html`
    <img src="/api/audits/${audit.id}/images/${i}" alt="실사 사진 ${i + 1}"
         style="width:72px; height:72px; object-fit:cover; border-radius:8px">`).join('');

  document.getElementById('auditLines').innerHTML =
    (photos ? html`<p class="hint">이 실사의 근거 사진</p>`
            + `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px">${photos}</div>` : '')
    + audit.lines.map(l => html`
    <div class="audit-row sketch2">
      <span class="nm">${l.unregistered
        ? html`${l.recognizedName}<br><span class="badge-new">자동 등록 예정</span>`
        : l.itemName}</span>
      <span class="cols">기록<br><b>${l.unregistered ? 0 : l.systemQuantity}</b></span>
      <span class="cols">실제<br>
        <input type="number" min="0" value="${l.finalQuantity}" data-line="${l.id}"></span>
      <button class="act gray" style="padding:4px 10px; font-size:0.9rem"
              onclick="saveLine(${l.id})">저장</button>
    </div>`).join('');
  document.getElementById('auditActions').hidden = false;
}

async function saveLine(lineId) {
  const input = document.querySelector(html`input[data-line="${lineId}"]`);
  try {
    const audit = await api(`/api/audits/${currentAudit.id}/lines/${lineId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalQuantity: Number(input.value) })
    });
    renderAuditLines(audit);
  } catch (e) { alert(e.message); }
}
async function confirmAudit() {
  if (!currentAudit) return;
  try {
    await api(`/api/audits/${currentAudit.id}/confirm`, { method: 'POST' });
    document.getElementById('auditLines').innerHTML = '';
    document.getElementById('auditActions').hidden = true;
    showMsg('confirmMsg', '확정 완료 — 재고 반영 및 미등록 품목 자동 등록', true);
  } catch (e) { showMsg('confirmMsg', e.message, false); }
}
async function cancelAudit() {
  if (!currentAudit) return;
  await api(`/api/audits/${currentAudit.id}/cancel`, { method: 'POST' });
  document.getElementById('auditLines').innerHTML = '';
  document.getElementById('auditActions').hidden = true;
  showMsg('confirmMsg', '실사를 취소했습니다', true);
}
