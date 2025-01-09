---
title: "My Journey to simplify Node.js library bundling process: Bundle a library with a single command"
date: 2023-07-22T00:00:00+09:00
description: "Configurations for library bundling are too long. Let's simplify them."
thumbnail: ./thumbnail.png
locale: en
tags:
  - Node.js
  - Javascript
  - Typescript
---

Having developed numerous libraries, I naturally found myself frequently writing bundling configuration code and I found it needs to be simplified.

So, in this article, I'm gonna recap my journey to simplify it.

# TypeScript Compiler is Enough?

When I knew very little, I just compiled TypeScript into JavaScript using the TypeScript compiler and uploaded it to NPM. But there were several issues.

## Issue 1: TypeScript compiler only does compile

The TypeScript compiler just compiles TypeScript into JavaScript. It means the compiler doesn't support the fundamentals of bundling, like minifying bundle, tree shaking.

For instance, compiling the following code:

```typescript
const foo = "bar";

export function add(a: number, b: number) {
  return a + b;
}
```

Using only the TypeScript compiler will result in:

```javascript
const foo = "bar";
export function add(a, b) {
  return a + b;
}
```

However, using other common bundler will result in:

```javascript
function o(n,r){return n+r}export{o as add};
```

This significantly impacts the bundled size in frontend projects using the library.

Although frontend projects might mitigate this impact through great bundler configurations, I think it is the responsibility of the library developer to ensure efficiency even in projects without such configurations.

## Issue 2: Not following Node.js module system standards

TypeScript's support for CommonJS and ESM started relatively recently and actually it doesn't correctly work.

Let's briefly understand both module systems. CommonJS manages modules with `require` / `module.exports`, and ESM manages modules with `import` / `export`.

```javascript
// CommonJS
const { add } = require("./add");

module.exports.foo = "bar";

// ESM
import { add } from "./add.js";

export const foo = "bar";
```

However, even though we always use `import` / `export` in TypeScript, does that mean TypeScript is ESM?

The answer is NO. They converted to `require` / `module.exports` after compiling.

For example, when compiling the following TypeScript to CommonJS:

```typescript
// sum.ts

import { add } from "./add";

export function sum(...nums: number[]) {
  return nums.reduce(add, 0);
}
```

`import` / `export` converted to CommonJS syntax:

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

It means that there are no problems if you compile CommonJS TypeScript into CommonJS JavaScript.

So, would there be no problems if you compile CommonJS TypeScript into ESM JavaScript? The result of compiling `sum.ts` above to ESM JavaScript is:

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

It might seem correctly written in ESM, but it doesn't. In ESM, the extension of imported module should be specified. Otherwise you will encounter the error below:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module ...
```

Therefore, it was impossible to support the two module systems only with TypeScript compiler so I started to search for solutions.

# Using Rollup

I realized it was so naive to dive into the complexity of Node.js only with TypeScript compiler. So I introduced `Babel` and `Rollup` to bundle properly.

First, I was exploring various `Rollup` plugins focusing on supporting the two module systems and found plugins below:

- `@rollup/plugin-babel` for Babel transpilation
- `@rollup/plugin-node-resolve` for Module Resolution
- `@rollup/plugin-commonjs` for converting CommonJS to ESM

```javascript
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import path from "path";
import packageJson from "./package.json" assert { type: "json" };
```

Then I wrote the `buildJS` function. It generates the Rollup configuration based on the library's entry path, output path, and which module system it follows.

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

Then I wrote two functions, `buildCJS` for creating CommonJS bundles and `buildESM` for creating ESM bundles, using `buildJS`.

```javascript
function buildCJS(input) {
  const parsed = path.parse(input);
  return buildJS(`src/${input}`, `dist/${parsed.dir}/${parsed.name}.js`, "cjs");
}

function buildESM(input) {
  return buildJS(`src/${input}`, "esm", "es");
}
```

Now, by using these functions, I got to be able to create a bundle for JavaScript projects. However, since there are TypeScript projects, I also had to provide type definitions (`.d.ts`).

But the issue that mentioned on the above section `Issue 1: TypeScript compiler only does compile` also occured for type definitions. So I bypassed it by applying `rollup-plugin-dts` plugin that creates type definitions in a single file:

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

Finally, by exporting created configurations by these functions, and setting `package.json`'s `exports` field, I was able to ensure full support for both CommonJS and ESM.

```javascript
export default [buildCJS("index.ts"), buildESM("index.ts"), buildCJSDTS("index.d.ts"), buildESMDTS("index.d.ts")];
```

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

However, there was a remained issue.

## Issue: Complexity to write configurations and steep learning curve

The configurations above are reusable.

But there are too many prior knowledges to write the configurations, like module systems in Node.js, the way that TypeScript handles the module systems, the cost for searching and selecting a bundler like Webpack and Rollup and exploring their ecosystem, etc.

They are so confused even for those who know about it well, then how about for beginners?

Wouldn't it be nice to be able to lower the learning curve? Like when we develop something, we just learn only basic concepts and then use well-abstracted tools.

# Bundle a library with a single command: tsup

To resolve all these issues, I introduced a bunder `tsup`.

`tsup` is different from other bundlers because it basically targets TypeScript library bundling. It also shows fast speed based on `esbuild`.

And It supports to compile TypeScript into both CommonJS and ESM and create type definitions without any plugins.

Moreover, `esbuild` basically does tree shaking and consequently `tsup` also does tree shaking and supports minifying.

And the most important thing is that you can get them with a single command.

```
tsup src/index.ts --format cjs,esm --dts --minify
```

P.S. In fact I found `tsup` a year ago, but at that time it lacked proper support for creating type definitions so I wasn't able to use it. But now there is no problem because it was updated.

# Conclusion

While the ecosystem continually evolves, bundling may remain a challenging experience for most developers.

If you so, I truly recommend you to introduce `tsup`, and I hope that the ecosystem gets more qualitative consequently.

I think that improving productivity is always a rewarding pursuit regardless of its scale.

# References

- [tsup Github](https://github.com/egoist/tsup)
- [How to develop a library compatible with CommonJS and ESM: exports field](https://blog.hoseung.me/en/2022-10-04-commonjs-esm-exports-field)
