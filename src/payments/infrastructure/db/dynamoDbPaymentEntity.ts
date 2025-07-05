import { omit } from "lodash";
import { Payment } from "../../domain/payment";
import { DynamoDbEntity } from "./dynamoDbEntity";

export type DynamoDbPaymentEntity = DynamoDbEntity & {
  timestamp: number;
  userId: string;
  amount: number;
  currency: string;
  description: string;
};

export const toDynamoDbPaymentEntity = (payment: Payment): DynamoDbPaymentEntity => {
  return {
    pk: payment.id,
    timestamp: payment.timestamp,
    userId: payment.userId,
    amount: payment.amount,
    currency: payment.currency,
    description: payment.description,
  };
};

export const fromDynamoDbPaymentEntity = (entity: Record<string, any> | undefined) => {
  return {
    id: entity?.pk,
    ...omit(entity, "pk"),
  };
};
