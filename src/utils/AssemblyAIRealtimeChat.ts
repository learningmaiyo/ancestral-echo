export class AssemblyAIRealtimeChat {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private isConnected = false;
  private isRecording = false;

  constructor(
    private onTranscript: (transcript: string, isFinal: boolean) => void,
    private onConnectionChange: (connected: boolean) => void,
    private onError: (error: string) => void
  ) {}

  async init() {
    try {
      console.log('Initializing AssemblyAI real-time transcription...');

      // Get microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Setup audio context
      this.audioContext = new AudioContext({
        sampleRate: 16000,
      });

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Get AssemblyAI token from our edge function
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('create-assemblyai-token');

      if (error || !data.token) {
        throw new Error(error?.message || "Failed to get AssemblyAI token");
      }

      // Connect to AssemblyAI Universal-Streaming API
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&encoding=pcm_s16le&token=${data.token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('AssemblyAI WebSocket connected');
        this.isConnected = true;
        this.onConnectionChange(true);
        this.startRecording();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('AssemblyAI response:', data);

        if (data.type === 'Turn') {
          // Universal-Streaming uses Turn objects with transcript field
          if (data.end_of_turn) {
            this.onTranscript(data.transcript, true);
          } else {
            this.onTranscript(data.transcript, false);
          }
        } else if (data.type === 'Begin') {
          console.log('AssemblyAI session started:', data.id);
        } else if (data.type === 'Termination') {
          console.log('AssemblyAI session terminated');
        }
      };

      this.ws.onerror = (error) => {
        console.error('AssemblyAI WebSocket error:', error);
        this.onError('Connection error');
      };

      this.ws.onclose = () => {
        console.log('AssemblyAI WebSocket closed');
        this.isConnected = false;
        this.onConnectionChange(false);
      };

    } catch (error) {
      console.error('Error initializing AssemblyAI:', error);
      this.onError(error instanceof Error ? error.message : 'Initialization failed');
      throw error;
    }
  }

  private startRecording() {
    if (!this.audioContext || !this.processor || !this.source) {
      console.error('Audio context not ready');
      return;
    }

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert Float32Array to Int16Array for AssemblyAI
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Send raw binary audio data to AssemblyAI Universal-Streaming
      this.ws.send(int16Data.buffer);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.isRecording = true;
    console.log('Started recording for AssemblyAI');
  }

  stopRecording() {
    this.isRecording = false;
    console.log('Stopped recording');
  }

  startRecordingManual() {
    this.isRecording = true;
    console.log('Resumed recording');
  }

  disconnect() {
    console.log('Disconnecting AssemblyAI chat...');
    
    this.isRecording = false;
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.onConnectionChange(false);
  }

  get connected() {
    return this.isConnected;
  }
}