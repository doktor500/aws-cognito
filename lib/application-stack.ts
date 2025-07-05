import "dotenv/config";
import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apiGatewayV2 from "aws-cdk-lib/aws-apigatewayv2";
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";

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
        },
      },
      selfSignUpEnabled: true,
    });

    const userPoolDomain = new cognito.UserPoolDomain(this, "userPoolDomain", {
      userPool,
      cognitoDomain: {
        domainPrefix: "kenfos",
      },
    });

    const callbackURL = cdk.Lazy.string({
      produce: () => {
        return `https://${authApi.attrApiId}.execute-api.${this.region}.amazonaws.com/${authApiStage.stageName}/callback`;
      },
    });

    const appClient = userPool.addClient("appClient", {
      userPoolClientName: "AppClient",
      idTokenValidity: Duration.days(1),
      accessTokenValidity: Duration.days(1),
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: [callbackURL]
      },
      generateSecret: true,
    });

    const authApi = new apiGatewayV2.CfnApi(this, "authApi", {
      protocolType: "HTTP",
      name: "AuthAPI",
    });

    const getJwtTokenFunction = new NodejsFunction(this, "getJwtTokenFunction", {
      entry: "./lambda/auth/index.ts",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getJwtToken",
      environment: {
        CLIENT_ID: appClient.userPoolClientId,
        CLIENT_SECRET: appClient.userPoolClientSecret.unsafeUnwrap(), //TODO use SSM secured parameter
        OAUTH_TOKEN_URL: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com/oauth2/token`,
        CALLBACK_URL: callbackURL,
      },
      timeout: Duration.seconds(10),
    });

    const authApiRole = new iam.Role(this, "authApiRole", {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("apigateway.amazonaws.com"),
        new iam.ServicePrincipal("lambda.amazonaws.com"),
      ),
      inlinePolicies: {
        invokeLambda: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              resources: [getJwtTokenFunction.functionArn],
              actions: ["lambda:InvokeFunction"],
            }),
          ],
        }),
      },
    });

    const authApiIntegration = new apiGatewayV2.CfnIntegration(this, "authApiIntegration", {
      apiId: authApi.attrApiId,
      integrationType: "AWS_PROXY",
      integrationUri: getJwtTokenFunction.functionArn,
      payloadFormatVersion: "1.0",
      credentialsArn: authApiRole.roleArn,
    });

    const callbackRoute = new apiGatewayV2.CfnRoute(this, "callbackRoute", {
      apiId: authApi.attrApiId,
      routeKey: "GET /callback",
      target: `integrations/${authApiIntegration.ref}`,
      authorizationType: "NONE",
    });

    const authApiDeployment = new apiGatewayV2.CfnDeployment(this, "authApiDeployment", {
      apiId: authApi.attrApiId,
    });

    authApiDeployment.addDependency(callbackRoute);

    const authApiStage = new apiGatewayV2.CfnStage(this, "authApiStage", {
      apiId: authApi.attrApiId,
      stageName: "api",
      deploymentId: authApiDeployment.attrDeploymentId,
    });

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

    const paymentsApi = new apiGatewayV2.CfnApi(this, "paymentsApi", {
      protocolType: "HTTP",
      name: "PaymentsAPI",
    });

    const issuer = `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`;

    const jwtAuth = new apiGatewayV2.CfnAuthorizer(this, "jwtAuth", {
      name: "jwt-authorizer",
      apiId: paymentsApi.attrApiId,
      authorizerType: "JWT",
      identitySource: ["$request.header.Authorization"],
      jwtConfiguration: {
        issuer: issuer,
        audience: [appClient.userPoolClientId],
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

    new CfnOutput(this, "userSignupUrl", {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com/signup?client_id=${appClient.userPoolClientId}&response_type=code&scope=openid&redirect_uri=${callbackURL}`,
      description: "Hosted UI signup URL",
    });

    new CfnOutput(this, "userLoginUrl", {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com/login?client_id=${appClient.userPoolClientId}&response_type=code&scope=openid&redirect_uri=${callbackURL}`,
      description: "Hosted UI login URL",
    });

    new CfnOutput(this, "createPaymentUrl", {
      value: `https://${paymentsApi.ref}.execute-api.${this.region}.amazonaws.com/${paymentsApiStage.stageName}/${createPaymentRoute.routeKey.split(" ")[1]}`,
      description: "Endpoint URL for creating a payment",
    });
  }
}
