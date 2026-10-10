/* ===================== 재고 목록 (품목 클릭 → 입고/폐기) ===================== */
async function viewStock() {
  $view.innerHTML = topbar('재고목록', 'home') +
    html`<p class="hint">부족한 품목이 맨 위로 정렬돼요. 품목을 누르면 바로 입고·폐기·수정할 수 있습니다.</p>
     <div id="stockGrid" class="stock-grid"></div>
     <p id="skMsg" class="msg" style="text-align:center"></p>`;
  loadStockGrid();
}

async function loadStockGrid() {
  const items = await api('/api/items');
  // 부족할수록 위로 — 기준 대비 여유분이 적은 순, 같으면 수량이 적은 순
  items.sort((a, b) =>
    (a.quantity - a.minQuantity) - (b.quantity - b.minQuantity)
    || a.quantity - b.quantity
    || a.name.localeCompare(b.name, 'ko'));
  window._items = items;
  const color = i => i.quantity <= i.minQuantity ? 'red'
                   : i.quantity <= i.minQuantity * 2 ? 'orange' : 'blue';
  document.getElementById('stockGrid').innerHTML = items.map(i => html`
    <div class="stock-card ${color(i)}" style="cursor:pointer" onclick="openStockSheet(${i.id})">
      <span class="nm">${i.name}</span>
      <span class="qt">${i.quantity}${i.unit ?? '개'}</span>
    </div>`).join('');
  refreshAlerts();
}

/* 재고 카드 클릭 시 뜨는 액션 시트 */
let sheetMode = 'in', sheetQty = 1, sheetItem = null;

function openStockSheet(itemId) {
  sheetItem = (window._items ?? []).find(i => i.id === itemId);
  if (!sheetItem) return;
  sheetMode = 'in'; sheetQty = 1;
  const el = document.createElement('div');
  el.className = 'sheet-backdrop';
  el.id = 'stockSheet';
  el.onclick = e => { if (e.target === el) closeStockSheet(); };
  el.innerHTML = html`
    <div class="sheet">
      <h3>${sheetItem.name}</h3>
      <p class="cur">현재 ${sheetItem.quantity}${sheetItem.unit ?? '개'}
         · 최소 ${sheetItem.minQuantity}</p>
      <div class="seg">
        <button id="segIn" class="on" onclick="setSheetMode('in')">입고</button>
        <button id="segOut" onclick="setSheetMode('out')">폐기</button>
        <button id="segSet" onclick="setSheetMode('set')">수정</button>
      </div>
      <p id="sheetHint" class="hint" style="text-align:center; margin:0" hidden>
        고친 뒤의 재고 수량을 입력하세요</p>
      <div class="stepper" style="margin:14px 0">
        <button onclick="bumpSheet(-1)">−</button>
        <input class="num" id="sheetNum" type="number" min="1" value="1" oninput="setSheetQty(this.value)">
        <button onclick="bumpSheet(1)">+</button>
      </div>
      <div id="sheetMinWrap" hidden>
        <label class="field"><span>재고 부족 기준 (이 수량 이하면 빨간색·알림)</span>
          <input id="sheetMinQty" type="number" min="0" value="${sheetItem.minQuantity}"></label>
      </div>
      <div id="sheetReasonWrap" hidden>
        <label class="field"><span>폐기 사유</span>
          <select id="sheetReason">
            <option>유통기한 경과</option><option>파손</option>
            <option>변질</option><option>조리 실수</option><option>기타</option>
          </select></label>
      </div>
      <div id="sheetNoteWrap">
        <label class="field"><span>메모</span>
          <input id="sheetNote" placeholder="예: 정기 발주분"></label>
      </div>
      <div style="display:flex; gap:10px; margin-top:6px">
        <button class="act gray" style="flex:1" onclick="closeStockSheet()">닫기</button>
        <button class="act" id="sheetSubmit" style="flex:2" onclick="submitSheet()">입고 처리</button>
      </div>
      <p id="sheetMsg" class="msg" style="text-align:center"></p>
    </div>`;
  document.body.appendChild(el);
}
function closeStockSheet() { document.getElementById('stockSheet')?.remove(); }

/** 입고 / 폐기 / 수정 — 'set'은 변동량이 아니라 "고친 뒤 수량"을 입력받는다 */
function setSheetMode(mode) {
  sheetMode = mode;
  document.getElementById('segIn').className  = mode === 'in'  ? 'on' : '';
  document.getElementById('segOut').className = mode === 'out' ? 'on dispose' : '';
  document.getElementById('segSet').className = mode === 'set' ? 'on' : '';

  document.getElementById('sheetReasonWrap').hidden = mode !== 'out';
  document.getElementById('sheetNoteWrap').hidden   = mode !== 'in';
  document.getElementById('sheetHint').hidden       = mode !== 'set';
  document.getElementById('sheetMinWrap').hidden    = mode !== 'set';

  // 수정은 현재 수량에서 출발하고 0도 허용, 입고/폐기는 1부터
  const num = document.getElementById('sheetNum');
  num.min = mode === 'set' ? 0 : 1;
  sheetQty = mode === 'set' ? sheetItem.quantity : 1;
  num.value = sheetQty;
  if (mode === 'set') document.getElementById('sheetMinQty').value = sheetItem.minQuantity;

  const btn = document.getElementById('sheetSubmit');
  btn.textContent = mode === 'in' ? '입고 처리' : mode === 'out' ? '폐기 처리' : '수량 저장';
  btn.className = mode === 'out' ? 'act danger' : 'act';
}
function sheetMin() { return sheetMode === 'set' ? 0 : 1; }
function bumpSheet(d) {
  sheetQty = Math.max(sheetMin(), sheetQty + d);
  document.getElementById('sheetNum').value = sheetQty;
}
function setSheetQty(v) {
  const n = Number(v);
  sheetQty = Math.max(sheetMin(), Number.isFinite(n) ? n : sheetMin());
}
async function submitSheet() {
  try {
    // 수정은 품목 정보를, 입고·폐기는 변동 이력을 돌려준다
    if (sheetMode === 'set') {
      const item = await api(`/api/items/${sheetItem.id}/quantity`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: sheetQty,
          minQuantity: Number(document.getElementById('sheetMinQty').value)
        })
      });
      closeStockSheet();
      await loadStockGrid();
      showMsg('skMsg', `${item.name} → 현재 ${item.quantity}${item.unit ?? '개'}`
        + ` · 부족 기준 ${item.minQuantity}`, true);
      return;
    }

    const tx = sheetMode === 'in'
      ? await postJson('/api/inbound', {
          itemId: sheetItem.id, quantity: sheetQty,
          note: document.getElementById('sheetNote').value
        })
      : await postJson('/api/dispose', {
          itemId: sheetItem.id, quantity: sheetQty,
          reason: document.getElementById('sheetReason').value
        });
    closeStockSheet();
    await loadStockGrid();
    showMsg('skMsg', `${tx.itemName} ${tx.quantityChange > 0 ? '+' : ''}${tx.quantityChange}`
      + ` → 현재 ${tx.quantityAfter}`, true);
  } catch (e) { showMsg('sheetMsg', e.message, false); }
}

/* ===================== 입고 / 폐기 (스테퍼) ===================== */
let stepQty = 1;
function stepperHtml() {
  return html`<div class="stepper">
    <button onclick="bumpQty(-1)">−</button>
    <input class="num" id="stepNum" type="number" min="1" value="${stepQty}" oninput="setStepQty(this.value)">
    <button onclick="bumpQty(1)">+</button>
  </div>`;
}
function bumpQty(d) {
  stepQty = Math.max(1, stepQty + d);
  document.getElementById('stepNum').value = stepQty;
}
function setStepQty(v) {
  stepQty = Math.max(1, Number(v) || 1);
}

async function viewInbound(preselectItemId) {
  stepQty = 1;
  const items = await api('/api/items');
  const preselect = preselectItemId ? Number(preselectItemId) : null;
  $view.innerHTML = topbar('입고', 'home') + html`
    <label class="field"><span>입고 방식</span>
      <select id="ibMode" onchange="toggleIbMode()">
        <option value="existing">기존 품목</option>
        <option value="new">신규 품목 (등록 + 입고)</option>
      </select>
    </label>
    <div id="ibExisting">
      <label class="field"><span>품목</span>
        <select id="ibItem">${items.map(i =>
          html`<option value="${i.id}" ${i.id === preselect ? 'selected' : ''}>${i.name} (현재 ${i.quantity}${i.unit ?? ''})</option>`)}
        </select>
      </label>
    </div>
    <div id="ibNew" hidden>
      <label class="field"><span>신규 품목명</span><input id="ibName" placeholder="예: 사과"></label>
      <label class="field"><span>분류 / 단위</span>
        <div style="display:flex; gap:8px">
          <input id="ibCat" placeholder="분류"><input id="ibUnit" placeholder="단위">
        </div>
      </label>
      <label class="field"><span>최소 수량 (재고 부족 기준)</span>
        <input id="ibMin" type="number" min="0" value="0"></label>
    </div>
    ${stepperHtml()}
    <label class="field"><span>메모</span><input id="ibNote" placeholder="예: 정기 발주분"></label>
    <div style="text-align:center"><button class="act" onclick="submitInbound()">입고 처리</button></div>
    <p id="ibMsg" class="msg" style="text-align:center"></p>`;
}
function toggleIbMode() {
  const isNew = document.getElementById('ibMode').value === 'new';
  document.getElementById('ibExisting').hidden = isNew;
  document.getElementById('ibNew').hidden = !isNew;
}
async function submitInbound() {
  const isNew = document.getElementById('ibMode').value === 'new';
  const payload = { quantity: stepQty, note: document.getElementById('ibNote').value };
  if (isNew) {
    payload.newItemName = document.getElementById('ibName').value;
    payload.category = document.getElementById('ibCat').value;
    payload.unit = document.getElementById('ibUnit').value;
    payload.minQuantity = Number(document.getElementById('ibMin').value || 0);
  } else {
    payload.itemId = Number(document.getElementById('ibItem').value);
  }
  try {
    const tx = await postJson('/api/inbound', payload);
    showMsg('ibMsg', `${tx.itemName} +${tx.quantityChange} → 현재 ${tx.quantityAfter}`, true);
    stepQty = 1; document.getElementById('stepNum').value = 1;
  } catch (e) { showMsg('ibMsg', e.message, false); }
}

async function viewDispose() {
  stepQty = 1;
  const items = await api('/api/items');
  $view.innerHTML = topbar('폐기', 'home') + html`
    <label class="field"><span>품목</span>
      <select id="dpItem">${items.map(i =>
        html`<option value="${i.id}">${i.name} (현재 ${i.quantity}${i.unit ?? ''})</option>`)}
      </select>
    </label>
    ${stepperHtml()}
    <label class="field"><span>폐기 사유</span>
      <select id="dpReason">
        <option>유통기한 경과</option><option>파손</option>
        <option>변질</option><option>조리 실수</option><option>기타</option>
      </select>
    </label>
    <div style="text-align:center"><button class="act danger" onclick="submitDispose()">폐기 처리</button></div>
    <p id="dpMsg" class="msg" style="text-align:center"></p>`;
}
async function submitDispose() {
  try {
    const tx = await postJson('/api/dispose', {
      itemId: Number(document.getElementById('dpItem').value),
      quantity: stepQty,
      reason: document.getElementById('dpReason').value
    });
    showMsg('dpMsg', `${tx.itemName} ${tx.quantityChange} (${tx.note}) → 현재 ${tx.quantityAfter}`, true);
    stepQty = 1; document.getElementById('stepNum').value = 1;
  } catch (e) { showMsg('dpMsg', e.message, false); }
}
