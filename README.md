# elastic-momentum

```diff
- Note that this library is still in alpha
- Stuff probably doesn't work yet
- Stuff will probably change
```

`elastic-momentum` is a light-weight animation library for JavaScript. The library doesn't do any rendering - you'll have to do that yourself. The library is only conerned with timing the animation.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Properties](#properties)
- [Overwriting default values](#overwriting-default-values)
- [Running functions after the animation completes](#running-functions-after-the-animation-completes)
- [Chaining animations](#chaining-animations)
- [Modifying loops](#modifying-loops)
- [Inspecting the queue](#inspecting-the-queue)
- [Stopping the animation](#stopping-the-animation)
- [Easings](#easings)
- [Helper functions](#helper-functions)

## Installation

—

## Usage

```js
import Animation from "elastic-momentum";

//initiate the animation:
const animation = new Animation();

//then call to animate your own rendering function:
animation.animate(renderer, {target: 360});

function renderer(value) {
  document.querySelector("div").style.transform = `rotate(${value})`;
}
```

The above example rotates `#myElement` from 0 to 360 degrees over a span of 300ms.

You may also set your own parameters:

```js
animation.animate(renderer, {
  easing: x => x ** 2,
  duration: 300,
  loop: Infinity,
  alternate: true
});
```
*See [Options](#options) for all.*

## Options

option | type | default | description
-------|------|---------|------------
easing | function | `x => x` | Controls how your animation is timed. This can be any function that takes a number between 0 and 1 and outputs another number between 0 and 1 (or in cases of overshooting, less or more).  See [*easings*](#easings) for more built-in easing functions.
duration | number | `300` | How long the animation lasts in milliseconds.
loop | number | `0` | How many times your animation should be repeated. Setting this to `0` runs the animation once. Setting this to `Infinity` runs the animation indefinitely.
alternate | boolean | `false` | Controls wether the animation should be reversed on every other loop
reject | boolean | `false` | Controls wether the promise of an animation should be rejected when the animation is intercepted.
start | number | `0` | What value the animation should yield when `easing(x) == 0`.
target | number | `1` | What value the animation should yield when `easing(x) == 1`.

*Each field is optional.*

## Properties

property | type | description
---|---|---
animate() | (options: Options): Promise\<this> | Runs an animation immediately. *See [Chaining animations](#chaining-animations).*
queue() | (options: Options): Promise\<this> | Queues an animation to be run when other animations have finished running. *See [Chaining animations](#chaining-animations).*
currentQueue | Animation[] | Lists currently queued animations. *See [Inspecting the queue](#inspecting-the-queue).*
pause() | (): this | Pauses the animation.
resume() | (): this | Resumes the paused animation.
stop() | (reason?: string): this | Stops the animation and clears the queue. *See [Stopping the animation](#stopping-the-animation).*
clearQueue() | (clearLoop?: boolean = false): this | Clears all the animations from the queue but runs the current animation to completion. If the current animation is set to loop, you can prevent it from looping by passing `true`. *See [Chaining animations](#chaining-animations).*
loop() | (iterations?: number = 0, which?: number = 0): this | Modifies the amount of times an animation should loop. `iterations` controls how many times you want it to loop and `which` points to the index of the animation in the queue. *See [Modifying loops](#modifying-loops).*

## Overwriting default values

If you plan on running multiple animations with similar settings, you can also modify the default options with the constructor:

```js

const animation2 = new Animate({ duration: 500, easing: elasticOut });

```

## Running functions after the animation completes

The animation returns a promise, so you can run code after the animation is done:

```js
animation.animate(renderer).then(animation => {
  document.querySelector("#myElement").remove();
});

```

or using async await:

```js
async function myFunction() {
  await animation.animate(renderer);
  document.querySelector("#myElement").remove();
  return;
}
```

## Chaining animations

You can chain multiple animations to run them consecutively using `.queue()`:

```js
animation.queue(renderer);
animation.queue(renderer2);
```

The above example will queue renderer and renderer2 to be ran after one-other.

Note that `.animate()` will always start the animation immediately, even if there is another animation in progress - it'll just abort whatever is in progress and clear the queue. Using `.queue()` when there are no animations in progress simply starts the animation right-away like `.animate()` would.

`.animate()` doesn't just stop the previous animation, but transitions smoothly from it to the newly requested animation so that the animation looks natural even when changed mid-way through. If this behaviour is undesireable, you can call `.stop().animate()` to get a clean start for your animation or `.easedStop().queue()` to ease the animation to a halt at the current value and then start the new animation.

If you cange your mind, you can also clear the queue:

```js
animation.clearQueue().queue(renderer);
```



The above example will clear any queued animations, but will finish animation the animation that's currently in progress. Note that `.clearQueue()` doesn't clear any queued loops by default, so if the current animation is set to loop 5 times, it'll run 5 times before the next animation will start. If you want to just finish the current animation and don't want to loop it, you can use `.clearQueue(true)`.

## Modifying loops

If one of your loops is set to loop infinitely, you won't be able to queue new animations without setting the loop to something else first. You can modify the loop count of the current animation using `.loop()`:

```js
animation.animate(renderer, { loop: Infinity });
animation.loop(2);
```

The above code will run 3 times.

If you need to modify the loops of animations other than what's currently running, you can supply a second parameter:

```js
animation.animate(renderer, { loop: 2 }); //runs twice
animation.queue(renderer, { loop: 5 }); //runs once
animation.modifyLoop(2, 1);
```

## Inspecting the queue

If you don't know what's in your queue and need to, you can check it using `.currentQueue`

```js
  console.log(animation.currentQueue); // [<Animation>, <Animation>]
```

It returns an array of animation objects containing the options you supplied.

## Stopping the animation

When you need to just stop and clear everything, you can use `.stop()`:

```js
animation.stop();
```


## Easings

You can think of easings as putting in a mathematical formula to control the timing of the function. For example, the easing function is y = x² would be put in as `x => x**2`. 

The library comes with a few basic easing functions.

 * linear: No easing
 * ease: A sine curve that eases the animation both in and out
 * easeIn: A sine curve that eases the animnation in
 * easeOut: A sine curve that eases the animnation out
 * elasticIn: Gives the animation a ossolating start.
 * elasticOut: Gives the animation a ossolating ending.
 * bounceIn: Gives the animatoun a bouncy start.
 * bounceOut: Gives the animatoun a bouncy ending.
 * overshoot: Takes the animation too far, "overshoots" and backs down to the appropriate value.
 * overshootIn: Backs out a bit before starting the animation - reverse of overshooting.
 * sharpIncline(v): A sharper version of the sine wave (ease). Takes in a parameter (number) to determine how sharp the curve should be. Higher = sharper. 1 = regular sine. 

Example:

```js
import Animation, { elasticOut } from "elastic-momentum";
const animation = new Animation();
animation.animate(renderer, { easing: elasticOut });
```



## Helper functions

function | type | description
---|---|---
flipX | (f: Function): Function | Flips a curve vertically (around the x-axis)
flipY | (f: Function): Function | Flips a curve horizontally (around the y-axis). Useful for reversing a function.
flip | (f: Function): Function | Flips a curve both vertically and horizontally. Useful for getting the opposite function.
mergeCurves | (f1: Function, f2: Function, f?: Function = ease): Function | This will return a new easing function that transitions from one easing function over to another smoothly.

Example:

```js
import Animation, { elasticOut, elasticIn, mergeCurves } from "elastic-momentum";
const animation = new Animation({ easing: mergeCurves(elasticIn, elasticOut) });
```

By default, it uses a sine-function to ease from one function to another, but you can provide your own merging function as the third parameter:

```js
import Animation, { elasticOut, elasticIn, mergeCurves, sharpIncline } from "elastic-momentum";
const animation = new Animation({
  easing: mergeCurves(elasticIn, elasticOut, sharpIncline(5))
});
```