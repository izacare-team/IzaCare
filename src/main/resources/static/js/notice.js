/* ===================== 공지 (홈 화면 공지 보드) ===================== */
async function loadNotices() {
  const box = document.getElementById('noticeList');
  try {
    const notices = await api('/api/notices');
    box.className = '';
    box.innerHTML = notices.length === 0 ? '<p class="hint">등록된 공지가 없습니다</p>' :
      notices.map(n => html`<div class="notice-item" style="flex-direction:column; align-items:stretch">
        <div style="display:flex; justify-content:space-between; gap:8px">
          <span style="white-space:pre-wrap">${n.title} ${fmtD(n.eventDate)}${
            n.edited ? html`<button class="edited-btn" onclick="toggleNoticeHistory(${n.id})">수정됨</button>` : ''}</span>
          ${isOwner() ? html`<span style="white-space:nowrap">
              <button class="del" style="color:var(--blue)" onclick="startEditNotice(${n.id})">수정</button>
              <button class="del" onclick="delNotice(${n.id})">x</button></span>` : ''}
        </div>
        <div id="nhist-${n.id}" hidden></div>
        <div id="nedit-${n.id}" hidden></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px">
          ${isOwner() ? html`<span></span>`
            : n.ackedByMe
            ? html`<span class="ack-done">✓ 확인했습니다</span>`
            : html`<button class="ack-btn" onclick="ackNotice(${n.id})">확인했습니다</button>`}
          <span class="hint" style="margin-left:10px; text-align:right">
            확인 ${n.ackCount}명${isOwner() && n.ackedNames.length
              ? html`<br>(${n.ackedNames.join(', ')})` : ''}</span>
        </div>
      </div>`).join('');
    window._notices = notices;
  } catch (e) { box.textContent = '공지를 불러오지 못했습니다'; }
}

/** "수정됨" 배지 클릭 → 수정 전 내용 표시 */
async function toggleNoticeHistory(id) {
  const box = document.getElementById('nhist-' + id);
  if (!box.hidden) { box.hidden = true; return; }
  const history = await api(`/api/notices/${id}/history`);
  box.innerHTML = history.map(h => html`<div class="history-box">
      <div class="meta">수정 전 · ${h.editedBy ?? ''} ${h.editedAt.replace('T', ' ').slice(0, 16)}</div>
      <div class="old">${h.previousTitle} ${fmtD(h.previousEventDate)}</div>
    </div>`).join('');
  box.hidden = false;
}

function startEditNotice(id) {
  const n = (window._notices ?? []).find(x => x.id === id);
  const box = document.getElementById('nedit-' + id);
  if (!box.hidden) { box.hidden = true; return; }
  box.innerHTML = html`
    <textarea id="ne-title-${id}" rows="3" style="margin-top:8px">${n.title}</textarea>
    <div style="display:flex; gap:8px; margin-top:6px">
      <input id="ne-date-${id}" type="date" value="${n.eventDate ?? ''}" style="flex:1">
      <button class="act" style="padding:5px 14px" onclick="saveNotice(${id})">저장</button>
      <button class="act gray" style="padding:5px 12px" onclick="startEditNotice(${id})">취소</button>
    </div>`;
  box.hidden = false;
}
async function saveNotice(id) {
  try {
    await api(`/api/notices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: document.getElementById('ne-title-' + id).value,
        eventDate: document.getElementById('ne-date-' + id).value || null
      })
    });
    loadNotices();
  } catch (e) { showMsg('homeMsg', e.message, false); }
}
async function ackNotice(id) {
  try { await postJson(`/api/notices/${id}/ack`, {}); loadNotices(); }
  catch (e) { showMsg('homeMsg', e.message, false); }
}
async function delNotice(id) {
  await api('/api/notices/' + id, { method: 'DELETE' }); loadNotices();
}
