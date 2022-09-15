# upside-down-messages

This project displays messages via Christmas lights strung over an alphabet board like in Stranger Things season 1 episode 3.

## Technologies and Equipment

### Software

- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/en/)
- AWS
    - [CDK](https://aws.amazon.com/cdk/)
    - Serverless
        - [CloudFront](https://aws.amazon.com/cloudfront/)
        - [Lambda](https://aws.amazon.com/lambda/)
        - [Polly](https://aws.amazon.com/polly/)
        - [S3](https://aws.amazon.com/s3/)
        - [SNS](https://aws.amazon.com/sns/)
        - [SQS](https://aws.amazon.com/sqs/)

### Hardware

- [Raspberry Pi 3 Model B](https://www.raspberrypi.com/products/raspberry-pi-3-model-b/)
- [ALITOVE WS2811 RGB LED String Lights](https://a.co/d/0QRnQ6d)
- [ALITOVE DC 12V 5A Power Supply](https://a.co/d/bSRcNRz)

## Architecture

```mermaid
sequenceDiagram
    actor user as User Browser
    participant cloudfront as AWS CloudFront
    participant s3 as AWS S3
    participant lambda as AWS Lambda
    participant polly as AWS Polly
    participant sqs as AWS SQS
    participant sns as AWS SNS
    participant pi as Raspberry Pi
    participant lights as Christmas Lights

    Note over user: 1. User loads web page

    user->>+cloudfront: GET /
        cloudfront->>+s3: GET /
        s3-->-cloudfront: 200 OK { index.html }
    cloudfront-->>-user: 200 OK { index.html }

    Note over user: 2. User submits message

    user->>+cloudfront: POST /api/messages { text }
        cloudfront->>+lambda: POST /api/messages { text }
            lambda->>+polly: synthesizeSpeech({ text })
            polly-->>-lambda: { audio }

            lambda-)s3: putObject({ text })
            lambda-)s3: putObject({ audio })
    
            lambda-)sqs: sendMessage({ text, audio })

            lambda-)sns: publish({ text, audio })
        lambda-->>-cloudfront: 200 OK
    cloudfront-->>-user: 200 OK

    Note over pi: 3. Raspberry Pi gets user messages and displays them

    pi->>+sqs: receiveMessage
    sqs-->>-pi: { text, audio }
    pi->>lights: animate lights
    
    lights-->>user: observe lights
    Note over user: 4. User sees their message spelled out
```
