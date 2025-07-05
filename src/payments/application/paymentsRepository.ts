import { Payment } from "../domain/payment";

export interface PaymentsRepository {
  save(payment: Payment): Promise<void>;
}
