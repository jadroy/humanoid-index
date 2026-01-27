"use client";

import { useState, useRef, useEffect } from "react";
import { humanoids } from "@/data/humanoids";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: typeof humanoids;
}

// Simple keyword-based matching for humanoid suggestions
function findHumanoids(query: string): typeof humanoids {
  const q = query.toLowerCase();

  const matches: { humanoid: typeof humanoids[0]; score: number }[] = [];

  humanoids.forEach((h) => {
    let score = 0;
    const desc = (h.description || "").toLowerCase();

    // Home/domestic use cases
    if (q.match(/home|house|chore|clean|domestic|laundry|dishes|cook|espresso/)) {
      if (desc.includes("home") || desc.includes("domestic") || desc.includes("household")) score += 10;
      if (h.name === "Memo" || h.name === "Neo") score += 8;
    }

    // Warehouse/logistics
    if (q.match(/warehouse|logistics|delivery|package|amazon|shipping|storage/)) {
      if (desc.includes("logistics") || desc.includes("warehouse")) score += 10;
      if (h.name === "Digit") score += 10;
      if (h.name === "Apollo") score += 6;
    }

    // Industrial/manufacturing
    if (q.match(/industrial|factory|manufacturing|assembly|production/)) {
      if (desc.includes("industrial") || desc.includes("manufacturing")) score += 10;
      if (h.name === "Electric Atlas" || h.name === "Apollo") score += 8;
    }

    // Research/affordable
    if (q.match(/research|study|university|lab|affordable|cheap|budget|low.?cost/)) {
      if (h.cost && h.cost !== "N/A") {
        const costNum = parseInt(h.cost.replace(/[^0-9]/g, ""));
        if (costNum < 50) score += 10;
        else if (costNum < 100) score += 5;
      }
      if (h.name === "G1") score += 10;
    }

    // Speed requirements
    if (q.match(/fast|speed|quick|agile/)) {
      if (h.maxSpeed && h.maxSpeed >= 3) score += 8;
      if (h.name === "Neo") score += 6;
    }

    // Safe/human interaction
    if (q.match(/safe|gentle|human.?interaction|around.?people|family|kids|children/)) {
      if (desc.includes("safe") || desc.includes("human interaction")) score += 10;
      if (h.name === "Neo") score += 8;
      if (h.weight && h.weight < 40) score += 4;
    }

    // General purpose / AI
    if (q.match(/general|versatile|smart|ai|intelligent|learn/)) {
      if (desc.includes("general") || desc.includes("AI") || desc.includes("cognition")) score += 6;
      if (h.name === "Phoenix" || h.name === "Figure 02") score += 5;
    }

    // Dexterous hands/manipulation
    if (q.match(/hands|grip|manipulat|dexterous|pick|grab|hold/)) {
      if (h.dof && h.dof >= 30) score += 6;
      if (desc.includes("dexterous") || desc.includes("hands")) score += 8;
    }

    // Available now / production ready
    if (q.match(/available|buy|purchase|now|ready|production/)) {
      if (h.status === "In Production") score += 10;
      if (h.purchaseUrl) score += 5;
    }

    if (score > 0) {
      matches.push({ humanoid: h, score });
    }
  });

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((m) => m.humanoid);
}

function generateResponse(query: string): Message {
  const suggestions = findHumanoids(query);

  if (suggestions.length === 0) {
    return {
      role: "assistant",
      content: "I'm not sure which humanoid would be best for that. Could you tell me more about what you need? For example: home chores, warehouse work, research, or something budget-friendly?",
    };
  }

  const topPick = suggestions[0];
  let response = `I'd recommend **${topPick.name}** by ${topPick.manufacturer}. `;

  if (topPick.description) {
    response += topPick.description.split(".")[0] + ". ";
  }

  if (topPick.cost && topPick.cost !== "N/A") {
    response += `Priced at ${topPick.cost}.`;
  }

  if (suggestions.length > 1) {
    response += `\n\nAlso consider: ${suggestions.slice(1).map(s => s.name).join(", ")}.`;
  }

  return {
    role: "assistant",
    content: response,
    suggestions,
  };
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! Looking for a humanoid robot? Tell me what you need it for and I'll help you find the right one.",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    const response = generateResponse(input);

    setMessages((prev) => [...prev, userMessage, response]);
    setInput("");
  };

  const quickPrompts = [
    "Home chores",
    "Warehouse work",
    "Budget friendly",
    "Research use",
  ];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-28 sm:right-8 z-50">
      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[calc(100vw-32px)] sm:w-[360px] max-w-[360px] bg-gradient-to-b from-white to-neutral-50/95 backdrop-blur-xl rounded-[28px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] border border-white/60 overflow-hidden animate-blur-fade">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 20a7 7 0 0 1 14 0" />
                    <path d="M12 12v2" />
                  </svg>
                </div>
                <div>
                  <div className="text-[14px] font-medium text-white">Robot Advisor</div>
                  <div className="text-[11px] text-white/50">Find your perfect humanoid</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[320px] overflow-y-auto p-5 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-blur-fade`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className={`max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-neutral-900 to-neutral-800 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm"
                      : "bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-bl-md shadow-sm ring-1 ring-neutral-100"
                  }`}
                >
                  <div className={`text-[13px] leading-relaxed ${msg.role === "assistant" ? "text-neutral-600" : ""}`}>
                    {msg.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>
                        {line.split("**").map((part, k) =>
                          k % 2 === 1 ? <strong key={k} className={msg.role === "user" ? "text-white" : "text-neutral-800 font-semibold"}>{part}</strong> : part
                        )}
                      </p>
                    ))}
                  </div>
                  {/* Suggestion cards */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
                      {msg.suggestions.map((s) => (
                        <a
                          key={s.id}
                          href={`/robot/${s.id}`}
                          className="group flex items-center gap-3 p-2.5 bg-gradient-to-r from-neutral-50 to-white rounded-xl border border-neutral-200/80 hover:border-neutral-300 hover:shadow-md transition-all duration-200"
                        >
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 overflow-hidden flex-shrink-0 ring-1 ring-neutral-200/50">
                            <img
                              src={s.imageUrl || "/robots/placeholder.png"}
                              alt={s.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold text-neutral-800 truncate">{s.name}</div>
                            <div className="text-[11px] text-neutral-400 truncate">{s.manufacturer}</div>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-neutral-100 group-hover:bg-neutral-900 flex items-center justify-center transition-colors flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-400 group-hover:text-white transition-colors">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts - only show if no user messages yet */}
          {messages.length === 1 && (
            <div className="px-5 pb-3">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-2">Quick questions</p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      const userMessage: Message = { role: "user", content: prompt };
                      const response = generateResponse(prompt);
                      setMessages((prev) => [...prev, userMessage, response]);
                    }}
                    className="px-4 py-2.5 sm:px-3.5 sm:py-2 text-[12px] text-neutral-600 bg-white hover:bg-neutral-900 hover:text-white rounded-xl ring-1 ring-neutral-200 hover:ring-neutral-900 transition-all duration-200 shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-neutral-100 bg-white/50">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you need a robot for?"
                className="flex-1 px-4 py-3 text-[13px] bg-white rounded-xl outline-none ring-1 ring-neutral-200 focus:ring-2 focus:ring-neutral-900 transition-all placeholder:text-neutral-400"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-11 h-11 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center flex-shrink-0 shadow-sm hover:shadow-md"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative group w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "bg-neutral-900 text-white shadow-lg"
            : "bg-white text-neutral-600 shadow-lg shadow-neutral-200/50 hover:shadow-xl hover:scale-105 ring-1 ring-neutral-200/50"
        }`}
      >
        {!isOpen && (
          <span className="absolute inset-0 rounded-2xl animate-ping bg-neutral-900/10" style={{ animationDuration: '2s' }} />
        )}
        {isOpen ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        )}
      </button>
    </div>
  );
}
