import AWS, { Polly, S3, SQS, SSM } from 'aws-sdk';
import * as crypto from 'crypto';
import * as url from 'url';
import * as util from 'util';
import * as yup from 'yup';
import {
	AudioFormat,
	AudioMessage,
	Message,
	MessageRequest,
	MessageResponse,
} from '../../lib/messages.js';
import { env } from './environment.js';
import { isProfane } from './profanity.js';
import { SmsService } from './sms-service.js';

util.inspect.defaultOptions.depth = Number.POSITIVE_INFINITY;

// Initialize clients.
AWS.config.logger = console;

const polly = env.OPTION_PERFORM_TEXT_TO_SPEECH ? new Polly() : undefined;
const s3 = new S3();
const ssm = new SSM();
const sqs = new SQS();

const sms = new SmsService(
	ssm,
	env.SSM_TWILIO_CREDS_PARMETER_NAME,
	env.SMS_SOURCE_PHONE,
	env.SMS_DESTINATION_PHONE,
);

export async function handler(
	event: AWSLambda.APIGatewayProxyEventV2,
	_context: AWSLambda.Context,
	_callback: AWSLambda.APIGatewayProxyCallbackV2,
): Promise<AWSLambda.APIGatewayProxyResultV2> {
	const prefix: string = handler.name;
	console.info(prefix, { event });

	const body: unknown = JSON.parse(event.body ?? '');
	console.info(prefix, { body });

	let request: MessageRequest | undefined;
	let response: MessageResponse | undefined;
	let responseStatusCode: number | undefined;

	// Validate the payload.
	try {
		request = await MessageRequest.schema().validate(body, {
			stripUnknown: true,
		});
		console.info(prefix, { request });
	} catch (error) {
		if (yup.ValidationError.isError(error)) {
			response = {
				errorMessage: error.message,
				request,
			};
			responseStatusCode = 400;
		} else {
			throw error;
		}
	}

	if (request) {
		// Check for profanity in the message. If present, less work will be done with the message
		// and an error will be returned to the client.
		const isTextProfane: boolean = isProfane(request.text);
		console.info(prefix, { isTextProfane });

		if (isTextProfane) {
			response = {
				errorCode: 'profanity-detected',
				request,
			};
			responseStatusCode = 400;
		} else {
			// Create an ID for the message by hashing its text. This may result in non-unique IDs,
			// but that's OK for current purposes.
			const messageId: string = crypto.createHash('md5').update(request.text).digest('hex');

			// Synthesize the message text to speech.
			const audioFormat = AudioFormat.mp3;
			let audioDataBase64: string | undefined;
			let putAudioInput: S3.PutObjectRequest | undefined;

			if (env.OPTION_PERFORM_TEXT_TO_SPEECH && polly) {
				const synthSpeechInput: Polly.SynthesizeSpeechInput = {
					OutputFormat: audioFormat,
					Text: request.text,
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

				audioDataBase64 = synthSpeechOutput.AudioStream.toString('base64');

				// Save the message text and audio to the bucket.
				putAudioInput = {
					Body: synthSpeechOutput.AudioStream,
					Bucket: env.S3_WEBSITE_BUCKET_NAME,
					ContentType: synthSpeechOutput.ContentType,
					Key: `messages/${messageId}.mp3`,
				};
			}

			const jsonKey = `messages/${messageId}.json`;
			const message: Message | AudioMessage = {
				audioDataBase64,
				audioFormat: env.OPTION_PERFORM_TEXT_TO_SPEECH ? audioFormat : undefined,
				audioUrl:
					putAudioInput &&
					new url.URL(putAudioInput.Key, env.WEBSITE_BASE_URL).toString(),
				messageId,
				text: request.text,
				url: new url.URL(jsonKey, env.WEBSITE_BASE_URL).toString(),
			};
			console.info(prefix, { message });

			const putJsonInput: S3.PutObjectRequest = {
				Body: JSON.stringify(message, undefined, '\t'),
				Bucket: env.S3_WEBSITE_BUCKET_NAME,
				ContentType: 'application/json',
				Key: jsonKey,
			};

			const [putAudioOutput, putJsonOutput] = await Promise.all([
				putAudioInput ? s3.putObject(putAudioInput).promise() : Promise.resolve(undefined),
				s3.putObject(putJsonInput).promise(),
			]);
			console.info(prefix, { putAudioOutput, putJsonOutput });

			// Submit the message to the queue.
			const sendMessageInput: SQS.SendMessageRequest = {
				MessageBody: JSON.stringify(message),
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
			const getQueueAttributesOutput: SQS.GetQueueAttributesResult = await sqs
				.getQueueAttributes(getQueueAttributesInput)
				.promise();
			console.info(prefix, { getQueueAttributesOutput });
			const approximateQueueIndex: number = Number(
				getQueueAttributesOutput.Attributes?.['ApproximateNumberOfMessages'],
			);

			response = {
				approximateQueueIndex,
				message,
			};
			responseStatusCode = 200;
		}

		// Notify the administrator that a message was received.
		await sms.sendSms(request.text);
	}

	// Return.
	if (response === undefined) {
		throw new Error('`response` not defined');
	}
	if (responseStatusCode === undefined) {
		throw new Error('`responseStatusCode` not defined');
	}

	const result: AWSLambda.APIGatewayProxyResultV2 = {
		body: JSON.stringify(response),
		statusCode: responseStatusCode,
	};
	console.info(prefix, { result });

	return result;
}

const _typeCheck: AWSLambda.APIGatewayProxyHandlerV2 = handler;
void _typeCheck;
