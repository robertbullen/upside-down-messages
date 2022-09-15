import AWS, { Polly, S3, SNS, SQS } from 'aws-sdk';
import * as crypto from 'crypto';
import * as url from 'url';
import * as util from 'util';
import * as yup from 'yup';
import { env } from './environment';
import { isProfane } from './profanity';

util.inspect.defaultOptions.depth = Number.POSITIVE_INFINITY;

// Initialize AWS clients.
AWS.config.logger = console;
const polly = new Polly();
const s3 = new S3();
const sns = new SNS();
const sqs = new SQS();

// Define the type of the incoming messages.
interface IncomingMessage {
	text: string;
}

const incomingMessageSchema: yup.ObjectSchema<IncomingMessage> = yup
	.object({
		text: yup.string().trim().required(),
	})
	.required();

const AudioFormat = {
	mp3: 'mp3',
	oggVorbis: 'ogg_vorbis',
	pcm: 'pcm',
} as const;

// Define the type of the outgoing SQS messages.
type AudioFormat = typeof AudioFormat[keyof typeof AudioFormat];

interface FullMessage extends IncomingMessage {
	audioDataBase64: string;
	audioFormat: AudioFormat;
	audioUrl: string;
	messageId: string;
	textUrl: string;
}

interface OkResponse {
	approximateQueueIndex: number;
	message: FullMessage;
	statusCode: 200;
}

interface InvalidRequestResponse {
	error: string;
	request: unknown;
	statusCode: 400;
}

interface ProfaneTextResponse {
	error: 'Profanity detected';
	message?: IncomingMessage;
	statusCode: 400;
}

type Response = OkResponse | InvalidRequestResponse | ProfaneTextResponse;

export async function handler(
	event: AWSLambda.APIGatewayProxyEventV2,
	_context: AWSLambda.Context,
	_callback: AWSLambda.APIGatewayProxyCallbackV2,
): Promise<AWSLambda.APIGatewayProxyResultV2> {
	const prefix: string = handler.name;
	console.info(prefix, { event });

	const request: unknown = JSON.parse(event.body ?? '');
	console.info(prefix, { request });

	let response: Response | undefined;

	// Validate the payload.
	let incomingMessage: IncomingMessage | undefined;
	try {
		incomingMessage = await incomingMessageSchema.validate(request, {
			stripUnknown: true,
		});
		console.info(prefix, { incomingMessage });
	} catch (error) {
		if (yup.ValidationError.isError(error)) {
			response = {
				error: error.message,
				request,
				statusCode: 400,
			};
		} else {
			throw error;
		}
	}

	if (incomingMessage) {
		// Check for profanity in the message. If present, less work will be done with the message
		// and an error will be returned to the client.
		const isTextProfane: boolean = isProfane(incomingMessage.text);
		console.info(prefix, { isTextProfane });

		if (isTextProfane) {
			response = {
				error: 'Profanity detected',
				message: incomingMessage,
				statusCode: 400,
			};
		} else {
			// Create an ID for the message by hashing its text. This may result in non-unique IDs,
			// but that's OK for current purposes.
			const messageId: string = crypto
				.createHash('md5')
				.update(incomingMessage.text)
				.digest('hex');

			// Synthesize the message text to speech.
			const audioFormat = AudioFormat.mp3;

			const synthSpeechInput: Polly.SynthesizeSpeechInput = {
				OutputFormat: audioFormat,
				Text: incomingMessage.text,
				VoiceId: 'Justin',
			};
			const synthSpeechOutput: Polly.SynthesizeSpeechOutput = await polly
				.synthesizeSpeech(synthSpeechInput)
				.promise();
			console.info(prefix, { synthSpeechOutput });
			if (!synthSpeechOutput.AudioStream) {
				throw new Error('`synthSpeechOutput.AudioStream` not defined');
			}
			if (!synthSpeechOutput.ContentType) {
				throw new Error('`synthSpeechOutput.ContentType` not defined');
			}

			const audioDataBase64: string =
				synthSpeechOutput.AudioStream.toString('base64');

			// Save the message text and audio to the bucket.
			const putAudioInput: S3.PutObjectRequest = {
				Body: synthSpeechOutput.AudioStream,
				Bucket: env.S3_WEBSITE_BUCKET_NAME,
				ContentType: synthSpeechOutput.ContentType,
				Key: `audio/${messageId}.mp3`,
			};
			const putTextInput: S3.PutObjectRequest = {
				Body: incomingMessage.text,
				Bucket: env.S3_WEBSITE_BUCKET_NAME,
				ContentType: 'text/plain',
				Key: `audio/${messageId}.txt`,
			};
			const [putAudioOutput, putTextOutput] = await Promise.all([
				s3.putObject(putAudioInput).promise(),
				s3.putObject(putTextInput).promise(),
			]);
			console.info(prefix, { putAudioOutput, putTextOutput });

			const fullMessage: FullMessage = {
				audioDataBase64,
				audioFormat,
				audioUrl: new url.URL(
					putAudioInput.Key,
					env.WEBSITE_BASE_URL,
				).toString(),
				messageId,
				text: incomingMessage.text,
				textUrl: new url.URL(
					putTextInput.Key,
					env.WEBSITE_BASE_URL,
				).toString(),
			};
			console.info(prefix, { fullMessage });

			// Submit the message text and audio to the queue.
			const sendMessageInput: SQS.SendMessageRequest = {
				MessageBody: JSON.stringify(fullMessage),
				QueueUrl: env.SQS_QUEUE_URL,
			};
			const sendMessageOutput: SQS.SendMessageResult = await sqs
				.sendMessage(sendMessageInput)
				.promise();
			console.info(prefix, { sendMessageOutput });

			const getQueueAttributesInput: SQS.GetQueueAttributesRequest = {
				AttributeNames: ['All'],
				QueueUrl: env.SQS_QUEUE_URL,
			};
			const getQueueAttributesOutput: SQS.GetQueueAttributesResult =
				await sqs.getQueueAttributes(getQueueAttributesInput).promise();
			console.info(prefix, { getQueueAttributesOutput });
			const approximateQueueIndex: number = Number(
				getQueueAttributesOutput.Attributes?.[
					'ApproximateNumberOfMessages'
				],
			);

			response = {
				approximateQueueIndex,
				message: fullMessage,
				statusCode: 200,
			};
		}

		// Notify subscribers that a message was received.
		const publishInput: SNS.PublishInput = {
			Message: JSON.stringify(
				response,
				(key, value) => (key === 'audioDataBase64' ? undefined : value),
				'\t',
			),
			TopicArn: env.SNS_TOPIC_ARN,
		};
		const publishOutput: SNS.PublishResponse = await sns
			.publish(publishInput)
			.promise();
		console.info(prefix, { publishOutput });
	}

	// Return.
	if (!response) {
		throw new Error('`response` not defined');
	}

	const result: AWSLambda.APIGatewayProxyResultV2 = {
		body: JSON.stringify(response),
		statusCode: response.statusCode,
	};
	console.info(prefix, { result });
	return result;
}

const _typeCheck: AWSLambda.APIGatewayProxyHandlerV2 = handler;
void _typeCheck;
