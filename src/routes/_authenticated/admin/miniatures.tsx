import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Pencil, Trash2, Plus, Image as ImageIcon, Loader2 } from "lucide-react";

import { listAdminMiniatures, saveMiniature, deleteMiniature, AdminMiniature } from "@/lib/admin.functions";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/catalog.schemas";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/miniatures")({
  head: () => ({
    meta: [{ title: "Admin - Miniaturas | Bruno & Zaki Garage Diecast" }],
  }),
  component: AdminMiniaturesPage,
});

function AdminMiniaturesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMiniature, setEditingMiniature] = useState<Partial<AdminMiniature>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: miniatures, isLoading } = useQuery({
    queryKey: ["admin", "miniatures"],
    queryFn: () => listAdminMiniatures(),
  });

  const saveMutation = useMutation({
    mutationFn: saveMiniature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "miniatures"] });
      setIsDialogOpen(false);
      setEditingMiniature({});
      setImageFile(null);
      toast.success("Miniatura salva com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar miniatura");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMiniature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "miniatures"] });
      toast.success("Miniatura excluída");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir miniatura");
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMiniature.title || !editingMiniature.description || editingMiniature.priceCents === undefined || editingMiniature.stock === undefined) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    let imagePath = editingMiniature.imagePath;

    if (!imageFile && !imagePath) {
      toast.error("A imagem da miniatura é obrigatória");
      return;
    }

    if (imageFile) {
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type as any)) {
        toast.error("Formato de imagem inválido");
        return;
      }
      if (imageFile.size > MAX_IMAGE_BYTES) {
        toast.error("A imagem deve ter no máximo 3MB");
        return;
      }

      setIsUploading(true);
      try {
        const ext = imageFile.name.split('.').pop();
        const filename = `${uuidv4()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('miniatures')
          .upload(filename, imageFile, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) throw uploadError;
        imagePath = filename;
      } catch (err) {
        toast.error("Erro ao fazer upload da imagem");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    saveMutation.mutate({
      data: {
        id: editingMiniature.id,
        title: editingMiniature.title,
        description: editingMiniature.description || "",
        priceCents: Number(editingMiniature.priceCents),
        stock: Number(editingMiniature.stock),
        published: editingMiniature.published ?? true,
        imagePath,
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Miniaturas</h2>
        <Button onClick={() => {
          setEditingMiniature({ published: true, priceCents: 0, stock: 1 });
          setImageFile(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Miniatura
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {miniatures?.map((mini: any) => (
            <Card key={mini.id} className={!mini.published ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-1">{mini.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
                  <span>{(mini.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <span>Estoque: {mini.stock}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" onClick={() => {
                    setEditingMiniature(mini);
                    setImageFile(null);
                    setIsDialogOpen(true);
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => {
                    if (confirm("Tem certeza que deseja excluir esta miniatura?")) {
                      deleteMutation.mutate({ data: { id: mini.id } });
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {miniatures?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">
              Nenhuma miniatura cadastrada.
            </p>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingMiniature.id ? "Editar Miniatura" : "Nova Miniatura"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={editingMiniature.title || ""}
                  onChange={(e) => setEditingMiniature({ ...editingMiniature, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={editingMiniature.description || ""}
                  onChange={(e) => setEditingMiniature({ ...editingMiniature, description: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priceCents">Preço (R$)</Label>
                  <Input
                    id="priceCents"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingMiniature.priceCents !== undefined ? editingMiniature.priceCents / 100 : ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEditingMiniature({ ...editingMiniature, priceCents: isNaN(val) ? 0 : Math.round(val * 100) });
                    }}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stock">Estoque</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={editingMiniature.stock ?? ""}
                    onChange={(e) => setEditingMiniature({ ...editingMiniature, stock: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="image">Imagem (Obrigatória)</Label>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" className="w-full relative overflow-hidden">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImageFile(e.target.files[0]);
                        }
                      }}
                    />
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {imageFile ? imageFile.name : (editingMiniature.imagePath ? "Trocar imagem" : "Selecionar imagem")}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Publicado</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar no catálogo público
                  </p>
                </div>
                <Switch
                  checked={editingMiniature.published ?? true}
                  onCheckedChange={(checked) => setEditingMiniature({ ...editingMiniature, published: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending || isUploading}>
                {saveMutation.isPending || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
