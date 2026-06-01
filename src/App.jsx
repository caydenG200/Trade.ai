import { useState, useEffect, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `You are TradeAI, an expert stock market analyst and trading advisor. Your role is to help traders and investors make informed buy/sell decisions.

When analyzing trades, always consider:
- Current price vs recent trend
- Volume indicators
- RSI (overbought >70, oversold <30)
- Moving averages (MA50, MA200)
- Market sentiment
- Risk/reward ratio
- Support and resistance levels

When responding:
- Give a clear BUY, SELL, or HOLD recommendation
- Explain your reasoning concisely (2-3 sentences)
- Mention key risk factors
- Provide a confidence level (High/Medium/Low)
- If in auto-alert mode, be direct and action-oriented

Format your response as JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": "High" | "Medium" | "Low",
  "reasoning": "brief explanation",
  "entryPrice": number or null,
  "targetPrice": number or null,
  "stopLoss": number or null,
  "riskLevel": "Low" | "Medium" | "High",
  "summary": "one sentence summary"
}`;

// Mock real-time stock data generator
const generateStockData = (symbol, basePrice) => {
  const points = 30;
  const data = [];
  let price = basePrice;
  for (let i = points; i >= 0; i--) {
    const change = (Math.random() - 0.48) * basePrice * 0.02;
    price = Math.max(price + change, basePrice * 0.7);
    const volume = Math.floor(Math.random() * 5000000) + 1000000;
    data.push({
      time: i,
      price: parseFloat(price.toFixed(2)),
      volume,
      high: parseFloat((price * (1 + Math.random() * 0.01)).toFixed(2)),
      low: parseFloat((price * (1 - Math.random() * 0.01)).toFixed(2)),
    });
  }
  return data;
};

const STOCKS = {
  AAPL: { name: "Apple Inc.", basePrice: 189.5, sector: "Technology" },
  TSLA: { name: "Tesla Inc.", basePrice: 248.3, sector: "EV/Auto" },
  NVDA: { name: "NVIDIA Corp.", basePrice: 875.2, sector: "Semiconductors" },
  MSFT: { name: "Microsoft Corp.", basePrice: 415.8, sector: "Technology" },
  AMZN: { name: "Amazon.com Inc.", basePrice: 182.4, sector: "E-Commerce" },
};

const calcRSI = (prices) => {
  if (prices.length < 14) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i < 15; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(1));
};

const calcMA = (prices, period) => {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return parseFloat((slice.reduce((a, b) => a + b, 0) / period).toFixed(2));
};

const MiniChart = ({ data, positive }) => {
  if (!data || data.length < 2) return null;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 120, h = 40;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${x},${y}`;
  });
  const fillPts = [`0,${h}`, ...pts, `${w},${h}`].join(" ");
  const color = positive ? "#00d4aa" : "#ff4d6d";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`g${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#g${positive})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

const BigChart = ({ data, symbol }) => {
  if (!data || data.length < 2) return null;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices) * 0.999;
  const max = Math.max(...prices) * 1.001;
  const range = max - min || 1;
  const w = 600, h = 160;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${x},${y}`;
  });
  const last = prices[prices.length - 1];
  const first = prices[0];
  const positive = last >= first;
  const color = positive ? "#00d4aa" : "#ff4d6d";
  const fillPts = [`0,${h}`, ...pts, `${w},${h}`].join(" ");
  const ma20 = prices.slice(-20);
  const maPts = prices.map((_, i) => {
    if (i < 4) return null;
    const slice = prices.slice(Math.max(0, i - 4), i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((avg - min) / range) * h;
    return `${x},${y}`;
  }).filter(Boolean);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: "160px" }}>
      <defs>
        <linearGradient id="bigGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <polygon points={fillPts} fill="url(#bigGrad)" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {maPts.length > 1 && (
        <polyline points={maPts.join(" ")} fill="none" stroke="rgba(255,200,0,0.5)" strokeWidth="1" strokeDasharray="3,2" />
      )}
    </svg>
  );
};

export default function TradingAssistant() {
  const [selectedStock, setSelectedStock] = useState("AAPL");
  const [stockData, setStockData] = useState({});
  const [autoAlert, setAutoAlert] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome to TradeAI. Select a stock and ask me anything — or enable Auto-Alert to get real-time buy/sell signals.",
      action: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertLog, setAlertLog] = useState([]);
  const [tab, setTab] = useState("chat");
  const messagesEndRef = useRef(null);
  const autoAlertRef = useRef(autoAlert);
  autoAlertRef.current = autoAlert;

  // Initialize stock data
  useEffect(() => {
    const initial = {};
    Object.entries(STOCKS).forEach(([sym, info]) => {
      initial[sym] = generateStockData(sym, info.basePrice);
    });
    setStockData(initial);
  }, []);

  // Live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStockData((prev) => {
        const updated = { ...prev };
        Object.entries(STOCKS).forEach(([sym, info]) => {
          const arr = prev[sym] || [];
          if (arr.length === 0) return;
          const last = arr[arr.length - 1];
          const change = (Math.random() - 0.48) * last.price * 0.003;
          const newPrice = parseFloat(Math.max(last.price + change, info.basePrice * 0.7).toFixed(2));
          const newPoint = {
            time: 0,
            price: newPrice,
            volume: Math.floor(Math.random() * 5000000) + 1000000,
            high: parseFloat((newPrice * (1 + Math.random() * 0.005)).toFixed(2)),
            low: parseFloat((newPrice * (1 - Math.random() * 0.005)).toFixed(2)),
          };
          updated[sym] = [...arr.slice(-30), newPoint];
        });
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-alert polling
  useEffect(() => {
    if (!autoAlert) return;
    const interval = setInterval(async () => {
      if (!autoAlertRef.current) return;
      const data = stockData[selectedStock];
      if (!data || data.length < 5) return;
      const prices = data.map((d) => d.price);
      const currentPrice = prices[prices.length - 1];
      const rsi = calcRSI(prices);
      const ma10 = calcMA(prices, 10);
      const change = ((currentPrice - prices[0]) / prices[0] * 100).toFixed(2);
      const prompt = `Auto-alert analysis for ${selectedStock}. Current price: $${currentPrice}, RSI: ${rsi}, MA10: $${ma10}, Price change: ${change}%. Detect if there's a strong BUY or SELL signal now. Only alert if HIGH confidence signal detected.`;
      await callAI(prompt, true);
    }, 20000);
    return () => clearInterval(interval);
  }, [autoAlert, selectedStock, stockData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const callAI = useCallback(async (userMessage, isAuto = false) => {
    setLoading(true);
    const data = stockData[selectedStock] || [];
    const prices = data.map((d) => d.price);
    const currentPrice = prices[prices.length - 1] || STOCKS[selectedStock].basePrice;
    const rsi = calcRSI(prices);
    const ma10 = calcMA(prices, 10);
    const ma20 = calcMA(prices, 20);
    const change1d = prices.length > 1 ? ((currentPrice - prices[0]) / prices[0] * 100).toFixed(2) : 0;

    const context = `Stock: ${selectedStock} (${STOCKS[selectedStock].name})
Current Price: $${currentPrice}
RSI(14): ${rsi}
MA(10): $${ma10}
MA(20): $${ma20}
Price Change: ${change1d}%
Recent trend: ${prices.length > 5 ? (prices[prices.length - 1] > prices[prices.length - 5] ? "Upward" : "Downward") : "Neutral"}
Mode: ${isAuto ? "AUTO-ALERT (only flag HIGH confidence signals)" : "Manual query"}`;

    const fullPrompt = `${context}\n\nUser query: ${userMessage}`;

    if (!isAuto) {
      setMessages((prev) => [...prev, { role: "user", text: userMessage, action: null }]);
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: fullPrompt }],
        }),
      });
      const result = await response.json();
      const raw = result.content?.map((c) => c.text || "").join("") || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        parsed = { action: "HOLD", confidence: "Low", reasoning: raw, summary: raw, riskLevel: "Medium" };
      }

      if (isAuto) {
        if (parsed.action !== "HOLD" && parsed.confidence === "High") {
          const alert = {
            id: Date.now(),
            stock: selectedStock,
            price: currentPrice,
            ...parsed,
            time: new Date().toLocaleTimeString(),
          };
          setAlertLog((prev) => [alert, ...prev.slice(0, 19)]);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: `🔔 AUTO-ALERT: ${parsed.summary}`,
              action: parsed.action,
              parsed,
              isAlert: true,
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: parsed.summary || parsed.reasoning || "Analysis complete.",
            action: parsed.action,
            parsed,
          },
        ]);
      }
    } catch (err) {
      if (!isAuto) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Connection error. Please try again.", action: null },
        ]);
      }
    }
    setLoading(false);
  }, [stockData, selectedStock]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    callAI(msg);
  };

  const handleQuickAsk = (q) => callAI(q);

  const currentData = stockData[selectedStock] || [];
  const prices = currentData.map((d) => d.price);
  const currentPrice = prices[prices.length - 1] || STOCKS[selectedStock]?.basePrice || 0;
  const prevPrice = prices[prices.length - 2] || currentPrice;
  const priceChange = currentPrice - prevPrice;
  const pctChange = prevPrice ? ((priceChange / prevPrice) * 100).toFixed(2) : "0.00";
  const positive = priceChange >= 0;
  const rsi = calcRSI(prices);
  const ma10 = calcMA(prices, 10);
  const ma20 = calcMA(prices, 20);
  const rsiColor = rsi > 70 ? "#ff4d6d" : rsi < 30 ? "#00d4aa" : "#ffd166";

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      background: "#080c14",
      minHeight: "100vh",
      color: "#c9d6e3",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1520; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        .stock-btn { transition: all 0.15s; cursor: pointer; border: 1px solid #1a2d44; background: #0d1520; border-radius: 6px; padding: 8px 12px; color: #7a9bbf; font-family: inherit; font-size: 12px; }
        .stock-btn:hover { border-color: #00d4aa; color: #00d4aa; }
        .stock-btn.active { border-color: #00d4aa; color: #00d4aa; background: rgba(0,212,170,0.08); }
        .quick-btn { cursor: pointer; background: rgba(0,212,170,0.05); border: 1px solid rgba(0,212,170,0.2); border-radius: 20px; padding: 6px 14px; color: #00d4aa; font-family: inherit; font-size: 11px; transition: all 0.15s; white-space: nowrap; }
        .quick-btn:hover { background: rgba(0,212,170,0.12); border-color: #00d4aa; }
        .send-btn { cursor: pointer; background: #00d4aa; border: none; border-radius: 6px; padding: 10px 20px; color: #080c14; font-family: inherit; font-size: 13px; font-weight: 600; transition: all 0.15s; }
        .send-btn:hover { background: #00f0c0; transform: translateY(-1px); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .tab-btn { cursor: pointer; background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 18px; color: #4a6a8a; font-family: inherit; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; transition: all 0.15s; }
        .tab-btn.active { color: #00d4aa; border-bottom-color: #00d4aa; }
        .tab-btn:hover { color: #7ab8c8; }
        .toggle { width: 44px; height: 24px; background: #1a2d44; border-radius: 12px; position: relative; cursor: pointer; transition: background 0.2s; border: 1px solid #253d56; }
        .toggle.on { background: #00d4aa; border-color: #00d4aa; }
        .toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #080c14; border-radius: 9px; transition: transform 0.2s; }
        .toggle.on::after { transform: translateX(20px); background: #080c14; }
        .msg-bubble { padding: 12px 16px; border-radius: 10px; max-width: 85%; font-size: 13px; line-height: 1.6; animation: fadeUp 0.2s ease; }
        .msg-user { background: rgba(0,212,170,0.08); border: 1px solid rgba(0,212,170,0.15); align-self: flex-end; border-bottom-right-radius: 3px; }
        .msg-ai { background: #0d1520; border: 1px solid #1a2d44; align-self: flex-start; border-bottom-left-radius: 3px; }
        .msg-alert { border-color: #ffd166; background: rgba(255,209,102,0.05); }
        .action-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; margin-bottom: 6px; }
        .badge-buy { background: rgba(0,212,170,0.15); color: #00d4aa; border: 1px solid rgba(0,212,170,0.3); }
        .badge-sell { background: rgba(255,77,109,0.15); color: #ff4d6d; border: 1px solid rgba(255,77,109,0.3); }
        .badge-hold { background: rgba(255,209,102,0.1); color: #ffd166; border: 1px solid rgba(255,209,102,0.3); }
        .metric-card { background: #0d1520; border: 1px solid #1a2d44; border-radius: 8px; padding: 12px 16px; flex: 1; min-width: 80px; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        input { background: #0d1520; border: 1px solid #1a2d44; border-radius: 6px; color: #c9d6e3; font-family: inherit; font-size: 13px; padding: 10px 14px; width: 100%; outline: none; transition: border-color 0.15s; }
        input:focus { border-color: #00d4aa; }
        .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #0f1e2e; font-size: 12px; }
        .detail-row:last-child { border-bottom: none; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0a101a", borderBottom: "1px solid #1a2d44", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #00d4aa, #0088ff)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#e8f4ff", letterSpacing: "-0.5px" }}>TradeAI</div>
            <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: "2px", textTransform: "uppercase" }}>Intelligent Market Advisor</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: 11, color: autoAlert ? "#00d4aa" : "#4a6a8a", display: "flex", alignItems: "center", gap: 6 }}>
            {autoAlert && <span className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4aa", display: "inline-block" }} />}
            AUTO-ALERT
          </div>
          <div className={`toggle ${autoAlert ? "on" : ""}`} onClick={() => setAutoAlert((v) => !v)} />
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", maxHeight: "calc(100vh - 64px)" }}>
        {/* Left Sidebar - Stock List */}
        <div style={{ width: 180, background: "#0a101a", borderRight: "1px solid #1a2d44", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: "#4a6a8a", letterSpacing: "2px", marginBottom: 8, textTransform: "uppercase" }}>Watchlist</div>
          {Object.entries(STOCKS).map(([sym, info]) => {
            const d = stockData[sym] || [];
            const p = d.map((x) => x.price);
            const cur = p[p.length - 1] || info.basePrice;
            const prev = p[0] || cur;
            const chg = ((cur - prev) / prev * 100).toFixed(2);
            const pos = cur >= prev;
            return (
              <button key={sym} className={`stock-btn ${selectedStock === sym ? "active" : ""}`} onClick={() => setSelectedStock(sym)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{sym}</span>
                  <span style={{ color: pos ? "#00d4aa" : "#ff4d6d", fontSize: 11 }}>{pos ? "+" : ""}{chg}%</span>
                </div>
                <div style={{ fontSize: 11, marginTop: 2, opacity: 0.6, textAlign: "left" }}>${cur.toFixed(2)}</div>
                <div style={{ marginTop: 4 }}>
                  <MiniChart data={d} positive={pos} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Price Header */}
          <div style={{ background: "#0d1520", borderBottom: "1px solid #1a2d44", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#e8f4ff" }}>${currentPrice.toFixed(2)}</span>
                  <span style={{ fontSize: 15, color: positive ? "#00d4aa" : "#ff4d6d", fontWeight: 500 }}>
                    {positive ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)} ({positive ? "+" : ""}{pctChange}%)
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#4a6a8a", marginTop: 2 }}>{STOCKS[selectedStock]?.name} · {STOCKS[selectedStock]?.sector}</div>
              </div>
              <div style={{ fontSize: 10, color: "#4a6a8a", textAlign: "right" }}>
                <div className="pulse" style={{ color: "#00d4aa" }}>● LIVE</div>
                <div style={{ marginTop: 2 }}>{new Date().toLocaleTimeString()}</div>
              </div>
            </div>
            <BigChart data={currentData} symbol={selectedStock} />
            {/* Metrics Row */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {[
                { label: "RSI(14)", value: rsi, color: rsiColor },
                { label: "MA(10)", value: `$${ma10}`, color: currentPrice > ma10 ? "#00d4aa" : "#ff4d6d" },
                { label: "MA(20)", value: `$${ma20}`, color: currentPrice > ma20 ? "#00d4aa" : "#ff4d6d" },
                { label: "Volume", value: currentData[currentData.length - 1]?.volume ? (currentData[currentData.length - 1].volume / 1e6).toFixed(1) + "M" : "—", color: "#7a9bbf" },
                { label: "Signal", value: rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : "NEUTRAL", color: rsi > 70 ? "#ff4d6d" : rsi < 30 ? "#00d4aa" : "#ffd166" },
              ].map((m) => (
                <div key={m.label} className="metric-card">
                  <div style={{ fontSize: 9, color: "#4a6a8a", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ background: "#0a101a", borderBottom: "1px solid #1a2d44", display: "flex", padding: "0 20px" }}>
            <button className={`tab-btn ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>AI Chat</button>
            <button className={`tab-btn ${tab === "alerts" ? "active" : ""}`} onClick={() => setTab("alerts")}>
              Alert Log {alertLog.length > 0 && <span style={{ background: "#ff4d6d", color: "white", borderRadius: "10px", padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{alertLog.length}</span>}
            </button>
          </div>

          {tab === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Quick Ask */}
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #0f1e2e", display: "flex", gap: 8, overflowX: "auto" }}>
                {["Should I buy now?", "Good time to sell?", "What's the trend?", "Risk analysis", "Price target?"].map((q) => (
                  <button key={q} className="quick-btn" onClick={() => handleQuickAsk(q)} disabled={loading}>{q}</button>
                ))}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div className={`msg-bubble ${msg.role === "user" ? "msg-user" : "msg-ai"} ${msg.isAlert ? "msg-alert" : ""}`}>
                      {msg.action && (
                        <div className={`action-badge badge-${msg.action.toLowerCase()}`}>{msg.action}</div>
                      )}
                      {msg.parsed && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "#4a6a8a" }}>Confidence: <span style={{ color: msg.parsed.confidence === "High" ? "#00d4aa" : msg.parsed.confidence === "Medium" ? "#ffd166" : "#ff4d6d" }}>{msg.parsed.confidence}</span></span>
                            <span style={{ fontSize: 11, color: "#4a6a8a" }}>Risk: <span style={{ color: msg.parsed.riskLevel === "Low" ? "#00d4aa" : msg.parsed.riskLevel === "Medium" ? "#ffd166" : "#ff4d6d" }}>{msg.parsed.riskLevel}</span></span>
                          </div>
                          {msg.parsed.entryPrice && <div style={{ fontSize: 11, color: "#7a9bbf" }}>Entry: <span style={{ color: "#e8f4ff" }}>${msg.parsed.entryPrice}</span> · Target: <span style={{ color: "#00d4aa" }}>${msg.parsed.targetPrice}</span> · Stop: <span style={{ color: "#ff4d6d" }}>${msg.parsed.stopLoss}</span></div>}
                        </div>
                      )}
                      <div style={{ color: msg.role === "user" ? "#a0d4bb" : "#c9d6e3" }}>{msg.text}</div>
                      {msg.parsed?.reasoning && msg.parsed.reasoning !== msg.text && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "#4a6a8a", borderTop: "1px solid #1a2d44", paddingTop: 8 }}>{msg.parsed.reasoning}</div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div className="msg-bubble msg-ai" style={{ color: "#4a6a8a" }}>
                      <span className="pulse">Analyzing market data</span>
                      <span className="pulse" style={{ animationDelay: "0.3s" }}>.</span>
                      <span className="pulse" style={{ animationDelay: "0.6s" }}>.</span>
                      <span className="pulse" style={{ animationDelay: "0.9s" }}>.</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid #1a2d44", display: "flex", gap: 10, background: "#0a101a" }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={`Ask about ${selectedStock}...`}
                  disabled={loading}
                />
                <button className="send-btn" onClick={handleSend} disabled={loading || !input.trim()}>Send</button>
              </div>
            </div>
          )}

          {tab === "alerts" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {alertLog.length === 0 ? (
                <div style={{ textAlign: "center", color: "#4a6a8a", marginTop: 60, fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔕</div>
                  <div>No auto-alerts yet.</div>
                  <div style={{ marginTop: 6, fontSize: 11 }}>Enable Auto-Alert in the header to receive real-time signals.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {alertLog.map((alert) => (
                    <div key={alert.id} style={{ background: "#0d1520", border: `1px solid ${alert.action === "BUY" ? "rgba(0,212,170,0.2)" : "rgba(255,77,109,0.2)"}`, borderRadius: 8, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span className={`action-badge badge-${alert.action.toLowerCase()}`}>{alert.action}</span>
                          <span style={{ fontWeight: 600, color: "#e8f4ff" }}>{alert.stock}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#4a6a8a" }}>{alert.time}</span>
                      </div>
                      <div className="detail-row"><span style={{ color: "#4a6a8a" }}>Price at signal</span><span style={{ color: "#e8f4ff" }}>${alert.price}</span></div>
                      {alert.targetPrice && <div className="detail-row"><span style={{ color: "#4a6a8a" }}>Target</span><span style={{ color: "#00d4aa" }}>${alert.targetPrice}</span></div>}
                      {alert.stopLoss && <div className="detail-row"><span style={{ color: "#4a6a8a" }}>Stop Loss</span><span style={{ color: "#ff4d6d" }}>${alert.stopLoss}</span></div>}
                      <div style={{ marginTop: 8, fontSize: 12, color: "#7a9bbf" }}>{alert.reasoning}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
