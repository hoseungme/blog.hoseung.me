---
title: 직관적인 컴포넌트를 위한 데이터 정규화
date: 2022-06-02
description: 컴포넌트의 복잡도와 데이터 정규화의 연관성
thumbnail: ./thumbnail.png
tags:
  - 프론트엔드
  - 코드 퀄리티
---

최근 이직한 회사에서 첫 제품을 개발하고 출시하기까지, 계속해서 같은 생각이 들었습니다.

데이터 스키마의 복잡도가 높아질 수록, 코드에 그 복잡도가 그대로 흘러들어올 가능성이 커진다는 점입니다.

이 글에선 간단한 예제를 개선해 보면서, 위 문제를 어떻게 해결할 수 있을지 정리해보겠습니다.

## 제품의 요구사항

제가 만든 제품은 학급 대항전이었는데, 가장 많은 참여자수를 모은 학급이 우승하여 상품을 타가는 이벤트였습니다.

제품의 요구사항의 일부는 아래와 같습니다.

- 유저가 참여한 학급의 랭킹을 보여주기
- 학급별 TOP 5 랭킹을 보여주기
  - 유저의 학급에는 '우리 반'이라고 표시해야함
  - 유저가 참여한 학급이 TOP 5에 없는 경우, TOP 5 리스트 아래에 따로 보여줘야함

백엔드의 API 응답 스키마는 아래와 같았습니다. (실제와는 조금 다릅니다.)

```typescript
interface Class {
  schoolName: string; // 학교 이름
  grade: string; // 학년
  className: string; // 반
  ranking: number; // 순위
  registeredCount: number; // 참여자 수
}

// API 응답
interface ClassesRanking {
  myClassRanking: Class | null; // 유저가 참여한 학급의 랭킹
  top5Ranking: Class[]; // TOP 5 랭킹
}
```

위와 같은 응답은 UI에 맞춰진 형태라는 특징을 가지는데, 이는 양날의 검이라고 생각합니다.

당장은 개발을 편하게 할 수 있다는 장점이 있지만, RESTful 관점에서는 아름다워 보이지 않고, UI 변화에 매우 민감해진다는 단점이 있습니다.

다만, 기본적으로 이게 아주 짧은 기간동안만 운영하고 버릴 제품이기도 하고, 함께 수정하기엔 일정 문제도 있어서 트레이드오프가 필요했습니다.

## 컴포넌트 작성하기

위에서 설명한 API 응답을 활용해 학급 랭킹을 보여주는 컴포넌트를 한번 작성해봅시다. (이해를 위해 마크업과 스타일을 생략했습니다.)

```tsx
function ClassesRanking() {
  const { myClassRanking, top5Ranking } = useClassesRanking();

  return (
    <>
      <ul>
        {top5Ranking.map((item, index) => (
          <li key={index}>
            {myClassRanking &&
              `${myClassRanking.schoolName}/${myClassRanking.grade}/${myClassRanking.className}` ===
                `${item.schoolName}/${item.grade}/${item.className}` && <div>우리 반</div>}
            <div>
              {item.schoolName} {item.grade}학년 {item.className}반
            </div>
            <div>{item.ranking}등</div>
            <div>{item.registeredCount}명</div>
          </li>
        ))}
      </ul>
      <div>...</div>
      <ul>
        {myClassRanking && myClassRanking.ranking > 5 && (
          <li>
            <div>우리 반</div>
            <div>
              {myClassRanking.schoolName} {myClassRanking.grade}학년 {myClassRanking.className}반
            </div>
            <div>{myClassRanking.ranking}등</div>
            <div>{myClassRanking.registeredCount}명</div>
          </li>
        )}
      </ul>
    </>
  );
}
```

위 컴포넌트는 읽는 사람 입장에서 어떤 문제가 있을까요? 제가 생각한 문제는 읽는 입장에서 이해해야할 맥락이 너무 많다는 점입니다.

- myClassRanking과 top5Ranking이 분리되어있지만, top5Ranking안에 myClassRanking이 포함되있을 수 있다.
- 학급 데이터의 유일한 식별자는 학교 이름 + 학년 + 반을 합친 것이다.
- myClassRanking은 nullable하다.
- myClassRanking이 5위 아래일 경우, TOP 5 리스트 바깥에 따로 보여준다.

저는 근본적으로 이 문제가 잘못된 데이터 설계로부터 발생했다고 생각했습니다.

즉, 이 문제를 해결하기 위해선 데이터를 적절히 **정규화**해야 합니다.

## 데이터 정규화하기

제가 생각하는 정규화의 의미는 데이터를 적절한 형태로 바꾸어주는 과정입니다. 프론트엔드에선 API 응답을 UI 렌더링을 위한 데이터로 사용하기 위해 많이 거치는 과정입니다.

데이터의 **적절한 형태**란 무엇일까요? 그건 제품의 요구사항에 따라 매우 크게 달라질 것이고, 사람 마다 자신이 생각하는 적절한 형태는 다를겁니다.

저는 보통 아래의 원칙에 기반하여 생각합니다.

- 이 컴포넌트가 본질적으로 무엇을 보여주는 컴포넌트인가?
- 그것을 보여주기 위한 가장 쉬운 방법은 무엇인가?

그렇다면 위에서 작성한 `ClassesRanking`컴포넌트가 본질적으로 보여주려는 것은 무엇일까요? 네이밍에도 담겨있듯이 **학급의 랭킹**을 보여주려는 것이 아닐까요?

하지만 막상 `ClassesRanking`의 구현을 보면 그 본질과 실제 구현의 거리감이 꽤 있어보입니다. 그럼 여기서 코드를 작성하는 쪽, 읽는 쪽 모두에게 쉬운 데이터 구조가 무엇일까요?

저는 `ClassesRanking`이 **랭킹 순으로 정렬된 학급의 배열** 하나만 받을 수 있다면 좋을 것 같다고 생각했습니다.

그리고 배열의 각 아이템에 **유저의 학급인지에 대한 데이터**만 있다면 현재 `ClassesRanking`의 본질과 거리가 먼 로직들이 숨겨지고, 조금 더 직관적으로 변하지 않을까요?

따라서 위에서 정의했던 Class interface에 isMyClass(유저의 학급인지에 대한 데이터)를 추가하고, API fetcher에서 응답 데이터를 제가 원하는 형태로 정규화 해줬습니다.

```typescript
interface NormalizedClass extends Class {
  isMyClass: boolean;
}

interface NormalizedClassesRanking {
  ranking: NormalizedClass[];
}
```

```typescript
async function fetch(): NormalizedClassesRanking {
  const { myClassRanking, top5Ranking } = await get("/classes/ranking");

  const normalize = (item: Class) => {
    // 유저의 학급 정보가 없는 경우, isMyClass에 대해 검사하지 않음
    if (!myClassRanking) {
      return {
        ...item,
        isMyClass: false,
      };
    }
    return {
      ...item,
      isMyClass:
        `${myClassRanking.schoolName}/${myClassRanking.grade}/${myClassRanking.className}` ===
        `${item.schoolName}/${item.grade}/${item.className}`,
    };
  };

  return {
    ranking: top5Ranking
      .map(normalize)
      // 유저의 학급 정보가 있고, 5위 아래인 경우 맨 끝에 추가
      .concat(myClassRanking && myClassRanking.ranking > 5 ? [normalize(myClassRanking)] : []),
  };
}
```

## 컴포넌트 다시 작성하기

위에서 정규화한 데이터를 기반으로 다시 컴포넌트를 작성해볼까요?

```tsx
function ClassesRanking() {
  const { ranking } = useClassesRanking();
  const [top5, others] = [ranking.slice(0, 5), ranking.slice(5)];

  return (
    <>
      <ul>
        {top5.map((item, index) => (
          <li key={index}>
            {item.isMyClass && <div>우리 반</div>}
            <div>
              {item.schoolName} {item.grade}학년 {item.className}반
            </div>
            <div>{item.ranking}등</div>
            <div>{item.registeredCount}명</div>
          </li>
        ))}
      </ul>
      <div>...</div>
      <ul>
        {others.map((item, index) => (
          <li key={index}>
            {item.isMyClass && <div>우리 반</div>}
            <div>
              {item.schoolName} {item.grade}학년 {item.className}반
            </div>
            <div>{item.ranking}등</div>
            <div>{item.registeredCount}명</div>
          </li>
        ))}
      </ul>
    </>
  );
}
```

코드의 길이와 전체적인 형태는 큰 변화가 없지만, 제 눈에는 위 코드가 기존보다 확실히 더 읽기 쉽게 느껴집니다.

기존에는 top5Ranking, myClassRanking이 분리되어 있었습니다.

따라서 TOP 5에 myClassRanking이 포함되어있는지에 대한 로직들을 이해하기 위한 사고의 흐름이 아래와 같았는데요.

> "myClassRanking의 schoolName, grade, className을 합친 거랑... item의 schoolName, grade, className을 합친거랑 같으면? 서로 같은 학급인거고, '우리 반'이라고 표시하네. 그리고 만약 myClassRanking이 TOP 5 바깥이면...."

사실상 '유저의 학급이면 우리 반이라고 표시한다'는 단순한 요구사항임에 비해 사고 흐름과 이해 과정이 길고 복잡했습니다.

또한 myClassRanking이 존재하고, 5위 바깥인 경우 따로 보여준다는 것도 읽는 입장에서 이해해야 했습니다.

위에서 적었던 제품의 요구사항을 다시 보고 돌아와봅시다. **제품의 복잡한 요구사항이 코드에 그대로 흘러들어온** 안좋은 모습입니다.

하지만 우리는 제품에 요구사항에서 벗어나 `ClassesRanking`이 본질적으로 보여주려는 것이 무엇인지 사고하고, 데이터를 그에 맞춰 정규화 함으로써, 위 문제를 해결할 수 있었습니다.

데이터를 ranking이라는 배열 하나만 받음으로써, '학급의 랭킹'을 보여주는 `ClassesRanking` 컴포넌트의 본질과 가까워질 수 있었습니다.

또한, 학급 랭킹을 TOP 5와 그 아래로 나누어서 보여준다는 점 외에 딱히 더 이해할 맥락이 없고, 그게 `ClassesRanking` 컴포넌트의 구현에 있는 것이 어색하지도 않습니다.

또한 isMyClass를 추가함으로써 코드의 이해가 훨씬 빨라졌습니다.

> "item.isMyClass, 즉 이 학급이 유저의 학급이면 '우리 반'이라고 표시하네."

그리고 혹시 느끼셨나요? 기존과 다르게 `li`로 감싸진 부분이 모두 동일한 구조를 보입니다.

```tsx
// 기존 모습 (TOP 5와 그 아래의 렌더링 로직이 서로 다름)
<li key={index}>
  {myClassRanking &&
    `${myClassRanking.schoolName}/${myClassRanking.grade}/${myClassRanking.className}` ===
      `${item.schoolName}/${item.grade}/${item.className}` && <div>우리 반</div>}
  <div>
    {item.schoolName} {item.grade}학년 {item.className}반
  </div>
  <div>{item.ranking}등</div>
  <div>{item.registeredCount}명</div>
</li>;

{
  myClassRanking && myClassRanking.ranking > 5 && (
    <li>
      <div>우리 반</div>
      <div>
        {myClassRanking.schoolName} {myClassRanking.grade}학년 {myClassRanking.className}반
      </div>
      <div>{myClassRanking.ranking}등</div>
      <div>{myClassRanking.registeredCount}명</div>
    </li>
  );
}
```

```tsx
// 변경 후 모습 (TOP 5든 아니든 모든 아이템의 렌더링 로직이 동일)
<li key={index}>
  {item.isMyClass && <div>우리 반</div>}
  <div>
    {item.schoolName} {item.grade}학년 {item.className}반
  </div>
  <div>{item.ranking}등</div>
  <div>{item.registeredCount}명</div>
</li>
```

따라서 기존과 다르게 `ClassesRanking`컴포넌트를 한 단계 더 추상화할 수 있게됩니다.

```tsx
function ClassesRanking() {
  const { ranking } = useClassesRanking();
  const [top5, others] = [ranking.slice(0, 5), ranking.slice(5)];

  return (
    <>
      <ul>
        {top5.map((item, index) => (
          <ClassRankingItem key={index} {...item} />
        ))}
      </ul>
      <div>...</div>
      <ul>
        {others.map((item, index) => (
          <ClassRankingItem key={index} {...item} />
        ))}
      </ul>
    </>
  );
}
```

```tsx
function ClassRankingItem(item: NormalizedClass) {
  return (
    <li>
      {item.isMyClass && <div>우리 반</div>}
      <div>
        {item.schoolName} {item.grade}학년 {item.className}반
      </div>
      <div>{item.ranking}등</div>
      <div>{item.registeredCount}명</div>
    </li>
  );
}
```

이제 `ClassesRanking`을 읽는 입장에서는 isMyClass 조차도 이해할 필요가 사라졌습니다. 읽는 입장에서 `ClassesRanking`은 단순히 학급 랭킹을 TOP 5와 그 아래로 나뉘어 보여주는 컴포넌트일 뿐입니다.

## 마무리

지금까지 데이터 정규화를 통해 요구사항에 비해 복잡한 컴포넌트를 직관적으로 만드는 과정에 대해 정리해 보았습니다.

이 글에서 말하려는 내용을 다시 정리하면:

- 제품의 복잡한 요구사항이 코드에 그대로 반영되고 있는지 확인하기
- 컴포넌트가 본질적으로 보여주려는게 무엇인지 생각하기
- 가장 직관적이고 올바른 데이터 스키마에 대해 생각하고, 데이터 정규화 하기

코드 퀄리티에 대한 글은 처음 남겨보는데, 글에 부족한 부분이 있다면 댓글로 알려주세요!
