import { useEffect, useRef, useState } from "react";
import type { SessionData, DocumentStatus } from "@/lib/apiClient";
import {
  Check, AlertCircle, FileText, Shield, User, MapPin,
  Users, CreditCard, Banknote, ChevronRight,
} from "lucide-react";
import InteractiveCard from "./InteractiveCard";
import CameraCapture from "./CameraCapture";
import { uploadImage } from "@/lib/apiClient";

interface FormVisualizationProps {
  formData: SessionData;
  activeField?: string;
  validationResult?: "valid" | "invalid";
  isVisible: boolean;
  intent?: string;
  section?: string;
  progress?: number;
  documents?: DocumentStatus[];
  onUserSubmit?: (text: string) => void;
  voiceTrigger?: boolean;
}

interface FieldConfig { key: keyof SessionData; label: string; mask?: boolean; }

const ACCOUNT_SECTIONS: Array<{ name: string; icon: React.ReactNode; fields: FieldConfig[]; color: string; gradient: string }> = [
  {
    name: "Personal Details", color: "#00E5FF", gradient: "linear-gradient(135deg,#0284C7,#00E5FF)", icon: <User className="w-4 h-4" />,
    fields: [{ key: "accountType", label: "ACCOUNT_TYPE" }, { key: "salutation", label: "SALUTATION" }, { key: "firstName", label: "FIRST_NAME" }, { key: "middleName", label: "MIDDLE_NAME" }, { key: "lastName", label: "LAST_NAME" }, { key: "dob", label: "D.O.B" }, { key: "gender", label: "GENDER" }, { key: "maritalStatus", label: "MARITAL_STATUS" }, { key: "fatherSpouseName", label: "FATHER/SPOUSE" }, { key: "nationality", label: "NATIONALITY" }, { key: "occupation", label: "OCCUPATION" }, { key: "annualIncome", label: "ANNUAL_INCOME" }, { key: "sourceOfFunds", label: "SOURCE_OF_FUNDS" }],
  },
  {
    name: "KYC Documents", color: "#00E5FF", gradient: "linear-gradient(135deg,#0284C7,#00E5FF)", icon: <Shield className="w-4 h-4" />,
    fields: [
      { key: "pan", label: "PAN_NUMBER" }, 
      { key: "aadhaar", label: "AADHAAR_NO", mask: true },
      { key: "aadhaarFrontPhoto", label: "AADHAAR_PHOTO" },
      { key: "customerPhoto", label: "CUSTOMER_PHOTO" },
      { key: "idType", label: "ID_TYPE" }, 
      { key: "idNumber", label: "ID_NUMBER" }
    ],
  },
  {
    name: "Contact Details", color: "#00E5FF", gradient: "linear-gradient(135deg,#0284C7,#00E5FF)", icon: <FileText className="w-4 h-4" />,
    fields: [{ key: "mobile", label: "REGISTERED_MOBILE", mask: true }, { key: "email", label: "EMAIL_ID" }],
  },
  {
    name: "Address Details", color: "#00E5FF", gradient: "linear-gradient(135deg,#0284C7,#00E5FF)", icon: <MapPin className="w-4 h-4" />,
    fields: [{ key: "addressLine1", label: "ADDRESS" }, { key: "addressCity", label: "CITY/VILLAGE" }, { key: "addressState", label: "STATE" }, { key: "addressPin", label: "PIN_CODE" }],
  },
  {
    name: "Correspondence Address", color: "#00E5FF", gradient: "linear-gradient(135deg,#0284C7,#00E5FF)", icon: <MapPin className="w-4 h-4" />,
    fields: [{ key: "corrSameAddress", label: "SAME_AS_CURRENT" }, { key: "corrAddress", label: "CORR_ADDRESS" }, { key: "corrCity", label: "CORR_CITY" }, { key: "corrState", label: "CORR_STATE" }, { key: "corrPin", label: "CORR_PIN" }],
  },
  {
    name: "Nominee Details", color: "#00E5FF", gradient: "linear-gradient(135deg,#0284C7,#00E5FF)", icon: <Users className="w-4 h-4" />,
    fields: [{ key: "nomineeName", label: "NOMINEE_NAME" }, { key: "nomineeRelation", label: "RELATIONSHIP" }, { key: "nomineeDob", label: "NOMINEE_DOB" }],
  },
  {
    name: "Services Required", color: "#00E5FF", gradient: "linear-gradient(135deg,#0284C7,#00E5FF)", icon: <CreditCard className="w-4 h-4" />,
    fields: [{ key: "wantsATM", label: "ATM/DEBIT_CARD" }, { key: "wantsChequeBook", label: "CHEQUE_BOOK" }, { key: "wantsMobileBanking", label: "MOBILE_BANKING" }, { key: "wantsSMS", label: "SMS_ALERTS" }],
  },
  {
    name: "Deposit", color: "#00E5FF", gradient: "linear-gradient(135deg,#0284C7,#00E5FF)", icon: <Banknote className="w-4 h-4" />,
    fields: [{ key: "initialDeposit", label: "INITIAL_DEPOSIT" }],
  },
];

const SECTION_ORDER = ACCOUNT_SECTIONS.map(s => s.name);
function getSectionIndex(name: string) { return SECTION_ORDER.indexOf(name); }

const loanFields: FieldConfig[] = [{ key: "loanType", label: "LOAN_TYPE" }, { key: "mobile", label: "REGISTERED_MOBILE", mask: true }, { key: "loanAmount", label: "LOAN_AMOUNT" }, { key: "loanTenure", label: "TENURE" }, { key: "loanIncome", label: "MONTHLY_INCOME" }, { key: "loanEmployment", label: "EMPLOYMENT" }, { key: "loanPan", label: "PAN_NUMBER" }];
const fdFields: FieldConfig[] = [{ key: "fdAmount", label: "FD_AMOUNT" }, { key: "mobile", label: "REGISTERED_MOBILE", mask: true }, { key: "fdTenure", label: "TENURE" }, { key: "fdInterestPayout", label: "INTEREST_PAYOUT" }, { key: "fdNominee", label: "NOMINEE" }];
const ftFields: FieldConfig[] = [{ key: "ftType", label: "TRANSFER_TYPE" }, { key: "ftBeneficiaryName", label: "BENEFICIARY" }, { key: "ftBeneficiaryAccount", label: "ACCOUNT_NO" }, { key: "mobile", label: "REGISTERED_MOBILE", mask: true }, { key: "ftIfsc", label: "IFSC_CODE" }, { key: "ftAmount", label: "AMOUNT" }];
const cardFields: FieldConfig[] = [{ key: "cardAction", label: "ACTION" }, { key: "mobile", label: "REGISTERED_MOBILE", mask: true }, { key: "cardType", label: "CARD_TYPE" }, { key: "cardNumber", label: "CARD_NUMBER", mask: true }];

const FormVisualization = ({
  formData, activeField, validationResult, isVisible,
  intent, section, progress, documents, onUserSubmit, voiceTrigger
}: FormVisualizationProps) => {
  const [displaySection, setDisplaySection] = useState(section);
  const [exiting, setExiting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const prevSection = useRef(section);

  useEffect(() => {
    if (!section || section === prevSection.current) return;
    setCompleting(true);
    setTimeout(() => {
      setCompleting(false);
      setExiting(true);
      setTimeout(() => {
        setExiting(false);
        setDisplaySection(section);
        prevSection.current = section;
      }, 350);
    }, 300);
  }, [section]);

  if (!isVisible) return null;

  const isAccountFlow = intent === "ACCOUNT_OPENING";

  const title =
    intent === "LOAN_INQUIRY" ? "Loan Application" :
      intent === "CARD_SERVICE" ? "Card Service" :
        intent === "FIXED_DEPOSIT" ? "Fixed Deposit" :
          intent === "FUND_TRANSFER" ? "Fund Transfer" :
            intent === "BALANCE_CHECK" ? "Balance Check" :
              intent === "CHEQUE_SERVICE" ? "Cheque Service" :
                intent === "ACCOUNT_CLOSURE" ? "Account Closure" :
                  intent === "GRIEVANCE" ? "Grievance" :
                    "Account Opening";

  const renderField = (field: FieldConfig, accentColor = "#4F6EF7") => {
    const value = formData[field.key];
    const isActive = activeField === field.key;
    const showValid = isActive && validationResult === "valid";
    const showInvalid = isActive && validationResult === "invalid";
    const isFilled = !!value;

    let cls = "neo-field ";
    if (isActive && !showValid && !showInvalid) cls += "neo-field-active";
    else if (showValid) cls += "neo-field-valid";
    else if (showInvalid) cls += "neo-field-invalid";
    else if (isFilled) cls += "neo-field-filled";

    return (
      <div key={field.key} style={{ marginBottom: 10 }}>
        <span className="neo-field-label" style={{ color: accentColor }}>{field.label}</span>
        <div className={cls} style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: "0.86rem", fontWeight: 600,
            color: value ? (showValid ? "#10B981" : showInvalid ? "#EF4444" : "var(--ink)") : "var(--ink-soft)",
            fontFamily: "var(--font-mono)",
            animation: value && isActive ? "textReveal 0.4s ease forwards" : undefined,
          }}>
            {value ? (field.mask ? "••••" + String(value).slice(-4) : String(value)) : "—"}
          </span>
          {showValid && (
            <div className="animate-success-glow" style={{ width: 22, height: 22, background: "linear-gradient(135deg,#10B981,#22C55E)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          {showInvalid && (
            <div style={{ width: 22, height: 22, background: "linear-gradient(135deg,#EF4444,#F87171)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertCircle className="w-3 h-3 text-white" />
            </div>
          )}
          {isFilled && !isActive && (
            <Check className="w-3.5 h-3.5" style={{ color: "#10B981", flexShrink: 0 }} />
          )}
        </div>
      </div>
    );
  };

  /* ── CAMERA CAPTURE INTERCEPT ──────────────────────────────────── */
  if (activeField === "aadhaarFrontPhoto" || activeField === "customerPhoto") {
    return (
      <CameraCapture 
        type={activeField === "aadhaarFrontPhoto" ? 'aadhaar' : 'portrait'}
        onCancel={() => {
            if (onUserSubmit) onUserSubmit("cancel camera");
        }}
        onCapture={async (base64) => {
            // Upload to backend
            const sessionId = localStorage.getItem("sessionId") || "default";
            const res = await uploadImage(sessionId, activeField, base64);
            if (res.status === "success") {
                // To advance the backend, we send a dummy trigger or the backend advances state automatically.
                // Our backend /upload endpoint ALREADY advances the state.
                // We just need to tell the frontend to refresh by sending a subtle "next" or similar.
                if (onUserSubmit) onUserSubmit("Image captured successfully");
            }
        }}
        voiceTrigger={voiceTrigger}
      />
    );
  }

  const cardInputIntents = ["CARD_SERVICE", "FUND_TRANSFER"];
  const cardInputFields = ["cardNumber", "cardName", "cardDetails", "accountNumber", "ftBeneficiaryAccount"];

  const showCard = cardInputIntents.includes(intent || "") && cardInputFields.includes(activeField || "");

  const fields =
    intent === "LOAN_INQUIRY" ? loanFields :
      intent === "CARD_SERVICE" ? cardFields :
        intent === "FIXED_DEPOSIT" ? fdFields :
          intent === "FUND_TRANSFER" ? ftFields :
            intent === "BALANCE_CHECK" ? [{ key: "accountNumber" as keyof SessionData, label: "ACCOUNT/CARD_NO" }, { key: "mobile" as keyof SessionData, label: "REGISTERED_MOBILE", mask: true }] : 
              [];

  const intentGradients: Record<string, string> = {
    LOAN_INQUIRY: "linear-gradient(135deg,#0369A1,#0284C7)",
    CARD_SERVICE: "linear-gradient(135deg,#0284C7,#00E5FF)",
    FIXED_DEPOSIT: "linear-gradient(135deg,#047857,#10B981)",
    FUND_TRANSFER: "linear-gradient(135deg,#475569,#94A3B8)",
    BALANCE_CHECK: "linear-gradient(135deg,#0284C7,#00E5FF)",
  };
  const intentColors: Record<string, string> = {
    LOAN_INQUIRY: "#0284C7", CARD_SERVICE: "#00E5FF", FIXED_DEPOSIT: "#10B981", FUND_TRANSFER: "#94A3B8", BALANCE_CHECK: "#00E5FF"
  };
  const accentColor = intentColors[intent || ""] || "#00E5FF";
  const accentGrad = intentGradients[intent || ""] || "linear-gradient(135deg,#0284C7,#00E5FF)";

  /* ── ACCOUNT SUCCESS CARD DISPLAY ────────────────────────────────── */
  if (activeField === "success" && intent === "ACCOUNT_OPENING") {
    // Return the card in read-only mode showing the new details
    return (
      <div className="w-full max-w-lg animate-fade-in-up flex flex-col items-center">
        <InteractiveCard
          readOnly={true}
          initialData={{
            name: formData.fullName || formData.firstName + " " + formData.lastName,
            number: formData.accountNumber || "9876543210123456", // Fallback or real num
            expiry: "03/31",
            cvv: "786"
          }}
          onSubmit={() => { }}
        />
        <div className="mt-8 clay-panel p-6 w-full text-center" style={{ borderTop: "3px solid #10B981" }}>
          <h3 className="text-xl font-bold text-green-400 mb-2">Account Created Successfully!</h3>
          <p className="text-sm opacity-70 mb-4">Your LOC Bank digital card is now active.</p>
          <div className="grid grid-cols-2 gap-4 text-left font-mono text-xs">
            <div className="opacity-50">ACCOUNT TYPE:</div><div>{formData.accountType || "SAVINGS"}</div>
            <div className="opacity-50">CUSTOMER ID:</div><div>CX-{Math.floor(Math.random() * 900000 + 100000)}</div>
            <div className="opacity-50">IFSC CODE:</div><div>LOCB0001024</div>
          </div>
        </div>
      </div>
    );
  }

  /* ── ACCOUNT OPENING WIZARD ──────────────────────────────────── */
  if (isAccountFlow) {
    const currentIdx = getSectionIndex(displaySection || "Personal Details");
    const activeSection = ACCOUNT_SECTIONS.find(s => s.name === displaySection) ?? ACCOUNT_SECTIONS[0];

    return (
      <div className="w-full max-w-lg animate-fade-in-up">

        {/* Step pills */}
        <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          {ACCOUNT_SECTIONS.map((s, i) => {
            const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
            return (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  className={`step-pill step-pill-${state}`}
                  title={s.name}
                  style={state === "active" ? { background: activeSection.gradient, borderColor: "transparent", color: "#fff" } : undefined}
                >
                  {state === "done" ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {i < ACCOUNT_SECTIONS.length - 1 && (
                  <ChevronRight className="w-3 h-3" style={{ color: i < currentIdx ? "var(--accent)" : "var(--ink-soft)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700, color: "var(--ink-muted)" }}>{displaySection || "Application"}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 800, color: activeSection.color }}>{progress}%</span>
            </div>
            <div className="neo-progress-track">
              <div className="neo-progress-fill" style={{ width: `${progress}%`, background: activeSection.gradient }} />
            </div>
          </div>
        )}

        {/* Document badges */}
        {documents && documents.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {documents.map(doc => (
              <span key={doc.name} className={`doc-badge doc-badge-${doc.status}`}>
                {doc.status === "verified" ? <Check className="w-3 h-3" /> : doc.status === "collected" ? <FileText className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {doc.name}
              </span>
            ))}
          </div>
        )}

        {/* Active section card */}
        <div
          className={`clay-panel ${completing ? "wizard-step-complete" : exiting ? "wizard-step-exit" : "wizard-step-enter"}`}
          style={{
            padding: "2.5rem",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Top color bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: activeSection.gradient, borderRadius: "18px 18px 0 0" }} />

          {/* Section header */}
          <div className="neo-section-header" style={{ color: activeSection.color }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: activeSection.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
              {activeSection.icon}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.16em", fontWeight: 800 }}>
              {activeSection.name.toUpperCase()}
            </span>
            <div style={{ marginLeft: "auto", background: activeSection.gradient, color: "white", borderRadius: 12, padding: "2px 10px", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.08em" }}>
              STEP {(currentIdx + 1).toString().padStart(2, "0")}
            </div>
          </div>

          {/* Fields */}
          <div>{activeSection.fields.map(f => renderField(f, activeSection.color))}</div>
        </div>

        {/* Completed sections */}
        {currentIdx > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
            {ACCOUNT_SECTIONS.slice(0, currentIdx).map(s => (
              <div key={s.name} style={{
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 10, padding: "7px 14px",
                display: "flex", alignItems: "center", gap: 8,
                fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 700,
              }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#22C55E)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
                <span style={{ color: "#10B981" }}>{s.name}</span>
                <span style={{ marginLeft: "auto", color: "#10B981", fontSize: "0.6rem", fontWeight: 800 }}>COMPLETED ✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Persistent Mobile Badge if exists */}
      {formData.mobile && (
        <div style={{
          background: "rgba(0, 229, 255, 0.1)",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          borderRadius: 20,
          padding: "6px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          fontWeight: 800,
          color: "var(--accent)"
        }}>
          <Shield size={12} />
          VERIFIED MOBILE: {formData.mobile.slice(0, 2)}xxxxxx{formData.mobile.slice(-2)}
        </div>
      )}

      {showCard && (
        <div className="w-full max-w-lg mb-8">
          <InteractiveCard
            activeField={activeField}
            initialData={{
              name: formData.cardName || formData.fullName || (formData.firstName ? `${formData.firstName} ${formData.lastName || ''}` : ''),
              number: formData.cardNumber || formData.accountNumber || formData.ftBeneficiaryAccount,
              expiry: formData.cardExpiry,
              cvv: formData.cardCvv
            }}
            onSubmit={(data) => {
              if (onUserSubmit) onUserSubmit(data);
            }} />
        </div>
      )}

      <div className="clay-panel" style={{
        padding: "2.5rem",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentGrad, borderRadius: "18px 18px 0 0" }} />

        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(120,130,180,0.15)", paddingBottom: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: accentGrad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${accentColor}40` }}>
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--ink)", letterSpacing: "0.01em" }}>{title}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--ink-soft)", marginTop: 2, letterSpacing: "0.1em" }}>LOCBANK_v1.0 · SECURE SESSION</div>
          </div>
        </div>

        {progress !== undefined && (
          <div style={{ marginBottom: 16 }}>
            <div className="neo-progress-track">
              <div className="neo-progress-fill" style={{ width: `${progress}%`, background: accentGrad }} />
            </div>
          </div>
        )}

        {fields.map(f => renderField(f, accentColor))}
      </div>
    </div>
  );
};

export default FormVisualization;
