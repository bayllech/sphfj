import React from "react";
import { HistoryProject } from "../types";
import { X, Trash2, ArrowRight, Clock, FileText, CheckCircle2, Search } from "lucide-react";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: HistoryProject[];
  onSelectProject: (proj: HistoryProject) => void;
  onDeleteProject: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
  onDeleteProject,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  if (!isOpen) return null;

  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.originalScript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.rewrittenScript.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base">历史项目库 ({projects.length})</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索历史文案、关键字、标题..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {projects.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2.5 py-1 rounded hover:bg-rose-50 transition"
            >
              清空历史
            </button>
          )}
        </div>

        {/* Project List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <FileText className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm">暂无历史创作记录</p>
            </div>
          ) : (
            filtered.map((proj) => (
              <div
                key={proj.id}
                className="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-3.5 transition shadow-xs space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">
                        {proj.title || "未命名历史文案"}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {proj.presetMode}
                      </span>
                      {proj.isConfirmed && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> 已生成全套资产
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {proj.rewrittenScript || proj.originalScript}
                    </p>
                  </div>

                  <span className="text-[11px] text-slate-400 whitespace-nowrap ml-3">
                    {new Date(proj.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    字数: {proj.rewrittenScript.length || proj.originalScript.length} 字
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onDeleteProject(proj.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 p-1 transition"
                      title="删除记录"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        onSelectProject(proj);
                        onClose();
                      }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 rounded-lg transition flex items-center gap-1 shadow-xs"
                    >
                      <span>载入工作区</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

