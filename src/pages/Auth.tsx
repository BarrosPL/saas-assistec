import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading, signIn, resetPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isForgotPassword) {
      const { error } = await resetPassword(loginEmail);
      if (error) {
        toast.error("Erro ao enviar link de recuperação", {
          description: error.message,
        });
      } else {
        toast.success("E-mail enviado!", {
          description: "Verifique sua caixa de entrada para criar uma nova senha.",
        });
        setIsForgotPassword(false);
      }
      setIsSubmitting(false);
      return;
    }

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      if (error.message === "account_banned") {
        toast.error("Acesso Negado", {
          description: "Sua conta foi bloqueada pelo administrador do sistema.",
        });
      } else {
        toast.error("Erro ao fazer login", {
          description: error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos"
            : error.message,
        });
      }
    } else {
      toast.success("Login realizado com sucesso!");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:flex-1 relative flex-col justify-between p-10 overflow-hidden bg-slate-900 border-r border-border/50 shadow-2xl z-10">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?q=80&w=1974&auto=format&fit=crop" 
            alt="Assistência Técnica" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay grayscale-[30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40"></div>
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-transparent">
            <img src="/favicon.png" alt="Logo" className="h-8 w-8 object-contain drop-shadow-md" />
          </div>
          <span className="text-xl font-bold text-white drop-shadow-md">
            Easy Assist
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white drop-shadow-sm">
            Gestão inteligente para sua
            <br />
            <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">assistência técnica</span>
          </h1>
          <p className="text-slate-200 max-w-md text-base leading-relaxed drop-shadow-sm">
            Controle ordens de serviço, estoque, clientes e o financeiro em um só lugar de forma simples e rápida.
          </p>
          <div className="flex gap-8 pt-4">
            {[
              { value: "+Ágil", label: "Atendimento" },
              { value: "100%", label: "Controle" },
              { value: "24/7", label: "Acesso" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-primary drop-shadow-sm">
                  {stat.value}
                </p>
                <p className="text-sm font-medium text-slate-300 drop-shadow-sm mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm font-medium text-slate-400 drop-shadow-sm">
          © {new Date().getFullYear()} Easy Assist. Todos os direitos reservados.
        </p>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none"></div>
        
        <div className="w-full max-w-sm space-y-8 relative z-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-4 justify-center mb-8">
            <div className="flex h-20 w-20 items-center justify-center bg-transparent drop-shadow-sm">
               <img src="/favicon.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Easy Assist</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">
              {isForgotPassword ? "Recuperar senha" : "Bem-vindo de volta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isForgotPassword
                ? "Digite seu e-mail para receber um link de recuperação"
                : "Acesse sua conta para gerenciar sua assistência"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9 bg-background/50 backdrop-blur-sm"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    disabled={isSubmitting}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-9 pr-10 bg-background/50 backdrop-blur-sm"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-3 pt-2">
              <Button type="submit" className="w-full h-11 text-base font-medium shadow-sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isForgotPassword ? "Enviando..." : "Entrando..."}
                  </>
                ) : (
                  isForgotPassword ? "Enviar link de recuperação" : "Entrar"
                )}
              </Button>

              {isForgotPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-11"
                  onClick={() => setIsForgotPassword(false)}
                  disabled={isSubmitting}
                >
                  Voltar para o login
                </Button>
              )}
            </div>
          </form>

          <p className="text-center text-xs text-muted-foreground/80 pt-4">
            Acesso restrito. Para criar uma conta, <br className="lg:hidden" /> entre em contato com o administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
