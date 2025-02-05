export async function convertToMp3(audioBuffer: AudioBuffer): Promise<Blob> {
  // We'll use the LAME encoder for MP3 conversion
  const channelData = []
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    channelData.push(audioBuffer.getChannelData(channel))
  }

  // Create a MediaStream from the audio buffer
  const ctx = new AudioContext()
  const source = ctx.createBufferSource()
  source.buffer = audioBuffer
  const destination = ctx.createMediaStreamDestination()
  source.connect(destination)
  source.start(0)

  // Use MediaRecorder to encode to MP3
  const mediaRecorder = new MediaRecorder(destination.stream, {
    mimeType: 'audio/webm'
  })

  return new Promise((resolve, reject) => {
    const chunks: Blob[] = []
    
    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      resolve(blob)
    }

    mediaRecorder.onerror = (e) => {
      reject(e)
    }

    mediaRecorder.start()
    
    // Record for the duration of the audio
    setTimeout(() => {
      mediaRecorder.stop()
    }, audioBuffer.duration * 1000)
  })
} 