---
title: Data normalization for intuitive component
date: 2022-06-02T00:00:00+09:00
description: The connection between component complexity and data normalization
thumbnail: ./thumbnail.png
locale: en
tags:
  - Front-end
  - Code Quality
---

At the company recently I transferred and until I developed my first product in there, I had constantly tought and felt same thing. It is that the more complex data schema is, the more complex my code is.

In this article, I'm going to recap my journey to lower the complexity by data normalization.

## Requirements of the product

My first product was a class competition and the requirements of it were:

- Show TOP 5 ranking list of classes
  - Mark '우리 반' for my class
  - Show my class at the bottom of the list if it's not in TOP 5

And the API response schema was:

```typescript
interface Class {
  schoolName: string;
  grade: string;
  className: string;
  ranking: number;
  registeredCount: number;
}

interface ClassesRanking {
  myClassRanking: Class | null; // My class
  top5Ranking: Class[]; // TOP 5 ranking list
}
```

The response above was a double-edged sword because it was designed by UI-driven approach.

It made me easy-to-develop at the moment but it was not ideal in point of RESTful API and it would be strongly affected by UI changes.

But basically, the product was planned to run just for a short time and it was on a tight schedule, so I needed some trade-offs.

## Write component

I wrote a component based on the response above:

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

In point of code reviewer, I thought the main problem of `ClassesRanking` component was there were too many context to understand it:

- `myClassRanking` and `top5Ranking` are separated but `top5Ranking` could include `myClassRanking`.
- It needes `schoolName` and `grade` and `className` to identify a class.
- `myClassRanking` is nullable.
- If `myClassRanking` is not in `top5Ranking`, renders it at the bottom.

I thought the problem was basically from worng data schema design and it should be properly normalized to solve the problem.

And that's the trade-offs I mentioned above.

## Normalize data

I think the meaning of normalization is to change the data into a proper form. It's the usual way to use API response as data for UI rendering, in front-end.

So what does 'proper form' mean? It may depend on requirements of a product and who's writting the code.

I usually decide the proper form based on:

- What does this component basically render?
- What is the easiest way to render it?

Then what does `ClassesRanking` component written above basically render? It's the ranking list, isn't it?

But the implementation of it is quite far from intuitively indicating rendering the ranking list. Then what is the best data schema for both the code writer and reviewer?

I thought it is better that `ClassesRanking` component can use just one array of classes ordered by ranking.

And I also thought if an item of the array shows whether it's my class, `ClassesRanking` component would be more intuitive.

So I added `isMyClass` property to `Class` interface and combine `myClassRanking` and `top5Ranking` into a single array `ranking`.

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
      .concat(myClassRanking && myClassRanking.ranking > 5 ? [normalize(myClassRanking)] : []),
  };
}
```

## Rewrite component

I rewrote `ClassesRanking` component using normalized data.

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

Although length of the component wasn't markedly changed, I think it seemes more easy-to-read than before.

Before I rewrote this component, the flow of understanding it was:

> "If a combination of schoolName and grade and className properties of myClassRanking is the same with a combination of schoolName and grade and className properties of item, they are same class and should be marked '우리 반' and ..."

That was so complicated compared to the simple requirement "Mark '우리 반' for my class" and could be seen as a case that the complexity of the product is reflected in the code.

So I was able to solve it by focusing on what `ClassesRanking` component basically renderes and normalizing data based on it.

By only using the one array `ranking`, the code got close to the essence of `ClassesRanking` and there are no more contexts that should be considered except just rendering two ranking list.

Therefore, now the flow of understanding it gets simpler:

> "If item.isMyClass is true, it has to be marked as '우리 반'."

And after I rewrote the component, the logics to render each ranking list get same. Let's compare before and after:

```tsx
// Before

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
// After
<li key={index}>
  {item.isMyClass && <div>우리 반</div>}
  <div>
    {item.schoolName} {item.grade}학년 {item.className}반
  </div>
  <div>{item.ranking}등</div>
  <div>{item.registeredCount}명</div>
</li>
```

It allows me to abstract `ClassesRanking` component one more level.

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

Now reviewers of `ClassesRankings` component don't even have to understand about `isMyClass`.

## Recap this article

- Making sure the complexity of your product isn't reflected in your code
- Thinking about what does a component basically render
- Thinking about the most intuitive and proper data schema and normalize if necessary

Thank you for reading and I would like to hear your feedback.
