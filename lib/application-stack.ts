import "dotenv/config";
import { Stack, StackProps, RemovalPolicy, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apiGatewayV2 from "aws-cdk-lib/aws-apigatewayv2";
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, "userPool", {
      removalPolicy: RemovalPolicy.DESTROY,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
    });

    new cognito.UserPoolDomain(this, "userPoolDomain", {
      userPool,
      cognitoDomain: {
        domainPrefix: "kenfos",
      },
    });

    const appClient = userPool.addClient("appClient", {
      userPoolClientName: "AppClient",
      idTokenValidity: Duration.days(1),
      accessTokenValidity: Duration.days(1),
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
        callbackUrls: [`http://localhost:8000/callback`], // TODO update
      },
      generateSecret: true,
    });

    const paymentsTable = new dynamoDb.Table(this, "paymentsTable", {
      partitionKey: { name: "pk", type: dynamoDb.AttributeType.STRING },
      tableName: process.env.PAYMENTS_TABLE_NAME,
      billingMode: dynamoDb.BillingMode.PAY_PER_REQUEST,
    });

    const createPaymentFunction = new NodejsFunction(this, "createPaymentFunction", {
      entry: "./lambda/index.ts",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "createPayment",
      environment: {
        PAYMENTS_TABLE_NAME: paymentsTable.tableName,
      },
    });

    paymentsTable.grantReadWriteData(createPaymentFunction);

    const apiRole = new iam.Role(this, "apiRole", {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("apigateway.amazonaws.com"),
        new iam.ServicePrincipal("lambda.amazonaws.com"),
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

    const httpAPI = new apiGatewayV2.CfnApi(this, "httpAPI", {
      protocolType: "HTTP",
      name: "PaymentsAPI",
      corsConfiguration: {
        maxAge: 6000,
      },
    });

    const issuer = `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`;

    const jwtAuth = new apiGatewayV2.CfnAuthorizer(this, "jwtAuth", {
      name: "jwt-authorizer-payments-api",
      apiId: httpAPI.attrApiId,
      authorizerType: "JWT",
      identitySource: ["$request.header.Authorization"],
      jwtConfiguration: {
        issuer: issuer,
        audience: [appClient.userPoolClientId],
      },
    });

    const apiIntegration = new apiGatewayV2.CfnIntegration(this, "apiIntegration", {
      apiId: httpAPI.attrApiId,
      integrationType: "AWS_PROXY",
      integrationUri: createPaymentFunction.functionArn,
      payloadFormatVersion: "1.0",
      credentialsArn: apiRole.roleArn,
    });

    const apiRoute = new apiGatewayV2.CfnRoute(this, "createPaymentRoute", {
      apiId: httpAPI.attrApiId,
      routeKey: "POST /payments",
      target: `integrations/${apiIntegration.ref}`,
      authorizationType: "JWT",
      authorizerId: jwtAuth.ref,
    });

    const apiDeployment = new apiGatewayV2.CfnDeployment(this, "apiDeployment", {
      apiId: httpAPI.attrApiId,
    });

    apiDeployment.addDependency(apiRoute);

    new apiGatewayV2.CfnStage(this, "apiStage", {
      apiId: httpAPI.attrApiId,
      stageName: "api",
      deploymentId: apiDeployment.attrDeploymentId,
    });
  }
}
