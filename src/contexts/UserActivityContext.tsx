import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

console.log("TS: UserActivityContext.tsx carregado no navegador");

interface UserActivityContextType {
  isActive: boolean;
}

const UserActivityContext = createContext<UserActivityContextType>({ isActive: true });

// A cada quantos milissegundos queremos checar e enviar o heartbeat pro servidor (ex: 30s)
const HEARTBEAT_INTERVAL = 30000; 

// Quantos minutos vamos registrar a cada envio (0.5m = 30s)
const MINUTES_TO_LOG = 0.5;

export function UserActivityProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const isActiveRef = useRef(true);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = async (minutes: number = MINUTES_TO_LOG) => {
    // Se a janela estiver invisível ou se passaram mais de 60s sem nenhuma interação
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    
    // Se a janela estiver invisível ou se passaram mais de 2 minutos sem nenhuma interação
    if (!isActiveRef.current || timeSinceLastActivity > HEARTBEAT_INTERVAL * 4) {
      console.log(`[Heartbeat] Pulado. (Ativo: ${isActiveRef.current}, Inativo há: ${Math.round(timeSinceLastActivity/1000)}s)`);
      isActiveRef.current = false;
      return;
    }

    try {
      console.log(`[Heartbeat] Enviando +${minutes} min de uso...`);
      // @ts-ignore - 'increment_user_usage' is not yet in generated types
      const { error } = await supabase.rpc("increment_user_usage", {
        minutes_to_add: minutes
      });
      
      if (error) {
        console.error("Erro ao registrar heartbeat de uso:", error);
      } else {
        console.log(`[Heartbeat] Sucesso: +${minutes} min registrados.`);
      }
    } catch (err) {
      console.error("Erro inesperado no heartbeat:", err);
    }
  };

  useEffect(() => {
    // Se não há usuário logado, não precisa rastrear
    if (!session?.user) return;

    console.log("[UserActivity] Ativando rastreamento de uso para:", session.user.email);

    // Função chamada toda vez que o usuário interage
    const handleActivity = () => {
      if (!isActiveRef.current) {
        console.log("[UserActivity] Usuário voltou a ficar ativo.");
      }
      isActiveRef.current = true;
      lastActivityRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        console.log("[UserActivity] Aba oculta (Sessão Pausada).");
        isActiveRef.current = false;
      } else {
        console.log("[UserActivity] Aba ativa (Retomando Rastreamento).");
        isActiveRef.current = true;
        lastActivityRef.current = Date.now();
        // Dispara um heartbeat imediato ao voltar para a aba se ja passou algum tempo
        sendHeartbeat(0.1); 
      }
    };

    // Registrar eventos de interação comuns
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 1. Heartbeat Inicial (após 10 segundos) para feedback rápido
    const initialTimeout = setTimeout(() => {
      sendHeartbeat(0.2); // Registra os primeiros 12 segundos
    }, 10000);

    // 2. Configurar o Heartbeat Regular (cada 30s)
    intervalRef.current = setInterval(() => {
      sendHeartbeat(MINUTES_TO_LOG);
    }, HEARTBEAT_INTERVAL);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session]); // Recria apenas se a sessão mudar

  return (
    <UserActivityContext.Provider value={{ isActive: isActiveRef.current }}>
      {children}
    </UserActivityContext.Provider>
  );
}

export function useUserActivity() {
  return useContext(UserActivityContext);
}
