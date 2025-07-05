import { APIGatewayProxyHandler } from "aws-lambda";
import fetch from "node-fetch";
import { successPage } from "./successTemplate";
import { ssmParameterStore } from "./ssmParameterStore";

const clientId = process.env.CLIENT_ID;
const clientSecretSsmParam = process.env.CLIENT_SECRET_SSM_PARAM;
const oauthTokenUrl = process.env.OAUTH_TOKEN_URL;
const callbackUrl = process.env.CALLBACK_URL;

export const getJwtToken: APIGatewayProxyHandler = async (event) => {
  try {
    if (!clientId || !clientSecretSsmParam || !oauthTokenUrl || !callbackUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Missing environment variables" }),
      };
    }

    const authCode = event.queryStringParameters?.code;
    if (!authCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing code query parameter" }),
      };
    }

    const clientSecret = await ssmParameterStore.getSecuredParameterValue(clientSecretSsmParam)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code: authCode,
      redirect_uri: callbackUrl,
    });

    const response = await fetch(oauthTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ message: `Failed to get token ${errorBody}` }),
      };
    }

    const data = await response.json() as { id_token: string };

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: successPage(data.id_token),
    };

  } catch (error: any) {
    console.error("Internal server error");
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Internal server error ${error.message}` }),
    };
  }
};
