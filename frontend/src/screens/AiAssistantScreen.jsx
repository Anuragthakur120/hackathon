import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { api } from '../api/index.js';
import { normalizeLangCode } from '../i18n/index.js';
import { useLiveSpeech } from '../voice/useLiveSpeech.js';
import { speakReply, stopAllSpeech } from '../voice/speechOutput.js';
import {
  SPEECH_LANGUAGES,
  getLangById,
  langDisplayName,
  uiLangToSpeechId,
  detectLangFromText,
  isHinglish,
} from '../voice/languages.js';
import { VOICE_COMMAND, matchVoiceCommand } from '../voice/commands.js';
import { PageHeader } from '../components/PageHeader.jsx';

const PRIMARY_CATEGORIES = [
  {
    id: 'scholarship',
    icon: '🎓',
    label: 'Scholarship',
    prompts: [
      { label: '🎓 MahaDBT Scholarship अर्ज भरायचा आहे', text: 'MahaDBT scholarship form bharna hai' },
      { label: '🎓 Post-Matric Scholarship eligibility & documents', text: 'Post-Matric scholarship eligibility and documents' },
      { label: '🎓 College Verification Desk inquiry', text: 'How does college verification desk approve scholarship?' },
    ],
  },
  {
    id: 'income_certificate',
    icon: '📜',
    label: 'Income Certificate',
    prompts: [
      { label: '📜 उत्पन्नाचा दाखला कसा काढायचा?', text: 'उत्पन्नाचा दाखला कसा काढायचा? (Income certificate)' },
      { label: '📜 Documents for Tahsildar Income Cert', text: 'What documents are required for Income Certificate?' },
      { label: '📜 Income Certificate Validity & Talathi verification', text: 'Income certificate validity and Talathi report process' },
    ],
  },
  {
    id: 'ration_card',
    icon: '🌾',
    label: 'Ration Card',
    prompts: [
      { label: '🌾 रेशन कार्ड मध्ये नाव कसे वाढवायचे?', text: 'Ration card me naya naam kaise jodein?' },
      { label: '🌾 NFSA Subsidized Ration quota check', text: 'Check subsidized ration quota eligibility' },
      { label: '🌾 Transfer Ration Card to new Fair Price Shop', text: 'How to transfer ration card to new Fair Price Shop?' },
    ],
  },
  {
    id: 'aadhaar_services',
    icon: '🆔',
    label: 'Aadhaar Services',
    prompts: [
      { label: '🆔 आधार मध्ये मोबाईल नंबर कसा बदलायचा?', text: 'How to update mobile number in Aadhaar card?' },
      { label: '🆔 Aadhaar & Bank seeding status (DBT)', text: 'Aadhaar bank seeding status check kaise karein?' },
      { label: '🆔 Scan ID card photo into Profile Vault', text: 'How to scan Aadhaar card photo to verify citizen profile?' },
    ],
  },
  {
    id: 'tracking',
    icon: '⏱️',
    label: 'Application Status',
    prompts: [
      { label: '⏱️ Check my submitted application status', text: 'Check status of my submitted application' },
      { label: '⏱️ Physical verification timeline (7-14 days)', text: 'How many days will physical verification take?' },
    ],
  },
  {
    id: 'welfare_support',
    icon: '🤝',
    label: 'Social Welfare & Pension',
    prompts: [
      { label: '👵 Indira Gandhi Old Age Pension Scheme', text: 'Indira Gandhi Old Age Pension Scheme kaise apply karein?' },
      { label: '👵 Jeevan Pramaan Digital Life Certificate', text: 'How to submit Jeevan Pramaan digital life certificate?' },
    ],
  },
];

const SPEECH_LANG_KEY = 'nagarsathi_speech_lang';
const READ_MY_MESSAGE_KEY = 'nagarsathi_read_my_message';
const NORMAL_RATE = 0.85;
const SLOW_RATE = 0.65;

/** A spoken command only counts when the whole utterance is short, so "I need help with scholarship" is a question, not "Madad". */
function matchSpokenCommand(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return null;
  return matchVoiceCommand(text);
}

function readStored(key, fallback) {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function AiAssistantScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useApp();
  const uiLangCode = normalizeLangCode(language);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [input, setInput] = useState('');
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechLangId, setSpeechLangId] = useState(() => {
    const saved = readStored(SPEECH_LANG_KEY, '');
    return SPEECH_LANGUAGES.some((l) => l.id === saved) ? saved : uiLangToSpeechId(language);
  });
  const [detectedLang, setDetectedLang] = useState(null);
  const [readMyMessage, setReadMyMessage] = useState(() => readStored(READ_MY_MESSAGE_KEY, 'false') === 'true');
  const [voiceNotice, setVoiceNotice] = useState('');
  const [ttsEngine, setTtsEngine] = useState(null);
  const messagesEndRef = useRef(null);
  const lastProcessedPromptRef = useRef(null);
  const greetingPlayedRef = useRef(false);
  const rateRef = useRef(NORMAL_RATE);
  const readMyMessageRef = useRef(readMyMessage);
  readMyMessageRef.current = readMyMessage;

  const speechLang = getLangById(speechLangId);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'AGENT',
      display:
        language === 'hi-IN'
          ? 'नमस्ते! मैं आपका नगरसाथी एआई सहायक हूँ। आप छात्रवृत्ति (Scholarship), आय प्रमाण पत्र (Income Certificate), राशन कार्ड या अन्य योजनाओं के बारे में बोलकर या लिखकर पूछ सकते हैं।'
          : language === 'mr-IN'
            ? 'नमस्कार! मी तुमचा नगरसाथी एआय सहाय्यक आहे. तुम्ही शिष्यवृत्ती, उत्पन्नाचा दाखला, रेशन कार्ड किंवा इतर सरकारी योजनांबद्दल बोलून किंवा लिहून विचारू शकता.'
            : 'Namaste! I am your NagarSathi AI Citizen Assistant. Ask about Scholarship, Income Certificate, Ration Card, or check application tracking in your preferred language.',
      speech:
        language === 'hi-IN'
          ? 'नमस्ते! मैं आपका नगरसाथी एआई सहायक हूँ।'
          : language === 'mr-IN'
            ? 'नमस्कार! मी तुमचा नगरसाथी एआय सहाय्यक आहे.'
            : 'Namaste! I am your NagarSathi AI assistant.',
      lang: uiLangCode,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  /* ---------------------------------------------------------------- voice input */

  // Callbacks are re-read from refs inside the hook on every render, so they never go stale.
  const speech = useLiveSpeech({
    langCode: speechLang.code,
    silenceMs: 1500,
    onText: (text) => setInput(text), // live typing: interim + final text go straight into the input box
    onSilence: (text, meta) => handleVoiceFinal(text, meta?.detectedLang),
    onError: (message) => setVoiceNotice(message),
    onDetectedLang: (code) => setDetectedLang(code),
  });

  const isListening = speech.status === 'listening';

  const uiState = isSpeaking
    ? 'speaking'
    : loading
      ? 'thinking'
      : speech.status === 'transcribing'
        ? 'transcribing'
        : isListening
          ? 'listening'
          : 'idle';

  /* --------------------------------------------------------------- voice output */

  const haltSpeech = (resumeMic = false) => {
    stopAllSpeech();
    setIsSpeaking(false);
    setPlayingMsgId(null);
    if (resumeMic) speech.resume();
  };

  // Speaks `text` in `lang`. The mic must already be paused by the caller (echo guard); `onDone` resumes it.
  const speakGuarded = (text, lang, rate, msgId, onDone) => {
    setPlayingMsgId(msgId);
    speakReply(text, {
      lang,
      rate,
      onStart: () => setIsSpeaking(true),
      onEngine: (engine) => {
        setTtsEngine(engine);
        if (engine === 'text') {
          setVoiceNotice(
            `No voice is available for ${langDisplayName(lang)} in this browser or on the server, so the reply is shown as text only.`
          );
        }
      },
      onEnd: () => {
        setIsSpeaking(false);
        setPlayingMsgId(null);
        if (typeof onDone === 'function') onDone();
      },
    });
  };

  const lastAgentMessage = () => [...messagesRef.current].reverse().find((m) => m.sender === 'AGENT');

  const replayLast = (rate) => {
    const last = lastAgentMessage();
    if (!last) return;
    rateRef.current = rate;
    const wasMicOn = speech.pause();
    haltSpeech(false);
    speakGuarded(
      last.speech || last.display,
      last.lang || uiLangCode,
      rate,
      last.id,
      wasMicOn ? () => speech.resume() : undefined
    );
  };

  const handleVoiceCommand = (cmd) => {
    console.log('[NagarSathi voice] command:', cmd);
    if (cmd === VOICE_COMMAND.STOP) {
      haltSpeech(false);
      speech.stop();
      return;
    }
    if (cmd === VOICE_COMMAND.REPEAT) {
      replayLast(rateRef.current);
      return;
    }
    if (cmd === VOICE_COMMAND.SLOWER) {
      replayLast(SLOW_RATE);
      return;
    }
    if (cmd === VOICE_COMMAND.HELP) {
      haltSpeech(false);
      speech.stop();
      navigate('/help');
      return;
    }
    if (cmd === VOICE_COMMAND.YES) {
      const target = lastAgentMessage()?.data?.action?.to;
      if (target) {
        haltSpeech(false);
        speech.stop();
        navigate(target);
        return;
      }
    }
    // NO (or YES without a target): stop talking and start a fresh listening turn.
    haltSpeech(false);
    if (speech.pause()) speech.resume();
  };

  const handleVoiceFinal = (text, dl) => {
    const cmd = matchSpokenCommand(text);
    if (cmd) {
      setInput('');
      handleVoiceCommand(cmd);
      return;
    }
    handleSend(text, { detectedLang: dl });
  };

  /* --------------------------------------------------------------------- send */

  const handleSend = async (customText, opts = {}) => {
    const textToSend = (customText !== undefined ? customText : input).trim();
    if (!textToSend) return;

    // Echo guard + stop any speech that is still playing.
    const wasMicOn = speech.pause();
    haltSpeech(false);
    const resumeMic = wasMicOn ? () => speech.resume() : undefined;

    setInput('');
    setVoiceNotice('');

    // Language the citizen used: Whisper / selected language for speech, script detection for typed text.
    const hint = speechLang.code || (/^(hi|mr)/.test(uiLangCode) ? uiLangCode : null);
    let dl = opts.detectedLang || detectLangFromText(textToSend, hint);
    if (dl === 'en-IN' && isHinglish(textToSend)) dl = 'hi-IN';
    const hinglish = isHinglish(textToSend);
    setDetectedLang(dl);

    // The message appears in the bubble exactly as spoken / typed (native script untouched).
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'CITIZEN',
      display: textToSend,
      speech: textToSend,
      lang: dl,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (readMyMessageRef.current) {
      const reading = speakReply(textToSend, {
        lang: dl,
        rate: rateRef.current,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
      await reading.done;
      setIsSpeaking(false);
    }

    setLoading(true);
    try {
      let res;
      if (api.sendAssistantMessage) {
        res = await api.sendAssistantMessage({
          message: textToSend,
          language,
          detectedLang: dl,
          hinglish,
        });
      } else if (api.createCaseFromTranscript) {
        res = await api.createCaseFromTranscript({ transcript: textToSend, language });
      }

      const agentReplyText = res?.data?.reply || res?.display || 'I have noted your request.';
      const replySpeech = res?.speech || agentReplyText;
      const replyLang = res?.data?.replyLang || dl;
      const agentMsgId = `agent-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: agentMsgId,
          sender: 'AGENT',
          display: agentReplyText,
          speech: replySpeech,
          lang: replyLang,
          data: res?.data || {},
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // Auto-read every reply in its own language at rate 0.85 (queued sentence by sentence).
      speakGuarded(replySpeech, replyLang, rateRef.current, agentMsgId, resumeMic);
    } catch (err) {
      console.error('AI chat error:', err);
      setVoiceNotice(`The assistant could not answer: ${err.message || 'unknown error'}. Please try again.`);
      if (resumeMic) resumeMic();
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------- effects */

  // Clean up audio on unmount (the speech hook releases the microphone itself).
  useEffect(() => {
    return () => {
      stopAllSpeech();
    };
  }, []);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Auto-play assistant greeting and auto-start the mic when navigated with autoStartMic / greeting
  useEffect(() => {
    const isAutoMic = location.state?.autoStartMic;
    const shouldGreet = location.state?.greeting;
    const incomingPrompt = location.state?.initialPrompt || new URLSearchParams(location.search).get('prompt');

    if (shouldGreet && !incomingPrompt && !greetingPlayedRef.current) {
      greetingPlayedRef.current = true;
      const greetingAudio =
        language === 'hi-IN'
          ? 'नमस्ते! बताइए, मैं आपकी क्या मदद कर सकता हूँ? आप छात्रवृत्ति, आय प्रमाण पत्र, राशन कार्ड या किसी भी योजना के बारे में पूछ सकते हैं।'
          : language === 'mr-IN'
            ? 'नमस्कार! सांगा, मी आपली काय मदत करू शकतो? आपण शिष्यवृत्ती, उत्पन्नाचा दाखला, रेशन कार्ड किंवा इतर कोणत्याही योजनेबद्दल विचारू शकता.'
            : 'Namaste! How can I help you today? Ask about Scholarship, Income Certificate, Ration Card, or any government scheme.';

      speakGuarded(greetingAudio, uiLangCode, NORMAL_RATE, 'welcome', () => {
        if (isAutoMic) speech.start();
      });
    } else if (isAutoMic && !incomingPrompt) {
      speech.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically handle preset prompts clicked from FloatingAssistant or navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const incomingPrompt = location.state?.initialPrompt || searchParams.get('prompt');
    const promptId = `${incomingPrompt}_${location.state?.timestamp || searchParams.get('prompt') || ''}`;
    if (incomingPrompt && lastProcessedPromptRef.current !== promptId) {
      lastProcessedPromptRef.current = promptId;
      handleSend(incomingPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  /* ------------------------------------------------------------------ handlers */

  const handleMicToggle = () => {
    haltSpeech(false); // the user takes the floor
    if (speech.status !== 'idle') {
      speech.stop();
      return;
    }
    setVoiceNotice('');
    setInput('');
    if (!speech.supported) {
      setVoiceNotice('This browser cannot record audio. Please type your message instead.');
      return;
    }
    speech.start();
  };

  const handleSpeechLangChange = (id) => {
    speech.stop();
    setSpeechLangId(id);
    writeStored(SPEECH_LANG_KEY, id);
    setVoiceNotice('');
    if (id !== 'auto') setDetectedLang(getLangById(id).code);
  };

  const handleReadMyMessageToggle = (checked) => {
    setReadMyMessage(checked);
    writeStored(READ_MY_MESSAGE_KEY, String(checked));
  };

  const handleListenMessage = (msg) => {
    if (playingMsgId === msg.id) {
      haltSpeech(true);
      return;
    }
    const wasMicOn = speech.pause();
    haltSpeech(false);
    speakGuarded(
      msg.speech || msg.display,
      msg.lang || detectLangFromText(msg.display, uiLangCode),
      rateRef.current,
      msg.id,
      wasMicOn ? () => speech.resume() : undefined
    );
  };

  const handleConfirmExtractedForm = async (formData) => {
    try {
      if (api.patchProfile) {
        await api.patchProfile({
          name: formData.fullName || 'Ramabai Kulkarni',
          saveProfile: true,
          language,
        });
      }
      setSaveSuccessMsg(`Details saved successfully: ${formData.fullName || ''} (${formData.state || ''})`);
      const ackMsgId = `agent-saved-${Date.now()}`;
      const ackMsg = {
        id: ackMsgId,
        sender: 'AGENT',
        display: `✅ Details have been successfully verified and saved to your citizen profile.`,
        speech: 'Your profile details have been updated.',
        lang: 'en-IN',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, ackMsg]);
      const wasMicOn = speech.pause();
      speakGuarded(ackMsg.speech, 'en-IN', NORMAL_RATE, ackMsgId, wasMicOn ? () => speech.resume() : undefined);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error saving extracted form:', err);
      setVoiceNotice(`Could not save details: ${err.message || 'unknown error'}`);
    }
  };


  const activeCategoryObj = PRIMARY_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 space-y-4" data-testid="ai-assistant-screen">
      {/* Header */}
      <PageHeader
        title="NagarSathi Multilingual AI Assistant"
        subtitle="Speak or type your government scheme query in Marathi, Hindi, or English. Listen to voice responses and apply with automated form assistance."
        badge="Multilingual AI"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'AI Voice Assistant' },
        ]}
      />

      {/* Main Chat Shell */}
      <div className="flex flex-col h-[700px] rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Voice State Indicator, language chip, language selector & Voice Commands Bar */}
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-900 px-4 py-2 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              {uiState === 'speaking' ? (
                <span
                  data-testid="assistant-state-speaking"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-bold"
                >
                  <span className="animate-bounce text-xs">🔊</span>
                  <span>Speaking</span>
                </span>
              ) : uiState === 'thinking' ? (
                <span
                  data-testid="assistant-state-thinking"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 text-xs font-bold"
                >
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Thinking...</span>
                </span>
              ) : uiState === 'transcribing' ? (
                <span
                  data-testid="assistant-state-transcribing"
                  className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 px-2.5 py-0.5 text-xs font-bold"
                >
                  <span className="animate-pulse text-xs">📝</span>
                  <span>Transcribing...</span>
                </span>
              ) : uiState === 'listening' ? (
                <span
                  data-testid="assistant-state-listening"
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 px-2.5 py-0.5 text-xs font-bold animate-pulse"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Listening...</span>
                </span>
              ) : (
                <span
                  data-testid="assistant-state-idle"
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 text-xs font-medium"
                >
                  <span>⚪</span>
                  <span>Idle / Ready</span>
                </span>
              )}

              <span
                data-testid="assistant-detected-lang"
                className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 px-2.5 py-0.5 text-xs font-semibold"
              >
                🌐 Detected: {detectedLang ? langDisplayName(detectedLang) : '—'}
              </span>
              {speech.engine ? (
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                  Mic: {speech.engine === 'cloud' ? 'cloud STT' : 'browser'}
                </span>
              ) : null}
              {ttsEngine ? (
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                  Voice: {ttsEngine === 'browser' ? 'browser' : ttsEngine === 'cloud' ? 'cloud TTS' : 'text only'}
                </span>
              ) : null}
              {isSpeaking ? (
                <button
                  type="button"
                  data-testid="assistant-stop-speaking-btn"
                  onClick={() => haltSpeech(true)}
                  className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                >
                  ⏹ Stop
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-200">
              <label className="flex items-center gap-1.5 font-semibold">
                <span className="text-slate-400">Speak in:</span>
                <select
                  data-testid="assistant-speech-lang-select"
                  value={speechLangId}
                  onChange={(e) => handleSpeechLangChange(e.target.value)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {SPEECH_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="assistant-read-my-message-toggle"
                  checked={readMyMessage}
                  onChange={(e) => handleReadMyMessageToggle(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-500"
                />
                <span>Also read my message aloud</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-300">
            <span className="text-slate-400 font-semibold mr-1">Voice Commands:</span>
            <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono">Haan</span>
            <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono">Nahi</span>
            <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono">Dobara bolo</span>
            <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono">Dheere bolo</span>
            <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono">Ruko</span>
            <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono">Madad</span>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="border-b border-slate-200 bg-slate-50/70 p-3 sm:px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Service Domain:
            </span>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Clear Selection ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PRIMARY_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Prompts for Selected Category */}
          {activeCategoryObj && (
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center">
                Suggested {activeCategoryObj.label} Queries:
              </span>
              {activeCategoryObj.prompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSend(p.text)}
                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50/30 to-white">
          {saveSuccessMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 animate-in fade-in">
              ✓ {saveSuccessMsg}
            </div>
          )}

          {messages.map((m) => {
            const isCitizen = m.sender === 'CITIZEN';
            const extractedForm = m.data?.extractedForm;
            const actionTarget = m.data?.action?.to;
            const nextStep = m.data?.nextStep;
            const suggestedActions = m.data?.suggestedActions || [];
            const isCurrentlySpeaking = playingMsgId === m.id;

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isCitizen ? 'justify-end' : 'justify-start'}`}
              >
                {!isCitizen && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white text-sm shadow-xs">
                    🏛️
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs ${
                    isCitizen
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'border border-slate-200 bg-white text-slate-900 rounded-bl-xs'
                  }`}
                >
                  <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {m.display}
                  </p>

                  {/* AI Form Extraction Preview & Confirmation */}
                  {extractedForm && (extractedForm.fullName || extractedForm.state) && (
                    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                        <span className="flex items-center gap-1.5">
                          <span>📋</span>
                          <span>Details Detected from Conversation</span>
                        </span>
                        <span className="rounded-md bg-indigo-200 px-1.5 py-0.5 text-[10px] font-mono">
                          Auto-Detected
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {extractedForm.fullName && (
                          <div className="rounded-lg bg-white p-2.5 border border-indigo-100 shadow-2xs">
                            <span className="text-[10px] text-slate-400 block font-semibold">Citizen Name:</span>
                            <strong className="text-slate-800 text-sm">{extractedForm.fullName}</strong>
                          </div>
                        )}
                        {extractedForm.state && (
                          <div className="rounded-lg bg-white p-2.5 border border-indigo-100 shadow-2xs">
                            <span className="text-[10px] text-slate-400 block font-semibold">State / Region:</span>
                            <strong className="text-slate-800 text-sm capitalize">{extractedForm.state}</strong>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          data-testid="confirm-voice-fields-btn"
                          onClick={() => handleConfirmExtractedForm(extractedForm)}
                          className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>✓</span>
                          <span>Confirm & Save to Profile</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSend('No, let me change the details')}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Link / Next Step */}
                  {(actionTarget || nextStep) && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-700">Next Action:</span>
                      <Link
                        to={actionTarget || (typeof nextStep === 'object' ? nextStep.to : '/schemes')}
                        className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 transition"
                      >
                        {typeof nextStep === 'object' ? nextStep.label : 'Proceed →'}
                      </Link>
                    </div>
                  )}

                  {/* Suggested Quick Question Chips */}
                  {suggestedActions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {suggestedActions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          onClick={() => handleSend(act.query || act.label)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-2 py-1 text-[10px] font-semibold text-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/30">
                    <span>{m.timestamp}</span>
                    {!isCitizen ? (
                      <button
                        type="button"
                        onClick={() => handleListenMessage(m)}
                        className={`flex items-center gap-1 transition cursor-pointer font-medium ${
                          isCurrentlySpeaking
                            ? 'text-indigo-600 font-bold animate-pulse'
                            : 'text-slate-500 hover:text-indigo-600'
                        }`}
                        title={isCurrentlySpeaking ? 'Stop Speaking' : 'Sunao (Listen)'}
                      >
                        <span>{isCurrentlySpeaking ? '🛑' : '🔊'}</span>
                        <span>{isCurrentlySpeaking ? 'Speaking... (Click to Stop)' : 'Sunao (Listen)'}</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                {isCitizen && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white text-sm shadow-xs">
                    👤
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white text-sm">
                🏛️
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500 flex items-center gap-2">
                <span className="animate-spin text-base">⏳</span>
                <span>NagarSathi Assistant is analyzing government rules & drafting response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          {voiceNotice && (
            <div
              data-testid="assistant-voice-notice"
              role="alert"
              className="mb-2 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              <span className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{voiceNotice}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setVoiceNotice('');
                  speech.clearError();
                }}
                className="text-slate-400 hover:text-slate-700 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {(isListening || uiState === 'transcribing') && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-950 shadow-xs">
              <div className="flex items-center gap-2 font-bold flex-1 truncate mr-2">
                <span className="inline-block h-3 w-3 rounded-full bg-rose-600 animate-ping shrink-0" />
                <span className="truncate">
                  {uiState === 'transcribing'
                    ? 'Transcribing your speech...'
                    : input
                      ? `Hearing: "${input}"`
                      : speech.engine === 'cloud'
                        ? 'Recording... speak now, it sends after a short pause'
                        : 'Microphone listening... Speak now in your language'}
                </span>
              </div>
              <button
                type="button"
                data-testid="assistant-done-speaking-btn"
                onClick={() => speech.finish()}
                disabled={uiState === 'transcribing'}
                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer shrink-0 shadow-xs disabled:opacity-50"
              >
                Done Speaking → Send ✓
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2.5"
          >
            {/* Prominent Mic Toggle Button */}
            <button
              type="button"
              onClick={handleMicToggle}
              data-testid="assistant-mic-toggle-btn"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-xs transition cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/20'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
              }`}
              title={
                isListening
                  ? 'Stop Listening'
                  : 'Tap to Speak (Voice Input)'
              }
            >
              {isListening ? '🛑' : '🎤'}
            </button>

            <input
              type="text"
              data-testid="assistant-text-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening live... Speak now in Marathi, Hindi, or English'
                  : 'Ask about Scholarship, Income Certificate, Ration Card, or say "Mera naam..."'
              }
              className="flex-1 min-h-[48px] rounded-2xl border border-slate-300 px-4 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              data-testid="assistant-send-btn"
              className="rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 transition cursor-pointer"
            >
              Send →
            </button>
          </form>

          {/* Quick Voice Prompt Shortcuts */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-500 pb-0.5">
            <span className="shrink-0 font-bold text-slate-600">Sample spoken queries:</span>
            <button
              type="button"
              onClick={() => handleSend('Apply for MahaDBT scholarship')}
              className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50/50 px-2 py-0.5 font-medium text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
            >
              🎓 Apply for Scholarship
            </button>
            <button
              type="button"
              onClick={() => handleSend('उत्पन्नाचा दाखला कसा काढायचा? (Income certificate)')}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer"
            >
              📜 Income Certificate
            </button>
            <button
              type="button"
              onClick={() => handleSend('Ration card me naya naam kaise jodein?')}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer"
            >
              🌾 Ration Card
            </button>
            <button
              type="button"
              onClick={() => handleSend('What is the status of my application?')}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer"
            >
              ⏱️ Application Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
