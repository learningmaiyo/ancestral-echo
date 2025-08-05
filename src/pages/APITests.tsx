import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Zap, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  details?: any;
}

const APITests = () => {
  const { toast } = useToast();
  const [openAITesting, setOpenAITesting] = useState(false);
  const [elevenLabsTesting, setElevenLabsTesting] = useState(false);
  const [audioDebugTesting, setAudioDebugTesting] = useState(false);
  const [openAIResult, setOpenAIResult] = useState<TestResult | null>(null);
  const [elevenLabsResult, setElevenLabsResult] = useState<TestResult | null>(null);
  const [audioDebugResult, setAudioDebugResult] = useState<TestResult | null>(null);

  const testOpenAI = async () => {
    setOpenAITesting(true);
    setOpenAIResult(null);
    
    try {
      const response = await supabase.functions.invoke('test-openai');
      const result = response.data;
      
      setOpenAIResult(result);
      
      if (result.success) {
        toast({
          title: "OpenAI Test Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "OpenAI Test Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorResult = {
        success: false,
        message: "Test failed",
        error: error.message
      };
      setOpenAIResult(errorResult);
      
      toast({
        title: "OpenAI Test Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setOpenAITesting(false);
    }
  };

  const testElevenLabs = async () => {
    setElevenLabsTesting(true);
    setElevenLabsResult(null);
    
    try {
      const response = await supabase.functions.invoke('test-elevenlabs');
      const result = response.data;
      
      setElevenLabsResult(result);
      
      if (result.success) {
        toast({
          title: "ElevenLabs Test Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "ElevenLabs Test Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorResult = {
        success: false,
        message: "Test failed",
        error: error.message
      };
      setElevenLabsResult(errorResult);
      
      toast({
        title: "ElevenLabs Test Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setElevenLabsTesting(false);
    }
  };

  const testAudioDebug = async () => {
    setAudioDebugTesting(true);
    setAudioDebugResult(null);
    
    try {
      // Use one of the failed recording IDs
      const recordingId = "6bd7ba7e-824a-42f2-b370-1038d00444e4";
      
      const response = await supabase.functions.invoke('debug-audio', {
        body: { recordingId }
      });
      const result = response.data;
      
      setAudioDebugResult(result);
      
      if (result.success) {
        toast({
          title: "Audio Debug Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Audio Debug Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorResult = {
        success: false,
        message: "Debug test failed",
        error: error.message
      };
      setAudioDebugResult(errorResult);
      
      toast({
        title: "Audio Debug Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAudioDebugTesting(false);
    }
  };

  const testBothAPIs = async () => {
    await Promise.all([testOpenAI(), testElevenLabs()]);
  };

  const getStatusIcon = (result: TestResult | null, testing: boolean) => {
    if (testing) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!result) return null;
    return result.success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (result: TestResult | null, testing: boolean) => {
    if (testing) return <Badge variant="secondary">Testing...</Badge>;
    if (!result) return <Badge variant="outline">Not Tested</Badge>;
    return result.success ? 
      <Badge variant="default" className="bg-green-500">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Integration Tests</h1>
          <p className="text-muted-foreground">
            Test your OpenAI and ElevenLabs API connections to ensure everything is working correctly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Audio Debug Test Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-orange-500" />
                Audio Debug Test
                {getStatusIcon(audioDebugResult, audioDebugTesting)}
              </CardTitle>
              <CardDescription>
                Debug failed audio recordings to identify the root cause
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(audioDebugResult, audioDebugTesting)}
              </div>
              
              {audioDebugResult && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Message:</span> {audioDebugResult.message}
                  </div>
                  {audioDebugResult.success && audioDebugResult.details && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Recording ID: {audioDebugResult.details.recording_id}</div>
                      <div>Audio size: {audioDebugResult.details.audio_size} bytes</div>
                      <div>File: {audioDebugResult.details.file_name}</div>
                      {audioDebugResult.details.transcription_preview && (
                        <div>Preview: {audioDebugResult.details.transcription_preview}</div>
                      )}
                    </div>
                  )}
                  {audioDebugResult.error && (
                    <div className="text-sm text-red-500">
                      Error: {audioDebugResult.error}
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={testAudioDebug} 
                disabled={audioDebugTesting}
                className="w-full"
                variant="outline"
              >
                {audioDebugTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Debugging...
                  </>
                ) : (
                  'Debug Failed Recording'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* OpenAI Test Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                OpenAI API Test
                {getStatusIcon(openAIResult, openAITesting)}
              </CardTitle>
              <CardDescription>
                Test connection to OpenAI's GPT models for AI conversation features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(openAIResult, openAITesting)}
              </div>
              
              {openAIResult && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Message:</span> {openAIResult.message}
                  </div>
                  {openAIResult.success && openAIResult.data && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Model: {openAIResult.data.model || 'gpt-4o-mini'}</div>
                      <div>Response: "{openAIResult.data.response}"</div>
                      {openAIResult.data.usage && (
                        <div>Tokens used: {openAIResult.data.usage.total_tokens}</div>
                      )}
                    </div>
                  )}
                  {openAIResult.error && (
                    <div className="text-sm text-red-500">
                      Error: {openAIResult.error}
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={testOpenAI} 
                disabled={openAITesting}
                className="w-full"
              >
                {openAITesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test OpenAI Connection'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* ElevenLabs Test Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary" />
                ElevenLabs API Test
                {getStatusIcon(elevenLabsResult, elevenLabsTesting)}
              </CardTitle>
              <CardDescription>
                Test connection to ElevenLabs for voice synthesis and cloning features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(elevenLabsResult, elevenLabsTesting)}
              </div>
              
              {elevenLabsResult && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Message:</span> {elevenLabsResult.message}
                  </div>
                  {elevenLabsResult.success && elevenLabsResult.data && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Available voices: {elevenLabsResult.data.voicesCount}</div>
                      <div>Audio generated: {elevenLabsResult.data.audioGenerated ? 'Yes' : 'No'}</div>
                      <div>Audio size: {elevenLabsResult.data.audioSize} bytes</div>
                      <div>Voice used: {elevenLabsResult.data.voiceUsed}</div>
                    </div>
                  )}
                  {elevenLabsResult.error && (
                    <div className="text-sm text-red-500">
                      Error: {elevenLabsResult.error}
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={testElevenLabs} 
                disabled={elevenLabsTesting}
                className="w-full"
              >
                {elevenLabsTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test ElevenLabs Connection'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test All Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Button 
                onClick={testBothAPIs} 
                disabled={openAITesting || elevenLabsTesting}
                size="lg"
                className="w-full"
              >
                {(openAITesting || elevenLabsTesting) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  'Test Both APIs'
                )}
              </Button>
              
              <Button 
                onClick={testAudioDebug} 
                disabled={audioDebugTesting}
                size="lg"
                variant="outline"
                className="w-full"
              >
                {audioDebugTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Debugging Audio...
                  </>
                ) : (
                  'Debug Audio Processing'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {(openAIResult || elevenLabsResult || audioDebugResult) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">Audio Debug</span>
                  {getStatusBadge(audioDebugResult, false)}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">OpenAI API</span>
                  {getStatusBadge(openAIResult, false)}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">ElevenLabs API</span>
                  {getStatusBadge(elevenLabsResult, false)}
                </div>
              </div>
              
              {openAIResult?.success && elevenLabsResult?.success && audioDebugResult?.success && (
                <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">All Systems Operational</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Both OpenAI and ElevenLabs APIs are working correctly. Your Digital Storyteller app is ready for full functionality!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default APITests;