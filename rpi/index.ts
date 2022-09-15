import AWS, { SQS } from 'aws-sdk';
import ws281x from 'rpi-ws281x-native';
import * as util from 'util';
import { env } from './environment';

AWS.config.logger = console;
AWS.config.region = env.AWS_DEFAULT_REGION;

util.inspect.defaultOptions.depth = Number.POSITIVE_INFINITY;

const LED_COUNT = 100;

function initializeLeds(): any {
	const channel = ws281x(LED_COUNT, {
		freq: 800000,
		stripType: ws281x.stripType.WS2811_RGB,
	});
	ws281x.reset();
	ws281x.render();

	return channel;
}

function finalizeLeds(): void {
	ws281x.reset();
	ws281x.render();
	ws281x.finalize();
}

async function main(): Promise<void> {
	const prefix: string = main.name;

	// Initialize the LED strips.
	const channel: any = initializeLeds();
	try {
		// Trap SIGINT and finalize the LED strips.
		process.on('SIGINT', (): void => {
			finalizeLeds();
			process.nextTick((): void => process.exit(0));
		});

		console.log('Press <Ctrl+C> to exit.');

		// Start animation loop.
		var offset = 0;
		setInterval(function () {
			for (var i = 0; i < LED_COUNT; i++) {
				channel.array[i] = colorwheel((offset + i) % 256);
			}
			ws281x.render();

			offset = (offset + 1) % 256;
		}, 1000 / 100);

		// Long poll for messages on the SQS queue.
		const sqs = new SQS();

		for (;;) {
			const receiveMessageInput: SQS.ReceiveMessageRequest = {
				QueueUrl: env.SQS_QUEUE_URL,
				MaxNumberOfMessages: 1,
				WaitTimeSeconds: 20,
			};
			const receiveMessageOutput: SQS.ReceiveMessageResult = await sqs
				.receiveMessage(receiveMessageInput)
				.promise();
			console.info(prefix, { receiveMessageOutput });

			for (const message of receiveMessageOutput.Messages ?? []) {
				const deleteMessageInput: SQS.DeleteMessageRequest = {
					QueueUrl: env.SQS_QUEUE_URL,
					ReceiptHandle: message.ReceiptHandle || '',
				};
				await sqs.deleteMessage(deleteMessageInput).promise();
			}
		}
	} catch (error) {
		console.error(prefix, { error });

		finalizeLeds();

		throw error;
	}
}

main();

// rainbow-colors, taken from http://goo.gl/Cs3H0v
function colorwheel(pos: number): number {
	pos = 255 - pos;
	if (pos < 85) {
		return rgb2Int(255 - pos * 3, 0, pos * 3);
	} else if (pos < 170) {
		pos -= 85;
		return rgb2Int(0, pos * 3, 255 - pos * 3);
	} else {
		pos -= 170;
		return rgb2Int(pos * 3, 255 - pos * 3, 0);
	}
}

function rgb2Int(r: number, g: number, b: number): number {
	return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}
