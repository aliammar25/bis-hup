import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase.js";

const Ctx = createContext(null);

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        console.error("Session error:", error);
      }

      setSession(data?.session ?? null);
      setReady(true);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      setIsAdmin(false);

      if (!supabase || !session?.user?.id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Admin check error:", error);
          return;
        }

        if (active) {
          setIsAdmin(data?.role === "admin");
        }
      } catch (error) {
        console.error("Admin check failed:", error);
      }
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, [session]);

  const login = async (email, password) => {
    if (!supabase) {
      throw new Error("Supabase غير مهيأ.");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const logout = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setSession(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        isAdmin,
        ready,
        login,
        logout,
        enabled: !!supabase,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
