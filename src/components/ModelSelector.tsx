import React from "react";
import { AVAILABLE_MODELS, ModelOption } from "../types";
import { Cpu, Zap, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  disabled = false,
  compact = false,
  className = "",
}) => {
  if (compact) {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <select
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          disabled={disabled}
          className="appearance-none bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
          title="选择本次执行的 Gemini 模型"
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.shortName} ({model.tag})
            </option>
          ))}
        </select>
        <Cpu className="w-3.5 h-3.5 text-indigo-600 absolute right-2.5 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>选择本次使用的 AI 模型 (Model Selector)：</span>
        </label>
        <span className="text-[11px] text-slate-500">
          已选：<strong className="text-indigo-600 font-semibold">{AVAILABLE_MODELS.find(m => m.id === selectedModel)?.shortName || selectedModel}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModel === model.id;
          return (
            <button
              key={model.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectModel(model.id)}
              className={`p-2.5 rounded-xl text-left border transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "bg-indigo-50/80 border-indigo-600 shadow-xs ring-1 ring-indigo-600/30"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {model.id === "auto" ? (
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    ) : model.id === "gemini-3.7-flash" ? (
                      <Cpu className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    ) : model.id === "gemini-3.1-flash-lite" ? (
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-bold text-xs text-slate-900 leading-tight">
                      {model.shortName}
                    </span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 mb-2">
                  {model.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded font-medium border text-[10px] ${model.tagColor}`}>
                  {model.tag}
                </span>
                <span className="text-slate-400 font-mono">
                  {model.speed}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
