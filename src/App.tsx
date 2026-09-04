import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Step1OriginalInput } from "./components/Step1OriginalInput";
import { Step2ReviewScript } from "./components/Step2ReviewScript";
import { Step3AssetsDisplay } from "./components/Step3AssetsDisplay";
import { HistoryModal } from "./components/HistoryModal";
import { LogsModal } from "./components/LogsModal";
import { DEFAULT_PRESET_PROMPTS } from "./constants/prompts";
import {
  PresetMode,
  DownstreamAssets,
  HistoryProject,
  HookAnalysis,
  OpeningVersion,
  SAMPLE_SCRIPTS,
  ImageStyleConfig,
  IMAGE_STYLE_PRESETS,
} from "./types";
import { Sparkles, HelpCircle, ArrowDown, RefreshCw, AlertCircle, Terminal } from "lucide-react";

export default function App() {
  const [originalScript, setOriginalScript] = useState("");
  const [presetMode, setPresetMode] = useState<PresetMode>("wangliqun_standard");
  const [customInstructions, setCustomInstructions] = useState("");
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(
    DEFAULT_PRESET_PROMPTS["wangliqun_standard"] || ""
  );

  const [imageStyleConfig, setImageStyleConfig] = useState<ImageStyleConfig>(
    IMAGE_STYLE_PRESETS.song_heavy_color
  );

  const handlePresetModeChange = (newMode: PresetMode) => {
    setPresetMode(newMode);
    setCustomSystemPrompt(DEFAULT_PRESET_PROMPTS[newMode] || DEFAULT_PRESET_PROMPTS["wangliqun_standard"]);
  };

  const [rewrittenScript, setRewrittenScript] = useState("");
  const [hookAnalysis, setHookAnalysis] = useState<HookAnalysis | null>(null);
  const [openingVersions, setOpeningVersions] = useState<OpeningVersion[]>([]);
  const [isRewriting, setIsRewriting] = useState(false);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isGeneratingDownstream, setIsGeneratingDownstream] = useState(false);
  const [downstreamAssets, setDownstreamAssets] = useState<DownstreamAssets | null>(null);

  // Model Selection & Cascade Tracking
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem("selected_gemini_model") || "gemini-3.7-flash";
  });

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem("selected_gemini_model", modelId);
    } catch {}
  };

  const [activeInvokedModel, setActiveInvokedModel] = useState<string | null>(null);
  const [lastUsedModel, setLastUsedModel] = useState<string | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | undefined>(undefined);

  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History state
  const [historyProjects, setHistoryProjects] = useState<HistoryProject[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Logs Modal state
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Load history from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("history_projects_v1");
      if (stored) {
        setHistoryProjects(JSON.parse(stored));
      } else {
        // Load default sample into history if empty
        const defaultSample: HistoryProject = {
          id: "sample-1",
          title: "关羽水淹七军 (精选二创范例)",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          originalScript: SAMPLE_SCRIPTS[0].content,
          presetMode: "wangliqun",
          customInstructions: "",
          rewrittenScript: `大家都知道关羽威震华夏，可您知道吗？关羽拿于禁三万人马开刀，关键可不是靠关老爷刀法有多神，而是赶上了一场天灾！建安二十四年，关羽挥师北上，把曹仁围在樊城。曹操急得坐不住，赶紧派大将于禁带了七军来救。可于禁万万没想到，他把这三万步骑兵扎营在平地上，正赶上八月暴雨连绵十多天，汉水猛涨，直接把七军营房给淹成了汪洋大海！关羽早就备好了战船，顺水推舟包围了水里的魏军。于禁只能束手就擒，庞德硬骨头被斩。大家想一想，一个人再能打，也敌不过天时人和，关二爷占尽了风水，才留下了这场千古的名场面。`,
          isConfirmed: true,
          downstreamAssets: {
            coverImagePrompt:
              "超高清，干净重彩工笔纪录片风，宋式水墨工笔，汉水滔天暴雨连绵，关羽身披战甲站在巨大的古典战船龙头之上，远方被洪水淹没的魏军军旗，朱砂红与石青重彩，震撼历史场景",
            scenes: [
              {
                id: 1,
                imagePrompt:
                  "超高清，干净重彩工笔纪录片风，建安二十四年樊城郊外，连绵阴雨中的三国古典城堡，关羽军营旌旗蔽日，汉水河畔水汽弥漫",
                narration: "大家都知道关羽威震华夏，可您知道吗？",
              },
              {
                id: 2,
                imagePrompt:
                  "超高清，干净重彩工笔纪录片风，许昌城内魏王府邸，曹操身穿黑紫长袍紧盯地图，面色沉重，周围谋士肃立",
                narration: "建安二十四年，关羽挥师北上，把曹仁围在樊城。",
              },
              {
                id: 3,
                imagePrompt:
                  "超高清，干净重彩工笔纪录片风，城北平原上浩浩荡荡的三万曹魏精锐步骑兵扎营，营帐林立，天空中阴云密布即将降雨",
                narration: "可于禁万万没想到，他把这三万步骑兵扎营在平地上",
              },
              {
                id: 4,
                imagePrompt:
                  "超高清，干净重彩工笔纪录片风，倾盆大雨汉水堤岸决口，滚滚大水将士兵与马匹淹没，残破的魏军军旗漂浮在水面",
                narration: "正赶上八月暴雨连绵十多天，汉水猛涨",
              },
            ],
            cleanSubtitles:
              "大家都知道关羽威震华夏\n可您知道吗\n关羽拿于禁三万人马开刀\n关键可不是靠刀法有多神\n而是赶上了一场天灾\n建安二十四年\n关羽挥师北上\n把曹仁围在樊城\n曹操急得坐不住\n派大将于禁带七军救援\n于禁万万没想到\n把三万兵扎营在平地上\n正赶上八月暴雨连绵\n汉水直接把七军淹没\n关羽备好战船顺水出击\n于禁被迫投降\n大家想一想\n人再能打敌不过天时\n才留下了这场千古名场面",
            videoMetadata: {
              shortTitle: "关羽水淹七军真相",
              mainTitle: "关羽水淹七军：不靠刀法靠天时！",
              alternateTitles: [
                "于禁三万人马为何全军覆没？",
                "三国最大水战背后的底层逻辑",
              ],
              description: "关羽水淹七军凭的不是刀法而是天时！",
              hashtags: [
                "#历史真相",
                "#三国演义",
                "#人性博弈",
              ],
              dynastyCollection: "三国人物",
            },
          },
        };
        setHistoryProjects([defaultSample]);
        localStorage.setItem("history_projects_v1", JSON.stringify([defaultSample]));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save history to LocalStorage
  const saveToHistory = (
    rewritten: string,
    assets: DownstreamAssets | null,
    confirmed: boolean,
    modelUsed?: string,
    duration?: number
  ) => {
    try {
      const title =
        assets?.videoMetadata.mainTitle ||
        originalScript.slice(0, 15) ||
        "未命名历史文案";

      const projId = currentProjectId || `proj-${Date.now()}`;
      const newProj: HistoryProject = {
        id: projId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalScript,
        presetMode,
        customInstructions,
        rewrittenScript: rewritten,
        isConfirmed: confirmed,
        usedModel: modelUsed || lastUsedModel || undefined,
        durationMs: duration || lastDurationMs || undefined,
        downstreamAssets: assets,
      };

      setCurrentProjectId(projId);
      setHistoryProjects((prev) => {
        const filtered = prev.filter((p) => p.id !== projId);
        const updated = [newProj, ...filtered];
        localStorage.setItem("history_projects_v1", JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Check backend server status
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok") {
          setApiStatus("ok");
        } else {
          setApiStatus("error");
        }
      })
      .catch(() => setApiStatus("error"));
  }, []);

  // Step 1: Generate Rewrite Script
  const handleGenerateRewrite = async () => {
    if (!originalScript.trim()) return;
    setIsRewriting(true);
    setActiveInvokedModel(`${selectedModel === "auto" ? "gemini-3.7-flash (智能级联)" : selectedModel} (发起)`);
    setErrorMessage(null);
    setRewrittenScript("");
    setHookAnalysis(null);
    setOpeningVersions([]);
    setIsConfirmed(false);
    setDownstreamAssets(null);

    try {
      const res = await fetch("/api/generate-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalScript,
          presetMode,
          customInstructions,
          customSystemPrompt,
          selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "生成失败");
      }

      setRewrittenScript(data.rewrittenScript);
      setHookAnalysis(data.hookAnalysis || null);
      setOpeningVersions(data.openingVersions || []);
      
      const used = data.usedModel || (selectedModel !== "auto" ? selectedModel : "gemini-3.7-flash");
      setLastUsedModel(used);
      setLastDurationMs(data.durationMs);
      setActiveInvokedModel(used);

      saveToHistory(data.rewrittenScript, null, false, used, data.durationMs);
    } catch (err: any) {
      setErrorMessage(err.message || "生成二创文案时出错");
    } finally {
      setIsRewriting(false);
    }
  };

  // Step 2 & 3: One-Click Confirm and Generate Downstream Assets
  const handleConfirmAndGenerateDownstream = async () => {
    if (!rewrittenScript.trim()) return;
    setIsGeneratingDownstream(true);
    setActiveInvokedModel(`${selectedModel === "auto" ? "gemini-3.7-flash (智能级联)" : selectedModel} (发起)`);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/generate-downstream-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmedScript: rewrittenScript,
          imageStyleConfig,
          selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "资产生成失败");
      }

      setIsConfirmed(true);
      setDownstreamAssets(data.data);

      const used = data.usedModel || (selectedModel !== "auto" ? selectedModel : "gemini-3.7-flash");
      setLastUsedModel(used);
      setLastDurationMs(data.durationMs);
      setActiveInvokedModel(used);

      saveToHistory(rewrittenScript, data.data, true, used, data.durationMs);
    } catch (err: any) {
      setErrorMessage(err.message || "全自动生成资产时出错");
    } finally {
      setIsGeneratingDownstream(false);
    }
  };

  // Scene Image Preview Generation
  const handleGenerateImagePreview = async (prompt: string, sceneId?: number) => {
    try {
      const res = await fetch("/api/generate-scene-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "生图失败");
      }
      return data.imageUrl as string;
    } catch (e: any) {
      alert(e.message || "生图失败");
      return null;
    }
  };

  // Load project from history modal
  const handleSelectHistoryProject = (proj: HistoryProject) => {
    setCurrentProjectId(proj.id);
    setOriginalScript(proj.originalScript);
    setPresetMode(proj.presetMode);
    setCustomInstructions(proj.customInstructions);
    setRewrittenScript(proj.rewrittenScript);
    setIsConfirmed(proj.isConfirmed);
    setDownstreamAssets(proj.downstreamAssets);
  };

  const handleDeleteHistoryProject = (id: string) => {
    const updated = historyProjects.filter((p) => p.id !== id);
    setHistoryProjects(updated);
    localStorage.setItem("history_projects_v1", JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    if (confirm("确定清空全部历史工作表吗？")) {
      setHistoryProjects([]);
      localStorage.removeItem("history_projects_v1");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col pb-16">
      {/* Top Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        historyCount={historyProjects.length}
        apiStatus={apiStatus}
        hasError={!!errorMessage}
        activeInvokedModel={activeInvokedModel}
        isCallingModel={isRewriting || isGeneratingDownstream}
        lastUsedModel={lastUsedModel}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
      />

      {/* Main Workflow Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 flex-1 space-y-6 w-full">
        {/* Sleek 3-Step Pipeline Status Card */}
        <div className="bg-white text-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Step Breadcrumbs */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs w-full md:w-auto">
            {/* Step 1 Chip */}
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all ${
                rewrittenScript
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-indigo-50 border-indigo-200 text-indigo-900 font-bold ring-1 ring-indigo-500/20"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  rewrittenScript ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                }`}
              >
                {rewrittenScript ? "✓" : "1"}
              </div>
              <span className="font-semibold">01 原文与二创</span>
            </div>

            <span className="text-slate-300">→</span>

            {/* Step 2 Chip */}
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all ${
                isConfirmed
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : rewrittenScript
                  ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-bold ring-1 ring-indigo-500/20"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isConfirmed
                    ? "bg-emerald-600 text-white"
                    : rewrittenScript
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isConfirmed ? "✓" : "2"}
              </div>
              <span className="font-semibold">02 审校与画风</span>
            </div>

            <span className="text-slate-300">→</span>

            {/* Step 3 Chip */}
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all ${
                downstreamAssets
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold ring-1 ring-emerald-500/20"
                  : isConfirmed
                  ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-bold"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  downstreamAssets
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {downstreamAssets ? "✓" : "3"}
              </div>
              <span className="font-semibold">03 分镜与全套资产</span>
            </div>
          </div>

          {/* Right Status / Fast Action */}
          <div className="flex items-center gap-2 self-end md:self-center text-xs text-slate-500">
            {isRewriting || isGeneratingDownstream ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                正在生成中...
              </span>
            ) : downstreamAssets ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                全套资产就绪 (可一键复制导出)
              </span>
            ) : rewrittenScript ? (
              <span className="text-indigo-600 font-medium">
                请在下方步骤 02 确认文案与画风
              </span>
            ) : (
              <span className="text-slate-400">
                请在步骤 01 粘贴原文案或加载范例
              </span>
            )}
          </div>
        </div>

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-800 text-xs shadow-xs">
            <div className="flex items-start sm:items-center space-x-3 flex-1">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="space-y-0.5">
                <div className="font-semibold text-rose-900">调用异常提示</div>
                <div className="font-normal text-rose-700 leading-relaxed">{errorMessage}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
              <button
                onClick={() => setIsLogsOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 font-medium rounded-lg border border-rose-300 transition flex items-center gap-1 cursor-pointer"
                title="打开实时调用日志面板查看错误详情与重试状态"
              >
                <Terminal className="w-3.5 h-3.5 text-rose-600" />
                <span>查看详细日志</span>
              </button>
              <button
                onClick={() => {
                  if (rewrittenScript.trim()) {
                    handleConfirmAndGenerateDownstream();
                  } else {
                    handleGenerateRewrite();
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                立即重试
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="px-2 py-1.5 text-rose-600 hover:text-rose-800 font-medium"
              >
                忽略
              </button>
            </div>
          </div>
        )}

        {/* Workflow Node 1: Original Script Input */}
        <Step1OriginalInput
          originalScript={originalScript}
          setOriginalScript={setOriginalScript}
          presetMode={presetMode}
          setPresetMode={handlePresetModeChange}
          customInstructions={customInstructions}
          setCustomInstructions={setCustomInstructions}
          customSystemPrompt={customSystemPrompt}
          setCustomSystemPrompt={setCustomSystemPrompt}
          onGenerateRewrite={handleGenerateRewrite}
          isRewriting={isRewriting}
          activeInvokedModel={activeInvokedModel}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
        />

        {/* Workflow Node 2: Human Review & Confirmation (Only rendered when rewrite exists) */}
        {(rewrittenScript || isRewriting) && (
          <Step2ReviewScript
            rewrittenScript={rewrittenScript}
            setRewrittenScript={setRewrittenScript}
            isConfirmed={isConfirmed}
            onConfirmAndGenerateDownstream={handleConfirmAndGenerateDownstream}
            isGeneratingDownstream={isGeneratingDownstream}
            originalScript={originalScript}
            hookAnalysis={hookAnalysis}
            openingVersions={openingVersions}
            imageStyleConfig={imageStyleConfig}
            setImageStyleConfig={setImageStyleConfig}
            usedModel={lastUsedModel || undefined}
            durationMs={lastDurationMs}
            activeInvokedModel={activeInvokedModel}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
          />
        )}

        {/* Workflow Node 3: Downstream Assets Display (Rendered once downstream is generated) */}
        {downstreamAssets && (
          <Step3AssetsDisplay
            assets={downstreamAssets}
            confirmedScript={rewrittenScript}
            onGenerateImagePreview={handleGenerateImagePreview}
            usedModel={lastUsedModel || undefined}
            durationMs={lastDurationMs}
          />
        )}
      </main>

      {/* History Modal Drawer */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        projects={historyProjects}
        onSelectProject={handleSelectHistoryProject}
        onDeleteProject={handleDeleteHistoryProject}
        onClearAll={handleClearAllHistory}
      />

      {/* Live System Logs & Diagnostics Modal */}
      <LogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />
    </div>
  );
}
