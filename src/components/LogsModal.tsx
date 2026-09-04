import React, { useState, useEffect } from "react";
import {
  X,
  Terminal,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ExternalLink,
} from "lucide-react";
import { LogEntry, LogLevel } from "../types";

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/logs?limit=150");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  // Auto refresh interval when open
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(timer);
  }, [isOpen, autoRefresh]);

  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/logs/clear", { method: "POST" });
      if (res.ok) {
        setLogs([]);
        fetchLogs();
      }
    } catch (e) {
      console.error("Failed to clear logs:", e);
    }
  };

  const handleCopyAll = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (entry: LogEntry) => {
    const text = JSON.stringify(entry, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!isOpen) return null;

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== "all" && log.level !== filterLevel) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message?.toLowerCase().includes(q);
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchModel = log.model?.toLowerCase().includes(q);
      const matchError = log.error?.message?.toLowerCase().includes(q);
      return matchMsg || matchAction || matchModel || matchError;
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;
  const successCount = logs.filter((l) => l.level === "success").length;

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            ERROR 失败
          </span>
        );
      case "warn":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            WARN 警告/重试
          </span>
        );
      case "success":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            SUCCESS 成功
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Info className="w-3 h-3" />
            INFO 过程
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base tracking-tight text-white">
                  实时系统调用日志与诊断面板
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono">
                  严格调用序: 3.7-flash → 3.1-lite → latest → 2.5-flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                实时追踪模型按序请求、实际响应模型、耗时、重试机制与详细错误 (共 {logs.length} 条)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Auto refresh switch */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                autoRefresh
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title="切换是否每3秒自动拉取最新日志"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />
              <span>{autoRefresh ? "自动刷新: 开" : "自动刷新: 关"}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="手动刷新日志"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            </button>

            {/* Copy All */}
            <button
              onClick={handleCopyAll}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
              title="复制全部日志（JSON格式）用于排错分析"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-indigo-200" />}
              <span>{copiedAll ? "已复制完整日志" : "复制全部日志"}</span>
            </button>

            {/* Clear Logs */}
            <button
              onClick={handleClearLogs}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 text-slate-400 border border-slate-700 transition"
              title="清空当前日志"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diagnostic Status Summary Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              筛选级别:
            </span>
            <button
              onClick={() => setFilterLevel("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filterLevel === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              全部 ({logs.length})
            </button>
            <button
              onClick={() => setFilterLevel("error")}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                filterLevel === "error"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              错误 ({errorCount})
            </button>
            <button
              onClick={() => setFilterLevel("warn")}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                filterLevel === "warn"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              警告/重试 ({warnCount})
            </button>
            <button
              onClick={() => setFilterLevel("success")}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                filterLevel === "success"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              成功 ({successCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模型/报错/操作..."
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Logs List Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-900/5 min-h-[350px]">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Terminal className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600 text-sm">暂无匹配的日志记录</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                当您在界面发起文案二创、分镜拆解或图片生成时，服务端的实时调用流水与完整报错信息将在此展示。
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = !!expandedLogIds[log.id];
              const hasExtraDetails = log.details || log.error;

              return (
                <div
                  key={log.id}
                  className={`bg-white rounded-xl border transition shadow-xs overflow-hidden ${
                    log.level === "error"
                      ? "border-rose-200 hover:border-rose-300"
                      : log.level === "warn"
                      ? "border-amber-200 hover:border-amber-300"
                      : log.level === "success"
                      ? "border-emerald-200 hover:border-emerald-300"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Summary row */}
                  <div
                    onClick={() => hasExtraDetails && toggleExpand(log.id)}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      hasExtraDetails ? "cursor-pointer hover:bg-slate-50/80" : ""
                    }`}
                  >
                    <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                      {getLevelBadge(log.level)}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-800 tracking-tight">
                            {log.action}
                          </span>

                          {log.model && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-mono">
                              <Cpu className="w-2.5 h-2.5" />
                              {log.model}
                            </span>
                          )}

                          {log.attempt && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                              尝试 {log.attempt}/{log.maxAttempts || 3}
                            </span>
                          )}

                          {log.durationMs !== undefined && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {log.durationMs}ms
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 mt-1 font-mono break-all line-clamp-2">
                          {log.message}
                        </p>
                      </div>
                    </div>

                    {/* Right timestamp & expand button */}
                    <div className="flex items-center space-x-2 text-xs text-slate-400 self-end sm:self-center flex-shrink-0">
                      <span className="font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString("zh-CN", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySingle(log);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                        title="复制此条日志"
                      >
                        {copiedId === log.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {hasExtraDetails && (
                        <button
                          className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                          title={isExpanded ? "收起详情" : "展开详情"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON / Stack details */}
                  {isExpanded && hasExtraDetails && (
                    <div className="px-4 py-3 bg-slate-900 border-t border-slate-200 font-mono text-[11px] text-slate-200 space-y-2">
                      {log.error && (
                        <div className="space-y-1">
                          <div className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            错误信息 / Error Details:
                          </div>
                          <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800/50 text-rose-200 text-xs overflow-x-auto whitespace-pre-wrap">
                            {log.error.message}
                            {log.error.code && (
                              <div className="text-rose-400 mt-1 text-[11px]">
                                状态码 (Status / Code): {log.error.code}
                              </div>
                            )}
                            {log.error.stack && (
                              <div className="text-slate-400 mt-2 text-[10px] max-h-36 overflow-y-auto whitespace-pre">
                                {log.error.stack}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {log.details && (
                        <div className="space-y-1">
                          <div className="text-slate-300 font-bold">附加参数与追踪数据 / Context:</div>
                          <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-emerald-300 overflow-x-auto text-[11px] max-h-48 overflow-y-auto">
                            {typeof log.details === "string"
                              ? log.details
                              : JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Troubleshooting Guide */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">💡 常见报错自查：</span>
            <span>
              <strong className="text-amber-700">503 / UNAVAILABLE</strong>: Google 云端算力瞬时繁忙，系统已配置自动避让重试；
              <strong className="text-rose-700 ml-2">404</strong>: 模型名称未在当前区域上线；
              <strong className="text-indigo-700 ml-2">429</strong>: 触发频率限制。
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition self-end sm:self-center"
          >
            完成查看
          </button>
        </div>
      </div>
    </div>
  );
};
