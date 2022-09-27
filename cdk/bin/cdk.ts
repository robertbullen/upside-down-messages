#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register.js';
import { TwilioCredentials } from '../../lib/twilio-credentials.js';
import { env } from '../lib/environment.js';
import {
	UpsideDownMessagesStack,
	UpsideDownMessagesStackProps,
} from '../lib/upside-down-messages-stack.js';

const app = new cdk.App();

const props: UpsideDownMessagesStackProps = {
	domainName: env.UDM_DOMAIN_NAME,
	env: {
		account: env.UDM_AWS_ACCOUNT,
		region: env.UDM_AWS_REGION,
	},
	loggingBucketName: env.UDM_LOGGING_BUCKET_NAME,
	subdomain: env.UDM_SUBDOMAIN,
	smsDestinationPhone: env.UDM_SMS_DESTINATION_PHONE,
	smsSourcePhone: env.UDM_SMS_SOURCE_PHONE,
	twilioCreds: await TwilioCredentials.loadFromFile(
		env.UDM_TWILIO_CREDS_FILE_PATH,
	),
};

new UpsideDownMessagesStack(app, props);
