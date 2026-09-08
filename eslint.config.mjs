// ESLint 설정 (flat config).
// 이전에는 설정 파일이 없어 `npm run lint` 가 대화형 설치 프롬프트에서 멈췄고,
// 결과적으로 푸시 전 정적 검사가 한 번도 돌지 않았다.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 미사용 변수는 경고까지만 (앞에 _ 를 붙이면 의도적 미사용으로 본다)
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
