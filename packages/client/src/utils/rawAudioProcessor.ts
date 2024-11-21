const blob = new Blob(
  [
    `
      const TARGET_SAMPLE_RATE = 16000;
      class RawAudioProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = []; // Initialize an empty buffer
          this.bufferSize = TARGET_SAMPLE_RATE / 4; // Define the threshold for buffer size to be ~0.25s

          if (globalThis.LibSampleRate && sampleRate !== TARGET_SAMPLE_RATE) {
            globalThis.LibSampleRate.create(1, sampleRate, TARGET_SAMPLE_RATE).then(resampler => {
              this.resampler = resampler;
            });
          }
        }
        process(inputs, outputs) {
          const input = inputs[0]; // Get the first input node
          if (input.length > 0) {
            let channelData = input[0]; // Get the first channel's data

            // Resample the audio if necessary
            if (this.resampler) {
              channelData = this.resampler.full(channelData);
            }

            // Add channel data to the buffer
            this.buffer.push(...channelData);
            // Get max volume 
            let sum = 0.0;
            for (let i = 0; i < channelData.length; i++) {
              sum += channelData[i] * channelData[i];
            }
            const maxVolume = Math.sqrt(sum / channelData.length);
            // Check if buffer size has reached or exceeded the threshold
            if (this.buffer.length >= this.bufferSize) {
              const float32Array = new Float32Array(this.buffer)
              let pcm16Array = new Int16Array(float32Array.length);

              // Iterate through the Float32Array and convert each sample to PCM16
              for (let i = 0; i < float32Array.length; i++) {
                // Clamp the value to the range [-1, 1]
                let sample = Math.max(-1, Math.min(1, float32Array[i]));
            
                // Scale the sample to the range [-32768, 32767] and store it in the Int16Array
                pcm16Array[i] = sample < 0 ? sample * 32768 : sample * 32767;
              }
            
              // Send the buffered data to the main script
              this.port.postMessage([pcm16Array, maxVolume]);
            
              // Clear the buffer after sending
              this.buffer = [];
            }
          }
          return true; // Continue processing
        }
      }
      registerProcessor("raw-audio-processor", RawAudioProcessor);
  `,
  ],
  { type: "application/javascript" }
);

export const rawAudioProcessor = URL.createObjectURL(blob);
