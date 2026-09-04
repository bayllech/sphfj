import React from "react";
import { History, Sparkles, Terminal, Cpu } from "lucide-react";
import { AVAILABLE_MODELS } from "../types";

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenLogs: () => void;
  historyCount: number;
  apiStatus: "loading" | "ok" | "error";
  hasError?: boolean;
  activeInvokedModel?: string | null;
  isCallingModel?: boolean;
  lastUsedModel?: string | null;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenLogs,
  historyCount,
  apiStatus,
  hasError = false,
  activeInvokedModel,
  isCallingModel,
  lastUsedModel,
  selectedModel = "gemini-3.7-flash",
  onSelectModel,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            CF
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>ChronicleFlow</span>
                <span className="text-slate-400 font-normal text-xs sm:text-sm">| 历史文案全链路工坊</span>
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                王立群讲史定制
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              原文二创 → 人工审校 → 一键生成分镜生图、剪映纯净字幕、爆款标题与标签
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Model Selector */}
          {onSelectModel && (
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
              <Cpu className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                disabled={isCallingModel}
                className="bg-transparent border-0 text-slate-800 font-semibold text-xs focus:outline-none cursor-pointer disabled:opacity-50 pr-1"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.shortName} ({m.tag})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Realtime Model Status Indicator */}
          {isCallingModel ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <span className="hidden md:inline">正在调用:</span>
              <span className="font-mono">{activeInvokedModel || selectedModel}</span>
            </div>
          ) : lastUsedModel ? (
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px]">最近命中: <strong className="font-semibold text-slate-800">{lastUsedModel}</strong></span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium">Gemini 服务就绪</span>
            </div>
          )}

          {/* Logs & Diagnostics Button */}
          <button
            onClick={onOpenLogs}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium border shadow-2xs cursor-pointer ${
              hasError
                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                : "bg-slate-900 hover:bg-slate-800 text-white border-slate-800"
            }`}
            title="查看服务端调用日志"
          >
            <Terminal className={`w-3.5 h-3.5 ${hasError ? "text-rose-600" : "text-indigo-300"}`} />
            <span>日志</span>
          </button>

          {/* History Projects Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-200 cursor-pointer shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>项目库 ({historyCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};


