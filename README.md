# upside-down-messages

This project displays messages via Christmas lights strung over an alphabet board like in Stranger Things season 1 episode 3.

## Technologies and Equipment

### Hardware

- [Raspberry Pi 3 Model B](https://www.raspberrypi.com/products/raspberry-pi-3-model-b/)
- [ALITOVE WS2811 RGB LED String Lights](https://a.co/d/0QRnQ6d)
- [ALITOVE DC 12V 5A Power Supply](https://a.co/d/bSRcNRz)

### Software

- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/en/)
- [GreenSock Animation Platform](https://greensock.com/gsap/)
- [AWS CDK](https://aws.amazon.com/cdk/)

### Services

- [AWS CloudFront](https://aws.amazon.com/cloudfront/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [AWS Polly](https://aws.amazon.com/polly/)
- [AWS S3](https://aws.amazon.com/s3/)
- [AWS SQS](https://aws.amazon.com/sqs/)
- [Twilio SMS](https://twilio.com)

## Architecture

```mermaid
sequenceDiagram
    actor user as User Browser
    participant cloudfront as AWS CloudFront
    participant s3 as AWS S3
    participant lambda as AWS Lambda
    participant polly as AWS Polly
    participant sqs as AWS SQS
    participant twilio as Twilio SMS
    participant pi as Raspberry Pi
    participant lights as Christmas Lights
    actor admin as Administrator

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

            lambda-)twilio: sendSms({ text, audio })

            Note over admin: 3. Admin is notified of message
            twilio-)admin: deliverSms({ text, audio })
        lambda-->>-cloudfront: 200 OK
    cloudfront-->>-user: 200 OK

    Note over pi: 4. Raspberry Pi gets user messages and displays them

    pi->>+sqs: receiveMessage
    sqs-->>-pi: { text, audio }
    pi->>lights: animate lights
    
    lights-->>user: observe lights
    Note over user: 5. User sees their message spelled out
```
