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
const STARTED_AT = Date.now();
const PUBLIC_DIR = path.join(__dirname, "public");
const APP_DB_PATH = process.env.IELTSIST_DB_PATH || path.join(__dirname, "data", "ieltsist.sqlite");
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || "";
const DEFAULT_CAMBRIDGE15_DIR = process.platform === "win32"
  ? "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑15"
  : path.join(__dirname, "data", "cambridge15");
const CAMBRIDGE15_DIR = process.env.CAMBRIDGE15_DIR || DEFAULT_CAMBRIDGE15_DIR;
const CAMBRIDGE15_AUDIO_DIR = path.join(CAMBRIDGE15_DIR, "音频");
const CAMBRIDGE15_PDF = path.join(CAMBRIDGE15_DIR, "剑15.pdf");
const QUESTION_BANK_PATH = path.join(__dirname, "data", "cambridge15-bank.json");
const CAMBRIDGE_LOCAL_BANK_PATH = path.join(__dirname, "data", "cambridge-local-bank.json");
const SPEAKING_BANK_PATH = path.join(__dirname, "data", "speaking-bank.json");
const LISTENING_ASR_CACHE_PATH = path.join(__dirname, "data", "listening-asr-cache.json");
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
const SPEAKING_AUDIO_AI_MODEL = process.env.SPEAKING_AUDIO_AI_MODEL || process.env.QWEN_SPEAKING_AUDIO_MODEL || "qwen3.5-omni-flash";
const SPEAKING_AUDIO_AI_BASE_URL = (process.env.SPEAKING_AUDIO_AI_BASE_URL || process.env.QWEN_SPEAKING_AUDIO_BASE_URL || DASHSCOPE_COMPAT_BASE_URL).replace(/\/+$/, "");
const SPEAKING_AUDIO_AI_API_KEY = process.env.SPEAKING_AUDIO_AI_API_KEY || process.env.QWEN_SPEAKING_AUDIO_API_KEY || DASHSCOPE_API_KEY;
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
const IMPORTED_BANKS = [CAMBRIDGE15_BANK, LOCAL_CAMBRIDGE_BANK];
const LOCAL_FILE_INDEX = new Map((LOCAL_CAMBRIDGE_BANK.localFiles || []).map((file) => [file.id, file]));

const recentWindow = "2025-07 to 2026-07";
const TASKS_CACHE_TTL_MS = 10 * 60_000;
const LISTENING_SCRIPT_CACHE_TTL_MS = 10 * 60_000;
const REPORT_DOWNLOAD_TTL_MS = 2 * 60 * 60_000;
const RECORDING_DOWNLOAD_TTL_MS = REPORT_DOWNLOAD_TTL_MS;
let tasksPayloadCache = null;
const reportDownloads = new Map();
const recordingDownloads = new Map();
const listeningScriptCache = new Map();

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

function realListeningTests() {
  return IMPORTED_BANKS
    .flatMap((bank) => bank.listeningTests || [])
    .filter((test) => isEnabledCambridgeBook(test) && hasPageImages(test, "questionPageImages") && hasQuestionSlots(test));
}

function realReadingTests() {
  return IMPORTED_BANKS
    .flatMap((bank) => bank.readingTests || [])
    .filter((test) => isEnabledCambridgeBook(test) && hasPageImages(test, "readingPageImages") && hasQuestionSlots(test));
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

function slimQuestions(questions) {
  return Array.isArray(questions)
    ? questions.map((question, index) => ({
        id: question.id || `q${index + 1}`,
        text: question.text || `Question ${index + 1}`,
        answer: question.answer || "",
      }))
    : [];
}

function slimListeningTest(test) {
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
    questions: slimQuestions(test.questions),
  };
}

function slimReadingTest(test) {
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
    questions: slimQuestions(test.questions),
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
  return {
    aiEnabled: Boolean(OPENAI_API_KEY),
    model: OPENAI_API_KEY ? MODEL : null,
    aiBaseUrl: OPENAI_API_KEY ? OPENAI_BASE_URL : null,
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
    process.env[key] = value;
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

function getSpeakingSets() {
  const bank = loadQuestionBank(SPEAKING_BANK_PATH);
  const sets = Array.isArray(bank.speakingSets) ? bank.speakingSets : [];
  const visibleSets = sets.filter((set) => isEnabledCambridgeBook(set) && hasPageImages(set, "speakingPageImages"));
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
  `);
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

function currentMembership(userId) {
  return getAppDb().prepare("SELECT * FROM memberships WHERE user_id = ?").get(userId) || null;
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
  res.setHeader("Set-Cookie", `ieltsist_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`);
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
    res.setHeader("Set-Cookie", "ieltsist_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
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
  if (!ADMIN_API_SECRET || req.headers["x-admin-secret"] !== ADMIN_API_SECRET) {
    sendJson(res, 403, { error: "Admin API secret is required." });
    return;
  }
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
    const cacheControl = ext === ".html"
      ? "no-store"
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
      zlib.gzip(data, { level: 6 }, (gzipErr, compressed) => {
        if (gzipErr) {
          sendBody(data);
          return;
        }
        sendBody(compressed, { "content-encoding": "gzip" });
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

async function callOpenAI({ system, user, temperature = 0.3, apiKey = OPENAI_API_KEY, baseUrl = OPENAI_BASE_URL, model = MODEL, allowResponsesFallback = true }) {
  if (!apiKey) return null;
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const chatResponse = await fetch(`${normalizedBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
    }),
  });

  if (chatResponse.ok) {
    const json = await chatResponse.json();
    const text = json.choices?.[0]?.message?.content || json.choices?.[0]?.text || "";
    if (text.trim()) return text.trim();
  }

  const chatError = await chatResponse.text();
  if (!allowResponsesFallback) {
    throw new Error(`AI API failed. chat=${chatResponse.status}: ${chatError.slice(0, 500)}`);
  }
  const response = await fetch(`${normalizedBaseUrl}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
    }),
  });

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
  const response = await fetch(`${SPEAKING_AUDIO_AI_BASE_URL}/chat/completions`, {
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
  });
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
  });
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

function localHelpExplanation(ocrText, warning = "") {
  const clean = String(ocrText || "").trim();
  if (!clean) {
    return [
      "I could not recognize enough text from this screenshot.",
      "Try selecting a tighter area around the question text, or type the sentence/question in the chat box.",
      warning ? `Local note: ${warning}` : "",
    ].filter(Boolean).join("\n");
  }
  return [
    "Recognized text:",
    clean,
    "",
    "Local mode: AI explanation is unavailable right now. You can ask a follow-up question, or retry after the AI service recovers.",
    warning ? `Local note: ${warning}` : "",
  ].filter(Boolean).join("\n");
}

function compactHelpText(value, maxLength = 12000) {
  const clean = String(value || "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}\n...[truncated]` : clean;
}

function normalizeHelpContext(value) {
  if (!value || typeof value !== "object") return {};
  const reading = value.reading && typeof value.reading === "object" ? value.reading : null;
  const listening = value.listening && typeof value.listening === "object" ? value.listening : null;
  const normalizeQuestions = (questions) => Array.isArray(questions)
    ? questions.slice(0, 40).map((question, index) => ({
        number: Number(question.number || index + 1),
        id: String(question.id || `q${index + 1}`).slice(0, 40),
        question: String(question.question || "").slice(0, 300),
        expectedAnswer: String(question.expectedAnswer || "").slice(0, 160),
        studentAnswer: String(question.studentAnswer || "").slice(0, 160),
      }))
    : [];
  return {
    activeView: String(value.activeView || "").slice(0, 40),
    activeModule: String(value.activeModule || "").slice(0, 40),
    reading: reading ? {
      module: "reading",
      mode: String(reading.mode || "").slice(0, 40),
      id: String(reading.id || "").slice(0, 80),
      title: String(reading.title || "").slice(0, 180),
      source: String(reading.source || "").slice(0, 120),
      period: String(reading.period || "").slice(0, 80),
      questions: normalizeQuestions(reading.questions),
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
  if (!context.reading && !context.listening) return "Structured app context: no current Reading or Listening paper context was detected.";
  if (context.listening && (!context.reading || context.activeModule === "listening")) {
    const listening = context.listening;
    const listeningQuestionLines = listening.questions
      .map((question) => `Q${question.number}: ${question.question || "(question text unavailable)"} | key: ${question.expectedAnswer || "(no key imported)"} | student: ${question.studentAnswer || "(blank)"}`)
      .join("\n");
    return [
      "Structured app context:",
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
    `Current module: Reading`,
    `Paper: ${[reading.title, reading.source, reading.period].filter(Boolean).join(" · ") || reading.id || "(unknown)"}`,
    "",
    "Answer key and student answers:",
    questionLines || "(no question table available)",
    "",
    "Reading paper / passage OCR text:",
    reading.paperText || "(no passage text available)",
  ].join("\n");
}

async function buildHelpExplanation(ocrText, helpContext = {}) {
  const clean = String(ocrText || "").trim();
  if (!clean) return { mode: "local", answer: localHelpExplanation(clean) };
  let ai = null;
  let warning = "";
  try {
    ai = await callOpenAI({
      system: [
        "You are an IELTS tutor inside an IELTS practice web app.",
        "Explain the selected question area clearly and concisely.",
        "The student is Chinese, so use Chinese for explanations and translations, but keep IELTS keywords in English.",
        "The structured Reading/Listening context is authoritative app data. Use it even if the screenshot OCR is short, partial, or noisy.",
        "If it is a Reading question or the student asks why an answer is correct, use the structured Reading context: identify the question number, correct answer, student's answer if present, source sentence/paragraph, keyword-paraphrase link, and why wrong options or wrong answers fail.",
        "If it is a Listening question, use the structured Listening context: identify the question number, correct answer, student's answer if present, relevant question-paper wording, audioscript/ASR evidence, distractors, spelling/plural/number issues, and what the student should listen for.",
        "For Reading/Listening answer explanations, do not just translate. Give evidence logic: question focus -> locating/listening keywords -> matching/paraphrase -> answer conclusion.",
        "Do not guess beyond the OCR/context. If the exact source sentence is not visible, say what is missing and explain from the available answer key and recognized text only.",
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
    warning = error.message || "AI unavailable";
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
  sendJson(res, 200, {
    ocrText,
    answer: explanation.answer,
    mode: explanation.mode,
    warning: explanation.warning || ocrWarning,
  });
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
  try {
    ai = await callOpenAI({
      system: [
        "You are an IELTS tutor helping inside an IELTS practice web app.",
        "Answer the student's follow-up based on the OCR context, structured app context, and conversation.",
        "Use Chinese explanations by default. Keep IELTS terms and quoted question words in English.",
        "The structured Reading/Listening context is authoritative app data. Use it even if the screenshot OCR is short, partial, or noisy.",
        "Be direct and practical; explain vocabulary, paraphrase, question type, strategy, and answer-location logic when relevant.",
        "If the student asks why a Reading answer is correct or why their answer is wrong, identify the relevant question number from their message/OCR/history, then use the Reading answer key and passage OCR text to explain: correct answer, source evidence, keyword-paraphrase chain, and why alternatives fail.",
        "If the student asks a Listening question, identify the relevant question number from their message/OCR/history, then use the Listening answer key, question paper OCR, and audioscript/ASR text to explain: correct answer, audio evidence, distractors, paraphrase, spelling/plural/number format, and how to catch it next time.",
        "If options A/B/C/D or True/False/Not Given are involved, explain option-by-option only when the option text is available. Otherwise state that the option text is not visible and ask for a screenshot of the options.",
        "Never invent evidence. If the passage sentence is unavailable, say so and explain from the answer key plus visible OCR only.",
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
    });
  } catch (error) {
    warning = error.message || "AI unavailable";
  }
  sendJson(res, 200, {
    mode: ai ? "ai" : "local",
    answer: ai || localHelpExplanation([contextText, imageOcrText].filter(Boolean).join("\n\n"), warning || imageOcrWarning),
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
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function scoreObjective(questions, answers = {}) {
  let correct = 0;
  const scorableQuestions = questions.filter((question) => normalizeAnswer(question.answer));
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
        expected: question.answer || "Not imported",
        actual: answers[question.id] || "",
        correct: null,
      })),
    };
  }
  const details = questions.map((question) => {
    const expected = normalizeAnswer(question.answer);
    const actual = normalizeAnswer(answers[question.id]);
    if (!expected) {
      return { id: question.id, text: question.text, expected: "Not imported", actual: answers[question.id] || "", correct: null };
    }
    const ok = actual && (actual === expected || expected.includes(actual) || actual.includes(expected));
    if (ok) correct += 1;
    return { id: question.id, text: question.text, expected: question.answer, actual: answers[question.id] || "", correct: Boolean(ok) };
  });
  const band = Math.max(3, Math.min(9, Math.round((3 + (correct / Math.max(scorableQuestions.length, 1)) * 6) * 2) / 2));
  return { correct, total: questions.length, scoredTotal: scorableQuestions.length, band, answerAvailable: true, details };
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

function localWritingFeedback(prompt, essay, warning = "") {
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

function writingSystemPrompt() {
  return [
    "You must mark IELTS Writing by following the Amber IELTS Writing Feedback Skill exactly.",
    "The full skill file is included below. Treat it as mandatory grading instructions.",
    AMBER_WRITING_SKILL || [
      "Fallback if the local skill file is unavailable:",
      "Copy the prompt. Keep each original student paragraph before its Chinese feedback.",
      "Give integer category scores only, then a rounded overall band ending in .0 or .5.",
      "Write a realistic band-7.5 model answer preserving the student's position where possible.",
      "Add Chinese translations comparing original paragraphs with the revised model answer.",
      "For Task 2, first category is Task Response. For Task 1, first category is Task Achievement.",
      "Use direct, practical Chinese teacher feedback. Do not be vague.",
    ].join("\n"),
  ].join("\n");
}

function speakingSystemPrompt() {
  return [
    "You are a professional IELTS Speaking examiner and coach.",
    "Score four independent criteria from 0 to 9: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation.",
    "Overall speaking band = average of the four scores, rounded to the nearest 0.5. Examples: 6.75 -> 7.0, 6.25 -> 6.5.",
    "Use these band anchors:",
    "Fluency and Coherence Band 5: basic flow, obvious repetition/self-correction, limited linking. Band 6: willing to extend but sometimes loses coherence, some linking, hesitation does not seriously block meaning. Band 7: speaks at length without obvious effort, flexible cohesive devices, hesitation mainly for ideas. Band 8: very fluent, rare repetition/hesitation, logical development and natural transitions.",
    "Lexical Resource Band 5: handles familiar topics, limited vocabulary, repetition, occasional collocation errors. Band 6: enough vocabulary for different topics, some inaccurate choices, can paraphrase. Band 7: flexible vocabulary, less common words/idioms, good collocations, minor errors. Band 8: wide and precise vocabulary, natural style, skillful idiomatic use.",
    "Grammatical Range and Accuracy Band 5: mostly simple sentences, complex attempts often wrong, basic tense errors. Band 6: mix of simple and complex structures, errors in complex sentences but meaning clear. Band 7: varied complex structures, most sentences accurate, errors do not block communication. Band 8: rich sentence range, mostly error-free, only occasional slips.",
    "Pronunciation Band 5: generally understandable but some pronunciation issues cause difficulty, limited intonation. Band 6: understandable throughout, some errors, some intonation control. Band 7: easy to understand, uses stress and intonation though not always consistently, occasional minor issues. Band 8: wide pronunciation features, natural stress/intonation, very few errors.",
    "Because this app may only have transcript text, state that Pronunciation confidence is limited unless audio evidence is available.",
    "Return Chinese feedback with: score table, exact overall calculation, strengths, weaknesses, top 5 improvement points, corrected sample answers, and next drills. Be strict and examiner-like.",
  ].join("\n");
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

async function handleWriting(req, res) {
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
    });
  } catch (error) {
    warning = error.message || "AI unavailable";
  }
  const feedback = ai || localWritingFeedback(prompt, essay, warning);
  const pdfDataUrl = await createWritingReportPdfDataUrl(prompt, feedback);
  sendJson(res, 200, addPdfDownloadUrl(
    { mode: ai ? "ai" : "local", feedback, pdfDataUrl, pdfFileName: "ielts-writing-feedback.pdf", warning },
    "ielts-writing-feedback.pdf"
  ));
}

async function handleSpeaking(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const set = String(payload.set || "").trim();
  const transcript = String(payload.transcript || "").trim();
  if (!transcript) {
    sendJson(res, 400, { error: "请先完成口语回答。" });
    return;
  }

  const local = [
    `整体预估：Band ${wordCount(transcript) > 180 ? "6.5" : "6.0"}`,
    "",
    "本地模式反馈：",
    "- Fluency and Coherence：回答长度基本够，但需要减少停顿和重复，并用 first, for example, as a result 等连接思路。",
    "- Lexical Resource：主题词可以再具体，避免反复使用 good, important, interesting。",
    "- Grammatical Range and Accuracy：建议多使用原因状语从句、定语从句和对比句。",
    "- Pronunciation：当前只有文字转写，无法可靠判断发音，只能根据转写流畅度粗略估计。",
    "",
    "提升点：",
    "1. 每个回答至少包含直接回答、原因、例子、补充结果。",
    "2. Part 2 用过去/现在/未来三层结构组织。",
    "3. 录音后回听，标记重复词和语法自改位置。",
  ].join("\n");

  let ai = null;
  let warning = "";
  try {
    ai = await callOpenAI({
      system: speakingSystemPrompt(),
      user: `Speaking topic set: ${set}\n\nCandidate transcript:\n${transcript}`,
    });
  } catch (error) {
    warning = error.message || "AI unavailable";
  }
  const feedback = ai || local;
  sendJson(res, 200, { mode: ai ? "ai" : "local", feedback, band: extractSpeakingBandStable(feedback), warning });
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
    });
  } catch (error) {
    warning = error.message || "AI unavailable";
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
    warning = error.message || "TTS unavailable";
  }
  sendJson(res, 200, { mode: audio ? "fish" : "browser", audio, voice, warning });
}

function execFilePromise(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: 60_000 }, (error, stdout, stderr) => {
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
    await execFilePromise("ffmpeg", ["-y", "-i", inputPath, "-vn", "-ar", "24000", "-ac", "1", "-b:a", "64k", outputPath]);
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
      warning: `MP3 conversion failed: ${error.message}`,
    });
  } finally {
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
}

async function handleObjective(req, res, moduleName) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const answers = payload.answers || {};
  if (!questions.length) {
    sendJson(res, 400, { error: "缺少题目。" });
    return;
  }
  const result = scoreObjective(questions, answers);
  const moduleLabel = moduleName === "listening" ? "Listening" : "Reading";
  const feedback = result.answerAvailable
    ? `${moduleLabel} score: ${result.correct}/${result.scoredTotal}, estimated Band ${result.band.toFixed(1)}. Review wrong answers for keywords, paraphrasing, spelling and plural forms.`
    : `${moduleLabel}: answers are not imported for this local Cambridge paper yet. Your responses remain on the page, but the app cannot score this test automatically. Please check the local PDF or analysis file manually.`;
  sendJson(res, 200, {
    mode: "local",
    module: moduleName,
    result,
    feedback,
  });
}

async function handleFullExam(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const listening = scoreObjective(payload.listening?.questions || [], payload.listening?.answers || {});
  const reading = scoreObjective(payload.reading?.questions || [], payload.reading?.answers || {});
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
      system: fullExamSystemPrompt(),
      user: JSON.stringify(
        { listening, reading, writing: { tasks: writingTasks }, speaking },
        null,
        2,
      ),
    });
  } catch (error) {
    warning = error.message || "AI unavailable";
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

function createWritingReportPdfDataUrl(prompt, body) {
  const taskTitle = /task\s*1/i.test(prompt) ? "IELTS Writing Task 1 Feedback Report" : "IELTS Writing Task 2 Feedback Report";
  return createStyledReportPdfDataUrl({
    title: taskTitle,
    subtitle: taskTitle,
    prompt,
    body,
  });
}

function localWritingFeedback(prompt, essay, warning = "") {
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
    "The full skill file is included below. Treat it as mandatory grading instructions.",
    AMBER_WRITING_SKILL || [
      "Fallback if the local skill file is unavailable:",
      "Copy the prompt. Keep each original student paragraph before its feedback.",
      "Give integer category scores only, then a rounded overall band ending in .0 or .5.",
      "Write a realistic band-7.5 model answer preserving the student's position where possible.",
      "Add clear English comparisons between original paragraphs and the revised model answer.",
      "For Task 2, the first category is Task Response. For Task 1, the first category is Task Achievement.",
      "Use direct, practical teacher feedback. Do not be vague.",
    ].join("\n"),
  ].join("\n");
}

function speakingSystemPrompt() {
  return [
    "You are a professional IELTS Speaking examiner and coach.",
    "Score four independent criteria from 0 to 9: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation.",
    "Overall speaking band = average of the four scores, rounded to the nearest 0.5. Examples: 6.75 -> 7.0, 6.25 -> 6.5.",
    "Use these band anchors:",
    "Fluency and Coherence Band 5: basic flow, obvious repetition/self-correction, limited linking. Band 6: willing to extend but sometimes loses coherence, some linking, hesitation does not seriously block meaning. Band 7: speaks at length without obvious effort, flexible cohesive devices, hesitation mainly for ideas. Band 8: very fluent, rare repetition/hesitation, logical development and natural transitions.",
    "Lexical Resource Band 5: handles familiar topics, limited vocabulary, repetition, occasional collocation errors. Band 6: enough vocabulary for different topics, some inaccurate choices, can paraphrase. Band 7: flexible vocabulary, less common words/idioms, good collocations, minor errors. Band 8: wide and precise vocabulary, natural style, skillful idiomatic use.",
    "Grammatical Range and Accuracy Band 5: mostly simple sentences, complex attempts often wrong, basic tense errors. Band 6: mix of simple and complex structures, errors in complex sentences but meaning clear. Band 7: varied complex structures, most sentences accurate, errors do not block communication. Band 8: rich sentence range, mostly error-free, only occasional slips.",
    "Pronunciation Band 5: generally understandable but some pronunciation issues cause difficulty, limited intonation. Band 6: understandable throughout, some errors, some intonation control. Band 7: easy to understand, uses stress and intonation though not always consistently, occasional minor issues. Band 8: wide pronunciation features, natural stress/intonation, very few errors.",
    "When realtime examiner notes or MP3 audio evidence are provided, use them to calibrate Pronunciation and Fluency. Do not claim there is no audio evidence if an MP3 is attached.",
    "If MP3 and transcript disagree, treat the audio as stronger evidence for pronunciation, pauses, rhythm, hesitation and self-correction; use the transcript for vocabulary, grammar and content.",
    "Return English feedback with: score table, exact overall calculation, strengths, weaknesses, top 5 improvement points, corrected sample answers, and next drills. Be strict and examiner-like.",
  ].join("\n");
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
  const prompt = String(payload.prompt || "").trim();
  const essay = String(payload.essay || "").trim();
  if (!prompt || !essay) {
    const error = new Error("Prompt and essay are both required.");
    error.statusCode = 400;
    throw error;
  }
  return { prompt, essay };
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
    warning = error.message || "AI unavailable";
  }
  const feedback = ai || localWritingFeedback(prompt, essay, warning);
  const pdfDataUrl = await createWritingReportPdfDataUrl(prompt, feedback);
  return addPdfDownloadUrl(
    { mode: ai ? `ai:${WRITING_AI_MODEL}` : "local", feedback, pdfDataUrl, pdfFileName: "ielts-writing-feedback.pdf", warning },
    "ielts-writing-feedback.pdf"
  );
}

async function handleWriting(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const { prompt, essay } = parseWritingPayload(payload);
  sendJson(res, 200, await buildWritingFeedbackResult(prompt, essay));
}

async function handleWritingJobStart(req, res) {
  cleanupWritingFeedbackJobs();
  const payload = JSON.parse((await readBody(req)) || "{}");
  const { prompt, essay } = parseWritingPayload(payload);
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
  buildWritingFeedbackResult(prompt, essay)
    .then((result) => {
      job.status = "done";
      job.updatedAt = Date.now();
      job.result = result;
    })
    .catch((error) => {
      job.status = "error";
      job.updatedAt = Date.now();
      job.error = error.message || "Writing feedback failed";
    });
  sendJson(res, 202, { jobId: id, status: job.status, message: "Writing feedback job started." });
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
  const audioEvidence = normalizeSpeakingAudioEvidence(payload.audioEvidence || {});
  if (!transcript) {
    sendJson(res, 400, { error: "Please complete the speaking response first." });
    return;
  }
  const evidenceSummary = [
    `Speaking topic set: ${set || "IELTS Speaking"}`,
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
  const local = [
    `Overall estimate: Band ${wordCount(transcript) > 180 ? "6.5" : "6.0"}`,
    "",
    "Local mode feedback:",
    "- Fluency and Coherence: The answer length is generally enough, but pauses and repetition should be reduced. Use linking phrases such as first, for example, and as a result.",
    "- Lexical Resource: Topic vocabulary could be more specific. Avoid repeating good, important, and interesting.",
    "- Grammatical Range and Accuracy: Use more reason clauses, relative clauses, and comparison structures.",
    audioEvidence.available
      ? "- Pronunciation: MP3 evidence was submitted, but AI audio scoring was unavailable, so this local fallback cannot fully judge pronunciation."
      : "- Pronunciation: No usable MP3 audio evidence was available, so pronunciation cannot be judged reliably in local fallback mode.",
    "",
    "Improvement points:",
    "1. Each answer should include a direct answer, a reason, an example, and an additional result.",
    "2. Use a past / present / future structure for Part 2.",
    "3. Listen back to the recording and mark repeated words and self-corrections.",
  ].join("\n");
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
      });
      audioAiUsed = Boolean(ai);
    }
  } catch (error) {
    warnings.push(error.message || "Speaking audio AI unavailable");
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
      });
    } catch (error) {
      warnings.push(error.message || "AI unavailable");
    }
  }
  const feedback = ai || local;
  sendJson(res, 200, {
    mode: ai
      ? audioAiUsed ? `ai:${SPEAKING_AUDIO_AI_MODEL}:audio` : "ai"
      : "local",
    feedback,
    band: extractSpeakingBandStable(feedback),
    warning: warnings.filter(Boolean).join("\n"),
    evidence: {
      transcript: true,
      realtimeNote: Boolean(realtimeNote),
      mp3: audioAiUsed,
      mp3Submitted: Boolean(audioEvidence.available),
      mp3Bytes: audioEvidence.available ? audioEvidence.base64Bytes : 0,
    },
  });
}

async function handleFullExam(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const listening = scoreObjective(payload.listening?.questions || [], payload.listening?.answers || {});
  const reading = scoreObjective(payload.reading?.questions || [], payload.reading?.answers || {});
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
    });
  } catch (error) {
    warning = error.message || "AI unavailable";
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

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,DELETE,HEAD,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
        "access-control-max-age": "86400",
      });
      res.end();
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
    if (req.url.startsWith("/api/auth/") || req.url === "/api/me") {
      await handleAuthApi(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/redeem") {
      await handleRedeem(req, res);
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
    if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/api/tasks")) {
      sendTasksPayload(req, res);
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
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error" });
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

server.listen(PORT, () => {
  console.log(`IELTS-ist running at http://localhost:${PORT}`);
  console.log(OPENAI_API_KEY ? `AI mode enabled with model ${MODEL}` : "Local fallback mode. Set OPENAI_API_KEY for AI feedback.");
  console.log(DASHSCOPE_API_KEY && DASHSCOPE_WORKSPACE_ID ? "Qwen realtime speaking enabled." : "Qwen realtime speaking disabled. Set DASHSCOPE_API_KEY and DASHSCOPE_WORKSPACE_ID.");
});
