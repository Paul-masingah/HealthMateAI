/**
 * Decodes a base64 string into an ArrayBuffer
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes audio data using AudioContext
 */
export async function decodeAudioData(
  base64Data: string,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const bytes = decodeBase64(base64Data);
  // Copy to a regular array buffer to prevent detachment issues during decoding
  const bufferCopy = bytes.buffer.slice(0);
  return await ctx.decodeAudioData(bufferCopy);
}

/**
 * Plays an AudioBuffer
 */
export function playAudioBuffer(
  buffer: AudioBuffer,
  ctx: AudioContext,
  destination: AudioNode
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(destination);
  source.start(0);
  return source;
}
