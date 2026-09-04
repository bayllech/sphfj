export type PresetMode = "wangliqun_standard" | "wangliqun_sales" | "高差异度" | "wangliqun" | "评书重构";

export type ImageStylePreset = "song_heavy_color" | "national_ink_wash" | "custom";

export interface ImageStyleConfig {
  preset: ImageStylePreset;
  name: string;
  description: string;
  stylePrompt: string;
  negativePrompt: string;
  customPrompt?: string;
}

export const IMAGE_STYLE_PRESETS: Record<ImageStylePreset, ImageStyleConfig> = {
  song_heavy_color: {
    preset: "song_heavy_color",
    name: "宋式重彩工笔纪录片风",
    description: "宋代水墨工笔古绢底色，重彩宝石色系，写实端庄，纪录片史诗叙事感",
    stylePrompt:
      "超高清，干净重彩工笔纪录片风，宋式重彩水墨工笔，古绢淡雅底色，中式古典历史场景，古朴木柱，淡墨山水屏风，人物清晰写实，五官端正，面部干净细腻，服饰使用朱砂红、石青、石绿、藤黄、暖金等重彩宝石色系，整体光线柔和通透，构图庄重，纪录片叙事感强，高清细腻。",
    negativePrompt: "禁止二次元，禁止卡通，禁止3D，禁止文字字幕，禁止现代物品。",
  },
  national_ink_wash: {
    preset: "national_ink_wash",
    name: "新国风水墨工笔淡彩插画",
    description: "传统连环画铁线描与小写意晕染，青绿与赭石淡彩平涂，宣纸留白美学",
    stylePrompt:
      "超高清，新国风水墨工笔淡彩插画，兼具传统连环画线描与小写意水墨晕染风格。核心特征：毛笔墨线勾勒人物轮廓（铁线描/白描），辅以低饱和度的青绿与赭石淡彩平涂及局部晕染，背景保持宣纸质感的留白，中式古典美学，构图典雅，意境深远，线条流畅，人物生动细腻。",
    negativePrompt: "禁止二次元，禁止现代物品，禁止大面积浓烈死黑，禁止3D卡通，禁止字幕水印。",
  },
  custom: {
    preset: "custom",
    name: "自定义生图风格提示词",
    description: "手动输入您专属的 AI 绘图艺术风格与画面特征描述词",
    stylePrompt: "",
    negativePrompt: "禁止二次元，禁止现代物品，禁止字幕水印。",
    customPrompt: "",
  },
};

export interface HookAnalysis {
  openingAttraction: string;
  firstHook: string;
  storyBody: string;
  secondHook: string;
  hookRetrieval: string;
  continuationAttraction: string;
}

export interface OpeningVersion {
  id: number;
  name: string;
  text: string;
  tag: string;
}

export interface SceneItem {
  id: number;
  imagePrompt: string;
  narration: string;
  previewUrl?: string;
  isGeneratingImage?: boolean;
}

export interface VideoMetadata {
  shortTitle: string;
  mainTitle: string;
  alternateTitles: string[];
  description: string;
  hashtags: string[];
  dynastyCollection: string;
}

export interface DownstreamAssets {
  coverImagePrompt: string;
  coverPreviewUrl?: string;
  scenes: SceneItem[];
  cleanSubtitles: string;
  videoMetadata: VideoMetadata;
}

export interface ModelOption {
  id: string;
  name: string;
  shortName: string;
  tag: string;
  tagColor: string;
  description: string;
  speed: string;
  capability: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "gemini-3.7-flash",
    name: "gemini-3.7-flash",
    shortName: "3.7 Flash 旗舰",
    tag: "深度推理",
    tagColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "最新 3 系列旗舰，擅长深度逻辑重构、动机挖掘与多重设问",
    speed: "中等 (3~6s)",
    capability: "五星推荐",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "gemini-3.1-flash-lite",
    shortName: "3.1 Flash Lite 极速",
    tag: "极速响应",
    tagColor: "bg-amber-100 text-amber-800 border-amber-200",
    description: "极速轻量化，超低延迟响应，适合快速出稿与短文本重写",
    speed: "极快 (1~2s)",
    capability: "超低延迟",
  },
  {
    id: "gemini-flash-latest",
    name: "gemini-flash-latest",
    shortName: "Flash-Latest 官方通道",
    tag: "官方最新",
    tagColor: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Google 官方自动指向的最新稳定 Flash 模型通道",
    speed: "快速 (2~4s)",
    capability: "官方稳定",
  },
  {
    id: "gemini-2.5-flash",
    name: "gemini-2.5-flash",
    shortName: "2.5 Flash 成熟主力",
    tag: "高并发抗压",
    tagColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "云端并发容量最大，算力充足且极少限流，长篇文案最稳",
    speed: "快速 (2~3s)",
    capability: "高并发最稳",
  },
  {
    id: "auto",
    name: "auto (智能级联)",
    shortName: "智能级联 (推荐)",
    tag: "防熔断保底",
    tagColor: "bg-purple-100 text-purple-800 border-purple-200",
    description: "按 [3.7 → 3.1-lite → latest → 2.5] 自动顺延，保证 100% 成功出稿",
    speed: "智能自适应",
    capability: "100% 成功率",
  },
];

export const ORDERED_MODEL_CASCADE = [
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash",
] as const;

export interface HistoryProject {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  originalScript: string;
  presetMode: PresetMode;
  customInstructions: string;
  rewrittenScript: string;
  isConfirmed: boolean;
  usedModel?: string;
  durationMs?: number;
  downstreamAssets: DownstreamAssets | null;
}

export type LogLevel = "info" | "warn" | "error" | "success";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  action: string;
  endpoint?: string;
  model?: string;
  attempt?: number;
  maxAttempts?: number;
  durationMs?: number;
  message: string;
  details?: Record<string, any> | string;
  error?: {
    message: string;
    code?: number | string;
    status?: string;
    stack?: string;
  };
}

export const SAMPLE_SCRIPTS = [
  {
    title: "关羽水淹七军",
    content: `建安二十四年，关羽率领大军从荆州出发北伐襄樊。当时驻守樊城的是曹魏大将曹仁，曹仁被关羽军团团围住，急忙向许昌求援。曹操得知襄樊告急，立刻派大将于禁率领七军前往救援。于禁率领精锐步骑三万人马赶到樊城城北扎营。不料此时正值八月汉水暴涨，连续大雨连绵十余日，汉水溢出堤岸，平地水深数丈。于禁等七军猝不及防，尽皆被大水淹没。关羽早有准备，率领水军乘大船乘胜出击，大败于禁。于禁被迫投降，庞德立而不跪被斩杀。此战关羽威震华夏，曹操甚至一度考虑迁都避其锋芒。`
  },
  {
    title: "玄武门之变",
    content: `唐高祖武德九年六月初四，长安玄武门前发生了一场改变唐朝命运的剧变。秦王李世民与太子李建成、齐王李元吉在朝堂权力的巅峰对决中走到了决裂边缘。李世民密奏高祖，举报李建成与李元吉后宫勾结。次日清晨，李建成与李元吉奉诏入朝，当骑马走到玄武门附近时，发觉气氛异常，急忙掉头想回府。李世民亲自率领伏兵从后方大声呼喊，李元吉惊慌失措拉弓射向李世民，但连续三次因手抖未将弓拉满。李世民随即搭箭一箭射中李建成，李建成当场落马身亡。尉迟恭率精骑赶到击杀李元吉。此战之后，李世民被立为皇太子，不久登基为帝，开创贞观之治。`
  },
  {
    title: "张居正一条鞭法",
    content: `明朝隆庆至万历年间，内阁首辅张居正推行了一场轰轰烈烈的全面改革。当时的明朝官僚腐败，国库空虚，土地兼并极其严重，底层百姓赋税不堪重负。张居正首先推行考成法，整顿吏治，大刀阔斧裁撤冗员。随后在全国范围内清丈土地，彻底清理富豪地主隐瞒不报的土地。最关键的举念是推行一条鞭法，将过去的繁杂赋役和杂税合并，折成银两，按土地亩数统一征收。这一改革极大地简化了征税手续，减轻了无地少地农民的负担，使明朝国库充盈，国力得以大振兴。`
  }
];
