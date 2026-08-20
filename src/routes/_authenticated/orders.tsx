import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, Truck, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

import { listMyReservations } from "@/lib/catalog.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [{ title: "Bruno & Zaki Garage Diecast - Meus Pedidos" }],
  }),
  component: CustomerOrdersPage,
});

function CustomerOrdersPage() {
  const { data: reservations, isLoading } = useQuery({
    queryKey: ["my", "reservations"],
    queryFn: () => listMyReservations(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Meus Pedidos</h2>
        <p className="text-muted-foreground">Acompanhe o status das suas reservas.</p>
      </div>

      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Confira o que você já reservou na Bruno & Zaki Garage Diecast.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">ID / Data</TableHead>
                    <TableHead className="min-w-[200px]">Itens</TableHead>
                    <TableHead className="whitespace-nowrap">Total</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Rastreio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations?.map((res: any) => (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">
                        <div className="truncate w-24" title={res.id}>
                          {res.id.split("-")[0]}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(res.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {res.items.map((item: any) => (
                            <div key={item.id} className="text-sm flex items-center gap-1">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{item.quantity}x</span> {item.title}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatBRL(res.totalCents)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col gap-2 items-start">
                          {res.status === "paid" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/20">Pago</Badge>
                          ) : res.status === "cancelled" ? (
                            <Badge variant="destructive">Cancelado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/20">Aguardando Pagamento</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {res.trackingCode ? (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs font-mono"
                              asChild
                            >
                              <a 
                                href={`https://rastreamento.correios.com.br/app/index.php?codigo=${res.trackingCode}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <Truck className="mr-1 h-3 w-3" />
                                {res.trackingCode}
                                <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                navigator.clipboard.writeText(res.trackingCode);
                                toast.success("Código copiado!");
                              }}
                              title="Copiar código"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reservations?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Você ainda não fez nenhuma reserva.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
