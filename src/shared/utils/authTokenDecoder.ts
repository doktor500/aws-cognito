import z from "zod"
import { jwtDecoder } from "./jwtDecoder";

const tokenSchema = z.object({ username: z.string().uuid() })

const getUserIdFromToken = (token: string): string | undefined => {
  const result = tokenSchema.safeParse(jwtDecoder.getDecodedAccessToken(token));

  return result.success ? result.data?.username : undefined
}

export const authTokenDecoder = { getUserIdFromToken }
