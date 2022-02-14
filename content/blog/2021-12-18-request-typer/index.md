---
title: Fully-typed한 백엔드 시스템을 위한 오픈소스 프로젝트 개발기
date: 2021-12-18
description: fully-typed 시스템의 완전한 자동화를 위한 발판 프로젝트
tags:
  - 오픈소스
---

> [request-typer](https://github.com/HoseungJang/request-typer) v1.3.0 기준으로 작성되었습니다.

이전에 개인 블로그를 만들면서 [OpenAPI Specification을 작성](/2021-03-27-open-api-specification)해서 [API Client를 자동 생성](/2021-05-01-api-client-sdk)하여 개발자 경험을 높히는 작업을 했던 적이 있었습니다.

예전에 개발해서 배포했던 [oas-api-client](https://github.com/HoseungJang/oas-api-client)라는 오픈소스를 사용해 자동 생성된 API Client는 프론트엔드에서 아래와 같이 사용하고 있습니다.

```typescript
await client.getPostsByCursor({ count: 20 });
```

[swr과 연동해서 사용하는 실제 코드](https://github.com/hoseung-only/blog.hoseung.me/blob/90e1905588dce211a8c35e9bb7076d5ab650d9cb/src/hooks/common/useAPIQuery.ts#L28)

다만, [express](https://expressjs.com/ko/)를 사용하고 있어서 router를 순회하면서 request parameters, response body의 타입을 읽어들이는게 불가능하기 때문에, 직접 OpenAPI Specification를 입력해줘야 했습니다.

근데 그것이 너무 비효율적이기도 하고, 직접 스펙을 작성하는건 많은 실수를 유발했습니다. 즉, 작업의 의도였던 "개발자의 실수를 줄이고 개발 환경의 구축을 자동화하는 것"이 변질되어 버렸습니다.

따라서 완전한 자동화와 fully-typed된 프론트엔드 / 백엔드 시스템을 구축하기 위해서 [request-typer](https://github.com/HoseungJang/request-typer)라는 오픈소스 프로젝트를 시작하게 되었습니다.

이 글에서는 request-typer의 기능과 개발 배경, 구현을 간단히 기록하려고 합니다.

## 기능

request-typer는 아래의 기능들을 포함합니다.

- JSON Schema Builder
- JSON Schema Based Type Validator
- HTTP Request / Response Schema Builder
- OpenAPI Specification generator

### JSON Schema Builder

request-typer에서 가장 중요한 기능 중 하나입니다.

request parameter / response body를 명시하기 위해 개발하게된 기능입니다.

Schema라는 class를 사용해서 간단한 원시 타입부터 복잡한 Union, Object 타입도 정의할 수 있습니다.

```typescript
Schema.Number(); // number
Schema.String(); // string
```

```typescript
// number | string | boolean
Schema.Union([Schema.Number(), Schema.String(), Schema.Union([Schema.Number(), Schema.String(), Schema.Boolean()])]);
```

```typescript
/*
{
  a: number;
  b?: { c: boolean };
  d: number | string | null;
}
*/
Schema.Object({
  a: Schema.Number(),
  b: Schema.Optional(
    Schema.Object({
      c: Schema.Boolean(),
    })
  ),
  d: Schema.Nullable(Schema.Union([Schema.Number(), Schema.String()])),
});
```

Schema는 아래와 같이 타입(number, object 등)과 옵션(optional, nullable)을 명시하고 리턴합니다.

```typescript
export type SchemaOptions = {
  optional?: boolean;
  nullable?: boolean;
};

export type NumberSchema = {
  type: "number";
  options: SchemaOptions;
  definition: string;
};

export type OptionalSchema<T extends AllSchema> = Omit<T, "options"> & { options: T["options"] & { optional: true } };

export type ObjectSchema<T extends ObjectProperties> = {
  type: "object";
  properties: T;
  options: SchemaOptions;
  definition: string;
};
```

Schema로 생성된 object를 Typescript 타입으로 바꿔주는 기능도 제공합니다. Resolve type을 사용하면 됩니다.

```typescript
const numberSchema = Schema.Number();
type NumberSchema = Resolve<typeof numberSchema>; // number

const unionSchema = Schema.Union([Schema.Number(), Schema.String()]);
type NumberSchema = Resolve<typeof unionSchema>; // number | string

const objectSchema = Schema.Object({
  a: Schema.Number(),
  b: Schema.Optional(Schema.Boolean()),
});
/*
{
  a: number;
  b?: boolean;
}
*/
type NumberSchema = Resolve<typeof objectSchema>;
```

[테스트 코드](https://github.com/HoseungJang/request-typer/blob/master/src/__test__/schema.test.ts)

### JSON Schema Based Type Validator

위에서 Schema class를 사용해 JSON Schema를 만들었었는데, 그걸 사용하여 실제 Javascript value와 일치하는지 비교하는 기능도 제공합니다.

나중에 백엔드에선 request parameter validator 용도로 사용할 기능입니다.

Validator class를 사용하여 비교하면 됩니다.

```typescript
const result = Validator.validate(Schema.Number(), 1234);
console.log(result.success); // true

const result = Validator.validate(Schema.Boolean(), "asdf");
console.log(result.success); // false
console.log(result.error.description); // "should be boolean"

const result = Validator.validate(
  Schema.Object({
    a: Schema.Number(),
    b: Schema.Optional(Schema.String()),
  }),
  { a: 1234 }
);
console.log(result.success); // true
```

validate 메소드는 내부적으로 재귀함수로, 특히 object, array 등을 검사할 때 재귀적으로 동작합니다.

```typescript
public static validate(schema: AllSchema, value: any): ValidationResult {
  switch (schema.type) {
    /* ... */
    case "array": {
      const isArray = value instanceof Array;
      if (!isArray) {
        return this.makeResult(false, "should be array");
      }
      return value.every((item) => this.validate(schema.itemSchema, item).success)
        ? this.makeResult(true)
        : this.makeResult(false, `should be ${schema.definition}`);
    }
    case "union": {
      return schema.itemSchemas.some((item) => this.validate(item, value).success)
        ? this.makeResult(true)
        : this.makeResult(false, `should be ${schema.definition}`);
    }
    /* ... */
  }
}
```

[테스트 코드](https://github.com/HoseungJang/request-typer/blob/master/src/__test__/validator.test.ts)

### HTTP Request / Response Schema Builder

Schema class를 사용해서 HTTP Request / Response Schema를 정의하는 기능도 있습니다.

HTTP class를 사용하면 되고, OpenAPI Specification을 생성하기 위해서 사용합니다.

HTTP class의 모든 method들은 아래의 인자를 받습니다.

- operationId: API endpoint 하나당 고유한 ID입니다. 나중에 API Client를 생성할 때 method 이름으로 사용됩니다.

```typescript
await client.getUser({ id: "1234" });
```

- path: endpoint URL입니다.

- request parameters: 요청 파라미터들 입니다. Parameter class를 사용해서 Query parameters, Path parameters, Request Body를 정의할 수 있습니다.

```typescript
const parameter = Parameter.Query(Schema.Number());
console.log(parameter.type); // "query"
console.log(parameter.schema); // NumberSchema
```

- response body: response JSON schema를 정의합니다. Schema class를 사용해서 정의하면 됩니다.

아래는 간단한 사용 예시입니다. getUser API를 정의하고 있습니다.

```typescript
HTTP.GET(
  "getUser",
  "/users/:id",
  {
    id: Parameter.Path(Schema.String()),
  },
  Schema.Object({
    user: Schema.Object({ id: Schema.String() }),
  })
);
```

Schema class와 마찬가지로, Type resolution도 지원합니다.

```typescript
const request = HTTP.PUT(
  "updateUser",
  "/users/:id",
  {
    id: Parameter.Path(Schema.String()),
    name: Parameter.Body(Schema.String()),
    email: Parameter.Body(Schema.Optional(Schema.String())),
  },
  Schema.Object({
    user: Schema.Object({
      id: Schema.String(),
      name: Schema.String(),
      email: Schema.Optional(Schema.String()),
    }),
  })
);

// {}
type QueryParams = ResolveQueryParameters<typeof request.parameters>;

// { id: string }
type PathParams = ResolvePathParameters<typeof request.parameters>;

// { name: string; email?: string | undefined }
type RequestBody = ResolveRequestBody<typeof request.parameters>;
```

[Parameter class 테스트 코드](https://github.com/HoseungJang/request-typer/blob/master/src/__test__/parameter.test.ts)
[HTTP class 테스트 코드](https://github.com/HoseungJang/request-typer/blob/master/src/__test__/http.test.ts)

### OpenAPI Specification generator

Schema, HTTP class를 사용해서 정의한 HTTP Request Schema를 사용해서 OpenAPI Specifiation을 자동 생성할 수 있습니다.

OASBuilder class를 사용하면 됩니다.

```typescript
const Responses = {
  User: Schema.Object({
    id: Schema.String(),
    name: Schema.String(),
    gender: Schema.Nullable(Schema.Enum(["men", "women"])),
    email: Schema.Optional(Schema.String()),
  }),
};

const httpRequestSchemas = [
  HTTP.PATCH(
    "updateUser",
    "/user/{id}",
    {
      id: Parameter.Path(Schema.String()),
      name: Parameter.Body(Schema.String()),
    },
    Responses.User
  ),
];

const oas = new OASBuilder({ title: "api-v1", version: "1.0.0" }, httpRequestSchemas, Responses).build();
console.log(JSON.stringify(oas));
```

여기서 HTTP Request Schema를 정의할 때 response body 부분은 따로 Responses 객체를 만들어서 재활용하는 이유는,

중복 코드를 줄이기 위함도 있지만, OASBuilder가 Responses 객체를 받아 OpenAPI Specification의 components object를 생성하기 때문에 필요합니다.

paths object를 만들 때 HTTP Request Schema를 순회하면서, 내부적으로 response body schema의 reference를 비교하여 $ref 프로퍼티로 schema를 재사용하도록 구현되있습니다.

```typescript
constructor(
  private readonly info: OpenAPIV3.InfoObject,
  private readonly httpRequestSchemas: HTTPRequest<Method, Parameters, ResponseBody>[],
  responseSchemas: Record<string, ResponseBody> = {}
) {
  Object.keys(responseSchemas).forEach((key) => {
    this.responseSchemaKeyValuePairs.push([key, responseSchemas[key]]);
  });
}
```

```typescript
private getResponseBodySchemaName(responseBody: ResponseBody): string | null {
  return this.responseSchemaKeyValuePairs.find(([, value]) => value === responseBody)?.[0] ?? null;
}
```

```typescript
{
  schema: (() => {
    const schemaName = this.getResponseBodySchemaName(requestSchema.response);
    return schemaName
      ? {
          $ref: `#/components/schemas/${schemaName}`,
        }
      : this.createSchema(requestSchema.response);
  })(),
}
```

따라서 위 예제는 아래의 OpenAPI Specification을 출력합니다.

```json
{
  "info": {
    "title": "api-v1",
    "version": "1.0.0"
  },
  "openapi": "3.0.1",
  "paths": {
    "/user/{id}": {
      "patch": {
        "operationId": "updateUser",
        "parameters": [
          {
            "required": true,
            "name": "id",
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  }
                },
                "required": ["name"]
              }
            }
          }
        },
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
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "gender": {
            "type": "string",
            "enum": ["men", "women"],
            "nullable": true
          },
          "email": {
            "type": "string"
          }
        },
        "required": ["id", "name", "gender"]
      }
    }
  }
}
```

components object에 User schema가 생성되있고, updateUser에서 $ref로 참조하여 재사용하고 있는걸 볼 수 있습니다.

[테스트 코드](https://github.com/HoseungJang/request-typer/blob/master/src/__test__/OASBuilder.test.ts)

## 다음 글 예고

성공적인 개발과 배포를 마쳤으니, 다음 글에서는 [request-typer](https://github.com/HoseungJang/request-typer)를 사용해서 어떻게 express에서 fully-typed된 백엔드 시스템을 구축했는지에 대해 정리해볼 예정입니다.

혹시나 그전에 [request-typer](https://github.com/HoseungJang/request-typer)를 사용해보실 분들은 위에 예제를 참고해서 OpenAPI Specification을 생성하신 후, 제가 맨 위에서 언급했던 오픈소스인 [oas-api-client](https://github.com/HoseungJang/oas-api-client)와 함께 사용해보세요.

OpenAPI Specificatoin이 들어있는 JSON 파일 또는 그걸 응답하는 HTTP URL을 넘겨주면 API Client library를 자동 생성해줍니다.

```
npx oas-api-client generate -f ./openapi.json
npx oas-api-client generate -u https://example.com/openapi
```
