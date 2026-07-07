import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'wouter';

// ─── Icelandic copy ────────────────────────────────────────────────────────────
const IS = {
  nav_back: '← Til baka',
  hero_tag: 'PERSÓNULEGUR AÐSTOÐARMAÐUR',
  hero_name: 'Hæ, ég er Gummi',
  hero_sub: 'Þinn persónulegi AI aðstoðarmaður. Alltaf til taks. Talar íslensku.',
  hero_domain: 'þinn.guru',
  hero_domain_label: 'Þitt eigið lén',
  cta_talk: 'Tala við Gumma',
  cta_stop: 'Loka tengingu',
  cta_demo: 'Sjá sýnikennslu',
  status_idle: 'Smelltu til að tala við Gumma',
  status_connecting: 'Tengist...',
  status_listening: 'Hlustandi...',
  status_speaking: 'Gummi talar...',
  status_error: 'Villa — reyndu aftur',
  transcript_placeholder: 'Samtalið birtist hér...',
  tools_title: 'Hvað getur Gummi gert?',
  tools_sub: 'Gummi þekkir Ísland. Spurðu hann um hvað sem er.',
  tool1_title: 'Finna veitingastað',
  tool1_desc: 'Segðu Gumma hvenær þú ert að fara út, hve margir eru í hópnum og hvers konar matur þér líður best á — hann finnur bestu valkostina.',
  tool1_example: '"Gummi, við erum fjórir í kvöld, gott íslenskt mat, miðlungs verð"',
  tool2_title: 'Finna iðnaðarmann',
  tool2_desc: 'Þarftu pípulagningamann, rafvirka eða málara? Gummi finnur laust fólk sem passar við þína þörf og dagsetning.',
  tool2_example: '"Gummi, þarf pípulagningamann á morgun, brot á lögn í eldhúsi"',
  tool3_title: 'Bera saman verð',
  tool3_desc: 'Gummi leitar að bestu verðum á vörum og þjónustu á Íslandi og gefur þér skýra samanburð.',
  tool3_example: '"Gummi, hvað kostar þvottavél, þarf að passa í lítið eldhús"',
  tool4_title: 'Minnismiðar og tímar',
  tool4_desc: 'Segjum Gumma hvað þú þarft að muna og hvenær — hann sér til þess að þú gleymist ekki.',
  tool4_example: '"Gummi, mintu mig á tannlæknastímann þriðjudaginn kl. 14"',
  how_title: 'Hvernig virkar þetta?',
  how1_title: 'Þú færð þitt eigið lén',
  how1_desc: 'Við skráum þitt persónulega lén — t.d. jon.guru eða sigga.guru. Þar er Gummi þinn alltaf til taks.',
  how2_title: 'Talaðu við Gumma hvenær sem er',
  how2_desc: 'Gummi er vakandi allan sólarhringinn. Hringdu eða sendu skilaboð — hann svarar strax á íslensku.',
  how3_title: 'Gummi framkvæmir verkefnið',
  how3_desc: 'Gummi notar gagnasöfn og tengingar til að framkvæma verkefnið — finnur staðinn, bókar tímann, ber saman verðin.',
  how4_title: 'Þú færð niðurstöðuna',
  how4_desc: 'Gummi skilar þér bestu valkostunum. Þú velur — hann framkvæmir.',
  pricing_title: 'Verð',
  pricing_sub: 'Einfalt. Gegnsætt. Íslenskt.',
  plan1_name: 'Grunnur',
  plan1_price: '4.900 kr',
  plan1_per: 'á mánuði',
  plan1_features: ['Persónulegt lén (t.d. þitt.guru)', 'Gummi talar íslensku', '4 verkfæri', 'Tölvupóstur og spjall'],
  plan2_name: 'Vöxtur',
  plan2_price: '9.900 kr',
  plan2_per: 'á mánuði',
  plan2_features: ['Allt í Grunni', 'Raddviðmót (talaðu við Gumma)', 'Óendanlegar beiðnir', 'WhatsApp og Telegram', 'Forgangur'],
  plan3_name: 'Sérsniðið',
  plan3_price: 'Hafðu samband',
  plan3_per: '',
  plan3_features: ['Sérsniðinn Gummi fyrir fyrirtæki', 'Eigin verkfæri og tengingar', 'Sérsniðin þjálfun', 'Þjónustuver'],
  footer_tag: 'Knúinn af Giggo · Gert á Íslandi',
};

// ─── Tool card data ────────────────────────────────────────────────────────────
const TOOLS = [
  { icon: '🍽️', title: IS.tool1_title, desc: IS.tool1_desc, example: IS.tool1_example, color: 'from-orange-500/20 to-orange-600/5' },
  { icon: '🔧', title: IS.tool2_title, desc: IS.tool2_desc, example: IS.tool2_example, color: 'from-blue-500/20 to-blue-600/5' },
  { icon: '💰', title: IS.tool3_title, desc: IS.tool3_desc, example: IS.tool3_example, color: 'from-green-500/20 to-green-600/5' },
  { icon: '📅', title: IS.tool4_title, desc: IS.tool4_desc, example: IS.tool4_example, color: 'from-purple-500/20 to-purple-600/5' },
];

// ─── How it works steps ────────────────────────────────────────────────────────
const HOW_STEPS = [
  { num: '01', title: IS.how1_title, desc: IS.how1_desc },
  { num: '02', title: IS.how2_title, desc: IS.how2_desc },
  { num: '03', title: IS.how3_title, desc: IS.how3_desc },
  { num: '04', title: IS.how4_title, desc: IS.how4_desc },
];

// ─── Pricing plans ────────────────────────────────────────────────────────────
const PLANS = [
  { name: IS.plan1_name, price: IS.plan1_price, per: IS.plan1_per, features: IS.plan1_features, highlight: false },
  { name: IS.plan2_name, price: IS.plan2_price, per: IS.plan2_per, features: IS.plan2_features, highlight: true },
  { name: IS.plan3_name, price: IS.plan3_price, per: IS.plan3_per, features: IS.plan3_features, highlight: false },
];

// ─── Voice state ──────────────────────────────────────────────────────────────
type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface TranscriptLine {
  role: 'user' | 'agent';
  text: string;
  ts: number;
}

// ─── Waveform bars ────────────────────────────────────────────────────────────
function Waveform({ active, speaking }: { active: boolean; speaking: boolean }) {
  const bars = 24;
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all ${
            speaking
              ? 'bg-purple-400'
              : active
              ? 'bg-purple-300'
              : 'bg-white/20'
          }`}
          style={{
            height: active
              ? `${Math.max(8, Math.sin((i / bars) * Math.PI * 2 + Date.now() / 200) * 20 + 24)}px`
              : '8px',
            animationDelay: `${i * 40}ms`,
            animation: active ? `wave-${i % 4} 0.8s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ─── Voice widget ─────────────────────────────────────────────────────────────
function VoiceWidget() {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [agentText, setAgentText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, agentText]);

  const disconnect = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('idle');
  }, []);

  const connect = useCallback(async () => {
    if (status !== 'idle') { disconnect(); return; }
    setStatus('connecting');

    try {
      // Get proxy URL from server
      const res = await fetch('/api/voice-session-token');
      const { wsUrl } = await res.json();

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Audio context for mic capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        }
        const base64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(int16.buffer))));
        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 }));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      let agentBuffer = '';

      ws.onopen = () => {
        setStatus('listening');
        // Send Icelandic session update
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: `Þú heitir Gummi og ert persónulegur aðstoðarmaður viðskiptavinarins hjá Gummi Gúrú.
Þú talar ALLTAF íslensku nema viðskiptavinurinn byrji að tala annað tungumál.
Heilsaðu alltaf svona: "Hæ! Hér er Gummi. Hvernig get ég aðstoðað þig í dag?"
Þegar viðskiptavinurinn biður um veitingastað: notaðu gg_find_restaurant
Þegar viðskiptavinurinn þarf iðnaðarmann: notaðu gg_find_tradesperson
Þegar viðskiptavinurinn vill bera saman verð: notaðu gg_compare_prices
Þegar viðskiptavinurinn vill minnismiða: notaðu gg_book_reminder
Vertu hlýr, skilvirkur og faglegur. Talaðu náttúrulega eins og vinur sem er líka sérfræðingur.`,
            voice: 'ash',
            turn_detection: { type: 'server_vad', silence_duration_ms: 800 },
          },
        }));
      };

      ws.onmessage = (raw) => {
        try {
          const event = JSON.parse(raw.data);
          if (event.type === 'response.output_audio_transcript.delta') {
            agentBuffer += event.delta ?? '';
            setAgentText(agentBuffer);
            setStatus('speaking');
          } else if (event.type === 'response.output_audio_transcript.done') {
            if (agentBuffer.trim()) {
              setTranscript(prev => [...prev, { role: 'agent', text: agentBuffer.trim(), ts: Date.now() }]);
            }
            agentBuffer = '';
            setAgentText('');
            setStatus('listening');
          } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
            const text = event.transcript?.trim();
            if (text) setTranscript(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
          } else if (event.type === 'error') {
            console.error('xAI error:', event.error);
            setStatus('error');
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => setStatus('error');
      ws.onclose = () => { if (status !== 'idle') setStatus('idle'); };

    } catch (err) {
      console.error('Voice connect error:', err);
      setStatus('error');
      disconnect();
    }
  }, [status, disconnect]);

  const statusLabel = {
    idle: IS.status_idle,
    connecting: IS.status_connecting,
    listening: IS.status_listening,
    speaking: IS.status_speaking,
    error: IS.status_error,
  }[status];

  const isActive = status === 'listening' || status === 'speaking';

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 flex flex-col gap-6 w-full max-w-xl mx-auto">
      {/* Agent ID badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : status === 'error' ? 'bg-red-400' : 'bg-white/30'}`} />
          <span className="text-xs text-white/40 font-mono">agent_fgrublDXzNDfu5MT</span>
        </div>
        <span className="text-xs text-white/30">Gummi Gúrú · Demo</span>
      </div>

      {/* Gummi avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center text-5xl transition-all duration-300 ${
          isActive ? 'ring-4 ring-purple-500/50 ring-offset-2 ring-offset-black' : 'ring-2 ring-white/10'
        }`} style={{ background: 'radial-gradient(circle at 40% 35%, #7c3aed, #1e1b4b)' }}>
          🤖
          {status === 'speaking' && (
            <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full w-6 h-6 flex items-center justify-center text-xs">🔊</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-white font-semibold text-lg">Gummi</div>
          <div className="text-white/40 text-sm">{statusLabel}</div>
        </div>
      </div>

      {/* Waveform */}
      <Waveform active={isActive} speaking={status === 'speaking'} />

      {/* Transcript */}
      <div className="bg-black/40 rounded-2xl p-4 h-48 overflow-y-auto flex flex-col gap-2 text-sm">
        {transcript.length === 0 && !agentText && (
          <div className="text-white/20 text-center mt-auto mb-auto">{IS.transcript_placeholder}</div>
        )}
        {transcript.map((line, i) => (
          <div key={i} className={`flex gap-2 ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              line.role === 'user'
                ? 'bg-purple-600/80 text-white rounded-br-sm'
                : 'bg-white/10 text-white/80 rounded-bl-sm'
            }`}>
              {line.text}
            </div>
          </div>
        ))}
        {agentText && (
          <div className="flex gap-2 justify-start">
            <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm bg-white/10 text-white/80 text-sm">
              {agentText}<span className="animate-pulse">▊</span>
            </div>
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Connect button */}
      <button
        onClick={connect}
        disabled={status === 'connecting'}
        className={`w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 active:scale-[0.97] ${
          isActive
            ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
            : status === 'error'
            ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
            : status === 'connecting'
            ? 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-500 text-white'
        }`}
      >
        {isActive ? IS.cta_stop : status === 'connecting' ? IS.status_connecting : IS.cta_talk}
      </button>
    </div>
  );
}

// ─── Main demo page ────────────────────────────────────────────────────────────
export default function GummiDemo() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <Link href="/" className="text-white/50 hover:text-white text-sm transition-colors">
          {IS.nav_back}
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/40 font-mono">GUMMI GÚRÚ · SÝNIKENNSLA</span>
        </div>
        <div className="text-sm font-mono text-purple-400">{IS.hero_domain}</div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-600/5 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-mono tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            {IS.hero_tag}
          </div>

          {/* Name */}
          <h1 className="text-6xl sm:text-8xl font-black tracking-tight leading-none"
            style={{ background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {IS.hero_name}
          </h1>

          {/* Sub */}
          <p className="text-lg sm:text-xl text-white/60 max-w-xl leading-relaxed">
            {IS.hero_sub}
          </p>

          {/* Domain badge */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-2xl">🌐</div>
            <div>
              <div className="text-white font-mono font-bold text-lg">{IS.hero_domain}</div>
              <div className="text-white/40 text-xs">{IS.hero_domain_label}</div>
            </div>
          </div>

          {/* Voice widget */}
          <div className="w-full mt-4">
            <VoiceWidget />
          </div>
        </div>
      </section>

      {/* Tools section */}
      <section className="py-24 px-6 bg-white text-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">{IS.tools_title}</h2>
            <p className="text-black/50 text-lg">{IS.tools_sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TOOLS.map((tool, i) => (
              <div key={i} className={`rounded-3xl p-8 bg-gradient-to-br ${tool.color} border border-black/5 flex flex-col gap-4`}>
                <div className="text-4xl">{tool.icon}</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{tool.title}</h3>
                  <p className="text-black/60 text-sm leading-relaxed">{tool.desc}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-black/10">
                  <p className="text-xs text-black/40 italic">{tool.example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-[#050505]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-16">{IS.how_title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className="flex gap-5">
                <div className="text-5xl font-black text-white/10 leading-none w-14 shrink-0">{step.num}</div>
                <div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-white text-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">{IS.pricing_title}</h2>
            <p className="text-black/50 text-lg">{IS.pricing_sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <div key={i} className={`rounded-3xl p-8 flex flex-col gap-4 ${
                plan.highlight
                  ? 'bg-black text-white ring-2 ring-purple-500 scale-105'
                  : 'bg-black/5 border border-black/10'
              }`}>
                <div>
                  <div className={`text-xs font-mono tracking-widest mb-2 ${plan.highlight ? 'text-purple-400' : 'text-black/40'}`}>
                    {plan.name.toUpperCase()}
                  </div>
                  <div className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-black'}`}>{plan.price}</div>
                  {plan.per && <div className={`text-sm ${plan.highlight ? 'text-white/50' : 'text-black/40'}`}>{plan.per}</div>}
                </div>
                <ul className="flex flex-col gap-2 mt-2">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`flex items-start gap-2 text-sm ${plan.highlight ? 'text-white/70' : 'text-black/60'}`}>
                      <span className={plan.highlight ? 'text-purple-400' : 'text-black/40'}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`mt-auto py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] ${
                  plan.highlight
                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                    : 'bg-black/10 hover:bg-black/20 text-black'
                }`}>
                  {plan.price === 'Hafðu samband' ? 'Hafðu samband' : 'Byrja núna'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#050505] border-t border-white/5 text-center">
        <div className="text-white/20 text-sm font-mono">{IS.footer_tag}</div>
      </footer>
    </div>
  );
}
