import { gsap } from 'gsap';
import { CharToLedIndexHash } from './char-to-led-index-hash.js';
import { Color, HsbColor } from './color.js';

export type ColorArrayCallback = (colors: Color[]) => void;

export interface ColorArrayAnimation extends gsap.core.Timeline {
	// Redeclare the `eventCallback` method for stronger typing of the `callback`.
	eventCallback(
		type: gsap.CallbackType,
		callback: ColorArrayCallback | null,
	): this;
	eventCallback(type: gsap.CallbackType): ColorArrayCallback;
}

export abstract class ColorArrayAnimation {
	public static blinkChaos(args: {
		cycleDuration?: number;
		ledCount: number;
		repeat?: number;
	}): ColorArrayAnimation {
		const prefix = ColorArrayAnimation.blinkChaos.name;
		console.info(prefix, args);

		const { cycleDuration = 2, ledCount, repeat = -1 } = args;

		// Initialize a randomized array of colors that are all initially dark.
		const colors: HsbColor[] = [];
		for (let ledIndex = 0; ledIndex < ledCount; ledIndex++) {
			const color: HsbColor = HsbColor.randomNamedColor();
			color.brightness = 0;

			colors.push(color);
		}

		// Create a timeline of tweens that brighten and dim one random color at a time.
		const timeline = gsap.timeline({
			...ColorArrayAnimation.createTimelineCallbackParams(colors),
			repeat,
		});

		for (const color of colors) {
			timeline
				.to(
					color,
					{
						brightness: 100,
						duration: 0.1,
						ease: 'linear',
					},
					Math.random() * cycleDuration,
				)
				.to(color, {
					brightness: 0,
					duration: 0.9,
					ease: 'linear',
				});
		}

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

		const {
			charToLedIndexHash,
			ledCount,
			singleCharDuration = 2,
			text,
		} = args;

		// Initialize a randomized array of colors that are all initially dark.
		const colors: HsbColor[] = [];
		for (let ledIndex = 0; ledIndex < ledCount; ledIndex++) {
			const color: HsbColor = HsbColor.randomNamedColor();
			color.brightness = 0;

			colors.push(color);
		}

		// Create a timeline of tweens that brighten and dim one character at a time.
		const timeline = gsap.timeline(
			ColorArrayAnimation.createTimelineCallbackParams(colors),
		);

		let position = 0;
		for (const char of text) {
			const ledIndex: number | undefined =
				charToLedIndexHash[char.toLowerCase()];
			if (ledIndex !== undefined) {
				const color: HsbColor | undefined = colors[ledIndex];
				if (!color) {
					throw new Error(`Invalid LED index: ${ledIndex}`);
				}

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
							onStart: () =>
								console.info(prefix, `Animating '${char}'`),
						},
						position,
					)
					.to(color, {
						brightness: 100,
						duration: singleCharDuration / 2,
					})
					.to(color, {
						brightness: 0,
						duration: singleCharDuration / 4,
						ease: 'linear',
					});
			}
			position += singleCharDuration;
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
		return gsap
			.timeline(ColorArrayAnimation.createTimelineCallbackParams(colors))
			.to(colors, {
				hue: '+= 360',
				delay: 0,
				duration: cycleDuration,
				ease: 'linear',
				onRepeat: () => console.info(prefix, 'Repeating scroll'),
				onStart: () => console.info(prefix, 'Starting scroll'),
				repeat,
			});
	}

	private static createTimelineCallbackParams(
		colors: Color[],
	): gsap.TimelineVars {
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
