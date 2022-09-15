import * as yup from 'yup';

export interface Environment {
	AWS_DEFAULT_REGION: string;
	SQS_QUEUE_URL: string;
}

export class Environment {
	public static schema(): yup.ObjectSchema<Environment> {
		return yup.object({
			AWS_DEFAULT_REGION: yup.string().required(),
			SQS_QUEUE_URL: yup.string().url().required(),
		});
	}
}

export const env: Environment = Environment.schema().validateSync(process.env, {
	stripUnknown: true,
});
