import * as yup from 'yup';

/**
 * The data type that clients request to the server for `POST /api/messages`.
 */
export interface MessageRequest {
	text: string;
}

export abstract class MessageRequest {
	public static schema(): yup.ObjectSchema<MessageRequest> {
		return yup
			.object({
				text: yup.string().trim().required(),
			})
			.required();
	}
}

export interface OkMessageResponse {
	approximateQueueIndex: number;
	message: Message | AudioMessage;
}

export interface BadRequestMessageResponse {
	errorMessage: string;
	request: unknown;
}

export interface ProfaneTextMessageResponse {
	errorCode: 'profanity-detected';
	request: MessageRequest;
}

/**
 * The data type that the server responds with to clients for `POST /api/messages`.
 */
export type MessageResponse =
	| OkMessageResponse
	| BadRequestMessageResponse
	| ProfaneTextMessageResponse;

export interface Message {
	messageId: string;
	text: string;
	url: string;
}

export abstract class Message {
	public static schema(): yup.ObjectSchema<Message> {
		return yup
			.object({
				messageId: yup.string().required(),
				text: yup.string().required(),
				url: yup.string().url().required(),
			})
			.required();
	}
}

export const AudioFormat = {
	mp3: 'mp3',
	oggVorbis: 'ogg_vorbis',
	pcm: 'pcm',
} as const;

export type AudioFormat = typeof AudioFormat[keyof typeof AudioFormat];

export interface AudioMessage extends Message {
	audioDataBase64: string;
	audioFormat: AudioFormat;
	audioUrl: string;
}

export abstract class AudioMessage extends Message {
	public static override schema(): yup.ObjectSchema<AudioMessage> {
		return Message.schema()
			.shape({
				audioDataBase64: yup.string().required(),
				audioFormat: yup.string<AudioFormat>().oneOf(Object.values(AudioFormat)).required(),
				audioUrl: yup.string().url().required(),
			})
			.required();
	}
}
