import { useCallback, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyClasses } from "@/lib/memestudy.functions";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "eungup.activeClassId";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export function setActiveClassId(classId: string | null) {
  if (typeof window === "undefined") return;
  if (classId) window.localStorage.setItem(STORAGE_KEY, classId);
  else window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((cb) => cb());
}

/** The signed-in user's classes. */
export function useMyClasses() {
  const { session, loading } = useAuth();
  const load = useServerFn(listMyClasses);
  return useQuery({
    queryKey: ["classes", session?.user.id],
    queryFn: () => load(),
    enabled: Boolean(session) && !loading,
    staleTime: 30_000,
  });
}

/**
 * The class is the primary container: every feature page reads the active
 * class from here so tasks, feed, leaderboard and battles stay scoped.
 */
export function useActiveClass() {
  const classes = useMyClasses();
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const list = classes.data ?? [];
  const active = list.find((c) => c.id === stored) ?? list[0] ?? null;

  const setActive = useCallback((classId: string | null) => setActiveClassId(classId), []);

  return {
    classes: list,
    activeClass: active,
    activeClassId: active?.id ?? null,
    setActive,
    isLoading: classes.isLoading,
  };
}
