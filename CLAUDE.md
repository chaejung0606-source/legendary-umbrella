# 작업 규칙 (사업단 자산관리 플랫폼)

## 배포 규칙 (중요)
- 모든 커밋은 먼저 **작업 브랜치 `claude/asset-management-platform-connection-5efppb`에 푸시**한다 → Vercel **Preview**.
- **QA 가 전부 통과하면 매번 따로 확인받지 않고 바로** 프로덕션 브랜치
  `claude/asset-management-platform-pvcyfm`(Vercel Production 추적)에 fast-forward 병합 후 푸시한다.
- **QA 가 하나라도 실패하면 배포하지 않는다.** 실패 항목과 원인을 보고하고 작업 브랜치에서 멈춘다.
  실패가 제품 결함이 아니라 테스트 하니스 문제로 밝혀진 경우에는 근거를 제시하고, 고쳐 다시 돌린 뒤 진행한다.
- 여기서 "QA 전부"는 아래 **QA 계정 · 테스트 스위트** 절의 로컬 스위트 5종과 로컬 스모크를 말한다.
- 다만 **되돌리기 어려운 변경은 QA 통과와 무관하게 먼저 알리고 확인을 받는다** —
  스키마 변경 · 데이터 마이그레이션 · 환경변수 추가나 변경 · 시드 재생성처럼 운영 데이터에 영향이 가는 작업.

## 스택 / 구조
- Next.js 15(App Router) · TypeScript · Tailwind · Prisma + PostgreSQL(Supabase, `sadan` 전용 스키마)
- 배포: Vercel. 환경변수 `DATABASE_URL`(6543 pgbouncer) · `DIRECT_URL`(5432) · `AUTH_SECRET`
- build 스크립트는 `scripts/db-prepare.ts`로 DB 연결을 먼저 확인한 뒤
  `prisma db push` + `seed`(테이블 비어있을 때만 — 편집 데이터 보존)를 수행한다.
  연결 자체가 안 되면 경고만 남기고 빌드는 계속한다(DB 장애로 배포가 통째로 막히지 않도록).
  연결 실패도 빌드 실패로 처리하려면 `DB_PREPARE_STRICT=1`
- 데이터 계층: `src/data/index.ts`(조회, async) · `src/data/mutations.ts`(쓰기) · 서버 액션 `src/app/actions.ts`
- 인증: 로그인(/) + JWT 쿠키 세션 + `src/middleware.ts`가 메뉴별 권한 강제
  (단, `/api/sheets/*`는 구글시트 IMPORTDATA 연동을 위해, `/api/health`는 로그인 불가 상황 진단을 위해
   공개 유지 — 인증 뒤로 숨기지 말 것. health 응답에 접속정보/호스트를 담지 말 것)
- **미들웨어 matcher 는 화면 경로만 보호한다.** `/api/*` 와 서버 액션은 각자 세션을 직접 확인해야 한다
  (`/api/export/*`는 로그인+메뉴 권한, 서버 액션은 `requireManager()`/`requireLogin()`).
  조회만 하는 액션도 예외 없이 — 서버 액션은 화면 경로와 무관하게 호출될 수 있다.
- `/api/sheets/*`는 구조상 공개지만 대여 시트에 개인정보가 있다. `SHEETS_ACCESS_KEY` 를 설정하면
  `?key=` 가 맞는 요청만 통과하고, 설정 화면의 IMPORTDATA 수식에도 키가 자동으로 붙는다.
- **"오늘"은 반드시 `src/lib/date.ts` 의 `todayKst()`** 를 쓴다. `pools.SEED_TODAY` 는 더미/시드
  생성의 결정성 확보 전용 고정값이므로 런타임 저장·표시에 쓰면 날짜가 과거에 멈춘다.
- `/api/health`는 keep-alive도 겸한다 — `vercel.json`의 cron이 매일 호출해 Supabase 무료 플랜의
  자동 일시정지를 막는다. **엔드포인트의 DB 쿼리를 없애면 효과가 사라진다.**
  cron은 **Production 배포에서만** 동작하므로 프로덕션 브랜치에 병합돼야 효력이 생긴다.
- 디자인: 무광 세라믹(아이보리·민트) 토큰 기반 — `globals.css` :root + `tailwind.config.ts`(brand/pastel/ceramic)

## 푸시 전 체크
- `npm run lint` 통과(경고 0 유지) · `npx tsc --noEmit` 통과
- `npm run build` 통과(로컬 DB 필요 시 Postgres 기동) · 주요 화면 콘솔 에러/404 없음
- `.env` 커밋 금지
- 시드 계정은 **관리자 1개뿐**이며 계정 테이블이 비어 있을 때만 생성된다
  (기본 `admin@sadan.local` / `admin1234`, `SEED_ADMIN_EMAIL`·`SEED_ADMIN_PASSWORD`·`SEED_ADMIN_NAME`로 덮어쓰기 가능).
  `manager@sadan.local`·`auditor@sadan.local`은 DB 연동 이전 인메모리 생성기(`src/data/generate.ts`)의 잔재이며 실제로 존재하지 않는다.
- 비밀번호는 **bcrypt 해시로만 저장**한다(`src/lib/password.ts`). 평문 저장 코드를 다시 넣지 말 것.
  전환 전 평문 계정은 로그인 성공 시 자동으로 해시로 교체되고,
  남은 계정은 `npm run db:hash-passwords`로 일괄 변환한다(멱등).

## 푸시 후 자동 QA (사용자 요청 없어도 필수)
- 코드 변경을 푸시한 뒤에는 **항상** Playwright 클릭테스트(로그인·변경 기능 플로우·권한·회귀)를
  로컬에서 실행하고 결과(N/N PASS)를 보고한다.
- 보고에는 **사용자가 직접 확인해야 할 사항 체크리스트**(프리뷰/프로덕션 주소에서 볼 것,
  계정, 순서)를 정리해 포함한다.
- 문서/주석만 바뀐 푸시는 클릭테스트 생략 가능(빌드 확인은 유지).

## QA 계정 · 테스트 스위트 (상시)
- **상시 QA 계정은 `smoke@e2e.local`** (역할 자산담당자 = 설정 제외 6개 메뉴).
  설정 > 계정/권한에서 관리하며 **삭제하지 않는다**. 비밀번호는 저장소에 적지 않고
  실행할 때 `E2E_ADMIN_PW` 로 넘긴다.
- 기능이 바뀌면 **로컬 빌드**(`npm run build && npx next start -p 3100`)에 대고 아래 스위트를 전부 돌린다.
  쓰기 테스트가 섞여 있으므로 **운영 DB 에는 절대 돌리지 않는다.**

| 스위트 | 케이스 | 사전 준비 |
|---|---|---|
| `applicant` | 53 | `npm run db:seed-e2e` |
| `manager-regression` | 21 | — |
| `session-recovery` | 13 | `.env` 의 `AUTH_SECRET` 을 스크립트가 직접 읽는다 |
| `password-hashing` | 13 | 앱과 같은 `DATABASE_URL` |
| `api-guard` | 32 | 앱과 같은 `DATABASE_URL` |

- **배포된 주소(프리뷰·프로덕션)에는 읽기 전용 스모크만** 돌린다. 데이터를 만들지 않으므로 운영에 안전하다.
  ```bash
  E2E_BASE=<주소> E2E_ADMIN=smoke@e2e.local E2E_ADMIN_PW=… npm run e2e:smoke
  ```
  자산담당자 권한이면 설정 화면 1건이 SKIP 되어 **60/61 이 정상**이다. 관리자 권한이면 61/61.
- 순서: 로컬 전체 통과 → 작업 브랜치 푸시 → 프리뷰 스모크 → 프로덕션 병합 → 프로덕션 스모크.
  QA 가 실패하면 작업 브랜치에서 멈추고 배포하지 않는다.
