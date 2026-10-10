# 📁 IzaCare 개발 문서

IzaCare 프로젝트(5조)의 기획·설계 산출물입니다. 각 문서는 GitHub에서 바로 읽을 수 있도록 Markdown으로 옮겼고, 원본 파일은 [`original/`](original/)에 함께 보관합니다.

| No | 문서 | 내용 | 원본 |
|:-:|---|---|---|
| 00 | [공정도 (WBS)](00-공정도-WBS.md) | 8주 일정 간트 차트, 단계별 세부 업무·담당·계획 대비 실제, 기능 상세 분해 | [xlsx](original/00_공정도_WBS.xlsx) |
| 01 | [프로젝트 기획서](01-기획서.md) | 기획 배경, 타겟 사용자, MVP 기능, 화면 스케치, 기술 스택 선정 이유, 역할 분담, 리스크 | [docx](original/01_기획서.docx) |
| 02 | [요구사항 정의서](02-요구사항정의서.md) | 기능 요구사항 73건 (MoSCoW), 비기능 요구사항 24건 (성능·보안·데이터·사용성·호환성·운용) | [xlsx](original/02_요구사항정의서.xlsx) |
| 03 | [화면 설계서](03-화면설계서.md) | 화면 흐름도·전이표, 화면 목록 20개, REST API 명세 71개, 핵심 화면 6개 상세, 공통 UI 규칙 | [docx](original/03_화면설계서.docx) |
| 04 | [ERD & 테이블 정의서](04-ERD-테이블정의서.md) | ERD (Mermaid), 테이블 21개 · 컬럼 134개 정의, 설계 규칙과 예외 근거 | [xlsx](original/04_ERD_테이블정의서.xlsx) |
| 05 | [🎤 최종 발표 자료](05-발표자료.md) | 슬라이드 18장 — 기획 배경, 핵심 기능 4가지, 설계 & 구조, 시연 순서, 다음 단계 | [pptx](original/05_발표자료.pptx) · [pdf](original/05_발표자료.pdf) |

<p align="center">
  <a href="05-발표자료.md"><img src="images/presentation/slide-01.jpg" alt="IzaCare 발표 자료" width="600"></a>
  <br><sub>▲ 클릭하면 발표 자료 전체를 볼 수 있습니다</sub>
</p>

> **문서와 코드가 다르면 코드가 정답입니다.** 코드를 바꾸면 관련 문서도 함께 갱신해 주세요.

```
docs/
├── README.md                  # (이 파일) 문서 목록
├── 00-공정도-WBS.md
├── 01-기획서.md
├── 02-요구사항정의서.md
├── 03-화면설계서.md
├── 04-ERD-테이블정의서.md
├── 05-발표자료.md
├── images/                    # 화면 스케치 · Figma 시안 · 화면 흐름도
│   └── presentation/          # 발표 슬라이드 이미지 (slide-01 ~ 18)
└── original/                  # 원본 docx / xlsx / pptx / pdf
```

---
[← 프로젝트 README](../README.md)
