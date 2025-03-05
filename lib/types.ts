export interface AudioSequenceItem {
  fileUrl?: string
  backgroundMusic?: string
  placeholderKey?: string
  label: string
  visualContent?: {
    type: 'text' | 'image'
    content: string // text content or image URL
    title?: string
  }
}

export interface Template {
  id: string
  name: string
  audioSequence: AudioSequenceItem[]
  fadeIn: number
  fadeOut: number
  survey?: {
    afterIndex: number // Show survey after this segment index
    question: string
    options: string[] // e.g. ["Yes", "No"]
  }
}

export interface AudioFile {
  placeholderKey: string
  fileUrl: string
}

export interface AudioFiles {
  audioFiles: AudioFile[]
}

export interface SurveyResponse {
  question: string
  answer: string
  timestamp: number
} 