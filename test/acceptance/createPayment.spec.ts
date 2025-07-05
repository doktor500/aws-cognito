import { describe, expect, it } from "vitest";
import { crudPaymentsRepository } from "../repositories/crudPaymentsRepository";
import { aPayment } from "../fixtures/payment.fixture";

const CREATE_PAYMENT_ENDPOINT = process.env.CREATE_PAYMENT_ENDPOINT;

if (!CREATE_PAYMENT_ENDPOINT) {
    throw new Error("CREATE_PAYMENT_ENDPOINT is not defined");
}

describe("Create payment endpoint", () => {
    it("should create a payment successfully", async () => {
        const payment = aPayment();

        await fetch(CREATE_PAYMENT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment),
        });

        const savedPayment = await crudPaymentsRepository.getBy(payment.id);
        expect(savedPayment).to.eql(payment);

        await crudPaymentsRepository.deleteBy(payment.id);
    })
})