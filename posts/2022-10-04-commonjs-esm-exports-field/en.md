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

> This is an article I wrote for the Toss technology blog, where I am currently employed. [Original link (Korean)](https://toss.tech/article/commonjs-esm-exports-field)

In the Toss Frontend Chapter, we continuously move repeated code into libraries to improve development productivity. As a result, we are currently maintaining more than 100 libraries.

Since Node.js 12, a new module system called ECMAScript Modules (ESM) has been added, alongside the existing CommonJS module system (CJS). This means that libraries now need to support both module systems.

At Toss, we support this through the `exports` field in the `package.json`. Let's take a closer look at each module system and the `exports` field.

# Two Module Systems in Node.js

Node.js has two module systems: CommonJS (CJS) and ECMAScript Modules (ESM).

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

- CJS uses `require` / `module.exports`, while ESM uses `import` / `export` statements.
- The CJS module loader works synchronously, while the ESM module loader works asynchronously.
  - Because ESM supports [Top-level Await](https://nodejs.org/api/esm.html#top-level-await).
- Therefore while ESM can import CJS, the reverse is not possible because CJS does not support Top-level Await.
- Additionally, the two module systems have different default behaviors, making them difficult to be compatible.

## Why Support Two Module Systems?

Why should we support two module systems that are challenging to make compatible? Why not just choose one? Why does Toss consider this important?

Toss actively uses Server-side Rendering (SSR), so we should support CJS for Node.js environment.

Module system support also relates to performance in the browser environment. In the browser, rapid page rendering is important and especially JavaScript is one of the resources that stops the rendering during loading.

Therefore it is important to reduce the size of JavaScript bundles, to minimize the time rendering is interrupted. To do so, Tree-shaking, the process of eliminating unnecessary and unused code, is essential.

CJS makes tree-shaking challenging, while ESM makes it more straightforward.

CJS allows to dynamically use `require` / `module.exports`:

```jsx
// require
const utilName = /* dynamic value */;
const util = require(`./utils/${utilName}`);

// module.exports
function foo() {
  if (/* dynamic condition */) {
    module.exports = /* ... */;
  }
}
foo();
```

Therefore, CJS is challenging to apply static analysis during build time, so module relationships are only determined at runtime.

On the other hand, ESM enforces a static structure, disallowing dynamic values in `import` path and restricting use of `exports` to the top-level scope:

```jsx
import util from `./utils/${utilName}.js`; // Not allowed

import { add } from "./utils/math.js"; // Allowed

function foo() {
  export const value = "foo"; // Not allowed
}

export const value = "foo"; // Allowed
```

This allows ESM to perform static analysis during the build, making tree-shaking easier.

Given these considerations, Toss decided to maintain libraries that support both CJS and ESM.

## Determining If a File Is CJS or ESM

With the two module systems and the need to support both, how can we determine whether a `.js` file is CJS or ESM? This is done by looking at the `type` field in `package.json` or the file extension.

- The module system of a `.js` file is determined by the `type` field in `package.json`.
  - The default value of the `type` field is `"commonjs"`, interpreting `.js` as CJS.
  - Another option is `"module"`, where `.js` is interpreted as ESM.
- `.cjs` files are always interpreted as CJS.
- `.mjs` files are always interpreted as ESM.

TypeScript also applies the same rules when the `moduleResolution` option in `tsconfig.json` is set to `nodenext` or `node16`, starting from 4.7.

- When the `type` field is `"commonjs"`, `.ts` files are interpreted as CJS.
- When the `type` field is `"module"`, `.ts` files are interpreted as ESM.
- `.cts` files are always interpreted as CJS.
- `.mts` files are always interpreted as ESM.

# package.json's exports field

Now we have understood the differences between CJS and ESM, like how to set the default module system for a package, and how extensions work.

But how can a single package smoothly provide both CJS and ESM?

The answer is the `exports` field. What problems does the `exports` field solve, and what is its role?

## Package Entry Point Specification

By default, the `exports` field does the same role of the `main` field in `package.json`. It allows specifying the package's entry point.

## Subpath Exports Support

In the previous filesystem-based approach, accessing any JS file within a package was possible, and the actual location of the files and import path could not differ.

```jsx
// Directory structure
/modules
  a.js
  b.js
  c.js
index.js

require("package/a"); // Not allowed
require("package/modules/a"); // Allowed
```

By using the `exports` field and making imaginary subpath, the import path can differ from the actual location of the files:

```json
// CJS package
{
  "name": "cjs-package",
  "exports": {
    ".": "./index.js",
    "./a": "./modules/a.js"
  }
}
```

```tsx
// Imports ./modules/a.js, not ./a.js
require("cjs-package/a");

// Error
// ./b is not specified in the exports field.
require("cjs-package/b");
```

## Conditional Exports Support

In the past, making a Dual CJS/ESM package was challenging due to filesystem-based operations.

With the `exports` field, you can use the same import path to provide different modules based on specific conditions:

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
// Imports ./dist/index.cjs
const pkg = require("cjs-package");

// In ESM environment
// Imports ./esm/index.mjs
import pkg from "cjs-package";
```

## Writing the Correct Exports Field

To correctly write the `exports` field for a Dual CJS/ESM package, there are some points to consider:

### Use Relative Paths

All paths in the `exports` field must start with `.` representing relative paths:

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

### Use the Correct Extension Based on the Module System

When using conditional exports, you must use the correct extension based on the module system that the package follows(the `type` field in `package.json`):

- For CJS packages:

```json
// ESM must specify .mjs
{
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "import": "./dist/index.mjs"
    }
  }
}
```

- For ESM packages:

```json
// CJS must specify .cjs
{
  "type": "module",
  "exports": {
    ".": {
      "require": "./dist/index.cjs",
      "import": "./dist/index.js"
    }
  }
}
```

Not following this rule and using `.js` for all extensions may lead to unexpected behaviors. Let's consider a scenario:

- `cjs-package` is a CJS package.
  - Because its `type` field is set to `"commonjs"`.
- `./dist/index.js` is a CJS module.
- `./esm/index.js` is an ESM module.

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

In CJS environment, requiring `cjs-package` works fine because `./dist/index.js` is a CJS module and the extension is `.js`, so the CJS Module Loader is used:

```jsx
// Works fine.
// Imports ./dist/index.js with CommonJS Module Loader.
const pkg = require("cjs-package");
```

However, in ESM environment, importing `cjs-package` leads to an error. Because `./esm/index.js` is an ESM module but the extension is `.js`, so the CJS Module Loader is used:

```jsx
// Error occurs.
// Reads ./esm/index.js with CJS Module Loader.
import * as pkg from "cjs-package";
```

### TypeScript Support

In the past, TypeScript also works based on filesystem:

```typescript
// Imports ./sub-module.d.ts
import subModule from "package/sub-module";
```

But starting from 4.7, the `moduleResolution` option now includes `node16` and `nodenext`, which make it find Type Definitions based on the `exports` field and distinguishes between CJS TypeScript (`.cts`) and ESM TypeScript (`.mts`).

- For CJS packages:

```json
// ESM TS must specify mts
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

- For ESM packages:

```tsx
// CJS TS must specify cts
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

What happens if these rules are not followed? Let's consider a scenario:

- `esm-package` is an ESM package.
  - Because its `type` field is set to `"module"`.

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

In this case, attempting to require `esm-package` in `.cts` (CJS TypeScript) results in a type error because `esm-package` only supports `./index.d.ts`, which is interpreted as ESM TypeScript:

```jsx
// index.cts

// Type Error: esm-package is identified as an ES module that cannot be synchronously imported.
// This error occurs because .d.cts for CJS TypeScript is not supported.
import * as esmPkg from "esm-package";
```

# Conclusion

Recently, libraries at Toss have been deployed with the correct `exports` field. They not only support CJS/ESM JavaScript but also TypeScript seamlessly.

While the JavaScript/TypeScript ecosystem continues to evolve, libraries that support TypeScript well are still challenging to find, even among well-known ones.

So, why don't we become the starting point for this change? Toss always welcomes those who want to solve such technical challenges together. We want to contribute to building a thriving ecosystem together.

# References

- About Node.js CJS/ESM:
  - [CJS](https://nodejs.org/api/modules.html)
  - [ESM](https://nodejs.org/api/esm.html)
  - [Determining Module System](https://nodejs.org/api/packages.html#determining-module-system)
- About the `exports` field:
  - [package.json export field](https://nodejs.org/api/packages.html#exports)
  - [Subpath exports](https://nodejs.org/api/packages.html#subpath-exports)
  - [Conditional exports](https://nodejs.org/api/packages.html#conditional-exports)
- About TypeScript support for CJS and ESM:
  - [4.7 Release Note](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html)
