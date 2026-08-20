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



export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => reservationInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const typedData = data as ReservationInput;
    const supabase = context.supabase;

    // Verifica se é admin
    const { data: isAdminRole } = await supabase.rpc('has_role', { _role: 'admin' });
    const isAdmin = Boolean(isAdminRole);

    let targetUserId = context.userId;
    let customerName = context.claims.user_metadata?.name || context.claims.name || context.claims.email || "Cliente";
    let customerEmail = context.claims.email || "";
    let customerPhone = context.claims.user_metadata?.phone || null;

    if (isAdmin) {
      if (!typedData.customerId) {
        throw new Error("Admins não podem fazer reservas para si mesmos. Selecione um cliente.");
      }
      targetUserId = typedData.customerId;
      
      // Buscar dados do cliente
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email, phone")
        .eq("id", targetUserId)
        .single();
        
      if (profile) {
        customerName = profile.name || "Cliente";
        customerEmail = profile.email || "";
        customerPhone = profile.phone || null;
      } else {
        throw new Error("Cliente selecionado não encontrado.");
      }
    } else if (typedData.customerId && typedData.customerId !== context.userId) {
       throw new Error("Você não tem permissão para fazer reservas para outro cliente.");
    }

    // Rate limiting: 5 reservas por minuto por usuário
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count, error: countError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .gt("created_at", oneMinuteAgo);

    if (countError) throw new Error("Erro ao verificar limite de taxa.");
    if (count !== null && count >= 5) {
      throw new Error("Muitas reservas seguidas para este cliente. Aguarde um minuto.");
    }

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
      user_id: targetUserId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
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
      .select("*, reservation_items(*, miniatures(image_path))")
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
        items: (d.reservation_items || []).map((item: any) => ({
          ...item,
          imageUrl: item.miniatures?.image_path 
            ? supabase.storage.from("miniatures").getPublicUrl(item.miniatures.image_path).data.publicUrl 
            : null
        })),
      };
    });
  });
