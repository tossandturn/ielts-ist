const state = {
  data: null,
  userBank: [],
  activeModule: "listening",
  activeSingle: null,
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
  serverDrafts: [],
  vocabItems: [],
  draftSaveTimer: null,
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
  },
  bankTopicPage: 1,
  bankTopicPageSize: 24,
};

const $ = (id) => document.getElementById(id);
const storeKey = "ieltsTrainerUserBank";
const sidebarStoreKey = "ieltsTrainerSidebarCollapsed";
const authStoreKey = "ieltsistAuthToken";
const draftStoreKey = "ieltsistDeviceDrafts";
const likedTopicStoreKey = "ieltsistLikedSpeakingTopics";
const annotationStoreKey = "ieltsistPdfAnnotations";
const listeningAudioGraphs = new WeakMap();
const listeningAsrCacheSource = "qwen-asr-live-vad-v1";
const listeningCaptionDefaultWordsPerSecond = 1.45;
const listeningCaptionLoopWarmupMs = 9000;
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
  if (modeId) $(modeId).textContent = mode ? String(mode).toUpperCase() : "";
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
  const user = state.currentUser;
  if (avatar) {
    avatar.textContent = user?.username ? user.username.slice(0, 1).toUpperCase() : "I";
    avatar.style.backgroundImage = user?.avatarDataUrl ? `url("${user.avatarDataUrl}")` : "";
    avatar.classList.toggle("has-avatar", Boolean(user?.avatarDataUrl));
  }
  if (info) info.textContent = user ? `${user.username} · ${membershipLabel(user)}` : "Cambridge IELTS practice / single modules / writing feedback";
}

async function refreshMineData() {
  if (!state.authToken) {
    state.serverDrafts = [];
    state.vocabItems = [];
    renderMine();
    return;
  }
  try {
    const [me, drafts, vocab] = await Promise.all([
      getJson("/api/me"),
      getJson("/api/drafts"),
      getJson("/api/vocabulary"),
    ]);
    state.currentUser = me.user || null;
    state.serverDrafts = drafts.drafts || [];
    state.vocabItems = vocab.items || [];
  } catch (error) {
    if (/log in|expired|401/i.test(error.message)) {
      state.authToken = "";
      state.currentUser = null;
      localStorage.removeItem(authStoreKey);
    }
  }
  updateUserChrome();
  renderMine();
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
    <section class="panel mine-card mine-quick-actions">
      <div>
        <h3>Quick Actions</h3>
        <p>Jump back into practice or review saved study materials.</p>
      </div>
      <div class="mine-action-grid">
        ${renderMineAction("AI Speaking Test", "Practice with AI examiner", "single-speaking", "purple")}
        ${renderMineAction("Writing Feedback", "Get AI feedback on your writing", "writing-upload", "blue")}
        ${renderMineAction("Speaking Topics", "Browse common topics", "bank", "green")}
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
  const rawTerm = cleanReviewText(item.term || item.context || "Untitled");
  const title = compactText(rawTerm, classifyVocabularyItem(item) === "word" ? 48 : 96);
  const explanation = cleanReviewText(item.explanation || "");
  const context = cleanReviewText(item.context || "");
  const date = new Date(item.updated_at || item.updatedAt || Date.now()).toLocaleDateString();
  const details = [
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
}

function runMineAction(action) {
  if (action === "single-speaking") {
    state.activeModule = "speaking";
    document.querySelectorAll(".module-btn").forEach((item) => item.classList.toggle("active", item.dataset.module === "speaking"));
    activateView("single", true);
    renderSingle();
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
    document.querySelector(".mine-vocab-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (action === "plans") {
    $("redeemCode")?.focus();
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
  return {
    key: `${activeView}:${state.activeModule}:${state.activeSingle?.id || bundle?.listeningId || "current"}`,
    module: activeView === "single" ? state.activeModule : activeView,
    title: `${activeTitle} · ${state.activeModule || "practice"}`,
    payload: { values, activeView, activeModule: state.activeModule, activeSingleId: state.activeSingle?.id || "", bundle },
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
  state.draftSaveTimer = window.setTimeout(syncCurrentDraftNow, 700);
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
    document.querySelectorAll(".module-btn").forEach((item) => item.classList.toggle("active", item.dataset.module === state.activeModule));
    const item = findItemById(state.activeModule, draft.payload.activeSingleId);
    if (item) state.activeSingle = item;
    renderSingle();
  }
  for (const [id, value] of Object.entries(draft.payload.values)) {
    const field = findDraftField(id);
    if (field) {
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
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
  await postJson("/api/vocabulary", { term: cleanReviewText(term), context: cleanReviewText(context), explanation, source: `Help:${kind}` });
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
  const match = String(item.id || item.title || "").match(/(?:test|t)(\d+)/i);
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
}

function singleWritingSetTitle(tasks) {
  const first = normalizeItem(tasks?.[0] || {});
  const book = itemBook(first);
  const test = itemTest(first);
  const source = first.source || "Writing";
  return [book ? `Cambridge ${book}` : source, test ? `Test ${test}` : "", "Writing Task 1 + Task 2"]
    .filter(Boolean)
    .join(" · ");
}

function singleWritingSetFromPair(pair) {
  const tasks = pair.map(normalizeItem);
  const first = tasks[0];
  return {
    id: `writing-set:${writingPairKey(first)}`,
    module: "writing",
    type: "Task 1 + Task 2",
    title: singleWritingSetTitle(tasks),
    source: first.source || "",
    period: first.period || "",
    writingTasks: tasks,
  };
}

function singleOptions(moduleName) {
  const allOptions = mergedItems(moduleName).map(normalizeItem);
  const filtered = applySingleFilters(allOptions, moduleName);
  if (moduleName !== "writing") return filtered;
  return pairedWritingSets(filtered).map(singleWritingSetFromPair);
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
    : builtInRaw;
  return [...user, ...(Array.isArray(builtIn) ? builtIn : [])];
}

function findItemById(moduleName, id) {
  if (!id) return null;
  return mergedItems(moduleName).map(normalizeItem).find((item) => item.id === id) || null;
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

async function getJson(url) {
  const headers = state.authToken ? { authorization: `Bearer ${state.authToken}` } : {};
  const response = await fetch(url, { cache: "no-store", headers });
  return parseJsonResponse(response);
}

async function postJson(url, payload, options = {}) {
  const headers = { "content-type": "application/json" };
  if (state.authToken) headers.authorization = `Bearer ${state.authToken}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: options.signal,
  });
  return parseJsonResponse(response);
}

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
  if (!log) return;
  const item = document.createElement("div");
  item.className = `help-message ${role === "user" ? "user" : "assistant"}`;
  setHelpMessageContent(item, role, text);
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
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
  openHelpPanel();
  setHelpStatus("Recognizing");
  addHelpMessage("assistant", "Recognizing the selected area...");
  try {
    const helpContext = buildHelpContext();
    const json = await postJson("/api/help/explain", { imageDataUrl, helpContext });
    state.help.contextText = json.ocrText || "";
    state.help.context = helpContext;
    state.help.history = [{ role: "assistant", content: json.answer || "" }];
    const last = $("helpChatLog")?.lastElementChild;
    setHelpMessageContent(last, "assistant", json.answer || "I could not recognize enough text. Try a tighter screenshot or type your question.");
    setHelpStatus(json.mode === "ai" ? "AI" : "Local");
  } catch (error) {
    const last = $("helpChatLog")?.lastElementChild;
    setHelpMessageContent(last, "assistant", `Help failed: ${error.message}`);
    setHelpStatus("Error");
  }
}

function attachHelpImage(imageDataUrl) {
  state.help.pendingImageDataUrl = imageDataUrl || "";
  updateHelpAttachmentPreview();
  openHelpPanel();
  setHelpStatus(state.help.pendingImageDataUrl ? "Image attached" : "Ready");
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
    setHelpStatus("Drag area");
    return;
  }
  setHelpSelectionRect(rect, true);
  setHelpStatus("Adjust or Explain");
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
    if (state.help.captureMode === "attach") {
      attachHelpImage(imageDataUrl);
      return;
    }
    await explainHelpImage(imageDataUrl);
  } catch (error) {
    stopHelpCaptureStream();
    openHelpPanel();
    setHelpStatus("Ready");
    addHelpMessage("assistant", error.message || "Could not capture the selected area.");
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
  setHelpStatus(state.help.video ? "Drag screen area" : "Drag PDF area");
}

async function beginHelpCapture(mode = "explain") {
  const captureMode = typeof mode === "string" ? mode : "explain";
  state.help.captureMode = captureMode;
  const requestId = state.help.captureRequestId + 1;
  state.help.captureRequestId = requestId;
  openHelpPanel();
  retakeHelpSelection();
  setHelpStatus("Capture");
  if (!navigator.mediaDevices?.getDisplayMedia) {
    state.help.video = null;
    stopHelpCaptureStream();
    const overlay = $("helpCaptureOverlay");
    if (overlay) overlay.hidden = false;
    addHelpMessage("assistant", "Drag over the PDF question area. I will crop that part of the page and explain it.");
    setHelpStatus("Drag PDF area");
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
    setHelpStatus("Drag area");
  } catch (error) {
    stopHelpCaptureStream();
    if (state.help.captureRequestId !== requestId) return;
    state.help.video = null;
    const overlay = $("helpCaptureOverlay");
    if (overlay) overlay.hidden = false;
    addHelpMessage("assistant", "Screen capture was not started. Drag over the PDF question area instead, or type your question here.");
    setHelpStatus("Drag PDF area");
  }
}

async function sendHelpChatMessage(message) {
  const clean = String(message || "").trim();
  const imageDataUrl = state.help.pendingImageDataUrl || "";
  if (!clean && !imageDataUrl) return;
  openHelpPanel();
  addHelpMessage("user", [clean, imageDataUrl ? "[Screenshot attached]" : ""].filter(Boolean).join("\n"));
  setHelpStatus("Thinking");
  try {
    const json = await postJson("/api/help/chat", {
      contextText: state.help.contextText,
      helpContext: buildHelpContext(state.help.context || {}),
      history: state.help.history.slice(-8),
      imageDataUrl,
      message: clean || "Please explain this screenshot.",
    });
    addHelpMessage("assistant", json.answer || "");
    if (json.ocrText) state.help.contextText = [state.help.contextText, json.ocrText].filter(Boolean).join("\n\n");
    state.help.context = buildHelpContext(state.help.context || {});
    state.help.history.push({ role: "user", content: clean || "[Screenshot attached]" }, { role: "assistant", content: json.answer || "" });
    state.help.pendingImageDataUrl = "";
    updateHelpAttachmentPreview();
    setHelpStatus(json.mode === "ai" ? "AI" : "Local");
  } catch (error) {
    addHelpMessage("assistant", `Help failed: ${error.message}`);
    setHelpStatus("Error");
  }
}

function bindHelpControls() {
  document.querySelectorAll("[data-help-trigger]").forEach((button) => {
    button.onclick = () => beginHelpCapture("explain");
  });
}

async function runWritingFeedbackJob(prompt, essay, onStatus) {
  const start = await postJson("/api/writing/feedback/start", { prompt, essay });
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

function feedbackWithPdfHtml(text, json, fallbackName) {
  return `${escapeHtml(text).replace(/\n/g, "<br>")}${pdfDownloadLink(json, fallbackName).replace(/\n/g, "<br>")}`;
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

function renderSpeakingResultHtml(text, json = {}, bandValue = "") {
  const feedback = String(text || json.feedback || "").trim();
  const criteria = extractSpeakingCriterionScores(feedback);
  const criteriaOverall = speakingOverallFromCriteria(criteria);
  const band = criteriaOverall || normalizeSpeakingBand(bandValue) || normalizeSpeakingBand(json.band) || extractSpeakingBandFromText(feedback) || "";
  const scoreNumber = Number.parseFloat(band);
  const scorePercent = Number.isFinite(scoreNumber) ? Math.max(0, Math.min(100, (scoreNumber / 9) * 100)) : 0;
  const metricRows = (criteria.length ? criteria : [
    { label: "Fluency & Coherence", score: "--" },
    { label: "Lexical Resource", score: "--" },
    { label: "Grammar", score: "--" },
    { label: "Pronunciation", score: "--" },
  ]).map((item) => {
    const score = normalizeSpeakingBand(item.score);
    const percent = score ? Math.max(0, Math.min(100, (Number(score) / 9) * 100)) : 0;
    return `<div class="speaking-result-metric">
      <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(score || "--")}</strong></div>
      <i style="--score-width:${percent.toFixed(1)}%"></i>
    </div>`;
  }).join("");
  const criterionScores = criteria.length ? criteria : [];
  const strongest = criterionScores.reduce((best, item) => {
    const score = Number.parseFloat(item.score);
    return Number.isFinite(score) && (!best || score > Number.parseFloat(best.score)) ? item : best;
  }, null);
  const weakest = criterionScores.reduce((lowest, item) => {
    const score = Number.parseFloat(item.score);
    return Number.isFinite(score) && (!lowest || score < Number.parseFloat(lowest.score)) ? item : lowest;
  }, null);
  const cleanFeedback = cleanSpeakingFeedbackForDisplay(feedback);
  const pdfLink = pdfDownloadLink(json, "ielts-speaking-report.pdf").replace(/\n/g, "");
  return `<article class="speaking-result-report">
    <header class="speaking-result-hero">
      <div>
        <span class="speaking-result-kicker">IELTS Speaking Result</span>
        <h3>Your IELTS Speaking Result</h3>
        <p>${escapeHtml(speakingBandLabel(band))}</p>
      </div>
      <div class="speaking-result-score" style="--score-percent:${scorePercent.toFixed(1)}%">
        <span>Overall</span>
        <strong>${escapeHtml(band || "--")}</strong>
        <em>Band Score</em>
      </div>
    </header>
    <section class="speaking-result-summary">
      <div>
        <span>Mode</span>
        <strong>${escapeHtml(json.mode || "AI Examiner")}</strong>
      </div>
      <div>
        <span>Strongest area</span>
        <strong>${escapeHtml(strongest ? strongest.label : "Ready to review")}</strong>
      </div>
      <div>
        <span>Priority focus</span>
        <strong>${escapeHtml(weakest ? weakest.label : "Complete answers")}</strong>
      </div>
    </section>
    <section class="speaking-result-grid">
      <div class="speaking-result-card">
        <h4>Band Breakdown</h4>
        ${metricRows}
      </div>
      <div class="speaking-result-card speaking-result-feedback">
        <h4>AI Examiner Feedback</h4>
        <div>${escapeHtml(cleanFeedback || "Your speaking score is ready. Keep practising with more complete answers.").replace(/\n/g, "<br>")}</div>
      </div>
    </section>
    <footer class="speaking-result-footer">
      <div>
        <strong>Next practice goal</strong>
        <span>Give one clear answer, add one reason, then one short example before moving on.</span>
      </div>
      ${pdfLink ? `<div class="speaking-result-actions">${pdfLink}</div>` : ""}
    </footer>
  </article>`;
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

function renderAnswerGroup(group, prefix) {
  return `<section class="paper-answer-group">
    <div class="paper-answer-group-title">${escapeHtml(group.title)}</div>
    ${renderSectionAudio(group.audioUrl, group.section, prefix)}
    <div class="paper-answer-grid">${group.entries
      .map(([number, question]) => `<label class="paper-answer-row">
        <span>${number}</span>
        <input class="text-input answer-input paper-answer-input" data-prefix="${prefix}" data-qid="${question.id}" placeholder="Answer" />
      </label>`)
      .join("")}</div>
  </section>`;
}

function renderPaperAnswerPanel(prefix, questions, assignments, label, audioUrls = []) {
  const entries = paperQuestionEntries(questions);
  const isListening = audioUrls.length > 0;
  const isReading = /Reading/i.test(label);
  const groups = isListening
    ? listeningAnswerGroups(entries, audioUrls)
    : isReading
      ? readingAnswerGroups(entries)
      : pageAnswerGroups(assignments, entries);
  const title = isListening ? "Listening answer sheet" : answerCardTitle(label);
  return `<aside class="paper-answer-scroll" aria-label="${escapeHtml(title)}">
    <div class="paper-answer-groups">
      ${groups.length ? groups.map((group) => renderAnswerGroup(group, prefix)).join("") : `<div class="page-card-empty">This paper has no answerable questions.</div>`}
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

function activeViewId() {
  return document.querySelector(".view.active")?.id || "";
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
  const context = {
    ...(extra || {}),
    activeView: view,
    activeModule: helpModule,
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
      return `<figure class="pdf-page">
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
  if (draw) draw.classList.toggle("active", state.annotation.enabled && !state.annotation.erasing);
  if (erase) erase.classList.toggle("active", state.annotation.erasing);
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
    const sync = () => resizeAnnotationCanvas(canvas, img);
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
      if (shouldSave) saveAnnotationCanvas(canvas);
    };
    canvas.addEventListener("pointerup", endDrawing);
    canvas.addEventListener("pointercancel", endDrawing);
    canvas.addEventListener("pointerleave", endDrawing);
  });
  document.body.classList.toggle("has-pdf-pages", canvases.length > 0);
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

function splitReadingPageImages(images, paper) {
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
    questionImages: questionImages.length ? questionImages : orderedImages,
  };
}

function renderReadingSplitPages(images, prefix, questions, paper) {
  const { passageImages, questionImages } = splitReadingPageImages(images, paper);
  return `<div class="reading-split">
    <section class="reading-pane reading-passage-pane">
      ${renderPageImages(passageImages, "Reading passage PDF")}
    </section>
    <section class="reading-pane reading-question-pane">
      ${renderPageImagesWithAnswers(questionImages, "Reading question PDF", prefix, questions, paper)}
    </section>
  </div>`;
}

function renderListening(test, prefix = "single") {
  const item = normalizeItem(test);
  const audioUrl = resolveAudioUrl(item.audioUrl);
  const audioUrls = Array.isArray(item.audioUrls) ? item.audioUrls.map(resolveAudioUrl).filter(Boolean) : [];
  const transcript = item.transcript || item.prompt || "";
  const sourceLink = item.sourceUrl ? `<a class="source-inline" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Open source page</a>` : "";
  const pageImageUrls = Array.isArray(item.questionPageImages) ? item.questionPageImages.map((image) => image?.url).filter(Boolean) : [];
  const hasPdfImages = Boolean(item.questionPageImages?.length);
  const playbackActions = hasPdfImages && audioUrls.length
    ? ""
    : audioUrls.length
      ? audioUrls.map((url, index) => `<button class="secondary play-source-audio" data-prefix="${escapeHtml(prefix)}" data-section="${index + 1}" data-url="${url}">Play Section ${index + 1}</button>`).join("")
      : audioUrl
        ? `<button class="secondary play-source-audio" data-prefix="${escapeHtml(prefix)}" data-url="${audioUrl}">Play audio</button>`
        : `<button class="secondary play-audio" data-text="${encodeURIComponent(transcript)}">Play listening</button>`;
  const questionPaper = hasPdfImages
    ? renderPageImagesWithAnswers(item.questionPageImages, "Listening question PDF", prefix, item.questions, item.questionPaper, { audioUrls })
    : item.questionPaper
      ? `<details class="question-paper" open><summary>Listening OCR text</summary><pre>${escapeHtml(item.questionPaper)}</pre></details>`
      : `<div class="notice">This listening set has not been extracted from the PDF yet. Open the local PDF and answer directly.</div>`;
  return `
    <div class="listening-study" id="${escapeHtml(prefix)}-listening-studio" data-listening-prefix="${escapeHtml(prefix)}" data-listening-id="${escapeHtml(item.id || "")}" data-page-images="${escapeHtml(encodeURIComponent(JSON.stringify(pageImageUrls)))}">
      <div class="listening-main">
        <div class="listening-head-row">
          <div class="module-meta">${[item.source, item.period || "", `${item.minutes || 30} min`].filter(Boolean).join(" · ")} ${sourceLink}</div>
        </div>
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
    setListeningCaption(prefix, section, "Audio is playing. Captions will appear with speech.", `${title} · 0/${words.length}`);
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
      ? "No saved transcript yet. Play audio to generate ASR captions."
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
  const readingPaper = readingPageImages.length
    ? (useSplitLayout
        ? renderReadingSplitPages(readingPageImages, prefix, item.questions, item.readingPaper)
        : renderPageImagesWithAnswers(readingPageImages, "Reading question PDF", prefix, item.questions, item.readingPaper))
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
    <textarea id="${prefix}-writing" placeholder="Write your essay here..."></textarea>
    <div class="word-count"><span id="${prefix}-words">0</span> words</div>
  `;
}

function renderWritingExamTwoColumn(tasks = [], prefixRoot = "exam") {
  const validTasks = tasks.filter((task) => task && typeof task === "object");
  if (validTasks.length < 2) {
    return `<section class="panel notice">Writing Task 1 and Task 2 are not both available for this paper. Generate another paper or check the writing bank.</section>`;
  }
  const prompts = validTasks.map((task, index) => {
    const item = normalizeItem(task);
    const sourceLink = item.sourceUrl ? `<a class="source-inline" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Open local PDF</a>` : "";
    const writingPrompt = item.writingPageImages?.length
      ? renderPageImages(item.writingPageImages, "Writing prompt PDF")
      : `<pre class="prompt-text">${escapeHtml(item.prompt)}</pre>${renderTaskVisual(item)}`;
    return `<section class="writing-task-prompt">
      <div class="module-meta">${[item.type || `Task ${index + 1}`, item.source, item.period || "", `${item.minutes || 40} min`].filter(Boolean).join(" · ")} ${sourceLink}</div>
      <h3>${item.title || `Writing Task ${index + 1}`}</h3>
      ${writingPrompt}
    </section>`;
  }).join("");
  const answers = validTasks.map((task, index) => {
    const item = normalizeItem(task);
    const answerPrefix = `${prefixRoot}-task${index + 1}`;
    return `<label class="writing-answer-block" for="${answerPrefix}-writing">
      <span>${escapeHtml(item.type || `Task ${index + 1}`)}</span>
      <textarea id="${answerPrefix}-writing" placeholder="Write your essay here..."></textarea>
      <div class="word-count"><span id="${answerPrefix}-words">0</span> words</div>
    </label>`;
  }).join("");
  return `<div class="exam-two-column writing-two-column">
    <section class="exam-left-pane">${prompts}</section>
    <aside class="exam-right-pane writing-answer-pane">${answers}</aside>
  </div>`;
}

function renderSpeaking(set, prefix = "single") {
  return renderSpeakingExamTwoColumn(set, prefix);
}

function renderSpeakingExamTwoColumn(set, prefix = "exam") {
  const item = normalizeItem(set);
  const pdfHtml = item.speakingPageImages?.length
    ? renderPageImages(item.speakingPageImages, "Speaking prompt PDF")
    : `<div class="speaking-paper-placeholder">
        ${item.part1Topic ? `<p><strong>Part 1:</strong> ${escapeHtml(item.part1Topic)}</p>` : ""}
        ${item.part2 ? `<p><strong>Part 2:</strong> ${escapeHtml(compactDialogueText(item.part2).slice(0, 260))}</p>` : ""}
        ${item.part3Topics ? `<p><strong>Part 3:</strong> ${escapeHtml(Array.isArray(item.part3Topics) ? item.part3Topics.join(", ") : item.part3Topics)}</p>` : ""}
      </div>`;
  const leftPane = prefix === "exam"
    ? `<div class="speaking-orb-stage">
        <div id="${prefix}-speaking-orb" class="speaking-voice-orb" aria-hidden="true"></div>
        <div class="speaking-orb-label">Speaking exam</div>
      </div>`
    : `<div class="module-meta">${[item.source, item.period || ""].filter(Boolean).join(" · ")}</div>
      <h3>${item.title}</h3>
      ${pdfHtml}`;
  return `<div class="exam-two-column speaking-two-column">
    <section class="exam-left-pane ${prefix === "exam" ? "speaking-orb-pane" : ""}">${leftPane}</section>
    <aside class="exam-right-pane speaking-answer-pane">
      ${renderRealtimeSpeakingPanel(item, prefix, { showTranscript: prefix !== "exam" })}
    </aside>
  </div>`;
}

function renderRealtimeSpeakingPanel(item, prefix, options = {}) {
  const showTranscript = options.showTranscript !== false;
  const speakingTopicPayload = JSON.stringify({
    title: item.title || "",
    source: item.source || "",
    period: item.period || "",
    part1: item.part1 || [],
    part2: item.part2 || "",
    part3: item.part3 || [],
  });
  const transcriptHtml = showTranscript
    ? `<div id="${prefix}-speaking-log" class="dialogue-log"></div>`
    : "";
  return `<div class="qwen-speaking" data-prefix="${prefix}" data-topic="${escapeHtml(item.title)}">
    <textarea id="${prefix}-qwen-prompt" hidden>${escapeHtml(buildIeltsSpeakingPrompt(item))}</textarea>
    <textarea id="${prefix}-qwen-topic-json" hidden>${escapeHtml(speakingTopicPayload)}</textarea>
    <div class="speaking-environment-tip">Please practise in a quiet environment. Keep your microphone close and avoid background noise so the examiner can hear you clearly.</div>
    <div id="${prefix}-qwen-status" class="voice-state">Not started</div>
    <div class="qwen-meter">
      <span id="${prefix}-qwen-level"></span>
      <strong id="${prefix}-qwen-meter">0.00</strong>
    </div>
    <label class="field-label speaking-band-field" for="${prefix}-speaking-score">
      <span>Speaking band</span>
      <input id="${prefix}-speaking-score" class="text-input band-input" inputmode="decimal" placeholder="Enter band score" />
    </label>
    ${transcriptHtml}
    <div id="${prefix}-scoring-progress" class="speaking-scoring-progress" hidden aria-live="polite">
      <div class="speaking-scoring-row">
        <span id="${prefix}-scoring-label">Preparing scoring...</span>
        <strong id="${prefix}-scoring-percent">0%</strong>
      </div>
      <div class="speaking-scoring-track"><span id="${prefix}-scoring-bar"></span></div>
    </div>
    <div id="${prefix}-recording-download" class="recording-download"></div>
    <div class="actions">
      <button class="primary start-qwen-speaking" data-prefix="${prefix}" data-topic="${escapeHtml(item.title)}">Start</button>
      <button class="secondary qwen-disconnect" data-prefix="${prefix}" disabled>Disconnect</button>
    </div>
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
    "You are a professional IELTS Speaking examiner in a real-time voice test.",
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
    "Do not repeat questions or topics the student has already answered. Track what the student said, then extend naturally with a relevant follow-up or move to a new angle.",
    "Never ask the same question twice. Before asking, compare it with your private ledger and the Already asked list; if it is similar, ask a different follow-up or move to a fresh IELTS-style angle instead.",
    "You may follow up on concrete details from what the student just said, such as people, places, reasons, examples, problems, feelings, or comparisons, when that feels natural.",
    "You may also move to a fresh IELTS-style angle from the topic bank, but only if it is not similar to anything already asked.",
    "Free development does not mean random topic switching: branch from the answer, ask a deeper why/how/example/comparison question, and later bring the conversation back to the scheduled Part 1, Part 2, or Part 3 anchor.",
    "In Part 2 and Part 3, you may first explore a meaningful detail from the candidate's answer, then smoothly bring the discussion back to the broader IELTS topic. This should sound like a human examiner, not a rigid script.",
    "If you notice you are about to ask the same question again, switch immediately to a different IELTS-style angle.",
    "If the student's answer is short, ask one gentle follow-up such as 'Could you tell me a little more about that?' instead of switching topics too quickly.",
    "Run the IELTS format naturally: Part 1 interview, Part 2 cue card with 1 minute preparation and 1-2 minutes speaking, then Part 3 discussion. The whole session must target a full 15 minutes.",
    "Do not end the test, score, or give final feedback early. Continue with natural follow-up questions until the app explicitly sends the scheduled End/Score instruction.",
    "If the provided topic-bank questions run out before the full 15 minutes, keep asking deeper IELTS-style follow-ups around the same broad topic and the candidate's answers.",
    "After the student ends the test, score Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation from 0 to 9. The first scoring line must be exactly like: Overall Band: 6.5.",
    "After scoring, give concise English feedback with 3 specific weaknesses and 3 drills.",
    "",
    `Topic set title: ${item.title}`,
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
    if (band) fillSpeakingBandFromText(prefix, band);
    setFeedbackHtml(feedbackId, renderSpeakingResultHtml(json.feedback, json, band), modeId, json.mode);
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
  if (band) fillSpeakingBandFromText(prefix, band);
  setFeedbackHtml(targets.feedbackId, renderSpeakingResultHtml(json.feedback, json, band), targets.modeId, json.mode);
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
  if (normalized.includes("examiner speaking") || normalized.includes("preparing response")) {
    qwenSetSpeakingVisualState(prefix, "assistant");
  } else if (normalized.includes("listening")) {
    qwenSetSpeakingVisualState(prefix, "candidate");
  } else if (normalized.includes("disconnected") || normalized.includes("not started") || normalized.includes("connected")) {
    qwenSetSpeakingVisualState(prefix, "idle");
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
      transcript,
      realtimeNote: options.realtimeNote || session.realtimeScoreNote || "",
      audioEvidence,
    });
    if (options.showProgress) qwenSetScoringProgress(prefix, Math.max(session.scoringProgressValue || 0, 86), "Formatting feedback...", true);
    const band = speakingBandFromFeedbackPayload(json.feedback, json.band);
    if (band && options.fillScore) fillSpeakingBandFromText(prefix, band);
    if (options.showFeedback) {
      const targets = speakingFeedbackTargets(prefix);
      const finalLine = band ? `Final Speaking Band: ${band}` : "Final Speaking Band: unavailable";
      const feedbackText = [finalLine, json.feedback || ""].filter(Boolean).join("\n\n");
      setFeedbackHtml(targets.feedbackId, renderSpeakingResultHtml(feedbackText || `Speaking band: ${band || ""}`, json, band), targets.modeId, json.mode || "");
    }
    if (options.showStatus) qwenSetStatus(prefix, band ? `Final Speaking Band: ${band}` : "Scoring complete", true);
    return json;
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
  session.part1Index = 0;
  session.part3Index = 0;
  session.part2Delivered = false;
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
  return qwenSpeakingElapsedMs(prefix) >= QWEN_SPEAKING_MIN_AUTO_FINISH_MS;
}

function qwenSpeakingTimeStatus(prefix) {
  const elapsedMs = qwenSpeakingElapsedMs(prefix);
  const remainingMs = Math.max(0, QWEN_SPEAKING_TARGET_MS - elapsedMs);
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
  session.scheduledAction = {
    part: "Part 3",
    kind: "extension-follow-up",
    label: `Extended Part 3 follow-up ${session.fallbackQuestionIndex}`,
    previousQuestion,
    text: [
      "The imported topic-bank questions have been used, but the speaking test is not long enough yet.",
      `Elapsed speaking time: ${time.elapsedLabel}. Target: about 15:00. Continue until at least 15:00 before ending.`,
      "",
      "Topic set:",
      plan.title || "IELTS Speaking",
      "",
      "Candidate's latest answer:",
      recentAnswer ? recentAnswer.slice(0, 420) : "(not available)",
      "",
      "Ask one deeper IELTS Part 3 style follow-up. You may branch from a concrete detail in the candidate's answer, then pull the discussion back to the broader Part 3 theme.",
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
    const recentAnswer = session.lastCandidateTurnText || qwenLatestTurnCandidateText(session) || session.candidateAnswers?.at(-1) || "";
    return {
      part: "Part 3",
      kind: "extension-follow-up",
      label: `Extended Part 3 follow-up ${session.fallbackQuestionIndex + 1}`,
      previousQuestion: qwenLastExaminerQuestion(session),
      text: [
        "The imported topic-bank questions have been used, but the speaking test is not long enough yet.",
        `Elapsed speaking time: ${time.elapsedLabel}. Target: about 15:00. Continue until at least 15:00 before ending.`,
        "",
        "Topic set:",
        plan.title || "IELTS Speaking",
        "",
        "Candidate's latest answer:",
        recentAnswer ? recentAnswer.slice(0, 420) : "(not available)",
        "",
        "Ask one deeper IELTS Part 3 style follow-up. You may branch from a concrete detail in the candidate's answer, then pull the discussion back to the broader Part 3 theme.",
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
    qwenRememberUnique(session.askedQuestions, text, 18);
    session.scheduledAction = { part: "Part 1", kind: "question", label: `Part 1 question ${session.part1Index}`, text };
    return session.scheduledAction;
  }
  if (!session.part2Delivered) {
    session.part2Delivered = true;
    session.lastActionKind = "cue-card";
    qwenRememberUnique(session.askedQuestions, `Part 2 cue card: ${plan.part2}`, 18);
    session.scheduledAction = { part: "Part 2", kind: "cue-card", label: "Part 2 cue card", text: plan.part2 };
    return session.scheduledAction;
  }
  if (session.part3Index < Math.min(6, plan.part3.length)) {
    const text = plan.part3[session.part3Index];
    session.part3Index += 1;
    session.lastActionKind = "question";
    qwenRememberUnique(session.askedQuestions, text, 18);
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
  if (session.awaitingScore) return;
  const clean = compactDialogueText(text);
  if (!clean) return;
  qwenRememberDialogueTurn(prefix, "Examiner", clean);
  qwenRememberUnique(session.askedQuestions, qwenExtractQuestion(clean), 18);
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
    `Timing: elapsed ${timeStatus.elapsedLabel}. Target length about 15:00. Remaining target time about ${timeStatus.remainingMinutes} minute(s).`,
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
    "For the 15-minute target, freely develop the discussion from the candidate's meaning, then return to the planned IELTS anchor when appropriate; never fill time by recycling old questions.",
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
  if (session.connected || session.ws?.readyState === WebSocket.OPEN) return;
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
      qwenSetStatus(prefix, "No complete speaking answer to score yet", false);
      qwenStopFakeScoringProgress(prefix, "Not enough speech to score yet.");
      window.setTimeout(() => qwenHideScoringProgress(prefix), 3500);
      return;
    }
    const band = normalizeSpeakingBand(result.band) || extractSpeakingBandFromText(result.feedback);
    qwenSetScoringProgress(prefix, 94, "Preparing final voice closing...", true);
    qwenSetStatus(prefix, band ? `Speaking ended. Final Band: ${band}. Saying goodbye...` : "Speaking ended. Score ready. Saying goodbye...", true);
    await qwenSayGoodbyeAndDisconnect(prefix, band);
    qwenSetScoringProgress(prefix, 98, "Preparing recording download...", true);
    createQwenRecordingDownload(prefix, { forceUpload: true, timeoutMs: QWEN_RECORDING_DOWNLOAD_RETRY_TIMEOUT_MS }).catch(() => {});
    qwenStopFakeScoringProgress(prefix, band ? `Score ready: Band ${band}` : "Score ready");
    window.setTimeout(() => qwenHideScoringProgress(prefix), 5000);
  } catch (error) {
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
    const fallback = qwenOriginalRecordingFallback(session, dataUrl, `MP3 conversion failed: ${error.message}`);
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
    const input = $(`${prefix}-speaking-score`);
    if (input) input.value = extracted;
    qwenSession(prefix).scoreFilled = true;
    return;
  }
  const direct = normalizeSpeakingBand(clean);
  if (direct) {
    const input = $(`${prefix}-speaking-score`);
    if (input) input.value = direct;
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
  const input = $(`${prefix}-speaking-score`);
  if (input) input.value = rounded.toFixed(1);
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

function renderSingle() {
  const moduleName = state.activeModule;
  resetListeningCaptionSession("single");
  const allOptions = mergedItems(moduleName).map(normalizeItem);
  renderSingleFilters(allOptions, moduleName);
  const options = singleOptions(moduleName);
  if (!options.length) {
    $("singleTitle").textContent = "No questions available";
    $("singleSelect").innerHTML = "";
    $("singleContent").innerHTML = `<div class="notice">${moduleName === "writing" ? "No complete Writing Task 1 + Task 2 set is available for this filter." : "This module has no imported questions yet. Add materials to the user bank first."}</div>`;
    return;
  }
  state.activeSingle = state.activeSingle && state.activeSingle.module === moduleName && options.some((item) => item.id === state.activeSingle.id) ? state.activeSingle : options[0];
  $("singleTitle").textContent = { listening: "Listening practice", reading: "Reading practice", writing: "Writing practice", speaking: "Speaking practice" }[moduleName];
  $("singleSelect").innerHTML = options.map((item) => `<option value="${item.id}">${item.title || item.type || "Untitled"}${item.source && moduleName !== "writing" ? ` · ${item.source}` : ""}</option>`).join("");
  $("singleSelect").value = state.activeSingle.id;
  const prefix = "single";
  $("singleContent").innerHTML =
    moduleName === "listening"
      ? renderListening(state.activeSingle, prefix)
      : moduleName === "reading"
        ? renderReading(state.activeSingle, prefix)
        : moduleName === "writing"
          ? renderWritingExamTwoColumn(state.activeSingle.writingTasks || [], prefix)
          : renderSpeaking(state.activeSingle, prefix);
  bindDynamicControls();
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
        <button class="help-capture-button" type="button" data-help-trigger>Help</button>
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
      const item = normalizeItem(state.activeSingle);
      const json = await postJson(`/api/${moduleName}/score`, { questions: item.questions || [], answers: collectAnswers("single") });
      setFeedback("singleFeedback", formatObjectiveFeedback(json), "singleMode", json.mode);
    } else if (moduleName === "writing") {
      setFeedback("singleFeedback", "Writing feedback is being generated. Estimated time: 1-10 min.", "singleMode", "");
      const tasks = (state.activeSingle.writingTasks || [state.activeSingle]).filter(Boolean).map(normalizeItem);
      const prompt = tasks.map((task, index) => {
        const taskName = task.type || `Task ${index + 1}`;
        const body = [task.prompt, task.data].filter(Boolean).join("\n\nData: ");
        return `${taskName}: ${task.title || "Writing task"}\n${body}`;
      }).join("\n\n---\n\n");
      const essay = tasks.map((task, index) => {
        const taskName = task.type || `Task ${index + 1}`;
        const value = $(`single-task${index + 1}-writing`)?.value.trim() || "";
        return `${taskName} response:\n${value}`;
      }).join("\n\n---\n\n");
      const json = await runWritingFeedbackJob(prompt, essay, () => {
        setFeedback("singleFeedback", "Writing feedback is being generated. Estimated time: 1-10 min.", "singleMode", "");
      });
      setFeedbackHtml("singleFeedback", feedbackWithPdfHtml(json.feedback, json, "ielts-writing-feedback.pdf"), "singleMode", json.mode);
    } else {
      const item = normalizeItem(state.activeSingle);
      await scoreSpeakingText("single", item.title || "Speaking", "singleFeedback", "singleMode");
    }
  } catch (error) {
    setFeedback("singleFeedback", `Submit failed: ${error.message}`, "singleMode", "error");
  }
}

function formatObjectiveFeedback(json) {
  if (!json.result?.answerAvailable) {
    return [json.feedback, "", "Answer status: not imported. Open the local PDF or parse file and mark manually."].join("\n");
  }
  const lines = [json.feedback, "", "Wrong answers:"];
  for (const item of json.result.details) {
    if (item.correct === null) continue;
    lines.push(`${item.correct ? "?" : "?"} ${item.text} | your answer: ${item.actual || "(blank)"} | expected: ${item.expected}`);
  }
  return lines.join("\n");
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
  setFeedback("uploadWritingFeedback", "Scoring in progress. Estimated time: 10 min.", "uploadWritingMode", "");
  try {
    const json = await runWritingFeedbackJob(prompt, essay, () => {
      setFeedback("uploadWritingFeedback", "Writing feedback is being generated. Estimated time: 1-10 min.", "uploadWritingMode", "");
    });
    setFeedbackHtml("uploadWritingFeedback", feedbackWithPdfHtml(json.feedback, json, "ielts-writing-feedback.pdf"), "uploadWritingMode", json.mode);
  } catch (error) {
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
    audio.addEventListener("play", () => sync({ restart: true }));
    audio.addEventListener("playing", () => sync({ restart: true }));
    audio.addEventListener("canplay", () => sync({ restart: false }));
    audio.addEventListener("timeupdate", () => sync({ restart: false }));
    audio.addEventListener("pause", () => {
      if (!audio.seeking) stopTimedListeningCaptionLoop(audio.dataset.prefix || "single", audio.dataset.section || "");
    });
    audio.addEventListener("seeking", () => {
      const prefix = audio.dataset.prefix || "single";
      stopTimedListeningCaptionLoop(prefix, audio.dataset.section || "");
    });
    audio.addEventListener("seeked", () => {
      resetTimedListeningCaptionAnchor(audio.dataset.prefix || "single", audio);
      sync({ restart: true });
    });
    audio.addEventListener("loadedmetadata", () => sync({ restart: false }));
    audio.addEventListener("ended", () => {
      const prefix = audio.dataset.prefix || "single";
      const section = audio.dataset.section || "";
      stopTimedListeningCaptionLoop(prefix, section);
      setListeningCaption(prefix, section, "Section finished.", section ? `Section ${section}` : "Cached captions");
    });
  });
}

function bindDynamicControls() {
  bindHelpControls();
  bindPdfAnnotations();
  bindListeningCaptionPlayers();
  document.querySelectorAll(".back-submit-button").forEach((button) => {
    button.onclick = () => backAndScrollToSubmit(button.dataset.submitTarget || "");
  });
  document.querySelectorAll(".inline-sidebar-toggle").forEach((button) => {
    button.onclick = () => {
      localStorage.setItem(sidebarStoreKey, "false");
      applySidebarState(false);
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

function renderBankPracticeTopic(topic, { autoStart = false } = {}) {
  const root = $("bankPracticePanel");
  if (!root || !topic) return;
  disconnectQwenSpeaking("bank");
  const keywords = speakingTopicKeywords(topic);
  const displayTitle = speakingTopicTitle(topic, keywords);
  const emoji = speakingTopicEmoji(topic, displayTitle);
  const chips = relatedTopicKeywords(topic, displayTitle, keywords).slice(0, 5).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
  const source = topic.source === "Public topics"
    ? "Public topics"
    : [itemBook(topic) ? `Cambridge ${itemBook(topic)}` : topic.source, itemTest(topic) ? `Test ${itemTest(topic)}` : ""].filter(Boolean).join(" · ");
  root.hidden = false;
  root.closest(".panel")?.classList.add("bank-practice-active");
  root.innerHTML = `<div class="bank-practice-shell">
    <header class="bank-practice-head">
      <div>
        <span>${escapeHtml(source || "Speaking topic")}</span>
        <h3>${escapeHtml(topic.title || "Speaking practice")}</h3>
      </div>
      <button id="closeBankPractice" class="secondary small-button" type="button">Back to topics</button>
    </header>
    <div class="bank-practice-grid">
      <section class="bank-practice-topic-card">
        <div class="topic-icon topic-emoji topic-accent-${escapeHtml(speakingTopicAccent(topic))}" aria-hidden="true">${escapeHtml(emoji)}</div>
        <h4>${escapeHtml(displayTitle || "Speaking")}</h4>
        <div class="topic-keywords">${chips}</div>
        ${topic.part1Topic ? `<p><strong>Part 1</strong>${escapeHtml(topic.part1Topic)}</p>` : ""}
        ${topic.part2 ? `<p><strong>Part 2</strong>${escapeHtml(compactDialogueText(topic.part2).slice(0, 220))}</p>` : ""}
        ${topic.part3Topics ? `<p><strong>Part 3</strong>${escapeHtml(Array.isArray(topic.part3Topics) ? topic.part3Topics.join(", ") : topic.part3Topics)}</p>` : ""}
      </section>
      <aside class="bank-practice-chat">
        ${renderRealtimeSpeakingPanel(topic, "bank", { showTranscript: true })}
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
  if (autoStart) {
    startQwenSpeaking("bank").catch((error) => {
      qwenSetStatus("bank", `Start failed: ${error.message}`, false);
    });
  }
}

function activateSpeakingTopicFromBank(id) {
  const topic = mergedItems("speaking").map(normalizeItem).find((item) => item.id === id);
  if (!topic) return;
  syncCurrentDraftNow();
  renderBankPracticeTopic(topic, { autoStart: true });
}

function renderTopicSetChooser(group) {
  const root = $("bankPracticePanel");
  if (!root || !group) return;
  disconnectQwenSpeaking("bank");
  const chips = group.related.slice(0, 5).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
  const sourceLabel = group.sources.length > 1 ? "Cambridge + Public" : (group.sources[0] || "Speaking");
  root.hidden = false;
  root.closest(".panel")?.classList.add("bank-practice-active");
  root.innerHTML = `<div class="topic-set-chooser">
    <header class="bank-practice-head topic-set-chooser-head">
      <div class="topic-set-title-row">
        <div class="topic-icon topic-emoji topic-accent-${escapeHtml(group.accent)}" aria-hidden="true">${escapeHtml(group.emoji)}</div>
        <div>
          <span>${escapeHtml(sourceLabel)} · ${escapeHtml(group.items.length)} ${group.items.length === 1 ? "set" : "sets"}</span>
          <h3>${escapeHtml(group.title)}</h3>
          <div class="topic-keywords">${chips}</div>
        </div>
      </div>
      <button id="closeBankPractice" class="secondary small-button" type="button">Back to topics</button>
    </header>
    <div class="topic-set-list" role="list">
      ${group.items.map((item, index) => {
        const source = speakingSetSourceLabel(item);
        const preview = speakingSetPreview(item);
        const setTitle = item.title && !String(item.title).toLowerCase().includes("speaking")
          ? item.title
          : source;
        return `<article class="topic-set-row" role="listitem">
          <div class="topic-set-index">${index + 1}</div>
          <div class="topic-set-main">
            <div class="topic-set-source">${escapeHtml(source)}</div>
            <h4>${escapeHtml(setTitle)}</h4>
            <p>${escapeHtml(preview || "IELTS Speaking Part 1, Part 2 and Part 3 practice set.")}</p>
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
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}

function activateSpeakingTopicGroupFromBank(groupId) {
  const group = findSpeakingTopicGroupById(groupId);
  if (!group) return;
  syncCurrentDraftNow();
  renderTopicSetChooser(group);
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
  const groups = buildSpeakingTopicGroups(filtered);
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
        return `
      <div class="bank-item speaking-topic-card topic-accent-${escapeHtml(group.accent)}" data-group-id="${escapeHtml(group.id)}" role="button" tabindex="0">
        <div class="topic-card-head">
          <div class="topic-icon topic-emoji" aria-hidden="true">${escapeHtml(group.emoji)}</div>
          <button class="topic-favourite${liked ? " liked" : ""}" type="button" data-topic-group="${escapeHtml(group.id)}" aria-label="${liked ? "Remove from likes" : "Like topic"}">${liked ? "♥" : "♡"}</button>
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
  const tabletDefault = window.matchMedia("(max-width: 1180px)").matches;
  applySidebarState(stored === null ? tabletDefault : stored === "true");
  toggle.addEventListener("click", () => {
    const shell = document.querySelector(".app-shell");
    const collapsed = !shell?.classList.contains("sidebar-collapsed");
    localStorage.setItem(sidebarStoreKey, String(collapsed));
    applySidebarState(collapsed);
  });
}

function activateView(viewId, updateHash = false) {
  const view = $(viewId);
  const tab = document.querySelector(".tab[data-view=\"" + viewId + "\"]");
  if (!view || !tab) return;
  document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  view.classList.add("active");
  if (window.matchMedia("(min-width: 681px) and (max-width: 1024px)").matches) {
    localStorage.setItem(sidebarStoreKey, "true");
    applySidebarState(true);
  }
  if (updateHash) history.replaceState(null, "", "#" + viewId);
}

function applyInitialHash() {
  const hash = location.hash.replace("#", "");
  if (!hash) {
    if (window.matchMedia("(max-width: 680px)").matches) activateView("bank", false);
    return;
  }
  const sectionMatch = hash.match(/^(exam|sequence)-(listening|reading|writing|speaking)-section$/);
  if (sectionMatch) {
    activateView(sectionMatch[1], false);
    setImmersivePractice(sectionMatch[2], hash);
    scrollToExamSection(hash);
    return;
  }
  activateView(hash, false);
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
      activateView(button.dataset.view, true);
      renderMine();
    });
  });
  document.querySelectorAll(".module-btn").forEach((button) => {
    button.addEventListener("click", () => {
      syncCurrentDraftNow();
      document.querySelectorAll(".module-btn").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.activeModule = button.dataset.module;
      state.activeSingle = null;
      resetSingleTimer(state.activeModule);
      renderSingle();
      setSingleImmersive(state.activeModule);
    });
  });
  $("singleSelect").addEventListener("change", (event) => {
    state.activeSingle = singleOptions(state.activeModule).find((item) => item.id === event.target.value);
    renderSingle();
  });
  ["singleBookFilter", "singleTestFilter", "singleTaskFilter"].forEach((id) => {
    $(id).addEventListener("change", () => {
      state.activeSingle = null;
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
  $("clearUploadedWriting").addEventListener("click", () => {
    $("uploadPrompt").value = "";
    $("uploadEssay").value = "";
    $("uploadEssayWords").textContent = "0";
    setFeedback("uploadWritingFeedback", "Submit a prompt and essay to get Amber-style feedback.", "uploadWritingMode", "");
  });
  $("uploadEssay").addEventListener("input", () => {
    $("uploadEssayWords").textContent = countWords($("uploadEssay").value);
  });
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

async function init() {
  bindEvents();
  state.authToken = localStorage.getItem(authStoreKey) || "";
  loadBank();
  state.data = await fetch("/api/tasks").then((res) => res.json());
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
  renderMine();
  refreshMineData();
  renderSingle();
  $("examPaper").innerHTML = `<section class="panel notice">Click Generate random exam to load a full paper.</section>`;
  $("sequencePaper").innerHTML = `<section class="panel notice">Choose a Cambridge test, then click Generate same-test paper.</section>`;
  renderExamTimer();
  renderSequenceTimer();
  resetSingleTimer(state.activeModule);

  const singleActions = document.createElement("div");
  singleActions.className = "actions";
  singleActions.innerHTML = `<button id="submitSingle" class="primary">Submit single module</button>`;
  $("singleContent").after(singleActions);
  $("submitSingle").addEventListener("click", submitSingle);
  applyInitialHash();
}

init().catch((error) => {
  document.body.innerHTML = `<pre style="padding:24px;color:#a00;">Startup failed: ${error.message}</pre>`;
});
