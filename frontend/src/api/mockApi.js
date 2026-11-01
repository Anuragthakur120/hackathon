import {
  CASE_STATUS,
  createInitialCaseState,
  transitionCaseState,
} from '../state/caseMachine.js';
import { normalizeLangCode } from '../i18n/index.js';
import { askBackendAssistant } from './voiceApi.js';
import {
  MOCK_SCHEMES,
  MOCK_NOTIFICATIONS,
  MOCK_VAULT_DOCUMENTS,
  MOCK_APPLICATIONS,
  MOCK_SUPPORT_TICKETS,
} from './mockData.js';

const COPY = {
  'mr-IN': {
    otpSent: {
      display: 'तुमच्या मोबाईल क्रमांकावर ओटीपी पाठवला आहे (मॉक ओटीपी: 123456).',
      speech: 'तुमच्या मोबाईलवर ओटीपी पाठवला आहे.',
    },
    otpVerified: {
      display: 'रमाबाई कुलकर्णी, तुमचे स्वागत आहे. तुमची ओळख पटली आहे.',
      speech: 'नमस्कार रमाबाई, तुमचे स्वागत आहे.',
    },
    intake: {
      display: 'तुमचे पेन्शन थांबले आहे हे समजले. कृपया सांगा: कोणती पेन्शन? (Kaunsi pension?)',
      speech: 'रमाबाई, तुमचे पेन्शन थांबले आहे हे समजले. कोणती पेन्शन बंद झाली आहे?',
    },
    intakeUnknownRetry: {
      display: 'मला तुमची समस्या नीट समजली नाही. कृपया पुन्हा एकदा स्पष्टपणे सांगा.',
      speech: 'क्षमा करा, मला समजले नाही. कृपया पुन्हा एकदा सांगा.',
    },
    intakeUnknownMadad: {
      display: 'आम्हाला तुमची सेवा निश्चित करता आली नाही. कृपया मदत केंद्राशी (Madad Kendra) संपर्क साधा.',
      speech: 'कृपया जवळच्या मदत केंद्राशी संपर्क साधा.',
    },
    answer: {
      display: 'तुमची माहिती नोंदवली आहे: वृद्धापकाळ पेन्शन. तुम्हाला पेन्शन पुन्हा सुरू करायची आहे, बरोबर?',
      speech: 'तुम्हाला वृद्धापकाळ पेन्शन पुन्हा सुरू करायची आहे, बरोबर ना?',
    },
    confirmService: {
      display: 'पेन्शन पुनर्संचयित सेवा निश्चित केली आहे (विश्वासार्हता: ९६%). आता संमती द्या (Gate 1).',
      speech: 'पेन्शन पुनर्संचयित सेवा निश्चित झाली आहे. आता कृपया तुमची संमती द्या.',
    },
    consent: {
      display: 'तुमची संमती नोंदवली आहे (Gate 1). आम्ही तुमची कागदपत्रे केवळ या अर्जासाठी वापरू.',
      speech: 'धन्यवाद रमाबाई, तुमची संमती नोंदवली गेली आहे.',
    },
    consentDeclined: {
      display: 'तुम्ही संमती नाकारली आहे. कोणतीही माहिती जतन केलेली नाही.',
      speech: 'ठीक आहे, आम्ही कोणतीही माहिती जतन केलेली नाही.',
    },
    docsCollecting: {
      display: 'कागदपत्रे तपासणी सुरू आहे: आधार कार्ड (XXXX-XXXX-4821), बँक पासबुक (XXXXXXXX9012), हयातीचा दाखला.',
      speech: 'आधार कार्ड आणि बँक खात्याची माहिती तपासली जात आहे.',
    },
    docsBlurry: {
      display: 'फोटो अंधूक आहे, कृपया पुन्हा काढा (Photo dhundhli hai, dobara).',
      speech: 'फोटो अंधूक आला आहे, कृपया पुन्हा एकदा स्पष्ट फोटो काढा.',
    },
    docsExpired: {
      display: 'हयातीचा दाखला जुना आहे, कृपया चालू वर्षाचा दाखला द्या (Life certificate purana hai).',
      speech: 'हयातीचा दाखला जुना आहे, कृपया नवीन दाखल्याचा फोटो काढा.',
    },
    docsReady: {
      display: 'सर्व ३ आवश्यक कागदपत्रे पडताळली आणि तयार आहेत (DOCS_READY).',
      speech: 'तुमची सर्व कागदपत्रे तयार आहेत. आता आपण अर्जाचा मसुदा भरूया.',
    },
    fillDraft: {
      display: 'अर्जाचा मसुदा (DRAFT) तयार केला आहे. कृपया तपासा आणि मंजुरी द्या (Gate 2). तुमच्या मंजुरीशिवाय अर्ज सादर केला जाणार नाही.',
      speech: 'रमाबाई, तुमचा अर्जाचा मसुदा तयार आहे. कृपया तो तपासून मंजुरी द्या.',
    },
    approve: {
      display: 'तुम्ही मसुद्याला स्पष्ट मंजुरी दिली आहे (approval.given = true). आता अर्ज सादर करता येईल.',
      speech: 'तुमची मंजुरी मिळाली आहे. आता आपण अर्ज सादर करू शकतो.',
    },
    submit: {
      display: 'अर्ज यशस्वीरित्या सादर केला! अर्ज क्रमांक: PEN-2026-88213.',
      speech: 'अभिनंदन रमाबाई! तुमचा पेन्शन अर्ज सादर झाला आहे. अर्ज क्रमांक पी ई एन २०२६ ८८२१३ आहे.',
    },
    tracking: {
      display: 'अर्ज क्रमांक PEN-2026-88213 चा मागोवा सुरू आहे: तालुका कार्यालयात पडताळणी प्रलंबित.',
      speech: 'तुमचा अर्ज सध्या तालुका कार्यालयात तपासणीसाठी आहे.',
    },
    queryRaised: {
      display: 'कार्यालयाने चौकशी केली आहे: डिजिटल हयातीचा दाखला पुन्हा जोडणे आवश्यक आहे.',
      speech: 'कार्यालयाकडून एक सूचना आली आहे: हयातीचा दाखला पुन्हा तपासावा लागेल.',
    },
    stalled: {
      display: '१५ दिवस उलटूनही अर्जावर कार्यवाही झालेली नाही (STALLED). नगरसाथी कार्यालयाला कॉल करू शकतो.',
      speech: 'पंधरा दिवस झाले तरी अर्जावर पुढे काम झाले नाही. मी कार्यालयाला फोन करू का?',
    },
    callStart: {
      display: 'तालुका समाजकल्याण कार्यालयाशी सिम्युलेटेड कॉल सुरू झाला आहे...',
      speech: 'तालुका कार्यालयाला फोन लावला आहे.',
    },
    callTurn: {
      display: 'अधिकारी: अर्ज PEN-2026-88213 तपासला, हयातीचा दाखला मंजूर केला आहे.',
      speech: 'अधिकाऱ्यांनी सांगितले की तुमचा दाखला मंजूर झाला आहे.',
    },
    callEnd: {
      display: 'कॉल पूर्ण झाला! संदर्भ क्रमांक: REF-5521. पेन्शन मंजुरी प्रक्रिया पुन्हा सुरू झाली.',
      speech: 'फोनवर बोलणे झाले आहे. संदर्भ क्रमांक आर ई एफ ५५२१ मिळाला आहे.',
    },
    closed: {
      display: 'प्रकरण यशस्वीरित्या पूर्ण झाले (CLOSED)! अर्ज PEN-2026-88213 मंजूर, संदर्भ REF-5521.',
      speech: 'आनंदाची बातमी रमाबाई! तुमचे पेन्शन पुन्हा सुरू झाले आहे आणि प्रकरण पूर्ण झाले आहे.',
    },
    profile: {
      display: 'नागरिक प्रोफाइल: रमाबाई कुलकर्णी (आधार: XXXX-XXXX-4821, बँक: XXXXXXXX9012).',
      speech: 'ही तुमची सुरक्षित प्रोफाइल माहिती आहे.',
    },
    profileDeleted: {
      display: 'तुमचा सर्व डेटा सुरक्षितपणे हटवला गेला आहे.',
      speech: 'तुमची सर्व माहिती हटवण्यात आली आहे.',
    },
    letterExplain: {
      display: 'हे पत्र तालुका कार्यालयाकडून आले आहे: पेन्शन सुरू ठेवण्यासाठी १५ दिवसांत हयातीचा दाखला सादर करावा.',
      speech: 'या पत्रात लिहिले आहे की पेन्शन सुरू ठेवण्यासाठी पंधरा दिवसांत हयातीचा दाखला द्यावा लागेल.',
    },
    reset: {
      display: 'डेमो पुन्हा सुरुवातीच्या स्थितीत (INTAKE) आणला आहे.',
      speech: 'डेमो पुन्हा सुरू केला आहे.',
    },
  },
  'hi-IN': {
    otpSent: {
      display: 'आपके मोबाइल नंबर पर ओटीपी भेजा गया है (मॉक ओटीपी: 123456)।',
      speech: 'आपके मोबाइल पर ओटीपी भेजा गया है।',
    },
    otpVerified: {
      display: 'रमाबाई कुलकर्णी, आपका स्वागत है। आपकी पहचान सत्यापित हो गई है।',
      speech: 'नमस्ते रमाबाई, आपका स्वागत है।',
    },
    intake: {
      display: 'आपकी पेंशन रुक गई है। कृपया बताएँ: कौनसी पेंशन? (Kaunsi pension?)',
      speech: 'रमाबाई, आपकी पेंशन रुक गई है। कृपया बताएँ कौनसी पेंशन बंद हुई है?',
    },
    intakeUnknownRetry: {
      display: 'हमें आपकी समस्या स्पष्ट नहीं हुई। कृपया एक बार फिर से बताएँ।',
      speech: 'क्षमा करें, समझ नहीं आया। कृपया फिर से बताएँ।',
    },
    intakeUnknownMadad: {
      display: 'हम सेवा की पहचान नहीं कर सके। कृपया मदद केंद्र (Madad Kendra) से संपर्क करें।',
      speech: 'कृपया नज़दीकी मदद केंद्र से संपर्क करें।',
    },
    answer: {
      display: 'आपका उत्तर दर्ज किया गया: वृद्धावस्था पेंशन। आपको पेंशन चालू करवानी है, सही?',
      speech: 'आपको वृद्धावस्था पेंशन फिर से चालू करवानी है, सही?',
    },
    confirmService: {
      display: 'पेंशन बहाली सेवा की पुष्टि हो गई है (विश्वसनीयता: 96%)। अब सहमति दें (Gate 1)।',
      speech: 'पेंशन बहाली सेवा पक्की हो गई है। अब कृपया सहमति दें।',
    },
    consent: {
      display: 'आपकी सहमति दर्ज कर ली गई है (Gate 1)। हम आपके दस्तावेज़ केवल इसी आवेदन के लिए उपयोग करेंगे।',
      speech: 'धन्यवाद रमाबाई, आपकी सहमति दर्ज हो गई है।',
    },
    consentDeclined: {
      display: 'आपने सहमति नहीं दी। कोई भी जानकारी सेव नहीं की गई है।',
      speech: 'ठीक है, कोई भी डेटा सेव नहीं किया गया है।',
    },
    docsCollecting: {
      display: 'दस्तावेज़ जाँच जारी: आधार कार्ड (XXXX-XXXX-4821), बैंक पासबुक (XXXXXXXX9012), जीवन प्रमाण पत्र।',
      speech: 'आधार कार्ड और बैंक खाते के दस्तावेज़ जाँचे जा रहे हैं।',
    },
    docsBlurry: {
      display: 'फोटो धुंधली है, दोबारा खींचें (Photo dhundhli hai, dobara)।',
      speech: 'फोटो धुंधली है, कृपया दोबारा साफ फोटो खींचें।',
    },
    docsExpired: {
      display: 'जीवन प्रमाण पत्र पुराना है, कृपया नया प्रमाण पत्र दें (Life certificate purana hai)।',
      speech: 'जीवन प्रमाण पत्र पुराना है, कृपया नया प्रमाण पत्र दिखाएँ।',
    },
    docsReady: {
      display: 'तीनों आवश्यक दस्तावेज़ सत्यापित और तैयार हैं (DOCS_READY)।',
      speech: 'आपके सभी दस्तावेज़ तैयार हैं। अब हम ड्राफ्ट फॉर्म भरेंगे।',
    },
    fillDraft: {
      display: 'फॉर्म का ड्राफ्ट (DRAFT) तैयार है। कृपया जाँच करें और मंज़ूरी दें (Gate 2)। आपकी मंज़ूरी के बिना फॉर्म सबमिट नहीं होगा।',
      speech: 'रमाबाई, आपके फॉर्म का ड्राफ्ट तैयार है। कृपया इसे मंज़ूरी दें।',
    },
    approve: {
      display: 'आपने ड्राफ्ट को स्पष्ट मंज़ूरी दे दी है (approval.given = true)। अब आवेदन सबमिट किया जा सकता है।',
      speech: 'आपकी मंज़ूरी मिल गई है। अब हम फॉर्म सबमिट कर सकते हैं।',
    },
    submit: {
      display: 'आवेदन सफलतापूर्वक सबमिट हुआ! आवेदन संख्या: PEN-2026-88213।',
      speech: 'बधाई हो रमाबाई! आपका पेंशन आवेदन सबमिट हो गया है। आवेदन संख्या पी ई एन 2026 88213 है।',
    },
    tracking: {
      display: 'आवेदन PEN-2026-88213 की ट्रैकिंग: तहसील कार्यालय में सत्यापन लंबित।',
      speech: 'आपका आवेदन अभी तहसील कार्यालय में जाँच के लिए है।',
    },
    queryRaised: {
      display: 'कार्यालय ने आपत्ति उठाई है: डिजिटल जीवन प्रमाण पत्र पुनः संलग्न करना आवश्यक है।',
      speech: 'कार्यालय से सूचना आई है कि जीवन प्रमाण पत्र फिर से दिखाना होगा।',
    },
    stalled: {
      display: '15 दिन बीतने पर भी आवेदन आगे नहीं बढ़ा (STALLED)। नगरसाथी कार्यालय को कॉल कर सकता है।',
      speech: 'पंद्रह दिन हो गए हैं और फाइल रुकी हुई है। क्या मैं कार्यालय में फोन करूँ?',
    },
    callStart: {
      display: 'तहसील समाज कल्याण कार्यालय के साथ सिम्युलेटेड कॉल शुरू...',
      speech: 'तहसील कार्यालय में फोन लगाया जा रहा है।',
    },
    callTurn: {
      display: 'अधिकारी: आवेदन PEN-2026-88213 की जाँच की गई, जीवन प्रमाण पत्र स्वीकृत किया गया।',
      speech: 'अधिकारी ने बताया कि आपका प्रमाण पत्र स्वीकार कर लिया गया है।',
    },
    callEnd: {
      display: 'कॉल समाप्त! संदर्भ संख्या: REF-5521। पेंशन बहाली प्रक्रिया फिर से शुरू।',
      speech: 'फोन पर बात पूरी हो गई है। संदर्भ संख्या आर ई एफ 5521 मिली है।',
    },
    closed: {
      display: 'मामला सफलतापूर्वक पूर्ण हुआ (CLOSED)! आवेदन PEN-2026-88213 स्वीकृत, संदर्भ REF-5521।',
      speech: 'खुशखबरी रमाबाई! आपकी पेंशन फिर से शुरू हो गई है और मामला पूरा हो गया है।',
    },
    profile: {
      display: 'नागरिक प्रोफ़ाइल: रमाबाई कुलकर्णी (आधार: XXXX-XXXX-4821, बैंक: XXXXXXXX9012)।',
      speech: 'यह आपकी सुरक्षित प्रोफ़ाइल जानकारी है।',
    },
    profileDeleted: {
      display: 'आपका सारा डेटा सुरक्षित रूप से हटा दिया गया है।',
      speech: 'आपकी सभी जानकारी हटा दी गई है।',
    },
    letterExplain: {
      display: 'यह पत्र तहसील कार्यालय से है: पेंशन जारी रखने के लिए 15 दिनों के भीतर जीवन प्रमाण पत्र जमा करें।',
      speech: 'इस पत्र में लिखा है कि पेंशन चालू रखने के लिए पंद्रह दिनों में जीवन प्रमाण पत्र देना होगा।',
    },
    reset: {
      display: 'डेमो को प्रारंभिक स्थिति (INTAKE) में रीसेट कर दिया गया है।',
      speech: 'डेमो रीसेट हो गया है।',
    },
  },
  'en-IN': {
    otpSent: {
      display: 'OTP sent to your mobile number (Mock OTP: 123456).',
      speech: 'An OTP has been sent to your mobile phone.',
    },
    otpVerified: {
      display: 'Welcome, Ramabai Kulkarni. Your identity has been verified.',
      speech: 'Welcome Ramabai, your account is verified.',
    },
    intake: {
      display: 'Detected issue: Pension stopped. Clarifying question: Kaunsi pension? (Which pension scheme?)',
      speech: 'Ramabai, I understand your pension has stopped. Which pension scheme were you receiving?',
    },
    intakeUnknownRetry: {
      display: 'I could not confidently identify the service. Please describe your issue once more.',
      speech: 'I could not understand the service needed. Please try telling me once more.',
    },
    intakeUnknownMadad: {
      display: 'Service still unclear after retry. Routing to Madad Kendra (Citizen Help Center).',
      speech: 'Please connect with the Madad Kendra help center for direct assistance.',
    },
    answer: {
      display: 'Recorded: Old-Age Pension. Aapko pension chalu karwani hai, sahi? (Confirm Pension Restoration?)',
      speech: 'Recorded Old-Age Pension. You want to restore your pension, right?',
    },
    confirmService: {
      display: 'Confirmed service: Pension Restoration (Confidence: 96%). Proceed to Gate 1 (Consent).',
      speech: 'Pension Restoration service is confirmed. Please review and give your consent.',
    },
    consent: {
      display: 'Informed consent recorded (Gate 1). Your documents will only be used to prepare this pension restoration application.',
      speech: 'Thank you Ramabai, your consent has been recorded.',
    },
    consentDeclined: {
      display: 'Consent declined. Flow stopped and nothing has been saved.',
      speech: 'Understood. We have stopped the process and saved nothing.',
    },
    docsCollecting: {
      display: 'Checking documents: Aadhaar Card (XXXX-XXXX-4821), Bank Passbook (XXXXXXXX9012), Life Certificate.',
      speech: 'Checking your Aadhaar card, bank passbook, and life certificate.',
    },
    docsBlurry: {
      display: 'Photo dhundhli hai, dobara (Photo is blurry, please retake a clear photo).',
      speech: 'The photo is blurry, please take it again clearly.',
    },
    docsExpired: {
      display: 'Life certificate purana hai (Life certificate is outdated, please capture the renewed certificate).',
      speech: 'The life certificate is old, please provide the renewed certificate.',
    },
    docsReady: {
      display: 'All 3 required documents are verified and ready (DOCS_READY).',
      speech: 'All your documents are verified and ready. Now we can fill the draft form.',
    },
    fillDraft: {
      display: 'Portal form filled as a DRAFT only. Please review and approve at Gate 2. We never submit without your explicit approval.',
      speech: 'Ramabai, I have prepared the draft form. Please review and approve it before submission.',
    },
    approve: {
      display: 'Citizen approval recorded (approval.given = true). Submission gate is now unlocked.',
      speech: 'Your approval is recorded. We are now ready to submit the application.',
    },
    submit: {
      display: 'Application submitted! Official Application ID: PEN-2026-88213.',
      speech: 'Congratulations Ramabai! Your application has been submitted with ID PEN-2026-88213.',
    },
    tracking: {
      display: 'Tracking PEN-2026-88213: Under verification at Taluka Social Welfare Office.',
      speech: 'Your application PEN-2026-88213 is currently being verified at the Taluka office.',
    },
    queryRaised: {
      display: 'Officer Query Raised: Digital Life Certificate (Jeevan Pramaan) re-verification required.',
      speech: 'The office raised a query asking to re-verify your Digital Life Certificate.',
    },
    stalled: {
      display: 'Stall detected after 15 days of inactivity (STALLED). NagarSathi can place a follow-up call to the office.',
      speech: 'Your application has been stalled for fifteen days. Shall I call the office to follow up?',
    },
    callStart: {
      display: 'Initiating simulated follow-up call to Taluka Social Welfare Office...',
      speech: 'Calling the Taluka Social Welfare Office now.',
    },
    callTurn: {
      display: 'Officer: Checked application PEN-2026-88213, verified Jeevan Pramaan certificate on file.',
      speech: 'The officer confirmed that your life certificate is verified.',
    },
    callEnd: {
      display: 'Office call completed! Escalation Reference: REF-5521. File moved for final disbursement.',
      speech: 'The office call is complete with reference number REF-5521.',
    },
    closed: {
      display: 'Case CLOSED! Application PEN-2026-88213 approved and pension restored (Ref: REF-5521).',
      speech: 'Wonderful news Ramabai! Your pension has been restored and the case is now closed.',
    },
    profile: {
      display: 'Citizen Profile: Ramabai Kulkarni (Aadhaar: XXXX-XXXX-4821, Bank: XXXXXXXX9012).',
      speech: 'Here is your masked citizen profile.',
    },
    profileDeleted: {
      display: 'All your personal data and case records have been permanently deleted.',
      speech: 'All your personal data has been deleted.',
    },
    letterExplain: {
      display: 'Letter from Taluka Office: Submit Life Certificate within 15 days to resume pension disbursement.',
      speech: 'This letter is from the Taluka office asking you to submit your life certificate within fifteen days.',
    },
    reset: {
      display: 'Demo state reset to initial INTAKE status.',
      speech: 'The demo has been reset.',
    },
  },
};

function getCopy(lang, key) {
  const normalized = normalizeLangCode(lang);
  return (
    (COPY[normalized] && COPY[normalized][key]) ||
    COPY['en-IN'][key] ||
    COPY['mr-IN'][key]
  );
}

let mockStore = createInitialCaseState('en-IN');
let unknownAttempts = 0;

const userDocStorage = new Map();
const userAppStorage = new Map();
const userNotifStorage = new Map();

export function getActiveCitizenData() {
  let user = null;
  if (typeof window !== 'undefined' && window.__nagarsathi_auth_store) {
    user = window.__nagarsathi_auth_store.getState().user;
  }
  const uid = user?.id || user?.phone || 'CITIZEN-RAMABAI-01';
  const isDemo = uid === 'CITIZEN-RAMABAI-01' || user?.phone === '9876543210';

  if (!userDocStorage.has(uid)) {
    userDocStorage.set(uid, isDemo ? JSON.parse(JSON.stringify(MOCK_VAULT_DOCUMENTS)) : []);
  }
  if (!userAppStorage.has(uid)) {
    let initialApps = isDemo ? JSON.parse(JSON.stringify(MOCK_APPLICATIONS)) : [];
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`nagarsathi_user_apps_${uid}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialApps = parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    userAppStorage.set(uid, initialApps);
  }
  if (!userNotifStorage.has(uid)) {
    userNotifStorage.set(uid, isDemo ? JSON.parse(JSON.stringify(MOCK_NOTIFICATIONS)) : []);
  }

  return {
    uid,
    user,
    docs: userDocStorage.get(uid),
    apps: userAppStorage.get(uid),
    notifs: userNotifStorage.get(uid),
  };
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

function createAuthInterface() {
  const authFn = function auth() {};
  authFn.sendOtp = async function sendOtp({ phone = '9876543210', mode = 'login', language = 'en-IN' } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'otpSent');
    const last4 = String(phone).slice(-4);
    return {
      display: c.display,
      speech: c.speech,
      data: {
        phoneMasked: `XXXXXX${last4}`,
        otpSent: true,
        mode,
        language: lang,
      },
    };
  };

  authFn.verifyOtp = async function verifyOtp({ phone = '9876543210', otp = '123456', language = 'en-IN' } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'otpVerified');
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const last4 = cleanPhone.slice(-4);
    const isRamabai = cleanPhone === '9876543210';
    return {
      display: c.display,
      speech: c.speech,
      data: {
        authenticated: otp === '123456',
        token: `mock-jwt-token-${last4}`,
        user: {
          id: isRamabai ? 'CITIZEN-RAMABAI-01' : `CITIZEN-${cleanPhone}`,
          name: isRamabai ? 'Ramabai Kulkarni' : 'Citizen',
          phone: cleanPhone,
          phoneMasked: `XXXXXX${last4}`,
          aadhaarMasked: isRamabai ? 'XXXX-XXXX-4821' : null,
          bankAccountMasked: isRamabai ? 'XXXXXXXX9012' : null,
          language: lang,
          role: 'citizen',
        },
      },
    };
  };

  authFn.signup = async function signup({ _name = 'Ramabai Kulkarni', phone = '9876543210', language = 'en-IN', termsAccepted = true } = {}) {
    if (!termsAccepted) {
      throw new Error('TERMS_REQUIRED');
    }
    return authFn.sendOtp({ phone, mode: 'signup', language });
  };

  authFn.me = async function me({ language = 'en-IN' } = {}) {
    const lang = normalizeLangCode(language);
    return {
      display: 'Active citizen session verified',
      speech: 'Session active',
      data: {
        id: 'CITIZEN-RAMABAI-01',
        name: 'Ramabai Kulkarni',
        phone: '9876543210',
        phoneMasked: 'XXXXXX3210',
        language: lang,
        role: 'citizen',
      },
    };
  };

  authFn.logout = async function logout({ language = 'en-IN' } = {}) {
    return {
      display: 'Logged out successfully',
      speech: 'Logged out',
      data: { loggedOut: true, language: normalizeLangCode(language) },
    };
  };

  return authFn;
}

export const mockApi = {
  auth: createAuthInterface(),

  getState() {
    return { ...mockStore };
  },

  async requestOtp({ phone = '9876543210', language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'otpSent');
    const last4 = String(phone).slice(-4);
    return {
      display: c.display,
      speech: c.speech,
      data: {
        phoneMasked: `XXXXXX${last4}`,
        otpSent: true,
        mode: 'mock',
        language: lang,
      },
    };
  },

  async verifyOtp({ otp = '123456', language = mockStore.language } = {}) {
    const c = getCopy(language, 'otpVerified');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        authenticated: otp === '123456',
        citizen: {
          id: 'CITIZEN-RAMABAI-01',
          name: 'Ramabai Kulkarni',
          age: 68,
          language: normalizeLangCode(language),
          aadhaarMasked: 'XXXX-XXXX-4821',
          phoneMasked: 'XXXXXX3210',
          bankAccountMasked: 'XXXXXXXX9012',
        },
      },
    };
  },

  async createCaseFromTranscript({
    transcript = 'Meri pension band ho gayi',
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    const normalizedText = String(transcript || '').toLowerCase();
    const isUnknown =
      normalizedText.includes('unknown') ||
      normalizedText.includes('अस्पष्ट') ||
      normalizedText.includes('xyz');

    if (isUnknown) {
      unknownAttempts += 1;
      const showMadadKendra = unknownAttempts >= 2;
      const c = getCopy(
        lang,
        showMadadKendra ? 'intakeUnknownMadad' : 'intakeUnknownRetry'
      );
      return {
        display: c.display,
        speech: c.speech,
        data: {
          caseId: mockStore.id,
          status: CASE_STATUS.INTAKE,
          service: null,
          confidence: 0.22,
          unknownAttempts,
          madadKendra: showMadadKendra,
          language: lang,
        },
      };
    }

    unknownAttempts = 0;
    mockStore = {
      ...createInitialCaseState(lang),
      status: CASE_STATUS.INTAKE,
      serviceId: 'pension_restoration',
      serviceName: 'Old Age Pension Restoration',
      confidence: 0.96,
      transcript,
    };
    const c = getCopy(lang, 'intake');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId: mockStore.id,
        status: mockStore.status,
        service: {
          id: 'pension_restoration',
          name: 'Old Age Pension Restoration',
        },
        confidence: 0.96,
        clarifyingQuestion: 'kaunsi pension?',
        options: ['old_age_pension', 'widow_disability_pension'],
        language: lang,
      },
    };
  },

  async answerCaseQuestion({
    caseId = mockStore.id,
    answer = 'old_age_pension',
    fieldId = 'pensionType',
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'answer');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        updatedFields: { [fieldId]: answer },
        nextQuestion: null,
        readyForServiceConfirm: true,
      },
    };
  },

  async confirmService({
    caseId = mockStore.id,
    serviceId = 'pension_restoration',
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    mockStore = transitionCaseState(mockStore, CASE_STATUS.SERVICE_CONFIRMED, {
      serviceId,
      serviceName: 'Old Age Pension Restoration',
      confidence: 0.96,
      language: lang,
    });
    const c = getCopy(lang, 'confirmService');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        serviceId,
        confidence: 0.96,
      },
    };
  },

  async giveConsent({
    caseId = mockStore.id,
    given = true,
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    if (!given) {
      const c = getCopy(lang, 'consentDeclined');
      return {
        display: c.display,
        speech: c.speech,
        data: {
          caseId,
          status: mockStore.status,
          halted: true,
          consent: { given: false, timestamp: new Date().toISOString() },
        },
      };
    }

    const consentObj = {
      given: true,
      timestamp: new Date().toISOString(),
    };
    mockStore = transitionCaseState(mockStore, CASE_STATUS.CONSENTED, {
      consent: consentObj,
      language: lang,
    });
    const c = getCopy(lang, 'consent');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        consent: consentObj,
      },
    };
  },

  async uploadDocuments({
    caseId = mockStore.id,
    markReady = false,
    simulateIssue = null,
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);

    if (simulateIssue === 'blurry') {
      mockStore = transitionCaseState(mockStore, CASE_STATUS.DOCS_COLLECTING, {
        documents: DEFAULT_CHECKLIST.map((d, idx) =>
          idx === 2 ? { ...d, status: 'RETRY_BLURRY' } : d
        ),
        language: lang,
      });
      const c = getCopy(lang, 'docsBlurry');
      return {
        display: c.display,
        speech: c.speech,
        data: {
          caseId,
          status: mockStore.status,
          issue: 'PHOTO_BLURRY',
          checklist: mockStore.documents,
        },
      };
    }

    if (simulateIssue === 'expired') {
      mockStore = transitionCaseState(mockStore, CASE_STATUS.DOCS_COLLECTING, {
        documents: DEFAULT_CHECKLIST.map((d, idx) =>
          idx === 2 ? { ...d, status: 'RETRY_EXPIRED' } : d
        ),
        language: lang,
      });
      const c = getCopy(lang, 'docsExpired');
      return {
        display: c.display,
        speech: c.speech,
        data: {
          caseId,
          status: mockStore.status,
          issue: 'LIFE_CERT_EXPIRED',
          checklist: mockStore.documents,
        },
      };
    }

    const targetStatus = markReady
      ? CASE_STATUS.DOCS_READY
      : CASE_STATUS.DOCS_COLLECTING;

    mockStore = transitionCaseState(mockStore, targetStatus, {
      documents: DEFAULT_CHECKLIST,
      language: lang,
    });
    const c = getCopy(lang, markReady ? 'docsReady' : 'docsCollecting');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        issue: null,
        checklist: DEFAULT_CHECKLIST,
      },
    };
  },

  async fillDraft({ caseId = mockStore.id, language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    if (
      mockStore.status === CASE_STATUS.CONSENTED ||
      mockStore.status === CASE_STATUS.DOCS_COLLECTING
    ) {
      mockStore = transitionCaseState(mockStore, CASE_STATUS.DOCS_READY, {
        documents: DEFAULT_CHECKLIST,
      });
    }
    mockStore = transitionCaseState(mockStore, CASE_STATUS.FORM_FILLED, {
      draft: DEFAULT_DRAFT,
      approval: { given: false, timestamp: null },
      language: lang,
    });
    const c = getCopy(lang, 'fillDraft');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        draft: DEFAULT_DRAFT,
      },
    };
  },

  initializeWizardCase({ schemeId = 'scholarship', language = 'en-IN' } = {}) {
    const lang = normalizeLangCode(language);
    mockStore = {
      ...createInitialCaseState(lang),
      id: `CASE-${Date.now()}`,
      serviceId: schemeId,
      status: CASE_STATUS.INTAKE,
      language: lang,
    };
    return {
      status: 'ok',
      caseId: mockStore.id,
      data: mockStore,
    };
  },

  async approveDraft({
    caseId = mockStore.id,
    given = true,
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    const approval = {
      given: Boolean(given),
      timestamp: new Date().toISOString(),
    };

    // Auto-advance case state sequence if the citizen applied directly through the wizard
    if (mockStore.status !== CASE_STATUS.FORM_FILLED && mockStore.status !== CASE_STATUS.APPROVED) {
      if (mockStore.status === CASE_STATUS.INTAKE) {
        mockStore = transitionCaseState(mockStore, CASE_STATUS.SERVICE_CONFIRMED, { language: lang });
      }
      if (mockStore.status === CASE_STATUS.SERVICE_CONFIRMED) {
        mockStore = transitionCaseState(mockStore, CASE_STATUS.CONSENTED, { consent: { given: true }, language: lang });
      }
      if (mockStore.status === CASE_STATUS.CONSENTED || mockStore.status === CASE_STATUS.DOCS_COLLECTING) {
        mockStore = transitionCaseState(mockStore, CASE_STATUS.DOCS_READY, { language: lang });
      }
      if (mockStore.status === CASE_STATUS.DOCS_READY) {
        mockStore = transitionCaseState(mockStore, CASE_STATUS.FORM_FILLED, { language: lang });
      }
    }

    mockStore = transitionCaseState(mockStore, CASE_STATUS.APPROVED, {
      approval,
      language: lang,
    });
    const c = getCopy(lang, 'approve');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        approval,
      },
    };
  },

  async submitApplication({
    caseId = mockStore.id,
    language = mockStore.language,
    applicationId = null,
    schemeId = null,
    schemeName = null,
    department = null,
    applicantName = null,
  } = {}) {
    const lang = normalizeLangCode(language);
    const isScholar = String(schemeId || '').includes('scholar');
    const isInc = String(schemeId || '').includes('income');
    const isRat = String(schemeId || '').includes('ration');

    const finalAppId =
      applicationId ||
      (isScholar
        ? `SCH-2026-${Math.floor(10000 + Math.random() * 90000)}`
        : isInc
        ? `INC-2026-${Math.floor(10000 + Math.random() * 90000)}`
        : isRat
        ? `RAT-2026-${Math.floor(10000 + Math.random() * 90000)}`
        : 'PEN-2026-88213');

    const submittedAt = new Date().toISOString();

    mockStore = transitionCaseState(mockStore, CASE_STATUS.SUBMITTED, {
      submission: {
        applicationId: finalAppId,
        submittedAt,
      },
      language: lang,
    });

    // Persist to citizen's active application records so it displays in My Applications & Dashboard
    const { apps, uid } = getActiveCitizenData();
    const createdRecord = {
      id: caseId || `CASE-${Date.now()}`,
      applicationId: finalAppId,
      referenceNumber: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'SUBMITTED',
      scheme: schemeId || (isScholar ? 'scholarship' : isInc ? 'income_certificate' : isRat ? 'ration' : 'pension'),
      schemeName: schemeName || (isScholar ? 'MPTASS / MahaDBT Scholarship' : isInc ? 'Tahsildar Income Certificate' : isRat ? 'National Food Security Card (Ration)' : 'Sanjay Gandhi Niradhar Old Age Pension'),
      service: isScholar ? 'scholarship' : isInc ? 'income_certificate' : isRat ? 'ration' : 'pension',
      department: department || (isScholar ? 'College / Institute Verification Desk (MPTASS)' : isInc ? 'District Revenue & Tahsildar Office' : 'Taluka Social Welfare Office, Pune'),
      applicantName: applicantName || 'Ramabai Kulkarni',
      submittedAt,
      daysElapsed: 0,
      estimatedTimeline: '7 to 14 Working Days',
      daysRemaining: 12,
      stalled: false,
      queryActive: false,
      timeline: [
        { stage: 'SUBMITTED', title: 'Application Submitted Online', description: `Application received with ID: ${finalAppId}`, status: 'COMPLETED', timestamp: submittedAt },
        { stage: 'UNDER_REVIEW', title: 'Desk Verification In Progress', description: isScholar ? 'Assigned to College Principal & Nodal Officer Committee' : 'Assigned to Ward Verification Desk (7-14 Days SLA)', status: 'CURRENT', timestamp: submittedAt },
        { stage: 'APPROVED', title: 'Official Sanction Order', description: 'Benefit disbursement via Direct Benefit Transfer (DBT)', status: 'PENDING', timestamp: null },
      ],
      nextAction: isScholar
        ? 'Under institutional scrutiny by your college. Estimated time: 7 to 14 days.'
        : 'Under official scrutiny. Estimated processing time: 7 to 14 days.',
    };

    const existingIdx = apps.findIndex((a) => a.applicationId === finalAppId || a.id === caseId);
    if (existingIdx >= 0) {
      apps[existingIdx] = { ...apps[existingIdx], ...createdRecord };
    } else {
      apps.unshift(createdRecord);
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`nagarsathi_user_apps_${uid}`, JSON.stringify(apps));
      } catch {
        // ignore
      }
    }

    const c = getCopy(lang, 'submit');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        applicationId: finalAppId,
        submittedAt,
        application: createdRecord,
      },
    };
  },

  async getCaseStatus({
    caseId = mockStore.id,
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    if (
      mockStore.status === CASE_STATUS.SUBMITTED ||
      mockStore.status === CASE_STATUS.CALLED ||
      mockStore.status === CASE_STATUS.QUERY_RAISED
    ) {
      mockStore = transitionCaseState(mockStore, CASE_STATUS.TRACKING, {
        tracking: {
          stage: 'Taluka Social Welfare Verification',
          daysElapsed: mockStore.status === CASE_STATUS.CALLED ? 16 : 2,
          stalled: false,
          query: null,
          lastUpdated: new Date().toISOString(),
        },
        language: lang,
      });
    }
    const c = getCopy(lang, 'tracking');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        applicationId: 'PEN-2026-88213',
        approval: mockStore.approval,
        draft: mockStore.draft,
        tracking: mockStore.tracking || {
          stage: 'Taluka Social Welfare Verification',
          daysElapsed: 2,
          stalled: false,
          query: null,
          lastUpdated: new Date().toISOString(),
        },
      },
    };
  },

  async startCall({ caseId = mockStore.id, language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'callStart');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        callId: 'CALL-SIM-001',
        status: 'IN_PROGRESS',
        turns: [
          {
            speaker: 'NAGARSATHI_AGENT',
            text: 'Namaskar, calling on behalf of senior citizen Ramabai Kulkarni regarding stalled pension application PEN-2026-88213.',
          },
        ],
      },
    };
  },

  async callTurn({
    caseId = mockStore.id,
    callId = 'CALL-SIM-001',
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'callTurn');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        callId,
        turn: {
          speaker: 'PORTAL_OFFICER',
          text: 'Application PEN-2026-88213 life certificate JP-2026-9910 is verified. Forwarding for disbursement under reference REF-5521.',
        },
        completed: true,
      },
    };
  },

  async endCall({
    caseId = mockStore.id,
    callId = 'CALL-SIM-001',
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    mockStore = transitionCaseState(mockStore, CASE_STATUS.CALLED, {
      callRecord: {
        callId,
        referenceId: 'REF-5521',
        completedAt: new Date().toISOString(),
      },
      language: lang,
    });
    const c = getCopy(lang, 'callEnd');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        referenceId: 'REF-5521',
        summary: 'Officer verified Jeevan Pramaan and logged escalation reference REF-5521.',
      },
    };
  },

  async getProfile({ language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'profile');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        citizen: {
          id: 'CITIZEN-RAMABAI-01',
          name: 'Ramabai Kulkarni',
          age: 68,
          language: lang,
          aadhaarMasked: 'XXXX-XXXX-4821',
          phoneMasked: 'XXXXXX3210',
          bankAccountMasked: 'XXXXXXXX9012',
        },
      },
    };
  },

  async patchProfile({
    name = 'Ramabai Kulkarni',
    saveProfile = true,
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    mockStore.language = lang;
    const c = getCopy(lang, 'profile');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        citizen: {
          id: 'CITIZEN-RAMABAI-01',
          name,
          age: 68,
          saveProfile,
          language: lang,
          aadhaarMasked: 'XXXX-XXXX-4821',
          phoneMasked: 'XXXXXX3210',
          bankAccountMasked: 'XXXXXXXX9012',
        },
      },
    };
  },

  async deleteProfile({ language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'profileDeleted');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        deleted: true,
      },
    };
  },

  async deleteAllMyData({ language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    mockStore = createInitialCaseState(lang);
    unknownAttempts = 0;
    const c = getCopy(lang, 'profileDeleted');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        purged: true,
        deletedCases: 1,
        timestamp: new Date().toISOString(),
      },
    };
  },

  async explainLetter({ language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    const c = getCopy(lang, 'letterExplain');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        sender: 'Taluka Social Welfare Office, Pune',
        reason: 'Annual Digital Life Certificate (Jeevan Pramaan) verification pending',
        actionRequired: 'Submit Jeevan Pramaan ID along with Pension Restoration form',
        deadline: '15 days',
      },
    };
  },

  async demoRaiseQuery({
    caseId = mockStore.id,
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    mockStore = transitionCaseState(mockStore, CASE_STATUS.QUERY_RAISED, {
      tracking: {
        ...(mockStore.tracking || {}),
        query: {
          code: 'LIFE_CERT_PENDING',
          message: 'Re-verify Jeevan Pramaan certificate',
        },
      },
      language: lang,
    });
    const c = getCopy(lang, 'queryRaised');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        query: {
          code: 'LIFE_CERT_PENDING',
          message: 'Re-verify Jeevan Pramaan certificate',
        },
      },
    };
  },

  async demoSkipDays({
    caseId = mockStore.id,
    days = 15,
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    mockStore = transitionCaseState(mockStore, CASE_STATUS.STALLED, {
      tracking: {
        ...(mockStore.tracking || {}),
        daysElapsed: days,
        stalled: true,
      },
      language: lang,
    });
    const c = getCopy(lang, 'stalled');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        daysSkipped: days,
        stalled: true,
      },
    };
  },

  async demoApproveAndClose({
    caseId = mockStore.id,
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    mockStore = transitionCaseState(mockStore, CASE_STATUS.CLOSED, {
      language: lang,
    });
    const c = getCopy(lang, 'closed');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        applicationId: 'PEN-2026-88213',
        referenceId: 'REF-5521',
        resolution: 'PENSION_RESTORED',
      },
    };
  },

  async demoReset({ language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    mockStore = createInitialCaseState(lang);
    unknownAttempts = 0;
    userDocStorage.clear();
    userAppStorage.clear();
    userNotifStorage.clear();
    try {
      if (typeof window !== 'undefined') {
        if (window.__nagarsathi_auth_store) {
          window.__nagarsathi_auth_store.getState().setDemoSession({
            id: 'CITIZEN-RAMABAI-01',
            name: 'Ramabai Kulkarni',
            phone: '9876543210',
            language: lang,
            role: 'citizen',
            aadhaarMasked: 'XXXX-XXXX-4821',
            phoneMasked: 'XXXXXX3210',
            bankAccountMasked: 'XXXXXXXX9012',
          });
        }
        if (window.localStorage) {
          window.localStorage.setItem(
            'nagarsathi_auth',
            JSON.stringify({
              state: {
                user: {
                  id: 'CITIZEN-RAMABAI-01',
                  name: 'Ramabai Kulkarni',
                  phone: '9876543210',
                  language: lang,
                  role: 'citizen',
                  aadhaarMasked: 'XXXX-XXXX-4821',
                  phoneMasked: 'XXXXXX3210',
                  bankAccountMasked: 'XXXXXXXX9012',
                },
                token: 'mock-jwt-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.nagarsathi-demo-token',
                registeredUsers: [
                  {
                    id: 'CITIZEN-RAMABAI-01',
                    name: 'Ramabai Kulkarni',
                    phone: '9876543210',
                    language: lang,
                    role: 'citizen',
                  },
                ],
              },
              version: 0,
            })
          );
        }
      }
    } catch {
      // Ignore
    }
    const c = getCopy(lang, 'reset');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId: mockStore.id,
        status: mockStore.status,
        reset: true,
        language: lang,
      },
    };
  },

  // ==========================================================================
  // Citizen Platform Extended Methods (Schemes, Eligibility, Applications, etc.)
  // ==========================================================================
  async getSchemes({ category, search, state, page = 1, limit = 20, sort = 'relevance' } = {}) {
    let list = [...MOCK_SCHEMES];
    if (category && category !== 'All') {
      list = list.filter((s) => String(s.category).toLowerCase() === String(category).toLowerCase());
    }
    if (state && state !== 'All') {
      list = list.filter(
        (s) =>
          s.eligibilityCriteria?.state === 'All India' ||
          String(s.eligibilityCriteria?.state).toLowerCase().includes(String(state).toLowerCase())
      );
    }
    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name?.en?.toLowerCase().includes(q) ||
          s.name?.hi?.toLowerCase().includes(q) ||
          s.name?.mr?.toLowerCase().includes(q) ||
          s.description?.en?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q)
      );
    }
    if (sort === 'newest') {
      list.reverse();
    }
    const total = list.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = list.slice(startIndex, startIndex + Number(limit));
    return {
      display: `${total} शासकीय योजना उपलब्ध आहेत`,
      speech: `${total} सरकारी योजना उपलब्ध आहेत.`,
      data: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
        schemes: paginated,
      },
    };
  },

  async getSchemeById(id) {
    const scheme = MOCK_SCHEMES.find((s) => s.schemeId === id || s.code === id) || MOCK_SCHEMES[0];
    return {
      display: scheme.name?.mr || scheme.name?.en,
      speech: scheme.name?.mr || scheme.name?.en,
      data: { scheme },
    };
  },

  async checkEligibility({ age = 68, gender = 'Female', state = 'Maharashtra', income = 24000 } = {}) {
    const eligible = [];
    const potentiallyEligible = [];
    const notEligible = [];

    for (const s of MOCK_SCHEMES) {
      const crit = s.eligibilityCriteria || {};
      let pts = 0;
      const reasons = [];
      const missing = [];

      const numAge = Number(age);
      if (numAge >= (crit.minAge ?? 0) && numAge <= (crit.maxAge ?? 120)) {
        pts += 1;
        reasons.push(`Age ${numAge} qualifies (${crit.minAge}-${crit.maxAge} years)`);
      } else {
        missing.push(`Age criteria not met (${crit.minAge}-${crit.maxAge} years)`);
      }

      if (!crit.gender || crit.gender === 'All' || crit.gender === gender) {
        pts += 1;
        reasons.push(`Gender requirement met (${gender})`);
      } else {
        missing.push(`Scheme is exclusively for ${crit.gender}`);
      }

      if (!crit.state || crit.state === 'All India' || String(crit.state).toLowerCase().includes(String(state).toLowerCase())) {
        pts += 1;
        reasons.push(`State domicile verified (${state})`);
      } else {
        missing.push(`Requires residence in ${crit.state}`);
      }

      const numIncome = Number(income);
      if (!crit.maxIncome || numIncome <= crit.maxIncome) {
        pts += 1;
        reasons.push(crit.maxIncome ? `Family income within ₹${crit.maxIncome} limit` : 'No income cap');
      } else {
        missing.push(`Income exceeds cap of ₹${crit.maxIncome}`);
      }

      const matchScore = Math.round((pts / 4) * 100);
      const item = {
        schemeId: s.schemeId,
        code: s.code,
        name: s.name,
        category: s.category,
        benefits: s.benefits,
        matchScore,
        reasons,
        missingRequirements: missing,
        icon: s.icon,
      };

      if (matchScore >= 75) eligible.push(item);
      else if (matchScore >= 50) potentiallyEligible.push(item);
      else notEligible.push(item);
    }

    return {
      display: `${eligible.length} योजनांसाठी पात्रता सिद्ध झाली आहे`,
      speech: `तुम्ही ${eligible.length} योजनांसाठी पात्र आहात.`,
      data: {
        eligible,
        potentiallyEligible,
        notEligible,
        totalEvaluated: MOCK_SCHEMES.length,
        disclaimer:
          'NagarSathi AI Eligibility is an informational recommendation based on user-provided inputs. Official sanction is subject to document scrutiny by the competent government department.',
      },
    };
  },

  async getApplications() {
    const { apps } = getActiveCitizenData();
    return {
      display: `${apps.length} सक्रिय अर्ज (My Applications)`,
      speech: `तुमचे ${apps.length} अर्ज नोंदवले आहेत.`,
      data: {
        total: apps.length,
        applications: apps,
      },
    };
  },

  async getApplicationTracking(id = 'CASE-DEMO-001') {
    const { apps } = getActiveCitizenData();
    const app = apps.find((a) => a.id === id || a.applicationId === id) || apps[0] || {
      id,
      applicationId: id,
      referenceNumber: 'REF-5521',
      status: 'TRACKING',
      department: 'Social Welfare Department',
      service: 'pension',
      stalled: false,
      queryActive: false,
    };
    const timeline = [
      { stage: 'INTAKE', title: 'Intake Completed', description: 'Problem identified and consent recorded', status: 'COMPLETED', timestamp: '2026-10-01T09:30:00Z' },
      { stage: 'DOCS_READY', title: 'Document Verification', description: 'Aadhaar, Income Certificate, and Life Certificate verified', status: 'COMPLETED', timestamp: '2026-10-01T09:45:00Z' },
      { stage: 'APPROVED', title: 'Citizen Physical Approval', description: 'Draft reviewed and confirmed with Gate 2 button', status: 'COMPLETED', timestamp: '2026-10-01T09:55:00Z' },
      { stage: 'SUBMITTED', title: 'Submitted to Department', description: `Application ID: ${app.applicationId}`, status: 'COMPLETED', timestamp: '2026-10-01T10:00:00Z' },
      { stage: 'QUERY_RAISED', title: 'Office Query Raised', description: 'Life certificate re-verification requested by Taluka office', status: app.queryActive ? 'CURRENT' : 'COMPLETED', timestamp: '2026-10-11T10:00:00Z' },
      { stage: 'STALLED', title: 'Delay Detected (+21 Days)', description: 'Stalled for over 7 days at Ward Verification Desk', status: app.stalled ? 'CURRENT' : 'COMPLETED', timestamp: '2026-10-22T10:00:00Z' },
      { stage: 'CLOSED', title: 'Benefit Sanction & Disbursement', description: 'Monthly pension restored to bank account', status: app.status === 'CLOSED' ? 'COMPLETED' : 'PENDING', timestamp: null },
    ];

    return {
      display: `अर्ज ट्रॅकिंग: ${app.applicationId} (${app.status})`,
      speech: 'अर्जाची सद्यस्थिती उपलब्ध आहे.',
      data: {
        caseId: app.id,
        applicationId: app.applicationId,
        referenceNumber: app.referenceNumber,
        status: app.status,
        department: app.department,
        scheme: app.service,
        daysElapsed: 21,
        stalled: app.stalled,
        queryActive: app.queryActive,
        timeline,
        nextAction: app.stalled
          ? 'Simulate Office Call with AI Caller to expedite resolution'
          : 'Routine tracking active (next portal check in 3 days)',
      },
    };
  },

  async getDocuments() {
    const { docs } = getActiveCitizenData();
    return {
      display: `${docs.length} कागदपत्रे डिजिटल व्हॉल्टमध्ये सुरक्षित आहेत`,
      speech: `व्हॉल्टमध्ये ${docs.length} कागदपत्रे आहेत.`,
      data: {
        total: docs.length,
        documents: docs,
      },
    };
  },

  async uploadDocument({ type = 'income_certificate', category = 'Income Proof', fileName = 'doc.pdf', fileSize = 350000, mimeType = 'application/pdf', contentBase64 = '' } = {}) {
    const { docs } = getActiveCitizenData();
    const newDoc = {
      id: `doc-${Date.now()}`,
      type,
      status: 'PENDING_VERIFICATION',
      maskedSummary: `DOC-PENDING-${Date.now().toString().slice(-4)}`,
      fileName,
      fileSize: fileSize || 350000,
      category,
      mimeType: mimeType || 'application/pdf',
      contentBase64,
      issuedAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      verification: null,
    };
    docs.unshift(newDoc);
    return {
      display: 'कागदपत्र अपलोड झाले आहे. पडताळणी प्रलंबित आहे (Pending Verification)',
      speech: 'कागदपत्र अपलोड झाले आहे. कृपया पडताळणी करा.',
      data: { document: newDoc },
    };
  },

  async verifyDocument(id) {
    const { docs } = getActiveCitizenData();
    const doc = docs.find((d) => d.id === id);
    if (doc) {
      doc.status = 'VERIFIED';
      doc.verification = {
        method: 'STRUCTURAL_CHECKS',
        checkedAt: new Date().toISOString(),
        reviewRequired: false,
        disclaimer: 'Document successfully uploaded and passed basic checks. Official verification is pending.',
        extractedData: {
          documentType: doc.type,
          fileName: doc.fileName,
          hash: `sha256-verified-${doc.id}`,
        },
        checks: [
          { id: 'file_readable', label: 'Stored file can be read', passed: true },
          { id: 'file_signature', label: 'File content matches its type', passed: true },
          { id: 'file_size', label: 'File is not suspiciously small or oversized (<=10MB)', passed: true },
          { id: 'checksum', label: 'SHA-256 checksum and format integrity verified', passed: true },
        ],
      };
    }
    return {
      display: 'कागदपत्र मूलभूत तपासणी उत्तीर्ण (Passed Basic Checks)',
      speech: 'कागदपत्र पडताळले गेले आहे.',
      data: {
        id,
        status: 'VERIFIED',
        document: doc,
        verification: doc?.verification || { status: 'VERIFIED' },
      },
    };
  },

  async verifyAllDocuments(ids = null) {
    const { docs } = getActiveCitizenData();
    const targets = docs.filter(
      (d) => (!ids || ids.includes(d.id)) && (d.status === 'PENDING_VERIFICATION' || d.status === 'UNDER_REVIEW')
    );
    targets.forEach((d) => {
      d.status = 'VERIFIED';
      d.verification = {
        method: 'STRUCTURAL_CHECKS',
        checkedAt: new Date().toISOString(),
        reviewRequired: false,
        disclaimer: 'Document successfully uploaded and passed basic checks. Official verification is pending.',
        checks: [{ id: 'auto_pass', label: 'Automated structure & format checks passed', passed: true }],
      };
    });
    return {
      display: `${targets.length} कागदपत्रे पडताळली आहेत.`,
      speech: 'सर्व कागदपत्रे पडताळली गेली आहेत.',
      data: { checked: targets.length, documents: docs },
    };
  },

  async deleteDocument(id) {
    const { docs } = getActiveCitizenData();
    const idx = docs.findIndex((d) => d.id === id);
    if (idx !== -1) docs.splice(idx, 1);
    return {
      display: 'कागदपत्र हटवले आहे (Document Deleted)',
      speech: 'कागदपत्र हटवले आहे.',
      data: { deleted: true },
    };
  },

  async createApplicationDraft(data = {}) {
    const { apps, user } = getActiveCitizenData();
    const newCase = {
      id: `CASE-DRAFT-${Date.now().toString().slice(-4)}`,
      caseId: `CASE-DRAFT-${Date.now().toString().slice(-4)}`,
      applicationId: `NGS-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      referenceNumber: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      schemeId: data.schemeId || 'pension',
      schemeName: data.schemeName || 'Government Scheme',
      formData: data.formData || {},
      status: 'INTAKE',
      applicantName: user?.name || 'Citizen',
      createdAt: new Date().toISOString(),
    };
    apps.unshift(newCase);
    return {
      display: 'मसुदा तयार केला आहे',
      speech: 'अर्जाचा मसुदा तयार केला आहे.',
      data: { application: newCase },
    };
  },

  async updateApplicationDraft(id, patch = {}) {
    return {
      display: 'मसुदा जतन केला आहे',
      speech: 'माहिती जतन केली आहे.',
      data: { application: { id, ...patch } },
    };
  },

  async reuploadDocument(id, doc = {}) {
    return {
      display: 'कागदपत्र पुन्हा अपलोड केले आहे (Re-uploaded)',
      speech: 'कागदपत्र पुन्हा अपलोड झाले आहे.',
      data: { id, ...doc, status: 'PENDING_VERIFICATION' },
    };
  },

  async sendAssistantMessage({ message, language = 'en-IN', detectedLang = null } = {}) {
    // Languages the offline mock cannot write (Gujarati, Bengali, Tamil...) are answered by the backend
    // /api/assistant (LLM rewrite in the user's script). Falls back to the local reply if it is unreachable.
    if (detectedLang && !/^(en|hi|mr)/i.test(detectedLang)) {
      try {
        return await askBackendAssistant({ message, language, detectedLang });
      } catch {
        // Backend unavailable; proceed with local mock reply below.
      }
    }
    const lang = normalizeLangCode(
      detectedLang && /^(en|hi|mr)/i.test(detectedLang) ? detectedLang : language
    );
    const msg = String(message || '').trim().toLowerCase();

    // 1. Spoken voice-driven form filling detection
    const nameMatch = msg.match(/(?:mera naam|my name is|maze naav)\s+([\p{L}]+)/iu);
    const stateMatch = msg.match(/(?:madhya pradesh|maharashtra|mp|mh|uttar pradesh|up|delhi|gujarat|bihar)/i);
    if (nameMatch || stateMatch) {
      const extractedName = nameMatch ? nameMatch[1] : '';
      const extractedState = stateMatch ? stateMatch[0] : '';
      const reply = lang === 'hi-IN'
        ? `मैंने आपका विवरण नोट किया: नाम: "${extractedName || 'प्रविष्ट'}", राज्य: "${extractedState || 'प्रविष्ट'}". क्या आप इसे प्रोफ़ाइल में सहेजना चाहते हैं?`
        : lang === 'mr-IN'
        ? `मी तुमचे तपशील नोंदवले: नाव: "${extractedName || 'नोंदवले'}", राज्य: "${extractedState || 'नोंदवले'}". तुम्हाला हे सेव्ह करायचे आहे का?`
        : `I captured your details: Name: "${extractedName || 'Provided'}", State: "${extractedState || 'Provided'}". Would you like to confirm and save this to your profile?`;
      return {
        display: reply,
        speech: reply,
        data: {
          reply,
          status: 'ok',
          agent: { id: 'portal', name: 'NagarSathi Form Agent' },
          extractedForm: {
            fullName: extractedName,
            state: extractedState,
          },
          action: { type: 'form_preview', to: '/profile' },
          nextStep: { label: 'Confirm & Save to Profile', to: '/profile' },
          suggestedActions: [
            { label: 'Confirm Details', query: 'Yes, save to my profile' },
            { label: 'Edit Info', query: 'No, let me change the details' },
          ],
        },
      };
    }

    // 2. Domain Intent Handling
    let reply = '';
    let actionTo = '/schemes';
    let nextStepLabel = 'Explore Schemes';
    let suggestedActions = [];

    // Check specific domains (Scholarship, Income Certificate, Ration Card, Aadhaar, Housing, Pension)
    const isScholarship = /scholar|scholarship|scholars|छात्रवृत्ति|शिष्यवृत्ती|mahadbt|mptass|college|student/i.test(msg);
    const isIncome = /income|उत्पन्न|दाखला|आय प्रमाण|aay praman|tahsildar/i.test(msg);
    const isRation = /ration|राशन|रेशन|शिधापत्रिका|nfsa|khadyann/i.test(msg);
    const isAadhaar = /aadhaar|aadhar|आधार/i.test(msg);
    const isHousing = /awas|housing|pmay|घरकुल|आवास|मकान/i.test(msg);
    const isPension = /pension|पेन्शन|पेंशन|वृद्धावस्था|old age/i.test(msg);
    const isApply = /apply|apply for|kaise|kaisa|karen|karein|form|start|chahiye|chahie|aavedan|आवेदन|अर्ज|भरना|भरायचा/i.test(msg);
    const isStatus = /status|track|tracking|स्थिति|ट्रॅक|स्टेटस|kahan tak/i.test(msg);
    const isDocs = /document|documents|kagad|kagaz|dastavej|कागद|दस्तावेज/i.test(msg);
    const isEligible = /eligible|eligibility|patra|patrata|पात्र|पात्रता|qualify/i.test(msg);

    if (isScholarship) {
      if (isApply || (!isStatus && !isDocs && !isEligible)) {
        reply = lang === 'hi-IN'
          ? 'पोस्ट-मैट्रिक / महाडीबीटी / एमपीटीएएस छात्रवृत्ति के लिए आवेदन:\n1. पात्रता: मान्यता प्राप्त कॉलेज/डिप्लोमा में नामांकित, पारिवारिक वार्षिक आय ₹2.5 लाख से कम।\n2. आवश्यक दस्तावेज: आय प्रमाण पत्र, पिछली अंकतालिका, अधिवास प्रमाण पत्र, कॉलेज शुल्क रसीद, बैंक पासबुक।\n3. चरण: नीचे "Apply for Scholarship" पर क्लिक करें -> विद्यार्थी विवरण की पुष्टि करें -> कॉलेज व पाठ्यक्रम कोड चुनें -> कॉलेज स्तर के सत्यापन के लिए जमा करें (7-14 कार्य दिवस)।'
          : lang === 'mr-IN'
          ? 'मॅट्रिकोत्तर / महाडीबीटी शिष्यवृत्तीसाठी अर्ज:\n१. पात्रता: मान्यताप्राप्त पदविका/पदवी अभ्यासक्रमात प्रवेश, कौटुंबिक वार्षिक उत्पन्न ₹२.५ लाखांपर्यंत.\n२. कागदपत्रे: उत्पन्नाचा दाखला, गुणपत्रिका, अधिवास प्रमाणपत्र, महाविद्यालय फी पावती, बँक पासबुक.\n३. पायऱ्या: खाली "Apply for Scholarship" वर क्लिक करा -> विद्यार्थी माहिती तपासा -> कॉलेज व कोर्स कोड निवडा -> कॉलेज पडताळणीसाठी सादर करा (७-१४ दिवस).'
          : 'To apply for Post-Matric Scholarship (MahaDBT / MPTASS):\n1. Eligibility: Enrolled in recognized diploma/degree course, family annual income under ₹2.5 Lakh.\n2. Required Documents: Income Certificate, Marksheet, Domicile Certificate, College Fee Receipt, Bank Passbook.\n3. Step-by-Step: Click "Apply for Scholarship" below -> Verify student profile -> Enter College & Course verification code -> Submit for College Desk verification (7-14 working days).';
        actionTo = '/apply/scholarship';
        nextStepLabel = 'Apply for Scholarship Now →';
      } else if (isDocs) {
        reply = lang === 'hi-IN'
          ? 'छात्रवृत्ति के लिए आवश्यक दस्तावेज: 1. आय प्रमाण पत्र (Tahsildar), 2. पिछली कक्षा की अंकतालिका, 3. अधिवास प्रमाण पत्र (Domicile), 4. कॉलेज शुल्क रसीद, 5. बैंक पासबुक (Aadhaar Seeded), 6. जाति प्रमाण पत्र (यदि लागू हो)।'
          : lang === 'mr-IN'
          ? 'शिष्यवृत्तीसाठी आवश्यक कागदपत्रे: १. उत्पन्नाचा दाखला (तहसीलदार), २. मागील गुणपत्रिका, ३. अधिवास प्रमाणपत्र (Domicile), ४. कॉलेज फी पावती, ५. बँक पासबुक (आधार लिंक), ६. जात प्रमाणपत्र (लागू असल्यास).'
          : 'Documents required for Post-Matric Scholarship: 1. Tahsildar Income Certificate, 2. Previous Marksheet, 3. Domicile Certificate, 4. College Fee Receipt, 5. Bank Passbook (Aadhaar linked), 6. Caste Certificate (if applicable).';
        actionTo = '/documents';
        nextStepLabel = 'Upload to Document Vault';
      } else if (isEligible) {
        reply = lang === 'hi-IN'
          ? 'छात्रवृत्ति पात्रता मानदंड: विद्यार्थी मूल निवासी होना चाहिए, मान्यता प्राप्त उच्च शिक्षा/डिप्लोमा में नामांकित होना चाहिए, और पारिवारिक वार्षिक आय ₹2,50,000 से अधिक नहीं होनी चाहिए।'
          : lang === 'mr-IN'
          ? 'शिष्यवृत्ती पात्रता निकष: विद्यार्थी अधिवासी असावा, मान्यताप्राप्त पदविका/पदवी अभ्यासक्रमात शिकत असावा आणि कौटुंबिक वार्षिक उत्पन्न ₹२.५ लाखांपेक्षा कमी असावे.'
          : 'Scholarship Eligibility Criteria: Student must be a domicile resident, enrolled in an approved diploma/degree course, with family annual income not exceeding ₹2,50,000.';
        actionTo = '/apply/scholarship';
        nextStepLabel = 'Check Eligibility & Apply';
      } else {
        reply = 'Post-Matric Scholarship provides 100% tuition and exam fee waiver paid directly to your college, plus monthly maintenance allowance.';
        actionTo = '/apply/scholarship';
        nextStepLabel = 'Apply for Scholarship';
      }

      suggestedActions = [
        { label: 'Apply for Scholarship Now', query: 'I want to apply for MahaDBT scholarship now' },
        { label: 'Required Documents for Scholarship', query: 'What documents are required for scholarship?' },
        { label: 'Scholarship Eligibility & Income Limit', query: 'What is the eligibility for scholarship?' },
        { label: 'College Verification Process', query: 'How does college verification work for scholarship?' },
      ];
    } else if (isIncome) {
      if (isApply || (!isStatus && !isDocs && !isEligible)) {
        reply = lang === 'hi-IN'
          ? 'तहसीलदार आय प्रमाण पत्र (Income Certificate) आवेदन:\n1. उपयोग: शैक्षणिक छात्रवृत्ति, शुल्क प्रतिपूर्ति, राशन कार्ड व सरकारी योजनाएं।\n2. आवश्यक दस्तावेज: राशन कार्ड, स्व-घोषणा पत्र, पटवारी/तलाठी रिपोर्ट, बिजली बिल या वेतन पर्ची।\n3. प्रक्रिया: नीचे "Apply for Income Certificate" पर क्लिक करके फॉर्म भरें। जारी होने की अवधि: 7 से 14 कार्य दिवस।'
          : lang === 'mr-IN'
          ? 'तहसीलदार उत्पन्नाचा दाखला अर्ज:\n१. उपयोग: शैक्षणिक शिष्यवृत्ती, फी सवलत, रेशन कार्ड आणि शासकीय योजना.\n२. कागदपत्रे: रेशन कार्ड, स्वयंघोषणापत्र, तलाठी अहवाल, लाईट बिल किंवा पगार पावती.\n३. प्रक्रिया: खाली "Apply for Income Certificate" वर क्लिक करून अर्ज भरा. कालावधी: ७ ते १४ दिवस.'
          : 'Tahsildar Income Certificate Application:\n1. Purpose: College scholarships, fee waivers, ration cards, and welfare schemes.\n2. Documents: Ration Card, Self-declaration, Talathi/Patwari report, Salary slip or Electricity bill.\n3. Process: Click "Apply for Income Certificate" below. Standard processing timeline: 7 to 14 working days.';
        actionTo = '/apply/income_certificate';
        nextStepLabel = 'Apply for Income Certificate →';
      } else if (isDocs) {
        reply = 'Required documents for Income Certificate: 1. Ration Card, 2. Self-declaration, 3. Talathi/Patwari Verification Report, 4. Identity & Residence Proof.';
        actionTo = '/documents';
        nextStepLabel = 'Upload to Document Vault';
      } else {
        reply = 'Tahsildar Income Certificate certifies annual family income for welfare schemes and scholarships.';
        actionTo = '/apply/income_certificate';
        nextStepLabel = 'Apply for Income Certificate';
      }

      suggestedActions = [
        { label: 'Apply for Income Certificate', query: 'How to apply for Tahsildar Income Certificate?' },
        { label: 'Required Documents for Income Certificate', query: 'What documents are required for Income Certificate?' },
        { label: 'Income Certificate Eligibility', query: 'Who is eligible for Tahsildar Income Certificate?' },
        { label: 'Check Income Certificate Status', query: 'What is the status of my income certificate application?' },
      ];
    } else if (isRation) {
      reply = lang === 'hi-IN'
        ? 'राशन कार्ड (Food & Civil Supplies): नए राशन कार्ड, परिवार के सदस्यों का नाम जोड़ने और रियायती खाद्यान्न कोटा संशोधन के लिए पोर्टल से आवेदन कर सकते हैं।'
        : lang === 'mr-IN'
        ? 'रेशन कार्ड (अन्न व नागरी पुरवठा): नवीन शिधापत्रिका, कुटुंबातील सदस्य जोडणे आणि अनुदानित धान्य कोटा अर्जासाठी सेवा उपलब्ध आहे.'
        : 'Ration Card Services: Applications for new ration cards, family member additions, and subsidized foodgrain quota under Food & Civil Supplies Department.';
      actionTo = '/schemes';
      nextStepLabel = 'Explore Ration Schemes →';
      suggestedActions = [
        { label: 'Ration Card Member Addition', query: 'How to add family member to ration card?' },
        { label: 'Required Documents for Ration Card', query: 'What documents are needed for ration card?' },
        { label: 'Check Subsidized Ration Quota', query: 'How to check subsidized ration quota?' },
      ];
    } else if (isHousing) {
      reply = lang === 'hi-IN'
        ? 'प्रधानमंत्री आवास योजना (PMAY): बेघर और कच्चे मकान वाले परिवारों को पक्का मकान बनाने के लिए ₹1.20 लाख से ₹2.50 लाख तक की वित्तीय सहायता दी जाती है।'
        : lang === 'mr-IN'
        ? 'प्रधानमंत्री आवास योजना (PMAY): बेघर व कच्च्या घरात राहणाऱ्या कुटुंबांना पक्के घर बांधण्यासाठी ₹१.२० लाख ते ₹२.५० लाखांपर्यंत अनुदान दिले जाते.'
        : 'Pradhan Mantri Awas Yojana (PMAY) provides financial subsidy of ₹1.20 Lakh to ₹2.50 Lakh for constructing permanent pucca houses.';
      actionTo = '/schemes';
      nextStepLabel = 'View Housing Schemes →';
      suggestedActions = [
        { label: 'Apply for Housing Subsidy', query: 'How to apply for PMAY housing subsidy?' },
        { label: 'Housing Eligibility Criteria', query: 'Who is eligible for PMAY housing?' },
        { label: 'Required Documents for Housing', query: 'What documents are needed for housing subsidy?' },
      ];
    } else if (isAadhaar) {
      reply = lang === 'hi-IN'
        ? 'आधार सेवाएं: आप नगरसाथी के डिजिटल व्हॉल्ट में सुरक्षित रूप से आधार कार्ड अपलोड कर सकते हैं। यह स्वतः मास्क (XXXX-XXXX-4821) होकर सुरक्षित रहता है और फॉर्म भरने में मदद करता है।'
        : lang === 'mr-IN'
        ? 'आधार सेवा: तुम्ही तुमचे आधार कार्ड नगरसाथी व्हॉल्टमध्ये सुरक्षित ठेवू शकता. सर्व आधार क्रमांक आपोआप मास्क (XXXX-XXXX-4821) केले जातात.'
        : 'Aadhaar Services: You can securely store your Aadhaar in the NagarSathi vault. Identifiers are masked (XXXX-XXXX-4821) to protect your privacy.';
      actionTo = '/documents';
      nextStepLabel = 'Manage Documents';
      suggestedActions = [
        { label: 'Upload Aadhaar to Vault', query: 'How to upload Aadhaar card to vault?' },
        { label: 'Aadhaar Masking & Security', query: 'How does NagarSathi protect Aadhaar privacy?' },
        { label: 'Aadhaar Verification Help', query: 'How is Aadhaar verified for schemes?' },
      ];
    } else if (isPension) {
      reply = lang === 'hi-IN'
        ? 'इंदिरा गांधी राष्ट्रीय वृद्धावस्था पेंशन योजना: ६५ वर्ष या उससे अधिक आयु के बीपीएल नागरिकों को ₹१,००० मासिक सहायता दी जाती है। आवश्यक दस्तावेज: आधार कार्ड, बैंक पासबुक, जीवन प्रमाण पत्र।'
        : lang === 'mr-IN'
        ? 'इंदिरा गांधी राष्ट्रीय वृद्धापकाळ निवृत्तीवेतन योजना: ६५ वर्षे किंवा त्याहून अधिक वयाच्या दारिद्र्यरेषेखालील (BPL) नागरिकांना ₹१,००० मासिक पेन्शन मिळते. आवश्यक कागदपत्रे: आधार कार्ड, बँक पासबुक, डिजिटल जीवन प्रमाणपत्र.'
        : 'Indira Gandhi National Old Age Pension Scheme provides ₹1,000 monthly financial assistance to BPL citizens aged 65 and above. Required documents: Aadhaar card, Bank passbook, Digital Life Certificate.';
      actionTo = '/apply/pension';
      nextStepLabel = 'Apply for Pension';
      suggestedActions = [
        { label: 'Apply for Old Age Pension', query: 'How to apply for Old Age Pension Scheme?' },
        { label: 'Pension Eligibility & Age Limit', query: 'What is the age limit and eligibility for pension?' },
        { label: 'Required Documents for Pension', query: 'What documents are required for pension?' },
        { label: 'Digital Life Certificate (Jeevan Pramaan)', query: 'How to submit Jeevan Pramaan digital life certificate?' },
      ];
    } else if (isStatus) {
      const { apps } = getActiveCitizenData();
      reply = apps.length > 0
        ? `Your active application for "${apps[0].schemeName || apps[0].service || 'Government Scheme'}" (${apps[0].applicationId || apps[0].id}) is currently: ${apps[0].status}. Standard Department Processing SLA: 7 to 14 Working Days.`
        : 'You do not have any active applications under review. You can select and apply for government schemes from the catalog.';
      actionTo = '/applications';
      nextStepLabel = 'Track Applications (7-14 Days SLA)';
      suggestedActions = [
        { label: 'Check Active Application Status', query: 'What is the status of my active application?' },
        { label: 'Officer Verification Timeline (7-14 Days)', query: 'How long does physical verification take?' },
        { label: 'View Submitted Applications', query: 'Show my submitted applications' },
      ];
    } else if (isDocs) {
      reply = 'Key government documents supported: 1. Aadhaar Card, 2. Income Certificate, 3. Domicile Certificate, 4. Bank Passbook, 5. Caste Certificate, 6. Marksheet. All files are encrypted at rest with AES-256.';
      actionTo = '/documents';
      nextStepLabel = 'Open Document Vault';
      suggestedActions = [
        { label: 'Required Documents Guide', query: 'What documents are required for government schemes?' },
        { label: 'Upload Documents to Vault', query: 'How to upload documents to vault?' },
        { label: 'Document Verification Checks', query: 'What checks are performed during document verification?' },
      ];
    } else {
      reply = lang === 'hi-IN'
        ? 'नमस्ते! मैं आपका नगरसाथी एआई सहायक हूँ। आप छात्रवृत्ति (Scholarship), आय प्रमाण पत्र (Income Certificate), राशन कार्ड, आवास योजना, या आवेदन स्थिति के बारे में पूछ सकते हैं।'
        : lang === 'mr-IN'
        ? 'नमस्कार! मी तुमचा नगरसाथी एआय सहाय्यक आहे. तुम्ही शिष्यवृत्ती, उत्पन्नाचा दाखला, रेशन कार्ड, आवास योजना किंवा अर्जाच्या स्थितीबद्दल विचारू शकता.'
        : 'Hello! I am your NagarSathi Citizen Assistant. Ask about Scholarship, Income Certificate, Ration Card, Housing Subsidy, or check application tracking.';
      actionTo = '/schemes';
      nextStepLabel = 'Explore Schemes';
      suggestedActions = [
        { label: '🎓 Apply for Scholarship', query: 'I want to apply for scholarship' },
        { label: '📜 Apply for Income Certificate', query: 'How to apply for Tahsildar Income Certificate?' },
        { label: '🌾 Ration Card Services', query: 'Tell me about ration card services' },
        { label: '⏱️ Check Application Status', query: 'What is the status of my application?' },
      ];
    }

    return {
      display: reply,
      speech: reply,
      data: {
        reply,
        status: 'ok',
        replyLang: lang,
        agent: { id: 'assistant', name: 'NagarSathi Multilingual Assistant' },
        action: { type: 'navigate', to: actionTo },
        nextStep: { label: nextStepLabel, to: actionTo },
        suggestedActions,
      },
    };
  },

  async getAssistantSuggestions(language = 'en-IN') {
    return {
      display: 'Suggestions',
      data: {
        language,
        categories: [
          { id: 'scholarship', title: 'Scholarship Schemes', query: 'Tell me about scholarship schemes' },
          { id: 'income_certificate', title: 'Income Certificate', query: 'How to get income certificate' },
          { id: 'ration_card', title: 'Ration Card Services', query: 'Tell me about ration card services' },
          { id: 'documents', title: 'Required Documents', query: 'What documents are needed?' },
          { id: 'tracking', title: 'Application Tracking', query: 'What is the status of my application?' },
        ],
      },
    };
  },

  async extractFormField({ text, field = null } = {}) {
    return {
      display: `${field || 'Field'}: Extracted`,
      data: {
        ok: true,
        field,
        value: text,
        extractedValue: text,
        needsConfirmation: false,
      },
    };
  },

  async getNotifications() {
    const { notifs } = getActiveCitizenData();
    const unread = notifs.filter((n) => !n.read).length;
    return {
      display: `${unread} नवीन सूचना (Notifications)`,
      speech: `तुमच्याकडे ${unread} नवीन सूचना आहेत.`,
      data: {
        unreadCount: unread,
        total: notifs.length,
        notifications: notifs,
      },
    };
  },

  async markNotificationRead(id) {
    const notif = MOCK_NOTIFICATIONS.find((n) => n.notificationId === id);
    if (notif) notif.read = true;
    return {
      display: 'सूचना वाचली म्हणून चिन्हांकित केली.',
      speech: 'सूचना वाचली गेली.',
      data: { read: true },
    };
  },

  async markAllNotificationsRead() {
    MOCK_NOTIFICATIONS.forEach((n) => {
      n.read = true;
    });
    return {
      display: 'सर्व सूचना वाचल्या म्हणून चिन्हांकित केल्या.',
      speech: 'सर्व सूचना वाचल्या गेल्या आहेत.',
      data: { success: true },
    };
  },

  async getSupportTickets() {
    return {
      display: `${MOCK_SUPPORT_TICKETS.length} मदत तिकीटे (Support Tickets)`,
      speech: `मदत केंद्रात ${MOCK_SUPPORT_TICKETS.length} तिकीटे आहेत.`,
      data: {
        tickets: MOCK_SUPPORT_TICKETS,
      },
    };
  },

  async createSupportTicket({ category = 'COMPLAINT', subject = 'Support Request', description = '', priority = 'MEDIUM' } = {}) {
    const ticketId = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket = {
      ticketId,
      userId: 'CITIZEN-RAMABAI-01',
      category,
      subject,
      description,
      priority,
      status: 'OPEN',
      responses: [
        {
          author: 'NagarSathi AI Helpdesk',
          role: 'OFFICER',
          message: 'Your ticket has been received and routed to the Taluka Help Center. Expected response within 24 hours.',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return {
      display: `तिकीट नोंदवले आहे: ${newTicket.ticketId}`,
      speech: 'तुमचे मदत तिकीट नोंदवले गेले आहे.',
      data: { ticket: newTicket },
    };
  },

  async getDashboardStats() {
    const { apps, notifs, docs, user } = getActiveCitizenData();
    const stats = {
      totalApplications: apps.length,
      approvedApplications: apps.filter((a) => a.status === 'APPROVED' || a.status === 'CLOSED').length,
      pendingApplications: apps.filter((a) => a.status !== 'APPROVED' && a.status !== 'CLOSED').length,
      uploadedDocuments: docs.length,
      documentsUploaded: docs.length,
      rejectedApplications: 0,
      eligibleSchemesCount: MOCK_SCHEMES.length,
      unreadNotifications: notifs.filter((n) => !n.read).length,
      profileCompletion: user?.profileCompleted || (user?.phone === '9876543210' ? 85 : 0),
    };
    return {
      display: 'डॅशबोर्ड सांख्यिकी (Citizen Statistics)',
      speech: 'डॅशबोर्ड माहिती उपलब्ध आहे.',
      data: {
        stats,
        citizen: {
          name: user?.name || (user?.phone === '9876543210' ? 'Ramabai Kulkarni' : 'Citizen'),
          phone: user?.phone || '9876543210',
          phoneMasked: user?.phoneMasked || 'XXXXXX3210',
          aadhaarMasked: user?.aadhaarMasked || (user?.phone === '9876543210' ? 'XXXX-XXXX-4821' : null),
          district: user?.district || (user?.phone === '9876543210' ? 'Pune' : ''),
          state: user?.state || (user?.phone === '9876543210' ? 'Maharashtra' : ''),
          preferredLanguage: user?.language || 'mr-IN',
        },
      },
    };
  },
};
