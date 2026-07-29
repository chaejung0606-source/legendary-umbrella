// 세션 복구 — 손상/구버전 세션 쿠키가 로그인 화면(/)을 500 으로 떨어뜨리지 않는지 검증.
//
// 배경: perms 클레임이 없는 구버전 쿠키가 남아 있으면 `/` 렌더 중
// firstAllowedPath(undefined) → TypeError 로 "Application error" 흰 화면이 떴다.
// 이 스위트는 그 회귀를 막는다.
import { chromium } from 'playwright-core';
import { SignJWT } from 'jose';

const BASE = process.env.E2E_BASE || 'http://localhost:3100';
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'dev-only-insecure-secret-change-me-in-production-please'
);
const COOKIE = 'sadan_session';
const ADMIN = process.env.E2E_ADMIN || 'admin@sadan.local';
const ADMIN_PW = process.env.E2E_ADMIN_PW || 'admin1234';

const results = [], fails = [];
function log(n, ok, d = '') { results.push(ok); if (!ok) fails.push(n); console.log(`${ok ? 'PASS' : 'FAIL'} — ${n}${d ? ` :: ${d}` : ''}`); }

// 지정한 클레임으로 세션 토큰을 서명한다(perms 를 일부러 빼거나 비울 수 있다).
async function token(claims) {
  return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' })
    .setSubject('acc-admin').setIssuedAt().setExpirationTime('7d').sign(SECRET);
}

const url = new URL(BASE);
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
const cerr = [];
page.on('pageerror', (e) => cerr.push('PAGEERR ' + e.message));

async function setSession(value) {
  await ctx.clearCookies();
  await ctx.addCookies([{ name: COOKIE, value, domain: url.hostname, path: '/', httpOnly: true, sameSite: 'Lax' }]);
}

try {
  const base = { email: 'admin@sadan.local', name: '시스템 관리자', role: 'admin' };

  console.log('== A. perms 클레임이 없는 구버전 쿠키 ==');
  await setSession(await token(base)); // perms 자체가 없음
  let r = await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  log('A1 / 가 500 이 아님', r.status() === 200, `status ${r.status()}`);
  log('A2 로그인 폼 노출', (await page.locator('input[type="password"]').count()) > 0);
  log('A3 재로그인 안내 문구 노출', (await page.locator('text=다시 로그인해 주세요').count()) > 0);

  console.log('== B. 권한이 비어 있는 쿠키(무한 리다이렉트 방지) ==');
  await setSession(await token({ ...base, perms: [] }));
  r = await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  log('B1 / 가 200 (리다이렉트 루프 아님)', r.status() === 200, `status ${r.status()}`);
  log('B2 로그인 폼 노출', (await page.locator('input[type="password"]').count()) > 0);

  console.log('== C. perms 가 배열이 아닌 쿠키 ==');
  await setSession(await token({ ...base, perms: 'admin' }));
  r = await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  log('C1 / 가 500 이 아님', r.status() === 200, `status ${r.status()}`);

  console.log('== D. 손상된 쿠키로 보호 경로 접근 ==');
  await setSession(await token(base));
  r = await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  log('D1 /dashboard → 로그인 화면(500 아님)', r.status() === 200 && new URL(page.url()).pathname === '/', `status ${r.status()} url ${page.url()}`);

  console.log('== E. 손상된 쿠키 상태에서 정상 로그인으로 복구 ==');
  await setSession(await token(base));
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(ADMIN);
  await page.locator('input[type="password"]').fill(ADMIN_PW);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  log('E1 재로그인 후 대시보드 진입', page.url().endsWith('/dashboard'), page.url());

  console.log('== F. next 파라미터 오픈 리다이렉트 차단 ==');
  await ctx.clearCookies();
  for (const bad of ['//example.com', '/\\example.com', 'https://example.com']) {
    r = await page.goto(`${BASE}/?next=${encodeURIComponent(bad)}`, { waitUntil: 'networkidle' });
    const stayed = new URL(page.url()).hostname === url.hostname && r.status() === 200;
    log(`F 외부 주소 무시: ${bad}`, stayed, page.url());
  }

  console.log('== G. 정상 next 파라미터는 유지 ==');
  await ctx.clearCookies();
  await page.goto(`${BASE}/?next=%2Fassets`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(ADMIN);
  await page.locator('input[type="password"]').fill(ADMIN_PW);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/assets', { timeout: 15000 }).catch(() => {});
  log('G1 로그인 후 next 경로(/assets) 복귀', new URL(page.url()).pathname === '/assets', page.url());

  log('Z 페이지 치명 에러 없음', cerr.length === 0, cerr.slice(0, 3).join(' | '));
} catch (e) {
  log('스위트 실행 예외', false, String(e));
} finally {
  await browser.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n===== 세션 복구: ${pass}/${results.length} PASS =====`);
  if (fails.length) { console.log('실패:', JSON.stringify(fails, null, 2)); process.exit(1); }
}
