import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";
import { ArrowLeft, Calendar, Tag, ChevronRight } from "lucide-react";

const CATEGORIES = ["Allt", "fréttir", "þjónusta", "tilkynning", "tækni"];

export default function UpdatesFeed() {
  const [activeCategory, setActiveCategory] = useState("Allt");
  const { data: posts = [], isLoading } = trpc.updates.list.useQuery({ all: false });

  const filtered = activeCategory === "Allt"
    ? posts
    : posts.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0C0C0C]/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} />
          <span>Til baka</span>
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <span className="font-bold text-white" style={{ fontFamily: "'Kanit', sans-serif" }}>
          Nýjustu fréttir
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-black mb-4 leading-none" style={{ fontFamily: "'Kanit', sans-serif" }}>
            <span className="bg-gradient-to-r from-[#a855f7] via-[#ec4899] to-[#f97316] bg-clip-text text-transparent">
              FRÉTTIR
            </span>
          </h1>
          <p className="text-white/50 text-lg">Nýjustu uppfærslur og tilkynningar frá Gummi Gúrú</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-[#a855f7] text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-white/30">
            <p className="text-2xl font-bold mb-2" style={{ fontFamily: "'Kanit', sans-serif" }}>Engar fréttir</p>
            <p className="text-sm">Engar greinar fundust í þessum flokki.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(post => (
              <Link key={post.id} href={`/updates/${post.slug}`}>
                <div className="group bg-white/3 border border-white/5 rounded-2xl p-6 hover:bg-white/6 hover:border-white/10 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center gap-1 text-xs text-[#a855f7] font-medium">
                          <Tag size={11} />
                          {post.category}
                        </span>
                        {post.publishedAt && (
                          <span className="flex items-center gap-1 text-xs text-white/30">
                            <Calendar size={11} />
                            {new Date(post.publishedAt).toLocaleDateString("is-IS", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold mb-2 group-hover:text-[#a855f7] transition-colors" style={{ fontFamily: "'Kanit', sans-serif" }}>
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-white/50 text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>
                      )}
                    </div>
                    <ChevronRight size={20} className="text-white/20 group-hover:text-[#a855f7] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
