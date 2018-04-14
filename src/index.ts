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
  private _queue: ValidatedAnimation[] = [];
  private _defaults: AnimationOptions;
  private _paused = true;
  private _tangent = 0;
  private _deltaTime = 0;
  private _deltaValue = 0;
  private _pendingFrame = -1;
  private _pauseTime = 0;

  constructor(
    defaults: AnimationInput = {}
  ) {
    this._defaults = Object.assign(
      {
        duration: 300,
        easing: linear,
        loop: 0,
        alternate: false,
        start: 0,
        target: 1,
      },
      defaults
    );
  }

  @bind
  private _nextFrame() {
    const currentAnimation = this._queue[0];
    const result: AnimationResolution = this._resolveAnimation(currentAnimation);
    currentAnimation.fn(result.value, result);

    if (result.percentTime < 1) {
      this._pendingFrame = requestAnimationFrame(this._nextFrame);
    } else if (currentAnimation.loop) {
      this._restartLoop(currentAnimation);
    } else {
      this._shiftQueue();
    }
  }

  private _restartLoop(currentAnimation: ValidatedAnimation) {
    currentAnimation.loop--;
    currentAnimation.iterations++;
    this._startNext();
  }

  private _shiftQueue() {
    this._queue[0].promise.resolve(this);
    this._queue.shift();
    if (this._queue.length > 1) {
      this._startNext();
    }
    else {
      this._paused = true;
    }
  }

  private _resolveAnimation(currentAnimation: ValidatedAnimation): AnimationResolution {
    const result: any = {};
    result.deltaTime = Date.now() - currentAnimation.startTime;
    result.percentTime = Math.min(result.deltaTime / currentAnimation.duration, 1);
    result.percentValue = (currentAnimation.iterations % 2 === 1 && currentAnimation.alternate)
      ? flipY(currentAnimation.easing)(result.percentTime)
      : currentAnimation.easing(result.percentTime);
    result.deltaValue = result.percentValue * currentAnimation.target;
    result.value = result.deltaValue + currentAnimation.start;
    this._tangent = result.tangent = Math.atan2(
      result.deltaValue - this._deltaValue,
      result.deltaTime - this._deltaTime
    );
    this._deltaValue = result.deltaValue;
    this._deltaTime = result.deltaTime;
    return result;
  }

  private _rejectAll(reason: string) {
    this._queue.forEach(animation => {
      animation.promise.reject({
        message: reason,
        animation: this,
      });
    });
  }

  private _startNext() {
    this._queue[0].startTime = Date.now();
    this._paused = false;
    this._deltaValue = this._queue[0].easing(0) * this._queue[0].target + this._queue[0].start;
    this._deltaTime = 0;
    this._pendingFrame = requestAnimationFrame(this._nextFrame);
  }

  private _validate(
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
    console.assert(typeof fn === `function`, `First parameter needs to be a function`);
    console.assert(typeof easing === `function`, `"easing" needs to be a function`);
    console.assert(isNatural(duration), `"duration" must be positive integer`);
    console.assert(isWhole(loop), `"loop" must be positive integer, zero or Infinity`);
    console.assert(typeof alternate === "boolean", `"alternate" must be boolean`);
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
      promise,
    };
  }

  loop(
    iterations = 0,
    which = 0
  ) {
    this._queue[which].loop = iterations;
    return this;
  }

  pause() {
    if (!this._paused) {
      this._paused = true;
      this._pauseTime = Date.now();
      cancelAnimationFrame(this._pendingFrame);
    }
    return this;
  }

  resume() {
    if (this._paused && this.queue.length) {
      this._paused = false;
      this._queue[0].startTime += Date.now() - this._pauseTime;
      this._pendingFrame = requestAnimationFrame(this._nextFrame);
    }
    return this;
  }

  get paused() {
    return this._paused;
  }

  animate(
    fn: Renderer,
    options: AnimationInput = {}
  ): Promise<Animation> {
    return new Promise((resolve: ResolveFunction, reject: RejectFunction) => {
      if (this._queue.length < 1) {
        this.stop(`Animation changed before it was completed`);
        const newOptions = Object.assign(this._defaults, options);
        options.easing = mergeCurveToLine(this._tangent, newOptions.easing);
      }
      this._queue[0] = this._validate(fn, { resolve, reject }, options);
      this._startNext();
    });
  }

  queue(
    fn: Renderer,
    options: AnimationInput = {}
  ): Promise<Animation> {
    return new Promise((resolve: ResolveFunction, reject: RejectFunction) => {
      this._queue.push(this._validate(fn, { resolve, reject }, options));
      if (this._queue.length === 1) {
        this._startNext();
      }
    });
  }

  clearQueue(
    resetLoop = false
  ) {
    this._queue = this._queue.slice(0, 1);
    if (resetLoop) {
      this.loop(0);
    }
    return this;
  }

  get currentQueue() {
    return this._queue;
  }

  stop(
    reason = `Animation stopped manually`
  ) {
    cancelAnimationFrame(this._pendingFrame);
    this._rejectAll(reason);
    this._queue = [];
    this._paused = true;
    return this;
  }
}
