import AWS from 'aws-sdk';
import * as yup from 'yup';
import { env } from './environment.js';

AWS.config.logger = console;
AWS.config.region = env.AWS_DEFAULT_REGION;

export async function* receiveMessages<T>(
	queueUrl: string,
	schema: yup.Schema<T>,
	signal?: AbortSignal,
): AsyncGenerator<T | undefined> {
	const prefix: string = receiveMessages.name;
	console.info(prefix, { queueUrl });

	const sqs = new AWS.SQS();
	const receiveMessageInput: AWS.SQS.ReceiveMessageRequest = {
		QueueUrl: queueUrl,
		MaxNumberOfMessages: 1,
		WaitTimeSeconds: 10,
	};

	for (; !signal?.aborted; ) {
		const receiveMessageOutput: AWS.SQS.ReceiveMessageResult = await sqs
			.receiveMessage(receiveMessageInput)
			.promise();
		console.info(prefix, { receiveMessageOutput });

		if (!receiveMessageOutput.Messages) {
			yield undefined;
		} else {
			for (const message of receiveMessageOutput.Messages) {
				const deleteMessageInput: AWS.SQS.DeleteMessageRequest = {
					QueueUrl: queueUrl,
					ReceiptHandle: message.ReceiptHandle || '',
				};
				await sqs.deleteMessage(deleteMessageInput).promise();

				const result: T = schema.validateSync(
					JSON.parse(message.Body ?? ''),
				);
				yield result;
			}
		}
	}
}
