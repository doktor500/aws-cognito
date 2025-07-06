import fetch from "node-fetch";
import z from "zod";
import { OauthError } from "./error/oauthError";

type RequestData = {
  clientId: string;
  clientSecret: string;
  authCode: string;
  callbackUrl: string;
  oauthTokenUrl: string;
};

const tokenSchema = z.object({ access_token: z.string() });

const getAccessToken = async (props: RequestData) => {
  const { clientId, clientSecret, authCode, callbackUrl, oauthTokenUrl } = props;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: authCode,
    redirect_uri: callbackUrl,
  });

  const response = await fetch(oauthTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basicAuth}` },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return Promise.reject(new OauthError(`Failed to get token ${errorBody}`, response.status));
  }

  const data = await response.json();
  const result = tokenSchema.safeParse(data);
  const { success, error } = result;

  return success ? result.data.access_token : Promise.reject(new OauthError(`Failed to get token ${error}`, 500));
};

export const oauthProvider = { getAccessToken };
