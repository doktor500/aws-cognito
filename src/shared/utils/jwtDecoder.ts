import { jwtDecode } from "jwt-decode";

const getDecodedAccessToken = (token: string) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error("Failed to decode JWT token", error);
    return undefined;
  }
}

export const jwtDecoder = { getDecodedAccessToken }
