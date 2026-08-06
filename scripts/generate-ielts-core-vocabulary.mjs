import { mkdir, writeFile } from "node:fs/promises";

const outputUrl = new URL("../public/data/ielts-core-vocabulary.json", import.meta.url);

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function fillTemplate(template, term) {
  return String(template || "")
    .replaceAll("{word}", term.word)
    .replaceAll("{meaning}", term.meaning);
}

function parseTerms(value) {
  return String(value || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [word, meaning, definition, collocations = ""] = line.split("|").map((item) => item.trim());
      if (!word || !meaning || !definition) throw new Error(`Invalid IELTS vocabulary line: ${line}`);
      return {
        word,
        meaning,
        definition,
        collocations: collocations.split(";").map((item) => item.trim()).filter(Boolean),
      };
    });
}

const groups = [
  {
    topic: "academic-core",
    label: "Academic Core",
    type: "term",
    note: "用于小作文趋势、阅读定位和大作文论证的高频学术表达。",
    example: "IELTS writers should use {word} precisely when building an argument.",
    translation: "雅思写作中应准确使用“{meaning}”来组织论证。",
    terms: parseTerms(`
significant|显著的，重要的|large or important enough to be noticed|significant increase;significant impact
approximately|大约，近似|used to show that a number is close but not exact|approximately half;approximately 30 percent
fluctuate|波动|to rise and fall irregularly over time|fluctuate slightly;fluctuate dramatically
proportion|比例|a part or share of a whole group or amount|a large proportion;the proportion of
whereas|然而，相比之下|used to compare two different facts or ideas|whereas others;whereas the figure for
consequently|因此，所以|as a result of something that happened before|consequently many;consequently this
inevitable|不可避免的|certain to happen and difficult to avoid|almost inevitable;an inevitable result
conventional|传统的，常规的|based on usual or traditional ways of doing things|conventional methods;conventional wisdom
enhance|提升，增强|to improve the quality or value of something|enhance performance;enhance quality
adapt|适应，调整|to change so that something works in a new situation|adapt to change;adapt quickly
evidence|证据|information or facts that support a claim or answer|strong evidence;supporting evidence
outweigh|超过，胜过|to be more important than another factor|outweigh the drawbacks;advantages outweigh
prioritise|优先考虑|to treat something as more important than other things|prioritise safety;prioritise education
obstacle|障碍，阻碍|something that makes progress difficult|major obstacle;overcome obstacles
interpret|理解，解释|to understand or explain the meaning of something|interpret data;interpret the results
    `),
  },
  {
    topic: "education-learning",
    label: "Education & Learning",
    type: "term",
    note: "用于教育公平、课程、考试、学校管理和学习方式类题目。",
    example: "A strong IELTS answer can discuss {word} when writing about schools or universities.",
    translation: "写学校或大学话题时，可以用“{meaning}”说明教育问题。",
    terms: parseTerms(`
curriculum|课程设置|the subjects and content taught in a school or course|national curriculum;broad curriculum
syllabus|教学大纲|a plan showing what will be taught in a course|course syllabus;exam syllabus
assessment|评估，考核|a way of judging knowledge, progress, or performance|continuous assessment;formal assessment
literacy|读写能力|the ability to read and write effectively|adult literacy;digital literacy
numeracy|数字能力|the ability to understand and use numbers|basic numeracy;numeracy skills
enrolment|入学，注册人数|the act or number of students joining a course|student enrolment;school enrolment
attendance|出勤，参加|being present at a school, class, or event|regular attendance;attendance rate
discipline|纪律，自律|controlled behaviour or training that builds self-control|school discipline;self-discipline
scholarship|奖学金|money given to support a student's education|full scholarship;scholarship scheme
qualification|资格，学历|an official record showing training or ability|academic qualification;professional qualification
tuition|学费，教学|teaching or the money paid for education|private tuition;tuition fees
lecture|讲座，授课|a formal talk given to teach a subject|university lecture;attend lectures
seminar|研讨课|a small class for discussion and deeper study|seminar discussion;weekly seminar
tutorial|辅导课|a lesson with individual or small-group guidance|tutorial support;online tutorial
compulsory|强制的，必修的|required by a rule or law|compulsory education;compulsory subjects
    `),
  },
  {
    topic: "technology-digital",
    label: "Technology & Digital Life",
    type: "term",
    note: "用于人工智能、隐私、线上服务、学习平台和工作自动化类题目。",
    example: "IELTS candidates can discuss {word} when explaining the benefits or risks of technology.",
    translation: "解释科技的好处或风险时，可以使用“{meaning}”。",
    terms: parseTerms(`
software|软件|programs and applications used by computers or devices|educational software;software update
hardware|硬件|the physical parts of a computer or device|computer hardware;hardware failure
algorithm|算法|a set of rules a computer follows to solve a problem|search algorithm;recommendation algorithm
automation|自动化|the use of machines or software to do tasks automatically|workplace automation;automation technology
digitalisation|数字化|the process of changing services or information into digital form|digitalisation of services;rapid digitalisation
network|网络|a connected system for communication, data, or people|mobile network;social network
platform|平台|a digital service or system where users interact|learning platform;online platform
database|数据库|an organised collection of stored information|student database;database security
interface|界面|the part of a system that users see and control|user interface;simple interface
storage|存储|space or systems used to keep data or materials|cloud storage;data storage
innovation|创新|a new idea, method, or product that brings improvement|technological innovation;encourage innovation
artificial intelligence|人工智能|computer systems that perform tasks requiring human-like thinking|artificial intelligence tools;AI development
privacy|隐私|the right to control personal information and personal space|online privacy;privacy protection
cybersecurity|网络安全|protection of computers, systems, and data from digital attacks|cybersecurity risk;cybersecurity policy
compatibility|兼容性|the ability of systems or people to work well together|software compatibility;device compatibility
    `),
  },
  {
    topic: "environment-climate",
    label: "Environment & Climate",
    type: "term",
    note: "用于污染、气候变化、资源利用、生态保护和可持续发展类题目。",
    example: "A clear IELTS paragraph can use {word} to explain an environmental cause or effect.",
    translation: "清晰段落可以用“{meaning}”说明环境原因或影响。",
    terms: parseTerms(`
pollution|污染|harmful substances or noise added to the environment|air pollution;pollution control
emission|排放|gas, heat, or radiation released into the air|carbon emission;vehicle emissions
biodiversity|生物多样性|the variety of living things in an area or ecosystem|protect biodiversity;loss of biodiversity
conservation|保护，保育|the protection of nature, resources, or cultural objects|wildlife conservation;conservation project
habitat|栖息地|the natural place where a plant or animal lives|natural habitat;destroy habitats
ecosystem|生态系统|living things and their environment working as a system|fragile ecosystem;marine ecosystem
renewable|可再生的|able to be replaced naturally or used without running out|renewable energy;renewable resources
sustainable|可持续的|able to continue without causing long-term damage|sustainable development;sustainable solution
recycling|回收利用|processing waste so materials can be used again|recycling scheme;household recycling
waste|废弃物，浪费|unwanted material or the poor use of resources|plastic waste;waste reduction
contamination|污染，沾染|the presence of harmful or unwanted substances|water contamination;soil contamination
drought|干旱|a long period with little or no rain|severe drought;drought conditions
flood|洪水|a large amount of water covering normally dry land|flash flood;flood risk
deforestation|森林砍伐|the large-scale removal of trees from forests|deforestation rate;reduce deforestation
deteriorate|恶化，变差|to become worse in quality or condition|deteriorate rapidly;conditions deteriorate
    `),
  },
  {
    topic: "health-lifestyle",
    label: "Health & Lifestyle",
    type: "term",
    note: "用于公共健康、饮食、运动、医疗服务和心理健康类题目。",
    example: "IELTS answers about health can use {word} to describe a problem or solution.",
    translation: "健康类答案可以用“{meaning}”描述问题或解决方案。",
    terms: parseTerms(`
obesity|肥胖|a medical condition involving excessive body fat|childhood obesity;obesity rate
hygiene|卫生|practices that keep people clean and prevent disease|personal hygiene;food hygiene
nutrition|营养|the food and substances needed for health and growth|good nutrition;balanced nutrition
exercise|运动，锻炼|physical activity done to improve health or fitness|regular exercise;daily exercise
vaccine|疫苗|a substance that helps the body resist a disease|vaccine programme;receive a vaccine
disease|疾病|an illness that affects people, animals, or plants|infectious disease;chronic disease
epidemic|流行病|a disease spreading quickly among many people|flu epidemic;epidemic outbreak
stress|压力|mental or emotional pressure caused by difficulty or demand|work stress;reduce stress
therapy|疗法，治疗|treatment for a physical or mental problem|physical therapy;talk therapy
treatment|治疗|medical care given to improve an illness or injury|medical treatment;effective treatment
prevention|预防|action taken to stop a problem or disease before it happens|disease prevention;prevention strategy
diagnosis|诊断|the process of identifying an illness or problem|early diagnosis;accurate diagnosis
recovery|恢复，康复|the process of becoming healthy or normal again|full recovery;speedy recovery
symptom|症状|a sign that shows a person may have an illness|common symptom;severe symptoms
wellbeing|身心健康，幸福感|general health, comfort, and life satisfaction|student wellbeing;mental wellbeing
    `),
  },
  {
    topic: "work-careers",
    label: "Work & Careers",
    type: "term",
    note: "用于就业、远程办公、职业选择、工资、培训和退休类题目。",
    example: "In work-related IELTS topics, {word} can help explain employment choices.",
    translation: "在工作类话题中，“{meaning}”可以帮助说明就业选择。",
    terms: parseTerms(`
employer|雇主|a person or organisation that hires workers|large employer;employer responsibility
employee|员工|a person who works for a company or organisation|full-time employee;employee benefits
recruitment|招聘|the process of finding and hiring new workers|recruitment process;online recruitment
promotion|晋升，推广|movement to a higher job or support for a product|job promotion;promotion opportunity
profession|职业，专业|a type of skilled work requiring training|medical profession;teaching profession
occupation|职业|a job or regular way of earning a living|manual occupation;professional occupation
workload|工作量|the amount of work a person has to do|heavy workload;manage workload
productivity|生产率，效率|the rate at which work or goods are produced|improve productivity;workplace productivity
salary|薪水|fixed regular payment for work|high salary;annual salary
contract|合同，合约|a formal agreement between people or organisations|employment contract;short-term contract
retirement|退休|the period or act of leaving work permanently|retirement age;early retirement
freelance|自由职业的|working for different clients rather than one employer|freelance work;freelance designer
teamwork|团队合作|the ability of people to work together effectively|good teamwork;teamwork skills
training|培训|the process of teaching practical skills or knowledge|staff training;vocational training
vacancy|空缺职位|a job that is available for someone to take|job vacancy;fill a vacancy
    `),
  },
  {
    topic: "society-community",
    label: "Society & Community",
    type: "term",
    note: "用于社会公平、社区服务、贫富差距、公共安全和公民责任类题目。",
    example: "A social-issues paragraph can use {word} to explain how people live together.",
    translation: "社会类段落可以用“{meaning}”说明人们如何共同生活。",
    terms: parseTerms(`
community|社区，群体|people living in the same area or sharing interests|local community;community support
inequality|不平等|an unfair difference in opportunity, wealth, or status|income inequality;social inequality
welfare|福利，福祉|support or wellbeing provided for people in need|social welfare;welfare system
charity|慈善机构，慈善|help given to people who need it|charity work;donate to charity
volunteer|志愿者|a person who works without being paid|community volunteer;volunteer programme
resident|居民|a person who lives in a particular place|local resident;city residents
population|人口|the number of people living in a place|ageing population;urban population
safety|安全|protection from danger, harm, or risk|public safety;road safety
poverty|贫困|the condition of having too little money or resources|extreme poverty;poverty reduction
crime|犯罪|illegal behaviour punishable by law|violent crime;crime prevention
responsibility|责任|a duty to do something or be accountable|social responsibility;personal responsibility
cooperation|合作|working together for a shared purpose|international cooperation;close cooperation
fairness|公平|the quality of treating people equally and reasonably|basic fairness;fairness in society
inclusion|包容，纳入|the practice of involving people equally|social inclusion;inclusive education
solidarity|团结，互助|support among people with shared interests or problems|public solidarity;community solidarity
    `),
  },
  {
    topic: "government-law",
    label: "Government & Law",
    type: "term",
    note: "用于政府职责、法律法规、公共资金、权利义务和政策效果类题目。",
    example: "IELTS essays about policy can use {word} to describe government action.",
    translation: "政策类作文可以用“{meaning}”描述政府行为。",
    terms: parseTerms(`
policy|政策|a plan of action used by a government or organisation|public policy;education policy
legislation|立法，法律|laws made by a government or parliament|new legislation;environmental legislation
regulation|规定，监管|an official rule that controls behaviour or activity|strict regulation;government regulation
authority|权威，主管部门|power or an official organisation with legal control|local authority;legal authority
governance|治理|the way a country or organisation is managed|good governance;corporate governance
parliament|议会|the group of elected people who make laws|national parliament;parliament debate
court|法院|a place or institution where legal cases are judged|criminal court;court decision
justice|正义，司法|fair treatment under the law|social justice;justice system
penalty|处罚，罚金|a punishment for breaking a rule or law|financial penalty;severe penalty
tax|税|money people or businesses pay to the government|income tax;tax revenue
allocate|分配，拨出|to give resources or money for a particular purpose|allocate resources;allocate funding
subsidise|补贴，资助|to support something financially, often by government money|subsidise transport;subsidise healthcare
reform|改革|a change made to improve a system or law|legal reform;education reform
enforcement|执行，执法|the process of making people obey rules or laws|law enforcement;strict enforcement
corruption|腐败|dishonest or illegal use of power for personal gain|political corruption;fight corruption
    `),
  },
  {
    topic: "culture-media",
    label: "Culture & Media",
    type: "term",
    note: "用于传统、媒体影响、广告、文化身份、语言和娱乐类题目。",
    example: "Culture and media answers can use {word} to explain values or influence.",
    translation: "文化和媒体类答案可以用“{meaning}”解释价值观或影响。",
    terms: parseTerms(`
tradition|传统|a belief or practice passed down through generations|family tradition;cultural tradition
heritage|遗产，传统文化|valuable history, culture, or buildings from the past|cultural heritage;world heritage
festival|节日|a special public event or celebration|music festival;traditional festival
identity|身份认同|the qualities that make a person or group distinct|national identity;cultural identity
diversity|多样性|the presence of different types of people or things|cultural diversity;social diversity
entertainment|娱乐|activities that amuse or interest people|mass entertainment;entertainment industry
literature|文学|written artistic works such as novels, poems, and plays|classic literature;children's literature
journalism|新闻业|the work of collecting and reporting news|investigative journalism;online journalism
broadcast|广播，播出|to send audio or video programmes to the public|live broadcast;broadcast media
advertising|广告|paid messages designed to promote products or ideas|online advertising;advertising campaign
celebrity|名人|a person who is widely known by the public|celebrity culture;celebrity endorsement
audience|观众，受众|the people who watch, read, or listen to something|target audience;large audience
documentary|纪录片|a film or programme giving factual information|nature documentary;documentary film
censorship|审查制度|control or banning of information, media, or art|media censorship;internet censorship
language|语言|a system of words used for communication|foreign language;language learning
    `),
  },
  {
    topic: "economy-business",
    label: "Economy & Business",
    type: "term",
    note: "用于消费、企业、贸易、投资、通货膨胀和经济变化类题目。",
    example: "Economic IELTS topics can use {word} to describe costs, markets, or growth.",
    translation: "经济类话题可以用“{meaning}”描述成本、市场或增长。",
    terms: parseTerms(`
economy|经济|the system of production, trade, and money in a country|national economy;global economy
inflation|通货膨胀|a general rise in prices over time|high inflation;inflation rate
consumer|消费者|a person who buys goods or services|consumer behaviour;consumer demand
market|市场|a system or place where goods and services are bought and sold|global market;labour market
investment|投资|money or resources used to make future benefits|foreign investment;public investment
profit|利润|money gained after costs are removed|make a profit;profit margin
revenue|收入，收益|money received by a business or government|tax revenue;annual revenue
expenditure|支出|money spent by a person, business, or government|public expenditure;household expenditure
demand|需求|the desire and ability to buy goods or services|consumer demand;strong demand
supply|供应|the amount of something available for use or sale|food supply;limited supply
trade|贸易|buying, selling, or exchanging goods and services|international trade;free trade
entrepreneur|企业家，创业者|a person who starts and runs a business|young entrepreneur;successful entrepreneur
budget|预算|a plan for how money will be spent|government budget;limited budget
recession|经济衰退|a period when economic activity decreases|economic recession;deep recession
wealth|财富|a large amount of money, property, or resources|national wealth;wealth gap
    `),
  },
  {
    topic: "travel-transport",
    label: "Travel & Transport",
    type: "term",
    note: "用于交通拥堵、公共交通、旅游、城市出行和基础设施类题目。",
    example: "Transport essays can use {word} to explain movement, access, or tourism.",
    translation: "交通类作文可以用“{meaning}”解释出行、可达性或旅游。",
    terms: parseTerms(`
commute|通勤|to travel regularly between home and work or school|daily commute;long commute
vehicle|车辆|a machine used to carry people or goods|private vehicle;electric vehicle
traffic|交通，车流|vehicles moving on roads or the movement itself|heavy traffic;traffic flow
congestion|拥堵|too much traffic or crowding in one place|traffic congestion;urban congestion
transport|交通运输|systems or vehicles used for moving people or goods|public transport;transport system
airport|机场|a place where aircraft take off and land|international airport;airport security
route|路线|a way or path from one place to another|bus route;safe route
navigation|导航|finding or planning a route from one place to another|GPS navigation;navigation app
fare|票价|the price paid to travel by bus, train, taxi, or plane|bus fare;affordable fare
passenger|乘客|a person travelling in a vehicle but not driving it|rail passengers;airline passenger
tourism|旅游业|travel for pleasure and the industry supporting it|mass tourism;tourism industry
destination|目的地|the place someone is travelling to|tourist destination;popular destination
accommodation|住宿|a place where travellers can stay|hotel accommodation;student accommodation
journey|旅程|travel from one place to another|long journey;return journey
motorway|高速公路|a wide road designed for fast long-distance traffic|busy motorway;motorway network
    `),
  },
  {
    topic: "science-research",
    label: "Science & Research",
    type: "term",
    note: "用于阅读科技文章、实验研究、数据解释和学术证据类题目。",
    example: "Reading and writing tasks can use {word} when discussing research or evidence.",
    translation: "读写任务讨论研究或证据时，可以使用“{meaning}”。",
    terms: parseTerms(`
experiment|实验|a test done to discover or prove something|scientific experiment;controlled experiment
theory|理论|an explanation based on evidence and reasoning|scientific theory;learning theory
hypothesis|假设|an idea tested through research or observation|test a hypothesis;research hypothesis
variable|变量|a factor that can change in a study or situation|independent variable;control variable
method|方法|a planned way of doing something|research method;teaching method
sample|样本|a selected part of a larger group used for study|small sample;representative sample
analysis|分析|careful study of information to understand meaning|data analysis;detailed analysis
result|结果|what happens or is produced by an action or study|research result;final result
conclusion|结论|a judgement reached after considering evidence|draw a conclusion;clear conclusion
observe|观察|to notice or watch something carefully|observe behaviour;observe changes
measure|测量，衡量|to find the size, amount, or degree of something|measure progress;measure accurately
research|研究|systematic investigation to discover new facts|academic research;market research
laboratory|实验室|a room or place equipped for scientific work|school laboratory;laboratory test
accuracy|准确性|the quality of being correct or exact|improve accuracy;high accuracy
reliable|可靠的|able to be trusted to be accurate or consistent|reliable data;reliable source
    `),
  },
  {
    topic: "command-words",
    label: "Question Command Words",
    type: "command",
    note: "用于理解雅思题干要求，尤其是写作、阅读解释和口语追问。",
    example: "In an IELTS question, {word} tells the candidate what kind of answer is expected.",
    translation: "在雅思题干中，“{meaning}”提示考生应该怎样作答。",
    terms: parseTerms(`
analyse|分析|to examine something carefully by separating it into parts|analyse the chart;analyse the reasons
compare|比较|to show similarities and differences between things|compare two views;compare figures
contrast|对比|to emphasise differences between things|contrast the data;contrast opinions
discuss|讨论|to consider different ideas before giving a view|discuss both views;discuss the issue
evaluate|评估|to judge the value or importance of something|evaluate the evidence;evaluate a policy
justify|证明合理，说明理由|to give reasons showing that something is right or reasonable|justify your answer;justify a decision
explain|解释|to make something clear by giving reasons or details|explain why;explain the process
describe|描述|to say what something is like or what happened|describe the trend;describe the diagram
summarise|总结|to give the main points without unnecessary detail|summarise the information;summarise the passage
outline|概述|to give the main features or steps briefly|outline the causes;outline a solution
identify|识别，指出|to find or name something clearly|identify the problem;identify key features
classify|分类|to put things into groups according to features|classify examples;classify information
illustrate|说明，举例说明|to explain by giving examples or using a diagram|illustrate a point;illustrate the process
assess|评定，判断|to judge the quality, importance, or value of something|assess the impact;assess performance
define|定义|to state the exact meaning of a word or idea|define a term;define the concept
    `),
  },
  {
    topic: "linking-phrases",
    label: "Linking & Exam Phrases",
    type: "phrase",
    note: "用于写作衔接、口语组织答案和阅读题干句式理解。",
    example: "A clear IELTS response can use \"{word}\" to connect ideas smoothly.",
    translation: "清晰的雅思答案可以用“{meaning}”顺畅连接观点。",
    terms: parseTerms(`
on the one hand|一方面|used to introduce one side of an argument|on the one hand it is useful
on the other hand|另一方面|used to introduce the opposite side of an argument|on the other hand it can be costly
in contrast|相比之下|used to show a clear difference|in contrast to;by contrast
as a result|结果，因此|used to show the consequence of something|as a result of;as a result many
to some extent|在某种程度上|used to show partial agreement or limited truth|agree to some extent;true to some extent
from my perspective|在我看来|used to introduce a personal opinion|from my perspective this is fair
in the long run|从长远来看|used to talk about future results|in the long run;long-run benefits
a wide range of|广泛的，多种多样的|used to describe many different types|a wide range of services;a wide range of skills
play a role in|在……中起作用|to have an influence on a situation|play a role in education;play a key role
be responsible for|对……负责，是……的原因|to have a duty or be the cause of something|be responsible for safety;be responsible for pollution
be likely to|很可能|used to describe a probable future result|be likely to increase;be likely to happen
it is worth noting that|值得注意的是|used to highlight an important point|it is worth noting that this figure rose
take into account|考虑到|to consider something before deciding|take costs into account;take evidence into account
in terms of|就……而言|used to specify the aspect being discussed|in terms of cost;in terms of health
lead to|导致|to cause something to happen or develop|lead to problems;lead to improvement
    `),
  },
];

const items = groups.flatMap((group) => group.terms.map((term) => ({
  id: `ielts-${group.topic}-${slug(term.word)}`,
  subject: "ielts",
  topic: group.topic,
  topicLabel: group.label,
  type: group.type,
  word: term.word,
  meaning: term.meaning,
  definition: term.definition,
  cn: group.note,
  example: fillTemplate(group.example, term),
  translation: fillTemplate(group.translation, term),
  collocations: term.collocations,
})));

const seen = new Set();
for (const item of items) {
  if (seen.has(item.id)) throw new Error(`Duplicate IELTS vocabulary id: ${item.id}`);
  seen.add(item.id);
}

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify({
  schemaVersion: "ielts-core-vocabulary.v1",
  catalogVersion: "2026-08-06",
  itemCount: items.length,
  items,
}, null, 2)}\n`, "utf8");

console.log(`Generated IELTS Core vocabulary catalog: ${items.length} items`);
