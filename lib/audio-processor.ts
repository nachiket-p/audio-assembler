import { Template, AudioFiles } from './types'

export async function mergeAudio(template: Template, audioFiles: AudioFiles): Promise<Blob> {
  const audioContext = new AudioContext()

  const loadedAudios: { [key: string]: AudioBuffer } = {}
  const loadedBackgrounds: { [key: string]: AudioBuffer } = {}

  // Function to load an audio file
  async function loadAudio(url: string): Promise<AudioBuffer> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return audioContext.decodeAudioData(arrayBuffer)
  }

  // Load all necessary audio files
  const allFilesToLoad = new Set<string>()
  for (const item of template.audioSequence) {
    if (item.fileUrl) allFilesToLoad.add(item.fileUrl)
    if (item.backgroundMusic) allFilesToLoad.add(item.backgroundMusic)
  }
  for (const file of audioFiles.audioFiles) {
    allFilesToLoad.add(file.fileUrl)
  }

  const loadingPromises = Array.from(allFilesToLoad).map(async (url) => {
    try {
      const audioBuffer = await loadAudio(url)
      if (template.audioSequence.some(item => item.fileUrl === url)) {
        loadedAudios[url] = audioBuffer
      } else if (template.audioSequence.some(item => item.backgroundMusic === url)) {
        loadedBackgrounds[url] = audioBuffer
      } else {
        const matchingFile = audioFiles.audioFiles.find(f => f.fileUrl === url)
        if (matchingFile) {
          loadedAudios[matchingFile.placeholderKey] = audioBuffer
        }
      }
    } catch (error) {
      console.error("Error loading audio:", url, error)
      throw error
    }
  })

  await Promise.all(loadingPromises)

  // Calculate total duration first
  let totalDuration = 0
  for (const item of template.audioSequence) {
    let audioBuffer: AudioBuffer | null = null
    if (item.fileUrl) {
      audioBuffer = loadedAudios[item.fileUrl]
    } else if (item.placeholderKey) {
      audioBuffer = loadedAudios[item.placeholderKey]
    }
    if (audioBuffer) {
      totalDuration += audioBuffer.duration
    }
  }

  // Create offline context with calculated duration
  const offlineContext = new OfflineAudioContext(
    2, // stereo
    Math.ceil(totalDuration * audioContext.sampleRate),
    audioContext.sampleRate
  )

  let currentTime = 0

  // Process each audio item
  for (const item of template.audioSequence) {
    let audioBuffer: AudioBuffer | null = null
    if (item.fileUrl) {
      audioBuffer = loadedAudios[item.fileUrl]
    } else if (item.placeholderKey) {
      audioBuffer = loadedAudios[item.placeholderKey]
    }

    if (audioBuffer) {
      const source = offlineContext.createBufferSource()
      source.buffer = audioBuffer

      const gainNode = offlineContext.createGain()
      source.connect(gainNode)

      // Handle background music if present
      if (item.backgroundMusic) {
        const backgroundBuffer = loadedBackgrounds[item.backgroundMusic]
        if (backgroundBuffer) {
          const backgroundSource = offlineContext.createBufferSource()
          backgroundSource.buffer = backgroundBuffer
          
          // Calculate how many loops we need
          const loopCount = Math.ceil(audioBuffer.duration / backgroundBuffer.duration)
          
          const backgroundGain = offlineContext.createGain()
          backgroundGain.gain.value = 0.3 // Lower background volume
          
          // Create and connect multiple background sources to cover the duration
          for (let i = 0; i < loopCount; i++) {
            const loopSource = offlineContext.createBufferSource()
            loopSource.buffer = backgroundBuffer
            loopSource.connect(backgroundGain)
            backgroundGain.connect(gainNode)
            loopSource.start(currentTime + (i * backgroundBuffer.duration))
          }
        }
      }

      // Apply fade in/out
      gainNode.gain.setValueAtTime(0, currentTime)
      gainNode.gain.linearRampToValueAtTime(1, currentTime + template.fadeIn)
      gainNode.gain.setValueAtTime(1, currentTime + audioBuffer.duration - template.fadeOut)
      gainNode.gain.linearRampToValueAtTime(0, currentTime + audioBuffer.duration)

      gainNode.connect(offlineContext.destination)
      source.start(currentTime)

      currentTime += audioBuffer.duration
    }
  }

  // Render the final audio
  const renderedBuffer = await offlineContext.startRendering()
  
  // Convert to WAV
  return generateWavBlob(renderedBuffer)
}

function generateWavBlob(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length * numChannels
  const sampleRate = audioBuffer.sampleRate
  const buffer = new ArrayBuffer(44 + length * 2)
  const view = new DataView(buffer)

  // Write WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, length * 2, true)

  // Write interleaved audio data
  const channels = []
  for (let i = 0; i < numChannels; i++) {
    channels.push(audioBuffer.getChannelData(i))
  }

  let offset = 44
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
} 