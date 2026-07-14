# 신청자(APPLICANT) 감사 — 버그 리포트 & 수정 내역

감사 중 발견한 결함을 **원인 분석 + 실제 수정**으로 처리했다. 검증 로직/권한/기능은 제거하지 않았고,
관리자·자산관리·타 신청자 기능이 유지되는지 회귀로 확인했다(21/21 PASS).

---

## BUG-1 (중대·보안) 서버 액션 인가 누락 — 권한 상승 / 데이터 훼손

**원인.** Next.js 서버 액션은 **현재 페이지 경로**로 POST되므로 미들웨어의 메뉴 권한 검사는
"그 페이지의 권한"만 본다. 즉 신청자가 `/dashboard`(dashboard 권한 보유)에서 관리자용 서버 액션을
직접 호출하면 미들웨어를 통과한다. 다수의 변경 액션에 **액션 자체의 인가 재검증이 없었다.**

**영향(수정 전).** 신청자가 UI를 우회해 자산 생성/수정/이동, 엑셀 일괄 등록, 분류(대·중)·건축물 기준정보
CRUD, 계정 생성/수정/삭제까지 호출 가능 → 권한 상승 및 운영 데이터 훼손 위험.

**재현 시나리오.** 신청자 세션으로 `createAssetAction`/`deleteBuildingAction`/`createAccountAction` 등을
직접 호출(폼 없이 서버 액션 요청) → 수정 전에는 실행됨.

**수정.** `src/app/actions.ts`에 인가 헬퍼를 두고 전 변경 액션에 적용.
- `requireManager()`: admin/asset_manager만 — createAsset/updateAsset/moveAsset, bulkCreateAssets,
  commitImport, 기준정보 CRUD(addMajor/updateMajor/deleteMajor/…/Building), 계정 CRUD,
  홍보 물품/수불/조정/승인/반려/출고완료, 앱 설정.
- `requireLogin()`: 로그인만 — 대여(`loanAssetAction`/`loanAssetsAction`)·반납, 소모품 입/출고.
- `consumableTxnAction`: `type==='adjust'`는 `requireManager`, 입/출고는 `requireLogin`.

---

## BUG-2 (중대·보안) 홍보 신청 취소 IDOR — 타인 신청 취소 가능

**원인.** `decidePromoRequestAction('취소', …)`가 로그인만 확인하고 **신청 소유권을 검증하지 않았다.**
UI에서도 상태가 신청/승인이면 모든 로그인 사용자에게 취소 버튼이 노출됐다.

**영향(수정 전).** 신청자가 신청 id를 알면 **다른 사람의 홍보 출고 신청을 취소**할 수 있음(무결성 훼손).

**수정.**
- 서버: `decidePromoRequest(id, '취소', …, ownerName?)`에 소유권 파라미터 추가. 비관리자는
  `requesterName === session.name`일 때만 취소, 불일치 시 `"본인이 신청한 건만 취소할 수 있습니다."` 반환.
  (`src/data/mutations.ts`, `src/app/actions.ts`)
- UI: 취소 버튼을 `isManager || r.requesterName === userName` 조건으로 게이팅
  (`src/components/promo/promo-manager.tsx`).

**검증(데이터 계층 직접 테스트).**
```
PASS — 타인 신청 취소 서버 차단(IDOR) :: {"error":"본인이 신청한 건만 취소할 수 있습니다."}
PASS — 차단 후 상태 유지(신청)
PASS — 본인 신청 취소 허용
PASS — 관리자 취소는 소유권 무관 허용
```

---

## BUG-3 (중) 신청자 UI 게이팅 부재 — 관리자 전용 진입점 노출

**원인.** 화면에서 관리자 전용 버튼/링크/페이지가 신청자에게도 노출되어 있었다(미들웨어는 `assets`
권한만 보므로 `/assets/new`·`/edit` 페이지 자체는 통과).

**수정(방어).**
- 버튼/링크 게이팅(`isManager`): 자산 등록(단일/복수·엑셀 양식), 자산 상세 수정·이동,
  소모품 물품등록·재고조정, 대시보드 히어로 "자산 등록".
- 페이지 세션 가드: `/assets/new`, `/assets/[id]/edit`에서 비관리자는 `/assets`(또는 상세)로 리다이렉트.
- 서버 액션은 BUG-1의 `requireManager`가 최종 방어선.

---

## BUG-4 (경) 모바일 360px 가로 오버플로우

**원인.** 대시보드 등에서 문서 폭이 뷰포트(360)를 13px 초과(장식/카드 최소폭 요인). 실제 콘텐츠는
뷰포트 내에 있으나 문서가 확장되어 가로 스크롤 발생.

**수정.** 앱 셸 `main`에 `overflow-x-hidden` 추가(`src/components/layout/app-shell.tsx`). 테이블은 각자
`overflow-x-auto` 컨테이너를 유지하므로 표 가로 스크롤은 영향 없음.

**검증.** 360/390/768/1366 전부 무횡스크롤 PASS.

---

## 결함 아님(설계상 정상) — 관찰 사항

- **대여 신청서 동의(pledge) 필수 체크박스**: 제출 버튼 활성화 조건에는 서명·자산만 포함되지만,
  미체크 시 HTML5 필수 검증으로 제출이 차단되고 브라우저 네이티브 안내가 표시된다. 대여 계약 동의
  게이트로서 **의도된 동작**(제거하지 않음). 자동화 테스트는 동의 체크를 포함해 정상 제출 확인.
- **권한 스냅샷**: perms는 로그인 시점 JWT에 담긴다. 관리자가 권한을 바꾸면 재로그인 전까지 반영되지
  않는다(데모 세션의 알려진 트레이드오프). 페이지·서버 액션은 매 요청 role을 재검증하므로 권한 상승은
  발생하지 않는다.

## 수정 파일 요약

- `src/app/actions.ts` — 인가 헬퍼(requireManager/requireLogin/managerWrap) + 전 변경 액션 가드, 홍보 취소 소유권.
- `src/data/mutations.ts` — `decidePromoRequest` 소유권 파라미터.
- `src/components/promo/promo-manager.tsx` — 취소 버튼 소유권 게이팅.
- `src/components/assets/asset-actions.tsx`, `asset-bulk-upload.tsx` — 관리자 전용 버튼 게이팅.
- `src/components/consumables/consumable-actions.tsx` — 물품등록·재고조정 게이팅.
- `src/app/(app)/assets/page.tsx`, `assets/[id]/page.tsx`, `assets/new/page.tsx`, `assets/[id]/edit/page.tsx`,
  `consumables/page.tsx`, `dashboard/page.tsx` — isManager 계산 + 페이지 가드.
- `src/components/layout/app-shell.tsx` — 모바일 가로 오버플로우.
- `src/components/ui/signature-pad.tsx`, `src/components/loans/loan-forms.tsx` — E2E용 `data-testid`(동작 무변경).
