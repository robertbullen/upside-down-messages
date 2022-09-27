import * as yup from 'yup';

export const AudioFormat = {
	mp3: 'mp3',
	oggVorbis: 'ogg_vorbis',
	pcm: 'pcm',
} as const;

export type AudioFormat = typeof AudioFormat[keyof typeof AudioFormat];

export interface Message {
	audioDataBase64: string;
	audioFormat: AudioFormat;
	audioUrl: string;
	messageId: string;
	textUrl: string;
	text: string;
}

export abstract class Message {
	public static schema(): yup.ObjectSchema<Message> {
		return yup
			.object({
				audioDataBase64: yup.string().required(),
				audioFormat: yup
					.string<AudioFormat>()
					.oneOf(Object.values(AudioFormat))
					.required(),
				audioUrl: yup.string().url().required(),
				messageId: yup.string().required(),
				textUrl: yup.string().url().required(),
				text: yup.string().required(),
			})
			.required();
	}
}
