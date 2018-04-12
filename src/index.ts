import bind from "bind-decorator";

export const linear = (x: number) => x;
export const ease = (x: number) => 0.5 - Math.cos(x * Math.PI) / 2;
export const easeIn = (x: number) => 1 - Math.cos(x * Math.PI / 2);
export const easeOut = (x: number) => 1 - Math.sin(x * Math.PI / 2);
export const elasticOut = (x: number) =>
  1 -
  Math.cos(8 * x ** 2 * Math.PI) * (Math.cos(x * Math.PI) * 0.05 + 0.95) ** 40;
export const elasticIn = (x: number) => flip(elasticOut)(x);
export const bounceOut = (x: number) =>
  1 -
  Math.abs(Math.cos(10.9956 * x ** 2)) *
    (Math.cos(x * Math.PI) * 0.05 + 0.95) ** 30;
export const BounceIn = (x: number) => flip(bounceOut)(x);
export const overshootIn = (x: number, s = 1.70158) =>
  x ** 2 * ((s + 1) * x - s);
export const overshootOut = (x: number) => flip(overshootIn)(x);
export const sharpIncline = (v: number) => (x: number) =>
  0.5 -
  ((1 + v ** 2) / (1 + v ** 2 * Math.cos(x * Math.PI) ** 2)) ** 0.5 *
    Math.cos(x * Math.PI) /
    2;

export const flipX = (f: NumericFunction) => (x: number): number => 1 - f(x);
export const flipY = (f: NumericFunction) => (x: number): number => f(1 - x);
export const flip = (f: NumericFunction) => (x: number): number =>
  flipX(flipY(f))(x);
export const mergeCurves = (
  f1: NumericFunction,
  f2: NumericFunction,
  f3: NumericFunction = ease
) => (x: number): number => f1(x) * flipX(f3)(x) + f2(x) * f3(x);
const mergeCurveToLine = (angle: number, curve: NumericFunction) =>
  mergeCurves((n: number) => Math.tan(angle) * n, curve);

const isNatural = (x: number) => !isNaN(x) && x > 0 && x % 1 === 0;
const isWhole = (x: number) => isNatural(x) || x === Infinity || x === 0;

export interface animation {
  duration?: number;
  easing?: NumericFunction;
  loop?: number;
  alternate?: boolean;
  start?: number;
  target?: number;
}

export interface NumericFunction {
  (x: number): number;
}

export interface Renderer {
  (value: number, details: animationResolution): any;
}

export interface animationOptions {
  duration: number;
  easing: NumericFunction;
  loop: number;
  alternate: boolean;
  start: number;
  target: number;
}

export interface ResolveFunction {
  (returns: Animation): void;
}

export interface RejectFunction {
  (reason?: any): void;
}

export interface PromiseFunctions {
  resolve: ResolveFunction;
  reject: RejectFunction;
}

export interface validatedAnimation extends animationOptions {
  promise: PromiseFunctions;
  fn: Renderer;
  startTime: number;
  iterations: number;
}

export interface animationResolution {
  deltaTime?: number;
  percentTime?: number;
  value?: number;
  percentValue?: number;
  deltaValue?: number;
  tangent?: number;
}

export default class Animation {
  _paused: boolean = true;
  _queue: validatedAnimation[] = [];
  _tangent: number = 0;
  _deltaTime: number = 0;
  _deltaValue: number = 0;
  _defaults: animationOptions;
  _nextFrame: number = -1;
  _pauseTime: number = 0;

  constructor(defaults: animation) {
    this._defaults = Object.assign(
      {
        duration: 300,
        easing: linear,
        loop: 0,
        alternate: false,
        start: 0,
        target: 1
      },
      defaults
    );
  }

  @bind
  _nextStep() {
    const currentAnimation = this._queue[0];
    const result: animationResolution = {};
    result.deltaTime = Date.now() - currentAnimation.startTime;
    result.percentTime = Math.min(
      result.deltaTime / currentAnimation.duration,
      1
    );
    if (currentAnimation.iterations % 2 === 1 && currentAnimation.alternate) {
      result.percentValue = flipY(currentAnimation.easing)(result.percentTime);
    } else {
      result.percentValue = currentAnimation.easing(result.percentTime);
    }
    result.deltaValue = result.percentValue * currentAnimation.target;
    result.value = result.deltaValue + currentAnimation.start;
    this._tangent = result.tangent = Math.atan2(
      result.deltaValue - this._deltaValue,
      result.deltaTime - this._deltaTime
    );
    this._deltaValue = result.deltaValue;
    this._deltaTime = result.deltaTime;
    currentAnimation.fn(result.value, result);

    if (result.percentTime < 1) {
      this._nextFrame = requestAnimationFrame(this._nextStep);
    } else if (currentAnimation.loop) {
      currentAnimation.loop--;
      currentAnimation.iterations++;
      this._startNext();
    } else {
      currentAnimation.promise.resolve(this);
      this._queue.shift();
      if (this._queue.length > 1) {
        this._startNext();
      } else {
        this._paused = true;
      }
    }
  }

  _rejectAll(reason: string) {
    this._queue.forEach(animation => {
      animation.promise.reject({
        message: reason,
        animation: this
      });
    });
  }

  _startNext() {
    this._queue[0].startTime = Date.now();
    this._paused = false;
    this._deltaValue =
      this._queue[0].easing(0) * this._queue[0].target + this._queue[0].start;
    this._deltaTime = 0;
    this._nextFrame = requestAnimationFrame(this._nextStep);
  }

  _validate(
    fn: Renderer,
    promise: PromiseFunctions,
    {
      duration = this._defaults.duration,
      easing = this._defaults.easing,
      loop = this._defaults.loop,
      alternate = this._defaults.alternate,
      start = this._defaults.start,
      target = this._defaults.target
    }: animation
  ): validatedAnimation {
    console.assert(
      typeof fn === `function`,
      `First parameter needs to be a function`
    );
    console.assert(
      typeof easing === `function`,
      `"easing" needs to be a function`
    );
    console.assert(isNatural(duration), `"duration" must be positive integer`);
    console.assert(
      isWhole(loop),
      `"loop" must be positive integer, zero or Infinity`
    );
    console.assert(
      typeof alternate === "boolean",
      `"alternate" must be boolean`
    );
    return {
      fn,
      easing,
      duration,
      loop,
      alternate,
      start,
      target,
      startTime: 0,
      iterations: 0,
      promise
    };
  }

  loop(iterations = 0, which = 0) {
    this._queue[which].loop = iterations;
    return this;
  }

  pause() {
    if (!this._paused) {
      this._paused = true;
      this._pauseTime = Date.now();
      cancelAnimationFrame(this._nextFrame);
    }
    return this;
  }

  resume() {
    if (this._paused) {
      this._paused = false;
      this._queue[0].startTime += Date.now() - this._pauseTime;
      this._nextFrame = requestAnimationFrame(this._nextStep);
    }
    return this;
  }

  get paused() {
    return this._paused;
  }

  animate(fn: Renderer, options: animation = {}): Promise<Animation> {
    return new Promise((resolve: ResolveFunction, reject: RejectFunction) => {
      if (this._queue.length < 1) {
        this.stop(`Animation changed before it was completed`);
        const newOptions = Object.assign(this._defaults, options);
        options.easing = mergeCurveToLine(this._tangent, newOptions.easing);
      }
      const promise = { resolve, reject };
      this._queue[0] = this._validate(fn, promise, options);
      this._startNext();
    });
  }

  queue(fn: Renderer, options: animation = {}): Promise<Animation> {
    return new Promise((resolve: ResolveFunction, reject: RejectFunction) => {
      const promise = { resolve, reject };
      if (this._queue.length < 1) {
        if (
          this._queue.reduce((acc, curr) => (curr.loop || 0) + acc, 0) ===
          Infinity
        ) {
          reject({
            message: `An animation in the queue is set to loop infinitely, so requested animation would never be executed. Consider using .modifyLoop() or .clearQueue() before queuing.`,
            animation: this
          });
        } else {
          this._queue.push(this._validate(fn, promise, options));
        }
      } else {
        this._queue[0] = this._validate(fn, promise, options);
        this._startNext();
      }
    });
  }

  clearQueue(resetLoop = false) {
    this._queue = this._queue.slice(0, 1);
    if (resetLoop) {
      this.loop(0);
    }
    return this;
  }

  get currentQueue() {
    return this._queue;
  }

  stop(reason = `Animation stopped manually`) {
    cancelAnimationFrame(this._nextFrame);
    this._rejectAll(reason);
    this._queue = [];
    this._paused = true;
    return this;
  }
}
