import z from "zod";

export const paymentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().nonempty(),
  timestamp: z.number().positive(),
  description: z.string(),
});
