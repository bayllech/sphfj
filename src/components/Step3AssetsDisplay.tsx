import React, { useState, useEffect } from "react";
import { DownstreamAssets, SceneItem } from "../types";
import {
  Image,
  Subtitles,
  Tag,
  Copy,
  Check,
  Download,
  Sparkles,
  Eye,
  FileText,
  Layers,
  ChevronRight,
  Bookmark,
  Share2,
  RefreshCw,
  ListOrdered,
  AlignLeft,
} from "lucide-react";
import { generateCleanSubtitles, checkSubtitleIntegrity } from "../utils/subtitleGenerator";

interface Step3Props {
  assets: DownstreamAssets;
  confirmedScript?: string;
  onGenerateImagePreview: (prompt: string, sceneId?: number) => Promise<string | null>;
  usedModel?: string;
  durationMs?: number;
}

export const Step3AssetsDisplay: React.FC<Step3Props> = ({
  assets,
  confirmedScript,
  onGenerateImagePreview,
  usedModel,
  durationMs,
}) => {
  const [activeTab, setActiveTab] = useState<"images" | "subtitles" | "metadata" | "export">("images");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Subtitle custom state to allow instant local re-alignment
  const [currentSubtitles, setCurrentSubtitles] = useState<string>(assets.cleanSubtitles || "");
  const [subtitleViewMode, setSubtitleViewMode] = useState<"formatted" | "lines">("formatted");

  useEffect(() => {
    if (assets.cleanSubtitles) {
      setCurrentSubtitles(assets.cleanSubtitles);
    }
  }, [assets.cleanSubtitles]);

  const [scenePreviews, setScenePreviews] = useState<{ [key: number]: string }>({});
  const [loadingSceneId, setLoadingSceneId] = useState<number | "cover" | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadSubtitlesTxt = () => {
    const blob = new Blob([currentSubtitles], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `剪映纯净字幕_${assets.videoMetadata.mainTitle || "文案"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRealignFromScript = () => {
    if (confirmedScript && confirmedScript.trim()) {
      const generated = generateCleanSubtitles(confirmedScript);
      setCurrentSubtitles(generated);
      assets.cleanSubtitles = generated;
      handleCopyText(generated, "subtitles_realigned");
    }
  };

  const subtitleLines = currentSubtitles
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const totalSubtitleChars = subtitleLines.join("").length;
  const scriptStats = confirmedScript ? checkSubtitleIntegrity(confirmedScript, currentSubtitles) : null;

  const handlePreviewScene = async (prompt: string, sceneId?: number) => {
    const target = sceneId !== undefined ? sceneId : "cover";
    setLoadingSceneId(target);
    try {
      const url = await onGenerateImagePreview(prompt, sceneId);
      if (url) {
        if (sceneId !== undefined) {
          setScenePreviews((prev) => ({ ...prev, [sceneId]: url }));
        } else {
          setCoverPreview(url);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSceneId(null);
    }
  };

  const buildAllPromptsText = () => {
    let str = `【爆款封面提示词】\n${assets.coverImagePrompt}\n\n`;
    assets.scenes.forEach((s) => {
      str += `【编号】${s.id}\n【AI生图提示词】${s.imagePrompt}\n\n`;
    });
    str += `【旁白定位锚点】：\n`;
    assets.scenes.forEach((s) => {
      str += `${s.id}、${s.narration}\n`;
    });
    return str;
  };

  const buildAllExceptSubtitlesText = () => {
    let txt = `=============== ChronicleFlow 历史故事文案资产 (除字幕外全套) ===============\n\n`;
    txt += `一、短标题 (公众号/发现页推送)：\n${assets.videoMetadata.shortTitle || assets.videoMetadata.mainTitle}\n\n`;
    txt += `二、爆款主标题 (8-15字)：\n${assets.videoMetadata.mainTitle}\n`;
    if (assets.videoMetadata.alternateTitles?.length) {
      txt += `备选主标题：${assets.videoMetadata.alternateTitles.join(" / ")}\n`;
    }
    const combinedDescAndTags = `${assets.videoMetadata.description.trim()} ${assets.videoMetadata.hashtags.join(" ")}`;
    txt += `\n三、视频描述与热门标签：\n${combinedDescAndTags}\n\n`;
    txt += `四、推荐归属朝代合集：${assets.videoMetadata.dynastyCollection}\n\n`;
    txt += `========================================================\n\n`;
    txt += `五、分镜生图提示词与对应旁白锚点：\n`;
    txt += buildAllPromptsText();
    return txt;
  };

  const buildExportPackageTxt = () => {
    let txt = `=============== ChronicleFlow 历史故事全套资产包 ===============\n\n`;
    txt += `一、爆款标题与描述标签\n`;
    txt += `短标题 (公众号/发现页)：${assets.videoMetadata.shortTitle || assets.videoMetadata.mainTitle}\n`;
    txt += `主选标题 (8-15字)：${assets.videoMetadata.mainTitle}\n`;
    txt += `备选标题：${assets.videoMetadata.alternateTitles.join(" / ")}\n`;
    txt += `视频描述与热门标签：${assets.videoMetadata.description.trim()} ${assets.videoMetadata.hashtags.join(" ")}\n`;
    txt += `朝代合集：${assets.videoMetadata.dynastyCollection}\n\n`;
    txt += `========================================================\n\n`;
    txt += `二、分镜生图提示词与对应旁白\n`;
    txt += buildAllPromptsText();
    txt += `========================================================\n\n`;
    txt += `三、剪映纯净字幕文本 (直接导入或对齐)\n`;
    txt += `${assets.cleanSubtitles}\n`;

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `视频号历史故事_全套后置资产_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
      {/* Step Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            03
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                步骤 03：全自动生成的全套后置资产 (已就绪)
              </h2>
              {usedModel && (
                <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  资产由 <strong>{usedModel}</strong> 成功生成{durationMs ? ` (${durationMs}ms)` : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              分镜生图提示词、剪映对齐字幕、爆款标题与描述已自动生成完毕，支持一键复制与批量导出。
            </p>
          </div>
        </div>

        {/* Action Quick Export */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCopyText(buildAllExceptSubtitlesText(), "top_copy_except_subs")}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            {copiedKey === "top_copy_except_subs" ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>已复制全套(除字幕)</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white" />
                <span>复制除字幕外全套内容</span>
              </>
            )}
          </button>
          <button
            onClick={buildExportPackageTxt}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>导出 .TXT 文档</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab("images")}
          className={`flex items-center space-x-2 px-4 py-2.5 font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === "images"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Image className="w-4 h-4" />
          <span>① 分镜生图提示词 ({assets.scenes.length}分镜)</span>
        </button>

        <button
          onClick={() => setActiveTab("subtitles")}
          className={`flex items-center space-x-2 px-4 py-2.5 font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === "subtitles"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Subtitles className="w-4 h-4" />
          <span>② 剪映纯净字幕文本</span>
        </button>

        <button
          onClick={() => setActiveTab("metadata")}
          className={`flex items-center space-x-2 px-4 py-2.5 font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === "metadata"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>③ 爆款标题、描述与热门标签</span>
        </button>

        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center space-x-2 px-4 py-2.5 font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === "export"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>④ 一键打包复制/导出</span>
        </button>
      </div>

      {/* Tab 1: Image Generation Prompts & Shot Breakdown */}
      {activeTab === "images" && (
        <div className="space-y-5">
          {/* Cover Prompt Banner */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 shadow-sm border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                爆款封面生图提示词 (戏剧冲突高光视角)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePreviewScene(assets.coverImagePrompt)}
                  disabled={loadingSceneId === "cover"}
                  className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded border border-indigo-500/30 transition flex items-center gap-1 font-medium"
                >
                  {loadingSceneId === "cover" ? (
                    <span className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>预览画风</span>
                </button>
                <button
                  onClick={() => handleCopyText(assets.coverImagePrompt, "cover")}
                  className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-3 py-1 rounded transition flex items-center gap-1"
                >
                  {copiedKey === "cover" ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制封面提示词</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono bg-black/40 p-2.5 rounded-lg border border-slate-800">
              {assets.coverImagePrompt}
            </p>

            {/* Generated Cover Preview if any */}
            {coverPreview && (
              <div className="pt-2">
                <p className="text-[11px] text-indigo-300 mb-1">封面AI生成预览：</p>
                <img
                  src={coverPreview}
                  alt="封面预览"
                  referrerPolicy="no-referrer"
                  className="w-full max-h-64 object-cover rounded-lg border border-indigo-500/30 shadow"
                />
              </div>
            )}
          </div>

          {/* Shot Breakdown List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-700">
              <h3 className="font-bold flex items-center gap-1.5">
                <span>分镜清单与生图提示词</span>
                <span className="text-slate-400 font-normal">
                  (已精准匹配100%原句旁白锚点)
                </span>
              </h3>
              <button
                onClick={() => handleCopyText(buildAllPromptsText(), "all_prompts")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                {copiedKey === "all_prompts" ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> 已复制全部分镜提示词
                  </span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>一键复制全部分镜提示词</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assets.scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-indigo-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Scene Number & Action */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                        【分镜编号 {scene.id}】
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handlePreviewScene(scene.imagePrompt, scene.id)}
                          disabled={loadingSceneId === scene.id}
                          className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition flex items-center gap-1"
                        >
                          {loadingSceneId === scene.id ? (
                            <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Eye className="w-3 h-3 text-indigo-600" />
                          )}
                          <span>画风预览</span>
                        </button>
                        <button
                          onClick={() =>
                            handleCopyText(scene.imagePrompt, `scene_${scene.id}`)
                          }
                          className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition flex items-center gap-1 font-medium"
                        >
                          {copiedKey === `scene_${scene.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                          <span>复制提示词</span>
                        </button>
                      </div>
                    </div>

                    {/* Image Prompt */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700">
                          AI生图提示词 (中文关键信息 · 即梦/可灵/MJ直接可用)
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-sans select-all">
                        {scene.imagePrompt}
                      </p>
                    </div>

                    {/* Image Preview thumbnail if available */}
                    {scenePreviews[scene.id] && (
                      <div className="pt-1">
                        <img
                          src={scenePreviews[scene.id]}
                          alt={`分镜${scene.id}预览`}
                          referrerPolicy="no-referrer"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Narration Anchor */}
                  <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100 mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-900 flex items-center gap-1">
                        <span>【分镜起始旁白锚点 (精准对齐开始点)】</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 bg-white px-1.5 py-0.2 rounded border border-indigo-100">
                        100%原句
                      </span>
                    </div>
                    <p className="text-xs text-indigo-950 font-medium italic">
                      “{scene.narration}”
                    </p>
                    <p className="text-[10px] text-slate-500 font-sans">
                      💡 音画同步：此分镜画面需在该句旁白起始时切入并承载该段故事，严防抢跑或错位
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Subtitles Text for JianYing */}
      {activeTab === "subtitles" && (
        <div className="space-y-4">
          {/* Top Control & Stats Header */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Subtitles className="w-4 h-4 text-indigo-600" />
                  剪映/Whisper 纯净字幕文本 (100% 全量覆盖)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  全文逐句覆盖 · 5-10字标准
                </span>
              </div>
              <p className="text-xs text-slate-500">
                已彻底清除标点符号与特殊字符，按照 5-10 字智能语义断句拆行，绝不打断成语词组，一字不漏。
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600 font-mono">
                <span>总行数：<strong className="text-indigo-600 font-bold">{subtitleLines.length}</strong> 行</span>
                <span>•</span>
                <span>纯汉字数：<strong className="text-indigo-600 font-bold">{totalSubtitleChars}</strong> 字</span>
                {scriptStats && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-medium border border-emerald-100">
                      原文覆盖率: {scriptStats.coveragePercent}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
              {/* Toggle View Mode */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  onClick={() => setSubtitleViewMode("formatted")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition flex items-center gap-1 cursor-pointer ${
                    subtitleViewMode === "formatted"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="纯文本查看"
                >
                  <AlignLeft className="w-3 h-3" />
                  <span>纯文本</span>
                </button>
                <button
                  onClick={() => setSubtitleViewMode("lines")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition flex items-center gap-1 cursor-pointer ${
                    subtitleViewMode === "lines"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="逐行字数核验"
                >
                  <ListOrdered className="w-3 h-3" />
                  <span>逐行核验</span>
                </button>
              </div>

              {/* Re-align from Script */}
              {confirmedScript && (
                <button
                  onClick={handleRealignFromScript}
                  className="text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="若有微调文案，点击可从最新二创文案重新全量对齐"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copiedKey === "subtitles_realigned" ? "已全量重置" : "从文案重新对齐"}</span>
                </button>
              )}

              {/* Download TXT */}
              <button
                onClick={handleDownloadSubtitlesTxt}
                className="text-xs bg-slate-800 hover:bg-slate-900 text-white font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                title="下载为 .txt 纯文本文件，直接拖入剪映或剪辑软件"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载 TXT</span>
              </button>

              {/* Copy Subtitles */}
              <button
                onClick={() => handleCopyText(currentSubtitles, "subtitles")}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {copiedKey === "subtitles" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>已复制纯净字幕</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white" />
                    <span>一键复制全量字幕</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Subtitle Content Display */}
          {subtitleViewMode === "formatted" ? (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto select-all shadow-inner">
              <pre className="whitespace-pre-wrap">{currentSubtitles}</pre>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 max-h-96 overflow-y-auto divide-y divide-slate-100 shadow-2xs">
              {subtitleLines.map((line, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-400 w-8 flex-shrink-0">
                      {String(idx + 1).padStart(3, "0")}
                    </span>
                    <span className="text-slate-800 font-sans select-all">{line}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      line.length >= 5 && line.length <= 10
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                        : line.length < 5
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {line.length} 字
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Metadata (Title, Description, Hashtags) */}
      {activeTab === "metadata" && (
        <div className="space-y-5">
          {/* Short Title (公众号/发现页) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                公众号/发现页短标题 (展示给外人看，精炼6-12字)
              </span>
              <button
                onClick={() =>
                  handleCopyText(
                    assets.videoMetadata.shortTitle || assets.videoMetadata.mainTitle,
                    "short_title"
                  )
                }
                className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                {copiedKey === "short_title" ? "已复制" : "复制短标题"}
              </button>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>{assets.videoMetadata.shortTitle || assets.videoMetadata.mainTitle}</span>
              <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                {(assets.videoMetadata.shortTitle || assets.videoMetadata.mainTitle).length} 字 (用于公众号/发现页卡片)
              </span>
            </div>
          </div>

          {/* Main Title & Alternate Titles */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                爆款主标题 (严格限制 8-15 个汉字)
              </span>
              <button
                onClick={() =>
                  handleCopyText(assets.videoMetadata.mainTitle, "main_title")
                }
                className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                {copiedKey === "main_title" ? "已复制" : "复制主选标题"}
              </button>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>{assets.videoMetadata.mainTitle}</span>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-medium">
                {assets.videoMetadata.mainTitle.length} 字 (严格8-15字)
              </span>
            </div>

            {assets.videoMetadata.alternateTitles?.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">
                  备选主标题方案 (同样遵守8-15字)：
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assets.videoMetadata.alternateTitles.map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium flex justify-between items-center"
                    >
                      <span>{t}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400">({t.length}字)</span>
                        <button
                          onClick={() => handleCopyText(t, `alt_title_${idx}`)}
                          className="text-[10px] text-slate-400 hover:text-slate-800 cursor-pointer"
                        >
                          {copiedKey === `alt_title_${idx}` ? "已复制" : "复制"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Video Description & Hashtags Together (Strict <= 40 Chars) */}
          {(() => {
            const combinedText = `${assets.videoMetadata.description.trim()} ${assets.videoMetadata.hashtags.join(" ")}`.trim();
            const combinedLen = combinedText.length;
            const isCompliant = combinedLen <= 40;

            return (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-indigo-600" />
                      视频描述与热门标签 (严格控制在 40 汉字以内)
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                        isCompliant
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      合计 {combinedLen} / 40 字 {isCompliant ? "(符合规范)" : "(建议微调)"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyText(combinedText, "desc_and_tags")}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {copiedKey === "desc_and_tags" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>已复制描述与标签</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-white" />
                        <span>一键复制描述与标签</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 select-all">
                  <p className="text-xs text-slate-800 leading-relaxed font-sans">
                    <span>{assets.videoMetadata.description.trim()}</span>{" "}
                    {assets.videoMetadata.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-indigo-600 font-semibold inline-block mr-1.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>
                    描述字数: <strong>{assets.videoMetadata.description.trim().length}</strong> 字 · 标签数量: <strong>{assets.videoMetadata.hashtags.length}</strong> 个
                  </span>
                  <span className="text-slate-400">
                    可直接复制并无缝发布到视频号/公众号后台
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Dynasty Collection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-xs text-slate-800 block">
              推荐归属朝代合集
            </span>
            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>{assets.videoMetadata.dynastyCollection}</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                视频号合集匹配
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Export All Actions */}
      {activeTab === "export" && (
        <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <h3 className="font-bold text-sm text-slate-900">
            一键打包复制与导出资产
          </h3>
          <p className="text-xs text-slate-600">
            不用每次手动去复制各段提示词，您可以在这里一键提取整套文案并直接导入剪映、AI生图软件或发布后台中。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleCopyText(buildAllExceptSubtitlesText(), "batch_except_subs")}
              className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-left transition space-y-1 shadow-sm cursor-pointer col-span-1 sm:col-span-2"
            >
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-white" />
                <span>一键复制除剪映纯净字幕文本外的所有内容</span>
              </div>
              <p className="text-[11px] text-indigo-100">
                {copiedKey === "batch_except_subs"
                  ? "已成功复制除字幕外的全部资产到剪贴板！"
                  : "自动打包：短标题、主备标题、描述与#热门标签、封面提示词与全部分镜提示词锚点"}
              </p>
            </button>

            <button
              onClick={() => handleCopyText(buildAllPromptsText(), "batch_prompts")}
              className="p-3.5 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 text-left transition space-y-1 shadow-xs cursor-pointer"
            >
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-indigo-600" />
                <span>仅复制全部 AI 生图提示词 (含封面+所有分镜)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {copiedKey === "batch_prompts" ? "已复制到剪贴板！" : "适合直接粘贴至 Midjourney / SD / Gemini 生图面板"}
              </p>
            </button>

            <button
              onClick={() => handleCopyText(assets.cleanSubtitles, "batch_subs")}
              className="p-3.5 bg-white hover:bg-indigo-50/50 rounded-xl border border-slate-200 hover:border-indigo-300 text-left transition space-y-1 shadow-xs cursor-pointer"
            >
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Subtitles className="w-4 h-4 text-indigo-600" />
                <span>仅复制剪映纯净字幕文本</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {copiedKey === "batch_subs" ? "已复制到剪贴板！" : "适合导入剪映音视频字幕对齐"}
              </p>
            </button>

            <button
              onClick={buildExportPackageTxt}
              className="p-3.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition space-y-1 shadow-xs cursor-pointer col-span-1 sm:col-span-2"
            >
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>导出完整 .TXT 文本资产文档</span>
              </div>
              <p className="text-[11px] text-slate-500">
                本地保存完整文件：包含封面提示词、分镜、字幕、短标题、主副标题与热门标签
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

