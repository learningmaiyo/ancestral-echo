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
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Square, Play, Pause, RotateCcw, Save, Loader2, Upload, File } from 'lucide-react';
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

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
      const { data: insertData, error: insertError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          family_member_id: selectedMember,
          audio_url: data.publicUrl,
          duration_seconds: recorder.duration,
          context: context || null,
          file_size_bytes: recorder.audioBlob.size,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Recording saved!',
        description: 'Your recording has been saved and will be processed shortly.',
      });

      // Trigger background processing
      try {
        await supabase.functions.invoke('process-recording', {
          body: { recordingId: insertData.id }
        });
      } catch (processError) {
        console.error('Error triggering processing:', processError);
        // Don't show error to user as the recording was saved successfully
      }

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file');
      return;
    }

    setUploadedFile(file);
    setUploadedFileUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleSaveUploadedFile = async () => {
    if (!uploadedFile || !user || !selectedMember) return;

    setSaving(true);
    setError('');

    try {
      // Upload audio file
      const fileName = `${user.id}/${Date.now()}-${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      // Get file URL
      const { data } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      // Get audio duration (approximate from file size and bitrate)
      const estimatedDuration = Math.floor(uploadedFile.size / 16000); // rough estimate

      // Save recording metadata
      const { data: insertData, error: insertError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          family_member_id: selectedMember,
          audio_url: data.publicUrl,
          duration_seconds: estimatedDuration,
          context: context || null,
          file_size_bytes: uploadedFile.size,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Recording uploaded!',
        description: 'Your audio file has been uploaded and will be processed shortly.',
      });

      // Trigger background processing
      try {
        await supabase.functions.invoke('process-recording', {
          body: { recordingId: insertData.id }
        });
      } catch (processError) {
        console.error('Error triggering processing:', processError);
      }

      // Reset form
      setUploadedFile(null);
      setUploadedFileUrl(null);
      setSelectedMember(preselectedFamilyMember || '');
      setContext('');
      // Clear file input
      const fileInput = document.getElementById('audio-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(error.message || 'Failed to upload file');
    } finally {
      setSaving(false);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setError('');
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

        {/* Recording Options */}
        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Record Live
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="space-y-4 mt-6">
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

            {/* Recording Status */}
            {recorder.isRecording && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  {recorder.isPaused ? 'Recording paused' : 'Recording in progress...'}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audio-upload">Select Audio File</Label>
                <Input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  disabled={saving}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground">
                  Supported formats: MP3, WAV, M4A, OGG, WEBM
                </p>
              </div>

              {uploadedFile && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <File className="h-4 w-4" />
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>

                  {uploadedFileUrl && (
                    <div className="flex justify-center">
                      <audio
                        controls
                        src={uploadedFileUrl}
                        className="w-full max-w-md"
                      />
                    </div>
                  )}

                  <div className="flex justify-center gap-2">
                    <Button
                      onClick={clearUploadedFile}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Clear File
                    </Button>
                    <Button
                      onClick={handleSaveUploadedFile}
                      disabled={saving || !selectedMember}
                      size="lg"
                      className="gap-2"
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Upload className="h-5 w-5" />
                      Upload & Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};