/* ===================== 직원 관리 (사장님 전용) ===================== */
async function viewStaff() {
  $view.innerHTML = topbar('직원 관리', 'home') + html`
    <p class="hint">퇴직 처리하면 로그인과 모든 기능 접근 권한이 즉시 사라집니다.</p>
    <div id="staffList">불러오는 중...</div>
    <p id="stMsg" class="msg"></p>`;
  loadStaff();
}
async function loadStaff() {
  const ROLE = { OWNER: '사장님', STAFF: '알바생' };
  const STATUS = {
    PENDING: '⏳ 승인 대기', ACTIVE: '✅ 근무 중',
    REJECTED: '❌ 거절됨', RESIGNED: '🚪 퇴직'
  };
  try {
    const members = await api('/api/admin/members');
    document.getElementById('staffList').innerHTML = members.map(m => html`
      <div class="audit-row sketch2">
        <span class="nm">${m.displayName}<br>
          <span class="hint">${ROLE[m.role]} · ${m.username}</span></span>
        <span style="font-weight:700; white-space:nowrap">${STATUS[m.status] ?? m.status}</span>
        ${m.status === 'PENDING' ? html`
          <button class="act" style="padding:5px 12px; font-size:0.9rem"
                  onclick="staffAction(${m.id}, 'approve')">승인</button>
          <button class="act danger" style="padding:5px 12px; font-size:0.9rem"
                  onclick="staffAction(${m.id}, 'reject')">거절</button>` : ''}
        ${m.status === 'ACTIVE' && m.role !== 'OWNER' ? html`
          <button class="act danger" style="padding:5px 12px; font-size:0.9rem"
                  data-id="${m.id}" data-name="${m.displayName}"
                  onclick="confirmResign(this)">퇴직 처리</button>` : ''}
        ${(m.status === 'RESIGNED' || m.status === 'REJECTED') ? html`
          <button class="act" style="padding:5px 12px; font-size:0.9rem"
                  onclick="staffAction(${m.id}, 'reinstate')">복직</button>` : ''}
      </div>`).join('');
  } catch (e) { showMsg('stMsg', e.message, false); }
}

/** 퇴직은 권한을 회수하는 되돌리기 어려운 작업이라 한 번 더 확인 */
/* 이름을 onclick 문자열에 직접 넣지 않고 data-* 로 넘긴다.
   속성값은 html`` 이 이스케이프하지만, onclick 안의 JS 문자열은
   브라우저가 속성을 먼저 디코드하므로 이스케이프로 막히지 않는다. */
function confirmResign(btn) {
  const { id, name } = btn.dataset;
  if (!confirm(`${name}님을 퇴직 처리할까요?\n로그인과 모든 기능 접근 권한이 즉시 사라집니다.\n(복직 버튼으로 되돌릴 수 있습니다)`)) return;
  staffAction(id, 'resign');
}
async function staffAction(id, action) {
  try {
    const m = await postJson(`/api/admin/members/${id}/${action}`, {});
    const LABEL = { approve: '승인', reject: '거절', resign: '퇴직 처리', reinstate: '복직' };
    showMsg('stMsg', `${m.displayName}님을 ${LABEL[action] ?? action}했습니다.`, true);
    loadStaff();
  }
  catch (e) { showMsg('stMsg', e.message, false); }
}
