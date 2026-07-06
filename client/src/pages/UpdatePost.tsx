import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { Streamdown } from "streamdown";

export default function UpdatePost() {
  const params = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = trpc.updates.getBySlug.useQuery(
    { slug: params.slug ?? "" },
    { enabled: !!params.slug }
  );

  if (isLoading) return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#a855f7] border-t-transparent animate-spin" />
    </div>
  );

  if (error || !post) return (
    <div className="min-h-screen bg-[#0C0C0C] flex flex-col items-center justify-center text-white gap-4">
      <p className="text-4xl font-black" style={{ fontFamily: "'Kanit', sans-serif" }}>404</p>
      <p className="text-white/50">Grein fannst ekki</p>
      <Link href="/updates" className="text-[#a855f7] hover:underline text-sm">← Til baka í fréttir</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-white">
      <div className="sticky top-0 z-40 bg-[#0C0C0C]/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center gap-4">
        <Link href="/updates" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} />
          <span>Fréttir</span>
        </Link>
      </div>

      <article className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-6">
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

        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight" style={{ fontFamily: "'Kanit', sans-serif" }}>
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-xl text-white/60 mb-10 leading-relaxed border-l-2 border-[#a855f7] pl-4">
            {post.excerpt}
          </p>
        )}

        <div className="prose prose-invert prose-lg max-w-none
          prose-headings:font-black prose-headings:text-white
          prose-p:text-white/70 prose-p:leading-relaxed
          prose-a:text-[#a855f7] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white prose-code:text-[#a855f7]
          prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
          <Streamdown>{post.content}</Streamdown>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5">
          <Link href="/updates" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
            <ArrowLeft size={14} />
            Til baka í allar fréttir
          </Link>
        </div>
      </article>
    </div>
  );
}
