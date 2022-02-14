---
title: Github Actions와 env-cmd 패키지로 React에서 현재 커밋의 해쉬값 접근하기
date: 2021-01-13
description: React 배포에 버전을 부여한 과정을 정리합니다.
tags:
  - 프론트엔드
  - React
---

회사에서 변동이 (거의) 없는 응답 데이터에 대해 client-side caching을 적용하기로 하였습니다.

cache key의 포맷은 아래와 같이 정했습니다.

```
{RELEASE_VERSION}/{OPERATION_ID}/{STRINGIFIED_REQUEST_PARAMETERS}
```

- RELEASE_VERSION: 프로덕션에 배포될 때마다 부여되는 키 -> 새롭게 배포된 버전에서는 이전 버전에서 캐시된 내용들을 무시하기 위함
- OPERATION_ID: (예시) getPostList, createUserInfo 같은 API ID
- STRINGIFIED_REQUEST_PARAMETERS: request parameters 객체를 JSON.stringify()로 변환한 문자열

그런데, 여기서 RELEASE_VERSION을 어떻게 할지가 고민이었습니다.

1. API를 몇개 만든다 -> 요청을 보내지 않으려고 캐싱하는건데, 저걸 얻으려고 API를 만드는건 당연히 알맞지 않은 답이라고 생각했고, 오히려 배포할 때마다 create (혹은 update)하고, 웹에 접속할 때마다 read하는 요청을 받아야 할테니 비효율적일거라서.. 패스
2. 파일을 하나 만들고, 개발자들이 배포할 때마다 값을 바꿔준다 -> 음.. 이런 단순 노가다(?)는 마음에 들지 않기 때문에 패스
3. github actions workflow 내에서 환경변수를 사용해서 무언가 한다 -> 생각해보니 배포할 때마다 얻을 수 있는 고유한 키는 commit hash를 가져다 쓰면 될거고, github actions에서 분명히 현재 commit의 hash값에 접근할 수 있을 거라고 생각했습니다. 개발자는 키 부여에 신경쓸 필요 없이 CI/CD 단계에서 알아서 해주는게 역시 베스트라고 생각했습니다.

그래서 3번으로 결정하게 되었습니다.

## github actions workflow에서 commit hash 접근

github actions는 workflow 설정 파일(.yml)에서 환경 변수를 설정해줄 수 있습니다.

```yml
env:
  변수_이름: 변수_값
```

그리고 [github context](https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#github-context)를 통해서 현재 commit hash값을 가져올 수 있습니다.

github actions에서 [context란](https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#contexts) workflow 실행 정보, workflow, job, step에 설정된 환경변수값 등에 접근하는 방법입니다.

결과적으로, 아래와 같이 설정해 주었습니다.

```yml
# deploy.yml

env:
  REACT_APP_RELEASE_VERSION: ${{ github.sha }} # github.sha를 통해 가져올 수 있음
```

## env-cmd

[env-cmd](https://www.npmjs.com/package/env-cmd)는 node.js로 실행되는 프로세스에 환경변수를 주입해주는 도구입니다.

- example.js

```javascript
// example.js
console.log(process.env.MESSAGE);
```

- .env

```
MESSAGE=hello
```

위와 같이 js파일과 .env파일을 만들어주고, 아래의 명령어를 입력해줍시다.

```
env-cmd -f .env node example.js
```

그러면 콘솔에 hello가 출력됩니다.

## 구현

위에서 언급한 대로 환경변수를 설정하고 env-cmd를 설치해준 후, workflow의 steps중에 리액트 앱을 빌드하는 단계에서 아래 명령어를 추가해주었습니다.

```yml
echo REACT_APP_RELEASE_VERSION=$REACT_APP_RELEASE_VERSION >> .env
```

이렇게 해주면 .env 파일의 맨 끝에 REACT_APP_RELEASE_VERSION=현재 커밋 해쉬값 으로 내용이 추가됩니다.

그리고 env-cmd를 사용해서 react-scripts build 명령어에 환경 변수를 넘겨주면 됩니다.

```
env-cmd -f .env react-script build
```

리액트 코드상에서는 대략 아래와 같이 사용하면 됩니다.

```typescript
const cacheVersion = process.env.REACT_APP_RELEASE_VERSION;

cache.set(`${cacheVersion}/${operationId}/${JSON.stringify(params)}`, response);
```
