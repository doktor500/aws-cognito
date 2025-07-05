import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { paymentSchema } from "./schema/paymentSchema";
import { dynamoDbPaymentsRepository } from "../src/payments/infrastructure/repositories/dynamoDbPaymentsRepository";

export async function createPayment(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const paymentData = JSON.parse(event.body ?? "{}");
  const result = paymentSchema.safeParse(paymentData);

  if (result.success) {
    await dynamoDbPaymentsRepository.save(result.data);
    return { statusCode: 200 };
  }

  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: result.error }),
  };
}
