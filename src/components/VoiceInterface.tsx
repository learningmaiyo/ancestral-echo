import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeVoiceChat } from '@/utils/RealtimeVoiceChat';

interface VoiceInterfaceProps {
  conversationId: string;
  familyMemberName: string;
  onMessage?: (message: any) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ 
  conversationId, 
  familyMemberName,
  onMessage 
}) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const chatRef = useRef<RealtimeVoiceChat | null>(null);
  const [lastMessage, setLastMessage] = useState<string>('');

  const handleMessage = (event: any) => {
    console.log('Voice event:', event.type);
    onMessage?.(event);

    // Update UI based on events
    if (event.type === 'response.audio_transcript.delta') {
      setLastMessage(prev => prev + (event.delta || ''));
    } else if (event.type === 'response.audio_transcript.done') {
      setLastMessage('');
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    setIsConnecting(false);
    
    if (connected) {
      toast({
        title: "Voice Connected",
        description: `You can now speak with ${familyMemberName}`,
      });
    }
  };

  const handleSpeakingChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  const startVoiceChat = async () => {
    setIsConnecting(true);
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      chatRef.current = new RealtimeVoiceChat(
        handleMessage,
        handleConnectionChange,
        handleSpeakingChange
      );
      
      await chatRef.current.init(conversationId);
      
    } catch (error) {
      console.error('Error starting voice chat:', error);
      setIsConnecting(false);
      
      toast({
        title: "Connection Failed",
        description: error instanceof Error 
          ? error.message 
          : 'Failed to start voice conversation. Please check your microphone permissions.',
        variant: "destructive",
      });
    }
  };

  const endVoiceChat = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    setLastMessage('');
    
    toast({
      title: "Voice Disconnected",
      description: "Voice conversation ended",
    });
  };

  const toggleMute = () => {
    // For WebRTC, we'd need to control the audio track
    // This is a simplified version
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Unmuted" : "Muted",
      description: isMuted ? "Your microphone is now active" : "Your microphone is now muted",
    });
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Volume2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Voice Conversation</h3>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2">
            {isConnecting && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Connecting...</span>
              </>
            )}
            
            {isConnected && !isSpeaking && (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Ready to talk</span>
              </div>
            )}
            
            {isSpeaking && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">{familyMemberName} is speaking...</span>
              </div>
            )}
          </div>

          {/* Live Transcript */}
          {lastMessage && (
            <div className="bg-muted p-3 rounded-lg text-sm text-left">
              <span className="font-medium">{familyMemberName}: </span>
              {lastMessage}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!isConnected ? (
              <Button 
                onClick={startVoiceChat}
                disabled={isConnecting}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Start Voice Chat
              </Button>
            ) : (
              <>
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "destructive" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                
                <Button
                  onClick={endVoiceChat}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <PhoneOff className="h-4 w-4" />
                  End Call
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground text-center">
            {!isConnected ? (
              <p>Click "Start Voice Chat" to begin a live conversation with {familyMemberName}</p>
            ) : (
              <p>Speak naturally - {familyMemberName} will respond in their authentic voice</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceInterface;