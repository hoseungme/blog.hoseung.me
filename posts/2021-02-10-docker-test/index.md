---
title: Docker로 테스트 환경 분리하기
date: 2021-02-10T00:00:00+09:00
description: Docker를 사용해 테스트에 필요한 것들을 가상화해봅시다.
tags:
  - 개인 블로그
  - 프론트엔드
  - 백엔드
  - Docker
  - 테스트
---

## Docker란

도커는 컨테이너 기반의 오픈소스 가상화 플랫폼입니다.

가상 머신과의 차이는, 가상 머신은 OS 전체를 가상화하여 실행하지만 도커는 host OS와 자원을 공유하고 필요한 부분만 가상화됩니다.

따라서 가상머신보다 가볍고, 도커만 있다면 환경에 구애받지 않고 컨테이너에 동일한 환경을 가상화하여 일관성있게 작업할 수 있습니다.

예를 들면, 프론트엔드에서 visual regression testing을 할 때 Mac OS에서 스크린샷을 찍어두고, CI에서 가상 브라우저를 실행해서 스크린샷을 찍는다고 해봅시다.

이때, CI 환경이 리눅스거나, 브라우저가 다르거나, 여러 환경 차이 때문에 테스트에 실패할 수 있습니다. 이럴 때 유용한 것이 도커입니다.

컨테이너는 이미지를 사용해서 아주 쉽게 실행할 수 있습니다. 이미지는 컨테이너 실행에 필요한 정보들이 담긴 파일입니다.

또한 DockerFile을 사용해서 나만의 이미지를 빌드해서 컨테이너로 실행할 수 있습니다.

## 목표

테스트 상에서는 실제 MySQL 서버를 사용하지 않고 로컬에서 도커에 올라가있는 MySQL을 사용하도록 만들어보겠습니다.

## 테스트 환경 분리를 위해 필요한 것들

#### 하드코딩 X

우선 코드상에서 MySQL 커넥션을 만들 때, 설정 값들이 하드코딩되어있으면 안됩니다.

아래 사진처럼 환경 변수를 참조하도록 만들어야 상황에 따른 환경 분리가 가능합니다. (프로덕션 배포할 때, 테스트할 때, 개발서버 배포할 때 설정값을 모두 다르게 줄 수 있겠죠) 그리고 깃허브에서 public repository에 올라가있는 경우 이게 보안상으로도 좋습니다.

![](./images/posts/2021-02-10-docker-test/result-1.png)

#### 도커

당연히 이 글에선 도커가 필요합니다. 설치 가이드라인은 구글에 널렸으니 따로 정리하진 않겠습니다. 저는 M1 맥북에어라서 도커 환경구축할 때 고생을 좀 했네요..

#### MySQL

MySQL이 로컬에 설치된 상태여야 합니다. Mac OS 기준으로 Homebrew를 사용하면 간단하게 설치할 수 있습니다.

```
brew install mysql@5.7
```

## MySQL 이미지 받아와서 컨테이너 실행시키기

우선 도커 허브에서 MySQL 이미지를 받아줍시다.
도커 허브는 깃허브와 비슷합니다. 도커 이미지들의 원격 저장소라고 생각하시면 됩니다.

도커 이미지를 내려받을 때는 (이미지 이름):(태그) 형태로 써줘야 하는데, 태그는 이미지의 버전 정도로 생각하시면 됩니다. 태그는 생략이 가능한데, 생략할 경우 기본값은 latest입니다.

MySQL 이미지의 경우 태그가 MySQL 버전과 같습니다.

```
docker pull mysql:5.7
```

그리고 실행도 간단합니다. docker run 명령어로 이미지를 실행할 수 있습니다.

```
docker run --name blog-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=blog -e MYSQL_USER=hsjang -e MYSQL_PASSWORD=password -d mysql:5.7 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

조금 길긴 하지만 스크롤하면서 봐주시고.. 환경변수 값은 바꾸셔도 됩니다.

중요한 옵션을 설명드리면,

- --name: 컨테이너의 별칭입니다. 나중에 컨테이너를 정지하거나 삭제할 때 유용합니다.

- -p: 포트번호입니다. (컨테이너상에서의 포트):(로컬 포트) 형식으로 작성해주시면 됩니다. 위에서는 컨테이너의 3306번 포트가 로컬에서 3306포트로 연결됩니다.

- -e: 환경변수를 설정할 수 있습니다. [여기](https://hub.docker.com/_/mysql)서 Environment variables 가이드를 보시면, MYSQL이 참조하는 특별한 환경변수들에 대한 설명이 나열되어 있습니다.

## Package.json에 test script 추가하기

저는 Mocha를 사용해서 테스트를 실행하는데, Mac OS 기준 아래의 명령어로 테스트를 실행할 수 있습니다.

```json
{
  "scripts": {
    "test": "MYSQL_HOST=0.0.0.0 MYSQL_PORT=3306 MYSQL_USER=hsjang MYSQL_PASSWORD=password MYSQL_DATABASE=blog mocha --require ts-node/register --exit -t 5000 src/**/__test__/*.spec.ts"
  }
}
```

중요한 점은, 위처럼 테스트를 실행하기 전에 환경변수를 설정해줘야 합니다. 왜냐하면 위에서 보신것처럼 process.env를 통해 환경변수를 참조해서 MySQL 설정값들을 얻어와야하기 때문입니다.

그리고 당연히 위에서 MySQL 컨테이너 실행할 때 설정한 값들이랑 맞춰줘야 합니다.

## 결과

결과적으로, 이 글을 따라 도커를 활용하면 실제 프로덕션 환경과 테스트 환경을 분리해서 테스트를 실행할 수 있습니다.

MySQL이나 DynamoDB, Redis같은 것들을 도커로 가상화하면 매우 편리합니다.

![](./images/posts/2021-02-10-docker-test/result-2.png)
