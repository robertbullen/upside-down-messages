import * as url from 'url';
import * as util from 'util';
import { Message } from '../../lib/messages.js';
import { ColorArrayAnimation } from './animations.js';
import { CharToLedIndexHash } from './char-to-led-index-hash.js';
import { Color } from './color.js';
import { env } from './environment.js';
import { FillerMessages } from './filler-messages.js';
import { LedController } from './led-controller.js';
import { receiveMessages } from './message-queue.js';

util.inspect.defaultOptions.depth = Number.POSITIVE_INFINITY;

function sleep(milliseconds: number): Promise<number> {
	return new Promise((resolve): void => void setTimeout(resolve, 1000, milliseconds));
}

async function main(): Promise<void> {
	const prefix: string = main.name;

	// Load external assets.
	// TODO: Load from CLI argument.
	const charToLedIndexHash = await CharToLedIndexHash.loadFromFile(
		new url.URL('char-to-led-index-hash.json', import.meta.url),
		env.LED_COUNT,
	);
	console.info(prefix, { charToLedIndexHash });

	// TODO: Load from CLI argument.
	const fillerMessages = await FillerMessages.loadFromFile(
		new url.URL('filler-messages.json', import.meta.url),
	);
	console.info(prefix, { fillerMessages });

	// Initialize the LED controller and declare a convenience function for rendering to it.
	const ledMask = new Array<boolean>(env.LED_COUNT).fill(false, 0, 9).fill(true, 9);
	const ledController = new LedController(env.LED_COUNT, ledMask);

	function renderAnimation(animation: ColorArrayAnimation): Promise<ColorArrayAnimation> {
		return animation
			.eventCallback('onUpdate', (colors: Color[]): void => {
				ledController.render(colors);
			})
			.then((): void => ledController.reset());
	}

	try {
		// Trap SIGINT to dispose of the LED controller before exiting.
		process.on('SIGINT', () => {
			ledController.dispose();
			process.nextTick(() => process.exit(0));
		});
		console.log('Press <Ctrl+C> to exit.');

		// Show a startup animation.
		await renderAnimation(
			ColorArrayAnimation.scrollingRainbow({
				colorCount: env.LED_COUNT,
				cycleDuration: 5,
			}),
		);

		// Poll for messages on the queue.
		for await (const message of receiveMessages<Message>(env.SQS_QUEUE_URL, Message.schema())) {
			console.info(prefix, { message });

			// Animate the message. Fill emptiness with random messages sometimes.
			let text: string | undefined = message?.text;
			if (!text && !!Math.round(Math.random())) {
				text = fillerMessages.chooseRandomMessage();
			}

			if (text) {
				// Show a preamble.
				await renderAnimation(ColorArrayAnimation.swellOn({ colorCount: env.LED_COUNT }));
				await sleep(1500);

				// Show the message itself.
				await renderAnimation(
					ColorArrayAnimation.letterByLetter({
						charToLedIndexHash,
						colorCount: env.LED_COUNT,
						text,
					}),
				);
				await sleep(1500);
			}
		}
	} finally {
		ledController.dispose();
	}
}

main();
