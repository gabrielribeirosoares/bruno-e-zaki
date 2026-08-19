import { motion } from "motion/react";
import { ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import type { PublicMiniature } from "@/lib/catalog.functions";

type Props = {
  miniature: PublicMiniature;
  index: number;
  onAdd: (miniature: PublicMiniature) => void;
  inCart: number;
};

export function MiniatureCard({ miniature, index, onAdd, inCart }: Props) {
  const soldOut = miniature.stock <= 0;

  return (
    <motion.article
      data-testid="miniature-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="surface-card group flex flex-col overflow-hidden rounded-xl"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        {miniature.imageUrl ? (
          <img
            src={miniature.imageUrl}
            alt={`Miniatura ${miniature.title}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Sem foto
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge
            data-testid="stock-badge"
            className={
              soldOut
                ? "bg-destructive text-destructive-foreground"
                : "bg-success text-success-foreground"
            }
          >
            {soldOut ? "Esgotado" : "Disponível"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="text-lg leading-tight uppercase">{miniature.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{miniature.description}</p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-primary">{formatBRL(miniature.priceCents)}</p>
            <p className="text-xs text-muted-foreground">
              {soldOut ? "Sem unidades" : `${miniature.stock} em estoque`}
              {inCart > 0 ? ` · ${inCart} no carrinho` : ""}
            </p>
          </div>
          <Button
            size="sm"
            disabled={soldOut || inCart >= miniature.stock}
            onClick={() => onAdd(miniature)}
            className="gap-2"
          >
            <ShoppingBag className="size-4" />
            Reservar
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
