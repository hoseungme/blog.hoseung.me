---
title: document.visibilityState로 유저가 탭을 보고 있는지 알아내기
date: 2021-05-12
description: 유저가 다른 탭으로 이동했다는 것을 알아내려면?
tags:
  - 프론트엔드
---

## 요구사항

이커머스 서비스를 개발하는 회사에 다니고 있는데, 유저가 다른 사이트로 이동했다가 저희 사이트로 다시 돌아왔을 때 Toast Notification을 띄워줘야하는 요구사항이 있었습니다.

## 처음 접근한 방법과 문제점

처음에는 [이 글](https://blog.outsider.ne.kr/654)을 보고 window에 focus 이벤트를 걸어서 유저가 돌아온걸 인식하도록 만들었습니다.

데스크탑에서는 요구사항대로 탭에 돌아오자마자 바로 이벤트가 트리거되지만, 모바일 브라우저에서는 탭으로 다시 돌아와서 무조건 터치 한번을 해줘야 focus로 인식하는 문제가 있었습니다.

## 해결

그래서 그냥 현재 탭이 보여지고 있는지 아닌지를 구분할 수 있는 API를 찾아보다가 [Page Visibility API](https://www.w3.org/TR/page-visibility/)를 찾았습니다.

document에는 visibilityState속성이 있고, "visible", "hidden" 중 하나의 값이 담겨있는데, visible 여부는 boolean 값이 담겨있는 document.hidden으로 확인할 수도 있습니다.

그리고 visibilityState의 변화는 visibilitychange 이벤트로 확인할 수 있고, [호환성](https://caniuse.com/?search=visibilitychange)도 나쁘지 않았습니다.

특정 케이스에서 제대로 동작하지 않는 경우가 있는 것 같긴 한데, 저의 use case에서는 브라우저별로 아무 문제없이 잘 동작했기에 바로 적용했습니다.

```typescript
const handler = () => {
  if (document.visibilityState === "visible") {
    /* ... */
  }
};
document.addEventListener("visibilitychange", handler, { once: true });
```
