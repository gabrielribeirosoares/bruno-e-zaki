import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { miniatureInputSchema } from "./catalog.schemas";

export type AdminMiniature = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  stock: number;
  imagePath: string | null;
  published: boolean;
};

export type AdminReservation = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  note: string | null;
  totalCents: number;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
  items: { id: string; title: string; quantity: number; unitPriceCents: number }[];
};

async function assertAdmin(supabase: {
  rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });

export const listAdminMiniatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("miniatures")
      .select("id, title, description, price_cents, stock, image_path, published")
      .order("created_at", { ascending: false });

    if (error) throw new Error("Não foi possível carregar as miniaturas.");

    return (data ?? []).map<AdminMiniature>((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      priceCents: row.price_cents,
      stock: row.stock,
      imagePath: row.image_path,
      published: row.published,
    }));
  });

export const saveMiniature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => miniatureInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const payload = {
      title: data.title,
      description: data.description,
      price_cents: data.priceCents,
      stock: data.stock,
      image_path: data.imagePath ?? null,
      published: data.published,
    };

    if (data.id) {
      const { error } = await context.supabase.from("miniatures").update(payload).eq("id", data.id);
      if (error) throw new Error("Não foi possível atualizar a miniatura.");
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("miniatures")
      .insert(payload)
      .select("id")
      .single();

    if (error || !created) throw new Error("Não foi possível criar a miniatura.");
    return { id: created.id };
  });

export const deleteMiniature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("miniatures").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível excluir a miniatura.");
    return { ok: true };
  });

export const listReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("reservations")
      .select(
        "id, customer_name, customer_email, customer_phone, note, total_cents, status, created_at, reservation_items(id, title, quantity, unit_price_cents)",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error("Não foi possível carregar as reservas.");

    return (data ?? []).map<AdminReservation>((row) => ({
      id: row.id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      note: row.note,
      totalCents: row.total_cents,
      status: row.status,
      createdAt: row.created_at,
      items: (row.reservation_items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
      })),
    }));
  });

export const markReservationPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("mark_reservation_paid", {
      _reservation_id: data.id,
    });
    if (error) throw new Error("Não foi possível dar baixa no pedido.");
    return { ok: true };
  });
