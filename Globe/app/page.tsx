import RotatingEarth from "@/components/rotating-earth"

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <RotatingEarth width={700} height={500} />
    </main>
  )
}
