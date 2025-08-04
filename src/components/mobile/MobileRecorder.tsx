import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Wifi,
  WifiOff,
  Save,
  Trash2,
  Volume2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MobileRecorderProps {
  familyMemberId?: string;
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
}

const MobileRecorder: React.FC<MobileRecorderProps> = ({
  familyMemberId,
  onRecordingComplete
}) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [savedOffline, setSavedOffline] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      // Add haptic feedback for mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });

      chunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      mediaRecorderRef.current.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Save offline if not connected
        if (!isOnline) {
          saveRecordingOffline(blob);
        }
        
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      toast({
        title: "Recording Started",
        description: isOnline ? "Recording your story..." : "Recording offline - will sync when connected",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        if ('vibrate' in navigator) {
          navigator.vibrate(30);
        }
        toast({
          title: "Recording Resumed",
          description: "Continue sharing your story",
        });
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 50, 30]);
        }
        toast({
          title: "Recording Paused",
          description: "Tap to resume recording",
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      toast({
        title: "Recording Completed",
        description: `${formatTime(recordingTime)} recorded successfully`,
      });
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const resetRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setIsPlaying(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setSavedOffline(false);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    toast({
      title: "Recording Reset",
      description: "Ready to record a new story",
    });
  };

  const saveRecording = async () => {
    if (audioBlob && onRecordingComplete) {
      try {
        onRecordingComplete(audioBlob, recordingTime);
        resetRecording();
        
        toast({
          title: "Recording Saved",
          description: "Your story has been preserved",
        });
      } catch (error) {
        console.error('Error saving recording:', error);
        
        // Save offline as fallback
        if (!isOnline) {
          saveRecordingOffline(audioBlob);
        }
      }
    }
  };

  const saveRecordingOffline = (blob: Blob) => {
    try {
      const offlineData = {
        blob: blob,
        timestamp: Date.now(),
        familyMemberId,
        duration: recordingTime,
        id: `offline-${Date.now()}`
      };
      
      const existingOfflineRecordings = JSON.parse(
        localStorage.getItem('offlineRecordings') || '[]'
      );
      
      existingOfflineRecordings.push({
        ...offlineData,
        blobUrl: URL.createObjectURL(blob)
      });
      
      localStorage.setItem('offlineRecordings', JSON.stringify(existingOfflineRecordings));
      setSavedOffline(true);
      
      toast({
        title: "Saved Offline",
        description: "Recording will sync when you're back online",
      });
    } catch (error) {
      console.error('Error saving offline:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingProgress = () => {
    const maxTime = 15 * 60; // 15 minutes max
    return Math.min((recordingTime / maxTime) * 100, 100);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6">
      {/* Status Indicators */}
      <div className="flex justify-between items-center">
        <Badge variant={isOnline ? "default" : "destructive"} className="gap-2">
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isOnline ? "Online" : "Offline"}
        </Badge>
        
        {savedOffline && (
          <Badge variant="secondary" className="gap-2">
            <Save className="h-3 w-3" />
            Saved Offline
          </Badge>
        )}
      </div>

      {/* Main Recording Card */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-8 text-center space-y-6">
          {/* Recording Timer */}
          <div className="space-y-2">
            <div className="text-4xl font-mono font-bold text-primary">
              {formatTime(recordingTime)}
            </div>
            <Progress value={getRecordingProgress()} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {isRecording ? (isPaused ? "Paused" : "Recording...") : "Ready to record"}
            </p>
          </div>

          {/* Main Control Button */}
          <div className="space-y-4">
            {!isRecording && !audioBlob && (
              <Button
                size="lg"
                onClick={startRecording}
                className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
              >
                <Mic className="h-8 w-8" />
              </Button>
            )}

            {isRecording && (
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={pauseRecording}
                  className="w-16 h-16 rounded-full"
                >
                  {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                </Button>
                
                <Button
                  size="lg"
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <Square className="h-8 w-8" />
                </Button>
              </div>
            )}

            {audioBlob && !isRecording && (
              <div className="space-y-4">
                {/* Playback Controls */}
                <div className="flex gap-4 justify-center">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={playRecording}
                    className="w-16 h-16 rounded-full"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={resetRecording}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </Button>
                  
                  <Button
                    onClick={saveRecording}
                    className="gap-2"
                    disabled={!isOnline && savedOffline}
                  >
                    <Save className="h-4 w-4" />
                    Save Story
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            {!isRecording && !audioBlob && (
              <p>Tap the red button to start recording your family story</p>
            )}
            {isRecording && (
              <p>
                {isPaused 
                  ? "Recording paused - tap play to continue" 
                  : "Share your memories, stories, and wisdom"
                }
              </p>
            )}
            {audioBlob && !isRecording && (
              <p>Listen to your recording and save it to preserve the memory</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        style={{ display: 'none' }}
        src={audioUrl || ''}
      />
    </div>
  );
};

export default MobileRecorder;