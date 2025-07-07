import { describe, expect, it } from "vitest";
import { crudPaymentsRepository } from "../../../../repositories/payments/crudPaymentsRepository";
import { aPayment } from "../../../../fixtures/payments/payment.fixture";

describe("dynamoDbPaymentsRepository", () => {
  it("can save a payment into the database", async () => {
    const payment = aPayment();

    await crudPaymentsRepository.save(payment);
    const savedPayment = await crudPaymentsRepository.getBy(payment.id);

    expect(savedPayment).to.eql(payment);

    await crudPaymentsRepository.deleteBy(payment.id);
  });
});
