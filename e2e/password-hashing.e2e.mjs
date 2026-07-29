// 비밀번호 해싱 — 평문 저장 계정이 로그인 한 번으로 해시로 전환되는지, 그리고
// 새로 만드는 계정이 처음부터 해시로 저장되는지 실제 DB 를 열어 확인한다.
//
// 전제: 앱이 E2E_BASE 에 떠 있고, 같은 DATABASE_URL 을 볼 수 있어야 한다.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

if (existsSync('.env')) { try { process.loadEnvFile('.env'); } catch { /* 무시 */ } }

const BASE = process.env.E2E_BASE || 'http://localhost:3100';
const ADMIN = process.env.E2E_ADMIN || 'admin@sadan.local';
const ADMIN_PW = process.env.E2E_ADMIN_PW || 'admin1234';
const BCRYPT = /^\$2[aby]\$\d{2}\$.{53}$/;

// 이 스위트가 만드는 계정 — 끝나면 지운다.
const LEGACY_EMAIL = 'legacy-plain@e2e.local';
const LEGACY_PW = 'legacy1234';
const CREATED_EMAIL = 'created-hashed@e2e.local';
const CREATED_PW = 'created1234';

const results = [], fails = [];
function log(n, ok, d = '') { results.push(ok); if (!ok) fails.push(n); console.log(`${ok ? 'PASS' : 'FAIL'} — ${n}${d ? ` :: ${d}` : ''}`); }

const prisma = new PrismaClient({ log: ['error'] });
const stored = async (email) => (await prisma.account.findFirst({ where: { email } }))?.password ?? null;
const cleanup = () => prisma.account.deleteMany({ where: { email: { in: [LEGACY_EMAIL, CREATED_EMAIL] } } });

const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

async function login(email, pw) {
  await ctx.clearCookies();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForTimeout(2500);
}

try {
  await cleanup();

  console.log('== A. 전환 전 평문 계정 (구버전 데이터 재현) ==');
  // 해싱 도입 전처럼 평문을 그대로 넣는다.
  await prisma.account.create({
    data: {
      id: 'acc-e2e-legacy', name: '[E2E-TEST] 구버전', email: LEGACY_EMAIL, password: LEGACY_PW,
      role: 'user', permissions: ['dashboard'], active: true, createdAt: new Date().toISOString(),
    },
  });
  log('A1 평문으로 저장된 상태에서 시작', (await stored(LEGACY_EMAIL)) === LEGACY_PW);

  console.log('== B. 기존 비밀번호로 그대로 로그인 (전환 중 로그인 불가 구간 없음) ==');
  await login(LEGACY_EMAIL, LEGACY_PW);
  log('B1 평문 계정 로그인 성공', page.url().endsWith('/dashboard'), page.url());

  const after = await stored(LEGACY_EMAIL);
  log('B2 로그인 직후 DB 값이 bcrypt 해시로 교체됨', BCRYPT.test(after ?? ''), (after ?? '').slice(0, 7) + '…');
  log('B3 평문이 DB 에 남아 있지 않음', after !== LEGACY_PW);

  console.log('== C. 전환 후에도 같은 비밀번호로 로그인 ==');
  await login(LEGACY_EMAIL, LEGACY_PW);
  log('C1 해시 경로 로그인 성공', page.url().endsWith('/dashboard'), page.url());
  log('C2 재로그인으로 해시가 또 덮이지 않음', (await stored(LEGACY_EMAIL)) === after);

  console.log('== D. 틀린 비밀번호는 계속 거부 ==');
  await login(LEGACY_EMAIL, LEGACY_PW + 'X');
  log('D1 틀린 비밀번호 거부', !page.url().includes('/dashboard'));
  log('D2 오류 메시지 표시', (await page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다').count()) > 0);

  console.log('== E. 설정에서 새로 만든 계정은 처음부터 해시 ==');
  await login(ADMIN, ADMIN_PW);
  log('E1 관리자 로그인', page.url().endsWith('/dashboard'), page.url());
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /계정 추가/ }).click();
  const dlg = page.locator('[role="dialog"]');
  await dlg.waitFor({ state: 'visible' });
  await dlg.locator('input[placeholder="이름"]').fill('[E2E-TEST] 신규계정');
  await dlg.locator('input[type="email"]').fill(CREATED_EMAIL);
  await dlg.locator('input[type="password"]').fill(CREATED_PW);
  await dlg.getByRole('button', { name: '계정 생성' }).click();
  await page.waitForTimeout(2500);

  const createdHash = await stored(CREATED_EMAIL);
  log('E2 새 계정이 생성됨', createdHash !== null);
  log('E3 새 계정 비밀번호가 해시로 저장됨', BCRYPT.test(createdHash ?? ''), (createdHash ?? '').slice(0, 7) + '…');
  log('E4 입력한 평문이 DB 에 없음', createdHash !== CREATED_PW);

  console.log('== F. 관리자 계정도 해시 상태 ==');
  log('F1 시드 관리자 비밀번호가 해시', BCRYPT.test((await stored(ADMIN)) ?? ''));
} catch (e) {
  log('스위트 실행 예외', false, String(e));
} finally {
  await cleanup().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  await browser.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n===== 비밀번호 해싱: ${pass}/${results.length} PASS =====`);
  if (fails.length) { console.log('실패:', JSON.stringify(fails, null, 2)); process.exit(1); }
}
