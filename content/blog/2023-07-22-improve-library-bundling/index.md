---
title: "라이브러리 번들링 개선 과정: 커맨드 한 줄로 번들링 끝내기"
date: 2023-07-22T00:00:00+09:00
description: "그동안 여러 라이브러리를 만들며 작성해온 비슷한 형태의 번들링 코드, 이제는 놓아줄 때가 되었습니다."
thumbnail: ./thumbnail.png
tags:
  - Node.js
  - Javascript
  - Typescript
---

그동안 회사 내에서, 그리고 개인적으로도 많은 라이브러리를 개발해 오면서 자연스럽게 번들링 코드를 작성하는 일이 많았습니다.

표준을 지키기는 커녕 막무가내로 개발했던 시작부터, 커맨드 한 줄로 번들링을 끝내기까지, 그동안의 과정을 정리해보려고 합니다.

# 타입스크립트 컴파일러로 끝?

가장 초반에 아무 것도 모를 시기에는 타입스크립트 컴파일러 만으로 대충 TypeScript -> JavaScript 트랜스파일링만 거쳐 NPM에 업로드 했었는데요. 지금 생각해보면 여러 문제점이 있습니다.

## 문제점 1: 타입스크립트 컴파일러는 정말로 컴파일만 한다

타입스크립트 컴파일러는 정말 말 그대로 타입스크립트 코드를 자바스크립트 코드로 컴파일하는 역할만 합니다.

이게 무슨 뜻이냐면, 번들링의 가장 기본과도 같은 Minify, 트리 쉐이킹을 제대로 지원하지 않는다는 것입니다.

예를 들어 아래 코드를 컴파일 한다고 가정했을 때,

```typescript
const foo = "bar";

export function add(a: number, b: number) {
  return a + b;
}
```

타입스크립트 컴파일러만 사용하는 경우 아래와 같이 정말 그대로 바꿔주기만 할 뿐이지만,

```javascript
const foo = "bar";
export function add(a, b) {
  return a + b;
}
```

다른 번들러를 사용하여 Minify, 트리 쉐이킹을 적용하면 아래와 같은 결과가 나옵니다.

```javascript
function o(n,r){return n+r}export{o as add};
```

결과적으로 이는 해당 라이브러리를 설치해서 사용하는 프론트엔드 프로젝트의 번들 용량에도 영향을 주게 되는 것입니다.

물론 프론트엔드 프로젝트 단에서 번들러 설정을 얼마나 잘해놨냐에 따라 영향이 없을 수도 있지만, 그렇지 않은 프로젝트에서도 좋은 효율을 가질 수 있도록 하는게 라이브러리 개발자의 몫이 아닐까요?

## 문제점 2: Node.js 모듈 시스템 표준을 지키지 않는다.

타입스크립트가 CommonJS, ESM 두 가지 모듈 시스템에 대해 지원을 시작한지도 얼마 되지 않았고, 그 또한 컴파일 결과물에는 제대로 반영이 되지 않습니다.

가장 대표적인 예시가 타입스크립트 컴파일 결과물을 ESM으로 뽑고 싶은 경우인데요.

그 전에 먼저 두 모듈 시스템이 무엇인지 매우 간단히 알아보면, CommonJS는 `require` / `module.exports`로 모듈을 관리하는 시스템이고, ESM은 `import` / `export`로 모듈을 관리하는 시스템입니다.

```javascript
// CommonJS
const { add } = require("./add");

module.exports.foo = "bar";

// ESM
import { add } from "./add.js";

export const foo = "bar";
```

그런데 우리는 타입스크립트에서 항상 `import` / `export`를 사용합니다. 그렇다면 타입스크립트는 무조건 ESM일까요?

정답은 `아니다` 입니다. CommonJS를 따르는 프로젝트에서도 타입스크립트는 `import` / `export`를 사용하는데, 이유가 뭘까요?

그것은 타입스크립트가 문법 상으로만 `import` / `export`를 사용할 수 있도록 흉내를 냈을 뿐이지, 컴파일 이후에는 `require` / `module.exports`를 사용하도록 바뀌기 때문입니다.

예를 들어 아래와 같은 타입스크립트 코드를 CommonJS로 컴파일 한다고 가정했을 때,

```typescript
// sum.ts

import { add } from "./add";

export function sum(...nums: number[]) {
  return nums.reduce(add, 0);
}
```

`import` / `export`는 CommonJS 문법으로 변환됩니다.

```javascript
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sum = void 0;
var add_1 = require("./add");
function sum() {
  var nums = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    nums[_i] = arguments[_i];
  }
  return nums.reduce(add_1.add, 0);
}
exports.sum = sum;
```

여기까지가 기본 배경 지식이고, 일단 그러면 CommonJS 타입스크립트를 CommonJS 결과물로 컴파일하는 것은 아무 문제가 없다는 것을 알았습니다.

그러면 CommonJS 타입스크립트를 ESM으로 컴파일하는 것도 아무 문제가 없을까요? 실제로 위 예제의 `sum.ts`를 ESM으로 컴파일 해보면 아래와 같은 결과가 나옵니다.

```javascript
import { add } from "./add";
export function sum() {
  var nums = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    nums[_i] = arguments[_i];
  }
  return nums.reduce(add, 0);
}
```

얼핏 보면 `import` / `export`를 사용하고 있으니 올바르게 작성된 ESM 모듈로 보일 수도 있지만, ESM에서는 모듈을 `import`할 때 **반드시 확장자를 명시**해야 합니다. 그렇지 않으면 코드를 실행했을 때 아래와 같은 에러를 만나게 됩니다.

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module ...
```

따라서 타입스크립트 컴파일러 만으로는 두 가지 모듈 시스템을 올바르게 지원하기가 어려웠고, 대책을 찾아 나섰습니다.

# 제대로 된 번들링을 한 번 해보자

Node.js의 복잡한 세계에 타입스크립트 컴파일러 만으로 뛰어드려 했다니, 이토록 어리석을 수가! 이제는 정말 번들링 다운 번들링을 하기 위해 `Babel`과 `Rollup`을 도입하게 됩니다.

먼저 라이브러리 개발자 입장에서 가장 중요한 것은 CommonJS, ESM 어느 환경에서 설치하더라도 문제 없이 동작하는 것임을 배웠기 때문에, 그것에 집중하여 이런 저런 `Rollup` plugin을 찾아보게 됩니다.

- `Babel` 트랜스파일링을 위한 `@rollup/plugin-babel`
- Module Resolution과 Tree shaking을 위한 `@rollup/plugin-node-resolve`
- CommonJS 코드를 ESM 코드로 변환하기 위한 `@rollup/plugin-commonjs`

```javascript
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import packageJson from "./package.json" assert { type: "json" };
```

그리고 `buildJS` 함수를 만들었습니다. 번들링할 모듈의 시작 경로, 번들링 결과물을 저장할 경로, 그리고 결과물을 CommonJS로 만들지, ESM으로 만들지를 받아 `Rollup` Config를 생성합니다.

저는 항상 CommonJS 프로젝트 내에서 개발을 하기 때문에, 결과물이 ESM인 경우 확장자를 `.mjs`로 붙여줬습니다.

```javascript
function buildJS(input, output, format) {
  const isESMFormat = format === "es";
  return {
    input,
    external,
    output: [
      {
        format,
        ...(isESMFormat
          ? { dir: output, entryFileNames: "[name].mjs", preserveModules: true, preserveModulesRoot: "src" }
          : { file: output }),
      },
    ],
    plugins: [
      resolve({
        extensions,
      }),
      isESMFormat && commonjs(),
      babel({
        extensions,
        babelHelpers: "bundled",
        rootMode: "upward",
      }),
    ].filter(Boolean),
  };
}
```

그리고 `buildJS`를 사용해 CommonJS 번들을 만드는 `buildCJS`, ESM 번들을 만드는 `buildESM` 함수를 각각 만들었습니다.

```javascript
function buildCJS(input) {
  const parsed = path.parse(input);
  return buildJS(`src/${input}`, `dist/${parsed.dir}/${parsed.name}.js`, "cjs");
}

function buildESM(input) {
  return buildJS(`src/${input}`, "esm", "es");
}
```

이렇게 자바스크립트 프로젝트에서 문제 없이 잘 돌아가는 번들을 만들 수 있게 되었습니다. 하지만 우리는 타입스크립트 프로젝트도 지원을 해야하기 때문에 타입 정의(`.d.ts`)도 제공을 해주어야 합니다.

다만 이때, 위에서 언급한 CommonJS 타입스크립트를 ESM 자바스크립트로 변환할 때의 문제는 타입 정의를 생성할 때에도 예외가 아니었습니다.

이를 마땅히 해결할 방법이 없어 좌절하던 중, "애초에 `.d.ts` 파일들을 하나로 합쳐서 `import` / `export`를 사용하지 않게 하면 되는게 아닌가?" 하는 아이디어가 떠올랐습니다.

그래서 타입 정의를 하나로 번들링해주는 `Rollup` 플러그인인 `rollup-plugin-dts`를 적용했습니다.

먼저 `Rollup` 실행 전에 아래 커맨드로 타입 정의부터 생성을 해주도록 수정했고,

```
tsc --emitDeclarationOnly --outDir types
```

그 후 아래와 같이 `buildDTS`, `buildCJSDTS`, `buildESMDTS` 함수를 만들었습니다.

```javascript
import dts from "rollup-plugin-dts";
```

```javascript
function buildDTS(input, format) {
  const parsed = path.parse(input);
  const isESMFormat = format === "es";
  const dir = `${isESMFormat ? "dist" : "esm"}/${parsed.dir}/`;
  const ext = isESMFormat ? ".ts" : ".mts";

  return {
    input: `./types/${input}`,
    output: [{ file: `${dir}${parsed.name}${ext}`, format }],
    plugins: [dts()],
  };
}

function buildCJSDTS(input) {
  return buildDTS(input, "cjs");
}

function buildESMDTS(input) {
  return buildDTS(input, "es");
}
```

이제 위에서 만든 함수들을 사용하여 아래와 같이 `export` 해준 후,

```javascript
export default [buildCJS("index.ts"), buildESM("index.ts"), buildCJSDTS("index.d.ts"), buildESMDTS("index.d.ts")];
```

`package.json`의 `exports` 옵션을 아래와 같이 작성해주어 CommonJS와 ESM 모두 완벽하게 지원하는 라이브러리 번들을 만들 수 있었습니다.

```json
{
  ".": {
    "require": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "import": {
      "types": "./esm/index.d.mts",
      "default": "./esm/index.mjs"
    }
  }
}
```

그럼 이제 모든 문제가 해결되었으니 끝난게 아닐까요? 하지만 이번엔 개발 경험적인 문제가 떠올랐습니다.

## 문제점: 작성 과정이 너무 복잡하고 알아야 할 것이 많다

무엇이든 시작이 어려운 법, 이미 작성한 번들링 코드는 재활용하면 됩니다.

하지만 Node.js 모듈 시스템 표준, 타입스크립트에서 그 모듈 시스템을 처리하는 방식, 트랜스파일러와 번들러의 종류를 찾아 선택하는 비용, 올바른 번들링을 위해 각종 번들러 플러그인을 찾아 선택하는 비용 등..

위 모든 것은 잘 아는 사람도 헷갈릴 수 있는 내용들인데, 처음 배워나가는 사람에게는 굉장히 큰 벽으로 다가올 것입니다.

모듈 시스템에 대한 배경지식 처럼 정말 필수적으로 알아야하는 내용만 제외하면, 고생해서 여러 리서치를 통해 번들링 코드를 작성하지 않아도 알아서 다 해줄 수 있다면 편하지 않을까요?

우리가 개념만 알고 있다면 이미 잘 추상화된 도구들을 활용해 생산성을 높힐 수 있듯이 말입니다.

# 커맨드 한 줄로 번들링 끝내기: tsup

그래서 위의 모든 문제점을 단숨에 해결하기 위해 도입한 것이 `tsup` 이라는 번들러입니다.

`tsup`은 기본적으로 타입스크립트 라이브러리 번들링을 목적으로 하고 있다는 점에서 차별점이 있고, `esbuild`를 기반으로 하고 있어 빠른 속도를 자랑합니다.

플러그인 따위 찾아볼 필요도 없이 기본적으로 타입스크립트를 CommmonJS, ESM 문법의 자바스크립트로 각각 컴파일하는 것을 지원하며, 타입 정의도 설정한 포맷에 맞게 생성해줍니다.

또한 `esbuild`는 기본적으로 트리 쉐이킹을 하기 때문에, `tsup` 또한 트리 쉐이킹이 알아서 되며, Minify도 지원합니다.

그리고 가장 중요한 점은, 위 모든 요구사항을 커맨드 한 줄로 충족할 수 있다는 점입니다.

```
tsup src/index.ts --format cjs,esm --dts --minify
```

실제로 최근에 개인적으로 개발하고 있는 `flickable-scroll`이라는 오픈소스는 [위 커맨드 한 줄로 번들링](https://github.com/HoseungJang/flickable-scroll/blob/436fbd900c0d7c389b021c638092ffb2f7d41ece/package.json#L23)하고 있습니다.

번외로 사실 `tsup`의 존재는 1년 전부터 알고 있었는데, 그 당시에는 타입 정의 생성이 제대로 지원되지 않아서 도입을 못했었는데, 잊고 있던 사이에 개선이 되었네요.

# 마무리

생태계는 계속해서 발전하고 있지만, 대부분의 개발자들에게 번들링은 여전히 어려운 경험입니다.

시간이 남는다면 `tsup`을 도입해서 기존의 복잡한 번들링 코드도 버리고, 앞으로 새로 만드는 라이브러리의 개발 경험도 한 번 개선해보면 어떨까요?

또한 CommonJS, ESM에 더해 타입스크립트까지 올바르게 지원하는 라이브러리는 아직까지도 찾아보기가 힘듭니다.

그런 지원을 쉽게 할 수 있게 해주는 `tsup` 도구를 활용해, 우리가 라이브러리 생태계의 퀄리티를 발전시키는 시작점이 되어보면 어떨까요?

크고 작음과 관련 없이 생산성을 개선하는 일은 항상 즐거운 것 같습니다.

# 레퍼런스

- [tsup Github](https://github.com/egoist/tsup)
- [CommonJS와 ESM에 모두 대응하는 라이브러리 개발하기: exports field](https://blog.hoseung.me/2022-10-04-commonjs-esm-exports-field/)
