import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";

import { reservationInputSchema } from "./catalog.schemas";

export type PublicMiniature = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
};

export const listPublicMiniatures = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("miniatures")
    .select("id, title, description, price_cents, stock, image_path")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error("Não foi possível carregar o catálogo.");

  const rows = data ?? [];
  const paths = rows.map((row) => row.image_path).filter((path): path is string => Boolean(path));
  const signedMap = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signed } = await supabaseAdmin.storage
      .from("miniatures")
      .createSignedUrls(paths, 60 * 60);
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) signedMap.set(entry.path, entry.signedUrl);
    }
  }

  return rows.map<PublicMiniature>((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents,
    stock: row.stock,
    imageUrl: row.image_path ? (signedMap.get(row.image_path) ?? null) : null,
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
  .inputValidator((input: unknown) => reservationInputSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    if (!throttle(`reservation:${ip}`, 5, 60_000)) {
      throw new Error("Muitas reservas seguidas. Aguarde um minuto e tente novamente.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = [...new Set(data.items.map((item) => item.miniatureId))];
    const { data: miniatures, error: readError } = await supabaseAdmin
      .from("miniatures")
      .select("id, title, price_cents, stock, published")
      .in("id", ids);

    if (readError) throw new Error("Não foi possível validar os itens da reserva.");

    const catalog = new Map((miniatures ?? []).map((row) => [row.id, row]));
    const items = data.items.map((item) => {
      const row = catalog.get(item.miniatureId);
      if (!row || !row.published) throw new Error("Um dos itens não está mais disponível.");
      if (row.stock < item.quantity) throw new Error(`Estoque insuficiente para ${row.title}.`);
      return {
        miniature_id: row.id,
        title: row.title,
        unit_price_cents: row.price_cents,
        quantity: item.quantity,
      };
    });

    const totalCents = items.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);

    const { data: reservation, error: insertError } = await supabaseAdmin
      .from("reservations")
      .insert({
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone || null,
        note: data.note || null,
        total_cents: totalCents,
      })
      .select("id")
      .single();

    if (insertError || !reservation) throw new Error("Não foi possível registrar a reserva.");

    const { error: itemsError } = await supabaseAdmin
      .from("reservation_items")
      .insert(items.map((item) => ({ ...item, reservation_id: reservation.id })));

    if (itemsError) {
      await supabaseAdmin.from("reservations").delete().eq("id", reservation.id);
      throw new Error("Não foi possível registrar os itens da reserva.");
    }

    return { reservationId: reservation.id, totalCents };
  });
