'use client'

import dynamic from 'next/dynamic'

const RotatingEarth = dynamic(() => import('@/components/rotating-earth'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[500px] bg-slate-800/40 rounded-3xl">
      <p className="text-slate-300">Loading globe...</p>
    </div>
  ),
})

export default function ProofPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900">
        {/* Dynamic animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-purple-600/10 animate-pulse" />
      </div>

      {/* Radial Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-5 -z-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%, transparent),
                           linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%, transparent)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full px-4 py-8 sm:py-12">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 space-y-2">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
            Global Coverage
          </h1>
          <p className="text-base sm:text-lg text-slate-300 font-light max-w-2xl">
            Real-time presence attestation and risk assessment across worldwide networks
          </p>
        </div>

        {/* Globe Container with Shadow */}
        <div className="relative w-full max-w-4xl">
          {/* Outer Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 blur-2xl animate-pulse" />

          {/* Globe Component */}
          <div className="relative bg-gradient-to-b from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-4 sm:p-8 flex items-center justify-center">
            <RotatingEarth width={700} height={500} />
          </div>

          {/* Bottom Gradient Reflection */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-3/4 h-32 bg-gradient-to-t from-purple-500/20 to-transparent rounded-full blur-3xl -z-10" />
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-16 sm:mt-20 w-full max-w-4xl">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 text-center hover:bg-white/10 transition">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-400">195+</div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">Countries Covered</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 text-center hover:bg-white/10 transition">
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">24/7</div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">Real-time Monitoring</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-6 text-center hover:bg-white/10 transition">
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">99.99%</div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">Uptime SLA</p>
          </div>
        </div>

        {/* Footer Text */}
        <div className="mt-12 sm:mt-16 text-center text-xs sm:text-sm text-slate-400">
          <p>Digital Risk Assessment Platform • Powered by Advanced ML</p>
        </div>
      </div>

      {/* Floating Particles Effect */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        :global(.animate-blob) {
          animation: blob 7s infinite;
        }

        :global(.animation-delay-2000) {
          animation-delay: 2s;
        }

        :global(.animation-delay-4000) {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
