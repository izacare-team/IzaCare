/* ===================== 알림 (재고부족 · 예약 · 스케줄 통합) ===================== */
const ALERT_META = {
  LOW_STOCK:   { icon: '⚠',  cls: 'low',   label: '재고 부족' },
  RESERVATION: { icon: '📅', cls: 'resv',  label: '새 예약' },
  SCHEDULE:    { icon: '🕒', cls: 'sched', label: '근무 스케줄' },
  SIGNUP:      { icon: '🙋', cls: 'member', label: '가입 신청' },
  MEMBER:      { icon: '👤', cls: 'member', label: '직원 변동' },
  NOTICE:      { icon: '📢', cls: 'notice', label: '새 공지' },
  REPORT:      { icon: '📝', cls: 'notice', label: '새 일보' },
  DISPOSE:     { icon: '🗑', cls: 'low',    label: '폐기' }
};

async function refreshAlerts() {
  try {
    const alerts = await api('/api/alerts');
    window._alerts = alerts;
    updateAlertBadge(alerts);
  } catch (e) { console.warn('알림 조회 실패:', e.message); }
}

/*
 * 종 숫자 자동 갱신 — 홈을 열 때 한 번만 불러오면, 홈에 머무는 동안 들어온 새 알림이 안 보인다.
 * 종이 화면에 있고(홈) 탭이 보일 때만 조회하고, 탭으로 돌아오면 바로 한 번 갱신한다.
 */
setInterval(() => {
  if (document.getElementById('alertBadge') && !document.hidden) refreshAlerts();
}, 20000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && document.getElementById('alertBadge')) refreshAlerts();
});

/**
 * 종 숫자 = 읽지 않은 이벤트 알림만. 재고 부족(id 없음)은 읽음 개념이 없어서
 * 세면 종을 눌러도 숫자가 안 줄어든다 — 목록에는 계속 보이고, 개수는 홈의 "재고 부족"에 있다.
 */
function updateAlertBadge(alerts) {
  const badge = document.getElementById('alertBadge');
  if (!badge) return;
  const unread = alerts.filter(a => a.id !== null).length;
  badge.textContent = unread;
  badge.style.display = unread > 0 ? 'inline-flex' : 'none';
  badge.closest('.bell')?.classList.toggle('has-unread', unread > 0);
}

/** 알림·대시보드 상세 줄을 눌렀을 때 — 펼쳐진 패널을 닫고 해당 화면으로 이동 */
function openAlert(route, arg) {
  const panel = document.getElementById('alertPanel');
  if (panel) panel.hidden = true;
  const detail = document.getElementById('dashDetail');
  if (detail) { detail.hidden = true; dashOpenKey = null; markActiveStat(null); }
  go(route, arg ?? undefined);
}

async function toggleAlertPanel() {
  const panel = document.getElementById('alertPanel');
  if (!panel) return;
  if (!panel.hidden) { panel.hidden = true; return; }

  // 열 때마다 새로 조회 — 캐시가 비어 있거나 갱신이 실패했어도 항상 최신 상태를 보여준다
  panel.hidden = false;
  panel.innerHTML = '<p class="hint" style="margin:6px">알림을 불러오는 중...</p>';

  let alerts;
  try {
    alerts = await api('/api/alerts');
    window._alerts = alerts;
  } catch (e) {
    panel.innerHTML = html`<p class="msg error" style="margin:6px">
      알림을 불러오지 못했습니다 — ${e.message}</p>`;
    return;
  }

  panel.innerHTML = alerts.length === 0
    ? '<p class="hint" style="margin:6px">새로운 알림이 없습니다 🎉</p>'
    : alerts.map(a => {
        const m = ALERT_META[a.type] ?? { icon: '•', cls: '', label: '' };
        // 이동할 곳이 있으면 버튼으로 — 누르면 해당 화면으로 바로 간다
        const go = a.route
          ? html`onclick="openAlert('${a.route}', ${a.arg === null ? 'null' : `'${a.arg}'`})"`
          : '';
        return html`<${a.route ? 'button' : 'div'} class="alert-line ${m.cls}${a.route ? ' linked' : ''}" ${go}>
          <span class="ico">${m.icon}</span><span class="txt">${a.message}</span>
          ${a.createdAt ? html`<span class="when">${a.createdAt.replace('T', ' ').slice(5, 16)}</span>` : ''}
          ${a.route ? html`<span class="chev">›</span>` : ''}
        </${a.route ? 'button' : 'div'}>`;
      }).join('');

  updateAlertBadge(alerts);

  // 이벤트 알림(예약·스케줄)은 확인했으므로 읽음 처리 — 재고 부족은 재고가 채워져야 사라짐
  if (alerts.some(a => a.id !== null)) {
    try { await postJson('/api/alerts/read-all', {}); refreshAlerts(); } catch { /* 무시 */ }
  }
}
