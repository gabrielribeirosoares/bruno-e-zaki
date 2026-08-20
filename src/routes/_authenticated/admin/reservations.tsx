import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Package, Search, Copy } from "lucide-react";

import { listReservations, markReservationPaid } from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { cancelReservation, updateTrackingCode } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/reservations")({
  head: () => ({
    meta: [{ title: "Admin - Pedidos | Bruno & Zaki Garage Diecast" }],
  }),
  component: AdminReservationsPage,
});

function AdminReservationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingCodeInput, setTrackingCodeInput] = useState("");

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["admin", "reservations"],
    queryFn: () => listReservations(),
  });

  const markPaidMutation = useMutation({
    mutationFn: markReservationPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
      toast.success("Pedido marcado como pago!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao dar baixa no pedido.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
      toast.success("Pedido cancelado e itens devolvidos ao estoque!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cancelar pedido.");
    },
  });

  const trackingMutation = useMutation({
    mutationFn: updateTrackingCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
      toast.success("Código de rastreio atualizado!");
      setIsTrackingModalOpen(false);
      setTrackingCodeInput("");
      setSelectedIds(new Set());
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar rastreio.");
    },
  });

  const filteredReservations = reservations?.filter(
    (res: any) => {
      const search = searchTerm.toLowerCase();
      return res.customerName?.toLowerCase().includes(search) ||
        res.customerEmail?.toLowerCase().includes(search) ||
        res.customerPhone?.toLowerCase().includes(search) ||
        res.id.includes(search);
    }
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReservations?.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set<string>((filteredReservations || []).map((r: any) => String(r.id)));
      setSelectedIds(allIds);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pedidos</h2>
          <p className="text-muted-foreground">Gerencie as reservas e pagamentos dos clientes.</p>
        </div>
        
        <div className="flex w-full sm:w-[400px] gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome, email, ou whatsapp..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchTerm(searchInput);
              }}
            />
          </div>
          <Button variant="secondary" onClick={() => setSearchTerm(searchInput)}>
            Pesquisar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="px-6 py-4 flex flex-row items-center justify-between border-b bg-muted/20">
          <div>
            <CardTitle>Histórico de Reservas</CardTitle>
            <CardDescription>Confirme pagamentos e adicione rastreios.</CardDescription>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">{selectedIds.size} selecionado(s)</span>
              <Button size="sm" onClick={() => setIsTrackingModalOpen(true)}>
                <Package className="mr-2 h-4 w-4" /> Adicionar Rastreio
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox 
                        checked={filteredReservations?.length > 0 && selectedIds.size === filteredReservations?.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">ID / Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="min-w-[150px]">Itens</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">Rastreio</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations?.map((res: any) => (
                    <TableRow key={res.id}>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={selectedIds.has(res.id)}
                          onCheckedChange={() => toggleSelect(res.id)}
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-medium">
                        <div className="truncate w-24" title={res.id}>
                          {res.id.split("-")[0]}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(res.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[140px] align-top">
                        <div className="font-medium break-words leading-tight">{res.customerName}</div>
                        <div className="text-xs text-muted-foreground break-all mt-1">{res.customerEmail}</div>
                        {res.customerPhone && (
                          <div className="text-xs text-muted-foreground">{res.customerPhone}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] align-top whitespace-normal">
                        <div className="space-y-3">
                          {res.items.map((item: any) => (
                            <div key={item.id} className="text-sm flex items-start gap-3 leading-tight">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.title} className="w-16 h-12 shrink-0 rounded object-cover border border-border/50" />
                              ) : (
                                <div className="w-16 h-12 shrink-0 rounded bg-muted flex items-center justify-center border border-border/50">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex flex-col py-1">
                                <span className="break-words font-medium"><span className="text-muted-foreground font-normal">{item.quantity}x</span> {item.title}</span>
                              </div>
                            </div>
                          ))}
                          {res.note && (
                            <div className="mt-2 pt-2 text-xs italic text-muted-foreground border-t border-border/50 break-words leading-relaxed">
                              <span className="font-semibold not-italic">Obs:</span> {res.note}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(res.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-2 items-start">
                          {res.status === "paid" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/20">Pago</Badge>
                          ) : res.status === "cancelled" ? (
                            <Badge variant="destructive">Cancelado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/20">Pendente</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell align-top">
                        {res.trackingCode ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="secondary" className="font-mono text-xs font-normal h-6 rounded-sm">
                              {res.trackingCode}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
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
                      <TableCell className="text-right align-top">
                        {res.status === "pending" && (
                          <div className="flex flex-col sm:flex-row justify-end gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                              disabled={cancelMutation.isPending}
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja cancelar o pedido de ${res.customerName} e devolver os itens ao estoque?`)) {
                                  cancelMutation.mutate({ data: { id: res.id } });
                                }
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              variant="default"
                              size="sm"
                              className="w-full sm:w-auto"
                              disabled={markPaidMutation.isPending}
                              onClick={() => {
                                if (confirm(`Confirmar o pagamento do pedido de ${res.customerName}?`)) {
                                  markPaidMutation.mutate({ data: { id: res.id } });
                                }
                              }}
                            >
                              <CheckCircle2 className="sm:mr-2 h-4 w-4 shrink-0" />
                              <span className="hidden sm:inline">Dar Baixa</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredReservations?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Nenhum pedido encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Código de Rastreio</DialogTitle>
            <DialogDescription>
              Isso irá atualizar o código de rastreio para os {selectedIds.size} pedidos selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="tracking">Código (Correios/Transportadora)</Label>
            <Input 
              id="tracking" 
              placeholder="Ex: NL123456789BR" 
              value={trackingCodeInput}
              onChange={(e) => setTrackingCodeInput(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrackingModalOpen(false)}>Cancelar</Button>
            <Button 
              disabled={trackingMutation.isPending || !trackingCodeInput.trim()}
              onClick={() => trackingMutation.mutate({ data: { ids: Array.from(selectedIds), trackingCode: trackingCodeInput } })}
            >
              {trackingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Rastreio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
