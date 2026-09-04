import React, { useState } from "react";
import { PresetMode, SAMPLE_SCRIPTS } from "../types";
import { DEFAULT_PRESET_PROMPTS } from "../constants/prompts";
import { ModelSelector } from "./ModelSelector";
import {
  FileText,
  Sparkles,
  BookOpen,
  Sliders,
  RotateCcw,
  Bot,
  Flame,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Check,
  Edit3,
} from "lucide-react";

interface Step1Props {
  originalScript: string;
  setOriginalScript: (val: string) => void;
  presetMode: PresetMode;
  setPresetMode: (mode: PresetMode) => void;
  customInstructions: string;
  setCustomInstructions: (val: string) => void;
  customSystemPrompt: string;
  setCustomSystemPrompt: (val: string) => void;
  onGenerateRewrite: () => void;
  isRewriting: boolean;
  activeInvokedModel?: string | null;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export const Step1OriginalInput: React.FC<Step1Props> = ({
  originalScript,
  setOriginalScript,
  presetMode,
  setPresetMode,
  customInstructions,
  setCustomInstructions,
  customSystemPrompt,
  setCustomSystemPrompt,
  onGenerateRewrite,
  isRewriting,
  activeInvokedModel,
  selectedModel,
  onSelectModel,
}) => {
  const [showPromptEditor, setShowPromptEditor] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  const loadSample = (sampleText: string) => {
    setOriginalScript(sampleText);
  };

  const handleResetPrompt = () => {
    setCustomSystemPrompt(DEFAULT_PRESET_PROMPTS[presetMode]);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(customSystemPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const isPromptModified =
    customSystemPrompt.trim() !== DEFAULT_PRESET_PROMPTS[presetMode].trim();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
            01
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              步骤 01：原文案输入 & 选择二创提示词策略
            </h2>
            <p className="text-xs text-slate-500">
              粘贴你拿到的历史文案，选择二创策略后，AI将为你重构符合视频号调性的爆款改写稿。
            </p>
          </div>
        </div>

        {/* Quick Sample Loaders */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 hidden sm:inline">加载爆款范例：</span>
          {SAMPLE_SCRIPTS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => loadSample(sample.content)}
              className="text-xs bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-3 py-1 rounded-md border border-slate-200 transition-colors font-medium cursor-pointer"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Original Script Textarea */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-1.5">
              <span>待改写历史原文</span>
              <span className="text-slate-400 font-normal">
                ({originalScript.length} 字)
              </span>
            </label>
            {originalScript && (
              <button
                onClick={() => setOriginalScript("")}
                className="text-slate-400 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                清空内容
              </button>
            )}
          </div>
          <textarea
            value={originalScript}
            onChange={(e) => setOriginalScript(e.target.value)}
            placeholder="请在此粘贴你的历史故事原文案... (例如: 建安二十四年，关羽率领大军从荆州出发北伐襄樊...)"
            rows={11}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none leading-relaxed"
          />
        </div>

        {/* Right Column: Preset Settings & Rules */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                二创提示词策略模式
              </label>

              {/* Toggle View/Edit Prompt Button */}
              <button
                type="button"
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 transition cursor-pointer ${
                  showPromptEditor || isPromptModified
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{showPromptEditor ? "收起提示词" : "查看/修改提示词"}</span>
                {isPromptModified && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                )}
                {showPromptEditor ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Mode Select Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPresetMode("wangliqun_standard")}
                className={`w-full text-left p-3 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                  presetMode === "wangliqun_standard" || presetMode === "wangliqun"
                    ? "bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/30"
                    : "bg-white/60 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg ${
                    presetMode === "wangliqun_standard" || presetMode === "wangliqun"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      王立群深度重构 V4.0 (纯文案版)
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                      推荐
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    剥洋葱逻辑 + 设问破局。篇幅体量自适应原文（简略想法按1000-1500字扩写）。纯历史无带货。
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPresetMode("wangliqun_sales")}
                className={`w-full text-left p-3 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                  presetMode === "wangliqun_sales"
                    ? "bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/30"
                    : "bg-white/60 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg ${
                    presetMode === "wangliqun_sales"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      王立群深度重构 V4.0 (图书带货植入版)
                    </span>
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                      变现
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    剥洋葱逻辑 + 篇幅自适应 + 高潮处自然衔接图书/家教升华与左下角购买引流。
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPresetMode("高差异度")}
                className={`w-full text-left p-3 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                  presetMode === "高差异度"
                    ? "bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/30"
                    : "bg-white/60 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg ${
                    presetMode === "高差异度"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    深度降重与自适应模式 (70%+ 差异度)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    彻底打散替换词汇与颠倒句式，篇幅体量自适应原文（简略想法扩写至标准篇幅），严防查重。
                  </p>
                </div>
              </button>
            </div>

            {/* Custom Instructions */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                补充二创指令 (可选)
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="例如：开头增加对帝王心术的设问 / 强化人物性格反差..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="pt-2">
            <button
              onClick={onGenerateRewrite}
              disabled={!originalScript.trim() || isRewriting}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                !originalScript.trim() || isRewriting
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.99]"
              }`}
            >
              {isRewriting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>正在调用 {activeInvokedModel || selectedModel} 生成二创文案...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>
                    生成二创文案 (第 1 步 · {selectedModel === "auto" ? "智能级联" : selectedModel})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Prompt Editor Drawer / Panel */}
      {showPromptEditor && (
        <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-3 transition-all animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-xs text-slate-900">
                二创提示词 System Prompt 实时查看与修改区
              </span>
              {isPromptModified ? (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-200">
                  已自定义修改
                </span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  当前为策略默认 Prompt
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isPromptModified && (
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition flex items-center gap-1 font-medium cursor-pointer"
                  title="恢复为当前选中的策略默认提示词"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>重置默认</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition flex items-center gap-1 font-medium cursor-pointer"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>复制提示词</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            您可以随时在下方打字编辑提示词细则。点击“生成二创文案”时，大模型将完全遵循您修改后的提示词执行。
          </p>

          <textarea
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
            rows={10}
            className="w-full p-3.5 bg-white border border-indigo-200 rounded-lg text-slate-900 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-y shadow-xs"
            placeholder="自定义二创系统提示词..."
          />
        </div>
      )}
    </div>
  );
};
