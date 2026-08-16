import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          setUrl(null);
          return;
        }
        setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
