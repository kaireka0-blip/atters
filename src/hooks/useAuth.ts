import React, { useState, useEffect, useCallback } from "react";
import { User, ViewType } from "../types";
import { LAST_ROUTE_STORAGE_KEY } from "../routes/routesConfig";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { restoreQueryCache } from "../lib/queryCachePersistence";
import { resolveAuthenticatedViewFromHash } from "./useAppRouting";
import {
  endCurrentLoginSession,
  heartbeatCurrentLoginSession,
  registerCurrentLoginSession,
} from "../services/loginSessions";



export interface UseAuthReturn {
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  handleLoginSuccess: (user: User) => Promise<void>;
  handleLogout: () => void;
  hasPermission: (view: ViewType) => boolean;
}

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const storedValue = window.localStorage.getItem("weddfin-isAuthenticated");
      return storedValue ? JSON.parse(storedValue) : false;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const storedValue = window.localStorage.getItem("weddfin-currentUser");
      return storedValue ? JSON.parse(storedValue) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated) return;

    let isActive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive) return;
      if (error) console.warn('[Auth] Failed to restore Supabase session:', error);
      if (!data.session) {
        queryClient.clear();
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    });

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    window.localStorage.setItem(
      "weddfin-isAuthenticated",
      JSON.stringify(isAuthenticated),
    );
  }, [isAuthenticated]);

  useEffect(() => {
    window.localStorage.setItem(
      "weddfin-currentUser",
      JSON.stringify(currentUser),
    );
  }, [currentUser]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || !isSupabaseConfigured) return;
    const syncSession = async () => {
      try {
        await registerCurrentLoginSession(currentUser, { notify: false });
        await heartbeatCurrentLoginSession(currentUser.id);
      } catch (error) {
        console.warn('[Login sessions] Could not sync current session:', error);
      }
    };
    const heartbeat = () => {
      if (document.visibilityState !== 'visible') return;
      void heartbeatCurrentLoginSession(currentUser.id).catch((error) => {
        console.warn('[Login sessions] Heartbeat failed:', error);
      });
    };
    void syncSession();
    heartbeat();
    const timer = window.setInterval(heartbeat, 30_000);
    document.addEventListener('visibilitychange', heartbeat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', heartbeat);
    };
  }, [currentUser, isAuthenticated]);


  const handleLoginSuccess = useCallback(async (user: User) => {
    try {
      await registerCurrentLoginSession(user);
    } catch (error) {
      console.warn('[Login sessions] Could not record new login:', error);
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await restoreQueryCache(queryClient, user.id);
    } catch (error) {
      console.warn('[QueryCache] Failed to restore user cache after login.', error);
    }
    setIsAuthenticated(true);
    setCurrentUser(user);
    try {
      const currentHash = window.location.hash;
      if (resolveAuthenticatedViewFromHash(currentHash)) {
        return;
      }
      const last = window.localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
      if (
        last &&
        typeof last === "string" &&
        last.startsWith("#/") &&
        resolveAuthenticatedViewFromHash(last)
      ) {
        window.location.hash = last;
        return;
      }
    } catch (e) {
      console.warn("[Routing] Failed to read last route after login:", e);
    }

    window.location.hash = "#/dashboard";
  }, [queryClient]);

  const handleLogout = useCallback(async () => {
    if (currentUser) {
      try {
        await endCurrentLoginSession(currentUser.id);
      } catch (e) {
        console.warn("[Login sessions] Could not close current session:", e);
      }
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[Supabase] Logout error:", e);
    }
    
    queryClient.clear();
    setIsAuthenticated(false);
    setCurrentUser(null);
    try {
      window.localStorage.removeItem(LAST_ROUTE_STORAGE_KEY);
    } catch {}
    window.location.hash = "#/home";
  }, [currentUser, queryClient]);

  const hasPermission = useCallback(
    (view: ViewType) => {
      if (!currentUser) return false;
      if (currentUser.role === "Admin") return true;
      return currentUser.permissions?.includes(view) || false;
    },
    [currentUser],
  );

  return {
    isAuthenticated,
    setIsAuthenticated,
    currentUser,
    setCurrentUser,
    users,
    setUsers,
    handleLoginSuccess,
    handleLogout,
    hasPermission,
  };
}

export default useAuth;
