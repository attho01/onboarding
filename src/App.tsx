/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Award,
  ShieldCheck,
  PhoneCall,
  FileText,
  ChevronRight,
  TrendingUp,
  X,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Send,
  User,
  RefreshCw,
  Briefcase,
  AlertCircle,
  HelpCircle,
  Calendar,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  Home
} from "lucide-react";
import { Message, JournalEntry, AnalysisData } from "./types";
import { DIAGNOSIS_QUESTIONS, LABOR_LAW_QUIZ, SUPPORT_CHANNELS } from "./data";

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'diagnosis' | 'quiz' | 'journal' | 'shelter'>('home');

  // --- Gemini API Key Custom Configuration States ---
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem("custom_gemini_api_key") || "");
  const [isValidatedKey, setIsValidatedKey] = useState<boolean>(() => localStorage.getItem("custom_gemini_api_key_valid") === "true");
  const [isKeyGuideOpen, setIsKeyGuideOpen] = useState<boolean>(true);
  const [validationLoading, setValidationLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<boolean>(false);

  // Helper to derive fetch headers with api key
  const getApiHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const savedKey = localStorage.getItem("custom_gemini_api_key");
    if (savedKey) {
      headers["x-gemini-api-key"] = savedKey;
    }
    return headers;
  };

  // Validate custom API Key against endpoint
  const handleValidateApiKey = async (rawKey: string) => {
    if (!rawKey.trim()) {
      setValidationError("Gemini API Key를 입력해 주세요.");
      return;
    }
    setValidationLoading(true);
    setValidationError(null);
    setValidationSuccess(false);

    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": rawKey.trim()
        },
        body: JSON.stringify({ key: rawKey.trim() })
      });

      if (!res.ok) {
        let errMsg = "API Key가 올바르지 않거나 활성화되지 않았습니다. 인터넷 상태 및 키의 글자를 확인해 주세요.";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await res.json();
            errMsg = errData.error || errMsg;
          } else {
            const text = await res.text();
            console.error("Non-JSON error response received:", text.slice(0, 200));
            errMsg = "서버 백엔드가 실행 중이 아니거나 일시적인 네트워크 연결 오류가 발생했습니다. 개발 서버를 재기동해 주세요.";
          }
        } catch (parseErr) {
          console.error("Failed to parse error response:", parseErr);
        }
        throw new Error(errMsg);
      }

      let data: any = {};
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          throw new Error("서버가 올바르지 않은 응답 신호를 보냈습니다. (Non-JSON)");
        }
      } catch (jsonErr: any) {
        throw new Error(jsonErr.message || "서버 응답을 안전하게 해독하지 못했습니다.");
      }
      if (data.success) {
        localStorage.setItem("custom_gemini_api_key", rawKey.trim());
        localStorage.setItem("custom_gemini_api_key_valid", "true");
        setCustomApiKey(rawKey.trim());
        setIsValidatedKey(true);
        setValidationSuccess(true);
        setValidationError(null);
        setTimeout(() => setValidationSuccess(false), 3000);
      }
    } catch (err: any) {
      let clientMsg = err.message || "서버 혹은 API 통신 오류가 발생했습니다.";
      if (clientMsg.includes("{") && clientMsg.includes("}")) {
        clientMsg = "올바르지 않은 Gemini API Key입니다. 복사한 키가 중간에 끊기거나 오타가 있진 않은지 꼭 확인해 주세요.";
      }
      setValidationError(clientMsg);
      setIsValidatedKey(false);
      localStorage.removeItem("custom_gemini_api_key_valid");
    } finally {
      setValidationLoading(false);
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem("custom_gemini_api_key");
    localStorage.removeItem("custom_gemini_api_key_valid");
    setCustomApiKey("");
    setIsValidatedKey(false);
    setValidationError(null);
    setValidationSuccess(false);
  };

  // Guard access to other tabs. If Gemini API Key is not validated, force navigation back to 'home'
  useEffect(() => {
    if (!isValidatedKey && activeTab !== 'home') {
      setActiveTab('home');
      setValidationError("이 메뉴를 이용하시려면 먼저 아래의 'Gemini API Key'를 입력한 후 [시작하기] 버튼을 통해 인증을 완료해 주셔야 합니다.");
      setTimeout(() => {
        const element = document.getElementById("api-key-section");
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [isValidatedKey, activeTab]);

  // --- Landing Page Interactive States ---
  const [LP_sasu, setLP_sasu] = useState<number>(2); // 1: 온화함, 2: 대충 가르쳐줌, 3: 한숨 눈치, 4: 가스라이팅/텃세
  const [LP_overtime, setLP_overtime] = useState<number>(2); // 1: 칼퇴, 2: 1~2시간 눈치야근, 3: 포괄임금제 무수당, 4: 주말 긴급소집
  const [LP_drink, setLP_drink] = useState<number>(1); // 1: 자율참여, 2: 은근한 소외/눈총, 3: 반강제 폭음 강요

  // --- Copy Functionality & Chat Section Splitter ---
  interface ResponseCard {
    id: string;
    type: 'empathy' | 'diagnosis' | 'solutions_header' | 'solution_item' | 'master_word' | 'general';
    title: string;
    contentLines: string[];
  }

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 1800);
        })
        .catch(() => {
          fallbackCopyText(text, id);
        });
    } else {
      fallbackCopyText(text, id);
    }
  };

  const fallbackCopyText = (text: string, id: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
      }
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
  };

  const splitResponseIntoCards = (content: string): ResponseCard[] => {
    const lines = content.split('\n');
    const cards: ResponseCard[] = [];
    
    let currentCard: ResponseCard | null = null;
    
    const finishCurrentCard = () => {
      if (currentCard) {
        let startIdx = 0;
        while (startIdx < currentCard.contentLines.length && !currentCard.contentLines[startIdx].trim()) {
          startIdx++;
        }
        let endIdx = currentCard.contentLines.length - 1;
        while (endIdx >= startIdx && !currentCard.contentLines[endIdx].trim()) {
          endIdx--;
        }
        if (startIdx <= endIdx) {
          currentCard.contentLines = currentCard.contentLines.slice(startIdx, endIdx + 1);
          cards.push(currentCard);
        } else if (currentCard.title) {
          cards.push(currentCard);
        }
        currentCard = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith("###")) {
        finishCurrentCard();
        
        const titleText = trimmed.replace("###", "").trim();
        let type: ResponseCard['type'] = 'general';
        if (titleText.includes("공감")) {
          type = 'empathy';
        } else if (titleText.includes("진단")) {
          type = 'diagnosis';
        } else if (titleText.includes("솔루션") || titleText.includes("해결")) {
          type = 'solutions_header';
        } else if (titleText.includes("한마디") || titleText.includes("기억")) {
          type = 'master_word';
        }
        
        currentCard = {
          id: `card-header-${i}`,
          type,
          title: titleText,
          contentLines: []
        };
        continue;
      }
      
      const isSolutionTitle = trimmed.startsWith("**") && (trimmed.includes("📌") || /^\*\*\d+\./.test(trimmed));
      if (isSolutionTitle) {
        finishCurrentCard();
        
        const titleText = trimmed.replace(/\*\*/g, "").trim();
        currentCard = {
          id: `card-sol-${i}`,
          type: 'solution_item',
          title: titleText,
          contentLines: []
        };
        continue;
      }
      
      if (!currentCard) {
        currentCard = {
          id: `card-gen-${i}`,
          type: 'general',
          title: '',
          contentLines: []
        };
      }
      
      currentCard.contentLines.push(line);
    }
    
    finishCurrentCard();
    return cards;
  };

  const renderAssistantCards = (content: string, msgId: string) => {
    const cards = splitResponseIntoCards(content);
    
    return cards.map((card) => {
      const copyText = card.title 
        ? `${card.title}\n\n${card.contentLines.join('\n')}` 
        : card.contentLines.join('\n');
      const uniqueId = `${msgId}-${card.id}`;
      const isRecentlyCopied = copiedId === uniqueId;

      if (card.type === 'empathy') {
        return (
          <div key={card.id} className="bg-amber-100/10 border border-amber-200/50 rounded-[24px] p-4.5 sm:p-5.5 relative shadow-3xs overflow-hidden w-full">
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-amber-100/15 to-transparent rounded-full pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2 border-b border-[#E6E2D3]/40">
              <div className="flex items-center gap-2">
                <Heart className="w-4.5 h-4.5 text-[#A67C52] fill-amber-100 shrink-0" />
                <h4 className="text-xs font-extrabold text-[#A67C52]">{card.title || "따뜻한 공감"}</h4>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(copyText, uniqueId)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer select-none self-start sm:self-auto ${
                  isRecentlyCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-3xs'
                    : 'bg-white hover:bg-amber-50/50 text-slate-600 border-[#E6E2D3] hover:text-[#A67C52]'
                }`}
              >
                {isRecentlyCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>공감 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>공감 복사</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[13px] leading-relaxed text-[#4A4A35]">
              {parseResponseToHtml(card.contentLines.join('\n'))}
            </div>
          </div>
        );
      }

      if (card.type === 'diagnosis') {
        return (
          <div key={card.id} className="bg-natural-bg border border-natural-border rounded-[24px] p-4.5 sm:p-5.5 relative shadow-3xs overflow-hidden w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2 border-b border-natural-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-natural-olive shrink-0" />
                <h4 className="text-xs font-extrabold text-natural-dark">{card.title || "문제 상황 진단"}</h4>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(copyText, uniqueId)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer select-none self-start sm:self-auto ${
                  isRecentlyCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-3xs'
                    : 'bg-white hover:bg-natural-fill text-slate-600 border-natural-border hover:text-natural-olive'
                }`}
              >
                {isRecentlyCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>진단 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>진단 복사</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[13px] leading-relaxed text-[#4A4A35]">
              {parseResponseToHtml(card.contentLines.join('\n'))}
            </div>
          </div>
        );
      }

      if (card.type === 'solutions_header') {
        return (
          <div key={card.id} className="my-4 pl-2.5 flex items-center gap-2 border-l-4 border-natural-olive select-none">
            <h4 className="text-xs font-black text-natural-dark">{card.title}</h4>
          </div>
        );
      }

      if (card.type === 'solution_item') {
        return (
          <div key={card.id} className="bg-white border border-emerald-200/80 rounded-[24px] p-4.5 sm:p-5.5 shadow-[0_3px_12px_rgba(16,185,129,0.015)] relative hover:shadow-[0_4px_16px_rgba(16,185,129,0.035)] transition-all overflow-hidden w-full">
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-emerald-50/15 to-transparent rounded-full pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-3 pb-2 border-b border-emerald-100">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-50 text-emerald-750 rounded-full flex items-center justify-center font-bold text-[10px] border border-emerald-100 shrink-0 select-none mt-0.5">
                  📌
                </span>
                <h4 className="text-[12.5px] font-black text-natural-dark leading-snug">
                  {card.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(copyText, uniqueId)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer shrink-0 select-none self-start sm:self-auto ${
                  isRecentlyCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-3xs'
                    : 'bg-emerald-55/9 hover:bg-emerald-50/70 text-emerald-800 border-emerald-25/5'
                }`}
              >
                {isRecentlyCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>이 솔루션 복사</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[13px] leading-relaxed text-[#4A4A35]">
              {parseResponseToHtml(card.contentLines.join('\n'))}
            </div>
          </div>
        );
      }

      if (card.type === 'master_word') {
        const hasContactBadges = card.contentLines.some(l => l.includes('1350') || l.includes('1393') || l.includes('EAP'));
        return (
          <div key={card.id} className="bg-emerald-50/10 border border-natural-border rounded-[24px] p-4.5 sm:p-5.5 relative shadow-3xs overflow-hidden w-full">
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-natural-border/10 to-transparent rounded-full pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2 border-b border-natural-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-natural-gold shrink-0" />
                <h4 className="text-xs font-extrabold text-natural-dark">{card.title || "온보딩 마스터의 한마디"}</h4>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(copyText, uniqueId)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer select-none self-start sm:self-auto ${
                  isRecentlyCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-3xs'
                    : 'bg-white hover:bg-emerald-50/30 text-slate-600 border-natural-border hover:text-natural-olive'
                }`}
              >
                {isRecentlyCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>한마디 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>한마디 복사</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[13px] leading-relaxed text-[#4A4A35]">
              {parseResponseToHtml(card.contentLines.join('\n'))}
            </div>
          </div>
        );
      }

      return (
        <div key={card.id} className="bg-natural-fill text-[#4A4A35] border border-natural-border rounded-[24px] rounded-tl-none p-4.5 sm:p-5.5 relative shadow-3xs overflow-hidden w-full">
          <div className="absolute right-3.5 top-3.5">
            <button
              type="button"
              onClick={() => handleCopyText(copyText, uniqueId)}
              className={`p-1.5 rounded-full border transition-all flex items-center justify-center cursor-pointer select-none ${
                isRecentlyCopied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white hover:bg-white/85 border-[#E6E2D3]/70 text-slate-400 hover:text-slate-705'
              }`}
              title="텍스트 복사하기"
            >
              {isRecentlyCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="text-[13px] leading-relaxed text-[#4A4A35] pr-8">
            {parseResponseToHtml(card.contentLines.join('\n'))}
          </div>
        </div>
      );
    });
  };

  // --- Session: CHAT ---
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active Realtime Analysis computed from the last AI solution
  const [realtimeAnalysis, setRealtimeAnalysis] = useState<AnalysisData | null>(null);
  const [analysingProgress, setAnalysingProgress] = useState(false);

  // Suggested Topics
  const suggestedPrompts = [
    {
      title: "사수 눈치 갈등",
      text: "사수가 일을 대충 가르쳐주고 질문하면 자꾸 한숨 쉬며 눈치를 줘서 출근길이 너무 불안하고 무서워요."
    },
    {
      title: "강요된 자발적 야근",
      text: "수습 기간인데 회사 부서원들이 다 칼퇴근을 안 하고 눈치야근을 당연하게 생각합니다. 제게 수당도 없이 매일 무급 연장근로를 강요해요."
    },
    {
      title: "금요일 회식 불참 부담",
      text: "중소기업 입사 후 매주 금요일마다 거의 11시까지 반강제적인 술자리 회식이 이어집니다. 안 가면 찍힐까 봐 억지로 갑니다."
    }
  ];

  // Initialize Welcome Message
  useEffect(() => {
    const welcomeId = "welcome-" + Date.now();
    const systemWelcome: Message = {
      id: welcomeId,
      role: 'model',
      content: `안녕하세요. 새 직장에서 첫걸음을 떼고 계신 당신, 정말 고생 많으십니다. 👋
저는 신입 사원의 든든한 길잡이, **온보딩 마스터**입니다.

사수와의 미묘한 갈등, 회식·야근 부담, 답답한 보고 라인, 적응 안 되는 단톡방, 
텃세나 막내 잡일까지—한국 직장 특유의 고충, 저는 깊이 이해하고 있습니다.

상황을 자세히 알려주실수록 더 현실적인 솔루션을 드릴 수 있습니다.
(언제 / 누구와 / 어떤 상황이었는지, 회사 규모/업종까지 알려주시면 더 좋습니다)

⌨️ 지금 마음을 무겁게 하는 직장 고민, 편하게 적어주세요.`,
      timestamp: new Date()
    };
    setChatMessages([systemWelcome]);
  }, []);

  // Scroll to bottom on Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async (text: string) => {
    if (!text.trim() || isChatLoading) return;

    setAiError(null);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const chatHistory = [...chatMessages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ messages: chatHistory })
      });

      if (!res.ok) throw new Error("서버와의 연결이 다소 불완전합니다.");
      const data = await res.json();

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: data.reply,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);

      // Automatically run analysis to update visual scales
      handleAnalyzeText(text);

    } catch (err: any) {
      setAiError(err.message || "답변 전송에 실패했습니다. 다시 작성해 보세요.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAnalyzeText = async (text: string) => {
    setAnalysingProgress(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const parsedAnalysis: AnalysisData = await res.json();
        setRealtimeAnalysis(parsedAnalysis);
      }
    } catch {
      // Graceful fallback and ignore error silently to maintain chatting
    } finally {
      setAnalysingProgress(false);
    }
  };

  // --- Session: SELF DIAGNOSIS ---
  const [diagnosisAnswers, setDiagnosisAnswers] = useState<{ [key: number]: number }>({});
  const [showDiagnosisResult, setShowDiagnosisResult] = useState(false);
  const [diagnosisResultAxes, setDiagnosisResultAxes] = useState({
    relationship: 0,
    culture: 0,
    capability: 0,
    psychology: 0
  });

  const handleSelectDiagnosisOption = (questionId: number, score: number) => {
    setDiagnosisAnswers(prev => ({ ...prev, [questionId]: score }));
  };

  const handleCalculateDiagnosis = () => {
    // Collect questions per axis
    const axesSums = { relationship: 0, culture: 0, capability: 0, psychology: 0 };
    const axesCounts = { relationship: 0, culture: 0, capability: 0, psychology: 0 };

    DIAGNOSIS_QUESTIONS.forEach(q => {
      const score = diagnosisAnswers[q.id];
      if (score !== undefined) {
        axesSums[q.axis] += score;
        axesCounts[q.axis] += 1;
      }
    });

    setDiagnosisResultAxes({
      relationship: Math.round(axesCounts.relationship ? axesSums.relationship / axesCounts.relationship : 0),
      culture: Math.round(axesCounts.culture ? axesSums.culture / axesCounts.culture : 0),
      capability: Math.round(axesCounts.capability ? axesSums.capability / axesCounts.capability : 0),
      psychology: Math.round(axesCounts.psychology ? axesSums.psychology / axesCounts.psychology : 0)
    });
    setShowDiagnosisResult(true);
  };

  const handleResetDiagnosis = () => {
    setDiagnosisAnswers({});
    setShowDiagnosisResult(false);
  };

  const getDiagnosisVerdict = () => {
    const { relationship, culture, capability, psychology } = diagnosisResultAxes;
    const maxScore = Math.max(relationship, culture, capability, psychology);
    
    if (maxScore < 40) {
      return {
        title: "🟢 비교적 쾌적한 궤도 (안정권)",
        desc: "현재 직장의 업무 환경과 소통 체계는 비교적 양호하거나, 본인의 뛰어난 적응력과 긍정적 멘탈 덕분에 현명하게 제어되고 있습니다. 가벼운 고민은 전담 상담사와 속 풀이 소통을 통해 털어내는 것으로 충분합니다."
      };
    } else if (maxScore < 75) {
      return {
        title: "🟡 직장 수명 주의 경보 (조율 필요)",
        desc: "특정 영역에서 마찰이 수면에 늘고 있습니다. 사수의 업무 무관심, 불투명한 회식 문화나 압박감이 지속될 시 충동 퇴사 욕구가 치솟기 쉽습니다. 온보딩 마스터 상담실에서 구체적인 '한국식 이탤릭 소통 템플릿'을 적용해 분위기 환기를 노려보세요."
      };
    } else {
      return {
        title: "🔴 긴급 가로등 켜짐! (돌파 전략 시급)",
        desc: "상당히 극심한 조직 내 피로도를 목격하고 있습니다. 사정 깊은 괴롭힘 소지 혹은 자학적 우울감이 침범했을 가능성이 농후합니다. 혼자 고민하지 말고 즉시 EAP 무료 상담이나 국민취업지원제도 전문 기관 소통 데스크, 혹은 고용노동청 1350 전문가 제보를 적극 고려하세요."
      };
    }
  };

  // --- Session: TRIVIA QUIZ ---
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizExplanation, setShowQuizExplanation] = useState(false);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const handleSelectQuizAnswer = (optionIdx: number) => {
    if (selectedQuizAnswer !== null) return; // Prevent double selecting
    setSelectedQuizAnswer(optionIdx);
    if (optionIdx === LABOR_LAW_QUIZ[currentQuizIndex].answer) {
      setQuizScore(prev => prev + 1);
    }
    setShowQuizExplanation(true);
  };

  const handleNextQuiz = () => {
    setSelectedQuizAnswer(null);
    setShowQuizExplanation(false);
    if (currentQuizIndex < LABOR_LAW_QUIZ.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setIsQuizFinished(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedQuizAnswer(null);
    setQuizScore(0);
    setShowQuizExplanation(false);
    setIsQuizFinished(false);
  };

  // --- Session: DIARY JOURNAL ---
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalTitle, setJournalTitle] = useState("");
  const [journalContent, setJournalContent] = useState("");
  const [isAnalysingJournal, setIsAnalysingJournal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("onboarding_journals");
    if (saved) {
      try {
        setJournals(JSON.parse(saved));
      } catch {
        // Safe bypass
      }
    }
  }, []);

  const handleSaveJournal = async () => {
    if (!journalTitle.trim() || !journalContent.trim()) return;

    setIsAnalysingJournal(true);
    let analysis: AnalysisData | undefined = undefined;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ text: journalContent })
      });
      if (res.ok) {
        analysis = await res.json();
      }
    } catch {
      // Silent error - continue without analysis
    }

    const newEntry: JournalEntry = {
      id: `journal-${Date.now()}`,
      title: journalTitle,
      content: journalContent,
      timestamp: new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      analysis
    };

    const updated = [newEntry, ...journals];
    setJournals(updated);
    localStorage.setItem("onboarding_journals", JSON.stringify(updated));

    // Reset inputs
    setJournalTitle("");
    setJournalContent("");
    setIsAnalysingJournal(false);
  };

  const handleDeleteJournal = (id: string) => {
    const updated = journals.filter(j => j.id !== id);
    setJournals(updated);
    localStorage.setItem("onboarding_journals", JSON.stringify(updated));
  };


  // SVG Custom Radar Map drawer Helper
  const renderInteractiveRadar = (stats: { relationship: number, culture: number, capability: number, psychology: number }) => {
    const size = 220;
    const center = size / 2;
    const maxVal = 100;

    // Axis definitions (X, Y projections from center)
    const getCoordinates = (value: number, angleDegrees: number) => {
      const radians = (angleDegrees - 90) * (Math.PI / 180);
      const radius = (value / maxVal) * (size / 2 - 20);
      return {
        x: center + radius * Math.cos(radians),
        y: center + radius * Math.sin(radians)
      };
    };

    // Axes
    // 0deg = Relationship, 90deg = Culture, 180deg = Capability, 270deg = Psychology
    const pRelation = getCoordinates(stats.relationship, 0);
    const pCulture = getCoordinates(stats.culture, 90);
    const pCapability = getCoordinates(stats.capability, 180);
    const pPsychology = getCoordinates(stats.psychology, 270);

    // Max polygon background
    const bgRelation = getCoordinates(100, 0);
    const bgCulture = getCoordinates(100, 90);
    const bgCapability = getCoordinates(100, 180);
    const bgPsychology = getCoordinates(100, 270);

    // Guideline rings
    const ring50_0 = getCoordinates(50, 0);
    const ring50_90 = getCoordinates(50, 90);
    const ring50_180 = getCoordinates(50, 180);
    const ring50_270 = getCoordinates(50, 270);

    return (
      <div className="flex flex-col items-center p-3.5 bg-natural-fill/30 rounded-[24px] border border-natural-border">
        <svg width={size} height={size} className="overflow-visible">
          {/* External Outline Grid */}
          <polygon
            points={`${bgRelation.x},${bgRelation.y} ${bgCulture.x},${bgCulture.y} ${bgCapability.x},${bgCapability.y} ${bgPsychology.x},${bgPsychology.y}`}
            fill="none"
            stroke="#E6E2D3"
            strokeWidth="1.5"
            strokeDasharray="4"
          />

          {/* 50% threshold ring */}
          <polygon
            points={`${ring50_0.x},${ring50_0.y} ${ring50_90.x},${ring50_90.y} ${ring50_180.x},${ring50_180.y} ${ring50_270.x},${ring50_270.y}`}
            fill="none"
            stroke="#E6E2D3"
            strokeWidth="1"
          />

          {/* Core Crossbones Grid Lines */}
          <line x1={center} y1={20} x2={center} y2={size - 20} stroke="#E6E2D3" strokeWidth="1" />
          <line x1={20} y1={center} x2={size - 20} y2={center} stroke="#E6E2D3" strokeWidth="1" />

          {/* User Score Filled Polygon */}
          <polygon
            points={`${pRelation.x},${pRelation.y} ${pCulture.x},${pCulture.y} ${pCapability.x},${pCapability.y} ${pPsychology.x},${pPsychology.y}`}
            fill="rgba(90, 90, 64, 0.12)"
            stroke="#5A5A40"
            strokeWidth="2.5"
            className="transition-all duration-700 ease-out"
          />

          {/* Coordinate Points */}
          <circle cx={pRelation.x} cy={pRelation.y} r="5" fill="#5A5A40" className="transition-all duration-700 ease-out" />
          <circle cx={pCulture.x} cy={pCulture.y} r="5" fill="#5A5A40" className="transition-all duration-700 ease-out" />
          <circle cx={pCapability.x} cy={pCapability.y} r="5" fill="#A67C52" className="transition-all duration-700 ease-out" />
          <circle cx={pPsychology.x} cy={pPsychology.y} r="5" fill="#A67C52" className="transition-all duration-700 ease-out" />

          {/* Outer Directional Labels */}
          <text x={center} y={12} textAnchor="middle" className="text-[11px] font-bold font-sans fill-[#2D2D20]">🧑🤝🧑 인간관계 ({stats.relationship}점)</text>
          <text x={size - 10} y={center + 4} textAnchor="start" className="text-[11px] font-bold font-sans fill-[#2D2D20]">🏢 조직문화 ({stats.culture}점)</text>
          <text x={center} y={size - 4} textAnchor="middle" className="text-[11px] font-bold font-sans fill-[#2D2D20]">💼 업무역량 ({stats.capability}점)</text>
          <text x={10} y={center + 4} textAnchor="end" className="text-[11px] font-bold font-sans fill-[#2D2D20]">🧠 스트레스 ({stats.psychology}점)</text>
        </svg>
      </div>
    );
  };

  // Helper formatting markdown into basic HTML tags recursively to preserve italics and bold markers correctly
  const parseResponseToHtml = (content: string) => {
    if (!content) return "";
    
    // Convert newlines to paragraphs
    const paragraphs = content.split('\n');
    return paragraphs.map((block, idx) => {
      let trimmed = block.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      // Section titles
      if (trimmed.startsWith("###")) {
        const titleText = trimmed.replace("###", "").trim();
        const isHeart = titleText.includes("공감");
        const isSearch = titleText.includes("진단");
        const isTool = titleText.includes("솔루션");
        const isMaster = titleText.includes("한마디");

        let headerAccent = "text-natural-dark bg-natural-fill/40 border-natural-border";
        if (isHeart) headerAccent = "text-[#A67C52] bg-[#FFF9F5] border-[#FFE7D6]";
        if (isSearch) headerAccent = "text-[#A67C52] bg-natural-fill/80 border-natural-border";
        if (isTool) headerAccent = "text-[#5A5A40] bg-emerald-50/45 border-emerald-100/40";
        if (isMaster) headerAccent = "text-[#2D2D20] bg-natural-fill border-natural-border";

        return (
          <h3 key={idx} className={`text-sm font-bold mt-6 mb-3.5 p-3.5 border rounded-[16px] flex items-center gap-2 ${headerAccent}`}>
            {titleText}
          </h3>
        );
      }

      // Main Bullet Lists for solutions
      if (trimmed.startsWith("**") && trimmed.includes("📌")) {
        // Solution title format e.g., "**1. 📌 [제목]**"
        const formatted = trimmed.replace(/\*\*/g, "");
        return (
          <h4 key={idx} className="text-xs font-bold text-natural-dark mt-5 mb-2.5 flex items-center gap-1 bg-natural-fill p-2 rounded-xl">
            {formatted}
          </h4>
        );
      }

      // Standard lists starting with "- **이유:**" or "- **실행 방법:**"
      if (trimmed.startsWith("-")) {
        let textOnly = trimmed.substring(1).trim();
        
        // Highlight italics (actual korean dialog scripts)
        // Match content inside *"dialog"* or *\"dialog\"*
        const italicRegex = /\*\"([^\"]*)\"\*/g;
        const boldRegex = /\*\*([^*]+)\*\*/g;

        // Process bold markers inside list item
        let runningText = textOnly;
        
        return (
          <li key={idx} className="ml-4 pl-1 text-[13px] leading-relaxed text-[#4A4A35] mb-2 list-disc">
            {runningText.split(italicRegex).map((chunk, cIdx) => {
              if (cIdx % 2 === 1) {
                // This is the dialogue block in italic and customized background
                return (
                  <span key={cIdx} className="block my-2 p-3.5 bg-white rounded-2xl border-l-3 border-[#5A5A40] text-[#4A4A35] font-sans italic text-[12px] shadow-3xs leading-relaxed">
                    " {chunk} "
                  </span>
                );
              }
              // Normal text containing potential bolds
              return chunk.split(boldRegex).map((subChunk, sIdx) => {
                if (sIdx % 2 === 1) {
                  return <strong key={sIdx} className="font-bold text-natural-dark">{subChunk}</strong>;
                }
                return subChunk;
              });
            })}
          </li>
        );
      }

      // Normal lines with italic markers or bold markers
      const italicRegex = /\*\"([^\"]*)\"\*/g;
      const boldRegex = /\*\*([^*]+)\*\*/g;
      
      return (
        <p key={idx} className="text-[13px] leading-relaxed text-[#4A4A35] mb-2.5">
          {trimmed.split(italicRegex).map((chunk, cIdx) => {
            if (cIdx % 2 === 1) {
              return (
                <span key={cIdx} className="block my-2 p-3.5 bg-white rounded-2xl border-l-3 border-[#5A5A40] text-[#4A4A35] font-sans italic text-[12px] shadow-3xs leading-relaxed">
                  " {chunk} "
                </span>
              );
            }
            return chunk.split(boldRegex).map((subChunk, sIdx) => {
              if (sIdx % 2 === 1) {
                return <strong key={sIdx} className="font-bold text-natural-dark">{subChunk}</strong>;
              }
              return subChunk;
            });
          })}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-natural-bg font-sans text-slate-800 flex flex-col antialiased">
      {/* Visual Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-natural-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white font-serif italic text-2xl shadow-sm select-none shrink-0">
              O
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-extrabold text-natural-dark leading-none">온보딩 마스터</h1>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#5A5A40] font-black bg-natural-fill/60 border border-natural-border/70 px-2 py-0.5 rounded-full inline-block w-fit">
                  국민취업지원제도 전문 커리어 코칭
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-normal">수습 참여자 및 신임 사원을 위하는 근로 권익 수호 안전 기지</p>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex flex-wrap items-center justify-center lg:justify-start gap-1 bg-natural-fill p-1 rounded-2xl md:rounded-full border border-natural-border w-full lg:w-auto">
            <button
              id="tab-home"
              onClick={() => setActiveTab('home')}
              className={`flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold px-3.5 sm:px-4 py-2 rounded-full transition-all cursor-pointer flex-1 sm:flex-none ${
                activeTab === 'home'
                  ? 'bg-natural-olive text-white shadow-xs'
                  : 'text-slate-600 hover:bg-[#E6E2D3]/40'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>홈</span>
            </button>
            <button
              id="tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold px-3.5 sm:px-4 py-2 rounded-full transition-all cursor-pointer flex-1 sm:flex-none ${
                activeTab === 'chat'
                  ? 'bg-natural-olive text-white shadow-xs'
                  : !isValidatedKey
                    ? 'text-slate-400 opacity-60 hover:bg-[#E6E2D3]/20'
                    : 'text-slate-600 hover:bg-[#E6E2D3]/40'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>실시간 고민 코칭</span>
              {!isValidatedKey && <span className="text-[10px] ml-0.5 select-none" title="Gemini 키 인증 후 잠금해제">🔒</span>}
            </button>
            <button
              id="tab-diagnosis"
              onClick={() => setActiveTab('diagnosis')}
              className={`flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold px-3.5 sm:px-4 py-2 rounded-full transition-all cursor-pointer flex-1 sm:flex-none ${
                activeTab === 'diagnosis'
                  ? 'bg-natural-olive text-white shadow-xs'
                  : !isValidatedKey
                    ? 'text-slate-400 opacity-60 hover:bg-[#E6E2D3]/20'
                    : 'text-slate-600 hover:bg-[#E6E2D3]/40'
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>4축 자가진단</span>
              {!isValidatedKey && <span className="text-[10px] ml-0.5 select-none" title="Gemini 키 인증 후 잠금해제">🔒</span>}
            </button>
            <button
              id="tab-quiz"
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold px-3.5 sm:px-4 py-2 rounded-full transition-all cursor-pointer flex-1 sm:flex-none ${
                activeTab === 'quiz'
                  ? 'bg-natural-olive text-white shadow-xs'
                  : !isValidatedKey
                    ? 'text-slate-400 opacity-60 hover:bg-[#E6E2D3]/20'
                    : 'text-slate-600 hover:bg-[#E6E2D3]/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>생존 노동법 퀴즈</span>
              {!isValidatedKey && <span className="text-[10px] ml-0.5 select-none" title="Gemini 키 인증 후 잠금해제">🔒</span>}
            </button>
            <button
              id="tab-journal"
              onClick={() => setActiveTab('journal')}
              className={`flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold px-3.5 sm:px-4 py-2 rounded-full transition-all cursor-pointer flex-1 sm:flex-none ${
                activeTab === 'journal'
                   ? 'bg-natural-olive text-white shadow-xs'
                  : !isValidatedKey
                    ? 'text-slate-400 opacity-60 hover:bg-[#E6E2D3]/20'
                    : 'text-slate-600 hover:bg-[#E6E2D3]/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>고민 치료 일지</span>
              {!isValidatedKey && <span className="text-[10px] ml-0.5 select-none" title="Gemini 키 인증 후 잠금해제">🔒</span>}
            </button>
            <button
              id="tab-shelter"
              onClick={() => setActiveTab('shelter')}
              className={`flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold px-3.5 sm:px-4 py-2 rounded-full transition-all cursor-pointer flex-1 sm:flex-none ${
                activeTab === 'shelter'
                  ? 'bg-natural-olive text-white shadow-xs'
                  : !isValidatedKey
                    ? 'text-slate-400 opacity-60 hover:bg-[#E6E2D3]/20'
                    : 'text-slate-600 hover:bg-[#E6E2D3]/40'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 shrink-0" />
              <span>마음 구호 센터</span>
              {!isValidatedKey && <span className="text-[10px] ml-0.5 select-none" title="Gemini 키 인증 후 잠금해제">🔒</span>}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* 0. PREMIUM LANDING PAGE */}
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10 pb-16 w-full"
            >
              {/* 1. Hero Spotlight Section */}
              <section className="bg-gradient-to-br from-[#1E40AF] via-[#1D4ED8] to-[#1E3A8A] text-white rounded-[32px] p-6 sm:p-12 relative overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(191,219,254,0.15),transparent)] pointer-events-none" />
                <div className="absolute right-0 bottom-0 w-80 h-80 bg-gradient-to-tl from-[#3B82F6]/10 to-transparent rounded-full pointer-events-none" />
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  <div className="lg:col-span-7 space-y-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full text-[10px] sm:text-xs font-black tracking-wide">
                      🌱 신입 안착 및 국민취업지원제도 전문 보조 가이드
                    </span>
                    
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-[1.2] text-white">
                      어렵고 고단한 <span className="text-[#93C5FD] underline decoration-[#3B82F6] decoration-3 underline-offset-4">한국형 수습 기간,</span><br />
                      이제 온보딩 마스터와 함께 현명하게 생존하세요.
                    </h2>
                    
                    <p className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed max-w-xl">
                      직속 사수와의 마찰, 까다로운 사내 예절, 교묘하게 야근을 압박하는 분위기까지. 
                      혼자 앓으며 밤새 퇴사를 고민하지 마세요. 100% 익명이 보장되는 든든한 커리어 안전기지에서 즉시 실행 가능한 솔루션을 제공합니다.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="bg-white hover:bg-slate-50 text-[#1E3A8A] font-extrabold text-xs px-6 py-3.5 rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-[#1E40AF]" />
                        <span>익명 고민 집중 코칭받기</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#3B82F6] group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button
                        onClick={() => setActiveTab('diagnosis')}
                        className="bg-transparent hover:bg-white/5 text-white border border-white/30 font-bold text-xs px-6 py-3.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>우려 상태 4축 자가진단</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Hero Right: Real-time dynamic stats dashboard */}
                  <div className="lg:col-span-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#3B82F6] animate-pulse" />
                        <span className="text-xs font-bold text-[#E2E8F0] tracking-wider">직장 생존 지표 안심계</span>
                      </div>
                      <span className="text-[10px] text-white/50 font-semibold tracking-wider uppercase">Active Live</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-white/90 mb-1">
                          <span>🛡️ 멘탈 방어 등급 (Mental Shield)</span>
                          <span className="text-[#93C5FD]">Level 5 (최상)</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#3B82F6] h-full w-[94%]" />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-white/90 mb-1">
                          <span>⚖️ 노동 위법 저항 (Labor Protection)</span>
                          <span className="text-[#93C5FD]">96% 완비</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#3B82F6] h-full w-[96%]" />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-white/90 mb-1">
                          <span>💬 사사고민 극복성 (Feedback Immunity)</span>
                          <span className="text-[#E6E2D3]">안정 (Cautious Defended)</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-400 h-full w-[88%]" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 text-[11px] text-[#F0EDE6] leading-relaxed">
                      💡 온보딩 마스터는 노동법적 가이드라인에 완전히 부합하며, 겪으시는 고민 수치는 어떠한 기록이나 불이익 없이 100% 암호화 처리됩니다.
                    </div>
                  </div>
                </div>
              </section>

              {/* Gemini API Key Configuration Section (User-defined key verification gateway) */}
              <section id="api-key-section" className="bg-[#FCFAF7] rounded-[32px] border border-natural-border p-6 sm:p-8 shadow-3xs space-y-6 scroll-mt-24">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Top Checkbox Title */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center text-white shrink-0 shadow-2xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-[14px] sm:text-[15px] font-extrabold text-slate-800 tracking-tight">
                      무료로 시작하세요. Gemini API 키만 있으면 됩니다.
                    </span>
                  </div>

                  {/* Input form & Button */}
                  <div className="bg-white rounded-2xl border border-[#E6E2D3] p-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xs hover:shadow-xs transition-all">
                    <div className="flex-1 flex items-center gap-2.5 px-3 py-2">
                       <svg className="w-4.5 h-4.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <input
                        type="password"
                        placeholder="Gemini API Key 입력 (AIzaSy 로 시작하는 키)"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm font-semibold border-none outline-none w-full text-slate-800 placeholder-slate-400 focus:ring-0"
                      />
                      {isValidatedKey && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200/60 shrink-0 select-none animate-pulse">
                          인증 및 적용 완료!
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {customApiKey && (
                        <button
                          onClick={handleClearApiKey}
                          className="mr-1 text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-full transition-colors cursor-pointer"
                        >
                          초기화
                        </button>
                      )}
                      <button
                        onClick={() => handleValidateApiKey(customApiKey)}
                        disabled={validationLoading}
                        className="bg-natural-olive hover:bg-natural-olive-dark text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                      >
                        {validationLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>인증 확인 중...</span>
                          </>
                        ) : (
                          <span>시작하기</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {validationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{validationError}</span>
                    </motion.div>
                  )}
                  {validationSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-emerald-50 border border-[#A7F3D0]/60 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Gemini API Key 검증을 성공적으로 마쳤습니다! 이제 안심고민 상담 및 분석 진단 서비스가 완벽하게 가동됩니다.</span>
                    </motion.div>
                  )}

                  {/* API Issuance Guide Accordion */}
                  <div className="bg-white border border-natural-border rounded-2xl overflow-hidden shadow-2xs">
                    {/* Header */}
                    <button
                      onClick={() => setIsKeyGuideOpen(!isKeyGuideOpen)}
                      className="w-full flex items-center justify-between p-4 bg-natural-fill/30 border-b border-natural-border/60 hover:bg-natural-fill/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-natural-olive">
                        <HelpCircle className="w-4.5 h-4.5 text-natural-olive" />
                        <span className="text-xs sm:text-[13px] font-extrabold text-slate-800">
                          Gemini API Key 발급 가이드
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-250 ${
                          isKeyGuideOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Expandable Body */}
                    <AnimatePresence initial={false}>
                      {isKeyGuideOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 sm:p-5 space-y-4 text-slate-700 border-t border-natural-border">
                            {/* Steps */}
                            <div className="space-y-4 text-slate-600 text-[11.5px] sm:text-xs leading-relaxed">
                              {/* Step 1 */}
                              <div className="flex items-start gap-3">
                                <div className="w-5.5 h-5.5 rounded bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  1
                                </div>
                                <div className="space-y-0.5">
                                  <strong className="block text-slate-800 text-[12.5px]">Google AI Studio 접속</strong>
                                  <p className="text-[11px] text-slate-500 leading-normal">
                                    아래 링크를 클릭하여 Google AI Studio 키 발급 관리 센터에 바로 접속하세요.
                                  </p>
                                  <a
                                    href="https://aistudio.google.com/apikey"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-blue-600 hover:underline font-bold block text-[11px] mt-0.5"
                                  >
                                    https://aistudio.google.com/apikey
                                  </a>
                                </div>
                              </div>

                              {/* Step 2 */}
                              <div className="flex items-start gap-3">
                                <div className="w-5.5 h-5.5 rounded bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  2
                                </div>
                                <div className="space-y-0.5">
                                  <strong className="block text-slate-800 text-[12.5px]">Google 계정으로 로그인</strong>
                                  <p className="text-[11px] text-slate-500 leading-normal">
                                    기존 Gmail/구글 계정으로 로그인하세요. 구글 계정이 없다면 신규 계정을 무료로 생성할 수 있습니다.
                                  </p>
                                </div>
                              </div>

                              {/* Step 3 */}
                              <div className="flex items-start gap-3">
                                <div className="w-5.5 h-5.5 rounded bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  3
                                </div>
                                <div className="space-y-0.5">
                                  <strong className="block text-slate-800 text-[12.5px]">'API 키 만들기' 클릭</strong>
                                  <p className="text-[11px] text-slate-500 leading-normal">
                                    화면에서 'Create API Key' 또는 'API 키 만들기' 버튼을 클릭하세요.
                                  </p>
                                </div>
                              </div>

                              {/* Step 4 */}
                              <div className="flex items-start gap-3">
                                <div className="w-5.5 h-5.5 rounded bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  4
                                </div>
                                <div className="space-y-0.5">
                                  <strong className="block text-slate-800 text-[12.5px]">프로젝트 선택 후 생성</strong>
                                  <p className="text-[11px] text-slate-500 leading-normal">
                                    기본 프로젝트를 선택하고 'Create API key in existing project'를 클릭하세요.
                                  </p>
                                </div>
                              </div>

                              {/* Step 5 */}
                              <div className="flex items-start gap-3">
                                <div className="w-5.5 h-5.5 rounded bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  5
                                </div>
                                <div className="space-y-0.5">
                                  <strong className="block text-slate-800 text-[12.5px]">API 키 복사</strong>
                                  <p className="text-[11px] text-slate-500 leading-normal">
                                    생성된 API 키(AIza로 시작)를 복사하세요. 이 키를 입력창에 붙여넣기하면 됩니다!
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Direct link button inside guide body */}
                            <div className="pt-2">
                              <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noreferrer noopener"
                                className="w-full bg-[#EBF5FF] hover:bg-[#D6EBFF] text-[#1E3A8A] font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none text-center"
                              >
                                <span>🔑 API 키 발급 페이지로 이동</span>
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footnote agreements */}
                  <div className="text-center pt-1 pb-1">
                    <p className="text-[10.5px] text-slate-400 font-medium">
                      가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다
                    </p>
                  </div>
                </div>
              </section>

              {/* 2. Office Wellness Interactive Simulator */}
              <section className="bg-white rounded-[32px] border border-natural-border p-6 sm:p-8 shadow-3xs space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-natural-border pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-natural-dark flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-natural-gold" />
                      <span>내 직장 적응 피로도 시뮬레이터</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">간편하게 현재 직장의 고민 현황을 튜닝하여 마음 번아웃 우려 정도와 자생 대처법을 계산해 보세요.</p>
                  </div>
                  <span className="text-[10px] sm:text-[11px] bg-natural-fill text-natural-olive font-bold border border-natural-border/70 px-3 py-1 rounded-full w-fit">
                    선택에 따라 솔루션 자동 조율
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Selectors Area */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Sasu Option */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-natural-dark flex items-center gap-1.5">
                        <span className="text-natural-gold">●</span> 1. 직속 선임(사수)의 태도는 어떠한가요?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: 1, label: "👍 온화하고 친절함", desc: "업무를 성실히 알려줌" },
                          { val: 2, label: "😐 방치 및 냉담", desc: "질문하기 곤란한 눈치" },
                          { val: 3, label: "😮 한숨 쉬고 면박", desc: "자신감 상실 유도 마찰" },
                          { val: 4, label: "⚠️ 사내 은근한 텃세", desc: "가스라이팅 및 고립 위기" }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            onClick={() => setLP_sasu(opt.val)}
                            className={`p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                              LP_sasu === opt.val
                                ? 'bg-natural-olive text-white border-transparent shadow-3xs'
                                : 'bg-[#F8FAFC] border-natural-border text-slate-700 hover:bg-natural-fill/45'
                            }`}
                          >
                            <div className="text-[11.5px] font-bold">{opt.label}</div>
                            <div className={`text-[9.5px] mt-0.5 ${LP_sasu === opt.val ? 'text-white/80' : 'text-slate-400'}`}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Overtime Option */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-natural-dark flex items-center gap-1.5">
                        <span className="text-natural-gold">●</span> 2. 연장근로(야근) 및 퇴근 환경은 어떤가요?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: 1, label: "👌 깔끔한 정시 퇴근", desc: "퇴근 눈치 전혀 없음" },
                          { val: 2, label: "⏰ 눈치 야근 잔존", desc: "퇴근 30분~1시간 눈치" },
                          { val: 3, label: "🔥 포괄임금 무급 연장", desc: "수당 없는 일상적 야근" },
                          { val: 4, label: "🚨 격한 업무 소집", desc: "주말 출근이나 단톡방 지시" }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            onClick={() => setLP_overtime(opt.val)}
                            className={`p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                              LP_overtime === opt.val
                                ? 'bg-natural-olive text-white border-transparent shadow-3xs'
                                : 'bg-[#F8FAFC] border-natural-border text-slate-700 hover:bg-natural-fill/45'
                            }`}
                          >
                            <div className="text-[11.5px] font-bold">{opt.label}</div>
                            <div className={`text-[9.5px] mt-0.5 ${LP_overtime === opt.val ? 'text-white/80' : 'text-slate-400'}`}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Drink Option */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-natural-dark flex items-center gap-1.5">
                        <span className="text-natural-gold">●</span> 3. 회사 술자리 공식/비공식 회식 요구는 어떠한가요?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: 1, label: "🥳 완전 자율 참여", desc: "의사 전면 존중" },
                          { val: 2, label: "👀 불참 시 은근한 소외", desc: "눈총 및 부서 압박" },
                          { val: 3, label: "🍷 무리한 술자리 강요", desc: "강압적 음주 밤샘 동참" }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            onClick={() => setLP_drink(opt.val)}
                            className={`p-2.5 text-left rounded-2xl border transition-all cursor-pointer ${
                              LP_drink === opt.val
                                ? 'bg-natural-olive text-white border-transparent shadow-3xs'
                                : 'bg-[#FCFAF7] border-natural-border text-slate-700 hover:bg-natural-fill/40'
                            }`}
                          >
                            <div className="text-[11px] font-bold leading-tight">{opt.label}</div>
                            <div className={`text-[9px] mt-0.5 ${LP_drink === opt.val ? 'text-white/80' : 'text-slate-450'}`}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Simulation Outcome Gauge */}
                  <div className="lg:col-span-5 bg-natural-fill/50 border border-natural-border rounded-3xl p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
                    {/* Simulated score math formulas */}
                    {(() => {
                      let base = 5;
                      if (LP_sasu === 1) base += 5;
                      else if (LP_sasu === 2) base += 25;
                      else if (LP_sasu === 3) base += 55;
                      else if (LP_sasu === 4) base += 75;

                      if (LP_overtime === 1) base += 5;
                      else if (LP_overtime === 2) base += 15;
                      else if (LP_overtime === 3) base += 35;
                      else if (LP_overtime === 4) base += 50;

                      if (LP_drink === 1) base += 0;
                      else if (LP_drink === 2) base += 15;
                      else if (LP_drink === 3) base += 25;

                      const finalBurnout = Math.min(100, Math.max(10, base));
                      
                      let statusText = "안정 (Stable)";
                      let statusDesc = "직장에 순조롭게 적응 중입니다. 현재의 직장 환경이 비교적 양호하고 심리적 마진이 있습니다.";
                      let statusBadgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                      let progressColor = "bg-emerald-600";
                      
                      if (finalBurnout > 35 && finalBurnout <= 65) {
                        statusText = "근무 피로 주의 (Cautious)";
                        statusDesc = "부분적인 갈등이나 퇴근 압박이 관찰됩니다. 조기 퇴사 방비를 위해 마음을 찬찬히 다스려야 할 국면입니다.";
                        statusBadgeColor = "text-amber-800 bg-amber-50 border-amber-25";
                        progressColor = "bg-amber-600";
                      } else if (finalBurnout > 65 && finalBurnout <= 85) {
                        statusText = "피로 위기 경고 (Warning)";
                        statusDesc = "사우 마찰과 가외 연장근무가 무겁게 침습하는 상태입니다. ‘4축 자가진단’ 또는 ‘고민 치료 일지’ 작성을 가동할 차례입니다.";
                        statusBadgeColor = "text-orange-850 bg-orange-50/70 border-orange-200";
                        progressColor = "bg-orange-600";
                      } else if (finalBurnout > 85) {
                        statusText = "조기퇴사 초비상 (Crisis)";
                        statusDesc = "정상적인 신체/정신 리듬 보존이 심히 어려운 가혹 수준입니다! 지금 즉시 온보딩 마스터와 비밀 상담을 시작하세요.";
                        statusBadgeColor = "text-rose-800 bg-rose-55/6 border-rose-200/50";
                        progressColor = "bg-rose-650";
                      }

                      const quickTriggerMessage = `[피로 상태 시뮬레이션 결과로 정밀 분석 요청] 사수 환경 수준 ${LP_sasu}, 근무 형태 수준 ${LP_overtime}, 회식 환경 ${LP_drink}로 산출되어 조기퇴사 피로 지수가 ${finalBurnout}% 수준으로 측정되었습니다. 대처 제제법을 조언해 주십시오.`;

                      return (
                        <>
                          <div className="space-y-3">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">산출된 가중치 진단결과</span>
                            
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm font-semibold text-slate-500">조기퇴사 유발 지수</span>
                              <span className="text-3xl font-black text-natural-dark tracking-tighter">
                                {finalBurnout}<span className="text-lg font-bold">%</span>
                              </span>
                            </div>

                            {/* Score visual meter bar */}
                            <div className="w-full bg-[#E6E2D3]/40 h-3 rounded-full overflow-hidden">
                              <div
                                className={`${progressColor} h-full rounded-full transition-all duration-300`}
                                style={{ width: `${finalBurnout}%` }}
                              />
                            </div>

                            {/* Verdict status tag */}
                            <div className={`p-4 rounded-2xl border text-xs ${statusBadgeColor} font-medium leading-relaxed`}>
                              <strong className="block text-[12.5px] font-black mb-1">{statusText}</strong>
                              <p className="opacity-90">{statusDesc}</p>
                            </div>
                          </div>

                          <div className="pt-2 text-center">
                            <button
                              onClick={() => {
                                setActiveTab('chat');
                                handleSendChat(quickTriggerMessage);
                              }}
                              className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] py-3 px-4 rounded-full font-bold text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>이 수치 고대로 온보딩 코칭 받기 💬</span>
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </section>

              {/* 3. Core Strength & Benefits Card Grid */}
              <section className="space-y-4">
                <div className="text-center max-w-2xl mx-auto space-y-1.5">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#A67C52]">The Onboarding Pillars</span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-natural-dark">
                    신입사원의 연착륙을 돕는 온보딩 마스터 4대 주력 기둥
                  </h3>
                  <p className="text-xs text-slate-500">
                    단순한 상식 확인을 넘어 실제 한국적인 고단함의 전맥을 관통하며 일상을 수호하는 최첨단 기능들입니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
                  {/* Pillar 1 */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#3B82F6]/35 transition-all space-y-3 shadow-2xs">
                    <div className="w-9 h-9 bg-[#3B82F6]/10 text-[#2563EB] rounded-xl flex items-center justify-center font-bold text-sm">
                      01
                    </div>
                    <h4 className="text-xs font-black text-natural-dark">실시간 무작이 비밀 코칭</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      사내 예의범절, 부당 지시 우회적 거절용 문장, 심층 감정 읽기까지. 실시간 대화 고민 분절 카드 복사 기능으로 안심하고 사용합니다.
                    </p>
                  </div>

                  {/* Pillar 2 */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#3B82F6]/35 transition-all space-y-3 shadow-2xs">
                    <div className="w-9 h-9 bg-[#3B82F6]/10 text-[#2563EB] rounded-xl flex items-center justify-center font-bold text-sm">
                      02
                    </div>
                    <h4 className="text-xs font-black text-natural-dark">진실성 4축 레이저 자가진단</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      인간관계 갈등, 조직 가스라이팅, 직무 적부, 심리 피로 영역을 정량계측하고 레이더 차트로 강점과 약점을 입체 진단합니다.
                    </p>
                  </div>

                  {/* Pillar 3 */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#3B82F6]/35 transition-all space-y-3 shadow-2xs">
                    <div className="w-9 h-9 bg-[#3B82F6]/10 text-[#2563EB] rounded-xl flex items-center justify-center font-bold text-sm">
                      03
                    </div>
                    <h4 className="text-xs font-black text-natural-dark">서바이벌 노동 권익 퀴즈</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      수습기간 구두 해고, 포괄임금 야근 한도, 괴롭힘 증빙 준비 등 한국에서 근무한다면 기필코 습득해야 할 법안 지식을 기릅니다.
                    </p>
                  </div>

                  {/* Pillar 4 */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#3B82F6]/35 transition-all space-y-3 shadow-2xs">
                    <div className="w-9 h-9 bg-[#3B82F6]/10 text-[#2563EB] rounded-xl flex items-center justify-center font-bold text-sm">
                      04
                    </div>
                    <h4 className="text-xs font-black text-natural-dark">나만의 고민 치료 일지</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      감정 누설을 예방하고 사내 불안 지점을 차곡차곡 기록하며 날짜별 갈등 극복 성숙도를 보존하고 전문 핫라인과 신속 대외 연계합니다.
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. Common Pain points: Pre-configured Fast Coping Cards */}
              <section className="bg-[#F8FAFC] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] space-y-5">
                <div>
                  <h3 className="text-sm font-black text-[#2563EB]">실시간 직장인 4대 긴급 구조대 (1-Click Triage)</h3>
                  <p className="text-xs text-slate-500 mt-1">직장인들이 가장 절망하는 화법과 갈등 상황에 대하여 마스터가 준비한 원터치 긴급 우회 처방을 바로 확인하고 코칭방으로 가져갑니다.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Case 1 */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">🧑‍💻</span>
                        <h4 className="text-xs font-extrabold text-natural-dark">질문 시 눈치 주며 무시하는 사수 갈등</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        "알려준 걸 또 질문하냐" 라든지 쌀쌀맞은 태도로 기운을 빼앗을 때 쓰는 "3중 팩트 중심 질문 전법" 처방을 발동합니다.
                      </p>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendChat("신입 사원 질문 시 한숨을 푹푹 쉬고 차갑게 눈치 주는 무뚝뚝한 사수와 근무하고 있습니다. 지나치게 기죽거나 주눅 들지 않고 예의 바르게 업무 사실 및 매뉴얼 기록을 확인하며 물어볼 수 있는 '3중 팩트 중심 질문법' 구체적 문장 대안들을 알고 싶습니다.");
                        }}
                        className="text-[10px] font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-[#3B82F6]/10 hover:bg-[#3B82F6]/15 px-3.5 py-2 rounded-full select-none cursor-pointer transition-colors"
                      >
                        이 처방 들고 비밀 대화방 가기 →
                      </button>
                    </div>
                  </div>

                  {/* Case 2 */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">⏰</span>
                        <h4 className="text-xs font-extrabold text-natural-dark">수당 없는 눈치성 "자발적" 야근 압박</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        일은 끝났는데 다들 자리에서 귀가하지 않는 분위기 속에서, 예의 넘치게 용건 처리를 확인하고 아름답게 칼퇴근하는 전술.
                      </p>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendChat("회사 부서원 전원이 별도 야근수당 없이 포괄임금제 관행을 들어 저녁 늦게까지 자리를 의무적으로 채우는 눈치야근 분위기입니다. 제 업무가 정시에 완전히 소화되었을 때 마음 편하고 자연스럽게 사수나 상사에게 용건을 알리고 거절감을 덜 주며 정시퇴근할 수 있는 '퇴근 예절 화법'을 조언해요.");
                        }}
                        className="text-[10px] font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-[#3B82F6]/10 hover:bg-[#3B82F6]/15 px-3.5 py-2 rounded-full select-none cursor-pointer transition-colors"
                      >
                        이 처방 들고 비밀 대화방 가기 →
                      </button>
                    </div>
                  </div>

                  {/* Case 3 */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">🍷</span>
                        <h4 className="text-xs font-extrabold text-natural-dark">금요일 밤까지 강요되는 회식 탈출</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        참석 불응 시 사내 아웃사이더나 고과 불이익으로 협박하는 한국식 교묘한 주말 전야 족쇄 회식을 보디가드할 정중한 핑계 대화 공식.
                      </p>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendChat("매주 금요일 밤늦게까지 반강압적으로 술을 마시게 하는 회식 관행이 괴롭습니다. 가지 않으면 개인주의자로 편견이 박히거나 동기들과 격리하려는 눈총을 주는데, 알코올 알레르기 또는 가족 건강 돌봄 등의 사유를 활용해서 정중하고 명확하게 수용할 수밖에 없게 만드는 거절 문단이 간절합니다.");
                        }}
                        className="text-[10px] font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-[#3B82F6]/10 hover:bg-[#3B82F6]/15 px-3.5 py-2 rounded-full select-none cursor-pointer transition-colors"
                      >
                        이 처방 들고 비밀 대화방 가기 →
                      </button>
                    </div>
                  </div>

                  {/* Case 4 */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">⚠️</span>
                        <h4 className="text-xs font-extrabold text-natural-dark">수습 기간 구두 해고 통보 (내일 통지)</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        근무 기준법 제23조와 제26조 위반 위험이 내포된 '내일부터 출근 금지' 무서운 압박에 대항하는 실효성 높은 녹취 및 서술 채록 요령.
                      </p>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendChat("중소기업 수습 평가 도중 돌연 구두로 '내일부터 나오지 마라'는 권고사직성 및 구체적인 서면 없는 내치기 압박을 받았습니다. 이는 수습 기간이라 하더라도 서면 서식 작성 의무를 기각하는 해고 금지에 저촉되는 상황인데, 위반 대안으로 입증 서면 및 구제 기록 수집을 위해서 해야 할 노동법 서바이벌 행동 수칙을 코칭해 주세요.");
                        }}
                        className="text-[10px] font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-[#3B82F6]/10 hover:bg-[#3B82F6]/15 px-3.5 py-2 rounded-full select-none cursor-pointer transition-colors"
                      >
                        이 처방 들고 비밀 대화방 가기 →
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* 1. CHAT HUB */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch"
            >
              {/* Chat Window Panel - takes 3 columns */}
              <div className="lg:col-span-3 flex flex-col bg-white rounded-[32px] border border-natural-border shadow-sm overflow-hidden h-[520px] sm:h-[630px]">
                {/* Chat header area */}
                <div className="p-4 border-b border-natural-border bg-natural-fill/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-[#2563EB]">익명 안전 상담 채널</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#3B82F6] font-semibold">가이드 보존 최우선</span>
                </div>

                {/* Messages stream area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-5">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 sm:gap-3.5 max-w-[95%] sm:max-w-[85%] w-full ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                        msg.role === 'user' ? 'bg-[#FCFAF7] border border-natural-border text-[#A67C52]' : 'bg-natural-olive text-white'
                      }`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                      </div>

                      {/* Msg bubble container */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[11px] font-bold text-[#5A5A40]">
                            {msg.role === 'user' ? '수습참여자' : '온보딩 마스터'}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {msg.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {msg.role === 'user' ? (
                          <div className="p-3.5 sm:p-5 rounded-[20px] sm:rounded-[24px] text-[13px] sm:text-[13.5px] leading-relaxed whitespace-pre-wrap border bg-natural-olive text-white border-transparent rounded-tr-none shadow-xs">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="space-y-4 max-w-2xl w-full">
                            {renderAssistantCards(msg.content, msg.id)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing Loader */}
                  {isChatLoading && (
                    <div className="flex gap-3.5 max-w-[80%] mr-auto">
                      <div className="w-9 h-9 rounded-full bg-natural-olive text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-[#5A5A40]">온보딩 마스터</span>
                        <div className="p-4 bg-natural-fill border border-natural-border rounded-[24px] rounded-tl-none text-xs text-slate-600 flex items-center gap-2">
                          <div className="flex gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span>한국 기업문화 내규를 심층 분석하고 있습니다...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {aiError && (
                    <div className="p-3.5 bg-red-55/6 flex items-center gap-2 text-rose-800 rounded-2xl border border-red-200/50 text-xs">
                      <AlertCircle className="w-4 h-4 text-red-650" />
                      <span>{aiError}</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Instant Prompt suggestion chips */}
                {chatMessages.length === 1 && (
                  <div className="p-4 bg-natural-fill/30 border-t border-natural-border">
                    <p className="text-[11px] font-bold text-natural-gold mb-2 px-1">💡 신입사원들이 자주 만나는 직장 고민 위기 버튼을 눌러보세요:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedPrompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendChat(p.text)}
                          className="text-left text-xs bg-white text-slate-700 hover:text-natural-olive hover:border-[#5A5A40]/40 border border-[#E6E2D3] px-3.5 py-2.5 rounded-[18px] transition-all cursor-pointer shadow-2xs"
                        >
                          <strong className="text-natural-olive block text-[11px] mb-0.5">{p.title}</strong>
                          <span className="line-clamp-1">{p.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Send chat entry input bar */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendChat(chatInput); }}
                  className="p-5 border-t border-natural-border bg-natural-fill/30 flex flex-col-reverse sm:flex-col gap-3"
                >
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="겪고 계신 한국 직장에서의 고민 사정(사수 마찰, 야근, 회식 부담 등)을 상세히 털어놓으세요..."
                      className="w-full bg-white border border-[#E6E2D3] rounded-full py-4 pl-6 pr-28 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 shadow-inner text-slate-700 font-sans"
                      disabled={isChatLoading}
                    />
                    <div className="absolute right-2 top-2">
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || isChatLoading}
                        className="bg-natural-olive text-white px-5 py-2 rounded-full font-bold text-xs shadow-md shadow-[#5A5A40]/10 hover:bg-[#4A4A35] transition-all disabled:bg-slate-200 disabled:text-slate-400 select-none cursor-pointer"
                      >
                        진단받기
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-[#A67C52] font-semibold">
                    🌱 국민취업지원제도 전담 상담사 선생님은 언제나 당신의 편입니다.
                  </p>
                </form>
              </div>

              {/* Sidebar Diagnostics display - takes 1 column */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* 1. Coach Onboarding Profile Card */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-natural-border">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-[#EAE7DC] p-1 mb-4 border-2 border-natural-olive">
                      <div className="w-full h-full rounded-full bg-[url('https://api.dicebear.com/7.x/notionists/svg?seed=coach')] bg-cover"></div>
                    </div>
                    <h2 className="font-serif italic text-xl text-natural-dark font-bold">Coach Onboarding</h2>
                    <p className="text-xs text-slate-500 mt-1 mb-4 font-semibold">HR 컨설팅 1,000건+ 수행</p>
                    <div className="w-full h-[1px] bg-natural-fill mb-4"></div>
                    <p className="text-[12.5px] leading-relaxed text-slate-600 italic px-2">
                      "신입의 마음으로 공감하고,<br />선배의 시선으로 해결합니다."
                    </p>
                  </div>
                </div>

                {/* 2. Visual Radar Card */}
                <div className="bg-white rounded-[32px] border border-natural-border p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-1.5 border-b border-natural-border pb-2">
                    <TrendingUp className="w-4.5 h-4.5 text-natural-gold" />
                    <h3 className="text-xs font-bold text-natural-dark">실시간 대화 고민 분석기</h3>
                  </div>

                  {realtimeAnalysis ? (
                    <div className="space-y-4">
                      {/* Interactive dynamic radar */}
                      {renderInteractiveRadar(realtimeAnalysis)}

                      {/* Sentiment / Single Emotion badge */}
                      <div className="bg-natural-fill border border-natural-border rounded-2xl p-3.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">지배적 핵심 감정</span>
                        <span className="text-xs bg-natural-olive text-white font-black px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                          {realtimeAnalysis.emotion}
                        </span>
                      </div>

                      {/* Insights summary statement */}
                      <div className="bg-[#FCFAF7] border border-natural-border rounded-2xl p-3.5">
                        <span className="text-[10px] font-bold text-[#A67C52] block mb-1">상황 본질 요약 진단 :</span>
                        <p className="text-[12px] font-medium leading-relaxed text-slate-700 italic">
                          " {realtimeAnalysis.shortDiagnosis} "
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 px-2 text-slate-400 space-y-3">
                      <HelpCircle className="w-8 h-8 text-[#E6E2D3] mx-auto" />
                      <p className="text-xs font-bold text-slate-500">대화가 들어오면 4축 고민 지수가 자동 계측되어 차트로 시각화됩니다.</p>
                      <p className="text-[10px] text-natural-gold font-bold">사수 관계 및 조직 적응 한국형 AI 탑재</p>
                    </div>
                  )}

                  {analysingProgress && (
                    <div className="text-[10px] text-natural-olive font-bold flex items-center gap-1.5 bg-natural-fill p-2.5 rounded-xl justify-center border border-natural-border">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>고민 핵심 감정 및 4대 갈등 가중치 환산 중...</span>
                    </div>
                  )}
                </div>

                {/* 3. Safety Guidelines Card */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-natural-border flex flex-col">
                  <h3 className="text-[11px] font-bold text-natural-olive uppercase tracking-wider mb-4">세이프티 가이드라인</h3>
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-[#FFF9F5] border border-[#FFE7D6]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-orange-600 text-xs font-semibold">직장 내 괴롭힘/성희롱</span>
                      </div>
                      <p className="text-[11px] text-orange-850 leading-tight">고용노동부 1350 또는 직장갑질119 즉시 상담이 가능합니다.</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#F5F9FF] border border-[#D6E7FF]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-600 text-xs font-semibold">심리적 위기 상담</span>
                      </div>
                      <p className="text-[11px] text-blue-800 leading-tight">상담전화 1393(24시간) 또는 근로복지공단 EAP를 이용하세요.</p>
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by 국민취업지원제도</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. SELF DIAGNOSIS TAB */}
          {activeTab === 'diagnosis' && (
            <motion.div
              key="diagnosis"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl mx-auto bg-white rounded-[32px] border border-natural-border shadow-sm overflow-hidden"
            >
              <div className="p-5 border-b border-natural-border bg-natural-fill flex items-center gap-3">
                <div className="p-2 bg-natural-olive text-white rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-natural-dark">한국형 신입 온보딩 4축 자가 진단지</h2>
                  <p className="text-xs text-slate-600 mt-0.5">인간관계 / 조직문화 / 업무역량 / 스트레스 영역의 내수 적응 상황을 자가 검사합니다.</p>
                </div>
              </div>

              {!showDiagnosisResult ? (
                <div className="p-6 space-y-6">
                  {DIAGNOSIS_QUESTIONS.map((q, idx) => (
                    <div key={q.id} className="space-y-3 p-5 bg-[#FCFAF7] rounded-[24px] border border-natural-border">
                      <div className="flex gap-2 items-start">
                        <span className="text-[10px] bg-natural-fill text-natural-olive font-extrabold px-2 py-0.5 rounded-full mt-0.5 border border-natural-border">
                          Q{idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-natural-dark leading-relaxed">{q.text}</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                        {q.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSelectDiagnosisOption(q.id, opt.score)}
                            className={`p-3 text-left text-xs rounded-2xl border transition-all duration-150 cursor-pointer ${
                              diagnosisAnswers[q.id] === opt.score
                                ? 'bg-[#5A5A40] text-white border-transparent font-bold shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-natural-fill/50 border-natural-border'
                            }`}
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCalculateDiagnosis}
                      disabled={Object.keys(diagnosisAnswers).length < DIAGNOSIS_QUESTIONS.length}
                      className="bg-natural-olive hover:bg-[#4A4A35] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs py-3.5 px-6 rounded-full shadow-xs cursor-pointer select-none transition-all"
                    >
                      {Object.keys(diagnosisAnswers).length < DIAGNOSIS_QUESTIONS.length
                        ? `모든 문항을 선택해 주세요 (${Object.keys(diagnosisAnswers).length} / ${DIAGNOSIS_QUESTIONS.length})`
                        : "온보딩 진단 진척도 확인하기 📊"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Results Dashboard Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Visual Radar of Axis Score */}
                    {renderInteractiveRadar(diagnosisResultAxes)}

                    {/* Progress Bar meters explicitly showing each scores */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-natural-dark block border-b border-natural-border pb-1.5">영역별 갈등 피로 지수</h4>
                      
                      {/* 1. Relationship */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>🧑🤝🧑 인간관계 갈등</span>
                          <span className="text-natural-olive font-extrabold">{diagnosisResultAxes.relationship}%</span>
                        </div>
                        <div className="w-full bg-[#E6E2D3]/40 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-natural-olive h-full rounded-full transition-all duration-1000"
                            style={{ width: `${diagnosisResultAxes.relationship}%` }}
                          />
                        </div>
                      </div>

                      {/* 2. Culture */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>🏢 조직문화 관행</span>
                          <span className="text-natural-olive font-extrabold">{diagnosisResultAxes.culture}%</span>
                        </div>
                        <div className="w-full bg-[#E6E2D3]/40 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-natural-olive h-full rounded-full transition-all duration-1000"
                            style={{ width: `${diagnosisResultAxes.culture}%` }}
                          />
                        </div>
                      </div>

                      {/* 3. Capability */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>💼 업무요구 과적합</span>
                          <span className="text-natural-olive font-extrabold">{diagnosisResultAxes.capability}%</span>
                        </div>
                        <div className="w-full bg-[#E6E2D3]/40 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-natural-olive h-full rounded-full transition-all duration-1000"
                            style={{ width: `${diagnosisResultAxes.capability}%` }}
                          />
                        </div>
                      </div>

                      {/* 4. Psychology */}
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>🧠 심리 및 스트레스</span>
                          <span className="text-natural-olive font-extrabold">{diagnosisResultAxes.psychology}%</span>
                        </div>
                        <div className="w-full bg-[#E6E2D3]/40 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-natural-olive h-full rounded-full transition-all duration-1000"
                            style={{ width: `${diagnosisResultAxes.psychology}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis verdict wrap */}
                  <div className="p-5 bg-[#FCFAF7] border border-natural-border rounded-[24px] space-y-2">
                    <h4 className="text-xs font-extrabold text-natural-dark leading-snug">{getDiagnosisVerdict().title}</h4>
                    <p className="text-xs leading-relaxed text-[#4A4A35] font-medium">
                      {getDiagnosisVerdict().desc}
                    </p>
                  </div>

                  {/* Bottom links */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#FFF9F5] p-5 rounded-[24px] border border-[#FFE7D6] text-xs">
                    <span className="text-[11px] text-slate-700 font-semibold text-center sm:text-left leading-relaxed">
                      진단 결과의 가중치를 바탕으로 온보딩 마스터의 코칭 답변 대안들을 바로 활용해 보실래요?
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleResetDiagnosis}
                        className="text-slate-600 hover:text-slate-900 border border-slate-200 bg-white font-bold py-2 px-3.5 rounded-full text-xs transition-all cursor-pointer"
                      >
                        처음부터 재측정
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const triggerText = `제 자가진단 분석 결과 인간관계(${diagnosisResultAxes.relationship}점), 조직문화(${diagnosisResultAxes.culture}점), 업무역량(${diagnosisResultAxes.capability}점), 심리적 스트레스(${diagnosisResultAxes.psychology}점)로 도정되었습니다. 맞춤 가이드과 대안을 제시해 주세요.`;
                          setActiveTab('chat');
                          handleSendChat(triggerText);
                        }}
                        className="bg-natural-olive hover:bg-[#4A4A35] text-white font-bold py-2 px-3.5 rounded-full text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                      >
                        <span>결과 들고 상담사 가기 💬</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. LABOR TRIVIA QUIZ */}
          {activeTab === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl mx-auto bg-white rounded-[32px] border border-natural-border shadow-sm overflow-hidden"
            >
              <div className="p-5 border-b border-natural-border bg-natural-fill flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-natural-olive text-white rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-natural-dark">신입 수습생 생존 노동법 퀴즈</h2>
                    <p className="text-xs text-slate-500">한국 근로기준법의 방어 기제를 배우고 교묘한 불복 수칙 오해를 타단합니다.</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-natural-olive border border-natural-border bg-white px-3 py-1 rounded-full shrink-0">
                  스코어: {quizScore} / {LABOR_LAW_QUIZ.length}
                </span>
              </div>

              {!isQuizFinished ? (
                <div className="p-6 space-y-5">
                  {/* Current progress indicator */}
                  <div className="flex gap-1.5">
                    {LABOR_LAW_QUIZ.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 flex-1 rounded-full ${
                          idx === currentQuizIndex
                            ? 'bg-natural-gold'
                            : idx < currentQuizIndex
                            ? 'bg-natural-olive'
                            : 'bg-[#E6E2D3]/40'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Question block */}
                  <div className="space-y-3">
                    <span className="text-[10px] bg-natural-fill text-natural-olive font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider border border-natural-border inline-block">
                      한국 근로기준법 생존 장착 {currentQuizIndex + 1}탄
                    </span>
                    <h3 className="text-sm font-bold text-natural-dark leading-relaxed">
                      {LABOR_LAW_QUIZ[currentQuizIndex].question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 pt-2">
                    {LABOR_LAW_QUIZ[currentQuizIndex].options.map((option, idx) => {
                      const isSelected = selectedQuizAnswer === idx;
                      const isCorrect = idx === LABOR_LAW_QUIZ[currentQuizIndex].answer;
                      let btnStyle = "border-natural-border bg-white text-slate-700 hover:bg-natural-fill/30";

                      if (selectedQuizAnswer !== null) {
                        if (isCorrect) {
                          btnStyle = "border-emerald-300 bg-emerald-50 text-emerald-800 font-bold";
                        } else if (isSelected) {
                          btnStyle = "border-red-300 bg-red-50 text-red-800 font-bold";
                        } else {
                          btnStyle = "border-[#E6E2D3]/45 bg-slate-50 text-slate-400 cursor-not-allowed";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={selectedQuizAnswer !== null}
                          onClick={() => handleSelectQuizAnswer(idx)}
                          className={`w-full text-left p-4 text-xs rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${btnStyle}`}
                        >
                          <span>{option}</span>
                          {selectedQuizAnswer !== null && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          {selectedQuizAnswer !== null && isSelected && !isCorrect && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Popups explanation */}
                  {showQuizExplanation && (
                    <div className="bg-[#FCFAF7] border border-natural-border rounded-[24px] p-5 mt-4 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-natural-fill text-natural-olive font-extrabold px-2 py-0.5 rounded-md border border-natural-border">
                          {LABOR_LAW_QUIZ[currentQuizIndex].lawProvision}
                        </span>
                        <span className="text-[11px] font-bold text-natural-dark">해설 및 대비책</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#4A4A35] font-medium whitespace-pre-wrap">
                        {LABOR_LAW_QUIZ[currentQuizIndex].explanation}
                      </p>
                      
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleNextQuiz}
                          className="bg-natural-olive hover:bg-[#4A4A35] text-white font-bold text-xs px-5 py-2 rounded-full flex items-center gap-1 justify-center shrink-0 cursor-pointer transition-all select-none"
                        >
                          <span>{currentQuizIndex === LABOR_LAW_QUIZ.length - 1 ? "최종 결과 수령하기" : "다음 문항 이동"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center space-y-5">
                  <div className="w-16 h-16 bg-natural-fill text-natural-olive rounded-full flex items-center justify-center mx-auto shadow-sm border border-natural-border">
                    <ShieldCheck className="w-8 h-8 animate-bounce" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-natural-dark">노동 생존 상식 가디언 수료 완료!</h3>
                    <p className="text-xs text-slate-500">당신의 생존 상식 통과율은 {quizScore} / {LABOR_LAW_QUIZ.length}단 입니다.</p>
                  </div>

                  <p className="text-[12px] leading-relaxed text-[#4A4A35] max-w-sm mx-auto">
                    한국의 근로기준법상 최소한의 보호 제도는 수습생과 신입 모두에게 안전하게 보장됩니다. 본인의 소중한 권리가 훼손되지 않도록 대처 일지를 남기며 현명하게 대처해 가세요.
                  </p>

                  <div className="pt-4 flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={handleResetQuiz}
                      className="text-slate-600 hover:text-slate-950 border border-slate-200 bg-white font-bold py-2 px-5 rounded-full text-xs cursor-pointer transition-all"
                    >
                      다시 풀어보기
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('shelter')}
                      className="bg-natural-olive hover:bg-[#4A4A35] text-white font-bold py-2 px-5 rounded-full text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                    >
                      <span>지원 및 보호 단체 찾기 🏥</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. DIARY JOURNAL TAB */}
          {activeTab === 'journal' && (
            <motion.div
              key="journal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
            >
              {/* Write journal entry */}
              <div className="lg:col-span-1 bg-white rounded-[32px] border border-natural-border p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-1.5 border-b border-natural-border pb-2">
                  <FileText className="w-4.5 h-4.5 text-natural-gold" />
                  <h3 className="text-xs font-bold text-natural-dark">오늘의 비밀 안착 일지 쓰기</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">일지 제목</label>
                    <input
                      type="text"
                      value={journalTitle}
                      onChange={(e) => setJournalTitle(e.target.value)}
                      placeholder="사수 보고 피드백 스트레스, 주말 출근 등..."
                      className="w-full bg-[#FCFAF7] border border-[#E6E2D3] rounded-2xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">고충과 사실 일기 내용</label>
                    <textarea
                      rows={5}
                      value={journalContent}
                      onChange={(e) => setJournalContent(e.target.value)}
                      placeholder="일어난 정확한 사실(Fact)과 본인의 불편한 해석, 그리고 마주한 부정 감정을 여과 없이 기록해 두세요. 기록은 든든한 증거 본이 됩니다..."
                      className="w-full bg-[#FCFAF7] border border-[#E6E2D3] rounded-2xl px-4 py-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans text-slate-700"
                    />
                  </div>

                  <button
                    onClick={handleSaveJournal}
                    disabled={!journalTitle.trim() || !journalContent.trim() || isAnalysingJournal}
                    className="w-full bg-[#5A5A40] hover:bg-[#4A4A35] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3.5 rounded-full flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer select-none"
                  >
                    {isAnalysingJournal ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 온보딩 마스터가 정밀 분석 중...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>정밀 진단 태그 후 안착 기록</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Saved list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-[#A67C52] uppercase tracking-wider">나의 고민 안착 연보 ({journals.length}개)</h3>
                  <span className="text-[10px] text-natural-gold font-bold">로컬 브라우저 보안 저장 (사내 유출 안전)</span>
                </div>

                {journals.length === 0 ? (
                  <div className="bg-white border border-natural-border rounded-[32px] p-12 text-center text-slate-400 space-y-3 shadow-2xs">
                    <FileText className="w-10 h-10 text-[#E6E2D3] mx-auto" />
                    <p className="text-xs font-bold text-slate-500">작성된 일지가 아직 없습니다.</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      하루의 애환과 사실 기록을 기록지에 채워넣고 챗봇 분석을 돌출해 보세요. 텃세 위협 가중치가 안전하게 기록됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {journals.map((journal) => (
                      <div key={journal.id} className="bg-white rounded-[24px] border border-natural-border shadow-2xs overflow-hidden">
                        {/* Title and date */}
                        <div className="p-4 bg-natural-fill/30 flex justify-between items-start gap-4 border-b border-natural-border">
                          <div>
                            <span className="text-[10px] text-natural-gold flex items-center gap-1 mb-1 font-bold uppercase tracking-wider">
                              <Calendar className="w-3 h-3 text-natural-olive" />
                              {journal.timestamp}
                            </span>
                            <h4 className="text-xs font-bold text-natural-dark">{journal.title}</h4>
                          </div>

                          <button
                            onClick={() => handleDeleteJournal(journal.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all cursor-pointer"
                            title="삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Content text */}
                        <div className="p-5 space-y-4">
                          <p className="text-xs leading-relaxed text-[#4A4A35] font-medium whitespace-pre-wrap">
                            {journal.content}
                          </p>

                          {/* AI analysis tag block */}
                          {journal.analysis && (
                            <div className="bg-natural-fill border border-natural-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                              {/* Short verdict and dominant emotion */}
                              <div className="md:col-span-2 space-y-1">
                                <span className="text-[9px] font-bold text-natural-gold block">AI 온보딩 마스터 진단</span>
                                <div className="text-xs font-bold text-natural-dark flex items-center gap-1.5 flex-wrap">
                                  <span className="bg-natural-olive text-white text-[10px] px-2.5 py-0.5 rounded font-bold">
                                    {journal.analysis.emotion}
                                  </span>
                                  <span className="italic font-medium text-slate-650">"{journal.analysis.shortDiagnosis}"</span>
                                </div>
                              </div>

                              {/* Mini progress percentages */}
                              <div className="md:col-span-2 grid grid-cols-2 gap-2.5 text-[10px] border-t md:border-t-0 md:border-l border-[#E6E2D3] pt-2.5 md:pt-0 md:pl-4">
                                <div className="flex flex-col">
                                  <span className="text-slate-500 font-bold mb-0.5">🧑🤝🧑 인적 갈등</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 bg-[#E6E2D3]/60 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-natural-olive h-full" style={{ width: `${journal.analysis.relationship}%` }} />
                                    </div>
                                    <span className="font-bold text-natural-dark shrink-0">{journal.analysis.relationship}%</span>
                                  </div>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-slate-500 font-bold mb-0.5">🏢 조직 관행</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 bg-[#E6E2D3]/60 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-natural-olive h-full" style={{ width: `${journal.analysis.culture}%` }} />
                                    </div>
                                    <span className="font-bold text-natural-dark shrink-0">{journal.analysis.culture}%</span>
                                  </div>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-slate-500 font-bold mb-0.5">💼 역량/R&R</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 bg-[#E6E2D3]/60 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-natural-olive h-full" style={{ width: `${journal.analysis.capability}%` }} />
                                    </div>
                                    <span className="font-bold text-natural-dark shrink-0">{journal.analysis.capability}%</span>
                                  </div>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-slate-500 font-bold mb-0.5">🧠 스트레스</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 bg-[#E6E2D3]/60 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-natural-olive h-full" style={{ width: `${journal.analysis.psychology}%` }} />
                                    </div>
                                    <span className="font-bold text-natural-dark shrink-0">{journal.analysis.psychology}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Trigger Consultation via chatbot action button */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const payload = `고민 일지 제목: '${journal.title}'\n일지 내용:\n"${journal.content}"\n이 고민을 바탕으로 온보딩을 해치지 않고, 제 안착을 확보할 솔루션 3가지를 정확히 짚어주세요.`;
                                setActiveTab('chat');
                                handleSendChat(payload);
                              }}
                              className="text-xs bg-white hover:bg-natural-fill text-slate-700 hover:text-natural-dark border border-natural-border px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer select-none"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-natural-olive" />
                              <span>해당 고민 본문 코칭 연계하기</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 5. MIND SHELTER TAB */}
          {activeTab === 'shelter' && (
            <motion.div
              key="shelter"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="text-center space-y-2 max-w-xl mx-auto py-4">
                <Heart className="w-8 h-8 text-[#A67C52] mx-auto fill-natural-fill" />
                <h2 className="text-base font-extrabold text-natural-dark">당신은 존엄하며, 온전히 지켜져야 할 권리가 있습니다.</h2>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  직장 내 과도한 괴롭힘이나 비합리성 탓에 퇴사를 고민할 만큼 마음이 아플 때, 아래 수습전용 세이프존 서비스에 연락하세요. 혼자서 일방적인 고뇌에 지치는 것을 막아드립니다.
                </p>
              </div>

              {/* Resource card layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. National Support */}
                <div className="bg-white rounded-[32px] border border-natural-border p-6 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-natural-fill text-natural-olive font-extrabold px-3 py-0.5 rounded-full border border-natural-border">국가고용망 연계</span>
                      <Briefcase className="w-4 h-4 text-natural-olive" />
                    </div>
                    <h3 className="text-xs font-extrabold text-natural-dark">{SUPPORT_CHANNELS.nationalSupport.name}</h3>
                    <p className="text-[11px] font-bold text-natural-gold">{SUPPORT_CHANNELS.nationalSupport.subtitle}</p>
                    <p className="text-[11.5px] leading-relaxed text-[#4A4A35] font-medium">
                      {SUPPORT_CHANNELS.nationalSupport.desc}
                    </p>
                  </div>
                  <a
                    href={SUPPORT_CHANNELS.nationalSupport.url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="mt-4 text-center bg-natural-olive hover:bg-[#4A4A35] text-white font-bold text-xs py-2.5 rounded-full transition-all shadow-3xs cursor-pointer select-none"
                  >
                    {SUPPORT_CHANNELS.nationalSupport.btnText}
                  </a>
                </div>

                {/* 2. Gabjil 119 */}
                <div className="bg-white rounded-[32px] border border-natural-border p-6 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-natural-fill text-natural-olive font-extrabold px-3 py-0.5 rounded-full border border-natural-border">공익 법률 연합</span>
                      <ShieldCheck className="w-4 h-4 text-natural-olive" />
                    </div>
                    <h3 className="text-xs font-extrabold text-natural-dark">{SUPPORT_CHANNELS.workGabjill.name}</h3>
                    <p className="text-[11px] font-bold text-natural-gold">{SUPPORT_CHANNELS.workGabjill.subtitle}</p>
                    <p className="text-[11.5px] leading-relaxed text-[#4A4A35] font-medium">
                      {SUPPORT_CHANNELS.workGabjill.desc}
                    </p>
                  </div>
                  <a
                    href={SUPPORT_CHANNELS.workGabjill.url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="mt-4 text-center bg-[#5A5A40] hover:bg-[#4A4A35] text-white font-bold text-xs py-2.5 rounded-full transition-all shadow-3xs cursor-pointer select-none"
                  >
                    {SUPPORT_CHANNELS.workGabjill.btnText}
                  </a>
                </div>

                {/* 3. Labor Consultation */}
                <div className="bg-white rounded-[32px] border border-natural-border p-6 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-natural-fill text-natural-olive font-extrabold px-3 py-0.5 rounded-full border border-natural-border">정부 공식 핫라인</span>
                      <PhoneCall className="w-4 h-4 text-natural-olive" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-extrabold text-natural-dark">{SUPPORT_CHANNELS.laborCenter.name}</h3>
                      <span className="text-xs bg-natural-gold text-white font-bold px-2 py-0.2 rounded"> 국번없이 {SUPPORT_CHANNELS.laborCenter.phone}</span>
                    </div>
                    <p className="text-[11px] font-bold text-natural-gold">{SUPPORT_CHANNELS.laborCenter.subtitle}</p>
                    <p className="text-[11.5px] leading-relaxed text-[#4A4A35] font-medium">
                      {SUPPORT_CHANNELS.laborCenter.desc}
                    </p>
                  </div>
                  <a
                    href={`tel:${SUPPORT_CHANNELS.laborCenter.phone}`}
                    className="mt-4 text-center bg-[#5A5A40] hover:bg-[#4A4A35] text-white font-bold text-xs py-2.5 rounded-full transition-all shadow-3xs cursor-pointer select-none"
                  >
                    📞 곧바로 전화 걸기 (국비 무료)
                  </a>
                </div>

                {/* 4. Mental support hotline */}
                <div className="bg-white rounded-[32px] border border-natural-border p-6 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-rose-50 text-rose-700 font-extrabold px-3 py-0.5 rounded-full border border-rose-100">24시 심리 힐러</span>
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-50" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-extrabold text-natural-dark">마음위기 힐링 다이렉트</h3>
                      <span className="text-xs bg-rose-500 text-white font-black px-1.5 py-0.2 rounded">📞 {SUPPORT_CHANNELS.mindCrisis.phone}</span>
                    </div>
                    <p className="text-[11px] font-bold text-natural-gold">24시간 정서적 지지 및 무료 임상 상담</p>
                    <p className="text-[11.5px] leading-relaxed text-[#4A4A35] font-medium">
                      {SUPPORT_CHANNELS.mindCrisis.desc} 위기 전화 1393 연고 및 무료 심리상담 지원과 근로복지공단 무상 EAP 연동 서비스는 정서적으로 위급한 상태에 대가가 즉각적인 자애를 수호해 마땅히 환절하여 돕습니다.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <a
                      href={`tel:${SUPPORT_CHANNELS.mindCrisis.phone}`}
                      className="text-center font-bold text-xs py-2.5 rounded-full border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 transition-all cursor-pointer"
                    >
                      안정상담: {SUPPORT_CHANNELS.mindCrisis.phone}
                    </a>
                    <a
                      href={`tel:${SUPPORT_CHANNELS.mindCrisis.phoneAlternative}`}
                      className="text-center font-bold text-xs py-2.5 rounded-full bg-rose-500 hover:bg-rose-650 text-white transition-all cursor-pointer shadow-3xs"
                    >
                      위기구호: {SUPPORT_CHANNELS.mindCrisis.phoneAlternative}
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent footer */}
      <footer className="bg-natural-fill border-t border-natural-border py-6 mt-12 text-center text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 15년 차 시니어 커리어 코치 온보딩 마스터 서비스. 국민취업지원제도 참여자와 언제나 동반 동행합니다.</span>
          <div className="flex gap-4">
            <span className="hover:text-natural-dark cursor-pointer transition-all">이용약관</span>
            <span className="hover:text-natural-dark cursor-pointer transition-all">인명보호 정책(Safety Line)</span>
            <span className="hover:text-natural-dark cursor-pointer transition-all">근로기준법 보장원칙</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
