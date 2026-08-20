import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Bruno & Zaki Garage Diecast - Redefinir Senha" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verifica se há uma sessão ativa após o Supabase ler o hash do e-mail
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Sessão inválida ou expirada. Solicite a recuperação novamente.");
        navigate({ to: "/auth" });
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    const isSecure = password.length >= 8 && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!isSecure) {
      toast.error("A senha deve ter pelo menos 8 caracteres, incluir números e caracteres especiais (ex: !@#).");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      toast.success("Senha redefinida com sucesso!");
      
      const { data: isAdmin } = await supabase.rpc('has_role', { _role: 'admin' } as any);
      if (isAdmin) {
        navigate({ to: "/admin/miniatures" });
      } else {
        navigate({ to: "/orders" });
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Ocorreu um erro ao redefinir sua senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Criar Nova Senha
          </CardTitle>
          <CardDescription>
            Digite a sua nova senha abaixo. Escolha uma senha segura e que você não esqueça.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              <Lock className="mr-2 h-4 w-4" /> Salvar nova senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
