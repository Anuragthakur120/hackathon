import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  speak,
  pickVoice,
  splitIntoSentences,
  formatSpeechText,
} from '../voice/speak.js';
import { matchVoiceCommand, VOICE_COMMAND } from '../voice/commands.js';
import { createMicController, DEFAULT_SPEECH_RATE } from '../voice/useVoice.js';
import { mockApi } from '../api/mockApi.js';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';

describe('Module F3: Voice Assistant Layer (speak.js, useVoice, 6 Commands, Gate 2 Voice Safety)', () => {
  let spokenUtterances = [];
  let mockVoices = [];

  beforeEach(async () => {
    window.localStorage.clear();
    await mockApi.demoReset({ language: 'mr-IN' });

    spokenUtterances = [];
    mockVoices = [
      { name: 'Google मराठी', lang: 'mr-IN' },
      { name: 'Google हिन्दी', lang: 'hi-IN' },
      { name: 'Google English India', lang: 'en-IN' },
    ];

    globalThis.SpeechSynthesisUtterance = function MockUtterance(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.voice = null;
      this.onend = null;
    };

    globalThis.speechSynthesis = {
      cancel: vi.fn(),
      getVoices: vi.fn(() => mockVoices),
      speak: vi.fn((u) => {
        spokenUtterances.push(u);
      }),
    };
  });

  it('splits multi-sentence text in speak() and fires onEnd on the final sentence', () => {
    const onEnd = vi.fn();
    const text =
      'नमस्कार रमाबाई। तुमचे पेन्शन थांबले आहे का? आपण अर्ज भरूया!';

    const parts = splitIntoSentences(text);
    expect(parts).toEqual([
      'नमस्कार रमाबाई।',
      'तुमचे पेन्शन थांबले आहे का?',
      'आपण अर्ज भरूया!',
    ]);

    speak(text, { lang: 'mr-IN', rate: 0.85, onEnd });
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(spokenUtterances.length).toBe(3);
    expect(spokenUtterances[0].rate).toBe(0.85);
    expect(spokenUtterances[0].voice.lang).toBe('mr-IN');
    expect(spokenUtterances[0].onend).toBeNull();
    expect(typeof spokenUtterances[2].onend).toBe('function');

    spokenUtterances[2].onend();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('follows the exact voice fallback order: exact lang -> prefix -> hi-IN -> null', () => {
    // 1. Exact mr-IN match
    expect(pickVoice('mr-IN', mockVoices).lang).toBe('mr-IN');

    // 2. Prefix match (e.g. mr-Maharashtra when mr-IN is absent)
    const prefixVoices = [
      { name: 'Marathi Generic', lang: 'mr' },
      { name: 'Hindi India', lang: 'hi-IN' },
    ];
    expect(pickVoice('mr-IN', prefixVoices).lang).toBe('mr');

    // 3. Fallback to hi-IN when Marathi is missing
    const hindiOnlyVoices = [
      { name: 'Hindi India', lang: 'hi-IN' },
      { name: 'English India', lang: 'en-IN' },
    ];
    expect(pickVoice('mr-IN', hindiOnlyVoices).lang).toBe('hi-IN');

    // 4. Returns null when no match and no hi-IN exists
    expect(pickVoice('mr-IN', [{ name: 'French', lang: 'fr-FR' }])).toBeNull();
  });

  it('turns mic OFF while speaking and turns mic ON again in onEnd, and lowers rate on "dheere bolo"', () => {
    const mockRecognition = {
      lang: '',
      start: vi.fn(),
      stop: vi.fn(),
    };

    const controller = createMicController({
      lang: 'mr-IN',
      rate: DEFAULT_SPEECH_RATE,
      recognitionInstance: mockRecognition,
    });

    // Start mic listening
    controller.startMic();
    expect(controller.getState().isListening).toBe(true);
    expect(mockRecognition.start).toHaveBeenCalledTimes(1);

    // App starts speaking -> mic must immediately stop so app never hears itself
    controller.speakWithEchoGuard('पहिला वाक्य. दुसरा वाक्य.');
    expect(mockRecognition.stop).toHaveBeenCalledTimes(1);
    expect(controller.getState().isListening).toBe(false);
    expect(controller.getState().isSpeaking).toBe(true);

    // Final utterance finishes -> onend fires -> mic automatically turns back ON
    const lastUtterance = spokenUtterances[spokenUtterances.length - 1];
    lastUtterance.onend();
    expect(controller.getState().isSpeaking).toBe(false);
    expect(controller.getState().isListening).toBe(true);
    expect(mockRecognition.start).toHaveBeenCalledTimes(2);

    // Spoken command "dheere bolo" lowers speaking rate below 0.85
    controller.handleRecognizedSpeech('हळू बोला');
    expect(controller.getState().rate).toBeLessThan(DEFAULT_SPEECH_RATE);
  });

  it('maps all 6 voice commands accurately across Marathi, Hindi, and English', () => {
    // 1. YES
    expect(matchVoiceCommand('होय')).toBe(VOICE_COMMAND.YES);
    expect(matchVoiceCommand('हाँ')).toBe(VOICE_COMMAND.YES);
    expect(matchVoiceCommand('yes')).toBe(VOICE_COMMAND.YES);

    // 2. NO
    expect(matchVoiceCommand('नाही')).toBe(VOICE_COMMAND.NO);
    expect(matchVoiceCommand('नहीं')).toBe(VOICE_COMMAND.NO);
    expect(matchVoiceCommand('no')).toBe(VOICE_COMMAND.NO);

    // 3. REPEAT
    expect(matchVoiceCommand('पुन्हा सांगा')).toBe(VOICE_COMMAND.REPEAT);
    expect(matchVoiceCommand('दोबारा बोलो')).toBe(VOICE_COMMAND.REPEAT);
    expect(matchVoiceCommand('repeat')).toBe(VOICE_COMMAND.REPEAT);

    // 4. SLOWER
    expect(matchVoiceCommand('हळू बोला')).toBe(VOICE_COMMAND.SLOWER);
    expect(matchVoiceCommand('धीरे बोलो')).toBe(VOICE_COMMAND.SLOWER);
    expect(matchVoiceCommand('slower')).toBe(VOICE_COMMAND.SLOWER);

    // 5. STOP
    expect(matchVoiceCommand('थांबा')).toBe(VOICE_COMMAND.STOP);
    expect(matchVoiceCommand('रुको')).toBe(VOICE_COMMAND.STOP);
    expect(matchVoiceCommand('stop')).toBe(VOICE_COMMAND.STOP);

    // 6. HELP
    expect(matchVoiceCommand('मदत')).toBe(VOICE_COMMAND.HELP);
    expect(matchVoiceCommand('मदद')).toBe(VOICE_COMMAND.HELP);
    expect(matchVoiceCommand('help')).toBe(VOICE_COMMAND.HELP);
  });

  it('enforces that submit CANNOT happen from voice "haan" alone at Gate 2 — requires physical Confirm button press', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="hi-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Move to FORM_FILLED (Gate 2 Draft Review)
    fireEvent.click(screen.getByTestId('btn-confirm-service'));
    await waitFor(() =>
      expect(screen.getByTestId('consent-agree-btn')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('consent-agree-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('save-profile-yes-btn')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('save-profile-yes-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('screen-documents')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('btn-fill-draft'));

    await waitFor(() =>
      expect(screen.getByTestId('screen-draft-summary')).toBeInTheDocument()
    );

    // Citizen says "haan" via voice command at Gate 2
    fireEvent.click(screen.getByTestId('voice-cmd-yes'));

    // MUST NOT submit! Still on draft summary screen, and shows big physical confirm button
    expect(screen.queryByTestId('screen-submitted')).not.toBeInTheDocument();
    expect(screen.getByTestId('screen-draft-summary')).toBeInTheDocument();
    expect(screen.getByTestId('gate2-voice-yes-notice')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('gate2-voice-confirm-btn');
    expect(confirmBtn).toBeInTheDocument();

    // Only when physical Confirm button is pressed does submission happen
    fireEvent.click(confirmBtn);
    await waitFor(() =>
      expect(screen.getByTestId('screen-submitted')).toBeInTheDocument()
    );
    expect(screen.getByTestId('submitted-app-id')).toHaveTextContent(
      'PEN-2026-88213'
    );
  });

  it('falls back to text-box input cleanly when Web Speech STT is unavailable and formats IDs digit-by-digit', async () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    expect(formatSpeechText('ID PEN-2026-88213 https://example.com')).toContain(
      'P E N 2 0 2 6 8 8 2 1 3'
    );

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="mr-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    const input = screen.getByTestId('intake-text-input');
    fireEvent.change(input, { target: { value: 'Meri pension band ho gayi' } });
    fireEvent.click(screen.getByTestId('intake-send-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('clarifying-question-box')).toBeInTheDocument()
    );
  });
});

