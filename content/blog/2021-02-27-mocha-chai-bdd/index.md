---
title: Mocha, Chai, SuperTest로 BDD 기반의 테스트코드 작성하기
date: 2021-02-27
description: BDD에 대해 알아보고, 테스트 작성하기
tags:
  - 개인 블로그
  - 프론트엔드
  - 백엔드
  - 테스트
---

## BDD

BDD는 Behaviour Driven Development의 약자입니다.

[이 답변](https://softwareengineering.stackexchange.com/questions/135218/what-is-the-difference-between-writing-test-cases-for-bdd-and-tdd#135246)에 따르면, BDD와 TDD는 한끗 차이라고 볼 수 있습니다.

TDD는 테스트 자체에 집중하여 시스템의 동작 여부를 확인하는 반면, BDD는 TDD의 접근법(테스트 코드 작성 후 개발)에 기반하지만 TDD와 다르게 비즈니스 로직에 더 초점을 맞추는 접근법을 제시합니다.

BDD를 사용하면서, 개인적으로 아래와 같은 장점이 있다고 느꼈습니다.

- 실제 유저 입장에서의 유의미한 시나리오를 고민해볼 수 있으므로, 좋은 사용자 경험을 이끌어 내고, 유저 입장에서의 다양한 예외 상황을 대비하는 것에 도움이 됩니다.

- 나중에 다른 개발자가 BDD로 작성된 테스트 코드를 참고하면, 시스템의 전반적인 동작 흐름을 빠르게 이해할 수 있고, 따라서 실제 비즈니스 로직을 빠르게 이해하는데 도움이 됩니다.

## 라이브러리들 소개

- Mocha: 유명한 자바스크립트 테스트 프레임워크 중 하나입니다.

- Chai: 테스트 코드 작성 시 사용하는 assertion 라이브러리 입니다.

- SuperTest: HTTP를 위한 assertion 라이브러리입니다.

## 시나리오 작성

로그인 기능을 새롭게 붙이고 싶다고 할 때, 간단하게 두 가지 상황을 예측할 수 있습니다.

1. 유저가 올바른 아이디와 비밀번호를 보내서 로그인에 성공한다.
2. 유저가 잘못된 아이디와 비밀번호를 보내서 로그인에 실패한다.

그리고 BDD는 기본적으로 Given, When, Then으로 이루어진 시나리오로 구성되므로, 아래와 같이 시나리오를 작성할 수 있습니다.

```
Given: 유저의 아이디는 ASDF, 패스워드는 1234이다.

  When: 유저가 주어진 아이디와 패스워드로 로그인 요청을 보냈다면
  Then: 로그인이 성공했다고 알리고, 토큰을 부여한다.

  When: 유저가 잘못된 아이디와 패스워드로 로그인 요청을 보냈다면
  Then: 로그인이 실패했다고 알린다.
```

그럼 이를 Mocha, Chai, SuperTest를 사용해서 아래와 같이 작성할 수 있습니다.

```typescript
import * as request from "supertest";
import { expect } from "chai";

import { app } from "../app";

describe("User Routers", () => {
  describe("Login", () => {
    // Given
    const id = "ASDF";
    const password = "1234";

    // When
    context("When user requests with valid id and password", () => {
      // Then
      it("should return 200 and token", async () => {
        return request(app)
          .post("/login")
          .send({ id, password })
          .expect(200)
          .then((response) => {
            expect(response.body).to.be.haveOwnProperty("token");
          })
          .catch((error) => {
            throw error;
          });
      });
    });

    context("When user requests with wrong id and password", () => {
      it("should return 401", async () => {
        return request(app).post("/login").send({ id: "qwer", password: "zxcv" }).expect(401);
      });
    });
  });
});
```

그리고 위 테스트 코드를 기반하여, 실제 비즈니스 로직을 아래와 같이 작성할 수 있습니다. (단순 예시로만 봐주세요)

```typescript
app.post("/login", async (req, res, next) => {
  const { id, password } = req.body;

  if (id !== "ASDF" && password !== "1234") {
    return res.sendStatus(401);
  }

  return res.status(200).json({ token: "adsfs" });
});
```

테스트 코드를 작성할 때 구상한 시나리오대로, 아이디가 ASDF, 패스워드가 1234가 아닌 경우 로그인에 실패하고, 올바르게 잘 보낸 경우 토큰과 함께 로그인에 성공했다고 알리도록 구현했습니다.

그리고 실제로 테스트를 실행시켜보면? 아래와 같이 테스트에 통과합니다.

![](./result.png)

## 팀 내에서는 유의미 할까?

나중에 리팩토링이나 새로운 기능을 추가하기 위해서, 다른 개발자가 위에서 제가 개발한 로그인 기능에 손을 댄다고 가정해봅시다.

"id !== "ASDF"? 이게 뭔코드야?;"

위처럼 그 개발자가 보기에 기존 로직이 너무나 복잡합니다. (~~참 복잡하네요 ㅋㅋ~~) 이 때, 제가 작성했던 BDD 시나리오를 참고하면, 빠르게 의문점을 해결할 수 있을 것입니다.

"아~ 올바른 아이디가 ASDF여서 저런 조건문이 있구나~"

즉, BDD로 작성된 테스트 코드는 기존 코드에 대한 빠른 이해를 이끌어내고, 새로운 작업을 더 빠르게 시작할 수 있도록 도와줍니다. 혹은, 새로운 팀원이 모르는 코드를 이해하는 것에도 큰 도움이 될 수 있겠죠.

저도 개인적으로 회사에서 복잡한 기존 코드들을 이해할 때 이런 BDD 테스트 코드들이 큰 도움이 되었습니다.

물론 이런게 너무 제 주관적인 경험일 수 있어서, 모든 분들께 도움이 될지는 사실 모르겠습니다. 거기다가 저는 아직 테스트 코드 작성 기법에 대한 시야가 매우 좁습니다.

그래도 혹시나 BDD에 관심이 있으신 분들께는 참고사항이 될 수 있다면 좋겠습니다.
