import { mkdir, writeFile } from "node:fs/promises";

const outputUrl = new URL("../public/data/alevel-stem-vocabulary.json", import.meta.url);

function parseTerms(value) {
  return String(value || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [word, meaning, definition, collocations = "", formula = "", knowledgePoint = ""] = line.split("|").map((item) => item.trim());
      return {
        word,
        meaning,
        definition,
        collocations: collocations.split(";").map((item) => item.trim()).filter(Boolean),
        formula,
        knowledgePoint,
      };
    });
}

function customTerms(entries) {
  return entries.map((entry) => ({
    word: entry.word,
    meaning: entry.meaning,
    definition: entry.definition,
    collocations: Array.isArray(entry.collocations) ? entry.collocations.filter(Boolean) : [],
    formula: entry.formula || "",
    knowledgePoint: entry.knowledgePoint || "",
  }));
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

const topicStudyGuides = {
  "physics:measurement-and-practical": {
    concept: "本专题的概念必须落到仪器读数、变量控制、图像处理、单位和不确定度，不能只背名词。",
    steps: ["确认被测量量和所用仪器", "记录原始读数、单位和分度值", "选择重复测量、图像或不确定度方法", "用数量级、单位和误差范围检查结论"],
    examFocus: "常见考法是解释实验设计、从图像求斜率或截距、计算不确定度，并评价结果是否支持模型。",
    commonMistake: "把精密度当准确度，或只写改进措施却不说明它减少了哪一种误差。",
  },
  "physics:mechanics": {
    concept: "力学词汇要和研究对象、矢量方向、受力图以及运动学、牛顿定律、能量或动量模型对应。",
    steps: ["选定研究对象并画受力图", "规定正方向并写出已知量", "判断使用运动学、F = ma、能量还是动量", "检查方向、单位、边界条件和答案大小"],
    examFocus: "常见考法是从图像或情境建立方程，解释力如何改变运动，并给出带方向和单位的结果。",
    commonMistake: "把某一个力当成合力，忽略矢量方向，或在条件不满足时机械套用 SUVAT。",
  },
  "physics:materials": {
    concept: "材料题要把宏观性质与微观结构、受力面积、形变量和应力-应变图联系起来。",
    steps: ["识别几何量、载荷和材料状态", "统一长度、面积和力的单位", "选择密度、压力、应力、应变或模量关系", "从图像判断弹性区、塑性区和断裂"],
    examFocus: "常见考法是计算应力、应变和 Young 模量，解释材料选择，并读取力-伸长或应力-应变图。",
    commonMistake: "混淆 stress 与 force、strain 与 extension，或忘记截面积和原长必须用 SI 单位。",
  },
  "physics:waves-and-optics": {
    concept: "波动概念要同时理解波形、相位、频率、波长、能量传播以及衍射、干涉和折射条件。",
    steps: ["判断波型和传播介质", "标出频率、波长、相位或光程差", "选择 v = f lambda 或相位/路径差条件", "用波面、图像或强度分布解释结果"],
    examFocus: "常见考法是从图像求波量、解释干涉与衍射条件，或比较改变频率、缝宽和介质后的图样。",
    commonMistake: "把波的传播速度与质点振动速度混淆，或只说图样改变却不说明波长、相位或路径差。",
  },
  "physics:electricity": {
    concept: "电学词汇必须落到电荷流动、能量转移、元件特性、回路连接和 Kirchhoff 定律。",
    steps: ["标出电流方向、节点和回路", "判断串并联关系和元件特性", "选择 Q = It、V = W/Q、R = V/I 或功率关系", "用单位、极限情况和能量守恒检查"],
    examFocus: "常见考法是分析 I-V 图、组合电阻、内阻和分压，并解释电流、电势差与功率变化。",
    commonMistake: "把电流当成被元件消耗的量，混淆 emf 与 terminal p.d.，或在非欧姆元件上直接假设 R 不变。",
  },
  "physics:thermal-physics": {
    concept: "热学词汇要连接粒子运动、内能、温度、状态变化、气体模型和能量传递。",
    steps: ["确定系统、状态和能量传递方式", "区分温度、内能和热量", "选择 Q = mc deltaT、Q = mL 或气体关系", "检查状态条件、绝对温标和能量方向"],
    examFocus: "常见考法是解释粒子层变化、计算加热或相变能量，并使用理想气体模型比较状态。",
    commonMistake: "把温度说成物体含有的热量，使用摄氏温度代入气体公式，或忽略相变时温度保持不变。",
  },
  "physics:fields-and-electromagnetism": {
    concept: "场的概念要区分场强与势、标量与矢量、源与试探物体，并明确公式的几何和近似条件。",
    steps: ["识别场源、试探物体和参考零点", "判断需要场强、势、力还是能量", "选择点源、匀强场或电磁感应模型", "用方向、符号、单位和距离变化检查"],
    examFocus: "常见考法是画场线、比较势和场强、计算带电粒子受力，或解释磁通量变化产生的感应效应。",
    commonMistake: "混淆 electric potential 与 potential energy，忽略场强方向，或对非点源情形错误使用反平方公式。",
  },
  "physics:particle-and-nuclear": {
    concept: "粒子与核物理词汇要联系核组成、守恒定律、质量亏损、衰变统计和探测证据。",
    steps: ["写出粒子或核反应并守恒电荷与核子数", "识别能量、动量和静质量关系", "选择衰变、半衰期或结合能模型", "检查单位转换和概率意义"],
    examFocus: "常见考法是补全核方程、解释稳定性、计算半衰期或结合能，并从轨迹和探测结果识别粒子。",
    commonMistake: "把活度当剩余核数，忘记 u 与 MeV/c^2 的转换，或认为随机衰变意味着半衰期会改变。",
  },
  "physics:oscillations": {
    concept: "振动题要同时掌握回复力、位移-速度-加速度相位关系、能量交换、阻尼和共振。",
    steps: ["确认平衡位置、振幅和位移方向", "判断是否满足 a 与 -x 成正比", "使用角频率、周期或能量关系", "从图像检查相位、端点和平衡点特征"],
    examFocus: "常见考法是证明简谐条件、读取振动图像、计算周期和能量，并解释阻尼或共振。",
    commonMistake: "把速度最大点放在端点，忽略 a = -omega^2 x 的负号，或把任意周期运动都称为 SHM。",
  },
  "physics:astrophysics": {
    concept: "天体物理词汇要结合观测量、光谱、亮度、距离尺度、恒星演化和模型假设。",
    steps: ["确定观测量与需要推断的物理量", "选择亮度、通量、光谱或轨道关系", "统一天文单位并注明假设", "用数量级和恒星演化阶段检查"],
    examFocus: "常见考法是用光谱或亮度数据推断温度、速度和距离，并解释恒星结构与演化。",
    commonMistake: "混淆 luminosity 与 apparent brightness，忽略反平方关系，或把红移直接等同于天体颜色变红。",
  },
  "mathematics:algebra-and-functions": {
    concept: "代数与函数词汇必须落到定义域、值域、映射、方程等价变形和图像特征。",
    steps: ["写清变量范围和限制条件", "把文字条件翻译成函数或方程", "选择因式分解、代换、恒等变形或图像方法", "代回并检查增根、漏根和定义域"],
    examFocus: "常见考法是证明恒等式、求根与参数范围、复合或反函数，以及解释图像变换。",
    commonMistake: "只做形式变形却不检查定义域，混淆 f(g(x)) 与 g(f(x))，或除以可能为零的式子。",
  },
  "mathematics:calculus": {
    concept: "微积分词汇要联系变化率、切线、面积、累积量、极值和微分方程，而不是只记公式。",
    steps: ["确认要求的是变化率、极值、面积还是模型", "选择正确求导或积分规则", "完整写出链式、乘积、分部或代换步骤", "用边界、单位和导数符号解释答案"],
    examFocus: "常见考法是求切线与驻点、判断单调和极值、计算定积分，并由微分方程解释变化过程。",
    commonMistake: "漏掉链式法则因子、定积分不代上下限、把常数项丢失，或只给驻点不判断性质。",
  },
  "mathematics:trigonometry-and-vectors": {
    concept: "三角与向量词汇要连接方向、分量、恒等式、周期性、几何关系和标量积。",
    steps: ["画图并确定角度范围或向量方向", "写出分量、单位向量或三角关系", "选择恒等式、正余弦定理或点积", "检查象限、周期、精确值和向量方向"],
    examFocus: "常见考法是解三角方程、证明恒等式、求向量模和夹角，以及判断平行或垂直。",
    commonMistake: "忽略角度范围产生漏解，混淆向量与其模，或认为向量运算顺序可以随意交换。",
  },
  "mathematics:coordinate-geometry": {
    concept: "解析几何词汇要把代数方程与点、直线、圆、切线和轨迹的几何意义对应。",
    steps: ["从图形标出点、斜率和已知条件", "选择距离、中点、直线或圆方程", "联立并解释交点或切线条件", "检查坐标、象限和几何合理性"],
    examFocus: "常见考法是求直线与圆的交点、切线、轨迹和参数条件，并证明几何关系。",
    commonMistake: "只得到代数解却不解释几何意义，斜率垂直条件写错，或漏掉两组交点。",
  },
  "mathematics:statistics-and-probability": {
    concept: "统计与概率词汇要明确随机变量、分布条件、样本空间、参数和结论的语境。",
    steps: ["定义事件或随机变量并写清条件", "判断独立、条件概率或适用分布", "选择精确、累计或近似计算", "用题目语境解释概率、检验和结论"],
    examFocus: "常见考法是条件概率、二项/正态分布、期望方差和假设检验，并要求用语境作结论。",
    commonMistake: "把互斥当独立，at least 与 at most 方向读反，或说接受原假设而不是证据不足以拒绝。",
  },
  "mathematics:mechanics": {
    concept: "数学力学词汇要把题干假设转成粒子模型、受力方程、运动约束和可解的标量关系。",
    steps: ["翻译 light、smooth、inextensible 等模型假设", "画受力图并规定正方向", "为每个物体写运动或平衡方程", "联立、检查约束和判断答案是否物理可行"],
    examFocus: "常见考法是连接粒子、斜面、摩擦、碰撞和变力模型，要求完整列式与解释。",
    commonMistake: "忽略绳约束或摩擦方向，把内力重复计入整体系统，或得到负值后不解释方向。",
  },
  "chemistry:atomic-and-quantitative": {
    concept: "定量化学要从粒子数、物质的量和配平方程建立比例，再连接质量、浓度和气体体积。",
    steps: ["写出粒子类型和已知量", "换算为 mol 并统一体积单位", "使用配平方程的化学计量比", "换回目标量并检查有效数字"],
    examFocus: "常见考法是经验式、滴定、限量试剂、产率和气体计算，得分点在清楚的 mole ratio。",
    commonMistake: "直接比较质量而不先转 mol，忽略粒子类型，或把 cm^3 未换成 dm^3 就代入浓度公式。",
  },
  "chemistry:bonding-reactions": {
    concept: "结构与反应题要把电子结构、键合、分子形状、极性、氧化数和宏观性质连接起来。",
    steps: ["画出价电子或结构式", "判断键型、电子对和分子形状", "用作用力或电子转移解释性质与反应", "检查电荷、氧化数和方程配平"],
    examFocus: "常见考法是比较熔沸点、导电性和溶解性，判断氧化还原，并解释催化剂和反应路径。",
    commonMistake: "把分子内共价键与分子间作用力混淆，或用键极性直接断言整个分子一定极性。",
  },
  "chemistry:organic-chemistry": {
    concept: "有机化学词汇要落实到官能团、试剂与条件、电子对移动、产物结构和异构关系。",
    steps: ["识别官能团和反应中心", "写出试剂、条件和反应类型", "用弯箭表示电子对来源与去向", "画完整产物并检查区域/立体或结构异构"],
    examFocus: "常见考法是反应路线、机理、结构鉴定、异构体和聚合物，答案必须包含正确结构与条件。",
    commonMistake: "弯箭从电荷而非电子对出发，漏写条件，或只写产物名称却没有结构式。",
  },
  "chemistry:energetics-kinetics-equilibrium": {
    concept: "能量、速率和平衡题要区分热力学与动力学，并用粒子碰撞、能量路径和动态平衡解释。",
    steps: ["判断题目问焓变、速率还是平衡位置", "选择 Hess、速率方程或 Kc/Q 模型", "写出条件变化的作用链", "检查符号、单位、状态和催化剂是否改变平衡"],
    examFocus: "常见考法是 Hess 循环、活化能图、速率数据和 Le Chatelier 分析，并评价温度压力条件。",
    commonMistake: "认为催化剂改变 Kc 或平衡位置，反转方程时忘改焓变符号，或把速率快等同于产率高。",
  },
  "chemistry:analysis-and-practical": {
    concept: "分析与实验词汇要连接可观察证据、仪器原理、校准、分离过程和数据可靠性。",
    steps: ["明确待检物和可测信号", "选择定性检验或定量仪器", "写出关键操作、变量和安全要求", "用标准、重复结果或谱图判断结论"],
    examFocus: "常见考法是滴定、色谱、质谱、红外和实验改进，答案要给出现象、计算或峰的证据。",
    commonMistake: "只写仪器名称没有说明如何判断，色谱比较时忽略条件，或用单次异常读数得出结论。",
  },
  "economics:microeconomics": {
    concept: "微观经济词汇要通过假设、曲线移动、价格数量变化、福利和市场失灵形成完整因果链。",
    steps: ["定义市场、主体和其他条件不变假设", "判断沿曲线移动还是整条曲线移动", "画图并标出均衡、福利或弹性", "解释赢家、输家、效率和政策副作用"],
    examFocus: "常见考法是供需、弹性、税补贴、外部性和市场结构，要求图像加因果解释与评价。",
    commonMistake: "把需求量变化说成需求变化，只描述图线方向没有因果链，或不区分私人和社会成本。",
  },
  "economics:macroeconomics": {
    concept: "宏观经济词汇要连接指标定义、AD/AS 传导、政策目标、短长期权衡和数据局限。",
    steps: ["定义指标并判断名义或实际值", "写出消费投资政府和净出口的传导链", "用 AD/AS 或劳动力市场图解释", "评价时滞、乘数、预期和供给约束"],
    examFocus: "常见考法是增长、通胀、失业和政策组合，答案要区分短期效果、长期效果和利益相关者。",
    commonMistake: "把经济增长等同生活水平提高，混淆需求拉动与成本推动通胀，或只列政策不解释传导。",
  },
  "economics:market-structures-and-labour": {
    concept: "企业与劳动力市场词汇要联系市场集中、进入壁垒、成本收益、定价行为和效率。",
    steps: ["识别市场结构和关键假设", "分析企业目标、成本收益与竞争反应", "画出合适企业或劳动力市场图", "评价消费者、工人、企业和政府影响"],
    examFocus: "常见考法是垄断、寡头、价格歧视、工资和工会，要求理论结合行业情境。",
    commonMistake: "看到少数企业就直接断言串谋，忽略进入壁垒和相互依赖，或只谈价格不谈非价格竞争。",
  },
  "economics:macro-policy-and-trade": {
    concept: "宏观政策与贸易词汇要写清政策工具、传导机制、汇率/贸易渠道以及短长期限制。",
    steps: ["明确政策目标、工具和经济初始状态", "写出对 AD、SRAS 或 LRAS 的传导", "分析增长通胀就业和外部平衡", "评价时滞、债务、挤出、报复和全球环境"],
    examFocus: "常见考法是财政货币供给政策、汇率和贸易保护，评价必须基于题目数据与经济周期。",
    commonMistake: "只写扩张或紧缩结论，没有中间传导链，或认为关税一定改善所有本国主体福利。",
  },
  "chemistry:chemistry-question-sentences": {
    concept: "化学题干句必须先拆出物质、条件、操作和目标量，再决定使用粒子模型、方程、机理还是实验方法。",
    steps: ["圈出物质、状态符号和实验条件", "把题干动作词转成计算、结构、机理或评价任务", "写出配平方程或必要模型", "检查单位、有效数字、观察现象和化学用语"],
    examFocus: "常见考法是把一整句实验或计算限制转化为方程、mole ratio、机理箭头或可观察证据。",
    commonMistake: "只逐字翻译题干，没有识别 limiting reagent、excess、standard conditions 等条件对解法的限制。",
  },
  "economics:economics-question-sentences": {
    concept: "经济题干句要先识别市场、时期、利益相关者和评价范围，再把数据材料转成一条可检验的因果链。",
    steps: ["圈出经济主体、市场和时间范围", "识别题目要求的理论、图像或政策", "用材料数据建立因果链", "加入条件、利益相关者和短长期评价"],
    examFocus: "常见考法是要求根据 extract、figure 或 case study 分析变化并评价结论是否在给定条件下成立。",
    commonMistake: "背诵通用理论却不引用材料，或给出绝对结论而没有讨论前提、时滞和利益相关者。",
  },
  "economics:extra-market-terms": {
    concept: "市场扩展术语要与企业行为、成本收益、竞争程度和资源配置结果相连，不能停留在名词定义。",
    steps: ["定义术语并指出适用市场", "建立企业或消费者行为的因果链", "用图像或数据说明价格、数量和福利变化", "评价假设、时间范围和不同利益相关者"],
    examFocus: "常见考法是把市场行为与效率、公平、创新、就业或监管效果联系起来，并结合行业材料评价。",
    commonMistake: "只描述企业行为，没有解释它为何发生以及对消费者、竞争者和社会福利的影响。",
  },
};

const subjectStudyGuides = {
  physics: topicStudyGuides["physics:measurement-and-practical"],
  mathematics: topicStudyGuides["mathematics:algebra-and-functions"],
  chemistry: topicStudyGuides["chemistry:bonding-reactions"],
  economics: topicStudyGuides["economics:microeconomics"],
};

function studyGuideFor(group) {
  return topicStudyGuides[`${group.subject}:${group.topic}`] || subjectStudyGuides[group.subject] || {
    concept: "把术语放回题目条件中，判断它控制的是定义、计算、证据还是解释。",
    steps: ["翻译术语和限制条件", "选择对应定义或模型", "写出计算或解释链", "检查答案是否回应题目动词"],
    examFocus: "题目会通过定义、应用、计算或解释检验对术语的真实理解。",
    commonMistake: "只给中文翻译，没有把术语转化为可得分的步骤或证据。",
  };
}

function fillStudyText(value, group, term) {
  return String(value || "")
    .replaceAll("{word}", term.word)
    .replaceAll("{meaning}", term.meaning)
    .replaceAll("{topic}", group.label);
}

const groups = [
  {
    subject: "physics", topic: "measurement-and-practical", label: "Measurement & Practical Skills",
    note: "用于测量、实验设计、数据处理和误差分析题。",
    example: "State how {word} should be determined from the experimental data.",
    translation: "说明应如何根据实验数据确定{meaning}。",
    terms: parseTerms(`
scalar|标量|a quantity with magnitude but no direction|scalar quantity;scalar measurement
vector|矢量|a quantity with both magnitude and direction|vector quantity;resultant vector
SI unit|国际单位制单位|a standard unit in the International System of Units|SI base unit;convert to SI units
base unit|基本单位|an independently defined SI unit|seven base units;express in base units
derived unit|导出单位|a unit formed from combinations of base units|derived SI unit;unit derivation
dimension|量纲|the physical nature of a quantity expressed using base quantities|dimensional analysis;dimensionally consistent
precision|精密度|the closeness of repeated measurements to one another|high precision;measurement precision
accuracy|准确度|the closeness of a measured value to the accepted value|measurement accuracy;improve accuracy
uncertainty|不确定度|an estimated range within which the true value is expected to lie|measurement uncertainty;uncertainty range
absolute uncertainty|绝对不确定度|uncertainty stated in the same unit as the measurement|absolute uncertainty of 0.1 cm
percentage uncertainty|百分比不确定度|absolute uncertainty divided by the measured value and multiplied by 100%|calculate percentage uncertainty
random error|随机误差|unpredictable variation that causes readings to scatter|reduce random error;random variation
systematic error|系统误差|a consistent bias that shifts readings in one direction|identify systematic error;systematic bias
zero error|零点误差|a non-zero reading shown when the true input is zero|correct for zero error
calibration|校准|comparison and adjustment of an instrument against a known standard|calibration curve;calibrate the sensor
resolution|分辨率|the smallest change an instrument can detect|instrument resolution;higher resolution
sensitivity|灵敏度|the change in instrument output per unit change in input|sensor sensitivity;sensitivity of the balance
repeatability|重复性|agreement between results obtained by the same method and operator|repeatable readings;check repeatability
reproducibility|再现性|agreement between results obtained using changed methods or operators|reproducible result;test reproducibility
anomalous result|异常结果|a result that does not follow the pattern of the other data|identify an anomalous result
significant figures|有效数字|digits that communicate the precision of a measured value|three significant figures;appropriate significant figures
independent variable|自变量|the variable deliberately changed in an investigation|vary the independent variable
dependent variable|因变量|the variable measured in response to a change|measure the dependent variable
control variable|控制变量|a variable kept constant to make a test fair|keep control variables constant
best-fit line|最佳拟合线|a line that represents the overall trend of plotted data|draw a best-fit line
error bar|误差棒|a graphical representation of measurement uncertainty|plot error bars;overlapping error bars
gradient|斜率|the change in the vertical quantity divided by the change in the horizontal quantity|calculate the gradient;gradient triangle
intercept|截距|the coordinate where a graph crosses an axis|y-intercept;non-zero intercept
logarithmic scale|对数刻度|a scale in which equal distances represent equal ratios|logarithmic axis;log scale
data logger|数据记录器|an electronic device that records measurements automatically|connect a data logger;sampling interval
    `),
  },
  {
    subject: "physics", topic: "mechanics", label: "Mechanics",
    note: "用于运动学、动力学、能量、动量和圆周运动题。",
    example: "Calculate the {word} of the object and give an appropriate unit.",
    translation: "计算物体的{meaning}，并写出合适的单位。",
    terms: parseTerms(`
distance|路程|the total length of the path travelled|total distance;distance travelled
displacement|位移|the change in position in a specified direction|resultant displacement;displacement-time graph
speed|速率|distance travelled per unit time|average speed;instantaneous speed
velocity|速度|rate of change of displacement|constant velocity;velocity vector
acceleration|加速度|rate of change of velocity|constant acceleration;acceleration due to gravity
deceleration|减速度|acceleration opposite to the direction of motion|uniform deceleration
instantaneous velocity|瞬时速度|velocity at a particular instant|instantaneous velocity from a tangent
average velocity|平均速度|total displacement divided by total time|calculate average velocity
free fall|自由落体|motion under the effect of gravity alone|object in free fall
projectile motion|抛体运动|two-dimensional motion under gravity with negligible air resistance|projectile trajectory;horizontal projectile
trajectory|轨迹|the path followed by a moving object|parabolic trajectory
resultant force|合力|the vector sum of all forces acting on an object|resultant force is zero
equilibrium|平衡|a state in which resultant force and resultant moment are zero|static equilibrium;translational equilibrium
inertia|惯性|the tendency of an object to resist a change in motion|inertial mass;law of inertia
mass|质量|a measure of inertia and the amount of matter|inertial mass;mass in kilograms
weight|重力|the gravitational force acting on a mass|weight equals mg;apparent weight
momentum|动量|the product of mass and velocity|linear momentum;conservation of momentum
impulse|冲量|force multiplied by time and equal to change in momentum|impulse-momentum relation
conservation of momentum|动量守恒|the total momentum of an isolated system remains constant|apply conservation of momentum
Newton's first law|牛顿第一定律|an object remains at rest or in uniform motion unless acted on by a resultant force|state Newton's first law
Newton's second law|牛顿第二定律|resultant force equals rate of change of momentum|apply Newton's second law
Newton's third law|牛顿第三定律|interacting bodies exert equal and opposite forces on each other|Newton's third-law pair
drag|阻力|a resistive force exerted by a fluid on a moving object|air resistance;drag force
friction|摩擦力|a force opposing relative motion between surfaces|limiting friction;frictional force
terminal velocity|终端速度|constant velocity reached when resistive force balances driving force|reach terminal velocity
work done|做功|energy transferred when a force moves through a distance in its direction|work done by a force
kinetic energy|动能|energy associated with motion|change in kinetic energy
gravitational potential energy|重力势能|energy associated with position in a gravitational field|gain in gravitational potential energy
power|功率|rate of energy transfer or rate of doing work|average power;power output
efficiency|效率|useful output energy or power divided by total input|percentage efficiency
moment|力矩|the turning effect of a force about a point|moment of a force;principle of moments
torque|转矩|the rotational effect produced by a force or couple|driving torque;resistive torque
centre of mass|质心|the point at which the mass of a body may be considered concentrated|locate the centre of mass
couple|力偶|two equal opposite parallel forces producing a turning effect|moment of a couple
angular velocity|角速度|rate of change of angular displacement|constant angular velocity
centripetal acceleration|向心加速度|acceleration directed toward the centre of circular motion|centripetal acceleration v squared over r
centripetal force|向心力|resultant inward force that maintains circular motion|provide centripetal force
elastic collision|弹性碰撞|a collision conserving both momentum and kinetic energy|perfectly elastic collision
inelastic collision|非弹性碰撞|a collision in which kinetic energy is not conserved|perfectly inelastic collision
upthrust|浮力|the upward force exerted by a fluid on an immersed body|upthrust equals weight displaced
    `),
  },
  {
    subject: "physics", topic: "materials", label: "Materials",
    note: "用于材料性质、形变以及应力—应变图题。",
    example: "Use the graph to determine the {word} of the material.",
    translation: "利用图像确定材料的{meaning}。",
    terms: parseTerms(`
density|密度|mass per unit volume|uniform density;calculate density
pressure|压强|normal force per unit area|fluid pressure;pressure difference
stress|应力|force per unit cross-sectional area|tensile stress;breaking stress
strain|应变|extension divided by original length|tensile strain;strain is dimensionless
Young modulus|杨氏模量|tensile stress divided by tensile strain in the linear region|determine Young modulus
elastic deformation|弹性形变|deformation that disappears when the force is removed|elastic behaviour
plastic deformation|塑性形变|permanent deformation remaining after the force is removed|plastic region
limit of proportionality|比例极限|the point beyond which stress is no longer proportional to strain|below the limit of proportionality
elastic limit|弹性极限|the greatest stress for which deformation remains fully reversible|exceed the elastic limit
yield point|屈服点|the point where a material begins to deform plastically|yield stress;yield point
ultimate tensile stress|极限抗拉强度|the maximum tensile stress a material can withstand|maximum tensile stress
breaking stress|断裂应力|the stress at which a material fractures|breaking stress of the wire
Hooke's law|胡克定律|extension is proportional to force within the proportional limit|obeys Hooke's law
spring constant|劲度系数|force per unit extension of a spring|spring constant k
tensile force|拉力|a force that stretches a material|apply a tensile force
compression|压缩|deformation caused by forces pushing inward|under compression
extension|伸长量|increase in length from the original length|measure extension
elastic energy|弹性势能|energy stored when an elastic object is deformed|elastic strain energy
ductile|有延展性的|able to undergo substantial plastic deformation before breaking|ductile material
brittle|脆性的|breaking with little or no plastic deformation|brittle fracture
    `),
  },
  {
    subject: "physics", topic: "waves-and-optics", label: "Waves & Optics",
    note: "用于波动、干涉、衍射、驻波和光学题。",
    example: "Explain how {word} affects the observed wave pattern.",
    translation: "解释{meaning}如何影响观察到的波形或图样。",
    terms: parseTerms(`
progressive wave|行波|a wave that transfers energy from one place to another|progressive wave equation
transverse wave|横波|a wave whose oscillations are perpendicular to energy transfer|transverse oscillation
longitudinal wave|纵波|a wave whose oscillations are parallel to energy transfer|compression and rarefaction
amplitude|振幅|maximum displacement from equilibrium|wave amplitude
wavelength|波长|shortest distance between points in the same phase|wavelength lambda
frequency|频率|number of complete oscillations per unit time|wave frequency
period|周期|time for one complete oscillation|oscillation period
wave speed|波速|distance travelled by a wavefront per unit time|wave equation;wave speed
phase difference|相位差|difference in phase angle between two oscillations|phase difference in radians
coherent sources|相干波源|sources with constant phase difference and equal frequency|coherent light sources
superposition|叠加原理|the resultant displacement equals the sum of individual displacements|principle of superposition
interference|干涉|superposition of waves producing a resultant amplitude pattern|interference pattern
constructive interference|相长干涉|interference in which waves reinforce each other|constructive interference maximum
destructive interference|相消干涉|interference in which waves cancel partly or completely|destructive interference minimum
diffraction|衍射|spreading of waves as they pass through a gap or around an obstacle|diffraction pattern
refraction|折射|change in wave direction caused by a change in speed|refraction at a boundary
reflection|反射|return of a wave from a boundary|law of reflection
stationary wave|驻波|a fixed pattern formed by superposition of opposite travelling waves|stationary wave pattern
node|波节|a point of zero displacement in a stationary wave|adjacent nodes
antinode|波腹|a point of maximum displacement in a stationary wave|adjacent antinodes
fundamental frequency|基频|the lowest natural frequency of a system|fundamental mode
harmonic|谐波|a frequency that is an integer multiple of the fundamental|second harmonic;higher harmonics
resonance|共振|large-amplitude response when driving frequency matches natural frequency|resonant frequency
intensity|强度|power transmitted per unit area|wave intensity
inverse-square law|平方反比定律|a relationship in which intensity is inversely proportional to distance squared|obeys inverse-square law
polarisation|偏振|restriction of transverse oscillations to one plane|plane-polarised light
critical angle|临界角|angle of incidence producing a refracted ray at 90 degrees|calculate critical angle
total internal reflection|全反射|complete reflection when incidence exceeds the critical angle from a denser medium|conditions for total internal reflection
refractive index|折射率|ratio of light speed in vacuum to light speed in a medium|refractive index n
Snell's law|斯涅尔定律|the relationship between incidence angle and refraction angle|apply Snell's law
optical fibre|光纤|a transparent guide that transmits light by total internal reflection|optical-fibre communication
Doppler effect|多普勒效应|observed frequency change caused by relative motion|Doppler shift
path difference|程差|difference between distances travelled by two waves|path difference of one wavelength
fringe spacing|条纹间距|distance between adjacent interference maxima or minima|double-slit fringe spacing
double-slit interference|双缝干涉|interference produced by waves from two coherent narrow slits|Young double-slit experiment
    `),
  },
  {
    subject: "physics", topic: "electricity", label: "Electricity",
    note: "用于电路、电阻率、电容器和交流电题。",
    example: "Determine the {word} in the circuit and justify the equation used.",
    translation: "确定电路中的{meaning}，并说明所用方程的依据。",
    terms: parseTerms(`
electric charge|电荷|a property of matter measured in coulombs|charge conservation;elementary charge
electric current|电流|rate of flow of electric charge|conventional current
potential difference|电势差|energy transferred per unit charge between two points|potential difference across a component
electromotive force|电动势|energy supplied per unit charge by a source|emf of a cell
resistance|电阻|potential difference divided by current|electrical resistance
resistivity|电阻率|a material property equal to resistance times area divided by length|resistivity of a wire
conductivity|电导率|the reciprocal of resistivity|electrical conductivity
Ohm's law|欧姆定律|current is proportional to potential difference at constant physical conditions|ohmic conductor
internal resistance|内阻|resistance within a source of emf|lost volts;internal resistance r
terminal potential difference|端电压|potential difference across the terminals of a source under load|terminal pd
potential divider|分压器|a series circuit that produces a fraction of the supply voltage|potential-divider equation
Kirchhoff's first law|基尔霍夫第一定律|total current entering a junction equals total current leaving|junction rule
Kirchhoff's second law|基尔霍夫第二定律|sum of emfs equals sum of potential drops around a closed loop|loop rule
series circuit|串联电路|a circuit with components in a single current path|resistors in series
parallel circuit|并联电路|a circuit with components connected across common points|resistors in parallel
power dissipation|功率耗散|rate at which electrical energy is transferred to other forms|power dissipated by a resistor
electrical energy|电能|energy transferred by moving electric charge|electrical energy transferred
drift velocity|漂移速度|average directed velocity of charge carriers|electron drift velocity
number density|数密度|number of charge carriers per unit volume|charge-carrier number density
charge carrier|载流子|a mobile particle that transports electric charge|free charge carriers
semiconductor|半导体|a material with conductivity between conductors and insulators|semiconductor device
thermistor|热敏电阻|a resistor whose resistance changes strongly with temperature|negative-temperature-coefficient thermistor
light-dependent resistor|光敏电阻|a resistor whose resistance changes with light intensity|LDR resistance
diode|二极管|a component that conducts mainly in one direction|forward-biased diode
I-V characteristic|伏安特性|a graph showing current against potential difference|I-V curve
alternating current|交流电|current that repeatedly reverses direction|sinusoidal alternating current
root-mean-square value|均方根值|the dc-equivalent value producing the same average power|rms voltage;rms current
peak voltage|峰值电压|maximum magnitude of an alternating voltage|peak-to-peak voltage
capacitance|电容|charge stored per unit potential difference|capacitance in farads
capacitor|电容器|a component that stores separated electric charge and energy|parallel-plate capacitor
dielectric|电介质|an insulating material placed between capacitor plates|dielectric constant
time constant|时间常数|the product RC that sets the rate of capacitor charging or discharging|RC time constant
exponential discharge|指数放电|capacitor discharge in which charge falls exponentially with time|discharge curve
Coulomb|库仑|the SI unit of electric charge|charge in coulombs
    `),
  },
  {
    subject: "physics", topic: "thermal-physics", label: "Thermal Physics",
    note: "用于内能、气体定律、热容和黑体辐射题。",
    example: "Explain the change in {word} using the particle model.",
    translation: "利用粒子模型解释{meaning}的变化。",
    terms: parseTerms(`
internal energy|内能|the sum of random kinetic and potential energies of particles|change in internal energy
thermal equilibrium|热平衡|a state in which no net thermal energy flows between bodies|reach thermal equilibrium
specific heat capacity|比热容|energy required to raise the temperature of unit mass by one kelvin|specific heat capacity c
specific latent heat|比潜热|energy required per unit mass for a change of state without temperature change|specific latent heat of fusion
phase change|物态变化|a transition between solid liquid and gas|change of phase
kinetic theory|分子动理论|a model explaining bulk gas behaviour using moving particles|kinetic theory of gases
absolute zero|绝对零度|the lowest possible thermodynamic temperature|zero kelvin
kelvin scale|开尔文温标|an absolute temperature scale beginning at absolute zero|temperature in kelvin
ideal gas|理想气体|a gas model with negligible particle volume and intermolecular forces|ideal-gas equation
mole|摩尔|the amount of substance containing Avogadro's number of entities|number of moles
molar mass|摩尔质量|mass per mole of a substance|molar mass in kg per mol
Avogadro constant|阿伏伽德罗常数|number of particles in one mole|Avogadro constant NA
Brownian motion|布朗运动|random motion of particles caused by molecular collisions|evidence for molecular motion
Boyle's law|玻意耳定律|pressure is inversely proportional to volume at constant temperature|Boyle's law graph
Charles's law|查理定律|volume is proportional to absolute temperature at constant pressure|Charles's law
pressure law|压强定律|pressure is proportional to absolute temperature at constant volume|constant-volume gas
root-mean-square speed|方均根速率|square root of the mean of molecular speed squared|rms molecular speed
black-body radiation|黑体辐射|electromagnetic radiation emitted by an ideal absorber and emitter|black-body spectrum
Stefan-Boltzmann law|斯特藩—玻尔兹曼定律|radiated power is proportional to surface area and temperature to the fourth power|Stefan law
Wien's displacement law|维恩位移定律|peak wavelength is inversely proportional to absolute temperature|Wien displacement law
    `),
  },
  {
    subject: "physics", topic: "fields-and-electromagnetism", label: "Fields & Electromagnetism",
    note: "用于引力场、电场、磁场、电磁感应和轨道题。",
    example: "Use the field model to calculate the {word} at the stated point.",
    translation: "利用场模型计算指定位置的{meaning}。",
    terms: parseTerms(`
gravitational field|引力场|a region in which a mass experiences gravitational force|uniform gravitational field
gravitational field strength|引力场强|force per unit mass at a point|field strength g
gravitational potential|引力势|work done per unit mass in bringing a mass from infinity|gravitational potential energy
electric field|电场|a region in which a charge experiences electric force|uniform electric field
electric field strength|电场强度|force per unit positive charge at a point|electric field strength E
electric potential|电势|work done per unit positive charge in bringing charge from infinity|electric potential V
equipotential|等势面|a line or surface of constant potential|equipotential line
Coulomb's law|库仑定律|electrostatic force is proportional to charge product and inverse square of separation|apply Coulomb's law
inverse-square field|平方反比场|a radial field whose strength varies as one over distance squared|inverse-square dependence
field line|场线|a line showing the direction of force on a test object|field-line pattern
magnetic field|磁场|a region in which magnetic materials or moving charges experience force|uniform magnetic field
magnetic flux density|磁感应强度|force per unit current per unit length on a perpendicular conductor|magnetic flux density B
magnetic flux|磁通量|magnetic flux density multiplied by normal area|magnetic flux phi
Lorentz force|洛伦兹力|force on a charged particle moving in electric or magnetic fields|magnetic Lorentz force
Fleming's left-hand rule|弗莱明左手定则|a rule relating force current and magnetic-field directions|motor effect
Hall effect|霍尔效应|production of a transverse voltage across a current-carrying conductor in a magnetic field|Hall voltage
electromagnetic induction|电磁感应|production of emf by a changing magnetic flux linkage|induced emf
Faraday's law|法拉第定律|induced emf equals rate of change of magnetic flux linkage|Faraday induction law
Lenz's law|楞次定律|induced current opposes the change that produces it|direction from Lenz's law
magnetic flux linkage|磁通链|magnetic flux multiplied by the number of linked turns|change in flux linkage
transformer|变压器|a device using mutual induction to change alternating voltage|ideal transformer
step-up transformer|升压变压器|a transformer with output voltage greater than input voltage|step-up ratio
step-down transformer|降压变压器|a transformer with output voltage less than input voltage|step-down transformer
eddy current|涡流|a circulating induced current in a bulk conductor|reduce eddy currents
solenoid|螺线管|a coil producing a near-uniform magnetic field inside|field inside a solenoid
cyclotron|回旋加速器|a device accelerating charged particles using magnetic and alternating electric fields|cyclotron frequency
mass spectrometer|质谱仪|an instrument separating ions according to mass-to-charge ratio|mass spectrometry
specific charge|比荷|charge divided by mass|specific charge of electron
escape velocity|逃逸速度|minimum speed needed to escape a gravitational field without further propulsion|escape speed
orbital speed|轨道速度|speed required for a stable orbit at a given radius|circular orbital speed
geostationary orbit|地球同步静止轨道|an equatorial orbit with a period equal to Earth's rotation|geostationary satellite
    `),
  },
  {
    subject: "physics", topic: "particle-and-nuclear", label: "Particle & Nuclear Physics",
    note: "用于粒子分类、放射性、核反应和量子现象题。",
    example: "Define {word} and apply it to the nuclear or particle process shown.",
    translation: "定义{meaning}，并将其应用于图示核过程或粒子过程。",
    terms: parseTerms(`
proton|质子|a positively charged nucleon found in the nucleus|proton number
neutron|中子|an uncharged nucleon found in the nucleus|neutron number
electron|电子|a negatively charged fundamental lepton|electron charge
positron|正电子|the antiparticle of the electron|positron emission
neutrino|中微子|a nearly massless neutral lepton involved in weak interactions|electron neutrino
antiparticle|反粒子|a particle with equal mass and opposite quantum numbers|particle-antiparticle pair
nucleon number|核子数|total number of protons and neutrons in a nucleus|mass number A
proton number|质子数|number of protons in a nucleus|atomic number Z
isotope|同位素|atoms with the same proton number but different neutron numbers|radioactive isotope
mass defect|质量亏损|difference between separated nucleon mass and nucleus mass|calculate mass defect
binding energy|结合能|energy required to separate a nucleus into individual nucleons|nuclear binding energy
binding energy per nucleon|平均每核子结合能|binding energy divided by nucleon number|stability curve
atomic mass unit|原子质量单位|one twelfth of the mass of a carbon-12 atom|unified atomic mass unit
decay constant|衰变常数|probability per unit time that a nucleus decays|decay constant lambda
activity|放射性活度|number of nuclear decays per unit time|activity in becquerels
half-life|半衰期|time for the number of undecayed nuclei or activity to halve|determine half-life
background radiation|本底辐射|ionising radiation detected from environmental sources|subtract background count
alpha radiation|阿尔法辐射|helium nuclei emitted in radioactive decay|alpha particle
beta radiation|贝塔辐射|electrons or positrons emitted in beta decay|beta-minus decay
gamma radiation|伽马辐射|high-energy electromagnetic radiation from nuclear transitions|gamma photon
ionising power|电离能力|ability of radiation to remove electrons from atoms|high ionising power
penetrating power|穿透能力|ability of radiation to pass through matter|penetrating ability
nuclear fission|核裂变|splitting of a heavy nucleus into smaller nuclei with energy release|fission chain reaction
nuclear fusion|核聚变|combining light nuclei to form a heavier nucleus with energy release|fusion reaction
chain reaction|链式反应|a self-sustaining sequence of nuclear fissions caused by neutrons|controlled chain reaction
quark|夸克|a fundamental particle that combines to form hadrons|up quark;down quark
lepton|轻子|a fundamental particle not subject to the strong interaction|lepton family
baryon|重子|a hadron made of three quarks|proton is a baryon
meson|介子|a hadron made of a quark and antiquark|pion meson
annihilation|湮灭|conversion of a particle-antiparticle pair into photons|electron-positron annihilation
pair production|电子对产生|creation of a particle-antiparticle pair from photon energy|pair-production threshold
photoelectric effect|光电效应|emission of electrons from a surface when photons exceed a threshold frequency|photoelectric equation
photon|光子|a quantum of electromagnetic radiation|photon energy
work function|逸出功|minimum energy needed to remove an electron from a surface|metal work function
threshold frequency|阈频|minimum radiation frequency needed for photoelectron emission|threshold frequency f0
de Broglie wavelength|德布罗意波长|wavelength associated with a particle's momentum|matter wave
    `),
  },
  {
    subject: "physics", topic: "oscillations", label: "Oscillations",
    note: "用于简谐运动、阻尼、受迫振动与共振题。",
    example: "Describe how {word} changes the oscillation shown on the graph.",
    translation: "描述{meaning}如何改变图中所示的振动。",
    terms: parseTerms(`
simple harmonic motion|简谐运动|motion with acceleration proportional and opposite to displacement|SHM equation
angular frequency|角频率|oscillation frequency expressed in radians per second|angular frequency omega
restoring force|回复力|a force directed toward equilibrium|restoring force proportional to displacement
equilibrium position|平衡位置|the position where resultant force is zero|oscillate about equilibrium
damping|阻尼|loss of oscillation energy due to resistive forces|light damping
critical damping|临界阻尼|minimum damping that prevents oscillation and returns fastest to equilibrium|critically damped system
forced oscillation|受迫振动|oscillation driven by an external periodic force|driving frequency
natural frequency|固有频率|frequency at which a system oscillates freely|natural mode
resonance curve|共振曲线|amplitude plotted against driving frequency|sharp resonance curve
phase|相位|position within a cycle expressed as an angle|phase relationship
quality factor|品质因数|a measure of resonance sharpness and energy loss|high Q factor
underdamped|欠阻尼的|returning to equilibrium through decaying oscillations|underdamped response
overdamped|过阻尼的|returning slowly to equilibrium without oscillating|overdamped response
energy transfer|能量传递|movement of energy from a driving system to an oscillator|maximum energy transfer
    `),
  },
  {
    subject: "physics", topic: "astrophysics", label: "Astrophysics",
    note: "用于恒星、宇宙学、光谱和距离测量题。",
    example: "Use the astronomical data to determine the {word} of the object.",
    translation: "利用天文数据确定该天体的{meaning}。",
    terms: parseTerms(`
luminosity|光度|total power radiated by an astronomical object|stellar luminosity
apparent brightness|视亮度|power received per unit area from an astronomical object|apparent brightness at Earth
parallax|视差|apparent positional shift caused by viewing from different positions|stellar parallax
parsec|秒差距|distance at which one astronomical unit subtends one arcsecond|distance in parsecs
standard candle|标准烛光|an object with known luminosity used to determine distance|standard-candle method
redshift|红移|increase in observed wavelength compared with emitted wavelength|cosmological redshift
Hubble's law|哈勃定律|recession speed is proportional to distance|Hubble constant
cosmological expansion|宇宙膨胀|increase of large-scale distances in the universe with time|expanding universe
main sequence|主序|the stable stellar stage powered mainly by hydrogen fusion|main-sequence star
white dwarf|白矮星|a dense stellar remnant supported by electron degeneracy pressure|white-dwarf radius
neutron star|中子星|an extremely dense stellar remnant composed mainly of neutrons|pulsar neutron star
supernova|超新星|a powerful stellar explosion|Type Ia supernova
black hole|黑洞|a region from which not even light can escape|black-hole mass
event horizon|事件视界|the boundary beyond which escape from a black hole is impossible|cross the event horizon
Schwarzschild radius|史瓦西半径|event-horizon radius of a non-rotating black hole|calculate Schwarzschild radius
stellar spectrum|恒星光谱|distribution of stellar radiation with wavelength|analyse a stellar spectrum
absorption line|吸收线|a dark spectral line produced when specific wavelengths are absorbed|spectral absorption line
cosmic microwave background|宇宙微波背景|relic microwave radiation from the early universe|CMB radiation
dark matter|暗物质|unseen matter inferred from gravitational effects|dark-matter evidence
stellar evolution|恒星演化|sequence of changes during a star's lifetime|stellar life cycle
    `),
  },
  {
    subject: "mathematics", topic: "algebra-and-functions", label: "Algebra & Functions",
    note: "用于代数运算、函数、证明和图像变换题。",
    example: "Determine the {word} and show each algebraic step clearly.",
    translation: "求出{meaning}，并清楚写出每一步代数过程。",
    terms: parseTerms(`
coefficient|系数|a numerical or constant factor multiplying a variable|leading coefficient
constant|常数|a fixed value that does not vary|constant term
variable|变量|a symbol representing a quantity that may change|independent variable
expression|代数式|a combination of numbers variables and operations|simplify the expression
equation|方程|a statement that two expressions are equal|solve the equation
identity|恒等式|an equality true for every permitted value|prove the identity
inequality|不等式|a comparison showing one quantity is greater or less than another|solve the inequality
simultaneous equations|联立方程|equations solved together for shared unknowns|solve simultaneously
quadratic equation|二次方程|a polynomial equation of degree two|roots of a quadratic
discriminant|判别式|the quantity b squared minus 4ac determining the nature of quadratic roots|discriminant condition
root|根|a value that makes an equation or function equal to zero|real root
repeated root|重根|a root occurring more than once|equal roots
factor theorem|因式定理|if f of a is zero then x minus a is a factor|apply the factor theorem
remainder theorem|余式定理|the remainder on division by x minus a is f of a|use the remainder theorem
polynomial|多项式|an expression containing non-negative integer powers of a variable|cubic polynomial
rational function|有理函数|a quotient of two polynomials|rational expression
modulus|模；绝对值|the non-negative magnitude of a real or complex quantity|modulus function
domain|定义域|the set of allowed input values|restricted domain
range|值域|the set of possible output values|range of the function
inverse function|反函数|a function reversing the mapping of another function|find the inverse
composite function|复合函数|a function formed by applying one function after another|composite fg
one-to-one function|一一函数|a function in which each output has at most one input|one-to-one mapping
mapping|映射|a rule associating each domain element with an output|mapping diagram
asymptote|渐近线|a line approached by a curve|vertical asymptote
translation|平移|a transformation moving every point by the same vector|graph translation
stretch|伸缩变换|a transformation scaling coordinates in one direction|vertical stretch
reflection|反射变换|a transformation mirroring a graph in a line|reflection in the y-axis
parametric equation|参数方程|coordinates expressed in terms of a third variable|eliminate the parameter
partial fraction|部分分式|a simpler fraction used to decompose a rational expression|partial-fraction decomposition
binomial expansion|二项式展开|expansion of a power of a two-term expression|binomial coefficient
index law|指数律|a rule for manipulating powers|laws of indices
logarithm|对数|the exponent to which a base must be raised|logarithmic equation
exponential function|指数函数|a function in which the variable appears in an exponent|exponential growth
natural logarithm|自然对数|logarithm to base e|natural log ln
change-of-base formula|换底公式|a formula expressing a logarithm using another base|change the logarithm base
completing the square|配方法|rewriting a quadratic as a squared binomial plus a constant|complete the square
proof by contradiction|反证法|proof that assumes the opposite and derives an impossibility|contradiction argument
counterexample|反例|a single example disproving a universal claim|give a counterexample
necessary condition|必要条件|a condition that must hold for a statement to be true|necessary but not sufficient
sufficient condition|充分条件|a condition that guarantees a statement is true|sufficient condition
    `),
  },
  {
    subject: "mathematics", topic: "calculus", label: "Calculus",
    note: "用于微分、积分、微分方程和数值方法题。",
    example: "Use calculus to determine the {word} and justify the method.",
    translation: "使用微积分确定{meaning}，并说明所用方法。",
    terms: parseTerms(`
derivative|导数|the instantaneous rate of change of a function|first derivative
differentiate|求导|to find the derivative of a function|differentiate with respect to x
gradient function|斜率函数|a function giving the gradient of a curve at each point|derive the gradient function
stationary point|驻点|a point where the first derivative is zero|coordinates of stationary points
local maximum|局部极大值|a stationary value greater than nearby values|local maximum point
local minimum|局部极小值|a stationary value less than nearby values|local minimum point
point of inflection|拐点|a point where the curve changes concavity|stationary point of inflection
increasing function|增函数|a function whose values rise as the input rises|increasing interval
decreasing function|减函数|a function whose values fall as the input rises|decreasing interval
second derivative|二阶导数|the derivative of the first derivative|second-derivative test
rate of change|变化率|change in one quantity per unit change in another|instantaneous rate of change
tangent|切线|a line with the same gradient as a curve at a point|equation of the tangent
normal|法线|a line perpendicular to the tangent at a point|equation of the normal
implicit differentiation|隐函数求导|differentiation when variables are related implicitly|differentiate implicitly
parametric differentiation|参数求导|differentiation of parametric coordinates using a common parameter|dy by dx in parametric form
product rule|乘积法则|a rule for differentiating a product of functions|apply the product rule
quotient rule|商法则|a rule for differentiating a quotient of functions|apply the quotient rule
chain rule|链式法则|a rule for differentiating a composite function|apply the chain rule
integration|积分|the reverse process of differentiation or accumulation of quantities|integration technique
indefinite integral|不定积分|a family of antiderivatives including a constant|constant of integration
definite integral|定积分|an integral evaluated between fixed limits|limits of integration
area under a curve|曲线下面积|area between a curve and the horizontal axis|signed area
area between curves|曲线间面积|area enclosed by two curves|points of intersection
volume of revolution|旋转体体积|volume formed when a region rotates about an axis|rotate about the x-axis
substitution|换元积分|changing variables to simplify an integral|integration by substitution
integration by parts|分部积分|an integration rule derived from the product rule|apply integration by parts
differential equation|微分方程|an equation involving a function and its derivatives|first-order differential equation
separation of variables|变量分离|a method placing each variable on a different side before integration|separate the variables
initial condition|初始条件|a known value used to determine a solution constant|apply the initial condition
trapezium rule|梯形法则|numerical approximation of an integral using trapezia|trapezium-rule estimate
iteration|迭代|repeated application of a formula to approximate a solution|iterative formula
convergence|收敛|approach of a sequence or iteration to a finite value|iteration converges
divergence|发散|failure of a sequence or iteration to approach a finite value|iteration diverges
numerical solution|数值解|an approximate solution found by calculation rather than exact algebra|numerical root
    `),
  },
  {
    subject: "mathematics", topic: "trigonometry-and-vectors", label: "Trigonometry & Vectors",
    note: "用于三角函数、弧度制、向量和空间几何题。",
    example: "Use the diagram to determine the {word} and state any assumptions.",
    translation: "利用图形确定{meaning}，并写出所作假设。",
    terms: parseTerms(`
sine|正弦|the trigonometric ratio opposite over hypotenuse|sine rule
cosine|余弦|the trigonometric ratio adjacent over hypotenuse|cosine rule
tangent ratio|正切|the trigonometric ratio opposite over adjacent|tangent equation
radian|弧度|the angle subtended by an arc equal in length to the radius|angle in radians
arc length|弧长|length of part of a circle circumference|arc-length formula
sector area|扇形面积|area enclosed by two radii and an arc|area of a sector
unit circle|单位圆|a circle of radius one used to define trigonometric functions|unit-circle definition
periodic function|周期函数|a function repeating after a fixed interval|period of sine
trigonometric identity|三角恒等式|an equality involving trigonometric functions true for all valid angles|prove a trigonometric identity
double-angle formula|二倍角公式|a formula expressing a function of twice an angle|double-angle identity
addition formula|和角公式|a formula for a trigonometric function of a sum or difference|angle-addition formula
inverse trigonometric function|反三角函数|a function returning an angle from a trigonometric ratio|inverse sine
bearing|方位角|a clockwise angle measured from north|three-figure bearing
vector|向量|a quantity with magnitude and direction|column vector
magnitude|模长|the length or size of a vector|magnitude of a vector
unit vector|单位向量|a vector of magnitude one|unit direction vector
position vector|位置向量|a vector from the origin to a point|position vector of P
direction vector|方向向量|a vector parallel to a line|direction vector of the line
scalar product|数量积|the product of vector magnitudes and cosine of their included angle|scalar product;dot product
parallel vectors|平行向量|vectors that are scalar multiples of one another|vectors are parallel
perpendicular vectors|垂直向量|vectors with zero scalar product|prove perpendicular
collinear points|共线点|points lying on the same straight line|show points are collinear
resultant vector|合向量|the vector sum of two or more vectors|resultant displacement
vector component|向量分量|part of a vector resolved along a chosen direction|horizontal component
vector equation of a line|直线的向量方程|a line represented by a position vector plus a scalar multiple of a direction vector|line in vector form
intersection|交点|a point shared by curves lines or surfaces|point of intersection
angle between vectors|向量夹角|the smaller angle determined using the scalar product|find the angle between vectors
relative velocity|相对速度|velocity of one object measured from another moving object|relative-velocity vector
basis vector|基向量|a vector in a chosen set used to represent other vectors|standard basis
projection|投影|the component of a vector in another vector's direction|scalar projection
    `),
  },
  {
    subject: "mathematics", topic: "coordinate-geometry", label: "Coordinate Geometry",
    note: "用于直线、圆、轨迹和曲线草图题。",
    example: "Find the {word} and express the answer in exact form where possible.",
    translation: "求出{meaning}，并尽可能将答案写成精确形式。",
    terms: parseTerms(`
Cartesian coordinates|笛卡尔坐标|coordinates measured along perpendicular axes|Cartesian plane
straight-line equation|直线方程|an algebraic equation representing a straight line|equation y equals mx plus c
y-intercept|纵截距|the y-coordinate where a graph crosses the y-axis|find the y-intercept
midpoint|中点|the point halfway between two endpoints|midpoint formula
distance formula|距离公式|a formula for distance between coordinate points|distance between points
circle equation|圆方程|an equation representing all points at a fixed distance from a centre|equation of a circle
centre of a circle|圆心|the fixed point equidistant from every point on a circle|coordinates of the centre
radius|半径|distance from the centre of a circle to its circumference|radius of the circle
perpendicular bisector|垂直平分线|a line perpendicular to a segment through its midpoint|equation of perpendicular bisector
locus|轨迹|the set of points satisfying a geometric condition|locus of a moving point
parametric curve|参数曲线|a curve whose coordinates depend on a parameter|parametric representation
curve sketch|曲线草图|a graph showing key features without exact plotting of every point|sketch the curve
turning point|转折点|a point where a curve changes from increasing to decreasing or vice versa|coordinates of turning point
horizontal asymptote|水平渐近线|a horizontal line approached by a curve|horizontal asymptote
vertical asymptote|垂直渐近线|a vertical line approached where a function is unbounded|vertical asymptote
intersection condition|相交条件|a condition on equations ensuring shared solutions|two distinct intersections
implicit curve|隐式曲线|a curve defined by a relation not solved for one variable|implicit equation
coordinate transformation|坐标变换|a change from one coordinate description to another|transform coordinates
normal gradient|法线斜率|the negative reciprocal of a non-zero tangent gradient|gradient of the normal
tangent condition|相切条件|a condition giving exactly one repeated intersection|line tangent to circle
    `),
  },
  {
    subject: "mathematics", topic: "statistics-and-probability", label: "Statistics & Probability",
    note: "用于抽样、统计图、概率分布和假设检验题。",
    example: "Use the information given to calculate the {word} and interpret it in context.",
    translation: "利用已知信息计算{meaning}，并结合题目背景解释。",
    terms: parseTerms(`
population|总体|the complete set of individuals or items under study|target population
sample|样本|a subset selected from a population|representative sample
census|普查|collection of data from every member of a population|conduct a census
sampling frame|抽样框|a list of population members from which a sample is chosen|complete sampling frame
simple random sample|简单随机样本|a sample in which each member has equal selection chance|select at random
stratified sample|分层样本|a sample preserving population proportions in defined groups|stratified sampling
systematic sample|系统抽样|a sample selecting every kth member after a random start|sampling interval
sampling bias|抽样偏差|systematic under-representation or over-representation in a sample|biased sample
outlier|离群值|a value unusually far from the rest of the data|identify an outlier
mean|平均数|sum of values divided by the number of values|sample mean
median|中位数|the middle ordered value|median value
mode|众数|the most frequent value or category|modal class
variance|方差|mean squared deviation from the mean|population variance
standard deviation|标准差|square root of variance measuring spread|small standard deviation
quartile|四分位数|a value dividing ordered data into quarters|lower quartile;upper quartile
interquartile range|四分位距|upper quartile minus lower quartile|IQR
cumulative frequency|累积频数|running total of frequencies up to a boundary|cumulative-frequency curve
frequency density|频率密度|frequency divided by class width|histogram frequency density
histogram|直方图|a graph whose bar area represents frequency|draw a histogram
box plot|箱线图|a diagram displaying median quartiles and extremes|compare box plots
correlation|相关性|the strength and direction of association between variables|positive correlation
regression line|回归直线|a fitted line used to model or predict one variable from another|least-squares regression line
interpolation|内插|estimation within the range of observed data|interpolate a value
extrapolation|外推|estimation beyond the observed data range|unreliable extrapolation
probability|概率|a number from zero to one measuring event likelihood|calculate probability
outcome|结果|a possible result of a random experiment|equally likely outcomes
event|事件|a set of outcomes of interest|probability of an event
sample space|样本空间|the set of all possible outcomes|sample-space diagram
mutually exclusive events|互斥事件|events that cannot occur together|mutually exclusive outcomes
independent events|独立事件|events where one occurring does not affect the other|test for independence
conditional probability|条件概率|probability of an event given that another has occurred|conditional-probability formula
tree diagram|树状图|a branching diagram representing sequential probabilities|probability tree
Venn diagram|维恩图|a diagram representing sets and overlaps|shade a Venn diagram
complement|补集|outcomes not in a specified event|complementary event
union|并集|outcomes in either or both events|A union B
intersection|交集|outcomes common to both events|A intersection B
discrete random variable|离散随机变量|a variable taking countable numerical values|probability distribution table
expected value|期望值|long-run mean value of a random variable|calculate expectation
binomial distribution|二项分布|distribution of successes in fixed independent Bernoulli trials|binomial probability
normal distribution|正态分布|a continuous symmetric bell-shaped probability distribution|normal approximation
z-score|标准分数|number of standard deviations a value lies from the mean|standardise using z
null hypothesis|原假设|the default statistical claim tested against evidence|null hypothesis H0
alternative hypothesis|备择假设|the competing claim supported if the null is rejected|alternative hypothesis H1
significance level|显著性水平|chosen probability threshold for rejecting the null|5 percent significance level
critical region|拒绝域|set of results causing rejection of the null|critical value
p-value|p 值|probability under the null of a result at least as extreme as observed|compare p-value
Type I error|第一类错误|rejecting a true null hypothesis|probability of Type I error
Type II error|第二类错误|failing to reject a false null hypothesis|risk of Type II error
    `),
  },
  {
    subject: "mathematics", topic: "mechanics", label: "Mathematical Mechanics",
    note: "用于受力、运动学、动量、功能和连接物体题。",
    example: "Model the situation and determine the {word} using the stated assumptions.",
    translation: "根据题目所给假设建立模型，并求出{meaning}。",
    terms: parseTerms(`
particle|质点|an object modelled as having mass but negligible size|particle model
rigid body|刚体|an object that does not deform under applied forces|rigid-body equilibrium
smooth surface|光滑表面|a surface modelled with no friction|smooth plane
rough surface|粗糙表面|a surface on which friction acts|rough inclined plane
light string|轻绳|a string modelled as having negligible mass|light inextensible string
inextensible string|不可伸长的绳|a string whose length remains constant|connected particles
tension|张力|a pulling force transmitted through a string or cable|tension in the string
thrust|推力|a compressive force transmitted by a rod or connector|thrust in the rod
normal reaction|支持力|a contact force perpendicular to a surface|normal reaction force
limiting friction|极限摩擦力|maximum static friction before slipping occurs|friction is limiting
coefficient of friction|摩擦系数|limiting friction divided by normal reaction|coefficient mu
resolving forces|分解力|splitting forces into perpendicular components|resolve parallel to the plane
equations of motion|运动方程|constant-acceleration formulae relating displacement velocity acceleration and time|SUVAT equations
displacement-time graph|位移—时间图|a graph whose gradient represents velocity|gradient of displacement-time graph
velocity-time graph|速度—时间图|a graph whose gradient is acceleration and area is displacement|area under velocity-time graph
connected particles|连接物体|particles constrained to move together by a string or rod|connected-particle system
pulley|滑轮|a wheel over which a string passes to change force direction|smooth pulley
equilibrium of a particle|质点平衡|a state in which vector sum of forces on a particle is zero|particle in equilibrium
moment of a force|力矩|force multiplied by perpendicular distance from a pivot|take moments about the pivot
projectile range|射程|horizontal distance travelled by a projectile before reaching a stated level|maximum range
time of flight|飞行时间|total time a projectile remains in motion|calculate time of flight
work-energy principle|功能原理|work done by resultant force equals change in kinetic energy|apply work-energy principle
impulse-momentum principle|冲量—动量原理|impulse equals change in momentum|apply impulse-momentum
relative motion|相对运动|motion described from a moving reference object|relative velocity
modelling assumption|建模假设|a simplification used to make a physical situation mathematically tractable|state a modelling assumption
    `),
  },
  {
    subject: "chemistry", topic: "atomic-and-quantitative", label: "Chemistry: Atomic & Quantitative",
    note: "用于原子结构、摩尔、化学式、浓度、滴定和定量计算题。",
    example: "Use {word} to explain or calculate the chemical quantity in the question.",
    translation: "用 {meaning} 解释或计算题目中的化学量。",
    terms: customTerms([
      { word: "atom", meaning: "原子", definition: "the smallest particle of an element that keeps the chemical identity of that element", collocations: ["atomic structure", "single atom"], knowledgePoint: "Atoms contain protons, neutrons, and electrons." },
      { word: "ion", meaning: "离子", definition: "an atom or group of atoms with a net electric charge", collocations: ["positive ion", "negative ion"], knowledgePoint: "Ions form when atoms lose or gain electrons." },
      { word: "isotope", meaning: "同位素", definition: "atoms of the same element with the same proton number but different neutron numbers", collocations: ["stable isotope", "radioactive isotope"], knowledgePoint: "Isotopes have the same atomic number but different mass numbers." },
      { word: "relative atomic mass", meaning: "相对原子质量", definition: "the weighted mean mass of an atom compared with one twelfth of carbon-12", collocations: ["Ar value", "relative atomic mass"], formula: "Ar", knowledgePoint: "Use isotope abundances to calculate the weighted mean." },
      { word: "relative formula mass", meaning: "相对式量", definition: "the sum of the relative atomic masses of all atoms in a formula unit", collocations: ["Mr value", "relative formula mass"], formula: "Mr", knowledgePoint: "Add the Ar values for every atom in the formula." },
      { word: "mole", meaning: "摩尔", definition: "the amount of substance containing 6.02 × 10^23 specified particles", collocations: ["one mole", "mole calculation"], formula: "n = m / Mr", knowledgePoint: "Moles connect mass, particles, and gas volume." },
      { word: "Avogadro constant", meaning: "阿伏伽德罗常数", definition: "the number of particles in one mole of substance", collocations: ["Avogadro number", "Avogadro constant"], formula: "N = nNA", knowledgePoint: "Use NA to convert between moles and number of particles." },
      { word: "empirical formula", meaning: "实验式", definition: "the simplest whole-number ratio of atoms of each element in a compound", collocations: ["empirical formula", "empirical ratio"], knowledgePoint: "Convert masses to moles, then divide by the smallest mole value." },
      { word: "molecular formula", meaning: "分子式", definition: "the actual number of atoms of each element in a molecule", collocations: ["molecular formula", "actual formula"], knowledgePoint: "The molecular formula is a whole-number multiple of the empirical formula." },
      { word: "concentration", meaning: "浓度", definition: "the amount of solute dissolved per unit volume of solution", collocations: ["solution concentration", "concentration calculation"], formula: "c = n / V", knowledgePoint: "Use dm^3 for volume when concentration is in mol dm^-3." },
      { word: "titration", meaning: "滴定", definition: "a method for finding an unknown concentration by reacting it with a solution of known concentration", collocations: ["acid-base titration", "titration curve"], knowledgePoint: "Use the concordant titres and balanced equation mole ratio." },
      { word: "limiting reagent", meaning: "限量试剂", definition: "the reactant that is used up first and controls the maximum amount of product", collocations: ["limiting reagent", "limiting reactant"], knowledgePoint: "The limiting reagent determines the theoretical yield." },
      { word: "percentage yield", meaning: "百分产率", definition: "the actual yield as a percentage of the theoretical yield", collocations: ["percentage yield", "theoretical yield"], formula: "percentage yield = actual yield / theoretical yield × 100", knowledgePoint: "Actual yield is often lower because reactions may be incomplete." },
      { word: "atom economy", meaning: "原子经济性", definition: "the percentage of reactant atoms that become part of the desired product", collocations: ["atom economy", "green chemistry"], formula: "atom economy = Mr desired product / total Mr reactants × 100", knowledgePoint: "High atom economy means less waste." },
      { word: "gas volume", meaning: "气体体积", definition: "the volume occupied by a gas under stated conditions", collocations: ["molar gas volume", "gas volume"], formula: "V = n × 24 dm^3 at RTP", knowledgePoint: "At room temperature and pressure, one mole of gas occupies about 24 dm^3." },
    ]),
  },
  {
    subject: "chemistry", topic: "bonding-reactions", label: "Chemistry: Bonding & Reactions",
    note: "用于化学键、结构、氧化还原、催化、能量和可逆反应题。",
    example: "Explain how {word} affects the structure, reaction, or property described.",
    translation: "解释 {meaning} 如何影响题目中的结构、反应或性质。",
    terms: customTerms([
      { word: "covalent bond", meaning: "共价键", definition: "a strong electrostatic attraction between a shared pair of electrons and the bonded nuclei", collocations: ["single covalent bond", "covalent molecule"], knowledgePoint: "Covalent bonding usually occurs between non-metals." },
      { word: "ionic bond", meaning: "离子键", definition: "the electrostatic attraction between oppositely charged ions", collocations: ["ionic bond", "ionic compound"], knowledgePoint: "Ionic compounds form giant lattices and often have high melting points." },
      { word: "metallic bond", meaning: "金属键", definition: "the electrostatic attraction between positive metal ions and delocalised electrons", collocations: ["metallic bonding", "metallic lattice"], knowledgePoint: "Delocalised electrons explain electrical conductivity." },
      { word: "intermolecular forces", meaning: "分子间作用力", definition: "forces of attraction between molecules", collocations: ["weak intermolecular forces", "intermolecular attraction"], knowledgePoint: "Stronger intermolecular forces usually give higher boiling points." },
      { word: "giant covalent structure", meaning: "巨型共价结构", definition: "a network of atoms joined by covalent bonds throughout the structure", collocations: ["giant covalent lattice", "diamond structure"], knowledgePoint: "Diamond and graphite have different properties because their bonding networks differ." },
      { word: "electronegativity", meaning: "电负性", definition: "the ability of an atom to attract the bonding pair of electrons", collocations: ["electronegativity difference", "polar bond"], knowledgePoint: "Large electronegativity differences can create polar or ionic bonding." },
      { word: "oxidation", meaning: "氧化", definition: "loss of electrons or an increase in oxidation number", collocations: ["oxidation reaction", "oxidation number"], knowledgePoint: "OIL RIG: oxidation is loss, reduction is gain." },
      { word: "reduction", meaning: "还原", definition: "gain of electrons or a decrease in oxidation number", collocations: ["reduction reaction", "reducing agent"], knowledgePoint: "A species that is reduced gains electrons." },
      { word: "catalyst", meaning: "催化剂", definition: "a substance that increases reaction rate without being used up", collocations: ["industrial catalyst", "catalytic converter"], knowledgePoint: "A catalyst provides an alternative route with lower activation energy." },
      { word: "activation energy", meaning: "活化能", definition: "the minimum energy required for particles to react", collocations: ["activation energy barrier", "low activation energy"], knowledgePoint: "Only successful collisions with enough energy form products." },
      { word: "reversible reaction", meaning: "可逆反应", definition: "a reaction that can proceed in both forward and reverse directions", collocations: ["reversible reaction", "dynamic equilibrium"], knowledgePoint: "At equilibrium, forward and reverse reaction rates are equal." },
      { word: "enthalpy change", meaning: "焓变", definition: "the heat energy change of a reaction at constant pressure", collocations: ["enthalpy change", "reaction enthalpy"], formula: "ΔH", knowledgePoint: "Negative ΔH means exothermic; positive ΔH means endothermic." },
    ]),
  },
  {
    subject: "economics", topic: "microeconomics", label: "Economics: Microeconomics",
    note: "用于稀缺性、供需、市场均衡、弹性和市场失灵题。",
    example: "Explain how {word} affects price, quantity, or resource allocation.",
    translation: "解释 {meaning} 如何影响价格、数量或资源配置。",
    terms: customTerms([
      { word: "scarcity", meaning: "稀缺性", definition: "the basic economic problem that resources are limited while wants are unlimited", collocations: ["resource scarcity", "scarcity problem"], knowledgePoint: "Scarcity forces economic choices." },
      { word: "opportunity cost", meaning: "机会成本", definition: "the next best alternative forgone when a choice is made", collocations: ["opportunity cost", "economic choice"], knowledgePoint: "Opportunity cost is the value of what is given up." },
      { word: "demand", meaning: "需求", definition: "the quantity consumers are willing and able to buy at different prices", collocations: ["market demand", "demand curve"], knowledgePoint: "Demand normally contracts when price rises." },
      { word: "supply", meaning: "供给", definition: "the quantity producers are willing and able to sell at different prices", collocations: ["market supply", "supply curve"], knowledgePoint: "Supply normally expands when price rises." },
      { word: "market equilibrium", meaning: "市场均衡", definition: "the point where quantity demanded equals quantity supplied", collocations: ["equilibrium price", "market equilibrium"], knowledgePoint: "At equilibrium there is no shortage or surplus." },
      { word: "price elasticity of demand", meaning: "需求价格弹性", definition: "the responsiveness of quantity demanded to a change in price", collocations: ["PED", "elastic demand"], formula: "PED = %ΔQd / %ΔP", knowledgePoint: "Elastic demand means quantity responds strongly to price change." },
      { word: "subsidy", meaning: "补贴", definition: "a payment that reduces producers' or consumers' effective costs", collocations: ["government subsidy", "production subsidy"], knowledgePoint: "A subsidy can increase supply and lower consumer prices." },
      { word: "indirect tax", meaning: "间接税", definition: "a tax on spending or sales rather than income", collocations: ["sales tax", "excise duty"], knowledgePoint: "An indirect tax usually shifts supply upward and raises price." },
      { word: "market failure", meaning: "市场失灵", definition: "a situation where the free market allocates resources inefficiently", collocations: ["market failure", "correct market failure"], knowledgePoint: "Externalities and public goods commonly cause market failure." },
      { word: "externality", meaning: "外部性", definition: "a cost or benefit from production or consumption affecting a third party", collocations: ["negative externality", "positive externality"], knowledgePoint: "Pollution is a common negative externality." },
      { word: "monopoly", meaning: "垄断", definition: "a market structure with one dominant seller and high barriers to entry", collocations: ["monopoly power", "natural monopoly"], knowledgePoint: "Monopolies may restrict output and raise prices." },
      { word: "consumer surplus", meaning: "消费者剩余", definition: "the difference between what consumers are willing to pay and what they actually pay", collocations: ["consumer surplus", "welfare gain"], knowledgePoint: "Consumer surplus measures a benefit to buyers." },
    ]),
  },
  {
    subject: "economics", topic: "macroeconomics", label: "Economics: Macroeconomics",
    note: "用于 GDP、通胀、失业、财政政策、货币政策和贸易题。",
    example: "Discuss how {word} influences the wider economy.",
    translation: "讨论 {meaning} 如何影响宏观经济。",
    terms: customTerms([
      { word: "GDP", meaning: "国内生产总值", definition: "the total value of goods and services produced within an economy in a period", collocations: ["real GDP", "GDP growth"], knowledgePoint: "Real GDP adjusts for inflation and is used to compare output over time." },
      { word: "inflation", meaning: "通货膨胀", definition: "a sustained increase in the general price level", collocations: ["inflation rate", "high inflation"], knowledgePoint: "Inflation reduces purchasing power." },
      { word: "unemployment", meaning: "失业", definition: "the state of wanting work but being unable to find it", collocations: ["unemployment rate", "youth unemployment"], knowledgePoint: "Unemployment can be cyclical, structural, frictional, or seasonal." },
      { word: "fiscal policy", meaning: "财政政策", definition: "government use of taxation and spending to influence economic activity", collocations: ["expansionary fiscal policy", "fiscal stimulus"], knowledgePoint: "Fiscal policy works through government spending and taxation." },
      { word: "monetary policy", meaning: "货币政策", definition: "central bank actions affecting interest rates and the money supply", collocations: ["monetary policy", "interest-rate policy"], knowledgePoint: "Higher interest rates usually reduce borrowing and spending." },
      { word: "interest rate", meaning: "利率", definition: "the cost of borrowing money or the reward for saving", collocations: ["base rate", "interest-rate rise"], knowledgePoint: "Interest rates affect consumption, investment, and exchange rates." },
      { word: "budget deficit", meaning: "预算赤字", definition: "government spending greater than government revenue", collocations: ["budget deficit", "fiscal deficit"], knowledgePoint: "A deficit is usually financed by borrowing." },
      { word: "economic growth", meaning: "经济增长", definition: "an increase in an economy's real output over time", collocations: ["long-run growth", "economic growth"], knowledgePoint: "Growth is commonly measured by real GDP." },
      { word: "productivity", meaning: "生产率", definition: "output per unit of input, often output per worker or per hour", collocations: ["labour productivity", "productivity growth"], formula: "productivity = output / input", knowledgePoint: "Higher productivity can raise wages and living standards." },
      { word: "exchange rate", meaning: "汇率", definition: "the value of one currency in terms of another currency", collocations: ["floating exchange rate", "exchange-rate depreciation"], knowledgePoint: "Currency depreciation can make exports cheaper and imports more expensive." },
      { word: "trade balance", meaning: "贸易差额", definition: "the difference between the value of exports and imports", collocations: ["trade surplus", "trade deficit"], formula: "trade balance = exports - imports", knowledgePoint: "A deficit means imports exceed exports." },
      { word: "aggregate demand", meaning: "总需求", definition: "total spending on goods and services in an economy at a given price level", collocations: ["AD curve", "aggregate demand"], formula: "AD = C + I + G + (X - M)", knowledgePoint: "Aggregate demand includes consumption, investment, government spending, and net exports." },
    ]),
  },
];

const supplementalGroups = [
  {
    subject: "chemistry", topic: "organic-chemistry", label: "Chemistry: Organic Chemistry",
    note: "用于有机官能团、反应类型、同分异构、机理和合成路线题。",
    example: "Identify the {word} in the molecule and predict the reaction or product.",
    translation: "识别分子中的{meaning}，并预测反应或产物。",
    terms: parseTerms(`
alkane|烷烃|a saturated hydrocarbon containing only single carbon-carbon bonds|alkane series;saturated hydrocarbon|CnH2n+2|Alkanes are relatively unreactive and mainly undergo combustion or substitution.
alkene|烯烃|an unsaturated hydrocarbon containing at least one carbon-carbon double bond|alkene addition;unsaturated hydrocarbon|CnH2n|The C=C bond can open during addition reactions.
alcohol|醇|an organic compound containing the hydroxyl functional group|primary alcohol;ethanol|-OH|Alcohols can be oxidised or dehydrated depending on conditions.
carboxylic acid|羧酸|an organic acid containing the carboxyl functional group|carboxylic acid;ethanoic acid|-COOH|Carboxylic acids react with carbonates and can form esters.
ester|酯|an organic compound formed from a carboxylic acid and an alcohol|esterification;ester link|-COO-|Esters often have pleasant smells and are made by condensation.
aldehyde|醛|an organic compound containing a terminal carbonyl group|aldehyde oxidation;ethanal|-CHO|Aldehydes can be oxidised to carboxylic acids.
ketone|酮|an organic compound containing a carbonyl group within the carbon chain|ketone;propanone|C=O|Ketones are not easily oxidised by mild oxidising agents.
functional group|官能团|the atom or group of atoms responsible for characteristic reactions|functional-group test;identify functional group||The functional group determines the typical reactions of an organic molecule.
homologous series|同系物系列|a family of organic compounds with the same functional group and a common formula pattern|homologous series;successive members||Members differ by CH2 and show similar chemical reactions.
structural isomer|结构异构体|compounds with the same molecular formula but different structural formulae|structural isomerism;draw isomers||Different structures can give different physical or chemical properties.
stereoisomer|立体异构体|compounds with the same structural formula but different spatial arrangement|E-Z isomerism;optical isomerism||Restricted rotation or chiral centres can create stereoisomers.
E-Z isomerism|E-Z 异构|stereoisomerism caused by restricted rotation around a C=C bond|E isomer;Z isomer||Each carbon in the double bond must have two different groups.
optical isomerism|光学异构|stereoisomerism where non-superimposable mirror images rotate plane-polarised light|chiral molecule;enantiomer||A chiral carbon is attached to four different groups.
nucleophile|亲核试剂|an electron-pair donor attracted to an electron-deficient centre|nucleophilic substitution;nucleophile attack||Nucleophiles attack positive or partially positive atoms.
electrophile|亲电试剂|an electron-pair acceptor attracted to electron-rich regions|electrophilic addition;electrophile attack||Electrophiles are attracted to high electron density such as C=C.
free radical|自由基|a species with an unpaired electron|free-radical substitution;radical chain||Radicals are highly reactive and occur in initiation propagation and termination.
substitution reaction|取代反应|a reaction in which one atom or group is replaced by another|nucleophilic substitution;halogenoalkane substitution||The carbon skeleton is retained while a group changes.
addition reaction|加成反应|a reaction in which atoms add across a multiple bond|electrophilic addition;addition polymerisation||Addition turns an unsaturated bond into a saturated product.
elimination reaction|消去反应|a reaction that removes atoms from a molecule to form a double bond|elimination of HBr;alkene formation||Elimination competes with substitution under some conditions.
oxidation of alcohols|醇的氧化|conversion of alcohols to aldehydes ketones or carboxylic acids|reflux oxidation;distillation oxidation|[O]|Primary alcohols can form aldehydes then acids; secondary alcohols form ketones.
reflux|回流|heating a reaction mixture while vapour condenses back into the flask|heat under reflux;reflux condenser||Reflux allows prolonged heating without losing volatile reactants.
distillation|蒸馏|separating or collecting a volatile product by boiling and condensation|simple distillation;collect distillate||Distillation can remove an aldehyde before further oxidation.
addition polymerisation|加成聚合|polymer formation by repeated addition of alkene monomers|addition polymer;repeat unit||The repeat unit comes from opening the C=C bond.
condensation polymerisation|缩聚|polymer formation with elimination of a small molecule such as water or HCl|condensation polymer;polyester||Each link forms while a small molecule is removed.
repeat unit|重复单元|the smallest section of a polymer chain that repeats|draw repeat unit;polymer chain||Bracket the repeat unit and show continuation bonds.
monomer|单体|a small molecule that can join with others to form a polymer|alkene monomer;monomer unit||Identify the reactive functional group when finding a monomer.
hydrolysis|水解|breaking a bond by reaction with water or hydroxide ions|ester hydrolysis;alkaline hydrolysis||Hydrolysis reverses condensation for many organic compounds.
infrared spectroscopy|红外光谱|analysis using absorption of infrared radiation by bonds|IR spectrum;absorption peak||Bond vibrations absorb characteristic wavenumbers.
mass spectrometry|质谱|analysis using mass-to-charge ratios of ions|molecular ion peak;fragment ion|m/z|The molecular ion peak helps identify relative molecular mass.
    `),
  },
  {
    subject: "chemistry", topic: "energetics-kinetics-equilibrium", label: "Chemistry: Energetics, Kinetics & Equilibrium",
    note: "用于焓变、速率、平衡、酸碱和电化学计算题。",
    example: "Use {word} to explain the energy change, rate, or equilibrium position.",
    translation: "用{meaning}解释能量变化、反应速率或平衡位置。",
    terms: parseTerms(`
exothermic reaction|放热反应|a reaction that transfers heat energy to the surroundings|exothermic change;negative enthalpy|ΔH < 0|Products have lower enthalpy than reactants.
endothermic reaction|吸热反应|a reaction that absorbs heat energy from the surroundings|endothermic change;positive enthalpy|ΔH > 0|Products have higher enthalpy than reactants.
enthalpy profile|焓变曲线|a diagram showing energy changes during a reaction|enthalpy profile diagram;activation energy||Use the vertical difference to identify ΔH.
bond enthalpy|键焓|energy required to break one mole of a specified bond in gaseous molecules|mean bond enthalpy;bond breaking|ΔH = Σ bonds broken - Σ bonds formed|Breaking bonds is endothermic; forming bonds is exothermic.
Hess's law|赫斯定律|the total enthalpy change is independent of the route taken|Hess cycle;enthalpy cycle|ΣΔH route 1 = ΣΔH route 2|Reverse arrows change signs and multiply values when equations are scaled.
standard enthalpy change|标准焓变|enthalpy change measured under standard conditions with substances in standard states|standard conditions;standard state|298 K, 100 kPa|State symbols and standard states matter in definitions.
rate of reaction|反应速率|change in concentration of reactant or product per unit time|reaction rate;initial rate|rate = Δconcentration / Δtime|The gradient of a concentration-time graph gives rate.
rate constant|速率常数|the proportionality constant in a rate equation|rate constant k;units of k|rate = k[A]^m[B]^n|Units of k depend on the overall order.
order of reaction|反应级数|the power of a concentration term in the rate equation|first order;overall order||Orders are found experimentally, not from the balanced equation.
half-life|半衰期|the time taken for a quantity or concentration to fall to half its value|constant half-life;first-order half-life|t1/2|A constant half-life indicates first-order behaviour.
dynamic equilibrium|动态平衡|a closed-system state where forward and reverse reaction rates are equal|dynamic equilibrium;closed system||Concentrations remain constant because rates are equal.
Le Chatelier's principle|勒夏特列原理|a system at equilibrium shifts to oppose an imposed change|apply Le Chatelier;equilibrium shift||Consider temperature pressure and concentration separately.
equilibrium constant|平衡常数|a value showing the ratio of product and reactant concentrations at equilibrium|Kc expression;equilibrium constant|Kc = products / reactants|Only species in the equilibrium expression are included.
acid dissociation constant|酸解离常数|the equilibrium constant for dissociation of a weak acid|Ka expression;weak acid|Ka = [H+][A-] / [HA]|A larger Ka means a stronger weak acid.
pH|酸碱度|a logarithmic measure of hydrogen ion concentration|calculate pH;pH scale|pH = -log10[H+]|A decrease by one pH unit means [H+] increases tenfold.
buffer solution|缓冲溶液|a solution that resists pH change when small amounts of acid or base are added|acid buffer;buffer capacity||A buffer contains a weak acid/base and its conjugate partner.
electrode potential|电极电势|the tendency of a half-cell to gain electrons compared with a standard reference|standard electrode potential;E cell|Ecell = Eright - Eleft|More positive potentials favour reduction.
redox reaction|氧化还原反应|a reaction involving electron transfer and changes in oxidation number|redox equation;redox titration||Oxidation and reduction occur together.
oxidising agent|氧化剂|a species that causes oxidation by accepting electrons|strong oxidising agent;electron acceptor||The oxidising agent is reduced.
reducing agent|还原剂|a species that causes reduction by donating electrons|strong reducing agent;electron donor||The reducing agent is oxidised.
    `),
  },
  {
    subject: "chemistry", topic: "analysis-and-practical", label: "Chemistry: Analysis & Practical",
    note: "用于实验设计、定性分析、误差、色谱和谱图解释题。",
    example: "Explain how {word} would be used to identify or measure the substance.",
    translation: "解释如何用{meaning}识别或测量该物质。",
    terms: parseTerms(`
qualitative analysis|定性分析|tests used to identify substances rather than measure amounts|ion test;qualitative observation||Record colour changes precipitates and gases precisely.
quantitative analysis|定量分析|methods used to measure the amount or concentration of a substance|quantitative result;concentration analysis||Calculations depend on reliable measurements and stoichiometry.
precipitate|沉淀|an insoluble solid formed when solutions react|white precipitate;coloured precipitate||A precipitate can identify ions in solution.
filtration|过滤|separating an insoluble solid from a liquid using a filter|filter paper;filtrate||Wash and dry the residue when a pure solid is needed.
recrystallisation|重结晶|purifying a solid by dissolving it hot and crystallising it on cooling|recrystallise product;pure crystals||Impurities remain in solution while crystals form.
chromatography|色谱|a separation technique based on different affinities for stationary and mobile phases|paper chromatography;TLC||Components move different distances because of different solubilities or attractions.
retention factor|保留因子|ratio of distance moved by a spot to distance moved by the solvent front|Rf value;chromatogram|Rf = distance spot / distance solvent front|Rf values help identify substances under the same conditions.
standard solution|标准溶液|a solution with an accurately known concentration|prepare standard solution;volumetric flask||Use a volumetric flask and known mass to prepare it accurately.
concordant titre|一致滴定读数|titre values close enough to be averaged in titration|concordant results;mean titre||Use concordant titres rather than all rough readings.
indicator|指示剂|a substance that changes colour over a narrow pH range|acid-base indicator;endpoint||Choose an indicator whose colour change matches the equivalence region.
endpoint|滴定终点|the point in a titration where the indicator changes colour|titration endpoint;sharp endpoint||The endpoint estimates the equivalence point.
systematic error|系统误差|a consistent measurement error that shifts results in one direction|calibration error;zero error||Systematic errors affect accuracy and are not reduced by repeats.
random error|随机误差|unpredictable variation between repeated measurements|scatter in readings;repeat measurements||Repeats and averaging reduce random error.
percentage error|百分误差|measurement uncertainty expressed as a percentage of a measured value|percentage uncertainty;percentage error|percentage error = uncertainty / value × 100|Small measured values can produce large percentage errors.
anhydrous|无水的|containing no water|anhydrous salt;dry solid||Heating hydrated salts can produce anhydrous salts.
hydrated salt|水合盐|a crystalline salt containing water of crystallisation|hydrated copper sulfate;water of crystallisation||Mass loss on heating can determine the water of crystallisation.
    `),
  },
  {
    subject: "economics", topic: "market-structures-and-labour", label: "Economics: Markets, Firms & Labour",
    note: "用于企业目标、市场结构、成本收益、劳动市场和政府干预题。",
    example: "Use {word} to analyse the behaviour of firms, workers, or consumers.",
    translation: "用{meaning}分析企业、劳动者或消费者行为。",
    terms: parseTerms(`
perfect competition|完全竞争|a market structure with many firms homogeneous products and no barriers to entry|perfectly competitive market;price taker||Firms are price takers and earn normal profit in the long run.
monopolistic competition|垄断竞争|a market structure with many firms differentiated products and low barriers to entry|product differentiation;brand loyalty||Firms have some price-setting power because products are differentiated.
oligopoly|寡头垄断|a market dominated by a few interdependent firms|oligopoly market;interdependence||Firms must consider rivals' reactions.
collusion|串谋|agreement between firms to restrict competition or raise prices|tacit collusion;cartel||Collusion may increase producer surplus but reduce consumer welfare.
price discrimination|价格歧视|charging different prices to different consumers for the same product|third-degree price discrimination;consumer groups||Firms need market power and ability to separate markets.
barrier to entry|进入壁垒|a factor that makes it difficult for new firms to enter a market|high barriers to entry;legal barrier||Barriers protect incumbent firms' market power.
economies of scale|规模经济|falling average cost as output increases|internal economies of scale;bulk buying||Economies of scale can create lower prices or higher profit margins.
diseconomies of scale|规模不经济|rising average cost when a firm becomes too large|coordination problems;communication issues||Large firms may become inefficient beyond an optimal scale.
average cost|平均成本|total cost per unit of output|average cost curve;unit cost|AC = TC / Q|Compare AC with price to judge profit per unit.
marginal cost|边际成本|the extra cost of producing one more unit|marginal cost curve;MC|MC = ΔTC / ΔQ|Profit maximisation often occurs where MC equals MR.
marginal revenue|边际收益|the extra revenue from selling one more unit|MR curve;marginal revenue|MR = ΔTR / ΔQ|MR can be below price when firms lower price to sell more.
normal profit|正常利润|the minimum profit needed to keep resources in their current use|normal profit;opportunity cost||Normal profit is included in economic cost.
supernormal profit|超额利润|profit above normal profit|abnormal profit;supernormal profit||Persistent supernormal profit often needs barriers to entry.
derived demand|派生需求|demand for a factor of production caused by demand for the final product|derived labour demand;factor demand||Demand for labour depends on demand for the goods produced.
minimum wage|最低工资|a legal wage floor below which workers cannot be paid|national minimum wage;wage floor||A minimum wage can raise incomes but may create unemployment if above equilibrium.
labour productivity|劳动生产率|output per worker or per hour worked|productivity growth;worker productivity|labour productivity = output / labour input|Higher productivity lowers unit labour cost.
trade union|工会|an organisation representing workers in wage and working-condition negotiations|trade union power;collective bargaining||Trade unions can increase worker bargaining power.
income inequality|收入不平等|uneven distribution of income among households or individuals|income distribution;Gini coefficient||Inequality can affect incentives fairness and consumption.
poverty trap|贫困陷阱|a situation where low income makes it difficult to escape poverty|welfare dependency;low-income trap||High withdrawal of benefits can reduce incentives to work.
    `),
  },
  {
    subject: "economics", topic: "macro-policy-and-trade", label: "Economics: Macro Policy & Trade",
    note: "用于宏观目标、政策工具、国际贸易、汇率和发展经济题。",
    example: "Explain how {word} affects inflation, growth, employment, or trade.",
    translation: "解释{meaning}如何影响通胀、增长、就业或贸易。",
    terms: parseTerms(`
aggregate supply|总供给|total output firms are willing and able to produce at different price levels|SRAS curve;LRAS curve||Short-run and long-run aggregate supply respond to different factors.
output gap|产出缺口|the difference between actual output and potential output|positive output gap;negative output gap||A positive output gap can create inflationary pressure.
multiplier effect|乘数效应|a larger final change in national income caused by an initial injection|fiscal multiplier;multiplier process|k = 1 / (1 - MPC)|The multiplier depends on leakages from the circular flow.
marginal propensity to consume|边际消费倾向|the proportion of extra income spent on consumption|MPC value;consumption function|MPC = ΔC / ΔY|A higher MPC makes the multiplier larger.
current account|经常账户|the balance of trade in goods services income and transfers|current account deficit;current account surplus||A deficit may be financed by financial inflows.
protectionism|贸易保护主义|government policies that restrict imports to protect domestic producers|tariff;quota;protectionist policy||Protectionism protects jobs but can raise consumer prices.
tariff|关税|a tax on imported goods|import tariff;tariff revenue||A tariff raises import prices and may reduce import quantity.
quota|配额|a physical limit on the quantity of imports allowed|import quota;quota restriction||A quota restricts supply and can raise domestic prices.
exchange-rate depreciation|汇率贬值|a fall in the value of a currency in a floating exchange-rate system|currency depreciation;weaker currency||Depreciation can improve export competitiveness but raise import costs.
exchange-rate appreciation|汇率升值|a rise in the value of a currency in a floating exchange-rate system|currency appreciation;stronger currency||Appreciation can reduce import prices but make exports less competitive.
terms of trade|贸易条件|the ratio of export prices to import prices|terms-of-trade index;export prices|terms of trade = export price index / import price index × 100|An improvement means exports buy more imports.
balance of payments|国际收支|a record of transactions between residents of one country and the rest of the world|balance of payments;external balance||It includes current financial and capital accounts.
automatic stabiliser|自动稳定器|fiscal mechanisms that reduce economic fluctuations without new policy decisions|progressive tax;welfare payments||Tax receipts and welfare spending change automatically with income.
budget surplus|预算盈余|government revenue greater than government spending|fiscal surplus;government budget||A surplus can reduce public debt but may lower aggregate demand.
public debt|公共债务|the accumulated stock of government borrowing|national debt;debt interest||Debt sustainability depends on interest rates growth and fiscal balance.
supply-side policy|供给侧政策|policy designed to increase productive capacity and improve market efficiency|training policy;deregulation||Supply-side policy shifts LRAS or improves productivity.
crowding out|挤出效应|reduced private-sector spending caused by higher government borrowing or interest rates|crowding-out effect;private investment||It can weaken the impact of expansionary fiscal policy.
Phillips curve|菲利普斯曲线|a model showing a possible short-run trade-off between inflation and unemployment|short-run Phillips curve;trade-off||Expectations can shift the Phillips curve.
human development index|人类发展指数|a composite measure of development using income education and health indicators|HDI ranking;development indicator||HDI is broader than GDP per capita.
    `),
  },
  {
    subject: "chemistry", topic: "chemistry-question-sentences", label: "Chemistry: Question Sentences",
    type: "phrase",
    note: "用于化学题干句子理解：先翻译任务动词，再判断计算、解释、实验或评价要求。",
    example: "{word}",
    translation: "{meaning}",
    terms: parseTerms(`
Calculate the percentage yield of the reaction.|计算该反应的百分产率。|Use actual yield divided by theoretical yield then multiply by 100.|percentage yield question|percentage yield = actual / theoretical × 100|Do not use the mass of a limiting reagent as the actual yield.
Use the balanced equation to find the amount of product formed.|利用配平方程式求生成物的物质的量。|Convert given quantities to moles and use the stoichiometric ratio.|mole-ratio question||The coefficients in the balanced equation give the mole ratio.
Explain why the rate increases when temperature is raised.|解释为什么升高温度会使反应速率增加。|Link higher kinetic energy to more frequent successful collisions.|rate explanation||Mention activation energy and successful collisions.
Predict the effect of increasing pressure on the equilibrium position.|预测增大压强对平衡位置的影响。|Apply Le Chatelier's principle and compare gas mole numbers.|equilibrium shift||The system shifts toward fewer gas molecules.
Identify the functional group responsible for the reaction.|识别导致该反应的官能团。|Use the structure or test result to name the functional group.|functional-group question||Functional groups control characteristic reactions.
Suggest how the purity of the product could be improved.|提出如何提高产物纯度。|Name a purification method and link it to the impurity.|practical improvement||Use recrystallisation distillation or washing only when appropriate.
    `),
  },
  {
    subject: "economics", topic: "economics-question-sentences", label: "Economics: Question Sentences",
    type: "phrase",
    note: "用于经济题干句子理解：区分 define、explain、analyse、evaluate，并把图形变化和文字结论连接起来。",
    example: "{word}",
    translation: "{meaning}",
    terms: parseTerms(`
Evaluate whether a subsidy would improve market outcomes.|评价补贴是否会改善市场结果。|Consider lower prices higher output government cost and possible inefficiency.|subsidy evaluation||Evaluation needs both benefit and limitation.
Explain how a fall in interest rates may affect aggregate demand.|解释利率下降如何影响总需求。|Link lower borrowing cost to consumption investment and AD.|monetary-policy chain|AD = C + I + G + (X - M)|Use a cause-and-effect chain.
Analyse the impact of a tariff on consumers and producers.|分析关税对消费者和生产者的影响。|Use price quantity consumer surplus producer surplus and government revenue.|tariff diagram||Separate domestic producers from consumers.
Discuss whether economic growth always increases living standards.|讨论经济增长是否总会提高生活水平。|Balance higher income and jobs against inequality environment and inflation.|growth evaluation||Use real GDP plus non-income indicators.
Using a diagram, show the effect of an increase in demand.|用图像表示需求增加的影响。|Shift the demand curve right and explain new equilibrium price and quantity.|demand diagram||Do not move along the curve when demand itself changes.
Explain why price elasticity matters for total revenue.|解释为什么价格弹性会影响总收益。|Connect percentage quantity response to price change and revenue.|elasticity revenue|TR = P × Q|Elastic demand and inelastic demand have different revenue effects.
    `),
  },
];

groups.push(...supplementalGroups);

groups.push({
  subject: "economics", topic: "extra-market-terms", label: "Economics: Extra Market Terms",
  note: "用于供给弹性、价格管制、效率和消费者选择题。",
  example: "Use {word} to explain the market mechanism or policy outcome.",
  translation: "用{meaning}解释市场机制或政策结果。",
  terms: parseTerms(`
elasticity of supply|供给弹性|the responsiveness of quantity supplied to a change in price|PES;price elasticity of supply|PES = %ΔQs / %ΔP|A more elastic supply responds more strongly to price changes.
price floor|价格下限|a minimum legal price set above the market equilibrium price|minimum price;support price||A price floor can create excess supply if it is set too high.
price ceiling|价格上限|a maximum legal price set below the market equilibrium price|rent ceiling;maximum price||A price ceiling can create shortages if it is set too low.
minimum efficient scale|最低效率规模|the output level at which a firm first achieves minimum average cost|MES;efficient scale||A lower MES can increase competition in the market.
consumer sovereignty|消费者主权|the idea that consumers determine what goods and services are produced|consumer choice;consumer power||When consumer sovereignty is strong, firms respond to demand signals.
  `),
});

const commandRows = [
  ["state", "陈述；写出", "give a concise fact or result without explanation", "State the value of the current.", "写出电流的数值。"],
  ["define", "定义", "give the precise meaning of a term", "Define electric potential at a point.", "定义某一点的电势。"],
  ["describe", "描述", "give the main features or pattern without necessarily explaining why", "Describe the motion shown by the graph.", "描述图像所表示的运动。"],
  ["explain", "解释", "give reasons using scientific or mathematical principles", "Explain why the reading increases.", "解释为什么读数增大。"],
  ["determine", "确定；求出", "find an answer from given information using a valid method", "Determine the acceleration of the trolley.", "求小车的加速度。"],
  ["calculate", "计算", "obtain a numerical answer and show working", "Calculate the energy transferred.", "计算传递的能量。"],
  ["show that", "证明结果为", "demonstrate that a supplied result follows from the data", "Show that the speed is approximately 12 m s-1.", "证明速度约为 12 m s-1。"],
  ["derive", "推导", "obtain a relationship from known principles through logical steps", "Derive an expression for the period.", "推导周期的表达式。"],
  ["deduce", "推断", "reach a conclusion from previous results or supplied evidence", "Deduce the direction of the force.", "推断力的方向。"],
  ["hence", "由此；从而", "use the immediately preceding result in the next step", "Hence find the maximum height.", "由此求最大高度。"],
  ["hence or otherwise", "由此或用其他方法", "use the preceding result or another valid method", "Hence or otherwise solve the equation.", "由此或用其他方法解方程。"],
  ["verify", "验证", "check that a statement or value is correct", "Verify that the units are consistent.", "验证单位是否一致。"],
  ["justify", "说明理由", "support an answer with evidence or reasoning", "Justify the choice of measuring instrument.", "说明选择该测量仪器的理由。"],
  ["suggest", "提出；建议", "provide a plausible answer based on scientific understanding", "Suggest one source of systematic error.", "提出一个系统误差来源。"],
  ["comment on", "评价；评论", "make a relevant observation about a result or claim", "Comment on the reliability of the conclusion.", "评价该结论的可靠性。"],
  ["compare", "比较", "identify similarities and differences using relevant quantities", "Compare the two distributions.", "比较这两个分布。"],
  ["distinguish", "区分", "state the difference between related ideas", "Distinguish between mass and weight.", "区分质量和重力。"],
  ["estimate", "估算", "obtain an approximate value using reasonable assumptions", "Estimate the number of molecules in the sample.", "估算样品中的分子数。"],
  ["sketch", "画草图", "draw the essential shape and label important features", "Sketch the variation of potential with distance.", "画出电势随距离变化的草图。"],
  ["plot", "描点作图", "mark data points on suitable axes", "Plot a graph of V against I.", "作 V 关于 I 的图像。"],
  ["label", "标注", "add names symbols or values to a diagram", "Label the forces acting on the object.", "标出物体所受的力。"],
  ["complete", "补全", "add the missing information to a diagram table or equation", "Complete the ray diagram.", "补全光路图。"],
  ["evaluate", "评价；求值", "judge using evidence or calculate a numerical value as context requires", "Evaluate the effectiveness of the method.", "评价该方法的有效性。"],
  ["prove", "证明", "use a logically complete argument to establish a statement", "Prove that the function is increasing.", "证明该函数为增函数。"],
  ["interpret", "解释含义", "translate a mathematical or graphical result into its contextual meaning", "Interpret the gradient of the graph.", "解释图像斜率的实际含义。"],
];

const phraseRows = [
  ["not drawn to scale", "未按比例绘制", "Do not estimate lengths or angles directly from the diagram.", "The diagram is not drawn to scale.", "该图未按比例绘制。"],
  ["assume air resistance is negligible", "假设空气阻力可忽略", "Use the ideal projectile or free-fall model unless told otherwise.", "Assume air resistance is negligible.", "假设空气阻力可以忽略。"],
  ["give your answer to three significant figures", "答案保留三位有效数字", "Round only the final result unless intermediate rounding is unavoidable.", "Give your answer to three significant figures.", "答案保留三位有效数字。"],
  ["give your answer in standard form", "用科学记数法表示答案", "Write the result as a number from 1 to 10 multiplied by a power of ten.", "Give your answer in standard form.", "用科学记数法写出答案。"],
  ["include an appropriate unit", "写出合适的单位", "A correct numerical value may lose marks if its unit is missing or incompatible.", "Include an appropriate unit in your answer.", "在答案中写出合适的单位。"],
  ["use the data in the table", "使用表格中的数据", "Select values from the supplied table rather than inventing or recalling them.", "Use the data in the table to calculate the resistance.", "使用表格中的数据计算电阻。"],
  ["use the graph to determine", "利用图像求出", "Read or calculate the required quantity from graph features such as gradient or area.", "Use the graph to determine the acceleration.", "利用图像求出加速度。"],
  ["by drawing a suitable line", "通过画合适的直线", "Add a tangent best-fit line or construction line needed for the calculation.", "By drawing a suitable line, estimate the initial gradient.", "通过画一条合适的直线，估算初始斜率。"],
  ["show all your working", "写出完整过程", "Method marks depend on visible equations substitutions and reasoning.", "Show all your working clearly.", "清楚写出完整计算过程。"],
  ["you may use the formula booklet", "可以使用公式册", "Choose and adapt a supplied formula rather than assuming it will be quoted in the question.", "You may use the formula booklet.", "你可以使用公式册。"],
  ["without using a calculator", "不使用计算器", "Keep exact values and use algebraic or known-angle methods.", "Solve the equation without using a calculator.", "在不使用计算器的情况下解方程。"],
  ["leave your answer in exact form", "答案保留精确形式", "Keep surds fractions pi or logarithms rather than decimal approximations.", "Leave your answer in exact form.", "答案保留为精确形式。"],
  ["for all real values of x", "对于所有实数 x", "The statement must hold throughout the real domain, not only for selected examples.", "Prove the identity for all real values of x.", "证明该恒等式对所有实数 x 成立。"],
  ["for which the expression is defined", "在表达式有定义的范围内", "Exclude values that make denominators zero or violate roots and logarithms.", "Solve for all x for which the expression is defined.", "求表达式有定义范围内的所有 x。"],
  ["the particle starts from rest", "质点从静止开始", "Use initial velocity u equals zero.", "The particle starts from rest at A.", "质点从 A 点由静止开始运动。"],
  ["moves with constant acceleration", "做匀加速运动", "The constant-acceleration equations are available.", "The car moves with constant acceleration.", "汽车做匀加速运动。"],
  ["is modelled as a particle", "被建模为质点", "Ignore the object's dimensions and rotational effects.", "The package is modelled as a particle.", "将包裹建模为质点。"],
  ["the string is light and inextensible", "绳轻且不可伸长", "Tension is uniform and connected particles share constrained motion.", "The string is light and inextensible.", "绳子质量可忽略且不可伸长。"],
  ["the pulley is smooth", "滑轮光滑", "Ignore friction between the string and pulley.", "The pulley is smooth.", "滑轮光滑，忽略摩擦。"],
  ["the plane is rough", "斜面粗糙", "Include a friction force whose direction opposes motion or impending motion.", "The particle moves up a rough plane.", "质点沿粗糙斜面向上运动。"],
  ["on the point of slipping", "即将滑动", "Static friction has reached its limiting value.", "The block is on the point of slipping.", "物块处于即将滑动的临界状态。"],
  ["find the range of possible values", "求可能取值范围", "Use inequalities and include or exclude endpoints carefully.", "Find the range of possible values of k.", "求 k 的可能取值范围。"],
  ["find the coordinates of the stationary points", "求驻点坐标", "Set the first derivative to zero and substitute back into the function.", "Find the coordinates of the stationary points.", "求所有驻点的坐标。"],
  ["determine the nature of each stationary point", "判断各驻点性质", "Use sign changes or the second derivative to classify maximum minimum or inflection.", "Determine the nature of each stationary point.", "判断每个驻点的类型。"],
  ["the curve has exactly two distinct roots", "曲线恰有两个不同的根", "Translate the condition into a discriminant or intersection requirement.", "Find k such that the equation has exactly two distinct roots.", "求使方程恰有两个不同实根的 k。"],
  ["the events are independent", "这些事件相互独立", "Use product probabilities and test whether conditioning changes probability.", "Given that A and B are independent, find P of A intersection B.", "已知 A 与 B 独立，求 A 与 B 同时发生的概率。"],
  ["given that", "在……已知的条件下", "This often signals conditional probability or a restricted sample space.", "Find the probability that X is greater than 3, given that X is even.", "已知 X 为偶数，求 X 大于 3 的概率。"],
  ["at the five percent significance level", "在 5% 显著性水平下", "Compare the p-value or critical region with 0.05.", "Test the claim at the five percent significance level.", "在 5% 显著性水平下检验该说法。"],
  ["there is insufficient evidence to conclude", "没有足够证据得出结论", "Do not say the null hypothesis is proved; state the contextual conclusion carefully.", "There is insufficient evidence to conclude that the mean has increased.", "没有足够证据认为均值已经增加。"],
  ["the result is statistically significant", "结果具有统计显著性", "The observed result falls in the critical region or has a sufficiently small p-value.", "The result is statistically significant at the chosen level.", "该结果在所选显著性水平下具有统计显著性。"],
  ["within experimental uncertainty", "在实验不确定度范围内", "Differences smaller than combined uncertainty may not be meaningful.", "The values agree within experimental uncertainty.", "这些数值在实验不确定度范围内一致。"],
  ["the percentage difference is", "百分比差为", "Use the stated reference or accepted value in the denominator.", "Calculate the percentage difference between the two values.", "计算这两个数值之间的百分比差。"],
  ["the uncertainty in the gradient", "斜率的不确定度", "Use steepest and shallowest acceptable lines when required.", "Estimate the uncertainty in the gradient.", "估算斜率的不确定度。"],
  ["the line of best fit does not pass through the origin", "最佳拟合线不经过原点", "A non-zero intercept may indicate systematic error or a missing constant term.", "The line of best fit does not pass through the origin.", "最佳拟合线没有通过原点。"],
  ["ignore any anomalous results", "忽略异常结果", "Exclude only clearly identified anomalies and do not cherry-pick ordinary scatter.", "Ignore any anomalous results when drawing the line.", "画线时忽略异常结果。"],
  ["suggest one improvement to the method", "提出一种实验改进", "Name a specific change and explain how it reduces a stated limitation.", "Suggest one improvement to the experimental method.", "提出一种改进实验方法的措施。"],
  ["identify the main source of uncertainty", "指出主要不确定度来源", "Compare instrument resolution and measurement method rather than listing every possible error.", "Identify the main source of uncertainty in the experiment.", "指出实验中最主要的不确定度来源。"],
  ["explain why the relationship is linear", "解释为什么关系是线性的", "Connect the equation to the plotted variables and constant gradient.", "Explain why a graph of V against I is linear.", "解释为什么 V 关于 I 的图像是直线。"],
  ["the gradient represents", "斜率表示", "Write the physical or mathematical quantity including its unit.", "State the quantity represented by the gradient.", "写出该斜率所表示的物理量。"],
  ["the area under the graph represents", "图像下方面积表示", "Use axis units to identify the accumulated quantity.", "State what the area under the velocity-time graph represents.", "写出速度—时间图像下方面积所表示的物理量。"],
  ["initially increases at a decreasing rate", "起初增加但增速减小", "The quantity rises while its gradient remains positive but becomes smaller.", "The displacement initially increases at a decreasing rate.", "位移起初增加，但增加的速率逐渐减小。"],
  ["approaches a constant value", "趋近于一个恒定值", "The graph levels off toward a horizontal asymptote.", "The current approaches a constant value.", "电流逐渐趋近于一个恒定值。"],
  ["is directly proportional to", "与……成正比", "A graph through the origin is straight when the stated variables are used.", "The extension is directly proportional to the force.", "伸长量与力成正比。"],
  ["is inversely proportional to", "与……成反比", "The product of the two quantities is constant.", "The pressure is inversely proportional to the volume.", "压强与体积成反比。"],
  ["is proportional to the square of", "与……的平方成正比", "Doubling the input multiplies the output by four.", "The kinetic energy is proportional to the square of the speed.", "动能与速率的平方成正比。"],
  ["neglect energy losses", "忽略能量损失", "Treat the relevant mechanical or electrical energy transfer as ideal.", "Neglect energy losses to the surroundings.", "忽略向周围环境的能量损失。"],
  ["conservation of energy applies", "能量守恒适用", "Set total energy before equal to total energy after while tracking transfers.", "Use the fact that conservation of energy applies.", "利用能量守恒这一条件。"],
  ["the system is isolated", "系统是孤立的", "No external resultant force or relevant exchange acts on the system.", "Assume the collision system is isolated.", "假设碰撞系统是孤立的。"],
  ["comment on whether the value is reasonable", "评价该数值是否合理", "Compare magnitude unit sign and physical limits with real expectations.", "Comment on whether your calculated value is reasonable.", "评价你计算出的数值是否合理。"],
  ["use your answer to the previous part", "使用上一问答案", "Carry forward the previous result even if it may be numerically imperfect.", "Use your answer to the previous part to calculate the power.", "使用上一问的答案计算功率。"],
];

const itemOverrides = {
  "physics-measurement-and-practical-vector": {
    meaning: "向量",
    definition: "a quantity with both magnitude and direction",
    formula: "Rx = ΣFx, Ry = ΣFy; |R| = sqrt(Rx^2 + Ry^2)",
    example: "State the vector represented by the force diagram and explain its direction.",
    translation: "写出力图所表示的向量，并解释它的方向。",
    knowledgePoint: "A vector has both magnitude and direction; draw or state the direction as well as the size.",
    conceptExplanation: "向量不仅有数值大小，还必须带方向。力、位移、速度和加速度都是向量；质量、时间、温度和能量是标量。多个向量合成时要按方向分解为分量，不能只把大小直接相加。",
    methodSteps: ["先规定正方向并画箭头或受力图", "把每个向量分解到相互垂直的轴上", "分别代数相加得到 Rx 和 Ry", "由分量求合向量大小，并用象限说明方向"],
    formulaExplanation: "Σ 表示把同一方向的分量带正负号相加；模长永远非负，但分量可以为负。",
    examFocus: "题目常要求判断某个量是否为向量、从图中求合力/合位移，或解释为什么答案必须包含方向。",
    commonMistake: "只写 5 N 而不写方向；把 speed 当 velocity；或把相反方向的两个力大小直接相加。",
    workedExample: {
      question: "A force of 3 N acts east and a force of 4 N acts north. Find the resultant force.",
      steps: ["取东为 x 正方向、北为 y 正方向", "Rx = 3 N，Ry = 4 N", "|R| = sqrt(3^2 + 4^2) = 5 N", "方向 theta = tan^-1(4/3) = 53.1 degrees north of east"],
      answer: "合力为 5.0 N，方向为东偏北 53.1°。只有 5.0 N 没有方向是不完整答案。",
    },
  },
  "mathematics-trigonometry-and-vectors-vector": {
    meaning: "向量",
    definition: "a quantity with magnitude and direction that can be resolved into components",
    formula: "|v| = sqrt(x^2 + y^2) for a 2D vector (x, y)",
    knowledgePoint: "A vector is a quantity with magnitude and direction. In coordinate form, use components to calculate magnitude and direction.",
    example: "Find the magnitude of the vector and state how its components are used.",
    translation: "求该向量的模，并说明各分量如何用于计算。",
    conceptExplanation: "数学中的向量用有序分量表示大小和方向，例如列向量 (x, y)。向量可以相加、相减和数乘；平行向量互为数倍，垂直关系可以用点积为零判断。",
    methodSteps: ["把几何位移写成列向量或位置向量", "按对应分量完成加减或数乘", "用模长公式求大小，或用分量比求方向", "需要判断垂直时计算点积，判断平行时比较分量比例"],
    formulaExplanation: "|v| 给向量大小；a · b = 0（非零向量）表示垂直；a = kb 表示平行。",
    examFocus: "常见考法包括由两点求方向向量、证明直线平行/垂直、求夹角，以及把几何条件转成向量方程。",
    commonMistake: "把向量 (x, y) 与模长 sqrt(x^2 + y^2) 当成同一个量，或在相减时把起点和终点顺序写反。",
  },
  "mathematics-trigonometry-and-vectors-scalar-product": {
    formula: "a · b = |a||b|cos(theta)",
    knowledgePoint: "Use the scalar product to find angles or prove vectors are perpendicular.",
  },
  "mathematics-algebra-and-functions-remainder-theorem": {
    definition: "for a polynomial f(x), the remainder on division by x - a is f(a)",
    formula: "remainder = f(a)",
    knowledgePoint: "Substitute x = a to find the remainder quickly, then use the factor theorem if the remainder is zero.",
    example: "Use the remainder theorem to find the remainder when f(x) is divided by x - 2.",
    translation: "使用余数定理，求 f(x) 除以 x - 2 时的余数。",
  },
  "mathematics-algebra-and-functions-factor-theorem": {
    definition: "if f(a) = 0 then x - a is a factor of the polynomial",
    formula: "f(a) = 0",
    knowledgePoint: "The factor theorem links roots and factors; use it after testing a value.",
    example: "Use the factor theorem to show that x - 3 is a factor of the polynomial.",
    translation: "使用因式定理证明 x - 3 是该多项式的因式。",
  },
  "mathematics-algebra-and-functions-quadratic-formula": {
    meaning: "二次公式",
    definition: "a formula used to solve quadratic equations",
    formula: "x = (-b ± sqrt(b^2 - 4ac)) / 2a",
    knowledgePoint: "Use the discriminant to judge the number of roots before calculating.",
    example: "Use the quadratic formula to find the exact roots of the equation.",
    translation: "使用二次公式求该方程的精确根。",
  },
  "mathematics-algebra-and-functions-discriminant": {
    meaning: "判别式",
    definition: "the expression b^2 - 4ac used to determine the nature of quadratic roots",
    formula: "Δ = b^2 - 4ac",
    knowledgePoint: "A positive discriminant gives two real roots; zero gives one repeated root; negative gives no real roots.",
    example: "Find the discriminant and determine how many real roots the equation has.",
    translation: "求判别式，并判断该方程有多少个实根。",
  },
  "physics-mechanics-velocity": {
    formula: "v = displacement / time",
    knowledgePoint: "Velocity is a vector, so direction matters; speed is scalar.",
  },
  "physics-mechanics-acceleration": {
    formula: "a = Δv / Δt",
    knowledgePoint: "Acceleration is the rate of change of velocity and can be negative or directional.",
  },
  "physics-materials-density": {
    formula: "rho = m / V",
    knowledgePoint: "Density connects mass and volume; always check units before substituting.",
  },
  "physics-materials-pressure": {
    formula: "p = F / A",
    knowledgePoint: "Pressure increases when the same force acts over a smaller area.",
  },
  "physics-mechanics-newton-s-second-law": {
    formula: "ΣF = dp/dt; for constant mass, ΣF = ma",
    knowledgePoint: "The acceleration is caused by the resultant external force and points in the same direction as that resultant force.",
    conceptExplanation: "牛顿第二定律连接合外力与动量变化率。质量不变时才可写成 ΣF = ma；这里的 ΣF 是所有外力的矢量和，不是某一个单独的力。",
    methodSteps: ["选研究对象并画完整受力图", "规定正方向并把力分解到该方向", "写 ΣF = ma 或 ΣF = dp/dt", "联立运动关系并检查加速度方向"],
    formulaExplanation: "ΣF 的单位是 N，质量用 kg，加速度用 m s^-2；变质量或冲量问题优先使用 dp/dt。",
      examFocus: "题目常要求由受力图建立方程、解释速度为何改变，或比较合力为零与速度为零的区别。",
      commonMistake: "把重力 mg 直接写成 ma 而忽略支持力/张力/阻力，或认为合力为零时物体一定静止。",
      workedExample: { question: "A 2.0 kg trolley has a resultant force of 6.0 N east. Find its acceleration.", steps: ["选 trolley 为研究对象，合力已是 6.0 N east", "使用 ΣF = ma", "a = 6.0 / 2.0 = 3.0 m s^-2", "加速度方向与合力相同，即向东"], answer: "3.0 m s^-2 east" },
  },
  "physics-fields-and-electromagnetism-electric-potential": {
    formula: "V = W / Q; U = qV; for a point charge, V = kQ / r",
    knowledgePoint: "Electric potential is a scalar defined relative to a chosen zero; potential difference is energy transferred per unit charge between two points.",
    conceptExplanation: "电势表示单位正电荷在某点具有的电势能。它是标量，可以为正、负或零；电势差描述两个点之间每库仑电荷的能量变化，与电场强度不是同一个量。",
    methodSteps: ["确定源电荷、位置和电势零点", "判断求单点电势、两点电势差还是电势能", "代入 V = W/Q、U = qV 或点电荷公式", "根据源电荷和试探电荷符号检查正负"],
    formulaExplanation: "1 V = 1 J C^-1。V = kQ/r 只适用于点电荷或球对称且外部区域；无穷远通常取零电势。",
    examFocus: "常见考法是比较不同位置的电势、计算移动电荷的能量变化，并从 V-r 图判断场强。",
    commonMistake: "把 electric potential（J C^-1）与 electric potential energy（J）混淆，或忽略试探电荷 q 的正负号。",
  },
  "physics-waves-and-optics-diffraction": {
    conceptExplanation: "衍射是波通过狭缝或绕过障碍物时发生扩散。缝宽与波长相当时最明显；波长更长或缝更窄会使扩散角度更大。所有波都能衍射，不是光独有现象。",
    methodSteps: ["比较缝宽 a 与波长 lambda", "判断波前通过缝后的扩散程度", "画出新的弧形波前或强度分布", "说明改变波长或缝宽后的因果关系"],
    formula: "diffraction becomes pronounced when a is comparable to lambda",
    formulaExplanation: "这里是数量级条件，不是必须严格相等；a >> lambda 时衍射很弱。",
    examFocus: "题目常比较不同缝宽/波长的图样，要求解释无线电波绕建筑物而可见光不明显的原因。",
    commonMistake: "把衍射说成波速改变，或与折射、两列波叠加形成的干涉混淆。",
  },
  "physics-oscillations-simple-harmonic-motion": {
    formula: "a = -omega^2 x; F = -kx; T = 2pi / omega",
    knowledgePoint: "SHM requires acceleration proportional to displacement and directed toward equilibrium.",
    conceptExplanation: "简谐运动的判据是加速度大小与离开平衡位置的位移成正比，方向始终指向平衡位置。负号表示回复方向，不表示加速度数值一定为负。",
    methodSteps: ["定义平衡位置并规定 x 的正方向", "从受力关系证明 F 或 a 与 -x 成正比", "识别 omega 并求周期或频率", "用端点和平衡点检查速度、加速度和能量"],
    formulaExplanation: "平衡点 x = 0 时速度最大、加速度为零；端点 |x| = A 时速度为零、加速度大小最大。",
      examFocus: "常见考法是证明某系统为 SHM、读取 x/v/a 图像、计算周期，并解释动能和势能交换。",
      commonMistake: "把任何周期运动都当 SHM，漏掉负号，或认为端点处加速度为零。",
      workedExample: { question: "For a mass in SHM, x = 0.040 m and omega = 5.0 rad s^-1. Find the acceleration.", steps: ["使用 a = -omega^2 x", "a = -(5.0)^2(0.040)", "a = -1.0 m s^-2", "负号表示加速度指向平衡位置"], answer: "1.0 m s^-2 toward equilibrium" },
  },
  "mathematics-algebra-and-functions-composite-function": {
    formula: "(f o g)(x) = f(g(x))",
    conceptExplanation: "复合函数表示先做内层函数再做外层函数。f(g(x)) 与 g(f(x)) 一般不相等；复合后的定义域还必须保证 x 能进入 g，且 g(x) 能进入 f。",
    methodSteps: ["先确认题目要求 fg 还是 gf", "把内层函数完整代入外层自变量位置", "化简但保留定义域限制", "用一个简单数值检查运算顺序"],
    formulaExplanation: "符号 f o g 表示先 g 后 f；运算顺序从括号最内层开始。",
    examFocus: "常见考法是求 fg、gf、复合定义域，或用复合函数建立多阶段变化模型。",
    commonMistake: "把 f(g(x)) 错写成 f(x)g(x)，或忽略根号、分母和对数带来的定义域限制。",
  },
  "mathematics-calculus-derivative": {
    formula: "f'(x) = lim(h->0) [f(x+h)-f(x)] / h",
    conceptExplanation: "导数同时表示函数的瞬时变化率和曲线在该点的切线斜率。dy/dx、f'(x) 是同一思想的不同记号；导数的单位是因变量单位除以自变量单位。",
    methodSteps: ["确认对哪个变量求导", "选择幂、乘积、商或链式法则", "保留中间步骤并化简", "用导数符号解释增减、驻点或实际变化率"],
    formulaExplanation: "极限定义解释导数来源；常规计算时使用求导法则，但链式法则的内函数导数不能遗漏。",
      examFocus: "常见考法是求切线、驻点、单调区间、最优化，以及在运动或经济模型中解释变化率。",
      commonMistake: "把导数当函数值，漏链式法则因子，或只令 f'(x)=0 却不判断驻点性质。",
      workedExample: { question: "For y = x^3 - 3x, find the stationary points and classify them.", steps: ["dy/dx = 3x^2 - 3", "令 3x^2 - 3 = 0，得 x = +/-1", "代回得 points (-1, 2) and (1, -2)", "d^2y/dx^2 = 6x：x=-1 为 maximum，x=1 为 minimum"], answer: "Maximum at (-1, 2); minimum at (1, -2)." },
  },
  "mathematics-calculus-integration-by-parts": {
    formula: "integral u dv = uv - integral v du",
    conceptExplanation: "分部积分由乘积求导法则反推，适合被积式是两个不同类型函数的乘积。核心是选择 u 使求导后更简单，并把其余部分连同 dx 作为 dv。",
    methodSteps: ["按 log/反三角/代数/三角/指数的优先思路选择 u", "求 du 并积分 dv 得 v", "代入 uv - integral v du", "定积分要对整个 uv 项和剩余积分同时代上下限"],
    formulaExplanation: "负号最容易丢；必要时可以重复使用分部积分并把原积分移项求解。",
    examFocus: "常见考法包括 x e^x、x sin x、ln x 和需要两次分部积分的表达式。",
    commonMistake: "只写 u 和 v 不写 du/dv，dv 没包含 dx，或定积分只给一部分代入边界。",
  },
  "mathematics-statistics-and-probability-binomial-distribution": {
    formula: "X ~ B(n,p); P(X=r) = C(n,r)p^r(1-p)^(n-r); E(X)=np; Var(X)=np(1-p)",
    conceptExplanation: "二项分布描述固定次数、相互独立、每次只有成功/失败两种结果且成功概率恒定的试验中成功次数。四个条件缺一不可。",
    methodSteps: ["确认固定 n、两种结果、独立、p 恒定", "定义 X 表示成功次数", "翻译 exactly/at least/at most 为对应概率", "选择单项概率、累计概率或补事件并检查范围"],
    formulaExplanation: "at least r 常用 1 - P(X <= r-1)；计算器累计功能的上界是否包含端点必须确认。",
      examFocus: "常见考法是识别二项模型、计算累计概率、求期望方差，或判断近似是否合理。",
      commonMistake: "把抽样不放回仍当独立，at least 与 at most 读反，或在补事件中出现 off-by-one。",
      workedExample: { question: "A fair coin is tossed 5 times. Find the probability of exactly 3 heads.", steps: ["X ~ B(5, 0.5)，因为每次独立且成功概率恒定", "P(X=3) = C(5,3)(0.5)^3(0.5)^2", "= 10 x 0.5^5", "= 0.3125"], answer: "P(X=3) = 0.3125" },
  },
  "chemistry-atomic-and-quantitative-mole": {
    formula: "n = m / M; n = N / NA; c = n / V",
    conceptExplanation: "摩尔是物质的量单位，1 mol 含 Avogadro 常数个指定粒子。它把微观粒子数与可测的质量、溶液体积和气体体积连接起来；必须说明粒子是原子、分子、离子还是电子。",
    methodSteps: ["写出已知量并确定粒子类型", "用质量、浓度或粒子数换算成 mol", "按配平方程取 mole ratio", "换算成题目所求量并写单位"],
    formulaExplanation: "M 用 g mol^-1 时质量用 g；c 用 mol dm^-3 时体积用 dm^3；NA = 6.02 x 10^23 mol^-1。",
      examFocus: "常见考法是化学计量、滴定、经验式、气体和限量试剂计算，过程分通常来自清楚写出 mol。",
      commonMistake: "直接用质量比代替方程系数比，忘记 cm^3 转 dm^3，或未说明 N 代表哪一种粒子。",
      workedExample: { question: "Find the amount of substance in 5.85 g of NaCl (Mr = 58.5).", steps: ["使用 n = m / Mr", "n = 5.85 / 58.5 mol", "n = 0.100 mol", "NaCl 的粒子是 formula units，不要写成 Na 原子数"], answer: "0.100 mol NaCl" },
  },
  "chemistry-bonding-reactions-electronegativity": {
    conceptExplanation: "电负性是成键原子吸引共享电子对的能力。周期表中通常向右、向上增大；电负性差产生键极性，但分子的整体极性还取决于形状和各键偶极是否抵消。",
    methodSteps: ["比较成键原子的电负性", "标出 delta+ 和 delta-", "结合分子形状判断键偶极是否抵消", "用极性解释分子间作用力和性质"],
    examFocus: "常见考法是判断极性键/分子、解释沸点或溶解性，并比较同周期或同族元素趋势。",
    commonMistake: "把有极性键直接等同于极性分子，或用一个固定电负性差机械判定所有离子键。",
  },
  "chemistry-energetics-kinetics-equilibrium-hess-s-law": {
    formula: "total enthalpy change is independent of route",
    conceptExplanation: "Hess 定律来自焓是状态函数：只要起点和终点相同，总焓变与反应路径无关。构造循环时，反向方程要改变 deltaH 符号，倍乘方程也要倍乘 deltaH。",
    methodSteps: ["写目标反应和已知反应", "调整方向与系数使物质抵消", "同步改变每个 deltaH 的符号和倍数", "相加并检查起点终点与状态符号"],
    examFocus: "常见考法使用生成焓、燃烧焓或键能数据求未知焓变，必须展示循环或方程组合。",
    commonMistake: "反向反应不改符号、方程乘 2 但 deltaH 不乘 2，或忽略不同物态。",
  },
  "chemistry-organic-chemistry-nucleophile": {
    conceptExplanation: "亲核试剂是电子对供体，通常带负电或具有孤对电子，会攻击缺电子的正电或 delta+ 原子。在有机机理中弯箭必须从电子对或负键出发，指向新键形成的位置。",
    methodSteps: ["找到亲核试剂的孤对电子或负电荷", "找到底物中的 delta+ 反应中心", "从电子对画弯箭到该原子", "同时画出离去键断裂并检查电荷守恒"],
    examFocus: "常见考法是亲核取代和亲核加成机理，要求正确的弯箭、部分电荷、中间体和产物。",
    commonMistake: "弯箭从原子或负号开始而不是电子对/键开始，或让亲核试剂攻击已经富电子的原子。",
  },
  "chemistry-analysis-and-practical-chromatography": {
    formula: "Rf = distance travelled by solute / distance travelled by solvent front",
    conceptExplanation: "色谱利用各组分在固定相与流动相之间作用不同而产生不同移动速度。Rf 只有在相同固定相、溶剂、温度等条件下才可与标准比较。",
    methodSteps: ["用铅笔画基线并点样", "让溶剂前沿移动但不淹没样点", "及时标记溶剂前沿并测量距离", "计算 Rf、比较标准并结合点数判断组成"],
    examFocus: "常见考法是计算 Rf、识别混合物组分、评价纯度和改进分离条件。",
    commonMistake: "用墨水画基线、样点浸在溶剂中、忘记标记 solvent front，或跨不同实验条件直接比较 Rf。",
  },
  "economics-microeconomics-demand": {
    conceptExplanation: "需求是在特定时期内、不同价格下，消费者愿意且有能力购买的数量。商品自身价格变化导致沿需求曲线移动；收入、偏好、相关商品价格等非价格因素变化才使整条需求曲线移动。",
    methodSteps: ["确认变化的是自身价格还是非价格决定因素", "判断 contraction/extension 还是 demand shift", "在图上标出原均衡和新均衡", "解释价格、数量和利益相关者结果"],
    examFocus: "常见考法是区分 demand 与 quantity demanded，并用情境解释需求曲线左移或右移。",
    commonMistake: "看到购买量下降就一律说需求下降，忘记 willing and able 或其他条件不变。",
  },
  "economics-microeconomics-price-elasticity-of-demand": {
    formula: "PED = percentage change in quantity demanded / percentage change in price",
    conceptExplanation: "需求价格弹性衡量需求量对价格变化的敏感程度。计算值通常为负，分析时常用绝对值：大于 1 为 elastic，小于 1 为 inelastic，等于 1 为 unit elastic。",
    methodSteps: ["计算价格和需求量的百分比变化", "代入 PED 并说明是否取绝对值", "按数值判断弹性类别", "结合总收益、时间、替代品和必需程度解释"],
    formulaExplanation: "需求富有弹性时降价通常提高总收益；缺乏弹性时涨价通常提高总收益，前提是其他因素不变。",
      examFocus: "常见考法是数值计算、解释决定因素、分析企业定价和间接税负担。",
      commonMistake: "用数量变化除以价格变化而不是百分比，忽略负号约定，或把斜率与弹性当成同一个概念。",
      workedExample: { question: "Price rises by 10% and quantity demanded falls by 25%. Calculate PED and classify demand.", steps: ["PED = %ΔQd / %ΔP", "PED = -25% / 10% = -2.5", "分析弹性时通常取绝对值 2.5", "|PED| > 1，所以 demand is elastic"], answer: "PED = -2.5; demand is price elastic." },
  },
  "economics-microeconomics-externality": {
    conceptExplanation: "外部性是生产或消费对未参与交易的第三方造成的成本或收益。负外部性下 MSC > MPC 或 MSB < MPB，市场数量偏高；正外部性通常导致市场数量偏低。",
    methodSteps: ["判断是生产/消费及正/负外部性", "区分私人和外部成本或收益", "在图上标出市场与社会最优数量", "分析福利损失及税收、补贴、监管或信息政策"],
    examFocus: "常见考法是用边际社会/私人曲线解释市场失灵，并评价政策能否内部化外部性。",
    commonMistake: "只说污染是坏事，没有第三方和边际分析；或把政府干预自动视为零成本且一定有效。",
  },
  "economics-market-structures-and-labour-oligopoly": {
    conceptExplanation: "寡头市场由少数大型企业占据较高市场份额，企业决策相互依赖并存在较高进入壁垒。企业可能串谋，也可能通过广告、品牌和创新进行非价格竞争。",
    methodSteps: ["用集中度和进入壁垒识别市场结构", "分析企业对竞争者反应的预期", "区分串谋、价格竞争和非价格竞争", "评价价格、选择、创新和效率"],
    examFocus: "常见考法是结合真实行业解释相互依赖、串谋稳定性、价格刚性和监管。",
    commonMistake: "认为所有寡头都会串谋，或只凭企业数量判断而不讨论市场份额和进入壁垒。",
  },
  "economics-macroeconomics-fiscal-policy": {
    formula: "budget balance = government revenue - government spending",
    conceptExplanation: "财政政策是政府通过税收和政府支出影响总需求、资源配置和长期供给。扩张性政策通常提高 AD，紧缩性政策降低 AD；效果取决于乘数、经济闲置程度、时滞、债务和挤出。",
    methodSteps: ["识别税收/支出工具和政策方向", "写出可支配收入、消费或政府购买到 AD 的传导", "用 AD/AS 分析产出、价格和就业", "评价乘数、时滞、债务、挤出和供给约束"],
    examFocus: "常见考法是比较扩张与紧缩财政政策，结合经济周期评价对增长、通胀、失业和债务的影响。",
    commonMistake: "只说政府支出增加经济增长，没有 AD 传导链，或忽略接近充分就业时更强的通胀压力。",
  },
};

function resolveTermField(term, override, field) {
  if (override && Object.prototype.hasOwnProperty.call(override, field) && override[field] !== undefined && override[field] !== "") {
    return override[field];
  }
  if (term && Object.prototype.hasOwnProperty.call(term, field) && term[field] !== undefined && term[field] !== "") {
    return term[field];
  }
  return "";
}

function buildTermExample(group, term, override) {
  if (override?.example) return override.example;
  const formula = resolveTermField(term, override, "formula");
  if (group.subject === "chemistry") return formula
    ? `A ${group.label} question requires ${term.word}. Which quantities and conditions must be checked before using ${formula}?`
    : `A question describes ${term.definition}. Identify ${term.word}, then state the chemical evidence or condition that would confirm it.`;
  if (group.subject === "economics") return `A case study may involve ${term.word}, meaning ${term.definition}. Which evidence would establish it, and what causal effect should be analysed?`;
  if (group.subject === "mathematics") return formula
    ? `A ${group.label} problem requires ${term.word}. State when ${formula} can be used and identify the values needed.`
    : `A problem involves ${term.word}, meaning ${term.definition}. Which mathematical condition or operation must be checked before using it?`;
  if (group.subject === "physics") return formula
    ? `A ${group.label} problem requires ${term.word}. Which measured quantities, directions, and conditions must be identified before using ${formula}?`
    : `A problem describes ${term.definition}. Identify ${term.word}, then state the physical evidence or condition needed to apply it.`;
  return `Use ${term.word} in the context of the question and state the result clearly.`;
}

function buildTermTranslation(group, term, override) {
  if (override?.translation) return override.translation;
  const formula = resolveTermField(term, override, "formula");
  if (group.subject === "chemistry") return formula
    ? `${group.label} 题要求使用“${term.meaning}”。在使用 ${formula} 前，必须检查哪些量和条件？`
    : `题目描述了“${term.definition}”。识别“${term.meaning}”，再写出能够确认它的化学证据或条件。`;
  if (group.subject === "economics") return `材料可能涉及“${term.meaning}”，其含义是“${term.definition}”。需要什么证据确认它，又应分析哪条因果影响？`;
  if (group.subject === "mathematics") return formula
    ? `${group.label} 题要求使用“${term.meaning}”。说明何时可使用 ${formula}，并找出所需数值。`
    : `题目涉及“${term.meaning}”，其含义是“${term.definition}”。应用前必须检查哪个数学条件或运算？`;
  if (group.subject === "physics") return formula
    ? `${group.label} 题要求使用“${term.meaning}”。在使用 ${formula} 前，必须识别哪些测量量、方向和条件？`
    : `题目描述了“${term.definition}”。识别“${term.meaning}”，再写出应用它所需的物理证据或条件。`;
  if (group.translation) return fillStudyText(group.translation, group, term);
  return `根据题目语境理解 ${term.meaning}，并把它和 ${group.label} 的计算或解释要求对应起来。`;
}

function buildTermNote(group, term, override) {
  if (override?.cn) return override.cn;
  const guide = studyGuideFor(group);
  const detail = [
    `把 ${term.word} 理解为「${term.meaning}」`,
    term.definition ? `定义判据是：${term.definition}` : "",
    override?.knowledgePoint || term.knowledgePoint ? `关键关系：${override?.knowledgePoint || term.knowledgePoint}` : "",
    guide.concept,
  ].filter(Boolean).join("；");
  return `${detail.replace(/[。；]+$/, "")}。`;
}

function buildConceptExplanation(group, term, override) {
  if (override?.conceptExplanation) return override.conceptExplanation;
  const guide = studyGuideFor(group);
  const specific = override?.knowledgePoint || term.knowledgePoint;
  const collocations = Array.isArray(term.collocations) ? term.collocations.slice(0, 3).join("、") : "";
  return [
    `${term.word}（${term.meaning}）指：${override?.definition || term.definition}。`,
    specific ? `本词的关键关系是：${specific}` : "",
    collocations ? `题目中常见搭配：${collocations}。` : "",
    guide.concept,
  ].filter(Boolean).join(" ");
}

function buildMethodSteps(group, term, override) {
  const steps = Array.isArray(override?.methodSteps) && override.methodSteps.length
    ? override.methodSteps
    : studyGuideFor(group).steps;
  return steps.map((step) => fillStudyText(step, group, term));
}

function buildExamFocus(group, term, override) {
  return fillStudyText(override?.examFocus || studyGuideFor(group).examFocus, group, term);
}

function buildCommonMistake(group, term, override) {
  return fillStudyText(override?.commonMistake || studyGuideFor(group).commonMistake, group, term);
}

function buildFormulaExplanation(group, term, override, formula) {
  if (!formula) return "";
  if (override?.formulaExplanation) return override.formulaExplanation;
  return `${formula} 是 ${term.word} 在本专题中的定量关系。使用前先按“${term.definition}”确认模型成立，再写清每个符号、统一单位并检查结果是否符合题目条件。`;
}

function buildWorkedExample(group, term, override) {
  return override?.workedExample || null;
}

const items = [];
for (const group of groups) {
  for (const term of group.terms) {
    const id = `${group.subject}-${group.topic}-${slug(term.word)}`;
    const override = itemOverrides[id] || {};
    const contentTerm = {
      ...term,
      meaning: resolveTermField(term, override, "meaning") || term.meaning,
      definition: resolveTermField(term, override, "definition") || term.definition,
    };
    items.push({
      id,
      subject: group.subject,
      topic: group.topic,
      topicLabel: group.label,
      type: group.type || "term",
      word: term.word,
      phonetic: "",
      meaning: contentTerm.meaning,
      definition: contentTerm.definition,
      cn: buildTermNote(group, contentTerm, override),
      example: buildTermExample(group, contentTerm, override),
      translation: buildTermTranslation(group, contentTerm, override),
      formula: resolveTermField(term, override, "formula") || "",
      formulaExplanation: buildFormulaExplanation(group, term, override, resolveTermField(term, override, "formula") || ""),
      knowledgePoint: resolveTermField(term, override, "knowledgePoint") || `${contentTerm.word} 的判定条件是：${contentTerm.definition}。答题时要把定义与 ${group.label} 的模型、证据、图像或计算对应起来。`,
      conceptExplanation: buildConceptExplanation(group, contentTerm, override),
      methodSteps: buildMethodSteps(group, contentTerm, override),
      examFocus: buildExamFocus(group, contentTerm, override),
      commonMistake: buildCommonMistake(group, contentTerm, override),
      workedExample: buildWorkedExample(group, contentTerm, override),
      collocations: term.collocations,
    });
  }
}

for (const [word, meaning, definition, example, translation] of commandRows) {
  items.push({
    id: `exam-language-command-${slug(word)}`,
    subject: "exam-language",
    topic: "command-words",
    topicLabel: "Command Words",
    type: "command",
    word,
    phonetic: "",
    meaning,
    definition,
    formula: "",
    formulaExplanation: "",
    knowledgePoint: `${word} 决定答案需要执行的动作和可计分证据。`,
    cn: "先识别题目动词，再决定答案需要写数值、步骤、证据还是完整解释。",
    conceptExplanation: `${word} 是评分要求，不是装饰词。先按定义判断答案需要提供结果、过程、证据、因果链还是评价，再决定作答长度。`,
    methodSteps: ["圈出 command word", "标出分值和题目对象", "把定义转成可计分的答案结构", "提交前逐项检查是否回应了命令词"],
    examFocus: `考官会按 ${word} 要求寻找对应证据；内容正确但答题动作不匹配仍会丢分。`,
    commonMistake: "把 state、describe、explain、calculate 和 evaluate 当成相同要求，导致答案过短或写了无关内容。",
    workedExample: null,
    example,
    translation,
    collocations: [`${word} the answer`, `${word} clearly`],
  });
}

for (const [word, meaning, definition, example, translation] of phraseRows) {
  items.push({
    id: `exam-language-question-stem-${slug(word)}`,
    subject: "exam-language",
    topic: "question-stems",
    topicLabel: "Question Sentences",
    type: "phrase",
    word,
    phonetic: "",
    meaning,
    definition,
    formula: "",
    formulaExplanation: "",
    knowledgePoint: `${word} 是题干条件；必须把它转化为后续模型、方程或结论限制。`,
    cn: "A-Level 数学/物理题干理解：先翻译限制条件，再把它转换成方程、模型或答题要求。",
    conceptExplanation: `这不是需要死背的单词，而是一段模型条件或答题限制。${definition}`,
    methodSteps: ["逐词翻译条件", "判断它允许忽略什么或固定什么", "把条件写成方程、不等式或模型", "检查答案是否满足全部限制"],
    examFocus: "题目句经常决定可用公式、样本空间、方向、近似条件或结论措辞。",
    commonMistake: "只翻译字面意思，没有把条件转化成数学/物理约束，或在后续计算中忘记该条件。",
    workedExample: null,
    example,
    translation,
    collocations: [],
  });
}

const payload = {
  schemaVersion: "alevel-stem-vocabulary.v2",
  catalogVersion: "2026-08-07-knowledge-v2",
  itemCount: items.length,
  items,
};

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Generated ${items.length} A-Level STEM vocabulary items at ${outputUrl.pathname}`);
