import "dotenv/config";
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apiGatewayV2 from "aws-cdk-lib/aws-apigatewayv2";
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { AuthStack } from "./auth-stack";

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const authStack = new AuthStack(scope, "AuthStack", props);

    const paymentsTable = new dynamoDb.Table(this, "paymentsTable", {
      partitionKey: { name: "pk", type: dynamoDb.AttributeType.STRING },
      tableName: process.env.PAYMENTS_TABLE_NAME,
      billingMode: dynamoDb.BillingMode.PAY_PER_REQUEST,
    });

    const createPaymentFunction = new NodejsFunction(this, "createPaymentFunction", {
      entry: "./lambda/payments/index.ts",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "createPayment",
      environment: {
        PAYMENTS_TABLE_NAME: paymentsTable.tableName,
      },
    });

    paymentsTable.grantReadWriteData(createPaymentFunction);

    const paymentsApiRole = new iam.Role(this, "paymentsApiRole", {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("apigateway.amazonaws.com"),
        new iam.ServicePrincipal("lambda.amazonaws.com")
      ),
      inlinePolicies: {
        invokeLambda: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              resources: [createPaymentFunction.functionArn],
              actions: ["lambda:InvokeFunction"],
            }),
          ],
        }),
      },
    });

    const paymentsApi = new apiGatewayV2.CfnApi(this, "paymentsApi", {
      protocolType: "HTTP",
      name: "PaymentsAPI",
    });

    const jwtAuth = new apiGatewayV2.CfnAuthorizer(this, "jwtAuth", {
      name: "jwt-authorizer",
      apiId: paymentsApi.attrApiId,
      authorizerType: "JWT",
      identitySource: ["$request.header.Authorization"],
      jwtConfiguration: {
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${authStack.userPool.userPoolId}`,
        audience: [authStack.appClient.userPoolClientId],
      },
    });

    const paymentsApiIntegration = new apiGatewayV2.CfnIntegration(this, "paymentsApiIntegration", {
      apiId: paymentsApi.attrApiId,
      integrationType: "AWS_PROXY",
      integrationUri: createPaymentFunction.functionArn,
      payloadFormatVersion: "1.0",
      credentialsArn: paymentsApiRole.roleArn,
    });

    const createPaymentRoute = new apiGatewayV2.CfnRoute(this, "createPaymentRoute", {
      apiId: paymentsApi.attrApiId,
      routeKey: "POST /payments",
      target: `integrations/${paymentsApiIntegration.ref}`,
      authorizationType: "JWT",
      authorizerId: jwtAuth.ref,
    });

    const paymentsApiDeployment = new apiGatewayV2.CfnDeployment(this, "paymentsApiDeployment", {
      apiId: paymentsApi.attrApiId,
    });

    paymentsApiDeployment.addDependency(createPaymentRoute);

    const paymentsApiStage = new apiGatewayV2.CfnStage(this, "paymentsApiStage", {
      apiId: paymentsApi.attrApiId,
      stageName: "api",
      deploymentId: paymentsApiDeployment.attrDeploymentId,
    });

    new CfnOutput(this, "createPaymentUrl", {
      value: `https://${paymentsApi.ref}.execute-api.${this.region}.amazonaws.com/${paymentsApiStage.stageName}/${createPaymentRoute.routeKey.split(" ")[1]}`,
      description: "Endpoint URL for creating a payment",
    });
  }
}
