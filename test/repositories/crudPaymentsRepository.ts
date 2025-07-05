import { UUID } from "../../src/payments/domain/uuid";
import { DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { fromDynamoDbPaymentEntity } from "../../src/payments/infrastructure/db/dynamoDbPaymentEntity";
import { dynamoDB } from "../../src/payments/infrastructure/db/dynamoDbClient";
import { dynamoDbPaymentsRepository } from "../../src/payments/infrastructure/repositories/dynamoDbPaymentsRepository";

const client = dynamoDB();

const PAYMENTS_TABLE_NAME = process.env.PAYMENTS_TABLE_NAME;

const getBy = async (paymentId: UUID) => {
  const command = new GetCommand({ TableName: PAYMENTS_TABLE_NAME, Key: { pk: paymentId } });
  return client.send(command).then((data) => fromDynamoDbPaymentEntity(data.Item));
};

const deleteBy = async (paymentId: UUID) => {
  const command = new DeleteCommand({ TableName: PAYMENTS_TABLE_NAME, Key: { pk: paymentId } });
  return client.send(command);
};

export const crudPaymentsRepository = { getBy, save: dynamoDbPaymentsRepository.save, deleteBy };
