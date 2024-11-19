---
title: Docker로 React 애플리케이션 배포하기
date: 2021-05-11T00:00:00+09:00
description: Docker로 어드민 웹을 로컬에 배포하고 사용하기
tags:
  - 개인 블로그
  - 프론트엔드
  - React
  - Docker
---

## 어드민 웹 배포

지금까진 누가 접근하더라도 문제가 없는 공용 웹만 개발해서 배포했었지만, 어떤 서비스의 어드민을 직접 배포해보는건 처음이었습니다.

따라서 고민을 많이 해보다가 내린 결정이 "Docker로 로컬에 컨테이너를 실행시켜서 배포하자"였습니다.

그 이유는, 어차피 어드민이 더 추가될 일도 없고, 오직 저만 사용해야 하는 웹을 비용아깝게 AWS 세팅해서 퍼블릭으로 배포할 필요가 있을까 싶었기 때문입니다.

그래서 비용도 아끼고, 보안도 지키기 위해 Docker를 선택했습니다. 필요에 따라 간편하게 run/stop도 할 수 있고.. 로컬에서 뭔가 하기엔 정말 최적이라는 생각이 들었습니다.

## 정적 웹 서버

Dockerfile을 작성하기 전에, 빌드된 리액트 애플리케이션을 사용하기 위한 정적 웹 서버가 필요합니다.

그래서 [create-react-app 문서](https://create-react-app.dev/docs/deployment/#static-server)에 나오는 [serve](https://www.npmjs.com/package/serve)를 사용하기로 했습니다.

명령어 한줄로 정말 간단하게 build 디렉토리를 제공할 수 있습니다.

```
serve -s build
```

## Dockerfile 작성

Dockerfile은 도커 이미지를 빌드하기 위해 작성하는 파일입니다.

우선 작성한 Dockerfile을 보여드리면:

```
FROM node:14.15.4

RUN npm install -g serve

RUN mkdir ./build
COPY ./build ./build

ENTRYPOINT ["serve", "-s", "build"]
```

각각의 명령어를 설명드리면,

- FROM: 사용할 기본 이미지를 지정
  - ubuntu, node 같은 이미지를 지정할 수 있습니다.
- RUN: 명령어를 실행시킴
  - 위의 경우, "npm install -g serve"를 실행합니다.
- COPY: 호스트의 파일/디렉토리를 컨테이너로 복사함
  - 위의 경우, 호스트의 ./build 디렉토리의 내용을 컨테이너의 ./build로 복사합니다.
- ENTRYPOINT: 컨테이너가 실행될 때 실행할 명령어 지정
  - 위의 경우, 컨테이너가 실행될 때마다 "serve -s build"를 실행합니다.

Dockerfile 명령어는 [여기](https://ghwlchlaks.github.io/dockerfile-instruction)에 잘 정리되어 있어서 참고했습니다.

## 이미지 빌드

Dockerfile을 사용한 이미지 빌드는 docker build 명령어로 할 수 있습니다.

우선 Dockerfile이 위치한 디렉토리로 이동해줘야 하고, 아래의 명령어를 입력했습니다.

```
docker build -t blog-admin-front
```

-t는 이미지에 태그를 지정하는 옵션인데, 지정해주면 이미지에 id 말고 태그로도 접근할 수 있습니다.

## 컨테이너 실행

이미지를 컨테이너로 실행하려면 docker run 명령어를 사용하면 됩니다.

```
docker run --name blog-admin-front -d -p 5000:5000 blog-admin-front
```

이번엔 옵션이 많네요. 하나씩 설명드리면:

- --name: 컨테이너에 별칭을 붙여줍니다.
  - 컨테이너에 접근할 때 id 말고 지정한 별칭으로 접근할 수 있게됩니다.
- -d: 컨테이너를 백그라운드로 실행합니다.
- -p: 호스트의 포트와 컨테이너의 포트를 묶어줍니다.
  - 80:8080으로 설정했다고 가정하면, 호스트에서 80번 포트를 통해 컨테이너의 8080번 포트에 접속할 수 있게됩니다.
  - serve의 default port가 5000이어서 5000:5000으로 설정했습니다.

명령어 맨 뒤에있는 blog-admin-front는 위에서 Dockerfile로 생성했던 이미지입니다.

## package.json에 script 추가하기

모든 명령어를 알아봤으니, npm script 한번만 입력하면 배포할 수 있도록 script를 추가해줬습니다.

```json
{
  "start:container": "docker run --name blog-admin-front -d -p 5000:5000 blog-admin-front",
  "clear:container": "docker rm -f blog-admin-front",
  "build:docker": "docker build -t blog-admin-front .",
  "build": "react-scripts build",
  "deploy": "run-s clear:container build start:container"
}
```

run-s는 [npm run all](https://www.npmjs.com/package/npm-run-all)이 제공하는 npm script를 순서대로 실행시켜주는 명령어입니다.

최초 1회만 npm run build:docker를 실행해서 이미지를 빌드해주고, 그 뒤부턴 npm run deploy만 입력하면 알아서 리액트 앱을 빌드하고 컨테이너를 실행시켜 배포해줍니다.

## 결과

localhost:5000에 접속해보면 잘 되는걸 확인할 수 있습니다.

![](./images/posts/2021-05-11-react-docker/result.png)
