---
title: "How to develop a library compatible with CommonJS and ESM: exports field"
date: 2022-10-04T00:00:00+09:00
description: "There are two kinds of module systems in Node.js. How does front-end team of Toss handle it in 100+ libraries?"
thumbnail: ./thumbnail.png
locale: en
tags:
  - Node.js
  - Javascript
  - Typescript
---

I'm Hoseung Jang, front-end developer of Toss.

In front-end team of Toss, we have been making a new library to greatly improve our productivity. Therefore, now we maintains 100+ libraries.

Since Node.js 12, a new module system called ECMAScript Modules(ESM) was released. So there are two kinds of module systems in Node.js, CommonJS(CJS) and ESM.

We supports it using `exports` field in `package.json`. Let's learn about each of those systems and the field.

# Two Module Systems of Node.js

There are the two system in Node.js, CJS and ESM.

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

- CJS uses `require` / `module.exports` statement, ESM uses `import` / `export` statement.
- CJS module loader works synchronously, ESM module loader works asynchronously
  - Because ESM supports [Top-level Await](https://nodejs.org/api/esm.html#top-level-await).
- So you can `import` CJS in ESM but you cannot `require` ESM in CJS, because CJS doesn't support Top-level Await.
- And then each of those systems works differently.
- Therefore it is difficult to make them compatible.

## Why did we have to support both of the systems?

They are difficult to be compatible each other, but why?

In Toss, it is very important to support CJS because our front-end project is based on Server-side Rendering(SSR).

And supporting those systems affects to performance in browser. It is related to tree shaking.

It is very important to reduce a JavaScript bundle to make the time of critical-rendering-path faster, so we need tree-shaking. Tree-shaking is the operation to remove unused parts of modules.

CJS is difficult to tree-shake but ESM is easy, because CJS doesn't restrict to use `require` / `module.exports` dynamically:

```jsx
// require
const utilName = /* Dynamic value */
const util = require(`./utils/${utilName}`);

// module.exports
function foo() {
  if (/* Dynamic condition */) {
    module.exports = /* ... */;
  }
}
foo();
```

Therefore it is difficult to statically analyze CJS at the build time.

But ESM restricts to statically depend between modules. You cannot use dynamic value in `import` path and you can use `export` statement only on top-level scope.

```jsx
import util from `./utils/${utilName}.js`; // Impossible

import { add } from "./utils/math.js"; // Possible

function foo() {
  export const value = "foo"; // Impossible
}

export const value = "foo"; // Possible
```

Therefore it is able to statically analyze ESM at the build time so bundlers can tree-shake easily.

It is why we had to support.

## How to detect if `.js` is CJS or ESM?

Module system of `.js` is decided by `type` field in `package.json`

- If `type` field is set to `"commonjs"`, `.js` will be resolved as CJS.
  - It defaults to `"commonjs"`.
- If `type` field is set to `"module"`, `.js` will be resolved as ESM.
- `.cjs` will be always resolved as CJS.
- `.mjs` will be always resolved as ESM.

Since TypeScript 4.7, the above rule also applies if `moduleResolution` field in `tsconfig.json` is set to `nodenext` or `node16`.

- If `type` field is set to `"commonjs"`, `.ts` will be resolved as CJS.
- If `type` field is set to `"module"`, `.ts` will be resolved as ESM.
- `.cts` will be always resolved as CJS.
- `.mts` will be always resolved as ESM.

# `exports` field in `package.json`

Now you know about the difference between CJS and ESM, the way to set default module system of package, and `.cjs` and `.mjs` extensions. So how to support CJS and ESM at the same time, in one package?

The answer is `exports` field.

## Entry point for the package

Basically it does the same thing with `main` field in `package.json`.

## Subpath exports

Module resolution works based on file system, if `exports` field isn't set. So you can access to any `.js` files in a package, and import path cannot be set different from the file path.

```jsx
// file system
/modules
  a.js
  b.js
  c.js
index.js

require("package/a"); // Impossible
require("package/modules/a"); // Possible
```

But if `exports` field is set, you can only import modules specified in `exports` field.

```json
// CJS Package
{
  "name": "cjs-package",
  "exports": {
    ".": "./index.js",
    "./a": "./modules/a.js"
  }
}
```

```tsx
// Access ./modules/a.js
// Not ./a.js
require("cjs-package/a");

// Error
// ./b isn't specified in exports field.
require("cjs-package/b");
```

## Conditional exports

Module resolution based on file system makes it difficult to support CJS and ESM at the same time. But with `exports` field, you can make modules being resolved conditionally.

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
// In CJS environment
// Access ./dist/index.cjs
const pkg = require("cjs-package");

// In ESM environment
// Access ./esm/index.mjs
import pkg from "cjs-package";
```

## Correct exports field

Let's learn about what you need to be careful to write `exports` field correctly.

### Relative path

Paths in `exports` field should be relatvie, starting with `.`.

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

### Correct file extension depending on module system

If you use conditional exports, you should use the correct file extension depending on the current module system of your project.

- In CJS pacakge

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

- In ESM package

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

If you didn't follow the rule, what would happen? Assumes that:

- `cjs-package` is a CJS package.
  - Beacuse `type` field is set to `"commonjs"`.
- `./dist/index.js` is a module written with CJS syntax(`require` / `module.exports`).
- `./esm/index.js` is a module written with ESM syntax(`import` / `export`).

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

If you `require` `cjs-package` in CJS enviroment, it works. CJS module loader will be used because `./dist/index.js` has the extension `.js` and `type` field in the nearest package.json is set to `"commonjs"`.

```jsx
// It works.
// Access ./dist/index.js using CommonJS module loader.
const pkg = require("cjs-package");
```

But if you `import` `cjs-package` in ESM environment, it doesn't work. Even if `./esm/index.js` is ESM, CJS module loader will be used because the file extension is `.js` and `type` filed in the nearest package.json is set to `"commonjs"`.

```jsx
// Error
// ./esm/index.js is written with ESM syntax
import * as pkg from "cjs-package";
```

### Support TypeScript

TypeScript finds type definition for imported module, based on file system.

```tsx
// Find ./sub-module.d.ts
import subModule from "package/sub-module";
```

But since TypeScript 4.7, you can set `moduleResolution` to `node16` and `nodenext`. `node16` and `nodenext` tells TypeScript to find type definition based on `exports` field. In addition, it distinguishes CJS TypeScript(`.cts`, `.d.cts`) and ESM TypeScript(`.mts`, `.d.mts`).

In `exports` field, TypeScript accesses `types` condition. And you should use correct extension(`.cts`/`.d.cts` or `.mts`/`.d.mts`) depending on `type` field.

- CJS package

```json
// ESM TS should be .mts
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

- ESM package

```tsx
// CJS TS should be .cts
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

If you didn't follow the rule, what would happen? Assumes that:

- `esm-package` is a ESM package.
  - Beacuse `type` field is set to `"module"`.
- `.cts` uses `esm-package`.

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

Then a type error will be occurred because `esm-package` only provides `index.d.ts`.So both CJS and ESM TypeScript access to `index.d.ts`.

But `index.d.ts` is always resolved as ESM TypeScript, because `type` field in the nearest `package.json` is set to `"module"`. Therefore `esm-package` cannot be `require`d by CJS TypeScript.

```jsx
// index.cts

// Module 'esm-package' cannot be imported using this construct. The specifier only resolves to an ES module, which cannot be imported with 'require'. Use an ECMAScript import instead.
import * as esmPkg from "esm-package";
```

# End

Ecosystem of JavaScript and TypeScript continues to evolve, but there are only a few libraries which completely supports CJS, ESM, and even TypeScript.

So why don't you contribute to the ecosystem, by making such libraries?

# References

- About CJS and ESM of Node.js
  - [CJS](https://nodejs.org/api/modules.html)
  - [ESM](https://nodejs.org/api/esm.html)
  - [Determining Module System](https://nodejs.org/api/packages.html#determining-module-system)
- About `exports` field
  - [package.json export field](https://nodejs.org/api/packages.html#exports)
  - [Subpath exports](https://nodejs.org/api/packages.html#subpath-exports)
  - [Conditional exports](https://nodejs.org/api/packages.html#conditional-exports)
- About support CJS and ESM of TypeScript
  - [4.7 Release Note](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html)
