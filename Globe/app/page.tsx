import Link from 'next/link'
import RotatingEarth from "@/components/rotating-earth"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="text-center mb-12 flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
          Rotating Earth Demo
        </h1>
        <p className="text-slate-300">Interactive globe visualization</p>
      </div>

      {/* Globe Preview */}
      <div className="rounded-2xl border border-white/10 p-8 bg-slate-900/40 backdrop-blur mb-8">
        <RotatingEarth width={700} height={500} />
      </div>

      {/* Links */}
      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          href="/proof"
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
        >
          View Proof Page
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/10 transition"
        >
          GitHub
        </a>
      </div>

      {/* Footer */}
      <p className="mt-12 text-slate-400 text-sm">Built with Next.js, React, D3.js & Tailwind CSS</p>
    </main>
  )
}
