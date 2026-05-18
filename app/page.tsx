import Link from "next/link";
import { templates } from "@/lib/templates";
import { UserTemplatesGrid } from "@/components/UserTemplatesGrid";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="px-8 py-12 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-wider text-accent font-semibold">AI Email Builder</p>
          <h1 className="mt-2 text-4xl font-bold text-ink">Build emails with AI + drag-and-drop</h1>
          <p className="mt-3 text-slate-600 max-w-2xl">
            Pick a template to start. Edit it visually or chat with the AI assistant to make changes — &quot;move the CTA
            up&quot;, &quot;swap the hero copy for something playful&quot;, &quot;use our brand orange&quot;. Send a test
            email to your inbox when it&apos;s ready.
          </p>
        </div>
      </header>

      <section className="px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <UserTemplatesGrid />
          <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">Start from a template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/studio/${t.id}`}
                className="block p-5 rounded-xl bg-white border border-slate-200 hover:border-accent hover:shadow-sm transition"
              >
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">{t.id}</div>
                <div className="text-lg font-semibold text-ink">{t.name}</div>
                <div className="mt-2 text-sm text-slate-600">{t.description}</div>
                <div className="mt-3 text-xs text-slate-400">{t.doc.data.content?.length ?? 0} blocks</div>
              </Link>
            ))}
            <Link
              href="/studio/blank"
              className="block p-5 rounded-xl bg-white border-2 border-dashed border-slate-300 hover:border-accent text-center"
            >
              <div className="text-lg font-semibold text-ink">Start from blank</div>
              <div className="mt-2 text-sm text-slate-600">Empty canvas — let the AI build it from scratch.</div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
