import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const DEFAULT_OUTPUT = resolve(ROOT, "data", "objective-semantic-topics.json");
const SCHEMA_VERSION = 1;

const TAXONOMY = [
  { key: "work", label: "Work", emoji: "💼", terms: ["job", "jobs", "work", "career", "recruit", "staff", "employee", "employer", "office", "vacancy", "training", "skills", "manager", "agency"] },
  { key: "travel", label: "Travel", emoji: "✈️", terms: ["travel", "holiday", "tour", "tourism", "tourist", "trip", "hotel", "accommodation", "booking", "visitor", "airport", "excursion", "vacation"] },
  { key: "education", label: "Education", emoji: "🎓", terms: ["student", "university", "school", "college", "course", "education", "teacher", "teaching", "learning", "study", "academic", "campus", "lecture", "library"] },
  { key: "environment", label: "Environment & Nature", emoji: "🌿", terms: ["environment", "environmental", "climate", "wildlife", "forest", "tree", "plant", "species", "animal", "bird", "ecology", "conservation", "pollution", "habitat", "eucalyptus", "ocean", "renewable"] },
  { key: "health", label: "Health", emoji: "🩺", terms: ["health", "medical", "medicine", "hospital", "doctor", "disease", "patient", "exercise", "fitness", "nutrition", "diet", "sleep", "therapy", "treatment"] },
  { key: "science", label: "Science & Technology", emoji: "🔬", terms: ["science", "scientist", "technology", "research", "experiment", "engineering", "innovation", "computer", "digital", "internet", "energy", "laboratory", "theory"] },
  { key: "history", label: "History & Archaeology", emoji: "🏺", terms: ["history", "historical", "ancient", "archaeology", "archaeological", "century", "civilisation", "civilization", "heritage", "warship", "excavation", "museum"] },
  { key: "culture", label: "Culture & Arts", emoji: "🎭", terms: ["culture", "cultural", "art", "artist", "music", "festival", "theatre", "film", "literature", "language", "dance", "painting", "photography"] },
  { key: "society", label: "Society", emoji: "🏘️", terms: ["society", "social", "community", "government", "population", "housing", "urban", "city", "family", "public", "people", "local", "policy"] },
  { key: "business", label: "Business & Economics", emoji: "📈", terms: ["business", "company", "market", "finance", "financial", "money", "bank", "consumer", "retail", "sales", "economic", "economy", "advertising"] },
  { key: "transport", label: "Transport", emoji: "🚆", terms: ["transport", "traffic", "rail", "railway", "train", "road", "car", "vehicle", "bicycle", "cycling", "ship", "canal", "airport"] },
  { key: "architecture", label: "Architecture & Design", emoji: "🏛️", terms: ["architecture", "architect", "building", "construction", "design", "house", "bridge", "structure", "urban planning"] },
  { key: "psychology", label: "Psychology & Behaviour", emoji: "🧠", terms: ["psychology", "psychological", "behaviour", "behavior", "brain", "memory", "emotion", "personality", "motivation", "cognitive"] },
  { key: "food", label: "Food & Agriculture", emoji: "🌾", terms: ["food", "farm", "farming", "agriculture", "agricultural", "crop", "restaurant", "cooking", "kitchen", "diet", "production"] },
];

const GENERAL_TOPIC = { key: "general", label: "General interest", emoji: "✨" };
const CURATED_READING_TITLES_BY_BOOK = {
  4: [
    ["Adults and Children: Loss of Tropical Rainforests", "What Do Whales Feel?", "Visual Symbols and the Blind"],
    ["Lost for Words", "Alternative Medicine in Australia", "Play Is a Serious Business"],
    ["Micro-enterprise Credit for Street Youth", "Volcanoes: Earth-shattering News", "Obtaining Linguistic Data"],
    ["How Much Higher? How Much Faster?", "The Nature and Aims of Archaeology", "The Problem of Scarce Resources"],
  ],
  5: [
    ["Johnson’s Dictionary", "Nature or Nurture?", "The Truth about the Environment"],
    ["Bakelite: The Birth of Modern Plastics", "What’s So Funny?", "The Birth of Scientific English"],
    ["Early Childhood Education", "Disappearing Delta", "The Return of Artificial Intelligence"],
    ["The Impact of Wilderness Tourism", "Flawed Beauty", "Effects of Light on Plants and Animals"],
  ],
  6: [
    ["Australia’s Sporting Success", "Delivering the Goods", "Climate Change and the Inuit"],
    ["Advantages of Public Transport", "Greying Population Stays in the Pink", "Numeration"],
    ["The Lumière Brothers", "Motivating Employees under Adverse Conditions", "The Search for the Anti-aging Pill"],
    ["Doctoring Sales", "Do Literate Women Make Better Mothers?", "Bullying"],
  ],
  7: [
    ["Let’s Go Bats", "Making Every Drop Count", "Educating Psyche"],
    ["Why Pagodas Don’t Fall Down", "The True Cost of Food", "Makete Integrated Rural Transport Project"],
    ["Ant Intelligence", "Population Movements and Genetics", "Forests: Our Natural Heritage"],
    ["Pulling Strings to Build Pyramids", "Endless Harvest", "Effects of Noise"],
  ],
  8: [
    ["A Chronicle of Timekeeping", "Air Traffic Control in the USA", "Telepathy"],
    ["Sheet Glass Manufacture", "The Little Ice Age", "The Meaning and Power of Smell"],
    ["Striking Back at Lightning with Lasers", "The Nature of Genius", "How Does the Biological Clock Tick?"],
    ["Land of the Rising Sum", "Biological Control of Pests", "Collecting Ant Specimens"],
  ],
  9: [
    ["William Henry Perkin", "Is There Anybody Out There?", "The History of the Tortoise"],
    ["Hearing Impairment", "Venus in Transit", "A Neuroscientist Reveals How to Think Differently"],
    ["Attitudes to Language", "Tidal Power", "Information Theory: The Big Idea"],
    ["The Life and Work of Marie Curie", "Young Children’s Sense of Identity", "The Development of Museums"],
  ],
  10: [
    ["Stepwells", "European Transport Systems 1990–2010", "The Psychology of Innovation"],
    ["Tea and the Industrial Revolution", "Gifted Children and Learning", "Museums of Fine Art and Their Public"],
    ["The Context, Meaning and Scope of Tourism", "Autumn Leaves", "Beyond the Blue Horizon"],
    ["The Megafires of California", "Second Nature", "When Evolution Runs Backwards"],
  ],
  11: [
    ["Crop-growing Skyscrapers", "The Falkirk Wheel", "Reducing the Effects of Climate Change"],
    ["Raising the Mary Rose", "What Destroyed the Civilisation of Easter Island?", "Neuroaesthetics"],
    ["The Story of Silk", "Great Migrations", "How the Other Half Thinks"],
    ["Research Using Twins", "An Introduction to Film Sound", "This Marvellous Invention"],
  ],
  12: [
    ["Cork", "Collecting as a Hobby", "What’s the Purpose of Gaining Knowledge?"],
    ["The Risks Agriculture Faces in Developing Countries", "The Lost City", "The Benefits of Being Bilingual"],
    ["Flying Tortoises", "The Intersection of Health Sciences and Geography", "Music and the Emotions"],
    ["The History of Glass", "Bring Back the Big Cats", "UK Companies Need More Effective Boards of Directors"],
  ],
  13: [
    ["Case Study: Tourism New Zealand Website", "Why Being Bored Is Stimulating – and Useful Too", "Artificial Artists"],
    ["Bringing Cinnamon to Europe", "Oxytocin", "Making the Most of Trends"],
    ["The Coconut Palm", "How Baby Talk Gives Infant Brains a Boost", "Whatever Happened to the Harappan Civilisation?"],
    ["Cutty Sark: The Fastest Sailing Ship of All Time", "Saving the Soil", "Book Review"],
  ],
  14: [
    ["The Importance of Children’s Play", "The Growth of Bike-sharing Schemes", "Motivational Factors and the Hospitality Industry"],
    ["Alexander Henderson (1831–1913)", "Back to the Future of Skyscraper Design", "Why Companies Should Welcome Disorder"],
    ["The Concept of Intelligence", "Saving Bugs to Find New Drugs", "The Power of Play"],
    ["The Secret of Staying Young", "Why Zoos Are Good", "Chelsea Rochman"],
  ],
  15: [
    ["Nutmeg – a valuable spice", "Driverless cars", "What is exploration?"],
    ["Could urban engineers learn from dance?", "Should we try to bring extinct species back to life?", "Having a laugh"],
    ["Henry Moore (1898–1986)", "The Desolenator: producing clean water", "Why fairy tales are really scary tales"],
    ["The return of the huarango", "Silbo Gomero – the whistle ‘language’ of the Canary Islands", "Environmental practices of big businesses"],
  ],
  16: [
    ["Why We Need to Protect Polar Bears", "The Step Pyramid of Djoser", "The Future of Work"],
    ["The White Horse of Uffington", "I Contain Multitudes", "How to Make Wise Decisions"],
    ["Roman Shipbuilding and Navigation", "Climate Change Reveals Ancient Artefacts in Norway’s Glaciers", "Plant ‘Thermometer’ Triggers Springtime Growth"],
    ["Roman Tunnels", "Changes in Reading Habits", "Attitudes towards Artificial Intelligence"],
  ],
  17: [
    ["The Development of the London Underground Railway", "Stadiums: Past, Present and Future", "To Catch a King"],
    ["The Dead Sea Scrolls", "A Second Attempt at Domesticating the Tomato", "Insight or Evolution?"],
    ["The Thylacine", "Palm Oil", "Building the Skyline: The Birth and Growth of Manhattan’s Skyscrapers"],
    ["Bats to the Rescue", "Does Education Fuel Economic Growth?", "Timur Gareyev: Blindfold Chess Champion"],
  ],
  18: [
    ["Urban Farming", "Forest Management in Pennsylvania, USA", "Conquering Earth’s Space Junk Problem"],
    ["Stonehenge", "Living with Artificial Intelligence", "An Ideal City"],
    ["Materials to Take Us beyond Concrete", "The Steam Car", "The Case for Mixed-ability Classes"],
    ["Green Roofs", "The Growth Mindset", "Alfred Wegener: Science, Exploration and the Theory of Continental Drift"],
  ],
  19: [
    ["How Tennis Rackets Have Changed", "The Pirates of the Ancient Mediterranean", "The Persistence and Peril of Misinformation"],
    ["The Industrial Revolution in Britain", "Athletes and Stress", "An Inquiry into the Existence of the Gifted Child"],
    ["Archaeologists Discover Evidence of Prehistoric Island Settlers", "The Global Importance of Wetlands", "Is the Era of Artificial Speech Translation upon Us?"],
    ["The Impact of Climate Change on Butterflies in Britain", "Deep-sea Mining", "The Unselfish Gene"],
  ],
  20: [
    ["The Kākāpō", "Return of the Elm: Reintroducing the Beloved Tree to Britain", "How Stress Affects Our Judgement"],
    ["Manatees", "Procrastination", "Invasion of the Robot Umpires"],
    ["Frozen Food", "Can the Planet’s Coral Reefs Be Saved?", "Robots and Us"],
    ["Georgia O’Keeffe", "Adapting to the Effects of Climate Change", "A New Role for Livestock Guard Dogs"],
  ],
  21: [
    ["The Davies Sisters", "Why We Need Silence", "Book Review: The World of Sugar by Ulbe Bosma"],
    ["Do Animals Dream?", "Mapungubwe", "Artificial Intelligence"],
    ["Saving the Saiga", "The Problems of Getting Around the City of Dar es Salaam", "Rethinking the Past"],
    ["The Problems and Benefits Created by the Spread of the Water Hyacinth in Kenya", "How Could Multilingualism Benefit India’s Poorest Schoolchildren?", "The Globemakers: The Curious Story of an Ancient Craft"],
  ],
};
const CURATED_READING_TITLES = new Map(Object.entries(CURATED_READING_TITLES_BY_BOOK).flatMap(([book, tests]) =>
  tests.flatMap((passages, testIndex) => passages.map((title, passageIndex) =>
    [`cam${book}-r-test${testIndex + 1}::section::${passageIndex + 1}`, title]))));
const SEMANTIC_OVERRIDES = new Map([
  ["cam15-l-test1::section::1", "work"],
  ["cam15-l-test1::section::2", "travel"],
  ["cam15-l-test1::section::4", "environment"],
  ["cam9-l-test4::section::4", "environment"],
]);
const READING_OVERRIDES = new Map([
  ["cam15-r-test1::section::1", "history"],
  ["cam15-r-test1::section::2", "transport"],
  ["cam15-r-test1::section::3", "travel"],
  ["cam15-r-test2::section::1", "architecture"],
  ["cam15-r-test2::section::2", "environment"],
  ["cam15-r-test2::section::3", "psychology"],
  ["cam15-r-test3::section::1", "culture"],
  ["cam15-r-test3::section::2", "science"],
  ["cam15-r-test3::section::3", "culture"],
  ["cam15-r-test4::section::1", "environment"],
  ["cam15-r-test4::section::2", "culture"],
  ["cam15-r-test4::section::3", "business"],
  ["cam20-r-test1::section::2", "environment"],
  ["cam7-r-test1::section::2", "environment"],
]);
const READING_TOPIC_REPAIRS = {
  environment: [
    "cam4-r-test1::section::1", "cam4-r-test1::section::2", "cam4-r-test3::section::2",
    "cam5-r-test1::section::3", "cam5-r-test3::section::2", "cam5-r-test4::section::3",
    "cam6-r-test1::section::3", "cam7-r-test1::section::1", "cam7-r-test1::section::2",
    "cam7-r-test3::section::1", "cam7-r-test3::section::3", "cam7-r-test4::section::2",
    "cam8-r-test2::section::2", "cam8-r-test4::section::2", "cam8-r-test4::section::3",
    "cam10-r-test3::section::2", "cam10-r-test4::section::1", "cam10-r-test4::section::3",
    "cam11-r-test1::section::3", "cam11-r-test3::section::2", "cam12-r-test1::section::1",
    "cam12-r-test3::section::1", "cam12-r-test4::section::2", "cam13-r-test3::section::1",
    "cam13-r-test4::section::2", "cam14-r-test4::section::2", "cam14-r-test4::section::3",
    "cam15-r-test2::section::2", "cam15-r-test4::section::1", "cam16-r-test1::section::1",
    "cam16-r-test3::section::3", "cam17-r-test3::section::1", "cam17-r-test4::section::1",
    "cam18-r-test1::section::2", "cam18-r-test4::section::1", "cam19-r-test3::section::2",
    "cam19-r-test4::section::1", "cam19-r-test4::section::2", "cam20-r-test1::section::1",
    "cam20-r-test1::section::2", "cam20-r-test2::section::1", "cam20-r-test3::section::2",
    "cam20-r-test4::section::2", "cam20-r-test4::section::3", "cam21-r-test3::section::1",
    "cam21-r-test4::section::1",
  ],
  science: [
    "cam5-r-test2::section::1", "cam5-r-test2::section::3", "cam5-r-test3::section::3",
    "cam8-r-test2::section::1", "cam8-r-test3::section::1", "cam8-r-test3::section::3", "cam9-r-test1::section::1",
    "cam9-r-test1::section::2", "cam9-r-test2::section::2", "cam9-r-test3::section::2",
    "cam9-r-test3::section::3", "cam9-r-test4::section::1", "cam11-r-test4::section::1", "cam14-r-test3::section::2",
    "cam15-r-test3::section::2", "cam16-r-test4::section::3", "cam17-r-test2::section::3",
    "cam18-r-test1::section::3", "cam18-r-test2::section::2", "cam18-r-test4::section::3",
    "cam19-r-test3::section::3", "cam19-r-test4::section::3", "cam20-r-test2::section::3", "cam20-r-test3::section::3",
    "cam21-r-test2::section::3",
  ],
  history: [
    "cam4-r-test4::section::2", "cam7-r-test4::section::1", "cam8-r-test1::section::1", "cam9-r-test1::section::3",
    "cam9-r-test4::section::3", "cam10-r-test2::section::1", "cam10-r-test3::section::3",
    "cam11-r-test2::section::1", "cam11-r-test2::section::2", "cam11-r-test3::section::1",
    "cam12-r-test2::section::2", "cam12-r-test4::section::1", "cam13-r-test2::section::1",
    "cam13-r-test3::section::3", "cam16-r-test2::section::1", "cam16-r-test3::section::1",
    "cam16-r-test3::section::2", "cam16-r-test4::section::1", "cam17-r-test1::section::3",
    "cam17-r-test2::section::1", "cam18-r-test2::section::1", "cam19-r-test1::section::2",
    "cam19-r-test2::section::1", "cam19-r-test3::section::1", "cam21-r-test1::section::3",
    "cam21-r-test2::section::2", "cam21-r-test3::section::3", "cam21-r-test4::section::3",
  ],
  culture: [
    "cam4-r-test1::section::3", "cam4-r-test2::section::1", "cam4-r-test3::section::3",
    "cam5-r-test1::section::1", "cam6-r-test3::section::1", "cam9-r-test3::section::1",
    "cam10-r-test2::section::3", "cam11-r-test4::section::2", "cam11-r-test4::section::3",
    "cam12-r-test2::section::3", "cam12-r-test3::section::3", "cam13-r-test1::section::3",
    "cam14-r-test2::section::1", "cam15-r-test3::section::1", "cam15-r-test3::section::3",
    "cam15-r-test4::section::2", "cam16-r-test4::section::2", "cam20-r-test4::section::1", "cam21-r-test1::section::1",
  ],
  psychology: [
    "cam4-r-test2::section::3", "cam5-r-test1::section::2", "cam5-r-test2::section::2",
    "cam8-r-test1::section::3", "cam8-r-test2::section::3", "cam8-r-test3::section::2",
    "cam9-r-test2::section::3", "cam9-r-test4::section::2", "cam10-r-test1::section::3",
    "cam10-r-test4::section::2", "cam11-r-test2::section::3", "cam11-r-test3::section::3",
    "cam13-r-test1::section::2", "cam14-r-test1::section::1", "cam14-r-test3::section::1",
    "cam14-r-test3::section::3", "cam15-r-test2::section::3", "cam16-r-test2::section::3",
    "cam17-r-test4::section::3", "cam18-r-test4::section::2", "cam19-r-test1::section::3",
    "cam19-r-test2::section::2", "cam20-r-test1::section::3",
    "cam20-r-test2::section::2", "cam21-r-test1::section::2", "cam21-r-test2::section::1",
  ],
  education: [
    "cam5-r-test3::section::1", "cam6-r-test2::section::3", "cam6-r-test4::section::2",
    "cam7-r-test1::section::3", "cam10-r-test2::section::2", "cam12-r-test1::section::3",
    "cam13-r-test3::section::2", "cam18-r-test3::section::3", "cam19-r-test2::section::3",
    "cam8-r-test4::section::1", "cam17-r-test4::section::2", "cam21-r-test4::section::2",
  ],
  health: [
    "cam4-r-test2::section::2", "cam4-r-test4::section::1", "cam6-r-test1::section::1",
    "cam6-r-test2::section::2", "cam6-r-test3::section::3", "cam7-r-test4::section::3",
    "cam9-r-test2::section::1", "cam12-r-test3::section::2", "cam13-r-test2::section::2",
    "cam14-r-test4::section::1", "cam16-r-test2::section::2", "cam19-r-test1::section::1",
  ],
  transport: [
    "cam6-r-test1::section::2", "cam6-r-test2::section::1", "cam7-r-test2::section::3",
    "cam8-r-test1::section::2", "cam10-r-test1::section::2", "cam11-r-test1::section::2",
    "cam13-r-test4::section::1", "cam14-r-test1::section::2", "cam15-r-test1::section::2",
    "cam17-r-test1::section::1", "cam18-r-test3::section::2", "cam21-r-test3::section::2",
  ],
  architecture: [
    "cam5-r-test4::section::2", "cam7-r-test2::section::1", "cam10-r-test1::section::1",
    "cam14-r-test2::section::2", "cam15-r-test2::section::1", "cam16-r-test1::section::2",
    "cam17-r-test1::section::2", "cam17-r-test3::section::3", "cam18-r-test3::section::1",
  ],
  food: [
    "cam7-r-test2::section::2", "cam11-r-test1::section::1",
    "cam12-r-test2::section::1", "cam17-r-test2::section::2", "cam17-r-test3::section::2",
    "cam18-r-test1::section::1", "cam20-r-test3::section::1",
  ],
  business: [
    "cam4-r-test3::section::1", "cam4-r-test4::section::3", "cam6-r-test4::section::1",
    "cam12-r-test4::section::3", "cam13-r-test2::section::3", "cam14-r-test2::section::3",
    "cam15-r-test4::section::3",
  ],
  society: [
    "cam6-r-test4::section::3", "cam7-r-test3::section::2", "cam12-r-test1::section::2",
    "cam13-r-test4::section::3", "cam18-r-test2::section::3",
  ],
  work: [
    "cam6-r-test3::section::2", "cam14-r-test1::section::3", "cam16-r-test1::section::3",
  ],
  travel: [
    "cam5-r-test4::section::1", "cam10-r-test3::section::1", "cam13-r-test1::section::1",
    "cam15-r-test1::section::3",
  ],
};
for (const [topicKey, canonicalIds] of Object.entries(READING_TOPIC_REPAIRS)) {
  for (const canonicalId of canonicalIds) READING_OVERRIDES.set(canonicalId, topicKey);
}
const LISTENING_TOPIC_AUDIT = {
  travel: [
    "cam4-l-test1::section::1", "cam4-l-test2::section::1", "cam4-l-test4::section::2",
    "cam5-l-test1::section::1", "cam7-l-test1::section::2", "cam7-l-test2::section::2",
    "cam7-l-test3::section::2",
    "cam7-l-test3::section::4", "cam7-l-test4::section::2", "cam9-l-test3::section::1",
    "cam9-l-test3::section::2", "cam9-l-test4::section::2", "cam10-l-test1::section::1",
    "cam11-l-test3::section::1", "cam12-l-test1::section::1", "cam12-l-test2::section::2",
    "cam13-l-test3::section::1", "cam13-l-test4::section::2", "cam14-l-test4::section::1",
    "cam14-l-test4::section::2", "cam15-l-test1::section::2", "cam16-l-test4::section::1",
    "cam17-l-test1::section::2", "cam17-l-test3::section::1", "cam20-l-test4::section::1",
    "cam21-l-test2::section::4", "cam21-l-test3::section::1",
  ],
  history: [
    "cam4-l-test1::section::2", "cam6-l-test1::section::4", "cam6-l-test2::section::4",
    "cam10-l-test2::section::3", "cam10-l-test4::section::2", "cam13-l-test4::section::4",
    "cam14-l-test2::section::2", "cam14-l-test2::section::4", "cam14-l-test4::section::4",
    "cam15-l-test3::section::4", "cam15-l-test4::section::3", "cam15-l-test4::section::4",
    "cam18-l-test2::section::3", "cam18-l-test4::section::2", "cam19-l-test1::section::4",
    "cam20-l-test3::section::2", "cam21-l-test2::section::2",
  ],
  education: [
    "cam4-l-test1::section::3", "cam4-l-test2::section::2", "cam4-l-test2::section::3",
    "cam4-l-test3::section::1", "cam4-l-test3::section::3", "cam5-l-test1::section::3",
    "cam5-l-test2::section::1", "cam5-l-test2::section::3", "cam5-l-test3::section::2",
    "cam5-l-test3::section::3", "cam5-l-test4::section::4", "cam6-l-test1::section::3",
    "cam6-l-test2::section::3", "cam6-l-test4::section::3", "cam7-l-test4::section::3",
    "cam8-l-test1::section::2", "cam8-l-test1::section::3", "cam8-l-test1::section::4",
    "cam8-l-test2::section::4", "cam8-l-test3::section::3", "cam8-l-test4::section::3",
    "cam9-l-test1::section::3", "cam9-l-test2::section::1", "cam9-l-test2::section::3",
    "cam9-l-test3::section::3", "cam9-l-test4::section::3", "cam10-l-test3::section::1",
    "cam10-l-test3::section::3", "cam11-l-test2::section::3", "cam12-l-test1::section::3",
    "cam12-l-test2::section::3", "cam12-l-test3::section::1", "cam12-l-test3::section::3",
    "cam14-l-test3::section::3", "cam14-l-test4::section::3", "cam16-l-test1::section::1",
    "cam16-l-test2::section::2", "cam17-l-test1::section::3", "cam17-l-test3::section::2",
    "cam17-l-test4::section::3", "cam18-l-test1::section::3", "cam18-l-test4::section::3",
    "cam19-l-test1::section::1", "cam19-l-test3::section::3", "cam20-l-test2::section::3",
    "cam20-l-test4::section::3", "cam21-l-test1::section::1", "cam21-l-test2::section::1",
  ],
  society: [
    "cam4-l-test1::section::4", "cam4-l-test2::section::4", "cam5-l-test4::section::1",
    "cam5-l-test4::section::2", "cam7-l-test4::section::1", "cam8-l-test4::section::2",
    "cam10-l-test2::section::2", "cam11-l-test1::section::1", "cam11-l-test2::section::1",
    "cam11-l-test3::section::2", "cam12-l-test4::section::2", "cam14-l-test1::section::1",
    "cam14-l-test1::section::3", "cam14-l-test3::section::2", "cam15-l-test4::section::2",
    "cam18-l-test1::section::2", "cam19-l-test1::section::2", "cam19-l-test2::section::2",
    "cam20-l-test1::section::4", "cam20-l-test2::section::2",
  ],
  culture: [
    "cam4-l-test3::section::2", "cam6-l-test1::section::2", "cam6-l-test2::section::1",
    "cam7-l-test1::section::4", "cam8-l-test1::section::1", "cam8-l-test3::section::2",
    "cam8-l-test4::section::4", "cam11-l-test3::section::3", "cam11-l-test4::section::1",
    "cam11-l-test4::section::2", "cam12-l-test2::section::1", "cam12-l-test4::section::3",
    "cam13-l-test3::section::3", "cam14-l-test3::section::4", "cam15-l-test2::section::1",
    "cam15-l-test2::section::3", "cam15-l-test3::section::3", "cam16-l-test1::section::3",
    "cam16-l-test1::section::4", "cam16-l-test3::section::4", "cam17-l-test1::section::4",
    "cam17-l-test2::section::3", "cam17-l-test2::section::4", "cam18-l-test2::section::4",
    "cam18-l-test3::section::1", "cam18-l-test4::section::4", "cam19-l-test2::section::1",
    "cam19-l-test3::section::2", "cam19-l-test4::section::3", "cam20-l-test1::section::2",
    "cam20-l-test3::section::3", "cam21-l-test1::section::2",
  ],
  architecture: [
    "cam4-l-test3::section::4", "cam6-l-test3::section::2", "cam8-l-test3::section::1",
    "cam9-l-test3::section::4", "cam10-l-test1::section::3", "cam10-l-test4::section::1",
    "cam11-l-test2::section::4", "cam17-l-test2::section::2", "cam18-l-test2::section::2",
    "cam20-l-test3::section::4", "cam20-l-test4::section::2", "cam21-l-test4::section::3",
  ],
  work: [
    "cam4-l-test4::section::1", "cam6-l-test4::section::2", "cam7-l-test3::section::1",
    "cam8-l-test4::section::1", "cam9-l-test1::section::1", "cam10-l-test4::section::3",
    "cam11-l-test2::section::2", "cam12-l-test1::section::2", "cam12-l-test3::section::2",
    "cam12-l-test4::section::1", "cam13-l-test2::section::2", "cam13-l-test4::section::1",
    "cam14-l-test1::section::2", "cam15-l-test1::section::1", "cam15-l-test3::section::1",
    "cam16-l-test1::section::2", "cam16-l-test3::section::2", "cam17-l-test2::section::1",
    "cam17-l-test3::section::3", "cam17-l-test4::section::2", "cam18-l-test2::section::1",
    "cam18-l-test3::section::3", "cam18-l-test4::section::1", "cam19-l-test4::section::1",
    "cam21-l-test4::section::1",
  ],
  science: [
    "cam4-l-test4::section::3", "cam5-l-test2::section::4", "cam10-l-test4::section::4",
    "cam13-l-test1::section::3", "cam13-l-test2::section::3", "cam16-l-test2::section::1",
    "cam18-l-test3::section::4", "cam21-l-test1::section::4",
  ],
  environment: [
    "cam4-l-test4::section::4", "cam5-l-test3::section::4", "cam6-l-test4::section::4",
    "cam7-l-test2::section::3", "cam7-l-test3::section::3", "cam8-l-test2::section::3",
    "cam9-l-test2::section::2", "cam9-l-test4::section::4", "cam10-l-test1::section::4",
    "cam10-l-test3::section::2", "cam11-l-test1::section::4", "cam11-l-test4::section::4",
    "cam12-l-test3::section::4", "cam12-l-test4::section::4", "cam13-l-test1::section::4",
    "cam13-l-test3::section::4", "cam14-l-test1::section::4", "cam14-l-test2::section::3",
    "cam15-l-test1::section::4", "cam15-l-test2::section::2", "cam16-l-test4::section::4",
    "cam17-l-test1::section::1", "cam17-l-test3::section::4", "cam18-l-test1::section::4",
    "cam19-l-test2::section::3", "cam19-l-test2::section::4", "cam19-l-test3::section::4",
    "cam19-l-test4::section::4", "cam20-l-test4::section::4", "cam21-l-test1::section::3",
    "cam21-l-test3::section::3", "cam21-l-test3::section::4",
  ],
  health: [
    "cam5-l-test1::section::2", "cam6-l-test1::section::1", "cam7-l-test2::section::4",
    "cam9-l-test4::section::1", "cam10-l-test1::section::2", "cam13-l-test3::section::2",
    "cam14-l-test2::section::1", "cam16-l-test2::section::4", "cam19-l-test4::section::2",
    "cam20-l-test2::section::1", "cam21-l-test4::section::4",
  ],
  business: [
    "cam5-l-test1::section::4", "cam5-l-test4::section::3", "cam6-l-test3::section::1",
    "cam6-l-test3::section::3", "cam6-l-test4::section::1", "cam7-l-test1::section::3",
    "cam7-l-test2::section::1", "cam8-l-test2::section::1",
    "cam8-l-test3::section::4", "cam9-l-test1::section::2", "cam9-l-test2::section::4",
    "cam10-l-test2::section::4", "cam11-l-test3::section::4", "cam12-l-test1::section::4",
    "cam12-l-test2::section::4", "cam14-l-test3::section::1", "cam17-l-test4::section::1",
    "cam20-l-test3::section::1", "cam21-l-test3::section::2", "cam21-l-test4::section::2",
  ],
  transport: [
    "cam5-l-test2::section::2", "cam5-l-test3::section::1", "cam6-l-test2::section::2",
    "cam7-l-test1::section::1", "cam10-l-test2::section::1", "cam13-l-test1::section::2",
    "cam13-l-test2::section::1", "cam15-l-test3::section::2", "cam15-l-test4::section::1",
    "cam16-l-test3::section::1", "cam16-l-test4::section::2", "cam16-l-test4::section::3",
    "cam18-l-test1::section::1",
  ],
  food: [
    "cam6-l-test3::section::4", "cam7-l-test4::section::4", "cam8-l-test2::section::2",
    "cam11-l-test1::section::2", "cam13-l-test1::section::1", "cam13-l-test4::section::3",
    "cam15-l-test2::section::4", "cam16-l-test3::section::3", "cam17-l-test4::section::4",
    "cam18-l-test3::section::2", "cam19-l-test1::section::3", "cam19-l-test3::section::1",
    "cam20-l-test1::section::1", "cam20-l-test2::section::4", "cam21-l-test2::section::3",
  ],
  psychology: [
    "cam9-l-test1::section::4", "cam10-l-test3::section::4", "cam11-l-test1::section::3",
    "cam11-l-test4::section::3", "cam13-l-test2::section::4", "cam15-l-test1::section::3",
    "cam16-l-test2::section::3", "cam20-l-test1::section::3",
  ],
};
const LISTENING_OVERRIDES = new Map();
for (const [topicKey, canonicalIds] of Object.entries(LISTENING_TOPIC_AUDIT)) {
  for (const canonicalId of canonicalIds) {
    if (LISTENING_OVERRIDES.has(canonicalId)) throw new Error(`Duplicate Listening topic audit entry: ${canonicalId}`);
    LISTENING_OVERRIDES.set(canonicalId, topicKey);
  }
}
if (LISTENING_OVERRIDES.size !== 288) {
  throw new Error(`Listening topic audit must contain exactly 288 unique sections; found ${LISTENING_OVERRIDES.size}`);
}
const CACHE_KEY_OVERRIDES = new Map([
  ["cam9-l-test4::section::3", "cam9-l-test4::4"],
  ["cam9-l-test4::section::4", "cam9-l-test4::3"],
]);

function parseArgs(argv) {
  const result = { check: false, output: DEFAULT_OUTPUT, asrCache: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--check") result.check = true;
    else if (value === "--output" || value === "--asr-cache") {
      const pathValue = argv[index + 1];
      if (!pathValue || pathValue.startsWith("--")) throw new Error(`${value} requires a path argument`);
      if (value === "--output") result.output = resolve(pathValue);
      else result.asrCache = resolve(pathValue);
      index += 1;
    }
    else throw new Error(`Unknown argument: ${value}`);
  }
  return result;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function enabledCambridge(item) {
  const match = String(item?.id || "").match(/^cam(\d+)-/i);
  return !match || Number(match[1]) >= 4;
}

function uniqueEligiblePapers(banks, kind) {
  const imageKey = kind === "listeningTests" ? "questionPageImages" : "readingPageImages";
  const papers = new Map();
  for (const bank of banks) {
    for (const paper of bank[kind] || []) {
      if (!enabledCambridge(paper) || paper.questions?.length !== 40 || !paper[imageKey]?.length || papers.has(paper.id)) continue;
      papers.set(paper.id, paper);
    }
  }
  return [...papers.values()].sort(comparePaperIds);
}

function comparePaperIds(left, right) {
  const parts = (value) => String(value.id || value).match(/^cam(\d+)-[lr]-test(\d+)/i)?.slice(1).map(Number) || [0, 0];
  const [leftBook, leftTest] = parts(left);
  const [rightBook, rightTest] = parts(right);
  return leftBook - rightBook || leftTest - rightTest;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/Speaker\s+\d+:/gi, " ")
    .replace(/--- Page \d+ ---/gi, " ")
    .replace(/[^a-z0-9'& -]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripBoilerplate(value) {
  return normalizeText(value)
    .replace(/\b(?:you should spend about twenty minutes|you will hear a number of different recordings|write (?:no more than|one word|the correct)|choose (?:the correct|one word)|answer questions?)\b[^.]{0,180}/gi, " ")
    .replace(/\b(?:cambridge|ielts|answer sheet|recording is copyright|university press|assessment english)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return [...text.matchAll(new RegExp(`\\b${escaped}\\b`, "gi"))].length;
}

function classifyTopic({ canonicalId, title, intro, body }) {
  const weightedParts = [[stripBoilerplate(title), 7], [stripBoilerplate(intro), 3], [stripBoilerplate(body), 1]];
  const ranked = TAXONOMY.map((topic, taxonomyIndex) => ({
    topic,
    taxonomyIndex,
    score: topic.terms.reduce((sum, term) => sum + weightedParts.reduce((termScore, [text, weight]) => termScore + Math.min(4, countTerm(text, term)) * weight, 0), 0),
  })).sort((left, right) => right.score - left.score || left.taxonomyIndex - right.taxonomyIndex);
  const overrideKey = SEMANTIC_OVERRIDES.get(canonicalId);
  const winner = overrideKey ? TAXONOMY.find((topic) => topic.key === overrideKey) : ranked[0]?.score >= 4 ? ranked[0].topic : GENERAL_TOPIC;
  const winningScore = ranked.find((item) => item.topic.key === winner.key)?.score || 0;
  const runnerUp = ranked.find((item) => item.topic.key !== winner.key)?.score || 0;
  const confidence = winner.key === "general" ? 0.35 : Math.min(0.99, Math.max(0.55, 0.55 + winningScore / 100 + Math.max(0, winningScore - runnerUp) / 80));
  return { ...winner, confidence: Number(confidence.toFixed(2)) };
}

function cleanTitle(value, fallback) {
  const title = String(value || "")
    .replace(/Speaker\s+\d+:/gi, "")
    .replace(/^(?:a |an )?(?:conversation|talk|lecture|discussion|interview)\s+(?:between .*?\s+)?(?:about|on)\s+/i, "")
    .replace(/^(?:a |an )?(?:man|woman|student|customer|speaker)\s+/i, "")
    .replace(/\b(?:first,? you have|now listen|questions?\s+\w+).*/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.-]+|[\s:;,.-]+$/g, "")
    .trim();
  const chosen = title.length >= 4 ? title : fallback;
  return chosen.length > 120 ? `${chosen.slice(0, 117).replace(/\s+\S*$/, "")}...` : chosen;
}

function listeningIntro(text, section) {
  const source = String(text || "").replace(/\s+/g, " ");
  const word = ["", "one", "two", "three", "four"][section];
  const pattern = new RegExp(`(?:part|section)\\s+(?:${section}|${word})[,.: -]+(?:you (?:will|'ll) hear\\s+)?(.{15,500}?)(?=Speaker\\s+\\d+:\\s+(?:First|Now)|First,? you have|Now listen|questions?\\s+(?:${(section - 1) * 10 + 1}|one|eleven|twenty|thirty)|$)`, "i");
  const match = source.match(pattern);
  const unnumbered = source.match(/you (?:will|'ll) hear\s+(.{15,500}?)(?=Speaker\s+\d+:\s+(?:First|Now)|First,? you have|Now listen|questions?\s+\d|$)/i);
  return cleanTitle(match?.[1] || unnumbered?.[1] || "", `Listening Section ${section}`);
}

function detectedSection(text) {
  const intro = String(text || "").slice(0, 2500);
  const match = intro.match(/(?:part|section)\s+(one|two|three|four|[1-4])\b/i);
  if (match) return { one: 1, two: 2, three: 3, four: 4 }[match[1].toLowerCase()] || Number(match[1]);
  const range = intro.match(/questions?\s+(\d{1,2})\s+(?:to|through|-)\s+(\d{1,2})/i);
  const start = Number(range?.[1] || 0);
  const end = Number(range?.[2] || 0);
  return start >= 1 && end <= 40 && start <= end ? Math.ceil(end / 10) : 0;
}

function paperValidatesRange(questionPaper, section) {
  const start = (section - 1) * 10 + 1;
  const end = section * 10;
  const normalized = String(questionPaper || "")
    .replace(/[–—一+]/g, "-")
    .replace(/S\s*E\s*C\s*T\s*I\s*O\s*N/gi, "SECTION")
    .replace(/P\s*A\s*R\s*T/gi, "PART");
  const spacedEnd = String(end).split("").join("\\s*");
  if (new RegExp(`Questions?\\s+${start}\\s*-\\s*${spacedEnd}`, "i").test(normalized)) return true;
  const sectionToken = ["", "(?:1|I)", "(?:2|II)", "(?:3|III)", "(?:4|IV)"][section];
  const marker = normalized.search(new RegExp(`(?:SECTION|PART)\\s+${sectionToken}\\b`, "i"));
  if (marker < 0) return false;
  const remainder = normalized.slice(marker);
  const nextMarker = remainder.slice(1).search(/(?:SECTION|PART)\s+[1-4]\b/i);
  const sectionText = nextMarker >= 0 ? remainder.slice(0, nextMarker + 1) : remainder;
  if (new RegExp(`Questions?\\s+${start}\\s*-\\s*${end}`, "i").test(sectionText)) return true;
  const firstQuestion = Number(sectionText.match(/Questions?\s+(\d{1,2})\b/i)?.[1] || 0);
  return firstQuestion >= start && firstQuestion <= end;
}

function asrValidatesRange(text, section) {
  const start = (section - 1) * 10 + 1;
  const end = section * 10;
  return new RegExp(`questions?\\s+${start}\\s+(?:to|through|-)\\s+${end}`, "i").test(String(text || "").slice(0, 3000));
}

function listeningCacheKey(paperId, section) {
  const canonicalId = `${paperId}::section::${section}`;
  if (CACHE_KEY_OVERRIDES.has(canonicalId)) return CACHE_KEY_OVERRIDES.get(canonicalId);
  const cam12 = paperId.match(/^cam12-l-test([1-4])$/);
  if (cam12) return `cam12-l-test${Number(cam12[1]) + 4}::${section}`;
  return `${paperId}::${section}`;
}

function listeningEntry(paper, section, asrCache) {
  const canonicalId = `${paper.id}::section::${section}`;
  const cacheKey = listeningCacheKey(paper.id, section);
  const cacheEntry = asrCache[cacheKey];
  if (!cacheEntry?.text) throw new Error(`Missing offline ASR intro for ${canonicalId} (expected ${cacheKey})`);
  const marker = detectedSection(cacheEntry.text);
  if (marker !== section) throw new Error(`ASR section marker mismatch for ${canonicalId}: ${cacheKey} says Section ${marker || "unknown"}`);
  if (!paperValidatesRange(paper.questionPaper, section) && !asrValidatesRange(cacheEntry.text, section)) {
    throw new Error(`Question range validation failed for ${canonicalId}`);
  }
  const topicTitle = listeningIntro(cacheEntry.text, section);
  const overrideKey = LISTENING_OVERRIDES.get(canonicalId);
  if (!overrideKey) throw new Error(`Missing audited Listening topic for ${canonicalId}`);
  const topic = { ...TAXONOMY.find((item) => item.key === overrideKey), confidence: 0.92 };
  const sourceSuffix = cacheKey === `${paper.id}::${section}` ? cacheKey : CACHE_KEY_OVERRIDES.has(canonicalId) ? `cache-repair:${cacheKey}` : `cache-alias:${cacheKey}`;
  return {
    topicKey: topic.key,
    topicLabel: topic.label,
    emoji: topic.emoji,
    topicTitle,
    source: `asr:intro:${sourceSuffix}+semantic-override`,
    confidence: topic.confidence,
    schemaVersion: SCHEMA_VERSION,
  };
}

function readingChunks(readingPaper) {
  const source = String(readingPaper || "");
  const markers = [...source.matchAll(/R[ \t]*E[ \t]*A[ \t]*D[ \t]*I[ \t]*N[ \t]*G[ \t]+P[ \t]*A[ \t]*S[ \t]*S[ \t]*A[ \t]*G[ \t]*E[ \t]+([123])[ \t]*(?=\??[ \t\r\n]+You should spend)/gi)];
  const chunks = new Map();
  const firstMarker = markers[0];
  if (firstMarker && Number(firstMarker[1]) === 2) chunks.set(1, source.slice(0, firstMarker.index));
  for (let index = 0; index < markers.length; index += 1) {
    const section = Number(markers[index][1]);
    if (!chunks.has(section)) chunks.set(section, source.slice(markers[index].index, markers[index + 1]?.index ?? source.length));
  }
  return chunks;
}

function readingTitle(chunk, passage) {
  const normalized = String(chunk || "").replace(/\r/g, "");
  const afterInstructionsMatch = normalized.match(new RegExp(`Passage\\s+${passage}\\s+(?:below|on the following pages)\\.?(?:\\s|\\n)+([^\\n]{4,140})`, "i"))?.[1];
  const afterInstructions = /Questions?|answer sheet|List of/i.test(afterInstructionsMatch || "") ? "" : afterInstructionsMatch;
  const pageHeading = [...normalized.matchAll(/--- Page \d+ ---\n([\s\S]{4,350}?)(?=\n\s*[A-H]\s+[A-Z])/g)]
    .map((match) => match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/^(?:Reading|Test\s+\d+)$/i.test(line))
      .join(" "))
    .find((candidate) => candidate.length >= 4 && candidate.length <= 180 && !/Questions?|answer sheet|List of/i.test(candidate));
  const beforeParagraph = [...normalized.matchAll(/\n([^\n]{4,140})\n\s*[A-H]\s+[A-Z]/g)]
    .map((match) => match[1].trim())
    .find((line) => !/^(?:Questions?|List of|Reading|Test|Write |Choose |Do the following|Which )/i.test(line));
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const fallback = lines.find((line) => line.length >= 8 && line.length <= 120
    && !/^(?:---|READING PASSAGE|You should|Questions?|Reading|Test|Write |Choose |List of|Which |In boxes|TRUE|FALSE|NOT GIVEN|\d+\s)/i.test(line));
  const title = cleanTitle(afterInstructions || pageHeading || beforeParagraph || fallback || "", "");
  if (!title || title.length > 100 || /\.\.\.$/.test(title)
    || /^(?:complete|choose|write|questions?|in boxes|true|false|not given)\b/i.test(title)
    || /\b(?:and|or|the|a|an|of|to|with|for|from|in|on|by|as|that|which|who|were|was|is|are)[|. ]*$/i.test(title)) return "";
  return title;
}

function readingEntry(paper, passage, chunk) {
  const canonicalId = `${paper.id}::section::${passage}`;
  if (!chunk) throw new Error(`Missing Reading Passage ${passage} marker for ${paper.id}`);
  const overrideKey = READING_OVERRIDES.get(canonicalId);
  const curatedTitle = CURATED_READING_TITLES.get(canonicalId);
  if (!curatedTitle) throw new Error(`Missing curated Reading title for ${canonicalId}`);
  const classified = classifyTopic({ canonicalId, title: curatedTitle, intro: String(chunk).slice(0, 2200), body: chunk });
  const topic = overrideKey
    ? { ...TAXONOMY.find((item) => item.key === overrideKey), confidence: 0.92 }
    : { ...classified, confidence: Math.min(classified.confidence, 0.9) };
  const topicTitle = curatedTitle;
  return {
    topicKey: topic.key,
    topicLabel: topic.label,
    emoji: topic.emoji,
    topicTitle,
    source: overrideKey ? "readingPaper:curated-title+semantic-override" : "readingPaper:curated-title+weighted-text",
    confidence: topic.confidence,
    schemaVersion: SCHEMA_VERSION,
  };
}

function resolveAsrCache(explicitPath) {
  if (explicitPath) {
    const resolvedExplicitPath = resolve(explicitPath);
    if (!existsSync(resolvedExplicitPath)) throw new Error(`Explicit ASR cache not found: ${resolvedExplicitPath}`);
    return resolvedExplicitPath;
  }
  if (process.env.LISTENING_ASR_CACHE_PATH) {
    const resolvedConfiguredPath = resolve(process.env.LISTENING_ASR_CACHE_PATH);
    if (!existsSync(resolvedConfiguredPath)) throw new Error(`Configured ASR cache not found: ${resolvedConfiguredPath}`);
    return resolvedConfiguredPath;
  }
  const candidates = [
    resolve(ROOT, "data", "listening-asr-cache.json"),
    resolve(ROOT, "..", "..", "data", "listening-asr-cache.json"),
  ].map((value) => resolve(value));
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`Offline ASR cache not found. Tried: ${candidates.join(", ")}`);
  return found;
}

export async function generateCatalog({ asrCachePath = "" } = {}) {
  const banks = await Promise.all([
    readJson(resolve(ROOT, "data", "cambridge15-bank.json")),
    readJson(resolve(ROOT, "data", "cambridge-local-bank.json")),
  ]);
  const listeningPapers = uniqueEligiblePapers(banks, "listeningTests");
  const readingPapers = uniqueEligiblePapers(banks, "readingTests");
  if (listeningPapers.length !== 72 || readingPapers.length !== 72) {
    throw new Error(`Expected 72 Listening and 72 Reading papers, found ${listeningPapers.length} and ${readingPapers.length}`);
  }
  const asrCache = await readJson(resolveAsrCache(asrCachePath));
  const catalog = {};
  for (const paper of listeningPapers) {
    for (let section = 1; section <= 4; section += 1) catalog[`${paper.id}::section::${section}`] = listeningEntry(paper, section, asrCache);
  }
  for (const paper of readingPapers) {
    const chunks = readingChunks(paper.readingPaper);
    for (let passage = 1; passage <= 3; passage += 1) catalog[`${paper.id}::section::${passage}`] = readingEntry(paper, passage, chunks.get(passage));
  }
  return catalog;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const generated = `${JSON.stringify(await generateCatalog({ asrCachePath: options.asrCache }), null, 2)}\n`;
  if (options.check) {
    const existing = (await readFile(options.output, "utf8")).replace(/\r\n?/g, "\n");
    if (existing !== generated) throw new Error(`${options.output} is not reproducible; run the generator and commit the result`);
    console.log(`PASS semantic topic catalog is reproducible (${Object.keys(JSON.parse(existing)).length} entries)`);
    return;
  }
  await writeFile(options.output, generated, "utf8");
  console.log(`Wrote ${Object.keys(JSON.parse(generated)).length} semantic topics to ${options.output}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
