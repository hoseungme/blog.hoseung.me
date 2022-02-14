---
title: Local Storage / Session Storage에 직접 접근하는 방식이 위험한 이유
date: 2021-01-13
description: Local Storage, Session Storage의 예외상황들을 알아봅시다.
tags:
  - 프론트엔드
---

회사에서 IndexedDB / Local Storage를 사용해서 client-side caching을 개발하고 코드리뷰를 받으면서 새로운 사실을 알게됬네요.

local/session storage에 직접적으로 접근하는 것이 상당히 위험하다는 점입니다.

그 이유는 브라우저마다 구현이 다르기 때문인데,

- 브라우저가 local/session storage를 지원하지 않는다
- 브라우저가 private mode에서 local/session storage 사용을 금지한다

위와 같은 상황들 때문에 별다른 에러 핸들링 없이 local/session storage에 접근하는 것은 크로스 브라우징을 고려했을 때 상당히 위험한 행동이라고 합니다.

[여기](https://michalzalecki.com/why-using-localStorage-directly-is-a-bad-idea/)서 더 많은 예외 상황들을 확인할 수 있네요.

## 해결법

그래서 회사 코드상에서는 [storage-factory](https://www.npmjs.com/package/storage-factory)라는 local/session storage wrapper를 사용하고 있었습니다.

잠시 해당 패키지의 [구현 코드](https://github.com/MichalZalecki/storage-factory/blob/master/src/index.ts) 일부를 보면,

```typescript
function isSupported() {
  try {
    const testKey = "__some_random_key_you_are_not_going_to_use__";
    getStorage().setItem(testKey, testKey);
    getStorage().removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

function getItem(name: string): string | null {
  if (isSupported()) {
    return getStorage().getItem(name);
  }
  if (inMemoryStorage.hasOwnProperty(name)) {
    return inMemoryStorage[name];
  }
  return null;
}
```

위처럼 isSupported()를 통해서 지원 여부를 확인하고, 사용이 불가능한 경우 in-memory 방식으로 저장되도록 했네요.

백엔드만 공부해왔던 저에게 프론트엔드 세계란 참 어려운 것 같습니다..;;
