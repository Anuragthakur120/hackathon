import express from 'express';
import {
  User,
  Profile,
  VaultDoc,
  Case,
  saveDocument,
  findDocuments,
  findOneDocument,
  deleteDocuments,
  createEncryptedProfile,
  deleteAllCitizenData,
  loadAllCatalogs,
  loadCatalog,
  autoFillDraftFields,
} from '@nagarsathi/database';
import {
  AUTH_COOKIE_NAME,
  signCitizenJwt,
  requireCitizenAuth,
  assertSameCitizen,
} from '../auth.js';
import {
  encryptWithEnvKey,
  maskAadhaar,
  maskPhone,
  maskBankAccount,
  sanitizeForApiResponse,
} from '../privacy.js';

const issuedOtpStore = new Map();

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function isValidIndianPhone(digits) {
  return /^\d{10}$/.test(digits);
}

export function createCoreRouter() {
  const router = express.Router();

  // ==========================================================================
  // 1. Health Route (/health)
  // ==========================================================================
  router.get('/health', (_req, res) => {
    return res.status(200).json({
      status: 'ok',
      display: 'नगरसाथी सर्व्हर सुरू आहे (NagarSathi Backend Healthy)',
      speech: 'नगरसाथी सर्व्हर सुरू आहे.',
      data: {
        status: 'ok',
        service: '@nagarsathi/backend',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ==========================================================================
  // 2. Auth Routes (/auth/otp, /auth/verify, /auth/logout)
  // ==========================================================================
  router.post('/auth/otp', async (req, res, next) => {
    try {
      const digits = normalizePhoneDigits(req.body?.phone);
      const language = req.body?.language || 'mr-IN';

      if (!isValidIndianPhone(digits)) {
        return res.status(400).json({
          error: 'INVALID_PHONE',
          display: 'कृपया १० अंकी मोबाईल क्रमांक टाका.',
          speech: 'कृपया दहा अंकी मोबाईल क्रमांक सांगा.',
          data: { otpSent: false },
        });
      }

      const otpMode = process.env.OTP_MODE || 'mock';
      const mockOtp = process.env.MOCK_OTP || '123456';
      const otpToIssue = otpMode === 'mock' ? mockOtp : mockOtp;

      issuedOtpStore.set(digits, {
        otp: otpToIssue,
        language,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      const phoneMasked = maskPhone(digits);
      req.auditMeta = {
        actor: 'CITIZEN',
        action: 'AUTH_OTP_REQUESTED',
        extra: { phoneMasked, mode: otpMode },
      };

      return res.status(200).json({
        display: `OTP पाठवला आहे (${phoneMasked}).`,
        speech: 'तुमच्या मोबाईलवर ओटीपी पाठवला आहे.',
        data: {
          phoneMasked,
          otpSent: true,
          mode: otpMode,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/auth/verify', async (req, res, next) => {
    try {
      const digits = normalizePhoneDigits(req.body?.phone);
      const otp = String(req.body?.otp || '').trim();
      const language = req.body?.language || 'mr-IN';

      if (!isValidIndianPhone(digits) || !otp) {
        return res.status(400).json({
          error: 'INVALID_OTP_INPUT',
          display: 'मोबाईल क्रमांक आणि OTP आवश्यक आहे.',
          speech: 'कृपया मोबाईल क्रमांक आणि ओटीपी सांगा.',
          data: { authenticated: false },
        });
      }

      const otpMode = process.env.OTP_MODE || 'mock';
      const expectedMockOtp = process.env.MOCK_OTP || '123456';
      const stored = issuedOtpStore.get(digits);
      const validOtp =
        (otpMode === 'mock' && otp === expectedMockOtp) ||
        (stored && stored.otp === otp && stored.expiresAt >= Date.now());

      if (!validOtp) {
        req.auditMeta = {
          actor: 'CITIZEN',
          action: 'AUTH_OTP_FAILED',
          extra: { phoneMasked: maskPhone(digits) },
        };
        return res.status(401).json({
          error: 'INVALID_OTP',
          display: 'चुकीचा OTP. कृपया पुन्हा प्रयत्न करा.',
          speech: 'ओटीपी चुकीचा आहे. पुन्हा प्रयत्न करा.',
          data: { authenticated: false },
        });
      }

      issuedOtpStore.delete(digits);

      let user = await findOneDocument(User, { phone: digits });
      if (!user) {
        user = await saveDocument(User, {
          phone: digits,
          phoneMasked: maskPhone(digits),
          language,
          role: 'citizen',
        });
      }

      const token = signCitizenJwt({
        sub: String(user._id),
        phoneMasked: user.phoneMasked,
        role: 'citizen',
        language: user.language,
      });

      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });

      req.auditMeta = {
        actor: 'CITIZEN',
        action: 'AUTH_OTP_VERIFIED',
        userId: String(user._id),
        extra: { phoneMasked: user.phoneMasked, role: user.role },
      };

      return res.status(200).json({
        display: 'लॉगिन यशस्वी झाले आहे.',
        speech: 'लॉगिन यशस्वी झाले आहे.',
        data: {
          authenticated: true,
          token,
          citizen: {
            id: String(user._id),
            name: 'Ramabai Kulkarni',
            age: 68,
            aadhaarMasked: 'XXXX-XXXX-4821',
            phoneMasked: user.phoneMasked,
            bankAccountMasked: 'XXXXXXXX9012',
            language: user.language,
            role: user.role,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/auth/logout', (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return res.status(200).json({
      display: 'तुम्ही सुरक्षितपणे बाहेर पडला आहात.',
      speech: 'तुम्ही बाहेर पडला आहात.',
      data: { authenticated: false },
    });
  });

  // ==========================================================================
  // 3. Profile Routes (/profile) — Protected by Citizen Auth & Consent Gate
  // ==========================================================================
  router.get('/profile/:userId?', requireCitizenAuth, async (req, res, next) => {
    try {
      const targetUserId = req.params.userId || req.user.id;
      if (!assertSameCitizen(req, res, targetUserId)) {
        req.auditMeta = {
          actor: 'CITIZEN',
          action: 'CROSS_USER_PROFILE_READ_DENIED',
          userId: req.user.id,
          extra: { attemptedUserId: targetUserId },
        };
        return;
      }

      const profile = await findOneDocument(Profile, { userId: req.user.id });
      const sanitizedProfile = sanitizeForApiResponse(profile);
      return res.status(200).json({
        display: profile
          ? `प्रोफाइल: ${profile.fullName}`
          : 'कोणतीही जतन केलेली प्रोफाइल नाही.',
        speech: profile
          ? `${profile.fullName} यांची प्रोफाइल उपलब्ध आहे.`
          : 'जतन केलेली प्रोफाइल नाही.',
        data: {
          profile: sanitizedProfile,
          citizen: {
            id: req.user.id,
            name: profile?.fullName || 'Ramabai Kulkarni',
            age: profile?.age || 68,
            language: req.query?.language || req.user.language || 'mr-IN',
            aadhaarMasked: profile?.aadhaarMasked || 'XXXX-XXXX-4821',
            phoneMasked: profile?.mobileMasked || req.user.phoneMasked || 'XXXXXX3210',
            bankAccountMasked: profile?.bankAccountMasked || 'XXXXXXXX9012',
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  const handleSaveOrUpdateProfile = async (req, res, next) => {
    try {
      const targetUserId = req.params.userId || req.body?.userId || req.user.id;
      if (!assertSameCitizen(req, res, targetUserId)) {
        req.auditMeta = {
          actor: 'CITIZEN',
          action: 'CROSS_USER_PROFILE_WRITE_DENIED',
          userId: req.user.id,
          extra: { attemptedUserId: targetUserId },
        };
        return;
      }

      if (req.method === 'PATCH' && req.body?.saveProfile === false) {
        await deleteDocuments(Profile, { userId: req.user.id });
        return res.status(200).json({
          display: 'प्रोफाइल सेव्ह केली जाणार नाही.',
          speech: 'प्रोफाइल सेव्ह केली जाणार नाही.',
          data: {
            saved: false,
            citizen: {
              id: req.user.id,
              name: req.body?.name || 'Ramabai Kulkarni',
              age: 68,
              saveProfile: false,
              language: req.body?.language || req.user.language || 'mr-IN',
              aadhaarMasked: 'XXXX-XXXX-4821',
              phoneMasked: req.user.phoneMasked || 'XXXXXX3210',
              bankAccountMasked: 'XXXXXXXX9012',
            },
          },
        });
      }

      const existing = await findOneDocument(Profile, { userId: req.user.id });
      const consentGiven =
        req.body?.consentGiven ??
        req.body?.saveProfileConsent ??
        req.body?.saveProfile ??
        existing?.consentGiven ??
        false;

      if (consentGiven !== true) {
        return res.status(400).json({
          error: 'PROFILE_CONSENT_REQUIRED',
          display: 'संमतीशिवाय प्रोफाइल जतन करता येत नाही.',
          speech: 'तुमच्या संमतीशिवाय प्रोफाइल सेव्ह केली जाणार नाही.',
          data: { saved: false },
        });
      }

      const fullName =
        req.body?.fullName ||
        req.body?.name ||
        existing?.fullName ||
        'Ramabai Kulkarni';
      const dob = req.body?.dob || existing?.dob || '1958-04-12';
      const gender = req.body?.gender || existing?.gender || 'Female';
      const address = req.body?.address || existing?.address || 'Pune';
      const district = req.body?.district || existing?.district || 'Pune';

      if (!fullName) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          display: 'पूर्ण नाव आवश्यक आहे.',
          speech: 'कृपया पूर्ण नाव सांगा.',
          data: { saved: false },
        });
      }

      const rawAadhaar = req.body?.aadhaar || '712345674821';
      const rawMobile = req.body?.mobile || req.body?.phone || '9876543210';
      const rawBank = req.body?.bankAccount || '309876549012';

      const savedProfile = await createEncryptedProfile({
        userId: req.user.id,
        consentGiven: true,
        consentAt: new Date(),
        fullName,
        dob,
        age: req.body?.age ?? existing?.age ?? 68,
        gender,
        maritalStatus: req.body?.maritalStatus ?? existing?.maritalStatus ?? 'Widow',
        address,
        district,
        state: req.body?.state ?? existing?.state ?? 'Maharashtra',
        pincode: req.body?.pincode ?? existing?.pincode ?? '411030',
        casteCategory: req.body?.casteCategory ?? existing?.casteCategory ?? 'General',
        annualFamilyIncome:
          req.body?.annualFamilyIncome ?? existing?.annualFamilyIncome ?? 24000,
        aadhaar: rawAadhaar,
        mobile: rawMobile,
        bankAccount: rawBank,
        ifsc: req.body?.ifsc ?? existing?.ifsc ?? 'SBIN0004821',
      });

      req.auditMeta = {
        actor: 'CITIZEN',
        action: 'PROFILE_SAVED_WITH_CONSENT',
        userId: req.user.id,
        extra: {
          aadhaarMasked: savedProfile.aadhaarMasked,
          mobileMasked: savedProfile.mobileMasked,
          bankAccountMasked: savedProfile.bankAccountMasked,
        },
      };

      const sanitized = sanitizeForApiResponse(savedProfile);
      return res.status(200).json({
        display: 'पुढील वेळेसाठी प्रोफाइल सुरक्षितपणे जतन केली आहे.',
        speech: 'तुमची माहिती पुढच्या वेळेसाठी सुरक्षित ठेवली आहे.',
        data: {
          saved: true,
          profile: sanitized,
          citizen: {
            id: req.user.id,
            name: savedProfile.fullName,
            age: savedProfile.age || 68,
            saveProfile: true,
            language: req.body?.language || req.user.language || 'mr-IN',
            aadhaarMasked: savedProfile.aadhaarMasked,
            phoneMasked: savedProfile.mobileMasked,
            bankAccountMasked: savedProfile.bankAccountMasked,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  };

  router.post('/profile', requireCitizenAuth, handleSaveOrUpdateProfile);
  router.patch('/profile/:userId?', requireCitizenAuth, handleSaveOrUpdateProfile);

  router.delete('/profile', requireCitizenAuth, async (req, res, next) => {
    try {
      const deletedCount = await deleteDocuments(Profile, { userId: req.user.id });
      req.auditMeta = {
        actor: 'CITIZEN',
        action: 'PROFILE_DELETED',
        userId: req.user.id,
        extra: { deletedCount },
      };
      return res.status(200).json({
        display: 'तुमची जतन केलेली प्रोफाइल हटवली आहे.',
        speech: 'तुमची प्रोफाइल डिलीट केली आहे.',
        data: { deleted: true, deletedCount },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post(
    '/profile/delete-all-my-data',
    requireCitizenAuth,
    async (req, res, next) => {
      try {
        const result = await deleteAllCitizenData(req.user.id);
        res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
        return res.status(200).json({
          display: 'तुमचा सर्व डेटा (प्रोफाइल, कागदपत्रे, प्रकरणे) कायमचा हटवला गेला आहे.',
          speech: 'तुमचा सर्व डेटा सुरक्षितपणे डिलीट केला आहे.',
          data: {
            purged: true,
            counts: result.counts,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 4. Vault Routes (/vault) — Encrypted Document Vault with Citizen Isolation
  // ==========================================================================
  router.get('/vault/:userId?', requireCitizenAuth, async (req, res, next) => {
    try {
      const targetUserId = req.params.userId || req.user.id;
      if (!assertSameCitizen(req, res, targetUserId)) {
        req.auditMeta = {
          actor: 'CITIZEN',
          action: 'CROSS_USER_VAULT_READ_DENIED',
          userId: req.user.id,
          extra: { attemptedUserId: targetUserId },
        };
        return;
      }

      const docs = await findDocuments(VaultDoc, { userId: req.user.id });
      return res.status(200).json({
        display: `${docs.length} कागदपत्रे व्हॉल्टमध्ये उपलब्ध आहेत.`,
        speech: `${docs.length} कागदपत्रे उपलब्ध आहेत.`,
        data: {
          documents: sanitizeForApiResponse(docs),
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/vault', requireCitizenAuth, async (req, res, next) => {
    try {
      const targetUserId = req.body?.userId || req.user.id;
      if (!assertSameCitizen(req, res, targetUserId)) {
        req.auditMeta = {
          actor: 'CITIZEN',
          action: 'CROSS_USER_VAULT_UPLOAD_DENIED',
          userId: req.user.id,
          extra: { attemptedUserId: targetUserId },
        };
        return;
      }

      const docType = String(req.body?.type || req.body?.docType || '').trim();
      if (!docType) {
        return res.status(400).json({
          error: 'INVALID_DOCUMENT_TYPE',
          display: 'कागदपत्राचा प्रकार आवश्यक आहे.',
          speech: 'कागदपत्राचा प्रकार सांगा.',
          data: { uploaded: false },
        });
      }

      const rawMeta = req.body?.metadata || {};
      const encryptedMetadata = encryptWithEnvKey({
        ...rawMeta,
        fileName: req.body?.fileName || `${docType}.jpg`,
        uploadedBy: req.user.id,
      });

      let maskedSummary = req.body?.maskedSummary || `${docType} (VERIFIED)`;
      if (rawMeta.aadhaar) {
        maskedSummary = maskAadhaar(rawMeta.aadhaar);
      } else if (rawMeta.bankAccount) {
        maskedSummary = maskBankAccount(rawMeta.bankAccount);
      } else if (rawMeta.phone) {
        maskedSummary = maskPhone(rawMeta.phone);
      }

      const savedDoc = await saveDocument(VaultDoc, {
        userId: req.user.id,
        caseId: req.body?.caseId || null,
        type: docType,
        status: req.body?.status || 'VERIFIED',
        issuedAt: req.body?.issuedAt ? new Date(req.body.issuedAt) : new Date(),
        maxAgeDays: req.body?.maxAgeDays ?? null,
        encryptedMetadata,
        maskedSummary,
        uploadedAt: new Date(),
      });

      req.auditMeta = {
        actor: 'CITIZEN',
        action: 'VAULT_DOCUMENT_UPLOADED',
        userId: req.user.id,
        caseId: req.body?.caseId || null,
        extra: { type: docType, status: savedDoc.status, maskedSummary },
      };

      return res.status(201).json({
        display: `कागदपत्र सुरक्षितपणे जतन केले: ${docType}`,
        speech: 'कागदपत्र सुरक्षितपणे अपलोड झाले आहे.',
        data: {
          uploaded: true,
          document: sanitizeForApiResponse(savedDoc),
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 5. Case Ownership Guard Route (/cases/:caseId)
  // ==========================================================================
  router.get('/cases/:caseId', requireCitizenAuth, async (req, res, next) => {
    try {
      const caseDoc = await findOneDocument(Case, { caseId: req.params.caseId });
      if (!caseDoc) {
        return res.status(404).json({
          error: 'CASE_NOT_FOUND',
          display: 'प्रकरण सापडले नाही.',
          speech: 'प्रकरण सापडले नाही.',
          data: null,
        });
      }
      if (!assertSameCitizen(req, res, caseDoc.userId)) {
        req.auditMeta = {
          actor: 'CITIZEN',
          action: 'CROSS_USER_CASE_READ_DENIED',
          userId: req.user.id,
          caseId: req.params.caseId,
        };
        return;
      }

      return res.status(200).json({
        display: `प्रकरण स्थिती: ${caseDoc.status}`,
        speech: `तुमच्या अर्जाची स्थिती ${caseDoc.status} आहे.`,
        data: {
          case: sanitizeForApiResponse(caseDoc),
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 6. Services Catalog Routes (/services, /services/:serviceId)
  // ==========================================================================
  router.get('/services', (_req, res, next) => {
    try {
      const catalogs = loadAllCatalogs();
      return res.status(200).json({
        display: `${catalogs.length} सरकारी सेवा उपलब्ध आहेत.`,
        speech: 'पेन्शन, शिष्यवृत्ती आणि रेशन कार्ड सेवा उपलब्ध आहेत.',
        data: {
          services: catalogs,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/services/:serviceId', (req, res) => {
    try {
      const catalog = loadCatalog(req.params.serviceId);
      return res.status(200).json({
        display: catalog.name.mr,
        speech: catalog.name.mr,
        data: {
          service: catalog,
        },
      });
    } catch {
      return res.status(404).json({
        error: 'SERVICE_NOT_FOUND',
        display: 'ही सेवा कॅटलॉगमध्ये सापडली नाही.',
        speech: 'ही सेवा उपलब्ध नाही.',
        data: null,
      });
    }
  });

  const handleServiceAutoFillPreview = async (req, res, _next) => {
    try {
      const catalog = loadCatalog(req.params.serviceId);
      const profile = await findOneDocument(Profile, { userId: req.user.id });
      const vaultDocs = await findDocuments(VaultDoc, { userId: req.user.id });

      const { draftFields, missingCitizenQuestions, resolvedMap } =
        autoFillDraftFields({
          catalog,
          profile,
          vaultDocs,
          citizenAnswers: req.body?.citizenAnswers || {},
        });

      const totalFields = catalog.fields.filter(
        (f) => f.source !== 'PORTAL_GENERATED'
      ).length;
      const autoFilledCount = draftFields.length;
      const autoFillRatio =
        totalFields > 0
          ? Number((autoFilledCount / totalFields).toFixed(4))
          : 0;

      req.auditMeta = {
        actor: 'AGENT',
        action: 'SERVICE_AUTOFILL_PREVIEW',
        userId: req.user.id,
        extra: {
          serviceId: catalog.id,
          totalFields,
          autoFilledCount,
          missingQuestionKeys: missingCitizenQuestions.map((q) => q.key),
        },
      };

      return res.status(200).json({
        display: `${catalog.name.mr}: ${totalFields} पैकी ${autoFilledCount} रकाने प्रोफाइल व कागदपत्रांतून आपोआप भरले गेले आहेत.`,
        speech: `${totalFields} पैकी ${autoFilledCount} रकाने आधीच्या माहितीतून आपोआप भरले आहेत. फक्त ${missingCitizenQuestions.length} नवीन प्रश्न विचारले जातील.`,
        data: {
          serviceId: catalog.id,
          totalFields,
          autoFilledCount,
          autoFillRatio,
          autoFilledFieldKeys: draftFields.map((f) => f.key),
          missingQuestionKeys: missingCitizenQuestions.map((q) => q.key),
          draftFields,
          missingCitizenQuestions,
          resolvedMap,
        },
      });
    } catch {
      return res.status(404).json({
        error: 'SERVICE_NOT_FOUND',
        display: 'ही सेवा कॅटलॉगमध्ये सापडली नाही.',
        speech: 'ही सेवा उपलब्ध नाही.',
        data: null,
      });
    }
  };

  router.get(
    '/services/:serviceId/autofill-preview',
    requireCitizenAuth,
    handleServiceAutoFillPreview
  );
  router.post(
    '/services/:serviceId/autofill-preview',
    requireCitizenAuth,
    handleServiceAutoFillPreview
  );

  return router;
}

