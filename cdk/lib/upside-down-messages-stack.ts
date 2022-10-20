import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Environment as LambdaEnvironment } from '../../lambda/src/environment.js';
import { TwilioCredentials } from '../../lib/twilio-credentials.js';

export interface UpsideDownMessagesStackProps {
	domainName: string;
	env: Required<cdk.Environment>;
	loggingBucketName: string;
	optionPerformTextToSpeech: boolean;
	smsDestinationPhone: string;
	smsSourcePhone: string;
	subdomain: string;
	twilioCreds: TwilioCredentials;
}

export class UpsideDownMessagesStack extends cdk.Stack {
	constructor(
		scope: Construct,
		{
			domainName,
			env,
			loggingBucketName,
			optionPerformTextToSpeech,
			smsDestinationPhone,
			smsSourcePhone,
			subdomain,
			twilioCreds,
		}: UpsideDownMessagesStackProps,
	) {
		const id = createId('Stack');
		super(scope, id, {
			env,
			stackName: id,
		});

		// Import existing resources.
		const loggingBucket = this.importS3LoggingBucket({ loggingBucketName });
		const zone = this.importRoute53HostedZone({ domainName });

		// Create new resources.
		const fullDomainName = `${subdomain}.${domainName}`;

		const websiteBucket = this.createS3WebsiteBucket({
			fullDomainName,
			loggingBucket,
		});

		const messageQueue = this.createSqsMessageQueue();

		const accessKey = this.createIamRpiAccessKey({ messageQueue });

		const twilioCredsParameter = this.createSsmTwilioCredsParameter({
			twilioCreds,
		});

		const { apiFunctionUrl } = this.createLambdaApiFunction({
			fullDomainName,
			messageQueue,
			optionPerformTextToSpeech,
			smsDestinationPhone,
			smsSourcePhone,
			twilioCredsParameter,
			websiteBucket,
		});

		const certificate = this.createAcmCertificate({ fullDomainName, zone });

		const distribution = this.createCloudFrontDistribution({
			apiFunctionUrl,
			certificate,
			fullDomainName,
			loggingBucket,
			websiteBucket,
		});

		this.createRoute53WebsiteARecord({ distribution, subdomain, zone });

		// Export the values needed as environment variables on the Raspberry Pi.
		new cdk.CfnOutput(this, 'awsAccessKeyId', { value: accessKey.accessKeyId });
		new cdk.CfnOutput(this, 'awsDefaultRegion', { value: env.region });
		new cdk.CfnOutput(this, 'awsSecretAccessKey', {
			value: accessKey.secretAccessKey.unsafeUnwrap(),
		});
		new cdk.CfnOutput(this, 'sqsQueueUrl', { value: messageQueue.queueUrl });
	}

	private createAcmCertificate({
		fullDomainName,
		zone,
	}: {
		fullDomainName: string;
		zone: route53.IHostedZone;
	}): acm.Certificate {
		const id = createId('Certificate');
		return new acm.DnsValidatedCertificate(this, id, {
			cleanupRoute53Records: true,
			domainName: fullDomainName,
			hostedZone: zone,
			region: 'us-east-1',
		});
	}

	private createCloudFrontDistribution({
		apiFunctionUrl,
		certificate,
		fullDomainName,
		loggingBucket,
		websiteBucket,
	}: {
		apiFunctionUrl: lambda.FunctionUrl;
		certificate: acm.Certificate;
		fullDomainName: string;
		loggingBucket: s3.IBucket;
		websiteBucket: s3.Bucket;
	}): cloudfront.Distribution {
		const id = createId('Distribution');
		return new cloudfront.Distribution(this, id, {
			certificate,
			comment: id,
			additionalBehaviors: {
				'/api/*': {
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
					origin: new cloudfrontOrigins.HttpOrigin(
						cdk.Fn.parseDomainName(apiFunctionUrl.url),
					),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
				},
			},
			defaultBehavior: {
				allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
				cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
				origin: new cloudfrontOrigins.S3Origin(websiteBucket),
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
			},
			logBucket: loggingBucket,
			logFilePrefix: `${this.stackName}/cloudfront`,
			priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
			domainNames: [fullDomainName],
		});
	}

	private createIamRpiAccessKey({ messageQueue }: { messageQueue: sqs.Queue }): iam.AccessKey {
		const userId = createId('RpiUser');
		const user = new iam.User(this, userId, { userName: userId });
		user.addToPolicy(
			new iam.PolicyStatement({
				actions: ['sqs:DeleteMessage', 'sqs:ReceiveMessage'],
				effect: iam.Effect.ALLOW,
				resources: [messageQueue.queueArn],
			}),
		);

		const accessKeyId = createId('RpiAccessKey');
		return new iam.AccessKey(this, accessKeyId, {
			user: user as iam.IUser,
		});
	}

	private createLambdaApiFunction({
		fullDomainName,
		messageQueue,
		optionPerformTextToSpeech,
		smsDestinationPhone,
		smsSourcePhone,
		twilioCredsParameter,
		websiteBucket,
	}: {
		fullDomainName: string;
		messageQueue: sqs.Queue;
		optionPerformTextToSpeech: boolean;
		smsDestinationPhone: string;
		smsSourcePhone: string;
		twilioCredsParameter: ssm.StringParameter;
		websiteBucket: s3.Bucket;
	}): { apiFunction: lambda.Function; apiFunctionUrl: lambda.FunctionUrl } {
		const id = createId('ApiFunction');

		const lambdaEnvironment: LambdaEnvironment = {
			OPTION_PERFORM_TEXT_TO_SPEECH: optionPerformTextToSpeech,
			S3_WEBSITE_BUCKET_NAME: websiteBucket.bucketName,
			SSM_TWILIO_CREDS_PARMETER_NAME: twilioCredsParameter.parameterName,
			SMS_DESTINATION_PHONE: smsDestinationPhone,
			SMS_SOURCE_PHONE: smsSourcePhone,
			SQS_QUEUE_URL: messageQueue.queueUrl,
			WEBSITE_BASE_URL: `https://${fullDomainName}/`,
		};
		const environment: Record<string, string> = {};
		for (const key in lambdaEnvironment) {
			if (Object.prototype.hasOwnProperty.call(lambdaEnvironment, key)) {
				environment[key] = lambdaEnvironment[key as keyof LambdaEnvironment].toString();
			}
		}

		const initialPolicy: iam.PolicyStatement[] = [
			new iam.PolicyStatement({
				actions: ['s3:PutObject'],
				effect: iam.Effect.ALLOW,
				resources: [websiteBucket.arnForObjects('messages/*')],
			}),
			new iam.PolicyStatement({
				actions: ['sqs:GetQueueAttributes', 'sqs:SendMessage'],
				effect: iam.Effect.ALLOW,
				resources: [messageQueue.queueArn],
			}),
			new iam.PolicyStatement({
				actions: ['ssm:GetParameter'],
				effect: iam.Effect.ALLOW,
				resources: [twilioCredsParameter.parameterArn],
			}),
		];
		if (optionPerformTextToSpeech) {
			initialPolicy.push(
				new iam.PolicyStatement({
					actions: ['polly:SynthesizeSpeech'],
					effect: iam.Effect.ALLOW,
					resources: ['*'],
				}),
			);
		}

		const apiFunction = new lambdaNodeJs.NodejsFunction(this, id, {
			architecture: lambda.Architecture.ARM_64,
			// bundling: {
			// 	format: lambdaNodeJs.OutputFormat.ESM,
			// 	sourceMap: true,
			// },
			entry: '../lambda/src/index.ts',
			environment,
			functionName: id,
			initialPolicy,
			runtime: lambda.Runtime.NODEJS_16_X,
			memorySize: 256,
		});

		const apiFunctionUrl = apiFunction.addFunctionUrl({
			authType: lambda.FunctionUrlAuthType.NONE,
			cors: {
				allowedHeaders: ['Content-Type'],
				allowedMethods: [lambda.HttpMethod.POST],
				allowedOrigins: ['*'],
			},
		});

		return { apiFunction, apiFunctionUrl };
	}

	private createRoute53WebsiteARecord({
		distribution,
		subdomain,
		zone,
	}: {
		distribution: cloudfront.Distribution;
		subdomain: string;
		zone: route53.IHostedZone;
	}): route53.ARecord {
		return new route53.ARecord(this, createId('WebsiteARecord'), {
			recordName: subdomain,
			target: route53.RecordTarget.fromAlias(
				new route53Targets.CloudFrontTarget(distribution),
			),
			zone,
		});
	}

	private createS3WebsiteBucket({
		fullDomainName,
		loggingBucket,
	}: {
		fullDomainName: string;
		loggingBucket: s3.IBucket;
	}): s3.Bucket {
		const bucketName = fullDomainName;
		const bucket = new s3.Bucket(this, createId('WebsiteBucket'), {
			autoDeleteObjects: true,
			bucketName,
			publicReadAccess: true,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			serverAccessLogsBucket: loggingBucket,
			serverAccessLogsPrefix: `${this.stackName}/s3`,
			websiteIndexDocument: 'index.html',
		});

		new s3Deployment.BucketDeployment(this, createId('WebsiteBucketDeployment'), {
			destinationBucket: bucket,
			sources: [s3Deployment.Source.asset('../website/public')],
		});

		return bucket;
	}

	private createSqsMessageQueue(): sqs.Queue {
		const id = createId('MessageQueue');
		return new sqs.Queue(this, id, { queueName: id });
	}

	private createSsmTwilioCredsParameter({
		twilioCreds,
	}: {
		twilioCreds: TwilioCredentials;
	}): ssm.StringParameter {
		return new ssm.StringParameter(this, createId('TwilioCredsParameter'), {
			parameterName: `/${stackRootName}/TwilioCreds`,
			stringValue: JSON.stringify(twilioCreds, undefined, '\t'),
			// Creating a secure string parameter is not supported by CloudFormation at the time of
			// this writing.
			// type: ssm.ParameterType.SECURE_STRING,
		});
	}

	private importRoute53HostedZone({ domainName }: { domainName: string }): route53.IHostedZone {
		return route53.HostedZone.fromLookup(this, 'HostedZone', {
			domainName,
		});
	}

	private importS3LoggingBucket({
		loggingBucketName,
	}: {
		loggingBucketName: string;
	}): s3.IBucket {
		return s3.Bucket.fromBucketName(this, createId('LoggingBucket'), loggingBucketName);
	}
}

const stackRootName = `UpsideDownMessages`;

function createId(suffix: string): string {
	return `${stackRootName}${suffix}`;
}
