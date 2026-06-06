/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum LanguageCode {
  EN = "en",
  ES = "es",
  HI = "hi",
  PT = "pt",
  ZH = "zh",
  FR = "fr",
}

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
  localName: string;
}

export interface OTPRequest {
  email: string;
}

export interface OTPVerify {
  email: string;
  code: string;
}

export interface EmailData {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  code: string;
  isRead: boolean;
}

export interface DynamicTranslationRequest {
  text: string;
  targetLanguage: LanguageCode;
}

export interface DynamicTranslationResponse {
  translatedText: string;
  detectedLanguage?: string;
  success: boolean;
  error?: string;
}

// Structured UI content definitions
export interface PageContent {
  metaTitle: string;
  heroBadge: string;
  heroTitle: string;
  heroSub: string;
  featuresTitle: string;
  featuresDesc: string;
  serviceTitle: string;
  serviceDesc: string;
  profileTitle: string;
  profileDesc: string;
  
  // Home Section
  analyticsCardTitle: string;
  analyticsCardDesc: string;
  marketCardTitle: string;
  marketCardDesc: string;
  supportCardTitle: string;
  supportCardDesc: string;
  
  // Services Section
  service1Name: string;
  service1Desc: string;
  service2Name: string;
  service2Desc: string;
  service3Name: string;
  service3Desc: string;
  
  // Profile / Security Section
  accountEmailLabel: string;
  registeredEmail: string;
  securityVerificationStatus: string;
  verifiedLabel: string;
  verificationRequiredLabel: string;
  languageLockDisclaimer: string;
  
  // Navigation & General
  navHome: string;
  navServices: string;
  navSecurity: string;
  changeLanguageBtn: string;
  generateOtpBtn: string;
  sendingLabel: string;
  sentLabel: string;
  verifyAndApplyBtn: string;
  enterOtpPlaceholder: string;
  invalidOtpError: string;
  otpVerifiedSuccess: string;
  frenchLockedBadge: string;
  generalSuccess: string;

  // New Localized Elements
  tabDashboard: string;
  tabAssets: string;
  tabPreferences: string;
  tabSecurity: string;
  
  langSettingsTitle: string;
  langSettingsDesc: string;
  
  securityVerificationTitle: string;
  securityVerificationdesc: string;
  registeredEmailLabel: string;
  generateOtpCodeBtn: string;
  generatingCodeLabel: string;
  codeSentAlert: string;
  verifyAndApplyLanguageBtn: string;
  invalidOtpFormatError: string;
  authProxyOfflineError: string;
  waitResendLabel: string;
  readyResendLabel: string;
  
  enterpriseDashboardTitle: string;
  enterpriseDashboardDesc: string;
  dynamicNeuralTitle: string;
  activeLocaleLabel: string;
  translatorHintDesc: string;
  sourceTextLabel: string;
  textareaPlaceholderText: string;
  translatedTargetLabel: string;
  streamingConversionLabel: string;
  noConvertedOutputLabel: string;
  triggerDynamicTranslationBtn: string;
  exploreSpecsLabel: string;
  enforcementGatewayPortalLabel: string;
  activePortLabel: string;
  resetSecurityLockBtn: string;
  
  sandboxEmailLogsTitle: string;
  loggedToLabel: string;
  inboxEmptyTitle: string;
  inboxEmptyDesc: string;
  byLabel: string;
  filledLabel: string;
  autofillLabel: string;
  previewEmailPrompt: string;
}

export interface TranslationDictionary {
  [LanguageCode.EN]: PageContent;
  [LanguageCode.ES]: PageContent;
  [LanguageCode.HI]: PageContent;
  [LanguageCode.PT]: PageContent;
  [LanguageCode.ZH]: PageContent;
  [LanguageCode.FR]: PageContent;
}
