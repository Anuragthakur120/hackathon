import express from 'express';
import {
  Scheme,
  findDocuments,
  findOneDocument,
  SCHEMES_DATA,
  seedGlobalSchemes,
} from '@nagarsathi/database';
import { rewriteReplyWithLlm } from '../voiceServices.js';

export async function ensurePlatformSeeded() {
  try {
    const existingSchemes = await findDocuments(Scheme);
    if (!existingSchemes || existingSchemes.length === 0) {
      await seedGlobalSchemes();
    }
  } catch {
    // If running in in-memory test environment, seed will initialize per store
  }
}

export function createPlatformRouter({ _agentAdapter = null, _portalAdapter = null } = {}) {
  const router = express.Router();

  // ==========================================================================
  // 1. Government Schemes Routes (/schemes, /schemes/:id)
  // ==========================================================================
  router.get('/schemes', async (req, res, next) => {
    try {
      await ensurePlatformSeeded();
      const { category, search, state, page = 1, limit = 20, sort = 'relevance' } = req.query;

      let schemes = await findDocuments(Scheme);
      if (!schemes || schemes.length === 0) {
        schemes = SCHEMES_DATA;
      }

      // Filter by category
      if (category && category !== 'All') {
        schemes = schemes.filter(
          (s) => String(s.category).toLowerCase() === String(category).toLowerCase()
        );
      }

      // Filter by state
      if (state && state !== 'All') {
        schemes = schemes.filter(
          (s) =>
            s.eligibilityCriteria?.state === 'All India' ||
            String(s.eligibilityCriteria?.state).toLowerCase().includes(String(state).toLowerCase())
        );
      }

      // Filter by search query
      if (search && String(search).trim().length > 0) {
        const query = String(search).toLowerCase().trim();
        schemes = schemes.filter(
          (s) =>
            s.name?.en?.toLowerCase().includes(query) ||
            s.name?.hi?.toLowerCase().includes(query) ||
            s.name?.mr?.toLowerCase().includes(query) ||
            s.description?.en?.toLowerCase().includes(query) ||
            s.code?.toLowerCase().includes(query) ||
            s.category?.toLowerCase().includes(query)
        );
      }

      // Sort
      if (sort === 'newest') {
        schemes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }

      const total = schemes.length;
      const startIndex = (Number(page) - 1) * Number(limit);
      const paginated = schemes.slice(startIndex, startIndex + Number(limit));

      return res.status(200).json({
        display: `${total} शासकीय योजना उपलब्ध आहेत (Government Schemes)`,
        speech: `${total} सरकारी योजना उपलब्ध आहेत.`,
        data: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
          schemes: paginated,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/schemes/:id', async (req, res, next) => {
    try {
      await ensurePlatformSeeded();
      const id = req.params.id;
      let scheme = await findOneDocument(Scheme, { schemeId: id });
      if (!scheme) {
        scheme = await findOneDocument(Scheme, { code: id });
      }
      if (!scheme) {
        scheme = SCHEMES_DATA.find((s) => s.schemeId === id || s.code === id);
      }

      if (!scheme) {
        return res.status(404).json({
          error: 'SCHEME_NOT_FOUND',
          display: 'योजना सापडली नाही.',
          speech: 'ही योजना सापडली नाही.',
          data: null,
        });
      }

      return res.status(200).json({
        display: scheme.name?.mr || scheme.name?.en,
        speech: scheme.name?.mr || scheme.name?.en,
        data: { scheme },
      });
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 2. AI Eligibility Checker (/eligibility/check)
  // ==========================================================================
  router.post('/eligibility/check', async (req, res, next) => {
    try {
      await ensurePlatformSeeded();
      const {
        age = 68,
        gender = 'Female',
        state = 'Maharashtra',
        income = 24000,
        occupation = 'Retired',
        category = 'General',
      } = req.body || {};

      let allSchemes = await findDocuments(Scheme);
      if (!allSchemes || allSchemes.length === 0) {
        allSchemes = SCHEMES_DATA;
      }

      const eligible = [];
      const potentiallyEligible = [];
      const notEligible = [];

      for (const s of allSchemes) {
        const crit = s.eligibilityCriteria || {};
        let eligiblePoints = 0;
        let reasons = [];
        let missing = [];

        // 1. Age check
        const numAge = Number(age);
        if (numAge >= (crit.minAge ?? 0) && numAge <= (crit.maxAge ?? 120)) {
          eligiblePoints += 1;
          reasons.push(`Age ${numAge} qualifies for ${crit.minAge}-${crit.maxAge} criteria`);
        } else {
          missing.push(`Age requirement: ${crit.minAge}-${crit.maxAge} years (provided: ${numAge})`);
        }

        // 2. Gender check
        if (!crit.gender || crit.gender === 'All' || crit.gender === gender) {
          eligiblePoints += 1;
          reasons.push(`Gender requirement matched (${gender})`);
        } else {
          missing.push(`Scheme is exclusively for ${crit.gender}`);
        }

        // 3. State check
        if (!crit.state || crit.state === 'All India' || String(crit.state).toLowerCase().includes(String(state).toLowerCase())) {
          eligiblePoints += 1;
          reasons.push(`State domicile matched (${state})`);
        } else {
          missing.push(`Requires residence in ${crit.state}`);
        }

        // 4. Income check
        const numIncome = Number(income);
        if (!crit.maxIncome || numIncome <= crit.maxIncome) {
          eligiblePoints += 1;
          reasons.push(crit.maxIncome ? `Family income ₹${numIncome} is within limit of ₹${crit.maxIncome}` : 'No income cap');
        } else {
          missing.push(`Family income exceeds cap of ₹${crit.maxIncome}/year`);
        }

        // 5. Occupation check
        if (occupation && (!crit.occupation || crit.occupation === 'All' || String(crit.occupation).toLowerCase().includes(String(occupation).toLowerCase()))) {
          eligiblePoints += 1;
          reasons.push(`Occupation requirement met (${occupation})`);
        }

        // 6. Category check
        if (category && (!crit.category || crit.category === 'All' || String(crit.category).toLowerCase().includes(String(category).toLowerCase()))) {
          eligiblePoints += 1;
          reasons.push(`Social category matched (${category})`);
        }

        const matchScore = Math.min(100, Math.round((eligiblePoints / 4) * 100));

        const resultItem = {
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

        if (matchScore >= 75) {
          eligible.push(resultItem);
        } else if (matchScore >= 50) {
          potentiallyEligible.push(resultItem);
        } else {
          notEligible.push(resultItem);
        }
      }

      return res.status(200).json({
        display: `पात्रता पडताळणी पूर्ण झाली: ${eligible.length} योजनांसाठी पात्र (Eligibility Check Complete)`,
        speech: `तुम्ही ${eligible.length} योजनांसाठी पात्र आहात.`,
        data: {
          eligible,
          potentiallyEligible,
          notEligible,
          totalEvaluated: allSchemes.length,
          disclaimer:
            'NagarSathi AI Eligibility is an informational recommendation based on user-provided inputs. Official sanction is subject to document scrutiny by the competent government department.',
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 3. AI Assistant Query & Knowledge Base (/assistant/message)
  // ==========================================================================
  router.post(['/assistant', '/assistant/message'], async (req, res, next) => {
    try {
      const { message, language = 'en-IN', detectedLang = null, hinglish = false, context = {} } = req.body || {};
      const msg = String(message || '').trim().toLowerCase();
      // The language the citizen actually used wins over the UI language.
      const lang = String(detectedLang || language).toLowerCase();

      // Detection
      const isScholarship = /scholar|शिष्यवृत्ती|छात्रवृत्ति|mahadbt|mptass|matric|polytechnic|degree|college|fees/i.test(msg);
      const isIncome = /income|उत्पन्न|दाखla|दाखला|आय प्रमाण|tahsildar|talathi/i.test(msg);
      const isRation = /ration|राशन|रेशन|शिधापत्रिका|nfsa|khadyann/i.test(msg);
      const isPension = /pension|पेन्शन|पेंशन|वृद्धावस्था|old age|jeevan pramaan/i.test(msg);
      const isAadhaar = /aadhaar|aadhar|आधार/i.test(msg);
      const isPan = /pan|पॅन|पैन/i.test(msg);
      const isHousing = /awas|housing|pmay|घरकुल|आवास|मकान/i.test(msg);
      const isAyushman = /ayushman|pmjay|आरोग्य|स्वास्थ्य|golden card|hospital/i.test(msg);
      const isStatus = /status|track|tracking|स्थिति|ट्रॅक|स्टेटस|kahan tak/i.test(msg);

      // Check verified docs from context
      const verifiedDocs = context.verifiedDocs || ['aadhaar_card'];
      const hasVerifiedAadhaar = verifiedDocs.some((d) => String(d).includes('aadhaar'));

      let reply = '';
      let speech = '';
      let actionTo = '/schemes';
      let nextStepLabel = 'Explore Schemes';
      let suggestedActions = [];

      if (isScholarship) {
        reply = lang.startsWith('hi')
          ? `पोस्ट-मैट्रिक / महाडीबीटी / एमपीटीएएस छात्रवृत्ति:\n• पात्रता: मान्यता प्राप्त कॉलेज/डिप्लोमा में नामांकित, पारिवारिक वार्षिक आय ₹2.5 लाख से कम।\n• आवश्यक दस्तावेज: आय प्रमाण पत्र (Tahsildar), पिछली अंकतालिका, कॉलेज बोनाफाइड/फीस रसीद, आधार कार्ड (${hasVerifiedAadhaar ? '✓ आपके वॉल्ट में सत्यापित है' : 'सत्यापित करना होगा'})।\n• सत्यापन व समय: फॉर्म सीधे आपके कॉलेज नोडल अधिकारी व प्राचार्य डेस्क पर जाता है (तहसील जाने की आवश्यकता नहीं)। समय: 7 से 14 कार्य दिवस।\n• अगला कदम: नीचे "Apply for Scholarship" पर क्लिक करके ड्राफ्ट फॉर्म तैयार करें। (गेट 2 सहमति के बिना फॉर्म सबमिट नहीं होगा)।`
          : lang.startsWith('mr')
          ? `मॅट्रिकोत्तर / महाडीबीटी शिष्यवृत्ती:\n• पात्रता: मान्यताप्राप्त पदविका/पदवी अभ्यासक्रमात प्रवेश, कौटुंबिक वार्षिक उत्पन्न ₹२.५ लाखांपर्यंत.\n• आवश्यक कागदपत्रे: उत्पन्नाचा दाखला, मागील गुणपत्रिका, कॉलेज बोनाफाइड/फी पावती, आधार कार्ड (${hasVerifiedAadhaar ? '✓ तुमच्या व्हॉल्टमध्ये सत्यापित आहे' : 'सत्यापित करावे लागेल'}).\n• पडताळणी डेस्क व कालावधी: अर्ज थेट तुमच्या कॉलेजचे प्राचार्य व नोडल अधिकारी कमिटीकडे पडताळणीसाठी जातो. कालावधी: ७ ते १४ कार्य दिवस.\n• पुढील कृती: खाली "Apply for Scholarship" वर क्लिक करून मसुदा अर्ज तयार करा. (गेट २ प्रत्यक्ष मंजुरीशिवाय अर्ज सबमिट होणार नाही).`
          : `Post-Matric / MahaDBT / MPTASS Scholarship:\n• Eligibility: Enrolled in recognized diploma/degree course, family annual income under ₹2.5 Lakh.\n• Required Documents: Tahsildar Income Certificate, Previous Marksheet, College Bonafide/Fee Receipt, Aadhaar Card (${hasVerifiedAadhaar ? '✓ Already Verified in your Vault' : 'Verification Required'}).\n• Verification Routing & Timeline: Submitted directly to your College / Institute Verification Desk (Principal & Nodal Officer Committee). No Taluka office visit required. Typical timeline: 7 to 14 working days.\n• Next Step: Click "Apply for Scholarship" to prepare your DRAFT application. Note: Hard Safety Gate 2 ensures no form is submitted without your physical button confirmation.`;
        speech = reply;
        actionTo = '/apply/scholarship';
        nextStepLabel = 'Apply for Scholarship (DRAFT)';
        suggestedActions = [
          { label: 'Apply for Scholarship', query: 'I want to apply for MahaDBT scholarship now' },
          { label: 'Required Documents for Scholarship', query: 'What documents are required for scholarship?' },
          { label: 'Scholarship Eligibility & Income Limit', query: 'What is the eligibility for scholarship?' },
          { label: 'College Verification Process (7-14 Days)', query: 'How does college verification work for scholarship?' },
        ];
      } else if (isIncome) {
        reply = lang.startsWith('hi')
          ? `तहसीलदार आय प्रमाण पत्र (Income Certificate):\n• उपयोग: शैक्षणिक छात्रवृत्ति, शुल्क प्रतिपूर्ति, राशन कार्ड व सरकारी योजनाओं के लिए मान्य।\n• आवश्यक दस्तावेज: राशन कार्ड, स्व-घोषणा पत्र, तलाठी/पटवारी सत्यापन रिपोर्ट, पहचान प्रमाण (${hasVerifiedAadhaar ? '✓ आधार वॉल्ट में सत्यापित है' : 'आधार आवश्यक'})।\n• कार्यालय व समय: तहसील राजस्व कार्यालय / आपले सरकार पोर्टल। समय: 7 से 14 कार्य दिवस। शुल्क: ₹33 सरकारी शुल्क।\n• अगला कदम: नीचे "Apply for Income Certificate" पर क्लिक करके ड्राफ्ट फॉर्म तैयार करें।`
          : lang.startsWith('mr')
          ? `तहसीलदार उत्पन्नाचा दाखला (Income Certificate):\n• उपयोग: शैक्षणिक शिष्यवृत्ती, फी सवलत, रेशन कार्ड आणि सर्व शासकीय योजनांसाठी अधिकृत.\n• आवश्यक कागदपत्रे: रेशन कार्ड, स्वयंघोषणापत्र, तलाठी चौकशी अहवाल, ओळख पुरावा (${hasVerifiedAadhaar ? '✓ आधार व्हॉल्टमध्ये सत्यापित आहे' : 'आधार आवश्यक'}).\n• कार्यालय व कालावधी: तहसील महसूल कार्यालय / आपले सरकार पोर्टल. कालावधी: ७ ते १४ कार्य दिवस. शासकीय शुल्क: ₹३३.\n• पुढील कृती: खाली "Apply for Income Certificate" वर क्लिक करून मसुदा अर्ज तयार करा.`
          : `Tahsildar Income Certificate:\n• Purpose: Required for college scholarships, fee waivers, ration cards, and welfare schemes.\n• Required Documents: Ration Card, Self-declaration, Talathi inspection report, Identity proof (${hasVerifiedAadhaar ? '✓ Aadhaar is Verified in Vault' : 'Aadhaar Required'}).\n• Authority & Timeline: District Revenue & Tahsildar Portal (e-District / Aaple Sarkar). Standard processing timeline: 7 to 14 working days. Fee: ₹33.\n• Next Step: Click "Apply for Income Certificate" to prepare a draft application.`;
        speech = reply;
        actionTo = '/apply/income_certificate';
        nextStepLabel = 'Apply for Income Certificate (DRAFT)';
        suggestedActions = [
          { label: 'Apply for Income Certificate', query: 'How to apply for Tahsildar Income Certificate?' },
          { label: 'Required Documents for Income Certificate', query: 'What documents are required for Income Certificate?' },
          { label: 'Income Certificate Validity (1 to 3 Years)', query: 'What is the validity of Tahsildar Income Certificate?' },
          { label: 'Talathi Verification Process (7-14 Days)', query: 'How does Talathi verification work for income certificate?' },
        ];
      } else if (isRation) {
        reply = lang.startsWith('hi')
          ? 'राशन कार्ड (Food & Civil Supplies): राष्ट्रीय खाद्य सुरक्षा योजना (NFSA) के अंतर्गत रियायती खाद्यान्न कोटा, नए सदस्य का नाम जोड़ना और राशन कार्ड स्थानांतरण सेवा। समय: 7 से 14 कार्य दिवस।'
          : lang.startsWith('mr')
          ? 'रेशन कार्ड (अन्न व नागरी पुरवठा): राष्ट्रीय अन्न सुरक्षा योजनेअंतर्गत अनुदानित धान्य कोटा, नवीन सदस्य नोंदणी व रास्त भाव धान्य दुकान बदल सेवा. कालावधी: ७ ते १४ कार्य दिवस.'
          : 'National Food Security Card (Ration Card Services): Applications for subsidized foodgrain quota, adding family members, and fair price shop transfer under Food & Civil Supplies Department. SLA: 7 to 14 working days.';
        speech = reply;
        actionTo = '/schemes';
        nextStepLabel = 'Ration Schemes Catalog';
        suggestedActions = [
          { label: 'Add Family Member to Ration Card', query: 'How to add family member to ration card?' },
          { label: 'Required Documents for Ration Card', query: 'What documents are needed for ration card?' },
          { label: 'Check Subsidized Ration Quota (NFSA)', query: 'How to check subsidized foodgrain quota?' },
        ];
      } else if (isPension) {
        reply = lang.startsWith('hi')
          ? 'इंदिरा गांधी / संजय गांधी वृद्धावस्था पेंशन: 65 वर्ष या उससे अधिक आयु के बीपीएल नागरिकों को ₹1,000 मासिक पेंशन। आवश्यक दस्तावेज: आधार कार्ड, बैंक पासबुक, जीवन प्रमाण पत्र। कार्यालय: तालुका सामाजिक कल्याण कार्यालय। समय: 7 से 14 कार्य दिवस।'
          : lang.startsWith('mr')
          ? 'इंदिरा गांधी / संजय गांधी निराधार वृद्धापकाळ पेन्शन: ६५ वर्षे किंवा त्याहून अधिक वयाच्या नागरिकांना ₹१,००० मासिक निवृत्तीवेतन. आवश्यक कागदपत्रे: आधार कार्ड, बँक पासबुक, डिजिटल जीवन प्रमाणपत्र. कार्यालय: तालुका सामाजिक कल्याण कार्यालय. कालावधी: ७ ते १४ दिवस.'
          : 'Indira Gandhi / Sanjay Gandhi Old Age Pension Scheme provides ₹1,000 monthly financial assistance to eligible senior citizens. Required documents: Aadhaar card, Bank passbook, Digital Life Certificate. Office: Taluka Social Welfare Office. Timeline: 7 to 14 working days.';
        speech = reply;
        actionTo = '/apply/pension';
        nextStepLabel = 'Apply for Pension (DRAFT)';
        suggestedActions = [
          { label: 'Apply for Old Age Pension', query: 'How to apply for Old Age Pension Scheme?' },
          { label: 'Pension Eligibility & Age Limit', query: 'What is the age limit and eligibility for pension?' },
          { label: 'Required Documents for Pension', query: 'What documents are required for pension?' },
        ];
      } else if (isAadhaar || isPan) {
        reply = lang.startsWith('hi')
          ? 'पहचान पत्र सत्यापन (Aadhaar & PAN): आधार 12-अंक और Verhoeff चेकसम के आधार पर सत्यापित होता है। पैन कार्ड 10-वर्ण आयकर प्रारूप से सत्यापित होता है। सभी नंबर AES-256-GCM द्वारा सुरक्षित और मास्क किए जाते हैं।'
          : lang.startsWith('mr')
          ? 'ओळखपत्र पडताळणी (आधार व पॅन): आधार १२-अंकी संख्या व Verhoeff चेकसमने तपासले जाते. पॅन कार्ड आयकर नियमांनुसार तपासले जाते. सर्व ओळख क्रमांक AES-256-GCM ने एन्क्रिप्ट व मास्क केले जातात.'
          : 'Identity Verification (Aadhaar & PAN): Aadhaar undergoes 12-digit format and Verhoeff mathematical checksum validation. PAN undergoes Income Tax format validation. All identifiers are encrypted with AES-256-GCM and masked to protect privacy.';
        speech = reply;
        actionTo = '/documents';
        nextStepLabel = 'Open Document Vault';
        suggestedActions = [
          { label: 'Verify Aadhaar in Vault', query: 'How to verify Aadhaar in document vault?' },
          { label: 'Verify PAN Card in Vault', query: 'How to verify PAN card in document vault?' },
          { label: 'Identity Privacy & Encryption', query: 'How does NagarSathi protect Aadhaar privacy?' },
        ];
      } else if (isHousing) {
        reply = 'Pradhan Mantri Awas Yojana (PMAY) provides ₹1.20 Lakh to ₹2.50 Lakh financial subsidy for pucca house construction to homeless and kuccha-house families. Office: Municipal / Gram Panchayat Housing Desk. Timeline: 14 to 30 days.';
        speech = reply;
        actionTo = '/schemes';
        nextStepLabel = 'View Housing Schemes';
        suggestedActions = [
          { label: 'Apply for PMAY Housing Subsidy', query: 'How to apply for PMAY housing subsidy?' },
          { label: 'PMAY Housing Eligibility', query: 'Who is eligible for PMAY housing?' },
          { label: 'Required Documents for PMAY', query: 'What documents are needed for housing subsidy?' },
        ];
      } else if (isAyushman) {
        reply = 'Ayushman Bharat PM-JAY provides comprehensive cashless health cover of up to ₹5 Lakh per family per year for secondary and tertiary care hospitalization across empanelled hospitals. Golden Card issued via Aadhaar verification.';
        speech = reply;
        actionTo = '/schemes';
        nextStepLabel = 'Healthcare Schemes';
        suggestedActions = [
          { label: 'Ayushman Golden Card Eligibility', query: 'How to check Ayushman Bharat eligibility?' },
          { label: 'Find Empanelled Hospital', query: 'How to find Ayushman Bharat hospital?' },
        ];
      } else if (isStatus) {
        reply = 'Active Application Tracking: Once submitted, applications proceed through Desk Verification (7-14 working days SLA) followed by Sanction Order and DBT disbursement. You can inspect exact tracking stages and days remaining under My Applications.';
        speech = reply;
        actionTo = '/applications';
        nextStepLabel = 'View Applications (7-14 Days SLA)';
        suggestedActions = [
          { label: 'Check Submitted Application Status', query: 'What is the status of my active application?' },
          { label: 'Physical Verification Timeline (7-14 Days)', query: 'How long does physical verification take?' },
        ];
      } else {
        reply = lang.startsWith('hi')
          ? 'नमस्ते! मैं आपका नगरसाथी एआई सहायक हूँ। आप छात्रवृत्ति (Scholarship), आय प्रमाण पत्र (Income Certificate), राशन कार्ड, पेंशन, आवास या अन्य योजनाओं के बारे में पूछ सकते हैं। यदि आपके प्रश्न का स्पष्ट समाधान नहीं मिलता है, तो कृपया हमारे नागरिक मदद केंद्र से संपर्क करें।'
          : lang.startsWith('mr')
          ? 'नमस्कार! मी तुमचा नगरसाथी एआई सहाय्यक आहे. तुम्ही शिष्यवृत्ती, उत्पन्नाचा दाखला, रेशन कार्ड, पेन्शन, घरकुल योजना किंवा इतर कोणत्याही योजनेबद्दल विचारू शकता. अधिक मदतीसाठी मदत केंद्राशी संपर्क साधा.'
          : 'Hello! I am your NagarSathi Citizen Assistant. Ask about Scholarship, Income Certificate, Ration Card, Pension, Housing Subsidy, or check application tracking. If you need direct assistance, you can also contact Madad Kendra.';
        speech = reply;
        actionTo = '/schemes';
        nextStepLabel = 'Explore Schemes Catalog';
        suggestedActions = [
          { label: '🎓 Apply for Scholarship', query: 'I want to apply for MahaDBT scholarship now' },
          { label: '📜 Apply for Income Certificate', query: 'How to apply for Tahsildar Income Certificate?' },
          { label: '🌾 Ration Card Services', query: 'Tell me about ration card services' },
          { label: '⏱️ Track My Application (7-14 Days SLA)', query: 'Check status of my submitted application' },
          { label: '🏥 Madad Kendra Support', query: 'Connect me with Madad Kendra citizen support' },
        ];
      }

      // Optional LLM layer: answer in the user's own language/script (Hinglish if they mix). Facts above stay grounded.
      let llmUsed = false;
      const needsRewrite =
        Boolean(detectedLang) && (!/^(en|hi|mr)/.test(lang) || Boolean(process.env.ANTHROPIC_API_KEY));
      if (needsRewrite) {
        const out = await rewriteReplyWithLlm({
          userMessage: String(message || ''),
          detectedLang,
          hinglish: Boolean(hinglish),
          facts: reply,
        });
        reply = out.text;
        speech = out.text;
        llmUsed = out.llm;
      }

      return res.status(200).json({
        display: reply,
        speech,
        data: {
          reply,
          status: 'ok',
          // Language the reply text is actually written in (English when no LLM can translate it).
          replyLang:
            llmUsed || /^(en|hi|mr)/.test(lang) ? detectedLang || language : 'en-IN',
          llm: llmUsed,
          action: { type: 'navigate', to: actionTo },
          nextStep: { label: nextStepLabel, to: actionTo },
          suggestedActions,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
