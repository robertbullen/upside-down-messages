import { gsap } from 'gsap';
import { CharToLedIndexHash } from './char-to-led-index-hash.js';
import { Color, HsbColor } from './color.js';

// GSAP will animate much quicker than this, but 30 FPS is more than sufficient for these purposes.
gsap.ticker.fps(30);
// gsap.ticker.add(() => console.info('GSAP ticker FPS ratio:', gsap.ticker.deltaRatio(30)));

export type ColorArrayCallback = (colors: Color[]) => void;

export interface ColorArrayAnimation extends gsap.core.Timeline {
	// Redeclare the `eventCallback` method for stronger typing of the `callback`.
	eventCallback(type: gsap.CallbackType, callback: ColorArrayCallback | null): this;
	eventCallback(type: gsap.CallbackType): ColorArrayCallback;
}

export abstract class ColorArrayAnimation {
	public static swellOn(args: { cycleDuration?: number; ledCount: number }): ColorArrayAnimation {
		const prefix = ColorArrayAnimation.swellOn.name;
		console.info(prefix, args);

		const { cycleDuration = 5, ledCount } = args;

		// Create a randomized array of colors that are all initially dark.
		const colors: HsbColor[] = [];
		for (let ledIndex = 0; ledIndex < ledCount; ledIndex++) {
			const color: HsbColor = HsbColor.randomNamedColor();
			color.brightness = 0;
			colors.push(color);
		}

		// Create a timeline of tweens that perform a swelling effect in phases:
		// 1.) Turn on random colors at random times to half brightness.
		// 2.) Unify all colors to the same hue.
		// 3.) Increase all colors to full brightness.
		const timeline = gsap.timeline({
			...ColorArrayAnimation.createTimelineCallbackParams(colors),
		});

		const turnOnPhaseDuration = cycleDuration * 0.6;
		const unifyPhaseDuration = cycleDuration * 0.2;
		const brightenPhaseDuration = cycleDuration * 0.2;

		// Phase 1: Turn on.
		const turnOnPhaseTimeline = gsap.timeline({
			onStart: () =>
				console.info(prefix, `Turning on colors over ${turnOnPhaseDuration} seconds`),
		});
		for (const color of colors) {
			turnOnPhaseTimeline.to(
				color,
				{
					brightness: 50,
					duration: 0,
					ease: 'linear',
				},
				Math.random() * turnOnPhaseDuration,
			);
		}
		timeline.add(turnOnPhaseTimeline);

		// Phase 2: Unify.
		const unifyColor: HsbColor = HsbColor.randomNamedColor();
		timeline.to(colors, {
			hue: unifyColor.hue,
			duration: unifyPhaseDuration,
			ease: 'linear',
			onStart: () =>
				console.info(
					prefix,
					`Unifying colors to ${unifyColor} over ${unifyPhaseDuration} seconds`,
				),
		});

		// Phase 3: Brighten.
		timeline.to(colors, {
			brightness: 100,
			duration: brightenPhaseDuration,
			ease: 'linear',
			onStart: () =>
				console.info(prefix, `Brightening colors over ${brightenPhaseDuration} seconds`),
		});

		return timeline;
	}

	public static letterByLetter(args: {
		charToLedIndexHash: CharToLedIndexHash;
		ledCount: number;
		singleCharDuration?: number;
		text: string;
	}): ColorArrayAnimation {
		const prefix = ColorArrayAnimation.letterByLetter.name;
		console.info(prefix, args);

		const { charToLedIndexHash, ledCount, singleCharDuration = 1.5, text } = args;

		// Initialize a randomized array of colors that are all initially dark.
		const colors: HsbColor[] = [];
		for (let ledIndex = 0; ledIndex < ledCount; ledIndex++) {
			const color: HsbColor = HsbColor.randomNamedColor();
			color.brightness = 0;

			colors.push(color);
		}

		// Create a timeline of tweens that brighten and dim one character at a time.
		const timeline = gsap.timeline(ColorArrayAnimation.createTimelineCallbackParams(colors));

		let position = 0;
		const placeholder: object = {};
		for (const char of text) {
			// Lookup the LED index for the character. If there isn't one, assume its a space or
			// punctuation.
			const ledIndex: number | undefined = charToLedIndexHash[char.toLowerCase()];
			const color: HsbColor | undefined =
				ledIndex !== undefined ? colors[ledIndex] : undefined;

			const onStart = () => console.info(prefix, `Animating '${char}'`);
			if (color) {
				timeline
					.fromTo(
						color,
						{
							brightness: 0,
							ease: 'linear',
							duration: singleCharDuration / 4,
						},
						{
							brightness: 100,
							onStart,
						},
						position,
					)
					.to(
						color,
						{
							brightness: 0,
							duration: singleCharDuration / 4,
							ease: 'linear',
						},
						`+=${singleCharDuration / 2}`,
					);
				position += singleCharDuration;
			} else {
				timeline.to(placeholder, { onStart });
				position += singleCharDuration / 2;
			}
		}

		return timeline;
	}

	public static scrollingRainbow(args: {
		cycleDuration?: number;
		ledCount: number;
		repeat?: number;
	}): ColorArrayAnimation {
		const prefix = ColorArrayAnimation.scrollingRainbow.name;
		console.info(prefix, args);

		const { cycleDuration = 5, ledCount, repeat = -1 } = args;

		// Initialize a rainbow of colors over the full length of the LED array.
		const colors: HsbColor[] = [];
		for (let ledIndex = 0; ledIndex < ledCount; ledIndex++) {
			colors.push(new HsbColor((ledIndex / ledCount) * 360, 100, 100));
		}

		// Create a single tween that continuously repeats a 360-degree hue cycling of every LED
		// relative to its starting color. The tween is wrapped in a timeline to keep logging
		// callbacks isolated.
		return gsap.timeline(ColorArrayAnimation.createTimelineCallbackParams(colors)).to(colors, {
			hue: '+= 360',
			delay: 0,
			duration: cycleDuration,
			ease: 'linear',
			onRepeat: () => console.info(prefix, 'Repeating scroll'),
			onStart: () => console.info(prefix, 'Starting scroll'),
			repeat,
		});
	}

	private static createTimelineCallbackParams(colors: Color[]): gsap.TimelineVars {
		const callbackParams = [colors];
		return {
			onCompleteParams: callbackParams,
			onInterruptParams: callbackParams,
			onRepeatParams: callbackParams,
			onReverseCompleteParams: callbackParams,
			onStartParams: callbackParams,
			onUpdateParams: callbackParams,
		};
	}
}
