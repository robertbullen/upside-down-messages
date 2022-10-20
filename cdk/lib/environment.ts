import * as yup from 'yup';

export interface Environment {
	UDM_AWS_ACCOUNT: string;
	UDM_AWS_REGION: string;
	UDM_DOMAIN_NAME: string;
	UDM_OPTION_PERFORM_TEXT_TO_SPEECH: boolean;
	UDM_S3_LOGGING_BUCKET_NAME: string;
	UDM_SMS_DESTINATION_PHONE: string;
	UDM_SMS_SOURCE_PHONE: string;
	UDM_SUBDOMAIN: string;
	UDM_TWILIO_CREDS_FILE_PATH: string;
}

export abstract class Environment {
	public static schema(): yup.ObjectSchema<Environment> {
		return yup
			.object({
				UDM_AWS_ACCOUNT: yup.string().required(),
				UDM_AWS_REGION: yup.string().required(),
				UDM_DOMAIN_NAME: yup.string().required(),
				UDM_OPTION_PERFORM_TEXT_TO_SPEECH: yup.boolean().required(),
				UDM_S3_LOGGING_BUCKET_NAME: yup.string().required(),
				UDM_SMS_DESTINATION_PHONE: yup.string().required(),
				UDM_SMS_SOURCE_PHONE: yup.string().required(),
				UDM_SUBDOMAIN: yup.string().required(),
				UDM_TWILIO_CREDS_FILE_PATH: yup.string().required(),
			})
			.required();
	}
}

export const env: Environment = Environment.schema().validateSync(process.env, {
	stripUnknown: true,
});
