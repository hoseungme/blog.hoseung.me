---
title: Javascript에서 정규표현식 group name으로 string replace하기
date: 2021-01-05T00:00:00+09:00
description: 정규표현식으로 replace할 때 좋은 팁
tags:
  - Javascript
---

회사에서 github 웹훅과 관련된걸 만들다가 string replace할 때 정말 유용한 부분을 알아냈네요.

저는 개인적으로 문자열의 일부분을 정규표현식과 match된 특정 부분과 치환하고 싶은 경우가 많았습니다.

예를들어서

```javascript
`
<a href="https://velog.io">Velog</a>\n
<a href="https://www.naver.com">Naver</a>
`;
```

이거를

```
[Velog](https://velog.io)
[Naver](https://www.naver.com)
```

이렇게 마크다운 문법으로 바꾸고 싶다고 가정해봅시다.

우선 원하는 결과물을 만들기 위해서 필요한 것은 아래와 같습니다.

- href에 넣어주고 있는 링크
- a태그의 innerText

그리고 이 때, 정규표현식에서는 group name이라는걸 사용할 수 있습니다. 그리고 결과값의 groups 속성을 통해서 그룹의 값에 접근할 수 있습니다.

```javascript
// ?<name> 형식으로 이름을 붙일 수 있음
const regex = /<a href="(?<url>[\S]+)">(?<text>[\S]+)<\/a>/g;
const matchResult = regex.exec(`
  <a href="https://velog.io">Velog</a>
`);

console.log(matchResult?.groups?.url); // https://velog.io
```

그리고 자바스크립트의 replace 메소드는 [정규표현식을 위한 특수 패턴 문자](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter)를 제공합니다.
정규표현식에서 group name을 적용했던 방식과 비슷하게 $<이름> 형식으로 group의 값에 접근할 수 있습니다.

```javascript
const htmlString = `
  <a href="https://velog.io">Velog</a>\n
  <a href="https://www.naver.com">Naver</a>
`;
const regex = /<a href="(?<url>[\S]+)">(?<text>[\S]+)<\/a>/g;

const replacedString = htmlString.replace(regex, "[$<text>]($<url>)");

console.log(replacedString);
```

실제로 위 코드를 복붙해서 출력해보시면, 아래와 같이 나옵니다. 문자열 다룰 땐 정규표현식이 정말 편하네요.

```
[Velog](https://velog.io)
[Naver](https://www.naver.com)
```
