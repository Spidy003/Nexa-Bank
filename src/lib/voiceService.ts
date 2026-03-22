interface SpeechRecognitionAlias extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

type VoiceCallback = (text: string) => void;
type StatusCallback = (status: "listening" | "idle" | "speaking" | "processing") => void;

class VoiceService {
  private recognition: SpeechRecognitionAlias | null = null;
  private synthesis = window.speechSynthesis;
  private onResult: VoiceCallback | null = null;
  private onInterim: VoiceCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private isListening = false;
  private shouldAutoRestart = false;
  private isSpeaking = false;
  public currentLang: string = "en-IN";

  setLanguage(lang: string) {
    this.currentLang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  constructor() {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      this.recognition = new SpeechRecognitionCtor() as SpeechRecognitionAlias;
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLang;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript && this.onInterim) {
          this.onInterim(interimTranscript);
        }

        if (finalTranscript && this.onResult) {
          this.onResult(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          // Auto-restart if we should keep listening
          if (this.shouldAutoRestart && !this.isSpeaking) {
            setTimeout(() => this.restartListening(), 300);
          }
          return;
        }
        this.isListening = false;
        this.onStatus?.("idle");
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto-restart continuous listening
        if (this.shouldAutoRestart && !this.isSpeaking) {
          setTimeout(() => this.restartListening(), 200);
        }
      };
    }
  }

  setCallbacks(onResult: VoiceCallback, onInterim: VoiceCallback, onStatus: StatusCallback) {
    this.onResult = onResult;
    this.onInterim = onInterim;
    this.onStatus = onStatus;
  }

  startListening() {
    if (!this.recognition) return;
    this.shouldAutoRestart = true;
    this.restartListening();
  }

  private restartListening() {
    if (!this.recognition || this.isSpeaking) return;
    try {
      if (this.isListening) {
        this.recognition.abort();
      }
      setTimeout(() => {
        try {
          this.recognition!.start();
          this.isListening = true;
          this.onStatus?.("listening");
        } catch {
          // Already started
        }
      }, 100);
    } catch {
      // ignore
    }
  }

  stopListening() {
    if (!this.recognition) return;
    this.shouldAutoRestart = false;
    this.isListening = false;
    try {
      this.recognition.abort();
    } catch {
      // ignore
    }
    this.onStatus?.("idle");
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.isSpeaking = true;
      // Pause listening while speaking
      if (this.isListening && this.recognition) {
        try { this.recognition.abort(); } catch { }
        this.isListening = false;
      }

      this.synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = this.currentLang;

      const voices = this.synthesis.getVoices();
      const langPrefix = this.currentLang.split('-')[0]; // 'en', 'hi', 'mr'
      
      let preferred;
      if (langPrefix === 'en') {
        preferred = voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) || 
                    voices.find((v) => v.lang.startsWith("en"));
      } else {
        preferred = voices.find((v) => (v.name.includes("Google") || v.name.includes("Microsoft")) && v.lang.startsWith(langPrefix)) || 
                    voices.find((v) => v.lang.startsWith(langPrefix));
      }
      if (preferred) utterance.voice = preferred;

      this.onStatus?.("speaking");

      utterance.onend = () => {
        this.isSpeaking = false;
        this.onStatus?.("idle");
        resolve();
        // Resume listening after speaking
        if (this.shouldAutoRestart) {
          setTimeout(() => this.restartListening(), 300);
        }
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.onStatus?.("idle");
        resolve();
        if (this.shouldAutoRestart) {
          setTimeout(() => this.restartListening(), 300);
        }
      };

      this.synthesis.speak(utterance);
    });
  }

  get supported() {
    return !!this.recognition;
  }
}

export const voiceService = new VoiceService();
