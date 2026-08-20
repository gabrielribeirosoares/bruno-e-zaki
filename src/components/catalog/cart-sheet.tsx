import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { formatBRL } from "@/lib/format";
import { createReservation } from "@/lib/catalog.functions";
import { reservationInputSchema } from "@/lib/catalog.schemas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReserved: () => void;
};

export function CartSheet({ open, onOpenChange, onReserved }: Props) {
  const { lines, totalCents, setQuantity, remove, clear } = useCart();
  const [form, setForm] = useState({ note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const submit = useServerFn(createReservation);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = reservationInputSchema.safeParse({
        ...form,
        items: lines.map((line) => ({ miniatureId: line.id, quantity: line.quantity })),
      });
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          fieldErrors[String(issue.path[0])] = "Verifique este campo.";
        }
        setErrors(fieldErrors);
        throw new Error("Confira os dados informados.");
      }
      setErrors({});
      return submit({ data: parsed.data });
    },
    onSuccess: () => {
      setDone(true);
      clear();
      onReserved();
      toast.success("Reserva enviada! Entraremos em contato para combinar o pagamento.");
      setTimeout(() => {
        setDone(false);
        onOpenChange(false);
      }, 2200);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="uppercase">Pedido de reserva</SheetTitle>
          <SheetDescription>
            Sem pagamento online: sua lista vai direto para a fila do administrador.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="surface-card flex items-center gap-3 rounded-lg p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.title}</p>
                  <p className="text-xs text-muted-foreground">{formatBRL(line.priceCents)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Diminuir"
                    onClick={() => setQuantity(line.id, line.quantity - 1)}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Aumentar"
                    disabled={line.quantity >= line.stock}
                    onClick={() => setQuantity(line.id, line.quantity + 1)}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover"
                    onClick={() => remove(line.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {lines.length === 0 && !done ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Seu carrinho de reservas está vazio.
            </p>
          ) : null}

          {lines.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="note">Observação (opcional)</Label>
                <Textarea
                  id="note"
                  maxLength={500}
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                />
              </div>
            </div>
          ) : null}

          <AnimatePresence>
            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                data-testid="reservation-success"
                className="surface-card flex items-center gap-3 rounded-lg p-4 text-success"
              >
                <CheckCircle2 className="size-5" />
                <p className="text-sm">Reserva registrada com sucesso.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="space-y-3 border-t p-4">
          {mutation.isPending ? <Progress value={70} className="h-1" /> : null}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total estimado</span>
            <span data-testid="cart-total" className="text-lg font-semibold text-primary">
              {formatBRL(totalCents)}
            </span>
          </div>
          {user ? (
            <Button
              className="w-full"
              data-testid="submit-reservation"
              disabled={lines.length === 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Finalizar pedido de reserva
            </Button>
          ) : (
            <Button asChild className="w-full" variant="secondary">
              <Link to="/auth">Faça login para reservar</Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
