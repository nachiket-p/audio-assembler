'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PlayIcon, StopIcon, ReloadIcon, TrackNextIcon } from '@radix-ui/react-icons'
import { Template, AudioFiles, SurveyResponse } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface PlaylistPlayerProps {
  template: Template
  audioFiles: AudioFiles
}

export default function PlaylistPlayer({ template, audioFiles }: PlaylistPlayerProps) {
  // Player state
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayingRef = useRef(false) // Ref to track playing state for scheduled callbacks
  const [currentIndex, setCurrentIndex] = useState(-1)
  const currentIndexRef = useRef(-1) // Ref to track current index for scheduled callbacks
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Survey state
  const [showSurvey, setShowSurvey] = useState(false)
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([])
  
  // Handle image loading error
  const [imageError, setImageError] = useState(false)
  
  // Audio context and buffers
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBuffersRef = useRef<{[key: string]: AudioBuffer}>({})
  
  // Active audio nodes
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const activeGainRef = useRef<GainNode | null>(null)
  const activeBackgroundSourcesRef = useRef<AudioBufferSourceNode[]>([])
  
  // Crossfade timing
  const crossfadeTimeRef = useRef<number>(0)
  const nextItemScheduledRef = useRef<boolean>(false)
  
  // Update refs when state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
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
    
    // Reset crossfade timing
    crossfadeTimeRef.current = 0
    nextItemScheduledRef.current = false
  }
  
  // Play the playlist from the beginning
  const playPlaylist = () => {
    const audioContext = initAudioContext()
    if (!audioContext || !template) return
    
    // Stop any currently playing audio
    stopAllAudio()
    
    // Reset survey state
    setShowSurvey(false)
    
    // Start from the beginning
    setCurrentIndex(0)
    setIsPlaying(true)
    
    // Play the first item
    playAudioItem(0)
  }
  
  // Skip to the next section
  const skipToNext = () => {
    if (!isPlayingRef.current || currentIndexRef.current < 0 || currentIndexRef.current >= template.audioSequence.length - 1) return
    
    const nextIndex = currentIndexRef.current + 1
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
    setShowSurvey(false)
  }
  
  // Handle survey response
  const handleSurveyResponse = (answer: string) => {
    if (!template.survey) return
    
    // Record the response
    const response: SurveyResponse = {
      question: template.survey.question,
      answer,
      timestamp: Date.now()
    }
    
    setSurveyResponses(prev => [...prev, response])
    addLog(`Survey response recorded: ${answer}`)
    
    // Hide the survey
    setShowSurvey(false)
    
    // Continue playback
    const nextIndex = currentIndexRef.current + 1
    if (nextIndex < template.audioSequence.length) {
      setCurrentIndex(nextIndex)
      playAudioItem(nextIndex)
    } else {
      // End of playlist
      addLog('Playlist finished')
      stopPlaylist()
    }
  }
  
  // Schedule the next audio item with crossfading
  const scheduleNextItem = (currentIndex: number, currentEndTime: number) => {
    const nextIndex = currentIndex + 1
    
    // Don't schedule if we're at the end or if next item is already scheduled
    if (nextIndex >= template.audioSequence.length || nextItemScheduledRef.current) {
      return
    }
    
    // Check if we need to show a survey after the current item
    if (template.survey && template.survey.afterIndex === currentIndex) {
      // Don't schedule next item, we'll wait for survey response
      addLog(`Will show survey after item ${currentIndex} completes`)
      return
    }
    
    // Calculate when to start the next item for proper crossfading
    const audioContext = audioContextRef.current
    if (!audioContext) return
    
    // Start the next item before the current one ends (by fadeOut duration)
    const startTime = currentEndTime - template.fadeOut
    
    // Schedule the next item
    addLog(`Scheduling next item ${nextIndex} to start at ${startTime.toFixed(2)}s (with crossfade)`)
    nextItemScheduledRef.current = true
    
    // Use setTimeout to schedule the next item
    const timeUntilStart = (startTime - audioContext.currentTime) * 1000
    setTimeout(() => {
      addLog(`Going to play next item ${nextIndex} at ${audioContext.currentTime.toFixed(2)}s (isPlaying: ${isPlayingRef.current}, currentIndex: ${currentIndexRef.current})`)
      if (isPlayingRef.current && currentIndexRef.current === currentIndex) {
        setCurrentIndex(nextIndex)
        playAudioItem(nextIndex, true) // true = is crossfading
        nextItemScheduledRef.current = false
      } else {
        addLog(`Skipping scheduled playback because isPlaying=${isPlayingRef.current} or currentIndex=${currentIndexRef.current} (expected ${currentIndex})`)
        nextItemScheduledRef.current = false
      }
    }, Math.max(0, timeUntilStart))
  }
  
  // Play a specific audio item
  const playAudioItem = (index: number, isCrossfading = false) => {
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
        if (isPlayingRef.current) {
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
    
    addLog(`Playing item ${index}: ${item.label}${isCrossfading ? ' (crossfading)' : ''}`)
    
    try {
      // Create source node
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      
      // Create gain node for fading
      const gainNode = audioContext.createGain()
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Store references to active nodes
      if (!isCrossfading) {
        // If not crossfading, replace the current active source
        activeSourceRef.current = source
        activeGainRef.current = gainNode
      } else {
        // If crossfading, we're adding a new source while the previous one is still playing
        // The previous one will fade out automatically
      }
      
      // Apply fade in
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + template.fadeIn)
      
      // Calculate when this item will end
      const itemDuration = audioBuffer.duration
      const endTime = audioContext.currentTime + itemDuration
      
      // Apply fade out
      const fadeOutStart = endTime - template.fadeOut
      gainNode.gain.setValueAtTime(1, fadeOutStart)
      gainNode.gain.linearRampToValueAtTime(0, endTime)
      
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
      
      // Schedule the next item with crossfading
      scheduleNextItem(index, endTime)
      
      // Handle when this item ends
      source.onended = () => {
        addLog(`Finished playing item ${index}: ${item.label}`)
        
        // Only proceed if we're still playing and this is still the current item
        // and we haven't already scheduled the next item
        if (isPlayingRef.current && currentIndexRef.current === index && !nextItemScheduledRef.current) {
          // Check if we need to show a survey
          if (template.survey && template.survey.afterIndex === index) {
            addLog('Showing survey')
            setShowSurvey(true)
            return // Don't proceed to next item until survey is answered
          }
          
          // If we get here, it means the next item wasn't scheduled for crossfading
          // (possibly because the item was too short), so we'll play it now
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
  
  // Get current item for visual content
  const currentItem = currentIndex >= 0 && currentIndex < template.audioSequence.length 
    ? template.audioSequence[currentIndex] 
    : null
  
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
          disabled={!isPlaying || currentIndex < 0 || currentIndex >= template.audioSequence.length - 1 || showSurvey}
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
      
      {/* Visual Content Display */}
      {currentItem?.visualContent && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{currentItem.visualContent.title || currentItem.label}</CardTitle>
            <CardDescription>Now playing: {currentItem.label}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentItem.visualContent.type === 'text' ? (
              <div className="p-4 bg-muted/30 rounded-md">
                <p className="text-lg">{currentItem.visualContent.content}</p>
              </div>
            ) : (
              <div className="relative w-full h-[300px] rounded-md overflow-hidden bg-muted/20">
                {imageError ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Image could not be loaded</p>
                  </div>
                ) : (
                  <Image 
                    src={currentItem.visualContent.content}
                    alt={currentItem.visualContent.title || currentItem.label}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                    sizes="(max-width: 768px) 100vw, 600px"
                    priority
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Survey Display */}
      {showSurvey && template.survey && (
        <Card className="border-primary/50">
          <CardHeader className="bg-primary/5">
            <CardTitle>Quick Survey</CardTitle>
            <CardDescription>Please answer to continue playback</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">{template.survey.question}</h3>
            <div className="flex flex-wrap gap-2">
              {template.survey.options.map((option, i) => (
                <Button 
                  key={i} 
                  onClick={() => handleSurveyResponse(option)}
                  variant="outline"
                  className="min-w-[100px]"
                >
                  {option}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
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
      
      {/* Survey Responses */}
      {surveyResponses.length > 0 && (
        <div className="border rounded-md">
          <div className="p-3 border-b bg-muted/50">
            <h3 className="font-medium">Survey Responses</h3>
          </div>
          <div className="p-3">
            {surveyResponses.map((response, i) => (
              <div key={i} className="py-2 border-b last:border-0">
                <p className="text-sm font-medium">{response.question}</p>
                <p className="text-sm">Answer: <span className="font-medium">{response.answer}</span></p>
                <p className="text-xs text-gray-500">
                  {new Date(response.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
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