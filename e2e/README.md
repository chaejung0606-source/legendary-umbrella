# E2E 테스트 (Playwright)

신청자(user) 역할 종합 시나리오와 관리자 회귀를 실제 브라우저(Chromium)로 검증한다.
`playwright-core`만 사용하므로 별도 `@playwright/test` 설치 없이 Node로 바로 실행한다.

## 전제

1. 앱 구동 (프로덕션 빌드 권장):
   ```bash
   npm run build && npx next start -p 3100
   ```
2. 신청자 테스트 계정 시드 (role=user, permissions=[dashboard,assets,loans,consumables,promo]):
   - 기본값: `applicant@e2e.local` / `test1234`
   - **계정 이름(name)은 반드시 `[E2E-TEST] 신청자`** — 홍보 신청 취소는 `requesterName === 계정 이름`으로
     본인 확인을 하므로, 이름이 다르면 H3/H4 가 실패한다.
   - 비밀번호는 평문 비교이므로 해시가 아닌 평문으로 저장한다.
   - 계정 CRUD(설정 > 계정/권한) 또는 DB로 생성. 운영 계정과 분리된 테스트 전용 계정을 사용한다.
3. DB 연결(`DATABASE_URL`/`DIRECT_URL`)이 설정된 상태.

## 실행

`playwright-core` 는 전역 설치본을 심볼릭 링크로 연결해 쓴다(ESM 은 `NODE_PATH` 를 따르지 않는다).

```bash
ln -sfn /opt/node22/lib/node_modules/playwright/node_modules/playwright-core node_modules/playwright-core

# 신청자 종합 (53 케이스)
node e2e/applicant.e2e.mjs

# 관리자 회귀 (21 케이스) — 신청자 가드 추가 후 관리자 기능 무손상 확인
node e2e/manager-regression.e2e.mjs

# 세션 복구 (13 케이스) — 손상/구버전 쿠키가 로그인 화면을 500 으로 만들지 않는지 확인
node e2e/session-recovery.e2e.mjs
```

### 환경변수(선택)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `E2E_BASE` | `http://localhost:3100` | 앱 주소 |
| `E2E_EMAIL` | `applicant@e2e.local` | 신청자 계정 |
| `E2E_PW` | `test1234` | 신청자 비밀번호 |
| `E2E_CHROMIUM` | `/opt/pw-browsers/chromium` | Chromium 실행 경로 |

## 테스트 데이터 정리

시나리오 내에서 생성되는 대여/홍보 신청에는 모두 `[E2E-TEST]` 태그가 붙는다.
스위트가 대부분 정리하지만, 남은 데이터는 다음으로 일괄 삭제한다.

```bash
psql "$DATABASE_URL" -f e2e/cleanup.sql
```

## 커버리지 요약

- **A** 비로그인 보호(`/dashboard`→로그인, `?next=` 복귀)
- **B** 세션 지속(새로고침·새 탭)
- **C** 서버/미들웨어 권한 차단(`/settings`,`/rfid`,`/assets/new`,`/assets/[id]/edit`) — UI가 아닌 서버 레벨
- **D** 메뉴 노출 범위(신청자 5개, 설정·RFID 숨김)
- **E** 대시보드 위젯 + 관리자 전용 버튼 숨김
- **F** 자산 조회/검색/페이지네이션/상세 + 수정·이동 버튼 숨김
- **G** 대여 신청(복수 자산 검색선택 + 드로잉 서명 + 동의 + 제출)
- **H** 홍보 출고 신청 → 본인 취소(타인 신청 취소 불가)
- **I** 소모품 조회 + 입·출고 가능 + 물품등록·재고조정 숨김
- **J** 반응형 뷰포트(360/390/768/1366) 무횡스크롤
- **K** 로그아웃 후 보호 경로 차단

### session-recovery.e2e.mjs

- **A** `perms` 클레임 없는 구버전 쿠키로 `/` 접근 → 500 아님 + 재로그인 안내
- **B** 권한이 빈 쿠키 → 무한 리다이렉트 없이 로그인 폼
- **C** `perms` 가 배열이 아닌 쿠키 → 500 아님
- **D** 손상된 쿠키로 보호 경로 접근 → 로그인 화면
- **E** 손상된 쿠키 상태에서 정상 로그인으로 복구
- **F/G** `next` 파라미터 — 외부 주소 차단(오픈 리다이렉트), 내부 경로는 복귀
