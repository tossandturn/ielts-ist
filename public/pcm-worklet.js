class PcmWorkletProcessor extends AudioWorkletProcessor {
  constructor(options = {}) {
    super();
    const processorOptions = options.processorOptions || {};
    this.targetRate = Number(processorOptions.targetRate) || 16000;
    this.chunkMs = Number(processorOptions.chunkMs) || 20;
    this.chunkSamples = Math.max(160, Math.round((this.targetRate * this.chunkMs) / 1000));
    this.sourceRate = sampleRate;
    this.buffer = [];
    this.ratio = this.sourceRate / this.targetRate;
    this.position = 0;
    this.level = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    let sum = 0;
    for (let i = 0; i < input.length; i += 1) {
      sum += input[i] * input[i];
    }
    this.level = Math.sqrt(sum / input.length);

    while (this.position < input.length) {
      const index = Math.floor(this.position);
      const sample = Math.max(-1, Math.min(1, input[index] || 0));
      this.buffer.push(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
      this.position += this.ratio;
    }
    this.position -= input.length;

    while (this.buffer.length >= this.chunkSamples) {
      const chunk = new Int16Array(this.chunkSamples);
      for (let i = 0; i < chunk.length; i += 1) {
        chunk[i] = this.buffer.shift();
      }
      this.port.postMessage({ type: "pcm", level: this.level, pcm: chunk.buffer }, [chunk.buffer]);
    }

    return true;
  }
}

registerProcessor("pcm-worklet", PcmWorkletProcessor);
