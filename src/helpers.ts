import NumericOperator from "./Interfaces/NumericOperator";
import { ease } from "./easings";

export const flipX = (f: NumericOperator) => (x: number): number => 1 - f(x);
export const flipY = (f: NumericOperator) => (x: number): number => f(1 - x);
export const flip = (f: NumericOperator) => (x: number): number =>
  flipX(flipY(f))(x);
export const mergeCurves = (
  f1: NumericOperator,
  f2: NumericOperator,
  f3: NumericOperator = ease
) => (x: number): number => f1(x) * flipX(f3)(x) + f2(x) * f3(x);
export const mergeCurveToLine = (angle: number, curve: NumericOperator) =>
  mergeCurves((n: number) => Math.tan(angle) * n, curve);
