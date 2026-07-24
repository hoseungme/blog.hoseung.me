---
title: Tool Calling 대신 JavaScript 코드 실행으로 동작하는 AI 에이전트 만들기
date: 2026-07-25T00:00:00+09:00
description: Tool Calling은 LLM의 동작 원리상 구조적인 한계가 명확합니다. 이를 JavaScript로 Tool을 사용하게 하여 해결한 경험을 공유합니다.
---

Tool Calling은 AI 에이전트를 만들 때 아주 유용한 기능입니다. LLM이 상황에 맞게 외부 기능을 사용할 수 있게 해줍니다. 동작 방식이 아주 직관적이고 구현도 어렵지 않아 많은 팀에서 Tool Calling 기반으로 제품을 개발합니다.

저도 웹 브라우저를 만드는 팀에서 일하며 AI 브라우징 에이전트를 만들면서 Tool Calling을 활용했습니다. 하지만 에이전트의 기능이 점점 많아지고 복잡해지면서 응답 속도, Hallucination, 토큰 사용량 측면에서 구조적인 문제가 드러났습니다.

그래서 저희 팀에서는 LLM이 Tool Calling이 아니라 JavaScript 코드 실행을 통해 외부 기능을 사용하게 만들어 문제를 해결할 수 있었습니다.

이 글에서는 왜 Tool Calling이 그런 구조적인 문제를 가지는지, 코드 실행 방식으로 어떻게 해결할 수 있는지를 소개합니다.

# LLM의 동작 방식

Tool Calling의 문제를 이해하기 위해 LLM의 동작 방식을 먼저 알아보겠습니다.

많은 분들이 LLM이 '학습을 한다', '기억을 해준다'라는 말을 자주 합니다. 예쁘게 만들어진 Chat GPT, Claude Code의 채팅 인터페이스만 사용하다 보면 정말로 그래보입니다.

하지만 실제로는 다릅니다. LLM 호출은 이전까지의 모든 대화내용을 전부다 입력에 포함하는 Stateless 방식으로 동작합니다. 내 말을 기억하고 현재 메시지 하나만 보고 답을 하는게 아닙니다.

그리고 그 입력 전체를 기반으로 출력을 만드는데, 이를 LLM이 실제로 생각하는 과정이라고 이해하는 경우가 많습니다. 하지만 사실 LLM은 확률 계산을 통해 출력을 만드는 통계 모델입니다.

예를 들어, LLM에게 `Who are you?` 라고 말했을 때, LLM이 `I'm your AI assistant. 😄` 라고 답했다고 가정합시다. 이때 내부적으로는 아래와 같이 동작합니다.

1. LLM은 입출력을 토큰 이라는 단위로 관리합니다. 먼저 입력이 `Who`, `are`, `you`, `?` 처럼 여러 개의 토큰으로 분리됩니다.
2. 모든 입력 토큰을 분석하여 다음 출력 토큰으로 무엇이 오는게 가장 적합한지를 계산합니다. 다음 토큰 후보로 `I`, `You`, `He` 등이 오고, 그 중 `I`를 선택합니다.
3. 이번엔 `Who`, `are`, `you`, `?`, `I` 까지가 새로운 입력 토큰이 됩니다. 다음 토큰 후보로 `'m`, `am`, `is`, `are` 등이 오고, 그 중 `'m`을 선택합니다.
4. 위 과정을 계속 반복하여 `I'm your AI assistant. 😄` 라는 출력을 완성합니다.

이런 동작 방식으로도 자연스러운 답변을 만들어낼 수 있는 이유는 그 만큼 방대한 양의 텍스트를 기반으로 학습했기 때문입니다. 그래서 Large Language Model인 것입니다.

전세계의 모든 영어 문서를 학습했을 때, `You is`라고 잘못 쓴 문서 보다 `You are`이라고 옳게 쓴 문서가 훨씬 많을 것입니다.

전세계의 모든 맥북 리뷰 문서를 학습했을 때, 인텔 칩이 탑재된 맥북이 더 좋다고 작성된 리뷰 보다 M1 칩이 탑재된 맥북이 더 좋다고 작성된 리뷰가 훨씬 많을 것입니다.

최근 2년 동안 작성된 모든 JavaScript 예제를 학습했을 때, 상수 선언을 `var foo = "bar";`로 작성한 예제 보다 `const foo = "bar";`로 작성한 예제가 훨씬 많을 것입니다.

그렇기 때문에 보통은 어색하거나 틀린 답변을 잘 하지 않는 것입니다.

다만 저렇게 입력 전체를 기반으로 다음 토큰을 만들어내는 동작 방식 때문에 입출력이 길어질수록, 즉 컨텍스트가 길어질 수록 답변 퀄리티가 낮아질 가능성이 높아지는 한계가 있습니다.

즉, LLM에게 똑같은 입력을 주었을 때 퀄리티 높은 답변을 더 적은 토큰으로 더 오래 만들어낼 수 있도록, 입출력의 크기를 최소화하고 시스템 프롬프트를 잘 작성하는 것이 프롬프트 엔지니어링의 핵심 중 하나라고 할 수 있습니다.

# Tool Calling의 한계

페이지 내용을 요약하는 기능을 지원해야하는 상황을 예시로 들어보겠습니다. LLM 입장에선 유저가 보고 있는 페이지가 무엇인지, 그 페이지의 내용이 무엇인지 불러올 수 있어야 합니다. 따라서 개발자는 각각의 기능을 개발하고 Tool로 정의합니다.

```json
[
  {
    "name": "getCurrentTabId",
    "description": "현재 유저가 보고있는 탭의 ID를 반환합니다.",
    "input_schema": {
      "type": "object",
      "properties": {},
    }
  },
  {
    "name": "getTabContent",
    "description": "특정 탭의 웹뷰에 렌더링된 HTML을 반환합니다.",
    "input_schema": {
      "type": "object",
      "properties": {
        "tabId": {
          "type": "string"
        }
      },
      "required": ["tabId"]
    }
  }
]
```

그러면 실제로 유저가 기능을 사용했을 때 아래와 같은 순서로 LLM을 호출하게 될 것입니다.

1. 유저가 `이 페이지의 내용을 요약해줘.`라고 LLM에게 입력
2. LLM은 `getCurrentTabId` 실행
3. `getCurrentTabId`의 결과인 `tab-12345`를 LLM에게 전달
4. LLM은 `tab-12345`를 사용해 `getTabContent` 실행
5. `getTabContent` 결과인 현재 페이지의 HTML을 LLM에게 전달
6. LLM이 HTML을 활용해 페이지 요약을 만들어 유저에게 답변

```json
[
  {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "이 페이지의 내용을 요약해줘."
      }
    ]
  },
  {
    "role": "assistant",
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_01ABC123",
        "name": "getCurrentTabId",
        "input": {}
      }
    ]
  },
  {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_01ABC123",
        "content": {
          "tabId": "tab-12345"
        }
      }
    ]
  },
  {
    "role": "assistant",
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_02DEF456",
        "name": "getTabContent",
        "input": {
          "tabId": "tab-12345"
        }
      }
    ]
  },
  {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_02DEF456",
        "content": "<html>...</html>"
      }
    ]
  },
  {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "이 페이지의 요약은..."
      }
    ]
  }
]
```

이처럼 Tool Calling은 한 번에 하나의 Tool만 호출할 수 있고, 실행 결과 전체를 LLM 컨텍스트에 다시 입력으로 넣는 방식으로 동작합니다. 이런 방식은 이전 Tool의 실행 결과가 다음 Tool 실행의 입력으로 들어가는 상황에서 문제가 많습니다.

LLM 컨텍스트에 같은 내용이 두 번 들어가게 되므로 토큰 사용량이 불필요하게 많아지고, Tool 실행 횟수 만큼 LLM 호출 횟수가 증가하므로 처리 속도도 느려집니다. 또한 LLM이 이전의 Tool 실행 결과를 Hallucination 없이 정확히 사용한다는 보장도 없습니다.

하지만 LLM이 Tool Calling 대신 아래와 같은 JavaScript를 작성하여 현재 페이지의 내용을 가져올 수 있다면 어떨까요?

```javascript
const tabId = getCurrentTabId();
const result = getTabContent({ tabId });
complete(result);
```

Tool Calling과 다르게 `complete()`에 전달한 내용만 LLM 컨텍스트에 포함시키면 되고, JavaScript로 Tool 실행 결과를 자유롭게 가공하여 필요한 값만 전달할 수 있으므로 토큰 사용량을 크게 줄일 수 있습니다. 그리고 불필요한 중간 결과가 LLM 컨텍스트에 포함되지 않아 Hallucination의 영향도도 줄어듭니다. 또한 한 번의 LLM 호출로도 여러 개의 Tool 실행이 가능해지므로 처리 속도도 훨씬 빨라집니다.

결과적으로 LLM 호출 플로우를 아래와 같이 간단하게 만들 수 있게됩니다.

1. 유저가 `이 페이지의 내용을 요약해줘.`라고 LLM에게 입력
2. LLM은 유저의 요구사항에 맞게 JavaScript를 작성해서 `executeCode`로 실행
3. `executeCode`로 해당 코드를 실행한 결과를 LLM에게 전달
4. LLM이 HTML을 활용해 페이지 요약을 만들어 유저에게 답변

```json
[
  {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "이 페이지의 내용을 요약해줘."
      }
    ]
  },
  {
    "role": "assistant",
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_01ABC123",
        "name": "execute_code",
        "input": {
          "code": "complete(getTabContent({tabId:getCurrentTabId()}));",
        }
      }
    ]
  },
  {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_01ABC123",
        "content": "<html>...</html>"
      }
    ]
  },
  {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "이 페이지의 요약은..."
      }
    ]
  }
]
```

# JavaScript를 선택한 이유

LLM이 코드 작성에 사용할 언어로 JavaScript를 선택한 이유는 Mirror 브라우저가 Swift로 작성된 MacOS 앱이었기 때문입니다.

Swift에서는 [JavaScriptCore](https://developer.apple.com/documentation/javascriptcore) 프레임워크를 사용해 JavaScript 코드를 실행하고 결과를 받아올 수 있습니다. 이때, 아래와 같이 Swift의 함수를 JavaScript 런타임으로 주입하는 것이 가능합니다.

```swift
import Foundation
import JavaScriptCore

let context = JSContext()!

let add: @convention(block) (Int, Int) -> Int = { a, b in
    return a + b
}

context.setObject(add, forKeyedSubscript: "add" as NSString)

let result = context.evaluateScript("add(3, 5);")
print(result.toInt32()) // 8
```

이게 가능하다는 것은 Swift로 Tool을 구현할 수 있다는 것이고, 그럼 프로젝트 내에 만들어둔 모든 구현체와 Swift에서 제공하는 MacOS의 모든 네이티브 API들을 그대로 사용할 수 있다는 것이므로 큰 장점이었습니다.

그리고 JavaScriptCore는 Swift에 내장된 프레임워크이기 때문에, 저희가 별도로 무거운 의존성을 설치하거나 서브 프로세스를 띄우는 등의 복잡한 구현을 할 필요가 없었습니다.

LLM의 답변 퀄리티 측면에서도, JavaScript는 학습 데이터가 충분할 수 밖에 없는 언어이기 때문에 문제가 되지 않았습니다.

팀에서도 다른 언어보다 JavaScript, TypeScript에 훨씬 익숙했기 때문에 선택하지 않을 이유가 없었습니다.

# 구현

핵심 구현은 LLM의 Tool Calling으로는 JavaScript 코드를 실행하고 그 결과를 응답하는 `executeCode`만 연결하고, `executeCode`의 JavaScript 런타임에 LLM이 실행할 수 있는 Tool들을 전역 함수로 미리 주입하는 것입니다.

우선 LLM이 `executeCode`를 거쳐 사용할 Tool들은 `GlobalFunction` 프로토콜을 채택한 구조체로 작성됩니다. 해당 프로토콜을 통해 Tool을 `JSConstant.closure`로 변환할 수 있습니다.

```swift
protocol Tool {
    associatedtype Parameters: ToolParameters = VoidSchemable
    associatedtype Response: ToolResponse = VoidSchemable

    func callAsFunction(parameters: Self.Parameters) async throws -> Self.Response

    static var name: String { get }
    static var description: String { get }
    static var parameters: JSONSchema? { get }
    static var response: JSONSchema? { get }
}

protocol GlobalFunction: Tool where Context == ExecuteCodeTool.Context {}

extension GlobalFunction {
    func asJSConstant() -> JSConstant {
        .closure(.init(name: name, parameters: parameters, response: response,
            execute: { params in
                let parsed = try parseParameters(json: params)
                return try await self(parameters: parsed)
            }
        ))
    }
}
```

`GlobalFunction`으로 작성된 Tool들은 `executeCode` 생성자에 전달되고, 생성자 내부에서 JavaScript 런타임에 전역 함수로 주입됩니다.

```swift
let functions: [any GlobalFunction] = [
    // ...
]

ExecuteCodeTool(functions: functions)
```

이때 LLM이 함수를 전역 스코프에서 사용하려면 `executeCode`에 주입되는 JavaScript 함수들은 모두 동기여야 했습니다.

Top Level Await가 가능하게 할 수 있었고 실제로 처음에는 그렇게 만들었습지만, 문제는 이 작업을 할 당시의 모델들은 코딩을 못했다는 것이었습니다. 같은 컨텍스트 내에서 변수를 선언하고 재사용하는 것도 제대로 수행하지 못할 정도로, 작성 규칙이 조금만 늘어나도 퀄리티가 급격히 떨어졌습니다.

이는 Top Level Await가 가능하다는 규칙을 추가한 경우에도 마찬가지였습니다. `await` 키워드 사용을 누락하기도 하고, 멋대로 비동기 IIFE로 감싸기도 하는 등 의도대로 동작하지 않았습니다.

따라서 LLM이 생성할 코드의 형태를 최대한 간단하게 만드는 것이 중요했고, 비동기로 작성된 Tool을 JavaScript 런타임에 주입할 때 동기로 변환하는 방식을 사용했습니다.

```swift
extension JavaScriptRuntime {
    func createFunction(asyncFunction: @escaping (Any?) async throws -> Any?) -> (@convention(block) (Any?) -> Any?) {
        { [weak self] argument -> Any? in
            guard let self else { return nil }

            var result: Result<Any?, any Error>?

            let semaphore = DispatchSemaphore(value: 0)

            Task {
                do {
                    result = try await .success(asyncFunction(argument))
                } catch {
                    result = .failure(error)
                }
                semaphore.signal()
            }

            semaphore.wait()

            guard let result else {
                throw "should not happen"
            }

            switch result {
                case .success(let success):
                    return success
                case .failure(let error):
                    guard let context = JSContext.current() else { return }
                    context.exception = .init(object: error, in: context)
                    return
            }
        }
    }
}
```

```swift
for function in functions {
    jsContext.set(
        object: javaScriptRuntime.createFunction(asyncFunction: function),
        forKey: function.name
    )
}
```

그리고 이렇게 `executeCode`의 JavaScript 런타임에 주입된 전역 함수들은 시스템 프롬프트에 TypeScript 타입 정의로써 표현됩니다. JSON Schema로 파라미터와 리턴값을 표현하는 것은 너무 길어서 토큰 낭비라고 생각했고, LLM에게 원하는 결과물이 JavaScript이기 때문에 잘 동작할 것이라고 판단했습니다.

```swift
private struct TypeScriptDeclarationGenarator {
    static func function(name: String, parameters: JSONSchema?, response: JSONSchema?) -> String {
        "function \(name)(\(convert(schema: parameters))): \(convert(schema: response))"
    }

    static func convert(schema: JSONSchema?) -> String {
        // ...
    }
}
```

```swift
typescriptDeclaration = functions
    .map {
        "/*\n\(description)\n*/\n" +
        TypeScriptDeclarationGenarator.function(
            name: $0.name,
            parameters: $0.parameters,
            response: $0.response
        )
    }
    .joined(separator: "\n")
```

```swift
MirrorAgent(
    // ...
    tools: [executeCodeTool],
    systemPrompt: SystemPrompt(
        typescriptDeclaration: executeCodeTool.typescriptDeclaration
    ).prompt
    // ...
)
```

이를 통해 LLM은 `executeCode`를 통해 어떤 Tool들을 실행할 수 있는지, 어떤 파라미터를 넣어야 하는지, 어떤 리턴값을 받는지 알고 코드를 작성할 수 있습니다.

예를 들어, 컨텐츠를 파일로 저장할 수 있게 해주는 `writeFile`을 `executeCode`에서 실행 가능한 전역 함수로 추가해보겠습니다.

```swift
struct WriteFileTool: GlobalFunction {
    static let name = "writeFile"
    static let description =
        """
        Write file and save to disk
        - For html content, make sure to specify <meta charset="UTF-8"> otherwise it may not display correctly.
        """

    struct Parameters: JSONSchemable {
        let name: String
        let content: String
        let open: Bool?

        static let schema: JSONSchema = [
            "type": "object",
            "properties": [
                "name": [
                    "type": "string",
                    "description": "file name, such as 1.txt"
                ],
                "content": [
                    "type": "string",
                    "description": "file content, UTF-8"
                ],
                "open": [
                    "type": "boolean",
                    "description": "should open the file after writing."
                ]
            ],
            "required": ["name", "content"]
        ]
    }

    struct Response: JSONSchemable {
        let url: String

        static let schema: JSONSchema = [
            "type": "object",
            "properties": [
                "url": [
                    "type": "string",
                    "description": "file url where the file is written, such as file:///Users/username/Downloads/1.txt"
                ]
            ],
            "required": ["url"]
        ]
    }

    func callAsFunction(parameters: Parameters) async throw -> Response {
        do {
            let url = try writeFile(parameters.name, parameters.content)
            if parameters.open == true {
                await openFile(url)
            }
            return .init(url: url.absoluteString)
        } catch {
            throw "Failed to write file. \(error)"
        }
    }

    private func writeFile(_ name: String, _ content: String) throws -> URL {
        let url: URL = .downloads.appendingPathComponent(name)
        do {
            try content.write(to: url, atomically: true, encoding: .utf8)
        } catch {
            throw "Failed to write file. \(error)"
        }
        return url
    }

    private func openFile(_ url: URL) async {
        if url.isFileURL, ["html"].firstIndex(of: url.pathExtension) != nil {
            openHtmlFile(url)
        } else {
            NSWorkspace.shared.open(url)
        }
    }
}
```

```swift
ExecuteCodeTool(functions: [WriteFileTool()])
```

그러면 시스템 프롬프트의 Code Reference 섹션에 `writeFile`의 타입 정의가 추가되고, `executeCode`의 JavaScript 런타임에 주입되어 LLM이 사용할 수 있게됩니다.

```md
# Code Reference
The following functions and constants are available in the code sandbox:

/*
Write file and save to disk
- For html content, make sure to specify <meta charset="UTF-8"> otherwise it may not display correctly.
*/
function writeFile({
  name: string /* file name, such as 1.txt */,
  content: string /* file content, UTF-8 */,
  open?: boolean /* should open the file after writing. */
}): {
  url: string /* file url where the file is written, such as file:///Users/username/Downloads/1.txt */
};
```

# 데모

당시 기능 개발을 모두 마치고 나서, 맥북 에어를 구매하는 상황을 가정하고 녹화한 데모 영상입니다. LLM이 코드를 어떻게 생성했는지도 나오니 확인해보세요.

<div class="iframe-container">
  <iframe src="https://www.youtube.com/embed/ZwJab0mye6w" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
