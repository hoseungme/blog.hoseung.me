---
title: "CommonJS와 ESM에 모두 대응하는 라이브러리 개발하기: exports field"
date: 2022-10-04T00:00:00+09:00
description: "Node.js에는 두 가지 Module System이 존재합니다. 토스 프론트엔드 챕터에서 운영하는 100개가 넘는 라이브러리들은 그것에 어떻게 대응하고 있을까요?"
thumbnail: ./thumbnail.png
tags:
  - Node.js
  - Javascript
  - Typescript
---

> 이 글은 토스 기술 블로그에도 게재되었습니다. [원문 링크](https://toss.tech/article/commonjs-esm-exports-field)

토스 프론트엔드 챕터에서는 개발 생산성을 극대화하기 위해 코드를 지속적으로 라이브러리로 만들고 있습니다. 그 결과 지금은 100개가 넘는 라이브러리를 운영하고 있습니다.

Node.js 12부터 ECMAScript Modules라는 새로운 Module System이 추가되면서, 기존의 CommonJS라는 Module System까지, 라이브러리는 두 가지 Module System을 지원해야 하게 되었습니다.

토스팀에서는 그것을 package.json의 exports field를 통해 지원하고 있습니다. 각각의 모듈 시스템과 exports field에 대해 자세히 알아봅시다.

# Node.js의 두 가지 Module System

Node.js에는 CommonJS, ECMAScript Modules(이하 CJS, ESM)라는 두 가지 모듈 시스템이 존재합니다.

## CommonJS (CJS)

```tsx
// add.js
module.exports.add = (x, y) => x + y;

// main.js
const { add } = require("./add");

add(1, 2);
```

## ECMAScript Modules (ESM)

```tsx
// add.js
export function add(x, y) {
  return x + y;
}

// main.js
import { add } from "./add.js";

add(1, 2);
```

- CJS는 `require` / `module.exports` 를 사용하고, ESM은 `import` / `export` 문을 사용합니다.
- CJS module loader는 동기적으로 작동하고, ESM module loader는 비동기적으로 작동합니다.
  - ESM은 [Top-level Await](https://nodejs.org/api/esm.html#top-level-await)을 지원하기 때문에 비동기적으로 동작합니다.
- 따라서 ESM에서 CJS를 `import` 할 수는 있지만, CJS에서 ESM을 `require` 할 수는 없습니다. 왜냐하면 CJS는 Top-level Await을 지원하지 않기 때문입니다.
- 이 외에도 두 Module System은 기본적으로 동작이 다릅니다.
- 따라서 두 Module System은 서로 호환되기 어렵습니다.

## 왜 두 Module System을 지원해야해요?

서로 호환되기 어려운 두 Module System을 지원해야하는 이유는 뭘까요? 그냥 하나로 통일하면 안될까요? 토스팀에서는 왜 그것을 중요하게 생각할까요?

토스팀에서는 Server-side Rendering(이하 SSR)을 적극적으로 사용하고 있기 때문에, Node.js의 CJS를 지원하는 것이 중요했습니다.

그리고 Module System의 지원은 브라우저 환경에서의 퍼포먼스와도 관련이 있습니다. 브라우저 환경에서는 페이지 렌더링을 빠르게 하는 것이 중요한데, 이 때 JavaScript는 로딩되어 실행되는 동안 페이지 렌더링을 중단시키는 리소스들 중 하나 입니다.

따라서 JavaScript 번들의 사이즈를 줄여서 렌더링이 중단되는 시간을 최소화 하는 것이 중요합니다. 이를 위해 필요한 것이 바로 Tree-shaking입니다. Tree-shaking이란 필요하지 않은 코드와 사용되지 않는 코드를 삭제하여 JavaScript 번들의 크기를 가볍게 만드는 것을 말합니다.

이 때, CJS는 Tree-shaking이 어렵고, ESM은 쉽게 가능합니다.

왜냐하면 CJS는 기본적으로 `require` / `module.exports` 를 동적으로 하는 것에 아무런 제약이 없습니다.

```jsx
// require
const utilName = /* 동적인 값 */
const util = require(`./utils/${utilName}`);

// module.exports
function foo() {
  if (/* 동적인 조건 */) {
    module.exports = /* ... */;
  }
}
foo();
```

따라서 CJS는 빌드 타임에 정적 분석을 적용하기가 어렵고, 런타임에서만 모듈 관계를 파악할 수 있습니다.

하지만 ESM은 정적인 구조로 모듈끼리 의존하도록 강제합니다. import path에 동적인 값을 사용할 수 없고, export는 항상 최상위 스코프에서만 사용할 수 있습니다.

```jsx
import util from `./utils/${utilName}.js`; // 불가능

import { add } from "./utils/math.js"; // 가능

function foo() {
  export const value = "foo"; // 불가능
}

export const value = "foo"; // 가능
```

따라서 ESM은 빌드 단계에서 정적 분석을 통해 모듈 간의 의존 관계를 파악할 수 있고, Tree-shaking을 쉽게 할 수 있습니다.

위와 같은 배경으로 토스팀에서는 CJS/ESM 모두 지원하는 라이브러리를 운영하게 되었습니다.

## 파일이 CJS인지 ESM인지 어떻게 알아요?

Module System이 두 개가 존재하며 둘 다 지원해야할 필요성은 알겠는데, `.js` 파일이 CJS인지 ESM인지 어떻게 알 수 있을까요? package.json의 `type` field 또는 확장자를 보고 알 수 있습니다.

- `.js` 파일의 Module System은 package.json의 `type` field에 따라 결정됩니다.
  - `type` field의 기본값은 `"commonjs"` 이고, 이 때 `.js` 는 CJS로 해석됩니다.
  - 다른 하나는 `"module"` 입니다. 이 때 `.js` 는 ESM으로 해석됩니다.
- `.cjs` 는 항상 CJS로 해석됩니다.
- `.mjs` 는 항상 ESM으로 해석됩니다.

TypeScript도 4.7부터 `tsconfig.json` 의 `moduleResolution` 이 `nodenext` 또는 `node16` 으로 설정된 경우, 위 규칙이 똑같이 적용됩니다.

- `type` field가 `"commonjs"` 인 경우, `.ts` 는 CJS로 해석됩니다.
- `type` field가 `"module"` 인 경우, `.ts` 는 ESM으로 해석됩니다.
- `.cts` 는 항상 CJS로 해석됩니다.
- `.mts` 는 항상 ESM으로 해석됩니다.

# package.json의 exports field

CJS와 ESM의 차이, 패키지의 기본 Module System을 설정하는 방법과 확장자 모두 알아봤는데, 그래서 어떻게 하면 하나의 패키지가 CJS/ESM을 동시에 매끄럽게 제공할 수 있을까요?

정답은 `exports` field입니다. `exports` field는 무슨 문제를 해결해줄까요? 어떤 역할을 할까요?

## 패키지 entry point 지정

기본적으로는 package.json의 `main` field와 같은 역할을 합니다. 패키지의 entry point를 지정할 수 있습니다.

## subpath exports 지원

기존에는 filesystem 기반으로 동작했기 때문에, 패키지 내부의 임의의 JS 파일에 접근할 수 있었고, 또한 실제 filesystem 상의 위치와 import path를 다르게 둘 수 없었습니다.

```jsx
// 디렉토리 구조
/modules
  a.js
  b.js
  c.js
index.js

require("package/a"); // 불가능
require("package/modules/a"); // 가능
```

이 때, `exports` field를 사용해 subpath exports를 사용하면, 명시된 subpath 외에는 사용할 수 없고, filesystem 상의 위치와 import path를 다르게 지정할 수 있습니다.

```json
// CJS 패키지
{
  "name": "cjs-package",
  "exports": {
    ".": "./index.js",
    "./a": "./modules/a.js"
  }
}
```

```tsx
// ./a.js가 아니라
// ./modules/a.js를 불러온다.
require("cjs-package/a");

// 에러
// ./b는 exports field에 명시하지 않은 subpath이다.
require("cjs-package/b");
```

## conditional exports 지원

기존에는 filesystem 기반으로 동작했기 때문에, Dual CJS/ESM 패키지를 자연스럽게 운영하기가 어려웠습니다.

`exports` field를 사용하면, 똑같은 import path에 대해 특정 조건에 따라 다른 모듈을 제공할 수 있습니다.

```json
{
  "name": "cjs-package",
  "exports": {
    ".": {
      "require": "./dist/index.cjs",
      "import": "./esm/index.mjs"
    }
  }
}
```

```tsx
// CJS 환경
// ./dist/index.cjs를 불러온다.
const pkg = require("cjs-package");

// ESM 환경
// ./esm/index.mjs를 불러온다.
import pkg from "cjs-package";
```

## 올바른 exports field

Dual CJS/ESM 패키지의 `exports` field를 올바르게 작성하기 위해 주의해야할 점을 알아봅시다.

### 상대 경로로 표시하기

`exports` field는 모두 `.` 으로 시작하는 상대 경로로 작성되어야 합니다.

```json
// X
{
  "exports": {
    "sub-module": "dist/modules/sub-module.js"
  }
}

// O
{
  "exports": {
    ".": "./dist/index.js",
    "./sub-module": "./dist/modules/sub-module.js"
  }
}
```

### Module System에 따라 올바른 확장자 사용하기

conditional exports를 사용할 때, 패키지가 따르는 Module System에 따라, 즉 package.json의 `type` field에 따라 올바른 JS 확장자를 사용해야 합니다.

- CJS 패키지일 때

```json
// ESM은 .mjs로 명시해야함
{
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./dist/index.mjs"
    }
  }
}
```

- ESM 패키지일 때

```json
// CJS는 .cjs로 명시해야함
{
  "type": "module"
  "exports": {
    ".": {
      "require": "./dist/index.cjs",
      "import": "./dist/index.js"
    }
  }
}
```

이 규칙을 지키지 않고 전부 `.js` 확장자를 사용했을 때는 어떤 일이 발생할까요? 아래와 같이 상황을 가정하겠습니다.

- `cjs-package` 는 CJS 패키지이다.
  - `type` field가 `"commonjs"` 이기 때문이다.
- `./dist/index.js` 는 CJS 문법(`require` / `module.exports`)으로 작성된 모듈이다.
- `./esm/index.js` 는 ESM 문법(`import` / `export`)으로 작성된 모듈이다.

```jsx
{
  "name": "cjs-package",
  "type": "commonjs",
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./esm/index.js"
    }
  }
}
```

CJS 환경에서 `cjs-package` 를 `require` 했을 땐 잘 동작합니다. `./dist/index.js` 는 CJS 모듈이고, 확장자가 `.js` 이므로, 가장 가까운 package.json의 `type` field를 따라 CJS Module Loader가 사용될 것이기 때문입니다.

```jsx
// 잘 동작한다.
// ./dist/index.js를  CommonJS Module Loader로 불러온다.
const pkg = require("cjs-package");
```

하지만 ESM 환경에서 `cjs-package` 를 `import` 했을 땐 에러가 발생합니다. `./esm/index.js` 는 ESM 모듈이지만, 확장자가 `.js` 이므로 가장 가까운 package.json의 `type` field를 따라 CJS Module Loader가 사용됩니다.

ESM 문법으로 작성된 JavaScript를 CJS Module Loader로 읽기 때문에 당연히 에러가 발생합니다.

(예시: `import` 문은 ESM에서만 사용 가능하다는 에러가 발생)

```jsx
// 에러가 발생한다.
// ./esm/index.js를 CJS Module Loader로 읽었다.
import * as pkg from "cjs-package";
```

### TypeScript 지원하기

TypeScript에서 module import시, 항상 Type Definition을 찾게 되는데요. 기존에는 filesystem 기반으로 Type Definition을 탐색했습니다.

```tsx
// ./sub-module.d.ts를 찾는다.
import subModule from "package/sub-module";
```

하지만 TypeScript 4.7부터 `moduleResolution` 옵션에 `node16` 과 `nodenext` 가 정식으로 추가되었고, `node16` 과 `nodenext` 는 filesystem 기반이 아닌 `exports` field로부터 Type Definition을 탐색합니다. 또한, CJS TypeScript( `.cts` )와 ESM TypeScript( `.mts` )를 구분합니다.

TypeScript는 conditional import의 조건 중 `types` 를 참조하며, 이 때 JavaScript와 마찬가지로 package.json의 `type` field에 따라 알맞은 확장자 ( `.cts` / `.mts` )를 사용해야 합니다.

- CJS 패키지

```json
// ESM TS는 mts로 명시해야함
{
  "exports": {
    ".": {
      "require": {
        "types": "./index.d.ts",
        "default": "./index.js"
      },
      "import": {
        "types": "./index.d.mts",
        "default": "./index.mjs"
      }
    }
  }
}
```

- ESM 패키지

```tsx
// CJS TS는 cts로 명시해야함
{
  "type": "module",
  "exports": {
    ".": {
      "require": {
        "types": "./index.d.cts",
        "default": "./index.cjs"
      },
      "import": {
        "types": "./index.d.ts",
        "default": "./index.js"
      }
    }
  }
}
```

그럼 TypeScript의 경우에는 위 규칙을 지키지 않으면 어떻게 될까요? 아래와 같이 상황을 가정하겠습니다.

- `esm-package` 는 ESM 패키지이다.
  - `type` field가 `"module"` 이기 때문이다.
- `.cts` (CJS TypeScript)에서 `esm-package` 를 사용한다.

```jsx
{
  "name": "esm-package",
  "type": "module",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "require": "./index.cjs",
      "import": "./index.js"
    }
  }
}
```

이 때 `.cts` (CJS TypeScript)에서 `esm-package` 를 require하면 타입 에러가 발생합니다.

`esm-package` 는 Type Definition을 `./index.d.ts` 만 지원합니다. 즉, ESM/CJS TypeScript 모두 `./index.d.ts` 를 바라보게 됩니다.

이 때, `esm-package` 는 ESM 패키지이기 때문에 `index.d.ts` 는 ESM TypeScript로써 해석됩니다.

따라서 `esm-package` 는 CJS TypeScript 입장에서 Pure ESM Module이고, CJS는 ESM을 불러올 수 없기 때문에 `esm-package` 가 순수 ESM으로만 확인된다는 타입 에러가 발생합니다.

```jsx
// index.cts

// Type Error: esm-package는 동기적으로 가져올 수 없는 ES 모듈로만 확인됩니다.
// CJS TypeScript를 위한 .d.cts를 지원하지 않았기 때문에 발생하는 에러
import * as esmPkg from "esm-package";
```

# 마치며

최근 토스팀 내부 라이브러리들은 위처럼 올바르게 `exports` field를 작성하여 배포되고 있습니다. CJS/ESM JavaScript는 물론 TypeScript 지원까지 잘 되있습니다.

JavaScript/TypeScript 생태계는 계속해서 발전하고 있지만, TypeScript까지 잘 지원하는 라이브러리는 정말 유명한 라이브러리들 중에서도 찾아보기가 많이 힘듭니다.

그렇다면 우리가 그 시작점이 되면 어떨까요? 토스팀에서는 이런 기술적인 문제를 함께 풀어가고 싶으신 분들을 언제나 환영합니다. 함께 좋은 생태계를 만들어 나가고 싶어요.

# 레퍼런스

- Node.js의 CJS/ESM에 대해
  - [CJS](https://nodejs.org/api/modules.html)
  - [ESM](https://nodejs.org/api/esm.html)
  - [Determining Module System](https://nodejs.org/api/packages.html#determining-module-system)
- `exports` field에 대해
  - [package.json export field](https://nodejs.org/api/packages.html#exports)
  - [Subpath exports](https://nodejs.org/api/packages.html#subpath-exports)
  - [Conditional exports](https://nodejs.org/api/packages.html#conditional-exports)
- TypeScript의 CJS/ESM 지원에 대해
  - [4.7 릴리즈 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html)
