---
title: "디바이스에 딱 맞는 이미지 제공하기 - srcset, sizes, 실시간 이미지 리사이징"
date: 2023-04-02T00:00:00+09:00
description: "다양한 크기의 디바이스에 유연하게 대응하는 방법은 무엇일까요?"
thumbnail: ./thumbnail.png
tags:
  - 프론트엔드
  - 백엔드
---

웹에 접근할 수 있는 디바이스는 정말 다양하고, 디바이스 각각의 화면 크기와 해상도도 천차만별입니다.

또한 우리가 웹을 통해 제공하는 컨텐츠의 종류도 정말 다양한데요. 그 중 가장 대표적인 것은 이미지라고 할 수 있습니다. 그럼 그 수많은 디바이스들에 대해 어떤 이미지를 제공해야 할까요?

큰 이미지를 화면이 작은 디바이스에 사용하기엔 유저 입장에서 불필요하게 큰 다운로드 비용이 생기는 것이고, 반대로 작은 이미지를 화면이 큰 디바이스에 사용하기엔 다운로드 비용은 적지만 화질이 떨어질 것입니다.

큰 이미지는 화면이 큰 디바이스에, 작은 이미지는 화면이 작은 디바이스에 제공하는 것, 즉 디바이스 화면 크기에 맞춰 이미지를 제공하는게 가장 좋을 것입니다.

그럼 이때 디바이스의 화면 크기 별로 제공할 이미지는 어떻게 준비해두면 좋을까요? 이미지 하나가 추가될 때마다 모든 경우의 수를 고려해 이미지를 뽑아 업로드해둬야 할까요? 그러기엔 우리의 업무 비용도 아깝고, 이미지를 업로드할 저장소 비용도 아깝습니다.

예를 들어, 유저가 업로드한 이미지를 데스크탑 용과 모바일 용으로 각각 리사이징하여 업로드 해뒀는데, 정작 그 이미지는 데스크탑 유저들만 조회했다면? 모바일 용으로 업로드한 이미지는 저장소 공간만 차지한 셈이 될 것입니다.

즉, 하나의 이미지를 준비해둔 후, 실제로 요청이 들어온 시점에 해당 디바이스의 화면 스펙에 따라서 동적으로 리사이징하여 제공하는 것이 효율적입니다. 또한 한 번 리사이징한 이미지를 오랜 시간 캐싱해둔다면, 비용을 더 아낄 수 있을 것입니다.

따라서 이 글에서 다뤄볼 주제는 아래와 같습니다.

- 올바른 이미지 제공을 위한 배경지식
  - 디스플레이 해상도와 픽셀 밀도
  - CSS 상의 픽셀과 물리적 픽셀의 차이
- 디바이스 해상도에 맞는 이미지를 제공하는 방법
  - `img` element의 `srcset`, `sizes` attribute
- 필요한 시점에 이미지를 동적으로 리사이징하는 방법
  - AWS의 Lambda와 CloudFront를 사용해 이미지 리사이징 서버 구성하기

또한 이 과정을 통해 아래의 결과를 얻을 수 있습니다.

- 유저들의 이미지 다운로드 비용 절약
- 이미지 화질이 떨어지지 않는 경험 좋은 웹 제공
- 이미지 저장소 비용 절약

# 디스플레이 해상도와 픽셀 밀도

해상도는 대상이 몇 개의 픽셀로 이루어져 있는지 나타내는 값입니다. `가로 픽셀 수 * 세로 픽셀 수` 형태로 표현됩니다.

화면 해상도가 높은 디바이스 일수록 더 많은 것들을 화면에 그려낼 수 있을 것입니다. 그렇다면 양이 아닌 질로 간다면 어떨까요? 같은 것이라도 더 선명하고 정밀하게, 즉 좋은 화질로 그려내려면 무엇이 중요할까요?

예를 들어, 화면 해상도가 `400 * 400`인 디바이스 A, `800 * 800`인 디바이스 B가 있고, A와 B의 화면 크기는 같다고 가정해봅시다.

이때 `800 * 800`의 해상도를 가진 이미지를 화면 전체에 그렸을 때, 더 화질이 좋은 디바이스는 무엇일까요?

이미지의 해상도에 비해서, A의 화면 해상도는 낮기 때문에 이미지를 온전히 표현할 수 없습니다. 하지만 B의 화면 해상도는 이미지와 동일하기 때문에, 이미지를 온전히 표현할 수 있습니다.

이렇게 같은 면적에 얼마나 많은 픽셀이 밀집되어 있는지를 픽셀 밀도라고 하고, 픽셀 밀도는 PPI라는 단위로 표현합니다. PPI는 Pixels Per Inch, 즉 1 인치당 몇 픽셀을 표현할 수 있는지를 나타내는 단위입니다.

아래 사진이 좋은 예시입니다. 더 높은 PPI를 가진 화면 위에서 그려진 오른쪽 원이 더 정밀하게 그려지는 것을 확인할 수 있습니다.

![](./compare-circle.png)

# 디바이스의 픽셀과 CSS의 픽셀

제가 사용하고 있는 아이폰 12는 `1170 * 2532`의 해상도와 460PPI의 매우 높은 픽셀 밀도를 가지고 있습니다.

그런데 Chrome 브라우저에서 확인해 봤을 때, iPhone 12의 해상도는 `390 * 844`로, 실제 해상도 대비 매우 낮게 표현됩니다. 왜 그럴까요?

그 이유는, 모던 브라우저는 PPI가 높은 디바이스에 대해, CSS 1 픽셀을 그리기 위해 디바이스의 물리적 픽셀 여러개를 사용하기 때문입니다. 그리고 그 물리적 픽셀이 몇 개인지를 Device Pixel Ratio, 줄여서 DPR이라고 부릅니다.

아이폰 12의 DPR은 3으로, 아이폰 12에서 CSS 1 픽셀을 그리기 위해서는 물리적 픽셀 3개가 필요하다는 뜻입니다. CSS 상의 해상도인 `390 * 844`에 DPR을 곱하여 보면 실제 해상도인 `1170 * 2532`가 나옵니다.

따라서 웹에서 이미지를 렌더링할 때에는, 이미지의 실제 크기에 DPR을 반영해줘야 합니다. 아이폰 12를 예시로 들면, CSS 상에서 가로 100 픽셀로 이미지를 렌더링할 때, 실제로 사용되는 픽셀 수는 300이 되므로, 가로 300 픽셀의 해상도를 가진 이미지를 사용해야 화질이 저하되지 않습니다.

여담으로, JavaScript에서는 [window.devicePixelRatio](https://developer.mozilla.org/ko/docs/Web/API/Window/devicePixelRatio)를 통해 DPR 값을 가져올 수 있습니다.

Github의 [custom-device-emulation-chrome](https://github.com/amirshnll/custom-device-emulation-chrome) 레포지토리에는 디바이스 별로 해상도와 DPR 정리가 잘 되어있어, 개발자 도구에서 모바일 디바이스를 새로 추가할 때 편리합니다.

# 디바이스 해상도에 맞는 이미지 제공하기

배경지식을 둘러봤으니 본론으로 돌아와, 디바이스 해상도에 맞춰 올바른 크기의 이미지를 제공하는 방법을 알아봅시다.

`img` element에는 `sizes`와 `srcset`이라는 attribute가 있는데요. 이 두 attribute를 잘 명시하여 브라우저가 올바른 이미지를 선택해 렌더링하도록 만들 수 있습니다.

`sizes`는 `img` 엘리먼트가 렌더링 될 CSS 상의 크기를 명시하는 attribute입니다. 이때 크기를 여러개 명시하여 조건에 따라 다르게 선택되도록 만들 수 있습니다.

`srcset`는 렌더링될 이미지들을 명시하는 attribute입니다. 브라우저는 `sizes`나 DPR 값에 따라서 명시된 이미지들 중 하나를 선택하여 렌더링합니다.

위와 같은 단순 설명으로는 이해하기가 힘든 개념들이라, 예제를 통해서 알아봅시다.

## 이미지 크기에 맞춰 선택되게 하기 - srcset의 w descriptor와 sizes

`img` element가 렌더링될 크기에 따라 올바른 이미지가 선택되도록 만드는 방법은, `srcset`에 이미지들을 명시할 때 `w` descriptor를 사용하여, 명시한 이미지 각각의 크기를 브라우저에게 알려주는 것입니다.

`w` descriptor로 이미지의 물리적 가로 픽셀 수를 명시하고, 명시한 이미지 각각은 콤마로 구분합니다.

```html
<img srcset="300w.png 300w, 600w.png 600w, 900w.png 900w" />
```

이때 위처럼 `sizes`가 명시되지 않은 경우, 브라우저는 `100vw`를 기준으로 이미지를 선택합니다.

예를 들어, `100vw`가 300 픽셀이고, DPR이 2인 디바이스에서는 아래와 같이 `600w.png`가 렌더링됩니다.

![](./300px-2x-600w-example.png)

디바이스의 `100vw`인 300 픽셀이 CSS 상의 픽셀이고, DPR이 2이므로, 렌더링에 가장 적합한 600w.png가 선택된 것입니다.

그럼 `sizes`를 명시한다면 어떻게 될까요?

```html
<img srcset="300w.png 300w, 600w.png 600w, 900w.png 900w" sizes="350px" />
```

이 경우에는 `sizes`가 `350px`로 고정되어 있으므로, 디바이스의 viewport width가 아닌 DPR에 따라 이미지가 정해집니다.

똑같이 DPR이 2인 디바이스라고 가정했을 때 아래와 같이 `600w.png`가 선택됩니다.

![](./300px-2x-600w-example.png)

이때, DPR이 2인 상황에서 CSS 350 픽셀을 화질 저하 없이 렌더링하기 위해서는 물리적 700 픽셀이 필요합니다.

그럼에도 물리적 100 픽셀이 부족한 `600w.png`가 선택된 것을 보면, 브라우저가 이미지 선택에 고려하는 것이 화질 말고도 훨씬 많다는 점을 알 수 있습니다. 이는 사용자의 설정, 디바이스의 네트워크 대역폭 등 브라우저 구현에 따라 천차만별일 것 같습니다.

위 예시의 경우엔 `900w.png`를 불러왔을 때 생기는 상황을 고려했을 때, `600w.png`를 사용했을 때 생기는 물리적 100 픽셀 만큼의 화질 손실은 감수할 만하다는 결정을 내린 것이겠죠.

이제 한 가지만 더 알고 가면 되는데, `sizes`를 명시할 때는 CSS의 Media Query를 활용하여 브라우저가 조건에 따라 크기를 선택하도록 할 수 있습니다. `srcset`에 이미지들을 나열할 때처럼 콤마로 구분하여 나열합니다.

```html
<img
  srcset="300w.png 300w, 600w.png 600w, 900w.png 900w"
  sizes="(max-width: 700px) 300px, (max-width: 1000px) 600px, 900px"
/>
```

이번엔 예시를 조금 바꿔서, 디바이스의 DPR을 1이라고 가정해 보겠습니다.

만약 디바이스의 viewport width가 500px인 경우, `(max-width: 700px)`의 조건에 걸리기 때문에, 선택되는 사이즈는 `300px`입니다. 따라서 아래와 같이 `300w.png`가 렌더링됩니다.

![](./300px-1x-300w-example.png)

그리고 디바이스의 viewport width가 800px, 1200px인 경우, 각각 `600px`, `900px`의 사이즈가 선택되어 아래와 같이 `600w.png`, `900w.png`가 렌더링되겠죠.

![](./600px-1x-600w-example.png)

![](./900px-1x-900w-example.png)

## 디바이스 DPR에 맞춰 선택되게 하기 - srcset의 x descriptor

복잡한 반응형 요구사항 없이, 단순히 고정된 크기에 대해 DPR만 처리하고 싶은 경우가 있을 것입니다. 그 경우가 바로 위에서 `sizes`를 `350px`로 고정했었던 예시와 같은데요.

이 경우에는 아래와 같이 `x` descriptor를 사용해 `srcset`에 이미지들을 나열하면 됩니다.

```html
<img srcset="300w.png 1x, 600w.png 2x, 900w.png 3x" width="300px" />
```

위는 `img` element의 CSS 상의 가로 크기를 300 픽셀로 고정해두고, DPR에 따라 이미지가 선택되도록 하는 예제입니다.

디바이스의 DPR이 1인 경우 `300w.png`, 2인 경우 `600w.png`, 3인 경우 `900w.png`가 선택됩니다.

`w` descriptor와 `sizes`를 사용하는 것 보다 사용법이 훨씬 간단하니, 본인의 코드베이스에 따라 둘 중 적합한 것을 선택하여 사용하시면 될 것 같습니다.

## srcset의 브라우저 호환성 챙기기

caniuse라는 사이트에서 [srcset](https://caniuse.com/?search=srcset)의 호환성에 대해 확인해보면 지원 현황이 매우 좋습니다.

하지만 여전히 `srcset`이 지원되지 않는 브라우저를 위해 `src`는 꼭 추가해줍시다.

```html
<img
  srcset="300w.png 1x, 600w.png 2x, 900w.png 3x"
  width="300px"
  sizes="(max-width: 700px) 300px, (max-width: 1000px) 600px, 900px"
  src="300w.png"
  alt="300w image"
/>
```

# 이미지 리사이징 서버 만들기

> 백엔드 주제에 관심이 없으신 분들은 `여담 - Next.js` 파트로 가주시면 됩니다.

`srcset`에 나열할 이미지들을 모두 준비하여 저장소에 미리 업로드해두는 방식보단, 필요에 따라 동적으로 리사이징하여 제공하는 것이 팀의 업무 비용이나 이미지 저장소 비용상 훨씬 저렴할 것입니다.

AWS와 Node.js 환경을 기반으로 이미지 리사이징 서버를 만들어 보겠습니다.

## 인프라 설계

먼저 제가 필요로 하는 것들은 아래와 같습니다.

1. HTTP API를 구성할 수 있고, 요청한 건에 대해서만 요금을 부과하는 Serverless 서비스
2. 이미지 리사이징 결과를 반영구적으로 캐싱해둘 CDN

1번을 충족하는 서비스는 [Lambda](https://docs.aws.amazon.com/ko_kr/lambda/latest/dg/welcome.html)입니다. Lambda는 인자로 event 객체를 받는 함수를 생성할 수 있는 서비스인데, 함수 하나는 AWS 내의 수많은 서비스에 연결되어 실행될 수 있습니다. 또한 어떤 서비스가 Lambda 함수를 실행했냐에 따라 다른 event 객체가 넘어옵니다.

이전까지는 [API Gateway](https://docs.aws.amazon.com/ko_kr/apigateway/latest/developerguide/welcome.html)라는 서비스를 사용해 HTTP API를 구성하여 Lambda 함수를 연결했지만, 이제는 Lambda 내부적으로 [Function URL](https://docs.aws.amazon.com/ko_kr/lambda/latest/dg/lambda-urls.html)이라는게 생겨서, API Gateway를 사용하지 않고 매우 간단히 Lambda 함수를 실행시키는 HTTP 엔드포인트를 만들 수 있습니다.

2번을 충족하는 서비스는 [CloudFront](https://docs.aws.amazon.com/ko_kr/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)입니다. CloudFront에는 오리진이라는 개념이 있는데, 오리진은 실제로 요청을 받아 처리하여 응답하는 주체입니다. 여기서 CloudFront는 오리진에게 요청을 전달하고, 오리진이 응답한 결과를 캐싱해두는 역할을 합니다.

따라서 제가 해야할 일은, Lambda 함수를 만들어 이미지 리사이징 코드를 업로드하고, 해당 함수의 Function URL을 CloudFront의 오리진으로 연결하는 것입니다.

## Lambda 함수 생성

Lambda 함수 생성과 Function URL 생성 모두 [Serverless Framework](https://www.serverless.com/)를 사용해 정말 쉽게 할 수 있습니다. 이때 `serverless.yml`이라는 설정 파일 작성이 필요한데, [이 가이드](https://www.serverless.com/framework/docs/providers/aws/guide/functions)를 참고하시면 됩니다.

간단히 `/hello-world`로 요청이 들어오면 응답하는 함수를 만들어 보겠습니다.

```typescript
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const { http } = event.requestContext;

  if (http.method === "GET" && http.path === "/hello-world") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Hello, world!",
      }),
    };
  }

  return {
    statusCode: 404,
    body: JSON.stringify({
      message: "Not found",
    }),
  };
}
```

Function URL을 통해 함수를 실행한 경우, event 객체는 [API Gateway Proxy Payload 2.0](https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html#urls-payloads)과 똑같이 넘어오기 때문에 event 타입을 `APIGatewayProxyEventV2`로 잡았습니다.

`serverless.yml`은 아래와 같이 작성해 주었습니다. `ap-northeast-2` 리전(서울)에 Node.js 18.x 런타임에서 실행되는 `image-optimize` Lambda 함수를 생성하고, 그 함수의 Function URL도 생성하라는 뜻입니다.

```yml
service: image-optimize-lambda

provider:
  name: aws
  runtime: nodejs18.x
  region: ap-northeast-2

functions:
  image-optimize:
    handler: dst/index.handler
    url: true
```

생성된 Lambda Function URL로 실제로 요청을 보내보면, `/hello-world`로 들어온 요청에 대해 `"Hello, world!"` message를 응답합니다.

![](./lambda-hello-world-example.png)

## 이미지 리사이징 코드 작성

Lambda에서 이미지 리사이징을 하기 위해서는 두 가지 라이브러리가 필요한데요.

1. 이미지를 다운로드하기 위한 HTTP client 라이브러리
2. 다운로드 받은 이미지를 리사이징하기 위한 이미지 처리 라이브러리

HTTP client 라이브러리로는 [axios](https://axios-http.com/)가 유명하고, 이미지 처리 라이브러리로는 [sharp](https://sharp.pixelplumbing.com)가 유명합니다.

두 라이브러리를 활용하여 아래와 같이 정말 간단하게 이미지를 리사이징할 수 있고, 화질 조정까지 가능합니다.

아래는 다운로드 받은 PNG 이미지를 200 \* 200 크기로 리사이징 하고, 화질을 기존 대비 50% 수준으로 만드는 예제입니다.

```typescript
const imageURL = "https://example.com/image.png";
const { data } = await axios.get(imageURL, {
  responseType: "arraybuffer",
});
await sharp(data)
  .resize({ fit: "fill", width: 200, height: 200 })
  .toFormat("png", { quality: 50 })
  .toFile("resized.png");
```

위 예제에서 imageURL, widht, height, quality만 쿼리 파라미터로 받아서 처리하면 리사이징 서버는 완성됩니다.

이때 `metadata()` 메소드를 사용하여 format, width, height 등 원본 이미지에 대한 정보를 얻을 수 있는데, 이를 활용하여 코드를 작성해주면 됩니다.

```typescript
const { url } = event.queryStringParameters;

const { data } = await axios.get(decodeURIComponent(url), {
  responseType: "arraybuffer",
});

const image = sharp(data);
const metadata = await image.metadata();

const { w } = event.queryStringParameters;
const width = parseInt(w);

if (metadata.width > width) {
  image.resize({ fit: "fill", width });
}

// ...
```

전체 예제 코드는 [여기](https://github.com/HoseungJang/blog.hoseung.me-example/tree/main/2023-03-25-provide-fit-image/image-optimizer-lambda)로 들어가시면 확인하실 수 있고, 결과적으로 아래와 같이 요청하도록 만들었습니다.

```
/optimize-image?url={이미지URL}&w={가로크기}&h={세로크기}&q={화질(optional)}
```

## CloudFront와 Lambda Function URL 연결하기

이제 위에서 Lambda 함수와 함께 생성한 Function URL을 CloudFront와 연결해줘야 합니다.

CloudFront 콘솔에서 배포를 생성하려고 하면, 오리진의 도메인을 입력하는 필드가 있습니다.

거기에 위에서 생성했던 Lambda Function URL을 넣어주고, `뷰어 일치`를 선택해주면 오리진 연결은 끝납니다.

![](./create-cloudfront-distribution-origin.png)

그리고 `캐시 키 및 원본 요청` 섹션으로 내려보면 `캐시 정책`과 `원본 요청 정책`을 설정할 수 있는데요.

![](./create-cloudfront-distribution-default-cache-policy.png)

`캐시 정책`이 지금은 캐싱을 하지 않는다는 기본값으로 되어있는데요. 제가 원하는 것은 리사이징 결과물을 반영구적으로 캐싱해두는 것이기 때문에, 정책을 새로 생성할겁니다.

`정책 생성`을 누르고, `image-optimizer-cache`로 이름을 설정한 후, TTL을 모두 31536000초로 설정하여, 1년 동안 응답이 캐싱되도록 설정했습니다.

![](./create-cache-policy-ttl.png)

이때 아래로 스크롤하면 `캐시 키 설정`이라는 것이 보이는데, `쿼리 문자열`을 `모두`로 설정해주어야 쿼리 파라미터가 캐싱 기준에 포함됩니다.

만약 `쿼리 문자열`을 `모두`로 설정하지 않으면, 쿼리 파라미터가 다른 요청끼리 같은 응답을 하게 되는데, 제 이미지 리사이징 서버는 쿼리 파라미터 값에 의존하고 있으므로 그렇게 되면 큰 일이 납니다.

`원본 요청 정책`은 기본값인 `AllViewerExceptHostHeader`를 유지해줍시다. 헤더, 쿠키, 쿼리 파라미터 모두 오리진에 전달한다는 정책입니다.

이제 `배포 생성` 버튼을 누르고 조금 기다리면, 배포와 연결된 도메인으로 요청을 보낼 수 있습니다. 이제 Lambda Function URL 도메인이 아니라, CloudFront 배포의 도메인으로 요청을 보내면 됩니다.

## 테스트

테스트로 제 블로그 글 중 하나인 [AWS Lambda의 동작 원리 - 전역 변수가 유지될까?](https://blog.hoseung.me/2022-02-27-lambda-global-variables)의 썸네일을 리사이징 해보겠습니다.

![](./test-original-thumbnail.png)

썸네일의 기본 크기가 현재 832 \* 512로 나오는데요. 이를 절반 줄여서 416 \* 256 크기로 렌더링 해보겠습니다.

이미지 리사이징 서버로 아래와 같이 요청을 보내면 될겁니다. (썸네일 URL이 길어서 글에서는 썸네일이라고 쓰겠습니다)

```
/optimize-image?url=썸네일&w=416&h=256
```

![](./test-resized-thumbnail.png)

결과는 위 사진처럼 성공적으로 리사이징되어 내려왔습니다. 이때 CloudFront에 캐싱된 응답을 받은 것인지를 확인하려면, 응답 헤더에서 `x-cache`의 값이 `Hit from cloudfront`인지 확인하면 됩니다.

![](./test-response-headers.png)

# 여담 - Next.js

Next.js를 사용하시는 경우, [빌트인 Image 컴포넌트](https://nextjs.org/docs/basic-features/image-optimization)를 사용하시면 원본 이미지를 내부적으로 리사이징하여 `srcset`으로 제공합니다.

이때 내부적으로 [빌트인 optimizer](https://github.com/vercel/next.js/blob/c8a5bd5ebaa7572f941dd6e8fb5ecd836b146e9f/packages/next/src/server/image-optimizer.ts#L398)를 사용하게 되는데, 이 방식은 CDN의 장점이 없고, 팀 니즈에 따라 커스텀도 어렵습니다.

따라서 [loader prop](https://nextjs.org/docs/api-reference/next/image#loader)을 사용하여 커스텀 이미지 리사이징 서버를 직접 연결하는 것이 좋을 것 같습니다.

# 레퍼런스

- `srcset`, `sizes` attribute
  - [반응형 이미지 - MDN](https://developer.mozilla.org/ko/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- AWS Lambda
  - [Lambda 개념](https://docs.aws.amazon.com/ko_kr/lambda/latest/dg/gettingstarted-concepts.html)
  - [Lambda URL](https://docs.aws.amazon.com/ko_kr/lambda/latest/dg/lambda-urls.html)
- AWS CloudFront
  - [CloudFront 배포에 다양한 원본 사용](https://docs.aws.amazon.com/ko_kr/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html)
  - [쿼리 문자열 기반의 콘텐츠 캐싱](https://docs.aws.amazon.com/ko_kr/AmazonCloudFront/latest/DeveloperGuide/QueryStringParameters.html)
  - [캐시 정책 이해](https://docs.aws.amazon.com/ko_kr/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-understand-cache-policy)
