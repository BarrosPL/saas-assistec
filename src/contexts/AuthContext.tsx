import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data as Profile;
  };

  useEffect(() => {
    let mounted = true;

    async function loadSession(currentSession: Session | null) {
      if (!currentSession?.user) {
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      // Check ban BEFORE populating state
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("user_id", currentSession.user.id)
        .single();

      if (userProfile?.is_banned) {
        await supabase.auth.signOut();
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const fullProfile = await fetchProfile(currentSession.user.id);
      
      if (mounted) {
        setSession(currentSession);
        setUser(currentSession.user);
        setProfile(fullProfile);
        setLoading(false);
      }
    }

    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSession(session);
    });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // 1. Loga o usuário no provedor Auth do Supabase (cria o cookie)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error as Error | null };

    // 2. Antes de liberar o login pro frontend, checamos o status da conta
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("user_id", data.user.id)
        .single();

      // 3. Se estiver banido: remove o cookie e retorna um erro customizado na hora
      if (profile?.is_banned) {
        // Garantindo que a sessão não vaze pro frontend
        setSession(null);
        setUser(null);
        setProfile(null);
        await supabase.auth.signOut();
        return { error: new Error("account_banned") };
      }

      // 4. Se chegou aqui, tá tudo certo. Então SIM, liberamos o login pro front!
      const fullProfile = await fetchProfile(data.user.id);
      setSession(data.session);
      setUser(data.user);
      setProfile(fullProfile);
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
