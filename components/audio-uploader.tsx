'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { UploadIcon } from '@radix-ui/react-icons'

interface AudioUploaderProps {
  placeholderKey: string
  label: string
  onFileUpload: (placeholderKey: string, fileUrl: string) => void
}

export default function AudioUploader({ placeholderKey, label, onFileUpload }: AudioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const url = URL.createObjectURL(file)
      onFileUpload(placeholderKey, url)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">{label}</h3>
      <p className="text-sm text-gray-500">Upload audio file</p>
      <div className="mt-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="audio/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <Button 
          variant="outline" 
          className="w-full"
          disabled={isUploading}
          onClick={handleClick}
        >
          <UploadIcon className="mr-2 h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Upload File'}
        </Button>
      </div>
    </div>
  )
} 