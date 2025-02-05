'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AudioUploaderProps {
  placeholderKey: string
  label: string
  onFileUpload: (placeholderKey: string, fileUrl: string) => void
}

export default function AudioUploader({ placeholderKey, label, onFileUpload }: AudioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // In a real app, you'd upload to a server here
      // For this demo, we'll create an object URL
      const url = URL.createObjectURL(file)
      onFileUpload(placeholderKey, url)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </div>
  )
} 