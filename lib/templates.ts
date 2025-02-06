import { Template } from './types'

export const templates: Template[] = [
  {
    id: 'podcast-template',
    name: 'Zipcast Small',
    audioSequence: [
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/music/sample-4.mp3',
        label: 'Opening Theme',
      },
    //   {
    //     placeholderKey: 'episode-intro',
    //     label: 'Episode Introduction'
    //   },
      {
        placeholderKey: 'main-content',
        label: 'Main Episode Content',
        backgroundMusic: 'https://audio-samples.github.io/samples/mp3/music/sample-3.mp3',
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
    fadeOut: 3
  },
  {
    id: 'story-template',
    name: 'Zipcast Large',
    audioSequence: [
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/music/sample-1.mp3',
        label: 'Opening Theme'
      },
      {
        placeholderKey: 'story-intro',
        label: 'Introduction'
      },
      {
        backgroundMusic: 'https://audio-samples.github.io/samples/mp3/music/sample-3.mp3',
        placeholderKey: 'main-story',
        label: 'National Content'
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
    fadeOut: 2
  }
] 