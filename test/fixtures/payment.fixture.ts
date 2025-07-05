import { v4 as uuidv4 } from "uuid";
import { Payment } from "../../src/payments/domain/payment";

export const aPayment = (): Payment => {
    return {
        id: uuidv4(),
        userId: uuidv4(),
        amount: 10,
        currency: "GBP",
        timestamp: new Date().getTime(),
        description: "Payment description",
    };
}