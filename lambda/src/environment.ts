import * as yup from 'yup';

export interface Environment {
	S3_WEBSITE_BUCKET_NAME: string;
	SNS_TOPIC_ARN: string;
	SQS_QUEUE_URL: string;
	WEBSITE_BASE_URL: string;
}

export class Environment {
	public static schema(): yup.ObjectSchema<Environment> {
		return yup
			.object({
				S3_WEBSITE_BUCKET_NAME: yup.string().required(),
				SNS_TOPIC_ARN: yup.string().required(),
				SQS_QUEUE_URL: yup.string().url().required(),
				WEBSITE_BASE_URL: yup.string().url().required(),
			})
			.required();
	}
}

export const env: Environment = Environment.schema().validateSync(process.env);
