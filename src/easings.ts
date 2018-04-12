import NumericOperator from "./Interfaces/NumericOperator";
import {flip} from "./helpers";

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
