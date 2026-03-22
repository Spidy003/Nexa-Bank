export type Intent =
  | "ACCOUNT_OPENING"
  | "BALANCE_CHECK"
  | "LOAN_INQUIRY"
  | "CARD_SERVICE"
  | "FIXED_DEPOSIT"
  | "FUND_TRANSFER"
  | "CHEQUE_SERVICE"
  | "ACCOUNT_CLOSURE"
  | "GRIEVANCE"
  | "GENERAL_QUERY"
  | "UNKNOWN";

export type ConversationState =
  | "IDLE"
  // Account Opening - Full flow from bank form
  | "ACC_TYPE"
  | "ACC_SALUTATION"
  | "ACC_FIRST_NAME"
  | "ACC_MIDDLE_NAME"
  | "ACC_LAST_NAME"
  | "ACC_DOB"
  | "ACC_GENDER"
  | "ACC_MARITAL_STATUS"
  | "ACC_FATHER_SPOUSE_NAME"
  | "ACC_NATIONALITY"
  | "ACC_OCCUPATION"
  | "ACC_ANNUAL_INCOME"
  | "ACC_SOURCE_OF_FUNDS"
  | "ACC_PAN"
  | "ACC_AADHAAR"
  | "ACC_MOBILE"
  | "ACC_EMAIL"
  | "ACC_ADDRESS_LINE1"
  | "ACC_ADDRESS_CITY"
  | "ACC_ADDRESS_STATE"
  | "ACC_ADDRESS_PIN"
  | "ACC_CORR_SAME"
  | "ACC_CORR_ADDRESS"
  | "ACC_CORR_CITY"
  | "ACC_CORR_STATE"
  | "ACC_CORR_PIN"
  | "ACC_NOMINEE_NAME"
  | "ACC_NOMINEE_RELATION"
  | "ACC_NOMINEE_DOB"
  | "ACC_ID_TYPE"
  | "ACC_ID_NUMBER"
  | "ACC_SERVICES_ATM"
  | "ACC_SERVICES_CHEQUE"
  | "ACC_SERVICES_MOBILE_BANKING"
  | "ACC_SERVICES_SMS"
  | "ACC_INITIAL_DEPOSIT"
  | "ACC_OTP"
  | "ACC_CONFIRM"
  // Balance
  | "BAL_ACCOUNT"
  // Loan
  | "LOAN_TYPE"
  | "LOAN_AMOUNT"
  | "LOAN_TENURE"
  | "LOAN_INCOME"
  | "LOAN_EMPLOYMENT"
  | "LOAN_PAN"
  | "LOAN_CONFIRM"
  // Card
  | "CARD_ACTION"
  | "CARD_TYPE"
  | "CARD_NUMBER"
  // FD
  | "FD_AMOUNT"
  | "FD_TENURE"
  | "FD_INTEREST_PAYOUT"
  | "FD_NOMINEE"
  | "FD_CONFIRM"
  // Fund Transfer
  | "FT_TYPE"
  | "FT_BENEFICIARY_NAME"
  | "FT_BENEFICIARY_ACCOUNT"
  | "FT_IFSC"
  | "FT_AMOUNT"
  | "FT_OTP"
  // Cheque
  | "CHQ_ACTION"
  | "CHQ_ACCOUNT"
  | "CHQ_NUMBER"
  // Closure
  | "CLOSE_ACCOUNT"
  | "CLOSE_REASON"
  | "CLOSE_TRANSFER_ACC"
  | "CLOSE_CONFIRM"
  // Grievance
  | "GRIEV_TYPE"
  | "GRIEV_DESCRIPTION"
  | "GRIEV_ACCOUNT"
  | "GRIEV_CONFIRM";

export interface SessionData {
  // Account Opening
  accountType?: string;
  salutation?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  fatherSpouseName?: string;
  nationality?: string;
  occupation?: string;
  annualIncome?: string;
  sourceOfFunds?: string;
  pan?: string;
  aadhaar?: string;
  mobile?: string;
  email?: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressPin?: string;
  corrSameAddress?: string;
  corrAddress?: string;
  corrCity?: string;
  corrState?: string;
  corrPin?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeDob?: string;
  idType?: string;
  idNumber?: string;
  wantsATM?: string;
  wantsChequeBook?: string;
  wantsMobileBanking?: string;
  wantsSMS?: string;
  initialDeposit?: string;
  otp?: string;
  generatedOtp?: string;
  accountNumber?: string;
  // Loan
  loanType?: string;
  loanAmount?: string;
  loanTenure?: string;
  loanIncome?: string;
  loanEmployment?: string;
  loanPan?: string;
  // Card
  cardAction?: string;
  cardType?: string;
  cardNumber?: string;
  // FD
  fdAmount?: string;
  fdTenure?: string;
  fdInterestPayout?: string;
  fdNominee?: string;
  // Fund Transfer
  ftType?: string;
  ftBeneficiaryName?: string;
  ftBeneficiaryAccount?: string;
  ftIfsc?: string;
  ftAmount?: string;
  // Cheque
  chequeAction?: string;
  chequeAccount?: string;
  chequeNumber?: string;
  // Closure
  closeAccount?: string;
  closeReason?: string;
  closeTransferAcc?: string;
  // Grievance
  grievanceType?: string;
  grievanceDesc?: string;
  grievanceAccount?: string;
  grievanceRef?: string;
}

export interface EngineResponse {
  speak: string;
  field?: string;
  value?: string;
  error?: boolean;
  final?: boolean;
  validationResult?: "valid" | "invalid";
  formData?: SessionData;
  intent?: Intent;
  section?: string;
  progress?: number;
  documents?: DocumentStatus[];
}

export interface DocumentStatus {
  name: string;
  status: "pending" | "collected" | "verified";
}

interface Session {
  state: ConversationState;
  data: SessionData;
  intent?: Intent;
}

const sessions: Record<string, Session> = {};

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/open|new account|create account|account open|savings|current account/i.test(t)) return "ACCOUNT_OPENING";
  if (/balance|how much|check.*balance|account.*balance/i.test(t)) return "BALANCE_CHECK";
  if (/loan|borrow|credit|emi|interest rate|personal loan|home loan|car loan|education loan/i.test(t)) return "LOAN_INQUIRY";
  if (/card|debit|credit card|block.*card|new card|replace/i.test(t)) return "CARD_SERVICE";
  if (/fixed deposit|fd|term deposit|deposit.*fixed/i.test(t)) return "FIXED_DEPOSIT";
  if (/transfer|send money|neft|imps|rtgs|upi|pay/i.test(t)) return "FUND_TRANSFER";
  if (/cheque|check book|stop payment|cheque book/i.test(t)) return "CHEQUE_SERVICE";
  if (/close.*account|account.*close|closure/i.test(t)) return "ACCOUNT_CLOSURE";
  if (/complaint|grievance|problem|issue|dispute|not working/i.test(t)) return "GRIEVANCE";
  if (/help|hello|hi|hey|what can you|menu|option/i.test(t)) return "GENERAL_QUERY";
  return "UNKNOWN";
}

function validateAadhaar(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  return digits.length === 12 ? digits : null;
}

function validatePAN(text: string): string | null {
  const pan = text.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) ? pan : null;
}

function validateMobile(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}

function validatePin(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

function validateEmail(text: string): string | null {
  const email = text.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function generateAccountNumber(): string {
  return "AURA" + Math.floor(100000000 + Math.random() * 900000000).toString();
}

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateRefNumber(): string {
  return "GRV" + Date.now().toString().slice(-8);
}

function titleCase(s: string): string {
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function yesNo(t: string): boolean | null {
  if (/yes|yeah|yep|sure|correct|right|ok|okay|affirmative|proceed|go ahead|confirm/i.test(t)) return true;
  if (/no|nah|nope|don't|dont|negative|skip|not|none/i.test(t)) return false;
  return null;
}

function getAccountProgress(state: ConversationState): number {
  const steps: ConversationState[] = [
    "ACC_TYPE", "ACC_SALUTATION", "ACC_FIRST_NAME", "ACC_MIDDLE_NAME", "ACC_LAST_NAME",
    "ACC_DOB", "ACC_GENDER", "ACC_MARITAL_STATUS", "ACC_FATHER_SPOUSE_NAME",
    "ACC_NATIONALITY", "ACC_OCCUPATION", "ACC_ANNUAL_INCOME", "ACC_SOURCE_OF_FUNDS",
    "ACC_PAN", "ACC_AADHAAR", "ACC_MOBILE", "ACC_EMAIL",
    "ACC_ADDRESS_LINE1", "ACC_ADDRESS_CITY", "ACC_ADDRESS_STATE", "ACC_ADDRESS_PIN",
    "ACC_CORR_SAME",
    "ACC_NOMINEE_NAME", "ACC_NOMINEE_RELATION", "ACC_NOMINEE_DOB",
    "ACC_ID_TYPE", "ACC_ID_NUMBER",
    "ACC_SERVICES_ATM", "ACC_SERVICES_CHEQUE", "ACC_SERVICES_MOBILE_BANKING", "ACC_SERVICES_SMS",
    "ACC_INITIAL_DEPOSIT", "ACC_OTP", "ACC_CONFIRM"
  ];
  const idx = steps.indexOf(state);
  return idx >= 0 ? Math.round((idx / steps.length) * 100) : 0;
}

function getCurrentSection(state: ConversationState): string {
  if (state.startsWith("ACC_SERVICES")) return "Services Required";
  if (state.startsWith("ACC_NOMINEE")) return "Nominee Details";
  if (state.startsWith("ACC_CORR")) return "Correspondence Address";
  if (state.startsWith("ACC_ADDRESS")) return "Address Details";
  if (state.startsWith("ACC_ID")) return "KYC Documents";
  if (["ACC_PAN", "ACC_AADHAAR"].includes(state)) return "KYC Documents";
  if (["ACC_MOBILE", "ACC_EMAIL"].includes(state)) return "Contact Details";
  if (["ACC_TYPE", "ACC_SALUTATION", "ACC_FIRST_NAME", "ACC_MIDDLE_NAME", "ACC_LAST_NAME", "ACC_DOB", "ACC_GENDER", "ACC_MARITAL_STATUS", "ACC_FATHER_SPOUSE_NAME", "ACC_NATIONALITY", "ACC_OCCUPATION", "ACC_ANNUAL_INCOME", "ACC_SOURCE_OF_FUNDS"].includes(state)) return "Personal Details";
  if (state === "ACC_OTP" || state === "ACC_CONFIRM") return "Verification";
  if (state === "ACC_INITIAL_DEPOSIT") return "Deposit";
  return "Application";
}

function getDocumentStatus(data: SessionData): DocumentStatus[] {
  const docs: DocumentStatus[] = [];
  if (data.pan) docs.push({ name: "PAN Card", status: "verified" });
  else docs.push({ name: "PAN Card", status: "pending" });
  if (data.aadhaar) docs.push({ name: "Aadhaar Card", status: "verified" });
  else docs.push({ name: "Aadhaar Card", status: "pending" });
  if (data.idType && data.idNumber) docs.push({ name: data.idType, status: "collected" });
  if (data.addressLine1) docs.push({ name: "Address Proof", status: "collected" });
  return docs;
}

export function processInput(sessionId: string, text: string): EngineResponse {
  if (!sessions[sessionId]) {
    sessions[sessionId] = { state: "IDLE", data: {} };
  }

  const session = sessions[sessionId];
  const t = text.toLowerCase().trim();

  // Reset command
  if (/start over|reset|cancel|go back|main menu/i.test(t) && session.state !== "IDLE") {
    sessions[sessionId] = { state: "IDLE", data: {} };
    return {
      speak: "No problem. Let's start fresh. How can I assist you today?",
      formData: {},
    };
  }

  // IDLE — detect intent
  if (session.state === "IDLE") {
    const intent = detectIntent(t);
    session.intent = intent;

    switch (intent) {
      case "ACCOUNT_OPENING":
        session.state = "ACC_TYPE";
        return {
          speak: "Welcome! I'll guide you through the complete account opening process as per our bank's form. First, what type of account would you like? Savings Bank Account, Current Account, or Basic Savings Bank Deposit Account?",
          field: "accountType",
          intent,
          section: "Account Type",
          progress: 0,
        };

      case "BALANCE_CHECK":
        session.state = "BAL_ACCOUNT";
        return {
          speak: "Sure. Please provide your account number to check your balance.",
          field: "accountNumber",
          intent,
        };

      case "LOAN_INQUIRY":
        session.state = "LOAN_TYPE";
        return {
          speak: "I can help with loan applications. What type of loan are you interested in? Home Loan, Personal Loan, Car Loan, or Education Loan?",
          field: "loanType",
          intent,
          section: "Loan Type",
        };

      case "CARD_SERVICE":
        session.state = "CARD_ACTION";
        return {
          speak: "I can help with card services. Would you like to apply for a new card, block a card, or check card status?",
          field: "cardAction",
          intent,
        };

      case "FIXED_DEPOSIT":
        session.state = "FD_AMOUNT";
        return {
          speak: "Let's set up your Fixed Deposit. What amount would you like to deposit?",
          field: "fdAmount",
          intent,
          section: "Fixed Deposit",
        };

      case "FUND_TRANSFER":
        session.state = "FT_TYPE";
        return {
          speak: "I can help you transfer funds. What type of transfer? NEFT, IMPS, or RTGS?",
          field: "ftType",
          intent,
        };

      case "CHEQUE_SERVICE":
        session.state = "CHQ_ACTION";
        return {
          speak: "I can help with cheque services. Would you like to request a cheque book, or place a stop payment?",
          field: "chequeAction",
          intent,
        };

      case "ACCOUNT_CLOSURE":
        session.state = "CLOSE_ACCOUNT";
        return {
          speak: "I understand you'd like to close an account. Please provide your account number.",
          field: "closeAccount",
          intent,
        };

      case "GRIEVANCE":
        session.state = "GRIEV_TYPE";
        return {
          speak: "I'm sorry you're facing an issue. What type of complaint is this? Service related, Transaction dispute, or Card issue?",
          field: "grievanceType",
          intent,
        };

      case "GENERAL_QUERY":
        return {
          speak: "I can help you with: Account Opening, Balance Check, Loans, Card Services, Fixed Deposits, Fund Transfer, Cheque Services, Account Closure, or Grievance handling. What would you like to do?",
          intent,
        };

      default:
        return {
          speak: "I'm not sure I understood. I can help with account opening, balance check, loans, card services, fixed deposits, fund transfers, cheque services, account closure, or file a complaint. What would you like?",
          intent: "UNKNOWN",
        };
    }
  }

  // ============ ACCOUNT OPENING FLOW (Full Bank Form) ============
  if (session.state === "ACC_TYPE") {
    const type = /current/i.test(t) ? "Current Account" : /basic|bsbda/i.test(t) ? "BSBDA" : "Savings Bank Account";
    session.data.accountType = type;
    session.state = "ACC_SALUTATION";
    return {
      speak: `${type} selected. Now let's fill in your personal details. What is your salutation? Mr., Mrs., Ms., or Dr.?`,
      field: "salutation",
      value: type,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_SALUTATION") {
    const sal = /mrs/i.test(t) ? "Mrs." : /ms/i.test(t) ? "Ms." : /dr/i.test(t) ? "Dr." : "Mr.";
    session.data.salutation = sal;
    session.state = "ACC_FIRST_NAME";
    return {
      speak: `${sal} — noted. What is your first name?`,
      field: "firstName",
      value: sal,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_FIRST_NAME") {
    session.data.firstName = titleCase(text.replace(/my.*name.*is|i am|it's|its|first name is/gi, "").trim());
    session.state = "ACC_MIDDLE_NAME";
    return {
      speak: `${session.data.firstName}, got it. Do you have a middle name? Say it or say "skip" if none.`,
      field: "middleName",
      value: session.data.firstName,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_MIDDLE_NAME") {
    if (/skip|no|none|don't have|dont/i.test(t)) {
      session.data.middleName = "";
    } else {
      session.data.middleName = titleCase(text.trim());
    }
    session.state = "ACC_LAST_NAME";
    return {
      speak: "And your last name or surname?",
      field: "lastName",
      value: session.data.middleName || "—",
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_LAST_NAME") {
    session.data.lastName = titleCase(text.replace(/last name is|surname is/gi, "").trim());
    session.data.fullName = [session.data.salutation, session.data.firstName, session.data.middleName, session.data.lastName].filter(Boolean).join(" ");
    session.state = "ACC_DOB";
    return {
      speak: `Full name recorded as ${session.data.fullName}. What is your date of birth? Please say it like 15th January 1990.`,
      field: "dob",
      value: session.data.lastName,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_DOB") {
    session.data.dob = text.trim();
    session.state = "ACC_GENDER";
    return {
      speak: "Date of birth noted. What is your gender? Male, Female, or Third Gender?",
      field: "gender",
      value: session.data.dob,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_GENDER") {
    session.data.gender = /female/i.test(t) ? "Female" : /third/i.test(t) ? "Third Gender" : "Male";
    session.state = "ACC_MARITAL_STATUS";
    return {
      speak: `${session.data.gender} noted. What is your marital status? Married, Unmarried, or Others?`,
      field: "maritalStatus",
      value: session.data.gender,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_MARITAL_STATUS") {
    session.data.maritalStatus = /married/i.test(t) && !/un/i.test(t) ? "Married" : /other/i.test(t) ? "Others" : "Unmarried";
    session.state = "ACC_FATHER_SPOUSE_NAME";
    const relation = session.data.maritalStatus === "Married" ? "spouse" : "father or mother";
    return {
      speak: `${session.data.maritalStatus}. What is your ${relation}'s full name?`,
      field: "fatherSpouseName",
      value: session.data.maritalStatus,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_FATHER_SPOUSE_NAME") {
    session.data.fatherSpouseName = titleCase(text.trim());
    session.state = "ACC_NATIONALITY";
    return {
      speak: `${session.data.fatherSpouseName}, noted. What is your nationality? Indian or others?`,
      field: "nationality",
      value: session.data.fatherSpouseName,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_NATIONALITY") {
    session.data.nationality = /indian|india/i.test(t) ? "Indian" : titleCase(text.trim());
    session.state = "ACC_OCCUPATION";
    return {
      speak: `${session.data.nationality}. What is your occupation? For example: Service, Business, Student, Retired, Housewife, Agriculture, Professional, or Others.`,
      field: "occupation",
      value: session.data.nationality,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_OCCUPATION") {
    if (/service|employed|job|private|government|govt/i.test(t)) session.data.occupation = "Service";
    else if (/business|self.*employed|entrepreneur/i.test(t)) session.data.occupation = "Business";
    else if (/student/i.test(t)) session.data.occupation = "Student";
    else if (/retire/i.test(t)) session.data.occupation = "Retired";
    else if (/house/i.test(t)) session.data.occupation = "Housewife";
    else if (/agri|farm/i.test(t)) session.data.occupation = "Agriculture";
    else if (/doctor|lawyer|ca|engineer|architect/i.test(t)) session.data.occupation = "Professional";
    else session.data.occupation = titleCase(text.trim());
    session.state = "ACC_ANNUAL_INCOME";
    return {
      speak: `Occupation: ${session.data.occupation}. What is your approximate annual income in rupees?`,
      field: "annualIncome",
      value: session.data.occupation,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_ANNUAL_INCOME") {
    const amt = text.replace(/[^\d.]/g, "") || text.trim();
    session.data.annualIncome = amt ? `₹${Number(amt).toLocaleString("en-IN")}` : text.trim();
    session.state = "ACC_SOURCE_OF_FUNDS";
    return {
      speak: `Annual income noted as ${session.data.annualIncome}. What is your primary source of funds? Salary, Business Income, Agriculture, Investment, Pension, or Others?`,
      field: "sourceOfFunds",
      value: session.data.annualIncome,
      formData: session.data,
      section: "Personal Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_SOURCE_OF_FUNDS") {
    if (/salary/i.test(t)) session.data.sourceOfFunds = "Salary";
    else if (/business/i.test(t)) session.data.sourceOfFunds = "Business Income";
    else if (/agri|farm/i.test(t)) session.data.sourceOfFunds = "Agriculture";
    else if (/invest/i.test(t)) session.data.sourceOfFunds = "Investment";
    else if (/pension/i.test(t)) session.data.sourceOfFunds = "Pension";
    else session.data.sourceOfFunds = titleCase(text.trim());
    session.state = "ACC_PAN";
    return {
      speak: `Source of funds: ${session.data.sourceOfFunds}. Now let's verify your KYC documents. Please provide your PAN number. It's mandatory as per RBI guidelines.`,
      field: "pan",
      value: session.data.sourceOfFunds,
      formData: session.data,
      section: "KYC Documents",
      progress: getAccountProgress(session.state),
      documents: getDocumentStatus(session.data),
    };
  }

  if (session.state === "ACC_PAN") {
    const pan = validatePAN(t);
    if (pan) {
      session.data.pan = pan;
      session.state = "ACC_AADHAAR";
      return {
        speak: "PAN verified successfully. Now please provide your 12-digit Aadhaar number for e-KYC verification.",
        field: "aadhaar",
        value: pan,
        validationResult: "valid",
        formData: session.data,
        section: "KYC Documents",
        progress: getAccountProgress(session.state),
        documents: getDocumentStatus(session.data),
      };
    }
    return {
      speak: "That PAN format doesn't look right. It should be 5 letters, 4 digits, and 1 letter, like ABCDE1234F. Please try again.",
      field: "pan",
      error: true,
      validationResult: "invalid",
      documents: getDocumentStatus(session.data),
    };
  }

  if (session.state === "ACC_AADHAAR") {
    const aadhaar = validateAadhaar(t);
    if (aadhaar) {
      session.data.aadhaar = aadhaar;
      session.state = "ACC_MOBILE";
      return {
        speak: "Aadhaar verified via e-KYC successfully. Now let's capture your contact details. What is your 10-digit mobile number?",
        field: "mobile",
        value: aadhaar.replace(/(\d{4})/g, "$1 ").trim(),
        validationResult: "valid",
        formData: session.data,
        section: "Contact Details",
        progress: getAccountProgress(session.state),
        documents: getDocumentStatus(session.data),
      };
    }
    return {
      speak: "That doesn't seem to be a valid 12-digit Aadhaar number. Please try again.",
      field: "aadhaar",
      error: true,
      validationResult: "invalid",
    };
  }

  if (session.state === "ACC_MOBILE") {
    const mobile = validateMobile(t);
    if (mobile) {
      session.data.mobile = mobile;
      session.state = "ACC_EMAIL";
      return {
        speak: `Mobile number ${mobile} recorded. What is your email address?`,
        field: "email",
        value: mobile,
        validationResult: "valid",
        formData: session.data,
        section: "Contact Details",
        progress: getAccountProgress(session.state),
      };
    }
    return {
      speak: "That doesn't seem to be a valid 10-digit mobile number. Please try again.",
      field: "mobile",
      error: true,
      validationResult: "invalid",
    };
  }

  if (session.state === "ACC_EMAIL") {
    const cleaned = text.replace(/\s+/g, "").replace(/\bat\b/gi, "@").replace(/\bdot\b/gi, ".").trim();
    const email = validateEmail(cleaned);
    if (email) {
      session.data.email = email;
      session.state = "ACC_ADDRESS_LINE1";
      return {
        speak: `Email ${email} recorded. Now your address details. What is your current residential address? Please provide the full address line.`,
        field: "addressLine1",
        value: email,
        validationResult: "valid",
        formData: session.data,
        section: "Address Details",
        progress: getAccountProgress(session.state),
      };
    }
    if (/skip|no|none/i.test(t)) {
      session.data.email = "";
      session.state = "ACC_ADDRESS_LINE1";
      return {
        speak: "Email skipped. Now your address details. What is your current residential address?",
        field: "addressLine1",
        formData: session.data,
        section: "Address Details",
        progress: getAccountProgress(session.state),
      };
    }
    return {
      speak: "I couldn't recognize that as a valid email. Please say it clearly, like name at gmail dot com. Or say skip.",
      field: "email",
      error: true,
      validationResult: "invalid",
    };
  }

  if (session.state === "ACC_ADDRESS_LINE1") {
    session.data.addressLine1 = text.trim();
    session.state = "ACC_ADDRESS_CITY";
    return {
      speak: "Address noted. What is your city or village name?",
      field: "addressCity",
      value: session.data.addressLine1,
      formData: session.data,
      section: "Address Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_ADDRESS_CITY") {
    session.data.addressCity = titleCase(text.trim());
    session.state = "ACC_ADDRESS_STATE";
    return {
      speak: `${session.data.addressCity}. And which state?`,
      field: "addressState",
      value: session.data.addressCity,
      formData: session.data,
      section: "Address Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_ADDRESS_STATE") {
    session.data.addressState = titleCase(text.trim());
    session.state = "ACC_ADDRESS_PIN";
    return {
      speak: "What is your 6-digit PIN code?",
      field: "addressPin",
      value: session.data.addressState,
      formData: session.data,
      section: "Address Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_ADDRESS_PIN") {
    const pin = validatePin(t);
    if (pin) {
      session.data.addressPin = pin;
      session.state = "ACC_CORR_SAME";
      return {
        speak: "PIN code verified. Is your correspondence address the same as your current address? Say yes or no.",
        field: "corrSameAddress",
        value: pin,
        validationResult: "valid",
        formData: session.data,
        section: "Correspondence Address",
        progress: getAccountProgress(session.state),
      };
    }
    return {
      speak: "PIN code must be 6 digits. Please try again.",
      field: "addressPin",
      validationResult: "invalid",
      error: true,
    };
  }

  if (session.state === "ACC_CORR_SAME") {
    const answer = yesNo(t);
    if (answer === true) {
      session.data.corrSameAddress = "Yes";
      session.data.corrAddress = session.data.addressLine1;
      session.data.corrCity = session.data.addressCity;
      session.data.corrState = session.data.addressState;
      session.data.corrPin = session.data.addressPin;
      session.state = "ACC_NOMINEE_NAME";
      return {
        speak: "Correspondence address set same as current. Now let's add nominee details. As per RBI guidelines, a nominee is required. What is your nominee's full name?",
        field: "nomineeName",
        value: "Same as current",
        formData: session.data,
        section: "Nominee Details",
        progress: getAccountProgress(session.state),
      };
    }
    if (answer === false) {
      session.data.corrSameAddress = "No";
      session.state = "ACC_CORR_ADDRESS";
      return {
        speak: "Please provide your correspondence address.",
        field: "corrAddress",
        formData: session.data,
        section: "Correspondence Address",
        progress: getAccountProgress(session.state),
      };
    }
    return { speak: "Please say yes or no.", field: "corrSameAddress" };
  }

  if (session.state === "ACC_CORR_ADDRESS") {
    session.data.corrAddress = text.trim();
    session.state = "ACC_CORR_CITY";
    return { speak: "City?", field: "corrCity", value: session.data.corrAddress, formData: session.data, section: "Correspondence Address", progress: getAccountProgress(session.state) };
  }

  if (session.state === "ACC_CORR_CITY") {
    session.data.corrCity = titleCase(text.trim());
    session.state = "ACC_CORR_STATE";
    return { speak: "State?", field: "corrState", value: session.data.corrCity, formData: session.data, section: "Correspondence Address", progress: getAccountProgress(session.state) };
  }

  if (session.state === "ACC_CORR_STATE") {
    session.data.corrState = titleCase(text.trim());
    session.state = "ACC_CORR_PIN";
    return { speak: "PIN code?", field: "corrPin", value: session.data.corrState, formData: session.data, section: "Correspondence Address", progress: getAccountProgress(session.state) };
  }

  if (session.state === "ACC_CORR_PIN") {
    const pin = validatePin(t);
    if (pin) {
      session.data.corrPin = pin;
      session.state = "ACC_NOMINEE_NAME";
      return {
        speak: "Correspondence address saved. Now nominee details. What is your nominee's full name?",
        field: "nomineeName",
        value: pin,
        validationResult: "valid",
        formData: session.data,
        section: "Nominee Details",
        progress: getAccountProgress(session.state),
      };
    }
    return { speak: "PIN must be 6 digits.", field: "corrPin", validationResult: "invalid", error: true };
  }

  if (session.state === "ACC_NOMINEE_NAME") {
    session.data.nomineeName = titleCase(text.trim());
    session.state = "ACC_NOMINEE_RELATION";
    return {
      speak: `Nominee ${session.data.nomineeName}. What is their relationship to you? For example: Spouse, Father, Mother, Son, Daughter, Brother, Sister.`,
      field: "nomineeRelation",
      value: session.data.nomineeName,
      formData: session.data,
      section: "Nominee Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_NOMINEE_RELATION") {
    session.data.nomineeRelation = titleCase(text.trim());
    session.state = "ACC_NOMINEE_DOB";
    return {
      speak: `Relationship: ${session.data.nomineeRelation}. What is the nominee's date of birth?`,
      field: "nomineeDob",
      value: session.data.nomineeRelation,
      formData: session.data,
      section: "Nominee Details",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_NOMINEE_DOB") {
    session.data.nomineeDob = text.trim();
    session.state = "ACC_ID_TYPE";
    return {
      speak: "Nominee details saved. Now, which officially valid document would you like to submit for KYC? Passport, Voter ID, Driving Licence, Aadhaar Card, or NREGA Job Card?",
      field: "idType",
      value: session.data.nomineeDob,
      formData: session.data,
      section: "KYC Documents",
      progress: getAccountProgress(session.state),
      documents: getDocumentStatus(session.data),
    };
  }

  if (session.state === "ACC_ID_TYPE") {
    if (/passport/i.test(t)) session.data.idType = "Passport";
    else if (/voter/i.test(t)) session.data.idType = "Voter ID";
    else if (/driv/i.test(t)) session.data.idType = "Driving Licence";
    else if (/aadhaar/i.test(t)) session.data.idType = "Aadhaar Card";
    else if (/nrega/i.test(t)) session.data.idType = "NREGA Job Card";
    else session.data.idType = titleCase(text.trim());
    session.state = "ACC_ID_NUMBER";
    return {
      speak: `${session.data.idType} selected. Please provide the document number.`,
      field: "idNumber",
      value: session.data.idType,
      formData: session.data,
      section: "KYC Documents",
      progress: getAccountProgress(session.state),
      documents: getDocumentStatus(session.data),
    };
  }

  if (session.state === "ACC_ID_NUMBER") {
    session.data.idNumber = text.replace(/\s/g, "").toUpperCase();
    session.state = "ACC_SERVICES_ATM";
    return {
      speak: `Document number recorded. Now let's set up your services. Would you like an ATM-cum-Debit Card? Rupay, Visa, or Mastercard? Or say no.`,
      field: "wantsATM",
      value: session.data.idNumber,
      formData: session.data,
      section: "Services Required",
      progress: getAccountProgress(session.state),
      documents: getDocumentStatus(session.data),
    };
  }

  if (session.state === "ACC_SERVICES_ATM") {
    if (/no|none|skip/i.test(t)) {
      session.data.wantsATM = "No";
    } else if (/visa/i.test(t)) {
      session.data.wantsATM = "Yes - Visa";
    } else if (/master/i.test(t)) {
      session.data.wantsATM = "Yes - Mastercard";
    } else {
      session.data.wantsATM = "Yes - Rupay";
    }
    session.state = "ACC_SERVICES_CHEQUE";
    return {
      speak: `ATM Card: ${session.data.wantsATM}. Would you like a Cheque Book?`,
      field: "wantsChequeBook",
      value: session.data.wantsATM,
      formData: session.data,
      section: "Services Required",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_SERVICES_CHEQUE") {
    session.data.wantsChequeBook = yesNo(t) === false ? "No" : "Yes";
    session.state = "ACC_SERVICES_MOBILE_BANKING";
    return {
      speak: `Cheque Book: ${session.data.wantsChequeBook}. Would you like to activate Mobile Banking?`,
      field: "wantsMobileBanking",
      value: session.data.wantsChequeBook,
      formData: session.data,
      section: "Services Required",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_SERVICES_MOBILE_BANKING") {
    session.data.wantsMobileBanking = yesNo(t) === false ? "No" : "Yes";
    session.state = "ACC_SERVICES_SMS";
    return {
      speak: `Mobile Banking: ${session.data.wantsMobileBanking}. Would you like SMS alerts on your registered mobile?`,
      field: "wantsSMS",
      value: session.data.wantsMobileBanking,
      formData: session.data,
      section: "Services Required",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_SERVICES_SMS") {
    session.data.wantsSMS = yesNo(t) === false ? "No" : "Yes";
    session.state = "ACC_INITIAL_DEPOSIT";
    return {
      speak: `SMS Alerts: ${session.data.wantsSMS}. What will be your initial deposit amount? You can say zero if none.`,
      field: "initialDeposit",
      value: session.data.wantsSMS,
      formData: session.data,
      section: "Deposit",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_INITIAL_DEPOSIT") {
    const amt = text.replace(/[^\d]/g, "") || "0";
    session.data.initialDeposit = `₹${Number(amt).toLocaleString("en-IN")}`;
    const otp = generateOTP();
    session.data.generatedOtp = otp;
    session.state = "ACC_OTP";
    return {
      speak: `Initial deposit: ${session.data.initialDeposit}. For verification, I'm sending an OTP to your mobile ending in ${session.data.mobile?.slice(-4)}. Your OTP is ${otp}. Please speak it to verify.`,
      field: "otp",
      value: session.data.initialDeposit,
      formData: session.data,
      section: "Verification",
      progress: getAccountProgress(session.state),
    };
  }

  if (session.state === "ACC_OTP") {
    const digits = t.replace(/\D/g, "");
    if (digits === session.data.generatedOtp) {
      session.state = "ACC_CONFIRM";
      const d = session.data;
      return {
        speak: `OTP verified! Let me summarize your application. Name: ${d.fullName}. Account: ${d.accountType}. DOB: ${d.dob}. PAN: ${d.pan}. Mobile: ending ${d.mobile?.slice(-4)}. Address: ${d.addressCity}, ${d.addressState}. Nominee: ${d.nomineeName}. Shall I submit this application? Say yes to confirm.`,
        field: "confirm",
        validationResult: "valid",
        formData: session.data,
        section: "Confirmation",
        progress: 95,
        documents: getDocumentStatus(session.data),
      };
    }
    return {
      speak: "That OTP doesn't match. Please try again.",
      field: "otp",
      error: true,
      validationResult: "invalid",
    };
  }

  if (session.state === "ACC_CONFIRM") {
    if (yesNo(t) === true) {
      const accNo = generateAccountNumber();
      session.data.accountNumber = accNo;

      const existing = JSON.parse(localStorage.getItem("aura_accounts") || "[]");
      existing.push({ ...session.data, createdAt: new Date().toISOString() });
      localStorage.setItem("aura_accounts", JSON.stringify(existing));

      setTimeout(() => { sessions[sessionId] = { state: "IDLE", data: {} }; }, 3000);

      return {
        speak: `Congratulations ${session.data.firstName}! Your ${session.data.accountType} has been created successfully. Your account number is ${accNo}. Your welcome kit with debit card and passbook will be dispatched to your address within 5-7 business days. Thank you for banking with us!`,
        field: "success",
        value: accNo,
        final: true,
        formData: session.data,
        progress: 100,
        documents: getDocumentStatus(session.data),
      };
    }
    session.state = "ACC_FIRST_NAME";
    return {
      speak: "No problem. Let's correct the details. What is your first name?",
      field: "firstName",
      section: "Personal Details",
      progress: 5,
    };
  }

  // ============ BALANCE CHECK ============
  if (session.state === "BAL_ACCOUNT") {
    const accounts = JSON.parse(localStorage.getItem("aura_accounts") || "[]");
    const found = accounts.find((a: SessionData) => a.accountNumber?.toLowerCase() === t.replace(/\s/g, "").toLowerCase());
    sessions[sessionId] = { state: "IDLE", data: {} };
    if (found) {
      const balance = (Math.random() * 500000 + 10000).toFixed(2);
      return {
        speak: `Account found for ${found.fullName}. Account type: ${found.accountType}. Your current balance is ₹${Number(balance).toLocaleString("en-IN")}. Is there anything else I can help with?`,
        final: true,
        formData: found,
      };
    }
    return {
      speak: "I couldn't find an account with that number. Please check and try again, or say 'open account' to create one.",
    };
  }

  // ============ LOAN FLOW ============
  if (session.state === "LOAN_TYPE") {
    if (/home/i.test(t)) session.data.loanType = "Home Loan";
    else if (/car|auto|vehicle/i.test(t)) session.data.loanType = "Car Loan";
    else if (/education|study/i.test(t)) session.data.loanType = "Education Loan";
    else session.data.loanType = "Personal Loan";
    session.state = "LOAN_AMOUNT";
    return {
      speak: `${session.data.loanType} selected. How much would you like to borrow?`,
      field: "loanAmount",
      value: session.data.loanType,
      formData: session.data,
      section: "Loan Amount",
    };
  }

  if (session.state === "LOAN_AMOUNT") {
    const amt = text.replace(/[^\d.]/g, "") || "500000";
    session.data.loanAmount = amt;
    session.state = "LOAN_TENURE";
    return {
      speak: `Loan amount ₹${Number(amt).toLocaleString("en-IN")}. What tenure would you prefer? In years.`,
      field: "loanTenure",
      value: `₹${Number(amt).toLocaleString("en-IN")}`,
      formData: session.data,
      section: "Loan Tenure",
    };
  }

  if (session.state === "LOAN_TENURE") {
    const years = text.replace(/[^\d]/g, "") || "5";
    session.data.loanTenure = years + " years";
    session.state = "LOAN_INCOME";
    return {
      speak: `${session.data.loanTenure}. What is your monthly income?`,
      field: "loanIncome",
      value: session.data.loanTenure,
      formData: session.data,
      section: "Income Details",
    };
  }

  if (session.state === "LOAN_INCOME") {
    const income = text.replace(/[^\d]/g, "") || "50000";
    session.data.loanIncome = `₹${Number(income).toLocaleString("en-IN")}`;
    session.state = "LOAN_EMPLOYMENT";
    return {
      speak: `Monthly income: ${session.data.loanIncome}. What is your employment type? Salaried, Self-employed, or Business?`,
      field: "loanEmployment",
      value: session.data.loanIncome,
      formData: session.data,
      section: "Employment",
    };
  }

  if (session.state === "LOAN_EMPLOYMENT") {
    if (/salary|salaried/i.test(t)) session.data.loanEmployment = "Salaried";
    else if (/self/i.test(t)) session.data.loanEmployment = "Self-Employed";
    else session.data.loanEmployment = "Business";
    session.state = "LOAN_PAN";
    return {
      speak: `${session.data.loanEmployment}. Please provide your PAN number for credit check.`,
      field: "loanPan",
      value: session.data.loanEmployment,
      formData: session.data,
      section: "KYC",
    };
  }

  if (session.state === "LOAN_PAN") {
    const pan = validatePAN(t);
    if (pan) {
      session.data.loanPan = pan;
      session.state = "LOAN_CONFIRM";
      const rates: Record<string, string> = { "Home Loan": "8.5", "Car Loan": "9.2", "Education Loan": "7.5", "Personal Loan": "12.5" };
      const rate = rates[session.data.loanType || "Personal Loan"] || "12.5";
      const amt = Number(session.data.loanAmount);
      const tenure = parseInt(session.data.loanTenure || "5") * 12;
      const r = Number(rate) / 1200;
      const emi = (amt * r / (1 - Math.pow(1 + r, -tenure))).toFixed(0);
      return {
        speak: `PAN verified. Here's your loan summary: ${session.data.loanType} of ₹${amt.toLocaleString("en-IN")} for ${session.data.loanTenure} at ${rate}% per annum. Estimated EMI: ₹${Number(emi).toLocaleString("en-IN")} per month. Would you like to submit this application?`,
        field: "confirm",
        value: pan,
        validationResult: "valid",
        formData: session.data,
        section: "Loan Summary",
      };
    }
    return { speak: "Invalid PAN format. Please try again.", field: "loanPan", validationResult: "invalid", error: true };
  }

  if (session.state === "LOAN_CONFIRM") {
    sessions[sessionId] = { state: "IDLE", data: {} };
    if (yesNo(t) === true) {
      const ref = "LN" + Date.now().toString().slice(-8);
      return {
        speak: `Your loan application has been submitted successfully! Reference number: ${ref}. Our team will review your application and contact you within 2-3 business days. Is there anything else?`,
        final: true,
        value: ref,
        field: "success",
        formData: session.data,
      };
    }
    return { speak: "Loan application cancelled. How else can I help?", final: true };
  }

  // ============ CARD SERVICE ============
  if (session.state === "CARD_ACTION") {
    if (/block/i.test(t)) { session.data.cardAction = "Block"; session.state = "CARD_NUMBER"; }
    else if (/status/i.test(t)) { session.data.cardAction = "Status"; session.state = "CARD_NUMBER"; }
    else if (/new|apply/i.test(t)) { session.data.cardAction = "New"; session.state = "CARD_TYPE"; }
    else { session.data.cardAction = "New"; session.state = "CARD_TYPE"; }

    if (session.state === "CARD_TYPE") {
      return {
        speak: "What type of card? Debit Card (Rupay/Visa/Mastercard) or Credit Card?",
        field: "cardType",
        value: session.data.cardAction,
        formData: session.data,
      };
    }
    return {
      speak: "Please provide your card number or last 4 digits.",
      field: "cardNumber",
      value: session.data.cardAction,
      formData: session.data,
    };
  }

  if (session.state === "CARD_TYPE") {
    session.data.cardType = /credit/i.test(t) ? "Credit Card" : /visa/i.test(t) ? "Visa Debit" : /master/i.test(t) ? "Mastercard Debit" : "Rupay Debit";
    sessions[sessionId] = { state: "IDLE", data: {} };
    return {
      speak: `Your ${session.data.cardType} application has been submitted. You'll receive it within 7-10 business days at your registered address. Anything else?`,
      final: true,
      field: "success",
      formData: session.data,
    };
  }

  if (session.state === "CARD_NUMBER") {
    const digits = t.replace(/\D/g, "");
    session.data.cardNumber = digits;
    sessions[sessionId] = { state: "IDLE", data: {} };
    if (session.data.cardAction === "Block") {
      return {
        speak: `Your card ending in ${digits.slice(-4)} has been blocked immediately for security. A replacement will be issued within 5 business days. Anything else?`,
        final: true,
        field: "success",
      };
    }
    return {
      speak: `Card ending in ${digits.slice(-4)} is active and in good standing. Last transaction 2 days ago. Anything else?`,
      final: true,
    };
  }

  // ============ FIXED DEPOSIT ============
  if (session.state === "FD_AMOUNT") {
    const amt = text.replace(/[^\d]/g, "") || "100000";
    session.data.fdAmount = `₹${Number(amt).toLocaleString("en-IN")}`;
    session.state = "FD_TENURE";
    return {
      speak: `FD amount: ${session.data.fdAmount}. What tenure? Options: 7 days to 10 years. Please specify in months or years.`,
      field: "fdTenure",
      value: session.data.fdAmount,
      formData: session.data,
      section: "FD Tenure",
    };
  }

  if (session.state === "FD_TENURE") {
    session.data.fdTenure = text.trim();
    session.state = "FD_INTEREST_PAYOUT";
    return {
      speak: `Tenure: ${session.data.fdTenure}. How would you like interest payout? Monthly, Quarterly, Half-yearly, Yearly, or Reinvestment (cumulative)?`,
      field: "fdInterestPayout",
      value: session.data.fdTenure,
      formData: session.data,
      section: "Interest Payout",
    };
  }

  if (session.state === "FD_INTEREST_PAYOUT") {
    if (/monthly/i.test(t)) session.data.fdInterestPayout = "Monthly";
    else if (/quarter/i.test(t)) session.data.fdInterestPayout = "Quarterly";
    else if (/half/i.test(t)) session.data.fdInterestPayout = "Half-Yearly";
    else if (/year/i.test(t)) session.data.fdInterestPayout = "Yearly";
    else session.data.fdInterestPayout = "Reinvestment (Cumulative)";
    session.state = "FD_NOMINEE";
    return {
      speak: `Interest payout: ${session.data.fdInterestPayout}. Who is the nominee for this FD?`,
      field: "fdNominee",
      value: session.data.fdInterestPayout,
      formData: session.data,
      section: "FD Nominee",
    };
  }

  if (session.state === "FD_NOMINEE") {
    session.data.fdNominee = titleCase(text.trim());
    session.state = "FD_CONFIRM";
    return {
      speak: `Nominee: ${session.data.fdNominee}. FD Summary — Amount: ${session.data.fdAmount}, Tenure: ${session.data.fdTenure}, Interest: ${session.data.fdInterestPayout}, Rate: 7.1% p.a. Shall I book this FD?`,
      field: "confirm",
      value: session.data.fdNominee,
      formData: session.data,
      section: "FD Confirmation",
    };
  }

  if (session.state === "FD_CONFIRM") {
    sessions[sessionId] = { state: "IDLE", data: {} };
    if (yesNo(t) === true) {
      const ref = "FD" + Date.now().toString().slice(-8);
      return {
        speak: `Your Fixed Deposit has been booked successfully! FD Reference: ${ref}. Maturity proceeds will be credited as per your instructions. Anything else?`,
        final: true,
        field: "success",
        value: ref,
        formData: session.data,
      };
    }
    return { speak: "FD booking cancelled. How else can I help?", final: true };
  }

  // ============ FUND TRANSFER ============
  if (session.state === "FT_TYPE") {
    if (/neft/i.test(t)) session.data.ftType = "NEFT";
    else if (/rtgs/i.test(t)) session.data.ftType = "RTGS";
    else session.data.ftType = "IMPS";
    session.state = "FT_BENEFICIARY_NAME";
    return {
      speak: `${session.data.ftType} transfer. What is the beneficiary's name?`,
      field: "ftBeneficiaryName",
      value: session.data.ftType,
      formData: session.data,
    };
  }

  if (session.state === "FT_BENEFICIARY_NAME") {
    session.data.ftBeneficiaryName = titleCase(text.trim());
    session.state = "FT_BENEFICIARY_ACCOUNT";
    return {
      speak: `Beneficiary: ${session.data.ftBeneficiaryName}. What is their account number?`,
      field: "ftBeneficiaryAccount",
      value: session.data.ftBeneficiaryName,
      formData: session.data,
    };
  }

  if (session.state === "FT_BENEFICIARY_ACCOUNT") {
    session.data.ftBeneficiaryAccount = t.replace(/\s/g, "");
    session.state = "FT_IFSC";
    return {
      speak: "Account number noted. What is the IFSC code of the beneficiary's bank?",
      field: "ftIfsc",
      value: session.data.ftBeneficiaryAccount,
      formData: session.data,
    };
  }

  if (session.state === "FT_IFSC") {
    session.data.ftIfsc = text.replace(/\s/g, "").toUpperCase();
    session.state = "FT_AMOUNT";
    return {
      speak: `IFSC: ${session.data.ftIfsc}. How much would you like to transfer?`,
      field: "ftAmount",
      value: session.data.ftIfsc,
      formData: session.data,
    };
  }

  if (session.state === "FT_AMOUNT") {
    const amt = text.replace(/[^\d]/g, "") || "0";
    session.data.ftAmount = `₹${Number(amt).toLocaleString("en-IN")}`;
    const otp = generateOTP();
    session.data.generatedOtp = otp;
    session.state = "FT_OTP";
    return {
      speak: `Transfer ${session.data.ftAmount} to ${session.data.ftBeneficiaryName} via ${session.data.ftType}. For security, please verify with OTP. Your OTP is ${otp}.`,
      field: "otp",
      value: session.data.ftAmount,
      formData: session.data,
    };
  }

  if (session.state === "FT_OTP") {
    const digits = t.replace(/\D/g, "");
    if (digits === session.data.generatedOtp) {
      sessions[sessionId] = { state: "IDLE", data: {} };
      const ref = "TXN" + Date.now().toString().slice(-10);
      return {
        speak: `Transfer successful! ${session.data.ftAmount} sent to ${session.data.ftBeneficiaryName} via ${session.data.ftType}. Transaction reference: ${ref}. Anything else?`,
        final: true,
        field: "success",
        value: ref,
        validationResult: "valid",
        formData: session.data,
      };
    }
    return { speak: "OTP doesn't match. Please try again.", field: "otp", validationResult: "invalid", error: true };
  }

  // ============ CHEQUE SERVICE ============
  if (session.state === "CHQ_ACTION") {
    if (/stop/i.test(t)) { session.data.chequeAction = "Stop Payment"; session.state = "CHQ_NUMBER"; }
    else { session.data.chequeAction = "Cheque Book Request"; session.state = "CHQ_ACCOUNT"; }

    if (session.state === "CHQ_ACCOUNT") {
      return { speak: "Please provide your account number for cheque book request.", field: "chequeAccount", value: session.data.chequeAction, formData: session.data };
    }
    return { speak: "Please provide the cheque number to stop.", field: "chequeNumber", value: session.data.chequeAction, formData: session.data };
  }

  if (session.state === "CHQ_ACCOUNT") {
    session.data.chequeAccount = t.replace(/\s/g, "");
    sessions[sessionId] = { state: "IDLE", data: {} };
    return {
      speak: `Cheque book request submitted for account ${session.data.chequeAccount}. A book of 25 leaves will be dispatched within 5-7 business days. Anything else?`,
      final: true,
      field: "success",
      formData: session.data,
    };
  }

  if (session.state === "CHQ_NUMBER") {
    session.data.chequeNumber = t.replace(/\s/g, "");
    sessions[sessionId] = { state: "IDLE", data: {} };
    return {
      speak: `Stop payment placed on cheque number ${session.data.chequeNumber}. This takes effect immediately. A fee of ₹100 may apply. Anything else?`,
      final: true,
      field: "success",
      formData: session.data,
    };
  }

  // ============ ACCOUNT CLOSURE ============
  if (session.state === "CLOSE_ACCOUNT") {
    session.data.closeAccount = t.replace(/\s/g, "");
    session.state = "CLOSE_REASON";
    return {
      speak: `Account ${session.data.closeAccount}. What is the reason for closure? Moving to another bank, No longer needed, or Other?`,
      field: "closeReason",
      value: session.data.closeAccount,
      formData: session.data,
    };
  }

  if (session.state === "CLOSE_REASON") {
    session.data.closeReason = text.trim();
    session.state = "CLOSE_TRANSFER_ACC";
    return {
      speak: "Would you like to transfer the remaining balance to another account? If yes, please provide the account number. If no, say no.",
      field: "closeTransferAcc",
      value: session.data.closeReason,
      formData: session.data,
    };
  }

  if (session.state === "CLOSE_TRANSFER_ACC") {
    if (yesNo(t) === false || /no/i.test(t)) {
      session.data.closeTransferAcc = "Banker's Cheque";
    } else {
      session.data.closeTransferAcc = t.replace(/\s/g, "");
    }
    session.state = "CLOSE_CONFIRM";
    return {
      speak: `Balance transfer to: ${session.data.closeTransferAcc}. Please confirm account closure. This action is irreversible. Say yes to confirm.`,
      field: "confirm",
      value: session.data.closeTransferAcc,
      formData: session.data,
    };
  }

  if (session.state === "CLOSE_CONFIRM") {
    sessions[sessionId] = { state: "IDLE", data: {} };
    if (yesNo(t) === true) {
      return {
        speak: "Account closure request submitted. Please return all unused cheque books and debit cards to the branch. Closure will be processed within 7-10 business days. Anything else?",
        final: true,
        field: "success",
        formData: session.data,
      };
    }
    return { speak: "Account closure cancelled. How else can I help?", final: true };
  }

  // ============ GRIEVANCE ============
  if (session.state === "GRIEV_TYPE") {
    if (/service/i.test(t)) session.data.grievanceType = "Service Issue";
    else if (/transaction|dispute/i.test(t)) session.data.grievanceType = "Transaction Dispute";
    else if (/card/i.test(t)) session.data.grievanceType = "Card Issue";
    else session.data.grievanceType = titleCase(text.trim());
    session.state = "GRIEV_DESCRIPTION";
    return {
      speak: `${session.data.grievanceType}. Please briefly describe your issue.`,
      field: "grievanceDesc",
      value: session.data.grievanceType,
      formData: session.data,
    };
  }

  if (session.state === "GRIEV_DESCRIPTION") {
    session.data.grievanceDesc = text.trim();
    session.state = "GRIEV_ACCOUNT";
    return {
      speak: "Thank you. What account number is this related to?",
      field: "grievanceAccount",
      value: session.data.grievanceDesc,
      formData: session.data,
    };
  }

  if (session.state === "GRIEV_ACCOUNT") {
    session.data.grievanceAccount = t.replace(/\s/g, "");
    session.state = "GRIEV_CONFIRM";
    return {
      speak: `Complaint summary: ${session.data.grievanceType} — "${session.data.grievanceDesc}" for account ${session.data.grievanceAccount}. Shall I submit this complaint?`,
      field: "confirm",
      value: session.data.grievanceAccount,
      formData: session.data,
    };
  }

  if (session.state === "GRIEV_CONFIRM") {
    sessions[sessionId] = { state: "IDLE", data: {} };
    if (yesNo(t) === true) {
      const ref = generateRefNumber();
      session.data.grievanceRef = ref;
      return {
        speak: `Complaint registered successfully. Your reference number is ${ref}. As per RBI guidelines, we will acknowledge within 48 hours and resolve within 30 days. You can also escalate to the Banking Ombudsman if not resolved. Anything else?`,
        final: true,
        field: "success",
        value: ref,
        formData: session.data,
      };
    }
    return { speak: "Complaint cancelled. How else can I help?", final: true };
  }

  return {
    speak: "I didn't quite catch that. Could you please repeat?",
  };
}

export function getSession(sessionId: string): Session {
  return sessions[sessionId] || { state: "IDLE", data: {} };
}
