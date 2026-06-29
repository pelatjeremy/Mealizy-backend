"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { clearAuthToken, getProfile, readAuthToken } from "@/lib/api";
import type { UserProfile } from "@/types/domain";

const publicRoutes = new Set(["/login", "/register"]);

function isPublicRoute(pathname: string) {
  return publicRoutes.has(pathname);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const isPublic = useMemo(() => isPublicRoute(pathname), [pathname]);

  useEffect(() => {
    let isActive = true;

    async function checkSession() {
      setIsCheckingSession(true);
      const token = readAuthToken();

      if (!token) {
        setUser(null);
        setIsCheckingSession(false);
        if (!isPublic) {
          router.replace("/login");
        }
        return;
      }

      try {
        const profile = await getProfile(token);
        if (!isActive) return;
        setUser(profile);
        setIsCheckingSession(false);
        if (isPublic || pathname === "/") {
          router.replace("/dashboard");
        }
      } catch {
        if (!isActive) return;
        clearAuthToken();
        setUser(null);
        setIsCheckingSession(false);
        if (!isPublic) {
          router.replace("/login");
        }
      }
    }

    checkSession();

    return () => {
      isActive = false;
    };
  }, [isPublic, pathname, router]);

  function handleLogout() {
    clearAuthToken();
    setUser(null);
    router.replace("/login");
  }

  const canRenderPrivatePage = Boolean(user) && !isPublic;
  const canRenderPublicPage = !user && isPublic;
  const shouldRenderChildren = canRenderPrivatePage || canRenderPublicPage;

  return (
    <AppShell user={user} isCheckingSession={isCheckingSession} onLogout={handleLogout}>
      {shouldRenderChildren ? children : null}
    </AppShell>
  );
}
