# 사업단 자산관리 플랫폼

자산 원장·대여/반납·연구재료(소모품)·홍보물품 수불을 한 곳에서 관리하는 업무용 웹 플랫폼입니다.
무광 세라믹(아이보리·민트) 톤의 대시보드에 실제 자산관리대장 데이터를 그대로 담았습니다.

## 기술 스택
- **Next.js 15** (App Router) · TypeScript · Tailwind CSS · shadcn 스타일 UI
- **Prisma + PostgreSQL** (Supabase, 앱 전용 `sadan` 스키마로 격리)
- lucide-react 아이콘 · recharts 차트 · xlsx (엑셀 입출력) · jose (JWT 세션) · bcryptjs
- 배포: Vercel (서울 리전 `icn1`)

## 실행 방법
```bash
npm install

cp .env.example .env          # DATABASE_URL · DIRECT_URL · AUTH_SECRET 채우기
npm run db:push               # 스키마 반영
npm run db:seed               # 기준 데이터 + 관리자 계정 (테이블이 비어 있을 때만)

npm run dev                   # http://localhost:3000
npm run build && npm start    # 프로덕션 빌드 확인
```
`npm run build` 는 `scripts/db-prepare.ts` 로 DB 연결을 먼저 확인한 뒤 `db push` + `seed` 를 수행합니다.
연결이 안 되면 경고만 남기고 빌드는 계속하므로, DB 장애가 배포 전체를 막지 않습니다
(`DB_PREPARE_STRICT=1` 로 두면 빌드 실패로 처리).

## 화면 (라우트)
| 경로 | 화면 |
| --- | --- |
| `/` | 로그인 |
| `/welcome` | 소개 랜딩 |
| `/dashboard` | 대시보드 (통계 카드, 월별 막대/대분류 도넛, 최근·반납예정·RFID 리스트) |
| `/assets` | 자산 원장 (검색·필터, 숫자형 페이지네이션, 단일/복수 등록, 엑셀 다운로드) |
| `/assets/[id]` · `/assets/new` · `/assets/[id]/edit` | 자산 상세 / 등록 / 수정 |
| `/loans` | 대여 관리 (전체 자산 대여·반납 현황) |
| `/loans/new` · `/loans/return` | 대여 신청서 / 반납 신청서 (독립 페이지, 복수 자산 선택 + 드로잉 서명) |
| `/laptop-loans` | 노트북 대여현황 |
| `/consumables` | 연구재료/소모품 (물품 등록, 입·출고, 재고 조정) |
| `/promo` · `/promo/[id]` | 홍보물품 관리 · 수불관리대장 |
| `/rfid` | RFID/태그 관리 |
| `/settings` | 설정 (계정·권한 / 기준정보 / 구글시트 연동 / RFID 연동) |

## 로그인 / 계정 / 권한
- 첫 화면(`/`)이 로그인입니다. 계정에 부여된 **메뉴별 권한**에 있는 메뉴만 사이드바에 표시되고,
  권한 없는 경로로 직접 접근하면 접근 가능한 첫 메뉴로 리다이렉트됩니다.
- `src/middleware.ts` 가 화면 경로를 보호하고, 세션은 서명된 쿠키(JWT, `jose`)로 관리합니다(`AUTH_SECRET`).
- **미들웨어는 화면 경로만 보호합니다.** `/api/*` 와 서버 액션은 각자 세션을 직접 검증합니다
  — `/api/export/*` 는 로그인 + 해당 메뉴 권한, 서버 액션은 `requireManager()` / `requireLogin()`.
- 비밀번호는 **bcrypt 해시로만** 저장합니다(`src/lib/password.ts`). 예전 평문 계정은 첫 로그인 때
  자동으로 해시로 바뀌고, 남은 계정은 `npm run db:hash-passwords` 로 일괄 변환합니다.
- 시드 계정은 **관리자 1개뿐**이며 계정 테이블이 비어 있을 때만 생성됩니다
  (기본 `admin@sadan.local` / `admin1234` — `SEED_ADMIN_*` 환경변수로 변경).
- 설정 → 계정/권한에서 계정 생성·수정·삭제와 메뉴별 권한을 관리합니다.
  역할(관리자/자산담당자/일반사용자/감사) 선택 시 권한 프리셋이 자동 적용됩니다.

## 날짜 처리
앱이 말하는 "오늘"은 항상 **한국 시간(KST)** 기준이며 `src/lib/date.ts` 의 `todayKst()` 로만 구합니다.
서버는 UTC 로 동작하므로 이걸 지키지 않으면 09:00(KST) 이전에 기록한 대여·수불 일자가 하루 밀립니다.
`src/data/pools.ts` 의 `SEED_TODAY` 는 더미/시드 생성의 결정성 확보 전용 고정값이니 런타임에서 쓰지 마세요.

## 구글시트 로우데이터 연동 (`/settings` → 구글시트 연동)
API 키·서비스 계정 없이 구글시트의 `IMPORTDATA` 함수로 연동합니다.
- CSV 엔드포인트: `/api/sheets/assets` · `/api/sheets/loans` · `/api/sheets/materials` · `/api/sheets/promo`
- 구글시트 A1 셀에 `=IMPORTDATA("<배포주소>/api/sheets/assets")` 를 넣으면 구글이 주기적으로
  (열 때마다·약 1시간) 최신 CSV 를 가져가 자동 반영합니다. 설정 화면에서 수식을 복사할 수 있습니다.
- 구글 서버가 접근해야 하므로 **외부 공개 URL**(배포 주소)이어야 합니다. 로컬 주소로는 동작하지 않습니다.
- 로그인 없이 열리는 구조라 대여 시트의 개인정보(이름·소속·사번/학번·전화번호)가 그대로 노출됩니다.
  환경변수 `SHEETS_ACCESS_KEY` 를 설정하면 `?key=` 가 맞는 요청만 통과하고, 설정 화면의 수식에도
  키가 자동으로 붙습니다. (미설정 시 기존처럼 공개)

## 상태 점검 — `/api/health`
로그인 없이 열리는 진단 엔드포인트입니다. DB 연결 여부, 계정 수, `AUTH_SECRET` 설정 여부를 돌려줍니다
(접속 문자열·호스트 등 내부 정보는 담지 않습니다). `vercel.json` 의 cron 이 매일 호출해 Supabase 무료
플랜의 자동 일시정지도 함께 막습니다 — **엔드포인트의 DB 쿼리를 없애면 keep-alive 효과가 사라집니다.**
`auth` 가 `"기본값(위험)"` 이면 배포 환경에 `AUTH_SECRET` 이 없어 저장소에 공개된 기본 시크릿으로
세션에 서명하고 있다는 뜻이므로, 즉시 환경변수를 설정해야 합니다.

## 관리번호 생성 규칙과 기준정보
```
관리번호 = "[" + 연번 + "]" + 취득일(yyyyMMdd) + 분류코드 + 번호 + 건축물코드
예) [1]202407315011B0000142
```
- **분류코드**는 기준정보의 `자산분류 코드`(대분류→중분류), **건축물코드**는 `건축물 코드`에서 가져옵니다.
- `/settings` → 기준정보 관리에서 추가·수정·삭제하면 자산 등록 화면의 선택지와 관리번호 자동 생성에
  즉시 반영됩니다.
- 가져온 값은 `lockedManagementNo`, 계산값은 `generatedManagementNo` 에 저장하고 둘이 다르면 경고를 띄웁니다.

## 코드 구조
- `src/data/index.ts` — 조회(async) + 집계 selector (대시보드 지표는 전부 여기서 계산)
- `src/data/mutations.ts` — 쓰기 (재고 변경은 Serializable 트랜잭션)
- `src/app/actions.ts` — 서버 액션 (권한 재검증 포함)
- `src/lib/excel/parse.ts` — 자산관리대장 엑셀 파서/검증
- `prisma/seed.ts` + `prisma/seed-data.json` — 실제 대장 기준 시드 (테이블이 비어 있을 때만 실행)

## 검사 / 테스트
```bash
npm run lint          # ESLint (경고 0 유지)
npx tsc --noEmit      # 타입 검사
npm run build         # 프로덕션 빌드

# Playwright 클릭테스트 — 자세한 실행 방법은 e2e/README.md
node e2e/applicant.e2e.mjs           # 신청자 종합
node e2e/manager-regression.e2e.mjs  # 관리자 회귀
node e2e/session-recovery.e2e.mjs    # 세션 복구
node e2e/password-hashing.e2e.mjs    # 비밀번호 해싱
node e2e/api-guard.e2e.mjs           # API/서버액션 인증 가드
E2E_BASE=https://<배포주소> npm run e2e:smoke   # 배포 스모크(읽기 전용, 프리뷰/프로덕션에 직접)
```
