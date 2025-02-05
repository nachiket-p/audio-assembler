export interface AudioSequenceItem {
  fileUrl?: string
  backgroundMusic?: string
  placeholderKey?: string
  label: string
}

export interface Template {
  id: string
  name: string
  audioSequence: AudioSequenceItem[]
  fadeIn: number
  fadeOut: number
}

export interface AudioFile {
  placeholderKey: string
  fileUrl: string
}

export interface AudioFiles {
  audioFiles: AudioFile[]
} 