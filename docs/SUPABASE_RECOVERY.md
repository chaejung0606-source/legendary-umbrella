# Supabase 복구 / 재연결 절차

DB 접속이 끊겨 로그인이 "서버에 연결하지 못했습니다"로 실패하거나,
빌드 로그에 `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found` 가 뜰 때 쓰는 문서.

접속 정보는 **환경변수로만** 다룬다. 저장소에 접속 문자열·비밀번호를 넣지 않는다.

---

## 0. 어떤 상황인지 먼저 가른다

Supabase 대시보드(https://supabase.com/dashboard) 프로젝트 목록을 연다.

| 화면 | 상황 | 가야 할 곳 |
|---|---|---|
| 프로젝트가 **Paused** 로 보임 | 무료 플랜 자동 일시정지(약 7일 비활성) | [A. 일시정지 복구](#a-일시정지된-경우) |
| 프로젝트가 **목록에 없음** | 삭제됨 | [B. 새 프로젝트](#b-삭제된-경우--새-프로젝트-생성) |
| 프로젝트는 정상인데 접속 실패 | 환경변수의 ref/비밀번호가 낡음 | [C. 환경변수](#c-vercel-환경변수-설정) 부터 |

### 터미널로 빠르게 판별하는 법

```bash
# 프로젝트가 살아 있으면 주소가 조회된다. 아무것도 안 나오면 삭제된 것.
getent hosts <project-ref>.supabase.co
```

일시정지 상태는 보통 DNS 가 남아 있고, 삭제된 프로젝트는 조회 자체가 실패한다.

---

## A. 일시정지된 경우

1. 대시보드 → 해당 프로젝트 → **Restore project**
2. 복구까지 몇 분 걸린다. 상태가 Active 로 바뀔 때까지 기다린다.
3. **접속 문자열은 그대로다** → Vercel 환경변수를 바꿀 필요 없이 [D. 재배포](#d-재배포--확인) 로 간다.

---

## B. 삭제된 경우 — 새 프로젝트 생성

### B-1. 프로젝트 만들기

1. 대시보드 → **New project**
2. **Region: Northeast Asia (Seoul) — ap-northeast-2**
   `vercel.json` 이 배포 리전을 `icn1`(서울)로 고정하고 있어 같은 지역이어야 지연이 최소다.
3. **Database Password** — 생성 후 **안전한 곳에 따로 보관한다. 다시 볼 수 없다.**
4. 생성 완료까지 2~3분 기다린다.

### B-2. 접속 문자열 복사

프로젝트 → **Connect** → **ORMs** 탭 → **Prisma** 선택.
두 줄이 나온다. `[YOUR-PASSWORD]` 를 B-1 에서 만든 비밀번호로 바꾼다.

| 변수 | 포트 | 용도 |
|---|---|---|
| `DATABASE_URL` | **6543** (`?pgbouncer=true` 포함) | 런타임 쿼리 — 풀링 |
| `DIRECT_URL` | **5432** | `prisma db push` — 직접 연결 |

> **비밀번호에 특수문자가 있으면 URL 인코딩해야 한다.**
> `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`, `#` → `%23`
> 인코딩을 빠뜨리면 접속 문자열이 잘못 해석돼 원인 찾기 어려운 실패가 난다.

### B-3. 스키마는 만들 필요 없다

이 앱은 테이블을 `sadan` 전용 스키마에 격리한다(`prisma/schema.prisma` 의 `schemas = ["sadan"]`).
**빈 DB 에 `prisma db push` 를 돌리면 `sadan` 스키마와 13개 테이블이 자동 생성된다** (검증 완료).
Supabase SQL 편집기에서 미리 만들 것은 없다.

---

## C. Vercel 환경변수 설정

Vercel → 프로젝트 → **Settings → Environment Variables**

| 변수 | 값 | 비고 |
|---|---|---|
| `DATABASE_URL` | B-2 의 6543 주소 | 필수 |
| `DIRECT_URL` | B-2 의 5432 주소 | 필수 |
| `AUTH_SECRET` | `openssl rand -base64 32` 결과 | 필수 |
| `SEED_ADMIN_EMAIL` | 원하는 관리자 이메일 | 선택 |
| `SEED_ADMIN_PASSWORD` | 원하는 초기 비밀번호 | 선택 |
| `SEED_ADMIN_NAME` | 관리자 표시 이름 | 선택 |

**Production 과 Preview 를 모두 체크한다.** 한쪽만 넣어서 다른 쪽이 계속 실패하는 경우가 잦다.

- `AUTH_SECRET` 을 바꾸면 기존 로그인 세션이 전부 무효가 된다. 다시 로그인하면 되고,
  로그인 화면은 안내와 함께 정상적으로 뜬다(v3.2.1 에서 처리).
- `SEED_ADMIN_*` 을 설정하면 **계정 테이블이 비어 있는 첫 빌드**에 그 계정이 관리자로 생성된다.
  설정하지 않으면 `admin@sadan.local` / `admin1234` 로 만들어진다.
- 비밀번호는 bcrypt 해시로 저장된다(`src/lib/password.ts`). 평문으로 DB 에 남지 않는다.

> 환경변수는 저장만으로 반영되지 않는다. **반드시 재배포해야 한다.**

---

## D. 재배포 & 확인

1. Vercel → **Deployments** → 최신 배포 → **Redeploy**
2. **빌드 로그**에서 다음이 보여야 한다:

   ```
   🚀  Your database is now in sync with your Prisma schema.
   ✓ assets 906 · loans 45 · consumables 9 · seats 15 · categories 10 · buildings 238
   ✓ 기본 관리자 계정 생성 (accounts 비어 있었음)
   Seed done.
   ```

   대신 아래 경고가 뜨면 접속 문자열이 여전히 틀린 것이다
   (빌드는 통과하지만 DB 는 비어 있는 상태로 배포된다):

   ```
   DB 에 연결하지 못했습니다 — 스키마 반영(db push)과 시드를 건너뜁니다.
   ```

3. **`/api/health`** 를 브라우저로 연다 — 로그인 없이 확인할 수 있다.

   ```jsonc
   { "ok": true,  "db": "연결됨", "accounts": 1 }   // 정상
   { "ok": false, "db": "연결 실패" }                 // 아직 안 됨
   ```

4. 로그인 → **비밀번호를 바로 변경**하고, 설정 > 계정/권한에서 실사용 계정을 만든다.

---

## E. 자주 걸리는 지점

| 증상 | 원인 |
|---|---|
| `Tenant or user not found` | 프로젝트 ref 가 없음(삭제/일시정지) 또는 리전이 다른 pooler 주소 |
| 인증은 되는데 쿼리가 실패 | `DATABASE_URL` 에 `?pgbouncer=true` 누락 |
| 원인 불명 접속 실패 | 비밀번호 특수문자를 URL 인코딩하지 않음 |
| Preview 만 되고 Production 은 실패 | 환경변수를 한쪽 환경에만 등록 |
| 환경변수를 고쳤는데 그대로 | 재배포를 안 함 |
| 포트 혼동 | 6543 = `DATABASE_URL`(풀링), 5432 = `DIRECT_URL` |
| 예전 `db.<ref>.supabase.co` 주소로 실패 | 직접 연결은 IPv6 전용이라 Vercel 에서 안 된다. **pooler 주소를 쓴다.** |

---

## E-2. 자동 일시정지 예방 (keep-alive)

무료 플랜은 일정 기간 요청이 없으면 프로젝트를 일시정지한다.
이를 막기 위해 **매일 `/api/health` 를 호출하는 Vercel Cron** 을 걸어 두었다.

```jsonc
// vercel.json
"crons": [{ "path": "/api/health", "schedule": "0 3 * * *" }]  // 매일 03:00 UTC = 12:00 KST
```

`/api/health` 는 `SELECT 1` 과 계정 수 조회를 실제로 실행하므로 DB 활동으로 잡힌다.

**주의할 점**

- **Cron 은 Production 배포에서만 동작한다.** Preview 배포에서는 실행되지 않으므로,
  프로덕션 브랜치(`claude/asset-management-platform-pvcyfm`)에 병합해야 효력이 생긴다.
- 동작 확인: Vercel → 프로젝트 → **Cron Jobs** 탭에서 다음 실행 시각과 최근 실행 결과를 볼 수 있다.
- `/api/health` 에서 DB 쿼리를 없애면 keep-alive 효과도 사라진다(단순 200 응답은 DB 활동이 아니다).
- Hobby 플랜의 cron 개수·주기 제한은 정책이 바뀔 수 있으니 Vercel 설정 화면에서 확인한다.
- **이미 일시정지된 뒤에는 cron 이 깨우지 못한다.** 복구는 대시보드에서 수동으로 해야 한다(A 절).

---

## F. 기존 데이터는 어떻게 되나

- **삭제된 프로젝트는 되돌릴 수 없다**(백업이 없다면).
- 자산 906건·분류·건축물 등 **기준 데이터는 `prisma/seed-data.json` 에서 자동 복원**된다.
- 다만 **배포 후 앱에서 편집·생성한 내용**(대여/반납 기록, 홍보 수불, 추가한 계정 등)은
  시드에 없으므로 복원되지 않는다.
- 앞으로를 위해: Supabase 대시보드에서 정기 백업을 켜두고,
  무료 플랜이면 일시정지를 피하도록 주기적으로 접속하거나 유료 플랜을 고려한다.

---

## G. 로컬에서 먼저 검증하고 싶다면

```bash
# .env 에 새 접속 문자열을 넣고 (커밋 금지)
npm run build          # db push + seed 까지 수행
npx next start -p 3100
curl -s localhost:3100/api/health
```

`{"ok":true,...}` 가 나오면 같은 값을 Vercel 에 넣으면 된다.
