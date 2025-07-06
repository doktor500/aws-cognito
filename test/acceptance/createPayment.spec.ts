import { describe, expect, it } from "vitest";
import { crudPaymentsRepository } from "../repositories/crudPaymentsRepository";
import { aPayment } from "../fixtures/payment.fixture";
import { authTokenDecoder } from "../../src/shared/utils/authTokenDecoder";

const PAYMENTS_API_ENDPOINT = process.env.PAYMENTS_API_ENDPOINT;
const BEARER_TOKEN = process.env.BEARER_TOKEN;

if (!PAYMENTS_API_ENDPOINT || !BEARER_TOKEN) {
  throw new Error("PAYMENTS_API_ENDPOINT and BEARER_TOKEN need to be defined");
}

describe("Create payment endpoint", () => {
  it("should create a payment successfully", async () => {
    const userId = authTokenDecoder.getUserIdFromToken(BEARER_TOKEN);
    const payment = aPayment({ userId });

    await fetch(PAYMENTS_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BEARER_TOKEN}` },
      body: JSON.stringify(payment),
    });

    const savedPayment = await crudPaymentsRepository.getBy(payment.id);
    expect(savedPayment).to.eql(payment);

    await crudPaymentsRepository.deleteBy(payment.id);
  });
});
