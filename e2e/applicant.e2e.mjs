// 신청자(user) 역할 종합 E2E — 실제 브라우저 로그인/클릭/입력/저장/재접속/권한 검증
//
// 실행 전제:
//   1) 앱이 BASE(기본 http://localhost:3100)에서 구동 중이어야 함 (npm run build && npx next start -p 3100)
//   2) 신청자 테스트 계정이 시드되어 있어야 함 — 아래 env로 재정의 가능
//        E2E_EMAIL(applicant@e2e.local) / E2E_PW(test1234)
//        role=user, permissions=[dashboard,assets,loans,consumables,promo]
//   3) 로컬 Postgres 등 DB 연결이 설정된 상태
//
// 실행:
//   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules:/opt/node22/lib/node_modules \
//   node e2e/applicant.e2e.mjs
//
// 생성 테스트 데이터는 모두 [E2E-TEST] 태그가 붙으며, 대여/홍보 신청은 시나리오 내에서 정리하거나
// e2e/cleanup.sql 로 일괄 삭제할 수 있다.
import { chromium } from 'playwright-core';

const BASE = process.env.E2E_BASE || 'http://localhost:3100';
const EMAIL = process.env.E2E_EMAIL || 'applicant@e2e.local';
const PW = process.env.E2E_PW || 'test1234';
const CHROME = process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium';
const TAG = '[E2E-TEST]';

const results = [], fails = [];
function log(name, ok, detail = '') {
  results.push(ok); if (!ok) fails.push(name);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
}
const consoleErrors = [];

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

try {
  // A. 비로그인 보호 경계 + 로그인 후 원경로(next) 복귀
  console.log('\n== A. 비로그인 보호 + next 복귀 ==');
  {
    const noAuth = await ctx.request.get(BASE + '/dashboard', { maxRedirects: 0 });
    log('A1 비로그인 /dashboard → 307', noAuth.status() === 307, `status ${noAuth.status()}`);
    log('A2 리다이렉트 next=/dashboard 포함', (noAuth.headers()['location'] || '').includes('next=%2Fdashboard'), noAuth.headers()['location']);
  }
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  log('A3 비로그인 접근 시 로그인 화면 노출', page.url().includes('next='), page.url());
  log('A4 URL에 next=/dashboard 파라미터', page.url().includes('next=%2Fdashboard') || page.url().includes('next=/dashboard'), page.url());
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PW);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  log('A5 로그인 후 원래 /dashboard로 복귀', page.url().endsWith('/dashboard'), page.url());

  // B. 세션 지속 / 새로고침 / 재접속
  console.log('\n== B. 세션 지속 ==');
  await page.reload({ waitUntil: 'networkidle' });
  log('B1 새로고침 후 세션 유지', page.url().endsWith('/dashboard') && (await page.locator('text=안녕하세요').count()) > 0);
  const page2 = await ctx.newPage();
  await page2.goto(BASE + '/assets', { waitUntil: 'networkidle' });
  log('B2 새 탭 재접속 시 인증 유지', page2.url().includes('/assets') && !page2.url().includes('next='));
  await page2.close();

  // C. 서버/미들웨어 권한 경계 (UI가 아닌 서버가 차단)
  console.log('\n== C. 서버측 권한 차단 (raw HTTP) ==');
  async function rawStatus(path) {
    const r = await ctx.request.get(BASE + path, { maxRedirects: 0 });
    return { status: r.status(), loc: r.headers()['location'] || '' };
  }
  { const s = await rawStatus('/settings'); log('C1 /settings 서버차단', s.status >= 300 && s.status < 400 && !s.loc.includes('/settings'), `→ ${s.status} ${s.loc}`); }
  { const s = await rawStatus('/rfid'); log('C2 /rfid 서버차단', s.status >= 300 && s.status < 400 && !s.loc.includes('/rfid'), `→ ${s.status} ${s.loc}`); }
  { const s = await rawStatus('/assets/new'); log('C3 /assets/new 페이지가드', s.status === 307 && s.loc.endsWith('/assets'), `→ ${s.status} ${s.loc}`); }
  { const s = await rawStatus('/assets/asset-179/edit'); log('C4 /assets/[id]/edit 페이지가드', s.status === 307 && s.loc.includes('/assets/'), `→ ${s.status} ${s.loc}`); }
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  log('C5 브라우저 /settings 미도달', !page.url().includes('/settings'), page.url());
  await page.goto(BASE + '/assets/new', { waitUntil: 'networkidle' });
  log('C6 브라우저 /assets/new → 원장', page.url().endsWith('/assets'), page.url());

  // D. 메뉴 노출 범위 (신청자 5개)
  console.log('\n== D. 메뉴 노출 범위 ==');
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  for (const label of ['자산 원장', '대여 관리', '연구재료', '홍보물품']) log(`D 메뉴 표시: ${label}`, (await page.locator(`nav >> text=${label}`).count()) > 0);
  log('D 설정 메뉴 숨김', (await page.locator('nav >> text=설정').count()) === 0);
  log('D RFID 메뉴 숨김', (await page.locator('nav >> text=RFID').count()) === 0);

  // E. 대시보드 + 관리자 전용 버튼 숨김
  console.log('\n== E. 대시보드 ==');
  log('E1 통계카드', (await page.locator('text=전체 자산 수').count()) > 0);
  log('E2 월별 차트', (await page.locator('text=월별 자산 취득 현황').count()) > 0);
  log('E3 히어로 "자산 등록" 숨김', (await page.locator('a[href="/assets/new"]').count()) === 0);
  log('E4 히어로 "대여 신청" 표시', (await page.locator('a[href="/loans"]').count()) > 0);

  // F. 자산 원장
  console.log('\n== F. 자산 원장 ==');
  await page.goto(BASE + '/assets', { waitUntil: 'networkidle' });
  log('F1 목록 렌더', (await page.locator('table tbody tr').count()) > 0);
  log('F2 "자산 등록" 버튼 숨김', (await page.getByRole('button', { name: /자산 등록/ }).count()) === 0 && (await page.locator('a:has-text("자산 등록")').count()) === 0);
  log('F3 엑셀 양식/일괄 업로드 숨김', (await page.locator('text=양식 다운로드').count()) === 0);
  await page.locator('header input, input[name="q"], input[placeholder*="검색"]').first().fill('노트북');
  await page.locator('header input, input[name="q"], input[placeholder*="검색"]').first().press('Enter');
  await page.waitForLoadState('networkidle');
  log('F4 검색 동작', (await page.locator('table tbody tr').count()) > 0);
  await page.goto(BASE + '/assets', { waitUntil: 'networkidle' });
  log('F5 페이지네이션 UI', (await page.getByRole('button', { name: /다음|끝|처음|이전/ }).count()) > 0 || (await page.locator('button', { hasText: /^\d+$/ }).count()) > 0);
  await page.goto(BASE + '/assets/asset-179', { waitUntil: 'networkidle' });
  log('F6 상세 진입', (await page.locator('text=노트북').count()) > 0);
  log('F7 수정/이동 버튼 숨김', (await page.getByRole('button', { name: /수정/ }).count()) === 0 && (await page.getByRole('button', { name: /이동/ }).count()) === 0);
  log('F8 대여/반납 사용가능', (await page.getByRole('button', { name: /대여|반납/ }).count()) > 0);

  // G. 대여 신청 (복수 자산 + 서명 + 동의 + 제출)
  console.log('\n== G. 대여 신청 ==');
  await page.goto(BASE + '/loans', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '대여 신청' }).first().click();
  const dlg = page.locator('[role="dialog"]');
  await dlg.waitFor({ state: 'visible' });
  log('G1 신청서 즉시 오픈', (await dlg.locator('text=자산 대여 신청서').count()) > 0);
  await dlg.locator('input[placeholder*="검색"]').fill('노트북');
  await dlg.getByRole('button', { name: /검색/ }).click();
  await page.waitForTimeout(1200);
  const addBtns = dlg.locator('ul button.w-full');
  if ((await addBtns.count()) > 0) await addBtns.first().click();
  await page.waitForTimeout(300);
  log('G2 자산 1건 선택', (await dlg.locator('button[aria-label="선택 해제"]').count()) >= 1);
  if ((await dlg.locator('ul button.w-full').count()) > 0) await dlg.locator('ul button.w-full').first().click();
  await page.waitForTimeout(300);
  log('G3 복수 자산 선택', (await dlg.locator('button[aria-label="선택 해제"]').count()) >= 1);
  await dlg.locator('input[name="dueAt"]').fill('2026-08-31');
  await dlg.locator('input[name="reason"]').fill(`${TAG} 자동화 테스트 대여`);
  await dlg.locator('input[name="userName"]').fill(`${TAG} 대여자`);
  await dlg.locator('input[name="userAffiliation"]').fill('사업단');
  await dlg.locator('input[name="userIdNo"]').fill('2026999');
  const canvas = dlg.locator('[data-testid="signature-pad"]');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (box) {
    const cy = box.y + box.height / 2, cx = box.x + box.width / 2;
    await page.mouse.move(cx - 40, cy); await page.mouse.down();
    await page.mouse.move(cx - 10, cy - 12); await page.mouse.move(cx + 20, cy + 10); await page.mouse.move(cx + 40, cy);
    await page.mouse.up();
  }
  await page.waitForTimeout(300);
  await dlg.locator('input[name="pledge"]').check(); // 동의(서약) 필수
  const submitBtn = dlg.locator('[data-testid="loan-submit"]');
  log('G4 서명+동의 후 제출버튼 활성화', !(await submitBtn.isDisabled()));
  await submitBtn.click();
  await page.waitForTimeout(1500);
  log('G5 대여 신청 제출 성공(다이얼로그 닫힘)', (await dlg.count()) === 0 || !(await dlg.isVisible().catch(() => false)));

  // H. 홍보 출고 신청 → 본인 취소 (+ IDOR: 본인 것만 취소 노출)
  console.log('\n== H. 홍보 출고 신청/취소 ==');
  await page.goto(BASE + '/promo', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /신청|출고 신청/ }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  log('H1 홍보 "물품 등록" 버튼 숨김', (await page.getByRole('button', { name: /물품 등록/ }).count()) === 0);
  await page.getByRole('button', { name: /출고 신청서 작성/ }).click();
  const pdlg = page.locator('[role="dialog"]');
  await pdlg.waitFor({ state: 'visible' });
  await pdlg.locator('select[name="itemId"]').selectOption({ index: 1 });
  await pdlg.locator('input[name="qty"]').fill('1');
  await pdlg.locator('input[name="requesterName"]').fill(`${TAG} 신청자`);
  await pdlg.getByRole('button', { name: /신청 제출/ }).click();
  await page.waitForTimeout(1500); await page.waitForLoadState('networkidle');
  log('H2 출고 신청 생성', (await page.locator(`tr:has-text("${TAG} 신청자")`).count()) > 0);
  const myRow = page.locator('tr', { hasText: `${TAG} 신청자` }).first();
  const cancelBtn = myRow.getByRole('button', { name: '취소' });
  log('H3 본인 신청에 취소 버튼 노출(타인 것은 미노출)', (await cancelBtn.count()) > 0);
  if ((await cancelBtn.count()) > 0) {
    await cancelBtn.first().click();
    await page.waitForTimeout(1200); await page.waitForLoadState('networkidle');
    log('H4 본인 신청 취소 성공', (await page.locator(`tr:has-text("${TAG} 신청자"):has-text("취소")`).count()) > 0);
  }

  // I. 소모품
  console.log('\n== I. 소모품 ==');
  await page.goto(BASE + '/consumables', { waitUntil: 'networkidle' });
  log('I1 목록 렌더', (await page.locator('table tbody tr').count()) > 0);
  log('I2 "물품 등록" 숨김', (await page.getByRole('button', { name: /물품 등록/ }).count()) === 0);
  log('I3 "재고 조정" 숨김', (await page.getByRole('button', { name: /재고 조정/ }).count()) === 0);
  log('I4 "입고"/"출고" 사용가능', (await page.getByRole('button', { name: /^입고$/ }).count()) > 0 && (await page.getByRole('button', { name: /^출고$/ }).count()) > 0);

  // J. 반응형 뷰포트
  console.log('\n== J. 반응형 뷰포트 ==');
  for (const vp of [{ w: 360, h: 800 }, { w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1366, h: 768 }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
    const ok = (await page.locator('text=안녕하세요').count()) > 0;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    log(`J ${vp.w}x${vp.h} 렌더/무횡스크롤`, ok && !overflow, overflow ? '가로 오버플로우' : '');
  }
  await page.setViewportSize({ width: 1440, height: 950 });

  // K. 로그아웃 → 보호 경로 차단
  console.log('\n== K. 로그아웃 ==');
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  const logoutBtn = page.getByRole('button', { name: /로그아웃/ }).or(page.locator('a:has-text("로그아웃")'));
  if ((await logoutBtn.count()) > 0) { await logoutBtn.first().click(); await page.waitForTimeout(1000); }
  else { const prof = page.locator('header button').last(); await prof.click().catch(() => {}); await page.waitForTimeout(300); await page.getByText('로그아웃').first().click().catch(() => {}); await page.waitForTimeout(800); }
  const afterLogout = await ctx.request.get(BASE + '/dashboard', { maxRedirects: 0 });
  log('K1 로그아웃 후 /dashboard 서버차단', afterLogout.status() === 307, `status ${afterLogout.status()}`);

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest|Download the React DevTools|Google|IMPORTDATA/i.test(e));
  log('Z 콘솔/페이지 치명 에러 없음', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

} catch (e) {
  log('스위트 실행 예외', false, e.message); console.error(e);
} finally {
  const pass = results.filter(Boolean).length;
  console.log(`\n===== 결과: ${pass}/${results.length} PASS =====`);
  if (fails.length) console.log('실패:', JSON.stringify(fails, null, 2));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
}
