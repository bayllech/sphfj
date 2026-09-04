import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { generateCleanSubtitles, checkSubtitleIntegrity } from "./src/utils/subtitleGenerator";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// System In-Memory Log Store (Last 200 events)
export interface ServerLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  action: string;
  endpoint?: string;
  model?: string;
  attempt?: number;
  maxAttempts?: number;
  durationMs?: number;
  message: string;
  details?: any;
  error?: {
    message: string;
    code?: number | string;
    status?: string;
    stack?: string;
  };
}

const systemLogs: ServerLogEntry[] = [];
const MAX_LOGS = 200;

export function logEvent(entry: Omit<ServerLogEntry, "id" | "timestamp">) {
  const newEntry: ServerLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  systemLogs.unshift(newEntry);
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.pop();
  }
  const tag = `[${newEntry.level.toUpperCase()}] [${newEntry.action}]`;
  const modelTag = newEntry.model ? ` [Model: ${newEntry.model}]` : "";
  const timeTag = newEntry.durationMs ? ` (${newEntry.durationMs}ms)` : "";
  if (newEntry.level === "error") {
    console.error(`${tag}${modelTag}${timeTag} ${newEntry.message}`, newEntry.error || "");
  } else if (newEntry.level === "warn") {
    console.warn(`${tag}${modelTag}${timeTag} ${newEntry.message}`);
  } else {
    console.log(`${tag}${modelTag}${timeTag} ${newEntry.message}`);
  }
  return newEntry;
}

// Initial boot log
logEvent({
  level: "info",
  action: "System Boot",
  message: "ChronicleFlow 历史文案二创与全链路资产引擎服务端启动",
  details: {
    nodeEnv: process.env.NODE_ENV || "development",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  },
});

// Initialize Gemini Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logEvent({
      level: "error",
      action: "Auth Error",
      message: "未检测到 GEMINI_API_KEY 环境变量，请在 AI Studio 设置中配置 API Key",
    });
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

export const DEFAULT_MODEL_CASCADE = [
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

// Resilient Gemini invocation strictly using the configured model cascade in order:
// 1. gemini-3.7-flash -> 2. gemini-3.1-flash-lite -> 3. gemini-flash-latest -> 4. gemini-2.5-flash
async function callGeminiWithRetry(
  params: {
    contents: any;
    config?: any;
    primaryModel?: string;
    fallbackModels?: string[];
    actionName?: string;
  }
) {
  const ai = getGeminiClient();
  const actionName = params.actionName || "Gemini Generation";
  const models = params.primaryModel
    ? [params.primaryModel, ...(params.fallbackModels || DEFAULT_MODEL_CASCADE.filter(m => m !== params.primaryModel))]
    : DEFAULT_MODEL_CASCADE;

  // Remove duplicates while preserving order
  const uniqueModels = Array.from(new Set(models));

  let lastError: any = null;
  const attemptsLog: Array<{ model: string; attempt: number; error: string; durationMs: number }> = [];

  for (const model of uniqueModels) {
    // Try up to 3 attempts per model with exponential backoff for transient load spikes
    for (let attempt = 1; attempt <= 3; attempt++) {
      const startTime = Date.now();
      logEvent({
        level: "info",
        action: actionName,
        model,
        attempt,
        maxAttempts: 3,
        message: `正在发起模型请求：${model} (第 ${attempt}/3 次尝试)...`,
      });

      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        const durationMs = Date.now() - startTime;
        if (response) {
          logEvent({
            level: "success",
            action: actionName,
            model,
            attempt,
            durationMs,
            message: `模型 ${model} 请求成功并返回有效数据 (耗时: ${durationMs}ms)`,
            details: {
              candidatesCount: response.candidates?.length || 1,
              hasText: !!response.text,
            }
          });
          return {
            response,
            usedModel: model,
            durationMs,
            attempt,
            attemptsHistory: attemptsLog,
          };
        }
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        lastError = err;
        const errMsg = String(err?.message || err);
        const status = err?.status || err?.code || (errMsg.includes("503") ? 503 : (errMsg.includes("429") ? 429 : 500));
        
        attemptsLog.push({ model, attempt, error: errMsg, durationMs });

        logEvent({
          level: "warn",
          action: actionName,
          model,
          attempt,
          maxAttempts: 3,
          durationMs,
          message: `模型 ${model} 调用失败 (第 ${attempt}/3 次，状态码: ${status}): ${errMsg.slice(0, 180)}`,
          error: {
            message: errMsg,
            code: status,
            status: err?.status,
            stack: err?.stack,
          },
        });

        // If it's a transient 503, 429 or high demand error, wait before retrying
        const isTransient = status === 503 || status === 429 || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("RESOURCE_EXHAUSTED");
        if (isTransient && attempt < 3) {
          const waitTime = 1500 * attempt + Math.floor(Math.random() * 600);
          logEvent({
            level: "info",
            action: actionName,
            model,
            message: `检测到云端瞬时高负载 (${status})，自动等待 ${waitTime}ms 后发起第 ${attempt + 1} 次重试...`,
          });
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else if (!isTransient) {
          // If not a transient error (e.g. 404 or unsupported), skip to the next model immediately
          break;
        }
      }
    }
  }

  logEvent({
    level: "error",
    action: actionName,
    message: `按序调用链（${uniqueModels.join(" → ")}）全部尝试失败`,
    details: { attemptsLog },
    error: {
      message: String(lastError?.message || lastError),
      code: lastError?.code || lastError?.status,
      stack: lastError?.stack,
    },
  });

  throw lastError;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    totalLogs: systemLogs.length,
    activeModels: DEFAULT_MODEL_CASCADE,
  });
});

// Logs Endpoint (GET: Retrieve system diagnostic logs)
app.get("/api/logs", (req, res) => {
  const limit = Math.min(200, parseInt(req.query.limit as string, 10) || 100);
  const level = req.query.level as string | undefined;

  let filtered = systemLogs;
  if (level && level !== "all") {
    filtered = systemLogs.filter((l) => l.level === level);
  }

  res.json({
    success: true,
    total: systemLogs.length,
    logs: filtered.slice(0, limit),
  });
});

// Clear Logs Endpoint (POST: Clear in-memory logs)
app.post("/api/logs/clear", (req, res) => {
  systemLogs.length = 0;
  logEvent({
    level: "info",
    action: "System",
    message: "用户手动清空了系统调用诊断日志",
  });
  res.json({ success: true, message: "日志已清空" });
});

/**
 * Endpoint 1: Generate Secondary Creation Script (二创文案生成)
 */
app.post("/api/generate-rewrite", async (req, res) => {
  try {
    const { 
      originalScript, 
      presetMode = "wangliqun", 
      customInstructions, 
      customSystemPrompt,
      selectedModel = "gemini-3.7-flash",
    } = req.body;

    if (!originalScript || typeof originalScript !== "string") {
      return res.status(400).json({ error: "请提供原文案内容" });
    }

    const ai = getGeminiClient();
    const originalLength = originalScript.trim().length;

    let wordCountConstraint = "";
    if (originalLength >= 150) {
      const minTarget = Math.max(100, Math.floor(originalLength * 0.95));
      const maxTarget = Math.ceil(originalLength * 1.08);
      wordCountConstraint = `
【🚨🚨🚨 字数严格对齐铁律 (绝对最高优先级 - 绝不可违反)】：
- 当前输入的【待二创原文案】总字数为：${originalLength} 字。
- 你生成的【rewrittenScript 二创正文】总字数必须【严格与原文案字数高度一致，紧密贴合 ${originalLength} 字】！
- 目标字数区间为：【${minTarget} 至 ${maxTarget} 字左右】（约 ${originalLength} 字）。
- ❌ 绝对严禁大幅压缩、偷工减料或删减关键情节（如原文 3000 字，二创绝对不能只写 2000 字！必须写满约 3000 字！请充分展开每一个历史节点、人情世故、多轮动机博弈、细节考据与设问破局）。`;
    } else {
      wordCountConstraint = `
【🚨 篇幅扩写铁律】：
- 当前输入的原文仅为简短题目或想法大纲（仅 ${originalLength} 字）。
- 必须立足正史（《二十四史》《资治通鉴》），自动补充人物当时年龄、时代大势、心理动向与正史细节，以【1000 - 1500 字】为标准深度扩写为富有戏剧张力的视频号爆款脚本。`;
    }

    let systemPrompt = "";

    if (customSystemPrompt && typeof customSystemPrompt === "string" && customSystemPrompt.trim()) {
      // Priority: use the user's customized system prompt
      systemPrompt = customSystemPrompt.trim();
    } else if (presetMode === "wangliqun_sales") {
      systemPrompt = `
# Role: 微信视频号历史人物·全链路创作系统 (王立群深度定制 V4.0 - 带货植入版)

## 🧠 Global Context (系统长期记忆与核心人设)
你是一个由三位专家（策略官、王立群式金牌主笔、史实与合规审核官）组成的创作系统，专门为视频号中老年群体创作高质量历史文案，并实现自然流畅的图书带货转化。

👨‍🏫 核心人设绑定：百家讲坛·王立群 (深度还原版)
1. 叙事逻辑：遵循“剥洋葱法”。不急于给结论，先讲史实，在转折点精准设问，引导观众思考动机。
2. 语言风格：稳重、睿智、通俗说人话。杜绝低俗梗。多用短句（每句12-28字），适合慢速口播。
3. 人性底色：核心逻辑是“性格决定命运”。把朝堂斗争转化为“人情世故”和“职场智慧”，让中老年观众产生人生共鸣。
4. 设问艺术：设问是为了“破局”与勾住好奇心（如：“大家想一想，他这时候已经封王了，什么都不缺了，他为什么还要冒这个险去反呢？这不合常理啊！”）。

⚠️ 绝对宪法 (最高优先级):
1. 篇幅与字数原则（核心红线）：
   - 字数严格一致：二创文案的总字数必须严格与用户输入的【待二创原文案】总字数紧密贴合保持一致（若原文3000字，二创正文必须达到约3000字左右；若原文800字则相应匹配，严禁大幅缩水）。
   - 简短输入扩写：若用户输入仅为简短题目或一句话想法，立足正史深度扩写并充实为【1000 - 1500 字】标准脚本。
2. 自然带货植入 (核心任务)：
   - 正文中段或高潮切入处自然植入：
     * 衔接语：“讲到这儿，很多人会问，王老师，这些细节你是从哪儿看到的？其实啊……”或“一个人的命运啊，道理都在书里写着呢。”
     * 价值升华：“这本书我翻了很多遍，每次看都有新感悟”、“建议大家给家里的孩子也备一套，这就是最好的家教。”
     * 动作指引（中老年友好版）：“书就在左下角，大家点开就能看到，趁着有货，给自己留一份智慧。”
3. 史实红线与深度重构：
   - 立足正史，禁止戏说；打破原稿顺序，进行叙事视角转换重写，差异度达到60%以上。

【最终输出】：
直接输出包含自然带货植入的完整二创口播正文（字数严格紧扣原文案总字数，若原文仅为简短题目或想法则按1000-1500字标准），不要带有额外标题、前言或解释说明。
`;
    } else if (presetMode === "高差异度") {
      systemPrompt = `
# Role: 微信视频号历史短视频深度降重系统 (70%+ 高差异度)

你是一位专业的历史短视频文案二创创作者。请在不改变原文核心观点、人物评价和史实边界的前提下，对文案进行深度口语化改写与扩展。

【核心要求】
1. 篇幅原则：二创字数必须严格与输入的原文案总字数紧密贴合保持一致（如原文3000字则输出约3000字）；若输入仅为简短题目或想法，则立足史实以 1000 - 1500 字为标准充实扩写。
2. 深度降重：文字差异度达到 70% 以上，彻底替换高频词汇与固定短语，颠倒句式与倒叙重组，任意连续相同汉字不超过 4 个。
3. 面向中老年：语言口语化，自然有节奏。每句控制在 12 至 28 个汉字之间，方便直接复制配音。
4. 直接输出改写后的完整文案，不要包含任何多余的前导词或解释。
`;
    } else {
      // Default to wangliqun_standard (or legacy "wangliqun" / "评书重构")
      systemPrompt = `
# Role: 微信视频号历史人物·全链路创作系统 (王立群深度定制 V4.0 - 纯文案版)

## 🧠 Global Context (系统长期记忆与核心人设)
你是一个由三位专家（策略官、王立群式金牌主笔、史实与合规审核官）组成的创作系统，专门为视频号中老年群体创作高质量历史故事文案。

👨‍🏫 核心人设绑定：百家讲坛·王立群 (深度还原版)
1. 叙事逻辑：遵循“剥洋葱法”。不急于给结论，先讲史实，在转折点精准设问，引导观众思考动机。
2. 语言风格：稳重、睿智、通俗说人话。杜绝低俗梗。多用短句（每句12-28字），适合慢速口播。
3. 人性底色：核心逻辑是“性格决定命运”。把朝堂斗争转化为“人情世故”和“职场智慧”，让中老年观众产生人生共鸣。
4. 设问艺术：设问是为了“破局”与勾住好奇心（如：“大家想一想，他这时候已经封王了，什么都不缺了，他为什么还要冒这个险去反呢？这不合常理啊！”）。

⚠️ 绝对宪法 (最高优先级):
1. 篇幅与字数原则（核心红线）：
   - 字数严格一致：二创文案的总字数必须严格与用户输入的【待二创原文案】总字数紧密贴合保持一致（若原文为3000字，二创正文必须达到约3000字左右，严禁大幅删减、压缩或偷工减料；若原文为800字则二创800字左右）。
   - 简短输入扩写：如果用户输入的原文案仅为一个简短题目、一句话提纲或简略想法（字数很少），则立足正史（如《二十四史》《资治通鉴》），自动补充人物当时年龄、时代大势、心理动向与正史细节，以【1000 - 1500 字】为标准深度扩写为富有戏剧张力的视频号爆款脚本。
2. 纯文案专注：
   - 本版为【纯历史文案版】，切勿包含任何图书或商品带货植入信息。结尾聚焦于人生选择与命运哲理升华。
3. 史实红线 (No Fabrication)：
   - 必须立足正史，严禁虚构对话，严禁胡编乱造戏说历史。
4. 深度重构防查重：
   - 彻底打破原稿文本顺序，通过叙事视角转换（倒叙、性格缺陷剖析、人情世故对撞等）重构正文，查重差异度达到60%以上。

【最终输出】：
直接输出改写/扩写后的完整二创口播正文（字数严格紧扣原文案总字数，若原文仅为简短题目或想法则按1000-1500字标准），不要带有标题、前言或解释说明。
`;
    }

    if (customInstructions) {
      systemPrompt += `\n【额外补充要求】:\n${customInstructions}`;
    }

    const structuredSystemInstruction = systemPrompt + `
${wordCountConstraint}

【二创分析与爆点保留指令 (非常重要)】：
很多爆款视频能火，关键在于前3秒抓住了用户。如果在二创时把前3秒的爆点改没了，后面写得再完整也没有用。
因此，在进行二创前，请先对原文案进行深入爆点与节奏分析，并在二创时有取舍地保留和延伸这些吸引点：
1. 分析原文开头用什么吸引用户、抛出什么钩子、故事如何讲、中段第二钩子何时回收、下一段靠什么吸引人。
2. 专门为【开头第一段 (前3秒黄金开头)】生成 3 个不同侧重的高爆点版本 (如：版本一【悬念颠覆型】保留原爆点/反差；版本二【人性世故型】；版本三【设问破局型】)，方便用户对照原文进行手动融合或一键替换。
3. 撰写二创正文（字数体量原则：严格紧扣原文案总字数${originalLength}字；如果是简短题目或想法大纲则以1000-1500字为标准扩写）。`;

    const chosenPrimary = (selectedModel && selectedModel !== "auto" && DEFAULT_MODEL_CASCADE.includes(selectedModel))
      ? selectedModel
      : "gemini-3.7-flash";

    const chosenFallbacks = selectedModel === "auto"
      ? ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"]
      : DEFAULT_MODEL_CASCADE.filter(m => m !== chosenPrimary);

    const { response, usedModel, durationMs, attempt } = await callGeminiWithRetry({
      primaryModel: chosenPrimary,
      fallbackModels: chosenFallbacks,
      actionName: `二创文案生成 (${selectedModel === "auto" ? "自动级联" : selectedModel})`,
      contents: `【待二创原文案/素材 (${originalLength}字)】：\n${originalScript}`,
      config: {
        systemInstruction: structuredSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hookAnalysis: {
              type: Type.OBJECT,
              properties: {
                openingAttraction: { type: Type.STRING, description: "开头前3秒吸睛点分析" },
                firstHook: { type: Type.STRING, description: "第一个钩子/核心悬念" },
                storyBody: { type: Type.STRING, description: "故事主线叙事逻辑" },
                secondHook: { type: Type.STRING, description: "第二个留存钩子" },
                hookRetrieval: { type: Type.STRING, description: "钩子回收节点(本段或延后)" },
                continuationAttraction: { type: Type.STRING, description: "下一段承接吸引力" },
              },
              required: [
                "openingAttraction",
                "firstHook",
                "storyBody",
                "secondHook",
                "hookRetrieval",
                "continuationAttraction",
              ],
            },
            openingVersions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  name: { type: Type.STRING },
                  text: { type: Type.STRING },
                  tag: { type: Type.STRING },
                },
                required: ["id", "name", "text", "tag"],
              },
            },
            rewrittenScript: { type: Type.STRING, description: `二创正文（严格匹配原文${originalLength}字左右的体量）` },
          },
          required: ["hookAnalysis", "openingVersions", "rewrittenScript"],
        },
        temperature: 0.7,
      },
    });

    let rawText = response.text || "";
    let parsedData: any = null;

    try {
      parsedData = JSON.parse(rawText);
    } catch (e) {
      console.warn("JSON parse failed, fallbacking raw text as rewrittenScript");
      parsedData = {
        rewrittenScript: rawText,
      };
    }

    res.json({
      success: true,
      usedModel,
      durationMs,
      attempt,
      modelCascade: DEFAULT_MODEL_CASCADE,
      hookAnalysis: parsedData.hookAnalysis || {
        openingAttraction: "原文通过历史戏剧冲突迅速拉开序幕，抓住中老年观众好奇心。",
        firstHook: "抛出反常理问题或命运转折悬念。",
        storyBody: "按照正史脉络，剥洋葱式拆解人物当时年龄与抉择背景。",
        secondHook: "中段引入人性利益对撞，强化情节张力。",
        hookRetrieval: "高潮部分回收悬念，引发深层共鸣。",
        continuationAttraction: "结尾以性格决定命运升华选择智慧。"
      },
      openingVersions: parsedData.openingVersions || [
        {
          id: 1,
          name: "版本一：悬念颠覆型 (保留原爆点)",
          text: "大家想一想，如果一个大将手握数万精兵，却因为一场大雨输得干干净净，这到底是输给了对手，还是输给了天意？",
          tag: "原爆点强化"
        },
        {
          id: 2,
          name: "版本二：人性世故型 (直击利益对撞)",
          text: "身在乱世职场，有时候决定你生死的，往往不是你的能力有多强，而是你在关键时刻做出的那一次选择。",
          tag: "人性共鸣"
        },
        {
          id: 3,
          name: "版本三：设问破局型 (王立群老师经典开场)",
          text: "讲到这段历史，很多人心里都有个巨大的疑问：明明占据绝对优势，为什么最后却落得个功亏一篑？这背后究竟隐藏着怎样的玄机？",
          tag: "王立群设问"
        }
      ],
      rewrittenScript: (parsedData.rewrittenScript || rawText).trim(),
    });
  } catch (error: any) {
    console.error("Error generating rewrite:", error);
    let errorMessage = error?.message || "二创文案生成失败，请稍后重试";
    const status = error?.status || error?.code || 500;
    if (String(errorMessage).includes("503") || String(errorMessage).includes("high demand") || String(errorMessage).includes("UNAVAILABLE")) {
      errorMessage = "Gemini 云端算力目前正处在瞬时高峰期（503 UNAVAILABLE）。服务端已按 [3.7 → 3.1-lite → latest → 2.5] 级联重试，请稍候片刻再试或查看诊断日志。";
    } else if (String(errorMessage).includes("404") || String(errorMessage).includes("NOT_FOUND")) {
      errorMessage = "调用的模型未在当前 API 区域开放或名称不存在（404 Not Found），请查看实时调用日志排查具体报错。";
    } else if (String(errorMessage).includes("429") || String(errorMessage).includes("RESOURCE_EXHAUSTED")) {
      errorMessage = "请求频率受限（429 Too Many Requests），请稍候片刻再试。";
    }
    res.status(500).json({
      success: false,
      error: errorMessage,
      rawError: error?.message || String(error),
      code: status,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Endpoint 2: One-Click Downstream Automatic Generation (生图提示词 + 剪映字幕 + 爆款标题标签)
 */
app.post("/api/generate-downstream-assets", async (req, res) => {
  try {
    const { 
      confirmedScript, 
      imageStyleConfig,
      selectedModel = "gemini-3.7-flash",
    } = req.body;

    if (!confirmedScript || typeof confirmedScript !== "string") {
      return res.status(400).json({ error: "请提供确认后的二创文案" });
    }

    const ai = getGeminiClient();

    // Determine visual style
    let stylePromptText = "超高清，干净重彩工笔纪录片风，宋式重彩水墨工笔，古绢淡雅底色，中式古典历史场景，古朴木柱，淡墨山水屏风，人物清晰写实，五官端正，面部干净细腻，服饰使用朱砂红、石青、石绿、藤黄、暖金等重彩宝石色系，整体光线柔和通透，构图庄重，纪录片叙事感强，高清细腻。";
    let negativePromptText = "禁止二次元，禁止卡通，禁止3D，禁止文字字幕，禁止现代物品。";

    if (imageStyleConfig?.preset === "national_ink_wash") {
      stylePromptText = "超高清，新国风水墨工笔淡彩插画，兼具传统连环画线描与小写意水墨晕染风格。核心特征：毛笔墨线勾勒人物轮廓（铁线描/白描），辅以低饱和度的青绿与赭石淡彩平涂及局部晕染，背景保持宣纸质感的留白，中式古典美学，构图典雅，意境深远，线条流畅，人物生动细腻。";
      negativePromptText = "禁止二次元，禁止现代物品，禁止大面积浓烈死黑，禁止3D卡通，禁止字幕水印。";
    } else if (imageStyleConfig?.preset === "custom" && imageStyleConfig?.customPrompt?.trim()) {
      stylePromptText = imageStyleConfig.customPrompt.trim();
      negativePromptText = imageStyleConfig.negativePrompt?.trim() || "禁止二次元，禁止现代物品，禁止字幕水印。";
    }

    const downstreamPrompt = `
你是一位全能的短视频后期资产处理专家。请根据用户提供的已确认【历史故事二创文案】，一步到位全自动生成以下三大资产：

---
### 资产一：【AI生图提示词与分镜拆解（🚨 核心红线：关键信息必须全中文详尽描述）】
按照以下规则生成生图提示词与严格时序对齐：
1. **【关键信息全中文输出原则】**：
   - **所有生图提示词（包括爆款封面提示词 coverImagePrompt 与所有分镜提示词 imagePrompt）中的所有关键视觉要素必须全部采用纯正、详尽、地道的中文进行描述**！
   - 严禁输出纯英文或缺少中文关键信息的提示词，方便直接复制输入到主流 AI 生图平台（即梦、可灵、Midjourney中文模式、通义万相、哩布哩布等）。
   - 每一个生图提示词必须由以下【中文五大关键要素】有机组合构成：
     ①【主体人物与容貌神态（中文）】：具体历史人物、年龄相貌、眼神表情、气度特质（如：关羽，面如重枣，美髯飘拂，眼神威严凝重；或长孙皇后，端庄华贵，容貌温婉精致，凤眼含威）。
     ②【动作姿态与情节焦点（中文）】：当前段落核心历史事件动作（如：立于战船龙头之上远眺汉水、深夜案前秉烛疾书、大军阵前挥剑勒马）。
     ③【服饰道具与色彩质感（中文）】：符合朝代的服饰形制、重彩用色（如：身披石青重彩锦袍、朱砂红披风、锁子金甲、古朴青铜樽、竹简书卷）。
     ④【场景空间与光影氛围（中文）】：历史场景、室内外环境与光影构图（如：汉水暴雨连绵水汽弥漫、古朴木柱宫殿内烛影摇曳、大景深庄重构图）。
     ⑤【画风约束（中文）】：完整融入指定画风特征（"${stylePromptText}"）。
2. **爆款封面提示词（女性角色与高光优先，全中文描述）**：
   - 提炼最具戏剧冲突、悬念感或视觉冲击力的“高光瞬间”。
   - 【女性角色优先原则】：如果历史故事的主要角色或关键人物中有女性（如后妃、才女、夫人、传奇女子等），**封面及重要分镜尽量优先带上该女性角色的画面提示词**！用中文重点刻画其中式古典绝美风华、端庄典雅、精致面容、清冷或温婉气质、华美古典汉服/唐装/宋服发髻饰品与细腻神态光影，大幅提升视觉吸引力。
3. **分镜精准划分（对应段落核心事件，全中文描述）**：
   - 必须紧扣二创文案中所叙述的【核心事件节点/场景转换/情节关键点】来划分分镜。
   - 每一个分镜必须独立对应文案中某个具体段落正在讲述的核心历史事件、人物抉择或场景画面。
   - 分镜数量根据文案篇幅自然匹配（短篇4-6个分镜，中长篇6-10个分镜）。
   - 【🚨 带货信息的分镜处理原则】：若二创文案中包含带货植入（如推荐好书、左下角链接、人生启发等），**绝对不用单独做一个特有的图书特写或促销分镜图片**，继续沿用带货前后的相关历史人物神态、剧情或古典场景图片即可，保证整条视频画面连贯自然，不破坏历史沉浸感。
4. **旁白锚点与画面时序绝对严格对齐（核心红线：严禁音画抢跑或错位）**：
   - 每个分镜的【对应旁白锚点 (narration)】字段，必须是该分镜图片所讲述事件段落的【绝对起始句（开篇第一句话）】。
   - 必须【100%原封不动】逐字摘录二创文案中该事件段落最开头的一句话，确保能在二创文案中精确搜索定位。
   - 严禁出现“画面已经进入下一个段落故事，而字幕/旁白还在讲上一个故事”的错位现象！该分镜画面必须在该句旁白起始时精准切入，并承载整个事件段落，实现音画绝对同频。
5. **生图风格约束 (严格执行选定画风)**：
   所有生图提示词（包括封面与各分镜）必须统一融入以下指定的中文艺术风格特征：
   画风描述："${stylePromptText}"
   负面提示（嵌入说明或末尾）："${negativePromptText}"

---
### 资产二：【剪映纯净字幕文本（🚨 核心红线：100% 完整转换整篇文案从头到尾每一句话）】
将【确认二创文案】全部正文 100% 完整转换为适合剪映/Whisper等音视频剪辑软件音频字幕对齐的标准纯净文本：
1. **全篇100%全量覆盖（绝对红线）**：必须从文案第一句一直逐句转换到最后一句，一字不落、一字不改、绝不允许只转换开头或跳过中后段！
2. 彻底清除标点：删除所有标点符号与特殊字符（如 ，。！？“”‘’《》、；：—… 等），用换行替换停顿。
3. 严格控制字数：每行汉字数量严格控制在 5 到 10 个字之间（绝不能超过20字）。长句按语义合理拆分多行。
4. 语义断句：严禁打断固定词语、成语，严禁以虚词（如 的、地、得、了、着、过、与）开头。
5. 独立换行：每一个短句单独占一行，句尾直接换行，不加任何符号，不留段落空行。

---
### 资产三：【爆款视频标题、短标题、描述与标签】
1. **公众号/发现页短标题 (shortTitle)**：
   - 【严格控制在 6 至 12 个汉字之间】（展示在微信公众号卡片、微信发现页推送等显著位置）。
   - **核心基调**：设置内在悬疑与疑问（如：“大年三十为何彻底消失？”、“汉代布衣隐藏的真相”、“他为何死在封王前夜？”）。
   - **【严禁词汇】**：**绝对不要添加【震惊！】、【太离奇！】等前置夸张营销词汇**，直接用语意本身展现吸引力。
2. **爆款主标题 (mainTitle & alternateTitles)**：
   - 【严格控制在 8 至 15 个汉字之间，绝不可少于8字或多于15字】。
   - **核心基调**：主打翻案、反常理真相与人性博弈，**悬疑感必须直接设置在标题语意内部**（如：“被正史抹去两千年：汉代布衣逆袭之谜”、“手握十万重兵，他为何一夜之间自尽？”、“看似荒唐的决定，为何救了他全家性命？”）。
   - **【严禁词汇】**：**绝对严禁添加【震惊！】、【太离奇！】、【惊呆！】、【不可思议！】等前置夸张虚浮词汇**，避免引起观众反感，保持沉稳高级的历史大号格调。
   - 提供 1 个主选 + 2 个备选方案（每个备选方案也必须是 8-15 字，且同样内嵌强烈悬疑感，无夸张前置词）。
3. **视频描述与热门标签（🚨 极度重要的核心硬性红线：描述 + 热门标签加起来全部总字数必须严格控制在 40 汉字以内！）**：
   - **视频描述 (description)**：极度精炼、悬疑勾人，一句话直击最大反差，字数建议在 15-20 字左右。
   - **热门标签 (hashtags)**：精准提炼 3 到 4 个最核心标签（如 ["#历史真相", "#人性博弈", "#底层逻辑"]，带#号，字数约 10-15 字）。
   - **【总字数硬性上限】**：【描述文字 + 所有热门标签】全部加在一起的总字数（包括汉字、标点与空格）**严禁超过 40 字**！必须精炼有力！
4. **归属合集 (dynastyCollection)**：推荐最匹配的朝代合集名称（如：先秦人物 / 秦汉人物 / 三国人物 / 魏晋南北朝人物 / 隋唐人物 / 两宋人物 / 明朝人物 / 清朝人物 等）。

---
请必须严格以 JSON 格式输出，Schema 格式如下：
{
  "coverImagePrompt": "爆款封面生图提示词...",
  "scenes": [
    {
      "id": 1,
      "imagePrompt": "分镜1生图提示词...",
      "narration": "该分镜对应的二创文案第一句原话..."
    }
  ],
  "cleanSubtitles": "剪映纯净字幕文本，每行5-10字...",
  "videoMetadata": {
    "shortTitle": "内嵌悬疑的短标题(6-12字，无震惊前缀)...",
    "mainTitle": "内嵌悬疑的主标题(8-15字，无震惊前缀)...",
    "alternateTitles": ["备选标题1(8-15字)", "备选标题2(8-15字)"],
    "description": "极简悬疑描述(15-20字)...",
    "hashtags": ["#历史真相", "#人性博弈", "#三国演义"],
    "dynastyCollection": "推荐朝代合集名称"
  }
}
`;

    const chosenPrimary = (selectedModel && selectedModel !== "auto" && DEFAULT_MODEL_CASCADE.includes(selectedModel))
      ? selectedModel
      : "gemini-3.7-flash";

    const chosenFallbacks = selectedModel === "auto"
      ? ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"]
      : DEFAULT_MODEL_CASCADE.filter(m => m !== chosenPrimary);

    const { response, usedModel, durationMs, attempt } = await callGeminiWithRetry({
      primaryModel: chosenPrimary,
      fallbackModels: chosenFallbacks,
      actionName: `全自动资产生成 (${selectedModel === "auto" ? "自动级联" : selectedModel})`,
      contents: `【确认二创文案内容】：\n${confirmedScript}\n\n${downstreamPrompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coverImagePrompt: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  imagePrompt: { type: Type.STRING },
                  narration: { type: Type.STRING },
                },
                required: ["id", "imagePrompt", "narration"],
              },
            },
            cleanSubtitles: { type: Type.STRING },
            videoMetadata: {
              type: Type.OBJECT,
              properties: {
                shortTitle: { type: Type.STRING },
                mainTitle: { type: Type.STRING },
                alternateTitles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                description: { type: Type.STRING },
                hashtags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                dynastyCollection: { type: Type.STRING },
              },
              required: ["shortTitle", "mainTitle", "alternateTitles", "description", "hashtags", "dynastyCollection"],
            },
          },
          required: ["coverImagePrompt", "scenes", "cleanSubtitles", "videoMetadata"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const parsedData = JSON.parse(jsonText);

    // 100% Subtitle Full-Coverage Guarantee (Prevent LLM token cutoff/omission)
    const deterministicSubtitles = generateCleanSubtitles(confirmedScript);
    if (!parsedData.cleanSubtitles || parsedData.cleanSubtitles.trim().length === 0) {
      parsedData.cleanSubtitles = deterministicSubtitles;
    } else {
      const integrity = checkSubtitleIntegrity(confirmedScript, parsedData.cleanSubtitles);
      // If AI output truncated/omitted text (coverage < 90%), guarantee full text by replacing with deterministic parser
      if (!integrity.isComplete || integrity.coveragePercent < 92) {
        logEvent({
          level: "warn",
          action: "字幕完整度自动补全",
          model: usedModel,
          message: `AI返回字幕不完整(字数仅占原文 ${integrity.coveragePercent}%)，系统已自动启用中文语义断句引擎补全100%全量文案`,
          details: {
            originalChars: integrity.originalCharCount,
            aiSubtitleChars: integrity.subtitleCharCount,
            fixedLines: deterministicSubtitles.split("\n").length
          },
        });
        parsedData.cleanSubtitles = deterministicSubtitles;
      }
    }

    // Enforce 40 characters limit on (description + hashtags)
    if (parsedData.videoMetadata) {
      let desc = (parsedData.videoMetadata.description || "").trim();
      let tags: string[] = Array.isArray(parsedData.videoMetadata.hashtags)
        ? parsedData.videoMetadata.hashtags.map((t: string) => (t.startsWith("#") ? t : `#${t}`))
        : [];

      // Calculate combined length
      let combined = `${desc} ${tags.join(" ")}`.trim();
      if (combined.length > 40) {
        // If combined exceeds 40, prioritize top 3 tags and trim description
        const tagsToKeep: string[] = [];
        let tagsLen = 0;
        for (const tag of tags.slice(0, 3)) {
          if (tagsLen + tag.length + 1 <= 22) {
            tagsToKeep.push(tag);
            tagsLen += tag.length + 1;
          }
        }
        tags = tagsToKeep.length > 0 ? tagsToKeep : tags.slice(0, 2);
        const remainingSpaceForDesc = Math.max(12, 40 - tags.join(" ").length - 1);
        if (desc.length > remainingSpaceForDesc) {
          desc = desc.slice(0, remainingSpaceForDesc);
        }
        parsedData.videoMetadata.description = desc;
        parsedData.videoMetadata.hashtags = tags;
      }
    }

    res.json({
      success: true,
      usedModel,
      durationMs,
      attempt,
      modelCascade: DEFAULT_MODEL_CASCADE,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Error generating downstream assets:", error);
    let errorMessage = error?.message || "全自动资产生成失败，请重试";
    const status = error?.status || error?.code || 500;
    if (String(errorMessage).includes("503") || String(errorMessage).includes("high demand") || String(errorMessage).includes("UNAVAILABLE")) {
      errorMessage = "Gemini 云端算力目前正处在瞬时高峰期（503 UNAVAILABLE）。系统已按 [3.7 → 3.1-lite → latest → 2.5] 级联重试，请稍等数秒后点击重新生成资产。";
    } else if (String(errorMessage).includes("404") || String(errorMessage).includes("NOT_FOUND")) {
      errorMessage = "调用的模型未在当前 API 区域开放或名称不存在（404 Not Found），请查看实时调用日志。";
    } else if (String(errorMessage).includes("429") || String(errorMessage).includes("RESOURCE_EXHAUSTED")) {
      errorMessage = "请求频率受限（429 Too Many Requests），请稍候片刻再试。";
    }
    res.status(500).json({
      success: false,
      error: errorMessage,
      rawError: error?.message || String(error),
      code: status,
      timestamp: new Date().toISOString(),
    });
  }
});

// Dedicated Instant Subtitle Formatter Endpoint (100% Client/Server Synchronized)
app.post("/api/format-subtitles", (req, res) => {
  try {
    const { script } = req.body;
    if (!script || typeof script !== "string" || !script.trim()) {
      return res.status(400).json({ success: false, error: "请提供有效的二创文案内容" });
    }
    const cleanSubtitles = generateCleanSubtitles(script);
    const integrity = checkSubtitleIntegrity(script, cleanSubtitles);
    res.json({
      success: true,
      cleanSubtitles,
      stats: {
        lineCount: cleanSubtitles.split("\n").length,
        originalCharCount: integrity.originalCharCount,
        subtitleCharCount: integrity.subtitleCharCount,
        coveragePercent: integrity.coveragePercent,
      },
    });
  } catch (err: any) {
    console.error("Error in format-subtitles:", err);
    res.status(500).json({ success: false, error: err?.message || "字幕转换失败" });
  }
});

/**
 * Endpoint 3: Fast AI Scene Image Preview (可选分镜生图预览)
 */
app.post("/api/generate-scene-image", async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "请提供生图提示词" });
    }

    logEvent({
      level: "info",
      action: "分镜生图",
      model: "gemini-3.1-flash-lite-image",
      message: `发起分镜画面预览生成: ${prompt.slice(0, 70)}...`,
    });

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            text: `High quality Chinese historical digital painting, documentary style, rich watercolor ink art: ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    let imageUrl = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      logEvent({
        level: "error",
        action: "分镜生图",
        model: "gemini-3.1-flash-lite-image",
        message: "生图模型响应中未能提取图像数据",
      });
      return res.status(500).json({ error: "未能在响应中提取图像数据" });
    }

    const durationMs = Date.now() - startTime;
    logEvent({
      level: "success",
      action: "分镜生图",
      model: "gemini-3.1-flash-lite-image",
      durationMs,
      message: `分镜画面生成成功 (耗时: ${durationMs}ms)`,
    });

    res.json({
      success: true,
      imageUrl,
    });
  } catch (error: any) {
    console.error("Error generating image preview:", error);
    const durationMs = Date.now() - startTime;
    logEvent({
      level: "error",
      action: "分镜生图",
      model: "gemini-3.1-flash-lite-image",
      durationMs,
      message: `分镜生图失败: ${error?.message || error}`,
      error: {
        message: error?.message || String(error),
        code: error?.status || error?.code,
        stack: error?.stack,
      },
    });
    res.status(500).json({ error: error?.message || "图片生成预览失败" });
  }
});

// Vite middleware for dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`History Creator Studio Server running on http://localhost:${PORT}`);
  });
}

startServer();
