---
title: react-router의 Link를 쓰지 마세요!
date: 2021-12-07
description: react-router의 불필요한 리렌더링 깨부수기
thumbnail: ./thumbnail.png
tags:
  - 프론트엔드
  - React
---

> [react-router](https://github.com/remix-run/react-router) v5를 기준으로 작성되었습니다.

react-router는 React를 사용해서 SPA를 개발하시는 분들이라면 모두 알고계실 거대한 오픈소스 라이브러리입니다.

react-router는 Router, Switch, Route등의 컴포넌트와 편리한 hooks들을 사용해서 손쉽게 라우팅을 구현하고 여러 페이지를 만들 수 있게 해줍니다.

여기서 문제는, react-router에서 내부적으로 사용하는 RouterContext때문에 history change event가 일어날 때마다 계속 리렌더링이 일어난다는 겁니다.

Switch 하위에 있어서 history change가 일어나면 어차피 변경되는 컴포넌트들은 상관이 없지만, Navigation이나 Tab Bar같이 Switch 바깥에 있는 UI 컴포넌트들은 이런 문제에 영향을 크게 받을 수 있습니다.

사실 저는 예전에 작성한 [RxJS로 React 렌더링 성능 개선하기](/2021-10-09-rxjs) 라는 글에서 이미 한 번 react-router의 useLocation, useParams같은 hooks들의 문제를 언급했던 적이 있었습니다.

이 글에서는 그와 동일한 문제를 가진 Link 컴포넌트의 문제에 대해 정리하고, 이를 해결할 수 있었던 과정을 정리해보려고 합니다.

## Link 컴포넌트의 문제

[v5 Link 컴포넌트의 구현](https://github.com/remix-run/react-router/blob/78249eb6ce9a28df4691cc61caa0467fed8b7ac0/packages/react-router-dom/modules/Link.js#L75)을 보면, Link 컴포넌트는 내부적으로 RouterContext의 Consumer입니다.

그리고 RouterContext는 내부적으로 [history change가 일어나면 state를 업데이트](https://github.com/remix-run/react-router/blob/78249eb6ce9a28df4691cc61caa0467fed8b7ac0/packages/react-router/modules/Router.js#L32)하여 모든 Consumer에 리렌더링을 일으킵니다.

따라서 Link 컴포넌트는 history change가 일어날 때마다 항상 리렌더링이 일어나게 됩니다.

위에서도 언급했듯이, Switch / Route 컴포넌트 하위에 있는 컴포넌트라면 어차피 hisotry change가 일어나면 Route가 바뀌기 때문에 큰 문제가 되진 않습니다.

여기서 문제는 아래와 같이 Link를 사용하고 있을 때입니다. (예제의 간소화를 위해 스타일은 모두 생략하겠습니다)

```typescript
function TabBar() {
  return (
    <div>
      <Link to="/">홈</Link>
      <Link to="/shop">쇼핑</Link>
      <Link to="/user">마이페이지</Link>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Switch>/* ... */</Switch>
      <TabBar />
    </Router>
  );
}
```

TabBar 컴포넌트는 history change와 그에 따른 리렌더링에 아무 관련이 없지만, 불필요하게 영향을 받고 있는겁니다.

또한, Link 컴포넌트의 사용을 위해 강제로 Router 밑에 위치하고 있습니다. (Link 컴포넌트가 RouterContext의 Consumer이기 때문)

## 문제 해결

그럼 이 문제를 어떻게 해결할 수 있을까요? 이 글에서 할일은 두 가지입니다.

1. 새로운 커스텀 Link 컴포넌트 만들기
2. TabBar 컴포넌트를 Router 밖으로 빼내기

### 커스텀 Link 컴포넌트 만들기

여기서 제가 말하는 커스텀 Link 컴포넌트란, 아래의 조건을 충족하는 것을 말합니다.

1. react-router의 리렌더링과 전혀 관련이 없어야함.
2. 단, react-router의 Link 컴포넌트와 완전히 똑같이 동작해야함.

이 문제는 사실 굉장히 쉽게 해결이 가능합니다.

우선 react-router의 Link 컴포넌트는 내부적으로 anchor 엘리먼트를 렌더링합니다.

이 때, onClick 이벤트를 가로채서 e.preventDefault로 anchor 엘리먼트의 이벤트를 취소한 후, history를 수정하는 방식으로 구현되있습니다.

```typescript
function Link({ to, ...others }) {
  return (
    <RouterContext.Consumer>
      {() => {
        const handleClick = (e) => {
          e.preventDefault();
          history.push(to);
        };
        return <a {...others} href={to} onClick={handleClick} />;
      }}
    </RouterContext.Consumer>
  );
}
```

따라서 위 구현에서 그냥 RouterContext만 떼어낸 컴포넌트를 만들어서 사용하면 됩니다.

```typescript
interface CustomLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string | LocationDescriptorObject;
  replace?: boolean;
}

const CustomLink = React.memo<CustomLinkProps>((props) => {
  const { to, replace, onClick, children, ...others } = props;

  const href = React.useMemo(() => {
    if (typeof to === "string") {
      return to;
    } else {
      return to.pathname;
    }
  }, [to]);

  const handleClick = React.useCallback<React.MouseEventHandler<HTMLAnchorElement>>(
    (e) => {
      onClick?.(e);

      if (e.isDefaultPrevented()) {
        return;
      }

      e.preventDefault();

      if (replace) {
        history.replace(to);
      } else {
        history.push(to);
      }
    },
    [to, replace, onClick]
  );

  return (
    <a href={href} onClick={handleClick}>
      {children}
    </a>
  );
});
```

여기서 history는 [history 패키지](https://www.npmjs.com/package/history)로부터 만들어진 겁니다.

```typescript
import { createBrowserHistory } from "history";

export const history = createBrowserHistory({});

/* ... */

<Router history={history}>/* ... */</Router>;
```

### TabBar 컴포넌트 빼내기

TabBar 컴포넌트가 위에서 만든 CustomLink 컴포넌트를 사용하도록 바꿔줍시다.

그러면 더이상 Router 컴포넌트 하위에 위치할 필요도 없고, 불필요한 리렌더링도 해결할 수 있게됩니다.

```typescript
function TabBar() {
  return (
    <div>
      <CustomLink to="/">홈</Link>
      <CustomLink to="/shop">쇼핑</Link>
      <CustomLink to="/user">마이페이지</Link>
    </div>
  );
}

function App() {
  return (
    <>
      <Router>
        <Switch>
          /* ... */
        </Switch>
      </Router>
      <TabBar />
    </>
  );
}
```

혹시나 react-router의 다른 컴포넌트들이나 hooks에도 의존하고 있어서 빼내기가 힘들다면, React.memo 라도 적용해주는게 좋습니다.

그러면 Router 컴포넌트의 자식 컴포넌트는 리렌더링이 일어나더라도, 그 하위에 있는 컴포넌트들의 불필요한 리렌더링은 막을 수 있습니다.

## NavLink 컴포넌트는요?

NavLink는 Link와 다르게 activeClassName, activeStyle 같은 옵션을 추가적으로 지원합니다.

내부적으로 현재 location을 검사해서, 현재 location과 NavLink의 to prop이 동일할 경우, activeClassName, activeStyle이 적용되게 되는겁니다.

NavLink 컴포넌트도 Link 컴포넌트처럼 커스텀 NavLink를 따로 만들어주면 됩니다.

이 때, useLocation 같은 hooks 없이 어떻게 location change를 검사할 수 있을까요?

history.listen을 사용하면 리렌더링 없이 이 문제를 해결할 수 있습니다.

```typescript
function CustomNavLink({ to, className, activeClassName, style, activeStyle, ...others }) {
  const [active, setActive] = React.useState(() => {
    return window.location.pathname === to;
  });

  React.useEffect(() => {
    const unlisten = history.listen((location) => {
      setActive(location.pathname === to);
    });

    return () => unlisten();
  }, [to]);

  return (
    <CustomLink
      {...others}
      to={to}
      className={active ? `${className} ${activeClassName ?? ""}` : className}
      style={active ? { ...(activeStyle ?? {}), ...style } : style}
    />
  );
}
```

다만 여기서 문제점은, 개발자가 activeClassName나 activeStyle을 props로 넘기지 않았다면 history.listen을 등록할 필요가 없다는 겁니다.

이런 경우엔 그냥 컴포넌트를 두 개로 나누면 됩니다. React hooks는 조건부로 실행될 수 없지만, 컴포넌트를 조건부로 렌더링하는건 가능하죠.

만약 activeClassName, activeStyle이 넘어오지 않은 경우, 바로 CustomLink를 렌더링하면 됩니다.

```typescript
function CustomNavLink({ activeClassName, activeStyle, ...others }) {
  if (activeClassName || activeStyle) {
    return <CustomNavLinkWithActiveState {...others} activeClassName={activeClassName} activeStyle={activeStyle} />;
  }

  return <CustomLink {...others} />;
}
```

## 마무리

react-router처럼 정말 많은 분들이 사용하시는 거대한 오픈소스여도, "이건 왜 이렇게 구현되있는거지?" 라는 의문이 생길 때가 있네요.

최근 회사에서 이러한 리렌더링 이슈를 해결하는 작업에 많은 시간을 쏟았는데, 이런 문제들은 해결법을 찾는 것보다도 이슈가 있다는걸 알아차리는게 더 어려운 것 같네요.

마치 검증이 되어 보이는 오픈소스라도, 내부 구현도 적당히 찾아보고 다른 오픈소스들과도 유심히 비교해보는 자세가 필요한 것 같습니다.
