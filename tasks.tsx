import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CheckCircle2, HelpCircle } from "lucide-react";
import {
  listSubjectsAndTasks,
  createSubject,
  createTask,
  submitTask,
  askForHelp,
} from "@/lib/memestudy.functions";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { ClassSwitcher, NoClassPrompt } from "@/components/ClassSwitcher";
import { useActiveClass } from "@/hooks/useActiveClass";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Class tasks & subjects — EungUp" },
      { name: "description", content: "Class homework by subject: submit tasks for worms and ask classmates for help." },
      { property: "og:title", content: "Class tasks & subjects — EungUp" },
      { property: "og:description", content: "Every task belongs to a class, visible only to its members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

const COLORS = ["#3ED9A4", "#F4A261", "#6C8EF5", "#C77DFF", "#F26D6D"];

function TasksPage() {
  return (
    <AppShell>
      <Tasks />
    </AppShell>
  );
}

function Tasks() {
  const qc = useQueryClient();
  const { activeClass, activeClassId, isLoading } = useActiveClass();
  const load = useServerFn(listSubjectsAndTasks);
  const addSubject = useServerFn(createSubject);
  const addTask = useServerFn(createTask);
  const submit = useServerFn(submitTask);
  const help = useServerFn(askForHelp);

  const data = useQuery({
    queryKey: ["subjects-tasks", activeClassId],
    queryFn: () => load({ data: { classId: activeClassId } }),
    enabled: Boolean(activeClassId),
  });
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [subjectName, setSubjectName] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["subjects-tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["class-dashboard"] });
  };

  const taskMutation = useMutation({
    mutationFn: () =>
      addTask({
        data: {
          title,
          subjectId: subjectId || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          classId: activeClassId,
        },
      }),
    onSuccess: () => {
      setTitle("");
      setDueAt("");
      refresh();
      toast.success("Task added to the class");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const subjectMutation = useMutation({
    mutationFn: () =>
      addSubject({
        data: {
          name: subjectName,
          color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
          classId: activeClassId,
        },
      }),
    onSuccess: () => {
      setSubjectName("");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const submitMutation = useMutation({
    mutationFn: (taskId: string) => submit({ data: { taskId } }),
    onSuccess: (res) => {
      refresh();
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(`Submitted! +${res.worms} 🪱`);
    },
  });

  const helpMutation = useMutation({
    mutationFn: (taskId: string) => help({ data: { taskId, message: "" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("อึ่ง shouted for help in the class feed");
    },
  });

  if (!isLoading && !activeClassId) return <NoClassPrompt what="Homework" />;

  const tasks = data.data?.tasks ?? [];
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold">{activeClass?.name ?? "Class"} tasks</h1>
        <ClassSwitcher className="ml-auto" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="ink-card p-5">
            <h2 className="font-display text-2xl font-extrabold">Open tasks</h2>
            <ul className="mt-3 space-y-2">
              {open.map((task) => (
                <li key={task.id} className="ink-border flex flex-wrap items-center gap-2 rounded-xl bg-card px-3 py-2">
                  <div className="flex-1">
                    <p className="font-extrabold">{task.title}</p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {(task.subjects as { name?: string } | null)?.name ?? "No subject"} ·{" "}
                      {task.due_at ? new Date(task.due_at).toLocaleDateString() : "no due date"} · @
                      {task.owner?.username ?? "student"}
                    </p>
                  </div>
                  {task.isMine && (
                    <>
                      <button
                        onClick={() => helpMutation.mutate(task.id)}
                        className="ink-border rounded-full bg-secondary p-2"
                        aria-label="Ask for help"
                      >
                        <HelpCircle className="size-4" />
                      </button>
                      <button
                        onClick={() => submitMutation.mutate(task.id)}
                        className="ink-border flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-extrabold text-primary-foreground"
                      >
                        <CheckCircle2 className="size-4" /> Submit
                      </button>
                    </>
                  )}
                </li>
              ))}
              {open.length === 0 && (
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mascot size={48} mood="sleepy" /> Nothing left. Add something before อึ่ง gets bored.
                </li>
              )}
            </ul>
          </div>

          {done.length > 0 && (
            <div className="ink-card p-5">
              <h2 className="font-display text-xl font-extrabold">Done</h2>
              <ul className="mt-3 space-y-1">
                {done.map((task) => (
                  <li key={task.id} className="text-sm font-bold text-muted-foreground line-through">
                    {task.title} · @{task.owner?.username ?? "student"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="ink-card p-5">
            <h2 className="font-display text-xl font-extrabold">New task</h2>
            <p className="text-xs font-bold text-muted-foreground">
              Class: {activeClass?.name ?? "—"}
            </p>
            <div className="mt-3 space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chapter 5 notes"
                className="ink-border w-full rounded-xl bg-card px-3 py-2 font-bold"
              />
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="ink-border w-full rounded-xl bg-card px-3 py-2 font-bold"
              >
                <option value="">No subject</option>
                {(data.data?.subjects ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="ink-border w-full rounded-xl bg-card px-3 py-2 font-bold"
              />
              <button
                disabled={!title.trim() || taskMutation.isPending}
                onClick={() => taskMutation.mutate()}
                className="ink-border flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 font-extrabold text-primary-foreground disabled:opacity-50"
              >
                <Plus className="size-4" /> Add task
              </button>
            </div>
          </div>

          <div className="ink-card p-5">
            <h2 className="font-display text-xl font-extrabold">Class subjects</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {(data.data?.subjects ?? []).map((s) => (
                <li
                  key={s.id}
                  className="ink-border rounded-full px-3 py-1 text-sm font-extrabold"
                  style={{ backgroundColor: s.color }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Genetics"
                className="ink-border w-full rounded-xl bg-card px-3 py-2 font-bold"
              />
              <button
                disabled={!subjectName.trim()}
                onClick={() => subjectMutation.mutate()}
                className="ink-border rounded-xl bg-accent px-3 py-2 font-extrabold disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
