import React, { useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Sparkles,
  Zap,
  Clock,
  Check,
  FileCheck,
  Flame,
  Anchor,
  Layers,
  Copy,
  ChevronDown,
  ChevronUp,
  Wand2,
  HelpCircle,
  ArrowRightLeft,
} from "lucide-react";
import { HookAnalysis, OpeningVersion, ImageStyleConfig, ImageStylePreset, IMAGE_STYLE_PRESETS } from "../types";
import { Palette, Sliders } from "lucide-react";

interface Step2Props {
  rewrittenScript: string;
  setRewrittenScript: (val: string) => void;
  isConfirmed: boolean;
  onConfirmAndGenerateDownstream: () => void;
  isGeneratingDownstream: boolean;
  originalScript: string;
  hookAnalysis?: HookAnalysis | null;
  openingVersions?: OpeningVersion[];
  imageStyleConfig: ImageStyleConfig;
  setImageStyleConfig: (config: ImageStyleConfig) => void;
  usedModel?: string;
  durationMs?: number;
  activeInvokedModel?: string | null;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
}

export const Step2ReviewScript: React.FC<Step2Props> = ({
  rewrittenScript,
  setRewrittenScript,
  isConfirmed,
  onConfirmAndGenerateDownstream,
  isGeneratingDownstream,
  originalScript,
  hookAnalysis,
  openingVersions = [],
  imageStyleConfig,
  setImageStyleConfig,
  usedModel,
  durationMs,
  activeInvokedModel,
  selectedModel,
  onSelectModel,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHookDetails, setShowHookDetails] = useState(true);
  const [copiedVersionIdx, setCopiedVersionIdx] = useState<number | null>(null);
  const [appliedVersionIdx, setAppliedVersionIdx] = useState<number | null>(null);

  const wordCount = rewrittenScript.length;
  const originalWordCount = originalScript.length;
  const estimatedReadingSeconds = Math.round(wordCount / 4.5); // ~4.5 words per sec for narration

  const sentences = rewrittenScript
    .split(/[。！？\n]/)
    .filter((s) => s.trim().length > 0);

  const longSentencesCount = sentences.filter((s) => s.length > 30).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(rewrittenScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyVersion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedVersionIdx(idx);
    setTimeout(() => setCopiedVersionIdx(null), 2000);
  };

  const handleApplyOpening = (text: string, idx: number) => {
    if (!rewrittenScript.trim()) {
      setRewrittenScript(text);
      setAppliedVersionIdx(idx);
      setTimeout(() => setAppliedVersionIdx(null), 2500);
      return;
    }

    const cleanOpening = text.trim();
    const lines = rewrittenScript.split("\n");

    if (lines.length > 1) {
      // Find the first non-empty line
      let targetLineIdx = 0;
      while (targetLineIdx < lines.length && !lines[targetLineIdx].trim()) {
        targetLineIdx++;
      }
      if (targetLineIdx < lines.length) {
        lines[targetLineIdx] = cleanOpening;
        setRewrittenScript(lines.join("\n"));
      } else {
        setRewrittenScript(`${cleanOpening}\n${rewrittenScript}`);
      }
    } else {
      // Single block of text without \n
      const punctMatch = rewrittenScript.match(/[。！？]/);
      if (punctMatch && punctMatch.index !== undefined) {
        const remainder = rewrittenScript.slice(punctMatch.index + 1).trim();
        setRewrittenScript(`${cleanOpening}\n${remainder}`);
      } else {
        setRewrittenScript(`${cleanOpening}\n${rewrittenScript}`);
      }
    }

    setAppliedVersionIdx(idx);
    setTimeout(() => setAppliedVersionIdx(null), 2500);
  };

  const handleQuickPolish = (type: "opening" | "questioning" | "ending") => {
    let updated = rewrittenScript;
    if (type === "opening") {
      if (!updated.startsWith("大家想一想，")) {
        updated = "大家想一想，" + updated;
      }
    } else if (type === "questioning") {
      if (!updated.includes("这合常理吗")) {
        updated = updated.replace(/。/, "？这合常理吗？");
      }
    } else if (type === "ending") {
      updated =
        updated.trim() +
        "\n一个人的选择决定命运，书里的智慧，看懂了能少走十年弯路。";
    }
    setRewrittenScript(updated);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200/80 shadow-md p-6 space-y-6 relative overflow-hidden">
      {/* Decorative Badge */}
      <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
        核心关卡 · 人工确认
      </div>

      {/* Step Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            02
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                步骤 02：爆点拆解、3秒开头多方案与二创审校
              </h2>
              {usedModel && (
                <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  已由 <strong>{usedModel}</strong> 成功生成{durationMs ? ` (${durationMs}ms)` : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              前3秒决定完播率！对比下方3个爆款开头方案，一键替换或手动融合最强开场。
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition font-medium flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>已复制文案</span>
              </>
            ) : (
              <>
                <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>复制二创文案</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs">
        <div>
          <span className="text-slate-500 block">二创字数</span>
          <span className="font-bold text-slate-800 text-sm">
            {wordCount}{" "}
            <span className="text-[10px] text-slate-400 font-normal">
              (原文 {originalWordCount}字)
            </span>
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">预估口播时长</span>
          <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            约 {estimatedReadingSeconds} 秒
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">长句警示 (&gt;30字)</span>
          <span
            className={`font-bold text-sm ${
              longSentencesCount > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {longSentencesCount > 0 ? `${longSentencesCount} 处需注意` : "优秀 (极佳)"}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">审核状态</span>
          <span className="font-bold text-sm flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isConfirmed ? "已确认锁定" : "待人工确认"}
          </span>
        </div>
      </div>

      {/* SECTION 1: Pre-Rewrite Rhythm & Hook Analysis */}
      {hookAnalysis && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all">
          <div
            onClick={() => setShowHookDetails(!showHookDetails)}
            className="p-3.5 bg-slate-100/80 hover:bg-slate-100 flex items-center justify-between cursor-pointer border-b border-slate-200/60"
          >
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-xs text-slate-800">
                二创前爆点与节奏深度分析 (保留核心吸睛逻辑)
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                确保前3秒完播率
              </span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-slate-500">
              <span>{showHookDetails ? "收起" : "展开明细"}</span>
              {showHookDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>

          {showHookDetails && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <Anchor className="w-3.5 h-3.5 text-indigo-600" />
                  0-3秒黄金吸睛点：
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {hookAnalysis.openingAttraction}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  核心钩子一 (第一层悬念)：
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {hookAnalysis.firstHook}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  故事主线推进逻辑：
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {hookAnalysis.storyBody}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <Anchor className="w-3.5 h-3.5 text-indigo-600" />
                  核心钩子二 (中段二次留存)：
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {hookAnalysis.secondHook}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  钩子回收节点：
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {hookAnalysis.hookRetrieval}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  下一段承上启下吸引力：
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {hookAnalysis.continuationAttraction}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Top Hook 3-Version Generation */}
      {openingVersions.length > 0 && (
        <div className="bg-indigo-50/70 p-4.5 rounded-xl border border-indigo-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-indigo-600 fill-indigo-100" />
              <h3 className="font-bold text-xs text-indigo-950">
                前 3 秒黄金开头 · 3 个备选爆款版本 (保留爆点/反差/设问)
              </h3>
            </div>
            <span className="text-[11px] text-indigo-700 font-medium">
              💡 提示：点击【一键替换正文开头】或复制代码手动缝合
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {openingVersions.map((ver, idx) => (
              <div
                key={ver.id || idx}
                className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs hover:border-indigo-300 transition flex flex-col justify-between space-y-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      {ver.name}
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-medium">
                      {ver.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-sans bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    “{ver.text}”
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 pt-1">
                  <button
                    onClick={() => handleApplyOpening(ver.text, idx)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  >
                    {appliedVersionIdx === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>已替换首段 (后续正文保留)</span>
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-white" />
                        <span>一键替换正文开头</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleCopyVersion(ver.text, idx)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] py-1.5 px-2 rounded-lg border border-slate-200 transition font-medium flex items-center justify-center cursor-pointer"
                    title="复制此开头"
                  >
                    {copiedVersionIdx === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Main */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-800 flex items-center gap-1.5">
            <span>二创定稿脚本 (编辑器)</span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-normal">支持打字修改与手动缝合</span>
          </label>

          {/* Quick AI Polish Buttons */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400 hidden md:inline">快捷润色：</span>
            <button
              onClick={() => handleQuickPolish("opening")}
              className="text-[11px] bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-2 py-0.5 rounded border border-slate-200 transition cursor-pointer"
            >
              +黄金开头
            </button>
            <button
              onClick={() => handleQuickPolish("questioning")}
              className="text-[11px] bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-2 py-0.5 rounded border border-slate-200 transition cursor-pointer"
            >
              +王立群式设问
            </button>
            <button
              onClick={() => handleQuickPolish("ending")}
              className="text-[11px] bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-2 py-0.5 rounded border border-slate-200 transition cursor-pointer"
            >
              +结尾金句
            </button>
          </div>
        </div>

        <textarea
          value={rewrittenScript}
          onChange={(e) => setRewrittenScript(e.target.value)}
          placeholder="二创生成的文案将显示在这里，您可以手动修改文字、增删停顿、调整语气..."
          rows={11}
          className="w-full p-4 bg-white border-2 border-indigo-200/90 rounded-xl text-slate-900 text-base leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition shadow-xs"
        />
      </div>

      {/* Section 3: Image Style Selector (生图画风选择与自定义) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-900 text-sm">
              分镜 AI 生图提示词画风设定
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            全自动生成分镜时将注入此风格
          </span>
        </div>

        {/* Style Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(["song_heavy_color", "national_ink_wash", "custom"] as ImageStylePreset[]).map((key) => {
            const preset = IMAGE_STYLE_PRESETS[key];
            const isSelected = imageStyleConfig.preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setImageStyleConfig({
                    ...IMAGE_STYLE_PRESETS[key],
                    customPrompt: imageStyleConfig.customPrompt || "",
                  })
                }
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/40 text-indigo-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{preset.name}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* If Custom style selected, show prompt input box */}
        {imageStyleConfig.preset === "custom" && (
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>输入您的自定义 AI 绘图艺术风格与特征提示词：</span>
            </label>
            <textarea
              rows={3}
              value={imageStyleConfig.customPrompt || ""}
              onChange={(e) =>
                setImageStyleConfig({
                  ...imageStyleConfig,
                  customPrompt: e.target.value,
                })
              }
              placeholder="例如：超高清，电影质感厚涂插画，暗调黑金风格，写实历史光影，中式古建筑背景，人物神态肃穆，高对比度，4k分辨率..."
              className="w-full p-2.5 bg-white border border-indigo-300 rounded-lg text-slate-800 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Confirmation & One-Click Downstream Action Banner */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" />
            <span>确认二创文案无误，生成全套后置资产：</span>
          </div>
          <p className="text-slate-500">
            将全自动生成：① {imageStyleConfig.name}分镜生图提示词 &nbsp;② 剪映纯净字幕 &nbsp;③ 爆款标题、描述与热门标签（≤40字）
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 w-full md:w-auto">
          <button
            onClick={onConfirmAndGenerateDownstream}
            disabled={!rewrittenScript.trim() || isGeneratingDownstream}
            className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm shadow-xs flex items-center justify-center space-x-2 whitespace-nowrap transition-all ${
              !rewrittenScript.trim() || isGeneratingDownstream
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.98] cursor-pointer"
            }`}
          >
            {isGeneratingDownstream ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>正在生成全套资产 ({activeInvokedModel || selectedModel || "Gemini"})...</span>
              </>
            ) : (
              <>
                <span>确认文案并全自动生成后置资产 (第 2 步)</span>
                <Sparkles className="w-4 h-4 text-indigo-200" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


