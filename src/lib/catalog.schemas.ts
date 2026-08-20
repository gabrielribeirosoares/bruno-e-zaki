import { z } from "zod";

export const reservationItemSchema = z.object({
  miniatureId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

export const reservationInputSchema = z.object({
  note: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(reservationItemSchema).min(1).max(20),
});

export type ReservationInput = z.infer<typeof reservationInputSchema>;

export const miniatureInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).default(""),
  priceCents: z.number().int().min(0).max(100_000_00),
  stock: z.number().int().min(0).max(9999),
  imagePath: z.string().trim().max(300).nullable().optional(),
  published: z.boolean(),
});

export type MiniatureInput = z.infer<typeof miniatureInputSchema>;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
