/**
 * Assistant engine: deterministic, multilingual (en-IN, hi-IN, mr-IN) intent detection,
 * form-field extraction/validation and localized copy for the citizen AI assistant.
 *
 * Facts (scheme rules, documents, application status) are NEVER generated here; they are
 * read from MongoDB by the route layer and only templated into localized sentences.
 * Extraction never invents values: if an answer is ambiguous it returns ok=false with a reason.
 */

export const ASSISTANT_LANGUAGES = Object.freeze(['en-IN', 'hi-IN', 'mr-IN']);

const SERVICE_KEYWORDS = {
  income_certificate: [
    'income certificate',
    'income cert',
    'income ka praman',
    'aay praman',
    'आय प्रमाण',
    'आय का प्रमाण',
    'उत्पन्नाचा दाखला',
    'उत्पन्न दाखला',
    'उत्पन्नाचे प्रमाण',
    'dakhla',
    'दाखला',
    'tahsildar income',
    'income',
  ],
  scholarship: [
    'scholarship',
    'scholar',
    'scholars',
    'mahadbt',
    'mptass',
    'chhatravriti',
    'chhatravritti',
    'shishyavrutti',
    'छात्रवृत्ति',
    'छात्रवृत्त',
    'शिष्यवृत्ती',
    'शिष्यवृत्ति',
    'post matric',
    'tuition fee',
    'vidyarthi',
    'student',
  ],
  pension: ['pension', 'पेंशन', 'पेन्शन', 'निवृत्तीवेतन', 'निवृत्ति वेतन', 'vriddhavastha', 'वृद्धावस्था'],
  ration_card: ['ration', 'ration card', 'rashan', 'राशन', 'रेशन', 'शिधापत्रिका', 'nfsa'],
};

const INTENT_KEYWORDS = {
  apply: [
    'apply',
    'apply for',
    'application',
    'apply now',
    'kaise apply',
    'form',
    'start',
    'kaise',
    'kaisa',
    'karen',
    'karein',
    'banega',
    'banwana',
    'chahiye',
    'chahie',
    'kasa',
    'kashi',
    'aavedan',
    'आवेदन',
    'अर्ज',
    'अर्ज कसा करायचा',
    'अर्ज करणे',
    'भरना',
    'भरायचा',
    'help me',
  ],
  fill: [
    'bhar do',
    'form bhar',
    'bharo',
    'fill',
    'भर दो',
    'भरो',
    'भरा',
    'भरायचे',
  ],
  status: [
    'status',
    'track',
    'tracking',
    'kahan tak',
    'sthiti',
    'sthithi',
    'स्थिति',
    'स्थिती',
    'स्टेटस',
    'ट्रॅक',
    'ट्रैक',
  ],
  documents: [
    'document',
    'documents',
    'kagad',
    'kagaz',
    'dastavej',
    'कागद',
    'दस्तावेज',
    'दस्तावेज़',
    'कागदपत्र',
    'कागदपत्रे',
    'कागज',
  ],
  eligibility: [
    'eligible',
    'eligibility',
    'qualify',
    'patra',
    'patrata',
    'पात्र',
    'पात्रता',
  ],
};

function includesAny(text, words) {
  return words.some((w) => text.includes(w));
}

export function normalizeAssistantLanguage(raw) {
  const value = String(raw || '').trim();
  return ASSISTANT_LANGUAGES.includes(value) ? value : null;
}

/**
 * Detects the citizen's intent and (optional) service from free text.
 * Returns { intent, serviceId } where intent is one of
 * status | fill | documents | eligibility | apply | service_info | unknown.
 */
export function detectIntent(rawText) {
  const text = String(rawText || '').toLowerCase();
  let serviceId = null;
  for (const [id, words] of Object.entries(SERVICE_KEYWORDS)) {
    if (includesAny(text, words)) {
      serviceId = id;
      break;
    }
  }

  let intent = 'unknown';
  if (includesAny(text, INTENT_KEYWORDS.apply)) intent = 'apply';
  else if (includesAny(text, INTENT_KEYWORDS.fill)) intent = 'fill';
  else if (includesAny(text, INTENT_KEYWORDS.status)) intent = 'status';
  else if (includesAny(text, INTENT_KEYWORDS.documents)) intent = 'documents';
  else if (includesAny(text, INTENT_KEYWORDS.eligibility)) intent = 'eligibility';
  else if (serviceId) intent = 'service_info';

  return { intent, serviceId };
}

// ---------------------------------------------------------------------------
// Form field extraction
// ---------------------------------------------------------------------------

const STATES = [
  ['Andhra Pradesh', ['andhra pradesh', 'आंध्र प्रदेश', 'आंध्रप्रदेश']],
  ['Bihar', ['bihar', 'बिहार']],
  ['Chhattisgarh', ['chhattisgarh', 'छत्तीसगढ़', 'छत्तीसगड']],
  ['Delhi', ['delhi', 'दिल्ली']],
  ['Goa', ['goa', 'गोवा']],
  ['Gujarat', ['gujarat', 'गुजरात']],
  ['Haryana', ['haryana', 'हरियाणा', 'हरयाणा']],
  ['Himachal Pradesh', ['himachal pradesh', 'हिमाचल प्रदेश']],
  ['Jharkhand', ['jharkhand', 'झारखंड', 'झारखण्ड']],
  ['Karnataka', ['karnataka', 'कर्नाटक', 'कर्नाटका']],
  ['Kerala', ['kerala', 'केरल', 'केरळ']],
  ['Madhya Pradesh', ['madhya pradesh', 'मध्य प्रदेश', 'मध्यप्रदेश']],
  ['Maharashtra', ['maharashtra', 'महाराष्ट्र']],
  ['Odisha', ['odisha', 'orissa', 'ओडिशा', 'उड़ीसा']],
  ['Punjab', ['punjab', 'पंजाब']],
  ['Rajasthan', ['rajasthan', 'राजस्थान']],
  ['Tamil Nadu', ['tamil nadu', 'तमिलनाडु', 'तमिळनाडू']],
  ['Telangana', ['telangana', 'तेलंगाना', 'तेलंगणा']],
  ['Uttar Pradesh', ['uttar pradesh', 'उत्तर प्रदेश']],
  ['Uttarakhand', ['uttarakhand', 'उत्तराखंड']],
  ['West Bengal', ['west bengal', 'पश्चिम बंगाल', 'पश्चिम बंगाल']],
];

const MONTHS = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9,
  sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

const LEAD_INS = {
  fullName: [
    /my name is\s+(.+)/i,
    /\bi am\s+(.+)/i,
    /\bi'm\s+(.+)/i,
    /mera naam\s+(.+?)(?:\s+hai)?$/i,
    /मेरा नाम\s+(.+?)(?:\s+है)?$/,
    /माझे नाव\s+(.+?)(?:\s+आहे)?$/,
    /majhe naav\s+(.+?)(?:\s+aahe)?$/i,
    /name is\s+(.+)/i,
  ],
  state: [
    /my state is\s+(.+)/i,
    /state is\s+(.+)/i,
    /mera rajya\s+(.+?)(?:\s+hai)?$/i,
    /मेरा राज्य\s+(.+?)(?:\s+है)?$/,
    /माझे राज्य\s+(.+?)(?:\s+आहे)?$/,
  ],
  district: [
    /my district is\s+(.+)/i,
    /district is\s+(.+)/i,
    /mera zila\s+(.+?)(?:\s+hai)?$/i,
    /मेरा जिला\s+(.+?)(?:\s+है)?$/,
    /माझा जिल्हा\s+(.+?)(?:\s+आहे)?$/,
  ],
  annualIncome: [
    /(?:annual )?income is\s+(.+)/i,
    /मेरी (?:वार्षिक )?आय\s+(.+?)(?:\s+है)?$/,
    /माझे (?:वार्षिक )?उत्पन्न\s+(.+?)(?:\s+आहे)?$/,
  ],
  dob: [
    /(?:date of birth|dob|birthday) is\s+(.+)/i,
    /मेरी जन्म ?तिथि\s+(.+?)(?:\s+है)?$/,
    /माझी जन्म ?तारीख\s+(.+?)(?:\s+आहे)?$/,
  ],
  address: [/my address is\s+(.+)/i, /मेरा पता\s+(.+?)(?:\s+है)?$/, /माझा पत्ता\s+(.+?)(?:\s+आहे)?$/],
  email: [/my email is\s+(.+)/i, /email is\s+(.+)/i],
};

export const FIELD_KEYS = Object.freeze([
  'fullName',
  'dob',
  'state',
  'district',
  'address',
  'annualIncome',
  'email',
]);

// Critical fields are always echoed back for explicit confirmation.
export const CRITICAL_FIELDS = Object.freeze(['fullName', 'dob', 'annualIncome']);

const INDIC_DIGITS = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

function clean(value) {
  return String(value || '')
    .replace(/[०-९]/g, (d) => INDIC_DIGITS[d] || d)
    .replace(/[.!?।]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateName(raw) {
  const value = clean(raw);
  if (value.length < 2 || value.length > 80) return { ok: false, reason: 'NAME_LENGTH' };
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(value)) return { ok: false, reason: 'NAME_CHARS' };
  if (value.split(' ').length > 6) return { ok: false, reason: 'NAME_TOO_LONG' };
  return { ok: true, value };
}

function validateState(raw) {
  const text = clean(raw).toLowerCase();
  for (const [canonical, aliases] of STATES) {
    if (aliases.some((a) => text === a || text.includes(a))) {
      return { ok: true, value: canonical };
    }
  }
  return { ok: false, reason: 'STATE_UNKNOWN' };
}

function validateDistrict(raw) {
  const value = clean(raw);
  if (value.length < 2 || value.length > 60 || /\d/.test(value)) {
    return { ok: false, reason: 'DISTRICT_INVALID' };
  }
  return { ok: true, value };
}

function validateAddress(raw) {
  const value = clean(raw);
  if (value.length < 5 || value.length > 200) return { ok: false, reason: 'ADDRESS_INVALID' };
  return { ok: true, value };
}

function validateEmail(raw) {
  const value = clean(raw)
    .toLowerCase()
    .replace(/\s+at\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/\s+/g, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { ok: false, reason: 'EMAIL_INVALID' };
  return { ok: true, value };
}

function validateIncome(raw) {
  const text = clean(raw).toLowerCase().replace(/,/g, '');
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return { ok: false, reason: 'INCOME_NOT_NUMBER' };
  let amount = Number(match[1]);
  if (/lakh|lac|लाख/.test(text)) amount *= 100000;
  else if (/thousand|hazar|हजार|हज़ार|हजार/.test(text)) amount *= 1000;
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) {
    return { ok: false, reason: 'INCOME_RANGE' };
  }
  return { ok: true, value: Math.round(amount) };
}

function validateDob(raw) {
  const text = clean(raw).toLowerCase();
  let y;
  let m;
  let d;
  let match = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    [, y, m, d] = match.map(Number);
  } else if ((match = text.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) {
    [, d, m, y] = match.map(Number);
  } else if ((match = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})/))) {
    d = Number(match[1]);
    m = MONTHS[match[2]];
    y = Number(match[3]);
  }
  if (!y || !m || !d) return { ok: false, reason: 'DOB_FORMAT' };
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false, reason: 'DOB_INVALID' };
  }
  const age = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 0 || age > 120) return { ok: false, reason: 'DOB_RANGE' };
  const pad = (n) => String(n).padStart(2, '0');
  return { ok: true, value: `${y}-${pad(m)}-${pad(d)}` };
}

const VALIDATORS = {
  fullName: validateName,
  state: validateState,
  district: validateDistrict,
  address: validateAddress,
  email: validateEmail,
  annualIncome: validateIncome,
  dob: validateDob,
};

function stripLeadIn(field, text) {
  for (const re of LEAD_INS[field] || []) {
    const m = text.match(re);
    if (m && m[1]) return { matched: true, value: m[1] };
  }
  return { matched: false, value: text };
}

/**
 * Extracts a form field from a spoken/typed utterance.
 * - If `field` is provided (assistant asked for that field) the whole answer is interpreted for it.
 * - Otherwise the utterance must contain an explicit lead-in ("my name is ...").
 * Returns { ok, field, value, needsConfirmation, reason }. Never guesses.
 */
export function extractFormField({ text, field = null }) {
  const input = clean(text);
  if (!input) return { ok: false, field, reason: 'EMPTY' };

  const candidates = field ? [field] : FIELD_KEYS;
  for (const key of candidates) {
    if (!VALIDATORS[key]) continue;
    const { matched, value } = stripLeadIn(key, input);
    if (!field && !matched) continue;
    const result = VALIDATORS[key](value);
    if (result.ok) {
      return {
        ok: true,
        field: key,
        value: result.value,
        needsConfirmation: CRITICAL_FIELDS.includes(key),
      };
    }
    if (field) return { ok: false, field: key, reason: result.reason };
  }
  return { ok: false, field, reason: field ? 'UNPARSEABLE' : 'NO_FIELD_DETECTED' };
}

// ---------------------------------------------------------------------------
// Localized copy
// ---------------------------------------------------------------------------

const COPY = {
  'en-IN': {
    greeting: (name) =>
      `Hello${name ? ` ${name}` : ''}! I can help with schemes, documents, applications and status. What do you need?`,
    schemeIntro: (name, benefits) => `${name}: ${benefits}`,
    docsList: (name, docs) => `Documents required for ${name}: ${docs}.`,
    eligibility: (name, text) => `Eligibility for ${name}: ${text}`,
    eligibilityNote: 'This is indicative. The department decides final eligibility.',
    applySteps: (name, steps) => `To apply for ${name}: ${steps}`,
    applyCta: 'I can start the application with you now.',
    noApplications: 'You have no submitted applications yet. Start one from Schemes or tell me which service you need.',
    statusLine: (name, id, status) => `${name} (${id}): current status is ${status}.`,
    draftLine: (name) => `${name}: draft saved, not submitted yet.`,
    unknown: 'I could not understand which service you need. Try Scholarship, Pension or Income Certificate, or visit your nearest Madad Kendra.',
    madad: 'I could not identify the service. Please visit your nearest Madad Kendra for help.',
    fillStart: (name) => `Let's fill the ${name} form. I will ask one question at a time and you can edit every answer.`,
    askField: {
      fullName: 'What is your full name?',
      dob: 'What is your date of birth? (for example 15 August 1990)',
      state: 'Which state do you live in?',
      district: 'Which district do you live in?',
      address: 'What is your address?',
      annualIncome: 'What is your annual family income in rupees?',
      email: 'What is your email address?',
    },
    confirmField: (label, value) => `I heard ${label}: ${value}. Is this correct?`,
    clarify: {
      NAME_LENGTH: 'The name looks too short or too long. Please say your full name again.',
      NAME_CHARS: 'The name has unexpected characters. Please say only your name.',
      NAME_TOO_LONG: 'The name seems too long. Please say only your full name.',
      STATE_UNKNOWN: 'I could not match that to an Indian state. Please say the state name again.',
      DISTRICT_INVALID: 'I could not understand the district. Please say the district name.',
      ADDRESS_INVALID: 'Please give a more complete address.',
      EMAIL_INVALID: 'That email does not look valid. Please repeat it or type it.',
      INCOME_NOT_NUMBER: 'Please say the income as a number, for example 120000 or 2 lakh.',
      INCOME_RANGE: 'That income amount looks out of range. Please repeat it.',
      DOB_FORMAT: 'Please say the date like 15 August 1990 or 15/08/1990.',
      DOB_INVALID: 'That date does not exist. Please repeat your date of birth.',
      DOB_RANGE: 'That date of birth is not in a valid range. Please repeat it.',
      EMPTY: 'I did not catch that. Please try again.',
      UNPARSEABLE: 'I could not understand that answer. Please try again or type it.',
      NO_FIELD_DETECTED: 'I could not tell which field you meant. Please type or say it with a label, like "my name is ...".',
    },
    labels: {
      fullName: 'full name',
      dob: 'date of birth',
      state: 'state',
      district: 'district',
      address: 'address',
      annualIncome: 'annual income',
      email: 'email',
    },
    nextStep: {
      browse: 'Browse schemes',
      apply: 'Start application',
      documents: 'Upload documents',
      track: 'Track applications',
      madad: 'Visit Madad Kendra',
    },
  },
  'hi-IN': {
    greeting: (name) =>
      `नमस्ते${name ? ` ${name}` : ''}! मैं योजनाओं, दस्तावेज़ों, आवेदन और स्थिति में मदद कर सकता हूँ। आपको क्या चाहिए?`,
    schemeIntro: (name, benefits) => `${name}: ${benefits}`,
    docsList: (name, docs) => `${name} के लिए आवश्यक दस्तावेज़: ${docs}।`,
    eligibility: (name, text) => `${name} की पात्रता: ${text}`,
    eligibilityNote: 'यह सांकेतिक जानकारी है। अंतिम पात्रता विभाग तय करता है।',
    applySteps: (name, steps) => `${name} के लिए आवेदन कैसे करें: ${steps}`,
    applyCta: 'मैं अभी आपके साथ आवेदन शुरू कर सकता हूँ।',
    noApplications: 'आपने अभी तक कोई आवेदन जमा नहीं किया है। योजनाओं से शुरू करें या बताएं कि कौन सी सेवा चाहिए।',
    statusLine: (name, id, status) => `${name} (${id}): वर्तमान स्थिति ${status} है।`,
    draftLine: (name) => `${name}: ड्राफ्ट सहेजा गया है, अभी जमा नहीं हुआ।`,
    unknown: 'मैं समझ नहीं पाया कि कौन सी सेवा चाहिए। छात्रवृत्ति, पेंशन या आय प्रमाणपत्र बताएं, या नज़दीकी मदद केंद्र जाएं।',
    madad: 'मैं सेवा पहचान नहीं पाया। कृपया मदद के लिए नज़दीकी मदद केंद्र जाएं।',
    fillStart: (name) => `चलिए ${name} का फॉर्म भरते हैं। मैं एक-एक सवाल पूछूंगा और आप हर उत्तर बदल सकते हैं।`,
    askField: {
      fullName: 'आपका पूरा नाम क्या है?',
      dob: 'आपकी जन्म तिथि क्या है? (जैसे 15 अगस्त 1990)',
      state: 'आप किस राज्य में रहते हैं?',
      district: 'आप किस जिले में रहते हैं?',
      address: 'आपका पता क्या है?',
      annualIncome: 'आपके परिवार की वार्षिक आय कितनी है (रुपये में)?',
      email: 'आपका ईमेल पता क्या है?',
    },
    confirmField: (label, value) => `मैंने सुना ${label}: ${value}। क्या यह सही है?`,
    clarify: {
      NAME_LENGTH: 'नाम बहुत छोटा या बहुत लंबा लग रहा है। कृपया पूरा नाम फिर से बोलें।',
      NAME_CHARS: 'नाम में अनपेक्षित अक्षर हैं। कृपया सिर्फ़ अपना नाम बोलें।',
      NAME_TOO_LONG: 'नाम बहुत लंबा लग रहा है। कृपया सिर्फ़ अपना पूरा नाम बोलें।',
      STATE_UNKNOWN: 'मैं इसे किसी भारतीय राज्य से मिला नहीं पाया। कृपया राज्य का नाम फिर बोलें।',
      DISTRICT_INVALID: 'मैं जिला समझ नहीं पाया। कृपया जिले का नाम बोलें।',
      ADDRESS_INVALID: 'कृपया थोड़ा पूरा पता बताएं।',
      EMAIL_INVALID: 'यह ईमेल सही नहीं लग रहा। कृपया दोहराएं या टाइप करें।',
      INCOME_NOT_NUMBER: 'कृपया आय संख्या में बताएं, जैसे 120000 या 2 लाख।',
      INCOME_RANGE: 'यह आय राशि सीमा से बाहर लग रही है। कृपया दोहराएं।',
      DOB_FORMAT: 'कृपया तारीख ऐसे बोलें: 15 अगस्त 1990 या 15/08/1990।',
      DOB_INVALID: 'यह तारीख मौजूद नहीं है। कृपया जन्म तिथि दोहराएं।',
      DOB_RANGE: 'यह जन्म तिथि मान्य सीमा में नहीं है। कृपया दोहराएं।',
      EMPTY: 'मैं सुन नहीं पाया। कृपया फिर कोशिश करें।',
      UNPARSEABLE: 'मैं उत्तर समझ नहीं पाया। कृपया फिर कोशिश करें या टाइप करें।',
      NO_FIELD_DETECTED: 'मैं समझ नहीं पाया कि कौन सा फ़ील्ड है। कृपया "मेरा नाम ..." जैसे बोलें।',
    },
    labels: {
      fullName: 'पूरा नाम',
      dob: 'जन्म तिथि',
      state: 'राज्य',
      district: 'जिला',
      address: 'पता',
      annualIncome: 'वार्षिक आय',
      email: 'ईमेल',
    },
    nextStep: {
      browse: 'योजनाएं देखें',
      apply: 'आवेदन शुरू करें',
      documents: 'दस्तावेज़ अपलोड करें',
      track: 'आवेदन ट्रैक करें',
      madad: 'मदद केंद्र जाएं',
    },
  },
  'mr-IN': {
    greeting: (name) =>
      `नमस्कार${name ? ` ${name}` : ''}! मी योजना, कागदपत्रे, अर्ज आणि स्थिती यात मदत करू शकतो. तुम्हाला काय हवे आहे?`,
    schemeIntro: (name, benefits) => `${name}: ${benefits}`,
    docsList: (name, docs) => `${name} साठी आवश्यक कागदपत्रे: ${docs}.`,
    eligibility: (name, text) => `${name} साठी पात्रता: ${text}`,
    eligibilityNote: 'ही सूचक माहिती आहे. अंतिम पात्रता विभाग ठरवतो.',
    applySteps: (name, steps) => `${name} साठी अर्ज कसा करावा: ${steps}`,
    applyCta: 'मी आता तुमच्यासोबत अर्ज सुरू करू शकतो.',
    noApplications: 'तुम्ही अजून कोणताही अर्ज सादर केलेला नाही. योजनांमधून सुरू करा किंवा कोणती सेवा हवी ते सांगा.',
    statusLine: (name, id, status) => `${name} (${id}): सध्याची स्थिती ${status} आहे.`,
    draftLine: (name) => `${name}: मसुदा जतन केला आहे, अजून सादर केलेला नाही.`,
    unknown: 'मला कोणती सेवा हवी ते समजले नाही. शिष्यवृत्ती, पेन्शन किंवा उत्पन्नाचा दाखला सांगा, किंवा जवळच्या मदत केंद्रात जा.',
    madad: 'मला सेवा ओळखता आली नाही. कृपया मदतीसाठी जवळच्या मदत केंद्रात जा.',
    fillStart: (name) => `चला ${name} चा फॉर्म भरूया. मी एकेक प्रश्न विचारेन आणि तुम्ही प्रत्येक उत्तर बदलू शकता.`,
    askField: {
      fullName: 'तुमचे पूर्ण नाव काय आहे?',
      dob: 'तुमची जन्मतारीख काय आहे? (उदा. 15 ऑगस्ट 1990)',
      state: 'तुम्ही कोणत्या राज्यात राहता?',
      district: 'तुम्ही कोणत्या जिल्ह्यात राहता?',
      address: 'तुमचा पत्ता काय आहे?',
      annualIncome: 'तुमच्या कुटुंबाचे वार्षिक उत्पन्न किती आहे (रुपयांत)?',
      email: 'तुमचा ईमेल पत्ता काय आहे?',
    },
    confirmField: (label, value) => `मी ऐकले ${label}: ${value}. हे बरोबर आहे का?`,
    clarify: {
      NAME_LENGTH: 'नाव खूप लहान किंवा खूप मोठे वाटते. कृपया पूर्ण नाव पुन्हा सांगा.',
      NAME_CHARS: 'नावात अनपेक्षित अक्षरे आहेत. कृपया फक्त तुमचे नाव सांगा.',
      NAME_TOO_LONG: 'नाव खूप मोठे वाटते. कृपया फक्त तुमचे पूर्ण नाव सांगा.',
      STATE_UNKNOWN: 'हे कोणत्याही भारतीय राज्याशी जुळले नाही. कृपया राज्याचे नाव पुन्हा सांगा.',
      DISTRICT_INVALID: 'मला जिल्हा समजला नाही. कृपया जिल्ह्याचे नाव सांगा.',
      ADDRESS_INVALID: 'कृपया थोडा पूर्ण पत्ता सांगा.',
      EMAIL_INVALID: 'हा ईमेल बरोबर वाटत नाही. कृपया पुन्हा सांगा किंवा टाइप करा.',
      INCOME_NOT_NUMBER: 'कृपया उत्पन्न आकड्यात सांगा, उदा. 120000 किंवा 2 लाख.',
      INCOME_RANGE: 'ही उत्पन्नाची रक्कम मर्यादेबाहेर वाटते. कृपया पुन्हा सांगा.',
      DOB_FORMAT: 'कृपया तारीख अशी सांगा: 15 ऑगस्ट 1990 किंवा 15/08/1990.',
      DOB_INVALID: 'ही तारीख अस्तित्वात नाही. कृपया जन्मतारीख पुन्हा सांगा.',
      DOB_RANGE: 'ही जन्मतारीख वैध मर्यादेत नाही. कृपया पुन्हा सांगा.',
      EMPTY: 'मला ऐकू आले नाही. कृपया पुन्हा प्रयत्न करा.',
      UNPARSEABLE: 'मला उत्तर समजले नाही. कृपया पुन्हा प्रयत्न करा किंवा टाइप करा.',
      NO_FIELD_DETECTED: 'कोणते फील्ड आहे ते समजले नाही. कृपया "माझे नाव ..." असे सांगा.',
    },
    labels: {
      fullName: 'पूर्ण नाव',
      dob: 'जन्मतारीख',
      state: 'राज्य',
      district: 'जिल्हा',
      address: 'पत्ता',
      annualIncome: 'वार्षिक उत्पन्न',
      email: 'ईमेल',
    },
    nextStep: {
      browse: 'योजना पहा',
      apply: 'अर्ज सुरू करा',
      documents: 'कागदपत्रे अपलोड करा',
      track: 'अर्ज ट्रॅक करा',
      madad: 'मदत केंद्रात जा',
    },
  },
};

export function getCopy(language) {
  return COPY[normalizeAssistantLanguage(language) || 'en-IN'];
}

const SUGGESTIONS = {
  scholarship: {
    'en-IN': ['Am I eligible for a scholarship?', 'Which documents are required for a scholarship?', 'Help me apply for a scholarship.'],
    'hi-IN': ['क्या मैं छात्रवृत्ति के लिए पात्र हूँ?', 'छात्रवृत्ति के लिए कौन से दस्तावेज़ चाहिए?', 'छात्रवृत्ति के लिए आवेदन में मदद करें।'],
    'mr-IN': ['मी शिष्यवृत्तीसाठी पात्र आहे का?', 'शिष्यवृत्तीसाठी कोणती कागदपत्रे लागतात?', 'शिष्यवृत्तीसाठी अर्ज करण्यास मदत करा.'],
  },
  pension: {
    'en-IN': ['How can I apply for pension?', 'What are the pension eligibility requirements?', 'Check my application status.'],
    'hi-IN': ['मैं पेंशन के लिए आवेदन कैसे करूँ?', 'पेंशन की पात्रता क्या है?', 'मेरे आवेदन की स्थिति बताएं।'],
    'mr-IN': ['मी पेन्शनसाठी अर्ज कसा करू?', 'पेन्शनची पात्रता काय आहे?', 'माझ्या अर्जाची स्थिती सांगा.'],
  },
  income_certificate: {
    'en-IN': ['How do I apply for an income certificate?', 'Which documents do I need for an income certificate?', 'Help me fill the income certificate form.'],
    'hi-IN': ['आय प्रमाणपत्र के लिए आवेदन कैसे करूँ?', 'आय प्रमाणपत्र के लिए कौन से दस्तावेज़ चाहिए?', 'आय प्रमाणपत्र का फॉर्म भरने में मदद करें।'],
    'mr-IN': ['उत्पन्नाच्या दाखल्यासाठी अर्ज कसा करू?', 'उत्पन्नाच्या दाखल्यासाठी कोणती कागदपत्रे लागतात?', 'उत्पन्नाच्या दाखल्याचा फॉर्म भरण्यास मदत करा.'],
  },
};

export function getSuggestions(language) {
  const lang = normalizeAssistantLanguage(language) || 'en-IN';
  return [
    { id: 'scholarship', label: { 'en-IN': 'Scholarship', 'hi-IN': 'छात्रवृत्ति', 'mr-IN': 'शिष्यवृत्ती' }[lang], questions: SUGGESTIONS.scholarship[lang] },
    { id: 'pension', label: { 'en-IN': 'Pension', 'hi-IN': 'पेंशन', 'mr-IN': 'पेन्शन' }[lang], questions: SUGGESTIONS.pension[lang] },
    { id: 'income_certificate', label: { 'en-IN': 'Income Certificate', 'hi-IN': 'आय प्रमाणपत्र', 'mr-IN': 'उत्पन्नाचा दाखला' }[lang], questions: SUGGESTIONS.income_certificate[lang] },
  ];
}

export function humanizeDocKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

