import { UUID } from "./uuid";

export type Payment = {
    id: UUID;
    userId: UUID;
    amount: number;
    currency: string;
    timestamp: number;
    description: string;
}