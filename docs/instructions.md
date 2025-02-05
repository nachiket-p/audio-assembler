## Summary
Build a simple single page audio merging application to merge multiple audio files with fading & background music. Use Web Audio API for audio processing. 
Support hard-coded sample Audio templates. 

#### UI requirements
- Allow user to select Audio template from the list of templates.
- Render the template with fixed audio sequence and placeholders for audio files.
- Allow user to play the fixed audio sequence steps of the template.
- Allow user to upload audio files for each placeholder in the template.
- Allow user to preview the merged audio.
- Allow user to download the merged audio.


### Technical documentation
#### Possible Audio Function to implement Audio processing 

```ts
interface AudioSequenceItem {
  fileUrl?: string;
  backgroundMusic?: string;
  placeholderKey?: string;
}

interface Template {
  audioSequence: AudioSequenceItem[];
  fadeIn: number;
  fadeOut: number;
}

interface AudioFile {
  placeholderKey: string;
  fileUrl: string;
}

interface AudioFiles {
  audioFiles: AudioFile[];
}

async function mergeAudio(template: Template, audioFiles: AudioFiles): Promise<Blob> {
  const audioContext = new AudioContext();

  const loadedAudios: { [key: string]: AudioBuffer } = {};
  const loadedBackgrounds: { [key: string]: AudioBuffer } = {};

  // Function to load an audio file
  async function loadAudio(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
  }

  // Load all necessary audio files (both main and background)
  const allFilesToLoad = new Set<string>();
  for (const item of template.audioSequence) {
    if (item.fileUrl) allFilesToLoad.add(item.fileUrl);
    if (item.backgroundMusic) allFilesToLoad.add(item.backgroundMusic);
  }
  for (const file of audioFiles.audioFiles) {
    allFilesToLoad.add(file.fileUrl);
  }

  const loadingPromises = Array.from(allFilesToLoad).map(async (url) => {
    try {
      const audioBuffer = await loadAudio(url);
      if (template.audioSequence.some(item => item.fileUrl === url)) {
        loadedAudios[url] = audioBuffer;
      } else if (template.audioSequence.some(item => item.backgroundMusic === url)) {
        loadedBackgrounds[url] = audioBuffer;
      } else {
        const matchingFile = audioFiles.audioFiles.find(f => f.fileUrl === url);
        if (matchingFile) {
          loadedAudios[matchingFile.placeholderKey!] = audioBuffer;
        }
      }
    } catch (error) {
      console.error("Error loading audio:", url, error);
      throw error; // Re-throw the error to be caught later if needed.
    }
  });

  await Promise.all(loadingPromises);

  let currentTime = 0;
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 1; // Start with full volume
  masterGain.connect(audioContext.destination); // Connect to output

  for (const item of template.audioSequence) {
    let audioBuffer: AudioBuffer | null = null;
    if (item.fileUrl) {
      audioBuffer = loadedAudios[item.fileUrl];
    } else if (item.placeholderKey) {
      audioBuffer = loadedAudios[item.placeholderKey];
    }

    if (audioBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1; // Initial volume
      source.connect(gainNode);

      if (item.backgroundMusic) {
        const backgroundBuffer = loadedBackgrounds[item.backgroundMusic];
        if (backgroundBuffer) {
          const backgroundSource = audioContext.createBufferSource();
          backgroundSource.buffer = backgroundBuffer;
          backgroundSource.loop = true; // or false, depending on what you want
          const backgroundGain = audioContext.createGain();
          backgroundGain.gain.value = 0.5; // adjust background music volume
          backgroundSource.connect(backgroundGain);
          backgroundGain.connect(gainNode); // Connect background to main audio's gain
          backgroundSource.start(currentTime);

        }
      }

      source.connect(masterGain);
      source.start(currentTime);

      // Apply fade-in/out
      gainNode.gain.linearRampToValueAtTime(1, currentTime + template.fadeIn); // Fade in
      gainNode.gain.linearRampToValueAtTime(0, currentTime + audioBuffer.duration - template.fadeOut); // Fade out

      currentTime += audioBuffer.duration;

    } else {
      console.warn("Audio buffer not found for item:", item);
    }
  }

  // Create a new offline audio context for rendering
  const offlineContext = new OfflineAudioContext(2, currentTime * audioContext.sampleRate, audioContext.sampleRate);

  // Clone the connected graph to the offline context
  const offlineMasterGain = offlineContext.createGain();
  offlineMasterGain.gain.value = 1;
  masterGain.connect(offlineMasterGain);
  offlineMasterGain.connect(offlineContext.destination);

  return new Promise<Blob>((resolve, reject) => {
    offlineContext.startRendering();
    offlineContext.oncomplete = (e) => {
      const renderedBuffer = e.renderedBuffer;
      const wav = generateWavBlob(renderedBuffer); // helper function (see below)
      resolve(wav);
    };
    offlineContext.onerror = (e) => {
      reject(e);
    };
  });
}


// Helper function to convert AudioBuffer to WAV Blob (from: https://gist.github.com/kusma/9c9555f0a4c4c5c0819b)
function generateWavBlob(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0); // Assuming stereo, take the first channel
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // write the sample data
  let index = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(index, sample < 0 ? sample * 32768 : sample * 32767, true);
    index += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}



// Example Usage (async/await):
async function processAudio() {
    const template: Template = { /* ... your template data ... */ };
    const audioFiles: AudioFiles = { /* ... your audio files data ... */ };

    try {
        const mergedBlob = await mergeAudio(template, audioFiles);
        const audioUrl = URL.createObjectURL(mergedBlob);
        const audio = new Audio(audioUrl);
        audio.play();

        // Or download the blob:
        const link = document.createElement('a');
        link.href = URL.createObjectURL(mergedBlob);
        link.download = 'merged_audio.wav';
        link.click();

    } catch (error) {
        console.error("Error merging audio:", error);
    }
}

processAudio();
```
