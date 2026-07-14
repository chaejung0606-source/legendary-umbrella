-- E2E 테스트 데이터 정리 — [E2E-TEST] 태그가 붙은 대여/홍보 신청 삭제 + 자산 원상복구
-- 사용: psql "$DATABASE_URL" -f e2e/cleanup.sql   (또는 로컬 테스트 DB에 대해 실행)

-- 1) E2E 대여로 '대여중'이 된 자산을 '정상'으로 되돌리고 currentUserName 초기화
UPDATE sadan."Asset" a SET "assetStatus" = '정상', "currentUserName" = NULL
WHERE a.id IN (
  SELECT l."assetId" FROM sadan."LaptopLoan" l WHERE l."userName" LIKE '%E2E-TEST%'
);

-- 2) E2E 대여 기록 삭제 (ensureLoan이 생성한 loan-<assetId> 레코드)
DELETE FROM sadan."LaptopLoan" WHERE "userName" LIKE '%E2E-TEST%';

-- 3) E2E 홍보 출고 신청 삭제
DELETE FROM sadan."PromoRequest" WHERE "requesterName" LIKE '%E2E-TEST%';

-- 확인
SELECT 'remaining_loans'  AS k, count(*) FROM sadan."LaptopLoan"   WHERE "userName"      LIKE '%E2E-TEST%'
UNION ALL
SELECT 'remaining_promo'  AS k, count(*) FROM sadan."PromoRequest" WHERE "requesterName" LIKE '%E2E-TEST%';
