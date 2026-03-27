/**
 * API client — routes all conversation processing to the Python FastAPI backend.
 * Falls back to localhost:8000 (Uvicorn). Mirrors the shape of conversationEngine.ts
 * so Index.tsx doesn't need major changes.
 */

export type Intent =
  | "ACCOUNT_OPENING" | "BALANCE_CHECK" | "LOAN_INQUIRY" | "CARD_SERVICE"
  | "FIXED_DEPOSIT" | "FUND_TRANSFER" | "CHEQUE_SERVICE" | "ACCOUNT_CLOSURE"
  | "GRIEVANCE" | "GENERAL_QUERY" | "UNKNOWN";

export interface SessionData {
  accountType?: string; salutation?: string; firstName?: string;
  middleName?: string; lastName?: string; fullName?: string; dob?: string;
  gender?: string; maritalStatus?: string; fatherSpouseName?: string;
  nationality?: string; occupation?: string; annualIncome?: string;
  sourceOfFunds?: string; pan?: string; aadhaar?: string; mobile?: string;
  email?: string; addressLine1?: string; addressCity?: string;
  addressState?: string; addressPin?: string; corrSameAddress?: string;
  corrAddress?: string; corrCity?: string; corrState?: string; corrPin?: string;
  nomineeName?: string; nomineeRelation?: string; nomineeDob?: string;
  idType?: string; idNumber?: string; wantsATM?: string; wantsChequeBook?: string;
  wantsMobileBanking?: string; wantsSMS?: string; initialDeposit?: string;
  otp?: string; generatedOtp?: string; accountNumber?: string;
  loanType?: string; loanAmount?: string; loanTenure?: string; loanIncome?: string;
  loanEmployment?: string; loanPan?: string;
  cardAction?: string; cardType?: string; cardNumber?: string; cardName?: string; cardExpiry?: string; cardCvv?: string;
  fdAmount?: string; fdTenure?: string; fdInterestPayout?: string; fdNominee?: string;
  ftType?: string; ftBeneficiaryName?: string; ftBeneficiaryAccount?: string;
  ftIfsc?: string; ftAmount?: string;
  chequeAction?: string; chequeAccount?: string; chequeNumber?: string;
  closeAccount?: string; closeReason?: string; closeTransferAcc?: string;
  grievanceType?: string; grievanceDesc?: string; grievanceAccount?: string; grievanceRef?: string;
  aadhaarFrontPhoto?: string; customerPhoto?: string;
}

export interface DocumentStatus {
  name: string;
  status: "pending" | "collected" | "verified";
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
  metadata?: {
    show_balance_graph?: boolean;
    balance_data?: any;
  };
}

const API_BASE = "http://localhost:8000";

export async function processInput(sessionId: string, text: string): Promise<EngineResponse> {
  try {
    const res = await fetch(`${API_BASE}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, text }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Snake_case → camelCase mapping
    return {
      speak: data.speak,
      field: data.field,
      value: data.value,
      error: data.error,
      final: data.final,
      validationResult: data.validation_result,
      formData: data.form_data,
      intent: data.intent,
      section: data.section,
      progress: data.progress,
      documents: data.documents,
      metadata: data.metadata,
    };
  } catch (err) {
    console.error("Backend unreachable:", err);
    return { speak: "Backend not available. Please start the Python server on port 8000." };
  }
}

export async function uploadImage(sessionId: string, field: string, image: string): Promise<{ status: string; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, field: field, image: image }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Upload failed:", err);
    return { status: "error", message: String(err) };
  }
}
