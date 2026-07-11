import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, CheckCircle, Clock, Loader2, AlertCircle, Zap } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  submitted:   "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  in_progress: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  done:        "bg-green-500/10 text-green-400 border-green-500/20",
  cancelled:   "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function PublicPortal() {
  const [, params] = useRoute("/portal/:token");
  const token = params?.token ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [submitted, setSubmitted] = useState(false);

  const { data: client, isLoading: clientLoading, error: clientError } = trpc.portal.verify.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const { data: tasks = [], refetch: refetchTasks } = trpc.portal.tasks.useQuery(
    { token },
    { enabled: !!token && !!client, refetchInterval: 30000 }
  );

  const submitMut = trpc.portal.submitTask.useMutation({
    onSuccess: () => {
      setTitle(""); setDescription(""); setPriority("normal");
      setSubmitted(true);
      refetchTasks();
      toast.success("Task submitted! Your agent will get to work.");
      setTimeout(() => setSubmitted(false), 4000);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!token) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center text-zinc-500"><AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>Invalid portal link</p></div>
    </div>
  );

  if (clientLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
    </div>
  );

  if (clientError || !client) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center text-zinc-500 max-w-sm">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <h2 className="text-lg font-semibold text-zinc-300 mb-2">Portal not found</h2>
        <p className="text-sm">This link may have expired or is invalid. Contact your agent for a new link.</p>
      </div>
    </div>
  );

  const doneTasks = tasks.filter(t => t.status === "done").length;
  const activeTasks = tasks.filter(t => t.status === "in_progress").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="border-b border-white/5 bg-[#0d0d14]">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="font-semibold text-sm">{client.name}</div>
              {client.company && <div className="text-xs text-zinc-500">{client.company}</div>}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className={`px-2 py-0.5 rounded-full border text-xs ${client.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>{client.status}</span>
            <span>{client.plan} plan</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Tasks", value: tasks.length, color: "text-zinc-300" },
            { label: "In Progress", value: activeTasks, color: "text-cyan-400" },
            { label: "Completed", value: doneTasks, color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" /> Submit a Task
          </h2>
          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mb-3" />
              <p className="font-medium text-green-300">Task submitted!</p>
              <p className="text-sm text-zinc-500 mt-1">Your agent will start working on it shortly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Task title *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you need done?" className="bg-white/[0.03] border-white/10 focus:border-cyan-500/50" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Description *</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the task in detail — the more context, the better the result." rows={4} className="bg-white/[0.03] border-white/10 focus:border-cyan-500/50 resize-none" />
              </div>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 mb-1.5 block">Priority</label>
                  <Select value={priority} onValueChange={v => setPriority(v as typeof priority)}>
                    <SelectTrigger className="bg-white/[0.03] border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold" disabled={!title.trim() || !description.trim() || submitMut.isPending} onClick={() => submitMut.mutate({ token, title, description, priority })}>
                    {submitMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Submit Task
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" /> Task History
            <span className="text-xs text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded">{tasks.length}</span>
          </h2>
          {tasks.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/5 rounded-xl text-zinc-600 text-sm">No tasks yet — submit your first task above</div>
          ) : (
            <div className="space-y-3">
              {tasks.map(t => (
                <div key={t.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{t.title}</div>
                      <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.description}</div>
                      {t.agentReply && (
                        <div className="mt-3 text-xs bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 text-cyan-300">
                          <div className="font-semibold text-cyan-400 mb-1">Agent reply</div>
                          {t.agentReply}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status] ?? STATUS_STYLES.submitted}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 mt-3 flex items-center gap-3">
                    <span>{new Date(t.submittedAt).toLocaleString()}</span>
                    <span>·</span>
                    <span className="capitalize">{t.priority} priority</span>
                    {t.completedAt && <><span>·</span><span className="text-green-600">Done {new Date(t.completedAt).toLocaleDateString()}</span></>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
