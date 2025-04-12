---
title: LLM으로 웹 브라우저 온보딩 개인화하기
date: 2025-04-13T00:00:00+09:00
description: Mirror 브라우저의 신규 유저 온보딩을 개선하기 위해 Embedding Vector, RAG 등을 고려한 과정을 공유합니다.
tags:
  - AI
---

제가 개발하고 있는 [Mirror 브라우저](https://www.mirror.work/)는 신규 유저를 대상으로 온보딩을 진행하는데, 최근에 LLM을 활용하여 온보딩의 퀄리티를 크게 높히는 작업을 했습니다.

그 과정에서 Embedding Vector, RAG 등 새로운 개념을 배우면서 무엇을 고려했는지, 어떤 문제를 겪었는지, 최종 구현은 어떻게 했는지를 공유하려고 합니다.

## Mirror 브라우저의 온보딩

글의 이해를 위해, 기존 온보딩과 새롭게 개선된 온보딩이 각각 어떻게 생겼는지를 먼저 보여드리려고 합니다.

기존 온보딩은 유저의 직업과 관심사에 대해 미리 준비된 선택지를 보여주고, 유저의 답변에 따라 아래와 같이 브라우징 환경(이하 세션)을 미리 만들어주는 것이었습니다.

![](./images/posts/2025-04-13-mirror-onboading-llm/home.png)
![](./images/posts/2025-04-13-mirror-onboading-llm/session.png)

기존 온보딩도 수많은 이터레이션을 거쳐 개선된 방식이었고, 실제로 20% ~ 30% 사이에 머물던 위클리 리텐션이 40 ~ 50%까지 크게 증가했습니다. 하지만 기존 온보딩은 미리 준비된 선택지와 결과로만 진행된다는 점이 여전히 아쉬웠습니다.

따라서 새로운 온보딩은 유저가 어떤 직업을 입력하더라도 대응이 가능하도록 개선되었습니다. 유저가 입력한 직업에 따라 LLM이 질문과 선택지를 유동적으로 생성하고, 유저의 답변에 따라 세션을 생성합니다.

LLM이 유저의 직업과 그 직업 내의 명확한 분야까지 파악하도록 프롬프트를 구성했는데, 예를 들어 유저가 직업을 'Frontend Developer'라고 입력하는 경우, 유저가 직업과 분야 모두 명확히 제공했기 때문에, LLM이 추가적인 질문을 하지 않고 아래와 같이 세션을 생성합니다.

![](./images/posts/2025-04-13-mirror-onboading-llm/frontend-developer-home.png)
![](./images/posts/2025-04-13-mirror-onboading-llm/frontend-developer-session.png)

코드 리뷰 업무를 위한 GitHub, BitBucket이 보이고, 작업 관리 도구인 Asana, Trello, Jira가 보입니다. CSS Tricks, Dribbble 등 프론트엔드 개발자를 위한 웹사이트도 보입니다. 아주 그럴듯하죠?

다른 예시를 볼까요? 만약 유저가 직업을 'Designer'라고 입력하는 경우, 어떤 분야의 디자이너인지 명확하지 않기 때문에 아래와 같이 LLM이 디자인 분야에 대해 추가적인 질문을 합니다.

![](./images/posts/2025-04-13-mirror-onboading-llm/designer-additional-question.png)

그 후 위처럼 유저가 UI/UX를 선택하면, LLM이 아래와 같이 UI/UX Designer에 맞추어 세션을 생성합니다.

![](./images/posts/2025-04-13-mirror-onboading-llm/designer-home.png)
![](./images/posts/2025-04-13-mirror-onboading-llm/designer-session.png)

Figma, Sketch, Adobe 같은 디자인 도구들이 보이고, 폰트, 아이콘 등의 리소스를 찾을 수 있는 웹사이트들과 User/UX Research 서비스들도 보입니다. UI/UX 디자이너가 보기에 아주 그럴듯합니다.

다만 개발자, 디자이너는 너무 일반적인 답변이고 LLM 입장에서도 학습 데이터가 매우 충분한 직업일 것입니다. 팀에서도 이를 인지하고 예외 상황이 발생했을 때 프롬프트를 빠르게 수정해 배포할 수 있도록 유저가 온보딩을 마치면 Slack에 알림이 오게 만들었습니다.

알림이 왔던 것 중에서 꽤 특이했던 직업이 있었는데, 아래와 같이 'Content Creator'를 직업으로 입력하고, 다루는 컨텐츠의 카테고리를 Tech, Lifestyle로 선택한 유저가 있었습니다.

![](./images/posts/2025-04-13-mirror-onboading-llm/content-creator-slack.png)

LLM이 생성한 세션을 보면, 다양한 분야에서 양질의 아티클을 읽을 수 있는 Medium과, Tech 분야의 소식을 읽을 수 있는 TechCrunch가 가장 먼저 보입니다. Content Creator에게 리서치는 필수적이므로, 유저가 입력한 Tech, Lifestyle 분야에 맞추어 생성해준 모습입니다.

또한 일정, 작업 관리를 위한 Trello, 노트 테이킹을 포함해 다양한 용도로 활용 가능한 Notion, 각종 소셜 미디어 마케팅 도구 등등 어느 하나도 Content Creator 입장에서 크게 어색한 웹사이트가 없는 모습입니다.

이러한 새로운 온보딩은 기술적으로 아래와 같은 순서로 이루어집니다.

1. 유저에게 직업을 입력받기
2. 유저의 입력에 상세한 분야가 드러나는지 판단하고, 아니라면 추가 질문하기
3. 유저의 직업과 관련된 웹사이트를 찾아서 세션 만들기

1, 2는 단순히 프롬프트 엔지니어링 삽질의 영역이므로 다루지 않을 거고, 이 글에서 다룰 내용은 3입니다.

## 처음 시도한 방식 - Embedding Vector, RAG

처음 시도했던 방식은 Embedding Vector를 활용한 RAG 였습니다. 그런데 Embedding Vector와 RAG가 뭘까요?

LLM은 잘못된 정보를 생성할 수 있고, 미리 학습된 데이터에 기반하여 답변한다는 단점을 가지고 있습니다. 예를 들어, LLM에게 "개발자"와 관련된 유명한 웹사이트 10개를 알려달라고 하면, 학습된 데이터로부터 "개발자"와 관련된 유명한 웹사이트를 찾아 답변을 만들 것입니다. 이때 LLM이 답변한 웹사이트는 현재는 사라졌을 수도 있고, 애초부터 없었을 수도 있습니다.

이러한 문제를 개선하기 위해선 LLM이 정보를 생성하게 만들지 말고, LLM에게 외부에서 찾은 정보를 넘겨준 뒤, 그걸 기반으로 답변하도록 만들어야 합니다. 예를 들어, 개발자와 관련된 웹사이트 목록을 직접 찾아 LLM에게 넘겨준 뒤, `이건 "개발자"와 관련된 웹사이트 목록이다. 이 중에서 "코드리뷰"에 사용하는 유명한 웹사이트만 골라라.`라고 프롬프트를 작성하는 것입니다. 이런 방식을 RAG라고 하고, 이를 통해 LLM이 생성한 답변의 정확도와 신뢰도를 높힐 수 있습니다. 

그렇다면 개발자와 관련된 웹사이트를 LLM 없이 어떻게 찾아낼 수 있을까요? 다행히 Mirror 브라우저는 웹사이트 방문 이벤트를 트래킹하고 있기 때문에, 간단한 SQL 문을 작성하여 가장 많이 조회된 웹사이트 목록을 뽑아낼 수 있습니다. (개인정보 보호 차원에서 어떤 유저가 방문했는지는 트래킹하지 않습니다)

따라서 이제 "개발자"와 특정 웹사이트의 유사도를 계산할 수만 있다면 원하는 결과를 얻을 수 있는데, 텍스트는 숫자와 다르게 그 자체만으로는 크고 작음을 비교하거나 거리를 계산하는 등 유사성을 판단하는 연산이 불가능합니다. 텍스트를 비교 가능한 숫자 값으로 변환할 수 있다면 어떨까요? 의미가 비슷한 텍스트끼리는 서로 가까운 숫자 값으로 변환할 수 있다면 어떨까요?

그것을 가능하게 하는 것이 Embedding Vector 입니다. 예를 들어, "개발자"를 Embedding Vector로 변환한 후, "google.com"과 "github.com"을 Embedding Vector로 변환하여 각각 비교했을 때, "github.com"의 Embedding Vector 값이 "개발자"의 Embedding Vector 값과 가장 가깝게 나옵니다. OpenAI, Anthropic 등 AI 벤더들은 텍스트를 Embedding Vector로 변환하는 모델도 다양하게 지원하고 있습니다.

정리하면, 처음 구현은 아래와 같았습니다.

1. 가장 많이 방문한 웹사이트 1000개를 Embedding Vector로 변환하여 Vector DB에 미리 넣어둠
2. 유저가 직업을 입력하면 그걸 Embedding Vector로 변환하고, 1단계에서 만든 Vector DB에서 가장 유사한 웹사이트 20개를 검색함
3. 유저의 직업과 2단계에서 나온 검색 결과를 각각 LLM에 넘겨주어 결과를 생성하게 함

![](./images/posts/2025-04-13-mirror-onboading-llm/embedding-vector-rag-diagram.jpg)

## 처음 시도한 방식의 한계

위 구조에서 가장 중요한 것이 결국 Embedding Vector 검색 결과였는데, 슬프게도 검색 결과의 퀄리티가 좋지 않았습니다. 아래는 "개발자"에 대한 Vector Search 결과입니다.

```json
[
  "https://developer.apple.com",
  "https://developer.android.com",
  "https://ko.react.dev",
  "https://www.jetbrains.com",
  "https://developer.mozilla.org",
  "https://www.data.go.kr",
  "https://school.programmers.co.kr",
  "https://platform.openai.com",
  "https://codingapple.com",
  "https://github.com",
  "https://m.blog.naver.com",
  "https://blog.naver.com",
  "https://calendar.kakao.com",
  "https://n.news.naver.com",
  "https://new.land.naver.com",
  "https://play.google.com",
  "https://www.work24.go.kr",
  "https://section.blog.naver.com",
  "https://www.design.com",
  "https://adsmanager.facebook.com"
]
```

위와 같은 결과의 첫 번째 문제는 유저가 입력한 직업과 관련성이 거의 없는 웹사이트가 높은 순위를 차지했다는 점입니다. 실제로 위 예시에서 `blog.naver.com`이 `github.com`과 비슷한 순위인 것을 볼 수 있습니다.

이것이 당연하게 받아들여지려면 실제로 "개발자"와 관련된 웹사이트가 Vector DB에 별로 없었어야 합니다. 하지만 그렇진 않았습니다. Stack Overflow, W3Schools, MDN, Notion 등 `blog.naver.com` 대신 높은 순위로 나왔어야 할 수많은 웹사이트가 DB에 있었습니다.

두 번째 문제는 결과를 언어에 따라 컨트롤할 수 없다는 점입니다. Mirror 브라우저는 글로벌 유저를 타겟으로 하기 때문에 온보딩에서 다양한 언어로 입력이 일어날 수 있는데, 특정 웹사이트가 어떤 언어로 쓰여졌는지는 Embedding Vector 비교로는 판단할 수가 없습니다. 예를 들어, 영어로 검색했어도 한국 웹사이트가 결과에 포함될 수 있습니다.

또한 한국어로 검색했을 때가 영어로 검색했을 때보다 결과 퀄리티가 훨씬 안좋았는데, 왜냐하면 Embedding Vector 모델들의 다국어 처리 성능이 좋지 않았기 때문입니다. 같은 언어로 적힌 텍스트를 Embedding Vector로 변환하여 비교하는 것 보다, 서로 다른 언어로 적힌 텍스트를 Embedding Vector로 변환하여 비교하는 것이 퀄리티가 더 떨어집니다.

이러한 문제를 개선하기 위해 웹사이트를 Embedding Vector로 변환할 때 넣는 텍스트를 바꿔보았습니다. 이전에는 웹사이트의 URL만 Embedding Vector 변환에 사용한 반면, LLM을 사용해 아래와 같이 웹사이트 각각에 대한 설명을 만들어 Embedding Vector 변환에 함께 사용하도록 수정했습니다.

```json
[
  {
    "url": "https://www.google.com",
    "description": "Google is a web-based search engine that allows users to search for information across the internet using keywords and phrases.",
  },
  {
    "url": "https://www.naver.com",
    "description": "Naver is a South Korean online platform that provides a search engine, news, and various web services including blogs, shopping, and a Q&A platform.",
  },
  // ...
]
```

하지만 이 방식으로는 위의 문제들을 전혀 해결할 수 없었습니다. 게다가 웹사이트 설명을 LLM을 통해 생성했기 때문에, 기껏 RAG를 해놓고선 오히려 위에 설명했던 LLM의 단점을 똑같이 가져가는 꼴이었습니다.

결국 처음으로 돌아와 근본적으로 Embedding Vector를 사용하는 것이 근본적으로 올바른 선택인지부터 고민해보게 되었습니다.

처음에 Embedding Vector를 도입했던 이유는, 텍스트의 관련성을 연산할 수 있다면 당연히 웹사이트와 직업의 관련성 정도는 제 머릿속에 있는 대로 결과가 나올 것이라고 생각했기 때문인데요. 이게 굉장히 안일한 판단이었습니다.

Embedding Vector 모델의 역할은 텍스트가 가진 의미 자체를 수치화하는 것이지, 그 이상의 복잡한 문맥을 고려해주는 역할은 하지 않습니다.

예를 들어, 모델 입장에서 "개발자"는 그냥 "컴퓨터를 다루는 사람" "프로그래밍을 하는 사람" 정도이지, "github.com을 업무 시간에 코드리뷰를 하기 위해 주로 사용하는 사람", "개발하다가 생긴 버그의 해결 방법을 찾기 위해 stackoverflow.com에서 검색하는 사람"이 아니라는 겁니다.

그렇다면 "컴퓨터를 잘 다루는 사람"과 `blog.naver.com`의 관련성이 떨어질 이유가 뭔가요? 물론 제가 모델들의 실제 동작 방식을 정확히 알지는 못하지만, 그냥 Embedding Vector의 정의만 놓고 보면 그렇다는 것이죠.

이걸 깨닫는 과정에서, 인간이 사고를 할 때 사실 굉장히 복잡한 문맥과 경험이 고려되지만 그걸 본인이 자각하진 못한다는 것 또한 깨닫게 되었습니다.

우리가 🍎를 보면 "사과"라고 생각하지, "저것은 빨간 껍질과 초록색 잎을 가진 채소거나 과일이야. 채소라면 토마토일 거고, 과일이라면 사과일거야. 그런데 저렇게 위아래에 굴곡이 있고, 위에 잎 하나만 달려있는 것은 보통 사과니까, 저건 사과야."라고 생각하진 않습니다. 게다가 사과를 처음 학습하는 순간 조차도 "이렇게 생긴게 사과구나"라고 생각하지, 저렇게 복잡하게 생각하지 않습니다.

결과적으로 Embedding Vector는 Mirror 온보딩 구현에는 근본적으로 적합하지 않다고 판단했고, 완전히 다른 구현 방식을 고민하기 시작했습니다.

## 새로운 방식 - 구글 검색

위에서 고려했던 RAG는 LLM이 불확실한 정보를 생성하는 문제를 개선하기 위해 미리 검증된 데이터를 LLM에게 넘기는 방식입니다. 그렇다면 이를 반대로 해서, LLM에게 정보를 생성시킨 후에 검증할 수도 있는 것 아닐까요?

예를 들어, 오늘의 날씨 같은 최신 정보, 회사 내부의 정보 등 학습하지 못한 데이터에 대해 LLM은 당연히 모른다고 하거나 지어내서 답변하기 때문에 후검증이 무의미하지만, 특정 직업과 관련된 유명한 웹사이트에 대한 답변은 충분히 후검증이 가능합니다.

저는 후검증에 휴리스틱하면서도 아주 정확한 방식을 사용했는데, 바로 구글 검색입니다. LLM이 생성한 웹사이트를 구글에 검색했을 때, 검색결과의 맨 위에 있는 웹사이트와 도메인이 일치하다면, 그것이 신뢰할 수 있는 웹사이트라고 판단하는 것입니다.

예를 들어, `github.com`을 구글에 검색했을 때, `github.com`이 검색 결과의 맨 위에 나오므로, 이런 경우 `github.com`은 신뢰하자는 것입니다.

![](./images/posts/2025-04-13-mirror-onboading-llm/google-search-github.png)

이렇게 LLM으로 웹사이트를 생성한 후 후검증하는 방식에는 어떤 장점이 있었을까요?

첫 번째로, 처음에 고려했던 실제 웹사이트 방문 기록을 기반으로 Vector Search를 하는 것 보다 훨씬 정확하고 퀄리티가 좋다는 가장 큰 장점이 있었습니다.

AI 모델은 어떤 데이터를 주로 학습했는지에 따라 양질의 결과를 만들어내는 영역이 다릅니다. 때문에 LLM도 이론적으론 잘못된 정보를 생성할 수는 있지만, 근본적으로 LLM의 학습 기반이 웹이기 때문에 존재하지 않는 웹사이트를 생성하는 경우는 매우 드물 것이라 생각했고, 실제로도 그랬습니다.

또한 LLM은 유저의 언어도 고려하여 답변을 생성하기 때문에, 위에서 해결하지 못했던 언어별 퀄리티 문제도 자연스럽게 해결됩니다. 예를 들어, LLM에게 생활용품을 쇼핑할 수 있는 웹사이트를 알려달라고 할 때, 한국어로 물어보는 경우 쿠팡, G마켓 등 한국의 이커머스 웹사이트를 답변하지만, 영어로 물어보는 경우 아마존, 월마트 등 해외의 이커머스 웹사이트를 답변합니다.

두 번째로, 후검증에 구글 검색을 사용하기 때문에, 위에서 LLM으로 웹사이트의 설명을 생성했던 것과 다르게 아주 정확한 웹사이트의 제목과 설명을 얻을 수 있었습니다. 온보딩을 마치고 세션을 만들 때 웹사이트의 제목이 필요하기 때문에, 이 부분도 아주 중요합니다.

세 번째로, 실제 방문 기록에는 `amazon.de`, `amazon.co.uk` 등 같은 웹사이트에 대해서도 여러 도메인이 포함되어있는 반면, LLM은 거의 `amazon.com`으로만 답변하기 때문에 비교적 일관적인 결과를 만들 수 있었습니다.

따라서 구글 검색으로 후검증을 하는 방식을 채택했습니다.

## 새로운 온보딩 구현

가장 먼저 했던 것은 특정 직업과 관련된 웹사이트를 답변하는 LLM 프롬프트를 작성하는 일이었습니다.

온보딩의 최종 결과물인 세션에는 탭 그룹이라는 개념이 있고, 아래와 같이 서로 관련있는 탭들을 한 장소에 둘 수 있습니다.

![](./images/posts/2025-04-13-mirror-onboading-llm/session-tab-group-example.png)

따라서 LLM에게 단순히 웹사이트 목록만 생성시키는 것이 아니라, 그룹핑된 웹사이트 목록을 생성시켜야 했습니다.

탭 그룹의 이름은 유저가 업무 시에 일상적으로 하는 작업과 관련된 것이 자연스럽다고 판단했고, 아래와 같이 프롬프트를 작성했습니다. (실제 프롬프트는 영어로 되어있고 훨씬 깁니다)

1. 유저가 업무 중에 어떤 웹사이트들을 탭에 열어둘지 생각해라.
2. 그 탭들을 정리할 5개의 탭 그룹이 무엇일지 생각해라. 이름은 최대한 간단하게 지어라.
3. 각 탭 그룹에 들어갈 3개의 웹사이트가 무엇일지 생각해라. 각 웹사이트는 유저의 직업과 밀접하게 관련되어 있어야 한다.

위 프롬프트는 유저의 직업이 "Frontend Developer"일 때 아래와 같은 결과를 생성합니다.

```
Code Review: github.com, gitlab.com, bitbucket.org
Tasks: asana.com, trello.com, monday.com
Documentation: mdn.com, devdocs.io, css-tricks.com
Design Inspiration: dribbble.com, behance.net, awwwards.com
Learning Resources: freecodecamp.org, codecademy.com, udemy.com
```

이제 LLM이 생성한 웹사이트 도메인을 구글 검색을 통해 검증해야 하는데, 구글 검색 페이지를 크롤링하는 것이 아니라 [Custom Search API](https://developers.google.com/custom-search/v1/overview)를 사용하는 방식으로 구현했습니다.

Custom Search API를 사용하면 크롤링하다가 구글에게 블락당할 일이 없고, 크롤링 보다 훨씬 빠른 속도로 검색 결과를 얻을 수 있습니다. 그리고 무엇보다 가장 큰 장점은 [Programmable Search Engine](https://programmablesearchengine.google.com/)이라는 기능을 사용해 검색 결과를 커스텀할 수 있다는 것입니다.

Programmable Search Engine은 나만의 개인화된 검색 엔진을 생성할 수 있게 해주는 기능입니다. 검색 엔진을 하나 생성하여 해당 검색 엔진이 특정 웹사이트만 검색 결과에 포함하게 하거나, 특정 웹사이트는 검색 결과에서 제외하게 하는 등 여러가지 커스텀이 가능합니다. 사실 Custom Search API도 Programmable Search Engine에서 제공하는 API입니다.

저도 온보딩에 사용할 검색 엔진을 하나 만들어서 온보딩 결과의 퀄리티를 떨어뜨릴 수 있는 웹사이트들은 전부 제외시키도록 설정해 두었습니다.

결과적으로 도메인 검증 스크립트는 아래와 같이 간단하게 작성했습니다.

```typescript
const query = input.replace(/\s/g, "");

const result = (await got.get<{ items?: Item[] }>("https://www.googleapis.com/customsearch/v1", {
  searchParams: {
    key: "YOUR_API_KEY",
    cx: "YOUR_SEARCH_ENGINE_ID",
    q: query,
    num: "1",
  },
  responseType: "json",
})).body.items?.[0];

if (result == null) {
  return null;
}

const inputURL = new URL(`https://${query}`);
const searchResultURL = new URL(result.link);

const matched = [
  // google.com == www.google.com
  // microsoft.com/en-us/microsoft-teams == www.microsoft.com/en-us/microsoft-teams/log-in
  (inputURL.host === searchResultURL.host || `www.${inputURL.host}` === searchResultURL.host) && searchResultURL.pathname.startsWith(inputURL.pathname),
  // youtube.com/analytics == analytics.youtube.com
  `${inputURL.pathname.slice(1)}.${inputURL.host}` === searchResultURL.host,
].some((value) => value);

if (matched) {
  return {
    title: result.title,
    url: `${searchResultURL.origin}${searchResultURL.pathname}`,
  };
}

return null;
```

다만 한 가지 문제가 있었는데, Programmable Search Engine을 Custom Search API를 통해 사용하는 경우, 하루에 10000번 밖에 사용하지 못한다는 것이었습니다. 하지만 이는 큰 문제가 되진 않았습니다.

기존 온보딩에서도 유저가 자신의 직업이 선택지에 없는 경우 "기타"를 선택하고 직업을 직접 입력할 수 있었고, 지난 2년간 유저가 직접 입력한 직업을 모두 DB에 쌓아두었습니다.

따라서 그 데이터를 활용해 아래와 같이 검증된 웹사이트 도메인 데이터셋을 미리 만들어둘 수 있었고, 유저가 온보딩을 진행할 땐 Custom Search API를 사용하지 않고 해당 데이터셋을 통해 검증하도록 구현했습니다.

이를 통해 하루 사용 제한 문제를 우회할 수 있었고, 유저들이 온보딩을 더 빠르게 진행할 수 있게 되었습니다. 또한 주기적으로 유저의 온보딩 이벤트를 읽어서 데이터셋을 업데이트 해주면 온보딩 결과의 퀄리티 유지도 가능합니다.

```json
{
  "github.com": {
    "title": "GitHub · Build and ship software on a single, collaborative platform ...",
    "url": "https://github.com/"
  },
  "scholar.google.com": {
    "title": "Google Scholar",
    "url": "https://scholar.google.com/"
  },
  "asana.com": {
    "title": "Manage your team's work, projects, & tasks online • Asana • Asana",
    "url": "https://asana.com/"
  },
  "google.com": {
    "title": "Google",
    "url": "https://www.google.com/"
  },
  // ...
}
```

이렇게 만들어진 것이 현재의 새로운 온보딩입니다. 위에서도 이미 여러번 자랑했지만, 아주 그럴듯하죠? 여러분들은 어떤 직업을 가지고 계신가요? [Mirror 브라우저](https://www.mirror.work/)에서 온보딩을 한번 진행해보세요.

![](/images/posts/2025-04-13-mirror-onboading-llm/frontend-developer-session.png)

## 여담

위에서 Embedding Vector가 Mirror 온보딩에 사용하기엔 어울리지 않았다고 했는데요.

"여행"을 이모지로 어떻게 표현할 수 있을까요? ✈️, 🚗 처럼 교통수단으로 표현할 수도 있고, 여행 국가에 따라서 🇯🇵, 🇨🇦 등 국기로 표현할 수도 있고, 여행 지역의 특징에 따라서 🏝️, ⛰️ 처럼 표현할 수도 있을 것입니다.

"도쿄 여행"을 Embedding Vector로 변환하고, 모든 유니코드 이모지를 Embedding Vector로 변환하여 비교했을 때, 좋은 Embedding Vector 모델을 사용한 경우 "도쿄 여행"과 가장 유사한 이모지는 ✈️, 🇯🇵 같은게 아니라 🗼(도쿄 타워)로 나옵니다.

이 내용과 관련하여 저희 팀 동료가 발표를 한 적이 있는데, 처음 개념을 파악할 때 큰 도움이 되었던 자료이니 여러분도 시간 있으실 때 보시면 좋을 것 같습니다.

<div class="iframe-container">
  <iframe src="https://www.youtube.com/embed/7pRItmvbXLM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
