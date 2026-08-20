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
  trackingCode: string | null;
  createdAt: string;
  items: { id: string; title: string; quantity: number; unitPriceCents: number }[];
};

async function assertAdmin(supabase: any) {
  const { data: isAdmin } = await supabase.rpc('has_role', { _role: 'admin' });
  if (!isAdmin) {
    throw new Error("Acesso restrito a administradores.");
  }
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _role: 'admin' });
    return { isAdmin: Boolean(isAdmin) };
  });

export const listAdminMiniatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    await assertAdmin(supabase);
    
    const { data: miniatures, error } = await supabase
      .from("miniatures")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (miniatures || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || "",
      priceCents: row.price_cents,
      stock: row.stock,
      imagePath: row.image_path ?? null,
      published: row.published,
    }));
  });

export const saveMiniature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => miniatureInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await assertAdmin(supabase);

    const payload = {
      title: data.title,
      description: data.description,
      price_cents: data.priceCents,
      stock: data.stock,
      image_path: data.imagePath ?? null,
      published: data.published,
    };

    if (data.id) {
      const { error } = await supabase.from("miniatures").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }

    const { data: inserted, error } = await supabase.from("miniatures").insert(payload).select().single();
    if (error) throw error;

    return { id: inserted.id };
  });

export const deleteMiniature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await assertAdmin(supabase);

    const { error } = await supabase.from("miniatures").delete().eq("id", data.id);
    if (error) throw error;
    
    return { ok: true };
  });

export const listReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    await assertAdmin(supabase);

    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*, reservation_items(*)")
      .order("created_at", { ascending: false })
      .limit(200);
      
    if (error) throw error;

    return (reservations || []).map((row: any) => {
      return {
        id: row.id,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        note: row.note,
        totalCents: row.total_cents,
        status: row.status,
        trackingCode: row.tracking_code,
        createdAt: row.created_at || new Date().toISOString(),
        items: (row.reservation_items ?? []).map((item: any) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unitPriceCents: item.unit_price_cents,
        })),
      };
    });
  });

export const markReservationPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await assertAdmin(supabase);

    // Call the RPC that acts as admin bypass
    const { error } = await supabase.rpc('mark_reservation_paid', {
      reservation_id: data.id
    } as any);
    
    if (error) {
      console.error(error);
      throw error;
    }
    
    return { ok: true };
  });

export const cancelReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await assertAdmin(supabase);

    // Get reservation and its items
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("status, reservation_items(miniature_id, quantity)")
      .eq("id", data.id)
      .single();

    if (fetchError) throw fetchError;
    if (reservation.status === "cancelled") throw new Error("Pedido já está cancelado.");

    // Mark as cancelled
    const { error: updateError } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", data.id);

    if (updateError) throw updateError;

    // Restore stock for each item
    for (const item of reservation.reservation_items || []) {
      if (!item.miniature_id) continue;
      
      const { data: mini } = await supabase
        .from("miniatures")
        .select("stock")
        .eq("id", item.miniature_id)
        .single();
        
      if (mini) {
        await supabase
          .from("miniatures")
          .update({ stock: mini.stock + item.quantity })
          .eq("id", item.miniature_id);
      }
    }

    return { ok: true };
  });

export const updateTrackingCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    ids: z.array(z.string().uuid()),
    trackingCode: z.string().trim()
  }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await assertAdmin(supabase);

    if (data.ids.length === 0) return { ok: true };

    const { error } = await supabase
      .from("reservations")
      .update({ tracking_code: data.trackingCode || null } as any)
      .in("id", data.ids);

    if (error) throw error;
    
    return { ok: true };
  });
