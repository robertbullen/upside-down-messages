import uniqueRandomArray from 'unique-random-array';
import * as url from 'url';
import * as util from 'util';
import { Message } from '../../lib/messages.js';
import { ColorArrayAnimation } from './animations.js';
import { CharToLedIndexHash } from './char-to-led-index-hash.js';
import { Color } from './color.js';
import { env } from './environment.js';
import { LedController } from './led-controller.js';
import { receiveMessages } from './message-queue.js';

util.inspect.defaultOptions.depth = Number.POSITIVE_INFINITY;

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
	const fodderMessages = ['help me', '', '', '', '', ''];
	console.info(prefix, { fodderMessages });

	const randomFodderMessage = uniqueRandomArray(fodderMessages);

	// Initialize the LED controller and declare a convenience function for rendering to it.
	const ledController = new LedController(env.LED_COUNT);

	async function renderAnimation(
		animation: ColorArrayAnimation,
	): Promise<void> {
		await animation.eventCallback('onUpdate', (colors: Color[]): void =>
			ledController.render(colors),
		);
		ledController.reset();
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
				ledCount: env.LED_COUNT,
				repeat: 1,
				cycleDuration: 2,
			}),
		);

		// Poll for messages on the SQS queue.
		for await (const message of receiveMessages<Message>(
			env.SQS_QUEUE_URL,
			Message.schema(),
		)) {
			console.info(prefix, { message });

			// Animate the message.
			const text: string = message?.text ?? randomFodderMessage();
			if (text) {
				// Show a preamble.
				await renderAnimation(
					ColorArrayAnimation.blinkChaos({
						cycleDuration: 1.5,
						ledCount: env.LED_COUNT,
						repeat: 1,
					}),
				);
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Show the message itself.
				await renderAnimation(
					ColorArrayAnimation.letterByLetter({
						charToLedIndexHash,
						ledCount: env.LED_COUNT,
						text,
					}),
				);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
	} finally {
		ledController.dispose();
	}
}

main();
