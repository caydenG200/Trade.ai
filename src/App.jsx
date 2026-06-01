import { useState, useEffect, useRef, useCallback } from "react";

// ─── CURRENCIES (no duplicates) ────────────────────────────────────────────
const CURRENCIES = [
  { code:"USD", name:"US Dollar",          symbol:"$",   flag:"🇺🇸" },
  { code:"SGD", name:"Singapore Dollar",   symbol:"S$",  flag:"🇸🇬" },
  { code:"EUR", name:"Euro",               symbol:"€",   flag:"🇪🇺" },
  { code:"GBP", name:"British Pound",      symbol:"£",   flag:"🇬🇧" },
  { code:"AUD", name:"Australian Dollar",  symbol:"A$",  flag:"🇦🇺" },
  { code:"CAD", name:"Canadian Dollar",    symbol:"C$",  flag:"🇨🇦" },
  { code:"JPY", name:"Japanese Yen",       symbol:"¥",   flag:"🇯🇵" },
  { code:"CNY", name:"Chinese Yuan",       symbol:"¥",   flag:"🇨🇳" },
  { code:"HKD", name:"Hong Kong Dollar",   symbol:"HK$", flag:"🇭🇰" },
  { code:"INR", name:"Indian Rupee",       symbol:"₹",   flag:"🇮🇳" },
  { code:"KRW", name:"South Korean Won",   symbol:"₩",   flag:"🇰🇷" },
  { code:"MYR", name:"Malaysian Ringgit",  symbol:"RM",  flag:"🇲🇾" },
  { code:"THB", name:"Thai Baht",          symbol:"฿",   flag:"🇹🇭" },
  { code:"IDR", name:"Indonesian Rupiah",  symbol:"Rp",  flag:"🇮🇩" },
  { code:"PHP", name:"Philippine Peso",    symbol:"₱",   flag:"🇵🇭" },
  { code:"VND", name:"Vietnamese Dong",    symbol:"₫",   flag:"🇻🇳" },
  { code:"TWD", name:"Taiwan Dollar",      symbol:"NT$", flag:"🇹🇼" },
  { code:"NZD", name:"New Zealand Dollar", symbol:"NZ$", flag:"🇳🇿" },
  { code:"CHF", name:"Swiss Franc",        symbol:"Fr",  flag:"🇨🇭" },
  { code:"SEK", name:"Swedish Krona",      symbol:"kr",  flag:"🇸🇪" },
  { code:"NOK", name:"Norwegian Krone",    symbol:"kr",  flag:"🇳🇴" },
  { code:"DKK", name:"Danish Krone",       symbol:"kr",  flag:"🇩🇰" },
  { code:"BRL", name:"Brazilian Real",     symbol:"R$",  flag:"🇧🇷" },
  { code:"MXN", name:"Mexican Peso",       symbol:"$",   flag:"🇲🇽" },
  { code:"ZAR", name:"South African Rand", symbol:"R",   flag:"🇿🇦" },
  { code:"AED", name:"UAE Dirham",         symbol:"د.إ", flag:"🇦🇪" },
  { code:"SAR", name:"Saudi Riyal",        symbol:"SR",  flag:"🇸🇦" },
  { code:"TRY", name:"Turkish Lira",       symbol:"₺",   flag:"🇹🇷" },
  { code:"PLN", name:"Polish Zloty",       symbol:"zł",  flag:"🇵🇱" },
  { code:"CZK", name:"Czech Koruna",       symbol:"Kč",  flag:"🇨🇿" },
];

// ─── DEFAULT STOCKS (updated to June 2026 approximate prices) ─────────────
const DEFAULT_STOCKS = {
  AAPL: { name:"Apple Inc.",       basePrice:211.00, sector:"Technology",     exchange:"NASDAQ", country:"US", currency:"USD" },
  TSLA: { name:"Tesla Inc.",       basePrice:342.00, sector:"EV / Auto",      exchange:"NASDAQ", country:"US", currency:"USD" },
  NVDA: { name:"NVIDIA Corp.",     basePrice:135.00, sector:"Semiconductors", exchange:"NASDAQ", country:"US", currency:"USD" },
  MSFT: { name:"Microsoft Corp.",  basePrice:457.00, sector:"Technology",     exchange:"NASDAQ", country:"US", currency:"USD" },
  AMZN: { name:"Amazon.com Inc.",  basePrice:225.00, sector:"E-Commerce",     exchange:"NASDAQ", country:"US", currency:"USD" },
};

// ─── DATA SOURCES ──────────────────────────────────────────────────────────
const DATA_SOURCES = [
  { id:"simulated",    name:"Simulated (Demo)",  desc:"Realistic demo prices. No API key needed.", free:true },
  { id:"alphavantage", name:"Alpha Vantage",      desc:"Free: 25 real quotes/day — alphavantage.co", free:true },
  { id:"twelvedata",   name:"Twelve Data",        desc:"Free: 800 real quotes/day — twelvedata.com", free:true },
  { id:"finnhub",      name:"Finnhub",            desc:"Free: 60 real quotes/min — finnhub.io", free:true },
];

const COUNTRY_FLAGS = {
  US:"🇺🇸",GB:"🇬🇧",UK:"🇬🇧",IN:"🇮🇳",JP:"🇯🇵",CN:"🇨🇳",HK:"🇭🇰",
  AU:"🇦🇺",CA:"🇨🇦",DE:"🇩🇪",FR:"🇫🇷",KR:"🇰🇷",SG:"🇸🇬",BR:"🇧🇷",
  NL:"🇳🇱",CH:"🇨🇭",SE:"🇸🇪",TW:"🇹🇼",SA:"🇸🇦",AE:"🇦🇪",MY:"🇲🇾",
  TH:"🇹🇭",ID:"🇮🇩",PH:"🇵🇭",VN:"🇻🇳",NZ:"🇳🇿",PL:"🇵🇱",MX:"🇲🇽",ZA:"🇿🇦",TR:"🇹🇷",
};
const getFlag = c => COUNTRY_FLAGS[c] || "🌐";

// ─── HELPERS ───────────────────────────────────────────────────────────────
const generateStockData = (basePrice) => {
  let price = basePrice;
  return Array.from({ length: 40 }, () => {
    price = Math.max(price + (Math.random() - 0.48) * price * 0.018, basePrice * 0.5);
    return { price: +price.toFixed(2), volume: Math.floor(Math.random() * 5e6) + 5e5 };
  });
};

const calcRSI = (prices) => {
  if (prices.length < 14) return 50;
  let g = 0, l = 0;
  for (let i = 1; i < 15; i++) { const d = prices[i] - prices[i-1]; d > 0 ? g += d : l += Math.abs(d); }
  return +((100 - 100 / (1 + (g/14) / ((l/14) || 0.0001))).toFixed(1));
};
const calcMA = (prices, n) => {
  const sl = prices.slice(-Math.min(n, prices.length));
  return +(sl.reduce((a,b) => a+b, 0) / sl.length).toFixed(2);
};
const calcBB = (prices, n = 20) => {
  const ma = calcMA(prices, n);
  const sl = prices.slice(-Math.min(n, prices.length));
  const std = Math.sqrt(sl.reduce((a,b) => a + (b-ma)**2, 0) / sl.length);
  return { upper: +(ma + 2*std).toFixed(2), lower: +(ma - 2*std).toFixed(2), mid: ma };
};

// ─── RULE-BASED ANALYSIS ENGINE ────────────────────────────────────────────
function analyzeStock(sym, prices, question = "") {
  if (prices.length < 5) return {
    action:"HOLD", confidence:"Low",
    reasoning:"Not enough price data yet. Please wait a moment for data to load.",
    summary:"Insufficient data for analysis.",
    entryPrice:null, targetPrice:null, stopLoss:null, riskLevel:"Medium"
  };

  const cur  = prices[prices.length-1];
  const rsi  = calcRSI(prices);
  const ma5  = calcMA(prices, 5);
  const ma10 = calcMA(prices, 10);
  const ma20 = calcMA(prices, 20);
  const bb   = calcBB(prices, 20);
  const change1d     = +((cur - prices[0]) / prices[0] * 100).toFixed(2);
  const recentTrend  = prices[prices.length-1] > prices[prices.length-5] ? "upward" : "downward";
  const goldenCross  = ma5 > ma10 && ma10 > ma20;
  const deathCross   = ma5 < ma10 && ma10 < ma20;
  const nearBBLower  = cur <= bb.lower * 1.01;
  const nearBBUpper  = cur >= bb.upper * 0.99;

  let score = 0, reasons = [], risks = [];

  // RSI
  if      (rsi < 25) { score += 4; reasons.push(`RSI at ${rsi} — extremely oversold, strong reversal zone`); }
  else if (rsi < 35) { score += 2; reasons.push(`RSI at ${rsi} — oversold, buyers historically step in here`); }
  else if (rsi < 45) { score += 1; reasons.push(`RSI at ${rsi} — slightly below neutral, mild bullish lean`); }
  else if (rsi > 75) { score -= 4; reasons.push(`RSI at ${rsi} — extremely overbought, high reversal risk`); risks.push("RSI extremely overbought"); }
  else if (rsi > 65) { score -= 2; reasons.push(`RSI at ${rsi} — overbought, momentum may be stalling`); risks.push("RSI overbought"); }
  else if (rsi > 55) { score -= 1; reasons.push(`RSI at ${rsi} — slightly elevated, watch for pullback`); }
  else               { reasons.push(`RSI at ${rsi} — neutral range, no strong momentum signal`); }

  // MA crossover
  if  (goldenCross) { score += 2; reasons.push("Golden cross: MA5 > MA10 > MA20 — bullish trend confirmed"); }
  if  (deathCross)  { score -= 2; reasons.push("Death cross: MA5 < MA10 < MA20 — bearish trend confirmed"); risks.push("Bearish MA crossover (death cross)"); }
  if  (cur > ma10)  { score += 1; reasons.push(`Price above MA10 (${ma10}) — short-term bullish`); }
  else              { score -= 1; reasons.push(`Price below MA10 (${ma10}) — short-term bearish`); }
  if  (cur > ma20)  { score += 1; }
  else              { score -= 1; risks.push("Price below 20-day average"); }

  // Bollinger Bands
  if (nearBBLower) { score += 2; reasons.push("Near lower Bollinger Band — statistical bounce zone"); }
  if (nearBBUpper) { score -= 2; reasons.push("Near upper Bollinger Band — resistance, possible reversal"); risks.push("Near upper BB resistance"); }

  // Trend
  if (recentTrend === "upward"   && change1d >  1.5) { score += 1; reasons.push(`Up ${change1d}% today — positive momentum`); }
  if (recentTrend === "downward" && change1d < -2.0) { score -= 1; reasons.push(`Down ${Math.abs(change1d)}% today — selling pressure`); risks.push("Active selling pressure"); }

  // Question context
  const q = question.toLowerCase();
  const isSellQ   = q.includes("sell") || q.includes("exit") || q.includes("take profit");
  const isBuyQ    = q.includes("buy")  || q.includes("entry") || q.includes("long");
  const isRiskQ   = q.includes("risk") || q.includes("safe");
  const isTargetQ = q.includes("target") || q.includes("price");
  const isTrendQ  = q.includes("trend") || q.includes("direction");

  // Determine action
  let action, confidence;
  if      (score >= 5)  { action = "BUY";  confidence = "High"; }
  else if (score >= 3)  { action = "BUY";  confidence = "Medium"; }
  else if (score >= 1)  { action = "BUY";  confidence = "Low"; }
  else if (score <= -5) { action = "SELL"; confidence = "High"; }
  else if (score <= -3) { action = "SELL"; confidence = "Medium"; }
  else if (score <= -1) { action = "SELL"; confidence = "Low"; }
  else                  { action = "HOLD"; confidence = "Medium"; }

  if (isRiskQ) risks.push("Always use stop-losses and never risk more than 1-2% of your portfolio per trade.");

  const entryPrice  = action === "BUY"  ? +cur.toFixed(2) : null;
  const targetPrice = action === "BUY"  ? +(cur * (rsi < 40 ? 1.09 : 1.05)).toFixed(2)
                    : action === "SELL" ? +(cur * 0.95).toFixed(2) : null;
  const stopLoss    = action === "BUY"  ? +(cur * 0.95).toFixed(2)
                    : action === "SELL" ? +(cur * 1.03).toFixed(2) : null;
  const riskLevel   = Math.abs(score) >= 5 ? "Low" : Math.abs(score) >= 3 ? "Medium" : "High";

  const reasoning = reasons.slice(0,2).join(". ") + "." + (risks.length ? ` Risk: ${risks[0]}.` : "");

  let summary = "";
  if      (isTrendQ)  summary = `${sym} is trending ${recentTrend}. MA alignment is ${goldenCross?"bullish (golden cross)":deathCross?"bearish (death cross)":"mixed"}, RSI at ${rsi}.`;
  else if (isRiskQ)   summary = `Risk is ${riskLevel.toLowerCase()}. ${risks.length ? risks.join(" ") : "No major red flags, but always use stop-losses."}`;
  else if (isTargetQ) summary = action === "BUY" ? `Reasonable target: ${targetPrice} with stop-loss at ${stopLoss}.` : `No clear upside target — wait for a better entry.`;
  else if (isSellQ)   summary = action === "SELL" ? `${confidence} SELL signal. RSI at ${rsi}, price ${cur > ma20 ? "above" : "below"} MA20 of ${ma20}.` : `No strong sell signal — indicators lean ${action}.`;
  else if (isBuyQ)    summary = action === "BUY"  ? `${confidence} confidence BUY on ${sym}. ${reasons[0] || ""}` : `Not an ideal buy entry — indicators suggest ${action}.`;
  else                summary = `${confidence} ${action} signal for ${sym}. ${reasons[0] || "Indicators are mixed."}`;

  return { action, confidence, reasoning, entryPrice, targetPrice, stopLoss, riskLevel, summary, score, rsi, ma10, ma20, recentTrend, change1d };
}

// ─── SEARCH PROMPT ─────────────────────────────────────────────────────────
const SEARCH_SYSTEM = `You are a global stock market database. Return up to 6 stocks matching the query from any exchange worldwide.
Respond ONLY with a valid JSON array, no markdown, no code fences.
Each element must have: symbol, name, exchange, sector, country (2-letter ISO), currency (ISO code), basePrice (number).
Use accurate current tickers. Examples: Reliance=RELIANCE.NS, Samsung=005930.KS, HSBC=HSBA.L, BHP=BHP.AX, Alibaba=9988.HK, Toyota=7203.T`;

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function TradingAssistant() {
  const [stocks, setStocks]                   = useState(DEFAULT_STOCKS);
  const [selectedStock, setSelectedStock]     = useState("AAPL");
  const [stockData, setStockData]             = useState({});
  const [realPrices, setRealPrices]           = useState({});
  const [fxRates, setFxRates]                 = useState({ USD:1 });
  const [fxStatus, setFxStatus]               = useState("loading"); // loading|ok|error
  const [fxLastFetch, setFxLastFetch]         = useState(null);
  const [autoAlert, setAutoAlert]             = useState(false);
  const [messages, setMessages]               = useState([{
    role:"assistant",
    text:"Welcome to TradeAI! Ask me anything — I analyse RSI, moving averages, Bollinger Bands and price momentum to give instant BUY / SELL / HOLD signals. Use Settings (top-right) to change your currency or connect live data.",
    action:null
  }]);
  const [input, setInput]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [alertLog, setAlertLog]               = useState([]);
  const [tab, setTab]                         = useState("chat");
  // search
  const [showSearch, setShowSearch]           = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [searchResults, setSearchResults]     = useState([]);
  const [searching, setSearching]             = useState(false);
  // settings
  const [showSettings, setShowSettings]       = useState(false);
  const [settingsTab, setSettingsTab]         = useState("currency"); // currency|data
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [currSearch, setCurrSearch]           = useState("");
  const [dataSource, setDataSource]           = useState("simulated");
  const [apiKey, setApiKey]                   = useState("");
  const [savedApiKey, setSavedApiKey]         = useState("");
  const [apiStatus, setApiStatus]             = useState("idle"); // idle|testing|ok|error|quota
  const [liveEnabled, setLiveEnabled]         = useState(false);
  const [apiError, setApiError]               = useState("");

  const messagesEndRef = useRef(null);
  const stocksRef      = useRef(stocks);
  const stockDataRef   = useRef(stockData);
  const liveRef        = useRef(liveEnabled);
  const savedKeyRef    = useRef(savedApiKey);
  const dataSourceRef  = useRef(dataSource);
  stocksRef.current    = stocks;
  stockDataRef.current = stockData;
  liveRef.current      = liveEnabled;
  savedKeyRef.current  = savedApiKey;
  dataSourceRef.current = dataSource;

  // ── FX RATES via open.er-api.com (free, no key needed) ──────────────────
  const fetchFX = useCallback(async () => {
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD");
      const d = await r.json();
      if (d.result === "success" && d.rates) {
        setFxRates({ ...d.rates, USD: 1 });
        setFxLastFetch(new Date());
        setFxStatus("ok");
      } else {
        setFxStatus("error");
      }
    } catch {
      setFxStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchFX();
    const t = setInterval(fetchFX, 3_600_000);
    return () => clearInterval(t);
  }, [fetchFX]);

  // convert price from native currency → displayCurrency
  const convert = useCallback((price, nativeCurrency) => {
    if (!price || isNaN(price)) return 0;
    const native = nativeCurrency || "USD";
    if (native === displayCurrency) return price;
    const inUSD = native === "USD" ? price : price / (fxRates[native] || 1);
    return inUSD * (fxRates[displayCurrency] || 1);
  }, [fxRates, displayCurrency]);

  const fmt = useCallback((price, nativeCurrency) => {
    const c   = CURRENCIES.find(x => x.code === displayCurrency) || CURRENCIES[0];
    const val = convert(price, nativeCurrency || "USD");
    if (!val && val !== 0) return `${c.symbol}—`;
    const bigUnits = ["JPY","KRW","VND","IDR","CLP","HUF"];
    if (bigUnits.includes(displayCurrency)) return `${c.symbol}${Math.round(val).toLocaleString()}`;
    if (val >= 10_000) return `${c.symbol}${val.toLocaleString(undefined, { maximumFractionDigits:0 })}`;
    return `${c.symbol}${val.toFixed(2)}`;
  }, [convert, displayCurrency]);

  // ── INIT STOCK DATA ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = {};
    Object.entries(DEFAULT_STOCKS).forEach(([sym, inf]) => {
      init[sym] = generateStockData(inf.basePrice);
    });
    setStockData(init);
  }, []);

  // ── FETCH LIVE PRICE ─────────────────────────────────────────────────────
  // Returns { price, error } — never throws
  const fetchLivePrice = useCallback(async (sym) => {
    const key = savedKeyRef.current;
    const src = dataSourceRef.current;
    if (!key || !liveRef.current || src === "simulated") return { price: null, error: null };
    try {
      if (src === "alphavantage") {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${key}`;
        const d   = await (await fetch(url)).json();
        if (d.Note || d.Information) return { price: null, error: "quota" }; // rate limit message
        const p = parseFloat(d["Global Quote"]?.["05. price"]);
        if (!isNaN(p) && p > 0) return { price: p, error: null };
        return { price: null, error: "bad_response" };
      }
      if (src === "twelvedata") {
        const url = `https://api.twelvedata.com/price?symbol=${sym}&apikey=${key}`;
        const d   = await (await fetch(url)).json();
        if (d.code === 401 || d.status === "error") return { price: null, error: "auth" };
        const p = parseFloat(d.price);
        if (!isNaN(p) && p > 0) return { price: p, error: null };
        return { price: null, error: "bad_response" };
      }
      if (src === "finnhub") {
        const url = `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`;
        const d   = await (await fetch(url)).json();
        if (d.error) return { price: null, error: "auth" };
        const p = parseFloat(d.c);
        if (!isNaN(p) && p > 0) return { price: p, error: null };
        return { price: null, error: "bad_response" };
      }
    } catch (e) {
      return { price: null, error: "network" };
    }
    return { price: null, error: null };
  }, []);

  // ── PRICE TICK ───────────────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(async () => {
      // fetch live price for selected stock
      if (liveRef.current && savedKeyRef.current) {
        const { price } = await fetchLivePrice(selectedStock);
        if (price) setRealPrices(prev => ({ ...prev, [selectedStock]: price }));
      }
      // update sim ticks for all stocks
      setStockData(prev => {
        const upd = { ...prev };
        Object.entries(stocksRef.current).forEach(([sym, inf]) => {
          const arr  = prev[sym] || [];
          if (!arr.length) return;
          const last = arr[arr.length-1];
          const realP = liveRef.current ? realPrices[sym] : null;
          const drift = realP ? (realP - last.price) * 0.25 : 0;
          const noise = (Math.random() - 0.48) * last.price * 0.0018;
          const np    = +Math.max(last.price + drift + noise, inf.basePrice * 0.3).toFixed(2);
          upd[sym]    = [...arr.slice(-60), { price: np, volume: Math.floor(Math.random()*5e6)+5e5 }];
        });
        return upd;
      });
    }, 3000);
    return () => clearInterval(iv);
  }, [selectedStock, fetchLivePrice, realPrices]);

  // ── AUTO-ALERT ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoAlert) return;
    const iv = setInterval(() => {
      const sym    = selectedStock;
      const inf    = stocksRef.current[sym];
      if (!inf) return;
      const prices = (stockDataRef.current[sym] || []).map(d => d.price);
      const cur    = prices[prices.length-1] || inf.basePrice;
      const result = analyzeStock(sym, prices, "");
      if (result.action !== "HOLD" && result.confidence === "High") {
        setAlertLog(prev => [{
          id: Date.now(), stock: sym, price: cur, ...result,
          time: new Date().toLocaleTimeString(), nativeCurrency: inf.currency
        }, ...prev.slice(0,19)]);
        setMessages(prev => [...prev, {
          role:"assistant",
          text:`🔔 AUTO-ALERT [${sym}]: ${result.summary}`,
          action: result.action, parsed: result,
          nativeCurrency: inf.currency, isAlert: true
        }]);
      }
    }, 20_000);
    return () => clearInterval(iv);
  }, [autoAlert, selectedStock]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  // ── CHAT ─────────────────────────────────────────────────────────────────
  const callAI = useCallback((question) => {
    const sym = selectedStock;
    const inf = stocks[sym];
    if (!inf) return;
    setMessages(prev => [...prev, { role:"user", text:question, action:null }]);
    setLoading(true);
    setTimeout(() => {
      const prices = (stockDataRef.current[sym] || []).map(d => d.price);
      const result = analyzeStock(sym, prices, question);
      setMessages(prev => [...prev, {
        role:"assistant", text:result.summary,
        action:result.action, parsed:result, nativeCurrency:inf.currency
      }]);
      setLoading(false);
    }, 700);
  }, [selectedStock, stocks]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const m = input.trim(); setInput(""); callAI(m);
  };

  // ── TEST & SAVE API KEY ───────────────────────────────────────────────────
  const testApiKey = async () => {
    const key = apiKey.trim();
    if (!key) { setApiStatus("error"); setApiError("Please enter an API key."); return; }
    setApiStatus("testing"); setApiError("");
    const { price, error } = await (async () => {
      try {
        if (dataSource === "alphavantage") {
          const d = await (await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${key}`)).json();
          if (d.Note || d.Information) return { price:null, error:"quota" };
          const p = parseFloat(d["Global Quote"]?.["05. price"]);
          return isNaN(p) ? { price:null, error:"bad_response" } : { price:p, error:null };
        }
        if (dataSource === "twelvedata") {
          const d = await (await fetch(`https://api.twelvedata.com/price?symbol=AAPL&apikey=${key}`)).json();
          if (d.code === 401 || d.status === "error") return { price:null, error:"auth" };
          const p = parseFloat(d.price);
          return isNaN(p) ? { price:null, error:"bad_response" } : { price:p, error:null };
        }
        if (dataSource === "finnhub") {
          const d = await (await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`)).json();
          if (d.error) return { price:null, error:"auth" };
          const p = parseFloat(d.c);
          return isNaN(p) ? { price:null, error:"bad_response" } : { price:p, error:null };
        }
        return { price:null, error:"unknown_source" };
      } catch { return { price:null, error:"network" }; }
    })();

    if (price) {
      setSavedApiKey(key);
      setApiStatus("ok");
      setLiveEnabled(true);
      setRealPrices(prev => ({ ...prev, AAPL: price }));
    } else {
      setApiStatus("error");
      const msgs = {
        quota:        "Quota exceeded — you've hit the daily/minute limit for this API. Try again later.",
        auth:         "Invalid API key — double-check you copied it correctly from the provider dashboard.",
        bad_response: "API responded but returned no price. The symbol may not be supported on the free tier.",
        network:      "Network error — make sure you have internet access and the API site is reachable.",
      };
      setApiError(msgs[error] || "Unknown error. Please try again.");
    }
  };

  // ── STOCK SEARCH ─────────────────────────────────────────────────────────
  const searchStocks = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchResults([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system: SEARCH_SYSTEM,
          messages:[{ role:"user", content:`Find stocks matching: "${searchQuery}"` }]
        })
      });
      const data = await res.json();
      const raw  = data.content?.map(c => c.text || "").join("") || "[]";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setSearchResults(Array.isArray(parsed) ? parsed : []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const addStock = (s) => {
    setStocks(prev => ({...prev, [s.symbol]: {
      name:s.name, basePrice:s.basePrice, sector:s.sector,
      exchange:s.exchange, country:s.country, currency:s.currency
    }}));
    setStockData(prev => ({ ...prev, [s.symbol]: generateStockData(s.basePrice) }));
    setSelectedStock(s.symbol);
    setShowSearch(false); setSearchQuery(""); setSearchResults([]);
  };
  const removeStock = (sym) => {
    if (DEFAULT_STOCKS[sym]) return;
    setStocks(prev => { const n = {...prev}; delete n[sym]; return n; });
    if (selectedStock === sym) setSelectedStock("AAPL");
  };

  // ── DERIVED VALUES ────────────────────────────────────────────────────────
  const inf      = stocks[selectedStock] || {};
  const curData  = stockData[selectedStock] || [];
  const prices   = curData.map(d => d.price);
  const curN     = prices[prices.length-1] || inf.basePrice || 0;
  const prevN    = prices[prices.length-2] || curN;
  const delta    = curN - prevN;
  const pct      = prevN ? ((delta / prevN) * 100).toFixed(2) : "0.00";
  const pos      = delta >= 0;
  const rsi      = calcRSI(prices);
  const ma10     = calcMA(prices, 10);
  const ma20     = calcMA(prices, 20);
  const bb       = calcBB(prices, 20);
  const rsiColor = rsi > 70 ? "#ff4d6d" : rsi < 30 ? "#00d4aa" : "#ffd166";
  const isLive   = liveEnabled && savedApiKey && !!realPrices[selectedStock];
  const dcInfo   = CURRENCIES.find(c => c.code === displayCurrency) || CURRENCIES[0];
  const filtCurr = CURRENCIES.filter(c =>
    c.code.toLowerCase().includes(currSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(currSearch.toLowerCase())
  );

  // ── MINI CHART ────────────────────────────────────────────────────────────
  const MiniChart = ({ data, positive }) => {
    if (!data || data.length < 2) return null;
    const ps = data.map(d => d.price);
    const mn = Math.min(...ps), mx = Math.max(...ps), rng = mx - mn || 1;
    const W = 120, H = 36;
    const pts = ps.map((p,i) => `${(i/(ps.length-1))*W},${H - ((p-mn)/rng)*H}`);
    const col = positive ? "#00d4aa" : "#ff4d6d";
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id={`mg${positive?1:0}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity=".25"/>
            <stop offset="100%" stopColor={col} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill={`url(#mg${positive?1:0})`}/>
        <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth="1.5"/>
      </svg>
    );
  };

  // ── BIG CHART ─────────────────────────────────────────────────────────────
  const BigChart = ({ data }) => {
    if (!data || data.length < 2) return null;
    const ps  = data.map(d => d.price);
    const mn  = Math.min(...ps) * 0.999;
    const mx  = Math.max(...ps) * 1.001;
    const rng = mx - mn || 1;
    const W = 600, H = 150;
    const pts = ps.map((p,i) => `${(i/(ps.length-1))*W},${H - ((p-mn)/rng)*H}`);
    const col = ps[ps.length-1] >= ps[0] ? "#00d4aa" : "#ff4d6d";
    const ma  = ps.map((_,i) => {
      if (i < 3) return null;
      const sl = ps.slice(Math.max(0,i-3),i+1);
      const avg = sl.reduce((a,b)=>a+b,0)/sl.length;
      return `${(i/(ps.length-1))*W},${H - ((avg-mn)/rng)*H}`;
    }).filter(Boolean);
    const bbUpts = ps.map((p,i) => {
      const sl = ps.slice(Math.max(0,i-19),i+1);
      if (sl.length < 3) return null;
      const m = sl.reduce((a,b)=>a+b,0)/sl.length;
      const s = Math.sqrt(sl.reduce((a,b)=>a+(b-m)**2,0)/sl.length);
      return `${(i/(ps.length-1))*W},${H - (((m+2*s)-mn)/rng)*H}`;
    }).filter(Boolean);
    const bbLpts = ps.map((p,i) => {
      const sl = ps.slice(Math.max(0,i-19),i+1);
      if (sl.length < 3) return null;
      const m = sl.reduce((a,b)=>a+b,0)/sl.length;
      const s = Math.sqrt(sl.reduce((a,b)=>a+(b-m)**2,0)/sl.length);
      return `${(i/(ps.length-1))*W},${H - (((m-2*s)-mn)/rng)*H}`;
    }).filter(Boolean);
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{height:150}}>
        <defs>
          <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity=".2"/>
            <stop offset="100%" stopColor={col} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[.25,.5,.75].map(f => <line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="rgba(255,255,255,.04)" strokeWidth="1"/>)}
        {bbUpts.length > 1 && bbLpts.length > 1 && (
          <polygon points={`${bbUpts.join(" ")} ${[...bbLpts].reverse().join(" ")}`} fill="rgba(120,180,255,.05)"/>
        )}
        {bbUpts.length > 1 && <polyline points={bbUpts.join(" ")} fill="none" stroke="rgba(100,160,255,.25)" strokeWidth="1"/>}
        {bbLpts.length > 1 && <polyline points={bbLpts.join(" ")} fill="none" stroke="rgba(100,160,255,.25)" strokeWidth="1"/>}
        <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill="url(#bg2)"/>
        <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round"/>
        {ma.length > 1 && <polyline points={ma.join(" ")} fill="none" stroke="rgba(255,200,60,.5)" strokeWidth="1" strokeDasharray="3,2"/>}
      </svg>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'IBM Plex Mono','Courier New',monospace",background:"#080c14",minHeight:"100vh",color:"#c9d6e3",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d1520}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}
        .sb{transition:all .15s;cursor:pointer;border:1px solid #1a2d44;background:#0d1520;border-radius:6px;padding:8px 10px;color:#7a9bbf;font-family:inherit;font-size:12px;width:100%;text-align:left}
        .sb:hover{border-color:#00d4aa;color:#00d4aa}.sb.act{border-color:#00d4aa;color:#00d4aa;background:rgba(0,212,170,.08)}
        .qb{cursor:pointer;background:rgba(0,212,170,.05);border:1px solid rgba(0,212,170,.2);border-radius:20px;padding:6px 14px;color:#00d4aa;font-family:inherit;font-size:11px;transition:all .15s;white-space:nowrap}
        .qb:hover{background:rgba(0,212,170,.12)}.qb:disabled{opacity:.4;cursor:not-allowed}
        .btn{cursor:pointer;background:#00d4aa;border:none;border-radius:6px;padding:10px 20px;color:#080c14;font-family:inherit;font-size:13px;font-weight:600;transition:all .15s}
        .btn:hover{background:#00f0c0;transform:translateY(-1px)}.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
        .tbtn{cursor:pointer;background:none;border:none;border-bottom:2px solid transparent;padding:10px 18px;color:#4a6a8a;font-family:inherit;font-size:12px;letter-spacing:1px;text-transform:uppercase;transition:all .15s}
        .tbtn.act{color:#00d4aa;border-bottom-color:#00d4aa}.tbtn:hover{color:#7ab8c8}
        .tog{width:44px;height:24px;background:#1a2d44;border-radius:12px;position:relative;cursor:pointer;transition:background .2s;border:1px solid #253d56;flex-shrink:0}
        .tog.on{background:#00d4aa;border-color:#00d4aa}.tog::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;background:#080c14;border-radius:9px;transition:transform .2s}.tog.on::after{transform:translateX(20px)}
        .bub{padding:12px 16px;border-radius:10px;max-width:86%;font-size:13px;line-height:1.6;animation:fu .2s ease}
        .bu{background:rgba(0,212,170,.08);border:1px solid rgba(0,212,170,.15);align-self:flex-end;border-bottom-right-radius:3px}
        .ba{background:#0d1520;border:1px solid #1a2d44;align-self:flex-start;border-bottom-left-radius:3px}
        .bal{border-color:#ffd166!important;background:rgba(255,209,102,.05)!important}
        .bdg{display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:1.5px;margin-bottom:6px}
        .bbuy{background:rgba(0,212,170,.15);color:#00d4aa;border:1px solid rgba(0,212,170,.3)}
        .bsell{background:rgba(255,77,109,.15);color:#ff4d6d;border:1px solid rgba(255,77,109,.3)}
        .bhold{background:rgba(255,209,102,.1);color:#ffd166;border:1px solid rgba(255,209,102,.3)}
        .mc{background:#0d1520;border:1px solid #1a2d44;border-radius:8px;padding:10px 14px;flex:1;min-width:70px}
        .pulse{animation:pulse 2s infinite}
        .dr{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #0f1e2e;font-size:12px}.dr:last-child{border-bottom:none}
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
        .mi{background:#0a101a;border:1px solid #1a2d44;border-radius:12px;width:100%;max-width:540px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden}
        .srb{cursor:pointer;background:#0d1520;border:1px solid #1a2d44;border-radius:6px;padding:10px 14px;font-family:inherit;font-size:12px;transition:all .15s;text-align:left;width:100%;color:#c9d6e3}
        .srb:hover{border-color:#00d4aa;background:rgba(0,212,170,.04)}
        .addb{cursor:pointer;background:rgba(0,212,170,.1);border:1px solid rgba(0,212,170,.3);border-radius:4px;padding:4px 10px;color:#00d4aa;font-family:inherit;font-size:11px}.addb:hover{background:rgba(0,212,170,.2)}
        .xb{cursor:pointer;background:none;border:none;color:#ff4d6d;font-size:15px;opacity:.5;padding:2px;transition:opacity .15s}.xb:hover{opacity:1}
        .ipt{background:#0d1520;border:1px solid #1a2d44;border-radius:6px;color:#c9d6e3;font-family:inherit;font-size:13px;padding:10px 14px;outline:none;transition:border-color .15s}.ipt:focus{border-color:#00d4aa}
        .srcb{cursor:pointer;background:#00d4aa;border:none;border-radius:6px;padding:10px 16px;color:#080c14;font-family:inherit;font-size:12px;font-weight:600;white-space:nowrap;transition:all .15s}.srcb:hover{background:#00f0c0}.srcb:disabled{opacity:.4;cursor:not-allowed}
        .cbtn{cursor:pointer;border:1px solid #1a2d44;background:#0d1520;border-radius:8px;padding:10px 12px;color:#c9d6e3;font-family:inherit;font-size:12px;transition:all .15s;text-align:left;display:flex;align-items:center;gap:8px}.cbtn:hover{border-color:#00d4aa}.cbtn.sel{border-color:#00d4aa;background:rgba(0,212,170,.08);color:#00d4aa}
        .dsbtn{cursor:pointer;border:1px solid #1a2d44;background:#0d1520;border-radius:8px;padding:12px;color:#c9d6e3;font-family:inherit;font-size:12px;transition:all .15s;text-align:left;width:100%}.dsbtn:hover{border-color:#7a9bbf}.dsbtn.sel{border-color:#00d4aa;background:rgba(0,212,170,.06)}
        .hdrb{cursor:pointer;background:rgba(255,255,255,.06);border:1px solid #1a2d44;border-radius:6px;padding:6px 12px;color:#c9d6e3;font-family:inherit;font-size:11px;transition:all .15s;display:flex;align-items:center;gap:6px}.hdrb:hover{border-color:#00d4aa;color:#00d4aa}
        .stab{cursor:pointer;background:none;border:none;border-bottom:2px solid transparent;padding:8px 16px;color:#4a6a8a;font-family:inherit;font-size:11px;letter-spacing:1px;text-transform:uppercase;transition:all .15s}.stab.act{color:#00d4aa;border-bottom-color:#00d4aa}.stab:hover{color:#7ab8c8}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:"#0a101a",borderBottom:"1px solid #1a2d44",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,background:"linear-gradient(135deg,#00d4aa,#0088ff)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⬡</div>
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:700,color:"#e8f4ff",letterSpacing:"-.5px"}}>TradeAI</div>
            <div style={{fontSize:9,color:"#4a6a8a",letterSpacing:"2px",textTransform:"uppercase"}}>Global Market Advisor</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {/* Currency button */}
          <button className="hdrb" onClick={()=>{setShowSettings(true);setSettingsTab("currency");}}>
            <span>{dcInfo.flag}</span>
            <span style={{fontWeight:600}}>{displayCurrency}</span>
            <span style={{fontSize:10,color:"#4a6a8a"}}>▼</span>
          </button>
          {/* Live/Demo badge */}
          <button className="hdrb" onClick={()=>{setShowSettings(true);setSettingsTab("data");}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:isLive?"#00d4aa":"#ffd166",display:"inline-block"}} className={isLive?"pulse":""}/>
            <span>{isLive?"LIVE":"DEMO"}</span>
          </button>
          {/* Settings gear */}
          <button className="hdrb" onClick={()=>setShowSettings(true)} style={{padding:"6px 10px",fontSize:15}}>⚙</button>
          {/* Auto-alert */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,color:autoAlert?"#00d4aa":"#4a6a8a",letterSpacing:"1px"}}>AUTO</span>
            <div className={`tog ${autoAlert?"on":""}`} onClick={()=>setAutoAlert(v=>!v)}/>
          </div>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",maxHeight:"calc(100vh - 56px)"}}>
        {/* ── SIDEBAR ── */}
        <div style={{width:185,background:"#0a101a",borderRight:"1px solid #1a2d44",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 10px 8px",borderBottom:"1px solid #0f1e2e"}}>
            <div style={{fontSize:9,color:"#4a6a8a",letterSpacing:"2px",marginBottom:7,textTransform:"uppercase"}}>Watchlist · {Object.keys(stocks).length}</div>
            <button className="srcb" style={{width:"100%",fontSize:11,padding:"7px 10px",background:"rgba(0,212,170,.08)",border:"1px dashed rgba(0,212,170,.3)",color:"#00d4aa",borderRadius:6}} onClick={()=>setShowSearch(true)}>
              + Add Any Stock
            </button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"7px 8px",display:"flex",flexDirection:"column",gap:4}}>
            {Object.entries(stocks).map(([sym,si]) => {
              const d   = stockData[sym] || [];
              const ps  = d.map(x => x.price);
              const cur = ps[ps.length-1] || si.basePrice;
              const prv = ps[0] || cur;
              const chg = ((cur-prv)/prv*100).toFixed(2);
              const isp = cur >= prv;
              const hasLive = liveEnabled && savedApiKey && realPrices[sym];
              return (
                <button key={sym} className={`sb ${selectedStock===sym?"act":""}`} onClick={()=>setSelectedStock(sym)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:13}}>{getFlag(si.country)}</span>
                      <span style={{fontWeight:600,fontSize:12}}>{sym.length>11?sym.slice(0,11):sym}</span>
                      {hasLive && <span style={{width:5,height:5,borderRadius:"50%",background:"#00d4aa",display:"inline-block"}} className="pulse"/>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <span style={{color:isp?"#00d4aa":"#ff4d6d",fontSize:10}}>{isp?"+":""}{chg}%</span>
                      {!DEFAULT_STOCKS[sym] && <button className="xb" onClick={e=>{e.stopPropagation();removeStock(sym);}}>×</button>}
                    </div>
                  </div>
                  <div style={{fontSize:10,opacity:.65,marginTop:1}}>{fmt(cur,si.currency)}</div>
                  <div style={{fontSize:9,color:"#3a5a7a",marginTop:1}}>{si.exchange}</div>
                  <div style={{marginTop:3}}><MiniChart data={d} positive={isp}/></div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MAIN PANEL ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Price header */}
          <div style={{background:"#0d1520",borderBottom:"1px solid #1a2d44",padding:"12px 18px"}}>
            {/* Banners */}
            {!isLive && (
              <div style={{background:"rgba(255,209,102,.07)",border:"1px solid rgba(255,209,102,.2)",borderRadius:6,padding:"5px 12px",fontSize:11,color:"#ffd166",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                <span>⚠</span>
                <span>Demo mode — prices are simulated.{" "}
                  <span style={{textDecoration:"underline",cursor:"pointer"}} onClick={()=>{setShowSettings(true);setSettingsTab("data");}}>Connect a free API key</span>{" "}
                  for real quotes from Alpha Vantage, Twelve Data, or Finnhub.
                </span>
              </div>
            )}
            {isLive && (
              <div style={{background:"rgba(0,212,170,.06)",border:"1px solid rgba(0,212,170,.2)",borderRadius:6,padding:"5px 12px",fontSize:11,color:"#00d4aa",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                <span className="pulse">●</span>
                <span>Live data via {DATA_SOURCES.find(d=>d.id===dataSource)?.name} · Display: {displayCurrency} {fxLastFetch ? `· FX updated ${fxLastFetch.toLocaleTimeString()}` : ""}</span>
              </div>
            )}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
              <div>
                <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:24,fontWeight:700,color:"#e8f4ff"}}>{fmt(curN, inf.currency)}</span>
                  {displayCurrency !== (inf.currency||"USD") && (
                    <span style={{fontSize:11,color:"#3a5a7a"}}>{curN.toFixed(2)} {inf.currency}</span>
                  )}
                  <span style={{fontSize:13,color:pos?"#00d4aa":"#ff4d6d",fontWeight:500}}>
                    {pos?"▲":"▼"} {Math.abs(delta).toFixed(2)} ({pos?"+":""}{pct}%)
                  </span>
                </div>
                <div style={{fontSize:11,color:"#4a6a8a",marginTop:2,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                  <span>{getFlag(inf.country)}</span>
                  <span>{inf.name}</span>
                  <span style={{opacity:.4}}>·</span>
                  <span>{inf.exchange}</span>
                  <span style={{opacity:.4}}>·</span>
                  <span>{inf.sector}</span>
                  <span style={{opacity:.4}}>·</span>
                  <span style={{color:"#7a9bbf"}}>{inf.currency} → {displayCurrency}</span>
                </div>
              </div>
              <div style={{fontSize:10,color:"#4a6a8a",textAlign:"right",flexShrink:0}}>
                <div className={isLive?"pulse":""} style={{color:isLive?"#00d4aa":"#ffd166"}}>● {isLive?"LIVE":"SIM"}</div>
                <div style={{marginTop:2}}>{new Date().toLocaleTimeString()}</div>
              </div>
            </div>
            <BigChart data={curData}/>
            <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
              {[
                {label:"RSI(14)",  value:rsi,                            color:rsiColor},
                {label:"MA(10)",   value:fmt(ma10, inf.currency),        color:curN>ma10?"#00d4aa":"#ff4d6d"},
                {label:"MA(20)",   value:fmt(ma20, inf.currency),        color:curN>ma20?"#00d4aa":"#ff4d6d"},
                {label:"BB Upper", value:fmt(bb.upper, inf.currency),    color:"rgba(120,180,255,.8)"},
                {label:"Signal",   value:rsi>70?"OVERBOUGHT":rsi<30?"OVERSOLD":"NEUTRAL", color:rsiColor},
              ].map(m => (
                <div key={m.label} className="mc">
                  <div style={{fontSize:9,color:"#4a6a8a",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:3}}>{m.label}</div>
                  <div style={{fontSize:12,fontWeight:600,color:m.color}}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{background:"#0a101a",borderBottom:"1px solid #1a2d44",display:"flex",padding:"0 18px"}}>
            <button className={`tbtn ${tab==="chat"?"act":""}`} onClick={()=>setTab("chat")}>AI Chat</button>
            <button className={`tbtn ${tab==="alerts"?"act":""}`} onClick={()=>setTab("alerts")}>
              Alerts {alertLog.length>0 && <span style={{background:"#ff4d6d",color:"white",borderRadius:10,padding:"1px 6px",fontSize:10,marginLeft:4}}>{alertLog.length}</span>}
            </button>
          </div>

          {tab==="chat" && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"9px 18px",borderBottom:"1px solid #0f1e2e",display:"flex",gap:7,overflowX:"auto"}}>
                {["Should I buy now?","Good time to sell?","Trend analysis","Risk assessment","Price target?","What's RSI saying?"].map(q => (
                  <button key={q} className="qb" onClick={()=>!loading&&callAI(q)} disabled={loading}>{q}</button>
                ))}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:11}}>
                {messages.map((msg,i) => (
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
                    <div className={`bub ${msg.role==="user"?"bu":"ba"} ${msg.isAlert?"bal":""}`}>
                      {msg.action && <div className={`bdg b${msg.action.toLowerCase()}`}>{msg.action}</div>}
                      {msg.parsed && (
                        <div style={{marginBottom:7}}>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4}}>
                            <span style={{fontSize:11,color:"#4a6a8a"}}>Confidence:{" "}
                              <span style={{color:msg.parsed.confidence==="High"?"#00d4aa":msg.parsed.confidence==="Medium"?"#ffd166":"#ff4d6d"}}>{msg.parsed.confidence}</span>
                            </span>
                            <span style={{fontSize:11,color:"#4a6a8a"}}>Risk:{" "}
                              <span style={{color:msg.parsed.riskLevel==="Low"?"#00d4aa":msg.parsed.riskLevel==="Medium"?"#ffd166":"#ff4d6d"}}>{msg.parsed.riskLevel}</span>
                            </span>
                          </div>
                          {msg.parsed.entryPrice && (
                            <div style={{fontSize:11,color:"#7a9bbf"}}>
                              Entry:{" "}<span style={{color:"#e8f4ff"}}>{fmt(msg.parsed.entryPrice, msg.nativeCurrency||"USD")}</span>
                              {" · "}Target:{" "}<span style={{color:"#00d4aa"}}>{fmt(msg.parsed.targetPrice, msg.nativeCurrency||"USD")}</span>
                              {" · "}Stop:{" "}<span style={{color:"#ff4d6d"}}>{fmt(msg.parsed.stopLoss, msg.nativeCurrency||"USD")}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{color:msg.role==="user"?"#a0d4bb":"#c9d6e3"}}>{msg.text}</div>
                      {msg.parsed?.reasoning && msg.parsed.reasoning !== msg.text && (
                        <div style={{marginTop:7,fontSize:11,color:"#4a6a8a",borderTop:"1px solid #1a2d44",paddingTop:7}}>{msg.parsed.reasoning}</div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{display:"flex"}}>
                    <div className="bub ba" style={{color:"#4a6a8a"}}>
                      <span className="pulse">Analysing indicators</span>
                      <span className="pulse" style={{animationDelay:".3s"}}>.</span>
                      <span className="pulse" style={{animationDelay:".6s"}}>.</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>
              <div style={{padding:"11px 18px",borderTop:"1px solid #1a2d44",display:"flex",gap:9,background:"#0a101a"}}>
                <input className="ipt" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()} placeholder={`Ask about ${selectedStock}…`} disabled={loading} style={{width:"100%"}}/>
                <button className="btn" onClick={handleSend} disabled={loading||!input.trim()}>Send</button>
              </div>
            </div>
          )}

          {tab==="alerts" && (
            <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
              {alertLog.length===0 ? (
                <div style={{textAlign:"center",color:"#4a6a8a",marginTop:50,fontSize:13}}>
                  <div style={{fontSize:30,marginBottom:10}}>🔕</div>
                  <div>No auto-alerts yet.</div>
                  <div style={{marginTop:5,fontSize:11}}>Enable the AUTO toggle in the header to receive automatic BUY/SELL signals.</div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {alertLog.map(a => (
                    <div key={a.id} style={{background:"#0d1520",border:`1px solid ${a.action==="BUY"?"rgba(0,212,170,.2)":"rgba(255,77,109,.2)"}`,borderRadius:8,padding:13}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                        <div style={{display:"flex",gap:9,alignItems:"center"}}>
                          <span className={`bdg b${a.action.toLowerCase()}`}>{a.action}</span>
                          <span style={{fontWeight:600,color:"#e8f4ff"}}>{a.stock}</span>
                        </div>
                        <span style={{fontSize:11,color:"#4a6a8a"}}>{a.time}</span>
                      </div>
                      <div className="dr"><span style={{color:"#4a6a8a"}}>Price at alert</span><span>{fmt(a.price, a.nativeCurrency||"USD")}</span></div>
                      {a.targetPrice && <div className="dr"><span style={{color:"#4a6a8a"}}>Target</span><span style={{color:"#00d4aa"}}>{fmt(a.targetPrice, a.nativeCurrency||"USD")}</span></div>}
                      {a.stopLoss    && <div className="dr"><span style={{color:"#4a6a8a"}}>Stop Loss</span><span style={{color:"#ff4d6d"}}>{fmt(a.stopLoss, a.nativeCurrency||"USD")}</span></div>}
                      <div style={{marginTop:7,fontSize:11,color:"#7a9bbf"}}>{a.reasoning}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SETTINGS MODAL ── */}
      {showSettings && (
        <div className="modal" onClick={e=>e.target===e.currentTarget&&setShowSettings(false)}>
          <div className="mi" style={{maxWidth:560}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid #1a2d44",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:"#e8f4ff",fontSize:15}}>⚙ Settings</div>
              <button onClick={()=>setShowSettings(false)} style={{background:"none",border:"none",color:"#4a6a8a",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
            </div>
            {/* Settings sub-tabs */}
            <div style={{display:"flex",padding:"0 20px",borderBottom:"1px solid #1a2d44"}}>
              <button className={`stab ${settingsTab==="currency"?"act":""}`} onClick={()=>setSettingsTab("currency")}>🌍 Currency</button>
              <button className={`stab ${settingsTab==="data"?"act":""}`} onClick={()=>setSettingsTab("data")}>📡 Live Data</button>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>

              {/* ── CURRENCY TAB ── */}
              {settingsTab==="currency" && (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div>
                    <div style={{fontSize:12,color:"#7a9bbf",marginBottom:6}}>Currently displaying prices in:</div>
                    <div style={{background:"#0d1520",border:"1px solid #1a2d44",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:22}}>{dcInfo.flag}</span>
                      <div>
                        <div style={{fontWeight:600,color:"#e8f4ff"}}>{dcInfo.code} — {dcInfo.name}</div>
                        {fxRates[displayCurrency] && (
                          <div style={{fontSize:11,color:"#4a6a8a",marginTop:2}}>
                            1 USD = <span style={{color:"#00d4aa"}}>{fxRates[displayCurrency].toFixed(4)} {displayCurrency}</span>
                            {fxStatus==="ok" ? <span style={{color:"#3a5a7a"}}> · live rate</span> : <span style={{color:"#ffd166"}}> · fallback</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    {fxStatus==="loading" && <div style={{fontSize:11,color:"#ffd166",marginTop:6}}>⏳ Loading live FX rates…</div>}
                    {fxStatus==="error"   && <div style={{fontSize:11,color:"#ff4d6d",marginTop:6}}>⚠ Could not load FX rates. Using last known values.</div>}
                  </div>
                  <div>
                    <div style={{fontSize:12,color:"#7a9bbf",marginBottom:8}}>Select your currency:</div>
                    <input className="ipt" placeholder="Search currency name or code…" value={currSearch} onChange={e=>setCurrSearch(e.target.value)} style={{width:"100%",marginBottom:10,fontSize:12}}/>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,maxHeight:240,overflowY:"auto"}}>
                      {filtCurr.map(c => (
                        <button key={c.code} className={`cbtn ${displayCurrency===c.code?"sel":""}`} onClick={()=>setDisplayCurrency(c.code)}>
                          <span style={{fontSize:16}}>{c.flag}</span>
                          <div>
                            <div style={{fontWeight:600,fontSize:12}}>{c.code}</div>
                            <div style={{fontSize:10,color:"#4a6a8a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:72}}>{c.name}</div>
                          </div>
                          {displayCurrency===c.code && <span style={{marginLeft:"auto",fontSize:14}}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── DATA TAB ── */}
              {settingsTab==="data" && (
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div>
                    <div style={{fontSize:12,color:"#7a9bbf",marginBottom:10}}>Select a data source:</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {DATA_SOURCES.map(ds => (
                        <button key={ds.id} className={`dsbtn ${dataSource===ds.id?"sel":""}`} onClick={()=>{setDataSource(ds.id);setApiStatus("idle");setApiError("");}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontWeight:600,color:dataSource===ds.id?"#00d4aa":"#c9d6e3"}}>{ds.name}</span>
                            {ds.free && <span style={{fontSize:10,color:"#00d4aa",background:"rgba(0,212,170,.1)",border:"1px solid rgba(0,212,170,.2)",borderRadius:3,padding:"1px 6px"}}>FREE</span>}
                          </div>
                          <div style={{fontSize:11,color:"#4a6a8a",marginTop:3}}>{ds.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {dataSource !== "simulated" && (
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{fontSize:12,color:"#7a9bbf"}}>Enter your API key for {DATA_SOURCES.find(d=>d.id===dataSource)?.name}:</div>
                      <div style={{display:"flex",gap:8}}>
                        <input
                          className="ipt"
                          type="password"
                          value={apiKey}
                          onChange={e=>{ setApiKey(e.target.value); setApiStatus("idle"); setApiError(""); }}
                          placeholder="Paste your API key here…"
                          style={{flex:1,fontSize:12}}
                        />
                        <button className="srcb" onClick={testApiKey} disabled={apiStatus==="testing"||!apiKey.trim()} style={{padding:"10px 14px",fontSize:12}}>
                          {apiStatus==="testing" ? "Testing…" : "Test & Save"}
                        </button>
                      </div>

                      {/* Status messages */}
                      {apiStatus==="ok" && (
                        <div style={{background:"rgba(0,212,170,.08)",border:"1px solid rgba(0,212,170,.2)",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#00d4aa"}}>
                          ✓ API key verified and saved! Live prices are now active.
                        </div>
                      )}
                      {apiStatus==="error" && (
                        <div style={{background:"rgba(255,77,109,.08)",border:"1px solid rgba(255,77,109,.2)",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#ff4d6d"}}>
                          ✗ {apiError || "API key test failed. Please try again."}
                        </div>
                      )}
                      {savedApiKey && liveEnabled && apiStatus !== "error" && (
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                          <span style={{color:"#4a6a8a"}}>Live data: <span style={{color:"#00d4aa"}}>ACTIVE</span></span>
                          <button onClick={()=>{setSavedApiKey("");setLiveEnabled(false);setApiStatus("idle");setApiKey("");setApiError("");}} style={{background:"none",border:"none",color:"#ff4d6d",cursor:"pointer",fontSize:11}}>
                            Disconnect
                          </button>
                        </div>
                      )}

                      {/* How-to instructions */}
                      <div style={{background:"#0d1520",border:"1px solid #1a2d44",borderRadius:6,padding:"10px 14px",fontSize:11,color:"#4a6a8a",lineHeight:1.9}}>
                        <div style={{color:"#7a9bbf",fontWeight:600,marginBottom:4}}>How to get your free API key:</div>
                        {dataSource==="alphavantage" && <>
                          <div>1. Go to <span style={{color:"#00d4aa"}}>alphavantage.co/support/#api-key</span></div>
                          <div>2. Enter your email → key sent instantly, no credit card</div>
                          <div>3. Free tier: 25 stock quotes/day, 500 total requests</div>
                          <div style={{color:"#ffd166",marginTop:4}}>⚠ Note: Free tier is US stocks only (AAPL, TSLA, etc.)</div>
                        </>}
                        {dataSource==="twelvedata" && <>
                          <div>1. Go to <span style={{color:"#00d4aa"}}>twelvedata.com/register</span></div>
                          <div>2. Sign up free → copy key from your dashboard</div>
                          <div>3. Free tier: 800 API credits/day, global coverage</div>
                          <div style={{color:"#00d4aa",marginTop:4}}>✓ Best free option — supports global stocks</div>
                        </>}
                        {dataSource==="finnhub" && <>
                          <div>1. Go to <span style={{color:"#00d4aa"}}>finnhub.io/register</span></div>
                          <div>2. Sign up free → API key shown on dashboard</div>
                          <div>3. Free tier: 60 API calls/minute — very generous</div>
                          <div style={{color:"#00d4aa",marginTop:4}}>✓ Great for frequent auto-alert use</div>
                        </>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{padding:"12px 20px",borderTop:"1px solid #1a2d44",display:"flex",justifyContent:"flex-end"}}>
              <button className="btn" onClick={()=>setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH MODAL ── */}
      {showSearch && (
        <div className="modal" onClick={e=>e.target===e.currentTarget&&setShowSearch(false)}>
          <div className="mi">
            <div style={{padding:"14px 20px",borderBottom:"1px solid #1a2d44",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,color:"#e8f4ff",fontSize:15}}>🌍 Search Global Stocks</div>
                <div style={{fontSize:11,color:"#4a6a8a",marginTop:2}}>NYSE · NASDAQ · LSE · NSE · TSE · HKEX · ASX · KRX · SGX · Euronext</div>
              </div>
              <button onClick={()=>setShowSearch(false)} style={{background:"none",border:"none",color:"#4a6a8a",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
            </div>
            <div style={{padding:"12px 18px",borderBottom:"1px solid #0f1e2e",display:"flex",gap:8}}>
              <input className="ipt" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchStocks()} placeholder="Company name or ticker symbol…" style={{flex:1}} autoFocus/>
              <button className="srcb" onClick={searchStocks} disabled={searching||!searchQuery.trim()}>{searching?"…":"Search"}</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"9px 14px"}}>
              {searching && <div style={{textAlign:"center",color:"#4a6a8a",padding:30,fontSize:13}}><span className="pulse">Searching global markets…</span></div>}
              {!searching && searchResults.length===0 && searchQuery && <div style={{textAlign:"center",color:"#4a6a8a",padding:28}}>No results found. Try a different name or ticker.</div>}
              {!searching && searchResults.length===0 && !searchQuery && (
                <div style={{color:"#4a6a8a",fontSize:12,padding:"8px 4px",lineHeight:2.1}}>
                  <div style={{color:"#7a9bbf",marginBottom:6}}>Try searching for:</div>
                  {["Reliance Industries","Samsung Electronics","HSBC","BHP Group","Alibaba","Toyota","SAP SE","DBS Group","Petrobras","LVMH","TSMC","Nestlé"].map(ex => (
                    <div key={ex} style={{cursor:"pointer"}} onClick={()=>setSearchQuery(ex)}
                      onMouseEnter={e=>e.target.style.color="#00d4aa"} onMouseLeave={e=>e.target.style.color="#4a6a8a"}>
                      → {ex}
                    </div>
                  ))}
                </div>
              )}
              {searchResults.map((s,i) => {
                const already = !!stocks[s.symbol];
                return (
                  <div key={i} className="srb" style={{marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div onClick={()=>!already&&addStock(s)} style={{flex:1,cursor:already?"default":"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                        <span style={{fontSize:14}}>{getFlag(s.country)}</span>
                        <span style={{fontWeight:600,color:"#e8f4ff",fontSize:13}}>{s.symbol}</span>
                        <span style={{fontSize:11,color:"#4a6a8a"}}>{s.exchange}</span>
                        <span style={{fontSize:11,color:"#7a9bbf",fontWeight:600}}>{fmt(s.basePrice, s.currency)}</span>
                      </div>
                      <div style={{fontSize:11,color:"#7a9bbf"}}>{s.name}</div>
                      <div style={{fontSize:10,color:"#3a5a7a",marginTop:1}}>{s.sector} · {s.country} · {s.currency}</div>
                    </div>
                    {already
                      ? <span style={{fontSize:11,color:"#00d4aa",opacity:.6,flexShrink:0}}>✓ Added</span>
                      : <button className="addb" onClick={()=>addStock(s)}>+ Add</button>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
