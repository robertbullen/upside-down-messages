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
	const fodderMessages = [
		'are you there',
		'friends do not lie',
		'help me',
		'i am the monster',
		'i am trapped',
		'i see you',
		'join us',
		'mouthbreather',
		'run',
		'the gate is open',
		'the mind flayer sees you',
		'vecna lives',
		'we are nerds and freaks',
		'you are the monster',
		'you have lost',
		'you will break',
	];
	console.info(prefix, { fodderMessages });

	const randomFodderMessage = uniqueRandomArray(fodderMessages);

	// Initialize the LED controller and declare a convenience function for rendering to it.
	const ledMask = new Array<boolean>(env.LED_COUNT).fill(false, 0, 9).fill(true, 9);
	const ledController = new LedController(env.LED_COUNT, ledMask);

	async function renderAnimation(animation: ColorArrayAnimation): Promise<void> {
		await animation.eventCallback('onUpdate', (colors: Color[]): void => {
			ledController.render(colors);
		});
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
				cycleDuration: 5,
				ledCount: env.LED_COUNT,
				repeat: 1,
			}),
		);

		// Poll for messages on the SQS queue.
		for await (const message of receiveMessages<Message>(env.SQS_QUEUE_URL, Message.schema())) {
			console.info(prefix, { message });

			// Animate the message. Fill emptiness with fodder sometimes.
			let text: string | undefined = message?.text;
			if (!text && !!Math.round(Math.random())) text = randomFodderMessage();

			if (text) {
				// Show a preamble.
				await renderAnimation(
					ColorArrayAnimation.swellOn({
						cycleDuration: 5,
						ledCount: env.LED_COUNT,
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
