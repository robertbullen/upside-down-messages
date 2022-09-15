#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import {
	UpsideDownMessagesStack,
	UpsideDownMessagesStackProps,
} from '../lib/upside-down-messages-stack';

const app = new cdk.App();

const props: UpsideDownMessagesStackProps = {
	domainName: process.env['UDM_DOMAIN_NAME']!,
	env: {
		account: process.env['UDM_AWS_ACCOUNT'] || process.env['CDK_DEFAULT_ACCOUNT']!,
		region: process.env['UDM_AWS_REGION'] || process.env['CDK_DEFAULT_REGION']!,
	},
	loggingBucketName: process.env['UDM_LOGGING_BUCKET_NAME']!,
	subdomain: process.env['UDM_SUBDOMAIN']!,
};

new UpsideDownMessagesStack(app, props);
