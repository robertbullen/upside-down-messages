import { SSM } from 'aws-sdk';
import twilio from 'twilio';
import { TwilioCredentials } from '../../lib/twilio-credentials.js';

export class SmsService {
	public constructor(
		private readonly _ssm: SSM,
		private readonly _ssmParameterName: string,
		private readonly _sourcePhone: string,
		private readonly _destinationPhone: string,
	) {}

	public async sendSms(text: string): Promise<void> {
		const prefix: string = `${SmsService.name}.${this.sendSms.name}`;
		console.info(prefix, { text });

		const twilioClient: twilio.Twilio = await this.getTwilioClient();
		const message /*: twilio.MessageInstance*/ =
			await twilioClient.messages.create({
				body: text,
				from: this._sourcePhone,
				to: this._destinationPhone,
			});
		console.info(prefix, { message });
	}

	private async getTwilioClient(): Promise<twilio.Twilio> {
		const timestampMillis: number = Date.now();
		if (
			!this._twilioClientPromise ||
			timestampMillis - this._twilioClientTimestampMillis >
				SmsService.TIME_TO_LIVE_MILLIS
		) {
			this._twilioClientTimestampMillis = timestampMillis;
			this._twilioClientPromise =
				TwilioCredentials.loadFromParameterStore(
					this._ssm,
					this._ssmParameterName,
				).then(
					(creds: TwilioCredentials): twilio.Twilio =>
						twilio(creds.apiKey, creds.apiSecret, {
							accountSid: creds.accountSid,
						}),
				);
		}
		return this._twilioClientPromise;
	}

	private static TIME_TO_LIVE_MILLIS: number = 60 * 1000;
	private _twilioClientPromise: Promise<twilio.Twilio> | undefined;
	private _twilioClientTimestampMillis: number = 0;
}
