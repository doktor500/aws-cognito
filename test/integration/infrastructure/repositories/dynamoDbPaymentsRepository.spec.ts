import { v4 as uuidv4 } from 'uuid';

import { describe, expect, it } from "vitest";
import {
    dynamoDbPaymentsRepository
} from "../../../../src/payments/infrastructure/repositories/dynamoDbPaymentsRepository";
import { Payment } from "../../../../src/payments/domain/payment";
import { dynamoDB } from "../../../../src/payments/infrastructure/db/dynamoDbClient";
import { UUID } from "../../../../src/payments/domain/uuid";
import { DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { fromDynamoDbPaymentEntity } from "../../../../src/payments/infrastructure/db/dynamoDbPaymentEntity";

const client = dynamoDB();

const PAYMENTS_TABLE_NAME = process.env.PAYMENTS_TABLE_NAME;

describe("dynamoDbPaymentsRepository", () => {
    it("can save a payment into the database", async () => {
        const payment: Payment = {
            id: uuidv4(),
            userId: uuidv4(),
            amount: 10,
            currency: "GBP",
            timestamp: new Date().getTime(),
            description: "Payment description",
        }

        await savePayment(payment);
        const savedPayment = await getPayment(payment.id);

        expect(savedPayment).to.eql(payment);

        await deletePayment(payment.id);
    })

    const savePayment = async (payment: Payment) => await dynamoDbPaymentsRepository.save(payment);

    const getPayment = async (paymentId: UUID) => {
        const command = new GetCommand({ TableName: PAYMENTS_TABLE_NAME, Key: { pk: paymentId } });
        return client.send(command).then(data => fromDynamoDbPaymentEntity(data.Item))
    }

    const deletePayment = async (paymentId: UUID) => {
        const command = new DeleteCommand({ TableName: PAYMENTS_TABLE_NAME, Key: { pk: paymentId } });
        return client.send(command)
    }
});