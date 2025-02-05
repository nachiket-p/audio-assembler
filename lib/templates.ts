import { Template } from './types'

export const templates: Template[] = [
  {
    id: 'podcast-template',
    name: 'Podcast Episode',
    audioSequence: [
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/music/sample-4.mp3',
        label: 'Standard Intro Jingle',
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
        label: 'Standard Outro Jingle',
      }
    ],
    fadeIn: 2,
    fadeOut: 3
  },
  {
    id: 'story-template',
    name: 'Audio Story',
    audioSequence: [
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/story-intro.mp3',
        label: 'Story Opening Theme'
      },
      {
        backgroundMusic: 'https://audio-samples.github.io/samples/mp3/loop-ambient.mp3',
        placeholderKey: 'story-intro',
        label: 'Story Introduction'
      },
      {
        backgroundMusic: 'https://audio-samples.github.io/samples/mp3/loop-ambient.mp3',
        placeholderKey: 'main-story',
        label: 'Main Story Content'
      },
      {
        backgroundMusic: 'https://audio-samples.github.io/samples/mp3/loop-ambient.mp3',
        placeholderKey: 'story-conclusion',
        label: 'Story Conclusion'
      },
      {
        fileUrl: 'https://audio-samples.github.io/samples/mp3/story-outro.mp3',
        label: 'Story Closing Theme'
      }
    ],
    fadeIn: 1.5,
    fadeOut: 2
  }
] 