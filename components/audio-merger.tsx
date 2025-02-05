'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AudioUploader from './audio-uploader'
import AudioPreview from './audio-preview'
import { Template, AudioFiles } from '@/lib/types'
import { templates } from '@/lib/templates'
import { mergeAudio } from '@/lib/audio-processor'
import AudioPlayer from './audio-player'

export default function AudioMerger() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFiles>({ audioFiles: [] })
  const [mergedAudioUrl, setMergedAudioUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    setSelectedTemplate(template || null)
    setMergedAudioUrl(null)
    setAudioFiles({ audioFiles: [] })
  }

  const handleFileUpload = (placeholderKey: string, fileUrl: string) => {
    setAudioFiles(prev => ({
      audioFiles: [
        ...prev.audioFiles.filter(f => f.placeholderKey !== placeholderKey),
        { placeholderKey, fileUrl }
      ]
    }))
  }

  const handleMerge = async () => {
    if (!selectedTemplate) return

    setIsProcessing(true)
    setError(null)
    
    try {
      const mergedBlob = await mergeAudio(selectedTemplate, audioFiles)
      const url = URL.createObjectURL(mergedBlob)
      setMergedAudioUrl(url)
    } catch (err) {
      setError('Failed to merge audio files. Please try again.')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!mergedAudioUrl) return
    
    const link = document.createElement('a')
    link.href = mergedAudioUrl
    link.download = 'merged_audio.wav'
    link.click()
  }

  const requiredUploads = selectedTemplate?.audioSequence.filter(item => item.placeholderKey).length ?? 0
  const hasAllRequiredFiles = audioFiles.audioFiles.length === requiredUploads

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Audio Merger</h1>
        <p className="text-xl text-gray-500">
          Merge audio files with background music and fading effects
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Select Template</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {templates.map(template => (
              <div 
                key={template.id}
                className={`p-6 rounded-lg border-2 cursor-pointer transition-colors
                  ${selectedTemplate?.id === template.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'}`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <p>{template.audioSequence.length} audio segments</p>
                  <p className="flex gap-4">
                    <span>Fade in: {template.fadeIn}s</span>
                    <span>Fade out: {template.fadeOut}s</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedTemplate && (
          <>
            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Upload Audio Files</h2>
              <div className="space-y-6">
                {selectedTemplate.audioSequence.map((item, index) => (
                  <div key={index} className="p-6 rounded-lg border">
                    {item.fileUrl ? (
                      <AudioPlayer 
                        audioUrl={item.fileUrl}
                        label={item.label}
                        isFixed
                      />
                    ) : (
                      <>
                        <AudioUploader
                          placeholderKey={item.placeholderKey!}
                          label={item.label}
                          onFileUpload={handleFileUpload}
                        />
                        {audioFiles.audioFiles.find(f => f.placeholderKey === item.placeholderKey) && (
                          <div className="mt-4">
                            <AudioPlayer 
                              audioUrl={audioFiles.audioFiles.find(f => f.placeholderKey === item.placeholderKey)!.fileUrl}
                              label="Preview uploaded audio"
                            />
                          </div>
                        )}
                      </>
                    )}
                    {item.backgroundMusic && (
                      <div className="mt-4">
                        <AudioPlayer 
                          audioUrl={item.backgroundMusic}
                          label="Background Music"
                          isBackground
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Preview and Download</h2>
              <div className="space-y-4">
                <Button 
                  className="w-full sm:w-auto"
                  onClick={handleMerge}
                  disabled={isProcessing || !hasAllRequiredFiles}
                >
                  {isProcessing ? 'Processing...' : 'Generate Preview'}
                </Button>

                {error && (
                  <p className="text-red-500">{error}</p>
                )}

                {mergedAudioUrl && (
                  <div className="space-y-4">
                    <div className="p-6 rounded-lg border">
                      <AudioPlayer 
                        audioUrl={mergedAudioUrl}
                        label="Final Audio"
                        hideSubtext
                      />
                      <div className="mt-4">
                        <audio 
                          src={mergedAudioUrl} 
                          className="w-full h-12 rounded-lg bg-secondary"
                          controls
                        />
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={handleDownload}
                    >
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
} 