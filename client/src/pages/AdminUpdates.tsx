import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["fréttir", "þjónusta", "tilkynning", "tækni"];

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function AdminUpdates() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const { data: posts = [], isLoading } = trpc.updates.list.useQuery({ all: true });
  const createMut = trpc.updates.create.useMutation({
    onSuccess: () => { utils.updates.list.invalidate(); toast.success("Grein búin til!"); setShowForm(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.updates.update.useMutation({
    onSuccess: () => { utils.updates.list.invalidate(); toast.success("Grein uppfærð!"); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.updates.delete.useMutation({
    onSuccess: () => { utils.updates.list.invalidate(); toast.success("Grein eytt!"); },
    onError: (e) => toast.error(e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", category: "fréttir", published: false });

  function resetForm() { setForm({ title: "", slug: "", excerpt: "", content: "", category: "fréttir", published: false }); }

  if (loading) return <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#a855f7] border-t-transparent animate-spin" /></div>;
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#0C0C0C] flex flex-col items-center justify-center text-white gap-4">
      <p className="text-2xl font-black" style={{ fontFamily: "'Kanit', sans-serif" }}>Aðgangur bannaður</p>
      <p className="text-white/50 text-sm">Þú þarft að skrá þig inn til að fá aðgang.</p>
      <Link href="/" className="text-[#a855f7] hover:underline text-sm">← Til baka</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-white">
      <div className="sticky top-0 z-40 bg-[#0C0C0C]/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /><span>Til baka</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <span className="font-bold" style={{ fontFamily: "'Kanit', sans-serif" }}>Stjórnborð — Fréttir</span>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); resetForm(); }}
          className="flex items-center gap-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={14} /> Ný grein
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Create / Edit form */}
        {showForm && (
          <div className="mb-8 bg-white/3 border border-white/10 rounded-2xl p-6">
            <h2 className="font-black text-xl mb-6" style={{ fontFamily: "'Kanit', sans-serif" }}>
              {editing ? "Breyta grein" : "Ný grein"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Titill *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#a855f7]"
                    placeholder="Titill greinar..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Slug *</label>
                  <input
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#a855f7] font-mono"
                    placeholder="grein-slug"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Flokkur</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#a855f7]"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setForm(f => ({ ...f, published: !f.published }))}
                      className={`w-10 h-6 rounded-full transition-colors ${form.published ? "bg-[#a855f7]" : "bg-white/10"} relative`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.published ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-white/70">Birta strax</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Útdráttur</label>
                <input
                  value={form.excerpt}
                  onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#a855f7]"
                  placeholder="Stutt lýsing á greininni..."
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Efni * (Markdown stutt)</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={10}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#a855f7] font-mono resize-y"
                  placeholder="# Fyrirsögn&#10;&#10;Efni greinarinnar í Markdown sniði..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    if (editing) {
                      updateMut.mutate({ id: editing, title: form.title, excerpt: form.excerpt, content: form.content, category: form.category, published: form.published });
                    } else {
                      createMut.mutate(form);
                    }
                  }}
                  disabled={createMut.isPending || updateMut.isPending || !form.title || !form.slug || !form.content}
                  className="flex items-center gap-2 bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                >
                  <Check size={14} /> {editing ? "Vista breytingar" : "Búa til grein"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm px-5 py-2.5 rounded-xl transition-colors"
                >
                  <X size={14} /> Hætta við
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts list */}
        <div className="space-y-3">
          {isLoading ? (
            [1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <p className="text-xl font-bold mb-2" style={{ fontFamily: "'Kanit', sans-serif" }}>Engar greinar enn</p>
              <p className="text-sm">Smelltu á "Ný grein" til að byrja.</p>
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="flex items-center gap-4 bg-white/3 border border-white/5 rounded-2xl px-5 py-4 hover:bg-white/5 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${post.published ? "bg-green-400" : "bg-white/20"}`} />
                  <span className="text-xs text-white/40 font-mono">{post.slug}</span>
                  <span className="text-xs text-[#a855f7]">{post.category}</span>
                </div>
                <p className="font-semibold text-sm truncate">{post.title}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => updateMut.mutate({ id: post.id, published: !post.published })}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  title={post.published ? "Fela grein" : "Birta grein"}
                >
                  {post.published ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={() => {
                    setEditing(post.id);
                    setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt ?? "", content: post.content, category: post.category, published: post.published });
                    setShowForm(true);
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => { if (confirm("Eyða þessari grein?")) deleteMut.mutate({ id: post.id }); }}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
