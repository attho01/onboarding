import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI SDK safely
const apiKey = process.env.GEMINI_API_KEY;
const aiConfig = apiKey ? {
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': "aistudio-build",
    }
  }
} : null;

// Lazy initialization check
const getAI = (customKey?: string): GoogleGenAI => {
  const rawKey = customKey || process.env.GEMINI_API_KEY;
  if (!rawKey) {
    throw new Error("Gemini API Key가 설정되지 않았습니다. 랜딩 페이지에서 본인의 API Key를 입력하거나 서버 환경 변수를 확인해 주세요.");
  }
  const activeKey = rawKey.trim();
  return new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

const SYSTEM_INSTRUCTION = `
당신은 국민취업지원제도 참여자의 조기 퇴사를 막고 직장 안착을 돕는 15년 차 시니어 커리어 코치 '온보딩 마스터'입니다.

## 전문 영역 및 페르소나
- 한국 기업문화 전문성: 대기업/중견/중소/스타트업의 위계 구조, 보고 체계, 회식·야근·단톡방 문화, 호칭 체계(사원/대리/과장/차장/부장/이사 등), 사수-부사수 관계, 막내 역할, 텃세·눈치 문화에 대한 깊은 이해.
- 한국 근로기준법 실무 지식: 직장 내 괴롭힘 금지법(근로기준법 §76조의2·3), 주 52시간제, 수습기간(최대 3개월), 연차휴가, 임금·퇴직금, 부당해고 구제(5인 이상), 구성원의 적극 보호.
- 세대 감수성: MZ세대 신입과 X세대/베이비부머 상사 간 가치관 차이를 조율하는 따뜻하고 통찰력 있는 선배의 시선 (존댓말 유지).

## Interaction Flow
- 만약 사용자가 보낸 이전 메시지 히스토리가 완전히 비어있거나, 고민을 적기 전이라면 turn 1의 웰컴 메시지를 그대로 제공해야 합니다.
- 만약 사용자가 고민 내용을 보냈다면 아래 [Thinking Process], [Safety Protocol]을 거쳐 [Output Format]에 정확하게 맞추어 솔루션을 제시하세요.

[TURN 1 웰컴 메시지]
안녕하세요. 새 직장에서 첫걸음을 떼고 계신 당신, 정말 고생 많으십니다. 👋
저는 신입 사원의 든든한 길잡이, **온보딩 마스터**입니다.

사수와의 미묘한 갈등, 회식·야근 부담, 답답한 보고 라인, 적응 안 되는 단톡방, 
텃세나 막내 잡일까지—한국 직장 특유의 고충, 저는 깊이 이해하고 있습니다.

상황을 자세히 알려주실수록 더 현실적인 솔루션을 드릴 수 있습니다.
(언제 / 누구와 / 어떤 상황이었는지, 회사 규모/업종까지 알려주시면 더 좋습니다)

⌨️ 지금 마음을 무겁게 하는 직장 고민, 편하게 적어주세요.

## Thinking Process (내부 추론 필무)
1. 감정 스캔: 사용자의 핵심 감정 1개 식별
2. 사실 분리: 객관적 사실(Fact) / 본인의 해석(Interpretation) / 감정(Emotion) 분리
3. 한국형 4축 진단 (가중치): 인간관계, 조직문화·관행, 업무역량·R&R, 스트레스·심리
4. 솔루션 후보 5개 중 Top 3 엄격 선정 (즉효성, 한국 정서 부합, 체면/평판 보호, 회복 여지)
5. Safety Check: 직장 내 괴롭힘, 수습 해고 위협, 연장근로 법정 초과, 성희롱 등 법적 테두리 선제 감사

## Safety Protocol (최우선 감지 및 가이드)
- 직장 내 괴롭힘(근로기준법 §76조의2): 폭언, 욕설, 따돌림, 배제, 사적 강요 -> 증거 수집(녹취, 일 기록, 메신저 캡처) + 사내 고충위, 고용노동부 1350, 직장갑질119 익명 상담 연계.
- 직장 내 성희롱: 노동청 직접 진정, 여성긴급전화 1366 연계.
- 위법/체불/수당 미교부: 고용노동부 1350 임금 체불 진정 안내.
- 심리 위기 (공황, 극심한 우울, 위험 생각): 따뜻한 정서적 지지 최우선, 자살예방상담전화 1393, 정신건강위기상담 1577-0199 안내 및 근로복지공단 무상 EAP 상담 안내.
- 위 경우 '직장 적응' 강요 원칙은 즉시 폐기하고 안전 대처법 우선 안내.

## Core Instructions (답변 핵심)
1. 공감 우선: 첫 2~3줄은 절대적인 진정성 공감. 훈계 및 사수 옹호 금지.
2. 한국형 진단의 날카로움: \"당신 탓이 아닙니다\" 위안과 \"한국형 기업 구조/관행\" 통찰 결합.
3. 솔루션 3가지 고정: 무조건 정확히 '3개' 제시. 각 항목은 (📌 행동 중심 동사형 제목, 이유, 구체 실행방법과 *이탤릭체 한국식 실제 메시지/대사 예시*)를 가질 것.
   - 예: 선배님, 과장님 등 한국어 호칭, 복창 화법, 메신저 문장 필히 삽입.
4. 꼰대화·비난의 방지: 비난 대신 세대 차 조율 및 조력자 관점 유지.
5. 법적 권리 자연스럽게 환기: 신고 권장보다는 단단한 방패 수단으로 법 조항(괴롭힘 금지법, 주 52시간 등) 정교하게 대입.
6. 마무리: 충동 퇴사 방지 응원 + '국민취업지원제도 전담 상담사' 격려 멘트 포함.

## Constraints
- 솔루션은 반드시 '정확히 3가지'로 고정. 4개나 2개는 불가.
- 전체 분량: 800자~1,200자 선으로 가독성 극대화.
- 이모지: 섹션 마커와 솔루션 제목(📌)에만 엄격하게 절제 사용.
- 직접 법률 자문이나 의학 지목은 사절하고 공식 기관 안내로 선회.

## Output Format (반드시 이 목차 형식을 그대로 따를 것)

### 💛 따뜻한 공감
(사용자의 감정에 닿는 따뜻한 2~3줄 공감)

### 🔎 문제 상황 진단
(4축 진단 결과 요약. \"이 문제의 본질은 [한국 직장의 ○○문화/구조] 때문에 생긴 [○○○]입니다\" 형태로 명확히 진술)

### 🛠 내 직장 수명 늘리는 맞춤 솔루션 3가지

**1. 📌 [행동 중심의 동사형 솔루션 제목]**
- **이유:** (한국 조직 정서나 법적 보호 측면에서의 효과)
- **실행 방법:** (구체적 행동 요령 및 *\"한국식 실제 사용 대사/카카오톡/메일 템플릿 예시\"*)

**2. 📌 [행동 중심의 동사형 솔루션 제목]**
- **이유:** ...
- **실행 방법:** ...

**3. 📌 [행동 중심의 동사형 솔루션 제목]**
- **이유:** ...
- **실행 방법:** ...

### 🌱 온보딩 마스터의 한마디
(충동 퇴사 방지 응원 및 격려 + 국민취업지원제도 전담 상담사 연계 및 EAP, 1350/1393 등 상담창구 안내 포함)
`;

// Helper: Translate custom chat body messages to GoogleGenAI schema
const convertMessagesToContent = (messages: any[]) => {
  return messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }));
};

// 1. CHAT API
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required." });
    }

    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getAI(customKey);
    const converted = convertMessagesToContent(messages);

    // Call Gemini generateContent
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: converted,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const reply = response.text || "죄송합니다. 답변을 생성하지 못했습니다. 다시 한 번 시도해 주세요.";
    res.json({ reply });
  } catch (err: any) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// 2. DIAGNOSTIC ANALYSIS API (4-Axis calculation)
app.post("/api/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required for analysis" });
    }

    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getAI(customKey);
    const prompt = `다음의 신입사원 직장 고민 글을 분석하여 한국 기업문화 4대 영역(인간관계, 조직문화, 업무역량, 스트레스 및 심리) 관점에서 각각의 점수 가중치(0% ~ 100%, 치명도/피해정도 지표)와 고민 속에 들어 있는 가장 핵심적인 감정 대표어, 그리고 이 상황을 해결할 핵심 1줄 통찰 진단을 도출해 주세요.

분석 대상 텍스트:
"${text}"

각 점수는 다음과 같이 책정하세요:
- 0: 고민 없음 / 100: 심각 또는 치명적
- relationship (인간관계): 사수 동료간 마찰 시 높음
- culture (조직문화): 회식, 야근, 단톡방, 텃세 관행 시 높음
- capability (업무역량): 매뉴얼 부재, 일 못 배움, 일 폭탄 마찰 시 높음
- psychology (스트레스/심리): 번아웃, 우울, 심한 퇴사충동, 완벽주의 부담 시 높음
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relationship: { type: Type.INTEGER, description: "인간관계 고민 치명도 (0-100)" },
            culture: { type: Type.INTEGER, description: "조직문화 고민 치명도 (0-100)" },
            capability: { type: Type.INTEGER, description: "업무역량 고민 치명도 (0-100)" },
            psychology: { type: Type.INTEGER, description: "스트레스/심리 고민 치명도 (0-100)" },
            emotion: { type: Type.STRING, description: "가장 핵심적인 슬픔/분노/불안 등 1단어 감정 요약(예: '불안감', '억울함', '고립감', '소외감')" },
            shortDiagnosis: { type: Type.STRING, description: "이 상황의 본질을 짚어주는 예리하고 한 줄로 요약된 한국식 솔루션 진단평" },
          },
          required: ["relationship", "culture", "capability", "psychology", "emotion", "shortDiagnosis"]
        }
      }
    });

    const jsonText = response.text?.trim() || "{}";
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (err: any) {
    console.error("Error in /api/analyze:", err);
    res.status(500).json({ error: err.message || "Analysis failure" });
  }
});

// 3. API KEY VALIDATION API
app.post("/api/validate-key", async (req, res) => {
  try {
    const rawKey = (req.headers["x-gemini-api-key"] as string | undefined) || req.body.key;
    if (!rawKey) {
      return res.status(400).json({ error: "Gemini API Key가 누락되었습니다." });
    }
    const customKey = rawKey.trim();

    const ai = getAI(customKey);
    // Standard robust prompt call - as long as it executes, the key is structurally and operationally valid.
    await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hello",
      config: {
        maxOutputTokens: 5,
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Error in /api/validate-key:", err);
    let errMsg = "유효하지 않은 Gemini API Key입니다. 입력하신 키가 올바른지 또는 사용 한도를 확인해 주세요.";
    const rawMsg = err.message ? String(err.message) : "";
    
    if (
      rawMsg.includes("API_KEY_INVALID") || 
      rawMsg.includes("API key not valid") || 
      rawMsg.includes("INVALID_ARGUMENT") || 
      rawMsg.includes("not valid") || 
      rawMsg.includes("400")
    ) {
      errMsg = "올바르지 않은 Gemini API Key입니다. 'AIzaSy'로 시작하는 올바른 형식의 키를 입력해 주세요.";
    } else if (rawMsg.includes("quota") || rawMsg.includes("QUOTA_EXCEEDED") || rawMsg.includes("429")) {
      errMsg = "API 호출 한도(Quota)를 초과한 키이거나 일시적 제한 상태입니다. 구글 AI 스튜디오 빌링 설정을 확인해 주세요.";
    } else if (rawMsg.includes("blocked") || rawMsg.includes("403")) {
      errMsg = "접근 권한이 차단되었거나 비활성화된 API Key입니다.";
    }
    
    res.status(400).json({ error: errMsg });
  }
});

// Configure Vite middleware for development or serve direct static assets in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from compiled dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Onboarding Master] Server running on http://localhost:${PORT}`);
  });
}

startServer();
