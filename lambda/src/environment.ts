import * as yup from 'yup';

export interface Environment {
	OPTION_PERFORM_TEXT_TO_SPEECH: boolean;
	S3_WEBSITE_BUCKET_NAME: string;
	SSM_TWILIO_CREDS_PARMETER_NAME: string;
	SMS_DESTINATION_PHONE: string;
	SMS_SOURCE_PHONE: string;
	SQS_QUEUE_URL: string;
	WEBSITE_BASE_URL: string;
}

export class Environment {
	public static schema(): yup.ObjectSchema<Environment> {
		return yup
			.object({
				OPTION_PERFORM_TEXT_TO_SPEECH: yup.boolean().required(),
				S3_WEBSITE_BUCKET_NAME: yup.string().required(),
				SSM_TWILIO_CREDS_PARMETER_NAME: yup.string().required(),
				SMS_DESTINATION_PHONE: yup.string().required(),
				SMS_SOURCE_PHONE: yup.string().required(),
				SQS_QUEUE_URL: yup.string().url().required(),
				WEBSITE_BASE_URL: yup.string().url().required(),
			})
			.required();
	}
}

export const env: Environment = Environment.schema().validateSync(process.env, {
	stripUnknown: true,
});
