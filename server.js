const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");
const crypto = require("crypto");
const { execFile } = require("child_process");
const PDFDocument = require("pdfkit");
const WebSocket = require("ws");
const { WebSocketServer } = require("ws");
const { createWorker } = require("tesseract.js");
const {
  initCoachHistorySchema,
  listCoachConversations,
  parseCoachUserId,
  upsertCoachConversations,
} = require("./server/coachHistory");
let DatabaseSync = null;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  DatabaseSync = null;
}

loadEnvFile(path.join(__dirname, ".env.local"));
loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(__dirname, "..", ".env"));

const PORT = Number(process.env.PORT || 4321);
const SERVER_HOST = process.env.NODE_ENV === "production"
  ? "127.0.0.1"
  : String(process.env.IELTSIST_BIND_HOST || "0.0.0.0").trim() || "0.0.0.0";
const STARTED_AT = Date.now();
const PUBLIC_DIR = path.join(__dirname, "public");
const APP_DB_PATH = process.env.IELTSIST_DB_PATH || path.join(__dirname, "data", "ieltsist.sqlite");
// Session cookies are only sent over HTTPS by default; set this to 0 for an explicitly HTTP-only local setup.
const SESSION_COOKIE_SECURE = String(process.env.SESSION_COOKIE_SECURE || "1").trim() !== "0";
const OBJECTIVE_GUEST_COOKIE = "ieltsist_objective_guest";
const OBJECTIVE_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;
const OBJECTIVE_GUEST_DAILY_SUBMISSION_LIMIT = Math.max(1, Math.min(200, Number.parseInt(process.env.OBJECTIVE_GUEST_DAILY_SUBMISSION_LIMIT || "12", 10) || 12));
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || "";
const USER_ROLE_ORDER = ["student", "teacher", "school_admin", "school_owner", "staff"];
const VALID_USER_ROLES = new Set(USER_ROLE_ORDER);
const STEM_MARKING_STATUSES = new Set(["queued", "processing", "completed", "failed", "missing_metadata"]);
const STEM_ORGANIZATION_ROLES = new Set(["student", "teacher", "school_admin", "school_owner"]);
const STEM_IDENTITY_SIGNING_KEY = process.env.STEM_IDENTITY_SIGNING_KEY || "";
const STEM_INTERNAL_AUTH_KEY = process.env.STEM_INTERNAL_AUTH_KEY || STEM_IDENTITY_SIGNING_KEY;
const STEM_INTERNAL_AUTH_WINDOW_MS = 60_000;
const STEM_ALLOWED_ORIGINS = new Set([
  "https://stem.ieltsist.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
const DEFAULT_CAMBRIDGE15_DIR = process.platform === "win32"
  ? "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑15"
  : path.join(__dirname, "data", "cambridge15");
const CAMBRIDGE15_DIR = process.env.CAMBRIDGE15_DIR || DEFAULT_CAMBRIDGE15_DIR;
const CAMBRIDGE15_AUDIO_DIR = path.join(CAMBRIDGE15_DIR, "音频");
const CAMBRIDGE15_PDF = path.join(CAMBRIDGE15_DIR, "剑15.pdf");
const QUESTION_BANK_PATH = path.join(__dirname, "data", "cambridge15-bank.json");
const CAMBRIDGE_LOCAL_BANK_PATH = path.join(__dirname, "data", "cambridge-local-bank.json");
const SPEAKING_BANK_PATH = path.join(__dirname, "data", "speaking-bank.json");
const LISTENING_ASR_CACHE_PATH = process.env.LISTENING_ASR_CACHE_PATH
  ? path.resolve(process.env.LISTENING_ASR_CACHE_PATH)
  : path.join(__dirname, "data", "listening-asr-cache.json");
const READING_OCR_CACHE_PATH = path.join(__dirname, "data", "reading-ocr-page-cache.json");
const OBJECTIVE_SEMANTIC_TOPICS_PATH = process.env.OBJECTIVE_SEMANTIC_TOPICS_PATH
  ? path.resolve(process.env.OBJECTIVE_SEMANTIC_TOPICS_PATH)
  : path.join(__dirname, "data", "objective-semantic-topics.json");
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || process.env.UUAPI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const VOICE_CHAT_URL = process.env.VOICE_CHAT_URL || "https://chatgpt.com/";
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
const DASHSCOPE_WORKSPACE_ID = process.env.DASHSCOPE_WORKSPACE_ID || process.env.QWEN_WORKSPACE_ID || "";
const DASHSCOPE_REGION = process.env.DASHSCOPE_REGION || "cn-beijing";
const DEFAULT_DASHSCOPE_COMPAT_BASE_URL = DASHSCOPE_WORKSPACE_ID
  ? `https://${DASHSCOPE_WORKSPACE_ID}.${DASHSCOPE_REGION}.maas.aliyuncs.com/compatible-mode/v1`
  : "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DASHSCOPE_COMPAT_BASE_URL = (process.env.DASHSCOPE_COMPAT_BASE_URL || DEFAULT_DASHSCOPE_COMPAT_BASE_URL).replace(/\/+$/, "");
const WRITING_AI_MODEL = process.env.WRITING_AI_MODEL || process.env.QWEN_WRITING_MODEL || "qwen3.7-max";
const WRITING_AI_BASE_URL = (process.env.WRITING_AI_BASE_URL || process.env.QWEN_WRITING_BASE_URL || DASHSCOPE_COMPAT_BASE_URL).replace(/\/+$/, "");
const WRITING_AI_API_KEY = process.env.WRITING_AI_API_KEY || process.env.QWEN_WRITING_API_KEY || DASHSCOPE_API_KEY;
const WRITING_SCORING_PROMPT_VERSION = "ielts-writing-rubric.v2";
const WRITING_AI_TIMEOUT_MS = Math.max(1_000, Math.min(60_000, Number(process.env.WRITING_AI_TIMEOUT_MS || 25_000)));
// The public AI gateway is intentionally server-only. Do not expose this key in
// /api/tasks, logs, client bundles, or provider error messages.
const AI_GATEWAY_BASE_URL = (process.env.AI_GATEWAY_BASE_URL || "https://ai.ieltsist.com/v1").replace(/\/+$/, "");
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || "";
const AI_GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL || "gpt-5.5";
const AI_GATEWAY_REASONING_EFFORT = ["low", "medium", "high", "xhigh"].includes(String(process.env.AI_GATEWAY_REASONING_EFFORT || "xhigh").toLowerCase())
  ? String(process.env.AI_GATEWAY_REASONING_EFFORT || "xhigh").toLowerCase()
  : "xhigh";
const AI_GATEWAY_TIMEOUT_MS = Math.max(5_000, Math.min(90_000, Number(process.env.AI_GATEWAY_TIMEOUT_MS || 45_000)));
const COACH_AGENT_TOOL_TIMEOUT_MS = Math.max(250, Math.min(5_000, Number(process.env.COACH_AGENT_TOOL_TIMEOUT_MS || 1_500)));
const COACH_AI_MODEL = process.env.COACH_AI_MODEL || process.env.QWEN_COACH_MODEL || "qwen3.7-max";
const COACH_AI_BASE_URL = (process.env.COACH_AI_BASE_URL || process.env.QWEN_COACH_BASE_URL || DASHSCOPE_COMPAT_BASE_URL).replace(/\/+$/, "");
const COACH_AI_API_KEY = process.env.COACH_AI_API_KEY || process.env.QWEN_COACH_API_KEY || DASHSCOPE_API_KEY;
const COACH_AI_TIMEOUT_MS = Math.max(5_000, Math.min(60_000, Number(process.env.COACH_AI_TIMEOUT_MS || 25_000)));
const STEM_MARKING_AI_DISABLED = process.env.STEM_MARKING_AI_DISABLED === "1";
const STEM_MARKING_AI_MODEL = STEM_MARKING_AI_DISABLED ? "" : (process.env.STEM_MARKING_AI_MODEL || COACH_AI_MODEL);
const STEM_MARKING_AI_BASE_URL = STEM_MARKING_AI_DISABLED ? "" : (process.env.STEM_MARKING_AI_BASE_URL || COACH_AI_BASE_URL).replace(/\/+$/, "");
const STEM_MARKING_AI_API_KEY = STEM_MARKING_AI_DISABLED ? "" : (process.env.STEM_MARKING_AI_API_KEY || COACH_AI_API_KEY);
const STEM_MARKING_QUEUE_DISABLED = process.env.STEM_MARKING_QUEUE_DISABLED === "1";
const STEM_MARKING_TRUSTED_MANIFEST_PATH = String(process.env.STEM_MARKING_TRUSTED_MANIFEST_PATH || "").trim();
const STEM_MARKING_MANIFEST_SCHEMA_VERSION = "stem-marking-manifest.v2";
const STEM_MARKING_REVIEW_SCHEMA_VERSION = "stem-source-review.v1";
const STEM_MARKING_REVIEW_STATUSES = new Set(["approved", "unreviewed", "quarantined", "stale"]);
const SPEAKING_AUDIO_AI_MODEL = process.env.SPEAKING_AUDIO_AI_MODEL || process.env.QWEN_SPEAKING_AUDIO_MODEL || "qwen3.5-omni-flash";
const SPEAKING_AUDIO_AI_BASE_URL = (process.env.SPEAKING_AUDIO_AI_BASE_URL || process.env.QWEN_SPEAKING_AUDIO_BASE_URL || DASHSCOPE_COMPAT_BASE_URL).replace(/\/+$/, "");
const SPEAKING_AUDIO_AI_API_KEY = process.env.SPEAKING_AUDIO_AI_API_KEY || process.env.QWEN_SPEAKING_AUDIO_API_KEY || DASHSCOPE_API_KEY;
const SPEAKING_SCORING_PROMPT_VERSION = "ielts-speaking-rubric.v2";
const SPEAKING_AI_TIMEOUT_MS = Math.max(1_000, Math.min(60_000, Number(process.env.SPEAKING_AI_TIMEOUT_MS || 25_000)));
const SPEAKING_AUDIO_MAX_BASE64_BYTES = Number(process.env.SPEAKING_AUDIO_MAX_BASE64_BYTES || 10_000_000);
const QWEN_REALTIME_MODEL = process.env.QWEN_REALTIME_MODEL || "qwen3.5-omni-flash-realtime";
const QWEN_ASR_MODEL = process.env.QWEN_ASR_MODEL || "qwen3-asr-flash-realtime";
const LISTENING_ASR_CACHE_SOURCE = "qwen-asr-live-vad-v1";
const DASHSCOPE_WEBRTC_ENDPOINT = (process.env.DASHSCOPE_WEBRTC_ENDPOINT || process.env.QWEN_WEBRTC_ENDPOINT || "").replace(/\/+$/, "");
const QWEN_WEBRTC_EXCHANGE_PROXY_URL = (process.env.QWEN_WEBRTC_EXCHANGE_PROXY_URL || "").trim();
const QWEN_WEBRTC_MODE = (process.env.QWEN_WEBRTC_MODE || "auto").toLowerCase();
const FISH_API_URL = process.env.FISH_API_URL || "https://api.fish.audio/v1/tts";
const FISH_MODEL = process.env.FISH_MODEL || "s2.1-pro-free";
const FISH_API_KEY = process.env.FISH_API_KEY || process.env.FISH_AUDIO_API_KEY || process.env.FISHAUDIO_API_KEY || "";
const FISH_VOICES = {
  examiner: process.env.FISH_EXAMINER_REFERENCE_ID || process.env.FISH_EN_REFERENCE_ID || "05aff7ff557d45d2ace9a639452451ea",
  candidateA: process.env.FISH_CANDIDATE_A_REFERENCE_ID || process.env.FISH_REFERENCE_ID || "39ea63baf6c0480cb8148dc7955db78e",
  candidateB: process.env.FISH_CANDIDATE_B_REFERENCE_ID || process.env.FISH_EN_REFERENCE_ID || "05aff7ff557d45d2ace9a639452451ea",
  narrator: process.env.FISH_NARRATOR_REFERENCE_ID || process.env.FISH_EN_REFERENCE_ID || "05aff7ff557d45d2ace9a639452451ea",
};
const AMBER_SKILL_PATH = process.env.AMBER_IELTS_SKILL_PATH || "C:\\Users\\10604\\.codex\\skills\\amber-ielts-writing-feedback\\SKILL.md";
const AMBER_WRITING_SKILL = fs.existsSync(AMBER_SKILL_PATH)
  ? fs.readFileSync(AMBER_SKILL_PATH, "utf8")
  : "";
const CAMBRIDGE15_BANK = loadQuestionBank(QUESTION_BANK_PATH);
const LOCAL_CAMBRIDGE_BANK = loadQuestionBank(CAMBRIDGE_LOCAL_BANK_PATH);
const OBJECTIVE_SEMANTIC_TOPICS = loadSemanticTopicCatalog(OBJECTIVE_SEMANTIC_TOPICS_PATH);
const IMPORTED_BANKS = [CAMBRIDGE15_BANK, LOCAL_CAMBRIDGE_BANK];
const LOCAL_FILE_INDEX = new Map((LOCAL_CAMBRIDGE_BANK.localFiles || []).map((file) => [file.id, file]));

const recentWindow = "2025-07 to 2026-07";
const TASKS_CACHE_TTL_MS = 10 * 60_000;
const LISTENING_SCRIPT_CACHE_TTL_MS = 10 * 60_000;
const REPORT_DOWNLOAD_TTL_MS = 2 * 60 * 60_000;
const RECORDING_DOWNLOAD_TTL_MS = REPORT_DOWNLOAD_TTL_MS;
let tasksPayloadCache = null;
const staticGzipCache = new Map();
const reportDownloads = new Map();
const recordingDownloads = new Map();
const listeningScriptCache = new Map();
const readingOcrInFlight = new Map();
let readingOcrPageCache = null;

const officialSources = [
  {
    label: "IELTS Online Tests - practice test library",
    url: "https://ieltsonlinetests.com/",
  },
  {
    label: "IELTS Online Tests - Cambridge IELTS practice",
    url: "https://ieltsonlinetests.com/ielts-exam-library",
  },
  {
    label: "IELTS official sample test questions",
    url: "https://ielts.org/take-a-test/preparation-resources/sample-test-questions",
  },
  {
    label: "British Council IELTS practice tests",
    url: "https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-english-practice-tests",
  },
];

const writingTasks = [
  {
    id: "w-2026-ai-education",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Recent-topic simulation",
    period: recentWindow,
    title: "AI and education",
    prompt:
      "Some people think artificial intelligence will improve education, while others believe it may harm students' ability to think independently. Discuss both views and give your own opinion.",
  },
  {
    id: "w-2026-workweek",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Recent-topic simulation",
    period: recentWindow,
    title: "Four-day working week",
    prompt:
      "Some people believe that a four-day working week would benefit both employees and employers. Others think it would create more problems than benefits. Discuss both views and give your opinion.",
  },
  {
    id: "w-2026-cost-living",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Recent-topic simulation",
    period: recentWindow,
    title: "Cost of living",
    prompt:
      "In many countries, the cost of living is rising rapidly. What problems does this cause for individuals and society, and what measures can governments take to address them?",
  },
  {
    id: "w-2026-health-funding",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Recent-topic simulation",
    period: recentWindow,
    title: "Medical research funding",
    prompt:
      "Research into new medicines and treatments is essential for improving health and dealing with diseases. Who should fund this research: private companies, individuals, or governments?",
  },
  {
    id: "w-2026-library-chart",
    module: "writing",
    type: "Task 1",
    minutes: 20,
    source: "Official-style simulation",
    period: recentWindow,
    title: "Public library use",
    prompt:
      "The chart shows how adults in one country used public libraries for four different purposes in 2010, 2015 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    data:
      "Borrowing books: 62%, 55%, 47%. Using computers: 18%, 29%, 34%. Attending events: 12%, 20%, 31%. Studying quietly: 40%, 44%, 49%.",
    visual: {
      kind: "line",
      title: "Public library use by adults",
      labels: ["2010", "2015", "2020"],
      unit: "%",
      series: [
        { name: "Borrowing books", values: [62, 55, 47] },
        { name: "Using computers", values: [18, 29, 34] },
        { name: "Attending events", values: [12, 20, 31] },
        { name: "Studying quietly", values: [40, 44, 49] },
      ],
    },
  },
  {
    id: "w-2026-transport-table",
    module: "writing",
    type: "Task 1",
    minutes: 20,
    source: "Official-style simulation",
    period: recentWindow,
    title: "Transport choices",
    prompt:
      "The table compares the percentage of commuters using four types of transport in three cities in 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    data:
      "Metro: City A 48%, City B 31%, City C 22%. Bus: 24%, 38%, 35%. Car: 18%, 21%, 33%. Bicycle: 10%, 10%, 10%.",
    visual: {
      kind: "bar",
      title: "Commuter transport choices in 2025",
      labels: ["City A", "City B", "City C"],
      unit: "%",
      series: [
        { name: "Metro", values: [48, 31, 22] },
        { name: "Bus", values: [24, 38, 35] },
        { name: "Car", values: [18, 21, 33] },
        { name: "Bicycle", values: [10, 10, 10] },
      ],
    },
  },
  {
    id: "w-2026-campus-map",
    module: "writing",
    type: "Task 1",
    minutes: 20,
    source: "Official-style simulation",
    period: recentWindow,
    title: "Campus redevelopment map",
    prompt:
      "The maps show changes to a small university campus between 2005 and the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    data:
      "2005: library north, car park east, sports field south, two teaching blocks west. Present: larger library with study centre, science building replacing the car park, reduced sports field, and a new cafe in the centre.",
    visual: {
      kind: "map",
      title: "University campus: 2005 and present day",
    },
  },
];

const listeningTests = [
  {
    id: "l-2026-campus-service",
    module: "listening",
    title: "Campus service enquiry",
    source: "Official-style simulation",
    period: recentWindow,
    minutes: 30,
    audioMode: "tts",
    transcript:
      "Receptionist: Good morning, Student Services. How can I help? Student: Hi, I want to book a place on the weekend study-skills workshop. Receptionist: Certainly. The workshop is on Saturday the twelfth of September, from nine thirty to three fifteen. It is held in Room B14, in the learning centre. Student: Is there a fee? Receptionist: It is twelve pounds, including lunch. Please bring your student card and a notebook. Student: Who is the tutor? Receptionist: Dr Helen Morris. She will cover note-taking, planning essays and preparing for presentations.",
    questions: [
      { id: "l1", text: "The workshop is on Saturday the ___ of September.", answer: "12th" },
      { id: "l2", text: "The workshop starts at ___.", answer: "9:30" },
      { id: "l3", text: "The room number is ___.", answer: "B14" },
      { id: "l4", text: "The fee is ___ pounds.", answer: "12" },
      { id: "l5", text: "Students should bring a student card and a ___.", answer: "notebook" },
    ],
  },
  {
    id: "l-2026-community-garden",
    module: "listening",
    title: "Community garden plan",
    source: "Official-style simulation",
    period: recentWindow,
    minutes: 30,
    audioMode: "tts",
    transcript:
      "Coordinator: The community garden project will begin in April. Volunteers will meet every Wednesday evening, but the first training session is on Sunday. We will grow vegetables near the north fence, flowers beside the main path, and herbs in raised beds near the cafe. The council has provided tools, but volunteers need to bring gloves. The project aims to reduce food waste, teach children about plants, and create a quieter space for older residents.",
    questions: [
      { id: "l1", text: "The project begins in ___.", answer: "April" },
      { id: "l2", text: "Volunteers meet every ___ evening.", answer: "Wednesday" },
      { id: "l3", text: "Herbs will be grown near the ___.", answer: "cafe" },
      { id: "l4", text: "Volunteers need to bring ___.", answer: "gloves" },
      { id: "l5", text: "One aim is to reduce food ___.", answer: "waste" },
    ],
  },
];
listeningTests.push(...IMPORTED_BANKS.flatMap((bank) => bank.listeningTests || []));

const readingTests = [
  {
    id: "r-2026-urban-heat",
    module: "reading",
    title: "Urban heat and city design",
    source: "Official-style simulation",
    period: recentWindow,
    minutes: 60,
    passage:
      "Cities are often warmer than surrounding rural areas because roads, roofs and pavements absorb heat during the day and release it slowly at night. This phenomenon, known as the urban heat island effect, can increase energy use and place pressure on public health systems during heatwaves. Recent city planning has therefore focused on practical ways to reduce surface temperatures. Trees provide shade and cool the air through evaporation, while lighter-coloured roofs reflect more sunlight. Some cities have also introduced green roofs, which can absorb rainwater and provide habitats for insects. However, experts warn that these measures must be distributed fairly. If cooling projects are concentrated only in wealthy districts, poorer communities may continue to face the highest health risks.",
    questions: [
      { id: "r1", text: "What causes cities to remain warm at night?", answer: "roads, roofs and pavements release heat slowly" },
      { id: "r2", text: "Name one effect of urban heat mentioned in the passage.", answer: "increased energy use" },
      { id: "r3", text: "How do lighter-coloured roofs help?", answer: "they reflect more sunlight" },
      { id: "r4", text: "What can green roofs provide for insects?", answer: "habitats" },
      { id: "r5", text: "What fairness problem do experts mention?", answer: "cooling projects may be concentrated in wealthy districts" },
    ],
  },
  {
    id: "r-2026-remote-work",
    module: "reading",
    title: "Remote work and local economies",
    source: "Official-style simulation",
    period: recentWindow,
    minutes: 60,
    passage:
      "Remote work has changed the economic geography of many countries. When employees no longer need to travel to central offices every day, some move to smaller towns where housing is cheaper. This can bring new customers to local cafes, shops and gyms. At the same time, city-centre businesses that depended on office workers may lose income, especially on Mondays and Fridays. Researchers also note that remote work affects training. Experienced employees may enjoy greater flexibility, but younger workers can miss informal learning that once happened through observation and quick conversations. For this reason, many companies are experimenting with hybrid schedules rather than fully remote systems.",
    questions: [
      { id: "r1", text: "Why do some workers move to smaller towns?", answer: "housing is cheaper" },
      { id: "r2", text: "Name one local business that may gain customers.", answer: "cafes" },
      { id: "r3", text: "Which city businesses may lose income?", answer: "city-centre businesses depending on office workers" },
      { id: "r4", text: "Which group may miss informal learning?", answer: "younger workers" },
      { id: "r5", text: "What type of schedule are many companies trying?", answer: "hybrid schedules" },
    ],
  },
];
readingTests.push(...IMPORTED_BANKS.flatMap((bank) => bank.readingTests || []));

const fallbackSpeakingSets = [
  {
    id: "s-2026-architecture",
    module: "speaking",
    title: "Architecture and buildings",
    source: "Recent reported topic",
    period: recentWindow,
    part1: [
      "Are there many interesting buildings where you live?",
      "What kind of architecture do you like most?",
      "Do you prefer modern buildings or old buildings?",
    ],
    part2:
      "Describe a building that you find interesting. You should say what the building is, where it is, what it is used for, and explain why you find it interesting.",
    part3: [
      "How can architecture affect people's daily lives?",
      "Should governments protect old buildings?",
      "What types of public buildings do cities need most?",
    ],
  },
  {
    id: "s-2026-plan-change",
    module: "speaking",
    title: "A changed plan",
    source: "Recent reported topic",
    period: recentWindow,
    part1: [
      "Do you usually make plans?",
      "What do you do when your plans change?",
      "Do you prefer planning things carefully or being spontaneous?",
    ],
    part2:
      "Describe a plan that you changed recently. You should say what the plan was, why you changed it, what you did instead, and explain how you felt about the change.",
    part3: [
      "Why do people sometimes change their plans?",
      "Do companies need to be flexible with plans?",
      "Is it easier to change plans now than in the past?",
    ],
  },
  {
    id: "s-2026-perfect-job",
    module: "speaking",
    title: "Jobs and work",
    source: "Recent reported topic",
    period: recentWindow,
    part1: [
      "Do you work or study?",
      "What kind of job would you like to do in the future?",
      "What skills are important in your field?",
    ],
    part2:
      "Describe a job that you think would be perfect for you. You should say what the job is, what skills it requires, why you would like it, and explain whether it would be difficult to get.",
    part3: [
      "What should people consider when choosing a job?",
      "Is salary the main reason people choose a job?",
      "How will technology change jobs in the future?",
    ],
  },
  {
    id: "s-2026-history-library",
    module: "speaking",
    title: "History and libraries",
    source: "Recent reported topic",
    period: recentWindow,
    part1: [
      "Did you enjoy learning history at school?",
      "How often do you use a library?",
      "What kinds of books do you like to borrow or read?",
    ],
    part2:
      "Describe a historical period you are interested in. You should say when it was, how you learned about it, what happened during that period, and explain why you find it interesting.",
    part3: [
      "Why is it important to learn history?",
      "Do libraries still matter in the digital age?",
      "How can schools make history lessons more interesting?",
    ],
  },
  {
    id: "s-2026-advertising",
    module: "speaking",
    title: "Advertising and shopping",
    source: "Recent reported topic",
    period: recentWindow,
    part1: [
      "Do you often see advertisements online?",
      "Have you ever bought something because of an advertisement?",
      "What kinds of advertisements do you dislike?",
    ],
    part2:
      "Describe an advertisement you remember well. You should say where you saw it, what it was about, why you remember it, and explain whether it influenced you.",
    part3: [
      "How do advertisements influence young people?",
      "Should advertisements for unhealthy products be restricted?",
      "Why do companies use celebrities in advertising?",
    ],
  },
  {
    id: "s-2026-public-place",
    module: "speaking",
    title: "Public places",
    source: "Recent reported topic",
    period: recentWindow,
    part1: [
      "What public places do you often visit?",
      "Are there enough public facilities in your area?",
      "Do you prefer quiet or busy public places?",
    ],
    part2:
      "Describe a public place that has been improved recently. You should say where it is, what it was like before, what has changed, and explain why the improvement is useful.",
    part3: [
      "What public facilities should governments provide?",
      "How can public spaces help communities?",
      "Should local people be consulted before public places are redesigned?",
    ],
  },
  {
    id: "s-2026-learning-skill",
    module: "speaking",
    title: "Learning a skill",
    source: "Recent reported topic",
    period: recentWindow,
    part1: [
      "What new skill would you like to learn?",
      "Do you prefer learning alone or with other people?",
      "Is it easy for adults to learn new skills?",
    ],
    part2:
      "Describe a skill that took you a long time to learn. You should say what the skill was, how you learned it, why it was difficult, and explain how you felt when you improved.",
    part3: [
      "What skills should children learn at school?",
      "Why do some people give up learning new things?",
      "How has technology changed skill learning?",
    ],
  },
];
writingTasks.push(...IMPORTED_BANKS.flatMap((bank) => bank.writingTasks || []));

function hasAnyAnswer(test) {
  return Array.isArray(test.questions) && test.questions.some((question) => normalizeAnswer(question.answer));
}

function hasCompleteAnswers(test) {
  return Array.isArray(test.questions) && test.questions.length === 40 && test.questions.every((question) => normalizeAnswer(question.answer));
}

function hasQuestionSlots(test) {
  return Array.isArray(test.questions) && test.questions.length === 40;
}

function hasPageImages(test, key) {
  return Array.isArray(test[key]) && test[key].length > 0;
}

function isEnabledCambridgeBook(item) {
  const match = String(item.id || "").match(/^cam(\d+)-/i);
  return !match || Number(match[1]) >= 4;
}

const CONTENT_LIFECYCLE = Object.freeze({
  extracted: "extracted",
  validated: "validated",
  humanReviewed: "human_reviewed",
  active: "active",
  quarantined: "quarantined",
});

function contentChecksum(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function suspiciousOcrTextIssue(value, options = {}) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "missing_text";
  if (/(?:^|\s)\|(?:\s|$)/.test(text)) return "isolated_pipe";
  if (/\b(?:ltled|lntled|Itallowed|Itcaused|cornplete|Wite|Waite|lranslation|carpicces)\b/i.test(text)) return "ocr_character_confusion";
  if (/\b(?:Plays|Collections)\s+\d{2,3}\b/i.test(text) || /\.\s+\d{2,3}$/.test(text)) return "page_marker_pollution";
  if (options.option && /\b(?:a|an|the|of|to|in|on|at|for|from|with|by|and|or|but|that|which|who|when|where|why|how)\.?$/i.test(text)) return "truncated_option";
  if (options.question && /\b(?:intere|thei|expl|wish)\.?$/i.test(text)) return "truncated_question";
  return "";
}

function validObjectiveOption(option) {
  const value = String(option?.value || "").trim().toUpperCase();
  const label = String(option?.label || "").replace(/\s+/g, " ").trim();
  return (/^[A-I]$/.test(value) || ["TRUE", "FALSE", "NOT GIVEN", "YES", "NO"].includes(value))
    && label.length >= 4
    && !suspiciousOcrTextIssue(label, { option: true });
}

function validatedObjectiveOptions(options) {
  const seen = new Set();
  const valid = (Array.isArray(options) ? options : [])
    .map((option) => ({
      value: String(option?.value || "").trim().toUpperCase(),
      label: String(option?.label || "").replace(/\s+/g, " ").trim(),
    }))
    .filter((option) => validObjectiveOption(option) && !seen.has(option.value) && seen.add(option.value));
  return valid.length >= 2 ? valid : [];
}

function objectiveTestQualityIssue(test, moduleName) {
  if (!test || typeof test !== "object") return "invalid_record";
  if (!hasQuestionSlots(test)) return "missing_question_slots";
  if (!hasPageImages(test, moduleName === "listening" ? "questionPageImages" : "readingPageImages")) return "missing_source_pages";
  const duplicateIds = new Set();
  for (const question of test.questions || []) {
    const id = String(question?.id || "").trim();
    if (!id || duplicateIds.has(id)) return "invalid_question_ids";
    duplicateIds.add(id);
    const issue = suspiciousOcrTextIssue(question?.text, { question: true });
    if (issue && !/^Question\s+\d+$/i.test(String(question?.text || ""))) return issue;
  }
  return "";
}

function objectiveContentDescriptor(test, moduleName) {
  const issue = objectiveTestQualityIssue(test, moduleName);
  const payload = {
    module: moduleName,
    id: test?.id || "",
    title: test?.title || "",
    minutes: test?.minutes || 0,
    questionIds: (test?.questions || []).map((question) => String(question?.id || "")),
    pageImages: slimPageImages(moduleName === "listening" ? test?.questionPageImages : test?.readingPageImages),
    audioUrls: moduleName === "listening" ? (test?.audioUrls || []) : [],
  };
  return {
    lifecycle: issue ? CONTENT_LIFECYCLE.quarantined : CONTENT_LIFECYCLE.validated,
    // Structural validation makes a source safe to render beside its original
    // PDF. It is not a substitute for the separate PDF-verbatim human review
    // required before content can be labelled human-reviewed / active.
    publicationStatus: issue ? CONTENT_LIFECYCLE.quarantined : CONTENT_LIFECYCLE.validated,
    humanReviewStatus: "pending",
    issue,
    contentVersion: contentChecksum(payload),
  };
}

function realListeningTests() {
  return IMPORTED_BANKS
    .flatMap((bank) => bank.listeningTests || [])
    .filter((test) => isEnabledCambridgeBook(test) && !objectiveTestQualityIssue(test, "listening"));
}

function realReadingTests() {
  return IMPORTED_BANKS
    .flatMap((bank) => bank.readingTests || [])
    .filter((test) => isEnabledCambridgeBook(test) && !objectiveTestQualityIssue(test, "reading"));
}

function realWritingTasks() {
  return IMPORTED_BANKS
    .flatMap((bank) => bank.writingTasks || [])
    .filter((task) => isEnabledCambridgeBook(task) && hasPageImages(task, "writingPageImages"));
}

function slimPageImages(images) {
  return Array.isArray(images)
    ? images.map((image) => ({ page: image.page, url: image.url })).filter((image) => image.url)
    : [];
}

function slimQuestions(questions, metadata = new Map()) {
  return Array.isArray(questions)
    ? questions.map((question, index) => {
        const number = Number(String(question.id || question.text || index + 1).match(/\d{1,2}/)?.[0] || index + 1);
        const meta = metadata.get(number) || {};
        const suppliedOptions = Array.isArray(question.options) && question.options.length
          ? question.options
          : Array.isArray(meta.options) ? meta.options : [];
        return {
          id: question.id || `q${index + 1}`,
          text: question.text || `Question ${index + 1}`,
          type: question.type || meta.type || "unknown",
          typeLabel: question.typeLabel || meta.typeLabel || "Question",
          questionPage: question.questionPage || meta.questionPage || null,
          // OCR is only a metadata helper. If an option cannot pass structural
          // validation, do not render a potentially truncated choice beside the
          // official PDF page; the client safely falls back to a text response.
          options: validatedObjectiveOptions(suppliedOptions),
          selectionLimit: Number(question.selectionLimit || meta.selectionLimit || 1),
          optionGroupId: String(question.optionGroupId || meta.optionGroupId || ""),
        };
      })
    : [];
}

function contentTopicsForPaper(test, count) {
  const topics = {};
  for (let section = 1; section <= count; section += 1) {
    const entry = OBJECTIVE_SEMANTIC_TOPICS[`${test.id}::section::${section}`];
    if (!entry) continue;
    topics[section] = {
      key: entry.topicKey,
      label: entry.topicLabel,
      emoji: entry.emoji,
      title: entry.topicTitle,
      source: entry.source,
      confidence: entry.confidence,
      schemaVersion: entry.schemaVersion,
    };
  }
  return topics;
}

function parseReadingPaperPages(paper) {
  const pages = new Map();
  for (const match of String(paper || "").matchAll(/--- Page (\d+) ---\n([\s\S]*?)(?=\n--- Page \d+ ---|$)/g)) {
    pages.set(Number(match[1]), match[2]);
  }
  return pages;
}

function readingQuestionHeadingLine(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim());
  return lines.findIndex((line) => /^Questions?\s+\d{1,2}\b/i.test(line));
}

function readingQuestionHeadingOffset(text) {
  const source = String(text || "");
  for (const match of source.matchAll(/Questions?\s+\d{1,2}\s*(?:-|\u2013|\u2014|to|and)\s*\d{1,2}\b/gi)) {
    const trailing = source.slice((match.index || 0) + match[0].length, (match.index || 0) + match[0].length + 80);
    if (/^\s*,?\s*which are based on Reading\s+Passage/i.test(trailing)) continue;
    return match.index || 0;
  }
  return -1;
}

function readingPassageHeadingLine(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim());
  return lines.findIndex((line) => /^READING PASSAGE\s+\d\b/i.test(line));
}

function readingPageRoles(images, paper) {
  const pages = parseReadingPaperPages(paper);
  const passage = [];
  const questions = [];
  for (const image of slimPageImages(images)) {
    const text = pages.get(Number(image.page)) || "";
    const questionLine = readingQuestionHeadingLine(text);
    const questionOffset = questionLine >= 0 ? 0 : readingQuestionHeadingOffset(text);
    const hasQuestions = questionLine >= 0 || questionOffset >= 0;
    const passageLine = readingPassageHeadingLine(text);
    const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    const textBeforeQuestions = questionLine > 0
      ? lines.slice(0, questionLine).join(" ")
      : questionOffset > 0
        ? text.slice(0, questionOffset)
        : "";
    const hasPassage = passageLine >= 0 || !hasQuestions || textBeforeQuestions.length > 500;
    if (hasPassage) passage.push(image);
    if (hasQuestions) questions.push(image);
  }
  return { passage, questions };
}

function objectiveQuestionType(instructions) {
  const text = String(instructions || "").replace(/\s+/g, " ").toLowerCase();
  if (/true\s*\/\s*false\s*\/\s*not given|true if .*false if .*not given/i.test(text)) return ["true_false_not_given", "True / False / Not Given"];
  if (/yes\s*\/\s*no\s*\/\s*not given|yes if .*no if .*not given/i.test(text)) return ["yes_no_not_given", "Yes / No / Not Given"];
  if (/list of headings|choose the correct heading/i.test(text)) return ["matching_headings", "Matching headings"];
  if (/which paragraph contains|match each statement with the correct paragraph|information given in paragraphs/i.test(text)) return ["matching_information", "Matching information"];
  if (/match each statement|match each person|list of people|correct person|correct researcher|correct expert/i.test(text)) return ["matching_features", "Matching features"];
  if (/choose (?:two|three|four|five|six) letters|choose (?:two|three|four|five|six) answers/i.test(text)) return ["multiple_choice_multiple", "Multiple choice (multiple answers)"];
  if (/choose the correct (?:letter|answer)/i.test(text)) return ["multiple_choice", "Multiple choice"];
  if (/complete the form/i.test(text)) return ["form_completion", "Form completion"];
  if (/complete the summary/i.test(text)) return ["summary_completion", "Summary completion"];
  if (/complete the table/i.test(text)) return ["table_completion", "Table completion"];
  if (/complete the notes/i.test(text)) return ["note_completion", "Note completion"];
  if (/complete the sentences/i.test(text)) return ["sentence_completion", "Sentence completion"];
  if (/label the (?:map|plan)/i.test(text)) return ["map_plan_labelling", "Map / plan labelling"];
  if (/answer the questions/i.test(text)) return ["short_answer", "Short answer"];
  if (/complete the (?:flow-chart|flow chart|diagram)/i.test(text)) return ["diagram_completion", "Diagram completion"];
  if (/match each|write the correct letter.*next to questions|which .*? match/i.test(text)) return ["matching", "Matching"];
  return ["unknown", "Question"];
}

function listeningQuestionType(instructions) {
  const text = String(instructions || "").replace(/\s+/g, " ").toLowerCase();
  if (/complete the form/i.test(text)) return ["form_completion", "Form completion"];
  if (/complete the (?:flow-chart|flow chart|diagram)/i.test(text)) return ["diagram_completion", "Diagram completion"];
  if (/label the (?:map|plan)/i.test(text)) return ["map_plan_labelling", "Map / plan labelling"];
  if (/label the diagram/i.test(text)) return ["diagram_completion", "Diagram completion"];
  if (/complete the table/i.test(text)) return ["table_completion", "Table completion"];
  if (/complete the notes/i.test(text)) return ["note_completion", "Note completion"];
  if (/complete the summary/i.test(text)) return ["summary_completion", "Summary completion"];
  if (/complete the sentences/i.test(text)) return ["sentence_completion", "Sentence completion"];
  if (/from the box|next to questions|match each|which .*? match|each of the following/i.test(text)) return ["matching", "Matching"];
  if (/choose (?:two|three|four|five|six) letters|choose (?:two|three|four|five|six) answers/i.test(text)) return ["multiple_choice_multiple", "Multiple choice (multiple answers)"];
  if (/choose the correct (?:letter|answer)/i.test(text)) return ["multiple_choice", "Multiple choice"];
  if (/answer the questions/i.test(text)) return ["short_answer", "Short answer"];
  return ["unknown", "Question"];
}

function listeningTypeConfidence(type) {
  if (["form_completion", "diagram_completion", "map_plan_labelling", "table_completion", "note_completion", "summary_completion", "sentence_completion"].includes(type)) return 4;
  if (["matching", "multiple_choice", "multiple_choice_multiple", "short_answer"].includes(type)) return 3;
  return 0;
}

function objectiveFixedOptions(type) {
  if (type === "true_false_not_given") {
    return ["TRUE", "FALSE", "NOT GIVEN"].map((value) => ({ value, label: value }));
  }
  if (type === "yes_no_not_given") {
    return ["YES", "NO", "NOT GIVEN"].map((value) => ({ value, label: value }));
  }
  return [];
}

function objectiveSelectionLimit(instructions) {
  const words = { two: 2, three: 3, four: 4, five: 5, six: 6 };
  const match = String(instructions || "").match(/choose\s+(two|three|four|five|six|[2-6])\s+(?:letters|answers)/i);
  if (!match) return 1;
  return Number(words[String(match[1]).toLowerCase()] || match[1]) || 1;
}

function objectiveOptionLines(text) {
  const seen = new Set();
  const entries = [];
  for (const rawLine of String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[^A-Za-z0-9]+/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)) {
    const option = rawLine.match(/^([A-I])(?:\s*[.)€©]?\s+)(.{1,220})$/);
    if (option) {
      entries.push({ value: option[1].toUpperCase(), label: option[2].trim() });
      continue;
    }
    const previous = entries.at(-1);
    // PDF extraction commonly wraps a long choice onto the next line. Merge
    // only a lowercase plain continuation, never another heading, question,
    // instruction, option, or page/footer marker. This keeps real wrapped
    // phrases such as "members of the" + "public" while quarantining OCR
    // pollution such as "Collections 82" and "Plays 81 ee".
    if (previous
      && rawLine.length >= 2
      && rawLine.length <= 220
      && /^[a-z]/.test(rawLine)
      && !/^(?:Questions?|Write\b|Choose\b|In boxes\b|\d{1,2}(?:[.)]|\s))/i.test(rawLine)
      && !/^[A-I](?:\s*[.)€©]?\s+)/.test(rawLine)) {
      previous.label = `${previous.label} ${rawLine}`.replace(/\s+/g, " ").trim();
    }
  }
  return entries.filter((option) => option.label && !seen.has(option.value) && seen.add(option.value));
}

function objectiveOptionsByQuestion(instructions, type, start, end) {
  const fixed = objectiveFixedOptions(type);
  if (fixed.length) return new Map(Array.from({ length: end - start + 1 }, (_, index) => [start + index, fixed]));
  const lines = String(instructions || "").split(/\r?\n/);
  const questionLineIndex = new Map();
  for (let number = start; number <= end; number += 1) {
    const pattern = new RegExp(`^\\D*${number}(?:\\s|[.)])`);
    const index = lines.findIndex((line) => pattern.test(line));
    if (index >= 0) questionLineIndex.set(number, index);
  }
  const result = new Map();
  if (type === "multiple_choice") {
    for (let number = start; number <= end; number += 1) {
      const from = questionLineIndex.get(number);
      if (from === undefined) continue;
      const later = [...questionLineIndex.entries()].filter(([candidate, index]) => candidate > number && index > from).sort((a, b) => a[1] - b[1])[0];
      const options = objectiveOptionLines(lines.slice(from + 1, later?.[1] ?? lines.length).join("\n"));
      if (options.length >= 2) result.set(number, options);
    }
    return result;
  }
  if (["multiple_choice_multiple", "matching", "matching_headings", "matching_information", "matching_features", "map_plan_labelling"].includes(type)) {
    const options = objectiveOptionLines(instructions);
    if (options.length >= 2) {
      for (let number = start; number <= end; number += 1) result.set(number, options);
    }
  }
  return result;
}

function enrichObjectiveQuestionMetadata({ type, typeLabel, questionPage, instructions, start, end, number }) {
  const options = objectiveOptionsByQuestion(instructions, type, start, end).get(number)
    || (["unknown", "matching", "matching_headings", "matching_information", "matching_features", "map_plan_labelling"].includes(type)
      ? objectiveOptionLines(instructions)
      : []);
  const selectionLimit = type === "multiple_choice_multiple" ? objectiveSelectionLimit(instructions) : 1;
  return {
    type,
    typeLabel,
    questionPage,
    options,
    selectionLimit,
    optionGroupId: type === "multiple_choice_multiple" ? `q${start}-q${end}` : "",
  };
}

function readingQuestionMetadata(paper) {
  const metadata = new Map();
  for (const [page, text] of parseReadingPaperPages(paper)) {
    const headings = [...String(text).matchAll(/Questions?\s+(\d{1,2})\s*(?:-|\u2013|\u2014|to|and)\s*(\d{1,2})\b/gim)]
      .filter((heading) => {
        const trailing = String(text).slice((heading.index || 0) + heading[0].length, (heading.index || 0) + heading[0].length + 80);
        return !/^\s*,?\s*which are based on Reading\s+Passage/i.test(trailing);
      });
    headings.forEach((heading, index) => {
      const start = Number(heading[1]);
      const end = Number(heading[2]);
      if (start < 1 || end > 40 || end < start) return;
      const nextIndex = headings[index + 1]?.index ?? String(text).length;
      const instructions = String(text).slice(heading.index, Math.min(nextIndex, heading.index + 2600));
      const [type, typeLabel] = objectiveQuestionType(instructions);
      for (let number = start; number <= end; number += 1) {
        metadata.set(number, enrichObjectiveQuestionMetadata({ type, typeLabel, questionPage: page, instructions, start, end, number }));
      }
    });
  }
  return metadata;
}

function listeningQuestionMetadata(paper) {
  const metadata = new Map();
  for (const [page, text] of parseReadingPaperPages(paper)) {
    const headings = [...String(text).matchAll(/Questions?\s+((?:\d\s*){1,2})\s*(?:-|\u2013|\u2014|to|and|\+|\u4e00)\s*((?:\d\s*){1,2})(?=\D|$)/gim)];
    headings.forEach((heading, index) => {
      const start = Number(String(heading[1]).replace(/\s+/g, ""));
      const end = Number(String(heading[2]).replace(/\s+/g, ""));
      if (start < 1 || end > 40 || end < start) return;
      const nextIndex = headings[index + 1]?.index ?? String(text).length;
      const instructions = String(text).slice(heading.index, Math.min(nextIndex, heading.index + 2600));
      const [type, typeLabel] = listeningQuestionType(instructions);
      const confidence = listeningTypeConfidence(type);
      const rangeSize = end - start + 1;
      for (let number = start; number <= end; number += 1) {
        const previous = metadata.get(number);
        const enriched = enrichObjectiveQuestionMetadata({ type, typeLabel, questionPage: page, instructions, start, end, number });
        const preserveTypeForRicherOptions = Boolean(previous && type === "unknown" && previous.type !== "unknown" && (enriched.options?.length || 0) > (previous.options?.length || 0));
        const candidate = preserveTypeForRicherOptions ? { ...previous, options: enriched.options } : enriched;
        const richerOptions = (candidate.options?.length || 0) > (previous?.options?.length || 0);
        if (!previous
          || confidence > previous.confidence
          || (confidence === previous.confidence && rangeSize < previous.rangeSize)
          || richerOptions) {
          metadata.set(number, {
            ...candidate,
            confidence: candidate.confidence ?? confidence,
            rangeSize: candidate.rangeSize ?? rangeSize,
          });
        }
      }
    });
  }
  return metadata;
}

function slimListeningTest(test) {
  const questionMetadata = listeningQuestionMetadata(test.questionPaper);
  const content = objectiveContentDescriptor(test, "listening");
  return {
    id: test.id,
    module: test.module,
    title: test.title,
    source: test.source,
    period: test.period,
    minutes: test.minutes,
    sourceUrl: test.sourceUrl,
    audioUrl: test.audioUrl,
    audioUrls: Array.isArray(test.audioUrls) ? test.audioUrls : [],
    questionPageImages: slimPageImages(test.questionPageImages),
    questions: slimQuestions(test.questions, questionMetadata),
    contentTopics: contentTopicsForPaper(test, 4),
    contentVersion: content.contentVersion,
    contentLifecycle: content.lifecycle,
    humanReviewStatus: content.humanReviewStatus,
  };
}

function slimReadingTest(test) {
  const pageRoles = readingPageRoles(test.readingPageImages, test.readingPaper);
  const questionMetadata = readingQuestionMetadata(test.readingPaper);
  const passageStartPages = Object.fromEntries(readingPassageStartPages(test));
  const content = objectiveContentDescriptor(test, "reading");
  return {
    id: test.id,
    module: test.module,
    title: test.title,
    source: test.source,
    period: test.period,
    minutes: test.minutes,
    sourceUrl: test.sourceUrl,
    analysisUrl: test.analysisUrl,
    readingPageImages: slimPageImages(test.readingPageImages),
    readingPassagePageImages: pageRoles.passage,
    readingQuestionPageImages: pageRoles.questions,
    readingPassageStartPages: passageStartPages,
    questions: slimQuestions(test.questions, questionMetadata),
    contentTopics: contentTopicsForPaper(test, 3),
    contentVersion: content.contentVersion,
    contentLifecycle: content.lifecycle,
    humanReviewStatus: content.humanReviewStatus,
  };
}

function readingPassageNumber(questionNumber) {
  const number = Number(questionNumber || 0);
  if (number >= 1 && number <= 13) return 1;
  if (number >= 14 && number <= 26) return 2;
  if (number >= 27 && number <= 40) return 3;
  return 0;
}

function readingPassageStartPages(test) {
  const images = slimPageImages(test?.readingPageImages).sort((a, b) => Number(a.page) - Number(b.page));
  const pages = parseReadingPaperPages(test?.readingPaper);
  const starts = new Map();
  for (const image of images) {
    const text = pages.get(Number(image.page)) || "";
    const passage = Number(text.match(/^\s*READING PASSAGE\s+([123])\b/im)?.[1] || 0);
    if (passage && !starts.has(passage)) starts.set(passage, Number(image.page));
  }
  if (images.length && !starts.has(1)) starts.set(1, Number(images[0].page));
  return starts;
}

function readReadingOcrPageCache() {
  if (readingOcrPageCache) return readingOcrPageCache;
  try {
    const parsed = JSON.parse(fs.readFileSync(READING_OCR_CACHE_PATH, "utf8"));
    readingOcrPageCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    readingOcrPageCache = {};
  }
  return readingOcrPageCache;
}

function writeReadingOcrPageCache() {
  fs.mkdirSync(path.dirname(READING_OCR_CACHE_PATH), { recursive: true });
  const tempPath = `${READING_OCR_CACHE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(readReadingOcrPageCache(), null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, READING_OCR_CACHE_PATH);
}

function cleanReadingOcrText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function recognizeReadingPage(testId, image) {
  const page = Number(image?.page || 0);
  const cacheKey = `${testId}:page-${page}`;
  const cache = readReadingOcrPageCache();
  if (cache[cacheKey]?.text) return cache[cacheKey].text;
  if (readingOcrInFlight.has(cacheKey)) return readingOcrInFlight.get(cacheKey);
  const job = (async () => {
    const filePath = listeningPageUrlToPath(image?.url || "");
    if (!filePath || !fs.existsSync(filePath)) return "";
    const worker = await createWorker("eng");
    try {
      const result = await worker.recognize(fs.readFileSync(filePath));
      const text = cleanReadingOcrText(result?.data?.text || "");
      if (text) {
        cache[cacheKey] = { page, text, updatedAt: new Date().toISOString() };
        writeReadingOcrPageCache();
      }
      return text;
    } finally {
      await worker.terminate();
    }
  })();
  readingOcrInFlight.set(cacheKey, job);
  try {
    return await job;
  } finally {
    readingOcrInFlight.delete(cacheKey);
  }
}

function extractReadingQuestionText(pageText, requestedQuestion) {
  const questionNumber = Number(requestedQuestion || 0);
  if (!questionNumber) return "";
  const lines = String(pageText || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim());
  const numberedLine = /^\s*(?:Question\s+)?(\d{1,2})(?:\s*[.)°])?\s*(?![-–—]|(?:to|and)\b)(\S.*)$/i;
  const start = lines.findIndex((line) => Number(line.match(numberedLine)?.[1] || 0) === questionNumber);
  if (start >= 0) {
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
      const nextNumber = Number(lines[index].match(numberedLine)?.[1] || 0);
      if (nextNumber === questionNumber + 1) {
        end = index;
        break;
      }
    }
    const selected = lines.slice(start, end);
    const firstLine = String(selected[0]?.match(numberedLine)?.[2] || "").trim();
    return [firstLine, ...selected.slice(1)]
      .filter(Boolean)
      .filter((line, index, chosen) => index < chosen.length - 1 || !/^\d{1,3}$/.test(line))
      .join(" ")
      .slice(0, 2000)
      .trim();
  }

  const inlineToken = new RegExp(`(?:^|\\D)${questionNumber}(?!\\d)`);
  const nextInlineToken = new RegExp(`(?:^|\\D)${questionNumber + 1}(?!\\d)`);
  const isInstructionLine = (line) => /^(?:Questions?|In boxes|Write\b|Reading Passage)\b/i.test(line)
    || /^\d{1,3}$/.test(line);
  const inlineStart = lines.findIndex((line) => !isInstructionLine(line) && inlineToken.test(line));
  if (inlineStart < 0) return "";
  const selected = [lines[inlineStart]];
  for (let index = inlineStart + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || isInstructionLine(line) || nextInlineToken.test(line) || /^Questions?\s+\d/i.test(line)) break;
    selected.push(line);
  }
  const sharedOptions = lines.filter((line) => /^[A-J](?:\s|[.)])/.test(line));
  if (sharedOptions.length && !selected.some((line) => /^[A-J](?:\s|[.)])/.test(line))) {
    selected.push(...sharedOptions);
  }
  return selected
    .filter(Boolean)
    .join(" ")
    .slice(0, 2000)
    .trim();
}

async function readingContextPayload(id, requestedQuestion = 0) {
  const test = realReadingTests().find((item) => String(item.id || "") === String(id || ""));
  if (!test) return null;
  const paperText = String(test.readingPaper || "").trim();
  const questionNumber = Math.max(0, Math.min(40, Number(requestedQuestion || 0)));
  if (!questionNumber) {
    return {
      id: test.id,
      title: test.title || "",
      source: test.source || "",
      period: test.period || "",
      evidenceAvailable: Boolean(paperText),
      paperText,
    };
  }

  const passage = readingPassageNumber(questionNumber);
  const starts = readingPassageStartPages(test);
  const passageStartPage = starts.get(passage) || null;
  const nextPassageStart = starts.get(passage + 1) || Number.POSITIVE_INFINITY;
  const pageRoles = readingPageRoles(test.readingPageImages, test.readingPaper);
  const passageImages = pageRoles.passage.filter((image) => {
    const page = Number(image.page);
    return page >= passageStartPage && page < nextPassageStart;
  });
  const questionMetadata = readingQuestionMetadata(test.readingPaper);
  const question = slimQuestions(test.questions, questionMetadata)
    .find((item, index) => Number(String(item.id || index + 1).match(/\d{1,2}/)?.[0] || index + 1) === questionNumber);
  const questionPage = Number(question?.questionPage || 0) || null;
  const paperPages = parseReadingPaperPages(test.readingPaper);
  const passageChunks = [];

  for (const image of passageImages) {
    const page = Number(image.page);
    const cachedText = String(paperPages.get(page) || "").trim();
    passageChunks.push({ page, text: cachedText });
  }

  const expectedAnswer = String(question?.answer || "").trim();
  const initialPassageText = passageChunks.map((item) => item.text).join("\n\n");
  const needsVerbatimEvidence = readingQuestionNeedsVerbatimEvidence({
    expectedAnswer,
    type: question?.type,
    typeLabel: question?.typeLabel,
  });
  const needsFreshOcr = !initialPassageText
    || (needsVerbatimEvidence && !readingQuestionHasVerbatimEvidence({ expectedAnswer }, initialPassageText));
  if (needsFreshOcr) {
    for (const image of passageImages) {
      const chunk = passageChunks.find((item) => item.page === Number(image.page));
      if (chunk?.text && readingQuestionHasVerbatimEvidence({ expectedAnswer }, chunk.text)) continue;
      const recognized = await recognizeReadingPage(test.id, image);
      if (recognized && chunk) chunk.text = recognized;
    }
  }

  const passageText = passageChunks
    .filter((item) => item.text)
    .map((item) => `--- Page ${item.page} ---\n${item.text}`)
    .join("\n\n");
  let questionText = questionPage ? String(paperPages.get(questionPage) || "").trim() : "";
  if (!questionText && questionPage) {
    const questionImage = slimPageImages(test.readingPageImages).find((image) => Number(image.page) === questionPage);
    if (questionImage) questionText = await recognizeReadingPage(test.id, questionImage);
  }
  const focusedQuestionText = extractReadingQuestionText(questionText, questionNumber);
  const scopedPaperText = [
    passageText,
    questionText ? `--- Question Page ${questionPage} ---\n${questionText}` : "",
  ].filter(Boolean).join("\n\n");
  return {
    id: test.id,
    title: test.title || "",
    source: test.source || "",
    period: test.period || "",
    question: questionNumber,
    passage,
    passageStartPage,
    passagePages: passageChunks.map((item) => item.page),
    questionPage,
    questionText: focusedQuestionText,
    evidenceAvailable: Boolean(passageText),
    paperText: scopedPaperText,
  };
}

function slimWritingTask(task) {
  return {
    id: task.id,
    module: task.module,
    type: task.type,
    title: task.title,
    source: task.source,
    period: task.period,
    minutes: task.minutes,
    sourceUrl: task.sourceUrl,
    writingPageImages: slimPageImages(task.writingPageImages),
    prompt: task.prompt || "",
    data: task.data || "",
    visual: task.visual || null,
  };
}

function tasksPayload() {
  const coachAiEnabled = Boolean(AI_GATEWAY_API_KEY || COACH_AI_API_KEY || OPENAI_API_KEY);
  const coachProvider = AI_GATEWAY_API_KEY
    ? { name: "IELTSist AI Gateway", model: AI_GATEWAY_MODEL, baseUrl: AI_GATEWAY_BASE_URL, reasoningEffort: AI_GATEWAY_REASONING_EFFORT, agentEnabled: true }
    : COACH_AI_API_KEY
      ? { name: "Coach provider", model: COACH_AI_MODEL, baseUrl: COACH_AI_BASE_URL, reasoningEffort: null, agentEnabled: false }
      : OPENAI_API_KEY
        ? { name: "Legacy provider", model: MODEL, baseUrl: OPENAI_BASE_URL, reasoningEffort: null, agentEnabled: false }
        : null;
  return {
    aiEnabled: coachAiEnabled,
    model: coachProvider?.model || null,
    aiBaseUrl: coachProvider?.baseUrl || null,
    coachModel: coachProvider?.model || null,
    coachBaseUrl: coachProvider?.baseUrl || null,
    coachReasoningEffort: coachProvider?.reasoningEffort || null,
    coachAgentEnabled: Boolean(coachProvider?.agentEnabled),
    coachProvider: coachProvider?.name || null,
    writingAiEnabled: Boolean(WRITING_AI_API_KEY),
    writingModel: WRITING_AI_API_KEY ? WRITING_AI_MODEL : null,
    writingAiBaseUrl: WRITING_AI_API_KEY ? WRITING_AI_BASE_URL : null,
    voiceChatUrl: VOICE_CHAT_URL,
    ttsEnabled: Boolean(FISH_API_KEY),
    recentWindow,
    writingTasks: realWritingTasks().map(slimWritingTask),
    listeningTests: realListeningTests().map(slimListeningTest),
    readingTests: realReadingTests().map(slimReadingTest),
    speakingSets: getSpeakingSets(),
    officialSources,
  };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const clean = trimmed.replace(/^\uFEFF/, "");
    const match = clean.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1].replace(/^\uFEFF/, "");
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Explicit process configuration must win over local defaults. This keeps
    // production, test and one-off provider overrides from being silently replaced.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function loadQuestionBank(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`Failed to load question bank ${filePath}: ${error.message}`);
    return {};
  }
}

function requiredSemanticTopicIds() {
  const ids = [];
  for (let book = 4; book <= 21; book += 1) {
    for (let test = 1; test <= 4; test += 1) {
      for (let section = 1; section <= 4; section += 1) ids.push(`cam${book}-l-test${test}::section::${section}`);
      for (let passage = 1; passage <= 3; passage += 1) ids.push(`cam${book}-r-test${test}::section::${passage}`);
    }
  }
  return ids;
}

function loadSemanticTopicCatalog(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Semantic topic catalog is missing: ${filePath}`);
  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Semantic topic catalog is not valid JSON (${filePath}): ${error.message}`);
  }
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error(`Semantic topic catalog must be a JSON object: ${filePath}`);
  }

  const requiredIds = requiredSemanticTopicIds();
  const actualIds = Object.keys(catalog);
  if (actualIds.length !== requiredIds.length) {
    throw new Error(`Semantic topic catalog must contain exactly 504 entries (288 Listening + 216 Reading); found ${actualIds.length}: ${filePath}`);
  }
  const actualIdSet = new Set(actualIds);
  const missingIds = requiredIds.filter((id) => !actualIdSet.has(id));
  const requiredIdSet = new Set(requiredIds);
  const unexpectedIds = actualIds.filter((id) => !requiredIdSet.has(id));
  if (missingIds.length || unexpectedIds.length) {
    throw new Error(`Semantic topic catalog canonical IDs are invalid; missing: ${missingIds.join(", ") || "none"}; unexpected: ${unexpectedIds.join(", ") || "none"}`);
  }

  const allowedTopicKeys = new Set([
    "work", "travel", "education", "environment", "health", "science", "history",
    "culture", "society", "business", "transport", "architecture", "psychology", "food",
  ]);
  const requiredEntryKeys = ["confidence", "emoji", "schemaVersion", "source", "topicKey", "topicLabel", "topicTitle"];
  for (const id of requiredIds) {
    const entry = catalog[id];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Semantic topic catalog entry ${id} must be an object`);
    const entryKeys = Object.keys(entry).sort();
    if (entryKeys.length !== requiredEntryKeys.length || entryKeys.some((key, index) => key !== requiredEntryKeys[index])) {
      throw new Error(`Semantic topic catalog entry ${id} must have exactly: ${requiredEntryKeys.join(", ")}`);
    }
    for (const key of ["emoji", "source", "topicKey", "topicLabel", "topicTitle"]) {
      if (typeof entry[key] !== "string" || !entry[key].trim()) throw new Error(`Semantic topic catalog entry ${id}.${key} must be a non-empty string`);
    }
    if (!allowedTopicKeys.has(entry.topicKey)) throw new Error(`Semantic topic catalog entry ${id}.topicKey is invalid: ${entry.topicKey}`);
    if (entry.schemaVersion !== 1) throw new Error(`Semantic topic catalog entry ${id}.schemaVersion must be 1`);
    if (!Number.isFinite(entry.confidence) || entry.confidence < 0 || entry.confidence > 1) {
      throw new Error(`Semantic topic catalog entry ${id}.confidence must be a number from 0 to 1`);
    }
  }
  return catalog;
}

function asrCacheKey(id, section) {
  return `${String(id || "").trim()}::${String(section || "").trim()}`;
}

function loadListeningAsrCache() {
  if (!fs.existsSync(LISTENING_ASR_CACHE_PATH)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(LISTENING_ASR_CACHE_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn(`Failed to load listening ASR cache: ${error.message}`);
    return {};
  }
}

function saveListeningAsrCache(cache) {
  fs.mkdirSync(path.dirname(LISTENING_ASR_CACHE_PATH), { recursive: true });
  const tempPath = `${LISTENING_ASR_CACHE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), "utf8");
  fs.renameSync(tempPath, LISTENING_ASR_CACHE_PATH);
}

function readListeningAsrCache(id, section) {
  const cache = loadListeningAsrCache();
  const item = cache[asrCacheKey(id, section)];
  if (!item?.text) return null;
  if (!isUsableListeningAsrText(item.text)) return null;
  return item;
}

function isUsableListeningAsrText(text) {
  const clean = cleanListeningScriptText(text);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 80) return false;
  return true;
}

function writeListeningAsrCache({ id, section, text, source = LISTENING_ASR_CACHE_SOURCE }) {
  const cleanText = cleanListeningScriptText(text);
  if (!id || !section || cleanText.length < 8) return null;
  if (!isUsableListeningAsrText(cleanText)) return null;
  const cache = loadListeningAsrCache();
  const key = asrCacheKey(id, section);
  const existing = cache[key];
  if (existing?.source === LISTENING_ASR_CACHE_SOURCE && existing.text && existing.text.length >= cleanText.length) return existing;
  const item = {
    id,
    section: String(section),
    text: cleanText,
    source: source || LISTENING_ASR_CACHE_SOURCE,
    mode: "live-vad",
    version: 1,
    timedWords: buildListeningTimedWords(cleanText),
    updatedAt: new Date().toISOString(),
  };
  cache[key] = item;
  saveListeningAsrCache(cache);
  return item;
}

function buildListeningTimedWords(text) {
  const words = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.map((word, index) => ({
    word,
    index,
    progress: words.length > 1 ? index / (words.length - 1) : 0,
  }));
}

function listeningIdParts(id) {
  const match = String(id || "").match(/^cam(\d+)-(?:l-)?test(\d+)/i);
  if (!match) return null;
  return { book: Number(match[1]), test: Number(match[2]) };
}

function cleanListeningScriptText(text) {
  return String(text || "")
    .replace(/\u000c/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function trimListeningOcrScope(text) {
  const clean = cleanListeningScriptText(text);
  const readingStart = clean.search(/\n\s*(?:---\s*Page\s+\d+\s*---\s*\n)?\s*(?:Test\s+\d+\s*\n)?\s*READING\b/i);
  const passageStart = clean.search(/\n\s*READING\s+PASSAGE\s+1\b/i);
  const stops = [readingStart, passageStart].filter((index) => index > 0);
  return stops.length ? cleanListeningScriptText(clean.slice(0, Math.min(...stops))) : clean;
}

function splitListeningOcrSections(text) {
  const clean = trimListeningOcrScope(text);
  const sections = [];
  const sectionPattern = /\bSECTION\s+([1-4])\b([\s\S]*?)(?=\bSECTION\s+[1-4]\b|$)/gi;
  let sectionMatch;
  while ((sectionMatch = sectionPattern.exec(clean))) {
    const part = Number(sectionMatch[1]);
    const partText = cleanListeningScriptText(sectionMatch[2]);
    if (partText && partText.length > 40) {
      sections.push({
        part,
        title: `Section ${part}`,
        text: partText,
      });
    }
  }
  return sections.length ? sections : clean ? [{ part: null, title: "OCR text", text: clean }] : [];
}

function listeningSourceCandidates(test) {
  const candidates = [];
  const explicitSource = String(test?.questionPaperSource || test?.transcriptSource || test?.scriptSource || "").trim();
  if (explicitSource) {
    const resolved = path.isAbsolute(explicitSource) ? path.normalize(explicitSource) : path.resolve(__dirname, explicitSource);
    if (fs.existsSync(resolved)) {
      candidates.push({ path: resolved, kind: /(?:^|[-\\\/])cam\d+-pages\.txt$/i.test(resolved) ? "book-pages" : "paper" });
    }
  }
  const parts = listeningIdParts(test?.id || "");
  if (!parts) return candidates;
  const files = [
    { path: path.join(__dirname, "data", "ocr-listening", `cam${parts.book}-test${parts.test}.txt`), kind: "paper" },
    { path: path.join(__dirname, "data", "extracted-text", `cam${parts.book}-pages.txt`), kind: "book-pages" },
    { path: path.join(__dirname, "data", "ocr-cambridge-16-21", `cam${parts.book}-pages.txt`), kind: "book-pages" },
    { path: path.join(__dirname, "data", "extracted-text", `cam${parts.book}.txt`), kind: "paper" },
  ];
  for (const file of files) {
    if (fs.existsSync(file.path) && !candidates.some((item) => item.path === file.path)) {
      candidates.push(file);
    }
  }
  return candidates;
}

function extractListeningAudioscriptSections(text, testNumber) {
  const clean = cleanListeningScriptText(text);
  const nextTest = Number(testNumber) + 1;
  const testPattern = new RegExp(
    String.raw`\bTEST\s+${Number(testNumber)}\b([\s\S]*?)(?=\bTEST\s+${nextTest}\b|Listening and Reading answer keys\b|Sample Writing answers\b|Sample answer sheets\b|Acknowledgements\b|$)`,
    "i",
  );
  const audioscriptMatches = [...clean.matchAll(/\bAudioscripts\b/gi)];
  for (const audioscriptMatch of audioscriptMatches) {
    const source = clean.slice(audioscriptMatch.index);
    const match = testPattern.exec(source);
    if (!match?.[1]) continue;
    if (match.index > 500) continue;
    const block = cleanListeningScriptText(match[1]);
    const sections = [];
    const partPattern = /\b(?:PART|SECTION)\s+([1-4])\b([\s\S]*?)(?=\b(?:PART|SECTION)\s+[1-4]\b|$)/gi;
    let partMatch;
    while ((partMatch = partPattern.exec(block))) {
      const part = Number(partMatch[1]);
      const partText = cleanListeningScriptText(partMatch[2]);
      if (partText && partText.length > 80) {
        sections.push({
          part,
          title: `Part ${part}`,
          text: partText,
        });
      }
    }
    if (sections.length) return sections;
    if (block.length > 500) {
      return [{ part: null, title: "Audioscript", text: block }];
    }
  }
  return [];
}

function collectStringValues(value, output = []) {
  if (!value) return output;
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStringValues(item, output));
    return output;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectStringValues(item, output));
  }
  return output;
}

function findListeningAudioscriptInBanks(test) {
  const parts = listeningIdParts(test?.id || "");
  if (!parts) return null;
  if (parts.book !== 15) return null;
  for (const bank of IMPORTED_BANKS) {
    const strings = collectStringValues(bank);
    for (const text of strings) {
      if (!/\bAudioscripts\b/i.test(text)) continue;
      const sections = extractListeningAudioscriptSections(text, parts.test);
      if (sections.length) {
        return {
          available: true,
          mode: "audioscript",
          source: `Cambridge ${parts.book} bank text`,
          text: sections.map((section) => `${section.title}\n${section.text}`).join("\n\n"),
          sections,
        };
      }
    }
  }
  return null;
}

function listeningPageUrlToPath(pageUrl) {
  try {
    const pathname = decodeURIComponent(new URL(pageUrl, "http://localhost").pathname || "");
    const resolved = path.resolve(PUBLIC_DIR, `.${pathname}`);
    if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) return "";
    return resolved;
  } catch {
    return "";
  }
}

async function recognizeListeningPages(pageImageUrls = []) {
  const urls = Array.isArray(pageImageUrls) ? pageImageUrls.filter(Boolean).slice(0, 10) : [];
  if (!urls.length) return "";
  const worker = await createWorker("eng");
  try {
    const chunks = [];
    for (const url of urls) {
      const filePath = listeningPageUrlToPath(url);
      if (!filePath || !fs.existsSync(filePath)) continue;
      const result = await worker.recognize(fs.readFileSync(filePath));
      const text = cleanListeningScriptText(result?.data?.text || "");
      if (text) chunks.push(text);
    }
    return cleanListeningScriptText(chunks.join("\n\n"));
  } finally {
    await worker.terminate();
  }
}

async function resolveListeningScripts(test, pageImageUrls = [], options = {}) {
  const allowOcr = options.allowOcr !== false;
  const testId = String(test?.id || "");
  const pageKey = Array.isArray(pageImageUrls) ? pageImageUrls.filter(Boolean).join("|") : "";
  const cacheKey = `${testId}|${allowOcr ? "ocr" : "no-ocr"}|${pageKey}`;
  const cached = listeningScriptCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < LISTENING_SCRIPT_CACHE_TTL_MS) {
    return cached.value;
  }

  const parts = listeningIdParts(testId);
  const candidates = listeningSourceCandidates(test);
  for (const candidate of candidates) {
    if (candidate.kind !== "book-pages") continue;
    const rawText = cleanListeningScriptText(fs.readFileSync(candidate.path, "utf8"));
    if (!rawText) continue;
    if (parts) {
      const sections = extractListeningAudioscriptSections(rawText, parts.test);
      if (sections.length) {
        const value = {
          available: true,
          mode: "audioscript",
          source: path.relative(__dirname, candidate.path),
          text: sections.map((section) => `${section.title}\n${section.text}`).join("\n\n"),
          sections,
        };
        listeningScriptCache.set(cacheKey, { createdAt: Date.now(), value });
        return value;
      }
    }
  }

  const bankAudioscript = findListeningAudioscriptInBanks(test);
  if (bankAudioscript) {
    listeningScriptCache.set(cacheKey, { createdAt: Date.now(), value: bankAudioscript });
    return bankAudioscript;
  }

  if (allowOcr) {
    for (const candidate of candidates) {
      if (candidate.kind === "book-pages") continue;
      const rawText = trimListeningOcrScope(fs.readFileSync(candidate.path, "utf8"));
      if (!rawText) continue;
      const sections = splitListeningOcrSections(rawText);
      const value = {
        available: true,
        mode: "ocr",
        source: path.relative(__dirname, candidate.path),
        text: rawText,
        sections,
      };
      listeningScriptCache.set(cacheKey, { createdAt: Date.now(), value });
      return value;
    }
  }

  const ocrText = allowOcr ? trimListeningOcrScope(await recognizeListeningPages(pageImageUrls)) : "";
  const ocrSections = splitListeningOcrSections(ocrText);
  const value = ocrText
    ? {
        available: true,
        mode: "ocr",
        source: "page OCR",
        text: ocrText,
        sections: ocrSections,
      }
    : {
        available: false,
        mode: "missing",
        source: allowOcr ? "" : "ocr-disabled",
        text: "",
        sections: [],
      };
  listeningScriptCache.set(cacheKey, { createdAt: Date.now(), value });
  return value;
}

const SPEAKING_OCR_CORRECTIONS = Object.freeze({
  // Cambridge 21 Test 3's source image is valid, but its OCR included the
  // cue-card note panel in the prompt. Keep the imported source and image,
  // while showing the paper wording rather than the corrupted overlay.
  "cam21-s-test3": {
    title: "Interesting garden or park",
    part2: [
      "Describe an interesting garden or park.",
      "You should say:",
      "where this garden or park is",
      "how big it is",
      "what you saw in this garden or park",
      "and explain why you think this garden or park is interesting.",
    ].join("\n"),
  },
});

function correctedSpeakingSet(set) {
  if (!set || typeof set !== "object") return null;
  const correction = SPEAKING_OCR_CORRECTIONS[String(set.id || "")] || null;
  return correction ? { ...set, ...correction } : { ...set };
}

function speakingSetQualityIssue(set) {
  const title = String(set?.title || "").replace(/\s+/g, " ").trim();
  const part1 = Array.isArray(set?.part1) ? set.part1.map((value) => String(value || "").trim()).filter(Boolean) : [];
  const rawPart2 = String(set?.part2 || "").replace(/\r\n?/g, "\n").trim();
  const part2 = rawPart2.replace(/\s+/g, " ").trim();
  const part3 = Array.isArray(set?.part3) ? set.part3.map((value) => String(value || "").trim()).filter(Boolean) : [];
  if (title.length < 8 || part1.length < 2 || part2.length < 60 || part3.length < 2) return "incomplete";
  if (!/^(describe|talk about|tell me about)\b/i.test(part2) || !/you should say:/i.test(part2)) return "invalid_cue_card";
  if (/\bwhat\s+you should say:\s*(?:wish|when|what)\b/i.test(part2)
    || /\b(?:intere|thei|expl)\b/i.test(part2)
    || /\bdescribe\b[^.!?\n]{0,180}\bwhat\s+you should say:/i.test(part2)) return "truncated_cue_card";
  const cueLines = rawPart2.split("\n").map((line) => line.trim()).filter(Boolean);
  const cueIndex = cueLines.findIndex((line) => /^you should say:/i.test(line));
  if (cueIndex < 1) return "invalid_cue_card_structure";
  const cueTitle = cueLines.slice(0, cueIndex).join(" ").replace(/\s+/g, " ").trim();
  const cueBullets = cueLines.slice(cueIndex + 1);
  if (!/[.!?]$/.test(cueTitle)
    || /\b(?:which|who|when|where|why|how|that|to|for|have|wish|minutes)\.?$/i.test(cueTitle)) {
    return "truncated_cue_card_title";
  }
  if (cueBullets.length < 3) return "incomplete_cue_card_bullets";
  if (cueBullets.some((line) => {
    const words = line.replace(/[^\p{L}\p{N}'’-]+/gu, " ").trim().split(/\s+/).filter(Boolean);
    return words.length < 3
      || line.length < 8
      || /\b(?:what you(?:'|')?re going to|you(?:'|')?re going to|minutes\.?\s*you|make some notes|what vor|you wish|a(?:ie|y)\b|ee\b|fe\b)\b/i.test(line);
  })) {
    return "truncated_cue_card_bullet";
  }
  const finalBullet = cueBullets.at(-1) || "";
  if (!/^and explain\b/i.test(finalBullet) || !/[.!?]$/.test(finalBullet) || finalBullet.split(/\s+/).length < 6) {
    return "incomplete_cue_card_explanation";
  }
  if (/\b(?:what you(?:'|')?re going to|you(?:'|')?re going to|notes to|for 1 to)\b/i.test(part2)) return "ocr_overlay";
  const questionCount = [...part1, ...part3].filter((question) => /\?\s*$/.test(question)).length;
  if (questionCount < Math.max(3, Math.floor((part1.length + part3.length) * 0.7))) return "truncated_questions";
  return "";
}

function speakingContentDescriptor(set) {
  const issue = speakingSetQualityIssue(set);
  const payload = {
    id: set?.id || "",
    title: set?.title || "",
    part1: set?.part1 || [],
    part2: set?.part2 || "",
    part3: set?.part3 || [],
    images: slimPageImages(set?.speakingPageImages),
  };
  return {
    lifecycle: issue ? CONTENT_LIFECYCLE.quarantined : CONTENT_LIFECYCLE.validated,
    publicationStatus: issue ? CONTENT_LIFECYCLE.quarantined : CONTENT_LIFECYCLE.validated,
    humanReviewStatus: "pending",
    issue,
    contentVersion: contentChecksum(payload),
  };
}

function getSpeakingSets() {
  const bank = loadQuestionBank(SPEAKING_BANK_PATH);
  const sets = Array.isArray(bank.speakingSets) ? bank.speakingSets : [];
  const visibleSets = sets
    .map(correctedSpeakingSet)
    .filter((set) => isEnabledCambridgeBook(set) && hasPageImages(set, "speakingPageImages") && !speakingSetQualityIssue(set))
    .map((set) => {
      const content = speakingContentDescriptor(set);
      return {
        ...set,
        contentVersion: content.contentVersion,
        contentLifecycle: content.lifecycle,
        humanReviewStatus: content.humanReviewStatus,
      };
    });
  return visibleSets.length
    ? visibleSets
    : fallbackSpeakingSets;
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(value));
}

function cleanupReportDownloads() {
  const now = Date.now();
  for (const [id, report] of reportDownloads.entries()) {
    if (!report?.expiresAt || report.expiresAt <= now) reportDownloads.delete(id);
  }
}

function safePdfFileName(fileName) {
  const cleaned = path.basename(String(fileName || "ielts-report.pdf"))
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned || "ielts-report"}.pdf`;
}

function pdfDataUrlToBuffer(pdfDataUrl) {
  const match = String(pdfDataUrl || "").match(/^data:application\/pdf;base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) return null;
  return Buffer.from(match[1].replace(/\s+/g, ""), "base64");
}

function registerPdfDownload(pdfDataUrl, fileName) {
  const buffer = pdfDataUrlToBuffer(pdfDataUrl);
  if (!buffer?.length) return "";
  cleanupReportDownloads();
  const id = crypto.randomUUID();
  reportDownloads.set(id, {
    buffer,
    fileName: safePdfFileName(fileName),
    createdAt: Date.now(),
    expiresAt: Date.now() + REPORT_DOWNLOAD_TTL_MS,
  });
  return `/api/report/pdf/${encodeURIComponent(id)}`;
}

function addPdfDownloadUrl(result, fallbackName) {
  if (!result?.pdfDataUrl) return result;
  const pdfFileName = result.pdfFileName || fallbackName || "ielts-report.pdf";
  return {
    ...result,
    pdfFileName,
    pdfUrl: registerPdfDownload(result.pdfDataUrl, pdfFileName),
  };
}

function handleReportPdfDownload(req, res) {
  cleanupReportDownloads();
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const id = decodeURIComponent(url.pathname.replace(/^\/api\/report\/pdf\//, ""));
  const report = reportDownloads.get(id);
  if (!report) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("PDF report expired. Please generate the report again.");
    return;
  }
  res.writeHead(200, {
    "content-type": "application/pdf",
    "content-length": report.buffer.length,
    "content-disposition": `inline; filename="${report.fileName}"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(report.buffer);
}

function cleanupRecordingDownloads() {
  const now = Date.now();
  for (const [id, recording] of recordingDownloads.entries()) {
    if (!recording?.expiresAt || recording.expiresAt <= now) recordingDownloads.delete(id);
  }
}

function audioExtensionForMime(mime, fallback = "webm") {
  const clean = String(mime || "").toLowerCase();
  if (clean.includes("mpeg") || clean.includes("mp3")) return "mp3";
  if (clean.includes("mp4")) return "mp4";
  if (clean.includes("ogg")) return "ogg";
  if (clean.includes("wav")) return "wav";
  if (clean.includes("webm")) return "webm";
  return fallback;
}

function safeAudioFileName(fileName, mime) {
  const ext = audioExtensionForMime(mime, "mp3");
  const cleaned = path.basename(String(fileName || `ielts-speaking-recording.${ext}`))
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /\.(?:mp3|webm|mp4|ogg|wav)$/i.test(cleaned)
    ? cleaned
    : `${cleaned || "ielts-speaking-recording"}.${ext}`;
}

function registerRecordingDownload(buffer, fileName, mime) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return "";
  cleanupRecordingDownloads();
  const id = crypto.randomUUID();
  recordingDownloads.set(id, {
    buffer,
    fileName: safeAudioFileName(fileName, mime),
    mime: String(mime || "application/octet-stream"),
    createdAt: Date.now(),
    expiresAt: Date.now() + RECORDING_DOWNLOAD_TTL_MS,
  });
  return `/api/speaking/recording-download/${encodeURIComponent(id)}`;
}

function handleSpeakingRecordingDownload(req, res) {
  cleanupRecordingDownloads();
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const id = decodeURIComponent(url.pathname.replace(/^\/api\/speaking\/recording-download\//, ""));
  const recording = recordingDownloads.get(id);
  if (!recording) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("Speaking recording expired. Please finish the speaking test again.");
    return;
  }
  res.writeHead(200, {
    "content-type": recording.mime || "application/octet-stream",
    "content-length": recording.buffer.length,
    "content-disposition": `attachment; filename="${recording.fileName}"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(recording.buffer);
}

function sendCompressedJson(req, res, status, value, cacheControl = "no-store") {
  const json = JSON.stringify(value);
  const acceptsGzip = /\bgzip\b/i.test(req.headers["accept-encoding"] || "");
  if (acceptsGzip && Buffer.byteLength(json) > 1024) {
    zlib.gzip(json, { level: 6 }, (error, compressed) => {
      if (error) {
        sendJson(res, status, value);
        return;
      }
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "content-encoding": "gzip",
        "cache-control": cacheControl,
        "vary": "Accept-Encoding",
      });
      res.end(compressed);
    });
    return;
  }
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheControl,
    "vary": "Accept-Encoding",
  });
  res.end(json);
}

function getTasksPayloadCache() {
  const now = Date.now();
  if (tasksPayloadCache && now - tasksPayloadCache.createdAt < TASKS_CACHE_TTL_MS) return tasksPayloadCache;
  const json = JSON.stringify(tasksPayload());
  const etag = `"tasks-${crypto.createHash("sha1").update(json).digest("hex").slice(0, 16)}"`;
  const gzip = zlib.gzipSync(json, { level: 6 });
  tasksPayloadCache = {
    createdAt: now,
    json,
    gzip,
    etag,
    byteLength: Buffer.byteLength(json),
  };
  return tasksPayloadCache;
}

function sendTasksPayload(req, res) {
  const cache = getTasksPayloadCache();
  if (req.headers["if-none-match"] === cache.etag) {
    res.writeHead(304, {
      "etag": cache.etag,
      "cache-control": "private, max-age=600, stale-while-revalidate=3600",
    });
    res.end();
    return;
  }
  const acceptsGzip = /\bgzip\b/i.test(req.headers["accept-encoding"] || "");
  const body = acceptsGzip ? cache.gzip : Buffer.from(cache.json);
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "private, max-age=600, stale-while-revalidate=3600",
    "etag": cache.etag,
    "vary": "Accept-Encoding",
    ...(acceptsGzip ? { "content-encoding": "gzip" } : {}),
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 30_000_000) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    req.on("end", () => resolve(body.replace(/^\uFEFF/, "")));
    req.on("error", reject);
  });
}

function readBufferBody(req, limitBytes = 30_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        req.destroy();
        reject(new Error("Request body is too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readJsonBody(req) {
  return readBody(req).then((body) => JSON.parse(body || "{}"));
}

let appDb = null;

function getAppDb() {
  if (!DatabaseSync) throw new Error("SQLite is not available in this Node runtime.");
  if (appDb) return appDb;
  fs.mkdirSync(path.dirname(APP_DB_PATH), { recursive: true });
  appDb = new DatabaseSync(APP_DB_PATH);
  appDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      avatar_data_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'school_admin', 'school_owner', 'staff')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, role)
    );
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role, user_id);
    CREATE TRIGGER IF NOT EXISTS users_default_student_role
    AFTER INSERT ON users
    BEGIN
      INSERT OR IGNORE INTO user_roles (user_id, role, created_at, updated_at)
      VALUES (NEW.id, 'student', NEW.created_at, NEW.updated_at);
    END;
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memberships (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS redemption_codes (
      code TEXT PRIMARY KEY,
      plan TEXT NOT NULL,
      days INTEGER NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      expires_at TEXT
    );
    CREATE TABLE IF NOT EXISTS redemption_uses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL REFERENCES redemption_codes(code),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      used_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      draft_key TEXT NOT NULL,
      module TEXT NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, draft_key)
    );
    CREATE TABLE IF NOT EXISTS vocabulary_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      context TEXT,
      explanation TEXT,
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, term, source)
    );
    CREATE TABLE IF NOT EXISTS learner_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      target_band REAL,
      current_band REAL,
      exam_date TEXT,
      daily_minutes INTEGER,
      onboarding_completed_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS practice_sessions (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module TEXT NOT NULL,
      item_id TEXT NOT NULL,
      practice_kind TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      state_json TEXT NOT NULL,
      origin_weak_area_id TEXT,
      revision INTEGER NOT NULL DEFAULT 1,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_status ON practice_sessions(user_id, status, updated_at DESC);
    CREATE TABLE IF NOT EXISTS practice_attempts (
      attempt_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT,
      module TEXT NOT NULL,
      item_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      score_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      feedback_json TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      submitted_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_submitted ON practice_attempts(user_id, submitted_at DESC);
    CREATE TABLE IF NOT EXISTS objective_exam_attempts (
      exam_id TEXT PRIMARY KEY,
      client_exam_key TEXT NOT NULL,
      owner_key TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      exam_token_hash TEXT NOT NULL,
      context TEXT NOT NULL CHECK (context IN ('same-test', 'random-exam')),
      listening_task_id TEXT NOT NULL,
      reading_task_id TEXT NOT NULL,
      manifest_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL CHECK (status IN ('open', 'submitted')),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      submitted_at TEXT,
      UNIQUE(owner_key, client_exam_key)
    );
    CREATE INDEX IF NOT EXISTS idx_objective_exam_attempts_owner_status ON objective_exam_attempts(owner_key, status, created_at DESC);
    CREATE TABLE IF NOT EXISTS objective_attempts (
      attempt_id TEXT PRIMARY KEY,
      client_attempt_key TEXT NOT NULL,
      owner_key TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      attempt_token_hash TEXT NOT NULL,
      context TEXT NOT NULL CHECK (context IN ('single', 'same-test', 'random-exam')),
      module TEXT NOT NULL CHECK (module IN ('listening', 'reading')),
      task_id TEXT NOT NULL,
      parent_exam_id TEXT REFERENCES objective_exam_attempts(exam_id) ON DELETE CASCADE,
      question_ids_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'submitted')),
      answers_digest TEXT,
      result_json TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      submitted_at TEXT,
      UNIQUE(owner_key, client_attempt_key, module)
    );
    CREATE INDEX IF NOT EXISTS idx_objective_attempts_owner_status ON objective_attempts(owner_key, status, created_at DESC);
    CREATE TABLE IF NOT EXISTS objective_guest_submission_limits (
      rate_key TEXT NOT NULL,
      window_date TEXT NOT NULL,
      submissions INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (rate_key, window_date)
    );
    CREATE TABLE IF NOT EXISTS weak_areas (
      weak_area_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module TEXT NOT NULL,
      skill_key TEXT,
      question_id TEXT,
      source_attempt_id TEXT,
      summary TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      status TEXT NOT NULL,
      retest_attempt_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_weak_areas_user_status ON weak_areas(user_id, status, updated_at DESC);
    CREATE TABLE IF NOT EXISTS stem_marking_submissions (
      submission_id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT,
      classroom_id TEXT,
      route_id TEXT NOT NULL,
      specification_version TEXT NOT NULL,
      paper_id TEXT NOT NULL,
      attempt_id TEXT NOT NULL,
      request_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'missing_metadata')),
      result_json TEXT NOT NULL,
      failure_code TEXT,
      processing_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      UNIQUE(user_id, idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS idx_stem_marking_submissions_user_created ON stem_marking_submissions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stem_marking_submissions_org_status ON stem_marking_submissions(organization_id, classroom_id, status, created_at DESC);
    CREATE TABLE IF NOT EXISTS stem_marking_events (
      event_id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES stem_marking_submissions(submission_id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stem_marking_events_submission_created ON stem_marking_events(submission_id, created_at ASC);
    CREATE TABLE IF NOT EXISTS stem_organization_memberships (
      organization_id TEXT NOT NULL,
      classroom_id TEXT NOT NULL DEFAULT '',
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'school_admin', 'school_owner')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (organization_id, classroom_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_stem_organization_memberships_user ON stem_organization_memberships(user_id, organization_id, classroom_id);
  `);
  appDb.prepare(`
    INSERT OR IGNORE INTO user_roles (user_id, role, created_at, updated_at)
    SELECT id, 'student', created_at, updated_at FROM users
  `).run();
  const profileColumns = new Set(appDb.prepare("PRAGMA table_info(learner_profiles)").all().map((column) => column.name));
  if (!profileColumns.has("current_band")) appDb.exec("ALTER TABLE learner_profiles ADD COLUMN current_band REAL");
  const objectiveAttemptColumns = new Set(appDb.prepare("PRAGMA table_info(objective_attempts)").all().map((column) => column.name));
  if (!objectiveAttemptColumns.has("parent_exam_id")) appDb.exec("ALTER TABLE objective_attempts ADD COLUMN parent_exam_id TEXT REFERENCES objective_exam_attempts(exam_id) ON DELETE CASCADE");
  appDb.exec("CREATE INDEX IF NOT EXISTS idx_objective_attempts_parent_exam ON objective_attempts(parent_exam_id, module)");
  initCoachHistorySchema(appDb);
  return appDb;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validateUsername(username) {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return { salt, passwordHash };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = crypto.scryptSync(String(password || ""), salt, 64);
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function publicUser(row, membership = null) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    avatarDataUrl: row.avatar_data_url || "",
    membership: membership ? {
      plan: membership.plan,
      startsAt: membership.starts_at,
      expiresAt: membership.expires_at,
      active: Date.parse(membership.expires_at) > Date.now(),
    } : null,
  };
}

function getRequestToken(req) {
  const auth = req.headers.authorization || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return bearer.trim();
  const cookie = req.headers.cookie || "";
  return cookie.split(/;\s*/).map((part) => part.split("=")).find(([key]) => key === "ieltsist_session")?.[1] || "";
}

function requireUser(req) {
  const token = getRequestToken(req);
  if (!token) {
    const error = new Error("Please log in first.");
    error.statusCode = 401;
    throw error;
  }
  const db = getAppDb();
  const tokenHash = hashToken(token);
  const row = db.prepare(`
    SELECT users.*, sessions.expires_at AS session_expires_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(tokenHash);
  if (!row || Date.parse(row.session_expires_at) <= Date.now()) {
    const error = new Error("Login expired. Please log in again.");
    error.statusCode = 401;
    throw error;
  }
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?").run(nowIso(), tokenHash);
  return row;
}

function optionalUser(req) {
  try {
    return requireUser(req);
  } catch (error) {
    if (error.statusCode === 401) return null;
    throw error;
  }
}

function requestCookie(req, name) {
  const cookie = String(req.headers.cookie || "");
  const raw = cookie.split(/;\s*/).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return "";
  }
}

function appendResponseCookie(res, value) {
  const existing = res.getHeader("Set-Cookie");
  const values = Array.isArray(existing) ? existing : existing ? [existing] : [];
  res.setHeader("Set-Cookie", [...values, value]);
}

function currentMembership(userId) {
  return getAppDb().prepare("SELECT * FROM memberships WHERE user_id = ?").get(userId) || null;
}

function getUserRoles(userId) {
  const db = getAppDb();
  const rows = db.prepare("SELECT role FROM user_roles WHERE user_id = ? ORDER BY role").all(userId);
  if (!rows.length) {
    const timestamp = nowIso();
    db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role, created_at, updated_at) VALUES (?, 'student', ?, ?)")
      .run(userId, timestamp, timestamp);
    return ["student"];
  }
  return rows.map((row) => row.role).sort((a, b) => USER_ROLE_ORDER.indexOf(a) - USER_ROLE_ORDER.indexOf(b));
}

function normalizeUserRoles(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const roles = [...new Set(value.map((role) => String(role || "").trim().toLowerCase()))];
  return roles.length && roles.every((role) => VALID_USER_ROLES.has(role)) ? roles.sort((a, b) => USER_ROLE_ORDER.indexOf(a) - USER_ROLE_ORDER.indexOf(b)) : null;
}

function requireAdminApiSecret(req) {
  if (!ADMIN_API_SECRET || req.headers["x-admin-secret"] !== ADMIN_API_SECRET) {
    const error = new Error("Admin API secret is required.");
    error.statusCode = 403;
    throw error;
  }
}

function createSession(userId) {
  const db = getAppDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (user_id, token_hash, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)")
    .run(userId, hashToken(token), createdAt, expiresAt, createdAt);
  return { token, expiresAt };
}

function setSessionCookie(res, token, expiresAt) {
  const secure = SESSION_COOKIE_SECURE ? "; Secure" : "";
  res.setHeader("Set-Cookie", `ieltsist_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Expires=${new Date(expiresAt).toUTCString()}`);
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signStemIdentity(payload) {
  const header = base64urlJson({ alg: "HS256", typ: "JWT" });
  const body = base64urlJson(payload);
  const signature = crypto.createHmac("sha256", STEM_IDENTITY_SIGNING_KEY).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function signedStemInternalRequest(req, body) {
  if (!STEM_INTERNAL_AUTH_KEY) return false;
  const timestamp = String(req.headers["x-stem-auth-timestamp"] || "");
  const signature = String(req.headers["x-stem-auth-signature"] || "");
  if (!/^\d{13}$/.test(timestamp) || !/^[A-Za-z0-9_-]{20,200}$/.test(signature)) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > STEM_INTERNAL_AUTH_WINDOW_MS) return false;
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  const expected = crypto.createHmac("sha256", STEM_INTERNAL_AUTH_KEY).update(`${timestamp}.${digest}`).digest("base64url");
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function stemInternalIdentity(user) {
  const roles = getUserRoles(user.id);
  return {
    id: `ielts:${user.id}`,
    username: user.username,
    avatarDataUrl: user.avatar_data_url || "",
    roles,
    workspaceRoles: roles,
  };
}

async function handleStemInternalAuthenticate(req, res) {
  const rawBody = await readBody(req);
  if (!signedStemInternalRequest(req, rawBody)) {
    sendJson(res, 403, { error: "STEM account authentication is not authorised." });
    return;
  }
  let payload;
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch {
    sendJson(res, 400, { error: "Account request must be valid JSON." });
    return;
  }
  const mode = payload.mode === "register" ? "register" : payload.mode === "login" ? "login" : "";
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");
  if (!mode || !validateUsername(username)) {
    sendJson(res, 400, { error: "Username must be 3-24 characters: lowercase letters, numbers, or underscore." });
    return;
  }
  if (password.length < 6 || password.length > 72) {
    sendJson(res, 400, { error: "Password must be 6-72 characters." });
    return;
  }
  const db = getAppDb();
  let user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (mode === "register") {
    if (user) {
      sendJson(res, 409, { error: "Username already exists." });
      return;
    }
    const createdAt = nowIso();
    const { salt, passwordHash } = hashPassword(password);
    const result = db.prepare("INSERT INTO users (username, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(username, passwordHash, salt, createdAt, createdAt);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid));
  } else if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
    sendJson(res, 401, { error: "Invalid username or password." });
    return;
  }
  sendJson(res, 200, { identity: stemInternalIdentity(user) });
}

function requireStemInternalRequest(req, body) {
  if (!signedStemInternalRequest(req, body)) {
    throw stemMarkingError("STEM server-to-server requests must be signed.", 403);
  }
}

async function handleCoachConversationsApi(req, res) {
  const user = requireUser(req);
  const db = getAppDb();
  if (req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    sendJson(res, 200, {
      conversations: listCoachConversations(db, user.id, { limit: Number(url.searchParams.get("limit") || 40) }),
    });
    return;
  }
  if (req.method === "PUT") {
    const payload = await readJsonBody(req);
    sendJson(res, 200, {
      conversations: upsertCoachConversations(db, user.id, payload, { sourceProduct: "ieltsist", forceSourceProduct: true }),
    });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleStemInternalCoachConversations(req, res) {
  const rawBody = await readBody(req);
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const authPayload = req.method === "GET" ? `${rawBody}\n${url.pathname}${url.search}` : rawBody;
  requireStemInternalRequest(req, authPayload);
  let payload = {};
  if (req.method !== "GET") {
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      sendJson(res, 400, { error: "Conversation request must be valid JSON." });
      return;
    }
  }
  const userId = parseCoachUserId(payload.userId || url.searchParams.get("userId") || "");
  const db = getAppDb();
  if (!db.prepare("SELECT id FROM users WHERE id = ?").get(userId)) {
    sendJson(res, 404, { error: "User not found." });
    return;
  }
  if (req.method === "GET") {
    sendJson(res, 200, {
      conversations: listCoachConversations(db, userId, { limit: Number(url.searchParams.get("limit") || 40) }),
    });
    return;
  }
  if (req.method === "PUT") {
    sendJson(res, 200, {
      conversations: upsertCoachConversations(db, userId, payload, { sourceProduct: "stem", forceSourceProduct: true }),
    });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

function applyStemCors(req, res, methods = "GET,OPTIONS") {
  const origin = String(req.headers.origin || "");
  if (!STEM_ALLOWED_ORIGINS.has(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "content-type,authorization,x-stem-identity");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Vary", "Origin");
  return true;
}

function handleStemIdentity(req, res) {
  if (!STEM_IDENTITY_SIGNING_KEY) {
    sendJson(res, 503, { error: "Shared STEM sign-in is not configured yet." });
    return;
  }
  if (!applyStemCors(req, res)) {
    sendJson(res, 403, { error: "This origin is not allowed to request STEM sign-in." });
    return;
  }
  const user = requireUser(req);
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 300;
  const roles = getUserRoles(user.id);
  const identity = {
    id: `ielts:${user.id}`,
    username: user.username,
    avatarDataUrl: user.avatar_data_url || "",
    roles,
    workspaceRoles: roles,
  };
  const accessToken = signStemIdentity({
    iss: "ieltsist.com",
    aud: "stem.ieltsist.com",
    sub: identity.id,
    username: identity.username,
    avatarDataUrl: identity.avatarDataUrl,
    roles: identity.roles,
    workspaceRoles: identity.workspaceRoles,
    iat: issuedAt,
    exp: expiresAt,
  });
  sendJson(res, 200, { identity, accessToken, expiresAt: new Date(expiresAt * 1000).toISOString() });
}

async function handleAuthApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const payload = await readJsonBody(req);
    const username = normalizeUsername(payload.username);
    const password = String(payload.password || "");
    if (!validateUsername(username)) {
      sendJson(res, 400, { error: "Username must be 3-24 characters: lowercase letters, numbers, or underscore." });
      return;
    }
    if (password.length < 6 || password.length > 72) {
      sendJson(res, 400, { error: "Password must be 6-72 characters." });
      return;
    }
    const db = getAppDb();
    const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (exists) {
      sendJson(res, 409, { error: "Username already exists." });
      return;
    }
    const createdAt = nowIso();
    const { salt, passwordHash } = hashPassword(password);
    const result = db.prepare("INSERT INTO users (username, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(username, passwordHash, salt, createdAt, createdAt);
    const session = createSession(Number(result.lastInsertRowid));
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid));
    setSessionCookie(res, session.token, session.expiresAt);
    sendJson(res, 200, { token: session.token, expiresAt: session.expiresAt, user: publicUser(user, currentMembership(user.id)) });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const payload = await readJsonBody(req);
    const username = normalizeUsername(payload.username);
    const user = getAppDb().prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user || !verifyPassword(payload.password, user.salt, user.password_hash)) {
      sendJson(res, 401, { error: "Invalid username or password." });
      return;
    }
    const session = createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    sendJson(res, 200, { token: session.token, expiresAt: session.expiresAt, user: publicUser(user, currentMembership(user.id)) });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = getRequestToken(req);
    if (token) getAppDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    res.setHeader("Set-Cookie", `ieltsist_session=; Path=/; HttpOnly; SameSite=Lax${SESSION_COOKIE_SECURE ? "; Secure" : ""}; Max-Age=0`);
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/me") {
    const user = requireUser(req);
    sendJson(res, 200, { user: publicUser(user, currentMembership(user.id)) });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleAdminUserRoles(req, res, userId) {
  requireAdminApiSecret(req);
  const db = getAppDb();
  const id = Number(userId);
  const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(id);
  if (!user) {
    sendJson(res, 404, { error: "User not found." });
    return;
  }
  if (req.method === "PUT") {
    const payload = await readJsonBody(req);
    const roles = normalizeUserRoles(payload.roles);
    if (!roles) {
      sendJson(res, 400, { error: `Roles must be a non-empty array containing only: ${USER_ROLE_ORDER.join(", ")}.` });
      return;
    }
    const updatedAt = nowIso();
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(user.id);
      const insertRole = db.prepare("INSERT INTO user_roles (user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?)");
      for (const role of roles) insertRole.run(user.id, role, updatedAt, updatedAt);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } else if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const roles = getUserRoles(user.id);
  sendJson(res, 200, { user, roles, workspaceRoles: roles });
}

function redemptionPlanDays(plan) {
  const key = String(plan || "").toLowerCase();
  if (key === "week" || key === "weekly") return 7;
  if (key === "month" || key === "monthly") return 31;
  if (key === "year" || key === "yearly") return 366;
  return 0;
}

async function handleRedeem(req, res) {
  const user = requireUser(req);
  const payload = await readJsonBody(req);
  const code = String(payload.code || "").trim().toUpperCase();
  if (!code) {
    sendJson(res, 400, { error: "Redemption code is required." });
    return;
  }
  const db = getAppDb();
  const row = db.prepare("SELECT * FROM redemption_codes WHERE code = ?").get(code);
  if (!row || !row.active || row.used_count >= row.max_uses || (row.expires_at && Date.parse(row.expires_at) <= Date.now())) {
    sendJson(res, 400, { error: "Invalid or expired redemption code." });
    return;
  }
  const used = db.prepare("SELECT id FROM redemption_uses WHERE code = ? AND user_id = ?").get(code, user.id);
  if (used) {
    sendJson(res, 409, { error: "This code has already been used by this account." });
    return;
  }
  const current = currentMembership(user.id);
  const now = Date.now();
  const base = current && Date.parse(current.expires_at) > now ? Date.parse(current.expires_at) : now;
  const expiresAt = new Date(base + Number(row.days) * 24 * 60 * 60 * 1000).toISOString();
  const startsAt = current?.starts_at || nowIso();
  const updatedAt = nowIso();
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE redemption_codes SET used_count = used_count + 1 WHERE code = ?").run(code);
    db.prepare("INSERT INTO redemption_uses (code, user_id, used_at) VALUES (?, ?, ?)").run(code, user.id, updatedAt);
    db.prepare(`
      INSERT INTO memberships (user_id, plan, starts_at, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, expires_at = excluded.expires_at, updated_at = excluded.updated_at
    `).run(user.id, row.plan, startsAt, expiresAt, updatedAt);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  const refreshed = getAppDb().prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  sendJson(res, 200, { ok: true, user: publicUser(refreshed, currentMembership(user.id)) });
}

async function handleAdminRedemptionCodes(req, res) {
  requireAdminApiSecret(req);
  const payload = await readJsonBody(req);
  const plan = String(payload.plan || "").toLowerCase();
  const days = Number(payload.days || redemptionPlanDays(plan));
  const count = Math.max(1, Math.min(500, Number(payload.count || 1)));
  const maxUses = Math.max(1, Math.min(1000, Number(payload.maxUses || 1)));
  if (!days) {
    sendJson(res, 400, { error: "Plan must be week, month, or year, or provide days." });
    return;
  }
  const db = getAppDb();
  const createdAt = nowIso();
  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt).toISOString() : null;
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    const code = String(payload.prefix || "IELTS").toUpperCase() + "-" + crypto.randomBytes(6).toString("base64url").toUpperCase();
    db.prepare("INSERT INTO redemption_codes (code, plan, days, max_uses, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(code, plan || `${days}d`, days, maxUses, createdAt, expiresAt);
    codes.push(code);
  }
  sendJson(res, 200, { ok: true, codes, plan: plan || `${days}d`, days, maxUses });
}

async function handleDraftsApi(req, res) {
  const user = requireUser(req);
  const db = getAppDb();
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET") {
    const rows = db.prepare("SELECT id, draft_key, module, title, payload_json, updated_at FROM drafts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100").all(user.id);
    sendJson(res, 200, {
      drafts: rows.map((row) => ({
        id: row.id,
        key: row.draft_key,
        module: row.module,
        title: row.title,
        payload: JSON.parse(row.payload_json || "{}"),
        updatedAt: row.updated_at,
      })),
    });
    return;
  }
  if (req.method === "POST") {
    const payload = await readJsonBody(req);
    const key = String(payload.key || "").slice(0, 160);
    const moduleName = String(payload.module || "practice").slice(0, 40);
    const title = String(payload.title || "Untitled draft").slice(0, 180);
    if (!key) {
      sendJson(res, 400, { error: "Draft key is required." });
      return;
    }
    const updatedAt = nowIso();
    db.prepare(`
      INSERT INTO drafts (user_id, draft_key, module, title, payload_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, draft_key) DO UPDATE SET module = excluded.module, title = excluded.title, payload_json = excluded.payload_json, updated_at = excluded.updated_at
    `).run(user.id, key, moduleName, title, JSON.stringify(payload.payload || {}), updatedAt);
    sendJson(res, 200, { ok: true, updatedAt });
    return;
  }
  if (req.method === "DELETE") {
    const key = String(url.searchParams.get("key") || "");
    if (!key) {
      sendJson(res, 400, { error: "Draft key is required." });
      return;
    }
    db.prepare("DELETE FROM drafts WHERE user_id = ? AND draft_key = ?").run(user.id, key);
    sendJson(res, 200, { ok: true });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleVocabularyApi(req, res) {
  const user = requireUser(req);
  const db = getAppDb();
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET") {
    const rows = db.prepare("SELECT id, term, context, explanation, source, created_at, updated_at FROM vocabulary_items WHERE user_id = ? ORDER BY updated_at DESC LIMIT 300").all(user.id);
    sendJson(res, 200, { items: rows });
    return;
  }
  if (req.method === "POST") {
    const payload = await readJsonBody(req);
    const term = String(payload.term || "").trim().slice(0, 120);
    if (!term) {
      sendJson(res, 400, { error: "Vocabulary term is required." });
      return;
    }
    const source = String(payload.source || "Help").slice(0, 80);
    const updatedAt = nowIso();
    db.prepare(`
      INSERT INTO vocabulary_items (user_id, term, context, explanation, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, term, source) DO UPDATE SET context = excluded.context, explanation = excluded.explanation, updated_at = excluded.updated_at
    `).run(user.id, term, String(payload.context || "").slice(0, 1000), String(payload.explanation || "").slice(0, 3000), source, updatedAt, updatedAt);
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    if (!Number.isFinite(id)) {
      sendJson(res, 400, { error: "Vocabulary id is required." });
      return;
    }
    db.prepare("DELETE FROM vocabulary_items WHERE user_id = ? AND id = ?").run(user.id, id);
    sendJson(res, 200, { ok: true });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

const LEARNING_MODULES = new Set(["listening", "reading", "writing", "speaking", "exam", "sequence"]);
const PRACTICE_STATUSES = new Set(["in_progress", "completed", "abandoned"]);
const WEAK_AREA_STATUSES = new Set(["active", "retested", "resolved"]);

function parseStoredJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function assertLearningValue(condition, message, statusCode = 400) {
  if (condition) return;
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function normalizeLearningModule(value) {
  const moduleName = String(value || "").trim().toLowerCase();
  assertLearningValue(LEARNING_MODULES.has(moduleName), "Invalid learning module.");
  return moduleName;
}

function safeLearningJson(value, label) {
  const json = JSON.stringify(value ?? {});
  assertLearningValue(Buffer.byteLength(json) <= 600_000, `${label} is too large.`);
  return json;
}

function publicPracticeSession(row) {
  if (!row) return null;
  return {
    sessionId: row.session_id,
    module: row.module,
    itemId: row.item_id,
    practiceKind: row.practice_kind,
    mode: row.mode,
    status: row.status,
    state: parseStoredJson(row.state_json, {}),
    originWeakAreaId: row.origin_weak_area_id || "",
    revision: row.revision,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || "",
  };
}

function publicPracticeAttempt(row) {
  if (!row) return null;
  return {
    attemptId: row.attempt_id,
    sessionId: row.session_id || "",
    module: row.module,
    itemId: row.item_id,
    mode: row.mode,
    score: parseStoredJson(row.score_json, {}),
    result: parseStoredJson(row.result_json, {}),
    feedback: parseStoredJson(row.feedback_json, {}),
    durationSeconds: row.duration_seconds,
    submittedAt: row.submitted_at,
  };
}

function publicWeakArea(row) {
  if (!row) return null;
  return {
    id: row.weak_area_id,
    module: row.module,
    skillKey: row.skill_key || "",
    questionId: row.question_id || "",
    sourceAttemptId: row.source_attempt_id || "",
    summary: row.summary,
    evidence: parseStoredJson(row.evidence_json, {}),
    status: row.status,
    retestAttemptId: row.retest_attempt_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function learnerProfileForUser(userId) {
  const row = getAppDb().prepare("SELECT * FROM learner_profiles WHERE user_id = ?").get(userId);
  return row ? {
    targetBand: row.target_band,
    currentBand: row.current_band,
    examDate: row.exam_date || "",
    dailyMinutes: row.daily_minutes,
    onboardingCompletedAt: row.onboarding_completed_at || "",
    updatedAt: row.updated_at,
  } : null;
}

async function handleLearningProfile(req, res) {
  const user = requireUser(req);
  if (req.method === "GET") {
    sendJson(res, 200, { profile: learnerProfileForUser(user.id) });
    return;
  }
  if (req.method === "PATCH") {
    const payload = await readJsonBody(req);
    const existing = learnerProfileForUser(user.id) || {};
    const targetBandRaw = payload.targetBand ?? existing.targetBand;
    const currentBandRaw = payload.currentBand ?? existing.currentBand;
    const dailyMinutesRaw = payload.dailyMinutes ?? existing.dailyMinutes;
    const targetBand = targetBandRaw === null || targetBandRaw === undefined || targetBandRaw === "" ? null : Number(targetBandRaw);
    const currentBand = currentBandRaw === null || currentBandRaw === undefined || currentBandRaw === "" ? null : Number(currentBandRaw);
    const dailyMinutes = dailyMinutesRaw === null || dailyMinutesRaw === undefined || dailyMinutesRaw === "" ? null : Number(dailyMinutesRaw);
    assertLearningValue(targetBand === null || (Number.isFinite(targetBand) && targetBand >= 4 && targetBand <= 9), "Target band must be between 4 and 9.");
    assertLearningValue(currentBand === null || (Number.isFinite(currentBand) && currentBand >= 3 && currentBand <= 9), "Current band must be between 3 and 9.");
    assertLearningValue(dailyMinutes === null || (Number.isInteger(dailyMinutes) && dailyMinutes >= 5 && dailyMinutes <= 360), "Daily minutes must be between 5 and 360.");
    const examDate = String(payload.examDate ?? existing.examDate ?? "").slice(0, 40);
    const onboardingCompletedAt = payload.onboardingCompleted === true
      ? existing.onboardingCompletedAt || nowIso()
      : String(existing.onboardingCompletedAt || "");
    const updatedAt = nowIso();
    getAppDb().prepare(`
      INSERT INTO learner_profiles (user_id, target_band, current_band, exam_date, daily_minutes, onboarding_completed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET target_band = excluded.target_band, current_band = excluded.current_band, exam_date = excluded.exam_date,
        daily_minutes = excluded.daily_minutes, onboarding_completed_at = excluded.onboarding_completed_at, updated_at = excluded.updated_at
    `).run(user.id, targetBand, currentBand, examDate || null, dailyMinutes, onboardingCompletedAt || null, updatedAt);
    sendJson(res, 200, { profile: learnerProfileForUser(user.id) });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleLearningSession(req, res, sessionId) {
  const user = requireUser(req);
  assertLearningValue(req.method === "PUT", "Method not allowed", 405);
  assertLearningValue(/^[A-Za-z0-9_-]{8,100}$/.test(sessionId), "Invalid session id.");
  const payload = await readJsonBody(req);
  const db = getAppDb();
  const sessionOwner = db.prepare("SELECT * FROM practice_sessions WHERE session_id = ?").get(sessionId);
  assertLearningValue(!sessionOwner || Number(sessionOwner.user_id) === Number(user.id), "Practice session id belongs to another account.", 409);
  const existing = sessionOwner || null;
  if (existing) assertLearningValue(Number(payload.revision) === Number(existing.revision), "Practice session changed on another device.", 409);
  const moduleName = normalizeLearningModule(payload.module);
  const status = String(payload.status || "in_progress");
  assertLearningValue(PRACTICE_STATUSES.has(status), "Invalid practice session status.");
  const now = nowIso();
  const nextRevision = existing ? Number(existing.revision) + 1 : 1;
  const write = db.prepare(`
    INSERT INTO practice_sessions (session_id, user_id, module, item_id, practice_kind, mode, status, state_json, origin_weak_area_id, revision, started_at, updated_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET module = excluded.module, item_id = excluded.item_id, practice_kind = excluded.practice_kind,
      mode = excluded.mode, status = excluded.status, state_json = excluded.state_json, origin_weak_area_id = excluded.origin_weak_area_id,
      revision = excluded.revision, updated_at = excluded.updated_at, completed_at = excluded.completed_at
    WHERE practice_sessions.user_id = excluded.user_id
  `).run(
    sessionId, user.id, moduleName, String(payload.itemId || "").slice(0, 180), String(payload.practiceKind || "single").slice(0, 40),
    String(payload.mode || "practice").slice(0, 60), status, safeLearningJson(payload.state, "Practice state"),
    String(payload.originWeakAreaId || "").slice(0, 100) || null, nextRevision, existing?.started_at || now, now,
    status === "completed" ? existing?.completed_at || now : null,
  );
  assertLearningValue(Number(write.changes) === 1, "Practice session id belongs to another account.", 409);
  const row = db.prepare("SELECT * FROM practice_sessions WHERE session_id = ? AND user_id = ?").get(sessionId, user.id);
  sendJson(res, 200, { session: publicPracticeSession(row) });
}

async function handleLearningAttempts(req, res) {
  const user = requireUser(req);
  assertLearningValue(req.method === "POST", "Method not allowed", 405);
  const payload = await readJsonBody(req);
  const attemptId = String(payload.attemptId || "").trim();
  assertLearningValue(/^[A-Za-z0-9_-]{8,100}$/.test(attemptId), "Invalid attempt id.");
  const db = getAppDb();
  const existing = db.prepare("SELECT * FROM practice_attempts WHERE attempt_id = ? AND user_id = ?").get(attemptId, user.id);
  if (existing) {
    sendJson(res, 200, { attempt: publicPracticeAttempt(existing), idempotent: true });
    return;
  }
  const moduleName = normalizeLearningModule(payload.module);
  const submittedAt = nowIso();
  db.prepare(`
    INSERT INTO practice_attempts (attempt_id, user_id, session_id, module, item_id, mode, score_json, result_json, feedback_json, duration_seconds, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(attemptId, user.id, String(payload.sessionId || "").slice(0, 100) || null, moduleName,
    String(payload.itemId || "").slice(0, 180), String(payload.mode || "practice").slice(0, 60),
    safeLearningJson(payload.score, "Attempt score"), safeLearningJson(payload.result, "Attempt result"),
    safeLearningJson(payload.feedback, "Attempt feedback"), Math.max(0, Math.min(100000, Number(payload.durationSeconds) || 0)), submittedAt);
  const row = db.prepare("SELECT * FROM practice_attempts WHERE attempt_id = ? AND user_id = ?").get(attemptId, user.id);
  sendJson(res, 200, { attempt: publicPracticeAttempt(row), idempotent: false });
}

async function handleLearningWeakAreas(req, res, weakAreaId = "") {
  const user = requireUser(req);
  const db = getAppDb();
  const payload = await readJsonBody(req);
  if (req.method === "POST" && !weakAreaId) {
    const id = String(payload.id || "").trim();
    assertLearningValue(/^[A-Za-z0-9_-]{8,100}$/.test(id), "Invalid weak area id.");
    const moduleName = normalizeLearningModule(payload.module);
    const status = String(payload.status || "active");
    assertLearningValue(WEAK_AREA_STATUSES.has(status), "Invalid weak area status.");
    const now = nowIso();
    db.prepare(`
      INSERT INTO weak_areas (weak_area_id, user_id, module, skill_key, question_id, source_attempt_id, summary, evidence_json, status, retest_attempt_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(weak_area_id) DO UPDATE SET summary = excluded.summary, evidence_json = excluded.evidence_json, status = excluded.status, updated_at = excluded.updated_at
    `).run(id, user.id, moduleName, String(payload.skillKey || "").slice(0, 100) || null,
      String(payload.questionId || "").slice(0, 100) || null, String(payload.sourceAttemptId || "").slice(0, 100) || null,
      String(payload.summary || "Weak area").slice(0, 1000), safeLearningJson(payload.evidence, "Weak-area evidence"), status,
      String(payload.retestAttemptId || "").slice(0, 100) || null, now, now);
    sendJson(res, 200, { weakArea: publicWeakArea(db.prepare("SELECT * FROM weak_areas WHERE weak_area_id = ? AND user_id = ?").get(id, user.id)) });
    return;
  }
  if (req.method === "PATCH" && weakAreaId) {
    const row = db.prepare("SELECT * FROM weak_areas WHERE weak_area_id = ? AND user_id = ?").get(weakAreaId, user.id);
    assertLearningValue(row, "Weak area not found.", 404);
    const status = String(payload.status || row.status);
    assertLearningValue(WEAK_AREA_STATUSES.has(status), "Invalid weak area status.");
    db.prepare("UPDATE weak_areas SET status = ?, retest_attempt_id = ?, updated_at = ? WHERE weak_area_id = ? AND user_id = ?")
      .run(status, String(payload.retestAttemptId || row.retest_attempt_id || "").slice(0, 100) || null, nowIso(), weakAreaId, user.id);
    sendJson(res, 200, { weakArea: publicWeakArea(db.prepare("SELECT * FROM weak_areas WHERE weak_area_id = ? AND user_id = ?").get(weakAreaId, user.id)) });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

function attemptBandSignal(row) {
  const score = parseStoredJson(row?.score_json, {});
  const result = parseStoredJson(row?.result_json, {});
  const candidates = [score.band, score.overall, score.scores?.overall, result.band, result.scores?.overall, result.scores?.Overall];
  const band = candidates.map(Number).find((value) => Number.isFinite(value) && value >= 0 && value <= 9);
  return Number.isFinite(band) ? band : null;
}

function recentWeakestSkillPlan(db, userId, profile) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = db.prepare("SELECT * FROM practice_attempts WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 40").all(userId)
    .filter((row) => ["listening", "reading", "writing", "speaking"].includes(row.module))
    .filter((row) => !Number.isFinite(Date.parse(row.submitted_at)) || Date.parse(row.submitted_at) >= cutoff);
  const grouped = new Map();
  rows.forEach((row) => {
    const band = attemptBandSignal(row);
    if (!Number.isFinite(band)) return;
    const group = grouped.get(row.module) || { module: row.module, bands: [], attemptIds: [], latest: row };
    group.bands.push(band);
    group.attemptIds.push(row.attempt_id);
    grouped.set(row.module, group);
  });
  const weakest = [...grouped.values()]
    .map((group) => ({ ...group, average: group.bands.reduce((sum, value) => sum + value, 0) / group.bands.length }))
    .sort((a, b) => a.average - b.average || b.bands.length - a.bands.length)[0];
  if (!weakest) return null;
  const target = Number(profile?.targetBand) || 7.5;
  const mode = weakest.module === "listening" ? "training"
    : weakest.module === "reading" ? "evidence"
      : "practice";
  return {
    kind: "practice",
    task: { module: weakest.module, itemId: weakest.latest.item_id, mode },
    reason: {
      code: "seven_day_weakest_skill",
      sourceIds: weakest.attemptIds,
      text: `${weakest.module} averages Band ${weakest.average.toFixed(1)} across ${weakest.bands.length} recent attempt${weakest.bands.length === 1 ? "" : "s"}; target is ${target.toFixed(1)}.`,
    },
    algorithmVersion: "rules-v2",
  };
}

function todayPlanForUser(userId) {
  const db = getAppDb();
  const profile = learnerProfileForUser(userId);
  const activeSession = db.prepare("SELECT * FROM practice_sessions WHERE user_id = ? AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 1").get(userId);
  if (activeSession) return {
    kind: "resume",
    task: { module: activeSession.module, itemId: activeSession.item_id, mode: activeSession.mode, sessionId: activeSession.session_id },
    reason: { code: "unfinished_session", sourceIds: [activeSession.session_id], text: "Continue the unfinished practice from your last device." },
    algorithmVersion: "rules-v1",
  };
  if (!profile?.onboardingCompletedAt) return {
    kind: "onboarding", task: null,
    reason: { code: "profile_required", sourceIds: [], text: "Set your target band, exam date and daily study time before IELTSist recommends a task." },
    algorithmVersion: "rules-v1",
  };
  const weak = db.prepare("SELECT * FROM weak_areas WHERE user_id = ? AND status = 'active' ORDER BY updated_at ASC LIMIT 1").get(userId);
  if (weak) return {
    kind: "retest",
    task: { module: weak.module, itemId: "", mode: "review", originWeakAreaId: weak.weak_area_id },
    reason: { code: "unresolved_weak_area", sourceIds: [weak.weak_area_id, weak.source_attempt_id].filter(Boolean), text: weak.summary },
    algorithmVersion: "rules-v1",
  };
  const trendPlan = recentWeakestSkillPlan(db, userId, profile);
  if (trendPlan) return trendPlan;
  const attempt = db.prepare("SELECT * FROM practice_attempts WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1").get(userId);
  if (attempt) return {
    kind: "practice",
    task: { module: attempt.module, itemId: attempt.item_id, mode: "practice" },
    reason: { code: "latest_attempt_follow_up", sourceIds: [attempt.attempt_id], text: `Follow up the latest ${attempt.module} attempt and compare the result.` },
    algorithmVersion: "rules-v1",
  };
  return {
    kind: "diagnostic", task: null,
    reason: { code: "no_attempt_evidence", sourceIds: [], text: "Choose one skill for a first diagnostic; IELTSist does not have enough evidence to rank your skills yet." },
    algorithmVersion: "rules-v1",
  };
}

async function handleLearningApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/learning/profile") return handleLearningProfile(req, res);
  if (url.pathname === "/api/learning/state" && req.method === "GET") {
    const user = requireUser(req);
    const db = getAppDb();
    const activeSession = db.prepare("SELECT * FROM practice_sessions WHERE user_id = ? AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 1").get(user.id);
    const activeSessions = db.prepare("SELECT * FROM practice_sessions WHERE user_id = ? AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 100").all(user.id);
    const attempts = db.prepare("SELECT * FROM practice_attempts WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 20").all(user.id);
    const completedItems = db.prepare(`
      WITH ranked_completions AS (
        SELECT module, item_id, submitted_at, attempt_id, score_json, rowid,
          ROW_NUMBER() OVER (PARTITION BY module, item_id ORDER BY submitted_at DESC, rowid DESC) AS completion_rank
        FROM practice_attempts
        WHERE user_id = ? AND TRIM(item_id) != ''
      )
      SELECT module, item_id, submitted_at, attempt_id, score_json
      FROM ranked_completions
      WHERE completion_rank = 1
      ORDER BY submitted_at DESC, rowid DESC
    `).all(user.id).map((row) => ({
      module: row.module,
      itemId: row.item_id,
      completedAt: row.submitted_at,
      attemptId: row.attempt_id,
      score: parseStoredJson(row.score_json, {}),
    }));
    const weakAreas = db.prepare("SELECT * FROM weak_areas WHERE user_id = ? AND status != 'resolved' ORDER BY updated_at DESC LIMIT 50").all(user.id);
    sendJson(res, 200, { profile: learnerProfileForUser(user.id), activeSession: publicPracticeSession(activeSession), activeSessions: activeSessions.map(publicPracticeSession), attempts: attempts.map(publicPracticeAttempt), completedItems, weakAreas: weakAreas.map(publicWeakArea), todayPlan: todayPlanForUser(user.id) });
    return;
  }
  if (url.pathname === "/api/learning/today-plan" && req.method === "GET") {
    const user = requireUser(req);
    sendJson(res, 200, { plan: todayPlanForUser(user.id) });
    return;
  }
  const sessionMatch = url.pathname.match(/^\/api\/learning\/sessions\/([^/]+)$/);
  if (sessionMatch) return handleLearningSession(req, res, decodeURIComponent(sessionMatch[1]));
  if (url.pathname === "/api/learning/attempts") return handleLearningAttempts(req, res);
  const weakMatch = url.pathname.match(/^\/api\/learning\/weak-areas(?:\/([^/]+))?$/);
  if (weakMatch) return handleLearningWeakAreas(req, res, weakMatch[1] ? decodeURIComponent(weakMatch[1]) : "");
  sendJson(res, 404, { error: "Learning endpoint not found" });
}

// STEM marking keeps the submission projection mutable for fast reads, while every status
// transition is appended to stem_marking_events for audit and recovery.
const stemMarkingInFlight = new Set();

function stemMarkingError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function safeStemText(value, limit = 1200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function stemStableId(value, label, maxLength = 160) {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id) || id.length > maxLength) {
    throw stemMarkingError(`Invalid ${label}.`);
  }
  return id;
}

function stemOptionalId(value, label, maxLength = 160) {
  if (value === undefined || value === null || String(value).trim() === "") return "";
  return stemStableId(value, label, maxLength);
}

function safeStemEvidence(value, limit = 900) {
  if (!value || typeof value !== "object") return null;
  const evidence = {
    quote: safeStemText(value.quote || value.text || "", limit),
    assetId: safeStemText(value.assetId || "", 160),
    page: Number.isInteger(Number(value.page)) && Number(value.page) > 0 ? Number(value.page) : null,
    region: Array.isArray(value.region) && value.region.length === 4
      ? value.region.map(Number).every((item) => Number.isFinite(item) && item >= 0 && item <= 1)
        ? value.region.map(Number)
        : null
      : null,
  };
  return evidence.quote || evidence.assetId || evidence.page || evidence.region ? evidence : null;
}

function stemManifestId(value, label) {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id)) throw new Error(`Invalid manifest ${label}.`);
  return id;
}

function stemManifestQuestionKey(question) {
  return [question.routeId, question.specificationVersion, question.paperId, question.questionPartId].join("\u0001");
}

function loadTrustedStemMarkingManifest() {
  if (!STEM_MARKING_TRUSTED_MANIFEST_PATH) return { ready: false, entries: new Map() };
  try {
    const raw = JSON.parse(fs.readFileSync(path.resolve(STEM_MARKING_TRUSTED_MANIFEST_PATH), "utf8"));
    if (raw?.schemaVersion !== STEM_MARKING_MANIFEST_SCHEMA_VERSION || !Array.isArray(raw.questions) || !raw.questions.length) {
      throw new Error("Invalid trusted STEM marking manifest.");
    }
    const entries = new Map();
    raw.questions.forEach((value, index) => {
      const question = value && typeof value === "object" ? value : {};
      const routeId = stemManifestId(question.routeId, `questions[${index}].routeId`);
      const qualification = safeStemText(question.qualification, 120);
      const specificationVersion = safeStemText(question.specificationVersion, 120);
      const paperId = stemManifestId(question.paperId, `questions[${index}].paperId`);
      const questionPartId = stemManifestId(question.questionPartId, `questions[${index}].questionPartId`);
      const sourceQuestionId = stemManifestId(question.sourceQuestionId, `questions[${index}].sourceQuestionId`);
      const prompt = safeStemText(question.prompt, 12_000);
      const availableMarks = Number(question.availableMarks);
      const review = question.review && typeof question.review === "object" ? question.review : {};
      const reviewStatus = safeStemText(review.status || question.reviewStatus, 40).toLowerCase();
      const reviewSchemaVersion = safeStemText(review.schemaVersion || question.reviewSchemaVersion, 120);
      const reviewVersion = safeStemText(review.version || question.reviewVersion, 160);
      const sourceEvidence = safeStemEvidence(question.sourceEvidence || review.sourceEvidence, 900);
      if (!qualification || !specificationVersion || !prompt || !sourceQuestionId
        || !Number.isFinite(availableMarks) || availableMarks <= 0 || availableMarks > 1000
        || !STEM_MARKING_REVIEW_STATUSES.has(reviewStatus)
        || !reviewSchemaVersion || !reviewVersion || !sourceEvidence) {
        throw new Error("Trusted STEM marking question metadata is incomplete.");
      }
      if (reviewStatus === "approved" && reviewSchemaVersion !== STEM_MARKING_REVIEW_SCHEMA_VERSION) {
        throw new Error("Trusted STEM marking review schema is invalid.");
      }
      const pointIds = new Set();
      const markSchemePoints = (Array.isArray(question.markSchemePoints) ? question.markSchemePoints.slice(0, 80) : []).map((point, pointIndex) => {
        const pointId = stemManifestId(point?.pointId, `questions[${index}].markSchemePoints[${pointIndex}].pointId`);
        const maxMarks = Number(point?.maxMarks ?? point?.marks);
        const text = safeStemText(point?.text || point?.criterion || "", 2400);
        if (pointIds.has(pointId) || !Number.isFinite(maxMarks) || maxMarks <= 0 || maxMarks > 100 || !text) {
          throw new Error("Trusted STEM marking point metadata is invalid.");
        }
        pointIds.add(pointId);
        return { pointId, maxMarks, text, sourceEvidence: safeStemEvidence(point?.sourceEvidence, 900) };
      });
      if (!markSchemePoints.length || markSchemePoints.reduce((total, point) => total + point.maxMarks, 0) !== availableMarks) {
        throw new Error("Trusted STEM marking allocation is invalid.");
      }
      const assetIds = new Set();
      const assets = (Array.isArray(question.assets) ? question.assets.slice(0, 8) : []).map((asset, assetIndex) => {
        const assetId = stemManifestId(asset?.assetId, `questions[${index}].assets[${assetIndex}].assetId`);
        if (assetIds.has(assetId)) throw new Error("Trusted STEM marking asset metadata is invalid.");
        assetIds.add(assetId);
        return {
          assetId,
          kind: safeStemText(asset?.kind || "source", 40),
          label: safeStemText(asset?.label || "", 240),
          checksum: safeStemText(asset?.checksum || "", 160),
          sourceEvidence: safeStemEvidence(asset?.sourceEvidence, 900),
        };
      });
      const entry = {
        routeId,
        qualification,
        specificationVersion,
        paperId,
        questionPartId,
        sourceQuestionId,
        prompt,
        availableMarks,
        markSchemePoints,
        assets,
        reviewStatus,
        reviewSchemaVersion,
        reviewVersion,
        sourceEvidence,
      };
      const key = stemManifestQuestionKey(entry);
      if (entries.has(key)) throw new Error("Duplicate trusted STEM marking question.");
      entries.set(key, entry);
    });
    return { ready: true, entries };
  } catch {
    // Configuration diagnostics stay server-side. STEM receives only safe availability booleans.
    return { ready: false, entries: new Map() };
  }
}

const TRUSTED_STEM_MARKING_MANIFEST = loadTrustedStemMarkingManifest();

function stemMarkingModelConfigured() {
  return Boolean(!STEM_MARKING_AI_DISABLED && STEM_MARKING_AI_API_KEY && STEM_MARKING_AI_BASE_URL && STEM_MARKING_AI_MODEL);
}

function stemMarkingQueueAvailable() {
  const hasApprovedQuestion = TRUSTED_STEM_MARKING_MANIFEST.ready
    && [...TRUSTED_STEM_MARKING_MANIFEST.entries.values()].some((entry) => entry.reviewStatus === "approved");
  return Boolean(stemMarkingModelConfigured() && hasApprovedQuestion && !STEM_MARKING_QUEUE_DISABLED);
}

function sameStemMarkingPointSet(provided, canonical) {
  if (!Array.isArray(provided) || provided.length !== canonical.length) return false;
  const byId = new Map(provided.map((point) => [point.pointId, point]));
  return canonical.every((point) => {
    const received = byId.get(point.pointId);
    return Boolean(received && Number(received.maxMarks) === Number(point.maxMarks) && safeStemText(received.text, 2400) === point.text);
  });
}

function sameStemEvidence(provided, canonical) {
  const left = safeStemEvidence(provided, 900);
  const right = safeStemEvidence(canonical, 900);
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalizeStemMarkingQuestion(request, question) {
  const canonical = TRUSTED_STEM_MARKING_MANIFEST.entries.get(stemManifestQuestionKey({
    routeId: request.routeId,
    specificationVersion: request.specificationVersion,
    paperId: request.paperId,
    questionPartId: question.questionPartId,
  }));
  const issues = [...question.metadataIssues];
  if (!canonical) {
    issues.push("source_question_unknown");
    return { ...question, metadataIssues: [...new Set(issues)] };
  }
  if (canonical.reviewStatus === "quarantined") issues.push("source_question_quarantined");
  else if (canonical.reviewStatus === "stale") issues.push("source_question_stale");
  else if (canonical.reviewStatus !== "approved") issues.push("source_question_unreviewed");
  if (question.sourceQuestionId !== canonical.sourceQuestionId) issues.push("source_question_id_mismatch");
  if (question.reviewSchemaVersion !== canonical.reviewSchemaVersion
    || question.reviewVersion !== canonical.reviewVersion
    || !sameStemEvidence(question.sourceEvidence, canonical.sourceEvidence)) {
    issues.push("source_review_mismatch");
  }
  if (question.prompt !== canonical.prompt
    || request.qualification !== canonical.qualification
    || Number(question.availableMarks) !== Number(canonical.availableMarks)
    || !sameStemMarkingPointSet(question.markSchemePoints, canonical.markSchemePoints)) {
    issues.push("trusted_manifest_mismatch");
  }
  const suppliedAssets = new Map(question.assets.map((asset) => [asset.assetId, asset]));
  const assets = canonical.assets.map((asset) => {
    const supplied = suppliedAssets.get(asset.assetId);
    if (!supplied || (asset.checksum && supplied.checksum !== asset.checksum)) issues.push("trusted_asset_mismatch");
    return { ...asset, imageDataUrl: supplied?.imageDataUrl || "" };
  });
  return {
    ...question,
    qualification: canonical.qualification,
    prompt: canonical.prompt,
    availableMarks: canonical.availableMarks,
    markSchemePoints: canonical.markSchemePoints,
    assets,
    sourceQuestionId: canonical.sourceQuestionId,
    reviewStatus: canonical.reviewStatus,
    reviewSchemaVersion: canonical.reviewSchemaVersion,
    reviewVersion: canonical.reviewVersion,
    sourceEvidence: canonical.sourceEvidence,
    metadataIssues: [...new Set(issues)],
  };
}

function parseStemImageDataUrl(value) {
  const match = String(value || "").match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) return "";
  const encoded = match[2].replace(/\s+/g, "");
  if (!encoded || Buffer.byteLength(encoded, "utf8") > 10 * 1024 * 1024) return "";
  return `data:image/${match[1].toLowerCase()};base64,${encoded}`;
}

function verifyStemIdentityToken(token) {
  if (!STEM_IDENTITY_SIGNING_KEY || !token || token.split(".").length !== 3) return null;
  const [header, body, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", STEM_IDENTITY_SIGNING_KEY).update(`${header}.${body}`).digest("base64url");
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (claims.iss !== "ieltsist.com" || claims.aud !== "stem.ieltsist.com" || Number(claims.exp) <= Math.floor(Date.now() / 1000)) return null;
    const match = String(claims.sub || "").match(/^ielts:(\d+)$/);
    return match ? { userId: Number(match[1]) } : null;
  } catch {
    return null;
  }
}

function requireStemActor(req) {
  const auth = String(req.headers.authorization || "");
  const suppliedIdentity = String(req.headers["x-stem-identity"] || "").trim()
    || (auth.match(/^Bearer\s+(.+)$/i)?.[1]?.includes(".") ? auth.match(/^Bearer\s+(.+)$/i)?.[1] : "");
  const identity = verifyStemIdentityToken(suppliedIdentity);
  if (identity) {
    const user = getAppDb().prepare("SELECT * FROM users WHERE id = ?").get(identity.userId);
    if (!user) throw stemMarkingError("Shared sign-in is no longer valid. Please sign in again.", 401);
    return user;
  }
  return requireUser(req);
}

function applyStemMarkingCors(req, res) {
  const origin = String(req.headers.origin || "");
  if (!origin) return;
  if (!applyStemCors(req, res, "GET,POST,PUT,DELETE,OPTIONS")) {
    throw stemMarkingError("This origin is not allowed to access STEM marking.", 403);
  }
}

function stemMarkingEvent(db, submissionId, status, code) {
  db.prepare("INSERT INTO stem_marking_events (event_id, submission_id, status, code, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), submissionId, status, safeStemText(code, 100) || "status_changed", nowIso());
}

function normalizeStemMarkingQuestion(value, index) {
  const question = value && typeof value === "object" ? value : {};
  const questionPartId = stemStableId(question.questionPartId, `questions[${index}].questionPartId`);
  const prompt = safeStemText(question.prompt, 12_000);
  const availableMarks = Number(question.availableMarks);
  const issues = [];
  const sourceQuestionId = (() => {
    try {
      return stemManifestId(question.sourceQuestionId ?? question.source_question_id, `questions[${index}].sourceQuestionId`);
    } catch {
      issues.push("source_question_id_missing");
      return "";
    }
  })();
  const reviewSchemaVersion = safeStemText(question.reviewSchemaVersion ?? question.review_schema_version, 120);
  const reviewVersion = safeStemText(question.reviewVersion ?? question.review_version, 160);
  const sourceEvidence = safeStemEvidence(question.sourceEvidence ?? question.source_evidence, 900);
  if (!reviewSchemaVersion || !reviewVersion || !sourceEvidence) issues.push("source_review_missing");
  if (!prompt) issues.push("question_prompt_missing");
  if (!Number.isFinite(availableMarks) || availableMarks <= 0 || availableMarks > 1000) issues.push("available_marks_missing");
  const rawPoints = Array.isArray(question.markSchemePoints) ? question.markSchemePoints.slice(0, 80) : [];
  if (!rawPoints.length) issues.push("mark_scheme_missing");
  const markSchemePoints = [];
  const pointIds = new Set();
  for (let pointIndex = 0; pointIndex < rawPoints.length; pointIndex += 1) {
    const point = rawPoints[pointIndex] && typeof rawPoints[pointIndex] === "object" ? rawPoints[pointIndex] : {};
    let pointId = "";
    try {
      pointId = stemStableId(point.pointId, `markSchemePoints[${pointIndex}].pointId`);
    } catch {
      issues.push("mark_scheme_point_id_invalid");
      continue;
    }
    const maxMarks = Number(point.maxMarks ?? point.marks);
    const text = safeStemText(point.text || point.criterion || "", 2400);
    if (pointIds.has(pointId) || !Number.isFinite(maxMarks) || maxMarks <= 0 || maxMarks > 100 || !text) {
      issues.push("mark_scheme_point_invalid");
      continue;
    }
    pointIds.add(pointId);
    markSchemePoints.push({ pointId, maxMarks, text, sourceEvidence: safeStemEvidence(point.sourceEvidence, 900) });
  }
  const totalPointMarks = markSchemePoints.reduce((total, point) => total + point.maxMarks, 0);
  if (Number.isFinite(availableMarks) && markSchemePoints.length && totalPointMarks !== availableMarks) issues.push("mark_allocation_mismatch");
  const answer = question.answer && typeof question.answer === "object" ? question.answer : {};
  const typedText = safeStemText(answer.typedText ?? answer.text ?? question.typedAnswer ?? "", 24_000);
  const handwritingImageDataUrl = parseStemImageDataUrl(answer.handwritingImageDataUrl ?? answer.imageDataUrl ?? question.handwritingImageDataUrl ?? "");
  const rawAssets = Array.isArray(question.assets) ? question.assets.slice(0, 8) : [];
  const assets = rawAssets.map((asset, assetIndex) => {
    const imageDataUrl = parseStemImageDataUrl(asset?.imageDataUrl || "");
    if (asset?.imageDataUrl && !imageDataUrl) issues.push("asset_image_invalid");
    return {
      assetId: stemOptionalId(asset?.assetId || `asset-${assetIndex + 1}`, `assets[${assetIndex}].assetId`),
      kind: safeStemText(asset?.kind || "source", 40),
      label: safeStemText(asset?.label || "", 240),
      checksum: safeStemText(asset?.checksum || "", 160),
      imageDataUrl,
      sourceEvidence: safeStemEvidence(asset?.sourceEvidence, 900),
    };
  });
  return {
    questionPartId,
    prompt,
    availableMarks: Number.isFinite(availableMarks) ? availableMarks : null,
    markSchemePoints,
    answer: { typedText, handwritingImageDataUrl },
    answerAvailable: Boolean(typedText || handwritingImageDataUrl),
    assets,
    // Client review flags are intentionally ignored. Only the configured manifest
    // determines whether a source question is approved for AI-assisted marking.
    sourceQuestionId,
    reviewSchemaVersion,
    reviewVersion,
    sourceEvidence,
    metadataIssues: [...new Set(issues)],
  };
}

function normalizeStemMarkingRequest(payload) {
  const submissionId = stemStableId(payload?.submissionId, "submissionId");
  const idempotencyKey = stemStableId(payload?.idempotencyKey || submissionId, "idempotencyKey");
  const questionsRaw = Array.isArray(payload?.questions) ? payload.questions.slice(0, 80) : [];
  if (!questionsRaw.length) throw stemMarkingError("At least one question is required.");
  const questions = questionsRaw.map(normalizeStemMarkingQuestion);
  const specificationVersion = safeStemText(payload?.specificationVersion, 120);
  const qualification = safeStemText(payload?.qualification, 120);
  if (!specificationVersion || !qualification) throw stemMarkingError("Invalid marking qualification or specificationVersion.");
  const request = {
    schemaVersion: "stem-marking.v1",
    submissionId,
    idempotencyKey,
    routeId: stemStableId(payload?.routeId, "routeId"),
    qualification,
    specificationVersion,
    paperId: stemStableId(payload?.paperId, "paperId"),
    attemptId: stemStableId(payload?.attemptId, "attemptId"),
    organizationId: stemOptionalId(payload?.organizationId, "organizationId"),
    classroomId: stemOptionalId(payload?.classroomId, "classroomId"),
    questions,
  };
  request.questions = request.questions.map((question) => canonicalizeStemMarkingQuestion(request, question));
  const canonicalQualifications = new Set(request.questions.map((question) => question.qualification).filter(Boolean));
  if (canonicalQualifications.size === 1) request.qualification = [...canonicalQualifications][0];
  request.metadataIssues = [...new Set(request.questions.flatMap((question) => question.metadataIssues))];
  return request;
}

function stemMetadataFailureCode(issues = []) {
  const issueSet = new Set(issues.map((issue) => String(issue || "")));
  if (issueSet.has("source_question_quarantined")) return "source_question_quarantined";
  if (issueSet.has("source_question_stale")) return "source_question_stale";
  if (issueSet.has("source_question_unreviewed")) return "source_question_unreviewed";
  if (issueSet.has("source_question_unknown")) return "source_question_unknown";
  if (issueSet.has("source_question_id_mismatch") || issueSet.has("source_review_mismatch")) return "source_provenance_mismatch";
  if (issueSet.has("source_question_id_missing") || issueSet.has("source_review_missing")) return "source_provenance_missing";
  return "missing_metadata";
}

function stemEmptyResult(request, status, failureCode = "") {
  const maxMarks = request.questions.reduce((total, question) => total + (Number(question.availableMarks) || 0), 0);
  return {
    schemaVersion: "stem-marking.v1",
    status,
    awardedMarks: null,
    maxMarks: maxMarks || null,
    confidence: null,
    reviewRequired: true,
    failureCode: failureCode || null,
    questions: request.questions.map((question) => question.answerAvailable ? ({
      questionPartId: question.questionPartId,
      awardedMarks: null,
      maxMarks: question.availableMarks,
      markPoints: question.markSchemePoints.map((point) => ({
        pointId: point.pointId,
        awardedMarks: null,
        maxMarks: point.maxMarks,
        studentEvidence: null,
        sourceEvidence: point.sourceEvidence,
        confidence: null,
        reviewRequired: true,
      })),
      batchStatus: "pending",
      reviewRequired: true,
    }) : stemEmptyAnswerQuestion(question)),
  };
}

function stemEmptyAnswerQuestion(question) {
  return {
    questionPartId: question.questionPartId,
    awardedMarks: 0,
    maxMarks: question.availableMarks,
    markPoints: question.markSchemePoints.map((point) => ({
      pointId: point.pointId,
      awardedMarks: 0,
      maxMarks: point.maxMarks,
      reason: "No student answer was submitted for this question.",
      studentEvidence: null,
      sourceEvidence: point.sourceEvidence,
      confidence: 1,
      reviewRequired: false,
    })),
    confidence: 1,
    batchStatus: "completed",
    reviewRequired: false,
  };
}

function stemAggregateResult(request, questions, status, failureCode = "") {
  const awarded = questions.map((question) => Number(question.awardedMarks)).filter(Number.isFinite);
  const confidenceValues = questions.map((question) => Number(question.confidence)).filter(Number.isFinite);
  return {
    schemaVersion: "stem-marking.v1",
    status,
    awardedMarks: awarded.length ? awarded.reduce((total, value) => total + value, 0) : null,
    maxMarks: request.questions.reduce((total, question) => total + (Number(question.availableMarks) || 0), 0) || null,
    confidence: confidenceValues.length ? confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length : null,
    reviewRequired: status !== "completed" || questions.some((question) => question.reviewRequired),
    failureCode: failureCode || null,
    questions,
  };
}

function stemProcessingResult(request, existingResult = null) {
  const previous = new Map((existingResult?.questions || []).map((question) => [question.questionPartId, question]));
  const questions = request.questions.map((question) => {
    const prior = previous.get(question.questionPartId);
    if (prior?.batchStatus === "completed") return prior;
    return question.answerAvailable ? {
      questionPartId: question.questionPartId,
      awardedMarks: null,
      maxMarks: question.availableMarks,
      markPoints: question.markSchemePoints.map((point) => ({
        pointId: point.pointId,
        awardedMarks: null,
        maxMarks: point.maxMarks,
        studentEvidence: null,
        sourceEvidence: point.sourceEvidence,
        confidence: null,
        reviewRequired: true,
      })),
      batchStatus: "pending",
      reviewRequired: true,
    } : stemEmptyAnswerQuestion(question);
  });
  return stemAggregateResult(request, questions, "processing");
}

function safeStemJson(value, label, limit = 24_000_000) {
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json) > limit) throw stemMarkingError(`${label} is too large.`);
  return json;
}

function stemMembershipForUser(userId, organizationId, classroomId = "") {
  if (!organizationId) return null;
  return getAppDb().prepare(`
    SELECT * FROM stem_organization_memberships
    WHERE user_id = ? AND organization_id = ? AND (classroom_id = ? OR classroom_id = '')
    ORDER BY CASE WHEN classroom_id = ? THEN 0 ELSE 1 END
    LIMIT 1
  `).get(userId, organizationId, classroomId, classroomId) || null;
}

function assertStemSubmissionScope(user, request) {
  if (!request.organizationId) return;
  const membership = stemMembershipForUser(user.id, request.organizationId, request.classroomId);
  if (!membership) throw stemMarkingError("You are not enrolled in this STEM classroom.", 403);
}

function canManageStemOrganization(user, organizationId) {
  const globalRoles = getUserRoles(user.id);
  // Only platform-level owners/staff may bootstrap a new organization. School admins
  // must also belong to the target organization before they can manage its roster.
  if (globalRoles.some((role) => ["school_owner", "staff"].includes(role))) return true;
  const membership = stemMembershipForUser(user.id, organizationId, "");
  return Boolean(membership && ["school_admin", "school_owner"].includes(membership.role));
}

function canReadStemOrganization(user, organizationId, classroomId) {
  const membership = stemMembershipForUser(user.id, organizationId, classroomId);
  if (!membership) return false;
  return ["teacher", "school_admin", "school_owner"].includes(membership.role);
}

function publicStemMarkingSubmission(row, includeEvents = true) {
  const request = parseStoredJson(row.request_json, {});
  const events = includeEvents
    ? getAppDb().prepare("SELECT status, code, created_at FROM stem_marking_events WHERE submission_id = ? ORDER BY created_at ASC").all(row.submission_id)
      .map((event) => ({ status: event.status, code: event.code, at: event.created_at }))
    : [];
  return {
    submissionId: row.submission_id,
    idempotencyKey: row.idempotency_key,
    routeId: row.route_id,
    specificationVersion: row.specification_version,
    paperId: row.paper_id,
    attemptId: row.attempt_id,
    organizationId: row.organization_id || "",
    classroomId: row.classroom_id || "",
    status: row.status,
    result: parseStoredJson(row.result_json, stemEmptyResult(request, row.status, row.failure_code || "")),
    retryable: row.status === "failed",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || "",
    events,
  };
}

function providerFailureCode(error) {
  const message = String(error?.message || "");
  return /invalid structured marking response/i.test(message) ? "invalid_model_output" : "provider_unavailable";
}

async function callStemMarkingAI(question, request) {
  if (!STEM_MARKING_AI_API_KEY) throw new Error("STEM marking provider is unavailable.");
  const questionPayload = {
    qualification: request.qualification,
    specificationVersion: request.specificationVersion,
    paperId: request.paperId,
    questionPartId: question.questionPartId,
    prompt: question.prompt,
    availableMarks: question.availableMarks,
    markSchemePoints: question.markSchemePoints.map((point) => ({ pointId: point.pointId, maxMarks: point.maxMarks, text: point.text })),
    typedAnswer: question.answer.typedText || "[No typed answer; inspect labelled student handwriting if present.]",
    assets: question.assets.map((asset) => ({ assetId: asset.assetId, kind: asset.kind, label: asset.label, checksum: asset.checksum })),
  };
  const content = [{
    type: "text",
    text: [
    "Assess the STEM student work only against the supplied question-level mark scheme.",
    "Return strict JSON only: {questions:[{questionPartId,markPoints:[{pointId,awardedMarks,reason,studentEvidence,confidence,reviewRequired}]}]}.",
    "Use only supplied point IDs. awardedMarks must be between zero and that point's maxMarks. Do not invent mark scheme points.",
    JSON.stringify(questionPayload),
    ].join("\n\n"),
  }];
  // Bound images per question, not per paper. The role marker is immediately before
  // its image so multimodal providers cannot confuse source diagrams with handwriting.
  question.assets.filter((asset) => asset.imageDataUrl).slice(0, 8).forEach((asset) => {
    content.push({ type: "text", text: `[questionPartId=${question.questionPartId}][role=question_asset][assetId=${asset.assetId}]` });
    content.push({ type: "image_url", image_url: { url: asset.imageDataUrl } });
  });
  if (question.answer.handwritingImageDataUrl) {
    content.push({ type: "text", text: `[questionPartId=${question.questionPartId}][role=student_handwriting]` });
    content.push({ type: "image_url", image_url: { url: question.answer.handwritingImageDataUrl } });
  }
  const response = await fetch(`${STEM_MARKING_AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${STEM_MARKING_AI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: STEM_MARKING_AI_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: [
          `You are a careful Cambridge ${request.qualification} examiner for ${request.specificationVersion}, paper ${request.paperId}.`,
          "This is AI-assisted formative marking, not an official Cambridge result.",
          "Assess only against the supplied canonical question-level mark points. Return valid JSON only, no markdown.",
        ].join(" ") },
        { role: "user", content },
      ],
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error("STEM marking provider failed.");
  let parsed = null;
  try {
    parsed = JSON.parse(chatCompletionTextFromJson(JSON.parse(body || "{}")) || "");
  } catch {
    const content = chatCompletionTextFromJson(JSON.parse(body || "{}"));
    const clean = String(content || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    try { parsed = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1)); } catch {}
  }
  if (!parsed || !Array.isArray(parsed.questions)) throw new Error("Invalid structured marking response.");
  return parsed;
}

function normalizeStemMarkingProviderResult(request, raw) {
  const rawQuestions = new Map((raw.questions || []).map((question) => [String(question?.questionPartId || ""), question]));
  let anyRecognizedPoint = false;
  const questions = request.questions.map((question) => {
    const rawQuestion = rawQuestions.get(question.questionPartId) || {};
    const rawPoints = new Map((Array.isArray(rawQuestion.markPoints) ? rawQuestion.markPoints : []).map((point) => [String(point?.pointId || ""), point]));
    const markPoints = question.markSchemePoints.map((point) => {
      const rawPoint = rawPoints.get(point.pointId);
      if (rawPoint) anyRecognizedPoint = true;
      const rawAward = rawPoint?.awardedMarks ?? rawPoint?.marks ?? (rawPoint?.awarded === true ? point.maxMarks : 0);
      const awardedMarks = Math.max(0, Math.min(point.maxMarks, Number(rawAward) || 0));
      const confidenceValue = Number(rawPoint?.confidence);
      const confidence = Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : 0;
      return {
        pointId: point.pointId,
        awardedMarks,
        maxMarks: point.maxMarks,
        reason: safeStemText(rawPoint?.reason || (rawPoint ? "Mark point assessed." : "Model did not return this mark point."), 900),
        studentEvidence: safeStemEvidence(rawPoint?.studentEvidence || { quote: rawPoint?.evidence || "" }, 900),
        sourceEvidence: point.sourceEvidence,
        confidence,
        reviewRequired: Boolean(rawPoint?.reviewRequired) || !rawPoint || confidence < 0.6,
      };
    });
    const awardedMarks = markPoints.reduce((total, point) => total + point.awardedMarks, 0);
    return {
      questionPartId: question.questionPartId,
      awardedMarks,
      maxMarks: question.availableMarks,
      markPoints,
      confidence: markPoints.length ? markPoints.reduce((total, point) => total + point.confidence, 0) / markPoints.length : 0,
      batchStatus: "completed",
      reviewRequired: markPoints.some((point) => point.reviewRequired),
    };
  });
  if (!anyRecognizedPoint) throw new Error("Invalid structured marking response.");
  const awardedMarks = questions.reduce((total, question) => total + question.awardedMarks, 0);
  const maxMarks = questions.reduce((total, question) => total + question.maxMarks, 0);
  return {
    schemaVersion: "stem-marking.v1",
    status: "completed",
    awardedMarks,
    maxMarks,
    confidence: questions.length ? questions.reduce((total, question) => total + question.confidence, 0) / questions.length : 0,
    reviewRequired: questions.some((question) => question.reviewRequired),
    failureCode: null,
    questions,
  };
}

async function processStemMarkingSubmission(submissionId) {
  if (stemMarkingInFlight.has(submissionId)) return;
  if (!stemMarkingQueueAvailable()) return;
  stemMarkingInFlight.add(submissionId);
  const db = getAppDb();
  try {
    const row = db.prepare("SELECT * FROM stem_marking_submissions WHERE submission_id = ?").get(submissionId);
    if (!row || row.status !== "queued") return;
    const request = parseStoredJson(row.request_json, {});
    let result = stemProcessingResult(request, parseStoredJson(row.result_json, null));
    db.prepare("UPDATE stem_marking_submissions SET status = 'processing', processing_attempts = processing_attempts + 1, updated_at = ? WHERE submission_id = ? AND status = 'queued'")
      .run(nowIso(), submissionId);
    stemMarkingEvent(db, submissionId, "processing", "provider_requested");
    db.prepare("UPDATE stem_marking_submissions SET result_json = ?, updated_at = ? WHERE submission_id = ?")
      .run(safeStemJson(result, "Marking progress", 2_000_000), nowIso(), submissionId);
    try {
      for (const question of request.questions) {
        const currentQuestion = result.questions.find((item) => item.questionPartId === question.questionPartId);
        if (currentQuestion?.batchStatus === "completed") continue;
        try {
          const providerResult = await callStemMarkingAI(question, request);
          const normalized = normalizeStemMarkingProviderResult({ questions: [question] }, providerResult);
          const index = result.questions.findIndex((item) => item.questionPartId === question.questionPartId);
          result.questions[index] = normalized.questions[0];
          result = stemAggregateResult(request, result.questions, "processing");
          db.prepare("UPDATE stem_marking_submissions SET result_json = ?, updated_at = ? WHERE submission_id = ?")
            .run(safeStemJson(result, "Marking progress", 2_000_000), nowIso(), submissionId);
          stemMarkingEvent(db, submissionId, "processing", `question_completed:${question.questionPartId}`);
        } catch (error) {
          const index = result.questions.findIndex((item) => item.questionPartId === question.questionPartId);
          result.questions[index] = {
            ...result.questions[index],
            batchStatus: "failed",
            reviewRequired: true,
            failureCode: providerFailureCode(error),
          };
          throw error;
        }
      }
      result = stemAggregateResult(request, result.questions, "completed");
      const completedAt = nowIso();
      db.prepare("UPDATE stem_marking_submissions SET status = 'completed', result_json = ?, failure_code = NULL, updated_at = ?, completed_at = ? WHERE submission_id = ?")
        .run(safeStemJson(result, "Marking result", 2_000_000), completedAt, completedAt, submissionId);
      stemMarkingEvent(db, submissionId, "completed", "marks_available");
    } catch (error) {
      const failureCode = providerFailureCode(error);
      const failedResult = stemAggregateResult(request, result.questions, "failed", failureCode);
      db.prepare("UPDATE stem_marking_submissions SET status = 'failed', result_json = ?, failure_code = ?, updated_at = ? WHERE submission_id = ?")
        .run(safeStemJson(failedResult, "Marking failure", 2_000_000), failureCode, nowIso(), submissionId);
      stemMarkingEvent(db, submissionId, "failed", failureCode);
    }
  } finally {
    stemMarkingInFlight.delete(submissionId);
  }
}

function enqueueStemMarkingSubmission(submissionId) {
  const task = setImmediate(() => { processStemMarkingSubmission(submissionId).catch(() => {}); });
  task.unref?.();
}

function assertStemSubmissionReadable(user, row) {
  if (Number(row.user_id) === Number(user.id)) return "student";
  // Staff reports are deliberately aggregate-only. Individual submitted handwriting and
  // evidence remain visible only to the student who submitted it.
  throw stemMarkingError("Individual STEM submissions are available only to the submitting student.", 403);
}

function handleStemMarkingAvailability(req, res) {
  let authenticated = true;
  try {
    requireStemActor(req);
  } catch (error) {
    if (Number(error?.statusCode) !== 401) throw error;
    authenticated = false;
  }
  const modelConfigured = stemMarkingModelConfigured();
  const queueAvailable = stemMarkingQueueAvailable();
  sendJson(res, 200, {
    enabled: Boolean(authenticated && queueAvailable),
    modelConfigured,
    queueAvailable,
    authenticationRequired: !authenticated,
  });
}

async function handleStemMarkingSubmissionCreate(req, res) {
  const user = requireStemActor(req);
  if (!stemMarkingQueueAvailable()) {
    sendJson(res, 503, { error: "Structured STEM marking is not configured.", code: "marking_unavailable" });
    return;
  }
  const request = normalizeStemMarkingRequest(await readJsonBody(req));
  assertStemSubmissionScope(user, request);
  const db = getAppDb();
  const existing = db.prepare("SELECT * FROM stem_marking_submissions WHERE user_id = ? AND (submission_id = ? OR idempotency_key = ?) LIMIT 1")
    .get(user.id, request.submissionId, request.idempotencyKey);
  if (existing) {
    sendJson(res, 200, { submission: publicStemMarkingSubmission(existing), idempotent: true });
    return;
  }
  if (db.prepare("SELECT 1 FROM stem_marking_submissions WHERE submission_id = ?").get(request.submissionId)) {
    throw stemMarkingError("Submission id already exists.", 409);
  }
  const status = request.metadataIssues.length ? "missing_metadata" : "queued";
  const metadataFailureCode = status === "missing_metadata" ? stemMetadataFailureCode(request.metadataIssues) : "";
  const timestamp = nowIso();
  const result = stemEmptyResult(request, status, metadataFailureCode);
  db.prepare(`
    INSERT INTO stem_marking_submissions (submission_id, idempotency_key, user_id, organization_id, classroom_id, route_id, specification_version, paper_id, attempt_id, request_json, status, result_json, failure_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    request.submissionId, request.idempotencyKey, user.id, request.organizationId || null, request.classroomId || null,
    request.routeId, request.specificationVersion, request.paperId, request.attemptId, safeStemJson(request, "Marking request"), status,
    safeStemJson(result, "Marking result", 2_000_000), metadataFailureCode || null, timestamp, timestamp,
  );
  stemMarkingEvent(db, request.submissionId, status, status === "queued" ? "accepted_for_marking" : metadataFailureCode);
  const row = db.prepare("SELECT * FROM stem_marking_submissions WHERE submission_id = ?").get(request.submissionId);
  if (status === "queued") enqueueStemMarkingSubmission(request.submissionId);
  sendJson(res, status === "queued" ? 202 : 422, {
    submission: publicStemMarkingSubmission(row),
    idempotent: false,
    code: metadataFailureCode || undefined,
    metadataIssues: request.metadataIssues,
  });
}

// The legacy STEM handwriting route is a compatibility alias, not a second
// scoring system. It accepts only the same reviewed v2 submission contract.
async function handleStemHandwritingMarking(req, res) {
  applyStemMarkingCors(req, res);
  return handleStemMarkingSubmissionCreate(req, res);
}

function handleStemMarkingSubmissionGet(req, res, submissionId) {
  const user = requireStemActor(req);
  const row = getAppDb().prepare("SELECT * FROM stem_marking_submissions WHERE submission_id = ?").get(submissionId);
  if (!row) throw stemMarkingError("STEM submission not found.", 404);
  assertStemSubmissionReadable(user, row);
  sendJson(res, 200, { submission: publicStemMarkingSubmission(row) });
}

function handleStemMarkingRetry(req, res, submissionId) {
  const user = requireStemActor(req);
  const db = getAppDb();
  const row = db.prepare("SELECT * FROM stem_marking_submissions WHERE submission_id = ?").get(submissionId);
  if (!row) throw stemMarkingError("STEM submission not found.", 404);
  if (Number(row.user_id) !== Number(user.id)) throw stemMarkingError("Only the submitting student can retry marking.", 403);
  if (row.status === "missing_metadata") {
    const error = stemMarkingError("This STEM question is not ready for AI-assisted marking. Refresh the reviewed source before retrying.", 409);
    error.code = row.failure_code || "missing_metadata";
    throw error;
  }
  if (row.status === "completed") {
    sendJson(res, 200, { submission: publicStemMarkingSubmission(row), idempotent: true });
    return;
  }
  if (row.status === "queued" || row.status === "processing") {
    sendJson(res, 202, { submission: publicStemMarkingSubmission(row), idempotent: true });
    return;
  }
  if (!stemMarkingQueueAvailable()) {
    sendJson(res, 503, { error: "Structured STEM marking is not configured.", code: "marking_unavailable" });
    return;
  }
  const request = parseStoredJson(row.request_json, {});
  const timestamp = nowIso();
  db.prepare("UPDATE stem_marking_submissions SET status = 'queued', result_json = ?, failure_code = NULL, updated_at = ?, completed_at = NULL WHERE submission_id = ?")
    .run(safeStemJson(stemAggregateResult(request, stemProcessingResult(request, parseStoredJson(row.result_json, null)).questions, "queued"), "Marking retry", 2_000_000), timestamp, submissionId);
  stemMarkingEvent(db, submissionId, "queued", "retry_accepted");
  const updated = db.prepare("SELECT * FROM stem_marking_submissions WHERE submission_id = ?").get(submissionId);
  enqueueStemMarkingSubmission(submissionId);
  sendJson(res, 202, { submission: publicStemMarkingSubmission(updated), idempotent: false });
}

function handleStemMarkingOrganizationSummary(req, res, organizationId) {
  const user = requireStemActor(req);
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const classroomId = stemOptionalId(url.searchParams.get("classroomId"), "classroomId");
  if (!canReadStemOrganization(user, organizationId, classroomId)) throw stemMarkingError("You do not have permission to view this classroom summary.", 403);
  const db = getAppDb();
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS submissions, COALESCE(SUM(CAST(json_extract(result_json, '$.awardedMarks') AS REAL)), 0) AS awarded_marks,
      COALESCE(SUM(CAST(json_extract(result_json, '$.maxMarks') AS REAL)), 0) AS max_marks
    FROM stem_marking_submissions
    WHERE organization_id = ? ${classroomId ? "AND classroom_id = ?" : ""}
    GROUP BY status
  `).all(...(classroomId ? [organizationId, classroomId] : [organizationId]));
  const total = rows.reduce((count, row) => count + Number(row.submissions), 0);
  sendJson(res, 200, {
    organizationId,
    classroomId,
    totalSubmissions: total,
    statuses: Object.fromEntries([...STEM_MARKING_STATUSES].map((status) => [status, Number(rows.find((row) => row.status === status)?.submissions || 0)])),
    awardedMarks: rows.reduce((sum, row) => sum + Number(row.awarded_marks || 0), 0),
    maxMarks: rows.reduce((sum, row) => sum + Number(row.max_marks || 0), 0),
  });
}

async function handleStemMarkingMembership(req, res, organizationId, targetUserId) {
  const user = requireStemActor(req);
  if (!canManageStemOrganization(user, organizationId)) throw stemMarkingError("You do not have permission to manage this organization.", 403);
  const db = getAppDb();
  if (req.method === "DELETE") {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const classroomId = stemOptionalId(url.searchParams.get("classroomId"), "classroomId");
    db.prepare("DELETE FROM stem_organization_memberships WHERE organization_id = ? AND classroom_id = ? AND user_id = ?")
      .run(organizationId, classroomId, targetUserId);
    sendJson(res, 200, { ok: true });
    return;
  }
  const payload = await readJsonBody(req);
  const classroomId = stemOptionalId(payload.classroomId, "classroomId");
  const role = String(payload.role || "").trim();
  if (!STEM_ORGANIZATION_ROLES.has(role)) throw stemMarkingError("Invalid organization role.");
  const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(targetUserId);
  if (!exists) throw stemMarkingError("User not found.", 404);
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO stem_organization_memberships (organization_id, classroom_id, user_id, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(organization_id, classroom_id, user_id) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at
  `).run(organizationId, classroomId, targetUserId, role, timestamp, timestamp);
  sendJson(res, 200, { membership: { organizationId, classroomId, userId: targetUserId, role } });
}

async function handleStemMarkingApi(req, res) {
  applyStemMarkingCors(req, res);
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/stem/marking/availability") return handleStemMarkingAvailability(req, res);
  if (req.method === "POST" && url.pathname === "/api/stem/marking/submissions") return handleStemMarkingSubmissionCreate(req, res);
  const retryMatch = url.pathname.match(/^\/api\/stem\/marking\/submissions\/([^/]+)\/retry$/);
  if (retryMatch && req.method === "POST") return handleStemMarkingRetry(req, res, stemStableId(decodeURIComponent(retryMatch[1]), "submissionId"));
  const submissionMatch = url.pathname.match(/^\/api\/stem\/marking\/submissions\/([^/]+)$/);
  if (submissionMatch && req.method === "GET") return handleStemMarkingSubmissionGet(req, res, stemStableId(decodeURIComponent(submissionMatch[1]), "submissionId"));
  const summaryMatch = url.pathname.match(/^\/api\/stem\/marking\/organizations\/([^/]+)\/summary$/);
  if (summaryMatch && req.method === "GET") return handleStemMarkingOrganizationSummary(req, res, stemStableId(decodeURIComponent(summaryMatch[1]), "organizationId"));
  const membershipMatch = url.pathname.match(/^\/api\/stem\/marking\/organizations\/([^/]+)\/members\/(\d+)$/);
  if (membershipMatch && (req.method === "PUT" || req.method === "DELETE")) {
    return handleStemMarkingMembership(req, res, stemStableId(decodeURIComponent(membershipMatch[1]), "organizationId"), Number(membershipMatch[2]));
  }
  throw stemMarkingError("STEM marking endpoint not found.", 404);
}

function recoverStemMarkingJobs() {
  if (!DatabaseSync) return;
  const db = getAppDb();
  const interrupted = db.prepare("SELECT submission_id FROM stem_marking_submissions WHERE status = 'processing'").all();
  for (const row of interrupted) {
    db.prepare("UPDATE stem_marking_submissions SET status = 'queued', updated_at = ? WHERE submission_id = ?").run(nowIso(), row.submission_id);
    stemMarkingEvent(db, row.submission_id, "queued", "recovered_after_restart");
  }
  db.prepare("SELECT submission_id FROM stem_marking_submissions WHERE status = 'queued'").all()
    .forEach((row) => enqueueStemMarkingSubmission(row.submission_id));
}

function resolveReportFont() {
  const candidates = [
    process.env.IELTSIST_REPORT_FONT,
    path.join(__dirname, "data", "fonts", "NotoSansCJKsc-Regular.otf"),
    path.join(__dirname, "data", "fonts", "NotoSansSC-Regular.otf"),
    path.join(__dirname, "data", "fonts", "NotoSansSC-Regular.ttf"),
    "/usr/share/fonts/truetype/arphic-gbsn00lp/gbsn00lp.ttf",
    "/usr/share/fonts/truetype/arphic-gkai00mp/gkai00mp.ttf",
    "/usr/share/fonts/truetype/lxgw-wenkai/LXGWWenKai-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/opentype/adobe-source-han-sans/SourceHanSansCN-Regular.otf",
    "C:\\Windows\\Fonts\\NotoSansSC-VF.ttf",
    "C:\\Windows\\Fonts\\simhei.ttf",
    "C:\\Windows\\Fonts\\Deng.ttf",
    "C:\\Windows\\Fonts\\msyh.ttc",
  ];
  return candidates.filter(Boolean).find((file) => fs.existsSync(file)) || null;
}

function createReportPdfDataUrl(title, body, options = {}) {
  return createStyledReportPdfDataUrl({
    title: title || "IELTS Report",
    subtitle: options.subtitle || title || "IELTS Report",
    prompt: options.prompt || "",
    body,
  });
}

function createWritingReportPdfDataUrl(prompt, body) {
  const taskTitle = /task\s*1/i.test(prompt) ? "IELTS Writing Task 1 Feedback Report" : "IELTS Writing Task 2 Feedback Report";
  return createStyledReportPdfDataUrl({
    title: taskTitle,
    subtitle: taskTitle,
    prompt,
    body,
  });
}

function createStyledReportPdfDataUrl({ title, subtitle, prompt, body }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const fontPath = resolveReportFont();
    if (fontPath) doc.font(fontPath);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => {
      const pdf = Buffer.concat(chunks);
      resolve(`data:application/pdf;base64,${pdf.toString("base64")}`);
    });

    const theme = {
      blue: "#18385f",
      text: "#1f2937",
      muted: "#6b7280",
      line: "#d9e2ef",
      promptBg: "#f3f6f9",
      promptBar: "#4f8ac8",
      feedbackBg: "#fff7e6",
      feedbackBar: "#d99a00",
      tableHead: "#eef3f8",
    };
    const margin = 50;
    const width = doc.page.width - margin * 2;
    const bottom = doc.page.height - 64;
    doc.y = 86;

    const ensureSpace = (height = 32) => {
      if (doc.y + height > bottom) {
        doc.addPage();
        doc.y = 86;
      }
    };
    const cleanInlineMarkdown = (text) =>
      String(text || "")
        .replace(/^>\s*/gm, "")
        .replace(/(^|\s)>\s*/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .trim();
    const textHeight = (text, size, textWidth = width, lineGap = 5) => {
      doc.fontSize(size);
      return doc.heightOfString(String(text || ""), { width: textWidth, lineGap });
    };
    const renderParagraph = (text, options = {}) => {
      const clean = cleanInlineMarkdown(text);
      if (!clean) return;
      const size = options.size || 12;
      const color = options.color || theme.text;
      const lineGap = options.lineGap ?? 5;
      const height = textHeight(clean, size, width, lineGap) + 6;
      ensureSpace(height);
      doc.fillColor(color).fontSize(size).text(clean, margin, doc.y, { width, lineGap });
      doc.moveDown(options.after ?? 0.55);
    };
    const renderHeading = (text) => {
      const clean = cleanInlineMarkdown(text);
      ensureSpace(48);
      doc.moveDown(0.25);
      doc.fillColor(theme.blue).fontSize(17).text(clean, margin, doc.y, { width });
      doc.moveTo(margin, doc.y + 8).lineTo(margin + width, doc.y + 8).strokeColor(theme.line).lineWidth(1).stroke();
      doc.moveDown(1.15);
    };
    const renderSubheading = (text) => {
      const clean = cleanInlineMarkdown(text);
      ensureSpace(32);
      doc.fillColor(theme.text).fontSize(13).text(clean, margin, doc.y, { width });
      doc.moveDown(0.55);
    };
    const renderCallout = (label, text, bg, bar) => {
      const clean = cleanInlineMarkdown(text);
      if (!clean) return;
      const full = label ? `${label}${clean}` : clean;
      const innerWidth = width - 26;
      const height = textHeight(full, 12, innerWidth, 5) + 22;
      ensureSpace(height + 8);
      const y = doc.y;
      doc.save();
      doc.rect(margin, y, width, height).fill(bg);
      doc.rect(margin, y, 4, height).fill(bar);
      doc.restore();
      doc.fillColor(theme.text).fontSize(12).text(full, margin + 16, y + 11, { width: innerWidth, lineGap: 5 });
      doc.y = y + height + 14;
    };
    const renderScoreTable = (rows) => {
      const parsed = rows
        .map((line) => line.trim())
        .filter((line) => line.includes("|") && !/^\|?\s*-+\s*\|/.test(line))
        .map((line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()))
        .filter((cells) => cells.length >= 2);
      if (!parsed.length) return;
      const header = parsed[0];
      const bodyRows = parsed.slice(1);
      const colWidths = [118, width - 176, 58];
      const drawRow = (cells, isHeader = false) => {
        const normalized = [cells[0] || "", cells[1] || "", cells[2] || ""].map(cleanInlineMarkdown);
        const heights = normalized.map((cell, index) => textHeight(cell, isHeader ? 10 : 9.5, colWidths[index] - 12, 3));
        const rowHeight = Math.max(30, ...heights.map((h) => h + 16));
        ensureSpace(rowHeight + 4);
        const y = doc.y;
        let x = margin;
        normalized.forEach((cell, index) => {
          doc.rect(x, y, colWidths[index], rowHeight).fillAndStroke(isHeader ? theme.tableHead : "#ffffff", theme.line);
          doc.fillColor(isHeader ? theme.blue : theme.text)
            .fontSize(isHeader ? 10 : 9.5)
            .text(cell, x + 6, y + 8, { width: colWidths[index] - 12, lineGap: 3 });
          x += colWidths[index];
        });
        doc.y = y + rowHeight;
      };
      drawRow(header, true);
      bodyRows.forEach((row) => drawRow(row, false));
      doc.moveDown(0.9);
    };

    doc.fillColor(theme.blue).fontSize(23).text(String(title || "IELTS Report"), margin, doc.y, { width });
    doc.moveDown(0.9);
    if (prompt) {
    renderCallout("Prompt: ", prompt, theme.promptBg, theme.promptBar);
    }

    const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
    let i = 0;
    let activeSection = "";
    let autoOriginalIndex = 1;
    let canAutoOriginal = false;
    let scoreHeadingRendered = false;
    while (i < lines.length) {
      let line = lines[i].trim();
      if (!line) {
        i += 1;
        continue;
      }
      if (/^-{3,}$/.test(line)) {
        i += 1;
        continue;
      }
      if (/^Prompt[:：]/.test(line)) {
        i += 1;
        while (i < lines.length && lines[i].trim()) i += 1;
        continue;
      }
      if (/^\|/.test(line) || line.includes(" | ")) {
        const tableLines = [];
        while (i < lines.length && (lines[i].includes("|") || /^\s*-+\s*$/.test(lines[i]))) {
          tableLines.push(lines[i]);
          i += 1;
        }
        if (!scoreHeadingRendered && /category\s*\|.*score/i.test(tableLines[0] || "")) {
          renderHeading("Score table");
          scoreHeadingRendered = true;
        }
        renderScoreTable(tableLines);
        continue;
      }
      if (/^#{1,6}\s+/.test(line)) line = line.replace(/^#{1,6}\s+/, "");
      if (/^(Paragraph-by-paragraph feedback|Score table|Improved model answer reference|Original vs revised comparison|Objective score details|IELTS mock exam report)/i.test(line)) {
        renderHeading(line);
        activeSection = line;
        canAutoOriginal = /^Paragraph-by-paragraph feedback/.test(line);
        if (/^Score table/i.test(line)) scoreHeadingRendered = true;
        i += 1;
        continue;
      }
      if (/^(Original paragraph\s*\d+|Task Response|Coherence|Lexical Resource|Grammatical Range|Overall\b)/i.test(line)) {
        if (/^Overall\b/i.test(line)) renderParagraph(line, { color: theme.blue, size: 13 });
        else {
          renderSubheading(line);
          if (/^Original paragraph\s*\d+/i.test(line)) {
            const match = line.match(/^Original paragraph\s*(\d+)/i);
            autoOriginalIndex = match ? Number(match[1]) + 1 : autoOriginalIndex + 1;
            canAutoOriginal = false;
          }
        }
        i += 1;
        continue;
      }
      if (/^Feedback[:：]/.test(line)) {
        canAutoOriginal = false;
        const feedback = [line.replace(/^Feedback[:：]\s*/, "")];
        i += 1;
        while (i < lines.length && lines[i].trim() && !/^(Original paragraph\s*\d+|Score table|Improved model answer reference|Original vs revised comparison|#{1,3}\s+)/.test(lines[i].trim())) {
          feedback.push(lines[i].trim());
          i += 1;
        }
        renderCallout("Feedback: ", feedback.join(" "), theme.feedbackBg, theme.feedbackBar);
        continue;
      }
      const paragraph = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() && !/^Feedback[:：]/.test(lines[i].trim()) && !/^(Paragraph-by-paragraph feedback|Score table|Improved model answer reference|Original vs revised comparison|Original paragraph\s*\d+|#{1,3}\s+)/.test(lines[i].trim()) && !lines[i].includes("|")) {
        paragraph.push(lines[i].trim());
        i += 1;
      }
      if (/^Paragraph-by-paragraph feedback/.test(activeSection) && canAutoOriginal) {
        renderSubheading(`Original paragraph ${autoOriginalIndex}`);
        autoOriginalIndex += 1;
        canAutoOriginal = false;
      }
      renderParagraph(paragraph.join(" "));
    }

    const range = doc.bufferedPageRange();
    const generatedAt = new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#111827").text(generatedAt, margin, 24, { width: 160 });
      doc.fontSize(8).fillColor("#111827").text(String(subtitle || title || "IELTS Report"), margin, 24, { align: "center", width });
      doc.fontSize(8).fillColor("#111827").text(`${i + 1}/${range.count}`, margin, doc.page.height - 32, {
        align: "right",
        width,
      });
    }
    doc.end();
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === ".html"
        ? "text/html; charset=utf-8"
        : ext === ".css"
          ? "text/css; charset=utf-8"
          : ext === ".js"
            ? "application/javascript; charset=utf-8"
            : ext === ".webp"
              ? "image/webp"
              : ext === ".png"
                ? "image/png"
                : ext === ".jpg" || ext === ".jpeg"
                  ? "image/jpeg"
                  : ext === ".pdf"
                    ? "application/pdf"
                    : ext === ".mp3"
                      ? "audio/mpeg"
                      : ext === ".m4a"
                        ? "audio/mp4"
                        : ext === ".wav"
                          ? "audio/wav"
                      : "application/octet-stream";
    if ([".mp3", ".m4a", ".wav"].includes(ext)) {
      serveFile(req, res, filePath, type);
      return;
    }
    const cacheControl = [".html", ".css", ".js", ".json"].includes(ext)
      ? "no-cache"
      : "public, max-age=31536000, immutable";
    const acceptsGzip = /\bgzip\b/i.test(req.headers["accept-encoding"] || "");
    const gzipEligible = [".html", ".css", ".js", ".json", ".svg"].includes(ext) && data.length > 1024;
    const sendBody = (body, extraHeaders = {}) => {
      res.writeHead(200, {
        "content-type": type,
        "content-length": body.length,
        "cache-control": cacheControl,
        ...(gzipEligible ? { "vary": "Accept-Encoding" } : {}),
        ...extraHeaders,
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(body);
    };
    if (acceptsGzip && gzipEligible) {
      fs.stat(filePath, (statErr, stat) => {
        const signature = statErr ? `${data.length}` : `${stat.mtimeMs}:${stat.size}`;
        const etag = statErr ? "" : `W/"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;
        const validatorHeaders = {
          ...(etag ? { etag } : {}),
          ...(statErr ? {} : { "last-modified": stat.mtime.toUTCString() }),
        };
        if (etag && req.headers["if-none-match"] === etag) {
          res.writeHead(304, { "cache-control": cacheControl, ...validatorHeaders });
          res.end();
          return;
        }
        const cached = staticGzipCache.get(filePath);
        if (cached?.signature === signature) {
          sendBody(cached.body, { ...validatorHeaders, "content-encoding": "gzip" });
          return;
        }
        zlib.gzip(data, { level: 6 }, (gzipErr, compressed) => {
          if (gzipErr) {
            sendBody(data);
            return;
          }
          staticGzipCache.set(filePath, { signature, body: compressed });
          if (staticGzipCache.size > 24) staticGzipCache.clear();
          sendBody(compressed, { ...validatorHeaders, "content-encoding": "gzip" });
        });
      });
      return;
    }
    sendBody(data);
  });
}

function serveFile(req, res, filePath, contentType) {
  const resolved = path.resolve(filePath);
  fs.stat(resolved, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const range = req.headers.range;
    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      const start = match?.[1] ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : stat.size - 1;
      if (start >= stat.size || end >= stat.size || start > end) {
        res.writeHead(416, { "content-range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        "content-type": contentType,
        "content-length": end - start + 1,
        "content-range": `bytes ${start}-${end}/${stat.size}`,
        "accept-ranges": "bytes",
        "cache-control": "public, max-age=31536000, immutable",
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      fs.createReadStream(resolved, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, {
      "content-type": contentType,
      "content-length": stat.size,
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=31536000, immutable",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(resolved).pipe(res);
  });
}

function serveLocalCambridgeFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = decodeURIComponent(url.pathname.replace("/cambridge-local/file/", ""));
  const file = LOCAL_FILE_INDEX.get(id);
  if (!file) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  serveFile(req, res, resolvePortableLocalFilePath(file.path), file.contentType || "application/octet-stream");
}

function resolvePortableLocalFilePath(filePath) {
  if (!filePath) return "";
  if (fs.existsSync(filePath)) return filePath;
  const normalized = String(filePath).replace(/\\/g, "/");
  const publicIndex = normalized.toLowerCase().lastIndexOf("/public/");
  if (publicIndex >= 0) {
    const relativePublicPath = normalized.slice(publicIndex + "/public/".length);
    return path.join(PUBLIC_DIR, relativePublicPath);
  }
  const generatedIndex = normalized.toLowerCase().lastIndexOf("/generated/");
  if (generatedIndex >= 0) {
    const relativeGeneratedPath = normalized.slice(generatedIndex + 1);
    return path.join(PUBLIC_DIR, relativeGeneratedPath);
  }
  return filePath;
}

async function fetchWithAiTimeout(url, options, timeoutMs = 0) {
  const boundedTimeoutMs = Number(timeoutMs) || 0;
  if (!boundedTimeoutMs) return fetch(url, options);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), boundedTimeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("AI request timed out.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI({
  system,
  user,
  temperature = 0.3,
  apiKey = OPENAI_API_KEY,
  baseUrl = OPENAI_BASE_URL,
  model = MODEL,
  allowResponsesFallback = true,
  reasoningEffort = "",
  agentTools = [],
  toolExecutor = null,
  maxToolRounds = 2,
  timeoutMs = 0,
}) {
  if (!apiKey) return null;
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const supportsReasoning = Boolean(reasoningEffort) && /^gpt-5(?:\.\d+)?(?:-|$)/i.test(String(model || ""));
  const buildBody = (mode) => {
    const body = mode === "responses"
      ? {
          model,
          input: messages,
        }
      : {
          model,
          messages,
        };
    // GPT-5.5 gateways reject sampling temperature. Use the reasoning control
    // instead, while preserving temperature for the existing Qwen/OpenAI paths.
    if (supportsReasoning) body.reasoning_effort = reasoningEffort;
    else if (Number.isFinite(temperature)) body.temperature = temperature;
    if (mode === "chat" && Array.isArray(agentTools) && agentTools.length) {
      body.tools = agentTools;
      body.tool_choice = "auto";
    }
    return body;
  };

  const postJson = (url, body) => fetchWithAiTimeout(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }, timeoutMs);
  let chatResponse = await postJson(`${normalizedBaseUrl}/chat/completions`, buildBody("chat"));
  let chatJson = null;
  let chatError = "";
  try {
    chatJson = await chatResponse.json();
  } catch {
    chatError = await chatResponse.text().catch(() => "");
  }

  if (chatResponse.ok) {
    const choice = chatJson?.choices?.[0];
    const toolCalls = Array.isArray(choice?.message?.tool_calls) ? choice.message.tool_calls : [];
    if (toolCalls.length && typeof toolExecutor === "function") {
      for (let round = 0; round < Math.max(1, maxToolRounds) && toolCalls.length; round += 1) {
        messages.push(choice.message);
        for (const toolCall of toolCalls.slice(0, 4)) {
          const toolName = String(toolCall?.function?.name || "");
          let args = {};
          try {
            args = JSON.parse(toolCall?.function?.arguments || "{}");
          } catch {}
          let result;
          try {
            result = await Promise.race([
              Promise.resolve(toolExecutor(toolName, args)),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Coach tool timed out.")), COACH_AGENT_TOOL_TIMEOUT_MS)),
            ]);
          } catch {
            result = { ok: false, error: "Tool unavailable. Continue without external data." };
          }
          messages.push({
            role: "tool",
            tool_call_id: String(toolCall.id || crypto.randomUUID()).slice(0, 120),
            content: JSON.stringify(result || { ok: false, error: "Tool returned no data." }),
          });
        }
        chatResponse = await postJson(`${normalizedBaseUrl}/chat/completions`, buildBody("chat"));
        try {
          chatJson = await chatResponse.json();
        } catch {
          chatJson = null;
        }
        if (!chatResponse.ok) break;
        const nextChoice = chatJson?.choices?.[0];
        const nextToolCalls = Array.isArray(nextChoice?.message?.tool_calls) ? nextChoice.message.tool_calls : [];
        if (!nextToolCalls.length) {
          const finalText = chatCompletionTextFromJson(chatJson);
          if (finalText) return finalText;
          break;
        }
        toolCalls.splice(0, toolCalls.length, ...nextToolCalls);
        choice.message = nextChoice.message;
      }
    }
    const text = chatCompletionTextFromJson(chatJson);
    if (text) return text;
  }

  if (chatJson && !chatError) chatError = JSON.stringify(chatJson);
  if (!allowResponsesFallback) {
    throw new Error(`AI API failed. chat=${chatResponse.status}: ${chatError.slice(0, 500)}`);
  }
  const response = await postJson(`${normalizedBaseUrl}/responses`, buildBody("responses"));

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API failed. chat=${chatResponse.status}: ${chatError.slice(0, 300)} responses=${response.status}: ${errorText.slice(0, 500)}`);
  }

  const json = await response.json();
  if (json.output_text) return json.output_text;

  const chunks = [];
  for (const item of json.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function chatCompletionTextFromJson(json) {
  const choices = Array.isArray(json?.choices) ? json.choices : [];
  const text = choices
    .map((choice) => choice?.message?.content || choice?.delta?.content || choice?.text || "")
    .filter(Boolean)
    .join("");
  if (text.trim()) return text.trim();
  if (json?.output_text) return String(json.output_text).trim();
  const chunks = [];
  for (const item of json?.output || []) {
    for (const content of item.content || []) {
      if ((content.type === "output_text" || content.type === "text") && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function chatCompletionTextFromSse(body) {
  const chunks = [];
  for (const line of String(body || "").split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean.startsWith("data:")) continue;
    const data = clean.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const json = JSON.parse(data);
      const delta = json.choices?.[0]?.delta?.content
        || json.choices?.[0]?.message?.content
        || json.output_text
        || "";
      if (delta) chunks.push(delta);
    } catch {}
  }
  return chunks.join("").trim();
}

function normalizeSpeakingAudioEvidence(evidence = {}) {
  const dataUrl = String(evidence?.dataUrl || "").trim();
  const match = dataUrl.match(/^data:([^;,]+)[^,]*;base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) return { available: false, warning: "No valid MP3 audio evidence was submitted." };
  const mime = match[1].toLowerCase();
  const base64 = match[2].replace(/\s+/g, "");
  if (!/^audio\/(?:mpeg|mp3)$/i.test(mime) && !/\.mp3$/i.test(String(evidence?.fileName || ""))) {
    return { available: false, warning: `Audio evidence is ${mime}, not MP3, so it was not sent to the audio scoring model.` };
  }
  const base64Bytes = Buffer.byteLength(base64, "utf8");
  if (!base64 || base64Bytes > SPEAKING_AUDIO_MAX_BASE64_BYTES) {
    return { available: false, warning: `MP3 evidence is too large for scoring (${base64Bytes} base64 bytes).` };
  }
  return {
    available: true,
    mime,
    format: "mp3",
    fileName: String(evidence?.fileName || "ielts-speaking-recording.mp3"),
    dataUrl: `data:;base64,${base64}`,
    base64Bytes,
  };
}

async function callSpeakingAudioAI({ system, user, audio, temperature = 0.2 }) {
  if (!SPEAKING_AUDIO_AI_API_KEY || !audio?.available) return null;
  const response = await fetchWithAiTimeout(`${SPEAKING_AUDIO_AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SPEAKING_AUDIO_AI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: SPEAKING_AUDIO_AI_MODEL,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "input_audio", input_audio: { data: audio.dataUrl, format: audio.format } },
          ],
        },
      ],
      modalities: ["text"],
      stream: true,
      stream_options: { include_usage: false },
      temperature,
    }),
  }, SPEAKING_AI_TIMEOUT_MS);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Speaking audio AI failed. chat=${response.status}: ${body.slice(0, 500)}`);
  }
  let text = chatCompletionTextFromSse(body);
  if (!text) {
    try {
      text = chatCompletionTextFromJson(JSON.parse(body || "{}"));
    } catch {
      text = "";
    }
  }
  if (!text.trim()) throw new Error("Speaking audio AI returned empty feedback.");
  return text.trim();
}

async function callWritingAI({ system, user, temperature = 0.25 }) {
  return callOpenAI({
    system,
    user,
    temperature,
    apiKey: WRITING_AI_API_KEY,
    baseUrl: WRITING_AI_BASE_URL,
    model: WRITING_AI_MODEL,
    allowResponsesFallback: false,
    timeoutMs: WRITING_AI_TIMEOUT_MS,
  });
}

const COACH_AGENT_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_current_ielts_context",
      description: "Read the current IELTSist practice surface and focused question context already supplied by the app.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_shared_account_policy",
      description: "Explain the verified IELTSist/STEM shared-account and data-boundary policy.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_ielts_next_step",
      description: "Choose one safe, allowlisted IELTSist practice destination based on the student's request.",
      parameters: {
        type: "object",
        properties: {
          module: { type: "string", enum: ["listening", "reading", "writing", "speaking", "practice", "sequence", "exam", "vocabulary", "mine"] },
        },
        required: ["module"],
        additionalProperties: false,
      },
    },
  },
];

const COACH_AGENT_ALLOWLIST = new Set(COACH_AGENT_TOOL_DEFINITIONS.map((item) => item.function.name));
const coachAgentAudit = [];

function coachAgentToolExecutor(toolName, args, context = {}) {
  if (!COACH_AGENT_ALLOWLIST.has(toolName)) {
    coachAgentAudit.push({ tool: "blocked", status: "blocked", at: Date.now() });
    return { ok: false, error: "Tool is not available." };
  }
  const auditEvent = { tool: toolName, status: "started", at: Date.now() };
  coachAgentAudit.push(auditEvent);
  while (coachAgentAudit.length > 500) coachAgentAudit.shift();
  const finish = (result) => {
    auditEvent.status = result?.ok === false ? "failed" : "completed";
    return result;
  };
  if (toolName === "get_shared_account_policy") {
    return finish({
      ok: true,
      facts: sharedAccountProductFacts(),
      boundary: "Identity is shared; IELTS and STEM learning records remain product-scoped and are not automatically copied.",
    });
  }
  if (toolName === "get_current_ielts_context") {
    return finish({
      ok: true,
      module: String(context.helpContext?.activeModule || "").slice(0, 40),
      surface: String(context.helpContext?.surface || context.helpContext?.viewLabel || "").slice(0, 120),
      question: String(context.helpContext?.focusedQuestion?.number || "").slice(0, 12),
      evidenceAvailable: Boolean(context.helpContext?.reading || context.helpContext?.listening || context.contextText),
    });
  }
  const module = String(args?.module || "").toLowerCase();
  if (!["listening", "reading", "writing", "speaking", "practice", "sequence", "exam", "vocabulary", "mine"].includes(module)) {
    return finish({ ok: false, error: "That destination is not available." });
  }
  return finish({
    ok: true,
    action: module,
    instruction: `Use the IELTSist ${module} practice surface. Do not claim that it was opened unless the browser confirms the navigation.`,
  });
}

function coachAiProviders() {
  if (AI_GATEWAY_API_KEY) {
    return [{
      apiKey: AI_GATEWAY_API_KEY,
      baseUrl: AI_GATEWAY_BASE_URL,
      model: AI_GATEWAY_MODEL,
      reasoningEffort: AI_GATEWAY_REASONING_EFFORT,
      timeoutMs: AI_GATEWAY_TIMEOUT_MS,
      allowResponsesFallback: false,
      agentic: true,
    }];
  }
  if (COACH_AI_API_KEY) {
    return [{
      apiKey: COACH_AI_API_KEY,
      baseUrl: COACH_AI_BASE_URL,
      model: COACH_AI_MODEL,
      timeoutMs: COACH_AI_TIMEOUT_MS,
      allowResponsesFallback: false,
      agentic: false,
    }];
  }
  if (OPENAI_API_KEY) {
    return [{
      apiKey: OPENAI_API_KEY,
      baseUrl: OPENAI_BASE_URL,
      model: MODEL,
      timeoutMs: COACH_AI_TIMEOUT_MS,
      allowResponsesFallback: true,
      agentic: false,
    }];
  }
  return [];
}

async function callCoachAI({ system, user, temperature = 0.25, helpContext = null, contextText = "" }) {
  const providers = coachAiProviders();
  if (!providers.length) return null;
  let lastError = null;
  for (const provider of providers) {
    try {
      const answer = await Promise.race([
        callOpenAI({
          system,
          user,
          temperature,
          ...provider,
          agentTools: provider.agentic ? COACH_AGENT_TOOL_DEFINITIONS : [],
          toolExecutor: provider.agentic
            ? (toolName, args) => coachAgentToolExecutor(toolName, args, { helpContext, contextText })
            : null,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("AI Coach request timed out.")), provider.timeoutMs || COACH_AI_TIMEOUT_MS)),
      ]);
      const safeAnswer = sanitizeCoachStudentOutput(answer);
      if (safeAnswer) return safeAnswer;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

function coachProviderWarning(error) {
  const message = String(error?.message || error || "");
  if (/timeout|timed out|fetch failed|econn|network/i.test(message)) {
    return "AI Coach could not reach the model service. Please retry in a moment.";
  }
  return "AI Coach is temporarily unavailable. Please retry in a moment.";
}

function writingProviderWarning(error) {
  const message = String(error?.message || error || "");
  if (/timeout|timed out|fetch failed|econn|network/i.test(message)) {
    return "Writing AI could not reach the model service. A local practice estimate is shown; retry when you are ready.";
  }
  return "Writing AI is temporarily unavailable. A local practice estimate is shown; retry when you are ready.";
}

function speakingProviderWarning(error) {
  const message = String(error?.message || error || "");
  if (/timeout|timed out|fetch failed|econn|network/i.test(message)) {
    return "Speaking AI could not reach the model service. A provisional estimate is shown; retry when you are ready.";
  }
  return "Speaking AI is temporarily unavailable. A provisional estimate is shown; retry when you are ready.";
}

function generalProviderWarning(error) {
  const message = String(error?.message || error || "");
  if (/timeout|timed out|fetch failed|econn|network/i.test(message)) {
    return "The AI service could not be reached. Your local practice result is still available; retry when you are ready.";
  }
  return "The AI service is temporarily unavailable. Your local practice result is still available; retry when you are ready.";
}

function sanitizeCoachMarkdownLinkDestination(value) {
  const destination = String(value || "").trim().replace(/^<|>$/g, "");
  if (!destination || destination.length > 2_000) return "";
  if (/(?:^|[?&#])(?:api[_-]?key|authorization|access[_-]?token|id[_-]?token|refresh[_-]?token|token|code|state|session)=/i.test(destination)) return "";
  if (/^\/(?![\\/])/.test(destination)) {
    return destination.replace(/[\u0000-\u001f\s]/g, "");
  }
  try {
    const url = new URL(destination);
    if (!/^https?:$/i.test(url.protocol) || url.username || url.password) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function sanitizeCoachMarkdownLinks(value) {
  return String(value || "").replace(/\[([^\]\r\n]{1,240})\]\(([^)\s]{1,2200})\)/g, (match, label, destination) => {
    const safeDestination = sanitizeCoachMarkdownLinkDestination(destination);
    return safeDestination ? `[${label}](${safeDestination})` : label;
  });
}

function sanitizeCoachStudentOutput(value) {
  const protectedContent = /(?:system|developer|internal)\s*(?:prompt|instruction|message)|ignore\s+(?:all|previous|above)\s+instructions|api[_ -]?key|authorization\s*:/i;
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$1")
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^$\n]{1,500})\$/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\b(?:Bearer|sk-[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{20,})\b/gi, "[redacted]")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !protectedContent.test(line))
    .join("\n")
    .replace(/\[([^\]\r\n]{1,240})\]\(([^)\s]{1,2200})\)/g, (match, label, destination) => {
      const safeDestination = sanitizeCoachMarkdownLinkDestination(destination);
      return safeDestination ? `[${label}](${safeDestination})` : label;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 12_000);
}

function sharedAccountProductFacts() {
  return [
    "Product facts are authoritative: IELTSist and STEM Campus use one IELTSist ID for sign-in.",
    "When STEM needs login or registration, it hands the learner to IELTSist authentication and uses returnTo to return to the original STEM attempt or question.",
    "This shares identity only. IELTS drafts, IELTS scores, reports, and vocabulary stay in IELTSist; STEM subject attempts and marking submissions stay in STEM. Do not claim unrelated results, progress, notebooks, or access tokens sync between products.",
    "The STEM identity handoff token is short-lived and must never be displayed, copied, or described as a reusable student credential.",
    "If current account state cannot be verified from the request, say so plainly. Never claim a login, registration, return, marking result, or sync succeeded unless the product confirmed it.",
  ].join("\n");
}

function localProductFactsAnswer(message) {
  if (!/(?:stem|account|login|register|returnto|shared\s+sign|same\s+account|\u8d26\u53f7|\u767b\u5f55|\u6ce8\u518c|\u8fd4\u56de)/i.test(String(message || ""))) return "";
  return [
    "IELTSist and STEM Campus use one IELTSist account for sign-in.",
    "If STEM asks you to sign in or register, it sends you through IELTSist and then returns you to the original STEM page with returnTo.",
    "Your privacy boundary stays clear: IELTS drafts, IELTS scores, reports and vocabulary remain in IELTSist; STEM subject attempts and marking records remain in STEM. They are not copied into each other.",
    "The handoff is only for sign-in. It does not sync unrelated progress or reusable access tokens.",
  ].join("\n");
}

function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    const error = new Error("Invalid screenshot data.");
    error.statusCode = 400;
    throw error;
  }
  const buffer = Buffer.from(match[1], "base64");
  if (!buffer.length || buffer.length > 12 * 1024 * 1024) {
    const error = new Error("Screenshot is empty or too large.");
    error.statusCode = 400;
    throw error;
  }
  return buffer;
}

async function recognizeHelpImage(imageBuffer) {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(imageBuffer);
    return String(result?.data?.text || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  } finally {
    await worker.terminate();
  }
}

function localHelpExplanation(ocrText, warning = "", message = "") {
  const productFacts = localProductFactsAnswer(message);
  if (productFacts) return productFacts;
  const clean = String(ocrText || "").trim();
  if (!clean) {
    return [
      "I could not recognize enough text from this screenshot.",
      "Try selecting a tighter area around the question text, or type the sentence/question in the chat box.",
      warning ? "AI Coach is temporarily unavailable. Your screenshot stays in this conversation; please retry in a moment or type the question text." : "",
    ].filter(Boolean).join("\n");
  }
  return sanitizeCoachStudentOutput([
    "Recognized text:",
    clean,
    "",
    "Local mode: AI explanation is unavailable right now. You can ask a follow-up question, or retry after the AI service recovers.",
    warning ? "AI Coach is temporarily unavailable. Please retry in a moment." : "",
  ].filter(Boolean).join("\n"));
}

function compactHelpText(value, maxLength = 12000) {
  const clean = String(value || "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}\n...[truncated]` : clean;
}

function readingOcrLineIsBoilerplate(line) {
  const text = String(line || "").trim();
  return !text
    || /^(?:Reading|READING|Test\s+\d+|\d{1,3})$/i.test(text)
    || /^READING PASSAGE\s*\d+$/i.test(text)
    || /^You should spend about \d+ minutes on Questions?/i.test(text)
    || /^Questions?\s+\d+(?:\s*[-–—]\s*\d+)?\b/i.test(text)
    || /^Passage\s+\d+\s+below\.?$/i.test(text);
}

function readingOcrLineLooksLikeBody(line) {
  const text = String(line || "").trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return wordCount >= 9 && (text.length >= 64 || /[,;:.!?]["'’”)]?$/.test(text));
}

function readingOcrLineEndsSentence(line) {
  return /[.!?]["'’”)]*$/.test(String(line || "").trim());
}

function readingOcrMedianLineLength(lines) {
  const lengths = lines
    .map((line) => String(line?.text || line || "").trim().length)
    .filter((length) => length >= 35)
    .sort((a, b) => a - b);
  if (!lengths.length) return 80;
  const middle = Math.floor(lengths.length / 2);
  return lengths.length % 2 ? lengths[middle] : (lengths[middle - 1] + lengths[middle]) / 2;
}

function splitReadingParagraphSentences(value) {
  const sentinel = "\uE000";
  const protectedText = String(value || "")
    .replace(/\b(?:e\.g|i\.e|Mr|Mrs|Ms|Dr|Prof|St|vs|etc)\./gi, (match) => match.replace(/\./g, sentinel))
    .replace(/(\d)\.(\d)/g, `$1${sentinel}$2`)
    .replace(/\b([A-Z])\.(?=[A-Z]\.)/g, `$1${sentinel}`);
  const sentences = protectedText.match(/[^.!?]+(?:[.!?]+["'’”)\]]*|$)/g)
    ?.map((sentence) => sentence.replaceAll(sentinel, ".").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return sentences?.length ? sentences : [String(value || "").replace(/\s+/g, " ").trim()].filter(Boolean);
}

function readingPassageParagraphs(value) {
  const source = compactHelpText(value, 36000)
    .split(/---\s*Question Page\b/i)[0]
    .replace(/\r\n?/g, "\n");
  if (!source.trim()) return [];

  const pageParts = source.split(/(?=---\s*Page\s+\d+\s*---)/i);
  const paragraphs = [];
  let current = [];
  let pendingBlank = false;
  let waitingForPassageBody = false;

  const flush = () => {
    if (!current.length) return;
    paragraphs.push({
      page: current[0].page,
      text: current.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim(),
      lines: current.map((line) => ({ text: line.text, page: line.page })),
    });
    current = [];
  };

  for (const pagePart of pageParts) {
    const page = pagePart.match(/---\s*Page\s+(\d+)\s*---/i)?.[1] || "";
    const rawLines = pagePart
      .replace(/---\s*Page\s+\d+\s*---/i, "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim());
    const candidateLines = rawLines
      .filter((line) => line && !readingOcrLineIsBoilerplate(line))
      .map((text) => ({ text, page }));
    const medianLength = readingOcrMedianLineLength(candidateLines);

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) {
        pendingBlank = true;
        continue;
      }
      if (/^READING PASSAGE\s*\d+$/i.test(line)) {
        flush();
        waitingForPassageBody = true;
        pendingBlank = false;
        continue;
      }
      if (readingOcrLineIsBoilerplate(line)) continue;
      if (waitingForPassageBody) {
        if (!readingOcrLineLooksLikeBody(line)) continue;
        waitingForPassageBody = false;
      }
      if (pendingBlank && current.length && readingOcrLineEndsSentence(current.at(-1).text)) flush();
      pendingBlank = false;
      current.push({ text: line, page });
      if (readingOcrLineEndsSentence(line) && line.length < medianLength * 0.9) flush();
    }
  }
  flush();
  return paragraphs.filter((paragraph) => paragraph.text.length >= 12);
}

function readingParagraphSentenceEntries(paragraph) {
  const lines = Array.isArray(paragraph?.lines) && paragraph.lines.length
    ? paragraph.lines
    : [{ text: String(paragraph?.text || ""), page: paragraph?.page || "" }];
  const ranges = [];
  let fullText = "";
  lines.forEach((line) => {
    const text = String(line?.text || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    if (fullText) fullText += " ";
    const start = fullText.length;
    fullText += text;
    ranges.push({ start, end: fullText.length, page: line.page || paragraph?.page || "" });
  });
  let searchFrom = 0;
  return splitReadingParagraphSentences(fullText).map((sentence) => {
    let start = fullText.indexOf(sentence, searchFrom);
    if (start < 0) start = fullText.indexOf(sentence);
    if (start < 0) start = searchFrom;
    const end = start + sentence.length;
    searchFrom = Math.max(searchFrom, end);
    const sourceLine = ranges.find((range) => range.end > start && range.start < end);
    return { text: sentence, page: sourceLine?.page || paragraph?.page || "" };
  });
}

function indexedReadingPassageText(value, maxLength = 18000) {
  const rows = [];
  readingPassageParagraphs(value).forEach((paragraph, paragraphIndex) => {
    readingParagraphSentenceEntries(paragraph).forEach((sentence, sentenceIndex) => {
      rows.push(`[P${paragraphIndex + 1} S${sentenceIndex + 1}${sentence.page ? ` Page ${sentence.page}` : ""}] ${sentence.text}`);
    });
  });
  return compactHelpText(rows.join("\n"), maxLength);
}

function normalizeHelpContext(value) {
  if (!value || typeof value !== "object") return {};
  const reading = value.reading && typeof value.reading === "object" ? value.reading : null;
  const listening = value.listening && typeof value.listening === "object" ? value.listening : null;
  const surface = value.surface && typeof value.surface === "object" ? value.surface : null;
  const rawFocusedQuestion = value.coach?.focusedQuestion || surface?.focusedQuestion || null;
  const focusedQuestion = rawFocusedQuestion && typeof rawFocusedQuestion === "object" ? {
    module: String(rawFocusedQuestion.module || "").slice(0, 40),
    number: Number(rawFocusedQuestion.number || String(rawFocusedQuestion.id || "").match(/\d{1,2}/)?.[0] || 0),
    id: String(rawFocusedQuestion.id || "").slice(0, 40),
  } : null;
  const normalizeQuestions = (questions) => Array.isArray(questions)
    ? questions.slice(0, 40).map((question, index) => ({
        number: Number(question.number || index + 1),
        id: String(question.id || `q${index + 1}`).slice(0, 40),
        question: String(question.question || "").slice(0, 300),
        type: String(question.type || "").slice(0, 80),
        typeLabel: String(question.typeLabel || "").slice(0, 120),
        expectedAnswer: String(question.expectedAnswer || "").slice(0, 160),
        studentAnswer: String(question.studentAnswer || "").slice(0, 160),
      }))
    : [];
  return {
    activeView: String(value.activeView || "").slice(0, 40),
    activeModule: String(value.activeModule || "").slice(0, 40),
    focusedQuestion,
    surface: surface ? {
      view: String(surface.view || "").slice(0, 60),
      viewLabel: String(surface.viewLabel || "").slice(0, 120),
      module: String(surface.module || "").slice(0, 60),
      moduleLabel: String(surface.moduleLabel || "").slice(0, 120),
      title: String(surface.title || "").slice(0, 240),
      source: String(surface.source || "").slice(0, 180),
      mode: String(surface.mode || "").slice(0, 80),
      isImmersive: Boolean(surface.isImmersive),
      answerCount: Number.isFinite(Number(surface.answerCount)) ? Number(surface.answerCount) : 0,
      path: String(surface.path || "").slice(0, 80),
    } : null,
    reading: reading ? {
      module: "reading",
      mode: String(reading.mode || "").slice(0, 40),
      id: String(reading.id || "").slice(0, 80),
      title: String(reading.title || "").slice(0, 180),
      source: String(reading.source || "").slice(0, 120),
      period: String(reading.period || "").slice(0, 80),
      questions: normalizeQuestions(reading.questions),
      questionText: compactHelpText(reading.questionText || "", 2000),
      paperText: compactHelpText(reading.paperText || "", 18000),
    } : null,
    listening: listening ? {
      module: "listening",
      mode: String(listening.mode || "").slice(0, 40),
      id: String(listening.id || "").slice(0, 80),
      title: String(listening.title || "").slice(0, 180),
      source: String(listening.source || "").slice(0, 120),
      period: String(listening.period || "").slice(0, 80),
      activeSection: String(listening.activeSection || "").slice(0, 20),
      audioTime: Number.isFinite(Number(listening.audioTime)) ? Number(listening.audioTime) : null,
      questions: normalizeQuestions(listening.questions),
      questionPaper: compactHelpText(listening.questionPaper || "", 16000),
      audioScript: compactHelpText(listening.audioScript || "", 16000),
    } : null,
  };
}

function helpContextBlock(helpContext) {
  const context = normalizeHelpContext(helpContext);
  const surfaceLines = context.surface ? [
    "Current IELTS-ist surface:",
    `Screen: ${context.surface.viewLabel || context.surface.view || "(unknown)"}`,
    context.surface.moduleLabel ? `Module: ${context.surface.moduleLabel}` : "",
    context.surface.title ? `Visible context: ${context.surface.title}` : "",
    context.surface.source ? `Source: ${context.surface.source}` : "",
    context.surface.mode ? `Mode: ${context.surface.mode}` : "",
    context.surface.isImmersive ? "Student is in immersive practice mode." : "",
    context.surface.answerCount ? `Current answered count: ${context.surface.answerCount}` : "",
    "",
  ].filter(Boolean) : [];
  if (!context.reading && !context.listening) {
    return [
      "Structured app context:",
      ...surfaceLines,
      "No current Reading or Listening paper context was detected.",
    ].filter(Boolean).join("\n");
  }
  if (context.listening && (!context.reading || context.activeModule === "listening")) {
    const listening = context.listening;
    const listeningQuestionLines = listening.questions
      .map((question) => `Q${question.number}: ${question.question || "(question text unavailable)"} | key: ${question.expectedAnswer || "(no key imported)"} | student: ${question.studentAnswer || "(blank)"}`)
      .join("\n");
    return [
      "Structured app context:",
      ...surfaceLines,
      "Current module: Listening",
      `Paper: ${[listening.title, listening.source, listening.period].filter(Boolean).join(" - ") || listening.id || "(unknown)"}`,
      listening.activeSection ? `Active section: ${listening.activeSection}` : "",
      Number.isFinite(Number(listening.audioTime)) ? `Audio time: ${listening.audioTime}s` : "",
      "",
      "Answer key and student answers:",
      listeningQuestionLines || "(no question table available)",
      "",
      "Listening question paper OCR text:",
      listening.questionPaper || "(no question paper text available)",
      "",
      "Listening audioscript / ASR caption text:",
      listening.audioScript || "(no audioscript or ASR caption text available)",
    ].filter((line) => line !== "").join("\n");
  }
  const reading = context.reading;
  const questionLines = reading.questions
    .map((question) => `Q${question.number}: ${question.question || "(question text unavailable)"} | key: ${question.expectedAnswer || "(no key imported)"} | student: ${question.studentAnswer || "(blank)"}`)
    .join("\n");
  return [
    "Structured app context:",
    ...surfaceLines,
    `Current module: Reading`,
    `Paper: ${[reading.title, reading.source, reading.period].filter(Boolean).join(" · ") || reading.id || "(unknown)"}`,
    "",
    "Answer key and student answers:",
    questionLines || "(no question table available)",
    ...(reading.questionText ? ["", "Hydrated focused Reading question text:", reading.questionText] : []),
    "",
    "Indexed Reading passage OCR text (P = paragraph, S = sentence; use these labels for Hint locations):",
    indexedReadingPassageText(reading.paperText) || "(no passage text available)",
  ].join("\n");
}

async function buildHelpExplanation(ocrText, helpContext = {}) {
  const clean = String(ocrText || "").trim();
  if (!clean) return { mode: "local", answer: localHelpExplanation(clean) };
  const evidenceGuard = readingEvidenceGuard({
    helpContext,
    imageOcrText: clean,
    message: clean,
    requireEvidence: readingSelectionLooksLikeQuestion(helpContext, clean),
  });
  if (evidenceGuard) return evidenceGuard;
  let ai = null;
  let warning = "";
  try {
    ai = await callCoachAI({
      system: [
        "You are an IELTS tutor inside an IELTS practice web app.",
        "Explain the selected question area clearly and concisely.",
        "The student is Chinese, so use Chinese for explanations and translations, but keep IELTS keywords in English.",
        "The structured Reading/Listening context is authoritative app data. Use it even if the screenshot OCR is short, partial, or noisy.",
        "When hydrated focused Reading question text is present, treat that as the exact visible question, include a line beginning 题目： that quotes it before the explanation, and never claim the question text is missing or ask the student to upload it again.",
        "If it is a Reading question or the student asks why an answer is correct, use the structured Reading context: identify the question number, correct answer, student's answer if present, source sentence/paragraph, keyword-paraphrase link, and why wrong options or wrong answers fail.",
        "For a Reading Hint, begin with exactly one location line in Chinese: 位置：第X段，第Y句. Resolve X and Y from the indexed [P# S#] passage labels. If the indexed passage cannot verify the location, write 位置：暂无法确认 and do not guess.",
        "If it is a Listening question, use the structured Listening context: identify the question number, correct answer, student's answer if present, relevant question-paper wording, audioscript/ASR evidence, distractors, spelling/plural/number issues, and what the student should listen for.",
        "For Reading/Listening answer explanations, do not just translate. Give evidence logic: question focus -> locating/listening keywords -> matching/paraphrase -> answer conclusion.",
        "Do not guess beyond the OCR/context. An answer key is not passage evidence. If the exact source sentence is not visible, state what is missing and ask for the relevant passage screenshot; never reconstruct source wording from the answer key or question type.",
        "Keep the answer compact and student-facing. Avoid raw Markdown decorations like ### headings or excessive **bold**. Use short labeled sections and simple bullets only when useful.",
      ].join("\n"),
      user: [
        helpContextBlock(helpContext),
        "",
        "OCR text from the student's selected screenshot:",
        clean,
      ].join("\n"),
      temperature: 0.2,
    });
  } catch (error) {
    warning = coachProviderWarning(error);
  }
  return {
    mode: ai ? "ai" : "local",
    answer: ai || localHelpExplanation(clean, warning),
    warning,
  };
}

async function handleHelpExplain(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const imageBuffer = parseImageDataUrl(payload.imageDataUrl);
  const helpContext = normalizeHelpContext(payload.helpContext);
  let ocrText = "";
  let ocrWarning = "";
  try {
    ocrText = await recognizeHelpImage(imageBuffer);
  } catch (error) {
    ocrWarning = error.message || "OCR failed";
  }
  const explanation = ocrText
    ? await buildHelpExplanation(ocrText, helpContext)
    : { mode: "local", answer: localHelpExplanation("", ocrWarning), warning: ocrWarning };
  const resolvedExplanationAnswer = correctReadingAnswerLocation(explanation.answer, helpContext);
  sendJson(res, 200, {
    ocrText,
    answer: resolvedExplanationAnswer,
    readingEvidence: readingEvidencePayload(resolvedExplanationAnswer, helpContext),
    mode: explanation.mode,
    warning: explanation.warning || ocrWarning,
  });
}

function readingQuestionFromMessage(readingContext, message, focusedQuestion = null) {
  const requestedNumber = String(message || "").match(/(?:question|q|\u9898)\s*#?\s*(\d{1,2})/i)?.[1]
    || (focusedQuestion?.module === "reading" ? String(focusedQuestion.number || "") : "");
  if (!requestedNumber) return null;
  return (readingContext?.questions || []).find((question) => String(question.number) === requestedNumber) || null;
}

function normalizedEvidenceText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function readingQuestionNeedsVerbatimEvidence(question) {
  const type = String(question?.type || question?.typeLabel || "").toLowerCase();
  if (/(?:completion|short.answer)/.test(type)) return true;
  const answer = normalizedEvidenceText(question?.expectedAnswer);
  return Boolean(answer && !/^(?:true|false|not given|yes|no|a|b|c|d|e|f|g)$/.test(answer));
}

function readingQuestionHasVerbatimEvidence(question, sourceText) {
  const answer = normalizedEvidenceText(question?.expectedAnswer);
  const evidence = normalizedEvidenceText(sourceText);
  if (!answer || !evidence) return false;
  return ` ${evidence} `.includes(` ${answer} `);
}

function readingSelectionLooksLikeQuestion(helpContext, selectionText) {
  const readingContext = helpContext?.reading;
  const question = readingQuestionFromMessage(readingContext, selectionText, helpContext?.focusedQuestion);
  if (!question) return false;
  const selection = normalizedEvidenceText(selectionText);
  const questionTerms = normalizedEvidenceText(question.question)
    .split(" ")
    .filter((term) => term.length >= 3 && !/^(?:the|and|for|with|are|was|were|from|that|this)$/.test(term));
  const overlap = questionTerms.filter((term) => ` ${selection} `.includes(` ${term} `)).length;
  return overlap >= Math.min(2, questionTerms.length)
    || /(?:_{2,}|\.{3,}|one\s+(?:word|letter)|no\s+more\s+than|questions?\s*\d+)/i.test(selectionText);
}

function readingEvidenceGuard({ helpContext = {}, message = "", imageOcrText = "", requireEvidence = false } = {}) {
  const readingContext = helpContext?.reading;
  if (!readingContext) return null;
  const asksForEvidence = requireEvidence
    || /(?:why|explain|evidence|source|passage|paragraph|correct answer|show me|\u4e3a\u4ec0\u4e48|\u89e3\u91ca|\u8bc1\u636e|\u539f\u6587|\u5b9a\u4f4d|\u7b54\u6848)/i.test(message);
  if (!asksForEvidence) return null;

  const keyedQuestion = readingQuestionFromMessage(
    readingContext,
    `${message}\n${imageOcrText}`,
    helpContext.focusedQuestion,
  );
  const passageText = String(readingContext.paperText || "").trim();
  const screenshotText = String(imageOcrText || "").trim();
  const sourceText = `${passageText}\n${screenshotText}`.trim();
  const needsVerbatimEvidence = readingQuestionNeedsVerbatimEvidence(keyedQuestion);
  const screenshotLooksDerived = /(?:answer\s*key|correct\s*answer|final\s*answer|evidence\s*chain|\u7b54\u6848\u8868|\u6b63\u786e\u7b54\u6848|\u7b54\u6848\u662f|\u63a8\u7406\u94fe)/i.test(screenshotText);
  const hasVerbatimEvidence = !needsVerbatimEvidence
    || readingQuestionHasVerbatimEvidence(keyedQuestion, passageText)
    || (!screenshotLooksDerived && readingQuestionHasVerbatimEvidence(keyedQuestion, screenshotText));
  if (sourceText && hasVerbatimEvidence) return null;

  const questionLabel = keyedQuestion?.number ? `Q${keyedQuestion.number}` : "\u5f53\u524d\u9898";
  const missingDetail = sourceText
    ? "\u5f53\u524d OCR \u6587\u672c\u6ca1\u6709\u5305\u542b\u80fd\u591f\u6838\u9a8c\u8be5\u7b54\u6848\u7684\u539f\u6587\u53e5\u5b50\u3002"
    : "\u5f53\u524d\u6ca1\u6709\u53ef\u6838\u9a8c\u7684 passage \u539f\u6587\u6216\u622a\u56fe\u6587\u5b57\u3002";
  return {
    mode: "evidence-required",
    answer: `${questionLabel} \u6682\u65f6\u4e0d\u80fd\u5b8c\u6210 evidence chain\u3002${missingDetail}\n\n\u7b54\u6848\u8868\u53ea\u80fd\u7528\u6765\u6838\u5bf9\u7ed3\u679c\uff0c\u4e0d\u80fd\u5f53\u4f5c\u539f\u6587\u8bc1\u636e\u3002\u6211\u4e0d\u4f1a\u6839\u636e\u9898\u578b\u6216\u7b54\u6848\u8868\u53cd\u63a8\u539f\u6587\u3002\u8bf7\u622a\u53d6\u5bf9\u5e94\u7684\u6587\u7ae0\u6bb5\u843d\u548c\u9898\u76ee\uff0c\u6211\u518d\u6309\u201c\u9898\u76ee\u5173\u952e\u8bcd -> \u539f\u6587\u8bc1\u636e -> \u540c\u4e49\u66ff\u6362 -> \u7ed3\u8bba\u201d\u89e3\u91ca\u3002`,
  };
}

function parsedIndexedReadingSentences(paperText) {
  return indexedReadingPassageText(paperText)
    .split("\n")
    .map((row) => {
      const match = row.match(/^\[P(\d+) S(\d+)(?: Page (\d+))?\]\s+(.+)$/);
      return match ? {
        paragraph: Number(match[1]),
        sentence: Number(match[2]),
        page: Number(match[3] || 0),
        text: match[4],
      } : null;
    })
    .filter(Boolean);
}

function readingEvidenceSentenceScore(answer, sentence) {
  const answerText = normalizedEvidenceText(answer);
  const sentenceText = normalizedEvidenceText(sentence);
  if (!answerText || !sentenceText) return 0;
  if (` ${answerText} `.includes(` ${sentenceText} `)) return 2;
  const stopWords = new Set(["the", "and", "that", "this", "with", "from", "were", "was", "are", "for", "their", "into", "about", "there", "have", "has", "had"]);
  const words = sentenceText.split(" ").filter((word) => word.length >= 3 && !stopWords.has(word));
  if (words.length < 5) return 0;
  const uniqueWords = [...new Set(words)];
  const overlap = uniqueWords.filter((word) => ` ${answerText} `.includes(` ${word} `)).length;
  const coverage = overlap / uniqueWords.length;
  let longestQuotedRun = 0;
  for (let size = Math.min(12, words.length); size >= 5; size -= 1) {
    if (words.some((_, index) => index + size <= words.length
      && answerText.includes(words.slice(index, index + size).join(" ")))) {
      longestQuotedRun = size;
      break;
    }
  }
  if (longestQuotedRun >= 8) return 1 + (longestQuotedRun / words.length);
  return overlap >= 7 ? coverage : 0;
}

function readingAnswerEvidenceLocation(answer, helpContext) {
  const candidates = parsedIndexedReadingSentences(helpContext?.reading?.paperText || "")
    .map((entry) => ({ ...entry, score: readingEvidenceSentenceScore(answer, entry.text) }))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || best.score < 0.58) return null;
  if (best.score < 1 && runnerUp && best.score - runnerUp.score < 0.12) return null;
  return best;
}

function readingEvidenceLayoutCachePath(url) {
  const key = String(url || "")
    .replace(/^\/+/, "")
    .replace(/[\\/:*?"<>|]+/g, "__")
    .replace(/\.(?:webp|png|jpe?g)$/i, ".json");
  return path.join(__dirname, "data", "ocr-layout-cache", key);
}

function readingEvidenceLayoutLines(testId, page) {
  const test = IMPORTED_BANKS
    .flatMap((bank) => bank.readingTests || [])
    .find((item) => String(item.id || "") === String(testId || ""));
  const image = test?.readingPageImages?.find((item) => Number(item.page) === Number(page));
  if (!image) return [];
  if (Array.isArray(image.layoutLines) && image.layoutLines.length) return image.layoutLines;
  try {
    const cached = JSON.parse(fs.readFileSync(readingEvidenceLayoutCachePath(image.url), "utf8"));
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}

function readingEvidenceRect(layoutLines, quote) {
  const targetTerms = [...new Set(normalizedEvidenceText(quote).split(" ").filter((term) => term.length >= 2))];
  const lines = (Array.isArray(layoutLines) ? layoutLines : [])
    .filter((line) => line && Number.isFinite(Number(line.left)) && Number.isFinite(Number(line.top)))
    .map((line) => ({ ...line, normalized: normalizedEvidenceText(line.text) }));
  if (targetTerms.length < 5 || !lines.length) return null;
  let best = null;
  for (let start = 0; start < lines.length; start += 1) {
    for (let size = 1; size <= 6 && start + size <= lines.length; size += 1) {
      const selected = lines.slice(start, start + size);
      const candidateTerms = [...new Set(normalizedEvidenceText(selected.map((line) => line.text).join(" ")).split(" ").filter((term) => term.length >= 2))];
      const overlap = targetTerms.filter((term) => candidateTerms.includes(term)).length;
      const coverage = overlap / targetTerms.length;
      const precision = overlap / Math.max(1, candidateTerms.length);
      const score = (coverage * 0.78) + (precision * 0.22) - ((size - 1) * 0.005);
      if (overlap >= 5 && (!best || score > best.score)) best = { selected, overlap, coverage, precision, score };
    }
  }
  if (!best || best.coverage < 0.55 || best.score < 0.52) return null;
  const left = Math.max(0, Math.min(...best.selected.map((line) => Number(line.left))) - 0.8);
  const top = Math.max(0, Math.min(...best.selected.map((line) => Number(line.top))) - 0.55);
  const right = Math.min(100, Math.max(...best.selected.map((line) => Number(line.left) + Number(line.width))) + 0.8);
  const bottom = Math.min(100, Math.max(...best.selected.map((line) => Number(line.top) + Number(line.height))) + 0.55);
  return {
    left: Number(left.toFixed(3)),
    top: Number(top.toFixed(3)),
    width: Number((right - left).toFixed(3)),
    height: Number((bottom - top).toFixed(3)),
    confidence: best.coverage >= 0.78 && best.precision >= 0.45 ? "high" : "medium",
  };
}

function readingEvidencePayload(answer, helpContext, message = "") {
  const location = readingAnswerEvidenceLocation(answer, helpContext);
  if (!location) return null;
  const resolvedQuestion = readingQuestionFromMessage(
    helpContext?.reading,
    message,
    helpContext?.focusedQuestion,
  );
  const rect = readingEvidenceRect(
    readingEvidenceLayoutLines(helpContext?.reading?.id, location.page),
    location.text,
  );
  return {
    question: Number(resolvedQuestion?.number || helpContext?.focusedQuestion?.number || 0) || null,
    page: location.page || null,
    paragraph: location.paragraph,
    sentence: location.sentence,
    quote: location.text,
    rect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
    confidence: rect?.confidence || "page",
  };
}

function correctReadingAnswerLocation(answer, helpContext) {
  const text = String(answer || "").trim();
  if (!text || !helpContext?.reading) return text;
  const location = readingAnswerEvidenceLocation(text, helpContext);
  if (!location) return text;
  const label = `位置：第${location.paragraph}段，第${location.sentence}句`;
  const withoutLocationLines = text.replace(
    /(?:^|\n)\s*位置\s*[:：]\s*(?:第\s*\d+\s*段\s*[,，、]\s*第\s*\d+(?:\s*[-–—至到]\s*\d+)?\s*句|暂(?:时)?无法确认)\s*(?=\n|$)/gu,
    "\n",
  ).trim();
  return `${label}${withoutLocationLines ? `\n${withoutLocationLines}` : ""}`;
}

function ensureReadingHintLocation(answer, helpContext, message) {
  const text = correctReadingAnswerLocation(answer, helpContext);
  const isReadingHint = Boolean(helpContext?.reading) && /\bHint\s*[1-4]\b/i.test(String(message || ""));
  if (!isReadingHint || /^位置：(第\d+段，第\d+句|暂无法确认)(?:\s|$)/u.test(text)) return text;
  const location = readingAnswerEvidenceLocation(text, helpContext);
  const label = location
    ? `位置：第${location.paragraph}段，第${location.sentence}句`
    : "位置：暂无法确认";
  const withoutLocation = text.replace(
    /^位置\s*[:：]\s*(?:第\s*\d+\s*段\s*[,，、]\s*第\s*\d+\s*句|暂(?:时)?无法确认)\s*/u,
    "",
  );
  return `${label}${withoutLocation ? `\n${withoutLocation}` : ""}`;
}

async function handleHelpChat(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const message = String(payload.message || "").trim();
  const contextText = String(payload.contextText || "").trim();
  const helpContext = normalizeHelpContext(payload.helpContext);
  const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];
  const hasImage = Boolean(payload.imageDataUrl);
  if (!message && !hasImage) {
    sendJson(res, 400, { error: "Message is required." });
    return;
  }
  let imageOcrText = "";
  let imageOcrWarning = "";
  if (hasImage) {
    try {
      imageOcrText = await recognizeHelpImage(parseImageDataUrl(payload.imageDataUrl));
    } catch (error) {
      imageOcrWarning = error.message || "OCR failed";
    }
  }
  let ai = null;
  let warning = "";
  const evidenceGuard = readingEvidenceGuard({ helpContext, message, imageOcrText });
  if (evidenceGuard) {
    const guardedAnswer = ensureReadingHintLocation(evidenceGuard.answer, helpContext, message);
    sendJson(res, 200, {
      ...evidenceGuard,
      answer: guardedAnswer,
      readingEvidence: readingEvidencePayload(guardedAnswer, helpContext, message),
      ocrText: imageOcrText,
      warning: imageOcrWarning,
    });
    return;
  }
  try {
    ai = await callCoachAI({
      system: [
        "You are an IELTS tutor helping inside an IELTS practice web app.",
        "Answer the student's follow-up based on the OCR context, structured app context, and conversation.",
        "Use Chinese explanations by default. Keep IELTS terms and quoted question words in English.",
        "If the student asks how to use IELTS-ist or what to practise next, guide them through the product workflow first using the Current IELTS-ist surface. Dashboard/AI Coach recommends today's task, Practice has single Listening/Reading/Writing/AI Speaking topics, Simulation has Same test and Random exam, Writing supports custom tasks and Cambridge sets, Mine stores drafts/vocabulary/membership, and AI Coach explains screenshots or typed questions globally.",
        "If the student asks where they are, which screen is open, or what the current page is for, answer from the Current IELTS-ist surface before giving advice.",
        "When the student wants to start a practice area, answer as an agentic coach: briefly confirm the best module, explain why it fits, and tell them IELTS-ist will open the matching practice area.",
        "Recommended IELTSist workflow: start the recommended practice -> submit or finish -> read the AI explanation/report -> save vocabulary or weak area -> retest that skill.",
        sharedAccountProductFacts(),
        "Keep IELTS language, academic vocabulary, question wording and translation support in IELTSist Vocabulary. When a student wants Physics, Mathematics, Chemistry or Economics syllabus teaching, worked subject questions or past-paper practice, recommend STEM Campus only when that is relevant to the question.",
        "When useful, end with executable IELTSist next steps using these exact action labels: Save vocabulary, Add to weak area, Retest this skill, Generate similar question, Explain in Chinese, Show evidence.",
        "Treat AI Coach as the product brain across all modules, not a generic Help popup. Use the current screen, current question, student answer, correct answer, paper/audio evidence, writing text, speaking transcript, recent weak areas and vocabulary whenever they are present.",
        "The structured Reading/Listening context is authoritative app data. Use it even if the screenshot OCR is short, partial, or noisy.",
        "When hydrated focused Reading question text is present, treat that as the exact visible question, include a line beginning 题目： that quotes it before the explanation, and never claim the question text is missing or ask the student to upload it again.",
        "Be direct and practical; explain vocabulary, paraphrase, question type, strategy, and answer-location logic when relevant.",
        "If the student asks why a Reading answer is correct or why their answer is wrong, identify the relevant question number from their message/OCR/history, then use the Reading answer key and passage OCR text to explain: correct answer, source evidence, keyword-paraphrase chain, and why alternatives fail.",
        "For every Reading Hint request, the first line must be 位置：第X段，第Y句, where X and Y come from the indexed [P# S#] passage labels. Also quote the exact evidence sentence from the passage, even for Hint 1, so IELTS-ist can highlight it without revealing the final answer. If no exact indexed location is supported, begin with 位置：暂无法确认 and ask for the relevant passage screenshot instead of guessing.",
        "If the student asks a Listening question, identify the relevant question number from their message/OCR/history, then use the Listening answer key, question paper OCR, and audioscript/ASR text to explain: correct answer, audio evidence, distractors, paraphrase, spelling/plural/number format, and how to catch it next time.",
        "If options A/B/C/D or True/False/Not Given are involved, explain option-by-option only when the option text is available. Otherwise state that the option text is not visible and ask for a screenshot of the options.",
        "Never invent evidence. An answer key is not source evidence. If the passage sentence or audioscript is unavailable, do not infer the missing wording from the answer key or question type, do not claim a final answer is justified, and ask for the relevant screenshot instead.",
        "Never continue with phrases such as 'based on the answer key and question structure, the reasoning is' after admitting that source evidence is missing.",
        "Keep the answer compact and student-facing. Avoid raw Markdown decorations like ### headings or excessive **bold**. Use short labeled sections and simple bullets only when useful.",
      ].join("\n"),
      user: [
        helpContextBlock(helpContext),
        "",
        "OCR context:",
        contextText || "(No OCR context was captured.)",
        "",
        "Attached screenshot OCR:",
        imageOcrText || (hasImage ? "(No readable text recognized from the attached screenshot.)" : "(none)"),
        "",
        "Recent conversation:",
        history.map((item) => `${item.role || "assistant"}: ${item.content || ""}`).join("\n") || "(none)",
        "",
        `Student question: ${message}`,
      ].join("\n"),
      temperature: 0.25,
      helpContext,
      contextText,
    });
  } catch (error) {
    warning = coachProviderWarning(error);
  }
  const answer = sanitizeCoachStudentOutput(ai || localHelpExplanation(
    [contextText, imageOcrText].filter(Boolean).join("\n\n"),
    warning || imageOcrWarning,
    message,
  ));
  const resolvedAnswer = ensureReadingHintLocation(answer, helpContext, message);
  sendJson(res, 200, {
    mode: ai ? "ai" : "local",
    answer: resolvedAnswer,
    readingEvidence: readingEvidencePayload(resolvedAnswer, helpContext, message),
    ocrText: imageOcrText,
    warning: warning || imageOcrWarning,
  });
}

async function handleListeningScripts(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const payload = req.method === "GET" || req.method === "HEAD"
    ? {
        id: url.searchParams.get("id") || "",
        pageImageUrls: url.searchParams.getAll("pageImageUrl"),
        allowOcr: url.searchParams.get("allowOcr") !== "false",
      }
    : await readJsonBody(req);
  const id = String(payload.id || "").trim();
  if (!id) {
    sendJson(res, 400, { error: "Listening test id is required." });
    return;
  }
  const test = IMPORTED_BANKS.flatMap((bank) => bank.listeningTests || []).find((item) => item.id === id);
  if (!test) {
    sendJson(res, 404, { error: "Listening test not found." });
    return;
  }
  const pageImageUrls = Array.isArray(payload.pageImageUrls) ? payload.pageImageUrls.filter(Boolean) : [];
  const scripts = await resolveListeningScripts(test, pageImageUrls, { allowOcr: payload.allowOcr !== false });
  sendJson(res, 200, {
    id,
    title: test.title || "",
    source: test.source || "",
    mode: scripts.mode,
    available: scripts.available,
    sourceLabel: scripts.source || "",
    text: scripts.text || "",
    sections: scripts.sections || [],
    questionPaper: test.questionPaper || test.prompt || "",
  });
}

async function handleListeningAsrCache(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET") {
    const id = String(url.searchParams.get("id") || "").trim();
    const section = String(url.searchParams.get("section") || "").trim();
    if (!id || !section) {
      sendJson(res, 400, { error: "Listening id and section are required." });
      return;
    }
    const item = readListeningAsrCache(id, section);
    sendJson(res, 200, {
      available: Boolean(item),
      id,
      section,
      text: item?.text || "",
      timedWords: Array.isArray(item?.timedWords) ? item.timedWords : buildListeningTimedWords(item?.text || ""),
      sentences: Array.isArray(item?.sentences) ? item.sentences : [],
      speakers: Array.isArray(item?.speakers) ? item.speakers : [],
      timing: item?.timing || null,
      duration: Number.isFinite(Number(item?.duration)) ? Number(item.duration) : 0,
      source: item?.source || "",
      model: item?.model || "",
      mode: item?.mode || "",
      version: item?.version || 0,
      updatedAt: item?.updatedAt || "",
    });
    return;
  }
  if (req.method === "POST") {
    sendJson(res, 405, { error: "Listening captions use offline ASR cache only. Refresh data/listening-asr-cache.json with the cache script." });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

async function synthesizeFish(text, voice = "examiner") {
  if (!FISH_API_KEY) return null;
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;
  const referenceId = FISH_VOICES[voice] || FISH_VOICES.examiner;
  const response = await fetch(FISH_API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${FISH_API_KEY}`,
      "content-type": "application/json",
      model: FISH_MODEL,
    },
    body: JSON.stringify({
      text: cleanText,
      reference_id: referenceId,
      format: "mp3",
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fish Audio failed: HTTP ${response.status}: ${errorText.slice(0, 400)}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:audio/mpeg;base64,${bytes.toString("base64")}`;
}

function normalizeAnswer(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/\bpractise\b/g, "practice")
    .replace(/\blitres\b/g, "liters")
    .replace(/\blitre\b/g, "liter");
}

function expandObjectiveOptionalGroups(value) {
  let variants = [String(value || "")];
  for (let pass = 0; pass < 6; pass += 1) {
    let expanded = false;
    const next = [];
    variants.forEach((variant) => {
      const match = variant.match(/\(([^()]*)\)/);
      if (!match) {
        next.push(variant);
        return;
      }
      expanded = true;
      const choices = String(match[1] || "").split(/\s*\/\s*/).map((choice) => choice.trim()).filter(Boolean);
      ["", ...choices].forEach((replacement) => {
        next.push(`${variant.slice(0, match.index)}${replacement}${variant.slice(match.index + match[0].length)}`);
      });
    });
    variants = [...new Set(next)].slice(0, 64);
    if (!expanded) break;
  }
  return variants;
}

function canonicalObjectiveAnswerVariants(value) {
  const alternatives = String(value || "")
    .split(/\s+\/\s+|\s+or\s+/i)
    .map((answer) => answer.trim())
    .filter(Boolean);
  return [...new Set(alternatives.flatMap(expandObjectiveOptionalGroups).map(normalizeAnswer).filter(Boolean))];
}

function objectiveAnswerMatches(expected, actual) {
  const normalizedActual = normalizeAnswer(actual);
  return Boolean(normalizedActual && canonicalObjectiveAnswerVariants(expected).includes(normalizedActual));
}

function scoreObjective(questions, answers = {}) {
  let correct = 0;
  const scorableQuestions = questions.filter((question) => canonicalObjectiveAnswerVariants(question.answer).length);
  if (!scorableQuestions.length) {
    return {
      correct: 0,
      total: questions.length,
      scoredTotal: 0,
      band: null,
      answerAvailable: false,
      details: questions.map((question) => ({
        id: question.id,
        text: question.text,
        actual: answers[question.id] || "",
        correct: null,
      })),
    };
  }
  const groupedAnswers = new Map();
  questions.forEach((question) => {
    if (!question.optionGroupId || Number(question.selectionLimit || 1) <= 1) return;
    if (!groupedAnswers.has(question.optionGroupId)) groupedAnswers.set(question.optionGroupId, []);
    groupedAnswers.get(question.optionGroupId).push(question);
  });
  const usedGroupedAnswers = new Map();
  const details = questions.map((question) => {
    const expected = canonicalObjectiveAnswerVariants(question.answer);
    const actual = normalizeAnswer(answers[question.id]);
    if (!expected.length) {
      return { id: question.id, text: question.text, actual: answers[question.id] || "", correct: null };
    }
    let ok;
    const group = groupedAnswers.get(question.optionGroupId);
    if (group?.length) {
      const expectedSet = new Set(group.flatMap((item) => canonicalObjectiveAnswerVariants(item.answer)));
      const used = usedGroupedAnswers.get(question.optionGroupId) || new Set();
      ok = Boolean(actual && expectedSet.has(actual) && !used.has(actual));
      if (ok) used.add(actual);
      usedGroupedAnswers.set(question.optionGroupId, used);
    } else {
      ok = objectiveAnswerMatches(question.answer, actual);
    }
    if (ok) correct += 1;
    return { id: question.id, text: question.text, actual: answers[question.id] || "", correct: ok };
  });
  const band = Math.max(3, Math.min(9, Math.round((3 + (correct / Math.max(scorableQuestions.length, 1)) * 6) * 2) / 2));
  return { correct, total: questions.length, scoredTotal: scorableQuestions.length, band, answerAvailable: true, details };
}

function objectiveScoreRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function objectiveAttemptError(message, statusCode, code, publicDetails = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicDetails = publicDetails;
  return error;
}

function canonicalObjectiveTaskId(value) {
  return String(value || "").trim().split("::")[0];
}

function canonicalObjectiveTest(moduleName, value) {
  const taskId = canonicalObjectiveTaskId(value);
  const tests = moduleName === "listening" ? realListeningTests() : realReadingTests();
  return tests.find((test) => test.id === taskId) || null;
}

function sameObjectiveQuestionSet(first = [], second = []) {
  if (first.length !== second.length) return false;
  const expected = new Set(first.map((id) => String(id)));
  return second.every((id) => expected.has(String(id)));
}

function objectiveQuestionsForSubmission(moduleName, payload = {}, { requireComplete = false } = {}) {
  const submittedTaskId = String(payload.taskId || payload.sourceTaskId || "").trim();
  if (!submittedTaskId) throw objectiveScoreRequestError("A task id is required for scoring.");
  const test = canonicalObjectiveTest(moduleName, submittedTaskId);
  if (!test) throw objectiveScoreRequestError("This IELTS task is not available for scoring.");
  const questionIds = Array.isArray(payload.questionIds)
    ? [...new Set(payload.questionIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  if (!questionIds.length || questionIds.length > 40) {
    throw objectiveScoreRequestError("Select the task questions before submitting answers.");
  }
  const questionsById = new Map((test.questions || []).map((question) => [String(question.id || ""), question]));
  const metadata = moduleName === "listening"
    ? listeningQuestionMetadata(test.questionPaper)
    : readingQuestionMetadata(test.readingPaper);
  const enrichedQuestionsById = new Map([...questionsById.entries()].map(([id, question], index) => {
    const number = Number(String(id || question.text || index + 1).match(/\d{1,2}/)?.[0] || index + 1);
    return [id, { ...question, ...(metadata.get(number) || {}) }];
  }));
  const canonicalQuestionIds = [...questionsById.keys()].filter(Boolean);
  if (requireComplete && !sameObjectiveQuestionSet(canonicalQuestionIds, questionIds)) {
    throw objectiveAttemptError(
      "Full IELTS exams must include the complete canonical question set.",
      409,
      "objective_attempt_incomplete",
      { restartRequired: true },
    );
  }
  const questions = questionIds.map((id) => enrichedQuestionsById.get(id));
  if (questions.some((question) => !question)) {
    throw objectiveScoreRequestError("One or more submitted questions do not belong to this IELTS task.");
  }
  return requireComplete ? canonicalQuestionIds.map((id) => enrichedQuestionsById.get(id)) : questions;
}

function objectiveAttemptActor(req, res, { createGuest = false } = {}) {
  const user = optionalUser(req);
  if (user) return { ownerKey: `user:${user.id}`, userId: user.id };
  let guestToken = requestCookie(req, OBJECTIVE_GUEST_COOKIE);
  if (!guestToken && createGuest) {
    guestToken = crypto.randomBytes(32).toString("base64url");
    const secure = SESSION_COOKIE_SECURE ? "; Secure" : "";
    appendResponseCookie(
      res,
      `${OBJECTIVE_GUEST_COOKIE}=${encodeURIComponent(guestToken)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=31536000`,
    );
  }
  if (!guestToken) throw objectiveAttemptError("Start this practice before submitting it.", 409, "objective_attempt_required");
  return { ownerKey: `guest:${hashToken(guestToken)}`, userId: null };
}

function objectiveAttemptActorCandidates(req) {
  const user = optionalUser(req);
  const guestToken = requestCookie(req, OBJECTIVE_GUEST_COOKIE);
  return {
    user,
    userOwnerKey: user ? `user:${user.id}` : "",
    guestOwnerKey: guestToken ? `guest:${hashToken(guestToken)}` : "",
  };
}

function objectiveAttemptTokenMatches(row, token) {
  const received = Buffer.from(hashToken(token));
  const expected = Buffer.from(String(row?.attempt_token_hash || ""));
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function objectiveExamTokenMatches(row, token) {
  const received = Buffer.from(hashToken(token));
  const expected = Buffer.from(String(row?.exam_token_hash || ""));
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function objectiveAttemptPublic(row, attemptToken = "", idempotent = false) {
  return {
    attemptId: row.attempt_id,
    ...(attemptToken ? { attemptToken } : {}),
    context: row.context,
    module: row.module,
    taskId: row.task_id,
    examId: row.parent_exam_id || "",
    status: row.status,
    expiresAt: row.expires_at,
    submittedAt: row.submitted_at || "",
    idempotent,
  };
}

function objectiveExamPublic(row, examToken = "", idempotent = false) {
  return {
    examId: row.exam_id,
    ...(examToken ? { examToken } : {}),
    context: row.context,
    listeningTaskId: row.listening_task_id,
    readingTaskId: row.reading_task_id,
    manifest: parseStoredJson(row.manifest_json, {}),
    status: row.status,
    expiresAt: row.expires_at,
    submittedAt: row.submitted_at || "",
    idempotent,
  };
}

function objectiveCambridgeSetKey(taskId, moduleName) {
  const moduleCode = moduleName === "listening" ? "l" : "r";
  const match = canonicalObjectiveTaskId(taskId).match(new RegExp(`^cam(\\d+)-${moduleCode}-test(\\d+)$`, "i"));
  return match ? `cam${Number(match[1])}-test${Number(match[2])}` : "";
}

function normalizeObjectiveExamManifest(payload = {}) {
  const manifest = payload.manifest && typeof payload.manifest === "object" && !Array.isArray(payload.manifest)
    ? payload.manifest
    : {};
  const clean = (value, max = 120) => String(value || "").trim().slice(0, max);
  const writingSourceIds = Array.isArray(manifest.writingSourceIds)
    ? manifest.writingSourceIds.map((value) => clean(value, 160)).filter(Boolean).slice(0, 2)
    : [];
  const cleanManifest = {
    examId: clean(manifest.examId || payload.examIdLabel, 120),
    seed: clean(manifest.seed, 120),
    bankVersion: clean(manifest.bankVersion, 80),
    generatorVersion: clean(manifest.generatorVersion, 80),
    listeningSourceId: canonicalObjectiveTaskId(manifest.listeningSourceId || payload.listeningTaskId),
    readingSourceId: canonicalObjectiveTaskId(manifest.readingSourceId || payload.readingTaskId),
    writingSourceIds,
    speakingSourceId: clean(manifest.speakingSourceId, 160),
  };
  cleanManifest.manifestDigest = objectiveExamManifestDigest(cleanManifest);
  return cleanManifest;
}

function objectiveExamManifestDigest(manifest = {}) {
  const comparable = {
    examId: String(manifest.examId || ""),
    seed: String(manifest.seed || ""),
    bankVersion: String(manifest.bankVersion || ""),
    generatorVersion: String(manifest.generatorVersion || ""),
    listeningSourceId: canonicalObjectiveTaskId(manifest.listeningSourceId),
    readingSourceId: canonicalObjectiveTaskId(manifest.readingSourceId),
    writingSourceIds: Array.isArray(manifest.writingSourceIds)
      ? manifest.writingSourceIds.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 2)
      : [],
    speakingSourceId: String(manifest.speakingSourceId || "").trim(),
  };
  return crypto.createHash("sha256").update(JSON.stringify(comparable)).digest("hex");
}

function objectiveExamManifestMatches(first = {}, second = {}) {
  return objectiveExamManifestDigest(first) === objectiveExamManifestDigest(second);
}

function objectiveExamManifestHasExtendedSources(manifest = {}) {
  return Boolean(
    (Array.isArray(manifest.writingSourceIds) && manifest.writingSourceIds.length)
    || String(manifest.speakingSourceId || "").trim(),
  );
}

function objectiveExamReportManifest(payload = {}, fallback = {}) {
  const rawCandidate = payload.fullExamManifest || payload.manifest;
  const raw = rawCandidate && typeof rawCandidate === "object" && !Array.isArray(rawCandidate)
    ? rawCandidate
    : {};
  return normalizeObjectiveExamManifest({
    ...payload,
    ...fallback,
    manifest: {
      ...raw,
      listeningSourceId: raw.listeningSourceId || fallback.listeningSourceId,
      readingSourceId: raw.readingSourceId || fallback.readingSourceId,
    },
  });
}

function validateObjectiveExamManifestForReport(exam, payload, prepared) {
  const stored = parseStoredJson(exam?.manifest_json, {});
  if (!stored || !stored.manifestDigest) return;
  const supplied = payload?.fullExamManifest || payload?.manifest;
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    if (objectiveExamManifestHasExtendedSources(stored)) {
      throw objectiveAttemptError("The full-exam source manifest is required for this submission.", 409, "objective_exam_mismatch");
    }
    return;
  }
  const incoming = objectiveExamReportManifest(payload, {
    listeningSourceId: prepared.find((item) => item.moduleName === "listening")?.row.task_id,
    readingSourceId: prepared.find((item) => item.moduleName === "reading")?.row.task_id,
  });
  if (!objectiveExamManifestMatches(stored, incoming)) {
    throw objectiveAttemptError("The full-exam source manifest does not match this attempt.", 409, "objective_exam_mismatch");
  }
}

function inspectObjectiveExam(req, examId, examToken, expectedContext = "", { deferGuestClaim = false } = {}) {
  if (!/^objective_exam_[A-Za-z0-9_-]{16,}$/.test(String(examId || "")) || !String(examToken || "")) {
    throw objectiveAttemptError("Start this full exam before opening its papers.", 409, "objective_exam_required");
  }
  const db = getAppDb();
  let row = db.prepare("SELECT * FROM objective_exam_attempts WHERE exam_id = ?").get(examId);
  if (!row || !objectiveExamTokenMatches(row, examToken)) {
    throw objectiveAttemptError("This full exam is unavailable.", 403, "objective_exam_forbidden");
  }
  const actors = objectiveAttemptActorCandidates(req);
  const ownedByUser = Boolean(actors.userOwnerKey && row.owner_key === actors.userOwnerKey);
  const ownedByGuestCookie = Boolean(actors.guestOwnerKey && row.owner_key === actors.guestOwnerKey);
  if (!ownedByUser && !ownedByGuestCookie) {
    throw objectiveAttemptError("This full exam is unavailable.", 403, "objective_exam_forbidden");
  }
  let ownerClaim = null;
  if (row.status === "open" && ownedByGuestCookie && actors.userOwnerKey) {
    ownerClaim = {
      userOwnerKey: actors.userOwnerKey,
      userId: actors.user.id,
      guestOwnerKey: actors.guestOwnerKey,
    };
    if (!deferGuestClaim) {
      db.prepare(`
        UPDATE OR IGNORE objective_exam_attempts
        SET owner_key = ?, user_id = ?
        WHERE exam_id = ? AND owner_key = ? AND status = 'open'
      `).run(ownerClaim.userOwnerKey, ownerClaim.userId, row.exam_id, ownerClaim.guestOwnerKey);
      row = db.prepare("SELECT * FROM objective_exam_attempts WHERE exam_id = ?").get(row.exam_id);
      if (row.owner_key !== actors.userOwnerKey && row.owner_key !== actors.guestOwnerKey) {
        throw objectiveAttemptError("This full exam is unavailable.", 403, "objective_exam_forbidden");
      }
      ownerClaim = null;
    }
  }
  if (expectedContext && row.context !== expectedContext) {
    throw objectiveAttemptError("This full exam belongs to another context.", 409, "objective_exam_mismatch");
  }
  if (row.status === "open" && Date.parse(row.expires_at) <= Date.now()) {
    throw objectiveAttemptError(
      "This full exam expired. Generate a new exam.",
      410,
      "objective_exam_expired",
      { restartRequired: true },
    );
  }
  return { row, ownerClaim };
}

async function handleObjectiveExamStart(req, res) {
  const payload = await readJsonBody(req);
  const clientExamKey = String(payload.clientExamKey || "").trim();
  const requestedExamToken = String(payload.examToken || "").trim();
  const context = String(payload.context || "").trim();
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(clientExamKey) || !["same-test", "random-exam"].includes(context)) {
    throw objectiveAttemptError("A valid full-exam request is required.", 400, "invalid_objective_exam");
  }
  if (requestedExamToken && !/^[A-Za-z0-9_-]{32,128}$/.test(requestedExamToken)) {
    throw objectiveAttemptError("Invalid full-exam capability.", 400, "invalid_objective_exam");
  }
  const listeningTaskId = canonicalObjectiveTaskId(payload.listeningTaskId);
  const readingTaskId = canonicalObjectiveTaskId(payload.readingTaskId);
  if (!canonicalObjectiveTest("listening", listeningTaskId) || !canonicalObjectiveTest("reading", readingTaskId)) {
    throw objectiveAttemptError("One or more full-exam papers are unavailable.", 400, "invalid_objective_exam");
  }
  if (context === "same-test") {
    const listeningSet = objectiveCambridgeSetKey(listeningTaskId, "listening");
    const readingSet = objectiveCambridgeSetKey(readingTaskId, "reading");
    if (!listeningSet || listeningSet !== readingSet) {
      throw objectiveAttemptError("Same Test requires Listening and Reading from the same Cambridge test.", 409, "objective_exam_mismatch");
    }
  }
  const requestedManifest = normalizeObjectiveExamManifest(payload);
  if (requestedManifest.listeningSourceId !== listeningTaskId
    || requestedManifest.readingSourceId !== readingTaskId) {
    throw objectiveAttemptError("The full-exam source manifest does not match its Listening and Reading papers.", 409, "objective_exam_mismatch");
  }
  if (objectiveExamManifestHasExtendedSources(requestedManifest)
    && (requestedManifest.writingSourceIds.length !== 2 || !requestedManifest.speakingSourceId)) {
    throw objectiveAttemptError("The full-exam source manifest is incomplete.", 409, "objective_exam_mismatch");
  }
  const actor = objectiveAttemptActor(req, res, { createGuest: true });
  const db = getAppDb();
  let existing = db.prepare(`
    SELECT * FROM objective_exam_attempts WHERE owner_key = ? AND client_exam_key = ?
  `).get(actor.ownerKey, clientExamKey);
  let retryingGuestAfterLogin = false;
  if (!existing && actor.userId) {
    const guestOwnerKey = objectiveAttemptActorCandidates(req).guestOwnerKey;
    if (guestOwnerKey) {
      existing = db.prepare(`SELECT * FROM objective_exam_attempts WHERE owner_key = ? AND client_exam_key = ?`)
        .get(guestOwnerKey, clientExamKey);
      retryingGuestAfterLogin = Boolean(existing);
    }
  }
  if (existing) {
    if (!requestedExamToken) {
      throw objectiveAttemptError("Retry this full-exam start with its original capability.", 409, "objective_exam_retry_requires_capability", { retryable: true });
    }
    if (!objectiveExamTokenMatches(existing, requestedExamToken)) {
      throw objectiveAttemptError("This full exam is unavailable.", 403, "objective_exam_forbidden");
    }
    if (existing.context !== context || existing.listening_task_id !== listeningTaskId || existing.reading_task_id !== readingTaskId) {
      throw objectiveAttemptError("The retry does not match the original full exam.", 409, "objective_exam_mismatch", { restartRequired: true });
    }
    const existingManifest = parseStoredJson(existing.manifest_json, {});
    if (!objectiveExamManifestMatches(existingManifest, requestedManifest)) {
      throw objectiveAttemptError("The retry does not match the original full-exam source manifest.", 409, "objective_exam_mismatch", { restartRequired: true });
    }
    if (existing.status === "open" && Date.parse(existing.expires_at) <= Date.now()) {
      throw objectiveAttemptError("This full exam expired. Generate a new exam.", 410, "objective_exam_expired", { restartRequired: true });
    }
    if (retryingGuestAfterLogin && existing.status === "open") {
      db.prepare(`
        UPDATE OR IGNORE objective_exam_attempts SET owner_key = ?, user_id = ?
        WHERE exam_id = ? AND owner_key = ? AND status = 'open'
      `).run(actor.ownerKey, actor.userId, existing.exam_id, existing.owner_key);
      existing = db.prepare("SELECT * FROM objective_exam_attempts WHERE exam_id = ?").get(existing.exam_id);
    }
    sendJson(res, 200, objectiveExamPublic(existing, requestedExamToken, true));
    return;
  }
  const examId = `objective_exam_${crypto.randomBytes(18).toString("base64url")}`;
  const examToken = requestedExamToken || crypto.randomBytes(32).toString("base64url");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + OBJECTIVE_ATTEMPT_TTL_MS).toISOString();
  db.prepare(`
    INSERT INTO objective_exam_attempts (
      exam_id, client_exam_key, owner_key, user_id, exam_token_hash, context,
      listening_task_id, reading_task_id, manifest_json, status, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    examId,
    clientExamKey,
    actor.ownerKey,
    actor.userId,
    hashToken(examToken),
    context,
    listeningTaskId,
    readingTaskId,
    JSON.stringify(requestedManifest),
    createdAt,
    expiresAt,
  );
  sendJson(res, 201, objectiveExamPublic(db.prepare("SELECT * FROM objective_exam_attempts WHERE exam_id = ?").get(examId), examToken, false));
}

async function handleObjectiveAttemptStart(req, res) {
  const payload = await readJsonBody(req);
  const clientAttemptKey = String(payload.clientAttemptKey || "").trim();
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(clientAttemptKey)) {
    throw objectiveAttemptError("A stable client attempt key is required.", 400, "invalid_objective_attempt");
  }
  const context = String(payload.context || "single").trim();
  if (!["single", "same-test", "random-exam"].includes(context)) {
    throw objectiveAttemptError("Invalid objective practice context.", 400, "invalid_objective_attempt");
  }
  const moduleName = String(payload.module || "").trim().toLowerCase();
  if (!["listening", "reading"].includes(moduleName)) {
    throw objectiveAttemptError("Objective attempts support Listening or Reading.", 400, "invalid_objective_attempt");
  }
  const requestedAttemptToken = String(payload.attemptToken || "").trim();
  if (requestedAttemptToken && !/^[A-Za-z0-9_-]{32,128}$/.test(requestedAttemptToken)) {
    throw objectiveAttemptError("Invalid objective attempt capability.", 400, "invalid_objective_attempt");
  }
  const questions = objectiveQuestionsForSubmission(moduleName, payload, { requireComplete: context !== "single" });
  const actor = objectiveAttemptActor(req, res, { createGuest: true });
  const db = getAppDb();
  const requestedTaskId = canonicalObjectiveTaskId(payload.taskId || payload.sourceTaskId);
  const parentExam = context === "single"
    ? null
    : inspectObjectiveExam(req, payload.examId, payload.examToken, context).row;
  if (parentExam) {
    const expectedTaskId = moduleName === "listening" ? parentExam.listening_task_id : parentExam.reading_task_id;
    if (requestedTaskId !== expectedTaskId || parentExam.status !== "open") {
      throw objectiveAttemptError("This paper does not belong to the active full exam.", 409, "objective_exam_mismatch");
    }
  }
  let existing = db.prepare(`
    SELECT * FROM objective_attempts
    WHERE owner_key = ? AND client_attempt_key = ? AND module = ?
  `).get(actor.ownerKey, clientAttemptKey, moduleName);
  let retryingGuestAttemptAfterLogin = false;
  if (!existing && actor.userId) {
    const guestOwnerKey = objectiveAttemptActorCandidates(req).guestOwnerKey;
    if (guestOwnerKey) {
      existing = db.prepare(`
        SELECT * FROM objective_attempts
        WHERE owner_key = ? AND client_attempt_key = ? AND module = ?
      `).get(guestOwnerKey, clientAttemptKey, moduleName);
      retryingGuestAttemptAfterLogin = Boolean(existing);
    }
  }
  if (existing) {
    if (!requestedAttemptToken) {
      throw objectiveAttemptError(
        "Retry this start request with its original capability.",
        409,
        "objective_attempt_retry_requires_capability",
        { retryable: true },
      );
    }
    if (!objectiveAttemptTokenMatches(existing, requestedAttemptToken)) {
      throw objectiveAttemptError("This objective attempt is unavailable.", 403, "objective_attempt_forbidden");
    }
    const requestedQuestionIds = questions.map((question) => String(question.id));
    const existingQuestionIds = parseStoredJson(existing.question_ids_json, []);
    if (existing.context !== context
      || existing.task_id !== requestedTaskId
      || String(existing.parent_exam_id || "") !== String(parentExam?.exam_id || "")
      || !sameObjectiveQuestionSet(existingQuestionIds, requestedQuestionIds)) {
      throw objectiveAttemptError(
        "The retry does not match the original objective attempt.",
        409,
        "objective_attempt_mismatch",
        { restartRequired: true },
      );
    }
    if (existing.status === "open" && Date.parse(existing.expires_at) <= Date.now()) {
      throw objectiveAttemptError(
        "This objective attempt expired. Start a new practice with a new client attempt key.",
        410,
        "objective_attempt_expired",
        { restartRequired: true },
      );
    }
    if (retryingGuestAttemptAfterLogin && existing.status === "open") {
      const claimed = db.prepare(`
        UPDATE OR IGNORE objective_attempts
        SET owner_key = ?, user_id = ?
        WHERE attempt_id = ? AND owner_key = ? AND status = 'open'
      `).run(actor.ownerKey, actor.userId, existing.attempt_id, existing.owner_key);
      if (Number(claimed.changes) !== 1) {
        throw objectiveAttemptError("This objective attempt is unavailable.", 403, "objective_attempt_forbidden");
      }
      existing = db.prepare("SELECT * FROM objective_attempts WHERE attempt_id = ?").get(existing.attempt_id);
    }
    sendJson(res, 200, objectiveAttemptPublic(existing, requestedAttemptToken, true));
    return;
  }
  const attemptId = `objective_${crypto.randomBytes(18).toString("base64url")}`;
  const attemptToken = requestedAttemptToken || crypto.randomBytes(32).toString("base64url");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + OBJECTIVE_ATTEMPT_TTL_MS).toISOString();
  db.prepare(`
    INSERT INTO objective_attempts (
      attempt_id, client_attempt_key, owner_key, user_id, attempt_token_hash, context, module, task_id,
      parent_exam_id, question_ids_json, status, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    attemptId,
    clientAttemptKey,
    actor.ownerKey,
    actor.userId,
    hashToken(attemptToken),
    context,
    moduleName,
    requestedTaskId,
    parentExam?.exam_id || null,
    JSON.stringify(questions.map((question) => String(question.id))),
    createdAt,
    expiresAt,
  );
  const row = db.prepare("SELECT * FROM objective_attempts WHERE attempt_id = ?").get(attemptId);
  sendJson(res, 201, objectiveAttemptPublic(row, attemptToken, false));
}

function inspectObjectiveAttempt(req, attemptId, attemptToken, expectedModule = "", { deferGuestClaim = false } = {}) {
  if (!/^objective_[A-Za-z0-9_-]{16,}$/.test(String(attemptId || "")) || !String(attemptToken || "")) {
    throw objectiveAttemptError("Start this practice before submitting it.", 409, "objective_attempt_required");
  }
  const db = getAppDb();
  let row = db.prepare("SELECT * FROM objective_attempts WHERE attempt_id = ?").get(attemptId);
  if (!row || !objectiveAttemptTokenMatches(row, attemptToken)) {
    throw objectiveAttemptError("This objective attempt is unavailable.", 403, "objective_attempt_forbidden");
  }
  const actors = objectiveAttemptActorCandidates(req);
  const ownedByUser = Boolean(actors.userOwnerKey && row.owner_key === actors.userOwnerKey);
  const ownedByGuestCookie = Boolean(actors.guestOwnerKey && row.owner_key === actors.guestOwnerKey);
  if (!ownedByUser && !ownedByGuestCookie) {
    throw objectiveAttemptError("This objective attempt is unavailable.", 403, "objective_attempt_forbidden");
  }
  let ownerClaim = null;
  if (row.status === "open" && ownedByGuestCookie && actors.userOwnerKey) {
    ownerClaim = {
      userOwnerKey: actors.userOwnerKey,
      userId: actors.user.id,
      guestOwnerKey: actors.guestOwnerKey,
    };
    if (!deferGuestClaim) {
      db.prepare(`
        UPDATE OR IGNORE objective_attempts
        SET owner_key = ?, user_id = ?
        WHERE attempt_id = ? AND owner_key = ? AND status = 'open'
      `).run(ownerClaim.userOwnerKey, ownerClaim.userId, row.attempt_id, ownerClaim.guestOwnerKey);
      row = db.prepare("SELECT * FROM objective_attempts WHERE attempt_id = ?").get(row.attempt_id);
      if (row.owner_key !== actors.userOwnerKey && row.owner_key !== actors.guestOwnerKey) {
        throw objectiveAttemptError("This objective attempt is unavailable.", 403, "objective_attempt_forbidden");
      }
      ownerClaim = null;
    }
  }
  if (expectedModule && row.module !== expectedModule) {
    throw objectiveAttemptError("This attempt belongs to another module.", 409, "objective_attempt_mismatch");
  }
  if (row.status === "open" && Date.parse(row.expires_at) <= Date.now()) {
    throw objectiveAttemptError(
      "This objective attempt expired. Start a new practice with a new client attempt key.",
      410,
      "objective_attempt_expired",
      { restartRequired: true },
    );
  }
  return { row, ownerClaim };
}

function requireObjectiveAttempt(req, res, attemptId, attemptToken, expectedModule = "") {
  return inspectObjectiveAttempt(req, attemptId, attemptToken, expectedModule).row;
}

function objectiveAnswersDigest(questionIds, answers = {}) {
  const canonical = questionIds.map((questionId) => [questionId, String(answers[questionId] || "")]);
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function objectiveGuestRateKey(req) {
  const socketAddress = String(req?.socket?.remoteAddress || "").trim();
  const fromLoopback = /^(?:127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(socketAddress);
  const forwarded = fromLoopback ? String(req?.headers?.["x-forwarded-for"] || "").split(",", 1)[0].trim() : "";
  const address = forwarded || socketAddress || "unknown";
  return crypto.createHash("sha256").update(`objective-guest:${address}`).digest("hex");
}

function reserveObjectiveGuestSubmission(rateKey) {
  const windowDate = new Date().toISOString().slice(0, 10);
  const updatedAt = nowIso();
  const update = getAppDb().prepare(`
    INSERT INTO objective_guest_submission_limits (rate_key, window_date, submissions, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(rate_key, window_date) DO UPDATE SET
      submissions = submissions + 1,
      updated_at = excluded.updated_at
    WHERE objective_guest_submission_limits.submissions < ?
  `).run(rateKey, windowDate, updatedAt, OBJECTIVE_GUEST_DAILY_SUBMISSION_LIMIT);
  if (Number(update.changes) !== 1) {
    throw objectiveAttemptError(
      "Guest review limit reached for today. Sign in to continue saved practice.",
      429,
      "objective_guest_limit_reached",
      { retryable: true },
    );
  }
}

function objectiveSubmissionResponse(row, result, idempotent) {
  const moduleLabel = row.module === "listening" ? "Listening" : "Reading";
  const feedback = result.answerAvailable
    ? `${moduleLabel} score: ${result.correct}/${result.scoredTotal}, estimated Band ${result.band.toFixed(1)}. Review wrong answers for keywords, paraphrasing, spelling and plural forms.`
    : `${moduleLabel}: answers are not imported for this local Cambridge paper yet. Your responses remain on the page, but the app cannot score this test automatically.`;
  return {
    mode: "local",
    module: row.module,
    attemptId: row.attempt_id,
    status: "submitted",
    idempotent,
    result,
    feedback,
    reviewAvailable: true,
  };
}

function prepareObjectiveSubmission(req, res, moduleName, payload = {}, allowedContexts = ["single"]) {
  const inspected = inspectObjectiveAttempt(
    req,
    payload.attemptId,
    payload.attemptToken,
    moduleName,
    { deferGuestClaim: true },
  );
  const row = inspected.row;
  if (!allowedContexts.includes(row.context)) {
    throw objectiveAttemptError("This attempt belongs to another practice context.", 409, "objective_attempt_mismatch");
  }
  const questionIds = parseStoredJson(row.question_ids_json, []);
  const answers = payload.answers && typeof payload.answers === "object" && !Array.isArray(payload.answers)
    ? payload.answers
    : {};
  const answersDigest = objectiveAnswersDigest(questionIds, answers);
  if (row.status === "submitted") {
    if (row.answers_digest !== answersDigest) {
      throw objectiveAttemptError("This attempt was already submitted and cannot be changed.", 409, "objective_attempt_locked");
    }
    return {
      row,
      moduleName,
      payload,
      result: parseStoredJson(row.result_json, {}),
      answersDigest,
      ownerClaim: inspected.ownerClaim,
      idempotent: true,
    };
  }
  const questions = objectiveQuestionsForSubmission(moduleName, {
    taskId: row.task_id,
    questionIds,
  }, { requireComplete: row.context !== "single" });
  return {
    row,
    moduleName,
    payload,
    result: scoreObjective(questions, answers),
    answersDigest,
    ownerClaim: inspected.ownerClaim,
    guestRateKey: row.user_id || inspected.ownerClaim?.userId ? "" : objectiveGuestRateKey(req),
    idempotent: false,
  };
}

function commitObjectiveSubmission(prepared) {
  let { row } = prepared;
  const { result, answersDigest } = prepared;
  if (prepared.idempotent) {
    return objectiveSubmissionResponse(row, result, true);
  }
  if (prepared.guestRateKey) reserveObjectiveGuestSubmission(prepared.guestRateKey);
  if (prepared.ownerClaim) {
    const { userOwnerKey, userId, guestOwnerKey } = prepared.ownerClaim;
    getAppDb().prepare(`
      UPDATE OR IGNORE objective_attempts
      SET owner_key = ?, user_id = ?
      WHERE attempt_id = ? AND owner_key = ? AND status = 'open'
    `).run(userOwnerKey, userId, row.attempt_id, guestOwnerKey);
    row = getAppDb().prepare("SELECT * FROM objective_attempts WHERE attempt_id = ?").get(row.attempt_id);
    if (row.owner_key !== userOwnerKey && row.owner_key !== guestOwnerKey) {
      throw objectiveAttemptError("This objective attempt is unavailable.", 403, "objective_attempt_forbidden");
    }
  }
  const submittedAt = nowIso();
  const update = getAppDb().prepare(`
    UPDATE objective_attempts
    SET status = 'submitted', answers_digest = ?, result_json = ?, submitted_at = ?
    WHERE attempt_id = ? AND status = 'open'
  `).run(answersDigest, JSON.stringify(result), submittedAt, row.attempt_id);
  if (Number(update.changes) !== 1) {
    const latest = getAppDb().prepare("SELECT * FROM objective_attempts WHERE attempt_id = ?").get(row.attempt_id);
    if (latest?.status === "submitted" && latest.answers_digest === answersDigest) {
      return objectiveSubmissionResponse(latest, parseStoredJson(latest.result_json, {}), true);
    }
    throw objectiveAttemptError("This attempt was already submitted and cannot be changed.", 409, "objective_attempt_locked");
  }
  const submitted = getAppDb().prepare("SELECT * FROM objective_attempts WHERE attempt_id = ?").get(row.attempt_id);
  return objectiveSubmissionResponse(submitted, result, false);
}

function submitObjectiveBatch(req, res, specifications, options = {}) {
  const db = getAppDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const prepared = specifications.map((specification) => prepareObjectiveSubmission(
      req,
      res,
      specification.moduleName,
      specification.payload,
      specification.allowedContexts,
    ));
    const batchState = typeof options.validatePrepared === "function"
      ? options.validatePrepared(prepared, db)
      : null;
    const submissions = prepared.map(commitObjectiveSubmission);
    if (typeof options.afterCommit === "function") options.afterCommit(batchState, prepared, submissions, db);
    db.exec("COMMIT");
    return submissions;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {}
    throw error;
  }
}

function submitObjectiveAttempt(req, res, moduleName, payload = {}, allowedContexts = ["single"]) {
  return submitObjectiveBatch(req, res, [{ moduleName, payload, allowedContexts }])[0];
}

function submitObjectiveAttemptPair(req, res, payload, examContext) {
  const [listening, reading] = submitObjectiveBatch(req, res, [
    { moduleName: "listening", payload: payload.listening || {}, allowedContexts: [examContext] },
    { moduleName: "reading", payload: payload.reading || {}, allowedContexts: [examContext] },
  ], {
    validatePrepared(prepared, db) {
      const [listeningPrepared, readingPrepared] = prepared;
      const examId = String(listeningPrepared.row.parent_exam_id || "");
      if (!examId || examId !== String(readingPrepared.row.parent_exam_id || "")) {
        throw objectiveAttemptError("Listening and Reading must belong to the same full exam.", 409, "objective_exam_mismatch");
      }
      const exam = db.prepare("SELECT * FROM objective_exam_attempts WHERE exam_id = ?").get(examId);
      if (!exam
        || exam.context !== examContext
        || exam.listening_task_id !== listeningPrepared.row.task_id
        || exam.reading_task_id !== readingPrepared.row.task_id) {
        throw objectiveAttemptError("The full-exam paper binding is invalid.", 409, "objective_exam_mismatch");
      }
      if (exam.status === "submitted" && (!listeningPrepared.idempotent || !readingPrepared.idempotent)) {
        throw objectiveAttemptError("This full exam was already submitted.", 409, "objective_attempt_locked");
      }
      if (exam.status === "open" && Date.parse(exam.expires_at) <= Date.now()) {
        throw objectiveAttemptError("This full exam expired. Generate a new exam.", 410, "objective_exam_expired", { restartRequired: true });
      }
      validateObjectiveExamManifestForReport(exam, payload, prepared);
      return exam;
    },
    afterCommit(exam, prepared, submissions, db) {
      if (!exam || exam.status === "submitted") return;
      const submittedAt = nowIso();
      const update = db.prepare(`
        UPDATE objective_exam_attempts SET status = 'submitted', submitted_at = ?
        WHERE exam_id = ? AND status = 'open'
      `).run(submittedAt, exam.exam_id);
      if (Number(update.changes) !== 1) {
        throw objectiveAttemptError("This full exam could not be locked atomically.", 409, "objective_attempt_locked");
      }
      submissions.forEach((submission) => { submission.examId = exam.exam_id; });
    },
  });
  return { listening, reading };
}

function handleObjectiveAttemptReview(req, res, attemptId) {
  const attemptToken = String(req.headers["x-objective-attempt"] || "").trim();
  const row = requireObjectiveAttempt(req, res, attemptId, attemptToken);
  if (row.status !== "submitted") {
    throw objectiveAttemptError("Submit this attempt before opening review.", 409, "objective_attempt_not_submitted");
  }
  const result = parseStoredJson(row.result_json, {});
  const questionIds = parseStoredJson(row.question_ids_json, []);
  const questions = objectiveQuestionsForSubmission(
    row.module,
    { taskId: row.task_id, questionIds },
    { requireComplete: row.context !== "single" },
  );
  const questionById = new Map(questions.map((question) => [String(question.id), question]));
  const wrongAnswers = (result.details || [])
    .filter((detail) => detail.correct === false)
    .map((detail) => {
      const question = questionById.get(String(detail.id));
      return {
        questionId: String(detail.id),
        questionText: String(question?.text || detail.text || ""),
        studentAnswer: String(detail.actual || ""),
        canonicalAnswer: String(question?.answer || ""),
      };
    });
  sendJson(res, 200, {
    attemptId: row.attempt_id,
    status: row.status,
    module: row.module,
    taskId: row.task_id,
    wrongAnswers,
  });
}

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function extractSpeakingBand(text) {
  const clean = String(text || "");
  const directPatterns = [
    /overall\s*band\s*[:：]?\s*(?:band\s*)?([0-9](?:\.\d)?)/i,
    /overall\s*(?:speaking\s*)?band\s*(?:score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /overall\s*(?:speaking\s*)?(?:score|result)\s*(?:is|=|:|：|-)?\s*(?:band\s*)?([0-9](?:\.\d)?)/i,
    /final\s*(?:speaking\s*)?(?:band|score)\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:speaking\s*)?band\s*score\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
  ];
  for (const pattern of directPatterns) {
    const match = clean.match(pattern);
    const value = Number.parseFloat(match?.[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 9) {
      return Math.round(value * 2) / 2;
    }
  }
  const criterionPatterns = [
    /(?:fluency\s*(?:and|&)\s*coherence|\bfc\b)\s*(?:band|score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:lexical\s*resource|\blr\b)\s*(?:band|score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:grammatical\s*range\s*(?:and|&)\s*accuracy|\bgra\b)\s*(?:band|score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:pronunciation|\bp\b)\s*(?:band|score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
  ];
  const scores = criterionPatterns
    .map((pattern) => Number.parseFloat(clean.match(pattern)?.[1]))
    .filter((score) => Number.isFinite(score) && score >= 0 && score <= 9);
  if (scores.length === 4) {
    const avg = scores.reduce((sum, score) => sum + score, 0) / 4;
    return Math.round(avg * 2) / 2;
  }
  const heuristic = wordCount(clean) > 180 ? 6.5 : 6.0;
  return Math.round(heuristic * 2) / 2;
}

function extractSpeakingBandStable(text) {
  const clean = String(text || "").replace(/\*/g, " ");
  const directPatterns = [
    /overall\s*speaking\s*band\s*(?:score)?\s*(?:is|=|:|-)?\s*([0-9](?:\.\d)?)/i,
    /overall\s*band\s*(?:score)?\s*(?:is|=|:|-)?\s*([0-9](?:\.\d)?)/i,
    /overall\s*(?:speaking\s*)?(?:score|result)\s*(?:is|=|:|-)?\s*(?:band\s*)?([0-9](?:\.\d)?)/i,
    /final\s*(?:speaking\s*)?(?:band|score)\s*(?:is|=|:|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:speaking\s*)?band\s*score\s*(?:is|=|:|-)?\s*([0-9](?:\.\d)?)/i,
  ];
  for (const pattern of directPatterns) {
    const value = Number.parseFloat(clean.match(pattern)?.[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 9) return Math.round(value * 2) / 2;
  }
  const criterionPatterns = [
    /(?:fluency\s*(?:and|&)\s*coherence|\bfc\b)\s*(?:band|score)?\s*(?:is|=|:|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:lexical\s*resource|\blr\b)\s*(?:band|score)?\s*(?:is|=|:|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:grammatical\s*range\s*(?:and|&)\s*accuracy|\bgra\b)\s*(?:band|score)?\s*(?:is|=|:|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:pronunciation|\bp\b)\s*(?:band|score)?\s*(?:is|=|:|-)?\s*([0-9](?:\.\d)?)/i,
  ];
  const scores = criterionPatterns
    .map((pattern) => Number.parseFloat(clean.match(pattern)?.[1]))
    .filter((score) => Number.isFinite(score) && score >= 0 && score <= 9);
  if (scores.length === 4) {
    const avg = scores.reduce((sum, score) => sum + score, 0) / 4;
    return Math.round(avg * 2) / 2;
  }
  return extractSpeakingBand(text);
}

function localWritingFeedbackLegacy(prompt, essay, warning = "") {
  const words = wordCount(essay);
  const paragraphs = essay.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const taskScore = words < 180 ? 5 : words < 240 ? 6 : 7;
  const ccScore = paragraphs.length >= 4 ? 7 : paragraphs.length >= 2 ? 6 : 5;
  const lrScore = words > 240 ? 7 : 6;
  const graScore = words > 240 ? 7 : 6;
  const avg = (taskScore + ccScore + lrScore + graScore) / 4;
  const overall = Math.round(avg * 2) / 2;

  return [
    "题目：" + prompt,
    "",
    "逐段批改：",
    "",
    ...paragraphs.flatMap((p, index) => [
      `原文第 ${index + 1} 段：`,
      p,
      "",
      "反馈：这一段的基本意思可以理解。当前本地模式只能做规则化初评：请重点检查这一段是否有清楚的中心句、是否直接回应题目、解释链条是否完整。如果要争取更高分，需要把“观点 -> 原因 -> 结果/例子”写完整，而不是只停留在泛泛判断。",
      "",
    ]),
    "Category | Feedback | Score",
    "--- | --- | ---",
    `Task Response/Task Achievement | ${words < 250 ? "字数或论证发展偏保守，观点需要更充分展开。" : "基本回应题目，主要观点较清楚。"} | ${taskScore}`,
    `Coherence and Cohesion | ${paragraphs.length < 4 ? "段落数量或功能不够清晰，建议使用引言、两个主体段和结论。" : "段落结构较清楚，但衔接可以更自然。"} | ${ccScore}`,
    `Lexical Resource | 词汇能表达基本意思，但需要更多准确搭配和主题词。 | ${lrScore}`,
    `Grammatical Range and Accuracy | 句式有一定变化，但需要检查复杂句、冠词和单复数。 | ${graScore}`,
    "",
    `Overall, I would score your essay at a band score ${overall.toFixed(1)}`,
    "",
    "提升后范文参考：",
    OPENAI_API_KEY
      ? `第三方 AI 接口已配置为 ${OPENAI_BASE_URL}，但本次调用失败，所以暂时只生成了本地规则初评，没有生成完整 7.5 范文。失败原因：${warning || "第三方接口未返回有效内容"}`
      : "当前未配置 AI API KEY，因此没有生成完整 7.5 范文。设置环境变量后，系统会按 Amber IELTS Writing Feedback Skill 输出逐段批改、评分、范文和中英对比。",
  ].join("\n");
}

function fullExamSystemPromptChinese() {
  return [
    "You are an IELTS examiner and study coach.",
    "The candidate has completed an IELTS exam set. Listening and Reading objective scores are provided; Writing Task 1 and Task 2 responses may both be included. Speaking may include a band score from the embedded real-time IELTS speaking examiner.",
    "Return a concise Chinese score report with estimated Listening, Reading, Writing, and Speaking bands when available, overall band, weaknesses by module, and a 7-day improvement plan.",
    "For writing feedback, follow IELTS criteria and preserve the student's ideas.",
  ].join("\n");
}

function localNextSpeakingQuestion(set, history = [], part = "part1") {
  const speakingSets = getSpeakingSets();
  const selected = speakingSets.find((item) => item.title === set || item.id === set) || speakingSets[0];
  const askedCount = history.filter((item) => item.role === "examiner").length;
  if (part === "part2") {
    return askedCount === 0
      ? selected.part2
      : "Would you like to add one more detail about why this experience was important to you?";
  }
  const pool = part === "part3" ? selected.part3 : selected.part1;
  return pool[askedCount % pool.length];
}

async function handleLegacyWriting(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const prompt = String(payload.prompt || "").trim();
  const essay = String(payload.essay || "").trim();
  if (!prompt || !essay) {
    sendJson(res, 400, { error: "题目和作文都不能为空。" });
    return;
  }

  let ai = null;
  let warning = "";
  try {
    ai = await callOpenAI({
      system: writingSystemPrompt(),
      user: `题目：${prompt}\n\n学生作文：\n${essay}`,
      timeoutMs: WRITING_AI_TIMEOUT_MS,
    });
  } catch (error) {
    warning = writingProviderWarning(error);
  }
  const feedback = ai || localWritingFeedbackLegacy(prompt, essay, warning);
  const pdfDataUrl = await createWritingReportPdfDataUrl(prompt, feedback);
  sendJson(res, 200, addPdfDownloadUrl(
    { mode: ai ? "ai" : "local", feedback, pdfDataUrl, pdfFileName: "ielts-writing-feedback.pdf", warning },
    "ielts-writing-feedback.pdf"
  ));
}

async function handleSpeakingTurn(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const set = String(payload.set || "").trim();
  const part = String(payload.part || "part1").trim();
  const history = Array.isArray(payload.history) ? payload.history.slice(-12) : [];
  let ai = null;
  let warning = "";
  try {
    ai = await callOpenAI({
      system: speakingTurnSystemPrompt(),
      user: JSON.stringify({ topicSet: set, part, recentHistory: history }, null, 2),
      temperature: 0.55,
      timeoutMs: SPEAKING_AI_TIMEOUT_MS,
    });
  } catch (error) {
    warning = speakingProviderWarning(error);
  }
  const question = (ai || localNextSpeakingQuestion(set, history, part)).replace(/^(examiner|interviewer)\s*:\s*/i, "").trim();
  sendJson(res, 200, { mode: ai ? "ai" : "local", question, warning });
}

async function handleTts(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const text = String(payload.text || "").trim();
  const voice = String(payload.voice || "examiner").trim();
  if (!text) {
    sendJson(res, 400, { error: "Text is required." });
    return;
  }
  let audio = null;
  let warning = "";
  try {
    audio = await synthesizeFish(text, voice);
  } catch (error) {
    warning = "Audio generation is temporarily unavailable. Browser playback remains available.";
  }
  sendJson(res, 200, { mode: audio ? "fish" : "browser", audio, voice, warning });
}

function execFilePromise(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: 60_000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function handleSpeakingRecording(req, res) {
  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  let dataUrl = "";
  let mime = contentType && contentType !== "application/json" ? contentType : "";
  let buffer = null;
  if (contentType === "application/json" || !contentType) {
    const payload = JSON.parse((await readBody(req)) || "{}");
    dataUrl = String(payload.dataUrl || "").trim();
    const match = dataUrl.match(/^data:([^;,]+)[^,]*;base64,(.+)$/);
    if (!match) {
      sendJson(res, 400, { error: "Recording data is invalid." });
      return;
    }
    mime = match[1];
    buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
  } else {
    buffer = await readBufferBody(req);
    dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  }
  if (!buffer.length) {
    sendJson(res, 400, { error: "Recording is empty." });
    return;
  }
  const safeId = crypto.randomUUID();
  const inputExt = audioExtensionForMime(mime, "webm");
  const inputPath = path.join(os.tmpdir(), `ielts-speaking-${safeId}.${inputExt}`);
  const outputPath = path.join(os.tmpdir(), `ielts-speaking-${safeId}.mp3`);
  await fs.promises.writeFile(inputPath, buffer);
  try {
    await execFilePromise("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", inputPath, "-vn", "-ar", "24000", "-ac", "1", "-b:a", "64k", outputPath]);
    const mp3 = await fs.promises.readFile(outputPath);
    const fileName = "ielts-speaking-recording.mp3";
    sendJson(res, 200, {
      mode: "mp3",
      fileName,
      mime: "audio/mpeg",
      downloadUrl: registerRecordingDownload(mp3, fileName, "audio/mpeg"),
      dataUrl: `data:audio/mpeg;base64,${mp3.toString("base64")}`,
    });
  } catch (error) {
    const fileName = `ielts-speaking-recording.${inputExt}`;
    sendJson(res, 200, {
      mode: "original",
      fileName,
      mime,
      downloadUrl: registerRecordingDownload(buffer, fileName, mime),
      dataUrl,
      warning: "MP3 conversion was unavailable. The original recording is ready to download.",
    });
  } finally {
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
}

async function handleObjective(req, res, moduleName) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  if (!payload.attemptId || !payload.attemptToken) {
    throw objectiveAttemptError("Start this practice before submitting it.", 409, "objective_attempt_required");
  }
  sendJson(res, 200, submitObjectiveAttempt(req, res, moduleName, payload));
}

async function handleLegacyFullExam(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const examContext = ["same-test", "random-exam"].includes(payload.examContext) ? payload.examContext : "";
  if (!examContext) throw objectiveAttemptError("A valid exam submission context is required.", 409, "objective_attempt_required");
  const submissions = submitObjectiveAttemptPair(req, res, payload, examContext);
  const listening = submissions.listening.result;
  const reading = submissions.reading.result;
  const writingTasks = Array.isArray(payload.writing?.tasks)
    ? payload.writing.tasks.map((task, index) => ({
        type: String(task.type || `Task ${index + 1}`).trim(),
        title: String(task.title || `Writing Task ${index + 1}`).trim(),
        prompt: String(task.prompt || "").trim(),
        essay: String(task.essay || "").trim(),
      }))
    : [
        {
          type: "Writing",
          title: "Writing",
          prompt: String(payload.writing?.prompt || "").trim(),
          essay: String(payload.writing?.essay || "").trim(),
        },
      ];
  const submittedWritingCount = writingTasks.filter((task) => task.essay).length;
  const speaking = {
    title: String(payload.speaking?.title || "Speaking").trim(),
    selfReportedBand: String(payload.speaking?.selfReportedBand || "").trim(),
    notes: String(payload.speaking?.notes || "").trim(),
  };
  const speakingBand = Number.parseFloat(speaking.selfReportedBand);
  const speakingLine = Number.isFinite(speakingBand)
    ? `Speaking: embedded real-time examiner score Band ${speakingBand.toFixed(1)}`
    : "Speaking: not submitted. Use the embedded real-time IELTS speaking examiner, then enter the band score.";
  const formatObjectiveLine = (label, result) =>
    result.answerAvailable
      ? `${label}: ${result.correct}/${result.scoredTotal}, Band ${result.band.toFixed(1)}`
      : `${label}: answers not imported for this local Cambridge paper; score unavailable`;
  const local = [
    "整套模拟考报告",
    "",
    formatObjectiveLine("Listening", listening),
    formatObjectiveLine("Reading", reading),
    `Writing: 已包含 Task 1 和 Task 2；已提交 ${submittedWritingCount}/2 篇。建议分别用写作单项批改获取逐段反馈。`,
    speakingLine,
    "",
    "本地模式提升建议：",
    "1. 听力错题按数字、日期、地点、人名、同义替换分类复盘。",
    "2. 阅读每篇限制 20 分钟，先定位题干关键词，再找同义替换。",
    "3. 写作保留 5 分钟检查立场、段落功能、冠词和单复数。",
    "4. 口语用内置实时考官做完整三部分考试，回填四项评分和总分后再复盘。",
  ].join("\n");

  let ai = null;
  let warning = "";
  try {
    ai = await callOpenAI({
      system: fullExamSystemPromptChinese(),
      user: JSON.stringify(
        { listening, reading, writing: { tasks: writingTasks }, speaking },
        null,
        2,
      ),
      timeoutMs: WRITING_AI_TIMEOUT_MS,
    });
  } catch (error) {
    warning = generalProviderWarning(error);
  }

  const feedback = ai || local;
  const reportBody = [
    feedback,
    "",
    "Objective score details",
    `Listening: ${listening.answerAvailable ? `${listening.correct}/${listening.scoredTotal}, Band ${listening.band?.toFixed(1)}` : "unavailable"}`,
    `Reading: ${reading.answerAvailable ? `${reading.correct}/${reading.scoredTotal}, Band ${reading.band?.toFixed(1)}` : "unavailable"}`,
    speaking.selfReportedBand ? `Speaking self-reported: Band ${speaking.selfReportedBand}` : "Speaking self-reported: not submitted",
  ].join("\n");
  const pdfDataUrl = await createReportPdfDataUrl("IELTS Full Exam Report", reportBody);
  sendJson(res, 200, addPdfDownloadUrl({
    mode: ai ? "ai" : "local",
    feedback,
    pdfDataUrl,
    pdfFileName: "ielts-full-exam-report.pdf",
    listening,
    reading,
    speaking,
    warning,
  }, "ielts-full-exam-report.pdf"));
}

function localWritingFeedbackAmber(prompt, essay, warning = "") {
  const words = wordCount(essay);
  const paragraphs = essay.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const taskScore = words < 180 ? 5 : words < 240 ? 6 : 7;
  const ccScore = paragraphs.length >= 4 ? 7 : paragraphs.length >= 2 ? 6 : 5;
  const lrScore = words > 240 ? 7 : 6;
  const graScore = words > 240 ? 7 : 6;
  const avg = (taskScore + ccScore + lrScore + graScore) / 4;
  const overall = Math.round(avg * 2) / 2;
  return [
    `Prompt: ${prompt}`,
    "",
    "Paragraph-by-paragraph feedback:",
    "",
    ...paragraphs.flatMap((p, index) => [
      `Original paragraph ${index + 1}:`,
      p,
      "",
      "Feedback: The basic meaning is understandable. This local mode only gives a rule-based first pass, so focus on whether the paragraph has a clear main idea, answers the prompt directly, and explains the logic clearly. To aim for a higher band, write the chain of idea -> reason -> result/example in full instead of stopping at a vague judgement.",
      "",
    ]),
    "Category | Feedback | Score",
    "--- | --- | ---",
    `Task Response/Task Achievement | ${words < 250 ? "The word count or idea development is a bit conservative, so the main argument needs more expansion." : "The prompt is answered clearly and the main ideas are easy to follow."} | ${taskScore}`,
    `Coherence and Cohesion | ${paragraphs.length < 4 ? "Paragraphing is not clear enough. Use an introduction, two body paragraphs, and a conclusion." : "The structure is clear, but linking can still sound more natural."} | ${ccScore}`,
    `Lexical Resource | The vocabulary communicates the basic meaning, but it needs more precise collocations and topic-specific words. | ${lrScore}`,
    `Grammatical Range and Accuracy | Sentence patterns vary a little, but complex sentences, articles, and plural forms still need checking. | ${graScore}`,
    "",
    `Overall, I would score your essay at a band score ${overall.toFixed(1)}`,
    "",
    "Improved model answer reference:",
    OPENAI_API_KEY
      ? `The third-party AI API is configured at ${OPENAI_BASE_URL}, but this call failed, so only a local rule-based first pass was generated and no full band-7.5 model answer was created. Failure reason: ${warning || "the third-party API did not return valid content"}`
      : "No AI API key is configured, so no full band-7.5 model answer was generated. After you set the environment variable, the system will output paragraph-by-paragraph feedback, scores, a model answer, and an English comparison.",
  ].join("\n");
}

function writingSystemPrompt() {
  return [
    "You must mark IELTS Writing by following the Amber IELTS Writing Feedback Skill exactly.",
    "Return exactly one valid JSON object with no markdown fence and no text outside the object.",
    `Scoring prompt version: ${WRITING_SCORING_PROMPT_VERSION}.`,
    "Use this schema: {\"overall\":6.5,\"confidence\":\"high|medium|low\",\"criteria\":[{\"label\":\"Task Response\",\"score\":6,\"feedback\":\"...\",\"evidence\":\"an exact verbatim excerpt from the student's essay\",\"bandRationale\":\"one concise reason tied to the IELTS descriptor\"},{\"label\":\"Coherence & Cohesion\",\"score\":6,\"feedback\":\"...\",\"evidence\":\"...\",\"bandRationale\":\"...\"},{\"label\":\"Lexical Resource\",\"score\":6,\"feedback\":\"...\",\"evidence\":\"...\",\"bandRationale\":\"...\"},{\"label\":\"Grammatical Range & Accuracy\",\"score\":6,\"feedback\":\"...\",\"evidence\":\"...\",\"bandRationale\":\"...\"}],\"highestImpact\":{\"criterion\":\"...\",\"score\":6,\"issue\":\"...\",\"evidence\":\"an exact verbatim sentence from the student's essay\",\"rewriteInstruction\":\"...\"},\"phrases\":[{\"from\":\"...\",\"to\":\"...\"}],\"nextTaskPrompt\":\"...\",\"fullReport\":\"the complete Amber-style report\"}.",
    "All four criterion scores must be numbers. Overall must be their average rounded to the nearest 0.5. Evidence must be copied exactly from the submitted essay, never invented.",
    "Give each criterion one evidence excerpt and one descriptor-linked band rationale. Set confidence to low whenever the response is too short or the supplied evidence is insufficient; otherwise use medium unless the evidence is unusually clear.",
    "Each criteria[].feedback must contain 2-3 concise Chinese sentences about that criterion only. Never reuse the same feedback across criteria and never place paragraph-by-paragraph comments or the full report inside criteria[].feedback.",
    "phrases must contain only short exact wording pairs from the essay, for example {\"from\":\"less bureaucratic\",\"to\":\"with fewer administrative barriers\"}. Do not put paragraph feedback, scores, explanations, or complete paragraphs in phrases.",
    "The fullReport field must contain the complete paragraph-by-paragraph feedback, corrected examples, and band-7.5 model answer required by the skill.",
    "The full skill file is included below. Treat it as mandatory grading instructions inside fullReport.",
    AMBER_WRITING_SKILL || [
      "Fallback if the local skill file is unavailable:",
      "Copy the prompt. Keep each original student paragraph before its Chinese feedback.",
      "Give integer category scores only, then a rounded overall band ending in .0 or .5.",
      "Write a realistic band-7.5 model answer preserving the student's position where possible.",
      "Add Chinese translations comparing original paragraphs with the revised model answer.",
      "For Task 2, the first category is Task Response. For Task 1, the first category is Task Achievement.",
      "Use direct, practical Chinese teacher feedback. Do not be vague.",
    ].join("\n"),
  ].join("\n");
}

function speakingSystemPrompt() {
  return [
    "You are a professional IELTS Speaking examiner and evidence-based scoring engine.",
    "Return exactly one valid JSON object with no markdown fence and no text outside the object.",
    `Scoring prompt version: ${SPEAKING_SCORING_PROMPT_VERSION}.`,
    "Use this schema: {\"criteria\":[{\"key\":\"fc\",\"score\":6.0,\"evidence\":\"an exact transcript phrase or an explicit audio observation\",\"feedback\":\"...\",\"bandRationale\":\"a descriptor-linked reason\"},{\"key\":\"lr\",\"score\":6.0,\"evidence\":\"...\",\"feedback\":\"...\",\"bandRationale\":\"...\"},{\"key\":\"gra\",\"score\":6.0,\"evidence\":\"...\",\"feedback\":\"...\",\"bandRationale\":\"...\"},{\"key\":\"pronunciation\",\"score\":6.0,\"evidence\":\"...\",\"feedback\":\"...\",\"bandRationale\":\"...\"}],\"strengths\":[\"...\"],\"priorities\":[\"...\"],\"drills\":[\"...\"],\"cautions\":[\"...\"],\"confidence\":\"high|medium|low\"}.",
    "Score four independent criteria from 0 to 9: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation.",
    "Do not supply or guess an Overall score. The server calculates it from the four criterion scores and rounds to the nearest 0.5.",
    "Use these band anchors:",
    "Fluency and Coherence Band 5: basic flow, obvious repetition/self-correction, limited linking. Band 6: willing to extend but sometimes loses coherence, some linking, hesitation does not seriously block meaning. Band 7: speaks at length without obvious effort, flexible cohesive devices, hesitation mainly for ideas. Band 8: very fluent, rare repetition/hesitation, logical development and natural transitions.",
    "Lexical Resource Band 5: handles familiar topics, limited vocabulary, repetition, occasional collocation errors. Band 6: enough vocabulary for different topics, some inaccurate choices, can paraphrase. Band 7: flexible vocabulary, less common words/idioms, good collocations, minor errors. Band 8: wide and precise vocabulary, natural style, skillful idiomatic use.",
    "Grammatical Range and Accuracy Band 5: mostly simple sentences, complex attempts often wrong, basic tense errors. Band 6: mix of simple and complex structures, errors in complex sentences but meaning clear. Band 7: varied complex structures, most sentences accurate, errors do not block communication. Band 8: rich sentence range, mostly error-free, only occasional slips.",
    "Pronunciation Band 5: generally understandable but some pronunciation issues cause difficulty, limited intonation. Band 6: understandable throughout, some errors, some intonation control. Band 7: easy to understand, uses stress and intonation though not always consistently, occasional minor issues. Band 8: wide pronunciation features, natural stress/intonation, very few errors.",
    "When realtime examiner notes or MP3 audio evidence are provided, use them to calibrate Pronunciation and Fluency. Do not claim there is no audio evidence if an MP3 is attached.",
    "If MP3 and transcript disagree, treat the audio as stronger evidence for pronunciation, pauses, rhythm, hesitation and self-correction; use the transcript for vocabulary, grammar and content.",
    "Every criterion needs concise evidence and feedback. Never invent a quotation or audio feature that is not present in the supplied evidence.",
    "For Part-only practice, score the available evidence but add a caution that it is a scoped estimate, not a full-test band.",
    "Be strict, consistent and concise. Use the same descriptors for the same evidence.",
  ].join("\n");
}

function speakingBandNumber(value, fallback = 5.5) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number) || number < 0 || number > 9) return Math.round(fallback * 2) / 2;
  return Math.round(number * 2) / 2;
}

function parseSpeakingAssessmentJson(raw) {
  const clean = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!clean) return null;
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(clean.slice(start, end + 1)); } catch { return null; }
}

function normalizeSpeakingAssessment(raw, options = {}) {
  const parsed = typeof raw === "object" && raw ? raw : parseSpeakingAssessmentJson(raw) || {};
  const input = Array.isArray(parsed.criteria) ? parsed.criteria : [];
  const definitions = [
    { key: "fc", label: "Fluency and Coherence", aliases: /^(?:fc|fluency)/i },
    { key: "lr", label: "Lexical Resource", aliases: /^(?:lr|lexical|vocabulary)/i },
    { key: "gra", label: "Grammatical Range and Accuracy", aliases: /^(?:gra|grammar|grammatical)/i },
    { key: "pronunciation", label: "Pronunciation", aliases: /^(?:p|pronunciation)/i },
  ];
  const fallbackScores = options.fallbackScores || { fc: 5.5, lr: 5.5, gra: 5.5, pronunciation: 5.5 };
  const hasExplicitCriterionLabels = input.some((item) => String(item?.key || item?.label || "").trim());
  const criteria = definitions.map((definition, index) => {
    const source = input.find((item) => definition.aliases.test(String(item?.key || item?.label || "")))
      || (!hasExplicitCriterionLabels ? input[index] : null)
      || {};
    return {
      key: definition.key,
      label: definition.label,
      score: speakingBandNumber(source.score, fallbackScores[definition.key]),
      evidence: String(source.evidence || "Evidence was limited in this session.").replace(/\s+/g, " ").trim().slice(0, 600),
      feedback: String(source.feedback || "Keep building longer, clearer and more controlled answers.").replace(/\s+/g, " ").trim().slice(0, 600),
      bandRationale: String(source.bandRationale || source.rationale || source.feedback || "The available evidence supports this provisional descriptor estimate.").replace(/\s+/g, " ").trim().slice(0, 600),
    };
  });
  const overall = speakingBandNumber(criteria.reduce((sum, item) => sum + item.score, 0) / 4, 5.5);
  const scope = ["full", "part1", "part2", "part3"].includes(options.scope) ? options.scope : "full";
  const cautions = (Array.isArray(parsed.cautions) ? parsed.cautions : []).map(String).map((item) => item.trim()).filter(Boolean).slice(0, 5);
  if (scope !== "full" && !cautions.some((item) => /part-only|scoped estimate/i.test(item))) {
    cautions.push("Part-only practice: this is a scoped estimate, not a complete three-part IELTS Speaking band.");
  }
  if (!options.audioUsed && !cautions.some((item) => /audio|pronunciation/i.test(item))) {
    cautions.push("Pronunciation confidence is limited because no audio-model evidence was used.");
  }
  const list = (value, fallback) => (Array.isArray(value) ? value : [])
    .map(String).map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 5).concat(fallback).slice(0, 5);
  const confidence = ["high", "medium", "low"].includes(String(parsed.confidence).toLowerCase())
    ? String(parsed.confidence).toLowerCase()
    : options.audioUsed ? "medium" : "low";
  const reviewRequired = scope !== "full" || confidence === "low" || !options.audioUsed;
  return {
    version: 1,
    rubricVersion: "ielts-speaking-four-criteria.v1",
    scope,
    overall,
    criteria,
    strengths: list(parsed.strengths, ["The available response communicated a clear central meaning."]),
    priorities: list(parsed.priorities, ["Extend answers with a reason and a specific example."]),
    drills: list(parsed.drills, ["Record one timed answer, listen back, then repeat it with fewer pauses."]),
    cautions,
    confidence,
    reviewRequired,
    reviewReason: reviewRequired
      ? "This is a scoped, low-confidence, or transcript-only estimate. Ask a qualified teacher to review it before using it for a formal decision."
      : "This is an AI-assisted practice estimate, not an official IELTS result.",
  };
}

function buildSpeakingScoringContract(assessment, transcript, options = {}) {
  const sourceTranscript = String(transcript || "");
  const sourceLower = sourceTranscript.toLowerCase();
  const evidence = [];
  const criteria = (Array.isArray(assessment?.criteria) ? assessment.criteria : []).slice(0, 4).map((criterion, index) => {
    const criterionKey = String(criterion?.key || `criterion-${index + 1}`);
    const requestedEvidence = String(criterion?.evidence || "").trim();
    const start = requestedEvidence ? sourceLower.indexOf(requestedEvidence.toLowerCase()) : -1;
    const id = `evidence-speaking-${criterionKey}-${index}`;
    if (start >= 0) {
      evidence.push({
        id,
        kind: "transcript-range",
        itemId: "speaking-response",
        criterionKey,
        quote: sourceTranscript.slice(start, start + requestedEvidence.length),
        range: { start, end: start + requestedEvidence.length, unit: "utf16-code-unit" },
      });
    } else {
      evidence.push({
        id,
        kind: "examiner-observation",
        itemId: "speaking-response",
        criterionKey,
        quote: requestedEvidence || "Evidence was limited in this session.",
        source: criterionKey === "pronunciation" && options.audioUsed ? "audio" : "examiner-analysis",
      });
    }
    return {
      key: criterionKey,
      label: String(criterion?.label || criterionKey),
      score: speakingBandNumber(criterion?.score),
      feedback: String(criterion?.feedback || ""),
      bandRationale: String(criterion?.bandRationale || criterion?.feedback || ""),
      evidenceIds: [id],
    };
  });
  return {
    schemaVersion: "scoring.v2",
    attempt: {
      module: "speaking",
      scope: assessment?.scope || "full",
      submittedAt: new Date().toISOString(),
    },
    score: {
      status: "final",
      overall: { value: speakingBandNumber(assessment?.overall), scale: "ielts-band" },
      criteria,
    },
    evidence,
    review: {
      required: Boolean(assessment?.reviewRequired),
      available: true,
      reason: String(assessment?.reviewReason || "This is an AI-assisted practice estimate, not an official IELTS result."),
    },
    provenance: {
      model: String(options.model || "local-speaking-estimate"),
      promptVersion: String(options.promptVersion || SPEAKING_SCORING_PROMPT_VERSION),
      rubric: "ielts-speaking-four-criteria",
      transcriptHandling: "verbatim-input; evidence ranges are offsets into the submitted transcript",
    },
  };
}

function formatSpeakingAssessment(assessment) {
  const lines = [
    `Overall Speaking Band: ${assessment.overall.toFixed(1)}`,
    `Practice scope: ${assessment.scope}`,
    `Evidence confidence: ${assessment.confidence}`,
    "",
    ...assessment.criteria.flatMap((item) => [
      `${item.label}: ${item.score.toFixed(1)}`,
      `Evidence: ${item.evidence}`,
      `Feedback: ${item.feedback}`,
      "",
    ]),
    "Strengths:",
    ...assessment.strengths.map((item) => `- ${item}`),
    "",
    "Top priorities:",
    ...assessment.priorities.map((item) => `- ${item}`),
    "",
    "Next drills:",
    ...assessment.drills.map((item) => `- ${item}`),
  ];
  if (assessment.cautions.length) lines.push("", "Scoring cautions:", ...assessment.cautions.map((item) => `- ${item}`));
  return lines.join("\n").trim();
}

function writingBandNumber(value, fallback = 6) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number) || number < 0 || number > 9) return fallback;
  return Math.round(number * 2) / 2;
}

function writingEvidenceFromEssay(essay) {
  const source = String(essay || "").trim();
  if (!source) return "";
  const paragraphs = source.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const paragraph = paragraphs.find((item) => item.split(/\s+/).length >= 18) || paragraphs[0] || source;
  const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
  return String(sentences.find((item) => item.trim().split(/\s+/).length >= 8) || sentences[0] || paragraph).trim().slice(0, 320);
}

function parseWritingAnalysisJson(raw) {
  const clean = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!clean) return null;
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeWritingAnalysis(raw, prompt, essay, fallbackReport = "") {
  const parsed = parseWritingAnalysisJson(raw) || {};
  const labels = ["Task Response", "Coherence & Cohesion", "Lexical Resource", "Grammatical Range & Accuracy"];
  const localScores = [
    wordCount(essay) < 180 ? 5 : wordCount(essay) < 240 ? 6 : 7,
    String(essay || "").split(/\n\s*\n/).filter((item) => item.trim()).length >= 4 ? 7 : 6,
    wordCount(essay) > 240 ? 7 : 6,
    wordCount(essay) > 240 ? 7 : 6,
  ];
  const inputCriteria = Array.isArray(parsed.criteria) ? parsed.criteria : [];
  const criterionKey = (value) => {
    const text = String(value || "").toLowerCase();
    if (/task\s*(?:response|achievement)|\btr\b|\bta\b/.test(text)) return "task";
    if (/coherence|cohesion|\bcc\b/.test(text)) return "coherence";
    if (/lexical|vocabulary|\blr\b/.test(text)) return "lexical";
    if (/grammar|grammatical|\bgra\b/.test(text)) return "grammar";
    return "";
  };
  const defaultFeedback = [
    "需要更直接地回应题目，并用具体解释和例子充分发展中心观点。",
    "段落推进需要更清楚，让每句话都围绕同一个中心并形成自然衔接。",
    "减少宽泛或重复用词，改用含义准确、搭配自然的主题词汇。",
    "增加可控的复杂句式，同时检查主谓一致、时态和标点准确性。",
  ];
  const sourceEssay = String(essay || "");
  const usedFeedback = new Set();
  const criteria = labels.map((label, index) => {
    const key = criterionKey(label);
    const source = inputCriteria.find((item) => criterionKey(item?.label) === key) || inputCriteria[index] || {};
    let feedback = String(source.feedback || source.issue || "").replace(/\s+/g, " ").trim();
    const reportBoundary = feedback.search(/(?:\|\s*[0-9](?:\.\d)?\s*)?(?:Overall,?\s+I\s+would\s+score|Overall\s+Band|Category\s*\|\s*Feedback)/i);
    if (reportBoundary > 0) feedback = feedback.slice(0, reportBoundary).trim();
    feedback = feedback.slice(0, 520);
    const feedbackKey = feedback.toLowerCase().replace(/\s+/g, " ");
    if (!feedback || usedFeedback.has(feedbackKey)) feedback = defaultFeedback[index];
    usedFeedback.add(feedback.toLowerCase().replace(/\s+/g, " "));
    const requestedEvidence = String(source.evidence || source.evidenceSpan || "").trim();
    const evidenceStart = requestedEvidence
      ? sourceEssay.toLowerCase().indexOf(requestedEvidence.toLowerCase())
      : -1;
    const evidence = evidenceStart >= 0
      ? sourceEssay.slice(evidenceStart, evidenceStart + requestedEvidence.length)
      : writingEvidenceFromEssay(sourceEssay);
    const bandRationale = String(source.bandRationale || source.rationale || feedback).replace(/\s+/g, " ").trim().slice(0, 520);
    return {
      label,
      score: writingBandNumber(source.score, localScores[index]),
      feedback,
      evidence,
      bandRationale,
    };
  });
  const overall = writingBandNumber(criteria.reduce((sum, item) => sum + item.score, 0) / criteria.length, 6);
  const weakest = [...criteria].sort((a, b) => a.score - b.score)[0];
  const requestedImpact = parsed.highestImpact && typeof parsed.highestImpact === "object" ? parsed.highestImpact : {};
  const requestedCriterion = criteria.find((item) => item.label === requestedImpact.criterion) || weakest;
  const requestedEvidence = String(requestedImpact.evidence || "").trim();
  const exactEvidence = requestedEvidence && String(essay || "").toLowerCase().includes(requestedEvidence.toLowerCase())
    ? requestedEvidence
    : writingEvidenceFromEssay(essay);
  const defaultInstructions = {
    "Task Response": "Develop one central idea with a specific explanation and example.",
    "Coherence & Cohesion": "Rebuild the paragraph around one topic sentence and a clear progression.",
    "Lexical Resource": "Replace vague repeated wording with precise topic vocabulary.",
    "Grammatical Range & Accuracy": "Rewrite the idea with one controlled complex sentence, then check agreement, tense, and punctuation.",
  };
  const confidence = ["high", "medium", "low"].includes(String(parsed.confidence || "").toLowerCase())
    ? String(parsed.confidence).toLowerCase()
    : parsed && Object.keys(parsed).length ? "medium" : "low";
  const reviewRequired = confidence === "low";
  return {
    version: 1,
    rubricVersion: "ielts-writing-four-criteria.v1",
    overall,
    criteria,
    confidence,
    reviewRequired,
    reviewReason: reviewRequired
      ? "The available writing evidence is limited or the AI scorer was unavailable; ask a qualified teacher to review this estimate."
      : "This is an AI-assisted practice estimate, not an official IELTS result.",
    highestImpact: {
      criterion: requestedCriterion.label,
      score: requestedCriterion.score,
      issue: String(requestedImpact.issue || requestedCriterion.feedback).trim().slice(0, 1200),
      evidence: exactEvidence,
      rewriteInstruction: String(requestedImpact.rewriteInstruction || defaultInstructions[requestedCriterion.label]).trim().slice(0, 1200),
    },
    phrases: (Array.isArray(parsed.phrases) ? parsed.phrases : []).slice(0, 8).map((item) => {
      const from = String(item?.from || "").trim();
      const to = String(item?.to || "").trim();
      const commentary = /(?:这一段|这个段落|评分|分数|band|criterion|task response|coherence|lexical resource|grammatical range)/i;
      if (!from || !to || from.length > 100 || to.length > 140 || commentary.test(from) || commentary.test(to)) return null;
      return { from, to };
    }).filter(Boolean),
    nextTaskPrompt: String(parsed.nextTaskPrompt || prompt || "IELTS Writing targeted practice").trim().slice(0, 4000),
    fullReport: String(parsed.fullReport || fallbackReport || raw || "").trim(),
  };
}

function speakingTurnSystemPrompt() {
  return [
    "You are a live IELTS Speaking examiner.",
    "Ask exactly one short examiner question in English.",
    "Do not include role names such as Examiner or Candidate.",
    "Keep the flow like a real IELTS speaking test: Part 1 short familiar questions, Part 2 cue-card setup, Part 3 abstract follow-up questions.",
    "If the candidate answer is too short, ask one natural follow-up.",
    "Return only the next spoken question, no markdown.",
  ].join("\n");
}

function fullExamSystemPrompt() {
  return [
    "You are an IELTS examiner and study coach.",
    "The candidate has completed an IELTS exam set. Listening and Reading objective scores are provided; Writing Task 1 and Task 2 responses may both be included. Speaking may include a band score from the embedded real-time IELTS speaking examiner.",
    "Return a concise English score report with estimated Listening, Reading, Writing, and Speaking bands when available, overall band, weaknesses by module, and a 7-day improvement plan.",
    "For writing feedback, follow IELTS criteria and preserve the student's ideas.",
  ].join("\n");
}

const writingFeedbackJobs = new Map();
const WRITING_FEEDBACK_JOB_TTL_MS = 30 * 60 * 1000;

function cleanupWritingFeedbackJobs() {
  const now = Date.now();
  for (const [id, job] of writingFeedbackJobs) {
    if (now - job.createdAt > WRITING_FEEDBACK_JOB_TTL_MS) writingFeedbackJobs.delete(id);
  }
}

function parseWritingPayload(payload) {
  if (Array.isArray(payload.items)) {
    const items = payload.items.slice(0, 2).map((item, index) => ({
      id: String(item?.id || `task${index + 1}`),
      taskNumber: Number(item?.taskNumber || index + 1),
      kind: String(item?.kind || (index === 0 ? "academic-task-1" : "task-2")),
      prompt: String(item?.prompt || "").trim(),
      essay: String(item?.essay || item?.response || "").trim(),
    }));
    if (items.length !== 2 || items.some((item) => !item.prompt || !item.essay)) {
      const error = new Error("Complete Task 1 and Task 2 are required for a full Writing score.");
      error.statusCode = 422;
      throw error;
    }
    return { kind: "pair", items };
  }
  const prompt = String(payload.prompt || "").trim();
  const essay = String(payload.essay || "").trim();
  if (!prompt || !essay) {
    const error = new Error("Prompt and essay are both required.");
    error.statusCode = 400;
    throw error;
  }
  return { kind: "single", prompt, essay };
}

function roundWritingScore(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? Math.round(number * 2) / 2 : null;
}

function writingAnalysisScore(analysis = {}) {
  const criteria = Array.isArray(analysis.criteria) ? analysis.criteria.slice(0, 4) : [];
  const values = criteria.map((item) => Number.parseFloat(item.score)).filter(Number.isFinite);
  return values.length === 4 ? roundWritingScore(values.reduce((sum, value) => sum + value, 0) / 4) : roundWritingScore(analysis.overall);
}

function serverWritingEvidence(item, analysis = {}) {
  const essay = String(item?.essay || "");
  const criteria = Array.isArray(analysis?.criteria) ? analysis.criteria : [];
  const criterionKey = (label) => {
    const text = String(label || "").toLowerCase();
    if (/task\s*(?:response|achievement)|\btr\b|\bta\b/.test(text)) return "task";
    if (/coherence|cohesion|\bcc\b/.test(text)) return "coherence";
    if (/lexical|vocabulary|\blr\b/.test(text)) return "lexical";
    if (/grammar|grammatical|\bgra\b/.test(text)) return "grammar";
    return "criterion";
  };
  const exactEvidence = criteria.flatMap((criterion, index) => {
    const requested = String(criterion?.evidence || "").trim();
    const start = requested ? essay.toLowerCase().indexOf(requested.toLowerCase()) : -1;
    if (start < 0) return [];
    const quote = essay.slice(start, start + requested.length);
    return [{
      id: `evidence-${item.id}-${criterionKey(criterion.label)}-${start}`,
      kind: "text-range",
      itemId: item.id,
      criterionKey: criterionKey(criterion.label),
      criterionIndex: index,
      quote,
      range: { start, end: start + quote.length, unit: "utf16-code-unit" },
    }];
  });
  if (exactEvidence.length) return exactEvidence;
  const quote = String(analysis?.highestImpact?.evidence || "").trim();
  const start = quote ? essay.toLowerCase().indexOf(quote.toLowerCase()) : -1;
  return start >= 0 ? [{
    id: `evidence-${item.id}-highest-impact-${start}`,
    kind: "text-range",
    itemId: item.id,
    criterionKey: "highest-impact",
    quote: essay.slice(start, start + quote.length),
    range: { start, end: start + quote.length, unit: "utf16-code-unit" },
  }] : [];
}

function composeWeightedWritingScore(items, taskResults) {
  const tasks = taskResults.map((result, index) => {
    const criteria = (result.analysis?.criteria || []).slice(0, 4).map((criterion, criterionIndex) => ({
      label: index === 0 && criterionIndex === 0 ? "Task Achievement" : String(criterion.label || "Writing criterion"),
      score: roundWritingScore(criterion.score),
      feedback: String(criterion.feedback || ""),
      bandRationale: String(criterion.bandRationale || criterion.feedback || ""),
    }));
    return {
      taskNumber: index + 1,
      itemId: items[index].id,
      title: items[index].kind,
      overall: writingAnalysisScore({ ...result.analysis, criteria }),
      criteria,
      feedback: result.feedback || "",
      analysis: result.analysis || null,
      evidence: serverWritingEvidence(items[index], result.analysis),
      confidence: result.analysis?.confidence || "low",
      reviewRequired: Boolean(result.analysis?.reviewRequired),
      pdfUrl: result.pdfUrl || "",
    };
  });
  const weighted = (a, b) => roundWritingScore((Number(a) + Number(b) * 2) / 3);
  const overall = weighted(tasks[0].overall, tasks[1].overall);
  const labels = ["Task Achievement / Response", "Coherence & Cohesion", "Lexical Resource", "Grammatical Range & Accuracy"];
  const criteria = labels.map((label, index) => ({
    label,
    score: weighted(tasks[0].criteria[index]?.score, tasks[1].criteria[index]?.score),
    feedback: tasks[1].criteria[index]?.feedback || tasks[0].criteria[index]?.feedback || "",
    bandRationale: tasks[1].criteria[index]?.bandRationale || tasks[0].criteria[index]?.bandRationale || "",
    evidenceIds: tasks.flatMap((task) => task.evidence
      .filter((entry) => entry.criterionIndex === index || (index === 0 && entry.criterionKey === "task"))
      .map((entry) => entry.id)),
  }));
  const weakest = [...tasks].sort((a, b) => a.overall - b.overall)[0];
  const impact = weakest.analysis?.highestImpact || {};
  const evidence = tasks.flatMap((task) => task.evidence);
  const attemptId = crypto.randomUUID();
  return {
    schemaVersion: "scoring.v2",
    attempt: { id: attemptId, module: "writing", scope: "full-test", submittedAt: new Date().toISOString(), items: items.map((item) => ({ ...item, response: item.essay, essay: undefined, wordCount: wordCount(item.essay) })) },
    score: { status: "final", overall: { value: overall, scale: "ielts-band", weighting: { task1: 1, task2: 2 } }, criteria, tasks },
    highestImpact: { criterionKey: impact.criterion || weakest.criteria[0]?.label || "Task response", itemId: weakest.itemId, issue: impact.issue || weakest.criteria[0]?.feedback || "Develop this response more fully.", evidenceIds: weakest.evidence.map((item) => item.id), successCriterion: impact.rewriteInstruction || "Rewrite the evidence paragraph with clearer development." },
    evidence,
    nextAction: { type: "rewrite", label: "Improve this skill", itemId: weakest.itemId },
    retest: { type: "paragraph-rewrite", parentAttemptId: attemptId, itemId: weakest.itemId },
    review: {
      required: tasks.some((task) => task.reviewRequired),
      available: true,
      reason: tasks.some((task) => task.reviewRequired)
        ? "One or more rubric estimates have limited evidence and should be reviewed by a qualified teacher."
        : "This is an AI-assisted practice estimate, not an official IELTS result.",
    },
    provenance: {
      provider: taskResults.every((result) => result.mode?.startsWith("ai:")) ? WRITING_AI_MODEL : "local-writing-estimate",
      model: taskResults.every((result) => result.mode?.startsWith("ai:")) ? WRITING_AI_MODEL : "local-writing-estimate",
      promptVersion: WRITING_SCORING_PROMPT_VERSION,
      rubric: "ielts-writing-four-criteria",
      weighting: "task1:1,task2:2",
    },
  };
}

async function buildWritingFeedbackResult(prompt, essay) {
  let ai = null;
  let warning = "";
  try {
    ai = await callWritingAI({
      system: writingSystemPrompt(),
      user: `Prompt: ${prompt}\n\nStudent essay:\n${essay}`,
    });
  } catch (error) {
    warning = writingProviderWarning(error);
  }
  const fallbackFeedback = localWritingFeedbackAmber(prompt, essay, warning);
  const analysis = normalizeWritingAnalysis(ai, prompt, essay, ai || fallbackFeedback);
  const feedback = analysis.fullReport || fallbackFeedback;
  const pdfDataUrl = await createWritingReportPdfDataUrl(prompt, feedback);
  return addPdfDownloadUrl(
    {
      mode: ai ? `ai:${WRITING_AI_MODEL}` : "local",
      feedback,
      analysis,
      review: {
        required: analysis.reviewRequired,
        available: true,
        reason: analysis.reviewReason,
      },
      provenance: {
        model: ai ? WRITING_AI_MODEL : "local-writing-estimate",
        promptVersion: WRITING_SCORING_PROMPT_VERSION,
        rubric: "ielts-writing-four-criteria",
      },
      pdfDataUrl,
      pdfFileName: "ielts-writing-feedback.pdf",
      warning,
    },
    "ielts-writing-feedback.pdf"
  );
}

async function buildWritingPairFeedbackResult(items) {
  const taskResults = await Promise.all(items.map((item) => buildWritingFeedbackResult(item.prompt, item.essay)));
  const contract = composeWeightedWritingScore(items, taskResults);
  const feedback = taskResults.map((result, index) => `Task ${index + 1} · Band ${contract.score.tasks[index].overall.toFixed(1)}\n${result.feedback}`).join("\n\n");
  const analysis = {
    overall: contract.score.overall.value,
    criteria: contract.score.criteria,
    highestImpact: {
      criterion: contract.highestImpact.criterionKey,
      issue: contract.highestImpact.issue,
      evidence: contract.evidence.find((item) => contract.highestImpact.evidenceIds.includes(item.id))?.quote || "",
      rewriteInstruction: contract.highestImpact.successCriterion,
    },
    taskScores: contract.score.tasks,
  };
  const pdfDataUrl = await createWritingReportPdfDataUrl("IELTS Writing Task 1 and Task 2", feedback);
  const allAi = taskResults.every((result) => result.mode?.startsWith("ai:"));
  return addPdfDownloadUrl({ mode: allAi ? `ai:${WRITING_AI_MODEL}` : "local", feedback, analysis, contract, taskResults, pdfDataUrl, pdfFileName: "ielts-writing-feedback.pdf" }, "ielts-writing-feedback.pdf");
}

function buildSingleWritingContract(prompt, essay, result) {
  const taskNumber = /\btask\s*1\b|\b(chart|graph|table|map|diagram|process|letter)\b/i.test(prompt) ? 1 : 2;
  const item = { id: `task${taskNumber}`, taskNumber, kind: taskNumber === 1 ? "single-task-1" : "single-task-2", prompt, essay };
  const overall = writingAnalysisScore(result.analysis);
  const criteria = (result.analysis?.criteria || []).slice(0, 4).map((criterion, index) => ({
    label: taskNumber === 1 && index === 0 ? "Task Achievement" : String(criterion.label || "Writing criterion"),
    score: roundWritingScore(criterion.score),
    feedback: String(criterion.feedback || ""),
    bandRationale: String(criterion.bandRationale || criterion.feedback || ""),
  }));
  const evidence = serverWritingEvidence(item, result.analysis);
  const impact = result.analysis?.highestImpact || {};
  const attemptId = crypto.randomUUID();
  return {
    schemaVersion: "scoring.v2",
    attempt: {
      id: attemptId,
      module: "writing",
      scope: "single-task",
      submittedAt: new Date().toISOString(),
      items: [{ ...item, response: essay, essay: undefined, wordCount: wordCount(essay) }],
    },
    score: {
      status: "final",
      overall: { value: overall, scale: "ielts-band" },
      criteria: criteria.map((criterion, index) => ({
        ...criterion,
        evidenceIds: evidence.filter((entry) => entry.criterionIndex === index || (index === 0 && entry.criterionKey === "task")).map((entry) => entry.id),
      })),
    },
    highestImpact: {
      criterionKey: impact.criterion || criteria[0]?.label || "Task response",
      itemId: item.id,
      issue: impact.issue || criteria[0]?.feedback || "Develop this response more fully.",
      evidenceIds: evidence.map((entry) => entry.id),
      successCriterion: impact.rewriteInstruction || "Rewrite the evidence paragraph with clearer development.",
    },
    evidence,
    nextAction: { type: "rewrite", label: "Improve this skill", itemId: item.id },
    retest: { type: "paragraph-rewrite", parentAttemptId: attemptId, itemId: item.id },
    review: {
      required: Boolean(result.analysis?.reviewRequired),
      available: true,
      reason: result.analysis?.reviewReason || "This is an AI-assisted practice estimate, not an official IELTS result.",
    },
    provenance: {
      provider: result.mode?.startsWith("ai:") ? WRITING_AI_MODEL : "local-writing-estimate",
      model: result.mode?.startsWith("ai:") ? WRITING_AI_MODEL : "local-writing-estimate",
      promptVersion: WRITING_SCORING_PROMPT_VERSION,
      rubric: "ielts-writing-four-criteria",
    },
  };
}

async function buildWritingPayloadResult(parsed) {
  if (parsed.kind === "pair") return buildWritingPairFeedbackResult(parsed.items);
  const result = await buildWritingFeedbackResult(parsed.prompt, parsed.essay);
  return { ...result, contract: buildSingleWritingContract(parsed.prompt, parsed.essay, result) };
}

async function handleWriting(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const parsed = parseWritingPayload(payload);
  sendJson(res, 200, await buildWritingPayloadResult(parsed));
}

async function handleWritingJobStart(req, res) {
  cleanupWritingFeedbackJobs();
  const payload = JSON.parse((await readBody(req)) || "{}");
  const parsed = parseWritingPayload(payload);
  const id = crypto.randomUUID();
  const job = {
    id,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    result: null,
    error: "",
  };
  writingFeedbackJobs.set(id, job);
  buildWritingPayloadResult(parsed)
    .then((result) => {
      job.status = "done";
      job.updatedAt = Date.now();
      job.result = result;
    })
    .catch((error) => {
      job.status = "error";
      job.updatedAt = Date.now();
      job.error = "Writing feedback could not be completed safely. Please retry.";
    });
  sendJson(res, 202, { jobId: id, status: job.status, message: "Writing feedback job started." });
}

async function handleWritingRewrite(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const prompt = String(payload.prompt || "IELTS Writing task").trim();
  const original = String(payload.original || "").trim();
  const revision = String(payload.revision || "").trim();
  const criterion = String(payload.criterion || "Grammatical Range & Accuracy").trim();
  if (!original || !revision) {
    sendJson(res, 400, { error: "Original paragraph and revision are both required." });
    return;
  }
  const rubricPrompt = `${prompt}\n\nParagraph-only skill check. Evaluate both paragraphs against the same ${criterion} success criterion. Do not claim this is a full IELTS Writing Band.`;
  const [beforeResult, afterResult] = await Promise.all([
    buildWritingFeedbackResult(rubricPrompt, original),
    buildWritingFeedbackResult(rubricPrompt, revision),
  ]);
  const criterionMatch = (analysis) => (analysis?.criteria || []).find((item) => String(item.label || "").toLowerCase().includes(criterion.split(/\s+/)[0].toLowerCase())) || analysis?.criteria?.[0] || {};
  const beforeCriterion = criterionMatch(beforeResult.analysis);
  const afterCriterion = criterionMatch(afterResult.analysis);
  const before = roundWritingScore(beforeCriterion.score);
  const after = roundWritingScore(afterCriterion.score);
  sendJson(res, 200, {
    schemaVersion: "writing-rewrite.v1",
    scope: "paragraph-skill-check",
    criterion,
    practiceScoreBefore: before,
    practiceScoreAfter: after,
    delta: Number.isFinite(before) && Number.isFinite(after) ? roundWritingScore(after - before) : null,
    before: { criteria: [{ label: criterion, score: before }] },
    after: { criteria: [{ label: criterion, score: after }] },
    evidence: [
      { id: "rewrite-before", kind: "text-range", quote: original, range: { start: 0, end: original.length, unit: "utf16-code-unit" } },
      { id: "rewrite-after", kind: "text-range", quote: revision, range: { start: 0, end: revision.length, unit: "utf16-code-unit" } },
    ],
    feedback: afterCriterion.feedback || afterResult.analysis?.highestImpact?.issue || "Compare the rewrite against the stated success criterion.",
    updatesIeltsBand: false,
  });
}

function handleWritingJobStatus(req, res) {
  cleanupWritingFeedbackJobs();
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const id = decodeURIComponent(url.pathname.replace(/^\/api\/writing\/feedback\/job\//, ""));
  const job = writingFeedbackJobs.get(id);
  if (!job) {
    sendJson(res, 404, { error: "Writing feedback job not found or expired." });
    return;
  }
  sendJson(res, 200, {
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    result: job.result,
    error: job.error,
  });
}

async function handleSpeaking(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const set = String(payload.set || "").trim();
  const transcript = String(payload.transcript || "").trim();
  const realtimeNote = String(payload.realtimeNote || "").trim();
  const scope = ["full", "part1", "part2", "part3"].includes(String(payload.scope || "").toLowerCase())
    ? String(payload.scope).toLowerCase()
    : "full";
  const audioEvidence = normalizeSpeakingAudioEvidence(payload.audioEvidence || {});
  if (!transcript) {
    sendJson(res, 400, { error: "Please complete the speaking response first." });
    return;
  }
  const evidenceSummary = [
    `Speaking topic set: ${set || "IELTS Speaking"}`,
    `Selected practice scope: ${scope}`,
    "",
    "Candidate transcript:",
    transcript,
    "",
    "Realtime examiner score note:",
    realtimeNote || "(No realtime note was captured.)",
    "",
    "Audio evidence:",
    audioEvidence.available
      ? `MP3 attached for pronunciation and fluency calibration. File: ${audioEvidence.fileName}.`
      : `No usable MP3 attached. ${audioEvidence.warning || ""}`.trim(),
  ].join("\n");
  const localBase = wordCount(transcript) > 220 ? 6.5 : wordCount(transcript) > 100 ? 6 : 5.5;
  const fallbackScores = { fc: localBase, lr: localBase, gra: localBase, pronunciation: audioEvidence.available ? localBase : Math.min(localBase, 5.5) };
  let ai = null;
  let audioAiUsed = false;
  const warnings = [];
  if (!audioEvidence.available && audioEvidence.warning) warnings.push(audioEvidence.warning);
  try {
    if (audioEvidence.available) {
      ai = await callSpeakingAudioAI({
        system: speakingSystemPrompt(),
        user: [
          evidenceSummary,
          "",
          "Use the attached MP3 directly for Pronunciation and Fluency evidence. Produce the final IELTS Speaking score report now.",
        ].join("\n"),
        audio: audioEvidence,
        temperature: 0.1,
      });
      audioAiUsed = Boolean(ai);
    }
  } catch (error) {
    warnings.push(speakingProviderWarning(error));
  }
  if (!ai) {
    try {
      ai = await callOpenAI({
        system: speakingSystemPrompt(),
        user: [
          evidenceSummary,
          "",
          "No audio-model result is available. Use the realtime examiner note as the best audio-side evidence, and use the transcript for content, vocabulary and grammar.",
        ].join("\n"),
        temperature: 0.1,
        timeoutMs: SPEAKING_AI_TIMEOUT_MS,
      });
    } catch (error) {
      warnings.push(speakingProviderWarning(error));
    }
  }
  const analysis = normalizeSpeakingAssessment(ai || {}, { scope, audioUsed: audioAiUsed, fallbackScores });
  const contract = buildSpeakingScoringContract(analysis, transcript, {
    model: ai
      ? audioAiUsed ? SPEAKING_AUDIO_AI_MODEL : MODEL
      : "local-speaking-estimate",
    promptVersion: SPEAKING_SCORING_PROMPT_VERSION,
    audioUsed: audioAiUsed,
  });
  const feedback = formatSpeakingAssessment(analysis);
  const band = analysis.overall;
  const pdfDataUrl = await createReportPdfDataUrl("IELTS Speaking Result", [
    `Speaking topic set: ${set || "IELTS Speaking"}`,
    band ? `Final Speaking Band: ${band}` : "",
    "",
    evidenceSummary,
    "",
    "Examiner feedback:",
    feedback,
    warnings.length ? `\nWarnings:\n${warnings.filter(Boolean).join("\n")}` : "",
  ].filter(Boolean).join("\n"), {
    subtitle: "IELTS Speaking AI Examiner Report",
    prompt: transcript,
  });
  sendJson(res, 200, addPdfDownloadUrl({
    mode: ai
      ? audioAiUsed ? `ai:${SPEAKING_AUDIO_AI_MODEL}:audio` : "ai"
      : "local",
    feedback,
    band,
    analysis,
    contract,
    warning: warnings.filter(Boolean).join("\n"),
    pdfDataUrl,
    pdfFileName: "ielts-speaking-report.pdf",
    evidence: {
      transcript: true,
      realtimeNote: Boolean(realtimeNote),
      mp3: audioAiUsed,
      mp3Submitted: Boolean(audioEvidence.available),
      mp3Bytes: audioEvidence.available ? audioEvidence.base64Bytes : 0,
    },
  }, "ielts-speaking-report.pdf"));
}

async function handleFullExam(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const examContext = ["same-test", "random-exam"].includes(payload.examContext) ? payload.examContext : "";
  if (!examContext) throw objectiveAttemptError("A valid exam submission context is required.", 409, "objective_attempt_required");
  const submissions = submitObjectiveAttemptPair(req, res, payload, examContext);
  const listeningSubmission = submissions.listening;
  const readingSubmission = submissions.reading;
  const listening = listeningSubmission.result;
  const reading = readingSubmission.result;
  const writingTasks = Array.isArray(payload.writing?.tasks)
    ? payload.writing.tasks.map((task, index) => ({
        type: String(task.type || `Task ${index + 1}`).trim(),
        title: String(task.title || `Writing Task ${index + 1}`).trim(),
        prompt: String(task.prompt || "").trim(),
        essay: String(task.essay || "").trim(),
      }))
    : [
        {
          type: "Writing",
          title: "Writing",
          prompt: String(payload.writing?.prompt || "").trim(),
          essay: String(payload.writing?.essay || "").trim(),
        },
      ];
  const submittedWritingCount = writingTasks.filter((task) => task.essay).length;
  const speaking = {
    title: String(payload.speaking?.title || "Speaking").trim(),
    selfReportedBand: String(payload.speaking?.selfReportedBand || "").trim(),
    notes: String(payload.speaking?.notes || "").trim(),
  };
  const speakingBand = Number.parseFloat(speaking.selfReportedBand);
  const speakingLine = Number.isFinite(speakingBand)
    ? `Speaking: embedded real-time examiner score Band ${speakingBand.toFixed(1)}`
    : "Speaking: not submitted. Use the embedded real-time IELTS speaking examiner, then enter the band score.";
  const formatObjectiveLine = (label, result) =>
    result.answerAvailable
      ? `${label}: ${result.correct}/${result.scoredTotal}, Band ${result.band.toFixed(1)}`
      : `${label}: answers not imported for this local Cambridge paper; score unavailable`;
  const local = [
    "Full mock exam report",
    "",
    formatObjectiveLine("Listening", listening),
    formatObjectiveLine("Reading", reading),
    `Writing: Task 1 and Task 2 are included; ${submittedWritingCount}/2 responses were submitted. Use single writing feedback for paragraph-level comments.`,
    speakingLine,
    "",
    "Local mode improvement suggestions:",
    "1. Review listening mistakes by number, date, place, names, and paraphrasing.",
    "2. Limit each reading passage to 20 minutes. Find the keyword in the question first, then locate paraphrases.",
    "3. Keep 5 minutes for checking stance, paragraph function, articles, and plural forms.",
    "4. Use the built-in live speaking examiner for a full three-part test, then review the four scores and overall band.",
  ].join("\n");
  let ai = null;
  let warning = "";
  try {
    ai = await callOpenAI({
      system: fullExamSystemPrompt(),
      user: JSON.stringify({ listening, reading, writing: { tasks: writingTasks }, speaking }, null, 2),
      timeoutMs: WRITING_AI_TIMEOUT_MS,
    });
  } catch (error) {
    warning = generalProviderWarning(error);
  }
  const feedback = ai || local;
  const reportBody = [
    feedback,
    "",
    "Objective score details",
    `Listening: ${listening.answerAvailable ? `${listening.correct}/${listening.scoredTotal}, Band ${listening.band?.toFixed(1)}` : "unavailable"}`,
    `Reading: ${reading.answerAvailable ? `${reading.correct}/${reading.scoredTotal}, Band ${reading.band?.toFixed(1)}` : "unavailable"}`,
    speaking.selfReportedBand ? `Speaking self-reported: Band ${speaking.selfReportedBand}` : "Speaking self-reported: not submitted",
  ].join("\n");
  const pdfDataUrl = await createReportPdfDataUrl("IELTS Full Exam Report", reportBody);
  sendJson(res, 200, addPdfDownloadUrl({
    mode: ai ? "ai" : "local",
    feedback,
    pdfDataUrl,
    pdfFileName: "ielts-full-exam-report.pdf",
    listening,
    reading,
    objectiveAttempts: {
      listening: { attemptId: listeningSubmission.attemptId, status: listeningSubmission.status },
      reading: { attemptId: readingSubmission.attemptId, status: readingSubmission.status },
    },
    speaking,
    warning,
  }, "ielts-full-exam-report.pdf"));
}

const server = http.createServer(async (req, res) => {
  try {
    const requestPathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
    if (req.method === "OPTIONS" && (requestPathname.startsWith("/api/stem/marking/") || requestPathname === "/api/ai/mark-handwriting")) {
      if (!applyStemCors(req, res, "GET,POST,PUT,DELETE,OPTIONS")) {
        sendJson(res, 403, { error: "This origin is not allowed to access STEM marking." });
        return;
      }
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "OPTIONS" && requestPathname === "/api/stem/identity") {
      if (!applyStemCors(req, res)) {
        sendJson(res, 403, { error: "This origin is not allowed to request STEM sign-in." });
        return;
      }
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "OPTIONS") {
      // Only the explicit STEM routes above are cross-site. All other APIs,
      // including the AI Coach proxy, are same-origin and must not advertise
      // wildcard CORS to arbitrary websites.
      sendJson(res, 403, { error: "Cross-origin requests are not enabled for this route." });
      return;
    }
    if (req.method === "GET" && req.url === "/healthz") {
      sendJson(res, 200, {
        ok: true,
        name: "IELTS-ist",
        uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
        now: new Date().toISOString(),
      });
      return;
    }
    if (req.method === "GET" && req.url === "/api/qwen-runtime") {
      sendJson(res, 200, {
        ok: true,
        realtimeModel: QWEN_REALTIME_MODEL,
        asrModel: QWEN_ASR_MODEL,
        webrtcMode: QWEN_WEBRTC_MODE,
        webrtcEnabled: QWEN_WEBRTC_MODE !== "off",
        exchangeProxyConfigured: !!QWEN_WEBRTC_EXCHANGE_PROXY_URL,
      });
      return;
    }
    if (req.method === "GET" && requestPathname === "/api/stem/identity") {
      handleStemIdentity(req, res);
      return;
    }
    if (req.method === "POST" && requestPathname === "/api/stem/internal/authenticate") {
      await handleStemInternalAuthenticate(req, res);
      return;
    }
    if ((req.method === "GET" || req.method === "PUT") && requestPathname === "/api/coach/conversations") {
      await handleCoachConversationsApi(req, res);
      return;
    }
    if ((req.method === "GET" || req.method === "PUT") && requestPathname === "/api/internal/stem/coach/conversations") {
      await handleStemInternalCoachConversations(req, res);
      return;
    }
    if (req.url.startsWith("/api/stem/marking/")) {
      await handleStemMarkingApi(req, res);
      return;
    }
    if (req.method === "POST" && requestPathname === "/api/ai/mark-handwriting") {
      await handleStemHandwritingMarking(req, res);
      return;
    }
    if (req.url.startsWith("/api/auth/") || req.url === "/api/me") {
      await handleAuthApi(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/redeem") {
      await handleRedeem(req, res);
      return;
    }
    const adminRolesMatch = req.url.match(/^\/api\/admin\/users\/(\d+)\/roles(?:\?.*)?$/);
    if (adminRolesMatch) {
      await handleAdminUserRoles(req, res, adminRolesMatch[1]);
      return;
    }
    if (req.method === "POST" && req.url === "/api/admin/redemption-codes") {
      await handleAdminRedemptionCodes(req, res);
      return;
    }
    if (req.url.startsWith("/api/drafts")) {
      await handleDraftsApi(req, res);
      return;
    }
    if (req.url.startsWith("/api/vocabulary")) {
      await handleVocabularyApi(req, res);
      return;
    }
    if (req.url.startsWith("/api/learning/")) {
      await handleLearningApi(req, res);
      return;
    }
    if (req.method === "POST" && requestPathname === "/api/objective/exams") {
      await handleObjectiveExamStart(req, res);
      return;
    }
    if (req.method === "POST" && requestPathname === "/api/objective/attempts") {
      await handleObjectiveAttemptStart(req, res);
      return;
    }
    const objectiveReviewMatch = requestPathname.match(/^\/api\/objective\/attempts\/([^/]+)\/review$/);
    if (req.method === "GET" && objectiveReviewMatch) {
      handleObjectiveAttemptReview(req, res, decodeURIComponent(objectiveReviewMatch[1]));
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/api/tasks")) {
      sendTasksPayload(req, res);
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/api/reading/context")) {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const context = await readingContextPayload(
        url.searchParams.get("id") || "",
        url.searchParams.get("question") || "",
      );
      if (!context) {
        sendJson(res, 404, { error: "Reading test not found." });
        return;
      }
      sendCompressedJson(req, res, 200, context, "private, no-store");
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/api/report/pdf/")) {
      handleReportPdfDownload(req, res);
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/api/speaking/recording-download/")) {
      handleSpeakingRecordingDownload(req, res);
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.url === "/cambridge15/pdf") {
      serveFile(req, res, CAMBRIDGE15_PDF, "application/pdf");
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/cambridge-local/file/")) {
      serveLocalCambridgeFile(req, res);
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/cambridge15/audio/")) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const fileName = decodeURIComponent(path.basename(url.pathname));
      const filePath = path.join(CAMBRIDGE15_AUDIO_DIR, fileName);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(CAMBRIDGE15_AUDIO_DIR))) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      serveFile(req, res, resolved, "audio/mpeg");
      return;
    }
    if (req.method === "POST" && req.url === "/api/writing/feedback/start") {
      await handleWritingJobStart(req, res);
      return;
    }
    if (req.method === "GET" && req.url.startsWith("/api/writing/feedback/job/")) {
      handleWritingJobStatus(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/writing/feedback") {
      await handleWriting(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/writing/rewrite/score") {
      await handleWritingRewrite(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/speaking/feedback") {
      await handleSpeaking(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/speaking/turn") {
      await handleSpeakingTurn(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/tts") {
      await handleTts(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/speaking/recording") {
      await handleSpeakingRecording(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/help/explain") {
      await handleHelpExplain(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/help/chat") {
      await handleHelpChat(req, res);
      return;
    }
    if ((req.method === "GET" || req.method === "HEAD" || req.method === "POST") && req.url.startsWith("/api/listening/scripts")) {
      await handleListeningScripts(req, res);
      return;
    }
    if (req.url.startsWith("/api/listening/asr-cache")) {
      await handleListeningAsrCache(req, res);
      return;
    }
    if (req.url.startsWith("/api/qwen-session")) {
      await handleQwenHttpSession(req, res);
      return;
    }
    if (req.url === "/api/qwen-webrtc-offer") {
      await handleQwenWebRtcOffer(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/listening/score") {
      await handleObjective(req, res, "listening");
      return;
    }
    if (req.method === "POST" && req.url === "/api/reading/score") {
      await handleObjective(req, res, "reading");
      return;
    }
    if (req.method === "POST" && req.url === "/api/exam/report") {
      await handleFullExam(req, res);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res);
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || "Server error",
      ...(error.code ? { code: error.code } : {}),
      ...(error.publicDetails && typeof error.publicDetails === "object" ? error.publicDetails : {}),
    });
  }
});

const qwenWss = new WebSocketServer({ noServer: true });
const qwenAsrWss = new WebSocketServer({ noServer: true });
const qwenHttpSessions = new Map();

function createQwenMetrics(source, req) {
  return {
    source,
    sessionId: crypto.randomUUID().slice(0, 8),
    turnId: 0,
    audioBytes: 0,
    audioMessages: 0,
    committedAudioBytes: 0,
    committedAudioMessages: 0,
    commitAt: 0,
    responseCreatedAt: 0,
    firstDeltaAt: 0,
    userAgent: req?.headers?.["user-agent"] || "",
    remote: req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "",
  };
}

function estimateBase64Bytes(audio) {
  const text = String(audio || "");
  return Math.floor((text.length * 3) / 4);
}

function qwenMetricsLog(metrics, message, extra = {}) {
  const safeExtra = Object.entries(extra)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");
  console.log(`[qwen-turn] session=${metrics.sessionId} source=${metrics.source} turn=${metrics.turnId} ${message}${safeExtra ? ` ${safeExtra}` : ""}`);
}

function noteQwenAudio(metrics, bytes) {
  if (!metrics || !Number.isFinite(bytes) || bytes <= 0) return;
  metrics.audioBytes += bytes;
  metrics.audioMessages += 1;
}

function noteQwenCommit(metrics) {
  if (!metrics) return;
  metrics.turnId += 1;
  metrics.commitAt = Date.now();
  metrics.responseCreatedAt = 0;
  metrics.firstDeltaAt = 0;
  metrics.committedAudioBytes = metrics.audioBytes;
  metrics.committedAudioMessages = metrics.audioMessages;
  metrics.audioBytes = 0;
  metrics.audioMessages = 0;
  qwenMetricsLog(metrics, "commit", {
    audioBytes: metrics.committedAudioBytes,
    audioMessages: metrics.committedAudioMessages,
    remote: metrics.remote,
    ua: metrics.userAgent.slice(0, 120),
  });
}

function noteQwenServerEvent(metrics, type) {
  if (!metrics || !metrics.commitAt || !type) return;
  const now = Date.now();
  if (type === "response.created" && !metrics.responseCreatedAt) {
    metrics.responseCreatedAt = now;
    qwenMetricsLog(metrics, "response-created", { ms: now - metrics.commitAt });
  }
  if (/^response\.(?:audio|output_audio|audio_transcript|text|output_text)\.delta$/.test(type) && !metrics.firstDeltaAt) {
    metrics.firstDeltaAt = now;
    qwenMetricsLog(metrics, "first-delta", { ms: now - metrics.commitAt, event: type });
  }
  if (type === "response.done") {
    qwenMetricsLog(metrics, "response-done", {
      ms: now - metrics.commitAt,
      firstDeltaMs: metrics.firstDeltaAt ? metrics.firstDeltaAt - metrics.commitAt : "",
      responseCreatedMs: metrics.responseCreatedAt ? metrics.responseCreatedAt - metrics.commitAt : "",
    });
    metrics.commitAt = 0;
  }
}

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/qwen-client") {
    qwenWss.handleUpgrade(req, socket, head, (ws) => {
      qwenWss.emit("connection", ws, req);
    });
    return;
  }
  {
    socket.destroy();
    return;
  }
});

qwenWss.on("connection", (client, req) => {
  let upstream;
  const metrics = createQwenMetrics("ws", req);
  qwenMetricsLog(metrics, "client-connected", {
    remote: metrics.remote,
    ua: metrics.userAgent.slice(0, 120),
  });

  const sendClient = (message) => {
    if (message?.type === "event") noteQwenServerEvent(metrics, message.eventType || message.payload?.type || "");
    if (message?.type === "status" && message.status === "qwen-open") qwenMetricsLog(metrics, "qwen-open", { region: message.region, model: message.model });
    if (message?.type === "error") qwenMetricsLog(metrics, "error", { message: String(message.message || "").slice(0, 220) });
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
  };

  const closeUpstream = () => {
    if (upstream?.readyState === WebSocket.OPEN) upstream.close(1000, "client closed");
    upstream = undefined;
  };

  client.on("message", (raw, isBinary) => {
    if (isBinary) {
      if (!upstream || upstream.readyState !== WebSocket.OPEN) {
        sendClient({ type: "error", message: "Qwen realtime is not connected." });
        return;
      }
      noteQwenAudio(metrics, raw.length || raw.byteLength || 0);
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "input_audio_buffer.append",
        audio: Buffer.from(raw).toString("base64"),
      }));
      return;
    }
    let event;
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch {
      sendClient({ type: "error", message: "Invalid client message JSON." });
      return;
    }

    if (event.type === "connect") {
      closeUpstream();
      upstream = connectQwenRealtime(event, sendClient);
      return;
    }

    if (event.type === "disconnect") {
      closeUpstream();
      sendClient({ type: "status", status: "disconnected" });
      return;
    }

    if (event.type === "ping") {
      sendClient({ type: "status", status: "pong", at: event.at || Date.now() });
      return;
    }

    if (!upstream || upstream.readyState !== WebSocket.OPEN) {
      sendClient({ type: "error", message: "Qwen realtime is not connected." });
      return;
    }

    if (event.type === "session.update") {
      upstream.send(JSON.stringify(buildQwenSessionUpdate(event)));
      return;
    }

    if (event.type === "audio.append") {
      noteQwenAudio(metrics, estimateBase64Bytes(event.audio));
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "input_audio_buffer.append",
        audio: event.audio,
      }));
      return;
    }

    if (event.type === "audio.commit") {
      noteQwenCommit(metrics);
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "input_audio_buffer.commit",
      }));
      return;
    }

    if (event.type === "response.create") {
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "response.create",
        response: {
          modalities: Array.isArray(event.modalities) && event.modalities.length ? event.modalities : ["text", "audio"],
          ...(event.instructions ? { instructions: event.instructions } : {}),
        },
      }));
    }
  });

  client.on("close", closeUpstream);
  client.on("error", closeUpstream);
});

function buildQwenAsrSessionUpdate(config = {}) {
  const vadConfig = config.turnDetection === "manual"
    ? null
    : {
        type: "server_vad",
        threshold: Number.isFinite(Number(config.vadThreshold)) ? Number(config.vadThreshold) : 0.0,
        silence_duration_ms: Number.isFinite(Number(config.silenceDurationMs)) ? Number(config.silenceDurationMs) : 500,
      };
  return {
    event_id: `event_${crypto.randomUUID()}`,
    type: "session.update",
    session: {
      modalities: ["text"],
      input_audio_format: "pcm",
      sample_rate: 16000,
      instructions: config.instructions || "Transcribe the incoming IELTS listening audio accurately. Return concise transcript text as soon as speech is recognized.",
      turn_detection: vadConfig,
      input_audio_transcription: {
        model: config.transcriptionModel || QWEN_ASR_MODEL,
        language: config.language || "en",
      },
    },
  };
}

function connectQwenAsrRealtime(config, sendClient) {
  const apiKey = DASHSCOPE_API_KEY;
  const workspaceId = DASHSCOPE_WORKSPACE_ID;
  const region = config.region || DASHSCOPE_REGION;
  const model = config.model || QWEN_ASR_MODEL;

  if (!apiKey || !workspaceId) {
    queueMicrotask(() => sendClient({
      type: "error",
      message: "Qwen ASR key or workspace is not configured on the server.",
    }));
    return undefined;
  }

  const url = `wss://${workspaceId}.${region}.maas.aliyuncs.com/api-ws/v1/realtime?model=${encodeURIComponent(model)}`;
  const upstream = new WebSocket(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    handshakeTimeout: 15000,
  });
  let upstreamPingTimer = null;
  const clearUpstreamPing = () => {
    if (upstreamPingTimer) clearInterval(upstreamPingTimer);
    upstreamPingTimer = null;
  };

  upstream.on("open", () => {
    sendClient({ type: "status", status: "qwen-asr-open", region, model });
    upstream.send(JSON.stringify(buildQwenAsrSessionUpdate(config)));
    upstreamPingTimer = setInterval(() => {
      if (upstream.readyState === WebSocket.OPEN) {
        try {
          upstream.ping();
        } catch {
          clearUpstreamPing();
        }
      }
    }, 15_000);
    upstreamPingTimer.unref?.();
  });

  upstream.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString("utf8"));
      sendClient({ type: "event", eventType: message.type, payload: message });
    } catch {
      sendClient({ type: "raw", data: data.toString("base64") });
    }
  });

  upstream.on("unexpected-response", (_request, response) => {
    let body = "";
    response.on("data", (chunk) => { body += chunk.toString("utf8"); });
    response.on("end", () => {
      sendClient({
        type: "error",
        message: `Qwen ASR handshake failed: HTTP ${response.statusCode} ${body.slice(0, 300)}`,
      });
    });
  });

  upstream.on("close", (code, reason) => {
    clearUpstreamPing();
    sendClient({ type: "status", status: "qwen-asr-closed", code, reason: reason.toString("utf8") });
  });

  upstream.on("error", (error) => {
    clearUpstreamPing();
    const detail = error?.message || error?.code || "connection failed or closed before the ASR handshake completed";
    sendClient({ type: "error", message: `Qwen ASR error: ${detail}` });
  });

  return upstream;
}

qwenAsrWss.on("connection", (client, req) => {
  let upstream;
  const metrics = createQwenMetrics("asr-ws", req);
  qwenMetricsLog(metrics, "client-connected", {
    remote: metrics.remote,
    ua: metrics.userAgent.slice(0, 120),
  });

  const sendClient = (message) => {
    if (message?.type === "error") qwenMetricsLog(metrics, "error", { message: String(message.message || "").slice(0, 220) });
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
  };

  const closeUpstream = () => {
    if (upstream?.readyState === WebSocket.OPEN) upstream.close(1000, "client closed");
    upstream = undefined;
  };

  client.on("message", (raw, isBinary) => {
    if (isBinary) {
      if (!upstream || upstream.readyState !== WebSocket.OPEN) {
        sendClient({ type: "error", message: "Qwen ASR is not connected." });
        return;
      }
      noteQwenAudio(metrics, raw.length || raw.byteLength || 0);
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "input_audio_buffer.append",
        audio: Buffer.from(raw).toString("base64"),
      }));
      return;
    }
    let event;
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch {
      sendClient({ type: "error", message: "Invalid ASR client message JSON." });
      return;
    }

    if (event.type === "connect") {
      closeUpstream();
      upstream = connectQwenAsrRealtime(event, sendClient);
      return;
    }

    if (event.type === "disconnect") {
      closeUpstream();
      sendClient({ type: "status", status: "disconnected" });
      return;
    }

    if (!upstream || upstream.readyState !== WebSocket.OPEN) {
      sendClient({ type: "error", message: "Qwen ASR is not connected." });
      return;
    }

    if (event.type === "audio.commit") {
      noteQwenCommit(metrics);
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "input_audio_buffer.commit",
      }));
      return;
    }

    if (event.type === "session.finish") {
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "session.finish",
      }));
      return;
    }

    if (event.type === "response.create") {
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "response.create",
        response: { modalities: ["text"] },
      }));
    }
  });

  client.on("close", closeUpstream);
  client.on("error", closeUpstream);
});

function forwardQwenClientEvent(upstream, event, sendClient, metrics) {
  if (event.type === "ping") {
    sendClient({ type: "status", status: "pong", at: event.at || Date.now() });
    return;
  }

  if (!upstream || upstream.readyState !== WebSocket.OPEN) {
    sendClient({ type: "error", message: "Qwen realtime is not connected." });
    return;
  }

  if (event.type === "session.update") {
    upstream.send(JSON.stringify(buildQwenSessionUpdate(event)));
    return;
  }

  if (event.type === "audio.append") {
    noteQwenAudio(metrics, estimateBase64Bytes(event.audio));
    upstream.send(JSON.stringify({
      event_id: `event_${crypto.randomUUID()}`,
      type: "input_audio_buffer.append",
      audio: event.audio,
    }));
    return;
  }

  if (event.type === "audio.batch" && Array.isArray(event.chunks)) {
    for (const audio of event.chunks) {
      if (!audio) continue;
      noteQwenAudio(metrics, estimateBase64Bytes(audio));
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "input_audio_buffer.append",
        audio,
      }));
    }
    return;
  }

  if (event.type === "audio.commit") {
    noteQwenCommit(metrics);
    upstream.send(JSON.stringify({
      event_id: `event_${crypto.randomUUID()}`,
      type: "input_audio_buffer.commit",
    }));
    return;
  }

  if (event.type === "response.create") {
    upstream.send(JSON.stringify({
      event_id: `event_${crypto.randomUUID()}`,
      type: "response.create",
      response: {
        modalities: Array.isArray(event.modalities) && event.modalities.length ? event.modalities : ["text", "audio"],
        ...(event.instructions ? { instructions: event.instructions } : {}),
      },
    }));
  }
}

function enqueueQwenHttp(session, message) {
  session.queue.push(message);
  session.lastSeen = Date.now();
  while (session.waiters.length) {
    const waiter = session.waiters.shift();
    waiter();
  }
}

function closeQwenHttpSession(id) {
  const session = qwenHttpSessions.get(id);
  if (!session) return;
  if (session.upstream?.readyState === WebSocket.OPEN) session.upstream.close(1000, "http session closed");
  qwenHttpSessions.delete(id);
  while (session.waiters.length) {
    const waiter = session.waiters.shift();
    waiter();
  }
}

async function handleQwenHttpSession(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (req.method === "POST" && url.pathname === "/api/qwen-session") {
    const config = JSON.parse((await readBody(req)) || "{}");
    const id = crypto.randomUUID();
    const session = {
      id,
      queue: [],
      waiters: [],
      upstream: undefined,
      lastSeen: Date.now(),
      metrics: createQwenMetrics("http", req),
    };
    qwenHttpSessions.set(id, session);
    qwenMetricsLog(session.metrics, "client-connected", {
      remote: session.metrics.remote,
      ua: session.metrics.userAgent.slice(0, 120),
    });
    const sendClient = (message) => {
      if (message?.type === "event") noteQwenServerEvent(session.metrics, message.eventType || message.payload?.type || "");
      enqueueQwenHttp(session, message);
    };
    session.upstream = connectQwenRealtime(config, sendClient);
    sendJson(res, 200, { id });
    return;
  }

  const id = parts[2];
  const action = parts[3];
  const session = qwenHttpSessions.get(id);
  if (!session) {
    sendJson(res, 404, { error: "Qwen HTTP session not found." });
    return;
  }
  session.lastSeen = Date.now();

  if (req.method === "POST" && action === "send") {
    const event = JSON.parse((await readBody(req)) || "{}");
    if (event.type === "disconnect") {
      closeQwenHttpSession(id);
      sendJson(res, 200, { ok: true });
      return;
    }
    forwardQwenClientEvent(session.upstream, event, (message) => {
      if (message?.type === "event") noteQwenServerEvent(session.metrics, message.eventType || message.payload?.type || "");
      enqueueQwenHttp(session, message);
    }, session.metrics);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && action === "events") {
    if (!session.queue.length) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1000);
        session.waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    const events = session.queue.splice(0, 100);
    sendJson(res, 200, { events });
    return;
  }

  if (req.method === "DELETE") {
    closeQwenHttpSession(id);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

function qwenRealtimeHttpEndpoint(region = DASHSCOPE_REGION) {
  if (DASHSCOPE_WEBRTC_ENDPOINT) return DASHSCOPE_WEBRTC_ENDPOINT;
  if (DASHSCOPE_WORKSPACE_ID) return `https://${DASHSCOPE_WORKSPACE_ID}.${region}.maas.aliyuncs.com`;
  return "https://dashscope.aliyuncs.com";
}

async function requestQwenWebRtcAnswer(offerSdp, req) {
  if (QWEN_WEBRTC_EXCHANGE_PROXY_URL) {
    const startedAt = Date.now();
    const response = await fetch(QWEN_WEBRTC_EXCHANGE_PROXY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/sdp",
        "x-ieltsist-client-ip": String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""),
        "x-ieltsist-user-agent": String(req.headers["user-agent"] || "").slice(0, 300),
      },
      body: offerSdp,
    });
    const text = await response.text();
    console.log(`[qwen-webrtc] proxy status=${response.status} ms=${Date.now() - startedAt} proxy=${new URL(QWEN_WEBRTC_EXCHANGE_PROXY_URL).origin} model=${QWEN_REALTIME_MODEL}`);
    if (!response.ok) return { ok: false, status: response.status, text };
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        return { ok: true, status: response.status, text: json.sdp || json.answerSdp || json.answer || "" };
      } catch {
        return { ok: false, status: 502, text: "Invalid JSON returned by Qwen WebRTC exchange proxy." };
      }
    }
    return { ok: true, status: response.status, text };
  }

  const url = new URL("/api/v1/webrtc/realtime", `${qwenRealtimeHttpEndpoint(DASHSCOPE_REGION)}/`);
  url.searchParams.set("model", QWEN_REALTIME_MODEL);
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/sdp",
      "authorization": `Bearer ${DASHSCOPE_API_KEY}`,
      ...(DASHSCOPE_WORKSPACE_ID ? { "x-dashscope-workspace": DASHSCOPE_WORKSPACE_ID } : {}),
    },
    body: offerSdp,
  });
  const text = await response.text();
  console.log(`[qwen-webrtc] offer status=${response.status} ms=${Date.now() - startedAt} endpoint=${url.origin} model=${QWEN_REALTIME_MODEL}`);
  return { ok: response.ok, status: response.status, text };
}

async function handleQwenWebRtcOffer(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!DASHSCOPE_API_KEY && !QWEN_WEBRTC_EXCHANGE_PROXY_URL) {
    sendJson(res, 500, { error: "Qwen realtime key is not configured on the server." });
    return;
  }
  const offerSdp = await readBody(req);
  if (!offerSdp || !/^v=0/m.test(offerSdp)) {
    sendJson(res, 400, { error: "Invalid WebRTC offer SDP." });
    return;
  }
  const answer = await requestQwenWebRtcAnswer(offerSdp, req);
  if (!answer.ok) {
    sendJson(res, answer.status, {
      error: `Qwen WebRTC SDP exchange failed: HTTP ${answer.status}`,
      detail: answer.text.slice(0, 500),
    });
    return;
  }
  res.writeHead(200, {
    "content-type": "application/sdp; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(answer.text);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of qwenHttpSessions) {
    if (now - session.lastSeen > 15 * 60_000) closeQwenHttpSession(id);
  }
}, 60_000).unref();

function connectQwenRealtime(config, sendClient) {
  const apiKey = DASHSCOPE_API_KEY;
  const workspaceId = DASHSCOPE_WORKSPACE_ID;
  const region = config.region || DASHSCOPE_REGION;
  const model = config.model || QWEN_REALTIME_MODEL;

  if (!apiKey || !workspaceId) {
    queueMicrotask(() => sendClient({
      type: "error",
      message: "Qwen realtime key or workspace is not configured on the server.",
    }));
    return undefined;
  }

  const url = `wss://${workspaceId}.${region}.maas.aliyuncs.com/api-ws/v1/realtime?model=${encodeURIComponent(model)}`;
  const upstream = new WebSocket(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    handshakeTimeout: 15000,
  });
  let upstreamPingTimer = null;

  const clearUpstreamPing = () => {
    if (upstreamPingTimer) clearInterval(upstreamPingTimer);
    upstreamPingTimer = null;
  };

  upstream.on("open", () => {
    sendClient({ type: "status", status: "qwen-open", region, model });
    upstream.send(JSON.stringify(buildQwenSessionUpdate(config)));
    upstreamPingTimer = setInterval(() => {
      if (upstream.readyState === WebSocket.OPEN) {
        try {
          upstream.ping();
        } catch {
          clearUpstreamPing();
        }
      }
    }, 15_000);
    upstreamPingTimer.unref?.();
  });

  upstream.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString("utf8"));
      sendClient({ type: "event", eventType: message.type, payload: message });
    } catch {
      sendClient({ type: "raw", data: data.toString("base64") });
    }
  });

  upstream.on("unexpected-response", (_request, response) => {
    let body = "";
    response.on("data", (chunk) => { body += chunk.toString("utf8"); });
    response.on("end", () => {
      sendClient({
        type: "error",
        message: `Qwen handshake failed: HTTP ${response.statusCode} ${body.slice(0, 300)}`,
      });
    });
  });

  upstream.on("close", (code, reason) => {
    clearUpstreamPing();
    const reasonText = reason.toString("utf8");
    sendClient({ type: "status", status: "qwen-closed", code, reason: reasonText });
  });

  upstream.on("error", (error) => {
    clearUpstreamPing();
    const detail = error?.message || error?.code || "connection failed or closed before the realtime handshake completed";
    sendClient({ type: "error", message: `Qwen realtime error: ${detail}` });
  });

  return upstream;
}

function buildQwenSessionUpdate(config = {}) {
  return {
    event_id: `event_${crypto.randomUUID()}`,
    type: "session.update",
    session: {
      modalities: ["text", "audio"],
      voice: config.voice || "Ethan",
      input_audio_format: "pcm",
      output_audio_format: "pcm",
      instructions: config.instructions || "You are a professional IELTS Speaking examiner. First say a brief greeting statement, then ask exactly one short Part 1 question and wait. Do not ask 'How are you?' or 'Are you ready?'.",
      turn_detection: config.turnDetection === "manual" ? null : {
        type: "semantic_vad",
        threshold: 0.5,
        silence_duration_ms: Number(config.silenceDurationMs || 1500),
      },
    },
  };
}

server.listen(PORT, SERVER_HOST, () => {
  recoverStemMarkingJobs();
  console.log(`IELTS-ist running at http://${SERVER_HOST}:${PORT}`);
  console.log(AI_GATEWAY_API_KEY
    ? `AI Coach enabled with IELTSist AI Gateway model ${AI_GATEWAY_MODEL} reasoning=${AI_GATEWAY_REASONING_EFFORT}`
    : COACH_AI_API_KEY
    ? `AI Coach enabled with Qwen model ${COACH_AI_MODEL}`
    : OPENAI_API_KEY
      ? `AI Coach using legacy model ${MODEL}`
      : "AI Coach local fallback mode. Set AI_GATEWAY_API_KEY or DASHSCOPE_API_KEY to enable AI.");
  console.log(DASHSCOPE_API_KEY && DASHSCOPE_WORKSPACE_ID ? "Qwen realtime speaking enabled." : "Qwen realtime speaking disabled. Set DASHSCOPE_API_KEY and DASHSCOPE_WORKSPACE_ID.");
});
