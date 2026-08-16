import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Link2, Users, ArrowRight } from "lucide-react";
import { createClass, joinClass, leaveClass } from "@/lib/memestudy.functions";
import { Mascot } from "@/components/Mascot";
import { useActiveClass } from "@/hooks/useActiveClass";
import { cn } from "@/lib/utils";

function inviteLink(code: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/join/${code}`;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy — copy it manually");
  }
}

export function MyClasses() {
  const qc = useQueryClient();
  const { classes, activeClassId, setActive } = useActiveClass();
  const create = useServerFn(createClass);
  const join = useServerFn(joinClass);
  const leave = useServerFn(leaveClass);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");

  const createMut = useMutation({
    mutationFn: () => create({ data: { name, description } }),
    onSuccess: (res) => {
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["classes"] });
      setActive(res.id);
      toast.success(`${res.name} created — invite code ${res.invite_code}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create class"),
  });

  const joinMut = useMutation({
    mutationFn: () => join({ data: { code } }),
    onSuccess: (res) => {
      setCode("");
      qc.invalidateQueries({ queryKey: ["classes"] });
      setActive(res.id);
      toast.success(`Joined ${res.name}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not join"),
  });

  const leaveMut = useMutation({
    mutationFn: (classId: string) => leave({ data: { classId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Left the class");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mascot size={56} mood="smug" />
        <div>
          <h1 className="font-display text-3xl font-extrabold">My classes</h1>
          <p className="text-sm font-bold text-muted-foreground">
            A class holds its own tasks, feed, leaderboard and battles. Pick the one you're studying with.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="ink-card p-5">
          <h2 className="font-display text-xl font-extrabold">Create a class</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Biology Warriors"
            className="ink-border mt-3 w-full rounded-xl bg-card px-4 py-3 font-bold"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are we grinding for?"
            className="ink-border mt-2 w-full rounded-xl bg-card px-4 py-3 font-bold"
          />
          <button
            disabled={name.trim().length < 2 || createMut.isPending}
            onClick={() => createMut.mutate()}
            className="ink-border mt-3 w-full rounded-xl bg-primary px-4 py-3 font-display text-lg font-extrabold text-primary-foreground shadow-ink-sm disabled:opacity-50"
          >
            {createMut.isPending ? "Creating…" : "Create class"}
          </button>
        </section>

        <section className="ink-card p-5">
          <h2 className="font-display text-xl font-extrabold">Join a class</h2>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="BIO-8X4K"
            className="ink-border mt-3 w-full rounded-xl bg-card px-4 py-3 font-bold tracking-widest"
          />
          <button
            disabled={code.trim().length < 4 || joinMut.isPending}
            onClick={() => joinMut.mutate()}
            className="ink-border mt-3 w-full rounded-xl bg-accent px-4 py-3 font-display text-lg font-extrabold shadow-ink-sm disabled:opacity-50"
          >
            {joinMut.isPending ? "Joining…" : "Join with code"}
          </button>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            Got an invite link instead? Just open it — it joins you automatically.
          </p>
        </section>
      </div>

      <div className="space-y-4">
        {classes.map((klass) => (
          <article
            key={klass.id}
            className={cn("ink-card p-5", klass.id === activeClassId && "bg-secondary")}
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-extrabold">{klass.name}</h2>
              {klass.isOwner && (
                <span className="ink-border rounded-full bg-primary px-2 py-0.5 text-xs font-extrabold text-primary-foreground">
                  owner
                </span>
              )}
              {klass.id === activeClassId && (
                <span className="ink-border rounded-full bg-accent px-2 py-0.5 text-xs font-extrabold">active</span>
              )}
              <span className="ml-auto flex items-center gap-1 text-sm font-extrabold text-muted-foreground">
                <Users className="size-4" /> {klass.members.length}
              </span>
            </div>
            {klass.description && <p className="mt-1 text-sm text-muted-foreground">{klass.description}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                to="/classes/$classId"
                params={{ classId: klass.id }}
                onClick={() => setActive(klass.id)}
                className="ink-border flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground"
              >
                Open class <ArrowRight className="size-4" />
              </Link>
              {klass.id !== activeClassId && (
                <button
                  onClick={() => setActive(klass.id)}
                  className="ink-border rounded-xl bg-card px-3 py-2 text-sm font-extrabold"
                >
                  Make active
                </button>
              )}
              <span className="ink-border rounded-xl bg-secondary px-3 py-2 font-display text-lg font-extrabold tracking-widest">
                {klass.invite_code}
              </span>
              <button
                onClick={() => copy(klass.invite_code, "Invite code")}
                className="ink-border flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-sm font-extrabold"
              >
                <Copy className="size-4" /> Copy code
              </button>
              <button
                onClick={() => copy(inviteLink(klass.invite_code), "Invite link")}
                className="ink-border flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-sm font-extrabold"
              >
                <Link2 className="size-4" /> Copy link
              </button>
              {!klass.isOwner && (
                <button
                  onClick={() => leaveMut.mutate(klass.id)}
                  className="ink-border ml-auto rounded-xl bg-card px-3 py-2 text-sm font-extrabold text-shame"
                >
                  Leave
                </button>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs font-extrabold uppercase text-muted-foreground">Class members</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {klass.members.map((m) => (
                  <li
                    key={m.user_id}
                    className="ink-border flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm font-bold"
                  >
                    <Mascot size={22} mood="smug" />@{m.profile?.username ?? "student"}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}

        {classes.length === 0 && (
          <p className="ink-card p-6 text-center text-sm font-bold text-muted-foreground">
            No classes yet. Create one above, or paste a friend's invite code.
          </p>
        )}
      </div>
    </div>
  );
}
