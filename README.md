# 사업단 자산관리 플랫폼 (MVP 시안)

부드러운 파스텔/라벤더 감성과 실제 업무용 자산관리의 실용성을 함께 담은 웹 플랫폼입니다.
현재 단계는 **디자인 시스템 + 화면 구조(프론트엔드 MVP)** 에 집중하며, 모든 화면은
결정적(seeded) **더미 데이터 생성기**로 동작합니다. 대시보드의 모든 지표는 하드코딩이 아니라
생성된 데이터셋을 **집계해서** 보여줍니다.

## 기술 스택
- Next.js (App Router) · TypeScript · Tailwind CSS · shadcn 스타일 UI
- lucide-react 아이콘 · recharts 차트
- Prisma 스키마(초안) · 개발 DB는 SQLite, 운영은 PostgreSQL 로 전환 가능

## 실행 방법
```bash
# 1) 의존성 설치
npm install

# 2) 개발 서버 (DB 없이 더미 데이터로 즉시 구동)
npm run dev
#   → http://localhost:3000  (자동으로 /dashboard 로 이동)

# 3) 프로덕션 빌드 확인
npm run build && npm start
```

### (선택) Prisma 스키마 적용 — 추후 실연동용
화면은 DB 없이 동작하지만, 데이터 모델 초안을 직접 확인하려면:
```bash
cp .env.example .env          # DATABASE_URL=file:./dev.db
npm run db:push               # 스키마를 SQLite 에 반영
npm run db:seed               # 계정 + 기준정보 일부 시드
npm run db:studio             # Prisma Studio 로 확인
```
> 운영 전환: `prisma/schema.prisma` 의 `provider` 를 `postgresql` 로 바꾸고
> `DATABASE_URL` 만 교체하면 됩니다(네이티브 enum/Decimal 미사용으로 이식성 확보).

## 화면 (라우트)
| 경로 | 화면 |
| --- | --- |
| `/dashboard` | 대시보드 (Hero, 통계 카드, 월별 막대/대분류 도넛 차트, 최근/반납예정/RFID 리스트) |
| `/assets` | 자산 원장 (검색·필터 + 카드형 테이블, 906건/페이지네이션) |
| `/assets/[id]` | 자산 상세 (섹션 카드: 기본·취득·위치/사용·RFID/태그·이력) |
| `/assets/new`, `/assets/[id]/edit` | 자산 등록/수정 (종속 드롭다운 + 관리번호 미리보기) |
| `/imports` | 엑셀 가져오기 (드래그&드롭, 시트 인식, 검증 리포트, 오류 테이블) |
| `/laptop-loans` | 노트북 대여관리 (상태 통계 + 대여/반납 + 반납임박 강조) |
| `/consumables` | 연구재료/소모품 (수량 기반 재고, 부족 강조) |
| `/seats` | 좌석/배치 현황 (A~O 카드, 좌석별 배정 자산, 검토 필요 표시) |
| `/rfid` | RFID/태그 관리 (등록률·태그 분포·미등록 목록) |
| `/reports` | 통계/리포트 |
| `/settings` | 설정 (확장 로드맵) |

## 더미 데이터 구조 (`src/data`)
- `pools.ts` — 생성 규칙(대분류 분포·품목 템플릿·인명/장소 풀·기준 집계값)
- `generate.ts` — 결정적 생성기(906 자산, 45 노트북, 소모품, 좌석 A~O, import job)
- `index.ts` — 데이터셋 싱글턴 + **집계 selector** (대시보드 지표는 전부 여기서 계산)
- `categories.ts` — 자산분류/건축물 기준정보

## 관리번호 규칙 (`src/lib/management-number.ts`)
```
관리번호 = "[" + 연번 + "]" + 취득일(yyyyMMdd) + 분류코드 + 번호 + 건축물코드
예) [1]202407315011B0000142
```
가져온 값은 `lockedManagementNo` 에 보존, 계산값은 `generatedManagementNo` 에 저장하고
둘이 다르면 검증 경고로 표시합니다.

## 참고: 실제 엑셀 파서(보너스)
`src/lib/excel/parse.ts` 는 실제 `자산관리대장.xlsm` 을 파싱·검증하는 순수 모듈로,
초기 검토 단계에서 906건/관리번호 중복 0/RFID 중복 검출을 실측 검증했습니다(`scripts/check-parse.ts`).
현 MVP UI 는 더미 데이터로 동작하며, 이 파서는 다음 단계에서 import 화면과 연결할 수 있습니다.
