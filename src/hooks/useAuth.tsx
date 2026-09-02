import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<boolean>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // True only while the user explicitly signs out, so we never drop the session
  // because of a transient storage/network hiccup (preview iframes, offline, etc.).
  const explicitSignOutRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let mounted = true;

    const apply = (next: Session | null) => {
      if (!mounted) return;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    };

    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) apply(session);
      else if (mounted) setLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (nextSession) {
        explicitSignOutRef.current = false;
        apply(nextSession);
        return;
      }

      // A null session that we did not ask for: keep the current one and try to
      // recover it instead of logging the user out.
      if (event === "SIGNED_OUT" && explicitSignOutRef.current) {
        apply(null);
        return;
      }

      if (!sessionRef.current) {
        setLoading(false);
        return;
      }

      (async () => {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          apply(data.session);
          return;
        }
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!mounted) return;
        if (refreshed?.session) apply(refreshed.session);
        else apply(null);
      })();
    });

    // Re-validate (and silently refresh) when the tab wakes up or reconnects.
    const revalidate = async () => {
      if (explicitSignOutRef.current) return;
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) apply(data.session);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", revalidate);
    window.addEventListener("focus", revalidate);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", revalidate);
      window.removeEventListener("focus", revalidate);
      subscription.unsubscribe();
    };
  }, []);


  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Inscription réussie",
        description: "Vérifiez votre email pour confirmer votre compte.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur YIMA !",
      });
    }

    return { error };
  };

  const signOut = async () => {
    explicitSignOutRef.current = true;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    toast({
      title: "Déconnexion",
      description: "À bientôt sur YIMA !",
    });
  };


  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre email pour réinitialiser votre mot de passe.",
      });
    }

    return { error };
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error || !currentSession) {
        // Session is invalid, clear state
        setUser(null);
        setSession(null);
        return false;
      }
      
      // Update state with refreshed session
      setSession(currentSession);
      setUser(currentSession.user);
      return true;
    } catch (e) {
      console.error('Session refresh failed:', e);
      setUser(null);
      setSession(null);
      return false;
    }
  };

  const value = {
    user,
    session,
    loading,
    refreshSession,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}