/* ===================== 일보 ===================== */
async function viewReports() {
  $view.innerHTML = topbar('일보', 'home',
    html`<button class="act gray" style="padding:4px 14px; font-size:0.95rem"
             onclick="go('report-new')">✎ 작성</button>`) +
    html`<p style="font-weight:700; font-size:1.2rem">${today().replaceAll('-', ' - ')}</p>
     <div id="reportList">불러오는 중...</div>`;
  const reports = await api('/api/reports');
  document.getElementById('reportList').innerHTML = reports.length === 0
    ? '<p class="hint">작성된 일보가 없습니다. ✎ 버튼으로 작성하세요.</p>'
    : reports.map(r => html`<div>
        <div class="report-row sketch2" onclick="go('report', ${r.id})">
          <span>${r.author}${r.edited
            ? html`<button class="edited-btn"
                       onclick="event.stopPropagation(); toggleReportHistory(${r.id}, 'lhist-${r.id}')"
               >수정됨</button>` : ''}</span>
          <span>${fmtD(r.reportDate)}</span>
        </div>
        <div id="lhist-${r.id}" hidden></div>
      </div>`).join('');
}
async function viewReportNew() {
  $view.innerHTML = topbar('일보 작성', 'reports') + html`
    <label class="field"><span>작성자</span>
      <input id="rpAuthor" value="${me.displayName}" placeholder="이름"></label>
    <label class="field"><span>날짜</span><input id="rpDate" type="date" value="${today()}"></label>
    <label class="field"><span>내용</span>
      <textarea id="rpContent" rows="8" placeholder="오늘의 업무 내용"></textarea></label>
    <div style="text-align:center"><button class="act" onclick="submitReport()">등록</button></div>
    <p id="rpMsg" class="msg" style="text-align:center"></p>`;
}
async function submitReport() {
  const author = document.getElementById('rpAuthor').value.trim();
  const content = document.getElementById('rpContent').value.trim();
  if (!author) { showMsg('rpMsg', '작성자를 입력해 주세요.', false); return; }
  if (!content) {
    showMsg('rpMsg', '일보 내용이 비어 있습니다. 내용을 입력해 주세요.', false);
    document.getElementById('rpContent').focus();
    return;
  }
  try {
    await postJson('/api/reports', {
      author: author,
      reportDate: document.getElementById('rpDate').value,
      content: content
    });
    go('reports');
  } catch (e) { showMsg('rpMsg', e.message, false); }
}
async function viewReportDetail(id) {
  const r = await api('/api/reports/' + id);
  window._report = r;
  const canEdit = isOwner() || r.author === me.displayName;
  $view.innerHTML = topbar('일보', 'reports',
    canEdit ? html`<button class="act gray" style="padding:4px 14px; font-size:0.95rem"
                       onclick="startEditReport()">✎ 수정</button>` : '') + html`
    <div class="sketch" style="padding:16px">
      <p style="font-weight:700; font-size:1.25rem; border-bottom:2px solid var(--ink); padding-bottom:8px">
        Title : ${r.author} ${fmtD(r.reportDate)}${
          r.edited ? html`<button class="edited-btn" onclick="toggleReportHistory(${r.id})">수정됨</button>` : ''}</p>
      <div id="rhist" hidden></div>
      <div id="rbody"><p style="white-space:pre-wrap">${r.content ?? ''}</p></div>
    </div>
    <h3 style="margin:20px 0 6px">댓글</h3>
    <div id="commentList" class="hint">불러오는 중...</div>
    <div style="display:flex; gap:8px; margin-top:12px">
      <input id="cmInput" placeholder="댓글을 입력하세요" style="flex:1">
      <button class="act" style="padding:8px 16px" onclick="addComment(${r.id})">등록</button>
    </div>
    <p id="cmMsg" class="msg"></p>`;
  document.getElementById('cmInput').addEventListener('keydown',
    e => { if (e.key === 'Enter') addComment(r.id); });
  loadComments(id);
}
/** "수정됨" 배지 클릭 → 수정 전 내용 표시 (목록·상세 공용) */
async function toggleReportHistory(id, boxId = 'rhist') {
  const box = document.getElementById(boxId);
  if (!box) return;
  if (!box.hidden) { box.hidden = true; return; }
  const history = await api(`/api/reports/${id}/history`);
  box.innerHTML = history.map(h => html`<div class="history-box">
      <div class="meta">수정 전 · ${h.editedBy ?? ''} ${h.editedAt.replace('T', ' ').slice(0, 16)}
        ${h.previousReportDate ? '· ' + fmtD(h.previousReportDate) : ''}</div>
      <div class="old">${h.previousContent ?? ''}</div>
    </div>`).join('');
  box.hidden = false;
}

function startEditReport() {
  const r = window._report;
  const body = document.getElementById('rbody');
  if (body.dataset.editing === '1') {
    body.dataset.editing = '';
    body.innerHTML = html`<p style="white-space:pre-wrap">${r.content ?? ''}</p>`;
    return;
  }
  body.dataset.editing = '1';
  body.innerHTML = html`
    <label class="field"><span>날짜</span>
      <input id="re-date" type="date" value="${r.reportDate}"></label>
    <textarea id="re-content" rows="8">${r.content ?? ''}</textarea>
    <div style="display:flex; gap:8px; margin-top:8px">
      <button class="act" onclick="saveReport()">저장</button>
      <button class="act gray" onclick="startEditReport()">취소</button>
    </div>`;
}
async function saveReport() {
  const content = document.getElementById('re-content').value.trim();
  if (!content) {
    showMsg('cmMsg', '일보 내용이 비어 있습니다. 내용을 입력해 주세요.', false);
    document.getElementById('re-content').focus();
    return;
  }
  try {
    await api(`/api/reports/${window._report.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportDate: document.getElementById('re-date').value,
        content: content
      })
    });
    viewReportDetail(window._report.id);
  } catch (e) { showMsg('cmMsg', e.message, false); }
}

async function loadComments(reportId) {
  const box = document.getElementById('commentList');
  const comments = await api(`/api/reports/${reportId}/comments`);
  box.className = '';
  box.innerHTML = comments.length === 0
    ? '<p class="hint">첫 댓글을 남겨보세요</p>'
    : comments.map(c => {
        // 본인 댓글이거나 사장님이면 수정·삭제 가능
        const mine = isOwner() || c.author === me.displayName;
        return html`<div class="comment-row" id="cm${c.id}">
          <div class="cm-head">
            <span class="who">${c.author}</span>
            <span class="when">${c.createdAt.replace('T', ' ').slice(5, 16)}</span>
            ${c.editedAt
              ? html`<button class="edited-btn" onclick="toggleCommentHistory(${c.id})">수정됨</button>`
              : ''}
            ${mine ? html`<span class="cm-acts">
                <button class="cm-act" onclick="startEditComment(${c.id})">수정</button>
                <button class="cm-act del" onclick="removeComment(${c.id})">삭제</button>
              </span>` : ''}
          </div>
          <div class="cm-hist" id="cmh${c.id}" hidden></div>
          <div class="cm-body" id="cmb${c.id}">${c.content}</div>
        </div>`;
      }).join('');
  window._comments = comments;
}

/** 댓글을 인라인 입력창으로 바꿔 수정 */
function startEditComment(id) {
  const c = (window._comments ?? []).find(x => x.id === id);
  if (!c) return;
  const body = document.getElementById('cmb' + id);
  body.innerHTML = html`
    <div class="cm-edit">
      <input id="cme${id}" value="${c.content.replace(/"/g, '&quot;')}">
      <button class="act" style="padding:8px 14px" onclick="saveComment(${id})">저장</button>
      <button class="act gray" style="padding:8px 14px" onclick="loadComments(window._report.id)">취소</button>
    </div>`;
  document.getElementById('cme' + id).focus();
}

async function saveComment(id) {
  const content = document.getElementById('cme' + id).value.trim();
  if (!content) return;
  try {
    await api(`/api/comments/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    loadComments(window._report.id);
  } catch (e) { showMsg('cmMsg', e.message, false); }
}

async function removeComment(id) {
  if (!confirm('이 댓글을 삭제할까요?')) return;
  try {
    await api('/api/comments/' + id, { method: 'DELETE' });
    loadComments(window._report.id);
  } catch (e) { showMsg('cmMsg', e.message, false); }
}

/** '수정됨'을 누르면 고치기 전 내용을 펼쳐 보여준다 */
async function toggleCommentHistory(id) {
  const box = document.getElementById('cmh' + id);
  if (!box.hidden) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = '<p class="hint" style="margin:6px 0">불러오는 중...</p>';
  try {
    const list = await api(`/api/comments/${id}/history`);
    box.innerHTML = list.length === 0
      ? '<p class="hint" style="margin:6px 0">수정 이력이 없습니다.</p>'
      : list.map(h => html`<div class="history-box">
          <div class="meta">${h.editedBy} · ${h.editedAt.replace('T', ' ').slice(5, 16)} 수정 전</div>
          <div class="old">${h.previousContent}</div>
        </div>`).join('');
  } catch (e) {
    box.innerHTML = html`<p class="msg error" style="margin:6px 0">${e.message}</p>`;
  }
}
async function addComment(reportId) {
  const input = document.getElementById('cmInput');
  if (!input.value.trim()) return;
  try {
    await postJson(`/api/reports/${reportId}/comments`, { content: input.value.trim() });
    input.value = '';
    loadComments(reportId);
  } catch (e) { showMsg('cmMsg', e.message, false); }
}
