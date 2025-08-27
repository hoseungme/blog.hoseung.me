---
title: 완벽한 트리 쉐이킹을 위한 라이브러리 번들링
date: 2025-08-27T00:00:00+09:00
description: 라이브러리를 번들링할 때 무엇을 고려해야 할까요? 번들링 결과물이 어떻게 나오는 것이 가장 좋을까요?
---

약 2년 전, [tsup으로 라이브러리 번들링을 아주 간단히 할 수 있다는 글](http://blog.hoseung.me/2023-07-22-improve-library-bundling)을 작성한 적이 있습니다. 해당 글에서는 아래와 같은 이유로 `tsup` 도입을 권유합니다.

1. 복잡한 Config 파일 작성이 필요하지 않아 러닝 커브가 낮다.
2. 커맨드 한 줄로 Tree Shaking, 코드 압축, 모듈 시스템 지원 등을 모두 처리할 수 있다.

이는 확실히 `tsup`을 통해 얻을 수 있는 큰 이점입니다. 하지만 라이브러리 번들링, 특히 프론트엔드 프로젝트에서 사용할 라이브러리의 번들링을 잘 하기 위한 측면에서 본다면 고려하지 못한 것들이 많습니다. 제가 작성했지만 굉장히 단편적인 시야를 가진 글입니다.

그런데 '라이브러리 번들링을 잘 한다'는 것이 대체 무엇일까요? 이 글에서는 현 시점의 제가 생각하는 가장 이상적인 라이브러리 번들링에 대해 다루어보겠습니다.

## 프론트엔드 번들과 라이브러리 번들

일단 우리가 지금까지 알고 있던 모든 것은 잠시 잊어버리고, 태초마을로 돌아가봅시다. 번들링이 무엇일까요?

번들링이란 **여러 개의 모듈을 하나 이상의 모듈로 합치는 것**입니다. 특정 모듈을 시작 지점으로 정하여 모듈 간의 의존 관계를 파악해 트리로 구성하고 분석하여 합치는 것이죠. 번들링 과정에서는 사용되지 않는 코드를 지우는 트리 쉐이킹, 코드를 최대한 짧게 만들어 용량을 줄이는 압축 등 여러가지 최적화 또한 진행할 수 있습니다.

하지만 그런 최적화는 **브라우저가 다운로드하여 사용**하는 **프론트엔드 번들** 입장에서 중요한 것이고, **개발자가 패키지 매니저를 통해 다운로드**하는 **라이브러리 번들**은 다릅니다. 라이브러리 번들은 여전히 **Node.js 모듈 시스템 하에서 모듈로써 사용**되며, **또 다른 번들링 과정에 포함**됩니다.

즉, 프론트엔드 번들을 **최종 번들**이라고 한다면, 라이브러리 번들은 최종 번들링에 사용될 **중간 번들**이라고 볼 수 있습니다. 따라서 라이브러리 번들은 **프론트엔드 번들이 이상적인 구조로 만들어질 수 있게 돕는 구조**여야 합니다.

그렇다면 이상적인 프론트엔드 번들이란 무엇일까요?

## 이상적인 프론트엔드 번들

기본적으로 JavaScript는 전부 다운로드되고 실행될 때까지 브라우저의 렌더링을 중단시키는 렌더링 차단 요소 중 하나이기 때문에, 용량을 최대한 줄여 빠른 속도로 다운로드되게 만드는 것이 중요합니다.

즉, 프론트엔드 번들링에서 가장 중요한 것은 바로 필요한 코드만 번들에 추가하고, 필요 없는 코드는 제외하는 **트리 쉐이킹**입니다. 간단한 예시를 봅시다.

```javascript
// math 라이브러리
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}
```

```javascript
// index.js
import { add } from "math";

console.log(add(1, 2));
```

위 예시에서 `index.js`가 `math` 라이브러리에 의존하고 있지만, `add` 함수만 가져와 사용하고 있기 때문에 `subtract` 함수는 번들에 포함시킬 필요가 없습니다. 따라서 트리 쉐이킹이 적용된 결과는 아래와 같아야 합니다.

```javascript
function add(a, b) {
  return a + b;
}

console.log(add(1, 2));
```

이렇게 **필요한 코드로만 이루어진 프론트엔드 번들이 가장 이상적**이라고 볼 수 있고, 이를 위해 **라이브러리는 트리 쉐이킹이 잘 동작할 수 있는 구조로 번들링**되어야 합니다.

다시 강조하지만, 라이브러리 번들은 **중간 번들**입니다. 따라서 미래형으로 "**트리 쉐이킹이 잘 동작할 수 있는**"이라고 설명한 것입니다.

이제 어떤 구조가 트리 쉐이킹을 잘 동작하게 만드는지 하나씩 알아봅시다.

## 트리 쉐이킹이 잘 동작할 수 있는 구조 1: ESM

프론트엔드 프로젝트 규모가 조금만 커져도 트리 쉐이킹이 어려워지는 경우가 많습니다. 보통 새롭게 설치한 라이브러리, 또는 해당 라이브러리가 의존하고 있는 다른 라이브러리에 문제가 있는 경우가 많습니다.

대표적인 라이브러리로 `lodash`가 있습니다. 그 이유는 `lodash`가 CJS로 작성된 라이브러리이고, CJS는 아래 예시와 같이 동적인 모듈 시스템이기 때문입니다.

```javascript
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

실제로 [lodash의 코드](https://github.com/lodash/lodash/blob/8a26eb42adb303f4adc7ef56e300f14c5992aa68/lodash.js)를 확인해보면, 플랫폼 구분을 `package.json`의 `exports`를 사용하지 않고 `typeof module == 'object'`와 같은 조건을 사용해 런타임에서 진행하며, 이에 따라 require/exports 또한 동적입니다.

즉, CJS 모듈은 런타임에서조차 모듈 관계를 정확히 파악할 수 없고, 트리 쉐이킹은 빌드 타임에 정적으로 코드를 분석한 결과를 기반으로 동작합니다. 따라서 트리 쉐이킹이 CJS 모듈에는 적용되기 어려운 것이고, `lodash`의 일부만 사용하더라도 모든 코드가 번들에 포함되는 것입니다.

따라서 프론트엔드에서 사용되는 라이브러리는 ESM 모듈을 중심으로 작성해야 합니다. ESM은 CJS와 다르게 정적인 모듈 시스템입니다.

```javascript
// import
import { add } from "./add.js";

// export
export function add(a, b) {
  return a + b;
}
```

위 예시처럼 ESM의 import/export 문은 최상위에서만 사용해야 하며, 동적으로 실행될 수 없습니다. 따라서 코드를 읽는 것 만으로도, 즉 정적 분석만으로도 모듈 관계를 파악할 수 있어 트리 쉐이킹이 잘 동작합니다.

## 트리 쉐이킹이 잘 동작할 수 있는 구조 2: 사이드 이펙트

번들러는 트리 쉐이킹을 효율적으로 진행하기 위해, 전체가 아닌 실제로 필요한 일부분에만 정적 분석을 진행합니다. 그리고 정적 분석을 진행하거나 건너뛰는 단위는 크게 두 가지가 있습니다.

첫 번째 단위는 export입니다. 번들러는 **모듈에서 실제로 사용된 export만 정적 분석에 포함**합니다.

```javascript
// object.js
export function pick(obj, keys) {
  /* ... */
}

export function omit(obj, keys) {
  /* ... */
}
```

```javascript
// index.js
import { pick } from "./object.js";

// ...
```

위 예시에서 `object.js`에서는 `pick`, `omit`을 export하지만, `index.js`는 `pick`만 사용합니다. 따라서 `omit`에 대한 정적 분석은 건너뛰는 것이 효율적입니다.

두 번째 단위는 모듈입니다. 번들러는 **정적 분석이 필요 없는 모듈을 통으로 건너뛸 수 있습니다.**

```javascript
// polyfill.js
Array.prototype.find = Array.prototype.find ?? function (callback) {
  /* ... */
}
```

```javascript
// index.js
import "./polyfill.js";
import { languages } from "./constants/anguages.js";

export function isSupportedLanguage(language) {
  return languages.find((_language) => _language === language) != null;
}
```

위 예시에서 번들러 입장에서 `index.js`가 `polyfill.js`에 의존하고 있는 것은 아무 것도 없습니다. 무의미하게 import하여 실행만 되는 모듈일 뿐입니다. 따라서 `polyfill.js` 모듈에 대한 정적 분석을 통으로 건너뛰는 것이 훨씬 효율적입니다.

하지만 실제로는 이렇게 간단하지 않습니다. 모듈이 실행되는 것 만으로 어떤 사이드 이펙트가 있을지 모르고, 때로는 그 사이드 이펙트가 필수적일 수도 있습니다. `polyfill.js`가 번들에서 제외된다면 `Array.prototype.find`가 지원되지 않는 환경에서 `isSupportedLanguage`가 정상적으로 동작하지 않을 것입니다.

따라서 **번들러는 보수적으로 모든 모듈이 사이드 이펙트를 가진다고 간주하고 정적 분석을 진행**합니다. 하지만 상술했듯이 **모듈을 통으로 건너뛸 수 있다면 매우 효율적으로 트리 쉐이킹을 진행**할 수 있고, 개발자는 어떤 모듈을 건너뛰어도 되는지 이미 알고 있을 것입니다.

따라서 개발자는 `package.json`의 `sideEffects`를 통해 **어떤 모듈이 사이드 이펙트를 가지는지 명시**할 수 있습니다.

```json
{
  "sideEffects": false
}
```

`sideEffects`가 `false`인 경우, 번들러는 **모든 모듈에 사이드 이펙트가 없다고 간주**하고, 사용된 export가 없는 모듈은 정적 분석 없이 즉시 번들에서 제외합니다.

```json
{
  "sideEffects": ["./src/polyfill.js", "*.css"]
}
```

`sideEffects`에 모듈명을 명시할 경우, 번들러는 **해당 모듈에 사이드 이펙트가 있다고 간주**하고 정적 분석을 무조건 진행합니다.

## 트리 쉐이킹이 잘 동작할 수 있는 구조 3: 모듈 트리 유지

프론트엔드 번들링과 마찬가지로, 라이브러리 번들링 또한 여러 모듈을 하나의 모듈로 합치는 방식으로 진행하는 경우가 있습니다. 대표적인게 `tsup`의 기본값입니다.

하지만 라이브러리 번들은 모듈 트리를 그대로 유지하는 것이 트리 쉐이킹에 가장 좋습니다. 아래의 라이브러리 프로젝트를 두 방식으로 번들링하는 시나리오를 각각 비교해보겠습니다.

```
src/
  add.js
  subtract.js
  index.js
```

```javascript
// add.js
import * as _ from "lodash";

export function add(a, b) {
  return _.add(a, b);
}
```

```javascript
// subtract.js
export function subtract(a, b) {
  return a - b;
}
```

```javascript
// index.js
export * from "./add.js";
export * from "./subtract.js";
```

### 1. 하나의 모듈로 합치기

위 프로젝트를 **하나의 모듈인 `dist/index.js`로 합치는 방식으로 번들링**하여 `math` 라이브러리를 배포한다고 가정합시다.

```json
// package.json
{
  "name": "math",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

```javascript
// dist/index.js
import * as _ from "lodash";

export function add(a, b) {
  return _.add(a, b);
}

export function subtract(a, b) {
  return a - b;
}
```

그리고 프론트엔드 프로젝트에서 `math`를 설치한 뒤 `subtract`만 사용하고 번들링을 하면 어떻게 될까요?

```jsx
import { subtract } from "math";

export function SubtractDemo() {
  return <div>1 - 4: {subtract(1, 4)}</div>
}
```

개발자는 당연히 `subtract`만 프론트엔드 번들에 포함되고, `add`와 그 내부에서 사용하는 `lodash`는 제외되길 기대하겠지만, **실제로는 `subtract`와 함께 `lodash` 또한 번들에 통으로 포함**됩니다.

왜냐하면 번들러가 `dist/index.js`를 정적 분석했을 때, `add`는 사용되지 않았기 때문에 간단히 제외하면 되지만, `lodash`는 **CJS 모듈이기 때문에 정적 분석으로는 판단할 수 없어 포함**할 수 밖에 없습니다.

### 2. 모듈 트리를 유지하기

이번에는 위와 다르게 **모듈 트리를 그대로 유지하고, 각 모듈이 사이드 이펙트가 없다고 명시하는 방식으로 번들링**한다고 가정합시다. **프론트엔드 프로젝트에서는 똑같이 `subtract`만 사용**합니다.

```
dist/
  add.js
  subtract.js
  index.js
```

```json
// package.json
{
  "name": "math",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "dependencies": {
    "lodash": "^4.17.21"
  },
  "sideEffects": false
}
```

```javascript
// dist/add.js
import * as _ from "lodash";

export function add(a, b) {
  return _.add(a, b);
}
```

```javascript
// dist/subtract.js
export function subtract(a, b) {
  return a - b;
}
```

```javascript
// dist/index.js
export { add } from "./add.js";
export { subtract } from "./subtract.js";
```

그리고 프론트엔드 프로젝트를 번들링했을 때, 이번에는 **개발자가 기대한대로 `subtract`만 번들에 포함**됩니다. 모든 모듈에 **사이드 이펙트가 없다고 명시했기 때문**입니다.

번들러 입장에서 `dist/index.js`는 `add.js`와 `subtract.js`를 re-export하고 있는데 실제로 사용되고 있는 모듈은 `subtract.js`밖에 없습니다. 따라서 **사용되지도 않았고, 사이드 이펙트조차 없는 `add.js`는 정적 분석을 진행하지 않고 번들에서 제외**합니다.

그런데 여기서 **만약 사이드 이펙트가 없다는 것을 명시하지 않았다면** 어떻게 될까요? `add.js`가 사용되진 않았지만, 사이드 이펙트가 있을 수 있으므로 정적 분석 단계에 포함되고, **그 과정에서 `lodash`가 평가되어 번들에 포함**됩니다.

이것이 모듈 트리 유지와 사이드 이펙트 명시의 중요성입니다. **모듈의 정적 분석을 건너뛰는 것은 단순히 번들링 효율 개선만을 의미하는 것이 아닙니다.** 번들링 결과물에도 큰 영향을 줄 수 있습니다.

## 트리 쉐이킹이 잘 동작할 수 있는 구조: 정리

위 내용을 종합하면, 아래 3가지를 잘 지키면 트리 쉐이킹이 정말 잘 동작하는 라이브러리를 만들 수 있습니다.

1. ESM 지원을 필수로 하고, CJS만 지원하는 라이브러리는 사용하지 않아야 함
2. 모듈을 최대한 분리하여 작성하고, 번들링시에도 합치지 않아야 함
3. 번들러가 정적 분석을 건너뛸 수 있게 모듈의 사이드 이펙트를 정확히 명시해야 함

또한 브라우저에서 사용될 **최종 번들**, 그리고 다른 프로젝트에서 Node.js 모듈로써 사용되어 번들링 과정에 다시 포함되는 **중간 번들**의 개념을 인지하고 그 둘을 구분해야 합니다.

Rollup을 사용해 위 구조를 따라서 번들링하는 예제를 깃허브에 올려두었습니다. TypeScript 지원, React 지원, CJS와 ESM 동시 지원까지 포함되어있으니 좋은 참고자료가 되었으면 좋겠습니다.

[https://github.com/hoseungme/library-bundling-example](https://github.com/hoseungme/library-bundling-example)
