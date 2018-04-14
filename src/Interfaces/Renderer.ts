import AnimationResolution from "./AnimationResolution";

export default interface Renderer {
  (value: number, details: AnimationResolution): void;
}
