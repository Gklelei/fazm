import z from "zod";

export const SubscriptionSchema = z.object({
  subscriptionPlanId: z.string().trim().min(1, "This field is required"),
});
