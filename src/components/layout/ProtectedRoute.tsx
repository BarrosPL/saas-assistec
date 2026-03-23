import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  const { data: routeData, isLoading: roleLoading } = useQuery({
    queryKey: ["protected-route-user-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("is_super_admin, is_banned")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isSuperAdmin = !!routeData?.is_super_admin;
  const isBanned = !!routeData?.is_banned;

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Desloga e manda de volta pra auth se estiver banido
  if (isBanned && location.pathname !== "/auth") {
    return <Navigate to="/auth" replace />;
  }

  // Super admin acessa apenas /saas-admin
  if (isSuperAdmin && location.pathname !== "/saas-admin") {
    return <Navigate to="/saas-admin" replace />;
  }

  // Usuário normal não pode acessar /saas-admin
  if (!isSuperAdmin && location.pathname === "/saas-admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
