import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { user, loading, signIn, resetPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center overflow-hidden bg-transparent mb-3">
            <img src="/favicon.png" alt="Logo" className=" w-[90px] h-[90px] h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Easy Assist</h1>
          <p className="text-muted-foreground text-sm">Sistema de Gestão para Assistências Tecnicas</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              {isForgotPassword ? "Recuperar senha" : "Bem-vindo de volta"}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? "Digite seu e-mail para receber um link de recuperação"
                : "Entre com suas credenciais para acessar o sistema"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Insira o seu e-mail"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required={!isForgotPassword}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => setIsForgotPassword(true)}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              <div className="flex flex-col space-y-2 mt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
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
                    className="w-full"
                    onClick={() => setIsForgotPassword(false)}
                    disabled={isSubmitting}
                  >
                    Voltar para o login
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso restrito. Para criar uma conta, entre em contato com o administrador.
        </p>
      </div>
    </div>
  );
}
