# 작업 규칙 (사업단 자산관리 플랫폼)

## 배포 규칙 (중요)
- 평소 모든 커밋은 **작업 브랜치 `claude/asset-management-platform-connection-5efppb`에만 푸시**한다 → Vercel **Preview** 배포로 확인.
- **사용자가 "배포해줘"라고 명시적으로 요청할 때만** 프로덕션 브랜치
  `claude/asset-management-platform-pvcyfm`(Vercel Production 추적)에 fast-forward 병합 후 푸시한다.
- 절대 자발적으로 프로덕션 브랜치에 푸시하지 않는다.

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
