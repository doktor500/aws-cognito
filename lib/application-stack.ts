import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ApplicationStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const testFn = new NodejsFunction(this, 'RecordPayment', {
            entry: './lambda/index.ts',
            runtime: lambda.Runtime.NODEJS_LATEST,
            handler: 'main',
            bundling: {
                externalModules: ['aws-sdk'],
                minify: true,
            },
        });
    }
}