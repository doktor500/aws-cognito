import "dotenv/config";
import { Payment } from "../../domain/payment";
import { PaymentsRepository } from "../../application/paymentsRepository";
import { dynamoDB } from "./db/dynamoDbClient";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { toDynamoDbPaymentEntity } from "./db/dynamoDbPaymentEntity";

const client = dynamoDB();

const PAYMENTS_TABLE_NAME = process.env.PAYMENTS_TABLE_NAME;

const save = async (payment: Payment): Promise<void> => {
  const command = new PutCommand({ TableName: PAYMENTS_TABLE_NAME, Item: toDynamoDbPaymentEntity(payment) });

  await client.send(command).catch((error) => {
    console.error("[DynamoDBPaymentsRepository] PutCommand error:", error);
    throw error;
  });
};

export const dynamoDbPaymentsRepository: PaymentsRepository = { save };
