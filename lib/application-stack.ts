import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ApplicationStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const lambdaFunction = new NodejsFunction(this, 'PostPayment', {
            entry: './lambda/index.ts',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'main',
            bundling: {
                externalModules: ['aws-sdk'],
                minify: true,
            },
        });

        new LambdaRestApi(this, 'ApiGwEndpoint', {
            handler: lambdaFunction,
            restApiName: 'PaymentsApi',
        });
    }
}