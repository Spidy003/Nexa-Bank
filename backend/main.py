import base64
import json
import math
import os
import random
import re
import time
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# ── GEMINI INITIALIZATION ─────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI(title="LOC Banking Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── session persistence ──
SESSION_FILE = "sessions.json"
def load_sessions():
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r") as f: return json.load(f)
        except: return {}
    return {}

def save_sessions(data):
    try:
        with open(SESSION_FILE, "w") as f: 
            # We must handle the potential issue of being mid-reload
            json.dump(data, f)
    except: pass

sessions: dict = load_sessions()
accounts_db: list = []

# ── models ────────────────────────────────────────────────────────────────────
class InputRequest(BaseModel):
    session_id: str
    text: str

class UploadRequest(BaseModel):
    session_id: str
    field: str
    image: str # base64 string

class UploadResponse(BaseModel):
    status: str
    message: str

class EngineResponse(BaseModel):
    speak: str
    field: Optional[str] = None
    value: Optional[str] = None
    error: Optional[bool] = None
    final: Optional[bool] = None
    validation_result: Optional[str] = None
    form_data: Optional[dict] = None
    intent: Optional[str] = None
    section: Optional[str] = None
    progress: Optional[int] = None
    documents: Optional[list] = None

# ── helpers ───────────────────────────────────────────────────────────────────
def title_case(s: str) -> str:
    return " ".join(w.capitalize() for w in s.split())

def yes_no(t: str) -> Optional[bool]:
    if re.search(r"yes|yeah|yep|sure|correct|right|ok|okay|affirmative|proceed|go ahead|confirm", t, re.I):
        return True
    if re.search(r"no|nah|nope|don't|dont|negative|skip|not|none", t, re.I):
        return False
    return None

def validate_aadhaar(t: str) -> Optional[str]:
    d = re.sub(r"\D", "", t)
    return d if len(d) == 12 else None

def validate_pan(t: str) -> Optional[str]:
    p = re.sub(r"\s", "", t).upper()
    return p if re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", p) else None

def validate_mobile(t: str) -> Optional[str]:
    d = re.sub(r"\D", "", t)
    return d if len(d) == 10 else None

def validate_pin(t: str) -> Optional[str]:
    d = re.sub(r"\D", "", t)
    return d if len(d) == 6 else None

def validate_card(t: str) -> Optional[str]:
    d = re.sub(r"\D", "", t)
    return d if len(d) == 16 else None

def validate_cvv(t: str) -> Optional[str]:
    d = re.sub(r"\D", "", t)
    return d if len(d) == 3 else None

def validate_email(t: str) -> Optional[str]:
    e = t.strip().lower()
    return e if re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", e) else None

def gen_account() -> str:
    return "LOC" + str(random.randint(100000000, 999999999))

def gen_otp() -> str:
    return str(random.randint(1000, 9999))

def gen_ref() -> str:
    s = str(int(time.time()))
    return "GRV" + s[-8:] if len(s) >= 8 else s

SERVICE_OTPS = {
    "ACCOUNT_OPENING": "4567",
    "FUND_TRANSFER": "8822",
    "BALANCE_CHECK": "1122",
    "LOAN_INQUIRY": "3344",
    "CARD_SERVICE": "5566",
    "FIXED_DEPOSIT": "7788",
    "CHEQUE_SERVICE": "9900",
    "ACCOUNT_CLOSURE": "1010",
    "GRIEVANCE": "2020",
}

ACCOUNT_STEPS = [
    "ACC_TYPE","ACC_SALUTATION","ACC_FIRST_NAME","ACC_MIDDLE_NAME","ACC_LAST_NAME",
    "ACC_DOB","ACC_GENDER","ACC_MARITAL_STATUS","ACC_FATHER_SPOUSE_NAME",
    "ACC_NATIONALITY","ACC_OCCUPATION","ACC_ANNUAL_INCOME","ACC_SOURCE_OF_FUNDS",
    "ACC_PAN","ACC_AADHAAR","ACC_AADHAAR_PHOTO","ACC_CUSTOMER_PHOTO",
    "ACC_MOBILE","ACC_EMAIL",
    "ACC_ADDRESS_LINE1","ACC_ADDRESS_CITY","ACC_ADDRESS_STATE","ACC_ADDRESS_PIN",
    "ACC_CORR_SAME",
    "ACC_NOMINEE_NAME","ACC_NOMINEE_RELATION","ACC_NOMINEE_DOB",
    "ACC_ID_TYPE","ACC_ID_NUMBER",
    "ACC_SERVICES_ATM","ACC_SERVICES_CHEQUE","ACC_SERVICES_MOBILE_BANKING","ACC_SERVICES_SMS",
    "ACC_INITIAL_DEPOSIT","ACC_OTP","ACC_CONFIRM",
]

def get_progress(state: str) -> int:
    try:
        idx = ACCOUNT_STEPS.index(state)
        return round(idx / len(ACCOUNT_STEPS) * 100)
    except ValueError:
        return 0

def get_section(state: str) -> str:
    if state.startswith("ACC_SERVICES"): return "Services Required"
    if state.startswith("ACC_NOMINEE"): return "Nominee Details"
    if state.startswith("ACC_CORR"): return "Correspondence Address"
    if state.startswith("ACC_ADDRESS"): return "Address Details"
    if state in ("ACC_PAN","ACC_AADHAAR","ACC_ID_TYPE","ACC_ID_NUMBER"): return "KYC Documents"
    if state in ("ACC_MOBILE","ACC_EMAIL"): return "Contact Details"
    if state in ("ACC_OTP","ACC_CONFIRM"): return "Verification"
    if state == "ACC_INITIAL_DEPOSIT": return "Deposit"
    if state in ACCOUNT_STEPS: return "Personal Details"
    return "Application"

def doc_status(data: dict) -> list:
    docs = []
    docs.append({"name":"PAN Card","status":"verified" if data.get("pan") else "pending"})
    docs.append({"name":"Aadhaar Card","status":"verified" if data.get("aadhaar") else "pending"})
    if data.get("idType") and data.get("idNumber"):
        docs.append({"name": data["idType"], "status":"collected"})
    if data.get("addressLine1"):
        docs.append({"name":"Address Proof","status":"collected"})
    return docs

def local_extract(text: str, state: str) -> dict:
    t = text.lower().strip()
    # Strip common conversational noise
    t = re.sub(r"^(my|his|her|the)\s+(middle|last|first|full)?\s*name\s+(is|was|will\s+be)\s+", "", t)
    t = re.sub(r"^(it's|its|it\s+is|this\s+is)\s+", "", t)
    t = t.strip()

    words = t.split()
    if len(words) > 20: return {} # Skip extremely long complex sentences
    
    res = {}
    print(f"\n[AURA ENGINE] Input: '{t}' | State: {state}")

    # Card & CVV Extraction
    if "card" in t or "number" in t or "cvv" in t or "BAL_" in state:
        digits = re.sub(r"\D", "", t)
        if len(digits) == 16: res["cardNumber"] = digits
        elif len(digits) == 3: res["cvv"] = digits

    if t == "skip" or t == "skip this step":
        # Map state to field for common steps
        f_map = {
            "ACC_MIDDLE_NAME":"middleName", "ACC_AADHAAR_PHOTO":"aadhaarFrontPhoto", 
            "ACC_CUSTOMER_PHOTO":"customerPhoto", "ACC_NOMINEE_NAME":"nomineeName",
            "ACC_INITIAL_DEPOSIT":"initialDeposit"
        }
        if state in f_map: 
            print(f" -> Skipping current field: {f_map[state]}")
            return {f_map[state]: "skip"}

    # 1. PAN Pattern (ABCDE1234F)
    pan_match = re.search(r"([A-Z]{5}[0-9]{4}[A-Z])", t.upper().replace(" ", ""))
    if pan_match: 
        res["pan"] = pan_match.group(1)
        print(f" -> Local PAN: {res['pan']}")

    # 2. Aadhaar Pattern (12 digits)
    aadhaar_match = re.search(r"(\d{12})", t.replace(" ", ""))
    if aadhaar_match: 
        res["aadhaar"] = aadhaar_match.group(1)
        print(f" -> Local Aadhaar: {res['aadhaar']}")

    # 3. IFSC Pattern (4 alpha, 0, 6 alpha/numeric)
    ifsc_match = re.search(r"([A-Z]{4}0[A-Z0-9]{6})", t.upper().replace(" ", ""))
    if ifsc_match:
        res["ftIfsc"] = ifsc_match.group(1)
        print(f" -> Local IFSC: {res['ftIfsc']}")

    # 4. Account Number Pattern (11-16 digits)
    acc_match = re.search(r"(\d{11,16})", t.replace(" ", ""))
    if acc_match:
        f = "ftBeneficiaryAccount" if "FT_" in state else "accountNumber"
        res[f] = acc_match.group(1)
        print(f" -> Local Account: {res[f]}")

    # 5. Mobile Pattern (10 digits)
    mobile_match = re.search(r"(\d{10})", t.replace(" ", ""))
    if mobile_match:
        res["mobile"] = mobile_match.group(1)
        print(f" -> Local Mobile: {res['mobile']}")

    # 4. Date Pattern (DD/MM/YYYY or DD Month YYYY)
    date_field = "dob" if "NOMINEE" not in state else "nomineeDob"
    # Format: DD/MM/YYYY
    d_match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", t)
    if d_match:
        d, m, y = d_match.groups()
        res[date_field] = f"{d.zfill(2)}/{m.zfill(2)}/{y}"
        print(f" -> Local Date: {res[date_field]}")
    else:
        # Format: DD Month YYYY
        m_map = {"jan":"01","feb":"02","mar":"03","apr":"04","may":"05","jun":"06","jul":"07","aug":"08","sep":"09","oct":"10","nov":"11","dec":"12"}
        for m_name, m_num in m_map.items():
            if m_name in t:
                nums = re.findall(r"\d+", t)
                if len(nums) >= 2:
                    d = nums[0].zfill(2)
                    y = nums[-1]
                    res[date_field] = f"{d}/{m_num}/{y}"
                    print(f" -> Local Date (Month): {res[date_field]}")
                    break

    # 5. Income Pattern (Aggressive number capture)
    if state in ("ACC_ANNUAL_INCOME", "FT_AMOUNT") or "INCOME" in t.upper() or (len(words) == 1 and t.isdigit() and len(t) >= 4):
        clean_t = t.replace(",", "")
        num_part = re.search(r"(\d+(\.\d+)?)", clean_t)
        if num_part:
            val = float(num_part.group(1))
            if "lac" in clean_t or "lakh" in clean_t: val *= 100000
            elif "k" in clean_t: val *= 1000
            elif "m" in clean_t: val *= 1000000
            f = "ftAmount" if "FT_" in state else "annualIncome"
            res[f] = str(int(val))
            print(f" -> Local Numeric/Amount: {res[f]}")

    # 6. PIN Code (6 digits)
    if "PIN" in state or "PIN" in t.upper() or (len(words) == 1 and t.isdigit() and len(t) == 6):
        digits = re.sub(r"\D", "", t)
        if len(digits) == 6:
            f = "addressPin" if "CORR" not in state else "corrPin"
            res[f] = digits
            print(f" -> Local PIN: {res[f]}")

    # 7. Name handling (State Specific)
    if state in ("ACC_FIRST_NAME", "ACC_MIDDLE_NAME", "ACC_LAST_NAME", "ACC_FATHER_SPOUSE_NAME", "ACC_NOMINEE_NAME", "cardName", "FT_BENEFICIARY_NAME"):
        if 1 <= len(words) <= 4 and "skip" not in t and not any(char.isdigit() for char in t):
            full_f_map = {
                "ACC_FIRST_NAME":"firstName", "ACC_MIDDLE_NAME":"middleName", "ACC_LAST_NAME":"lastName", 
                "ACC_FATHER_SPOUSE_NAME":"fatherSpouseName", "ACC_NOMINEE_NAME":"nomineeName", 
                "cardName":"cardName", "FT_BENEFICIARY_NAME":"ftBeneficiaryName"
            }
            res[full_f_map[state]] = title_case(t)
            print(f" -> Local Name: {res[full_f_map[state]]}")

    # 8. City/State
    if state in ("ACC_ADDRESS_CITY", "ACC_ADDRESS_STATE", "ACC_CORR_CITY", "ACC_CORR_STATE"):
        if 1 <= len(words) <= 3 and not any(char.isdigit() for char in t):
            f_map = { "ACC_ADDRESS_CITY":"addressCity", "ACC_ADDRESS_STATE":"addressState", "ACC_CORR_CITY":"corrCity", "ACC_CORR_STATE":"corrState" }
            res[f_map[state]] = title_case(t)
            print(f" -> Local Location: {res[f_map[state]]}")

    # 9. Services & Account Type
    y_n = yes_no(t)
    if y_n is not None:
        f_map = { "ACC_SERVICES_ATM":"wantsATM", "ACC_SERVICES_CHEQUE":"wantsChequeBook", "ACC_SERVICES_MOBILE_BANKING":"wantsMobileBanking", "ACC_SERVICES_SMS":"wantsSMS", "ACC_CORR_SAME":"corrSameAddress" }
        if state in f_map: 
            res[f_map[state]] = "Yes" if y_n else "No"
            print(f" -> Local Service: {res[f_map[state]]}")
    
    if "saving" in t: res["accountType"] = "Savings"
    elif "current" in t: res["accountType"] = "Current"
    elif "bsbda" in t: res["accountType"] = "BSBDA"
    
    # 10. Fixed Choice Enums
    if state == "ACC_SALUTATION":
        if re.search(r"\b(mr|mister)\b", t): res["salutation"] = "Mr"
        elif re.search(r"\b(mrs|missus)\b", t): res["salutation"] = "Mrs"
        elif re.search(r"\b(ms|miss)\b", t): res["salutation"] = "Ms"
        elif re.search(r"\b(dr|doctor)\b", t): res["salutation"] = "Dr"
    
    if state == "ACC_GENDER":
        if "female" in t: res["gender"] = "Female"
        elif "male" in t: res["gender"] = "Male"
        elif "Other" in t or "other" in t: res["gender"] = "Other"

    if state == "ACC_OCCUPATION":
        if "service" in t: res["occupation"] = "Service"
        elif "business" in t: res["occupation"] = "Business"
        elif "student" in t: res["occupation"] = "Student"
        elif "retired" in t: res["occupation"] = "Retired"
    
    if state == "ACC_SOURCE_OF_FUNDS" or "BUSINESS" in t.upper() or "SALARY" in t.upper():
        if "salary" in t: res["sourceOfFunds"] = "Salary"
        elif "business" in t: res["sourceOfFunds"] = "Business"
        elif "pension" in t: res["sourceOfFunds"] = "Pension"

    if state == "ACC_NATIONALITY":
        if "indian" in t: res["nationality"] = "Indian"
    
    if state == "ACC_ID_TYPE":
        if "passport" in t: res["idType"] = "Passport"
        elif "voter" in t: res["idType"] = "Voter ID"
        elif "driving" in t or "licence" in t: res["idType"] = "Driving Licence"

    if state == "ACC_MARITAL_STATUS":
        if "unmarried" in t or "single" in t: res["maritalStatus"] = "Unmarried"
        elif "married" in t: res["maritalStatus"] = "Married"
    
    if state == "ACC_CORR_SAME":
        if y_n is not None: res["corrSameAddress"] = "Yes" if y_n else "No"

    if "otp" in state.upper() or state == "ACC_OTP":
        digits = re.sub(r"\D", "", t)
        if len(digits) == 4: res["otpValue"] = digits

    if state == "FT_TYPE":
        if "neft" in t: res["ftType"] = "NEFT"
        elif "imps" in t: res["ftType"] = "IMPS"
        elif "rtgs" in t or "rtgf" in t or "rtg" in t: res["ftType"] = "RTGS"

    return res

# ── GEMINI AI CORE ──────────────────────────────────────────────────────────
class AuraAI:
    @staticmethod
    def detect_intent(text: str) -> str:
        prompt = f"""
        Classify the user intent into one of:
        [ACCOUNT_OPENING, FUND_TRANSFER, GRIEVANCE, CHECK_BALANCE, LOAN_INQUIRY, CARD_SERVICE, FIXED_DEPOSIT, CHEQUE_SERVICE, ACCOUNT_CLOSURE, GENERAL_QUERY, THEME_CHANGE, LANGUAGE_CHANGE, UNKNOWN]
        Output ONLY the precise intent string. Do not output anything else.
        User input: "{text}"
        """
        for attempt in range(2):
            try:
                res = model.generate_content(prompt).text.strip().upper()
                res_clean = res.replace("_", "").replace(" ", "")
                allowed_intents = ["ACCOUNT_OPENING", "FUND_TRANSFER", "GRIEVANCE", "LOAN_INQUIRY", "CARD_SERVICE", "FIXED_DEPOSIT", "CHEQUE_SERVICE", "ACCOUNT_CLOSURE", "GENERAL_QUERY", "THEME_CHANGE", "LANGUAGE_CHANGE", "UNKNOWN"]
                for allowed in allowed_intents:
                    if allowed.replace("_", "") in res_clean: return allowed
                if "BALANCE" in res_clean: return "BALANCE_CHECK"
            except Exception as e:
                if "429" in str(e): return "The banking system is currently receiving high traffic. Please wait a few seconds."
                if attempt == 1: return f"ERROR: {e}"
                time.sleep(1.5)
        return "UNKNOWN"

    @staticmethod
    def extract_fields(text: str, flow: str, expected_keys: list, existing_data: dict) -> dict:
        prompt = f"""
        Extract the following fields for the {flow} process if they exist in the text:
        {", ".join(expected_keys)}
        
        Previous Data: {json.dumps(existing_data)}
        User Input: "{text}"
        
        CRITICAL RULES:
        - Correct spelling errors before extracting.
        - Map colloquial terms to professional values (e.g. if field is gender: 'boy'/'man'/'male' maps to 'Male', 'girl'/'woman' maps to 'Female').
        - If a user corrects a previous value, use the new corrected value.
        Return ONLY valid JSON mapping exactly the requested keys to their extracted string values. If a field is not found or cannot be determined reliably, omit it from the JSON. Do not return code blocks, just raw JSON.
        """
        for attempt in range(2):
            try:
                res = model.generate_content(prompt).text.strip()
                if res.startswith("```"):
                    res = res.split("\n", 1)[1]
                if res.endswith("```"):
                    res = res.rsplit("\n", 1)[0]
                parsed = json.loads(res.strip())
                return {k: v for k, v in parsed.items() if v and str(v).lower() != "null"}
            except Exception as e:
                if attempt == 1:
                    print(f"Gemini Extract Error: {e}")
                    return {}
                time.sleep(1.5)

    @staticmethod
    def generate_response(instruction: str, context: Optional[dict] = None) -> str:
        lang = context.get("language", "English") if context else "English"
        context_str = json.dumps(context) if context else "{}"
        prompt = f"""
        Generate a short, friendly, and professional conversational banking assistant response (no more than 2 sentences).
        IMPORTANT: Your entire response must be translated and spoken natively in exactly {lang}.
        Instruction: {instruction}
        Context: {context_str}
        Output exactly the spoken response string, no quotes.
        """
        for attempt in range(2):
            try:
                res = model.generate_content(prompt).text.strip().replace('"', '').replace('*', '')
                return res
            except Exception as e:
                if "429" in str(e): return "The banking system is currently busy. Please wait a moment."
                if attempt == 1: return f"ERROR: {e}"
                time.sleep(1.5)
        return "Internal Error: Please try again."

    @staticmethod
    def translate_static(text: str, lang: str) -> str:
        """Translates a static prompt only if necessary."""
        if not lang or lang == "English": return text
        prompt = f"Translate this banking prompt into natural {lang}. Keep it short and formal. Text: {text}"
        try:
            res = model.generate_content(prompt).text.strip().replace('"', '')
            return res
        except:
            return text

def get_static_response(step: str, context: Optional[dict] = None) -> str:
    templates = {
        "ACC_TYPE": "Would you like to open a Savings, Current, or BSBDA account?",
        "ACC_SALUTATION": "Please provide your salutation (Mr, Mrs, Ms, or Dr).",
        "ACC_FIRST_NAME": "What is your first name?",
        "ACC_MIDDLE_NAME": "What is your middle name? You can say 'skip' if you don't have one.",
        "ACC_LAST_NAME": "What is your last name?",
        "ACC_DOB": "Please provide your date of birth (DD/MM/YYYY). For example, 15th January 1990.",
        "ACC_GENDER": "What is your gender? (Male, Female, or Other).",
        "ACC_MARITAL_STATUS": "Are you married or unmarried?",
        "ACC_FATHER_SPOUSE_NAME": "Please provide your father's or spouse's full name.",
        "ACC_NATIONALITY": "What is your nationality? (e.g., Indian).",
        "ACC_OCCUPATION": "What is your occupation? (Service, Business, Student, Retired, etc.)",
        "ACC_ANNUAL_INCOME": "What is your approximate annual income?",
        "ACC_SOURCE_OF_FUNDS": "What is your primary source of funds? (Salary, Business, Pension, etc.)",
        "ACC_PAN": "Please provide your 10-character PAN number for KYC verification.",
        "ACC_AADHAAR": "Please provide your 12-digit Aadhaar number for e-KYC.",
        "ACC_AADHAAR_PHOTO": "Please position your Aadhaar card in the camera frame and say 'CLICK' to capture.",
        "ACC_CUSTOMER_PHOTO": "Finally, look into the camera for your identity photo and say 'CLICK'.",
        "ACC_MOBILE": "What is your 10-digit registered mobile number?",
        "ACC_EMAIL": "Please provide your email address, or say 'skip'.",
        "ACC_ADDRESS_LINE1": "What is your current residential address line 1?",
        "ACC_ADDRESS_CITY": "In which city do you currently reside?",
        "ACC_ADDRESS_STATE": "In which state is that city located?",
        "ACC_ADDRESS_PIN": "What is your 6-digit residential PIN code?",
        "ACC_CORR_SAME": "Is your correspondence address the same as your current address? (Yes or No).",
        "ACC_CORR_ADDRESS": "Please provide your correspondence address line 1.",
        "ACC_CORR_CITY": "What is your correspondence city?",
        "ACC_CORR_STATE": "What is your correspondence state?",
        "ACC_CORR_PIN": "What is your correspondence PIN code?",
        "ACC_NOMINEE_NAME": "Please provide the full name of your account nominee.",
        "ACC_NOMINEE_RELATION": "What is your relationship to the nominee?",
        "ACC_NOMINEE_DOB": "What is the nominee's date of birth?",
        "ACC_ID_TYPE": "Which official document would you like to use for identity? (Passport, Voter ID, Driving Licence, etc.)",
        "ACC_ID_NUMBER": "Please provide the number of that specific identification document.",
        "ACC_SERVICES_ATM": "Would you like an ATM or Debit card? (Yes or No).",
        "ACC_SERVICES_CHEQUE": "Would you like a cheque book? (Yes or No).",
        "ACC_SERVICES_MOBILE_BANKING": "Would you like a mobile banking enabled? (Yes or No).",
        "FT_AMOUNT": "How much would you like to transfer?",
        "FT_MOBILE": "For security, please provide your 10-digit registered mobile number.",
    }
    
    msg = templates.get(step, "Proceeding to the next step. Could you provide the requested details?")
    
    # Custom tweaks for specific fields
    if step == "ACC_FATHER_SPOUSE_NAME":
        m_status = context.get("maritalStatus", "").lower() if context else ""
        if "married" in m_status and "un" not in m_status:
           msg = "Since you are married, please provide your spouse's full name."
        else:
           msg = "Please provide your father's full name."
    
    # ── TRANSLATION LAYER ──
    lang = context.get("language", "English") if context else "English"
    if lang != "English":
        return AuraAI.translate_static(msg, lang)
        
    return msg

# ── MAIN ENGINE ──────────────────────────────────────────────────────────────
def process_input(session_id: str, text: str) -> dict:
    t = text.lower().strip()
    
    # 1. Initialize or get session
    if session_id not in sessions:
        sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
    sess = sessions[session_id]
    
    # 3. Standard processing variables
    data = sess["data"]
    state = sess["state"]
    intent = sess.get("intent", "UNKNOWN")
    lang = data.get("language", "English")

    # 2. EMERGENCY LOCAL BYPASS (Before ANY AI logic)
    if re.search(r"test camera|verify camera|capture screen", t):
        sess["intent"] = "ACCOUNT_OPENING"
        sess["state"] = "ACC_AADHAAR_PHOTO"
        msg = "Camera Test Mode active. Please position your document and say 'CLICK'."
        return {"speak": AuraAI.translate_static(msg, lang), "field": "aadhaarFrontPhoto", "intent": "ACCOUNT_OPENING", "section": "KYC Documents"}

    if re.search(r"start over|reset|cancel|go back|main menu", t):
        sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
        save_sessions(sessions)
        msg = "Back to main menu. How can I assist you today?"
        return {"speak": AuraAI.translate_static(msg, lang), "form_data": {}}

    # 4. State-Specific Local Bypass (Prevents 429 during flows)
    local_match = local_extract(text, state)
    if local_match:
        data.update(local_match)
        # We don't return yet; let the state machine handle the NEXT step
    elif state == "IDLE":
        # Check for simple intent keywords locally
        lang = data.get("language", "English")
        if "card" in t:
            sess["intent"] = "CARD_SERVICE"
            sess["state"] = "CARD_ACTION"
            return {"speak": AuraAI.translate_static("Card services. Would you like to apply for a new card, block an existing one, or check card status?", lang), "field": "cardAction", "intent": "CARD_SERVICE"}
        if "balance" in t:
            sess["intent"] = "BALANCE_CHECK"
            sess["state"] = "BAL_CARD_NUMBER"
            return {"speak": AuraAI.translate_static("I'll help you check your account balance. For security, please provide your 16-digit card number.", lang), "field": "cardNumber", "intent": "BALANCE_CHECK"}
        if "loan" in t:
            sess["intent"] = "LOAN_INQUIRY"
            sess["state"] = "LOAN_TYPE"
            return {"speak": AuraAI.translate_static("What type of loan are you interested in: Home, Personal, or Car?", lang), "field": "loanType", "intent": "LOAN_INQUIRY"}
        if "transfer" in t or "pay" in t:
            sess["intent"] = "FUND_TRANSFER"
            sess["state"] = "FT_TYPE"
            return {"speak": AuraAI.translate_static("Let's transfer funds. NEFT, IMPS, or RTGS?", lang), "field": "ftType", "intent": "FUND_TRANSFER"}
        if re.search(r"open.*account", t):
            sess["intent"] = "ACCOUNT_OPENING"
            sess["state"] = "ACC_TYPE"
            return {"speak": AuraAI.translate_static("Welcome! Would you like to open a Savings or Current account?", lang), "field": "accountType", "intent": "ACCOUNT_OPENING"}

    # 5. Intent Detection (Fallthrough to AI - ONLY in IDLE)
    if state == "IDLE":
        intent = AuraAI.detect_intent(text)
        sess["intent"] = intent

        lang = data.get("language", "English")
        if intent == "ACCOUNT_OPENING":
            sess["state"] = "ACC_TYPE"
            return {"speak": AuraAI.translate_static("Welcome to LOC Bank's digital account opening. I'll help you set up your account in minutes. Would you like a Savings, Current, or BSBDA account?", lang),
                    "field": "accountType", "intent": intent, "section": "Account Type", "progress": 0}

        if intent == "BALANCE_CHECK":
            sess["state"] = "BAL_ACCOUNT"
            return {"speak": AuraAI.translate_static("I can help with your balance inquiry. Please provide your card or account details to begin.", lang), "field": "accountNumber", "intent": intent}

        if intent == "LOAN_INQUIRY":
            sess["state"] = "LOAN_TYPE"
            return {"speak": AuraAI.translate_static("Searching for the best loan options for you. What type of loan are you interested in: Home, Personal, Car, or Education?", lang), "field": "loanType", "intent": intent, "section": "Loan Type"}

        if intent == "FUND_TRANSFER":
            sess["state"] = "FT_TYPE"
            return {"speak": AuraAI.translate_static("Let's get that transfer started. Would you like to use NEFT, IMPS, or RTGS?", lang), "field": "ftType", "intent": intent}
        
        if intent == "GRIEVANCE":
            sess["state"] = "GRIEV_TYPE"
            return {"speak": AuraAI.translate_static("I'm sorry to hear you're facing an issue. Is this related to a Service issue, Transaction dispute, or Card issue?", lang), "field": "grievanceType", "intent": intent}

        if intent == "THEME_CHANGE":
            res = AuraAI.extract_fields(text, "Theme Selection", ["themeChoice"], data)
            choice = str(res.get("themeChoice", "")).lower()
            val = "light" if "light" in choice or "white" in choice else "dark"
            msg = f"Understood. I'm switching the interface to {val} mode for you now."
            return {"speak": AuraAI.translate_static(msg, lang), "intent": intent, "field": "theme", "value": val}

        if intent == "LANGUAGE_CHANGE":
            res = AuraAI.extract_fields(text, "Language Selection", ["languageChoice"], data)
            choice = str(res.get("languageChoice", "")).lower()
            if "hindi" in choice: 
                val = "hi-IN"; lang_str = "Hindi"; confirm_msg = "नमस्ते! अब मैं आपसे हिंदी में बात करूँगा।"
            elif "marathi" in choice: 
                val = "mr-IN"; lang_str = "Marathi"; confirm_msg = "नमस्कार! आता मी तुमच्याशी मराठीत बोलेन।"
            else: 
                val = "en-IN"; lang_str = "English"; confirm_msg = "Understood. Switching to English now."
            data["language"] = lang_str
            return {"speak": confirm_msg, "intent": intent, "field": "language", "value": val}

        lang = data.get("language", "English")
        if intent == "CARD_SERVICE":
            sess["state"] = "CARD_ACTION"
            return {"speak": AuraAI.translate_static("Card services. Would you like to apply for a new card, block an existing one, or check card status?", lang), "field": "cardAction", "intent": intent}

        if intent == "FIXED_DEPOSIT":
            sess["state"] = "FD_AMOUNT"
            return {"speak": AuraAI.translate_static("Let's set up your Fixed Deposit. What amount?", lang), "field": "fdAmount", "intent": intent, "section": "Fixed Deposit"}

        if intent == "CHEQUE_SERVICE":
            sess["state"] = "CHQ_ACTION"
            return {"speak": AuraAI.translate_static("Cheque services — request cheque book or stop payment?", lang), "field": "chequeAction", "intent": intent}

        if intent == "ACCOUNT_CLOSURE":
            sess["state"] = "CLOSE_ACCOUNT_NUM"
            return {"speak": AuraAI.translate_static("Please provide the account number you wish to close.", lang), "field": "closeAccount", "intent": intent}

        if intent == "GENERAL_QUERY":
            return {"speak": AuraAI.translate_static("I can assist you with Account Opening, Balance Checks, Loans, Card Services, Fixed Deposits, Fund Transfers, and more. What would you like to do?", lang)}

        return {"speak": AuraAI.translate_static("I apologize, I didn't quite catch that. You can ask me to open an account, check your balance, or apply for a loan. How can I help you?", lang), "intent": "UNKNOWN"}

    # Update local vars for non-IDLE state processing
    state = sess["state"]
    intent = sess.get("intent", "UNKNOWN")

    # ── ACCOUNT OPENING (MULTI-FIELD GEMINI EXTRACTION) ──
    if intent == "ACCOUNT_OPENING" and state != "ACC_CONFIRM" and state != "ACC_OTP":
        expected_fields = [
            "accountType", "salutation", "firstName", "middleName", "lastName", "dob", "gender", "maritalStatus", 
            "fatherSpouseName", "nationality", "occupation", "annualIncome", "sourceOfFunds", "pan", "aadhaar", 
            "mobile", "email", "addressLine1", "addressCity", "addressState", "addressPin", "nomineeName", 
            "nomineeRelation", "nomineeDob", "idType", "idNumber", "wantsATM", "wantsChequeBook", "wantsMobileBanking", 
            "wantsSMS", "initialDeposit", "corrSameAddress", "corrAddress", "corrCity", "corrState", "corrPin"
        ]
        
        # Super-Extraction! Gemini grabs everything the user just said in context with their older answers.
        # FIRST: Try local extraction for simple keywords
        if not local_match:
            # FALLBACK: Use AI for complex extraction or if no local match
            extracted = AuraAI.extract_fields(text, "Account Opening", expected_fields, data)
            data.update(extracted)
        
        if "lastName" in data and "firstName" in data:
            data["fullName"] = " ".join(filter(None, [data.get("salutation"), data.get("firstName"), data.get("middleName"), data.get("lastName")]))
        
        # VALIDATION LAYER
        lang = data.get("language", "English")
        if "pan" in data and not validate_pan(data["pan"]): 
            del data["pan"]
            return {"speak": AuraAI.translate_static("The PAN number you provided seems invalid. It should be 10 characters (5 letters, 4 digits, 1 letter). Please try again.", lang), "field": "pan", "error": True, "validation_result": "invalid"}
        if "aadhaar" in data and not validate_aadhaar(data["aadhaar"]): 
            del data["aadhaar"]
            return {"speak": AuraAI.translate_static("That Aadhaar number is invalid. Please provide exactly 12 digits.", lang), "field": "aadhaar", "error": True, "validation_result": "invalid"}
        if "mobile" in data and not validate_mobile(data["mobile"]): 
            del data["mobile"]
            return {"speak": "The mobile number must be exactly 10 digits. Please provide a valid one.", "field": "mobile", "error": True, "validation_result": "invalid"}
        if "email" in data and not validate_email(data["email"]) and data["email"].lower() != "skip": 
            del data["email"]
            # Try to get static error if possible, or use AI
            return {"speak": "That email format doesn't look right. Please provide a valid email address or say 'skip'.", "field": "email", "error": True, "validation_result": "invalid"}

        # DYNAMIC JUMP ENGINE: Find first missing step
        step_map = {
            "ACC_TYPE": ("accountType", "Ask what kind of account they want (Savings, Current, BSBDA)."),
            "ACC_SALUTATION": ("salutation", "Ask for their salutation (Mr, Mrs, Ms, Dr)."),
            "ACC_FIRST_NAME": ("firstName", "Ask for their first name."),
            "ACC_MIDDLE_NAME": ("middleName", "Ask if they have a middle name (or to say skip)."),
            "ACC_LAST_NAME": ("lastName", "Ask for their last name."),
            "ACC_DOB": ("dob", "Ask for their date of birth. Give a brief example of the format, such as 'For example, 15th January 1990'."),
            "ACC_GENDER": ("gender", "Ask for their gender (Male, Female,  Other)."),
            "ACC_MARITAL_STATUS": ("maritalStatus", "Ask for their marital status (Married, Unmarried, Others)."),
            "ACC_FATHER_SPOUSE_NAME": ("fatherSpouseName", "Ask for their spouse or father's full name based on marital status."),
            "ACC_NATIONALITY": ("nationality", "Ask for their nationality (Indian or others)."),
            "ACC_OCCUPATION": ("occupation", "Ask for their occupation (Service, Business, Student, Retired, etc)."),
            "ACC_ANNUAL_INCOME": ("annualIncome", "Ask for their estimated annual income."),
            "ACC_SOURCE_OF_FUNDS": ("sourceOfFunds", "Ask for their expected source of funds (Salary, Business, Pension, etc)."),
            "ACC_PAN": ("pan", "Ask for their 10-character PAN number for KYC."),
            "ACC_AADHAAR": ("aadhaar", "Ask for their 12-digit Aadhaar number for e-KYC."),
            "ACC_AADHAAR_PHOTO": ("aadhaarFrontPhoto", "Please position your Aadhaar card in the camera frame and say 'CLICK' to capture."),
            "ACC_CUSTOMER_PHOTO": ("customerPhoto", "Finally, look into the camera for your customer identity photo and say 'CLICK' to capture."),
            "ACC_MOBILE": ("mobile", "Ask for their 10-digit mobile number."),
            "ACC_EMAIL": ("email", "Ask for their email address (or to skip)."),
            "ACC_ADDRESS_LINE1": ("addressLine1", "Ask for their current residential address line 1."),
            "ACC_ADDRESS_CITY": ("addressCity", "Ask what city they live in."),
            "ACC_ADDRESS_STATE": ("addressState", "Ask what state they live in."),
            "ACC_ADDRESS_PIN": ("addressPin", "Ask for their 6-digit PIN code."),
            "ACC_CORR_SAME": ("corrSameAddress", "Ask if their correspondence address is the same as their current address (Yes or No)."),
            "ACC_CORR_ADDRESS": ("corrAddress", "Ask for their correspondence address line 1."),
            "ACC_CORR_CITY": ("corrCity", "Ask for their correspondence city."),
            "ACC_CORR_STATE": ("corrState", "Ask for their correspondence state."),
            "ACC_CORR_PIN": ("corrPin", "Ask for their correspondence PIN code."),
            "ACC_NOMINEE_NAME": ("nomineeName", "Ask for their account nominee's full name."),
            "ACC_NOMINEE_RELATION": ("nomineeRelation", "Ask for the relationship to the nominee (e.g. Spouse, Son, Father)."),
            "ACC_NOMINEE_DOB": ("nomineeDob", "Ask for the nominee's date of birth."),
            "ACC_ID_TYPE": ("idType", "Ask which official document they will use (Passport, Voter ID, Driving Licence, etc)."),
            "ACC_ID_NUMBER": ("idNumber", "Ask for that specific document's number."),
            "ACC_SERVICES_ATM": ("wantsATM", "Ask if they want an ATM/Debit card (Rupay, Visa, Mastercard) or no."),
            "ACC_SERVICES_CHEQUE": ("wantsChequeBook", "Ask if they want a cheque book (Yes or No)."),
            "ACC_SERVICES_MOBILE_BANKING": ("wantsMobileBanking", "Ask if they want Mobile Banking enabled (Yes or No)."),
            "ACC_SERVICES_SMS": ("wantsSMS", "Ask if they want SMS alerts enabled (Yes or No)."),
            "ACC_INITIAL_DEPOSIT": ("initialDeposit", "Ask how much their initial deposit will be (say zero if none).")
        }

        # Logic for Correspondence Override
        if data.get("corrSameAddress", "").lower() in ["yes", "y", "true"]:
            for f in ["corrAddress", "corrCity", "corrState", "corrPin"]:
                data[f] = data.get(f.replace("corr", "address") if f != "corrAddress" else "addressLine1", "Same")

        for step in ACCOUNT_STEPS:
            if step in ["ACC_OTP", "ACC_CONFIRM"]: break
            if step not in step_map: continue
            
            field, instruction = step_map[step]
            if not data.get(field) or data.get(field) == "skip":
                if data.get(field) == "skip":
                    continue # Bypass this step
                
                sess["state"] = step
                # OPTIMIZATION: Use static response for gauntlet steps
                resp = get_static_response(step, context=data)
                return {"speak": resp, "field": field, "form_data": data, "intent": intent, "section": get_section(step), "progress": get_progress(step), "documents": doc_status(data)}
        
        # Inject OTP Step if we cleared the gauntlet
        if not data.get("otpVerified"):
            sess["state"] = "ACC_OTP"
            mob = str(data.get("mobile", ""))
            return {"speak": f"Security Check: Please enter the OTP sent to respective {mob} number.", "field": "otp", "form_data": data, "intent": intent, "section": "Verification", "progress": 90}

    # ── FALLBACK FOR LEGACY ACCOUNT OPENING STEPS ──
    if intent == "ACCOUNT_OPENING":
        if state == "ACC_OTP":
            otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
            if otp_val == SERVICE_OTPS.get(intent):
                data["otpVerified"] = True
                sess["state"] = "ACC_CONFIRM"
                d = data
                confirm_str = f"Verification successful. Let's review: Name {d.get('fullName')}, Account Type {d.get('accountType')}. Say yes to confirm and open your account."
                return {"speak": confirm_str, "field": "confirm", "validation_result": "valid", "form_data": data, "intent": intent, "section": "Confirmation", "progress": 95}
            return {"speak": "Security code mismatch. Please try again.", "field": "otp", "error": True, "validation_result": "invalid"}

        if state == "ACC_CONFIRM":
            if yes_no(t) is True:
                acc_num = "".join([str(random.randint(0,9)) for _ in range(16)])
                data["accountNumber"] = acc_num
                accounts_db.append({**data, "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")})
                sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
                return {"speak": f"Congratulations! Your {data.get('accountType', 'Savings')} account has been successfully created. Your new account number is {acc_num}. Welcome to the LOC Bank family!", 
                        "final": True, "value": acc_num, "field": "success", "form_data": data, "progress": 100, "documents": doc_status(data)}
            sess["state"] = "ACC_FIRST_NAME"
            return {"speak": "No problem. Let's correct details. First name?", "field": "firstName", "section": "Personal Details", "progress": 5}


    # ── FUND TRANSFER (GEMINI INTEGRATION) ──
    if intent == "FUND_TRANSFER" and state != "FT_OTP":
        expected_fields = ["ftType", "ftBeneficiaryName", "ftBeneficiaryAccount", "ftIfsc", "ftAmount", "mobile"]
        extracted = AuraAI.extract_fields(text, "Fund Transfer", expected_fields, data)
        data.update(extracted)

        step_map = {
            "FT_TYPE": ("ftType", "Ask if they want to use NEFT, IMPS, or RTGS."),
            "FT_BENEFICIARY_NAME": ("ftBeneficiaryName", "Ask for the beneficiary's full name."),
            "FT_BENEFICIARY_ACCOUNT": ("ftBeneficiaryAccount", "Ask for the beneficiary's exact account number."),
            "FT_IFSC": ("ftIfsc", "Ask for the exact IFSC code."),
            "FT_AMOUNT": ("ftAmount", "Ask for the transfer amount in numbers."),
            "FT_MOBILE": ("mobile", "For security, please provide the 10-digit mobile number registered with your account.")
        }
        
        for step, (field, instruction) in step_map.items():
            if not data.get(field):
                sess["state"] = step
                # OPTIMIZATION: Use specialized static responses for premium feel
                resp = get_static_response(step, context=data)
                return {"speak": resp, "field": field, "form_data": data, "intent": intent}

        if not data.get("otpVerified"):
            sess["state"] = "FT_OTP"
            mob = str(data.get("mobile", ""))
            return {"speak": f"Security Check: Please enter the OTP sent to respective {mob} number.", "field": "otp", "form_data": data, "intent": intent}

    if intent == "FUND_TRANSFER" and state == "FT_OTP":
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            ref = "TXN" + str(int(time.time()))[-10:]
            return {"speak": f"Verification successful. Your funds have been transferred. Transaction reference is {ref}.", "final": True, "field": "success", "value": ref, "validation_result": "valid", "form_data": data}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "validation_result": "invalid", "error": True}


    # ── BALANCE CHECK (GUIDED FLOW) ──
    if intent == "BALANCE_CHECK":
        lang = data.get("language", "English")
        if not data.get("cardNumber"):
            sess["state"] = "BAL_CARD_NUMBER"
            return {"speak": AuraAI.translate_static("Please provide your 16-digit card number to start.", lang), "field": "cardNumber", "intent": intent}
        
        if data.get("cardNumber") and not validate_card(data["cardNumber"]):
            del data["cardNumber"]
            return {"speak": AuraAI.translate_static("That card number is invalid. It should be exactly 16 digits. Please try again.", lang), "field": "cardNumber", "error": True, "validation_result": "invalid"}

        if not data.get("cvv"):
            sess["state"] = "BAL_CVV"
            return {"speak": AuraAI.translate_static("Now, please enter the 3-digit CVV from the back of your card.", lang), "field": "cvv", "intent": intent}
        
        if data.get("cvv") and not validate_cvv(data["cvv"]):
            del data["cvv"]
            return {"speak": AuraAI.translate_static("Invalid CVV. Please provide the 3 digits found on the back of your card.", lang), "field": "cvv", "error": True, "validation_result": "invalid"}

        if not data.get("mobile"):
            sess["state"] = "BAL_MOBILE"
            return {"speak": AuraAI.translate_static("Thank you. Finally, please provide your 10-digit registered mobile number.", lang), "field": "mobile", "intent": intent}
        
        if data.get("mobile") and not validate_mobile(data["mobile"]):
            del data["mobile"]
            return {"speak": AuraAI.translate_static("The mobile number must be 10 digits. Please try again.", lang), "field": "mobile", "error": True, "validation_result": "invalid"}

        if not data.get("otpVerified"):
            sess["state"] = "BAL_OTP"
            if not t.isdigit() or len(t) != 4:
                return {"speak": AuraAI.translate_static(f"A security code has been sent to your mobile. Please enter the 4-digit OTP to view your balance.", lang), "field": "otp", "intent": intent}
            
            if t == SERVICE_OTPS.get("BALANCE_CHECK"):
                data["otpVerified"] = True
                sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
                return {
                    "speak": AuraAI.translate_static("Verification successful! Fetching your account balance now.", lang),
                    "final": True,
                    "field": "success",
                    "intent": "BALANCE_CHECK",
                    "value": "24500.75"
                }
            else:
                return {"speak": AuraAI.translate_static("Incorrect OTP. Please try again.", lang), "field": "otp", "error": True, "validation_result": "invalid"}

    # ── LEGACY FALLBACK FOR MINOR FLOWS (Loan, Checking, Cards) ─────────────────────────
    # Keeping the original precise handling for other flows since they are very simple.
    if state == "CARD_ACTION":
        # LOCAL BYPASS for card actions
        if "block" in t:
            sess["state"] = "CARD_BLOCK_NUM"
            return {"speak": "I can help block your card. First, please provide your 16-digit card number.", "field": "cardNumber", "section": "Card Block", "form_data": data}
        
        res = AuraAI.extract_fields(t, "Card Service", ["cardAction"], data)
        action = str(res.get("cardAction", t)).lower()
        if "block" in action:
            sess["state"] = "CARD_BLOCK_NUM"
            return {"speak": "I can help block your card. First, please provide your 16-digit card number.", "field": "cardNumber", "section": "Card Block", "form_data": data}
        elif "new" in action or "apply" in action:
            return {"speak": "Applying for a new card is currently under maintenance. Try blocking for now!"}
        return {"speak": "Would you like to block your card or apply for a new one?"}

    if state == "CARD_BLOCK_NUM":
        # Local bypass for 16 digits
        digits = "".join(filter(str.isdigit, t))
        if len(digits) == 16:
            data["cardNumber"] = digits
            sess["state"] = "CARD_BLOCK_NAME"
            return {"speak": "Got it. Now, please enter the Cardholder Name.", "field": "cardName", "section": "Card Block", "form_data": data}
        
        res = AuraAI.extract_fields(t, "Card Block Number", ["cardNumber"], data)
        num = str(res.get("cardNumber", "")).replace(" ", "")
        if len(num) == 16:
            data["cardNumber"] = num
            sess["state"] = "CARD_BLOCK_NAME"
            return {"speak": "Got it. Now, please enter the Cardholder Name.", "field": "cardName", "section": "Card Block", "form_data": data}
        return {"speak": "Please enter a valid 16-digit card number. I cannot proceed without it.", "field": "cardNumber", "form_data": data, "error": True}

    if state == "CARD_BLOCK_NAME":
        # Local fallback - if it looks like a name and not a generic command
        if len(t.strip().split()) >= 1 and not any(k in t.lower() for k in ["help", "what", "how"]):
            data["cardName"] = t.strip().upper()
            sess["state"] = "CARD_BLOCK_EXP_CVV"
            return {"speak": "Finally, please provide the Expiry Date (MM/YY) and CVV code.", "field": "cardExpiry", "section": "Card Block", "form_data": data}

        res = AuraAI.extract_fields(t, "Card Block Name", ["cardName"], data)
        name = str(res.get("cardName", "")).strip()
        if name:
            data["cardName"] = name
            sess["state"] = "CARD_BLOCK_EXP_CVV"
            return {"speak": "Finally, please provide the Expiry Date (MM/YY) and CVV code.", "field": "cardExpiry", "section": "Card Block", "form_data": data}
        return {"speak": "Please provide the Cardholder Name.", "field": "cardName"}

    if state == "CARD_BLOCK_EXP_CVV":
        # Local regex fallback for Expiry (MM/YY) and CVV (3 digits)
        expiry_match = re.search(r'(\d{2}/\d{2})', t)
        cvv_match = re.search(r'(\d{3})', t)
        if expiry_match and cvv_match:
            data["cardExpiry"] = expiry_match.group(1)
            data["cardCvv"] = cvv_match.group(1)
            sess["state"] = "CARD_MOBILE"
            return {"speak": "For your security, please provide the 10-digit mobile number registered with this card.", "field": "mobile", "intent": intent, "form_data": data}

        res = AuraAI.extract_fields(t, "Card Block Expiry CVV", ["cardExpiry", "cardCvv"], data)
        if res.get("cardExpiry") and res.get("cardCvv"):
            data.update(res)
            sess["state"] = "CARD_MOBILE"
            return {"speak": "For your security, please provide the 10-digit mobile number registered with this card.", "field": "mobile", "intent": intent, "form_data": data}
        return {"speak": "Please provide both the Card Expiry and CVV.", "field": "cardExpiry"}

    if state == "CARD_MOBILE":
        digits = str(re.sub(r"\D", "", t))
        if len(digits) == 10:
            data["mobile"] = digits
            sess["state"] = "CARD_OTP"
            return {"speak": f"Security Check: Please enter the OTP sent to respective {digits} number.", "field": "otp", "intent": intent, "form_data": data}
        return {"speak": "Please enter your 10-digit registered mobile number.", "field": "mobile", "error": True, "form_data": data}

    if state == "CARD_OTP":
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sess["state"] = "IDLE"
            num_str = str(data.get("cardNumber", "xxxx"))
            last4 = num_str[-4:] if len(num_str) >= 4 else "xxxx"
            return {"speak": f"Verification successful. Your card ending in {last4} has been securely blocked.", "final": True, "value": "Card Blocked", "field": "success"}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "error": True}
    if state == "FT_DEST_ACCOUNT":
        res = AuraAI.extract_fields(t, "Fund Transfer", ["ftBeneficiaryAccount", "cardName"], data)
        num_str = str(res.get("ftBeneficiaryAccount", "")).replace(" ", "")
        if num_str:
            data.update(res)
            data["ftBeneficiaryAccount"] = num_str
            sess["state"] = "FT_AMOUNT"
            last4 = num_str[-4:] if len(num_str) >= 4 else num_str
            return {"speak": f"Beneficiary account ending in {last4} registered. How much would you like to transfer?", "field": "ftAmount", "intent": intent, "form_data": data}
        return {"speak": "Please provide the beneficiary account or card number.", "field": "ftBeneficiaryAccount", "intent": intent}

    if state == "BAL_ACCOUNT":
        # Capture all details from the Card UI if possible
        res = AuraAI.extract_fields(t, "Balance Check", ["accountNumber", "cardName", "cardExpiry", "cardCvv"], data)
        num = str(res.get("accountNumber", "")).replace(" ", "")
        digits = "".join(filter(str.isdigit, t))
        
        target_num = num if len(num) >= 10 else (digits if len(digits) >= 10 else None)
        
        # If an account/card number was extracted, proceed to Mobile
        if target_num:
            data["accountNumber"] = target_num
            sess["state"] = "BAL_MOBILE"
            return {"speak": "For security, please provide the 10-digit mobile number registered with this account.", "field": "mobile", "intent": intent, "form_data": data}
        
        # If no account number was extracted, prompt again
        return {"speak": "Please enter a valid 16-digit card number or account number.", "field": "accountNumber", "error": True, "form_data": data}

    if state == "BAL_MOBILE":
        digits = str(re.sub(r"\D", "", t))
        if len(digits) == 10:
            data["mobile"] = digits
            sess["state"] = "BAL_OTP"
            return {"speak": f"Security Check: Please enter the OTP sent to respective {digits} number.", "field": "otp", "intent": intent, "form_data": data}
        return {"speak": "Please enter your 10-digit registered mobile number.", "field": "mobile", "error": True, "form_data": data}

    if state == "BAL_OTP":
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            num_obj = data.get("accountNumber", "xxxx")
            num_str = str(num_obj)
            last4 = num_str[-4:] if len(num_str) >= 4 else num_str
            balance = round(random.uniform(5000, 50000))
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            return {"speak": f"Verification successful. The current balance for account ending in {last4} is INR {balance:,}. How else can I help?", "final": True, "field": "success"}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "error": True}

    # ── LOAN, FD, CHQ, CLOSURE ─────────────────────────
    if state == "LOAN_TYPE":
        if any(k in t for k in ["home", "personal", "car", "education"]):
            data["loanType"] = t.title()
            sess["state"] = "LOAN_MOBILE"
            return {"speak": "I can certainly help with that. Please provide your 10-digit registered mobile number for verification.", "field": "mobile", "intent": intent, "form_data": data}
        return {"speak": "What type of loan: Home, Personal, Car, or Education?"}

    if state == "LOAN_MOBILE":
        digits = str(re.sub(r"\D", "", t))
        if len(digits) == 10:
            data["mobile"] = digits
            sess["state"] = "LOAN_OTP"
            return {"speak": f"Security Check: Please enter the OTP sent to respective {digits} number.", "field": "otp", "intent": intent, "form_data": data}
        return {"speak": "Please enter your 10-digit registered mobile number.", "field": "mobile", "error": True, "form_data": data}

    if state == "LOAN_OTP":
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            return {"speak": f"Verification successful. Based on your profile, you are eligible for a {data.get('loanType')} loan of up to 50 Lakhs. A representative will contact you shortly.", "final": True}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "error": True}

    if state == "FD_AMOUNT":
        digits = re.sub(r"\D", "", t)
        if digits:
            data["fdAmount"] = digits
            sess["state"] = "FD_MOBILE"
            return {"speak": f"Fixed Deposit of {digits} initiated. Please enter your mobile number to proceed.", "field": "mobile", "intent": intent, "form_data": data}
        return {"speak": "Please enter the deposit amount."}

    if state == "FD_MOBILE":
        digits = str(re.sub(r"\D", "", t))
        if len(digits) == 10:
            data["mobile"] = digits
            sess["state"] = "FD_OTP"
            return {"speak": f"Security Check: Please enter the OTP sent to respective {digits} number.", "field": "otp", "intent": intent, "form_data": data}
        return {"speak": "Please enter your 10-digit registered mobile number.", "field": "mobile", "error": True, "form_data": data}

    if state == "FD_OTP":
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            return {"speak": f"Verification successful. Your Fixed Deposit of {data.get('fdAmount')} has been created at 7.5% interest.", "final": True}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "error": True}

    if state == "CHQ_ACTION":
        data["chequeAction"] = t
        sess["state"] = "CHQ_MOBILE"
        return {"speak": "To process your cheque request, please provide your 10-digit registered mobile number.", "field": "mobile", "intent": intent, "form_data": data}

    if state == "CHQ_MOBILE":
        digits = str(re.sub(r"\D", "", t))
        if len(digits) == 10:
            data["mobile"] = digits
            sess["state"] = "CHQ_OTP"
            return {"speak": f"Security Check: Please enter the OTP sent to respective {digits} number.", "field": "otp", "intent": intent, "form_data": data}
        return {"speak": "Please enter your 10-digit registered mobile number.", "field": "mobile", "error": True, "form_data": data}

    if state == "CHQ_OTP":
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            return {"speak": "Verification successful. Your cheque service request has been processed.", "final": True}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "error": True}

    if state == "CLOSE_ACCOUNT_NUM":
        data["closeAccountNum"] = t.replace(" ", "")
        sess["state"] = "CLOSE_MOBILE"
        return {"speak": f"Acknowledge closure of account {data['closeAccountNum']}. Please provide your registered mobile number.", "field": "mobile", "intent": intent, "form_data": data}

    if state == "CLOSE_MOBILE":
        digits = str(re.sub(r"\D", "", t))
        if len(digits) == 10:
            data["mobile"] = digits
            sess["state"] = "CLOSE_OTP"
            return {"speak": f"Security Check: Please enter the OTP sent to respective {digits} number.", "field": "otp", "intent": intent, "form_data": data}
        return {"speak": "Please enter your 10-digit registered mobile number.", "field": "mobile", "error": True, "form_data": data}

    if state == "CLOSE_OTP":
        lang = data.get("language", "English")
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            msg = "Verification successful. Your account closure request has been submitted for final review."
            return {"speak": AuraAI.translate_static(msg, lang), "final": True}
        return {"speak": AuraAI.translate_static("Security code mismatch. Try again.", lang), "field": "otp", "error": True}
        
    if state == "GRIEV_TYPE":
        if re.search(r"service", t): data["grievanceType"] = "Service Issue"
        elif re.search(r"transaction|dispute", t): data["grievanceType"] = "Transaction Dispute"
        elif re.search(r"card", t): data["grievanceType"] = "Card Issue"
        else: data["grievanceType"] = title_case(text.strip())
        sess["state"] = "GRIEV_DESCRIPTION"
        return {"speak": AuraAI.generate_response(f"Type is {data['grievanceType']}. Ask them to briefly describe the issue."), "field": "grievanceDesc", "value": data["grievanceType"], "form_data": data, "intent": intent}

    if state == "GRIEV_DESCRIPTION":
        data["grievanceDesc"] = text.strip()
        sess["state"] = "GRIEV_ACCOUNT"
        return {"speak": AuraAI.generate_response("Ask which account number the grievance is related to."), "field": "grievanceAccount", "value": data["grievanceDesc"], "form_data": data, "intent": intent}

    if state == "GRIEV_ACCOUNT":
        data["grievanceAccount"] = t.replace(" ", "")
        sess["state"] = "GRIEV_CONFIRM"
        return {"speak": AuraAI.generate_response(f"Summarize complaint regarding {data['grievanceType']} on account {data['grievanceAccount']}. Ask them to say 'yes' to submit."), "field": "confirm", "value": data["grievanceAccount"], "form_data": data, "intent": intent}

        lang = data.get("language", "English")
        if yes_no(t) is True:
            sess["state"] = "GRIEV_MOBILE"
            msg = "To submit your grievance formally, please provide your 10-digit registered mobile number."
            return {"speak": AuraAI.translate_static(msg, lang), "field": "mobile", "intent": intent, "form_data": data}
        sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
        return {"speak": AuraAI.generate_response("Complaint cancelled. Offer additional help."), "final": True}

    if state == "GRIEV_MOBILE":
        lang = data.get("language", "English")
        digits = str(re.sub(r"\D", "", t))
        if len(digits) == 10:
            data["mobile"] = digits
            sess["state"] = "GRIEV_OTP"
            msg = f"Security Check: Please enter the OTP sent to respective {digits} number."
            return {"speak": AuraAI.translate_static(msg, lang), "field": "otp", "intent": intent, "form_data": data}
        return {"speak": AuraAI.translate_static("Please enter your 10-digit registered mobile number.", lang), "field": "mobile", "error": True, "form_data": data}

    if state == "GRIEV_OTP":
        lang = data.get("language", "English")
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            ref = gen_ref()
            data["grievanceRef"] = ref
            return {"speak": AuraAI.generate_response(f"Verification successful. Complaint registered. Reference is {ref}."), "final": True, "field": "success", "value": ref, "form_data": data}
        return {"speak": AuraAI.translate_static("Security code mismatch. Try again.", lang), "field": "otp", "error": True}

    # Catch-all
    return {"speak": AuraAI.generate_response("I didn't quite catch that. Could you please specify clearly what you meant?")}

# ── ENDPOINTS ─────────────────────────────────────────────────────────────────
@app.post("/process", response_model=EngineResponse)
def process(req: InputRequest):
    result = process_input(req.session_id, req.text)
    save_sessions(sessions)
    return EngineResponse(**result)

@app.post("/upload", response_model=UploadResponse)
def upload(req: UploadRequest):
    if req.session_id not in sessions:
        return {"status": "error", "message": "Session not found"}
    
    sess = sessions[req.session_id]
    data = sess["data"]
    
    # Create uploads directory if not exists
    os.makedirs("uploads", exist_ok=True)
    
    # Save Image
    try:
        header, encoded = req.image.split(",", 1)
        data_bytes = base64.b64decode(encoded)
        filename = f"uploads/{req.session_id}_{req.field}_{int(time.time())}.jpg"
        with open(filename, "wb") as f:
            f.write(data_bytes)
        
        # Update session data
        data[req.field] = filename
        
        # Advance state if we are in a capture state
        if sess["state"] == "ACC_AADHAAR_PHOTO":
            sess["state"] = "ACC_CUSTOMER_PHOTO"
        elif sess["state"] == "ACC_CUSTOMER_PHOTO":
            sess["state"] = "ACC_MOBILE"
            
        save_sessions(sessions)
        return {"status": "success", "message": f"Image saved as {filename}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/session/{session_id}")
def get_session(session_id: str):
    return sessions.get(session_id, {"state": "IDLE", "data": {}})
