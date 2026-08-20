import { createFileRoute, Outlet, redirect, useRouter, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Package, LayoutDashboard, Settings, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    // We cannot easily block the initial load synchronously without SSR,
    // so we handle it in the component layer with a loader state.
    // However, if we know they are definitely not logged in, we could throw a redirect here.
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsChecking(false);
      if (!session) {
        navigate({ to: "/auth" });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate({ to: "/auth" });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const location = useLocation();

  const { data: adminStatus, isLoading: isRoleLoading } = useQuery({
    queryKey: ["adminStatus"],
    queryFn: () => getAdminStatus(),
    enabled: isAuthenticated,
  });

  if (isChecking || (isAuthenticated && isRoleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const isAdmin = adminStatus?.isAdmin;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold font-oswald text-primary">
              {isAdmin ? "Painel" : "Área do Cliente"}
            </h1>
            
            <div className="flex items-center gap-2 border-l pl-4 sm:pl-6 ml-2 overflow-x-auto pb-1 -mb-1">
              <Button 
                variant={location.pathname === '/' ? "secondary" : "ghost"} 
                size="sm" 
                asChild
              >
                <Link to="/">Loja</Link>
              </Button>
              
              {isAdmin ? (
                <>
                  <Button 
                    variant={location.pathname.startsWith('/admin/miniatures') ? "secondary" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <Link to="/admin/miniatures">
                      <Package className="mr-2 h-4 w-4" />
                      Miniaturas
                    </Link>
                  </Button>
                  <Button 
                    variant={location.pathname.startsWith('/admin/reservations') ? "secondary" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <Link to="/admin/reservations">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Pedidos Clientes
                    </Link>
                  </Button>
                </>
              ) : (
                <Button 
                  variant={location.pathname.startsWith('/orders') ? "secondary" : "ghost"} 
                  size="sm" 
                  asChild
                >
                  <Link to="/orders">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Meus Pedidos
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
