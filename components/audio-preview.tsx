'use client'

interface AudioPreviewProps {
  audioUrl: string
}

export default function AudioPreview({ audioUrl }: AudioPreviewProps) {
  return (
    <audio controls className="w-full">
      <source src={audioUrl} type="audio/wav" />
      Your browser does not support the audio element.
    </audio>
  )
} 