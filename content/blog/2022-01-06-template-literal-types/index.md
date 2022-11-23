---
title: Template Literal Types로 Type-safe하게 express 라우터 작성하기
date: 2022-01-06T00:00:00+09:00
description: Typescript 4.1부터 출시된 Template Literal Types로 express 프로젝트의 타입 안정성을 더 높혀봅시다.
tags:
  - Typescript
---

## Template Literal Types?

타입스크립트 4.1부터 Template Literal Types라는 기능이 생겼습니다.

쉽게 말하면, 자바스크립트의 Template Literal 문법과 타입스크립트의 String Literal Type이 합쳐진 기능입니다.

```typescript
// Template Literal
const name = "장호승";
const str = `안녕하세요 제 이름은 ${name}입니다.`;

// String Literal Type
type Fruit = "apple" | "banana";
```

위의 두 가지가 합쳐지면 어떤 일이 일어날까요?

```typescript
type FirstName = "호승";
type Name = `장${FirstName}`; // "장호승"
```

String Literal Type을 Template Literal 문법으로 매핑시켜서 새로운 String Literal Type을 정의할 수 있습니다.

[Typescript Playground](https://www.typescriptlang.org/play?ts=4.5.4#code/C4TwDgpgBAYglgJwM7AHIEMC20C8UBEgHGuCdQ-gNwBQokUG2UeABoKXjAJAN7zJpYQC+jMlAD0wgsxL4KQA)

Union도 사용 가능합니다.

```typescript
type FirstName = "호승" | "래원";
type Name = `장${FirstName}`; // "장호승" | "장래원"
```

[Typescript Playground](https://www.typescriptlang.org/play?ts=4.5.4#code/C4TwDgpgBAYglgJwM7AHIEMC20C8UBEgHGuCdQ-lAD4GAZ7YAtj+A3AFCiRQbZR4AGgpeMAkAb3jI0WCAF8u9KAHoZBHiTKV8PWvkZA)

또한 infer 키워드도 활용할 수 있습니다.

```typescript
type ExtractFirstName<T extends string> = T extends `장${infer FirstName}` ? FirstName : never;
type FirstName = ExtractFirstName<"장호승">; // "호승"
```

[Typescript Playground](https://www.typescriptlang.org/play?ts=4.5.4#code/C4TwDgpgBAogHsATgQwMbAGIEtEGdgByyAthADwAqUECEAdgCa5T6JZ0DmAfFALxRUawekygADQKXjAEgDe7AGYREUbHkIkIAXzFQA-Cpz4ipKAC4odCADclAbgBQoSAbXHo-eEjSZD60mQAiCUAONcBOoYCuWygAemioALCA+yA)

### 간단한 예시

아주 간단한 예시를 들어보겠습니다. 이벤트와 그에 대응하는 이벤트 핸들러의 타입을 정의한다고 가정해봅시다.

그러면 아마 아래와 같이 코드를 작성할 것 같습니다.

```typescript
type EventName = "click" | "change" | "focus";

type EventHandlers = {
  onClick: () => void;
  onChange: () => void;
  onFocus: () => void;
};
```

위 코드의 문제점이 뭘까요? Event가 추가될 때마다 EventHanlders에 새로운 핸들러의 정의도 계속 추가해줘야 한다는 점입니다. 실수하기가 매우 좋은 환경입니다.

```typescript
type EventName = "click" | "change" | "focus" | "blur";

type EventHandlers = {
  onClick: () => void;
  onChange: () => void;
  onFocus: () => void;
  onBlur: () => void;
};
```

여기서 Template Literal Type을 사용하면, 이 문제를 해결할 수 있습니다.

```typescript
type EventName = "click" | "change" | "focus" | "blur";

/*
{
  onClick: () => void;
  onChange: () => void;
  onFocus: () => void;
  onBlur: () => void;
}
*/
type EventHandlers = {
  [key in `on${Capitalize<EventName>}`]: () => void;
};
```

[Typescript Playground](https://www.typescriptlang.org/play?ts=4.5.4#code/C4TwDgpgBAogbhAdsAcgQwLbQLxQEQDGANgJYEDWeUAPvgQBZqIDmEVteAZgPYECuAZ3b4ARkT4AnPAG4AULNCRYCZAAkmAEyIQJAqLgDesqFADa5CCCglEUAAbdEAEgMBhNGBLA0pAF4QAHngkVEwIAD4AXzsAXQAuKAAKAEp9cKg4bhINOUjZIA)

이제 Event만 추가해줘도 EventHandlers의 정의는 알아서 수정됩니다.

## Type-safe하게 라우터 작성하기

이 글에서 언급할 express의 문제는, path parameters가 req.params의 타입에 반영되지 않는 문제입니다.

```typescript
router.get("/users/:userId", async (req, res) => {
  /* ... */
});
```

위처럼 userId라는 parameter를 정의하더라도 req.params의 타입에는 적용되지 않습니다.

이 문제를 Template Literal Types로 해결해봅시다.

### 1. Path Parameters 추출

위에서 보여드렸던 3항 연산자와 infer 키워드를 사용해 path parameter의 이름들을 추출할 수 있습니다. 그걸 object의 keys로써 정의하여 req.params의 타입을 만들어낼 수 있습니다.

```typescript
type ExtractPathParameters<T extends string> = T extends `${any}:${infer ParameterName}/${infer Suffix}`
  ? { [key in ParameterName | keyof ExtractPathParameters<Suffix>]: string }
  : T extends `${any}:${infer ParameterName}`
  ? { [key in ParameterName]: string }
  : {};

/*
{
  userId: string;
  postId: string;
}
*/
type PathParams = ExtractPathParameters<"/users/:userId/posts/:postId">;
```

[Typescript Playground](https://www.typescriptlang.org/play?ts=4.5.4#code/C4TwDgpgBAogHsATgQwMbAArOACyygWwmAkQGcAeAFSggQgDsATMqMpASwYHMA+KALxQadEs1YADACQBvZAxABfAFyyuAM1JR8yIiUQA5XREUB6NQ02IoAZQCu69RziKJAKChQA-FBlQA2gDWECBQXNrIhMSkRkRQAD5QwSAA9uqwCCjoWLg6eqSU9o7OvAC6ymycPFCKHlAVIvTiUNJyCioWVhFR+rEm7p4+fkEhYQzdxr3G5ZWIXNw1dRUyigDcbm6gkBG5kbqsQvBIaJjYeHv55BQARKZ2ZAWmyvekAJJMpmAp7GRPX+zva68dZAA)

### 2. Router wrapper 만들기

이제 간단하게 express router wrapper를 하나 만들어서 문제를 해결해봅시다.

@types/express에서 [RequestHandler의 정의](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/4dfd78d7d9a3fcd21a2eaf861756f6904881dbfa/types/express/index.d.ts#L119)를 보시면 첫 번째 generic으로 req.params의 타입을 넘겨줄 수 있는데, 이 때 위에서 만든 ExtractPathParameters를 활용하면 됩니다.

위에서 만든 ExtractPathParameters와 Generic 문법을 사용해서 HTTP GET 라우터의 wrapper를 하나 만들어 보겠습니다.

```typescript
import { RequestHandler } from "express";

type ExtractPathParameters<T extends string> = T extends `${any}:${infer ParameterName}/${infer Suffix}`
  ? { [key in ParameterName | keyof ExtractPathParameters<Suffix>]: string }
  : T extends `${any}:${infer ParameterName}`
  ? { [key in ParameterName]: string }
  : {};

function GET<P extends string>(path: P, handler: RequestHandler<ExtractPathParameters<P>>) {
  return Router().get(path, handler);
}

GET("/users/:userId", (req, res) => {
  req.params; // { userId: string }
});
```

GET function이 Generic 변수 P로 첫 번째 인자인 path의 값을 추론해서 RequestHandler에 넘겨주고 있습니다.

이제 express에서 path parameters를 Type-safe하게 사용할 수 있습니다.

## 마무리

[2021년 회고](/2022-01-02-2021-retrospect)에서 선언한 올해 목표 중 하나가 컴포트 존인 타입스크립트 생태계를 벗어나 보는 거였는데, 가면 갈수록 타입스크립트의 강력한 추론 기능의 매력에서 헤어나오질 못하겠네요.. 큰일입니다.

최근에 express를 type-safe하게 사용하기 위한 오픈소스인 [typed-express](https://github.com/HoseungJang/typed-express)를 개발해서 배포했었는데, 거기에도 [1.1.0 릴리즈](https://github.com/HoseungJang/typed-express/releases/tag/v1.1.0)에 Template Literal Types를 사용한 path parameters 추론 기능을 추가해줬습니다.

타입스크립트가 또 어떤 기능을 내놓을지 앞으로도 기대되네요.
