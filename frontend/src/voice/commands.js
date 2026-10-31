export const VOICE_COMMAND = Object.freeze({
  YES: 'YES',
  NO: 'NO',
  REPEAT: 'REPEAT',
  SLOWER: 'SLOWER',
  STOP: 'STOP',
  HELP: 'HELP',
});

const COMMAND_PATTERNS = [
  {
    command: VOICE_COMMAND.REPEAT,
    patterns: [
      'dobara bolo',
      'dobara',
      'phir se bolo',
      'fir se bolo',
      'दोबारा बोलो',
      'दोबारा',
      'फिर से बोलो',
      'punha sanga',
      'parat sanga',
      'parat bola',
      'पुन्हा सांगा',
      'पुन्हा बोला',
      'परत सांगा',
      'परत बोला',
      'repeat',
      'say again',
    ],
  },
  {
    command: VOICE_COMMAND.SLOWER,
    patterns: [
      'dheere bolo',
      'dhire bolo',
      'dheere',
      'धीरे बोलो',
      'धीरे',
      'halu bola',
      'sawakash bola',
      'हळू बोला',
      'सावकाश बोला',
      'हळू',
      'slower',
      'speak slowly',
      'slow down',
    ],
  },
  {
    command: VOICE_COMMAND.STOP,
    patterns: [
      'ruko',
      'ruk jao',
      'रुको',
      'रुक जाओ',
      'thamba',
      'थांबा',
      'बस करा',
      'stop',
      'quiet',
    ],
  },
  {
    command: VOICE_COMMAND.HELP,
    patterns: [
      'madad',
      'madat',
      'मदद',
      'मदत',
      'सहायता',
      'help',
      'madad kendra',
      'मदत केंद्र',
    ],
  },
  {
    command: VOICE_COMMAND.NO,
    patterns: [
      'nahi',
      'naahi',
      'nako',
      'badlo',
      'नाही',
      'नको',
      'बदला',
      'नहीं',
      'ना',
      'बदलो',
      'मत करो',
      'no',
      'cancel',
      'do not submit',
    ],
  },
  {
    command: VOICE_COMMAND.YES,
    patterns: [
      'haan',
      'han',
      'ho',
      'hoy',
      'barobar',
      'sahi',
      'हो',
      'होय',
      'बरोबर',
      'मान्य',
      'हाँ',
      'हां',
      'सही',
      'मंज़ूर',
      'जी हाँ',
      'yes',
      'agree',
      'confirm',
      'ok',
    ],
  },
];

export function matchVoiceCommand(transcript = '') {
  const cleaned = String(transcript)
    .toLowerCase()
    .replace(/[.,?!।]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  for (const entry of COMMAND_PATTERNS) {
    for (const phrase of entry.patterns) {
      if (
        cleaned === phrase ||
        cleaned.startsWith(`${phrase} `) ||
        cleaned.endsWith(` ${phrase}`) ||
        cleaned.includes(` ${phrase} `)
      ) {
        return entry.command;
      }
    }
  }

  return null;
}

