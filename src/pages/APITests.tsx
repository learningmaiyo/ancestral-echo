import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Mic, Volume2 } from 'lucide-react';
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
  const [assemblyAITesting, setAssemblyAITesting] = useState(false);
  const [elevenLabsTesting, setElevenLabsTesting] = useState(false);
  const [audioDebugTesting, setAudioDebugTesting] = useState(false);
  const [assemblyAIResult, setAssemblyAIResult] = useState<TestResult | null>(null);
  const [elevenLabsResult, setElevenLabsResult] = useState<TestResult | null>(null);
  const [audioDebugResult, setAudioDebugResult] = useState<TestResult | null>(null);

  const testAssemblyAI = async () => {
    setAssemblyAITesting(true);
    setAssemblyAIResult(null);
    
    try {
      // Test with a failed recording that should now work with AssemblyAI
      const recordingId = "6bd7ba7e-824a-42f2-b370-1038d00444e4";
      
      const response = await supabase.functions.invoke('debug-audio', {
        body: { recordingId }
      });
      
      const result = response.data;
      
      if (response.error || !result) {
        throw new Error(response.error?.message || 'No response from AssemblyAI test');
      }
      
      setAssemblyAIResult(result);
      
      if (result.success) {
        toast({
          title: "AssemblyAI Test Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "AssemblyAI Test Failed",
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
      setAssemblyAIResult(errorResult);
      
      toast({
        title: "AssemblyAI Test Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssemblyAITesting(false);
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
      
      console.log('Calling debug-audio function with recordingId:', recordingId);
      
      const response = await supabase.functions.invoke('debug-audio', {
        body: { recordingId }
      });
      
      console.log('Debug function response:', response);
      
      // Handle both error and data cases
      if (response.error) {
        // Check if it's a deployment issue
        if (response.error.message?.includes('Failed to fetch') || 
            response.error.message?.includes('Failed to send a request')) {
          throw new Error('Debug function is not deployed or accessible. The function may need to be redeployed.');
        }
        throw new Error(response.error.message || 'Function invocation failed');
      }
      
      const result = response.data;
      
      // If result is null or undefined, create a default error result
      if (!result) {
        throw new Error('No response data received from debug function');
      }
      
      setAudioDebugResult(result);
      
      if (result.success) {
        toast({
          title: "Audio Debug Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Audio Debug Failed",
          description: result.error || result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Audio debug error:', error);
      
      const errorResult = {
        success: false,
        message: "Debug test failed",
        error: error.message || 'Unknown error occurred'
      };
      setAudioDebugResult(errorResult);
      
      toast({
        title: "Audio Debug Error",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setAudioDebugTesting(false);
    }
  };

  const testBothAPIs = async () => {
    await Promise.all([testAssemblyAI(), testElevenLabs()]);
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
            Test your AssemblyAI and ElevenLabs API connections to ensure everything is working correctly.
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
                      <div>Audio size: {audioDebugResult.details.audioSize} bytes</div>
                      <div>Audio type: {audioDebugResult.details.audioType}</div>
                      {audioDebugResult.details.transcriptionPreview && (
                        <div>Preview: {audioDebugResult.details.transcriptionPreview}</div>
                      )}
                      {audioDebugResult.details.assemblyaiStatus && (
                        <div>AssemblyAI: {audioDebugResult.details.assemblyaiStatus}</div>
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

          {/* AssemblyAI Test Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                AssemblyAI API Test
                {getStatusIcon(assemblyAIResult, assemblyAITesting)}
              </CardTitle>
              <CardDescription>
                Test connection to AssemblyAI for audio transcription features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(assemblyAIResult, assemblyAITesting)}
              </div>
              
              {assemblyAIResult && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Message:</span> {assemblyAIResult.message}
                  </div>
                  {assemblyAIResult.success && assemblyAIResult.details && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Audio size: {assemblyAIResult.details.audioSize} bytes</div>
                      {assemblyAIResult.details.transcriptionPreview && (
                        <div>Preview: "{assemblyAIResult.details.transcriptionPreview}"</div>
                      )}
                      <div>Status: {assemblyAIResult.details.assemblyaiStatus || 'connected'}</div>
                    </div>
                  )}
                  {assemblyAIResult.error && (
                    <div className="text-sm text-red-500">
                      Error: {assemblyAIResult.error}
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={testAssemblyAI} 
                disabled={assemblyAITesting}
                className="w-full"
              >
                {assemblyAITesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test AssemblyAI Connection'
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
                disabled={assemblyAITesting || elevenLabsTesting}
                size="lg"
                className="w-full"
              >
                {(assemblyAITesting || elevenLabsTesting) ? (
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
        {(assemblyAIResult || elevenLabsResult || audioDebugResult) && (
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
                  <span className="font-medium">AssemblyAI API</span>
                  {getStatusBadge(assemblyAIResult, false)}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">ElevenLabs API</span>
                  {getStatusBadge(elevenLabsResult, false)}
                </div>
              </div>
              
              {assemblyAIResult?.success && elevenLabsResult?.success && audioDebugResult?.success && (
                <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">All Systems Operational</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Both AssemblyAI and ElevenLabs APIs are working correctly. Your Digital Storyteller app is ready for full functionality!
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