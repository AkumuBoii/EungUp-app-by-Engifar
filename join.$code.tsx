import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { joinClass } from "@/lib/memestudy.functions";
import { useAuth } from "@/hooks/useAuth";
import { Mascot } from "@/components/Mascot";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "Join a class — EungUp" },
      { name: "description", content: "Accept a EungUp class invite and start studying with your friends." },
      { property: "og:title", content: "Join a class — EungUp" },
      { property: "og:description", content: "Your invite is one tap away — join the class and grind together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = useParams({ from: "/join/$code" });
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const join = useServerFn(joinClass);
  const [status, setStatus] = useState("Checking your invite…");
  const done = useRef(false);

  useEffect(() => {
    if (loading || done.current) return;
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }
    done.current = true;
    join({ data: { code } })
      .then((res) => {
        qc.invalidateQueries({ queryKey: ["classes"] });
        toast.success(`Joined ${res.name}`);
        navigate({ to: "/classes" });
      })
      .catch((e: unknown) => {
        setStatus(e instanceof Error ? e.message : "That invite code didn't work.");
      });
  }, [loading, session, code, join, navigate, qc]);

  return (
    <div className="paper flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Mascot size={110} mood="hype" float />
      <h1 className="font-display text-3xl font-extrabold">Invite code {code}</h1>
      <p className="text-sm font-bold text-muted-foreground">{status}</p>
    </div>
  );
}
