# IzaCare (이자카야 매장관리)

> **AI 재고 실사 + 입고·폐기 관리 + 위치 기반 근태 + 예약·일보·공지 통합 매장관리 서비스**
> AI在庫棚卸し + 入庫・廃棄管理 + 位置ベース勤怠 + 予約・日報・お知らせ 統合店舗管理サービス

"IzaCare" = 이자카야(居酒屋) + Care. 사진 몇 장으로 끝나는 재고 실사부터 알바 출퇴근, 예약, 마감 일보까지 매장 운영을 한 화면에서 잇습니다.

> 팀장이 도쿄 워킹홀리데이 중 이자카야 아르바이트에서 겪은 **중복 예약, 뒤늦게 알아챈 재료 소진, 교대 근무 간 인수인계 누락**에서 출발한 프로젝트입니다. → [기획서](docs/01-기획서.md)

---

## 무엇을 해결하나

- 재고 실사를 하려면 냉장고·주류고·창고를 돌며 **병 하나하나 손으로 세고 엑셀에 옮겨 적어야 한다** → **사진 촬영 → AI 인식 → 검토/보정 → 확정** 4단계 AI 실사
- 장부 재고와 실물 재고가 어긋나도 **폐기·파손·도난 중 무엇 때문인지 추적이 안 된다** → 입고/폐기(사유 필수)/실사 조정을 모두 **변동 이력**으로 기록
- 알바가 **매장 밖에서 출근을 찍어도 사장님이 알 방법이 없다** → GPS + 매장 Wi-Fi IP 기반 **출근 위치 확인** (차단이 아닌 기록)
- 예약·근태·일보·공지가 **카톡, 메모, 노트에 흩어져 있다** → 하나의 웹앱(SPA)에서 통합 관리

## 핵심 기능

| 모듈 | 내용 |
|---|---|
| **매장·인증** | 사장 가입 시 매장 등록 + 6자리 가게 코드 발급(재발급 가능), 직원은 가게 코드로 가입 → 사장 승인, BCrypt 해싱, 10분 내 5회 실패 시 아이디·IP 단위 10분 잠금, 매장 간 데이터 격리 |
| **직원 관리** | 가입 승인·거절, 퇴직·복직 처리 (퇴직 즉시 세션 API 차단) |
| **재고** | 품목 등록, 입고(신규 품목 동시 등록), 폐기(사유 필수), 재고 부족 판정·색상 표시, 카드 액션 시트로 즉시 수량 조정, 모든 변동 이력 기록 |
| **AI 실사** ⭐ | 다중 사진(최대 8장) 한 번에 인식, 품목명 3단계 매칭, 신뢰도 필터, DRAFT 검토·보정, 확정 시 차이 품목만 조정, 미등록 품목 자동 등록, 사진·AI 응답 원본 보관 |
| **예약** | 날짜·시간·인원·코스 지정, 실제 매장 배치 좌석 맵, 단체 다중 테이블 배정, 중복 예약 방지, 공석 처리 + 코스 시간 경과 시 자동 공석(1분 스케줄러) |
| **근태·스케줄** | 출근·휴게·퇴근 기록, GPS + 매장 Wi-Fi IP 위치 확인, 영업일 기준 근무일(자정 넘김 대응), 근무 스케줄 등록, 공지·예약·근무 통합 월 달력 |
| **일보·공지** | 일보 작성·수정·댓글(수정 이력 보존), 공지 등록·수정 이력·확인 체크(확인자 명단) |
| **대시보드·알림** | 사장 대시보드(오늘 예약·부족 품목·근무 중 인원), 재고 부족 실시간 파생 알림 + 이벤트 알림(예약·공지·일보·폐기·가입 등) |
| **가게 설정** | 영업 시간, 테이블·코스 관리, 출근 판정 좌표·반경·매장 Wi-Fi IP |

> 기능 요구사항 73건 / 비기능 요구사항 24건 전체는 [요구사항 정의서](docs/02-요구사항정의서.md) 참고.

## 기술 스택

| 계층 | 기술 |
|---|---|
| 언어/런타임 | Java 21 |
| 프레임워크 | Spring Boot 3.3.5 (Web MVC · Data JPA · Validation) |
| 보안 | spring-security-crypto (BCrypt 해싱만 사용) |
| 빌드 | Gradle (Groovy DSL) |
| 프론트 | 순수 HTML + Vanilla JS 단일 페이지(`index.html`) + 공용 `app.css` 디자인 시스템 — 프레임워크·노드 빌드 없음 |
| 디자인 | Figma 시안 → 직접 구현 |
| DB | H2 (파일 모드, `./data/izacare`) |
| AI | Google Gemini Vision (기본 `gemini-3.5-flash`) / Mock — `VisionAiClient` 인터페이스로 교체 가능 |
| 테스트 | JUnit 5 (spring-boot-starter-test) |

## 빠른 시작

### 1. 실행

```bash
./gradlew bootRun        # 또는 gradle bootRun
```

- 접속: http://localhost:8080
- 데이터는 `./data/` 아래에 남습니다 (H2 파일 DB + 실사 사진). 초기화하려면 `data/`를 지우고 다시 실행하세요.
- 시연용 초기 품목 9개가 자동 등록됩니다.

### 2. 데모 계정

| 역할 | 아이디 / 비밀번호 |
|---|---|
| 사장님 | `boss` / `1234` |
| 알바생 | `staff` / `1234` |
| 승인 대기 | `pend` / `1234` |

### 3. (선택) AI 키 설정

```bash
# src/main/resources/secret.yml (git 미추적) 의 api-key 에 Google AI Studio 키 입력
# 또는 환경변수로:
VISION_PROVIDER=gemini GEMINI_API_KEY=발급받은키 ./gradlew bootRun
```

- 키가 없으면 **mock 모드**로 동작 — 수량 오차, 미등록 품목 인식까지 시뮬레이션되어 전체 플로우 시연 가능.
- 모델 변경: `GEMINI_MODEL` 환경변수. (최신 `gemini-3.7-flash`는 혼잡으로 503이 잦아 기본값에서 제외)

### 4. (선택) H2 콘솔

```bash
H2_CONSOLE=true ./gradlew bootRun   # http://localhost:8080/h2-console
```

JDBC URL `jdbc:h2:file:./data/izacare` · 사용자 `sa` · 비밀번호 없음.
> ⚠️ 인증 없이 DB 전체를 열람·수정할 수 있으므로 **배포 환경에서는 켜지 마세요.** 앱이 파일을 잠그므로 외부 DB 툴은 앱 실행 중 접속 불가.

## 테스트

```bash
./gradlew test
```

## AI 실사 — 설계 포인트

```
사진 촬영(여러 장) → AI 인식 → 검토/보정(DRAFT) → 확정(재고 반영)
```

| 포인트 | 내용 |
|---|---|
| **제안값 검토 방식** | AI 카운팅은 오차가 있으므로 바로 재고에 쓰지 않고 DRAFT에 담아 사람이 검토·보정 후 확정. 차이(diff)가 있는 품목만 `AUDIT_ADJUST` 이력과 함께 조정 → 장부-실물 불일치 추적 |
| **다중 사진 병합** | 같은 품목이 여러 사진에 나오면 수량은 합산, 신뢰도는 낮은 쪽을 남겨 한 줄로 병합 (중복 라인은 같은 품목을 두 번 조정하는 버그 원인) |
| **업로드 전 축소** | 브라우저에서 긴 변 1280px JPEG로 축소 — 폰 원본(3~5MB) 대비 업로드·AI 호출 속도 개선, 병 개수 세기엔 충분 |
| **신뢰도 임계값** | `vision.confidence-threshold`(기본 0.5) 미만 결과 자동 제외 |
| **사진 원본 보관** | `vision.image-dir`(기본 `./data/audit-images`) — 수량 분쟁 시 조정 근거 |
| **AI 교체 가능 구조** | `VisionAiClient` 인터페이스 뒤에 Gemini/Mock 구현체, `vision.provider`로 스위칭 |
| **미등록 품목 자동 등록** | 확정 시 신규 품목(분류: 미분류)으로 등록, 인식 수량을 초기 재고로 반영 |

## 출근 위치 확인 — 설계 포인트

> 알바가 집에서 출근을 찍는 걸 막기 위한 장치. **차단이 아니라 기록한다.**

- **GPS 또는 매장 Wi-Fi IP 중 하나만 맞아도 정상** — 실내·지하는 GPS가, LTE 접속은 IP가 안 맞으므로 서로의 빈틈을 메움.
- 둘 다 못 맞춰도 출근은 처리하고 `⚠ 매장 밖에서 출근 · 1.2km` 처럼 기록 → 사장님 대시보드에 표시. GPS 오차로 진짜 출근한 직원이 못 찍으면 급여 문제가 되기 때문.
- **좌표는 저장하지 않는다.** 매장까지의 거리(m)와 판정 결과만 저장 — 근로자 개인위치정보 보관 회피.
- 설정: 가게 설정 화면에서 매장 안, 매장 Wi-Fi에 연결한 채 "현재 위치로 설정" + "현재 IP로 설정". 기본 반경 200m.
- 한계: 브라우저 위치 API는 HTTPS(또는 localhost)에서만 동작. Mock location 앱을 이용한 작정한 위조는 막지 못함.

## API 요약

> 주요 API만 추렸습니다. 전체 71개 명세와 에러 코드는 [화면 설계서 › REST API 명세](docs/03-화면설계서.md#3-1-rest-api-명세) 참고.

| Method | URL | 설명 |
|---|---|---|
| GET | `/api/items` | 재고 목록 (재고 부족 여부 포함) |
| POST | `/api/items` | 품목 등록 |
| POST | `/api/inbound` | 입고 (수량 증가 + 이력) |
| POST | `/api/dispose` | 폐기 (수량 감소 + 사유 필수) |
| GET | `/api/transactions` | 최근 변동 이력 |
| POST | `/api/audits/scan` | 사진 업로드(images, 여러 장) → AI 인식 → DRAFT 실사 생성 |
| GET | `/api/audits/{id}/images/{index}` | 실사에 쓰인 사진 원본 |
| PATCH | `/api/audits/{id}/lines/{lineId}` | 오인식 수량 수동 보정 |
| POST | `/api/audits/{id}/confirm` | 실사 확정 → 차이 나는 품목만 재고 조정 |
| POST | `/api/audits/{id}/cancel` | 실사 취소 |
| POST | `/api/attendance/clock` | 출퇴근 기록 (출근 시 latitude/longitude 선택) |
| PATCH | `/api/store/attendance-location` | 매장 좌표·반경 설정 (사장님) |
| POST · DELETE | `/api/store/attendance-ip` | 현재 접속 IP를 매장 Wi-Fi로 등록 / 해제 (사장님) |

## 프로젝트 구조

```
izakaya-inventory-Prototype-/
├── README.md
├── build.gradle
├── docs/                          # 기획·설계 문서 (기획서, 요구사항, 화면 설계, ERD, WBS)
├── data/                          # (git 미추적) H2 파일 DB + 실사 사진
└── src/
    ├── main/
    │   ├── java/com/izacare/
    │   │   ├── IzaCareApplication # 진입점
    │   │   ├── domain/            # FoodItem, StockTransaction, StockAudit, Reservation, Member ...
    │   │   ├── repository/        # Spring Data JPA
    │   │   ├── service/           # InventoryService(입고/폐기), AuditService(AI 실사), NotificationService
    │   │   ├── vision/            # VisionAiClient 인터페이스 + Gemini/Mock 구현체
    │   │   ├── web/               # REST 컨트롤러 + 전역 예외 처리
    │   │   └── dto/               # 요청/응답 record
    │   └── resources/
    │       ├── static/            # index.html(SPA), app.css(디자인 시스템)
    │       ├── application.yml
    │       └── secret.yml         # (git 미추적) Gemini API 키
    └── test/
```

## 문서

| 문서 | 내용 |
|---|---|
| [00. 공정도 (WBS)](docs/00-공정도-WBS.md) | 8주 간트 차트, 단계별 업무·담당, 계획 대비 실제 진행 |
| [01. 프로젝트 기획서](docs/01-기획서.md) | 기획 배경, 타겟 사용자, MVP, 화면 스케치, 기술 스택 선정 이유, 리스크 |
| [02. 요구사항 정의서](docs/02-요구사항정의서.md) | 기능 요구사항 73건(MoSCoW), 비기능 요구사항 24건 + 검증 방법 |
| [03. 화면 설계서](docs/03-화면설계서.md) | 화면 흐름도·전이표, 화면 목록, REST API 명세 71개, 핵심 화면 상세 |
| [04. ERD & 테이블 정의서](docs/04-ERD-테이블정의서.md) | ERD, 테이블 21개 · 컬럼 134개 정의 |

> 문서와 코드가 다르면 코드가 정답입니다. 원본(docx/xlsx)은 [`docs/original/`](docs/original/)에 있습니다.

## 팀 (5조)

| 이름 | 주 담당 | 부 담당 |
|---|---|---|
| **김가현** (조장) | 관리자 대시보드, 전체 일정(통합 달력·근무 스케줄), 알림, 프런트 통합 | 공정도(WBS) 관리, 발표 |
| **강경태** | 인증(가입·로그인·권한), 직원 관리, 매장 설정 | Git 관리 |
| **서태민** | 일보, 공지사항, 출퇴근·출근 위치 확인 | Figma 화면 설계 |
| **유충열** | 예약(좌석 맵·다중 테이블·공석 처리), 테이블·코스 관리 | DB 설계, 배포 |
| **이원준** | 재고(입고·폐기), AI 실사 | 테스트 관리 |

## 개발 규칙

- **브랜치:** 기능별 `feature/*` 브랜치에서 작업 → PR로 `main` 병합.
- **비밀값:** Gemini API 키는 `secret.yml`(git 미추적) 또는 환경변수로만 주입.
- **스키마 변경:** `ddl-auto=update`는 기존 행이 있는 테이블에 기본값 없는 NOT NULL 컬럼을 붙이지 못함 → `columnDefinition`으로 DB 기본값 지정. 컬럼이 늘어나면 Flyway 도입.
- **XSS 방지:** `index.html`에서 HTML을 만들 때는 반드시 `` html`...` `` 태그드 템플릿 사용.
  ```js
  el.innerHTML = html`<span>${item.name}</span>`;  // O
  el.innerHTML = `<span>${item.name}</span>`;      // X — XSS
  ```
  `onclick="fn('${값}')"` 처럼 속성 안 JS 문자열에 사용자 입력 금지 → `data-*` 속성 + `this.dataset` 사용.
- **배포:** 리버스 프록시 뒤에서만 `app.trust-proxy=true`. 프록시 없이 켜면 `X-Forwarded-For` 위조로 로그인 시도 제한이 무력화됨.
