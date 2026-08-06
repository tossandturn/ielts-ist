const state = {
  data: null,
  userBank: [],
  activeModule: "listening",
  activeSingle: null,
  singleStarted: false,
  singlePracticeModes: {
    listening: "exam",
    reading: "full",
    writing: "coach",
    speaking: "diagnostic",
  },
  singlePracticeScopes: {
    listening: "paper",
    reading: "paper",
  },
  objectiveTopicSelection: {
    listening: "",
    reading: "",
  },
  singlePracticeSections: {
    listening: 1,
    reading: 1,
  },
  singleAnswers: {},
  singleAnswerItemId: "",
  readingMobilePane: "passage",
  readingQuestionType: "",
  readingReviewMarks: {},
  readingPaneScroll: { passage: 0, questionPaper: 0, answers: 0 },
  readingContextCache: {},
  latestObjectiveResults: {},
  latestObjectiveResultsByItem: {},
  latestWritingAttempt: null,
  latestSpeakingResult: null,
  speakingRetestParentAttemptId: "",
  activeSpeakingTopic: null,
  uploadWritingTasks: [],
  writingWorkspaceMode: "entry",
  writingPromptCollapsed: false,
  writingTimerStartedAt: 0,
  writingTimerElapsed: 0,
  writingTimerDuration: 60 * 60,
  writingTimerLastPersisted: -1,
  writingTimerId: null,
  writingSetupMode: "coach",
  writingActiveTaskNumber: 1,
  pendingWritingSetId: "",
  selectedWritingTask1Id: "",
  selectedWritingTask2Id: "",
  pendingWritingReviewPrompt: "",
  pendingWritingKind: "cambridge",
  speakingSetupMode: "exam",
  speakingDeviceChecked: false,
  unifiedPracticeFlows: {
    writing: { stage: "entry", mode: "coach", selectionId: "" },
    speaking: { stage: "entry", mode: "exam", selectionId: "" },
  },
  exam: null,
  sequence: null,
  examSeconds: 164 * 60,
  examTotal: 164 * 60,
  examTimerId: null,
  sequenceSeconds: 164 * 60,
  sequenceTotal: 164 * 60,
  sequenceTimerId: null,
  singleSeconds: 30 * 60,
  singleTotal: 30 * 60,
  singleTimerId: null,
  listeningScripts: {},
  listeningCaptionState: {},
  listeningTimedCaptionLoops: {},
  listeningAsr: {},
  listeningCaptionVoices: {},
  listeningCaptionHomes: {},
  listeningPlayback: {},
  recognition: null,
  recording: false,
  autoSpeaking: {},
  speakingSessions: {},
  speakingTimers: {},
  qwenSpeaking: {},
  qwenWakeLockEventsBound: false,
  qwenRuntime: null,
  qwenRuntimeLoadedAt: 0,
  authToken: "",
  currentUser: null,
  learningState: null,
  learningSyncTimer: null,
  practiceSessionCompleted: false,
  serverDrafts: [],
  vocabItems: [],
  draftSaveTimer: null,
  practiceSessionSaveTimer: null,
  practiceWritingDrafts: {},
  annotation: {
    enabled: false,
    activeCanvas: null,
    drawing: false,
    erasing: false,
    pointers: new Set(),
    pointerPositions: new Map(),
    scrollTarget: null,
    lastMultiTouchY: 0,
    lastX: 0,
    lastY: 0,
    saveTimer: null,
  },
  help: {
    stream: null,
    video: null,
    selecting: false,
    startX: 0,
    startY: 0,
    contextText: "",
    context: null,
    pendingImageDataUrl: "",
    captureMode: "explain",
    history: [],
    captureRequestId: 0,
    selectionRect: null,
    dragMode: "",
    activeHandle: "",
    originRect: null,
    surfaceOverride: null,
    binding: null,
    busy: false,
  },
  coach: {
    history: [],
    contextText: "",
    pendingImageDataUrl: "",
    lastAnswer: "",
    lastModule: "listening",
    focusQuestion: null,
    busy: false,
  },
  bankTopicPage: 1,
  bankTopicPageSize: 24,
  writingTopicPage: 1,
  writingTopicPageSize: 12,
  writingTopicCategory: "all",
  writingLibraryTaskNumber: 2,
  writingLibraryScope: "full",
  vocabularyReview: {
    page: "hub",
    index: 0,
    revealed: false,
    known: new Set(),
    subject: "all",
    topic: "all",
    type: "all",
    query: "",
    loading: false,
    loaded: false,
    error: "",
  },
};

const $ = (id) => document.getElementById(id);
const storeKey = "ieltsTrainerUserBank";
const sidebarStoreKey = "ieltsTrainerSidebarCollapsed";
const authStoreKey = "ieltsistAuthToken";
const draftStoreKey = "ieltsistDeviceDrafts";
const likedTopicStoreKey = "ieltsistLikedSpeakingTopics";
const annotationStoreKey = "ieltsistPdfAnnotations";
const weakAreaStoreKey = "ieltsistWeakAreas";
const coreVocabularyStoreKey = "ieltsistCoreVocabularyKnown";
const learningHistoryStoreKey = "ieltsistLearningLoopHistory";
const coachHistoryStoreKey = "ieltsistCoachHistoryV1";
const practiceSessionStoreKey = "ieltsistPracticeSessionV1";
const guestLearningProfileStoreKey = "ieltsistGuestLearningProfileV1";
const pendingPracticeCompletionStoreKey = "ieltsistPendingPracticeCompletionV1";
const completionStoreKey = "ieltsistCompletedItemsV1";
const pendingLearningAttemptsStoreKey = "ieltsistPendingLearningAttemptsV1";
const writingUploadSessionStoreKey = "ieltsistWritingUploadSessionV1";
const writingTimerStoreKey = "ieltsistWritingTimerV1";
const recommendationHistoryStoreKey = "ieltsistRecommendationHistoryV1";
const speakingRecentQuestionsStoreKey = "ieltsistSpeakingRecentQuestionsV1";
const listeningAudioGraphs = new WeakMap();
const listeningAsrCacheSource = "qwen-asr-live-vad-v1";
const listeningCaptionDefaultWordsPerSecond = 1.45;
const listeningCaptionLoopWarmupMs = 9000;
const ieltsCoreVocabularySeed = [
  { word: "significant", phonetic: "/sɪɡˈnɪfɪkənt/", meaning: "显著的，重要的", cn: "常用于小作文趋势和大作文观点。", example: "There was a significant increase in public transport use.", collocations: ["significant increase", "significant impact"] },
  { word: "approximately", phonetic: "/əˈprɒksɪmətli/", meaning: "大约，近似", cn: "小作文描述数字时比 about 更正式。", example: "Approximately 40% of respondents chose online shopping.", collocations: ["approximately half", "approximately 30 percent"] },
  { word: "fluctuate", phonetic: "/ˈflʌktʃueɪt/", meaning: "波动", cn: "描述图表数值上下变化。", example: "The figure fluctuated slightly throughout the period.", collocations: ["fluctuate slightly", "fluctuate dramatically"] },
  { word: "proportion", phonetic: "/prəˈpɔːʃn/", meaning: "比例", cn: "替代 percentage / share。", example: "A higher proportion of young people lived in cities.", collocations: ["a large proportion", "the proportion of"] },
  { word: "whereas", phonetic: "/ˌweərˈæz/", meaning: "然而，相比之下", cn: "用于清晰对比两个对象。", example: "Men preferred cars, whereas women chose public transport.", collocations: ["whereas others", "whereas the figure for"] },
  { word: "consequently", phonetic: "/ˈkɒnsɪkwəntli/", meaning: "因此，所以", cn: "大作文因果衔接词。", example: "Consequently, governments need to invest more in prevention.", collocations: ["consequently, this", "consequently, many"] },
  { word: "sustainable", phonetic: "/səˈsteɪnəbl/", meaning: "可持续的", cn: "环境、城市、经济类高频词。", example: "Cities should develop more sustainable transport systems.", collocations: ["sustainable development", "sustainable solution"] },
  { word: "inevitable", phonetic: "/ɪnˈevɪtəbl/", meaning: "不可避免的", cn: "科技、社会变化类常用观点词。", example: "Some level of automation is inevitable in modern workplaces.", collocations: ["almost inevitable", "an inevitable result"] },
  { word: "conventional", phonetic: "/kənˈvenʃənl/", meaning: "传统的，常规的", cn: "用于对比 traditional / modern。", example: "Online learning differs from conventional classroom teaching.", collocations: ["conventional methods", "conventional wisdom"] },
  { word: "allocate", phonetic: "/ˈæləkeɪt/", meaning: "分配，拨出", cn: "政府资金、资源分配类高频动词。", example: "The government should allocate more funds to healthcare.", collocations: ["allocate resources", "allocate funding"] },
  { word: "enhance", phonetic: "/ɪnˈhɑːns/", meaning: "提升，增强", cn: "比 improve 更正式。", example: "Public libraries can enhance children's reading habits.", collocations: ["enhance quality", "enhance performance"] },
  { word: "deteriorate", phonetic: "/dɪˈtɪəriəreɪt/", meaning: "恶化，变差", cn: "用于环境、健康、关系等主题。", example: "Air quality may deteriorate if traffic continues to rise.", collocations: ["deteriorate rapidly", "conditions deteriorate"] },
  { word: "compulsory", phonetic: "/kəmˈpʌlsəri/", meaning: "强制的，必修的", cn: "教育、政策类常见词。", example: "Some people believe physical education should be compulsory.", collocations: ["compulsory education", "compulsory subjects"] },
  { word: "subsidise", phonetic: "/ˈsʌbsɪdaɪz/", meaning: "补贴，资助", cn: "英式拼写，政府政策常用。", example: "Governments can subsidise public transport to reduce congestion.", collocations: ["subsidise transport", "subsidise healthcare"] },
  { word: "adapt", phonetic: "/əˈdæpt/", meaning: "适应，调整", cn: "工作、学习、科技变化类高频。", example: "Students need to adapt to new learning environments.", collocations: ["adapt to change", "adapt quickly"] },
  { word: "evidence", phonetic: "/ˈevɪdəns/", meaning: "证据", cn: "阅读解释和大作文论证核心词。", example: "There is little evidence that longer working hours improve productivity.", collocations: ["strong evidence", "supporting evidence"] },
  { word: "outweigh", phonetic: "/ˌaʊtˈweɪ/", meaning: "超过，胜过", cn: "利弊类作文高频结论词。", example: "The benefits of this policy outweigh its disadvantages.", collocations: ["outweigh the drawbacks", "advantages outweigh"] },
  { word: "prioritise", phonetic: "/praɪˈɒrətaɪz/", meaning: "优先考虑", cn: "政府、个人选择类高频动词。", example: "Schools should prioritise critical thinking over rote learning.", collocations: ["prioritise safety", "prioritise education"] },
  { word: "obstacle", phonetic: "/ˈɒbstəkl/", meaning: "障碍，阻碍", cn: "同义替换 problem / challenge。", example: "High cost is a major obstacle to university education.", collocations: ["major obstacle", "overcome obstacles"] },
  { word: "interpret", phonetic: "/ɪnˈtɜːprət/", meaning: "理解，解释", cn: "阅读和图表描述都常用。", example: "Students should learn how to interpret data accurately.", collocations: ["interpret data", "interpret the results"] },
];
let ieltsCoreVocabulary = ieltsCoreVocabularySeed.slice();
let ieltsCoreVocabularyLoadPromise = null;
let alevelStemVocabulary = [];
let alevelVocabularyLoadPromise = null;
const builtInPublicWritingTopics = [
  {
    id: "public-writing-practical-education-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "education",
    title: "Practical education",
    prompt: "Some people believe schools should spend more time teaching practical skills such as managing money and basic cooking. Others think schools should focus mainly on academic subjects. Discuss both views and give your own opinion.",
  },
  {
    id: "public-writing-homework-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "education",
    title: "Homework",
    prompt: "Some people think schoolchildren should receive homework every day, while others believe homework places unnecessary pressure on them. Discuss both views and give your own opinion.",
  },
  {
    id: "public-writing-university-access-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "education",
    title: "University access",
    prompt: "University education should be free for all students, regardless of their financial background. To what extent do you agree or disagree?",
  },
  {
    id: "public-writing-ai-decisions-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "technology",
    title: "AI decisions",
    prompt: "Artificial intelligence is increasingly used to make decisions in areas such as recruitment, banking and public services. Do the advantages of this development outweigh the disadvantages?",
  },
  {
    id: "public-writing-social-media-news-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "technology",
    title: "Social media news",
    prompt: "More people now get their news from social media rather than newspapers or television. Why has this happened, and is it a positive or negative development?",
  },
  {
    id: "public-writing-online-privacy-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "technology",
    title: "Online privacy",
    prompt: "Many online services collect large amounts of personal data from their users. What problems can this cause, and what measures should individuals and governments take to protect privacy?",
  },
  {
    id: "public-writing-remote-work-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "work",
    title: "Remote work",
    prompt: "Working from home is becoming common in many professions. Do the advantages of remote work for employees and employers outweigh the disadvantages?",
  },
  {
    id: "public-writing-job-satisfaction-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "work",
    title: "Job satisfaction",
    prompt: "Some people believe a high salary is the most important factor when choosing a job. Others think job satisfaction is more important. Discuss both views and give your own opinion.",
  },
  {
    id: "public-writing-retirement-age-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "work",
    title: "Retirement age",
    prompt: "As people live longer, some governments are raising the official retirement age. What are the advantages and disadvantages of this policy?",
  },
  {
    id: "public-writing-carbon-tax-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "nature",
    title: "Carbon tax",
    prompt: "The most effective way to reduce carbon emissions is to increase the cost of fuel and other forms of energy. To what extent do you agree or disagree?",
  },
  {
    id: "public-writing-wildlife-tourism-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "nature",
    title: "Wildlife tourism",
    prompt: "Tourism in areas with rare wildlife can create jobs but may also damage natural habitats. How can governments balance economic benefits with environmental protection?",
  },
  {
    id: "public-writing-recycling-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "nature",
    title: "Recycling",
    prompt: "Household recycling rates remain low in many countries. Why is this the case, and what can be done to encourage people to recycle more?",
  },
  {
    id: "public-writing-free-transport-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "place",
    title: "Free transport",
    prompt: "Public transport in large cities should be free in order to reduce traffic congestion and pollution. To what extent do you agree or disagree?",
  },
  {
    id: "public-writing-high-rise-housing-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "place",
    title: "High-rise housing",
    prompt: "In crowded cities, building high-rise apartments is the best way to solve housing shortages. What are the advantages and disadvantages of this approach?",
  },
  {
    id: "public-writing-urban-green-space-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "place",
    title: "Green spaces",
    prompt: "Some cities use valuable land for parks and public gardens, while others use it for housing and business development. Discuss both views and give your own opinion.",
  },
  {
    id: "public-writing-preventive-health-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "lifestyle",
    title: "Preventive health",
    prompt: "Governments should spend more money preventing illness through education and lifestyle programmes than treating people who are already ill. To what extent do you agree or disagree?",
  },
  {
    id: "public-writing-sugar-tax-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "lifestyle",
    title: "Sugar tax",
    prompt: "Some people think foods and drinks with high levels of sugar should be taxed to improve public health. Others believe consumers should be free to make their own choices. Discuss both views and give your own opinion.",
  },
  {
    id: "public-writing-workplace-exercise-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "lifestyle",
    title: "Workplace exercise",
    prompt: "Employers should provide time during the working day for employees to exercise. Do the advantages of this policy outweigh the disadvantages?",
  },
  {
    id: "public-writing-ageing-population-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "society",
    title: "Ageing population",
    prompt: "In many countries, the proportion of older people is increasing. What problems can this create for society, and what measures can be taken to address them?",
  },
  {
    id: "public-writing-community-service-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "society",
    title: "Community service",
    prompt: "All young people should be required to do unpaid community service for a period of time. To what extent do you agree or disagree?",
  },
  {
    id: "public-writing-crime-rehabilitation-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "society",
    title: "Rehabilitation",
    prompt: "Some people believe longer prison sentences are the best way to reduce crime. Others think education and rehabilitation are more effective. Discuss both views and give your own opinion.",
  },
  {
    id: "public-writing-free-museums-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "media",
    title: "Free museums",
    prompt: "Museums and art galleries should be free for everyone because they preserve culture and educate the public. To what extent do you agree or disagree?",
  },
  {
    id: "public-writing-local-traditions-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "media",
    title: "Local traditions",
    prompt: "Globalisation is causing many local traditions and customs to disappear. Why is this happening, and what can communities do to preserve them?",
  },
  {
    id: "public-writing-local-films-task2",
    module: "writing",
    type: "Task 2",
    minutes: 40,
    source: "Public topics",
    period: "Curated practice",
    topicCategory: "media",
    title: "Local films",
    prompt: "Governments should provide financial support for local films and music rather than allowing the entertainment market to be dominated by foreign productions. To what extent do you agree or disagree?",
  },
];
const builtInPublicSpeakingTopics = [
  {
    id: "public-speaking-work-study",
    module: "speaking",
    title: "Work / Study / Routine",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "work, study, routine",
    part1Topic: "Work or study",
    part1: ["Do you work or study?", "What do you like most about your work or studies?", "Do you prefer studying in the morning or in the evening?"],
    part2: "Describe a subject or skill you enjoyed learning. You should say what it was, where you learned it, who helped you, and explain why you enjoyed learning it.",
    part3Topics: ["education", "motivation", "future skills"],
    part3: ["What makes a subject difficult for students?", "How can teachers make lessons more practical?", "What skills will be important for young people in the future?"],
  },
  {
    id: "public-speaking-hometown",
    module: "speaking",
    title: "Hometown / City / Local Area",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "hometown, city, local area",
    part1Topic: "Hometown",
    part1: ["Where is your hometown?", "What do people usually do there at weekends?", "Has your hometown changed much in recent years?"],
    part2: "Describe an interesting place in your hometown. You should say where it is, what people can do there, how often you go there, and explain why it is interesting.",
    part3Topics: ["urban change", "community", "public facilities"],
    part3: ["Why do some people move away from their hometowns?", "What public facilities should every city have?", "How can cities preserve their local culture?"],
  },
  {
    id: "public-speaking-home",
    module: "speaking",
    title: "Home / Room / Living Place",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "home, room, living place",
    part1Topic: "Home",
    part1: ["Do you live in a house or an apartment?", "Which room do you spend the most time in?", "What would you like to change about your home?"],
    part2: "Describe a room where you feel relaxed. You should say where it is, what it looks like, what you usually do there, and explain why it helps you relax.",
    part3Topics: ["housing", "design", "living habits"],
    part3: ["What makes a home comfortable?", "Do people in your country prefer large homes?", "How might homes change in the future?"],
  },
  {
    id: "public-speaking-family-friends",
    module: "speaking",
    title: "Family / Friends / Relationships",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "family, friends, relationships",
    part1Topic: "Family and friends",
    part1: ["Do you spend more time with family or friends?", "How do you usually keep in touch with friends?", "What kind of person do you like to make friends with?"],
    part2: "Describe a person who has helped you. You should say who this person is, how you know them, what they did for you, and explain how you felt about their help.",
    part3Topics: ["friendship", "generations", "support"],
    part3: ["Why is friendship important?", "Do people make friends differently now than in the past?", "Should young people rely more on family or friends for advice?"],
  },
  {
    id: "public-speaking-daily-routine",
    module: "speaking",
    title: "Daily Routine / Time / Habits",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "daily routine, time, habits",
    part1Topic: "Daily routine",
    part1: ["What is your daily routine like?", "Are you usually busy during the week?", "What time of day do you feel most productive?"],
    part2: "Describe a useful habit you have developed. You should say what the habit is, when you started it, how it helps you, and explain why you want to keep it.",
    part3Topics: ["time management", "discipline", "modern life"],
    part3: ["Why do some people find it hard to manage time?", "Do routines make life easier or less interesting?", "How has technology changed people's daily habits?"],
  },
  {
    id: "public-speaking-hobbies",
    module: "speaking",
    title: "Hobbies / Free Time / Interests",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "hobbies, free time, interests",
    part1Topic: "Free time",
    part1: ["What do you do in your free time?", "Did you have a hobby when you were a child?", "Would you like to try a new hobby?"],
    part2: "Describe an activity you do in your free time. You should say what it is, where you do it, who you do it with, and explain why you enjoy it.",
    part3Topics: ["leisure", "stress", "work-life balance"],
    part3: ["Why do people need leisure activities?", "Are hobbies becoming more expensive?", "Should schools give students more time for hobbies?"],
  },
  {
    id: "public-speaking-travel-journey",
    module: "speaking",
    title: "Travel / City / Journey",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "travel, city, journey",
    part1Topic: "Travel",
    part1: ["Do you like travelling?", "Which city would you like to visit again?", "How do you usually plan a trip?"],
    part2: "Describe a memorable journey you took. You should say where you went, who you went with, what happened during the journey, and explain why it was memorable.",
    part3Topics: ["tourism", "local communities", "visitor limits"],
    part3: ["How has tourism changed local communities?", "What are the advantages and disadvantages of travelling abroad?", "Should popular tourist places limit visitor numbers?"],
  },
  {
    id: "public-speaking-technology-daily-life",
    module: "speaking",
    title: "Technology / Smartphone / Communication",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "technology, smartphone, communication",
    part1Topic: "Technology",
    part1: ["What technology do you use every day?", "Do you prefer texting or calling people?", "Has technology changed the way you study?"],
    part2: "Describe a piece of technology that helps you in daily life. You should say what it is, how often you use it, what you use it for, and explain why it is useful.",
    part3Topics: ["communication", "age groups", "over-reliance"],
    part3: ["How has technology changed communication?", "Do older people and young people use technology differently?", "What problems can happen when people rely too much on technology?"],
  },
  {
    id: "public-speaking-environment-recycling",
    module: "speaking",
    title: "Environment / Recycling / Pollution",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "environment, recycling, pollution",
    part1Topic: "Environment",
    part1: ["Do you try to recycle things in your daily life?", "What environmental problem is common in your city?", "Did you learn about environmental protection at school?"],
    part2: "Describe a place in your area that has been affected by pollution. You should say where it is, what kind of pollution it has, how people are affected, and explain what could be done to improve it.",
    part3Topics: ["public responsibility", "schools", "technology"],
    part3: ["Who should take more responsibility for protecting the environment, individuals or governments?", "How can schools encourage children to care about nature?", "Do you think technology can solve environmental problems?"],
  },
  {
    id: "public-speaking-food-cooking",
    module: "speaking",
    title: "Food / Cooking / Restaurants",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "food, cooking, restaurants",
    part1Topic: "Food",
    part1: ["What food do you like eating?", "Do you often cook at home?", "Do you prefer eating at home or in restaurants?"],
    part2: "Describe a meal you enjoyed. You should say what you ate, where you had it, who you were with, and explain why you enjoyed the meal.",
    part3Topics: ["healthy eating", "food culture", "restaurants"],
    part3: ["Why do people like eating out?", "How important is traditional food to a culture?", "Should schools teach children how to cook healthy meals?"],
  },
  {
    id: "public-speaking-health-fitness",
    module: "speaking",
    title: "Health / Fitness / Lifestyle",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "health, fitness, lifestyle",
    part1Topic: "Health",
    part1: ["How do you keep healthy?", "Do you think you get enough exercise?", "What healthy habit would you like to develop?"],
    part2: "Describe something you do to stay healthy. You should say what it is, how often you do it, who encouraged you to do it, and explain how it benefits you.",
    part3Topics: ["public health", "exercise", "modern lifestyle"],
    part3: ["Why are many people less active than before?", "Should governments encourage people to exercise more?", "How can companies help employees stay healthy?"],
  },
  {
    id: "public-speaking-sports",
    module: "speaking",
    title: "Sports / Games / Competition",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "sports, games, competition",
    part1Topic: "Sports",
    part1: ["Do you like playing sports?", "What sports are popular in your country?", "Did you play sports when you were a child?"],
    part2: "Describe a sport or game you enjoy watching or playing. You should say what it is, how you became interested in it, how often you do it or watch it, and explain why you enjoy it.",
    part3Topics: ["teamwork", "competition", "professional sports"],
    part3: ["What can children learn from playing team sports?", "Is competition always good for young people?", "Why do professional athletes earn high salaries?"],
  },
  {
    id: "public-speaking-music",
    module: "speaking",
    title: "Music / Concerts / Songs",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "music, concerts, songs",
    part1Topic: "Music",
    part1: ["What kind of music do you like?", "Do you often listen to music while studying or working?", "Have you ever been to a concert?"],
    part2: "Describe a song or piece of music you like. You should say what it is, when you first heard it, what it is about, and explain why you like it.",
    part3Topics: ["culture", "media", "children"],
    part3: ["Why is music important in many cultures?", "Do people listen to music differently now than in the past?", "Should children learn to play a musical instrument?"],
  },
  {
    id: "public-speaking-reading-books",
    module: "speaking",
    title: "Reading / Books / Stories",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "reading, books, stories",
    part1Topic: "Reading",
    part1: ["Do you enjoy reading?", "What kinds of books do you like?", "Do you prefer paper books or e-books?"],
    part2: "Describe a book or story that you remember well. You should say what it was about, when you read it, who recommended it, and explain why you remember it.",
    part3Topics: ["reading habits", "education", "digital media"],
    part3: ["Why do some people read less nowadays?", "How can parents encourage children to read?", "Will printed books remain popular in the future?"],
  },
  {
    id: "public-speaking-shopping",
    module: "speaking",
    title: "Shopping / Money / Online Stores",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "shopping, money, online stores",
    part1Topic: "Shopping",
    part1: ["Do you enjoy shopping?", "What do you usually buy online?", "Do you compare prices before buying things?"],
    part2: "Describe something useful you bought recently. You should say what it was, where you bought it, how much you use it, and explain why it was a good purchase.",
    part3Topics: ["consumer habits", "online shopping", "advertising"],
    part3: ["Why has online shopping become popular?", "Do advertisements influence what people buy?", "Should people be taught how to manage money at school?"],
  },
  {
    id: "public-speaking-transport",
    module: "speaking",
    title: "Transport / Commuting / Traffic",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "transport, commuting, traffic",
    part1Topic: "Transport",
    part1: ["How do you usually travel around your city?", "Do you prefer public transport or private cars?", "Is traffic a problem where you live?"],
    part2: "Describe a journey you make regularly. You should say where you go, how you travel, how long it takes, and explain how you feel about this journey.",
    part3Topics: ["public transport", "traffic", "city planning"],
    part3: ["How can cities reduce traffic congestion?", "Should public transport be cheaper?", "Will people use fewer cars in the future?"],
  },
  {
    id: "public-speaking-weather",
    module: "speaking",
    title: "Weather / Seasons / Climate",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "weather, seasons, climate",
    part1Topic: "Weather",
    part1: ["What kind of weather do you like?", "Does the weather affect your mood?", "What is the weather like in your hometown?"],
    part2: "Describe a time when the weather changed your plans. You should say what the weather was like, what you planned to do, how your plan changed, and explain how you felt.",
    part3Topics: ["climate", "work", "travel"],
    part3: ["How does weather affect people's daily lives?", "Do different jobs depend on the weather?", "How should cities prepare for extreme weather?"],
  },
  {
    id: "public-speaking-education",
    module: "speaking",
    title: "Education / Teachers / Exams",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "education, teachers, exams",
    part1Topic: "Education",
    part1: ["What was your favorite subject at school?", "Do you prefer learning alone or with others?", "Are exams useful for students?"],
    part2: "Describe a teacher who impressed you. You should say who the teacher was, what subject they taught, what they were like, and explain why they impressed you.",
    part3Topics: ["school systems", "testing", "online learning"],
    part3: ["What qualities should a good teacher have?", "Are exams the best way to measure students' ability?", "Will online learning replace traditional classrooms?"],
  },
  {
    id: "public-speaking-festivals",
    module: "speaking",
    title: "Festivals / Celebrations / Culture",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "festivals, celebrations, culture",
    part1Topic: "Festivals",
    part1: ["What festivals are important in your country?", "Do you prefer celebrating with family or friends?", "Did you enjoy festivals more when you were a child?"],
    part2: "Describe a celebration you enjoyed. You should say what the celebration was, where it took place, who was there, and explain why it was enjoyable.",
    part3Topics: ["traditions", "community", "commercialisation"],
    part3: ["Why are traditional festivals important?", "Do festivals bring people closer together?", "Have festivals become too commercial?"],
  },
  {
    id: "public-speaking-future-plans",
    module: "speaking",
    title: "Future Plans / Goals / Ambition",
    source: "Public topics",
    period: "Public examples",
    topicKeywords: "future plans, goals, ambition",
    part1Topic: "Future plans",
    part1: ["Do you often make plans for the future?", "What goal are you working towards now?", "Do you prefer short-term or long-term plans?"],
    part2: "Describe a goal you would like to achieve. You should say what the goal is, why you want to achieve it, what you need to do, and explain how you would feel if you achieved it.",
    part3Topics: ["ambition", "planning", "young people"],
    part3: ["Why do some people find it difficult to make long-term plans?", "Is ambition always a positive quality?", "How can young people choose a suitable career goal?"],
  },
];

const publicSpeakingTopicSeeds = [
  ["Friends", "👥", "people", "relationships, social, trust"],
  ["Food", "🍽️", "lifestyle", "cooking, eating, healthy"],
  ["Favourite", "💗", "lifestyle", "like, best, preferences"],
  ["Colour", "🎨", "media", "art, design, preferences"],
  ["Clothes", "👕", "lifestyle", "fashion, shopping, style"],
  ["Music", "🎵", "media", "songs, instruments, concerts"],
  ["Family", "👨‍👩‍👧", "people", "home, parents, siblings"],
  ["Travel", "✈️", "lifestyle", "trip, journey, holiday"],
  ["Sport", "🏟️", "lifestyle", "exercise, games, athletes"],
  ["Work", "💼", "work", "job, career, company"],
  ["Education", "🎓", "education", "study, school, learning"],
  ["Technology", "🖥️", "technology", "computer, internet, apps"],
  ["Health", "💗", "lifestyle", "fitness, medicine, diet"],
  ["Environment", "🌿", "nature", "nature, pollution, planet"],
  ["News", "📰", "media", "events, media, information"],
  ["Hometown", "🏠", "place", "city, village, place"],
  ["Books", "📘", "education", "reading, novels, authors"],
  ["Films", "🎬", "media", "movies, cinema, actors"],
  ["Shopping", "🛍️", "lifestyle", "mall, buying, markets"],
  ["Transport", "🚗", "place", "driving, public, vehicles"],
  ["House", "🏡", "place", "apartment, room, living"],
  ["Weather", "🌦️", "nature", "seasons, climate, temperature"],
  ["Animals", "🐾", "nature", "pets, wildlife, animals"],
  ["Celebrations", "🎁", "society", "festivals, holidays, parties"],
  ["Childhood", "🧸", "people", "memories, games, school"],
  ["Neighbours", "🏘️", "society", "community, nearby, support"],
  ["Teachers", "👩‍🏫", "education", "lessons, advice, influence"],
  ["Languages", "🗣️", "education", "English, communication, learning"],
  ["Dreams", "🌙", "lifestyle", "goals, sleep, imagination"],
  ["Gifts", "🎀", "society", "giving, receiving, occasions"],
  ["Photography", "📷", "media", "photos, memories, camera"],
  ["History", "🏛️", "education", "past, museum, culture"],
  ["Art", "🖼️", "media", "painting, galleries, creativity"],
  ["Apps", "📱", "technology", "phone, tools, online"],
  ["Museums", "🏺", "place", "exhibitions, history, learning"],
  ["Science", "🔬", "education", "research, experiments, discovery"],
  ["Sleep", "🛌", "lifestyle", "rest, dreams, routine"],
  ["Gardens", "🌷", "nature", "plants, flowers, relaxing"],
  ["Maps", "🗺️", "place", "directions, travel, location"],
  ["Money", "💳", "society", "saving, spending, budgeting"],
  ["Emails", "✉️", "technology", "messages, work, communication"],
  ["Internet", "🌐", "technology", "online, websites, information"],
  ["Media", "📺", "media", "television, news, social"],
  ["Games", "🎮", "lifestyle", "play, competition, fun"],
  ["Parks", "🌳", "place", "green space, exercise, families"],
  ["Beaches", "🏖️", "place", "sea, holiday, swimming"],
  ["Mountains", "⛰️", "nature", "hiking, scenery, adventure"],
  ["Restaurants", "🍜", "lifestyle", "service, food, friends"],
  ["Cafes", "☕", "lifestyle", "coffee, study, meeting"],
  ["Cooking", "🍳", "lifestyle", "recipes, kitchen, family"],
  ["Snacks", "🍪", "lifestyle", "taste, convenience, health"],
  ["Water", "💧", "nature", "drinking, rivers, conservation"],
  ["Flowers", "🌸", "nature", "gardens, gifts, beauty"],
  ["Trees", "🌲", "nature", "parks, shade, environment"],
  ["Libraries", "📚", "education", "books, quiet, study"],
  ["Bicycles", "🚲", "place", "cycling, transport, exercise"],
  ["Cars", "🚙", "place", "driving, traffic, safety"],
  ["Trains", "🚆", "place", "journeys, stations, public"],
  ["Planes", "🛫", "place", "flights, airports, travel"],
  ["Hotels", "🏨", "place", "travel, service, accommodation"],
  ["Tourism", "🧳", "society", "visitors, culture, economy"],
  ["Culture", "🏮", "society", "traditions, identity, values"],
  ["Volunteering", "🤝", "society", "help, community, charity"],
  ["Teamwork", "👥", "work", "cooperation, roles, success"],
  ["Leadership", "⭐", "work", "management, responsibility, decisions"],
  ["Decisions", "🧭", "society", "choices, pressure, advice"],
  ["Advice", "💬", "people", "support, experience, guidance"],
  ["Mistakes", "🧩", "education", "learning, improvement, experience"],
  ["Success", "🏆", "work", "achievement, effort, goals"],
  ["Patience", "🧘", "lifestyle", "waiting, calm, practice"],
  ["Memory", "🧠", "education", "remembering, childhood, study"],
  ["Focus", "🎯", "education", "concentration, distraction, study"],
  ["Noise", "🔊", "society", "cities, neighbours, concentration"],
  ["Crowds", "🚶", "society", "public places, events, transport"],
  ["Handwriting", "✍️", "education", "letters, school, notes"],
  ["Puzzles", "🧩", "lifestyle", "thinking, games, challenge"],
  ["Birthdays", "🎂", "society", "parties, gifts, family"],
  ["Weddings", "💍", "society", "tradition, family, celebration"],
  ["Uniforms", "🧥", "education", "school, work, identity"],
  ["Shoes", "👟", "lifestyle", "comfort, fashion, sports"],
  ["Bags", "🎒", "lifestyle", "school, travel, design"],
  ["Furniture", "🪑", "place", "home, comfort, design"],
  ["Decoration", "🖼️", "place", "style, home, festivals"],
  ["Light", "💡", "place", "home, mood, energy"],
  ["Rain", "🌧️", "nature", "weather, plans, mood"],
  ["Snow", "❄️", "nature", "winter, travel, childhood"],
  ["Summer", "☀️", "nature", "holiday, heat, activities"],
  ["Winter", "🧣", "nature", "cold, festivals, clothes"],
  ["Weekends", "📅", "lifestyle", "relaxing, friends, plans"],
  ["Mornings", "🌅", "lifestyle", "routine, energy, breakfast"],
  ["Evenings", "🌆", "lifestyle", "relaxing, dinner, study"],
  ["Holidays", "🏝️", "lifestyle", "travel, rest, family"],
  ["Jobs", "🧑‍💼", "work", "career, salary, skills"],
  ["Salaries", "💰", "work", "money, motivation, fairness"],
  ["Interviews", "🎙️", "work", "jobs, confidence, questions"],
  ["Office", "🏢", "work", "colleagues, meetings, routine"],
  ["School", "🏫", "education", "classes, teachers, friends"],
  ["University", "🎓", "education", "major, campus, future"],
  ["Exams", "📝", "education", "pressure, preparation, results"],
  ["Robots", "🤖", "technology", "automation, future, jobs"],
  ["Privacy", "🔒", "technology", "data, internet, safety"],
  ["Advertising", "📣", "media", "shopping, brands, influence"],
  ["Influencers", "📲", "media", "social media, fame, trust"],
  ["Newspapers", "🗞️", "media", "news, reading, information"],
  ["Television", "📺", "media", "programmes, family, entertainment"],
  ["Podcasts", "🎧", "media", "listening, stories, learning"],
  ["Concerts", "🎤", "media", "music, crowds, performance"],
  ["Dancing", "💃", "media", "music, exercise, culture"],
  ["Singing", "🎙️", "media", "songs, confidence, performance"],
  ["Painting", "🖌️", "media", "art, creativity, colour"],
  ["Writing", "✒️", "education", "stories, notes, expression"],
  ["Poetry", "📜", "media", "language, emotion, culture"],
  ["Fashion", "👗", "lifestyle", "clothes, trends, identity"],
  ["Beauty", "💄", "lifestyle", "appearance, confidence, media"],
  ["Exercise", "🏃", "lifestyle", "fitness, health, routine"],
  ["Doctors", "🩺", "society", "healthcare, advice, hospitals"],
  ["Safety", "🛡️", "society", "rules, cities, children"],
  ["Rules", "📏", "society", "school, work, fairness"],
  ["Queues", "🧍", "society", "waiting, public, patience"],
  ["Promises", "🤞", "people", "trust, responsibility, friendship"],
  ["Apologies", "🙏", "people", "mistakes, manners, relationships"],
  ["Creativity", "✨", "education", "ideas, art, problem-solving"],
  ["Innovation", "🚀", "technology", "ideas, business, future"],
  ["Energy", "⚡", "nature", "electricity, conservation, future"],
  ["Space", "🪐", "science", "planets, exploration, future"],
  ["Farming", "🌾", "nature", "food, countryside, technology"],
  ["Markets", "🏪", "society", "shopping, local, bargaining"],
  ["Banks", "🏦", "society", "money, saving, service"],
  ["Police", "🚓", "society", "safety, law, community"],
  ["Hospitals", "🏥", "society", "health, doctors, public"],
  ["Bridges", "🌉", "place", "cities, transport, design"],
  ["Rivers", "🏞️", "nature", "water, cities, pollution"],
  ["Lakes", "🚣", "nature", "relaxing, scenery, sports"],
  ["Villages", "🏘️", "place", "countryside, community, quiet"],
  ["Cities", "🌆", "place", "traffic, jobs, buildings"],
  ["Teenagers", "🧑", "people", "school, friends, independence"],
  ["Parents", "👪", "people", "support, rules, advice"],
  ["Children", "🧒", "people", "games, learning, family"],
  ["Elders", "🧓", "people", "experience, respect, support"],
];

function slugifyPublicTopic(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicTopicOneWord(value) {
  const first = String(value || "Speaking").split(/\s*[·|:/|,-]\s*|\s+/).find(Boolean) || "Speaking";
  return first.slice(0, 1).toUpperCase() + first.slice(1, 24);
}

function generatePublicSpeakingTopics() {
  const existing = new Set(builtInPublicSpeakingTopics.map((item) => publicTopicOneWord(item.displayTitle || item.title || item.part1Topic).toLowerCase()));
  const seen = new Set(existing);
  return publicSpeakingTopicSeeds.filter(([title]) => {
    const key = publicTopicOneWord(title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(([title, emoji, category, keywordText], index) => {
    const keywords = keywordText.split(",").map((item) => item.trim()).filter(Boolean);
    const lower = title.toLowerCase();
    return {
      id: `public-speaking-expanded-${slugifyPublicTopic(title)}`,
      module: "speaking",
      title,
      displayTitle: title,
      emoji,
      category,
      source: "Public topics",
      period: "Public topics",
      topicKeywords: keywords.join(", "),
      popularity: publicSpeakingTopicSeeds.length - index,
      part1Topic: title,
      part1: [
        `Do you often talk about ${lower}?`,
        `Was ${lower} important to you when you were younger?`,
        `Would you like to learn more about ${lower} in the future?`,
      ],
      part2: `Describe something related to ${lower}. You should say what it is, when you first became interested in it, who you usually talk about it with, and explain why this topic is important or interesting to you.`,
      part3Topics: keywords,
      part3: [
        `How has modern life changed people's attitude towards ${lower}?`,
        `Do young people and older people think differently about ${lower}?`,
        `What problems or benefits can ${lower} bring to society?`,
      ],
    };
  });
}

const expandedPublicSpeakingTopics = generatePublicSpeakingTopics();

const speakingTopicCatalog = [
  ["Friends", "👥", "people", ["friends", "friendship", "relationships", "social", "important friends"], ["relationships", "trust", "social"]],
  ["Family", "👨‍👩‍👧", "people", ["family", "parents", "siblings", "children", "relatives"], ["parents", "siblings", "home"]],
  ["Teachers", "👩‍🏫", "education", ["teacher", "teachers", "tutor", "education influence"], ["lessons", "advice", "influence"]],
  ["People", "🧑", "people", ["person", "people", "someone", "famous person", "old person", "teenagers", "elders"], ["personality", "experience", "support"]],
  ["Hometown", "🏠", "place", ["hometown", "local area", "where you live"], ["city", "local area", "community"]],
  ["Home", "🏡", "place", ["home", "room", "living place", "apartment", "house"], ["room", "living place", "comfort"]],
  ["Place", "📍", "place", ["place", "historic place", "interesting place", "quiet place", "public place", "building", "park"], ["location", "public", "visit"]],
  ["Cities", "🌆", "place", ["city", "cities", "urban", "buildings", "architecture"], ["traffic", "jobs", "buildings"]],
  ["Travel", "✈️", "lifestyle", ["travel", "journey", "trip", "plane", "tourism", "holiday abroad"], ["journey", "tourism", "holiday"]],
  ["Transport", "🚗", "place", ["transport", "traffic", "commuting", "bus", "train", "car", "bicycle"], ["public", "vehicles", "traffic"]],
  ["Food", "🍽️", "lifestyle", ["food", "meal", "cooking", "restaurant", "snack", "cafe"], ["cooking", "restaurants", "healthy"]],
  ["Health", "💗", "lifestyle", ["health", "fitness", "exercise", "doctor", "hospital", "diet"], ["fitness", "medicine", "diet"]],
  ["Sport", "🏟️", "lifestyle", ["sport", "sports", "game", "competition", "athlete"], ["games", "competition", "teamwork"]],
  ["Routine", "📅", "lifestyle", ["daily routine", "routine", "time", "habit", "weekday", "morning", "evening"], ["time", "habits", "schedule"]],
  ["Hobbies", "🎯", "lifestyle", ["hobby", "hobbies", "free time", "leisure", "interest"], ["free time", "interests", "relaxing"]],
  ["Shopping", "🛍️", "lifestyle", ["shopping", "market", "buying", "online stores", "clothes", "fashion"], ["buying", "markets", "style"]],
  ["Money", "💳", "society", ["money", "salary", "bank", "saving", "spending", "bills"], ["saving", "spending", "budgeting"]],
  ["Work", "💼", "work", ["work study routine", "work study", "work or study", "work", "job", "career", "office", "company", "interview"], ["job", "career", "company"]],
  ["Study", "🎓", "education", ["study", "school", "university", "subject", "student"], ["school", "learning", "subject"]],
  ["Exams", "📝", "education", ["exam", "exams", "test", "homework", "marks"], ["pressure", "preparation", "results"]],
  ["Books", "📘", "education", ["reading", "book", "books", "story", "novel", "library"], ["reading", "novels", "authors"]],
  ["Languages", "🗣️", "education", ["language", "languages", "english", "communication"], ["English", "communication", "learning"]],
  ["Technology", "🖥️", "technology", ["technology", "computer", "internet", "smartphone", "phone", "app", "digital"], ["computer", "internet", "apps"]],
  ["Internet", "🌐", "technology", ["internet", "online", "website", "websites", "social media"], ["online", "websites", "information"]],
  ["Robots", "🤖", "technology", ["robot", "robots", "automation", "ai", "artificial intelligence"], ["automation", "future", "jobs"]],
  ["Privacy", "🔒", "technology", ["privacy", "data", "security", "password"], ["data", "internet", "safety"]],
  ["Music", "🎵", "media", ["music", "song", "songs", "concert", "instrument", "singing"], ["songs", "instruments", "concerts"]],
  ["Films", "🎬", "media", ["film", "films", "movie", "movies", "cinema", "tv programme", "television"], ["movies", "cinema", "actors"]],
  ["News", "📰", "media", ["news", "newspaper", "media", "information", "current events"], ["events", "media", "information"]],
  ["Art", "🖼️", "media", ["art", "painting", "drawing", "gallery", "museum", "creative"], ["painting", "galleries", "creativity"]],
  ["Photography", "📷", "media", ["photo", "photos", "photography", "camera", "picture"], ["photos", "memories", "camera"]],
  ["Environment", "🌿", "nature", ["environment", "pollution", "recycling", "climate", "planet"], ["recycling", "pollution", "planet"]],
  ["Weather", "🌦️", "nature", ["weather", "season", "seasons", "rain", "snow", "summer", "winter"], ["seasons", "climate", "temperature"]],
  ["Animals", "🐾", "nature", ["animal", "animals", "pet", "pets", "wildlife"], ["pets", "wildlife", "animals"]],
  ["Nature", "🌳", "nature", ["nature", "garden", "flowers", "trees", "river", "lake", "mountain", "beach"], ["plants", "scenery", "relaxing"]],
  ["Science", "🔬", "education", ["science", "research", "experiment", "space", "farming"], ["research", "experiments", "discovery"]],
  ["Festivals", "🎁", "society", ["festival", "festivals", "celebration", "celebrations", "holiday", "birthday", "wedding"], ["festivals", "holidays", "parties"]],
  ["Culture", "🏮", "society", ["culture", "tradition", "traditions", "history", "museum"], ["traditions", "identity", "values"]],
  ["Society", "🌍", "society", ["society", "community", "government", "rules", "safety", "police"], ["community", "rules", "public"]],
  ["Plans", "🧭", "society", ["future plans", "plans", "goals", "ambition", "success", "decision"], ["goals", "choices", "future"]],
  ["Gifts", "🎀", "society", ["gift", "gifts", "present", "presents"], ["giving", "receiving", "occasions"]],
  ["Fashion", "👗", "lifestyle", ["fashion", "beauty", "appearance", "shoes", "bags", "uniforms"], ["clothes", "trends", "identity"]],
  ["Sleep", "🛌", "lifestyle", ["sleep", "dreams", "rest"], ["rest", "dreams", "routine"]],
  ["Memory", "🧠", "education", ["memory", "memories", "remember", "childhood"], ["remembering", "childhood", "study"]],
  ["Communication", "💬", "people", ["communication", "email", "messages", "advice", "apologies", "promises"], ["messages", "support", "manners"]],
];

function topicRegex(value) {
  const escaped = String(value || "")
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, "i");
}

function deriveSpeakingTopicMeta(item) {
  if (item.displayTitle && item.emoji) {
    return {
      title: publicTopicOneWord(item.displayTitle),
      emoji: item.emoji,
      category: item.category || "lifestyle",
      related: explicitTopicKeywords(item).slice(0, 3),
    };
  }
  const compact = (value) => compactDialogueText(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const primaryFields = [
    item.displayTitle,
    item.part1Topic,
    isPublicSpeakingTopic(item) ? item.title : "",
    item.topicKeywords,
    item.keywords,
  ].filter(Boolean).map(compact);
  const secondaryFields = [
    item.title,
    item.part2,
    Array.isArray(item.part1) ? item.part1.join(" ") : item.part1,
    Array.isArray(item.part3Topics) ? item.part3Topics.join(" ") : item.part3Topics,
    Array.isArray(item.part3) ? item.part3.join(" ") : item.part3,
  ].filter(Boolean).map(compact);
  const findMatch = (text) => {
    let best = null;
    speakingTopicCatalog.forEach((entry, index) => {
      const aliases = entry[3] || [];
      aliases.forEach((alias) => {
        if (!topicRegex(alias).test(text)) return;
        const score = String(alias).length * 1000 - index;
        if (!best || score > best.score) best = { entry, score };
      });
    });
    return best?.entry || null;
  };
  const matched = primaryFields.map(findMatch).find(Boolean) || secondaryFields.map(findMatch).find(Boolean);
  if (matched) {
    const [title, emoji, category, , related] = matched;
    return { title, emoji, category, related };
  }
  const fallbackTitle = publicTopicOneWord(item.displayTitle || item.part1Topic || item.title || "Speaking");
  const fallbackCategory = item.category || "lifestyle";
  const fallbackEmoji = {
    people: "👥",
    place: "📍",
    lifestyle: "✨",
    education: "🎓",
    technology: "🖥️",
    media: "🎵",
    nature: "🌿",
    work: "💼",
    society: "🌍",
  }[fallbackCategory] || "✨";
  return { title: fallbackTitle, emoji: fallbackEmoji, category: fallbackCategory, related: explicitTopicKeywords(item).slice(0, 3) };
}

function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function setFeedback(id, text, modeId, mode) {
  const node = $(id);
  node.textContent = text || "";
  node.classList.toggle("empty", !text);
  if (modeId) $(modeId).textContent = mode ? String(mode).toUpperCase() : "";
}

function setFeedbackHtml(id, html, modeId, mode) {
  const node = $(id);
  node.innerHTML = html || "";
  node.classList.toggle("empty", !html);
  bindSpeakingResultActions(node);
  bindWritingResultActions(node);
  bindUnifiedResultTabs(node);
  bindObjectiveReviewActions(node);
  document.body.classList.toggle("speaking-result-page-visible", Boolean(document.querySelector(".speaking-result-page")));
  if (node.querySelector(".writing-result-page")) {
    setUnifiedPracticeStage("writing", "result");
    setTimeout(() => node.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }
  if (node.querySelector(".speaking-result-page")) setUnifiedPracticeStage("speaking", "result");
  if (modeId) $(modeId).textContent = mode ? String(mode).toUpperCase() : "";
}

function bindUnifiedResultTabs(root = document) {
  root.querySelectorAll?.(".unified-result-shell").forEach((shell) => {
    shell.querySelectorAll("[data-result-tab]").forEach((button) => {
      if (button.dataset.resultTabBound === "1") return;
      button.dataset.resultTabBound = "1";
      button.addEventListener("click", () => {
        const tab = button.dataset.resultTab;
        shell.querySelectorAll("[data-result-tab]").forEach((item) => {
          const active = item.dataset.resultTab === tab;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
        shell.querySelectorAll("[data-result-panel]").forEach((panel) => { panel.hidden = panel.dataset.resultPanel !== tab; });
      });
    });
  });
}

function clearSingleFeedback() {
  setFeedback("singleFeedback", "After you submit a single module, the score will appear here.", "singleMode", "");
}

function readLocalDrafts() {
  try {
    return JSON.parse(localStorage.getItem(draftStoreKey) || "[]");
  } catch {
    return [];
  }
}

function writeLocalDrafts(drafts) {
  localStorage.setItem(draftStoreKey, JSON.stringify(drafts.slice(0, 80)));
}

function upsertLocalDraft(draft) {
  const drafts = readLocalDrafts().filter((item) => item.key !== draft.key);
  drafts.unshift(draft);
  writeLocalDrafts(drafts);
}

function authHeaders() {
  return state.authToken ? { authorization: `Bearer ${state.authToken}` } : {};
}

function membershipLabel(user = state.currentUser) {
  const membership = user?.membership;
  if (!membership?.expiresAt) return "Free account";
  const date = new Date(membership.expiresAt);
  return `${membership.plan || "member"} · ${membership.active ? "active until" : "expired"} ${date.toLocaleDateString()}`;
}

function membershipPlanTitle(user = state.currentUser) {
  const membership = user?.membership;
  if (!membership?.active || !membership?.expiresAt) return "Free Plan";
  const plan = String(membership.plan || "member").trim();
  if (!plan) return "Premium Plan";
  return `${plan.slice(0, 1).toUpperCase()}${plan.slice(1)} Plan`;
}

function membershipExpiryTitle(user = state.currentUser) {
  const membership = user?.membership;
  if (!membership?.expiresAt) return "Upgrade to unlock all premium features.";
  const date = new Date(membership.expiresAt);
  if (Number.isNaN(date.getTime())) return "Membership date unavailable.";
  const prefix = membership.active ? "Plan valid until" : "Plan expired on";
  return `${prefix} ${date.toLocaleDateString()}`;
}

function uniqueDrafts(drafts) {
  const seen = new Set();
  return drafts.filter((draft) => {
    const key = draft.key || draft.draft_key || `${draft.title || "draft"}:${draft.updatedAt || draft.updated_at || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function updateUserChrome() {
  const avatar = $("brandAvatar");
  const info = $("brandUserInfo");
  const sidebarAvatar = $("sidebarAccountAvatar");
  const sidebarName = $("sidebarAccountName");
  const sidebarPlan = $("sidebarAccountPlan");
  const user = state.currentUser;
  const avatarText = user?.username ? user.username.slice(0, 1).toUpperCase() : "I";
  if (avatar) {
    avatar.textContent = avatarText;
    avatar.style.backgroundImage = user?.avatarDataUrl ? `url("${user.avatarDataUrl}")` : "";
    avatar.classList.toggle("has-avatar", Boolean(user?.avatarDataUrl));
  }
  if (info) info.textContent = user ? `${user.username} · ${membershipLabel(user)}` : "Cambridge IELTS practice / single modules / writing feedback";
  if (sidebarAvatar) {
    sidebarAvatar.textContent = avatarText;
    sidebarAvatar.style.backgroundImage = user?.avatarDataUrl ? `url("${user.avatarDataUrl}")` : "";
    sidebarAvatar.classList.toggle("has-avatar", Boolean(user?.avatarDataUrl));
  }
  if (sidebarName) sidebarName.textContent = user?.username || "Guest";
  if (sidebarPlan) sidebarPlan.textContent = user ? membershipLabel(user) : "Login / register";
}

async function refreshMineData() {
  const authToken = state.authToken;
  const ownerIdentityAtStart = practiceCompletionIdentityKey();
  const ownerWasKnownAtStart = Boolean(state.currentUser?.id || state.currentUser?.username);
  if (!authToken) {
    state.serverDrafts = [];
    state.vocabItems = [];
    state.learningState = null;
    renderMine();
    renderDashboard();
    renderSubscription();
    renderCoach();
    return;
  }
  try {
    const me = await getJson("/api/me", { authToken });
    if (state.authToken !== authToken || (ownerWasKnownAtStart && practiceCompletionIdentityKey() !== ownerIdentityAtStart)) return;
    const responseIdentity = practiceCompletionIdentityForUser(me.user);
    if (ownerWasKnownAtStart && responseIdentity !== ownerIdentityAtStart) return;
    const ownerIdentity = ownerWasKnownAtStart ? ownerIdentityAtStart : responseIdentity;
    state.currentUser = me.user || null;
    if (!completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return;
    await retryPendingPracticeCompletion({ ownerIdentity, authToken });
    if (!completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return;
    await retryPendingLearningAttempts({ ownerIdentity, authToken });
    if (!completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return;
    const [drafts, vocab, learning] = await Promise.all([
      getJson("/api/drafts", { authToken }),
      getJson("/api/vocabulary", { authToken }),
      getJson("/api/learning/state", { authToken }),
    ]);
    if (!completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return;
    state.serverDrafts = drafts.drafts || [];
    state.vocabItems = vocab.items || [];
    state.learningState = learning ? { ...learning, completionIdentity: ownerIdentity } : null;
    if (!readPendingPracticeCompletion()) importRemotePracticeSession(learning.activeSession);
  } catch (error) {
    if (state.authToken === authToken && /log in|expired|401/i.test(error.message)) {
      state.authToken = "";
      state.currentUser = null;
      localStorage.removeItem(authStoreKey);
    }
  }
  updateUserChrome();
  renderMine();
  renderDashboard();
  renderSubscription();
  renderCoach();
}

function dashboardModuleTotal(moduleName) {
  try {
    if (moduleName === "writing") return pairedWritingSets(mergedItems("writing")).length;
    return mergedItems(moduleName).length;
  } catch {
    return 0;
  }
}

function dashboardCompleteTestsTotal() {
  try {
    return completeCambridgeExamSets(mergedItems("listening"), mergedItems("reading"), mergedItems("writing")).length;
  } catch {
    return 0;
  }
}

function renderDashboardMetric(label, value, detail) {
  return `<article class="dashboard-metric">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(String(value))}</strong>
    <em>${escapeHtml(detail)}</em>
  </article>`;
}

function renderDashboardTaskCard(task) {
  const moduleName = task.module || "practice";
  const total = dashboardModuleTotal(moduleName);
  const action = task.action || `module:${moduleName}`;
  const totalLabel = task.totalLabel || `${String(total)} sets available`;
  const icons = { listening: "🎧", reading: "📖", writing: "✍️", speaking: "🎙️", exam: "🧪", mock: "🧪" };
  const icon = task.icon || icons[moduleName] || "✨";
  return `<article class="dashboard-task-card accent-${escapeHtml(task.accent || "blue")}">
    <div class="dashboard-task-icon" aria-hidden="true">${escapeHtml(icon)}</div>
    <div>
      <span>${escapeHtml(task.kicker || moduleName.toUpperCase())}</span>
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(compactText(task.text, 82))}</p>
    </div>
    <div class="dashboard-card-foot">
      <small>${escapeHtml(totalLabel)}</small>
      <button class="primary small-button" type="button" data-home-action="${escapeHtml(action)}">${escapeHtml(task.actionLabel || "Start")}</button>
    </div>
  </article>`;
}

function renderWeakSkillChip(label, score, target, tone) {
  const numericScore = Number.parseFloat(score);
  const percent = Number.isFinite(numericScore) ? Math.max(8, Math.min(100, Math.round((numericScore / 9) * 100))) : 8;
  return `<div class="dashboard-weak-chip tone-${escapeHtml(tone)}">
    <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(Number.isFinite(numericScore) ? String(score) : "--")}</strong></div>
    <i><b style="width:${percent}%"></b></i>
    <em>Target ${escapeHtml(String(target))}</em>
  </div>`;
}

function estimatePracticeMinutes(moduleName) {
  return {
    listening: "12 min",
    reading: "15 min",
    writing: "40 min",
    speaking: "15 min",
    exam: "164 min",
    coach: "5 min",
  }[moduleName] || "15 min";
}

function latestSpeakingCriteriaForDashboard() {
  const outputs = ["singleFeedback", "examFeedback", "sequenceFeedback", "bankFeedback"]
    .map((id) => $(id)?.textContent || "")
    .filter(Boolean);
  for (const text of outputs) {
    const criteria = extractSpeakingCriterionScores(text);
    if (criteria.length) return criteria;
  }
  return [];
}

function dashboardSignalSummary() {
  const drafts = uniqueDrafts([...(state.serverDrafts || []), ...readLocalDrafts()]);
  const weakAreas = [...(state.learningState?.weakAreas || []), ...readWeakAreas()]
    .filter((item) => !item.status || item.status === "active")
    .filter((item, index, values) => values.findIndex((candidate) => (candidate.id || candidate.summary) === (item.id || item.summary)) === index);
  const history = readLearningLoopHistory();
  const remoteSpeaking = (state.learningState?.attempts || []).find((attempt) => attempt.module === "speaking") || null;
  const speakingBand = latestSpeakingBandForCoach() || normalizeSpeakingBand(history.speaking?.band) || normalizeSpeakingBand(remoteSpeaking?.score?.band) || "";
  const speakingCriteria = latestSpeakingCriteriaForDashboard().length
    ? latestSpeakingCriteriaForDashboard()
    : (history.speaking?.criteria || []);
  const vocabCount = (state.vocabItems || []).length;
  const writingDrafts = drafts.filter((draft) => /writing/i.test(`${draft.module || ""} ${draft.title || ""}`));
  const objectiveResults = Object.values(history.objective || {}).filter(Boolean);
  const latestObjective = objectiveResults.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
  return {
    drafts,
    draftCount: drafts.length,
    weakAreas,
    speakingBand,
    speakingCriteria,
    vocabCount,
    writingDrafts,
    latestObjective,
    writingResult: history.writing || null,
    speakingResult: history.speaking || null,
    hasEvidence: Boolean(weakAreas.length || speakingBand || speakingCriteria.length || writingDrafts.length || vocabCount || latestObjective || history.writing),
  };
}

function lowestSpeakingCriterion(criteria) {
  return criteria.reduce((lowest, item) => {
    const score = Number.parseFloat(item.score);
    if (!Number.isFinite(score)) return lowest;
    if (!lowest || score < Number.parseFloat(lowest.score)) return item;
    return lowest;
  }, null);
}

function optionTask(moduleName, title, text, accent, actionLabel, action = `module:${moduleName}`) {
  return { module: moduleName, title, text, accent, actionLabel, action };
}

function diagnosticPracticePlan(signals) {
  return {
    mode: "diagnostic",
    sourceLabel: "Diagnostic needed",
    title: "Choose your first diagnostic",
    subtitle: "Pick the skill you want to diagnose first. IELTSist does not have enough evidence to rank your skills yet.",
    why: "No completed attempt, verified weak area or criterion score is available yet, so IELTSist will not invent a weakest skill.",
    estimate: "8-15 min",
    output: "First verified score + next practice reason",
    module: "coach",
    primaryAction: "coach-diagnostic",
    primaryLabel: "Choose diagnostic",
    secondaryAction: "coach",
    secondaryLabel: "Ask AI Coach",
    focusTitle: "Diagnostic practice",
    band: { value: "--", detail: "Run a diagnostic to calculate.", target: "7.5", percent: 8 },
    coachReason: {
      title: "AI Coach needs evidence",
      text: "Choose Listening with AI, Reading with AI, Writing with AI or Speaking with AI. After one real attempt, AI Coach can explain the result and create a traceable retest.",
      evidence: ["No score yet", `${signals.draftCount} drafts`, `${signals.vocabCount} saved notes`],
    },
    weakSkills: [],
    options: [
      optionTask("listening", "Quick listening drill", "Catch plural and number traps.", "blue", "Start drill"),
      optionTask("reading", "Reading evidence practice", "Explain one answer with text evidence.", "green", "Read paper"),
      optionTask("writing", "Writing with AI", "Pick a Cambridge set or paste your own task.", "purple", "Start writing", "writing-upload"),
      { module: "exam", kicker: "MOCK", title: "Full mock exam", text: "Generate a complete timed paper.", accent: "pink", actionLabel: "Generate", action: "exam", totalLabel: "Full test mode" },
    ],
    recommendations: [
      ["Choose a diagnostic skill", "Start with the skill you want measured first; IELTSist will not assume a weakest skill without evidence."],
      ["Attach a screenshot to AI Coach", "Ask why a reading or listening answer is correct and save the rule."],
      ["Grade one Task 2 essay", "Writing feedback gives IELTSist another signal for your plan."],
    ],
  };
}

function buildTodayPracticePlan() {
  const signals = dashboardSignalSummary();
  const plan = diagnosticPracticePlan(signals);
  const target = Number(state.learningState?.profile?.targetBand) || 7.5;
  const remotePlan = state.learningState?.todayPlan;
  if (remotePlan?.kind === "resume" && remotePlan.task?.module) {
    const moduleName = remotePlan.task.module;
    const moduleLabel = moduleDisplayName(moduleName);
    return {
      ...plan,
      mode: "server-resume",
      sourceLabel: "Saved session",
      title: `Continue ${moduleLabel} practice`,
      subtitle: "Resume the exact paper, answers and position saved from your last device.",
      why: remotePlan.reason?.text || "An unfinished practice session is available.",
      estimate: estimatePracticeMinutes(moduleName),
      output: "Completed attempt + AI feedback + next retest",
      module: moduleName,
      primaryAction: "resume-practice",
      primaryLabel: "Continue practice",
      focusTitle: `${moduleLabel} resume`,
      coachReason: {
        title: "Recommended from an unfinished session",
        text: remotePlan.reason?.text || "IELTSist saved this session before you left.",
        evidence: remotePlan.reason?.sourceIds || [],
      },
    };
  }
  if (remotePlan?.kind === "retest" && remotePlan.task?.module) {
    const moduleName = remotePlan.task.module;
    const moduleLabel = moduleDisplayName(moduleName);
    return {
      ...plan,
      mode: "server-retest",
      sourceLabel: `Rules ${remotePlan.algorithmVersion || "v1"}`,
      title: `${moduleLabel} weak-area retest`,
      subtitle: "Resolve an unfinished weak area before opening a new task.",
      why: remotePlan.reason?.text || "A verified weak area is still active.",
      estimate: estimatePracticeMinutes(moduleName),
      output: "Retest comparison + weak-area status update",
      module: moduleName,
      primaryAction: moduleName === "speaking" ? "bank" : `review:${moduleName}`,
      primaryLabel: `Retest ${moduleLabel}`,
      focusTitle: `${moduleLabel} retest`,
      coachReason: {
        title: "Recommended from an unresolved weak area",
        text: remotePlan.reason?.text || "This recommendation is linked to a saved attempt.",
        evidence: remotePlan.reason?.sourceIds || [],
      },
    };
  }
  if (remotePlan?.kind === "practice" && remotePlan.task?.module) {
    const moduleName = remotePlan.task.module;
    const moduleLabel = moduleDisplayName(moduleName);
    const itemId = encodeURIComponent(remotePlan.task.itemId || "");
    const taskMode = encodeURIComponent(remotePlan.task.mode || "");
    return {
      ...plan,
      mode: "server-practice",
      sourceLabel: `Rules ${remotePlan.algorithmVersion || "v1"}`,
      title: `${moduleLabel} follow-up practice`,
      subtitle: "Compare a new attempt with your latest saved result.",
      why: remotePlan.reason?.text || `Your latest saved attempt was ${moduleLabel}.`,
      estimate: estimatePracticeMinutes(moduleName),
      output: "New result + comparison + next retest",
      module: moduleName,
      primaryAction: `recommended:${moduleName}:${itemId}:${taskMode}`,
      primaryLabel: `Start ${moduleLabel}`,
      focusTitle: `${moduleLabel} follow-up`,
      coachReason: {
        title: "Recommended from your latest attempt",
        text: remotePlan.reason?.text || "Repeat the same skill to measure whether it improved.",
        evidence: remotePlan.reason?.sourceIds || [],
      },
    };
  }
  const speakingScore = Number.parseFloat(signals.speakingBand);
  const weakestCriterion = lowestSpeakingCriterion(signals.speakingCriteria);
  const firstWeakArea = signals.weakAreas[0] || null;

  if (firstWeakArea) {
    const moduleName = ["listening", "reading", "writing", "speaking"].includes(firstWeakArea.module) ? firstWeakArea.module : "speaking";
    const moduleLabel = moduleDisplayName(moduleName);
    return {
      ...plan,
      mode: "weak-area",
      sourceLabel: "Saved weak area",
      title: `${moduleLabel} weak-area retest`,
      subtitle: "Retest the mistake that AI Coach already saved.",
      why: compactText(firstWeakArea.summary || `A ${moduleLabel.toLowerCase()} weak area was saved from your last AI explanation.`, 180),
      estimate: estimatePracticeMinutes(moduleName),
      output: "Retest result + updated weak-area note",
      module: moduleName,
      primaryAction: moduleName === "speaking" ? "bank" : `module:${moduleName}`,
      primaryLabel: `Retest ${moduleLabel}`,
      focusTitle: `${moduleLabel} retest`,
      band: { value: signals.speakingBand || "--", detail: signals.speakingBand ? `Speaking Band ${signals.speakingBand}` : "Weak area saved by AI Coach.", target: String(target), percent: Number.isFinite(speakingScore) ? Math.round((speakingScore / 9) * 100) : 8 },
      weakAreaNote: {
        title: firstWeakArea.title || `${moduleLabel} weak area`,
        module: moduleName,
        summary: compactText(firstWeakArea.summary || `Retest this saved ${moduleLabel.toLowerCase()} weak area.`, 220),
        createdAt: firstWeakArea.createdAt || "",
      },
      coachReason: {
        title: "AI Coach found a weak area",
        text: compactText(firstWeakArea.summary || "This task comes from a saved weak-area note.", 220),
        evidence: [firstWeakArea.title || moduleLabel, firstWeakArea.module || "practice", firstWeakArea.createdAt ? new Date(firstWeakArea.createdAt).toLocaleDateString() : "saved"],
      },
      weakSkills: signals.speakingCriteria,
      recommendations: [
        [`Retest ${moduleLabel}`, "Use the saved weak-area note as the first task today."],
        ["Ask AI Coach for evidence", "If the answer still feels unclear, attach the question screenshot."],
        ["Save one rule", "Turn the explanation into a vocabulary or weak-area note."],
      ],
    };
  }

  if (Number.isFinite(speakingScore)) {
    const weakness = weakestCriterion?.short || weakestCriterion?.label || (speakingScore < target ? "Fluency" : "Speaking precision");
    return {
      ...plan,
      mode: "speaking-score",
      sourceLabel: "Latest speaking score",
      title: `Speaking Part 2: improve ${weakness}`,
      subtitle: "Use your latest speaking score to run a targeted retest.",
      why: `Latest speaking band is ${signals.speakingBand}; target is ${target}. ${weakestCriterion ? `${weakness} is the lowest visible criterion.` : "Run another full answer to collect criterion-level evidence."}`,
      estimate: "15 min",
      output: "Band report + recording + weak-area retest",
      module: "speaking",
      primaryAction: "bank",
      primaryLabel: "Start AI speaking retest",
      focusTitle: `Speaking Band ${signals.speakingBand}`,
      band: { value: signals.speakingBand, detail: `Target ${target}`, target: String(target), percent: Math.max(8, Math.min(100, Math.round((speakingScore / 9) * 100))) },
      coachReason: {
        title: "Recommended from speaking score",
        text: `IELTSist found a speaking band of ${signals.speakingBand}. The next task should produce a new answer, a recording and a fresh criterion breakdown.`,
        evidence: [`Band ${signals.speakingBand}`, weakestCriterion ? `${weakness} ${weakestCriterion.score}` : "criterion pending", `target ${target}`],
      },
      weakSkills: signals.speakingCriteria,
      recommendations: [
        ["Finish one speaking retest", "Compare the new result with the previous band."],
        ["Save one weak point", "Use AI Coach to turn the lowest criterion into a drill."],
        ["Practise one topic", "Choose a topic and avoid repeating memorised answers."],
      ],
    };
  }

  if (signals.writingDrafts.length) {
    const draft = signals.writingDrafts[0];
    return {
      ...plan,
      mode: "writing-draft",
      sourceLabel: "Draft found",
      title: "Writing Task 2: finish and grade draft",
      subtitle: "You have a writing draft signal. Turn it into AI feedback.",
      why: `Found a writing draft: ${draft.title || "Untitled writing draft"}. Grade it to add writing evidence to today's plan.`,
      estimate: "40 min",
      output: "Band report + rewrite points + grammar weak area",
      module: "writing",
      primaryAction: "writing-upload",
      primaryLabel: "Grade writing draft",
      focusTitle: "Writing draft",
      band: { value: "--", detail: "Writing score pending.", target: String(target), percent: 8 },
      coachReason: {
        title: "Recommended from draft activity",
        text: "IELTSist found writing work in progress. Grading it gives a stronger diagnosis than opening another blank module.",
        evidence: [draft.title || "writing draft", draft.module || "writing", draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : "auto-saved"],
      },
      weakSkills: [],
      recommendations: [
        ["Grade the draft", "Submit Task 2 and collect the four writing criteria."],
        ["Rewrite one paragraph", "Apply the most important grammar or coherence fix."],
        ["Ask AI Coach", "Ask why the rewrite improves the band."],
      ],
    };
  }

  if (signals.vocabCount) {
    return {
      ...plan,
      mode: "vocabulary-review",
      sourceLabel: "Vocabulary review",
      title: "Speaking retest: use saved vocabulary",
      subtitle: "Convert saved vocabulary into a spoken answer.",
      why: `You have ${signals.vocabCount} saved vocabulary note${signals.vocabCount === 1 ? "" : "s"}. Use them in one answer and let AI Coach check naturalness.`,
      estimate: "15 min",
      output: "Vocabulary-use feedback + speaking weak-area note",
      module: "speaking",
      primaryAction: "speaking-vocab",
      primaryLabel: "Practise with saved words",
      focusTitle: "Vocabulary retest",
      band: { value: "--", detail: "Use saved notes to create evidence.", target: String(target), percent: 8 },
      coachReason: {
        title: "Recommended from vocabulary notes",
        text: "Saved vocabulary only helps if it appears naturally in speaking or writing. Today's mission turns notes into output.",
        evidence: [`${signals.vocabCount} saved notes`, "speaking output", "AI naturalness check"],
      },
      weakSkills: [],
      recommendations: [
        ["Use three saved words", "Answer one Part 2 topic and use saved language naturally."],
        ["Ask AI Coach", "Check whether the wording sounds natural or forced."],
        ["Save one better phrase", "Replace a weak phrase with a band-7 phrase."],
      ],
    };
  }

  return plan;
}

function renderPracticeFlow(plan) {
  const steps = plan.mode === "diagnostic"
    ? ["Start", "Score", "Coach summary", "First retest"]
    : ["Start", "AI feedback", "Save weak area", "Retest"];
  return steps.map((step, index) => `${index ? "<i></i>" : ""}<span>${escapeHtml(step)}</span>`).join("");
}

function renderWeakSummary(plan) {
  if (plan.weakAreaNote && !plan.weakSkills?.length) {
    const note = plan.weakAreaNote;
    return `<div class="dashboard-weak-note">
      <div>
        <span>${escapeHtml(moduleDisplayName(note.module))}</span>
        <strong>${escapeHtml(note.title)}</strong>
      </div>
      <p>${escapeHtml(note.summary)}</p>
      <em>${escapeHtml(note.createdAt ? new Date(note.createdAt).toLocaleDateString() : "Saved by AI Coach")}</em>
    </div>`;
  }
  if (!plan.weakSkills?.length) {
    return `<div class="dashboard-weak-empty">
      <strong>No weak-area scores yet</strong>
      <span>Complete today's mission so IELTSist can build a real skill map.</span>
    </div>`;
  }
  return `<div class="dashboard-weak-grid">
    ${plan.weakSkills.slice(0, 4).map((item, index) => renderWeakSkillChip(item.short || item.label || `Skill ${index + 1}`, item.score, item.key === "gra" ? 7 : 7.5, ["purple", "blue", "orange", "green"][index % 4])).join("")}
  </div>`;
}

function renderSkillProgress(label, score, target, tone) {
  const percent = Math.max(8, Math.min(100, Math.round((Number(score) / 9) * 100)));
  return `<div class="skill-progress-row tone-${escapeHtml(tone)}">
    <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(score))}</strong></div>
    <i><b style="width:${percent}%"></b></i>
    <em>Target ${escapeHtml(String(target))}</em>
  </div>`;
}

function dashboardCoachChipHtml(label, detail, tone = "") {
  return `<span class="coach-context-chip ${tone ? `tone-${escapeHtml(tone)}` : ""}">
    <strong>${escapeHtml(label)}</strong>
    <em>${escapeHtml(compactText(detail, 58))}</em>
  </span>`;
}

function dashboardSkillShortcuts() {
  return [
    optionTask("listening", "Listening with AI", "Exam, section training, captions and review.", "blue", "Start", "module:listening"),
    optionTask("reading", "Reading with AI", "Passage/question split with answer evidence.", "green", "Start", "module:reading"),
    optionTask("writing", "Writing with AI", "Task set, structure check and rewrite loop.", "purple", "Write", "writing-upload"),
    optionTask("speaking", "Speaking with AI", "15-minute examiner, report and retest.", "pink", "Speak", "bank"),
  ];
}

function renderRecentLearningAssets(signals) {
  const weak = signals.weakAreas[0] || null;
  const objective = signals.latestObjective || null;
  const writing = signals.writingDrafts[0] || null;
  const speakingBand = signals.speakingBand || "";
  const cards = [
    {
      icon: "🎯",
      title: "Recent wrong answer",
      text: objective
        ? `${moduleDisplayName(objective.module)} · ${objective.correct}/${objective.total} · ${objective.wrongQuestionIds?.length || 0} to review`
        : weak ? compactText(weak.summary || weak.title || "Saved weak-area note", 118) : "No saved wrong-answer explanation yet.",
      action: objective?.module ? `review:${objective.module}` : weak ? "mine" : "coach",
      label: objective ? "Review" : weak ? "Review" : "Ask Coach",
    },
    {
      icon: "✍️",
      title: "Recent writing",
      text: writing ? compactText(writing.title || "Auto-saved writing draft", 118) : "Grade one essay to unlock rewrite practice.",
      action: "writing-upload",
      label: writing ? "Continue" : "Start writing",
    },
    {
      icon: "🎙️",
      title: "Recent speaking report",
      text: speakingBand ? `Latest speaking band ${speakingBand}. Retest the weakest criterion.` : "Finish one AI speaking test to create a report.",
      action: "bank",
      label: speakingBand ? "Retest" : "Start test",
    },
  ];
  return cards.map((card) => `<article class="dashboard-recent-card">
    <span aria-hidden="true">${escapeHtml(card.icon)}</span>
    <div>
      <strong>${escapeHtml(card.title)}</strong>
      <p>${escapeHtml(card.text)}</p>
    </div>
    <button class="secondary small-button" type="button" data-home-action="${escapeHtml(card.action)}">${escapeHtml(card.label)}</button>
  </article>`).join("");
}

function renderDashboardSkillShortcut(task) {
  const shortLabels = {
    listening: "Listen",
    reading: "Read",
    writing: "Write",
    speaking: "Speak",
  };
  const isCurrent = /in progress|ai recommended/i.test(task.status || "");
  return `<button class="dashboard-skill-shortcut accent-${escapeHtml(task.accent || "blue")}${isCurrent ? " is-current" : ""}" type="button" data-home-action="${escapeHtml(task.action || `module:${task.module}`)}">
    <span class="dashboard-skill-mark" aria-hidden="true">${escapeHtml(shortLabels[task.module]?.slice(0, 1) || "P")}</span>
    <span><strong>${escapeHtml(moduleDisplayName(task.module))}</strong><em>${escapeHtml(compactText(task.status || task.title, 42))}</em></span>
  </button>`;
}

function renderLatestLearningFeedback(signals) {
  const candidates = [];
  const objective = signals.latestObjective;
  if (objective) {
    const wrongCount = objective.wrongQuestionIds?.length || Math.max(0, Number(objective.total || 0) - Number(objective.correct || 0));
    candidates.push({
      timestamp: objective.createdAt || objective.updatedAt || "",
      module: objective.module || "reading",
      label: "Latest answer feedback",
      title: `${moduleDisplayName(objective.module)} · ${objective.correct}/${objective.total}`,
      text: wrongCount ? `${wrongCount} answer${wrongCount === 1 ? "" : "s"} ready for evidence review.` : "Completed with no unresolved wrong answers.",
      action: wrongCount ? `review:${objective.module}` : `module:${objective.module}`,
      actionLabel: wrongCount ? "Review evidence" : "Practise again",
    });
  }
  if (signals.writingResult?.updatedAt || signals.writingResult?.createdAt) {
    const score = signals.writingResult.scores?.overall || signals.writingResult.overall || signals.writingResult.band || "";
    candidates.push({
      timestamp: signals.writingResult.updatedAt || signals.writingResult.createdAt,
      module: "writing",
      label: "Latest writing feedback",
      title: score ? `Writing Band ${score}` : "Writing feedback ready",
      text: compactText(signals.writingResult.feedback || signals.writingResult.report || "Open the report and rewrite the highest-impact paragraph.", 120),
      action: "writing-upload",
      actionLabel: "Open feedback",
    });
  }
  if (signals.speakingResult?.updatedAt || signals.speakingResult?.createdAt) {
    const band = signals.speakingResult.band || signals.speakingBand || "";
    candidates.push({
      timestamp: signals.speakingResult.updatedAt || signals.speakingResult.createdAt,
      module: "speaking",
      label: "Latest speaking feedback",
      title: band ? `Speaking Band ${band}` : "Speaking report ready",
      text: "Review the criterion breakdown, recording and targeted retest.",
      action: "bank",
      actionLabel: "Open report",
    });
  }
  const weak = signals.weakAreas[0];
  if (weak?.createdAt) {
    candidates.push({
      timestamp: weak.createdAt,
      module: weak.module || "practice",
      label: "Latest saved feedback",
      title: weak.title || `${moduleDisplayName(weak.module)} weak area`,
      text: compactText(weak.summary || "Review this saved explanation and retest the skill.", 120),
      action: "mine",
      actionLabel: "Review note",
    });
  }
  const latest = candidates.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).find(Boolean);
  if (!latest) return "";
  return `<section class="dashboard-latest-feedback accent-${escapeHtml(latest.module)}" aria-label="Latest useful feedback">
    <div class="dashboard-feedback-mark" aria-hidden="true">${escapeHtml(moduleDisplayName(latest.module).slice(0, 1))}</div>
    <div>
      <span>${escapeHtml(latest.label)}</span>
      <strong>${escapeHtml(latest.title)}</strong>
      <p>${escapeHtml(latest.text)}</p>
    </div>
    <button class="secondary" type="button" data-home-action="${escapeHtml(latest.action)}">${escapeHtml(latest.actionLabel)}</button>
  </section>`;
}

function renderDashboardHistory() {
  const attempts = mineLearningAttempts().slice(0, 4);
  const coachThreads = readCoachHistoryThreads().filter((thread) => thread.messages?.length).slice(0, 3);
  if (!attempts.length && !coachThreads.length) return "";
  const attemptRows = attempts.map((attempt) => {
    const result = mineAttemptResult(attempt);
    const moduleName = ["listening", "reading", "writing", "speaking"].includes(attempt.module || result.module)
      ? (attempt.module || result.module)
      : "reading";
    const timestamp = attempt.submittedAt || result.updatedAt || result.createdAt || attempt.updatedAt || attempt.createdAt || "";
    const date = timestamp ? new Date(timestamp).toLocaleDateString() : "Saved";
    const action = moduleName === "writing" ? "writing-upload" : moduleName === "speaking" ? "bank" : `review:${moduleName}`;
    return `<article class="dashboard-history-row">
      <span class="dashboard-history-mark tone-${escapeHtml(moduleName)}" aria-hidden="true">${escapeHtml(moduleName.slice(0, 1).toUpperCase())}</span>
      <div><strong>${escapeHtml(moduleDisplayName(moduleName))} · ${escapeHtml(mineAttemptScore(attempt))}</strong><p>${escapeHtml(date)} · ${mineAttemptWrongCount(attempt) ? `${mineAttemptWrongCount(attempt)} to review` : "Report saved"}</p></div>
      <button class="secondary small-button" type="button" data-home-action="${escapeHtml(action)}">Open</button>
    </article>`;
  }).join("");
  const coachRows = coachThreads.map((thread) => {
    const lastUser = [...thread.messages].reverse().find((message) => message.role === "user")?.content || thread.title || "AI Coach conversation";
    const timestamp = thread.updatedAt ? new Date(thread.updatedAt).toLocaleDateString() : "Saved";
    return `<article class="dashboard-history-row">
      <span class="dashboard-history-mark tone-coach" aria-hidden="true">AI</span>
      <div><strong>${escapeHtml(thread.title || "AI Coach conversation")}</strong><p>${escapeHtml(compactText(lastUser, 82))} · ${escapeHtml(timestamp)}</p></div>
      <button class="secondary small-button" type="button" data-dashboard-coach-thread="${escapeHtml(thread.key)}">Review</button>
    </article>`;
  }).join("");
  return `<section class="dashboard-history" aria-label="Learning history">
    <header><span>Learning history</span><strong>Your scores and Coach conversations stay here</strong></header>
    <div class="dashboard-history-grid">
      ${attemptRows ? `<section><h3>Recent scores</h3><div>${attemptRows}</div></section>` : ""}
      ${coachRows ? `<section><h3>AI Coach chats</h3><div>${coachRows}</div></section>` : ""}
    </div>
  </section>`;
}

function openDashboardCoachHistory(threadKey) {
  const thread = readCoachHistoryThreads().find((entry) => entry.key === threadKey);
  if (!thread) return;
  state.help.binding = currentCoachBinding();
  state.help.history = thread.messages.map((message) => ({ ...message }));
  state.help.contextText = thread.contextText || "";
  const log = $("helpChatLog");
  if (log) {
    log.innerHTML = "";
    delete log.dataset.coachSurface;
    state.help.history.forEach((message) => addHelpMessage(message.role, message.content || ""));
  }
  openGlobalCoachPanel({
    module: thread.binding?.module || "",
    moduleLabel: thread.binding?.module ? moduleDisplayName(thread.binding.module) : "AI Coach",
    title: thread.title || "Saved AI Coach conversation",
    source: "Conversation history",
  });
}

function bindDashboardHistoryControls(root = document) {
  root.querySelectorAll?.("[data-dashboard-coach-thread]").forEach((button) => {
    button.addEventListener("click", () => openDashboardCoachHistory(button.dataset.dashboardCoachThread || ""));
  });
}

function dashboardModuleEmoji(moduleName) {
  return {
    listening: "🎧",
    reading: "📖",
    writing: "✍️",
    speaking: "🎙️",
    exam: "📝",
    coach: "🤖",
  }[moduleName] || "✨";
}

function dashboardFullMockAttempts(attempts = mineLearningAttempts()) {
  return attempts.filter((attempt) => {
    if (!/^(?:same-test|random-exam)$/i.test(String(attempt?.mode || ""))) return false;
    const result = mineAttemptResult(attempt);
    return Boolean(normalizeSpeakingBand(result.overallBand || result.overall || result.band || attempt?.score?.band || ""));
  });
}

function dashboardLatestSkillAttempt(moduleName, attempts = mineLearningAttempts()) {
  return attempts.find((attempt) => (attempt?.module || mineAttemptResult(attempt).module) === moduleName) || null;
}

function dashboardAttemptTaskNumber(attempt) {
  const result = mineAttemptResult(attempt);
  const taskNumber = Number(attempt?.taskNumber || result.taskNumber || result.task || 0);
  return taskNumber === 1 || taskNumber === 2 ? taskNumber : 0;
}

function dashboardAttemptPercent(attempt) {
  if (!attempt) return 8;
  const result = mineAttemptResult(attempt);
  const score = attempt.score || {};
  const band = Number.parseFloat(normalizeSpeakingBand(result.band || score.band || result.scores?.overall || ""));
  if (Number.isFinite(band)) return Math.max(8, Math.min(100, Math.round((band / 9) * 100)));
  const correct = Number(result.correct ?? score.correct);
  const total = Number(result.total ?? score.total);
  return Number.isFinite(correct) && Number.isFinite(total) && total > 0
    ? Math.max(8, Math.min(100, Math.round((correct / total) * 100)))
    : 8;
}

function dashboardStudyStreak(attempts = mineLearningAttempts()) {
  const days = [...new Set(attempts
    .map((attempt) => attempt.submittedAt || attempt.updatedAt || attempt.createdAt || "")
    .filter(Boolean)
    .map((value) => {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : NaN;
    })
    .filter(Number.isFinite))].sort((a, b) => b - a);
  if (!days.length) return 0;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dayMs = 86400000;
  if (todayStart - days[0] > dayMs) return 0;
  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const difference = Math.round((days[index - 1] - days[index]) / dayMs);
    if (difference !== 1) break;
    streak += 1;
  }
  return streak;
}

function renderDashboardFocusMock(attempts = mineLearningAttempts()) {
  const fullMocks = dashboardFullMockAttempts(attempts);
  const latest = fullMocks[0] || null;
  if (!latest) {
    return `<aside class="dashboard-focus-mock is-empty" aria-label="Full mock score">
      <div class="dashboard-focus-panel-title"><span>📝 Latest full mock</span><em>Build a baseline</em></div>
      <strong>No full mock yet</strong>
      <p>Complete Same Test or Random Exam to create a truthful overall Band.</p>
      <button class="secondary small-button" type="button" data-home-action="exam">Start full mock</button>
    </aside>`;
  }
  const latestResult = mineAttemptResult(latest);
  const latestBand = normalizeSpeakingBand(latestResult.overallBand || latestResult.overall || latestResult.band || latest.score?.band || "");
  const previous = fullMocks[1] || null;
  const previousResult = mineAttemptResult(previous);
  const previousBand = previous
    ? normalizeSpeakingBand(previousResult.overallBand || previousResult.overall || previousResult.band || previous.score?.band || "")
    : "";
  const delta = previousBand ? Number(latestBand) - Number(previousBand) : NaN;
  const trend = fullMocks.slice(0, 5).reverse().map((attempt) => {
    const result = mineAttemptResult(attempt);
    const band = Number(normalizeSpeakingBand(result.overallBand || result.overall || result.band || attempt.score?.band || ""));
    return `<i style="height:${Math.max(18, Math.min(100, Math.round((band / 9) * 100)))}%"></i>`;
  }).join("");
  return `<aside class="dashboard-focus-mock" aria-label="Full mock score">
    <div class="dashboard-focus-panel-title"><span>📝 Latest full mock</span>${Number.isFinite(delta) ? `<em>${delta >= 0 ? "+" : ""}${delta.toFixed(1)} change</em>` : `<em>Official simulation</em>`}</div>
    <div class="dashboard-focus-band"><strong>${escapeHtml(latestBand)}</strong><span>overall Band</span></div>
    <p>${escapeHtml(latest.title || "Same Test / Random Exam")} · ${escapeHtml(latest.submittedAt ? new Date(latest.submittedAt).toLocaleDateString() : "Saved")}</p>
    <div class="dashboard-focus-trend" aria-label="Full mock Band trend">${trend}</div>
    <div class="dashboard-focus-trend-label"><span>Earlier</span><strong>Full-mock trend</strong><span>Latest</span></div>
  </aside>`;
}

function renderDashboardFocusSkill(moduleName, currentTask, resumableSession, attempts = mineLearningAttempts()) {
  const attempt = dashboardLatestSkillAttempt(moduleName, attempts);
  const taskNumber = moduleName === "writing" ? dashboardAttemptTaskNumber(attempt) : 0;
  const status = resumableSession?.module === moduleName
    ? "In progress"
    : attempt
      ? `${taskNumber ? `Task ${taskNumber} · ` : ""}${mineAttemptScore(attempt)}`
      : currentTask?.module === moduleName
        ? "AI recommended"
        : "Needs diagnostic";
  const descriptions = {
    listening: "Accuracy, traps and caption review",
    reading: "Evidence-led passage practice",
    writing: "Task 1 / Task 2 score independently",
    speaking: "15-minute AI examiner practice",
  };
  const actions = { listening: "module:listening", reading: "module:reading", writing: "writing-upload", speaking: "bank" };
  return `<button class="dashboard-focus-skill tone-${escapeHtml(moduleName)}${currentTask?.module === moduleName ? " is-current" : ""}" type="button" data-module="${escapeHtml(moduleName)}" data-home-action="${escapeHtml(actions[moduleName])}">
    <span class="dashboard-focus-skill-emoji" aria-hidden="true">${dashboardModuleEmoji(moduleName)}</span>
    <b>${escapeHtml(moduleDisplayName(moduleName))}</b>
    <span class="dashboard-focus-skill-score"><em>${attempt ? "Latest" : "Status"}</em><strong>${escapeHtml(status)}</strong></span>
    <small>${escapeHtml(descriptions[moduleName])}</small>
    <i><u style="width:${dashboardAttemptPercent(attempt)}%"></u></i>
  </button>`;
}

function renderDashboardFocusHistory(attempts = mineLearningAttempts()) {
  const recent = attempts.filter((attempt) => ["listening", "reading", "writing", "speaking"].includes(attempt.module || mineAttemptResult(attempt).module)).slice(0, 4);
  const rows = recent.map((attempt) => {
    const result = mineAttemptResult(attempt);
    const moduleName = attempt.module || result.module;
    const taskNumber = moduleName === "writing" ? dashboardAttemptTaskNumber(attempt) : 0;
    const dateValue = attempt.submittedAt || attempt.updatedAt || attempt.createdAt || "";
    const dateLabel = dateValue ? new Date(dateValue).toLocaleDateString() : "Saved";
    const title = attempt.title || result.title || moduleDisplayName(moduleName);
    const action = moduleName === "writing" ? "writing-upload" : moduleName === "speaking" ? "bank" : `review:${moduleName}`;
    return `<article class="dashboard-focus-history-row">
      <span aria-hidden="true">${dashboardModuleEmoji(moduleName)}</span>
      <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(dateLabel)}${taskNumber ? ` · Task ${taskNumber}` : ""}${mineAttemptWrongCount(attempt) ? ` · ${mineAttemptWrongCount(attempt)} to review` : " · Report saved"}</p></div>
      <div class="dashboard-focus-history-score"><strong>${escapeHtml(mineAttemptScore(attempt))}</strong><button type="button" data-home-action="${escapeHtml(action)}">Open</button></div>
    </article>`;
  }).join("");
  return `<section class="dashboard-focus-history" aria-label="Recent practice">
    <header><strong>🗂️ Recent practice</strong><button type="button" data-home-action="mine">View full history →</button></header>
    <div>${rows || `<div class="dashboard-focus-history-empty"><span>🌱</span><strong>Your first result will appear here.</strong><button class="secondary small-button" type="button" data-home-action="coach-diagnostic">Choose diagnostic</button></div>`}</div>
  </section>`;
}

function readGuestLearningProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(guestLearningProfileStoreKey) || "null");
    if (!stored || stored.version !== 1) return null;
    const currentBand = Number(stored.currentBand);
    const targetBand = Number(stored.targetBand);
    const dailyMinutes = Number(stored.dailyMinutes);
    return {
      currentBand: Number.isFinite(currentBand) ? currentBand : 6,
      targetBand: Number.isFinite(targetBand) ? targetBand : 7.5,
      examDate: String(stored.examDate || ""),
      dailyMinutes: Number.isFinite(dailyMinutes) ? dailyMinutes : 30,
      onboardingCompleted: true,
    };
  } catch {
    return null;
  }
}

function dashboardEffectiveProfile() {
  if (state.currentUser) return state.learningState?.profile || {};
  return readGuestLearningProfile() || {};
}

function dashboardBandOptions(values, selected, fallback) {
  const current = Number.isFinite(Number(selected)) ? Number(selected) : fallback;
  return values.map((value) => `<option value="${value}"${value === current ? " selected" : ""}>${value.toFixed(1)}</option>`).join("");
}

function renderDashboardGoalDialog(profile = dashboardEffectiveProfile()) {
  const currentBand = Number(profile.currentBand);
  const targetBand = Number(profile.targetBand);
  const dailyMinutes = Number(profile.dailyMinutes);
  return `<dialog id="dashboardGoalDialog" class="dashboard-goal-dialog" aria-labelledby="dashboardGoalTitle" aria-describedby="dashboardGoalDescription">
    <form id="dashboardGoalForm" method="dialog">
      <header>
        <div><span>🎯 YOUR IELTS GOAL</span><h2 id="dashboardGoalTitle">Make the plan yours</h2></div>
        <button class="dashboard-goal-close" type="button" data-dashboard-goal-close aria-label="Close goal editor">×</button>
      </header>
      <p id="dashboardGoalDescription">Set all four details so practice recommendations fit your target and available time.</p>
      <div class="dashboard-goal-fields">
        <label><span>Current Band</span><select name="currentBand" required>${dashboardBandOptions([4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8], currentBand, 6)}</select></label>
        <label><span>Target Band</span><select name="targetBand" required>${dashboardBandOptions([5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9], targetBand, 7.5)}</select></label>
        <label><span>Exam date</span><input name="examDate" type="date" value="${escapeHtml(String(profile.examDate || ""))}" required /></label>
        <label><span>Minutes / day</span><input name="dailyMinutes" type="number" min="5" max="360" step="5" value="${Number.isFinite(dailyMinutes) ? dailyMinutes : 30}" required /></label>
      </div>
      ${state.currentUser ? "" : `<p class="dashboard-goal-sync-note">☁️ Sign in to sync this goal across devices. It will stay saved on this device for now.</p>`}
      <p class="dashboard-goal-error" data-dashboard-goal-error aria-live="polite"></p>
      <footer>
        <button class="secondary" type="button" data-dashboard-goal-close>Cancel</button>
        <button class="dashboard-goal-save" type="submit">Save goal <span aria-hidden="true">→</span></button>
      </footer>
    </form>
  </dialog>`;
}

function dashboardRoundToHalf(value) {
  return Math.round(value * 2) / 2;
}

function dashboardRadarProfile(attempts = mineLearningAttempts(), profile = dashboardEffectiveProfile()) {
  const modules = ["listening", "reading", "writing", "speaking"];
  const evidence = modules.map((moduleName) => {
    const attempt = attempts.find((item) => (item?.module || mineAttemptResult(item).module) === moduleName) || null;
    const result = mineAttemptResult(attempt);
    const score = attempt?.score || {};
    const rawBand = result.band ?? score.band ?? result.scores?.overall ?? result.scores?.Overall;
    const band = Number.parseFloat(normalizeSpeakingBand(rawBand || ""));
    if (Number.isFinite(band)) {
      return { module: moduleName, label: moduleName[0].toUpperCase() + moduleName.slice(1), value: band, kind: "recorded", source: "Recorded Band", hasResult: true };
    }
    const correct = Number(result.correct ?? score.correct);
    const total = Number(result.total ?? score.total);
    if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) {
      const value = dashboardRoundToHalf(Math.max(3, Math.min(9, (correct / total) * 9)));
      return { module: moduleName, label: moduleName[0].toUpperCase() + moduleName.slice(1), value, kind: "estimated", source: `${correct}/${total} estimate`, hasResult: true };
    }
    return { module: moduleName, label: moduleName[0].toUpperCase() + moduleName.slice(1), value: NaN, kind: "estimated", source: "", hasResult: false };
  });
  const available = evidence.map((item) => item.value).filter(Number.isFinite);
  const currentBand = Number(profile.currentBand);
  const fallback = Number.isFinite(currentBand)
    ? currentBand
    : available.length
      ? dashboardRoundToHalf(available.reduce((sum, value) => sum + value, 0) / available.length)
      : 5.5;
  evidence.forEach((item) => {
    if (Number.isFinite(item.value)) return;
    item.value = fallback;
    item.source = Number.isFinite(currentBand) ? "Current Band baseline" : available.length ? "Profile average" : "Starter estimate";
  });
  return {
    axes: evidence,
    recordedCount: evidence.filter((item) => item.kind === "recorded").length,
    estimatedCount: evidence.filter((item) => item.kind === "estimated").length,
  };
}

function renderDashboardRadar(attempts = mineLearningAttempts(), profile = dashboardEffectiveProfile()) {
  const radar = dashboardRadarProfile(attempts, profile);
  return `<article class="dashboard-focus-radar" data-dashboard-radar aria-label="Four-skill learning profile">
    <header>
      <div><span>📡 SKILL PROFILE</span><h3>Your four-skill shape</h3></div>
      <strong>${radar.recordedCount} recorded · ${radar.estimatedCount} estimated</strong>
    </header>
    <div class="dashboard-radar-visual"><canvas data-dashboard-radar-canvas aria-hidden="true"></canvas></div>
    <ul class="dashboard-radar-summary">
      ${radar.axes.map((axis) => `<li><i class="tone-${axis.module}" data-radar-point="${axis.kind}" aria-hidden="true"></i><span><b>${axis.label}</b><small>${escapeHtml(axis.source)}</small></span><strong>${axis.value.toFixed(1)}</strong><em>${axis.kind}</em></li>`).join("")}
    </ul>
    <p>Estimated strengths guide practice only — they are not official IELTS Bands.</p>
    <script type="application/json" data-dashboard-radar-data>${JSON.stringify(radar.axes.map(({ module, label, value, kind }) => ({ module, label, value, kind })))}</script>
  </article>`;
}

function drawDashboardRadar(root = document) {
  const card = root.querySelector?.("[data-dashboard-radar]");
  const canvas = card?.querySelector("[data-dashboard-radar-canvas]");
  const dataNode = card?.querySelector("[data-dashboard-radar-data]");
  if (!canvas || !dataNode) return;
  let axes = [];
  try { axes = JSON.parse(dataNode.textContent || "[]"); } catch { return; }
  const size = Math.max(210, Math.min(290, Math.floor(card.querySelector(".dashboard-radar-visual")?.clientWidth || 250)));
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = size * ratio;
  canvas.height = size * ratio;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(ratio, ratio);
  const center = size / 2;
  const radius = size * .34;
  const angle = (index) => (-Math.PI / 2) + (index * Math.PI * 2 / 4);
  const point = (index, strength) => ({ x: center + Math.cos(angle(index)) * radius * strength, y: center + Math.sin(angle(index)) * radius * strength });
  context.lineJoin = "round";
  for (let level = 1; level <= 4; level += 1) {
    context.beginPath();
    axes.forEach((_, index) => {
      const current = point(index, level / 4);
      if (index === 0) context.moveTo(current.x, current.y); else context.lineTo(current.x, current.y);
    });
    context.closePath();
    context.strokeStyle = level === 4 ? "#d8d4ea" : "#eceaf4";
    context.lineWidth = 1;
    context.stroke();
  }
  axes.forEach((_, index) => {
    const outer = point(index, 1);
    context.beginPath();
    context.moveTo(center, center);
    context.lineTo(outer.x, outer.y);
    context.strokeStyle = "#e8e5f1";
    context.stroke();
  });
  const valuePoints = axes.map((axis, index) => point(index, Math.max(0, Math.min(1, Number(axis.value) / 9))));
  context.beginPath();
  valuePoints.forEach((current, index) => index ? context.lineTo(current.x, current.y) : context.moveTo(current.x, current.y));
  context.closePath();
  context.fillStyle = "rgba(115, 87, 232, .18)";
  context.strokeStyle = "#7357e8";
  context.lineWidth = 2.5;
  context.fill();
  context.stroke();
  valuePoints.forEach((current, index) => {
    context.beginPath();
    context.arc(current.x, current.y, 5, 0, Math.PI * 2);
    context.fillStyle = axes[index].kind === "recorded" ? "#7357e8" : "#ffffff";
    context.fill();
    context.strokeStyle = "#7357e8";
    context.lineWidth = 2;
    context.stroke();
  });
  context.fillStyle = "#6f7892";
  context.font = "700 11px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  axes.forEach((axis, index) => {
    const labelPoint = point(index, 1.18);
    context.fillText(axis.label, labelPoint.x, labelPoint.y);
  });
}

function dashboardPersonalSnapshot(signals, currentTask, resumableSession = null) {
  const profile = dashboardEffectiveProfile();
  const attempts = mineLearningAttempts();
  const coachThreads = readCoachHistoryThreads();
  const username = String(state.currentUser?.username || "").trim();
  const currentModule = resumableSession?.module || currentTask?.module || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const targetBand = Number(profile.targetBand);
  const dailyMinutes = Number(profile.dailyMinutes);
  const examDate = String(profile.examDate || "").trim();
  let examLabel = "Set exam date";
  if (examDate) {
    const examTime = new Date(`${examDate}T00:00:00`).getTime();
    const days = Math.ceil((examTime - Date.now()) / 86400000);
    examLabel = Number.isFinite(days) ? (days >= 0 ? `${days} days` : "Update date") : examDate;
  }
  const signalCount = attempts.length
    + signals.weakAreas.length
    + signals.draftCount
    + signals.vocabCount
    + coachThreads.length
    + (resumableSession ? 1 : 0);
  const memoryLevel = signalCount >= 8 ? "Strong profile" : signalCount >= 3 ? "Personalising" : "Learning you";
  const skillStatus = {};
  const skillMap = [];
  for (const moduleName of ["listening", "reading", "writing", "speaking"]) {
    const attempt = attempts.find((item) => (item.module || mineAttemptResult(item).module) === moduleName);
    skillStatus[moduleName] = resumableSession?.module === moduleName
      ? "In progress"
      : attempt
        ? `Latest ${mineAttemptScore(attempt)}`
        : currentTask?.module === moduleName
          ? "AI recommended"
          : "Needs diagnostic";
    const result = mineAttemptResult(attempt);
    const score = attempt?.score || {};
    const band = normalizeSpeakingBand(result.band || score.band || result.scores?.overall || result.scores?.Overall || "");
    const correct = Number(result.correct ?? score.correct);
    const total = Number(result.total ?? score.total);
    const hasObjectiveScore = Number.isFinite(correct) && Number.isFinite(total) && total > 0;
    const isRecommended = currentTask?.module === moduleName || resumableSession?.module === moduleName;
    skillMap.push({
      module: moduleName,
      label: moduleDisplayName(moduleName),
      value: band ? `Band ${band}` : hasObjectiveScore ? `${correct}/${total}` : isRecommended ? "Next task" : "Diagnostic",
      percent: band
        ? Math.max(8, Math.min(100, Math.round((Number(band) / 9) * 100)))
        : hasObjectiveScore
          ? Math.max(8, Math.min(100, Math.round((correct / total) * 100)))
          : isRecommended ? 24 : 8,
      isRecommended,
    });
  }
  const memorySignals = [
    resumableSession ? `${moduleDisplayName(resumableSession.module)} session restored` : "No unfinished session",
    attempts.length ? `${attempts.length} scored attempt${attempts.length === 1 ? "" : "s"}` : "Score history is building",
    signals.weakAreas.length ? `${signals.weakAreas.length} active weak area${signals.weakAreas.length === 1 ? "" : "s"}` : `${coachThreads.length} saved Coach thread${coachThreads.length === 1 ? "" : "s"}`,
  ];
  return {
    heading: username
      ? `${greeting}, ${username}`
      : currentModule
        ? `Your ${moduleDisplayName(currentModule)} plan is ready`
        : "Your personal IELTS plan is ready",
    summary: signalCount
      ? `IELTSist is using ${signalCount} learning signal${signalCount === 1 ? "" : "s"} to decide what you should do next.`
      : "Complete one diagnostic and IELTSist will start adapting every recommendation to your performance.",
    targetLabel: Number.isFinite(targetBand) ? String(targetBand) : "Set goal",
    examLabel,
    dailyLabel: Number.isFinite(dailyMinutes) ? `${dailyMinutes} min` : "Flexible",
    signalCount,
    memoryLevel,
    memorySignals,
    skillStatus,
    skillMap,
  };
}

function renderDashboard() {
  const node = $("dashboardContent");
  if (!node) return;
  const signals = dashboardSignalSummary();
  const plan = buildTodayPracticePlan();
  const attempts = mineLearningAttempts();
  const resumableSession = readPracticeSession();
  const resumableItem = resumableSession ? findItemById(resumableSession.module, resumableSession.itemId) : null;
  const resumableAnswers = resumableSession ? Object.values(resumableSession.answers || {}).filter((value) => String(value || "").trim()).length : 0;
  const needsOnboarding = Boolean(state.currentUser && state.learningState?.todayPlan?.kind === "onboarding");
  const hasLocalResume = Boolean(resumableSession && resumableItem);
  const currentTask = hasLocalResume
    ? {
        sourceLabel: "Saved practice",
        title: `Continue ${moduleDisplayName(resumableSession.module)}`,
        subtitle: resumableItem.title || "Unfinished IELTS practice",
        why: `Finish the current ${moduleDisplayName(resumableSession.module)} task before starting another practice. Your answers and position are saved.`,
        estimate: `${formatTime(Number(resumableSession.seconds) || 0)} remaining`,
        output: `${resumableAnswers} answered · AI feedback after submission`,
        primaryAction: `resume-practice:${resumableSession.module}:${encodeURIComponent(resumableSession.itemId)}`,
        primaryLabel: "Continue practice",
        secondaryAction: "choose-task",
        secondaryLabel: "Change task",
        module: resumableSession.module,
      }
    : needsOnboarding
      ? {
          sourceLabel: "Personalise IELTSist",
          title: "Set your IELTS goal",
          subtitle: "Add four details before IELTSist recommends a task from real evidence.",
          why: "Your target, exam date and study time prevent generic or invented recommendations.",
          estimate: "1 min",
          output: "A traceable first diagnostic plan",
          primaryLabel: "Save goal",
          module: "coach",
        }
      : { ...plan, primaryLabel: plan.primaryLabel || "Start practice", secondaryLabel: "Ask AI Coach" };
  const personal = dashboardPersonalSnapshot(signals, currentTask, resumableSession);
  const profileFieldsHtml = needsOnboarding && !hasLocalResume
    ? `<form id="learningProfileForm" class="dashboard-profile-form">
        <label><span>Current band</span><select name="currentBand" required>${[4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((value) => `<option value="${value}"${value === 6 ? " selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>Target band</span><select name="targetBand" required>${[5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((value) => `<option value="${value}"${value === 7.5 ? " selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>Exam date</span><input name="examDate" type="date" required /></label>
        <label><span>Minutes / day</span><input name="dailyMinutes" type="number" min="5" max="360" step="5" value="30" required /></label>
      </form>`
    : "";
  const primaryAttributes = needsOnboarding && !hasLocalResume
    ? `type="submit" form="learningProfileForm"`
    : `type="button" data-home-action="${escapeHtml(currentTask.primaryAction)}"`;
  const secondaryAction = currentTask.secondaryAction || currentTask.secondaryAction === "" ? currentTask.secondaryAction : "coach";
  const secondaryButtonHtml = secondaryAction
    ? `<button class="secondary" type="button" data-home-action="${escapeHtml(secondaryAction)}">${escapeHtml(currentTask.secondaryLabel || "Ask AI Coach")}</button>`
    : "";
  const latestFeedbackHtml = renderLatestLearningFeedback(signals);
  const historyHtml = renderDashboardHistory();
  const coachPrompt = currentTask?.title
    ? `Explain why ${currentTask.title} is my best next IELTS task and tell me what to focus on.`
    : "Build my next IELTS practice plan from my recent learning history.";
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const streak = dashboardStudyStreak(attempts);
  const effectiveProfile = dashboardEffectiveProfile();
  node.innerHTML = `<section class="dashboard-cockpit dashboard-focus-camp">
    <header class="dashboard-focus-header">
      <div>
        <span class="dashboard-focus-date">${escapeHtml(todayLabel)} · your IELTS training camp</span>
        <h1>${escapeHtml(personal.heading)} <span aria-hidden="true">👋</span></h1>
        <p>One clear task now, every score and saved practice ready when you need it.</p>
      </div>
      <dl class="dashboard-focus-badges" aria-label="Personal IELTS goals">
        <div class="is-editable"><dt>🎯 Target</dt><dd><button type="button" data-dashboard-goal="target" aria-label="Edit IELTS target Band">${personal.targetLabel === "Set goal" ? "" : "Band "}${escapeHtml(personal.targetLabel)} <span aria-hidden="true">✎</span></button></dd></div>
        <div><dt>🔥 Streak</dt><dd>${streak} day${streak === 1 ? "" : "s"}</dd></div>
        <div class="is-editable"><dt>📅 Exam</dt><dd><button type="button" data-dashboard-goal="exam" aria-label="Edit IELTS exam date">${escapeHtml(personal.examLabel)} <span aria-hidden="true">✎</span></button></dd></div>
      </dl>
    </header>

    <div class="dashboard-focus-priority">
      <section class="dashboard-focus-hero tone-${escapeHtml(currentTask.module || "coach")}" aria-label="Current learning task">
        <span class="dashboard-focus-hero-emoji" aria-hidden="true">${dashboardModuleEmoji(currentTask.module)}</span>
        <span class="dashboard-focus-kicker">⚡ ${escapeHtml(currentTask.sourceLabel || "Today's AI Practice Plan")}</span>
        <h2>${escapeHtml(currentTask.title)}</h2>
        <p class="dashboard-focus-subtitle">${escapeHtml(compactText(currentTask.subtitle, 130))}</p>
        <div class="dashboard-focus-reason">
          <strong>✨ Why this now</strong>
          <span>${escapeHtml(compactText(currentTask.why, 220))}</span>
        </div>
        ${profileFieldsHtml}
        <dl class="dashboard-focus-meta">
          <div><dt>⏱️ Time</dt><dd>${escapeHtml(currentTask.estimate)}</dd></div>
          <div><dt>🏁 Reward</dt><dd>${escapeHtml(compactText(currentTask.output, 100))}</dd></div>
        </dl>
        <div class="dashboard-focus-actions">
          <button class="primary" ${primaryAttributes}>${escapeHtml(currentTask.primaryLabel)} <span aria-hidden="true">→</span></button>
          ${secondaryButtonHtml}
        </div>
      </section>
      ${renderDashboardFocusMock(attempts)}
    </div>

    <section class="dashboard-focus-skills" aria-label="Practice by skill">
      <header><div><span>YOUR SCOREBOARD</span><h2>Train every skill <span aria-hidden="true">🚀</span></h2></div><p>Each skill keeps its own latest result and history.</p></header>
      <div class="dashboard-focus-scoreboard">
        ${renderDashboardRadar(attempts, effectiveProfile)}
        <div class="dashboard-focus-skill-grid">
          ${["listening", "reading", "writing", "speaking"].map((moduleName) => renderDashboardFocusSkill(moduleName, currentTask, resumableSession, attempts)).join("")}
        </div>
      </div>
    </section>

    <div class="dashboard-focus-lower">
      ${renderDashboardFocusHistory(attempts)}
      <aside class="dashboard-focus-coach" aria-label="AI Coach">
        <div class="dashboard-focus-coach-mark" aria-hidden="true">🤖</div>
        <span>ALWAYS IN YOUR CORNER</span>
        <h2>AI Coach</h2>
        <p>Knows your scores and weak areas, so every answer starts from your real IELTS record.</p>
        <blockquote>“${escapeHtml(compactText(currentTask.why, 140))}”</blockquote>
        <div>
          <button class="secondary" type="button" data-home-action="coach">Open AI Coach</button>
          <button type="button" data-dashboard-coach-prompt="${escapeHtml(coachPrompt)}">Why this task? ✨</button>
        </div>
      </aside>
    </div>
    ${latestFeedbackHtml}
    ${historyHtml}
    ${renderDashboardGoalDialog(effectiveProfile)}
  </section>`;
  bindHomeControls(node);
  bindDashboardHistoryControls(node);
  requestAnimationFrame(() => drawDashboardRadar(node));
  window.lucide?.createIcons?.({ attrs: { "stroke-width": 1.9 } });
  renderCoach();
}

function moduleDisplayName(moduleName) {
  return {
    listening: "Listening with AI",
    reading: "Reading with AI",
    writing: "Writing with AI",
    speaking: "Speaking with AI",
  }[moduleName] || "Practice";
}

function answeredCountForPrefix(prefix) {
  return Object.values(collectAnswers(prefix || "single")).filter((value) => String(value || "").trim()).length;
}

function readWeakAreas() {
  try {
    return JSON.parse(localStorage.getItem(weakAreaStoreKey) || "[]");
  } catch {
    return [];
  }
}

function writeWeakAreas(items) {
  localStorage.setItem(weakAreaStoreKey, JSON.stringify(items.slice(0, 60)));
}

async function syncWeakArea(entry) {
  if (!state.authToken || !entry?.id) return;
  const moduleName = ["listening", "reading", "writing", "speaking"].includes(entry.module) ? entry.module : state.activeModule || "listening";
  try {
    const json = await postJson("/api/learning/weak-areas", {
      id: entry.id,
      module: moduleName,
      skillKey: entry.skillKey || "",
      questionId: entry.questionId || "",
      sourceAttemptId: entry.sourceAttemptId || "",
      summary: entry.summary || entry.title || "Weak area",
      evidence: entry.evidence || {},
      status: entry.status || "active",
    });
    const weakAreas = [json.weakArea, ...((state.learningState?.weakAreas || []).filter((item) => item.id !== json.weakArea?.id))].filter(Boolean).slice(0, 50);
    state.learningState = { ...(state.learningState || {}), weakAreas };
  } catch {
    // Keep the local weak area available when offline.
  }
}

async function resolveRetestedWeakAreas(moduleName, result) {
  if (currentSinglePracticeMode(moduleName) !== "review") return;
  const correctIds = new Set((result?.details || []).filter((detail) => detail.correct === true).map((detail) => String(detail.id || "")));
  if (!correctIds.size) return;
  const local = readWeakAreas();
  const remote = state.learningState?.weakAreas || [];
  const candidates = [...remote, ...local].filter((area) => area.module === moduleName && correctIds.has(String(area.questionId || "")) && area.status !== "resolved");
  if (!candidates.length) return;
  const ids = new Set(candidates.map((area) => area.id));
  writeWeakAreas(local.map((area) => ids.has(area.id) ? { ...area, status: "resolved", retestAttemptId: result.attemptId } : area));
  if (state.learningState) {
    state.learningState.weakAreas = remote.map((area) => ids.has(area.id) ? { ...area, status: "resolved", retestAttemptId: result.attemptId } : area);
  }
  if (!state.authToken) return;
  await Promise.all(candidates.map((area) => patchJson(`/api/learning/weak-areas/${encodeURIComponent(area.id)}`, {
    status: "resolved",
    retestAttemptId: result.attemptId,
  }).catch(() => null)));
}

function readLearningLoopHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(learningHistoryStoreKey) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function updateLearningLoopHistory(patch = {}) {
  const current = readLearningLoopHistory();
  const mergeAttempts = (key, latest) => {
    const existing = Array.isArray(current[key]) ? current[key] : [];
    if (!latest) return existing.slice(0, 5);
    return [latest, ...existing.filter((item) => item?.attemptId !== latest.attemptId)].slice(0, 5);
  };
  const next = {
    ...current,
    ...patch,
    objective: { ...(current.objective || {}), ...(patch.objective || {}) },
    objectiveItems: { ...(current.objectiveItems || {}), ...(patch.objectiveItems || {}) },
    writingAttempts: mergeAttempts("writingAttempts", patch.writing),
    speakingAttempts: mergeAttempts("speakingAttempts", patch.speaking),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(learningHistoryStoreKey, JSON.stringify(next));
  return next;
}

function practiceCompletionIdentityForUser(user) {
  if (!user?.id && !user?.username) return "guest";
  return `user:${String(user.id || user.username).trim()}`;
}

function practiceCompletionIdentityKey() {
  return practiceCompletionIdentityForUser(state.currentUser);
}

function completionSyncOwnerIsCurrent(ownerIdentity, authToken) {
  return state.authToken === authToken && practiceCompletionIdentityKey() === ownerIdentity;
}

function learningStateForCompletionOwner(ownerIdentity) {
  return state.learningState?.completionIdentity === ownerIdentity ? state.learningState : {};
}

function canonicalPracticeCompletionId(moduleName, item = {}) {
  const moduleKey = String(moduleName || item?.module || "").trim().toLowerCase();
  if (!["listening", "reading", "writing", "speaking"].includes(moduleKey)) return "";
  const value = typeof item === "string" ? { id: item } : (item || {});
  const itemId = String(
    moduleKey === "speaking"
      ? value.topicId || value.itemId || value.id || ""
      : value.itemId || value.id || "",
  ).trim();
  if (!itemId) return "";
  if (moduleKey === "writing" || moduleKey === "speaking") return itemId;
  const practiceScope = String(value.practiceScope || "").toLowerCase();
  if (["section", "topic"].includes(practiceScope)) {
    const section = Number(value.practiceSection || value.contentNumber || value.section || value.passage);
    const baseId = String(value.sourceItemId || value.baseItemId || itemId).split("::")[0];
    if (Number.isInteger(section) && section >= 1 && section <= (moduleKey === "listening" ? 4 : 3)) return `${baseId}::section::${section}`;
  }
  if (/::(?:review|topic)(?:::|$)/i.test(itemId) || practiceScope === "review") return "";
  const sectionMatch = itemId.match(/^(.+)::section::([1-9]\d*)$/i);
  if (sectionMatch) {
    const section = Number(sectionMatch[2]);
    return section <= (moduleKey === "listening" ? 4 : 3) ? `${sectionMatch[1]}::section::${section}` : "";
  }
  if (itemId.includes("::")) return "";
  return itemId;
}

function practiceCompletionKey(moduleName, item) {
  const moduleKey = String(moduleName || item?.module || "").trim().toLowerCase();
  const itemId = canonicalPracticeCompletionId(moduleKey, item);
  return itemId ? `${moduleKey}:${itemId}` : "";
}

function readPracticeCompletionStore() {
  try {
    const value = JSON.parse(localStorage.getItem(completionStoreKey) || "{}");
    if (!value || typeof value !== "object") return { version: 1, partitions: {} };
    if (value.version === 1 && value.partitions && typeof value.partitions === "object") return value;
    return { version: 1, partitions: {} };
  } catch {
    return { version: 1, partitions: {} };
  }
}

function writePracticeCompletionStore(value) {
  const safeValue = value && typeof value === "object" ? value : { version: 1, partitions: {} };
  localStorage.setItem(completionStoreKey, JSON.stringify({ version: 1, partitions: safeValue.partitions || {} }));
}

function practiceCompletionScoreFields(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const score = source.score && typeof source.score === "object" ? source.score : {};
  const scores = source.scores && typeof source.scores === "object" ? source.scores : {};
  const numeric = (raw) => raw === "" || raw === null || raw === undefined ? Number.NaN : Number(raw);
  const correct = numeric(source.correct ?? source.scoredCorrect ?? score.correct);
  const total = numeric(source.scoredTotal ?? source.total ?? score.scoredTotal ?? score.total);
  const band = numeric(source.band ?? source.overallBand ?? source.overall ?? scores.overall ?? score.band ?? score.overall);
  const fields = {};
  if (Number.isFinite(correct) && correct >= 0 && Number.isFinite(total) && total > 0 && correct <= total) {
    fields.correct = correct;
    fields.total = total;
  }
  if (Number.isFinite(band) && band >= 0 && band <= 9) fields.band = Math.round(band * 2) / 2;
  return fields;
}

function legacyPracticeCompletionEntries() {
  const history = readLearningLoopHistory();
  const entries = [];
  const identity = practiceCompletionIdentityKey();
  const add = (moduleName, item, result = {}, trustedCurrentIdentity = false) => {
    const recordIdentity = String(result.completionIdentity || "").trim();
    if (!trustedCurrentIdentity && (recordIdentity ? recordIdentity !== identity : identity !== "guest")) return;
    const key = practiceCompletionKey(moduleName, item);
    if (!key) return;
    entries.push({
      key,
      module: moduleName,
      itemId: canonicalPracticeCompletionId(moduleName, item),
      completedAt: result.completedAt || result.submittedAt || result.createdAt || result.updatedAt || "",
      attemptId: result.attemptId || "",
      ...practiceCompletionScoreFields(result),
    });
  };
  [...Object.values(history.objective || {}), ...Object.values(history.objectiveItems || {})]
    .forEach((result) => add(result?.module, { itemId: result?.itemId }, result));
  [history.writing, ...(history.writingAttempts || [])].filter(Boolean).forEach((result) => add("writing", { itemId: result.itemId }, result));
  [history.speaking, ...(history.speakingAttempts || [])].filter(Boolean).forEach((result) => add("speaking", { topicId: result.topicId || result.itemId }, result));
  if (state.learningState?.completionIdentity === identity) {
    (state.learningState.completedItems || []).forEach((result) => add(result.module, { itemId: result.itemId }, result, true));
    (state.learningState.attempts || []).forEach((attempt) => add(attempt.module, { itemId: attempt.itemId }, {
      ...(attempt.result && typeof attempt.result === "object" ? attempt.result : {}),
      score: attempt.score,
      completedAt: attempt.submittedAt,
      attemptId: attempt.attemptId,
    }, true));
  }
  return entries;
}

function readPracticeCompletionIndex() {
  const store = readPracticeCompletionStore();
  const local = store.partitions?.[practiceCompletionIdentityKey()];
  const index = local && typeof local === "object" ? { ...local } : {};
  const merge = (entry) => {
    if (!entry?.key || !entry.itemId) return;
    const current = index[entry.key];
    const currentScore = practiceCompletionScoreFields(current);
    const entryScore = practiceCompletionScoreFields(entry);
    const sameAttempt = !current?.attemptId || !entry.attemptId || current.attemptId === entry.attemptId;
    const exactReplacesImplied = Boolean(current?.impliedBy && !entry.impliedBy);
    if (!current || exactReplacesImplied || String(entry.completedAt || "") >= String(current.completedAt || "")) {
      const next = {
        ...(current || {}),
        completedAt: entry.completedAt || current?.completedAt || "",
        attemptId: entry.attemptId || current?.attemptId || "",
        ...entryScore,
      };
      if (entry.impliedBy) next.impliedBy = entry.impliedBy;
      else delete next.impliedBy;
      index[entry.key] = next;
    } else if (!current.impliedBy && sameAttempt && Object.keys(entryScore).length) {
      index[entry.key] = { ...current, ...entryScore, ...currentScore };
    }
    if (!["listening", "reading"].includes(entry.module) || entry.itemId.includes("::")) return;
    const unitCount = entry.module === "listening" ? 4 : 3;
    for (let section = 1; section <= unitCount; section += 1) {
      const unitKey = `${entry.module}:${entry.itemId}::section::${section}`;
      const unitCurrent = index[unitKey];
      if (unitCurrent && !unitCurrent.impliedBy) continue;
      if (!unitCurrent || String(entry.completedAt || "") >= String(unitCurrent.completedAt || "")) {
        index[unitKey] = {
          completedAt: entry.completedAt || unitCurrent?.completedAt || "",
          attemptId: entry.attemptId || unitCurrent?.attemptId || "",
          impliedBy: entry.itemId,
        };
      }
    }
  };
  legacyPracticeCompletionEntries().forEach(merge);
  return index;
}

function rememberPracticeCompletion(moduleName, item, result = {}) {
  const moduleKey = String(moduleName || item?.module || "").trim().toLowerCase();
  const itemId = canonicalPracticeCompletionId(moduleKey, item);
  const key = practiceCompletionKey(moduleKey, item);
  if (!key || !itemId) return readPracticeCompletionIndex();
  const store = readPracticeCompletionStore();
  const identity = practiceCompletionIdentityKey();
  const partition = { ...(store.partitions?.[identity] || {}) };
  const completedAt = result.completedAt || result.submittedAt || result.createdAt || result.updatedAt || new Date().toISOString();
  const attemptId = result.attemptId || "";
  const scoreFields = practiceCompletionScoreFields(result);
  const remember = (targetKey, extra = {}) => {
    const current = partition[targetKey];
    const incomingImplied = Boolean(extra.impliedBy);
    if (current && incomingImplied && !current.impliedBy) return;
    const exactReplacesImplied = Boolean(current?.impliedBy && !incomingImplied);
    if (current && !exactReplacesImplied && String(current.completedAt || "") > String(completedAt)) return;
    const sameAttempt = !current?.attemptId || !attemptId || current.attemptId === attemptId;
    const retainedScore = current && sameAttempt ? practiceCompletionScoreFields(current) : {};
    partition[targetKey] = { completedAt, attemptId, ...retainedScore, ...extra };
  };
  remember(key, scoreFields);
  if (["listening", "reading"].includes(moduleKey) && !itemId.includes("::")) {
    const unitCount = moduleKey === "listening" ? 4 : 3;
    for (let section = 1; section <= unitCount; section += 1) {
      remember(`${moduleKey}:${itemId}::section::${section}`, { impliedBy: itemId });
    }
  }
  store.partitions = { ...(store.partitions || {}), [identity]: partition };
  writePracticeCompletionStore(store);
  return readPracticeCompletionIndex();
}

function practiceCompletionStatus(moduleName, item, completionIndex = null) {
  const key = practiceCompletionKey(moduleName, item);
  const index = completionIndex || readPracticeCompletionIndex();
  const completion = key ? index[key] : null;
  return { completed: Boolean(completion), ...(completion || {}), completedAt: completion?.completedAt || "", attemptId: completion?.attemptId || "" };
}

function readPendingLearningAttempts(identity = practiceCompletionIdentityKey()) {
  try {
    const value = JSON.parse(localStorage.getItem(pendingLearningAttemptsStoreKey) || "{}");
    const partitions = value?.version === 1 && value.partitions && typeof value.partitions === "object" ? value.partitions : {};
    const pending = partitions[identity];
    return Array.isArray(pending) ? pending : [];
  } catch {
    return [];
  }
}

function writePendingLearningAttempts(attempts, identity = practiceCompletionIdentityKey()) {
  let value;
  try {
    value = JSON.parse(localStorage.getItem(pendingLearningAttemptsStoreKey) || "{}");
  } catch {
    value = {};
  }
  const partitions = value?.version === 1 && value.partitions && typeof value.partitions === "object" ? value.partitions : {};
  partitions[identity] = (Array.isArray(attempts) ? attempts : []).slice(-100);
  localStorage.setItem(pendingLearningAttemptsStoreKey, JSON.stringify({ version: 1, partitions }));
}

function queuePendingLearningAttempt(payload, identity = practiceCompletionIdentityKey()) {
  if (!payload?.attemptId) return readPendingLearningAttempts(identity);
  const pending = readPendingLearningAttempts(identity).filter((item) => item?.attemptId !== payload.attemptId);
  pending.push({ ...payload, queuedAt: payload.queuedAt || new Date().toISOString() });
  writePendingLearningAttempts(pending, identity);
  return pending;
}

function removePendingLearningAttempt(attemptId, identity = practiceCompletionIdentityKey()) {
  const pending = readPendingLearningAttempts(identity).filter((item) => item?.attemptId !== attemptId);
  writePendingLearningAttempts(pending, identity);
  return pending;
}

async function retryPendingLearningAttempts(options = {}) {
  const ownerIdentity = options.ownerIdentity || practiceCompletionIdentityKey();
  const authToken = Object.prototype.hasOwnProperty.call(options, "authToken") ? options.authToken : state.authToken;
  const pending = readPendingLearningAttempts(ownerIdentity);
  if (!pending.length) return true;
  let succeeded = true;
  for (const payload of pending) {
    if (!completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return false;
    try {
      const json = await postJson("/api/learning/attempts", payload, { authToken });
      if (!completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return false;
      removePendingLearningAttempt(payload.attemptId, ownerIdentity);
      const attempt = json.attempt || null;
      if (attempt) {
        const ownerState = learningStateForCompletionOwner(ownerIdentity);
        const attempts = [attempt, ...((ownerState.attempts || []).filter((item) => item.attemptId !== attempt.attemptId))].slice(0, 20);
        state.learningState = { ...ownerState, completionIdentity: ownerIdentity, attempts };
      }
    } catch {
      succeeded = false;
    }
  }
  return succeeded;
}

function coachBindingKey(binding = {}) {
  return [binding.sessionId || "", binding.module || "", binding.paperId || "", binding.questionId || "", binding.view || ""].join("|");
}

function readCoachHistoryThreads() {
  try {
    const value = JSON.parse(localStorage.getItem(coachHistoryStoreKey) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((thread) => thread && thread.key && Array.isArray(thread.messages))
      .map((thread) => ({
        ...thread,
        messages: thread.messages
          .filter((message) => ["user", "assistant"].includes(message?.role) && String(message.content || "").trim())
          .slice(-24)
          .map((message) => ({ role: message.role, content: String(message.content || "").slice(0, 8000), createdAt: message.createdAt || thread.updatedAt || "" })),
      }))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .slice(0, 12);
  } catch {
    return [];
  }
}

function restoreCoachThread(binding) {
  const key = coachBindingKey(binding);
  return readCoachHistoryThreads().find((thread) => thread.key === key) || null;
}

function persistCoachThread(binding = state.help.binding, history = state.help.history) {
  const cleanMessages = (history || [])
    .filter((message) => ["user", "assistant"].includes(message?.role) && String(message.content || "").trim())
    .slice(-24)
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 8000),
      createdAt: message.createdAt || new Date().toISOString(),
    }));
  if (!binding || !cleanMessages.length) return null;
  const key = coachBindingKey(binding);
  const existing = readCoachHistoryThreads().filter((thread) => thread.key !== key);
  const item = activePracticeItemForSurface(binding.view, binding.module);
  const moduleLabel = binding.module ? moduleDisplayName(binding.module) : "AI Coach";
  const questionLabel = binding.questionId ? ` · ${String(binding.questionId).toUpperCase()}` : "";
  const thread = {
    key,
    binding: { ...binding },
    title: `${item?.title || moduleLabel}${questionLabel}`,
    messages: cleanMessages,
    contextText: String(state.help.contextText || "").slice(0, 16000),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(coachHistoryStoreKey, JSON.stringify([thread, ...existing].slice(0, 12)));
  return thread;
}

function compactLearningRecord(value) {
  return JSON.parse(JSON.stringify(value || {}, (_key, entry) => {
    if (typeof entry === "string") return entry.slice(0, 30000);
    if (entry instanceof Blob) return undefined;
    return entry;
  }));
}

async function archiveLearningAttempt(moduleName, record) {
  const authToken = state.authToken;
  const ownerIdentity = practiceCompletionIdentityKey();
  if (!authToken || !record?.attemptId) return;
  const session = activeViewId() === "single" ? readPracticeSession() : null;
  const score = moduleName === "writing"
    ? record.scores || {}
    : moduleName === "speaking"
      ? { band: record.band || "", criteria: record.criteria || record.scores || {} }
      : { correct: record.correct, total: record.total, band: record.band };
  const payload = {
    attemptId: record.attemptId,
    sessionId: session?.sessionId || "",
    module: moduleName,
    itemId: record.itemId || "",
    mode: currentSinglePracticeMode(moduleName),
    score: compactLearningRecord(score),
    result: compactLearningRecord(record),
    feedback: compactLearningRecord({ feedback: record.feedback || record.report || "" }),
    durationSeconds: Math.max(0, Number(state.singleTotal || 0) - Number(state.singleSeconds || 0)),
  };
  queuePendingLearningAttempt(payload, ownerIdentity);
  try {
    const json = await postJson("/api/learning/attempts", payload, { authToken });
    if (!completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return;
    removePendingLearningAttempt(record.attemptId, ownerIdentity);
    const ownerState = learningStateForCompletionOwner(ownerIdentity);
    const attempts = [json.attempt, ...((ownerState.attempts || []).filter((item) => item.attemptId !== json.attempt?.attemptId))].filter(Boolean).slice(0, 20);
    state.learningState = { ...ownerState, completionIdentity: ownerIdentity, attempts };
  } catch {
    // The identity-partitioned outbox retries this idempotent attempt later.
  }
}

function latestObjectiveResult(moduleName, itemId = "") {
  const history = readLearningLoopHistory();
  const exact = itemId
    ? state.latestObjectiveResultsByItem[itemId]
      || history.objectiveItems?.[itemId]
      || (state.learningState?.attempts || []).find((attempt) => {
        return attempt.module === moduleName && attempt.itemId === itemId && attempt.result && typeof attempt.result === "object";
      })?.result
    : null;
  if (exact) return exact;
  const memory = state.latestObjectiveResults[moduleName]
    || history.objective?.[moduleName]
    || (state.learningState?.attempts || []).find((attempt) => {
      if (attempt.module !== moduleName) return false;
      if (itemId && attempt.itemId && attempt.itemId !== itemId) return false;
      return attempt.result && typeof attempt.result === "object";
    })?.result
    || null;
  if (!memory) return null;
  if (itemId && memory.itemId && memory.itemId !== itemId) return null;
  return memory;
}

function rememberObjectiveResult(moduleName, item, json) {
  const details = (json?.result?.details || []).filter((entry) => entry?.correct !== null);
  const practiceScope = item?.practiceScope || "paper";
  const canonicalItemId = canonicalPracticeCompletionId(moduleName, item);
  const result = {
    attemptId: learningEntityId("attempt"),
    completionIdentity: practiceCompletionIdentityKey(),
    module: moduleName,
    itemId: canonicalItemId,
    title: item?.title || moduleDisplayName(moduleName),
    correct: Number(json?.result?.correct || 0),
    total: Number(json?.result?.scoredTotal ?? json?.result?.total ?? details.length),
    band: practiceScope === "paper" ? json?.result?.band ?? null : null,
    practiceScope,
    sourceItemId: practiceUnitBaseId(item),
    details: details.slice(0, 40),
    wrongQuestionIds: details.filter((entry) => entry.correct === false).map((entry) => entry.id || entry.qid || "").filter(Boolean),
    createdAt: new Date().toISOString(),
  };
  state.latestObjectiveResults[moduleName] = result;
  state.latestObjectiveResultsByItem[result.itemId] = result;
  updateLearningLoopHistory({ objective: { [moduleName]: result }, objectiveItems: { [result.itemId]: result } });
  rememberPracticeCompletion(moduleName, { itemId: canonicalItemId }, result);
  archiveLearningAttempt(moduleName, result);
  resolveRetestedWeakAreas(moduleName, result);
  return result;
}

function rememberWritingAttempt(attempt = {}) {
  const itemId = String(attempt.itemId || "").trim();
  const idTask = Number(itemId.match(/-task([12])$/i)?.[1]);
  const promptTask = /\btask\s*1\b|\b(chart|graph|table|map|diagram|process|letter)\b/i.test(String(attempt.prompt || "")) ? 1 : 2;
  const taskNumber = [1, 2].includes(Number(attempt.taskNumber)) ? Number(attempt.taskNumber) : ([1, 2].includes(idTask) ? idTask : promptTask);
  const value = { ...attempt, taskNumber, completionIdentity: practiceCompletionIdentityKey(), itemId, attemptId: attempt.attemptId || learningEntityId("attempt"), updatedAt: new Date().toISOString() };
  state.latestWritingAttempt = value;
  updateLearningLoopHistory({ writing: value });
  rememberPracticeCompletion("writing", { itemId: value.itemId }, value);
  archiveLearningAttempt("writing", value);
  return value;
}

function rememberSpeakingResult(result = {}) {
  const value = { ...result, completionIdentity: practiceCompletionIdentityKey(), itemId: String(result.itemId || result.topicId || "").trim(), attemptId: result.attemptId || learningEntityId("attempt"), updatedAt: new Date().toISOString() };
  state.latestSpeakingResult = value;
  updateLearningLoopHistory({ speaking: value });
  rememberPracticeCompletion("speaking", { topicId: value.topicId || value.itemId }, value);
  archiveLearningAttempt("speaking", value);
  return value;
}

function bandDeltaLabel(current, previous) {
  const currentValue = Number.parseFloat(current);
  const previousValue = Number.parseFloat(previous);
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return "";
  const delta = Math.round((currentValue - previousValue) * 2) / 2;
  if (!delta) return "No change";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
}

function singleQuestionSnapshots(item, prefix = "single") {
  const normalized = normalizeItem(item || {});
  const answers = collectAnswers(prefix);
  return (normalized.questions || []).map((question, index) => {
    const number = questionNumber(question, index);
    const id = question.id || `q${number}`;
    return {
      number,
      id,
      question: String(question.text || `Question ${number}`).slice(0, 260),
      type: String(question.type || "").slice(0, 80),
      typeLabel: String(question.typeLabel || "").slice(0, 120),
      expectedAnswer: String(question.answer || "").slice(0, 120),
      studentAnswer: String(answers[id] || "").slice(0, 120),
    };
  });
}

function currentSingleCoachContext(moduleName = state.activeModule) {
  if (!state.activeSingle || state.activeSingle.module !== moduleName) return null;
  const item = normalizeItem(state.activeSingle);
  const base = {
    module: moduleName,
    mode: "single",
    practiceMode: currentSinglePracticeMode(moduleName),
    practiceModeLabel: singleModeLabel(moduleName),
    answerPrefix: "single",
    id: item.id || "",
    sourceItemId: practiceUnitBaseId(item),
    practiceScope: item.practiceScope || "paper",
    title: item.title || "",
    source: item.source || "",
    period: item.period || "",
    questions: singleQuestionSnapshots(item, "single"),
  };
  if (moduleName === "reading") {
    return {
      ...base,
      paperText: compactText([item.readingPaper, item.passage, item.prompt].filter(Boolean).join("\n\n"), 18000),
    };
  }
  if (moduleName === "listening") {
    const scriptPayload = listeningCaptionPayload("single");
    return {
      ...base,
      activeSection: String(state.listeningCaptionState.single?.section || ""),
      audioTime: null,
      questionPaper: compactText([item.questionPaper, item.transcript, item.prompt].filter(Boolean).join("\n\n"), 16000),
      audioScript: compactText(scriptPayload?.text || item.transcript || "", 16000),
    };
  }
  if (moduleName === "writing") {
    const tasks = (item.writingTasks || [item]).filter(Boolean).map((task, index) => {
      const normalizedTask = normalizeItem(task);
      return {
        task: normalizedTask.taskType || normalizedTask.type || `Task ${index + 1}`,
        title: normalizedTask.title || "",
        prompt: compactText(normalizedTask.prompt || normalizedTask.question || "", 4000),
      };
    });
    const attempt = state.latestWritingAttempt || readLearningLoopHistory().writing || null;
    return {
      ...base,
      writingTasks: tasks,
      essay: compactText(writingEssayForTasks(item.writingTasks || [item], "single"), 20000),
      latestFeedback: compactText(attempt?.feedback || "", 16000),
      rewrite: attempt?.rewrite || null,
    };
  }
  if (moduleName === "speaking") {
    const latest = state.latestSpeakingResult || readLearningLoopHistory().speaking || null;
    return {
      ...base,
      part1: item.part1 || [],
      part2: item.part2 || "",
      part3: item.part3 || [],
      part3Topics: item.part3Topics || [],
      transcript: compactText(latest?.transcript || qwenBuildAutoScoreTranscript("single") || getSpeakingTranscript("single") || "", 18000),
      latestResult: latest,
    };
  }
  return base;
}

function latestSpeakingBandForCoach() {
  const outputs = ["singleFeedback", "examFeedback", "sequenceFeedback", "bankFeedback"]
    .map((id) => $(id)?.textContent || "")
    .filter(Boolean);
  for (const text of outputs) {
    const band = extractSpeakingBandFromText(text);
    if (band) return band;
  }
  return "";
}

function buildCoachHelpContext(extra = {}) {
  const binding = rebindCoachContext();
  const helpContext = buildHelpContext(extra);
  const moduleName = helpContext.surface?.module || helpContext.activeModule || (activeViewId() === "single" ? state.activeModule : "");
  const writingUploadContext = activeViewId() === "writing-upload" ? currentWritingUploadCoachContext() : null;
  const singleContext = writingUploadContext || currentSingleCoachContext(moduleName);
  const activeModuleName = writingUploadContext ? "writing" : moduleName;
  const localDrafts = uniqueDrafts([...(state.serverDrafts || []), ...readLocalDrafts()]).slice(0, 4);
  const weakAreas = readWeakAreas().slice(0, 6);
  const learningHistory = readLearningLoopHistory();
  const context = {
    ...helpContext,
    activeModule: activeModuleName || helpContext.activeModule,
    binding,
    coach: {
      product: "IELTSist AI Coach",
      currentModule: activeModuleName || "dashboard",
      currentSet: singleContext ? {
        id: singleContext.id,
        title: singleContext.title,
        source: singleContext.source,
        period: singleContext.period,
        practiceMode: singleContext.practiceMode || "",
        practiceModeLabel: singleContext.practiceModeLabel || "",
      } : null,
      recentDrafts: localDrafts.map((draft) => ({
        module: draft.module || "",
        title: draft.title || "",
        updatedAt: draft.updatedAt || draft.updated_at || "",
      })),
      vocabularyCount: (state.vocabItems || []).length,
      weakAreas,
      focusedQuestion: helpContext.surface?.focusedQuestion || null,
      latestObjectiveResults: learningHistory.objective || {},
      latestWriting: state.latestWritingAttempt || learningHistory.writing || null,
      latestSpeaking: state.latestSpeakingResult || learningHistory.speaking || null,
      systemGuide: "Guide students through IELTSist when they ask how to use the product: Dashboard/AI Coach for today's plan; Practice for single Listening with AI, Reading with AI, Writing with AI and Speaking with AI topics; Simulation for Same test and Random exam; Writing with AI for custom tasks or Cambridge sets; Mine for drafts, vocabulary and membership. Recommended workflow: start the recommended practice -> submit or finish -> read AI explanation/report -> save vocabulary or weak area -> retest.",
      answerStyle: "For system questions, explain the relevant IELTSist workflow first. For answer explanations, show: question keywords -> paper/audio evidence -> correct answer -> how to catch it next time. If evidence is missing, say so instead of inventing it.",
    },
  };
  if (!context.reading && moduleName === "reading" && singleContext) context.reading = singleContext;
  if (!context.listening && moduleName === "listening" && singleContext) context.listening = singleContext;
  if (activeModuleName === "writing" && singleContext) context.writing = singleContext;
  if (moduleName === "speaking" && singleContext) context.speaking = singleContext;
  return JSON.parse(JSON.stringify(context, (_key, value) => {
    if (typeof value === "string") return value.slice(0, 20000);
    return value;
  }));
}

async function hydrateCoachEvidenceContext(context) {
  const reading = context?.reading;
  const id = practiceUnitBaseId(reading);
  const focusedQuestion = Number(
    context?.coach?.focusedQuestion?.number
    || context?.surface?.focusedQuestion?.number
    || 0,
  );
  if (reading && id && (focusedQuestion || !reading.paperText)) {
    try {
      const cacheKey = `${id}:${focusedQuestion || "all"}`;
      if (!state.readingContextCache[cacheKey]) {
        const questionQuery = focusedQuestion ? `&question=${encodeURIComponent(focusedQuestion)}` : "";
        state.readingContextCache[cacheKey] = await getJson(`/api/reading/context?id=${encodeURIComponent(id)}${questionQuery}`);
      }
      const payload = state.readingContextCache[cacheKey];
      const hydratedQuestionText = String(payload?.questionText || "").trim();
      const questions = (reading.questions || []).map((question) => {
        if (!hydratedQuestionText || Number(question.number || 0) !== focusedQuestion) return question;
        return { ...question, question: hydratedQuestionText.slice(0, 2000) };
      });
      context.reading = {
        ...reading,
        questions,
        questionText: hydratedQuestionText.slice(0, 2000),
        paperText: String(payload?.paperText || "").slice(0, 120000),
        evidenceAvailable: Boolean(payload?.evidenceAvailable && payload?.paperText),
        passage: payload?.passage || null,
        passageStartPage: payload?.passageStartPage || null,
        questionPage: payload?.questionPage || null,
      };
    } catch {
      context.reading = { ...reading, evidenceAvailable: false };
    }
  }
  const listening = context?.listening;
  const listeningId = practiceUnitBaseId(listening);
  if (listening && !listening.audioScript && listeningId) {
    try {
      const payload = await postJson("/api/listening/scripts", { id: listeningId, pageImageUrls: [], allowOcr: false });
      context.listening = {
        ...listening,
        questionPaper: compactText(listening.questionPaper || payload?.questionPaper || "", 30000),
        audioScript: compactText(payload?.text || "", 30000),
        sections: Array.isArray(payload?.sections) ? payload.sections.slice(0, 4) : [],
        evidenceAvailable: Boolean(payload?.available && payload?.text),
      };
    } catch {
      context.listening = { ...listening, evidenceAvailable: false };
    }
  }
  return context;
}

function coachContextChipHtml(label, detail, tone = "") {
  return `<span class="coach-context-chip ${tone ? `tone-${escapeHtml(tone)}` : ""}">
    <strong>${escapeHtml(label)}</strong>
    <em>${escapeHtml(detail)}</em>
  </span>`;
}

function renderCoachContextChips() {
  const node = $("coachContextChips");
  if (!node) return;
  const moduleName = state.activeModule || "listening";
  const item = state.activeSingle ? normalizeItem(state.activeSingle) : null;
  const chips = [
    coachContextChipHtml(`Current ${moduleDisplayName(moduleName)}`, item?.title || "No active paper yet", "primary"),
  ];
  const answered = answeredCountForPrefix("single");
  if (answered) chips.push(coachContextChipHtml("Answered", `${answered} response${answered === 1 ? "" : "s"}`, "blue"));
  const draft = uniqueDrafts([...(state.serverDrafts || []), ...readLocalDrafts()]).find((item) => /writing/i.test(item.module || item.title || ""));
  if (draft) chips.push(coachContextChipHtml("Last Writing", draft.title || "Writing draft", "purple"));
  const speakingBand = latestSpeakingBandForCoach();
  if (speakingBand) chips.push(coachContextChipHtml("Speaking Band", speakingBand, "green"));
  const weakAreas = readWeakAreas();
  if (weakAreas.length) chips.push(coachContextChipHtml("Weak Areas", `${weakAreas.length} saved`, "orange"));
  node.innerHTML = chips.join("");
}

function setCoachStatus(text) {
  const node = $("coachStatus");
  if (node) node.textContent = text || "";
}

function updateCoachAttachmentPreview() {
  const preview = $("coachAttachmentPreview");
  if (!preview) return;
  preview.hidden = !state.coach.pendingImageDataUrl;
}

function setCoachMessageContent(item, role, text) {
  if (!item) return;
  if (role === "user") {
    item.innerHTML = `<p>${escapeHtml(text || "")}</p>`;
    return;
  }
  item.innerHTML = `<div class="help-rich">${renderHelpRichText(text || "")}</div>`;
}

function addCoachMessage(role, text, options = {}) {
  const log = $("coachChatLog");
  if (!log) return null;
  const item = document.createElement("div");
  item.className = `coach-message ${role === "user" ? "user" : "assistant"}`;
  setCoachMessageContent(item, role, text);
  if (options.attachment) {
    const badge = document.createElement("span");
    badge.className = "coach-attachment-badge";
    badge.textContent = "Screenshot attached";
    item.appendChild(badge);
  }
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
  return item;
}

function renderCoach() {
  renderCoachContextChips();
  updateCoachAttachmentPreview();
  const log = $("coachChatLog");
  if (log && !log.dataset.ready) {
    log.innerHTML = "";
    const history = state.coach.history.slice(-8);
    if (history.length) {
      history.forEach((message) => addCoachMessage(message.role === "user" ? "user" : "assistant", message.content || ""));
    } else {
      addCoachMessage("assistant", "Ask me how to use IELTS-ist, where to start today, why an answer is correct, or attach a screenshot. I can guide you through Practice, Simulation, Writing with AI, Speaking with AI topics, drafts, vocabulary, and retests.");
    }
    log.dataset.ready = "1";
  }
  bindCoachControls(document);
}

function attachCoachImage(imageDataUrl) {
  state.coach.pendingImageDataUrl = imageDataUrl || "";
  updateCoachAttachmentPreview();
  setCoachStatus(state.coach.pendingImageDataUrl ? "Screenshot attached" : "Ready");
  if (activeViewId() !== "home") activateView("home", true);
  setTimeout(() => $("dashboardCoachCard")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
}

async function sendCoachMessage(message) {
  const clean = String(message || "").trim();
  const imageDataUrl = state.coach.pendingImageDataUrl || "";
  if (!clean && !imageDataUrl) return;
  if (state.coach.busy) return;
  state.coach.busy = true;
  addCoachMessage("user", clean || "Please explain this screenshot.", { attachment: Boolean(imageDataUrl) });
  const pending = addCoachMessage("assistant", "Thinking...");
  setCoachStatus("Thinking");
  try {
    const helpContext = await hydrateCoachEvidenceContext(buildCoachHelpContext());
    const json = await postJson("/api/help/chat", {
      contextText: state.coach.contextText,
      helpContext,
      history: state.coach.history.slice(-8),
      imageDataUrl,
      message: clean || "Please explain this screenshot and give me the evidence chain.",
    });
    const answer = json.answer || "";
    setCoachMessageContent(pending, "assistant", answer || "I could not find enough evidence. Try attaching the question area or typing the question number.");
    if (json.ocrText) state.coach.contextText = [state.coach.contextText, json.ocrText].filter(Boolean).join("\n\n");
    state.coach.history.push({ role: "user", content: clean || "[Screenshot attached]" }, { role: "assistant", content: answer });
    state.coach.pendingImageDataUrl = "";
    state.coach.lastAnswer = answer;
    state.coach.lastModule = helpContext.activeModule || state.activeModule || "";
    updateCoachAttachmentPreview();
    renderCoachContextChips();
    setCoachStatus(helpResponseStatus(json.mode));
  } catch (error) {
    setCoachMessageContent(pending, "assistant", coachRequestFailureMessage());
    setCoachStatus("Error");
  } finally {
    state.coach.busy = false;
  }
}

async function saveCoachVocabulary() {
  const selection = String(window.getSelection?.() || "").trim();
  const fallbackText = selection || cleanReviewText(state.coach.lastAnswer).split(/\s+/).slice(0, 8).join(" ");
  const term = window.prompt("Save which word, sentence, or paragraph?", fallbackText);
  if (!term) return;
  const kind = classifyVocabularyText(term);
  if (!state.authToken) {
    alert("Please log in first, then save vocabulary to Mine.");
    activateView("mine", true);
    return;
  }
  await postJson("/api/vocabulary", {
    term: cleanReviewText(term),
    context: cleanReviewText(state.coach.contextText || state.coach.lastAnswer),
    explanation: compactText(state.coach.lastAnswer || state.coach.contextText, kind === "paragraph" ? 260 : 180),
    source: `Coach:${kind}`,
  });
  await refreshMineData();
  setCoachStatus("Saved");
}

function addCoachWeakArea() {
  const moduleName = state.coach.lastModule || state.activeModule || "practice";
  const item = state.activeSingle ? normalizeItem(state.activeSingle) : null;
  const summary = compactText(state.coach.lastAnswer || `Review ${moduleDisplayName(moduleName)} evidence and retest.`, 180);
  const areas = readWeakAreas().filter((entry) => entry.summary !== summary);
  areas.unshift({
    id: `weak-${Date.now()}`,
    module: moduleName,
    title: item?.title || moduleDisplayName(moduleName),
    summary,
    createdAt: new Date().toISOString(),
  });
  writeWeakAreas(areas);
  syncWeakArea(areas[0]);
  renderCoachContextChips();
  setCoachStatus("Weak area saved");
}

function retestCoachSkill() {
  const moduleName = state.coach.lastModule || state.activeModule || "listening";
  if (["listening", "reading", "writing", "speaking"].includes(moduleName)) activateSingleModule(moduleName, true);
}

function runCoachQuickAction(kind) {
  openGlobalCoachPanel();
  const input = $("helpChatInput");
  const prompts = {
    explain: "Explain my current question with this chain: question keywords -> paper/audio evidence -> correct answer -> how to catch it next time.",
    translate: "Break down the selected sentence or screenshot. Give a natural translation, key words, and why it matters for IELTS.",
    plan: "Use my recent wrong answers, writing feedback, speaking score and vocabulary notes to decide what I should practise today.",
  };
  if (kind === "capture") {
    beginHelpCapture("attach");
    return;
  }
  if (input) {
    input.value = prompts[kind] || "";
    input.focus();
  }
}

function bindCoachControls(root = document) {
  const form = $("coachChatForm");
  if (form && form.dataset.boundCoachForm !== "1") {
    form.dataset.boundCoachForm = "1";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = $("coachChatInput");
      const message = input?.value || "";
      if (input) input.value = "";
      await sendCoachMessage(message);
    });
  }
  const attach = $("coachAttachButton");
  if (attach && attach.dataset.boundCoachAttach !== "1") {
    attach.dataset.boundCoachAttach = "1";
    attach.addEventListener("click", () => beginHelpCapture("coach-attach"));
  }
  const clear = $("coachAttachmentClear");
  if (clear && clear.dataset.boundCoachClear !== "1") {
    clear.dataset.boundCoachClear = "1";
    clear.addEventListener("click", () => {
      state.coach.pendingImageDataUrl = "";
      updateCoachAttachmentPreview();
      setCoachStatus("Ready");
    });
  }
  root.querySelectorAll?.("[data-coach-action]").forEach((button) => {
    if (button.dataset.boundCoachAction === "1") return;
    button.dataset.boundCoachAction = "1";
    button.addEventListener("click", async () => {
      const action = button.dataset.coachAction;
      if (action === "capture") beginHelpCapture("coach-attach");
      if (action === "save-vocab") await saveCoachVocabulary();
      if (action === "weak-area") addCoachWeakArea();
      if (action === "retest") retestCoachSkill();
    });
  });
  root.querySelectorAll?.("[data-coach-quick]").forEach((button) => {
    if (button.dataset.boundCoachQuick === "1") return;
    button.dataset.boundCoachQuick = "1";
    button.addEventListener("click", () => runCoachQuickAction(button.dataset.coachQuick));
  });
  root.querySelectorAll?.("[data-global-coach-open]").forEach((button) => {
    if (button.dataset.boundGlobalCoachOpen === "1") return;
    button.dataset.boundGlobalCoachOpen = "1";
    button.addEventListener("click", openGlobalCoachPanel);
  });
}

function mineLearningAttempts() {
  const history = readLearningLoopHistory();
  const localAttempts = [
    ...Object.values(history.objective || {}),
    ...[history.writing, ...(history.writingAttempts || [])].filter(Boolean).map((attempt) => ({ module: "writing", ...attempt })),
    history.speaking ? { module: "speaking", ...history.speaking } : null,
  ].filter(Boolean);
  const attempts = [...(state.learningState?.attempts || []), ...localAttempts];
  const seen = new Set();
  return attempts.filter((attempt) => {
    const key = attempt.attemptId || `${attempt.module}:${attempt.itemId || attempt.title || "attempt"}:${attempt.submittedAt || attempt.updatedAt || attempt.createdAt || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => String(b.submittedAt || b.updatedAt || b.createdAt || "").localeCompare(String(a.submittedAt || a.updatedAt || a.createdAt || "")));
}

function mineWeakAreas() {
  const all = [...(state.learningState?.weakAreas || []), ...readWeakAreas()];
  const seen = new Set();
  return all.filter((area) => {
    const key = area.id || `${area.module}:${area.questionId || ""}:${area.summary || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mineAttemptResult(attempt) {
  return attempt?.result && typeof attempt.result === "object" ? attempt.result : attempt || {};
}

function mineAttemptWrongCount(attempt) {
  const result = mineAttemptResult(attempt);
  if (Array.isArray(result.details)) return result.details.filter((detail) => detail.correct === false).length;
  const total = Number(result.total ?? attempt?.score?.total);
  const correct = Number(result.correct ?? attempt?.score?.correct);
  return Number.isFinite(total) && Number.isFinite(correct) ? Math.max(0, total - correct) : 0;
}

function mineAttemptScore(attempt) {
  const result = mineAttemptResult(attempt);
  const score = attempt?.score || {};
  const band = normalizeSpeakingBand(result.band || score.band || result.scores?.overall || result.scores?.Overall || "");
  if (band) return `Band ${band}`;
  const correct = Number(result.correct ?? score.correct);
  const total = Number(result.total ?? score.total);
  if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) return `${correct}/${total}`;
  return "Feedback saved";
}

function renderMineLearningAssets() {
  const attempts = mineLearningAttempts();
  const weakAreas = mineWeakAreas();
  const activeWeakAreas = weakAreas.filter((area) => area.status !== "resolved");
  const resolvedWeakAreas = weakAreas.filter((area) => area.status === "resolved");
  const wrongAnswers = attempts.reduce((total, attempt) => total + mineAttemptWrongCount(attempt), 0);
  const weakRows = activeWeakAreas.slice(0, 5).map((area) => {
    const moduleName = ["listening", "reading", "writing", "speaking"].includes(area.module) ? area.module : "reading";
    return `<article class="mine-learning-row">
      <span class="mine-learning-module tone-${escapeHtml(moduleName)}">${escapeHtml(moduleName.slice(0, 1).toUpperCase())}</span>
      <div><strong>${escapeHtml(moduleDisplayName(moduleName))}${area.questionId ? ` · ${escapeHtml(String(area.questionId).toUpperCase())}` : ""}</strong><p>${escapeHtml(compactText(area.summary || "Saved weak area", 130))}</p></div>
      <button class="secondary small-button" type="button" data-mine-learning-action="retest" data-module="${escapeHtml(moduleName)}">Retest</button>
    </article>`;
  }).join("");
  const attemptRows = attempts.slice(0, 6).map((attempt) => {
    const result = mineAttemptResult(attempt);
    const moduleName = ["listening", "reading", "writing", "speaking"].includes(attempt.module || result.module) ? (attempt.module || result.module) : "reading";
    const wrong = mineAttemptWrongCount(attempt);
    const dateValue = attempt.submittedAt || result.updatedAt || result.createdAt || "";
    const dateLabel = dateValue ? new Date(dateValue).toLocaleDateString() : "Saved";
    return `<article class="mine-learning-row attempt-row">
      <span class="mine-learning-module tone-${escapeHtml(moduleName)}">${escapeHtml(moduleName.slice(0, 1).toUpperCase())}</span>
      <div><strong>${escapeHtml(moduleDisplayName(moduleName))} · ${escapeHtml(mineAttemptScore(attempt))}</strong><p>${wrong ? `${wrong} wrong answer${wrong === 1 ? "" : "s"}` : "Report available"} · ${escapeHtml(dateLabel)}</p></div>
      <button class="secondary small-button" type="button" data-mine-learning-action="coach" data-module="${escapeHtml(moduleName)}" data-wrong-count="${wrong}">Review</button>
    </article>`;
  }).join("");
  return `<section class="panel mine-card mine-learning-assets">
    <div class="mine-section-head"><div><span class="eyebrow">Learning assets</span><h3>Your AI learning record</h3></div><span>${attempts.length + weakAreas.length} items</span></div>
    <div class="mine-learning-stats" aria-label="Learning asset summary">
      <span><strong>${activeWeakAreas.length}</strong>Weak areas</span>
      <span><strong>${wrongAnswers}</strong>Wrong answers</span>
      <span><strong>${attempts.length}</strong>Recent attempts</span>
      <span><strong>${resolvedWeakAreas.length}</strong>Retest history</span>
    </div>
    <div class="mine-learning-columns">
      <section><header><h4>Weak areas</h4><small>${activeWeakAreas.length} active</small></header>${weakRows || `<div class="empty-list compact-empty">No weak area saved yet.</div>`}</section>
      <section><header><h4>Recent attempts</h4><small>${attempts.length} saved</small></header>${attemptRows || `<div class="empty-list compact-empty">Finish one practice to create your first report.</div>`}</section>
    </div>
  </section>`;
}

function renderMine() {
  const node = $("mineContent");
  if (!node) return;
  const localDrafts = readLocalDrafts();
  const allDrafts = uniqueDrafts([...state.serverDrafts, ...localDrafts]);
  const vocabItems = state.vocabItems || [];
  const likedTopics = likedSpeakingTopicGroups();
  if (!state.currentUser) {
    node.innerHTML = `
      <section class="panel auth-panel mine-auth-card">
        <div class="panel-head">
          <div>
            <h3>Login or register</h3>
            <p>Keep drafts, vocabulary and membership on this device.</p>
          </div>
        </div>
        <form id="authForm" class="auth-form">
          <input id="authUsername" class="text-input" autocomplete="username" placeholder="Username: 3-24 lowercase letters/numbers/_" />
          <input id="authPassword" class="text-input spaced" type="password" autocomplete="current-password" placeholder="Password" />
          <div class="actions">
            <button id="loginUser" class="primary" type="submit">Login</button>
            <button id="registerUser" class="secondary" type="button">Register</button>
          </div>
        </form>
        <div id="authMessage" class="compact-notice"></div>
      </section>
      <section class="panel mine-card mine-draft-card">
        <div class="mine-section-head"><h3>Device Draft Box</h3><span>${localDrafts.length} items</span></div>
        ${renderDraftList(localDrafts, "local")}
      </section>`;
    bindMineControls();
    return;
  }
  node.innerHTML = `
    <section class="mine-workspace-main">
      <section class="panel mine-card mine-account-card">
        <div class="mine-section-head">
          <h3>Account Overview</h3>
          <button id="logoutUser" class="secondary small-button">Logout</button>
        </div>
        <div class="membership-card workspace-plan-card">
          <div class="mine-plan-row">
            <div class="mine-plan-icon">I</div>
            <div>
              <span>Active Plan</span>
              <strong>${escapeHtml(membershipPlanTitle())}</strong>
              <p>${escapeHtml(membershipLabel())}</p>
            </div>
            <button class="secondary small-button mine-quick-action" type="button" data-mine-action="plans">View Plans</button>
          </div>
          <div class="mine-plan-validity">
            <span>Membership</span>
            <strong>${escapeHtml(membershipExpiryTitle())}</strong>
          </div>
        </div>
        <label class="mine-redeem-label" for="redeemCode">Redemption Code</label>
        <div class="redeem-row">
          <input id="redeemCode" class="text-input" placeholder="Enter redemption code" />
          <button id="redeemCodeButton" class="primary">Redeem</button>
        </div>
        <div id="redeemMessage" class="compact-notice"></div>
      </section>
      <section class="panel mine-card mine-vocab-card">
        <div class="mine-section-head"><h3>Vocabulary Notebook</h3><span>${vocabItems.length} items</span></div>
        ${renderVocabularyList(vocabItems)}
      </section>
      <section class="panel mine-card mine-like-card">
        <div class="mine-section-head"><h3>Like Topics</h3><span>${likedTopics.length} items</span></div>
        ${renderLikedTopicList(likedTopics)}
      </section>
    </section>
    <aside class="panel mine-card mine-draft-card">
      <div class="mine-section-head">
        <h3>Draft Box</h3>
        <div class="mine-head-actions">
          <span>${allDrafts.length} items</span>
          <button id="syncDraftsNow" class="secondary small-button">Sync Now</button>
        </div>
      </div>
      ${renderDraftList(allDrafts, "mixed")}
    </aside>
    ${renderMineLearningAssets()}
    <section class="panel mine-card mine-quick-actions">
      <div>
        <h3>Quick Actions</h3>
        <p>Jump back into practice or review saved study materials.</p>
      </div>
      <div class="mine-action-grid">
        ${renderMineAction("Speaking with AI", "Choose a topic and talk with the examiner", "bank", "purple")}
        ${renderMineAction("Writing with AI", "Choose Task 1 charts or Task 2 topics", "writing-upload", "blue")}
        ${renderMineAction("Vocabulary Notebook", "Review saved vocabulary", "vocabulary", "orange")}
      </div>
    </section>`;
  bindMineControls();
}

function renderLikedTopicList(items) {
  if (!items.length) return `<div class="empty-list compact-empty">No liked topics yet. Tap the heart on a speaking topic card.</div>`;
  return `<div class="liked-topic-list">${items.slice(0, 12).map((group) => {
    const chips = group.related.slice(0, 2).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
    return `<article class="liked-topic-item">
      <div class="topic-icon topic-emoji topic-accent-${escapeHtml(group.accent)}" aria-hidden="true">${escapeHtml(group.emoji)}</div>
      <div>
        <strong>${escapeHtml(group.title)}</strong>
        <div class="topic-keywords">${chips}</div>
        <small>${escapeHtml(group.items.length)} sets</small>
      </div>
      <button class="primary small-button practice-liked-topic" type="button" data-group-id="${escapeHtml(group.id)}">Choose</button>
    </article>`;
  }).join("")}</div>`;
}

function renderMineAction(title, subtitle, action, tone) {
  return `<button class="mine-action-card mine-action-${escapeHtml(tone)}" type="button" data-mine-action="${escapeHtml(action)}">
    <span>${escapeHtml(title.slice(0, 1).toUpperCase())}</span>
    <strong>${escapeHtml(title)}</strong>
    <em>${escapeHtml(subtitle)}</em>
  </button>`;
}

function loadCoreVocabularyKnown() {
  try {
    const values = JSON.parse(localStorage.getItem(coreVocabularyStoreKey) || "[]");
    state.vocabularyReview.known = new Set(Array.isArray(values) ? values : []);
  } catch {
    state.vocabularyReview.known = new Set();
  }
}

function saveCoreVocabularyKnown() {
  localStorage.setItem(coreVocabularyStoreKey, JSON.stringify([...state.vocabularyReview.known]));
}

async function ensureIeltsCoreVocabularyLoaded() {
  if (ieltsCoreVocabularyLoadPromise) return ieltsCoreVocabularyLoadPromise;
  ieltsCoreVocabularyLoadPromise = fetch("/data/ielts-core-vocabulary.json?v=20260806-2", { cache: "no-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Vocabulary catalog returned ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const normalizedItems = items.filter((item) => item && item.word && item.meaning && item.definition).map((item) => ({
        ...item,
        subject: "ielts",
        topic: String(item.topic || "ielts-core"),
        topicLabel: String(item.topicLabel || "IELTS Core"),
        type: ["term", "command", "phrase"].includes(item.type) ? item.type : "term",
        collocations: Array.isArray(item.collocations) ? item.collocations.slice(0, 8) : [],
      }));
      if (normalizedItems.length < 150) throw new Error("IELTS Core vocabulary catalog is incomplete");
      ieltsCoreVocabulary = normalizedItems;
      if (activeViewId() === "vocabulary") renderVocabularyTrainer();
      return normalizedItems;
    })
    .catch(() => ieltsCoreVocabulary)
    .finally(() => {
      ieltsCoreVocabularyLoadPromise = null;
    });
  return ieltsCoreVocabularyLoadPromise;
}

function normalizedCoreVocabularyItems() {
  const ieltsItems = ieltsCoreVocabulary.map((item, index) => ({
    ...item,
    id: `ielts-core-${index + 1}`,
    subject: "ielts",
    topic: "ielts-core",
    topicLabel: "IELTS Core",
    type: "term",
    definition: item.definition || "A high-frequency word used in IELTS questions, answers, or academic writing.",
    translation: item.translation || "",
  }));
  return [...ieltsItems, ...alevelStemVocabulary];
}

function vocabularyItemKey(item) {
  return item?.subject === "ielts" ? String(item.word || "") : String(item?.id || item?.word || "");
}

function vocabularySubjectLabel(subject) {
  return {
    all: "All subjects",
    ielts: "IELTS Core",
    physics: "A-Level Physics",
    mathematics: "A-Level Mathematics",
    chemistry: "A-Level Chemistry",
    economics: "A-Level Economics",
    "exam-language": "Exam Language",
  }[subject] || "Core vocabulary";
}

function vocabularyTypeLabel(type) {
  return { all: "All types", term: "Term", command: "Command word", phrase: "Question sentence" }[type] || "Term";
}

function vocabularyExampleLabel(item) {
  if (item?.type === "phrase") return "Question sentence / 题目句";
  if (item?.subject && item.subject !== "ielts") return "Exam sentence / 题目句";
  return "Example sentence / 例句";
}

function filteredCoreVocabulary() {
  const review = state.vocabularyReview;
  const query = String(review.query || "").trim().toLowerCase();
  return normalizedCoreVocabularyItems().filter((item) => {
    if (review.subject !== "all" && item.subject !== review.subject) return false;
    if (review.topic !== "all" && item.topic !== review.topic) return false;
    if (review.type !== "all" && item.type !== review.type) return false;
    if (!query) return true;
    return [item.word, item.meaning, item.definition, item.cn, item.formula, item.knowledgePoint, item.example, item.translation, ...(item.collocations || [])]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

async function ensureAlevelVocabularyLoaded() {
  if (state.vocabularyReview.loaded) return alevelStemVocabulary;
  if (alevelVocabularyLoadPromise) return alevelVocabularyLoadPromise;
  state.vocabularyReview.loading = true;
  state.vocabularyReview.error = "";
  alevelVocabularyLoadPromise = fetch("/data/alevel-stem-vocabulary.json?v=20260806-2", { cache: "no-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Vocabulary catalog returned ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      alevelStemVocabulary = items.filter((item) => item && item.id && item.word && item.meaning).map((item) => ({
        ...item,
        collocations: Array.isArray(item.collocations) ? item.collocations.slice(0, 8) : [],
      }));
      if (alevelStemVocabulary.length < 300) throw new Error("Vocabulary catalog is incomplete");
      state.vocabularyReview.loaded = true;
      return alevelStemVocabulary;
    })
    .catch((error) => {
      state.vocabularyReview.error = error.message || "A-Level vocabulary could not load";
      return [];
    })
    .finally(() => {
      state.vocabularyReview.loading = false;
      alevelVocabularyLoadPromise = null;
      if (activeViewId() === "vocabulary") renderVocabularyTrainer();
    });
  return alevelVocabularyLoadPromise;
}

function currentCoreVocabularyItem() {
  const deck = filteredCoreVocabulary();
  const index = Math.max(0, Math.min(deck.length - 1, state.vocabularyReview.index || 0));
  state.vocabularyReview.index = index;
  return deck[index] || null;
}

function renderVocabularyImportPanel() {
  const importSubjects = ["mathematics", "physics", "chemistry", "economics", "exam-language"];
  const selectedSubject = importSubjects.includes(state.vocabularyReview.subject) ? state.vocabularyReview.subject : "chemistry";
  const selectedTopic = state.vocabularyReview.topic && state.vocabularyReview.topic !== "all" ? state.vocabularyReview.topic : "uploaded-terms";
  return `<section class="vocab-import-panel" aria-label="Upload professional vocabulary">
    <div class="vocab-import-head">
      <div>
        <span class="eyebrow">Professional terms</span>
        <h3>Upload terminology</h3>
      </div>
      <small>${state.authToken ? "Saved to Mine vocabulary notebook" : "Login required to save"}</small>
    </div>
    <p class="vocab-import-intro">Each professional term is saved as a concept card: Chinese name, definition, optional formula, knowledge point, exam sentence and Chinese translation.</p>
    <div class="vocab-import-grid">
      <label><span>Subject</span><select id="vocabImportSubject">
        ${importSubjects.map((subject) => `<option value="${escapeHtml(subject)}" ${selectedSubject === subject ? "selected" : ""}>${escapeHtml(vocabularySubjectLabel(subject))}</option>`).join("")}
      </select></label>
      <label><span>Topic</span><input id="vocabImportTopic" type="text" value="${escapeHtml(selectedTopic)}" placeholder="e.g. vectors, organic chemistry" /></label>
      <label><span>Upload file</span><input id="vocabImportFile" type="file" accept=".txt,.csv,.tsv,text/plain,text/csv" /></label>
      <label class="vocab-import-text"><span>Terms</span><textarea id="vocabImportInput" rows="5" placeholder="vector | 向量 | a quantity with magnitude and direction | | It has both size and direction; resolve into components when needed. | A velocity vector must include both speed and direction. | 速度向量必须同时包含大小和方向。 | column vector;resultant vector"></textarea></label>
    </div>
    <div class="vocab-import-format"><strong>Format</strong><code>term | 中文名 | definition | formula(optional) | knowledge point | exam sentence | 中文翻译 | collocations</code><span>Use one line per term. TXT, TSV and CSV are supported.</span></div>
    <div class="vocab-import-actions">
      <button id="vocabImportSample" class="secondary small-button" type="button">Fill sample</button>
      <button id="vocabImportSubmit" class="primary small-button" type="button">Import terms</button>
      <span id="vocabImportStatus" class="compact-notice"></span>
    </div>
  </section>`;
}

function renderVocabularyHub(allItems, subjectCounts) {
  const loadedLabel = alevelStemVocabulary.length ? `${alevelStemVocabulary.length} A-Level entries loaded` : "Loading vocabulary catalog...";
  return `<section class="vocab-hub-shell">
    <header class="vocab-hub-head">
      <div>
        <span class="eyebrow">Vocabulary</span>
        <h3>Choose a path</h3>
        <p>Review the full deck, upload professional terms, or open your saved notebook.</p>
      </div>
      <span class="vocab-catalog-status">${escapeHtml(loadedLabel)}</span>
    </header>
    <div class="vocab-hub-grid">
      <button class="vocab-hub-card" type="button" data-vocab-page="review">
        <strong>Review deck</strong>
        <span>IELTS Core + A-Level mathematics, physics, chemistry, economics and exam-language</span>
        <em>${allItems.length} items · filters, search and spaced review</em>
      </button>
      <button class="vocab-hub-card" type="button" data-vocab-page="import">
        <strong>Upload terms</strong>
        <span>One entry for professional vocabulary import only</span>
        <em>Definition, formula, knowledge point and exam sentence</em>
      </button>
      <button class="vocab-hub-card" type="button" data-vocab-mine>
        <strong>Mine notebook</strong>
        <span>Saved vocabulary, weak-area notes and imported term cards</span>
        <em>${state.authToken ? "Signed in" : "Login required"} · ${state.vocabItems?.length || 0} notes</em>
      </button>
    </div>
    <div class="vocab-hub-stats">
      <span>IELTS Core <strong>${allItems.filter((item) => item.subject === "ielts").length}</strong></span>
      <span>Physics <strong>${subjectCounts.physics || 0}</strong></span>
      <span>Mathematics <strong>${subjectCounts.mathematics || 0}</strong></span>
      <span>Chemistry <strong>${subjectCounts.chemistry || 0}</strong></span>
      <span>Economics <strong>${subjectCounts.economics || 0}</strong></span>
    </div>
  </section>`;
}

function renderVocabularyReviewPage(allItems, subjectCounts, deck, item, knownCount, revealed, deckPosition, subjects, availableTopics, catalogStatus, miniItems, miniStart) {
  return `<section class="vocab-trainer-shell">
    <div class="vocab-library-toolbar" aria-label="Vocabulary filters">
      <button class="secondary small-button vocab-back-button" type="button" data-vocab-back>← Back to hub</button>
      <label><span>Subject</span><select id="vocabSubjectFilter">
        ${subjects.map((subject) => `<option value="${escapeHtml(subject)}" ${state.vocabularyReview.subject === subject ? "selected" : ""}>${escapeHtml(vocabularySubjectLabel(subject))}${subject === "all" ? ` (${allItems.length})` : ` (${subjectCounts[subject] || 0})`}</option>`).join("")}
      </select></label>
      <label><span>Topic</span><select id="vocabTopicFilter">
        <option value="all">All topics</option>
        ${availableTopics.map(([topic, label]) => `<option value="${escapeHtml(topic)}" ${state.vocabularyReview.topic === topic ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      </select></label>
      <label><span>Type</span><select id="vocabTypeFilter">
        ${["all", "term", "command", "phrase"].map((type) => `<option value="${type}" ${state.vocabularyReview.type === type ? "selected" : ""}>${escapeHtml(vocabularyTypeLabel(type))}</option>`).join("")}
      </select></label>
      <label class="vocab-search-label"><span>Search</span><input id="vocabSearch" type="search" value="${escapeHtml(state.vocabularyReview.query)}" placeholder="Search term, 中文, example..." /></label>
      ${catalogStatus}
    </div>
    ${item ? `<article class="vocab-review-card ${revealed ? "is-revealed" : ""}">
      <div class="vocab-review-top">
        <span class="eyebrow">${escapeHtml(vocabularySubjectLabel(item.subject))} · ${escapeHtml(item.topicLabel || item.topic || "Core")}</span>
        <strong>${escapeHtml(deckPosition)}</strong>
      </div>
      <div class="vocab-word-face ${item.type === "phrase" || String(item.word).length > 26 ? "is-phrase" : ""}">
        <h3>${escapeHtml(item.word)}</h3>
        <p>${escapeHtml(item.phonetic || vocabularyTypeLabel(item.type))}</p>
      </div>
      <div class="vocab-reveal-action">
        <button id="vocabReveal" class="primary" type="button" aria-controls="vocabMeaning" aria-expanded="${revealed ? "true" : "false"}">${revealed ? "Hide meaning" : "Show meaning"}</button>
      </div>
      <div id="vocabMeaning" class="vocab-meaning-face" ${revealed ? "" : "hidden"}>
        <strong>${escapeHtml(item.meaning)}</strong>
        ${item.definition ? `<div class="vocab-field"><span class="vocab-field-label">Definition</span><p class="vocab-definition" lang="en">${escapeHtml(item.definition)}</p></div>` : ""}
        ${item.formula ? `<div class="vocab-field vocab-formula-field"><span class="vocab-field-label">Formula / equation</span><p class="vocab-formula" lang="en">${escapeHtml(item.formula)}</p></div>` : ""}
        ${item.knowledgePoint ? `<div class="vocab-field"><span class="vocab-field-label">Knowledge point</span><p>${escapeHtml(item.knowledgePoint)}</p></div>` : ""}
        <div class="vocab-field"><span class="vocab-field-label">中文解释</span><p>${escapeHtml(item.cn)}</p></div>
        <div class="vocab-example-pair">
          <span class="vocab-field-label">${escapeHtml(vocabularyExampleLabel(item))}</span>
          <blockquote lang="en">${escapeHtml(item.example)}</blockquote>
          ${item.translation ? `<p lang="zh-CN"><span class="vocab-field-label">中文翻译</span>${escapeHtml(item.translation)}</p>` : ""}
        </div>
        <div class="vocab-collocations">
          ${(item.collocations || []).map((phrase) => `<span>${escapeHtml(phrase)}</span>`).join("")}
        </div>
      </div>
      <div class="vocab-review-actions">
        <button id="vocabAgain" class="secondary" type="button">Again</button>
        <button id="vocabKnown" class="secondary" type="button">Know it</button>
      </div>
    </article>` : `<article class="vocab-review-card vocab-empty-state"><strong>No vocabulary matches these filters.</strong><p>Try another subject, topic, type, or clear the search.</p><button class="secondary" type="button" data-vocab-clear>Clear filters</button></article>`}
    <aside class="vocab-review-side">
      <div class="vocab-study-meter">
        <span>Mastered in this deck</span>
        <strong>${knownCount}</strong>
        <em>${Math.max(0, deck.length - knownCount)} left · ${deck.length} shown</em>
      </div>
      <div class="vocab-mini-list">
        ${miniItems.map((word, offset) => {
          const index = miniStart + offset;
          const known = state.vocabularyReview.known.has(vocabularyItemKey(word));
          return `<button class="${index === state.vocabularyReview.index ? "active" : ""} ${known ? "known" : ""}" type="button" data-vocab-index="${index}">
          <span>${escapeHtml(word.word)}</span>
          <em>${known ? "known" : escapeHtml(word.type === "phrase" ? "sentence" : word.type || "review")}</em>
        </button>`;
        }).join("")}
      </div>
      <div class="vocab-nav-actions">
        <button id="vocabPrev" class="secondary" type="button">Previous</button>
        <button id="vocabNext" class="primary" type="button">Next word</button>
      </div>
    </aside>
  </section>`;
}

function renderVocabularyImportPage() {
  return `<section class="vocab-secondary-page">
    <header class="vocab-secondary-head">
      <button class="secondary small-button vocab-back-button" type="button" data-vocab-back>← Back to hub</button>
      <div>
        <span class="eyebrow">Upload terms</span>
        <h3>Professional vocabulary import</h3>
        <p>Use one entry to import Chemistry, Economics, Physics or Mathematics terms.</p>
      </div>
    </header>
    ${renderVocabularyImportPanel()}
  </section>`;
}

function renderVocabularyTrainer() {
  const node = $("vocabularyContent");
  if (!node) return;
  const allItems = normalizedCoreVocabularyItems();
  const deck = filteredCoreVocabulary();
  const item = currentCoreVocabularyItem();
  const knownCount = deck.filter((entry) => state.vocabularyReview.known.has(vocabularyItemKey(entry))).length;
  const revealed = Boolean(state.vocabularyReview.revealed);
  const deckPosition = item ? `${state.vocabularyReview.index + 1} / ${deck.length}` : `0 / ${deck.length}`;
  const subjectCounts = allItems.reduce((counts, entry) => ({ ...counts, [entry.subject]: (counts[entry.subject] || 0) + 1 }), {});
  const subjects = ["all", "ielts", "physics", "mathematics", "chemistry", "economics", "exam-language"];
  const availableTopics = [...new Map(allItems
    .filter((entry) => state.vocabularyReview.subject === "all" || entry.subject === state.vocabularyReview.subject)
    .map((entry) => [entry.topic, entry.topicLabel || entry.topic]))]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  if (state.vocabularyReview.topic !== "all" && !availableTopics.some(([topic]) => topic === state.vocabularyReview.topic)) {
    state.vocabularyReview.topic = "all";
  }
  const miniStart = Math.max(0, Math.min(Math.max(0, deck.length - 120), state.vocabularyReview.index - 36));
  const miniItems = deck.slice(miniStart, miniStart + 120);
  const catalogStatus = state.vocabularyReview.loading
    ? `<span class="vocab-catalog-status">Loading A-Level catalog...</span>`
    : state.vocabularyReview.error
      ? `<button class="vocab-catalog-status is-error" type="button" data-vocab-retry>${escapeHtml(state.vocabularyReview.error)} · Retry</button>`
      : `<span class="vocab-catalog-status">${alevelStemVocabulary.length} A-Level entries loaded</span>`;
  if (state.vocabularyReview.page === "import") {
    node.innerHTML = renderVocabularyImportPage();
    bindVocabularyControls();
    return;
  }
  if (state.vocabularyReview.page !== "review") {
    node.innerHTML = renderVocabularyHub(allItems, subjectCounts);
    bindVocabularyControls();
    return;
  }
  node.innerHTML = renderVocabularyReviewPage(allItems, subjectCounts, deck, item, knownCount, revealed, deckPosition, subjects, availableTopics, catalogStatus, miniItems, miniStart);
  bindVocabularyControls();
}

function setVocabularyIndex(index) {
  const total = filteredCoreVocabulary().length;
  if (!total) return;
  state.vocabularyReview.index = ((Number(index) || 0) + total) % total;
  state.vocabularyReview.revealed = false;
  renderVocabularyTrainer();
}

function setVocabularyPage(page) {
  state.vocabularyReview.page = page;
  if (page === "hub") {
    state.vocabularyReview.revealed = false;
  }
  renderVocabularyTrainer();
}

function bindVocabularyControls() {
  document.querySelectorAll("[data-vocab-page]").forEach((button) => {
    button.onclick = () => setVocabularyPage(button.dataset.vocabPage || "hub");
  });
  document.querySelectorAll("[data-vocab-back]").forEach((button) => {
    button.onclick = () => setVocabularyPage("hub");
  });
  document.querySelectorAll("[data-vocab-mine]").forEach((button) => {
    button.onclick = () => {
      setVocabularyPage("hub");
      activateView("mine", true);
    };
  });
  $("vocabReveal")?.addEventListener("click", () => {
    state.vocabularyReview.revealed = !state.vocabularyReview.revealed;
    const revealButton = $("vocabReveal");
    const meaningFace = $("vocabMeaning");
    const reviewCard = document.querySelector(".vocab-review-card");
    if (!revealButton || !meaningFace) {
      renderVocabularyTrainer();
      return;
    }
    meaningFace.hidden = !state.vocabularyReview.revealed;
    reviewCard?.classList.toggle("is-revealed", state.vocabularyReview.revealed);
    revealButton.textContent = state.vocabularyReview.revealed ? "Hide meaning" : "Show meaning";
    revealButton.setAttribute("aria-expanded", String(state.vocabularyReview.revealed));
  });
  $("vocabAgain")?.addEventListener("click", () => {
    const item = currentCoreVocabularyItem();
    if (!item) return;
    state.vocabularyReview.known.delete(vocabularyItemKey(item));
    saveCoreVocabularyKnown();
    setVocabularyIndex(state.vocabularyReview.index + 1);
  });
  $("vocabKnown")?.addEventListener("click", () => {
    const item = currentCoreVocabularyItem();
    if (!item) return;
    state.vocabularyReview.known.add(vocabularyItemKey(item));
    saveCoreVocabularyKnown();
    setVocabularyIndex(state.vocabularyReview.index + 1);
  });
  $("vocabPrev")?.addEventListener("click", () => setVocabularyIndex(state.vocabularyReview.index - 1));
  $("vocabNext")?.addEventListener("click", () => setVocabularyIndex(state.vocabularyReview.index + 1));
  document.querySelectorAll("[data-vocab-index]").forEach((button) => {
    button.onclick = () => setVocabularyIndex(button.dataset.vocabIndex);
  });
  $("vocabSubjectFilter")?.addEventListener("change", (event) => {
    state.vocabularyReview.subject = event.target.value || "all";
    state.vocabularyReview.topic = "all";
    state.vocabularyReview.index = 0;
    state.vocabularyReview.revealed = false;
    renderVocabularyTrainer();
  });
  $("vocabTopicFilter")?.addEventListener("change", (event) => {
    state.vocabularyReview.topic = event.target.value || "all";
    state.vocabularyReview.index = 0;
    state.vocabularyReview.revealed = false;
    renderVocabularyTrainer();
  });
  $("vocabTypeFilter")?.addEventListener("change", (event) => {
    state.vocabularyReview.type = event.target.value || "all";
    state.vocabularyReview.index = 0;
    state.vocabularyReview.revealed = false;
    renderVocabularyTrainer();
  });
  $("vocabSearch")?.addEventListener("input", (event) => {
    state.vocabularyReview.query = event.target.value || "";
    state.vocabularyReview.index = 0;
    state.vocabularyReview.revealed = false;
    state.vocabularyReview.page = "review";
    renderVocabularyTrainer();
    const input = $("vocabSearch");
    input?.focus({ preventScroll: true });
    if (input) input.setSelectionRange(input.value.length, input.value.length);
  });
  document.querySelector("[data-vocab-clear]")?.addEventListener("click", () => {
    Object.assign(state.vocabularyReview, { page: "review", subject: "all", topic: "all", type: "all", query: "", index: 0, revealed: false });
    renderVocabularyTrainer();
  });
  document.querySelector("[data-vocab-retry]")?.addEventListener("click", () => {
    state.vocabularyReview.error = "";
    void ensureAlevelVocabularyLoaded();
    renderVocabularyTrainer();
  });
  $("vocabImportSample")?.addEventListener("click", () => {
    const subject = $("vocabImportSubject")?.value || "mathematics";
    const input = $("vocabImportInput");
    if (input) input.value = vocabularyImportSampleForSubject(subject);
    setVocabularyImportStatus("Sample filled. Edit it before importing.");
  });
  $("vocabImportFile")?.addEventListener("change", (event) => {
    void readVocabularyImportFile(event.target.files?.[0]);
  });
  $("vocabImportSubmit")?.addEventListener("click", () => {
    void submitVocabularyImport();
  });
}

function renderSubscriptionPlan(name, price, label, features, featured = false) {
  return `<article class="subscription-card${featured ? " featured" : ""}">
    <div class="subscription-card-head">
      <span>${escapeHtml(label)}</span>
      <h3>${escapeHtml(name)}</h3>
      <strong>${escapeHtml(price)}</strong>
    </div>
    <ul>${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
    <button class="${featured ? "primary" : "secondary"}" type="button" data-home-action="${featured ? "mine" : "module:listening"}">${featured ? "Redeem code" : "Start free"}</button>
  </article>`;
}

function renderSubscription() {
  const node = $("subscriptionContent");
  if (!node) return;
  node.innerHTML = `
    ${renderSubscriptionPlan("Free", "¥0", "Starter", [
      "Listening and reading practice",
      "Basic answer checking",
      "Limited AI trial",
      "Device draft box",
    ])}
    ${renderSubscriptionPlan("Pro", "¥300 / month", "Recommended", [
      "Unlimited AI Speaking Examiner",
      "Unlimited Writing Feedback",
      "AI Coach screenshot explanations",
      "Study reports and vocabulary review",
    ], true)}
    ${renderSubscriptionPlan("School", "Custom", "Classroom", [
      "Teacher-managed student accounts",
      "Batch redemption codes",
      "Shared topic banks",
      "Learning analytics export",
    ])}`;
  bindHomeControls(node);
}

function activateSingleModule(moduleName, updateHash = true) {
  if (!["listening", "reading", "writing", "speaking"].includes(moduleName)) return;
  syncCurrentDraftNow();
  savePracticeSession();
  if (state.activeModule === "speaking" && moduleName !== "speaking" && state.qwenSpeaking?.single) disconnectQwenSpeaking("single");
  state.activeModule = moduleName;
  state.activeSingle = null;
  state.singleStarted = false;
  document.querySelectorAll(".module-btn").forEach((item) => item.classList.toggle("active", item.dataset.module === moduleName));
  resetSingleTimer(moduleName);
  renderSingle();
  activateView("single", updateHash);
}

function runHomeAction(action) {
  if (!action) return;
  if (action === "choose-task") {
    $("dashboardSkillToolbar")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (action.startsWith("resume-practice")) {
    const [, expectedModule = "", encodedItemId = ""] = action.split(":");
    const expectedItemId = decodeURIComponent(encodedItemId || "");
    if (!restorePracticeSessionAfterData(expectedModule, expectedItemId)) return;
    renderSingle();
    activateView("single", true);
    setSingleImmersive(state.activeModule);
    return;
  }
  if (action === "speaking-vocab") {
    const topic = mergedItems("speaking").map(normalizeItem)[0] || null;
    const words = (state.vocabItems || []).slice(0, 5).map((item) => item.term || item.text || item.word || "").filter(Boolean);
    activateView("bank", true);
    renderBankList();
    if (topic) {
      renderBankPracticeTopic({
        ...topic,
        retestFocus: `Vocabulary output practice. Invite the candidate to use these saved expressions naturally when relevant: ${words.join(", ") || "their saved vocabulary"}. Do not force every word and do not repeat questions.`,
      });
    }
    return;
  }
  if (action.startsWith("recommended:")) {
    const [, moduleName, encodedItemId = "", encodedMode = ""] = action.split(":");
    if (!["listening", "reading", "writing", "speaking"].includes(moduleName)) return;
    const itemId = decodeURIComponent(encodedItemId || "");
    const requestedMode = decodeURIComponent(encodedMode || "");
    if (singleModeOptions(moduleName).some((mode) => mode.id === requestedMode)) {
      state.singlePracticeModes[moduleName] = requestedMode;
      if (["listening", "reading"].includes(moduleName)) state.singlePracticeScopes[moduleName] = scopeFromLegacyMode(moduleName, requestedMode);
    }
    activateSingleModule(moduleName, true);
    const options = singleOptions(moduleName);
    state.activeSingle = options.find((item) => item.id === itemId) || singleRecommendedOption(moduleName, options) || options[0] || null;
    state.singleStarted = Boolean(state.activeSingle);
    state.practiceSessionCompleted = false;
    state.singleAnswers = {};
    state.singleAnswerItemId = state.activeSingle?.id || "";
    resetSingleTimer(moduleName);
    renderSingle();
    if (state.activeSingle) {
      setSingleImmersive(moduleName);
      window.scrollTo({ top: 0, behavior: "auto" });
      savePracticeSession();
    }
    return;
  }
  if (action.startsWith("module-mode:")) {
    const [, moduleName, mode] = action.split(":");
    if (["listening", "reading", "writing", "speaking"].includes(moduleName) && mode) {
      state.singlePracticeModes[moduleName] = mode;
      if (["listening", "reading"].includes(moduleName)) state.singlePracticeScopes[moduleName] = scopeFromLegacyMode(moduleName, mode);
      activateSingleModule(moduleName, true);
    }
    return;
  }
  if (action.startsWith("review:")) {
    const moduleName = action.split(":")[1];
    if (["listening", "reading"].includes(moduleName)) {
      state.singlePracticeModes[moduleName] = "review";
      state.singlePracticeScopes[moduleName] = "review";
      activateSingleModule(moduleName, true);
      const review = latestObjectiveResult(moduleName);
      const options = singleOptions(moduleName);
      state.activeSingle = options.find((item) => item.id === review?.itemId) || options[0] || null;
      state.singleStarted = Boolean(state.activeSingle);
      state.practiceSessionCompleted = false;
      state.singleAnswers = {};
      state.singleAnswerItemId = state.activeSingle?.id || "";
      resetSingleTimer(moduleName);
      renderSingle();
      if (state.activeSingle) {
        setSingleImmersive(moduleName);
        window.scrollTo({ top: 0, behavior: "auto" });
        savePracticeSession();
      }
    }
    return;
  }
  if (action.startsWith("module:")) {
    activateSingleModule(action.split(":")[1], true);
    return;
  }
  if (action === "exam") {
    activateView("exam", true);
    return;
  }
  if (action === "sequence") {
    activateView("sequence", true);
    return;
  }
  if (action === "writing-upload") {
    activateView("writing-upload", true);
    return;
  }
  if (action === "bank") {
    activateView("bank", true);
    renderBankList();
    return;
  }
  if (action === "mine") {
    activateView("mine", true);
    return;
  }
  if (action === "vocabulary") {
    activateView("vocabulary", true);
    renderVocabularyTrainer();
    return;
  }
  if (action === "subscription") {
    activateView("subscription", true);
    return;
  }
  if (action === "coach") {
    openGlobalCoachPanel();
    return;
  }
  if (action === "coach-diagnostic") {
    openGlobalCoachPanel();
    const input = $("helpChatInput");
    if (input) {
      input.value = "Help me choose my first IELTS diagnostic. Ask which skill I want to diagnose, then open that practice. Do not assume Speaking is my weakest skill.";
      input.focus();
    }
  }
}

function coachAgentDefinitions() {
  return [
    { action: "module-mode:listening:training", label: "Open Listening training", shortLabel: "Listening training", terms: ["listening training", "section drill", "caption training", "listening evidence", "听力训练", "字幕训练", "听力分节"] },
    { action: "module-mode:listening:review", label: "Review Listening mistakes", shortLabel: "Listening review", terms: ["listening review", "review listening", "listening mistakes", "听力错题", "听力复盘"] },
    { action: "module-mode:listening:exam", label: "Open Listening exam", shortLabel: "Listening exam", terms: ["listening exam", "full listening", "listening mock", "听力模考", "完整听力"] },
    { action: "module-mode:reading:evidence", label: "Open Reading evidence drill", shortLabel: "Evidence drill", terms: ["reading evidence drill", "reading evidence", "evidence drill", "evidence locator", "阅读证据", "原文定位"] },
    { action: "module-mode:reading:type", label: "Open Reading question type", shortLabel: "Question type", terms: ["reading question type", "question type practice", "阅读题型", "题型训练"] },
    { action: "module-mode:reading:review", label: "Review Reading mistakes", shortLabel: "Reading review", terms: ["reading review", "review reading", "reading mistakes", "阅读错题", "阅读复盘"] },
    { action: "module-mode:writing:coach", label: "Open Writing with AI", shortLabel: "Writing with AI", terms: ["writing coach", "writing rewrite", "rewrite mode", "写作教练", "作文复写"] },
    { action: "module-mode:speaking:diagnostic", label: "Open Speaking with AI", shortLabel: "Speaking with AI", terms: ["speaking diagnostic", "diagnostic speaking", "口语诊断"] },
    { action: "module-mode:speaking:part2", label: "Open Cue card drill", shortLabel: "Cue card", terms: ["cue card drill", "speaking part 2", "part 2 practice", "口语 part 2", "口语第二部分"] },
    { action: "module-mode:speaking:retest", label: "Retest Speaking weakness", shortLabel: "Speaking retest", terms: ["speaking retest", "retest speaking", "口语复练", "口语弱项"] },
    { action: "module:listening", label: "Open Listening", shortLabel: "Listening", terms: ["listening", "listen", "audio", "听力"] },
    { action: "module:reading", label: "Open Reading", shortLabel: "Reading", terms: ["reading", "read", "passage", "阅读"] },
    { action: "writing-upload", label: "Open Writing with AI", shortLabel: "Writing with AI", terms: ["writing", "essay", "task 1", "task 2", "作文", "写作"] },
    { action: "bank", label: "Open Speaking with AI", shortLabel: "Speaking with AI", terms: ["speaking", "口语", "topic", "part 2", "part 3"] },
    { action: "sequence", label: "Open Same test", shortLabel: "Same test", terms: ["same test", "same paper", "顺序", "同一套", "整套"] },
    { action: "exam", label: "Open Random exam", shortLabel: "Random exam", terms: ["random", "mock exam", "full mock", "随机", "模考"] },
    { action: "vocabulary", label: "Open Vocabulary", shortLabel: "Vocabulary", terms: ["vocabulary", "word", "单词", "词汇"] },
    { action: "mine", label: "Open Mine", shortLabel: "Mine", terms: ["account", "draft", "membership", "mine", "账户", "草稿", "会员"] },
  ];
}

function coachWantsNavigation(text) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  const englishNavigation = /\b(?:open|launch|go to|switch to|take me to)\b/i.test(clean)
    || /\bstart\s+(?!from\b)(?:(?:my|a|the)\s+)?(?:listening|reading|writing|speaking|practice|drill|test|exam|mock)\b/i.test(clean)
    || /\b(?:i want to|let me|please)\s+(?:practice|do|take)\s+(?:listening|reading|writing|speaking|a practice|a drill|a test|an exam|a mock)\b/i.test(clean);
  const chineseNavigation = /(?:开始(?:练|做|听力|阅读|写作|口语)|打开|进入|切换到|跳到|带我去|我要练|去练|做一套|做一次)/.test(clean);
  return englishNavigation || chineseNavigation;
}

function coachAgentActionsFromText(text) {
  const clean = String(text || "").toLowerCase();
  if (!clean.trim()) return [];
  const wantsPractice = coachWantsNavigation(text);
  return coachAgentDefinitions()
    .filter((item) => item.terms.some((term) => clean.includes(term.toLowerCase())))
    .map((item) => ({ ...item, autoOpen: wantsPractice }));
}

function coachAgentActionFromText(text) {
  return coachAgentActionsFromText(text)[0] || null;
}

function runCoachAgentAction(action) {
  if (!action) return;
  closeHelpPanel();
  runHomeAction(action);
}

function appendCoachAgentAction(messageNode, action) {
  if (!messageNode || !action) return;
  const row = document.createElement("div");
  row.className = "coach-agent-actions";
  row.innerHTML = `<button class="primary small-button" type="button">${escapeHtml(action.label)}</button>`;
  row.querySelector("button")?.addEventListener("click", () => runCoachAgentAction(action.action));
  messageNode.appendChild(row);
}

function appendCoachAgentActions(messageNode, actions) {
  const list = (actions || []).slice(0, 3);
  if (!messageNode || !list.length) return;
  const row = document.createElement("div");
  row.className = "coach-agent-actions";
  row.innerHTML = list.map((action) => `<button class="primary small-button" type="button" data-agent-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>`).join("");
  row.querySelectorAll("[data-agent-action]").forEach((button) => {
    button.addEventListener("click", () => runCoachAgentAction(button.dataset.agentAction));
  });
  messageNode.appendChild(row);
}

function addHelpWeakArea() {
  const surface = currentCoachSurface();
  const moduleName = surface.module || state.activeModule || "practice";
  const latestAssistant = [...(state.help.history || [])].reverse().find((item) => item.role === "assistant")?.content || "";
  const summary = compactText(latestAssistant || surface.title || `Review ${moduleDisplayName(moduleName)} evidence and retest.`, 180);
  const areas = readWeakAreas().filter((entry) => entry.summary !== summary);
  areas.unshift({
    id: `weak-${Date.now()}`,
    module: moduleName,
    title: surface.title || moduleDisplayName(moduleName),
    summary,
    createdAt: new Date().toISOString(),
  });
  writeWeakAreas(areas);
  syncWeakArea(areas[0]);
  setHelpStatus("Weak area saved");
  renderDashboard();
}

function renderGlobalCoachContext() {
  const root = $("helpCoachContext");
  if (!root) return;
  const surface = currentCoachSurface();
  const answered = surface.answerCount ? `${surface.answerCount} answered` : surface.isImmersive ? "In practice" : "Ready";
  const questionLabel = surface.focusedQuestion?.number ? `Question ${surface.focusedQuestion.number}` : "";
  const crumbs = [surface.viewLabel || "IELTS-ist", surface.moduleLabel || "", compactText(surface.title || "", 48), questionLabel].filter(Boolean);
  root.innerHTML = `
    <div class="help-coach-breadcrumb">
      ${crumbs.map((crumb) => `<span>${escapeHtml(crumb)}</span>`).join("<i>/</i>")}
    </div>
    <div class="help-coach-mini-status">
      <span>${escapeHtml(answered)}</span>
      ${surface.source ? `<em>${escapeHtml(compactText(surface.source, 44))}</em>` : ""}
    </div>`;
}

function renderGlobalCoachActions() {
  const root = $("helpCoachActions");
  if (!root) return;
  const surface = currentCoachSurface();
  const readingQuestionRef = surface.focusedQuestion?.number
    ? `Q${surface.focusedQuestion.number}`
    : "the current Reading question";
  const primary = surface.module && ["listening", "reading", "writing", "speaking"].includes(surface.module)
    ? { action: surface.module === "speaking" ? "bank" : `module:${surface.module}`, label: `Open ${surface.moduleLabel}` }
    : { action: "module:listening", label: "Start Listening" };
  const primaryActions = !surface.module
    ? [
        { type: "prompt", label: "How should I use IELTSist?", prompt: "Guide me through IELTSist as a student. Ask what I want to practise, then route me to the right skill and explain the loop: practice -> AI feedback -> review -> retest." },
        { type: "capture", label: "Attach screenshot" },
      ]
    : surface.module === "reading"
    ? [
        { type: "prompt", label: "Explain this question", prompt: `Explain ${readingQuestionRef} step by step. Start from the question focus and paraphrase chain. In exam practice, do not reveal the answer before checking my reasoning.` },
        { type: "prompt", label: "Find evidence", prompt: `Help me locate the passage and evidence sentence for ${readingQuestionRef}. Do not reveal the answer.` },
        { type: "prompt", label: "One hint", prompt: `Give exactly one small hint for ${readingQuestionRef}. Do not reveal the answer.` },
        { type: "prompt", label: "Check my answer", prompt: `Check my answer for ${readingQuestionRef} against the evidence. Explain why it works or fails.` },
      ]
    : [
        { type: "prompt", label: "Show evidence", prompt: "Show the evidence chain for the current question: question focus -> keywords -> paper/audio evidence -> correct answer -> why my answer or the wrong option fails." },
        { type: "capture", label: "Attach screenshot" },
        { type: "retest", label: "Retest skill" },
      ];
  const moreActions = !surface.module
    ? [
        { type: "prompt", label: "Explain screen", prompt: "Explain what I should do on my current IELTS-ist screen and what the next step is." },
        { type: "prompt", label: "Explain in Chinese", prompt: "Explain how to use this IELTSist screen in Chinese. Keep IELTS keywords in English and make the next step practical." },
        primary,
      ]
    : [
        { type: "prompt", label: "Generate similar", prompt: "Generate one similar IELTS question from my current question and weak area. Keep the same skill but change the wording. Wait for my answer before revealing the solution." },
        { type: "prompt", label: "Explain screen", prompt: "Explain what I should do on my current IELTS-ist screen and what the next step is." },
        { type: "prompt", label: "Explain in Chinese", prompt: "Explain this in Chinese. Keep IELTS keywords in English and make it practical for my next attempt." },
        { type: "vocab", label: "Save vocabulary" },
        { type: "weak", label: "Save weak area" },
        primary,
      ];
  const renderActionButton = (item) => {
    if (item.type === "prompt") return `<button type="button" data-global-coach-prompt="${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</button>`;
    if (item.type === "capture") return `<button type="button" data-global-coach-capture>${escapeHtml(item.label)}</button>`;
    if (item.type === "vocab") return `<button type="button" data-global-coach-vocab>${escapeHtml(item.label)}</button>`;
    if (item.type === "weak") return `<button type="button" data-global-coach-weak>${escapeHtml(item.label)}</button>`;
    if (item.type === "retest") return `<button type="button" data-global-coach-retest>${escapeHtml(item.label)}</button>`;
    return `<button type="button" data-global-coach-action="${escapeHtml(item.action)}">${escapeHtml(item.label)}</button>`;
  };
  root.innerHTML = `
    ${primaryActions.map(renderActionButton).join("")}
    <details class="help-coach-more">
      <summary>More</summary>
      <div>${moreActions.map(renderActionButton).join("")}</div>
    </details>`;
  root.querySelectorAll("[data-global-coach-action]").forEach((button) => {
    button.addEventListener("click", () => runCoachAgentAction(button.dataset.globalCoachAction));
  });
  root.querySelectorAll("[data-global-coach-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      void sendHelpChatMessage(button.dataset.globalCoachPrompt || "");
    });
  });
  root.querySelectorAll("[data-global-coach-capture]").forEach((button) => {
    button.addEventListener("click", () => beginHelpCapture("attach"));
  });
  root.querySelectorAll("[data-global-coach-weak]").forEach((button) => {
    button.addEventListener("click", addHelpWeakArea);
  });
  root.querySelectorAll("[data-global-coach-vocab]").forEach((button) => {
    button.addEventListener("click", saveHelpVocabulary);
  });
  root.querySelectorAll("[data-global-coach-retest]").forEach((button) => {
    button.addEventListener("click", () => {
      const moduleName = currentCoachSurface().module || state.activeModule || "listening";
      const hasObjectiveReview = ["listening", "reading"].includes(moduleName) && Boolean(latestObjectiveResult(moduleName));
      runCoachAgentAction(moduleName === "speaking" ? "bank" : hasObjectiveReview ? `review:${moduleName}` : `module:${moduleName}`);
    });
  });
}

function openGlobalCoachPanel(surfaceOverride = null) {
  const override = surfaceOverride && typeof surfaceOverride === "object" && !surfaceOverride.type
    ? surfaceOverride
    : null;
  state.help.surfaceOverride = override;
  openHelpPanel();
  document.body.classList.add("coach-dock-open");
  const view = activeViewId();
  const resultVisible = Boolean(document.querySelector(".view.active .unified-result-shell"));
  const examLocked = !resultVisible && (
    (view === "writing-upload" && state.writingWorkspaceMode !== "entry" && state.writingSetupMode === "exam")
    || (view === "bank" && state.speakingSetupMode === "exam" && Boolean(document.querySelector("#bankPracticePanel .speaking-practice-layout")))
  );
  const form = $("helpChatForm");
  const input = $("helpChatInput");
  const actions = $("helpCoachActions");
  if (form) form.dataset.examLocked = examLocked ? "1" : "0";
  if (input) input.disabled = examLocked;
  if (actions) actions.hidden = examLocked;
  setHelpStatus("AI Coach");
  updateHelpAttachmentPreview();
  renderGlobalCoachContext();
  renderGlobalCoachActions();
  const log = $("helpChatLog");
  const surfaceSummary = coachSurfaceSummary();
  const coachSurfaceKey = `${surfaceSummary}|${examLocked ? "exam-locked" : "coach-ready"}`;
  if (log && log.dataset.coachSurface !== coachSurfaceKey) {
    addHelpMessage("assistant", examLocked
      ? `Current task: ${surfaceSummary}. AI hints are locked during Exam mode. Finish the practice to review evidence with AI Coach.`
      : `Current task: ${surfaceSummary}. Ask about this task, attach a screenshot, or ask me to route you to the next practice.`);
    log.dataset.coachSurface = coachSurfaceKey;
  }
  if (!examLocked) setTimeout(() => $("helpChatInput")?.focus({ preventScroll: true }), 60);
}

function refreshGlobalCoachPanelIfOpen() {
  const panel = $("helpChatPanel");
  if (!panel || panel.hidden) return;
  renderGlobalCoachContext();
  renderGlobalCoachActions();
}

function bindHomeControls(root = document) {
  root.querySelectorAll?.("[data-home-action]").forEach((button) => {
    if (button.dataset.boundHomeAction === "1") return;
    button.dataset.boundHomeAction = "1";
    button.addEventListener("click", () => runHomeAction(button.dataset.homeAction));
  });
  bindCoachControls(root);
  const dashboardCoachForm = root.querySelector?.("#dashboardCoachForm");
  if (dashboardCoachForm && dashboardCoachForm.dataset.boundDashboardCoach !== "1") {
    dashboardCoachForm.dataset.boundDashboardCoach = "1";
    dashboardCoachForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = dashboardCoachForm.querySelector("#dashboardCoachInput");
      const message = String(input?.value || "").trim();
      if (!message) return;
      if (input) input.value = "";
      await sendHelpChatMessage(message);
    });
  }
  root.querySelectorAll?.("[data-dashboard-coach-prompt]").forEach((button) => {
    if (button.dataset.boundDashboardCoachPrompt === "1") return;
    button.dataset.boundDashboardCoachPrompt = "1";
      button.addEventListener("click", () => sendHelpChatMessage(button.dataset.dashboardCoachPrompt || ""));
  });
  const goalDialog = root.querySelector?.("#dashboardGoalDialog");
  let goalOpener = null;
  root.querySelectorAll?.("[data-dashboard-goal]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!goalDialog) return;
      goalOpener = button;
      goalDialog.showModal();
      setTimeout(() => goalDialog.querySelector("select, input")?.focus(), 0);
    });
  });
  goalDialog?.querySelectorAll("[data-dashboard-goal-close]").forEach((button) => {
    button.addEventListener("click", () => goalDialog.close());
  });
  goalDialog?.addEventListener("close", () => goalOpener?.focus?.());
  const goalForm = root.querySelector?.("#dashboardGoalForm");
  if (goalForm) {
    goalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = goalForm.querySelector("button[type='submit']");
      const errorNode = goalForm.querySelector("[data-dashboard-goal-error]");
      const values = new FormData(goalForm);
      const profile = {
        currentBand: Number(values.get("currentBand")),
        targetBand: Number(values.get("targetBand")),
        examDate: String(values.get("examDate") || ""),
        dailyMinutes: Number(values.get("dailyMinutes")),
      };
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Saving...";
      }
      if (errorNode) errorNode.textContent = "";
      try {
        if (state.currentUser) {
          const json = await patchJson("/api/learning/profile", { ...profile, onboardingCompleted: true });
          let todayPlan = state.learningState?.todayPlan || null;
          try {
            const planJson = await getJson("/api/learning/today-plan");
            todayPlan = planJson.plan || todayPlan;
          } catch {}
          state.learningState = { ...(state.learningState || {}), profile: json.profile, todayPlan };
        } else {
          localStorage.setItem(guestLearningProfileStoreKey, JSON.stringify({ version: 1, ...profile }));
        }
        goalDialog?.close();
        renderDashboard();
      } catch (error) {
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Save goal →";
        }
        if (errorNode) errorNode.textContent = error.message || "Could not save your goal. Try again.";
      }
    });
  }
  const profileForm = root.querySelector?.("#learningProfileForm");
  if (profileForm && profileForm.dataset.boundProfile !== "1") {
    profileForm.dataset.boundProfile = "1";
    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = profileForm.querySelector("button[type='submit']");
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Saving...";
      }
      try {
        const values = new FormData(profileForm);
        const json = await patchJson("/api/learning/profile", {
          currentBand: Number(values.get("currentBand")),
          targetBand: Number(values.get("targetBand")),
          examDate: String(values.get("examDate") || ""),
          dailyMinutes: Number(values.get("dailyMinutes")),
          onboardingCompleted: true,
        });
        const planJson = await getJson("/api/learning/today-plan");
        state.learningState = { ...(state.learningState || {}), profile: json.profile, todayPlan: planJson.plan };
        renderDashboard();
      } catch (error) {
        if (submit) {
          submit.disabled = false;
          submit.textContent = error.message || "Save failed";
        }
      }
    });
  }
}

function renderDraftList(drafts, mode) {
  if (!drafts.length) return `<div class="empty-list">No saved drafts yet.</div>`;
  return `<div class="draft-list">${uniqueDrafts(drafts)
    .map((draft) => {
      const key = draft.key || draft.draft_key;
      const moduleName = draft.module || "practice";
      const title = draft.title || "Untitled draft";
      const initial = String(title || moduleName || "D").match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() || "D";
      const tone = ["purple", "teal", "orange", "blue", "pink", "green"][Math.abs(String(key || title).length) % 6];
      return `<article class="draft-item">
        <div class="draft-icon draft-icon-${tone}">${escapeHtml(initial)}</div>
        <div>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(moduleName)} · ${escapeHtml(new Date(draft.updatedAt || draft.updated_at || Date.now()).toLocaleString())}</span>
        </div>
        <div class="draft-actions">
          <button class="secondary small-button restore-draft" data-draft-key="${escapeHtml(key)}" data-draft-mode="${escapeHtml(mode)}">Restore</button>
          <button class="secondary small-button delete-draft" data-draft-key="${escapeHtml(key)}">Delete</button>
        </div>
      </article>`;
    }).join("")}</div>`;
}

function renderVocabularyList(items) {
  if (!items.length) return `<div class="empty-list compact-empty">No saved items yet.</div>`;
  const buckets = [
    { key: "word", label: "单词翻译" },
    { key: "sentence", label: "句子翻译" },
    { key: "paragraph", label: "整段翻译" },
  ];
  const grouped = buckets.map((bucket) => ({
    ...bucket,
    items: items.filter((item) => classifyVocabularyItem(item) === bucket.key),
  })).filter((bucket) => bucket.items.length);
  return `<div class="vocab-list">${grouped.map((bucket) => `
    <section class="vocab-group">
      <div class="vocab-group-title">${escapeHtml(bucket.label)}</div>
      ${bucket.items.map((item) => renderVocabularyItem(item, bucket.label)).join("")}
    </section>`).join("")}</div>`;
}

function renderVocabularyItem(item, label) {
  const structured = parseImportedVocabularyPayload(item);
  const rawTerm = cleanReviewText(structured?.term || item.term || item.context || "Untitled");
  const title = compactText(rawTerm, classifyVocabularyItem(item) === "word" ? 48 : 96);
  const meaning = cleanReviewText(structured?.meaning || "");
  const definition = cleanReviewText(structured?.definition || "");
  const formula = cleanReviewText(structured?.formula || "");
  const knowledgePoint = cleanReviewText(structured?.knowledgePoint || "");
  const example = cleanReviewText(structured?.example || "");
  const translation = cleanReviewText(structured?.translation || "");
  const collocations = Array.isArray(structured?.collocations) ? structured.collocations : [];
  const explanation = cleanReviewText(item.explanation || "");
  const context = cleanReviewText(item.context || "");
  const date = new Date(item.updated_at || item.updatedAt || Date.now()).toLocaleDateString();
  const details = structured ? [
    meaning ? `<div><span>中文名</span><p>${escapeHtml(meaning)}</p></div>` : "",
    definition ? `<div><span>Definition / 定义</span><p>${escapeHtml(definition)}</p></div>` : "",
    formula ? `<div><span>Formula / 公式</span><p class="vocab-formula">${escapeHtml(formula)}</p></div>` : "",
    knowledgePoint ? `<div><span>Knowledge point / 知识点</span><p>${escapeHtml(knowledgePoint)}</p></div>` : "",
    example ? `<div><span>Exam sentence / 题目句</span><p>${escapeHtml(example)}</p></div>` : "",
    translation ? `<div><span>中文翻译</span><p>${escapeHtml(translation)}</p></div>` : "",
    collocations.length ? `<div><span>Related phrases</span><p>${collocations.map((phrase) => escapeHtml(phrase)).join(" · ")}</p></div>` : "",
    `<div><span>Type</span><p>${escapeHtml(label)}</p></div>`,
    `<div><span>Saved</span><p>${escapeHtml(date)}</p></div>`,
  ].filter(Boolean).join("") : [
    explanation ? `<div><span>Analysis</span><p>${escapeHtml(explanation)}</p></div>` : "",
    context && context !== rawTerm ? `<div><span>Captured text</span><p>${escapeHtml(context)}</p></div>` : "",
    `<div><span>Type</span><p>${escapeHtml(label)}</p></div>`,
    `<div><span>Saved</span><p>${escapeHtml(date)}</p></div>`,
  ].filter(Boolean).join("");
  const initial = String(title || label || "V").match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() || "V";
  return `<article class="vocab-item">
    <div class="vocab-icon">${escapeHtml(initial)}</div>
    <div>
      <details class="vocab-details">
        <summary class="vocab-title-row">
          <strong>${escapeHtml(title)}</strong>
        </summary>
        <div class="vocab-analysis">${details}</div>
      </details>
    </div>
    <button class="secondary small-button delete-vocab" data-vocab-id="${escapeHtml(item.id)}">Delete</button>
  </article>`;
}

function classifyVocabularyItem(item) {
  const source = String(item.source || "").toLowerCase();
  if (source.includes("paragraph")) return "paragraph";
  if (source.includes("sentence")) return "sentence";
  if (source.includes("word")) return "word";
  return classifyVocabularyText(item.term || item.context || "");
}

function classifyVocabularyText(value) {
  const text = cleanReviewText(value);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const asciiWordCount = (text.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const hasSentencePunctuation = /[.!?。！？；;]/.test(text);
  if (!hasSentencePunctuation && (asciiWordCount <= 4 || wordCount <= 4) && cjkCount <= 8 && text.length <= 40) return "word";
  if (text.length <= 160 && (text.match(/[.!?。！？]/g) || []).length <= 1) return "sentence";
  return "paragraph";
}

function cleanReviewText(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value, maxLength) {
  const text = cleanReviewText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

async function submitAuth(mode) {
  const message = $("authMessage");
  try {
    const username = $("authUsername")?.value || "";
    const password = $("authPassword")?.value || "";
    const json = await postJson(`/api/auth/${mode}`, { username, password });
    state.authToken = json.token || "";
    state.currentUser = json.user || null;
    if (state.authToken) localStorage.setItem(authStoreKey, state.authToken);
    updateUserChrome();
    await syncCurrentDraftNow();
    await refreshMineData();
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

async function logoutUser() {
  try {
    await postJson("/api/auth/logout", {});
  } catch {
    // Local logout still works when the network is unavailable.
  }
  state.authToken = "";
  state.currentUser = null;
  localStorage.removeItem(authStoreKey);
  updateUserChrome();
  renderMine();
}

async function redeemCode() {
  const message = $("redeemMessage");
  try {
    const code = $("redeemCode")?.value || "";
    const json = await postJson("/api/redeem", { code });
    state.currentUser = json.user || state.currentUser;
    if (message) message.textContent = "Redeemed. Membership updated.";
    updateUserChrome();
    renderMine();
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

function bindMineLearningAssetControls(root = document) {
  root.querySelectorAll?.("[data-mine-learning-action]").forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.mineLearningAction || "coach";
      const moduleName = ["listening", "reading", "writing", "speaking"].includes(button.dataset.module) ? button.dataset.module : "reading";
      if (action === "retest") {
        if (moduleName === "speaking") {
          startSpeakingResultRetest("fluency");
        } else if (moduleName === "writing") {
          activateView("writing-upload", true);
        } else {
          runHomeAction(`review:${moduleName}`);
        }
        return;
      }
      const wrongCount = Number(button.dataset.wrongCount || 0);
      const attempt = mineLearningAttempts().find((entry) => (entry.module || mineAttemptResult(entry).module) === moduleName) || null;
      const result = mineAttemptResult(attempt);
      state.help.context = {
        activeModule: moduleName,
        learningAttempt: compactLearningRecord(attempt || result),
        ...(["listening", "reading"].includes(moduleName) ? { [moduleName]: compactLearningRecord(result) } : {}),
      };
      openGlobalCoachPanel({
        viewLabel: "Attempt review",
        module: moduleName,
        moduleLabel: moduleDisplayName(moduleName),
        title: result.title || `Latest ${moduleDisplayName(moduleName)} attempt`,
        source: [result.source, result.period].filter(Boolean).join(" · "),
        answerCount: Math.max(0, Number(result.total || 0) - wrongCount),
        focusedQuestion: null,
      });
      const input = $("helpChatInput");
      if (!input) return;
      input.value = `Review my latest ${moduleName} attempt${wrongCount ? ` with ${wrongCount} wrong answer${wrongCount === 1 ? "" : "s"}` : ""}. Explain the main weakness, show the available evidence, and give me one executable retest.`;
      input.focus();
    };
  });
}

function bindMineControls() {
  $("authForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAuth("login");
  });
  $("registerUser")?.addEventListener("click", () => submitAuth("register"));
  $("logoutUser")?.addEventListener("click", logoutUser);
  $("redeemCodeButton")?.addEventListener("click", redeemCode);
  $("syncDraftsNow")?.addEventListener("click", syncAllLocalDrafts);
  document.querySelectorAll(".restore-draft").forEach((button) => {
    button.onclick = () => restoreDraft(button.dataset.draftKey);
  });
  document.querySelectorAll(".delete-draft").forEach((button) => {
    button.onclick = () => deleteDraft(button.dataset.draftKey);
  });
  document.querySelectorAll(".delete-vocab").forEach((button) => {
    button.onclick = () => deleteVocabulary(button.dataset.vocabId);
  });
  document.querySelectorAll(".practice-liked-topic").forEach((button) => {
    button.onclick = () => {
      activateView("bank", true);
      activateSpeakingTopicGroupFromBank(button.dataset.groupId);
    };
  });
  document.querySelectorAll(".mine-quick-action, .mine-action-card").forEach((button) => {
    button.onclick = () => runMineAction(button.dataset.mineAction);
  });
  bindMineLearningAssetControls();
}

function runMineAction(action) {
  if (action === "single-speaking") {
    activateSingleModule("speaking", true);
    return;
  }
  if (action === "writing-upload") {
    activateView("writing-upload", true);
    return;
  }
  if (action === "bank") {
    activateView("bank", true);
    return;
  }
  if (action === "vocabulary") {
    activateView("vocabulary", true);
    renderVocabularyTrainer();
    return;
  }
  if (action === "plans") {
    activateView("subscription", true);
  }
}

function draftFieldKey(field) {
  if (field.id) return `id:${field.id}`;
  const prefix = field.dataset?.prefix || "";
  const qid = field.dataset?.qid || "";
  if (prefix && qid) return `qid:${prefix}:${qid}`;
  return "";
}

function findDraftField(key) {
  if (key.startsWith("id:")) return $(key.slice(3));
  if (key.startsWith("qid:")) {
    const [, prefix, ...qidParts] = key.split(":");
    const qid = qidParts.join(":");
    return [...document.querySelectorAll(".answer-input, .paper-answer-input, .page-card-input")]
      .find((field) => field.dataset.prefix === prefix && field.dataset.qid === qid) || null;
  }
  return $(key);
}

function currentDraftSnapshot() {
  const activeView = document.querySelector(".view.active")?.id || "practice";
  const values = {};
  document.querySelectorAll(".view.active textarea, .view.active input.answer-input, .view.active input.paper-answer-input, .view.active input.page-card-input, .view.active input.band-input").forEach((field) => {
    const pairedWritingField = activeView === "writing-upload"
      && state.pendingWritingKind === "full-test"
      && field.closest("[data-writing-task-panel]");
    if (field.closest("[hidden]") && !pairedWritingField) return;
    const key = draftFieldKey(field);
    if (key) values[key] = field.value || "";
  });
  const hasContent = Object.values(values).some((value) => String(value || "").trim());
  if (!hasContent) return null;
  const activeTitle = document.querySelector(".view.active h2")?.textContent || activeView;
  const bundle = activeView === "exam"
    ? bundleDraftPayload(state.exam)
    : activeView === "sequence"
      ? bundleDraftPayload(state.sequence)
      : null;
  const writingSetId = activeView === "writing-upload" && state.writingWorkspaceMode === "cambridge"
    ? state.pendingWritingSetId || ""
    : "";
  const writingTask1Id = writingSetId ? state.selectedWritingTask1Id || writingUploadTaskByNumber(1)?.id || "" : "";
  const writingTask2Id = writingSetId ? state.selectedWritingTask2Id || writingUploadTaskByNumber(2)?.id || "" : "";
  const draftModule = activeView === "writing-upload" ? "writing" : state.activeModule;
  return {
    key: `${activeView}:${draftModule}:${writingSetId || state.activeSingle?.id || bundle?.listeningId || "current"}${writingSetId ? `:${writingTask1Id}:${writingTask2Id}` : ""}`,
    module: activeView === "single" ? state.activeModule : draftModule || activeView,
    title: `${activeTitle} · ${draftModule || "practice"}`,
    payload: { values, activeView, activeModule: draftModule, activeSingleId: state.activeSingle?.id || "", writingSetId, writingTask1Id, writingTask2Id, bundle },
    updatedAt: new Date().toISOString(),
  };
}

async function syncDraft(draft) {
  if (!state.authToken || !draft) return;
  await postJson("/api/drafts", draft);
}

async function syncCurrentDraftNow() {
  const draft = currentDraftSnapshot();
  if (!draft) return;
  upsertLocalDraft(draft);
  try {
    await syncDraft(draft);
  } catch {
    // The device draft remains available offline.
  }
}

function scheduleDraftAutosave() {
  if (state.draftSaveTimer) window.clearTimeout(state.draftSaveTimer);
  setWritingAutosaveStatus("Saving...");
  state.draftSaveTimer = window.setTimeout(async () => {
    state.draftSaveTimer = null;
    await syncCurrentDraftNow();
    setWritingAutosaveStatus("Saved");
  }, 700);
}

function setWritingAutosaveStatus(label) {
  document.querySelectorAll("[data-writing-autosave-status]").forEach((node) => {
    node.textContent = label || "Saved";
    node.dataset.state = /^saving/i.test(label || "") ? "saving" : "saved";
  });
}

async function syncAllLocalDrafts() {
  if (!state.authToken) return;
  const drafts = readLocalDrafts();
  for (const draft of drafts) {
    try {
      await syncDraft(draft);
    } catch {
      break;
    }
  }
  await refreshMineData();
}

function applyDraftValues(values = {}) {
  for (const [id, value] of Object.entries(values || {})) {
    const field = findDraftField(id);
    if (!field) continue;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function restoreDraft(key) {
  const draft = [...state.serverDrafts, ...readLocalDrafts()].find((item) => (item.key || item.draft_key) === key);
  if (!draft?.payload?.values) return;
  const targetView = draft.payload.activeView || "single";
  activateView(targetView, true);
  if (targetView === "exam") {
    const bundle = restoreBundleFromDraft(draft.payload.bundle);
    if (bundle) buildExam(bundle);
  } else if (targetView === "sequence") {
    const bundle = restoreBundleFromDraft(draft.payload.bundle);
    if (bundle) buildSequence(bundle);
  } else if (targetView === "single" && draft.payload.activeModule) {
    state.activeModule = draft.payload.activeModule;
    state.singleStarted = true;
    document.querySelectorAll(".module-btn").forEach((item) => item.classList.toggle("active", item.dataset.module === state.activeModule));
    const item = findItemById(state.activeModule, draft.payload.activeSingleId);
    if (item) state.activeSingle = item;
    renderSingle();
    setSingleImmersive(state.activeModule);
  } else if (targetView === "writing-upload") {
    const setId = draft.payload.writingSetId || "";
    const task1Id = draft.payload.writingTask1Id || "";
    const task2Id = draft.payload.writingTask2Id || "";
    const taskNumber = task1Id ? 1 : task2Id ? 2 : 0;
    const taskId = taskNumber === 1 ? task1Id : task2Id;
    if (setId && taskId) {
      state.writingLibraryTaskNumber = taskNumber;
      startWritingSystemPractice("selected", { setId, taskNumber, taskId, scroll: false });
    } else {
      setWritingWorkspaceMode("custom");
    }
  }
  applyDraftValues(draft.payload.values);
}

async function deleteDraft(key) {
  writeLocalDrafts(readLocalDrafts().filter((draft) => draft.key !== key));
  if (state.authToken) {
    try {
      await deleteJson(`/api/drafts?key=${encodeURIComponent(key)}`);
    } catch {
      // Ignore server delete failures; local cleanup still applies.
    }
  }
  await refreshMineData();
}

async function saveHelpVocabulary() {
  const selection = String(window.getSelection?.() || "").trim();
  const typed = $("helpChatInput")?.value?.trim() || "";
  const context = state.help.contextText || typed || selection;
  const fallback = selection || typed.split(/\s+/).slice(0, 3).join(" ") || context.split(/\s+/).slice(0, 3).join(" ");
  const term = window.prompt("Save which word, sentence, or paragraph?", fallback);
  if (!term) return;
  const kind = classifyVocabularyText(term);
  const explanation = compactText(state.help.history.at(-1)?.content || context, kind === "paragraph" ? 260 : 180);
  if (!state.authToken) {
    alert("Please log in first, then save vocabulary to Mine.");
    activateView("mine", true);
    return;
  }
  await postJson("/api/vocabulary", { term: cleanReviewText(term), context: cleanReviewText(context), explanation, source: `Coach:${kind}` });
  await refreshMineData();
}

async function deleteVocabulary(id) {
  if (!state.authToken) return;
  await deleteJson(`/api/vocabulary?id=${encodeURIComponent(id)}`);
  await refreshMineData();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function speakingSectionTitle() {
  return `<h2>Speaking</h2>`;
}

function getBank(moduleName) {
  return state.userBank.filter((item) => item.module === moduleName);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function writingTaskNumber(item) {
  const idMatch = String(item.id || "").match(/-task([12])$/i);
  if (idMatch) return Number(idMatch[1]);
  const typeMatch = String(item.type || "").match(/task\s*([12])/i);
  return typeMatch ? Number(typeMatch[1]) : null;
}

function writingPairKey(item) {
  const id = String(item.id || "");
  const idMatch = id.match(/^(.*)-task[12]$/i);
  if (idMatch) return idMatch[1];
  return [item.source, item.period, String(item.title || "").replace(/\btask\s*[12]\b.*$/i, "").trim()].join("|");
}

function pairedWritingSets(items) {
  const groups = new Map();
  items.map(normalizeItem).forEach((item) => {
    const task = writingTaskNumber(item);
    if (!task) return;
    const key = writingPairKey(item);
    if (!groups.has(key)) groups.set(key, {});
    groups.get(key)[task] = item;
  });
  return [...groups.values()]
    .filter((group) => group[1] && group[2])
    .map((group) => [group[1], group[2]]);
}

function examSetKey(item) {
  const id = String(item?.id || "");
  const match = id.match(/^(cam\d+)-(?:l|r|w)-test(\d+)/i);
  if (match) return `${match[1].toLowerCase()}-test${match[2]}`;
  const book = itemBook(item);
  const test = itemTest(item);
  return book && test ? `cam${book}-test${test}` : null;
}

function completeCambridgeExamSets(listeningItems, readingItems, writingItems) {
  const sets = new Map();
  const ensure = (key) => {
    if (!sets.has(key)) sets.set(key, {});
    return sets.get(key);
  };
  listeningItems.map(normalizeItem).forEach((item) => {
    const key = examSetKey(item);
    if (key) ensure(key).listening = item;
  });
  readingItems.map(normalizeItem).forEach((item) => {
    const key = examSetKey(item);
    if (key) ensure(key).reading = item;
  });
  writingItems.map(normalizeItem).forEach((item) => {
    const key = examSetKey(item);
    const task = writingTaskNumber(item);
    if (key && task) ensure(key)[`task${task}`] = item;
  });
  return [...sets.entries()]
    .filter(([, set]) => set.listening && set.reading && set.task1 && set.task2)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([key, set]) => ({ key, ...set }));
}

function itemBook(item) {
  const text = [
    item?.id,
    item?.period,
    item?.source,
    item?.title,
    item?.sourceUrl,
  ].filter(Boolean).join(" ");
  const match = text.match(/\bcam(?:bridge)?\s*(?:ielts\s*)?(\d+)\b|\bcam(\d+)\b/i);
  return match ? Number(match[1] || match[2]) : null;
}

function itemTest(item) {
  const match = String(item?.id || item?.title || "").match(/(?:test|t)(\d+)/i);
  return match ? Number(match[1]) : null;
}

function itemTask(item) {
  return writingTaskNumber(item);
}

function filterValue(id) {
  return $(id)?.value || "all";
}

function applySingleFilters(items, moduleName) {
  const book = filterValue("singleBookFilter");
  const test = filterValue("singleTestFilter");
  return items.filter((item) => {
    const bookOk = book === "all" || String(itemBook(item)) === book;
    const testOk = test === "all" || String(itemTest(item)) === test;
    return bookOk && testOk;
  });
}

function practiceCompletionFilterMatches(moduleName, item, completionIndex, filterId = "singleCompletionFilter") {
  const filter = filterValue(filterId);
  if (filter === "all") return true;
  const completed = practiceCompletionStatus(moduleName, item, completionIndex).completed;
  return filter === "completed" ? completed : !completed;
}

function applySingleUnitFilters(items, moduleName, scope = currentSinglePracticeScope(moduleName), completionIndex = null, includeCompletion = true) {
  const unit = filterValue("singleUnitFilter");
  const topic = filterValue("singleTopicFilter");
  return items.filter((item) => {
    const unitOk = !["section", "topic"].includes(scope) || unit === "all" || String(item.practiceSection) === unit;
    const topicOk = scope !== "topic" || topic === "all" || String(item.contentTopic?.key || "") === topic;
    const completionOk = !includeCompletion || practiceCompletionFilterMatches(moduleName, item, completionIndex);
    return unitOk && topicOk && completionOk;
  });
}

function renderFilterOptions(id, values, label) {
  const select = $(id);
  if (!select) return;
  const current = select.value || "all";
  const unique = [...new Set(values.filter((value) => value !== null && value !== undefined))]
    .sort((a, b) => Number(a) - Number(b));
  const optionLabel = label.replace(/^All\s*/, "");
  select.innerHTML = [
    `<option value="all">${label}</option>`,
    ...unique.map((value) => `<option value="${value}">${optionLabel} ${value}</option>`),
  ].join("");
  select.value = unique.map(String).includes(current) ? current : "all";
}

function renderSingleFilters(items, moduleName) {
  renderFilterOptions("singleBookFilter", items.map(itemBook), "All Cambridge");
  const selectedBook = filterValue("singleBookFilter");
  const testItems = selectedBook === "all" ? items : items.filter((item) => String(itemBook(item)) === selectedBook);
  renderFilterOptions("singleTestFilter", testItems.map(itemTest), "All tests");
  renderFilterOptions("singleTaskFilter", [], "All tasks");
  $("singleTaskFilter").style.display = "none";
  const objectiveLibrary = ["listening", "reading"].includes(moduleName);
  const scope = currentSinglePracticeScope(moduleName);
  const unitSelect = $("singleUnitFilter");
  const topicSelect = $("singleTopicFilter");
  const completionSelect = $("singleCompletionFilter");
  if (!objectiveLibrary) {
    [unitSelect, topicSelect, completionSelect].forEach((select) => {
      select.hidden = true;
      select.innerHTML = '<option value="all">All</option>';
      select.value = "all";
    });
    return;
  }

  const unitVisible = ["section", "topic"].includes(scope);
  const unitLabel = moduleName === "reading" ? "Passage" : "Section";
  const unitCount = moduleName === "reading" ? 3 : 4;
  const currentUnit = unitSelect.value || "all";
  unitSelect.innerHTML = [
    `<option value="all">All ${escapeHtml(unitLabel.toLowerCase())}s</option>`,
    ...Array.from({ length: unitCount }, (_, index) => `<option value="${index + 1}">${escapeHtml(unitLabel)} ${index + 1}</option>`),
  ].join("");
  unitSelect.value = Array.from({ length: unitCount }, (_, index) => String(index + 1)).includes(currentUnit) ? currentUnit : "all";
  unitSelect.hidden = !unitVisible;
  if (!unitVisible) unitSelect.value = "all";

  const selectedTest = filterValue("singleTestFilter");
  const contextPapers = items.filter((item) => {
    const bookOk = selectedBook === "all" || String(itemBook(item)) === selectedBook;
    const testOk = selectedTest === "all" || String(itemTest(item)) === selectedTest;
    return bookOk && testOk;
  });
  const selectedUnit = filterValue("singleUnitFilter");
  const topicMap = new Map();
  contextPapers.forEach((paper) => {
    Object.entries(paper.contentTopics || {}).forEach(([number, metadata]) => {
      if (selectedUnit !== "all" && number !== selectedUnit) return;
      const key = String(metadata?.key || "").trim();
      if (key && !topicMap.has(key)) topicMap.set(key, metadata?.label || key);
    });
  });
  const currentTopic = topicSelect.value || "all";
  const topicOptions = [...topicMap.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  topicSelect.innerHTML = [
    '<option value="all">All content topics</option>',
    ...topicOptions.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`),
  ].join("");
  topicSelect.value = topicMap.has(currentTopic) ? currentTopic : "all";
  topicSelect.hidden = scope !== "topic";
  if (scope !== "topic") topicSelect.value = "all";

  const currentCompletion = completionSelect.value || "all";
  completionSelect.innerHTML = '<option value="all">All progress</option><option value="not-completed">Not completed</option><option value="completed">Completed</option>';
  completionSelect.value = ["all", "not-completed", "completed"].includes(currentCompletion) ? currentCompletion : "all";
  completionSelect.hidden = scope === "review";
  if (scope === "review") completionSelect.value = "all";
}

function singleWritingTaskOption(task) {
  const item = normalizeItem(task || {});
  const taskNumber = writingTaskNumber(item) || 2;
  const book = itemBook(item);
  const test = itemTest(item);
  const source = item.source || "Writing";
  return {
    id: item.id,
    module: "writing",
    type: `Task ${taskNumber}`,
    title: [book ? `Cambridge ${book}` : source, test ? `Test ${test}` : "", `Writing Task ${taskNumber}`]
      .filter(Boolean)
      .join(" · "),
    source: item.source || "",
    period: item.period || "",
    writingTasks: [item],
  };
}

function scopeFromLegacyMode(moduleName, mode = "") {
  if (moduleName === "listening") {
    if (mode === "training") return "section";
    if (mode === "review") return "review";
    return "paper";
  }
  if (moduleName === "reading") {
    if (mode === "evidence") return "section";
    if (mode === "type") return "topic";
    if (mode === "review") return "review";
    return "paper";
  }
  return "paper";
}

function modeForPracticeScope(moduleName, scope = "paper") {
  if (moduleName === "listening") return scope === "section" || scope === "topic" ? "training" : scope === "review" ? "review" : "exam";
  if (moduleName === "reading") return scope === "section" || scope === "topic" ? "evidence" : scope === "review" ? "review" : "full";
  return currentSinglePracticeMode(moduleName);
}

function currentSinglePracticeScope(moduleName = state.activeModule) {
  if (!["listening", "reading"].includes(moduleName)) return "paper";
  const saved = state.singlePracticeScopes?.[moduleName];
  if (["paper", "section", "topic", "review"].includes(saved)) return saved;
  return scopeFromLegacyMode(moduleName, state.singlePracticeModes?.[moduleName]);
}

function setSinglePracticeScope(moduleName, scope) {
  if (!["listening", "reading"].includes(moduleName) || !["paper", "section", "topic", "review"].includes(scope)) return;
  state.singlePracticeScopes[moduleName] = scope;
  state.singlePracticeModes[moduleName] = modeForPracticeScope(moduleName, scope);
}

function practiceUnitTopicLabel(question) {
  return String(question?.typeLabel || question?.type || "Question type").trim();
}

function contentTopicForUnit(item, section) {
  const metadata = item?.contentTopics?.[String(section)] || item?.contentTopics?.[section] || {};
  return {
    key: String(metadata.key || "general").trim() || "general",
    label: String(metadata.label || "General interest").trim() || "General interest",
    emoji: String(metadata.emoji || "✨").trim() || "✨",
    title: String(metadata.title || `${item?.title || "IELTS source"} · ${section}`).trim(),
  };
}

function practiceUnitBaseId(item) {
  return String(item?.sourceItemId || item?.baseItemId || item?.id || "").split("::")[0];
}

function latestObjectiveResultForSource(moduleName, sourceItemId) {
  const historyItems = Object.values(readLearningLoopHistory().objectiveItems || {});
  const memoryItems = Object.values(state.latestObjectiveResultsByItem || {});
  const remoteItems = (state.learningState?.attempts || []).filter((attempt) => attempt.module === moduleName).map((attempt) => attempt.result).filter(Boolean);
  return [...memoryItems, ...historyItems, ...remoteItems, latestObjectiveResult(moduleName, sourceItemId)]
    .filter((result) => result?.module === moduleName && practiceUnitBaseId(result) === sourceItemId)
    .sort((a, b) => String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || "")))[0] || null;
}

function scopedPracticeUnit(moduleName, sourceItem, scope, value = "") {
  const base = normalizeItem(sourceItem);
  if (!base?.id || scope === "paper") return { ...base, sourceItemId: base.id, practiceScope: "paper" };
  const allQuestions = base.questions || [];
  let questions = allQuestions;
  let title = base.title || moduleDisplayName(moduleName);
  let minutes = Number(base.minutes) || (moduleName === "reading" ? 60 : 30);
  const unit = { ...base, sourceItemId: base.id, baseItemId: base.id, practiceScope: scope };
  if (scope === "section") {
    const section = Math.max(1, Math.min(moduleName === "reading" ? 3 : 4, Number(value) || 1));
    const [start, end] = singleSectionQuestionRange(moduleName, section);
    questions = questionsInRange(allQuestions, start, end);
    title = `${base.title || moduleDisplayName(moduleName)} · ${moduleName === "reading" ? "Passage" : "Section"} ${section}`;
    minutes = moduleName === "reading" ? 20 : 10;
    unit.id = `${base.id}::section::${section}`;
    unit.practiceSection = section;
    unit.libraryScope = "section";
    unit.contentTopic = contentTopicForUnit(base, section);
  } else if (scope === "topic") {
    const section = Number(value);
    const maxSection = moduleName === "reading" ? 3 : 4;
    if (Number.isInteger(section) && section >= 1 && section <= maxSection) {
      const [start, end] = singleSectionQuestionRange(moduleName, section);
      const contentTopic = contentTopicForUnit(base, section);
      questions = questionsInRange(allQuestions, start, end);
      title = contentTopic.title;
      minutes = moduleName === "reading" ? 20 : 10;
      unit.id = `${base.id}::section::${section}`;
      unit.practiceSection = section;
      unit.libraryScope = "topic";
      unit.contentTopic = contentTopic;
    } else {
      // Restore-only compatibility for sessions created by the old question-type Topic library.
      const type = String(value || "").trim();
      questions = allQuestions.filter((question) => question.type === type);
      const label = practiceUnitTopicLabel(questions[0]) || type;
      title = `${base.title || moduleDisplayName(moduleName)} · ${label}`;
      minutes = 20;
      unit.id = `${base.id}::topic::${type}`;
      unit.practiceTopic = type;
      unit.practiceTopicLabel = label;
      unit.libraryScope = "legacy-topic";
    }
  } else if (scope === "review") {
    const previous = latestObjectiveResultForSource(moduleName, base.id || "");
    const wrongIds = new Set(previous?.wrongQuestionIds || []);
    questions = allQuestions.filter((question) => wrongIds.has(question.id));
    unit.id = `${base.id}::review`;
    unit.reviewUnavailable = !questions.length;
    title = `${base.title || moduleDisplayName(moduleName)} · Review mistakes`;
    minutes = 15;
  }
  unit.title = title;
  unit.minutes = minutes;
  unit.questions = questions;
  if (moduleName === "listening") {
    const activeSections = new Set([...selectedQuestionNumbers(questions)].map((number) => Math.ceil(number / 10)));
    unit.audioUrls = (base.audioUrls || []).map((url, index) => activeSections.has(index + 1) ? url : "");
    unit.questionPageImages = paperImagesForQuestionSubset(base.questionPageImages || [], allQuestions, base.questionPaper, questions);
  } else if (moduleName === "reading") {
    const splitPages = splitReadingPageImages(base.readingPageImages || [], base.readingPaper, {
      passageImages: base.readingPassagePageImages || [],
      questionImages: base.readingQuestionPageImages || [],
    });
    const questionImages = paperImagesForQuestionSubset(splitPages.questionImages, allQuestions, base.readingPaper, questions);
    const passageImages = readingPassageImagesForQuestionSubset(
      splitPages.passageImages,
      base.readingPaper,
      questions,
      base.readingPassageStartPages || {},
    );
    unit.readingPassagePageImages = passageImages;
    unit.readingQuestionPageImages = questionImages;
    unit.readingPageImages = uniqueOrderedImages([...passageImages, ...questionImages]);
  }
  return unit;
}

function scopedPracticeUnits(moduleName, papers, scope = currentSinglePracticeScope(moduleName)) {
  if (!["listening", "reading"].includes(moduleName) || scope === "paper") return papers.map((item) => scopedPracticeUnit(moduleName, item, "paper"));
  if (scope === "section") {
    const count = moduleName === "reading" ? 3 : 4;
    return papers.flatMap((paper) => Array.from({ length: count }, (_, index) => scopedPracticeUnit(moduleName, paper, "section", index + 1)));
  }
  if (scope === "topic") {
    const count = moduleName === "reading" ? 3 : 4;
    return papers.flatMap((paper) => Array.from({ length: count }, (_, index) => scopedPracticeUnit(moduleName, paper, "topic", index + 1)))
      .filter((item) => item.questions.length);
  }
  return papers.map((paper) => scopedPracticeUnit(moduleName, paper, "review")).filter((item) => !item.reviewUnavailable);
}

function scopedPracticeUnitById(moduleName, id) {
  const match = String(id || "").match(/^(.*?)::(section|topic|review)(?:::(.+))?$/);
  if (!match) return null;
  const base = mergedItems(moduleName).map(normalizeItem).find((item) => item.id === match[1]);
  return base ? scopedPracticeUnit(moduleName, base, match[2], match[3] || "") : null;
}

function singleOptions(moduleName, completionIndex = null) {
  const allOptions = mergedItems(moduleName).map(normalizeItem);
  const filtered = applySingleFilters(allOptions, moduleName);
  if (["listening", "reading"].includes(moduleName)) {
    const scope = currentSinglePracticeScope(moduleName);
    const completionSnapshot = completionIndex || readPracticeCompletionIndex();
    return applySingleUnitFilters(scopedPracticeUnits(moduleName, filtered, scope), moduleName, scope, completionSnapshot);
  }
  if (moduleName !== "writing") return filtered;
  return filtered.map(singleWritingTaskOption);
}

function writingSystemOptions() {
  const tasks = mergedItems("writing").map(normalizeItem);
  return tasks
    .filter((task) => writingTaskNumber(task) === 2)
    .map((task2) => {
      return {
        id: `writing-set:${writingPairKey(task2)}`,
        module: "writing",
        type: "Task 2",
        title: [itemBook(task2) ? `Cambridge ${itemBook(task2)}` : task2.source || "Writing", itemTest(task2) ? `Test ${itemTest(task2)}` : "", "Writing Task 2"]
          .filter(Boolean)
          .join(" · "),
        source: task2.source || "",
        period: task2.period || "",
        writingTasks: [task2],
      };
    });
}

function writingSystemRecommended(options = writingSystemOptions()) {
  return chooseRotatingRecommendation("writing", options);
}

function writingPromptForTasks(tasks = []) {
  return tasks.filter(Boolean).map((task, index) => {
    const item = normalizeItem(task);
    const taskName = item.type || `Task ${index + 1}`;
    const body = [item.prompt, item.data].filter(Boolean).join("\n\nData: ");
    return `${taskName}: ${item.title || "Writing task"}\n${body}`;
  }).join("\n\n---\n\n");
}

function writingEssayForTasks(tasks = [], prefixRoot = "single") {
  return tasks.filter(Boolean).map((task, index) => {
    const item = normalizeItem(task);
    const taskName = item.type || `Task ${index + 1}`;
    const value = $(`${prefixRoot}-task${index + 1}-writing`)?.value.trim() || "";
    return `${taskName} response:\n${value}`;
  }).join("\n\n---\n\n");
}

function mergedItems(moduleName) {
  const user = getBank(moduleName);
  const data = state.data || {};
  const builtInRaw =
    moduleName === "listening"
      ? data.listeningTests
      : moduleName === "reading"
        ? data.readingTests
      : moduleName === "writing"
        ? data.writingTasks
          : moduleName === "speaking"
            ? data.speakingSets
            : [];
  const builtIn = moduleName === "speaking"
    ? [...(Array.isArray(builtInRaw) ? builtInRaw : []), ...builtInPublicSpeakingTopics, ...expandedPublicSpeakingTopics]
    : moduleName === "writing"
      ? [...(Array.isArray(builtInRaw) ? builtInRaw : []), ...builtInPublicWritingTopics]
      : builtInRaw;
  return [...user, ...(Array.isArray(builtIn) ? builtIn : [])];
}

function findItemById(moduleName, id) {
  if (!id) return null;
  const base = mergedItems(moduleName).map(normalizeItem).find((item) => item.id === id) || null;
  if (base || !["listening", "reading"].includes(moduleName)) return base;
  return scopedPracticeUnitById(moduleName, id);
}

function bundleDraftPayload(bundle) {
  if (!bundle) return null;
  return {
    listeningId: bundle.listening?.id || "",
    readingId: bundle.reading?.id || "",
    writingTaskIds: (bundle.writingTasks || [bundle.writing]).filter(Boolean).map((item) => item.id || ""),
    speakingId: bundle.speaking?.id || "",
  };
}

function restoreBundleFromDraft(payload) {
  if (!payload) return null;
  const writingTasks = (payload.writingTaskIds || []).map((id) => findItemById("writing", id)).filter(Boolean);
  const bundle = {
    listening: findItemById("listening", payload.listeningId),
    reading: findItemById("reading", payload.readingId),
    writingTasks,
    writing: writingTasks[0],
    speaking: findItemById("speaking", payload.speakingId),
  };
  return bundle.listening && bundle.reading && bundle.writingTasks.length && bundle.speaking ? bundle : null;
}

function isExamBundle(value) {
  return Boolean(value && typeof value === "object" && value.listening && value.reading && (value.writingTasks || value.writing) && value.speaking);
}

function formatTime(total) {
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function renderExamTimer() {
  ["examTimer", "examStickyTimer"].forEach((id) => {
    const node = $(id);
    if (node) node.textContent = formatTime(state.examSeconds);
  });
  ["examTimerToggle", "examStickyTimerToggle"].forEach((id) => {
    const node = $(id);
    if (node) node.textContent = state.examTimerId ? "Pause" : "Start";
  });
}

function stopExamTimer() {
  if (state.examTimerId) clearInterval(state.examTimerId);
  state.examTimerId = null;
  renderExamTimer();
}

function startExamTimer() {
  if (state.examTimerId) return;
  state.examTimerId = setInterval(() => {
    state.examSeconds = Math.max(0, state.examSeconds - 1);
    renderExamTimer();
    if (state.examSeconds === 0) stopExamTimer();
  }, 1000);
  renderExamTimer();
}

function renderSequenceTimer() {
  ["sequenceTimer", "sequenceStickyTimer"].forEach((id) => {
    const node = $(id);
    if (node) node.textContent = formatTime(state.sequenceSeconds);
  });
  ["sequenceTimerToggle", "sequenceStickyTimerToggle"].forEach((id) => {
    const node = $(id);
    if (node) node.textContent = state.sequenceTimerId ? "Pause" : "Start";
  });
}

function stopSequenceTimer() {
  if (state.sequenceTimerId) clearInterval(state.sequenceTimerId);
  state.sequenceTimerId = null;
  renderSequenceTimer();
}

function startSequenceTimer() {
  if (state.sequenceTimerId) return;
  state.sequenceTimerId = setInterval(() => {
    state.sequenceSeconds = Math.max(0, state.sequenceSeconds - 1);
    renderSequenceTimer();
    if (state.sequenceSeconds === 0) stopSequenceTimer();
  }, 1000);
  renderSequenceTimer();
}

function resetSequenceTimer() {
  state.sequenceSeconds = state.sequenceTotal;
  stopSequenceTimer();
}

function singleModuleTotal(moduleName = state.activeModule) {
  if (state.activeSingle?.module === moduleName && state.activeSingle?.practiceScope && state.activeSingle.practiceScope !== "paper") {
    const scopedMinutes = Number(state.activeSingle.minutes);
    if (Number.isFinite(scopedMinutes) && scopedMinutes > 0) return scopedMinutes * 60;
  }
  const mode = currentSinglePracticeMode(moduleName);
  if (moduleName === "listening" && mode === "training") return 10 * 60;
  if (["listening", "reading"].includes(moduleName) && mode === "review") return 15 * 60;
  if (moduleName === "reading" && ["evidence", "type"].includes(mode)) return 20 * 60;
  return {
    listening: 30 * 60,
    reading: 60 * 60,
    writing: 60 * 60,
    speaking: 15 * 60,
  }[moduleName] || 30 * 60;
}

function renderSingleTimer() {
  const timer = $("singleTimer");
  if (timer) timer.textContent = formatTime(state.singleSeconds);
  const toggle = $("singleTimerToggle");
  if (toggle) toggle.textContent = state.singleTimerId ? "Pause" : "Start";
}

function stopSingleTimer() {
  if (state.singleTimerId) clearInterval(state.singleTimerId);
  state.singleTimerId = null;
  renderSingleTimer();
}

function resetSingleTimer(moduleName = state.activeModule) {
  state.singleTotal = singleModuleTotal(moduleName);
  state.singleSeconds = state.singleTotal;
  stopSingleTimer();
}

function startSingleTimer() {
  if (state.singleTimerId) return;
  state.singleTimerId = setInterval(() => {
    state.singleSeconds = Math.max(0, state.singleSeconds - 1);
    renderSingleTimer();
    if (state.singleSeconds % 5 === 0) savePracticeSession();
    if (state.singleSeconds === 0) stopSingleTimer();
  }, 1000);
  renderSingleTimer();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      const preview = text.replace(/\s+/g, " ").slice(0, 160);
      throw new Error(`Server returned non-JSON content (${response.status}, ${contentType || "unknown type"}): ${preview}`);
    }
  }
  if (!response.ok) throw new Error(json?.error || `Request failed (${response.status})`);
  return json || {};
}

async function getJson(url, options = {}) {
  const authToken = Object.prototype.hasOwnProperty.call(options, "authToken") ? options.authToken : state.authToken;
  const headers = authToken ? { authorization: `Bearer ${authToken}` } : {};
  const response = await fetch(url, { cache: "no-store", headers });
  return parseJsonResponse(response);
}

async function postJson(url, payload, options = {}) {
  const headers = { "content-type": "application/json" };
  const authToken = Object.prototype.hasOwnProperty.call(options, "authToken") ? options.authToken : state.authToken;
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: options.signal,
  });
  return parseJsonResponse(response);
}

async function sendJsonRequest(url, method, payload, options = {}) {
  const headers = { "content-type": "application/json" };
  const authToken = Object.prototype.hasOwnProperty.call(options, "authToken") ? options.authToken : state.authToken;
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const response = await fetch(url, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

const putJson = (url, payload, options) => sendJsonRequest(url, "PUT", payload, options);
const patchJson = (url, payload, options) => sendJsonRequest(url, "PATCH", payload, options);

async function postBlobWithTimeout(url, blob, timeoutMs = 0) {
  const headers = {};
  if (blob?.type) headers["content-type"] = blob.type;
  if (state.authToken) headers.authorization = `Bearer ${state.authToken}`;
  const controller = timeoutMs && typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: blob,
      signal: controller?.signal,
    });
    return await parseJsonResponse(response);
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Recording upload timed out. Scoring will continue without MP3 evidence.");
    throw error;
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

async function deleteJson(url) {
  const headers = state.authToken ? { authorization: `Bearer ${state.authToken}` } : {};
  const response = await fetch(url, { method: "DELETE", headers });
  return parseJsonResponse(response);
}

function setHelpStatus(text) {
  const node = $("helpChatStatus");
  if (node) node.textContent = text || "";
}

function helpResponseStatus(mode) {
  if (mode === "ai") return "AI";
  if (mode === "evidence-required") return "Evidence needed";
  return "Local";
}

function writingFullTestOptions() {
  const groups = new Map();
  mergedItems("writing").map(normalizeItem).forEach((task) => {
    const taskNumber = writingTaskNumber(task);
    const pairKey = examSetKey(task);
    if (!pairKey || !taskNumber || task.source === "Public topics") return;
    if (!groups.has(pairKey)) groups.set(pairKey, {});
    groups.get(pairKey)[taskNumber] = task;
  });
  return [...groups.entries()]
    .filter(([, pair]) => pair[1] && pair[2])
    .map(([pairKey, pair]) => {
      const task1 = { ...pair[1], minutes: Number(pair[1].minutes) || 20 };
      const task2 = { ...pair[2], minutes: Number(pair[2].minutes) || 40 };
      const book = itemBook(task1) || itemBook(task2);
      const test = itemTest(task1) || itemTest(task2);
      return {
        id: `writing-full-test:${pairKey}`,
        module: "writing",
        type: "Full test",
        title: [book ? `Cambridge ${book}` : "Cambridge Writing", test ? `Test ${test}` : ""].filter(Boolean).join(" · "),
        source: task1.source || task2.source || "",
        period: task1.period || task2.period || "",
        book,
        test,
        task1Id: task1.id,
        task2Id: task2.id,
        writingTasks: [task1, task2],
      };
    })
    .sort((a, b) => (Number(a.book) - Number(b.book)) || (Number(a.test) - Number(b.test)));
}

function writingTopicOptions() {
  return mergedItems("writing").map(normalizeItem)
    .filter((task) => [1, 2].includes(writingTaskNumber(task)))
    .map((task) => ({
      ...singleWritingTaskOption(task),
      id: `writing-topic-task:${task.id}`,
      taskNumber: writingTaskNumber(task),
    }));
}

function coachRequestFailureMessage() {
  return "AI Coach is temporarily unavailable. Please retry in a moment. Your practice and conversation are still saved.";
}

function openHelpPanel() {
  const panel = $("helpChatPanel");
  if (panel) panel.hidden = false;
}

function updateHelpAttachmentPreview() {
  const preview = $("helpAttachmentPreview");
  if (!preview) return;
  preview.hidden = !state.help.pendingImageDataUrl;
}

function closeHelpPanel() {
  state.help.captureRequestId += 1;
  hideHelpCaptureOverlay();
  stopHelpCaptureStream();
  const panel = $("helpChatPanel");
  if (panel) panel.hidden = true;
  state.help.surfaceOverride = null;
  document.body.classList.remove("coach-dock-open");
}

function renderHelpInline(text) {
  return escapeHtml(text)
    .replace(/\*\*\s*(.+?)\s*\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderHelpRichText(text) {
  const lines = String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n");
  const html = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      closeList();
      html.push(`<h4>${renderHelpInline(heading[1])}</h4>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${renderHelpInline(bullet[1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${renderHelpInline(line)}</p>`);
  }
  closeList();
  return html.join("");
}

function setHelpMessageContent(item, role, text) {
  if (!item) return;
  if (role === "user") {
    item.textContent = text || "";
    return;
  }
  item.innerHTML = `<div class="help-rich">${renderHelpRichText(text || "")}</div>`;
}

function addHelpMessage(role, text) {
  const log = $("helpChatLog");
  if (!log) return null;
  const item = document.createElement("div");
  item.className = `help-message ${role === "user" ? "user" : "assistant"}`;
  setHelpMessageContent(item, role, text);
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
  return item;
}

function stopHelpCaptureStream() {
  if (state.help.stream) {
    state.help.stream.getTracks().forEach((track) => track.stop());
    state.help.stream = null;
  }
  state.help.video = null;
}

function hideHelpCaptureOverlay() {
  const overlay = $("helpCaptureOverlay");
  const selection = $("helpCaptureSelection");
  const toolbar = $("helpCaptureToolbar");
  if (overlay) overlay.hidden = true;
  if (selection) selection.style.cssText = "";
  if (toolbar) toolbar.hidden = true;
  state.help.selecting = false;
  state.help.selectionRect = null;
  state.help.dragMode = "";
  state.help.activeHandle = "";
  state.help.originRect = null;
}

function clampHelpRect(rect) {
  const minSize = 28;
  const normalized = {
    left: rect.width < 0 ? rect.left + rect.width : rect.left,
    top: rect.height < 0 ? rect.top + rect.height : rect.top,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
  const left = Math.max(0, Math.min(window.innerWidth - minSize, normalized.left));
  const top = Math.max(0, Math.min(window.innerHeight - minSize, normalized.top));
  const width = Math.max(minSize, Math.min(window.innerWidth - left, normalized.width));
  const height = Math.max(minSize, Math.min(window.innerHeight - top, normalized.height));
  return { left, top, width, height };
}

function positionHelpToolbar(rect) {
  const toolbar = $("helpCaptureToolbar");
  if (!toolbar || !rect) return;
  toolbar.hidden = false;
  const width = toolbar.offsetWidth || 260;
  const height = toolbar.offsetHeight || 42;
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width - width));
  const below = rect.top + rect.height + 10;
  const top = below + height < window.innerHeight ? below : Math.max(8, rect.top - height - 10);
  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;
}

function setHelpSelectionRect(rect, showToolbar = false) {
  const selection = $("helpCaptureSelection");
  if (!selection) return;
  const next = clampHelpRect(rect);
  state.help.selectionRect = next;
  const { left, top, width, height } = next;
  selection.style.left = `${left}px`;
  selection.style.top = `${top}px`;
  selection.style.width = `${width}px`;
  selection.style.height = `${height}px`;
  selection.style.display = "block";
  if (showToolbar) positionHelpToolbar(next);
  else if ($("helpCaptureToolbar")) $("helpCaptureToolbar").hidden = true;
}

function updateHelpSelection(x, y) {
  setHelpSelectionRect({
    left: Math.min(state.help.startX, x),
    top: Math.min(state.help.startY, y),
    width: Math.abs(x - state.help.startX),
    height: Math.abs(y - state.help.startY),
  }, false);
}

function helpEventPoint(event) {
  const touch = event.changedTouches?.[0] || event.touches?.[0];
  return {
    x: Math.max(0, Math.min(window.innerWidth, touch ? touch.clientX : event.clientX)),
    y: Math.max(0, Math.min(window.innerHeight, touch ? touch.clientY : event.clientY)),
  };
}

function beginHelpSelection(event) {
  if (event.target?.closest?.("#helpCaptureToolbar")) return;
  event.preventDefault?.();
  const point = helpEventPoint(event);
  state.help.selecting = true;
  state.help.originRect = state.help.selectionRect ? { ...state.help.selectionRect } : null;
  const handle = event.target?.dataset?.helpHandle || "";
  state.help.activeHandle = handle;
  if (handle && state.help.originRect) {
    state.help.dragMode = "resize";
  } else if (event.target?.closest?.("#helpCaptureSelection") && state.help.originRect) {
    state.help.dragMode = "move";
  } else {
    state.help.dragMode = "new";
    state.help.originRect = null;
  }
  state.help.startX = point.x;
  state.help.startY = point.y;
  if (state.help.dragMode === "new") updateHelpSelection(point.x, point.y);
  else setHelpSelectionRect(state.help.originRect, false);
}

function moveHelpSelection(event) {
  if (!state.help.selecting) return;
  event.preventDefault?.();
  const point = helpEventPoint(event);
  if (state.help.dragMode === "move" && state.help.originRect) {
    setHelpSelectionRect({
      ...state.help.originRect,
      left: state.help.originRect.left + point.x - state.help.startX,
      top: state.help.originRect.top + point.y - state.help.startY,
    }, false);
    return;
  }
  if (state.help.dragMode === "resize" && state.help.originRect) {
    const rect = { ...state.help.originRect };
    const dx = point.x - state.help.startX;
    const dy = point.y - state.help.startY;
    if (state.help.activeHandle.includes("w")) {
      rect.left += dx;
      rect.width -= dx;
    }
    if (state.help.activeHandle.includes("e")) rect.width += dx;
    if (state.help.activeHandle.includes("n")) {
      rect.top += dy;
      rect.height -= dy;
    }
    if (state.help.activeHandle.includes("s")) rect.height += dy;
    setHelpSelectionRect(rect, false);
    return;
  }
  updateHelpSelection(point.x, point.y);
}

function cropHelpSelectionToDataUrl(rect) {
  const video = state.help.video;
  if (!video || !video.videoWidth || !video.videoHeight) throw new Error("Screen capture is not ready.");
  const scaleX = video.videoWidth / window.innerWidth;
  const scaleY = video.videoHeight / window.innerHeight;
  const sourceX = Math.max(0, Math.round(rect.left * scaleX));
  const sourceY = Math.max(0, Math.round(rect.top * scaleY));
  const sourceWidth = Math.max(1, Math.round(rect.width * scaleX));
  const sourceHeight = Math.max(1, Math.round(rect.height * scaleY));
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(sourceWidth, 1800);
  canvas.height = Math.min(sourceHeight, 1800);
  const ctx = canvas.getContext("2d");
  const drawWidth = canvas.width;
  const drawHeight = canvas.height;
  ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, drawWidth, drawHeight);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function intersectRects(a, b) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}

async function ensureImageReady(img) {
  if (img.complete && img.naturalWidth && img.naturalHeight) return;
  await new Promise((resolve, reject) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", () => reject(new Error("The selected PDF image could not be loaded.")), { once: true });
  });
}

async function cropHelpSelectionFromPageImages(rect) {
  const images = [...document.querySelectorAll(".pdf-page img, .task-visual img")]
    .filter((img) => {
      const box = img.getBoundingClientRect();
      return intersectRects(rect, box);
    });
  if (!images.length) throw new Error("No PDF image was selected. Drag over the PDF text area, or type your question on the right.");

  const canvas = document.createElement("canvas");
  const scale = Math.min(2, window.devicePixelRatio || 1.5);
  canvas.width = Math.max(1, Math.min(2400, Math.round(rect.width * scale)));
  canvas.height = Math.max(1, Math.min(2400, Math.round(rect.height * scale)));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const img of images) {
    await ensureImageReady(img);
    const box = img.getBoundingClientRect();
    const hit = intersectRects(rect, box);
    if (!hit) continue;
    const sourceX = ((hit.left - box.left) / box.width) * img.naturalWidth;
    const sourceY = ((hit.top - box.top) / box.height) * img.naturalHeight;
    const sourceWidth = (hit.width / box.width) * img.naturalWidth;
    const sourceHeight = (hit.height / box.height) * img.naturalHeight;
    const destX = (hit.left - rect.left) * scale;
    const destY = (hit.top - rect.top) * scale;
    const destWidth = hit.width * scale;
    const destHeight = hit.height * scale;
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
  }

  return canvas.toDataURL("image/jpeg", 0.9);
}

async function explainHelpImage(imageDataUrl) {
  openGlobalCoachPanel();
  setHelpStatus("Recognizing");
  addHelpMessage("assistant", "Recognizing the selected area...");
  try {
    const helpContext = buildCoachHelpContext();
    const json = await postJson("/api/help/explain", { imageDataUrl, helpContext });
    state.help.contextText = json.ocrText || "";
    state.help.context = helpContext;
    state.help.history = [{ role: "assistant", content: json.answer || "", createdAt: new Date().toISOString() }];
    persistCoachThread(state.help.binding, state.help.history);
    const last = $("helpChatLog")?.lastElementChild;
    setHelpMessageContent(last, "assistant", json.answer || "I could not recognize enough text. Try a tighter screenshot or type your question.");
    if (json.readingEvidence) {
      focusReadingEvidence(json.readingEvidence);
      appendReadingEvidenceAction(last, json.readingEvidence);
    }
    setHelpStatus(helpResponseStatus(json.mode));
  } catch (error) {
    const last = $("helpChatLog")?.lastElementChild;
    setHelpMessageContent(last, "assistant", coachRequestFailureMessage());
    setHelpStatus("Error");
  }
}

function attachHelpImage(imageDataUrl) {
  state.help.pendingImageDataUrl = imageDataUrl || "";
  updateHelpAttachmentPreview();
  openGlobalCoachPanel();
  setHelpStatus(state.help.pendingImageDataUrl ? "Image attached" : "Ready");
}

function isCoachCaptureMode(mode = state.help.captureMode) {
  return String(mode || "").startsWith("coach-");
}

function setCaptureStatus(text) {
  setHelpStatus(text);
}

function addCaptureAssistantMessage(text) {
  addHelpMessage("assistant", text);
}

async function finishHelpSelection(event) {
  if (!state.help.selecting) return;
  event.preventDefault?.();
  state.help.selecting = false;
  const rect = state.help.selectionRect;
  state.help.dragMode = "";
  state.help.activeHandle = "";
  state.help.originRect = null;
  if (!rect || rect.width < 28 || rect.height < 28) {
    setCaptureStatus("Drag area");
    return;
  }
  setHelpSelectionRect(rect, true);
  setCaptureStatus("Adjust or Explain");
}

async function confirmHelpSelection() {
  const rect = state.help.selectionRect;
  try {
    if (!rect || rect.width < 28 || rect.height < 28) throw new Error("Selected area is too small.");
    const toolbar = $("helpCaptureToolbar");
    if (toolbar) toolbar.hidden = true;
    const imageDataUrl = state.help.video
      ? cropHelpSelectionToDataUrl(rect)
      : await cropHelpSelectionFromPageImages(rect);
    hideHelpCaptureOverlay();
    stopHelpCaptureStream();
    if (state.help.captureMode === "attach" || state.help.captureMode === "coach-attach") {
      attachHelpImage(imageDataUrl);
      return;
    }
    await explainHelpImage(imageDataUrl);
  } catch (error) {
    stopHelpCaptureStream();
    openGlobalCoachPanel();
    setCaptureStatus("Ready");
    addCaptureAssistantMessage(error.message || "Could not capture the selected area.");
  }
}

function retakeHelpSelection() {
  state.help.selectionRect = null;
  state.help.selecting = false;
  state.help.dragMode = "";
  state.help.activeHandle = "";
  state.help.originRect = null;
  const selection = $("helpCaptureSelection");
  const toolbar = $("helpCaptureToolbar");
  if (selection) selection.style.cssText = "";
  if (toolbar) toolbar.hidden = true;
  setCaptureStatus(state.help.video ? "Drag screen area" : "Drag PDF area");
}

async function beginHelpCapture(mode = "explain") {
  const captureMode = typeof mode === "string" ? mode : "explain";
  state.help.captureMode = captureMode;
  const requestId = state.help.captureRequestId + 1;
  state.help.captureRequestId = requestId;
  openGlobalCoachPanel();
  retakeHelpSelection();
  setCaptureStatus("Capture");
  if (!navigator.mediaDevices?.getDisplayMedia) {
    state.help.video = null;
    stopHelpCaptureStream();
    const overlay = $("helpCaptureOverlay");
    if (overlay) overlay.hidden = false;
    addCaptureAssistantMessage("Drag over the PDF question area. I will crop that part of the page and attach it.");
    setCaptureStatus("Drag PDF area");
    return;
  }
  try {
    stopHelpCaptureStream();
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 1 },
      audio: false,
    });
    if (state.help.captureRequestId !== requestId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    if (state.help.captureRequestId !== requestId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    state.help.stream = stream;
    state.help.video = video;
    const overlay = $("helpCaptureOverlay");
    if (overlay) overlay.hidden = false;
    setCaptureStatus("Drag area");
  } catch (error) {
    stopHelpCaptureStream();
    if (state.help.captureRequestId !== requestId) return;
    state.help.video = null;
    const overlay = $("helpCaptureOverlay");
    if (overlay) overlay.hidden = false;
    addCaptureAssistantMessage("Screen capture was not started. Drag over the PDF question area instead, or type your question here.");
    setCaptureStatus("Drag PDF area");
  }
}

async function sendHelpChatMessage(message) {
  const clean = String(message || "").trim();
  const imageDataUrl = state.help.pendingImageDataUrl || "";
  if (!clean && !imageDataUrl) return;
  if (state.help.busy) return;
  state.help.busy = true;
  const agentActions = coachAgentActionsFromText(clean);
  const agentAction = agentActions[0] || null;
  openGlobalCoachPanel();
  renderGlobalCoachContext();
  addHelpMessage("user", [clean, imageDataUrl ? "[Screenshot attached]" : ""].filter(Boolean).join("\n"));
  setHelpStatus("Thinking");
  try {
    const helpContext = await hydrateCoachEvidenceContext(buildCoachHelpContext({}));
    const json = await postJson("/api/help/chat", {
      binding: currentCoachBinding(),
      contextText: state.help.contextText,
      helpContext,
      history: state.help.history.slice(-8),
      imageDataUrl,
      message: clean || "Please explain this screenshot.",
    });
    const answerNode = addHelpMessage("assistant", json.answer || "");
    if (json.readingEvidence) {
      focusReadingEvidence(json.readingEvidence);
      appendReadingEvidenceAction(answerNode, json.readingEvidence);
    } else {
      appendCoachAgentActions(answerNode, agentActions);
    }
    if (json.ocrText) state.help.contextText = [state.help.contextText, json.ocrText].filter(Boolean).join("\n\n");
    state.help.context = helpContext;
    const createdAt = new Date().toISOString();
    state.help.history.push(
      { role: "user", content: clean || "[Screenshot attached]", createdAt },
      { role: "assistant", content: json.answer || "", createdAt },
    );
    persistCoachThread(state.help.binding, state.help.history);
    state.help.pendingImageDataUrl = "";
    updateHelpAttachmentPreview();
    setHelpStatus(helpResponseStatus(json.mode));
    if (agentAction?.autoOpen && !json.readingEvidence) {
      setHelpStatus("Opening practice");
      window.setTimeout(() => {
        runCoachAgentAction(agentAction.action);
      }, 650);
    }
  } catch (error) {
    const fallbackNode = addHelpMessage("assistant", coachRequestFailureMessage());
    appendCoachAgentActions(fallbackNode, agentActions);
    setHelpStatus("Error");
  } finally {
    state.help.busy = false;
  }
}

function bindHelpControls() {
  document.querySelectorAll("[data-help-trigger]").forEach((button) => {
    button.onclick = () => beginHelpCapture("explain");
  });
  const globalCoach = $("globalHelpButton");
  if (globalCoach) globalCoach.onclick = openGlobalCoachPanel;
}

async function runWritingFeedbackJob(prompt, essay, onStatus, extraPayload = {}) {
  const start = await postJson("/api/writing/feedback/start", { prompt, essay, ...extraPayload });
  if (!start.jobId) return start;
  const startedAt = Date.now();
  let delay = 1200;
  while (Date.now() - startedAt < 12 * 60 * 1000) {
    await sleep(delay);
    const status = await getJson(`/api/writing/feedback/job/${encodeURIComponent(start.jobId)}`);
    if (status.status === "done") return status.result || status;
    if (status.status === "error") throw new Error(status.error || "Writing feedback failed");
    if (onStatus) onStatus(status);
    delay = Math.min(5000, Math.round(delay * 1.25));
  }
  throw new Error("Writing feedback is still running. Please try again in a moment.");
}

function pdfDownloadLink(json, fallbackName) {
  if (!json?.pdfUrl && !json?.pdfDataUrl) return "";
  const fileName = escapeHtml(json.pdfFileName || fallbackName || "ielts-report.pdf");
  const href = escapeHtml(json.pdfUrl || json.pdfDataUrl);
  const openAttrs = json.pdfUrl ? ` target="_blank" rel="noopener"` : "";
  return `\n\n<a class="report-download" href="${href}" download="${fileName}"${openAttrs}>Open / download PDF report</a>`;
}

function extractBandByPatterns(text, patterns) {
  const clean = String(text || "");
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    const band = normalizeSpeakingBand(match?.[1]);
    if (band) return band;
  }
  return "";
}

function extractWritingScores(text, analysis = null) {
  if (Array.isArray(analysis?.criteria) && analysis.criteria.length >= 4) {
    const criteria = analysis.criteria.slice(0, 4).map((item) => ({
      label: String(item?.label || "Writing criterion"),
      score: normalizeSpeakingBand(item?.score),
      feedback: compactText(String(item?.feedback || item?.issue || "").trim(), 520),
    }));
    const numeric = criteria.map((item) => Number.parseFloat(item.score)).filter(Number.isFinite);
    const calculated = numeric.length === 4 ? normalizeSpeakingBand(numeric.reduce((sum, score) => sum + score, 0) / 4) : "";
    return { overall: calculated || normalizeSpeakingBand(analysis.overall), criteria };
  }
  const clean = String(text || "");
  const overall = extractBandByPatterns(clean, [
    /overall\s*(?:writing\s*)?(?:band|score|estimate)\s*(?:is|=|:|：|-)?\s*(?:band\s*)?([0-9](?:\.\d)?)/i,
    /(?:final|estimated)\s*(?:writing\s*)?(?:band|score)\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /overall,?\s*i\s+would\s+score[^\n]{0,80}?band\s*score\s*([0-9](?:\.\d)?)/i,
    /overall[^\n]{0,100}?band\s*(?:score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /总分\s*(?:=|:|：|-)?\s*([0-9](?:\.\d)?)/,
  ]);
  const definitions = [
    ["Task Response", /task\s*(?:response|achievement)/i, /(?:task\s*(?:response|achievement)|\btr\b|\bta\b|任务(?:回应|完成))[^\n|:：=]{0,48}(?:band|score)?\s*(?:is|=|:|：|-|\|)?\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/i],
    ["Coherence & Cohesion", /coherence\s*(?:and|&)\s*cohesion/i, /(?:coherence\s*(?:and|&)\s*cohesion|\bcc\b|连贯|衔接)[^\n|:：=]{0,48}(?:band|score)?\s*(?:is|=|:|：|-|\|)?\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/i],
    ["Lexical Resource", /lexical\s*resource/i, /(?:lexical\s*resource|\blr\b|词汇)[^\n|:：=]{0,48}(?:band|score)?\s*(?:is|=|:|：|-|\|)?\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/i],
    ["Grammatical Range & Accuracy", /grammatical\s*range\s*(?:and|&)\s*accuracy/i, /(?:grammatical\s*range\s*(?:and|&)\s*accuracy|grammar|\bgra\b|语法)[^\n|:：=]{0,58}(?:band|score)?\s*(?:is|=|:|：|-|\|)?\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/i],
  ];
  const tableStart = clean.search(/category\s*\|\s*feedback\s*\|\s*score/i);
  const tableSource = tableStart >= 0 ? clean.slice(tableStart) : "";
  const tableScores = new Map();
  if (tableSource) {
    definitions.forEach(([label, rowPattern], index) => {
      const row = tableSource.match(rowPattern);
      if (!row || row.index == null) return;
      const bodyStart = row.index + row[0].length;
      const nextRows = definitions
        .slice(index + 1)
        .map(([, nextPattern]) => tableSource.slice(bodyStart).search(nextPattern))
        .filter((position) => position >= 0);
      const overallPosition = tableSource.slice(bodyStart).search(/overall\b/i);
      if (overallPosition >= 0) nextRows.push(overallPosition);
      const bodyEnd = nextRows.length ? bodyStart + Math.min(...nextRows) : tableSource.length;
      const scoreMatches = [...tableSource.slice(bodyStart, bodyEnd).matchAll(/\|\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/g)];
      const score = scoreMatches.at(-1)?.[1] || "";
      if (score) tableScores.set(label, score);
    });
  }
  const criteria = definitions.map(([label, , inlinePattern]) => ({
    label,
    score: normalizeSpeakingBand(tableScores.get(label) || clean.match(inlinePattern)?.[1]),
  }));
  const numeric = criteria.map((item) => Number.parseFloat(item.score)).filter(Number.isFinite);
  const calculated = numeric.length === 4 ? normalizeSpeakingBand(numeric.reduce((sum, score) => sum + score, 0) / 4) : "";
  return { overall: calculated || overall, criteria };
}

function validStructuredWritingPhrases(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 8).map((item) => {
    if (!item || typeof item !== "object") return null;
    const from = String(item.from || "").trim();
    const to = String(item.to || "").trim();
    const looksLikeCommentary = /(?:这一段|这个段落|评分|分数|band|criterion|task response|coherence|lexical resource|grammatical range)/i;
    if (!from || !to || from.length > 100 || to.length > 140 || looksLikeCommentary.test(from) || looksLikeCommentary.test(to)) return null;
    return { from: compactText(from, 100), to: compactText(to, 140) };
  }).filter(Boolean);
}

function writingFeedbackLines(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

function writingCriterionPattern(label) {
  const patterns = {
    "Task Response": /(?:task\s*(?:response|achievement)|\btr\b|\bta\b|任务(?:回应|完成))/i,
    "Coherence & Cohesion": /(?:coherence\s*(?:and|&)\s*cohesion|\bcc\b|连贯|衔接)/i,
    "Lexical Resource": /(?:lexical\s*resource|\blr\b|词汇)/i,
    "Grammatical Range & Accuracy": /(?:grammatical\s*range\s*(?:and|&)\s*accuracy|grammar|\bgra\b|语法)/i,
  };
  return patterns[label] || new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function writingCriterionPatterns() {
  return [
    writingCriterionPattern("Task Response"),
    writingCriterionPattern("Coherence & Cohesion"),
    writingCriterionPattern("Lexical Resource"),
    writingCriterionPattern("Grammatical Range & Accuracy"),
  ];
}

function stripWritingLabelContent(line, pattern) {
  return String(line || "")
    .replace(pattern, "")
    .replace(/^[\s:：=\-|]+/, "")
    .replace(/^(?:band|score)?\s*[0-9](?:\.\d)?\s*(?:[:：=\-|]+)?/i, "")
    .trim();
}

function feedbackSnippetForLabel(text, label) {
  const lines = writingFeedbackLines(text);
  const pattern = writingCriterionPattern(label);
  const allPatterns = writingCriterionPatterns();
  const candidates = lines
    .map((line, index) => ({ line, index, content: stripWritingLabelContent(line, pattern) }))
    .filter((item) => pattern.test(item.line));
  const picked = candidates.find((item) => item.content.length > 16 && !/^[0-9](?:\.\d)?$/.test(item.content)) || candidates[0];
  if (!picked) {
    return compactText(lines.find((line) => line.length > 42) || "Detailed feedback is available in the full report below.", 220);
  }
  const snippets = [];
  if (picked.content && !/^[0-9](?:\.\d)?$/.test(picked.content)) snippets.push(picked.content);
  for (let index = picked.index + 1; index < lines.length && snippets.join(" ").length < 260; index += 1) {
    const line = lines[index];
    if (/^(?:ai feedback|corrected essay|improved words|phrases|overall band|总分|范文|评分)/i.test(line)) continue;
    if (allPatterns.some((itemPattern) => itemPattern.test(line))) break;
    snippets.push(line);
  }
  return compactText(snippets.join(" ") || "Detailed feedback is available in the full report below.", 220);
}

function extractWritingPhraseItems(text) {
  const lines = writingFeedbackLines(text);
  const phraseLines = lines.filter((line) => /(?:->|→|replace|instead of|more precise|better phrase|词|表达|改成|替换)/i.test(line));
  const items = [];
  phraseLines.forEach((line) => {
    const stripped = stripWritingLabelContent(line, writingCriterionPattern("Lexical Resource"));
    String(stripped || line)
      .split(/[;；]\s*/)
      .forEach((part) => {
        const match = part.match(/(.+?)\s*(?:->|→|=>|改成|替换为|better phrase:?)\s*(.+)/i);
        if (match) {
          const from = compactText(match[1].replace(/^(?:replace|instead of)\s+/i, ""), 34);
          const to = compactText(match[2], 48);
          if (from && to) items.push({ from, to });
          return;
        }
        const fallback = compactText(part, 96);
        if (fallback) items.push(fallback);
      });
  });
  return items.slice(0, 6);
}

function renderWritingScoreBar(label, score) {
  const percent = speakingScorePercent(score);
  return `<div class="writing-result-score-row">
    <span>${escapeHtml(label)}</span>
    <i><b style="width:${percent.toFixed(1)}%"></b></i>
    <strong>${escapeHtml(score || "--")}</strong>
  </div>`;
}

function renderLegacyWritingReportHtml(text, json, fallbackName) {
  const attempt = state.latestWritingAttempt || readLearningLoopHistory().writing || {};
  const analysis = json?.analysis || attempt.analysis || null;
  const scores = extractWritingScores(text, analysis);
  const overall = scores.overall || "--";
  const structuredPhrases = validStructuredWritingPhrases(analysis?.phrases);
  const phrases = structuredPhrases.length ? structuredPhrases : extractWritingPhraseItems(text);
  const pdfLink = pdfDownloadLink(json, fallbackName);
  const date = new Date().toLocaleString();
  const impact = writingImpactInsight(text, scores, attempt, analysis);
  const originalParagraph = impact.paragraph || String(attempt.essay || "").split(/\n\s*\n/).map((item) => item.trim()).find(Boolean) || "";
  return `<article class="writing-result-page">
    <header class="writing-result-topbar">
      <div>
        <span class="eyebrow">Writing Result</span>
        <h3>Writing Report</h3>
        <p>Generated on ${escapeHtml(date)}</p>
      </div>
      <div class="writing-result-actions">${pdfLink}</div>
    </header>
    <section class="writing-result-overview">
      <div class="writing-result-overall">
        <span>Overall Band</span>
        <strong>${escapeHtml(overall)}</strong>
        <em>${Number.parseFloat(overall) >= 7 ? "Good" : "Keep improving"}</em>
      </div>
      <div class="writing-result-bars">
        ${scores.criteria.map((item) => renderWritingScoreBar(item.label, item.score)).join("")}
      </div>
    </section>
    <section class="writing-impact-panel">
      <header>
        <div><span>Highest-impact issue</span><h4>${escapeHtml(impact.criterion)}</h4></div>
        <strong>${escapeHtml(impact.score || "Review")}</strong>
      </header>
      <p>${escapeHtml(impact.issue)}</p>
      <blockquote><span>Exact evidence from your essay</span>${escapeHtml(impact.evidence)}</blockquote>
      <div class="writing-impact-next"><span>Rewrite focus</span><strong>${escapeHtml(impact.instruction)}</strong></div>
    </section>
    <section class="writing-result-grid">
      <div class="writing-result-card writing-feedback-card">
        <div class="writing-result-section-title"><span>Criterion review</span><strong>What held the score back</strong></div>
        ${scores.criteria.map((item) => `<article>
          <div><strong>${escapeHtml(item.label)}</strong><b>${escapeHtml(item.score || "--")}</b></div>
          <p>${escapeHtml(item.feedback || feedbackSnippetForLabel(text, item.label))}</p>
        </article>`).join("")}
      </div>
      <aside class="writing-result-card writing-phrase-card">
        <h4>Improved Words & Phrases</h4>
        ${(phrases.length ? phrases : ["Open the full feedback to review corrected wording.", "Rewrite one paragraph using the strongest suggested phrase."]).map((item) => {
          if (typeof item === "object") {
            return `<div class="writing-phrase-pair"><span>${escapeHtml(item.from)}</span><strong>${escapeHtml(item.to)}</strong></div>`;
          }
          return `<p>${escapeHtml(item)}</p>`;
        }).join("")}
      </aside>
    </section>
    <section class="writing-rewrite-mode">
      <div>
        <span class="eyebrow">Rewrite mode</span>
        <strong>Fix this paragraph before starting another essay.</strong>
        <p>${escapeHtml(impact.instruction)}</p>
      </div>
      <button class="primary" type="button" data-writing-result-action="rewrite">Rewrite one paragraph</button>
    </section>
    <section class="writing-rewrite-editor" hidden>
      <header><div><span class="eyebrow">Rewrite round</span><h4>Improve one paragraph, then score it again.</h4></div><button class="icon-btn" type="button" data-writing-result-action="close-rewrite" aria-label="Close rewrite editor">Close</button></header>
      <div class="writing-rewrite-columns">
        <label><span>Original paragraph</span><textarea data-writing-original rows="7">${escapeHtml(originalParagraph)}</textarea></label>
        <label><span>Your rewrite</span><textarea data-writing-revision rows="7" placeholder="Rewrite the paragraph here..."></textarea></label>
      </div>
      <div class="writing-rewrite-submit">
        <p>AI will compare the two paragraphs against the same task and show the score movement.</p>
        <button class="primary" type="button" data-writing-result-action="rescore">Score rewrite</button>
      </div>
      <div class="writing-rewrite-result" aria-live="polite"></div>
    </section>
    <section class="writing-result-next-actions" aria-label="Next Writing steps">
      <div><span>Continue the learning loop</span><strong>Save the issue, practise it, or ask with full context.</strong></div>
      <button class="secondary" type="button" data-writing-result-action="save-weak">Save weak area</button>
      <button class="primary" type="button" data-writing-result-action="next-task">Start targeted task</button>
      <button class="secondary" type="button" data-writing-result-action="coach">Ask AI Coach</button>
    </section>
    <details class="writing-raw-feedback">
      <summary>View full feedback</summary>
      <div>${escapeHtml(text).replace(/\n/g, "<br>")}</div>
    </details>
  </article>`;
}

function renderWritingReportHtml(text, json, fallbackName) {
  const attempt = state.latestWritingAttempt || readLearningLoopHistory().writing || {};
  const analysis = json?.analysis || attempt.analysis || null;
  const scores = extractWritingScores(text, analysis);
  const overall = scores.overall || "--";
  const impact = writingImpactInsight(text, scores, attempt, analysis);
  const evidenceItems = json?.contract?.evidence || attempt.contract?.evidence || writingTextEvidence("task", attempt.essay || "", analysis);
  const contractItems = json?.contract?.attempt?.items || attempt.contract?.attempt?.items || [];
  const evidenceSources = contractItems.length
    ? contractItems.map((item, index) => ({ id: item.id || `task${index + 1}`, label: `Task ${index + 1} response`, text: item.response || item.essay || "" }))
    : [{ id: "task", label: "Submitted response", text: attempt.essay || "" }];
  const phrases = validStructuredWritingPhrases(analysis?.phrases).length
    ? validStructuredWritingPhrases(analysis?.phrases)
    : extractWritingPhraseItems(text);
  const originalParagraph = impact.paragraph || String(attempt.essay || "").split(/\n\s*\n/).map((item) => item.trim()).find(Boolean) || "";
  const taskScores = json?.contract?.score?.tasks || attempt.taskScores || analysis?.taskScores || [];
  const taskSummary = taskScores.length ? `<div class="writing-task-score-summary">${taskScores.map((task) => `<div data-writing-task-score="${escapeHtml(String(task.taskNumber))}"><span>Task ${escapeHtml(String(task.taskNumber))}</span><strong>${escapeHtml(task.overall || "--")}</strong></div>`).join("")}<div class="weighted"><span>Weighted overall · 1:2</span><strong data-writing-overall>${escapeHtml(overall)}</strong></div></div>` : "";
  const learningHistory = readLearningLoopHistory();
  const writingHistory = [attempt, ...(learningHistory.writingAttempts || [])]
    .filter((item, index, items) => item && items.findIndex((candidate) => candidate?.attemptId === item.attemptId) === index)
    .filter((item) => !attempt.title || item.title === attempt.title)
    .slice(0, 5);
  const pdfLink = pdfDownloadLink(json, fallbackName);
  return `<article class="writing-result-page unified-result-shell" data-result-module="writing">
    <header class="unified-result-header">
      <div><span class="eyebrow">Writing feedback</span><h3>Your Writing result</h3></div>
      <details class="result-more"><summary>More</summary><div>${pdfLink || "No downloadable report for this attempt."}</div></details>
    </header>
    <nav class="unified-result-tabs" role="tablist">
      ${[["overview","Overview"],["evidence","Evidence"],["improve","Improve"],["history","History"]].map(([key,label], index) => `<button type="button" data-result-tab="${key}" class="${index === 0 ? "active" : ""}" aria-selected="${index === 0}">${label}</button>`).join("")}
    </nav>
    <section data-result-panel="overview" class="unified-result-panel result-overview-panel">
      <div class="unified-score-summary"><div><span>Overall Band</span><strong>${escapeHtml(overall)}</strong><em>Target 7.0</em></div><div><span>Highest-impact issue</span><strong>${escapeHtml(impact.criterion)}</strong><p>${escapeHtml(impact.issue)}</p></div><blockquote><span>Exact evidence</span>${escapeHtml(impact.evidence)}</blockquote></div>
      ${taskSummary}
      <button class="primary unified-result-primary" type="button" data-writing-result-action="rewrite">Improve this skill</button>
      <div class="unified-score-bars">${scores.criteria.map((item) => renderWritingScoreBar(item.label, item.score)).join("")}</div>
    </section>
    <section data-result-panel="evidence" class="unified-result-panel" hidden>
      <div class="writing-impact-panel"><header><div><span>Evidence review</span><h4>${escapeHtml(impact.criterion)}</h4></div><strong>${escapeHtml(impact.score || "Review")}</strong></header><p>${escapeHtml(impact.issue)}</p><blockquote><span>Exact evidence from your essay</span>${escapeHtml(impact.evidence)}</blockquote><div class="writing-impact-next"><span>Success criterion</span><strong>${escapeHtml(impact.instruction)}</strong></div></div>
      <div class="writing-evidence-list">${evidenceItems.length ? evidenceItems.map((item) => `<button type="button" data-evidence-id="${escapeHtml(item.id)}" data-source-highlight data-item-id="${escapeHtml(item.itemId || "task")}" data-start="${escapeHtml(String(item.range?.start ?? ""))}" data-end="${escapeHtml(String(item.range?.end ?? ""))}" data-quote="${escapeHtml(item.quote || "")}">${escapeHtml(item.quote)}</button>`).join("") : `<p>No exact evidence range was returned for this attempt.</p>`}</div>
      <div class="writing-evidence-sources">${evidenceSources.map((item) => `<article data-writing-source-item="${escapeHtml(item.id)}"><span>${escapeHtml(item.label)}</span><pre>${escapeHtml(item.text)}</pre></article>`).join("")}</div>
      <section class="writing-result-grid"><div class="writing-result-card writing-feedback-card"><div class="writing-result-section-title"><span>Criterion review</span><strong>What held the score back</strong></div>${scores.criteria.map((item) => `<article><div><strong>${escapeHtml(item.label)}</strong><b>${escapeHtml(item.score || "--")}</b></div><p>${escapeHtml(item.feedback || feedbackSnippetForLabel(text, item.label))}</p></article>`).join("")}</div><aside class="writing-result-card writing-phrase-card"><h4>Better wording</h4>${(phrases.length ? phrases : [{ from: "Review the evidence", to: "Rewrite it with more precise language" }]).map((item) => typeof item === "object" ? `<div class="writing-phrase-pair"><span>${escapeHtml(item.from)}</span><strong>${escapeHtml(item.to)}</strong></div>` : `<p>${escapeHtml(item)}</p>`).join("")}</aside></section>
    </section>
    <section data-result-panel="improve" class="unified-result-panel" hidden>
      <section class="writing-rewrite-mode"><div><span class="eyebrow">Targeted rewrite</span><strong>${escapeHtml(impact.instruction)}</strong><p>This paragraph check does not replace your full IELTS Band.</p></div><button class="primary" type="button" data-writing-result-action="rewrite">Start rewrite</button></section>
      <section class="writing-rewrite-editor" hidden><header><div><span class="eyebrow">Rewrite round</span><h4>Improve the same paragraph against one success criterion.</h4></div><button class="icon-btn" type="button" data-writing-result-action="close-rewrite">Close</button></header><div class="writing-rewrite-columns"><label><span>Original paragraph</span><textarea data-writing-original rows="7">${escapeHtml(originalParagraph)}</textarea></label><label><span>Your rewrite</span><textarea data-writing-revision rows="7"></textarea></label></div><div class="writing-rewrite-submit"><p>${escapeHtml(impact.instruction)}</p><button class="primary" type="button" data-writing-result-action="rescore">Check this rewrite</button></div><div class="writing-rewrite-result" aria-live="polite"></div></section>
      <section class="writing-result-next-actions"><button class="secondary" type="button" data-writing-result-action="save-weak">Save weak area</button><button class="primary" type="button" data-writing-result-action="next-task">Start targeted task</button><button class="secondary" type="button" data-writing-result-action="coach">Ask AI Coach</button></section>
    </section>
    <section data-result-panel="history" class="unified-result-panel" hidden><div class="result-history-list">${writingHistory.map((item, index) => { const itemBand = item.scores?.overall || item.analysis?.overall || "--"; const previousBand = writingHistory[index + 1]?.scores?.overall || writingHistory[index + 1]?.analysis?.overall || ""; return `<div class="result-history-row"><span>${index === 0 ? "Current full attempt" : `Attempt ${index + 1}`}</span><strong>${escapeHtml(itemBand)}</strong><em>${escapeHtml([bandDeltaLabel(itemBand, previousBand), item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Today"].filter(Boolean).join(" · "))}</em></div>`; }).join("")}</div><details class="writing-raw-feedback"><summary>Full report</summary><div>${escapeHtml(text).replace(/\n/g, "<br>")}</div></details></section>
  </article>`;
}

function writingEvidenceExcerpt(essay, feedback = "") {
  const source = String(essay || "").trim();
  if (!source) return "No essay excerpt is available for this attempt.";
  const quoted = [...String(feedback || "").matchAll(/[\"“]([^\"”]{24,240})[\"”]/g)]
    .map((match) => match[1].trim())
    .find((candidate) => source.toLowerCase().includes(candidate.toLowerCase()));
  if (quoted) return compactText(quoted, 240);
  const paragraphs = source.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const paragraph = paragraphs.find((item) => item.split(/\s+/).length >= 18) || paragraphs[0] || source;
  const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
  return compactText(sentences.find((item) => item.trim().split(/\s+/).length >= 8) || sentences[0], 240);
}

function writingImpactInsight(text, scores, attempt = {}, analysis = null) {
  const ranked = (scores?.criteria || [])
    .map((item) => ({ ...item, numeric: Number.parseFloat(item.score) }))
    .sort((a, b) => (Number.isFinite(a.numeric) ? a.numeric : 99) - (Number.isFinite(b.numeric) ? b.numeric : 99));
  const weakest = ranked[0] || { label: "Task Response", score: "" };
  const structured = analysis?.highestImpact && typeof analysis.highestImpact === "object" ? analysis.highestImpact : null;
  const instructions = {
    "Task Achievement": "Write a clear overview of the main features, then select and compare the most important data without listing every detail.",
    "Task Response": "Make the position explicit, develop one central idea, and support it with a specific example.",
    "Coherence & Cohesion": "Rebuild the paragraph around one topic sentence and make every sentence advance that idea.",
    "Lexical Resource": "Replace vague or repeated wording with precise topic vocabulary that fits the original meaning.",
    "Grammatical Range & Accuracy": "Rewrite the idea with one controlled complex sentence, then check agreement, tense, and punctuation.",
  };
  const paragraph = String(attempt.essay || "").split(/\n\s*\n/).map((item) => item.trim()).find(Boolean) || "";
  return {
    criterion: structured?.criterion || weakest.label || "Task Response",
    score: normalizeSpeakingBand(structured?.score) || weakest.score || "",
    issue: structured?.issue || feedbackSnippetForLabel(text, weakest.label || "Task Response"),
    evidence: structured?.evidence || writingEvidenceExcerpt(attempt.essay, text),
    instruction: structured?.rewriteInstruction || instructions[weakest.label] || instructions["Task Response"],
    paragraph,
  };
}

function saveWritingWeakArea(button = null) {
  const attempt = state.latestWritingAttempt || readLearningLoopHistory().writing || {};
  const scores = attempt.scores || extractWritingScores(attempt.feedback || "", attempt.analysis);
  const impact = writingImpactInsight(attempt.feedback || "", scores, attempt, attempt.analysis);
  const taskNumber = writingAttemptTaskNumber(attempt);
  const entry = {
    id: learningEntityId("weak"),
    module: "writing",
    skillKey: impact.criterion,
    questionId: "",
    sourceAttemptId: attempt.attemptId || "",
    title: impact.criterion,
    taskNumber,
    summary: compactText(impact.issue, 180),
    evidence: {
      criterion: impact.criterion,
      taskNumber,
      itemId: attempt.itemId || "",
      score: impact.score,
      originalExcerpt: impact.evidence,
      rewriteInstruction: impact.instruction,
      prompt: compactText(attempt.prompt || "", 1200),
    },
    status: "active",
    createdAt: new Date().toISOString(),
  };
  const areas = readWeakAreas().filter((item) => !(item.module === "writing" && item.sourceAttemptId === entry.sourceAttemptId && item.skillKey === entry.skillKey));
  areas.unshift(entry);
  writeWeakAreas(areas);
  syncWeakArea(entry);
  if (button) {
    button.textContent = "Weak area saved";
    button.disabled = true;
  }
  renderCoachContextChips();
  return entry;
}

function writingTargetTaskForCriterion(criterion = "Task Response") {
  const tasks = {
    "Task Response": "Some people think schools should focus mainly on academic subjects, while others believe practical life skills are equally important. Discuss both views and give your own opinion.",
    "Coherence & Cohesion": "Some people prefer to live in a large city, while others believe life in a small town is better. Discuss both views and give your own opinion. Organise each body paragraph around one clear central idea.",
    "Lexical Resource": "Many cities are encouraging people to use public transport instead of private cars. To what extent do you agree or disagree? Use precise transport and environment vocabulary without repeating key words.",
    "Grammatical Range & Accuracy": "Some people believe working from home benefits both employees and employers. To what extent do you agree or disagree? Use a controlled range of complex sentences and check every clause boundary.",
  };
  return tasks[criterion] || tasks["Task Response"];
}

function startWritingTargetedPractice() {
  const attempt = state.latestWritingAttempt || readLearningLoopHistory().writing || {};
  const scores = attempt.scores || extractWritingScores(attempt.feedback || "", attempt.analysis);
  const impact = writingImpactInsight(attempt.feedback || "", scores, attempt, attempt.analysis);
  if (writingAttemptTaskNumber(attempt) === 1) {
    const pool = writingTask1Pool();
    const current = findItemById("writing", attempt.itemId);
    const target = pool.find((item) => item.id !== attempt.itemId && writingTaskKind(item) === writingTaskKind(current || {}))
      || pool.find((item) => item.id !== attempt.itemId)
      || pool[0];
    if (target) {
      state.writingLibraryTaskNumber = 1;
      state.writingLibraryScope = "full";
      openWritingPracticeSetup("task1", target.id);
      return;
    }
  }
  setWritingWorkspaceMode("custom");
  const title = $("writingWorkspaceTitle");
  const prompt = $("uploadPrompt");
  const essay = $("uploadEssay");
  const generatedTask = String(attempt.analysis?.nextTaskPrompt || "").trim();
  const taskPrompt = generatedTask && generatedTask !== String(attempt.prompt || "").trim()
    ? generatedTask
    : writingTargetTaskForCriterion(impact.criterion);
  if (title) title.textContent = `Targeted practice · ${impact.criterion}`;
  if (prompt) prompt.value = taskPrompt;
  if (essay) essay.value = "";
  if ($("uploadEssayWords")) $("uploadEssayWords").textContent = "0";
  setFeedback("uploadWritingFeedback", "", "uploadWritingMode", "");
  setHelpStatus(`Targeted Writing task ready: ${impact.criterion}`);
  scheduleDraftAutosave();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (window.matchMedia("(min-width: 900px)").matches) setTimeout(() => essay?.focus({ preventScroll: true }), 80);
}

async function openWritingCoachFromResult() {
  const attempt = state.latestWritingAttempt || readLearningLoopHistory().writing || {};
  const scores = attempt.scores || extractWritingScores(attempt.feedback || "", attempt.analysis);
  const impact = writingImpactInsight(attempt.feedback || "", scores, attempt, attempt.analysis);
  openGlobalCoachPanel({
    module: "writing",
    title: `${attempt.title || "Writing attempt"} · ${impact.criterion}`,
    prompt: compactText(attempt.prompt || "", 3000),
    studentAnswer: compactText(attempt.essay || "", 8000),
    feedback: compactText(attempt.feedback || "", 8000),
  });
  await sendHelpChatMessage(`Review my latest Writing attempt. Focus on ${impact.criterion}. Use this exact evidence from my essay: "${impact.evidence}". Explain why it limited the score, then give one concrete rewrite step without replacing my whole essay.`);
}

function bindWritingResultActions(root = document) {
  root.querySelectorAll?.("[data-writing-result-action]").forEach((button) => {
    if (button.dataset.boundWritingResultAction) return;
    button.dataset.boundWritingResultAction = "1";
    button.onclick = async () => {
      const action = button.dataset.writingResultAction;
      if (action === "rewrite") {
        const editor = button.closest(".writing-result-page")?.querySelector(".writing-rewrite-editor");
        if (editor) {
          editor.hidden = false;
          editor.scrollIntoView({ behavior: "smooth", block: "center" });
          editor.querySelector("[data-writing-revision]")?.focus();
        }
        return;
      }
      if (action === "close-rewrite") {
        const editor = button.closest(".writing-rewrite-editor");
        if (editor) editor.hidden = true;
        return;
      }
      if (action === "rescore") {
        await scoreWritingRewrite(button.closest(".writing-rewrite-editor"));
        return;
      }
      if (action === "save-weak") {
        saveWritingWeakArea(button);
        return;
      }
      if (action === "next-task") {
        startWritingTargetedPractice();
        return;
      }
      if (action === "coach") {
        await openWritingCoachFromResult();
      }
    };
  });
  root.querySelectorAll?.("[data-source-highlight]").forEach((button) => {
    if (button.dataset.boundSourceHighlight) return;
    button.dataset.boundSourceHighlight = "1";
    button.addEventListener("click", () => {
      const shell = button.closest(".writing-result-page");
      if (!shell) return;
      shell.querySelectorAll("[data-writing-source-item] pre").forEach((source) => {
        source._writingSourceText ||= source.textContent || "";
        source.textContent = source._writingSourceText;
      });
      const itemId = button.dataset.itemId || "task";
      const source = shell.querySelector(`[data-writing-source-item="${CSS.escape(itemId)}"] pre`)
        || shell.querySelector("[data-writing-source-item] pre");
      if (!source) return;
      const text = source._writingSourceText || source.textContent || "";
      const quote = button.dataset.quote || button.textContent || "";
      let start = Number(button.dataset.start);
      let end = Number(button.dataset.end);
      if (!Number.isInteger(start) || !Number.isInteger(end) || text.slice(start, end) !== quote) {
        start = text.indexOf(quote);
        end = start + quote.length;
      }
      if (start < 0 || end <= start) return;
      const mark = document.createElement("mark");
      mark.textContent = text.slice(start, end);
      source.replaceChildren(document.createTextNode(text.slice(0, start)), mark, document.createTextNode(text.slice(end)));
      source.closest("[data-writing-source-item]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function renderWritingRewriteComparison(before, after, feedback) {
  const labels = ["Task Response", "Coherence & Cohesion", "Lexical Resource", "Grammatical Range & Accuracy"];
  const beforeMap = new Map((before?.criteria || []).map((item) => [item.label, item.score || "--"]));
  const afterMap = new Map((after?.criteria || []).map((item) => [item.label, item.score || "--"]));
  return `<section class="writing-rewrite-comparison">
    <div class="writing-rewrite-scope"><span>Paragraph skill check</span><strong>Your IELTS Band is unchanged until you resubmit the full response.</strong></div>
    <div class="writing-rewrite-score-grid">${labels.map((label) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(beforeMap.get(label) || "--")} to ${escapeHtml(afterMap.get(label) || "--")}</strong></div>`).join("")}</div>
    <details><summary>Rewrite feedback</summary><div>${escapeHtml(compactText(feedback || "", 1800)).replace(/\n/g, "<br>")}</div></details>
    <div class="actions"><button class="secondary" type="button" data-writing-result-action="save-weak">Save remaining weakness</button><button class="primary" type="button" data-writing-result-action="next-task">Start targeted task</button><button class="secondary" type="button" data-writing-result-action="coach">Ask AI Coach</button></div>
  </section>`;
}

async function scoreWritingRewrite(editor) {
  if (!editor) return;
  const original = editor.querySelector("[data-writing-original]")?.value.trim() || "";
  const revision = editor.querySelector("[data-writing-revision]")?.value.trim() || "";
  const result = editor.querySelector(".writing-rewrite-result");
  const button = editor.querySelector('[data-writing-result-action="rescore"]');
  if (!original || !revision) {
    if (result) result.textContent = "Add both the original paragraph and your rewrite.";
    return;
  }
  const attempt = state.latestWritingAttempt || readLearningLoopHistory().writing || {};
  if (result) result.textContent = "Scoring the rewrite...";
  if (button) button.disabled = true;
  try {
    const impact = writingImpactInsight(attempt.feedback || "", attempt.scores || extractWritingScores(attempt.feedback || "", attempt.analysis), attempt, attempt.analysis);
    const json = await postJson("/api/writing/rewrite/score", {
      prompt: attempt.prompt || "IELTS Writing task",
      original,
      revision,
      criterion: impact.criterion,
    });
    const afterScores = json.after || { criteria: [] };
    const beforeScores = attempt.scores || extractWritingScores(attempt.feedback || "", attempt.analysis);
    const beforeSkillScores = json.before || { criteria: beforeScores.criteria.filter((item) => item.label === impact.criterion) };
    const rewrite = { original, revision, feedback: json.feedback || "", skillScores: afterScores, parentAttemptId: attempt.attemptId || "", updatesIeltsBand: false };
    const preservedAttempt = { ...attempt, rewrite, updatedAt: new Date().toISOString() };
    state.latestWritingAttempt = preservedAttempt;
    updateLearningLoopHistory({ writing: preservedAttempt });
    if (result) result.innerHTML = renderWritingRewriteComparison(beforeSkillScores, afterScores, json.feedback || "");
    bindWritingResultActions(result || editor);
  } catch (error) {
    if (result) result.textContent = `Rewrite scoring failed: ${error.message}`;
  } finally {
    if (button) button.disabled = false;
  }
}

function feedbackWithPdfHtml(text, json, fallbackName) {
  if (/writing/i.test(String(fallbackName || ""))) return renderWritingReportHtml(text, json, fallbackName);
  return `${escapeHtml(text).replace(/\n/g, "<br>")}${pdfDownloadLink(json, fallbackName).replace(/\n/g, "<br>")}`;
}

function revealWritingFeedback(id = "uploadWritingFeedback") {
  requestAnimationFrame(() => {
    const target = $(id)?.closest(".writing-focused-feedback") || $(id);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function normalizeSpeakingBand(value) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number) || number < 0 || number > 9) return "";
  return (Math.round(number * 2) / 2).toFixed(1);
}

function spokenBandNumberFromText(text) {
  const words = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
  };
  const pattern = /(zero|one|two|three|four|five|six|seven|eight|nine)\s*(?:point\s*(zero|five))?/i;
  const match = String(text || "").toLowerCase().match(pattern);
  if (!match) return "";
  const base = words[match[1]];
  const decimal = match[2] === "five" ? 0.5 : 0;
  return normalizeSpeakingBand(base + decimal);
}

function extractSpeakingBandFromText(text) {
  const clean = String(text || "");
  const directPatterns = [
    /overall\s*estimate\s*[:：]?\s*(?:band\s*)?([0-9](?:\.\d)?)/i,
    /overall\s*(?:speaking\s*)?band\s*(?:score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /overall\s*(?:speaking\s*)?(?:score|result)\s*(?:is|=|:|：|-)?\s*(?:band\s*)?([0-9](?:\.\d)?)/i,
    /final\s*(?:speaking\s*)?(?:band|score)\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:speaking\s*)?band\s*score\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
  ];
  for (const pattern of directPatterns) {
    const match = clean.match(pattern);
    const band = normalizeSpeakingBand(match?.[1]);
    if (band) return band;
  }
  const spokenOverall = clean.match(/(?:overall\s*(?:speaking\s*)?band|overall\s*(?:speaking\s*)?(?:score|result)|speaking\s*band\s*score)\D{0,30}((?:zero|one|two|three|four|five|six|seven|eight|nine)\s*(?:point\s*(?:zero|five))?)/i);
  const spokenBand = spokenBandNumberFromText(spokenOverall?.[1]);
  if (spokenBand) return spokenBand;

  const criteriaPatterns = [
    /(?:fluency\s*(?:and|&)\s*coherence|\bfc\b)\s*(?:band|score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:lexical\s*resource|\blr\b)\s*(?:band|score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:grammatical\s*range\s*(?:and|&)\s*accuracy|\bgra\b)\s*(?:band|score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
    /(?:pronunciation|\bp\b)\s*(?:band|score)?\s*(?:is|=|:|：|-)?\s*([0-9](?:\.\d)?)/i,
  ];
  const criteria = criteriaPatterns
    .map((pattern) => Number.parseFloat(clean.match(pattern)?.[1]))
    .filter((score) => Number.isFinite(score) && score >= 0 && score <= 9);
  if (criteria.length === 4) {
    const avg = criteria.reduce((sum, score) => sum + score, 0) / 4;
    return normalizeSpeakingBand(avg);
  }
  return "";
}

function extractSpeakingCriterionScores(text) {
  const clean = String(text || "");
  const entries = [
    ["Fluency & Coherence", /(?:fluency\s*(?:and|&)\s*coherence|\bfc\b)[^\n|:：=]{0,40}(?:band|score)?\s*(?:is|=|:|：|-|\|)?\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/i],
    ["Lexical Resource", /(?:lexical\s*resource|\blr\b)[^\n|:：=]{0,40}(?:band|score)?\s*(?:is|=|:|：|-|\|)?\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/i],
    ["Grammar", /(?:grammatical\s*range\s*(?:and|&)\s*accuracy|grammar|\bgra\b)[^\n|:：=]{0,40}(?:band|score)?\s*(?:is|=|:|：|-|\|)?\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/i],
    ["Pronunciation", /(?:pronunciation|\bp\b)[^\n|:：=]{0,40}(?:band|score)?\s*(?:is|=|:|：|-|\|)?\s*\*{0,2}([0-9](?:\.\d)?)\*{0,2}/i],
  ];
  return entries.map(([label, pattern]) => {
    const score = normalizeSpeakingBand(clean.match(pattern)?.[1]);
    return score ? { label, score } : null;
  }).filter(Boolean);
}

function speakingOverallFromCriteria(criteria) {
  if (!Array.isArray(criteria) || criteria.length !== 4) return "";
  const values = criteria.map((item) => Number.parseFloat(item.score)).filter(Number.isFinite);
  if (values.length !== 4) return "";
  return normalizeSpeakingBand(values.reduce((sum, score) => sum + score, 0) / 4);
}

function cleanSpeakingFeedbackForDisplay(text) {
  let clean = String(text || "")
    .replace(/^Final Speaking Band:[^\n]*(?:\n+)?/i, "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  clean = clean.replace(/\\\[\s*\\frac\{([^}]+)\}\{4\}\s*=\s*([0-9.]+)[\s\S]*?\\\]/g, "Overall calculation: ($1) / 4 = $2");
  clean = clean.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, body) => body.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / $2"));
  clean = clean
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return true;
      if (/^-{3,}$/.test(line)) return false;
      if (/^\|?\s*-{2,}\s*\|/.test(line)) return false;
      if (/^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?$/.test(line)) return false;
      if (/^\|\s*(?:criterion|band|examiner comment)/i.test(line)) return false;
      return true;
    })
    .map((line) => line
      .replace(/^#{1,6}\s*/g, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/^\|\s*/g, "")
      .replace(/\s*\|\s*$/g, "")
      .replace(/\s*\|\s*/g, " - ")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / $2")
      .replace(/\\[()[\]]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clean;
}

function speakingBandFromFeedbackPayload(feedback, fallbackBand = "") {
  const criteriaOverall = speakingOverallFromCriteria(extractSpeakingCriterionScores(feedback));
  return criteriaOverall || normalizeSpeakingBand(fallbackBand) || extractSpeakingBandFromText(feedback);
}

function speakingBandLabel(score) {
  const value = Number.parseFloat(score);
  if (!Number.isFinite(value)) return "Score ready";
  if (value >= 8) return "Very Good User";
  if (value >= 7) return "Good User";
  if (value >= 6) return "Competent User";
  if (value >= 5) return "Modest User";
  return "Developing User";
}

function speakingCriterionItems(criteria, band) {
  const byKey = new Map((Array.isArray(criteria) ? criteria : []).map((item) => {
    const key = String(item.label || "").toLowerCase();
    const normalizedKey = key.includes("fluency") ? "fc"
      : key.includes("lexical") ? "lr"
        : key.includes("grammar") || key.includes("grammatical") ? "gra"
          : key.includes("pronunciation") ? "p"
            : key;
    return [normalizedKey, normalizeSpeakingBand(item.score)];
  }));
  const fallback = normalizeSpeakingBand(band);
  return [
    { key: "fc", short: "Fluency & Coherence", label: "Fluency & Coherence", score: byKey.get("fc") || fallback || "" },
    { key: "lr", short: "Lexical Resource", label: "Lexical Resource", score: byKey.get("lr") || fallback || "" },
    { key: "gra", short: "Grammatical Range & Accuracy", label: "Grammatical Range & Accuracy", score: byKey.get("gra") || fallback || "" },
    { key: "p", short: "Pronunciation", label: "Pronunciation", score: byKey.get("p") || fallback || "" },
  ];
}

function speakingScorePercent(score) {
  const value = Number.parseFloat(score);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, (value / 9) * 100)) : 0;
}

function speakingScoreWord(score) {
  const value = Number.parseFloat(score);
  if (!Number.isFinite(value)) return "Review";
  if (value >= 7.5) return "Excellent";
  if (value >= 6.5) return "Good";
  if (value >= 5.5) return "Developing";
  return "Focus";
}

function renderSpeakingRadar(criteriaItems) {
  const cx = 120;
  const cy = 104;
  const maxRadius = 70;
  const points = criteriaItems.map((item, index) => {
    const value = Number.parseFloat(item.score);
    const ratio = Number.isFinite(value) ? Math.max(0, Math.min(1, value / 9)) : 0;
    const angle = -Math.PI / 2 + index * (Math.PI / 2);
    return `${(cx + Math.cos(angle) * maxRadius * ratio).toFixed(1)},${(cy + Math.sin(angle) * maxRadius * ratio).toFixed(1)}`;
  }).join(" ");
  const grid = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const r = maxRadius * ratio;
    const polygon = [0, 1, 2, 3].map((index) => {
      const angle = -Math.PI / 2 + index * (Math.PI / 2);
      return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${polygon}" class="speaking-radar-grid-line" />`;
  }).join("");
  const axes = [0, 1, 2, 3].map((index) => {
    const angle = -Math.PI / 2 + index * (Math.PI / 2);
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(angle) * maxRadius).toFixed(1)}" y2="${(cy + Math.sin(angle) * maxRadius).toFixed(1)}" />`;
  }).join("");
  return `<div class="speaking-radar-wrap" aria-label="Speaking band radar">
    <svg class="speaking-radar" viewBox="0 0 240 220" role="img" aria-label="IELTS Speaking criteria radar">
      <g class="speaking-radar-grid">${grid}${axes}</g>
      <polygon points="${points}" class="speaking-radar-area" />
      <polyline points="${points} ${points.split(" ")[0] || ""}" class="speaking-radar-line" />
      ${criteriaItems.map((item, index) => {
        const value = Number.parseFloat(item.score);
        const ratio = Number.isFinite(value) ? Math.max(0, Math.min(1, value / 9)) : 0;
        const angle = -Math.PI / 2 + index * (Math.PI / 2);
        const x = cx + Math.cos(angle) * maxRadius * ratio;
        const y = cy + Math.sin(angle) * maxRadius * ratio;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.8" />`;
      }).join("")}
    </svg>
    <div class="speaking-radar-label top"><span>${escapeHtml(criteriaItems[0].short)}</span><strong>${escapeHtml(criteriaItems[0].score || "--")}</strong></div>
    <div class="speaking-radar-label right"><span>${escapeHtml(criteriaItems[1].short)}</span><strong>${escapeHtml(criteriaItems[1].score || "--")}</strong></div>
    <div class="speaking-radar-label bottom"><span>${escapeHtml(criteriaItems[2].short)}</span><strong>${escapeHtml(criteriaItems[2].score || "--")}</strong></div>
    <div class="speaking-radar-label left"><span>${escapeHtml(criteriaItems[3].short)}</span><strong>${escapeHtml(criteriaItems[3].score || "--")}</strong></div>
  </div>`;
}

function speakingFeedbackBulletText(line) {
  return String(line || "")
    .replace(/^\s*(?:[-*]|\d+[.)])\s*/g, "")
    .replace(/^(?:strengths?|areas?\s+to\s+improve|weaknesses?|improvement\s+points?|next\s+drills?)\s*[:：-]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function speakingFeedbackLineIsUseful(line) {
  const clean = speakingFeedbackBulletText(line);
  if (!clean || clean.length < 10) return false;
  if (/^(?:criterion|band|examiner comment|score table|exact overall calculation)$/i.test(clean)) return false;
  if (/^(?:fluency\s*(?:and|&)?\s*coherence|lexical\s*resource|grammatical\s*range\s*(?:and|&)\s*accuracy|grammatical|grammar|pronunciation)\s*[-|:]/i.test(clean)) return false;
  if (/^(?:fluency\s*(?:and|&)?\s*coherence|lexical\s*resource|grammatical\s*range\s*(?:and|&)\s*accuracy|grammatical|grammar|pronunciation)\s*-\s*[0-9](?:\.\d)?\s*-/i.test(clean)) return false;
  if (/^overall\s+(?:estimate|calculation|speaking band|band)/i.test(clean)) return false;
  return true;
}

function speakingFeedbackBuckets(cleanFeedback, strongest, weakest) {
  const buckets = { strengths: [], improve: [], drills: [] };
  let mode = "";
  String(cleanFeedback || "").split("\n").forEach((raw) => {
    const line = raw.trim();
    const lower = line.toLowerCase();
    if (!line) return;
    if (/^(?:strengths?|what went well)/i.test(line)) {
      mode = "strengths";
      return;
    }
    if (/^(?:areas?\s+to\s+improve|weaknesses?|priority focus|improvement points?)/i.test(line)) {
      mode = "improve";
      return;
    }
    if (/^(?:next drills?|drills?|ai tip|practice)/i.test(line)) {
      mode = "drills";
      return;
    }
    if (!speakingFeedbackLineIsUseful(line)) return;
    const text = speakingFeedbackBulletText(line);
    if (mode && buckets[mode] && buckets[mode].length < 4) {
      buckets[mode].push(text);
      return;
    }
    if (buckets.strengths.length < 3 && /\b(clear|good|strong|fluent|relevant|coherent|accurate|range|understandable)\b/i.test(text)) {
      buckets.strengths.push(text);
    } else if (buckets.improve.length < 3 && /\b(improve|need|should|try|more|limited|hesitation|grammar|detail|expand|avoid)\b/i.test(text)) {
      buckets.improve.push(text);
    }
  });
  if (!buckets.strengths.length) {
    buckets.strengths.push(
      strongest ? `${strongest.label} is your strongest area in this test.` : "Your answers were relevant and understandable.",
      "You completed enough speaking evidence for an examiner-style score.",
      "Your response flow gives a clear base for focused practice."
    );
  }
  if (!buckets.improve.length) {
    buckets.improve.push(
      weakest ? `Prioritise ${weakest.label} in the next practice round.` : "Expand answers with one reason and one short example.",
      "Use more precise topic vocabulary instead of repeating simple words.",
      "Keep longer sentences controlled and easy to follow."
    );
  }
  if (!buckets.drills.length) {
    buckets.drills.push("For each answer, use: direct answer, reason, example, and one extra detail.");
  }
  return buckets;
}

function speakingResultSession(prefix) {
  if (prefix && state.qwenSpeaking?.[prefix]) return state.qwenSpeaking[prefix];
  return null;
}

function speakingTranscriptTurns(prefix, transcript) {
  const qwen = speakingResultSession(prefix);
  if (Array.isArray(qwen?.dialogueTurns) && qwen.dialogueTurns.length) {
    return qwen.dialogueTurns
      .filter((turn) => compactDialogueText(turn.text))
      .map((turn) => ({ role: /candidate|user/i.test(turn.role) ? "Candidate" : "Examiner", text: compactDialogueText(turn.text) }));
  }
  const legacy = prefix && state.speakingSessions?.[prefix]?.history;
  if (Array.isArray(legacy) && legacy.length) {
    return legacy
      .filter((turn) => compactDialogueText(turn.text))
      .map((turn) => ({ role: turn.role === "examiner" ? "Examiner" : "Candidate", text: compactDialogueText(turn.text) }));
  }
  const turns = [];
  String(transcript || "").split(/\n+/).forEach((line) => {
    const match = line.match(/^\s*(Examiner|Candidate|AI|Student|User)\s*:\s*(.+)$/i);
    if (!match) return;
    turns.push({
      role: /candidate|student|user/i.test(match[1]) ? "Candidate" : "Examiner",
      text: compactDialogueText(match[2]),
    });
  });
  return turns;
}

function speakingAnalysisPairs(prefix, transcript) {
  const turns = speakingTranscriptTurns(prefix, transcript);
  const pairs = [];
  let question = "";
  turns.forEach((turn) => {
    if (turn.role === "Examiner") {
      question = qwenExtractQuestion(turn.text) || turn.text;
      return;
    }
    if (turn.role === "Candidate" && turn.text) {
      pairs.push({ question: question || "Speaking response", answer: turn.text });
      question = "";
    }
  });
  return pairs.slice(0, 6);
}

function speakingResultOverview(prefix, transcript, json) {
  const session = speakingResultSession(prefix);
  const pairs = speakingAnalysisPairs(prefix, transcript);
  const elapsedMs = Number(session?.sessionStartedAt || 0) ? Math.max(0, Date.now() - Number(session.sessionStartedAt)) : 0;
  const durationSeconds = elapsedMs ? Math.round(elapsedMs / 1000) : 0;
  const mm = String(Math.floor(durationSeconds / 60)).padStart(2, "0");
  const ss = String(durationSeconds % 60).padStart(2, "0");
  const testType = prefix === "exam" ? "Full Test (Part 1-3)"
    : prefix === "sequence" ? "Same Test Speaking"
      : prefix === "bank" ? "Topic Practice"
        : "Single Module Speaking";
  return {
    testType,
    date: new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    duration: durationSeconds ? `${mm}:${ss}` : "Text scoring",
    answered: pairs.length || (String(transcript || "").match(/Candidate\s*:/gi) || []).length || "--",
    examiner: String(json.mode || "").includes(":audio") ? "IELTS-ist Audio Examiner" : "IELTS-ist AI Examiner",
  };
}

function renderSpeakingBandDescriptors(band) {
  const score = Number.parseFloat(band);
  const rows = [
    { band: "9.0", title: "Expert User", text: "Has fully operational command of the language." },
    { band: "7.0", title: "Good User", text: "Has operational command, with occasional inaccuracies." },
    { band: "5.0", title: "Modest User", text: "Has partial command and copes with overall meaning." },
    { band: "3.0", title: "Extremely Limited User", text: "Conveys and understands only general meaning in familiar situations." },
  ];
  const active = Number.isFinite(score)
    ? rows.reduce((best, row) => Math.abs(Number(row.band) - score) < Math.abs(Number(best.band) - score) ? row : best, rows[0]).band
    : "";
  return rows.map((row) => `<div class="speaking-band-row${row.band === active ? " active" : ""}">
    <strong>${escapeHtml(row.band)}</strong>
    <div><b>${escapeHtml(row.title)}</b><span>${escapeHtml(row.text)}</span></div>
  </div>`).join("");
}

function renderSpeakingAnalysis(prefix, transcript, criteriaItems) {
  const pairs = speakingAnalysisPairs(prefix, transcript);
  const items = pairs.length ? pairs : [{ question: "Speaking response", answer: "Complete a live speaking test to see answer-level analysis here." }];
  return `<section class="speaking-answer-analysis speaking-result-card">
    <div class="speaking-result-card-head">
      <h4>Your Answer Analysis</h4>
      <span>Question-level review</span>
    </div>
    <div class="speaking-analysis-tabs" aria-label="Speaking parts">
      <span class="active">Part 1</span><span>Part 2</span><span>Part 3</span>
    </div>
    <div class="speaking-analysis-list">
      ${items.map((item, index) => {
        const score = criteriaItems[index % criteriaItems.length]?.score || "";
        const label = speakingScoreWord(score);
        return `<article class="speaking-analysis-row">
          <div class="speaking-analysis-question">
            <strong>Q${index + 1}. ${escapeHtml(compactDialogueText(item.question).slice(0, 120) || "Speaking response")}</strong>
            <p>${escapeHtml(compactDialogueText(item.answer).slice(0, 280))}</p>
          </div>
          <div class="speaking-analysis-tags">
            <span>Fluency <b>${escapeHtml(label)}</b></span>
            <span>Vocabulary <b>${escapeHtml(speakingScoreWord(criteriaItems[1]?.score))}</b></span>
            <span>Grammar <b>${escapeHtml(speakingScoreWord(criteriaItems[2]?.score))}</b></span>
            <span>Pronunciation <b>${escapeHtml(speakingScoreWord(criteriaItems[3]?.score))}</b></span>
          </div>
        </article>`;
      }).join("")}
    </div>
  </section>`;
}

function renderSpeakingResultDownloadButton(json) {
  const href = json?.pdfUrl || json?.pdfDataUrl || "";
  if (!href) return `<button class="speaking-result-button primary" type="button" disabled>Download Report</button>`;
  const fileName = json.pdfFileName || "ielts-speaking-report.pdf";
  const openAttrs = json.pdfUrl ? ` target="_blank" rel="noopener"` : "";
  return `<a class="speaking-result-button primary" href="${escapeHtml(href)}" download="${escapeHtml(fileName)}"${openAttrs}>Download Report</a>`;
}

function renderSpeakingRecordingButton(prefix) {
  const result = speakingResultSession(prefix)?.recordingResult;
  const href = qwenRecordingDownloadHref(result);
  if (!href) return "";
  return `<a class="speaking-result-button ghost" href="${escapeHtml(href)}" download="${escapeHtml(result.fileName || "ielts-speaking-recording.mp3")}" target="_blank" rel="noreferrer">Download Recording</a>`;
}

function speakingTopicForPrefix(prefix = "") {
  if (prefix === "single") return state.activeSingle ? normalizeItem(state.activeSingle) : null;
  if (prefix === "exam") return state.exam?.speaking ? normalizeItem(state.exam.speaking) : null;
  if (prefix === "sequence") return state.sequence?.speaking ? normalizeItem(state.sequence.speaking) : null;
  if (prefix === "bank") return state.activeSpeakingTopic ? normalizeItem(state.activeSpeakingTopic) : null;
  return state.activeSpeakingTopic ? normalizeItem(state.activeSpeakingTopic) : null;
}

function buildSpeakingResultRecord(prefix, feedback, json = {}, bandValue = "") {
  const criteria = extractSpeakingCriterionScores(feedback);
  const band = normalizeSpeakingBand(json.band)
    || normalizeSpeakingBand(bandValue)
    || speakingOverallFromCriteria(criteria)
    || extractSpeakingBandFromText(feedback)
    || "";
  const criteriaItems = speakingCriterionItems(criteria, band);
  const transcript = json.evidence?.transcriptText
    || (prefix ? qwenBuildAutoScoreTranscript(prefix) : "")
    || (prefix ? getSpeakingTranscript(prefix) : "")
    || "";
  const strongest = criteriaItems.reduce((best, item) => {
    const score = Number.parseFloat(item.score);
    return Number.isFinite(score) && (!best || score > Number.parseFloat(best.score)) ? item : best;
  }, null);
  const weakest = criteriaItems.reduce((lowest, item) => {
    const score = Number.parseFloat(item.score);
    return Number.isFinite(score) && (!lowest || score < Number.parseFloat(lowest.score)) ? item : lowest;
  }, null);
  const topic = speakingTopicForPrefix(prefix);
  return {
    attemptId: json.attemptId || "",
    prefix,
    practiceScope: prefix ? qwenSpeakingScope(prefix) : "full",
    topicId: topic?.id || "",
    title: topic?.title || "Speaking with AI",
    topic: topic ? {
      id: topic.id || "",
      title: topic.title || "",
      source: topic.source || "",
      period: topic.period || "",
      part1: topic.part1 || [],
      part2: topic.part2 || "",
      part3: topic.part3 || [],
      part3Topics: topic.part3Topics || [],
    } : null,
    band,
    criteria: criteriaItems,
    weakest,
    strongest,
    transcript: compactText(transcript, 20000),
    feedback: compactText(cleanSpeakingFeedbackForDisplay(feedback), 20000),
  };
}

function startSpeakingResultRetest(action = "part2") {
  const result = state.latestSpeakingResult || readLearningLoopHistory().speaking || null;
  state.speakingRetestParentAttemptId = result?.attemptId || "";
  const topic = result?.topic || (result?.topicId ? mergedItems("speaking").map(normalizeItem).find((item) => item.id === result.topicId) : null) || state.activeSpeakingTopic || state.activeSingle;
  activateView("bank", true);
  if (!topic) {
    renderBankList();
    return;
  }
  const focus = action === "fluency"
    ? `Fluency retest. Keep the same broad topic, ask fresh non-repeating follow-ups, and help the candidate extend answers naturally. Previous weakest criterion: ${result?.weakest?.label || "Fluency and Coherence"}.`
    : "Part 2 retake. Keep the same cue card, allow preparation, then ask new Part 3 follow-ups without repeating the previous conversation.";
  renderBankPracticeTopic({ ...topic, retestFocus: focus });
}

function bindSpeakingResultActions(root = document) {
  root.querySelectorAll?.("[data-speaking-result-action]").forEach((button) => {
    if (button.dataset.boundSpeakingResultAction) return;
    button.dataset.boundSpeakingResultAction = "1";
    button.onclick = () => {
      const action = button.dataset.speakingResultAction;
      if (action === "back") {
        activateView(button.dataset.view || "single", true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (action === "practice") {
        startSpeakingResultRetest("part2");
        return;
      }
      if (action === "coach") {
        openGlobalCoachPanel();
        const input = $("helpChatInput");
        if (input) {
          input.value = "Explain this speaking result and give me the next retest plan.";
          input.focus();
        }
      }
      if (action === "part2" || action === "fluency") {
        startSpeakingResultRetest(action);
      }
    };
  });
  root.querySelectorAll?.("[data-audio-evidence]").forEach((button) => {
    if (button.dataset.boundAudioEvidence) return;
    button.dataset.boundAudioEvidence = "1";
    button.addEventListener("click", async () => {
      const shell = button.closest(".speaking-result-page");
      const player = shell?.querySelector("[data-speaking-evidence-player]");
      if (!player) return;
      const start = Math.max(0, Number(button.dataset.startMs || 0) / 1000);
      const end = Math.max(start, Number(button.dataset.endMs || 0) / 1000);
      player.currentTime = start;
      try { await player.play(); } catch { return; }
      if (player._evidenceStopHandler) player.removeEventListener("timeupdate", player._evidenceStopHandler);
      player._evidenceStopHandler = () => {
        if (end > start && player.currentTime >= end) player.pause();
      };
      player.addEventListener("timeupdate", player._evidenceStopHandler);
    });
  });
}

function renderLegacySpeakingResultHtml(text, json = {}, bandValue = "", prefix = "") {
  const feedback = String(text || json.feedback || "").trim();
  const resultRecord = buildSpeakingResultRecord(prefix, feedback, json, bandValue);
  const { band, criteria: criteriaItems, strongest, weakest, transcript } = resultRecord;
  const scoreNumber = Number.parseFloat(band);
  const scorePercent = speakingScorePercent(band);
  const cleanFeedback = cleanSpeakingFeedbackForDisplay(feedback);
  const buckets = speakingFeedbackBuckets(cleanFeedback, strongest, weakest);
  const overview = speakingResultOverview(prefix, transcript, json);
  if (!resultRecord.attemptId || state.latestSpeakingResult?.attemptId !== resultRecord.attemptId) {
    rememberSpeakingResult({ ...resultRecord, title: resultRecord.title || overview.testType || "Speaking with AI" });
  }
  const viewTarget = prefix === "exam" ? "exam" : prefix === "sequence" ? "sequence" : prefix === "bank" ? "bank" : "single";
  const metricRows = criteriaItems.map((item) => {
    const score = normalizeSpeakingBand(item.score);
    const percent = speakingScorePercent(score);
    return `<div class="speaking-result-metric">
      <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(score || "--")}</strong></div>
      <i style="--score-width:${percent.toFixed(1)}%"></i>
    </div>`;
  }).join("");
  return `<article class="speaking-result-page">
    <header class="speaking-result-topbar">
      <button class="speaking-result-back" type="button" data-speaking-result-action="back" data-view="${escapeHtml(viewTarget)}">&larr; Back to Dashboard</button>
      <div class="speaking-result-top-actions">
        <button class="speaking-result-button" type="button" data-speaking-result-action="practice">Practice Again</button>
        ${renderSpeakingResultDownloadButton(json)}
      </div>
    </header>
    <section class="speaking-result-title">
      <h3>Your IELTS Speaking Result</h3>
      <p>Test completed on ${escapeHtml(overview.date)} <span>${escapeHtml(overview.testType)}</span></p>
    </section>
    <section class="speaking-result-overview-card">
      <div class="speaking-result-overall">
        <span>Overall Band Score</span>
        <strong>${escapeHtml(band || "--")}</strong>
        <em>${escapeHtml(speakingBandLabel(band))}</em>
        <p>${Number.isFinite(scoreNumber) && scoreNumber >= 7 ? "You have a good level of English speaking ability. Keep practising." : "You have a clear speaking base. Keep building longer, more precise answers."}</p>
      </div>
      ${renderSpeakingRadar(criteriaItems)}
      <div class="speaking-result-bars">${metricRows}</div>
    </section>
    <section class="speaking-result-lower-grid">
      <div class="speaking-result-card band-descriptor-card">
        <div class="speaking-result-card-head"><h4>Band Descriptors</h4><span>IELTS scale</span></div>
        ${renderSpeakingBandDescriptors(band)}
      </div>
      <div class="speaking-result-card examiner-feedback-card">
        <div class="speaking-result-card-head"><h4>AI Examiner Feedback</h4><span>Score explanation</span></div>
        <div class="feedback-block positive"><strong>Strengths</strong>${buckets.strengths.slice(0, 3).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
        <div class="feedback-block improve"><strong>Areas to Improve</strong>${buckets.improve.slice(0, 3).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
        <div class="ai-tip"><strong>AI Tip</strong><span>${escapeHtml(buckets.drills[0])}</span></div>
      </div>
      <div class="speaking-result-card test-overview-card">
        <div class="speaking-result-card-head"><h4>Test Overview</h4><span>Session info</span></div>
        <dl>
          <dt>Test Type</dt><dd>${escapeHtml(overview.testType)}</dd>
          <dt>Test Date</dt><dd>${escapeHtml(overview.date)}</dd>
          <dt>Duration</dt><dd>${escapeHtml(overview.duration)}</dd>
          <dt>Questions Answered</dt><dd>${escapeHtml(String(overview.answered))}</dd>
          <dt>AI Examiner</dt><dd>${escapeHtml(overview.examiner)}</dd>
        </dl>
        <div class="speaking-result-secondary-actions">${renderSpeakingRecordingButton(prefix)}</div>
      </div>
    </section>
    <section class="speaking-result-next-actions">
      <article>
        <span>Next retest</span>
        <strong>Do not stop at the report.</strong>
        <p>Turn the weakest criterion into one more controlled practice.</p>
      </article>
      <button class="speaking-result-button primary" type="button" data-speaking-result-action="part2">Retake Part 2</button>
      <button class="speaking-result-button" type="button" data-speaking-result-action="fluency">Practise fluency drill</button>
      <button class="speaking-result-button ghost" type="button" data-speaking-result-action="coach">Ask AI Coach about this result</button>
    </section>
    ${renderSpeakingAnalysis(prefix, transcript, criteriaItems)}
  </article>`;
}

function renderSpeakingResultHtml(text, json = {}, bandValue = "", prefix = "") {
  const feedback = String(text || json.feedback || "").trim();
  const resultRecord = buildSpeakingResultRecord(prefix, feedback, json, bandValue);
  const { band, criteria: criteriaItems, weakest, transcript } = resultRecord;
  const overview = speakingResultOverview(prefix, transcript, json);
  const pairs = speakingAnalysisPairs(prefix, transcript);
  const exactEvidence = pairs.find((pair) => pair.answer)?.answer || compactText(transcript, 260) || "No transcript evidence was returned.";
  const audioSucceeded = json.audioAiUsed === true || json.evidence?.audioAnalysis?.status === "succeeded";
  const audioRanges = audioSucceeded && Array.isArray(json.evidence?.turns) ? json.evidence.turns : [];
  const recordingHref = qwenRecordingDownloadHref(speakingResultSession(prefix)?.recordingResult);
  const viewTarget = prefix === "exam" ? "exam" : prefix === "sequence" ? "sequence" : prefix === "bank" ? "bank" : "single";
  const learningHistory = readLearningLoopHistory();
  const contract = buildUnifiedAttemptContract({
    module: "speaking",
    mode: "exam",
    items: pairs.map((pair, index) => ({ id: `turn${index + 1}`, question: pair.question, response: pair.answer })),
    score: { status: audioSucceeded ? "final" : "provisional", overall: { value: Number.parseFloat(band), scale: "ielts-band" }, criteria: criteriaItems },
    highestImpact: { criterionKey: weakest?.label || "Fluency & Coherence", issue: `Prioritise ${weakest?.label || "answer development"} in the next response.`, evidenceIds: ["speaking-transcript-evidence"], successCriterion: "Give a direct answer, one reason and one specific example." },
    evidence: [{ id: "speaking-transcript-evidence", kind: "transcript", quote: exactEvidence }, ...audioRanges],
    nextAction: { type: "answer-repeat", label: "Improve this skill" },
    retest: { type: "part2-repeat" },
    provenance: { audioAnalysis: { status: audioSucceeded ? "succeeded" : "unavailable" } },
  });
  contract.attempt.parentAttemptId = state.speakingRetestParentAttemptId || null;
  resultRecord.contract = contract;
  resultRecord.parentAttemptId = contract.attempt.parentAttemptId;
  if (!resultRecord.attemptId || state.latestSpeakingResult?.attemptId !== resultRecord.attemptId) {
    rememberSpeakingResult({ ...resultRecord, title: resultRecord.title || overview.testType || "Speaking with AI" });
  }
  const speakingHistory = [resultRecord, ...(learningHistory.speakingAttempts || [])]
    .filter((item, index, items) => item && items.findIndex((candidate) => candidate?.attemptId === item.attemptId) === index)
    .filter((item) => !resultRecord.topicId || item.topicId === resultRecord.topicId)
    .slice(0, 5);
  state.speakingRetestParentAttemptId = "";
  const metricRows = criteriaItems.map((item) => {
    const score = normalizeSpeakingBand(item.score);
    return `<div class="unified-band-scale"><div><span>${escapeHtml(item.label)}</span><strong>Current ${escapeHtml(score || "--")}</strong><em>Target 7.0</em></div><i><b style="width:${speakingScorePercent(score).toFixed(1)}%"></b><u style="left:${speakingScorePercent("7.0").toFixed(1)}%"></u></i></div>`;
  }).join("");
  return `<article class="speaking-result-page unified-result-shell" data-result-module="speaking">
    <header class="unified-result-header"><div><span class="eyebrow">Speaking feedback</span><h3>Your Speaking result</h3><p>${escapeHtml(overview.date)} · ${escapeHtml(overview.testType)}</p></div><details class="result-more"><summary>More</summary><div>${renderSpeakingResultDownloadButton(json)}${renderSpeakingRecordingButton(prefix)}</div></details></header>
    <nav class="unified-result-tabs" role="tablist">${[["overview","Overview"],["evidence","Evidence"],["improve","Improve"],["history","History"]].map(([key,label], index) => `<button type="button" data-result-tab="${key}" class="${index === 0 ? "active" : ""}" aria-selected="${index === 0}">${label}</button>`).join("")}</nav>
    <section data-result-panel="overview" class="unified-result-panel result-overview-panel">
      <div class="unified-score-summary"><div><span>Overall Band</span><strong>${escapeHtml(band || "--")}</strong><em>Target 7.0</em></div><div><span>Weakest criterion</span><strong>${escapeHtml(weakest?.label || "Review")}</strong><p>Focus on one controlled improvement, then repeat the answer.</p></div><blockquote><span>Exact response evidence</span>${escapeHtml(exactEvidence)}</blockquote></div>
      <button class="speaking-result-button primary unified-result-primary" type="button" data-speaking-result-action="part2">Improve this skill</button>
      <div class="unified-score-bars">${metricRows}</div>
    </section>
    <section data-result-panel="evidence" class="unified-result-panel" hidden>
      <div class="result-evidence-note ${audioSucceeded ? "audio-ready" : "transcript-only"}"><strong>${audioSucceeded ? "Audio evidence analysed" : "Transcript evidence only"}</strong><p>${audioSucceeded ? "Pronunciation comments may use the analysed recording ranges below." : "The audio model did not return a successful analysis, so this report does not claim timestamped Pronunciation evidence."}</p></div>
      <div class="speaking-evidence-list">${pairs.length ? pairs.map((pair, index) => `<article data-speaking-evidence="turn-${index + 1}"><span>${escapeHtml(pair.question || `Question ${index + 1}`)}</span><p>${escapeHtml(pair.answer)}</p></article>`).join("") : `<article data-speaking-evidence="transcript"><p>${escapeHtml(exactEvidence)}</p></article>`}</div>
      ${audioRanges.length && recordingHref ? `<audio data-speaking-evidence-player preload="metadata" src="${escapeHtml(recordingHref)}"></audio><div class="speaking-audio-evidence">${audioRanges.map((item, index) => `<button type="button" data-audio-evidence="${escapeHtml(item.id || `audio-${index}`)}" data-start-ms="${escapeHtml(String(item.startMs || 0))}" data-end-ms="${escapeHtml(String(item.endMs || 0))}">Play ${Math.round(Number(item.startMs || 0) / 1000)}s-${Math.round(Number(item.endMs || 0) / 1000)}s</button>`).join("")}</div>` : audioRanges.length ? `<p class="notice-inline">Timestamped evidence is available after the recording finishes preparing.</p>` : ""}
    </section>
    <section data-result-panel="improve" class="unified-result-panel" hidden><div class="result-improve-task"><span>Success criterion</span><strong>Direct answer + reason + specific example</strong><p>Repeat one answer without copying the previous wording.</p></div><div class="speaking-result-next-actions"><button class="speaking-result-button primary" type="button" data-speaking-result-action="part2">Retake Part 2</button><button class="speaking-result-button" type="button" data-speaking-result-action="fluency">Practise fluency</button><button class="speaking-result-button ghost" type="button" data-speaking-result-action="coach">Ask AI Coach</button></div></section>
    <section data-result-panel="history" class="unified-result-panel" hidden><div class="result-history-list">${speakingHistory.map((item, index) => `<div class="result-history-row"><span>${index === 0 ? "Current attempt" : `Attempt ${index + 1}`}</span><strong>${escapeHtml(item.band || "--")}</strong><em>${escapeHtml([bandDeltaLabel(item.band, speakingHistory[index + 1]?.band), item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Today"].filter(Boolean).join(" · "))}</em></div>`).join("")}</div><button class="speaking-result-button" type="button" data-speaking-result-action="practice">Start another practice</button></section>
  </article>`;
}

function updateSpeakingScorePanel(prefix, text, fallbackBand = "") {
  const clean = String(text || "");
  const band = speakingBandFromFeedbackPayload(clean, fallbackBand) || normalizeSpeakingBand(clean) || "";
  const input = $(`${prefix}-speaking-score`);
  if (input && band) input.value = band;
  const criteria = extractSpeakingCriterionScores(clean);
  const map = {};
  criteria.forEach((item) => {
    const key = String(item.label || "").toLowerCase().includes("fluency") ? "fc"
      : String(item.label || "").toLowerCase().includes("lexical") ? "lr"
        : String(item.label || "").toLowerCase().includes("grammar") ? "gra"
          : String(item.label || "").toLowerCase().includes("pronunciation") ? "p"
            : "";
    if (key) map[key] = item;
  });
  Object.entries(map).forEach(([key, item]) => {
    const node = $(`${prefix}-score-${key}`);
    if (node && item?.score) node.textContent = item.score;
  });
  return band;
}

function parseAnswers(raw) {
  const answers = {};
  String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const match = line.match(/^(?:Q)?(\d+)\s*=\s*(.+)$/i);
      if (match) answers[`q${match[1]}`] = match[2];
      else answers[`q${index + 1}`] = line;
    });
  return answers;
}

function bankToTest(item) {
  const answers = parseAnswers(item.answers);
  const questions = Object.keys(answers).map((key, index) => ({
    id: key,
    text: `Question ${index + 1}`,
    answer: answers[key],
  }));
  const base = {
    ...item,
    id: item.id,
    title: item.title,
    source: "User real-question bank",
    period: "User imported",
    transcript: item.prompt,
    passage: item.prompt,
    prompt: item.prompt,
    audioUrl: item.audioUrl || "",
    sourceUrl: item.sourceUrl || "",
    questions,
  };
  if (item.module === "speaking") {
    base.part1 = item.prompt.split(/\r?\n/).filter(Boolean).slice(0, 3);
    base.part2 = item.prompt;
    base.part3 = item.prompt.split(/\r?\n/).filter(Boolean).slice(3, 6);
  }
  if (item.module === "writing") {
    base.type = "User Writing";
  }
  return base;
}

function normalizeItem(item) {
  if (!item || typeof item !== "object") return {};
  return item.source === "User real-question bank" ? bankToTest(item) : item;
}

function renderQuestionInputs(prefix, questions) {
  if (!questions?.length) {
    return `<div class="notice">This user import has no answer key yet. Add answers in the format Q1=answer inside the user bank.</div>`;
  }
  const answerAvailable = questions.some((q) => String(q.answer || "").trim());
  const notice = answerAvailable
    ? ""
    : `<div class="notice">The answer key for this local paper has not been imported yet. You can still answer normally, but submission will only show a manual check prompt and will not auto-score.</div>`;
  return `${notice}<div class="question-list">${questions
    .map(
      (q, index) => `
        <label class="question-row">
          <span>${index + 1}. ${q.text}</span>
          <input class="text-input answer-input" data-prefix="${prefix}" data-qid="${q.id}" placeholder="Your answer" />
        </label>`,
    )
    .join("")}</div>`;
}

function questionNumber(question, fallbackIndex) {
  const match = String(question?.id || question?.text || "").match(/(?:^|q|question\s*)(\d{1,2})\b/i);
  const value = Number(match?.[1] || fallbackIndex + 1);
  return Number.isFinite(value) ? value : fallbackIndex + 1;
}

function parsePaperPages(paper) {
  const map = new Map();
  const matches = [...String(paper || "").matchAll(/--- Page (\d+) ---\n([\s\S]*?)(?=\n--- Page \d+ ---|$)/g)];
  for (const match of matches) map.set(Number(match[1]), match[2]);
  return map;
}

function numbersFromPageText(text) {
  const found = new Set();
  const normalized = String(text || "").replace(/\s+/g, " ");
  for (const match of normalized.matchAll(/Questions?\s+(\d{1,2})\s*(?:-|to|and|–|—)\s*(\d{1,2})/gi)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start >= 1 && end <= 40 && end >= start) {
      for (let number = start; number <= end; number += 1) found.add(number);
    }
  }
  for (const match of normalized.matchAll(/(?:^|[\s(])(\d{1,2})(?:\s*&\s*(\d{1,2}))?\s+(?:[A-Z][\w(/-]|\.{3,}|_{3,}|\u2026+)/g)) {
    const first = Number(match[1]);
    const second = Number(match[2] || 0);
    if (first >= 1 && first <= 40) found.add(first);
    if (second >= 1 && second <= 40) found.add(second);
  }
  return found;
}

function sectionIndexForQuestion(number) {
  if (number >= 1 && number <= 10) return 1;
  if (number >= 11 && number <= 20) return 2;
  if (number >= 21 && number <= 30) return 3;
  if (number >= 31 && number <= 40) return 4;
  return null;
}

function sectionStartLine(lines, sectionNumber) {
  return lines.find((line) => new RegExp(`\\bSECTION\\s+${sectionNumber}\\b`, "i").test(line.text))?.index ?? null;
}

function isHeadingLine(text) {
  return /^Questions?\s+\d{1,2}\s*(?:-|to|and|–|—)\s*\d{1,2}\b/i.test(text)
    || /^SECTION\s+[1-4]\b/i.test(text)
    || /^Reading Passage\s+\d/i.test(text)
    || /^Write\b/i.test(text)
    || /^Choose\b/i.test(text)
    || /^Complete\b/i.test(text);
}

function questionLineForNumber(lines, number) {
  const escaped = String(number).split("").join("\\s*");
  const patterns = [
    new RegExp(`(?:^|[^\\d])${number}(?:\\s*&\\s*\\d{1,2})?(?:[^\\d]|$)`),
    new RegExp(`(?:^|[^\\d])${escaped}(?:[^\\d]|$)`),
  ];
  return lines.find((line) => !isHeadingLine(line.text) && patterns.some((pattern) => pattern.test(line.text)));
}

function questionPositions(numbers, pageText) {
  const rawLines = String(pageText || "").split(/\r?\n/);
  const lines = rawLines
    .map((raw, index) => ({ raw, text: raw.replace(/\s+/g, " ").trim(), index }))
    .filter((line) => line.text);
  const maxLineLength = Math.max(55, ...rawLines.map((line) => line.length));
  const positions = new Map();
  const usedSlots = new Map();
  const sectionStarts = new Map([1, 2, 3, 4].map((section) => [section, sectionStartLine(lines, section)]));
  let currentSection = null;
  const slotLines = [];
  for (const line of lines) {
    const sectionMatch = line.text.match(/\bSECTION\s+([1-4])\b/i);
    if (sectionMatch) currentSection = Number(sectionMatch[1]);
    const blankMatch = line.raw.match(/(?:\.{3,}|_{3,}|-{3,}|\u2026+)/);
    if (blankMatch) {
      slotLines.push({
        section: currentSection,
        index: line.index,
        raw: line.raw,
        text: line.text,
        targetIndex: blankMatch.index || 0,
      });
    }
  }
  const sectionUse = new Map();
  const usedSlotIndexes = new Set();
  const takeSlot = (section) => {
    const sameSection = slotLines
      .map((slot, index) => ({ ...slot, slotIndex: index }))
      .filter((slot) => slot.section === section && !usedSlotIndexes.has(slot.slotIndex));
    const picked = sameSection[0] || slotLines.find((slot, index) => !usedSlotIndexes.has(index));
    if (!picked) return null;
    usedSlotIndexes.add(picked.slotIndex ?? slotLines.indexOf(picked));
    return picked;
  };
  numbers.forEach((number, order) => {
    const section = sectionIndexForQuestion(number);
    const sectionOrder = sectionUse.get(section) || 0;
    sectionUse.set(section, sectionOrder + 1);
    const exactLine = questionLineForNumber(lines, number);
    const exactBlank = exactLine ? exactLine.raw.match(/(?:\.{3,}|_{3,}|-{3,}|\u2026+)/) : null;
    const slot = exactLine && exactBlank
      ? { index: exactLine.index, raw: exactLine.raw, text: exactLine.text, targetIndex: exactBlank.index || 0 }
      : takeSlot(section);
    const sectionLine = sectionStarts.get(section);
    const fallbackLine = sectionLine === null || sectionLine === undefined
      ? Math.round((order + 1) * (rawLines.length / (numbers.length + 1)))
      : sectionLine + 4 + sectionOrder * 3;
    const lineIndex = slot?.index ?? exactLine?.index ?? fallbackLine;
    const exactNumberIndex = exactLine ? Math.max(0, exactLine.raw.search(new RegExp(`\\b${number}\\b`))) : 0;
    const targetIndex = slot?.targetIndex ?? Math.min(maxLineLength - 1, exactNumberIndex + 46);
    const rowKey = Math.round(lineIndex / 2);
    const rowUse = usedSlots.get(rowKey) || 0;
    usedSlots.set(rowKey, rowUse + 1);
    const sectionTop = sectionLine === null || sectionLine === undefined
      ? null
      : 8 + (sectionLine / Math.max(1, rawLines.length - 1)) * 78;
    const computedTop = 8 + (lineIndex / Math.max(1, rawLines.length - 1)) * 78 + rowUse * 2.6;
    const top = Math.max(sectionTop === null ? 10 : sectionTop + 4, Math.min(76, computedTop));
    const left = Math.max(12, Math.min(84, 4 + (targetIndex / maxLineLength) * 90 + rowUse * 7));
    positions.set(number, { left, top });
  });
  return positions;
}

function numbersFromPageText(text) {
  const contentNumbers = new Set();
  const headingNumbers = new Set();
  const sectionNumbers = new Set();
  const normalizeQuestionNumber = (value) => Number(String(value || "").replace(/\s+/g, ""));
  const addRange = (set, startRaw, endRaw) => {
    const start = normalizeQuestionNumber(startRaw);
    const end = normalizeQuestionNumber(endRaw);
    if (start >= 1 && end <= 40 && end >= start) {
      for (let number = start; number <= end; number += 1) set.add(number);
    }
  };
  const addSingle = (set, value) => {
    const number = normalizeQuestionNumber(value);
    if (number >= 1 && number <= 40) set.add(number);
  };
  const lines = String(text || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const hasQuestionBlock = lines.some((line) => /^Questions?\s+\d{1,2}\b/i.test(line));
  if (/\bREADING PASSAGE\s+\d\b/i.test(text) && /You should spend about .*Questions/i.test(text) && !hasQuestionBlock) return contentNumbers;
  for (const line of lines) {
    const compactLine = line.replace(/(?<=\d)\s+(?=\d)/g, "");
    const numberPattern = "([0-4]?\\d(?:\\s+\\d)?)";
    const separatorPattern = "(?:-|\\+|to|and|\\u2013|\\u2014)";
    const isSectionRange = new RegExp(`^SECTION\\s+[1-4]\\s+Questions?\\s+${numberPattern}\\s*${separatorPattern}`, "i").test(compactLine);
    const isQuestionHeading = new RegExp(`^Questions?\\s+${numberPattern}(?:\\s*${separatorPattern}\\s*${numberPattern}|\\b)`, "i").test(compactLine);
    const isInstruction = isHeadingLine(compactLine) || isInstructionLine(compactLine) || /^(?:Example|Answer|Test\s*\d+|LISTENING|READING)\b/i.test(compactLine);
    if (!isInstruction && !isQuestionHeading) {
      const startsWithQuestion = compactLine.match(/^([1-9]|[1-3]\d|40)\b(?=.*[A-Za-z])/);
      if (startsWithQuestion) addSingle(contentNumbers, startsWithQuestion[1]);
      for (const match of compactLine.matchAll(/(?:^|[^\d])([1-9]|[1-3]\d|40)(?=(?:\s*(?:\.{2,}|(?:\.\s*){2,}|_|\u2026|\(|$))|\s+[A-Za-z])/g)) {
        const hasAnswerSlot = /(?:\.{2,}|(?:\.\s*){2,}|_|\u2026)/.test(compactLine);
        const looksEmbeddedQuestion = /[:：]\s*([1-9]|[1-3]\d|40)\s+[A-Za-z]/.test(compactLine);
        const lineEndsWithQuestionNumber = hasQuestionBlock && new RegExp(`(?:^|[^\\d])${match[1]}\\s*$`).test(compactLine);
        if (hasAnswerSlot || looksEmbeddedQuestion || startsWithQuestion || lineEndsWithQuestionNumber) addSingle(contentNumbers, match[1]);
      }
    }
    for (const match of compactLine.matchAll(new RegExp(`^SECTION\\s+[1-4]\\s+Questions?\\s+${numberPattern}\\s*${separatorPattern}\\s*${numberPattern}\\b`, "gi"))) {
      addRange(sectionNumbers, match[1], match[2]);
    }
    if (!isSectionRange) {
      for (const match of compactLine.matchAll(new RegExp(`^Questions?\\s+${numberPattern}\\s*${separatorPattern}\\s*${numberPattern}\\b`, "gi"))) {
        addRange(headingNumbers, match[1], match[2]);
      }
      for (const match of compactLine.matchAll(new RegExp(`^Questions?\\s+${numberPattern}\\b`, "gi"))) {
        addSingle(headingNumbers, match[1]);
      }
    }
  }
  if (contentNumbers.size) return contentNumbers;
  if (/\bREADING PASSAGE\s+\d\b/i.test(text) && /You should spend about .*Questions/i.test(text)) return contentNumbers;
  if (headingNumbers.size) return headingNumbers;
  return sectionNumbers;
}

function isHeadingLine(text) {
  return /^Questions?\s+\d{1,2}\s*(?:-|to|and|\u2013|\u2014)\s*\d{1,2}\b/i.test(text)
    || /^SECTION\s+[1-4]\b/i.test(text)
    || /^Test\s*\d+\b/i.test(text)
    || /^\d{1,3}$/.test(text)
    || /^Reading Passage\s+\d/i.test(text)
    || /^Write\b/i.test(text)
    || /^Choose\b/i.test(text)
    || /^Complete\b/i.test(text);
}

function isInstructionLine(text) {
  return /^In boxes?\b/i.test(text)
    || /^Write (?:your )?(?:answers?|answer)\b/i.test(text)
    || /^Write the correct\b/i.test(text)
    || /^Do the following statements\b/i.test(text)
    || /^Answer the following questions\b/i.test(text)
    || /^Choose (?:NO MORE|ONE WORD|TWO WORDS|THREE WORDS|the correct|[A-Z]+\s+answers?|TWO letters?|FIVE answers?)/i.test(text)
    || /^Complete the\b/i.test(text);
}

function instructionMode(text, currentMode) {
  if (/^(?:Complete|Write\s+(?:NO|ONE|TWO|THREE)|Choose\s+(?:NO MORE|ONE WORD|TWO WORDS|THREE WORDS))/i.test(text)) return "blank";
  if (/^(?:Do the following|Answer the following questions.*choos|Choose\b|Match\b|Look at\b)/i.test(text)) return "choice";
  return currentMode;
}

function lineQuestionNumbers(text) {
  const numbers = [];
  for (const match of String(text || "").matchAll(/(?:^|[^\d])(\d{1,2})(?:\s*&\s*(\d{1,2}))?(?=[^\d]|$)/g)) {
    const first = Number(match[1]);
    const second = Number(match[2] || 0);
    if (first >= 1 && first <= 40) numbers.push(first);
    if (second >= 1 && second <= 40) numbers.push(second);
  }
  return numbers;
}

function answerSlotCandidates(rawLines, lines) {
  let currentSection = null;
  let afterInstruction = false;
  const slots = [];
  for (const line of lines) {
    const sectionMatch = line.text.match(/\bSECTION\s+([1-4])\b/i);
    if (sectionMatch) currentSection = Number(sectionMatch[1]);
    if (/^Write\b/i.test(line.text) || /^Choose\b/i.test(line.text) || /^Complete\b/i.test(line.text)) afterInstruction = true;
    if (isHeadingLine(line.text) || /^(Example|Answer|Name|No\. of bedrooms)\b/i.test(line.text)) continue;
    const blankMatch = line.raw.match(/(?:\.{3,}|_{3,}|\u2026{2,})/);
    const numbers = lineQuestionNumbers(line.text);
    const hasLabelSlot = /:\s*(?:\S+\s*){1,4}$/i.test(line.text);
    const hasQuestionNumber = numbers.length > 0;
    const tableLikeSlot = afterInstruction && /(?:\u00a3|\$|[A-Z][a-z]+ (?:Road|Street|Avenue|Close)|p\.m\.|a\.m\.)/.test(line.raw);
    if (blankMatch || hasLabelSlot || hasQuestionNumber || tableLikeSlot) {
      const numberIndex = hasQuestionNumber ? Math.max(0, line.raw.search(new RegExp(`(?:^|[^\\d])${numbers[0]}(?=[^\\d]|$)`))) : -1;
      const colonIndex = line.raw.indexOf(":");
      let targetIndex = blankMatch?.index ?? -1;
      if (targetIndex < 0 && hasLabelSlot) {
        const wideLabel = /^(Managed by|Open)\b/i.test(line.text);
        targetIndex = Math.max(12, colonIndex + (wideLabel ? 18 : 12));
      }
      if (targetIndex < 0 && numberIndex >= 0) targetIndex = Math.min(line.raw.length - 1, numberIndex + 4);
      if (targetIndex < 0) targetIndex = Math.max(18, Math.round(line.raw.length * 0.72));
      if (blankMatch && colonIndex >= 0 && targetIndex < colonIndex + 12) targetIndex = colonIndex + 22;
      if (blankMatch && /^\d{4}s?[-\s]/.test(line.text)) targetIndex += 12;
      if (targetIndex < 8 && /^[A-Za-z]?\d{1,2}/.test(line.text)) targetIndex = 26;
      slots.push({ section: currentSection, index: line.index, raw: line.raw, text: line.text, numbers, targetIndex, labelOnly: hasLabelSlot && !blankMatch });
    }
  }
  return slots;
}

function wordMatchesNumber(word, number) {
  const text = String(word?.text || "").replace(/[^\d]/g, "");
  return text === String(number);
}

function isRuledBlankWord(word) {
  const text = String(word?.text || "").trim();
  const width = Number(word?.width || 0);
  if (width < 8) return false;
  if (/^[A-Z]{0,3}[=\-_\u2013\u2014]+[A-Z]{0,3}$/i.test(text)) return true;
  return /[=\-_\u2013\u2014]/.test(text) && text.length <= 8;
}

function isOcrBlankWord(word) {
  const text = String(word?.text || "").trim();
  if (/(?:\.{3,}|_{3,}|\u2026{2,}|c[o0v.]{4,})/i.test(text)) return true;
  return /^\.[A-Za-z.]{5,}$/.test(text);
}

function isCompactOcrBlankWord(word) {
  const text = String(word?.text || "").trim();
  const width = Number(word?.width || 0);
  return width >= 8 && /^[A-Z0-9Il|]{1,3}$/.test(text);
}

function layoutSlotCandidates(layoutLines = []) {
  let currentSection = null;
  let afterInstruction = false;
  let currentMode = "blank";
  const slots = [];
  for (const line of layoutLines) {
    const text = String(line.text || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const sectionMatch = text.match(/\b(?:SECTION|PART)\s+([1-4])\b/i);
    if (sectionMatch) currentSection = Number(sectionMatch[1]);
    const nextMode = instructionMode(text, currentMode);
    if (nextMode !== currentMode || isInstructionLine(text)) {
      currentMode = nextMode;
      afterInstruction = true;
    }

    const words = Array.isArray(line.words) ? line.words : [];
    const dottedBlankWord = words.find(isOcrBlankWord);
    const ruledBlankWord = dottedBlankWord ? null : words.find(isRuledBlankWord);
    const compactBlankWord = dottedBlankWord || ruledBlankWord ? null : words.find(isCompactOcrBlankWord);
    const blankWord = dottedBlankWord || ruledBlankWord || compactBlankWord;
    const numbers = lineQuestionNumbers(text);
    const hasLabelSlot = /:\s*(?:\S+\s*){1,4}$/i.test(text);
    const hasQuestionNumber = numbers.length > 0;
    const tableLikeSlot = afterInstruction && currentMode === "blank" && /(?:\u00a3|\$|[A-Z][a-z]+ (?:Road|Street|Avenue|Close)|p\.m\.|a\.m\.)/.test(text);
    const questionTitleSlot = /^Question\s+\d{1,2}\b/i.test(text);
    if ((isHeadingLine(text) || isInstructionLine(text) || /^(Example|Answer|Name|No\. of bedrooms)\b/i.test(text)) && !questionTitleSlot && !blankWord) continue;
    if (!blankWord && !hasLabelSlot && !hasQuestionNumber && !tableLikeSlot) continue;

    const kind = (questionTitleSlot || currentMode === "choice") && !blankWord && !hasLabelSlot && !tableLikeSlot ? "choice" : "blank";
    const numberWord = hasQuestionNumber ? words.find((word) => wordMatchesNumber(word, numbers[0])) : null;
    const colonWord = words.find((word) => /:$/.test(word.text));
    let left = null;
    if (kind === "blank") {
      left = blankWord ? Math.max(6, Math.min(86, Number(blankWord.left || 0))) : null;
      if (ruledBlankWord) {
        left = Math.max(6, Math.min(86, Number(ruledBlankWord.left || 0) + Math.min(8, Number(ruledBlankWord.width || 0) * 0.32)));
      }
      if (left === null && colonWord) left = Math.min(86, Number(colonWord.left || 0) + Number(colonWord.width || 0) + 2);
      if (left === null && numberWord) left = Math.min(86, Number(numberWord.left || 0) + Number(numberWord.width || 0) + 2);
      if (left === null) left = Math.min(86, Number(line.left || 0) + Number(line.width || 0) + 1);
    } else {
      left = questionTitleSlot
        ? Math.max(1.2, Math.min(22, Number(line.left || 0) + Number(line.width || 0) + 1.2))
        : Math.max(1.2, Math.min(7.5, Number(line.left || 0) - 7));
    }
    const top = Math.max(5, Math.min(92, Number(line.top || 0) + Number(line.height || 0) / 2));
    slots.push({
      section: currentSection,
      index: slots.length,
      raw: text,
      text,
      numbers,
      left,
      top,
      kind,
      labelOnly: hasLabelSlot && !blankWord,
      questionTitle: questionTitleSlot,
    });
  }
  return slots;
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.floor(sorted.length / 2)];
}

function tableColumnHints(layoutLines = []) {
  const species = [];
  const comments = [];
  for (const line of layoutLines) {
    const words = Array.isArray(line.words) ? line.words : [];
    for (const word of words) {
      const text = String(word.text || "").replace(/[^\p{L}]/gu, "").toLowerCase();
      const left = Number(word.left || 0);
      if (/^(?:dolphins|porpoises|bottlenose|boutu|beiji|baleen|toothed|susus|vision)$/.test(text)) species.push(left);
      if (/^(?:nerves|probably|exceptional|usually|repertoire|related|forward|intensity)$/.test(text)) comments.push(left);
    }
  }
  return {
    speciesLeft: median(species) ?? 24,
    commentsLeft: median(comments) ?? 56,
  };
}

function isFormLikePage(pageText, layoutLines = []) {
  if (/Complete the fo\s*rm below/i.test(pageText)) return true;
  if (/Complete the table below|Complete the notes below|Complete the summary|Complete the sentences/i.test(pageText)) return false;
  const colonLines = String(pageText || "").split(/\r?\n/).filter((line) => /:\s*/.test(line)).length;
  const layoutColonLines = layoutLines.filter((line) => /:\s*/.test(String(line.text || ""))).length;
  return colonLines + layoutColonLines >= 4 && /(?:Name|Address|Make|Model|Engine|Title|Postcode|Contact|Year|Mileage|Colour|Condition):/i.test(pageText);
}

function formAnswerColumn(layoutLines = []) {
  const values = [];
  for (const line of layoutLines) {
    const text = String(line.text || "");
    if (!/[:?]/.test(text) || /^(?:SECTION|Questions?|Complete|Write|Example Answer)/i.test(text.trim())) continue;
    const words = Array.isArray(line.words) ? line.words : [];
    words.forEach((word) => {
      const left = Number(word.left || 0);
      const wordText = String(word.text || "");
      if (left > 38 && left < 78 && !/^\|$/.test(wordText)) values.push(left);
    });
  }
  return median(values) ?? 52;
}

function paperLineLabel(lineText) {
  const beforeBlank = String(lineText || "").split(/(?:\.{2,}|(?:\.\s*){2,}|_|\u2026)/)[0];
  const withoutNumber = beforeBlank.replace(/(?:^|[^\d])([1-9]|[1-3]\d|40)\s*$/, "").trim();
  const labelMatch = withoutNumber.match(/([A-Za-z][A-Za-z\s()/?'-]{1,32}:?)(?:\s+[A-Z][A-Za-z'-]+)?$/);
  return (labelMatch?.[1] || withoutNumber).replace(/[:?]\s*$/, "").trim();
}

function formLineLayout(lineText, layoutLines = []) {
  const label = paperLineLabel(lineText);
  const escapedWords = label.split(/\s+/).filter(Boolean).slice(0, 3);
  if (!escapedWords.length) return null;
  const patterns = escapedWords.map((word) => new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  return layoutLines.find((line) => {
    const text = String(line.text || "");
    return patterns.every((pattern) => pattern.test(text));
  }) || null;
}

function formSlotLeft(lineText, layoutLine, defaultColumn) {
  const text = String(lineText || "");
  const namePrefix = text.match(/:\s*([A-Z][A-Za-z'-]+)\s+([1-9]|[1-3]\d|40)\b/);
  if (namePrefix && layoutLine) {
    const target = namePrefix[1].toLowerCase();
    const word = (layoutLine.words || []).find((item) => String(item.text || "").replace(/[^\p{L}]/gu, "").toLowerCase() === target);
    if (word) return Math.max(defaultColumn, Math.min(86, Number(word.left || 0) + Number(word.width || 0) + 1.2));
  }
  return defaultColumn;
}

function paperBlankLineNumber(line, number) {
  return new RegExp(`(?:^|[^\\d])${number}(?:\\s|\\.{2,}|\\s*\\.\\s*\\.|$)`).test(line)
    && /(?:\.{2,}|\. \.|_|\u2026)/.test(line);
}

function interpolateTop(lineIndex, anchors, fallbackIndex, totalLines) {
  const before = anchors.filter((anchor) => anchor.lineIndex <= lineIndex).sort((a, b) => b.lineIndex - a.lineIndex)[0];
  const after = anchors.filter((anchor) => anchor.lineIndex >= lineIndex).sort((a, b) => a.lineIndex - b.lineIndex)[0];
  if (before && after && before.lineIndex !== after.lineIndex) {
    const ratio = (lineIndex - before.lineIndex) / (after.lineIndex - before.lineIndex);
    return before.top + (after.top - before.top) * ratio;
  }
  if (before && anchors.length > 1) {
    const previous = anchors.filter((anchor) => anchor.lineIndex < before.lineIndex).sort((a, b) => b.lineIndex - a.lineIndex)[0];
    if (previous) {
      const slope = (before.top - previous.top) / Math.max(1, before.lineIndex - previous.lineIndex);
      return before.top + (lineIndex - before.lineIndex) * slope;
    }
  }
  if (after && anchors.length > 1) {
    const next = anchors.filter((anchor) => anchor.lineIndex > after.lineIndex).sort((a, b) => a.lineIndex - b.lineIndex)[0];
    if (next) {
      const slope = (next.top - after.top) / Math.max(1, next.lineIndex - after.lineIndex);
      return after.top - (after.lineIndex - lineIndex) * slope;
    }
  }
  if (before) return before.top + Math.min(10, Math.max(2, lineIndex - before.lineIndex) * 1.8);
  if (after) return after.top - Math.min(10, Math.max(2, after.lineIndex - lineIndex) * 1.8);
  return 12 + ((fallbackIndex + 1) / Math.max(2, totalLines + 1)) * 74;
}

function syntheticPaperSlots(sortedNumbers, pageText, layoutLines, layoutSlots) {
  const rawLines = String(pageText || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim());
  if (!rawLines.some(Boolean)) return [];
  const exactLayoutSlots = layoutSlots.filter((slot) => slot.numbers?.length);
  const lineForNumber = new Map();
  sortedNumbers.forEach((number) => {
    const index = rawLines.findIndex((line) => paperBlankLineNumber(line, number));
    if (index >= 0) lineForNumber.set(number, { index, text: rawLines[index] });
  });
  const anchors = exactLayoutSlots.flatMap((slot) =>
    slot.numbers
      .map((number) => {
        const line = lineForNumber.get(number);
        return line ? { number, lineIndex: line.index, top: slot.top } : null;
      })
      .filter(Boolean),
  );
  const tableMode = /table below/i.test(pageText);
  const formMode = isFormLikePage(pageText, layoutLines);
  const columns = tableColumnHints(layoutLines);
  const formColumn = formAnswerColumn(layoutLines);
  const maxLineLength = Math.max(40, ...rawLines.map((line) => line.length));
  return sortedNumbers
    .filter((number) => (formMode || !exactLayoutSlots.some((slot) => slot.numbers.includes(number))) && lineForNumber.has(number))
    .map((number, fallbackIndex) => {
      const line = lineForNumber.get(number);
      const targetIndex = Math.max(0, line.text.search(new RegExp(`${number}`)) + String(number).length + 1);
      let left = Math.max(8, Math.min(84, 4 + (targetIndex / maxLineLength) * 88));
      if (tableMode) {
        const afterNumber = line.text.slice(line.text.indexOf(String(number)) + String(number).length);
        const startsWithNumber = new RegExp(`^${number}\\b`).test(line.text);
        const speciesColumn = startsWithNumber || /^Vision\s+\d{1,2}\b/i.test(line.text) || /^21\b/.test(line.text);
        const commentsColumn = /\band\b/i.test(afterNumber) || /\b(?:their|use|in)\s+\d{1,2}\b/i.test(line.text);
        if (speciesColumn && !commentsColumn) left = columns.speciesLeft;
        else if (commentsColumn) left = columns.commentsLeft;
      }
      if (formMode) {
        const layoutLine = formLineLayout(line.text, layoutLines);
        left = formSlotLeft(line.text, layoutLine, formColumn);
      }
      return {
        section: null,
        index: `paper-${number}`,
        raw: line.text,
        text: line.text,
        numbers: [number],
        left,
        top: Math.max(5, Math.min(92, formMode && formLineLayout(line.text, layoutLines)
          ? Number(formLineLayout(line.text, layoutLines).top || 0) + Number(formLineLayout(line.text, layoutLines).height || 0) / 2
          : interpolateTop(line.index, anchors, fallbackIndex, rawLines.length))),
        kind: "blank",
        synthetic: true,
      };
    });
}

function sequentialBlankPositionSlots(sortedNumbers, layoutSlots) {
  if (sortedNumbers.length < 2) return null;
  const allowedNumbers = new Set(sortedNumbers);
  const isAllowedSlot = (slot) =>
    !slot.numbers?.length || slot.numbers.some((number) => allowedNumbers.has(number));
  const choiceCount = layoutSlots.filter((slot) => slot.kind === "choice" && isAllowedSlot(slot)).length;
  if (choiceCount) return null;
  const blankSlots = layoutSlots
    .map((slot, slotIndex) => ({ ...slot, slotIndex }))
    .filter((slot) => slot.kind !== "choice" && isAllowedSlot(slot))
    .sort((a, b) => a.top - b.top || a.left - b.left);
  if (blankSlots.some((slot) => slot.synthetic) || blankSlots.length !== sortedNumbers.length) return null;
  const hasMostlySequentialNumbers = sortedNumbers.every((number, index) => index === 0 || number === sortedNumbers[index - 1] + 1);
  if (!hasMostlySequentialNumbers) return null;
  return blankSlots;
}

function questionPositions(numbers, pageText, layoutLines = []) {
  const baseLayoutSlots = layoutSlotCandidates(layoutLines);
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const syntheticSlots = syntheticPaperSlots(sortedNumbers, pageText, layoutLines, baseLayoutSlots);
  const formMode = isFormLikePage(pageText, layoutLines);
  const layoutSlots = (formMode && syntheticSlots.length ? syntheticSlots : [...baseLayoutSlots, ...syntheticSlots])
    .sort((a, b) => a.top - b.top || a.left - b.left);
  if (layoutSlots.length) {
    const positions = new Map();
    const allowedNumbers = new Set(sortedNumbers);
    const sequentialSlots = sequentialBlankPositionSlots(sortedNumbers, layoutSlots);
    const usedSlotIndexes = new Set();
    let lastTop = 0;
    const takeSlot = (number, section) => {
      const candidates = layoutSlots
        .map((slot, index) => ({ ...slot, slotIndex: index }))
        .filter((slot) => !usedSlotIndexes.has(slot.slotIndex)
          && (slot.section === section || slot.section === null || slot.section === undefined)
          && (!slot.numbers.length || slot.numbers.some((slotNumber) => allowedNumbers.has(slotNumber))));
      const exact = candidates.find((slot) => slot.numbers.includes(number));
      const openCandidates = candidates.filter((slot) => !slot.numbers.length);
      const ordered = exact || openCandidates.find((slot) => slot.top >= lastTop - 1) || openCandidates[0];
      if (ordered) usedSlotIndexes.add(ordered.slotIndex);
      return ordered || null;
    };
    sortedNumbers.forEach((number, index) => {
      const slot = sequentialSlots?.[index] || takeSlot(number, sectionIndexForQuestion(number));
      if (slot?.slotIndex !== undefined) usedSlotIndexes.add(slot.slotIndex);
      const sameRow = [...positions.values()].filter((position) => slot && Math.abs(position.top - slot.top) < 1.4).length;
      const fallbackTop = 12 + ((index + 1) / (sortedNumbers.length + 1)) * 74;
      const isChoice = slot?.kind === "choice";
      const choiceMaxLeft = slot?.questionTitle ? 24 : 12;
      const top = slot ? Math.max(5, Math.min(92, slot.top + (isChoice ? 0 : 0.45) + sameRow * (isChoice ? 0.8 : 1.8))) : fallbackTop;
      const left = slot
        ? Math.max(isChoice ? 1.2 : 5, Math.min(isChoice ? choiceMaxLeft : 86, slot.left + sameRow * (isChoice ? 5 : 10)))
        : 8 + (index % 2) * 42;
      positions.set(number, { left, top, kind: slot?.kind || "blank" });
      lastTop = Math.max(lastTop, top);
    });
    return positions;
  }

  const rawLines = String(pageText || "").split(/\r?\n/);
  const lines = rawLines
    .map((raw, index) => ({ raw, text: raw.replace(/\s+/g, " ").trim(), index }))
    .filter((line) => line.text);
  const maxLineLength = Math.max(55, ...rawLines.map((line) => line.length));
  const positions = new Map();
  const sectionStarts = new Map([1, 2, 3, 4].map((section) => [section, sectionStartLine(lines, section)]));
  const slotLines = answerSlotCandidates(rawLines, lines);
  const blockTitleLine = lines.find((line) => /^[A-Z][A-Z\s]{10,}$/.test(line.text) && !/^SECTION\b/.test(line.text))?.index ?? null;
  const usedSlotIndexes = new Set();
  const usedTops = [];
  const pageMin = sortedNumbers[0] || 1;
  const pageMax = sortedNumbers[sortedNumbers.length - 1] || pageMin;
  let lastLineIndex = 0;
  const takeSlot = (number, section) => {
    const candidates = slotLines.map((slot, index) => ({ ...slot, slotIndex: index }))
      .filter((slot) => !usedSlotIndexes.has(slot.slotIndex) && (slot.section === section || slot.section === null || slot.section === undefined));
    const exact = candidates.find((slot) => slot.numbers.includes(number));
    const ordered = exact || candidates.find((slot) => slot.index >= lastLineIndex - 1) || candidates[0];
    if (ordered) usedSlotIndexes.add(ordered.slotIndex);
    return ordered || null;
  };
  sortedNumbers.forEach((number) => {
    const section = sectionIndexForQuestion(number);
    const exactLine = questionLineForNumber(lines, number);
    const slot = takeSlot(number, section);
    const sectionLine = sectionStarts.get(section);
    const pageOrder = Math.max(0, number - pageMin);
    const pageSpan = Math.max(1, pageMax - pageMin + 1);
    const fallbackLine = sectionLine === null || sectionLine === undefined
      ? Math.round((pageOrder + 1) * (rawLines.length / (pageSpan + 1)))
      : sectionLine + 4 + pageOrder * Math.max(2, Math.floor((rawLines.length - sectionLine - 6) / pageSpan));
    const lineIndex = slot?.index ?? exactLine?.index ?? fallbackLine;
    const exactNumberIndex = exactLine ? Math.max(0, exactLine.raw.search(new RegExp(`\\b${number}\\b`))) : 0;
    const targetIndex = slot?.targetIndex ?? Math.min(maxLineLength - 1, exactNumberIndex + 8);
    const sectionTop = sectionLine === null || sectionLine === undefined
      ? null
      : 8 + (sectionLine / Math.max(1, rawLines.length - 1)) * 78;
    let top = Math.max(sectionTop === null ? 10 : sectionTop + 4, Math.min(80, 8 + (lineIndex / Math.max(1, rawLines.length - 1)) * 78));
    const blockOffset = blockTitleLine !== null && lineIndex > blockTitleLine
      ? lineIndex <= blockTitleLine + 1 ? 8.5 : 6
      : 0;
    top = Math.min(82, top + blockOffset);
    if (slot?.labelOnly) top = Math.max(sectionTop === null ? 10 : sectionTop + 4, top - 1.4);
    let bumpCount = 0;
    while (usedTops.some((used) => Math.abs(used - top) < 1.2) && bumpCount < 6) {
      top = Math.min(82, top + 2.4);
      bumpCount += 1;
    }
    const sameLineUse = [...positions.values()].filter((pos) => Math.abs(pos.top - top) < 2.8).length;
    usedTops.push(top);
    const left = Math.max(8, Math.min(84, 4 + (targetIndex / maxLineLength) * 88 + sameLineUse * 9));
    positions.set(number, { left, top });
    lastLineIndex = Math.max(lastLineIndex, lineIndex);
  });
  return positions;
}

function renderInlineAnswers(prefix, questions, numbers, compactLabel = "This page", pageText = "", options = {}) {
  return "";
  if (!numbers.length) return "";
  const byNumber = new Map((questions || []).map((question, index) => [questionNumber(question, index), question]));
  const positions = questionPositions(numbers, pageText, options.layoutLines || []);
  return `<div class="page-answer-layer" aria-label="${escapeHtml(compactLabel)}">${numbers
      .map((number, index) => {
        const question = byNumber.get(number);
        if (!question) return "";
        const position = positions.get(number) || {
          left: 8 + (index % 2) * 46,
          top: 84 + Math.floor(index / 2) * 4,
        };
        const isChoice = position.kind === "choice";
        return `<label class="page-answer-cell page-positioned-answer ${isChoice ? "page-answer-choice" : "page-answer-blank"}" style="left:${position.left}%;top:${position.top}%">
          <span>${number}</span>
          <input class="text-input answer-input" data-prefix="${prefix}" data-qid="${question.id}" placeholder="${isChoice ? "A" : "Answer"}" />
        </label>`;
      })
      .join("")}</div>`;
}

function uniqueOrderedImages(images) {
  const seenPages = new Set();
  const seenUrls = new Set();
  return (images || [])
    .filter((image) => image?.url)
    .sort((a, b) => Number(a.page || 0) - Number(b.page || 0))
    .filter((image, index) => {
      const page = image.page || index + 1;
      const url = image.url || "";
      if (url && seenUrls.has(url)) return false;
      if (page && seenPages.has(page)) return false;
      if (url) seenUrls.add(url);
      if (page) seenPages.add(page);
      return true;
    });
}
function paperPageTextForImage(pageTexts, image, index) {
  const page = Number(image?.page || index + 1);
  return pageTexts.get(page) || "";
}

function paperPageKindScore(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return { listening: 0, reading: 0 };
  let listening = 0;
  let reading = 0;
  if (/\bLISTENING\b/i.test(clean)) listening += 5;
  if (/\b(?:SECTION|PART)\s+[1-4]\b/i.test(clean) || /\bS\s*E\s*C\s*T\s*I\s*O\s*N\s*[1-4]\b/i.test(clean)) listening += 3;
  if (/\bQuestions?\s+(?:31\s*(?:-|to|and|–|—|\+)\s*40|3\s*1\s*(?:-|to|and|–|—|\+)\s*4\s*0|21\s*(?:-|to|and|–|—|\+)\s*30|11\s*(?:-|to|and|–|—|\+)\s*20|1\s*(?:-|to|and|–|—|\+)\s*10)\b/i.test(clean)) listening += 2;
  if (/\bREADING PASSAGE\s+\d\b/i.test(clean)) reading += 8;
  if (/You should spend about 20 minutes on Questions/i.test(clean)) reading += 6;
  if (/\bREADING\s+(?:PASSAGE|Questions?)\b/i.test(clean)) reading += 4;
  if (reading > 0 && /\bQuestions?\s+\d{1,2}\s*(?:-|to|and|–|—)\s*\d{1,2}\b/i.test(clean) && /(?:TRUE|FALSE|NOT GIVEN|YES|NO|paragraph|passage|heading|information)/i.test(clean)) reading += 2;
  if (/Choose (?:the correct letter|NO MORE THAN|TWO WORDS|ONE WORD)/i.test(clean) && /\bREADING PASSAGE\b/i.test(clean)) reading += 2;
  return { listening, reading };
}

function isListeningPaperPageText(text) {
  const score = paperPageKindScore(text);
  return score.listening > 0 && score.listening >= score.reading + 2;
}

function isReadingPaperPageText(text) {
  const score = paperPageKindScore(text);
  return score.reading > 0 && score.reading >= score.listening;
}

function filteredPaperImagesForLabel(images, label, paper) {
  const orderedImages = uniqueOrderedImages(images);
  if (!orderedImages.length) return orderedImages;
  const pageTexts = parsePaperPages(paper);
  if (!pageTexts.size) return orderedImages;
  if (/Reading/i.test(label)) {
    const filtered = orderedImages.filter((image, index) => {
      const text = paperPageTextForImage(pageTexts, image, index);
      const score = paperPageKindScore(text);
      if (!text) return true;
      if (score.reading > 0) return score.reading >= score.listening;
      return !isListeningPaperPageText(text);
    });
    return filtered.length ? filtered : orderedImages;
  }
  if (/Listening/i.test(label)) {
    const filtered = orderedImages.filter((image, index) => {
      const text = paperPageTextForImage(pageTexts, image, index);
      const score = paperPageKindScore(text);
      if (!text) return true;
      if (score.reading >= score.listening + 4) return false;
      if (score.listening > 0) return true;
      return !isReadingPaperPageText(text);
    });
    return filtered.length ? filtered : orderedImages;
  }
  return orderedImages;
}

function expectedQuestionNumbers(questions) {
  const numbers = (questions || [])
    .map((question, index) => questionNumber(question, index))
    .filter((number) => number >= 1 && number <= 40);
  const unique = [...new Set(numbers)].sort((a, b) => a - b);
  if (unique.length >= 30) return unique;
  return Array.from({ length: 40 }, (_, index) => index + 1);
}

function addAssignmentNumber(assignments, page, number, used) {
  if (used.has(number)) return;
  if (!assignments.has(page)) assignments.set(page, []);
  assignments.get(page).push(number);
  used.add(number);
}

function distributeNumbers(assignments, pages, numbers, used) {
  const cleanNumbers = numbers.filter((number) => number >= 1 && number <= 40 && !used.has(number));
  if (!cleanNumbers.length || !pages.length) return;
  cleanNumbers.forEach((number, index) => {
    const pageIndex = Math.min(pages.length - 1, Math.floor((index * pages.length) / cleanNumbers.length));
    addAssignmentNumber(assignments, pages[pageIndex], number, used);
  });
}

function completeQuestionAssignments(assignments, pages, expectedNumbers) {
  const used = new Set([...assignments.values()].flat());
  const explicit = pages
    .map((page, index) => {
      const numbers = assignments.get(page) || [];
      return { page, index, min: Math.min(...numbers), max: Math.max(...numbers), numbers };
    })
    .filter((entry) => entry.numbers.length);

  if (!explicit.length) {
    distributeNumbers(assignments, pages, expectedNumbers, used);
  } else {
    const first = explicit[0];
    distributeNumbers(
      assignments,
      pages.slice(0, Math.max(1, first.index)),
      expectedNumbers.filter((number) => number < first.min),
      used,
    );

    explicit.forEach((entry, entryIndex) => {
      const next = explicit[entryIndex + 1];
      const between = next
        ? expectedNumbers.filter((number) => number > entry.max && number < next.min)
        : expectedNumbers.filter((number) => number > entry.max);
      if (!between.length) return;
      const blankPages = next ? pages.slice(entry.index + 1, next.index) : pages.slice(entry.index + 1);
      distributeNumbers(assignments, blankPages.length ? blankPages : [entry.page], between, used);
    });
  }

  for (const page of pages) {
    if (assignments.has(page)) {
      assignments.set(page, [...new Set(assignments.get(page))].sort((a, b) => a - b));
    }
  }
  return new Map(pages.filter((page) => assignments.has(page)).map((page) => [page, assignments.get(page)]));
}

function listeningSectionForNumbers(numbers) {
  if (!numbers?.length) return null;
  if (numbers.includes(1)) return 0;
  if (numbers.includes(11)) return 1;
  if (numbers.includes(21)) return 2;
  if (numbers.includes(31)) return 3;
  return null;
}

function audioOverlayPosition(sectionIndex, pageText) {
  const rawLines = String(pageText || "").split(/\r?\n/);
  const lines = rawLines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .map((text, index) => ({ text, index }))
    .filter((line) => line.text);
  const lineIndex = sectionStartLine(lines, sectionIndex + 1);
  if (lineIndex === null || lineIndex === undefined) return 6;
  return Math.max(5, Math.min(72, 6 + (lineIndex / Math.max(1, rawLines.length - 1)) * 78));
}

function renderListeningCaptionToggle(prefix, section = "") {
  return `<button class="secondary small-button listening-caption-toggle" type="button" aria-pressed="false" data-prefix="${escapeHtml(prefix)}" data-section="${escapeHtml(section)}">Captions</button>`;
}

function renderPageAudioControl(audioUrls, numbers, pageText = "", prefix = "") {
  const sectionIndex = listeningSectionForNumbers(numbers);
  const url = sectionIndex === null ? "" : audioUrls?.[sectionIndex];
  if (!url) return "";
  return `<div class="page-card-audio" title="Section ${sectionIndex + 1} audio">
    <span>S${sectionIndex + 1}</span>
    <div class="audio-caption-row">
      <audio class="listening-player" controls preload="none" data-prefix="${escapeHtml(prefix)}" data-section="${sectionIndex + 1}" src="${escapeHtml(url)}"></audio>
      ${renderListeningCaptionToggle(prefix, sectionIndex + 1)}
    </div>
  </div>`;
}

function answerCardTitle(label) {
  if (/Listening/i.test(label)) return "Listening answer sheet";
  if (/Reading/i.test(label)) return "Reading answer sheet";
  return "Answer sheet";
}

function renderPageAnswerCard(prefix, questions, numbers, label, audioControl = "") {
  if (!numbers.length && !audioControl) return "";
  const title = answerCardTitle(label);
  const byNumber = new Map((questions || []).map((question, index) => [questionNumber(question, index), question]));
  const inputs = numbers
    .map((number) => {
      const question = byNumber.get(number);
      if (!question) return "";
      return `<label class="page-card-answer">
        <span>${number}</span>
        <input class="text-input answer-input page-card-input" data-prefix="${prefix}" data-qid="${question.id}" placeholder="Answer" />
      </label>`;
    })
    .join("");
  return `<aside class="page-answer-card" aria-label="${escapeHtml(title)}">
    <div class="page-answer-card-title">${escapeHtml(title)}</div>
    ${audioControl}
    ${inputs ? `<div class="page-card-answer-list">${inputs}</div>` : `<div class="page-card-empty">No answerable questions on this page.</div>`}
  </aside>`;
}

function paperQuestionEntries(questions) {
  const byNumber = new Map();
  (questions || []).forEach((question, index) => {
    const number = questionNumber(question, index);
    if (number >= 1 && number <= 40 && !byNumber.has(number)) byNumber.set(number, question);
  });
  return [...byNumber.entries()].sort((a, b) => a[0] - b[0]);
}

function renderSectionAudio(url, section, prefix = "") {
  if (!url) return "";
  return `<div class="paper-audio-row">
    <div class="paper-audio-title-row">
      <span>Section ${section} audio</span>
      ${renderListeningCaptionToggle(prefix, section)}
    </div>
    <audio class="listening-player" controls preload="none" data-prefix="${escapeHtml(prefix)}" data-section="${escapeHtml(section)}" src="${escapeHtml(url)}"></audio>
  </div>`;
}

function listeningAnswerGroups(entries, audioUrls = []) {
  return [1, 2, 3, 4]
    .map((section) => {
      const start = (section - 1) * 10 + 1;
      const end = section * 10;
      return {
        section,
        title: `Section ${section} - Q${start}-${end}`,
        audioUrl: audioUrls[section - 1] || "",
        entries: entries.filter(([number]) => number >= start && number <= end),
      };
    })
    .filter((group) => group.entries.length || group.audioUrl);
}

function readingAnswerGroups(entries) {
  const ranges = [
    { passage: 1, start: 1, end: 13 },
    { passage: 2, start: 14, end: 26 },
    { passage: 3, start: 27, end: 40 },
  ];
  return ranges
    .map(({ passage, start, end }) => ({
      title: `Passage ${passage} - Q${start}-${end}`,
      entries: entries.filter(([number]) => number >= start && number <= end),
    }))
    .filter((group) => group.entries.length);
}

function pageAnswerGroups(assignments, entries) {
  const byNumber = new Map(entries);
  const used = new Set();
  const groups = [...assignments.entries()]
    .map(([page, numbers]) => {
      const pageEntries = numbers
        .filter((number) => byNumber.has(number))
        .map((number) => [number, byNumber.get(number)]);
      pageEntries.forEach(([number]) => used.add(number));
      return { title: `Page ${page}`, entries: pageEntries };
    })
    .filter((group) => group.entries.length);
  const remaining = entries.filter(([number]) => !used.has(number));
  if (remaining.length) groups.push({ title: "Other questions", entries: remaining });
  if (!groups.length && entries.length) groups.push({ title: "Answer sheet", entries });
  return groups;
}

function renderAnswerGroup(group, prefix, options = {}) {
  const isReading = options.isReading === true;
  const passagePageByQuestion = options.passagePageByQuestion instanceof Map
    ? options.passagePageByQuestion
    : new Map();
  return `<section class="paper-answer-group"${!isReading && group.section ? ` data-listening-section="${escapeHtml(group.section)}"` : ""}>
    <div class="paper-answer-group-title">${escapeHtml(group.title)}</div>
    ${renderSectionAudio(group.audioUrl, group.section, prefix)}
    <div class="paper-answer-grid">${group.entries
      .map(([number, question]) => {
        if (!isReading) {
          return `<label class="paper-answer-row">
            <span>${number}</span>
            <input class="text-input answer-input paper-answer-input" data-prefix="${prefix}" data-qid="${escapeHtml(question.id)}" placeholder="Answer" />
          </label>`;
        }
        const marked = Boolean(state.readingReviewMarks?.[question.id]);
        const passagePage = passagePageByQuestion.get(number) || "";
        return `<div class="paper-answer-row${marked ? " marked-review" : ""}" data-question-number="${number}" data-question-page="${escapeHtml(question.questionPage || "")}" data-reading-passage-page="${escapeHtml(passagePage)}" data-qid="${escapeHtml(question.id)}">
          <div class="paper-answer-number"><strong>${number}</strong>${isReading ? `<span>${escapeHtml(question.typeLabel || "Question")}</span>` : ""}</div>
          <label>
            <span class="sr-only">Question ${number} answer</span>
            <input class="text-input answer-input paper-answer-input" data-prefix="${prefix}" data-qid="${escapeHtml(question.id)}" placeholder="Answer" />
          </label>
          ${isReading ? `<div class="reading-question-actions">
            <span class="reading-answer-state">Unanswered</span>
            <button class="reading-mark-review${marked ? " active" : ""}" type="button" data-reading-mark="${escapeHtml(question.id)}" aria-pressed="${marked ? "true" : "false"}">${marked ? "Marked" : "Mark"}</button>
            <button class="reading-hint-step" type="button" data-reading-hint="${escapeHtml(question.id)}" data-hint-step="1">Hint 1</button>
          </div>` : ""}
        </div>`;
      })
      .join("")}</div>
  </section>`;
}

function renderPaperAnswerPanel(prefix, questions, assignments, label, audioUrls = [], options = {}) {
  const entries = paperQuestionEntries(questions);
  const isListening = audioUrls.length > 0;
  const isReading = /Reading/i.test(label);
  const groups = isListening
    ? listeningAnswerGroups(entries, audioUrls)
    : isReading
      ? readingAnswerGroups(entries)
      : pageAnswerGroups(assignments, entries);
  const title = isListening ? "Listening answer sheet" : answerCardTitle(label);
  const scrollAttribute = options.scrollKey ? ` data-reading-scroll-pane="${escapeHtml(options.scrollKey)}"` : "";
  return `<aside class="paper-answer-scroll${isReading ? " reading-answer-sheet" : ""}"${scrollAttribute} aria-label="${escapeHtml(title)}">
    <div class="paper-answer-groups">
      ${groups.length ? groups.map((group) => renderAnswerGroup(group, prefix, {
        isReading,
        passagePageByQuestion: options.passagePageByQuestion,
      })).join("") : `<div class="page-card-empty">This paper has no answerable questions.</div>`}
    </div>
  </aside>`;
}

function assignQuestionsToPages(images, questions, paper) {
  const orderedImages = uniqueOrderedImages(images);
  const pages = orderedImages.map((image, index) => image.page || index + 1);
  const pageTexts = parsePaperPages(paper);
  const used = new Set();
  const assignments = new Map();
  for (const page of pages) {
    const numbers = [...numbersFromPageText(pageTexts.get(page) || "")].sort((a, b) => a - b);
    const available = numbers.filter((number) => !used.has(number));
    if (available.length) {
      assignments.set(page, available);
      available.forEach((number) => used.add(number));
    }
  }
  return completeQuestionAssignments(assignments, pages, expectedQuestionNumbers(questions));
}

function collectAnswers(prefix) {
  const answers = {};
  document.querySelectorAll(`.answer-input[data-prefix="${prefix}"]`).forEach((input) => {
    answers[input.dataset.qid] = input.value;
  });
  return answers;
}

function collectSingleWritingDrafts() {
  const drafts = {};
  document.querySelectorAll('#single textarea[id$="-writing"]').forEach((textarea) => {
    drafts[textarea.id] = textarea.value || "";
  });
  return drafts;
}

function learningEntityId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

function practiceSessionRemotePayload(session, status = "in_progress") {
  return {
    revision: Number(session.revision) || 0,
    module: session.module,
    itemId: session.itemId,
    practiceKind: "single",
    mode: session.modes?.[session.module] || "practice",
    status,
    state: {
      answers: session.answers || {},
      seconds: session.seconds,
      total: session.total,
      scopes: session.scopes || {},
      sections: session.sections || {},
      readingPane: session.readingPane || "passage",
      readingQuestionType: session.readingQuestionType || "",
      readingReviewMarks: session.readingReviewMarks || {},
      readingPaneScroll: session.readingPaneScroll || {},
      writingDrafts: session.writingDrafts || {},
      pageScrollY: session.pageScrollY || 0,
    },
  };
}

function scheduleRemotePracticeSessionSync(session) {
  if (!state.authToken || !session?.sessionId) return;
  if (state.learningSyncTimer) clearTimeout(state.learningSyncTimer);
  state.learningSyncTimer = setTimeout(async () => {
    state.learningSyncTimer = null;
    try {
      const json = await putJson(`/api/learning/sessions/${encodeURIComponent(session.sessionId)}`, practiceSessionRemotePayload(session));
      const current = readPracticeSession();
      if (current?.sessionId === session.sessionId && json.session?.revision) {
        current.revision = json.session.revision;
        localStorage.setItem(practiceSessionStoreKey, JSON.stringify(current));
      }
      state.learningState = { ...(state.learningState || {}), activeSession: json.session || null };
    } catch (error) {
      if (/another device/i.test(error.message)) {
        state.learningState = { ...(state.learningState || {}), syncConflict: true };
      }
    }
  }, 500);
}

function savePracticeSession() {
  if (!state.singleStarted || !state.activeSingle?.id || state.practiceSessionCompleted) return;
  saveSingleAnswersToState();
  state.practiceWritingDrafts = { ...state.practiceWritingDrafts, ...collectSingleWritingDrafts() };
  const previous = readPracticeSession();
  const sameSession = previous?.module === state.activeModule && previous?.itemId === state.activeSingle.id;
  const session = {
    version: 1,
    sessionId: sameSession ? previous.sessionId || learningEntityId("session") : learningEntityId("session"),
    revision: sameSession ? Number(previous.revision) || 0 : 0,
    view: "single",
    module: state.activeModule,
    itemId: state.activeSingle.id,
    started: true,
    modes: state.singlePracticeModes,
    scopes: state.singlePracticeScopes,
    sections: state.singlePracticeSections,
    answers: state.singleAnswers,
    answerItemId: state.singleAnswerItemId,
    seconds: state.singleSeconds,
    total: state.singleTotal,
    readingPane: state.readingMobilePane,
    readingQuestionType: state.readingQuestionType,
    readingReviewMarks: state.readingReviewMarks,
    readingPaneScroll: state.readingPaneScroll,
    writingDrafts: state.practiceWritingDrafts,
    pageScrollY: window.scrollY,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(practiceSessionStoreKey, JSON.stringify(session));
  } catch {}
  scheduleRemotePracticeSessionSync(session);
}

async function completeActivePracticeSession() {
  const session = readPracticeSession();
  if (!session || session.module !== state.activeModule || session.itemId !== state.activeSingle?.id) return;
  state.practiceSessionCompleted = true;
  if (!state.authToken || !session.sessionId) {
    localStorage.removeItem(practiceSessionStoreKey);
    return;
  }
  localStorage.setItem(pendingPracticeCompletionStoreKey, JSON.stringify(session));
  try {
    const json = await putJson(`/api/learning/sessions/${encodeURIComponent(session.sessionId)}`, practiceSessionRemotePayload(session, "completed"));
    localStorage.removeItem(practiceSessionStoreKey);
    localStorage.removeItem(pendingPracticeCompletionStoreKey);
    state.learningState = { ...(state.learningState || {}), activeSession: null };
    if (json.session) state.learningState.lastCompletedSession = json.session;
  } catch {
    localStorage.removeItem(practiceSessionStoreKey);
    // Keep a completion tombstone so the stale remote session is never restored as unfinished.
  }
}

function readPendingPracticeCompletion() {
  try {
    return JSON.parse(localStorage.getItem(pendingPracticeCompletionStoreKey) || "null");
  } catch {
    return null;
  }
}

async function retryPendingPracticeCompletion(options = {}) {
  const ownerIdentity = options.ownerIdentity || practiceCompletionIdentityKey();
  const authToken = Object.prototype.hasOwnProperty.call(options, "authToken") ? options.authToken : state.authToken;
  const session = readPendingPracticeCompletion();
  if (!authToken || !session?.sessionId || !completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return false;
  try {
    await putJson(`/api/learning/sessions/${encodeURIComponent(session.sessionId)}`, practiceSessionRemotePayload(session, "completed"), { authToken });
    if (!completionSyncOwnerIsCurrent(ownerIdentity, authToken)) return false;
    localStorage.removeItem(pendingPracticeCompletionStoreKey);
    localStorage.removeItem(practiceSessionStoreKey);
    return true;
  } catch {
    return false;
  }
}

function schedulePracticeSessionSave() {
  if (state.practiceSessionSaveTimer) clearTimeout(state.practiceSessionSaveTimer);
  state.practiceSessionSaveTimer = setTimeout(() => {
    state.practiceSessionSaveTimer = null;
    savePracticeSession();
  }, 180);
}

function readPracticeSession() {
  try {
    const session = JSON.parse(localStorage.getItem(practiceSessionStoreKey) || "null");
    if (!session || session.version !== 1 || !session.started || !session.itemId) return null;
    return session;
  } catch {
    return null;
  }
}

function importRemotePracticeSession(remote) {
  if (!remote?.sessionId || readPracticeSession()) return false;
  const sessionState = remote.state || {};
  const session = {
    version: 1,
    sessionId: remote.sessionId,
    revision: Number(remote.revision) || 0,
    view: "single",
    module: remote.module,
    itemId: remote.itemId,
    started: remote.status === "in_progress",
    modes: { ...state.singlePracticeModes, [remote.module]: remote.mode || state.singlePracticeModes[remote.module] },
    scopes: { ...state.singlePracticeScopes, ...(sessionState.scopes || {}) },
    sections: { ...state.singlePracticeSections, ...(sessionState.sections || {}) },
    answers: sessionState.answers || {},
    answerItemId: remote.itemId,
    seconds: Number(sessionState.seconds),
    total: Number(sessionState.total),
    readingPane: sessionState.readingPane || "passage",
    readingQuestionType: sessionState.readingQuestionType || "",
    readingReviewMarks: sessionState.readingReviewMarks || {},
    readingPaneScroll: sessionState.readingPaneScroll || { passage: 0, questionPaper: 0, answers: 0 },
    writingDrafts: sessionState.writingDrafts || {},
    pageScrollY: Number(sessionState.pageScrollY) || 0,
    updatedAt: remote.updatedAt || new Date().toISOString(),
  };
  if (!session.started || !session.itemId) return false;
  localStorage.setItem(practiceSessionStoreKey, JSON.stringify(session));
  return true;
}

function restorePracticeSessionAfterData(expectedModule = "", expectedItemId = "") {
  const savedSession = readPracticeSession();
  const hasExpectedTarget = ["listening", "reading", "writing", "speaking"].includes(expectedModule) && Boolean(expectedItemId);
  const sessionMatchesTarget = savedSession?.module === expectedModule && savedSession?.itemId === expectedItemId;
  const session = hasExpectedTarget && !sessionMatchesTarget
    ? {
        version: 1,
        started: true,
        module: expectedModule,
        itemId: expectedItemId,
        modes: state.singlePracticeModes,
        scopes: state.singlePracticeScopes,
        sections: state.singlePracticeSections,
        answers: {},
        answerItemId: expectedItemId,
        seconds: singleModuleTotal(expectedModule),
        total: singleModuleTotal(expectedModule),
        readingPane: "passage",
        readingQuestionType: "",
        readingReviewMarks: {},
        readingPaneScroll: { passage: 0, questionPaper: 0, answers: 0 },
        writingDrafts: {},
        pageScrollY: 0,
      }
    : savedSession;
  if (!session || !["listening", "reading", "writing", "speaking"].includes(session.module)) return false;
  state.singlePracticeModes = { ...state.singlePracticeModes, ...(session.modes || {}) };
  state.singlePracticeScopes = { ...state.singlePracticeScopes, ...(session.scopes || {}) };
  state.singlePracticeSections = { ...state.singlePracticeSections, ...(session.sections || {}) };
  const baseItem = mergedItems(session.module).map(normalizeItem).find((candidate) => candidate.id === session.itemId) || null;
  const canonicalUnitMatch = String(session.itemId || "").match(/^(.+)::section::([1-9]\d*)$/);
  const canonicalUnitBase = canonicalUnitMatch
    ? mergedItems(session.module).map(normalizeItem).find((candidate) => candidate.id === canonicalUnitMatch[1]) || null
    : null;
  let item = session.scopes?.[session.module] === "topic" && canonicalUnitBase
    ? scopedPracticeUnit(session.module, canonicalUnitBase, "topic", Number(canonicalUnitMatch[2]))
    : findItemById(session.module, session.itemId);
  if (baseItem && ["listening", "reading"].includes(session.module) && !session.scopes?.[session.module]) {
    const legacyScope = scopeFromLegacyMode(session.module, session.modes?.[session.module]);
    state.singlePracticeScopes[session.module] = legacyScope;
    if (legacyScope === "section") item = scopedPracticeUnit(session.module, baseItem, "section", session.sections?.[session.module] || 1);
    if (legacyScope === "topic") item = scopedPracticeUnit(session.module, baseItem, "topic", session.readingQuestionType || "");
  } else if (item?.libraryScope === "topic") {
    setSinglePracticeScope(session.module, "topic");
  } else if (item?.practiceScope) {
    setSinglePracticeScope(session.module, item.practiceScope);
  }
  if (!item) return false;
  state.activeModule = session.module;
  state.practiceSessionCompleted = false;
  state.activeSingle = item;
  state.singleStarted = true;
  state.singleAnswers = { ...(session.answers || {}) };
  state.singleAnswerItemId = session.answerItemId || item.id;
  state.singleSeconds = Number.isFinite(Number(session.seconds)) ? Number(session.seconds) : singleModuleTotal(session.module);
  state.singleTotal = Number.isFinite(Number(session.total)) ? Number(session.total) : singleModuleTotal(session.module);
  state.readingMobilePane = ["passage", "questions"].includes(session.readingPane) ? session.readingPane : "passage";
  state.readingQuestionType = session.readingQuestionType || "";
  state.readingReviewMarks = { ...(session.readingReviewMarks || {}) };
  state.readingPaneScroll = { passage: 0, questionPaper: 0, answers: 0, ...(session.readingPaneScroll || {}) };
  state.practiceWritingDrafts = { ...(session.writingDrafts || {}) };
  state.restoredPracticeScrollY = session.module === "speaking" ? Number(session.pageScrollY) || 0 : 0;
  return true;
}

function restoreSingleWritingDrafts() {
  Object.entries(state.practiceWritingDrafts || {}).forEach(([id, value]) => {
    const textarea = $(id);
    if (!textarea) return;
    textarea.value = value;
    const wordNode = $(`${id.replace("-writing", "")}-words`);
    if (wordNode) wordNode.textContent = countWords(value);
  });
}

function activeViewId() {
  return document.querySelector(".view.active")?.id || "";
}

function viewDisplayName(viewId = activeViewId()) {
  return {
    home: "Dashboard",
    single: "Single Module",
    exam: "Random Full Exam",
    sequence: "Same-Test Practice",
    "writing-upload": "Writing with AI",
    bank: "Speaking with AI",
    vocabulary: "Vocabulary",
    mine: "Mine",
    subscription: "Membership",
  }[viewId] || "IELTS-ist";
}

function currentHelpModule() {
  const view = activeViewId();
  if (view === "single") return state.activeModule || "";
  const immersive = document.body.dataset.immersiveModule || "";
  if (immersive) return immersive;
  const focused = document.querySelector(".view.active .exam-section.focused-section[data-module]");
  if (focused?.dataset.module) return focused.dataset.module;
  const sections = [...document.querySelectorAll(".view.active .exam-section[data-module]")];
  let best = null;
  let bestScore = -Infinity;
  const targetY = Math.max(100, Math.min(window.innerHeight * 0.45, window.innerHeight - 80));
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const distance = Math.abs(rect.top - targetY);
    const score = visible - distance * 0.2;
    if (score > bestScore) {
      bestScore = score;
      best = section;
    }
  });
  return best?.dataset.module || "";
}

function activePracticeItemForSurface(view = activeViewId(), moduleName = currentHelpModule()) {
  if (view === "single") return state.activeSingle ? normalizeItem(state.activeSingle) : null;
  if (view === "exam") {
    if (moduleName === "listening") return state.exam?.listening ? normalizeItem(state.exam.listening) : null;
    if (moduleName === "reading") return state.exam?.reading ? normalizeItem(state.exam.reading) : null;
    if (moduleName === "writing") return state.exam?.writingTasks?.[0] ? normalizeItem(state.exam.writingTasks[0]) : null;
    if (moduleName === "speaking") return state.exam?.speaking ? normalizeItem(state.exam.speaking) : null;
  }
  if (view === "sequence") {
    if (moduleName === "listening") return state.sequence?.listening ? normalizeItem(state.sequence.listening) : null;
    if (moduleName === "reading") return state.sequence?.reading ? normalizeItem(state.sequence.reading) : null;
    if (moduleName === "writing") return state.sequence?.writingTasks?.[0] ? normalizeItem(state.sequence.writingTasks[0]) : null;
    if (moduleName === "speaking") return state.sequence?.speaking ? normalizeItem(state.sequence.speaking) : null;
  }
  if (view === "writing-upload") {
    const context = currentWritingUploadCoachContext();
    if (context?.taskId) return normalizeItem(writingUploadTaskByNumber(context.activeTaskNumber) || {});
    if (context) return { id: `custom-task-${context.activeTaskNumber}`, title: context.activeTaskTitle, module: "writing" };
  }
  if (view === "bank" && state.activeSpeakingTopic) return normalizeItem(state.activeSpeakingTopic);
  return null;
}

function currentCoachBinding() {
  const view = activeViewId() || "home";
  const moduleName = ["single", "exam", "sequence"].includes(view)
    ? currentHelpModule() || state.activeModule || ""
    : view === "writing-upload"
      ? "writing"
      : view === "bank"
        ? "speaking"
        : "";
  const item = activePracticeItemForSurface(view, moduleName);
  const savedSession = readPracticeSession();
  const writingContext = view === "writing-upload" ? currentWritingUploadCoachContext() : null;
  const writingUnit = writingContext ? `task${writingContext.activeTaskNumber || 1}` : "";
  const sessionId = view === "single" && savedSession?.module === moduleName && (!item?.id || savedSession.itemId === item.id)
    ? String(savedSession.sessionId || "")
    : view === "exam"
      ? `exam:${item?.id || "current"}`
      : view === "sequence"
        ? `sequence:${item?.id || "current"}`
        : view === "writing-upload"
          ? `writing:${item?.id || "custom"}:${writingUnit}`
          : view === "bank"
            ? `speaking:${item?.id || "bank"}`
            : `view:${view}`;
  const focused = state.coach.focusQuestion?.module === moduleName ? state.coach.focusQuestion : null;
  const fallbackQuestion = moduleName === "reading"
    ? Number(document.querySelector(".reading-mobile-workspace")?.dataset.focusedQuestion || 0)
    : 0;
  const questionId = String(focused?.id || writingUnit || (fallbackQuestion ? `q${fallbackQuestion}` : ""));
  return {
    sessionId,
    module: moduleName,
    paperId: String(item?.id || ""),
    questionId,
    view,
  };
}

function rebindCoachContext() {
  const next = currentCoachBinding();
  const nextKey = coachBindingKey(next);
  const previous = state.help.binding;
  const previousKey = previous ? coachBindingKey(previous) : "";
  if (previousKey === nextKey) return next;
  if (previous && state.help.history.length) persistCoachThread(previous, state.help.history);
  const focus = state.coach.focusQuestion;
  const restored = restoreCoachThread(next);
  state.help.binding = next;
  state.help.contextText = restored?.contextText || "";
  state.help.context = null;
  state.help.pendingImageDataUrl = "";
  state.help.history = restored?.messages?.map((message) => ({ ...message })) || [];
  state.help.surfaceOverride = null;
  state.coach.history = [];
  state.coach.contextText = "";
  state.coach.lastAnswer = "";
  state.coach.focusQuestion = focus?.module === next.module && (!next.questionId || focus.id === next.questionId) ? focus : null;
  const log = $("helpChatLog");
  if (log) {
    log.innerHTML = "";
    delete log.dataset.coachSurface;
    state.help.history.forEach((message) => addHelpMessage(message.role, message.content || ""));
  }
  updateHelpAttachmentPreview();
  return next;
}

function currentCoachSurface(extra = {}) {
  const binding = rebindCoachContext();
  const view = activeViewId();
  const moduleName = ["single", "exam", "sequence"].includes(view)
    ? currentHelpModule() || state.activeModule || ""
    : view === "writing-upload"
      ? "writing"
      : view === "bank"
        ? "speaking"
        : "";
  const item = activePracticeItemForSurface(view, moduleName);
  const activePanel = document.querySelector(".view.active .exam-section.focused-section h2")?.textContent?.trim() || "";
  const title = item?.title || item?.type || activePanel || viewDisplayName(view);
  const source = [item?.source, item?.period].filter(Boolean).join(" · ");
  const singleMode = view === "single" && moduleName ? singleModeLabel(moduleName) : "";
  const fallbackReadingQuestion = moduleName === "reading"
    ? Number(document.querySelector(".reading-mobile-workspace")?.dataset.focusedQuestion || 0)
    : 0;
  const focusedQuestion = state.coach.focusQuestion?.module === moduleName
    ? state.coach.focusQuestion
    : fallbackReadingQuestion
      ? { module: "reading", number: fallbackReadingQuestion, id: `q${fallbackReadingQuestion}` }
      : null;
  const surface = {
    view,
    viewLabel: viewDisplayName(view),
    module: moduleName,
    moduleLabel: moduleName ? moduleDisplayName(moduleName) : "",
    title,
    source,
    mode: singleMode ? `${document.body.dataset.immersiveScope || (view === "single" && !state.singleStarted ? "single-launch" : view)} · ${singleMode}` : document.body.dataset.immersiveScope || (view === "single" && !state.singleStarted ? "single-launch" : view),
    isImmersive: document.body.classList.contains("immersive-mode"),
    answerCount: view === "single" ? answeredCountForPrefix("single") : 0,
    focusedQuestion,
    binding,
    path: location.hash || "#home",
    ...(extra || {}),
  };
  if (view === "bank") surface.title = state.activeSpeakingTopic?.title || "Speaking topic bank";
  if (view === "vocabulary") surface.title = "Vocabulary trainer";
  if (view === "mine") surface.title = "Account, drafts, vocabulary and membership";
  if (view === "home") surface.title = "Dashboard and today's AI practice plan";
  Object.assign(surface, state.help.surfaceOverride || {});
  return surface;
}

function coachSurfaceSummary(surface = currentCoachSurface()) {
  const parts = [
    surface.viewLabel || "IELTS-ist",
    surface.moduleLabel || "",
    surface.title || "",
    surface.source || "",
  ].filter(Boolean);
  return compactText(parts.join(" · "), 140);
}

function currentReadingContext() {
  const view = activeViewId();
  const helpModule = currentHelpModule();
  let item = null;
  let prefix = "";
  if (view === "single" && state.activeModule === "reading") {
    item = state.activeSingle;
    prefix = "single";
  } else if (view === "exam" && helpModule === "reading" && state.exam?.reading) {
    item = state.exam.reading;
    prefix = "exam-reading";
  } else if (view === "sequence" && helpModule === "reading" && state.sequence?.reading) {
    item = state.sequence.reading;
    prefix = "sequence-reading";
  }
  if (!item) return null;
  const reading = normalizeItem(item);
  const answers = collectAnswers(prefix);
  const questions = (reading.questions || []).map((question, index) => {
    const number = questionNumber(question, index);
    return {
      number,
      id: question.id || `q${number}`,
      question: String(question.text || `Question ${number}`).slice(0, 260),
      expectedAnswer: String(question.answer || "").slice(0, 120),
      studentAnswer: String(answers[question.id] || "").slice(0, 120),
    };
  });
  const paperText = [
    reading.readingPaper,
    reading.passage,
    reading.prompt,
  ].filter(Boolean).join("\n\n");
  return {
    module: "reading",
    mode: view || "unknown",
    answerPrefix: prefix,
    id: reading.id || "",
    title: reading.title || "",
    source: reading.source || "",
    period: reading.period || "",
    questions,
    paperText: compactText(paperText, 18000),
  };
}

function currentListeningContext() {
  const view = activeViewId();
  const helpModule = currentHelpModule();
  let item = null;
  let prefix = "";
  if (view === "single" && state.activeModule === "listening") {
    item = state.activeSingle;
    prefix = "single";
  } else if (view === "exam" && helpModule === "listening" && state.exam?.listening) {
    item = state.exam.listening;
    prefix = "exam-listening";
  } else if (view === "sequence" && helpModule === "listening" && state.sequence?.listening) {
    item = state.sequence.listening;
    prefix = "sequence-listening";
  }
  if (!item) return null;
  const listening = normalizeItem(item);
  const answers = collectAnswers(prefix);
  const activeSection = state.listeningCaptionState[prefix]?.section || "";
  const scriptPayload = listeningCaptionPayload(prefix);
  const selectedScript = scriptPayload ? listeningCaptionSection(scriptPayload, activeSection) : null;
  const activeAudio = activeSection
    ? document.querySelector(`.listening-player[data-prefix="${prefix}"][data-section="${activeSection}"]`)
    : document.querySelector(`.listening-player[data-prefix="${prefix}"]`);
  const questions = (listening.questions || []).map((question, index) => {
    const number = questionNumber(question, index);
    return {
      number,
      id: question.id || `q${number}`,
      question: String(question.text || `Question ${number}`).slice(0, 260),
      expectedAnswer: String(question.answer || "").slice(0, 120),
      studentAnswer: String(answers[question.id] || "").slice(0, 120),
    };
  });
  return {
    module: "listening",
    mode: view || "unknown",
    answerPrefix: prefix,
    id: listening.id || "",
    title: listening.title || "",
    source: listening.source || "",
    period: listening.period || "",
    activeSection: String(activeSection || ""),
    audioTime: Number.isFinite(Number(activeAudio?.currentTime)) ? Math.round(Number(activeAudio.currentTime) * 10) / 10 : null,
    questions,
    questionPaper: compactText([listening.questionPaper, listening.transcript, listening.prompt].filter(Boolean).join("\n\n"), 16000),
    audioScript: compactText(selectedScript?.text || scriptPayload?.text || "", 16000),
  };
}

function buildHelpContext(extra = {}) {
  const view = activeViewId();
  const helpModule = currentHelpModule();
  const currentReading = currentReadingContext();
  const currentListening = currentListeningContext();
  const surface = currentCoachSurface();
  const context = {
    ...(extra || {}),
    activeView: view,
    activeModule: helpModule,
    surface,
    reading: currentReading || extra?.reading || null,
    listening: currentListening || extra?.listening || null,
  };
  return JSON.parse(JSON.stringify(context, (_key, value) => {
    if (typeof value === "string") return value.slice(0, 20000);
    return value;
  }));
}

function resolveAudioUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
  return `/audio/${encodeURIComponent(value)}`;
}

function playAudioUrl(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = resolve;
    audio.onerror = reject;
    audio.play().catch(reject);
  });
}

function speakWithBrowser(text, voice = "examiner") {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = voice === "candidateB" ? 0.88 : 0.94;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((item) =>
      voice === "candidateA"
        ? /female|zira|susan|aria/i.test(item.name)
        : voice === "candidateB"
          ? /male|david|mark|guy/i.test(item.name)
          : /zira|aria|jenny|english/i.test(item.name),
    );
    if (preferred) utterance.voice = preferred;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

async function speakText(text, voice = "examiner") {
  const clean = String(text || "").replace(/^(receptionist|student|coordinator|examiner|candidate)\s*:\s*/i, "").trim();
  if (!clean) return;
  try {
    const json = await postJson("/api/tts", { text: clean, voice });
    if (json.audio) {
      await playAudioUrl(json.audio);
      return;
    }
  } catch {
    // Fall back to browser speech synthesis.
  }
  await speakWithBrowser(clean, voice);
}

function splitDialogue(text) {
  const raw = String(text || "").trim();
  const matches = [...raw.matchAll(/(?:^|\s)([A-Z][A-Za-z ]{1,28}):\s*([^:]+?)(?=(?:\s+[A-Z][A-Za-z ]{1,28}:)|$)/g)];
  if (!matches.length) return [{ voice: "narrator", text: raw }];
  return matches.map((match, index) => ({
    role: match[1].trim(),
    voice: index % 2 === 0 ? "candidateA" : "candidateB",
    text: match[2].trim(),
  }));
}

async function playTranscript(text) {
  const segments = splitDialogue(text);
  for (const segment of segments) {
    await speakText(segment.text, segment.voice);
  }
}

function renderTaskVisual(item) {
  const visual = item.visual;
  if (!visual) return item.data ? `<pre class="task-data">${item.data}</pre>` : "";
  if (visual.kind === "line") return renderLineChart(visual);
  if (visual.kind === "bar") return renderBarChart(visual);
  if (visual.kind === "map") return renderCampusMap(visual);
  return "";
}

function renderLineChart(visual) {
  const width = 620;
  const height = 310;
  const pad = 48;
  const max = Math.max(...visual.series.flatMap((s) => s.values), 70);
  const colors = ["#176b87", "#d96c2c", "#4b8b3b", "#6b5fb5"];
  const x = (i) => pad + (i * (width - pad * 2)) / (visual.labels.length - 1);
  const y = (v) => height - pad - (v / max) * (height - pad * 2);
  const lines = visual.series
    .map((s, si) => {
      const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      const dots = s.values
        .map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${colors[si]}"><title>${s.name}: ${v}${visual.unit}</title></circle>`)
        .join("");
      return `<polyline points="${points}" fill="none" stroke="${colors[si]}" stroke-width="3"/>${dots}`;
    })
    .join("");
  const labels = visual.labels.map((label, i) => `<text x="${x(i)}" y="${height - 16}" text-anchor="middle">${label}</text>`).join("");
  const legend = visual.series
    .map((s, i) => `<span><i style="background:${colors[i]}"></i>${s.name}</span>`)
    .join("");
  return `<figure class="task-visual"><figcaption>${visual.title}</figcaption><svg viewBox="0 0 ${width} ${height}" role="img">
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#9aa6b2"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#9aa6b2"/>
    ${[0, 20, 40, 60].map((v) => `<text x="12" y="${y(v) + 4}">${v}${visual.unit}</text><line x1="${pad}" y1="${y(v)}" x2="${width - pad}" y2="${y(v)}" stroke="#e4e9ef"/>`).join("")}
    ${lines}${labels}
  </svg><div class="legend">${legend}</div></figure>`;
}

function renderBarChart(visual) {
  const colors = ["#176b87", "#d96c2c", "#4b8b3b", "#6b5fb5"];
  return `<figure class="task-visual"><figcaption>${visual.title}</figcaption><div class="bar-chart">
    ${visual.labels
      .map((label, cityIndex) => `<div class="bar-group"><strong>${label}</strong>${visual.series
        .map((s, si) => `<div class="bar-row"><span>${s.name}</span><div class="bar-track"><i style="width:${s.values[cityIndex]}%;background:${colors[si]}"></i></div><em>${s.values[cityIndex]}${visual.unit}</em></div>`)
        .join("")}</div>`)
      .join("")}
  </div></figure>`;
}

function renderCampusMap(visual) {
  return `<figure class="task-visual"><figcaption>${visual.title}</figcaption><div class="map-pair">
    <svg viewBox="0 0 300 220" role="img" aria-label="Campus map in 2005">
      <text x="150" y="22" text-anchor="middle">2005</text>
      <rect x="28" y="42" width="112" height="54" class="map-building"/><text x="84" y="73" text-anchor="middle">Teaching blocks</text>
      <rect x="158" y="42" width="112" height="54" class="map-library"/><text x="214" y="73" text-anchor="middle">Library</text>
      <rect x="166" y="116" width="92" height="58" class="map-car"/><text x="212" y="149" text-anchor="middle">Car park</text>
      <rect x="34" y="120" width="112" height="64" class="map-field"/><text x="90" y="155" text-anchor="middle">Sports field</text>
    </svg>
    <svg viewBox="0 0 300 220" role="img" aria-label="Campus map at present">
      <text x="150" y="22" text-anchor="middle">Present day</text>
      <rect x="26" y="42" width="126" height="58" class="map-library"/><text x="89" y="68" text-anchor="middle">Library +</text><text x="89" y="84" text-anchor="middle">study centre</text>
      <rect x="168" y="42" width="94" height="58" class="map-science"/><text x="215" y="75" text-anchor="middle">Science</text>
      <rect x="104" y="112" width="74" height="44" class="map-cafe"/><text x="141" y="139" text-anchor="middle">Cafe</text>
      <rect x="42" y="154" width="204" height="42" class="map-field"/><text x="144" y="180" text-anchor="middle">Reduced sports field</text>
    </svg>
  </div></figure>`;
}

function annotationKeyForImage(image, page, index) {
  return `${image.url || ""}|${page || index + 1}`;
}

function renderAnnotationCanvas(image, page, index) {
  return `<canvas class="pdf-annotation-canvas" data-annotation-key="${escapeHtml(annotationKeyForImage(image, page, index))}" aria-hidden="true"></canvas>`;
}

function renderPageImages(images, label) {
  if (!Array.isArray(images) || !images.length) return "";
  const orderedImages = uniqueOrderedImages(images);
  return `<div class="pdf-pages"><div class="pdf-page-list">${orderedImages
    .map((image, index) => {
      const page = image.page || index + 1;
      const url = escapeHtml(image.url || "");
      if (!url) return "";
      return `<figure class="pdf-page" data-pdf-page="${escapeHtml(page)}">
        <figcaption>Page ${escapeHtml(page)} (${index + 1}/${orderedImages.length})</figcaption>
        <div class="pdf-page-body pdf-page-image-wrap">
          <img src="${url}" alt="${escapeHtml(label)} page ${escapeHtml(page)}" loading="${index === 0 ? "eager" : "lazy"}" />
          ${renderAnnotationCanvas(image, page, index)}
        </div>
      </figure>`;
    })
    .join("")}</div></div>`;
}

function renderPageImagesWithAnswers(images, label, prefix, questions, paper, options = {}) {
  if (!Array.isArray(images) || !images.length) return "";
  const orderedImages = filteredPaperImagesForLabel(uniqueOrderedImages(images), label, paper);
  if (!orderedImages.length) return "";
  const assignments = assignQuestionsToPages(orderedImages, questions, paper);
  const audioUrls = options.audioUrls || [];
  const answerPanel = renderPaperAnswerPanel(prefix, questions, assignments, label, audioUrls);
  return `<div class="pdf-pages">
    <div class="pdf-study-layout">
      <section class="pdf-scroll-box" aria-label="${escapeHtml(label)}">
        <div class="pdf-page-list">${orderedImages
          .map((image, index) => {
            const page = image.page || index + 1;
            const url = escapeHtml(image.url || "");
            if (!url) return "";
            return `<figure class="pdf-page">
              <figcaption>Page ${escapeHtml(page)} (${index + 1}/${orderedImages.length})</figcaption>
              <div class="pdf-page-body">
                <img src="${url}" alt="${escapeHtml(label)} page ${escapeHtml(page)}" loading="${index === 0 ? "eager" : "lazy"}" />
                ${renderAnnotationCanvas(image, page, index)}
              </div>
            </figure>`;
          })
          .join("")}</div>
      </section>
      ${answerPanel}
    </div>
  </div>`;
}

function readAnnotations() {
  try {
    return JSON.parse(localStorage.getItem(annotationStoreKey) || "{}");
  } catch {
    return {};
  }
}

function writeAnnotations(value) {
  localStorage.setItem(annotationStoreKey, JSON.stringify(value));
}

function setAnnotationMode(enabled, erasing = false) {
  if (state.annotation.saveTimer) {
    window.clearTimeout(state.annotation.saveTimer);
    state.annotation.saveTimer = null;
  }
  if (state.annotation.drawing && state.annotation.activeCanvas) {
    saveAnnotationCanvas(state.annotation.activeCanvas);
  }
  state.annotation.enabled = enabled;
  state.annotation.erasing = enabled && erasing;
  state.annotation.drawing = false;
  state.annotation.activeCanvas = null;
  state.annotation.pointers.clear();
  state.annotation.pointerPositions.clear();
  state.annotation.scrollTarget = null;
  document.body.classList.toggle("annotation-enabled", state.annotation.enabled);
  document.body.classList.toggle("annotation-erasing", state.annotation.erasing);
  const draw = $("toggleAnnotation");
  const erase = $("toggleEraser");
  const drawingActive = state.annotation.enabled && !state.annotation.erasing;
  if (draw) {
    draw.classList.toggle("active", drawingActive);
    draw.setAttribute("aria-pressed", drawingActive ? "true" : "false");
    draw.textContent = drawingActive ? "Drawing" : "Draw";
    draw.title = drawingActive ? "Draw mode is on" : "Turn on Draw mode";
  }
  if (erase) {
    erase.classList.toggle("active", state.annotation.erasing);
    erase.setAttribute("aria-pressed", state.annotation.erasing ? "true" : "false");
    erase.textContent = state.annotation.erasing ? "Erasing" : "Erase";
    erase.title = state.annotation.erasing ? "Erase mode is on" : "Turn on Erase mode";
  }
}

function isAnnotationPracticeContext() {
  const scope = document.body.dataset.immersiveScope || "";
  const moduleName = document.body.dataset.immersiveModule || "";
  if (!["listening", "reading", "writing"].includes(moduleName)) return false;
  const viewId = activeViewId();
  if (scope === "single") return viewId === "single" && Boolean(state.singleStarted);
  if (scope === "exam") return ["exam", "sequence"].includes(viewId) && Boolean(document.querySelector(".exam-section.focused-section"));
  return false;
}

function updateAnnotationToolbarAvailability() {
  const canvases = [...document.querySelectorAll(".pdf-annotation-canvas")];
  const visibleCanvas = canvases.some((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && canvas.closest(".view.active, .exam-section.focused-section");
  });
  const available = visibleCanvas && isAnnotationPracticeContext();
  const toolbar = $("annotationToolbar");
  const scope = document.body.dataset.immersiveScope || "";
  const toolbarHost = scope === "single"
    ? document.querySelector("#single > .view-head")
    : scope === "exam"
      ? document.querySelector(".view.active .exam-quick-nav")
      : null;
  if (toolbar && available && toolbarHost) {
    const firstControl = [...toolbarHost.children].find((child) => child !== toolbar) || null;
    if (toolbar.parentElement !== toolbarHost || toolbar.previousElementSibling) {
      toolbarHost.insertBefore(toolbar, firstControl);
    }
  } else if (toolbar && !available && toolbar.parentElement !== document.body) {
    document.body.append(toolbar);
  }
  document.body.classList.toggle("has-pdf-pages", canvases.length > 0);
  document.body.classList.toggle("annotation-toolbar-available", available);
  if (!available && state.annotation.enabled) setAnnotationMode(false);
}

function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function nearestPdfScrollTarget(canvas) {
  return canvas.closest(".pdf-scroll-box, .exam-left-pane, #singleContent, main") || document.scrollingElement || document.documentElement;
}

function averagePointerY() {
  const points = [...state.annotation.pointerPositions.values()];
  if (!points.length) return 0;
  return points.reduce((sum, point) => sum + point.y, 0) / points.length;
}

function beginAnnotationMultiTouch(canvas) {
  state.annotation.drawing = false;
  state.annotation.activeCanvas = null;
  state.annotation.pointers.forEach((pointerId) => {
    try {
      if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    } catch {
      // Ignore release failures from browsers that already released the pointer.
    }
  });
  state.annotation.scrollTarget = nearestPdfScrollTarget(canvas);
  state.annotation.lastMultiTouchY = averagePointerY();
}

function scrollAnnotationMultiTouch() {
  if (state.annotation.pointerPositions.size < 2) return;
  const target = state.annotation.scrollTarget || document.scrollingElement || document.documentElement;
  const nextY = averagePointerY();
  const dy = state.annotation.lastMultiTouchY - nextY;
  if (Number.isFinite(dy) && Math.abs(dy) > 1.5) target.scrollTop += dy;
  state.annotation.lastMultiTouchY = nextY;
}

function saveAnnotationCanvas(canvas) {
  const key = canvas.dataset.annotationKey;
  if (!key) return;
  const map = readAnnotations();
  map[key] = canvas.toDataURL("image/png");
  writeAnnotations(map);
}

function scheduleAnnotationCanvasSave(canvas, delay = 350) {
  if (!canvas) return;
  if (state.annotation.saveTimer) window.clearTimeout(state.annotation.saveTimer);
  state.annotation.saveTimer = window.setTimeout(() => {
    state.annotation.saveTimer = null;
    if (canvas.isConnected) saveAnnotationCanvas(canvas);
  }, Math.max(0, delay));
}

function restoreAnnotationCanvas(canvas) {
  const key = canvas.dataset.annotationKey;
  const dataUrl = key ? readAnnotations()[key] : "";
  if (!dataUrl) return;
  const image = new Image();
  image.onload = () => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  };
  image.src = dataUrl;
}

function resizeAnnotationCanvas(canvas, img) {
  const width = Math.max(1, Math.round(img.clientWidth * (window.devicePixelRatio || 1)));
  const height = Math.max(1, Math.round(img.clientHeight * (window.devicePixelRatio || 1)));
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  restoreAnnotationCanvas(canvas);
}

function bindPdfAnnotations() {
  const canvases = [...document.querySelectorAll(".pdf-annotation-canvas")];
  canvases.forEach((canvas) => {
    const img = canvas.parentElement?.querySelector("img");
    if (!img || canvas.dataset.bound === "1") return;
    canvas.dataset.bound = "1";
    const sync = () => {
      resizeAnnotationCanvas(canvas, img);
      updateAnnotationToolbarAvailability();
    };
    if (img.complete) sync();
    else img.addEventListener("load", sync, { once: true });
    window.setTimeout(sync, 50);
    canvas.addEventListener("pointerdown", (event) => {
      if (!state.annotation.enabled) return;
      state.annotation.pointers.add(event.pointerId);
      state.annotation.pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (state.annotation.pointers.size > 1) {
        beginAnnotationMultiTouch(canvas);
        return;
      }
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      resizeAnnotationCanvas(canvas, img);
      state.annotation.activeCanvas = canvas;
      state.annotation.drawing = true;
      const point = canvasPoint(event, canvas);
      state.annotation.lastX = point.x;
      state.annotation.lastY = point.y;
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!state.annotation.enabled) return;
      if (state.annotation.pointers.has(event.pointerId)) {
        state.annotation.pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (state.annotation.pointers.size > 1) {
        scrollAnnotationMultiTouch();
        return;
      }
      if (!state.annotation.drawing || state.annotation.activeCanvas !== canvas) return;
      event.preventDefault();
      const point = canvasPoint(event, canvas);
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (state.annotation.erasing) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = 28 * (window.devicePixelRatio || 1);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "#e4482e";
        ctx.lineWidth = Math.max(2, 3 + Number(event.pressure || 0.35) * 5) * (window.devicePixelRatio || 1);
      }
      ctx.beginPath();
      ctx.moveTo(state.annotation.lastX, state.annotation.lastY);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
      state.annotation.lastX = point.x;
      state.annotation.lastY = point.y;
      scheduleAnnotationCanvasSave(canvas);
    });
    const endDrawing = (event) => {
      state.annotation.pointers.delete(event.pointerId);
      state.annotation.pointerPositions.delete(event.pointerId);
      if (state.annotation.pointers.size >= 2) {
        state.annotation.lastMultiTouchY = averagePointerY();
        return;
      }
      if (state.annotation.pointers.size === 1) {
        state.annotation.drawing = false;
        state.annotation.activeCanvas = null;
        state.annotation.scrollTarget = null;
        return;
      }
      const shouldSave = state.annotation.drawing && state.annotation.activeCanvas === canvas;
      state.annotation.drawing = false;
      state.annotation.activeCanvas = null;
      state.annotation.scrollTarget = null;
      if (shouldSave) scheduleAnnotationCanvasSave(canvas, 0);
    };
    canvas.addEventListener("pointerup", endDrawing);
    canvas.addEventListener("pointercancel", endDrawing);
    canvas.addEventListener("pointerleave", endDrawing);
  });
  updateAnnotationToolbarAvailability();
}

function clearVisibleAnnotationPage() {
  const canvases = [...document.querySelectorAll(".pdf-annotation-canvas")];
  if (!canvases.length) return;
  const visibleKeys = new Set();
  canvases.forEach((canvas) => {
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    if (canvas.dataset.annotationKey) visibleKeys.add(canvas.dataset.annotationKey);
  });
  const map = readAnnotations();
  visibleKeys.forEach((key) => delete map[key]);
  writeAnnotations(map);
}

function clearAllAnnotationPages() {
  clearVisibleAnnotationPage();
}

function readingQuestionStartLine(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim());
  return lines.findIndex((line) => /^Questions?\s+\d{1,2}\b/i.test(line));
}

function readingPassageStartLine(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim());
  return lines.findIndex((line) => /^READING PASSAGE\s+\d\b/i.test(line));
}

function hasPassageTextBeforeQuestion(text, questionLineIndex) {
  if (questionLineIndex <= 3) return false;
  const lines = String(text || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const before = lines.slice(0, questionLineIndex).join(" ");
  return before.length > 180 && !/^Test\s+\d+\s+Reading/i.test(before);
}

function splitReadingPageImages(images, paper, provided = {}) {
  const providedPassages = uniqueOrderedImages(provided.passageImages || []);
  const providedQuestions = uniqueOrderedImages(provided.questionImages || []);
  if (providedPassages.length || providedQuestions.length) {
    return {
      passageImages: providedPassages,
      questionImages: providedQuestions,
    };
  }
  const orderedImages = filteredPaperImagesForLabel(uniqueOrderedImages(images), "Reading", paper);
  const pages = parsePaperPages(paper);
  const passageImages = [];
  const questionImages = [];

  for (const image of orderedImages) {
    const page = image.page || orderedImages.indexOf(image) + 1;
    const pageText = pages.get(page) || "";
    const questionLine = readingQuestionStartLine(pageText);
    const passageLine = readingPassageStartLine(pageText);
    const hasQuestions = questionLine >= 0;
    const hasPassageStart = passageLine >= 0;
    const hasPassageContinuation = !hasQuestions || hasPassageTextBeforeQuestion(pageText, questionLine);

    if (hasPassageStart || hasPassageContinuation) passageImages.push(image);
    if (hasQuestions) questionImages.push(image);
  }

  return {
    passageImages: passageImages.length ? passageImages : orderedImages,
    questionImages,
  };
}

function renderReadingQuestionNav(questions = []) {
  return `<nav class="reading-question-nav" aria-label="Reading question navigation">
    ${(questions || []).map((question, index) => {
      const number = questionNumber(question, index);
      const marked = Boolean(state.readingReviewMarks?.[question.id]);
      return `<button type="button" data-reading-question-nav="${number}" class="${marked ? "marked" : ""}" aria-label="Go to question ${number}">${number}</button>`;
    }).join("")}
  </nav>`;
}

function readingPassagePageByQuestion(passageImages, paper, providedStarts = {}) {
  const orderedImages = uniqueOrderedImages(passageImages || []);
  const pageTexts = parsePaperPages(paper);
  const passageStarts = new Map(
    Object.entries(providedStarts || {})
      .map(([passage, page]) => [Number(passage), Number(page)])
      .filter(([passage, page]) => passage >= 1 && passage <= 3 && Number.isFinite(page)),
  );
  for (const image of orderedImages) {
    const page = Number(image.page || 0);
    const passage = Number(String(pageTexts.get(page) || "").match(/^\s*READING PASSAGE\s+([123])\b/im)?.[1] || 0);
    if (passage && !passageStarts.has(passage)) passageStarts.set(passage, page);
  }
  if (orderedImages.length && !passageStarts.has(1)) {
    passageStarts.set(1, Number(orderedImages[0].page || 1));
  }
  const byQuestion = new Map();
  for (let number = 1; number <= 40; number += 1) {
    const passage = number <= 13 ? 1 : number <= 26 ? 2 : 3;
    if (passageStarts.has(passage)) byQuestion.set(number, passageStarts.get(passage));
  }
  return byQuestion;
}

function renderReadingSplitPages(images, prefix, questions, paper, provided = {}) {
  const { passageImages, questionImages } = splitReadingPageImages(images, paper, provided);
  const passagePageByQuestion = readingPassagePageByQuestion(passageImages, paper, provided.passageStartPages);
  const activePane = ["passage", "questions"].includes(state.readingMobilePane) ? state.readingMobilePane : "passage";
  const focusedQuestion = state.coach.focusQuestion?.module === "reading"
    ? state.coach.focusQuestion.number
    : questionNumber(questions?.[0], 0);
  const questionPaperHtml = questionImages.length
    ? renderPageImages(questionImages, "Reading question PDF")
    : `<section class="reading-question-fallback"><p>Question paper text is unavailable.</p></section>`;
  const questionAssignments = assignQuestionsToPages(questionImages, questions, paper);
  const answerPanelHtml = renderPaperAnswerPanel(prefix, questions, questionAssignments, "Reading question PDF", [], {
    scrollKey: "answers",
    passagePageByQuestion,
  });
  return `<div class="reading-mobile-workspace" data-reading-pane="${escapeHtml(activePane)}" data-focused-question="${escapeHtml(focusedQuestion || "")}">
    <nav class="reading-pane-tabs" aria-label="Reading workspace">
      ${["passage", "questions"].map((pane) => `<button class="${pane === activePane ? "active" : ""}" type="button" data-reading-pane-target="${pane}">${pane.slice(0, 1).toUpperCase()}${pane.slice(1)}</button>`).join("")}
    </nav>
    <div class="reading-question-rail-layout reading-question-top-layout">
      ${renderReadingQuestionNav(questions)}
      <div class="reading-split">
        <section class="reading-pane reading-passage-pane" data-reading-pane-content="passage" data-reading-scroll-pane="passage">
          ${renderPageImages(passageImages, "Reading passage PDF")}
        </section>
        <div class="reading-split-divider" role="separator" aria-label="Resize passage and questions" aria-orientation="vertical" tabindex="0"></div>
        <section class="reading-pane reading-question-pane" data-reading-pane-content="questions">
          <div class="reading-question-paper" data-reading-scroll-pane="questionPaper">${questionPaperHtml}</div>
          <section class="reading-inline-answers" aria-label="Reading questions and answers">
            <header><strong>Questions and answers</strong><span>Choose an answer, mark review, or ask AI Coach for evidence.</span></header>
            ${answerPanelHtml}
          </section>
        </section>
      </div>
    </div>
  </div>`;
}

function renderListening(test, prefix = "single") {
  const item = normalizeItem(test);
  const sourceItemId = practiceUnitBaseId(item);
  const audioUrl = resolveAudioUrl(item.audioUrl);
  const audioUrls = Array.isArray(item.audioUrls) ? item.audioUrls.map((url) => url ? resolveAudioUrl(url) : "") : [];
  const transcript = item.transcript || item.prompt || "";
  const sourceLink = item.sourceUrl ? `<a class="source-inline" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Open source page</a>` : "";
  const pageImageUrls = Array.isArray(item.questionPageImages) ? item.questionPageImages.map((image) => image?.url).filter(Boolean) : [];
  const hasPdfImages = Boolean(item.questionPageImages?.length);
  const practiceMode = listeningModeForPrefix(prefix);
  const playback = listeningPlaybackRecord(prefix);
  if (playback.itemId !== item.id || playback.mode !== practiceMode) {
    state.listeningPlayback[prefix] = { status: "ready", section: "", endedSections: {}, reviewStarted: false, itemId: item.id || "", mode: practiceMode };
  }
  const activeSection = prefix === "single" && item.practiceScope === "section"
    ? Number(item.practiceSection) || state.singlePracticeSections.listening
    : prefix === "single" && practiceMode === "training" && !item.practiceScope
      ? state.singlePracticeSections.listening
      : "";
  const playbackRule = listeningPlaybackRule(practiceMode);
  const playbackActions = !audioUrls.length && !audioUrl
    ? `<button class="secondary play-audio" data-text="${encodeURIComponent(transcript)}">Play listening</button>`
    : "";
  const questionPaper = hasPdfImages
    ? renderPageImagesWithAnswers(item.questionPageImages, "Listening question PDF", prefix, item.questions, item.questionPaper, { audioUrls })
    : item.questionPaper
      ? `<details class="question-paper" open><summary>Listening OCR text</summary><pre>${escapeHtml(item.questionPaper)}</pre></details>`
      : `<div class="notice">This listening set has not been extracted from the PDF yet. Open the local PDF and answer directly.</div>`;
  return `
    <div class="listening-study" id="${escapeHtml(prefix)}-listening-studio" data-listening-prefix="${escapeHtml(prefix)}" data-listening-mode="${escapeHtml(practiceMode)}" data-listening-id="${escapeHtml(sourceItemId)}" data-practice-unit-id="${escapeHtml(item.id || "")}" data-page-images="${escapeHtml(encodeURIComponent(JSON.stringify(pageImageUrls)))}">
      <div class="listening-main">
        <div class="listening-head-row">
          <div class="module-meta">${[item.source, item.period || "", `${item.minutes || 30} min`].filter(Boolean).join(" · ")} ${sourceLink}</div>
        </div>
        <section class="listening-playback-status" data-listening-status data-prefix="${escapeHtml(prefix)}" data-section="${escapeHtml(activeSection)}" aria-live="polite">
          <div>
            <span data-listening-state>Ready to play</span>
            <strong data-listening-progress>${escapeHtml(listeningProgressLabel(prefix, activeSection, item.questions))}</strong>
          </div>
          <p>${escapeHtml(playbackRule.summary)}</p>
          <button class="primary small-button" type="button" data-listening-start data-prefix="${escapeHtml(prefix)}" data-section="${escapeHtml(activeSection)}">Start listening</button>
        </section>
        ${
          hasPdfImages && audioUrls.length
            ? ""
            : audioUrls.length
              ? `<div class="audio-list">${audioUrls
                  .map((url, index) => `<label>Section ${index + 1}<audio class="listening-player" controls preload="none" data-prefix="${escapeHtml(prefix)}" data-section="${index + 1}" src="${url}"></audio></label>`)
                .join("")}</div>`
              : audioUrl
                ? `<audio class="listening-player" controls preload="none" data-prefix="${escapeHtml(prefix)}" src="${audioUrl}"></audio>`
                : ""
        }
        ${playbackActions ? `<div class="actions">${playbackActions}</div>` : ""}
        ${questionPaper}
        ${item.questionPageImages?.length ? "" : renderQuestionInputs(prefix, item.questions)}
      </div>
    </div>
  `;
}

function listeningModeForPrefix(prefix = "single") {
  if (prefix === "single") return currentSinglePracticeMode("listening");
  return "exam";
}

function listeningPlaybackRule(mode = "exam") {
  if (mode === "training") return { canPause: true, canSeek: true, captions: true, summary: "Training: pause, replay and captions are available." };
  if (mode === "review") return { canPause: true, canSeek: true, captions: true, summary: "Review: replay the evidence, inspect captions and retest mistakes." };
  return { canPause: false, canSeek: false, captions: false, summary: "Exam: audio plays once; pause, replay and captions are unavailable." };
}

function listeningProgressLabel(prefix, section = "", questions = []) {
  const answers = collectAnswers(prefix);
  const sectionNumber = Number(section);
  const visibleQuestions = Number.isFinite(sectionNumber) && sectionNumber > 0
    ? (questions || []).filter((question, index) => {
        const number = questionNumber(question, index);
        return number >= (sectionNumber - 1) * 10 + 1 && number <= sectionNumber * 10;
      })
    : questions || [];
  const answered = visibleQuestions.filter((question, index) => {
    const number = questionNumber(question, index);
    return String(answers[question.id || `q${number}`] || "").trim();
  }).length;
  const total = visibleQuestions.length || (sectionNumber ? 10 : 40);
  return `${sectionNumber ? `Section ${sectionNumber} · ` : ""}${answered}/${total} answered`;
}

function listeningPlaybackRecord(prefix) {
  state.listeningPlayback[prefix] ||= { status: "ready", endedSections: {}, reviewStarted: false };
  return state.listeningPlayback[prefix];
}

function setListeningPlaybackStatus(audio, status, label) {
  const prefix = audio?.dataset?.prefix || "single";
  const section = audio?.dataset?.section || "";
  const record = listeningPlaybackRecord(prefix);
  record.status = status;
  record.section = section;
  document.querySelectorAll(`[data-listening-status][data-prefix="${CSS.escape(prefix)}"]`).forEach((node) => {
    node.dataset.playbackState = status;
    if (section) node.dataset.section = section;
    const stateNode = node.querySelector("[data-listening-state]");
    if (stateNode) stateNode.textContent = label;
    const progressNode = node.querySelector("[data-listening-progress]");
    const item = prefix === "single" ? singlePracticeItemForMode("listening", state.activeSingle) : null;
    if (progressNode) progressNode.textContent = listeningProgressLabel(prefix, section, item?.questions || []);
    const start = node.querySelector("[data-listening-start]");
    if (start) {
      start.disabled = status === "playing" || status === "finished";
      start.textContent = status === "loading" ? "Loading listening" : status === "playing" ? "Listening" : status === "failed" ? "Retry listening" : status === "finished" ? "Finished" : status === "paused" ? "Continue listening" : "Start listening";
    }
  });
}

function advanceListeningExamSection(audio) {
  const prefix = audio?.dataset?.prefix || "single";
  if (listeningModeForPrefix(prefix) !== "exam") return false;
  const players = [...document.querySelectorAll(`.listening-player[data-prefix="${CSS.escape(prefix)}"][data-section]`)]
    .filter((item) => item.getAttribute("src"));
  const currentIndex = players.indexOf(audio);
  const next = currentIndex >= 0 ? players[currentIndex + 1] : null;
  if (!next) return false;
  setListeningPlaybackStatus(next, next.readyState >= 3 ? "ready" : "loading", next.readyState >= 3 ? `Section ${next.dataset.section} ready` : `Loading Section ${next.dataset.section}`);
  if (next.readyState === 0) next.load();
  Promise.resolve(next.play()).catch(() => setListeningPlaybackStatus(next, "failed", `Section ${next.dataset.section} failed`));
  return true;
}

function updateListeningProgress(prefix = "single") {
  const audio = [...document.querySelectorAll(`.listening-player[data-prefix="${CSS.escape(prefix)}"]`)].find((item) => !item.paused) || document.querySelector(`.listening-player[data-prefix="${CSS.escape(prefix)}"]`);
  if (!audio) return;
  const record = listeningPlaybackRecord(prefix);
  const labels = { loading: "Loading", ready: "Ready to play", playing: "Playing", paused: "Paused", failed: "Playback failed", finished: "Finished" };
  setListeningPlaybackStatus(audio, record.status || "ready", labels[record.status] || "Ready to play");
}

function handleListeningAnswerReviewTransition(prefix, section = "") {
  if (prefix !== "single" || state.activeModule !== "listening" || !state.singleStarted) return;
  const mode = currentSinglePracticeMode("listening");
  const record = listeningPlaybackRecord(prefix);
  if (section) record.endedSections[String(section)] = true;
  const requiredSections = mode === "training" ? [String(state.singlePracticeSections.listening)] : ["1", "2", "3", "4"];
  const complete = !section || requiredSections.every((value) => record.endedSections[value]);
  if (!complete || record.reviewStarted) return;
  record.reviewStarted = true;
  saveSingleAnswersToState();
  savePracticeSession();
  if (mode === "review") {
    setFeedback("singleFeedback", "Review audio finished. Ask AI Coach for the evidence timestamp, then retest this skill.", "singleMode", "Review complete");
    return;
  }
  window.setTimeout(() => submitSingle(), 450);
}

function listeningScriptsCacheKey(prefix, id) {
  return `${prefix}:${id || ""}`;
}

function renderListeningScriptsPayload(payload) {
  if (!payload || !payload.available || !payload.text) {
    return "";
  }
  return escapeHtml(payload.text || "");
}

function listeningCaptionPayloadMode(payload) {
  return String(payload?.mode || "").trim().toLowerCase();
}

function listeningCaptionTurns(text) {
  const clean = normalizeListeningCaptionText(text);
  if (!clean) return [];
  const pattern = new RegExp(`\\b(${listeningSpeakerTurnPattern()})\\s*:\\s*`, "g");
  const matches = [...clean.matchAll(pattern)];
  if (!matches.length) return [{ speaker: "", body: clean }];
  return matches
    .map((match, index) => {
      const next = matches[index + 1];
      return {
        speaker: String(match[1] || "").trim(),
        body: clean.slice(match.index + match[0].length, next ? next.index : clean.length).trim(),
      };
    })
    .filter((turn) => turn.body);
}

function listeningCaptionSentences(text) {
  const maxLineLength = 156;
  const wordWrapLength = 124;
  const turns = listeningCaptionTurns(text);
  if (!turns.length) return [];

  const lines = [];

  turns.forEach(({ speaker, body }) => {
    const naturalSentences = body
      .split(/(?<=[.!?])\s+(?=(?:[A-Z][a-z]|\d|\u201c|"))/g)
      .map((sentence) => normalizeListeningCaptionText(sentence))
      .filter((sentence) => sentence.length > 2);
    const sentenceCandidates = naturalSentences.length ? naturalSentences : naturalCaptionChunks(body);
    sentenceCandidates.forEach((sentence) => {
      addListeningCaptionLine(lines, sentence, speaker, maxLineLength, wordWrapLength);
    });
  });

  return lines.filter(Boolean);
}

function listeningSpeakerLabelsPattern() {
  return "Speaker\\s*\\d+|Voice\\s*\\d+|Receptionist|Student|Tutor|Lecturer|Speaker|Man|Woman|Male|Female|Customer|Assistant|Advisor|Adviser|Guide|Professor|Librarian|Interviewer|Interviewee|Manager|Employee|Coordinator|Host|Presenter|Narrator|Doctor|Patient|Teacher|Candidate|Examiner|Staff|Clerk|Agent";
}

function listeningSpeakerTurnPattern() {
  return `${listeningSpeakerLabelsPattern()}|[A-Z][A-Z]{1,24}|[A-Z][a-zA-Z'-]{1,24}`;
}

function markListeningCaptionSpeakers(text) {
  const pattern = new RegExp(`\\b(${listeningSpeakerTurnPattern()})\\s*:\\s*`, "g");
  return String(text || "").replace(pattern, (_match, speaker) => `\n${speaker}: `);
}

function normalizeListeningCaptionText(text) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=[A-Za-z0-9])/g, "$1 ")
    .replace(/\s+'/g, "'")
    .replace(/'\s+/g, "'")
    .replace(/\bi\s/g, "I ")
    .trim();
  if (!clean) return "";
  if (/[.!?]$/.test(clean) || /[:;,]$/.test(clean) || /\b(?:Mr|Mrs|Ms|Dr|St)\.$/i.test(clean)) return clean;
  return clean;
}

function naturalCaptionChunks(text) {
  const clean = normalizeListeningCaptionText(text);
  if (!clean) return [];
  if (/[.!?]/.test(clean)) return [clean];
  const chunks = [];
  const words = clean.replace(/[.]$/, "").split(/\s+/).filter(Boolean);
  let line = "";
  const softBreakWords = new Set(["and", "but", "because", "so", "then", "while", "although", "however", "therefore", "which", "where"]);
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z]/g, "");
    const candidate = (line + " " + word).trim();
    const shouldBreakBefore = line.length >= 58 && softBreakWords.has(lower);
    const shouldBreakByLength = candidate.length > 104;
    if (line && (shouldBreakBefore || shouldBreakByLength)) {
      chunks.push(normalizeListeningCaptionText(line));
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) chunks.push(normalizeListeningCaptionText(line));
  return chunks.length ? chunks : [clean];
}

function captionLineWithSpeaker(speaker, line) {
  const text = punctuateCaptionLine(line);
  return speaker ? `${speaker}: ${text}` : text;
}

function punctuateCaptionLine(line) {
  const clean = normalizeListeningCaptionText(line);
  if (!clean) return "";
  if (/[.!?]$/.test(clean) || /[:;,]$/.test(clean) || /\b(?:Mr|Mrs|Ms|Dr|St)\.$/i.test(clean)) return clean;
  if (clean.length >= 18 && /[A-Za-z]$/.test(clean)) return `${clean}.`;
  return clean;
}

function addListeningCaptionLine(lines, sentence, speaker, maxLineLength, wordWrapLength) {
  const cleanSentence = normalizeListeningCaptionText(sentence);
  const lineLimit = speaker ? Math.max(70, maxLineLength - speaker.length - 2) : maxLineLength;
  if (cleanSentence.length <= lineLimit) {
    lines.push(captionLineWithSpeaker(speaker, cleanSentence));
    return;
  }

  const chunks = cleanSentence
    .split(/(?<=[,;:])\s+|(?=\b(?:and|but|because|while|although|however|therefore|so|then)\b)/i)
    .map((chunk) => normalizeListeningCaptionText(chunk))
    .filter(Boolean);
  let line = "";
  for (const chunk of chunks.length ? chunks : [cleanSentence]) {
    const candidate = (line + " " + chunk).trim();
    if (candidate.length <= lineLimit) {
      line = candidate;
    } else {
      if (line) lines.push(captionLineWithSpeaker(speaker, normalizeListeningCaptionText(line)));
      if (chunk.length <= lineLimit) {
        line = chunk;
      } else {
        const words = chunk.split(/\s+/);
        line = "";
        for (const word of words) {
          if ((line + " " + word).trim().length > wordWrapLength) {
            if (line) lines.push(captionLineWithSpeaker(speaker, normalizeListeningCaptionText(line)));
            line = word;
          } else {
            line = (line + " " + word).trim();
          }
        }
      }
    }
  }
  if (line) lines.push(captionLineWithSpeaker(speaker, normalizeListeningCaptionText(line)));
}

function listeningCaptionSpeaker(sentence) {
  const match = String(sentence || "").match(/^([^:]{2,32}):\s*(.+)$/);
  if (match && !new RegExp(`^(?:${listeningSpeakerTurnPattern()})$`).test(match[1].trim())) {
    return { speaker: "", text: String(sentence || "").trim() };
  }
  return match
    ? { speaker: match[1].trim(), text: match[2].trim() }
    : { speaker: "", text: String(sentence || "").trim() };
}

function listeningCaptionVoiceScope(prefix, section = "") {
  const itemId = listeningRootItemId(prefix);
  const activeSection = section || state.listeningCaptionState[prefix]?.section || "";
  return `${prefix || "single"}::${itemId || "unknown"}::${activeSection || "all"}`;
}

function listeningCaptionSpeakerOrder(prefix, section = "") {
  const payload = listeningCaptionPayload(prefix);
  const selected = listeningCaptionSection(payload, section);
  const candidates = [
    ...(Array.isArray(selected?.sentences) ? selected.sentences.map((item) => item?.speaker) : []),
    ...(Array.isArray(selected?.timedWords) ? selected.timedWords.map((item) => item?.speaker) : []),
    ...(Array.isArray(selected?.speakers) ? selected.speakers : []),
    ...(Array.isArray(payload?.speakers) ? payload.speakers : []),
  ];
  const seen = new Set();
  return candidates
    .map((speaker) => String(speaker || "").trim())
    .filter((speaker) => {
      const key = speaker.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function assignListeningCaptionVoice(map, speaker) {
  const key = String(speaker || "").trim().toLowerCase();
  if (!key) return null;
  if (!map[key]) {
    const index = Object.keys(map).length + 1;
    map[key] = { label: String(speaker || `Voice ${index}`).trim(), className: `caption-voice-${((index - 1) % 6) + 1}`, side: index % 2 === 0 ? "right" : "left" };
  }
  return map[key];
}

function seedListeningCaptionVoices(prefix, section = "") {
  const scope = listeningCaptionVoiceScope(prefix, section);
  state.listeningCaptionVoices[scope] ||= {};
  const map = state.listeningCaptionVoices[scope];
  listeningCaptionSpeakerOrder(prefix, section).forEach((speaker) => assignListeningCaptionVoice(map, speaker));
  return map;
}

function resetListeningCaptionVoices(prefix, section = "") {
  const scopePrefix = section
    ? listeningCaptionVoiceScope(prefix, section)
    : `${prefix || "single"}::`;
  Object.keys(state.listeningCaptionVoices).forEach((scope) => {
    if (section ? scope === scopePrefix : scope.startsWith(scopePrefix)) delete state.listeningCaptionVoices[scope];
  });
}

function listeningCaptionVoice(prefix, speaker, section = "") {
  const key = String(speaker || "").trim().toLowerCase();
  if (!key) return { label: "", className: "" };
  const map = seedListeningCaptionVoices(prefix, section);
  if (!map[key]) {
    assignListeningCaptionVoice(map, speaker);
  }
  return map[key];
}

function listeningCaptionDisplayLines(prefix, sentence, section = "") {
  return String(sentence || "")
    .split(/\n+/)
    .map((line) => listeningCaptionSpeaker(line.trim()))
    .filter((line) => line.text)
    .map((line) => ({ ...line, voice: listeningCaptionVoice(prefix, line.speaker, section) }));
}

function captionDisplayLineHtml(line) {
  const voice = line.voice || { className: "", label: "", side: "left" };
  const side = voice.side === "right" ? "right" : "left";
  return `<span class="caption-display-line caption-side-${side} ${escapeHtml(voice.className || "")}">${voice.className ? `<em aria-label="${escapeHtml(voice.label)}"></em>` : ""}<span>${escapeHtml(line.text)}</span></span>`;
}

function listeningCaptionPayload(prefix) {
  const root = $(`${prefix}-listening-studio`);
  const itemId = root?.dataset.listeningId || "";
  return state.listeningScripts[listeningScriptsCacheKey(prefix, itemId)] || null;
}

function listeningRootItemId(prefix) {
  return $(`${prefix}-listening-studio`)?.dataset.listeningId || "";
}

function listeningCaptionSection(payload, section) {
  const sections = Array.isArray(payload?.sections) && payload.sections.length
    ? payload.sections
    : [{ part: null, title: payload?.mode === "audioscript" ? "Audioscript" : "OCR text", text: payload?.text || "" }];
  return sections.find((item) => String(item.part || "") === String(section || "")) || sections[0] || null;
}

function isReliableListeningCaptionPayload(payload, section = "") {
  if (!payload?.available) return false;
  const mode = listeningCaptionPayloadMode(payload);
  if (!["audioscript", "asr-cache", "transcript", "live-vad"].includes(mode)) return false;
  const selected = listeningCaptionSection(payload, section);
  return isUsableListeningCaptionSource(selected?.text || payload.text || "");
}

function listeningCaptionHeaderRoot(prefix) {
  if (String(prefix || "").startsWith("exam-listening")) return "exam";
  if (String(prefix || "").startsWith("sequence-listening")) return "sequence";
  return "single";
}

function listeningCaptionHeader(prefix) {
  const root = listeningCaptionHeaderRoot(prefix);
  return {
    bar: $(`${root}CaptionBar`),
    kicker: $(`${root}CaptionKicker`),
    line: $(`${root}CaptionLine`),
  };
}

function setListeningCaption(prefix, section, sentence, kicker = "") {
  const header = listeningCaptionHeader(prefix);
  const lines = listeningCaptionDisplayLines(prefix, sentence, section);
  if (header.bar) header.bar.hidden = false;
  if (header.bar) {
    header.bar.dataset.prefix = prefix || "";
    header.bar.dataset.section = section || "";
    header.bar.title = "Click to view the full transcript";
  }
  if (header.line) {
    if (!lines.length) {
      header.line.textContent = "Play audio to show captions.";
    } else {
      header.line.innerHTML = lines
        .slice(0, 1)
        .map(captionDisplayLineHtml)
        .join("");
    }
  }
  if (header.kicker) {
    const base = kicker || (section ? `Section ${section}` : "Auto captions");
    header.kicker.textContent = base;
  }
}

function clearListeningCaption(prefix) {
  const header = listeningCaptionHeader(prefix);
  if (header.bar) header.bar.hidden = true;
  if (header.line) header.line.textContent = "Play audio to show captions.";
  if (header.kicker) header.kicker.textContent = "Captions";
  document.body.classList.remove("listening-caption-rail-active");
  restoreListeningCaptionRail(prefix);
}

function resetListeningCaptionSession(prefix) {
  stopListeningAsr(prefix);
  stopTimedListeningCaptionLoop(prefix);
  delete state.listeningCaptionState[prefix];
  resetListeningCaptionVoices(prefix);
  setListeningScriptsVisible(prefix, false);
}

function listeningCaptionTranscriptText(prefix, section = "") {
  const payload = listeningCaptionPayload(prefix);
  if (!isReliableListeningCaptionPayload(payload, section)) return "";
  const selected = listeningCaptionSection(payload, section);
  return selected?.text || payload.text || "";
}

function listeningCaptionTranscriptEntries(prefix, section = "") {
  const payload = listeningCaptionPayload(prefix);
  if (!isReliableListeningCaptionPayload(payload, section)) return [];
  const selected = listeningCaptionSection(payload, section);
  if (Array.isArray(selected?.sentences) && selected.sentences.length) {
    const model = listeningTimedCaptionModel(selected, payload);
    return model.segments.map((segment) => ({ speaker: segment.speaker, text: segment.text })).filter((entry) => entry.text);
  }
  return [];
}

function renderCaptionTranscript(prefix, text, section = "") {
  const entries = listeningCaptionTranscriptEntries(prefix, section);
  if (entries.length) {
    return entries
      .map((entry) => {
        const voice = listeningCaptionVoice(prefix, entry.speaker, section);
        return captionDisplayLineHtml({ ...entry, voice });
      })
      .join("");
  }
  const lines = listeningCaptionSentences(text);
  if (!lines.length) return `<p class="caption-transcript-empty">No saved transcript yet.</p>`;
  return lines
    .map((line) => {
      const parsed = listeningCaptionSpeaker(line);
      const voice = listeningCaptionVoice(prefix, parsed.speaker, section);
      return captionDisplayLineHtml({ ...parsed, voice });
    })
    .join("");
}

function openListeningCaptionTranscript(prefix, section = "") {
  const text = listeningCaptionTranscriptText(prefix, section);
  let overlay = $("captionTranscriptOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "captionTranscriptOverlay";
    overlay.className = "caption-transcript-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="caption-transcript-panel" role="dialog" aria-modal="true" aria-label="Listening transcript">
      <div class="caption-transcript-head">
        <strong>${escapeHtml(section ? `Section ${section} transcript` : "Listening transcript")}</strong>
        <button id="captionTranscriptClose" class="icon-btn" type="button" aria-label="Close transcript">Close</button>
      </div>
      <div class="caption-transcript-body">${renderCaptionTranscript(prefix, text, section)}</div>
    </div>
  `;
  overlay.hidden = false;
  $("captionTranscriptClose")?.focus();
}

function closeListeningCaptionTranscript() {
  const overlay = $("captionTranscriptOverlay");
  if (overlay) overlay.hidden = true;
}

function updateListeningCaptionFromAudio(audio) {
  const prefix = audio.dataset.prefix || "single";
  const section = audio.dataset.section || "";
  const captionState = state.listeningCaptionState[prefix];
  if (!captionState?.enabled || (captionState.section && String(captionState.section) !== String(section))) return;
  if (captionState.source === "asr") return;
  const payload = listeningCaptionPayload(prefix);
  if (!payload?.available) return;
  const selected = listeningCaptionSection(payload, section);
  if (captionState.source === "timed-cache") {
    updateTimedListeningCaption(prefix, section, selected, audio);
    return;
  }
  const sentences = listeningCaptionSentences(selected?.text || payload.text || "");
  if (!sentences.length) return;
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : sentences.length * 4;
  const ratio = Math.max(0, Math.min(0.999, (audio.currentTime || 0) / duration));
  const index = Math.max(0, Math.min(sentences.length - 1, Math.floor(ratio * sentences.length)));
  const title = selected?.title || (section ? `Section ${section}` : "Auto captions");
  setListeningCaption(prefix, section, sentences[index], `${title} · ${index + 1}/${sentences.length}`);
}

function listeningTimedWords(section, payload) {
  const words = Array.isArray(section?.timedWords) && section.timedWords.length
    ? section.timedWords
    : Array.isArray(payload?.timedWords)
      ? payload.timedWords
      : [];
  return words
    .map((item, index) => ({
      word: String(item?.word || "").trim(),
      progress: Number.isFinite(Number(item?.progress)) ? Number(item.progress) : index / Math.max(1, words.length - 1),
      start: Number.isFinite(Number(item?.start)) ? Number(item.start) : null,
      end: Number.isFinite(Number(item?.end)) ? Number(item.end) : null,
      speaker: String(item?.speaker || "").trim(),
      sentenceIndex: Number.isFinite(Number(item?.sentenceIndex)) ? Number(item.sentenceIndex) : null,
    }))
    .filter((item) => item.word);
}

function listeningTimedSentences(section, payload) {
  const sentences = Array.isArray(section?.sentences) && section.sentences.length
    ? section.sentences
    : Array.isArray(payload?.sentences)
      ? payload.sentences
      : [];
  return sentences
    .map((item, index) => ({
      text: normalizeListeningCaptionText(item?.text || item?.sentence || ""),
      speaker: String(item?.speaker || item?.speaker_id || item?.speakerId || "").trim(),
      start: Number.isFinite(Number(item?.start)) ? Number(item.start) : null,
      end: Number.isFinite(Number(item?.end)) ? Number(item.end) : null,
      wordStart: Number.isFinite(Number(item?.wordStart)) ? Number(item.wordStart) : null,
      wordEnd: Number.isFinite(Number(item?.wordEnd)) ? Number(item.wordEnd) : null,
      index,
    }))
    .filter((item) => item.text);
}

function timedCaptionWindow(words, visibleCount) {
  const start = Math.max(0, visibleCount - 16);
  return words.slice(start, visibleCount).map((item) => item.word).join(" ");
}

function listeningCaptionWordList(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function dominantListeningWordSpeaker(words) {
  const counts = new Map();
  (Array.isArray(words) ? words : []).forEach((word) => {
    const speaker = String(word?.speaker || "").trim();
    if (!speaker) return;
    counts.set(speaker, (counts.get(speaker) || 0) + 1);
  });
  let best = "";
  let bestCount = 0;
  counts.forEach((count, speaker) => {
    if (count > bestCount) {
      best = speaker;
      bestCount = count;
    }
  });
  return best;
}

function listeningTimedCaptionModel(selected, payload) {
  const text = selected?.text || payload?.text || "";
  const timedWords = listeningTimedWords(selected, payload);
  const timedSentences = listeningTimedSentences(selected, payload);
  if (timedSentences.length) {
    const segments = [];
    let cursor = 0;
    timedSentences.forEach((sentence, index) => {
      let segmentWords = timedWords.filter((word) => Number(word.sentenceIndex) === index);
      if (!segmentWords.length && Number.isFinite(sentence.wordStart) && Number.isFinite(sentence.wordEnd)) {
        segmentWords = timedWords.slice(sentence.wordStart, sentence.wordEnd);
      }
      if (!segmentWords.length) {
        const roughWords = listeningCaptionWordList(sentence.text);
        const duration = Math.max(0.4, (Number(sentence.end) || 0) - (Number(sentence.start) || 0));
        segmentWords = roughWords.map((word, offset) => {
          const ratio = roughWords.length > 1 ? offset / (roughWords.length - 1) : 0;
          const start = Number.isFinite(Number(sentence.start)) ? Number(sentence.start) + ratio * duration : null;
          return {
            word,
            start: Number.isFinite(start) ? Math.round(start * 1000) / 1000 : null,
            end: Number.isFinite(start) ? Math.round((start + duration / Math.max(1, roughWords.length)) * 1000) / 1000 : null,
            speaker: sentence.speaker,
            sentenceIndex: index,
          };
        });
      }
      const words = segmentWords.map((word) => ({
        ...word,
        speaker: word.speaker || sentence.speaker,
      }));
      const speaker = dominantListeningWordSpeaker(words) || sentence.speaker || inferListeningCaptionSpeaker(sentence.text, segments.length);
      words.forEach((word) => {
        word.speaker = speaker;
      });
      segments.push({
        speaker,
        text: sentence.text,
        words,
        sentenceStart: sentence.start,
        sentenceEnd: sentence.end,
        start: cursor,
        end: cursor + words.length,
      });
      cursor += words.length;
    });
    const mergedSegments = mergeListeningCaptionSegments(segments);
    return {
      words: mergedSegments.flatMap((segment) => segment.words),
      segments: mergedSegments,
      source: "asr-timed",
    };
  }
  const plainTimedWords = timedWords.map((item) => item.word);
  const sentenceLines = listeningCaptionSentences(text);
  const segments = [];
  let cursor = 0;
  sentenceLines.forEach((line) => {
    const parsed = listeningCaptionSpeaker(line);
    const words = listeningCaptionWordList(parsed.text);
    if (!words.length) return;
    const segmentWords = words.map((word, offset) => {
      const timed = timedWords[cursor + offset];
      return {
        word,
        start: Number.isFinite(Number(timed?.start)) ? Number(timed.start) : null,
        end: Number.isFinite(Number(timed?.end)) ? Number(timed.end) : null,
        speaker: timed?.speaker || parsed.speaker || "",
        sentenceIndex: Number.isFinite(Number(timed?.sentenceIndex)) ? Number(timed.sentenceIndex) : null,
      };
    });
    const timedSpeaker = segmentWords.find((word) => word.speaker)?.speaker || "";
    const speaker = parsed.speaker || timedSpeaker || inferListeningCaptionSpeaker(parsed.text, segments.length);
    segmentWords.forEach((word) => {
      if (!word.speaker) word.speaker = speaker;
    });
    const segment = {
      speaker,
      text: parsed.text,
      words: segmentWords,
      start: cursor,
      end: cursor + words.length,
    };
    cursor += words.length;
    segments.push(segment);
  });
  if (segments.length) {
    const mergedSegments = mergeListeningCaptionSegments(segments);
    return {
      words: mergedSegments.flatMap((segment) => segment.words),
      segments: mergedSegments,
    };
  }
  const fallbackWords = plainTimedWords;
  return {
    words: timedWords,
    segments: fallbackWords.length ? [{ speaker: "Voice 1", text: fallbackWords.join(" "), words: timedWords, start: 0, end: fallbackWords.length }] : [],
  };
}

function shouldMergeListeningCaptionSegment(previous, current) {
  if (!previous || !current) return false;
  if (String(previous.speaker || "").trim().toLowerCase() !== String(current.speaker || "").trim().toLowerCase()) return false;
  const previousText = normalizeListeningCaptionText(previous.text || "");
  const currentText = normalizeListeningCaptionText(current.text || "");
  if (!previousText || !currentText || isListeningNarratorCaption(previousText) || isListeningNarratorCaption(currentText)) return false;
  const gap = Number(current.sentenceStart) - Number(previous.sentenceEnd);
  const closeTiming = !Number.isFinite(gap) || (gap >= -0.15 && gap <= 0.65);
  const currentContinues = /^[a-z,;:)-]/.test(currentText);
  const previousLooksOpen = !/[.!?]$/.test(previousText);
  const previousShort = listeningCaptionWordList(previousText).length <= 7;
  return closeTiming && (currentContinues || previousLooksOpen || previousShort);
}

function mergeListeningCaptionSegments(segments) {
  const merged = [];
  segments.forEach((segment) => {
    const previous = merged.at(-1);
    if (shouldMergeListeningCaptionSegment(previous, segment)) {
      previous.text = normalizeListeningCaptionText(`${previous.text} ${segment.text}`);
      previous.words = [...previous.words, ...segment.words];
      previous.sentenceEnd = segment.sentenceEnd;
      return;
    }
    merged.push({ ...segment, words: [...(segment.words || [])] });
  });
  let cursor = 0;
  merged.forEach((segment) => {
    segment.start = cursor;
    segment.end = cursor + segment.words.length;
    cursor = segment.end;
  });
  return merged;
}

function inferListeningCaptionSpeaker(text, index = 0) {
  const clean = normalizeListeningCaptionText(text);
  if (!clean) return "";
  if (isListeningNarratorCaption(clean)) return "Voice 3";
  return `Voice ${(index % 2) + 1}`;
}

function isListeningNarratorCaption(text) {
  return /^(?:test\s+\w+|part\s+[1-4]|section\s+[1-4]|published by|this recording is|you will hear|you will have to answer|there will now be|first you have some time|now listen carefully|that is the end of|you now have|turn to section|now turn to section|cambridge assessment english)\b/i.test(String(text || "").trim());
}

function timedCaptionSegmentEntry(model, visibleCount) {
  if (!visibleCount || visibleCount < 1) return null;
  const safeCount = Math.max(1, visibleCount);
  const segmentIndex = model.segments.findIndex((item) => safeCount > item.start && safeCount <= item.end);
  const segment = segmentIndex >= 0 ? model.segments[segmentIndex] : model.segments.at(-1);
  if (!segment) return null;
  const shownInSegment = Math.max(1, Math.min(segment.words.length, safeCount - segment.start));
  const text = segment.words.slice(0, shownInSegment).map((item) => item.word || item).join(" ");
  return { speaker: segment.speaker, text, segmentIndex: segmentIndex >= 0 ? segmentIndex : model.segments.length - 1 };
}

function timedCaptionConversationEntries(model, visibleCount) {
  const current = timedCaptionSegmentEntry(model, visibleCount);
  if (!current) return [];
  const previous = model.segments
    .slice(Math.max(0, current.segmentIndex - 5), current.segmentIndex)
    .map((segment) => ({ speaker: segment.speaker, text: segment.text }));
  return [...previous, { speaker: current.speaker, text: current.text }];
}

function setListeningCaptionConversation(prefix, section, entries, kicker = "") {
  const header = listeningCaptionHeader(prefix);
  if (header.bar) {
    header.bar.hidden = false;
    header.bar.dataset.prefix = prefix || "";
    header.bar.dataset.section = section || "";
    header.bar.title = "Click to view the full transcript";
  }
  if (header.line) {
    const lines = entries
      .filter((entry) => entry?.text)
      .slice(-5)
      .map((entry) => {
        const voice = listeningCaptionVoice(prefix, entry.speaker || "Voice 1", section);
        return captionDisplayLineHtml({ speaker: entry.speaker || "", text: entry.text, voice });
      });
    header.line.innerHTML = lines.length ? lines.join("") : "Play audio to show captions.";
    header.line.scrollTop = header.line.scrollHeight;
  }
  if (header.kicker) {
    const base = kicker || (section ? `Section ${section}` : "Auto captions");
    header.kicker.textContent = base;
  }
}

function timedCaptionLoopKey(prefix, section) {
  return `${prefix || "single"}::${section || ""}`;
}

function stopTimedListeningCaptionLoop(prefix, section = "") {
  const keyPrefix = section ? timedCaptionLoopKey(prefix, section) : `${prefix || "single"}::`;
  Object.entries(state.listeningTimedCaptionLoops).forEach(([key, frameId]) => {
    if (section ? key === keyPrefix : key.startsWith(keyPrefix)) {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      delete state.listeningTimedCaptionLoops[key];
    }
  });
}

function timedCaptionIntroOffsetSeconds(payload, section, audio) {
  if (listeningCaptionPayloadMode(payload) !== "audioscript") return 0;
  const duration = listeningAudioDurationSeconds(audio);
  const part = Number(section) || 1;
  if (!duration) return part === 1 ? 38 : 16;
  if (part === 1) return Math.max(30, Math.min(48, duration * 0.09));
  return Math.max(10, Math.min(24, duration * 0.045));
}

function timedCaptionWordsPerSecond(words, audio, startOffset = 0) {
  const duration = listeningAudioDurationSeconds(audio);
  const effectiveDuration = Math.max(1, duration - Math.max(0, startOffset));
  const audioWordsPerSecond = duration ? words.length / effectiveDuration : 0;
  if (audioWordsPerSecond >= 0.45 && audioWordsPerSecond <= 2.25) return Math.max(0.55, Math.min(2.35, audioWordsPerSecond * 1.03));
  if (audioWordsPerSecond > 2.25 && audioWordsPerSecond <= 4.6) return Math.max(1.6, Math.min(3.2, audioWordsPerSecond));
  return listeningCaptionDefaultWordsPerSecond;
}

function listeningAudioDurationSeconds(audio) {
  if (Number.isFinite(audio?.duration) && audio.duration > 0) return audio.duration;
  try {
    if (audio?.seekable?.length) {
      const end = audio.seekable.end(audio.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
  } catch {
    // Some browsers throw while metadata is still loading.
  }
  return 0;
}

function resetTimedListeningCaptionAnchor(prefix, audio) {
  const captionState = state.listeningCaptionState[prefix];
  if (captionState?.timed) delete captionState.timed;
  if (audio) updateListeningCaptionFromAudio(audio);
}

function ensureTimedListeningCaptionAnchor(prefix, section, audio, words, payload) {
  const captionState = state.listeningCaptionState[prefix];
  if (!captionState) return null;
  const currentTime = Math.max(0, Number(audio?.currentTime) || 0);
  const key = `${section || ""}::${audio?.currentSrc || audio?.src || ""}`;
  const startOffset = timedCaptionIntroOffsetSeconds(payload, section, audio);
  const wordsPerSecond = timedCaptionWordsPerSecond(words, audio, startOffset);
  if (!captionState.timed || captionState.timed.key !== key) {
    captionState.timed = {
      key,
      section: String(section || ""),
      mediaTime: currentTime,
      visibleBase: Math.max(0, Math.min(words.length - 1, Math.floor(Math.max(0, currentTime - startOffset) * wordsPerSecond))),
      startOffset,
      wordsPerSecond,
      lastVisibleCount: -1,
    };
  } else {
    captionState.timed.startOffset = startOffset;
    captionState.timed.wordsPerSecond = wordsPerSecond;
  }
  return captionState.timed;
}

function startTimedListeningCaptionLoop(prefix, audio) {
  const section = audio?.dataset?.section || "";
  const key = timedCaptionLoopKey(prefix, section);
  if (state.listeningTimedCaptionLoops[key]) return;
  const startedAt = Date.now();
  const run = () => {
    const captionState = state.listeningCaptionState[prefix];
    if (!captionState?.enabled || captionState.source !== "timed-cache" || String(captionState.section || "") !== String(section || "")) {
      delete state.listeningTimedCaptionLoops[key];
      return;
    }
    updateListeningCaptionFromAudio(audio);
    const warmingUp = Date.now() - startedAt < listeningCaptionLoopWarmupMs;
    if ((!audio.paused && !audio.ended) || warmingUp) {
      state.listeningTimedCaptionLoops[key] = setTimeout(run, 120);
    } else {
      delete state.listeningTimedCaptionLoops[key];
    }
  };
  state.listeningTimedCaptionLoops[key] = setTimeout(run, 60);
}

function restartTimedListeningCaptionLoop(prefix, audio) {
  if (!audio) return;
  stopTimedListeningCaptionLoop(prefix, audio.dataset?.section || "");
  startTimedListeningCaptionLoop(prefix, audio);
}

function updateTimedListeningCaption(prefix, section, selected, audio) {
  const payload = listeningCaptionPayload(prefix);
  const model = listeningTimedCaptionModel(selected, payload);
  const words = model.words;
  if (!words.length) return;
  const timed = ensureTimedListeningCaptionAnchor(prefix, section, audio, words, payload);
  if (!timed) return;
  const currentTime = Math.max(0, Number(audio?.currentTime) || 0);
  const title = selected?.title || (section ? `Section ${section}` : "Captions");
  if (currentTime < timed.startOffset) {
    const remaining = Math.max(1, Math.ceil(timed.startOffset - currentTime));
    if (timed.lastVisibleCount !== 0) {
      timed.lastVisibleCount = 0;
      setListeningCaption(prefix, section, `Intro is playing. Transcript starts in about ${remaining}s.`, `${title} · intro`);
    }
    return;
  }
  const hasWordTimes = words.some((item) => Number.isFinite(Number(item.start)));
  const captionTime = Math.max(0, currentTime - timed.startOffset);
  const visibleCount = hasWordTimes
    ? timedCaptionVisibleCountForTime(words, currentTime)
    : Math.max(1, Math.min(words.length, Math.floor(captionTime * timed.wordsPerSecond) + 1));
  if (timed.lastVisibleCount === visibleCount) return;
  timed.lastVisibleCount = visibleCount;
  if (!visibleCount) {
    setListeningCaption(prefix, section, "Captions will appear when speech begins.", `${title} · 0/${words.length}`);
    return;
  }
  const entries = timedCaptionConversationEntries(model, visibleCount);
  setListeningCaptionConversation(prefix, section, entries, `${title} · ${visibleCount}/${words.length}`);
}

function timedCaptionVisibleCountForTime(words, currentTime) {
  const time = Math.max(0, Number(currentTime) || 0);
  let count = 0;
  for (let index = 0; index < words.length; index += 1) {
    const start = Number(words[index]?.start);
    const end = Number(words[index]?.end);
    if (Number.isFinite(start) && start <= time + 0.08) {
      count = index + 1;
      continue;
    }
    if (!Number.isFinite(start) && Number.isFinite(end) && end <= time + 0.08) {
      count = index + 1;
      continue;
    }
    break;
  }
  return Math.max(0, Math.min(words.length, count));
}

async function loadListeningAsrCache(prefix, section) {
  const id = listeningRootItemId(prefix);
  if (!id || !section) return null;
  try {
    const json = await getJson(`/api/listening/asr-cache?id=${encodeURIComponent(id)}&section=${encodeURIComponent(section)}`);
    return json.available && isUsableListeningCaptionSource(json.text) ? json : null;
  } catch {
    return null;
  }
}

function isUsableListeningCaptionSource(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 80) return false;
  return true;
}

function stopListeningAsr(prefix) {
  delete state.listeningAsr[prefix];
}

function setListeningScriptsVisible(prefix, visible) {
  const root = $(`${prefix}-listening-studio`);
  if (root) root.classList.toggle("show-scripts", visible);
  document.body.classList.toggle("listening-caption-rail-active", visible);
  mountListeningCaptionRail(prefix, visible);
  document.querySelectorAll(`.listening-caption-toggle[data-prefix="${prefix}"]`).forEach((button) => {
    button.classList.toggle("active", visible && (!state.listeningCaptionState[prefix]?.section || String(button.dataset.section || "") === String(state.listeningCaptionState[prefix].section || "")));
    button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
  });
  if (!visible) clearListeningCaption(prefix);
}

function shouldMountListeningCaptionRail(prefix) {
  if (!document.body.classList.contains("immersive-mode")) return false;
  if (document.body.dataset.immersiveModule !== "listening") return false;
  if (document.body.classList.contains("single-immersive-mode")) return prefix === "single";
  const focused = document.querySelector(".exam-section.focused-section");
  const studio = $(`${prefix}-listening-studio`);
  return Boolean(focused && studio && focused.contains(studio));
}

function rememberListeningCaptionHome(bar) {
  if (!bar?.id || state.listeningCaptionHomes[bar.id]) return;
  state.listeningCaptionHomes[bar.id] = {
    parent: bar.parentNode,
    nextSibling: bar.nextSibling,
  };
}

function restoreListeningCaptionRail(prefix = "") {
  const bar = prefix ? listeningCaptionHeader(prefix).bar : null;
  const bars = bar ? [bar] : Object.keys(state.listeningCaptionHomes).map((id) => $(id)).filter(Boolean);
  bars.forEach((item) => {
    const home = state.listeningCaptionHomes[item.id];
    item.closest?.(".pdf-study-layout")?.classList.remove("caption-rail-mounted");
    if (home?.parent && item.parentNode !== home.parent) {
      home.parent.insertBefore(item, home.nextSibling || null);
    }
  });
}

function mountListeningCaptionRail(prefix, visible) {
  const bar = listeningCaptionHeader(prefix).bar;
  if (!bar) return;
  rememberListeningCaptionHome(bar);
  bar.closest?.(".pdf-study-layout")?.classList.remove("caption-rail-mounted");
  if (!visible || !shouldMountListeningCaptionRail(prefix)) {
    restoreListeningCaptionRail(prefix);
    return;
  }
  const studio = $(`${prefix}-listening-studio`);
  const layout = studio?.querySelector(".pdf-study-layout");
  const pdfPanel = layout?.querySelector(".pdf-scroll-box");
  if (!layout || !pdfPanel) {
    restoreListeningCaptionRail(prefix);
    return;
  }
  layout.insertBefore(bar, pdfPanel);
  layout.classList.add("caption-rail-mounted");
}

function highlightListeningScriptPart(prefix, part) {
  const payload = listeningCaptionPayload(prefix);
  if (!isReliableListeningCaptionPayload(payload, part)) {
    setListeningCaption(prefix, part, "No cached captions for this section yet.", part ? `Section ${part}` : "Captions");
    return;
  }
  const section = listeningCaptionSection(payload, part);
  const model = listeningTimedCaptionModel(section, payload);
  const firstEntry = model.segments[0] ? [{ speaker: model.segments[0].speaker, text: model.segments[0].text }] : [];
  if (firstEntry.length) {
    setListeningCaptionConversation(prefix, part, firstEntry, section?.title || (part ? `Section ${part}` : "Cached captions"));
    return;
  }
  const firstSentence = listeningCaptionSentences(section?.text || payload?.text || "")[0] || "";
  setListeningCaption(prefix, part, firstSentence || "Play audio to show cached captions.", section?.title || (part ? `Section ${part}` : "Cached captions"));
}

async function loadListeningScripts(prefix, itemId, pageImageUrls = []) {
  const cacheKey = listeningScriptsCacheKey(prefix, itemId);
  if (state.listeningScripts[cacheKey]) {
    return state.listeningScripts[cacheKey];
  }
  setListeningCaption(prefix, "", "Loading captions...", "Auto captions");
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);
  try {
    const headers = { "content-type": "application/json" };
    if (state.authToken) headers.authorization = `Bearer ${state.authToken}`;
    const response = await fetch("/api/listening/scripts", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: itemId, pageImageUrls, allowOcr: false }),
      signal: controller.signal,
    });
    const json = await parseJsonResponse(response);
    state.listeningScripts[cacheKey] = json;
    return json;
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "No cached captions for this section yet. Refresh the offline ASR cache."
      : `Captions failed: ${error.message}`;
    setListeningCaption(prefix, "", message, "Auto captions");
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function toggleListeningCaptions(button) {
  const prefix = button.dataset.prefix || "single";
  const section = button.dataset.section || "";
  const wasEnabled = state.listeningCaptionState[prefix]?.enabled && String(state.listeningCaptionState[prefix]?.section || "") === String(section || "");
  const visible = !wasEnabled;
  if (!visible) {
    stopListeningAsr(prefix);
    stopTimedListeningCaptionLoop(prefix, section);
    resetListeningCaptionVoices(prefix, section);
  }
  state.listeningCaptionState[prefix] = { enabled: visible, section, source: visible ? "loading-cache" : "" };
  setListeningScriptsVisible(prefix, visible);
  document.querySelectorAll(`.listening-caption-toggle[data-prefix="${prefix}"]`).forEach((item) => {
    const active = visible && String(item.dataset.section || "") === String(section || "");
    item.classList.toggle("active", active);
    item.textContent = active ? "Captions on" : "Captions";
    item.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (visible) {
    const activeAudio = [...document.querySelectorAll(`.listening-player[data-prefix="${prefix}"][data-section="${section}"]`)]
      .find((audio) => !audio.paused && !audio.ended) || document.querySelector(`.listening-player[data-prefix="${prefix}"][data-section="${section}"]`);
    setListeningCaption(prefix, section, "Checking ASR cache...", `Section ${section}`);
    const cached = await loadListeningAsrCache(prefix, section);
    if (cached?.text) {
      const payload = {
        available: true,
        mode: "asr-cache",
        text: cached.text,
        timedWords: cached.timedWords || [],
        sentences: cached.sentences || [],
        speakers: cached.speakers || [],
        timing: cached.timing || null,
        duration: cached.duration || 0,
        sections: [{
          part: section,
          title: `ASR cache · Section ${section}`,
          text: cached.text,
          timedWords: cached.timedWords || [],
          sentences: cached.sentences || [],
          speakers: cached.speakers || [],
          timing: cached.timing || null,
          duration: cached.duration || 0,
        }],
      };
      state.listeningScripts[listeningScriptsCacheKey(prefix, listeningRootItemId(prefix))] = payload;
      state.listeningCaptionState[prefix] = { enabled: true, section, source: "timed-cache" };
      resetListeningCaptionVoices(prefix, section);
      seedListeningCaptionVoices(prefix, section);
      if (activeAudio) {
        resetTimedListeningCaptionAnchor(prefix, activeAudio);
        updateListeningCaptionFromAudio(activeAudio);
        if (!activeAudio.paused && !activeAudio.ended) restartTimedListeningCaptionLoop(prefix, activeAudio);
      } else {
        highlightListeningScriptPart(prefix, section);
      }
      return;
    }
    state.listeningCaptionState[prefix] = { enabled: true, section, source: "missing-cache" };
    setListeningCaption(prefix, section, "No cached captions for this section yet. Please refresh the offline ASR cache.", `Section ${section}`);
  }
}

function renderReading(test, prefix = "single", options = {}) {
  const item = normalizeItem(test);
  const sourceLink = item.sourceUrl ? `<a class="source-inline" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Open local PDF</a>` : "";
  const analysisLink = item.analysisUrl ? `<a class="source-inline" href="${item.analysisUrl}" target="_blank" rel="noreferrer">Open local analysis</a>` : "";
  const useSplitLayout = options.splitLayout === true;
  const readingPageImages = filteredPaperImagesForLabel(item.readingPageImages || [], "Reading", item.readingPaper);
  const readingPassagePageImages = item.readingPassagePageImages || [];
  const readingQuestionPageImages = item.readingQuestionPageImages || [];
  const readingPaper = readingPageImages.length
    ? (useSplitLayout
          ? renderReadingSplitPages(readingPageImages, prefix, item.questions, item.readingPaper, {
            passageImages: readingPassagePageImages,
            questionImages: readingQuestionPageImages,
            passageStartPages: item.readingPassageStartPages || {},
          })
        : renderPageImagesWithAnswers(readingQuestionPageImages.length ? readingQuestionPageImages : readingPageImages, "Reading question PDF", prefix, item.questions, item.readingPaper))
    : item.readingPaper
      ? `<details class="question-paper" open><summary>Reading OCR text</summary><pre>${escapeHtml(item.readingPaper)}</pre></details>`
      : `<article class="passage">${escapeHtml(item.passage || item.prompt || "")}</article>`;
  return `
    <div class="module-meta">${[item.source, item.period || "", `${item.minutes || 60} min`].filter(Boolean).join(" · ")} ${sourceLink} ${analysisLink}</div>
    <h3>${item.title}</h3>
    ${readingPaper}
    ${readingPageImages.length ? "" : renderQuestionInputs(prefix, item.questions)}
  `;
}

function writingTooltipSummary(tasks = []) {
  return tasks
    .filter(Boolean)
    .map((task, index) => {
      const item = normalizeItem(task);
      const taskName = item.type || `Task ${index + 1}`;
      const meta = [taskName, item.source, item.period, `${item.minutes || 40} min`].filter(Boolean).join(" · ");
      const pdf = item.sourceUrl ? "Local PDF available" : "";
      return [meta, item.title || "Writing task", pdf].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function renderWriting(task, prefix = "single") {
  const item = normalizeItem(task);
  const wordTarget = /task\s*1/i.test(item.type || item.title || "") ? 150 : 250;
  const sourceLink = item.sourceUrl ? `<a class="source-inline" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Open local PDF</a>` : "";
  const writingPrompt = item.writingPageImages?.length
    ? renderPageImages(item.writingPageImages, "Writing prompt PDF")
    : `<pre class="prompt-text">${escapeHtml(item.prompt)}</pre>${renderTaskVisual(item)}`;
  const showMeta = true;
  const showTitle = true;
  const compactLabel = "";
  return `
    ${compactLabel}
    ${showMeta ? `<div class="module-meta">${[item.type || "Writing", item.source, item.period || "", `${item.minutes || 40} min`].filter(Boolean).join(" · ")} ${sourceLink}</div>` : ""}
    ${showTitle ? `<h3>${item.title || "Writing task"}</h3>` : ""}
    ${writingPrompt}
    <textarea id="${prefix}-writing" data-word-target="${wordTarget}" placeholder="Write your essay here..."></textarea>
    <div class="writing-editor-meta">
      <div class="word-count"><span id="${prefix}-words">0</span> / ${wordTarget} words</div>
      <span class="writing-autosave-status" data-writing-autosave-status data-state="saved">Saved</span>
    </div>
  `;
}

function renderWritingExamTwoColumn(tasks = [], prefixRoot = "exam") {
  const validTasks = tasks.filter((task) => task && typeof task === "object");
  if (!validTasks.length) {
    return `<section class="panel notice">No Writing task is available. Choose another task.</section>`;
  }
  const totalMinutes = validTasks.reduce((sum, task) => {
    const item = normalizeItem(task);
    return sum + (Number(item.minutes) || (writingTaskNumber(item) === 1 ? 20 : 40));
  }, 0);
  const taskTabs = validTasks.map((task, index) => {
    const item = normalizeItem(task);
    const taskNumber = writingTaskNumber(item) || index + 1;
    const taskLabel = item.type || `Task ${taskNumber}`;
    const wordTarget = taskNumber === 1 ? 150 : 250;
    return `<button type="button" role="tab" data-writing-task-tab="${taskNumber}" aria-selected="${index === 0 ? "true" : "false"}" class="writing-task-tab${index === 0 ? " active" : ""}">
      <span>${escapeHtml(taskLabel)}</span><strong>${wordTarget} words</strong>
    </button>`;
  }).join("");
  const taskPanels = validTasks.map((task, index) => {
    const item = normalizeItem(task);
    const taskNumber = writingTaskNumber(item) || index + 1;
    const answerPrefix = `${prefixRoot}-task${taskNumber}`;
    const wordTarget = taskNumber === 1 ? 150 : 250;
    const writingPrompt = item.writingPageImages?.length
      ? renderPageImages(item.writingPageImages, "Writing prompt PDF")
      : `<pre class="prompt-text">${escapeHtml(item.prompt)}</pre>${renderTaskVisual(item)}`;
    return `<section class="writing-task-workspace" data-writing-task-panel="${taskNumber}"${index === 0 ? "" : " hidden"}>
      <div class="exam-two-column writing-two-column">
        <section class="exam-left-pane writing-task-prompt">
          <div class="writing-pane-label"><span>Question</span><strong>${escapeHtml(item.type || `Task ${taskNumber}`)} · ${escapeHtml(String(Number(item.minutes) || (taskNumber === 1 ? 20 : 40)))} min</strong></div>
          <h3>${escapeHtml(item.title || `Writing Task ${taskNumber}`)}</h3>
          <div class="writing-prompt-scroll">${writingPrompt}</div>
        </section>
        <aside class="exam-right-pane writing-answer-pane">
          <label class="writing-answer-block" for="${answerPrefix}-writing">
            <span class="writing-pane-label"><span>Your response</span><strong>Target ${wordTarget}+ words</strong></span>
            <textarea id="${answerPrefix}-writing" data-word-target="${wordTarget}" placeholder="Write your answer here..."></textarea>
            <div class="writing-editor-meta">
              <div class="word-count"><span id="${answerPrefix}-words">0</span> / ${wordTarget} words</div>
              <span class="writing-autosave-status" data-writing-autosave-status data-state="saved">Saved</span>
            </div>
          </label>
        </aside>
      </div>
    </section>`;
  }).join("");
  const firstTaskNumber = writingTaskNumber(normalizeItem(validTasks[0])) || 1;
  return `<div class="writing-practice-shell" data-writing-total-minutes="${escapeHtml(String(totalMinutes || 40))}" data-active-writing-task="${firstTaskNumber}">
    <nav class="writing-task-tabs" role="tablist" aria-label="Writing tasks">${taskTabs}</nav>
    <div class="writing-task-stage">${taskPanels}</div>
  </div>`;
}

function bindWritingTaskTabs(root = document) {
  root.querySelectorAll?.(".writing-practice-shell").forEach((shell) => {
    const tabs = [...shell.querySelectorAll("[data-writing-task-tab]")];
    const panels = [...shell.querySelectorAll("[data-writing-task-panel]")];
    tabs.forEach((tab) => {
      if (tab.dataset.writingTabBound === "1") return;
      tab.dataset.writingTabBound = "1";
      tab.onclick = () => {
        const task = tab.dataset.writingTaskTab || "1";
        tabs.forEach((item) => {
          const active = item.dataset.writingTaskTab === task;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
        panels.forEach((panel) => {
          panel.hidden = panel.dataset.writingTaskPanel !== task;
        });
        shell.dataset.activeWritingTask = task;
        state.writingActiveTaskNumber = Number(task) || 1;
        saveWritingUploadSessionPointer();
        rebindCoachContext();
        renderGlobalCoachContext();
        panels.find((panel) => panel.dataset.writingTaskPanel === task)?.querySelector("textarea")?.focus({ preventScroll: true });
      };
    });
  });
}

function renderSpeaking(set, prefix = "single") {
  return renderSpeakingExamTwoColumn(set, prefix);
}

function speakingPracticeScopeConfig(scope = "full") {
  const configs = {
    full: { id: "full", label: "Full test", targetMs: 15 * 60 * 1000, parts: ["part1", "part2", "part3"] },
    part1: { id: "part1", label: "Part 1", targetMs: 5 * 60 * 1000, parts: ["part1"] },
    part2: { id: "part2", label: "Part 2", targetMs: 3 * 60 * 1000, parts: ["part2"] },
    part3: { id: "part3", label: "Part 3", targetMs: 5 * 60 * 1000, parts: ["part3"] },
  };
  return configs[scope] || configs.full;
}

function qwenSpeakingCountdownState(targetMs, elapsedMs) {
  const remainingMs = Math.max(0, Number(targetMs || 0) - Math.max(0, Number(elapsedMs || 0)));
  const totalSeconds = Math.ceil(remainingMs / 1000);
  return {
    remainingMs,
    expired: remainingMs <= 0,
    label: `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`,
  };
}

function renderSpeakingCueCard(item) {
  const part2 = compactDialogueText(item.part2 || item.prompt || item.title || "");
  const cueLines = String(item.part2 || "")
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[\s\-•*]+/, "").trim())
    .filter(Boolean);
  const cueTitle = (cueLines[0] || item.title || "IELTS Speaking topic")
    .replace(/\s*(?:one|1)?\s*(?:to|-)?\s*(?:two|2)?\s*minutes?\.?$/i, "")
    .replace(/\s+minutes?\.?$/i, "")
    .trim();
  const bulletLines = cueLines.slice(1, 6);
  const paperPreview = item.speakingPageImages?.length
    ? `<div class="speaking-paper-preview">${renderPageImages(item.speakingPageImages, "Speaking prompt PDF")}</div>`
    : "";
  return `<div class="speaking-cue-card">
    <div class="speaking-cue-top">
      <div class="speaking-bot-mark" aria-hidden="true"><span></span></div>
      <div>
        <span class="eyebrow">AI Speaking Examiner</span>
        <h3>${escapeHtml(cueTitle || "Speaking with AI")}</h3>
        ${part2 && !bulletLines.length ? `<p>${escapeHtml(part2.slice(0, 260))}</p>` : ""}
      </div>
    </div>
    ${bulletLines.length ? `<ul>${bulletLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
    ${paperPreview}
  </div>`;
}

function renderSpeakingExamTwoColumn(set, prefix = "exam") {
  const item = normalizeItem(set);
  const leftPane = prefix === "exam"
    ? `<div class="speaking-orb-stage">
        <div id="${prefix}-speaking-orb" class="speaking-voice-orb" aria-hidden="true"></div>
        <div class="speaking-orb-label">Speaking exam</div>
      </div>`
    : `<div class="module-meta">${[item.source, item.period || ""].filter(Boolean).join(" · ")}</div>
      ${renderSpeakingCueCard(item)}`;
  return renderRealtimeSpeakingPanel(item, prefix, { showTranscript: prefix !== "exam", leftPane });
}

function renderRealtimeSpeakingPanel(item, prefix, options = {}) {
  const showTranscript = options.showTranscript !== false;
  const mode = options.mode || (prefix === "exam" ? "exam" : "coach");
  const leftPane = options.leftPane || "";
  const practiceScope = speakingPracticeScopeConfig(options.practiceScope || "full");
  const speakingTopicPayload = JSON.stringify({
    title: item.title || "",
    source: item.source || "",
    period: item.period || "",
    part1: item.part1 || [],
    part2: item.part2 || "",
    part3: item.part3 || [],
  });
  const transcriptHtml = `<details class="speaking-transcript-pane"${showTranscript ? "" : " hidden"}>
      <summary>Conversation transcript</summary>
      <div id="${prefix}-speaking-log" class="dialogue-log"></div>
    </details>`;
  return `<div class="qwen-speaking speaking-exam-shell speaking-practice-layout" data-prefix="${prefix}" data-topic="${escapeHtml(item.title)}" data-practice-mode="${escapeHtml(mode)}" data-speaking-scope="${practiceScope.id}">
    <textarea id="${prefix}-qwen-prompt" hidden>${escapeHtml(buildIeltsSpeakingPrompt(item))}</textarea>
    <textarea id="${prefix}-qwen-topic-json" hidden>${escapeHtml(speakingTopicPayload)}</textarea>
    <section class="practice-context exam-left-pane speaking-exam-left-pane ${prefix === "exam" ? "speaking-orb-pane" : ""}">
      <div class="speaking-current-question"><span>Current question</span><strong id="${prefix}-speaking-question">Waiting for the examiner</strong></div>
      <div class="speaking-deferred-cue" data-speaking-part2-cue hidden>${leftPane}</div>
    </section>
    <section class="practice-main speaking-main-stage">
      <div class="speaking-voice-card" data-speaking-phase="ready">
        <div class="speaking-panel-head">
          <span id="${prefix}-qwen-status" class="voice-state">Ready to check</span>
          <strong>Your answer</strong>
        </div>
        <div class="speaking-preflight" aria-label="Speaking test status"><span><i aria-hidden="true"></i> ${prefix === "bank" && state.speakingDeviceChecked ? "Device check passed" : "Ready for device permission"}</span><span><i aria-hidden="true"></i> ${navigator.onLine ? "Network online" : "Network offline"}</span></div>
        <div class="speaking-live-meta" aria-live="polite">
          <strong id="${prefix}-speaking-current-part">Preparation</strong>
          <span id="${prefix}-speaking-elapsed" aria-label="Time remaining">${practiceScope.id === "full" ? "15:00" : practiceScope.id === "part2" ? "03:00" : "05:00"}</span>
        </div>
        <div class="qwen-meter" aria-label="Live voice waveform">
          <span id="${prefix}-qwen-level"></span>
          <strong id="${prefix}-qwen-meter">0.00</strong>
        </div>
        <div class="actions">
          <button class="primary start-qwen-speaking" data-prefix="${prefix}" data-topic="${escapeHtml(item.title)}">Start speaking test</button>
          <button class="primary qwen-finish-score" data-prefix="${prefix}" disabled>Finish &amp; get feedback</button>
          <button class="secondary qwen-disconnect" data-prefix="${prefix}" disabled>Disconnect</button>
        </div>
      </div>
      <input id="${prefix}-speaking-score" class="band-input" type="hidden" />
      <div id="${prefix}-scoring-progress" class="speaking-scoring-progress" hidden aria-live="polite">
        <div class="speaking-scoring-row">
          <span id="${prefix}-scoring-label">Preparing scoring...</span>
          <strong id="${prefix}-scoring-percent">0%</strong>
        </div>
        <div class="speaking-scoring-track"><span id="${prefix}-scoring-bar"></span></div>
      </div>
      <div id="${prefix}-recording-download" class="recording-download"></div>
      ${transcriptHtml}
    </section>
  </div>`;
}

function buildIeltsSpeakingPrompt(set) {
  const item = normalizeItem(set);
  const topicLines = [
    ...(item.part1 || []),
    item.part2 || "",
    ...(item.part3 || []),
  ].filter(Boolean).join("\n");
  return [
    "You are a professional IELTS Speaking examiner in a real-time voice test. Your personality is calm, neutral-warm, attentive and concise.",
    "Speak English only during the test. Do not read role labels. Do not explain the rules unless necessary.",
    "Critical opening rule: your first response must be no more than two short sentences. Sentence 1 must be a brief greeting statement, not a question. Sentence 2 must ask exactly one Part 1 question. Then stop and wait for the student's spoken answer.",
    "Do not ask greeting/check-in questions such as 'How are you?' or 'Are you ready?' because they count as extra questions.",
    "Behave like a real human examiner, not a script reader. The topic set is only a reference; do not mechanically repeat every prompt.",
    "Human examiner priority: understand what the candidate is trying to do before choosing your next move. They may be answering, asking for clarification, asking a technical question, correcting themselves, or continuing an unfinished answer.",
    "Use the immediate conversation context first, especially the last examiner question and the candidate's latest words. Do not interpret short candidate questions in isolation.",
    "When the candidate genuinely asks you something, answer it briefly like a person, then guide them back to the speaking test. Do not ignore the question just because a scheduled item exists.",
    "When the candidate answers off-topic or seems to have misunderstood, do not punish them during the live turn. Briefly clarify the question and invite them to answer it again.",
    "When the candidate gives a real answer, react only if it sounds natural. Vary short bridges; avoid repeating canned phrases such as 'That's interesting' or 'That's a good strategy'.",
    "Understand the candidate's intent before responding. If the candidate asks a direct question about the AI examiner, scoring, the current question, clarification, repetition, microphone/audio, or how the speaking test works, answer that question briefly and helpfully first; then continue the test naturally.",
    "Candidate questions are usually about the previous examiner question. Interpret their question from the immediate context, not as a standalone dictionary question.",
    "If the candidate asks for a repeat or clarification, explain the confusing word or phrase in the context of the last examiner question, then repeat or paraphrase that question instead of moving on.",
    "The app may provide a scheduled IELTS item, but after the candidate speaks it is a reference, not a command. Use it only if it is the most natural next move.",
    "For the full 15-minute session, treat the topic-bank questions as anchor points, not a script. Between anchor points, freely develop non-repeating follow-ups from the candidate's own answers, then smoothly return to the planned IELTS topic when the test timing or section requires it.",
    "Throughout the test, ask exactly one question at a time and wait. Never read the whole topic set aloud.",
    "Wait patiently after the student pauses. Do not interrupt unfinished answers, false starts, or thinking pauses. Give the candidate roughly 1 to 1.5 seconds of silence before deciding the answer has ended.",
    "Maintain a private ledger of every question you have asked and every topic the student has answered.",
    "Use both the current-session ledger and the app's recent questions ledger. Do not repeat an exact or near-duplicate question from either ledger.",
    "Do not repeat questions or topics the student has already answered. Track what the student said, then extend naturally with a relevant follow-up or move to a new angle.",
    "Never ask the same question twice. Before asking, compare it with your private ledger and the Already asked list; if it is similar, ask a different follow-up or move to a fresh IELTS-style angle instead.",
    "You may follow up on concrete details from what the student just said, such as people, places, reasons, examples, problems, feelings, or comparisons, when that feels natural.",
    "You may also move to a fresh IELTS-style angle from the topic bank, but only if it is not similar to anything already asked.",
    "Free development does not mean random topic switching: branch from the answer, ask a deeper why/how/example/comparison question, and later bring the conversation back to the scheduled Part 1, Part 2, or Part 3 anchor.",
    "In Part 2 and Part 3, you may first explore a meaningful detail from the candidate's answer, then smoothly bring the discussion back to the broader IELTS topic. This should sound like a human examiner, not a rigid script.",
    "If you notice you are about to ask the same question again, switch immediately to a different IELTS-style angle.",
    "If the student's answer is short, ask one gentle follow-up such as 'Could you tell me a little more about that?' instead of switching topics too quickly.",
    "Respect the selected practice scope supplied by the app. Full test uses Part 1, Part 2 and Part 3; a Part-only drill must stay inside that Part.",
    "Run the IELTS format naturally: Part 1 interview, Part 2 cue card with 1 minute preparation and 1-2 minutes speaking, then Part 3 discussion. A Full test must target a full 15 minutes.",
    "Do not end the test, score, or give final feedback early. Continue with natural follow-up questions until the app explicitly sends the scheduled End/Score instruction.",
    "If the provided topic-bank questions run out before the full 15 minutes, keep asking deeper IELTS-style follow-ups around the same broad topic and the candidate's answers.",
    "After the student ends the test, score Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation from 0 to 9. The first scoring line must be exactly like: Overall Band: 6.5.",
    "After scoring, give concise English feedback with 3 specific weaknesses and 3 drills.",
    "",
    `Topic set title: ${item.title}`,
    item.retestFocus ? `Targeted retest instruction: ${item.retestFocus}` : "",
    topicLines,
  ].join("\n");
}

function ensureSpeakingSession(prefix, setTitle) {
  if (!state.speakingSessions[prefix]) {
    state.speakingSessions[prefix] = { set: setTitle, part: "part1", history: [] };
  }
  return state.speakingSessions[prefix];
}

function appendDialogue(prefix, role, text) {
  const log = $(`${prefix}-speaking-log`);
  const session = ensureSpeakingSession(prefix, "");
  session.history.push({ role, text });
  const emptyNotice = log.querySelector(".notice");
  if (emptyNotice) emptyNotice.remove();
  const bubble = document.createElement("div");
  bubble.className = `dialogue-bubble ${role}`;
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

async function askSpeakingQuestion(prefix, setTitle) {
  const session = ensureSpeakingSession(prefix, setTitle);
  const json = await postJson("/api/speaking/turn", {
    set: setTitle,
    part: session.part,
    history: session.history,
  });
  appendDialogue(prefix, "examiner", json.question);
  await speakText(json.question, "examiner");
}

function setVoiceState(prefix, text, active = false) {
  const node = $(`${prefix}-voice-state`);
  if (!node) return;
  node.textContent = text;
  node.classList.toggle("active", active);
}

async function startLiveSpeaking(prefix, setTitle) {
  stopVoiceSpeaking(prefix);
  state.speakingSessions[prefix] = { set: setTitle, part: "part1", history: [] };
  setSpeakingTimer(prefix, "part1");
  $(`${prefix}-speaking-log`).innerHTML = "";
  $(`${prefix}-speaking`).value = "";
  await askSpeakingQuestion(prefix, setTitle);
}

function stopVoiceSpeaking(prefix) {
  state.autoSpeaking[prefix] = false;
  if (state.recognition && state.recording) state.recognition.stop();
  setVoiceState(prefix, "Stopped", false);
}

function captureSpeechOnce(prefix, targetId, timeoutMs = 65000) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error("Speech recognition is not supported in this browser. Try Chrome or Edge."));
      return;
    }
    if (state.recognition && state.recording) state.recognition.stop();
    const recognition = new SpeechRecognition();
    let bestText = "";
    let settled = false;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    const timer = window.setTimeout(() => {
      if (!settled) recognition.stop();
    }, timeoutMs);
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      state.recording = false;
      setVoiceState(prefix, "Recognition finished", false);
      resolve(bestText.trim());
    };
    recognition.onstart = () => {
      state.recording = true;
      setVoiceState(prefix, "Listening to your answer...", true);
    };
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${text} `;
        else interimText += `${text} `;
      }
      bestText = `${bestText} ${finalText || interimText}`.trim();
      if ($(targetId)) $(targetId).value = bestText;
      if (finalText.trim()) recognition.stop();
    };
    recognition.onerror = (event) => {
      window.clearTimeout(timer);
      state.recording = false;
      setVoiceState(prefix, "Recognition failed", false);
      reject(new Error(event.error || "Speech recognition failed"));
    };
    recognition.onend = finish;
    state.recognition = recognition;
    recognition.start();
  });
}

async function startVoiceSpeaking(prefix, setTitle) {
  state.autoSpeaking[prefix] = true;
  state.speakingSessions[prefix] = { set: setTitle, part: "part1", history: [] };
  setSpeakingTimer(prefix, "part1");
  startSpeakingTimer(prefix);
  $(`${prefix}-speaking-log`).innerHTML = "";
  $(`${prefix}-speaking`).value = "";
  while (state.autoSpeaking[prefix]) {
    try {
      setVoiceState(prefix, "Examiner is asking...", false);
      await askSpeakingQuestion(prefix, setTitle);
      if (!state.autoSpeaking[prefix]) break;
      const answer = await captureSpeechOnce(prefix, `${prefix}-speaking`);
      if (!state.autoSpeaking[prefix]) break;
      if (!answer) {
        appendDialogue(prefix, "candidate", "[No clear answer detected]");
        setVoiceState(prefix, "Waiting for a clear answer", false);
        state.autoSpeaking[prefix] = false;
        break;
      }
      appendDialogue(prefix, "candidate", answer);
      $(`${prefix}-speaking`).value = "";
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    } catch (error) {
      appendDialogue(prefix, "candidate", `[Voice input stopped: ${error.message}]`);
      setVoiceState(prefix, "Stopped", false);
      state.autoSpeaking[prefix] = false;
    }
  }
}

async function sendSpeakingAnswer(prefix, setTitle) {
  const answerNode = $(`${prefix}-speaking`);
  const answer = answerNode.value.trim();
  if (!answer) {
    alert("Please enter an answer first.");
    return;
  }
  appendDialogue(prefix, "candidate", answer);
  answerNode.value = "";
  await askSpeakingQuestion(prefix, setTitle);
}

function getSpeakingTranscript(prefix) {
  const session = state.speakingSessions[prefix];
  if (!session?.history?.length) return $(`${prefix}-speaking`)?.value || "";
  return session.history
    .map((item) => `${item.role === "examiner" ? "Examiner" : "Candidate"}: ${item.text}`)
    .join("\n");
}

function speakingDurationForPart(part) {
  if (part === "part2-prep") return 60;
  if (part === "part2") return 120;
  return 300;
}

function speakingPhaseLabel(part) {
  if (part === "part2-prep") return "Part 2 preparation";
  if (part === "part2") return "Part 2 long turn";
  if (part === "part3") return "Part 3 discussion";
  return "Part 1 interview";
}

function renderSpeakingTimer(prefix) {
  const timer = state.speakingTimers[prefix] || { seconds: 300, phase: "part1", running: false };
  const m = String(Math.floor(timer.seconds / 60)).padStart(2, "0");
  const s = String(timer.seconds % 60).padStart(2, "0");
  const timeNode = $(`${prefix}-speaking-timer`);
  const phaseNode = $(`${prefix}-speaking-phase`);
  if (timeNode) timeNode.textContent = `${m}:${s}`;
  if (phaseNode) phaseNode.textContent = speakingPhaseLabel(timer.phase);
}

function setSpeakingTimer(prefix, phase) {
  if (state.speakingTimers[prefix]?.id) clearInterval(state.speakingTimers[prefix].id);
  state.speakingTimers[prefix] = {
    phase,
    seconds: speakingDurationForPart(phase),
    id: null,
  };
  renderSpeakingTimer(prefix);
}

function startSpeakingTimer(prefix) {
  const session = ensureSpeakingSession(prefix, "");
  const phase = session.part === "part2" && !state.speakingTimers[prefix] ? "part2-prep" : session.part;
  if (!state.speakingTimers[prefix]) setSpeakingTimer(prefix, phase);
  const timer = state.speakingTimers[prefix];
  if (timer.id) return;
  timer.id = setInterval(() => {
    timer.seconds = Math.max(0, timer.seconds - 1);
    renderSpeakingTimer(prefix);
    if (timer.seconds === 0) {
      clearInterval(timer.id);
      timer.id = null;
      if (timer.phase === "part2-prep") {
        setSpeakingTimer(prefix, "part2");
        startSpeakingTimer(prefix);
      }
    }
  }, 1000);
}

async function finishSpeakingScore(prefix, setTitle, feedbackId = "singleFeedback", modeId = "singleMode") {
  stopVoiceSpeaking(prefix);
  setFeedback(feedbackId, "Scoring...", modeId, "");
  try {
    const transcript = getSpeakingTranscript(prefix);
    const json = await postJson("/api/speaking/feedback", { set: setTitle, transcript });
    const band = speakingBandFromFeedbackPayload(json.feedback, json.band);
    if (band || json.feedback) updateSpeakingScorePanel(prefix, json.feedback || "", band);
    setFeedbackHtml(feedbackId, renderSpeakingResultHtml(json.feedback, json, band, prefix), modeId, json.mode);
  } catch (error) {
    setFeedback(feedbackId, `Submission failed: ${error.message}`, modeId, "error");
  }
}

function speakingFeedbackTargets(prefix) {
  if (prefix === "exam") return { feedbackId: "examFeedback", modeId: "examMode" };
  if (prefix === "sequence") return { feedbackId: "sequenceFeedback", modeId: "sequenceMode" };
  if (prefix === "bank") return { feedbackId: "bankFeedback", modeId: "bankMode" };
  return { feedbackId: "singleFeedback", modeId: "singleMode" };
}

function revealSpeakingResult(prefix) {
  const targets = speakingFeedbackTargets(prefix);
  const result = $(`${targets.feedbackId}`)?.querySelector(".speaking-result-page");
  if (!result) return false;
  exitImmersiveMode();
  result.setAttribute("tabindex", "-1");
  window.setTimeout(() => {
    result.scrollIntoView({ behavior: "smooth", block: "start" });
    result.focus({ preventScroll: true });
  }, 120);
  return true;
}

async function scoreSpeakingText(prefix, setTitle, feedbackId, modeId) {
  const targets = {
    ...speakingFeedbackTargets(prefix),
    ...(feedbackId ? { feedbackId } : {}),
    ...(modeId ? { modeId } : {}),
  };
  const transcript = ($(`${prefix}-speaking`)?.value || getSpeakingTranscript(prefix) || "").trim();
  if (!transcript) {
    setFeedback(targets.feedbackId, "Type or paste a speaking answer first, or complete a live speaking test and then score it.", targets.modeId, "error");
    return null;
  }
  setFeedback(targets.feedbackId, "Scoring speaking text...", targets.modeId, "");
  const json = await postJson("/api/speaking/feedback", { set: setTitle || "", transcript });
  const band = speakingBandFromFeedbackPayload(json.feedback, json.band);
  if (band || json.feedback) updateSpeakingScorePanel(prefix, json.feedback || "", band);
  setFeedbackHtml(targets.feedbackId, renderSpeakingResultHtml(json.feedback, json, band, prefix), targets.modeId, json.mode);
  return json;
}

function qwenSession(prefix) {
  if (!state.qwenSpeaking[prefix]) {
    state.qwenSpeaking[prefix] = {
      ws: null,
      pc: null,
      dataChannel: null,
      remoteAudio: null,
      remoteStream: null,
      webrtcControlTimer: null,
      webrtcSessionTimer: null,
      webRtcSubmitWatchdogTimer: null,
      proactiveRenewalTimer: null,
      proactiveRenewalInFlight: false,
      realtimeSegmentStartedAt: 0,
      connectionRecoveryTimer: null,
      connectionRecovering: false,
      connectionRecoveryAttempts: 0,
      suppressConnectionRecovery: false,
      lastDisconnectReason: "",
      wakeLock: null,
      wakeLockRequested: false,
      wakeLockReleaseHandler: null,
      webrtcAudioSender: null,
      webrtcAudioTrack: null,
      webrtcAudioSending: false,
      webrtcMediaUngated: false,
      transport: "",
      httpSessionId: "",
      pollTimer: null,
      heartbeatTimer: null,
      micAudioQueue: [],
      micAudioFlushTimer: null,
      inputContext: null,
      outputContext: null,
      playbackSources: new Set(),
      recordingContext: null,
      micStream: null,
      sourceNode: null,
      workletNode: null,
      scriptNode: null,
      silentGain: null,
      recordingDestination: null,
      recordingMicSource: null,
      recordingRemoteSource: null,
      recordingPlaybackCursor: 0,
      micActive: false,
      outputUnlocked: false,
      pcmBuffer: [],
      pcmPosition: 0,
      recorder: null,
      recordingChunks: [],
      recordingMime: "",
      recordingBlob: null,
      recordingDataUrl: "",
      recordingReady: null,
      recordingResult: null,
      connected: false,
      userDisconnected: false,
      openingRequested: false,
      turnCommitted: false,
      inputPaused: false,
      waitingForResponse: false,
      responseRetryCount: 0,
      autoCommitTimer: null,
      autoCommitInterval: null,
      commitWatchdogTimer: null,
      webRtcTurnTimer: null,
      webRtcFallbackTimer: null,
      autoScoreTimer: null,
      autoScoreInFlight: false,
      lastAutoScoreKey: "",
      webRtcResponseRequested: false,
      serverTurnCommitted: false,
      webRtcLastCompletedAt: 0,
      nextQuestionPrepared: false,
      webRtcTurnPreparedForAnswer: false,
      askedQuestions: [],
      recentQuestions: [],
      candidateAnswers: [],
      candidateQuestions: [],
      dialogueTurns: [],
      adaptiveFollowUpCount: 0,
      lastAdaptiveAnswerFp: "",
      lastCandidateQuestionFp: "",
      lastCandidateTurnText: "",
      lastCandidateTurnKind: "",
      lastActionKind: "",
      sessionStartedAt: 0,
      practiceScope: "full",
      targetMs: 15 * 60 * 1000,
      countdownExpiredHandled: false,
      speakingPlan: null,
      scheduledAction: null,
      part1Index: 0,
      part3Index: 0,
      part2Delivered: false,
      fallbackQuestionIndex: 0,
      autoFinishPending: false,
      autoFinishStarted: false,
      finalScoreInFlight: false,
      voiceStarted: false,
      voiceStartAt: 0,
      voicedMs: 0,
      lastVoiceFrameAt: 0,
      lastVoiceAt: 0,
      lastHumanVoiceAt: 0,
      silenceSince: 0,
      noiseFloor: 0,
      speechFrameCount: 0,
      quietFrameCount: 0,
      lastMicPacketAt: 0,
      currentTurnBytes: 0,
      awaitingScore: false,
      scoreFilled: false,
      scoringText: "",
      realtimeScoreNote: "",
      realtimeScoreNoteResolve: null,
      scoreNoteInFlight: false,
      scoreNoteTimedOut: false,
      scoringProgressTimer: null,
      scoringProgressValue: 0,
      currentAssistantText: "",
      pendingAssistantText: "",
      assistantTextSource: "",
      scheduleAdvancedForResponse: false,
      lastFinalAssistantText: "",
      lastFinalAssistantAt: 0,
      candidateNode: null,
      currentCandidateText: "",
      lastCandidateText: "",
      lastCandidateAt: 0,
      assistantRenderId: null,
      pendingAudioChunks: [],
      realtimeEventTypes: [],
      audioRenderId: null,
      audioJitterStarted: false,
      responseActive: false,
      playbackTailTimer: null,
      playbackCursor: 0,
      playbackBlockedUntil: 0,
      assistantNode: null,
    };
  }
  return state.qwenSpeaking[prefix];
}

const QWEN_WS_AUDIO_BATCH_MS = 100;
const QWEN_HTTP_AUDIO_BATCH_MS = 80;
const QWEN_WS_AUDIO_BATCH_CHUNKS = 6;
const QWEN_HTTP_AUDIO_BATCH_CHUNKS = 12;
const QWEN_WEBRTC_SILENCE_MS = 1700;
const QWEN_WEBRTC_LOCAL_SILENCE_MS = 2600;
const QWEN_WEBRTC_SUBMIT_GRACE_MS = 2300;
const QWEN_WEBRTC_MIN_VOICED_MS = 500;
const QWEN_WEBRTC_MIN_TURN_BYTES = 14000;
const QWEN_WEBRTC_CAPTURE_SAMPLE_RATE = 16000;
const QWEN_WEBRTC_AUDIO_TAIL_MS = 420;
const QWEN_OPUS_MAX_AVERAGE_BITRATE = 16000;
const QWEN_PCM_TARGET_SAMPLE_RATE = 16000;
const QWEN_PCM_CHUNK_MS = 20;
const QWEN_WS_SILENCE_COMMIT_MS = 2800;
const QWEN_WS_ASR_STABLE_COMMIT_MS = 2200;
const QWEN_WS_MIN_VOICED_MS = 450;
const QWEN_WS_MIN_TURN_BYTES = 14000;
const QWEN_PLAYBACK_SAMPLE_RATE = 24000;
const QWEN_PLAYBACK_LEAD_SECONDS = 0.24;
const QWEN_PLAYBACK_BATCH_CHUNKS = 28;
const QWEN_PLAYBACK_INITIAL_JITTER_MS = 120;
const QWEN_SPEAKING_TARGET_MS = 15 * 60 * 1000;
const QWEN_SPEAKING_MIN_AUTO_FINISH_MS = QWEN_SPEAKING_TARGET_MS;
const QWEN_REALTIME_FLASH_CONTEXT_LIMIT_MS = 480 * 1000;
const QWEN_REALTIME_PLUS_CONTEXT_LIMIT_MS = 600 * 1000;
const QWEN_REALTIME_CONTEXT_SAFETY_MS = 70 * 1000;
const QWEN_REALTIME_RENEWAL_RETRY_MS = 2500;
const QWEN_RECORDING_UPLOAD_TIMEOUT_MS = 15_000;
const QWEN_RECORDING_DOWNLOAD_RETRY_TIMEOUT_MS = 30_000;

function qwenSpeakingScope(prefix) {
  const session = qwenSession(prefix);
  const panelScope = document.querySelector(`.qwen-speaking[data-prefix="${prefix}"]`)?.dataset?.speakingScope || "";
  return speakingPracticeScopeConfig(session.practiceScope || panelScope || "full").id;
}

function qwenSpeakingTargetMs(prefix) {
  const session = qwenSession(prefix);
  return Number(session.targetMs) || speakingPracticeScopeConfig(qwenSpeakingScope(prefix)).targetMs;
}

function qwenMicConstraints() {
  return {
    audio: {
      channelCount: { ideal: 1 },
      sampleRate: { ideal: QWEN_WEBRTC_CAPTURE_SAMPLE_RATE },
      sampleSize: { ideal: 16 },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };
}

function qwenSetWebRtcAudioSending(prefix, shouldSend) {
  const session = qwenSession(prefix);
  const canSend = !!shouldSend
    && session.transport === "webrtc"
    && session.connected
    && session.micActive
    && !session.inputPaused
    && !session.turnCommitted
    && !session.responseActive
    && !qwenOutputBusy(prefix);
  if (!session.webrtcAudioSender || !session.webrtcAudioTrack) return false;
  if (session.webrtcAudioSending === canSend) return true;
  session.webrtcAudioSending = canSend;
  // Keep the local mic track enabled so the browser-side VAD can still hear the student.
  // Token saving is done by detaching the WebRTC sender track, not by disabling capture.
  session.webrtcAudioTrack.enabled = true;
  session.webrtcAudioSender.replaceTrack(canSend ? session.webrtcAudioTrack : null).catch(() => {
    session.webrtcAudioSending = false;
    if (session.webrtcAudioTrack) session.webrtcAudioTrack.enabled = true;
  });
  return true;
}

function qwenApplyLowBandwidthAudioSdp(sdp) {
  return String(sdp || "");
}

function qwenSetStatus(prefix, text, active = false) {
  const node = $(`${prefix}-qwen-status`);
  if (node) {
    node.textContent = text;
    node.classList.toggle("active", active);
  }
  const normalized = String(text || "").toLowerCase();
  if (normalized.includes("error") || normalized.includes("failed") || normalized.includes("disconnected")) {
    qwenSession(prefix).connecting = false;
  }
  const shell = document.querySelector(`.qwen-speaking[data-prefix="${prefix}"]`);
  let phase = "ready";
  if (normalized.includes("scoring") || normalized.includes("score ready")) phase = "scoring";
  else if (normalized.includes("disconnected") || normalized.includes("complete")) phase = "complete";
  else if (normalized.includes("reconnect")) phase = "reconnecting";
  else if (normalized.includes("connecting")) phase = "checks";
  else if (normalized.includes("examiner speaking")) phase = "examiner";
  else if (normalized.includes("listening") || normalized.includes("connected") || normalized.includes("processing")) phase = "recording";
  shell?.setAttribute("data-speaking-phase", phase);
  if (phase === "complete") {
    const session = qwenSession(prefix);
    if (session.uiTimer) clearInterval(session.uiTimer);
    session.uiTimer = null;
  }
  if (normalized.includes("examiner speaking") || normalized.includes("preparing response")) {
    qwenSetSpeakingVisualState(prefix, "assistant");
  } else if (normalized.includes("listening")) {
    qwenSetSpeakingVisualState(prefix, "candidate");
  } else if (normalized.includes("disconnected") || normalized.includes("not started") || normalized.includes("connected")) {
    qwenSetSpeakingVisualState(prefix, "idle");
  }
}

function qwenUpdateExamMeta(prefix) {
  const session = qwenSession(prefix);
  const elapsed = session.sessionStartedAt ? Math.max(0, Math.floor((Date.now() - session.sessionStartedAt) / 1000)) : 0;
  const countdown = qwenSpeakingCountdownState(qwenSpeakingTargetMs(prefix), elapsed * 1000);
  const elapsedNode = $(`${prefix}-speaking-elapsed`);
  const partNode = $(`${prefix}-speaking-current-part`);
  if (elapsedNode) elapsedNode.textContent = countdown.label;
  if (partNode) partNode.textContent = session.scheduledAction?.part || speakingPracticeScopeConfig(qwenSpeakingScope(prefix)).label;
  const part = String(session.scheduledAction?.part || "");
  document.querySelectorAll(`.qwen-speaking[data-prefix="${prefix}"] [data-speaking-part2-cue]`).forEach((node) => {
    node.hidden = !/^Part 2/i.test(part);
  });
  if (countdown.expired && session.sessionStartedAt && !session.countdownExpiredHandled && !session.finalScoreInFlight) {
    session.countdownExpiredHandled = true;
    if (qwenWordCount(qwenBuildAutoScoreTranscript(prefix)) >= 12) {
      finishQwenSpeaking(prefix).catch((error) => qwenSetStatus(prefix, `Auto scoring failed: ${error.message}`, false));
    } else {
      qwenSetStatus(prefix, "Time is up · not enough speech to score", false);
    }
  }
}

function qwenClearScoringProgressTimer(prefix) {
  const session = qwenSession(prefix);
  if (session.scoringProgressTimer) clearInterval(session.scoringProgressTimer);
  session.scoringProgressTimer = null;
}

function qwenScoringStageForPercent(percent) {
  const value = Number(percent) || 0;
  if (value < 20) return "Preparing transcript...";
  if (value < 42) return "Reading the full answer...";
  if (value < 62) return "Checking FC, LR, GRA and pronunciation...";
  if (value < 82) return "Calculating the final band...";
  if (value < 96) return "Writing feedback...";
  return "Score ready";
}

function qwenSetScoringProgress(prefix, percent, label = "", visible = true) {
  const session = qwenSession(prefix);
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  session.scoringProgressValue = value;
  const progress = $(`${prefix}-scoring-progress`);
  if (progress) {
    progress.hidden = !visible;
    progress.classList.toggle("active", !!visible);
  }
  const bar = $(`${prefix}-scoring-bar`);
  if (bar) bar.style.width = `${value.toFixed(1)}%`;
  const percentNode = $(`${prefix}-scoring-percent`);
  if (percentNode) percentNode.textContent = `${Math.round(value)}%`;
  const labelNode = $(`${prefix}-scoring-label`);
  if (labelNode) labelNode.textContent = label || qwenScoringStageForPercent(value);
}

function qwenHideScoringProgress(prefix) {
  qwenClearScoringProgressTimer(prefix);
  qwenSetScoringProgress(prefix, 0, "Preparing scoring...", false);
}

function qwenStartFakeScoringProgress(prefix) {
  qwenClearScoringProgressTimer(prefix);
  qwenSetScoringProgress(prefix, 8, "Preparing transcript...", true);
  const session = qwenSession(prefix);
  const startedAt = Date.now();
  session.scoringProgressTimer = window.setInterval(() => {
    const elapsedMs = Date.now() - startedAt;
    const ceiling = elapsedMs < 2600 ? 46 : elapsedMs < 7000 ? 74 : 91;
    const current = Number(session.scoringProgressValue || 0);
    const next = Math.min(91, current + Math.max(0.7, (ceiling - current) * 0.08));
    qwenSetScoringProgress(prefix, next, qwenScoringStageForPercent(next), true);
  }, 650);
}

function qwenStopFakeScoringProgress(prefix, label = "Score ready") {
  qwenClearScoringProgressTimer(prefix);
  qwenSetScoringProgress(prefix, 100, label, true);
}

function qwenSetSpeakingVisualState(prefix, mode = "idle") {
  const panel = document.querySelector(`.qwen-speaking[data-prefix="${prefix}"]`);
  const assistant = mode === "assistant";
  const candidate = mode === "candidate";
  if (panel) {
    panel.classList.toggle("assistant-speaking", assistant);
    panel.classList.toggle("candidate-speaking", candidate);
    panel.classList.toggle("voice-idle", !assistant && !candidate);
  }
  const orb = $(`${prefix}-speaking-orb`);
  if (orb) {
    orb.classList.toggle("assistant-speaking", assistant);
    orb.classList.toggle("candidate-speaking", candidate);
    if (assistant) orb.style.setProperty("--voice-level", "0.72");
    else if (!candidate) orb.style.setProperty("--voice-level", "0");
  }
}

function qwenHasMinimumWsTurn(session) {
  if (!session?.voiceStarted) return false;
  const bytes = session.currentTurnBytes || 0;
  return bytes >= QWEN_WS_MIN_TURN_BYTES && ((session.voicedMs || 0) >= QWEN_WS_MIN_VOICED_MS || bytes >= 64_000);
}

function qwenVoiceThresholds(session) {
  const noiseFloor = Number(session?.noiseFloor || 0);
  return {
    start: Math.max(0.008, Math.min(0.024, noiseFloor * 1.75 || 0.008)),
    continue: Math.max(0.005, Math.min(0.016, noiseFloor * 1.15 || 0.005)),
  };
}

function qwenUpdateWsHumanVoice(prefix, level) {
  const session = qwenSession(prefix);
  const now = Date.now();
  const speechLevel = Number(level || 0);
  if (!session.noiseFloor) session.noiseFloor = Math.max(0.0015, Math.min(0.012, speechLevel || 0.003));
  const thresholds = qwenVoiceThresholds(session);
  const clearSpeech = speechLevel >= thresholds.start;
  const possibleSpeech = speechLevel >= thresholds.continue;
  if (!session.voiceStarted || !possibleSpeech) {
    const alpha = clearSpeech ? 0.995 : 0.965;
    session.noiseFloor = (session.noiseFloor * alpha) + (speechLevel * (1 - alpha));
  }
  if (clearSpeech) {
    session.speechFrameCount += 1;
    session.quietFrameCount = 0;
    if (session.speechFrameCount >= 3 && speechLevel >= Math.max(0.010, thresholds.start * 1.15)) session.lastHumanVoiceAt = now;
    return { active: session.speechFrameCount >= 3, clearSpeech: true, thresholds };
  }
  if (session.voiceStarted && possibleSpeech && session.speechFrameCount >= 3) {
    session.quietFrameCount = 0;
    if (speechLevel >= Math.max(0.010, thresholds.start * 1.05)) session.lastHumanVoiceAt = now;
    return { active: true, clearSpeech: false, thresholds };
  }
  session.quietFrameCount += 1;
  if (session.quietFrameCount >= 4) session.speechFrameCount = 0;
  return { active: false, clearSpeech: false, thresholds };
}

function qwenWsHumanVoiceStopped(session, now = Date.now()) {
  const lastTranscriptAt = Number(session.lastCandidateAt || 0);
  const lastHumanVoiceAt = Number(session.lastHumanVoiceAt || session.lastVoiceAt || 0);
  const lastRealVoiceActivityAt = Math.max(lastHumanVoiceAt, lastTranscriptAt);
  const localQuiet = lastRealVoiceActivityAt ? now - lastRealVoiceActivityAt >= QWEN_WS_SILENCE_COMMIT_MS : false;
  const transcriptStable = lastTranscriptAt ? now - lastTranscriptAt >= QWEN_WS_ASR_STABLE_COMMIT_MS : true;
  return localQuiet && transcriptStable;
}

function qwenMaybeCommitWsAnswer(prefix) {
  const session = qwenSession(prefix);
  if (session.transport === "webrtc" || !session.micActive || !session.connected || session.awaitingScore || session.turnCommitted) return false;
  if (qwenOutputBusy(prefix)) return false;
  if (!qwenHasMinimumWsTurn(session)) return false;
  if (qwenWsHumanVoiceStopped(session)) {
    commitQwenAnswer(prefix);
    return true;
  }
  return false;
}

function startQwenAutoCommitLoop(prefix) {
  const session = qwenSession(prefix);
  if (session.autoCommitInterval || session.transport === "webrtc") return;
  session.autoCommitInterval = setInterval(() => {
    const current = qwenSession(prefix);
    if (!current.micActive || !current.connected || current.transport === "webrtc") {
      stopQwenAutoCommitLoop(prefix);
      return;
    }
    qwenMaybeCommitWsAnswer(prefix);
  }, 750);
}

function stopQwenAutoCommitLoop(prefix) {
  const session = qwenSession(prefix);
  if (session.autoCommitInterval) clearInterval(session.autoCommitInterval);
  session.autoCommitInterval = null;
}

async function qwenRuntimeConfig() {
  if (state.qwenRuntime && Date.now() - state.qwenRuntimeLoadedAt < 60_000) return state.qwenRuntime;
  try {
    const config = await getJson("/api/qwen-runtime");
    state.qwenRuntime = config;
    state.qwenRuntimeLoadedAt = Date.now();
    return config;
  } catch {
    return { webrtcEnabled: true, webrtcMode: "auto" };
  }
}

async function qwenShouldTryWebRtc(prefix = "") {
  // Single-module practice needs visible transcript and reliable turn-taking.
  // Use the Singapore WebSocket realtime path there; full exams can still prefer WebRTC.
  if (prefix === "single" || prefix === "bank") return false;
  const config = await qwenRuntimeConfig();
  return config.webrtcEnabled !== false && config.webrtcMode !== "off";
}

function qwenSetControls(prefix, connected) {
  if (connected) qwenSession(prefix).connecting = false;
  document.querySelectorAll(`.qwen-speaking [data-prefix="${prefix}"]`).forEach((button) => {
    const currentSession = qwenSession(prefix);
    const transport = currentSession.transport;
    const usingWebRtc = transport === "webrtc" || !!currentSession.pc;
    if (button.classList.contains("start-qwen-speaking")) button.disabled = connected;
    if (button.classList.contains("qwen-mic-toggle")) button.disabled = !connected;
    if (button.classList.contains("qwen-commit-answer")) {
      button.disabled = !connected || usingWebRtc;
      button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
    }
    if (button.classList.contains("qwen-finish-score")) button.disabled = !connected;
    if (button.classList.contains("qwen-disconnect")) button.disabled = !connected;
  });
}

function qwenSetRecoveringControls(prefix) {
  qwenSetControls(prefix, false);
  document.querySelectorAll(`.start-qwen-speaking[data-prefix="${prefix}"]`).forEach((button) => {
    button.disabled = true;
  });
  document.querySelectorAll(`.qwen-disconnect[data-prefix="${prefix}"]`).forEach((button) => {
    button.disabled = false;
  });
}

function stopQwenHeartbeat(prefix) {
  const session = qwenSession(prefix);
  if (session.heartbeatTimer) clearInterval(session.heartbeatTimer);
  session.heartbeatTimer = null;
}

function startQwenHeartbeat(prefix) {
  const session = qwenSession(prefix);
  stopQwenHeartbeat(prefix);
  session.heartbeatTimer = setInterval(() => {
    const current = qwenSession(prefix);
    if (!current.connected) return;
    if (current.transport === "ws" && current.ws?.readyState === WebSocket.OPEN) {
      qwenSendNow(prefix, { type: "ping", at: Date.now() });
    } else if (current.transport === "http" && current.httpSessionId) {
      fetch(`/api/qwen-session/${current.httpSessionId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "ping", at: Date.now() }),
      }).catch(() => {});
    }
  }, 10_000);
}

function qwenRealtimeContextLimitMs() {
  const model = String(state.qwenRuntime?.realtimeModel || "").toLowerCase();
  if (model.includes("plus")) return QWEN_REALTIME_PLUS_CONTEXT_LIMIT_MS;
  if (model.includes("flash")) return QWEN_REALTIME_FLASH_CONTEXT_LIMIT_MS;
  return QWEN_REALTIME_FLASH_CONTEXT_LIMIT_MS;
}

function qwenRealtimeRenewalDelayMs() {
  return Math.max(3 * 60 * 1000, qwenRealtimeContextLimitMs() - QWEN_REALTIME_CONTEXT_SAFETY_MS);
}

function stopQwenProactiveRenewal(prefix) {
  const session = qwenSession(prefix);
  if (session.proactiveRenewalTimer) clearTimeout(session.proactiveRenewalTimer);
  session.proactiveRenewalTimer = null;
  session.proactiveRenewalInFlight = false;
}

function qwenSegmentRenewalBusy(prefix) {
  const session = qwenSession(prefix);
  const now = Date.now();
  const recentHumanVoice = session.lastHumanVoiceAt && now - session.lastHumanVoiceAt < 5000;
  return Boolean(
    session.waitingForResponse
    || session.turnCommitted
    || session.responseActive
    || session.awaitingScore
    || qwenOutputBusy(prefix)
    || session.voiceStarted
    || (session.currentTurnBytes || 0) > 0
    || recentHumanVoice
  );
}

function scheduleQwenProactiveRenewal(prefix, delayMs = qwenRealtimeRenewalDelayMs()) {
  const session = qwenSession(prefix);
  if (session.userDisconnected || session.finalScoreInFlight || session.autoFinishStarted) return;
  if (session.proactiveRenewalTimer) clearTimeout(session.proactiveRenewalTimer);
  session.proactiveRenewalTimer = window.setTimeout(() => {
    qwenMaybeRenewRealtimeSegment(prefix);
  }, Math.max(1500, delayMs));
}

function markQwenRealtimeSegmentStarted(prefix) {
  const session = qwenSession(prefix);
  session.realtimeSegmentStartedAt = Date.now();
  session.proactiveRenewalInFlight = false;
  scheduleQwenProactiveRenewal(prefix);
}

function qwenMaybeRenewRealtimeSegment(prefix) {
  const session = qwenSession(prefix);
  session.proactiveRenewalTimer = null;
  if (!qwenShouldRecoverConnection(session) || !session.connected || session.transport === "http") return;
  if (qwenSegmentRenewalBusy(prefix)) {
    scheduleQwenProactiveRenewal(prefix, QWEN_REALTIME_RENEWAL_RETRY_MS);
    return;
  }
  session.proactiveRenewalInFlight = true;
  scheduleQwenConnectionRecovery(prefix, "Realtime context refresh before provider audio limit", { proactive: true });
}

function qwenCanRequestWakeLock() {
  return Boolean(navigator.wakeLock?.request)
    && document.visibilityState === "visible"
    && window.isSecureContext !== false;
}

function qwenWakeLockSessionActive(session) {
  return Boolean(session)
    && !session.userDisconnected
    && (
      session.connected
      || session.micActive
      || session.openingRequested
      || session.connectionRecovering
      || session.finalScoreInFlight
      || Boolean(session.transport)
    );
}

async function requestQwenWakeLock(prefix) {
  const session = qwenSession(prefix);
  session.wakeLockRequested = true;
  if (session.userDisconnected || !qwenCanRequestWakeLock()) return false;
  if (session.wakeLock && !session.wakeLock.released) return true;
  try {
    const lock = await navigator.wakeLock.request("screen");
    const handleRelease = () => {
      if (session.wakeLock === lock) {
        session.wakeLock = null;
        session.wakeLockReleaseHandler = null;
      }
    };
    session.wakeLock = lock;
    session.wakeLockReleaseHandler = handleRelease;
    lock.addEventListener?.("release", handleRelease, { once: true });
    return true;
  } catch {
    session.wakeLock = null;
    session.wakeLockReleaseHandler = null;
    return false;
  }
}

async function releaseQwenWakeLock(prefix) {
  const session = qwenSession(prefix);
  session.wakeLockRequested = false;
  const lock = session.wakeLock;
  const releaseHandler = session.wakeLockReleaseHandler;
  session.wakeLock = null;
  session.wakeLockReleaseHandler = null;
  if (!lock) return;
  try {
    if (releaseHandler) lock.removeEventListener?.("release", releaseHandler);
    if (!lock.released) await lock.release?.();
  } catch {
    // Wake Lock can already be released by the browser when the tab is hidden.
  }
}

function refreshQwenWakeLocksOnVisibility() {
  if (document.visibilityState !== "visible") return;
  Object.keys(state.qwenSpeaking || {}).forEach((prefix) => {
    const session = state.qwenSpeaking[prefix];
    if (session?.wakeLockRequested && qwenWakeLockSessionActive(session)) {
      void requestQwenWakeLock(prefix);
    }
  });
}

function bindQwenWakeLockEvents() {
  if (state.qwenWakeLockEventsBound) return;
  state.qwenWakeLockEventsBound = true;
  document.addEventListener("visibilitychange", refreshQwenWakeLocksOnVisibility);
}

function qwenShouldRecoverConnection(session) {
  return Boolean(session)
    && !session.userDisconnected
    && !session.finalScoreInFlight
    && !session.autoFinishStarted
    && !session.connectionRecovering
    && !session.suppressConnectionRecovery;
}

function qwenRecoveryInstructions(prefix, reason = "connection lost") {
  const session = qwenSession(prefix);
  const time = qwenSpeakingTimeStatus(prefix);
  const transcript = qwenBuildAutoScoreTranscript(prefix);
  const asked = session.askedQuestions?.length
    ? session.askedQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "None yet.";
  const scheduled = session.scheduledAction
    ? `${session.scheduledAction.part || "Unknown"} · ${session.scheduledAction.label || ""}: ${compactDialogueText(session.scheduledAction.text || "").slice(0, 320)}`
    : "No scheduled anchor is active.";
  return [
    $(`${prefix}-qwen-prompt`)?.value || "You are a professional IELTS Speaking examiner.",
    "",
    "Technical reconnection context. Continue the same IELTS Speaking test; do not restart the test.",
    `Reconnect reason: ${reason}.`,
    `Elapsed speaking time: ${time.elapsedLabel}. Target: 15:00.`,
    `Current IELTS anchor: ${scheduled}`,
    "Do not greet again. Do not ask 'How are you?' or 'Are you ready?'.",
    "Do not repeat the opening, candidate identity checks, or any previous IELTS question.",
    "Preserve the previous context and never repeat a question already asked.",
    "When the candidate speaks again, continue naturally from the transcript and the planned Part 1/2/3 anchor.",
    "",
    "Already asked questions:",
    asked,
    "",
    "Conversation transcript so far:",
    transcript || "(No reliable transcript yet.)",
  ].join("\n");
}

function scheduleQwenConnectionRecovery(prefix, reason = "connection lost", options = {}) {
  const session = qwenSession(prefix);
  if (!qwenShouldRecoverConnection(session)) return false;
  const interruptedExaminerText = compactDialogueText(session.pendingAssistantText || session.currentAssistantText || "");
  if (interruptedExaminerText) {
    qwenRememberExaminerQuestion(prefix, interruptedExaminerText);
    session.scheduledAction = null;
    session.nextQuestionPrepared = false;
    session.webRtcTurnPreparedForAnswer = false;
  }
  const proactive = Boolean(options.proactive);
  session.connectionRecovering = true;
  session.connected = false;
  session.lastDisconnectReason = reason;
  session.connectionRecoveryAttempts = proactive ? 0 : Math.min((session.connectionRecoveryAttempts || 0) + 1, 8);
  const delay = proactive ? 250 : Math.min(6000, 900 + session.connectionRecoveryAttempts * 450);
  qwenSetRecoveringControls(prefix);
  qwenSetStatus(prefix, proactive ? "Refreshing speaking connection..." : "Connection interrupted. Reconnecting...", true);
  if (!proactive && session.connectionRecoveryAttempts === 1) {
    qwenAddBubble(prefix, "system", "Connection interrupted. Reconnecting automatically; keep this page open.");
  }
  stopQwenHeartbeat(prefix);
  if (session.connectionRecoveryTimer) clearTimeout(session.connectionRecoveryTimer);
  session.connectionRecoveryTimer = window.setTimeout(async () => {
    session.connectionRecoveryTimer = null;
    if (session.userDisconnected || session.finalScoreInFlight || session.autoFinishStarted) {
      session.connectionRecovering = false;
      return;
    }
    try {
      await stopQwenMic(prefix, false);
      qwenCloseWebRtc(prefix);
      if (session.ws?.readyState === WebSocket.OPEN || session.ws?.readyState === WebSocket.CONNECTING) {
        session.ws.close(1000, "recovering connection");
      }
      session.ws = null;
      session.httpSessionId = "";
      session.transport = "";
      session.openingRequested = true;
      startQwenWebSocket(prefix, qwenRecoveryInstructions(prefix, reason), { recovery: true });
    } catch (error) {
      session.connectionRecovering = false;
      qwenSetStatus(prefix, `Reconnect failed: ${error.message}`, false);
    }
  }, delay);
  return true;
}

function clearQwenCommitWatchdog(prefix) {
  const session = qwenSession(prefix);
  if (session.commitWatchdogTimer) clearTimeout(session.commitWatchdogTimer);
  session.commitWatchdogTimer = null;
}

function clearQwenWebRtcTurnTimer(prefix) {
  const session = qwenSession(prefix);
  if (session.webRtcTurnTimer) clearTimeout(session.webRtcTurnTimer);
  session.webRtcTurnTimer = null;
}

function clearQwenWebRtcFallbackTimer(prefix) {
  const session = qwenSession(prefix);
  if (session.webRtcFallbackTimer) clearTimeout(session.webRtcFallbackTimer);
  session.webRtcFallbackTimer = null;
}

function clearQwenWebRtcSubmitWatchdog(prefix) {
  const session = qwenSession(prefix);
  if (session.webRtcSubmitWatchdogTimer) clearInterval(session.webRtcSubmitWatchdogTimer);
  session.webRtcSubmitWatchdogTimer = null;
}

function qwenShouldSubmitCompletedWebRtcTurn(prefix) {
  const session = qwenSession(prefix);
  if (session.transport !== "webrtc" || !session.connected || session.awaitingScore) return false;
  if (!session.serverTurnCommitted || session.turnCommitted || session.waitingForResponse || session.responseActive) return false;
  if (!qwenLatestTurnCandidateText(session) && !session.voiceStarted && (session.currentTurnBytes || 0) < QWEN_WEBRTC_MIN_TURN_BYTES) return false;
  const latestActivityAt = Math.max(
    Number(session.lastCandidateAt || 0),
    Number(session.lastVoiceAt || 0),
    Number(session.webRtcLastCompletedAt || 0),
  );
  return !latestActivityAt || Date.now() - latestActivityAt >= QWEN_WEBRTC_SUBMIT_GRACE_MS;
}

function startQwenWebRtcSubmitWatchdog(prefix) {
  const session = qwenSession(prefix);
  if (session.webRtcSubmitWatchdogTimer) return;
  session.webRtcSubmitWatchdogTimer = setInterval(() => {
    if (!session.connected || session.transport !== "webrtc" || session.awaitingScore || session.turnCommitted || session.waitingForResponse || session.responseActive) {
      clearQwenWebRtcSubmitWatchdog(prefix);
      return;
    }
    if (qwenShouldSubmitCompletedWebRtcTurn(prefix)) {
      clearQwenWebRtcSubmitWatchdog(prefix);
      qwenRequestWebRtcResponse(prefix, "completed-turn-grace");
    }
  }, 250);
}

function scheduleQwenCommitWatchdog(prefix) {
  const session = qwenSession(prefix);
  clearQwenCommitWatchdog(prefix);
  session.commitWatchdogTimer = setTimeout(() => {
    if (!session.connected || session.awaitingScore || !session.waitingForResponse) return;
    if (session.responseActive) {
      clearQwenCommitWatchdog(prefix);
      return;
    }
    qwenSetStatus(prefix, "Still waiting for the examiner...", true);
    scheduleQwenCommitWatchdog(prefix);
  }, 12000);
}

function qwenHasEnoughWebRtcAnswer(session) {
  const answerText = qwenLatestTurnCandidateText(session);
  return qwenWordCount(answerText) >= 2
    || (session.voicedMs || 0) >= QWEN_WEBRTC_MIN_VOICED_MS
    || (session.currentTurnBytes || 0) >= QWEN_WEBRTC_MIN_TURN_BYTES;
}

function qwenRequestWebRtcResponse(prefix, reason = "silence") {
  const session = qwenSession(prefix);
  if (session.transport !== "webrtc" || session.dataChannel?.readyState !== "open") return false;
  if (!session.connected || session.awaitingScore || session.turnCommitted || session.waitingForResponse) return false;
  if (session.responseActive || qwenOutputBusy(prefix)) return false;
  if (!session.voiceStarted && !session.currentCandidateText && !session.lastCandidateText) return false;
  if (!qwenHasEnoughWebRtcAnswer(session)) return false;

  const needsManualCommit = !session.serverTurnCommitted;
  qwenSetWebRtcAudioSending(prefix, false);
  session.turnCommitted = true;
  session.inputPaused = true;
  session.waitingForResponse = true;
  session.webRtcResponseRequested = true;
  session.responseRetryCount = 0;
  clearQwenWebRtcTurnTimer(prefix);
  clearQwenWebRtcFallbackTimer(prefix);
  clearQwenWebRtcSubmitWatchdog(prefix);
  clearQwenCommitWatchdog(prefix);
  const latestAnswer = qwenLatestTurnCandidateText(session);
  if (latestAnswer) qwenRememberCandidateAnswer(prefix, latestAnswer);
  const turnInstructions = qwenPrepareWebRtcTurnInstructions(prefix, { force: true, useLatestAnswer: !!latestAnswer });
  if (needsManualCommit) qwenSend(prefix, { type: "audio.commit" });
  qwenSetStatus(prefix, "Processing your answer...", true);
  window.setTimeout(() => {
    if (!session.connected || session.transport !== "webrtc" || !session.waitingForResponse || session.responseActive) return;
    qwenSend(prefix, { type: "response.create", instructions: turnInstructions || qwenTurnControlInstructions(prefix, "next-question") });
  }, turnInstructions ? 180 : 0);
  session.webRtcFallbackTimer = setTimeout(() => {
    if (!session.connected || session.transport !== "webrtc" || !session.waitingForResponse || session.responseActive) return;
    qwenSetStatus(prefix, "Still processing your answer...", true);
    qwenSend(prefix, { type: "response.create", instructions: turnInstructions || qwenTurnControlInstructions(prefix, "next-question") });
  }, 4500);
  scheduleQwenCommitWatchdog(prefix);
  return true;
}

function scheduleQwenWebRtcResponse(prefix, delayMs = QWEN_WEBRTC_LOCAL_SILENCE_MS) {
  const session = qwenSession(prefix);
  if (session.transport !== "webrtc" || session.turnCommitted || session.waitingForResponse || session.responseActive) return;
  clearQwenWebRtcTurnTimer(prefix);
  session.webRtcTurnTimer = setTimeout(() => {
    session.webRtcTurnTimer = null;
    const submitted = qwenRequestWebRtcResponse(prefix, "local-silence");
    const hasTurnContent = qwenLatestTurnCandidateText(session)
      || session.voiceStarted
      || (session.currentTurnBytes || 0) >= QWEN_WEBRTC_MIN_TURN_BYTES;
    if (!submitted
      && hasTurnContent
      && session.connected
      && session.transport === "webrtc"
      && !session.awaitingScore
      && !session.turnCommitted
      && !session.waitingForResponse
      && !session.responseActive
      && session.responseRetryCount < 8) {
      session.responseRetryCount += 1;
      scheduleQwenWebRtcResponse(prefix, 650);
    }
  }, delayMs);
}

function qwenPrepareWebRtcTurnInstructions(prefix, options = {}) {
  const session = qwenSession(prefix);
  if (session.transport !== "webrtc" || session.awaitingScore) return "";
  if (!options.force && session.webRtcTurnPreparedForAnswer) return "";
  if (options.useLatestAnswer) {
    session.scheduledAction = null;
    session.nextQuestionPrepared = false;
  }
  if (!session.nextQuestionPrepared || options.force) {
    qwenAdvanceScheduledAction(prefix, { allowAdaptive: options.useLatestAnswer !== false });
    session.nextQuestionPrepared = true;
  }
  session.webRtcTurnPreparedForAnswer = true;
  const instructions = qwenTurnControlInstructions(prefix, "next-question");
  qwenSend(prefix, {
    type: "session.update",
    instructions,
    voice: "Ethan",
    turnDetection: "server_vad",
    silenceDurationMs: QWEN_WEBRTC_SILENCE_MS,
    createResponse: false,
  });
  return instructions;
}

function qwenAutoScoreSetTitle(prefix) {
  const topic = qwenTopicPayload(prefix);
  return [topic.source, topic.title].filter(Boolean).join(" - ") || "IELTS Speaking";
}

function qwenBuildAutoScoreTranscript(prefix) {
  const session = qwenSession(prefix);
  const turns = Array.isArray(session.dialogueTurns) ? [...session.dialogueTurns] : [];
  const currentAnswer = compactDialogueText(session.currentCandidateText || session.lastCandidateText || "");
  if (currentAnswer && !qwenTurnAlreadyRecorded(turns, "Candidate", currentAnswer)) {
    turns.push({ role: "Candidate", text: currentAnswer, at: Date.now() });
  }
  if (turns.length) {
    return turns
      .filter((turn) => turn?.role && compactDialogueText(turn.text))
      .map((turn) => `${turn.role}: ${compactDialogueText(turn.text)}`)
      .join("\n")
      .trim();
  }
  const answers = [...(session.candidateAnswers || [])];
  if (currentAnswer
    && !qwenCandidateQuestionKind(currentAnswer)
    && !answers.some((item) => dialogueFingerprint(item) === dialogueFingerprint(currentAnswer))) {
    answers.push(currentAnswer);
  }
  const questions = session.askedQuestions || [];
  const lines = [];
  const max = Math.max(questions.length, answers.length);
  for (let index = 0; index < max; index += 1) {
    if (questions[index]) lines.push(`Examiner: ${questions[index]}`);
    if (answers[index]) lines.push(`Candidate: ${answers[index]}`);
  }
  return lines.join("\n").trim();
}

function qwenAutoScoreKey(prefix) {
  const transcript = qwenBuildAutoScoreTranscript(prefix);
  return dialogueFingerprint(transcript).slice(-240);
}

function qwenAudioEvidenceIsMp3(evidence) {
  const dataUrl = String(evidence?.dataUrl || "");
  const mime = String(evidence?.mime || "").toLowerCase();
  const fileName = String(evidence?.fileName || "").toLowerCase();
  return Boolean(dataUrl)
    && (evidence?.mode === "mp3" || mime.includes("mpeg") || fileName.endsWith(".mp3"))
    && /^data:audio\/(?:mpeg|mp3)[^,]*;base64,/i.test(dataUrl);
}

function qwenAudioEvidenceForScoring(evidence) {
  if (!evidence) return null;
  if (qwenAudioEvidenceIsMp3(evidence)) return evidence;
  return {
    mode: evidence.mode || "unavailable",
    fileName: evidence.fileName || "",
    warning: evidence.warning || "MP3 evidence is unavailable; scoring continues with transcript and realtime note.",
  };
}

function scheduleQwenAutoScore(prefix, delayMs = 1800) {
  const session = qwenSession(prefix);
  if (session.autoScoreTimer) clearTimeout(session.autoScoreTimer);
  session.autoScoreTimer = null;
}

async function qwenRunAutoScore(prefix, options = {}) {
  const session = qwenSession(prefix);
  const transcript = qwenBuildAutoScoreTranscript(prefix);
  if (qwenWordCount(transcript) < 12) {
    if (options.showProgress) qwenSetScoringProgress(prefix, 100, "Not enough speech to score yet.", true);
    return null;
  }
  const key = qwenAutoScoreKey(prefix);
  if (!options.force && (session.autoScoreInFlight || key === session.lastAutoScoreKey)) return null;
  session.autoScoreInFlight = true;
  session.lastAutoScoreKey = key;
  if (options.showStatus) qwenSetStatus(prefix, "Scoring speaking band...", true);
  if (options.showProgress) qwenSetScoringProgress(prefix, Math.max(session.scoringProgressValue || 0, 18), "Preparing transcript...", true);
  const audioEvidence = qwenAudioEvidenceForScoring(options.audioEvidence || session.recordingResult || null);
  try {
    if (options.showProgress) qwenSetScoringProgress(prefix, Math.max(session.scoringProgressValue || 0, 34), qwenAudioEvidenceIsMp3(audioEvidence) ? "Sending transcript, realtime note and MP3..." : "Sending transcript and realtime note...", true);
    const json = await postJson("/api/speaking/feedback", {
      set: qwenAutoScoreSetTitle(prefix),
      scope: qwenSpeakingScope(prefix),
      transcript,
      realtimeNote: options.realtimeNote || session.realtimeScoreNote || "",
      audioEvidence,
    });
    if (options.showProgress) qwenSetScoringProgress(prefix, Math.max(session.scoringProgressValue || 0, 86), "Formatting feedback...", true);
    const band = speakingBandFromFeedbackPayload(json.feedback, json.band);
    const canonicalJson = { ...json, band };
    if (band || json.feedback) {
      const saved = rememberSpeakingResult(buildSpeakingResultRecord(prefix, json.feedback || "", canonicalJson, band));
      canonicalJson.attemptId = saved.attemptId;
      renderDashboard();
    }
    if ((band || json.feedback) && options.fillScore) updateSpeakingScorePanel(prefix, json.feedback || "", band);
    if (options.showFeedback) {
      const targets = speakingFeedbackTargets(prefix);
      const finalLine = band ? `Final Speaking Band: ${band}` : "Final Speaking Band: unavailable";
      const feedbackText = [finalLine, json.feedback || ""].filter(Boolean).join("\n\n");
      setFeedbackHtml(targets.feedbackId, renderSpeakingResultHtml(feedbackText || `Speaking band: ${band || ""}`, canonicalJson, band, prefix), targets.modeId, json.mode || "");
    }
    if (options.showStatus) qwenSetStatus(prefix, band ? `Final Speaking Band: ${band}` : "Scoring complete", true);
    return canonicalJson;
  } catch (error) {
    if (options.showProgress) qwenSetScoringProgress(prefix, 100, "Scoring failed. Please try again.", true);
    if (options.showStatus) qwenSetStatus(prefix, `Scoring failed: ${error.message}`, false);
    return null;
  } finally {
    session.autoScoreInFlight = false;
  }
}

function qwenTranscriptVisible(prefix) {
  return prefix !== "exam";
}

function qwenAssistantTranscriptVisible(prefix) {
  return prefix !== "exam";
}

function qwenAddBubble(prefix, role, text) {
  if (role === "assistant" && $(`${prefix}-speaking-question`) && compactDialogueText(text)) {
    $(`${prefix}-speaking-question`).textContent = compactText(compactDialogueText(text), 260);
  }
  const log = $(`${prefix}-speaking-log`);
  if (!log || !qwenTranscriptVisible(prefix)) return null;
  const node = document.createElement("div");
  node.className = `dialogue-bubble ${role === "assistant" ? "examiner" : role === "user" ? "candidate" : "system"}`;
  node.textContent = text || "";
  log.append(node);
  while (log.children.length > 8) {
    log.removeChild(log.firstElementChild);
  }
  log.scrollTop = log.scrollHeight;
  return node;
}

function compactDialogueText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeRealtimeDialogueText(text, options = {}) {
  const value = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ");
  return options.trim ? value.trim() : value;
}

function normalizeAssistantDisplayText(text) {
  return normalizeRealtimeDialogueText(text, { trim: true })
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=[A-Za-z])/g, "$1 ")
    .replace(/\*\*(?=[A-Za-z])/g, "\n**")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dialogueFingerprint(text) {
  return compactDialogueText(text).toLowerCase().replace(/[^a-z0-9]+/gi, "");
}

function qwenQuestionIsDuplicate(askedQuestions, text) {
  const candidate = qwenExtractQuestion(text);
  const candidateFp = dialogueFingerprint(candidate);
  if (!candidateFp) return false;
  const stopWords = new Set(["a", "an", "and", "are", "can", "could", "did", "do", "does", "for", "how", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "what", "when", "where", "which", "who", "why", "would", "you", "your"]);
  const terms = (value) => (String(value || "").toLowerCase().match(/[a-z0-9']+/g) || []).filter((word) => !stopWords.has(word));
  const candidateTerms = new Set(terms(candidate));
  return (askedQuestions || []).some((asked) => {
    const askedQuestion = qwenExtractQuestion(asked);
    const askedFp = dialogueFingerprint(askedQuestion);
    if (!askedFp) return false;
    if (askedFp === candidateFp) return true;
    if (Math.min(askedFp.length, candidateFp.length) >= 24
      && (askedFp.includes(candidateFp) || candidateFp.includes(askedFp))) return true;
    const askedTerms = new Set(terms(askedQuestion));
    if (candidateTerms.size < 3 || askedTerms.size < 3) return false;
    const overlap = [...candidateTerms].filter((word) => askedTerms.has(word)).length;
    return overlap / Math.min(candidateTerms.size, askedTerms.size) >= 0.8;
  });
}

function qwenRecentQuestionLedger(identity = practiceCompletionIdentityKey()) {
  try {
    const store = JSON.parse(localStorage.getItem(speakingRecentQuestionsStoreKey) || "{}");
    const questions = store?.partitions?.[identity];
    return Array.isArray(questions) ? questions.map(compactDialogueText).filter(Boolean).slice(-40) : [];
  } catch {
    return [];
  }
}

function qwenRememberRecentQuestion(text, identity = practiceCompletionIdentityKey()) {
  const question = qwenExtractQuestion(text);
  if (!question) return false;
  let store = {};
  try { store = JSON.parse(localStorage.getItem(speakingRecentQuestionsStoreKey) || "{}"); } catch {}
  const partitions = store?.partitions && typeof store.partitions === "object" ? { ...store.partitions } : {};
  const current = Array.isArray(partitions[identity]) ? partitions[identity].map(compactDialogueText).filter(Boolean) : [];
  const withoutDuplicate = current.filter((item) => !qwenQuestionIsDuplicate([item], question));
  partitions[identity] = [...withoutDuplicate, question].slice(-40);
  localStorage.setItem(speakingRecentQuestionsStoreKey, JSON.stringify({ version: 1, partitions }));
  return true;
}

function qwenWordCount(text) {
  return compactDialogueText(text).split(/\s+/).filter(Boolean).length;
}

function qwenTopicPayload(prefix) {
  const raw = $(`${prefix}-qwen-topic-json`)?.value || "{}";
  try {
    const json = JSON.parse(raw);
    return json && typeof json === "object" ? json : {};
  } catch {
    return {};
  }
}

function qwenCleanSpeakingLine(text) {
  return compactDialogueText(text)
    .replace(/\[[^\]]*why[^\]]*\]/ig, "Why?")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+([?.!,])/g, "$1")
    .replace(/\?+\s*Why\?/i, "? Why?")
    .trim();
}

function qwenCleanCueCard(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => qwenCleanSpeakingLine(line))
    .filter((line) => line && !/^minutes?\.?$/i.test(line));
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function qwenUniqueLines(lines, limit = 12) {
  const seen = new Set();
  const out = [];
  for (const line of lines || []) {
    const clean = qwenCleanSpeakingLine(line);
    const fp = dialogueFingerprint(clean);
    if (!clean || clean.length < 5 || seen.has(fp)) continue;
    seen.add(fp);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

function qwenBuildSpeakingPlan(prefix) {
  const topic = qwenTopicPayload(prefix);
  const part1 = qwenUniqueLines(topic.part1, 5);
  const part3 = qwenUniqueLines(topic.part3, 7);
  const part2 = qwenCleanCueCard(topic.part2);
  const fallbackTitle = qwenCleanSpeakingLine(topic.title || "your studies and daily life");
  return {
    title: topic.title || "IELTS Speaking",
    source: topic.source || "",
    part1: part1.length ? part1 : [
      "What do you usually do on weekdays?",
      "Do you prefer spending time alone or with other people? Why?",
      "What kind of place do you like visiting in your free time?",
    ],
    part2: part2 || `Describe ${fallbackTitle}.\nYou should say what it is, when you first became interested in it, what you do about it, and explain why it is important to you.`,
    part3: part3.length ? part3 : [
      `Why do people find ${fallbackTitle} interesting?`,
      `How might ${fallbackTitle} change in the future?`,
      `Do older and younger people think differently about ${fallbackTitle}?`,
    ],
  };
}

function qwenResetExaminerSchedule(prefix) {
  const session = qwenSession(prefix);
  session.speakingPlan = qwenBuildSpeakingPlan(prefix);
  session.scheduledAction = null;
  const scope = qwenSpeakingScope(prefix);
  session.part1Index = scope === "full" || scope === "part1" ? 0 : session.speakingPlan.part1.length;
  session.part3Index = scope === "full" || scope === "part3" ? 0 : session.speakingPlan.part3.length;
  session.part2Delivered = scope !== "full" && scope !== "part2";
  session.fallbackQuestionIndex = 0;
  session.adaptiveFollowUpCount = 0;
  session.lastAdaptiveAnswerFp = "";
  session.lastCandidateQuestionFp = "";
  session.lastCandidateTurnText = "";
  session.lastCandidateTurnKind = "";
  session.lastActionKind = "";
  session.autoFinishPending = false;
  session.autoFinishStarted = false;
  session.finalScoreInFlight = false;
}

function qwenSpeakingElapsedMs(prefix) {
  const startedAt = Number(qwenSession(prefix).sessionStartedAt || 0);
  return startedAt ? Math.max(0, Date.now() - startedAt) : 0;
}

function qwenSpeakingMinimumReached(prefix) {
  return qwenSpeakingElapsedMs(prefix) >= qwenSpeakingTargetMs(prefix);
}

function qwenSpeakingTimeStatus(prefix) {
  const elapsedMs = qwenSpeakingElapsedMs(prefix);
  const remainingMs = Math.max(0, qwenSpeakingTargetMs(prefix) - elapsedMs);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  return {
    elapsedMs,
    remainingMs,
    elapsedLabel: `${elapsedMinutes}:${String(elapsedSeconds).padStart(2, "0")}`,
    remainingMinutes,
  };
}

function qwenBuildExtensionAction(prefix, plan) {
  const session = qwenSession(prefix);
  const time = qwenSpeakingTimeStatus(prefix);
  session.lastActionKind = "extension-follow-up";
  session.fallbackQuestionIndex += 1;
  const previousQuestion = qwenLastExaminerQuestion(session);
  const recentAnswer = session.lastCandidateTurnText || qwenLatestTurnCandidateText(session) || session.candidateAnswers?.at(-1) || "";
  const scopeConfig = speakingPracticeScopeConfig(qwenSpeakingScope(prefix));
  session.scheduledAction = {
    part: scopeConfig.id === "full" ? "Part 3" : scopeConfig.label,
    kind: "extension-follow-up",
    label: `Extended Part 3 follow-up ${session.fallbackQuestionIndex}`,
    previousQuestion,
    text: [
      "The imported topic-bank questions have been used, but the speaking test is not long enough yet.",
      `Elapsed speaking time: ${time.elapsedLabel}. Continue until the ${scopeConfig.label} countdown reaches zero before ending.`,
      "",
      "Topic set:",
      plan.title || "IELTS Speaking",
      "",
      "Candidate's latest answer:",
      recentAnswer ? recentAnswer.slice(0, 420) : "(not available)",
      "",
      `Ask one deeper IELTS ${scopeConfig.label} style follow-up. Stay inside the selected practice scope and do not repeat any previous question.`,
      "Do not repeat any previous question. Do not score or close the test yet.",
    ].join("\n"),
  };
  return session.scheduledAction;
}

function qwenPeekNextScheduledAction(prefix, plan) {
  const session = qwenSession(prefix);
  if (session.part1Index < Math.min(4, plan.part1.length)) {
    return {
      part: "Part 1",
      kind: "question",
      label: `Part 1 question ${session.part1Index + 1}`,
      text: plan.part1[session.part1Index],
    };
  }
  if (!session.part2Delivered) {
    return { part: "Part 2", kind: "cue-card", label: "Part 2 cue card", text: plan.part2 };
  }
  if (session.part3Index < Math.min(6, plan.part3.length)) {
    return {
      part: "Part 3",
      kind: "question",
      label: `Part 3 question ${session.part3Index + 1}`,
      text: plan.part3[session.part3Index],
    };
  }
  if (!qwenSpeakingMinimumReached(prefix)) {
    const time = qwenSpeakingTimeStatus(prefix);
    const scopeConfig = speakingPracticeScopeConfig(qwenSpeakingScope(prefix));
    const recentAnswer = session.lastCandidateTurnText || qwenLatestTurnCandidateText(session) || session.candidateAnswers?.at(-1) || "";
    return {
      part: scopeConfig.id === "full" ? "Part 3" : scopeConfig.label,
      kind: "extension-follow-up",
      label: `Extended Part 3 follow-up ${session.fallbackQuestionIndex + 1}`,
      previousQuestion: qwenLastExaminerQuestion(session),
      text: [
        "The imported topic-bank questions have been used, but the speaking test is not long enough yet.",
        `Elapsed speaking time: ${time.elapsedLabel}. Continue until the ${scopeConfig.label} countdown reaches zero before ending.`,
        "",
        "Topic set:",
        plan.title || "IELTS Speaking",
        "",
        "Candidate's latest answer:",
        recentAnswer ? recentAnswer.slice(0, 420) : "(not available)",
        "",
        `Ask one deeper IELTS ${scopeConfig.label} style follow-up. Stay inside the selected practice scope and do not repeat any previous question.`,
        "Do not repeat any previous question. Do not score or close the test yet.",
      ].join("\n"),
    };
  }
  return {
    part: "End",
    kind: "auto-finish",
    label: "End speaking test",
    text: "That is the end of the speaking test. Thank you.",
  };
}

function qwenShouldReturnToScheduledAnchor(prefix, nextAction) {
  const session = qwenSession(prefix);
  const elapsedMs = qwenSpeakingElapsedMs(prefix);
  if (!nextAction || nextAction.kind === "auto-finish") return true;
  if (nextAction.kind === "cue-card" && elapsedMs >= 4 * 60 * 1000) return true;
  if (nextAction.part === "Part 3" && session.part2Delivered && elapsedMs >= 7 * 60 * 1000) return true;
  return session.adaptiveFollowUpCount >= 2;
}

function qwenAdvanceScheduledAction(prefix, options = {}) {
  const session = qwenSession(prefix);
  const plan = session.speakingPlan || qwenBuildSpeakingPlan(prefix);
  session.speakingPlan = plan;
  const allowAdaptive = options.allowAdaptive !== false;
  const lastTurn = session.lastCandidateTurnText || "";
  const lastTurnFp = dialogueFingerprint(lastTurn);
  if (allowAdaptive
    && lastTurn
    && lastTurnFp
    && lastTurnFp !== session.lastAdaptiveAnswerFp) {
    const previousQuestion = qwenLastExaminerQuestion(session);
    const suggestedNext = qwenPeekNextScheduledAction(prefix, plan);
    if (suggestedNext.kind === "auto-finish") return qwenTakeNextScheduledAction(prefix, plan);
    if (qwenShouldReturnToScheduledAnchor(prefix, suggestedNext)) {
      session.adaptiveFollowUpCount = 0;
      return qwenTakeNextScheduledAction(prefix, plan);
    }
    session.lastAdaptiveAnswerFp = lastTurnFp;
    session.adaptiveFollowUpCount += 1;
    session.lastActionKind = "ai-context-turn";
    session.scheduledAction = {
      part: suggestedNext.part || (session.part2Delivered ? "Part 3" : "Part 1"),
      kind: "ai-context-turn",
      label: "AI-first context response",
      previousQuestion,
      text: [
        "AI-first examiner response. Do not use a fixed front-end classification to decide the next move.",
        "",
        "Previous examiner question:",
        previousQuestion || "(not available)",
        "",
        "Candidate's latest turn:",
        lastTurn.slice(0, 360),
        "",
        "Suggested next IELTS item, if useful:",
        suggestedNext.text || "(none)",
        "",
        "Choose the most human next move from context: answer a candidate question, clarify the previous question, ask a natural follow-up, gently redirect an off-topic answer, or use the suggested next IELTS item.",
        "The suggested IELTS item is an unconsumed anchor, not a script line. Use it only if it fits now; otherwise ask a non-repeating follow-up from the candidate's answer and return to this anchor later.",
        "If the time or section feels ready for the anchor, smoothly bring the conversation back to it instead of continuing to drift.",
        "Keep IELTS examiner discipline: one clear question at the end unless you are only repeating/clarifying the same question.",
      ].join("\n"),
    };
    return session.scheduledAction;
  }
  session.adaptiveFollowUpCount = 0;
  return qwenTakeNextScheduledAction(prefix, plan);
}

function qwenTakeNextScheduledAction(prefix, plan) {
  const session = qwenSession(prefix);
  if (session.part1Index < Math.min(4, plan.part1.length)) {
    const text = plan.part1[session.part1Index];
    session.part1Index += 1;
    session.lastActionKind = "question";
    session.scheduledAction = { part: "Part 1", kind: "question", label: `Part 1 question ${session.part1Index}`, text };
    return session.scheduledAction;
  }
  if (!session.part2Delivered) {
    session.part2Delivered = true;
    session.lastActionKind = "cue-card";
    session.scheduledAction = { part: "Part 2", kind: "cue-card", label: "Part 2 cue card", text: plan.part2 };
    return session.scheduledAction;
  }
  if (session.part3Index < Math.min(6, plan.part3.length)) {
    const text = plan.part3[session.part3Index];
    session.part3Index += 1;
    session.lastActionKind = "question";
    session.scheduledAction = { part: "Part 3", kind: "question", label: `Part 3 question ${session.part3Index}`, text };
    return session.scheduledAction;
  }
  if (!qwenSpeakingMinimumReached(prefix)) {
    return qwenBuildExtensionAction(prefix, plan);
  }
  session.autoFinishPending = true;
  session.lastActionKind = "auto-finish";
  session.scheduledAction = {
    part: "End",
    kind: "auto-finish",
    label: "End speaking test",
    text: "That is the end of the speaking test. Thank you.",
  };
  return session.scheduledAction;
}

function qwenCurrentScheduledAction(prefix) {
  const session = qwenSession(prefix);
  return session.scheduledAction || qwenAdvanceScheduledAction(prefix);
}

function qwenExtractQuestion(text) {
  const clean = compactDialogueText(text);
  if (!clean) return "";
  const matches = clean.match(/[^.!?]*\?/g) || [];
  const questions = matches.map((item) => compactDialogueText(item)).filter((item) => item.length > 8);
  const meaningful = questions.filter((item) => !/^(?:hello[, ]*)?(?:how are you|are you ready|shall we start)\?/i.test(item));
  const question = meaningful[meaningful.length - 1] || questions[questions.length - 1] || "";
  return (question || clean).slice(0, 220);
}

function qwenRememberUnique(list, text, limit = 10) {
  const clean = compactDialogueText(text);
  if (!clean) return false;
  const fp = dialogueFingerprint(clean);
  if (!fp || list.some((item) => dialogueFingerprint(item) === fp)) return false;
  list.push(clean);
  while (list.length > limit) list.shift();
  return true;
}

function qwenTurnAlreadyRecorded(turns, role, text) {
  const clean = compactDialogueText(text);
  const fp = dialogueFingerprint(clean);
  if (!fp) return true;
  const last = turns[turns.length - 1];
  if (last?.role === role && dialogueFingerprint(last.text) === fp) return true;
  return turns.slice(-3).some((turn) => turn.role === role && dialogueFingerprint(turn.text) === fp);
}

function qwenRememberDialogueTurn(prefix, role, text) {
  const session = qwenSession(prefix);
  const clean = compactDialogueText(text);
  if (!clean) return false;
  session.dialogueTurns ||= [];
  if (qwenTurnAlreadyRecorded(session.dialogueTurns, role, clean)) return false;
  session.dialogueTurns.push({ role, text: clean, at: Date.now() });
  while (session.dialogueTurns.length > 80) session.dialogueTurns.shift();
  return true;
}

function qwenLastExaminerQuestion(session) {
  const asked = session?.askedQuestions?.[session.askedQuestions.length - 1] || "";
  if (asked) return asked;
  const actionQuestion = session?.scheduledAction?.previousQuestion || "";
  if (actionQuestion) return actionQuestion;
  const finalQuestion = qwenExtractQuestion(session?.lastFinalAssistantText || "");
  if (finalQuestion) return finalQuestion;
  const currentQuestion = qwenExtractQuestion(session?.currentAssistantText || session?.pendingAssistantText || "");
  if (currentQuestion) return currentQuestion;
  const scheduledText = session?.scheduledAction?.text || "";
  return qwenExtractQuestion(scheduledText);
}

function qwenLatestTurnCandidateText(session) {
  return compactDialogueText(session?.currentCandidateText || "");
}

function qwenCandidateQuestionKind(text) {
  const clean = compactDialogueText(text).toLowerCase();
  if (!clean) return "";
  const hasQuestionSignal = /\?/.test(clean)
    || /\b(?:what|why|how|when|where|which|who|can|could|would|should|do|does|did|is|are|am)\b/.test(clean);
  const asksForClarification = /\b(?:what\s+(?:kind|type|sort)\s+of|what\s+do\s+you\s+mean|what\s+does\s+.+\s+mean|can\s+you\s+(?:give|explain|clarify|repeat|say)|could\s+you\s+(?:give|explain|clarify|repeat|say)|give\s+me\s+(?:some\s+)?(?:details|examples)|more\s+details|for\s+example|examples?|details?|clarify|explain|meaning|mean|issue|issues)\b/.test(clean);
  const asksForRepeat = /\b(?:sorry|pardon|again|repeat|say\s+that\s+again|one\s+more\s+time|didn't\s+hear|cannot\s+hear|can't\s+hear)\b/.test(clean);
  const asksAboutExaminer = /\b(?:are\s+you\s+ai|ai\s+examiner|scoring|score|band|test\s+work|microphone|mic|audio|voice|can\s+you\s+hear\s+me)\b/.test(clean);
  if (asksForRepeat) return "repeat";
  if (asksAboutExaminer) return "technical-or-scoring";
  if (hasQuestionSignal && asksForClarification) return "clarification";
  if (/\?$/.test(clean) && clean.split(/\s+/).length <= 12) return "candidate-question";
  return "";
}

function qwenMergeCandidateTurnText(current, nextText) {
  const currentClean = compactDialogueText(current);
  const nextClean = compactDialogueText(nextText);
  if (!currentClean) return nextClean;
  if (!nextClean) return currentClean;
  const currentFp = dialogueFingerprint(currentClean);
  const nextFp = dialogueFingerprint(nextClean);
  if (!nextFp || nextFp === currentFp || currentFp.includes(nextFp)) return currentClean;
  if (nextFp.includes(currentFp)) return nextClean;
  const currentWords = currentClean.split(/\s+/);
  const nextWords = nextClean.split(/\s+/);
  const maxOverlap = Math.min(14, currentWords.length, nextWords.length);
  for (let length = maxOverlap; length > 0; length -= 1) {
    const currentTail = dialogueFingerprint(currentWords.slice(-length).join(" "));
    const nextHead = dialogueFingerprint(nextWords.slice(0, length).join(" "));
    if (currentTail && currentTail === nextHead) {
      return compactDialogueText([...currentWords, ...nextWords.slice(length)].join(" "));
    }
  }
  return compactDialogueText(`${currentClean} ${nextClean}`);
}

function qwenClearActiveCandidateTurn(prefix) {
  const session = qwenSession(prefix);
  session.candidateNode = null;
  session.currentCandidateText = "";
}

function qwenRememberCandidateAnswer(prefix, text) {
  const session = qwenSession(prefix);
  const clean = compactDialogueText(text || qwenLatestTurnCandidateText(session));
  if (!clean) return false;
  const questionKind = qwenCandidateQuestionKind(clean);
  session.lastCandidateTurnText = clean;
  session.lastCandidateTurnKind = questionKind ? "possible candidate question" : "candidate turn";
  qwenRememberDialogueTurn(prefix, "Candidate", clean);
  if (questionKind) {
    qwenRememberUnique(session.candidateQuestions, clean, 6);
    return true;
  }
  const added = qwenRememberUnique(session.candidateAnswers, clean, 8);
  return added;
}

function qwenRememberExaminerQuestion(prefix, text) {
  const session = qwenSession(prefix);
  if (session.awaitingScore) return false;
  const clean = compactDialogueText(text);
  if (!clean) return false;
  const question = qwenExtractQuestion(clean);
  if (qwenQuestionIsDuplicate([...(session.askedQuestions || []), ...(session.recentQuestions || [])], question)) return false;
  qwenRememberDialogueTurn(prefix, "Examiner", clean);
  const added = qwenRememberUnique(session.askedQuestions, question, 30);
  if (added) qwenRememberRecentQuestion(question);
  return added;
}

function qwenTurnControlInstructions(prefix, mode = "next-question") {
  const prompt = $(`${prefix}-qwen-prompt`)?.value || "";
  const session = qwenSession(prefix);
  const action = mode === "score" ? null : qwenCurrentScheduledAction(prefix);
  const asked = session.askedQuestions.length
    ? session.askedQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "None yet.";
  const answered = session.candidateAnswers.length
    ? session.candidateAnswers.map((item, index) => `${index + 1}. ${item.slice(0, 180)}`).join("\n")
    : "None yet.";
  const candidateQuestions = session.candidateQuestions?.length
    ? session.candidateQuestions.map((item, index) => `${index + 1}. ${item.slice(0, 180)}`).join("\n")
    : "None yet.";
  const recentQuestions = session.recentQuestions?.length
    ? session.recentQuestions.slice(-20).map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "None yet.";
  const scopeConfig = speakingPracticeScopeConfig(qwenSpeakingScope(prefix));
  const latestAnswer = qwenLatestTurnCandidateText(session);
  const lastExaminerQuestion = qwenLastExaminerQuestion(session);
  const lastCandidateTurn = session.lastCandidateTurnText || latestAnswer || "";
  const lastCandidateTurnKind = session.lastCandidateTurnKind || (lastCandidateTurn ? "answer" : "none");
  const timeStatus = qwenSpeakingTimeStatus(prefix);
  if (mode === "score") {
    return [
      prompt,
      "",
      "Create a private realtime examiner score note for the backend. Do not ask another question.",
      "Do not address the candidate. Do not include a greeting, closing message, or markdown.",
      "Return compact JSON only with these keys: fc, lr, gra, pronunciation, provisionalOverall, fluencyEvidence, pronunciationEvidence, repeatedProblems, strongPoints, scoringCautions.",
      "Scores must be numbers from 0 to 9. provisionalOverall is the average rounded to the nearest 0.5.",
      "Use IELTS Speaking criteria: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation.",
      "Judge fluency from sustained speech, hesitation, repetition, self-correction and coherence.",
      "Judge pronunciation from what you heard during realtime audio: intelligibility, stress, rhythm, intonation and problematic sounds.",
      "Use the full conversation so far. If audio evidence is limited, say so in scoringCautions.",
    ].join("\n");
  }
  const scheduledBlock = action
    ? [
      `Scheduled IELTS section: ${action.part}`,
      `Scheduled item: ${action.label}`,
      "Scheduled text:",
      action.text,
    ].join("\n")
    : "No scheduled item is available.";
  let deliveryRules;
  if (action?.kind === "cue-card") {
    deliveryRules = [
      "The opening has already finished. Do not greet again and do not ask any Part 1 question now.",
      "Deliver the scheduled Part 2 cue card now.",
      "Start with: Now I am going to give you a topic and I would like you to talk about it for one to two minutes.",
      "Read the cue card naturally, silently repairing obvious OCR errors if needed.",
      "End with: You have one minute to think about what you are going to say.",
      "Then stop. Do not ask any Part 3 question yet.",
    ];
  } else if (action?.kind === "auto-finish") {
    deliveryRules = [
      "End the speaking test now.",
      "Say only this short closing message in natural spoken English: That is the end of the speaking test. Thank you.",
      "Do not ask another question.",
      "Do not give a score in the live response. The app will score after the realtime connection closes.",
    ];
  } else if (action?.kind === "ai-context-turn") {
    deliveryRules = [
      "AI-first turn: use the immediate conversation context and the candidate's latest words to choose the next examiner move.",
      "Do not rely on a fixed front-end classification. Decide naturally whether the candidate answered, asked for help, misunderstood, corrected themselves, or continued an earlier answer.",
      "If the candidate asked something, answer briefly in context, then return to the speaking task.",
      "If the candidate answered, choose either a natural follow-up based on their answer or a fresh IELTS-style angle. The hard rule is: do not repeat.",
      "When it helps, briefly branch from one concrete detail in the candidate's answer, then pull the next question back to the broader IELTS Part 2 or Part 3 theme.",
      "During the 15-minute target, prefer human free development from the candidate's ideas, but keep the scheduled item as an anchor to return to when timing or section flow requires it.",
      "If the candidate misunderstood or drifted off topic, briefly clarify and invite a relevant answer.",
      "The suggested IELTS item is optional after a candidate turn; do not force it if it would sound robotic.",
      "Do not repeat the previous question or any question in the Already asked list. If your next sentence sounds similar to an old question, change angle immediately.",
      "End with at most one clear question and wait.",
    ];
  } else if (action?.kind === "candidate-question") {
    deliveryRules = [
      "The candidate has asked you a question or asked for clarification. Do not treat it as an IELTS answer.",
      "Use the previous examiner question and current topic as the main context, but keep enough flexibility to answer the candidate's actual question naturally.",
      "Answer directly in one or two short sentences. Give simple examples when helpful.",
      "Avoid generic dictionary definitions when context is available, but do not sound scripted.",
      "Then return to the same IELTS question by repeating, narrowing, or paraphrasing it more clearly.",
      "Do not score, lecture, change topic, or move to a new bank question.",
      "Stop after the clarified IELTS question and wait.",
    ];
  } else if (action?.kind === "adaptive-follow-up") {
    deliveryRules = [
      "The opening has already finished. Do not say hello, do not ask how the candidate is, and do not repeat the first question.",
      "This is an answer-based follow-up, so listen to the candidate's just-finished answer and use the transcript only as support.",
      "Decide whether the candidate answered, asked indirectly for help, misunderstood the question, or drifted off topic. Respond accordingly.",
      "If they answered, ask exactly one natural IELTS-style follow-up question about a concrete detail.",
      "A follow-up can connect to what they just said, or you can move to a fresh IELTS-style angle. The hard rule is: do not repeat.",
      "If they misunderstood or drifted, briefly clarify the original question and invite a relevant answer.",
      "Use a short bridge only when it helps the response sound human. Avoid generic praise and repeated stock phrases.",
      "Do not ask a generic next-bank question. Do not repeat the previous examiner question.",
      "Do not praise at length, summarize the whole answer, score, or explain your reasoning.",
      "Stop immediately after one clear question and wait.",
    ];
  } else if (action?.kind === "extension-follow-up") {
    deliveryRules = [
      "The normal imported question list is exhausted, but the 15-minute speaking session is not complete.",
      "Continue as a real IELTS Part 3 examiner with one deeper follow-up question.",
      "Use the candidate's latest answer if it provides a natural angle, then bring the discussion back to the same broad Part 3 topic area.",
      "Do not repeat a previous question just to fill time. If the obvious question has already been asked, branch to causes, consequences, comparison, examples, policy, technology, culture, or future change.",
      "Good angles include causes, effects, comparisons, older vs younger people, public policy, technology, culture, and future change.",
      "Do not say that the question bank has run out. Do not score, summarize, or close the test yet.",
      "Ask exactly one clear question and wait.",
    ];
  } else {
    deliveryRules = [
      mode === "opening"
        ? "Say one brief greeting sentence with no question mark; never say 'How are you?'. Then ask only the scheduled question."
        : latestAnswer
          ? "The opening has already finished. If it sounds natural, briefly acknowledge the candidate's last answer before the question."
          : "The opening has already finished. Ask only the scheduled question.",
      "Then ask exactly one scheduled IELTS question. You may lightly paraphrase for natural spoken English, but keep the IELTS section and topic.",
      "This scheduled question is the anchor that brings the conversation back after free development.",
      "If the scheduled question would repeat something already asked, ask a deeper why/how/example/comparison angle connected to the same topic instead.",
      "Stop after the question and wait for the candidate.",
    ];
  }
  return [
    prompt,
    "",
    scheduledBlock,
    "",
    "Candidate's latest answer, if the transcript is reliable:",
    latestAnswer ? latestAnswer.slice(0, 360) : "No reliable text transcript; use the just-finished audio if available.",
    "",
    "Live turn control for the next examiner response:",
    `Selected practice scope: ${scopeConfig.label}. Stay inside ${scopeConfig.parts.join(", ")} only.`,
    `Timing: elapsed ${timeStatus.elapsedLabel}. Remaining target time about ${timeStatus.remainingMinutes} minute(s).`,
    qwenSpeakingMinimumReached(prefix)
      ? "The minimum auto-finish time has been reached; only close if the scheduled item is End."
      : "The minimum auto-finish time has not been reached. Do not end, score, or give final feedback.",
    "",
    "Immediate conversation context:",
    `Last examiner question: ${lastExaminerQuestion || "None yet."}`,
    `Candidate latest turn type: ${lastCandidateTurnKind}`,
    `Candidate latest turn: ${lastCandidateTurn ? lastCandidateTurn.slice(0, 360) : "None yet."}`,
    "",
    "Already asked examiner questions:",
    asked,
    "",
    "Recent questions from earlier sessions (do not repeat exact or near-duplicate wording):",
    recentQuestions,
    "",
    "Candidate has already discussed:",
    answered,
    "",
    "Candidate has asked or requested clarification:",
    candidateQuestions,
    "",
    ...deliveryRules,
    "Do not repeat or paraphrase any listed question or topic unless this is the scheduled short-answer follow-up.",
    "Do not return to a topic the candidate has already answered unless you ask a clearly deeper why/how follow-up.",
    "A good next move can follow the candidate's latest answer or use a fresh topic-bank prompt, but it must not repeat an old question.",
    `For the ${scopeConfig.label} countdown, develop the discussion from the candidate's meaning and stay inside the selected practice scope; never fill time by recycling old questions.`,
    "Do not invent an unrelated topic.",
    action?.kind === "cue-card"
      ? "Keep the cue-card delivery concise and clear."
      : action?.kind === "auto-finish"
        ? "Keep the closing message under 12 words."
      : action?.kind === "candidate-question" || action?.kind === "ai-context-turn"
        ? "Keep the response natural and usually under 45 words total."
        : action?.kind === "extension-follow-up"
          ? "Keep the response natural and usually under 35 words total."
        : "Keep the response natural and usually under 28 words total.",
  ].join("\n");
}

function qwenBeginAssistantResponse(prefix, source) {
  const session = qwenSession(prefix);
  qwenSetSpeakingVisualState(prefix, "assistant");
  if (!session.responseActive) {
    qwenRememberCandidateAnswer(prefix, qwenLatestTurnCandidateText(session));
    session.currentAssistantText = "";
    session.pendingAssistantText = "";
    session.assistantTextSource = "";
    session.scheduleAdvancedForResponse = false;
    session.lastFinalAssistantText = "";
    session.assistantNode = null;
    session.candidateNode = null;
    session.currentCandidateText = "";
  }
  if (source === "audio" && session.assistantTextSource !== "audio") {
    session.assistantTextSource = "audio";
    session.currentAssistantText = "";
    session.pendingAssistantText = "";
    if (session.assistantNode) session.assistantNode.textContent = "";
  } else if (!session.assistantTextSource) {
    session.assistantTextSource = source;
  }
  session.responseActive = true;
}

function qwenUpdateCandidateTranscript(prefix, text) {
  const clean = compactDialogueText(text);
  if (!clean) return;
  const session = qwenSession(prefix);
  const now = Date.now();
  if (session.transport === "ws" || session.transport === "http") {
    session.voiceStarted = true;
    if (!session.voiceStartAt) session.voiceStartAt = now;
    session.lastHumanVoiceAt = now;
    session.lastVoiceAt = now;
  }
  const cleanFp = dialogueFingerprint(clean);
  const lastFp = dialogueFingerprint(session.lastCandidateText);
  if (!session.candidateNode && lastFp && cleanFp === lastFp && now - session.lastCandidateAt < 8000) return;
  const next = qwenMergeCandidateTurnText(session.currentCandidateText, clean);
  if (!session.candidateNode) {
    session.candidateNode = qwenAddBubble(prefix, "user", next);
  } else {
    session.candidateNode.textContent = next;
  }
  session.currentCandidateText = next;
  session.lastCandidateText = next;
  session.lastCandidateAt = now;
  if (session.transport === "webrtc" && !session.responseActive && !session.waitingForResponse && !qwenOutputBusy(prefix)) {
    scheduleQwenWebRtcResponse(prefix, QWEN_WEBRTC_LOCAL_SILENCE_MS);
  }
  const log = $(`${prefix}-speaking-log`);
  if (log) log.scrollTop = log.scrollHeight;
}

function flushQwenAssistant(prefix) {
  const session = qwenSession(prefix);
  session.assistantRenderId = null;
  if (!session.assistantNode) return;
  const next = session.pendingAssistantText || "";
  session.assistantNode.textContent = next;
}

function flushQwenAudio(prefix) {
  const session = qwenSession(prefix);
  session.audioRenderId = null;
  if (!session.pendingAudioChunks.length) return;
  const chunks = session.pendingAudioChunks.splice(0, QWEN_PLAYBACK_BATCH_CHUNKS);
  playQwenPcmChunks(prefix, chunks);
  if (session.pendingAudioChunks.length) {
    session.audioRenderId = window.setTimeout(() => flushQwenAudio(prefix), 24);
  }
  scheduleQwenPlaybackTail(prefix);
}

function mergeQwenAssistantText(session, text) {
  const current = session.currentAssistantText || "";
  const next = normalizeRealtimeDialogueText(text, { trim: !current });
  if (!next.trim() || next === current) return current;
  let merged = current;
  if (next.startsWith(current)) {
    merged = next;
  } else if (!current.startsWith(next)) {
    let overlap = 0;
    const limit = Math.min(current.length, next.length);
    for (let len = limit; len > 0; len -= 1) {
      if (current.slice(-len) === next.slice(0, len)) {
        overlap = len;
        break;
      }
    }
    const tail = next.slice(overlap);
    const needsPunctuationSpace = !overlap
      && /[,.!?;:]$/.test(current)
      && /^[A-Za-z0-9]/.test(next);
    merged = overlap ? current + tail : current + (needsPunctuationSpace ? " " : "") + next;
  }
  const display = normalizeAssistantDisplayText(merged);
  session.currentAssistantText = display;
  session.pendingAssistantText = display;
  return display;
}

function mergeQwenTextValue(current, text) {
  const existing = String(current || "");
  const next = normalizeRealtimeDialogueText(text, { trim: !existing });
  if (!next.trim() || next === existing) return existing;
  if (next.startsWith(existing)) return normalizeAssistantDisplayText(next);
  if (existing.startsWith(next)) return existing;
  let overlap = 0;
  const limit = Math.min(existing.length, next.length);
  for (let len = limit; len > 0; len -= 1) {
    if (existing.slice(-len) === next.slice(0, len)) {
      overlap = len;
      break;
    }
  }
  return normalizeAssistantDisplayText(overlap ? existing + next.slice(overlap) : existing + next);
}

function qwenOutputBusy(prefix) {
  const session = qwenSession(prefix);
  if (Date.now() < (session.playbackBlockedUntil || 0)) return true;
  if (session.responseActive || session.pendingAudioChunks.length || session.audioRenderId) return true;
  const contextTime = session.outputContext?.currentTime;
  if (!Number.isFinite(contextTime)) return false;
  return session.playbackCursor > contextTime + 0.05;
}

function scheduleQwenPlaybackTail(prefix) {
  const session = qwenSession(prefix);
  if (session.playbackTailTimer) clearTimeout(session.playbackTailTimer);
  const contextTime = session.outputContext?.currentTime;
  if (!Number.isFinite(contextTime)) return;
  const remainingMs = Math.max(0, (session.playbackCursor - contextTime) * 1000);
  session.playbackBlockedUntil = Date.now() + remainingMs + 650;
  session.playbackTailTimer = setTimeout(() => {
    session.playbackTailTimer = null;
    session.playbackBlockedUntil = 0;
    if (!qwenOutputBusy(prefix)) qwenSetStatus(prefix, session.micActive ? "Listening..." : "Connected", true);
  }, remainingMs + 650);
}

function qwenStopOutputPlayback(prefix) {
  const session = qwenSession(prefix);
  if (session.audioRenderId) clearTimeout(session.audioRenderId);
  session.audioRenderId = null;
  if (session.playbackTailTimer) clearTimeout(session.playbackTailTimer);
  session.playbackTailTimer = null;
  session.pendingAudioChunks = [];
  session.audioJitterStarted = false;
  session.playbackBlockedUntil = 0;
  session.playbackCursor = 0;
  if (session.playbackSources?.size) {
    for (const source of session.playbackSources) {
      try {
        source.stop(0);
      } catch {}
      try {
        source.disconnect();
      } catch {}
    }
    session.playbackSources.clear();
  }
  if (session.remoteAudio) {
    try {
      session.remoteAudio.pause();
      session.remoteAudio.srcObject = null;
    } catch {}
  }
  if (session.outputContext) {
    const context = session.outputContext;
    session.outputContext = null;
    session.outputUnlocked = false;
    context.close?.().catch(() => {});
  }
  qwenSetSpeakingVisualState(prefix, "idle");
}

function qwenAppendAssistant(prefix, text) {
  const clean = normalizeRealtimeDialogueText(text);
  if (!clean.trim()) return;
  const session = qwenSession(prefix);
  const mergedText = mergeQwenAssistantText(session, clean);
  if (!session.assistantNode && session.lastFinalAssistantText) {
    const mergedFp = dialogueFingerprint(mergedText);
    const finalFp = dialogueFingerprint(session.lastFinalAssistantText);
    if (mergedFp && mergedFp === finalFp && Date.now() - session.lastFinalAssistantAt < 8000) return;
  }
  if (!qwenAssistantTranscriptVisible(prefix)) return;
  if (!session.assistantNode) {
    session.assistantNode = qwenAddBubble(prefix, "assistant", "");
  }
  if (!session.assistantNode) return;
  session.pendingAssistantText = mergedText;
  if (!session.assistantRenderId) {
    session.assistantRenderId = requestAnimationFrame(() => flushQwenAssistant(prefix));
  }
  const log = $(`${prefix}-speaking-log`);
  while (log && log.children.length > 8) {
    log.removeChild(log.firstElementChild);
  }
  if (log) log.scrollTop = log.scrollHeight;
}

function qwenTextFromPayload(payload) {
  const chunks = [];
  const visit = (value) => {
    if (!value || chunks.length > 30) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;
    for (const key of ["text", "transcript", "output_text"]) {
      if (typeof value[key] === "string" && value[key].trim()) chunks.push(value[key]);
    }
    for (const key of ["content", "output", "response", "item"]) visit(value[key]);
  };
  visit(payload);
  return chunks.join("\n");
}

function combineBase64PcmChunks(chunks) {
  const validChunks = chunks.filter(Boolean);
  if (!validChunks.length) return "";
  if (validChunks.length === 1) return validChunks[0];
  const arrays = validChunks.map((chunk) => Uint8Array.from(atob(chunk), (char) => char.charCodeAt(0)));
  const total = arrays.reduce((sum, array) => sum + array.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const array of arrays) {
    merged.set(array, offset);
    offset += array.byteLength;
  }
  let binary = "";
  for (let i = 0; i < merged.length; i += 1) binary += String.fromCharCode(merged[i]);
  return btoa(binary);
}

function combineArrayBufferChunks(chunks) {
  const validChunks = chunks.filter(Boolean);
  if (!validChunks.length) return new ArrayBuffer(0);
  if (validChunks.length === 1) return validChunks[0];
  const arrays = validChunks.map((chunk) => new Uint8Array(chunk));
  const total = arrays.reduce((sum, array) => sum + array.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const array of arrays) {
    merged.set(array, offset);
    offset += array.byteLength;
  }
  return merged.buffer;
}

function qwenEventId() {
  return `event_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

function qwenRealtimeEventFromPayload(payload) {
  if (!payload || !payload.type) return null;
  if (payload.type === "session.update") {
    const turnDetectionType = payload.turnDetection === "manual" ? "" : (payload.turnDetection || "server_vad");
    const turnDetection = turnDetectionType
      ? {
        type: turnDetectionType,
        threshold: 0.5,
        prefix_padding_ms: Number(payload.prefixPaddingMs || 500),
        silence_duration_ms: Number(payload.silenceDurationMs || QWEN_WEBRTC_SILENCE_MS),
        create_response: payload.createResponse !== false,
        interrupt_response: false,
      }
      : null;
    return {
      event_id: qwenEventId(),
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        voice: payload.voice || "Ethan",
        input_audio_format: "pcm",
        input_audio_transcription: { model: "qwen3-asr-flash-realtime" },
        output_audio_format: "pcm",
        smooth_output: false,
        instructions: payload.instructions || "You are a professional IELTS Speaking examiner. Ask one short question and wait.",
        turn_detection: turnDetection,
      },
    };
  }
  if (payload.type === "response.create") {
    return {
      event_id: qwenEventId(),
      type: "response.create",
      response: {
        modalities: Array.isArray(payload.modalities) && payload.modalities.length ? payload.modalities : ["text", "audio"],
        ...(payload.instructions ? { instructions: payload.instructions } : {}),
      },
    };
  }
  if (payload.type === "audio.commit") {
    return {
      event_id: qwenEventId(),
      type: "input_audio_buffer.commit",
    };
  }
  return null;
}

function qwenSendNow(prefix, payload) {
  const session = qwenSession(prefix);
  if (session.transport === "webrtc" && session.dataChannel?.readyState === "open") {
    if (payload.type === "disconnect") {
      qwenCloseWebRtc(prefix);
      return;
    }
    if (payload.type === "audio.append" || payload.type === "ping") return;
    const event = qwenRealtimeEventFromPayload(payload);
    if (event) {
      session.realtimeEventTypes.push(`sent:${event.type}`);
      while (session.realtimeEventTypes.length > 30) session.realtimeEventTypes.shift();
      session.dataChannel.send(JSON.stringify(event));
    }
    return;
  }
  if (session.transport === "ws" && session.ws?.readyState === WebSocket.OPEN) {
    if (payload.type === "audio.append" && payload.audio) {
      session.ws.send(payload.audio instanceof ArrayBuffer ? payload.audio : combineArrayBufferChunks([payload.audio]));
    } else {
      session.ws.send(JSON.stringify(payload));
    }
    return;
  }
  if (session.transport === "http" && session.httpSessionId) {
    const bodyPayload = payload.type === "audio.append" && payload.audio instanceof ArrayBuffer
      ? { ...payload, audio: arrayBufferToBase64(payload.audio) }
      : payload;
    fetch(`/api/qwen-session/${session.httpSessionId}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bodyPayload),
    }).catch(() => qwenAddBubble(prefix, "system", "Live audio relay failed."));
  }
}

function flushQwenMicAudio(prefix) {
  const session = qwenSession(prefix);
  if (session.micAudioFlushTimer) {
    clearTimeout(session.micAudioFlushTimer);
    session.micAudioFlushTimer = null;
  }
  if (!session.micAudioQueue.length) return;

  const isWs = session.transport === "ws" && session.ws?.readyState === WebSocket.OPEN;
  const maxChunks = isWs ? QWEN_WS_AUDIO_BATCH_CHUNKS : QWEN_HTTP_AUDIO_BATCH_CHUNKS;
  const chunks = session.micAudioQueue.splice(0, maxChunks);
  const audioBuffer = combineArrayBufferChunks(chunks);
  if (isWs) {
    if (audioBuffer.byteLength) qwenSendNow(prefix, { type: "audio.append", audio: audioBuffer });
  } else {
    const audio = arrayBufferToBase64(audioBuffer);
    if (audio) qwenSendNow(prefix, { type: "audio.append", audio });
  }

  if (session.micAudioQueue.length) {
    session.micAudioFlushTimer = setTimeout(() => flushQwenMicAudio(prefix), isWs ? 40 : 20);
  }
}

function qwenSend(prefix, payload) {
  const session = qwenSession(prefix);
  if (payload.type === "audio.append") {
    if (session.transport === "webrtc") return;
    session.micAudioQueue.push(payload.audio);
    if (!session.micAudioFlushTimer) {
      const delay = session.transport === "ws" ? QWEN_WS_AUDIO_BATCH_MS : QWEN_HTTP_AUDIO_BATCH_MS;
      session.micAudioFlushTimer = setTimeout(() => flushQwenMicAudio(prefix), delay);
    }
    return;
  }
  flushQwenMicAudio(prefix);
  qwenSendNow(prefix, payload);
}

function waitForQwenIceGathering(pc, timeoutMs = 3000) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener("icegatheringstatechange", onStateChange);
      resolve();
    };
    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    pc.addEventListener("icegatheringstatechange", onStateChange);
    setTimeout(finish, timeoutMs);
  });
}

async function handleQwenSessionCreated(prefix, channel) {
  const session = qwenSession(prefix);
  if (session.webrtcMediaUngated) return;
  session.webrtcMediaUngated = true;
  if (session.webrtcSessionTimer) clearTimeout(session.webrtcSessionTimer);
  session.webrtcSessionTimer = null;
  session.dataChannel = channel || session.dataChannel;
  qwenSetWebRtcAudioSending(prefix, false);
  qwenSetStatus(prefix, "Connected · WebRTC", true);
  qwenSetControls(prefix, true);
  lockQwenWebRtcControls(prefix);
  qwenAddBubble(prefix, "system", "Live speaking session ready.");
  qwenSend(prefix, {
    type: "session.update",
    instructions: qwenTurnControlInstructions(prefix, "opening"),
    voice: "Ethan",
    turnDetection: "server_vad",
    silenceDurationMs: QWEN_WEBRTC_SILENCE_MS,
    createResponse: false,
  });
  setTimeout(() => {
    if (!session.connected || session.transport !== "webrtc" || session.openingRequested) return;
    session.openingRequested = true;
    qwenSend(prefix, { type: "response.create", instructions: qwenTurnControlInstructions(prefix, "opening") });
  }, 800);
  startQwenMic(prefix);
}

function handleQwenDataChannelMessage(prefix, data, channel) {
  try {
    const payload = typeof data === "string" ? JSON.parse(data) : JSON.parse(new TextDecoder().decode(data));
    const session = qwenSession(prefix);
    session.realtimeEventTypes.push(payload.type || "unknown");
    while (session.realtimeEventTypes.length > 30) session.realtimeEventTypes.shift();
    if (payload.type === "session.created") {
      handleQwenSessionCreated(prefix, channel);
    }
    handleQwenMessage(prefix, { type: "event", eventType: payload.type, payload });
  } catch {
    qwenAddBubble(prefix, "system", "Unreadable realtime event received.");
  }
}

function attachQwenRemoteAudio(prefix, stream) {
  const session = qwenSession(prefix);
  session.remoteStream = stream;
  session.remoteAudio ||= new Audio();
  session.remoteAudio.autoplay = true;
  session.remoteAudio.playsInline = true;
  session.remoteAudio.srcObject = stream;
  session.remoteAudio.onplaying = () => qwenSetSpeakingVisualState(prefix, "assistant");
  session.remoteAudio.onpause = () => {
    if (!qwenOutputBusy(prefix)) qwenSetSpeakingVisualState(prefix, session.micActive ? "candidate" : "idle");
  };
  session.remoteAudio.onended = () => {
    if (!qwenOutputBusy(prefix)) qwenSetSpeakingVisualState(prefix, session.micActive ? "candidate" : "idle");
  };
  session.remoteAudio.play().catch(() => {
    qwenSetStatus(prefix, "Tap the page once to allow audio playback", true);
  });
  if (session.recordingContext && session.recordingDestination && stream) {
    try {
      session.recordingRemoteSource?.disconnect();
      session.recordingRemoteSource = session.recordingContext.createMediaStreamSource(stream);
      session.recordingRemoteSource.connect(session.recordingDestination);
    } catch {
      session.recordingRemoteSource = null;
    }
  }
}

function qwenCloseWebRtc(prefix) {
  const session = qwenSession(prefix);
  qwenSetWebRtcAudioSending(prefix, false);
  if (session.webrtcControlTimer) clearInterval(session.webrtcControlTimer);
  session.webrtcControlTimer = null;
  if (session.webrtcSessionTimer) clearTimeout(session.webrtcSessionTimer);
  session.webrtcSessionTimer = null;
  clearQwenWebRtcTurnTimer(prefix);
  clearQwenWebRtcFallbackTimer(prefix);
  clearQwenWebRtcSubmitWatchdog(prefix);
  if (session.autoScoreTimer) clearTimeout(session.autoScoreTimer);
  session.autoScoreTimer = null;
  session.dataChannel?.close();
  session.pc?.getSenders?.().forEach((sender) => sender.track?.stop());
  session.pc?.close();
  if (session.remoteAudio) {
    session.remoteAudio.pause();
    session.remoteAudio.srcObject = null;
  }
  session.remoteStream = null;
  session.pc = null;
  session.dataChannel = null;
  session.webrtcAudioSender = null;
  session.webrtcAudioTrack = null;
  session.webrtcAudioSending = false;
  session.webrtcMediaUngated = false;
  qwenSetSpeakingVisualState(prefix, "idle");
}

function lockQwenWebRtcControls(prefix) {
  const session = qwenSession(prefix);
  if (session.webrtcControlTimer) clearInterval(session.webrtcControlTimer);
  const lock = () => {
    if (!session.pc && session.transport !== "webrtc") return;
    document.querySelectorAll(`.qwen-commit-answer[data-prefix="${prefix}"]`).forEach((button) => {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    });
  };
  lock();
  session.webrtcControlTimer = setInterval(lock, 500);
}

async function startQwenWebRtc(prefix, openingInstructions) {
  const session = qwenSession(prefix);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia || !AudioContextClass) {
    throw new Error("WebRTC voice is not supported in this browser.");
  }
  qwenSetStatus(prefix, "Connecting via WebRTC...", false);
  session.transport = "webrtc";
  session.micStream = await navigator.mediaDevices.getUserMedia(qwenMicConstraints());

  const pc = new RTCPeerConnection();
  session.pc = pc;
  const dc = pc.createDataChannel("oai-events");
  session.dataChannel = dc;

  const audioTrack = session.micStream.getAudioTracks()[0];
  if (!audioTrack) throw new Error("No microphone audio track is available.");
  audioTrack.enabled = true;
  session.webrtcAudioTrack = audioTrack;
  session.webrtcAudioSender = pc.addTrack(audioTrack, session.micStream);
  try {
    const parameters = session.webrtcAudioSender.getParameters();
    parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
    parameters.encodings[0].maxBitrate = QWEN_OPUS_MAX_AVERAGE_BITRATE;
    await session.webrtcAudioSender.setParameters(parameters);
  } catch {}
  await session.webrtcAudioSender.replaceTrack(null).catch(() => {});
  pc.ontrack = (event) => {
    const stream = event.streams?.[0] || new MediaStream([event.track]);
    attachQwenRemoteAudio(prefix, stream);
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
      qwenSetStatus(prefix, "Connected · WebRTC", true);
      return;
    }
    if (pc.connectionState === "disconnected") {
      qwenSetStatus(prefix, "WebRTC reconnecting...", true);
      return;
    }
    if (["failed", "closed"].includes(pc.connectionState)) {
      if (session.transport === "webrtc") {
        if (session.connectionRecovering) return;
        if (scheduleQwenConnectionRecovery(prefix, `WebRTC ${pc.connectionState}`)) return;
        session.connected = false;
        stopQwenHeartbeat(prefix);
        qwenSetControls(prefix, false);
        qwenSetStatus(prefix, `WebRTC ${pc.connectionState}`, false);
      }
    }
  };
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      qwenSetStatus(prefix, "Connected · WebRTC", true);
    } else if (pc.iceConnectionState === "checking") {
      qwenSetStatus(prefix, "Connecting WebRTC media...", true);
    } else if (pc.iceConnectionState === "failed") {
      qwenSetStatus(prefix, "WebRTC media connection failed", false);
    }
  };
  dc.onmessage = (event) => handleQwenDataChannelMessage(prefix, event.data, dc);
  pc.ondatachannel = (event) => {
    const channel = event.channel;
    session.dataChannel = channel;
    channel.onmessage = (messageEvent) => handleQwenDataChannelMessage(prefix, messageEvent.data, channel);
    channel.onopen = () => {
      session.connected = true;
      session.transport = "webrtc";
      qwenSetStatus(prefix, "Connected · WebRTC", true);
      markQwenRealtimeSegmentStarted(prefix);
    };
  };
  dc.onopen = () => {
    session.connected = true;
    session.transport = "webrtc";
    qwenSetStatus(prefix, "Connected · WebRTC, waiting for session...", true);
    qwenSetControls(prefix, true);
    markQwenRealtimeSegmentStarted(prefix);
    lockQwenWebRtcControls(prefix);
    session.webrtcSessionTimer = setTimeout(() => {
      if (session.webrtcMediaUngated || session.transport !== "webrtc") return;
      qwenSetStatus(prefix, "WebRTC session timeout, using WebSocket fallback", false);
      qwenAddBubble(prefix, "system", "WebRTC session timeout, switching to WebSocket fallback.");
      qwenCloseWebRtc(prefix);
      stopQwenMic(prefix, false);
      session.connected = false;
      session.transport = "";
      startQwenWebSocket(prefix, openingInstructions);
    }, 25000);
  };
  dc.onerror = () => qwenSetStatus(prefix, "WebRTC data channel error", false);
  dc.onclose = () => {
    if (session.transport === "webrtc" || session.pc) {
      if (session.connectionRecovering) return;
      if (scheduleQwenConnectionRecovery(prefix, "WebRTC data channel closed")) return;
      session.connected = false;
      qwenSetControls(prefix, false);
      qwenSetStatus(prefix, "WebRTC disconnected", false);
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForQwenIceGathering(pc);
  const sdp = qwenApplyLowBandwidthAudioSdp(pc.localDescription?.sdp || offer.sdp || "");
  const response = await fetch("/api/qwen-webrtc-offer", {
    method: "POST",
    headers: { "content-type": "application/sdp" },
    body: sdp,
  });
  const answerSdp = await response.text();
  if (!response.ok) {
    let message = answerSdp;
    try {
      const json = JSON.parse(answerSdp);
      const detail = String(json.detail || "");
      if (/unsupported_district/i.test(detail)) {
        message = "Qwen WebRTC is not available from this server region. Configure a supported WebRTC exchange proxy or move the exchange service closer to Qwen.";
      } else {
        message = [json.error, detail].filter(Boolean).join(" · ") || message;
      }
    } catch {}
    throw new Error(message || `WebRTC SDP exchange failed: HTTP ${response.status}`);
  }
  const normalizedAnswerSdp = String(answerSdp || "").trim().replace(/\r?\n/g, "\r\n") + "\r\n";
  await pc.setRemoteDescription({ type: "answer", sdp: normalizedAnswerSdp });
}

function startQwenWebSocket(prefix, openingInstructions, options = {}) {
  const session = qwenSession(prefix);
  const wsUrl = `${location.origin.replace(/^http/, "ws")}/qwen-client`;
  session.ws = new WebSocket(wsUrl);
  session.ws.addEventListener("open", () => {
    session.transport = "ws";
    qwenSend(prefix, {
      type: "connect",
      instructions: openingInstructions,
      voice: "Ethan",
      turnDetection: "manual",
    });
    qwenAddBubble(prefix, "system", options.recovery ? "Connection restored through WebSocket." : "WebSocket connected.");
  });
  session.ws.addEventListener("message", (event) => handleQwenMessage(prefix, JSON.parse(event.data)));
  session.ws.addEventListener("close", () => {
    if (session.connectionRecovering && !options.recovery) return;
    if (session.connectionRecovering && options.recovery) {
      session.connectionRecovering = false;
      scheduleQwenConnectionRecovery(prefix, "Recovery WebSocket closed");
      return;
    }
    if (session.userDisconnected) {
      session.connected = false;
      session.transport = "";
      stopQwenHeartbeat(prefix);
      qwenSetStatus(prefix, "Disconnected", false);
      qwenSetControls(prefix, false);
      return;
    }
    if (!session.connected && session.transport !== "http") {
      startQwenHttpFallback(prefix, openingInstructions);
      return;
    }
    if (scheduleQwenConnectionRecovery(prefix, "WebSocket closed")) return;
    session.connected = false;
    stopQwenHeartbeat(prefix);
    stopQwenMic(prefix, false);
    qwenSetStatus(prefix, "Disconnected", false);
    qwenSetControls(prefix, false);
  });
  session.ws.addEventListener("error", () => {
    if (session.connectionRecovering && !options.recovery) return;
    if (session.connectionRecovering && options.recovery) {
      session.connectionRecovering = false;
      scheduleQwenConnectionRecovery(prefix, "Recovery WebSocket error");
      return;
    }
    if (session.userDisconnected) {
      session.connected = false;
      session.transport = "";
      stopQwenHeartbeat(prefix);
      qwenSetStatus(prefix, "Disconnected", false);
      qwenSetControls(prefix, false);
      return;
    }
    if (!session.connected && session.transport !== "http") {
      startQwenHttpFallback(prefix, openingInstructions);
      return;
    }
    if (scheduleQwenConnectionRecovery(prefix, "WebSocket error")) return;
    stopQwenHeartbeat(prefix);
    qwenSetStatus(prefix, "Connection error", false);
    qwenAddBubble(prefix, "system", "Connection error.");
  });
}

async function startQwenSpeaking(prefix) {
  const session = qwenSession(prefix);
  if (session.connected || session.connecting || session.ws?.readyState === WebSocket.OPEN) return;
  const panelScope = document.querySelector(`.qwen-speaking[data-prefix="${prefix}"]`)?.dataset?.speakingScope || "full";
  const scopeConfig = speakingPracticeScopeConfig(panelScope);
  session.practiceScope = scopeConfig.id;
  session.targetMs = scopeConfig.targetMs;
  session.recentQuestions = qwenRecentQuestionLedger();
  session.countdownExpiredHandled = false;
  session.connecting = true;
  qwenHideScoringProgress(prefix);
  session.userDisconnected = false;
  void requestQwenWakeLock(prefix);
  stopQwenProactiveRenewal(prefix);
  if (session.connectionRecoveryTimer) clearTimeout(session.connectionRecoveryTimer);
  session.connectionRecoveryTimer = null;
  session.connectionRecovering = false;
  session.connectionRecoveryAttempts = 0;
  session.lastDisconnectReason = "";
  stopQwenHeartbeat(prefix);
  session.suppressConnectionRecovery = true;
  qwenCloseWebRtc(prefix);
  session.suppressConnectionRecovery = false;
  const log = $(`${prefix}-speaking-log`);
  if (log) log.textContent = "";
  session.assistantNode = null;
  session.openingRequested = false;
  const scoreInput = $(`${prefix}-speaking-score`);
  if (scoreInput) scoreInput.value = "";
  session.transport = "";
  session.httpSessionId = "";
  session.pc = null;
  session.dataChannel = null;
  session.remoteStream = null;
  session.webrtcSessionTimer = null;
  session.webrtcAudioSender = null;
  session.webrtcAudioTrack = null;
  session.webrtcAudioSending = false;
  session.webrtcMediaUngated = false;
  session.micStream = null;
  session.sourceNode = null;
  session.workletNode = null;
  session.scriptNode = null;
  session.silentGain = null;
  if (session.pollTimer) clearTimeout(session.pollTimer);
  session.pollTimer = null;
  session.micAudioQueue = [];
  if (session.micAudioFlushTimer) clearTimeout(session.micAudioFlushTimer);
  session.micAudioFlushTimer = null;
  session.awaitingScore = false;
  session.finalScoreInFlight = false;
  session.scoreFilled = false;
  session.scoringText = "";
  session.realtimeScoreNote = "";
  session.realtimeScoreNoteResolve = null;
  session.scoreNoteInFlight = false;
  session.scoreNoteTimedOut = false;
  session.scoringProgressValue = 0;
  session.turnCommitted = false;
  session.inputPaused = false;
  session.waitingForResponse = false;
  session.responseRetryCount = 0;
  session.askedQuestions = [];
  session.candidateAnswers = [];
  session.candidateQuestions = [];
  session.dialogueTurns = [];
  session.sessionStartedAt = Date.now();
  if (session.uiTimer) clearInterval(session.uiTimer);
  session.uiTimer = setInterval(() => qwenUpdateExamMeta(prefix), 1000);
  qwenUpdateExamMeta(prefix);
  qwenResetExaminerSchedule(prefix);
  qwenAdvanceScheduledAction(prefix);
  session.voiceStarted = false;
  session.voiceStartAt = 0;
  session.voicedMs = 0;
  session.lastVoiceFrameAt = 0;
  session.lastVoiceAt = 0;
  session.lastHumanVoiceAt = 0;
  session.silenceSince = 0;
  session.noiseFloor = 0;
  session.speechFrameCount = 0;
  session.quietFrameCount = 0;
  session.lastMicPacketAt = 0;
  session.currentTurnBytes = 0;
  if (session.autoCommitTimer) clearTimeout(session.autoCommitTimer);
  session.autoCommitTimer = null;
  stopQwenAutoCommitLoop(prefix);
  stopQwenAutoCommitLoop(prefix);
  if (session.commitWatchdogTimer) clearTimeout(session.commitWatchdogTimer);
  session.commitWatchdogTimer = null;
  if (session.webRtcTurnTimer) clearTimeout(session.webRtcTurnTimer);
  session.webRtcTurnTimer = null;
  if (session.webRtcFallbackTimer) clearTimeout(session.webRtcFallbackTimer);
  session.webRtcFallbackTimer = null;
  if (session.autoScoreTimer) clearTimeout(session.autoScoreTimer);
  session.autoScoreTimer = null;
  session.autoScoreInFlight = false;
  session.lastAutoScoreKey = "";
  session.webRtcResponseRequested = false;
  session.serverTurnCommitted = false;
  session.webRtcLastCompletedAt = 0;
  session.nextQuestionPrepared = false;
  session.webRtcTurnPreparedForAnswer = false;
  session.currentAssistantText = "";
  session.pendingAssistantText = "";
  session.assistantTextSource = "";
  session.scheduleAdvancedForResponse = false;
  session.lastFinalAssistantText = "";
  session.lastFinalAssistantAt = 0;
  session.candidateNode = null;
  session.currentCandidateText = "";
  session.lastCandidateText = "";
  session.lastCandidateAt = 0;
  if (session.assistantRenderId) cancelAnimationFrame(session.assistantRenderId);
  session.assistantRenderId = null;
  session.pendingAudioChunks = [];
  if (session.audioRenderId) clearTimeout(session.audioRenderId);
  session.audioRenderId = null;
  session.audioJitterStarted = false;
  session.responseActive = false;
  if (session.playbackTailTimer) clearTimeout(session.playbackTailTimer);
  session.playbackTailTimer = null;
  session.playbackBlockedUntil = 0;
  session.recordingChunks = [];
  session.recordingMime = "";
  session.recordingBlob = null;
  session.recordingDataUrl = "";
  session.recordingReady = null;
  session.recordingResult = null;
  session.recordingPlaybackCursor = 0;
  session.recordingMicSource = null;
  session.recordingDestination = null;
  session.recordingContext = null;
  const openingInstructions = qwenTurnControlInstructions(prefix, "opening");
  const recordingNode = $(`${prefix}-recording-download`);
  if (recordingNode) recordingNode.innerHTML = "";
  unlockQwenOutput(prefix);
  qwenSetStatus(prefix, "Connecting...", false);
  qwenSetControls(prefix, false);
  document.querySelectorAll(`.start-qwen-speaking[data-prefix="${prefix}"]`).forEach((button) => {
    button.disabled = true;
  });
  document.querySelectorAll(`.qwen-disconnect[data-prefix="${prefix}"]`).forEach((button) => {
    button.disabled = false;
  });
  await qwenRuntimeConfig();
  const tryWebRtc = await qwenShouldTryWebRtc(prefix);
  if (!tryWebRtc) {
    startQwenWebSocket(prefix, openingInstructions);
    return;
  }
  try {
    await startQwenWebRtc(prefix, openingInstructions);
  } catch (error) {
    qwenAddBubble(prefix, "system", `WebRTC unavailable, using WebSocket fallback: ${error.message}`);
    qwenCloseWebRtc(prefix);
    session.transport = "";
    session.connected = false;
    await stopQwenMic(prefix, false);
    startQwenWebSocket(prefix, openingInstructions);
  }
}

async function startQwenHttpFallback(prefix, prompt) {
  const session = qwenSession(prefix);
  if (session.userDisconnected) return;
  if (session.transport === "http" || session.httpSessionId) return;
  try {
    session.transport = "http";
    qwenSetStatus(prefix, "Connecting via HTTP fallback...", false);
    qwenAddBubble(prefix, "system", "WebSocket unavailable, switching to HTTP fallback.");
    const response = await fetch("/api/qwen-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instructions: prompt,
      voice: "Ethan",
      turnDetection: "manual",
    }),
  });
    const json = await parseJsonResponse(response);
    if (!json.id) throw new Error("HTTP session failed");
    session.httpSessionId = json.id;
    pollQwenHttpEvents(prefix);
  } catch (error) {
    session.transport = "";
    qwenSetStatus(prefix, "Connection error", false);
    qwenAddBubble(prefix, "system", `Live voice connection failed: ${error.message}`);
  }
}

async function pollQwenHttpEvents(prefix) {
  const session = qwenSession(prefix);
  if (session.transport !== "http" || !session.httpSessionId) return;
  try {
    const response = await fetch(`/api/qwen-session/${session.httpSessionId}/events`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "poll failed");
    for (const event of json.events || []) handleQwenMessage(prefix, event);
  } catch (error) {
    if (session.transport === "http") {
      if (scheduleQwenConnectionRecovery(prefix, `HTTP fallback polling failed: ${error.message}`)) return;
      qwenSetStatus(prefix, "Connection error", false);
      qwenAddBubble(prefix, "system", `Live voice polling failed: ${error.message}`);
    }
  } finally {
    if (session.transport === "http" && session.httpSessionId && !session.connectionRecovering) {
      session.pollTimer = setTimeout(() => pollQwenHttpEvents(prefix), 60);
    }
  }
}

function handleQwenMessage(prefix, message) {
  const session = qwenSession(prefix);
  if (session.userDisconnected && message.type !== "status") return;
  if (message.type === "status") {
    if (message.status === "qwen-open") {
      session.connected = true;
      session.connecting = false;
      const wasRecovering = session.connectionRecovering;
      session.connectionRecovering = false;
      session.connectionRecoveryAttempts = 0;
      session.lastDisconnectReason = "";
      qwenSetStatus(prefix, wasRecovering ? "Reconnected. Continue speaking." : session.transport === "http" ? "Connected · HTTP fallback" : "Connected · WebSocket", true);
      qwenSetControls(prefix, true);
      initQwenOutput(prefix);
      void requestQwenWakeLock(prefix);
      markQwenRealtimeSegmentStarted(prefix);
      startQwenHeartbeat(prefix);
      qwenAddBubble(prefix, "system", wasRecovering ? "Reconnected. Please continue the same speaking answer or wait for the examiner." : "Live speaking session ready.");
      startQwenMic(prefix);
    }
    if (message.status === "qwen-closed") {
      if (session.connectionRecovering) return;
      if (session.userDisconnected) {
        session.connected = false;
        stopQwenHeartbeat(prefix);
        qwenSetControls(prefix, false);
        qwenSetStatus(prefix, "Disconnected", false);
        return;
      }
      if (scheduleQwenConnectionRecovery(prefix, message.reason ? `Qwen closed: ${message.reason}` : "Qwen closed")) return;
      session.connected = false;
      stopQwenHeartbeat(prefix);
      qwenSetControls(prefix, false);
      const reason = message.reason ? ` (${message.reason})` : "";
      qwenSetStatus(prefix, `Disconnected${reason}`, false);
    }
    return;
  }
  if (message.type === "error") {
    if (session.transport && scheduleQwenConnectionRecovery(prefix, message.message || "Realtime connection error")) return;
    qwenSetStatus(prefix, "Error", false);
    qwenSetControls(prefix, false);
    stopQwenHeartbeat(prefix);
    qwenAddBubble(prefix, "system", message.message || "Session stopped.");
    return;
  }
  if (message.type !== "event") return;
  const payload = message.payload || {};
  const type = payload.type || message.eventType || "";
  const delta = payload.delta || payload.audio || payload.text || payload.transcript || "";
  if (type === "error" || type.endsWith(".error") || payload.error) {
    session.waitingForResponse = false;
    session.turnCommitted = false;
    session.inputPaused = false;
    clearQwenCommitWatchdog(prefix);
    clearQwenWebRtcTurnTimer(prefix);
    clearQwenWebRtcFallbackTimer(prefix);
    const errorMessage = payload.message || payload.error?.message || payload.error || "Realtime response error.";
    qwenSetStatus(prefix, "Error", false);
    qwenAddBubble(prefix, "system", String(errorMessage));
    return;
  }
  if (type === "session.updated" && !session.openingRequested) {
    session.openingRequested = true;
    qwenSend(prefix, { type: "response.create", instructions: qwenTurnControlInstructions(prefix, "opening") });
  }
  if ((type === "response.audio.delta" || type === "response.output_audio.delta") && delta) {
    session.waitingForResponse = false;
    clearQwenCommitWatchdog(prefix);
    clearQwenWebRtcTurnTimer(prefix);
    clearQwenWebRtcFallbackTimer(prefix);
    qwenBeginAssistantResponse(prefix, "audio");
    qwenSetStatus(prefix, "Examiner speaking...", true);
    session.pendingAudioChunks.push(delta);
    if (!session.audioRenderId) {
      const delay = session.audioJitterStarted ? 12 : QWEN_PLAYBACK_INITIAL_JITTER_MS;
      session.audioJitterStarted = true;
      session.audioRenderId = window.setTimeout(() => flushQwenAudio(prefix), delay);
    }
  }
  if (type === "response.audio_transcript.delta") {
    session.waitingForResponse = false;
    clearQwenCommitWatchdog(prefix);
    clearQwenWebRtcTurnTimer(prefix);
    clearQwenWebRtcFallbackTimer(prefix);
    qwenBeginAssistantResponse(prefix, "audio");
    qwenSetStatus(prefix, "Examiner speaking...", true);
    qwenAppendAssistant(prefix, delta);
  }
  if (type === "response.output_text.delta" || type === "response.text.delta") {
    session.waitingForResponse = false;
    clearQwenCommitWatchdog(prefix);
    clearQwenWebRtcTurnTimer(prefix);
    clearQwenWebRtcFallbackTimer(prefix);
    if ((session.awaitingScore || session.scoreNoteInFlight) && delta) {
      session.scoringText = mergeQwenTextValue(session.scoringText, delta);
      return;
    }
    if (session.assistantTextSource !== "audio") {
      qwenBeginAssistantResponse(prefix, "text");
      qwenAppendAssistant(prefix, delta);
    }
  }
  if (type.includes("input_audio_transcription")) {
    qwenUpdateCandidateTranscript(prefix, payload.transcript || payload.text || delta);
    if (type === "conversation.item.input_audio_transcription.completed"
      || type === "input_audio_transcription.completed") {
      qwenRememberCandidateAnswer(prefix, payload.transcript || payload.text || qwenLatestTurnCandidateText(session));
    }
    if (type === "conversation.item.input_audio_transcription.completed"
      && session.transport === "webrtc"
      && session.serverTurnCommitted
      && !session.turnCommitted
      && !session.waitingForResponse
      && !session.responseActive
      && qwenWordCount(qwenLatestTurnCandidateText(session)) >= 2) {
      session.webRtcLastCompletedAt = Date.now();
      qwenSetStatus(prefix, "Processing your answer...", true);
      startQwenWebRtcSubmitWatchdog(prefix);
      scheduleQwenWebRtcResponse(prefix, QWEN_WEBRTC_SUBMIT_GRACE_MS);
    }
  }
  if (type === "input_audio_buffer.speech_started") {
    clearQwenWebRtcTurnTimer(prefix);
    session.serverTurnCommitted = false;
    session.webRtcLastCompletedAt = 0;
    session.webRtcResponseRequested = false;
    session.responseRetryCount = 0;
    session.silenceSince = 0;
    qwenSetStatus(prefix, "Listening to your answer...", true);
  }
  if (type === "input_audio_buffer.speech_stopped" || type === "input_audio_buffer.committed") {
    if (session.transport === "webrtc") qwenSetWebRtcAudioSending(prefix, false);
    session.serverTurnCommitted = true;
    scheduleQwenWebRtcResponse(prefix, 900);
    qwenSetStatus(prefix, "Processing your answer...", true);
  }
  if (type === "response.created") {
    if (session.transport === "webrtc") qwenSetWebRtcAudioSending(prefix, false);
    if (!session.awaitingScore && !session.responseActive) {
      qwenRememberCandidateAnswer(prefix, qwenLatestTurnCandidateText(session));
      qwenClearActiveCandidateTurn(prefix);
    }
    session.responseActive = true;
    session.audioJitterStarted = false;
    session.waitingForResponse = false;
    session.nextQuestionPrepared = false;
    session.webRtcTurnPreparedForAnswer = false;
    clearQwenWebRtcTurnTimer(prefix);
    clearQwenWebRtcFallbackTimer(prefix);
    qwenSetStatus(prefix, session.awaitingScore ? "Collecting realtime evidence..." : "Examiner preparing response...", true);
  }
  if (type === "response.done" || type === "response.audio.done" || type === "response.text.done" || type === "response.output_text.done" || type === "response.audio_transcript.done") {
    const finalText = compactDialogueText(qwenTextFromPayload(payload));
    const shouldUseFinalText = finalText
      && !session.awaitingScore
      && !session.currentAssistantText
      && !(session.assistantTextSource === "audio" && (type === "response.output_text.done" || type === "response.text.done" || type === "response.done"));
    if (shouldUseFinalText) {
      qwenBeginAssistantResponse(prefix, type.includes("audio") ? "audio" : "text");
      qwenAppendAssistant(prefix, finalText);
    }
    session.responseActive = false;
    session.audioJitterStarted = false;
    session.waitingForResponse = false;
    session.inputPaused = false;
    clearQwenCommitWatchdog(prefix);
    clearQwenWebRtcTurnTimer(prefix);
    clearQwenWebRtcFallbackTimer(prefix);
    const responseText = session.scoringText || session.pendingAssistantText || session.currentAssistantText || finalText;
    const wasScoreNote = session.awaitingScore || session.scoreNoteInFlight;
    if (wasScoreNote) {
      session.realtimeScoreNote = compactDialogueText(responseText || session.scoringText || session.realtimeScoreNote);
      if (session.realtimeScoreNoteResolve) {
        session.realtimeScoreNoteResolve(session.realtimeScoreNote);
        session.realtimeScoreNoteResolve = null;
      }
      session.awaitingScore = false;
      session.scoreNoteInFlight = false;
      session.scoreNoteTimedOut = false;
      qwenSetStatus(prefix, "Realtime evidence ready", true);
    }
    if (!wasScoreNote) {
      qwenRememberCandidateAnswer(prefix, qwenLatestTurnCandidateText(session));
      qwenRememberExaminerQuestion(prefix, responseText);
      session.nextQuestionPrepared = false;
      session.webRtcTurnPreparedForAnswer = false;
      qwenClearActiveCandidateTurn(prefix);
    }
    session.turnCommitted = false;
    session.voiceStarted = false;
    session.voiceStartAt = 0;
    session.voicedMs = 0;
    session.lastVoiceFrameAt = 0;
    session.lastVoiceAt = 0;
    session.lastHumanVoiceAt = 0;
    session.silenceSince = 0;
    session.noiseFloor = 0;
    session.speechFrameCount = 0;
    session.quietFrameCount = 0;
    session.currentTurnBytes = 0;
    session.webRtcResponseRequested = false;
    session.serverTurnCommitted = false;
    if (session.assistantRenderId) cancelAnimationFrame(session.assistantRenderId);
    session.assistantRenderId = null;
    if (session.assistantNode) {
      session.assistantNode.textContent = session.pendingAssistantText || session.currentAssistantText || session.assistantNode.textContent;
    }
    session.lastFinalAssistantText = session.pendingAssistantText || session.currentAssistantText || finalText || session.lastFinalAssistantText || "";
    session.lastFinalAssistantAt = Date.now();
    session.pendingAssistantText = "";
    session.assistantNode = null;
    session.assistantTextSource = "";
    if (!qwenOutputBusy(prefix)) qwenSetSpeakingVisualState(prefix, session.micActive ? "candidate" : "idle");
    qwenMaybeAutoFinish(prefix);
  }
}

async function startQwenMic(prefix) {
  const session = qwenSession(prefix);
  if (!session.connected || session.micActive) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Audio capture is not supported in this browser. Try Chrome, Edge, or Safari.");
    }
    session.inputContext = new AudioContextClass({ latencyHint: "interactive" });
    if (!session.micStream) {
      session.micStream = await navigator.mediaDevices.getUserMedia(qwenMicConstraints());
    }
    if (session.inputContext.state === "suspended") await session.inputContext.resume().catch(() => {});
    if (!session.recordingContext) {
      session.recordingContext = new AudioContextClass({ latencyHint: "interactive", sampleRate: QWEN_PLAYBACK_SAMPLE_RATE });
      if (session.recordingContext.state === "suspended") await session.recordingContext.resume().catch(() => {});
    }
    if (session.recordingContext.createMediaStreamDestination && !session.recordingDestination) {
      session.recordingDestination = session.recordingContext.createMediaStreamDestination();
      session.recordingMicSource = session.recordingContext.createMediaStreamSource(session.micStream);
      session.recordingMicSource.connect(session.recordingDestination);
      session.recordingPlaybackCursor = session.recordingContext.currentTime + 0.05;
      if (session.remoteStream) attachQwenRemoteAudio(prefix, session.remoteStream);
    }
    if (!session.recorder || session.recorder.state === "inactive") startQwenRecording(prefix);
    session.sourceNode = session.inputContext.createMediaStreamSource(session.micStream);
    session.silentGain = session.inputContext.createGain();
    session.silentGain.gain.value = 0;
    session.silentGain.connect(session.inputContext.destination);
    session.pcmBuffer = [];
    session.pcmPosition = 0;

    const canUseWorklet = session.inputContext.audioWorklet && typeof AudioWorkletNode !== "undefined";
    if (canUseWorklet) {
      try {
        await session.inputContext.audioWorklet.addModule("/pcm-worklet.js?v=20260720-audio-gate-2");
        session.workletNode = new AudioWorkletNode(session.inputContext, "pcm-worklet", {
          processorOptions: {
            targetRate: QWEN_PCM_TARGET_SAMPLE_RATE,
            chunkMs: QWEN_PCM_CHUNK_MS,
          },
        });
        session.workletNode.port.addEventListener("message", (event) => {
          if (event.data.type !== "pcm") return;
          sendQwenMicPacket(prefix, event.data.pcm, event.data.level);
        });
        session.workletNode.port.start();
        session.sourceNode.connect(session.workletNode);
        session.workletNode.connect(session.silentGain);
      } catch {
        setupQwenScriptProcessor(prefix);
      }
    } else {
      setupQwenScriptProcessor(prefix);
    }
    session.micActive = true;
    startQwenAutoCommitLoop(prefix);
    if (session.transport === "webrtc") qwenSetWebRtcAudioSending(prefix, false);
    const button = document.querySelector(`.qwen-mic-toggle[data-prefix="${prefix}"]`);
    if (button) button.textContent = "Stop mic";
    qwenSetControls(prefix, session.connected);
    if (session.transport === "webrtc") {
      document.querySelectorAll(`.qwen-commit-answer[data-prefix="${prefix}"]`).forEach((item) => {
        item.disabled = true;
        item.setAttribute("aria-disabled", "true");
      });
    }
    qwenSetStatus(prefix, "Listening...", true);
  } catch (error) {
    await stopQwenMic(prefix, false);
    qwenAddBubble(prefix, "system", `Microphone could not be started: ${error.message}`);
  }
}

function setupQwenScriptProcessor(prefix) {
  const session = qwenSession(prefix);
  if (!session.inputContext.createScriptProcessor) {
    throw new Error("Audio capture is not supported in this browser. Try Safari, Chrome, or Edge.");
  }
  const bufferSize = 2048;
  session.scriptNode = session.inputContext.createScriptProcessor(bufferSize, 1, 1);
  session.scriptNode.onaudioprocess = (event) => {
    if (!session.micActive || !session.connected) return;
    const input = event.inputBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < input.length; i += 1) sum += input[i] * input[i];
    const level = Math.sqrt(sum / input.length);
    const ratio = session.inputContext.sampleRate / QWEN_PCM_TARGET_SAMPLE_RATE;
    const pcmChunkSamples = Math.max(160, Math.round((QWEN_PCM_TARGET_SAMPLE_RATE * QWEN_PCM_CHUNK_MS) / 1000));
    while (session.pcmPosition < input.length) {
      const index = Math.floor(session.pcmPosition);
      const sample = Math.max(-1, Math.min(1, input[index] || 0));
      session.pcmBuffer.push(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
      session.pcmPosition += ratio;
    }
    session.pcmPosition -= input.length;
    while (session.pcmBuffer.length >= pcmChunkSamples) {
      const chunk = new Int16Array(pcmChunkSamples);
      for (let i = 0; i < chunk.length; i += 1) chunk[i] = session.pcmBuffer.shift();
      sendQwenMicPacket(prefix, chunk.buffer, level);
    }
  };
  session.sourceNode.connect(session.scriptNode);
  session.scriptNode.connect(session.silentGain);
}

function sendQwenMicPacket(prefix, pcm, level) {
  const session = qwenSession(prefix);
  if (!session.micActive || !session.connected) return;
  const speechLevel = Number(level || 0);
  const startThreshold = session.transport === "webrtc" ? 0.01 : 0.004;
  const normalizedLevel = Math.min(1, level * 14);
  const bar = $(`${prefix}-qwen-level`);
  const meter = $(`${prefix}-qwen-meter`);
  const orb = $(`${prefix}-speaking-orb`);
  if (bar) bar.style.width = `${Math.round(normalizedLevel * 100)}%`;
  if (meter) meter.textContent = normalizedLevel.toFixed(2);
  if (orb) orb.style.setProperty("--voice-level", normalizedLevel.toFixed(3));
  if (session.inputPaused || session.turnCommitted || qwenOutputBusy(prefix)) {
    if (session.transport === "webrtc") qwenSetWebRtcAudioSending(prefix, false);
    return;
  }
  if (!session.voiceStarted && speechLevel < startThreshold) {
    if (session.transport === "webrtc") qwenSetWebRtcAudioSending(prefix, false);
    return;
  }
  session.lastMicPacketAt = Date.now();
  session.currentTurnBytes += pcm?.byteLength || 0;
  if (session.transport === "webrtc") {
    const now = Date.now();
    const continueThreshold = 0.0065;
    if (speechLevel >= startThreshold) {
      qwenSetWebRtcAudioSending(prefix, true);
      clearQwenWebRtcTurnTimer(prefix);
      if (!session.voiceStarted) {
        session.voiceStartAt = now;
        session.voicedMs = 0;
        session.lastVoiceFrameAt = now;
      } else {
        session.voicedMs += Math.min(120, Math.max(0, now - (session.lastVoiceFrameAt || now)));
        session.lastVoiceFrameAt = now;
      }
      session.voiceStarted = true;
      session.lastVoiceAt = now;
      session.silenceSince = 0;
      qwenSetStatus(prefix, "Listening to your answer...", true);
      return;
    }
    if (session.voiceStarted && speechLevel >= continueThreshold) {
      qwenSetWebRtcAudioSending(prefix, true);
      session.lastVoiceAt = now;
      session.silenceSince = 0;
      return;
    }
    if (session.voiceStarted && !session.silenceSince) {
      session.silenceSince = now;
    }
    if (session.voiceStarted && session.lastVoiceAt && now - session.lastVoiceAt >= QWEN_WEBRTC_AUDIO_TAIL_MS) {
      qwenSetWebRtcAudioSending(prefix, false);
    }
    if (session.voiceStarted && session.lastVoiceAt && now - session.lastVoiceAt >= QWEN_WEBRTC_LOCAL_SILENCE_MS) {
      scheduleQwenWebRtcResponse(prefix, 120);
    }
    return;
  }
  qwenSend(prefix, { type: "audio.append", audio: pcm });
  scheduleQwenAutoCommit(prefix, level);
}

function scheduleQwenAutoCommit(prefix, level) {
  const session = qwenSession(prefix);
  if (!session.micActive || !session.connected || session.awaitingScore || session.turnCommitted) return;
  if (qwenOutputBusy(prefix)) return;
  const now = Date.now();
  const voice = qwenUpdateWsHumanVoice(prefix, level);
  if (voice.active) {
    qwenSetStatus(prefix, "Listening...", true);
    if (!session.voiceStarted) {
      session.voiceStarted = true;
      session.voiceStartAt = now;
      session.voicedMs = 0;
      session.lastVoiceFrameAt = now;
    } else {
      session.voicedMs += Math.min(120, Math.max(0, now - (session.lastVoiceFrameAt || now)));
      session.lastVoiceFrameAt = now;
    }
    session.lastVoiceAt = session.lastHumanVoiceAt || now;
    session.silenceSince = 0;
    armQwenAutoCommitWatchdog(prefix);
    return;
  }
  if (!session.lastVoiceAt || !qwenHasMinimumWsTurn(session)) return;
  if (!session.silenceSince) session.silenceSince = now;
  if (session.autoCommitTimer) return;
  armQwenAutoCommitWatchdog(prefix);
}

function armQwenAutoCommitWatchdog(prefix, delayMs = QWEN_WS_SILENCE_COMMIT_MS + 120) {
  const session = qwenSession(prefix);
  if (session.transport === "webrtc") return;
  if (session.autoCommitTimer) clearTimeout(session.autoCommitTimer);
  session.autoCommitTimer = setTimeout(() => {
    session.autoCommitTimer = null;
    if (!session.micActive || !session.connected || session.awaitingScore || session.turnCommitted) return;
    if (qwenOutputBusy(prefix)) {
      armQwenAutoCommitWatchdog(prefix, 500);
      return;
    }
    if (qwenMaybeCommitWsAnswer(prefix)) return;
    if (!qwenHasMinimumWsTurn(session)) return;
    const lastHumanVoiceAt = Number(session.lastHumanVoiceAt || session.lastVoiceAt || 0);
    const silenceAge = lastHumanVoiceAt ? Date.now() - lastHumanVoiceAt : 0;
    if (!lastHumanVoiceAt || silenceAge < QWEN_WS_SILENCE_COMMIT_MS) {
      armQwenAutoCommitWatchdog(prefix, Math.max(350, QWEN_WS_SILENCE_COMMIT_MS - silenceAge + 120));
      return;
    }
    armQwenAutoCommitWatchdog(prefix, 350);
  }, delayMs);
}

async function stopQwenMic(prefix, commit = false) {
  const session = qwenSession(prefix);
  const wasActive = session.micActive;
  qwenSetWebRtcAudioSending(prefix, false);
  session.micActive = false;
  const recordingPromise = stopQwenRecording(prefix);
  if (session.scriptNode) session.scriptNode.onaudioprocess = null;
  session.sourceNode?.disconnect();
  session.workletNode?.disconnect();
  session.scriptNode?.disconnect();
  session.silentGain?.disconnect();
  session.recordingMicSource?.disconnect();
  session.recordingRemoteSource?.disconnect();
  session.sourceNode = null;
  session.workletNode = null;
  session.scriptNode = null;
  session.silentGain = null;
  session.pcmBuffer = [];
  session.pcmPosition = 0;
  session.micStream?.getTracks().forEach((track) => track.stop());
  session.micStream = null;
  await session.inputContext?.close().catch(() => {});
  session.inputContext = null;
  await recordingPromise;
  await session.recordingContext?.close().catch(() => {});
  session.recordingContext = null;
  session.recordingDestination = null;
  session.recordingMicSource = null;
  session.recordingRemoteSource = null;
  session.recordingPlaybackCursor = 0;
  if (session.autoCommitTimer) clearTimeout(session.autoCommitTimer);
  session.autoCommitTimer = null;
  stopQwenAutoCommitLoop(prefix);
  if (session.commitWatchdogTimer) clearTimeout(session.commitWatchdogTimer);
  session.commitWatchdogTimer = null;
  clearQwenWebRtcTurnTimer(prefix);
  clearQwenWebRtcFallbackTimer(prefix);
  const bar = $(`${prefix}-qwen-level`);
  const meter = $(`${prefix}-qwen-meter`);
  const orb = $(`${prefix}-speaking-orb`);
  if (bar) bar.style.width = "0%";
  if (meter) meter.textContent = "0.00";
  if (orb) orb.style.setProperty("--voice-level", "0");
  if (!qwenOutputBusy(prefix)) qwenSetSpeakingVisualState(prefix, "idle");
  const button = document.querySelector(`.qwen-mic-toggle[data-prefix="${prefix}"]`);
  if (button) button.textContent = "Toggle mic";
  if (commit && wasActive) commitQwenAnswer(prefix);
}

function toggleQwenMic(prefix) {
  const session = qwenSession(prefix);
  if (session.micActive) stopQwenMic(prefix, true);
  else startQwenMic(prefix);
}

function commitQwenAnswer(prefix) {
  const session = qwenSession(prefix);
  if (session.turnCommitted) return;
  if (qwenOutputBusy(prefix)) {
    qwenSetStatus(prefix, "Please wait for playback to finish", true);
    return;
  }
  if (!session.voiceStarted || (session.currentTurnBytes || 0) < QWEN_WS_MIN_TURN_BYTES) {
    qwenSetStatus(prefix, "Listening...", true);
    return;
  }
  session.turnCommitted = true;
  session.inputPaused = true;
  session.waitingForResponse = true;
  session.responseRetryCount = 0;
  if (session.autoCommitTimer) clearTimeout(session.autoCommitTimer);
  session.autoCommitTimer = null;
  clearQwenCommitWatchdog(prefix);
  qwenRememberCandidateAnswer(prefix, qwenLatestTurnCandidateText(session));
  qwenAdvanceScheduledAction(prefix);
  qwenSend(prefix, { type: "audio.commit" });
  qwenSend(prefix, {
    type: "session.update",
    instructions: qwenTurnControlInstructions(prefix, "next-question"),
    voice: "Ethan",
    turnDetection: "manual",
  });
  qwenSend(prefix, { type: "response.create", instructions: qwenTurnControlInstructions(prefix, "next-question") });
  qwenSetStatus(prefix, "Answer submitted, waiting...", true);
  qwenAddBubble(prefix, "system", "Answer submitted.");
  scheduleQwenCommitWatchdog(prefix);
}

async function waitForQwenIdle(prefix, timeoutMs = 12000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const session = qwenSession(prefix);
    if (!session.waitingForResponse && !qwenOutputBusy(prefix)) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  }
  return false;
}

async function requestQwenRealtimeScoreNote(prefix) {
  const session = qwenSession(prefix);
  if (!session.connected || session.userDisconnected) return "";
  await waitForQwenIdle(prefix, 4500);
  if (!session.connected || session.userDisconnected) return "";
  session.awaitingScore = true;
  session.scoreNoteInFlight = true;
  session.scoreNoteTimedOut = false;
  session.scoringText = "";
  session.realtimeScoreNote = "";
  qwenSetScoringProgress(prefix, 26, "Collecting realtime examiner evidence...", true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value = "", options = {}) => {
      if (settled) return;
      settled = true;
      if (!options.keepInFlight) {
        session.awaitingScore = false;
        session.scoreNoteInFlight = false;
        session.scoreNoteTimedOut = false;
      } else {
        session.awaitingScore = false;
        session.scoreNoteTimedOut = true;
      }
      session.waitingForResponse = false;
      const note = compactDialogueText(value || session.scoringText || session.realtimeScoreNote || "");
      session.realtimeScoreNote = note;
      if (!options.keepInFlight) session.realtimeScoreNoteResolve = null;
      resolve(note);
    };
    session.realtimeScoreNoteResolve = finish;
    try {
      session.waitingForResponse = true;
      qwenSend(prefix, {
        type: "response.create",
        modalities: ["text"],
        instructions: qwenTurnControlInstructions(prefix, "score"),
      });
    } catch {
      finish("");
      return;
    }
    window.setTimeout(() => finish(session.scoringText, { keepInFlight: true }), 8000);
  });
}

function qwenMaybeAutoFinish(prefix) {
  const session = qwenSession(prefix);
  if (session.awaitingScore || session.finalScoreInFlight || session.autoFinishStarted) return;
  if (session.scheduledAction?.kind !== "auto-finish" && session.lastActionKind !== "auto-finish") return;
  if (!qwenSpeakingMinimumReached(prefix)) {
    session.scheduledAction = null;
    session.lastActionKind = "";
    qwenAdvanceScheduledAction(prefix, { allowAdaptive: true });
    return;
  }
  if (qwenWordCount(qwenBuildAutoScoreTranscript(prefix)) < 12) return;
  session.autoFinishStarted = true;
  qwenSetStatus(prefix, "Speaking test complete. Scoring now...", true);
  window.setTimeout(() => {
    finishQwenSpeaking(prefix).catch((error) => {
      session.autoFinishStarted = false;
      qwenSetStatus(prefix, `Auto scoring failed: ${error.message}`, false);
    });
  }, 500);
}

async function finishQwenSpeaking(prefix) {
  setUnifiedPracticeStage("speaking", "scoring");
  const session = qwenSession(prefix);
  if (session.finalScoreInFlight) return;
  session.finalScoreInFlight = true;
  try {
    qwenSetStatus(prefix, "Ending speaking test...", true);
    qwenStartFakeScoringProgress(prefix);
    await waitForQwenIdle(prefix, 5000);
    await stopQwenMic(prefix, false);
    session.awaitingScore = false;
    session.scoringText = "";
    session.waitingForResponse = false;
    session.inputPaused = false;
    session.scoreFilled = false;
    clearQwenCommitWatchdog(prefix);
    qwenSetStatus(prefix, "Scoring speaking band...", true);
    qwenSetScoringProgress(prefix, 18, "Preparing transcript...", true);
    const realtimeNote = await requestQwenRealtimeScoreNote(prefix);
    qwenSetScoringProgress(prefix, 36, "Preparing MP3 evidence...", true);
    const audioEvidence = await createQwenRecordingDownload(prefix, { timeoutMs: QWEN_RECORDING_UPLOAD_TIMEOUT_MS });
    qwenSetScoringProgress(prefix, 48, qwenAudioEvidenceIsMp3(audioEvidence) ? "Scoring with transcript and MP3..." : "Scoring with transcript evidence...", true);
    const result = await qwenRunAutoScore(prefix, {
      force: true,
      fillScore: true,
      showFeedback: true,
      showStatus: true,
      showProgress: true,
      realtimeNote,
      audioEvidence,
    });
    if (!result) {
      setUnifiedPracticeStage("speaking", "practice");
      qwenSetStatus(prefix, "No complete speaking answer to score yet", false);
      qwenStopFakeScoringProgress(prefix, "Not enough speech to score yet.");
      window.setTimeout(() => qwenHideScoringProgress(prefix), 3500);
      return;
    }
    const band = speakingBandFromFeedbackPayload(result.feedback || "", result.band);
    qwenSetScoringProgress(prefix, 94, "Preparing final voice closing...", true);
    qwenSetStatus(prefix, band ? `Speaking ended. Final Band: ${band}. Saying goodbye...` : "Speaking ended. Score ready. Saying goodbye...", true);
    await qwenSayGoodbyeAndDisconnect(prefix, band);
    revealSpeakingResult(prefix);
    if (prefix === "single" && state.activeModule === "speaking") await completeActivePracticeSession();
    qwenSetScoringProgress(prefix, 98, "Preparing recording download...", true);
    createQwenRecordingDownload(prefix, { forceUpload: true, timeoutMs: QWEN_RECORDING_DOWNLOAD_RETRY_TIMEOUT_MS }).catch(() => {});
    qwenStopFakeScoringProgress(prefix, band ? `Score ready: Band ${band}` : "Score ready");
    window.setTimeout(() => qwenHideScoringProgress(prefix), 5000);
  } catch (error) {
    setUnifiedPracticeStage("speaking", "practice");
    qwenStopFakeScoringProgress(prefix, "Scoring failed. Please try again.");
    window.setTimeout(() => qwenHideScoringProgress(prefix), 5000);
    qwenSetStatus(prefix, `Speaking scoring failed: ${error.message}`, false);
  } finally {
    session.finalScoreInFlight = false;
  }
}

async function qwenSayGoodbyeAndDisconnect(prefix, band) {
  const session = qwenSession(prefix);
  const finalLine = band ? `Your final speaking score is Band ${band}.` : "Your speaking score is ready.";
  const goodbye = `${finalLine} Thank you. This is the end of the IELTS Speaking test. Goodbye.`;
  if (!session.connected) {
    disconnectQwenSpeaking(prefix);
    return;
  }
  try {
    if (session.scoreNoteInFlight) await waitForQwenIdle(prefix, 3500);
    session.waitingForResponse = true;
    qwenSend(prefix, {
      type: "response.create",
      instructions: `${goodbye} Say this once only. Do not ask another question.`,
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    await waitForQwenIdle(prefix, 6500);
  } finally {
    disconnectQwenSpeaking(prefix);
  }
}

function preferredRecordingMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return options.find((mime) => MediaRecorder.isTypeSupported(mime)) || "";
}

function startQwenRecording(prefix) {
  const session = qwenSession(prefix);
  const stream = session.recordingDestination?.stream || session.micStream;
  if (typeof MediaRecorder === "undefined" || !stream) return;
  try {
    const mimeType = preferredRecordingMime();
    session.recordingChunks ||= [];
    session.recordingMime = mimeType || "audio/webm";
    session.recordingReady = null;
    session.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    session.recorder.ondataavailable = (event) => {
      if (event.data?.size) session.recordingChunks.push(event.data);
    };
    session.recorder.start(1000);
  } catch (error) {
    qwenAddBubble(prefix, "system", `Recording could not start: ${error.message}`);
  }
}

function stopQwenRecording(prefix) {
  const session = qwenSession(prefix);
  if (!session.recorder || session.recorder.state === "inactive") return Promise.resolve();
  return new Promise((resolve) => {
    session.recordingReady = resolve;
    session.recorder.onstop = () => {
      session.recordingReady = null;
      resolve();
    };
    try {
      session.recorder.stop();
    } catch {
      resolve();
    }
  });
}

function qwenRecordingDownloadHref(result) {
  return result?.downloadUrl || result?.url || result?.dataUrl || "";
}

function renderQwenRecordingDownload(target, result, warningText = "") {
  if (!target) return;
  const href = qwenRecordingDownloadHref(result);
  if (!href) {
    target.innerHTML = `<span class="notice-inline">${escapeHtml(warningText || "Recording download is not ready yet.")}</span>`;
    return;
  }
  const label = result?.mode === "mp3" ? "Download speaking MP3" : "Download speaking recording";
  const fileName = result?.fileName || "ielts-speaking-recording.mp3";
  const warning = warningText || result?.warning || "";
  target.innerHTML = `<a class="download-link" href="${escapeHtml(href)}" download="${escapeHtml(fileName)}" target="_blank" rel="noreferrer">${label}</a>${warning ? `<span class="notice-inline">${escapeHtml(warning)}</span>` : ""}`;
}

async function qwenRecordingDataUrl(prefix) {
  const session = qwenSession(prefix);
  if (session.recordingDataUrl) return session.recordingDataUrl;
  const blob = qwenRecordingBlob(prefix);
  if (!blob) return "";
  session.recordingDataUrl = await blobToDataUrl(blob);
  return session.recordingDataUrl;
}

function qwenRecordingBlob(prefix) {
  const session = qwenSession(prefix);
  if (session.recordingBlob) return session.recordingBlob;
  if (!session.recordingChunks.length) return null;
  session.recordingBlob = new Blob(session.recordingChunks, { type: session.recordingMime || "audio/webm" });
  return session.recordingBlob;
}

function qwenOriginalRecordingFallback(session, dataUrl, warning = "") {
  const ext = (session.recordingMime || "").includes("mp4")
    ? "mp4"
    : (session.recordingMime || "").includes("ogg")
      ? "ogg"
      : (session.recordingMime || "").includes("wav")
        ? "wav"
        : "webm";
  return {
    mode: "original",
    fileName: `ielts-speaking-recording.${ext}`,
    mime: session.recordingMime || "audio/webm",
    dataUrl,
    warning,
  };
}

async function createQwenRecordingDownload(prefix, options = {}) {
  const session = qwenSession(prefix);
  const target = $(`${prefix}-recording-download`);
  const forceUpload = Boolean(options.forceUpload);
  const timeoutMs = Number(options.timeoutMs || 0);
  if (session.recordingResult?.dataUrl && (!forceUpload || session.recordingResult.downloadUrl)) {
    renderQwenRecordingDownload(target, session.recordingResult);
    return session.recordingResult;
  }
  if (!session.recordingChunks.length) {
    if (target) target.innerHTML = `<span class="notice-inline">This browser did not produce a recording file.</span>`;
    return null;
  }
  if (target) target.innerHTML = `<span class="notice-inline">Generating speaking recording MP3...</span>`;
  const blob = qwenRecordingBlob(prefix);
  if (!blob) {
    if (target) target.innerHTML = `<span class="notice-inline">This browser did not produce a recording file.</span>`;
    return null;
  }
  try {
    const json = await postBlobWithTimeout("/api/speaking/recording", blob, timeoutMs);
    if (!json.dataUrl) json.dataUrl = await qwenRecordingDataUrl(prefix);
    session.recordingResult = json;
    renderQwenRecordingDownload(target, json);
    return json;
  } catch (error) {
    const dataUrl = await qwenRecordingDataUrl(prefix);
    const fallback = qwenOriginalRecordingFallback(session, dataUrl, "MP3 conversion was unavailable. The original recording is ready to download.");
    session.recordingResult = fallback;
    renderQwenRecordingDownload(target, fallback);
    return fallback;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fillSpeakingBandFromText(prefix, text) {
  const clean = String(text || "");
  const extracted = extractSpeakingBandFromText(clean);
  if (extracted) {
    updateSpeakingScorePanel(prefix, clean, extracted);
    qwenSession(prefix).scoreFilled = true;
    return;
  }
  const direct = normalizeSpeakingBand(clean);
  if (direct) {
    updateSpeakingScorePanel(prefix, clean, direct);
    qwenSession(prefix).scoreFilled = true;
    return;
  }
  const patterns = [
    /overall\s*band\s*[:：]?\s*(\d(?:\.\d)?)/i,
    /speaking\s*band\s*[:：]?\s*(\d(?:\.\d)?)/i,
    /band\s*score\s*[:：]?\s*(\d(?:\.\d)?)/i,
    /总分\s*[:：]?\s*(\d(?:\.\d)?)/,
  ];
  const match = patterns.map((pattern) => clean.match(pattern)).find(Boolean);
  if (!match) return;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 9) return;
  const rounded = Math.round(value * 2) / 2;
  updateSpeakingScorePanel(prefix, clean, rounded.toFixed(1));
  qwenSession(prefix).scoreFilled = true;
}

function ensureQwenDisconnectConfirmDialog() {
  let overlay = $("qwenDisconnectConfirm");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "qwenDisconnectConfirm";
  overlay.className = "qwen-disconnect-confirm";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="qwen-disconnect-card" role="dialog" aria-modal="true" aria-labelledby="qwenDisconnectTitle">
      <div>
        <h3 id="qwenDisconnectTitle">Keep speaking?</h3>
        <p>Your IELTS Speaking test is still running. Continue the conversation or disconnect now.</p>
      </div>
      <div class="qwen-disconnect-actions">
        <button id="qwenContinueSpeaking" class="primary" type="button">Continue speaking</button>
        <button id="qwenConfirmDisconnect" class="secondary danger-button" type="button">Disconnect</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) continueQwenSpeakingFromConfirm();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) continueQwenSpeakingFromConfirm();
  });
  $("qwenContinueSpeaking")?.addEventListener("click", continueQwenSpeakingFromConfirm);
  $("qwenConfirmDisconnect")?.addEventListener("click", () => {
    const prefix = overlay.dataset.prefix || "";
    overlay.hidden = true;
    if (prefix) disconnectQwenSpeaking(prefix);
  });
  return overlay;
}

function requestQwenDisconnect(prefix) {
  const session = qwenSession(prefix);
  if (!session.connected && !session.micActive && !session.transport) {
    disconnectQwenSpeaking(prefix);
    return;
  }
  const overlay = ensureQwenDisconnectConfirmDialog();
  overlay.dataset.prefix = prefix;
  overlay.hidden = false;
  window.setTimeout(() => $("qwenContinueSpeaking")?.focus(), 0);
}

function continueQwenSpeakingFromConfirm() {
  const overlay = $("qwenDisconnectConfirm");
  if (!overlay || overlay.hidden) return;
  const prefix = overlay.dataset.prefix || "";
  overlay.hidden = true;
  overlay.dataset.prefix = "";
  if (!prefix) return;
  const session = qwenSession(prefix);
  unlockQwenOutput(prefix);
  if (session.connected || session.micActive || session.transport) {
    qwenSetControls(prefix, true);
    qwenSetStatus(prefix, qwenOutputBusy(prefix) ? "Examiner speaking..." : "Continue speaking.", true);
  }
}

function disconnectQwenSpeaking(prefix) {
  const session = qwenSession(prefix);
  if (session.uiTimer) clearInterval(session.uiTimer);
  session.uiTimer = null;
  session.userDisconnected = true;
  void releaseQwenWakeLock(prefix);
  stopQwenProactiveRenewal(prefix);
  if (session.connectionRecoveryTimer) clearTimeout(session.connectionRecoveryTimer);
  session.connectionRecoveryTimer = null;
  session.connectionRecovering = false;
  session.connectionRecoveryAttempts = 0;
  session.lastDisconnectReason = "";
  session.connected = false;
  session.inputPaused = false;
  session.waitingForResponse = false;
  session.responseActive = false;
  session.turnCommitted = false;
  session.awaitingScore = false;
  session.scoreNoteInFlight = false;
  session.scoreNoteTimedOut = false;
  session.realtimeScoreNoteResolve = null;
  qwenStopOutputPlayback(prefix);
  stopQwenMic(prefix, false);
  if (session.micAudioFlushTimer) clearTimeout(session.micAudioFlushTimer);
  session.micAudioFlushTimer = null;
  session.micAudioQueue = [];
  qwenSend(prefix, { type: "disconnect" });
  stopQwenHeartbeat(prefix);
  if (session.pollTimer) clearTimeout(session.pollTimer);
  if (session.autoScoreTimer) clearTimeout(session.autoScoreTimer);
  clearQwenCommitWatchdog(prefix);
  clearQwenWebRtcTurnTimer(prefix);
  clearQwenWebRtcFallbackTimer(prefix);
  clearQwenWebRtcSubmitWatchdog(prefix);
  stopQwenAutoCommitLoop(prefix);
  session.pollTimer = null;
  session.autoScoreTimer = null;
  qwenCloseWebRtc(prefix);
  if (!session.finalScoreInFlight) qwenHideScoringProgress(prefix);
  session.transport = "";
  session.httpSessionId = "";
  session.ws?.close(1000, "user disconnected");
  session.ws = null;
  qwenSetControls(prefix, false);
  qwenSetStatus(prefix, "Disconnected", false);
}

function initQwenOutput(prefix) {
  const session = qwenSession(prefix);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const created = !session.outputContext;
  session.outputContext ||= new AudioContextClass({ latencyHint: "playback", sampleRate: QWEN_PLAYBACK_SAMPLE_RATE });
  if (session.outputContext.state === "suspended") session.outputContext.resume().catch(() => {});
  if (created || !Number.isFinite(session.playbackCursor) || session.playbackCursor < session.outputContext.currentTime) {
    session.playbackCursor = session.outputContext.currentTime + QWEN_PLAYBACK_LEAD_SECONDS;
  }
}

function unlockQwenOutput(prefix) {
  const session = qwenSession(prefix);
  try {
    initQwenOutput(prefix);
    if (!session.outputContext || session.outputUnlocked) return;
    const buffer = session.outputContext.createBuffer(1, 1, QWEN_PLAYBACK_SAMPLE_RATE);
    const source = session.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(session.outputContext.destination);
    source.start(0);
    session.outputUnlocked = true;
  } catch {
    session.outputUnlocked = false;
  }
}

function qwenDecodePcmChunks(chunks) {
  const validChunks = (Array.isArray(chunks) ? chunks : [chunks]).filter(Boolean);
  if (!validChunks.length) return null;
  const buffers = validChunks.map((base64) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
  const totalBytes = buffers.reduce((sum, item) => sum + item.byteLength, 0);
  if (totalBytes < 2) return null;
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buffer of buffers) {
    bytes.set(buffer, offset);
    offset += buffer.byteLength;
  }
  return bytes;
}

function playQwenPcmChunks(prefix, chunks) {
  const bytes = qwenDecodePcmChunks(chunks);
  if (!bytes) return;
  const session = qwenSession(prefix);
  initQwenOutput(prefix);
  if (!session.outputContext) return;
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const audioBuffer = session.outputContext.createBuffer(1, sampleCount, QWEN_PLAYBACK_SAMPLE_RATE);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) channel[i] = view.getInt16(i * 2, true) / 32768;
  const source = session.outputContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(session.outputContext.destination);
  session.playbackSources ||= new Set();
  session.playbackSources.add(source);
  source.onended = () => {
    session.playbackSources?.delete(source);
    try {
      source.disconnect();
    } catch {}
  };
  session.playbackCursor = Math.max(session.playbackCursor, session.outputContext.currentTime + QWEN_PLAYBACK_LEAD_SECONDS);
  source.start(session.playbackCursor);
  session.playbackCursor += audioBuffer.duration;

  if (session.recordingContext && session.recordingDestination) {
    const recordingBuffer = session.recordingContext.createBuffer(1, sampleCount, QWEN_PLAYBACK_SAMPLE_RATE);
    const recordingChannel = recordingBuffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) recordingChannel[i] = channel[i];
    const recordingSource = session.recordingContext.createBufferSource();
    recordingSource.buffer = recordingBuffer;
    recordingSource.connect(session.recordingDestination);
    session.recordingPlaybackCursor = Math.max(session.recordingPlaybackCursor || 0, session.recordingContext.currentTime + QWEN_PLAYBACK_LEAD_SECONDS);
    recordingSource.start(session.recordingPlaybackCursor);
    session.recordingPlaybackCursor += recordingBuffer.duration;
  }
}

function playQwenPcm(prefix, base64) {
  playQwenPcmChunks(prefix, [base64]);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function singlePracticeMeta(moduleName) {
  const map = {
    listening: {
      title: "Listening with AI",
      label: "Listening with AI",
      estimate: "30 min",
      recommended: "Catch numbers, plurals and section details.",
      self: "Choose a Cambridge listening paper from the bank.",
      output: "Score + answer review + captions when available",
    },
    reading: {
      title: "Reading with AI",
      label: "Reading with AI",
      estimate: "60 min",
      recommended: "Practise evidence-based answer selection.",
      self: "Choose one reading paper and work through it.",
      output: "Score + evidence review",
    },
    writing: {
      title: "Writing with AI",
      label: "Writing with AI",
      estimate: "20 or 40 min",
      recommended: "Practise one Task 1 chart or one Task 2 topic independently.",
      self: "Choose Task 1 or Task 2 before selecting a question.",
      output: "Independent band report + rewrite task",
    },
    speaking: {
      title: "Speaking with AI",
      label: "Speaking with AI",
      estimate: "15 min",
      recommended: "Start a focused AI speaking examiner session.",
      self: "Choose a Cambridge or public speaking topic.",
      output: "Band estimate + transcript + recording",
    },
  };
  return map[moduleName] || map.listening;
}

function singleModeOptions(moduleName) {
  const map = {
    listening: [
      { id: "exam", icon: "⏱️", title: "Exam mode", text: "Real 40-question test.", output: "Score + review" },
      { id: "training", icon: "🎧", title: "Training mode", text: "Section drill with captions.", output: "Evidence + traps" },
      { id: "review", icon: "🔁", title: "Review mode", text: "Wrong answers first.", output: "Rule + retest" },
    ],
    reading: [
      { id: "full", icon: "📖", title: "Full passage", text: "Split passage + questions.", output: "Score + evidence" },
      { id: "evidence", icon: "🔎", title: "Evidence drill", text: "Find the proof sentence.", output: "Paraphrase chain" },
      { id: "type", icon: "🧩", title: "Question type", text: "Train one question type.", output: "Type review" },
      { id: "review", icon: "🔁", title: "Review mistakes", text: "Saved weak areas first.", output: "Retest" },
    ],
    writing: [
      { id: "coach", icon: "✍️", title: "Writing with AI", text: "Independent Task 1 or Task 2 practice with grading and rewrite.", output: "Band + rewrite task" },
      { id: "custom", icon: "📄", title: "Custom task", text: "Paste your own question and essay in Writing with AI.", output: "AI writing report" },
    ],
    speaking: [
      { id: "diagnostic", icon: "🎙️", title: "Diagnostic test", text: "15-minute IELTS examiner session.", output: "Band + recording" },
      { id: "part2", icon: "🗣️", title: "Cue card drill", text: "Practise Part 2 fluency without repeating answers.", output: "Fluency retest" },
      { id: "retest", icon: "🎯", title: "Retest weak criterion", text: "Use your last report to focus one criterion.", output: "Updated score" },
    ],
  };
  return map[moduleName] || map.listening;
}

function currentSinglePracticeMode(moduleName = state.activeModule) {
  const options = singleModeOptions(moduleName);
  const saved = state.singlePracticeModes?.[moduleName] || options[0]?.id || "";
  return options.some((item) => item.id === saved) ? saved : options[0]?.id || "";
}

function singleModeLabel(moduleName, mode = currentSinglePracticeMode(moduleName)) {
  return singleModeOptions(moduleName).find((item) => item.id === mode)?.title || "Practice mode";
}

function singleSectionQuestionRange(moduleName, section = 1) {
  const safeSection = Math.max(1, Math.min(moduleName === "reading" ? 3 : 4, Number(section) || 1));
  if (moduleName === "reading") {
    return [
      [1, 13],
      [14, 26],
      [27, 40],
    ][safeSection - 1];
  }
  return [(safeSection - 1) * 10 + 1, safeSection * 10];
}

function questionsInRange(questions, start, end) {
  return (questions || []).filter((question, index) => {
    const number = questionNumber(question, index);
    return number >= start && number <= end;
  });
}

function selectedQuestionNumbers(questions) {
  return new Set((questions || []).map((question, index) => questionNumber(question, index)).filter(Number.isFinite));
}

function paperImagesForQuestionSubset(images, allQuestions, paper, selectedQuestions) {
  if (!Array.isArray(images) || !images.length || !selectedQuestions?.length) return images || [];
  const selected = selectedQuestionNumbers(selectedQuestions);
  const metadataPages = new Set((selectedQuestions || []).map((question) => Number(question.questionPage)).filter(Number.isFinite));
  if (metadataPages.size) {
    const metadataFiltered = uniqueOrderedImages(images).filter((image) => metadataPages.has(Number(image.page)));
    if (metadataFiltered.length) return metadataFiltered;
  }
  const assignments = assignQuestionsToPages(images, allQuestions, paper);
  const filtered = uniqueOrderedImages(images).filter((image, index) => {
    const page = image.page || index + 1;
    return (assignments.get(page) || []).some((number) => selected.has(number));
  });
  return filtered.length ? filtered : images;
}

function readingPassageImagesForQuestionSubset(images, paper, selectedQuestions, providedStarts = {}) {
  const orderedImages = uniqueOrderedImages(images || []);
  if (!orderedImages.length || !selectedQuestions?.length) return orderedImages;
  const selectedPassages = new Set(
    [...selectedQuestionNumbers(selectedQuestions)].map((number) => number <= 13 ? 1 : number <= 26 ? 2 : 3),
  );
  if (!selectedPassages.size || selectedPassages.size > 1) return orderedImages;
  const startPages = readingPassagePageByQuestion(orderedImages, paper, providedStarts);
  const passage = [...selectedPassages][0];
  const startPage = Number(startPages.get(passage === 1 ? 1 : passage === 2 ? 14 : 27));
  const nextPage = passage < 3
    ? Number(startPages.get(passage === 1 ? 14 : 27))
    : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(startPage)) return orderedImages;
  const filtered = orderedImages.filter((image) => {
    const page = Number(image.page || 0);
    return page >= startPage && page < nextPage;
  });
  return filtered.length ? filtered : orderedImages;
}

function saveSingleAnswersToState() {
  state.singleAnswers = { ...(state.singleAnswers || {}), ...collectAnswers("single") };
}

function restoreSingleAnswersFromState() {
  document.querySelectorAll('.answer-input[data-prefix="single"]').forEach((input) => {
    const saved = state.singleAnswers?.[input.dataset.qid];
    if (saved !== undefined) input.value = saved;
  });
}

function singlePracticeItemForMode(moduleName, sourceItem) {
  const item = normalizeItem(sourceItem);
  const mode = currentSinglePracticeMode(moduleName);
  if (!["listening", "reading"].includes(moduleName)) return item;
  if (item.practiceScope && item.practiceScope !== "paper") return item;
  const allQuestions = item.questions || [];
  let questions = allQuestions;

  if (mode === "review") {
    const previous = latestObjectiveResult(moduleName, item.id || "");
    const wrongIds = new Set(previous?.wrongQuestionIds || []);
    questions = allQuestions.filter((question) => wrongIds.has(question.id));
    if (!questions.length) return { ...item, questions: [], reviewUnavailable: true };
  } else if (moduleName === "listening" && mode === "training") {
    const [start, end] = singleSectionQuestionRange(moduleName, state.singlePracticeSections.listening);
    questions = questionsInRange(allQuestions, start, end);
  } else if (moduleName === "reading" && mode === "evidence") {
    const [start, end] = singleSectionQuestionRange(moduleName, state.singlePracticeSections.reading);
    questions = questionsInRange(allQuestions, start, end);
  } else if (moduleName === "reading" && mode === "type") {
    const availableTypes = [...new Set(allQuestions.map((question) => question.type).filter((type) => type && type !== "unknown"))];
    if (!availableTypes.includes(state.readingQuestionType)) state.readingQuestionType = availableTypes[0] || "unknown";
    questions = allQuestions.filter((question) => question.type === state.readingQuestionType);
  }

  if (moduleName === "listening" && mode !== "exam") {
    const numbers = [...selectedQuestionNumbers(questions)];
    const activeSections = new Set(numbers.map((number) => Math.ceil(number / 10)));
    const audioUrls = (item.audioUrls || []).map((url, index) => activeSections.has(index + 1) ? url : "");
    return {
      ...item,
      questions,
      audioUrls,
      questionPageImages: paperImagesForQuestionSubset(item.questionPageImages || [], allQuestions, item.questionPaper, questions),
      minutes: mode === "training" ? 10 : item.minutes,
    };
  }
  if (moduleName === "reading") {
    return {
      ...item,
      questions,
      readingQuestionPageImages: paperImagesForQuestionSubset(item.readingQuestionPageImages || item.readingPageImages || [], allQuestions, item.readingPaper, questions),
    };
  }
  return { ...item, questions };
}

function renderSingleRuntimeControls(moduleName, mode) {
  if (state.activeSingle?.practiceScope && state.activeSingle.practiceScope !== "paper") return "";
  if (moduleName === "listening" && mode === "training") {
    return `<div class="single-runtime-controls" aria-label="Listening section">
      <span>Section</span>
      ${[1, 2, 3, 4].map((section) => `<button class="${state.singlePracticeSections.listening === section ? "active" : ""}" type="button" data-single-section="${section}" data-module="listening">${section}</button>`).join("")}
    </div>`;
  }
  if (moduleName === "reading" && mode === "evidence") {
    return `<div class="single-runtime-controls" aria-label="Reading passage">
      <span>Passage</span>
      ${[1, 2, 3].map((passage) => `<button class="${state.singlePracticeSections.reading === passage ? "active" : ""}" type="button" data-single-section="${passage}" data-module="reading">${passage}</button>`).join("")}
    </div>`;
  }
  if (moduleName === "reading" && mode === "type") {
    const types = [...new Map((state.activeSingle?.questions || [])
      .filter((question) => question.type && question.type !== "unknown")
      .map((question) => [question.type, question.typeLabel || question.type])).entries()];
    return `<label class="single-runtime-controls reading-type-control" for="readingQuestionType">
      <span>Question type</span>
      <select id="readingQuestionType" class="text-input">
        ${types.map(([type, label]) => `<option value="${escapeHtml(type)}"${type === state.readingQuestionType ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      </select>
    </label>`;
  }
  return "";
}

function renderSingleModePicker(moduleName) {
  const selected = currentSinglePracticeMode(moduleName);
  return `<section class="single-mode-picker" aria-label="${escapeHtml(moduleDisplayName(moduleName))} practice mode">
    ${singleModeOptions(moduleName).map((mode) => `<label class="single-mode-option ${mode.id === selected ? "active" : ""}">
      <input type="radio" name="singlePracticeMode" value="${escapeHtml(mode.id)}"${mode.id === selected ? " checked" : ""} />
      <span aria-hidden="true">${escapeHtml(mode.icon)}</span>
      <strong>${escapeHtml(mode.title)}</strong>
      <em>${escapeHtml(mode.text)}</em>
      <small>${escapeHtml(mode.output)}</small>
    </label>`).join("")}
  </section>`;
}

function singleScopeOptions(moduleName) {
  return [
    { id: "paper", icon: "📝", label: "Full tests", detail: moduleName === "listening" ? "40 questions · 30 min" : "40 questions · 60 min" },
    { id: "section", icon: moduleName === "listening" ? "🎧" : "📖", label: moduleName === "listening" ? "Sections" : "Passages", detail: moduleName === "listening" ? "10 questions each" : "13–14 questions each" },
    { id: "topic", icon: "🧭", label: "Topics", detail: moduleName === "listening" ? "Content topics · audio subject" : "Content topics · passage subject" },
    { id: "review", icon: "🔁", label: "Review mistakes", detail: "Your saved wrong answers" },
  ];
}

function renderSingleScopeTabs(moduleName) {
  if (!["listening", "reading"].includes(moduleName)) return "";
  const selected = currentSinglePracticeScope(moduleName);
  return `<nav class="single-scope-tabs" role="tablist" aria-label="${escapeHtml(moduleDisplayName(moduleName))} library">
    ${singleScopeOptions(moduleName).map((scope) => `<button class="single-scope-tab ${scope.id === selected ? "active" : ""}" role="tab" type="button" data-single-scope="${scope.id}" aria-selected="${scope.id === selected ? "true" : "false"}">
      <span aria-hidden="true">${scope.icon}</span><strong>${escapeHtml(scope.label)}</strong><small>${escapeHtml(scope.detail)}</small>
    </button>`).join("")}
  </nav>`;
}

function practiceCompletionDateLabel(completedAt = "") {
  const match = String(completedAt || "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

function practiceCompletionScoreLabel(status = {}) {
  const numeric = (raw) => raw === "" || raw === null || raw === undefined ? Number.NaN : Number(raw);
  const correct = numeric(status.correct);
  const total = numeric(status.total);
  const band = numeric(status.band);
  const labels = [];
  if (Number.isFinite(correct) && correct >= 0 && Number.isFinite(total) && total > 0 && correct <= total) {
    labels.push(`${correct}/${total}`);
  }
  if (Number.isFinite(band) && band >= 0 && band <= 9) labels.push(`Band ${band.toFixed(1)}`);
  return labels.join(" · ");
}

function practiceCompletionDisplay(status = {}) {
  if (!status.completed) return "○ Not completed";
  const score = practiceCompletionScoreLabel(status);
  const date = practiceCompletionDateLabel(status.completedAt);
  const detail = [score, date].filter(Boolean).join(" · ");
  return `✓ Completed${detail ? ` · ${detail}` : ""}`;
}

function practiceCompletionGroupSummary(moduleName, items = [], completionIndex = null) {
  const normalized = items.filter(Boolean);
  const completedCount = normalized.reduce(
    (count, item) => count + Number(practiceCompletionStatus(moduleName, item, completionIndex).completed),
    0,
  );
  return {
    completedCount,
    totalCount: normalized.length,
    label: `${completedCount}/${normalized.length} completed`,
  };
}

const objectiveTopicDirectory = [
  { key: "friends", label: "Friends", emoji: "👥", accent: "people", keywords: ["people", "mind", "behaviour"], semanticKeys: ["psychology"] },
  { key: "food", label: "Food", emoji: "🍽️", accent: "lifestyle", keywords: ["cooking", "farming", "restaurants"], semanticKeys: ["food"] },
  { key: "place", label: "Place", emoji: "📍", accent: "place", keywords: ["travel", "transport", "buildings"], semanticKeys: ["travel", "transport", "architecture"] },
  { key: "exams", label: "Exams", emoji: "📝", accent: "education", keywords: ["study", "learning", "campus"], semanticKeys: ["education"] },
  { key: "shopping", label: "Shopping", emoji: "🛍️", accent: "lifestyle", keywords: ["money", "business", "markets"], semanticKeys: ["business"] },
  { key: "weather", label: "Weather", emoji: "🌦️", accent: "nature", keywords: ["nature", "climate", "wildlife"], semanticKeys: ["environment"] },
  { key: "films", label: "Films", emoji: "🎬", accent: "media", keywords: ["culture", "arts", "heritage"], semanticKeys: ["culture"] },
  { key: "family", label: "Family", emoji: "👨‍👩‍👧", accent: "society", keywords: ["society", "community", "people"], semanticKeys: ["society"] },
  { key: "work", label: "Work", emoji: "💼", accent: "work", keywords: ["jobs", "careers", "workplace"], semanticKeys: ["work"] },
  { key: "technology", label: "Technology", emoji: "🖥️", accent: "technology", keywords: ["science", "research", "technology"], semanticKeys: ["science"] },
  { key: "health", label: "Health", emoji: "💗", accent: "lifestyle", keywords: ["health", "medicine", "wellbeing"], semanticKeys: ["health"] },
  { key: "history", label: "History", emoji: "🏺", accent: "society", keywords: ["history", "heritage", "archaeology"], semanticKeys: ["history"] },
];

function objectiveTopicPresentation(contentTopic = {}) {
  const semanticKey = String(contentTopic.key || "general").trim() || "general";
  const presentation = objectiveTopicDirectory.find((item) => item.semanticKeys.includes(semanticKey));
  if (presentation) return presentation;
  const fallbackKeywords = String(contentTopic.label || "General interest")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 3);
  return {
    key: semanticKey,
    label: contentTopic.label || "General interest",
    emoji: contentTopic.emoji || "✨",
    accent: "people",
    keywords: fallbackKeywords.length ? fallbackKeywords : ["general", "ideas", "practice"],
    semanticKeys: [semanticKey],
  };
}

function objectiveTopicProgressOptions(moduleName, completionIndex = null) {
  const papers = applySingleFilters(mergedItems(moduleName).map(normalizeItem), moduleName);
  const units = scopedPracticeUnits(moduleName, papers, "topic");
  return applySingleUnitFilters(units, moduleName, "topic", completionIndex, false);
}

function buildObjectiveTopicGroups(moduleName, visibleOptions, progressOptions, completionIndex = null) {
  const visibleKeys = new Set(visibleOptions.map((item) => objectiveTopicPresentation(item.contentTopic).key));
  const groups = new Map();
  progressOptions.forEach((item) => {
    const contentTopic = objectiveTopicPresentation(item.contentTopic);
    const key = contentTopic.key;
    if (!visibleKeys.has(key)) return;
    if (!groups.has(key)) groups.set(key, { key, contentTopic, items: [] });
    groups.get(key).items.push(item);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      presentation: group.contentTopic,
      progress: practiceCompletionGroupSummary(moduleName, group.items, completionIndex),
      visibleItems: visibleOptions.filter((item) => objectiveTopicPresentation(item.contentTopic).key === group.key),
    }))
    .sort((a, b) => String(a.contentTopic.label || a.key).localeCompare(String(b.contentTopic.label || b.key)));
}

function objectiveTopicSourceLabel(items = [], moduleName = "listening") {
  const books = items.map(itemBook).filter(Number.isFinite).sort((a, b) => a - b);
  const firstBook = books[0];
  const lastBook = books[books.length - 1];
  const range = firstBook && lastBook ? (firstBook === lastBook ? `Cambridge ${firstBook}` : `Cambridge ${firstBook}–${lastBook}`) : "Cambridge";
  const unitLabel = moduleName === "reading" ? "passage" : "section";
  return `${items.length} ${unitLabel}${items.length === 1 ? "" : "s"} · ${range}`;
}

function objectiveTopicArrowIcon() {
  return `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderObjectiveTopicCard(group, moduleName) {
  const topic = group.contentTopic || {};
  const chips = group.presentation.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
  return `<article class="objective-topic-card topic-accent-${escapeHtml(group.presentation.accent)}" data-objective-topic-key="${escapeHtml(group.key)}">
    <div class="objective-topic-card-head">
      <span class="objective-topic-icon" aria-hidden="true">${escapeHtml(topic.emoji || "✨")}</span>
      <span class="objective-topic-progress">${escapeHtml(group.progress.label)}</span>
    </div>
    <h4>${escapeHtml(topic.label || "General interest")}</h4>
    <div class="objective-topic-keywords">${chips}</div>
    <footer>
      <span>${escapeHtml(objectiveTopicSourceLabel(group.items, moduleName))}</span>
      <button class="primary" type="button" data-objective-topic-open="${escapeHtml(group.key)}">Choose ${objectiveTopicArrowIcon()}</button>
    </footer>
  </article>`;
}

const VOCAB_IMPORT_MARKER = "__IELTS_VOCAB_IMPORT__";

function encodeVocabularyImportPayload(payload) {
  return `${VOCAB_IMPORT_MARKER}${JSON.stringify(payload)}`;
}

function parseImportedVocabularyPayload(item) {
  const raw = String(item?.explanation || item?.context || "");
  const source = String(item?.source || "");
  const shouldParse = raw.startsWith(VOCAB_IMPORT_MARKER) || source.startsWith("ProfessionalImport:");
  if (!shouldParse) return null;
  const payloadText = raw.startsWith(VOCAB_IMPORT_MARKER) ? raw.slice(VOCAB_IMPORT_MARKER.length) : raw;
  try {
    const payload = JSON.parse(payloadText);
    if (!payload || typeof payload !== "object") return null;
    return payload;
  } catch {
    return null;
  }
}

function splitVocabularyImportLine(line) {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes("|")) return line.split("|");
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseVocabularyImportLines(text, defaults = {}) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^term\s*[\t|,]/i.test(line))
    .map((line) => {
      const parts = splitVocabularyImportLine(line);
      const [term, meaning, definition, formula = "", knowledgePoint = "", example = "", translation = "", collocations = ""] = parts.map((part) => String(part || "").trim());
      if (!term || !meaning || !definition || !knowledgePoint || !example || !translation) {
        throw new Error("Each line must include term, 中文名, definition, knowledge point, exam sentence and 中文翻译. Formula can be blank.");
      }
      return {
        subject: defaults.subject || "mathematics",
        topic: defaults.topic || "uploaded-terms",
        term,
        meaning,
        definition,
        formula,
        knowledgePoint,
        example,
        translation,
        collocations: collocations.split(";").map((part) => part.trim()).filter(Boolean),
      };
    });
}

function vocabularyImportSampleForSubject(subject) {
  if (subject === "economics") {
    return "price elasticity of demand | 需求价格弹性 | the responsiveness of quantity demanded to a change in price | PED = %ΔQd / %ΔP | Elastic demand means quantity demanded changes strongly when price changes. | If demand is price elastic, a rise in price may reduce total revenue. | 如果需求富有价格弹性，价格上涨可能会降低总收益。 | elastic demand;total revenue";
  }
  if (subject === "chemistry") {
    return "mole | 摩尔 | the amount of substance containing 6.02 × 10^23 specified particles | n = m / Mr | Moles connect mass, particles, and gas volume in calculations. | Calculate the number of moles before using the balanced equation. | 先计算物质的量，再使用配平方程式。 | mole ratio;amount of substance";
  }
  if (subject === "physics") {
    return "vector | 向量 | a quantity with magnitude and direction | | A vector has both size and direction; draw an arrow or resolve it into components. | A velocity vector must include both speed and direction. | 速度向量必须同时包含大小和方向。 | vector quantity;resultant vector;components";
  }
  return "vector | 向量 | a quantity with magnitude and direction | | A vector has both size and direction and can be resolved into components. | A velocity vector must include both speed and direction. | 速度向量必须同时包含大小和方向。 | column vector;resultant vector";
}

async function readVocabularyImportFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const input = $("vocabImportInput");
    if (input) input.value = text;
    setVocabularyImportStatus(`Loaded ${file.name}. Check the columns before importing.`);
  } catch (error) {
    setVocabularyImportStatus(error.message || "Could not read this file.", true);
  }
}

function setVocabularyImportStatus(message, isError = false) {
  const node = $("vocabImportStatus");
  if (!node) return;
  node.textContent = message || "";
  node.classList.toggle("is-error", Boolean(isError));
}

async function submitVocabularyImport() {
  if (!state.authToken) {
    setVocabularyImportStatus("Login first, then import professional terms.", true);
    activateView("mine", true);
    return;
  }
  const subject = $("vocabImportSubject")?.value || "mathematics";
  const topic = cleanReviewText($("vocabImportTopic")?.value || "uploaded-terms") || "uploaded-terms";
  const input = $("vocabImportInput");
  try {
    const rows = parseVocabularyImportLines(input?.value || "", { subject, topic });
    if (!rows.length) {
      setVocabularyImportStatus("Paste at least one term line.", true);
      return;
    }
    setVocabularyImportStatus(`Importing ${rows.length} term${rows.length === 1 ? "" : "s"}...`);
    for (const row of rows) {
      await postJson("/api/vocabulary", {
        term: row.term,
        context: `${vocabularySubjectLabel(row.subject)} · ${row.topic}`,
        explanation: encodeVocabularyImportPayload(row),
        source: `ProfessionalImport:${row.subject}:${row.topic}`,
      });
    }
    if (input) input.value = "";
    await refreshMineData();
    setVocabularyImportStatus(`Imported ${rows.length} professional term${rows.length === 1 ? "" : "s"} to Mine.`);
  } catch (error) {
    setVocabularyImportStatus(error.message || "Import failed.", true);
  }
}

function renderObjectiveTopicLibrary(moduleName, visibleOptions, progressOptions, completionIndex) {
  const groups = buildObjectiveTopicGroups(moduleName, visibleOptions, progressOptions, completionIndex);
  const selectedKey = String(state.objectiveTopicSelection?.[moduleName] || "");
  const selectedGroup = groups.find((group) => group.key === selectedKey);
  if (selectedGroup) {
    const topic = selectedGroup.contentTopic || {};
    return `<section class="objective-topic-chooser" data-objective-topic-detail="${escapeHtml(selectedGroup.key)}">
      <header>
        <button class="secondary objective-topic-back" type="button" data-objective-topic-back>${objectiveTopicArrowIcon()} Back to topics</button>
        <div><span class="eyebrow">${escapeHtml(moduleDisplayName(moduleName))} topic</span><h3>${escapeHtml(topic.emoji || "✨")} ${escapeHtml(topic.label || "General interest")}</h3><p>${escapeHtml(selectedGroup.progress.label)} · ${escapeHtml(objectiveTopicSourceLabel(selectedGroup.items, moduleName))}</p></div>
      </header>
      <div class="practice-unit-grid objective-topic-unit-grid">${selectedGroup.visibleItems.map((item) => renderPracticeUnitCard(item, moduleName, completionIndex)).join("")}</div>
    </section>`;
  }
  const empty = "No content topics match the current Cambridge, unit or progress filters. Adjust or clear a filter to continue.";
  return `<section class="objective-topic-directory" data-objective-topic-directory>
    <header><div><span class="eyebrow">${escapeHtml(moduleDisplayName(moduleName))} topic library</span><h3>My topics</h3></div><span>${groups.length} content topic${groups.length === 1 ? "" : "s"}</span></header>
    ${groups.length ? `<div class="objective-topic-grid">${groups.map((group) => renderObjectiveTopicCard(group, moduleName)).join("")}</div>` : `<div class="practice-unit-empty"><span aria-hidden="true">🌱</span><p>${escapeHtml(empty)}</p></div>`}
  </section>`;
}

function renderPracticeUnitCard(item, moduleName, completionIndex) {
  const scope = item.libraryScope === "topic" ? "topic" : item.practiceScope || "paper";
  const questionCount = item.questions?.length || 0;
  const contentTopic = item.contentTopic || {};
  const completion = practiceCompletionStatus(moduleName, item, completionIndex);
  const status = completion.completed ? "completed" : "not-completed";
  const statusLabel = practiceCompletionDisplay(completion);
  const unitLabel = scope === "section"
    ? `${moduleName === "reading" ? "Passage" : "Section"} ${item.practiceSection}`
    : scope === "topic"
      ? `${contentTopic.emoji || "✨"} ${contentTopic.label || "General interest"}`
      : scope === "review" ? "Mistake review" : "Full test";
  return `<article class="practice-unit-card tone-${escapeHtml(moduleName)}" data-practice-unit-id="${escapeHtml(item.id)}" data-practice-unit-scope="${escapeHtml(scope)}" data-practice-section="${escapeHtml(item.practiceSection || "")}" data-content-topic="${escapeHtml(contentTopic.key || "")}" data-practice-status="${status}">
    <div class="practice-unit-card-head${scope === "topic" ? " topic-only" : ""}">${scope === "topic" ? "" : `<span>${scope === "section" ? "🎯" : "🔁"}</span>`}<em>${escapeHtml(unitLabel)}</em></div>
    <h4>${escapeHtml(item.title || unitLabel)}</h4>
    <p>${escapeHtml(singlePracticeEvidenceLabel(item, moduleName) || item.source || moduleDisplayName(moduleName))}</p>
    <div class="practice-unit-stats"><span><strong>${questionCount}</strong> questions</span><span><strong>${Number(item.minutes) || 20}</strong> min</span>${moduleName === "listening" ? "<span>💬 ASR captions</span>" : "<span>🔎 Evidence view</span>"}</div>
    <span class="practice-status-badge ${status}">${statusLabel}</span>
    <button class="primary" type="button" data-start-practice-unit="${escapeHtml(item.id)}">Start this practice</button>
  </article>`;
}

function renderScopedPracticeLibrary(moduleName, options, completionIndex) {
  const scope = currentSinglePracticeScope(moduleName);
  if (scope === "paper") return "";
  if (scope === "topic") {
    return renderObjectiveTopicLibrary(moduleName, options, objectiveTopicProgressOptions(moduleName, completionIndex), completionIndex);
  }
  const empty = scope === "review"
    ? "Complete and score a practice first. Your wrong answers will appear here as an independent review set."
    : "No practice units match the current filters. Adjust or clear a Cambridge, unit, topic, or progress filter to continue.";
  return `<section class="practice-unit-library" data-practice-library="${escapeHtml(scope)}">
    <header><div><span class="eyebrow">${escapeHtml(moduleDisplayName(moduleName))} library</span><h3>${escapeHtml(singleScopeOptions(moduleName).find((item) => item.id === scope)?.label || "Practice units")}</h3></div><span>${options.length} independent practice${options.length === 1 ? "" : "s"}</span></header>
    ${options.length ? `<div class="practice-unit-grid">${options.map((item) => renderPracticeUnitCard(item, moduleName, completionIndex)).join("")}</div>` : `<div class="practice-unit-empty"><span aria-hidden="true">🌱</span><p>${escapeHtml(empty)}</p></div>`}
  </section>`;
}

function renderSingleModeWorkspaceIntro(moduleName, mode = currentSinglePracticeMode(moduleName)) {
  const option = singleModeOptions(moduleName).find((item) => item.id === mode) || singleModeOptions(moduleName)[0];
  const moduleLabel = moduleDisplayName(moduleName);
  const hints = {
    listening: {
      exam: ["Captions stay hidden unless you turn them on.", "Submit when the full 40-question paper is complete."],
      training: ["Use captions only after listening once.", "After each section, ask AI Coach for audio evidence and distractors."],
      review: ["Focus wrong answers first.", "Ask AI Coach for audio time, answer format and a similar retest."],
    },
    reading: {
      full: ["Use the split layout: passage on the left, questions and answer sheet on the right.", "Submit for evidence review."],
      evidence: ["Find keywords, then locate the paraphrase in the passage.", "Ask AI Coach to show the evidence sentence."],
      type: ["Group mistakes by question type after submitting.", "Retest evidence-location questions."],
      review: ["Open saved weak areas and explain why the wrong option fails.", "Save one rule before retesting."],
    },
  };
  const introHints = hints[moduleName]?.[mode] || ["Finish the task, submit, read the AI feedback, then retest the weak point."];
  const unitId = state.activeSingle?.id || "";
  const topicType = state.activeSingle?.practiceTopic || "";
  return `<section class="single-mode-workspace-intro tone-${escapeHtml(moduleName)}" data-active-practice-unit="${escapeHtml(unitId)}"${topicType ? ` data-active-topic-type="${escapeHtml(topicType)}"` : ""}>
    <div>
      <span class="eyebrow">${escapeHtml(moduleLabel)} · ${escapeHtml(option?.title || "Practice mode")}</span>
      <h3>${escapeHtml(moduleName === "listening" ? "Listening evidence trainer" : moduleName === "reading" ? "Reading evidence locator" : `${moduleLabel} coach`)}</h3>
    </div>
    <ul>${introHints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join("")}</ul>
    ${renderSingleRuntimeControls(moduleName, mode)}
  </section>`;
}

function singleOptionLabel(item, moduleName = state.activeModule, completionIndex = null) {
  const title = item?.title || item?.type || "Untitled practice";
  const source = item?.source && moduleName !== "writing" ? ` · ${item.source}` : "";
  const status = ["listening", "reading"].includes(moduleName)
    ? ` · ${practiceCompletionDisplay(practiceCompletionStatus(moduleName, item, completionIndex))}`
    : "";
  return `${title}${source}${status}`;
}

function singleOptionTitle(item) {
  return item?.title || item?.type || "Untitled practice";
}

function readRecommendationHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(recommendationHistoryStoreKey) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRecommendationHistory(value) {
  try {
    localStorage.setItem(recommendationHistoryStoreKey, JSON.stringify(value || {}));
  } catch {}
}

function recommendationOptionId(item) {
  return String(item?.id || item?.writingTasks?.[0]?.id || item?.title || item?.prompt || "").trim();
}

function stableRecommendationHash(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function recommendationBucket(moduleName) {
  const history = readRecommendationHistory();
  const bucket = history[moduleName];
  return bucket && typeof bucket === "object" ? bucket : { recent: [] };
}

function recentRecommendationIds(moduleName, limit = 3) {
  const bucket = recommendationBucket(moduleName);
  return (Array.isArray(bucket.recent) ? bucket.recent : []).map(String).filter(Boolean).slice(0, Math.max(1, limit));
}

function rememberPracticeRecommendation(moduleName, item) {
  const id = recommendationOptionId(item);
  if (!id) return;
  const history = readRecommendationHistory();
  const bucket = history[moduleName] && typeof history[moduleName] === "object" ? history[moduleName] : {};
  const recent = [id, ...((Array.isArray(bucket.recent) ? bucket.recent : []).map(String).filter((value) => value !== id))].slice(0, 8);
  history[moduleName] = { ...bucket, recent, updatedAt: new Date().toISOString() };
  writeRecommendationHistory(history);
}

function optionRotationScore(moduleName, item, index = 0) {
  const key = [
    moduleName,
    recommendationOptionId(item),
    new Date().toISOString().slice(0, 10),
    state.currentUser?.username || "guest",
    currentSinglePracticeMode(moduleName),
    index,
  ].join("|");
  return stableRecommendationHash(key);
}

function chooseRotatingRecommendation(moduleName, options = []) {
  const normalized = options.filter(Boolean);
  if (!normalized.length) return null;
  if (normalized.length === 1) return normalized[0];
  const recent = new Set(recentRecommendationIds(moduleName, Math.min(3, normalized.length - 1)));
  const candidates = normalized.filter((item) => {
    const id = recommendationOptionId(item);
    return !id || !recent.has(id);
  });
  const pool = candidates.length ? candidates : normalized;
  const sorted = [...pool].sort((a, b) => optionRotationScore(moduleName, a) - optionRotationScore(moduleName, b));
  return sorted[0] || normalized[0];
}

function singlePracticeEvidenceLabel(item, moduleName = state.activeModule) {
  const parts = [];
  const book = itemBook(item);
  const test = itemTest(item);
  if (book) parts.push(`Cambridge ${book}`);
  if (test) parts.push(`Test ${test}`);
  if (!parts.length) {
    if (item?.source) parts.push(String(item.source));
    if (item?.period && item.period !== item.source) parts.push(String(item.period));
  }
  if (!parts.length && moduleName === "speaking") parts.push("topic rotation");
  return parts.join(" · ");
}

function singleRecommendationReason(moduleName, item, options = []) {
  const moduleLabel = moduleDisplayName(moduleName);
  const evidenceLabel = singlePracticeEvidenceLabel(item, moduleName);
  const recentIds = recentRecommendationIds(moduleName, Math.min(3, options.length - 1));
  const recentItems = recentIds
    .map((id) => options.find((candidate) => recommendationOptionId(candidate) === id))
    .filter(Boolean);
  const signals = dashboardSignalSummary();
  const weakArea = signals.weakAreas.find((area) => area.module === moduleName) || signals.weakAreas[0] || null;
  const latestObjective = signals.latestObjective;
  const writingDraft = signals.writingDrafts[0] || null;
  const speakingBand = signals.speakingBand || latestSpeakingBandForCoach() || "";
  const sourceLine = evidenceLabel || singleOptionTitle(item);
  const recentLine = recentItems.length
    ? `It avoids the last ${recentItems.length} ${moduleLabel.toLowerCase()} set${recentItems.length === 1 ? "" : "s"} you just used.`
    : `It gives you a fresh ${moduleLabel.toLowerCase()} sample before the same paper repeats.`;

  if (moduleName === "writing") {
    if (writingDraft) {
      return `You already have a writing draft, so this Cambridge set turns a real piece of work into feedback instead of another blank page. ${recentLine}`;
    }
    return `${sourceLine} is the safest graded writing route right now. ${recentLine}`;
  }

  if (moduleName === "speaking" && speakingBand) {
    const weakText = weakArea?.module === "speaking"
      ? `Your saved speaking weak area is ${compactText(weakArea.summary || weakArea.title || "still active", 120)}.`
      : `Your latest speaking band is ${speakingBand}.`;
    return `${weakText} ${sourceLine ? `This topic keeps the next answer concrete: ${sourceLine}.` : ""} ${recentLine}`;
  }

  if (weakArea?.module === moduleName) {
    return `AI Coach already saved a ${moduleLabel.toLowerCase()} weak area: ${compactText(weakArea.summary || weakArea.title || "review this once more", 140)}. ${recentLine}`;
  }

  if (latestObjective?.module === moduleName) {
    const wrongCount = latestObjective.wrongQuestionIds?.length || Math.max(0, Number(latestObjective.total || 0) - Number(latestObjective.correct || 0));
    return `Your last ${moduleLabel.toLowerCase()} result was ${latestObjective.correct || 0}/${latestObjective.total || 0} with ${wrongCount} item${wrongCount === 1 ? "" : "s"} to review. ${recentLine}`;
  }

  return `${sourceLine || moduleLabel} is selected by rotation, not because it is the first item. ${recentLine}`;
}

function singleRecommendedOption(moduleName, options) {
  const candidates = options.filter(Boolean);
  if (!candidates.length) return null;
  const speakingPool = moduleName === "speaking"
    ? candidates.filter((item) => String(item.source || "").toLowerCase().includes("public"))
    : [];
  const recommended = chooseRotatingRecommendation(moduleName, speakingPool.length ? speakingPool : candidates);
  return recommended || candidates[0];
}

function renderSingleLaunch(moduleName, options, completionIndex = null) {
  const meta = singlePracticeMeta(moduleName);
  const recommended = singleRecommendedOption(moduleName, options);
  const recommendationReason = singleRecommendationReason(moduleName, recommended, options);
  const selected = state.activeSingle && options.some((item) => item.id === state.activeSingle.id) ? state.activeSingle : recommended || options[0];
  const recommendedCompletion = recommended && ["listening", "reading"].includes(moduleName)
    ? practiceCompletionStatus(moduleName, recommended, completionIndex)
    : null;
  const recommendedStatus = recommendedCompletion
    ? `<span class="practice-status-badge ${recommendedCompletion.completed ? "completed" : "not-completed"}">${practiceCompletionDisplay(recommendedCompletion)}</span>`
    : "";
  const selectOptions = options
    .map((item) => `<option value="${escapeHtml(item.id)}"${selected?.id === item.id ? " selected" : ""}>${escapeHtml(singleOptionLabel(item, moduleName, completionIndex))}</option>`)
    .join("");
  const scopeTabs = renderSingleScopeTabs(moduleName);
  const scopedLibrary = renderScopedPracticeLibrary(moduleName, options, completionIndex);
  if (scopedLibrary) return `<div class="single-launch-shell">
    <section class="single-launch-hero">
      <span class="eyebrow">${escapeHtml(meta.label)} library</span>
      <h3>${escapeHtml(moduleName === "listening" ? "Train the exact listening skill you need" : "Choose the exact reading unit you need")}</h3>
      <p>Browse by Section or Passage number, or use Content topics to choose the audio or passage subject. Every unit keeps its own timer, answers, score and history.</p>
    </section>
    ${scopeTabs}
    ${scopedLibrary}
  </div>`;
  if (["listening", "reading"].includes(moduleName) && !options.length) return `<div class="single-launch-shell">
    <section class="single-launch-hero">
      <span class="eyebrow">${escapeHtml(meta.label)} module</span>
      <h3>${escapeHtml(moduleName === "listening" ? "Listening evidence trainer" : "Reading evidence locator")}</h3>
      <p>Choose a full test, ${moduleName === "listening" ? "Section" : "Passage"}, content topic or mistake review.</p>
    </section>
    ${scopeTabs}
    <div class="practice-unit-empty"><span aria-hidden="true">🌱</span><p>No full tests match the current filters. Adjust or clear a Cambridge or progress filter to continue.</p></div>
  </div>`;
  return `<div class="single-launch-shell">
    <section class="single-launch-hero">
      <span class="eyebrow">${escapeHtml(meta.label)} module</span>
      <h3>${escapeHtml(moduleName === "listening" ? "Listening evidence trainer" : moduleName === "reading" ? "Reading evidence locator" : "Choose how to practise")}</h3>
      <p>${escapeHtml(moduleName === "listening" ? "Choose a full test, Section, content topic or mistake review." : moduleName === "reading" ? "Choose a full test, Passage, content topic or mistake review." : "Each module is a standalone practice. Start with an AI recommendation, or choose a paper yourself.")}</p>
    </section>
    ${scopeTabs || renderSingleModePicker(moduleName)}
    <div class="single-launch-grid">
      <article class="single-launch-card recommended">
        <span class="single-launch-badge">AI recommended</span>
        <h4>${escapeHtml(recommended ? singleOptionTitle(recommended) : meta.title)}</h4>
        ${recommendedStatus}
        <p>${escapeHtml(meta.recommended)}</p>
        <div class="single-launch-reason">
          <strong>Why this</strong>
          <span>${escapeHtml(recommendationReason)}</span>
        </div>
        <div class="single-launch-meta">
          <span>${escapeHtml(meta.estimate)}</span>
          <span>${escapeHtml(meta.output)}</span>
        </div>
        <button class="primary start-single-practice" type="button" data-single-start="recommended">Start recommended practice</button>
      </article>
      <article class="single-launch-card">
        <span class="single-launch-badge secondary">Choose yourself</span>
        <h4>Selected practice</h4>
        <p>${escapeHtml(meta.self)}</p>
        <label class="field-label single-launch-select-label" for="singleLaunchSelect">
          <span>Paper / topic</span>
          <select id="singleLaunchSelect" class="text-input">${selectOptions}</select>
        </label>
        <button class="secondary start-single-practice" type="button" data-single-start="selected">Start selected practice</button>
      </article>
    </div>
  </div>`;
}

function beginSinglePracticeUnit(item) {
  if (!item) return;
  const moduleName = state.activeModule;
  state.activeSingle = item;
  if (item.libraryScope === "topic") setSinglePracticeScope(moduleName, "topic");
  else if (item.practiceScope) setSinglePracticeScope(moduleName, item.practiceScope);
  if (item.practiceSection) state.singlePracticeSections[moduleName] = Number(item.practiceSection);
  if (item.practiceTopic) state.readingQuestionType = item.practiceTopic;
  rememberPracticeRecommendation(moduleName, item);
  if (state.singleAnswerItemId !== item.id) {
    state.singleAnswers = {};
    state.readingReviewMarks = {};
    state.singleAnswerItemId = item.id;
  }
  state.singleStarted = true;
  state.practiceSessionCompleted = false;
  resetSingleTimer(moduleName);
  renderSingle();
  setSingleImmersive(moduleName);
  window.scrollTo({ top: 0, behavior: "auto" });
  savePracticeSession();
}

function startSinglePractice(mode = "recommended") {
  const moduleName = state.activeModule;
  const completionIndex = ["listening", "reading"].includes(moduleName) ? readPracticeCompletionIndex() : null;
  const options = singleOptions(moduleName, completionIndex);
  if (!options.length) return;
  const selectedMode = document.querySelector("input[name='singlePracticeMode']:checked")?.value || currentSinglePracticeMode(moduleName);
  state.singlePracticeModes[moduleName] = selectedMode;
  if (mode === "selected") {
    const selectedId = $("singleLaunchSelect")?.value || "";
    state.activeSingle = options.find((item) => item.id === selectedId) || options[0];
  } else {
    state.activeSingle = singleRecommendedOption(moduleName, options) || options[0];
  }
  beginSinglePracticeUnit(state.activeSingle);
}

function renderSingle() {
  const moduleName = state.activeModule;
  resetListeningCaptionSession("single");
  const allOptions = mergedItems(moduleName).map(normalizeItem);
  renderSingleFilters(allOptions, moduleName);
  const completionIndex = ["listening", "reading"].includes(moduleName) ? readPracticeCompletionIndex() : null;
  const options = singleOptions(moduleName, completionIndex);
  $("single")?.classList.toggle("single-launching", !state.singleStarted);
  $("single")?.classList.toggle("single-started", Boolean(state.singleStarted));
  $("single")?.classList.toggle("single-objective-library", ["listening", "reading"].includes(moduleName));
  if (!options.length) {
    if (!state.singleStarted && ["listening", "reading"].includes(moduleName)) {
      $("singleTitle").textContent = moduleDisplayName(moduleName);
      $("singleSelect").innerHTML = "";
      $("singleContent").innerHTML = renderSingleLaunch(moduleName, [], completionIndex);
      bindDynamicControls();
      return;
    }
    $("singleTitle").textContent = "No questions available";
    $("singleSelect").innerHTML = "";
    $("singleContent").innerHTML = `<div class="notice">${moduleName === "writing" ? "No independent Writing task is available for this filter." : "This module has no imported questions yet. Add materials to the user bank first."}</div>`;
    return;
  }
  const restoringLegacyTopic = state.singleStarted
    && state.activeSingle?.module === moduleName
    && /::topic::/.test(String(state.activeSingle?.id || ""));
  state.activeSingle = state.activeSingle
    && state.activeSingle.module === moduleName
    && (restoringLegacyTopic || options.some((item) => item.id === state.activeSingle.id))
    ? state.activeSingle
    : options[0];
  $("singleTitle").textContent = moduleDisplayName(moduleName);
  $("singleSelect").innerHTML = options.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(singleOptionLabel(item, moduleName, completionIndex))}</option>`).join("");
  $("singleSelect").value = state.activeSingle.id;
  if (!state.singleStarted) {
    $("singleContent").innerHTML = renderSingleLaunch(moduleName, options, completionIndex);
    bindDynamicControls();
    return;
  }
  const prefix = "single";
  const practiceItem = singlePracticeItemForMode(moduleName, state.activeSingle);
  const modeIntro = renderSingleModeWorkspaceIntro(moduleName);
  if (practiceItem.reviewUnavailable) {
    $("singleContent").innerHTML = `${modeIntro}<section class="single-review-empty">
      <span aria-hidden="true">↻</span>
      <h3>No wrong-answer review is ready for this paper.</h3>
      <p>Complete one scored attempt first. IELTSist will then keep only the questions that need another look.</p>
      <div class="actions">
        <button class="primary" type="button" data-review-empty-action="training">Start training</button>
        <button class="secondary" type="button" data-review-empty-action="exam">Open full paper</button>
      </div>
    </section>`;
    bindDynamicControls();
    return;
  }
  $("singleContent").innerHTML =
    moduleName === "listening"
      ? `${modeIntro}${renderListening(practiceItem, prefix)}`
      : moduleName === "reading"
        ? `${modeIntro}${renderReading(practiceItem, prefix, { splitLayout: true })}`
        : moduleName === "writing"
          ? `${modeIntro}${renderWritingExamTwoColumn(state.activeSingle.writingTasks || [], prefix)}`
          : `${modeIntro}${renderSpeaking(state.activeSingle, prefix)}`;
  bindDynamicControls();
  restoreSingleAnswersFromState();
  restoreSingleWritingDrafts();
  if (state.restoredPracticeScrollY) {
    const scrollY = state.restoredPracticeScrollY;
    state.restoredPracticeScrollY = 0;
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
  }
}

function buildExam() {
  const listeningPool = mergedItems("listening");
  const readingPool = mergedItems("reading");
  const writingPool = mergedItems("writing");
  const writingPairs = pairedWritingSets(writingPool);
  const speakingPool = mergedItems("speaking");
  if (!listeningPool.length || !readingPool.length || !writingPairs.length || !speakingPool.length) {
    $("examPaper").innerHTML = `<section class="panel notice">The listening, reading, and writing banks are incomplete, so a full exam cannot be generated yet. Import the missing materials first.</section>`;
    return;
  }
  const completeSets = completeCambridgeExamSets(listeningPool, readingPool, writingPool);
  const pickedSet = completeSets.length ? pick(completeSets) : null;
  const writingTasks = pickedSet ? [pickedSet.task1, pickedSet.task2] : pick(writingPairs);
  state.exam = {
    listening: normalizeItem(pickedSet ? pickedSet.listening : pick(listeningPool)),
    reading: normalizeItem(pickedSet ? pickedSet.reading : pick(readingPool)),
    writingTasks,
    writing: writingTasks[0],
    speaking: normalizeItem(pick(speakingPool)),
  };
  $("examPaper").innerHTML = `
    <nav class="exam-quick-nav" aria-label="Quick navigation">
      <a href="#exam-listening-section">Listening</a>
      <a href="#exam-reading-section">Reading</a>
      <a href="#exam-writing-section">Writing</a>
      <a href="#exam-speaking-section">Speaking</a>
    </nav>
    <section id="exam-listening-section" class="panel exam-section"><h2>Listening</h2>${renderListening(state.exam.listening, "exam-listening")}</section>
    <section id="exam-reading-section" class="panel exam-section"><h2>Reading</h2>${renderReading(state.exam.reading, "exam-reading")}</section>
    <section id="exam-writing-section" class="panel exam-section"><h2>Writing</h2>${renderWriting(state.exam.writingTasks[0], "exam-task1")}${renderWriting(state.exam.writingTasks[1], "exam-task2")}</section>
    <section id="exam-speaking-section" class="panel exam-section">${speakingSectionTitle()}${renderSpeaking(state.exam.speaking, "exam")}</section>
  `;
  bindDynamicControls();
  state.examSeconds = state.examTotal;
  stopExamTimer();
}

function renderFullExamPaper(bundle, prefixRoot, scoreButtonId) {
  const timerConfig = prefixRoot === "exam"
    ? { timer: "examStickyTimer", toggle: "examStickyTimerToggle", reset: "examStickyTimerReset", seconds: state.examSeconds }
    : prefixRoot === "sequence"
      ? { timer: "sequenceStickyTimer", toggle: "sequenceStickyTimerToggle", reset: "sequenceStickyTimerReset", seconds: state.sequenceSeconds }
      : null;
  const timerHtml = timerConfig
    ? `<div class="exam-quick-timer timer" aria-label="Stopped">
        <span id="${timerConfig.timer}">${formatTime(timerConfig.seconds)}</span>
        <button id="${timerConfig.toggle}" class="icon-btn">Start</button>
        <button id="${timerConfig.reset}" class="icon-btn">Reset</button>
      </div>`
    : "";
  return `
    <nav class="exam-quick-nav" aria-label="quick navigation">
      <div class="exam-quick-links">
        <button class="inline-sidebar-toggle" type="button" aria-label="Stopped">&gt;</button>
        <a href="#${prefixRoot}-listening-section" data-focus-module="listening">Listening</a>
        <a href="#${prefixRoot}-reading-section" data-focus-module="reading">Reading</a>
        <a href="#${prefixRoot}-writing-section" data-focus-module="writing">Writing</a>
        <a href="#${prefixRoot}-speaking-section" data-focus-module="speaking">Speaking</a>
        <button class="back-submit-button" type="button" data-submit-target="${scoreButtonId}">Back and submit</button>
      </div>
      ${timerHtml}
      <div id="${prefixRoot}CaptionBar" class="listening-caption-bar" hidden>
        <span id="${prefixRoot}CaptionKicker">Captions</span>
        <strong id="${prefixRoot}CaptionLine">Play audio to show captions.</strong>
      </div>
    </nav>
    <section id="${prefixRoot}-listening-section" class="panel exam-section" data-module="listening"><h2>Listening</h2>${renderListening(bundle.listening, `${prefixRoot}-listening`)}</section>
    <section id="${prefixRoot}-reading-section" class="panel exam-section" data-module="reading"><h2>Reading</h2>${renderReading(bundle.reading, `${prefixRoot}-reading`)}</section>
    <section id="${prefixRoot}-writing-section" class="panel exam-section" data-module="writing"><h2>Writing</h2>${renderWritingExamTwoColumn(bundle.writingTasks, prefixRoot)}</section>
    <section id="${prefixRoot}-speaking-section" class="panel exam-section" data-module="speaking">${speakingSectionTitle()}${renderSpeakingExamTwoColumn(bundle.speaking, prefixRoot)}</section>
    <div class="exam-submit-row">
      <button id="${scoreButtonId}" class="primary">Submit and generate full report</button>
    </div>
  `;
}

function pickAvoidingSet(items, avoidKeys) {
  const candidates = items.filter((item) => {
    const key = examSetKey(item);
    return !key || !avoidKeys.has(key);
  });
  return pick(candidates.length ? candidates : items);
}

function pickWritingPairAvoidingSet(pairs, avoidKeys) {
  const validPairs = pairs.filter((pair) => Array.isArray(pair) && pair[0] && pair[1]);
  const candidates = validPairs.filter((pair) => {
    const key = examSetKey(pair[0]);
    return !key || !avoidKeys.has(key);
  });
  return pick(candidates.length ? candidates : validPairs);
}

function buildRandomBundle() {
  const listeningPool = mergedItems("listening");
  const readingPool = mergedItems("reading");
  const writingPairs = pairedWritingSets(mergedItems("writing"));
  const speakingPool = mergedItems("speaking");
  if (!listeningPool.length || !readingPool.length || !writingPairs.length || !speakingPool.length) return null;
  const used = new Set();
  const listening = normalizeItem(pick(listeningPool));
  const listeningKey = examSetKey(listening);
  if (listeningKey) used.add(listeningKey);
  const reading = normalizeItem(pickAvoidingSet(readingPool, used));
  const readingKey = examSetKey(reading);
  if (readingKey) used.add(readingKey);
  const pickedWritingPair = pickWritingPairAvoidingSet(writingPairs, used);
  if (!pickedWritingPair?.length) return null;
  const writingTasks = pickedWritingPair.map(normalizeItem).filter((item) => item.id || item.title || item.prompt || item.writingPageImages?.length);
  if (writingTasks.length < 2) return null;
  return {
    listening,
    reading,
    writingTasks,
    writing: writingTasks[0],
    speaking: normalizeItem(pick(speakingPool)),
  };
}

function buildExam(savedBundle = null) {
  setImmersivePractice("", "");
  const bundle = isExamBundle(savedBundle) ? savedBundle : buildRandomBundle();
  if (!bundle) {
    $("examPaper").innerHTML = `<section class="panel notice">The question bank is incomplete, so a random exam cannot be generated.</section>`;
    return;
  }
  state.exam = bundle;
  $("examPaper").innerHTML = renderFullExamPaper(state.exam, "exam", "scoreExamBottom");
  $("scoreExamBottom").addEventListener("click", () => scoreFullExam(state.exam, "exam", "examFeedback", "examMode"));
  bindDynamicControls();
  state.examSeconds = state.examTotal;
  stopExamTimer();
}

function sequenceSets() {
  return completeCambridgeExamSets(mergedItems("listening"), mergedItems("reading"), mergedItems("writing"));
}

function renderSequenceFilters() {
  const sets = sequenceSets();
  renderFilterOptions("sequenceBookFilter", sets.map((set) => itemBook(set.listening)), "All Cambridge");
  const selectedBook = filterValue("sequenceBookFilter");
  const testSets = selectedBook === "all" ? sets : sets.filter((set) => String(itemBook(set.listening)) === selectedBook);
  renderFilterOptions("sequenceTestFilter", testSets.map((set) => itemTest(set.listening)), "All tests");
}

function renderSequenceFilters() {
  const sets = sequenceSets();
  renderFilterOptions("sequenceBookFilter", sets.map((set) => itemBook(set.listening)), "All Cambridge");
  const selectedBook = filterValue("sequenceBookFilter");
  const testSets = selectedBook === "all" ? sets : sets.filter((set) => String(itemBook(set.listening)) === selectedBook);
  renderFilterOptions("sequenceTestFilter", testSets.map((set) => itemTest(set.listening)), "All tests");
}

function buildSequence(savedBundle = null) {
  setImmersivePractice("", "");
  renderSequenceFilters();
  if (isExamBundle(savedBundle)) {
    state.sequence = savedBundle;
    $("sequencePaper").innerHTML = renderFullExamPaper(state.sequence, "sequence", "scoreSequenceBottom");
    $("scoreSequenceBottom").addEventListener("click", () => scoreFullExam(state.sequence, "sequence", "sequenceFeedback", "sequenceMode"));
    bindDynamicControls();
    resetSequenceTimer();
    return;
  }
  const sets = sequenceSets();
  const book = filterValue("sequenceBookFilter");
  const test = filterValue("sequenceTestFilter");
  const candidates = sets.filter((set) =>
    (book === "all" || String(itemBook(set.listening)) === book)
    && (test === "all" || String(itemTest(set.listening)) === test),
  );
  const pickedSet = candidates[0] || sets[0];
  if (!pickedSet) {
    $("sequencePaper").innerHTML = `<section class="panel notice">No complete same-test Cambridge set is available.</section>`;
    return;
  }
  state.sequence = {
    listening: normalizeItem(pickedSet.listening),
    reading: normalizeItem(pickedSet.reading),
    writingTasks: [normalizeItem(pickedSet.task1), normalizeItem(pickedSet.task2)],
    writing: normalizeItem(pickedSet.task1),
    speaking: normalizeItem(pick(mergedItems("speaking"))),
  };
  $("sequencePaper").innerHTML = renderFullExamPaper(state.sequence, "sequence", "scoreSequenceBottom");
  $("scoreSequenceBottom").addEventListener("click", () => scoreFullExam(state.sequence, "sequence", "sequenceFeedback", "sequenceMode"));
  bindDynamicControls();
  resetSequenceTimer();
}

async function submitSingle() {
  const moduleName = state.activeModule;
  setFeedback("singleFeedback", "Scoring...", "singleMode", "");
  try {
    if (moduleName === "listening" || moduleName === "reading") {
      const item = singlePracticeItemForMode(moduleName, state.activeSingle);
      saveSingleAnswersToState();
      const json = await postJson(`/api/${moduleName}/score`, { questions: item.questions || [], answers: state.singleAnswers || {} });
      rememberObjectiveResult(moduleName, normalizeItem(state.activeSingle), json);
      setFeedbackHtml("singleFeedback", renderObjectiveFeedbackHtml(json, moduleName), "singleMode", json.mode);
    } else if (moduleName === "writing") {
      setFeedback("singleFeedback", "Writing feedback is being generated. Estimated time: 1-10 min.", "singleMode", "");
      const tasks = (state.activeSingle.writingTasks || [state.activeSingle]).filter(Boolean).map(normalizeItem);
      const prompt = writingPromptForTasks(tasks);
      const essay = writingEssayForTasks(tasks, "single");
      const json = await runWritingFeedbackJob(prompt, essay, () => {
        setFeedback("singleFeedback", "Writing feedback is being generated. Estimated time: 1-10 min.", "singleMode", "");
      });
      rememberWritingAttempt({ itemId: tasks.length === 1 ? tasks[0].id || "" : "", source: "single", title: state.activeSingle.title || "Writing with AI", prompt, essay, feedback: json.feedback || "", analysis: json.analysis || null, scores: extractWritingScores(json.feedback || "", json.analysis) });
      setFeedbackHtml("singleFeedback", feedbackWithPdfHtml(json.feedback, json, "ielts-writing-feedback.pdf"), "singleMode", json.mode);
    } else {
      const item = normalizeItem(state.activeSingle);
      await scoreSpeakingText("single", item.title || "Speaking", "singleFeedback", "singleMode");
    }
    await completeActivePracticeSession();
    if (moduleName !== "speaking") {
      exitImmersiveMode();
      window.setTimeout(() => $("singleFeedback")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  } catch (error) {
    setFeedback("singleFeedback", `Submit failed: ${error.message}`, "singleMode", "error");
  }
}

function objectiveReviewHeader(moduleName, result) {
  const mode = currentSinglePracticeMode(moduleName);
  const total = result?.scoredTotal ?? result?.total ?? 40;
  const correct = result?.correct ?? 0;
  const wrong = Math.max(0, Number(total) - Number(correct || 0));
  if (moduleName === "listening") {
    return [
      "Listening evidence review",
      `Mode: ${singleModeLabel(moduleName, mode)} | Score: ${correct}/${total} | Review queue: ${wrong}`,
      "For every wrong answer, use this chain: question wording -> audio evidence -> distractor -> answer format -> next signal word.",
    ];
  }
  return [
    "Reading evidence review",
    `Mode: ${singleModeLabel(moduleName, mode)} | Score: ${correct}/${total} | Review queue: ${wrong}`,
    "For every wrong answer, use this chain: question focus -> keywords -> passage location -> evidence sentence -> paraphrase chain -> why the wrong option fails.",
  ];
}

function objectiveRetestHint(moduleName) {
  return moduleName === "listening"
    ? "Next: save one weak area, then retest similar spelling / plural / number traps."
    : "Next: save one weak area, then retest evidence-location questions of the same type.";
}

function formatObjectiveFeedback(json, moduleName = state.activeModule) {
  if (!json.result?.answerAvailable) {
    return [json.feedback, "", "Answer status: not imported. Open the local PDF or parse file and mark manually."].join("\n");
  }
  const lines = [...objectiveReviewHeader(moduleName, json.result), "", json.feedback, "", "Wrong-answer queue:"];
  for (const item of json.result.details) {
    if (item.correct === null) continue;
    const status = item.correct ? "OK" : "Review";
    const reviewCue = moduleName === "listening"
      ? "check audio evidence, distractor, spelling/plural/number format"
      : "find passage evidence, paraphrase link and why the wrong answer fails";
    lines.push(`${status} ${item.text} | your answer: ${item.actual || "(blank)"} | expected: ${item.expected}${item.correct ? "" : ` | ${reviewCue}`}`);
  }
  lines.push("", objectiveRetestHint(moduleName), "Use AI Coach: Explain in Chinese / Show evidence / Save weak area / Retest this skill.");
  return lines.join("\n");
}

function objectiveDetailNumber(detail, index = 0) {
  const direct = Number(String(detail?.id || "").match(/\d+/)?.[0]);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const textNumber = Number(String(detail?.text || "").match(/\d+/)?.[0]);
  return Number.isFinite(textNumber) && textNumber > 0 ? textNumber : index + 1;
}

function renderObjectiveFeedbackHtml(json, moduleName = state.activeModule) {
  const result = json?.result || {};
  if (!result.answerAvailable) {
    return `<section class="objective-review-empty"><h3>Answer key unavailable</h3><p>${escapeHtml(json?.feedback || "This paper can still be completed, but it cannot be scored automatically yet.")}</p></section>`;
  }
  const details = (result.details || []).filter((item) => item.correct !== null);
  const wrong = details.filter((item) => item.correct === false);
  const correct = Number(result.correct || 0);
  const total = Number(result.scoredTotal ?? result.total ?? details.length);
  const evidenceLabel = moduleName === "listening" ? "Audio evidence" : "Passage evidence";
  return `<article class="objective-review" data-objective-module="${escapeHtml(moduleName)}">
    <header class="objective-review-head">
      <div><span class="eyebrow">${escapeHtml(singleModeLabel(moduleName))}</span><h3>${escapeHtml(moduleName === "listening" ? "Listening evidence review" : "Reading evidence review")}</h3></div>
      <div class="objective-review-score"><strong>${correct}/${total}</strong><span>${wrong.length} to review</span></div>
    </header>
    <div class="objective-review-loop" aria-label="Review loop"><span>Score</span><i></i><span>Explain</span><i></i><span>Save rule</span><i></i><span>Retest</span></div>
    ${wrong.length ? `<div class="objective-review-list">${wrong.map((item, index) => {
      const number = objectiveDetailNumber(item, index);
      return `<section class="objective-review-item" data-qid="${escapeHtml(item.id || `q${number}`)}">
        <div class="objective-review-number">${number}</div>
        <div class="objective-review-answer"><span>Your answer</span><strong>${escapeHtml(item.actual || "Blank")}</strong></div>
        <div class="objective-review-answer correct"><span>Correct answer</span><strong>${escapeHtml(item.expected || "-")}</strong></div>
        <div class="objective-review-evidence"><span>${escapeHtml(evidenceLabel)}</span><p>${escapeHtml(moduleName === "listening" ? "Open the matching section and ask AI Coach for the exact phrase, distractor and answer-format signal." : "Ask AI Coach for the location, evidence sentence and keyword-paraphrase chain.")}</p></div>
        <div class="objective-review-actions">
          <button class="primary small-button" type="button" data-objective-action="explain" data-module="${escapeHtml(moduleName)}" data-qid="${escapeHtml(item.id || `q${number}`)}">Explain</button>
          <button class="secondary small-button" type="button" data-objective-action="weak" data-module="${escapeHtml(moduleName)}" data-qid="${escapeHtml(item.id || `q${number}`)}">Save weak area</button>
          <button class="secondary small-button" type="button" data-objective-action="similar" data-module="${escapeHtml(moduleName)}" data-qid="${escapeHtml(item.id || `q${number}`)}">Similar question</button>
        </div>
      </section>`;
    }).join("")}</div>` : `<div class="objective-review-success"><span aria-hidden="true">✓</span><strong>No wrong answers in this attempt.</strong><p>Use AI Coach to raise the difficulty or move to the next skill.</p></div>`}
    <footer class="objective-review-footer">
      <button class="primary" type="button" data-objective-action="retest" data-module="${escapeHtml(moduleName)}">Retest wrong answers</button>
      <button class="secondary" type="button" data-objective-action="coach" data-module="${escapeHtml(moduleName)}">Ask AI Coach</button>
    </footer>
  </article>`;
}

function objectiveResultDetail(moduleName, qid) {
  return latestObjectiveResult(moduleName)?.details?.find((item) => String(item.id || "") === String(qid || "")) || null;
}

function setObjectiveCoachFocus(moduleName, qid) {
  const detail = objectiveResultDetail(moduleName, qid);
  state.coach.focusQuestion = detail ? { module: moduleName, ...detail } : null;
  return detail;
}

function saveObjectiveWeakArea(moduleName, detail) {
  if (!detail) return;
  const number = objectiveDetailNumber(detail);
  const summary = `${moduleDisplayName(moduleName)} Q${number}: ${detail.actual || "blank"} -> ${detail.expected || "review"}`;
  const areas = readWeakAreas().filter((entry) => entry.summary !== summary);
  areas.unshift({
    id: `weak-${Date.now()}`,
    module: moduleName,
    title: `${moduleDisplayName(moduleName)} Question ${number}`,
    summary,
    questionId: detail.id || `q${number}`,
    sourceAttemptId: latestObjectiveResult(moduleName)?.attemptId || "",
    evidence: { actual: detail.actual || "", expected: detail.expected || "" },
    createdAt: new Date().toISOString(),
  });
  writeWeakAreas(areas);
  syncWeakArea(areas[0]);
  renderDashboard();
}

function bindObjectiveReviewActions(root = document) {
  root.querySelectorAll?.("[data-objective-action]").forEach((button) => {
    if (button.dataset.boundObjectiveAction) return;
    button.dataset.boundObjectiveAction = "1";
    button.onclick = () => {
      const action = button.dataset.objectiveAction;
      const moduleName = button.dataset.module || state.activeModule || "listening";
      const qid = button.dataset.qid || "";
      const detail = qid ? setObjectiveCoachFocus(moduleName, qid) : null;
      if (action === "weak") {
        saveObjectiveWeakArea(moduleName, detail);
        button.textContent = "Saved";
        return;
      }
      if (action === "retest") {
        const previous = latestObjectiveResult(moduleName);
        state.singlePracticeModes[moduleName] = "review";
        state.singlePracticeScopes[moduleName] = "review";
        saveSingleAnswersToState();
        (previous?.wrongQuestionIds || []).forEach((id) => {
          state.singleAnswers[id] = "";
        });
        state.singleStarted = true;
        state.practiceSessionCompleted = false;
        resetSingleTimer(moduleName);
        renderSingle();
        setSingleImmersive(moduleName);
        savePracticeSession();
        return;
      }
      openGlobalCoachPanel();
      const input = $("helpChatInput");
      if (!input) return;
      const number = detail ? objectiveDetailNumber(detail) : "current";
      if (action === "similar") {
        input.value = `Generate one similar ${moduleName} question for Q${number}. Keep the same skill and trap, but change the surface wording. Do not reveal the answer until I respond.`;
      } else if (action === "coach") {
        input.value = `Review my latest ${moduleName} result, explain the main pattern behind my mistakes, and choose the next retest.`;
      } else {
        input.value = `Explain ${moduleName} Q${number}: show the question focus, evidence, why my answer failed, the correct answer, and the rule for my next attempt.`;
      }
      input.focus();
    };
  });
}

async function scoreExam() {
  if (!state.exam) buildExam();
  setFeedback("examFeedback", "Generating full report...", "examMode", "");
  try {
    const payload = {
      listening: { questions: state.exam.listening.questions || [], answers: collectAnswers("exam-listening") },
      reading: { questions: state.exam.reading.questions || [], answers: collectAnswers("exam-reading") },
      writing: {
        tasks: (state.exam.writingTasks || [state.exam.writing]).filter(Boolean).map((task, index) => ({
          type: task.type || `Task ${index + 1}`,
          title: task.title || `Writing Task ${index + 1}`,
          prompt: [task.prompt, task.data].filter(Boolean).join("\n\nData: "),
          essay: $(`exam-task${index + 1}-writing`)?.value || "",
        })),
      },
      speaking: {
        title: state.exam.speaking?.title || "Speaking",
        selfReportedBand: $("exam-speaking-score")?.value || "",
        notes: $("exam-speaking")?.value || "",
      },
    };
    const json = await postJson("/api/exam/report", payload);
    setFeedback("examFeedback", json.feedback, "examMode", json.mode);
  } catch (error) {
    setFeedback("examFeedback", `Generation failed: ${error.message}`, "examMode", "error");
  }
}

async function scoreFullExam(bundle, prefixRoot, feedbackId, modeId) {
  if (!bundle) return;
  setFeedback(feedbackId, "Scoring in progress. Estimated time: 10 min.", modeId, "");
  try {
    const payload = {
      listening: { questions: bundle.listening.questions || [], answers: collectAnswers(`${prefixRoot}-listening`) },
      reading: { questions: bundle.reading.questions || [], answers: collectAnswers(`${prefixRoot}-reading`) },
      writing: {
        tasks: (bundle.writingTasks || [bundle.writing]).filter(Boolean).map((task, index) => ({
          type: task.type || `Task ${index + 1}`,
          title: task.title || `Writing Task ${index + 1}`,
          prompt: [task.prompt, task.data].filter(Boolean).join("\n\nData: "),
          essay: $(`${prefixRoot}-task${index + 1}-writing`)?.value || "",
        })),
      },
      speaking: {
        title: bundle.speaking?.title || "Speaking",
        selfReportedBand: $(`${prefixRoot}-speaking-score`)?.value || "",
        notes: $(`${prefixRoot}-speaking`)?.value || "",
      },
    };
    const json = await postJson("/api/exam/report", payload);
    setFeedbackHtml(feedbackId, feedbackWithPdfHtml(json.feedback, json, "ielts-full-exam-report.pdf"), modeId, json.mode);
  } catch (error) {
    setFeedback(feedbackId, `Generation failed: ${error.message}`, modeId, "error");
  }
}

async function scoreExam() {
  if (!state.exam) buildExam();
  await scoreFullExam(state.exam, "exam", "examFeedback", "examMode");
}

async function submitUploadedWriting() {
  const prompt = $("uploadPrompt").value.trim();
  const essay = $("uploadEssay").value.trim();
  if (!prompt || !essay) {
    setFeedback("uploadWritingFeedback", "Please enter both a prompt and an essay.", "uploadWritingMode", "error");
    return;
  }
  setUnifiedPracticeStage("writing", "scoring");
  setFeedback("uploadWritingFeedback", "Scoring in progress. Estimated time: 10 min.", "uploadWritingMode", "");
  try {
    const json = await runWritingFeedbackJob(prompt, essay, () => {
      setFeedback("uploadWritingFeedback", "Writing feedback is being generated. Estimated time: 1-10 min.", "uploadWritingMode", "");
    });
    const canonicalScores = json.contract?.score
      ? { overall: roundWritingBand(json.contract.score.overall?.value), criteria: (json.contract.score.criteria || []).map((item) => ({ ...item, score: roundWritingBand(item.score) })) }
      : extractWritingScores(json.feedback || "", json.analysis);
    rememberWritingAttempt({
      attemptId: json.contract?.attempt?.id,
      source: "custom",
      title: `Custom ${detectWritingTaskProfile(prompt).taskLabel}`,
      prompt,
      essay,
      feedback: json.feedback || "",
      analysis: json.analysis || null,
      scores: canonicalScores,
      contract: json.contract || null,
    });
    setFeedbackHtml("uploadWritingFeedback", feedbackWithPdfHtml(json.feedback, json, "ielts-writing-feedback.pdf"), "uploadWritingMode", json.mode);
    revealWritingFeedback();
  } catch (error) {
    setUnifiedPracticeStage("writing", "practice");
    setFeedback("uploadWritingFeedback", `Submission failed: ${error.message}`, "uploadWritingMode", "error");
  }
}

function detectWritingTaskProfile(prompt = "") {
  const text = String(prompt || "").toLowerCase();
  const task1 = /\btask\s*1\b|\b(chart|graph|table|map|diagram|process|letter)\b/.test(text);
  const general = /\bletter\b|dear\s+(?:sir|madam)|general\s+training/.test(text);
  return {
    taskNumber: task1 ? 1 : 2,
    taskLabel: task1 ? "Task 1" : "Task 2",
    testType: general ? "General" : "Academic",
    wordTarget: task1 ? 150 : 250,
  };
}

function syncCustomWritingState() {
  const prompt = $("uploadPrompt")?.value || "";
  const essay = $("uploadEssay")?.value || "";
  const profile = detectWritingTaskProfile(prompt);
  const essayNode = $("uploadEssay");
  if (essayNode) essayNode.dataset.wordTarget = String(profile.wordTarget);
  if ($("uploadEssayTarget")) $("uploadEssayTarget").textContent = String(profile.wordTarget);
  if ($("writingCustomDetection")) {
    $("writingCustomDetection").textContent = `${profile.taskLabel} · ${profile.testType} · target ${profile.wordTarget} words`;
  }
  if ($("submitUploadedWriting")) $("submitUploadedWriting").disabled = !prompt.trim() || !essay.trim();
  return profile;
}

function writingTimerElapsedSeconds() {
  const live = state.writingTimerStartedAt ? Math.floor((Date.now() - state.writingTimerStartedAt) / 1000) : 0;
  return Math.max(0, Number(state.writingTimerElapsed || 0) + live);
}

function saveWritingTimerState(running = Boolean(state.writingTimerStartedAt)) {
  try {
    localStorage.setItem(writingTimerStoreKey, JSON.stringify({
      setId: state.pendingWritingSetId || (state.uploadWritingTasks?.[0] ? `writing-task${writingTaskNumber(state.uploadWritingTasks[0]) || 2}:${state.uploadWritingTasks[0].id || "current"}` : "custom"),
      workspaceMode: state.writingWorkspaceMode,
      setupMode: state.writingSetupMode,
      elapsed: writingTimerElapsedSeconds(),
      duration: state.writingTimerDuration,
      running,
      savedAt: Date.now(),
    }));
  } catch {}
}

function restoreWritingTimerState(expectedSetId = "") {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(writingTimerStoreKey) || "null"); } catch {}
  if (!saved || (expectedSetId && saved.setId && saved.setId !== expectedSetId)) return false;
  const offlineElapsed = saved.running ? Math.max(0, Math.floor((Date.now() - Number(saved.savedAt || Date.now())) / 1000)) : 0;
  state.writingTimerElapsed = Math.max(0, Number(saved.elapsed || 0) + offlineElapsed);
  state.writingTimerDuration = Math.max(1, Number(saved.duration || 60 * 60));
  state.writingSetupMode = saved.setupMode === "exam" ? "exam" : "coach";
  state.writingTimerStartedAt = saved.running ? Date.now() : 0;
  return true;
}

function renderWritingTimer() {
  const elapsed = writingTimerElapsedSeconds();
  const value = state.writingWorkspaceMode === "cambridge"
    ? Math.max(0, state.writingTimerDuration - elapsed)
    : elapsed;
  const text = `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  document.querySelectorAll("[data-writing-timer]").forEach((node) => {
    node.textContent = text;
    node.dataset.timerDirection = state.writingWorkspaceMode === "cambridge" ? "countdown" : "elapsed";
  });
  if (elapsed % 5 === 0 && state.writingTimerLastPersisted !== elapsed) {
    state.writingTimerLastPersisted = elapsed;
    saveWritingTimerState(true);
  }
}

function startWritingTimer({ reset = false, durationSeconds = 0 } = {}) {
  if (reset) {
    if (state.writingTimerId) clearInterval(state.writingTimerId);
    state.writingTimerId = null;
    state.writingTimerElapsed = 0;
    state.writingTimerDuration = Number(durationSeconds) > 0
      ? Number(durationSeconds)
      : state.writingWorkspaceMode === "cambridge"
        ? (state.writingActiveTaskNumber === 1 ? 20 * 60 : 40 * 60)
        : 60 * 60;
    state.writingTimerStartedAt = Date.now();
  } else if (!state.writingTimerStartedAt) {
    state.writingTimerStartedAt = Date.now();
  }
  if (!state.writingTimerId) state.writingTimerId = window.setInterval(renderWritingTimer, 500);
  saveWritingTimerState(true);
  renderWritingTimer();
}

function stopWritingTimer({ pause = true } = {}) {
  if (pause && state.writingTimerStartedAt) state.writingTimerElapsed = writingTimerElapsedSeconds();
  state.writingTimerStartedAt = 0;
  if (state.writingTimerId) clearInterval(state.writingTimerId);
  state.writingTimerId = null;
  saveWritingTimerState(false);
  renderWritingTimer();
}

function currentWritingUploadCoachContext() {
  if (state.writingWorkspaceMode === "custom") {
    const profile = detectWritingTaskProfile($("uploadPrompt")?.value || "");
    return {
      module: "writing",
      mode: state.writingSetupMode,
      activeTaskNumber: profile.taskNumber,
      activeTaskTitle: `${profile.taskLabel} · Custom essay`,
      taskType: profile.testType,
      prompt: compactText($("uploadPrompt")?.value || "", 4000),
      essay: compactText($("uploadEssay")?.value || "", 20000),
    };
  }
  if (state.writingWorkspaceMode !== "cambridge") return null;
  const shell = $("writingSystemContent")?.querySelector(".writing-practice-shell");
  const activeTaskNumber = Number(shell?.dataset.activeWritingTask || 1);
  const task = normalizeItem(writingUploadTaskByNumber(activeTaskNumber) || {});
  return {
    module: "writing",
    mode: state.writingSetupMode,
    activeTaskNumber,
    activeTaskTitle: `Task ${activeTaskNumber} · ${task.title || "Cambridge writing"}`,
    taskId: task.id || "",
    taskType: task.type || `Task ${activeTaskNumber}`,
    prompt: compactText(task.prompt || task.question || "", 4000),
    essay: compactText($(`upload-system-task${activeTaskNumber}-writing`)?.value || "", 20000),
  };
}

function setWritingWorkspaceMode(mode = "entry") {
  const next = ["entry", "cambridge", "custom"].includes(mode) ? mode : "entry";
  const entry = $("writingEntry");
  const workspace = $("writingWorkspace");
  const custom = $("writingCustomWorkspace");
  const system = $("writingSystemWorkspace");
  const setup = $("writingSetupPanel");
  if (!entry || !workspace || !custom || !system) return;
  state.writingWorkspaceMode = next;
  setUnifiedPracticeStage("writing", next === "entry" ? "entry" : "practice", { mode: state.writingSetupMode });
  if (next === "entry") {
    entry.hidden = false;
    if (setup) setup.hidden = true;
    workspace.hidden = true;
    custom.hidden = true;
    system.hidden = true;
    state.writingPromptCollapsed = false;
    workspace.classList.remove("prompt-collapsed");
    stopWritingTimer();
    return;
  }
  entry.hidden = true;
  if (setup) setup.hidden = true;
  workspace.hidden = false;
  custom.hidden = next !== "custom";
  system.hidden = next !== "cambridge";
  const title = $("writingWorkspaceTitle");
  if (title) title.textContent = next === "custom" ? "Submit my essay" : "Writing practice";
  const promptToggle = $("toggleWritingPrompt");
  if (promptToggle) {
    promptToggle.hidden = next === "entry";
    promptToggle.textContent = state.writingPromptCollapsed ? "Show task" : "Hide task";
  }
  workspace.classList.toggle("prompt-collapsed", Boolean(state.writingPromptCollapsed && next !== "entry"));
  if ($("writingModeStatus")) $("writingModeStatus").textContent = `${state.writingSetupMode === "exam" ? "Exam" : "Coach"} mode`;
  startWritingTimer();
  syncCustomWritingState();
  bindDynamicControls();
}

function unifiedPracticeSetupHtml(module, { title = "Practice", source = "IELTSist", detail = "", deviceCheck = false, extra = "" } = {}) {
  return `<section class="unified-practice-setup" data-setup-module="${escapeHtml(module)}">
    <header><button class="secondary small-button" type="button" data-setup-back="${escapeHtml(module)}">Back</button><div><span>${escapeHtml(source)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></div></header>
    <div class="unified-setup-main">
      <div><span class="eyebrow">Choose mode</span><div class="unified-mode-switch" role="group" aria-label="Practice mode"><button type="button" data-setup-mode="exam" class="active"><strong>Exam</strong><span>No AI hints during practice</span></button><button type="button" data-setup-mode="coach"><strong>Coach</strong><span>Hints after each completed unit</span></button></div></div>
      ${deviceCheck ? `<div class="speaking-device-check"><span class="eyebrow">Device check</span><div data-device-check-status>Microphone, speaker and network not checked</div><button class="secondary" type="button" data-run-device-check>Check microphone and speaker</button><meter min="0" max="1" value="0" data-device-level></meter></div>` : `<div class="writing-setup-summary"><span class="eyebrow">Practice flow</span><p>Plan briefly, complete the response, get evidence-based feedback, then rewrite the highest-impact section.</p></div>`}
    </div>
    ${extra}
    <footer><span>${deviceCheck ? "The test starts only after device checks pass." : "Your response is saved on this device."}</span><button class="primary" type="button" data-start-unified-practice="${escapeHtml(module)}"${deviceCheck ? " disabled" : ""}>Start practice</button></footer>
  </section>`;
}

function setUnifiedPracticeStage(module, stage, patch = {}) {
  if (!state.unifiedPracticeFlows[module]) return null;
  state.unifiedPracticeFlows[module] = { ...state.unifiedPracticeFlows[module], ...patch, stage };
  const view = module === "writing" ? $("writing-upload") : $("bank");
  if (view) {
    view.dataset.practiceStage = stage;
    view.dataset.practiceMode = state.unifiedPracticeFlows[module].mode || "";
  }
  return state.unifiedPracticeFlows[module];
}

function bindUnifiedSetup(root, { onBack, onStart, deviceCheck = false } = {}) {
  root.querySelectorAll("[data-setup-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-setup-mode]").forEach((item) => item.classList.toggle("active", item === button));
    });
  });
  root.querySelector("[data-setup-back]")?.addEventListener("click", onBack);
  if (deviceCheck) {
    root.querySelector("[data-run-device-check]")?.addEventListener("click", async (event) => {
      const status = root.querySelector("[data-device-check-status]");
      const start = root.querySelector("[data-start-unified-practice]");
      event.currentTarget.disabled = true;
      if (status) status.textContent = "Checking microphone and speaker...";
      let stream = null;
      let context = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(qwenMicConstraints());
        context = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const meter = root.querySelector("[data-device-level]");
        let level = 0;
        for (let sample = 0; sample < 8; sample += 1) {
          analyser.getByteTimeDomainData(data);
          level = Math.max(level, Math.min(1, Math.max(...data.map((value) => Math.abs(value - 128))) / 64));
          if (meter) meter.value = level;
          await sleep(60);
        }
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 440;
        gain.gain.value = 0.025;
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.12);
        await sleep(160);
        const health = await fetch("/healthz", { cache: "no-store" });
        if (!health.ok) throw new Error("IELTSist realtime service is unreachable");
        state.speakingDeviceChecked = true;
        if (status) status.textContent = `Microphone ready${level > 0.02 ? " · voice detected" : ""} · test sound played · service online`;
        if (start) start.disabled = false;
      } catch (error) {
        state.speakingDeviceChecked = false;
        if (status) status.textContent = `Device check failed: ${error.message}`;
      } finally {
        stream?.getTracks().forEach((track) => track.stop());
        if (context && context.state !== "closed") await context.close().catch(() => {});
        event.currentTarget.disabled = false;
      }
    });
  }
  root.querySelector("[data-start-unified-practice]")?.addEventListener("click", () => {
    const mode = root.querySelector("[data-setup-mode].active")?.dataset.setupMode || "exam";
    onStart?.(mode);
  });
}

function openWritingPracticeSetup(kind = "task2", selectionId = "") {
  const setup = $("writingSetupPanel");
  const entry = $("writingEntry");
  const workspace = $("writingWorkspace");
  if (!setup || !entry || !workspace) return;
  const resolvedKind = kind === "cambridge" ? "task2" : kind;
  const isTask1 = resolvedKind === "task1";
  const isFullTest = resolvedKind === "full-test";
  const isTopic = resolvedKind === "topic";
  const fullTest = isFullTest
    ? writingFullTestOptions().find((item) => item.id === selectionId) || writingFullTestOptions()[0] || null
    : null;
  const topicOption = isTopic
    ? writingTopicOptions().find((item) => item.id === selectionId) || null
    : null;
  const option = isTask1 || isFullTest || isTopic || resolvedKind === "custom"
    ? null
    : writingSystemOptions().find((item) => item.id === selectionId) || writingSystemRecommended(writingSystemOptions());
  const topicTask = writingSetTasks(topicOption)[0] || null;
  const task2 = isFullTest ? writingTask2ForOption(fullTest) : isTopic && writingTaskNumber(topicTask) === 2 ? topicTask : writingTask2ForOption(option);
  const task1 = isTask1
    ? writingTask1Pool().find((task) => task.id === selectionId) || writingTask1Pool()[0] || null
    : isFullTest ? writingTask1ForOption(fullTest) : isTopic && writingTaskNumber(topicTask) === 1 ? topicTask : null;
  const activeTask = topicTask || task1 || task2;
  const activeTaskNumber = activeTask ? writingTaskNumber(activeTask) || 2 : 2;
  const resolvedSelectionId = isTask1 ? `writing-task1:${task1?.id || ""}` : fullTest?.id || topicOption?.id || option?.id || selectionId || resolvedKind;
  state.pendingWritingKind = resolvedKind;
  state.pendingWritingSetId = resolvedSelectionId;
  setUnifiedPracticeStage("writing", "setup", { selectionId: resolvedSelectionId });
  if (resolvedKind === "custom") {
    state.selectedWritingTask1Id = "";
    state.selectedWritingTask2Id = "";
  } else if (isFullTest) {
    state.selectedWritingTask1Id = task1?.id || "";
    state.selectedWritingTask2Id = task2?.id || "";
  } else if (isTask1 || activeTaskNumber === 1) {
    state.selectedWritingTask1Id = task1?.id || "";
    state.selectedWritingTask2Id = "";
  } else {
    state.selectedWritingTask1Id = "";
    state.selectedWritingTask2Id = task2?.id || "";
  }
  const label = resolvedKind === "custom"
    ? "Custom writing task"
    : isFullTest
      ? fullTest?.title || "Cambridge Writing full test"
      : isTask1 || activeTaskNumber === 1
      ? writingTopicSourceLabel({ writingTasks: [task1] })
      : writingTopicSourceLabel(topicOption || option || {});
  setup.innerHTML = unifiedPracticeSetupHtml("writing", {
    title: resolvedKind === "custom"
      ? "Submit your own essay"
      : isFullTest
        ? `${fullTest?.title || "Cambridge Writing"} · Task 1 + Task 2`
        : activeTask?.title || writingTopicMeta(topicOption || option || {}).title || `Task ${activeTaskNumber} topic`,
    source: label,
    detail: resolvedKind === "custom"
      ? "Paste one IELTS task and confirm its detected type before writing."
      : isFullTest
        ? "Task 1 + Task 2 · 60 minutes · 400 words · official 1:2 weighted score."
        : activeTaskNumber === 1
          ? "Task 1 only · 20 minutes · 150 words · scored independently."
          : "Task 2 only · 40 minutes · 250 words · scored independently.",
  });
  const setupShell = setup.querySelector(".unified-practice-setup");
  if (setupShell && task1?.id) setupShell.dataset.writingTask1Id = task1.id;
  if (setupShell && task2?.id) setupShell.dataset.writingTask2Id = task2.id;
  entry.hidden = true;
  workspace.hidden = true;
  setup.hidden = false;
  bindUnifiedSetup(setup, {
    onBack: () => { setup.hidden = true; entry.hidden = false; },
    onStart: (mode) => {
      state.writingSetupMode = mode;
      setUnifiedPracticeStage("writing", "practice", { mode, selectionId: resolvedSelectionId });
      state.writingTimerElapsed = 0;
      state.writingTimerStartedAt = Date.now();
      state.writingTimerDuration = isFullTest ? 60 * 60 : activeTaskNumber === 1 ? 20 * 60 : 40 * 60;
      if (resolvedKind === "custom") setWritingWorkspaceMode("custom");
      else if (isFullTest) startWritingFullTestPractice(fullTest, { scroll: true });
      else startWritingSystemPractice("selected", {
        setId: resolvedSelectionId,
        taskNumber: activeTaskNumber,
        taskId: activeTask?.id,
      });
      if (resolvedKind === "custom" && state.pendingWritingReviewPrompt) {
        if ($("uploadPrompt")) $("uploadPrompt").value = state.pendingWritingReviewPrompt;
        state.pendingWritingReviewPrompt = "";
        syncCustomWritingState();
        scheduleDraftAutosave();
      }
      startWritingTimer({ reset: true, durationSeconds: isFullTest ? 60 * 60 : activeTaskNumber === 1 ? 20 * 60 : 40 * 60 });
    },
  });
  setup.scrollIntoView({ block: "start" });
}

function continueLatestWritingDraft() {
  const draft = latestWritingDraft();
  if (!draft) {
    setWritingWorkspaceMode("entry");
    setHelpStatus("No saved Writing draft yet");
    return;
  }
  restoreDraft(draft.key || draft.draft_key);
}

function latestWritingDraft() {
  return uniqueDrafts([...(state.serverDrafts || []), ...readLocalDrafts()])
    .filter((item) => item.payload?.activeView === "writing-upload")
    .sort((a, b) => String(b.updatedAt || b.updated_at || "").localeCompare(String(a.updatedAt || a.updated_at || "")))
    .find(Boolean);
}

function renderWritingResumeStrip() {
  const root = $("writingResumeStrip");
  if (!root) return;
  const draft = latestWritingDraft();
  root.hidden = !draft;
  if (!draft) return;
  if ($("writingResumeTitle")) $("writingResumeTitle").textContent = draft.title || "Your latest Writing practice";
  const date = draft.updatedAt || draft.updated_at;
  if ($("writingResumeMeta")) $("writingResumeMeta").textContent = date ? `Saved ${new Date(date).toLocaleString()}` : "Saved on this device";
}

function writingSetTasks(option) {
  return (option?.writingTasks || []).filter(Boolean).map(normalizeItem);
}

function writingUploadTaskByNumber(taskNumber) {
  return (state.uploadWritingTasks || []).map(normalizeItem)
    .find((task) => writingTaskNumber(task) === Number(taskNumber)) || null;
}

function writingTask1Pool() {
  return mergedItems("writing")
    .map(normalizeItem)
    .filter((task) => writingTaskNumber(task) === 1);
}

function writingTask1ForOption(option) {
  return writingSetTasks(option).find((task) => writingTaskNumber(task) === 1) || null;
}

function writingTask2ForOption(option) {
  return writingSetTasks(option).find((task) => writingTaskNumber(task) === 2) || null;
}

function writingTaskForOption(option) {
  return writingSetTasks(option)[0] || null;
}

function writingTask1OptionLabel(task) {
  const kind = writingTaskKind(task);
  const usefulKind = /^task\s*1$/i.test(kind) ? "visual" : kind;
  return `${writingTopicSourceLabel({ writingTasks: [task] })} · ${usefulKind}`;
}

function writingSetSearchText(option) {
  const task = writingTaskForOption(option) || option || {};
  return [
    option?.source,
    option?.period,
    task.title,
    task.type,
    task.prompt,
    task.data,
    task.source,
    task.period,
  ].filter(Boolean).join(" ").toLowerCase();
}

function writingTopicRules() {
  return [
    { title: "Food & agriculture", emoji: "🍽️", accent: "food-agriculture", pattern: /\b(food|meal|restaurant|coffee|tea|noodle|agriculture|agricultural|farm|farming|crop)\b/i },
    { title: "Education & learning", emoji: "📝", accent: "education-learning", pattern: /\b(school|student|education|university|teacher|learning|homework|subject|course|academic|tuition|classroom)\b/i },
    { title: "Digital technology", emoji: "🖥️", accent: "technology-digital", pattern: /\b(technology|internet|computer|online|digital|robot|automation|ai|smartphone|algorithm|data|privacy)\b/i },
    { title: "Work & careers", emoji: "💼", accent: "work-career", pattern: /\b(work|job|jobs|career|employee|employer|employment|office|salary|profession|business|company|workplace|retirement|sector)\b/i },
    { title: "Environment & climate", emoji: "🌦️", accent: "environment-climate", pattern: /\b(environment|climate|pollution|recycle|recycling|carbon|emission|energy|electricity|power|water|wildlife|habitat|animal|plant|nature|green|desert)\b/i },
    { title: "Transport & travel", emoji: "🚆", accent: "transport-mobility", pattern: /\b(transport|traffic|congestion|commute|road|car|vehicle|rail|bus|cycling|pedestrian|fuel|travel|tourist|tourists|tourism|airport|harbour|harbor)\b/i },
    { title: "Cities & housing", emoji: "🏙️", accent: "cities-housing", pattern: /\b(city|cities|urban|housing|apartment|high-rise|residential|land|neighbourhood|neighborhood|public space|park)\b/i },
    { title: "Health & lifestyle", emoji: "💗", accent: "health-lifestyle", pattern: /\b(health|healthy|hospital|doctor|exercise|sport|diet|medical|wellbeing|fitness|sugar|illness|disease)\b/i },
    { title: "Family & children", emoji: "👨‍👩‍👧", accent: "family-children", pattern: /\b(family|families|children|child|parent|parents|mother|father|elderly|older people|ageing|aging)\b/i },
    { title: "Crime & law", emoji: "⚖️", accent: "crime-law", pattern: /\b(crime|criminal|prison|punishment|sentence|law|legal|police|rehabilitation|offender)\b/i },
    { title: "Government & public services", emoji: "🏛️", accent: "government-public", pattern: /\b(government|public service|policy|tax|funding|spend|spending|community service|citizen|society|population)\b/i },
    { title: "Culture & traditions", emoji: "🎬", accent: "culture-traditions", pattern: /\b(culture|art|music|museum|library|history|tradition|custom|festival|heritage|local film)\b/i },
    { title: "Media & advertising", emoji: "📰", accent: "media-advertising", pattern: /\b(media|news|newspaper|television|advertising|advertisement|social media|film|entertainment)\b/i },
    { title: "Globalisation & language", emoji: "🌍", accent: "globalisation-language", pattern: /\b(globalisation|globalization|international|foreign|overseas|language|multicultural|border)\b/i },
    { title: "Consumerism & money", emoji: "🛍️", accent: "consumerism-money", pattern: /\b(consumer|consumption|shopping|shop|shops|export|exports|income|money|finance|financial|bank|salary|wealth|cost|price|prices)\b/i },
    { title: "Science & research", emoji: "🔬", accent: "science-research", pattern: /\b(science|scientific|research|experiment|space|discovery|medicine|innovation)\b/i },
    { title: "Charts & data", emoji: "📊", accent: "charts-data", pattern: /$^/ },
    { title: "General essays", emoji: "✨", accent: "essay-general", pattern: /$^/ },
  ];
}

function writingTopicMeta(option) {
  const task = writingTaskForOption(option) || option || {};
  const taskText = [task.prompt, task.data, task.title]
    .filter(Boolean)
    .join(" ")
    .replace(/present a written argument or case to an educated reader with no specialist knowledge/gi, " ")
    .replace(/\bacademic\b/gi, " ")
    .replace(/you should spend about \d+ minutes on this task/gi, " ")
    .replace(/write at least \d+ words/gi, " ");
  const rules = writingTopicRules();
  const legacyAccent = {
    education: "education-learning",
    technology: "technology-digital",
    work: "work-career",
    nature: "environment-climate",
    place: "cities-housing",
    lifestyle: "health-lifestyle",
    society: "government-public",
    media: "culture-traditions",
  }[task.topicCategory];
  const match = rules.find((rule) => rule.accent === task.topicSubcategory)
    || rules.find((rule) => rule.pattern.test(taskText))
    || rules.find((rule) => rule.accent === legacyAccent);
  if (match) return match;
  return writingTaskNumber(task) === 1
    ? { title: "Charts & data", emoji: "📊", accent: "charts-data" }
    : { title: "Essay", emoji: "✨", accent: "essay-general" };
}

function renderWritingTopicCategoryBar(options = []) {
  const root = $("writingTopicCategoryBar");
  if (!root) return;
  const available = new Set(options.map((option) => writingTopicMeta(option).accent));
  const current = state.writingTopicCategory || "all";
  const selected = current === "recommended" || current === "all" || available.has(current) ? current : "all";
  state.writingTopicCategory = selected;
  const buttons = [
    { key: "all", label: "All topics" },
    { key: "recommended", label: "AI pick" },
    ...writingTopicRules()
      .filter((rule) => available.has(rule.accent))
      .map((rule) => ({ key: rule.accent, label: rule.title })),
  ];
  root.innerHTML = buttons.map((button) => `<button class="topic-category-pill${button.key === selected ? " active" : ""}" type="button" data-writing-topic-category="${escapeHtml(button.key)}">${escapeHtml(button.label)}</button>`).join("");
  root.querySelectorAll("[data-writing-topic-category]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-writing-topic-category]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.writingTopicCategory = button.dataset.writingTopicCategory || "all";
      state.writingTopicPage = 1;
      renderWritingUploadHub();
    });
  });
}

function writingTaskPreview(task, fallback = "Cambridge writing task") {
  const text = compactDialogueText([task?.prompt, task?.data, task?.title].filter(Boolean).join(" "));
  return compactText(text || fallback, 150);
}

function writingTaskKind(task) {
  const text = compactDialogueText([task?.title, task?.prompt, task?.data].filter(Boolean).join(" ")).toLowerCase();
  if (/map/.test(text)) return "map";
  if (/process|diagram|stages|cycle/.test(text)) return "process";
  if (/pie chart|pie charts/.test(text)) return "pie chart";
  if (/bar chart|bar graph/.test(text)) return "bar chart";
  if (/line graph|line chart/.test(text)) return "line graph";
  if (/table/.test(text)) return "table";
  if (/letter/.test(text)) return "letter";
  return String(task?.type || "task").toLowerCase();
}

function writingTopicSourceLabel(option) {
  const first = writingTaskForOption(option) || option || {};
  return [
    itemBook(first) ? `Cambridge ${itemBook(first)}` : first.source || option?.source || "Writing",
    itemTest(first) ? `Test ${itemTest(first)}` : "",
  ].filter(Boolean).join(" · ");
}

function writingTopicCards(options = writingSystemOptions(), recommendedId = "") {
  const query = ($("writingTopicSearch")?.value || "").trim().toLowerCase();
  const book = $("writingTopicBook")?.value || "all";
  const category = state.writingTopicCategory || "all";
  return options.filter((option) => {
    const first = writingTaskForOption(option) || option || {};
    const isPublic = first.source === "Public topics";
    const bookOk = book === "all"
      || (book === "public" ? isPublic : !isPublic && String(itemBook(first)) === book);
    if (!bookOk) return false;
    const meta = writingTopicMeta(option);
    const categoryOk = category === "all"
      || (category === "recommended" ? option.id === recommendedId : meta.accent === category);
    if (!categoryOk) return false;
    if (!query) return true;
    return `${writingSetSearchText(option)} ${meta.title}`.toLowerCase().includes(query);
  });
}

function renderWritingTopicFilters(options) {
  const select = $("writingTopicBook");
  if (!select) return;
  const current = select.value || "all";
  const books = [...new Set(options.map((option) => itemBook(writingTaskForOption(option) || option)).filter((value) => value !== null && value !== undefined))]
    .sort((a, b) => Number(a) - Number(b));
  const hasPublic = options.some((option) => writingTaskForOption(option)?.source === "Public topics");
  select.innerHTML = [
    `<option value="all">All sources</option>`,
    ...(hasPublic ? [`<option value="public">Public topics</option>`] : []),
    ...books.map((book) => `<option value="${escapeHtml(book)}">Cambridge ${escapeHtml(book)}</option>`),
  ].join("");
  select.value = current === "public" && hasPublic
    ? "public"
    : books.map(String).includes(current) ? current : "all";
}

function writingTask1Cards(tasks = writingTask1Pool(), completionIndex = null) {
  const query = ($("writingTopicSearch")?.value || "").trim().toLowerCase();
  const source = $("writingTopicBook")?.value || "all";
  return tasks.filter((task) => {
    const sourceOk = source === "all" || String(itemBook(task)) === source;
    if (!sourceOk || !practiceCompletionFilterMatches("writing", task, completionIndex, "writingCompletionFilter")) return false;
    if (!query) return true;
    return [task.title, task.prompt, task.data, task.source, writingTaskKind(task)]
      .filter(Boolean).join(" ").toLowerCase().includes(query);
  });
}

function renderWritingTask1Filters(tasks) {
  const select = $("writingTopicBook");
  if (!select) return;
  const current = select.value || "all";
  const books = [...new Set(tasks.map(itemBook).filter((value) => value !== null && value !== undefined))]
    .sort((a, b) => Number(a) - Number(b));
  select.innerHTML = [
    `<option value="all">All Task 1 charts</option>`,
    ...books.map((book) => `<option value="${escapeHtml(book)}">Cambridge ${escapeHtml(book)}</option>`),
  ].join("");
  select.value = books.map(String).includes(current) ? current : "all";
}

function renderWritingTask1Card(task, recommendedId = "", completionIndex = null) {
  const item = normalizeItem(task);
  const kind = writingTaskKind(item);
  const isRecommended = item.id === recommendedId;
  const completion = practiceCompletionStatus("writing", item, completionIndex);
  const status = completion.completed ? "completed" : "not-completed";
  return `<article class="bank-item speaking-topic-card writing-topic-card writing-task1-card${isRecommended ? " recommended" : ""}" data-writing-task1-id="${escapeHtml(item.id)}" data-practice-status="${status}" role="button" tabindex="0" aria-label="Choose ${escapeHtml(item.title || "Task 1 visual")}">
    <div class="topic-card-head"><div class="topic-icon" aria-hidden="true"><i data-lucide="chart-no-axes-combined"></i></div><span class="practice-status-badge ${status}">${practiceCompletionDisplay(completion)}</span>${isRecommended ? `<span class="writing-ai-pick">AI pick</span>` : ""}</div>
    <h3>${escapeHtml(item.title || "Task 1 visual")}</h3>
    <div class="topic-card-body">
      <div class="topic-keywords"><span>Task 1</span><span>${escapeHtml(kind === "task 1" ? "visual" : kind)}</span></div>
      <p class="writing-topic-summary">${escapeHtml(writingTaskPreview(item, "Summarise the main features and make relevant comparisons."))}</p>
    </div>
    <div class="topic-card-foot"><span class="topic-origin">${escapeHtml(writingTopicSourceLabel({ writingTasks: [item] }))}</span><button class="primary small-button practice-writing-task1" type="button" data-writing-task1-id="${escapeHtml(item.id)}">Choose</button></div>
  </article>`;
}

function renderWritingTask1Board(tasks, recommended) {
  const root = $("writingTopicList");
  if (!root) return;
  renderWritingTask1Filters(tasks);
  const completionIndex = readPracticeCompletionIndex();
  const filtered = writingTask1Cards(tasks, completionIndex);
  if (!filtered.length) {
    root.innerHTML = `<div class="notice">No Task 1 charts match this search.</div>`;
    renderWritingTopicPagination(0, 1, state.writingTopicPageSize);
    return;
  }
  const ordered = recommended && filtered.some((task) => task.id === recommended.id)
    ? [recommended, ...filtered.filter((task) => task.id !== recommended.id)]
    : filtered;
  const totalPages = Math.max(1, Math.ceil(ordered.length / state.writingTopicPageSize));
  state.writingTopicPage = Math.min(Math.max(1, state.writingTopicPage || 1), totalPages);
  const start = (state.writingTopicPage - 1) * state.writingTopicPageSize;
  const visible = ordered.slice(start, start + state.writingTopicPageSize);
  root.innerHTML = visible.map((task) => renderWritingTask1Card(task, recommended?.id || "", completionIndex)).join("");
  renderWritingTopicPagination(ordered.length, state.writingTopicPage, state.writingTopicPageSize);
  root.querySelectorAll(".writing-task1-card[data-writing-task1-id]").forEach((card) => {
    const open = () => openWritingPracticeSetup("task1", card.dataset.writingTask1Id);
    card.addEventListener("click", (event) => { if (!event.target.closest("button")) open(); });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    });
  });
  root.querySelectorAll(".practice-writing-task1").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openWritingPracticeSetup("task1", button.dataset.writingTask1Id);
    });
  });
  window.lucide?.createIcons?.({ attrs: { "stroke-width": 1.8 } });
}

function writingLibraryScope() {
  return ["full", "topics", "review"].includes(state.writingLibraryScope) ? state.writingLibraryScope : "full";
}

function renderWritingScopeTabs() {
  const scope = writingLibraryScope();
  document.querySelectorAll("[data-writing-scope]").forEach((button) => {
    const active = button.dataset.writingScope === scope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll('[data-writing-scope-detail="full"]').forEach((node) => {
    node.textContent = "Task 1 + Task 2 by test";
  });
  document.querySelectorAll('[data-writing-scope-detail="review"]').forEach((node) => {
    node.textContent = "Task 1 & Task 2 feedback";
  });
}

function setWritingTopicListLayout(scope) {
  const root = $("writingTopicList");
  if (!root) return;
  root.classList.toggle("objective-topic-grid", scope === "topics");
  root.classList.toggle("writing-review-grid", scope === "review");
  root.classList.toggle("writing-full-task-grid", scope === "full");
}

function writingTask2FullCards(options = writingSystemOptions(), completionIndex = null) {
  const query = ($("writingTopicSearch")?.value || "").trim().toLowerCase();
  const source = $("writingTopicBook")?.value || "all";
  return options.filter((option) => {
    const task = writingTask2ForOption(option);
    if (!task) return false;
    const isPublic = task.source === "Public topics";
    const sourceOk = source === "all"
      || (source === "public" ? isPublic : !isPublic && String(itemBook(task)) === source);
    if (!sourceOk || !practiceCompletionFilterMatches("writing", task, completionIndex, "writingCompletionFilter")) return false;
    return !query || `${writingSetSearchText(option)} ${writingTopicMeta(option).title}`.toLowerCase().includes(query);
  });
}

function renderWritingTask2FullCard(option, recommendedId = "", completionIndex = null) {
  const task = writingTask2ForOption(option) || {};
  const meta = writingTopicMeta(option);
  const completion = practiceCompletionStatus("writing", task, completionIndex);
  const status = completion.completed ? "completed" : "not-completed";
  const isRecommended = option.id === recommendedId;
  return `<article class="practice-unit-card tone-writing writing-full-task-card${isRecommended ? " recommended" : ""}" data-writing-task2-option="${escapeHtml(option.id)}" data-practice-status="${status}" role="button" tabindex="0" aria-label="Choose ${escapeHtml(task.title || meta.title)}">
    <div class="practice-unit-card-head"><span aria-hidden="true">${escapeHtml(meta.emoji || "✨")}</span><em>Task 2${isRecommended ? " · AI pick" : ""}</em></div>
    <h4>${escapeHtml(task.title || meta.title || "Writing Task 2")}</h4>
    <p>${escapeHtml(writingTaskPreview(task, "Write a complete IELTS Task 2 essay."))}</p>
    <div class="practice-unit-stats"><span><strong>250</strong> words</span><span><strong>40</strong> min</span><span>${escapeHtml(meta.title)}</span></div>
    <span class="practice-status-badge ${status}">${practiceCompletionDisplay(completion)}</span>
    <button class="primary practice-writing-task2" type="button" data-writing-task2-option="${escapeHtml(option.id)}">Start this task</button>
  </article>`;
}

function renderWritingTask2FullBoard(options, recommended) {
  const root = $("writingTopicList");
  if (!root) return;
  renderWritingTopicFilters(options);
  const completionIndex = readPracticeCompletionIndex();
  const filtered = writingTask2FullCards(options, completionIndex);
  const ordered = recommended && filtered.some((option) => option.id === recommended.id)
    ? [recommended, ...filtered.filter((option) => option.id !== recommended.id)]
    : filtered;
  if (!ordered.length) {
    root.innerHTML = `<div class="notice">No Task 2 questions match the current filters.</div>`;
    renderWritingTopicPagination(0, 1, state.writingTopicPageSize);
    return;
  }
  const totalPages = Math.max(1, Math.ceil(ordered.length / state.writingTopicPageSize));
  state.writingTopicPage = Math.min(Math.max(1, state.writingTopicPage || 1), totalPages);
  const start = (state.writingTopicPage - 1) * state.writingTopicPageSize;
  const visible = ordered.slice(start, start + state.writingTopicPageSize);
  root.innerHTML = visible.map((option) => renderWritingTask2FullCard(option, recommended?.id || "", completionIndex)).join("");
  renderWritingTopicPagination(ordered.length, state.writingTopicPage, state.writingTopicPageSize);
  root.querySelectorAll("[data-writing-task2-option]").forEach((node) => {
    const open = () => openWritingPracticeSetup("task2", node.dataset.writingTask2Option);
    if (node.matches("article")) {
      node.addEventListener("click", (event) => { if (!event.target.closest("button")) open(); });
      node.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      });
    } else {
      node.addEventListener("click", (event) => { event.stopPropagation(); open(); });
    }
  });
}

function renderWritingFullFilters(task1Tasks, task2Options) {
  const select = $("writingTopicBook");
  if (!select) return;
  const current = select.value || "all";
  const books = [...new Set([
    ...task1Tasks.map(itemBook),
    ...task2Options.map((option) => itemBook(writingTask2ForOption(option) || option)),
  ].filter((value) => value !== null && value !== undefined))].sort((a, b) => Number(a) - Number(b));
  const hasPublic = task2Options.some((option) => writingTask2ForOption(option)?.source === "Public topics");
  select.innerHTML = [
    `<option value="all">All sources</option>`,
    ...(hasPublic ? [`<option value="public">Public topics</option>`] : []),
    ...books.map((book) => `<option value="${escapeHtml(book)}">Cambridge ${escapeHtml(book)}</option>`),
  ].join("");
  select.value = current === "public" && hasPublic
    ? "public"
    : books.map(String).includes(current) ? current : "all";
}

function writingFullTaskEntries(task1Tasks, task2Options, completionIndex = null) {
  const query = ($("writingTopicSearch")?.value || "").trim().toLowerCase();
  const source = $("writingTopicBook")?.value || "all";
  const task1Entries = task1Tasks.filter((task) => {
    const sourceOk = source === "all" || source !== "public" && String(itemBook(task)) === source;
    if (!sourceOk || !practiceCompletionFilterMatches("writing", task, completionIndex, "writingCompletionFilter")) return false;
    return !query || [task.title, task.prompt, task.data, task.source, writingTaskKind(task), "task 1"]
      .filter(Boolean).join(" ").toLowerCase().includes(query);
  }).map((task) => ({ kind: "task1", task }));
  const task2Entries = task2Options.filter((option) => {
    const task = writingTask2ForOption(option);
    if (!task) return false;
    const isPublic = task.source === "Public topics";
    const sourceOk = source === "all" || (source === "public" ? isPublic : !isPublic && String(itemBook(task)) === source);
    if (!sourceOk || !practiceCompletionFilterMatches("writing", task, completionIndex, "writingCompletionFilter")) return false;
    return !query || `${writingSetSearchText(option)} ${writingTopicMeta(option).title} task 2`.toLowerCase().includes(query);
  }).map((option) => ({ kind: "task2", option }));
  const combined = [];
  const length = Math.max(task1Entries.length, task2Entries.length);
  for (let index = 0; index < length; index += 1) {
    if (task1Entries[index]) combined.push(task1Entries[index]);
    if (task2Entries[index]) combined.push(task2Entries[index]);
  }
  return combined;
}

function renderWritingTask1FullCard(task, recommendedId = "", completionIndex = null) {
  const item = normalizeItem(task);
  const taskKind = writingTaskKind(item);
  const completion = practiceCompletionStatus("writing", item, completionIndex);
  const status = completion.completed ? "completed" : "not-completed";
  const isRecommended = item.id === recommendedId;
  return `<article class="practice-unit-card tone-writing writing-full-task-card writing-task1-card${isRecommended ? " recommended" : ""}" data-writing-task1-id="${escapeHtml(item.id)}" data-practice-status="${status}" role="button" tabindex="0" aria-label="Choose ${escapeHtml(item.title || "Task 1 visual")}">
    <div class="practice-unit-card-head"><span aria-hidden="true">📊</span><em>Task 1${isRecommended ? " · AI pick" : ""}</em></div>
    <h4>${escapeHtml(item.title || "Writing Task 1")}</h4>
    <p>${escapeHtml(writingTaskPreview(item, "Summarise the main features and make relevant comparisons."))}</p>
    <div class="practice-unit-stats"><span><strong>150</strong> words</span><span><strong>20</strong> min</span><span>${escapeHtml(taskKind === "task 1" ? "Visual" : taskKind || "Visual")}</span></div>
    <span class="practice-status-badge ${status}">${practiceCompletionDisplay(completion)}</span>
    <button class="primary practice-writing-task1" type="button" data-writing-task1-id="${escapeHtml(item.id)}">Start this task</button>
  </article>`;
}

function bindWritingFullTaskCards(root) {
  root.querySelectorAll(".writing-full-task-card[data-writing-task1-id]").forEach((card) => {
    const open = () => openWritingPracticeSetup("task1", card.dataset.writingTask1Id);
    card.addEventListener("click", (event) => { if (!event.target.closest("button")) open(); });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    });
  });
  root.querySelectorAll(".practice-writing-task1").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openWritingPracticeSetup("task1", button.dataset.writingTask1Id);
    });
  });
  root.querySelectorAll(".writing-full-task-card[data-writing-task2-option]").forEach((card) => {
    const open = () => openWritingPracticeSetup("task2", card.dataset.writingTask2Option);
    card.addEventListener("click", (event) => { if (!event.target.closest("button")) open(); });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open();
    });
  });
  root.querySelectorAll(".practice-writing-task2").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openWritingPracticeSetup("task2", button.dataset.writingTask2Option);
    });
  });
}

function renderWritingFullBoard(fullTests, recommended) {
  const root = $("writingTopicList");
  if (!root) return;
  const select = $("writingTopicBook");
  if (select) {
    const current = select.value || "all";
    const books = [...new Set(fullTests.map((option) => option.book).filter(Number.isFinite))].sort((a, b) => a - b);
    select.innerHTML = [`<option value="all">All Cambridge books</option>`, ...books.map((book) => `<option value="${book}">Cambridge ${book}</option>`)].join("");
    select.value = books.map(String).includes(current) ? current : "all";
  }
  const completionIndex = readPracticeCompletionIndex();
  const query = ($("writingTopicSearch")?.value || "").trim().toLowerCase();
  const book = $("writingTopicBook")?.value || "all";
  const completionFilter = $("writingCompletionFilter")?.value || "all";
  let visibleTests = fullTests.filter((option) => {
    const status = practiceCompletionStatus("writing", option, completionIndex);
    const completionOk = completionFilter === "all" || (completionFilter === "completed" ? status.completed : !status.completed);
    const bookOk = book === "all" || String(option.book) === book;
    const queryOk = !query || [option.title, option.book, option.test, ...option.writingTasks.map((task) => `${task.title} ${task.prompt} ${task.data}`)].join(" ").toLowerCase().includes(query);
    return completionOk && bookOk && queryOk;
  });
  if (recommended && visibleTests.some((option) => option.id === recommended.id)) {
    visibleTests = [recommended, ...visibleTests.filter((option) => option.id !== recommended.id)];
  }
  if (!visibleTests.length) {
    root.innerHTML = `<div class="notice">No complete Cambridge Writing tests match the current filters.</div>`;
    renderWritingTopicPagination(0, 1, state.writingTopicPageSize);
    return;
  }
  const totalPages = Math.max(1, Math.ceil(visibleTests.length / state.writingTopicPageSize));
  state.writingTopicPage = Math.min(Math.max(1, state.writingTopicPage || 1), totalPages);
  const start = (state.writingTopicPage - 1) * state.writingTopicPageSize;
  const pageItems = visibleTests.slice(start, start + state.writingTopicPageSize);
  root.innerHTML = pageItems.map((option) => {
    const status = practiceCompletionStatus("writing", option, completionIndex);
    const completed = status.completed ? "completed" : "not-completed";
    const isRecommended = option.id === recommended?.id;
    return `<article class="practice-unit-card tone-writing writing-full-test-card${isRecommended ? " recommended" : ""}" data-writing-full-test-id="${escapeHtml(option.id)}" data-practice-status="${completed}" role="button" tabindex="0" aria-label="Choose ${escapeHtml(option.title)} full test">
      <div class="practice-unit-card-head"><span aria-hidden="true">📝</span><em>Full test${isRecommended ? " · AI pick" : ""}</em></div>
      <h4>${escapeHtml(option.title)}</h4>
      <p>Complete the original Task 1 and Task 2 from this test in one 60-minute workspace.</p>
      <div class="practice-unit-stats"><span><strong>2</strong> tasks</span><span><strong>60</strong> min</span><span><strong>1:2</strong> weighting</span></div>
      <span class="practice-status-badge ${completed}">${practiceCompletionDisplay(status)}</span>
      <button class="primary" type="button" data-writing-full-test-id="${escapeHtml(option.id)}">Start full test</button>
    </article>`;
  }).join("");
  renderWritingTopicPagination(visibleTests.length, state.writingTopicPage, state.writingTopicPageSize);
  root.querySelectorAll("[data-writing-full-test-id]").forEach((node) => {
    const open = () => openWritingPracticeSetup("full-test", node.dataset.writingFullTestId);
    if (node.matches("article")) {
      node.addEventListener("click", (event) => { if (!event.target.closest("button")) open(); });
      node.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        open();
      });
    } else {
      node.addEventListener("click", (event) => { event.stopPropagation(); open(); });
    }
  });
}

function writingAttemptTaskNumber(attempt = {}) {
  const explicit = Number(attempt.taskNumber || attempt.evidence?.taskNumber || attempt.result?.taskNumber);
  if (explicit === 1 || explicit === 2) return explicit;
  const itemId = String(attempt.itemId || attempt.result?.itemId || "");
  const item = findItemById("writing", itemId);
  const itemTaskNumber = item ? writingTaskNumber(item) : null;
  if (itemTaskNumber) return itemTaskNumber;
  return detectWritingTaskProfile(attempt.prompt || attempt.evidence?.prompt || attempt.result?.prompt || "").taskNumber;
}

function writingReviewScores(attempt = {}) {
  if (attempt.scores?.criteria) return attempt.scores;
  const score = attempt.contract?.score || attempt.score || attempt.result?.score || {};
  const criteria = Array.isArray(score.criteria)
    ? score.criteria.map((item) => ({ label: item.label || item.criterion || "Criterion", score: roundWritingBand(item.score), feedback: item.feedback || "" }))
    : [];
  const overall = roundWritingBand(score.overall?.value ?? score.overall ?? attempt.band ?? attempt.result?.band);
  if (criteria.length || overall) return { overall, criteria };
  return extractWritingScores(attempt.feedback || attempt.result?.feedback || "", attempt.analysis || attempt.result?.analysis);
}

function writingReviewEntries(taskNumber = 0) {
  const attempts = mineLearningAttempts()
    .filter((attempt) => String(attempt.module || attempt.result?.module || "").toLowerCase() === "writing")
    .filter((attempt) => !attempt.isFullTestParent && !attempt.result?.isFullTestParent)
    .filter((attempt) => !taskNumber || writingAttemptTaskNumber(attempt) === taskNumber);
  const attemptIds = new Set(attempts.map((attempt) => String(attempt.attemptId || attempt.id || "")).filter(Boolean));
  const attemptEntries = attempts.map((attempt, index) => {
    const resolvedTaskNumber = writingAttemptTaskNumber(attempt);
    const feedback = attempt.feedback || attempt.result?.feedback || "";
    const analysis = attempt.analysis || attempt.result?.analysis || null;
    const normalized = { ...attempt, feedback, analysis, essay: attempt.essay || attempt.result?.essay || "" };
    const scores = writingReviewScores(normalized);
    const impact = writingImpactInsight(feedback, scores, normalized, analysis);
    return {
      id: String(attempt.attemptId || attempt.id || `writing-review-${index}`),
      taskNumber: resolvedTaskNumber,
      itemId: String(attempt.itemId || attempt.result?.itemId || ""),
      title: attempt.title || attempt.result?.title || `Task ${resolvedTaskNumber} attempt`,
      band: scores.overall || "",
      criterion: impact.criterion,
      issue: impact.issue || "Review the saved criterion feedback before your next attempt.",
      evidence: impact.evidence || "No essay excerpt was saved for this attempt.",
      instruction: impact.instruction,
      date: attempt.submittedAt || attempt.updatedAt || attempt.createdAt || attempt.result?.updatedAt || "",
      prompt: attempt.prompt || attempt.result?.prompt || "",
      sourceAttemptId: String(attempt.attemptId || attempt.id || ""),
      attempt,
    };
  });
  const weakEntries = mineWeakAreas()
    .filter((area) => area.module === "writing")
    .filter((area) => !taskNumber || writingAttemptTaskNumber(area) === taskNumber)
    .filter((area) => !area.sourceAttemptId || !attemptIds.has(String(area.sourceAttemptId)))
    .map((area, index) => {
      const resolvedTaskNumber = writingAttemptTaskNumber(area);
      return {
        id: String(area.id || `writing-weak-${index}`),
        taskNumber: resolvedTaskNumber,
        itemId: String(area.itemId || area.evidence?.itemId || ""),
        title: area.title || area.skillKey || `Task ${resolvedTaskNumber} weak area`,
        band: area.evidence?.score || "",
        criterion: area.evidence?.criterion || area.skillKey || "Writing criterion",
        issue: area.summary || "Saved writing weak area",
        evidence: area.evidence?.originalExcerpt || "No essay excerpt was saved for this weak area.",
        instruction: area.evidence?.rewriteInstruction || "Rewrite the weak paragraph and check it against the saved criterion.",
        date: area.createdAt || area.updatedAt || "",
        prompt: area.evidence?.prompt || "",
        sourceAttemptId: String(area.sourceAttemptId || ""),
        attempt: null,
      };
    });
  const query = ($("writingTopicSearch")?.value || "").trim().toLowerCase();
  return [...attemptEntries, ...weakEntries]
    .filter((entry) => !query || [entry.title, entry.criterion, entry.issue, entry.evidence, entry.instruction].join(" ").toLowerCase().includes(query))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 30);
}

function writingReviewRetryTarget(entry) {
  const sourceAttempt = entry.sourceAttemptId
    ? mineLearningAttempts().find((attempt) => String(attempt.attemptId || attempt.id || "") === entry.sourceAttemptId)
    : null;
  const item = findItemById("writing", entry.itemId || sourceAttempt?.itemId || sourceAttempt?.result?.itemId);
  if (!item) return null;
  if (entry.taskNumber === 1) return { kind: "task1", selectionId: item.id };
  const option = writingSystemOptions().find((candidate) => writingTask2ForOption(candidate)?.id === item.id);
  return option ? { kind: "task2", selectionId: option.id } : null;
}

function openWritingReviewRetry(entry) {
  const retry = writingReviewRetryTarget(entry);
  if (retry) {
    openWritingPracticeSetup(retry.kind, retry.selectionId);
    return;
  }
  if (entry.taskNumber === 1) {
    const target = writingTask1Pool()[0];
    if (target) {
      openWritingPracticeSetup("task1", target.id);
      return;
    }
  }
  state.pendingWritingReviewPrompt = entry.prompt || writingTargetTaskForCriterion(entry.criterion);
  openWritingPracticeSetup("custom", "writing-review");
}

function renderWritingReviewBoard(taskNumber = 0) {
  const root = $("writingTopicList");
  if (!root) return;
  const entries = writingReviewEntries(taskNumber);
  renderWritingTopicPagination(0, 1, state.writingTopicPageSize);
  if (!entries.length) {
    root.innerHTML = `<div class="practice-unit-empty writing-review-empty"><span aria-hidden="true">🌱</span><p>Complete and score a Writing task first. Your Band, weakest criterion, evidence and rewrite target will appear here.</p></div>`;
    return;
  }
  root.innerHTML = entries.map((entry) => {
    const retry = writingReviewRetryTarget(entry);
    const date = practiceCompletionDateLabel(entry.date) || "Saved review";
    const band = entry.band ? `Band ${roundWritingBand(entry.band) || escapeHtml(entry.band)}` : "Weak area";
    return `<article class="writing-review-card" data-writing-review-id="${escapeHtml(entry.id)}">
      <header><span class="objective-topic-icon" aria-hidden="true">🔁</span><strong>${escapeHtml(band)}</strong></header>
      <div><span class="eyebrow">Task ${entry.taskNumber} · ${escapeHtml(date)}</span><h4>${escapeHtml(entry.criterion)}</h4><p>${escapeHtml(entry.issue)}</p></div>
      <blockquote><span>Exact evidence</span>${escapeHtml(entry.evidence)}</blockquote>
      <div class="writing-review-next"><span>Rewrite target</span><strong>${escapeHtml(entry.instruction)}</strong></div>
      <footer><span>${escapeHtml(entry.title)}</span><button class="primary" type="button" data-writing-review-retry="${escapeHtml(entry.id)}">${retry ? "Retry task" : "Targeted practice"} ${objectiveTopicArrowIcon()}</button></footer>
    </article>`;
  }).join("");
  root.querySelectorAll("[data-writing-review-retry]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = entries.find((item) => item.id === button.dataset.writingReviewRetry);
      if (entry) openWritingReviewRetry(entry);
    });
  });
}

function renderWritingTopicPagination(total, page, pageSize) {
  const root = $("writingTopicPagination");
  if (!root) return;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (!total) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }
  if (totalPages <= 1) {
    root.hidden = false;
    root.innerHTML = `<div class="topic-pagination-summary">Showing ${total} writing ${writingLibraryScope() === "topics" ? "topics" : "tasks"}</div>`;
    return;
  }
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages));
  const ordered = [...pages].sort((a, b) => a - b);
  const pageButtons = [];
  ordered.forEach((value, index) => {
    if (index && value - ordered[index - 1] > 1) pageButtons.push(`<span class="topic-pagination-gap">...</span>`);
    pageButtons.push(`<button class="topic-page-button${value === page ? " active" : ""}" type="button" data-writing-topic-page="${value}" aria-current="${value === page ? "page" : "false"}">${value}</button>`);
  });
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  root.hidden = false;
  root.innerHTML = `
    <div class="topic-pagination-summary">Showing ${start}-${end} of ${total} writing ${writingLibraryScope() === "topics" ? "topics" : "tasks"}</div>
    <div class="topic-pagination-controls">
      <button class="topic-page-button" type="button" data-writing-topic-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Prev</button>
      ${pageButtons.join("")}
      <button class="topic-page-button" type="button" data-writing-topic-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Next</button>
    </div>`;
  root.querySelectorAll("[data-writing-topic-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextPage = Number(button.dataset.writingTopicPage);
      if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage > totalPages || nextPage === state.writingTopicPage) return;
      state.writingTopicPage = nextPage;
      renderWritingUploadHub();
      $("writingTopicList")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderWritingTopicCard(option, recommendedId = "", completionIndex = null) {
  const group = option?.items ? option : {
    id: `writing-topic:${writingTopicMeta(option).accent}`,
    ...writingTopicMeta(option),
    items: [option],
  };
  const featured = group.items.find((item) => item.id === recommendedId) || group.items[0] || {};
  const meta = group;
  const isRecommended = group.items.some((item) => item.id === recommendedId);
  const taskNumbers = [...new Set(group.items.map((item) => writingTaskNumber(writingTaskForOption(item))).filter(Boolean))].sort();
  const taskLabel = taskNumbers.length === 2 ? "Task 1 + Task 2" : taskNumbers.length ? `Task ${taskNumbers[0]}` : "Writing";
  const chips = [
    taskLabel,
    `${group.items.length} ${group.items.length === 1 ? "question" : "questions"}`,
  ].filter(Boolean).slice(0, 3);
  const tasks = group.items.map(writingTaskForOption).filter(Boolean);
  const summary = practiceCompletionGroupSummary("writing", tasks, completionIndex);
  const books = tasks.map(itemBook).filter(Number.isFinite).sort((a, b) => a - b);
  const hasPublic = tasks.some((item) => item.source === "Public topics");
  const bookRange = hasPublic && books.length
    ? "Cambridge + Public"
    : books.length
      ? (books[0] === books.at(-1) ? `Cambridge ${books[0]}` : `Cambridge ${books[0]}–${books.at(-1)}`)
      : hasPublic ? "Public topics" : "Writing";
  const sourceLabel = `${group.items.length} ${group.items.length === 1 ? "question" : "questions"} · ${bookRange}`;
  return `<article class="objective-topic-card writing-topic-card topic-accent-${escapeHtml(meta.accent)}${isRecommended ? " recommended" : ""}" data-writing-topic-group="${escapeHtml(group.id)}" data-writing-completed-count="${summary.completedCount}" role="button" tabindex="0" aria-label="Choose ${escapeHtml(meta.title)} writing topic">
    <div class="objective-topic-card-head">
      <span class="objective-topic-icon" aria-hidden="true">${escapeHtml(meta.emoji || "✨")}</span>
      <span class="objective-topic-progress">${escapeHtml(summary.label)}</span>
    </div>
    <h4>${escapeHtml(meta.title)}${isRecommended ? ` <span class="writing-ai-pick">AI pick</span>` : ""}</h4>
    <div class="objective-topic-keywords">${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}</div>
    <footer><span>${escapeHtml(sourceLabel)}</span><button class="primary practice-writing-topic" type="button" data-writing-topic-group="${escapeHtml(group.id)}">Choose ${objectiveTopicArrowIcon()}</button></footer>
  </article>`;
}

function buildWritingTopicGroups(options = [], recommendedId = "") {
  const groups = new Map();
  options.forEach((option) => {
    const meta = writingTopicMeta(option);
    const id = `writing-topic:${meta.accent}`;
    if (!groups.has(id)) groups.set(id, { id, ...meta, emoji: meta.emoji || "✨", items: [] });
    groups.get(id).items.push(option);
  });
  return [...groups.values()].sort((a, b) => {
    const aPick = a.items.some((item) => item.id === recommendedId) ? 1 : 0;
    const bPick = b.items.some((item) => item.id === recommendedId) ? 1 : 0;
    return bPick - aPick || a.title.localeCompare(b.title);
  });
}

function findWritingTopicGroup(groupId, options = writingTopicOptions(), recommendedId = "") {
  return buildWritingTopicGroups(options, recommendedId).find((group) => group.id === groupId) || null;
}

function renderWritingSetChooser(group, recommendedId = "", completionIndex = readPracticeCompletionIndex()) {
  const setup = $("writingSetupPanel");
  const entry = $("writingEntry");
  const workspace = $("writingWorkspace");
  if (!setup || !entry || !workspace || !group) return;
  entry.hidden = true;
  workspace.hidden = true;
  setup.hidden = false;
  const ordered = [...group.items]
    .filter((option) => practiceCompletionFilterMatches("writing", writingTaskForOption(option), completionIndex, "writingCompletionFilter"))
    .sort((a, b) => Number(b.id === recommendedId) - Number(a.id === recommendedId));
  setup.innerHTML = `<section class="topic-set-chooser writing-set-chooser">
    <header class="bank-practice-head topic-set-chooser-head"><div><span>Writing topic</span><h3>${escapeHtml(group.title)}</h3><p>Choose a Task 1 or Task 2 question. Each opens as one independent practice.</p></div><button class="secondary small-button" type="button" data-writing-set-back>Back to topics</button></header>
    <div class="topic-set-list" role="list">${ordered.map((option, index) => {
      const task = writingTaskForOption(option) || {};
      const taskNumber = writingTaskNumber(task) || 2;
      const completion = practiceCompletionStatus("writing", task, completionIndex);
      const status = completion.completed ? "completed" : "not-completed";
      const minutes = taskNumber === 1 ? 20 : 40;
      const words = taskNumber === 1 ? 150 : 250;
      return `<article class="topic-set-row" role="listitem" data-practice-status="${status}" data-writing-task-id="${escapeHtml(task.id || "")}">
        <div class="topic-set-index">${index + 1}</div>
        <div class="topic-set-main"><div class="topic-set-source">${escapeHtml(writingTopicSourceLabel(option))}${option.id === recommendedId ? " · AI pick" : ""}</div><h4>Task ${taskNumber} · ${minutes} min · ${words} words</h4><p>${escapeHtml(writingTaskPreview(task, `IELTS Writing Task ${taskNumber}`))}</p><span class="practice-status-badge ${status}">${practiceCompletionDisplay(completion)}</span></div>
        <button class="primary small-button choose-writing-set" type="button" data-writing-set-id="${escapeHtml(option.id)}" data-writing-task-id="${escapeHtml(task.id || "")}">Select question</button>
      </article>`;
    }).join("")}</div>
  </section>`;
  setup.querySelector("[data-writing-set-back]")?.addEventListener("click", () => {
    setup.hidden = true;
    setup.innerHTML = "";
    entry.hidden = false;
  });
  setup.querySelectorAll("[data-writing-set-id]").forEach((button) => {
    button.addEventListener("click", () => openWritingPracticeSetup("topic", button.dataset.writingSetId));
  });
  setup.scrollIntoView({ block: "start" });
  window.lucide?.createIcons?.({ attrs: { "stroke-width": 1.8 } });
}

function renderWritingTopicBoard(options, recommended) {
  const root = $("writingTopicList");
  if (!root) return;
  renderWritingTopicFilters(options);
  renderWritingTopicCategoryBar(options);
  let filtered = writingTopicCards(options, recommended?.id || "");
  if (recommended?.id && filtered.some((option) => option.id === recommended.id)) {
    filtered = [recommended, ...filtered.filter((option) => option.id !== recommended.id)];
  }
  if (!filtered.length) {
    root.innerHTML = `<div class="notice">No writing topics match this search.</div>`;
    renderWritingTopicPagination(0, 1, state.writingTopicPageSize);
    return;
  }
  const completionIndex = readPracticeCompletionIndex();
  const groups = buildWritingTopicGroups(filtered, recommended?.id || "")
    .filter((group) => group.items.some((option) => practiceCompletionFilterMatches("writing", writingTaskForOption(option), completionIndex, "writingCompletionFilter")));
  const totalPages = Math.max(1, Math.ceil(groups.length / state.writingTopicPageSize));
  state.writingTopicPage = Math.min(Math.max(1, state.writingTopicPage || 1), totalPages);
  const start = (state.writingTopicPage - 1) * state.writingTopicPageSize;
  const displayItems = groups.slice(start, start + state.writingTopicPageSize);
  root.innerHTML = displayItems.map((group) => renderWritingTopicCard(group, recommended?.id || "", completionIndex)).join("");
  renderWritingTopicPagination(groups.length, state.writingTopicPage, state.writingTopicPageSize);
  root.querySelectorAll(".writing-topic-card[data-writing-topic-group]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      renderWritingSetChooser(findWritingTopicGroup(card.dataset.writingTopicGroup, filtered, recommended?.id || ""), recommended?.id || "", completionIndex);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      renderWritingSetChooser(findWritingTopicGroup(card.dataset.writingTopicGroup, filtered, recommended?.id || ""), recommended?.id || "", completionIndex);
    });
  });
  root.querySelectorAll(".practice-writing-topic[data-writing-topic-group]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      renderWritingSetChooser(findWritingTopicGroup(button.dataset.writingTopicGroup, filtered, recommended?.id || ""), recommended?.id || "", completionIndex);
    });
  });
  window.lucide?.createIcons?.({ attrs: { "stroke-width": 1.8 } });
}

function renderWritingUploadHub() {
  const select = $("writingSystemSelect");
  const title = $("writingRecommendedTitle");
  const reason = $("writingSystemReason");
  const entryReason = $("writingRecommendedReason");
  renderWritingResumeStrip();
  if (!select || !title) return;
  const scope = writingLibraryScope();
  renderWritingScopeTabs();
  setWritingTopicListLayout(scope);
  const categoryBar = $("writingTopicCategoryBar");
  if (categoryBar) categoryBar.hidden = scope !== "topics";
  if ($("writingTopicBook")) $("writingTopicBook").hidden = scope === "review";
  if ($("writingCompletionFilter")) $("writingCompletionFilter").hidden = scope === "review";
  if ($("openCustomWriting")) $("openCustomWriting").hidden = scope === "review";
  if ($("writingTopicSearch")) {
    $("writingTopicSearch").placeholder = scope === "review"
      ? "Search Writing feedback or weak areas..."
      : scope === "topics" ? "Search Task 1 or Task 2 content topics..." : "Search Cambridge Writing full tests...";
  }
  const topicOptions = writingTopicOptions();
  const recommendedTopic = topicOptions.length ? chooseRotatingRecommendation("writing-topics", topicOptions) : null;
  const fullTests = writingFullTestOptions();
  const recommendedFullTest = fullTests.length ? chooseRotatingRecommendation("writing-full-test", fullTests) : null;
  const systemOptions = scope === "topics" ? topicOptions : fullTests;
  select.innerHTML = systemOptions.length
    ? systemOptions.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title || singleOptionLabel(item, "writing"))}</option>`).join("")
    : `<option value="">No Writing practice is available</option>`;

  if (scope === "review") {
    title.textContent = "Writing mistake review";
    if (reason) reason.textContent = "Retry each Task 1 or Task 2 independently from its saved feedback.";
    if (entryReason) entryReason.textContent = "Your saved Task 1 and Task 2 scores, evidence and rewrite targets.";
    renderWritingReviewBoard();
    return;
  }

  if (scope === "topics") {
    if (!topicOptions.length) {
      title.textContent = "No Writing topics available";
      if (reason) reason.textContent = "Import a Task 1 or Task 2 question before AI can recommend a writing topic.";
      if (entryReason) entryReason.textContent = "No Writing content topic is available yet.";
      renderWritingTopicBoard([], null);
      $("startRecommendedWriting")?.setAttribute("disabled", "disabled");
      $("startSelectedWriting")?.setAttribute("disabled", "disabled");
      return;
    }
    title.textContent = recommendedTopic?.title || "Recommended Writing topic";
    const recommendedReason = singleRecommendationReason("writing", recommendedTopic, topicOptions);
    if (reason) reason.textContent = recommendedReason;
    if (entryReason) entryReason.textContent = "Choose a content topic, then select one independent Task 1 or Task 2 question.";
    renderWritingTopicBoard(topicOptions, recommendedTopic);
    $("startRecommendedWriting")?.removeAttribute("disabled");
    $("startSelectedWriting")?.removeAttribute("disabled");
    return;
  }

  if (!fullTests.length) {
    title.textContent = "No complete Writing tests available";
    if (reason) reason.textContent = "A Full test needs Task 1 and Task 2 from the same Cambridge test.";
    if (entryReason) entryReason.textContent = "No paired Cambridge Writing test is available yet.";
    renderWritingFullBoard([], null);
    $("startRecommendedWriting")?.setAttribute("disabled", "disabled");
    $("startSelectedWriting")?.setAttribute("disabled", "disabled");
    return;
  }
  title.textContent = recommendedFullTest?.title || "Recommended Writing full test";
  if (reason) reason.textContent = "Complete both tasks from one Cambridge test and receive the official 1:2 weighted Writing Band.";
  if (entryReason) entryReason.textContent = "Choose one Cambridge test. Task 1 and Task 2 open together in a 60-minute workspace.";
  renderWritingFullBoard(fullTests, recommendedFullTest);
  if (state.pendingWritingSetId && fullTests.some((item) => item.id === state.pendingWritingSetId)) {
    select.value = state.pendingWritingSetId;
  } else if (recommendedFullTest) {
    select.value = recommendedFullTest.id;
  }
  $("startRecommendedWriting")?.toggleAttribute("disabled", !recommendedFullTest);
  $("startSelectedWriting")?.toggleAttribute("disabled", !fullTests.length);
}

function saveWritingUploadSessionPointer(setId = "", task1Id = "", task2Id = "") {
  const resolvedSetId = setId || state.pendingWritingSetId || "";
  if (!resolvedSetId) return;
  try {
    localStorage.setItem(writingUploadSessionStoreKey, JSON.stringify({
      setId: resolvedSetId,
      task1Id: task1Id || state.selectedWritingTask1Id || writingUploadTaskByNumber(1)?.id || "",
      task2Id: task2Id || state.selectedWritingTask2Id || writingUploadTaskByNumber(2)?.id || "",
      activeTaskNumber: state.writingActiveTaskNumber || 1,
      practiceKind: state.pendingWritingKind || "topic",
      setupMode: state.writingSetupMode,
      updatedAt: new Date().toISOString(),
    }));
  } catch {}
}

function startWritingFullTestPractice(option, config = {}) {
  const selected = typeof option === "string"
    ? writingFullTestOptions().find((item) => item.id === option)
    : option;
  const task1 = writingTask1ForOption(selected);
  const task2 = writingTask2ForOption(selected);
  if (!selected || !task1 || !task2) return false;
  state.uploadWritingTasks = [
    { ...normalizeItem(task1), minutes: Number(task1.minutes) || 20 },
    { ...normalizeItem(task2), minutes: Number(task2.minutes) || 40 },
  ];
  state.pendingWritingKind = "full-test";
  state.pendingWritingSetId = selected.id;
  state.selectedWritingTask1Id = task1.id;
  state.selectedWritingTask2Id = task2.id;
  state.writingLibraryTaskNumber = 0;
  state.writingActiveTaskNumber = Number(config.activeTaskNumber) === 2 ? 2 : 1;
  state.writingTimerDuration = 60 * 60;
  saveWritingUploadSessionPointer(selected.id, task1.id, task2.id);
  const content = $("writingSystemContent");
  const actions = $("writingSystemActions");
  if (!content || !actions) return false;
  content.innerHTML = renderWritingExamTwoColumn(state.uploadWritingTasks, "upload-system");
  $("writingSystemWorkspace")?.classList.add("has-writing-task");
  actions.hidden = false;
  setWritingWorkspaceMode("cambridge");
  if ($("writingWorkspaceTitle")) $("writingWorkspaceTitle").textContent = `${selected.title} · Full test`;
  bindDynamicControls();
  if (state.writingActiveTaskNumber === 2) content.querySelector('[data-writing-task-tab="2"]')?.click();
  if (config.scroll !== false) content.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function startWritingSystemPractice(mode = "recommended", config = {}) {
  const taskNumber = Number(config.taskNumber || state.writingLibraryTaskNumber) === 1 ? 1 : 2;
  let task = null;
  let sessionId = config.setId || "";
  if (taskNumber === 1) {
    const tasks = writingTask1Pool();
    const selectedId = config.taskId || (mode === "selected" ? $("writingSystemSelect")?.value : chooseRotatingRecommendation("writing-task1", tasks)?.id);
    task = tasks.find((item) => item.id === selectedId) || chooseRotatingRecommendation("writing-task1", tasks) || tasks[0] || null;
    if (!task) return;
    sessionId = sessionId || `writing-task1:${task.id}`;
    state.selectedWritingTask1Id = task.id;
    state.selectedWritingTask2Id = "";
    rememberPracticeRecommendation("writing-task1", task);
  } else {
    const options = writingSystemOptions();
    if (!options.length) return;
    const selectedId = config.setId || (mode === "selected" ? $("writingSystemSelect")?.value : writingSystemRecommended(options)?.id);
    const selected = options.find((item) => item.id === selectedId) || writingSystemRecommended(options) || options[0];
    task = config.taskId
      ? options.map(writingTask2ForOption).find((item) => item?.id === config.taskId)
      : writingTask2ForOption(selected);
    if (!task) return;
    sessionId = config.setId || selected.id;
    state.selectedWritingTask1Id = "";
    state.selectedWritingTask2Id = task.id;
    rememberPracticeRecommendation("writing", selected);
  }
  state.uploadWritingTasks = [normalizeItem(task)];
  state.pendingWritingKind = config.practiceKind || (taskNumber === 1 ? "task1" : "task2");
  state.pendingWritingSetId = sessionId;
  state.writingLibraryTaskNumber = taskNumber;
  state.writingActiveTaskNumber = taskNumber;
  state.writingTimerDuration = taskNumber === 1 ? 20 * 60 : 40 * 60;
  saveWritingUploadSessionPointer(sessionId, state.selectedWritingTask1Id, state.selectedWritingTask2Id);
  const content = $("writingSystemContent");
  const actions = $("writingSystemActions");
  if (!content || !actions) return;
  content.innerHTML = renderWritingExamTwoColumn(state.uploadWritingTasks, "upload-system");
  $("writingSystemWorkspace")?.classList.add("has-writing-task");
  actions.hidden = false;
  setWritingWorkspaceMode("cambridge");
  if ($("writingWorkspaceTitle")) $("writingWorkspaceTitle").textContent = `Task ${taskNumber} practice`;
  bindDynamicControls();
  if (config.scroll !== false) content.scrollIntoView({ behavior: "smooth", block: "start" });
}

function restoreWritingUploadSessionAfterData() {
  if (location.hash !== "#writing-upload") return false;
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(writingUploadSessionStoreKey) || "null");
  } catch {}
  const setId = String(session?.setId || "");
  const task1Id = String(session?.task1Id || "");
  const task2Id = String(session?.task2Id || "");
  const practiceKind = String(session?.practiceKind || "");
  const fullTest = writingFullTestOptions().find((option) => option.id === setId
    && writingTask1ForOption(option)?.id === task1Id
    && writingTask2ForOption(option)?.id === task2Id);
  if (practiceKind === "full-test" || (setId.startsWith("writing-full-test:") && task1Id && task2Id)) {
    if (!fullTest) return false;
    state.pendingWritingSetId = setId;
    state.pendingWritingKind = "full-test";
    state.selectedWritingTask1Id = task1Id;
    state.selectedWritingTask2Id = task2Id;
    state.writingSetupMode = session?.setupMode === "exam" ? "exam" : "coach";
    state.writingActiveTaskNumber = Number(session?.activeTaskNumber) === 2 ? 2 : 1;
    restoreWritingTimerState(setId);
    startWritingFullTestPractice(fullTest, { activeTaskNumber: state.writingActiveTaskNumber, scroll: false });
    const fullDraft = uniqueDrafts([...(state.serverDrafts || []), ...readLocalDrafts()])
      .find((item) => item.payload?.activeView === "writing-upload"
        && item.payload?.writingSetId === setId
        && item.payload?.writingTask1Id === task1Id
        && item.payload?.writingTask2Id === task2Id);
    if (fullDraft?.payload?.values) applyDraftValues(fullDraft.payload.values);
    startWritingTimer();
    return true;
  }
  const taskNumber = task1Id ? 1 : task2Id ? 2 : Number(session?.activeTaskNumber || 2);
  const taskId = taskNumber === 1 ? task1Id : task2Id;
  const taskExists = taskNumber === 1
    ? writingTask1Pool().some((task) => task.id === taskId)
    : writingSystemOptions().some((option) => writingTask2ForOption(option)?.id === taskId);
  if (!setId || !taskId || !taskExists) return false;
  state.pendingWritingSetId = setId;
  state.pendingWritingKind = practiceKind || (taskNumber === 1 ? "task1" : "task2");
  state.selectedWritingTask1Id = task1Id;
  state.selectedWritingTask2Id = task2Id;
  state.writingLibraryTaskNumber = taskNumber;
  state.writingSetupMode = session?.setupMode === "exam" ? "exam" : "coach";
  state.writingActiveTaskNumber = taskNumber;
  restoreWritingTimerState(setId);
  startWritingSystemPractice("selected", { setId, taskNumber, taskId, scroll: false });
  const draft = uniqueDrafts([...(state.serverDrafts || []), ...readLocalDrafts()])
    .find((item) => item.payload?.activeView === "writing-upload"
      && item.payload?.writingSetId === setId
      && (!item.payload?.writingTask1Id || item.payload.writingTask1Id === state.selectedWritingTask1Id)
      && (!item.payload?.writingTask2Id || item.payload.writingTask2Id === state.selectedWritingTask2Id));
  if (draft?.payload?.values) applyDraftValues(draft.payload.values);
  return true;
}

function roundWritingBand(value) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return "";
  return (Math.round(number * 2) / 2).toFixed(1);
}

function weightedWritingOverall(task1, task2) {
  const first = Number.parseFloat(task1);
  const second = Number.parseFloat(task2);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return "";
  return roundWritingBand((first + (second * 2)) / 3);
}

function writingTextEvidence(itemId, response, analysis = {}) {
  const quote = String(analysis?.highestImpact?.evidence || "").trim();
  const source = String(response || "");
  let start = quote ? source.indexOf(quote) : -1;
  const resolvedQuote = start >= 0 ? quote : writingEvidenceExcerpt(source, "");
  if (start < 0) start = source.indexOf(resolvedQuote);
  return resolvedQuote && start >= 0 ? [{
    id: `evidence-${itemId}-${start}`,
    kind: "text-range",
    itemId,
    quote: resolvedQuote,
    range: { start, end: start + resolvedQuote.length, unit: "utf16-code-unit" },
  }] : [];
}

function buildUnifiedAttemptContract({ module, mode = "coach", items = [], score = {}, highestImpact = null, evidence = [], nextAction = null, retest = null, provenance = {} } = {}) {
  const attemptId = learningEntityId("attempt");
  return {
    schemaVersion: "scoring.v2",
    attempt: {
      id: attemptId,
      module,
      mode,
      scope: items.length > 1 ? "full-test" : "single-task",
      submittedAt: new Date().toISOString(),
      items,
    },
    score,
    highestImpact: highestImpact || null,
    evidence,
    nextAction: nextAction || { type: module === "writing" ? "rewrite" : "repeat", label: "Improve this skill" },
    retest: retest || { type: module === "writing" ? "paragraph-rewrite" : "answer-repeat", parentAttemptId: attemptId },
    provenance,
  };
}

function combineWritingTaskResults(tasks, responses, results) {
  const taskScores = results.map((result, index) => {
    const scores = extractWritingScores(result.feedback || "", result.analysis);
    const criteria = scores.criteria.map((criterion, criterionIndex) => ({
      ...criterion,
      label: index === 0 && criterionIndex === 0 ? "Task Achievement" : criterion.label,
    }));
    return {
      taskNumber: index + 1,
      itemId: tasks[index]?.id || `task${index + 1}`,
      title: tasks[index]?.title || `Writing Task ${index + 1}`,
      overall: scores.overall,
      criteria,
      analysis: result.analysis || null,
      feedback: result.feedback || "",
      evidence: writingTextEvidence(`task${index + 1}`, responses[index], result.analysis),
      pdfUrl: result.pdfUrl || "",
    };
  });
  const overall = weightedWritingOverall(taskScores[0]?.overall, taskScores[1]?.overall);
  const sharedLabels = ["Task Achievement / Response", "Coherence & Cohesion", "Lexical Resource", "Grammatical Range & Accuracy"];
  const criteria = sharedLabels.map((label, index) => ({
    label,
    score: weightedWritingOverall(taskScores[0]?.criteria[index]?.score, taskScores[1]?.criteria[index]?.score),
    feedback: index === 0
      ? "Task 1 achievement and Task 2 response are combined using the official 1:2 task weighting."
      : taskScores[1]?.criteria[index]?.feedback || taskScores[0]?.criteria[index]?.feedback || "",
  }));
  const weakestTask = [...taskScores].sort((a, b) => Number.parseFloat(a.overall) - Number.parseFloat(b.overall))[0];
  const impact = weakestTask?.analysis?.highestImpact || {};
  const evidence = taskScores.flatMap((task) => task.evidence);
  const contract = buildUnifiedAttemptContract({
    module: "writing",
    mode: state.writingSetupMode,
    items: tasks.map((task, index) => ({
      id: `task${index + 1}`,
      sourceId: task.id || "",
      kind: index === 0 ? "academic-task-1" : "task-2",
      prompt: task.prompt || "",
      response: responses[index],
      wordCount: countWords(responses[index]),
    })),
    score: {
      status: "final",
      overall: { value: Number.parseFloat(overall), scale: "ielts-band", weighting: { task1: 1, task2: 2 } },
      criteria,
      tasks: taskScores,
    },
    highestImpact: {
      criterionKey: impact.criterion || weakestTask?.criteria?.[0]?.label || "Task response",
      itemId: `task${weakestTask?.taskNumber || 2}`,
      issue: impact.issue || weakestTask?.criteria?.[0]?.feedback || "Develop the response more fully.",
      evidenceIds: weakestTask?.evidence?.map((item) => item.id) || [],
      successCriterion: impact.rewriteInstruction || "Rewrite the evidence paragraph with a clearer claim and development.",
    },
    evidence,
    nextAction: { type: "rewrite", label: "Improve this skill", itemId: `task${weakestTask?.taskNumber || 2}` },
    retest: { type: "paragraph-rewrite", itemId: `task${weakestTask?.taskNumber || 2}` },
    provenance: { provider: "dashscope", weighting: "task1:1,task2:2" },
  });
  contract.retest.parentAttemptId = contract.attempt.id;
  return { overall, criteria, taskScores, evidence, contract };
}

async function scoreSimulationWritingPair(tasks, prefixRoot = "upload-system", onStatus = null) {
  const normalized = tasks.slice(0, 2).map(normalizeItem);
  const responses = normalized.map((_task, index) => $(`${prefixRoot}-task${index + 1}-writing`)?.value.trim() || "");
  if (responses.some((response) => !response)) throw new Error("Complete both Task 1 and Task 2 before scoring.");
  onStatus?.(1);
  const combined = await runWritingFeedbackJob("", "", () => onStatus?.(2), {
    items: normalized.map((task, index) => ({
      id: `task${index + 1}`,
      taskNumber: index + 1,
      kind: index === 0 ? "academic-task-1" : "task-2",
      prompt: task.prompt || task.title || `Writing Task ${index + 1}`,
      essay: responses[index],
    })),
  });
  if (combined.contract?.score?.tasks?.length === 2) {
    return {
      overall: roundWritingBand(combined.contract.score.overall.value),
      criteria: combined.contract.score.criteria.map((item) => ({ ...item, score: roundWritingBand(item.score) })),
      taskScores: combined.contract.score.tasks.map((item) => ({ ...item, overall: roundWritingBand(item.overall), criteria: item.criteria.map((criterion) => ({ ...criterion, score: roundWritingBand(criterion.score) })) })),
      evidence: combined.contract.evidence || [],
      contract: combined.contract,
      responses,
      results: combined.taskResults || [],
    };
  }
  const results = combined.taskResults || [];
  return { ...combineWritingTaskResults(normalized, responses, results), responses, results };
}

async function submitSystemWriting() {
  const tasks = (state.uploadWritingTasks || []).filter(Boolean).map(normalizeItem);
  if (tasks.length === 2 && state.pendingWritingKind === "full-test") {
    setUnifiedPracticeStage("writing", "scoring");
    setFeedback("uploadWritingFeedback", "Scoring Task 1 and Task 2 with official 1:2 weighting...", "uploadWritingMode", "");
    try {
      const pair = await scoreSimulationWritingPair(tasks, "upload-system", () => {
        setFeedback("uploadWritingFeedback", "Generating both task reports and the weighted Writing Band...", "uploadWritingMode", "");
      });
      const parentAttemptId = pair.contract?.attempt?.id || learningEntityId("attempt");
      pair.taskScores.forEach((score, index) => {
        const task = tasks[index];
        const taskNumber = index + 1;
        rememberWritingAttempt({
          attemptId: `${parentAttemptId}:task${taskNumber}`,
          fullTestAttemptId: parentAttemptId,
          itemId: task.id || "",
          taskNumber,
          source: "full-test",
          title: `Task ${taskNumber} · ${task.title || "Writing practice"}`,
          prompt: [task.prompt, task.data].filter(Boolean).join("\n\nData: "),
          essay: pair.responses[index] || "",
          feedback: score.feedback || "",
          analysis: score.analysis || null,
          scores: { overall: score.overall, criteria: score.criteria || [] },
          contract: pair.contract || null,
        });
      });
      const combinedFeedback = pair.taskScores.map((score) => score.feedback || "").filter(Boolean).join("\n\n---\n\n");
      const impact = pair.contract?.highestImpact || {};
      const analysis = {
        overall: pair.overall,
        criteria: pair.criteria,
        taskScores: pair.taskScores,
        highestImpact: {
          criterion: impact.criterionKey || "Task Response",
          issue: impact.issue || "Develop the weakest task more fully.",
          evidence: pair.evidence?.[0]?.quote || "Review the highlighted response evidence.",
          rewriteInstruction: impact.successCriterion || "Rewrite the weakest paragraph with clearer development.",
        },
      };
      const fullTest = writingFullTestOptions().find((option) => option.id === state.pendingWritingSetId);
      rememberWritingAttempt({
        attemptId: parentAttemptId,
        itemId: state.pendingWritingSetId,
        taskNumber: 2,
        isFullTestParent: true,
        source: "full-test",
        title: `${fullTest?.title || "Writing"} · Full test`,
        prompt: writingPromptForTasks(tasks),
        essay: pair.responses.join("\n\n---\n\n"),
        feedback: combinedFeedback,
        analysis,
        scores: { overall: pair.overall, criteria: pair.criteria },
        taskScores: pair.taskScores,
        contract: pair.contract || null,
      });
      stopWritingTimer({ pause: true });
      setFeedbackHtml("uploadWritingFeedback", renderWritingReportHtml(combinedFeedback, { analysis, contract: pair.contract }, "ielts-writing-full-test-feedback.pdf"), "uploadWritingMode", "ai");
      revealWritingFeedback();
    } catch (error) {
      setUnifiedPracticeStage("writing", "practice");
      setFeedback("uploadWritingFeedback", `Submission failed: ${error.message}`, "uploadWritingMode", "error");
    }
    return;
  }
  if (tasks.length !== 1) {
    setFeedback("uploadWritingFeedback", "Please start one topic task or one valid Full test first.", "uploadWritingMode", "error");
    return;
  }
  const task = tasks[0];
  const taskNumber = writingTaskNumber(task) || state.writingActiveTaskNumber || 2;
  const response = $(`upload-system-task${taskNumber}-writing`)?.value.trim() || "";
  if (!response) {
    setFeedback("uploadWritingFeedback", `Complete Task ${taskNumber} before scoring.`, "uploadWritingMode", "error");
    return;
  }
  setUnifiedPracticeStage("writing", "scoring");
  setFeedback("uploadWritingFeedback", `Scoring Task ${taskNumber} independently...`, "uploadWritingMode", "");
  try {
    const prompt = [task.prompt, task.data].filter(Boolean).join("\n\nData: ") || task.title || `Writing Task ${taskNumber}`;
    const json = await runWritingFeedbackJob(prompt, response, () => {
      setFeedback("uploadWritingFeedback", `Generating Task ${taskNumber} feedback...`, "uploadWritingMode", "");
    });
    const canonicalScores = json.contract?.score
      ? {
          overall: roundWritingBand(json.contract.score.overall?.value),
          criteria: (json.contract.score.criteria || []).map((item) => ({ ...item, score: roundWritingBand(item.score) })),
        }
      : extractWritingScores(json.feedback || "", json.analysis);
    rememberWritingAttempt({
      attemptId: json.contract?.attempt?.id,
      itemId: task.id || "",
      source: "system",
      title: `Task ${taskNumber} · ${task.title || "Writing practice"}`,
      prompt,
      essay: response,
      feedback: json.feedback || "",
      analysis: json.analysis || null,
      scores: canonicalScores,
      contract: json.contract || null,
    });
    setFeedbackHtml("uploadWritingFeedback", renderWritingReportHtml(json.feedback || "", { analysis: json.analysis, contract: json.contract }, "ielts-writing-feedback.pdf"), "uploadWritingMode", json.mode || "ai");
    revealWritingFeedback();
  } catch (error) {
    setUnifiedPracticeStage("writing", "practice");
    setFeedback("uploadWritingFeedback", `Submission failed: ${error.message}`, "uploadWritingMode", "error");
  }
}

function setImmersivePractice(moduleName, targetId) {
  const shouldFocus = ["listening", "reading", "writing", "speaking"].includes(moduleName);
  if (moduleName !== "listening") {
    document.body.classList.remove("listening-caption-rail-active");
    restoreListeningCaptionRail();
  }
  if (shouldFocus) applySidebarState(true);
  document.body.classList.toggle("immersive-mode", shouldFocus);
  document.body.classList.remove("single-immersive-mode");
  document.body.dataset.immersiveScope = shouldFocus ? "exam" : "";
  document.body.dataset.immersiveModule = shouldFocus ? moduleName : "";
  document.querySelectorAll(".exam-section").forEach((section) => {
    section.classList.toggle("focused-section", shouldFocus && section.id === targetId);
  });
  document.querySelectorAll(".exam-quick-nav a[data-focus-module]").forEach((link) => {
    link.classList.toggle("active", shouldFocus && link.dataset.focusModule === moduleName);
  });
  Object.entries(state.listeningCaptionState).forEach(([prefix, captionState]) => {
    if (captionState?.enabled) mountListeningCaptionRail(prefix, moduleName === "listening");
  });
  updateAnnotationToolbarAvailability();
  refreshGlobalCoachPanelIfOpen();
}

function setSingleImmersive(moduleName = state.activeModule) {
  applySidebarState(true);
  if (moduleName !== "listening") {
    document.body.classList.remove("listening-caption-rail-active");
    restoreListeningCaptionRail();
  }
  document.body.classList.add("immersive-mode", "single-immersive-mode");
  document.body.dataset.immersiveScope = "single";
  document.body.dataset.immersiveModule = moduleName || "";
  Object.entries(state.listeningCaptionState).forEach(([prefix, captionState]) => {
    if (captionState?.enabled) mountListeningCaptionRail(prefix, moduleName === "listening");
  });
  updateAnnotationToolbarAvailability();
  refreshGlobalCoachPanelIfOpen();
}

function exitImmersiveMode() {
  document.body.classList.remove("immersive-mode", "single-immersive-mode");
  document.body.classList.remove("listening-caption-rail-active");
  restoreListeningCaptionRail();
  document.body.dataset.immersiveScope = "";
  document.body.dataset.immersiveModule = "";
  document.querySelectorAll(".exam-section").forEach((section) => {
    section.classList.remove("focused-section");
  });
  document.querySelectorAll(".exam-quick-nav a[data-focus-module]").forEach((link) => {
    link.classList.remove("active");
  });
  updateAnnotationToolbarAvailability();
  refreshGlobalCoachPanelIfOpen();
}

function backAndScrollToSubmit(targetId) {
  exitImmersiveMode();
  localStorage.setItem(sidebarStoreKey, "false");
  applySidebarState(false);
  const target = $(targetId);
  setTimeout(() => {
    target?.scrollIntoView({ behavior: "auto", block: "center" });
    target?.focus?.({ preventScroll: true });
  }, 80);
}

function scrollToExamSection(targetId) {
  const target = $(targetId);
  if (!target) return;
  const run = () => {
    const quickNav = target.closest(".exam-grid")?.querySelector(".exam-quick-nav");
    const offset = (quickNav?.getBoundingClientRect().height || 0) + 14;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };
  requestAnimationFrame(run);
  setTimeout(run, 250);
}

async function ensureListeningCaptionPayload(prefix) {
  if (listeningCaptionPayload(prefix)) return listeningCaptionPayload(prefix);
  return null;
}

function bindListeningCaptionPlayers() {
  document.querySelectorAll(".listening-player[data-prefix]").forEach((audio) => {
    if (audio.dataset.captionBound === "1") return;
    audio.dataset.captionBound = "1";
    const prefix = audio.dataset.prefix || "single";
    const rule = listeningPlaybackRule(listeningModeForPrefix(prefix));
    audio.controls = rule.canPause;
    audio.setAttribute("controlslist", rule.canSeek ? "nodownload" : "nodownload noplaybackrate");
    audio.disablePictureInPicture = true;
    let lastAllowedTime = Number(audio.currentTime || 0);
    const sync = async ({ restart = false } = {}) => {
      const prefix = audio.dataset.prefix || "single";
      const captionState = state.listeningCaptionState[prefix];
      if (!captionState?.enabled) return;
      if (captionState.source === "asr") {
        stopListeningAsr(prefix);
        state.listeningCaptionState[prefix] = { enabled: true, section: audio.dataset.section || "", source: "missing-cache" };
        setListeningCaption(prefix, audio.dataset.section || "", "Listening captions now use offline cache only.", "Cached captions");
        return;
      }
      if (captionState.source === "loading-cache" || captionState.source === "missing-cache") return;
      if (captionState.source === "timed-cache") {
        updateListeningCaptionFromAudio(audio);
        if (restart && !audio.paused && !audio.ended) restartTimedListeningCaptionLoop(prefix, audio);
        else if (!audio.paused && !audio.ended) startTimedListeningCaptionLoop(prefix, audio);
        return;
      }
      await ensureListeningCaptionPayload(prefix);
      updateListeningCaptionFromAudio(audio);
      if (state.listeningCaptionState[prefix]?.source === "timed-cache" && !audio.paused && !audio.ended) {
        if (restart) restartTimedListeningCaptionLoop(prefix, audio);
        else startTimedListeningCaptionLoop(prefix, audio);
      }
    };
    audio.addEventListener("loadstart", () => {
      const record = listeningPlaybackRecord(audio.dataset.prefix || "single");
      if (String(record.section || "") === String(audio.dataset.section || "")) setListeningPlaybackStatus(audio, "loading", "Loading");
    });
    audio.addEventListener("play", () => {
      const prefix = audio.dataset.prefix || "single";
      if (prefix === "single" && state.activeModule === "listening" && !state.singleTimerId) startSingleTimer();
      setListeningPlaybackStatus(audio, "playing", "Playing");
      sync({ restart: true });
    });
    audio.addEventListener("playing", () => {
      setListeningPlaybackStatus(audio, "playing", "Playing");
      sync({ restart: true });
    });
    audio.addEventListener("canplay", () => {
      if (audio.paused && !audio.ended) setListeningPlaybackStatus(audio, "ready", "Ready to play");
      sync({ restart: false });
    });
    audio.addEventListener("timeupdate", () => sync({ restart: false }));
    audio.addEventListener("pause", () => {
      const prefix = audio.dataset.prefix || "single";
      if (!audio.seeking) stopTimedListeningCaptionLoop(prefix, audio.dataset.section || "");
      if (prefix === "single" && state.activeModule === "listening" && currentSinglePracticeMode("listening") !== "exam" && state.singleTimerId) stopSingleTimer();
      if (!audio.ended) setListeningPlaybackStatus(audio, "paused", "Paused");
    });
    audio.addEventListener("seeking", () => {
      const prefix = audio.dataset.prefix || "single";
      stopTimedListeningCaptionLoop(prefix, audio.dataset.section || "");
      if (!rule.canSeek && Math.abs(Number(audio.currentTime || 0) - lastAllowedTime) > 1.25) audio.currentTime = lastAllowedTime;
    });
    audio.addEventListener("seeked", () => {
      resetTimedListeningCaptionAnchor(audio.dataset.prefix || "single", audio);
      sync({ restart: true });
    });
    audio.addEventListener("loadedmetadata", () => {
      lastAllowedTime = Number(audio.currentTime || 0);
      setListeningPlaybackStatus(audio, "ready", "Ready to play");
      sync({ restart: false });
    });
    audio.addEventListener("error", () => setListeningPlaybackStatus(audio, "failed", "Playback failed"));
    audio.addEventListener("ended", () => {
      const prefix = audio.dataset.prefix || "single";
      const section = audio.dataset.section || "";
      stopTimedListeningCaptionLoop(prefix, section);
      setListeningCaption(prefix, section, "Section finished.", section ? `Section ${section}` : "Cached captions");
      handleListeningAnswerReviewTransition(prefix, section);
      if (!advanceListeningExamSection(audio)) setListeningPlaybackStatus(audio, "finished", "Finished");
    });
    audio.addEventListener("timeupdate", () => {
      if (!audio.seeking) lastAllowedTime = Number(audio.currentTime || 0);
    });
  });
}

function bindListeningPlaybackControls() {
  document.querySelectorAll("[data-listening-start]").forEach((button) => {
    button.onclick = async () => {
      const prefix = button.dataset.prefix || "single";
      const section = button.dataset.section || "";
      const selector = `.listening-player[data-prefix="${prefix}"]${section ? `[data-section="${section}"]` : ""}`;
      const audio = document.querySelector(selector) || document.querySelector(`.listening-player[data-prefix="${prefix}"]`);
      if (!audio) {
        const status = button.closest("[data-listening-status]")?.querySelector("[data-listening-state]");
        if (status) status.textContent = "Playback failed";
        return;
      }
      document.querySelectorAll(`.listening-player[data-prefix="${prefix}"]`).forEach((other) => {
        if (other !== audio && !other.paused) other.pause();
      });
      setListeningPlaybackStatus(audio, audio.readyState >= 3 ? "ready" : "loading", audio.readyState >= 3 ? "Ready to play" : "Loading");
      try {
        if (audio.readyState === 0) audio.load();
        if (prefix === "single" && state.activeModule === "listening" && !state.singleTimerId) startSingleTimer();
        await audio.play();
      } catch {
        if (prefix === "single" && state.activeModule === "listening" && state.singleTimerId) stopSingleTimer();
        setListeningPlaybackStatus(audio, "failed", "Playback failed");
      }
    };
  });
  document.querySelectorAll(".listening-study .answer-input[data-prefix]").forEach((input) => {
    input.addEventListener("input", () => {
      const prefix = input.dataset.prefix || "single";
      updateListeningProgress(prefix);
      if (prefix === "single") {
        saveSingleAnswersToState();
        savePracticeSession();
      }
    });
  });
  document.querySelectorAll(".listening-caption-toggle[data-prefix]").forEach((button) => {
    const rule = listeningPlaybackRule(listeningModeForPrefix(button.dataset.prefix || "single"));
    if (!rule.captions) {
      button.disabled = true;
      button.title = "Captions are disabled in Exam mode.";
    }
  });
}

function updateReadingAnswerState(input) {
  const row = input?.closest?.(".paper-answer-row");
  if (!row) return;
  const answered = Boolean(String(input.value || "").trim());
  row.classList.toggle("answered", answered);
  const status = row.querySelector(".reading-answer-state");
  if (status) status.textContent = answered ? "Answered" : "Unanswered";
  const number = row.dataset.questionNumber;
  const nav = document.querySelector(`[data-reading-question-nav="${number}"]`);
  nav?.classList.toggle("answered", answered);
}

function setReadingCurrentQuestion(workspace, number, scrollNav = true) {
  if (!workspace || !number) return;
  workspace.dataset.focusedQuestion = String(number);
  workspace.querySelectorAll("[data-reading-question-nav]").forEach((button) => {
    const current = String(button.dataset.readingQuestionNav) === String(number);
    button.classList.toggle("current", current);
    if (current) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
  if (!scrollNav) return;
  const nav = workspace.querySelector(".reading-question-nav");
  const currentButton = nav?.querySelector(`[data-reading-question-nav="${number}"]`);
  if (nav && currentButton) {
    const left = currentButton.offsetLeft - Math.max(8, (nav.clientWidth - currentButton.offsetWidth) / 2);
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }
}

function clearReadingEvidenceHighlight(workspace = document.querySelector(".reading-mobile-workspace")) {
  workspace?.querySelectorAll("[data-reading-evidence-highlight]").forEach((node) => node.remove());
  workspace?.querySelectorAll(".reading-evidence-page-active").forEach((node) => node.classList.remove("reading-evidence-page-active"));
}

function focusReadingEvidence(evidence, { closeCoach = false } = {}) {
  const page = Number(evidence?.page || 0);
  const workspace = document.querySelector(".reading-mobile-workspace");
  const passagePane = workspace?.querySelector(".reading-passage-pane");
  const pageNode = page ? passagePane?.querySelector(`[data-pdf-page="${page}"]`) : null;
  const pageBody = pageNode?.querySelector(".pdf-page-image-wrap, .pdf-page-body");
  if (!workspace || !passagePane || !pageNode || !pageBody) return false;

  clearReadingEvidenceHighlight(workspace);
  state.readingMobilePane = "passage";
  workspace.dataset.readingPane = "passage";
  workspace.querySelectorAll("[data-reading-pane-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.readingPaneTarget === "passage");
  });
  pageNode.classList.add("reading-evidence-page-active");
  const rect = evidence.rect && ["left", "top", "width", "height"].every((key) => Number.isFinite(Number(evidence.rect[key])))
    ? evidence.rect
    : null;
  if (rect) {
    const left = Math.max(0, Math.min(100, Number(rect.left)));
    const top = Math.max(0, Math.min(100, Number(rect.top)));
    const width = Math.max(0, Math.min(100 - left, Number(rect.width)));
    const height = Math.max(0, Math.min(100 - top, Number(rect.height)));
    const highlight = document.createElement("div");
    highlight.className = "reading-evidence-highlight";
    highlight.dataset.readingEvidenceHighlight = "true";
    highlight.setAttribute("role", "mark");
    highlight.setAttribute("aria-label", `Highlighted evidence on page ${page}`);
    highlight.title = evidence.quote || "AI Coach evidence";
    highlight.style.left = `${left}%`;
    highlight.style.top = `${top}%`;
    highlight.style.width = `${width}%`;
    highlight.style.height = `${height}%`;
    pageBody.appendChild(highlight);
  }

  passagePane.dataset.pendingPdfPage = String(page);
  const syncEvidence = () => {
    const paneRect = passagePane.getBoundingClientRect();
    const bodyRect = pageBody.getBoundingClientRect();
    const targetTop = bodyRect.top + (rect ? (bodyRect.height * Number(rect.top)) / 100 : 0);
    const nextTop = Math.max(
      0,
      passagePane.scrollTop + targetTop - paneRect.top - Math.max(24, passagePane.clientHeight * 0.28),
    );
    const boundedTop = Math.min(nextTop, Math.max(0, passagePane.scrollHeight - passagePane.clientHeight));
    passagePane.scrollTo({ top: boundedTop, behavior: "smooth" });
    state.readingPaneScroll.passage = boundedTop;
    delete passagePane.dataset.pendingPdfPage;
  };
  requestAnimationFrame(syncEvidence);
  const image = pageBody.querySelector("img");
  if (image && !image.complete) image.addEventListener("load", syncEvidence, { once: true });
  if (closeCoach) closeHelpPanel();
  return true;
}

function appendReadingEvidenceAction(messageNode, evidence) {
  if (!messageNode || !evidence?.page) return;
  const action = document.createElement("button");
  action.type = "button";
  action.className = "reading-evidence-jump";
  action.textContent = "Open highlight";
  action.addEventListener("click", () => focusReadingEvidence(evidence, { closeCoach: true }));
  messageNode.appendChild(action);
}

function focusReadingQuestion(number) {
  const workspace = document.querySelector(".reading-mobile-workspace");
  if (!workspace) return;
  state.readingMobilePane = "questions";
  workspace.dataset.readingPane = "questions";
  setReadingCurrentQuestion(workspace, number);
  const questionPane = workspace.querySelector(".reading-question-pane");
  workspace.querySelectorAll("[data-reading-pane-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.readingPaneTarget === "questions");
  });
  const target = workspace.querySelector(`.paper-answer-row[data-question-number="${number}"]`);
  const answerScroll = target?.closest(".paper-answer-scroll");
  if (target && answerScroll) {
    const nextTop = target.offsetTop - Math.max(12, (answerScroll.clientHeight - target.offsetHeight) / 2);
    answerScroll.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  }
  const questionPage = target?.dataset.questionPage;
  const passagePage = target?.dataset.readingPassagePage;
  const passagePane = workspace.querySelector(".reading-passage-pane");
  const passagePageNode = passagePage ? passagePane?.querySelector(`[data-pdf-page="${passagePage}"]`) : null;
  if (passagePageNode && passagePane) {
    passagePane.dataset.pendingPdfPage = passagePage;
    const syncPassagePage = () => {
      const passageTop = Math.max(0, passagePageNode.offsetTop - 8);
      state.readingPaneScroll.passage = passageTop;
      if (passagePane.getClientRects().length) passagePane.scrollTo({ top: passageTop, behavior: "auto" });
    };
    syncPassagePage();
    const passageImage = passagePageNode.querySelector("img");
    if (passageImage && !passageImage.complete) passageImage.addEventListener("load", syncPassagePage, { once: true });
  }
  const questionPaper = workspace.querySelector(".reading-question-paper");
  const questionPageNode = questionPage ? questionPaper?.querySelector(`[data-pdf-page="${questionPage}"]`) : null;
  if (questionPageNode && questionPaper) {
    const syncQuestionPage = () => {
      const questionTop = Math.max(0, questionPageNode.offsetTop - 8);
      state.readingPaneScroll.questionPaper = questionTop;
      questionPaper.scrollTo({ top: questionTop, behavior: "auto" });
    };
    syncQuestionPage();
    const questionImage = questionPageNode.querySelector("img");
    if (questionImage && !questionImage.complete) questionImage.addEventListener("load", syncQuestionPage, { once: true });
  }
  target?.querySelector("input")?.focus({ preventScroll: true });
  if (answerScroll) {
    requestAnimationFrame(() => {
      const rect = answerScroll.getBoundingClientRect();
      const headerBottom = document.querySelector("#single > .view-head")?.getBoundingClientRect().bottom || 0;
      const visibleTop = Math.max(8, headerBottom + 8);
      const visibleBottom = window.innerHeight - 12;
      const delta = rect.bottom > visibleBottom
        ? rect.bottom - visibleBottom
        : rect.top < visibleTop
          ? rect.top - visibleTop
          : 0;
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "smooth" });
    });
  }
  savePracticeSession();
}

async function runReadingHint(button) {
  const qid = button.dataset.readingHint || "";
  const context = currentReadingContext();
  const question = context?.questions?.find((item) => item.id === qid);
  const step = Math.max(1, Math.min(4, Number(button.dataset.hintStep) || 1));
  state.coach.focusQuestion = question ? { module: "reading", ...question } : { module: "reading", id: qid };
  const prompts = [
    `For ${qid}, give only Hint 1. First state the exact location as \"位置：第X段，第Y句\" using the indexed passage context, then quote the complete evidence sentence exactly and give a short locating clue. Do not reveal the answer. If the location cannot be verified, say \"位置：暂无法确认\" instead of guessing.`,
    `For ${qid}, give Hint 2. First state \"位置：第X段，第Y句\", then quote or identify the key evidence sentence and its keywords. Do not reveal the answer.`,
    `For ${qid}, give Hint 3. Keep \"位置：第X段，第Y句\" on the first line, then explain the paraphrase or reasoning needed. Do not reveal the final answer.`,
    `For ${qid}, first state \"位置：第X段，第Y句\", then explain the evidence chain and why the correct answer follows.${currentSinglePracticeMode("reading") === "full" ? " I am still in exam practice, so check my reasoning without directly revealing the answer." : " You may show the answer after the reasoning."}`,
  ];
  if (question?.number) focusReadingQuestion(question.number);
  openGlobalCoachPanel();
  const next = Math.min(4, step + 1);
  button.dataset.hintStep = String(next);
  button.textContent = step >= 4 ? "Explain" : `Hint ${next}`;
  refreshGlobalCoachPanelIfOpen();
  button.disabled = true;
  try {
    await sendHelpChatMessage(prompts[step - 1]);
  } finally {
    button.disabled = false;
  }
}

function bindReadingWorkspaceControls() {
  document.querySelectorAll("[data-reading-question-nav]").forEach((button) => {
    button.onclick = () => focusReadingQuestion(button.dataset.readingQuestionNav);
  });
  document.querySelectorAll("[data-reading-mark]").forEach((button) => {
    button.onclick = () => {
      const qid = button.dataset.readingMark || "";
      const next = !state.readingReviewMarks?.[qid];
      state.readingReviewMarks[qid] = next;
      button.classList.toggle("active", next);
      button.setAttribute("aria-pressed", next ? "true" : "false");
      button.textContent = next ? "Marked" : "Mark";
      button.closest(".paper-answer-row")?.classList.toggle("marked-review", next);
      const number = button.closest(".paper-answer-row")?.dataset.questionNumber;
      document.querySelector(`[data-reading-question-nav="${number}"]`)?.classList.toggle("marked", next);
      savePracticeSession();
    };
  });
  document.querySelectorAll("[data-reading-hint]").forEach((button) => {
    button.onclick = () => runReadingHint(button);
  });
  document.querySelectorAll('.answer-input[data-prefix="single"]').forEach((input) => {
    updateReadingAnswerState(input);
    input.addEventListener("input", () => {
      updateReadingAnswerState(input);
      saveSingleAnswersToState();
      savePracticeSession();
    });
    input.addEventListener("focus", () => {
      const qid = input.dataset.qid;
      const context = currentReadingContext();
      const question = context?.questions?.find((item) => item.id === qid);
      if (question) state.coach.focusQuestion = { module: "reading", ...question };
      const workspace = input.closest(".reading-mobile-workspace");
      if (workspace) setReadingCurrentQuestion(workspace, question?.number || input.closest(".paper-answer-row")?.dataset.questionNumber || "");
      refreshGlobalCoachPanelIfOpen();
    });
  });
  document.querySelectorAll(".reading-mobile-workspace").forEach((workspace) => {
    setReadingCurrentQuestion(workspace, workspace.dataset.focusedQuestion || "1", false);
  });
  document.querySelectorAll("[data-reading-scroll-pane]").forEach((pane) => {
    const key = pane.dataset.readingScrollPane;
    pane.scrollTop = Number(state.readingPaneScroll?.[key]) || 0;
    pane.addEventListener("scroll", () => {
      state.readingPaneScroll[key] = pane.scrollTop;
      schedulePracticeSessionSave();
    }, { passive: true });
  });
  document.querySelectorAll(".reading-split-divider").forEach((divider) => {
    divider.onpointerdown = (event) => {
      const split = divider.parentElement;
      if (!split || window.matchMedia("(max-width: 820px) and (orientation: portrait)").matches) return;
      divider.setPointerCapture?.(event.pointerId);
      const move = (moveEvent) => {
        const rect = split.getBoundingClientRect();
        const percent = Math.max(40, Math.min(72, ((moveEvent.clientX - rect.left) / rect.width) * 100));
        split.style.setProperty("--reading-passage-width", `${percent}%`);
      };
      const end = () => {
        divider.removeEventListener("pointermove", move);
        divider.removeEventListener("pointerup", end);
        divider.removeEventListener("pointercancel", end);
      };
      divider.addEventListener("pointermove", move);
      divider.addEventListener("pointerup", end);
      divider.addEventListener("pointercancel", end);
    };
  });
}

function bindDynamicControls() {
  bindHelpControls();
  bindPdfAnnotations();
  bindListeningCaptionPlayers();
  bindListeningPlaybackControls();
  bindReadingWorkspaceControls();
  bindWritingTaskTabs();
  document.querySelectorAll(".back-submit-button").forEach((button) => {
    button.onclick = () => backAndScrollToSubmit(button.dataset.submitTarget || "");
  });
  document.querySelectorAll(".inline-sidebar-toggle").forEach((button) => {
    button.onclick = () => {
      localStorage.setItem(sidebarStoreKey, "false");
      applySidebarState(false);
    };
  });
  document.querySelectorAll(".start-single-practice").forEach((button) => {
    button.onclick = () => startSinglePractice(button.dataset.singleStart || "recommended");
  });
  document.querySelectorAll("[data-single-scope]").forEach((button) => {
    button.onclick = () => {
      if (!["listening", "reading"].includes(state.activeModule)) return;
      saveSingleAnswersToState();
      setSinglePracticeScope(state.activeModule, button.dataset.singleScope || "paper");
      state.objectiveTopicSelection[state.activeModule] = "";
      state.activeSingle = null;
      state.singleStarted = false;
      renderSingle();
    };
  });
  document.querySelectorAll("[data-objective-topic-open]").forEach((button) => {
    button.onclick = () => {
      if (!["listening", "reading"].includes(state.activeModule)) return;
      state.objectiveTopicSelection[state.activeModule] = button.dataset.objectiveTopicOpen || "";
      renderSingle();
    };
  });
  document.querySelectorAll("[data-objective-topic-back]").forEach((button) => {
    button.onclick = () => {
      if (!["listening", "reading"].includes(state.activeModule)) return;
      state.objectiveTopicSelection[state.activeModule] = "";
      renderSingle();
    };
  });
  document.querySelectorAll("[data-start-practice-unit]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.startPracticeUnit || "";
      const item = singleOptions(state.activeModule).find((candidate) => candidate.id === id) || findItemById(state.activeModule, id);
      beginSinglePracticeUnit(item);
    };
  });
  document.querySelectorAll("[data-single-section]").forEach((button) => {
    button.onclick = () => {
      const moduleName = button.dataset.module || state.activeModule;
      const section = Number(button.dataset.singleSection);
      if (!["listening", "reading"].includes(moduleName) || !Number.isFinite(section)) return;
      saveSingleAnswersToState();
      state.singlePracticeSections[moduleName] = section;
      resetSingleTimer(moduleName);
      renderSingle();
      setSingleImmersive(moduleName);
      savePracticeSession();
    };
  });
  document.querySelectorAll("[data-review-empty-action]").forEach((button) => {
    button.onclick = () => {
      state.singlePracticeModes[state.activeModule] = button.dataset.reviewEmptyAction || (state.activeModule === "listening" ? "training" : "full");
      resetSingleTimer(state.activeModule);
      renderSingle();
      setSingleImmersive(state.activeModule);
    };
  });
  document.querySelectorAll("[data-reading-pane-target]").forEach((button) => {
    button.onclick = () => {
      const pane = button.dataset.readingPaneTarget || "passage";
      const workspace = button.closest(".reading-mobile-workspace");
      const previousPane = workspace?.dataset.readingPane || state.readingMobilePane;
      const previousContent = workspace?.querySelector(`[data-reading-scroll-pane="${previousPane}"]`);
      if (previousContent) state.readingPaneScroll[previousPane] = previousContent.scrollTop;
      state.readingMobilePane = pane;
      if (workspace) workspace.dataset.readingPane = pane;
      workspace?.querySelectorAll("[data-reading-pane-target]").forEach((item) => item.classList.toggle("active", item.dataset.readingPaneTarget === pane));
      const nextContent = workspace?.querySelector(`[data-reading-scroll-pane="${pane}"]`);
      if (nextContent) requestAnimationFrame(() => {
        const pendingPage = pane === "passage" ? nextContent.dataset.pendingPdfPage : "";
        const pendingNode = pendingPage ? nextContent.querySelector(`[data-pdf-page="${pendingPage}"]`) : null;
        const nextTop = pendingNode ? Math.max(0, pendingNode.offsetTop - 8) : Number(state.readingPaneScroll[pane]) || 0;
        nextContent.scrollTop = nextTop;
        state.readingPaneScroll[pane] = nextTop;
        if (pendingPage) delete nextContent.dataset.pendingPdfPage;
      });
      savePracticeSession();
    };
  });
  const readingQuestionType = $("readingQuestionType");
  if (readingQuestionType) {
    readingQuestionType.onchange = () => {
      saveSingleAnswersToState();
      state.readingQuestionType = readingQuestionType.value;
      renderSingle();
      setSingleImmersive("reading");
      savePracticeSession();
    };
  }
  document.querySelectorAll("input[name='singlePracticeMode']").forEach((input) => {
    input.onchange = () => {
      state.singlePracticeModes[state.activeModule] = input.value;
      document.querySelectorAll(".single-mode-option").forEach((item) => {
        item.classList.toggle("active", item.querySelector("input")?.checked);
      });
      savePracticeSession();
    };
  });
  const stickyTimerToggle = $("examStickyTimerToggle");
  if (stickyTimerToggle) stickyTimerToggle.onclick = () => (state.examTimerId ? stopExamTimer() : startExamTimer());
  const stickyTimerReset = $("examStickyTimerReset");
  if (stickyTimerReset) {
    stickyTimerReset.onclick = () => {
      state.examSeconds = state.examTotal;
      stopExamTimer();
    };
  }
  const sequenceStickyTimerToggle = $("sequenceStickyTimerToggle");
  if (sequenceStickyTimerToggle) sequenceStickyTimerToggle.onclick = () => (state.sequenceTimerId ? stopSequenceTimer() : startSequenceTimer());
  const sequenceStickyTimerReset = $("sequenceStickyTimerReset");
  if (sequenceStickyTimerReset) sequenceStickyTimerReset.onclick = resetSequenceTimer;
  document.querySelectorAll(".exam-quick-nav a[data-focus-module]").forEach((link) => {
    link.onclick = (event) => {
      event.preventDefault();
      const targetId = link.getAttribute("href")?.replace("#", "") || "";
      setImmersivePractice(link.dataset.focusModule, targetId);
      history.replaceState(null, "", `#${targetId}`);
      scrollToExamSection(targetId);
    };
  });
  document.querySelectorAll(".play-audio").forEach((button) => {
    button.onclick = () => playTranscript(decodeURIComponent(button.dataset.text || ""));
  });
  document.querySelectorAll(".play-source-audio").forEach((button) => {
    button.onclick = () => {
      if (button.dataset.prefix && button.dataset.section) {
        highlightListeningScriptPart(button.dataset.prefix, button.dataset.section);
      }
      playAudioUrl(button.dataset.url);
    };
  });
  document.querySelectorAll(".reveal-transcript").forEach((button) => {
    button.onclick = () => $(button.dataset.target).classList.toggle("show");
  });
  document.querySelectorAll(".listening-caption-toggle").forEach((button) => {
    button.onclick = () => toggleListeningCaptions(button);
  });
  document.querySelectorAll("textarea[id$='writing']").forEach((textarea) => {
    textarea.oninput = () => {
      const wordNode = $(`${textarea.id.replace("-writing", "")}-words`);
      if (wordNode) wordNode.textContent = countWords(textarea.value);
      if (textarea.closest("#single")) {
        state.practiceWritingDrafts[textarea.id] = textarea.value;
        schedulePracticeSessionSave();
      }
    };
  });
  document.querySelectorAll(".speech-btn").forEach((button) => {
    button.onclick = () => startSpeech(button.dataset.target);
  });
  document.querySelectorAll(".start-qwen-speaking").forEach((button) => {
    button.onclick = () => startQwenSpeaking(button.dataset.prefix);
  });
  document.querySelectorAll(".qwen-mic-toggle").forEach((button) => {
    button.onclick = () => toggleQwenMic(button.dataset.prefix);
  });
  document.querySelectorAll(".qwen-commit-answer").forEach((button) => {
    button.onclick = () => commitQwenAnswer(button.dataset.prefix);
  });
  document.querySelectorAll(".qwen-finish-score").forEach((button) => {
    button.onclick = () => finishQwenSpeaking(button.dataset.prefix);
  });
  document.querySelectorAll(".qwen-disconnect").forEach((button) => {
    button.onclick = () => requestQwenDisconnect(button.dataset.prefix);
  });
  document.querySelectorAll(".score-speaking-text").forEach((button) => {
    button.onclick = () => scoreSpeakingText(button.dataset.prefix, button.dataset.topic);
  });
  document.querySelectorAll(".view.active textarea, .view.active input.answer-input, .view.active input.paper-answer-input, .view.active input.page-card-input, .view.active input.band-input").forEach((field) => {
    if (field.dataset.draftBound === "1") return;
    field.dataset.draftBound = "1";
    field.addEventListener("input", scheduleDraftAutosave);
  });
}

function loadBank() {
  try {
    state.userBank = JSON.parse(localStorage.getItem(storeKey) || "[]");
  } catch {
    state.userBank = [];
  }
}

function saveBank() {
  localStorage.setItem(storeKey, JSON.stringify(state.userBank));
  renderBankList();
}

function readLikedTopicIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(likedTopicStoreKey) || "[]");
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLikedTopicIds(ids) {
  localStorage.setItem(likedTopicStoreKey, JSON.stringify([...new Set(ids.filter(Boolean))].slice(0, 500)));
}

function isTopicLiked(id) {
  return readLikedTopicIds().includes(id);
}

function toggleLikedTopic(id) {
  if (!id) return;
  const ids = readLikedTopicIds();
  const next = ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids];
  writeLikedTopicIds(next);
  renderBankList();
  if ($("mine")?.classList.contains("active")) renderMine();
}

function getSpeakingTopicItems() {
  return mergedItems("speaking").map(normalizeItem);
}

function speakingTopicGroupId(title, category) {
  return `speaking-topic-group-${slugifyPublicTopic(`${category || "topic"}-${title || "speaking"}`) || "speaking"}`;
}

function speakingTopicGroupKey(item) {
  const keywords = speakingTopicKeywords(item);
  const title = speakingTopicTitle(item, keywords);
  return `${speakingTopicCategory(item)}:${title}`.toLowerCase();
}

function speakingSetSourceLabel(item) {
  if (isPublicSpeakingTopic(item)) {
    return item.period === "Student upload" ? "Public · Student upload" : "Public topic";
  }
  return [
    itemBook(item) ? `Cambridge ${itemBook(item)}` : item.source,
    itemTest(item) ? `Test ${itemTest(item)}` : "",
  ].filter(Boolean).join(" · ") || "Cambridge speaking";
}

function speakingSetPreview(item) {
  const part1 = item.part1Topic
    ? `Part 1: ${item.part1Topic}`
    : Array.isArray(item.part1) && item.part1[0]
      ? `Part 1: ${item.part1[0]}`
      : "";
  const part2 = item.part2 ? `Part 2: ${compactDialogueText(item.part2).slice(0, 150)}` : "";
  const part3 = item.part3Topics
    ? `Part 3: ${Array.isArray(item.part3Topics) ? item.part3Topics.join(", ") : item.part3Topics}`
    : "";
  return [part1, part2, part3].filter(Boolean).join(" · ");
}

function sortSpeakingTopicSets(items) {
  return [...items].sort((a, b) => {
    const sourceA = isPublicSpeakingTopic(a) ? 1 : 0;
    const sourceB = isPublicSpeakingTopic(b) ? 1 : 0;
    if (sourceA !== sourceB) return sourceA - sourceB;
    const bookA = itemBook(a) || 999;
    const bookB = itemBook(b) || 999;
    if (bookA !== bookB) return bookA - bookB;
    const testA = itemTest(a) || 999;
    const testB = itemTest(b) || 999;
    if (testA !== testB) return testA - testB;
    return String(a.title || "").localeCompare(String(b.title || ""), undefined, { numeric: true });
  });
}

function buildSpeakingTopicGroups(items) {
  const groups = new Map();
  items.forEach((item, index) => {
    const keywords = speakingTopicKeywords(item);
    const title = speakingTopicTitle(item, keywords);
    const category = speakingTopicCategory(item);
    const key = `${category}:${title}`.toLowerCase();
    if (!groups.has(key)) {
      const related = relatedTopicKeywords(item, title, keywords).slice(0, 3);
      groups.set(key, {
        id: speakingTopicGroupId(title, category),
        key,
        title,
        emoji: speakingTopicEmoji(item, title),
        category,
        accent: speakingTopicAccent(item),
        related,
        items: [],
        firstIndex: index,
      });
    }
    const group = groups.get(key);
    group.items.push(item);
    const searchText = speakingTopicSearchText(item);
    group.searchText = [group.searchText, searchText].filter(Boolean).join(" ");
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: sortSpeakingTopicSets(group.items),
      sources: [...new Set(group.items.map((item) => (isPublicSpeakingTopic(item) ? "Public" : "Cambridge")))],
    }))
    .sort((a, b) => a.firstIndex - b.firstIndex || a.title.localeCompare(b.title, undefined, { numeric: true }));
}

function findSpeakingTopicGroupById(groupId, items = getSpeakingTopicItems()) {
  return buildSpeakingTopicGroups(items).find((group) => group.id === groupId) || null;
}

function isSpeakingTopicGroupLiked(group, likedIds = new Set(readLikedTopicIds())) {
  return Boolean(group?.items?.some((item) => likedIds.has(item.id)));
}

function toggleLikedTopicGroup(groupId) {
  const group = findSpeakingTopicGroupById(groupId);
  if (!group) return;
  const current = readLikedTopicIds();
  const currentSet = new Set(current);
  const groupIds = group.items.map((item) => item.id).filter(Boolean);
  const shouldUnlike = groupIds.some((id) => currentSet.has(id));
  const next = shouldUnlike
    ? current.filter((id) => !groupIds.includes(id))
    : [...groupIds, ...current];
  writeLikedTopicIds(next);
  renderBankList();
  if ($("mine")?.classList.contains("active")) renderMine();
}

function likedSpeakingTopicGroups() {
  const ids = readLikedTopicIds();
  if (!ids.length) return [];
  const likedIds = new Set(ids);
  return buildSpeakingTopicGroups(getSpeakingTopicItems().filter((item) => likedIds.has(item.id)));
}

function likedSpeakingTopics() {
  return likedSpeakingTopicGroups().map((group) => group.items[0]).filter(Boolean);
}

function speakingTopicSummary(item) {
  const parts = [];
  if (item.part1Topic) parts.push(`Part 1: ${item.part1Topic}`);
  if (item.part2) parts.push(`Part 2: ${compactDialogueText(item.part2).slice(0, 170)}`);
  if (item.part3Topics) parts.push(`Part 3: ${Array.isArray(item.part3Topics) ? item.part3Topics.join(", ") : item.part3Topics}`);
  return parts.filter(Boolean).join(" · ");
}

function speakingTopicKeywords(item) {
  const raw = [
    item.topicKeywords,
    item.keywords,
    item.part1Topic,
    item.title,
    Array.isArray(item.part3Topics) ? item.part3Topics.join(" ") : item.part3Topics,
  ].filter(Boolean).join(" ");
  const stop = new Set([
    "ielts", "speaking", "part", "test", "topic", "practice", "cambridge", "academic", "general", "questions", "question",
    "and", "the", "your", "you", "that", "this", "these", "those", "with", "without", "where", "what", "when", "why",
    "how", "who", "whose", "which", "about", "after", "before", "into", "from", "have", "has", "had", "are", "was",
    "were", "will", "would", "could", "should", "does", "did", "doing", "done", "someone", "something", "anything",
  ]);
  const words = String(raw || "")
    .toLowerCase()
    .replace(/cambridge\s*\d+/g, " ")
    .replace(/test\s*\d+/g, " ")
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stop.has(word));
  const seen = new Set();
  const keywords = words.filter((word) => {
    if (seen.has(word)) return false;
    seen.add(word);
    return true;
  });
  return keywords.slice(0, 6);
}

function explicitTopicKeywords(item) {
  const rawValues = [item.topicKeywords, item.keywords].filter(Boolean);
  const values = rawValues.flatMap((value) => {
    if (Array.isArray(value)) return value;
    return String(value).split(/[,，;]+/);
  });
  const seen = new Set();
  return values
    .map((value) => compactDialogueText(value).toLowerCase())
    .filter((value) => value && value.length >= 2)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function speakingTopicSearchText(item) {
  return [
    item.title,
    item.source,
    item.period,
    item.topicKeywords,
    item.part1Topic,
    item.part2,
    Array.isArray(item.part1) ? item.part1.join(" ") : item.part1,
    Array.isArray(item.part3) ? item.part3.join(" ") : item.part3,
    Array.isArray(item.part3Topics) ? item.part3Topics.join(" ") : item.part3Topics,
  ].filter(Boolean).join(" ").toLowerCase();
}

function renderSpeakingTopicFilters(items) {
  const select = $("bankTopicBook");
  if (!select) return;
  const current = select.value || "all";
  const books = [...new Set(items.filter((item) => !isPublicSpeakingTopic(item)).map(itemBook).filter((value) => value !== null && value !== undefined))]
    .sort((a, b) => Number(a) - Number(b));
  select.innerHTML = [
    `<option value="all">All sources</option>`,
    `<option value="public">Public topics</option>`,
    ...books.map((book) => `<option value="${escapeHtml(book)}">Cambridge ${escapeHtml(book)}</option>`),
  ].join("");
  select.value = current === "public" || books.map(String).includes(current) ? current : "all";
}

function isPublicSpeakingTopic(item) {
  return item?.source === "Public topics" || String(item?.id || "").startsWith("public-speaking-");
}

function speakingTopicCategory(item) {
  return deriveSpeakingTopicMeta(item).category || "lifestyle";
}

function speakingTopicTitle(item, keywords = []) {
  return deriveSpeakingTopicMeta(item).title || publicTopicOneWord(item.part1Topic || item.title || keywords[0] || "Speaking");
}

function relatedTopicKeywords(item, title, keywords = []) {
  const main = String(title || "").toLowerCase();
  const meta = deriveSpeakingTopicMeta(item);
  if (Array.isArray(meta.related) && meta.related.length) return meta.related.slice(0, 3);
  const explicit = explicitTopicKeywords(item);
  const source = explicit.length ? explicit : (keywords.length ? keywords : speakingTopicKeywords(item));
  const filtered = source.filter((keyword) => {
    const clean = String(keyword || "").toLowerCase();
    return clean && clean !== main && !main.includes(clean) && !clean.includes(main);
  });
  return (filtered.length ? filtered : source).slice(0, 3);
}

function speakingTopicAccent(item) {
  const category = speakingTopicCategory(item);
  const map = {
    people: "people",
    place: "place",
    lifestyle: "lifestyle",
    education: "education",
    technology: "technology",
    media: "media",
    nature: "nature",
    work: "work",
    society: "society",
  };
  return map[category] || "lifestyle";
}

function speakingTopicInitial(title) {
  const match = String(title || "").match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : "S";
}

function speakingTopicEmoji(item, title = "") {
  return deriveSpeakingTopicMeta(item).emoji || item.emoji || "✨";
}

function renderBankPracticeWorkspace(topic, mode = "exam", practiceScope = "full") {
  const root = $("bankPracticePanel");
  if (!root || !topic) return;
  setUnifiedPracticeStage("speaking", "practice", { mode, selectionId: topic.id || "" });
  state.activeSpeakingTopic = topic;
  disconnectQwenSpeaking("bank");
  const source = topic.source === "Public topics"
    ? "Public topics"
    : [itemBook(topic) ? `Cambridge ${itemBook(topic)}` : topic.source, itemTest(topic) ? `Test ${itemTest(topic)}` : ""].filter(Boolean).join(" · ");
  root.hidden = false;
  root.closest(".panel")?.classList.add("bank-practice-active");
  root.innerHTML = `<div class="bank-practice-shell">
    <header class="bank-practice-head">
      <div>
        <span>${escapeHtml(source || "Speaking topic")}</span>
        <h3>${escapeHtml(topic.title || "Speaking with AI")}</h3>
      </div>
      <button id="closeBankPractice" class="secondary small-button" type="button">Back to topics</button>
    </header>
    <div class="bank-practice-grid speaking-practice-workspace">
      <aside class="bank-practice-chat">
        ${renderRealtimeSpeakingPanel(topic, "bank", { showTranscript: mode === "coach", mode, practiceScope })}
      </aside>
    </div>
    <section class="bank-practice-result">
      <div class="panel-head">
        <h3>Speaking Result</h3>
        <span id="bankMode" class="mode-pill"></span>
      </div>
      <div id="bankFeedback" class="feedback-output empty">Complete the speaking test to see your result.</div>
    </section>
  </div>`;
  bindDynamicControls();
  $("closeBankPractice")?.addEventListener("click", () => {
    disconnectQwenSpeaking("bank");
    root.closest(".panel")?.classList.remove("bank-practice-active");
    root.hidden = true;
    root.innerHTML = "";
  });
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderBankPracticeTopic(topic) {
  const root = $("bankPracticePanel");
  if (!root || !topic) return;
  setUnifiedPracticeStage("speaking", "setup", { selectionId: topic.id || "" });
  state.activeSpeakingTopic = topic;
  disconnectQwenSpeaking("bank");
  const keywords = speakingTopicKeywords(topic);
  const title = speakingTopicTitle(topic, keywords);
  const source = topic.source === "Public topics"
    ? "Public topics"
    : [itemBook(topic) ? `Cambridge ${itemBook(topic)}` : topic.source, itemTest(topic) ? `Test ${itemTest(topic)}` : ""].filter(Boolean).join(" · ");
  root.hidden = false;
  root.closest(".panel")?.classList.add("bank-practice-active");
  root.innerHTML = unifiedPracticeSetupHtml("speaking", {
    title: title || "Speaking with AI",
    source: source || "Speaking topic",
    detail: "Choose Exam for a realistic test or Coach for post-answer hints. Full cue cards appear only when Part 2 begins.",
    deviceCheck: true,
  });
  const scopeSelector = `<fieldset class="speaking-part-selector" data-speaking-practice-scope>
    <legend>Practice scope</legend>
    ${[
      ["full", "Full test", "15 min"],
      ["part1", "Part 1", "5 min"],
      ["part2", "Part 2", "3 min"],
      ["part3", "Part 3", "5 min"],
    ].map(([value, label, time], index) => `<label class="speaking-part-option${index === 0 ? " active" : ""}"><input type="radio" name="speakingPracticeScope" value="${value}" ${index === 0 ? "checked" : ""}><strong>${label}</strong><span>${time}</span></label>`).join("")}
  </fieldset>`;
  root.querySelector(".unified-practice-setup")?.insertAdjacentHTML("beforeend", scopeSelector);
  root.querySelectorAll('input[name="speakingPracticeScope"]').forEach((input) => {
    input.addEventListener("change", () => {
      root.querySelectorAll(".speaking-part-option").forEach((option) => option.classList.toggle("active", option.contains(input) && input.checked));
    });
  });
  bindUnifiedSetup(root, {
    deviceCheck: true,
    onBack: () => {
      root.closest(".panel")?.classList.remove("bank-practice-active");
      root.hidden = true;
      root.innerHTML = "";
    },
    onStart: (mode) => {
      state.speakingSetupMode = mode;
      const practiceScope = root.querySelector('input[name="speakingPracticeScope"]:checked')?.value || "full";
      renderBankPracticeWorkspace(topic, mode, practiceScope);
    },
  });
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}

function activateSpeakingTopicFromBank(id) {
  const topic = mergedItems("speaking").map(normalizeItem).find((item) => item.id === id);
  if (!topic) return;
  syncCurrentDraftNow();
  renderBankPracticeTopic(topic);
}

function renderTopicSetChooser(group, completionIndex = readPracticeCompletionIndex()) {
  const root = $("bankPracticePanel");
  if (!root || !group) return;
  disconnectQwenSpeaking("bank");
  const chips = group.related.slice(0, 5).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
  const visibleItems = group.items.filter((item) => practiceCompletionFilterMatches("speaking", item, completionIndex, "bankCompletionFilter"));
  const sourceLabel = group.sources.length > 1 ? "Cambridge + Public" : (group.sources[0] || "Speaking");
  root.hidden = false;
  root.closest(".panel")?.classList.add("bank-practice-active");
  root.innerHTML = `<div class="topic-set-chooser">
    <header class="bank-practice-head topic-set-chooser-head">
      <div class="topic-set-title-row">
        <span class="objective-topic-icon topic-accent-${escapeHtml(group.accent)}" aria-hidden="true">${escapeHtml(group.emoji || "✨")}</span>
        <div>
          <span>${escapeHtml(sourceLabel)} · ${escapeHtml(group.items.length)} ${group.items.length === 1 ? "set" : "sets"}</span>
          <h3>${escapeHtml(group.title)}</h3>
          <div class="topic-keywords">${chips}</div>
        </div>
      </div>
      <button id="closeBankPractice" class="secondary small-button" type="button">Back to topics</button>
    </header>
    <div class="topic-set-list" role="list">
      ${visibleItems.map((item, index) => {
        const source = speakingSetSourceLabel(item);
        const preview = speakingSetPreview(item);
        const setTitle = item.title && !String(item.title).toLowerCase().includes("speaking")
          ? item.title
          : source;
        const completion = practiceCompletionStatus("speaking", item, completionIndex);
        const status = completion.completed ? "completed" : "not-completed";
        return `<article class="topic-set-row" role="listitem" data-practice-status="${status}" data-speaking-topic-id="${escapeHtml(item.id)}">
          <div class="topic-set-index">${index + 1}</div>
          <div class="topic-set-main">
            <div class="topic-set-source">${escapeHtml(source)}</div>
            <h4>${escapeHtml(setTitle)}</h4>
            <p>${escapeHtml(preview || "IELTS Speaking Part 1, Part 2 and Part 3 practice set.")}</p>
            <span class="practice-status-badge ${status}">${practiceCompletionDisplay(completion)}</span>
          </div>
          <button class="primary small-button choose-speaking-set" type="button" data-id="${escapeHtml(item.id)}">Practice</button>
        </article>`;
      }).join("")}
    </div>
  </div>`;
  $("closeBankPractice")?.addEventListener("click", () => {
    root.closest(".panel")?.classList.remove("bank-practice-active");
    root.hidden = true;
    root.innerHTML = "";
  });
  document.querySelectorAll(".choose-speaking-set").forEach((button) => {
    button.onclick = () => activateSpeakingTopicFromBank(button.dataset.id);
  });
  window.lucide?.createIcons?.({ attrs: { "stroke-width": 1.8 } });
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}

function activateSpeakingTopicGroupFromBank(groupId) {
  const group = findSpeakingTopicGroupById(groupId);
  if (!group) return;
  syncCurrentDraftNow();
  renderTopicSetChooser(group, readPracticeCompletionIndex());
}

function renderBankPagination(total, page, pageSize) {
  const root = $("bankPagination");
  if (!root) return;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (!total) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }
  if (totalPages <= 1) {
    root.hidden = false;
    root.innerHTML = `<div class="topic-pagination-summary">Showing ${total} topics</div>`;
    return;
  }
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages));
  const ordered = [...pages].sort((a, b) => a - b);
  const pageButtons = [];
  ordered.forEach((value, index) => {
    if (index && value - ordered[index - 1] > 1) pageButtons.push(`<span class="topic-pagination-gap">…</span>`);
    pageButtons.push(`<button class="topic-page-button${value === page ? " active" : ""}" type="button" data-topic-page="${value}" aria-current="${value === page ? "page" : "false"}">${value}</button>`);
  });
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  root.hidden = false;
  root.innerHTML = `
    <div class="topic-pagination-summary">Showing ${start}-${end} of ${total} topics</div>
    <div class="topic-pagination-controls">
      <button class="topic-page-button" type="button" data-topic-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Prev</button>
      ${pageButtons.join("")}
      <button class="topic-page-button" type="button" data-topic-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Next</button>
    </div>`;
  root.querySelectorAll("[data-topic-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextPage = Number(button.dataset.topicPage);
      if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage > totalPages || nextPage === state.bankTopicPage) return;
      state.bankTopicPage = nextPage;
      renderBankList();
      $("bankList")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderBankList() {
  const root = $("bankList");
  if (!root) return;
  const topics = getSpeakingTopicItems();
  renderSpeakingTopicFilters(topics);
  const query = ($("bankTopicSearch")?.value || "").trim().toLowerCase();
  const book = $("bankTopicBook")?.value || "all";
  const category = document.querySelector(".topic-category-pill.active")?.dataset.topicCategory || "all";
  const likedIds = new Set(readLikedTopicIds());
  const completionIndex = readPracticeCompletionIndex();
  const filtered = topics.filter((item) => {
    const publicTopic = isPublicSpeakingTopic(item);
    const bookOk = category === "liked"
      ? true
      : book === "public"
      ? publicTopic
      : book === "all"
        ? true
        : !publicTopic && String(itemBook(item)) === book;
    const categoryOk = category === "all"
      || (category === "liked" ? likedIds.has(item.id) : speakingTopicCategory(item) === category);
    const searchOk = !query || speakingTopicSearchText(item).includes(query);
    return bookOk && categoryOk && searchOk;
  });
  const groups = buildSpeakingTopicGroups(filtered)
    .filter((group) => group.items.some((item) => practiceCompletionFilterMatches("speaking", item, completionIndex, "bankCompletionFilter")));
  if (!groups.length) {
    renderBankPagination(0, 1, state.bankTopicPageSize);
    root.innerHTML = `<div class="notice">No speaking topics match this search.</div>`;
    return;
  }
  const totalPages = Math.max(1, Math.ceil(groups.length / state.bankTopicPageSize));
  state.bankTopicPage = Math.min(Math.max(1, state.bankTopicPage || 1), totalPages);
  const start = (state.bankTopicPage - 1) * state.bankTopicPageSize;
  const displayGroups = groups.slice(start, start + state.bankTopicPageSize);
  root.innerHTML = displayGroups
    .map(
      (group) => {
        const chips = group.related
          .slice(0, 3)
          .map((keyword) => `<span>${escapeHtml(keyword)}</span>`)
          .join("");
        const liked = isSpeakingTopicGroupLiked(group, likedIds);
        const sourceLabel = group.sources.length > 1 ? "Cambridge + Public" : (group.sources[0] || "Speaking");
        const origin = `${group.items.length} ${group.items.length === 1 ? "set" : "sets"} · ${sourceLabel}`;
        const completion = practiceCompletionGroupSummary("speaking", group.items, completionIndex);
        return `
      <div class="bank-item speaking-topic-card topic-accent-${escapeHtml(group.accent)}" data-group-id="${escapeHtml(group.id)}" data-speaking-completed-count="${completion.completedCount}" role="button" tabindex="0">
        <div class="topic-card-head">
          <span class="objective-topic-icon" aria-hidden="true">${escapeHtml(group.emoji || "✨")}</span>
          <span class="practice-status-badge ${completion.completedCount === completion.totalCount && completion.totalCount ? "completed" : "not-completed"}">${escapeHtml(completion.label)}</span>
          <button class="topic-favourite${liked ? " liked" : ""}" type="button" data-topic-group="${escapeHtml(group.id)}" aria-label="${liked ? "Remove from likes" : "Like topic"}"><i data-lucide="heart"></i></button>
        </div>
        <h3>${escapeHtml(group.title)}</h3>
        <div class="topic-card-body">
          <div class="topic-keywords">${chips}</div>
        </div>
        <div class="topic-card-foot">
          <div class="topic-origin">${escapeHtml(origin || "Speaking")}</div>
          <button class="primary small-button practice-speaking-topic" type="button" data-group-id="${escapeHtml(group.id)}">Choose →</button>
        </div>
      </div>`;
      },
    )
    .join("");
  renderBankPagination(groups.length, state.bankTopicPage, state.bankTopicPageSize);
  document.querySelectorAll(".speaking-topic-card[data-group-id]").forEach((card) => {
    card.onclick = (event) => {
      if (event.target.closest("button")) return;
      activateSpeakingTopicGroupFromBank(card.dataset.groupId);
    };
    card.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activateSpeakingTopicGroupFromBank(card.dataset.groupId);
    };
  });
  document.querySelectorAll(".practice-speaking-topic").forEach((button) => {
    button.onclick = () => activateSpeakingTopicGroupFromBank(button.dataset.groupId);
  });
  document.querySelectorAll(".topic-favourite").forEach((button) => {
    const stopCardActivation = (event) => {
      event.stopPropagation();
    };
    button.onpointerdown = stopCardActivation;
    button.ontouchstart = stopCardActivation;
    button.onclick = (event) => {
      event.stopPropagation();
      event.preventDefault();
      toggleLikedTopicGroup(button.dataset.topicGroup);
    };
  });
  window.lucide?.createIcons?.({ attrs: { "stroke-width": 1.8 } });
}

function uniqueSpeakingTopicCards(items) {
  const seen = new Set();
  return items.filter((item) => {
    const keywords = speakingTopicKeywords(item);
    const title = speakingTopicTitle(item, keywords);
    const key = `${speakingTopicCategory(item)}:${title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function publicTopicLines(id) {
  return String($(id)?.value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function clearPublicTopicForm() {
  ["publicTopicKeywords", "publicTopicPart1", "publicTopicPart2", "publicTopicPart3"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
}

function savePublicTopic() {
  const keywordText = $("publicTopicKeywords")?.value.trim() || "";
  const keywords = keywordText
    .split(/[,，;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const part1 = publicTopicLines("publicTopicPart1");
  const part2 = $("publicTopicPart2")?.value.trim() || "";
  const part3 = publicTopicLines("publicTopicPart3");
  if (!keywords.length && !part1.length && !part2 && !part3.length) {
    alert("Add keywords or at least one speaking question.");
    return;
  }
  const title = keywords.length ? keywords.slice(0, 4).join(" / ") : (part2 || part1[0] || part3[0] || "Public speaking topic").slice(0, 80);
  state.bankTopicPage = 1;
  state.userBank.unshift({
    id: `public-speaking-${Date.now()}`,
    module: "speaking",
    title,
    topicKeywords: keywords.join(", "),
    part1Topic: keywords[0] || title,
    part1,
    part2,
    part3,
    part3Topics: keywords,
    source: "Public topics",
    period: "Student upload",
  });
  saveBank();
  clearPublicTopicForm();
  const form = $("publicTopicForm");
  if (form) form.hidden = true;
}

function saveBankItem() {
  const moduleName = $("bankModule").value;
  const title = $("bankTitle").value.trim();
  const audioUrl = $("bankAudioUrl").value.trim();
  const sourceUrl = $("bankSourceUrl").value.trim();
  const prompt = $("bankPrompt").value.trim();
  const answers = $("bankAnswers").value.trim();
  if (!title || !prompt) {
    alert("Title and prompt are required.");
    return;
  }
  state.userBank.unshift({
    id: `user-${Date.now()}`,
    module: moduleName,
    title,
    prompt,
    answers,
    audioUrl,
    sourceUrl,
    source: "User real-question bank",
  });
  saveBank();
  renderSingle();
  $("bankTitle").value = "";
  $("bankAudioUrl").value = "";
  $("bankSourceUrl").value = "";
  $("bankAudioFile").value = "";
  $("bankPrompt").value = "";
  $("bankAnswers").value = "";
}

function importBulkBank() {
  const raw = $("bulkImport").value.trim();
  if (!raw) {
    alert("Please paste JSON first.");
    return;
  }
  let items;
  try {
    items = JSON.parse(raw);
  } catch (error) {
    alert("JSON format error: " + error.message);
    return;
  }
  if (!Array.isArray(items)) items = [items];
  const allowed = new Set(["listening", "reading", "writing"]);
  const normalized = items
    .filter((item) => item && allowed.has(item.module) && item.title)
    .map((item) => ({
      id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}` ,
      module: item.module,
      title: String(item.title || "Untitled"),
      prompt: String(item.prompt || item.passage || item.transcript || ""),
      answers: String(item.answers || ""),
      audioUrl: String(item.audioUrl || ""),
      sourceUrl: String(item.sourceUrl || item.url || ""),
      source: "User real-question bank",
    }));
  if (!normalized.length) {
    alert("No valid items found. Each item needs module and title.");
    return;
  }
  state.userBank = [...normalized, ...state.userBank];
  saveBank();
  renderSingle();
  $("bulkImport").value = "";
  alert("Imported " + normalized.length + " items.");
}

function startSpeech(targetId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("This browser does not support speech recognition.");
    return;
  }
  if (state.recognition && state.recording) {
    state.recognition.stop();
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onstart = () => {
    state.recording = true;
  };
  recognition.onend = () => {
    state.recording = false;
  };
  recognition.onresult = (event) => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      if (event.results[i].isFinal) finalText += event.results[i][0].transcript + " ";
    }
    if (finalText) $(targetId).value += finalText;
  };
  state.recognition = recognition;
  recognition.start();
}

function applySidebarState(collapsed) {
  const shell = document.querySelector(".app-shell");
  const toggle = $("toggleSidebar");
  if (!shell || !toggle) return;
  shell.classList.toggle("sidebar-collapsed", collapsed);
  document.body.classList.toggle("sidebar-is-collapsed", collapsed);
  toggle.textContent = collapsed ? ">" : "<";
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", collapsed ? "Open sidebar" : "Collapse sidebar");
  toggle.title = collapsed ? "Open sidebar" : "Collapse sidebar";
}

function revealSidebarFromCurrentPosition() {
  localStorage.setItem(sidebarStoreKey, "false");
  applySidebarState(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.querySelector(".sidebar")?.scrollTo?.({ top: 0, behavior: "auto" });
}

function initSidebarToggle() {
  const toggle = $("toggleSidebar");
  if (!toggle) return;
  const stored = localStorage.getItem(sidebarStoreKey);
  const compactViewport = window.matchMedia("(max-width: 1024px)").matches;
  const tabletDefault = window.matchMedia("(max-width: 1180px)").matches;
  applySidebarState(compactViewport || (stored === null ? tabletDefault : stored === "true"));
  toggle.addEventListener("click", () => {
    const shell = document.querySelector(".app-shell");
    const collapsed = !shell?.classList.contains("sidebar-collapsed");
    localStorage.setItem(sidebarStoreKey, String(collapsed));
    applySidebarState(collapsed);
  });
}

function activateView(viewId, updateHash = false, options = {}) {
  if (viewId === "coach") viewId = "home";
  const previousView = activeViewId();
  if (previousView === "bank" && viewId !== "bank" && state.qwenSpeaking?.bank) disconnectQwenSpeaking("bank");
  if (previousView === "single" && viewId !== "single" && state.activeModule === "speaking" && state.qwenSpeaking?.single) disconnectQwenSpeaking("single");
  if (previousView === "exam" && viewId !== "exam" && state.qwenSpeaking?.exam) disconnectQwenSpeaking("exam");
  if (previousView === "sequence" && viewId !== "sequence" && state.qwenSpeaking?.sequence) disconnectQwenSpeaking("sequence");
  const view = $(viewId);
  const tab = viewId === "single" && state.activeModule
    ? document.querySelector(`.tab[data-view="${viewId}"][data-module-target="${state.activeModule}"]`) || document.querySelector(".tab[data-view=\"" + viewId + "\"]")
    : document.querySelector(".tab[data-view=\"" + viewId + "\"]");
  if (!view || !tab) return;
  if (viewId !== "single") exitImmersiveMode();
  document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  view.classList.add("active");
  if (!options.preservePageScroll) window.scrollTo({ top: 0, behavior: "auto" });
  if (viewId === "coach") {
    renderCoach();
    if (window.matchMedia("(max-width: 900px)").matches) {
      localStorage.setItem(sidebarStoreKey, "true");
      applySidebarState(true);
    }
  }
  if (viewId === "writing-upload") {
    setWritingWorkspaceMode("entry");
    renderWritingUploadHub();
  }
  if (viewId === "bank") renderBankList();
  if (viewId === "vocabulary") {
    if (previousView !== "vocabulary") state.vocabularyReview.page = "hub";
    renderVocabularyTrainer();
    void ensureIeltsCoreVocabularyLoaded();
    void ensureAlevelVocabularyLoaded();
  }
  updateAnnotationToolbarAvailability();
  refreshGlobalCoachPanelIfOpen();
  if (window.matchMedia("(min-width: 681px) and (max-width: 1024px)").matches) {
    localStorage.setItem(sidebarStoreKey, "true");
    applySidebarState(true);
  }
  if (updateHash) history.replaceState(null, "", "#" + viewId);
}

function applyInitialHash() {
  const hash = location.hash.replace("#", "");
  if (!hash) {
    activateView("home", false);
    return;
  }
  const sectionMatch = hash.match(/^(exam|sequence)-(listening|reading|writing|speaking)-section$/);
  if (sectionMatch) {
    activateView(sectionMatch[1], false);
    setImmersivePractice(sectionMatch[2], hash);
    scrollToExamSection(hash);
    return;
  }
  const viewId = hash === "coach" ? "home" : hash;
  activateView(viewId, false);
  if (viewId === "single" && state.singleStarted) setSingleImmersive(state.activeModule);
}

function bindEvents() {
  bindQwenWakeLockEvents();
  bindHelpControls();
  $("helpCaptureAgain")?.addEventListener("click", beginHelpCapture);
  $("helpAttachImage")?.addEventListener("click", () => beginHelpCapture("attach"));
  $("helpAttachmentClear")?.addEventListener("click", () => {
    state.help.pendingImageDataUrl = "";
    updateHelpAttachmentPreview();
    setHelpStatus("Ready");
  });
  $("helpCaptureConfirm")?.addEventListener("click", confirmHelpSelection);
  $("helpCaptureRetake")?.addEventListener("click", retakeHelpSelection);
  $("helpSaveVocab")?.addEventListener("click", saveHelpVocabulary);
  $("toggleAnnotation")?.addEventListener("click", () => setAnnotationMode(!state.annotation.enabled || state.annotation.erasing, false));
  $("toggleEraser")?.addEventListener("click", () => setAnnotationMode(!state.annotation.erasing, true));
  $("clearAnnotation")?.addEventListener("click", clearAllAnnotationPages);
  $("helpCaptureCancel")?.addEventListener("click", () => {
    hideHelpCaptureOverlay();
    stopHelpCaptureStream();
    setHelpStatus("Ready");
  });
  $("helpChatClose")?.addEventListener("click", closeHelpPanel);
  $("helpChatForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("helpChatInput");
    const message = input?.value || "";
    if (input) input.value = "";
    await sendHelpChatMessage(message);
  });
  const helpOverlay = $("helpCaptureOverlay");
  if (helpOverlay) {
    helpOverlay.addEventListener("mousedown", beginHelpSelection);
    helpOverlay.addEventListener("mousemove", moveHelpSelection);
    helpOverlay.addEventListener("mouseup", finishHelpSelection);
    helpOverlay.addEventListener("touchstart", beginHelpSelection, { passive: false });
    helpOverlay.addEventListener("touchmove", moveHelpSelection, { passive: false });
    helpOverlay.addEventListener("touchend", finishHelpSelection, { passive: false });
    helpOverlay.addEventListener("touchcancel", () => {
      hideHelpCaptureOverlay();
      stopHelpCaptureStream();
      setHelpStatus("Ready");
    });
  }
  const helpToolbar = $("helpCaptureToolbar");
  if (helpToolbar) {
    ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend", "click"].forEach((eventName) => {
      helpToolbar.addEventListener(eventName, (event) => event.stopPropagation(), { passive: false });
    });
  }
  document.addEventListener("mousemove", moveHelpSelection);
  document.addEventListener("mouseup", finishHelpSelection);
  document.addEventListener("touchmove", moveHelpSelection, { passive: false });
  document.addEventListener("touchend", finishHelpSelection, { passive: false });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("helpCaptureOverlay")?.hidden) {
      hideHelpCaptureOverlay();
      stopHelpCaptureStream();
      setHelpStatus("Ready");
    }
    if (event.key === "Escape" && !$("captionTranscriptOverlay")?.hidden) {
      closeListeningCaptionTranscript();
    }
  });
  window.addEventListener("hashchange", applyInitialHash);
  window.addEventListener("beforeunload", savePracticeSession);
  document.addEventListener("click", (event) => {
    const transcriptClose = event.target.closest?.("#captionTranscriptClose");
    if (transcriptClose) {
      closeListeningCaptionTranscript();
      return;
    }
    const overlay = event.target.closest?.("#captionTranscriptOverlay");
    if (overlay && event.target === overlay) {
      closeListeningCaptionTranscript();
      return;
    }
    const captionBar = event.target.closest?.(".listening-caption-bar");
    if (captionBar && !captionBar.hidden) {
      openListeningCaptionTranscript(captionBar.dataset.prefix || "", captionBar.dataset.section || "");
    }
  });
  initSidebarToggle();
  $("globalSidebarToggle")?.addEventListener("click", () => {
    revealSidebarFromCurrentPosition();
  });
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      syncCurrentDraftNow();
      setImmersivePractice("", "");
      if (button.dataset.moduleTarget) {
        activateSingleModule(button.dataset.moduleTarget, true);
        renderMine();
        renderDashboard();
        renderCoach();
        return;
      }
      activateView(button.dataset.view, true);
      renderMine();
      renderDashboard();
      renderSubscription();
      renderCoach();
      renderVocabularyTrainer();
    });
  });
  document.querySelectorAll(".module-btn").forEach((button) => {
    button.addEventListener("click", () => {
      activateSingleModule(button.dataset.module, true);
    });
  });
  $("singleSelect").addEventListener("change", (event) => {
    state.activeSingle = singleOptions(state.activeModule).find((item) => item.id === event.target.value);
    renderSingle();
  });
  ["singleBookFilter", "singleTestFilter", "singleTaskFilter", "singleUnitFilter", "singleTopicFilter", "singleCompletionFilter"].forEach((id) => {
    $(id).addEventListener("change", () => {
      state.activeSingle = null;
      if (["listening", "reading"].includes(state.activeModule)) state.objectiveTopicSelection[state.activeModule] = "";
      renderSingle();
    });
  });
  $("clearSingleFeedback").addEventListener("click", clearSingleFeedback);
  $("buildExam").addEventListener("click", buildExam);
  if ($("scoreExam")) $("scoreExam").addEventListener("click", scoreExam);
  $("buildSequence").addEventListener("click", buildSequence);
  ["sequenceBookFilter", "sequenceTestFilter"].forEach((id) => {
    $(id).addEventListener("change", () => {
      if (id === "sequenceBookFilter") renderSequenceFilters();
      buildSequence();
    });
  });
  $("submitUploadedWriting").addEventListener("click", submitUploadedWriting);
  $("openCustomWriting")?.addEventListener("click", () => openWritingPracticeSetup("custom"));
  $("continueWritingDraft")?.addEventListener("click", continueLatestWritingDraft);
  $("changeWritingTask")?.addEventListener("click", () => setWritingWorkspaceMode("entry"));
  $("toggleWritingPrompt")?.addEventListener("click", () => {
    state.writingPromptCollapsed = !state.writingPromptCollapsed;
    setWritingWorkspaceMode(state.writingWorkspaceMode);
  });
  $("startRecommendedWriting")?.addEventListener("click", () => {
    if (writingLibraryScope() === "full") {
      const option = chooseRotatingRecommendation("writing-full-test", writingFullTestOptions());
      if (option) openWritingPracticeSetup("full-test", option.id);
    } else {
      const option = chooseRotatingRecommendation("writing-topics", writingTopicOptions());
      if (option) openWritingPracticeSetup("topic", option.id);
    }
  });
  $("startSelectedWriting")?.addEventListener("click", () => {
    const selectionId = $("writingSystemSelect")?.value || "";
    if (selectionId) openWritingPracticeSetup(writingLibraryScope() === "full" ? "full-test" : "topic", selectionId);
  });
  document.querySelectorAll("[data-writing-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      state.writingLibraryScope = ["full", "topics", "review"].includes(button.dataset.writingScope) ? button.dataset.writingScope : "full";
      state.writingTopicCategory = "all";
      state.writingTopicPage = 1;
      if ($("writingTopicSearch")) $("writingTopicSearch").value = "";
      if ($("writingTopicBook")) $("writingTopicBook").value = "all";
      if ($("writingCompletionFilter")) $("writingCompletionFilter").value = "all";
      renderWritingUploadHub();
    });
  });
  $("writingTopicSearch")?.addEventListener("input", () => {
    state.writingTopicPage = 1;
    renderWritingUploadHub();
  });
  $("writingTopicBook")?.addEventListener("change", () => {
    state.writingTopicPage = 1;
    renderWritingUploadHub();
  });
  $("writingCompletionFilter")?.addEventListener("change", () => {
    state.writingTopicPage = 1;
    renderWritingUploadHub();
  });
  document.querySelectorAll("[data-writing-topic-category]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-writing-topic-category]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.writingTopicCategory = button.dataset.writingTopicCategory || "all";
      state.writingTopicPage = 1;
      renderWritingUploadHub();
    });
  });
  $("submitSystemWriting")?.addEventListener("click", submitSystemWriting);
  $("clearUploadedWriting").addEventListener("click", () => {
    $("uploadPrompt").value = "";
    $("uploadEssay").value = "";
    $("uploadEssayWords").textContent = "0";
    syncCustomWritingState();
    setFeedback("uploadWritingFeedback", "Submit a prompt and essay to get Amber-style feedback.", "uploadWritingMode", "");
  });
  $("uploadEssay").addEventListener("input", () => {
    $("uploadEssayWords").textContent = countWords($("uploadEssay").value);
    syncCustomWritingState();
  });
  $("uploadPrompt")?.addEventListener("input", syncCustomWritingState);
  $("examTimerToggle").addEventListener("click", () => (state.examTimerId ? stopExamTimer() : startExamTimer()));
  $("examTimerReset").addEventListener("click", () => {
    state.examSeconds = state.examTotal;
    stopExamTimer();
  });
  $("sequenceTimerToggle").addEventListener("click", () => (state.sequenceTimerId ? stopSequenceTimer() : startSequenceTimer()));
  $("sequenceTimerReset").addEventListener("click", resetSequenceTimer);
  $("singleTimerToggle").addEventListener("click", () => (state.singleTimerId ? stopSingleTimer() : startSingleTimer()));
  $("singleTimerReset").addEventListener("click", () => resetSingleTimer(state.activeModule));
  $("saveBankItem")?.addEventListener("click", saveBankItem);
  $("clearBank")?.addEventListener("click", () => {
    if ($("bankTitle")) $("bankTitle").value = "";
    if ($("bankAudioUrl")) $("bankAudioUrl").value = "";
    if ($("bankSourceUrl")) $("bankSourceUrl").value = "";
    if ($("bankAudioFile")) $("bankAudioFile").value = "";
    if ($("bankPrompt")) $("bankPrompt").value = "";
    if ($("bankAnswers")) $("bankAnswers").value = "";
  });
  $("bankAudioFile")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Audio file is too large for the browser upload limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      $("bankAudioUrl").value = reader.result;
    };
    reader.readAsDataURL(file);
  });
  $("importBulk")?.addEventListener("click", importBulkBank);
  $("clearBankStore")?.addEventListener("click", () => {
    if (confirm("Clear the user question bank?")) {
      state.userBank = [];
      saveBank();
      renderSingle();
    }
  });
  $("bankTopicSearch")?.addEventListener("input", () => {
    state.bankTopicPage = 1;
    renderBankList();
  });
  $("bankTopicBook")?.addEventListener("change", () => {
    state.bankTopicPage = 1;
    renderBankList();
  });
  $("bankCompletionFilter")?.addEventListener("change", () => {
    state.bankTopicPage = 1;
    renderBankList();
  });
  document.querySelectorAll(".topic-category-pill").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".topic-category-pill").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.bankTopicPage = 1;
      renderBankList();
    });
  });
  $("togglePublicTopicForm")?.addEventListener("click", () => {
    const form = $("publicTopicForm");
    if (form) form.hidden = !form.hidden;
  });
  $("savePublicTopic")?.addEventListener("click", savePublicTopic);
  $("clearPublicTopic")?.addEventListener("click", clearPublicTopicForm);
}

async function fetchTaskDataWithRetry(attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch("/api/tasks", { cache: "no-cache" });
      if (!response.ok) throw new Error(`Task library returned ${response.status}`);
      const json = await response.json();
      if (!json || !Array.isArray(json.writingTasks) || !Array.isArray(json.speakingSets)) throw new Error("Task library response is incomplete");
      return json;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 450);
    }
  }
  throw lastError || new Error("Task library could not be loaded");
}

async function init() {
  bindEvents();
  window.addEventListener("pagehide", () => {
    if (state.writingWorkspaceMode !== "entry") saveWritingTimerState(Boolean(state.writingTimerStartedAt));
  });
  state.authToken = localStorage.getItem(authStoreKey) || "";
  loadBank();
  loadCoreVocabularyKnown();
  state.data = await fetchTaskDataWithRetry();
  const restoredPractice = restorePracticeSessionAfterData();
  $("aiStatus").textContent = state.data.aiEnabled
    ? `AI connected · ${state.data.model}${state.data.ttsEnabled ? " · Fish TTS" : " · Browser TTS"}`
    : "Local mode · OPENAI_API_KEY not detected";
  if ($("sourceLinks")) {
    $("sourceLinks").innerHTML = state.data.officialSources
      .map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>`)
      .join("");
  }
  renderBankList();
  updateUserChrome();
  renderDashboard();
  renderSubscription();
  renderMine();
  renderVocabularyTrainer();
  void ensureIeltsCoreVocabularyLoaded();
  renderWritingUploadHub();
  window.lucide?.createIcons?.({ attrs: { "stroke-width": 1.8 } });
  renderCoach();
  refreshMineData();
  renderSingle();
  document.querySelectorAll(".module-btn").forEach((item) => item.classList.toggle("active", item.dataset.module === state.activeModule));
  bindHomeControls(document);
  $("examPaper").innerHTML = `<section class="panel notice">Click Generate random exam to load a full paper.</section>`;
  $("sequencePaper").innerHTML = `<section class="panel notice">Choose a Cambridge test, then click Generate same-test paper.</section>`;
  renderExamTimer();
  renderSequenceTimer();
  if (restoredPractice) renderSingleTimer();
  else resetSingleTimer(state.activeModule);

  const singleActions = document.createElement("div");
  singleActions.className = "actions";
  singleActions.innerHTML = `<button id="submitSingle" class="primary">Submit single module</button>`;
  $("singleContent").after(singleActions);
  $("submitSingle").addEventListener("click", submitSingle);
  applyInitialHash();
  restoreWritingUploadSessionAfterData();
  if (restoredPractice && location.hash === "#single") setSingleImmersive(state.activeModule);
}

init().catch((error) => {
  const reason = $("writingRecommendedReason");
  const list = $("writingTopicList");
  if (reason) reason.textContent = `Writing topics could not load: ${error.message}`;
  if (list) list.innerHTML = `<div class="notice startup-retry"><strong>Practice library unavailable</strong><p>Check the connection, then retry without losing local drafts.</p><button class="primary" type="button" data-retry-startup>Retry</button></div>`;
  document.querySelector("[data-retry-startup]")?.addEventListener("click", () => location.reload());
  setHelpStatus(`Startup failed: ${error.message}`);
});
