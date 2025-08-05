import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, Upload, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCloneManagerProps {
  personaId: string;
  familyMemberName: string;
}

interface AudioSample {
  recordingId: string;
  audioUrl: string;
  durationSeconds: number;
  qualityScore?: number;
}

const VoiceCloneManager: React.FC<VoiceCloneManagerProps> = ({ 
  personaId, 
  familyMemberName 
}) => {
  const { toast } = useToast();
  const [voiceStatus, setVoiceStatus] = useState<string>('pending');
  const [voiceModelId, setVoiceModelId] = useState<string | null>(null);
  const [samplesCount, setSamplesCount] = useState(0);
  const [availableRecordings, setAvailableRecordings] = useState<any[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<AudioSample[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoTriggerChecked, setAutoTriggerChecked] = useState(false);

  useEffect(() => {
    fetchPersonaVoiceStatus();
    fetchAvailableRecordings();
  }, [personaId]);

  // Auto-trigger voice cloning when good recordings are available
  useEffect(() => {
    if (!autoTriggerChecked && voiceStatus === 'pending' && availableRecordings.length > 0) {
      const goodRecordings = availableRecordings.filter(r => 
        r.duration_seconds >= 30 && r.duration_seconds <= 600
      );
      
      if (goodRecordings.length >= 1) {
        setAutoTriggerChecked(true);
        selectBestSamples();
        
        // Auto-start if we have sufficient good samples
        if (goodRecordings.length >= 1) {
          setTimeout(() => {
            if (selectedSamples.length === 0) {
              const autoSamples = goodRecordings
                .sort((a, b) => b.duration_seconds - a.duration_seconds)
                .slice(0, 3)
                .map(recording => ({
                  recordingId: recording.id,
                  audioUrl: recording.audio_url,
                  durationSeconds: recording.duration_seconds,
                  qualityScore: 0.85
                }));
              
              setSelectedSamples(autoSamples);
              startAutoVoiceCloning(autoSamples);
            }
          }, 1000);
        }
      }
    }
  }, [voiceStatus, availableRecordings, autoTriggerChecked]);

  const fetchPersonaVoiceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('voice_model_id, voice_model_status, voice_samples_count')
        .eq('id', personaId)
        .single();

      if (error) throw error;

      if (data) {
        setVoiceStatus(data.voice_model_status || 'pending');
        setVoiceModelId(data.voice_model_id);
        setSamplesCount(data.voice_samples_count || 0);
      }
    } catch (error) {
      console.error('Error fetching voice status:', error);
    }
  };

  const fetchAvailableRecordings = async () => {
    try {
      const { data: persona, error: personaError } = await supabase
        .from('personas')
        .select('family_member_id')
        .eq('id', personaId)
        .single();

      if (personaError) throw personaError;

      const { data: recordings, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('family_member_id', persona.family_member_id)
        .eq('processing_status', 'completed')
        .not('transcription', 'is', null);

      if (error) throw error;

      setAvailableRecordings(recordings || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  };

  const selectBestSamples = () => {
    // Auto-select best quality recordings for voice cloning
    const bestSamples = availableRecordings
      .filter(r => r.duration_seconds >= 30 && r.duration_seconds <= 300) // 30 seconds to 5 minutes
      .sort((a, b) => b.duration_seconds - a.duration_seconds) // Prefer longer recordings
      .slice(0, 5) // Take top 5
      .map(recording => ({
        recordingId: recording.id,
        audioUrl: recording.audio_url,
        durationSeconds: recording.duration_seconds,
        qualityScore: 0.85 // Estimate based on duration and completeness
      }));

    setSelectedSamples(bestSamples);
    
    toast({
      title: "Samples Selected",
      description: `Selected ${bestSamples.length} high-quality audio samples`,
    });
  };

  const startAutoVoiceCloning = async (samples: AudioSample[]) => {
    if (samples.length === 0) return;

    setIsProcessing(true);
    setVoiceStatus('training');

    toast({
      title: "Auto-Starting Voice Cloning",
      description: `Found ${samples.length} quality recordings. Starting voice cloning for ${familyMemberName}...`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('clone-voice', {
        body: {
          personaId,
          voiceName: familyMemberName,
          audioSamples: samples
        }
      });

      if (error) throw error;

      if (data.success) {
        setVoiceStatus('ready');
        setVoiceModelId(data.voiceId);
        setSamplesCount(samples.length);
        
        toast({
          title: "Voice Cloning Successful",
          description: `${familyMemberName}'s voice has been cloned successfully!`,
        });
      }
    } catch (error) {
      console.error('Voice cloning error:', error);
      setVoiceStatus('failed');
      toast({
        title: "Voice Cloning Failed",
        description: error.message || 'Failed to clone voice',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoiceCloning = async () => {
    if (selectedSamples.length === 0) {
      toast({
        title: "No Samples Selected",
        description: "Please select audio samples for voice cloning",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setVoiceStatus('training');

    try {
      const { data, error } = await supabase.functions.invoke('clone-voice', {
        body: {
          personaId,
          voiceName: familyMemberName,
          audioSamples: selectedSamples
        }
      });

      if (error) throw error;

      if (data.success) {
        setVoiceStatus('ready');
        setVoiceModelId(data.voiceId);
        setSamplesCount(selectedSamples.length);
        
        toast({
          title: "Voice Cloning Successful",
          description: `${familyMemberName}'s voice has been cloned successfully!`,
        });
      }
    } catch (error) {
      console.error('Voice cloning error:', error);
      setVoiceStatus('failed');
      toast({
        title: "Voice Cloning Failed",
        description: error.message || 'Failed to clone voice',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (voiceStatus) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'training':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusText = () => {
    switch (voiceStatus) {
      case 'ready':
        return 'Voice Ready';
      case 'training':
        return 'Training Voice...';
      case 'failed':
        return 'Training Failed';
      default:
        return 'Not Started';
    }
  };

  const getStatusColor = () => {
    switch (voiceStatus) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'training':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Cloning for {familyMemberName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
          <Badge className={getStatusColor()}>
            {voiceStatus.charAt(0).toUpperCase() + voiceStatus.slice(1)}
          </Badge>
        </div>

        {voiceStatus === 'training' && (
          <div className="space-y-2">
            <Progress value={75} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Training voice model with {samplesCount} audio samples...
            </p>
          </div>
        )}

        {voiceStatus === 'ready' && voiceModelId && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800">
              ✅ Voice model ready! {familyMemberName} can now speak in their authentic voice.
            </p>
            <p className="text-sm text-green-600 mt-1">
              Voice ID: {voiceModelId}
            </p>
          </div>
        )}

        {voiceStatus === 'pending' && (
          <div className="space-y-4">
            {isProcessing ? (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-blue-800 font-medium">
                    Auto-starting voice cloning for {familyMemberName}...
                  </p>
                </div>
                <p className="text-sm text-blue-600">
                  Using {selectedSamples.length} quality audio samples
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800">
                    Create a voice clone of {familyMemberName} using their recorded audio.
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Available recordings: {availableRecordings.length}
                  </p>
                </div>

                {availableRecordings.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Audio Samples</h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={selectBestSamples}
                        >
                          Auto-Select Best
                        </Button>
                      </div>
                      
                      {selectedSamples.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Selected {selectedSamples.length} samples 
                          ({selectedSamples.reduce((total, s) => total + s.durationSeconds, 0)} seconds total)
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={startVoiceCloning}
                      disabled={selectedSamples.length === 0}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Start Voice Cloning
                    </Button>
                  </>
                )}

                {availableRecordings.length === 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800">
                      No processed recordings available for voice cloning.
                    </p>
                    <p className="text-sm text-yellow-600 mt-1">
                      Record some audio first to create a voice clone.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {voiceStatus === 'failed' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-800">
                Voice cloning failed. Please try again with different audio samples.
              </p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setVoiceStatus('pending');
                setAutoTriggerChecked(false);
              }}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceCloneManager;