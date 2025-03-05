import { Template } from './types'

export const templates: Template[] = [
  {
    id: 'podcast-template',
    name: 'Zipcast Small',
    audioSequence: [
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/music/sample-4.mp3',
        label: 'Opening Theme',
        visualContent: {
          type: 'text',
          title: 'Welcome to Zipcast',
          content: 'Enjoy our carefully curated audio experience with seamless transitions.'
        }
      },
    //   {
    //     placeholderKey: 'episode-intro',
    //     label: 'Episode Introduction'
    //   },
      {
        placeholderKey: 'main-content',
        label: 'Main Episode Content',
        backgroundMusic: 'https://audio-samples.github.io/samples/mp3/music/sample-3.mp3',
        visualContent: {
          type: 'image',
          title: 'Featured Content',
          content: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80'
        }
      },
    //   {
    //     placeholderKey: 'closing-remarks',
    //     label: 'Closing Remarks'
    //   },
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/music/sample-2.mp3',
        label: 'Closing Theme',
      }
    ],
    fadeIn: 2,
    fadeOut: 3,
    survey: {
      afterIndex: 1, // Show survey after the main content
      question: 'Did you enjoy this audio segment?',
      options: ['Yes', 'No']
    }
  },
  {
    id: 'story-template',
    name: 'Zipcast Large',
    audioSequence: [
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/music/sample-1.mp3',
        label: 'Opening Theme',
        visualContent: {
          type: 'text',
          title: 'Story Time',
          content: 'Sit back and relax as we take you on an audio journey.'
        }
      },
      {
        placeholderKey: 'story-intro',
        label: 'Introduction'
      },
      {
        backgroundMusic: 'https://audio-samples.github.io/samples/mp3/music/sample-3.mp3',
        placeholderKey: 'main-story',
        label: 'National Content',
        visualContent: {
          type: 'image',
          title: 'Featured Story',
          content: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80'
        }
      },
      {
        placeholderKey: 'story-conclusion',
        label: 'Dynamic Content'
      },
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/music/sample-6.mp3',
        label: 'Closing Theme'
      }
    ],
    fadeIn: 1.5,
    fadeOut: 2,
    survey: {
      afterIndex: 2, // Show survey after the main story
      question: 'Would you like to hear more stories like this?',
      options: ['Yes', 'No', 'Maybe']
    }
  }
] 