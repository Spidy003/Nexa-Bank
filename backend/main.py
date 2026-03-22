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

# ── GEMINI INITIALIZATION ─────────────────────────────────────────────────────
# Replace with your actual Gemini API key
GEMINI_API_KEY = "AIzaSyClAmvTZPfDDtOlbsgmVmw3LN1nrJoomVc"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI(title="Aura Banking Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── in-memory store ──────────────────────────────────────────────────────────
sessions: dict = {}
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

def validate_email(t: str) -> Optional[str]:
    e = t.strip().lower()
    return e if re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", e) else None

def gen_account() -> str:
    return "AURA" + str(random.randint(100000000, 999999999))

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
    # If text is too long (complex), skip local and use AI
    if len(t.split()) > 3: return {}
    
    if state == "ACC_TYPE":
        if "saving" in t: return {"accountType": "Savings"}
        if "current" in t: return {"accountType": "Current"}
        if "bsbda" in t: return {"accountType": "BSBDA"}
    if state == "ACC_SALUTATION":
        if re.search(r"\b(mr|mister)\b", t): return {"salutation": "Mr"}
        if re.search(r"\b(mrs|missus)\b", t): return {"salutation": "Mrs"}
        if re.search(r"\b(ms|miss)\b", t): return {"salutation": "Ms"}
        if re.search(r"\b(dr|doctor)\b", t): return {"salutation": "Dr"}
    if state == "ACC_GENDER":
        if "female" in t: return {"gender": "Female"}
        if "male" in t: return {"gender": "Male"} 
        if "third" in t or "other" in t: return {"gender": "Third Gender"}
    if state == "ACC_MARITAL_STATUS":
        if "unmarried" in t or "single" in t: return {"maritalStatus": "Unmarried"}
        if "married" in t: return {"maritalStatus": "Married"}
    if state == "ACC_CORR_SAME":
        val = yes_no(t)
        if val is not None: return {"corrSameAddress": "Yes" if val else "No"}
    if state == "ACC_NATIONALITY":
        if "indian" in t: return {"nationality": "Indian"}
    if state == "ACC_OCCUPATION":
        if "service" in t: return {"occupation": "Service"}
        if "business" in t: return {"occupation": "Business"}
        if "student" in t: return {"occupation": "Student"}
        if "retired" in t: return {"occupation": "Retired"}
    if state == "ACC_SOURCE_OF_FUNDS":
        if "salary" in t: return {"sourceOfFunds": "Salary"}
        if "business" in t: return {"sourceOfFunds": "Business"}
        if "pension" in t: return {"sourceOfFunds": "Pension"}
    
    # Generic OTP/Mobile extraction
    if "otp" in state.upper() or state == "ACC_OTP":
        digits = re.sub(r"\D", "", t)
        if len(digits) == 4: return {"otpValue": digits}
    
    if state == "ACC_MOBILE" or "MOBILE" in state.upper():
        digits = re.sub(r"\D", "", t)
        if len(digits) == 10: return {"mobile": digits}

    return {}

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
        Generate a short, friendly, and professional conversational banking assistant response (no more than 1 or 2 normal sentences).
        IMPORTANT: Your entire response must be cleanly literally translated and spoken natively in exactly {lang}. Let your tone reflect the cultural norms of that language.
        Instruction: {instruction}
        Available context about user: {context_str}
        Do not use robotic boilerplate. Output exactly the spoken response string, no quotes.
        """
        for attempt in range(2):
            try:
                res = model.generate_content(prompt).text.strip().replace('"', '').replace('*', '')
                return res
            except Exception as e:
                if attempt == 1: return f"ERROR: {e}"
                time.sleep(1.5)

# ── MAIN ENGINE ──────────────────────────────────────────────────────────────
def process_input(session_id: str, text: str) -> dict:
    t = text.lower().strip()
    
    # 1. Initialize or get session
    if session_id not in sessions:
        sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
    sess = sessions[session_id]
    
    # 2. EMERGENCY LOCAL BYPASS (Before ANY AI logic)
    if re.search(r"test camera|verify camera|capture screen", t):
        sess["intent"] = "ACCOUNT_OPENING"
        sess["state"] = "ACC_AADHAAR_PHOTO"
        return {"speak": "Camera Test Mode active. Please position your document and say 'CLICK'.", "field": "aadhaarFrontPhoto", "intent": "ACCOUNT_OPENING", "section": "KYC Documents"}

    if re.search(r"start over|reset|cancel|go back|main menu", t):
        sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
        return {"speak": "Back to main menu. How can I assist you today?", "form_data": {}}

    # 3. Standard processing variables
    data = sess["data"]
    state = sess["state"]
    intent = sess.get("intent", "UNKNOWN")

    # 4. State-Specific Local Bypass (Prevents 429 during flows)
    local_match = local_extract(text, state)
    if local_match:
        data.update(local_match)
        # We don't return yet; let the state machine handle the NEXT step
    elif state == "IDLE":
        # Check for simple intent keywords locally
        if "card" in t:
            sess["intent"] = "CARD_SERVICE"
            sess["state"] = "CARD_ACTION"
            return {"speak": "Card services. Would you like to apply for a new card, block an existing one, or check card status?", "field": "cardAction", "intent": "CARD_SERVICE"}
        if "balance" in t:
            sess["intent"] = "BALANCE_CHECK"
            sess["state"] = "BAL_ACCOUNT"
            return {"speak": "I can help with that. Please provide your card or account details.", "field": "accountNumber", "intent": "BALANCE_CHECK"}
        if "loan" in t:
            sess["intent"] = "LOAN_INQUIRY"
            sess["state"] = "LOAN_TYPE"
            return {"speak": "What type of loan are you interested in: Home, Personal, or Car?", "field": "loanType", "intent": "LOAN_INQUIRY"}
        if "transfer" in t or "pay" in t:
            sess["intent"] = "FUND_TRANSFER"
            sess["state"] = "FT_TYPE"
            return {"speak": "Let's transfer funds. NEFT, IMPS, or RTGS?", "field": "ftType", "intent": "FUND_TRANSFER"}
        if re.search(r"open.*account", t):
            sess["intent"] = "ACCOUNT_OPENING"
            sess["state"] = "ACC_TYPE"
            return {"speak": "Welcome! Would you like to open a Savings or Current account?", "field": "accountType", "intent": "ACCOUNT_OPENING"}

    # 5. Intent Detection (Fallthrough to AI)
    if state == "IDLE":
        intent = AuraAI.detect_intent(text)
        sess["intent"] = intent

        if intent == "ACCOUNT_OPENING":
            sess["state"] = "ACC_TYPE"
            return {"speak": AuraAI.generate_response("Welcome them to account opening. Ask if they want a Savings Bank, Current, or Basic Savings Bank Deposit (BSBDA) account."),
                    "field": "accountType", "intent": intent, "section": "Account Type", "progress": 0}

        if intent == "BALANCE_CHECK":
            sess["state"] = "BAL_ACCOUNT"
            return {"speak": AuraAI.generate_response("Acknowledge balance check request. Please provide your card or account details."), "field": "accountNumber", "intent": intent}

        if intent == "LOAN_INQUIRY":
            sess["state"] = "LOAN_TYPE"
            return {"speak": AuraAI.generate_response("Acknowledge loan request. Ask what type of loan: Home, Personal, Car, or Education?"), "field": "loanType", "intent": intent, "section": "Loan Type"}

        if intent == "FUND_TRANSFER":
            sess["state"] = "FT_TYPE"
            return {"speak": AuraAI.generate_response("Acknowledge fund transfer request. Ask if they want NEFT, IMPS, or RTGS."), "field": "ftType", "intent": intent}
        
        if intent == "GRIEVANCE":
            sess["state"] = "GRIEV_TYPE"
            return {"speak": AuraAI.generate_response("Acknowledge complaint. Ask if it is a Service issue, Transaction dispute, or Card issue.", context=data), "field": "grievanceType", "intent": intent}

        if intent == "THEME_CHANGE":
            res = AuraAI.extract_fields(text, "Theme Selection", ["themeChoice"], data)
            choice = str(res.get("themeChoice", "")).lower()
            val = "light" if "light" in choice or "white" in choice else "dark"
            return {"speak": AuraAI.generate_response(f"Confirm that you are actively switching the interface to {val} mode.", context=data), "intent": intent, "field": "theme", "value": val}

        if intent == "LANGUAGE_CHANGE":
            res = AuraAI.extract_fields(text, "Language Selection", ["languageChoice"], data)
            choice = str(res.get("languageChoice", "")).lower()
            if "hindi" in choice: 
                val = "hi-IN"; lang_str = "Hindi"
            elif "marathi" in choice: 
                val = "mr-IN"; lang_str = "Marathi"
            else: 
                val = "en-IN"; lang_str = "English"
            data["language"] = lang_str
            return {"speak": AuraAI.generate_response(f"Confirm strictly in {lang_str} that the system language is exactly now {lang_str}.", context=data), "intent": intent, "field": "language", "value": val}

        if intent == "CARD_SERVICE":
            sess["state"] = "CARD_ACTION"
            return {"speak": "Card services. Would you like to apply for a new card, block an existing one, or check card status?", "field": "cardAction", "intent": intent}

        if intent == "FIXED_DEPOSIT":
            sess["state"] = "FD_AMOUNT"
            return {"speak": "Let's set up your Fixed Deposit. What amount?", "field": "fdAmount", "intent": intent, "section": "Fixed Deposit"}

        if intent == "CHEQUE_SERVICE":
            sess["state"] = "CHQ_ACTION"
            return {"speak": "Cheque services — request cheque book or stop payment?", "field": "chequeAction", "intent": intent}

        if intent == "ACCOUNT_CLOSURE":
            sess["state"] = "CLOSE_ACCOUNT_NUM"
            return {"speak": "Please provide the account number you wish to close.", "field": "closeAccount", "intent": intent}

        if intent == "GENERAL_QUERY":
            return {"speak": AuraAI.generate_response("Tell them you can help with Account Opening, Balance Check, Loans, Card Services, Fixed Deposits, Fund Transfer, Cheque Services, Account Closure, or Grievance. Ask what they need.")}

        return {"speak": AuraAI.generate_response("Apologize politely that you did not catch that. List some basic services you can help with, like opening accounts or checking balances."), "intent": "UNKNOWN"}

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
        if "pan" in data and not validate_pan(data["pan"]): 
            del data["pan"]
            return {"speak": AuraAI.generate_response("Tell the user their PAN format was invalid and ask them to provide a valid one."), "field": "pan", "error": True, "validation_result": "invalid"}
        if "aadhaar" in data and not validate_aadhaar(data["aadhaar"]): 
            del data["aadhaar"]
            return {"speak": AuraAI.generate_response("Tell the user their Aadhaar format was invalid (must be 12 digits) and to try again."), "field": "aadhaar", "error": True, "validation_result": "invalid"}
        if "mobile" in data and not validate_mobile(data["mobile"]): 
            del data["mobile"]
            return {"speak": AuraAI.generate_response("Tell the user their mobile is invalid. Needs 10 digits."), "field": "mobile", "error": True, "validation_result": "invalid"}
        if "email" in data and not validate_email(data["email"]) and data["email"].lower() != "skip": 
            del data["email"]
            return {"speak": AuraAI.generate_response("Tell the user their email is invalid. Ask to provide a valid one or say skip."), "field": "email", "error": True, "validation_result": "invalid"}

        # DYNAMIC JUMP ENGINE: Find first missing step
        step_map = {
            "ACC_TYPE": ("accountType", "Ask what kind of account they want (Savings, Current, BSBDA)."),
            "ACC_SALUTATION": ("salutation", "Ask for their salutation (Mr, Mrs, Ms, Dr)."),
            "ACC_FIRST_NAME": ("firstName", "Ask for their first name."),
            "ACC_MIDDLE_NAME": ("middleName", "Ask if they have a middle name (or to say skip)."),
            "ACC_LAST_NAME": ("lastName", "Ask for their last name."),
            "ACC_DOB": ("dob", "Ask for their date of birth. Give a brief example of the format, such as 'For example, 15th January 1990'."),
            "ACC_GENDER": ("gender", "Ask for their gender (Male, Female, Third Gender)."),
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
                if data.get(field) == "skip" and field in ["email", "middleName"]:
                    pass # intentionally skipped
                else:
                    sess["state"] = step
                    resp = AuraAI.generate_response(instruction, context=data)
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
                confirm_str = f"Verification successful. Let's review: Name {d.get('fullName')}, Acc {d.get('accountType')}. Say yes to confirm and open your account."
                return {"speak": AuraAI.generate_response(confirm_str), "field": "confirm", "validation_result": "valid", "form_data": data, "intent": intent, "section": "Confirmation", "progress": 95}
            return {"speak": "Security code mismatch. Please try again.", "field": "otp", "error": True, "validation_result": "invalid"}

        if state == "ACC_CONFIRM":
            if yes_no(t) is True:
                acc_num = "".join([str(random.randint(0,9)) for _ in range(16)])
                data["accountNumber"] = acc_num
                accounts_db.append({**data, "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")})
                sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
                return {"speak": AuraAI.generate_response(f"Congratulate the user! Their {data.get('accountType', 'Savings')} account is ready with number {acc_num}. Show them their new digital card."), 
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
                return {"speak": AuraAI.generate_response(instruction, context=data), "field": field, "form_data": data, "intent": intent}

        if not data.get("otpVerified"):
            sess["state"] = "FT_OTP"
            mob = str(data.get("mobile", ""))
            return {"speak": f"Security Check: Please enter the OTP sent to respective {mob} number.", "field": "otp", "form_data": data, "intent": intent}

    if intent == "FUND_TRANSFER" and state == "FT_OTP":
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            ref = "TXN" + str(int(time.time()))[-10:]
            return {"speak": AuraAI.generate_response(f"Verification successful. Funds transferred. Reference is {ref}."), "final": True, "field": "success", "value": ref, "validation_result": "valid", "form_data": data}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "validation_result": "invalid", "error": True}


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
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            return {"speak": "Verification successful. Your account closure request has been submitted for final review.", "final": True}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "error": True}
        
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

    if state == "GRIEV_CONFIRM":
        if yes_no(t) is True:
            sess["state"] = "GRIEV_MOBILE"
            return {"speak": "To submit your grievance formally, please provide your 10-digit registered mobile number.", "field": "mobile", "intent": intent, "form_data": data}
        sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
        return {"speak": AuraAI.generate_response("Complaint cancelled. Offer additional help."), "final": True}

    if state == "GRIEV_MOBILE":
        digits = str(re.sub(r"\D", "", t))
        if len(digits) == 10:
            data["mobile"] = digits
            sess["state"] = "GRIEV_OTP"
            return {"speak": f"Security Check: Please enter the OTP sent to respective {digits} number.", "field": "otp", "intent": intent, "form_data": data}
        return {"speak": "Please enter your 10-digit registered mobile number.", "field": "mobile", "error": True, "form_data": data}

    if state == "GRIEV_OTP":
        otp_val = data.get("otpValue") or re.sub(r"\D", "", t)
        if otp_val == SERVICE_OTPS.get(intent):
            sessions[session_id] = {"state": "IDLE", "data": {}, "intent": None}
            ref = gen_ref()
            data["grievanceRef"] = ref
            return {"speak": AuraAI.generate_response(f"Verification successful. Complaint registered. Reference is {ref}."), "final": True, "field": "success", "value": ref, "form_data": data}
        return {"speak": "Security code mismatch. Try again.", "field": "otp", "error": True}

    # Catch-all
    return {"speak": AuraAI.generate_response("I didn't quite catch that. Could you please specify clearly what you meant?")}

# ── ENDPOINTS ─────────────────────────────────────────────────────────────────
@app.post("/process", response_model=EngineResponse)
def process(req: InputRequest):
    result = process_input(req.session_id, req.text)
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
            
        return {"status": "success", "message": f"Image saved as {filename}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/session/{session_id}")
def get_session(session_id: str):
    return sessions.get(session_id, {"state": "IDLE", "data": {}})
