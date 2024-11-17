---
title: "타입스크립트의 {} 타입"
date: 2021-09-15T00:00:00+09:00
description: "'빈 객체'를 타입으로 정의하는 방법을 알아봅시다."
tags:
  - Typescript
---

개인적으로 타입스크립트는 정말 좋은 기술이라고 생각합니다.

다양하고 편리한 빌트인 타입들(Omit, Exclude, Pick, ReturnType, 등등등...)로 깔끔한 타입 정의를 할 수 있고, 강력한 추론 기능으로 여러모로 멋진 개발자 경험을 선물할 수도 있습니다.

하지만, 때로는 타입스크립트의 타입 체계가 불편하거나, 문제를 일으킬 때도 있습니다.

이 글에선 그 중에서도 '빈 객체'를 타입으로 정의하는 것에 대한 이야기를 해보려고 합니다.

## {}의 의미

(아닐 수도 있지만) 많은 분들이 '빈 객체' 즉 empty object를 타입으로 정의할 때 아래와 같이 하실거라고 생각합니다.

```typescript
type EmptyObject = {};
// interface EmptyObject {} 와 같음

const a: EmptyObject = {};
```

또는 any object라는 의미로써 generic 타입을 아래와 같이 정의하는 경우도 많이 보았습니다.

```typescript
function request<T extends {}>(params: T) {
  /* ... */
}
```

하지만 놀랍게도, 저 녀석은 '빈 객체'만 허용하는 타입이 아닙니다.

```typescript
const a: EmptyObject = "asdf";
const b: EmptyObject = 1234;
const c: EmptyObject = { foo: "bar" };
```

실제로 [실행해보면](https://www.typescriptlang.org/play?#code/C4TwDgpgBAogtmUB5ARgKwgY2FAvFAbwF8BuAKDMwHsA7AZxwEMAuWBZdLHfY86+nClbxEIVBmx4oAIkZ0AJgDNpfWgyiZh7MZ0n4AjACYAzABZVAqPK2jxXKQSiKqVVtJSMATtKikyQA) 정말 에러가 안납니다.

왜냐하면 타입스크립트에서 {}는 "any non-nullish value"를 의미하기 때문입니다.

실제로 undefined, null처럼 [nullish한 value를 넣은 경우](https://www.typescriptlang.org/play?#code/C4TwDgpgBAogtmUB5ARgKwgY2FAvFAbwF8BuAKDMwHsA7AZxwEMAuWBZdLHfAVxoBMIAMwCWNCP3LV6OFK3iIQqDNjxQaPADabyQA)에는 에러가 납니다.

즉, 개발자는 '빈 객체'라는 의미로써 타입을 정의했지만, 실제로는 굳이 '빈 객체'가 아니어도 nullish하지만 않다면 아무 값이나 다 들어갈 수 있습니다.

얼핏 보기엔 딱히 실수하지 않을 것 같지만, 회사에서 개발을 하거나, 동아리 팀원들끼리 프로젝트를 하는 경우, 여러 개발자가 협업하기 때문에 실수할 가능성이 매우 높습니다.

함수 인자의 순서를 바꿔서 넣거나, 쓰지도 않는 값을(또는 허용되지 않은 값을) 계속 넘기는 등등.. 예상치 못한 여러 문제가 발생합니다.

거기다 타입 에러도 발생하지 않기 때문에, 혹시나 이것 때문에 버그가 나서 코드가 동작을 안하는 경우 디버깅 하기도 정말 힘듭니다.

## 올바른 타입 정의

그렇다면 '빈 객체'는 어떻게 정의할 수 있을까요? 바로 never 타입을 활용하면 됩니다.

```typescript
type EmptyObject = Record<string, never>;
// { [k: string]: never } 와 같음
```

맨 위에서 보셨던 예제에서 EmptyObject를 저렇게 바꾸고 [실행해보면](https://www.typescriptlang.org/play?#code/C4TwDgpgBAogtmUB5ARgKwgY2FAvFAJSwHsAnAEwB4BnYUgSwDsBzAGikYgDcJSA+ANwAoIZmKNaUAIYAuWAmTosOfAG8AvsLEScKOfEQhUGbHigAiKdXIAzc1vGTM+hUaWn8ARgBMAZgAsDjpQ5C6GxspmqlA2xMRy5ihSpOZQmkJAA) '빈 객체'를 넘기지 않으면 타입에러가 발생합니다.

## 예외상황

여기서 또 한번 놀라운 것이, {}가 의미하는 것이 "any non-nullish value"가 아닌 경우도 있습니다.

바로 intersection type의 경우인데, 아래의 예시를 봅시다.

```typescript
const a: {} & true = {}; // 타입 에러
const b: {} & true = true;

const c: {} & { foo: string } = {}; // 타입 에러
const d: {} & { foo: string } = { foo: "bar" };
```

{}가 아닌 타입을 T라고 했을 때, {}와 T를 intersect하더라도 T가 아닌 값을 허용하지 않습니다.

실제로 [실행해보면](https://www.typescriptlang.org/play?#code/MYewdgzgLgBAhgLhgbwL4wGQygJwK4CmMAvCqgNwwD0VMgAwuCh4zIAujgN+0BQoksARkmpmz4ipXIXLtO4aDGD90WZDABmIEEmg4AlmADmMdKTSUa9JmyncYAE3mClq9TE079hlCrVIARDzg5vAwkgA) 위에 적힌 대로 타입에러가 나는걸 보실 수 있습니다.

단, {} 끼리 intersect하는 경우는 똑같이 "any non-nullish value"를 의미하므로 주의가 필요합니다.

따라서 React 같은 경우, 기본적으로 [컴포넌트의 props가 intersect](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/6fd37a55773b23e00a19418d9b5aad912087c982/types/react/index.d.ts#L501) 되어 동작하기 때문에 {}를 넣어도 문제가 되지 않습니다.

## eslint

eslint 중에서 {}의 사용을 막아주는 [@typescript-eslint/ban-types](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-types.md)가 있습니다.

사실 {} 말고도 다른 위험한 타입 정의들도 제한해주기 때문에, 적용하는 것을 추천드립니다.

## 참조

- [@typescript-eslint/ban-types의 issue에 달린 코멘트](https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492)
