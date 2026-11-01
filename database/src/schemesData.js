export const SCHEMES_DATA = [
  {
    schemeId: 'pension',
    code: 'MH-SGN-01',
    category: 'Pension',
    department: {
      en: 'Social Justice and Special Assistance Department, Maharashtra',
      hi: 'सामाजिक न्याय एवं विशेष सहायता विभाग, महाराष्ट्र',
      mr: 'सामाजिक न्याय व विशेष सहाय्य विभाग, महाराष्ट्र',
    },
    name: {
      en: 'Sanjay Gandhi Niradhar Scheme (Old Age Pension)',
      hi: 'संजय गांधी निराधार योजना (वृद्धावस्था पेंशन)',
      mr: 'संजय गांधी निराधार योजना (वृद्धापकाळ पेन्शन)',
    },
    description: {
      en: 'Financial assistance of ₹1,500/month for destitute senior citizens, widows, blind, disabled, and persons suffering from severe illness.',
      hi: 'निराधार वरिष्ठ नागरिकों, विधवाओं, दिव्यांगों और गंभीर बीमारी से पीड़ित व्यक्तियों के लिए ₹1,500/माह की वित्तीय सहायता।',
      mr: 'निराधार ज्येष्ठ नागरिक, विधवा, दिव्यांग व्यक्ती आणि गंभीर आजारी व्यक्तींसाठी दरमहा ₹१,५०० ची आर्थिक मदत.',
    },
    benefits: {
      en: 'Direct monthly pension transfer of ₹1,500 directly into the citizen’s bank account, with annual digital life certificate verification.',
      hi: 'सीधे बैंक खाते में प्रति माह ₹1,500 की पेंशन, वार्षिक डिजिटल जीवन प्रमाण पत्र सत्यापन के साथ।',
      mr: 'दरमहा थेट बँक खात्यात ₹१,५०० पेन्शन जमा, वार्षिक डिजिटल जीवन प्रमाणपत्रासह.',
    },
    eligibilityCriteria: {
      minAge: 65,
      maxAge: 120,
      gender: 'All',
      state: 'Maharashtra',
      maxIncome: 21000,
      occupation: ['Unemployed', 'Retired', 'Domestic Work'],
      categories: ['All', 'General', 'OBC', 'SC', 'ST'],
      criteriaText: {
        en: 'Age 65 years or above (or widow/disabled of any age). Family annual income below ₹21,000. Domicile of Maharashtra for 15+ years.',
        hi: 'आयु 65 वर्ष या उससे अधिक (या किसी भी उम्र की विधवा/दिव्यांग)। पारिवारिक वार्षिक आय ₹21,000 से कम। 15 वर्षों से महाराष्ट्र का अधिवास।',
        mr: 'वय ६५ वर्षे किंवा त्याहून अधिक (किंवा कोणत्याही वयाची विधवा/दिव्यांग). कौटुंबिक वार्षिक उत्पन्न ₹२१,००० पेक्षा कमी. १५ वर्षे महाराष्ट्राचे वास्तव्य.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'age_proof',
      'income_certificate',
      'domicile_certificate',
      'bank_passbook',
      'life_certificate',
    ],
    applicationProcess: [
      '1. Voice intake & identity confirmation',
      '2. Gate 1 Informed Consent',
      '3. Verification of Aadhaar, Income & Life Certificate',
      '4. Preparation of Form Draft (DRAFT)',
      '5. Gate 2 Physical Citizen Approval',
      '6. Submission to Taluka Social Welfare Office & Reference Logging',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'Annual Jeevan Pramaan in November',
    },
    officialReference: {
      url: 'https://sjsa.maharashtra.gov.in',
      authority: 'Government of Maharashtra',
    },
    isActive: true,
    icon: '👴',
    color: 'indigo',
  },
  {
    schemeId: 'scholarship',
    code: 'MH-MDBT-02',
    category: 'Education',
    department: {
      en: 'Higher & Technical Education Department, Maharashtra',
      hi: 'उच्च एवं तकनीकी शिक्षा विभाग, महाराष्ट्र',
      mr: 'उच्च व तंत्रशिक्षण विभाग, महाराष्ट्र',
    },
    name: {
      en: 'Post-Matric Scholarship Scheme (MahaDBT)',
      hi: 'पोस्ट-मैट्रिक छात्रवृत्ति योजना (MahaDBT)',
      mr: 'मॅट्रिकोत्तर शिष्यवृत्ती योजना (महाडीबीटी)',
    },
    description: {
      en: 'Tuition fee reimbursement and monthly maintenance allowance for SC, ST, VJNT, OBC, and SBC students pursuing higher secondary and college education.',
      hi: 'उच्चतर माध्यमिक और कॉलेज शिक्षा प्राप्त करने वाले छात्रों के लिए शिक्षण शुल्क प्रतिपूर्ति और मासिक रखरखाव भत्ता।',
      mr: 'उच्च माध्यमिक व महाविद्यालयीन शिक्षण घेणाऱ्या विद्यार्थ्यांसाठी शिक्षण शुल्क परतावा व निर्वाह भत्ता.',
    },
    benefits: {
      en: '100% tuition and exam fee waiver paid directly to college, plus ₹1,200/month maintenance allowance for hostellers.',
      hi: 'कॉलेज को 100% शिक्षण शुल्क छूट, साथ ही छात्रावास के छात्रों के लिए ₹1,200/माह भत्ता।',
      mr: 'महाविद्यालयाला १००% शुल्क परतावा आणि वसतिगृहातील विद्यार्थ्यांसाठी दरमहा ₹१,२०० निर्वाह भत्ता.',
    },
    eligibilityCriteria: {
      minAge: 16,
      maxAge: 35,
      gender: 'All',
      state: 'Maharashtra',
      maxIncome: 250000,
      occupation: ['Student'],
      categories: ['SC', 'ST', 'VJNT', 'OBC', 'SBC', 'EWS'],
      criteriaText: {
        en: 'Enrolled in recognized diploma, degree, or post-graduate course. Family income <= ₹2.5 Lakh/year. Domicile of Maharashtra.',
        hi: 'मान्यता प्राप्त डिप्लोमा, डिग्री या पीजी पाठ्यक्रम में नामांकित। पारिवारिक आय <= ₹2.5 लाख/वर्ष। महाराष्ट्र का अधिवास।',
        mr: 'मान्यताप्राप्त पदविका, पदवी किंवा पदव्युत्तर अभ्यासक्रमात प्रवेश. कौटुंबिक वार्षिक उत्पन्न ₹२.५ लाखांपर्यंत. महाराष्ट्राचे अधिवास.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'caste_certificate',
      'income_certificate',
      'domicile_certificate',
      'marksheet',
      'college_fee_receipt',
      'bank_passbook',
    ],
    applicationProcess: [
      '1. Student profile auto-fill from Vault',
      '2. Academic & Course details entry',
      '3. College verification code check',
      '4. Citizen Draft Review & Approval',
      '5. Portal Robot submission to MahaDBT',
    ],
    importantDates: {
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      deadline: '31st December 2026',
    },
    officialReference: {
      url: 'https://mahadbt.maharashtra.gov.in',
      authority: 'MahaDBT Portal, Govt of Maharashtra',
    },
    isActive: true,
    icon: '🎓',
    color: 'emerald',
  },
  {
    schemeId: 'ration_card',
    code: 'MH-NFSA-03',
    category: 'Social Welfare',
    department: {
      en: 'Food, Civil Supplies and Consumer Protection Department',
      hi: 'खाद्य, नागरिक आपूर्ति एवं उपभोक्ता संरक्षण विभाग',
      mr: 'अन्न, नागरी पुरवठा व ग्राहक संरक्षण विभाग',
    },
    name: {
      en: 'National Food Security Card (Ration Card Update)',
      hi: 'राष्ट्रीय खाद्य सुरक्षा राशन कार्ड (नाम जोड़ना व संशोधन)',
      mr: 'राष्ट्रीय अन्न सुरक्षा शिधापत्रिका (नाव जोडणी व सुधारणा)',
    },
    description: {
      en: 'Add new family members, update fair price shop, or link Aadhaar for subsidized foodgrains under One Nation One Ration Card.',
      hi: 'वन नेशन वन राशन कार्ड के तहत रियायती खाद्यान्न हेतु नए पारिवारिक सदस्यों को जोड़ें या आधार लिंक करें।',
      mr: 'एक देश एक शिधापत्रिका अंतर्गत सवलतीच्या दरातील धान्यासाठी नवीन सदस्यांची नोंदणी किंवा आधार लिंकिंग.',
    },
    benefits: {
      en: 'Subsidized wheat at ₹2/kg and rice at ₹3/kg (or free under PMGKAY), portable across any Fair Price Shop in India.',
      hi: '₹2/किग्रा गेहूं और ₹3/किग्रा चावल (या पीएमजीकेएवाई के तहत मुफ्त राशन), पूरे भारत में पोर्टेबल।',
      mr: 'सवलतीच्या दरात गहू व तांदूळ (किंवा मोफत धान्य), देशभरात कोणत्याही रास्त भाव दुकानात उपलब्ध.',
    },
    eligibilityCriteria: {
      minAge: 18,
      maxAge: 120,
      gender: 'All',
      state: 'Maharashtra',
      maxIncome: 100000,
      occupation: ['Daily Wage Worker', 'Agricultural Labour', 'Artisan', 'Unemployed'],
      categories: ['All', 'BPL', 'Antyodaya', 'Priority Household'],
      criteriaText: {
        en: 'Resident of Maharashtra with family annual income within NFSA thresholds. All members must possess valid Aadhaar.',
        hi: 'महाराष्ट्र के निवासी जिनकी वार्षिक आय एनएफएसए सीमा के भीतर हो। सभी सदस्यों का आधार कार्ड आवश्यक।',
        mr: 'महाराष्ट्रातील रहिवासी, कौटुंबिक उत्पन्न अन्न सुरक्षा मर्यादेत. सर्व सदस्यांचे आधार क्रमांक आवश्यक.',
      },
    },
    requiredDocuments: [
      'existing_ration_card',
      'aadhaar_all_members',
      'birth_certificate_child',
      'residence_proof',
      'bank_passbook_head_of_family',
    ],
    applicationProcess: [
      '1. Verify existing Ration Card number',
      '2. Enter details of member to add or modify',
      '3. Upload birth proof or marriage proof',
      '4. Citizen Confirmation and Token Generation',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'Continuous Portal Service',
    },
    officialReference: {
      url: 'https://mahaepos.gov.in',
      authority: 'Food & Civil Supplies Dept, Maharashtra',
    },
    isActive: true,
    icon: '🌾',
    color: 'amber',
  },
  {
    schemeId: 'pm_kisan',
    code: 'IN-AGRI-04',
    category: 'Agriculture',
    department: {
      en: 'Ministry of Agriculture and Farmers Welfare, Govt of India',
      hi: 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार',
      mr: 'कृषी आणि शेतकरी कल्याण मंत्रालय, भारत सरकार',
    },
    name: {
      en: 'PM-KISAN Samman Nidhi',
      hi: 'प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)',
      mr: 'प्रधानमंत्री किसान सन्मान निधी (पीएम-किसान)',
    },
    description: {
      en: 'Income support of ₹6,000 per year in three equal installments of ₹2,000 directly to landholding farmer families across the country.',
      hi: 'देश भर के भूमिधारक किसान परिवारों को प्रति वर्ष ₹6,000 की आय सहायता तीन समान किस्तों में सीधे बैंक खाते में।',
      mr: 'शेतकरी कुटुंबांना थेट बँक खात्यात दरवर्षी ₹६,००० चे आर्थिक सहाय्य (दर ४ महिन्यांनी ₹२,००० चा हप्ता).',
    },
    benefits: {
      en: 'Direct Benefit Transfer (DBT) of ₹6,000/year to support agricultural inputs, seeds, fertilizers, and family expenses.',
      hi: 'खेती की लागत, बीज, खाद व घरेलू खर्चों के लिए प्रति वर्ष ₹6,000 का सीधा बैंक अंतरण।',
      mr: 'शेतीची बि-बियाणे, खते व मशागतीसाठी प्रतिवर्षी ₹६,००० थेट बँक खात्यात.',
    },
    eligibilityCriteria: {
      minAge: 18,
      maxAge: 100,
      gender: 'All',
      state: 'All India',
      maxIncome: null,
      occupation: ['Farmer', 'Cultivator'],
      categories: ['Small Farmer', 'Marginal Farmer', 'All'],
      criteriaText: {
        en: 'Farmer families having cultivable landholding in revenue records. Institutional landholders and high tax payers are excluded.',
        hi: 'राजस्व रिकॉर्ड में खेती योग्य भूमि रखने वाले किसान परिवार। संस्थागत भूमिधारक और आयकरदाता अपात्र हैं।',
        mr: 'जमीन महसूल नोंदीनुसार लागवडीयोग्य शेतजमीन असलेले शेतकरी कुटुंब. संस्थात्मक जमीनधारक अपात्र.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'land_records_7_12',
      'bank_passbook',
      'mobile_linked_aadhaar',
    ],
    applicationProcess: [
      '1. Verification of 7/12 land extract and 8A khata',
      '2. Aadhaar eKYC via OTP or Biometric',
      '3. Bank account NPCI mapping confirmation',
      '4. District Agriculture Officer Approval',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'eKYC required before every installment',
    },
    officialReference: {
      url: 'https://pmkisan.gov.in',
      authority: 'Ministry of Agriculture, India',
    },
    isActive: true,
    icon: '🌱',
    color: 'emerald',
  },
  {
    schemeId: 'ayushman_bharat',
    code: 'IN-HLTH-05',
    category: 'Healthcare',
    department: {
      en: 'National Health Authority, Ministry of Health & Family Welfare',
      hi: 'राष्ट्रीय स्वास्थ्य प्राधिकरण, स्वास्थ्य एवं परिवार कल्याण मंत्रालय',
      mr: 'राष्ट्रीय आरोग्य प्राधिकरण, आरोग्य व कुटुंब कल्याण मंत्रालय',
    },
    name: {
      en: 'Ayushman Bharat PM-JAY (Golden Card)',
      hi: 'आयुष्मान भारत प्रधानमंत्री जन आरोग्य योजना (गोल्डन कार्ड)',
      mr: 'आयुष्मान भारत प्रधानमंत्री जन आरोग्य योजना (गोल्डन कार्ड)',
    },
    description: {
      en: 'Comprehensive cashless health insurance cover of up to ₹5 Lakh per family per year for secondary and tertiary hospitalization across empanelled hospitals.',
      hi: 'सूचीबद्ध अस्पतालों में द्वितीयक और तृतीयक देखभाल हेतु प्रति परिवार प्रति वर्ष ₹5 लाख तक का कैशलेस स्वास्थ्य बीमा।',
      mr: 'सूचीबद्ध रुग्णालयांमध्ये उपचारासाठी प्रति कुटुंब प्रति वर्ष ₹५ लाखांपर्यंतचे मोफत कॅशलेस आरोग्य विमा संरक्षण.',
    },
    benefits: {
      en: 'Free treatment covering 1,949 medical procedures, surgery, medicines, ICU, diagnostics, and post-hospitalization care up to ₹5,00,000.',
      hi: '1,949 उपचार व सर्जरी प्रक्रियाओं, दवाओं, आईसीयू व जांच के लिए ₹5,00,000 तक कैशलेस उपचार।',
      mr: '१,९४९ वैद्यकीय उपचार, शस्त्रक्रिया, औषधे, अतिदक्षता विभाग व तपासण्यांसाठी ₹५,००,००० पर्यंत मोफत उपचार.',
    },
    eligibilityCriteria: {
      minAge: 0,
      maxAge: 120,
      gender: 'All',
      state: 'All India',
      maxIncome: 180000,
      occupation: ['Unorganized Worker', 'Rural Poor', 'Domestic Worker', 'Artisan', 'Driver'],
      categories: ['SECC 2011 Beneficiary', 'BPL', 'Senior Citizen 70+'],
      criteriaText: {
        en: 'Listed in SECC 2011 deprivation criteria, NFSA cardholders, or any senior citizen aged 70 and above irrespective of income.',
        hi: 'SECC 2011 वंचित सूची में शामिल परिवार, खाद्य सुरक्षा कार्डधारक, अथवा 70 वर्ष व उससे अधिक आयु के सभी वरिष्ठ नागरिक।',
        mr: 'SECC २०११ यादीतील वंचित कुटुंबे, अन्न सुरक्षा शिधापत्रिकाधारक, किंवा ७० वर्षे व त्याहून अधिक वयाचे सर्व ज्येष्ठ नागरिक.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'ration_card',
      'mobile_number',
    ],
    applicationProcess: [
      '1. Check family name in Ayushman beneficiary list',
      '2. Complete Aadhaar e-KYC photo verification',
      '3. Generate Ayushman Bharat Golden Card with QR code',
      '4. Download digital health card instantly',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Continuous Service',
      deadline: 'No deadline - apply anytime',
    },
    officialReference: {
      url: 'https://beneficiary.nha.gov.in',
      authority: 'National Health Authority (NHA)',
    },
    isActive: true,
    icon: '🏥',
    color: 'teal',
  },
  {
    schemeId: 'pm_awas',
    code: 'IN-HOUS-06',
    category: 'Housing',
    department: {
      en: 'Ministry of Housing and Urban Affairs / Ministry of Rural Development',
      hi: 'आवासन और शहरी कार्य मंत्रालय / ग्रामीण विकास मंत्रालय',
      mr: 'गृहनिर्माण आणि शहरी दारिद्र्य निर्मूलन मंत्रालय',
    },
    name: {
      en: 'Pradhan Mantri Awas Yojana (PMAY Housing Subsidy)',
      hi: 'प्रधानमंत्री आवास योजना (PMAY पक्का मकान)',
      mr: 'प्रधानमंत्री आवास योजना (PMAY हक्काचे पक्के घर)',
    },
    description: {
      en: 'Financial assistance of ₹1.20 Lakh to ₹2.50 Lakh to homeless and pucca-house-deprived families to construct a permanent house with water and sanitation.',
      hi: 'बेघर और कच्चे मकान में रहने वाले परिवारों को पानी, बिजली और शौचालय युक्त पक्का मकान बनाने हेतु ₹1.20 लाख से ₹2.50 लाख की सहायता।',
      mr: 'कच्च्या घरात राहणाऱ्या किंवा बेघर कुटुंबांना शौचालय, पाणी व विजेसह पक्के घर बांधण्यासाठी ₹१.२० लाख ते ₹२.५० लाखांची मदत.',
    },
    benefits: {
      en: 'Direct construction grant transferred in 4 stage-wise geo-tagged installments, plus 90 days MGNREGA wage support and ₹12,000 for toilet.',
      hi: 'जियो-टैग्ड 4 किस्तों में निर्माण अनुदान, साथ ही 90 दिनों की मनरेगा मजदूरी और शौचालय हेतु ₹12,000।',
      mr: '४ टप्प्यांत थेट बँक खात्यात घरकुल अनुदान, सोबत ९० दिवसांची मनरेगा मजुरी आणि शौचालयासाठी ₹१२,०००.',
    },
    eligibilityCriteria: {
      minAge: 21,
      maxAge: 85,
      gender: 'All',
      state: 'All India',
      maxIncome: 300000,
      occupation: ['All', 'Labourer', 'Small Vendor', 'Unorganized Worker'],
      categories: ['Homeless', 'Kutcha House', 'EWS', 'LIG', 'SC', 'ST'],
      criteriaText: {
        en: 'Family must not own a pucca house anywhere in India. Female head of family preferred as sole or joint owner.',
        hi: 'परिवार के पास भारत में कहीं भी पक्का मकान नहीं होना चाहिए। महिला मुखिया को स्वामित्व में प्राथमिकता।',
        mr: 'कुटुंबाच्या नावावर भारतात कुठेही पक्के घर नसावे. घराच्या मालकीत महिलेचे नाव आवश्यक किंवा प्राधान्य.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'land_ownership_or_patta',
      'income_certificate',
      'bank_passbook',
      'photo_existing_kutcha_house',
    ],
    applicationProcess: [
      '1. Socio-economic survey & Gram Panchayat resolution',
      '2. Registration on AwaasSoft portal with Aadhaar',
      '3. Plinth & Lintel stage geo-tagged photo inspection',
      '4. Direct installment credit to bank account',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: '2028-12-31',
      deadline: 'Annual Gram Sabha Priority List',
    },
    officialReference: {
      url: 'https://pmaymis.gov.in',
      authority: 'Govt of India - PMAY',
    },
    isActive: true,
    icon: '🏠',
    color: 'orange',
  },
  {
    schemeId: 'mgnrega',
    code: 'IN-EMPL-07',
    category: 'Employment',
    department: {
      en: 'Ministry of Rural Development, Government of India',
      hi: 'ग्रामीण विकास मंत्रालय, भारत सरकार',
      mr: 'ग्रामीण विकास मंत्रालय, भारत सरकार',
    },
    name: {
      en: 'MGNREGA (100 Days Guaranteed Rural Employment)',
      hi: 'मनरेगा (100 दिन गारंटीकृत ग्रामीण रोजगार)',
      mr: 'मनरेगा (१०० दिवस हमीभाव ग्रामीण रोजगार)',
    },
    description: {
      en: 'Legal guarantee of at least 100 days of wage employment in a financial year to every rural household whose adult members volunteer to do unskilled manual work.',
      hi: 'प्रत्येक ग्रामीण परिवार को वित्तीय वर्ष में कम से कम 100 दिनों के अकुशल शारीरिक रोजगार की कानूनी गारंटी।',
      mr: 'अकुशल मजुरी काम करण्याची तयारी असलेल्या ग्रामीण कुटुंबांना एका वर्षात किमान १०० दिवसांच्या रोजगाराची कायदेशीर हमी.',
    },
    benefits: {
      en: 'Statutory minimum wage (₹297/day in Maharashtra) paid directly to bank account within 15 days; unemployment allowance if work not given in 15 days.',
      hi: 'महाराष्ट्र में ₹297/दिन की वैधानिक न्यूनतम मजदूरी 15 दिनों में बैंक खाते में; काम न मिलने पर बेरोजगारी भत्ता।',
      mr: 'महाराष्ट्रात ₹२९७/दिवस किमान वेतन थेट बँक खात्यात; १५ दिवसांत काम न दिल्यास बेरोजगारी भत्ता मिळण्याचा अधिकार.',
    },
    eligibilityCriteria: {
      minAge: 18,
      maxAge: 70,
      gender: 'All',
      state: 'Rural India',
      maxIncome: null,
      occupation: ['Rural Unskilled Worker', 'Labourer', 'Farmer'],
      categories: ['All', 'Rural Household'],
      criteriaText: {
        en: 'Adult member of a rural household willing to do unskilled manual work within 5 km of village.',
        hi: 'गाँव के 5 किमी के भीतर अकुशल शारीरिक श्रम करने को तैयार ग्रामीण परिवार का वयस्क सदस्य।',
        mr: 'गावाच्या ५ किमी अंतरात अकुशल काम करण्याची तयारी असलेला ग्रामीण भागातील प्रौढ नागरिक.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'mgnrega_job_card',
      'bank_passbook',
      'passport_photo',
    ],
    applicationProcess: [
      '1. Apply for Job Card at Gram Panchayat',
      '2. Demand for work receipt with dated slip',
      '3. Allocation of worksite within 15 days',
      '4. Weekly muster roll attendance & bank payment',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'Work demand accepted 365 days',
    },
    officialReference: {
      url: 'https://nrega.nic.in',
      authority: 'Govt of India - Rural Development',
    },
    isActive: true,
    icon: '🛠️',
    color: 'amber',
  },
  {
    schemeId: 'ladki_bahin',
    code: 'MH-FIN-08',
    category: 'Financial Assistance',
    department: {
      en: 'Women and Child Development Department, Maharashtra',
      hi: 'महिला एवं बाल विकास विभाग, महाराष्ट्र',
      mr: 'महिला व बालविकास विभाग, महाराष्ट्र',
    },
    name: {
      en: 'Mukhyamantri Majhi Ladki Bahin Yojana',
      hi: 'मुख्यमंत्री माझी लाड़की बहिन योजना (₹1,500 प्रतिमाह)',
      mr: 'मुख्यमंत्री माझी लाडकी बहीण योजना (दरमहा ₹१,५००)',
    },
    description: {
      en: 'Empowerment and financial independence for women aged 21-65 years with direct monthly DBT transfer of ₹1,500 into Aadhaar-seeded bank accounts.',
      hi: '21 से 65 वर्ष की पात्र महिलाओं को आर्थिक स्वावलंबन हेतु प्रति माह ₹1,500 का सीधा बैंक अंतरण।',
      mr: '२१ ते ६५ वर्षे वयोगटातील महिलांना आर्थिक स्वावलंबनासाठी थेट बँक खात्यात दरमहा ₹१,५०० ची मदत.',
    },
    benefits: {
      en: 'Annual direct assistance of ₹18,000 (paid as ₹1,500 every month) for nutrition, healthcare, and household livelihood support.',
      hi: 'पोषण, स्वास्थ्य और पारिवारिक जरूरतों हेतु वार्षिक ₹18,000 (प्रति माह ₹1,500) की नकद सहायता।',
      mr: 'पोषण, आरोग्य व कौटुंबिक गरजांसाठी वार्षिक ₹१८,००० (दरमहा ₹१,५००) थेट बँक खात्यात.',
    },
    eligibilityCriteria: {
      minAge: 21,
      maxAge: 65,
      gender: 'Female',
      state: 'Maharashtra',
      maxIncome: 250000,
      occupation: ['Homemaker', 'Self-employed', 'Farmer', 'Worker'],
      categories: ['All', 'General', 'OBC', 'SC', 'ST', 'EWS'],
      criteriaText: {
        en: 'Married, widowed, divorced, or destitute women aged 21-65. Annual family income below ₹2.5 Lakh. Bank account linked with Aadhaar NPCI.',
        hi: 'विवाहित, विधवा, तलाकशुदा या निराधार महिला (21-65 वर्ष)। वार्षिक पारिवारिक आय ₹2.5 लाख से कम। आधार सीडेड बैंक खाता अनिवार्य।',
        mr: 'विवाहित, विधवा, घटस्फोटित किंवा निराधार महिला (वय २१ ते ६५ वर्षे). कौटुंबिक वार्षिक उत्पन्न ₹२.५ लाखांपेक्षा कमी. आधार लिंक बँक खाते.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'income_certificate_or_yellow_orange_ration_card',
      'domicile_certificate_or_voter_id',
      'bank_passbook',
      'self_declaration_form',
    ],
    applicationProcess: [
      '1. Mobile number OTP verification',
      '2. Aadhaar e-KYC and Bank NPCI seeding check',
      '3. Ration card and Domicile document upload',
      '4. Immediate acknowledgement and SMS confirmation',
    ],
    importantDates: {
      startDate: '2026-01-01',
      endDate: 'Ongoing',
      deadline: 'Disbursement on 15th of every month',
    },
    officialReference: {
      url: 'https://ladakibahin.maharashtra.gov.in',
      authority: 'Women & Child Development, Maharashtra',
    },
    isActive: true,
    icon: '🌸',
    color: 'rose',
  },
  {
    schemeId: 'mudra_loan',
    code: 'IN-FIN-09',
    category: 'Employment',
    department: {
      en: 'Department of Financial Services, Ministry of Finance',
      hi: 'वित्तीय सेवाएं विभाग, वित्त मंत्रालय',
      mr: 'वित्तीय सेवा विभाग, वित्त मंत्रालय',
    },
    name: {
      en: 'Pradhan Mantri MUDRA Yojana (Business Loans up to ₹10 Lakh)',
      hi: 'प्रधानमंत्री मुद्रा योजना (₹10 लाख तक संपार्श्विक-मुक्त ऋण)',
      mr: 'प्रधानमंत्री मुद्रा योजना (₹१० लाखांपर्यंत तारणमुक्त व्यावसायिक कर्ज)',
    },
    description: {
      en: 'Collateral-free loans for micro and small enterprises in manufacturing, trading, and services sectors under Shishu (up to ₹50k), Kishore (up to ₹5L), and Tarun (up to ₹10L).',
      hi: 'सूक्ष्म एवं लघु व्यवसायों के लिए विनिर्माण, व्यापार व सेवा क्षेत्र में बिना गारंटी के ₹10 लाख तक का आसान ऋण।',
      mr: 'लहान व्यवसाय, दुकान, सेवा व उत्पादन सुरू करण्यासाठी किंवा वाढवण्यासाठी विनातारण ₹१० लाखांपर्यंत कर्ज.',
    },
    benefits: {
      en: 'No collateral or guarantor required, low interest rates, MUDRA card for working capital overdraft, and credit guarantee coverage.',
      hi: 'कोई गारंटी या बंधक आवश्यक नहीं, रियायती ब्याज दर, कार्यशील पूंजी हेतु मुद्रा डेबिट कार्ड।',
      mr: 'तारण किंवा हमीदाराची गरज नाही, कमी व्याजदर आणि खेळत्या भांडवलासाठी मुद्रा डेबिट कार्ड.',
    },
    eligibilityCriteria: {
      minAge: 18,
      maxAge: 65,
      gender: 'All',
      state: 'All India',
      maxIncome: null,
      occupation: ['Self Employed', 'Shopkeeper', 'Artisan', 'Vendor', 'Small Business Owner'],
      categories: ['All', 'Women Entrepreneurs', 'OBC', 'SC', 'ST'],
      criteriaText: {
        en: 'Any Indian citizen who has a viable business plan for non-farm income-generating activity such as manufacturing, processing, trading, or service sector.',
        hi: 'गैर-कृषि आय सृजन गतिविधि के लिए व्यवहार्य व्यापार योजना रखने वाला कोई भी भारतीय नागरिक।',
        mr: 'उत्पादन, व्यापार किंवा सेवा क्षेत्रात बिगरशेती व्यवसाय करणारा किंवा सुरू करू इच्छिणारा कोणताही भारतीय नागरिक.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'pan_card',
      'business_address_proof',
      'bank_statement_6_months',
      'project_report_or_business_plan',
    ],
    applicationProcess: [
      '1. Prepare business proposal and machinery quotation',
      '2. Apply via Udyamimitra portal or bank branch',
      '3. Document appraisal and credit verification',
      '4. Loan sanction and disbursement directly to vendor/account',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'Bank sanctions on rolling basis',
    },
    officialReference: {
      url: 'https://www.mudra.org.in',
      authority: 'MUDRA Ltd / Department of Financial Services',
    },
    isActive: true,
    icon: '💼',
    color: 'blue',
  },
  {
    schemeId: 'kisan_credit',
    code: 'IN-AGRI-10',
    category: 'Agriculture',
    department: {
      en: 'NABARD / Ministry of Agriculture & Farmers Welfare',
      hi: 'नाबार्ड / कृषि एवं किसान कल्याण मंत्रालय',
      mr: 'नाबार्ड / कृषी आणि शेतकरी कल्याण मंत्रालय',
    },
    name: {
      en: 'Kisan Credit Card (KCC Subsidized Crop Loan)',
      hi: 'किसान क्रेडिट कार्ड (4% ब्याज पर रियायती फसली ऋण)',
      mr: 'किसान क्रेडिट कार्ड (४% सवलतीच्या दरातील पीक कर्ज)',
    },
    description: {
      en: 'Timely credit support to farmers for crop cultivation, post-harvest expenses, farm maintenance, and allied activities at subsidized 4% effective interest rate.',
      hi: 'फसल की खेती, कटाई, कृषि रखरखाव और पशुपालन हेतु 4% रियायती ब्याज दर पर समय पर ऋण सहायता।',
      mr: 'पीक लागवड, खते, मशागत व पशुपालनासाठी केवळ ४% व्याजदरावर वेळेवर पतपुरवठा.',
    },
    benefits: {
      en: 'Credit limit up to ₹3 Lakh at concessional interest with 3% prompt repayment incentive, credit period up to 5 years, and free crop insurance linkage.',
      hi: 'समय पर भुगतान पर 3% अतिरिक्त छूट के साथ ₹3 लाख तक का ऋण, 5 वर्ष की वैधता और पीएमएफबीवाई सुरक्षा।',
      mr: 'वेळेवर परतफेडीवर ३% अतिरिक्त सूट (निव्वळ व्याज ४%), ₹३ लाखांपर्यंत मर्यादा व पीक विमा संरक्षण.',
    },
    eligibilityCriteria: {
      minAge: 18,
      maxAge: 75,
      gender: 'All',
      state: 'All India',
      maxIncome: null,
      occupation: ['Farmer', 'Tenant Farmer', 'Sharecropper', 'Dairy Farmer', 'Fisherman'],
      categories: ['All Farmers'],
      criteriaText: {
        en: 'Owner cultivators, tenant farmers, oral lessees, sharecroppers, and SHG/JLG groups engaged in agriculture or animal husbandry.',
        hi: 'स्वयं खेती करने वाले किसान, बटाईदार, पट्टेदार और पशुपालन/मत्स्य पालन में लगे स्वयं सहायता समूह।',
        mr: 'शेतजमीन मालक शेतकरी, कुळ, बटाईदार शेतकरी आणि दुग्धव्यवसाय/मत्स्यपालन करणारे शेतकरी गट.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'land_records_7_12_and_8A',
      'sowing_crop_certificate',
      'bank_passbook',
    ],
    applicationProcess: [
      '1. Submit one-page KCC application to District DCC Bank or Commercial Bank',
      '2. Land inspection and scale of finance calculation',
      '3. Card issuance within 14 working days',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'Kharif: 31 July / Rabi: 31 Dec',
    },
    officialReference: {
      url: 'https://myscheme.gov.in/schemes/kcc',
      authority: 'NABARD & Ministry of Agriculture',
    },
    isActive: true,
    icon: '💳',
    color: 'emerald',
  },
  {
    schemeId: 'atal_pension',
    code: 'IN-PENS-11',
    category: 'Pension',
    department: {
      en: 'Pension Fund Regulatory and Development Authority (PFRDA)',
      hi: 'पेंशन निधि विनियामक और विकास प्राधिकरण (PFRDA)',
      mr: 'पेन्शन फंड नियामक आणि विकास प्राधिकरण (PFRDA)',
    },
    name: {
      en: 'Atal Pension Yojana (Guaranteed Pension ₹1,000 to ₹5,000)',
      hi: 'अटल पेंशन योजना (गारंटीकृत मासिक पेंशन ₹1,000 से ₹5,000)',
      mr: 'अटल पेन्शन योजना (हमीभाव मासिक पेन्शन ₹१,००० ते ₹५,०००)',
    },
    description: {
      en: 'Government-backed guaranteed minimum monthly pension of ₹1,000 to ₹5,000 after the age of 60 years for unorganized sector workers.',
      hi: 'असंगठित क्षेत्र के कामगारों के लिए 60 वर्ष की आयु के बाद ₹1,000 से ₹5,000 तक की गारंटीकृत मासिक पेंशन।',
      mr: 'असंघटित क्षेत्रातील कामगारांसाठी वयाच्या ६० वर्षांनंतर दरमहा ₹१,००० ते ₹५,००० ची हमीभाव पेन्शन.',
    },
    benefits: {
      en: 'Lifelong guaranteed pension to subscriber; upon death, same pension to spouse; upon spouse’s death, total corpus returned to nominee.',
      hi: 'सब्सक्राइबर को आजीवन पेंशन, मृत्यु पर पति/पत्नी को वही पेंशन, तथा दोनों की मृत्यु पर नामांकित व्यक्ति को पूरी संचित राशि की वापसी।',
      mr: 'आजीवन निश्चित पेन्शन, मृत्यूनंतर जोडीदाराला पेन्शन आणि दोघांनंतर संपूर्ण रक्कम वारसाला परत.',
    },
    eligibilityCriteria: {
      minAge: 18,
      maxAge: 40,
      gender: 'All',
      state: 'All India',
      maxIncome: null,
      occupation: ['Unorganized Worker', 'Self Employed', 'Driver', 'Daily Wage', 'Shopkeeper'],
      categories: ['Non Income Tax Payer'],
      criteriaText: {
        en: 'Any Indian citizen aged 18-40 having a savings bank account. Must not be an income taxpayer.',
        hi: '18-40 वर्ष का कोई भी भारतीय नागरिक जिसका बचत बैंक खाता हो। आयकरदाता नहीं होना चाहिए।',
        mr: 'बचत बँक खाते असलेला १८ ते ४० वयोगटातील कोणताही भारतीय नागरिक. आयकरदाता नसावा.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'bank_savings_account',
      'mobile_number',
      'nominee_details',
    ],
    applicationProcess: [
      '1. Select desired monthly pension amount (₹1,000 to ₹5,000)',
      '2. Enable auto-debit on savings bank account',
      '3. Generate PRAN (Permanent Retirement Account Number) card',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'Auto-debit monthly, quarterly, or half-yearly',
    },
    officialReference: {
      url: 'https://pfrda.org.in',
      authority: 'PFRDA, Ministry of Finance',
    },
    isActive: true,
    icon: '🛡️',
    color: 'indigo',
  },
  {
    schemeId: 'sukanya_samriddhi',
    code: 'IN-EDU-12',
    category: 'Education',
    department: {
      en: 'Ministry of Finance & Ministry of Women and Child Development',
      hi: 'वित्त मंत्रालय एवं महिला और बाल विकास मंत्रालय',
      mr: 'वित्त मंत्रालय आणि महिला व बालविकास मंत्रालय',
    },
    name: {
      en: 'Sukanya Samriddhi Yojana (Girl Child Savings & Higher Ed)',
      hi: 'सुकन्या समृद्धि योजना (उच्च शिक्षा व भविष्य निर्माण)',
      mr: 'सुकन्या समृद्धी योजना (मुलींच्या उच्च शिक्षणासाठी बचत)',
    },
    description: {
      en: 'High-interest tax-free small savings scheme for girl children below 10 years of age to build a corpus for higher education and marriage.',
      hi: '10 वर्ष से कम उम्र की बालिकाओं के उच्च शिक्षा और विवाह हेतु उच्च ब्याज दर युक्त कर-मुक्त बचत योजना।',
      mr: '१० वर्षांखालील मुलींच्या उच्च शिक्षण व भवितव्यासाठी सर्वाधिक व्याज देणारी करमुक्त सरकारी बचत योजना.',
    },
    benefits: {
      en: 'Government guaranteed 8.2% annual compound interest, Section 80C tax exemption on deposit, and 100% tax-free maturity amount.',
      hi: '8.2% वार्षिक चक्रवृद्धि ब्याज, धारा 80सी के तहत आयकर छूट, और परिपक्वता राशि पूर्णतः कर-मुक्त।',
      mr: '८.२% वार्षिक चक्रवाढ व्याजदर, आयकर कलम ८०सी अंतर्गत करसवलत आणि परिपक्वता रक्कम पूर्णपणे करमुक्त.',
    },
    eligibilityCriteria: {
      minAge: 0,
      maxAge: 10,
      gender: 'Female',
      state: 'All India',
      maxIncome: null,
      occupation: ['Girl Child (Through Guardian)'],
      categories: ['All Girl Children'],
      criteriaText: {
        en: 'Can be opened by parent or legal guardian for a girl child from her birth up to age 10 years. Maximum 2 accounts per family.',
        hi: 'माता-पिता या अभिभावक द्वारा जन्म से 10 वर्ष तक की बालिका के नाम पर खाता खोला जा सकता है। अधिकतम 2 खाते।',
        mr: 'मुलीच्या जन्मापासून ते वयाच्या १० वर्षांपर्यंत पालकांमार्फत खाते उघडता येते. एका कुटुंबात जास्तीत जास्त २ मुली.',
      },
    },
    requiredDocuments: [
      'girl_child_birth_certificate',
      'parent_aadhaar_card',
      'parent_pan_card',
      'address_proof',
      'initial_deposit_slip',
    ],
    applicationProcess: [
      '1. Fill account opening form at Post Office or Bank branch',
      '2. Attach birth certificate and guardian KYC',
      '3. Deposit initial minimum amount of ₹250',
      '4. Receive Sukanya Samriddhi Passbook',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'Minimum ₹250 per financial year to keep active',
    },
    officialReference: {
      url: 'https://nsiindia.gov.in',
      authority: 'National Savings Institute, Govt of India',
    },
    isActive: true,
    icon: '👧',
    color: 'teal',
  },
  {
    schemeId: 'income_certificate',
    code: 'MH-REV-IC-01',
    category: 'Social Welfare',
    department: {
      en: 'Revenue Department (Tahsil Office), Maharashtra',
      hi: 'राजस्व विभाग (तहसील कार्यालय), महाराष्ट्र',
      mr: 'महसूल विभाग (तहसील कार्यालय), महाराष्ट्र',
    },
    name: {
      en: 'Income Certificate',
      hi: 'आय प्रमाणपत्र',
      mr: 'उत्पन्नाचा दाखला',
    },
    description: {
      en: 'Certificate of annual family income, needed for scholarships, fee concessions and many welfare schemes.',
      hi: 'वार्षिक पारिवारिक आय का प्रमाणपत्र, जो छात्रवृत्ति, शुल्क रियायत और कई कल्याणकारी योजनाओं के लिए आवश्यक है।',
      mr: 'कुटुंबाच्या वार्षिक उत्पन्नाचा दाखला, जो शिष्यवृत्ती, शुल्क सवलत आणि अनेक कल्याणकारी योजनांसाठी आवश्यक आहे.',
    },
    benefits: {
      en: 'Official proof of family income accepted by government departments and educational institutions.',
      hi: 'सरकारी विभागों और शैक्षणिक संस्थानों द्वारा मान्य पारिवारिक आय का आधिकारिक प्रमाण।',
      mr: 'शासकीय विभाग आणि शैक्षणिक संस्थांनी मान्य केलेला कुटुंबाच्या उत्पन्नाचा अधिकृत पुरावा.',
    },
    eligibilityCriteria: {
      minAge: 0,
      maxAge: 120,
      gender: 'All',
      state: 'Maharashtra',
      categories: ['All'],
      criteriaText: {
        en: 'Any resident of Maharashtra can apply. Indicative information: confirm the exact document list with your Tahsil office.',
        hi: 'महाराष्ट्र का कोई भी निवासी आवेदन कर सकता है। सांकेतिक जानकारी: सटीक दस्तावेज़ सूची अपने तहसील कार्यालय से पुष्टि करें।',
        mr: 'महाराष्ट्रातील कोणताही रहिवासी अर्ज करू शकतो. सूचक माहिती: अचूक कागदपत्र यादी तहसील कार्यालयात खात्री करा.',
      },
    },
    requiredDocuments: [
      'aadhaar_card',
      'ration_card',
      'residence_proof',
      'income_proof',
      'self_declaration',
    ],
    applicationProcess: [
      '1. Fill the application with personal and family income details',
      '2. Upload identity, residence and income proof',
      '3. Review the draft and confirm submission yourself',
      '4. Track the application; confirm the exact document list with the Tahsil office',
    ],
    importantDates: {
      startDate: 'Ongoing',
      endDate: 'Open All Year',
      deadline: 'Continuous Service',
    },
    officialReference: {
      url: 'https://aaplesarkar.mahaonline.gov.in',
      authority: 'Aaple Sarkar, Government of Maharashtra',
    },
    isActive: true,
    icon: '📃',
    color: 'indigo',
  },
];

import {
  saveDocument,
  Scheme,
  Notification,
  SupportTicket,
} from './models/index.js';

export async function seedGlobalSchemes() {
  const seededSchemes = [];
  for (const s of SCHEMES_DATA) {
    seededSchemes.push(await saveDocument(Scheme, s));
  }
  return seededSchemes;
}

/**
 * Seeds global schemes and, ONLY when includeCitizenData is true (explicit demo
 * environment), sample citizen-specific notifications and tickets for userId.
 */
export async function seedSchemesAndPlatformData(
  userId = 'CITIZEN-RAMABAI-01',
  { includeCitizenData = true } = {}
) {
  const seededSchemes = [];
  for (const s of SCHEMES_DATA) {
    const doc = await saveDocument(Scheme, s);
    seededSchemes.push(doc);
  }

  if (!includeCitizenData) {
    return { schemes: seededSchemes, notifications: [], tickets: [] };
  }

  const initialNotifications = [
    {
      notificationId: 'NOTIF-001',
      userId: String(userId),
      title: 'Action Required: Re-verify Life Certificate',
      message:
        'Office query received on your Pension application (PEN-2026-88213). Please upload a fresh Jeevan Pramaan.',
      type: 'DOCUMENT_ALERT',
      read: false,
      link: '/applications/CASE-DEMO-001/tracking',
      createdAt: new Date('2026-10-11T10:00:00Z'),
    },
    {
      notificationId: 'NOTIF-002',
      userId: String(userId),
      title: 'Eligible Scheme: Mukhyamantri Majhi Ladki Bahin',
      message:
        'You may be eligible for ₹1,500 monthly financial assistance. Check details and apply online.',
      type: 'ANNOUNCEMENT',
      read: false,
      link: '/schemes/ladki_bahin',
      createdAt: new Date('2026-10-15T14:30:00Z'),
    },
    {
      notificationId: 'NOTIF-003',
      userId: String(userId),
      title: 'Pension Application Stalled (+21 Days)',
      message:
        'Your application has been pending at the Taluka office for over 7 days. NagarSathi AI Caller is ready to intervene.',
      type: 'STATUS_UPDATE',
      read: true,
      link: '/applications/CASE-DEMO-001/tracking',
      createdAt: new Date('2026-10-22T10:00:00Z'),
    },
    {
      notificationId: 'NOTIF-004',
      userId: String(userId),
      title: 'Scholarship Application Window Open',
      message:
        'Post-Matric MahaDBT scholarship applications for 2026-27 are now open. 80% fields can be auto-filled from your Vault.',
      type: 'DEADLINE',
      read: true,
      link: '/schemes/scholarship',
      createdAt: new Date('2026-10-25T09:00:00Z'),
    },
  ];

  const seededNotifications = [];
  for (const n of initialNotifications) {
    const doc = await saveDocument(Notification, n);
    seededNotifications.push(doc);
  }

  const initialTickets = [
    {
      ticketId: 'TKT-2026-8821',
      userId: String(userId),
      category: 'APPLICATION_DELAY',
      subject: 'Delay in Pension Verification at Taluka Office',
      description:
        'Application PEN-2026-88213 submitted on 1st Oct is stalled at Ward Verification Desk.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      responses: [
        {
          author: 'Taluka Welfare Helpdesk',
          role: 'OFFICER',
          message:
            'Desk officer has logged escalation REF-5521. Verification scheduled within 3 working days.',
          createdAt: new Date('2026-10-23T11:00:00Z'),
        },
      ],
      createdAt: new Date('2026-10-22T12:00:00Z'),
      updatedAt: new Date('2026-10-23T11:00:00Z'),
    },
  ];

  const seededTickets = [];
  for (const t of initialTickets) {
    const doc = await saveDocument(SupportTicket, t);
    seededTickets.push(doc);
  }

  return {
    schemes: seededSchemes,
    notifications: seededNotifications,
    tickets: seededTickets,
  };
}
