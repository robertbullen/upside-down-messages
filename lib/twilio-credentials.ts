import { SSM } from 'aws-sdk';
import * as fs from 'fs/promises';
import * as yup from 'yup';

export interface TwilioCredentials {
	accountSid: string;
	apiKey: string;
	apiSecret: string;
}

export abstract class TwilioCredentials {
	public static async loadFromFile(
		filePath: string,
	): Promise<TwilioCredentials> {
		const prefix: string = `${TwilioCredentials.name}.${TwilioCredentials.loadFromFile.name}`;
		console.info(prefix, { filePath });

		const result: TwilioCredentials =
			await TwilioCredentials.schema().validate(
				JSON.parse(await fs.readFile(filePath, 'utf8')),
			);
		console.info(prefix, { result: TwilioCredentials.mask(result) });

		return result;
	}

	public static async loadFromParameterStore(
		ssm: SSM,
		parameterName: string,
	): Promise<TwilioCredentials> {
		const prefix: string = `${TwilioCredentials.name}.${TwilioCredentials.loadFromParameterStore.name}`;
		console.info(prefix, { parameterName });

		const getParameterInput: SSM.GetParameterRequest = {
			Name: parameterName,
			WithDecryption: true,
		};
		const getParameterOutput: SSM.GetParameterResult = await ssm
			.getParameter(getParameterInput)
			.promise();
		console.info(prefix, {
			getParameterOutput: {
				...getParameterOutput,
				Value: '<< REDACTED >>',
			},
		});

		const result: TwilioCredentials =
			await TwilioCredentials.schema().validate(
				JSON.parse(getParameterOutput.Parameter?.Value ?? ''),
			);
		console.info(prefix, { result: TwilioCredentials.mask(result) });

		return result;
	}

	public static mask(twilioCreds: TwilioCredentials): TwilioCredentials {
		function maskString(text: string): string {
			return [
				text.substring(0, 2),
				'*'.repeat(text.length - 4),
				text.substring(text.length - 2),
			].join('');
		}

		return {
			accountSid: maskString(twilioCreds.accountSid),
			apiKey: maskString(twilioCreds.apiKey),
			apiSecret: maskString(twilioCreds.apiSecret),
		};
	}

	public static schema(): yup.ObjectSchema<TwilioCredentials> {
		return yup
			.object({
				accountSid: yup.string().required(),
				apiKey: yup.string().required(),
				apiSecret: yup.string().required(),
			})
			.required();
	}
}
