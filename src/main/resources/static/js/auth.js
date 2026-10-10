/* ===================== 로그인 / 회원가입 ===================== */
function viewLogin() {
  document.getElementById('bottomNav').style.display = 'none';
  $view.innerHTML = html`
    <div style="display:flex; justify-content:flex-end">${themeButtonHtml()}</div>
    <div style="margin-top:44px; text-align:center">
      <h1 style="font-size:2rem">🍢 이자카야<br>매장관리</h1>
    </div>
    <div class="sketch" style="padding:20px; margin-top:20px">
      <label class="field"><span>아이디</span><input id="lgId" autocomplete="username"></label>
      <label class="field"><span>비밀번호</span>
        <div class="pw-wrap">
          <input id="lgPw" type="password" autocomplete="current-password">
          <button type="button" class="pw-toggle" onclick="togglePw(this)" aria-label="비밀번호 표시">👁</button>
        </div></label>
      <div style="text-align:center; margin-top:16px">
        <button class="act" onclick="doLogin()">로그인</button>
      </div>
      <p id="lgMsg" class="msg" style="text-align:center"></p>
      <p style="text-align:center" class="hint">계정이 없나요?
        <a href="#signup" style="color:var(--blue); font-weight:700">회원가입</a></p>
    </div>
    <p class="hint" style="text-align:center; margin-top:14px">
      가입 시 가게코드 <b>DEMO01</b></p>`;
  document.getElementById('lgPw').addEventListener('keydown',
    e => { if (e.key === 'Enter') doLogin(); });
}
async function doLogin() {
  try {
    me = await postJson('/api/auth/login', {
      username: document.getElementById('lgId').value,
      password: document.getElementById('lgPw').value
    });
    go('home'); render();
  } catch (e) { showMsg('lgMsg', e.message, false); }
}

/** 비밀번호 표시/숨김 토글 — 눈 버튼을 누르면 입력한 값을 확인할 수 있다 */
function togglePw(btn) {
  const input = btn.parentElement.querySelector('input');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
  btn.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 표시');
}
/** 아이디 입력에서 한글(자모·완성형)을 제거한다 — 아이디는 영문·숫자만 허용 */
function stripHangul(input) {
  const v = input.value.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
  if (v !== input.value) input.value = v;
}

function viewSignup() {
  document.getElementById('bottomNav').style.display = 'none';
  $view.innerHTML = topbar('회원가입', 'login') + html`
    <div class="sketch2" style="padding:20px">
      <label class="field"><span>구분</span>
        <select id="sgRole" onchange="toggleSignupRole()">
          <option value="STAFF">알바생 (가입 후 사장님 승인 필요)</option>
          <option value="OWNER">사장님 (바로 사용 가능)</option>
        </select></label>
      <label class="field" id="sgStoreCodeWrap"><span>가게 코드</span>
        <input id="sgStoreCode" placeholder="사장님께 받은 코드"
               autocapitalize="characters" style="text-transform:uppercase"></label>
      <label class="field" id="sgStoreNameWrap" hidden><span>가게 이름</span>
        <input id="sgStoreName" placeholder="예: 이자카야 하나비"></label>
      <label class="field"><span>이름</span><input id="sgName" placeholder="예: 김가현"></label>
      <label class="field"><span>아이디</span>
        <input id="sgId" autocomplete="username" placeholder="영문·숫자" oninput="stripHangul(this)"></label>
      <label class="field"><span>비밀번호</span>
        <div class="pw-wrap">
          <input id="sgPw" type="password" autocomplete="new-password">
          <button type="button" class="pw-toggle" onclick="togglePw(this)" aria-label="비밀번호 표시">👁</button>
        </div></label>
      <label class="field"><span>비밀번호 확인</span>
        <div class="pw-wrap">
          <input id="sgPw2" type="password" autocomplete="new-password">
          <button type="button" class="pw-toggle" onclick="togglePw(this)" aria-label="비밀번호 표시">👁</button>
        </div></label>
      <div style="text-align:center; margin-top:16px">
        <button class="act" onclick="doSignup()">가입하기</button>
      </div>
      <p id="sgMsg" class="msg" style="text-align:center"></p>
    </div>`;
}
function toggleSignupRole() {
  const isOwner = document.getElementById('sgRole').value === 'OWNER';
  document.getElementById('sgStoreNameWrap').hidden = !isOwner;
  document.getElementById('sgStoreCodeWrap').hidden = isOwner;
}
async function doSignup() {
  const isOwner = document.getElementById('sgRole').value === 'OWNER';
  const pw = document.getElementById('sgPw').value;
  const pw2 = document.getElementById('sgPw2').value;
  if (pw !== pw2) { showMsg('sgMsg', '비밀번호가 일치하지 않습니다.', false); return; }
  try {
    const r = await postJson('/api/auth/signup', {
      role: document.getElementById('sgRole').value,
      displayName: document.getElementById('sgName').value,
      username: document.getElementById('sgId').value,
      password: pw,
      storeName: isOwner ? document.getElementById('sgStoreName').value : null,
      storeCode: isOwner ? null : document.getElementById('sgStoreCode').value
    });
    if (isOwner && r.storeCode) {
      // 사장님: 발급된 가게 코드를 크게 안내
      $view.innerHTML = topbar('가게 개설 완료', 'login') + html`
        <div style="margin-top:20px">
          <p style="text-align:center; font-weight:700; font-size:1.2rem; margin:0 0 4px">${r.storeName}</p>
          <p class="hint" style="text-align:center; margin:0 0 14px">${r.message}</p>
          <div class="code-card">
            <div class="code-card-label">가게 코드 · 직원 가입/로그인용</div>
            <div class="code-card-value">
              <span class="code-text">${r.storeCode}</span>
              <button class="code-copy" onclick="copyCode(event, '${r.storeCode}')">📋 복사</button>
            </div>
            <p class="code-hint">직원은 이 코드로 가입·로그인합니다. 가게 설정에서 다시 볼 수 있어요.</p>
          </div>
          <div style="text-align:center"><button class="act" onclick="go('login')">로그인하러 가기</button></div>
        </div>`;
      return;
    }
    showMsg('sgMsg', r.message, true);
    setTimeout(() => go('login'), 1600);
  } catch (e) { showMsg('sgMsg', e.message, false); }
}
async function doLogout() {
  await postJson('/api/auth/logout', {});
  me = null; go('login'); render();
}

function copyCode(ev, code) {
  if (!code) return;
  try { if (navigator.clipboard) navigator.clipboard.writeText(code); } catch (e) {}
  const b = ev.currentTarget, o = b.innerHTML;
  b.innerHTML = '복사됨'; setTimeout(() => { b.innerHTML = o; }, 1200);
}
