'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PlayIcon, StopIcon, ReloadIcon, TrackNextIcon } from '@radix-ui/react-icons'
import { Template, AudioFiles } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'

interface PlaylistPlayerProps {
  template: Template
  audioFiles: AudioFiles
}

export default function PlaylistPlayer({ template, audioFiles }: PlaylistPlayerProps) {
  // Player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Audio context and buffers
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBuffersRef = useRef<{[key: string]: AudioBuffer}>({})
  
  // Active audio nodes
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const activeGainRef = useRef<GainNode | null>(null)
  const activeBackgroundSourcesRef = useRef<AudioBufferSourceNode[]>([])
  
  // Add a log entry
  const addLog = (message: string) => {
    setLogs(prev => {
      const newLogs = [...prev, `[${new Date().toISOString().slice(11, 23)}] ${message}`]
      // Keep only the last 100 logs to prevent memory issues
      if (newLogs.length > 100) {
        return newLogs.slice(newLogs.length - 100)
      }
      return newLogs
    })
  }
  
  // Clear logs
  const clearLogs = () => {
    setLogs([])
  }
  
  // Initialize audio context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext()
        addLog('Created new AudioContext')
        return audioContextRef.current
      } catch (err) {
        addLog(`Error creating AudioContext: ${err}`)
        setError('Failed to initialize audio. Please try again.')
        return null
      }
    }
    
    // If context is suspended (browser policy), resume it
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
      addLog('Resumed AudioContext')
    }
    
    return audioContextRef.current
  }
  
  // Load all audio files
  const loadAudioFiles = async () => {
    if (!template) return
    
    try {
      setIsLoading(true)
      addLog('Loading audio files...')
      
      const audioContext = initAudioContext()
      if (!audioContext) return
      
      // Collect all URLs to load
      const urlsToLoad = new Set<string>()
      
      // Add template audio files
      for (const item of template.audioSequence) {
        if (item.fileUrl) {
          urlsToLoad.add(item.fileUrl)
          addLog(`Added template file: ${item.label}`)
        }
        if (item.backgroundMusic) {
          urlsToLoad.add(item.backgroundMusic)
          addLog(`Added background music for: ${item.label}`)
        }
      }
      
      // Add user uploaded files
      for (const file of audioFiles.audioFiles) {
        urlsToLoad.add(file.fileUrl)
        addLog(`Added uploaded file for placeholder: ${file.placeholderKey}`)
      }
      
      // Load all files
      const loadPromises = Array.from(urlsToLoad).map(async (url) => {
        try {
          addLog(`Loading: ${url.slice(0, 30)}...`)
          const response = await fetch(url)
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          // Store in our ref
          audioBuffersRef.current[url] = audioBuffer
          
          // Also store by placeholder key if it's a user uploaded file
          const matchingFile = audioFiles.audioFiles.find(f => f.fileUrl === url)
          if (matchingFile) {
            audioBuffersRef.current[matchingFile.placeholderKey] = audioBuffer
            addLog(`Loaded file for placeholder: ${matchingFile.placeholderKey}`)
          }
          
          return url
        } catch (err) {
          addLog(`Error loading ${url}: ${err}`)
          throw err
        }
      })
      
      await Promise.all(loadPromises)
      addLog('All audio files loaded successfully')
      setError(null)
    } catch (err) {
      console.error('Error loading audio files:', err)
      setError('Failed to load audio files. Please try again.')
      addLog(`Error: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Stop all currently playing audio
  const stopAllAudio = () => {
    addLog('Stopping all audio')
    
    // Stop main source
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop()
        activeSourceRef.current.disconnect()
        activeSourceRef.current = null
        addLog('Stopped main audio source')
      } catch (err) {
        addLog(`Error stopping main source: ${err}`)
      }
    }
    
    // Stop all background sources
    activeBackgroundSourcesRef.current.forEach((source, index) => {
      try {
        source.stop()
        source.disconnect()
        addLog(`Stopped background source ${index}`)
      } catch (err) {
        addLog(`Error stopping background source ${index}: ${err}`)
      }
    })
    
    // Clear the array
    activeBackgroundSourcesRef.current = []
    
    // Disconnect gain node
    if (activeGainRef.current) {
      try {
        activeGainRef.current.disconnect()
        activeGainRef.current = null
      } catch (err) {
        addLog(`Error disconnecting gain node: ${err}`)
      }
    }
  }
  
  // Play the playlist from the beginning
  const playPlaylist = () => {
    const audioContext = initAudioContext()
    if (!audioContext || !template) return
    
    // Stop any currently playing audio
    stopAllAudio()
    
    // Start from the beginning
    setCurrentIndex(0)
    setIsPlaying(true)
    
    // Play the first item
    playAudioItem(0)
  }
  
  // Skip to the next section
  const skipToNext = () => {
    if (!isPlaying || currentIndex < 0 || currentIndex >= template.audioSequence.length - 1) return
    
    const nextIndex = currentIndex + 1
    addLog(`Skipping to item ${nextIndex}: ${template.audioSequence[nextIndex].label}`)
    
    // Stop current audio
    stopAllAudio()
    
    // Update index and play next item
    setCurrentIndex(nextIndex)
    playAudioItem(nextIndex)
  }
  
  // Stop the playlist
  const stopPlaylist = () => {
    addLog('Stopping playlist')
    
    // Stop all audio
    stopAllAudio()
    
    // Reset state
    setIsPlaying(false)
    setCurrentIndex(-1)
  }
  
  // Play a specific audio item
  const playAudioItem = (index: number) => {
    const audioContext = audioContextRef.current
    if (!audioContext || !template || index >= template.audioSequence.length) return
    
    const item = template.audioSequence[index]
    
    // Get the audio buffer
    let audioBuffer: AudioBuffer | null = null
    if (item.fileUrl) {
      audioBuffer = audioBuffersRef.current[item.fileUrl]
    } else if (item.placeholderKey) {
      audioBuffer = audioBuffersRef.current[item.placeholderKey]
    }
    
    if (!audioBuffer) {
      addLog(`No audio buffer found for item ${index}: ${item.label}`)
      
      // Move to next item
      setTimeout(() => {
        if (isPlaying) {
          const nextIndex = index + 1
          if (nextIndex < template.audioSequence.length) {
            setCurrentIndex(nextIndex)
            playAudioItem(nextIndex)
          } else {
            addLog('Playlist finished - no more items')
            stopPlaylist()
          }
        }
      }, 100)
      return
    }
    
    addLog(`Playing item ${index}: ${item.label}`)
    
    try {
      // Create source node
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      
      // Create gain node for fading
      const gainNode = audioContext.createGain()
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Store references to active nodes
      activeSourceRef.current = source
      activeGainRef.current = gainNode
      
      // Apply fade in
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + template.fadeIn)
      
      // Apply fade out
      const fadeOutStart = audioContext.currentTime + audioBuffer.duration - template.fadeOut
      gainNode.gain.setValueAtTime(1, fadeOutStart)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + audioBuffer.duration)
      
      // Handle background music if present
      if (item.backgroundMusic) {
        const backgroundBuffer = audioBuffersRef.current[item.backgroundMusic]
        if (backgroundBuffer) {
          addLog(`Playing background music for item ${index}`)
          
          // Calculate how many loops we need
          const loopCount = Math.ceil(audioBuffer.duration / backgroundBuffer.duration)
          
          // Create gain node for background music
          const backgroundGain = audioContext.createGain()
          backgroundGain.gain.value = 0.3 // Lower background volume
          backgroundGain.connect(gainNode)
          
          // Create and connect multiple background sources to cover the duration
          for (let i = 0; i < loopCount; i++) {
            const backgroundSource = audioContext.createBufferSource()
            backgroundSource.buffer = backgroundBuffer
            backgroundSource.connect(backgroundGain)
            
            // Start at the appropriate time
            backgroundSource.start(audioContext.currentTime + (i * backgroundBuffer.duration))
            
            // Store reference
            activeBackgroundSourcesRef.current.push(backgroundSource)
          }
        }
      }
      
      // Start the source
      source.start()
      
      // Schedule the next item
      source.onended = () => {
        addLog(`Finished playing item ${index}: ${item.label}`)
        
        // Only proceed if we're still playing and this is still the current item
        // This prevents issues when skipping or stopping
        if (isPlaying && currentIndex === index) {
          const nextIndex = index + 1
          
          if (nextIndex < template.audioSequence.length) {
            setCurrentIndex(nextIndex)
            playAudioItem(nextIndex)
          } else {
            // End of playlist
            addLog('Playlist finished')
            stopPlaylist()
          }
        }
      }
    } catch (err) {
      addLog(`Error playing audio: ${err}`)
      setError(`Failed to play audio: ${err}`)
    }
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Check if all required files are loaded
  const requiredUploads = template?.audioSequence.filter(item => item.placeholderKey).length ?? 0
  const hasAllRequiredFiles = audioFiles.audioFiles.length === requiredUploads
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={loadAudioFiles}
          disabled={isLoading || !hasAllRequiredFiles}
          variant="outline"
        >
          {isLoading ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Load Audio Files'
          )}
        </Button>
        
        <Button
          onClick={playPlaylist}
          disabled={isLoading || isPlaying || !hasAllRequiredFiles || Object.keys(audioBuffersRef.current).length === 0}
        >
          <PlayIcon className="mr-2 h-4 w-4" />
          Play Playlist
        </Button>
        
        <Button
          onClick={stopPlaylist}
          disabled={!isPlaying}
          variant="destructive"
        >
          <StopIcon className="mr-2 h-4 w-4" />
          Stop
        </Button>
        
        <Button
          onClick={skipToNext}
          disabled={!isPlaying || currentIndex < 0 || currentIndex >= template.audioSequence.length - 1}
          variant="secondary"
        >
          <TrackNextIcon className="mr-2 h-4 w-4" />
          Skip Section
        </Button>
        
        <Button
          onClick={clearLogs}
          variant="ghost"
          size="sm"
        >
          Clear Logs
        </Button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}
      
      <div className="p-4 border rounded-md">
        <h3 className="font-medium mb-2">Now Playing</h3>
        {currentIndex >= 0 && currentIndex < template.audioSequence.length ? (
          <div className="p-3 bg-primary/10 rounded-md">
            <p className="font-medium">{template.audioSequence[currentIndex].label}</p>
            {template.audioSequence[currentIndex].backgroundMusic && (
              <p className="text-sm text-gray-500">With background music</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Not playing</p>
        )}
      </div>
      
      <div className="border rounded-md">
        <div className="p-3 border-b bg-muted/50">
          <h3 className="font-medium">Debug Logs</h3>
        </div>
        <ScrollArea className="h-[200px] w-full">
          <div className="p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="py-1 border-b border-dashed border-gray-100 last:border-0">
                  {log}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 