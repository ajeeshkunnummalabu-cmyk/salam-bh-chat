import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Send, Search, Plane, FileText, Hotel, Palmtree, Paperclip, Mic,
  Check, CheckCheck, Phone, Mail, User, Users, BarChart3, MessageSquare,
  LogOut, Globe, ChevronLeft, Plus, Settings, Languages, Eye, EyeOff,
  Calendar, MapPin, Wallet, Filter, X, Menu, Bell, ArrowRight, Shield,
  TrendingUp, Clock, UserCheck, Sparkles, CreditCard, Download, Upload,
  Ticket, Wand2, Copy, CheckCircle2, Circle, FileDown, DollarSign,
  Trash2, Edit3, ExternalLink, Receipt, Building2, Banknote
} from "lucide-react";
import { db, translateText, detectLanguage } from "./lib.js";

// ============== BUSINESS CONFIG ==============
const BUSINESS = {
  name: "Salam Bahrain Travel and Tourism W.L.L",
  shortName: "Salam Bahrain Travel",
  whatsapp: "97336781999",
  bank: {
    name: "National Bank of Bahrain (NBB)",
    accountName: "Salam Bahrain Travel WLL",
    iban: "BH00NBOB00000000000000",
    swift: "NBOBBHBM"
  }
};

// LANG_NAMES kept for UI display
const LANG_NAMES = {
  en: "English", ar: "العربية", hi: "हिन्दी", ml: "മലയാളം", th: "Thai", zh: "中文"
};

// ========== AI REPLY SUGGESTIONS (rule-based simulation) ==========
const generateAISuggestions = (lastCustomerMsg, customerName, lang) => {
  if (!lastCustomerMsg) return [];
  const text = (lastCustomerMsg.translated || lastCustomerMsg.text || "").toLowerCase();
  const firstName = customerName.split(" ")[0];

  const suggestions = [];

  if (text.match(/flight|fly|book|ticket|airline|طيران|رحلة|उड़ान|ഫ്ലൈറ്റ്/i)) {
    suggestions.push(
      `Hi ${firstName}, happy to help with your flight booking! Could you please share: travel dates, destination city, and number of passengers?`,
      `Thank you ${firstName}! I'll check the best fares for you. Which dates are you flexible on, and do you prefer economy or business class?`,
      `Sure ${firstName}! Let me find the best options. Are you traveling one-way or round trip?`
    );
  } else if (text.match(/visa|تأشيرة|वीजा|വിസ/i)) {
    suggestions.push(
      `Hello ${firstName}, we offer visa services for UAE, Schengen, UK, USA and more. Which country's visa do you need?`,
      `Hi ${firstName}! Our processing time is 5-10 working days. Could you tell me which country and the travel purpose (tourist/business)?`,
      `Thank you ${firstName}. To process your visa, I'll need: passport copy, photo, and bank statement. Which country are you applying for?`
    );
  } else if (text.match(/hotel|stay|accommodation|فندق|होटल|ഹോട്ടൽ/i)) {
    suggestions.push(
      `Hi ${firstName}! Happy to help with hotel booking. Which city, dates, and how many guests?`,
      `Hello ${firstName}, what's your preferred star rating and budget per night?`,
      `Sure ${firstName}! I can find the best deals. Do you prefer city center or near attractions?`
    );
  } else if (text.match(/package|holiday|tour|vacation|عطلة|باقة|पैकेज|പാക്കേജ്/i)) {
    suggestions.push(
      `Hi ${firstName}! Our popular packages: Maldives 5N from 450 BHD, Turkey 7N from 380 BHD, Thailand 6N from 320 BHD. Which interests you?`,
      `Hello ${firstName}! What's your preferred destination and travel month? I'll send you customized options.`,
      `Thank you ${firstName}! How many travelers and what's your budget range?`
    );
  } else if (text.match(/price|cost|how much|rate|fare|سعر|كم|कीमत|വില/i)) {
    suggestions.push(
      `Hi ${firstName}, prices vary based on dates and availability. Could you share specific travel dates so I can give you exact fare?`,
      `Hello ${firstName}, let me check live fares for you. Which exact dates are you looking at?`,
      `Thank you ${firstName}! Prices depend on season. Share your dates and I'll send the best quote.`
    );
  } else if (text.match(/hi|hello|hey|salam|مرحبا|السلام|नमस्ते|ഹലോ/i)) {
    suggestions.push(
      `Hello ${firstName}! Welcome to Salam Bahrain Travel. How can I help you today — flights, visas, or holiday packages?`,
      `Hi ${firstName}! Thanks for reaching out. What can I help you with today?`,
      `Welcome ${firstName}! How may I assist you with your travel plans?`
    );
  } else {
    suggestions.push(
      `Thank you for your message ${firstName}! Could you share more details so I can help you better?`,
      `Hi ${firstName}, let me check that for you. Could you give me a moment?`,
      `Hello ${firstName}! I'd be happy to help. Could you tell me a bit more about what you need?`
    );
  }

  return suggestions.slice(0, 3);
};

// ========== PNR PARSER (Galileo format) ==========
const parsePNR = (pnrText) => {
  if (!pnrText) return null;
  const lines = pnrText.split("\n").map(l => l.trim()).filter(Boolean);
  const flights = [];
  let passengerName = "";
  let pnrCode = "";

  for (const line of lines) {
    // Try to match Galileo segment: "1. EK 838 Y 15DEC BAHDXB HK1 0245 0445"
    // Or simplified: "EK838 BAH-DXB 15DEC 0245-0445"
    const galileoMatch = line.match(/(\d+\.?\s*)?([A-Z0-9]{2})\s*(\d{2,4})\s*([A-Z])?\s*(\d{1,2}[A-Z]{3})\s*([A-Z]{3})([A-Z]{3})\s*(?:HK\d+|HS\d+)?\s*(\d{4})\s*(\d{4})/i);
    if (galileoMatch) {
      const [, , airline, flightNum, , date, from, to, dep, arr] = galileoMatch;
      flights.push({
        airline: airline.toUpperCase(),
        flightNumber: `${airline.toUpperCase()}${flightNum}`,
        date: date.toUpperCase(),
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        depTime: `${dep.slice(0,2)}:${dep.slice(2)}`,
        arrTime: `${arr.slice(0,2)}:${arr.slice(2)}`
      });
      continue;
    }

    // Simpler format: "EK838 BAH DXB 15DEC 0245 0445"
    const simpleMatch = line.match(/([A-Z]{2})(\d{2,4})\s+([A-Z]{3})\s*[-\s]\s*([A-Z]{3})\s+(\d{1,2}\s*[A-Z]{3})\s+(\d{4})\s*[-\s]?\s*(\d{4})/i);
    if (simpleMatch) {
      const [, airline, flightNum, from, to, date, dep, arr] = simpleMatch;
      flights.push({
        airline: airline.toUpperCase(),
        flightNumber: `${airline.toUpperCase()}${flightNum}`,
        date: date.replace(/\s/g, "").toUpperCase(),
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        depTime: `${dep.slice(0,2)}:${dep.slice(2)}`,
        arrTime: `${arr.slice(0,2)}:${arr.slice(2)}`
      });
      continue;
    }

    // Passenger name (Galileo: "1.1SMITH/JOHN MR")
    const paxMatch = line.match(/^\d+\.\d+([A-Z\/\s]+(?:MR|MRS|MS|MSTR|MISS)?)/);
    if (paxMatch && !passengerName) {
      passengerName = paxMatch[1].replace(/\//g, " ").trim();
    }

    // PNR code (6 letters)
    const pnrMatch = line.match(/\b([A-Z0-9]{6})\b/);
    if (pnrMatch && !pnrCode && line.toLowerCase().includes("pnr") || line.match(/^[A-Z0-9]{6}$/)) {
      pnrCode = pnrMatch ? pnrMatch[1] : "";
    }
  }

  return flights.length ? { flights, passengerName, pnrCode } : null;
};

// Airport code → city name (common ones)
const AIRPORTS = {
  BAH: "Bahrain", DXB: "Dubai", AUH: "Abu Dhabi", DOH: "Doha", KWI: "Kuwait",
  RUH: "Riyadh", JED: "Jeddah", MCT: "Muscat", BOM: "Mumbai", DEL: "Delhi",
  COK: "Kochi", BLR: "Bangalore", MAA: "Chennai", HYD: "Hyderabad", CCJ: "Calicut",
  TRV: "Trivandrum", IST: "Istanbul", LHR: "London", CDG: "Paris", BKK: "Bangkok",
  KUL: "Kuala Lumpur", SIN: "Singapore", MLE: "Maldives", CMB: "Colombo", CAI: "Cairo"
};


const PIPELINE_STAGES = [
  { id: "new", label: "New Inquiry", color: "#6b7280" },
  { id: "quoted", label: "Quote Sent", color: "#5A4E85" },
  { id: "paid", label: "Payment Received", color: "#D4A338" },
  { id: "ticketed", label: "Ticketed", color: "#3C325F" },
  { id: "done", label: "Completed", color: "#059669" },
  { id: "lost", label: "Lost", color: "#dc2626" }
];


// ========== HOOK: Supabase data ==========
const useAppData = () => {
  const [customers, setCustomers] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [staff, setStaff] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [c, s] = await Promise.all([db.getCustomers(), db.getStaff()]);
      if (!mounted) return;
      setCustomers(c);
      setStaff(s);

      // Load messages for all customers
      const msgsMap = {};
      await Promise.all(c.map(async (cust) => {
        msgsMap[cust.id] = await db.getMessages(cust.id);
      }));
      if (!mounted) return;
      setMessagesMap(msgsMap);
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  // Real-time subscription: messages
  useEffect(() => {
    const sub = db.subscribeToMessages((payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      const row = newRow || oldRow;
      if (!row) return;

      const msg = {
        id: row.id,
        customerId: row.customer_id,
        from: row.from_role,
        text: row.text,
        translated: row.translated,
        originalLang: row.original_lang,
        type: row.type || "text",
        time: Number(row.time),
        status: row.status,
        staffName: row.staff_name,
        ...(row.payload || {})
      };

      setMessagesMap(prev => {
        const cId = msg.customerId;
        const existing = prev[cId] || [];
        if (eventType === "INSERT") {
          if (existing.find(m => m.id === msg.id)) return prev;
          return { ...prev, [cId]: [...existing, msg].sort((a,b) => a.time - b.time) };
        }
        if (eventType === "UPDATE") {
          return { ...prev, [cId]: existing.map(m => m.id === msg.id ? msg : m) };
        }
        if (eventType === "DELETE") {
          return { ...prev, [cId]: existing.filter(m => m.id !== msg.id) };
        }
        return prev;
      });
    });
    return () => { sub?.unsubscribe?.(); };
  }, []);

  // Real-time subscription: customers
  useEffect(() => {
    const sub = db.subscribeToCustomers((payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      const row = newRow || oldRow;
      if (!row) return;
      const cust = {
        id: row.id, name: row.name, phone: row.phone, email: row.email,
        lang: row.lang, assignedTo: row.assigned_to, stage: row.stage,
        tags: row.tags || [], createdAt: Number(row.created_at)
      };

      setCustomers(prev => {
        if (eventType === "INSERT") {
          if (prev.find(c => c.id === cust.id)) return prev;
          return [cust, ...prev];
        }
        if (eventType === "UPDATE") {
          return prev.map(c => c.id === cust.id ? cust : c);
        }
        if (eventType === "DELETE") {
          return prev.filter(c => c.id !== cust.id);
        }
        return prev;
      });

      // Ensure messages slot exists
      if (eventType === "INSERT") {
        setMessagesMap(prev => prev[cust.id] ? prev : { ...prev, [cust.id]: [] });
      }
    });
    return () => { sub?.unsubscribe?.(); };
  }, []);

  return {
    customers, messages: messagesMap, staff, loaded,
    saveCustomer: async (c) => { await db.upsertCustomer(c); },
    sendMessage: async (msg) => { await db.insertMessage(msg); },
    markRead: async (customerId) => { await db.markMessagesRead(customerId); }
  };
};

// ========== UTILS ==========
const formatTime = (ts) => {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 86400000 * 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
};
const formatFullTime = (ts) => new Date(ts).toLocaleString([], { hour: "2-digit", minute: "2-digit" });
const getInitials = (name) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
const avatarColor = (id) => {
  const colors = ["#3C325F", "#5A4E85", "#c2410c", "#7c2d12", "#1e40af", "#6b21a8", "#be185d", "#0f766e"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ========== UI PRIMITIVES ==========
// ========== BRAND COLORS ==========
const BRAND = {
  primary: "#3C325F",        // deep indigo (logo background)
  primaryDark: "#2E2649",    // darker shade for gradients
  primaryLight: "#5A4E85",   // lighter shade for accents
  primaryTint: "#3C325F15",  // 15% opacity for backgrounds
  gold: "#ECB948",           // warm gold accent
  goldDark: "#D4A338",
  goldLight: "#F5D278",
  goldTint: "#ECB94815"
};

// Load brand font once
const BrandFontLoader = () => {
  useEffect(() => {
    if (document.getElementById("salam-brand-font")) return;
    const link = document.createElement("link");
    link.id = "salam-brand-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
};

// ========== LOGO ==========
const Logo = ({ size = 40, compact = false, variant = "default" }) => {
  // variant: "default" (light bg) | "dark" (dark bg) | "icon" (just the mark)
  const onDark = variant === "dark";
  const titleColor = onDark ? "#ffffff" : BRAND.primary;
  const taglineColor = BRAND.gold;

  return (
    <div className="flex items-center gap-2 md:gap-2.5">
      <div
        className="rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 relative"
        style={{ width: size, height: size, backgroundColor: BRAND.primary }}
      >
        {/* Stylized "S" mark with gold crescent dot */}
        <span
          style={{
            color: "white",
            fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
            fontSize: size * 0.62,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: "-0.02em"
          }}
        >
          S
        </span>
        <span
          className="absolute"
          style={{
            top: size * 0.18,
            right: size * 0.22,
            width: size * 0.12,
            height: size * 0.12,
            borderRadius: "50%",
            backgroundColor: BRAND.gold,
            boxShadow: `0 0 ${size * 0.05}px ${BRAND.gold}`
          }}
        />
      </div>
      <div className="leading-tight min-w-0">
        <div
          className="truncate"
          style={{
            fontSize: size * 0.42,
            fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            color: titleColor,
            letterSpacing: "-0.01em",
            lineHeight: 1.1
          }}
        >
          Salam Bahrain
        </div>
        {!compact && (
          <div
            className="truncate"
            style={{
              fontSize: size * 0.24,
              color: taglineColor,
              letterSpacing: "0.04em",
              fontWeight: 500,
              marginTop: size * 0.04
            }}
          >
            Travel and Tourism W.L.L
          </div>
        )}
      </div>
    </div>
  );
};

const Avatar = ({ name, id, size = 44, online = false }) => (
  <div className="relative flex-shrink-0">
    <div
      className="rounded-full flex items-center justify-center text-white font-medium"
      style={{ width: size, height: size, backgroundColor: avatarColor(id || name), fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
    {online && (
      <div className="absolute bottom-0 right-0 rounded-full border-2 border-white"
        style={{ width: size * 0.28, height: size * 0.28, backgroundColor: "#10b981" }} />
    )}
  </div>
);

const StageBadge = ({ stage, size = "sm" }) => {
  const s = PIPELINE_STAGES.find(x => x.id === stage) || PIPELINE_STAGES[0];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
      style={{ backgroundColor: `${s.color}15`, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
};

// ========== ENTRY: ROLE SELECTOR ==========
const RoleSelector = ({ onSelect }) => (
  <div className="min-h-screen flex items-center justify-center p-4 py-8" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
    <div className="max-w-4xl w-full">
      <div className="text-center mb-6 md:mb-10">
        <div className="flex justify-center mb-4 md:mb-6"><Logo size={56} /></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2 px-2" style={{ letterSpacing: "-0.02em" }}>Welcome to Salam Bahrain Travel</h1>
        <p className="text-sm md:text-base text-gray-500 px-2">Multilingual chat for flights, visas & holiday packages</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { role: "customer", icon: User, title: "I'm a Customer", desc: "Start a chat with our travel agents", color: BRAND.primary },
          { role: "staff", icon: UserCheck, title: "Staff Login", desc: "Reply to customer inquiries", color: BRAND.goldDark },
          { role: "admin", icon: Shield, title: "Admin Dashboard", desc: "Manage chats, customers & analytics", color: BRAND.primaryDark }
        ].map(({ role, icon: Icon, title, desc, color }) => (
          <button key={role} onClick={() => onSelect(role)}
            className="bg-white rounded-2xl p-5 md:p-6 text-left border border-gray-200 hover:border-gray-300 hover:shadow-md active:scale-[0.98] transition-all group">
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-105 transition-transform" style={{ backgroundColor: `${color}15` }}>
              <Icon size={20} color={color} strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 text-[15px] md:text-base">{title}</h3>
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{desc}</p>
            <div className="flex items-center gap-1.5 mt-3 md:mt-4 text-sm font-medium" style={{ color }}>
              Continue <ArrowRight size={14} />
            </div>
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] md:text-xs text-gray-400 mt-6 md:mt-8 px-4">Staff: <span className="font-mono">layla / demo</span> · Admin: <span className="font-mono">admin / admin</span></p>
    </div>
  </div>
);

// ========== CUSTOMER FORM ==========
const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const CustomerForm = ({ onSubmit, onBack }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});

  const submit = () => {
    const e = {};
    if (!name.trim()) e.name = "Required";
    if (!phone.trim()) e.phone = "Required";
    else if (!/^[\+\d\s\-]{8,}$/.test(phone)) e.phone = "Invalid phone";
    if (email && !/\S+@\S+\.\S+/.test(email)) e.email = "Invalid email";
    setErrors(e);
    if (Object.keys(e).length === 0) onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex justify-center mb-6"><Logo size={52} /></div>
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-1">Start a conversation</h2>
        <p className="text-sm text-gray-500 text-center mb-6">Quick details so we can serve you better</p>
        <div className="space-y-4">
          <Field label="Full Name *" error={errors.name}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-50 transition" />
          </Field>
          <Field label="WhatsApp Number *" error={errors.phone}>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+973 3300 0000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-50 transition" />
          </Field>
          <Field label="Email (optional)" error={errors.email}>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-50 transition" />
          </Field>
        </div>
        <button onClick={submit} className="w-full mt-6 py-3 rounded-xl font-medium text-white transition hover:opacity-95"
          style={{ background: "linear-gradient(135deg, #3C325F 0%, #5A4E85 100%)" }}>
          Start Chat
        </button>
      </div>
    </div>
  );
};

const Login = ({ role, staff, onLogin, onBack }) => {
  const [username, setUsername] = useState(role === "admin" ? "admin" : "layla");
  const [password, setPassword] = useState(role === "admin" ? "admin" : "demo");
  const [error, setError] = useState("");
  const submit = () => {
    const user = staff.find(s => s.username === username && s.password === password && s.role === role);
    if (user) onLogin(user); else setError("Invalid credentials");
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex justify-center mb-6"><Logo size={52} /></div>
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-1">{role === "admin" ? "Admin Login" : "Staff Login"}</h2>
        <p className="text-sm text-gray-500 text-center mb-6">Sign in to your account</p>
        <div className="space-y-4">
          <Field label="Username">
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-50 transition" />
          </Field>
          <Field label="Password">
            <input value={password} onChange={e => setPassword(e.target.value)} type="password"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-50 transition"
              onKeyDown={e => e.key === "Enter" && submit()} />
          </Field>
        </div>
        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <button onClick={submit} className="w-full mt-6 py-3 rounded-xl font-medium text-white transition hover:opacity-95"
          style={{ background: "linear-gradient(135deg, #3C325F 0%, #5A4E85 100%)" }}>
          Sign In
        </button>
        <p className="text-xs text-gray-400 text-center mt-4">Demo: <span className="font-mono">{role === "admin" ? "admin / admin" : "layla / demo"}</span></p>
      </div>
    </div>
  );
};

// ========== MESSAGE BUBBLE ==========
const MessageBubble = ({ msg, isOwn, viewerLang = "en" }) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const needsTranslation = msg.originalLang !== viewerLang;
  const displayText = showOriginal || !needsTranslation ? msg.text : (msg.translated || msg.text);
  const isRTL = (showOriginal ? msg.originalLang : viewerLang) === "ar";

  // Special message types
  if (msg.type === "quote") {
    return <QuoteCard msg={msg} isOwn={isOwn} viewerLang={viewerLang} />;
  }
  if (msg.type === "payment") {
    return <PaymentCard msg={msg} isOwn={isOwn} viewerLang={viewerLang} />;
  }
  if (msg.type === "ticket") {
    return <TicketCard msg={msg} isOwn={isOwn} viewerLang={viewerLang} />;
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div className="max-w-[85%] md:max-w-[65%]">
        <div className={`px-3.5 py-2 rounded-2xl ${isOwn ? "rounded-br-md" : "rounded-bl-md"}`}
          style={{
            backgroundColor: isOwn ? "#3C325F" : "#ffffff",
            color: isOwn ? "white" : "#1f2937",
            border: isOwn ? "none" : "1px solid #e5e7eb",
            boxShadow: isOwn ? "0 1px 2px rgba(60,50,95,0.18)" : "0 1px 2px rgba(0,0,0,0.04)"
          }}>
          <div className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words" dir={isRTL ? "rtl" : "ltr"}>
            {displayText}
          </div>
          {needsTranslation && (
            <button onClick={() => setShowOriginal(!showOriginal)}
              className={`flex items-center gap-1 mt-1.5 text-[11px] ${isOwn ? "text-white/70 hover:text-white/90" : "text-gray-400 hover:text-gray-600"} transition`}>
              {showOriginal ? <EyeOff size={11} /> : <Eye size={11} />}
              {showOriginal ? "Show translation" : `Original (${LANG_NAMES[msg.originalLang] || msg.originalLang})`}
            </button>
          )}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span className={`text-[10.5px] ${isOwn ? "text-white/70" : "text-gray-400"}`}>{formatFullTime(msg.time)}</span>
            {isOwn && (msg.status === "read" ? <CheckCheck size={13} style={{ color: BRAND.goldLight }} /> :
              msg.status === "delivered" ? <CheckCheck size={13} className="text-white/60" /> :
              <Check size={13} className="text-white/60" />)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== QUOTE CARD ==========
const QuoteCard = ({ msg, isOwn, viewerLang }) => {
  const q = msg.quote;
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div className="max-w-[85%] md:max-w-[70%]">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #3C325F 0%, #5A4E85 100%)" }}>
            <Receipt size={16} color="white" />
            <span className="text-white font-medium text-sm">Flight Quote</span>
            <span className="ml-auto text-white/80 text-xs">#{q.id?.slice(-6)}</span>
          </div>
          <div className="p-4 space-y-3">
            {q.flights?.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Plane size={15} color="#3C325F" style={{ transform: "rotate(45deg)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <span>{f.from}</span>
                    <ArrowRight size={12} className="text-gray-400" />
                    <span>{f.to}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {f.flightNumber} · {f.date} · {f.depTime} – {f.arrTime}
                  </div>
                </div>
              </div>
            ))}
            {q.passengerName && (
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">Passenger: <span className="text-gray-700 font-medium">{q.passengerName}</span></div>
            )}
            <div className="flex items-end justify-between pt-2 border-t border-gray-100">
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-xl font-semibold text-gray-900">{q.amount} <span className="text-sm text-gray-500">BHD</span></div>
              </div>
              {q.validUntil && <div className="text-[11px] text-gray-400 text-right">Valid until<br/>{q.validUntil}</div>}
            </div>
          </div>
        </div>
        <div className="text-[10.5px] text-gray-400 mt-1 px-1">{formatFullTime(msg.time)}</div>
      </div>
    </div>
  );
};

// ========== PAYMENT CARD ==========
const PaymentCard = ({ msg, isOwn }) => {
  const p = msg.payment;
  const [copied, setCopied] = useState("");

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div className="max-w-[88%] md:max-w-[70%]">
        <div className="bg-white rounded-2xl border-2 border-amber-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
            <Banknote size={16} color="white" />
            <span className="text-white font-medium text-sm">Bank Transfer Request</span>
          </div>
          <div className="p-4 space-y-3">
            {/* Amount */}
            <div className="text-center pb-3 border-b border-gray-100">
              <div className="text-[11px] text-gray-500 uppercase tracking-wide">Amount Due</div>
              <div className="text-3xl font-semibold text-gray-900 mt-1">{p.amount} <span className="text-base text-gray-500 font-normal">BHD</span></div>
              {p.description && <div className="text-xs text-gray-500 mt-1">{p.description}</div>}
            </div>

            {/* Bank details */}
            <div className="space-y-2">
              <BankRow label="Bank" value={p.bank} />
              <BankRow label="Account Name" value={p.accountName} />
              <BankRow label="IBAN" value={p.iban} mono onCopy={(v) => copyToClipboard(v, "iban")} copied={copied === "iban"} />
              {p.swift && <BankRow label="SWIFT" value={p.swift} mono />}
              {p.reference && <BankRow label="Reference" value={p.reference} mono onCopy={(v) => copyToClipboard(v, "ref")} copied={copied === "ref"} />}
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
              <strong>Instructions:</strong> Transfer the exact amount to the IBAN above. Include the reference number. Send a screenshot of the transfer here once done.
            </div>

            {p.whatsapp && (
              <a href={`https://wa.me/${p.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi, I made the payment for ${p.amount} BHD. Reference: ${p.reference || ''}`)}`}
                 target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-white text-sm transition hover:opacity-95"
                style={{ background: "#25D366" }}>
                <MessageSquare size={14} /> Confirm Payment via WhatsApp
              </a>
            )}
          </div>
        </div>
        <div className="text-[10.5px] text-gray-400 mt-1 px-1">{formatFullTime(msg.time)}</div>
      </div>
    </div>
  );
};

const BankRow = ({ label, value, mono, onCopy, copied }) => (
  <div className="flex items-start justify-between gap-2 py-1">
    <span className="text-[11px] text-gray-500 uppercase tracking-wide flex-shrink-0 pt-0.5">{label}</span>
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`text-sm text-gray-900 font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</span>
      {onCopy && (
        <button onClick={() => onCopy(value)} className="text-gray-400 hover:text-gray-700 p-0.5 flex-shrink-0">
          {copied ? <CheckCircle2 size={12} className="text-green-600" /> : <Copy size={12} />}
        </button>
      )}
    </div>
  </div>
);

// ========== TICKET CARD ==========
const TicketCard = ({ msg, isOwn }) => {
  const t = msg.ticket;
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div className="max-w-[85%] md:max-w-[70%]">
        <div className="bg-white rounded-2xl border-2 border-indigo-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #3C325F 0%, #5A4E85 100%)" }}>
            <Ticket size={16} color="white" />
            <span className="text-white font-medium text-sm">E-Ticket Issued</span>
            <CheckCircle2 size={16} color="white" className="ml-auto" />
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">PNR</span>
              <span className="font-mono font-semibold text-gray-900">{t.pnr}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">Ticket No.</span>
              <span className="font-mono text-sm text-gray-700">{t.ticketNumber}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">Passenger</span>
              <span className="text-sm text-gray-900 font-medium">{t.passengerName}</span>
            </div>
            <button className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-xl font-medium text-sm transition border border-indigo-200 text-indigo-800 hover:bg-indigo-50">
              <FileDown size={14} /> Download E-Ticket PDF
            </button>
          </div>
        </div>
        <div className="text-[10.5px] text-gray-400 mt-1 px-1">{formatFullTime(msg.time)}</div>
      </div>
    </div>
  );
};

// ========== AI SUGGESTIONS PANEL ==========
const AISuggestions = ({ suggestions, onUse, onClose }) => {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-t border-purple-100 px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-purple-900">
          <Wand2 size={13} /> AI Suggested Replies
        </div>
        <button onClick={onClose} className="text-purple-400 hover:text-purple-600"><X size={14} /></button>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => onUse(s)}
            className="w-full text-left px-3 py-2 bg-white hover:bg-purple-50 rounded-xl border border-purple-100 text-sm text-gray-700 transition group flex items-start gap-2">
            <Sparkles size={12} className="text-purple-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <span className="flex-1">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ========== QUICK ACTIONS ==========
const QUICK_ACTIONS = [
  { id: "flight", icon: Plane, label: "Flight Inquiry", template: "Thank you for your interest! Could you share your travel dates, destination, and number of passengers?" },
  { id: "visa", icon: FileText, label: "Visa Services", template: "We offer visa services for UAE, Schengen, UK, USA, and more. Which country's visa do you need?" },
  { id: "holiday", icon: Palmtree, label: "Holiday Packages", template: "We have wonderful holiday packages! Popular destinations: Maldives, Turkey, Thailand. What's your preferred destination and budget?" },
  { id: "hotel", icon: Hotel, label: "Hotel Booking", template: "I can help you book hotels worldwide. Please share: destination city, check-in/check-out dates, and number of guests." }
];

// ========== QUOTE BUILDER MODAL ==========
const QuoteBuilder = ({ onSend, onClose, customerName }) => {
  const [pnrText, setPnrText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [amount, setAmount] = useState("");
  const [validDays, setValidDays] = useState("3");
  const [error, setError] = useState("");

  const handleParse = () => {
    setError("");
    const result = parsePNR(pnrText);
    if (!result) {
      setError("Could not parse PNR. Try the manual form below or check the format.");
      return;
    }
    setParsed(result);
  };

  const handleManual = () => {
    setParsed({
      flights: [{ airline: "EK", flightNumber: "EK838", from: "BAH", to: "DXB", date: "15DEC", depTime: "02:45", arrTime: "04:45" }],
      passengerName: customerName,
      pnrCode: ""
    });
  };

  const updateFlight = (i, field, value) => {
    const flights = [...parsed.flights];
    flights[i] = { ...flights[i], [field]: value };
    setParsed({ ...parsed, flights });
  };

  const addFlight = () => {
    setParsed({ ...parsed, flights: [...parsed.flights, { airline: "", flightNumber: "", from: "", to: "", date: "", depTime: "", arrTime: "" }] });
  };

  const removeFlight = (i) => {
    setParsed({ ...parsed, flights: parsed.flights.filter((_, idx) => idx !== i) });
  };

  const send = () => {
    if (!parsed || !amount) { setError("Please fill in flights and total amount."); return; }
    const validDate = new Date(Date.now() + parseInt(validDays) * 86400000).toLocaleDateString("en-GB");
    onSend({
      id: `q${Date.now()}`,
      flights: parsed.flights,
      passengerName: parsed.passengerName,
      pnrCode: parsed.pnrCode,
      amount,
      validUntil: validDate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-2xl flex flex-col shadow-xl" style={{ maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#3C325F15" }}>
              <Receipt size={16} color="#3C325F" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-[15px] md:text-base truncate">Build Flight Quote</h3>
              <p className="text-[11px] md:text-xs text-gray-500 truncate">Paste PNR or enter manually</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 -m-1 flex-shrink-0"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4" style={{ overscrollBehavior: "contain" }}>
          {!parsed ? (
            <>
              <Field label="Paste Galileo PNR">
                <textarea value={pnrText} onChange={e => setPnrText(e.target.value)} rows={6}
                  placeholder={`1.1SMITH/JOHN MR\n1. EK 838 Y 15DEC BAHDXB HK1 0245 0445\n2. EK 839 Y 20DEC DXBBAH HK1 1830 2030`}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-700 text-sm font-mono" />
              </Field>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleParse}
                  className="flex-1 py-2.5 rounded-xl font-medium text-white text-sm transition hover:opacity-95"
                  style={{ background: "linear-gradient(135deg, #3C325F 0%, #5A4E85 100%)" }}>
                  Parse PNR
                </button>
                <button onClick={handleManual}
                  className="flex-1 py-2.5 rounded-xl font-medium text-sm border border-gray-200 hover:bg-gray-50">
                  Enter Manually
                </button>
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                <strong className="text-gray-700">Galileo format example:</strong><br/>
                <span className="font-mono">1. EK 838 Y 15DEC BAHDXB HK1 0245 0445</span><br/>
                <span className="text-gray-400">Airline · Flight · Class · Date · From-To · Status · Times</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 text-sm">Flights</h4>
                <button onClick={addFlight} className="text-xs text-indigo-800 font-medium flex items-center gap-1">
                  <Plus size={12} /> Add segment
                </button>
              </div>
              {parsed.flights.map((f, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 relative">
                  <button onClick={() => removeFlight(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={f.flightNumber} onChange={e => updateFlight(i, "flightNumber", e.target.value)}
                      placeholder="EK838" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input value={f.date} onChange={e => updateFlight(i, "date", e.target.value)}
                      placeholder="15DEC" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input value={f.from} onChange={e => updateFlight(i, "from", e.target.value)}
                      placeholder="BAH" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white uppercase" />
                    <input value={f.to} onChange={e => updateFlight(i, "to", e.target.value)}
                      placeholder="DXB" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white uppercase" />
                    <input value={f.depTime} onChange={e => updateFlight(i, "depTime", e.target.value)}
                      placeholder="02:45" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                    <input value={f.arrTime} onChange={e => updateFlight(i, "arrTime", e.target.value)}
                      placeholder="04:45" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                  </div>
                </div>
              ))}
              <Field label="Passenger Name">
                <input value={parsed.passengerName || ""} onChange={e => setParsed({...parsed, passengerName: e.target.value})}
                  placeholder="SMITH/JOHN MR"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total Amount (BHD) *">
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="180"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" type="number" />
                </Field>
                <Field label="Valid for (days)">
                  <select value={validDays} onChange={e => setValidDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                  </select>
                </Field>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </>
          )}
        </div>

        {parsed && (
          <div className="p-4 md:p-5 border-t border-gray-100 flex gap-2 flex-shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <button onClick={() => { setParsed(null); setPnrText(""); }}
              className="px-4 py-2.5 rounded-xl font-medium text-sm border border-gray-200 hover:bg-gray-50">
              Back
            </button>
            <button onClick={send}
              className="flex-1 py-2.5 rounded-xl font-medium text-white text-sm transition hover:opacity-95"
              style={{ background: "linear-gradient(135deg, #3C325F 0%, #5A4E85 100%)" }}>
              Send Quote
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== BANK TRANSFER MODAL ==========
const PaymentLinkBuilder = ({ onSend, onClose, defaultAmount = "" }) => {
  const [amount, setAmount] = useState(defaultAmount);
  const [description, setDescription] = useState("Flight booking");
  const reference = useMemo(() => `SBT-${Date.now().toString(36).toUpperCase().slice(-6)}`, []);

  const send = () => {
    if (!amount) return;
    onSend({
      amount,
      description,
      reference,
      bank: BUSINESS.bank.name,
      accountName: BUSINESS.bank.accountName,
      iban: BUSINESS.bank.iban,
      swift: BUSINESS.bank.swift,
      whatsapp: BUSINESS.whatsapp
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md shadow-xl" style={{ maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f59e0b15" }}>
              <Banknote size={16} color="#d97706" />
            </div>
            <h3 className="font-semibold text-gray-900 text-[15px] md:text-base">Send Bank Transfer Details</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 -m-1"><X size={20} /></button>
        </div>
        <div className="p-4 md:p-5 space-y-4 overflow-y-auto">
          <Field label="Amount (BHD)">
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="180"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-700" />
          </Field>
          <Field label="Description">
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-700" />
          </Field>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Bank Details (auto-filled)</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Bank:</span><span className="text-gray-900 font-medium">{BUSINESS.bank.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="text-gray-900 font-medium truncate ml-2">{BUSINESS.bank.accountName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">IBAN:</span><span className="text-gray-900 font-mono text-xs truncate ml-2">{BUSINESS.bank.iban}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Reference:</span><span className="text-indigo-700 font-mono font-semibold">{reference}</span></div>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-5 pt-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <button onClick={send} disabled={!amount}
            className="w-full py-2.5 rounded-xl font-medium text-white transition hover:opacity-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
            Send Bank Details
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== TICKET DELIVERY MODAL ==========
const TicketDelivery = ({ onSend, onClose, customerName }) => {
  const [pnr, setPnr] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [passengerName, setPassengerName] = useState(customerName || "");

  const send = () => {
    if (!pnr || !ticketNumber) return;
    onSend({ pnr: pnr.toUpperCase(), ticketNumber, passengerName });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md shadow-xl" style={{ maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#3C325F15" }}>
              <Ticket size={16} color="#3C325F" />
            </div>
            <h3 className="font-semibold text-gray-900 text-[15px] md:text-base">Deliver E-Ticket</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 -m-1"><X size={20} /></button>
        </div>
        <div className="p-4 md:p-5 space-y-4 overflow-y-auto">
          <Field label="PNR Code">
            <input value={pnr} onChange={e => setPnr(e.target.value)} placeholder="ABCDEF"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-indigo-700" />
          </Field>
          <Field label="Ticket Number">
            <input value={ticketNumber} onChange={e => setTicketNumber(e.target.value)} placeholder="176-1234567890"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-700" />
          </Field>
          <Field label="Passenger Name">
            <input value={passengerName} onChange={e => setPassengerName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-700" />
          </Field>
          <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <strong className="text-amber-900">Note:</strong> In production, you'd upload the actual PDF from Akbar portal here.
          </div>
        </div>
        <div className="p-4 md:p-5 pt-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <button onClick={send} disabled={!pnr || !ticketNumber}
            className="w-full py-2.5 rounded-xl font-medium text-white transition hover:opacity-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #3C325F 0%, #5A4E85 100%)" }}>
            Send E-Ticket to Customer
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== CHAT WINDOW ==========
const ChatWindow = ({ customer, messages, onSend, onSendQuote, onSendPayment, onSendTicket, viewerRole, viewerLang, onBack, onUpdateStage }) => {
  const [input, setInput] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
    setAiSuggestions([]);
    setShowAI(false);
  };

  const generateAI = () => {
    const lastCustomerMsg = [...messages].reverse().find(m => m.from === "customer");
    const suggestions = generateAISuggestions(lastCustomerMsg, customer.name, customer.lang);
    setAiSuggestions(suggestions);
    setShowAI(true);
  };

  const lastQuote = [...messages].reverse().find(m => m.type === "quote");

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full" style={{
      backgroundImage: "radial-gradient(circle at 1px 1px, rgba(60,50,95,0.05) 1px, transparent 0)",
      backgroundSize: "24px 24px"
    }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2.5 md:gap-3 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="md:hidden text-gray-500 hover:text-gray-700 -ml-1 p-1">
            <ChevronLeft size={22} />
          </button>
        )}
        <Avatar name={customer.name} id={customer.id} size={38} online />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate flex items-center gap-1.5 text-[15px]">
            <span className="truncate">{customer.name}</span>
            {customer.tags?.includes("VIP") && (
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">VIP</span>
            )}
          </div>
          <div className="text-[11px] md:text-xs text-gray-500 flex items-center gap-1.5 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span className="truncate">{viewerRole === "customer" ? "Travel agent" : `${LANG_NAMES[customer.lang]} · ${customer.phone}`}</span>
          </div>
        </div>
        {viewerRole !== "customer" && (
          <div className="hidden lg:block flex-shrink-0">
            <StageBadge stage={customer.stage || "new"} />
          </div>
        )}
      </div>

      {/* Pipeline stage selector for staff (desktop only — mobile uses the badge in header) */}
      {viewerRole !== "customer" && onUpdateStage && (
        <div className="hidden md:flex bg-white border-b border-gray-100 px-3 py-2 gap-1.5 overflow-x-auto flex-shrink-0">
          {PIPELINE_STAGES.filter(s => s.id !== "lost").map(s => (
            <button key={s.id} onClick={() => onUpdateStage(s.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                customer.stage === s.id ? "border-current" : "border-transparent text-gray-500 hover:bg-gray-50"
              }`}
              style={customer.stage === s.id ? { backgroundColor: `${s.color}15`, color: s.color } : {}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: compact stage selector */}
      {viewerRole !== "customer" && onUpdateStage && (
        <div className="md:hidden bg-white border-b border-gray-100 px-3 py-2 flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-gray-500 font-medium flex-shrink-0">Stage:</span>
          <select value={customer.stage || "new"} onChange={(e) => onUpdateStage(e.target.value)}
            className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-700">
            {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: "#3C325F15" }}>
              <Sparkles size={28} color="#3C325F" />
            </div>
            <p className="text-gray-600 font-medium mb-1">Start the conversation</p>
            <p className="text-sm text-gray-400 max-w-xs">
              {viewerRole === "customer" ? "Tell us about your travel plans" : "Send a message to get started"}
            </p>
          </div>
        )}
        {messages.map(m => (
          <MessageBubble key={m.id} msg={m}
            isOwn={(viewerRole === "customer" && m.from === "customer") || (viewerRole !== "customer" && m.from === "staff")}
            viewerLang={viewerLang} />
        ))}
      </div>

      {/* AI Suggestions */}
      {viewerRole !== "customer" && showAI && (
        <AISuggestions suggestions={aiSuggestions} onUse={(s) => { setInput(s); setShowAI(false); }} onClose={() => setShowAI(false)} />
      )}

      {/* Quick actions */}
      {viewerRole !== "customer" && showQuick && (
        <div className="bg-white border-t border-gray-200 px-3 py-3 flex gap-2 overflow-x-auto flex-shrink-0">
          {QUICK_ACTIONS.map(({ id, icon: Icon, label, template }) => (
            <button key={id} onClick={() => { setInput(template); setShowQuick(false); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm whitespace-nowrap border border-gray-200 transition">
              <Icon size={14} color="#3C325F" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Action toolbar (staff only) */}
      {viewerRole !== "customer" && (
        <div className="bg-white border-t border-gray-100 px-2 py-1.5 flex gap-1 overflow-x-auto flex-shrink-0">
          <ToolButton icon={Wand2} label="AI Reply" onClick={generateAI} color="#7c3aed" />
          <ToolButton icon={Sparkles} label="Quick" onClick={() => setShowQuick(!showQuick)} color="#3C325F" active={showQuick} />
          <ToolButton icon={Receipt} label="Quote" onClick={() => setShowQuote(true)} color="#3C325F" />
          <ToolButton icon={CreditCard} label="Pay" onClick={() => setShowPayment(true)} color="#d97706" />
          <ToolButton icon={Ticket} label="Ticket" onClick={() => setShowTicket(true)} color="#3C325F" />
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-2 md:px-3 py-2 md:py-3 flex items-end gap-1.5 md:gap-2 flex-shrink-0" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <button className="p-2 md:p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition flex-shrink-0" title="Attach">
          <Paperclip size={18} />
        </button>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 min-w-0 px-3 md:px-4 py-2 md:py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-50 transition resize-none text-[14.5px] max-h-32"
          style={{ minHeight: 40 }} />
        {input.trim() ? (
          <button onClick={send} className="p-2 md:p-2.5 rounded-xl text-white transition hover:opacity-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3C325F 0%, #5A4E85 100%)" }}>
            <Send size={18} />
          </button>
        ) : (
          <button className="p-2 md:p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition flex-shrink-0">
            <Mic size={18} />
          </button>
        )}
      </div>

      {showQuote && <QuoteBuilder onSend={onSendQuote} onClose={() => setShowQuote(false)} customerName={customer.name} />}
      {showPayment && <PaymentLinkBuilder onSend={onSendPayment} onClose={() => setShowPayment(false)} defaultAmount={lastQuote?.quote?.amount || ""} />}
      {showTicket && <TicketDelivery onSend={onSendTicket} onClose={() => setShowTicket(false)} customerName={customer.name} />}
    </div>
  );
};

const ToolButton = ({ icon: Icon, label, onClick, color, active }) => (
  <button onClick={onClick}
    className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-medium whitespace-nowrap transition flex-1 md:flex-initial justify-center ${
      active ? "bg-gray-100" : "hover:bg-gray-50 active:bg-gray-100"
    }`}
    style={{ color }}>
    <Icon size={15} className="flex-shrink-0" />
    <span>{label}</span>
  </button>
);

// ========== CUSTOMER VIEW ==========
const CustomerView = ({ customer, messages, onSend, onLogout }) => {
  const waLink = `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(`Hi, this is ${customer.name}. I want to continue our chat on WhatsApp.`)}`;
  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh", maxHeight: "100dvh" }}>
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between flex-shrink-0 gap-2">
        <Logo size={32} compact />
        <div className="flex items-center gap-1.5">
          <a href={waLink} target="_blank" rel="noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-white transition hover:opacity-95"
            style={{ backgroundColor: "#25D366" }}>
            <MessageSquare size={13} /> WhatsApp
          </a>
          <a href={waLink} target="_blank" rel="noreferrer"
            className="sm:hidden p-2 rounded-lg text-white"
            style={{ backgroundColor: "#25D366" }}>
            <MessageSquare size={15} />
          </a>
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </div>
      <ChatWindow customer={customer} messages={messages} onSend={onSend} viewerRole="customer" viewerLang={customer.lang} />
    </div>
  );
};

// ========== CHAT LIST ITEM ==========
const ChatListItem = ({ customer, lastMsg, unread, active, onClick, assignedStaffName }) => (
  <button onClick={onClick}
    className={`w-full px-3 md:px-4 py-3 flex items-center gap-3 border-b border-gray-100 transition text-left hover:bg-gray-50 active:bg-gray-100 ${active ? "bg-indigo-50/60" : ""}`}>
    <Avatar name={customer.name} id={customer.id} size={44} online={Math.random() > 0.5} />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <span className="font-medium text-gray-900 truncate text-[14px] md:text-[15px] flex items-center gap-1.5 min-w-0">
          <span className="truncate">{customer.name}</span>
          {customer.tags?.includes("VIP") && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-semibold flex-shrink-0">VIP</span>}
        </span>
        <span className={`text-[11px] flex-shrink-0 ${unread ? "text-indigo-800 font-medium" : "text-gray-400"}`}>
          {lastMsg ? formatTime(lastMsg.time) : ""}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`text-[13px] truncate ${unread ? "text-gray-900" : "text-gray-500"}`} dir={lastMsg?.originalLang === "ar" ? "rtl" : "ltr"}>
          {lastMsg?.from === "staff" && <span className="text-gray-400">You: </span>}
          {lastMsg?.type === "quote" ? "📋 Flight quote sent" :
           lastMsg?.type === "payment" ? "💳 Payment link sent" :
           lastMsg?.type === "ticket" ? "🎫 E-ticket delivered" :
           lastMsg?.translated || lastMsg?.text || "No messages"}
        </span>
        {unread > 0 && (
          <span className="flex-shrink-0 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center" style={{ backgroundColor: BRAND.gold, color: "#3C325F" }}>
            {unread}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <StageBadge stage={customer.stage || "new"} />
        {assignedStaffName && <span className="text-[10px] text-gray-400 truncate">→ {assignedStaffName}</span>}
      </div>
    </div>
  </button>
);

// ========== STAFF / ADMIN CHAT VIEW ==========
const StaffView = ({ user, customers, messages, staff, onSend, onSendQuote, onSendPayment, onSendTicket, onUpdateStage, onLogout, onAssign, isAdmin = false, onSwitchToAnalytics, onSwitchToPipeline }) => {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState(isAdmin ? "all" : "mine");

  const visibleCustomers = useMemo(() => {
    let list = customers;
    if (!isAdmin) list = list.filter(c => c.assignedTo === user.id);
    else {
      if (filter === "mine") list = list.filter(c => c.assignedTo === user.id);
      else if (filter === "unassigned") list = list.filter(c => !c.assignedTo);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return [...list].sort((a, b) => {
      const aMsgs = messages[a.id] || [], bMsgs = messages[b.id] || [];
      const aTime = aMsgs.length ? aMsgs[aMsgs.length - 1].time : a.createdAt;
      const bTime = bMsgs.length ? bMsgs[bMsgs.length - 1].time : b.createdAt;
      return bTime - aTime;
    });
  }, [customers, messages, search, filter, isAdmin, user.id]);

  const activeCustomer = customers.find(c => c.id === activeId);
  const unreadCount = (cId) => (messages[cId] || []).filter(m => m.from === "customer" && m.status !== "read").length;

  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh", maxHeight: "100dvh" }}>
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="min-w-0 flex-shrink"><Logo size={34} compact /></div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {isAdmin && (
            <>
              <button onClick={onSwitchToPipeline} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <TrendingUp size={15} /> Pipeline
              </button>
              <button onClick={onSwitchToAnalytics} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <BarChart3 size={15} /> Dashboard
              </button>
            </>
          )}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-gray-50 rounded-lg">
            <Avatar name={user.name} id={user.id} size={24} />
            <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{user.name.split(" ")[0]}</span>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${activeId ? "hidden md:flex" : "flex"} flex-col w-full md:w-[360px] lg:w-[380px] border-r border-gray-200 bg-white flex-shrink-0`}>
          <div className="p-2.5 md:p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-700 text-sm" />
            </div>
            {isAdmin && (
              <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                {[{ id: "all", label: "All" }, { id: "mine", label: "Mine" }, { id: "unassigned", label: "Unassigned" }].map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${filter === f.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            {isAdmin && (
              <div className="flex md:hidden gap-1.5">
                <button onClick={onSwitchToPipeline} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg">
                  <TrendingUp size={13} /> Pipeline
                </button>
                <button onClick={onSwitchToAnalytics} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg">
                  <BarChart3 size={13} /> Stats
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {visibleCustomers.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No conversations</div>}
            {visibleCustomers.map(c => {
              const msgs = messages[c.id] || [];
              const lastMsg = msgs[msgs.length - 1];
              const assignedStaff = staff.find(s => s.id === c.assignedTo);
              return (
                <ChatListItem key={c.id} customer={c} lastMsg={lastMsg} unread={unreadCount(c.id)}
                  active={activeId === c.id} onClick={() => setActiveId(c.id)}
                  assignedStaffName={isAdmin && assignedStaff && assignedStaff.id !== user.id ? assignedStaff.name : null} />
              );
            })}
          </div>
        </div>

        <div className={`${activeId ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
          {activeCustomer ? (
            <>
              {isAdmin && (
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs text-amber-800 font-medium">Assigned to:</span>
                  <select value={activeCustomer.assignedTo || ""} onChange={e => onAssign(activeCustomer.id, e.target.value || null)}
                    className="text-xs bg-white border border-amber-200 rounded-lg px-2 py-1 focus:outline-none">
                    <option value="">Unassigned</option>
                    {staff.filter(s => s.role === "staff").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <ChatWindow
                customer={activeCustomer}
                messages={messages[activeCustomer.id] || []}
                onSend={(text) => onSend(activeCustomer.id, text, user.name)}
                onSendQuote={(q) => onSendQuote(activeCustomer.id, q)}
                onSendPayment={(p) => onSendPayment(activeCustomer.id, p)}
                onSendTicket={(t) => onSendTicket(activeCustomer.id, t)}
                onUpdateStage={(stage) => onUpdateStage(activeCustomer.id, stage)}
                viewerRole="staff" viewerLang="en"
                onBack={() => setActiveId(null)}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "#3C325F10" }}>
                <MessageSquare size={32} color="#3C325F" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Select a conversation</h3>
              <p className="text-sm text-gray-500 max-w-sm">Choose a customer to view chat with auto-translation, AI replies, quotes & ticketing tools.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== PIPELINE BOARD ==========
const PipelineBoard = ({ customers, messages, staff, onUpdateStage, onBack, onOpenChat }) => {
  const stages = PIPELINE_STAGES.filter(s => s.id !== "lost");
  const groupedByStage = useMemo(() => {
    const g = {};
    stages.forEach(s => g[s.id] = []);
    customers.forEach(c => {
      const stage = c.stage || "new";
      if (g[stage]) g[stage].push(c);
    });
    return g;
  }, [customers]);

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: "100dvh", maxHeight: "100dvh" }}>
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <ChevronLeft size={18} />
          </button>
          <Logo size={32} compact />
          <div className="hidden md:block ml-2 px-3 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">Sales Pipeline</div>
          <div className="md:hidden text-sm font-medium text-gray-700 truncate">Pipeline</div>
        </div>
      </div>

      {/* Mobile: vertical stacked stages */}
      <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3">
        {stages.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100" style={{ backgroundColor: `${s.color}08` }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="font-medium text-sm text-gray-900">{s.label}</span>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                {groupedByStage[s.id].length}
              </span>
            </div>
            <div className="p-2 space-y-2">
              {groupedByStage[s.id].length === 0 && (
                <div className="text-center text-xs text-gray-400 py-4">No leads in this stage</div>
              )}
              {groupedByStage[s.id].map(c => {
                const msgs = messages[c.id] || [];
                const lastMsg = msgs[msgs.length - 1];
                const lastQuote = [...msgs].reverse().find(m => m.type === "quote");
                const assignedStaff = staff.find(st => st.id === c.assignedTo);
                return (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-3 active:bg-gray-100 transition cursor-pointer"
                    onClick={() => onOpenChat(c.id)}>
                    <div className="flex items-start gap-2 mb-2">
                      <Avatar name={c.name} id={c.id} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 truncate">
                          {c.name}
                          {c.tags?.includes("VIP") && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-semibold">VIP</span>}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">{c.phone}</div>
                      </div>
                      {lastMsg && <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(lastMsg.time)}</span>}
                    </div>
                    {lastQuote && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-700 bg-white rounded-lg px-2 py-1.5 mb-2 border border-gray-200">
                        <Receipt size={11} color="#3C325F" />
                        <span className="font-semibold">{lastQuote.quote.amount} BHD</span>
                        <span className="text-gray-400 truncate">· {lastQuote.quote.flights[0]?.from}→{lastQuote.quote.flights[lastQuote.quote.flights.length-1]?.to}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <select value={c.stage || "new"} onChange={(e) => { e.stopPropagation(); onUpdateStage(c.id, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none">
                        {PIPELINE_STAGES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                      </select>
                      {assignedStaff && (
                        <span className="text-[10px] text-gray-500 bg-white border border-gray-200 px-1.5 py-1 rounded">{assignedStaff.name.split(" ")[0]}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: horizontal kanban */}
      <div className="hidden md:block flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 min-w-max h-full">
          {stages.map(s => (
            <div key={s.id} className="w-72 flex-shrink-0 flex flex-col bg-gray-100 rounded-2xl">
              <div className="px-3 py-3 flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-medium text-sm text-gray-900">{s.label}</span>
                </div>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full font-medium">{groupedByStage[s.id].length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {groupedByStage[s.id].length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-8">No leads</div>
                )}
                {groupedByStage[s.id].map(c => {
                  const msgs = messages[c.id] || [];
                  const lastMsg = msgs[msgs.length - 1];
                  const lastQuote = [...msgs].reverse().find(m => m.type === "quote");
                  const assignedStaff = staff.find(st => st.id === c.assignedTo);
                  return (
                    <div key={c.id} className="bg-white rounded-xl p-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition cursor-pointer group"
                      onClick={() => onOpenChat(c.id)}>
                      <div className="flex items-start gap-2 mb-2">
                        <Avatar name={c.name} id={c.id} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-900 truncate">
                            {c.name}
                            {c.tags?.includes("VIP") && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-semibold">VIP</span>}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">{c.phone}</div>
                        </div>
                      </div>
                      {lastQuote && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5 mb-2">
                          <Receipt size={11} color="#3C325F" />
                          <span className="font-semibold">{lastQuote.quote.amount} BHD</span>
                          <span className="text-gray-400 truncate">· {lastQuote.quote.flights[0]?.from}→{lastQuote.quote.flights[lastQuote.quote.flights.length-1]?.to}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{lastMsg ? formatTime(lastMsg.time) : "No messages"}</span>
                        {assignedStaff && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{assignedStaff.name.split(" ")[0]}</span>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <select value={c.stage || "new"} onChange={(e) => { e.stopPropagation(); onUpdateStage(c.id, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-1 flex-1 focus:outline-none">
                          {PIPELINE_STAGES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ========== ADMIN ANALYTICS ==========
const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-3 md:p-4">
    <div className="flex items-center justify-between mb-2 md:mb-3">
      <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon size={16} color={color} />
      </div>
    </div>
    <div className="text-xl md:text-2xl font-semibold text-gray-900 truncate" style={{ letterSpacing: "-0.02em" }}>{value}</div>
    <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate">{label}</div>
    {subtext && <div className="text-[10px] text-gray-400 mt-0.5">{subtext}</div>}
  </div>
);

const AdminAnalytics = ({ customers, messages, staff, onBack }) => {
  const totalCustomers = customers.length;
  const totalMessages = Object.values(messages).reduce((sum, arr) => sum + arr.length, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  const todayChats = customers.filter(c => c.createdAt >= today).length;
  const unassigned = customers.filter(c => !c.assignedTo).length;
  const activeChats = Object.entries(messages).filter(([, arr]) => arr.length > 0 && arr[arr.length - 1].time > Date.now() - 86400000).length;

  // Revenue from quotes
  const allQuotes = Object.values(messages).flat().filter(m => m.type === "quote");
  const totalQuoted = allQuotes.reduce((s, q) => s + (parseFloat(q.quote?.amount) || 0), 0);
  const ticketed = customers.filter(c => c.stage === "ticketed" || c.stage === "done").length;

  const langDist = customers.reduce((acc, c) => { acc[c.lang] = (acc[c.lang] || 0) + 1; return acc; }, {});
  const stageDist = customers.reduce((acc, c) => { const s = c.stage || "new"; acc[s] = (acc[s] || 0) + 1; return acc; }, {});

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: "100dvh", maxHeight: "100dvh" }}>
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <ChevronLeft size={18} />
          </button>
          <Logo size={32} compact />
        </div>
        <span className="text-[11px] md:text-xs text-gray-500 px-2 md:px-3 py-1.5 flex-shrink-0">
          Live database
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">Admin Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">Overview of all customer conversations and team activity</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Users} label="Total Customers" value={totalCustomers} color="#3C325F" />
            <StatCard icon={MessageSquare} label="Total Messages" value={totalMessages} color="#1e40af" />
            <StatCard icon={Receipt} label="Total Quoted" value={`${totalQuoted.toFixed(0)}`} color="#7c2d12" subtext="BHD" />
            <StatCard icon={Ticket} label="Tickets Issued" value={ticketed} color="#10b981" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={TrendingUp} label="Today's Inquiries" value={todayChats} color="#be185d" />
            <StatCard icon={Clock} label="Active Chats (24h)" value={activeChats} color="#7c3aed" />
            <StatCard icon={Bell} label="Unassigned" value={unassigned} color="#d97706" />
            <StatCard icon={UserCheck} label="Conversion Rate" value={`${totalCustomers ? Math.round((ticketed / totalCustomers) * 100) : 0}%`} color="#3C325F" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={16} color="#3C325F" /> Pipeline Status
              </h3>
              <div className="space-y-3">
                {PIPELINE_STAGES.map(s => {
                  const count = stageDist[s.id] || 0;
                  const pct = totalCustomers ? (count / totalCustomers) * 100 : 0;
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </span>
                        <span className="text-gray-500">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Globe size={16} color="#3C325F" /> Customer Languages
              </h3>
              <div className="space-y-3">
                {Object.entries(langDist).sort((a, b) => b[1] - a[1]).map(([lang, count]) => {
                  const pct = (count / totalCustomers) * 100;
                  return (
                    <div key={lang}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{LANG_NAMES[lang] || lang}</span>
                        <span className="text-gray-500">{count} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3C325F, #5A4E85)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">All Customers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Phone</th>
                    <th className="text-left px-5 py-3 font-medium">Stage</th>
                    <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Language</th>
                    <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => {
                    const assignedStaff = staff.find(s => s.id === c.assignedTo);
                    return (
                      <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.name} id={c.id} size={32} />
                            <div>
                              <div className="font-medium text-gray-900">{c.name}</div>
                              <div className="text-xs text-gray-500 md:hidden">{c.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{c.phone}</td>
                        <td className="px-5 py-3"><StageBadge stage={c.stage || "new"} /></td>
                        <td className="px-5 py-3 text-gray-600 hidden lg:table-cell">{LANG_NAMES[c.lang]}</td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          {assignedStaff ? <span className="text-gray-700">{assignedStaff.name}</span> :
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs font-medium">Unassigned</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== MAIN APP ==========
export default function App() {
  const { customers, messages, staff, loaded, saveCustomer, sendMessage, markRead } = useAppData();
  const [view, setView] = useState("role");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  const handleRoleSelect = (role) => {
    if (role === "customer") setView("customerForm");
    else if (role === "staff") setView("staffLogin");
    else if (role === "admin") setView("adminLogin");
  };

  const handleCustomerStart = async ({ name, phone, email }) => {
    let cust = await db.findCustomerByPhone(phone);
    if (!cust) {
      cust = {
        id: `c${Date.now()}`, name, phone, email, lang: "en",
        assignedTo: staff.find(s => s.role === "staff")?.id || null,
        stage: "new", createdAt: Date.now(), tags: []
      };
      await saveCustomer(cust);
    }
    setCurrentCustomer(cust);
    setView("customer");
  };

  const handleStaffLogin = (user) => {
    setCurrentUser(user);
    setView(user.role === "admin" ? "admin" : "staff");
  };

  const handleLogout = () => {
    setCurrentUser(null); setCurrentCustomer(null); setView("role");
  };

  const handleCustomerSend = async (text) => {
    const lang = detectLanguage(text);
    const translated = await translateText(text, "en");
    const newMsg = {
      id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      customerId: currentCustomer.id,
      from: "customer", text, originalLang: lang, translated,
      time: Date.now(), status: "delivered"
    };
    await sendMessage(newMsg);
    if (currentCustomer.lang !== lang) {
      const updated = { ...currentCustomer, lang };
      await saveCustomer(updated);
      setCurrentCustomer(updated);
    }
  };

  const handleStaffSend = async (customerId, text, staffName) => {
    const customer = customers.find(c => c.id === customerId);
    const translated = customer ? await translateText(text, customer.lang) : text;
    const newMsg = {
      id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      customerId,
      from: "staff", text, originalLang: "en",
      translated, time: Date.now(), status: "delivered", staffName
    };
    await sendMessage(newMsg);
    await markRead(customerId);
  };

  const handleSendQuote = async (customerId, quote) => {
    const customer = customers.find(c => c.id === customerId);
    const translated = customer ? await translateText("Here is your quote", customer.lang) : "Here is your quote";
    const newMsg = {
      id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      customerId,
      from: "staff", type: "quote", quote,
      text: `Flight quote: ${quote.amount} BHD`,
      translated, originalLang: "en", time: Date.now(), status: "delivered"
    };
    await sendMessage(newMsg);
    if (customer && customer.stage === "new") {
      await saveCustomer({ ...customer, stage: "quoted" });
    }
  };

  const handleSendPayment = async (customerId, payment) => {
    const customer = customers.find(c => c.id === customerId);
    const translated = customer ? await translateText("Payment details", customer.lang) : "Payment details";
    const newMsg = {
      id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      customerId,
      from: "staff", type: "payment", payment,
      text: `Payment: ${payment.amount} BHD`,
      translated, originalLang: "en", time: Date.now(), status: "delivered"
    };
    await sendMessage(newMsg);
  };

  const handleSendTicket = async (customerId, ticket) => {
    const customer = customers.find(c => c.id === customerId);
    const translated = customer ? await translateText("Your ticket is ready", customer.lang) : "Your ticket is ready";
    const newMsg = {
      id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      customerId,
      from: "staff", type: "ticket", ticket,
      text: `E-ticket: ${ticket.pnr}`,
      translated, originalLang: "en", time: Date.now(), status: "delivered"
    };
    await sendMessage(newMsg);
    if (customer) {
      await saveCustomer({ ...customer, stage: "ticketed" });
    }
  };

  const handleAssign = async (customerId, staffId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) await saveCustomer({ ...customer, assignedTo: staffId });
  };

  const handleUpdateStage = async (customerId, stage) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) await saveCustomer({ ...customer, stage });
  };

  if (!loaded) {
    return (
      <>
        <BrandFontLoader />
        <div className="flex items-center justify-center bg-gray-50" style={{ height: "100dvh" }}>
          <div className="text-center">
            <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: BRAND.primary, borderTopColor: "transparent" }} />
            <p className="text-sm text-gray-500">Loading Salam Bahrain Travel...</p>
          </div>
        </div>
      </>
    );
  }

  let screen;
  if (view === "role") screen = <RoleSelector onSelect={handleRoleSelect} />;
  else if (view === "customerForm") screen = <CustomerForm onSubmit={handleCustomerStart} onBack={() => setView("role")} />;
  else if (view === "staffLogin") screen = <Login role="staff" staff={staff} onLogin={handleStaffLogin} onBack={() => setView("role")} />;
  else if (view === "adminLogin") screen = <Login role="admin" staff={staff} onLogin={handleStaffLogin} onBack={() => setView("role")} />;
  else if (view === "customer" && currentCustomer) {
    screen = <CustomerView customer={currentCustomer} messages={messages[currentCustomer.id] || []}
      onSend={handleCustomerSend} onLogout={handleLogout} />;
  }
  else if (view === "staff" && currentUser) {
    screen = <StaffView user={currentUser} customers={customers} messages={messages} staff={staff}
      onSend={handleStaffSend} onSendQuote={handleSendQuote} onSendPayment={handleSendPayment} onSendTicket={handleSendTicket}
      onUpdateStage={handleUpdateStage} onLogout={handleLogout} onAssign={handleAssign} />;
  }
  else if (view === "admin" && currentUser) {
    screen = <StaffView user={currentUser} customers={customers} messages={messages} staff={staff}
      onSend={handleStaffSend} onSendQuote={handleSendQuote} onSendPayment={handleSendPayment} onSendTicket={handleSendTicket}
      onUpdateStage={handleUpdateStage} onLogout={handleLogout} onAssign={handleAssign}
      isAdmin onSwitchToAnalytics={() => setView("adminAnalytics")} onSwitchToPipeline={() => setView("pipeline")} />;
  }
  else if (view === "pipeline" && currentUser) {
    screen = <PipelineBoard customers={customers} messages={messages} staff={staff}
      onUpdateStage={handleUpdateStage} onBack={() => setView("admin")}
      onOpenChat={(id) => { setView("admin"); }} />;
  }
  else if (view === "adminAnalytics" && currentUser) {
    screen = <AdminAnalytics customers={customers} messages={messages} staff={staff}
      onBack={() => setView("admin")} />;
  }
  else screen = <RoleSelector onSelect={handleRoleSelect} />;

  return <><BrandFontLoader />{screen}</>;
}
