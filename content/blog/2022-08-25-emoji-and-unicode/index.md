---
title: 이모지와 유니코드
date: 2022-08-25
description: 그리고 자바스크립트
thumbnail: ./thumbnail.png
tags:
  - 유니코드
  - 자바스크립트
---

최근에 이모지에 배경색을 입혀서 PNG로 뽑아주는 이미지 생성기를 만들 일이 있었는데요.

그 과정에서 이모지를 유니코드로 변환해줘야 했는데, 관련 지식이 하나도 없어서 어려웠습니다.

그래서 궁금한 부분을 전부 조사해봤고, 그 내용을 다시는 잊지 않도록 정리해보려고 해요.

## 유니코드?

전세계 모든 문자를 컴퓨터에서 일관되게 표현할 수 있도록 하는 표준입니다.

## 유니코드 관련 개념들

### 유니코드 코드 포인트 (Unicode code point)

- 유니코드 문자에 부여된 고유한 숫자값입니다.

### 유니코드 영역 (Unicode block)

- 특정 범위의 연속된 유니코드 코드 포인트의 집합입니다.
- 각 영역에는 고유한 이름이 존재하고, 각 영역의 코드 포인트는 중복되지 않습니다.
  - 예시: U+1F300 ~ U+1F5FF 범위의 [Miscellaneous Symbols and Pictographs 영역](https://en.wikipedia.org/wiki/Miscellaneous_Symbols_and_Pictographs#Emoji_modifiers)

### 유니코드 평면 (Unicode plane)

- 유니코드 문자 전체를 여러 개의 평면으로 논리적으로 나눈 것입니다.
- 0 ~ 16번까지 총 17개의 평면이 존재하며, 각 평면은 2^16개(65536개)의 코드로 구성됩니다.
  - 여기서 0번 평면을 다국어 기본 평면(Basic multilingual plane, BMP)이라고 합니다.

### 유니코드 인코딩 (Unicode encoding)

- 대표적으로 UTF-8, UTF-16 방식 등이 있습니다.
- UTF-8은 유니코드 문자를 1~4바이트로 표현합니다.
- UTF-16은 16비트, 즉 2바이트로 유니코드 문자를 표현합니다.

## UTF-16 인코딩의 Surrogate Pair

2바이트로 표현이 불가능한 유니코드 문자(코드 포인트가 0xFFFF를 넘어가는 경우)는, 특별한 규칙을 사용해 4바이트(32비트)로 표현합니다.

그 특별한 규칙이 바로 Surrogate Pair인데, Surrogate라는 특수한 유니코드 문자를 두 개 이어붙여 32비트로 표현하는 방식입니다.

Surrogate Pair에서 앞에 오는 Surrogate 문자(U+D800 ~ U+DBFF)를 High Surrogate라고 하고, 그 뒤에 붙는 Surrogate 문자(U+DC00 ~ U+DFFF)를 Low Surrogate라고 합니다.

유니코드 영역 중, Surrogate 문자만 모아놓은 별도의 영역이 존재하는 덕분에 가능한 방식입니다.

실제 예시를 들자면, 😍 이모지는 코드 포인트가 U+1F60D고, 이는 16비트를 초과한 범위의 값입니다. 따라서 UTF-16 상에서 U+D83D(High Surrogate), U+DE0D(Low Surrogate)를 이어붙인 Surrogate Pair로 표현됩니다.

## 이모지와 유니코드

우리가 사용하는 모든 이모지는 유니코드 문자로, 지정된 코드 포인트가 존재합니다. ([Full Emoji List](https://unicode.org/emoji/charts/full-emoji-list.html) 참고)

### 피부색 같은건 어떻게 표현하는거에요?

유니코드 영역 중 Miscellaneous Symbols and Pictographs block 영역에는 Emoji Modifier가 정의되어있어요. [Fitzpatrick scale](https://en.wikipedia.org/wiki/Fitzpatrick_scale)에 기반하여 피부색을 표시합니다.

Fitzpatrick scale은 피부색을 6가지로 분류하지만, Emoji Modifier는 가장 밝은 피부색인 1-2는 합쳐서 처리됩니다.

아래는 Emoji Modifier 리스트입니다.

- U+1F3FB `🏻` : EMOJI MODIFIER FITZPATRICK TYPE-1-2
- U+1F3FC `🏼` : EMOJI MODIFIER FITZPATRICK TYPE-3
- U+1F3FD `🏽` : EMOJI MODIFIER FITZPATRICK TYPE-4
- U+1F3FE `🏾` : EMOJI MODIFIER FITZPATRICK TYPE-5
- U+1F3FF `🏿` : EMOJI MODIFIER FITZPATRICK TYPE-6

그래서 아래 동영상처럼, 아무 것도 적용되지 않은 사람 또는 신체 이모지 뒤에 Emoji Modifier를 붙이면 피부색이 바뀌어요!

<iframe width="560" height="315" src="https://www.youtube.com/embed/n0Bq8YYYQCw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

---

## 유니코드는 자바스크립트에서 어떻게 표현될까?

[ECMAScript 스펙](https://262.ecma-international.org/6.0/#sec-terms-and-definitions-string-value)에 따르면, 자바스크립트 문자열은 연속된 부호없는 16비트 정수로 표현됩니다. 그리고 일반적으로는 이는 UTF-16으로 인코딩된 값이에요.

왜 ‘일반적으로'라는 말을 붙였냐? ECMAScript에서는 인코딩된 문자열이 부호없는 16비트 정수의 연속으로 표현되어야 한다는 것을 제외하고는 그 어떤 제약도 걸어두지 않았습니다.

유니코드로 표현될 수 없는 일련의 16비트 값들이 들어간다고 해도, 문자열로 여긴다는 뜻인 것 같습니다.

만약 U+FFF0같은 아직 미지정된 유니코드 코드포인트를 사용했을 땐 다음과 같은 일이 벌어집니다.

```jsx
const str = "\uFFF0\uFFF0";
console.log(str); // 빈 문자열
console.log(str.length); // 하지만 length는 2
```

여기서 재밌는 점은, 프론트엔드의 경우 위 같이 빈 유니코드 문자를 역으로 이용하면, font-size에 맞춰서 scale되는 Text Skeleton을 만들 수 있어요. (유저의 눈에는 아무 문자도 안보이지만, 시스템 상에서는 문자가 있는 것으로 인식되기 때문)

```tsx
const TextSkeleton = styled.div`
  &:before {
    content: "\FFF0";
  }
`;

// height는 font-size에 맞춰 알아서 늘어남
<TextSkeleton style={{ width: 100, fontSize: 16 }} />;
```

## 그럼 자바스크립트에서 유니코드 코드 포인트를 추출하려면?

위에 언급했듯이 자바스크립트 문자열은 UTF-16으로 표현됩니다. 그리고 16비트 정수로 표현된 문자 하나 당 length + 1로 인정됩니다.

따라서 유니코드 코드 포인트를 추출해주는 String.prototype.codePointAt 메소드를 사용해 뽑아내면 됩니다.

String.prototype.codePointAt 메소드의 동작에 대해 간단히 정리하면:

- 인자로 문자열의 인덱스를 받는다.
- 해당 인덱스의 문자의 유니코드 코드 포인트를 반환한다.
- 해당 인덱스의 문자가 High Surrogate인 경우, 다음 인덱스의 Low Surrogate와 합쳐 해당 Surrogate Pair의 유니코드 코드 포인트를 반환한다.

즉, 문자열을 순회하면서, 현재 인덱스의 문자가 High Surrogate의 범위인 U+D800 ~ U+DBFF에 해당하는 경우, 다음 루프로 넘어갈 때 index += 2 해주면 됩니다.

```tsx
function getCodePoints(str: string): string[] {
  let index = 0;
  const codePoints: string[] = [];

  while (index < str.length) {
    const char = str.charCodeAt(index);

    if (char > 0xd800 && char <= 0xdbff) {
      codePoints.push(str.codePointAt(index).toString(16));
      index += 2;
    } else {
      codePoints.push(str.codePointAt(index).toString(16));
      index += 1;
    }
  }

  return codePoints;
}

console.log(getCodePoints("✋🏿")); // [ '270b', '1f3ff' ]
// U+270B === ✋
// U+1F3FF === EMOJI MODIFIER FITZPATRICK TYPE-6
```

## 결론

- 유니코드는 세상 모든 문자를 컴퓨터에서 표현하기 위해 만들어진 표준이다.
  - 유니코드 문자들은 영역, 평면 같은 논리적인 공간으로 분류된다.
  - 유니코드 문자는 UTF-8, UTF-16 등으로 인코딩 된다.
    - UTF-16은 2바이트로 표현이 불가능한 유니코드 문자에 대해 Surrogate Pair라는 규칙을 적용한다.
- 이모지들도 모두 유니코드 문자이다.
  - 피부색 처리는 Emoji Modifier를 활용한다.
- 자바스크립트 문자열은 기본적으로 UTF-16으로 인코딩된다.
  - String.prototype.codePointAt 메소드로 쉽게 UTF-16으로 인코딩된 문자의 유니코드 코드 포인트를 얻을 수 있다.

현재 다니고있는 회사에서 [토스페이스](https://toss.im/tossface)라는 자체 이모지를 사용하고 있기 때문에, 원래부터 유니코드에 관련해 궁금증이 있었습니다. 이번 기회에 확실히 알아갈 수 있어서 좋았어요.

글 내용 중 틀린 점이나 보완할 점은 알려주시면 감사히 수정할게요!
