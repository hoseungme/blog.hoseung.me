---
title: RxJS로 React 렌더링 성능 개선하기
date: 2021-10-09T00:00:00+09:00
description: react-router를 사용할 때 생길 수 있는 성능 문제를 RxJS로 개선해봅시다.
thumbnail: ./thumbnail.png
tags:
  - 프론트엔드
  - React
---

React를 사용하는 프론트엔드 개발자들에게 주어지는 가장 기본적인 과제는 과도한 리렌더링이 일어나지 않도록 코드를 짜는 것이라고 생각합니다.

하지만 우리가 방심한 사이에 생각지도 못한 곳에서 불필요한 렌더링이 일어나곤 합니다. 특히 내부 구현을 확실하게 모르는 코드를 가져다 사용할 때 이런 문제가 더 발생하는 것 같습니다.

오늘은 react-router를 사용할 때 생겼던 문제와, 결과적으로 RxJS를 도입해 개선했던 과정을 정리해보려 합니다.

## react-router를 사용할 때의 문제

> react-router v5 기준의 코드를 예시로 활용합니다.

react-router를 사용하시는 분들이라면 useLocation, useParams 등등 react-router에서 제공되는 hook들을 많이 사용하실겁니다.

그 중 useLocation에서 시작해서 react-router의 내부 구조를 간단히 파헤쳐 봅시다.

### 내부 구조 파헤치기

```javascript
export function useLocation() {
  if (__DEV__) {
    invariant(typeof useContext === "function", "You must use React >= 16.8 in order to use useLocation()");
  }

  return useContext(RouterContext).location;
}
```

RouterContext의 location 값을 return하는걸 볼 수 있습니다. 그럼 이제 RouterContext의 Provider를 렌더링하는 Router를 확인해봅시다.

```javascript
class Router extends React.Component {
  /* 생략 */

  constructor(props) {
    super(props);

    this.state = {
      location: props.history.location,
    };

    /* 생략 */

    if (!props.staticContext) {
      this.unlisten = props.history.listen((location) => {
        if (this._isMounted) {
          this.setState({ location });
        } else {
          this._pendingLocation = location;
        }
      });
    }
  }

  /* 생략 */

  render() {
    return (
      <RouterContext.Provider
        value={{
          history: this.props.history,
          location: this.state.location,
          match: Router.computeRootMatch(this.state.location.pathname),
          staticContext: this.props.staticContext,
        }}
      >
        <HistoryContext.Provider children={this.props.children || null} value={this.props.history} />
      </RouterContext.Provider>
    );
  }
}
```

constructor를 보시면, history에 listener를 등록해서 history가 변경될 때마다 location state를 업데이트해주는 것을 볼 수 있습니다.

정리하자면, useLocation을 사용하는 모든 컴포넌트는 RouterContext의 Consumer가 되고, 따라서 RouterContext.Provider의 value가 변경될 때마다 리렌더링이 일어납니다.

### 그래서 문제가 뭔데?

위의 내용을 읽으시면서 제가 말하려는 문제가 history가 변경될 때마다 일어나는 리렌더링이라는걸 눈치채셨을 겁니다.

이 때 아래와 같은 질문이 나올 수 있을텐데,

> 어차피 Switch 하위에 있는 컴포넌트들은 history change가 일어날 때마다 변경되는데, 그럼 영향이 없는거 아닌가요?

위의 질문처럼 성능 문제가 없을 수도 있습니다. 하지만 모든 컴포넌트가 Switch 하위에 존재하는 것은 아닙니다.

Navigation, Tab Bar같은 일반적으로 Switch 바깥에 존재하는 컴포넌트들은 불필요한 영향이 있을 수 있습니다.

```typescript
return (
  <Router>
    <Navigation />
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
    </Switch>
    <TabBar />
  </Router>
);
```

## 내가 마주한 문제

위에서 react-router에서 발생할 가능성이 있는 성능 문제를 간단한 예시를 통해 알아보았습니다.

이번엔 제가 마주했던 문제를 정리해보려고 합니다.

### 현재 성별 정보를 return하는 useGender hook

우선 저는 이커머스 회사에 다니고 있고, 저희의 웹사이트는 페이지가 성별을 가질 수 있도록 설계되었습니다. 그리고 성별을 가지는 페이지의 경우, pathname의 맨 앞에 아래와 같이 성별이 들어갑니다.

```
/women
/women/browse
/men/categories/:categoryId
...
```

그리고 현재 페이지의 성별 값을 useGender hook을 사용해서 가져오는데, 구현은 대략 아래와 같습니다.

> 지금부터 나오는 모든 예시는 필자가 임의로 핵심만 요약한 코드이고, 실제 코드와는 다릅니다.

```typescript
function useGender() {
  const { getLastViewedGender } = useContext(GenderContext);
  const { gender } = useParams();

  return gender ?? getLastViewedGender();
}
```

설명드리자면, 현재 페이지의 성별 정보를 pathname에서 가져오고, 성별이 없는 페이지인 경우, GenderContext의 getLastViewedGender로 session storage에서 가장 마지막으로 봤던 성별 정보를 return하는 간단한 hook입니다.

이 때 useGender에는 2가지 문제가 있었습니다.

1. 성별 정보가 똑같더라도 history만 변경되면 무조건 리렌더링이 일어납니다. (useParams도 history가 변경될 때마다 리렌더링을 일으킵니다)
2. getLastViewedGender()의 return value는 어차피 useParams에서 나오는 gender와 똑같습니다. (현재 보고있는 페이지의 성별 정보가 당연히 가장 최근에 본 성별 정보니까요)

1번 문제는 아래와 같은 상황에 성능 문제를 일으킬 수 있습니다.

1. 유저가 성별이 women인 페이지에서 똑같이 성별이 women인 페이지로 이동했다.
2. 유저가 성별이 없는 페이지에서 똑같이 성별이 없는 페이지로 이동했다.

2번 문제는 결국 애초에 useParams를 사용할 필요가 없다는 것을 의미합니다.

즉, useParams의 잘못된 사용으로 인해 불필요한 리렌더링을 일으키는 것이 useGender의 문제입니다.

## RxJS 활용 예시

해결 과정을 정리하기 전, RxJS를 리액트에서 활용하는 패턴을 간단한 예시를 통해 알아봅시다.

counter hook을 만들어 보겠습니다.

```typescript
const observable = new BehaviorSubject(0);

function useCount() {
  const [count, setCount] = useState(() => observable.value);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (value) => setCount(value),
    });
    return () => subscription.unsubscribe();
  }, []);

  return count;
}
```

전역에 [BehaviorSubject](https://rxjs.dev/api/index/class/BehaviorSubject)로 observable을 만들어 주었습니다.

그리고 useState를 사용해서 observable의 현재 value를 React state로 가져와 주었습니다.

지금 부터가 중요한데, observable을 구독해서 특정 이벤트가 발생했을 때 실행될 콜백을 등록할 수 있습니다.

그걸 위에서 useEffect에서 해주고 있습니다. next는 observable의 value를 업데이트하는 이벤트이고, 해당 이벤트가 발생했을 때 새로운 value를 setCount로 넘겨주는 콜백을 등록해 주었습니다.

따라서 어디선가 아래와 같이 observable의 value를 변경하면,

```typescript
observable.next(1);
```

그 변경이 전파되어 useCount를 사용하는 모든 곳에서 setCount가 실행되고, count가 업데이트되어 리렌더링이 일어나게 됩니다.

이것이 위에서 정리했던 useGender의 문제를 해결하기 위해 사용할 패턴입니다.

## 해결 과정

우선 useParams의 사용을 useGender에서 없애버릴 필요가 있습니다. 그러려면 우선 last viewed gender를 session storage의 값이 아니라 React state로 가져올 필요가 있습니다.

### 전역에 observable 선언

우선 전역에 gender 값이 담길 observable을 선언하고, 그걸 활용한 getter, setter를 GenderContext에 넘겨주었습니다.

```typescript
const observable = new BehaviorSubject(window.sessionStorage.getItem("lastViewedGender"));
```

```typescript
function GenderContextProvider({ children }) {
  const value = React.useMemo(() => {
    return {
      getLastViewedGender: () => {
        return observable.value;
      },
      setLastViewedGender: (gender) => {
        window.sessionStorage.setItem("lastViewedGender", gender);
        observable.next(gender);
      },
    };
  }, []);

  return <GenderContext.Provider value={value}>{children}</GenderContext.Provider>;
}
```

### Switch에서 last viewed gender를 update

useGender에서 useParams로 성별 정보를 가져올게 아니라, route match 시점에 last viewed gender를 update하고, useGender에선 그것만 return 해주면 됩니다.

```typescript
function RouteSwitch() {
  /* 생략 */
  return (
    <Switch>
      <Route
        path="/:gender"
        render={({ match }) => <Renderer gender={match.params.gender ?? null} component={<Main />} />}
      />
    </Switch>
  );
}
```

```typescript
function Renderer({ gender, component }) {
  const { setLastViewedGender } = useContext(GenderContext);

  useEffect(() => {
    if (!gender) {
      setLastViewedGender(gender);
    }
  }, [gender]);

  return component;
}
```

이제 Renderer가 현재 페이지가 성별을 가지는 경우 setLastViewedGender를 통해 observable을 업데이트합니다.

### useGender에서 observable을 subscribe

```typescript
function useGender() {
  const [gender, setGender] = useState(() => observable.value);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (value) => setGender(value),
    });
    return () => subscription.unsubscribe();
  }, []);

  return gender;
}
```

이제 useGender를 사용하는 곳에서는 history가 바뀌면 무조건 리렌더링이 일어나는게 아니라, 실제로 lastViewedGender 값이 바뀌었을 때만 리렌더링이 일어납니다.

## 마무리

RxJS를 도입해서 코드를 짜는 것 자체는 그렇게 어려운 일이 아니었지만, 렌더링 문제가 있다는 것을 파악하고, 무엇이 문제인지 정의하고, 어떻게 해결할 것인지 이야기하는 과정이 의미가 컸던 작업이었다고 생각합니다.

이번 작업을 통해 내가 작성한 코드가 어떤 일을 일으킬지에 대해 조금 더 신중하게 생각하고, 다양한 use case를 고려하는 태도를 가지게 된 것 같습니다.
