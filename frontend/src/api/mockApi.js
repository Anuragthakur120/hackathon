import {
  CASE_STATUS,
  createInitialCaseState,
  transitionCaseState,
} from '../state/caseMachine.js';
import { normalizeLangCode } from '../i18n/index.js';

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
      display: 'तुमचे वृद्धापकाळ निवृत्तीवेतन (पेन्शन) थांबले आहे. आपण "पेन्शन पुनर्संचयित सेवा" सुरू करूया का?',
      speech: 'रमाबाई, तुमचे पेन्शन थांबले आहे हे मला समजले. आपण पेन्शन पुन्हा सुरू करण्याचा अर्ज करूया का?',
    },
    answer: {
      display: 'तुमची माहिती नोंदवली आहे: गेल्या ३ महिन्यांपासून पेन्शन जमा झालेली नाही.',
      speech: 'ठीक आहे, गेल्या तीन महिन्यांपासून पेन्शन आलेली नाही हे मी नोंदवले आहे.',
    },
    confirmService: {
      display: 'पेन्शन पुनर्संचयित सेवा निश्चित केली आहे (विश्वासार्हता: ९६%).',
      speech: 'पेन्शन पुनर्संचयित सेवा निश्चित झाली आहे. आता पुढे जाऊया.',
    },
    consent: {
      display: 'तुमची संमती नोंदवली आहे. आम्ही तुमची कागदपत्रे केवळ या अर्जासाठी वापरू.',
      speech: 'धन्यवाद रमाबाई, तुमची संमती नोंदवली गेली आहे.',
    },
    docsCollecting: {
      display: 'कागदपत्रे तपासणी सुरू आहे: आधार कार्ड (XXXX-XXXX-4821), बँक पासबुक (XXXXXXXX9012), हयातीचा दाखला.',
      speech: 'आधार कार्ड आणि बँक खात्याची माहिती तपासली जात आहे.',
    },
    docsReady: {
      display: 'सर्व ३ आवश्यक कागदपत्रे पडताळली आणि तयार आहेत.',
      speech: 'तुमची सर्व कागदपत्रे तयार आहेत. आता आपण अर्जाचा मसुदा भरूया.',
    },
    fillDraft: {
      display: 'अर्जाचा मसुदा (DRAFT) तयार केला आहे. कृपया तपासा आणि मंजुरी द्या. तुमच्या मंजुरीशिवाय अर्ज सादर केला जाणार नाही.',
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
      display: 'आपकी वृद्धावस्था पेंशन रुक गई है। क्या हम "पेंशन बहाली सेवा" शुरू करें?',
      speech: 'रमाबाई, आपकी पेंशन रुक गई है। क्या हम पेंशन फिर से शुरू करने का आवेदन करें?',
    },
    answer: {
      display: 'आपका उत्तर दर्ज किया गया: पिछले 3 महीनों से पेंशन जमा नहीं हुई है।',
      speech: 'ठीक है, पिछले तीन महीनों से पेंशन नहीं आई है, यह दर्ज कर लिया गया है।',
    },
    confirmService: {
      display: 'पेंशन बहाली सेवा की पुष्टि हो गई है (विश्वसनीयता: 96%)।',
      speech: 'पेंशन बहाली सेवा पक्की हो गई है। अब आगे बढ़ते हैं।',
    },
    consent: {
      display: 'आपकी सहमति दर्ज कर ली गई है। हम आपके दस्तावेज़ केवल इसी आवेदन के लिए उपयोग करेंगे।',
      speech: 'धन्यवाद रमाबाई, आपकी सहमति दर्ज हो गई है।',
    },
    docsCollecting: {
      display: 'दस्तावेज़ जाँच जारी: आधार कार्ड (XXXX-XXXX-4821), बैंक पासबुक (XXXXXXXX9012), जीवन प्रमाण पत्र।',
      speech: 'आधार कार्ड और बैंक खाते के दस्तावेज़ जाँचे जा रहे हैं।',
    },
    docsReady: {
      display: 'तीनों आवश्यक दस्तावेज़ सत्यापित और तैयार हैं।',
      speech: 'आपके सभी दस्तावेज़ तैयार हैं। अब हम ड्राफ्ट फॉर्म भरेंगे।',
    },
    fillDraft: {
      display: 'फॉर्म का ड्राफ्ट (DRAFT) तैयार है। कृपया जाँच करें और मंज़ूरी दें। आपकी मंज़ूरी के बिना फॉर्म सबमिट नहीं होगा।',
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
      display: 'Detected issue: Old-age pension stopped. Shall we proceed with "Pension Restoration Service"?',
      speech: 'Ramabai, I understand your pension has stopped. Shall we start a Pension Restoration application?',
    },
    answer: {
      display: 'Recorded your answer: Pension has not been credited for the past 3 months.',
      speech: 'Got it, I have recorded that your pension has been stopped for three months.',
    },
    confirmService: {
      display: 'Confirmed service: Pension Restoration (Confidence: 96%).',
      speech: 'Pension Restoration service is confirmed. Let us move to the next step.',
    },
    consent: {
      display: 'Informed consent recorded. Your documents will only be used to prepare this pension restoration application.',
      speech: 'Thank you Ramabai, your consent has been recorded.',
    },
    docsCollecting: {
      display: 'Checking documents: Aadhaar Card (XXXX-XXXX-4821), Bank Passbook (XXXXXXXX9012), Life Certificate.',
      speech: 'Checking your Aadhaar card, bank passbook, and life certificate.',
    },
    docsReady: {
      display: 'All 3 required documents are verified and ready.',
      speech: 'All your documents are verified and ready. Now we can fill the draft form.',
    },
    fillDraft: {
      display: 'Portal form filled as a DRAFT only. Please review and approve. We never submit without your explicit approval.',
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
  return (COPY[normalized] && COPY[normalized][key]) || COPY['mr-IN'][key];
}

let mockStore = createInitialCaseState('mr-IN');

const DEFAULT_CHECKLIST = [
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

const DEFAULT_DRAFT = {
  isDraft: true,
  serviceId: 'pension_restoration',
  portalName: 'Maharashtra Social Justice & Special Assistance Portal (Mock)',
  fields: [
    { key: 'applicantName', label: 'Applicant Name', value: 'Ramabai Kulkarni' },
    { key: 'age', label: 'Age', value: '68' },
    { key: 'scheme', label: 'Scheme', value: 'Sanjay Gandhi Niradhar / Old Age Pension' },
    { key: 'aadhaarMasked', label: 'Aadhaar Number (Masked)', value: 'XXXX-XXXX-4821' },
    { key: 'bankAccountMasked', label: 'Bank Account (Masked)', value: 'XXXXXXXX9012' },
    { key: 'reasonForStop', label: 'Reason for Interruption', value: 'Annual Life Certificate Renewal Pending' },
    { key: 'lifeCertId', label: 'Jeevan Pramaan ID', value: 'JP-2026-9910' },
  ],
};

export const mockApi = {
  getState() {
    return { ...mockStore };
  },

  async requestOtp({ phone = '9876543210', language = mockStore.language } = {}) {
    const c = getCopy(language, 'otpSent');
    const last4 = String(phone).slice(-4);
    return {
      display: c.display,
      speech: c.speech,
      data: {
        phoneMasked: `XXXXXX${last4}`,
        otpSent: true,
        mode: 'mock',
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
          bankAccountMasked: 'XXXXXXXX9012',
        },
      },
    };
  },

  async createCaseFromTranscript({
    transcript = 'माझी पेन्शन थांबली आहे',
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
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
        language: lang,
      },
    };
  },

  async answerCaseQuestion({
    caseId = mockStore.id,
    answer = '३ महिन्यांपासून पेन्शन बंद आहे',
    fieldId = 'monthsStopped',
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
    const consentObj = {
      given: Boolean(given),
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
    language = mockStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
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
        checklist: DEFAULT_CHECKLIST,
      },
    };
  },

  async fillDraft({ caseId = mockStore.id, language = mockStore.language } = {}) {
    const lang = normalizeLangCode(language);
    if (mockStore.status === CASE_STATUS.CONSENTED) {
      mockStore = transitionCaseState(mockStore, CASE_STATUS.DOCS_READY, {
        documents: DEFAULT_CHECKLIST,
      });
    } else if (mockStore.status === CASE_STATUS.DOCS_COLLECTING) {
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
  } = {}) {
    const lang = normalizeLangCode(language);
    // Uses state machine hard safety guard: throws APPROVAL_REQUIRED if approval.given !== true
    mockStore = transitionCaseState(mockStore, CASE_STATUS.SUBMITTED, {
      submission: {
        applicationId: 'PEN-2026-88213',
        submittedAt: new Date().toISOString(),
      },
      language: lang,
    });
    const c = getCopy(lang, 'submit');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId,
        status: mockStore.status,
        applicationId: 'PEN-2026-88213',
        submittedAt: mockStore.submission.submittedAt,
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
          bankAccountMasked: 'XXXXXXXX9012',
        },
      },
    };
  },

  async patchProfile({ name = 'Ramabai Kulkarni', language = mockStore.language } = {}) {
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
          language: lang,
          aadhaarMasked: 'XXXX-XXXX-4821',
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
        actionRequired: 'Submit Jeevan Pramaan ID along withPension Restoration form',
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
    const c = getCopy(lang, 'reset');
    return {
      display: c.display,
      speech: c.speech,
      data: {
        caseId: mockStore.id,
        status: mockStore.status,
        reset: true,
      },
    };
  },
};

