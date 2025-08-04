export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
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
  }
}

export class RealtimeVoiceChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;
  private isConnected = false;

  constructor(
    private onMessage: (message: any) => void,
    private onConnectionChange: (connected: boolean) => void,
    private onSpeakingChange: (speaking: boolean) => void
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    document.body.appendChild(this.audioEl);
  }

  async init(conversationId: string) {
    try {
      console.log('Initializing voice chat for conversation:', conversationId);

      // Get ephemeral token from our Supabase Edge Function
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('create-voice-session', {
        body: { conversationId }
      });

      if (error || !data.client_secret?.value) {
        throw new Error(error?.message || "Failed to get ephemeral token");
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log('Received ephemeral token');

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio playback
      this.pc.ontrack = (e) => {
        console.log('Received remote audio track');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track for microphone
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for control messages
      this.dc = this.pc.createDataChannel("oai-events");
      this.dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("Received event:", event.type);
        this.handleRealtimeEvent(event);
      });

      this.dc.addEventListener("open", () => {
        console.log("Data channel opened");
        this.isConnected = true;
        this.onConnectionChange(true);
      });

      this.dc.addEventListener("close", () => {
        console.log("Data channel closed");
        this.isConnected = false;
        this.onConnectionChange(false);
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      console.log('Connecting to OpenAI Realtime API...');
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect to OpenAI: ${sdpResponse.status}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established with OpenAI");

    } catch (error) {
      console.error("Error initializing voice chat:", error);
      this.onConnectionChange(false);
      throw error;
    }
  }

  private handleRealtimeEvent(event: any) {
    this.onMessage(event);

    // Handle specific events for UI updates
    switch (event.type) {
      case 'response.audio.delta':
        this.onSpeakingChange(true);
        break;
      case 'response.audio.done':
        this.onSpeakingChange(false);
        break;
      case 'response.done':
        this.onSpeakingChange(false);
        break;
      case 'error':
        console.error('Realtime API error:', event.error);
        break;
    }
  }

  async sendTextMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Voice connection not ready');
    }

    console.log('Sending text message:', text);

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({type: 'response.create'}));
  }

  startAudioInput() {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Voice connection not ready');
    }

    console.log('Starting audio input...');
    
    // Audio input is automatically handled by the WebRTC connection
    // The microphone stream we added to the peer connection handles this
  }

  stopAudioInput() {
    console.log('Stopping audio input...');
    // WebRTC handles the audio automatically
  }

  disconnect() {
    console.log('Disconnecting voice chat...');
    
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
    
    if (this.audioEl.parentNode) {
      this.audioEl.parentNode.removeChild(this.audioEl);
    }
    
    this.isConnected = false;
    this.onConnectionChange(false);
    this.onSpeakingChange(false);
  }

  get connected() {
    return this.isConnected;
  }
}