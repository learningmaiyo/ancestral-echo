import { useState, useEffect } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Square, Play, Pause, RotateCcw, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FamilyMember {
  id: string;
  name: string;
}

interface AudioRecorderProps {
  preselectedFamilyMember?: string | null;
}

export const AudioRecorder = ({ preselectedFamilyMember }: AudioRecorderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const recorder = useAudioRecorder();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState(preselectedFamilyMember || '');
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch family members
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('family_members')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name');

        if (error) {
          console.error('Error fetching family members:', error);
          return;
        }

        setFamilyMembers(data || []);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchFamilyMembers();
  }, [user]);

  const handleStartRecording = async () => {
    try {
      setError('');
      await recorder.startRecording();
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const handleSaveRecording = async () => {
    if (!recorder.audioBlob || !user || !selectedMember) return;

    setSaving(true);
    setError('');

    try {
      // Upload audio file
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, recorder.audioBlob);

      if (uploadError) throw uploadError;

      // Get file URL
      const { data } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      // Save recording metadata
      const { error: insertError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          family_member_id: selectedMember,
          audio_url: data.publicUrl,
          duration_seconds: recorder.duration,
          context: context || null,
          file_size_bytes: recorder.audioBlob.size,
          processing_status: 'pending',
        });

      if (insertError) throw insertError;

      toast({
        title: 'Recording saved!',
        description: 'Your recording has been saved successfully.',
      });

      // Reset form
      recorder.resetRecording();
      setSelectedMember(preselectedFamilyMember || '');
      setContext('');

    } catch (error: any) {
      console.error('Error saving recording:', error);
      setError(error.message || 'Failed to save recording');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Record Family Story
        </CardTitle>
        <CardDescription>
          Record stories, memories, and conversations with your family members
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Family Member Selection */}
        <div className="space-y-2">
          <Label>Family Member *</Label>
          {familyMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No family members found. <a href="/family-members" className="text-primary hover:underline">Add family members first</a>.
            </div>
          ) : (
            <Select
              value={selectedMember}
              onValueChange={setSelectedMember}
              disabled={recorder.isRecording}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select family member" />
              </SelectTrigger>
              <SelectContent>
                {familyMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Context */}
        <div className="space-y-2">
          <Label htmlFor="context">Context (Optional)</Label>
          <Textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="What is this recording about? (e.g., childhood memories, family recipes, etc.)"
            disabled={recorder.isRecording}
            rows={3}
          />
        </div>

        {/* Recording Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="text-3xl font-mono text-primary">
              {recorder.formatDuration(recorder.duration)}
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {!recorder.isRecording && !recorder.audioBlob && (
              <Button
                onClick={handleStartRecording}
                disabled={!selectedMember}
                size="lg"
                className="gap-2"
              >
                <Mic className="h-5 w-5" />
                Start Recording
              </Button>
            )}

            {recorder.isRecording && !recorder.isPaused && (
              <>
                <Button
                  onClick={recorder.pauseRecording}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <Pause className="h-5 w-5" />
                  Pause
                </Button>
                <Button
                  onClick={recorder.stopRecording}
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                >
                  <Square className="h-5 w-5" />
                  Stop
                </Button>
              </>
            )}

            {recorder.isRecording && recorder.isPaused && (
              <>
                <Button
                  onClick={recorder.resumeRecording}
                  size="lg"
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  Resume
                </Button>
                <Button
                  onClick={recorder.stopRecording}
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                >
                  <Square className="h-5 w-5" />
                  Stop
                </Button>
              </>
            )}

            {recorder.audioBlob && (
              <>
                <Button
                  onClick={recorder.resetRecording}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </Button>
                <Button
                  onClick={handleSaveRecording}
                  disabled={saving}
                  size="lg"
                  className="gap-2"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="h-5 w-5" />
                  Save Recording
                </Button>
              </>
            )}
          </div>

          {/* Audio Preview */}
          {recorder.audioBlob && (
            <div className="flex justify-center">
              <audio
                controls
                src={URL.createObjectURL(recorder.audioBlob)}
                className="w-full max-w-md"
              />
            </div>
          )}
        </div>

        {/* Status */}
        {recorder.isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              {recorder.isPaused ? 'Recording paused' : 'Recording in progress...'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};