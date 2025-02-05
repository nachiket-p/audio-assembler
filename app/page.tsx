import AudioMerger from '@/components/audio-merger'

export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Audio Merger</h1>
      <AudioMerger />
    </main>
  )
}
