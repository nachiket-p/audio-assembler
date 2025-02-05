'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AudioUploader from './audio-uploader'
import AudioPreview from './audio-preview'
import { Template, AudioFiles } from '@/lib/types'
import { templates } from '@/lib/templates'
import { mergeAudio } from '@/lib/audio-processor'

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
    <div className="space-y-8">
      <div className="w-full max-w-xs">
        <Select onValueChange={handleTemplateSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map(template => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTemplate && (
        <div className="space-y-6">
          <div className="grid gap-4">
            {selectedTemplate.audioSequence.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">{item.label}</h3>
                {item.fileUrl ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Fixed Audio Track</p>
                    <AudioPreview audioUrl={item.fileUrl} />
                  </div>
                ) : (
                  <AudioUploader
                    placeholderKey={item.placeholderKey!}
                    label="Upload audio file"
                    onFileUpload={handleFileUpload}
                  />
                )}
                {item.backgroundMusic && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-500">Background Music</p>
                    <AudioPreview audioUrl={item.backgroundMusic} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleMerge}
              disabled={isProcessing || !hasAllRequiredFiles}
            >
              {isProcessing ? 'Processing...' : 'Merge Audio'}
            </Button>

            {error && (
              <p className="text-red-500">{error}</p>
            )}

            {mergedAudioUrl && (
              <div className="space-y-4">
                <h3 className="font-medium">Final Audio</h3>
                <AudioPreview audioUrl={mergedAudioUrl} />
                <Button onClick={handleDownload}>
                  Download Merged Audio
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 