import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import * as dynamoDb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ApplicationStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const paymentsTable = new dynamoDb.Table(this, 'payments', {
            partitionKey: { name: "pk", type: dynamoDb.AttributeType.STRING },
            billingMode: dynamoDb.BillingMode.PAY_PER_REQUEST,
        });

        const createPaymentFunction = new NodejsFunction(this, 'CreatePaymentFunction', {
            entry: './lambda/index.ts',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'main',
            bundling: {
                externalModules: ['aws-sdk'],
                minify: true,
            },
            environment: {
                PAYMENTS_TABLE_NAME: paymentsTable.tableName,
            }
        });

        new LambdaRestApi(this, 'ApiGwEndpoint', {
            handler: createPaymentFunction,
            restApiName: 'PaymentsApi',
        });
    }
}