import { defaultModelsClient } from '@nagarsathi/models';
import { maskForLlm } from './privacy.js';

export const SUPPORTED_LANGUAGES = Object.freeze(['mr-IN', 'hi-IN', 'en-IN']);

const SHORT_TO_FULL_LANG = Object.freeze({
  mr: 'mr-IN',
  'mr-in': 'mr-IN',
  hi: 'hi-IN',
  'hi-in': 'hi-IN',
  en: 'en-IN',
  'en-in': 'en-IN',
});

/**
 * Validates and normalizes the chosen language code.
 * Throws an error with `code = 'LANGUAGE_REQUIRED'` (HTTP 400) if missing or unsupported.
 */
export function requireValidLanguage(rawLang) {
  if (rawLang === undefined || rawLang === null || String(rawLang).trim() === '') {
    const err = new Error(
      'Chosen language (mr-IN, hi-IN, or en-IN) is required for every agent call.'
    );
    err.code = 'LANGUAGE_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  const normalizedKey = String(rawLang).trim().toLowerCase();
  const mapped = SHORT_TO_FULL_LANG[normalizedKey];
  if (!mapped) {
    const err = new Error(
      `Unsupported language "${rawLang}". Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`
    );
    err.code = 'LANGUAGE_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  return mapped;
}

export const AGENT_COPY = {
  'mr-IN': {
    intake: {
      display:
        'तुमचे पेन्शन थांबले आहे हे समजले. कृपया सांगा: कोणती पेन्शन? (Kaunsi pension?)',
      speech:
        'रमाबाई, तुमचे पेन्शन थांबले आहे हे समजले. कोणती पेन्शन बंद झाली आहे?',
    },
    intakeUnknownRetry: {
      display: 'मला तुमची समस्या नीट समजली नाही. कृपया पुन्हा एकदा स्पष्टपणे सांगा.',
      speech: 'क्षमा करा, मला समजले नाही. कृपया पुन्हा एकदा सांगा.',
    },
    intakeUnknownMadad: {
      display:
        'आम्हाला तुमची सेवा निश्चित करता आली नाही. कृपया मदत केंद्राशी (Madad Kendra) संपर्क साधा.',
      speech: 'कृपया जवळच्या मदत केंद्राशी संपर्क साधा.',
    },
    answer: {
      display:
        'तुमची माहिती नोंदवली आहे: वृद्धापकाळ पेन्शन. तुम्हाला पेन्शन पुन्हा सुरू करायची आहे, बरोबर?',
      speech: 'तुम्हाला वृद्धापकाळ पेन्शन पुन्हा सुरू करायची आहे, बरोबर ना?',
    },
    confirmService: {
      display:
        'पेन्शन पुनर्संचयित सेवा निश्चित केली आहे (विश्वासार्हता: ९६%). आता संमती द्या (Gate 1).',
      speech:
        'पेन्शन पुनर्संचयित सेवा निश्चित झाली आहे. आता कृपया तुमची संमती द्या.',
    },
    consent: {
      display:
        'तुमची संमती नोंदवली आहे (Gate 1). आम्ही तुमची कागदपत्रे केवळ या अर्जासाठी वापरू.',
      speech: 'धन्यवाद रमाबाई, तुमची संमती नोंदवली गेली आहे.',
    },
    consentDeclined: {
      display: 'तुम्ही संमती नाकारली आहे. कोणतीही माहिती जतन केलेली नाही.',
      speech: 'ठीक आहे, आम्ही कोणतीही माहिती जतन केलेली नाही.',
    },
    docsCollecting: {
      display:
        'कागदपत्रे तपासणी सुरू आहे: आधार कार्ड (XXXX-XXXX-4821), बँक पासबुक (XXXXXXXX9012), हयातीचा दाखला.',
      speech: 'आधार कार्ड आणि बँक खात्याची माहिती तपासली जात आहे.',
    },
    docsBlurry: {
      display: 'फोटो अंधूक आहे, कृपया पुन्हा काढा (Photo dhundhli hai, dobara).',
      speech: 'फोटो अंधूक आला आहे, कृपया पुन्हा एकदा स्पष्ट फोटो काढा.',
    },
    docsExpired: {
      display:
        'हयातीचा दाखला जुना आहे, कृपया चालू वर्षाचा दाखला द्या (Life certificate purana hai).',
      speech: 'हयातीचा दाखला जुना आहे, कृपया नवीन दाखल्याचा फोटो काढा.',
    },
    docsReady: {
      display: 'सर्व ३ आवश्यक कागदपत्रे पडताळली आणि तयार आहेत (DOCS_READY).',
      speech: 'तुमची सर्व कागदपत्रे तयार आहेत. आता आपण अर्जाचा मसुदा भरूया.',
    },
    fillDraft: {
      display:
        'अर्जाचा मसुदा (DRAFT) तयार केला आहे. कृपया तपासा आणि मंजुरी द्या (Gate 2). तुमच्या मंजुरीशिवाय अर्ज सादर केला जाणार नाही.',
      speech:
        'रमाबाई, तुमचा अर्जाचा मसुदा तयार आहे. कृपया तो तपासून मंजुरी द्या.',
    },
    approve: {
      display:
        'तुम्ही मसुद्याला स्पष्ट मंजुरी दिली आहे (approval.given = true). आता अर्ज सादर करता येईल.',
      speech: 'तुमची मंजुरी मिळाली आहे. आता आपण अर्ज सादर करू शकतो.',
    },
    submit: {
      display: 'अर्ज यशस्वीरित्या सादर केला! अर्ज क्रमांक: PEN-2026-88213.',
      speech:
        'अभिनंदन रमाबाई! तुमचा पेन्शन अर्ज सादर झाला आहे. अर्ज क्रमांक पी ई एन २०२६ ८८२१३ आहे.',
    },
    tracking: {
      display:
        'अर्ज क्रमांक PEN-2026-88213 चा मागोवा सुरू आहे: तालुका कार्यालयात पडताळणी प्रलंबित.',
      speech: 'तुमचा अर्ज सध्या तालुका कार्यालयात तपासणीसाठी आहे.',
    },
    queryRaised: {
      display:
        'कार्यालयाने चौकशी केली आहे: डिजिटल हयातीचा दाखला पुन्हा जोडणे आवश्यक आहे.',
      speech:
        'कार्यालयाकडून एक सूचना आली आहे: हयातीचा दाखला पुन्हा तपासावा लागेल.',
    },
    stalled: {
      display:
        '१५ दिवस उलटूनही अर्जावर कार्यवाही झालेली नाही (STALLED: 7 din se ruka hai). नगरसाथी कार्यालयाला कॉल करू शकतो.',
      speech:
        'पंधरा दिवस झाले तरी अर्जावर पुढे काम झाले नाही. मी कार्यालयाला फोन करू का?',
    },
    callStart: {
      display: 'तालुका समाजकल्याण कार्यालयाशी सिम्युलेटेड कॉल सुरू झाला आहे...',
      speech: 'तालुका कार्यालयाला फोन लावला आहे.',
    },
    callTurn: {
      display:
        'अधिकारी: अर्ज PEN-2026-88213 तपासला, हयातीचा दाखला मंजूर केला आहे.',
      speech: 'अधिकाऱ्यांनी सांगितले की तुमचा दाखला मंजूर झाला आहे.',
    },
    callEnd: {
      display:
        'कॉल पूर्ण झाला! संदर्भ क्रमांक: REF-5521. पेन्शन मंजुरी प्रक्रिया पुन्हा सुरू झाली (3 din mein dekhenge, REF-5521).',
      speech:
        'फोनवर बोलणे झाले आहे. संदर्भ क्रमांक आर ई एफ ५५२१ मिळाला आहे. तीन दिवसांत पुन्हा तपासू.',
    },
    closed: {
      display:
        'प्रकरण यशस्वीरित्या पूर्ण झाले (CLOSED)! अर्ज PEN-2026-88213 मंजूर, संदर्भ REF-5521 (Pension phir chalu ho gayi).',
      speech:
        'आनंदाची बातमी रमाबाई! तुमचे पेन्शन पुन्हा सुरू झाले आहे आणि प्रकरण पूर्ण झाले आहे.',
    },
    letterExplain: {
      display:
        'हे पत्र तालुका कार्यालयाकडून आले आहे: पेन्शन सुरू ठेवण्यासाठी १५ दिवसांत हयातीचा दाखला सादर करावा.',
      speech:
        'या पत्रात लिहिले आहे की पेन्शन सुरू ठेवण्यासाठी पंधरा दिवसांत हयातीचा दाखला द्यावा लागेल.',
    },
  },
  'hi-IN': {
    intake: {
      display:
        'आपकी पेंशन रुक गई है। कृपया बताएँ: कौनसी पेंशन? (Kaunsi pension?)',
      speech:
        'रमाबाई, आपकी पेंशन रुक गई है। कृपया बताएँ कौनसी पेंशन बंद हुई है?',
    },
    intakeUnknownRetry: {
      display: 'हमें आपकी समस्या स्पष्ट नहीं हुई। कृपया एक बार फिर से बताएँ।',
      speech: 'क्षमा करें, समझ नहीं आया। कृपया फिर से बताएँ।',
    },
    intakeUnknownMadad: {
      display:
        'हम सेवा की पहचान नहीं कर सके। कृपया मदद केंद्र (Madad Kendra) से संपर्क करें।',
      speech: 'कृपया नज़दीकी मदद केंद्र से संपर्क करें।',
    },
    answer: {
      display:
        'आपका उत्तर दर्ज किया गया: वृद्धावस्था पेंशन। आपको पेंशन चालू करवानी है, सही?',
      speech: 'आपको वृद्धावस्था पेंशन फिर से चालू करवानी है, सही?',
    },
    confirmService: {
      display:
        'पेंशन बहाली सेवा की पुष्टि हो गई है (विश्वसनीयता: 96%)। अब सहमति दें (Gate 1)।',
      speech: 'पेंशन बहाली सेवा पक्की हो गई है। अब कृपया सहमति दें।',
    },
    consent: {
      display:
        'आपकी सहमति दर्ज कर ली गई है (Gate 1)। हम आपके दस्तावेज़ केवल इसी आवेदन के लिए उपयोग करेंगे।',
      speech: 'धन्यवाद रमाबाई, आपकी सहमति दर्ज हो गई है।',
    },
    consentDeclined: {
      display: 'आपने सहमति नहीं दी। कोई भी जानकारी सेव नहीं की गई है।',
      speech: 'ठीक है, कोई भी डेटा सेव नहीं किया गया है।',
    },
    docsCollecting: {
      display:
        'दस्तावेज़ जाँच जारी: आधार कार्ड (XXXX-XXXX-4821), बैंक पासबुक (XXXXXXXX9012), जीवन प्रमाण पत्र।',
      speech: 'आधार कार्ड और बैंक खाते के दस्तावेज़ जाँचे जा रहे हैं।',
    },
    docsBlurry: {
      display: 'फोटो धुंधली है, दोबारा खींचें (Photo dhundhli hai, dobara)।',
      speech: 'फोटो धुंधली है, कृपया दोबारा साफ फोटो खींचें।',
    },
    docsExpired: {
      display:
        'जीवन प्रमाण पत्र पुराना है, कृपया नया प्रमाण पत्र दें (Life certificate purana hai)।',
      speech: 'जीवन प्रमाण पत्र पुराना है, कृपया नया प्रमाण पत्र दिखाएँ।',
    },
    docsReady: {
      display: 'तीनों आवश्यक दस्तावेज़ सत्यापित और तैयार हैं (DOCS_READY)।',
      speech: 'आपके सभी दस्तावेज़ तैयार हैं। अब हम ड्राफ्ट फॉर्म भरेंगे।',
    },
    fillDraft: {
      display:
        'फॉर्म का ड्राफ्ट (DRAFT) तैयार है। कृपया जाँच करें और मंज़ूरी दें (Gate 2)। आपकी मंज़ूरी के बिना फॉर्म सबमिट नहीं होगा।',
      speech:
        'रमाबाई, आपके फॉर्म का ड्राफ्ट तैयार है। कृपया इसे मंज़ूरी दें।',
    },
    approve: {
      display:
        'आपने ड्राफ्ट को स्पष्ट मंज़ूरी दे दी है (approval.given = true)। अब आवेदन सबमिट किया जा सकता है।',
      speech: 'आपकी मंज़ूरी मिल गई है। अब हम फॉर्म सबमिट कर सकते हैं।',
    },
    submit: {
      display:
        'आवेदन सफलतापूर्वक सबमिट हुआ! आवेदन संख्या: PEN-2026-88213।',
      speech:
        'बधाई हो रमाबाई! आपका पेंशन आवेदन सबमिट हो गया है। आवेदन संख्या पी ई एन 2026 88213 है।',
    },
    tracking: {
      display:
        'आवेदन PEN-2026-88213 की ट्रैकिंग: तहसील कार्यालय में सत्यापन लंबित।',
      speech: 'आपका आवेदन अभी तहसील कार्यालय में जाँच के लिए है।',
    },
    queryRaised: {
      display:
        'कार्यालय ने आपत्ति उठाई है: डिजिटल जीवन प्रमाण पत्र पुनः संलग्न करना आवश्यक है।',
      speech:
        'कार्यालय से सूचना आई है कि जीवन प्रमाण पत्र फिर से दिखाना होगा।',
    },
    stalled: {
      display:
        '15 दिन बीतने पर भी आवेदन आगे नहीं बढ़ा (STALLED: 7 din se ruka hai)। नगरसाथी कार्यालय को कॉल कर सकता है।',
      speech:
        'पंद्रह दिन हो गए हैं और फाइल रुकी हुई है। क्या मैं कार्यालय में फोन करूँ?',
    },
    callStart: {
      display: 'तहसील समाज कल्याण कार्यालय के साथ सिम्युलेटेड कॉल शुरू...',
      speech: 'तहसील कार्यालय में फोन लगाया जा रहा है।',
    },
    callTurn: {
      display:
        'अधिकारी: आवेदन PEN-2026-88213 की जाँच की गई, जीवन प्रमाण पत्र स्वीकृत किया गया।',
      speech: 'अधिकारी ने बताया कि आपका प्रमाण पत्र स्वीकार कर लिया गया है।',
    },
    callEnd: {
      display:
        'कॉल समाप्त! संदर्भ संख्या: REF-5521। पेंशन बहाली प्रक्रिया फिर से शुरू (3 din mein dekhenge, REF-5521)।',
      speech:
        'फोन पर बात पूरी हो गई है। संदर्भ संख्या आर ई एफ 5521 मिली है। तीन दिन में फिर देखेंगे।',
    },
    closed: {
      display:
        'मामला सफलतापूर्वक पूर्ण हुआ (CLOSED)! आवेदन PEN-2026-88213 स्वीकृत, संदर्भ REF-5521 (Pension phir chalu ho gayi)।',
      speech:
        'खुशखबरी रमाबाई! आपकी पेंशन फिर से शुरू हो गई है और मामला पूरा हो गया है।',
    },
    letterExplain: {
      display:
        'यह पत्र तहसील कार्यालय से है: पेंशन जारी रखने के लिए 15 दिनों के भीतर जीवन प्रमाण पत्र जमा करें।',
      speech:
        'इस पत्र में लिखा है कि पेंशन चालू रखने के लिए पंद्रह दिनों में जीवन प्रमाण पत्र देना होगा।',
    },
  },
  'en-IN': {
    intake: {
      display:
        'Detected issue: Pension stopped. Clarifying question: Kaunsi pension? (Which pension scheme?)',
      speech:
        'Ramabai, I understand your pension has stopped. Which pension scheme were you receiving?',
    },
    intakeUnknownRetry: {
      display:
        'I could not confidently identify the service. Please describe your issue once more.',
      speech:
        'I could not understand the service needed. Please try telling me once more.',
    },
    intakeUnknownMadad: {
      display:
        'Service still unclear after retry. Routing to Madad Kendra (Citizen Help Center).',
      speech:
        'Please connect with the Madad Kendra help center for direct assistance.',
    },
    answer: {
      display:
        'Recorded: Old-Age Pension. Aapko pension chalu karwani hai, sahi? (Confirm Pension Restoration?)',
      speech: 'Recorded Old-Age Pension. You want to restore your pension, right?',
    },
    confirmService: {
      display:
        'Confirmed service: Pension Restoration (Confidence: 96%). Proceed to Gate 1 (Consent).',
      speech:
        'Pension Restoration service is confirmed. Please review and give your consent.',
    },
    consent: {
      display:
        'Informed consent recorded (Gate 1). Your documents will only be used to prepare this pension restoration application.',
      speech: 'Thank you Ramabai, your consent has been recorded.',
    },
    consentDeclined: {
      display: 'Consent declined. Flow stopped and nothing has been saved.',
      speech: 'Understood. We have stopped the process and saved nothing.',
    },
    docsCollecting: {
      display:
        'Checking documents: Aadhaar Card (XXXX-XXXX-4821), Bank Passbook (XXXXXXXX9012), Life Certificate.',
      speech: 'Checking your Aadhaar card, bank passbook, and life certificate.',
    },
    docsBlurry: {
      display:
        'Photo dhundhli hai, dobara (Photo is blurry, please retake a clear photo).',
      speech: 'The photo is blurry, please take it again clearly.',
    },
    docsExpired: {
      display:
        'Life certificate purana hai (Life certificate is outdated, please capture the renewed certificate).',
      speech: 'The life certificate is old, please provide the renewed certificate.',
    },
    docsReady: {
      display: 'All 3 required documents are verified and ready (DOCS_READY).',
      speech:
        'All your documents are verified and ready. Now we can fill the draft form.',
    },
    fillDraft: {
      display:
        'Portal form filled as a DRAFT only. Please review and approve at Gate 2. We never submit without your explicit approval.',
      speech:
        'Ramabai, I have prepared the draft form. Please review and approve it before submission.',
    },
    approve: {
      display:
        'Citizen approval recorded (approval.given = true). Submission gate is now unlocked.',
      speech: 'Your approval is recorded. We are now ready to submit the application.',
    },
    submit: {
      display:
        'Application submitted! Official Application ID: PEN-2026-88213.',
      speech:
        'Congratulations Ramabai! Your application has been submitted with ID PEN-2026-88213.',
    },
    tracking: {
      display:
        'Tracking PEN-2026-88213: Under verification at Taluka Social Welfare Office.',
      speech:
        'Your application PEN-2026-88213 is currently being verified at the Taluka office.',
    },
    queryRaised: {
      display:
        'Officer Query Raised: Digital Life Certificate (Jeevan Pramaan) re-verification required.',
      speech:
        'The office raised a query asking to re-verify your Digital Life Certificate.',
    },
    stalled: {
      display:
        'Stall detected after 15 days of inactivity (STALLED: 7 din se ruka hai). NagarSathi can place a follow-up call to the office.',
      speech:
        'Your application has been stalled for fifteen days. Shall I call the office to follow up?',
    },
    callStart: {
      display:
        'Initiating simulated follow-up call to Taluka Social Welfare Office...',
      speech: 'Calling the Taluka Social Welfare Office now.',
    },
    callTurn: {
      display:
        'Officer: Checked application PEN-2026-88213, verified Jeevan Pramaan certificate on file.',
      speech: 'The officer confirmed that your life certificate is verified.',
    },
    callEnd: {
      display:
        'Office call completed! Escalation Reference: REF-5521. File moved for final disbursement (3 din mein dekhenge, REF-5521).',
      speech: 'The office call is complete with reference number REF-5521.',
    },
    closed: {
      display:
        'Case CLOSED! Application PEN-2026-88213 approved and pension restored (Ref: REF-5521).',
      speech:
        'Wonderful news Ramabai! Your pension has been restored and the case is now closed.',
    },
    letterExplain: {
      display:
        'Letter from Taluka Office: Submit Life Certificate within 15 days to resume pension disbursement.',
      speech:
        'This letter is from the Taluka office asking you to submit your life certificate within fifteen days.',
    },
  },
};

export function getAgentCopy(lang, key) {
  const validLang = requireValidLanguage(lang);
  return AGENT_COPY[validLang][key] || AGENT_COPY['mr-IN'][key];
}

export const DEFAULT_CHECKLIST = [
  {
    id: 'aadhaar_card',
    name: 'Aadhaar Card',
    status: 'VERIFIED',
    maskedValue: 'XXXX-XXXX-4821',
  },
  {
    id: 'bank_passbook',
    name: 'Bank Passbook (IFSC: MAHB0001234)',
    status: 'VERIFIED',
    maskedValue: 'XXXXXXXX9012',
  },
  {
    id: 'life_certificate',
    name: 'Digital Life Certificate (Jeevan Pramaan)',
    status: 'VERIFIED',
    maskedValue: 'JP-2026-9910',
  },
];

export const DEFAULT_DRAFT = {
  isDraft: true,
  serviceId: 'pension_restoration',
  portalName: 'Maharashtra Social Justice & Special Assistance Portal (Mock)',
  fields: [
    {
      key: 'applicantName',
      label: 'Applicant Name',
      value: 'Ramabai Kulkarni',
      source: 'PROFILE',
    },
    {
      key: 'aadhaarMasked',
      label: 'Aadhaar Number (Masked)',
      value: 'XXXX-XXXX-4821',
      source: 'PROFILE',
    },
    {
      key: 'phoneMasked',
      label: 'Mobile Number (Masked)',
      value: 'XXXXXX3210',
      source: 'PROFILE',
    },
    {
      key: 'bankAccountMasked',
      label: 'Bank Account Number (Masked)',
      value: 'XXXXXXXX9012',
      source: 'DOCUMENT',
    },
    {
      key: 'lifeCertId',
      label: 'Jeevan Pramaan Certificate ID',
      value: 'JP-2026-9910',
      source: 'DOCUMENT',
    },
    {
      key: 'schemeType',
      label: 'Pension Scheme Selected',
      value: 'Old-Age Pension (Sanjay Gandhi Niradhar)',
      source: 'ASK_CITIZEN',
    },
    {
      key: 'seniorCategory',
      label: 'Age & Senior Citizen Category',
      value: '68 Years — Priority Senior Citizen',
      source: 'DERIVED',
    },
    {
      key: 'applicationCategory',
      label: 'Application Type',
      value: 'Restoration of Interrupted Pension',
      source: 'DEFAULT',
    },
    {
      key: 'portalDraftRef',
      label: 'Portal Draft Reference',
      value: 'DRAFT-MH-2026-0091',
      source: 'PORTAL_GENERATED',
    },
  ],
};

/**
 * Creates a thin adapter over `/models` (currently deterministic multilingual stubs
 * returning `{ display, speech, data }`).
 * Every method strictly enforces that `language` (or `lang`) is passed and valid.
 */
export function createAgentAdapter({
  modelsClient = defaultModelsClient,
} = {}) {
  return {
    /**
     * 1. Intake Agent (`/agents/intake`):
     * Classifies citizen utterance, asks clarifying questions, and confirms service.
     */
    async intake(params = {}) {
      const lang = requireValidLanguage(params.language ?? params.lang);
      const action = params.action || 'classify';
      const safeTranscript = maskForLlm(
        params.transcript || 'Meri pension band ho gayi'
      );

      if (modelsClient?.intake) {
        return modelsClient.intake({
          ...params,
          transcript: safeTranscript,
          language: lang,
        });
      }

      if (action === 'clarify') {
        const answer = maskForLlm(params.answer || 'old_age_pension');
        const fieldId = params.fieldId || 'pensionType';
        const copy = getAgentCopy(lang, 'answer');
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId: params.caseId || 'CASE-PEN-2026-001',
            status: 'INTAKE',
            updatedFields: { [fieldId]: answer },
            nextQuestion: null,
            readyForServiceConfirm: true,
            language: lang,
          },
        };
      }

      if (action === 'confirm') {
        const copy = getAgentCopy(lang, 'confirmService');
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId: params.caseId || 'CASE-PEN-2026-001',
            status: 'SERVICE_CONFIRMED',
            serviceId: params.serviceId || 'pension_restoration',
            confidence: 0.96,
            language: lang,
          },
        };
      }

      const lower = String(safeTranscript).toLowerCase();
      const isUnknown =
        lower.includes('unknown') ||
        lower.includes('अस्पष्ट') ||
        lower.includes('xyz');

      if (isUnknown) {
        const attempts = Number(params.unknownAttempts || 1);
        const showMadadKendra = attempts >= 2;
        const copy = getAgentCopy(
          lang,
          showMadadKendra ? 'intakeUnknownMadad' : 'intakeUnknownRetry'
        );
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId: params.caseId || 'CASE-PEN-2026-001',
            status: 'INTAKE',
            service: null,
            confidence: 0.22,
            unknownAttempts: attempts,
            madadKendra: showMadadKendra,
            language: lang,
          },
        };
      }

      const copy = getAgentCopy(lang, 'intake');
      return {
        display: copy.display,
        speech: copy.speech,
        data: {
          caseId: params.caseId || 'CASE-PEN-2026-001',
          status: 'INTAKE',
          service: {
            id: 'pension_restoration',
            catalogId: 'pension',
            name: 'Old Age Pension Restoration',
          },
          confidence: 0.96,
          clarifyingQuestion: 'kaunsi pension?',
          options: ['old_age_pension', 'widow_disability_pension'],
          language: lang,
        },
      };
    },

    /**
     * 2. Documents Agent (`/agents/documents`):
     * Validates uploaded documents, detects blurry/expired issues, and reports DOCS_READY.
     */
    async documents(params = {}) {
      const lang = requireValidLanguage(params.language ?? params.lang);
      if (modelsClient?.documents) {
        return modelsClient.documents({ ...params, language: lang });
      }

      const caseId = params.caseId || 'CASE-PEN-2026-001';
      const simulateIssue = params.simulateIssue || null;
      const markReady = Boolean(params.markReady);

      if (simulateIssue === 'blurry') {
        const copy = getAgentCopy(lang, 'docsBlurry');
        const checklist = DEFAULT_CHECKLIST.map((d, idx) =>
          idx === 2 ? { ...d, status: 'RETRY_BLURRY' } : d
        );
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId,
            status: 'DOCS_COLLECTING',
            issue: 'PHOTO_BLURRY',
            checklist,
            language: lang,
          },
        };
      }

      if (simulateIssue === 'expired') {
        const copy = getAgentCopy(lang, 'docsExpired');
        const checklist = DEFAULT_CHECKLIST.map((d, idx) =>
          idx === 2 ? { ...d, status: 'RETRY_EXPIRED' } : d
        );
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId,
            status: 'DOCS_COLLECTING',
            issue: 'LIFE_CERT_EXPIRED',
            checklist,
            language: lang,
          },
        };
      }

      const status = markReady ? 'DOCS_READY' : 'DOCS_COLLECTING';
      const copy = getAgentCopy(lang, markReady ? 'docsReady' : 'docsCollecting');
      return {
        display: copy.display,
        speech: copy.speech,
        data: {
          caseId,
          status,
          issue: null,
          checklist: DEFAULT_CHECKLIST,
          language: lang,
        },
      };
    },

    /**
     * 3. Portal Agent (`/agents/portal`):
     * Summarizes draft form filling (`FORM_FILLED`) or final approved submission (`SUBMITTED`).
     */
    async portal(params = {}) {
      const lang = requireValidLanguage(params.language ?? params.lang);
      if (modelsClient?.portal) {
        return modelsClient.portal({ ...params, language: lang });
      }

      const action = params.action || 'fillDraft';
      const caseId = params.caseId || 'CASE-PEN-2026-001';

      if (action === 'submit') {
        const appId = params.applicationId || 'PEN-2026-88213';
        const copy = getAgentCopy(lang, 'submit');
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId,
            status: 'SUBMITTED',
            applicationId: appId,
            submittedAt: params.submittedAt || new Date().toISOString(),
            language: lang,
          },
        };
      }

      const copy = getAgentCopy(lang, 'fillDraft');
      return {
        display: copy.display,
        speech: copy.speech,
        data: {
          caseId,
          status: 'FORM_FILLED',
          draft: params.draft || DEFAULT_DRAFT,
          language: lang,
        },
      };
    },

    /**
     * 4. Tracker Agent (`/agents/tracker`):
     * Explains application status (`TRACKING`, `QUERY_RAISED`, `STALLED`, `CLOSED`).
     */
    async tracker(params = {}) {
      const lang = requireValidLanguage(params.language ?? params.lang);
      if (modelsClient?.tracker) {
        return modelsClient.tracker({ ...params, language: lang });
      }

      const action = params.action || 'track';
      const caseId = params.caseId || 'CASE-PEN-2026-001';
      const appId = params.applicationId || 'PEN-2026-88213';

      if (action === 'query' || params.status === 'QUERY_RAISED') {
        const copy = getAgentCopy(lang, 'queryRaised');
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId,
            status: 'QUERY_RAISED',
            applicationId: appId,
            query: params.query || {
              code: 'LIFE_CERT_PENDING',
              message: 'Re-verify Jeevan Pramaan certificate',
            },
            language: lang,
          },
        };
      }

      if (action === 'stalled' || params.status === 'STALLED') {
        const days = Number(params.days || params.daysElapsed || 21);
        const copy = getAgentCopy(lang, 'stalled');
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId,
            status: 'STALLED',
            applicationId: appId,
            daysSkipped: days,
            stalled: true,
            language: lang,
          },
        };
      }

      if (action === 'close' || params.status === 'CLOSED') {
        const copy = getAgentCopy(lang, 'closed');
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId,
            status: 'CLOSED',
            applicationId: appId,
            referenceId: params.referenceId || 'REF-5521',
            resolution: 'PENSION_RESTORED',
            language: lang,
          },
        };
      }

      const copy = getAgentCopy(lang, 'tracking');
      return {
        display: copy.display,
        speech: copy.speech,
        data: {
          caseId,
          status: 'TRACKING',
          applicationId: appId,
          tracking: params.tracking || {
            stage: 'Taluka Social Welfare Verification',
            daysElapsed: Number(params.daysElapsed || 2),
            stalled: false,
            query: null,
            lastUpdated: new Date().toISOString(),
          },
          language: lang,
        },
      };
    },

    /**
     * 5. Caller Agent (`/agents/caller`):
     * Conducts simulated office call (`start`, `turn`, `end`), extracts reference number (`REF-5521`),
     * and schedules next check in 3 days.
     */
    async caller(params = {}) {
      const lang = requireValidLanguage(params.language ?? params.lang);
      if (modelsClient?.caller) {
        return modelsClient.caller({ ...params, language: lang });
      }

      const action = params.action || 'start';
      const caseId = params.caseId || 'CASE-PEN-2026-001';
      const callId = params.callId || 'CALL-SIM-001';
      const appId = params.applicationId || 'PEN-2026-88213';

      if (action === 'turn') {
        const rawOfficer =
          params.officerUtterance ||
          `Application ${appId} life certificate JP-2026-9910 is verified. Forwarding for disbursement under reference REF-5521.`;
        const safeOfficerText = maskForLlm(rawOfficer);
        const refMatch = safeOfficerText.match(/REF-\d+/i);
        const extractedRefId = refMatch ? refMatch[0].toUpperCase() : 'REF-5521';
        const copy = getAgentCopy(lang, 'callTurn');

        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId,
            callId,
            extractedRefId,
            turn: {
              speaker: 'PORTAL_OFFICER',
              text: safeOfficerText,
            },
            completed: true,
            language: lang,
          },
        };
      }

      if (action === 'end') {
        const referenceId = params.referenceId || 'REF-5521';
        const copy = getAgentCopy(lang, 'callEnd');
        return {
          display: copy.display,
          speech: copy.speech,
          data: {
            caseId,
            callId,
            status: 'CALLED',
            referenceId,
            nextCheckInDays: 3,
            summary:
              'Officer verified Jeevan Pramaan and logged escalation reference REF-5521.',
            language: lang,
          },
        };
      }

      const copy = getAgentCopy(lang, 'callStart');
      return {
        display: copy.display,
        speech: copy.speech,
        data: {
          caseId,
          callId,
          status: 'IN_PROGRESS',
          turns: [
            {
              speaker: 'NAGARSATHI_AGENT',
              text: `Namaskar, calling on behalf of senior citizen Ramabai Kulkarni regarding stalled pension application ${appId}.`,
            },
          ],
          language: lang,
        },
      };
    },

    /**
     * 6. Letter Explainer Agent (`/agents/letter`):
     * Explains an official government letter in simple citizen language ("Ye chitthi samjhao").
     */
    async letter(params = {}) {
      const lang = requireValidLanguage(params.language ?? params.lang);
      const safeText = maskForLlm(params.text || '');

      if (modelsClient?.letter) {
        return modelsClient.letter({
          ...params,
          text: safeText,
          language: lang,
        });
      }

      const copy = getAgentCopy(lang, 'letterExplain');
      return {
        display: copy.display,
        speech: copy.speech,
        data: {
          sender: 'Taluka Social Welfare Office, Pune',
          reason:
            'Annual Digital Life Certificate (Jeevan Pramaan) verification pending',
          actionRequired:
            'Submit Jeevan Pramaan ID along with Pension Restoration form',
          deadline: '15 days',
          language: lang,
        },
      };
    },
  };
}

export const defaultAgentAdapter = createAgentAdapter();

