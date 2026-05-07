import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kvacsirxpbseexfigdtx.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_2kfiOEuPtFh_0JG0fEd6gQ_6dawiBlb";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});

// ============== TRANSLATION (MyMemory free API) ==============
const translateCache = new Map();

export const translateText = async (text, targetLang) => {
  if (!text || !targetLang) return text;

  const sourceLang = detectLanguage(text);
  if (sourceLang === targetLang) return text;

  const cacheKey = `${text}::${sourceLang}::${targetLang}`;
  if (translateCache.has(cacheKey)) return translateCache.get(cacheKey);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data?.responseData?.translatedText || text;
    translateCache.set(cacheKey, translated);
    return translated;
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
};

export const detectLanguage = (text) => {
  if (!text) return "en";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml";
  if (/[\u0E00-\u0E7F]/.test(text)) return "th";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  return "en";
};

// ============== DATABASE OPERATIONS ==============

export const db = {
  async getCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) console.error(error);
    return (data || []).map(rowToCustomer);
  },

  async getMessages(customerId) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("customer_id", customerId)
      .order("time", { ascending: true });
    if (error) console.error(error);
    return (data || []).map(rowToMessage);
  },

  async getStaff() {
    const { data, error } = await supabase.from("staff").select("*");
    if (error) console.error(error);
    return data || [];
  },

  async upsertCustomer(customer) {
    const row = customerToRow(customer);
    row.updated_at = Date.now();
    const { error } = await supabase.from("customers").upsert(row);
    if (error) console.error("upsertCustomer:", error);
  },

  async findCustomerByPhone(phone) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .limit(1);
    if (error) console.error(error);
    return data?.[0] ? rowToCustomer(data[0]) : null;
  },

  async insertMessage(message) {
    const row = messageToRow(message);
    const { error } = await supabase.from("messages").insert(row);
    if (error) console.error("insertMessage:", error);
  },

  async markMessagesRead(customerId) {
    const { error } = await supabase
      .from("messages")
      .update({ status: "read" })
      .eq("customer_id", customerId)
      .eq("from_role", "customer")
      .neq("status", "read");
    if (error) console.error("markMessagesRead:", error);
  },

  // Real-time subscriptions
  subscribeToMessages(callback) {
    return supabase
      .channel("messages-channel")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => callback(payload)
      )
      .subscribe();
  },

  subscribeToCustomers(callback) {
    return supabase
      .channel("customers-channel")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        (payload) => callback(payload)
      )
      .subscribe();
  }
};

// Mappers between DB rows (snake_case) and JS objects (camelCase)
const rowToCustomer = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  lang: row.lang,
  assignedTo: row.assigned_to,
  stage: row.stage,
  tags: row.tags || [],
  createdAt: Number(row.created_at)
});

const customerToRow = (c) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  email: c.email || null,
  lang: c.lang || "en",
  assigned_to: c.assignedTo || null,
  stage: c.stage || "new",
  tags: c.tags || [],
  created_at: c.createdAt
});

const rowToMessage = (row) => ({
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
  ...(row.payload || {})  // Spread quote/payment/ticket data
});

const messageToRow = (m) => ({
  id: m.id,
  customer_id: m.customerId,
  from_role: m.from,
  text: m.text || null,
  translated: m.translated || null,
  original_lang: m.originalLang || "en",
  type: m.type || "text",
  payload: m.type !== "text" ? extractPayload(m) : null,
  status: m.status || "delivered",
  staff_name: m.staffName || null,
  time: m.time
});

const extractPayload = (m) => {
  if (m.type === "quote") return { quote: m.quote };
  if (m.type === "payment") return { payment: m.payment };
  if (m.type === "ticket") return { ticket: m.ticket };
  return null;
};
