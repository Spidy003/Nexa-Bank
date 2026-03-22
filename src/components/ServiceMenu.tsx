import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  Wallet, CreditCard, Landmark, PiggyBank,
  ArrowLeftRight, BookOpen, XCircle, AlertTriangle, Scale,
} from "lucide-react";

interface ServiceMenuProps { isVisible: boolean; }

const services = [
  { icon: <Wallet className="w-5 h-5" />, label: "Open Account", desc: "Savings / Current / BSBDA", color: "hover-blue", tag: "MOST POPULAR", tagColor: "#0284C7" },
  { icon: <Scale className="w-5 h-5" />, label: "Balance Check", desc: "Account balance inquiry", color: "hover-blue", tag: null, tagColor: "" },
  { icon: <Landmark className="w-5 h-5" />, label: "Loan", desc: "Home / Personal / Car / Education", color: "hover-blue", tag: "QUICK APPROVAL", tagColor: "#0284C7" },
  { icon: <CreditCard className="w-5 h-5" />, label: "Card Services", desc: "Apply / Block / Status", color: "hover-blue", tag: null, tagColor: "" },
  { icon: <PiggyBank className="w-5 h-5" />, label: "Fixed Deposit", desc: "Up to 7.1% p.a.", color: "hover-blue", tag: "HIGH YIELD", tagColor: "#047857" },
  { icon: <ArrowLeftRight className="w-5 h-5" />, label: "Fund Transfer", desc: "NEFT / IMPS / RTGS", color: "hover-blue", tag: null, tagColor: "" },
  { icon: <BookOpen className="w-5 h-5" />, label: "Cheque Service", desc: "Request / Stop payment", color: "hover-blue", tag: null, tagColor: "" },
  { icon: <XCircle className="w-5 h-5" />, label: "Close Account", desc: "Account closure request", color: "hover-blue", tag: null, tagColor: "" },
  { icon: <AlertTriangle className="w-5 h-5" />, label: "Grievance", desc: "File a complaint", color: "hover-blue", tag: null, tagColor: "" },
];

const ServiceCard = ({ s, idx }: { s: typeof services[0], idx: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({});

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    setStyle({
      transform: `perspective(1000px) scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      boxShadow: `${-rotateY}px ${rotateX}px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(0, 229, 255, 0.2)`,
      borderColor: "rgba(0, 229, 255, 0.6)"
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: `perspective(1000px) scale(1) rotateX(0deg) rotateY(0deg)`,
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
      borderColor: "transparent"
    });
  };

  return (
    <div
      ref={cardRef}
      className={`service-card service-card-gsap`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transition: "transform 0.1s ease, box-shadow 0.1s ease, border-color 0.2s ease", transformStyle: "preserve-3d" }}
    >
      {/* Tag */}
      {s.tag && (
        <div style={{
          background: s.tagColor,
          color: "white",
          fontFamily: "var(--font-mono)",
          fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.1em",
          padding: "2px 8px", marginBottom: 8,
          borderRadius: 10,
          alignSelf: "center",
          boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
          transform: "translateZ(30px)"
        }}>{s.tag}</div>
      )}
      {/* Icon */}
      <div className="service-icon-box" style={{ transform: "translateZ(25px)" }}>{s.icon}</div>
      <span style={{
        fontFamily: "var(--font-display)",
        fontWeight: 800, fontSize: "0.95rem", color: "var(--ink)",
        letterSpacing: "0.01em",
        marginTop: 4,
        transform: "translateZ(20px)"
      }}>{s.label}</span>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.65rem", color: "var(--ink-muted)", fontWeight: 600,
        opacity: 0.8,
        transform: "translateZ(10px)"
      }}>{s.desc}</span>
    </div>
  );
};

const ServiceMenu = ({ isVisible }: ServiceMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.service-card-gsap'),
        { opacity: 0, y: 80, rotationX: 45, scale: 0.8 },
        { opacity: 1, y: 0, rotationX: 0, scale: 1, duration: 0.8, stagger: 0.08, ease: "back.out(1.5)", clearProps: "all" }
      );
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-2xl" ref={containerRef}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          background: "linear-gradient(135deg,#00E5FF,#0284C7)",
          borderRadius: 10, padding: "8px 18px",
          fontFamily: "var(--font-display)",
          fontWeight: 700, fontSize: "0.72rem", color: "#0A0F1C",
          letterSpacing: "0.12em",
          boxShadow: "0 4px 16px rgba(0,229,255,0.35)",
        }}>
          ◆ SERVICES
        </div>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "0.72rem",
          color: "var(--ink-muted)", fontWeight: 500,
        }}>
          Say the service name or speak naturally
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", perspective: "1000px" }}>
        {services.map((s, idx) => (
          <ServiceCard key={s.label} s={s} idx={idx} />
        ))}
      </div>
    </div>
  );
};

export default ServiceMenu;
