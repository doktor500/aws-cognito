import z from "zod";
import { jwtDecode } from "jwt-decode";

const tokenSchema = z.object({ username: z.string().uuid() });

const getUserIdFromToken = (token: string): string | undefined => {
  const result = tokenSchema.safeParse(getDecodedAccessToken(token));

  return result.success ? result.data?.username : undefined;
};

const getDecodedAccessToken = (token: string) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error("Failed to decode JWT token", error);
    return undefined;
  }
};

export const authTokenDecoder = { getUserIdFromToken };
