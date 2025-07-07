import { APIGatewayProxyHandler } from "aws-lambda";
import { successPage } from "./templates/successTemplate";
import { oauthProvider } from "./oauth/oauthProvider";
import { OauthError } from "../domain/error/oauthError";
import { ssmParameterStore } from "./config/ssmParameterStore";

const clientId = process.env.CLIENT_ID;
const clientSecretSsmParam = process.env.CLIENT_SECRET_SSM_PARAM;
const oauthTokenUrl = process.env.OAUTH_TOKEN_URL;
const callbackUrl = process.env.CALLBACK_URL;

export const getJwtToken: APIGatewayProxyHandler = async (event) => {
  const authCode = event.queryStringParameters?.code;

  if (!clientId || !clientSecretSsmParam || !oauthTokenUrl || !callbackUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Missing environment variables" }),
    };
  }

  if (!authCode) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing code query parameter" }),
    };
  }

  return ssmParameterStore
    .getSecuredParameterValue(clientSecretSsmParam)
    .then((clientSecret) => ({ clientId, clientSecret, authCode, callbackUrl, oauthTokenUrl }))
    .then(oauthProvider.getAccessToken)
    .then((token) => ({ statusCode: 200, headers: { "Content-Type": "text/html" }, body: successPage(token) }))
    .catch((error: OauthError) => toErrorResponse(error));
};

const toErrorResponse = (error: OauthError) => {
  return {
    statusCode: error.statusCode ?? 500,
    body: JSON.stringify({ message: error.message }),
  };
};
