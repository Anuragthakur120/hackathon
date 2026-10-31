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
  fieldKeys: [
    'applicantName',
    'aadhaarMasked',
    'phoneMasked',
    'bankAccountMasked',
    'lifeCertId',
    'schemeType',
    'seniorCategory',
    'applicationCategory',
    'portalDraftRef',
  ],
  fieldSources: {
    applicantName: 'PROFILE',
    aadhaarMasked: 'PROFILE',
    phoneMasked: 'PROFILE',
    bankAccountMasked: 'DOCUMENT',
    lifeCertId: 'DOCUMENT',
    schemeType: 'ASK_CITIZEN',
    seniorCategory: 'DERIVED',
    applicationCategory: 'DEFAULT',
    portalDraftRef: 'PORTAL_GENERATED',
  },
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

export const MOCK_FIXTURE_COPY = {
  'mr-IN': {
    intake: {
      display:
        'तुमचे पेन्शन थांबले आहे हे समजले. कृपया सांगा: कोणती पेन्शन? (Kaunsi pension?)',
      speech: 'रमाबाई तुमचे पेन्शन थांबले आहे. कोणती पेन्शन बंद झाली आहे?',
    },
    intakeScholarship: {
      display:
        'तुम्हाला शिष्यवृत्ती अर्ज भरायचा आहे. कोणती शिष्यवृत्ती हवी आहे?',
      speech: 'तुम्हाला शिष्यवृत्ती अर्ज भरायचा आहे. कृपया पर्याय निवडा.',
    },
    intakeRation: {
      display: 'तुम्हाला रेशन कार्ड सेवा हवी आहे. कृपया पर्याय निवडा.',
      speech: 'तुम्हाला रेशन कार्ड सेवा हवी आहे. कृपया पर्याय निवडा.',
    },
    intakeUnknownRetry: {
      display:
        'मला तुमची समस्या नीट समजली नाही. कृपया पुन्हा एकदा स्पष्टपणे सांगा.',
      speech: 'क्षमा करा मला समजले नाही. कृपया पुन्हा एकदा सांगा.',
    },
    intakeUnknownMadad: {
      display:
        'आम्हाला तुमची सेवा निश्चित करता आली नाही. कृपया मदत केंद्राशी (Madad Kendra) संपर्क साधा.',
      speech: 'कृपया जवळच्या मदत केंद्राशी संपर्क साधा.',
    },
    answer: {
      display:
        'तुमची माहिती नोंदवली आहे: वृद्धापकाळ पेन्शन. तुम्हाला पेन्शन पुन्हा सुरू करायची आहे, बरोबर?',
      speech: 'तुम्हाला वृद्धापकाळ पेन्शन पुन्हा सुरू करायची आहे बरोबर ना?',
    },
    confirmService: {
      display:
        'पेन्शन पुनर्संचयित सेवा निश्चित केली आहे (विश्वासार्हता: ९६%). आता संमती द्या (Gate 1).',
      speech: 'पेन्शन सेवा निश्चित झाली आहे. आता कृपया तुमची संमती द्या.',
    },
    docsCollecting: {
      display:
        'कागदपत्रे तपासणी सुरू आहे: आधार कार्ड (XXXX-XXXX-4821), बँक पासबुक (XXXXXXXX9012), हयातीचा दाखला.',
      speech: 'आधार कार्ड आणि पासबुकची माहिती तपासली जात आहे.',
    },
    docsBlurry: {
      display:
        'फोटो अंधूक आहे, कृपया पुन्हा काढा (Photo dhundhli hai, dobara).',
      speech: 'फोटो अंधूक आला आहे. कृपया पुन्हा स्पष्ट फोटो काढा.',
    },
    docsExpired: {
      display:
        'हयातीचा दाखला जुना आहे, कृपया चालू वर्षाचा दाखला द्या (Life certificate purana hai).',
      speech: 'हयातीचा दाखला जुना आहे. कृपया नवीन दाखल्याचा फोटो काढा.',
    },
    docsMissing: {
      display: 'आवश्यक कागदपत्र अपूर्ण आहे. कृपया कागदपत्राचा फोटो काढा.',
      speech: 'कागदपत्र अपूर्ण आहे. कृपया कागदपत्राचा फोटो काढा.',
    },
    docsReady: {
      display: 'सर्व ३ आवश्यक कागदपत्रे पडताळली आणि तयार आहेत (DOCS_READY).',
      speech: 'तुमची सर्व कागदपत्रे तयार आहेत. आता आपण मसुदा भरूया.',
    },
    fillDraft: {
      display:
        'अर्जाचा मसुदा (DRAFT) तयार केला आहे. कृपया तपासा आणि मंजुरी द्या (Gate 2). तुमच्या मंजुरीशिवाय अर्ज सादर केला जाणार नाही.',
      speech: 'रमाबाई तुमचा अर्जाचा मसुदा तयार आहे. कृपया तो तपासून मंजुरी द्या.',
    },
    submit: {
      display: 'अर्ज यशस्वीरित्या सादर केला! अर्ज क्रमांक: PEN-2026-88213.',
      speech:
        'अभिनंदन रमाबाई तुमचा अर्ज सादर झाला आहे. क्रमांक पी ई एन दोन शून्य दोन सहा आठ आठ दोन एक तीन.',
    },
    tracking: {
      display:
        'अर्ज क्रमांक PEN-2026-88213 चा मागोवा सुरू आहे: तालुका कार्यालयात पडताळणी प्रलंबित.',
      speech: 'तुमचा अर्ज सध्या तालुका कार्यालयात तपासणीसाठी आहे.',
    },
    queryRaised: {
      display:
        'कार्यालयाने चौकशी केली आहे: डिजिटल हयातीचा दाखला पुन्हा जोडणे आवश्यक आहे.',
      speech: 'कार्यालयाकडून एक सूचना आली आहे. हयातीचा दाखला पुन्हा जोडावा लागेल.',
    },
    stalled: {
      display:
        '१५ दिवस उलटूनही अर्जावर कार्यवाही झालेली नाही (STALLED: 7 din se ruka hai). नगरसाथी कार्यालयाला कॉल करू शकतो.',
      speech: 'अर्जावर पुढे काम झाले नाही. मी कार्यालयाला फोन करू का?',
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
        'फोनवर बोलणे झाले आहे. संदर्भ आर ई एफ पाच पाच दोन एक मिळाला आहे.',
    },
    closed: {
      display:
        'प्रकरण यशस्वीरित्या पूर्ण झाले (CLOSED)! अर्ज PEN-2026-88213 मंजूर, संदर्भ REF-5521 (Pension phir chalu ho gayi).',
      speech: 'आनंदाची बातमी रमाबाई. तुमचे पेन्शन पुन्हा सुरू झाले आहे.',
    },
    letterExplain: {
      display:
        'हे पत्र तालुका कार्यालयाकडून आले आहे: पेन्शन सुरू ठेवण्यासाठी १५ दिवसांत हयातीचा दाखला सादर करावा.',
      speech:
        'हे पत्र तालुका कार्यालयाकडून आले आहे. पंधरा दिवसांत हयातीचा दाखला द्यावा लागेल.',
    },
    fallback: {
      display: 'सेवा सध्या व्यस्त आहे. तुमचा मसुदा सुरक्षित आहे.',
      speech: 'सेवा सध्या व्यस्त आहे. कृपया थोड्या वेळाने प्रयत्न करा.',
    },
  },
  'hi-IN': {
    intake: {
      display:
        'आपकी पेंशन रुक गई है। कृपया बताएँ: कौनसी पेंशन? (Kaunsi pension?)',
      speech: 'रमाबाई आपकी पेंशन रुक गई है। कौनसी पेंशन बंद हुई है?',
    },
    intakeScholarship: {
      display: 'आपको छात्रवृत्ति आवेदन भरना है। कृपया विकल्प चुनें।',
      speech: 'आपको छात्रवृत्ति आवेदन भरना है। कृपया विकल्प चुनें।',
    },
    intakeRation: {
      display: 'आपको राशन कार्ड सेवा चाहिए। कृपया विकल्प चुनें।',
      speech: 'आपको राशन कार्ड सेवा चाहिए। कृपया विकल्प चुनें।',
    },
    intakeUnknownRetry: {
      display: 'हमें आपकी समस्या स्पष्ट नहीं हुई। कृपया एक बार फिर से बताएँ।',
      speech: 'क्षमा करें समझ नहीं आया। कृपया फिर से बताएँ।',
    },
    intakeUnknownMadad: {
      display:
        'हम सेवा की पहचान नहीं कर सके। कृपया मदद केंद्र (Madad Kendra) से संपर्क करें।',
      speech: 'कृपया नज़दीकी मदद केंद्र से संपर्क करें।',
    },
    answer: {
      display:
        'आपका उत्तर दर्ज किया गया: वृद्धावस्था पेंशन। आपको पेंशन चालू करवानी है, सही?',
      speech: 'आपको वृद्धावस्था पेंशन फिर से चालू करवानी है सही?',
    },
    confirmService: {
      display:
        'पेंशन बहाली सेवा की पुष्टि हो गई है (विश्वसनीयता: 96%)। अब सहमति दें (Gate 1)।',
      speech: 'पेंशन बहाली सेवा पक्की हो गई है। अब कृपया सहमति दें।',
    },
    docsCollecting: {
      display:
        'दस्तावेज़ जाँच जारी: आधार कार्ड (XXXX-XXXX-4821), बैंक पासबुक (XXXXXXXX9012), जीवन प्रमाण पत्र।',
      speech: 'आधार कार्ड और पासबुक के दस्तावेज़ जाँचे जा रहे हैं।',
    },
    docsBlurry: {
      display: 'फोटो धुंधली है, दोबारा खींचें (Photo dhundhli hai, dobara)।',
      speech: 'फोटो धुंधली है। कृपया दोबारा साफ फोटो खींचें।',
    },
    docsExpired: {
      display:
        'जीवन प्रमाण पत्र पुराना है, कृपया नया प्रमाण पत्र दें (Life certificate purana hai)।',
      speech: 'जीवन प्रमाण पत्र पुराना है। कृपया नया प्रमाण पत्र दिखाएँ।',
    },
    docsMissing: {
      display: 'आवश्यक दस्तावेज़ अधूरा है। कृपया फोटो खींचें।',
      speech: 'आवश्यक दस्तावेज़ अधूरा है। कृपया फोटो खींचें।',
    },
    docsReady: {
      display: 'तीनों आवश्यक दस्तावेज़ सत्यापित और तैयार हैं (DOCS_READY)।',
      speech: 'आपके सभी दस्तावेज़ तैयार हैं। अब हम ड्राफ्ट फॉर्म भरेंगे।',
    },
    fillDraft: {
      display:
        'फॉर्म का ड्राफ्ट (DRAFT) तैयार है। कृपया जाँच करें और मंज़ूरी दें (Gate 2)। आपकी मंज़ूरी के बिना फॉर्म सबमिट नहीं होगा।',
      speech: 'रमाबाई आपके फॉर्म का ड्राफ्ट तैयार है। कृपया इसे मंज़ूरी दें।',
    },
    submit: {
      display:
        'आवेदन सफलतापूर्वक सबमिट हुआ! आवेदन संख्या: PEN-2026-88213।',
      speech:
        'बधाई हो रमाबाई आपका आवेदन सबमिट हो गया है। संख्या पी ई एन दो शून्य दो छह आठ आठ दो एक तीन।',
    },
    tracking: {
      display:
        'आवेदन PEN-2026-88213 की ट्रैकिंग: तहसील कार्यालय में सत्यापन लंबित।',
      speech: 'आपका आवेदन अभी तहसील कार्यालय में जाँच के लिए है।',
    },
    queryRaised: {
      display:
        'कार्यालय ने आपत्ति उठाई है: डिजिटल जीवन प्रमाण पत्र पुनः संलग्न करना आवश्यक है।',
      speech: 'कार्यालय से सूचना आई है। जीवन प्रमाण पत्र फिर से दिखाना होगा।',
    },
    stalled: {
      display:
        '15 दिन बीतने पर भी आवेदन आगे नहीं बढ़ा (STALLED: 7 din se ruka hai)। नगरसाथी कार्यालय को कॉल कर सकता है।',
      speech: 'पंद्रह दिन से फाइल रुकी हुई है। क्या मैं कार्यालय में फोन करूँ?',
    },
    callStart: {
      display: 'तहसील समाज कल्याण कार्यालय के साथ सिम्युलेटेड कॉल शुरू...',
      speech: 'तहसील कार्यालय में फोन लगाया जा रहा है।',
    },
    callTurn: {
      display:
        'अधिकारी: आवेदन PEN-2026-88213 की जाँच की गई, जीवन प्रमाण पत्र स्वीकृत किया गया।',
      speech: 'अधिकारी ने बताया कि आपका प्रमाण पत्र स्वीकार हो गया है।',
    },
    callEnd: {
      display:
        'कॉल समाप्त! संदर्भ संख्या: REF-5521। पेंशन बहाली प्रक्रिया फिर से शुरू (3 din mein dekhenge, REF-5521)।',
      speech:
        'फोन पर बात पूरी हो गई है। संदर्भ आर ई एफ पांच पांच दो एक मिला है।',
    },
    closed: {
      display:
        'मामला सफलतापूर्वक पूर्ण हुआ (CLOSED)! आवेदन PEN-2026-88213 स्वीकृत, संदर्भ REF-5521 (Pension phir chalu ho gayi)।',
      speech: 'खुशखबरी रमाबाई। आपकी पेंशन फिर से शुरू हो गई है।',
    },
    letterExplain: {
      display:
        'यह पत्र तहसील कार्यालय से है: पेंशन जारी रखने के लिए 15 दिनों के भीतर जीवन प्रमाण पत्र जमा करें।',
      speech:
        'यह पत्र तहसील कार्यालय से आया है। पंद्रह दिनों में जीवन प्रमाण पत्र देना होगा।',
    },
    fallback: {
      display: 'सेवा अभी व्यस्त है। आपका ड्राफ्ट सुरक्षित है।',
      speech: 'सेवा अभी व्यस्त है। कृपया थोड़ी देर में फिर प्रयास करें।',
    },
  },
  'en-IN': {
    intake: {
      display:
        'Detected issue: Pension stopped. Clarifying question: Kaunsi pension? (Which pension scheme?)',
      speech:
        'Ramabai your pension has stopped. Which pension scheme were you receiving?',
    },
    intakeScholarship: {
      display: 'Detected service: Post-Matric Scholarship. Please choose option.',
      speech: 'You need a scholarship application. Please select an option.',
    },
    intakeRation: {
      display: 'Detected service: Ration Card application. Please choose option.',
      speech: 'You need a ration card service. Please select an option.',
    },
    intakeUnknownRetry: {
      display:
        'I could not confidently identify the service. Please describe your issue once more.',
      speech: 'I could not understand the service needed. Please tell me once more.',
    },
    intakeUnknownMadad: {
      display:
        'Service still unclear after retry. Routing to Madad Kendra (Citizen Help Center).',
      speech: 'Please connect with the Madad Kendra help center for direct assistance.',
    },
    answer: {
      display:
        'Recorded: Old-Age Pension. Aapko pension chalu karwani hai, sahi? (Confirm Pension Restoration?)',
      speech: 'Recorded Old Age Pension. You want to restore your pension right?',
    },
    confirmService: {
      display:
        'Confirmed service: Pension Restoration (Confidence: 96%). Proceed to Gate 1 (Consent).',
      speech: 'Pension Restoration service is confirmed. Please give your consent.',
    },
    docsCollecting: {
      display:
        'Checking documents: Aadhaar Card (XXXX-XXXX-4821), Bank Passbook (XXXXXXXX9012), Life Certificate.',
      speech: 'Checking your Aadhaar card bank passbook and life certificate.',
    },
    docsBlurry: {
      display:
        'Photo dhundhli hai, dobara (Photo is blurry, please retake a clear photo).',
      speech: 'The photo is blurry. Please take it again clearly.',
    },
    docsExpired: {
      display:
        'Life certificate purana hai (Life certificate is outdated, please capture the renewed certificate).',
      speech: 'The life certificate is old. Please provide the renewed certificate.',
    },
    docsMissing: {
      display: 'Required document is missing. Please capture a photo.',
      speech: 'A required document is missing. Please capture a photo.',
    },
    docsReady: {
      display: 'All 3 required documents are verified and ready (DOCS_READY).',
      speech: 'All your documents are ready. Now we can fill the draft form.',
    },
    fillDraft: {
      display:
        'Portal form filled as a DRAFT only. Please review and approve at Gate 2. We never submit without your explicit approval.',
      speech:
        'Ramabai I prepared the draft form. Please review and approve it.',
    },
    submit: {
      display:
        'Application submitted! Official Application ID: PEN-2026-88213.',
      speech:
        'Congratulations Ramabai your form is submitted. ID is P E N two zero two six eight eight two one three.',
    },
    tracking: {
      display:
        'Tracking PEN-2026-88213: Under verification at Taluka Social Welfare Office.',
      speech: 'Your application is being verified at the Taluka office.',
    },
    queryRaised: {
      display:
        'Officer Query Raised: Digital Life Certificate (Jeevan Pramaan) re-verification required.',
      speech: 'The office raised a query. Please reverify your Life Certificate.',
    },
    stalled: {
      display:
        'Stall detected after 15 days of inactivity (STALLED: 7 din se ruka hai). NagarSathi can place a follow-up call to the office.',
      speech: 'Your application is stalled for fifteen days. Shall I call the office?',
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
      speech:
        'The office call is complete. Reference is R E F five five two one.',
    },
    closed: {
      display:
        'Case CLOSED! Application PEN-2026-88213 approved and pension restored (Ref: REF-5521).',
      speech: 'Wonderful news Ramabai. Your pension has been restored.',
    },
    letterExplain: {
      display:
        'Letter from Taluka Office: Submit Life Certificate within 15 days to resume pension disbursement.',
      speech:
        'This letter is from the Taluka office. Submit your life certificate in fifteen days.',
    },
    fallback: {
      display: 'Service is temporarily busy. Your draft is safely stored.',
      speech: 'Service is busy right now. Please try again shortly.',
    },
  },
};

export function getFixtureCopy(lang = 'mr-IN', key = 'fallback') {
  const dict = MOCK_FIXTURE_COPY[lang] || MOCK_FIXTURE_COPY['mr-IN'];
  return dict[key] || MOCK_FIXTURE_COPY['mr-IN'].fallback;
}
