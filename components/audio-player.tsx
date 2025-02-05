'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PlayIcon, StopIcon } from '@radix-ui/react-icons'

interface AudioPlayerProps {
  audioUrl: string
  label?: string
  isFixed?: boolean
  isBackground?: boolean
  hideSubtext?: boolean
}

export default function AudioPlayer({ 
  audioUrl, 
  label, 
  isFixed, 
  isBackground,
  hideSubtext 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    
    // Try to get duration if already loaded
    if (audio.duration) {
      setDuration(audio.duration)
    }
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl])

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium text-sm">{label}</h3>
        {!hideSubtext && (
          <p className="text-sm text-gray-500">
            {isFixed ? 'Fixed audio segment' : 
             isBackground ? 'Background music' : 
             duration ? `Duration: ${formatDuration(duration)}` : 'Loading...'}
          </p>
        )}
      </div>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={togglePlay}
      >
        {isPlaying ? <StopIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </Button>
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        className="hidden"
      />
    </div>
  )
} 