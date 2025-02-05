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
  const audioRef = useRef<HTMLAudioElement>(null)

  // Get filename from URL
  const getFileName = (url: string) => {
    if (url.startsWith('blob:')) {
      // For uploaded files (blob URLs), get the name from the last segment
      return url.split('/').pop() || 'Uploaded file'
    }
    // For remote files, get the filename from the URL
    return url.split('/').pop()?.split('?')[0] || 'Audio file'
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => setIsPlaying(false)
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

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
             getFileName(audioUrl)}
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