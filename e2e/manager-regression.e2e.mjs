// 관리자 회귀 — 신청자 가드 추가 후 관리자 기능이 그대로 동작하는지 검증
import { chromium } from 'playwright-core';
const BASE = process.env.E2E_BASE || 'http://localhost:3100';
const results = [], fails = [];
function log(n, ok, d = '') { results.push(ok); if (!ok) fails.push(n); console.log(`${ok ? 'PASS' : 'FAIL'} — ${n}${d ? ` :: ${d}` : ''}`); }
const TAG = '[E2E-TEST]';
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
const cerr = [];
page.on('console', (m) => { if (m.type() === 'error') cerr.push(m.text()); });
page.on('pageerror', (e) => cerr.push('PAGEERR ' + e.message));

async function login(email, pw) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
}

try {
  console.log('== 관리자 로그인 & 메뉴 접근 ==');
  await login('admin@sadan.local', 'admin1234');
  log('관리자 로그인 → 대시보드', page.url().endsWith('/dashboard'), page.url());

  // 관리자 전용 페이지 서버 접근 허용 (신청자는 막혔던 경로)
  for (const [path, needle] of [
    ['/dashboard', '안녕하세요'], ['/assets', '자산'], ['/assets/new', '자산 등록'],
    ['/laptop-loans', '노트북'], ['/loans', '대여 관리'], ['/consumables', '연구재료'],
    ['/promo', '홍보'], ['/rfid', 'RFID'], ['/settings', '설정'],
  ]) {
    const r = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const ok = r.status() === 200 && !page.url().includes('next=') && (await page.locator(`text=${needle}`).count()) > 0;
    log(`관리자 페이지 접근 ${path}`, ok, `status ${r.status()} url ${page.url()}`);
  }

  console.log('== 관리자 전용 버튼 노출 ==');
  await page.goto(BASE + '/assets', { waitUntil: 'networkidle' });
  log('자산: "자산 등록" 버튼 노출', (await page.getByRole('link', { name: /자산 등록/ }).count()) > 0 || (await page.getByRole('button', { name: /자산 등록/ }).count()) > 0);
  await page.goto(BASE + '/consumables', { waitUntil: 'networkidle' });
  log('소모품: "물품 등록" 버튼 노출', (await page.getByRole('button', { name: /물품 등록/ }).count()) > 0);
  log('소모품: "재고 조정" 버튼 노출', (await page.getByRole('button', { name: /재고 조정/ }).count()) > 0);
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  log('대시보드: 히어로 "자산 등록" 링크 노출', (await page.locator('a[href="/assets/new"]').count()) > 0);

  console.log('== 자산 상세 수정/이동 버튼 ==');
  await page.goto(BASE + '/assets/asset-179', { waitUntil: 'networkidle' });
  log('자산 상세: 수정/이동 버튼 노출', (await page.getByRole('button', { name: /수정|이동/ }).count()) > 0 || (await page.getByRole('link', { name: /수정/ }).count()) > 0);

  console.log('== 홍보 승인 플로우 (신청 → 승인 → 취소 정리) ==');
  await page.goto(BASE + '/promo', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /신청|출고 신청/ }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /출고 신청서 작성/ }).click();
  const pdlg = page.locator('[role="dialog"]');
  await pdlg.waitFor({ state: 'visible' });
  await pdlg.locator('select[name="itemId"]').selectOption({ index: 1 });
  await pdlg.locator('input[name="qty"]').fill('1');
  await pdlg.locator('input[name="requesterName"]').fill(`${TAG} 관리자회귀`);
  await pdlg.getByRole('button', { name: /신청 제출/ }).click();
  await page.waitForTimeout(1500); await page.waitForLoadState('networkidle');
  const row = page.locator(`tr:has-text("${TAG} 관리자회귀")`).first();
  log('홍보 신청 생성', (await row.count()) > 0);
  // 관리자에게 승인 버튼 노출 + 승인
  const approve = row.getByRole('button', { name: '승인' });
  log('관리자 승인 버튼 노출', (await approve.count()) > 0);
  if ((await approve.count()) > 0) {
    await approve.first().click();
    await page.waitForTimeout(1500); await page.waitForLoadState('networkidle');
    log('홍보 승인 처리(상태 승인)', (await page.locator(`tr:has-text("${TAG} 관리자회귀"):has-text("승인")`).count()) > 0);
  }
  // 정리: 승인건 취소
  const row2 = page.locator(`tr:has-text("${TAG} 관리자회귀")`).first();
  const cancel = row2.getByRole('button', { name: '취소' });
  if ((await cancel.count()) > 0) { await cancel.first().click(); await page.waitForTimeout(1200); await page.waitForLoadState('networkidle'); }
  log('홍보 승인건 관리자 취소(정리)', (await page.locator(`tr:has-text("${TAG} 관리자회귀"):has-text("취소")`).count()) > 0);

  console.log('== 설정 접근(계정/기준정보) ==');
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  log('설정 페이지 로드', (await page.locator('text=설정').count()) > 0 && !page.url().includes('next='));

  const real = cerr.filter((e) => !/favicon|manifest|DevTools|Google|IMPORTDATA/i.test(e));
  log('콘솔 치명 에러 없음', real.length === 0, real.slice(0, 2).join(' | '));

} catch (e) {
  log('회귀 예외', false, e.message); console.error(e);
} finally {
  const pass = results.filter(Boolean).length;
  console.log(`\n===== 관리자 회귀: ${pass}/${results.length} PASS =====`);
  if (fails.length) console.log('실패:', JSON.stringify(fails));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
}
