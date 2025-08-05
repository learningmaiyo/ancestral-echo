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

      // Connect to AssemblyAI Streaming API
      const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${data.token}`;
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

        if (data.message_type === 'PartialTranscript') {
          this.onTranscript(data.text, false);
        } else if (data.message_type === 'FinalTranscript') {
          this.onTranscript(data.text, true);
        } else if (data.message_type === 'SessionBegins') {
          console.log('AssemblyAI session started');
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

      // Convert to base64 for transmission
      const uint8Data = new Uint8Array(int16Data.buffer);
      let binary = '';
      const chunkSize = 0x8000;
      
      for (let i = 0; i < uint8Data.length; i += chunkSize) {
        const chunk = uint8Data.subarray(i, Math.min(i + chunkSize, uint8Data.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Data = btoa(binary);

      // Send audio data to AssemblyAI
      this.ws.send(JSON.stringify({
        audio_data: base64Data
      }));
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