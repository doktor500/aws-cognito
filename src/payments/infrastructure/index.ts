import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { paymentSchema } from "./schema/paymentSchema";
import { dynamoDbPaymentsRepository } from "./repositories/dynamoDbPaymentsRepository";
import { authTokenDecoder } from "../../auth/application/authTokenDecoder";

export async function createPayment(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const paymentData = JSON.parse(event.body ?? "{}");
  const result = paymentSchema.safeParse(paymentData);
  const authToken = event.headers["authorization"]?.split(" ")[1] ?? "";
  const principalId = authTokenDecoder.getUserIdFromToken(authToken);

  if (result.success) {
    if (principalId !== result.data.userId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "User is not authorized to perform this operation" }),
      };
    }

    await dynamoDbPaymentsRepository.save(result.data);
    return { statusCode: 200 };
  }

  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: result.error }),
  };
}
