import NumericOperator from "./NumericOperator";
import { PromiseFunctions } from "./Promises";
import Renderer from "./Renderer";

export interface AnimationInput {
  duration?: number;
  easing?: NumericOperator;
  loop?: number;
  alternate?: boolean;
  start?: number;
  target?: number;
}

export interface AnimationOptions {
  duration: number;
  easing: NumericOperator;
  loop: number;
  alternate: boolean;
  start: number;
  target: number;
}

export interface ValidatedAnimation extends AnimationOptions {
  promise: PromiseFunctions;
  fn: Renderer;
  startTime: number;
  iterations: number;
}
