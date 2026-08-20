import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { v4 as uuidv4 } from "uuid";

import { reservationInputSchema, ReservationInput } from "./catalog.schemas";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PublicMiniature = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
};

export const listPublicMiniatures = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  
  const { data: miniatures, error } = await supabase
    .from("miniatures")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (miniatures || []).map<PublicMiniature>((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description || "",
    priceCents: row.price_cents,
    stock: row.stock,
    imageUrl: row.image_path ? supabase.storage.from("miniatures").getPublicUrl(row.image_path).data.publicUrl : null,
  }));
});

const reservationHits = new Map<string, number[]>();

function throttle(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (reservationHits.get(key) ?? []).filter((time) => now - time < windowMs);
  hits.push(now);
  reservationHits.set(key, hits);
  return hits.length <= limit;
}

export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reservationInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const typedData = data as ReservationInput;
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    if (!throttle(`reservation:${ip}`, 5, 60_000)) {
      throw new Error("Muitas reservas seguidas. Aguarde um minuto e tente novamente.");
    }

    const supabase = context.supabase;

    const ids = [...new Set(typedData.items.map((item: any) => item.miniatureId))] as string[];
    if (ids.length === 0) throw new Error("A reserva deve conter itens.");

    // Buscando miniaturas
    const { data: miniatures, error: miniError } = await supabase
      .from("miniatures")
      .select("*")
      .in("id", ids);

    if (miniError) throw miniError;

    const miniaturesMap = new Map<string, any>();
    miniatures?.forEach((m: any) => miniaturesMap.set(m.id, m));

    const items = typedData.items.map((item: any) => {
      const row = miniaturesMap.get(item.miniatureId);
      if (!row || !row.published) throw new Error("Um dos itens não está mais disponível.");
      if (row.stock < item.quantity) throw new Error(`Estoque insuficiente para ${row.title}.`);
      return {
        id: uuidv4(),
        miniature_id: row.id,
        title: row.title,
        unit_price_cents: row.price_cents,
        quantity: item.quantity,
      };
    });

    const totalCents = items.reduce((sum: number, item: any) => sum + item.unit_price_cents * item.quantity, 0);
    const reservationId = uuidv4();

    const { error: insertError } = await supabase.from("reservations").insert({
      id: reservationId,
      user_id: context.userId,
      customer_name: context.claims.user_metadata?.name || context.claims.name || context.claims.email || "Cliente",
      customer_email: context.claims.email || "",
      customer_phone: context.claims.user_metadata?.phone || null,
      note: typedData.note || null,
      total_cents: totalCents,
      status: "pending",
    } as any);
    
    if (insertError) throw insertError;

    const { error: itemsError } = await supabase.from("reservation_items").insert(
      items.map((item: any) => ({
        ...item,
        reservation_id: reservationId
      }))
    );

    if (itemsError) throw itemsError;

    // Atualizar estoque
    for (const item of items) {
      // Usamos uma RPC SECURITY DEFINER para que clientes possam baixar o estoque sem ter permissão total na tabela
      const { error: rpcError } = await supabase.rpc("decrement_stock", {
        mini_id: item.miniature_id,
        qty: item.quantity
      } as any);

      if (rpcError) throw new Error(`Erro ao baixar estoque do item ${item.title}`);
    }

    return { reservationId, totalCents };
  });

export const listMyReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*, reservation_items(*)")
      .eq("user_id" as any, context.userId)
      .order("created_at", { ascending: false });
      
    if (error) throw error;
      
    return (reservations || []).map((d: any) => {
      return {
        id: d.id,
        status: d.status,
        totalCents: d.total_cents,
        trackingCode: d.tracking_code,
        createdAt: d.created_at || new Date().toISOString(),
        items: d.reservation_items || [],
      };
    });
  });
