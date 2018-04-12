import bind from "bind-decorator";
import NumericOperator from "./Interfaces/NumericOperator";
import AnimationResolution from "./Interfaces/AnimationResolution";
import Renderer from "./Interfaces/Renderer";
import { ResolveFunction, RejectFunction, PromiseFunctions } from "./Interfaces/Promises";
import { linear } from "./easings";
import { flipY, mergeCurveToLine } from "./helpers";
import { ValidatedAnimation, AnimationOptions, AnimationInput } from "./Interfaces/Animation";
export * from "./easings";
export * from "./helpers";

const isNatural = (x: number) => !isNaN(x) && x > 0 && x % 1 === 0;
const isWhole = (x: number) => isNatural(x) || x === Infinity || x === 0;

export default class Animation {
  _paused: boolean = true;
  _queue: ValidatedAnimation[] = [];
  _tangent: number = 0;
  _deltaTime: number = 0;
  _deltaValue: number = 0;
  _defaults: AnimationOptions;
  _nextFrame: number = -1;
  _pauseTime: number = 0;

  constructor(defaults: AnimationInput) {
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
    const result: AnimationResolution = {};
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
    }: AnimationInput
  ): ValidatedAnimation {
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

  animate(fn: Renderer, options: AnimationInput = {}): Promise<Animation> {
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

  queue(fn: Renderer, options: AnimationInput = {}): Promise<Animation> {
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
