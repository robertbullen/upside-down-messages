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
	public static swellOn(args: {
		colorCount: number;
		cycleDuration?: number;
	}): ColorArrayAnimation {
		const prefix = ColorArrayAnimation.swellOn.name;
		console.info(prefix, args);

		const { colorCount, cycleDuration = 5 } = args;

		// Create a randomized array of colors that are all initially dark.
		const colors: HsbColor[] = [];
		for (let ledIndex = 0; ledIndex < colorCount; ledIndex++) {
			const color: HsbColor = HsbColor.chooseRandomNamedColor();
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
		// const unifyPhaseDuration = cycleDuration * 0.2;
		const brightenPhaseDuration = cycleDuration * 0.4;

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
				(1 - Math.random() ** 4) * turnOnPhaseDuration,
			);
		}
		timeline.add(turnOnPhaseTimeline);

		// Phase 2: Unify.
		// const unifyColor: HsbColor = HsbColor.randomNamedColor();
		// timeline.to(colors, {
		// 	hue: unifyColor.hue,
		// 	duration: unifyPhaseDuration,
		// 	ease: 'linear',
		// 	onStart: () =>
		// 		console.info(
		// 			prefix,
		// 			`Unifying colors to ${unifyColor} over ${unifyPhaseDuration} seconds`,
		// 		),
		// });

		// Phase 3: Brighten.
		timeline.to(colors, {
			brightness: 100,
			saturation: 75,
			duration: brightenPhaseDuration,
			ease: 'linear',
			onStart: () =>
				console.info(prefix, `Brightening colors over ${brightenPhaseDuration} seconds`),
		});

		return timeline;
	}

	public static letterByLetter(args: {
		charToLedIndexHash: CharToLedIndexHash;
		colorCount: number;
		singleCharDuration?: number;
		text: string;
	}): ColorArrayAnimation {
		const prefix = ColorArrayAnimation.letterByLetter.name;
		console.info(prefix, args);

		const { charToLedIndexHash, colorCount, singleCharDuration = 2, text } = args;

		// Initialize a randomized array of colors that are all initially dark.
		const colors: HsbColor[] = [];
		for (let ledIndex = 0; ledIndex < colorCount; ledIndex++) {
			const color: HsbColor = HsbColor.chooseRandomNamedColor();
			color.brightness = 0;

			colors.push(color);
		}

		// Create a timeline of tweens that brighten and dim one character at a time.
		const timeline = gsap.timeline(ColorArrayAnimation.createTimelineCallbackParams(colors));

		function onStart(char: string, ledIndex?: number, color?: HsbColor): void {
			console.info(
				prefix,
				`Animating '${char}' at index ${ledIndex ?? -1} with color ${color}`,
			);
		}

		let position = 0;
		const nothing = {};
		for (const char of text) {
			// Lookup the LED index for the character. If there isn't one, assume its a space or
			// punctuation.
			const ledIndex: number | undefined = charToLedIndexHash[char.toLowerCase()];
			const color: HsbColor | undefined =
				ledIndex !== undefined ? colors[ledIndex] : undefined;

			const onStartParams: Parameters<typeof onStart> = [char, ledIndex, color];

			if (color) {
				timeline
					.to(
						color,
						{
							brightness: 100,
							duration: singleCharDuration / 4,
							ease: 'linear',
							onStartParams,
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
				// Add a tween simply for logging the unregistered character.
				timeline.to(nothing, {
					onStart,
					onStartParams,
				});
				position += singleCharDuration / 2;
			}
		}

		return timeline;
	}

	public static scrollingRainbow(args: {
		colorCount: number;
		cycleDuration?: number;
		repeat?: number;
	}): ColorArrayAnimation {
		const prefix = ColorArrayAnimation.scrollingRainbow.name;
		console.info(prefix, args);

		const { colorCount, cycleDuration = 5, repeat = 0 } = args;

		// Initialize a rainbow of colors over the full length of the LED array.
		const colors: HsbColor[] = [];
		for (let ledIndex = 0; ledIndex < colorCount; ledIndex++) {
			colors.push(new HsbColor((ledIndex / colorCount) * 360, 100, 100));
		}

		// Create a single tween that continuously repeats a 360-degree hue cycling of every LED
		// relative to its starting color. The tween is wrapped in a timeline to keep logging
		// callbacks isolated.
		return gsap.timeline(ColorArrayAnimation.createTimelineCallbackParams(colors)).to(colors, {
			hue: '+= 360',
			delay: 0,
			duration: cycleDuration,
			ease: 'linear',
			onRepeat: (): void => console.info(prefix, 'Repeating scroll'),
			onStart: (): void => console.info(prefix, 'Starting scroll'),
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
