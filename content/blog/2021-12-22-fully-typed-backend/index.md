---
title: Fully-typed한 백엔드 시스템 만들기
date: 2021-12-22T00:00:00+09:00
description: 중복과 실수가 넘쳐나는 백엔드 코드를 개선하고 자동화한 과정을 공유합니다.
tags:
  - 개인 블로그
  - 백엔드
  - 오픈소스
---

[이전 글](/2021-12-18-request-typer)에서 현재 저의 개인 블로그 백엔드 시스템의 문제를 간략히 언급하고, 그걸 개선하기 위해 [request-typer](https://github.com/HoseungJang/request-typer)라는 오픈소스를 만들었다는 내용을 적었었는데요.

이번 글에서는 기존 백엔드 코드의 문제를 더 자세히 정리하고, 그걸 어떻게 개선해냈는지 보여드리려고 합니다.

## 블로그 백엔드 기술 스택

먼저 제가 개인 블로그 백엔드에 어떤 기술을 사용하는지부터 나열하겠습니다. 크게 4가지 기술로 구성되어 있습니다.

- Node.js
- Typescript
- Express.js
- AWS Lambda

Node.js 환경에서 Typescript, Express.js로 백엔드 코드를 작성하고, AWS Lambda로 배포하여 사용하고 있습니다.

이전에 [Serverless framework로 AWS 인프라 구축하기](/2020-12-29-serverless-framework), [AWS Lambda에서 Express 사용하기](/2021-01-01-aws-lambda-express) 같은 기록을 다 남겨놨으니 참고하셔도 좋을 듯 합니다.

## 기존 백엔드 코드의 문제점

기존에는 순수 express 라우터와, [express-validator](https://github.com/express-validator/express-validator)를 사용해서 코드를 작성하고 있었습니다.

우선 간단한 예시로, ID로 포스트 하나를 로딩하는 API가 있다고 가정해보겠습니다.

```typescript
import { param } from "express-validator";

import { validateParameters } from "../middlewares/validateParameters";

router.get(
  "/posts/:id",
  param("id").isString().withMessage("id must be string"),
  validateParameters,
  async (req, res, next) => {
    try {
      /* ... */
    } catch (error) {
      return next(error);
    }
  }
);
```

param은 path parameter를 검사합니다. id가 string이어야 한다는 제약을 걸고, 실패할 시 "id must be string"이라는 에러 메시지가 검사의 결과값으로 나오게 됩니다.

여기서 validateParameters라는 middleware도 보이실텐데요.

express-validator는 request parameters validator(위 코드에서는 param)를 먼저 정의해주고, 맨 마지막에 validationResult라는 함수에 req object를 넘겨서 검사 결과를 받는 방식으로 동작합니다.

즉, validateParameters는 validationResult를 실행하고, 검사에 실패했을 경우 400 에러를 뱉는 로직이 담겨있는 공용 middleware입니다.

```typescript
import { RequestHandler } from "express";
import { validationResult } from "express-validator";

import { ErrorResponse } from "../../utils/error";

export const validateParameters: RequestHandler = (req, res, next) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const error = new ErrorResponse(
      400,
      result.array().map((error) => `[ERROR] Parameter ${error.param}: ${error.msg}`)
    );

    return next(error);
  }

  return next();
};
```

뭐 여기까진 괜찮지 않을까 싶습니다. 그럼 조금 더 복잡한 API를 추가해볼까요? 우선 포스트 엔티티는 아래와 같다고 가정합시다.

```typescript
interface Post {
  id: string;
  title: string;
  summary: string;
  coverImageURL: string;
  content: string;
  categoryId?: string;
}
```

그리고 포스트를 생성하는 API를 만들어 주겠습니다.

```typescript
router.post(
  "/",
  body("title").isString().withMessage("title must be string").exists().withMessage("title must be provided"),
  body("coverImageURL").isString().withMessage("coverImageURL must be string").exists(),
  body("content").isString().withMessage("content must be string").exists().withMessage("title must be provided"),
  body("categoryId").isString().withMessage("categoryId must be string").optional(),
  body("summary").isString().withMessage("summary must be string").exists().withMessage("summary must be provided"),
  validateParameters,
  async (req, res, next) => {
    try {
      const title = req.body.title as string;
      const coverImageURL = req.body.coverImageURL as string;
      const content = req.body.content as string;
      const categoryId = req.body.categoryId as string | undefined;
      const summary = req.body.summary as string;

      const post = await Post.create({
        title,
        coverImageURL,
        content,
        categoryId,
        summary,
      });

      return res.status(201).json(Presenters.presentPost({ post }));
    } catch (error) {
      return next(error);
    }
  }
);
```

벌써부터 코드가 너무 장황해졌습니다. 약간 --verbose 옵션 붙여서 뭔가 출력한 느낌..

기존과 같은 코드의 문제점을 정리하자면,

- 코드의 중복이 너무 많고, 불필요하게 장황합니다.

  - 똑같은 포맷의 메시지를 계속 복붙합니다. withMessage의 내용을 보시면, 어차피 "~ must be string", "~ must be provided"같이 다 똑같은 형식을 따르고 있습니다.

  - validation에 성공하더라도 req object의 타입에는 반영되지 않기 때문에, 하나씩 type assertion을 해주느라 object destruct같은 문법을 사용하지 못하고 있습니다. 코드가 길어집니다.

  - parameter validator를 정의할 때 각각의 타입을 다 정의해 줬습니다. 하지만 밑에서 type assertion을 하고 있습니다. 사실상 똑같은 문맥의 코드가 두 번 반복되고 있는 셈입니다. ".isString()"과 "as string"이 문맥상 다른게 뭘까요?

  - try - catch, next(error)같은 에러 처리용 로직이 라우터마다 계속 중복되고 있습니다.

- request parameters는 임의의 type assertion에 의존하고 있습니다. 실수하기 너무 좋은 방식입니다. 이럴거면 parameter validation을 하는 의미가 있나 싶어집니다.

- response body는 아예 타입이 any입니다. 이 또한 실수하기 너무 좋습니다.

- 내용이 통일되어야 할 코드들이 서로 독립적으로 분리되어 관리되고 있습니다.

  - OpenAPI Specification은 별개로 전부 직접 작성해주고 있었는데, 거기 들어가는 내용이 request parameters validator의 내용과 당연히 다를게 없고, 달라서는 안됩니다.

  - 즉, 한곳을 수정하면 다른 곳을 또 똑같이 수정해야 합니다.

  - 그리고 수정하다가 실수로 각각의 내용이 달라지게 되면 어떤 버그가 생길지 모릅니다. 더 심각한건, 수정 단계에서는 그걸 알아차리기가 매우 힘들다는 겁니다.

  - 개발이 재미가 없습니다. 똑같은 수정을 반복할수록 사람이 어딘가 기계적으로 변해갑니다.

따라서 위의 문제들을 해결하는 새로운 express 프레임워크를 만들어보자고 생각했습니다.

## typed-express - 새로운 express 프레임워크

위와 같은 문제파악을 통해 탄생한 것이 [이전 글](/2021-12-18-request-typer)에서 소개했던 [request-typer](https://github.com/HoseungJang/request-typer)와 [typed-express](https://github.com/HoseungJang/typed-express)라는 오픈소스입니다.

request-typer를 먼저 만들었고, typed-express가 그 후에 request-typer를 기반으로 만들어졌습니다.

맘같아서는 모든 코드를 다 까서 정리해두고 싶지만.. 이 글에서는 위에서 언급했던 문제들과 관련된 구현들만 설명하겠습니다.

### Request Parameters, Response Body 정의 및 자동 타입 추론

typed-expressd의 Route를 사용할 때는 request parameters, response body의 타입을 정의해야 합니다.

request-typer의 Parameter, Schema class를 사용하여 정의합니다.

```typescript
// entities.ts
export const Post = Schema.Object({
  id: Schema.String(),
  title: Schema.String(),
  viewCount: Schema.Number(),
  coverImageURL: Schema.String(),
  content: Schema.String(),
  categoryId: Schema.Nullable(Schema.String()),
  createdAt: Schema.Number(),
  summary: Schema.String(),
});
```

```typescript
import { Switch, Route, Paramter, Schema } from "typed-express";

import * as Entities from "./entities";

export const PostRouter = new Switch("/posts", [
  Route.POST(
    "/",
    "createPost",
    {
      title: Parameter.Body(Schema.String()),
      summary: Parameter.Body(Schema.String()),
      coverImageURL: Parameter.Body(Schema.String()),
      content: Parameter.Body(Schema.String()),
      categoryId: Parameter.Body(Schema.Optional(Schema.String())),
    },
    Entities.Post,
    async (req, res) => {
      const { title, summary, coverImageURL, content, categoryId } = req.body;
      /* ... */
      return res.status(200).json(post);
    }
  ),
]);
```

Route는 내부적으로 Typescript의 강력한 타입 추론을 적극 활용하고 있습니다.

@types/express에서 [RequestHandler의 구현](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/9035bba65ea608e5ac12f7f23b8b6a07e600865f/types/express/index.d.ts#L119)을 보시면, query parameters, path parameters, request body, response body의 타입을 정의할 수 있게 허용하고 있는데,

Route가 개발자가 정의하여 넘긴 request parameters, response body 타입을 추론해서 넘겨주고 있습니다.

request parameters 추론에는 request-typer를 개발할 때 만든 [ResolveQueryParameters](https://github.com/HoseungJang/request-typer/blob/e2f3d8b0ab05be0d058673d164300e0f62e51893/src/http.ts#L21), [ResolvePathParameters](https://github.com/HoseungJang/request-typer/blob/e2f3d8b0ab05be0d058673d164300e0f62e51893/src/http.ts#L30), [ResolveRequestBody](https://github.com/HoseungJang/request-typer/blob/e2f3d8b0ab05be0d058673d164300e0f62e51893/src/http.ts#L39)를 활용합니다. response body 추론에는 [Resolve](https://github.com/HoseungJang/request-typer/blob/e2f3d8b0ab05be0d058673d164300e0f62e51893/src/schema.ts#L76)를 활용합니다.

따라서 개발자가 type assertion을 해주지 않아도 알아서 타입이 추론되므로, 위에서 언급했던 중복되고 장황해지는 코드를 개선할 수 있고, 개발자가 실수하지 않도록 할 수 있습니다.

아래는 실제로 request parameters와 response body의 타입 추론이 되는걸 보여주는 스크린샷들 입니다.

![](./typed-express-1.png)

![](./typed-express-2.png)

### Error Handling 로직 내장

위에서 try - catch문을 사용한 에러 처리가 라우터마다 계속 중복되는 로직이라고 언급했었는데요.

typed-express의 Route에 그걸 내장시켜서, 개발자가 handler를 작성할 땐 그걸 하지 않아도 괜찮도록 만들었습니다.

### Request Parameters 검사 및 파싱

typed-express의 Route에는 request parameters validation이 내장되어있습니다.

request-typer의 [Validator class](https://github.com/HoseungJang/request-typer/blob/e2f3d8b0ab05be0d058673d164300e0f62e51893/src/validator.ts#L18)를 사용하여 검사합니다.

Validator class의 validate 메소드는 검사에 실패할 경우 에러 메시지를 응답합니다. Route는 그 메시지를 활용해 알아서 error message를 만들고, 400 Bad Request와 함께 응답합니다.

이 때, express의 req 객체를 사용한 request parameter validation에는 몇가지 예외 상황이 있었습니다.

express의 req 객체에서 path paramaters(req.params), query parameters(req.query)의 프로퍼티들은 항상 string입니다.

따라서 path parameter, query parameter에 string이외의 값을 정의한 경우, validation에 실패하는 문제가 발생했었습니다.

아래와 같이 number 타입의 ID를 가진 유저의 주문 목록을 가져오는 API가 있고, 특정 시점 이후의 주문 목록만 불러올 수 있게 filter를 설정할 수 있다고 가정해봅시다.

```typescript
// GET /users/{userId}/orders?filter={ after: number }
{
  userId: Parameter.Path(Schema.Number()),
  filter: Paramter.Query(
    Schema.Object({
      after: Schema.Number(),
    }),
  ),
}
```

이 때, req.params.userId, req.query.filter 모두 string이기 때문에 validation에 실패합니다.

따라서 첫 validation에 실패했을 경우, JSON.parse()후 한번 더 검사하는 로직을 추가했습니다.

```typescript
function validateWithParse(schema: AllSchema, value: any) {
  const result = Validator.validate(schema, value);
  if (!result.success) {
    try {
      const parsed = JSON.parse(value);
      return { result: Validator.validate(schema, parsed), value: parsed };
    } catch (error) {}
  }
  return { result, value }; // JSON.parse에 실패한 경우, 첫 번째 결과를 리턴
}
```

그리고 validation에 사용된 값을 req object에 덮어씌워줬습니다. 이렇게 하면 개발자가 Number()나 JSON.parse()로 타입 변환을 해줄 필요 없이, 그냥 바로 사용할 수 있습니다.

```typescript
// query paramters를 검사하고, 덮어씌우는 예시
const validation = validateWithParse(schema, req.query[key]);
req.query[key] = validation.value;
```

```typescript
async (req, res) => {
  const { userId } = req.params;
  const { filter } = req.query;

  console.log(typeof userId, typeof filter); // number, object
};
```

### OpenAPI Specification Object 자동 생성

typed-express에는 개발자가 선언한 Route를 모두 읽어들인 후, OpenAPI Specification Object를 자동 생성해주는 [OpenAPIRoute](https://github.com/HoseungJang/typed-express/blob/8145ad757879193b1bd76f05290a1530c343575f/src/openAPIRoute.ts#L5)가 있습니다.

OpenAPIRoute는 request-typer의 [OASBuilder](https://github.com/HoseungJang/request-typer/blob/e2f3d8b0ab05be0d058673d164300e0f62e51893/src/OASBuilder.ts#L5)를 사용합니다.

```typescript
import * as Entities from "./entities";

const PostRouter = new Switch("/posts", [
  /* ... */
]);
const CategoryRouter = new Switch("/categories", [
  /* ... */
]);
/* ... */

const AllRouter = new Switch("/", [PostRouter, CategoryRouter /* ... */]);

const OpenAPIRouter = new OpenAPIRoute(
  "/openapi",
  {
    title: "api",
    version: "1.0.0",
  },
  AllRouter,
  Entities
);

export const RootRouter = new Switch("/", [OpenAPIRouter, AllRouter]);
```

OpenAPIRoute에 AllRouter를 넘기는걸 보실 수 있는데, 내부적으로 AllRouter에 정의된 모든 Route들을 순회하면서 OpenAPI Specification을 생성합니다.

그리고 Entities는 response body schema가 담긴 object인데, 공통된 response schema를 재활용하기 위해서 넘겨줍니다.

아래의 예제를 봅시다.

```typescript
const Entities = {
  User: Schema.Object({
    id: Schema.String(),
    name: Schema.String(),
  }),
};

const UserRouter = new Switch("/users", [
  Route.GET(
    "/{id}",
    "getUser",
    {
      id: Parameter.Path(Schema.String()),
    },
    Entities.User,
    async (req, res) => {
      /* ... */
    }
  ),
  Route.PUT(
    "/{id}",
    "updateUser",
    {
      id: Parameter.Path(Schema.String()),
      name: Parameter.Body(Schema.String()),
    },
    Entities.User,
    async (req, res) => {
      /* ... */
    }
  ),
]);
```

getUser와 updateUser는 같은 response body schema를 공유하고 있습니다. 똑같은 response schema를 Route마다 계속 정의하는 것 보다 훨씬 효율적입니다.

그리고 위와 똑같은 schema 재사용 기능을 OpenAPI Specification에서도 [Components Object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#components-object)로 지원합니다.

API를 정의할 때 $ref 를 사용해 Components Object를 참조하는 방식입니다.

```json
{
  "responses": {
    "200": {
      "description": "success",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/User"
          }
        }
      }
    }
  }
}
```

즉, 아래와 같이 OpenAPIRoute에 값을 넘겨줬을 때,

```typescript
new OpenAPIRoute(
  "/openapi",
  {
    title: "api",
    version: "1.0.0",
  },
  UserRouter, // 위 예제에서 정의한 UserRouter
  Entities // 위 예제에서 정의한 Entities
);
```

내부적으로 UserRouter의 Route들의 response body schema의 reference와 Entities의 reference를 비교(Entities꺼를 그대로 가져다 넘겨줬다면 둘이 reference가 똑같으니까)하고, 알아서 schema를 재사용합니다.

## 문제가 해결 되었는가?

typed-express를 만들면서 위에서 언급했던 문제들이 해결되었는지 다시 정리해볼까요?

- ~~코드의 중복이 너무 많고, 불필요하게 장황합니다.~~
- **기존에 중복되고 장황했던 코드들이 사라졌습니다.**

  - ~~똑같은 포맷의 메시지를 계속 복붙합니다. withMessage의 내용을 보시면, 어차피 "~ must be string", "~ must be provided"같이 다 똑같은 형식을 따르고 있습니다.~~

  - **Route에 request parameters validator가 내장되어있고, request-typer에서 타입에 맞게 error message를 알아서 생성해주기 때문에, 이제 개발자는 request parameters의 타입 정의에만 신경쓰면 됩니다.**

  - ~~validation에 성공하더라도 req object의 타입에는 반영되지 않기 때문에, 하나씩 type assertion을 해주느라 object destruct같은 문법을 사용하지 못하고 있습니다. 코드가 길어집니다.~~

  - ~~parameter validator를 정의할 때 각각의 타입을 다 정의해 줬습니다. 하지만 밑에서 type assertion을 하고 있습니다. 사실상 똑같은 문맥의 코드가 두 번 반복되고 있는 셈입니다. ".isString()"과 "as string"이 문맥상 다른게 뭘까요?~~

  - **Route에서 자동으로 타입을 추론하여 반영해주기 때문에, type assertion을 사용할 필요가 없고, object destruct같은 문법도 자유롭게 사용할 수 있습니다. 같은 문맥인 코드의 중복도 사라졌습니다.**

  - ~~try - catch, next(error)같은 에러 처리용 로직이 라우터마다 계속 중복되고 있습니다.~~

  - **Route에 에러 핸들링 로직을 내장시켰기 때문에, 개발자가 더이상 그런 코드를 복붙할 필요가 없습니다.**

- ~~request parameters는 임의의 type assertion에 의존하고 있습니다. 실수하기 너무 좋은 방식입니다. 이럴거면 parameter validation을 하는 의미가 있나 싶어집니다.~~

- **앞서 말했듯 Route에서 다 알아서 해주므로 해결됬습니다.**

- ~~response body는 아예 타입이 any입니다. 이 또한 실수하기 너무 좋습니다.~~

- **Route가 request parameters외에도 response body의 타입도 추론하여 반영해주기 때문에 해결됬습니다.**

- ~~내용이 통일되어야 할 코드들이 서로 독립적으로 분리되어 관리되고 있습니다.~~

  - ~~OpenAPI Specification은 별개로 전부 직접 작성해주고 있었는데, 거기 들어가는 내용이 request parameters validator의 내용과 당연히 다를게 없고, 달라서는 안됩니다.~~

  - ~~즉, 한곳을 수정하면 다른 곳을 또 똑같이 수정해야 합니다.~~

  - ~~그리고 수정하다가 실수로 각각의 내용이 달라지게 되면 어떤 버그가 생길지 모릅니다. 더 심각한건, 수정 단계에서는 그걸 알아차리기가 매우 힘들다는 겁니다.~~

  - **더이상 request parameters, response body의 정의를 여러곳에서 분리하여 관리할 필요가 없습니다. Route에서 명시해주고, OpenAPIRoute에 넘겨주면 자동으로 OpenAPISpecification이 생성됩니다.**

  - ~~개발이 재미가 없습니다. 똑같은 수정을 반복할수록 사람이 어딘가 기계적으로 변해갑니다.~~

  - **"똑같은 수정을 반복하는 문제"를 해결하는 것에서 다시 재미를 찾았으니 괜찮습니다.(?)**

기존에 느끼고 있었던 모든 문제들을 해결했고, 유용한 오픈소스도 2개나 만들었고, 완전한 프론트엔드 / 백엔드 개발 자동화에도 더욱 가까워졌으니 이번 작업에서는 정말 얻은게 많네요.

## 실제 사용 예시

제 개인 블로그의 백엔드 서비스들 중 [blog-api-gateway](https://github.com/hoseung-only/blog-api-gateway)에서 typed-express를 사용하고 있으니 궁금하시다면 둘러봐주세요. 도움이 되시면 좋겠습니다.

다른 서비스들도 곧 마이그레이션할 예정입니다.
