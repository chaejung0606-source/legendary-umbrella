# 신청자(APPLICANT) 기능 맵

- 역할 키: `user` (로그인 계정 role)
- 로그인 시점 권한(perms): `[dashboard, assets, loans, consumables, promo]`
- 접근 불가(관리자 전용): `rfid`, `settings`
- 코드 근거: `src/lib/menus.ts`(MENU_PERMISSIONS), `src/lib/session.ts`(menuKeyForPath / firstAllowedPath), `src/middleware.ts`, 각 `page.tsx` 및 서버 액션(`src/app/actions.ts`)

## 1. 진입 / 인증

| 기능 | 경로 | 신청자 | 서버 강제 지점 |
|------|------|--------|----------------|
| 로그인 | `/` | ✅ | `auth-actions.loginAction` + JWT 쿠키 |
| 비로그인 앱 접근 차단 | 모든 `(app)` 경로 | 로그인 화면으로 | `middleware.ts` → `/?next=<path>` |
| 로그인 후 원경로 복귀 | `?next=` | ✅ | `page.tsx`(root) + `LoginForm` |
| 로그아웃 | 헤더 | ✅ | `auth-actions.logoutAction`(쿠키 삭제) |

## 2. 대시보드 `/dashboard`

| 요소 | 신청자 노출 | 비고 |
|------|-------------|------|
| 통계 카드 6종 | ✅ | 조회 전용 |
| 월별/도넛 차트 | ✅ | |
| 최근 자산 · 반납예정 · RFID 확인 리스트 | ✅ | 링크 이동 |
| 히어로 "자산 등록" 링크 | ❌ 숨김 | 관리자 전용(`isManager`) |
| 히어로 "대여 신청" 링크 | ✅ | `/loans` |

## 3. 자산 원장 `/assets`, 상세 `/assets/[id]`

| 기능 | 신청자 | 서버 강제 지점 |
|------|--------|----------------|
| 목록/검색/필터/페이지네이션 | ✅ | 조회(`getAssets`) |
| 자산 상세 조회 | ✅ | |
| 자산 대여/반납(상세에서) | ✅ | `loanAssetsAction`/`returnAssetAction`(`requireLogin`) |
| 자산 등록 버튼/`/assets/new` | ❌ | UI 게이팅 + `new/page.tsx` 리다이렉트 + `createAssetAction`(`requireManager`) |
| 단일/복수(엑셀) 등록 | ❌ | `AssetRegisterActions isManager` + `bulkCreateAssetsAction`(`requireManager`) |
| 자산 수정 `/assets/[id]/edit` | ❌ | UI 게이팅 + `edit/page.tsx` 리다이렉트 + `updateAssetAction`(`requireManager`) |
| 자산 이동(배치) | ❌ | UI 게이팅 + `moveAssetAction`(`requireManager`) |

## 4. 대여 관리 `/loans`

| 기능 | 신청자 | 비고 |
|------|--------|------|
| 대여/사용 현황 조회 | ✅ | |
| 대여 신청서(즉시 오픈) | ✅ | 폼 내 자산 **복수** 검색·선택 |
| 대여자 서명(드로잉) | ✅ | `SignaturePad`(canvas) 필수 |
| 동의(서약) 체크 | ✅ | `pledge` 필수 체크박스 |
| 소속 / 사번·학번 분리 입력 | ✅ | `userAffiliation` / `userIdNo` |
| 반납 처리 | ✅ | `returnAssetAction`(`requireLogin`) |
| 제출 | ✅ | `loanAssetsAction`(`requireLogin`) |

## 5. 연구재료 / 소모품 `/consumables`

| 기능 | 신청자 | 서버 강제 지점 |
|------|--------|----------------|
| 재고 목록/통계 조회 | ✅ | |
| 입고 / 출고 | ✅ | `consumableTxnAction(in/out)` → `requireLogin` |
| 물품 등록 | ❌ | UI 게이팅 + `createConsumableItemAction`(`requireManager`) |
| 재고 조정(adjust) | ❌ | UI 게이팅 + `consumableTxnAction(adjust)` → `requireManager` |
| 엑셀 다운로드 | ✅ | 공개 export |

## 6. 홍보물품 `/promo`

| 기능 | 신청자 | 서버 강제 지점 |
|------|--------|----------------|
| 물품/수불/신청 현황 조회 | ✅ | |
| 출고 신청서 작성 | ✅ | `createPromoRequestAction`(로그인 필요) |
| 본인 신청 취소 | ✅(본인만) | `decidePromoRequestAction('취소')` → 소유권(`requesterName`) 검증 |
| 타인 신청 취소 | ❌ | UI 미노출 + 서버 소유권 검증 |
| 승인 / 반려 / 출고완료 | ❌ | `requireManager` |
| 물품 등록/수정/입출고/조정/기록취소 | ❌ | `requireManager` |

## 7. 접근 불가 (관리자 전용)

| 경로 | 신청자 결과 |
|------|-------------|
| `/settings` (계정/권한·기준정보) | `middleware` → `firstAllowedPath`(=`/dashboard`) |
| `/rfid` | `middleware` → `/dashboard` |
| `/assets/new`, `/assets/[id]/edit` | 페이지 리다이렉트(`/assets`) |

> 주의: `/assets/*`는 신청자도 `assets` 권한을 가지므로 **미들웨어를 통과**한다.
> 따라서 등록/수정 페이지는 미들웨어가 아닌 **페이지 레벨 세션 가드**로 차단한다.
