# 협업 규칙

## 브랜치

| 브랜치 | 용도 |
|---|---|
| `main` | 발표·배포 기준. 직접 push 하지 않고 PR 로만 병합 |
| `feature/<영역>-<내용>` | 기능 추가 (예: `feature/reservation-auto-release`) |
| `refactor/<영역>` | 동작은 그대로 두고 구조만 바꿀 때 (예: `refactor/notice-report-attendance`) |
| `fix/<영역>-<내용>` | 버그 수정 |
| `docs/<내용>` | 문서만 바꿀 때 |

- PR 은 최소 1명이 리뷰하고 승인한 뒤 병합합니다. 담당 영역이 겹치면 그 영역 담당자를 리뷰어로 지정합니다.
- 커밋 메시지는 `종류(영역): 내용` 형식으로 씁니다. 종류는 feat · fix · refactor · docs · test · chore.
  예: `refactor(auth): 인증 관련 클래스를 auth 패키지로 이동`

## 코드 위치와 담당

백엔드는 기능(도메인) 단위 패키지로 나눕니다. 엔티티 · 리포지토리 · 서비스 · 컨트롤러가 같은 패키지에 있습니다.

| 패키지 (`com.izacare.*`) | 화면 스크립트 (`static/js`) | 스타일 (`static/css`) | 담당 |
|---|---|---|---|
| `common.web` · `auth` · `member` · `store` | `core.js` · `auth.js` · `staff.js` · `settings.js` | `base.css` · `settings.css` · `overrides.css` | 강경태 |
| `notification` · `schedule` · `dashboard` | `home.js` · `alert.js` · `calendar.js` | `home.css` · `calendar.css` | 김가현 |
| `notice` · `report` · `attendance` | `notice.js` · `report.js` · `attendance.js` | `notice.css` · `report.css` · `attendance.css` | 서태민 |
| `reservation` | `reservation.js` | `reservation.css` | 유충열 |
| `inventory` · `audit` | `inventory.js` · `audit.js` | `inventory.css` · `audit.css` | 이원준 |

## 화면 코드 규칙

- `index.html` 에는 화면 뼈대와 `<script>` · `<link>` 태그만 둡니다. 화면 로직은 `js/` 의 화면별 파일에 씁니다.
- 스크립트는 `core.js` 를 가장 먼저 읽습니다. 공통 함수(`api`, `html`, `go`, `topbar`, `showMsg` …)는 `core.js` 에만 둡니다.
- 스타일은 `base.css` → 화면별 css → `overrides.css` 순서로 읽습니다. `overrides.css` 는 다른 규칙을 덮어써야 하는 것만 둡니다.
- HTML 을 만들 때는 반드시 `` html`...` `` 태그드 템플릿을 씁니다 (XSS 방지, README 참고).
