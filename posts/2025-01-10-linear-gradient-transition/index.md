---
title: linear-gradient에 transition animation 적용하기
date: 2025-01-10T00:00:00+09:00
description: CSS transition이 적용되지 않는 linear-gradient에 JavaScript로 직접 transition을 적용해봅시다. 색 모델, 색 공간 등 기본적인 개념도 알아봅시다.
tags:
  - 프론트엔드
---

CSS에는 특정 속성의 값 변화가 점진적으로 일어나도록 만들 수 있는 transition 속성이 있습니다. 아래는 background 속성의 값을 1초에 걸쳐 변화시키는 예시입니다.

```css
transition: background 1s;
```

다만, CSS transition은 모든 값에 대해 적용되지는 않습니다. 대표적인 예시가 이 글에서 다룰 linear-gradient 입니다. linear-gradient background는 transition을 걸어두더라도 적용되지 않습니다.

따라서 JavaScript로 직접 두 linear-gradient 사이의 transition을 구현해야 합니다. 이를 위해 먼저 linear-gradient의 구성 요소가 무엇인지, 어떻게 화면에 그려지는 것인지를 먼저 알아봅시다.

# linear-gradient의 구성 요소

linear-gradient는 gradient line이라는 중심 축과, gradient line 위의 특정 지점의 색을 정하는 두 개 이상의 color stop point로 이루어집니다. 그리고 gradient line을 수직으로 교차하는 연속된 직선을 그려서 렌더링합니다.

![](./images/posts/2025-01-10-linear-gradient-transition/linear-gradient-composition-1.jpeg)

이때 gradient line을 회전시킬 수 있는데, 그 경우 아래와 같은 형태가 됩니다.

![](./images/posts/2025-01-10-linear-gradient-transition/linear-gradient-composition-2.jpeg)

여기서 각각의 color stop point을 지나는 직선들은 색이 이미 정해져있지만, 그 사이를 채우는 직선들의 색은 어떻게 구하는 걸까요?

# 색 모델과 색 공간, 그리고 Interpolation

두 수가 있을 때, 그 사이에 있는 수를 구하는 것은 아주 간단합니다. 하지만 색은 사칙연산이 가능한 수적인 개념이 아닙니다.

따라서 두 색 사이에 있는 색을 구하기 위해선 먼저 색을 수로 표현할 방법이 필요하고, 그 방법을 정의한 것을 색 모델이라고 합니다.

대표적인 색 모델이 우리에게 익숙한 RGB입니다. 예를 들어, `RGB(0, 0, 0)`과 `RGB(200, 200, 200)`의 중간에 있는 색은 `(0 + 200) / 0.5 = 100` 이므로 `RGB(100, 100, 100)`이라는 것을 계산해낼 수 있습니다.

이처럼 시작점과 끝점(두 color stop point)을 알고 있고, 각 점의 값(색 모델로 표현된 값)을 알고 있을 때, 두 점 사이에 위치한 값을 구하는 것을 interpolation이라고 합니다. linear-gradient도 똑같은 방식으로 두 color stop point 사이의 색을 채웁니다.

하지만 이때 색 모델을 통해 표현된 값으로는 실제로 특정한 색을 렌더링할 수는 없습니다. 색 모델은 단순히 색을 숫자로 표현하는 방식만을 정의하는 것이고, 그 값이 물리적으로 어떤 색으로 디스플레이에 보여질지는 색 공간이라는 개념이 결정하기 때문입니다.

아래는 RGB 색 모델을 따르는 색 공간인 sRGB, Adobe RGB 두 가지를 비교하는 예시입니다.

![](./images/posts/2025-01-10-linear-gradient-transition/srgb-vs-adobe-rgb.jpg)

위 사진을 보면 sRGB에서 표현 가능한 색의 범위와 Adobe RGB에서 표현 가능한 색의 범위가 다르다는 것을 알 수 있습니다.

즉, 같은 RGB 값이더라도 sRGB에서 보여지는지, Adobe RGB에서 보여지는지, 또는 다른 RGB 색 공간에서 보여지는지에 따라 다른 색으로 보여지게 되는 것입니다.

그럼 웹 브라우저는 색 렌더링에 어떤 색 공간을 사용할까요?

# 웹 브라우저의 색 공간

웹 브라우저는 sRGB를 사용하지만, linear-gradient에서 두 color stop point 사이의 interpolation에는 OKLab이라는 색 공간을 사용합니다. 물론 sRGB 또는 다른 색 공간을 사용하도록 지정해줄 수 있습니다. 아래는 red, blue 사이를 sRGB로 채운 것과, OKLab으로 채운 것을 비교하는 예시입니다.

![](./images/posts/2025-01-10-linear-gradient-transition/linear-gradient-interpolation-srgb-vs-oklab.png)

sRGB를 사용해 두 색 사이를 채운 것은 색이 강렬해서 다소 어색하고 피로하게 느껴지지만, OKLab을 사용해 두 색 사이를 채운 것은 sRGB에 비해 조금 더 부드럽고 자연스럽게 느껴집니다.

이러한 차이는 sRGB는 RGB 색 모델을 따르지만, OKLab는 Lab라는 색 모델을 따른다는 점에서 기인합니다.

# RGB vs Lab

인간의 눈은 파란색, 빨간색 보다 초록색을 더 밝게 인식합니다. 또한 밝은 색보다 어두운 색의 변화를 더 민감하게 인식합니다. 예를 들어, 밝은 회색과 흰색의 차이에 비해, 어두운 회색과 검정색의 차이를 더 잘 느낍니다.

RGB는 이러한 인간의 색 인식을 고려하지 않은 모델이기 때문에 R, G, B 각각이 똑같은 수치로 변합니다. 따라서 같은 수치의 변화여도 R, G, B 각각에 대한 인간의 눈의 민감도가 다르기 때문에, 우리가 느끼는 색 차이가 달라집니다.

반면 Lab는 인간의 색 인식을 고려하여 설계된 모델로, L(밝기), a(Red-Green), b(Blue-Yellow) 세 가지 값으로 이루어집니다. 밝기와 색 정보를 분리함으로써 인간의 눈이 느끼는 색 차이가 균일하도록 보정해주는 모델입니다.

따라서 Lab가 색 변화를 더 자연스럽게 보이도록 하므로, Lab로 만든 그라데이션이 RGB보다 더 자연스럽게 느껴지는 것입니다.

# 두 linear-gradient 사이의 interpolation 구현

이로써 색에 대한 기본 개념 정리는 끝났고, 두 linear-gradient 사이의 interpolation을 실제로 구현해봅시다.

먼저 공통으로 사용할 util function부터 추가해줍시다.

```typescript
function clamp(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function inverseInterpolate(from: number, to: number, value: number) {
  return (value - from) / (to - from);
}

clamp(10, 0, 5); // 5
interpolate(5, 10, 0.5); // 7.5
inverseInterpolate(5, 10, 7.5); // 0.5
```

그리고 linear-gradient의 가장 최소 단위인 색을 다루기 위해 `Color`, `RGB`, `OKLab` class를 추가했습니다.

```typescript
class Color {
  public readonly coords: [number, number, number];
  public readonly alpha: number;
  // ...
}

class RGB extends Color {
  // ...
}

class OKLab extends Color {
  // ...
}

const red = new RGB([255, 0, 0], 1); // rgba(255, 0, 0, 1)
const black = new RGB([0, 0, 0], 1); // rgba(0, 0, 0, 0)
```

그리고 두 색 사이를 채우기 위한 `interpolate` 메소드, RGB와 OKLab간 자유로운 변환을 위한 `toOKLab`, `toRGB` 메소드를 추가했습니다.

```typescript
red.interpolate(black, 0.5); // rgba(127.5, 0, 0, 0)
red.toOKLab().toRGB();
```

그리고 이번 글의 주인공인 linear-gradient를 다루기 위한 `LinearGradient` class를 추가했습니다.

```typescript
class LinearGradient {
  public readonly angle: number;
  public readonly colorStops: [RGB, number][];

  // ...
}

// linear-gradient(45deg in oklab, rgba(65, 88, 208, 1) 0%, rgba(200, 80, 192, 1) 50%, rgba(255, 204, 112, 1) 100%)
const gradient = new LinearGradient({
  angle: 45,
  colorStops: [
    [new RGB([65, 88, 208], 1), 0],
    [new RGB([200, 80, 192], 1), 0.5],
    [new RGB([255, 204, 112], 1), 1],
  ],
});
```

이제 두 linear-gradient 사이를 채우는 구현을 할 차례입니다.

먼저 linear-gradient의 구성요소 중 변화할 수 있는 것은 gradient line의 각도와 color stop point 각각의 위치, 개수, 색입니다.

각도의 변화를 반영하는 것은 두 각도 사이의 차이를 계산하면 되므로 간단하고, color stop point의 변화를 반영하는 것도 각도에 비해서는 다소 까다롭긴 하지만 생각보다 간단합니다.

예를 들어, 아래와 같이 0%, 30%, 60%, 100% 위치에 color stop point를 가진 linear-gradient에서, 0%, 50%, 100% 위치에 color stop point를 가진 linear-gradient로 변경한다고 해봅시다.

![](./images/posts/2025-01-10-linear-gradient-transition/linear-gradient-color-stop-point-change1.png)

이때, From에는 30%, 60% 위치에 color stop point가 있지만 To에는 없고, To에는 50% 위치에 color stop point가 있지만 From에는 없습니다.

From의 50% 위치에 있는 색이 무엇인지 알아야 To의 50% 위치에 있는 색과 비교하여 interpolation을 할 수 있고, To의 30%, 60% 위치에 있는 색이 무엇인지 알아야 From의 30%, 60% 위치에 있는 색과 비교하여 interpolation을 할 수 있습니다.

다시말해, 두 linear-gradient가 가지고 있는 모든 color stop point의 위치를 합치는 과정이 먼저 진행되어야 한다는 뜻입니다. 0%, 30%, 50%, 60%, 100% 위치에 있는 색이 무엇인지 From, To 모두에서 계산해야 합니다.

![](./images/posts/2025-01-10-linear-gradient-transition/linear-gradient-color-stop-point-change2.png)

그리고 이는 꽤 간단히 구현할 수 있습니다. linear-gradient에서 gradient line의 특정 위치의 색이 무엇인지 구하는 `color` 메소드를 `LinearGradient` class에 추가해줬습니다.

```typescript
class LinearGradient {
  // ...
  public color(point: number) {
    const nearestRightColorStopIndex = this.colorStops.findIndex((colorStop) => colorStop[1] >= point);
    if (nearestRightColorStopIndex < 0) {
      return this.colorStops[this.colorStops.length - 1][0];
    }

    const nearestRightColorStop = this.colorStops[nearestRightColorStopIndex];
    const nearestLeftColorStop = this.colorStops[nearestRightColorStopIndex - 1];
    if (nearestRightColorStop[1] === point || !nearestLeftColorStop) {
      return nearestRightColorStop[0];
    }

    return nearestLeftColorStop[0]
      .toOklab()
      .interpolate(
        nearestRightColorStop[0].toOklab(),
        inverseInterpolate(nearestLeftColorStop[1], nearestRightColorStop[1], point)
      )
      .toRGB();
  }
}

const gradient = new LinearGradient({
  angle: 0,
  colorStops: [
    [new RGB([255, 0, 0], 1), 0],
    [new RGB([0, 0, 255], 1), 1],
  ],
});

gradient.color(0); // rgba(255, 0, 0, 1)
gradient.color(0.5); // rgba(140, 83, 162, 1)
gradient.color(1); // rgba(0, 0, 255, 1)
```

여기서 가장 중요한 부분은 RGB와 OKLab간의 변환입니다. 이는 위에서 설명한 대로 두 color stop point 사이를 OKLab으로 채우는 것을 따를 것이기 때문에 필요한 과정입니다.

그냥 RGB로만 계산했다면 `gradient.color(0.5)`의 결과는 `rgba(127.5, 0, 127.5, 1)`이겠지만, OKLab으로 변환하는 과정이 있었기에 중간값이 달라지는걸 볼 수 있습니다.

이제 이 `color` 메소드를 사용하여 `interpolate` 메소드만 `LinearGradient` class에 추가하면 두 linear-gradient 사이의 interpolation을 할 수 있습니다.

```typescript
class LinearGradient {
  // ...
  public interpolate(to: LinearGradient, progress: number) {
    return new LinearGradient({
      angle: interpolate(this.angle, to.angle, progress),
      colorStops: Array.from(
        new Set([...this.colorStops.map(([, point]) => point), ...to.colorStops.map(([, point]) => point)])
      ).map((point) => [this.color(point).interpolate(to.color(point), progress), point]),
    });
  }
}
```

# 두 linear-gradient 사이의 transition 구현

두 linear-gradient 사이의 interpolation을 구현했으니, 그걸 사용해 transition만 구현하면 이 글의 목표를 달성할 수 있습니다.

이때, JavaScript에서 transition 등의 animation을 구현할 때 가장 기본으로 알아야 하는 것이 있는데, 바로 `requestAnimationFrame`입니다.

웹 브라우저의 초당 프레임은 60이고, 이는 약 16 밀리초 마다 렌더링을 할 수 있다는 뜻입니다. 하지만 무거운 연산을 요구하는 CSS 속성을 남용하거나, JavaScript 코드를 잘못 작성하는 등 브라우저가 렌더링을 제때 하지 못하는 상황을 만들어 초당 프레임이 60보다 많이 낮아지는 경우, 웹사이트가 버벅이게 됩니다. 그리고 이러한 현상을 다들 아시다시피 프레임 드랍이라고 합니다.

따라서 JavaScript로 animation을 구현할 땐, 다음 프레임의 렌더링을 시작하기 전에 실행되는 것을 보장해주는 기능이 필요한데, 그 역할을 `requestAnimationFrame`이 해줍니다.

아래는 1초 fade in을 `requestAnimationFrame`으로 구현하는 간단한 예제입니다. 이렇게 하면 다음 프레임의 렌더링을 시작하기 전에 opacity 수정이 완료되므로, 프레임 드랍이 발생하지 않게 됩니다.

```javascript
const element = document.getElementById("id");
const duration = 1000;
let progress = 0;
let prevTimestamp = null;

function animate() {
  requestAnimationFrame((timestamp) => {
    progress = progress + (prevTimestamp ? timestamp - prevTimestamp : 0) / duration;
    element.style.opacity = progress.toString();

    if (progress < 1) {
      prevTimestamp = timestamp;
      animate();
    }
  });
}

animate();
```

이제 linear-gradient transition 적용을 위한 `LinearGradientElement` class를 추가해줍시다.

```typescript
interface TransitionFrameContext {
  prevTimestamp?: number;
  from: LinearGradient;
  to: LinearGradient;
  duration: number;
  easing?: (x: number) => number;
  progress: number;
}

type TransitionOptions = Pick<TransitionFrameContext, "duration" | "easing">;

class LinearGradientElement {
  private readonly element: HTMLElement;
  private current: LinearGradient;
  private frameId: number | null = null;

  constructor(target: HTMLElement, background: LinearGradient) {
    this.element = target;
    this.current = background;
    this.set(background);
  }

  public set(to: LinearGradient) {
    this.cancelFrame();
    this.current = to;
    this.element.style.background = to.css();
  }

  public interpolation(from: LinearGradient, to: LinearGradient, progress: number) {
    this.cancelFrame();
    this.set(from.interpolate(to, progress));
  }

  public transition(to: LinearGradient, options: TransitionOptions) {
    this.cancelFrame();
    this.requestFrame({
      from: this.current,
      to,
      duration: options.duration,
      easing: options.easing,
      progress: 0,
    });
  }

  private requestFrame(context: TransitionFrameContext) {
    this.frameId = requestAnimationFrame((timestamp) => {
      context.progress = clamp(
        context.progress + (context.prevTimestamp ? timestamp - context.prevTimestamp : 0) / context.duration,
        0,
        1
      );

      this.current = context.from.interpolate(context.to, context.easing?.(context.progress) ?? context.progress);
      this.element.style.background = this.current.css();

      if (context.progress < 1) {
        context.prevTimestamp = timestamp;
        this.requestFrame(context);
      }
    });
  }

  private cancelFrame() {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
  }
}
```

이제 아래와 같이 사용하면 linear-gradient에 transition을 적용할 수 있습니다.

```typescript
const from = new LinearGradient({
  angle: 0,
  colorStops: [
    [new RGB([0, 219, 222], 1), 0],
    [new RGB([252, 0, 255], 1), 1],
  ],
});

const to = new LinearGradient({
  angle: 45,
  colorStops: [
    [new RGB([65, 88, 208], 1), 0],
    [new RGB([200, 80, 192], 1), 0.5],
    [new RGB([255, 204, 112], 1), 1],
  ],
});

// https://easings.net/ko#easeInOutQuart
function easeInOutQuart(x: number): number {
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

const element = new LinearGradientElement(document.getElementById("id"), from);

element.transition(to, {
  duration: 2000,
  easing: easeInOutQuart,
});
```

<div class="iframe-container">
  <iframe src="https://www.youtube.com/embed/aoQHgdpKXk8?si=bwaISTHYXJsROD9v" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>

이렇게 animation을 실행하는 것 외에도, `interpolate` 메소드를 활용해 스크롤 비율에 따라 변화를 적용하는 등 다양한 use case를 커버할 수 있게 만들었습니다.

```typescript
const containerRect = container.getBoundingClientRect();
const scrollRate = clamp((window.innerHeight - containerRect.top) / containerRect.height, 0, 1);
element.interpolate(from, to, scrollRate);
```

# 마무리

사실 이번 글에서 다룬 내용은 [linear-gradient-element](https://github.com/hoseungme/linear-gradient-element)라는 오픈소스로 이미 올려두었습니다.

이 작업을 시작하게된 계기는 회사에서 랜딩 페이지를 작업하다가 스크롤 위치에 따라 linear-gradient를 바꿔야 하는 니즈가 생겨서였어요.

그래서 linear-gradient interpolation 구현체가 이미 널려있을 줄 알고 찾아봤는데 딱히 없었습니다. 여러 블로그를 봐도 다들 그냥 두 linear-gradient를 겹쳐서 렌더링한 다음에 opacity만 바꾸는 식으로 만드셨더라구요.

그래서 사실 그냥 귀찮았던거지 구현이 어려운건 아니었으니까 제가 직접 만들게 되었답니다. 전체 구현이 궁금하신 분들은 구경하셔도 좋을 것 같아요.

회사 랜딩페이지에 적용한 것 자랑하는 영상으로 글 마무리 하겠습니다.

<div class="iframe-container">
  <iframe src="https://www.youtube.com/embed/K9RbLqnLxlc?si=a0eqzLyNkNaDK6Ab" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>
