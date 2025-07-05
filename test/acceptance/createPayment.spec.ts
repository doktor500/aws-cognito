import { describe, expect, it } from "vitest";
import { crudPaymentsRepository } from "../repositories/crudPaymentsRepository";
import { aPayment } from "../fixtures/payment.fixture";

const PAYMENTS_API_ENDPOINT = process.env.PAYMENTS_API_ENDPOINT;

if (!PAYMENTS_API_ENDPOINT) {
    throw new Error("PAYMENTS_API_ENDPOINT is not defined");
}

describe("Create payment endpoint", () => {
    it("should create a payment successfully", async () => {
        const payment = aPayment();

        await fetch(PAYMENTS_API_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment),
        });

        const savedPayment = await crudPaymentsRepository.getBy(payment.id);
        expect(savedPayment).to.eql(payment);

        await crudPaymentsRepository.deleteBy(payment.id);
    });
});