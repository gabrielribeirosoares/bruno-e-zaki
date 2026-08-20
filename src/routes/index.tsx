
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { ShoppingCart, Lock, Package, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CartProvider, useCart } from "@/hooks/use-cart";
import { CartSheet } from "@/components/catalog/cart-sheet";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";
import { MiniatureCard } from "@/components/catalog/miniature-card";
import { listPublicMiniatures, type PublicMiniature } from "@/lib/catalog.functions";
import { getAdminStatus } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bruno & Zaki Garage Diecast — Catálogo e reserva de colecionáveis" },
      {
        name: "description",
        content:
          "Catálogo de miniaturas colecionáveis com reserva online: escolha seus modelos, monte o pedido e combine o pagamento direto com a loja.",
      },
      { property: "og:title", content: "Bruno & Zaki Garage Diecast — Catálogo e reserva de colecionáveis" },
      {
        property: "og:description",
        content: "Miniaturas colecionáveis em estoque limitado. Reserve seus modelos favoritos.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  return (
    <CartProvider>
      <Catalog />
    </CartProvider>
  );
}

function Catalog() {
  const [cartOpen, setCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const fetchMiniatures = useServerFn(listPublicMiniatures);
  const { add, count, lines } = useCart();

  const { data: adminStatus } = useQuery({
    queryKey: ["adminStatus"],
    queryFn: () => getAdminStatus(),
    enabled: !!user,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["public-miniatures"],
    queryFn: () => fetchMiniatures(),
  });

  const handleAdd = (miniature: PublicMiniature) => {
    add({
      id: miniature.id,
      title: miniature.title,
      priceCents: miniature.priceCents,
      stock: miniature.stock,
    });
    toast.success(`${miniature.title} adicionada à reserva.`);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-xl uppercase tracking-wide">
            <span className="text-gradient-ember font-display">Bruno & Zaki</span>{" "}
            <span className="font-display">Garage Diecast</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {adminStatus?.isAdmin ? (
                  <Button asChild variant="ghost" size="sm" className="gap-2">
                    <Link to="/admin/miniatures">
                      <Lock className="size-4 text-emerald-500" />
                      <span className="hidden sm:inline">Painel</span>
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="ghost" size="sm" className="gap-2">
                  <Link to="/orders">
                    <Package className="size-4" />
                    <span className="hidden sm:inline">Meus Pedidos</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => supabase.auth.signOut()}>
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link to="/auth">
                  <Lock className="size-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              className="gap-2"
              data-testid="open-cart"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="size-4" />
              Reservas
              <motion.span
                key={count}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                className="rounded-full bg-primary-foreground/20 px-2 text-xs"
                data-testid="cart-count"
              >
                {count}
              </motion.span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 pb-20">
        <section aria-labelledby="catalogo">
          <h2 id="catalogo" className="mb-5 text-2xl uppercase">
            Catálogo
          </h2>

          {isPending ? <CatalogSkeleton /> : null}

          {isError ? (
            <div className="surface-card rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível carregar o catálogo.</p>
              <Button className="mt-4" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}

          {data && data.length === 0 ? (
            <div className="surface-card rounded-xl p-10 text-center text-sm text-muted-foreground">
              Nenhuma miniatura publicada ainda.
            </div>
          ) : null}

          {data && data.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.map((miniature: PublicMiniature, index: number) => (
                <MiniatureCard
                  key={miniature.id}
                  miniature={miniature}
                  index={index}
                  onAdd={handleAdd}
                  inCart={lines.find((line) => line.id === miniature.id)?.quantity ?? 0}
                />
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} onReserved={() => refetch()} />
    </div>
  );
}
