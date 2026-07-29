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
- 디자인: 무광 세라믹(아이보리·민트) 토큰 기반 — `globals.css` :root + `tailwind.config.ts`(brand/pastel/ceramic)

## 푸시 전 체크
- `npm run build` 통과(로컬 DB 필요 시 Postgres 기동) · 주요 화면 콘솔 에러/404 없음
- `.env` 커밋 금지 · 데모 계정: admin@sadan.local/admin1234 (manager/auditor 동일 패턴)

## 푸시 후 자동 QA (사용자 요청 없어도 필수)
- 코드 변경을 푸시한 뒤에는 **항상** Playwright 클릭테스트(로그인·변경 기능 플로우·권한·회귀)를
  로컬에서 실행하고 결과(N/N PASS)를 보고한다.
- 보고에는 **사용자가 직접 확인해야 할 사항 체크리스트**(프리뷰/프로덕션 주소에서 볼 것,
  계정, 순서)를 정리해 포함한다.
- 문서/주석만 바뀐 푸시는 클릭테스트 생략 가능(빌드 확인은 유지).
