import { Blob } from '@google/genai';

/**
 * Encodes a Uint8Array to a base64 string.
 */
export function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string to a Uint8Array.
 */
export function base64Decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 */
export function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): AudioBuffer {
  const byteLength = data.byteLength - (data.byteLength % 2);
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Plays raw PCM data immediately (used for TTS).
 */
export async function playRawAudio(base64Data: string, ctx: AudioContext) {
  const bytes = base64Decode(base64Data);
  const buffer = pcmToAudioBuffer(bytes, ctx, 24000, 1);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  return source;
}

/**
 * Downsamples audio data to target sample rate.
 */
export function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (outputRate >= inputRate) return buffer;
  
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.floor(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const nextOffset = Math.floor((i + 1) * sampleRateRatio);
    const currOffset = Math.floor(i * sampleRateRatio);
    let accum = 0;
    let count = 0;
    
    for (let j = currOffset; j < nextOffset && j < buffer.length; j++) {
      accum += buffer[j];
      count++;
    }
    result[i] = count > 0 ? accum / count : 0;
  }
  return result;
}

/**
 * Creates a Gemini-compatible Blob from raw Float32 microphone data.
 * Refined with high-precision normalization and a soft peak limiter.
 */
export function float32To16BitPCM(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  
  // Audio Signal Protection
  const NOISE_FLOOR = 0.0003; 
  const GAIN_COEFFICIENT = 1.6; // Boost for clearer STT processing

  for (let i = 0; i < l; i++) {
    let s = data[i];
    
    // Noise Gate
    if (Math.abs(s) < NOISE_FLOOR) {
      s = 0;
    } else {
      // Gentle compression/gain
      s = s * GAIN_COEFFICIENT;
    }
    
    // Safety Peak Limiting
    s = Math.max(-0.95, Math.min(0.95, s));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  
  return {
    data: base64Encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}