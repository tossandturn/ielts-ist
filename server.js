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

loadEnvFile(path.join(__dirname, ".env.local"));
loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(__dirname, "..", ".env"));

const PORT = Number(process.env.PORT || 4321);
const PUBLIC_DIR = path.join(__dirname, "public");
const CAMBRIDGE15_DIR = process.env.CAMBRIDGE15_DIR || "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑15";
const CAMBRIDGE15_AUDIO_DIR = path.join(CAMBRIDGE15_DIR, "音频");
const CAMBRIDGE15_PDF = path.join(CAMBRIDGE15_DIR, "剑15.pdf");
const QUESTION_BANK_PATH = path.join(__dirname, "data", "cambridge15-bank.json");
const CAMBRIDGE_LOCAL_BANK_PATH = path.join(__dirname, "data", "cambridge-local-bank.json");
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || process.env.UUAPI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const VOICE_CHAT_URL = process.env.VOICE_CHAT_URL || "https://chatgpt.com/";
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
const DASHSCOPE_WORKSPACE_ID = process.env.DASHSCOPE_WORKSPACE_ID || process.env.QWEN_WORKSPACE_ID || "";
const DASHSCOPE_REGION = process.env.DASHSCOPE_REGION || "cn-beijing";
const QWEN_REALTIME_MODEL = process.env.QWEN_REALTIME_MODEL || "qwen3.5-omni-flash-realtime";
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

const speakingSets = [
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
    voiceChatUrl: VOICE_CHAT_URL,
    ttsEnabled: Boolean(FISH_API_KEY),
    recentWindow,
    writingTasks: realWritingTasks().map(slimWritingTask),
    listeningTests: realListeningTests().map(slimListeningTest),
    readingTests: realReadingTests().map(slimReadingTest),
    speakingSets,
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

function sendJson(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(value));
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
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function resolveReportFont() {
  const candidates = [
    "C:\\Windows\\Fonts\\NotoSansSC-VF.ttf",
    "C:\\Windows\\Fonts\\msyh.ttc",
    "C:\\Windows\\Fonts\\simhei.ttf",
    "C:\\Windows\\Fonts\\Deng.ttf",
  ];
  return candidates.find((file) => fs.existsSync(file)) || null;
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
                      : "application/octet-stream";
    const cacheControl = ext === ".html"
      ? "no-cache"
      : "public, max-age=31536000, immutable";
    res.writeHead(200, {
      "content-type": type,
      "content-length": data.length,
      "cache-control": cacheControl,
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(data);
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
        "cache-control": "public, max-age=3600",
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
      "cache-control": "public, max-age=3600",
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

async function callOpenAI({ system, user, temperature = 0.3 }) {
  if (!OPENAI_API_KEY) return null;
  const chatResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
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
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
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
  sendJson(res, 200, { mode: ai ? "ai" : "local", feedback, pdfDataUrl, pdfFileName: "ielts-writing-feedback.pdf", warning });
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
  sendJson(res, 200, { mode: ai ? "ai" : "local", feedback: ai || local, warning });
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
  const payload = JSON.parse((await readBody(req)) || "{}");
  const dataUrl = String(payload.dataUrl || "").trim();
  const match = dataUrl.match(/^data:([^;,]+)[^,]*;base64,(.+)$/);
  if (!match) {
    sendJson(res, 400, { error: "Recording data is invalid." });
    return;
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) {
    sendJson(res, 400, { error: "Recording is empty." });
    return;
  }
  const safeId = crypto.randomUUID();
  const inputExt = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : mime.includes("wav") ? "wav" : "webm";
  const inputPath = path.join(os.tmpdir(), `ielts-speaking-${safeId}.${inputExt}`);
  const outputPath = path.join(os.tmpdir(), `ielts-speaking-${safeId}.mp3`);
  await fs.promises.writeFile(inputPath, buffer);
  try {
    await execFilePromise("ffmpeg", ["-y", "-i", inputPath, "-vn", "-ar", "44100", "-ac", "1", "-b:a", "128k", outputPath]);
    const mp3 = await fs.promises.readFile(outputPath);
    sendJson(res, 200, {
      mode: "mp3",
      fileName: "ielts-speaking-recording.mp3",
      dataUrl: `data:audio/mpeg;base64,${mp3.toString("base64")}`,
    });
  } catch (error) {
    sendJson(res, 200, {
      mode: "original",
      fileName: `ielts-speaking-recording.${inputExt}`,
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
  sendJson(res, 200, {
    mode: ai ? "ai" : "local",
    feedback,
    pdfDataUrl,
    pdfFileName: "ielts-full-exam-report.pdf",
    listening,
    reading,
    speaking,
    warning,
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
    "Because this app may only have transcript text, state that Pronunciation confidence is limited unless audio evidence is available.",
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

async function handleWriting(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const prompt = String(payload.prompt || "").trim();
  const essay = String(payload.essay || "").trim();
  if (!prompt || !essay) {
    sendJson(res, 400, { error: "Prompt and essay are both required." });
    return;
  }
  let ai = null;
  let warning = "";
  try {
    ai = await callOpenAI({
      system: writingSystemPrompt(),
      user: `Prompt: ${prompt}\n\nStudent essay:\n${essay}`,
    });
  } catch (error) {
    warning = error.message || "AI unavailable";
  }
  const feedback = ai || localWritingFeedback(prompt, essay, warning);
  const pdfDataUrl = await createWritingReportPdfDataUrl(prompt, feedback);
  sendJson(res, 200, { mode: ai ? "ai" : "local", feedback, pdfDataUrl, pdfFileName: "ielts-writing-feedback.pdf", warning });
}

async function handleSpeaking(req, res) {
  const payload = JSON.parse((await readBody(req)) || "{}");
  const set = String(payload.set || "").trim();
  const transcript = String(payload.transcript || "").trim();
  if (!transcript) {
    sendJson(res, 400, { error: "Please complete the speaking response first." });
    return;
  }
  const local = [
    `Overall estimate: Band ${wordCount(transcript) > 180 ? "6.5" : "6.0"}`,
    "",
    "Local mode feedback:",
    "- Fluency and Coherence: The answer length is generally enough, but pauses and repetition should be reduced. Use linking phrases such as first, for example, and as a result.",
    "- Lexical Resource: Topic vocabulary could be more specific. Avoid repeating good, important, and interesting.",
    "- Grammatical Range and Accuracy: Use more reason clauses, relative clauses, and comparison structures.",
    "- Pronunciation: Only a transcript is available here, so pronunciation cannot be judged reliably. This is only a rough estimate based on transcript flow.",
    "",
    "Improvement points:",
    "1. Each answer should include a direct answer, a reason, an example, and an additional result.",
    "2. Use a past / present / future structure for Part 2.",
    "3. Listen back to the recording and mark repeated words and self-corrections.",
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
  sendJson(res, 200, { mode: ai ? "ai" : "local", feedback: ai || local, warning });
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
  sendJson(res, 200, {
    mode: ai ? "ai" : "local",
    feedback,
    pdfDataUrl,
    pdfFileName: "ielts-full-exam-report.pdf",
    listening,
    reading,
    speaking,
    warning,
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url.startsWith("/api/tasks")) {
      sendCompressedJson(req, res, 200, tasksPayload(), "private, max-age=300");
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
    if (req.url.startsWith("/api/qwen-session")) {
      await handleQwenHttpSession(req, res);
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
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

const qwenWss = new WebSocketServer({ noServer: true });
const qwenHttpSessions = new Map();

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname !== "/qwen-client") {
    socket.destroy();
    return;
  }
  qwenWss.handleUpgrade(req, socket, head, (ws) => {
    qwenWss.emit("connection", ws, req);
  });
});

qwenWss.on("connection", (client) => {
  let upstream;

  const sendClient = (message) => {
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

    if (!upstream || upstream.readyState !== WebSocket.OPEN) {
      sendClient({ type: "error", message: "Qwen realtime is not connected." });
      return;
    }

    if (event.type === "session.update") {
      upstream.send(JSON.stringify(buildQwenSessionUpdate(event)));
      return;
    }

    if (event.type === "audio.append") {
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "input_audio_buffer.append",
        audio: event.audio,
      }));
      return;
    }

    if (event.type === "audio.commit") {
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
      }));
    }
  });

  client.on("close", closeUpstream);
  client.on("error", closeUpstream);
});

function forwardQwenClientEvent(upstream, event, sendClient) {
  if (!upstream || upstream.readyState !== WebSocket.OPEN) {
    sendClient({ type: "error", message: "Qwen realtime is not connected." });
    return;
  }

  if (event.type === "session.update") {
    upstream.send(JSON.stringify(buildQwenSessionUpdate(event)));
    return;
  }

  if (event.type === "audio.append") {
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
      upstream.send(JSON.stringify({
        event_id: `event_${crypto.randomUUID()}`,
        type: "input_audio_buffer.append",
        audio,
      }));
    }
    return;
  }

  if (event.type === "audio.commit") {
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
    };
    qwenHttpSessions.set(id, session);
    const sendClient = (message) => enqueueQwenHttp(session, message);
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
    forwardQwenClientEvent(session.upstream, event, (message) => enqueueQwenHttp(session, message));
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

  upstream.on("open", () => {
    sendClient({ type: "status", status: "qwen-open", region, model });
    upstream.send(JSON.stringify(buildQwenSessionUpdate(config)));
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
    sendClient({ type: "status", status: "qwen-closed", code, reason: reason.toString("utf8") });
  });

  upstream.on("error", (error) => {
    sendClient({ type: "error", message: `Qwen realtime error: ${error.message}` });
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
