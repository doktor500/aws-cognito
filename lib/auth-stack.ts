import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apiGatewayV2 from "aws-cdk-lib/aws-apigatewayv2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import { SecureParameterStore } from "cdk-secure-parameter-store";

export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly appClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "userPool", {
      removalPolicy: RemovalPolicy.DESTROY,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      signInAliases: { email: true },
      standardAttributes: { email: { required: true } },
      selfSignUpEnabled: true,
    });

    const userPoolDomain = new cognito.UserPoolDomain(this, "userPoolDomain", {
      userPool: this.userPool,
      cognitoDomain: { domainPrefix: "kenfos" },
    });

    const authApi = new apiGatewayV2.CfnApi(this, "authApi", {
      protocolType: "HTTP",
      name: "AuthAPI",
    });

    const authApiStage = new apiGatewayV2.CfnStage(this, "authApiStage", {
      apiId: authApi.attrApiId,
      stageName: "api",
    });

    const callbackURL = cdk.Lazy.string({
      produce: () => {
        return `https://${authApi.attrApiId}.execute-api.${this.region}.amazonaws.com/${authApiStage.stageName}/auth/callback`;
      },
    });

    this.appClient = this.userPool.addClient("appClient", {
      userPoolClientName: "AppClient",
      idTokenValidity: Duration.days(1),
      accessTokenValidity: Duration.days(1),
      authFlows: { userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: [callbackURL],
      },
      generateSecret: true,
    });

    const appClientSecretParameterName = "/cognito/appClientSecret";

    new SecureParameterStore(this, "appClientSecretParameter", {
      name: appClientSecretParameterName,
      value: this.appClient.userPoolClientSecret.unsafeUnwrap(),
    });

    const getJwtTokenFunction = new NodejsFunction(this, "getJwtTokenFunction", {
      entry: "./src/auth/infrastructure/index.ts",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getJwtToken",
      environment: {
        CLIENT_ID: this.appClient.userPoolClientId,
        CLIENT_SECRET_SSM_PARAM: appClientSecretParameterName,
        OAUTH_TOKEN_URL: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com/oauth2/token`,
        CALLBACK_URL: callbackURL,
      },
      timeout: Duration.seconds(10),
    });

    getJwtTokenFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ssm:GetParameter"],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${appClientSecretParameterName}`],
      }),
    );

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
      routeKey: "GET /auth/callback",
      target: `integrations/${authApiIntegration.ref}`,
      authorizationType: "NONE",
    });

    const authApiDeployment = new apiGatewayV2.CfnDeployment(this, "authApiDeployment", {
      apiId: authApi.attrApiId,
    });

    authApiDeployment.addDependency(callbackRoute);
    authApiStage.deploymentId = authApiDeployment.attrDeploymentId;

    new CfnOutput(this, "userSignupUrl", {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com/signup?client_id=${this.appClient.userPoolClientId}&response_type=code&scope=openid&redirect_uri=${callbackURL}`,
      description: "Hosted UI signup URL",
    });

    new CfnOutput(this, "userLoginUrl", {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com/login?client_id=${this.appClient.userPoolClientId}&response_type=code&scope=openid&redirect_uri=${callbackURL}`,
      description: "Hosted UI login URL",
    });
  }
}
