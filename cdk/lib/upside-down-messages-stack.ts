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
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import * as path from 'path';
import { Environment } from '../../lambda/environment';

function createId(suffix: string): string {
	return `UpsideDownMessages${suffix}`;
}

export interface UpsideDownMessagesStackProps {
	domainName: string;
	env: Required<cdk.Environment>;
	loggingBucketName: string;
	subdomain: string;
}

export class UpsideDownMessagesStack extends cdk.Stack {
	constructor(
		scope: Construct,
		{ domainName, env, loggingBucketName, subdomain }: UpsideDownMessagesStackProps,
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

		const topic = this.createSnsTopic();

		const messageQueue = this.createSqsMessageQueue();

		const websiteBucket = this.createS3WebsiteBucket({ fullDomainName, loggingBucket });

		const { apiFunctionUrl } = this.createLambdaApiFunction({
			fullDomainName,
			messageQueue,
			topic,
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

	private createLambdaApiFunction({
		fullDomainName,
		messageQueue,
		topic,
		websiteBucket,
	}: {
		fullDomainName: string;
		messageQueue: sqs.Queue;
		topic: sns.Topic;
		websiteBucket: s3.Bucket;
	}): { apiFunction: lambda.Function; apiFunctionUrl: lambda.FunctionUrl } {
		const environment: Environment = {
			S3_WEBSITE_BUCKET_NAME: websiteBucket.bucketName,
			SNS_TOPIC_ARN: topic.topicArn,
			SQS_QUEUE_URL: messageQueue.queueUrl,
			WEBSITE_BASE_URL: `https://${fullDomainName}/`,
		};

		const id = createId('ApiFunction');
		const apiFunction = new lambdaNodeJs.NodejsFunction(this, id, {
			architecture: lambda.Architecture.ARM_64,
			entry: path.join(__dirname, '../../lambda/index.ts'),
			environment: environment as unknown as Record<string, string>,
			functionName: id,
			initialPolicy: [
				new iam.PolicyStatement({
					actions: ['polly:SynthesizeSpeech'],
					effect: iam.Effect.ALLOW,
					resources: ['*'],
				}),
				new iam.PolicyStatement({
					actions: ['s3:PutObject'],
					effect: iam.Effect.ALLOW,
					resources: [websiteBucket.arnForObjects('audio/*')],
				}),
				new iam.PolicyStatement({
					actions: ['sns:Publish'],
					effect: iam.Effect.ALLOW,
					resources: [topic.topicArn],
				}),
				new iam.PolicyStatement({
					actions: ['sqs:GetQueueAttributes', 'sqs:SendMessage'],
					effect: iam.Effect.ALLOW,
					resources: [messageQueue.queueArn],
				}),
			],
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
			sources: [s3Deployment.Source.asset(path.join(__dirname, '../../website'))],
		});

		return bucket;
	}

	private createSnsTopic(): sns.Topic {
		const id = createId('Topic');
		return new sns.Topic(this, id, {
			displayName: 'Upside Down Messages',
			fifo: false,
			topicName: id,
		});
	}

	private createSqsMessageQueue(): sqs.Queue {
		const id = createId('MessageQueue');
		return new sqs.Queue(this, id, { queueName: id });
	}

	private importRoute53HostedZone({ domainName }: { domainName: string }): route53.IHostedZone {
		return route53.HostedZone.fromLookup(this, 'HostedZone', { domainName });
	}

	private importS3LoggingBucket({
		loggingBucketName,
	}: {
		loggingBucketName: string;
	}): s3.IBucket {
		return s3.Bucket.fromBucketName(this, createId('LoggingBucket'), loggingBucketName);
	}
}
