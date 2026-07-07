import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'done' | 'error';

export default function VoiceClone() {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SCRIPT = `Hæ, þetta er Gummi. Ég er hér til að hjálpa þér í dag. Hvað get ég gert fyrir þig? Þarftu að finna veitingastað, iðnaðarmann, eða viltu bera saman verð á einhverju? Segðu mér bara hvað þú þarft og við finnum lausnina saman. Gummi Gúrú er persónuleg þjónusta. Ég nota bestu tækni til að gera lífið auðveldara fyrir þig. Hvort sem þú þarft pípara á morgun eða vilt bóka borð í kvöld, ég er hér. Hello, this is Gummi. I am here to help you today. Whatever you need — finding a restaurant, comparing prices, booking a tradesperson — just tell me and we will sort it out together. Gummi Gúrú is your personal concierge, available whenever you need it.`;

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setState('recorded');
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (e) {
      setErrorMsg('Microphone access denied. Please allow microphone access and try again.');
      setState('error');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const uploadVoice = useCallback(async () => {
    if (!blobRef.current) return;
    setState('uploading');
    setUploadProgress(10);
    try {
      const formData = new FormData();
      formData.append('file', blobRef.current, 'gummi-voice.webm');
      formData.append('name', 'Gummi Eyberg');
      formData.append('description', 'Gummi Gúrú personal agent voice — Icelandic/English');

      setUploadProgress(30);
      const res = await fetch('/api/upload-voice-clone', {
        method: 'POST',
        body: formData,
      });
      setUploadProgress(80);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setVoiceId(data.voice_id);
      setUploadProgress(100);
      setState('done');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Upload failed');
      setState('error');
    }
  }, []);

  const reset = () => {
    setState('idle');
    setDuration(0);
    setAudioUrl(null);
    setVoiceId(null);
    setErrorMsg(null);
    setUploadProgress(0);
    blobRef.current = null;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="text-4xl mb-2">🎙️</div>
          <CardTitle className="text-2xl font-bold text-white">Gummi Gúrú — Voice Clone</CardTitle>
          <CardDescription className="text-zinc-400">
            Record your voice to create your personal AI agent voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Script */}
          <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Read this script aloud:</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{SCRIPT}</p>
          </div>

          {/* Tips */}
          <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
            <div className="bg-zinc-800 rounded-lg p-2 text-center">🔇 Quiet room</div>
            <div className="bg-zinc-800 rounded-lg p-2 text-center">🎯 Aim for 90s+</div>
            <div className="bg-zinc-800 rounded-lg p-2 text-center">💬 Speak naturally</div>
          </div>

          {/* State: idle */}
          {state === 'idle' && (
            <Button onClick={startRecording} size="lg" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 text-lg rounded-xl transition-all active:scale-95">
              ⏺ Start Recording
            </Button>
          )}

          {/* State: recording */}
          {state === 'recording' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-mono text-2xl font-bold">{fmt(duration)}</span>
                <Badge variant="destructive" className="animate-pulse">RECORDING</Badge>
              </div>
              {duration < 60 && (
                <p className="text-center text-xs text-zinc-500">Keep going — aim for at least 90 seconds</p>
              )}
              {duration >= 60 && (
                <p className="text-center text-xs text-green-400">✓ Good length — you can stop now or keep going</p>
              )}
              <Button onClick={stopRecording} size="lg" variant="outline" className="w-full border-zinc-600 text-white hover:bg-zinc-800 font-bold py-4 text-lg rounded-xl">
                ⏹ Stop Recording
              </Button>
            </div>
          )}

          {/* State: recorded */}
          {state === 'recorded' && audioUrl && (
            <div className="space-y-4">
              <div className="bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                <p className="text-xs text-zinc-400 mb-2">Preview your recording:</p>
                <audio src={audioUrl} controls className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={reset} variant="outline" className="border-zinc-600 text-white hover:bg-zinc-800">
                  🔄 Record Again
                </Button>
                <Button onClick={uploadVoice} className="bg-green-600 hover:bg-green-500 text-white font-bold">
                  🚀 Upload & Clone Voice
                </Button>
              </div>
            </div>
          )}

          {/* State: uploading */}
          {state === 'uploading' && (
            <div className="space-y-3">
              <p className="text-center text-zinc-300">Uploading to xAI Custom Voices...</p>
              <Progress value={uploadProgress} className="h-3" />
              <p className="text-center text-xs text-zinc-500">{uploadProgress}% — this takes a few seconds</p>
            </div>
          )}

          {/* State: done */}
          {state === 'done' && voiceId && (
            <div className="space-y-4">
              <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-green-400 font-bold text-lg">Voice Clone Created!</p>
                <p className="text-zinc-400 text-sm mt-1">Your voice ID has been saved to the agent</p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                <p className="text-xs text-zinc-400 mb-1">Voice ID (saved automatically):</p>
                <code className="text-green-400 text-sm font-mono break-all">{voiceId}</code>
              </div>
              <p className="text-center text-xs text-zinc-500">
                Your xAI voice agent will now use your cloned voice on every call.
              </p>
            </div>
          )}

          {/* State: error */}
          {state === 'error' && (
            <div className="space-y-3">
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-center">
                <p className="text-red-400 font-bold">Error</p>
                <p className="text-zinc-400 text-sm mt-1">{errorMsg}</p>
              </div>
              <Button onClick={reset} variant="outline" className="w-full border-zinc-600 text-white hover:bg-zinc-800">
                Try Again
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
