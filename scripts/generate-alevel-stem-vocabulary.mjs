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
    idSlug: entry.idSlug || "",
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
  "biology:cell-biology": {
    concept: "细胞生物学要把结构、膜运输、细胞周期和显微证据联系起来；解释结构时必须说明它如何支持功能。",
    steps: ["先确定结构或过程发生在细胞的哪一部分", "写出跨膜运输或细胞周期的方向、能量和条件", "把显微图、实验变量或数据与机制对应", "检查专有名词、比例尺、单位和结论范围"],
    examFocus: "常见考法是比较细胞结构、解释膜运输、计算放大率或分析有丝分裂图像。",
    commonMistake: "只背结构名称，不解释结构与功能的因果关系，或把 diffusion、osmosis 和 active transport 混为一谈。",
  },
  "biology:biological-molecules-and-enzymes": {
    concept: "生物分子题要从单体、键、结构和性质出发，连接到酶的特异性、反应速率和实验数据。",
    steps: ["识别分子单体、键型和可检验的官能团", "判断题目问的是结构、反应还是生物学功能", "用锁钥/诱导契合和碰撞解释酶速率", "用对照、重复、异常值和限制因素评价数据"],
    examFocus: "常见考法是食物测试、缩合/水解、酶活性曲线和温度或 pH 对速率的影响。",
    commonMistake: "把 enzyme denaturation 说成只是暂时失活，或只描述曲线形状而不解释 active site 和碰撞频率。",
  },
  "biology:exchange-and-transport": {
    concept: "交换与运输题的核心是浓度梯度、表面积、距离、流速和专门化结构之间的关系。",
    steps: ["圈出交换物质、方向、梯度和组织位置", "比较表面积、扩散距离、供血或通气条件", "选择 diffusion、facilitated diffusion、osmosis 或 active transport", "用数据和结构证据说明交换速率是否足够"],
    examFocus: "常见考法是肺泡、鱼鳃、根毛、木质部/韧皮部和心血管系统的结构功能解释。",
    commonMistake: "把水势梯度写成溶质浓度梯度，或忘记 active transport 需要 ATP 和载体蛋白。",
  },
  "biology:genetics-and-evolution": {
    concept: "遗传与进化必须区分 DNA、gene、allele、genotype 和 phenotype，并把分离、变异、选择与群体频率变化串成证据链。",
    steps: ["定义等位基因、基因型、表型和显隐性关系", "画遗传图或写概率，明确亲本和配子", "区分 mutation 产生变异与 natural selection 改变频率", "用样本、统计检验和环境条件评价进化结论"],
    examFocus: "常见考法是遗传图、卡方检验、DNA 复制/表达、突变和抗药性进化。",
    commonMistake: "把个体在一生中获得的特征当成遗传进化，或把 dominant 误写成常见/更强。",
  },
  "biology:energy-and-ecosystems": {
    concept: "能量与生态题要追踪光能、化学能、营养级、生产量和物质循环，说明能量为何沿食物链逐级减少。",
    steps: ["确定营养级、能量输入和研究时间/面积", "区分 biomass、productivity、energy transfer 和 nutrient pool", "用食物网、金字塔或循环图写出传递路径", "评价采样方法、可持续性和人类干预的限制"],
    examFocus: "常见考法是光合作用、生产量计算、食物链能量损失、碳循环和种群调查。",
    commonMistake: "把能量循环和元素循环混为一谈，或认为金字塔每一级的所有能量都传给下一级。",
  },
  "biology:homeostasis-and-immunity": {
    concept: "稳态与免疫题要写清刺激、受体、协调中心、效应器和负反馈，免疫题还要区分抗原、抗体和记忆细胞。",
    steps: ["找出变量、正常范围和偏离方向", "按 stimulus-receptor-coordinator-effector 写反馈链", "区分 hormonal 与 nervous coordination 的速度和持续时间", "解释抗体特异性、克隆选择、疫苗和二次免疫反应"],
    examFocus: "常见考法是血糖、体温、水势、神经传导、激素和疫苗免疫曲线。",
    commonMistake: "把 negative feedback 写成不断放大偏差，或把 vaccine 的抗体直接当作长期免疫记忆。",
  },
};

const subjectStudyGuides = {
  physics: topicStudyGuides["physics:measurement-and-practical"],
  mathematics: topicStudyGuides["mathematics:algebra-and-functions"],
  chemistry: topicStudyGuides["chemistry:bonding-reactions"],
  economics: topicStudyGuides["economics:microeconomics"],
  biology: topicStudyGuides["biology:cell-biology"],
  "computer-science": {
    concept: "计算机科学术语要落到数据表示、算法步骤、系统边界、网络安全和可执行逻辑，不能只背中文名。",
    steps: ["确定输入、输出和数据类型", "识别算法、硬件、网络或安全模型", "写出步骤、条件或状态变化", "用边界情况、效率和安全影响检查答案"],
    examFocus: "常见考法是解释程序逻辑、数据结构、网络协议、硬件组件、数据库和网络安全风险。",
    commonMistake: "只写工具名称，不说明数据如何被存储、处理、传输或保护。",
  },
  business: {
    concept: "商务术语要联系企业目标、利益相关者、市场定位、运营决策、财务指标和风险评价。",
    steps: ["识别企业目标和利益相关者", "把术语放入市场、运营、人力或财务情境", "用数据或案例建立因果链", "评价短长期影响和限制条件"],
    examFocus: "常见考法是解释企业决策对利润、现金流、市场份额、员工和顾客的影响。",
    commonMistake: "只给定义，不结合 case study 数据或利益相关者评价。",
  },
  geography: {
    concept: "地理术语要把过程、地点、尺度、证据和人地关系连接起来，尤其注意图表、地图和案例材料。",
    steps: ["确定自然或人文过程及空间尺度", "读取地图、图表或案例数据", "解释原因、影响和反馈关系", "评价管理策略、可持续性和不同群体影响"],
    examFocus: "常见考法是解释地貌、天气、人口、城市化、发展差异、灾害和资源管理。",
    commonMistake: "只描述现象，不说明过程链、地点证据或尺度差异。",
  },
  accounting: {
    concept: "会计术语要联系交易记录、财务报表、比率、原则和商业决策，必须清楚区分现金、利润和资本。",
    steps: ["识别交易类型和账户类别", "判断影响资产、负债、权益、收入或费用", "使用合适报表或比率公式", "解释结果对流动性、盈利能力或财务稳定性的意义"],
    examFocus: "常见考法是 journal、ledger、trial balance、financial statements、ratio analysis 和错误更正。",
    commonMistake: "把 cash surplus 当 profit，或只算比率不解释商业含义。",
  },
  psychology: {
    concept: "心理学术语要联系研究方法、变量、伦理、认知/社会/生物解释和证据质量。",
    steps: ["识别研究问题、变量和样本", "区分实验、相关、观察或个案方法", "用理论解释行为或数据", "评价信度、效度、伦理和文化限制"],
    examFocus: "常见考法是定义研究术语、解释行为机制、比较研究方法并评价证据。",
    commonMistake: "只背理论名称，不说明变量、证据和研究局限。",
  },
  law: {
    concept: "法律术语必须放在事实、法律规则、适用条件、证据标准和结论之间理解，不能只给出中文翻译。",
    steps: ["找出当事人、争点和事实", "写出相关法律规则或测试", "把事实逐项适用于规则", "用证据、反驳和救济作出有条件结论"],
    examFocus: "常见考法是解释法律概念、分析案例事实、比较判例或成文法，并评价司法与法律改革。",
    commonMistake: "只复述案件事实，或写出规则却没有把每个构成要件适用于证据。",
  },
  sociology: {
    concept: "社会学术语应连到社会结构、身份、权力、研究证据和不同理论视角，答案需要说明机制而不仅是观点名称。",
    steps: ["确定研究对象、群体和社会尺度", "区分功能主义、马克思主义、女权主义或互动论视角", "用研究证据解释机制", "评价代表性、因果性和文化/时间限制"],
    examFocus: "常见考法是教育、家庭、犯罪、媒体和社会分层的理论解释及方法评价。",
    commonMistake: "把理论标签当成解释，或没有比较不同群体和研究证据。",
  },
  politics: {
    concept: "政治术语要连接制度规则、权力来源、参与者、宪法约束和现实政治证据，并区分法律权力与实际影响力。",
    steps: ["识别制度、行为者和宪法规则", "说明权力如何被授予、限制或问责", "结合选举、议会、法院或媒体证据", "评价有效性、代表性和改革代价"],
    examFocus: "常见考法是比较政治制度、解释选举与参与、评价权力制衡和权利保护。",
    commonMistake: "只描述机构职责，不分析其权力边界、约束或实际政治结果。",
  },
  history: {
    concept: "历史术语必须与时间线、因果链、史料出处与解释争议结合；答案要区分事件叙述、证据与历史判断。",
    steps: ["定位时间、地点、行动者和背景", "区分短期触发因素与长期原因", "评估史料来源、目的、价值和局限", "比较解释并形成有证据的判断"],
    examFocus: "常见考法是因果、变化与连续性、史料分析和历史解释比较。",
    commonMistake: "把时间线罗列当分析，或把史料内容直接当作客观事实而不评估出处。",
  },
  "environmental-management": {
    concept: "环境管理术语应放在生态过程、资源流、监测证据、利益相关者和可持续性权衡中理解。",
    steps: ["明确系统边界、尺度和环境指标", "解释自然过程与人类压力", "比较管理措施的成本、收益和副作用", "用数据评价长期可持续性和不确定性"],
    examFocus: "常见考法是生态系统、污染、资源管理、气候风险、环境影响评估和政策评价。",
    commonMistake: "只说某措施环保，没有说明作用机制、证据、转移影响或长期限制。",
  },
  "design-technology": {
    concept: "设计技术术语应连接用户需求、规格、材料性能、制造过程、原型测试和迭代评价。",
    steps: ["识别用户、场景和设计约束", "把术语转成可量化的规格或材料选择", "说明制造/测试方法与质量控制", "根据证据评价并提出下一轮改进"],
    examFocus: "常见考法是分析设计 brief、选择材料和工艺、解释结构/电子系统并评价原型。",
    commonMistake: "只列材料或工艺优点，未连接用户需求、限制、制造可行性或测试证据。",
  },
  "english-language": {
    concept: "英语语言术语应以真实语料为证据，分析语音、词汇、语法、语篇、语境、身份和语言变化，而非机械找术语。",
    steps: ["定位语境、受众、目的和语料类型", "选择精确的语言层级术语", "引用短语、结构或互动证据", "解释语言选择如何建构意义、关系或身份"],
    examFocus: "常见考法是语言分析、儿童语言发展、语言多样性、语言变化和语料比较。",
    commonMistake: "堆砌术语而没有引用语料，或只说某特征存在而不解释其语境效果。",
  },
  "english-literature": {
    concept: "文学术语需要服务于文本细读：把语言、结构、形式、人物、语境和不同解读连成论证。",
    steps: ["确定引文、叙述位置和文本阶段", "命名相关语言、结构或戏剧手法", "解释其对人物、主题或读者的影响", "结合语境与替代解读形成判断"],
    examFocus: "常见考法是 close reading、主题比较、叙事/戏剧方法、诗歌形式和批评视角。",
    commonMistake: "只贴手法标签，没有分析引文细节或把作者意图说成唯一解释。",
  },
  "media-studies": {
    concept: "媒体研究术语需要结合媒介产品、产业、受众、表征、技术和权力关系；每个判断都要回到具体媒体文本或数据。",
    steps: ["定位媒介形式、生产者、平台和受众", "选择表征、叙事、符号或产业术语", "引用具体镜头、语言、版式或数据证据", "评价权力、商业模式、受众解读和技术变化"],
    examFocus: "常见考法是媒体语言、表征、受众、产业、监管、数字平台和跨媒体比较。",
    commonMistake: "只说媒体在影响人，没有具体产品证据，或把受众简单当成被动接受者。",
  },
  "physical-education": {
    concept: "体育术语要联系运动表现、身体系统、技能学习、训练原则、心理因素和数据，而不仅是给出定义。",
    steps: ["明确运动情境、动作阶段和表现目标", "选择生理、力学、技能或心理模型", "使用数据、训练原则或动作证据", "评价表现限制、风险与改进方案"],
    examFocus: "常见考法是解剖生理、运动生物力学、运动心理、训练方法、社会文化与表现分析。",
    commonMistake: "只写训练能提高表现，没有说明适应机制、运动专项性或安全限制。",
  },
  "art-design": {
    concept: "艺术与设计术语必须用于视觉证据、材料过程、艺术家语境和个人意图的分析，不应变成孤立的风格标签。",
    steps: ["描述作品的可见形式、媒材与构图", "选择精确视觉语言或过程术语", "解释效果、意图和观者经验", "联系艺术家、时代语境和个人发展"],
    examFocus: "常见考法是视觉分析、艺术家研究、媒材试验、创作过程、策展与个人作品集评价。",
    commonMistake: "只列颜色或风格名称，没有分析构图、媒材、语境或创作决策。",
  },
  drama: {
    concept: "戏剧术语要服务于表演与观演关系：把剧本细节、舞台空间、声音、动作、节奏和观众效果连接起来。",
    steps: ["定位场景、角色目标和戏剧冲突", "选择表演、舞台或结构手法", "说明实际舞台实现与观众感受", "评价替代表演选择、语境和整体效果"],
    examFocus: "常见考法是表演解读、导演概念、设计元素、戏剧结构、观众反应和现场评价。",
    commonMistake: "只说演员要有感情，或列舞台元素而没有说明它们怎样塑造观众理解。",
  },
  music: {
    concept: "音乐术语要和可听见的证据相连，包括旋律、和声、节奏、织体、音色、结构、表演和历史语境。",
    steps: ["定位听觉片段、乐器和结构位置", "使用精确的旋律、和声、节奏或织体术语", "解释该特征如何塑造张力、风格或表达", "联系作曲家、流派、演奏传统与替代解读"],
    examFocus: "常见考法是听辨分析、乐谱阅读、和声/节奏、音乐史、作曲技法和表演评价。",
    commonMistake: "只说音乐快或慢、开心或悲伤，没有说明具体节奏、调性、音色或织体证据。",
  },
  "religious-studies": {
    concept: "宗教研究术语应连接宗教传统、经文/实践、哲学论证、伦理原则和不同学者解释，并明确论证的前提。",
    steps: ["识别问题所属传统、哲学或伦理框架", "准确界定概念和关键论证", "使用文本、学者或案例支持", "比较反驳并形成有条件评价"],
    examFocus: "常见考法是宗教信仰与实践、哲学问题、伦理理论、文本解释和学者观点比较。",
    commonMistake: "把宗教传统内部观点当成完全一致，或只陈述信念而没有分析论证与反驳。",
  },
  "information-technology": {
    concept: "IT 术语要落到用户需求、信息生命周期、数据库/网络系统、自动化、风险和实施评价，避免与纯计算机科学混为一谈。",
    steps: ["确定用户、数据、流程和系统边界", "选择合适的硬件、软件、数据库或网络术语", "说明信息如何输入、处理、存储、传输和输出", "评价可用性、可靠性、安全、成本和法律伦理影响"],
    examFocus: "常见考法是系统分析、数据库、电子表格、自动化、网络、安全、项目实施与数字社会。",
    commonMistake: "只列硬件软件名称，没有解释信息流、用户需求、风险控制或实施限制。",
  },
  "travel-tourism": {
    concept: "旅游术语需要联系目的地、游客、企业、社区、环境、市场数据和可持续性，答案必须说明利益和代价由谁承担。",
    steps: ["明确目的地、旅游类型和利益相关者", "使用需求、供给、影响或管理术语", "引用案例、统计或空间证据", "评价经济、社会文化和环境权衡及长期可持续性"],
    examFocus: "常见考法是旅游需求、目的地管理、营销、游客影响、可持续旅游和行业运营。",
    commonMistake: "只说旅游带来收入或污染，没有区分群体、尺度、时间和管理措施。",
  },
  "global-perspectives": {
    concept: "全球视野与研究术语必须服务于可检验的问题、可靠证据、多元视角和实际行动；不是泛泛表达关心全球议题。",
    steps: ["界定全球议题、尺度和利益相关者", "把宽泛主题收束为研究问题或主张", "评估来源证据、视角和局限", "比较方案并提出可衡量的行动或反思"],
    examFocus: "常见考法是研究问题、来源分析、论证、全球化议题、多元视角和个人/社区行动评估。",
    commonMistake: "只罗列事实或个人观点，不评估来源、利益冲突、因果链或行动可行性。",
  },
  "marine-science": {
    concept: "海洋科学术语要连接海水物理化学、生态系统、海洋过程、采样数据和人类管理；注意尺度与季节变化。",
    steps: ["确定海域、深度、时间和测量变量", "解释物理/化学条件如何影响生物过程", "使用样线、样方或水质数据支持结论", "评价渔业、污染和保护措施的证据与限制"],
    examFocus: "常见考法是海洋生态、盐度温度、潮汐洋流、生产力、污染、渔业和保护区。",
    commonMistake: "把海洋生态过程孤立描述，或没有说明采样位置、季节、深度和人为活动。",
  },
  "food-nutrition": {
    concept: "食品与营养术语应同时联系人体营养需求、食物科学、制备安全、感官质量和个人/群体饮食证据。",
    steps: ["确定营养对象、生命周期和健康目标", "区分营养素功能、来源和缺乏/过量风险", "解释制备过程的科学与食品安全控制", "用标签、配方或案例评价饮食方案"],
    examFocus: "常见考法是营养素、能量平衡、特殊膳食、食品卫生、烹饪科学、食品标签和菜单设计。",
    commonMistake: "把一种营养素说成单独决定健康，或只背步骤却没有解释温度、交叉污染和营养损失。",
  },
  "modern-languages": {
    concept: "现代外语术语要帮助学生理解语言结构、语域、翻译取舍和文化语境；不能只把语法名称当成机械规则。",
    steps: ["确定交际目的、受众、时态和语域", "识别性数配合、动词变化和句子结构", "检查代词、否定、连接词与词序", "比较直译与自然表达，并保留文化语境"],
    examFocus: "常见考法是阅读听力、翻译、写作、口试、语法准确性、语域和目标语国家文化议题。",
    commonMistake: "逐词翻译而忽略词序和语域，或把 cognate 当成必然同义词。",
  },
  enterprise: {
    concept: "企业创业术语需联系机会、客户、成本、资金、风险、运营和社会/环境影响；答案必须有可验证的商业逻辑。",
    steps: ["识别客户问题、价值主张和市场空缺", "收集研究并验证需求与竞争情况", "建立成本、收入、现金流和风险假设", "评价增长、利益相关者和可持续性取舍"],
    examFocus: "常见考法是创业机会、商业计划、融资、市场研究、成本收益、营销、风险和增长评价。",
    commonMistake: "把有好点子等同于可行企业，或只给利润预测而不说明客户、成本、现金和风险。",
  },
  agriculture: {
    concept: "农业术语应连接土壤、作物/动物生物学、气候、投入、产量、市场和环境管理，区分短期增产与长期可持续。",
    steps: ["确定农业系统、气候、土壤和生产目标", "解释投入如何影响生长、产量和风险", "使用产量、土壤或市场证据分析取舍", "评价粮食安全、生态影响、成本和农户生计"],
    examFocus: "常见考法是作物生产、畜牧、土壤管理、病虫害、农业技术、粮食安全和可持续农业。",
    commonMistake: "只说化肥或灌溉提高产量，未说明土壤、水资源、生物多样性、成本与长期副作用。",
  },
  "child-development": {
    concept: "儿童发展术语要放在年龄阶段、个体差异、家庭/环境、观察证据和保护责任中使用，不把发展当作固定时间表。",
    steps: ["确定年龄、情境和发展领域", "区分身体、认知、社会、情感或语言发展", "使用观察证据而非单一标签", "评价支持策略、包容性和保护要求"],
    examFocus: "常见考法是发展里程碑、游戏与学习、依恋、营养、睡眠、行为、特殊需要和儿童保护。",
    commonMistake: "把里程碑当成所有儿童必须在同一天达到，或忽略文化、家庭与个体差异。",
  },
  "english-second-language": {
    concept: "英语作为第二语言的术语要帮助学生完成真实沟通：理解文本目的、选取可靠信息、控制语域，并把答案写得清楚且适合受众。",
    steps: ["确定文本类型、受众和交际目的", "区分事实、观点、隐含意义和关键信息", "选择适合的语域、段落结构和连接方式", "检查是否完整回应任务、拼写与语法是否影响理解"],
    examFocus: "常见考法是阅读理解、摘要、听力、邮件/文章写作、语域、语法准确性和交际效果。",
    commonMistake: "只替换几个高级词却没有回应受众和任务，或把摘要写成逐句复制原文。",
  },
  "chinese-language": {
    concept: "中文语言术语要用于真实语篇的理解、表达、修辞、语体和文化语境；不能只把术语翻译成英文而缺少文本证据。",
    steps: ["确定文体、对象、目的和情境", "提取关键词、语气、结构与修辞证据", "解释表达选择如何影响读者或听者", "按任务选择准确、得体且连贯的中文表达"],
    examFocus: "常见考法是阅读理解、写作、语体转换、修辞效果、篇章结构和口语/书面语差异。",
    commonMistake: "只说“用了修辞所以生动”，或没有结合词句、受众和文体说明效果。",
  },
  "islamic-studies": {
    concept: "伊斯兰研究术语应准确连接古兰经、圣训、历史语境、信仰实践与不同解释传统；不能用单一概括代替证据。",
    steps: ["确定概念所属经文、圣训、历史或实践语境", "准确界定术语并引用相关证据", "解释其对信仰、伦理或社会生活的意义", "在需要时比较不同解释并避免过度概括"],
    examFocus: "常见考法是古兰经主题、圣训、伊斯兰历史、信仰原则、实践、伦理和资料解释。",
    commonMistake: "混淆经文与圣训的来源地位，或只背诵事实而不解释意义和历史语境。",
  },
  "biblical-studies": {
    concept: "圣经研究术语要把文本类型、历史语境、叙事结构、神学主题和解释方法连接起来，区分文本证据和后来的解释。",
    steps: ["确定经文体裁、段落位置和历史语境", "细读关键词、结构和叙事声音", "联系主题、人物或神学论点", "比较解释并明确证据与推论的边界"],
    examFocus: "常见考法是福音书、比喻、先知传统、早期教会、文本解释、历史背景和神学主题。",
    commonMistake: "把不同书卷的内容混在一起，或把一段经文的字面复述当成完整解释。",
  },
  "thinking-skills": {
    concept: "思维技能术语用于检查论证是否真的支持结论：识别前提、证据、假设、因果关系、替代解释与推理漏洞。",
    steps: ["区分结论、理由、证据和背景信息", "找出隐含假设与必要条件", "检验证据相关性、可信度和代表性", "提出反例、替代解释或更稳健的结论"],
    examFocus: "常见考法是批判性思维、论证分析、证据评价、数据推理、问题解决和决策。",
    commonMistake: "只说一个论点“有偏见”，却没有指出具体假设、证据缺口或它如何影响结论。",
  },
  "digital-media-design": {
    concept: "数字媒体与设计术语要连接受众、目的、视觉层级、交互、可访问性、技术流程和迭代测试，而不是只评价“好看”。",
    steps: ["明确用户、平台、目标与限制", "把需求转成信息架构、视觉层级或交互流程", "选择媒介、格式、版权与可访问性方案", "用用户测试和成功标准评价并迭代作品"],
    examFocus: "常见考法是设计 brief、研究、原型、视觉传播、交互设计、受众反馈、制作流程和评价。",
    commonMistake: "把个人审美当成评价证据，或忽略受众、无障碍、版权和技术限制。",
  },
  "world-literature": {
    concept: "世界文学术语要把精读、翻译、文化语境、权力、身份和不同阅读立场联系起来，避免把文化标签当成唯一解释。",
    steps: ["定位文本、叙述视角、形式与文化语境", "引用语言、结构、意象或人物证据", "分析身份、权力、迁移或历史记忆等主题", "比较翻译/批评视角并形成有边界的判断"],
    examFocus: "常见考法是跨文化文本比较、叙事声音、身份、权力、翻译选择、历史语境和批评阅读。",
    commonMistake: "只罗列文化背景或主题词，没有细读文本细节，也把一种文化描写成单一固定形象。",
  },
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

const biologyGroups = [
  {
    subject: "biology", topic: "cell-biology", label: "Biology: Cell Biology",
    note: "用于细胞结构、膜运输、细胞周期、显微技术和细胞分化题。",
    example: "Explain how the structure of {word} allows it to carry out its function.",
    translation: "解释{meaning}的结构如何支持其功能。",
    terms: parseTerms(`
cell theory|细胞学说|the theory that cells are the basic units of living organisms|cell theory;cell biology||All living organisms are made of one or more cells.
prokaryotic cell|原核细胞|a cell without a membrane-bound nucleus or membrane-bound organelles|prokaryotic organism;bacterial cell||Prokaryotes contain a circular DNA molecule and 70S ribosomes.
eukaryotic cell|真核细胞|a cell containing a membrane-bound nucleus and membrane-bound organelles|eukaryotic organism;eukaryotic cell||Eukaryotic cells compartmentalise reactions in organelles.
nucleus|细胞核|an organelle containing chromosomes and controlling gene expression|nuclear envelope;nucleolus||The nucleus contains DNA associated with histone proteins.
mitochondrion|线粒体|an organelle where aerobic respiration produces ATP|mitochondrial matrix;cristae||Cristae provide a large surface area for aerobic respiration.
chloroplast|叶绿体|an organelle where photosynthesis converts light energy into chemical energy|chloroplast envelope;thylakoid||Thylakoid membranes contain chlorophyll and electron carriers.
ribosome|核糖体|a site where amino acids are assembled into a polypeptide|80S ribosome;70S ribosome||Ribosomes translate mRNA codons into an amino-acid sequence.
rough endoplasmic reticulum|粗面内质网|a membrane network covered with ribosomes that synthesises and transports proteins|rough ER;protein synthesis||Rough ER is continuous with the nuclear envelope.
Golgi apparatus|高尔基体|an organelle that modifies sorts and packages proteins into vesicles|Golgi vesicle;protein secretion||The Golgi apparatus modifies proteins before secretion.
lysosome|溶酶体|a vesicle containing hydrolytic enzymes for intracellular digestion|lysosomal enzyme;phagolysosome||Lysosomes digest pathogens and worn-out organelles.
cell surface membrane|细胞表面膜|a selectively permeable phospholipid bilayer controlling exchange with the surroundings|plasma membrane;cell membrane||Membrane proteins enable transport and cell signalling.
phospholipid bilayer|磷脂双分子层|two layers of phospholipids forming the basic structure of a cell membrane|hydrophilic head;hydrophobic tail||The hydrophobic core restricts passage of charged particles.
fluid mosaic model|流动镶嵌模型|a model describing a flexible bilayer with proteins moving within it|membrane protein;fluid mosaic||The membrane is fluid because phospholipids and some proteins can move laterally.
diffusion|扩散|net movement of particles from higher to lower concentration due to random motion|concentration gradient;simple diffusion||Diffusion is passive and does not require ATP.
facilitated diffusion|协助扩散|passive movement down a concentration gradient through channel or carrier proteins|channel protein;carrier protein||Facilitated diffusion is limited by the number of membrane proteins.
osmosis|渗透|net movement of water through a partially permeable membrane from higher to lower water potential|water potential;partially permeable membrane||Water enters a plant cell when the cell solution has lower water potential.
active transport|主动运输|movement of a substance against its concentration gradient using ATP and a membrane protein|carrier protein;ATP-driven transport||Active transport can maintain a concentration gradient.
cell cycle|细胞周期|the sequence of growth DNA replication and division in a cell|cell-cycle checkpoint;cell division||The cell cycle includes interphase and mitosis followed by cytokinesis.
mitosis|有丝分裂|nuclear division producing two genetically identical daughter nuclei|mitotic division;daughter cell||Mitosis preserves chromosome number for growth and repair.
meiosis|减数分裂|two divisions producing four genetically different haploid cells|meiotic division;haploid gamete||Meiosis halves chromosome number and creates genetic variation.
stem cell|干细胞|an undifferentiated cell capable of self-renewal and differentiation|embryonic stem cell;adult stem cell||Stem cells can replace specialised cells under suitable conditions.
cell differentiation|细胞分化|the process by which a cell develops specialised structures and functions|specialised cell;gene expression||Differentiation results from selective gene expression rather than loss of genes.
    `),
  },
  {
    subject: "biology", topic: "biological-molecules-and-enzymes", label: "Biology: Molecules & Enzymes",
    note: "用于碳水化合物、脂质、蛋白质、核酸和酶实验题。",
    example: "Use the properties of {word} to explain the result of the biological test or reaction.",
    translation: "利用{meaning}的性质解释生物测试或反应结果。",
    terms: parseTerms(`
monomer|单体|a small molecule that can join with others to form a polymer|monomer unit;polymer||Monomers are linked by condensation reactions.
polymer|聚合物|a large molecule made from many repeating monomer units|polymer chain;biopolymer||Polymers can be hydrolysed into their monomers.
carbohydrate|碳水化合物|an organic molecule containing carbon hydrogen and oxygen used for energy or structure|simple carbohydrate;complex carbohydrate||Carbohydrates include sugars starch and cellulose.
monosaccharide|单糖|a single sugar molecule that cannot be hydrolysed into a smaller carbohydrate|glucose;monosaccharide||Glucose is a soluble respiratory substrate.
disaccharide|二糖|a sugar formed when two monosaccharides join by condensation|maltose;sucrose||A glycosidic bond forms when water is removed.
polysaccharide|多糖|a carbohydrate polymer made from many monosaccharides|starch;glycogen;cellulose||Starch is compact and insoluble, making it suitable for storage.
glycosidic bond|糖苷键|a covalent bond linking monosaccharides in a carbohydrate|condensation reaction;hydrolysis||Hydrolysis breaks a glycosidic bond by adding water.
starch|淀粉|a plant storage polysaccharide made from alpha-glucose|amylose;amylopectin||Starch is detected by iodine solution turning blue-black.
glycogen|糖原|a highly branched storage polysaccharide made from alpha-glucose in animals|glycogen granule;animal storage||Branching allows rapid hydrolysis of glycogen.
cellulose|纤维素|an unbranched polymer of beta-glucose forming plant cell walls|cellulose microfibril;plant cell wall||Hydrogen bonds between chains give cellulose high tensile strength.
lipid|脂质|a hydrophobic biological molecule including triglycerides and phospholipids|lipid bilayer;triglyceride||Lipids are insoluble in water and useful for energy storage.
triglyceride|甘油三酯|a molecule formed from glycerol and three fatty acids|ester bond;fatty acid||Ester bonds form during condensation between glycerol and fatty acids.
phospholipid|磷脂|a lipid with a hydrophilic phosphate head and hydrophobic fatty-acid tails|phospholipid bilayer;amphipathic||Phospholipids self-assemble into bilayers in water.
protein|蛋白质|a biological polymer of amino acids folded into a functional three-dimensional structure|globular protein;fibrous protein||Protein function depends on its specific three-dimensional shape.
amino acid|氨基酸|an organic molecule containing an amino group and a carboxyl group|amino-acid sequence;R group||Different R groups give amino acids different chemical properties.
peptide bond|肽键|a covalent bond joining adjacent amino acids in a polypeptide|condensation reaction;polypeptide||A peptide bond forms between the amino and carboxyl groups.
primary structure|一级结构|the sequence of amino acids in a polypeptide|primary protein structure;amino-acid sequence||The primary sequence determines later folding interactions.
tertiary structure|三级结构|the overall three-dimensional shape of one polypeptide chain|tertiary protein structure;disulfide bond||Tertiary structure is maintained by ionic hydrogen and disulfide bonds.
enzyme|酶|a biological catalyst that lowers activation energy without being used up|active site;enzyme-substrate complex||Enzymes increase reaction rate but do not change the equilibrium position.
active site|活性位点|the region of an enzyme with a complementary shape and chemistry to its substrate|active-site specificity;substrate||Substrate binding creates an enzyme-substrate complex.
denaturation|变性|a permanent change in protein shape caused by disruption of bonds|denatured enzyme;high temperature||Extreme temperature or pH can alter the active site.
competitive inhibitor|竞争性抑制剂|a molecule that competes with substrate for the active site|competitive inhibition;inhibitor||Increasing substrate concentration can reduce competitive inhibition.
non-competitive inhibitor|非竞争性抑制剂|an inhibitor binding away from the active site and changing enzyme shape|non-competitive inhibition;allosteric site||More substrate does not fully overcome non-competitive inhibition.
activation energy|活化能|the minimum energy required for a reaction to begin|activation-energy barrier;catalyst||Enzymes lower activation energy by providing an alternative pathway.
    `),
  },
  {
    subject: "biology", topic: "exchange-and-transport", label: "Biology: Exchange & Transport",
    note: "用于气体交换、植物运输、心血管系统和交换表面积题。",
    example: "Explain how {word} affects the rate of exchange or transport in the organism.",
    translation: "解释{meaning}如何影响生物体内的交换或运输速率。",
    terms: parseTerms(`
exchange surface|交换表面|a specialised surface across which substances move between an organism and its environment|exchange surface;gas-exchange surface||An efficient exchange surface is large thin and supplied with transport medium.
surface area to volume ratio|表面积体积比|the surface area available for exchange relative to an object's volume|SA:V ratio;surface-area-to-volume||Small organisms have a larger surface-area-to-volume ratio.
concentration gradient|浓度梯度|a difference in concentration between two regions|steep concentration gradient;diffusion gradient||A steeper gradient usually increases diffusion rate.
water potential|水势|the tendency of water to move from a region through osmosis|water-potential gradient;solute potential||Water moves from higher to lower water potential.
solute potential|溶质势|the component of water potential caused by dissolved solutes|solute concentration;water potential||Adding solute lowers the water potential of a solution.
root hair cell|根毛细胞|a specialised plant cell with a long projection for absorbing water and mineral ions|root hair;mineral-ion uptake||The projection increases surface area for absorption.
xylem vessel|木质部导管|a dead hollow vessel transporting water and mineral ions upwards in a plant|xylem tissue;transpiration stream||Lignin strengthens xylem and prevents collapse.
phloem sieve tube|韧皮部筛管|a living tube transporting assimilates through a plant|sieve tube element;phloem transport||Sieve plates allow mass flow between sieve-tube elements.
companion cell|伴胞|a phloem cell supplying ATP and controlling translocation|companion cell;phloem loading||Companion cells actively load sucrose into sieve tubes.
transpiration|蒸腾作用|loss of water vapour from a plant mainly through stomata|transpiration stream;transpiration rate||Transpiration creates a tension that pulls water up the xylem.
transpiration pull|蒸腾拉力|the tension generated by evaporation that draws water through xylem|cohesion-tension;water column||Cohesion between water molecules transmits the pull down the vessel.
stoma|气孔|a pore in the epidermis controlled by guard cells for gas exchange|stomatal pore;stoma opening||Stomata open for carbon dioxide uptake but increase water loss.
guard cell|保卫细胞|a specialised epidermal cell controlling the opening of a stoma|guard-cell turgor;stomatal control||Ion uptake changes guard-cell water potential and turgor.
alveolus|肺泡|a microscopic air sac where oxygen and carbon dioxide are exchanged|alveolar wall;alveolar gas exchange||Many alveoli provide a large surface area and short diffusion path.
ventilation|通气|movement of air into and out of an exchange surface|pulmonary ventilation;ventilation rate||Ventilation maintains a steep oxygen concentration gradient.
haemoglobin|血红蛋白|a globular protein in red blood cells that reversibly binds oxygen|oxyhaemoglobin;oxygen dissociation||Haemoglobin loads oxygen where oxygen partial pressure is high.
oxygen dissociation curve|氧解离曲线|a graph showing haemoglobin saturation against oxygen partial pressure|oxygen saturation;Bohr effect||The sigmoid shape reflects cooperative binding of oxygen.
Bohr effect|波尔效应|the decrease in haemoglobin oxygen affinity caused by increased carbon dioxide or acidity|carbon dioxide transport;haemoglobin affinity||The Bohr effect helps unload oxygen in active tissues.
cardiac output|心输出量|the volume of blood pumped by one ventricle per minute|cardiac output;stroke volume|cardiac output = heart rate × stroke volume|Exercise raises cardiac output to meet muscle oxygen demand.
mass flow|质量流|bulk movement of substances caused by a pressure gradient|mass flow hypothesis;phloem translocation||Mass flow transports solutes faster than random diffusion over long distances.
    `),
  },
  {
    subject: "biology", topic: "genetics-and-evolution", label: "Biology: Genetics & Evolution",
    note: "用于 DNA、基因表达、遗传图、突变、选择和进化证据题。",
    example: "Use the evidence to explain how {word} contributes to inheritance or evolutionary change.",
    translation: "利用证据解释{meaning}如何参与遗传或进化变化。",
    terms: parseTerms(`
chromosome|染色体|a DNA molecule associated with proteins and carrying genes|homologous chromosome;chromosome number||A chromosome carries a linear sequence of genes.
DNA|脱氧核糖核酸|a double-stranded nucleic acid that stores genetic information in base sequences|DNA molecule;DNA sequence||Complementary base pairing allows DNA to store and copy genetic information.
DNA replication|DNA复制|the semi-conservative copying of DNA before cell division|semi-conservative replication;DNA polymerase||Each new DNA molecule contains one original strand and one newly synthesised strand.
transcription|转录|the synthesis of an RNA molecule using a DNA template|messenger RNA;RNA polymerase||Transcription produces a complementary RNA base sequence from one DNA strand.
translation|翻译|the synthesis of a polypeptide at a ribosome using an mRNA base sequence|genetic code;polypeptide synthesis||Translation uses tRNA anticodons to match amino acids to mRNA codons.
gene|基因|a sequence of DNA coding for a functional polypeptide or RNA|gene locus;gene expression||Different alleles of a gene may produce different phenotypes.
allele|等位基因|an alternative version of a gene at a particular locus|dominant allele;recessive allele||Alleles arise from changes in the DNA base sequence.
locus|基因座|the position of a gene on a chromosome|gene locus;chromosomal locus||A gene's locus is fixed on a particular chromosome.
genome|基因组|the complete set of genetic material in an organism or cell|human genome;genome sequencing||The genome includes coding and non-coding DNA.
genotype|基因型|the combination of alleles possessed by an organism|homozygous genotype;heterozygous genotype||Genotype describes alleles rather than the visible trait.
phenotype|表型|the observable features of an organism produced by genotype and environment|phenotypic variation;phenotype||Phenotype is influenced by both genes and environmental conditions.
homozygous|纯合|having two identical alleles at a gene locus|homozygous dominant;homozygous recessive||A homozygous individual produces one allele type in its gametes for that locus.
heterozygous|杂合|having two different alleles at a gene locus|heterozygous genotype;carrier||A heterozygous recessive carrier may show the dominant phenotype.
dominant allele|显性等位基因|an allele expressed in the phenotype when one or two copies are present|dominant phenotype;dominant inheritance||Dominance describes expression, not superiority or frequency.
recessive allele|隐性等位基因|an allele expressed only when no dominant allele is present|recessive phenotype;recessive inheritance||A recessive phenotype usually requires two recessive alleles.
codominance|共显性|inheritance in which both alleles are fully expressed in a heterozygote|codominant allele;AB blood group||Codominant alleles produce a phenotype showing both products.
multiple alleles|复等位基因|more than two alleles of a gene existing in a population|ABO blood group;multiple-allele system||An individual still inherits only two alleles at a diploid locus.
sex linkage|伴性遗传|inheritance of a gene located on a sex chromosome|X-linked inheritance;sex-linked||X-linked recessive traits are more common in males with one X chromosome.
genetic cross|遗传杂交|a planned mating used to predict or investigate inheritance|monohybrid cross;dihybrid cross||A genetic cross uses gametes and probability to predict offspring.
monohybrid inheritance|单因子遗传|inheritance involving one gene locus|monohybrid cross;single-gene inheritance||A monohybrid cross can reveal a 3:1 phenotype ratio under simple dominance.
test cross|测交|crossing an individual of unknown dominant genotype with a homozygous recessive individual|test-cross ratio;unknown genotype||A test cross distinguishes homozygous dominant from heterozygous offspring.
genetic diagram|遗传图|a diagram showing parental genotypes gametes and predicted offspring|genetic cross;Punnett square||A diagram must label alleles and show how gametes combine.
mutation|突变|a change in the DNA base sequence or chromosome structure|gene mutation;mutation rate||A mutation may be neutral harmful or beneficial depending on context.
base substitution|碱基替换|a mutation in which one DNA base is replaced by another|point mutation;base substitution||A substitution can be silent missense or nonsense.
deletion mutation|缺失突变|a mutation caused by loss of one or more DNA bases|DNA deletion;frameshift||Deleting a base can cause a frameshift and alter many codons.
natural selection|自然选择|the differential survival and reproduction of organisms with heritable variation|selection pressure;adaptive advantage||Natural selection changes allele frequency across generations.
adaptation|适应性特征|an inherited feature that increases survival or reproductive success in a particular environment|adaptive feature;adaptation||An adaptation is advantageous only under particular selection pressures.
speciation|物种形成|the evolution of new species when populations become reproductively isolated|reproductive isolation;speciation||Speciation requires divergence and prevents gene flow between populations.
    `),
  },
  {
    subject: "biology", topic: "energy-and-ecosystems", label: "Biology: Energy & Ecosystems",
    note: "用于光合作用、呼吸作用、种群、食物链、生产量和生态循环题。",
    example: "Analyse how {word} affects energy transfer, population size, or ecosystem stability.",
    translation: "分析{meaning}如何影响能量传递、种群数量或生态系统稳定性。",
    terms: parseTerms(`
photosynthesis|光合作用|the process by which plants use light energy to make organic molecules from carbon dioxide and water|light-dependent reaction;carbon fixation|6CO2 + 6H2O → C6H12O6 + 6O2|Photosynthesis transfers light energy into chemical energy in glucose.
chlorophyll|叶绿素|a pigment that absorbs light energy for photosynthesis|chlorophyll a;photosynthetic pigment||Chlorophyll absorbs mainly red and blue wavelengths.
light-dependent reaction|光依赖反应|the photosynthetic stage using light energy to make ATP and reduced NADP|photolysis;electron transport||Photolysis of water supplies electrons and releases oxygen.
light-independent reaction|光非依赖反应|the photosynthetic stage using ATP and reduced NADP to reduce carbon dioxide|Calvin cycle;carbon fixation||The light-independent reaction occurs in the chloroplast stroma.
carbon fixation|碳固定|the incorporation of inorganic carbon dioxide into an organic molecule|Calvin cycle;Rubisco||Rubisco catalyses the fixation of carbon dioxide to RuBP.
aerobic respiration|有氧呼吸|the controlled release of energy from glucose using oxygen|aerobic ATP production;oxidative phosphorylation|C6H12O6 + 6O2 → 6CO2 + 6H2O|Aerobic respiration produces ATP through glycolysis the link reaction and Krebs cycle.
anaerobic respiration|无氧呼吸|energy release from glucose without oxygen|anaerobic glycolysis;lactate fermentation||Anaerobic respiration produces less ATP and may form lactate in animals.
ATP|三磷酸腺苷|a phosphorylated nucleotide that transfers usable energy in cells|ATP hydrolysis;ATP synthase|ATP + H2O → ADP + Pi|ATP hydrolysis provides energy for active transport and biosynthesis.
energy transfer|能量传递|movement of energy between organisms or processes rather than cycling of energy|energy flow;energy transfer||Energy transfer between trophic levels is inefficient.
trophic level|营养级|the position of an organism in a food chain or food web|primary consumer;secondary consumer||Only a fraction of energy passes from one trophic level to the next.
food chain|食物链|a sequence showing the transfer of energy through feeding relationships|food web;feeding relationship||Arrows point in the direction of energy transfer.
food web|食物网|a network of interconnected food chains in an ecosystem|food-web stability;feeding relationship||Food webs show alternative prey and predator pathways.
biomass|生物量|the mass of living biological material in an organism or trophic level|biomass pyramid;dry biomass||Dry biomass avoids variation caused by water content.
gross primary productivity|总初级生产力|the rate at which producers convert light energy into chemical energy|GPP;primary productivity|GPP = NPP + R|Gross productivity includes energy used in producer respiration.
net primary productivity|净初级生产力|the chemical energy stored by producers after respiratory losses|NPP;plant productivity|NPP = GPP - R|NPP represents energy available to herbivores and growth.
population|种群|all organisms of one species living in an area at the same time|population size;population density||Population size changes through births deaths immigration and emigration.
carrying capacity|环境容纳量|the maximum population size an environment can sustainably support|carrying capacity;limiting factor||Carrying capacity depends on resources and environmental conditions.
intraspecific competition|种内竞争|competition between members of the same species for limited resources|intraspecific competition;resource||Intraspecific competition can reduce growth and reproductive success.
biodiversity|生物多样性|the variety of living organisms and ecosystems in an area|species diversity;genetic diversity||High biodiversity can improve ecosystem resilience.
carbon cycle|碳循环|the movement of carbon between atmosphere organisms oceans and rocks|carbon sink;carbon sequestration||Combustion transfers stored carbon to atmospheric carbon dioxide.
    `),
  },
  {
    subject: "biology", topic: "homeostasis-and-immunity", label: "Biology: Homeostasis & Immunity",
    note: "用于神经、激素、血糖、体温、水势、免疫和疫苗题。",
    example: "Explain how {word} contributes to regulation, coordination, or defence against disease.",
    translation: "解释{meaning}如何参与调节、协调或疾病防御。",
    terms: parseTerms(`
homeostasis|稳态|maintenance of a relatively constant internal environment despite external change|homeostatic control;internal environment||Homeostasis keeps variables within a narrow suitable range.
negative feedback|负反馈|a control mechanism in which a change triggers responses that reverse the change|negative-feedback loop;homeostasis||Negative feedback restores a variable towards its set point.
receptor|受体|a cell or structure that detects a stimulus or change in a variable|sensory receptor;receptor cell||Receptors convert a stimulus into an electrical or chemical signal.
coordinator|协调中心|a structure that processes information and coordinates a response|central coordinator;coordination centre||The coordinator compares information with the required set point.
effector|效应器|a muscle or gland that carries out a response to a stimulus|effector organ;response||Effectors change the internal condition or behaviour of the organism.
neurone|神经元|a specialised cell that transmits electrical impulses|sensory neurone;motor neurone||Neurones transmit impulses along axons and across synapses.
synapse|突触|a junction where a signal passes between neurones using neurotransmitter|synaptic cleft;synaptic transmission||One-way transmission at a synapse helps establish pathways.
reflex arc|反射弧|the neural pathway producing a rapid automatic response|reflex action;reflex arc||A reflex arc can bypass conscious processing for speed.
endocrine system|内分泌系统|a system of glands releasing hormones into the blood|endocrine gland;hormone||Hormones travel in blood and often act more slowly than nerve impulses.
hormone|激素|a chemical messenger secreted by an endocrine gland and carried in blood|peptide hormone;steroid hormone||A hormone affects only target cells with complementary receptors.
insulin|胰岛素|a hormone that lowers blood glucose concentration by promoting uptake and storage|insulin receptor;glycogenesis||Insulin promotes conversion of glucose to glycogen in liver and muscle.
glucagon|胰高血糖素|a hormone that raises blood glucose concentration by stimulating glycogen breakdown|glucagon;glycogenolysis||Glucagon acts when blood glucose concentration falls.
thermoregulation|体温调节|control of body temperature within a suitable range|thermoregulation;vasodilation||Negative feedback coordinates heat production and heat loss.
antigen|抗原|a molecule recognised as foreign by receptors on immune cells or antibodies|pathogen antigen;antigen recognition||Specific antigens stimulate a specific immune response.
antibody|抗体|a soluble immunoglobulin produced by plasma cells that binds a specific antigen|antibody-antigen complex;immunoglobulin||The variable region of an antibody is complementary to its antigen.
phagocytosis|吞噬作用|the engulfing and digestion of pathogens or cell debris by a phagocyte|phagocyte;lysosome||Phagocytes form a vesicle around a pathogen before lysosomal digestion.
clonal selection|克隆选择|activation and rapid division of lymphocytes with receptors complementary to an antigen|clonal expansion;lymphocyte||Only lymphocytes with the matching receptor are selected.
memory cell|记忆细胞|a long-lived lymphocyte that remains after an immune response|memory lymphocyte;secondary response||Memory cells produce a faster stronger secondary response.
vaccination|疫苗接种|exposure to harmless antigen material to generate immune memory|vaccine;immunisation||Vaccination protects a population when enough people become immune.
antibiotic resistance|抗生素耐药性|the ability of bacteria to survive an antibiotic that previously killed them|drug resistance;resistant strain||Overuse of antibiotics selects resistant bacterial variants.
    `),
  },
];

groups.push(...biologyGroups);

const igAlevelExpansionGroups = [
  {
    subject: "physics", topic: "igcse-physics-core", label: "IGCSE Physics Core",
    stage: "IGCSE",
    note: "用于 IGCSE 物理基础概念、读图、单位和常见解释题。",
    example: "Define {word} and use it to explain the observation in the question.",
    translation: "定义{meaning}，并用它解释题目中的观察现象。",
    terms: parseTerms(`
vector diagram|矢量图|a diagram using arrows to show magnitude and direction|force arrow;scale drawing||Arrow length represents magnitude and arrow direction represents direction.
resultant|合成量|a single vector with the same effect as two or more vectors together|resultant force;resultant velocity||A zero resultant means no change in motion for an object already moving uniformly.
balanced forces|平衡力|forces whose vector sum is zero|balanced forces;no resultant force||Balanced forces do not mean no forces act; they mean the resultant is zero.
unbalanced forces|非平衡力|forces with a non-zero resultant that cause acceleration|unbalanced force;change in motion||Acceleration is in the direction of the resultant force.
contact force|接触力|a force that acts only when objects touch|normal contact force;friction||Friction and normal reaction are contact forces.
non-contact force|非接触力|a force acting without physical contact|gravitational force;magnetic force||Gravity, magnetic force and electrostatic force can act at a distance.
momentum conservation|动量守恒|total momentum remains constant when no external resultant force acts|isolated collision;momentum before and after||Use system momentum before equals system momentum after.
energy store|能量储存|a way in which energy is held in a system|kinetic energy store;thermal energy store||Energy is transferred between stores, not created or destroyed.
energy transfer pathway|能量转移路径|a route by which energy moves between stores|heating;mechanical work;electrical work||Name the pathway rather than saying energy disappears.
wasted energy|浪费能量|energy transferred to less useful stores or surroundings|thermal energy loss;dissipated energy||Wasted energy is still conserved but becomes less useful.
conduction|传导|thermal energy transfer through a material without bulk movement|thermal conduction;conductor||Metals conduct well because free electrons transfer energy.
convection|对流|thermal energy transfer by movement of a fluid|convection current;hot fluid rises||Convection requires a liquid or gas.
radiation|辐射|energy transfer by electromagnetic waves|infrared radiation;thermal radiation||Radiation can travel through a vacuum.
specific heat capacity|比热容|energy required to raise one kilogram of a substance by one degree Celsius or kelvin|specific heat capacity c|E = mc deltaT|A large value means more energy is needed for the same temperature rise.
latent heat|潜热|energy transferred during a change of state without temperature change|specific latent heat;melting point|E = mL|Temperature stays constant because energy changes particle arrangement.
conductor|导体|a material that allows charge or thermal energy to pass through easily|electrical conductor;thermal conductor||Metals are good conductors because they contain mobile electrons.
insulator|绝缘体|a material that does not allow charge or thermal energy to pass through easily|electrical insulator;thermal insulator||Insulators reduce energy transfer or prevent charge flow.
circuit symbol|电路符号|a standard drawing used to represent an electrical component|circuit diagram;standard symbol||Use standard symbols so circuit connections are unambiguous.
ammeter|电流表|an instrument used to measure current|ammeter in series;current reading||Ammeters are connected in series with the component.
voltmeter|电压表|an instrument used to measure potential difference|voltmeter in parallel;voltage reading||Voltmeters are connected in parallel across the component.
fuse|保险丝|a safety device that melts when current is too large|fuse rating;mains safety||The fuse protects wiring by breaking the circuit.
earth wire|地线|a safety wire that provides a low-resistance path to ground|earthing;metal case||Earthing helps prevent electric shock if a live wire touches the case.
magnetic pole|磁极|a region of a magnet where magnetic force is strongest|north pole;south pole||Like poles repel and unlike poles attract.
electromagnet|电磁铁|a magnet produced by current in a coil|solenoid electromagnet;iron core||Increasing current or coil turns strengthens the electromagnet.
generator effect|发电机效应|inducing a potential difference when a conductor cuts magnetic field lines|induced voltage;changing flux||Relative motion between conductor and field is needed.
transformer action|变压器作用|changing alternating voltage using electromagnetic induction between coils|primary coil;secondary coil||Transformers require alternating current.
ray diagram|光线图|a diagram using straight lines to show light paths|incident ray;reflected ray||Draw rays with arrows and label normal lines.
normal line|法线|a line perpendicular to a surface at the point of incidence|angle to the normal;boundary||Angles of incidence and refraction are measured from the normal.
real image|实像|an image formed where light rays actually meet|real image on screen;converging lens||A real image can be projected onto a screen.
virtual image|虚像|an image formed where light rays appear to come from|virtual image in mirror;diverging lens||A virtual image cannot be projected onto a screen.
ultrasound|超声波|sound with frequency above the upper limit of human hearing|ultrasound scan;echo sounding||Ultrasound can image tissues by timing echoes.
radioactivity|放射性|spontaneous emission of ionising radiation from unstable nuclei|radioactive decay;random decay||Decay is random and cannot be predicted for one nucleus.
absorbed dose|吸收剂量|energy absorbed from radiation per unit mass|radiation dose;gray||Dose depends on energy absorbed and tissue mass.
background count|本底计数|radiation count detected before adding a source|background count rate;subtract background||Subtract background to estimate source activity.
count rate|计数率|number of radiation counts detected per unit time|counts per second;GM tube||Count rate decreases with distance, shielding or decay.
    `),
  },
  {
    subject: "mathematics", topic: "igcse-mathematics-core", label: "IGCSE Mathematics Core",
    stage: "IGCSE",
    note: "用于 IGCSE 数学基础代数、几何、统计和题干理解。",
    example: "Use {word} to solve the problem and check the conditions.",
    translation: "使用{meaning}解题，并检查题目条件。",
    terms: parseTerms(`
integer|整数|a whole number that can be positive negative or zero|integer value;positive integer||Integers do not include fractions or decimals.
prime number|质数|a whole number greater than one with exactly two factors|prime factor;prime number||One is not a prime number.
factor|因数|a number or expression that divides another exactly|common factor;factorise||Factors multiply to make the original number or expression.
multiple|倍数|a number obtained by multiplying by an integer|least common multiple;multiple of 6||Multiples continue without ending.
highest common factor|最大公因数|the greatest factor shared by two or more numbers|HCF;common factor||Use prime factorisation to find it systematically.
least common multiple|最小公倍数|the smallest positive multiple shared by two or more numbers|LCM;common multiple||LCM is useful for common denominators.
standard form|科学记数法|a number written as a value from 1 to 10 times a power of ten|standard form notation;scientific notation||Move the decimal point and adjust the power of ten.
surd|根式|an irrational root left in exact form|simplify surds;rationalise denominator||Keep surds exact until final answer if exact form is required.
ratio|比|a comparison of quantities by division|ratio form;share in a ratio||Keep quantities in the same units before comparing.
proportion|比例关系|a relationship in which ratios remain equal|direct proportion;inverse proportion||Use equations such as y = kx or y = k/x.
percentage change|百分比变化|change expressed as a percentage of the original value|percentage increase;percentage decrease|percentage change = change / original x 100|The original value is the denominator.
compound interest|复利|interest calculated on the original amount and accumulated interest|compound interest;growth factor|A = P(1+r)^n|Use a multiplier for each period.
reverse percentage|反向百分比|finding an original value before a percentage change|reverse percentage;original amount||Divide by the final multiplier, not by the percentage change.
linear sequence|线性数列|a sequence with a constant difference between consecutive terms|arithmetic sequence;nth term||The coefficient of n is the common difference.
geometric sequence|等比数列|a sequence with a constant ratio between consecutive terms|geometric progression;common ratio||Multiply by the same ratio each step.
nth term|第 n 项|a formula giving a sequence term from its position|nth-term formula;term number||Substitute n carefully; n usually starts at 1.
factorisation|因式分解|rewriting an expression as a product of factors|factorise completely;common factor||Factorisation can reveal roots or simplify fractions.
expansion|展开|multiplying out brackets in an algebraic expression|expand brackets;binomial expansion||Each term inside brackets must be multiplied.
simultaneous linear equations|二元一次联立方程|two or more linear equations solved for shared variables|elimination method;substitution method||Solutions must satisfy every equation.
gradient of a line|直线斜率|vertical change divided by horizontal change for a line|rise over run;gradient m|m = change in y / change in x|A negative gradient slopes downward left to right.
parallel lines|平行线|lines in the same plane that never meet|parallel gradients;same slope||Parallel non-vertical lines have equal gradients.
perpendicular lines|垂直线|lines meeting at a right angle|negative reciprocal gradients;perpendicular bisector||Gradients multiply to -1 for non-vertical perpendicular lines.
angle bisector|角平分线|a line that divides an angle into two equal angles|bisect an angle;construction||Construction marks should show equal arcs.
similar shapes|相似图形|shapes with equal angles and proportional corresponding sides|scale factor;similar triangles||Areas scale by the square of the length scale factor.
congruent shapes|全等图形|shapes identical in size and shape|congruent triangles;SSS congruence||Congruent figures may be rotated or reflected.
Pythagoras' theorem|勾股定理|a relationship between the sides of a right-angled triangle|hypotenuse;right triangle|a^2 + b^2 = c^2|Only use it for right-angled triangles.
trigonometric ratio|三角比|a ratio of sides in a right-angled triangle|sine cosine tangent;SOHCAHTOA||Choose the ratio containing the known side and required side.
circle theorem|圆定理|a rule describing angles and lengths in circles|angle in a semicircle;cyclic quadrilateral||State the theorem when marks require reasoning.
arc|弧|part of a circle circumference|minor arc;major arc||Arc length depends on radius and angle.
sector|扇形|a region enclosed by two radii and an arc|sector angle;sector area||Sector area is the same fraction of circle area as its angle fraction.
histogram|直方图|a graph where bar area represents frequency for grouped data|frequency density;class width|frequency density = frequency / class width|Bars can have different widths.
stem-and-leaf diagram|茎叶图|a display that splits numbers into stems and leaves|ordered stem-and-leaf;key||Always include a key.
scatter diagram|散点图|a graph of paired data used to show correlation|line of best fit;scatter plot||Correlation does not prove causation.
probability tree|概率树|a diagram showing sequential outcomes and probabilities|branch probability;conditional branch||Multiply along branches and add alternatives.
upper bound|上界|the largest possible value after rounding|bounds calculation;upper limit||Bounds depend on the rounding unit.
lower bound|下界|the smallest possible value after rounding|bounds calculation;lower limit||Use bounds to find maximum or minimum possible results.
    `),
  },
  {
    subject: "chemistry", topic: "igcse-chemistry-core", label: "IGCSE Chemistry Core",
    stage: "IGCSE",
    note: "用于 IGCSE 化学粒子、周期表、反应、实验和环境基础题。",
    example: "Use {word} to explain the reaction, observation or calculation.",
    translation: "用{meaning}解释反应、现象或计算。",
    terms: parseTerms(`
element|元素|a substance made of atoms with the same proton number|chemical element;element symbol||Elements cannot be broken down by chemical methods.
compound|化合物|a substance made from two or more elements chemically bonded|ionic compound;covalent compound||Compounds have fixed compositions and new properties.
mixture|混合物|two or more substances physically combined and not chemically bonded|separate a mixture;mixture components||Mixtures can often be separated by physical methods.
molecule|分子|a group of atoms covalently bonded together|simple molecule;molecular formula||Molecules can contain atoms of the same or different elements.
particle model|粒子模型|a model explaining matter using particles and their arrangement or motion|particle arrangement;kinetic model||Use it to explain changes of state and diffusion.
melting point|熔点|the temperature at which a solid changes into a liquid|sharp melting point;melting point range||A pure substance usually has a sharp melting point.
boiling point|沸点|the temperature at which a liquid changes into a gas throughout the liquid|boiling point;volatile liquid||Stronger attractions often mean higher boiling point.
diffusion|扩散|movement of particles from higher to lower concentration|diffusion in gases;diffusion rate||Diffusion happens because particles move randomly.
chromatogram|色谱图|the pattern of separated substances produced by chromatography|paper chromatogram;spot pattern||Compare spots with known substances under the same conditions.
filtrate|滤液|the liquid that passes through filter paper during filtration|collect the filtrate;clear filtrate||The residue remains on the filter paper.
residue|残渣|the solid left on filter paper or after evaporation|filter residue;dry residue||Wash residue to remove soluble impurities when needed.
crystallisation|结晶|forming crystals from a solution|crystallisation point;pure crystals||Evaporate solvent until crystals can form on cooling.
distillation|蒸馏|separating liquids by boiling and condensation|simple distillation;fractional distillation||Different boiling points allow separation.
electrolysis|电解|decomposition of an ionic substance by electricity|electrolysis of molten salt;electrolyte||Ions move to electrodes and discharge.
electrolyte|电解质|a molten or dissolved ionic compound that conducts electricity|aqueous electrolyte;molten electrolyte||Mobile ions carry charge.
anode|阳极|the positive electrode in electrolysis where oxidation occurs|anode product;oxidation at anode||Anions move to the anode.
cathode|阴极|the negative electrode in electrolysis where reduction occurs|cathode product;reduction at cathode||Cations move to the cathode.
ore|矿石|a rock containing enough metal compound to make extraction worthwhile|iron ore;copper ore||Economic value depends on concentration and extraction cost.
reactivity series|金属活动性顺序|a list of metals ordered by their tendency to react or lose electrons|reactivity series;metal displacement||More reactive metals displace less reactive metals from compounds.
displacement reaction|置换反应|a reaction where a more reactive element replaces a less reactive one|metal displacement;halogen displacement||Use the reactivity series to predict whether it happens.
acid|酸|a substance that produces hydrogen ions in aqueous solution|strong acid;acid solution||Acids have pH below 7 and react with bases.
base|碱；碱性物质|a substance that reacts with acids and neutralises them|insoluble base;metal oxide||Bases neutralise acids to form salts and water.
alkali|可溶性碱|a base that dissolves in water and produces hydroxide ions|strong alkali;alkaline solution||Alkalis have pH above 7.
neutralisation|中和|a reaction between acid and base forming salt and water|neutralisation reaction;acid-base reaction||Ionic equation is H+ plus OH- forms water.
salt|盐|an ionic compound formed when acid hydrogen is replaced by a metal or ammonium ion|soluble salt;salt preparation||The salt name depends on the acid and metal.
indicator|指示剂|a dye showing whether a solution is acidic neutral or alkaline|universal indicator;litmus paper||Universal indicator gives a pH colour range.
oxidation state|氧化态|a number assigned to show electron ownership in a compound|oxidation number;redox||Changes in oxidation state identify redox reactions.
combustion|燃烧|reaction of a substance with oxygen releasing energy|complete combustion;incomplete combustion||Complete combustion of hydrocarbons makes carbon dioxide and water.
polymer|聚合物|a large molecule made from many repeating monomer units|addition polymer;polymer chain||Plastics are common synthetic polymers.
monomer|单体|a small molecule that can join to form a polymer|alkene monomer;repeat unit||Addition polymers often form from alkene monomers.
greenhouse gas|温室气体|a gas that absorbs infrared radiation and contributes to warming|carbon dioxide;methane||Greenhouse gases reduce energy loss from Earth to space.
fertiliser|肥料|a substance added to soil to provide mineral ions for plant growth|NPK fertiliser;nitrate fertiliser||Excess fertiliser can cause eutrophication.
corrosion|腐蚀|the gradual destruction of a metal by reaction with its environment|rusting of iron;corrosion prevention||Rusting needs oxygen and water.
    `),
  },
  {
    subject: "chemistry", topic: "inorganic-and-periodicity", label: "Chemistry: Inorganic & Periodicity",
    stage: "AS",
    note: "用于元素周期性、无机反应、沉淀和元素趋势题。",
    example: "Use {word} to explain the trend or observation.",
    translation: "用{meaning}解释趋势或实验现象。",
    terms: parseTerms(`
periodicity|周期性|repeating trends in element properties across periods|periodic trend;periodicity||Trends are explained by nuclear charge, shielding and electron configuration.
first ionisation energy|第一电离能|energy required to remove one mole of electrons from one mole of gaseous atoms|ionisation energy trend;IE1||It generally increases across a period because nuclear charge increases.
electron configuration|电子排布|the arrangement of electrons in atomic orbitals or shells|subshell configuration;electron arrangement||Configuration explains bonding and periodic trends.
shielding effect|屏蔽效应|repulsion by inner electrons that reduces attraction from the nucleus|electron shielding;screening||More shells increase shielding.
atomic radius|原子半径|a measure of atom size based on electron cloud or bonding distance|atomic radius trend;covalent radius||Radius decreases across a period because effective nuclear charge increases.
ionic radius|离子半径|the radius of an ion|cation radius;anion radius||Cations are smaller than parent atoms; anions are larger.
group 2 metal|第二族金属|an alkaline earth metal with two outer-shell electrons|magnesium;calcium||Reactivity increases down the group.
halogen|卤素|a group 17 non-metal that forms halide ions|chlorine;bromine;iodine||Oxidising power decreases down the group.
halide ion|卤离子|a negative ion formed from a halogen atom|chloride;bromide;iodide||Silver nitrate tests can identify halides.
disproportionation|歧化反应|a redox reaction where the same species is both oxidised and reduced|chlorine disproportionation;redox||Check oxidation numbers before and after.
precipitation reaction|沉淀反应|formation of an insoluble solid when aqueous ions combine|precipitation test;insoluble salt||Use solubility rules to predict the precipitate.
complex ion|配离子|a metal ion bonded to ligands by coordinate bonds|transition-metal complex;coordination number||Colour changes can indicate ligand substitution.
ligand|配体|a species donating an electron pair to a central metal ion|monodentate ligand;bidentate ligand||Ligands form coordinate bonds.
coordination number|配位数|the number of coordinate bonds to the central metal ion|octahedral complex;coordination number 6||It affects shape and isomerism.
transition element|过渡元素|a d-block element forming at least one ion with an incomplete d subshell|transition metal;complex ion||Transition elements often form coloured ions and variable oxidation states.
variable oxidation state|可变氧化态|ability of an element to form ions with different oxidation numbers|iron(II);iron(III)||Similar energies of d and s electrons allow variable states.
catalytic activity|催化活性|ability of a substance to increase reaction rate without being consumed|heterogeneous catalyst;transition-metal catalyst||Transition metals can adsorb reactants or change oxidation state.
amphoteric oxide|两性氧化物|an oxide reacting with both acids and bases|aluminium oxide;amphoteric behaviour||Amphoteric substances show both acidic and basic reactions.
lattice enthalpy|晶格焓|enthalpy change when one mole of ionic lattice forms from gaseous ions|lattice enthalpy;Born-Haber cycle||Greater ionic charge and smaller radius make lattice enthalpy more exothermic.
hydration enthalpy|水合焓|enthalpy change when one mole of gaseous ions becomes hydrated in water|hydration enthalpy;aqueous ion||Smaller highly charged ions have more exothermic hydration enthalpy.
solubility product|溶度积|equilibrium constant for a sparingly soluble ionic compound|Ksp expression;saturated solution|Ksp = product of ion concentrations|Precipitation occurs when ionic product exceeds Ksp.
    `),
  },
  {
    subject: "biology", topic: "igcse-biology-core", label: "IGCSE Biology Core",
    stage: "IGCSE",
    note: "用于 IGCSE 生物细胞、人体、植物、生态和遗传基础题。",
    example: "Use {word} to explain the biological structure or process.",
    translation: "用{meaning}解释生物结构或过程。",
    terms: parseTerms(`
organism|生物体|an individual living thing|living organism;single organism||Organisms show life processes such as respiration and reproduction.
tissue|组织|a group of similar cells working together|muscle tissue;plant tissue||Tissues form organs.
organ|器官|a structure made of different tissues working together|organ system;leaf organ||Organs perform specific functions.
organ system|器官系统|a group of organs working together for a major function|digestive system;circulatory system||Systems coordinate body functions.
species|物种|a group of organisms able to reproduce fertile offspring|same species;species classification||Species names use binomial nomenclature.
photosynthesis equation|光合作用方程|the word or symbol equation for photosynthesis|word equation;balanced equation|carbon dioxide + water -> glucose + oxygen|Light energy is transferred into chemical energy.
limiting factor|限制因素|a factor that stops a process from increasing further|limiting factor of photosynthesis;rate limiting||Light, carbon dioxide and temperature can limit photosynthesis.
transpiration stream|蒸腾流|movement of water from roots through xylem to leaves|water movement;transpiration pull||Water evaporating from leaves helps pull water upward.
mineral ion|矿物离子|an inorganic ion needed by plants for growth|nitrate ion;magnesium ion||Nitrate is needed for amino acids and magnesium for chlorophyll.
balanced diet|均衡饮食|a diet containing suitable amounts of all nutrients|healthy diet;malnutrition||Both deficiency and excess can cause health problems.
peristalsis|蠕动|waves of muscle contraction moving food through the gut|oesophagus;digestive tract||Circular and longitudinal muscles coordinate movement.
enzyme substrate complex|酶-底物复合物|temporary complex formed when substrate binds to enzyme active site|active site;substrate binding||Its formation lowers activation energy.
assimilation|同化作用|using absorbed nutrients to build body molecules|assimilation of amino acids;growth||Assimilation differs from absorption.
ventilation rate|通气率|volume or frequency of air movement into and out of lungs|breathing rate;tidal volume||Exercise increases ventilation to supply oxygen and remove carbon dioxide.
red blood cell|红细胞|a specialised blood cell that transports oxygen using haemoglobin|biconcave disc;haemoglobin||It has no nucleus to provide more space for haemoglobin.
plasma|血浆|the liquid part of blood carrying dissolved substances|blood plasma;transport medium||Plasma carries carbon dioxide, urea, hormones and heat.
platelet|血小板|a cell fragment involved in blood clotting|platelet plug;clotting||Platelets reduce blood loss and pathogen entry.
pathogen|病原体|a microorganism or virus that causes disease|pathogen transmission;infectious disease||Pathogens include bacteria, viruses, fungi and protoctists.
immune response|免疫反应|the body's defence reaction against pathogens or foreign antigens|specific immune response;antibody production||White blood cells recognise antigens.
vaccination programme|疫苗接种计划|planned vaccination to reduce disease spread in a population|herd immunity;immunisation programme||High coverage protects vulnerable people indirectly.
excretion|排泄|removal of toxic waste products of metabolism|excretion of urea;carbon dioxide excretion||Egestion is removal of undigested food, not metabolic waste.
urea|尿素|a nitrogenous waste made from excess amino acids in the liver|urea formation;urine||Urea is excreted by the kidneys.
nephron|肾单位|the functional unit of the kidney that filters blood and forms urine|kidney tubule;filtration||Nephrons carry out filtration, reabsorption and secretion.
coordination|协调|control of body responses using nerves or hormones|nervous coordination;hormonal coordination||Nerves act fast; hormones often act more slowly.
stimulus|刺激|a detectable change in the internal or external environment|stimulus response;receptor||Receptors detect stimuli.
response|反应|an action or change produced after a stimulus is detected|response to stimulus;effector response||Responses help maintain survival or homeostasis.
gamete|配子|a sex cell with half the normal chromosome number|male gamete;female gamete||Gametes fuse during fertilisation.
fertilisation|受精|fusion of male and female gamete nuclei|zygote formation;fertilisation||Fertilisation restores the diploid chromosome number.
selective breeding|选择育种|choosing parents with desired traits to produce offspring|artificial selection;breeding programme||It can reduce genetic variation.
genetic engineering|基因工程|changing an organism's DNA by inserting or modifying genes|recombinant DNA;gene transfer||It can produce insulin or pest-resistant crops.
habitat destruction|栖息地破坏|damage or loss of the natural place where organisms live|deforestation;habitat loss||It reduces biodiversity and population size.
pollination|授粉|transfer of pollen from anther to stigma|insect pollination;wind pollination||Pollination must occur before fertilisation in flowering plants.
seed dispersal|种子传播|movement of seeds away from the parent plant|wind dispersal;animal dispersal||Dispersal reduces competition with the parent plant.
decomposer|分解者|an organism that breaks down dead material and waste|bacteria;fungi;decomposition||Decomposers recycle mineral ions.
    `),
  },
  {
    subject: "biology", topic: "plant-and-human-physiology", label: "Biology: Plant & Human Physiology",
    stage: "AS",
    note: "用于植物运输、人体生理、气体交换、神经和调节题。",
    example: "Explain how {word} supports transport, exchange or regulation.",
    translation: "解释{meaning}如何支持运输、交换或调节。",
    terms: parseTerms(`
apoplast pathway|质外体途径|movement of water through cell walls and intercellular spaces|apoplast route;water movement||The Casparian strip blocks apoplast flow into the xylem.
symplast pathway|共质体途径|movement of water through cytoplasm connected by plasmodesmata|symplast route;plasmodesmata||Water crosses membranes before entering the symplast.
Casparian strip|凯氏带|a waterproof band in endodermal cell walls that controls water entry to xylem|endodermis;suberin||It forces water through membranes for selective uptake.
source|源|a plant region where assimilates are loaded into phloem|sucrose source;leaf source||Mature leaves are usually sources.
sink|库|a plant region where assimilates are unloaded or stored|root sink;growing tissue||Sinks use or store transported sugars.
translocation|转运|movement of assimilates such as sucrose through phloem|phloem translocation;mass flow||It can occur up or down the plant.
loading|装载|active movement of sucrose into phloem sieve tubes|phloem loading;companion cell||Loading lowers water potential in sieve tubes.
unloading|卸载|removal of sucrose from phloem at a sink|phloem unloading;sink tissue||Unloading maintains a pressure gradient.
spirometer|肺活量计|an instrument used to measure breathing volumes and rates|spirometer trace;ventilation measurement||Carbon dioxide absorber may be used in closed spirometry.
tidal volume|潮气量|volume of air moved in or out during a normal breath|tidal volume;breathing trace||It increases during exercise.
vital capacity|肺活量|maximum volume of air exhaled after maximum inhalation|vital capacity measurement;lung volume||It is larger than tidal volume.
residual volume|残气量|air remaining in the lungs after forced exhalation|residual air;lung capacity||It prevents lung collapse.
myogenic contraction|肌源性收缩|heart muscle contraction initiated within the muscle itself|sinoatrial node;cardiac rhythm||The heart can beat without direct nerve stimulation.
sinoatrial node|窦房结|the pacemaker region initiating the heartbeat|SAN;pacemaker||It sends electrical waves across the atria.
atrioventricular node|房室结|a heart node delaying and transmitting impulses to the ventricles|AVN;bundle of His||Delay allows atria to empty before ventricles contract.
cardiac cycle|心动周期|one complete heartbeat including atrial and ventricular systole and diastole|heart cycle;pressure changes||Valve opening depends on pressure differences.
ultrafiltration|超滤|high-pressure filtration of small molecules from blood in the kidney|glomerulus;Bowman's capsule||Proteins and cells remain in the blood.
selective reabsorption|选择性重吸收|return of useful substances from kidney filtrate to blood|proximal convoluted tubule;glucose reabsorption||Glucose is normally fully reabsorbed.
osmoregulation|渗透调节|control of blood water potential|ADH;water balance||ADH changes collecting duct permeability.
action potential|动作电位|a rapid change in membrane potential along a neurone|depolarisation;repolarisation||It depends on voltage-gated ion channels.
myelin sheath|髓鞘|an insulating layer around some neurone axons|myelinated neurone;saltatory conduction||Myelin increases impulse speed.
saltatory conduction|跳跃式传导|movement of an impulse from node to node along a myelinated axon|node of Ranvier;fast conduction||The impulse appears to jump between nodes.
neurotransmitter|神经递质|a chemical transmitting signals across a synapse|acetylcholine;synaptic vesicle||It diffuses across the synaptic cleft.
    `),
  },
  {
    subject: "economics", topic: "igcse-economics-core", label: "IGCSE Economics Core",
    stage: "IGCSE",
    note: "用于 IGCSE 经济基础概念、市场、货币、劳动力和政府目标题。",
    example: "Use {word} to explain the economic choice or market result.",
    translation: "用{meaning}解释经济选择或市场结果。",
    terms: parseTerms(`
economic problem|经济基本问题|the problem of unlimited wants and limited resources|basic economic problem;scarcity||It forces choices and opportunity cost.
factor of production|生产要素|a resource used to produce goods and services|land labour capital enterprise||Four main factors are land, labour, capital and enterprise.
land|土地资源|natural resources used in production|land factor;natural resources||It includes minerals, land and natural energy resources.
labour|劳动力|human effort used in production|labour force;worker skills||Education and training improve labour quality.
capital|资本|man-made resources used to produce goods and services|capital goods;machinery||Capital is not just money in economics.
enterprise|企业家才能|the ability to organise factors and take business risk|entrepreneur;enterprise factor||Enterprise coordinates production and innovation.
specialisation|专业化分工|concentrating on a limited range of tasks or products|division of labour;worker specialisation||It can raise productivity but increase dependency.
division of labour|劳动分工|breaking production into specialised tasks|assembly line;specialised workers||It can reduce training time and increase output.
barter|物物交换|exchange of goods and services without money|barter economy;double coincidence of wants||Barter is inefficient because wants must match.
money|货币|anything generally accepted as a medium of exchange|functions of money;store of value||Money acts as medium of exchange, unit of account, store of value and standard of deferred payment.
private sector|私营部门|part of the economy owned and run by individuals or firms|private enterprise;private sector business||It usually aims to make profit.
public sector|公共部门|part of the economy owned or controlled by government|public services;state-owned enterprise||It provides services and manages policy goals.
mixed economy|混合经济|an economy with both private and public sector activity|market and government;mixed system||Most real economies are mixed.
market economy|市场经济|an economy where resources are mainly allocated by price signals|free market;market mechanism||Prices guide consumers and producers.
planned economy|计划经济|an economy where government makes most resource allocation decisions|command economy;state planning||It may prioritise social goals but reduce choice.
demand curve|需求曲线|a graph showing quantity demanded at different prices|downward sloping demand;market demand||A price rise usually causes contraction in demand.
supply curve|供给曲线|a graph showing quantity supplied at different prices|upward sloping supply;market supply||A price rise usually encourages extension of supply.
shortage|短缺|a situation where quantity demanded exceeds quantity supplied|excess demand;market shortage||Shortages put upward pressure on price.
surplus|过剩|a situation where quantity supplied exceeds quantity demanded|excess supply;market surplus||Surpluses put downward pressure on price.
income tax|所得税|a tax on personal or business income|progressive income tax;tax revenue||Income tax can affect incentives to work.
direct tax|直接税|a tax paid directly on income or wealth|income tax;corporation tax||Direct taxes are usually based on ability to pay.
indirect tax|间接税|a tax on expenditure on goods and services|sales tax;VAT||Indirect taxes can raise prices.
government spending|政府支出|expenditure by government on goods services and transfers|public spending;infrastructure spending||It can influence aggregate demand and living standards.
labour force|劳动力人口|people who are working or actively seeking work|working population;labour force participation||It excludes people not seeking employment.
trade union|工会|an organisation representing workers' interests|collective bargaining;union membership||Unions may negotiate wages and working conditions.
inflation rate|通胀率|percentage increase in the general price level over a period|CPI inflation;annual inflation||High inflation reduces purchasing power.
exchange rate|汇率|the price of one currency in terms of another|currency value;exchange-rate change||Exchange rates affect import and export prices.
exports|出口|goods and services sold to other countries|export revenue;visible exports||Exports are injections into the circular flow.
imports|进口|goods and services bought from other countries|import spending;imported goods||Imports are leakages from the circular flow.
    `),
  },
  {
    subject: "economics", topic: "development-and-global-economy", label: "Economics: Development & Global Economy",
    stage: "A2",
    note: "用于发展经济、全球化、汇率、贸易和宏观评价题。",
    example: "Use {word} to analyse the data and evaluate the policy.",
    translation: "用{meaning}分析数据并评价政策。",
    terms: parseTerms(`
globalisation|全球化|increasing integration and interdependence between economies|global trade;global production||It can increase markets but expose economies to shocks.
foreign direct investment|外国直接投资|investment by a foreign firm to own or control production in another country|FDI inflow;multinational enterprise||FDI may bring jobs, technology and profit outflows.
multinational corporation|跨国公司|a firm operating production or services in more than one country|MNC;global corporation||MNCs can affect employment, tax revenue and market power.
absolute advantage|绝对优势|ability to produce more output with the same resources than another producer|absolute cost advantage;productivity||It does not fully explain mutually beneficial trade.
comparative advantage|比较优势|ability to produce at lower opportunity cost than another producer|comparative cost;specialisation||Trade can benefit both sides if opportunity costs differ.
trade creation|贸易创造|replacement of higher-cost domestic production by lower-cost imports after integration|customs union;welfare gain||It can improve allocative efficiency.
trade diversion|贸易转移|replacement of lower-cost imports from outside a bloc by higher-cost imports from inside|regional trade bloc;welfare loss||It can reduce global efficiency.
Marshall-Lerner condition|马歇尔-勒纳条件|condition that depreciation improves current account if export and import demand elasticities sum above one|currency depreciation;current account||Effects may be delayed by contracts and low short-run elasticity.
J-curve effect|J 曲线效应|short-run worsening then improvement of trade balance after depreciation|J curve;time lag||Import values can rise before quantities adjust.
terms-of-trade shock|贸易条件冲击|a sudden change in export or import prices affecting national income|commodity price shock;external shock||Primary-product exporters are often vulnerable.
development gap|发展差距|difference in living standards and economic development between countries|global inequality;development gap||Use multiple indicators, not GDP alone.
human capital|人力资本|skills education health and knowledge embodied in workers|human-capital investment;training||It can raise productivity and long-run growth.
capital flight|资本外逃|large movement of financial assets out of a country|loss of confidence;capital outflow||It can weaken currency and investment.
debt relief|债务减免|cancellation or restructuring of debt owed by a country or borrower|external debt;debt burden||It may free government spending but can create moral hazard.
structural adjustment|结构调整|policy reforms often linked to external lending conditions|IMF programme;liberalisation||It may improve efficiency but reduce welfare in the short run.
import substitution|进口替代|policy of replacing imports with domestic production|infant industry;tariff protection||It can protect jobs but reduce competition.
export-led growth|出口导向增长|growth strategy based on expanding exports|manufactured exports;global demand||It depends on competitiveness and external demand.
managed float|有管理浮动汇率|an exchange-rate system where currency floats but central bank may intervene|dirty float;currency intervention||Reserves can be used to reduce volatility.
    `),
  },
  {
    subject: "computer-science", topic: "igcse-computer-science-core", label: "IGCSE Computer Science Core",
    stage: "IGCSE",
    note: "用于 IGCSE 计算机科学数据、算法、硬件、网络和安全基础题。",
    example: "Use {word} to explain the computing process or system.",
    translation: "用{meaning}解释计算过程或系统。",
    terms: parseTerms(`
binary|二进制|a base-two number system using digits 0 and 1|binary number;bit pattern||Computers store data as binary states.
bit|比特|the smallest unit of data with value 0 or 1|single bit;binary digit||Eight bits commonly make one byte.
byte|字节|a group of eight bits|file size in bytes;kilobyte||Bytes measure storage size.
denary|十进制|the base-ten number system|denary number;decimal value||Humans usually write numbers in denary.
hexadecimal|十六进制|a base-sixteen number system using 0-9 and A-F|hex code;memory address||Hex is a compact way to represent binary.
ASCII|ASCII 编码|a character encoding using numeric codes for characters|ASCII code;character set||Extended ASCII uses more bits than standard ASCII.
Unicode|Unicode 编码|a character encoding standard covering many writing systems|Unicode character;UTF-8||Unicode supports far more characters than ASCII.
pixel|像素|the smallest addressable element of a digital image|image resolution;pixel grid||More pixels can increase detail and file size.
bitmap image|位图图像|an image stored as a grid of pixels|bitmap file;colour depth||File size depends on resolution and colour depth.
colour depth|色深|number of bits used to represent each pixel colour|colour depth;bits per pixel||Higher colour depth allows more colours.
sample rate|采样率|number of audio samples recorded per second|audio sampling;sample frequency||Higher sample rate can improve audio quality and file size.
algorithm|算法|a finite ordered set of steps for solving a problem|algorithm design;step-by-step solution||Algorithms should be clear, finite and unambiguous.
pseudocode|伪代码|structured text describing an algorithm without strict programming syntax|pseudocode statement;algorithm trace||It focuses on logic rather than language syntax.
flowchart|流程图|a diagram representing an algorithm using standard symbols|flowchart symbol;decision diamond||Flowcharts show sequence, selection and iteration.
sequence|顺序结构|executing instructions one after another|sequence structure;program order||Order matters because later steps can depend on earlier values.
selection|选择结构|choosing between alternatives using a condition|IF statement;conditional branch||Selection uses Boolean conditions.
iteration|迭代结构|repetition of instructions while or until a condition is met|loop;iteration count||Loops need a condition that eventually ends.
variable|变量|a named storage location whose value can change|declare variable;assign value||Use meaningful names and correct data types.
constant|常量|a named value that should not change during a program|constant value;fixed parameter||Constants improve readability and reduce errors.
array|数组|a data structure storing multiple values under one name and index|one-dimensional array;array index||Indexes must stay within bounds.
string|字符串|a sequence of characters treated as data|string variable;substring||Strings can store text such as names or passwords.
Boolean|布尔值|a data type with only true or false values|Boolean expression;logical condition||Boolean values control selection and loops.
linear search|线性查找|searching items one by one until the target is found|linear search algorithm;sequential search||It works on unsorted data but can be slow for large lists.
binary search|二分查找|searching a sorted list by repeatedly halving the search range|binary search algorithm;middle item||The data must be sorted.
bubble sort|冒泡排序|a sorting algorithm repeatedly swapping adjacent out-of-order items|bubble sort pass;swap||It is simple but inefficient for large data sets.
validation|输入验证|checking data is reasonable before accepting it|range check;presence check||Validation does not prove data is true.
verification|输入核对|checking data has been copied or entered accurately|double entry;visual check||Verification reduces transcription errors.
CPU|中央处理器|the component that fetches decodes and executes instructions|processor;fetch-execute cycle||CPU performance depends on clock speed, cores and cache.
RAM|随机存取存储器|volatile main memory used to store data and programs in use|main memory;volatile memory||RAM contents are lost when power is off.
ROM|只读存储器|non-volatile memory storing permanent instructions|firmware;boot instructions||ROM keeps data without power.
cache memory|高速缓存|small fast memory close to the CPU for frequently used data|CPU cache;cache hit||Cache reduces average access time.
bus|总线|a set of connections transferring data, addresses or control signals|data bus;address bus||Buses connect CPU, memory and devices.
IP address|IP 地址|a numerical address identifying a device on a network|IPv4 address;network address||IP addresses route packets across networks.
protocol|协议|a set of rules for data communication|HTTP;TCP/IP||Protocols allow devices to communicate reliably.
packet switching|分组交换|splitting data into packets sent across a network|data packet;packet header||Packets can take different routes and be reassembled.
firewall|防火墙|hardware or software filtering network traffic according to rules|network firewall;packet filtering||Firewalls reduce unauthorised access.
malware|恶意软件|software designed to damage, disrupt or gain unauthorised access|virus;trojan;ransomware||Security practices reduce malware risk.
phishing|网络钓鱼|deception used to trick users into revealing sensitive information|phishing email;fake website||Check sender, link and request before responding.
encryption|加密|converting readable data into unreadable form using a key|encrypted data;ciphertext||Encryption protects confidentiality.
    `),
  },
  {
    subject: "computer-science", topic: "alevel-computer-science", label: "A-Level Computer Science",
    stage: "AS",
    note: "用于 A-Level 计算机科学算法、数据结构、系统、数据库和复杂度题。",
    example: "Use {word} to analyse the algorithm, data structure or system.",
    translation: "用{meaning}分析算法、数据结构或系统。",
    terms: parseTerms(`
abstraction|抽象|removing unnecessary detail to focus on essential features|problem abstraction;model||Good abstraction simplifies reasoning.
decomposition|分解|breaking a complex problem into smaller manageable parts|problem decomposition;subproblem||It supports modular design.
recursion|递归|a process where a function calls itself with a smaller case|recursive function;base case||Every recursion needs a base case.
stack|栈|a last-in-first-out data structure|push pop;call stack||Stacks are used for recursion and expression evaluation.
queue|队列|a first-in-first-out data structure|enqueue dequeue;FIFO queue||Queues model waiting lines and buffers.
linked list|链表|a dynamic data structure where nodes store data and references|node pointer;linked-list traversal||Insertion can be efficient when pointers are known.
tree|树结构|a hierarchical data structure of nodes connected by edges|root node;leaf node||Trees represent hierarchy and search structures.
binary tree|二叉树|a tree in which each node has at most two children|left child;right child||Binary trees can support efficient searching.
hash table|哈希表|a data structure using a hash function to map keys to positions|hash collision;hash function||Collisions need handling.
object-oriented programming|面向对象编程|programming based on objects containing data and methods|class;object;encapsulation||It models entities with state and behaviour.
encapsulation|封装|bundling data and methods while restricting direct access|private attribute;public method||Encapsulation protects object state.
inheritance|继承|a class deriving properties and methods from another class|superclass;subclass||Inheritance supports reuse but can increase coupling.
polymorphism|多态|ability of different objects to respond to the same interface differently|method overriding;dynamic dispatch||It supports flexible designs.
normalisation|数据库规范化|organising database tables to reduce redundancy and dependency problems|first normal form;third normal form||Normalisation reduces update anomalies.
primary key|主键|a field or fields uniquely identifying a record|primary key constraint;entity table||Primary keys must be unique and not null.
foreign key|外键|a field linking one table to the primary key of another table|referential integrity;relationship||Foreign keys enforce relationships.
SQL|结构化查询语言|a language used to define and query relational databases|SELECT query;SQL statement||SQL retrieves and manipulates structured data.
Big O notation|大 O 表示法|notation describing how algorithm time or space grows with input size|O n;O log n||It describes growth rate, not exact running time.
time complexity|时间复杂度|how running time scales with input size|algorithm efficiency;worst case||Nested loops often increase complexity.
space complexity|空间复杂度|how memory use scales with input size|memory requirement;auxiliary space||Extra arrays can increase space complexity.
Turing machine|图灵机|an abstract model of computation using states, symbols and a tape|finite control;tape head||It helps define computability.
regular expression|正则表达式|a pattern language for matching strings|regex pattern;string matching||It is useful for validation and lexical analysis.
finite state machine|有限状态机|a model with finite states and transitions triggered by inputs|state transition;FSM||FSMs model protocols and simple parsers.
compiler|编译器|software translating high-level code into machine code before execution|source code;object code||Compilation can detect syntax errors before running.
interpreter|解释器|software translating and executing code line by line|interpreted language;runtime error||Interpreters can be slower but support interactive testing.
    `),
  },
  {
    subject: "business", topic: "igcse-business-core", label: "IGCSE Business Core",
    stage: "IGCSE",
    note: "用于 IGCSE Business 企业目标、营销、运营、人力和财务基础题。",
    example: "Use {word} to explain the business decision in the case study.",
    translation: "用{meaning}解释案例中的商业决策。",
    terms: parseTerms(`
entrepreneur|企业家|a person who starts and organises a business while taking risk|business founder;enterprise||Entrepreneurs combine resources and identify opportunities.
business objective|企业目标|a target that a business aims to achieve|profit objective;growth objective||Objectives guide decisions and can conflict.
stakeholder|利益相关者|a person or group affected by or able to affect a business|internal stakeholder;external stakeholder||Different stakeholders may have conflicting interests.
sole trader|个体经营者|a business owned and controlled by one person|sole proprietorship;unlimited liability||The owner keeps profits but bears risk.
partnership|合伙企业|a business owned by two or more people|partnership agreement;partners||Partners share capital, skills, profits and risk.
limited company|有限责任公司|a company whose owners' liability is limited to their investment|private limited company;shareholder||It has a separate legal identity.
limited liability|有限责任|owners are not personally responsible beyond their investment|shareholder protection;company debts||It reduces personal financial risk.
market research|市场调研|collecting information about customers, competitors and markets|primary research;secondary research||Research reduces uncertainty but may be costly.
market segment|市场细分|a group of customers with similar characteristics or needs|target segment;segmentation||Segmentation helps tailor products and promotion.
marketing mix|营销组合|the four Ps used to market a product: product price place promotion|4Ps;marketing strategy||A coherent mix supports positioning.
product life cycle|产品生命周期|stages a product passes through from launch to decline|introduction growth maturity decline||Marketing decisions change by stage.
brand loyalty|品牌忠诚|customers' tendency to keep buying the same brand|repeat purchase;brand image||Loyalty can reduce price sensitivity.
break-even point|盈亏平衡点|output level where total revenue equals total costs|break-even chart;no profit no loss|break-even output = fixed costs / contribution per unit|Above break-even the business makes profit if assumptions hold.
fixed cost|固定成本|cost that does not change with output in the short run|rent;salaries||Fixed cost per unit falls as output rises.
variable cost|可变成本|cost that changes directly with output|materials;piece-rate wages||Variable cost affects contribution.
revenue|收入|money received from selling goods or services|sales revenue;total revenue|revenue = price x quantity sold|Revenue is not the same as profit.
profit|利润|revenue remaining after costs are deducted|gross profit;net profit|profit = revenue - total cost|Profit can be reinvested or distributed.
cash flow|现金流|movement of cash into and out of a business|cash inflow;cash outflow||A profitable business can still run out of cash.
working capital|营运资本|funds available for day-to-day operations|current assets;current liabilities|working capital = current assets - current liabilities|Insufficient working capital can cause liquidity problems.
motivation|激励|factors that encourage employees to work effectively|financial motivation;non-financial motivation||Motivation can affect productivity and labour turnover.
delegation|授权|giving authority for tasks to another worker|delegation of responsibility;span of control||Delegation can develop staff but needs trust.
organisational structure|组织结构|the way roles and authority are arranged in a business|hierarchy;chain of command||Structure affects communication and control.
quality control|质量控制|checking finished products against standards|inspection;defect rate||It detects faults after production.
quality assurance|质量保证|building quality into processes to prevent defects|quality system;process standard||It aims to prevent faults before they occur.
inventory|库存|materials, work in progress or finished goods held by a business|stock control;inventory level||Too much stock increases cost; too little risks shortages.
    `),
  },
  {
    subject: "geography", topic: "igcse-geography-core", label: "IGCSE Geography Core",
    stage: "IGCSE",
    note: "用于 IGCSE 地理自然过程、人文地理、地图和案例题。",
    example: "Use {word} to explain the process, pattern or management response.",
    translation: "用{meaning}解释过程、分布或管理策略。",
    terms: parseTerms(`
erosion|侵蚀|wearing away and removal of material by water wind ice or waves|river erosion;coastal erosion||Erosion processes include hydraulic action, abrasion and attrition.
deposition|沉积|laying down of transported material when energy decreases|river deposition;sediment deposit||Deposition occurs when transport capacity falls.
weathering|风化|breakdown of rock in place without movement|physical weathering;chemical weathering||Weathering differs from erosion because material is not transported.
mass movement|块体运动|downslope movement of material under gravity|landslide;soil creep||Water can increase mass movement risk.
meander|曲流|a bend in a river channel|river meander;outer bank erosion||Erosion occurs on the outside bend and deposition on the inside.
floodplain|洪泛平原|flat land beside a river built by deposition during floods|floodplain deposit;alluvium||Floodplains can be fertile but flood-prone.
longshore drift|沿岸漂移|movement of sediment along a coast by angled swash and backwash|coastal transport;beach drift||Wave direction controls transport direction.
constructive wave|建设性波|a wave with strong swash and weak backwash that builds beaches|constructive waves;deposition||It deposits material on the beach.
destructive wave|破坏性波|a wave with weak swash and strong backwash that erodes beaches|destructive waves;erosion||It removes beach material.
plate boundary|板块边界|a zone where tectonic plates meet|constructive boundary;destructive boundary||Hazards depend on boundary type.
earthquake focus|震源|the point inside Earth where an earthquake starts|seismic focus;epicentre||Seismic waves radiate from the focus.
epicentre|震中|the point on Earth's surface directly above an earthquake focus|earthquake epicentre;seismic waves||Damage is often greatest near the epicentre.
volcanic eruption|火山喷发|release of lava ash and gases from a volcano|eruption hazard;volcanic cone||Eruption style depends on magma viscosity and gas content.
population density|人口密度|number of people per unit area|population density map;persons per square kilometre|population density = population / area|Density does not show distribution within the area.
migration|迁移|movement of people from one place to another|rural-urban migration;international migration||Push and pull factors influence migration.
urbanisation|城市化|increase in the proportion of people living in urban areas|urban growth;urbanisation rate||It can create opportunities and pressure on services.
informal settlement|非正规住区|housing built without official planning or legal permission|squatter settlement;slum||Residents may lack secure services and tenure.
birth rate|出生率|number of live births per thousand people per year|crude birth rate;fertility||It is affected by healthcare, education and culture.
death rate|死亡率|number of deaths per thousand people per year|crude death rate;mortality||It often falls with improved healthcare and sanitation.
natural increase|自然增长|population growth caused by births exceeding deaths|rate of natural increase;population growth||Migration is not included.
development indicator|发展指标|a measure used to compare development level|GDP per capita;literacy rate||Use several indicators for a fuller picture.
primary industry|第一产业|economic activity extracting raw materials|farming;mining;fishing||Primary industry is often important in lower-income economies.
secondary industry|第二产业|economic activity manufacturing or processing goods|factory production;manufacturing||It adds value to raw materials.
tertiary industry|第三产业|economic activity providing services|retail;tourism;banking||Service sectors often grow with development.
sustainable development|可持续发展|development meeting present needs without preventing future generations from meeting theirs|sustainable resource use;long-term planning||It balances economic, social and environmental goals.
    `),
  },
  {
    subject: "accounting", topic: "igcse-accounting-core", label: "IGCSE Accounting Core",
    stage: "IGCSE",
    note: "用于 IGCSE Accounting 账户、报表、调整和比率分析题。",
    example: "Use {word} to record the transaction or interpret the statement.",
    translation: "用{meaning}记录交易或解释报表。",
    terms: parseTerms(`
asset|资产|a resource owned or controlled by a business that provides future benefit|current asset;non-current asset||Assets are shown on the statement of financial position.
liability|负债|an obligation owed by a business to others|current liability;long-term liability||Liabilities reduce owner's equity.
capital|资本|owner's investment in the business|opening capital;capital account||Capital increases with investment and profit.
drawings|提款|cash or goods taken by the owner for personal use|owner drawings;drawings account||Drawings reduce capital.
revenue expenditure|收益性支出|spending for day-to-day operations benefiting the current period|rent expense;wages expense||It is charged to the income statement.
capital expenditure|资本性支出|spending on non-current assets or improvements with long-term benefit|purchase of machinery;building extension||It is recorded as an asset.
double entry|复式记账|recording every transaction with equal debit and credit entries|debit entry;credit entry||Debits must equal credits.
ledger account|分类账户|an account used to record transactions of the same type|sales ledger;purchase ledger||Ledger accounts feed into the trial balance.
trial balance|试算平衡表|a list of debit and credit balances used to check arithmetic accuracy|trial balance totals;balance extracted||It does not detect all errors.
income statement|损益表|a financial statement calculating profit or loss for a period|gross profit;profit for the year||It matches income and expenses.
statement of financial position|财务状况表|a statement showing assets liabilities and capital at a date|balance sheet;financial position||Assets equal capital plus liabilities.
gross profit|毛利|sales revenue minus cost of sales|gross profit margin;trading account|gross profit = sales - cost of sales|It measures profit before expenses.
net profit|净利润|profit after deducting expenses from gross profit|profit for the year;net margin|net profit = gross profit - expenses|It increases capital.
depreciation|折旧|allocation of the cost of a non-current asset over its useful life|straight-line depreciation;reducing balance||Depreciation is an expense, not cash leaving.
bad debt|坏账|an amount owed by a credit customer that will not be collected|write off bad debt;irrecoverable debt||Writing off reduces receivables and profit.
provision for doubtful debts|坏账准备|an estimate of receivables that may not be collected|allowance for doubtful debts;prudence||It applies the prudence principle.
accrual|应计费用|an expense incurred but not yet paid|accrued expense;adjustment||Accruals match expenses to the period.
prepayment|预付费用|an expense paid in advance for a future period|prepaid expense;adjustment||Prepayments are current assets.
bank reconciliation|银行调节|matching cash book balance with bank statement balance|unpresented cheque;bank charges||Timing differences and errors are adjusted.
inventory valuation|存货计价|assigning a value to closing inventory|lower of cost and net realisable value;stock value||Closing inventory affects cost of sales.
liquidity ratio|流动性比率|a ratio measuring ability to meet short-term debts|current ratio;quick ratio||Liquidity differs from profitability.
current ratio|流动比率|current assets divided by current liabilities|working capital ratio;liquidity|current ratio = current assets / current liabilities|Too high can mean inefficient asset use.
return on capital employed|资本回报率|profitability ratio comparing profit with capital invested|ROCE;profitability|ROCE = profit / capital employed x 100|It measures how effectively capital generates profit.
    `),
  },
];

groups.push(...igAlevelExpansionGroups);

const igAlevelSecondExpansionGroups = [
  {
    subject: "mathematics", topic: "further-pure-and-decision", label: "Further Pure & Decision Mathematics",
    stage: "A2",
    note: "用于高阶纯数、矩阵、复数、级数、数值方法和决策数学题。",
    example: "Use {word} to structure the proof, calculation or algorithm.",
    translation: "用{meaning}组织证明、计算或算法。",
    terms: parseTerms(`
complex number|复数|a number with real and imaginary parts|complex plane;z equals x plus iy|z = x + iy|Use real and imaginary parts separately when equating expressions.
imaginary unit|虚数单位|the number i whose square is negative one|imaginary unit;i squared|i^2 = -1|Powers of i cycle every four.
modulus-argument form|模辐角形式|a complex number written using magnitude and angle|mod-arg form;polar form|z = r(cos theta + i sin theta)|The argument is measured from the positive real axis.
Argand diagram|阿根图|a graph representing complex numbers on real and imaginary axes|Argand plane;complex locus||The horizontal axis is real and vertical axis is imaginary.
complex conjugate|复共轭|a complex number with the imaginary part sign changed|conjugate pair;z bar|z zbar = |z|^2|Conjugates help divide complex numbers.
De Moivre's theorem|棣莫弗定理|a theorem for powers of complex numbers in polar form|De Moivre;roots of unity|(cos theta + i sin theta)^n = cos ntheta + i sin ntheta|Use it to find powers and roots.
matrix|矩阵|a rectangular array of numbers arranged in rows and columns|matrix multiplication;matrix order||Matrix multiplication is not generally commutative.
determinant|行列式|a scalar value associated with a square matrix|matrix determinant;det A||A zero determinant means the matrix is singular.
inverse matrix|逆矩阵|a matrix that multiplies with the original to give the identity matrix|matrix inverse;A inverse|A A^-1 = I|Only non-singular square matrices have inverses.
eigenvalue|特征值|a scalar by which an eigenvector is stretched under a linear transformation|eigenvalue equation;lambda|Av = lambda v|Eigenvectors keep their direction under the transformation.
eigenvector|特征向量|a non-zero vector whose direction is unchanged by a matrix transformation|eigenvector;linear transformation|Av = lambda v|The zero vector is not an eigenvector.
linear transformation|线性变换|a mapping preserving vector addition and scalar multiplication|matrix transformation;image of vector||Matrix columns show where basis vectors go.
proof by induction|数学归纳法|proof using a base case and an inductive step|base case;inductive hypothesis||The inductive step must prove n to n+1.
recurrence relation|递推关系|an equation defining terms of a sequence using previous terms|recursive sequence;initial value||Initial conditions are needed for a unique sequence.
Maclaurin series|麦克劳林级数|a power series expansion of a function about zero|series expansion;approximation|f(x)=f(0)+xf'(0)+...|Use the valid range of x.
Taylor series|泰勒级数|a power series expansion about a specified point|Taylor expansion;local approximation||More terms usually improve local accuracy.
conic section|圆锥曲线|a curve formed by cutting a cone with a plane|ellipse;parabola;hyperbola||Algebraic forms reveal focus and directrix properties.
polar coordinates|极坐标|coordinates using distance from origin and angle from a reference direction|polar curve;r theta||Convert using x = r cos theta and y = r sin theta.
differential equation model|微分方程模型|a model describing how a quantity changes using derivatives|growth model;decay model||Solve and interpret constants from initial conditions.
Euler method|欧拉法|a numerical method stepping along a differential equation slope|step size;Euler approximation|y_{n+1}=y_n+h f(x_n,y_n)|Smaller step size often improves accuracy.
Newton-Raphson method|牛顿迭代法|an iterative method for approximating roots using tangents|Newton iteration;root approximation|x_{n+1}=x_n - f(x_n)/f'(x_n)|It can fail if the starting value is poor.
linear programming|线性规划|optimising a linear objective subject to linear constraints|feasible region;objective function||The optimum occurs at a vertex of the feasible region.
critical path analysis|关键路径分析|project scheduling method identifying tasks that determine minimum completion time|network diagram;float||Critical activities have zero float.
Dijkstra's algorithm|迪杰斯特拉算法|an algorithm finding shortest paths from a start node in a weighted network|shortest path;temporary label||Weights must be non-negative.
minimum spanning tree|最小生成树|a set of edges connecting all vertices with minimum total weight and no cycle|Kruskal algorithm;Prim algorithm||It connects all nodes without loops.
    `),
  },
  {
    subject: "mathematics", topic: "igcse-statistics-probability", label: "IGCSE Statistics & Probability",
    stage: "IGCSE",
    note: "用于 IGCSE 统计图、概率语言和数据解释题。",
    example: "Use {word} to read the data and answer in context.",
    translation: "用{meaning}读取数据并结合语境回答。",
    terms: parseTerms(`
frequency table|频数表|a table showing how often values or classes occur|grouped frequency table;frequency column||Total frequency is the sum of frequencies.
class interval|组距|a range of values grouped together in statistics|class boundary;class width||Class intervals should not overlap.
modal class|众数组|the grouped interval with the highest frequency|modal interval;highest frequency||It is a class, not one exact value.
estimated mean|估计平均数|an approximate mean calculated from grouped data using midpoints|grouped mean;midpoint||Use midpoint times frequency, then divide by total frequency.
range|极差|largest value minus smallest value|data range;spread||Range is affected by outliers.
quartile range|四分位距|the spread between upper and lower quartiles|interquartile range;middle fifty percent||It measures spread of the middle half of data.
cumulative frequency graph|累积频率图|a graph of cumulative frequency against upper class boundary|median from graph;quartiles||Read estimates from the curve.
frequency polygon|频数折线图|a line graph joining class midpoints plotted against frequency|frequency polygon;midpoint||Use class midpoints on the horizontal axis.
two-way table|双向表|a table classifying data by two categories|contingency table;row total||Use row and column totals carefully.
relative frequency|相对频率|experimental frequency divided by total trials|experimental probability;relative frequency||It approaches theoretical probability with many trials.
theoretical probability|理论概率|probability based on equally likely outcomes or a model|fair dice;sample space||It depends on assumptions.
conditional event|条件事件|an event considered after another event is known to have occurred|given that;restricted sample space||Restrict the denominator to the known condition.
sample space diagram|样本空间图|a diagram listing all possible paired outcomes|two dice;outcome grid||Use it to avoid missing outcomes.
mutually exclusive|互斥的|events that cannot happen at the same time|mutually exclusive events;no overlap||For mutually exclusive events, P(A and B)=0.
not mutually exclusive|非互斥的|events that can happen at the same time|overlapping events;intersection||Subtract the overlap when adding probabilities.
    `),
  },
  {
    subject: "chemistry", topic: "advanced-organic-analysis", label: "Chemistry: Advanced Organic & Analysis",
    stage: "A2",
    note: "用于 A2 有机合成、谱图、机理和分子结构鉴定题。",
    example: "Use {word} to identify the structure, mechanism or spectrum.",
    translation: "用{meaning}识别结构、机理或谱图。",
    terms: parseTerms(`
acyl chloride|酰氯|an acid derivative containing the -COCl functional group|acyl chloride;ethanoyl chloride|-COCl|Acyl chlorides react vigorously with water, alcohols and amines.
acid anhydride|酸酐|an acid derivative containing two acyl groups linked by oxygen|ethanoic anhydride;acylation||Acid anhydrides are less reactive than acyl chlorides.
amide|酰胺|an organic compound containing the -CONH2 or substituted amide group|amide bond;peptide link|-CONH2|Amides form in reactions of acyl derivatives with ammonia or amines.
amine|胺|an organic base containing nitrogen with a lone pair|primary amine;amine base|-NH2|Amines can act as nucleophiles and bases.
diazonium salt|重氮盐|an aromatic compound containing the diazonium group|benzenediazonium salt;azo dye||Diazonium salts are used in azo coupling.
azo compound|偶氮化合物|a compound containing the -N=N- group|azo dye;coupling reaction|-N=N-|Azo dyes are often strongly coloured.
benzene|苯|an aromatic hydrocarbon with delocalised pi electrons|benzene ring;aromatic compound|C6H6|Benzene usually undergoes substitution rather than addition.
aromaticity|芳香性|extra stability from a cyclic delocalised pi-electron system|aromatic ring;delocalisation||Aromatic systems resist addition reactions.
electrophilic substitution|亲电取代|a reaction where an electrophile replaces hydrogen on an aromatic ring|nitration;halogenation||The ring is restored after substitution.
nitration|硝化|introduction of a nitro group into an aromatic ring|nitrating mixture;nitrobenzene|-NO2|Concentrated nitric and sulfuric acids generate the electrophile.
Friedel-Crafts reaction|傅克反应|electrophilic substitution adding alkyl or acyl groups to benzene|Friedel-Crafts acylation;AlCl3 catalyst||The catalyst generates a strong electrophile.
carbonyl compound|羰基化合物|an aldehyde or ketone containing a C=O group|carbonyl group;aldehyde ketone|C=O|Carbonyl carbon is electrophilic.
2,4-DNPH test|2,4-DNPH 测试|a test for aldehydes and ketones producing an orange precipitate|carbonyl test;orange precipitate||It detects C=O but does not distinguish aldehyde from ketone.
Tollens' reagent|托伦试剂|a reagent that oxidises aldehydes and forms a silver mirror|silver mirror;aldehyde test||Ketones usually give no silver mirror.
Fehling's solution|斐林试剂|a reagent giving a brick-red precipitate with many aldehydes|Fehling test;Cu2O precipitate||It distinguishes reducing aldehydes from ketones.
NMR spectroscopy|核磁共振谱|analysis using nuclear magnetic environments to infer structure|proton NMR;chemical shift||Peak area, splitting and shift give structural evidence.
chemical shift|化学位移|position of an NMR signal relative to a standard|delta value;NMR peak||It depends on the chemical environment.
spin-spin splitting|自旋裂分|NMR peak splitting caused by neighbouring non-equivalent protons|n+1 rule;multiplet||Splitting shows nearby proton counts.
infrared absorption|红外吸收|absorption at characteristic wavenumbers by vibrating bonds|IR peak;functional group||Broad O-H and sharp C=O peaks are important.
fragmentation|碎裂|breaking of molecular ions into smaller ions in mass spectrometry|fragment ion;base peak||Fragment patterns help identify structure.
molecular ion|分子离子|the ion corresponding to the whole molecule in mass spectrometry|M+ peak;molecular mass||It helps find relative molecular mass.
chiral centre|手性中心|an atom attached to four different groups causing optical isomerism|asymmetric carbon;enantiomer||A molecule with one chiral centre has two enantiomers.
racemic mixture|外消旋混合物|a 50:50 mixture of two enantiomers with no overall optical rotation|racemate;optically inactive||Equal rotations cancel.
    `),
  },
  {
    subject: "chemistry", topic: "advanced-physical-chemistry", label: "Chemistry: Advanced Physical Chemistry",
    stage: "A2",
    note: "用于 A2 热力学、平衡、酸碱、电化学和速率机理题。",
    example: "Use {word} to calculate or explain the chemical system.",
    translation: "用{meaning}计算或解释化学体系。",
    terms: parseTerms(`
entropy|熵|a measure of the dispersal of energy or disorder in a system|entropy change;standard entropy|ΔS|Entropy often increases when gases form or particles become more dispersed.
Gibbs free energy|吉布斯自由能|a thermodynamic quantity predicting feasibility at constant temperature and pressure|free-energy change;spontaneous reaction|ΔG = ΔH - TΔS|A negative ΔG indicates thermodynamic feasibility.
standard electrode potential|标准电极电势|electrode potential measured under standard conditions relative to hydrogen electrode|E standard;half-cell||More positive values indicate stronger oxidising tendency.
cell potential|电池电势|potential difference between two half-cells|E cell;electrochemical cell|Ecell = Eright - Eleft|A positive Ecell suggests feasible redox under standard conditions.
Nernst equation|能斯特方程|an equation relating electrode potential to concentration|non-standard potential;reaction quotient||Concentration changes can shift cell potential.
partition coefficient|分配系数|ratio of solute concentration between two immiscible solvents at equilibrium|solvent extraction;partition equilibrium|Kpc = concentration in solvent 1 / concentration in solvent 2|Multiple extractions can be more effective.
weak acid|弱酸|an acid that partially dissociates in aqueous solution|weak acid equilibrium;Ka||Weak acids establish equilibrium, not complete ionisation.
strong acid|强酸|an acid that fully dissociates in aqueous solution|strong acid;complete dissociation||Strong acid concentration often equals hydrogen ion concentration.
conjugate acid-base pair|共轭酸碱对|two species differing by one proton|conjugate base;proton transfer||Acids donate protons and bases accept protons.
buffer capacity|缓冲容量|amount of acid or base a buffer can resist before pH changes significantly|buffer range;acid-base buffer||Capacity depends on concentrations of buffer components.
equivalence point|等量点|point in titration where stoichiometric amounts have reacted|titration curve;neutralisation||It may not equal endpoint exactly.
rate-determining step|决速步|the slowest step controlling the overall rate of a mechanism|reaction mechanism;slow step||Rate equations often reflect the rate-determining step.
steady-state approximation|稳态近似|assuming an intermediate concentration remains nearly constant|reaction intermediate;mechanism analysis||It simplifies rate law derivation.
Arrhenius equation|阿伦尼乌斯方程|relationship between rate constant and temperature|activation energy;Arrhenius plot|k = A e^(-Ea/RT)|A plot of ln k against 1/T has gradient -Ea/R.
Boltzmann distribution|玻尔兹曼分布|distribution of molecular energies in a sample|activation energy;temperature effect||Higher temperature increases the fraction above Ea.
heterogeneous equilibrium|多相平衡|equilibrium involving species in different phases|solid-gas equilibrium;phase||Pure solids and liquids are omitted from K expressions.
homogeneous equilibrium|均相平衡|equilibrium where all species are in the same phase|gas equilibrium;aqueous equilibrium||Concentrations or partial pressures are included.
partial pressure|分压|pressure exerted by one gas in a mixture|partial pressure;Kp|partial pressure = mole fraction x total pressure|Use partial pressures in Kp expressions.
Kp|气相平衡常数|equilibrium constant expressed using partial pressures of gases|Kp expression;gas equilibrium||Only gaseous species appear in Kp.
    `),
  },
  {
    subject: "biology", topic: "biotechnology-and-genomics", label: "Biology: Biotechnology & Genomics",
    stage: "A2",
    note: "用于 A2 分子生物、基因技术、免疫技术和生物信息题。",
    example: "Use {word} to explain the technique or interpret the evidence.",
    translation: "用{meaning}解释技术或解读证据。",
    terms: parseTerms(`
polymerase chain reaction|聚合酶链式反应|a technique amplifying specific DNA sequences|PCR;DNA amplification||Cycles of denaturation, annealing and extension copy DNA.
restriction enzyme|限制性内切酶|an enzyme cutting DNA at specific recognition sequences|restriction site;DNA fragment||Sticky ends can join complementary sequences.
ligase|连接酶|an enzyme joining DNA fragments by forming phosphodiester bonds|DNA ligase;recombinant DNA||Ligase seals sugar-phosphate backbones.
plasmid vector|质粒载体|a small circular DNA molecule used to transfer genes|bacterial plasmid;gene vector||Vectors often include marker genes.
marker gene|标记基因|a gene used to identify cells that have taken up a vector|antibiotic resistance marker;fluorescent marker||Markers help select transformed cells.
gel electrophoresis|凝胶电泳|a technique separating DNA or proteins by size and charge|agarose gel;DNA band||Smaller DNA fragments travel further.
DNA probe|DNA 探针|a labelled single-stranded DNA sequence used to locate complementary DNA|radioactive probe;fluorescent probe||Base pairing gives specificity.
genome sequencing|基因组测序|determining the order of bases in DNA|sequencing data;whole genome||Sequencing supports diagnosis and evolutionary comparison.
bioinformatics|生物信息学|use of computing to analyse biological data|sequence alignment;genomic database||Large datasets require computational analysis.
gene therapy|基因治疗|treatment by adding replacing or editing genes in cells|somatic gene therapy;viral vector||Delivery and long-term expression are major challenges.
CRISPR-Cas9|CRISPR-Cas9 基因编辑|a genome editing system guided by RNA to cut target DNA|guide RNA;Cas9 nuclease||Off-target effects must be considered.
monoclonal antibody|单克隆抗体|identical antibodies produced from one clone of cells|hybridoma;target antigen||They bind one specific antigen.
ELISA|酶联免疫吸附测定|an antibody-based test detecting antigens or antibodies|ELISA plate;colour change||Colour intensity can indicate concentration.
hybridoma|杂交瘤|a fused cell producing monoclonal antibodies indefinitely|B lymphocyte;myeloma cell||Hybridomas combine antibody production and rapid division.
stem-cell therapy|干细胞治疗|medical use of stem cells to repair or replace damaged tissue|embryonic stem cell;adult stem cell||Ethics and immune rejection must be evaluated.
totipotent|全能性的|able to differentiate into all cell types including extra-embryonic tissues|totipotent cell;early embryo||Totipotency is broader than pluripotency.
pluripotent|多能性的|able to differentiate into many body cell types|pluripotent stem cell;iPS cell||Pluripotent cells cannot form every extra-embryonic tissue.
epigenetics|表观遗传学|heritable changes in gene expression not caused by DNA sequence changes|DNA methylation;histone modification||Environment can affect epigenetic marks.
proteomics|蛋白质组学|study of the full set of proteins produced by a cell or organism|protein profile;proteome||Protein expression changes with conditions.
    `),
  },
  {
    subject: "biology", topic: "advanced-ecology-and-evolution", label: "Biology: Advanced Ecology & Evolution",
    stage: "A2",
    note: "用于生态统计、进化证据、种群模型和保护生物学题。",
    example: "Use {word} to analyse population data or evolutionary evidence.",
    translation: "用{meaning}分析种群数据或进化证据。",
    terms: parseTerms(`
Hardy-Weinberg principle|哈迪-温伯格原理|a model predicting constant allele frequencies under specific conditions|Hardy-Weinberg equilibrium;p and q|p^2 + 2pq + q^2 = 1|Assumptions include no selection, mutation, migration, small sampling error or non-random mating.
allele frequency|等位基因频率|the proportion of all alleles at a locus that are a particular allele|gene pool;frequency p||Selection changes allele frequencies across generations.
gene pool|基因库|all alleles present in a population|population gene pool;genetic variation||A larger gene pool often supports adaptation.
genetic drift|遗传漂变|random change in allele frequency, especially in small populations|founder effect;bottleneck effect||Drift can reduce genetic variation.
founder effect|奠基者效应|reduced genetic variation when a new population starts from few individuals|island population;genetic drift||Allele frequencies may differ from the original population.
bottleneck effect|瓶颈效应|loss of genetic variation after a sharp population reduction|population crash;genetic diversity||Survivors may not represent the original gene pool.
directional selection|定向选择|selection favouring one extreme phenotype|antibiotic resistance;selection pressure||The population mean shifts.
stabilising selection|稳定化选择|selection favouring intermediate phenotypes|birth mass;reduced extremes||Variation decreases around the mean.
disruptive selection|分裂选择|selection favouring both extremes over intermediate phenotypes|two niches;speciation risk||It can contribute to divergence.
allopatric speciation|异域物种形成|formation of new species after geographic isolation|geographical barrier;reproductive isolation||No gene flow allows divergence.
sympatric speciation|同域物种形成|formation of new species without geographic separation|polyploidy;behavioural isolation||It can occur through reproductive barriers.
succession|演替|gradual change in community composition over time|primary succession;secondary succession||Abiotic conditions change as species colonise.
climax community|顶极群落|a stable mature community at the end of succession|climax vegetation;ecosystem stability||It depends on climate and soil.
random sampling|随机取样|sampling method giving each location or organism an equal chance of selection|random quadrat;bias reduction||It reduces sampling bias.
systematic sampling|系统取样|sampling at regular intervals across an area|transect;belt transect||It is useful along an environmental gradient.
Simpson's diversity index|辛普森多样性指数|a measure combining species richness and evenness|diversity index;species abundance||Higher values often indicate greater diversity depending on formula used.
capture-mark-recapture|标志重捕法|method estimating population size by marking and recapturing organisms|Lincoln index;population estimate|N = n1 x n2 / m2|Assumes marks are not lost and mixing is random.
conservation|保护生物学|management to protect species, habitats and biodiversity|in situ conservation;ex situ conservation||Conservation balances ecological, economic and social factors.
    `),
  },
  {
    subject: "economics", topic: "advanced-microeconomics", label: "Economics: Advanced Microeconomics",
    stage: "A2",
    note: "用于 A-Level 微观经济福利、市场结构、劳动市场和行为经济题。",
    example: "Use {word} to analyse welfare, efficiency or firm behaviour.",
    translation: "用{meaning}分析福利、效率或企业行为。",
    terms: parseTerms(`
allocative efficiency|配置效率|a situation where resources produce the mix of goods most wanted by society|P equals MC;social optimum||It occurs where price equals marginal cost under certain assumptions.
productive efficiency|生产效率|production at the lowest possible average cost|minimum average cost;efficient production||It occurs on the production possibility frontier or lowest AC point.
dynamic efficiency|动态效率|efficiency from innovation and investment over time|research and development;long-run efficiency||It may require short-run supernormal profit.
X-inefficiency|X 低效率|higher costs caused by weak competitive pressure or poor management|slack;cost inefficiency||Monopoly power can reduce pressure to minimise costs.
deadweight loss|无谓损失|loss of total welfare from market distortion|welfare triangle;efficiency loss||It represents mutually beneficial trades not made.
consumer incidence|消费者税负|share of a tax burden borne by consumers|tax incidence;elasticity||The less elastic side bears more burden.
producer incidence|生产者税负|share of a tax burden borne by producers|tax burden;elasticity||Elasticity determines division of burden.
merit good|优效品|a good under-consumed because private benefit is undervalued|education;healthcare||Government may subsidise or provide it.
demerit good|劣效品|a good over-consumed because private cost is underestimated|cigarettes;alcohol||Government may tax or regulate it.
public good|公共物品|a good that is non-rival and non-excludable|street lighting;national defence||Free-rider problem causes under-provision.
common resource|公共资源|a rival but non-excludable resource|overfishing;common land||It can suffer overuse.
asymmetric information|信息不对称|a situation where one party has more or better information than another|moral hazard;adverse selection||It can cause market failure.
moral hazard|道德风险|riskier behaviour after protection from consequences|insurance market;risk taking||Insurance can change incentives.
adverse selection|逆向选择|market problem where high-risk participants are more likely to buy or remain|used-car market;insurance||It can drive out low-risk participants.
price leadership|价格领导|a situation where one firm sets price and rivals follow|dominant firm;oligopoly pricing||It may be tacit collusion.
game theory|博弈论|analysis of strategic decisions where outcomes depend on rivals' choices|pay-off matrix;dominant strategy||It helps explain oligopoly behaviour.
Nash equilibrium|纳什均衡|a situation where no player can improve by changing strategy alone|strategic equilibrium;pay-off matrix||It need not be the best collective outcome.
monopsony|买方垄断|a market with one dominant buyer of labour or inputs|monopsony employer;wage-setting power||It can push wages below competitive levels.
labour immobility|劳动力不流动性|barriers preventing workers moving between jobs or regions|occupational immobility;geographical immobility||Training and housing policy may reduce it.
    `),
  },
  {
    subject: "psychology", topic: "igcse-psychology-core", label: "IGCSE Psychology Core",
    stage: "IGCSE",
    note: "用于心理学基础研究方法、认知、发展、社会和生物解释题。",
    example: "Use {word} to explain the study or behaviour.",
    translation: "用{meaning}解释研究或行为。",
    terms: parseTerms(`
hypothesis|假设|a testable prediction about a relationship between variables|research hypothesis;null hypothesis||It should be clear and measurable.
independent variable|自变量|the variable deliberately changed by the researcher|IV;experimental condition||It is manipulated to test effect.
dependent variable|因变量|the variable measured as the outcome|DV;response measure||It should be operationalised.
operationalisation|操作化定义|defining variables in measurable terms|operational definition;measurable behaviour||It makes research replicable.
control group|控制组|a group not receiving the experimental treatment|comparison group;baseline||It helps judge treatment effect.
experimental group|实验组|a group receiving the treatment or condition being tested|treatment group;condition||It is compared with the control group.
validity|效度|the extent to which a study measures what it claims to measure|internal validity;ecological validity||High validity supports stronger conclusions.
reliability|信度|consistency of a measure or result|test-retest reliability;inter-rater reliability||Reliable measures produce similar results.
sample|样本|participants selected from the target population|participant sample;sampling method||Samples should represent the population when generalising.
random allocation|随机分配|assigning participants to conditions by chance|random assignment;condition allocation||It reduces participant-variable bias.
demand characteristics|需求特征|cues that make participants guess the study aim and change behaviour|participant bias;experiment cues||They can reduce validity.
ethics|伦理|principles protecting participants in research|informed consent;debriefing||Ethical research balances value and participant protection.
informed consent|知情同意|agreement to take part after receiving relevant information|consent form;participant rights||Participants should know enough to decide freely.
debriefing|事后说明|explaining the study purpose and restoring participants after participation|post-study debrief;ethical procedure||It is especially important after deception.
memory|记忆|the process of encoding storing and retrieving information|short-term memory;long-term memory||Memory is reconstructive, not a perfect recording.
attention|注意|selective focus on particular information|selective attention;divided attention||Attention limits what is processed.
conditioning|条件作用|learning through association between stimuli or behaviour and consequences|classical conditioning;operant conditioning||It explains some learned behaviours.
reinforcement|强化|a consequence that increases the likelihood of a behaviour|positive reinforcement;negative reinforcement||Reinforcement is not the same as punishment.
attachment|依恋|an emotional bond between infant and caregiver|secure attachment;caregiver||Early attachment can affect later development.
conformity|从众|changing behaviour or belief to match a group|social pressure;majority influence||Conformity can be normative or informational.
obedience|服从|following orders from an authority figure|authority;obedience study||Authority, legitimacy and proximity can affect obedience.
stress response|应激反应|physiological and psychological reaction to perceived threat|fight-or-flight;cortisol||Stress can affect health and performance.
    `),
  },
];

groups.push(...igAlevelSecondExpansionGroups);

const igAlevelThirdExpansionGroups = [
  {
    subject: "chemistry", topic: "igcse-chemical-reactions-and-industry", label: "IGCSE Chemistry: Reactions & Industry",
    stage: "IGCSE",
    note: "用于 IGCSE 化学工业、空气水、反应类型、周期表和实验现象题。",
    example: "Use {word} to explain the observation, process or industrial choice.",
    translation: "用{meaning}解释现象、过程或工业选择。",
    terms: parseTerms(`
thermal decomposition|热分解|breaking down a compound by heating|thermal decomposition;metal carbonate||Many carbonates decompose to metal oxide and carbon dioxide.
hydration|水合|chemical combination with water or addition of water molecules|hydrated compound;hydration reaction||Hydrated salts contain water of crystallisation.
dehydration|脱水|removal of water from a substance or compound|dehydrating agent;dehydration reaction||Concentrated sulfuric acid can act as a dehydrating agent.
excess reagent|过量试剂|a reactant present in more than the amount needed to react completely|reactant in excess;leftover reagent||The other reactant may be limiting.
stoichiometry|化学计量|use of balanced equations to calculate reacting amounts|stoichiometric ratio;mole ratio||Equation coefficients give mole ratios.
aqueous solution|水溶液|a solution in which water is the solvent|aqueous ions;solution chemistry||State symbols show aqueous species as aq.
saturated solution|饱和溶液|a solution containing the maximum dissolved solute at a given temperature|saturated salt solution;crystallisation||Cooling a saturated solution can form crystals.
solubility|溶解度|the amount of solute that dissolves in a solvent under stated conditions|solubility curve;soluble salt||Solubility usually changes with temperature.
solvent|溶剂|the liquid that dissolves a solute|water solvent;organic solvent||The solvent is often the larger component of a solution.
solute|溶质|the substance dissolved in a solvent|dissolved solute;solute particles||Solute particles spread through the solvent.
alloy|合金|a mixture containing a metal and other elements|steel alloy;brass alloy||Different-sized atoms make layers harder to slide.
blast furnace|高炉|an industrial furnace used to extract iron from iron ore|iron extraction;blast furnace||Carbon monoxide reduces iron oxide.
slag|炉渣|waste product formed when limestone removes acidic impurities in the blast furnace|calcium silicate;slag formation||Slag floats on molten iron and can be removed.
Haber process|哈伯法|industrial manufacture of ammonia from nitrogen and hydrogen|ammonia synthesis;iron catalyst|N2 + 3H2 reversible 2NH3|Conditions balance rate, yield and cost.
Contact process|接触法|industrial manufacture of sulfuric acid|vanadium(V) oxide;SO3 production||It uses a catalyst and controlled temperature.
fractional distillation|分馏|separation of a mixture into fractions with different boiling ranges|crude oil fractions;fractionating column||Shorter hydrocarbons condense higher in the column.
cracking|裂化|breaking long-chain hydrocarbons into shorter alkanes and alkenes|catalytic cracking;thermal cracking||Cracking increases supply of useful fuels and alkenes.
fuel cell|燃料电池|an electrochemical cell generating electricity from a fuel and oxygen|hydrogen fuel cell;clean energy|2H2 + O2 -> 2H2O|Fuel cells produce electricity continuously if fuel is supplied.
biofuel|生物燃料|a fuel made from recent biological material|ethanol fuel;biodiesel||Biofuels can reduce net carbon emissions but use land.
water treatment|水处理|processes making water suitable for use|filtration;chlorination||Treatment removes solids and kills microbes.
hard water|硬水|water containing dissolved calcium or magnesium ions|temporary hardness;permanent hardness||Hard water forms scale and uses more soap.
soft water|软水|water with low concentration of calcium and magnesium ions|softened water;ion exchange||Soft water lathers easily with soap.
fertiliser runoff|肥料径流|movement of excess fertiliser into waterways|nitrate runoff;eutrophication||Runoff can cause algal blooms.
eutrophication|富营养化|nutrient enrichment of water causing algal growth and oxygen depletion|algal bloom;oxygen depletion||Decomposition of algae uses dissolved oxygen.
polymerisation|聚合反应|joining many monomers to form a polymer|addition polymerisation;condensation polymerisation||Polymer properties depend on monomer structure.
repeat unit|重复单元|the repeating part of a polymer chain|polymer repeat unit;monomer unit||Draw brackets and n for polymer structures.
biodegradable polymer|可生物降解聚合物|a polymer that can be broken down by microorganisms|biodegradable plastic;compostable polymer||Conditions affect degradation rate.
flame test|焰色反应|a qualitative test identifying metal ions from flame colour|sodium flame;lithium flame||Clean the wire loop to avoid contamination.
gas test|气体检验|a chemical test used to identify a gas|limewater test;glowing splint||Use the correct observation for each gas.
limewater|石灰水|aqueous calcium hydroxide used to test for carbon dioxide|limewater turns milky;CO2 test||Milky precipitate indicates carbon dioxide.
    `),
  },
  {
    subject: "economics", topic: "igcse-macro-and-government", label: "IGCSE Economics: Macro & Government",
    stage: "IGCSE",
    note: "用于 IGCSE 宏观政策、生活水平、政府目标、货币与贸易题。",
    example: "Use {word} to explain the macroeconomic effect or policy choice.",
    translation: "用{meaning}解释宏观影响或政策选择。",
    terms: parseTerms(`
standard of living|生活水平|the level of material comfort and wellbeing available to people|living standards;quality of life||It depends on income, services, environment and inequality.
cost of living|生活成本|the amount of money needed to buy basic goods and services|rising cost of living;household budget||Inflation raises cost of living if incomes do not keep up.
consumer price index|消费者价格指数|an index measuring average price changes for a basket of consumer goods and services|CPI;price index||It is used to calculate inflation.
unemployment rate|失业率|percentage of the labour force that is unemployed|jobless rate;labour market||It excludes people not seeking work.
full employment|充分就业|a situation where most people willing and able to work can find jobs|employment objective;labour market||Some frictional unemployment may remain.
economic cycle|经济周期|fluctuations in output around long-term trend growth|boom;recession;recovery||Policy effects depend on the stage of the cycle.
recession|经济衰退|a period of falling real output or very weak economic activity|recession period;negative growth||Recession often raises unemployment.
boom|繁荣|a period of rapid economic growth and high demand|economic boom;high confidence||Booms can create inflationary pressure.
tax revenue|税收收入|money collected by government from taxes|government revenue;tax receipts||It finances public spending.
progressive tax|累进税|a tax taking a higher percentage from higher incomes|progressive income tax;redistribution||It can reduce income inequality.
regressive tax|累退税|a tax taking a larger share from lower incomes|indirect tax burden;regressive effect||Indirect taxes can be regressive.
transfer payment|转移支付|government payment to households without direct production in return|benefits;pension payment||It redistributes income.
subsidy cost|补贴成本|government expenditure required to fund a subsidy|budget cost;opportunity cost||A subsidy uses public funds that could be spent elsewhere.
privatisation|私有化|transfer of assets or services from public to private ownership|state-owned enterprise;sale of assets||It may improve efficiency but reduce public control.
nationalisation|国有化|transfer of private assets or industries into public ownership|state ownership;public control||It may protect strategic services.
monetary authority|货币当局|institution responsible for monetary policy and currency stability|central bank;policy rate||It can influence interest rates and money supply.
money supply|货币供应量|the amount of money circulating in an economy|broad money;liquidity||Increasing money supply can affect inflation and spending.
commercial bank|商业银行|a bank providing services such as deposits loans and payments|bank lending;savings account||Banks help channel savings to borrowers.
credit|信贷|borrowing that allows spending now and repayment later|consumer credit;bank loan||Credit expands spending but creates debt obligations.
savings|储蓄|income not spent on consumption|household saving;savings rate||Savings can finance investment.
investment|投资|spending on capital goods or assets to increase future output or return|business investment;capital formation||In economics, investment is not just buying shares.
exchange control|外汇管制|government restriction on buying or selling foreign currency|currency control;capital restriction||It may protect reserves but distort trade.
free trade|自由贸易|international trade without artificial barriers such as tariffs or quotas|trade liberalisation;open economy||It can lower prices and increase choice.
trade protection|贸易保护|policies limiting imports to protect domestic producers|tariff;quota;subsidy||Protection can support jobs but reduce efficiency.
special drawing rights|特别提款权|international reserve assets created by the IMF|SDR;international liquidity||Useful for advanced development and external finance contexts.
current account deficit|经常账户赤字|a current account balance where payments out exceed receipts in|trade deficit;external deficit||It may require financing from financial inflows.
current account surplus|经常账户盈余|a current account balance where receipts exceed payments out|trade surplus;external surplus||It may reflect strong exports or weak domestic demand.
    `),
  },
  {
    subject: "economics", topic: "business-economics-and-finance", label: "Economics: Business, Money & Finance",
    stage: "AS",
    note: "用于企业经济、货币金融、成本收益和生产者行为题。",
    example: "Use {word} to explain the firm's decision or financial effect.",
    translation: "用{meaning}解释企业决策或金融影响。",
    terms: parseTerms(`
total cost|总成本|all costs of producing a given output|fixed cost plus variable cost;TC|TC = FC + VC|Costs influence supply and profit.
total revenue|总收益|income from selling output|sales revenue;TR|TR = price x quantity|Revenue changes depend on price and quantity.
average revenue|平均收益|revenue per unit sold|AR curve;price|AR = TR / Q|For a single price firm, AR equals price.
profit maximisation|利润最大化|the objective of producing where profit is greatest|MC equals MR;profit objective||In marginal analysis, profit is maximised where MC = MR.
revenue maximisation|收益最大化|the objective of making total revenue as high as possible|sales target;managerial objective||It may differ from profit maximisation.
sales maximisation|销售最大化|the objective of selling as much as possible, often subject to a profit constraint|market share;sales volume||It may support growth or market power.
satisficing|满意化|aiming for acceptable rather than maximum results|managerial objective;bounded rationality||Managers may balance several goals.
principal-agent problem|委托代理问题|conflict when agents make decisions for principals with different objectives|shareholders and managers;agency cost||Incentives and monitoring can reduce it.
retained profit|留存利润|profit kept in a business for reinvestment|internal finance;retained earnings||It avoids interest but may be insufficient.
share capital|股本|funds raised by issuing shares|ordinary shares;equity finance||Issuing shares can dilute ownership.
bond|债券|a debt security paying interest and repaid at maturity|corporate bond;government bond||Bonds are borrowing, not ownership.
liquidity preference|流动性偏好|desire to hold money rather than less liquid assets|money demand;interest rate||Higher interest rates can reduce liquidity preference.
credit creation|信用创造|process by which banks create deposits through lending|bank lending;money multiplier||It depends on reserves and demand for loans.
financial market|金融市场|a market where financial assets are bought and sold|capital market;money market||It channels funds between savers and borrowers.
speculation|投机|buying or selling assets hoping to profit from price changes|currency speculation;asset price||Speculation can increase volatility.
    `),
  },
];

groups.push(...igAlevelThirdExpansionGroups);

const igAlevelFourthExpansionGroups = [
  {
    subject: "computer-science", topic: "systems-software-and-networks", label: "Computer Science: Systems, Software & Networks",
    stage: "A2",
    note: "用于系统软件、网络、操作系统、安全、数据表示和架构题。",
    example: "Use {word} to explain the system behaviour or security decision.",
    translation: "用{meaning}解释系统行为或安全决策。",
    terms: parseTerms(`
operating system|操作系统|system software managing hardware resources and providing services for programs|OS;resource management||It manages memory, files, processes and devices.
kernel|内核|the core part of an operating system controlling hardware and system resources|OS kernel;system call||User programs access hardware through kernel services.
process|进程|a program in execution with its own resources and state|process scheduling;process control block||A process differs from a program stored on disk.
thread|线程|a smaller execution unit within a process|multithreading;thread scheduling||Threads share process memory.
interrupt|中断|a signal causing the CPU to pause current execution and handle an event|hardware interrupt;interrupt service routine||Interrupts allow responsive I/O handling.
scheduling|调度|deciding which process or task should use the CPU next|round-robin scheduling;priority scheduling||Scheduling balances fairness and responsiveness.
virtual memory|虚拟内存|memory management using secondary storage to extend apparent main memory|paging;swap space||Too much swapping reduces performance.
page fault|缺页中断|an event when a required memory page is not in RAM|virtual memory;page table||The OS loads the page from secondary storage.
file system|文件系统|the method an operating system uses to store and organise files|directory;file allocation||It manages names, metadata and storage blocks.
device driver|设备驱动|software allowing the operating system to communicate with hardware|printer driver;graphics driver||Drivers translate OS requests into device commands.
utility software|实用程序软件|software performing maintenance or support tasks|backup utility;disk compression||Utilities help manage system resources.
embedded system|嵌入式系统|a computer system built into a larger device for a specific task|microcontroller;firmware||It often has limited resources and real-time constraints.
real-time system|实时系统|a system that must respond within strict time limits|hard real time;control system||Late responses can be unacceptable.
client-server model|客户端-服务器模型|network model where clients request services from servers|web server;client request||Servers centralise resources and control.
peer-to-peer network|点对点网络|network where nodes can act as both clients and servers|P2P sharing;distributed network||It can avoid a central server.
DNS|域名系统|a system translating domain names into IP addresses|DNS lookup;domain name||It lets users use names instead of numeric addresses.
TCP|传输控制协议|a protocol providing reliable ordered data delivery|TCP connection;acknowledgement||TCP uses acknowledgements and retransmission.
UDP|用户数据报协议|a protocol sending datagrams without guaranteed delivery|UDP packet;low latency||It is useful when speed matters more than reliability.
HTTP|超文本传输协议|a protocol used for transferring web pages and resources|HTTP request;HTTP response||HTTPS adds encryption.
TLS|传输层安全|a protocol providing encrypted and authenticated communication|TLS certificate;secure connection||It protects data in transit.
router|路由器|a device forwarding packets between networks|routing table;gateway||Routers choose paths for packets.
switch|交换机|a network device forwarding frames within a local network|MAC address;Ethernet switch||Switches reduce unnecessary traffic compared with hubs.
MAC address|MAC 地址|a hardware address identifying a network interface on a local network|Ethernet address;network adapter||It is used at the data-link layer.
subnet mask|子网掩码|a value separating network and host parts of an IP address|subnetting;network prefix||It helps determine whether a destination is local.
authentication|身份认证|checking that a user or system is who it claims to be|password authentication;multi-factor authentication||Authentication differs from authorisation.
authorisation|授权|deciding what an authenticated user is allowed to access|access rights;permission||Least privilege reduces risk.
hashing|哈希|transforming data into a fixed-size digest using a hash function|password hash;hash digest||Good hashes are one-way and collision-resistant.
salting|加盐|adding random data before hashing a password|salt value;password storage||Salts prevent identical passwords producing identical hashes.
digital certificate|数字证书|electronic document binding a public key to an identity|certificate authority;TLS certificate||Browsers use certificates to verify sites.
public key encryption|公钥加密|encryption using a public key and a separate private key|asymmetric encryption;key pair||It supports secure exchange and digital signatures.
symmetric encryption|对称加密|encryption where the same key encrypts and decrypts data|shared secret;AES||Key distribution is the main challenge.
denial-of-service attack|拒绝服务攻击|an attack that overwhelms a system to make it unavailable|DDoS;traffic flood||Rate limiting and filtering can reduce impact.
social engineering|社会工程攻击|manipulating people into revealing information or taking unsafe action|pretexting;phishing||Human behaviour is the target.
penetration testing|渗透测试|authorised testing of systems to find security weaknesses|ethical hacking;security audit||It must be controlled and documented.
    `),
  },
  {
    subject: "computer-science", topic: "programming-and-data", label: "Computer Science: Programming & Data",
    stage: "AS",
    note: "用于编程语言、算法、数据结构、测试和软件工程题。",
    example: "Use {word} to design, trace or test the program.",
    translation: "用{meaning}设计、追踪或测试程序。",
    terms: parseTerms(`
syntax error|语法错误|an error caused by breaking the grammar rules of a programming language|compiler error;syntax check||The program may not run until it is fixed.
logic error|逻辑错误|an error where code runs but produces the wrong result|wrong condition;incorrect formula||Testing with expected outputs helps find it.
runtime error|运行时错误|an error occurring while a program is executing|division by zero;file not found||Exception handling can manage some runtime errors.
exception handling|异常处理|code that responds to runtime errors in a controlled way|try catch;error handler||It prevents uncontrolled program termination.
parameter|参数|a value passed into a function or procedure|formal parameter;argument||Parameters make subprograms reusable.
return value|返回值|the value sent back by a function after execution|function result;return statement||Procedures may not return a value.
scope|作用域|the part of a program where a variable can be accessed|local variable;global variable||Limited scope reduces accidental changes.
local variable|局部变量|a variable accessible only within a subprogram or block|local scope;temporary value||It is often created when the subprogram runs.
global variable|全局变量|a variable accessible throughout much of a program|global scope;shared state||Global variables can make bugs harder to trace.
record|记录|a data structure containing fields of different types|record type;field||Records group related data.
file handling|文件处理|reading from and writing to files in a program|open file;read write||Close files after use.
sequential file|顺序文件|a file read from beginning to end in order|sequential access;text file||It is simple but slower for random lookup.
random access file|随机访问文件|a file allowing direct access to records without reading earlier records|direct access;record number||It is useful for large structured files.
test data|测试数据|input values chosen to check whether a program works correctly|normal data;boundary data||Use normal, abnormal and extreme data.
boundary data|边界数据|test values at the edge of acceptable ranges|boundary value;limit test||Boundary cases often reveal off-by-one errors.
dry run|人工跟踪|manual tracing of an algorithm using a trace table|trace table;desk check||It shows changes to variables step by step.
trace table|跟踪表|a table recording variable values during algorithm execution|dry run;iteration values||It helps find logic errors.
modular programming|模块化编程|designing software as separate reusable units|module;subprogram||It improves testing and maintenance.
library routine|库函数|prewritten code that can be reused by programs|standard library;function call||Using libraries saves development time.
API|应用程序接口|a defined interface through which software components communicate|API request;endpoint||APIs specify inputs, outputs and behaviour.
JSON|JSON 数据格式|a text format for structured data using objects and arrays|JSON object;key-value pair||It is common in web APIs.
CSV|CSV 文件|a text file format storing table rows with comma-separated values|CSV row;spreadsheet import||Quoted fields may contain commas.
    `),
  },
  {
    subject: "business", topic: "finance-marketing-operations", label: "Business: Finance, Marketing & Operations",
    stage: "AS",
    note: "用于商务财务、营销、运营、HR 和战略评价题。",
    example: "Use {word} to interpret the case evidence and business result.",
    translation: "用{meaning}解释案例证据和商业结果。",
    terms: parseTerms(`
cash-flow forecast|现金流预测|a prediction of cash inflows and outflows over future periods|cash-flow statement;closing balance||It helps identify future cash shortages.
opening balance|期初余额|cash available at the start of a period|opening cash balance;forecast||It becomes part of cash available.
closing balance|期末余额|cash remaining at the end of a period|closing cash balance;net cash flow||It may become the next period's opening balance.
net cash flow|净现金流|cash inflows minus cash outflows for a period|monthly net cash flow;cash surplus|net cash flow = inflows - outflows|Positive net cash flow increases cash balance.
contribution per unit|单位贡献|selling price minus variable cost per unit|contribution;break-even analysis|contribution = price - variable cost|Contribution pays fixed costs then profit.
margin of safety|安全边际|the amount by which sales exceed break-even output|break-even margin;sales risk|margin of safety = actual output - break-even output|A larger margin reduces risk of loss.
gross profit margin|毛利率|gross profit as a percentage of sales revenue|gross margin;profitability|gross profit margin = gross profit / revenue x 100|It reflects cost of sales control.
net profit margin|净利率|net profit as a percentage of sales revenue|net margin;profitability ratio|net profit margin = net profit / revenue x 100|It reflects expense control and pricing.
market share|市场份额|a firm's sales as a percentage of total market sales|market share growth;competitive position|market share = firm sales / market sales x 100|It measures relative market position.
product differentiation|产品差异化|making a product distinct from competitors' products|unique selling point;brand image||It can reduce price competition.
price skimming|撇脂定价|setting a high initial price for a new product|launch price;premium segment||It works best when demand is less price sensitive.
penetration pricing|渗透定价|setting a low initial price to enter a market or gain share|low launch price;market entry||It can build volume but reduce margins.
promotion|促销|communication intended to persuade customers to buy|advertising;sales promotion||Promotion should match target market.
distribution channel|分销渠道|the route a product takes from producer to customer|retailer;online channel||Channel choice affects cost and reach.
lean production|精益生产|reducing waste and improving efficiency in operations|just-in-time;kaizen||Lean methods need reliable suppliers.
just-in-time inventory|准时制库存|holding minimal stock and receiving supplies when needed|JIT;stock control||It lowers storage costs but increases supply disruption risk.
kaizen|持续改进|continuous small improvements involving employees|quality circles;lean improvement||It can raise productivity and motivation.
capacity utilisation|产能利用率|actual output as a percentage of maximum possible output|factory capacity;utilisation rate|capacity utilisation = actual output / capacity x 100|Very high utilisation may reduce flexibility.
job production|单件生产|making one-off products to customer requirements|custom production;bespoke product||It is flexible but often expensive.
batch production|批量生产|making a quantity of one product before switching to another|batch size;production run||It balances flexibility and economies.
flow production|流水线生产|continuous production of standardised products|assembly line;mass production||It can reduce unit costs but is inflexible.
recruitment|招聘|process of attracting and selecting employees|job advert;selection process||Good recruitment matches skills to job needs.
training|培训|developing employee skills and knowledge|on-the-job training;off-the-job training||Training can raise productivity and quality.
appraisal|绩效评估|formal review of employee performance|performance appraisal;targets||It can identify training needs.
labour turnover|员工流失率|rate at which employees leave a business|staff turnover;retention|labour turnover = leavers / employees x 100|High turnover raises recruitment cost.
span of control|管理幅度|number of subordinates directly managed by one manager|wide span;narrow span||It affects communication and supervision.
chain of command|指挥链|the route through which authority and communication pass|hierarchy;authority line||Long chains can slow communication.
centralisation|集权|decision-making concentrated at the top of an organisation|centralised control;head office||It can ensure consistency but reduce local responsiveness.
decentralisation|分权|decision-making delegated to lower levels or local units|local autonomy;delegated authority||It can motivate staff and improve speed.
    `),
  },
  {
    subject: "business", topic: "strategy-and-enterprise", label: "Business: Strategy & Enterprise",
    stage: "A2",
    note: "用于 A-Level Business 战略、外部环境、增长和评价题。",
    example: "Use {word} to evaluate strategic choices and constraints.",
    translation: "用{meaning}评价战略选择和限制条件。",
    terms: parseTerms(`
SWOT analysis|SWOT 分析|analysis of strengths weaknesses opportunities and threats|strategic analysis;internal external factors||Strengths and weaknesses are internal; opportunities and threats are external.
PEST analysis|PEST 分析|analysis of political economic social and technological external factors|external environment;PESTLE||It helps assess business context.
mission statement|使命宣言|a statement of a business's overall purpose and values|corporate mission;strategic purpose||It can guide culture and strategy.
corporate objective|公司总体目标|a long-term target for the whole organisation|strategic objective;growth target||Objectives should support strategy.
organic growth|内生增长|business growth using internal resources and existing operations|internal growth;new outlets||It is usually slower but lower risk than takeovers.
external growth|外部增长|business growth through merger or takeover|acquisition;merger||It can be fast but integration risk is high.
merger|合并|combining two businesses into one organisation|horizontal merger;vertical merger||Mergers can create economies of scale.
takeover|收购|one business gaining control of another|hostile takeover;acquisition||Takeovers may face resistance.
franchise|特许经营|a business arrangement where a franchisee uses the franchisor's brand and system|franchise agreement;royalty||It supports expansion with lower capital needs.
economies of scope|范围经济|cost savings from producing a range of related products|shared resources;product range||It differs from economies of scale.
corporate social responsibility|企业社会责任|business consideration of social and environmental effects beyond legal requirements|CSR policy;ethical business||CSR can affect reputation and cost.
ethical decision|伦理决策|a business decision considering moral principles and stakeholder welfare|ethical sourcing;fair trade||Ethics can conflict with short-term profit.
risk management|风险管理|identifying assessing and reducing threats to business objectives|risk assessment;contingency plan||Risk cannot usually be eliminated completely.
contingency planning|应急计划|preparing actions for possible future problems|backup plan;business continuity||It reduces disruption when events occur.
decision tree|决策树|a diagram showing options, probabilities, outcomes and expected values|expected monetary value;decision node||Expected value is not guaranteed outcome.
critical success factor|关键成功因素|an area that must perform well for a strategy to succeed|CSF;strategic target||It focuses management attention.
benchmarking|标杆管理|comparing performance with competitors or best practice|performance benchmark;industry standard||It can reveal improvement targets.
outsourcing|外包|contracting another organisation to perform a business activity|external supplier;outsourced service||It may reduce cost but reduce control.
offshoring|离岸外包|moving business activity to another country|overseas production;cost reduction||It can lower labour cost but increase coordination risk.
    `),
  },
  {
    subject: "geography", topic: "physical-geography-and-hazards", label: "Geography: Physical Systems & Hazards",
    stage: "AS",
    note: "用于自然地理、气候、水文、板块和灾害管理题。",
    example: "Use {word} to explain the physical process or hazard impact.",
    translation: "用{meaning}解释自然过程或灾害影响。",
    terms: parseTerms(`
drainage basin|流域|the area of land drained by a river and its tributaries|river basin;watershed||It is an open system with inputs, stores, transfers and outputs.
watershed|分水岭|the boundary separating neighbouring drainage basins|basin divide;high ground||Water flows into different basins on different sides.
hydrograph|水文过程线|a graph showing river discharge over time after rainfall|storm hydrograph;lag time||Urbanisation can shorten lag time and increase peak discharge.
lag time|滞后时间|time between peak rainfall and peak river discharge|hydrograph lag;flood response||Short lag time increases flood risk.
peak discharge|洪峰流量|maximum river discharge during a flood event|flood peak;hydrograph||It depends on rainfall, land use and basin shape.
infiltration|下渗|movement of water from the surface into soil|infiltration rate;soil permeability||Impermeable surfaces reduce infiltration.
throughflow|壤中流|movement of water sideways through soil|subsurface flow;hillslope hydrology||Throughflow is slower than overland flow.
groundwater flow|地下水流|movement of water through saturated rock or sediment|aquifer;water table||It is usually slow.
carbon sink|碳汇|a store that absorbs more carbon than it releases|forest carbon sink;ocean sink||Deforestation can reduce sink capacity.
albedo|反照率|proportion of incoming radiation reflected by a surface|ice albedo;urban albedo||Lower albedo increases absorption.
greenhouse effect|温室效应|warming caused by greenhouse gases absorbing outgoing infrared radiation|enhanced greenhouse effect;radiative balance||It is natural but strengthened by human emissions.
climate mitigation|气候减缓|actions reducing greenhouse gas emissions or enhancing sinks|renewable energy;carbon capture||Mitigation tackles causes of climate change.
climate adaptation|气候适应|actions reducing vulnerability to climate impacts|flood defences;drought-resistant crops||Adaptation manages effects rather than causes.
hazard risk|灾害风险|probability and severity of harm from a hazard|vulnerability;exposure||Risk depends on hazard, vulnerability and capacity.
vulnerability|脆弱性|susceptibility of people or places to harm|social vulnerability;poverty||High vulnerability increases disaster impact.
resilience|韧性|ability to withstand and recover from disturbance|community resilience;infrastructure resilience||Preparedness can increase resilience.
liquefaction|液化|loss of soil strength during shaking when saturated sediment behaves like liquid|earthquake liquefaction;ground failure||It damages buildings and infrastructure.
tsunami|海啸|large sea waves usually caused by undersea earthquakes or landslides|tsunami warning;coastal hazard||Deep-water waves slow and grow near shore.
pyroclastic flow|火山碎屑流|fast hot flow of gas ash and rock from a volcano|volcanic hazard;ash flow||It is extremely dangerous because of speed and temperature.
lahar|火山泥流|mudflow of volcanic ash and water|volcanic slope;river valley||Lahars can travel far along valleys.
    `),
  },
  {
    subject: "geography", topic: "human-geography-development", label: "Geography: Human Systems & Development",
    stage: "A2",
    note: "用于人口、城市、发展、全球化、资源和治理题。",
    example: "Use {word} to analyse the human geography pattern or case study.",
    translation: "用{meaning}分析人文地理分布或案例。",
    terms: parseTerms(`
demographic transition model|人口转变模型|a model showing changes in birth and death rates as development changes|DTM stage;population change||It is a model and not every country follows it exactly.
dependency ratio|抚养比|ratio of dependent population to working-age population|youth dependency;old-age dependency||High dependency can pressure services and workers.
population pyramid|人口金字塔|a graph showing age and sex structure of a population|age-sex structure;population profile||Shape reveals growth, ageing and migration patterns.
ageing population|人口老龄化|an increasing proportion of older people in a population|elderly dependency;pension pressure||It affects healthcare, labour supply and public spending.
megacity|特大城市|a city with more than ten million people|urban growth;megacity region||Megacities can create opportunities and management challenges.
urban sprawl|城市蔓延|spread of low-density urban development outward from a city|suburban growth;land-use change||It can increase car dependence and habitat loss.
counter-urbanisation|逆城市化|movement of people from urban areas to rural areas|rural migration;quality of life||It can be driven by housing cost, environment or remote work.
gentrification|绅士化|neighbourhood change involving wealthier residents and rising property values|urban renewal;displacement||It can improve investment but displace lower-income residents.
informal economy|非正规经济|economic activity outside formal regulation or taxation|street vending;informal work||It provides income but lacks protection.
core-periphery model|核心-边缘模型|a model showing unequal development between dominant core areas and dependent peripheries|regional inequality;dependency||It explains spatial economic imbalance.
global supply chain|全球供应链|a network of production and distribution across countries|outsourcing;manufacturing chain||Disruption in one place can affect many regions.
resource security|资源安全|reliable access to necessary resources at affordable prices|energy security;water security||Security depends on supply, demand and geopolitics.
water scarcity|水资源短缺|insufficient water availability to meet demand|physical scarcity;economic scarcity||It can result from climate, overuse or poor infrastructure.
food security|粮食安全|reliable access to sufficient safe and nutritious food|food supply;malnutrition||It depends on availability, access, utilisation and stability.
ecological footprint|生态足迹|measure of human demand on ecosystems|resource consumption;biocapacity||High footprint may exceed sustainable limits.
aid|援助|resources transferred to support development or disaster response|bilateral aid;multilateral aid||Aid effectiveness depends on governance and targeting.
debt crisis|债务危机|a situation where debt repayment becomes unsustainable|sovereign debt;debt servicing||It can limit spending on development.
trade bloc|贸易集团|a group of countries reducing trade barriers between members|regional integration;customs union||It can create trade creation and trade diversion.
    `),
  },
  {
    subject: "accounting", topic: "financial-statements-and-control", label: "Accounting: Statements & Control",
    stage: "AS",
    note: "用于会计报表、控制账户、合伙、公司会计和错误更正题。",
    example: "Use {word} to prepare the account or explain the adjustment.",
    translation: "用{meaning}编制账户或解释调整。",
    terms: parseTerms(`
control account|控制账户|a summary ledger account checking many individual accounts|sales ledger control;purchases ledger control||It helps detect errors in subsidiary ledgers.
sales ledger|销售分类账|ledger containing accounts of credit customers|trade receivables;customer account||It records amounts owed by customers.
purchases ledger|采购分类账|ledger containing accounts of credit suppliers|trade payables;supplier account||It records amounts owed to suppliers.
suspense account|暂记账户|a temporary account used when trial balance does not agree|error correction;suspense balance||It is cleared after errors are corrected.
error of omission|遗漏错误|a transaction completely left out of the accounts|bookkeeping error;omitted entry||The trial balance may still agree.
error of commission|记错账户错误|entry made in the wrong account of the same class|wrong customer account;commission error||The trial balance may still agree.
error of principle|原则性错误|entry recorded in the wrong class of account|capital as expense;principle error||It breaks accounting classification.
compensating error|抵消错误|two or more errors whose effects cancel in the trial balance|trial balance agrees;hidden error||Agreement does not guarantee accuracy.
depreciation charge|折旧费用|periodic expense allocating non-current asset cost|annual depreciation;income statement||It reduces profit but not cash immediately.
accumulated depreciation|累计折旧|total depreciation charged on an asset to date|contra asset;carrying amount||It is deducted from cost in the statement of financial position.
carrying amount|账面价值|asset cost minus accumulated depreciation|net book value;carrying value||It is not necessarily market value.
disposal account|处置账户|account used to calculate gain or loss on sale of a non-current asset|asset disposal;profit on disposal||Transfer cost and accumulated depreciation before sale proceeds.
partnership appropriation account|合伙利润分配账户|account showing how partnership profit is shared|partner salary;interest on capital||It allocates profit after net profit is calculated.
interest on capital|资本利息|an appropriation rewarding partners for capital contributed|partner capital;appropriation||It is not a business expense.
interest on drawings|提款利息|an amount charged to partners for drawings|partner drawings;appropriation||It increases profit available for sharing.
goodwill|商誉|intangible value of a business above identifiable net assets|partnership admission;business reputation||Goodwill may be adjusted when partners change.
share premium|股票溢价|amount received from issuing shares above nominal value|share issue;equity reserve||It is part of equity, not income.
ordinary shares|普通股|equity shares giving ownership and voting rights|share capital;dividend||Dividends are not guaranteed.
debenture|债券；公司债|long-term loan raised by a company|loan capital;interest payable||Interest is payable before dividends.
statement of cash flows|现金流量表|a statement summarising cash inflows and outflows by activity|operating cash flow;investing activity||It explains changes in cash, not profit.
    `),
  },
  {
    subject: "accounting", topic: "costing-and-decision-making", label: "Accounting: Costing & Decision Making",
    stage: "A2",
    note: "用于成本会计、预算、差异分析和管理决策题。",
    example: "Use {word} to support the management accounting decision.",
    translation: "用{meaning}支持管理会计决策。",
    terms: parseTerms(`
direct cost|直接成本|a cost traced directly to a product or job|direct material;direct labour||Direct costs form prime cost.
indirect cost|间接成本|a cost not directly traced to one product or job|overhead cost;factory rent||Indirect costs are absorbed or allocated.
overhead|制造费用|indirect production cost|production overhead;absorbed overhead||Overheads must be included in full costing.
prime cost|主要成本|total direct cost of production|direct material plus direct labour;prime cost||It excludes overhead.
absorption costing|完全成本法|costing method assigning direct costs and overheads to units|overhead absorption;full cost||It values inventory including production overhead.
marginal costing|边际成本法|costing method focusing on variable cost and contribution|contribution analysis;decision making||Fixed costs are treated as period costs.
variance analysis|差异分析|comparison of actual results with budgeted or standard results|favourable variance;adverse variance||Variances need investigation, not just calculation.
budget|预算|a financial plan for a future period|sales budget;cash budget||Budgets support planning and control.
flexible budget|弹性预算|a budget adjusted for actual activity level|flexed budget;variance analysis||It makes comparison fairer.
standard cost|标准成本|planned cost per unit under expected efficient conditions|standard costing;cost control||Standards provide benchmarks.
break-even analysis|盈亏平衡分析|analysis of output, cost and revenue where profit is zero|contribution;break-even chart||It assumes linear costs and revenues.
limiting factor analysis|限制因素分析|choosing output mix when a scarce resource limits production|contribution per limiting factor;scarce resource||Maximise contribution per unit of limiting factor.
make-or-buy decision|自制或外购决策|decision whether to produce internally or purchase externally|relevant cost;outsourcing||Only relevant costs should be compared.
relevant cost|相关成本|future cost that changes because of a decision|avoidable cost;opportunity cost||Sunk costs are not relevant.
sunk cost|沉没成本|a past cost that cannot be recovered and should not affect decisions|past expenditure;irrelevant cost||Ignore sunk costs in decision making.
opportunity cost|机会成本|benefit lost by choosing one option instead of the next best alternative|scarce resource;decision cost||It may not appear in accounting records.
    `),
  },
  {
    subject: "psychology", topic: "research-methods-and-statistics", label: "Psychology: Research Methods & Statistics",
    stage: "AS",
    note: "用于心理学研究设计、统计、伦理和证据评价题。",
    example: "Use {word} to evaluate the research design or data.",
    translation: "用{meaning}评价研究设计或数据。",
    terms: parseTerms(`
laboratory experiment|实验室实验|an experiment conducted in a controlled artificial setting|lab experiment;controlled condition||It improves control but may reduce ecological validity.
field experiment|现场实验|an experiment conducted in a real-world setting|field setting;natural environment||It improves realism but reduces control.
natural experiment|自然实验|a study where the independent variable occurs naturally rather than being manipulated|naturally occurring IV;quasi-experiment||Random allocation is usually not possible.
correlational study|相关研究|a study measuring the relationship between variables without manipulation|correlation coefficient;association||Correlation does not prove causation.
case study|个案研究|an in-depth study of one individual, group or event|detailed qualitative data;unique case||It gives depth but limited generalisability.
observation|观察法|research method recording behaviour as it occurs|naturalistic observation;structured observation||Observers need clear behaviour categories.
self-report|自陈法|method where participants report their own thoughts, feelings or behaviour|questionnaire;interview||Responses may be affected by social desirability.
questionnaire|问卷|a set of written questions used to collect self-report data|closed question;open question||Question wording can bias responses.
interview|访谈|a spoken self-report method collecting participant responses|structured interview;semi-structured interview||Interviews can gather rich data but risk interviewer bias.
standardisation|标准化|keeping procedures the same for all participants|standardised instructions;replication||It improves reliability.
counterbalancing|顺序平衡|varying condition order to control order effects|order effect;repeated measures||It reduces practice or fatigue effects.
independent measures design|独立组设计|different participants are used in each experimental condition|between-subjects design;group comparison||Participant variables may affect results.
repeated measures design|重复测量设计|the same participants take part in every condition|within-subjects design;order effect||It controls participant variables but can create order effects.
matched pairs design|配对设计|participants are paired on relevant variables before allocation|matched participants;pairing variable||It balances participant variables.
ecological validity|生态效度|extent to which findings apply to real-life settings|realism;natural behaviour||Artificial tasks may reduce it.
generalisability|可推广性|extent to which findings apply beyond the sample and setting|population validity;sample bias||Representative samples increase generalisability.
social desirability bias|社会期许偏差|tendency to give answers that seem acceptable or favourable|self-report bias;demand characteristics||It can distort questionnaire data.
inter-rater reliability|评分者间信度|agreement between different observers or raters|observer agreement;coding reliability||Clear categories improve it.
content analysis|内容分析|systematic coding and interpretation of communication or media|coding categories;qualitative data||Categories must be reliable and valid.
descriptive statistics|描述统计|statistics summarising data patterns|mean median mode;range||They describe data but do not test significance.
inferential statistics|推断统计|statistics used to judge whether results are likely due to chance|significance test;p-value||Test choice depends on data and design.
    `),
  },
  {
    subject: "psychology", topic: "cognition-social-and-biological", label: "Psychology: Cognition, Social & Biological",
    stage: "A2",
    note: "用于认知、社会、生物、发展和临床心理学关键词。",
    example: "Use {word} to explain behaviour using psychological evidence.",
    translation: "用{meaning}结合心理学证据解释行为。",
    terms: parseTerms(`
schema|图式|a mental framework organising knowledge and expectations|memory schema;cognitive framework||Schemas can influence recall and perception.
encoding|编码|converting information into a form that can be stored in memory|acoustic encoding;semantic encoding||Different memory stores may encode differently.
retrieval|提取|accessing stored information from memory|retrieval cue;recall||Cues can improve retrieval.
working memory|工作记忆|a limited-capacity system for temporary processing and storage of information|central executive;phonological loop||It is active, not just short-term storage.
cognitive load|认知负荷|amount of mental effort required by a task|working-memory load;task difficulty||High load can reduce performance.
social identity|社会认同|part of self-concept based on group membership|in-group;out-group||It can influence prejudice and conformity.
minority influence|少数派影响|social influence where a smaller group changes majority views|consistency;commitment||Consistency and flexibility increase influence.
deindividuation|去个体化|reduced self-awareness and restraint in a group|crowd behaviour;anonymity||It can increase impulsive behaviour.
attribution|归因|explanation people give for causes of behaviour|internal attribution;external attribution||Attribution bias can affect judgement.
fundamental attribution error|基本归因错误|tendency to overemphasise dispositional causes and underemphasise situational causes|dispositional attribution;situation||It is common when judging others.
neuron|神经元|a nerve cell transmitting signals in the nervous system|axon;dendrite||Neurons communicate electrically and chemically.
neurotransmitter|神经递质|a chemical messenger transmitting signals across synapses|dopamine;serotonin||Imbalance may be linked with disorders.
localisation of function|功能定位|idea that specific brain areas have specific roles|Broca area;visual cortex||Brain functions can be specialised but connected.
plasticity|可塑性|the brain's ability to change structure or function|neural plasticity;recovery||Plasticity supports learning and recovery.
fight-or-flight response|战斗或逃跑反应|physiological arousal response to threat|adrenaline;sympathetic nervous system||It prepares the body for action.
attachment type|依恋类型|classification of infant-caregiver attachment pattern|secure attachment;insecure attachment||Attachment is assessed through behaviour patterns.
mental disorder|心理障碍|a pattern of thoughts feelings or behaviour causing distress or impairment|diagnosis;symptom||Diagnosis depends on criteria and context.
cognitive behavioural therapy|认知行为疗法|therapy aiming to change unhelpful thoughts and behaviours|CBT;cognitive restructuring||It links thoughts, feelings and behaviour.
    `),
  },
];

groups.push(...igAlevelFourthExpansionGroups);

const igAlevelFifthExpansionGroups = [
  {
    subject: "business", topic: "people-and-customer-strategy", label: "Business: People & Customer Strategy",
    stage: "AS",
    note: "用于 HR、客户、服务、品牌和企业文化题。",
    example: "Use {word} to explain the people or customer decision.",
    translation: "用{meaning}解释人员或客户决策。",
    terms: parseTerms(`
human resource management|人力资源管理|managing recruitment, training, motivation and employee relations|HRM;workforce planning||Effective HR supports productivity and retention.
workforce planning|劳动力规划|ensuring a business has the right number and type of employees|labour demand;skills gap||It responds to growth, technology and turnover.
job description|职位描述|a document listing duties and responsibilities of a job|job role;recruitment document||It helps applicants understand the role.
person specification|任职要求|a document listing qualifications, skills and qualities needed for a job|selection criteria;candidate profile||It supports fair selection.
induction training|入职培训|training introducing new employees to the business and job|new employee;orientation||It can reduce early mistakes and anxiety.
remuneration|薪酬|financial rewards paid to employees for work|pay package;salary and benefits||It affects motivation and recruitment.
piece rate|计件工资|payment based on the number of units produced|output pay;incentive wage||It may increase output but risk lower quality.
salary|薪水|fixed regular payment usually expressed annually|monthly salary;fixed pay||It gives income stability.
fringe benefit|附加福利|non-wage benefit provided to employees|company car;pension benefit||Benefits can aid retention.
empowerment|员工授权|giving employees more authority and responsibility|employee involvement;decision authority||It may improve motivation and responsiveness.
teamworking|团队合作|employees working together to complete tasks or solve problems|project team;collaboration||It can improve ideas but needs coordination.
customer service|客户服务|support and treatment provided before during and after purchase|service quality;customer satisfaction||Good service can build loyalty.
customer retention|客户留存|keeping existing customers over time|repeat customers;loyalty programme||Retention is often cheaper than acquiring new customers.
customer relationship management|客户关系管理|using processes and data to manage customer interactions|CRM system;customer data||CRM supports targeted service and marketing.
brand image|品牌形象|customers' perceptions of a brand|brand reputation;premium image||Image affects pricing power.
unique selling point|独特卖点|a feature that makes a product different from competitors|USP;product differentiation||A clear USP can support promotion.
public relations|公共关系|managing communication and reputation with the public|PR campaign;media relations||PR can influence stakeholder trust.
e-commerce|电子商务|buying and selling goods or services online|online store;digital sales||It expands reach but increases online competition.
    `),
  },
  {
    subject: "geography", topic: "fieldwork-and-skills", label: "Geography: Fieldwork & Skills",
    stage: "IGCSE",
    note: "用于地理实地调查、地图技能、数据处理和图表题。",
    example: "Use {word} to collect, present or evaluate geographical evidence.",
    translation: "用{meaning}收集、呈现或评价地理证据。",
    terms: parseTerms(`
fieldwork|实地调查|collection of primary geographical data outside the classroom|fieldwork method;site visit||Fieldwork links theory to real places.
primary data|一手数据|data collected first-hand by the investigator|field measurements;questionnaire data||It is specific to the investigation.
secondary data|二手数据|data collected by someone else for another purpose|census data;published statistics||Check reliability and date.
transect|样带|a line along which data is collected at intervals|line transect;belt transect||Transects show change across a gradient.
quadrat|样方|a square frame used for sampling organisms or ground cover|random quadrat;percentage cover||Quadrats help estimate distribution.
systematic sampling|系统抽样|sampling at regular intervals or using a fixed pattern|sampling interval;transect points||It can reveal spatial change.
stratified sampling|分层抽样|sampling that represents different subgroups or areas proportionally|strata;representative sample||It improves coverage of varied populations.
risk assessment|风险评估|identifying hazards and precautions before fieldwork|fieldwork safety;hazard control||It protects participants during data collection.
pilot study|试点研究|a small trial of methods before main data collection|method test;pilot survey||It helps refine questions and equipment.
map scale|地图比例尺|relationship between distance on a map and actual distance|linear scale;representative fraction||Use consistent units when converting.
contour line|等高线|a line joining points of equal elevation on a map|contour interval;relief||Close contours show steep slopes.
grid reference|网格坐标|a map reference locating a place using grid lines|four-figure reference;six-figure reference||Read eastings before northings.
cross-section|剖面图|a side view showing elevation along a line|river valley profile;topographic section||Use vertical scale carefully.
annotated photograph|标注照片|a photograph with labels and notes explaining geographical features|field sketch;photo annotation||Annotations should explain, not just name.
field sketch|野外素描|a simplified drawing recording key landscape features|labelled sketch;observation||It should be selective and clear.
data presentation|数据呈现|choosing a graph, map or table to show collected data|bar chart;choropleth map||Choose a method that matches data type.
choropleth map|分级设色图|a map shading areas according to data values|population density map;class interval||Use rates or densities rather than raw totals when appropriate.
proportional symbol map|比例符号图|a map using symbol size to represent data values|circle symbol;spatial pattern||Large symbols can overlap in dense areas.
    `),
  },
  {
    subject: "accounting", topic: "accounting-principles-and-interpretation", label: "Accounting: Principles & Interpretation",
    stage: "IGCSE",
    note: "用于会计原则、比率解释、账簿和报表评价题。",
    example: "Use {word} to explain the accounting treatment or ratio.",
    translation: "用{meaning}解释会计处理或比率。",
    terms: parseTerms(`
business entity principle|会计主体原则|the principle that business records are separate from the owner's personal affairs|separate entity;owner transactions||Drawings are recorded separately from expenses.
going concern principle|持续经营原则|the assumption that a business will continue operating for the foreseeable future|asset valuation;continuity||It affects how assets are valued.
prudence principle|谨慎性原则|the principle of not overstating assets or profits and recognising possible losses|doubtful debts;inventory valuation||It supports conservative reporting.
matching principle|配比原则|matching income with expenses incurred to earn it in the same period|accruals concept;period profit||Accruals and prepayments apply this principle.
consistency principle|一致性原则|using the same accounting methods from period to period|depreciation method;comparability||Changes should be justified.
materiality|重要性|the significance of an item to users' decisions|material error;immaterial item||Small items may be treated pragmatically.
realisation principle|实现原则|recognising revenue when it is earned, not necessarily when cash is received|credit sale;revenue recognition||It separates sales from cash collection.
accounting equation|会计等式|the relationship between assets, liabilities and capital|balance sheet equation;owner equity|assets = capital + liabilities|Every transaction keeps the equation balanced.
source document|原始凭证|original evidence of a transaction|invoice;receipt;credit note||Source documents support accounting entries.
invoice|发票|a document requesting payment for goods or services supplied|sales invoice;purchase invoice||Invoices record credit transactions.
credit note|贷项通知单|a document reducing the amount owed on an invoice|sales return;purchase return||It corrects returns or allowances.
petty cash|备用金|small cash fund for minor expenses|imprest system;petty-cash voucher||It reduces small bank transactions.
imprest system|定额备用金制度|petty cash system restoring the fund to a fixed amount|petty cash reimbursement;cash control||Reimbursement equals payments made.
bank overdraft|银行透支|a negative bank balance caused by withdrawing more than available|short-term finance;current liability||It is usually a current liability.
trade receivable|应收账款|a customer who owes money for credit sales|accounts receivable;debtor||Receivables are current assets.
trade payable|应付账款|a supplier owed money for credit purchases|accounts payable;creditor||Payables are current liabilities.
acid-test ratio|速动比率|liquid current assets divided by current liabilities|quick ratio;liquidity|acid-test ratio = (current assets - inventory) / current liabilities|It excludes inventory because inventory is less liquid.
inventory turnover|存货周转率|how often inventory is sold or used during a period|stock turnover;days inventory||Slow turnover may indicate obsolete stock.
    `),
  },
  {
    subject: "geography", topic: "resource-and-environment-management", label: "Geography: Resource & Environment Management",
    stage: "A2",
    note: "用于资源、能源、环境管理和可持续性评价题。",
    example: "Use {word} to evaluate resource management or environmental impact.",
    translation: "用{meaning}评价资源管理或环境影响。",
    terms: parseTerms(`
renewable resource|可再生资源|a resource that can be replenished naturally within a human timescale|renewable water;forest resource||Renewability depends on rate of use.
non-renewable resource|不可再生资源|a resource formed over geological time and not quickly replaced|fossil fuel;mineral resource||Use reduces available stock.
energy mix|能源结构|the combination of energy sources used by a place or economy|renewable share;fuel mix||It affects emissions and energy security.
energy transition|能源转型|shift from one dominant energy system to another|low-carbon transition;renewable energy||It involves technology, policy and behaviour.
carbon capture and storage|碳捕集与封存|capturing carbon dioxide and storing it underground|CCS;carbon storage||It can reduce emissions from some industries.
desalination|海水淡化|removing salt from seawater to produce freshwater|reverse osmosis;water supply||It is energy-intensive and costly.
integrated water resource management|综合水资源管理|coordinated management of water, land and related resources|IWRM;river basin planning||It balances users and ecosystems.
managed retreat|有管理后退|allowing coastlines to move inland while managing risk|coastal management;realignment||It may create habitats but affect property.
hard engineering|硬工程|building artificial structures to control natural processes|sea wall;dam||It can be effective but costly and disruptive.
soft engineering|软工程|working with natural processes to manage hazards or resources|beach nourishment;afforestation||It is often more sustainable but may be slower.
environmental impact assessment|环境影响评估|a study predicting effects of a development on the environment|EIA;mitigation measure||It informs planning decisions.
carrying capacity|承载力|maximum level of use or population an environment can support sustainably|tourism capacity;ecosystem limit||Exceeding capacity causes degradation.
    `),
  },
  {
    subject: "business", topic: "global-business-and-ethics", label: "Business: Global Business & Ethics",
    stage: "A2",
    note: "用于全球商务、供应链、伦理和国际市场题。",
    example: "Use {word} to analyse the international or ethical business issue.",
    translation: "用{meaning}分析国际或伦理商业问题。",
    terms: parseTerms(`
global market|全球市场|a market where customers and competitors operate across countries|international market;global demand||Global markets increase scale and competition.
exporting|出口经营|selling goods or services to customers in another country|export strategy;overseas sales||It can grow revenue but face exchange-rate risk.
importing|进口经营|buying goods or services from another country|import supplier;overseas sourcing||It may reduce cost but increase dependency.
exchange-rate risk|汇率风险|risk that currency movements affect costs, prices or profits|currency fluctuation;foreign exchange exposure||Businesses can hedge some currency risk.
tariff barrier|关税壁垒|an import tax that raises the cost of foreign goods|import duty;trade barrier||It can protect domestic firms but raise prices.
non-tariff barrier|非关税壁垒|a trade restriction other than a tariff|quota;regulation;standard||It may limit market access.
supply-chain disruption|供应链中断|interruption to the flow of materials, components or products|logistics delay;shortage||It can stop production or raise costs.
ethical sourcing|道德采购|buying supplies in ways that consider labour, environmental and social standards|fair trade;supplier audit||It can improve reputation but raise cost.
fair trade|公平贸易|trading arrangement aiming to give producers fairer prices and conditions|fair-trade certification;ethical consumer||It supports producers but may cost more.
triple bottom line|三重底线|business performance measured by people, planet and profit|social environmental financial||It broadens evaluation beyond profit.
greenwashing|漂绿|misleading claims that a business or product is environmentally friendly|false sustainability claim;marketing ethics||It can damage trust if exposed.
compliance|合规|following laws, regulations and internal standards|legal compliance;regulatory risk||Non-compliance can cause fines and reputation damage.
    `),
  },
];

groups.push(...igAlevelFifthExpansionGroups);

const igAlevelSixthExpansionGroups = [
  {
    subject: "computer-science", topic: "ai-data-and-databases", label: "Computer Science: AI, Data & Databases",
    stage: "A2",
    note: "用于 AI、数据库、数据科学、隐私和系统设计题。",
    example: "Use {word} to explain the data process, model behaviour or system design.",
    translation: "用{meaning}解释数据处理、模型行为或系统设计。",
    terms: parseTerms(`
machine learning|机器学习|a method where systems improve performance by learning patterns from data|training data;model prediction||The model learns from examples rather than explicit rules.
training data|训练数据|data used to fit or train a machine-learning model|training set;labelled data||Poor training data can produce biased or inaccurate models.
test data|测试数据|data used to evaluate a trained model on unseen examples|test set;model evaluation||It should be separate from training data.
overfitting|过拟合|when a model learns training data too closely and performs poorly on new data|overfit model;generalisation||Overfitting gives misleadingly high training performance.
bias in data|数据偏差|systematic distortion in data that can lead to unfair or inaccurate results|algorithmic bias;sampling bias||Bias can come from collection methods or historical inequality.
neural network|神经网络|a model made of connected artificial neurons arranged in layers|hidden layer;weights||It can model complex patterns but may be hard to interpret.
decision tree|决策树|a model or algorithm that makes decisions through branching tests|tree node;leaf prediction||Trees are easy to interpret but can overfit.
data mining|数据挖掘|discovering patterns or relationships in large datasets|pattern discovery;large dataset||Results still need context and validation.
data warehouse|数据仓库|a central store of integrated data used for analysis and reporting|business intelligence;historical data||It is optimised for queries rather than daily transactions.
entity|实体|a real-world object or concept represented in a database|entity type;database table||Entities usually become tables.
attribute|属性|a property or field describing an entity|field;column||Attributes store facts about each record.
relationship|关系|an association between entities in a database model|one-to-many relationship;ER diagram||Relationships are implemented using keys.
index|索引|a database structure that speeds up searching and retrieval|database index;indexed field||Indexes improve reads but can slow writes.
transaction|事务|a group of database operations treated as one unit|ACID transaction;commit rollback||Transactions protect consistency.
data privacy|数据隐私|protection of personal information and control over its use|personal data;privacy policy||Privacy differs from general cybersecurity.
data anonymisation|数据匿名化|removing or transforming identifiers so individuals cannot be recognised|anonymous dataset;de-identification||Weak anonymisation can still allow re-identification.
    `),
  },
  {
    subject: "chemistry", topic: "environmental-and-materials-chemistry", label: "Chemistry: Environmental & Materials",
    stage: "AS",
    note: "用于环境化学、材料、聚合物和绿色化学题。",
    example: "Use {word} to explain the environmental or materials chemistry evidence.",
    translation: "用{meaning}解释环境或材料化学证据。",
    terms: parseTerms(`
life-cycle assessment|生命周期评估|analysis of environmental impacts across a product's whole life|LCA;cradle-to-grave analysis||It includes raw materials, manufacture, use and disposal.
carbon footprint|碳足迹|total greenhouse gas emissions associated with an activity or product|CO2 equivalent;emissions footprint||It can include direct and indirect emissions.
recyclable polymer|可回收聚合物|a polymer that can be processed and used again|plastic recycling;polymer sorting||Recycling depends on polymer type and contamination.
addition polymer|加成聚合物|a polymer formed by adding alkene monomers without small-molecule loss|polyethene;addition polymerisation||The repeat unit comes from the alkene monomer.
condensation polymer|缩聚物|a polymer formed when monomers join and release small molecules|polyester;polyamide||Water or HCl may be eliminated.
composite material|复合材料|a material made from two or more components with improved properties|fibreglass;carbon fibre composite||Properties depend on matrix and reinforcement.
ceramic|陶瓷材料|an inorganic non-metallic material often hard and heat resistant|ceramic oxide;high melting point||Ceramics are often brittle.
nanoparticle|纳米颗粒|a particle with dimensions on the nanometre scale|nanomaterial;surface area||Nanoparticles have high surface-area-to-volume ratio.
catalytic converter|催化转化器|a vehicle device using catalysts to convert harmful exhaust gases|exhaust catalyst;platinum catalyst||It reduces carbon monoxide, nitrogen oxides and hydrocarbons.
photochemical smog|光化学烟雾|air pollution formed when sunlight acts on nitrogen oxides and hydrocarbons|ozone smog;urban pollution||It can irritate lungs and damage plants.
acid rain|酸雨|rainfall made acidic by sulfur dioxide and nitrogen oxides|sulfuric acid;nitric acid||It damages buildings, soils and aquatic ecosystems.
water hardness|水硬度|concentration of calcium and magnesium ions in water|temporary hardness;permanent hardness||Hardness causes scale and reduces soap lathering.
    `),
  },
  {
    subject: "economics", topic: "data-analysis-and-exam-evaluation", label: "Economics: Data Analysis & Evaluation",
    stage: "AS",
    note: "用于经济数据、图表、评价和考试分析句型。",
    example: "Use {word} to interpret the data and make an evaluative judgement.",
    translation: "用{meaning}解读数据并作出评价判断。",
    terms: parseTerms(`
index number|指数|a statistic showing change relative to a base period|price index;base year|index = value / base value x 100|It compares relative change over time.
base year|基年|the reference year used for constructing an index|base period;index 100||Values are compared with the base year.
real value|实际值|a value adjusted for inflation|real income;real GDP||Real values show purchasing power or volume.
nominal value|名义值|a value measured in current prices without inflation adjustment|nominal income;money value||Nominal increases may only reflect inflation.
percentage point|百分点|the arithmetic difference between two percentages|percentage-point increase;rate difference||A rise from 5% to 7% is two percentage points, not two percent.
correlation coefficient|相关系数|a number measuring strength and direction of linear relationship|positive correlation;negative correlation||Correlation does not establish causation.
time lag|时滞|delay between a policy action and its full effect|policy lag;implementation lag||Lags can weaken policy timing.
ceteris paribus|其他条件不变|assuming all other relevant factors remain constant|ceteris paribus assumption;economic model||Real-world evaluation often relaxes this assumption.
stakeholder impact|利益相关者影响|effect of a decision or policy on different groups|consumer impact;producer impact||Evaluation should separate affected groups.
short-run effect|短期影响|impact occurring before all adjustments are possible|short-run response;temporary effect||Short-run results may differ from long-run outcomes.
long-run effect|长期影响|impact after firms, households or the economy fully adjust|long-run growth;structural change||Long-run effects may depend on investment and incentives.
policy trade-off|政策权衡|a situation where improving one objective may worsen another|inflation unemployment trade-off;growth environment||Good evaluation names the conflict and context.
    `),
  },
];

groups.push(...igAlevelSixthExpansionGroups);

const igAlevelBreadthExpansionGroups = [
  {
    subject: "law", topic: "igcse-law-foundations", label: "IGCSE Law Foundations",
    stage: "IGCSE",
    note: "用于 IGCSE Law 法律体系、案件分析、权利义务和基本程序题。",
    example: "A legal problem uses {word}. Identify the rule, apply the facts, then state a justified conclusion.",
    translation: "法律问题涉及{meaning}。先写出规则，再适用事实并给出有依据的结论。",
    terms: parseTerms(`
rule of law|法治|the principle that everyone including government is subject to publicly known law|legal certainty;equal treatment||Law should be applied consistently and through fair procedures.
criminal law|刑法|law dealing with offences against the state and punishment|criminal offence;prosecution||The prosecution must prove the required elements.
civil law|民法|law resolving disputes between individuals or organisations|civil claim;damages||Civil cases usually seek remedies rather than punishment.
claimant|原告|the person bringing a civil claim|claimant and defendant;civil action||The claimant must establish the claim on the balance of probabilities.
defendant|被告|the person accused in criminal proceedings or sued in civil proceedings|defence case;defendant liability||The defendant may deny facts or raise a legal defence.
burden of proof|举证责任|the duty to prove a fact or allegation in legal proceedings|legal burden;proof||In criminal cases it normally rests on the prosecution.
standard of proof|证明标准|the level of certainty required to establish a case|beyond reasonable doubt;balance of probabilities||Criminal and civil cases use different standards.
intent|故意|a state of mind involving purpose or awareness in committing an act|criminal intent;mens rea||Intent can be direct or inferred from evidence.
negligence|过失|failure to take reasonable care causing foreseeable harm|duty of care;breach||A claimant must show duty, breach, causation and damage.
duty of care|注意义务|a legal obligation to avoid reasonably foreseeable harm to others|neighbour principle;reasonable care||The duty depends on proximity and foreseeability.
breach of duty|违反注意义务|failure to meet the standard of reasonable care|reasonable person;care standard||Compare conduct with what was reasonably expected.
causation|因果关系|the legal link showing that a breach caused the claimed harm|but for test;legal cause||The loss must not be too remote.
damages|损害赔偿|money awarded to compensate a person for loss or injury|compensatory damages;financial loss||Damages aim to restore rather than punish in most civil claims.
remedy|救济|a legal solution granted by a court for a successful claim|damages;injunction||The remedy depends on the type of wrong and loss.
injunction|禁令|a court order requiring a person to do or stop doing something|court order;restraining injunction||Disobeying an injunction can have serious consequences.
contract|合同|a legally enforceable agreement between parties|contract terms;agreement||A contract needs recognised legal elements.
offer|要约|a clear proposal capable of acceptance to form a contract|valid offer;offer and acceptance||An offer must be distinguished from an invitation to treat.
acceptance|承诺|unqualified agreement to the terms of an offer|valid acceptance;communication||Changing terms is usually a counter-offer.
consideration|对价|something of value exchanged between parties to support a contract|valuable consideration;contract bargain||Past consideration is generally not valid consideration.
misrepresentation|不实陈述|a false statement of fact inducing a party to make a contract|false statement;contract remedy||A remedy may include rescission or damages.
precedent|判例|an earlier judicial decision used as authority in later similar cases|binding precedent;persuasive precedent||The court hierarchy determines whether it is binding.
statute|成文法|law enacted by a legislature|Act of Parliament;legislation||Courts interpret statutes when applying them to cases.
judicial precedent|司法判例|law developed through court decisions and followed in later cases|ratio decidendi;stare decisis||It supports consistency but can be complex.
ratio decidendi|判决理由|the legal principle necessary for a court's decision|binding reason;case authority||Only the ratio is binding on lower courts.
obiter dictum|附带意见|a judicial comment not essential to the decision|persuasive comment;judicial observation||It may guide but does not bind later courts.
appeal|上诉|a request for a higher court to review a legal decision|appeal court;grounds of appeal||An appeal usually challenges law, procedure or outcome.
jury|陪审团|a group of citizens deciding facts in certain court cases|jury trial;verdict||The judge directs law while jurors decide facts.
magistrate|治安法官|a lay or professional judicial officer hearing less serious cases|magistrates' court;summary offence||Magistrates deal with many first-instance criminal cases.
summary offence|简易罪行|a less serious criminal offence tried in a lower court|summary trial;magistrates||It is normally tried without a jury.
indictable offence|可公诉罪行|a serious criminal offence normally tried in a higher court|Crown Court;jury trial||It may carry more serious penalties.
bail|保释|temporary release of an accused person pending trial subject to conditions|bail conditions;remand||Bail can be refused where risks are substantial.
legal aid|法律援助|public funding helping eligible people obtain legal advice or representation|access to justice;means test||Eligibility depends on the scheme and circumstances.
mediation|调解|a neutral third party helping disputing parties negotiate a settlement|alternative dispute resolution;mediator||The mediator does not normally impose a binding decision.
arbitration|仲裁|a private dispute process in which an arbitrator makes a decision|arbitration award;ADR||The process can be faster and more specialised than court.
vicarious liability|替代责任|liability imposed on one person or organisation for the torts of another acting in an authorised relationship|employer liability;course of employment||Employers may be liable for employees acting in the course of employment.
    `),
  },
  {
    subject: "sociology", topic: "igcse-sociology-society-and-research", label: "IGCSE Sociology: Society & Research",
    stage: "IGCSE",
    note: "用于 IGCSE Sociology 社会化、身份、不平等、机构和研究方法题。",
    example: "A sociology question uses {word}. Define it, apply it to the social context, and use evidence to evaluate it.",
    translation: "社会学题涉及{meaning}。先定义，再联系社会情境并用证据评价。",
    terms: parseTerms(`
society|社会|a network of people institutions relationships and shared patterns of life|social structure;social groups||Society is organised through institutions and norms.
socialisation|社会化|the process through which people learn norms values and roles|primary socialisation;secondary socialisation||Family, school and media all socialise individuals.
social norm|社会规范|a shared expectation about acceptable behaviour|social rules;informal norm||Norms may be enforced formally or informally.
value|价值观|a general belief about what is important or desirable|cultural values;shared belief||Values influence choices and social institutions.
role|社会角色|expected behaviour attached to a social position|role expectation;social role||People can hold several roles at once.
status|社会地位|a recognised social position carrying expectations or prestige|ascribed status;achieved status||Status may be gained or assigned at birth.
identity|身份认同|how people understand and present themselves in relation to groups|social identity;personal identity||Identity can change across social contexts.
culture|文化|shared beliefs practices symbols and ways of life of a group|cultural norms;material culture||Culture is learned and varies between groups.
subculture|亚文化|a group within a wider culture with distinctive values or practices|youth subculture;group identity||Subcultures may conform to or resist dominant norms.
social class|社会阶层|a division of society based on economic position occupation and life chances|working class;middle class||Class can affect education health and political participation.
social stratification|社会分层|structured inequality between groups in society|class hierarchy;social inequality||It distributes wealth power and life chances unequally.
social mobility|社会流动|movement of individuals or groups between social positions|upward mobility;intergenerational mobility||Education and labour markets can affect mobility.
life chances|人生机会|opportunities people have because of their social position|health outcomes;educational opportunity||Life chances differ by class gender ethnicity and age.
gender|性别|socially shaped identities expectations and relations linked to sex|gender role;gender inequality||Gender roles vary historically and culturally.
ethnicity|族裔|shared cultural heritage ancestry language or identity|ethnic group;ethnic identity||Ethnicity is not the same as nationality.
stereotype|刻板印象|an oversimplified fixed belief about a group|media stereotype;group image||Stereotypes can shape treatment and self-image.
prejudice|偏见|a negative or positive attitude toward people based on group membership|racial prejudice;biased attitude||Prejudice is an attitude rather than an action.
discrimination|歧视|unfair treatment of people because of group membership|institutional discrimination;unequal treatment||Discrimination can be direct or indirect.
social institution|社会制度|an organised system meeting social needs such as family education or law|family institution;education system||Institutions shape behaviour and opportunities.
family|家庭|a social group connected by kinship care or residence|nuclear family;extended family||Families perform social and economic functions.
education|教育|formal and informal processes of learning knowledge skills and values|schooling;hidden curriculum||Education can reproduce or reduce inequality.
hidden curriculum|隐性课程|unofficial lessons learned at school about behaviour authority and values|school norms;social control||It is learned alongside formal subjects.
mass media|大众传媒|organisations and technologies communicating information to large audiences|news media;social media||Media can shape representation and public agendas.
deviance|越轨|behaviour that breaks social norms|social control;labelling||What counts as deviant varies between groups and periods.
crime|犯罪|behaviour prohibited by law and subject to formal punishment|criminal justice;offence||Crime is a legal category while deviance is broader.
social control|社会控制|ways society encourages conformity to norms|formal control;informal sanctions||Control can come from family peers law and media.
sanction|制裁|a reward or punishment responding to behaviour|positive sanction;negative sanction||Sanctions reinforce or discourage behaviour.
functionalism|功能主义|a perspective viewing society as interdependent parts contributing to stability|social order;consensus||It emphasises shared values and social functions.
Marxism|马克思主义|a perspective focusing on class conflict and economic power|capitalism;class conflict||It links institutions to unequal ownership and power.
feminism|女性主义|perspectives examining gender inequality and patriarchy|gender power;patriarchy||Feminist theories challenge male-centred assumptions.
interactionism|互动论|a perspective focusing on meanings created in everyday interaction|labelling;symbolic interaction||It studies how people interpret situations.
social survey|社会调查|a research method collecting standardised responses from people|questionnaire;survey sample||It can gather data from many people but may lack depth.
participant observation|参与式观察|research involving observing a group while taking part in its activities|fieldwork;researcher role||It can provide rich data but raises ethical issues.
interview|访谈|a method asking participants questions to collect data|structured interview;unstructured interview||Interviews can explore meanings but may be time-consuming.
sample|样本|a smaller group selected to represent a wider population|random sample;representative sample||Sampling affects generalisability.
representativeness|代表性|the extent to which a sample reflects the population studied|sampling bias;generalisation||A biased sample weakens conclusions about the population.
    `),
  },
  {
    subject: "politics", topic: "alevel-politics-government-and-participation", label: "A-Level Politics: Government & Participation",
    stage: "AS",
    note: "用于 A-Level Politics 政府、选举、参与、权利和政治制度题。",
    example: "A politics question uses {word}. Explain the constitutional mechanism, then evaluate its effect on power or representation.",
    translation: "政治题涉及{meaning}。解释宪制机制，再评价它对权力或代表性的影响。",
    terms: parseTerms(`
constitution|宪法|the fundamental rules organising state institutions and limiting public power|constitutional rule;written constitution||A constitution distributes authority and protects procedures or rights.
sovereignty|主权|supreme authority to make and enforce decisions within a political system|parliamentary sovereignty;popular sovereignty||Sovereignty may be legally concentrated but politically constrained.
separation of powers|三权分立|division of legislative executive and judicial functions among institutions|checks and balances;institutional separation||It aims to prevent excessive concentration of power.
checks and balances|制衡|arrangements allowing institutions to limit one another's power|institutional accountability;veto power||Effective checks depend on real independence and enforcement.
executive|行政机关|the branch that formulates and implements policy|cabinet;government ministers||Executives often dominate agendas but face legal and political constraints.
legislature|立法机关|the body that debates scrutinises and makes laws|parliament;law-making||Legislatures also represent citizens and hold government to account.
judiciary|司法机关|courts and judges interpreting law and resolving legal disputes|judicial independence;court ruling||Judicial independence supports impartial decisions.
judicial review|司法审查|court assessment of whether public action complies with law or constitutional rules|lawful decision;court challenge||It checks legality rather than deciding every policy's merits.
rule of law|法治|principle that public power operates under known law and fair procedures|legal equality;due process||It requires accountable government and independent courts.
civil liberty|公民自由|a protected freedom limiting government interference|freedom of expression;privacy||Liberties may be limited only under lawful justified conditions.
human rights|人权|basic rights and freedoms held by people by virtue of being human|rights protection;human dignity||Rights claims can conflict and require balancing.
democracy|民主|government in which people influence public decisions directly or through representatives|popular rule;political participation||Democracy also depends on informed participation and fair competition.
direct democracy|直接民主|a system where citizens vote directly on policy decisions|referendum;popular vote||It can increase participation but may simplify complex issues.
representative democracy|代议制民主|a system where elected representatives make decisions for citizens|elected legislature;constituency||It is practical for large states but raises accountability questions.
electoral system|选举制度|rules converting votes into seats or offices|proportional representation;majoritarian system||Different systems trade proportionality against decisiveness.
first-past-the-post|相对多数制|an electoral system where the candidate with most votes wins a seat|single-member district;plurality||It can produce clear winners but disproportional outcomes.
proportional representation|比例代表制|an electoral system aiming to allocate seats in proportion to votes|party list;fair representation||It can improve representation but may create coalition bargaining.
constituency|选区|the geographic area represented by an elected member|constituency service;district voter||Members balance party commitments and local interests.
mandate|授权|claimed authority to implement policies because of electoral support|electoral mandate;party manifesto||The strength of a mandate depends on turnout and vote share.
political participation|政治参与|activities through which people try to influence politics|voting;campaigning;protest||Participation varies by resources interest and trust.
pressure group|利益集团|an organised group seeking to influence policy without standing for election|insider group;advocacy group||Groups may use lobbying campaigns or litigation.
lobbying|游说|attempting to influence decision-makers on behalf of interests|policy influence;interest representation||Lobbying can inform policy but raises access concerns.
political party|政党|an organised group seeking government office through elections|party manifesto;party discipline||Parties aggregate interests and recruit leaders.
ideology|意识形态|a connected set of political beliefs about society power and policy|liberalism;conservatism;socialism||Ideology shapes priorities and policy choices.
liberalism|自由主义|an ideology emphasising individual liberty limited government and rights|individualism;constitutionalism||Liberals differ on equality and state intervention.
conservatism|保守主义|an ideology valuing tradition order pragmatism and gradual change|tradition;organic society||Conservatives differ over markets and authority.
socialism|社会主义|an ideology emphasising equality cooperation and collective provision|social justice;collectivism||Socialists differ over reform versus radical change.
accountability|问责|requirement for office-holders to explain and justify decisions|ministerial accountability;scrutiny||Accountability needs information consequences and independent scrutiny.
transparency|透明度|openness allowing the public to understand decisions and information|open government;public information||Transparency can support accountability but has legitimate limits.
devolution|权力下放|transfer of powers from central government to regional institutions|regional assembly;subnational government||It can improve local representation while creating coordination issues.
federalism|联邦制|a system constitutionally dividing authority between central and regional governments|federal state;reserved powers||Federal arrangements protect regional autonomy but can create conflict.
referendum|公民投票|a direct public vote on a constitutional or policy question|referendum campaign;popular vote||Its legitimacy depends on clear rules and informed debate.
coalition government|联合政府|government formed by two or more parties sharing office|coalition agreement;power sharing||Coalitions can broaden support but require compromise.
opposition|反对党|parties or members challenging and scrutinising the government|shadow cabinet;parliamentary opposition||An effective opposition offers alternatives and accountability.
    `),
  },
  {
    subject: "history", topic: "igcse-history-evidence-and-interpretation", label: "IGCSE History: Evidence & Interpretation",
    stage: "IGCSE",
    note: "用于 IGCSE History 因果、变化、史料和历史解释题。",
    example: "A history question uses {word}. Select source evidence, place it in context, and make a supported judgement.",
    translation: "历史题涉及{meaning}。选择史料证据、放回语境并作出有支撑的判断。",
    terms: parseTerms(`
chronology|年代顺序|the arrangement of events in the order they occurred|historical timeline;sequence||Chronology establishes what happened before and after.
context|历史语境|the circumstances surrounding an event source or action|historical background;time and place||Context helps explain meaning and significance.
cause|原因|a factor contributing to an event or development|long-term cause;short-term trigger||Causes can interact rather than act alone.
consequence|后果|an effect resulting from an event decision or development|short-term consequence;long-term impact||Consequences can be intended or unintended.
turning point|转折点|an event causing a significant change in direction or development|historical change;decisive moment||Its significance must be supported with before-and-after evidence.
continuity|延续性|features that remain broadly the same over time|continuity and change;enduring pattern||Change in one area can coexist with continuity in another.
change|变化|a difference in conditions ideas institutions or experiences over time|historical development;transformation||Explain pace extent and impact of change.
significance|重要性|the importance of an event person or development in relation to consequences|historical importance;long-term effect||Significance depends on criteria and evidence.
historical interpretation|历史解释|an argued account of the past based on selected evidence and perspective|interpretation debate;historian view||Interpretations can differ without all being equally supported.
primary source|第一手史料|evidence produced at or near the time of an event|contemporary account;original evidence||A primary source still needs evaluation of purpose and limitation.
secondary source|第二手史料|an account created later using other evidence|historian account;textbook||It may synthesise evidence but reflects later interpretation.
provenance|来源信息|the origin authorship date purpose and audience of a source|source origin;authorship||Provenance helps assess value and limitations.
purpose|目的|the reason a source was produced|propaganda;private record||Purpose can affect emphasis omission and reliability.
audience|受众|the intended readers listeners or viewers of a source|target audience;public audience||Audience shapes language and content.
reliability|可靠性|the extent to which a source can be trusted for a specific claim|source reliability;corroboration||Reliability is contextual rather than all-or-nothing.
utility|史料价值|how useful a source is for answering a historical question|source value;historical enquiry||A biased source may still be useful for its purpose or attitudes.
limitation|局限|a feature restricting what a source can prove|missing perspective;limited evidence||Limitations should be linked to the exact enquiry.
corroboration|相互印证|support for a claim from independent sources|cross-reference;supporting evidence||Agreement alone is not enough if sources share the same origin.
bias|偏向|a tendency causing a source to favour one view or group|political bias;selective account||Bias can reveal attitudes as well as limit factual claims.
propaganda|宣传|communication designed to influence opinions or behaviour for a cause|political message;persuasion||Analyse purpose audience and selective techniques.
perspective|视角|a viewpoint shaped by position experience interests or values|historical viewpoint;social position||Different perspectives may highlight different evidence.
claim|主张|a statement about the past that requires evidence|historical argument;assertion||A claim is stronger when precisely supported.
evidence|证据|information used to support or challenge a historical claim|source evidence;quotation||Evidence must be selected and explained rather than dropped into an answer.
inference|推论|a conclusion drawn from evidence rather than directly stated|read between lines;source inference||A valid inference needs a precise detail and contextual support.
comparison|比较|analysis of similarities and differences between sources events or interpretations|compare sources;similarity and difference||Comparisons need a criterion and evidence from both sides.
causation|因果分析|analysis of how and why factors produced an outcome|causal chain;factor interaction||Avoid treating correlation or sequence as proof of cause.
factor|因素|a condition or action contributing to an outcome|political factor;economic factor||Weigh factors rather than listing them equally.
trigger|导火线|an immediate event precipitating a wider development|short-term trigger;immediate cause||A trigger differs from deeper structural causes.
historical enquiry|历史探究|a focused investigation using questions sources and arguments about the past|research question;source analysis||The enquiry question determines relevant evidence.
historiography|史学史|study of how historians have interpreted and written about the past|historian debate;school of history||It compares methods assumptions and changing interpretations.
empire|帝国|a political system controlling territories or peoples beyond a core state|imperial power;colonial rule||Empires use political economic and military power.
colonialism|殖民主义|control of territories or peoples by an external power|colonial rule;settler colony||It had unequal social economic and cultural effects.
nationalism|民族主义|belief that a people sharing identity should have political self-rule|national identity;self-determination||Nationalism can unite groups or create conflict.
revolution|革命|rapid fundamental change in political social or economic arrangements|revolutionary movement;regime change||Revolutions often combine long-term grievances and immediate crises.
reform|改革|planned change intended to improve institutions or conditions|political reform;social reform||Reform may be gradual and contested.
    `),
  },
  {
    subject: "environmental-management", topic: "igcse-environmental-management-systems", label: "IGCSE Environmental Management: Systems",
    stage: "IGCSE",
    note: "用于环境系统、资源、污染、保护和管理策略题。",
    example: "An environmental-management question uses {word}. Explain the system process, then evaluate a management response.",
    translation: "环境管理题涉及{meaning}。解释系统过程，再评价管理措施。",
    terms: parseTerms(`
ecosystem|生态系统|a community of organisms interacting with each other and their physical environment|biotic and abiotic;ecosystem process||Ecosystems involve energy flow and nutrient cycling.
habitat|栖息地|the place where an organism normally lives|habitat loss;habitat requirement||A habitat provides conditions and resources for a species.
population|种群|members of one species living in the same area|population size;population density||Population change depends on births deaths immigration and emigration.
community|群落|populations of different species living and interacting in an area|ecological community;species interaction||A community is part of an ecosystem.
biodiversity|生物多样性|the variety of life including genetic species and ecosystem diversity|species richness;conservation||High biodiversity can support resilience and ecosystem services.
food web|食物网|a network of feeding relationships in an ecosystem|trophic level;energy transfer||Food webs show that organisms may have several food sources.
trophic level|营养级|a feeding position in a food chain or web|producer;consumer;decomposer||Energy available usually decreases at higher trophic levels.
producer|生产者|an organism making organic matter from inorganic substances usually by photosynthesis|primary producer;autotroph||Producers introduce energy into most food chains.
consumer|消费者|an organism obtaining energy by feeding on other organisms|primary consumer;predator||Consumers depend directly or indirectly on producers.
decomposer|分解者|an organism breaking down dead material and waste|nutrient recycling;fungi bacteria||Decomposers return nutrients to the environment.
carbon cycle|碳循环|movement of carbon between atmosphere organisms oceans soils and rocks|photosynthesis;respiration||Human combustion changes the balance of carbon stores.
water cycle|水循环|continuous movement of water through atmosphere land oceans and organisms|evaporation;condensation;precipitation||Land use can change infiltration and runoff.
nitrogen cycle|氮循环|movement and chemical conversion of nitrogen through ecosystems|nitrogen fixation;nitrification||Plants need usable nitrogen compounds rather than nitrogen gas.
renewable resource|可再生资源|a resource replenished naturally if use does not exceed replacement|renewable energy;forest management||Renewability depends on management rate and scale.
non-renewable resource|不可再生资源|a resource depleted faster than it can be naturally replaced|fossil fuel;mineral reserve||Extraction reduces finite stocks.
sustainable development|可持续发展|development meeting current needs without undermining future generations|long-term planning;resource stewardship||It balances environmental social and economic goals.
carrying capacity|环境承载力|the maximum population or activity an environment can sustain|resource limit;ecosystem capacity||Exceeding capacity can degrade resources and habitats.
ecological footprint|生态足迹|an estimate of biologically productive area needed to support consumption and absorb waste|resource demand;footprint comparison||It is an indicator with modelling assumptions.
conservation|保护|planned protection and management of species habitats or resources|protected area;conservation strategy||Conservation can involve preservation restoration and sustainable use.
protected area|保护区|a designated place managed to conserve nature or cultural value|national park;reserve||Protection still needs enforcement and local support.
endangered species|濒危物种|a species facing a high risk of extinction|species recovery;extinction risk||Small populations may have genetic and habitat risks.
invasive species|入侵物种|a non-native organism spreading and causing ecological or economic harm|introduced species;biosecurity||Not every non-native species becomes invasive.
pollution|污染|introduction of harmful substances or energy into the environment|air pollution;water pollution||Impact depends on concentration exposure and vulnerability.
air pollution|空气污染|harmful gases particles or biological material in the atmosphere|particulate matter;emissions||Sources and effects vary by pollutant and weather.
water pollution|水污染|contamination reducing water quality or harming aquatic systems|sewage;industrial discharge||Pollution can be chemical biological or thermal.
soil erosion|土壤侵蚀|removal of fertile topsoil by wind water or human activity|land degradation;topsoil loss||Vegetation cover can reduce erosion.
deforestation|森林砍伐|large-scale removal of forest cover|land clearing;forest loss||It affects biodiversity carbon storage and water cycles.
desertification|荒漠化|land degradation in dry areas caused by climate variation and human activity|overgrazing;soil degradation||It is not simply the spread of deserts.
climate change|气候变化|long-term change in climate patterns including temperature and rainfall|global warming;climate risk||Current rapid warming is strongly linked to greenhouse gases.
greenhouse effect|温室效应|warming caused when gases absorb outgoing infrared radiation|greenhouse gas;heat retention||The natural effect supports life; enhancement causes warming.
adaptation|适应措施|adjustment reducing harm from actual or expected environmental change|flood defence;drought planning||Adaptation manages impacts rather than removing all causes.
mitigation|减缓措施|action reducing the causes or scale of environmental change|emissions reduction;carbon sink||Mitigation often targets greenhouse-gas emissions.
environmental impact assessment|环境影响评估|a structured study of likely environmental effects before a project proceeds|EIA;mitigation plan||It informs decisions but depends on evidence and enforcement.
monitoring|监测|systematic collection of environmental data over time|water-quality monitoring;indicator species||Monitoring allows trends and interventions to be evaluated.
indicator species|指示物种|a species whose presence condition or abundance gives information about environment quality|bioindicator;pollution tolerance||Indicators must be interpreted with other evidence.
    `),
  },
  {
    subject: "design-technology", topic: "igcse-design-technology-design-and-manufacture", label: "IGCSE Design & Technology: Design & Manufacture",
    stage: "IGCSE",
    note: "用于设计 brief、材料、制造、电子与产品评价题。",
    example: "A design-and-technology question uses {word}. Relate it to the user need, material or process, then justify the decision.",
    translation: "设计技术题涉及{meaning}。把它联系到用户需求、材料或工艺，并说明理由。",
    terms: parseTerms(`
design brief|设计任务书|a concise statement describing the design problem and intended outcome|client need;design problem||A good brief identifies who needs what and why.
specification|设计规格|measurable criteria a design must meet|design criteria;success criteria||Specifications guide testing and evaluation.
user need|用户需求|a requirement arising from the intended user's situation or problem|target user;user research||Needs should be evidenced rather than assumed.
target market|目标市场|the group of users a product is intended to serve|consumer profile;market segment||Design decisions should fit the target market.
ergonomics|人机工程学|designing products to fit human physical abilities and limits|anthropometrics;user comfort||Ergonomics improves safety comfort and usability.
anthropometrics|人体测量学|measurements of human body dimensions used in design|percentile data;body dimensions||Use appropriate percentile ranges for the user group.
accessibility|无障碍设计|design that can be used by people with varied abilities|inclusive design;accessible product||Accessibility considers sensory physical and cognitive needs.
inclusive design|包容性设计|designing products usable by as many people as possible|universal design;user diversity||It avoids treating users as one identical group.
prototype|原型|an early model used to test ideas appearance or function|working prototype;iterative model||Prototypes expose problems before final manufacture.
iteration|迭代|repeated design improvement using testing and feedback|design cycle;refinement||Each iteration should respond to evidence.
modelling|建模|using drawings physical models or digital tools to explore a design|CAD model;scale model||Models communicate and test ideas before production.
CAD|计算机辅助设计|software used to create edit and communicate design drawings or models|CAD drawing;3D model||CAD improves accuracy and allows rapid revision.
CAM|计算机辅助制造|computer-controlled manufacture using digital design data|CNC machining;automated production||CAM supports repeatability but needs correct setup.
CNC machining|数控加工|manufacture controlled by programmed computer instructions|CNC router;toolpath||It can make complex accurate parts repeatedly.
quality control|质量控制|checking products or components against standards during or after production|inspection;defect check||It finds faults but does not always prevent them.
quality assurance|质量保证|systems preventing defects by controlling production processes|process standard;quality system||It focuses on consistency and prevention.
batch production|批量生产|making a set number of identical products before changing setup|production run;batch size||It balances variety with efficiency.
mass production|大量生产|making very large quantities of standardised products|assembly line;standardisation||It reduces unit cost but needs high demand.
one-off production|单件生产|making one unique product to a specific requirement|bespoke product;custom manufacture||It allows customisation but is often expensive.
just-in-time|及时生产|receiving materials only when needed for production|lean stock;inventory control||It reduces storage costs but increases supply risk.
lean manufacturing|精益生产|reducing waste while maintaining value and quality|continuous improvement;waste reduction||It targets unnecessary time material movement and defects.
material property|材料性能|a characteristic determining how a material behaves in use|mechanical property;thermal property||Properties must match the product's function.
tensile strength|抗拉强度|ability of a material to resist pulling force before failure|strong material;load bearing||High tensile strength matters for tension members.
hardness|硬度|resistance of a material to scratching indentation or wear|surface hardness;wear resistance||Hardness is different from toughness.
toughness|韧性|ability of a material to absorb energy before fracturing|impact resistance;durable material||A tough material may deform before breaking.
ductility|延展性|ability of a material to be drawn into wire without breaking|metal wire;plastic deformation||Ductile materials can undergo tensile deformation.
conductivity|导电性|ability of a material to transfer electricity or heat|electrical conductor;thermal conductor||Good electrical conductors have mobile charge carriers.
thermoplastic|热塑性塑料|a polymer that softens when heated and can be reshaped|acrylic;polyethylene||Heating allows reforming but excessive heat can damage it.
thermosetting plastic|热固性塑料|a polymer that sets permanently when heated and cannot be remoulded|epoxy resin;heat resistant||Cross-links give heat resistance and rigidity.
composite material|复合材料|material combining components to gain improved properties|carbon fibre composite;matrix||Its performance depends on reinforcement and matrix.
life cycle analysis|生命周期分析|assessment of impacts from raw material to disposal|LCA;environmental impact||Compare energy transport use and end-of-life stages.
finite resource|有限资源|a material stock that cannot be replaced on a human timescale|resource depletion;non-renewable||Design choices can reduce use through reuse or recycling.
recycling|回收利用|processing materials so they can be used again|recycled content;material recovery||Recycling has energy quality and transport trade-offs.
design for disassembly|可拆解设计|designing a product so components can be separated at end of life|repairable design;material recovery||It supports repair reuse and recycling.
control system|控制系统|a system using inputs processing and outputs to manage a process|sensor;actuator;feedback||Feedback can adjust output toward a target.
sensor|传感器|a component detecting a physical condition and producing a signal|temperature sensor;light sensor||Sensors provide input data to a control system.
actuator|执行器|a component converting a control signal into physical action|motor;solenoid||Actuators are output devices in control systems.
feedback|反馈|information about output used to adjust a control system|negative feedback;control loop||Feedback can improve stability and accuracy.
    `),
  },
  {
    subject: "english-language", topic: "alevel-english-language-analysis-and-change", label: "A-Level English Language: Analysis & Change",
    stage: "AS",
    note: "用于语言层级分析、语境、身份、语言变化和语料比较题。",
    example: "An English Language question uses {word}. Quote the language evidence and explain its effect in context.",
    translation: "英语语言题涉及{meaning}。引用语言证据并解释其语境效果。",
    terms: parseTerms(`
phonology|音系学|the study of speech sounds and sound patterns in a language|phonological feature;sound pattern||Analyse sound choices with accurate evidence.
phoneme|音位|the smallest contrastive sound unit in a language|minimal pair;speech sound||Changing a phoneme can change meaning.
alliteration|头韵|repetition of initial consonant sounds in nearby words|sound pattern;repeated consonant||It can create emphasis rhythm or memorability.
prosody|韵律|patterns of stress rhythm pitch and intonation in speech|intonation pattern;spoken delivery||Prosody can signal attitude turn-taking or emphasis.
lexis|词汇|the vocabulary choices used in a text or interaction|lexical field;word choice||Lexis should be analysed with connotation and context.
semantic field|语义场|a group of words connected by a shared area of meaning|lexical pattern;semantic association||A semantic field can construct topic mood or viewpoint.
connotation|隐含意义|associations or meanings suggested beyond a word's literal definition|positive connotation;negative connotation||Connotations depend on culture and context.
denotation|字面意义|the direct dictionary meaning of a word|literal meaning;denotative meaning||Contrast denotation with connotation where useful.
neologism|新词|a newly coined word or expression|new vocabulary;word formation||Neologisms can reflect technology identity or social change.
borrowing|借词|adoption of a word from another language|loanword;language contact||Borrowing shows language contact and change.
code-switching|语码转换|alternating between languages or varieties in communication|bilingual speech;language choice||It can signal identity audience or topic.
register|语域|language variation according to situation purpose and audience|formal register;occupational register||Register choices reflect context and relationships.
idiolect|个人语言风格|the distinctive language pattern of an individual|individual style;language identity||An idiolect is shaped by social and personal influences.
dialect|方言|a regional or social variety of a language with distinctive grammar and vocabulary|regional dialect;dialect feature||Dialects are systematic varieties, not deficient forms.
accent|口音|a pattern of pronunciation associated with a person or group|regional accent;pronunciation||Accent concerns sound rather than grammar or vocabulary.
standard English|标准英语|a socially recognised variety associated with formal writing and institutions|standard grammar;prestige variety||It is one variety and not inherently more logical.
non-standard English|非标准英语|varieties differing from standardised grammar or conventions|vernacular grammar;spoken variety||Non-standard forms can be rule-governed and meaningful.
morphology|形态学|the study of word structure and formation|prefix;suffix;inflection||Morphology explains how words carry grammatical meaning.
affixation|词缀构词|forming words by adding prefixes or suffixes|prefixation;suffixation||Affixes can change word class or meaning.
compounding|复合构词|forming a word by combining two existing words|compound noun;word formation||Compounds can be open hyphenated or closed.
clipping|截短词|shortening a longer word without changing its basic meaning|informal vocabulary;short form||Clipping is common in rapid informal communication.
blending|混成词|forming a word by combining parts of two words|portmanteau;new word||Blends often emerge in media and technology.
syntax|句法|the arrangement of words and phrases into sentences|sentence structure;word order||Syntax can control emphasis pace and clarity.
clause|分句|a unit containing a verb and usually a subject|main clause;subordinate clause||Clause choices shape complexity and relationships.
subordinate clause|从属分句|a clause dependent on a main clause|embedded clause;complex sentence||It can add qualification cause time or condition.
imperative|祈使句|a verb form giving an instruction command or request|directive language;command||Imperatives can sound forceful or supportive depending on context.
interrogative|疑问句|a grammatical form used to ask a question|question form;information seeking||Questions can request information or manage interaction.
declarative|陈述句|a grammatical form typically used to make a statement|assertive statement;statement form||Declaratives can present certainty or authority.
modality|情态|language expressing certainty possibility obligation or attitude|modal verb;epistemic modality||Modal choices show confidence power or politeness.
discourse marker|话语标记|a word or phrase organising spoken or written discourse|well;however;so||Markers manage cohesion transitions and interaction.
turn-taking|轮流发言|the organisation of who speaks when in conversation|speaker transition;overlap||Turn-taking patterns reveal cooperation power or familiarity.
adjacency pair|邻接对|paired conversational moves such as question-answer or greeting-greeting|preferred response;conversation analysis||The second part is expected after the first.
face|面子需求|a person's public self-image managed in interaction|politeness strategy;face-threatening act||Speakers use politeness to protect face.
politeness strategy|礼貌策略|language choices reducing threat or showing respect in interaction|hedging;positive politeness||Strategies depend on power distance and imposition.
cohesion|衔接|grammatical and lexical links connecting parts of a text|reference;repetition;connective||Cohesion helps a text hold together.
coherence|连贯性|the overall meaningful organisation and logical flow of a text|text structure;reader inference||A coherent text makes sense in its context.
corpus|语料库|a structured collection of authentic language data|corpus evidence;frequency data||Corpus data supports claims about patterns but needs interpretation.
language change|语言变化|development of language features over time|semantic change;grammatical change||Change can be gradual and socially uneven.
prescriptivism|规范主义|the view that language should follow fixed approved rules|language correctness;standard usage||It differs from describing how people actually use language.
descriptivism|描写主义|the approach of describing language use without judging it as correct or incorrect|language variation;usage evidence||It values evidence from real speakers and texts.
    `),
  },
  {
    subject: "english-literature", topic: "alevel-english-literature-close-reading-and-form", label: "A-Level English Literature: Close Reading & Form",
    stage: "AS",
    note: "用于诗歌、戏剧、散文文本细读、形式、结构和比较题。",
    example: "An English Literature question uses {word}. Analyse the quoted detail and connect it to form, theme, context or interpretation.",
    translation: "英语文学题涉及{meaning}。分析引文细节，并联系形式、主题、语境或解读。",
    terms: parseTerms(`
narrative voice|叙述声音|the perspective or persona through which a story is told|first-person narrator;third-person narrator||Voice shapes what readers know and how they judge events.
narrator|叙述者|the speaker or agency telling a narrative|reliable narrator;unreliable narrator||The narrator is not automatically identical to the author.
unreliable narrator|不可靠叙述者|a narrator whose account readers have reason to question|limited perspective;contradiction||Unreliability creates gaps between account and interpretation.
point of view|视角|the position from which events or ideas are presented|focalisation;perspective||Point of view controls access to feelings information and judgement.
focalisation|聚焦|the lens through which narrative information is filtered|internal focalisation;external focalisation||It may shift between characters or remain restricted.
characterisation|人物塑造|methods used to create and develop a character|dialogue;action;description||Characterisation can be direct or inferred from patterns.
protagonist|主人公|the central character whose conflict or journey drives a text|main character;central conflict||A protagonist need not be morally admirable.
antagonist|对立角色|a character force or system opposing the protagonist|conflict;opposition||An antagonist can be internal or social rather than one villain.
theme|主题|a central recurring idea or concern explored by a text|power;identity;loss||A theme develops through language structure and character.
motif|母题|a recurring image phrase situation or idea with thematic significance|recurring image;symbolic pattern||A motif gains meaning through repetition and variation.
symbol|象征|an object image or action representing wider meanings|symbolic object;abstract idea||Symbols can support more than one interpretation.
imagery|意象|language creating sensory pictures or associations|visual imagery;metaphorical image||Analyse the exact image and its effects rather than naming it alone.
metaphor|隐喻|a comparison stating that one thing is another|extended metaphor;figurative language||Metaphors can restructure how readers understand an idea.
simile|明喻|a comparison using like or as|comparative image;figurative comparison||A simile's effect depends on the qualities transferred.
personification|拟人|giving human qualities to non-human things or abstractions|human-like image;personified nature||It can create intimacy threat or irony.
pathetic fallacy|情感化景物描写|weather or nature reflecting human emotion or mood|storm imagery;setting mood||Do not label all weather as pathetic fallacy without a connection.
irony|反讽|a gap between appearance expectation or words and underlying meaning|verbal irony;situational irony||Irony often relies on audience awareness.
dramatic irony|戏剧性反讽|a gap between what audience knows and what characters know|audience knowledge;tension||It can create suspense pity or humour.
foreshadowing|伏笔|a hint suggesting later events or developments|future event;structural hint||Foreshadowing gains force when later events occur.
juxtaposition|并置|placing contrasting elements close together for effect|contrast;comparison||Analyse why the contrast matters at that point.
oxymoron|矛盾修辞|a phrase combining apparently contradictory terms|compressed contrast;paradox||It can reveal conflict ambiguity or tension.
paradox|悖论|a statement seeming contradictory yet revealing a possible truth|contradictory idea;ambiguity||A paradox invites readers to reconsider assumptions.
allusion|典故|an indirect reference to another text event myth or cultural idea|biblical allusion;literary reference||An allusion can add associations for informed audiences.
intertextuality|互文性|relationships between a text and other texts or cultural discourses|textual reference;literary tradition||It can shape genre expectations and interpretation.
genre|体裁|a category of text with shared conventions|tragedy;comedy;gothic||Genres guide but do not completely determine meaning.
tragedy|悲剧|a dramatic form involving serious conflict suffering and downfall|tragic hero;catharsis||Different tragedies use conventions differently.
comedy|喜剧|a form often using humour misunderstanding and resolution|comic relief;social satire||Comedy can still criticise social norms.
bildungsroman|成长小说|a narrative focused on a protagonist's development toward maturity|coming-of-age;development||The journey may be incomplete or resisted.
sonnet|十四行诗|a fourteen-line poem with organised rhyme and argument|volta;sonnet form||Form often turns or complicates the poem's idea.
volta|转折|a significant turn in thought argument or emotion in a poem|sonnet turn;structural shift||The volta is often marked by syntax or conjunction.
enjambment|跨行|a sentence continuing beyond a line break without terminal punctuation|line break;poetic movement||It can speed flow or create double meaning.
caesura|顿止|a strong pause within a poetic line|punctuation;rhythmic pause||Caesura can interrupt rhythm and create emphasis.
blank verse|无韵诗|unrhymed iambic pentameter often used in English drama and poetry|iambic pentameter;dramatic verse||Variation within blank verse can signal emotion or status.
iambic pentameter|抑扬五步格|a line of five iambic feet commonly used in English verse|metrical rhythm;unstressed stressed||Metre can be regular or disrupted for effect.
soliloquy|独白|a speech in drama revealing a character's private thoughts to the audience|private speech;dramatic monologue||It can create intimacy and dramatic irony.
aside|旁白|a brief remark heard by the audience but not other characters|audience address;secret thought||Asides create complicity between character and audience.
stage directions|舞台说明|instructions in a play script about movement setting or delivery|dramatic action;performance||They shape meaning differently in performance.
setting|背景环境|the time place and social environment of a text|social setting;atmosphere||Setting can shape conflict mood and character options.
structure|结构|the arrangement of sections events perspectives or arguments in a text|cyclical structure;fragmentation||Structure guides pacing revelation and interpretation.
semantic ambiguity|语义歧义|the presence of more than one plausible meaning in language|double meaning;interpretive gap||Ambiguity can invite competing readings.
critical interpretation|批评性解读|an argued reading of a text using evidence and critical perspective|alternative reading;critical lens||Interpretations should remain anchored in textual evidence.
    `),
  },
];

groups.push(...igAlevelBreadthExpansionGroups);

const igAlevelFurtherSubjectGroups = [
  {
    subject: "media-studies", topic: "alevel-media-language-audiences-and-industry", label: "A-Level Media Studies: Language, Audiences & Industry",
    stage: "AS",
    note: "用于媒体语言、表征、受众、产业和数字平台题。",
    example: "A Media Studies question uses {word}. Use a precise product detail, then explain its effect on meaning, audience or power.",
    translation: "媒体研究题涉及{meaning}。引用具体媒体产品细节，再解释其对意义、受众或权力的影响。",
    terms: parseTerms(`
media representation|媒体表征|the way media products construct people groups places or ideas|representation;media image||Representations select and frame reality rather than simply reflecting it.
media language|媒体语言|the signs codes conventions and techniques used to create meaning in media products|visual code;media convention||Media language includes image sound editing layout and written language.
signifier|能指|the physical form of a sign such as an image sound or word|semiotic sign;visual sign||A signifier points audiences toward meanings.
signified|所指|the concept or meaning associated with a signifier|semiotic meaning;associated idea||Meanings can vary across audiences and contexts.
denotation|外延意义|the literal descriptive meaning of a media sign|literal image;surface meaning||Start with denotation before analysing connotation.
connotation|内涵意义|cultural or emotional associations carried by a media sign|preferred meaning;association||Connotations depend on shared codes and context.
anchorage|意义锚定|text or audio that guides interpretation of an image|caption;headline;voice-over||Anchorage can narrow otherwise ambiguous meanings.
polysemy|多义性|the capacity of a media text to have several possible meanings|multiple readings;open text||Different audiences can negotiate meanings.
ideology|意识形态|a system of ideas and values shaping how reality is understood|dominant ideology;social values||Media can reproduce or challenge ideologies.
hegemony|文化霸权|dominance maintained through consent and normalised cultural ideas|dominant culture;common sense||Hegemony makes particular values appear natural.
stereotype|刻板印象|a simplified repeated representation of a social group|media stereotype;fixed image||Stereotypes can limit complexity and reinforce inequality.
countertype|反刻板表征|a representation challenging a familiar stereotype|alternative representation;subversion||A countertype may broaden but not remove all stereotypes.
gatekeeping|把关|selection and filtering of information before it reaches audiences|news selection;editorial control||Gatekeepers shape visibility and agenda.
agenda setting|议程设置|media influence over which issues audiences consider important|news agenda;issue salience||It concerns attention rather than direct instruction.
framing|框架化|presenting an issue through a selected angle language or set of assumptions|news frame;interpretive frame||Frames guide how causes and solutions are understood.
target audience|目标受众|the intended group for a media product or campaign|audience profile;demographic||Producers use audience research to target formats and messages.
demographics|人口统计特征|measurable audience characteristics such as age income gender or location|audience data;market segment||Demographics do not explain every audience response.
psychographics|心理统计特征|audience grouping by values interests lifestyles and attitudes|lifestyle group;audience lifestyle||Psychographics can help explain media preferences.
active audience|主动受众|the idea that audiences interpret and use media rather than simply receiving messages|audience agency;negotiated reading||Audience activity still occurs within social and platform constraints.
preferred reading|主导解读|the interpretation a producer appears to invite an audience to accept|dominant reading;intended meaning||A preferred reading may be accepted negotiated or opposed.
negotiated reading|协商式解读|an audience interpretation accepting some but not all preferred meanings|audience response;partial acceptance||It mixes agreement with personal or social experience.
oppositional reading|对抗式解读|an interpretation rejecting the preferred meaning of a media text|resistant audience;critical reading||Opposition depends on audience knowledge and values.
public service broadcasting|公共服务广播|media service funded or regulated to serve public rather than purely commercial goals|public remit;citizenship||It may prioritise information education and diversity.
commercial media|商业媒体|media funded mainly through advertising sales subscriptions or profit|advertising revenue;media market||Commercial pressures can influence content and audiences.
vertical integration|纵向整合|company ownership of different stages of production distribution and exhibition|media conglomerate;ownership||It can increase control over supply chains.
horizontal integration|横向整合|company ownership of several businesses at the same production stage|media concentration;cross-media ownership||It can increase market share and reduce competition.
convergence|媒介融合|blending of media technologies industries platforms or content|digital convergence;multiplatform||Convergence changes production distribution and use.
algorithmic curation|算法推荐|automated selection and ranking of content for users|recommendation system;platform feed||It can personalise access while shaping visibility.
participatory culture|参与式文化|culture in which audiences create share remix and discuss media content|user-generated content;fan culture||Participation can blur producer and audience roles.
regulation|媒体监管|rules and bodies governing media standards ownership or content|media regulator;content standards||Regulation balances expression public interest and harm.
    `),
  },
  {
    subject: "physical-education", topic: "igcse-pe-performance-and-training", label: "IGCSE Physical Education: Performance & Training",
    stage: "IGCSE",
    note: "用于运动表现、人体系统、技能学习、训练与健康题。",
    example: "A Physical Education question uses {word}. Apply it to the activity, then explain the performance effect and limitation.",
    translation: "体育题涉及{meaning}。把它应用到具体运动，再解释对表现的影响和限制。",
    terms: parseTerms(`
aerobic endurance|有氧耐力|ability to sustain exercise using oxygen over an extended period|endurance training;continuous exercise||It is important for long-duration activities.
anaerobic endurance|无氧耐力|ability to sustain high-intensity activity when oxygen supply is insufficient|sprint endurance;lactic acid||It is important for short intense efforts.
agility|敏捷性|ability to change direction quickly and under control|change of direction;reaction||Agility combines speed balance coordination and decision-making.
balance|平衡能力|ability to maintain stability while stationary or moving|static balance;dynamic balance||A lower centre of mass can improve stability.
coordination|协调性|ability to use body parts smoothly and efficiently together|hand-eye coordination;movement control||Coordination improves timing and accuracy.
flexibility|柔韧性|range of movement possible at a joint|joint mobility;stretching||Flexibility depends on joints muscles and connective tissue.
muscular endurance|肌耐力|ability of a muscle or muscle group to work repeatedly without fatigue|repeated contractions;local endurance||It differs from maximum strength.
muscular strength|肌力|maximum force a muscle or muscle group can produce|one-repetition maximum;force production||Strength is specific to movement and muscle action.
speed|速度|ability to move the body or a body part rapidly|sprint speed;reaction speed||Speed depends on technique force and reaction.
reaction time|反应时间|time between a stimulus and the start of a response|stimulus response;start signal||Practice and anticipation can reduce response time.
power|爆发力|ability to apply force quickly|explosive power;vertical jump|power = force x velocity|Power combines strength and speed.
cardiovascular system|心血管系统|heart blood and blood vessels transporting substances around the body|cardiac output;circulation||It delivers oxygen and removes waste products.
respiratory system|呼吸系统|organs involved in ventilation and gas exchange|alveoli;breathing rate||It supplies oxygen and removes carbon dioxide.
cardiac output|心输出量|volume of blood pumped by the heart each minute|heart rate;stroke volume|cardiac output = heart rate x stroke volume|Training can increase stroke volume.
stroke volume|每搏输出量|volume of blood pumped by the heart in one beat|heart contraction;blood volume||It contributes to cardiac output.
heart rate|心率|number of heart beats per minute|resting heart rate;training zone||Heart rate rises as exercise intensity increases.
tidal volume|潮气量|volume of air moved in or out in one normal breath|breathing depth;ventilation||Tidal volume can increase during exercise.
ventilation|通气量|movement of air into and out of the lungs|minute ventilation;breathing rate||Ventilation rises to meet gas-exchange demand.
oxygen debt|氧债|extra oxygen needed after intense exercise to restore the body|recovery oxygen;EPOC||Recovery helps remove or process by-products and restore stores.
lactic acid|乳酸|a product associated with anaerobic energy release during intense exercise|lactate accumulation;fatigue||High levels are linked with fatigue and reduced performance.
warm-up|热身|preparation raising body temperature and readiness before activity|mobilisation;activation||A warm-up should be progressive and activity-specific.
cool-down|放松整理|low-intensity activity after exercise aiding gradual recovery|recovery exercise;stretching||It helps the body return toward resting state.
specificity|专项性|training principle requiring practice to match activity demands|sport-specific training;SAID principle||Training should match muscles movements energy system and skills.
progressive overload|渐进超负荷|gradually increasing training demand to stimulate adaptation|training load;adaptation||Overload should be sufficient but safe.
reversibility|可逆性|loss of training adaptation when training stops or is reduced|detraining;fitness loss||Fitness gains are not permanent without continued stimulus.
rest and recovery|休息与恢复|time allowing repair adaptation and reduced fatigue after training|recovery period;overtraining||Too little recovery can reduce performance and increase injury risk.
periodisation|周期化训练|planning training in phases to peak at an appropriate time|training cycle;competition peak||It varies volume intensity and recovery across a season.
skill|技能|a learned ability to perform a task effectively and consistently|motor skill;technique||Skills can be classified in several overlapping ways.
open skill|开放性技能|a skill performed in changing unpredictable environments|game situation;external pacing||Performers must adapt to opponents or conditions.
closed skill|封闭性技能|a skill performed in stable predictable environments|self-paced skill;routine||It can be planned and repeated consistently.
feedback|反馈|information about performance used to improve future attempts|intrinsic feedback;extrinsic feedback||Feedback is most useful when specific and actionable.
intrinsic motivation|内在动机|participation driven by enjoyment interest or personal satisfaction|self-determination;enjoyment||It can support long-term commitment.
extrinsic motivation|外在动机|participation driven by external rewards pressure or recognition|reward;competition||External rewards can help or undermine sustained engagement.
    `),
  },
  {
    subject: "art-design", topic: "igcse-art-design-visual-language-and-process", label: "IGCSE Art & Design: Visual Language & Process",
    stage: "IGCSE",
    note: "用于视觉分析、媒材、艺术家研究、创作过程和作品集评价题。",
    example: "An Art & Design question uses {word}. Refer to visible evidence and materials, then explain the intended effect or development choice.",
    translation: "艺术与设计题涉及{meaning}。引用可见证据和媒材，再解释预期效果或发展选择。",
    terms: parseTerms(`
composition|构图|arrangement of visual elements within an artwork or design|visual arrangement;picture plane||Composition directs attention balance and movement.
focal point|视觉焦点|area designed to attract attention first|visual emphasis;dominant feature||Contrast placement and scale can create a focal point.
visual hierarchy|视觉层级|order in which viewers notice and interpret visual elements|dominance;subordination||Hierarchy can be shaped by scale colour contrast and placement.
line|线条|a mark or path with direction length and quality|contour line;expressive line||Line can define form movement texture or emotion.
shape|形状|a two-dimensional enclosed area|geometric shape;organic shape||Shapes can be positive or negative and may create pattern.
form|形体|a three-dimensional or apparently three-dimensional visual structure|sculptural form;volume||Tone perspective and modelling can suggest form.
texture|质感|surface quality that is actual or visually implied|tactile texture;visual texture||Texture can create realism contrast or expressive effect.
tone|明暗调子|relative lightness or darkness of a colour or surface|tonal range;shading||Tone can create depth atmosphere and focal contrast.
colour theory|色彩理论|principles explaining relationships and effects of colours|colour wheel;colour harmony||Colour choices can communicate mood hierarchy and identity.
hue|色相|the basic name or family of a colour|primary hue;warm hue||Hue is distinct from tone saturation and value.
saturation|饱和度|intensity or purity of a colour|muted colour;vivid colour||High saturation can create emphasis or energy.
contrast|对比|difference between visual elements such as colour tone scale or texture|tonal contrast;complementary contrast||Contrast can create emphasis and visual tension.
pattern|图案|repetition of visual elements in an organised way|repeated motif;surface pattern||Pattern can create rhythm unity or decoration.
motif|视觉母题|a repeated visual element carrying meaning or creating unity|recurring image;symbolic motif||Motifs gain significance through repetition and variation.
negative space|负空间|space around and between forms|background shape;visual balance||Negative space can define shape and improve composition.
perspective|透视法|methods creating the illusion of depth on a flat surface|linear perspective;vanishing point||Perspective controls scale and spatial recession.
proportion|比例|relationship of sizes between parts of an image object or figure|scale relation;figure proportion||Changing proportion can create realism distortion or emphasis.
scale|尺度|size of an object or artwork relative to another reference|large scale;miniature||Scale affects impact intimacy and meaning.
medium|媒材|material or method used to make an artwork|mixed media;art material||Medium shapes texture process permanence and audience response.
mixed media|综合媒材|artwork combining more than one material or process|collage;layering||Mixing media can create contrast and experimental surfaces.
collage|拼贴|artwork made by assembling materials onto a surface|found material;cut paper||Collage can combine images textures and cultural references.
printmaking|版画制作|making images by transferring ink from a prepared surface|relief print;screen print||Printmaking can produce editions and varied marks.
photography|摄影|making images by recording light with a camera or light-sensitive process|photographic composition;exposure||Photographs still involve framing selection and editing.
aperture|光圈|opening in a camera lens controlling amount of light and depth of field|f-stop;depth of field||A wider aperture can blur backgrounds.
exposure|曝光|amount of light reaching a camera sensor or film|shutter speed;ISO||Exposure combines aperture shutter speed and sensitivity.
sketchbook|速写本|a record of observations experiments annotations and design development|visual research;idea development||A sketchbook should show purposeful progression.
annotation|注释说明|written notes explaining observation research choices and evaluation|artist analysis;reflection||Annotations should connect evidence to decisions.
artist research|艺术家研究|study of an artist's context methods themes and visual language|contextual research;artist influence||Research should inform rather than copy personal work.
primary research|一手研究|original observation recording photography drawing or experiment made by the student|direct observation;first-hand source||Primary research gives personal visual evidence.
secondary research|二手研究|information or images taken from existing books websites archives or sources|reference image;contextual source||Sources must be selected critically and acknowledged.
experimentation|实验探索|purposeful testing of media techniques materials or compositions|material trial;visual experiment||Experiments should lead to evaluated development.
refinement|深化完善|improving selected ideas through testing feedback and iteration|developed outcome;visual decision||Refinement should show why choices were kept or changed.
curation|策展|selection and arrangement of works for display and interpretation|exhibition layout;viewer journey||Curation shapes sequence context and audience experience.
    `),
  },
  {
    subject: "drama", topic: "igcse-drama-performance-and-design", label: "IGCSE Drama: Performance & Design",
    stage: "IGCSE",
    note: "用于表演、导演、舞台设计、戏剧结构和观众效果题。",
    example: "A Drama question uses {word}. State the practical staging choice and explain its effect on the audience at that moment.",
    translation: "戏剧题涉及{meaning}。说明实际舞台选择，并解释它在该时刻对观众的效果。",
    terms: parseTerms(`
blocking|走位调度|planned movement and positioning of performers on stage|stage movement;spatial relationship||Blocking can show status conflict focus and relationships.
proxemics|空间距离|use of distance and position between performers and audience|personal space;stage distance||Changing distance can communicate intimacy threat or power.
levels|舞台高低层次|use of height or vertical position in performance|standing;seated;platform||Levels can create visual hierarchy and status.
gesture|手势|purposeful movement of hands arms or body conveying meaning|physical expression;body language||A gesture should be clear motivated and appropriate to character.
facial expression|面部表情|use of the face to communicate thought feeling or reaction|eye contact;expression||Facial expression must be visible and controlled for the performance space.
posture|姿态|way a performer holds and positions the body|physicality;body tension||Posture can reveal character confidence age mood or status.
gait|步态|a characteristic way of walking used to create character|character walk;physical characterisation||Gait should be sustainable and linked to motivation.
voice projection|声音投射|using breath resonance and articulation so speech reaches an audience|audibility;breath control||Projection is not simply shouting.
articulation|清晰吐字|clear production of speech sounds so words can be understood|diction;clarity||Articulation is important when pace or accent changes.
pace|节奏速度|speed at which speech or action is performed|dramatic pacing;tempo||Pace can build tension urgency comedy or reflection.
pause|停顿|a deliberate moment of silence in speech or action|dramatic pause;timing||Pauses can reveal thought create tension or direct attention.
pitch|音高|highness or lowness of the voice|vocal variety;high pitch||Pitch can communicate emotion age status or tension.
tone|语气|quality or attitude carried in the voice|sarcastic tone;warm tone||Tone changes audience interpretation of the same words.
volume|音量|loudness of a performer's voice|quiet voice;vocal emphasis||Volume should serve character and audience audibility.
emphasis|重音|stress placed on a word phrase movement or moment|key word;dramatic focus||Emphasis can change meaning and guide audience attention.
stillness|静止|purposeful absence of movement in performance|frozen moment;physical focus||Stillness can create tension focus or contrast.
freeze frame|定格画面|a static staged image showing a key moment or relationship|tableau;dramatic image||A freeze frame communicates through levels facial expression and proxemics.
tableau|舞台定格造型|a carefully composed static stage picture|stage image;freeze frame||Tableaux can establish context or highlight a turning point.
thought tracking|内心独白追踪|speaking a character's thoughts aloud during a paused scene|inner thought;drama strategy||It exposes subtext not heard in ordinary dialogue.
hot seating|角色访谈|questioning a performer in role to explore character perspective|role interview;character motivation||Answers should remain consistent with the text and interpretation.
role on the wall|角色墙|a visual method recording a character's outer traits and inner thoughts|character analysis;drama strategy||It helps separate public behaviour from private motivation.
improvisation|即兴表演|creating action or dialogue spontaneously within a dramatic framework|devising;spontaneous performance||Improvisation still needs purpose character and focus.
devising|创作排演|creating original theatre from ideas research stimulus and rehearsal|devised piece;creative process||Devising requires selection structure and refinement.
stimulus|创作刺激材料|an image text object issue or event used to generate drama|creative starting point;research||A stimulus should lead to researched dramatic choices.
narration|叙述|spoken information guiding audience understanding outside direct action|storytelling;commentary||Narration can compress time give context or create distance.
flashback|倒叙|scene showing an earlier event within a present narrative|non-linear structure;past event||Flashbacks can reveal motivation or reframe the present.
dramatic irony|戏剧性反讽|tension created when audience knows more than a character|audience knowledge;suspense||It can create humour dread or sympathy.
climax|高潮|point of greatest tension or decisive change in a drama|turning point;dramatic peak||The climax should be built through prior action and stakes.
denouement|结局收束|events resolving or showing consequences after the climax|resolution;aftermath||A denouement can close or deliberately leave questions.
fourth wall|第四堵墙|imaginary boundary between performers and audience in realistic theatre|audience address;naturalism||Breaking it changes the relationship with spectators.
theatre in the round|四面舞台|performance space with audience surrounding the acting area|arena staging;multiple sightlines||Staging must consider visibility from all sides.
end-on staging|镜框式舞台|stage arrangement with audience facing one side of the acting area|proscenium;frontal staging||It allows controlled pictures but creates a clear audience boundary.
lighting design|灯光设计|planned use of intensity colour direction and timing of light|spotlight;lighting cue||Lighting can guide focus create mood and mark transitions.
sound design|音响设计|planned use of music effects silence and amplification|sound cue;underscoring||Sound can establish setting rhythm memory or tension.
costume|服装设计|clothing and accessories used to communicate character period and status|costume detail;visual characterisation||Costume choices should support movement and interpretation.
set design|布景设计|physical visual environment created for a production|scenic design;stage environment||A set can establish place mood symbolism and practical acting areas.
    `),
  },
  {
    subject: "music", topic: "igcse-music-elements-and-performance", label: "IGCSE Music: Elements & Performance",
    stage: "IGCSE",
    note: "用于听辨、乐谱、音乐元素、作曲、演奏与历史语境题。",
    example: "A Music question uses {word}. Identify the audible evidence, then explain its role in style, structure or expression.",
    translation: "音乐题涉及{meaning}。指出可听见的证据，再解释它在风格、结构或表达中的作用。",
    terms: parseTerms(`
melody|旋律|a succession of pitches perceived as a musical line|melodic shape;tune||Analyse contour range intervals and phrasing.
motif|动机|a short recurring musical idea|recurring figure;musical cell||A motif can unify a work through repetition and transformation.
phrase|乐句|a musical unit forming a recognisable section of a melody|antecedent phrase;cadential phrase||Phrases often create question-and-answer patterns.
rhythm|节奏|pattern of note durations and silences in music|rhythmic pattern;beat||Rhythm works with metre tempo and articulation.
metre|拍子|regular grouping of beats into bars|duple metre;triple metre||Metre shapes accents and dance or march character.
tempo|速度|speed of the musical beat|allegro;adagio;tempo marking||Tempo affects energy mood and performance difficulty.
syncopation|切分节奏|accenting a weak beat or off-beat|offbeat rhythm;displaced accent||Syncopation can create drive instability or dance feel.
polyrhythm|复节奏|simultaneous use of contrasting rhythmic patterns|cross-rhythm;layered rhythm||It creates complexity and rhythmic tension.
dynamics|力度|variation in loudness in music|crescendo;forte;piano||Dynamics shape contrast phrase direction and emotional intensity.
articulation|演奏法|manner in which notes are started sustained or separated|staccato;legato;accent||Articulation changes texture energy and character.
texture|织体|how melodic harmonic and rhythmic layers combine|monophonic;homophonic;polyphonic||Texture can thicken thin or contrast across a piece.
monophonic|单音织体|one melodic line without harmonic accompaniment|unison melody;single line||Several performers in unison can still create monophonic texture.
homophonic|主调织体|one main melody supported by accompaniment|melody and accompaniment;chords||The accompaniment supports the melodic foreground.
polyphonic|复调织体|two or more independent melodic lines sounding together|counterpoint;imitation||Lines should retain individual shape and interest.
harmony|和声|simultaneous combination and progression of pitches|chord progression;harmonic rhythm||Harmony can create stability tension and direction.
chord|和弦|three or more pitches sounding together|triad;seventh chord||Chord quality depends on intervals above the root.
tonality|调性|organisation of music around a tonic pitch and key|major key;minor key||Tonality creates expectations of departure and return.
modulation|转调|movement from one key centre to another|key change;pivot chord||Modulation can create contrast development or structural arrival.
cadence|终止式|harmonic progression creating a sense of pause or closure|perfect cadence;imperfect cadence||Cadences can confirm or delay tonal resolution.
timbre|音色|distinctive quality of a sound or instrument|tone colour;instrumentation||Timbre depends on spectrum attack and playing technique.
instrumentation|配器|selection and combination of instruments in a musical work|orchestration;instrumental colour||Instrumentation affects balance register texture and style.
register|音区|range area from low to high in which notes or instruments sound|high register;low register||Register can affect brightness weight and tension.
form|曲式|overall structural organisation of a piece|binary form;ternary form||Form guides repetition contrast and listener expectation.
binary form|二段体|form with two main sections often labelled AB|two-part form;contrasting section||Sections may repeat or return in varied form.
ternary form|三段体|form with three sections in an ABA pattern|return section;three-part form||The return creates balance after contrast.
rondo form|回旋曲式|form with a recurring main section alternating with episodes|ABACA;refrain||The refrain provides familiar structural return.
theme and variations|主题与变奏|form presenting a theme followed by altered versions|variation technique;ornamentation||Variations can change rhythm harmony texture tempo or mode.
ostinato|固定音型|a short repeated rhythmic or melodic pattern|repeating bass;riff||Ostinati can provide drive unity or tension.
drone|持续低音|a sustained or repeated pitch supporting music|pedal note;bagpipe drone||A drone can create modal or folk associations.
imitation|模仿|repetition of a melodic idea in another voice or part|canon;entry||Imitation can build polyphonic texture.
counterpoint|对位|relationship between independent melodies sounding together|contrapuntal texture;voice leading||Counterpoint balances independence with harmonic coherence.
improvisation|即兴演奏|creating music spontaneously within a style or framework|solo improvisation;riff||Improvisation uses listening memory and stylistic vocabulary.
notation|乐谱记谱|written symbols representing pitch rhythm expression and performance instructions|staff notation;score||Notation communicates but may not capture every performance detail.
ensemble|合奏|group of musicians performing together|chamber ensemble;band||Ensemble performance requires balance listening and coordination.
rehearsal|排练|structured practice preparing a performance|sectional rehearsal;performance preparation||Rehearsal should identify specific technical and expressive goals.
    `),
  },
  {
    subject: "religious-studies", topic: "alevel-religious-studies-philosophy-and-ethics", label: "A-Level Religious Studies: Philosophy & Ethics",
    stage: "AS",
    note: "用于宗教、哲学、伦理理论、论证与评价题。",
    example: "A Religious Studies question uses {word}. Define the claim, present supporting reasoning, then assess a serious objection.",
    translation: "宗教研究题涉及{meaning}。定义主张，提出支持论证，再评价重要反驳。",
    terms: parseTerms(`
theism|有神论|belief that a personal or impersonal divine being exists|belief in God;religious faith||Theism takes different forms across traditions.
atheism|无神论|lack of belief in or denial of the existence of deities|non-belief;secular worldview||Atheism can be based on different philosophical arguments.
agnosticism|不可知论|the view that knowledge of whether God exists is unavailable or uncertain|suspension of judgement;religious knowledge||Agnosticism concerns knowledge and may coexist with belief or non-belief.
revelation|启示|belief that divine truth is disclosed to humans|scripture;religious experience||Revelation may be understood as public or personal.
religious experience|宗教体验|an experience interpreted as involving a divine or transcendent reality|mystical experience;conversion||Interpretation and alternative explanations are central to evaluation.
mysticism|神秘主义|pursuit or report of direct union with ultimate reality|ineffability;unity||Mystical claims often stress difficulty of verbal description.
faith|信仰|trust commitment or belief not wholly based on empirical proof|religious commitment;belief||Faith may include reason experience tradition or practice.
reason|理性|use of logic evidence and argument to reach justified conclusions|rational argument;logical inference||Reasoning depends on valid premises and coherent steps.
empiricism|经验主义|the view that knowledge is grounded mainly in sensory experience|empirical evidence;observation||Empiricists question claims lacking observable support.
rationalism|理性主义|the view that reason can provide important knowledge independent of experience|a priori knowledge;deduction||Rationalists emphasise logical necessity and concepts.
a priori|先验的|known independently of particular sensory experience|necessary truth;reason||A priori claims are often contrasted with empirical claims.
a posteriori|后验的|known through experience observation or evidence|empirical claim;experience||A posteriori claims may be revised by new evidence.
deductive argument|演绎论证|argument in which a valid form makes conclusion follow necessarily from premises|valid inference;syllogism||A valid argument can still have false premises.
inductive argument|归纳论证|argument drawing probable conclusions from observations or evidence|probability;generalisation||Induction gives support rather than certainty.
validity|有效性|property of an argument whose conclusion follows logically from its premises|valid argument;logical form||Validity concerns form not whether premises are true.
soundness|健全性|property of an argument that is valid and has true premises|sound argument;true premises||A sound argument guarantees a true conclusion.
teleological argument|目的论证|argument inferring God from apparent order purpose or fine-tuning|design argument;fine-tuning||Critics question analogy probability and alternative explanations.
cosmological argument|宇宙论证|argument inferring a first cause or necessary being from existence or causation|first cause;necessary being||It raises questions about infinite regress and cause.
ontological argument|本体论证|argument attempting to infer God's existence from the concept of God|necessary existence;definition||Critics challenge whether existence is a predicate.
problem of evil|恶的问题|challenge of reconciling suffering with an all-powerful all-good God|logical problem;evidential problem||Responses include free will soul-making and sceptical theism.
theodicy|神义论|attempt to justify belief in God despite evil and suffering|free will defence;soul-making||A theodicy is assessed for coherence and moral adequacy.
free will|自由意志|capacity to make meaningful choices not wholly determined by external causes|moral responsibility;choice||Free will is central to some ethical and theological arguments.
determinism|决定论|view that events including human actions are caused by prior conditions or laws|causal necessity;free choice||Determinism raises questions about responsibility and punishment.
utilitarianism|功利主义|ethical theory judging actions by consequences for overall wellbeing|greatest happiness;utility||It must define whose wellbeing and how outcomes are measured.
deontology|义务论|ethical theory emphasising duties rules or rights rather than consequences alone|Kantian ethics;universal duty||It can conflict with intuition where duties collide.
virtue ethics|德性伦理|ethical theory focusing on character and human flourishing|virtue;practical wisdom||It asks what a good person would characteristically do.
natural law|自然法|ethical approach grounding moral rules in human nature purpose and reason|primary precepts;teleology||Critics challenge its assumptions about nature and purpose.
applied ethics|应用伦理|use of ethical theory to assess real practical issues|medical ethics;business ethics||Good answers apply principles to relevant facts and stakeholders.
sanctity of life|生命神圣性|belief that human life has special intrinsic value|life ethics;religious value||It may conflict with autonomy or quality-of-life arguments.
quality of life|生命质量|assessment of wellbeing functioning and experience in ethical decisions|medical ethics;patient welfare||It requires care to avoid discriminatory assumptions.
conscience|良知|inner moral awareness guiding judgement or action|moral intuition;ethical decision||The source and reliability of conscience are debated.
justice|正义|fair treatment distribution rights and procedures within society|social justice;fairness||Different theories prioritise equality liberty or desert differently.
    `),
  },
  {
    subject: "information-technology", topic: "igcse-information-technology-systems-and-data", label: "IGCSE Information Technology: Systems & Data",
    stage: "IGCSE",
    note: "用于 IT 系统、数据库、电子表格、网络、安全、项目实施和数字社会题。",
    example: "An Information Technology question uses {word}. Explain the information flow, user need and one control or limitation.",
    translation: "信息技术题涉及{meaning}。解释信息流、用户需求以及一项控制或限制。",
    terms: parseTerms(`
information system|信息系统|people procedures data hardware software and networks working together to process information|system components;business information||A system should meet user and organisational needs.
data|数据|raw facts symbols measurements or observations before interpretation|raw data;data entry||Data becomes information when processed in context.
information|信息|processed data that is meaningful and useful for a purpose|decision-making;useful output||Useful information should be accurate relevant timely and complete.
input|输入|data or instructions entered into a system for processing|data capture;input device||Input methods should suit the data volume and user context.
process|处理|operations transforming input data into meaningful output|data processing;calculation||Processing may include sorting calculating validating and storing.
output|输出|information produced by a system for users or other systems|screen output;printed report||Output should be fit for audience and purpose.
storage|存储|keeping data and programs for later retrieval and use|secondary storage;cloud storage||Storage choice affects capacity speed cost and security.
database|数据库|organised collection of related data managed for retrieval and update|database table;DBMS||A database reduces duplication and supports queries.
database management system|数据库管理系统|software for creating storing querying and controlling databases|DBMS;data integrity||A DBMS manages permissions relationships and backup.
field|字段|one category of data stored for each record|data field;column||Fields need suitable names types and validation.
record|记录|a complete set of related fields about one entity|database row;data record||Each record normally describes one instance.
primary key|主键|field or fields uniquely identifying each database record|unique identifier;record key||A primary key should be unique and stable.
validation|验证|automatic checking that input data meets rules before acceptance|range check;format check||Validation reduces some entry errors but cannot ensure truth.
verification|核对|checking that entered data matches the original source|double entry;proofreading||Verification checks transcription rather than plausibility.
range check|范围检查|validation ensuring a value lies between allowed limits|validation rule;permitted value||A range check cannot prove the value is correct.
format check|格式检查|validation ensuring data follows a required pattern|date format;email pattern||A format check accepts a plausible shape not necessarily a real value.
presence check|存在检查|validation ensuring a required field is not left empty|required field;mandatory input||It does not test correctness of the entered value.
lookup check|查找检查|validation comparing input with an approved list of values|drop-down list;valid code||It improves consistency and can reduce typing errors.
spreadsheet|电子表格|software organising data in cells for calculation analysis and charts|worksheet;cell reference||Spreadsheets support models that update when inputs change.
formula|公式|an expression calculating a result from cell values|cell reference;calculation||Formulas should use correct references and be tested.
relative reference|相对引用|cell reference that changes when copied to another location|copy formula;relative cell||Relative references support repeated calculations.
absolute reference|绝对引用|cell reference that remains fixed when copied|fixed cell;$A$1||Absolute references are useful for constants and lookup tables.
function|函数|predefined spreadsheet operation such as SUM AVERAGE or IF|logical function;calculation||Functions reduce repeated manual formulas.
sort|排序|arranging records into an order based on a field|ascending order;descending order||Sorting changes display order rather than the underlying values.
filter|筛选|showing only records meeting specified criteria|query result;selection||Filtering helps users focus on relevant records.
query|查询|request to retrieve selected data from a database|search criteria;query result||Good queries use explicit fields and conditions.
mail merge|邮件合并|combining a template with data records to create personalised documents|form letter;data source||It reduces repeated editing for many recipients.
network|网络|connected devices able to exchange data and share resources|LAN;WAN;network service||Network design affects access speed security and reliability.
cloud computing|云计算|delivery of computing storage or software services over networks|cloud storage;online service||Cloud services need connection security and provider trust.
cybersecurity|网络安全|protection of systems networks and data from unauthorised access or harm|security control;cyber risk||Security combines people processes and technology.
malware|恶意软件|software designed to damage disrupt spy on or gain unauthorised access|virus;ransomware||Users need prevention detection backup and response controls.
phishing|网络钓鱼|deceptive messages attempting to obtain credentials or sensitive data|fraud email;social engineering||Check sender context links and unusual requests.
encryption|加密|transforming data so only authorised parties can read it|encryption key;secure transmission||Encryption protects confidentiality but needs key management.
backup|备份|separate copy of data used to restore after loss or corruption|backup schedule;recovery||Backups should be tested and protected from the same failure.
access control|访问控制|rules limiting who can view change or use system resources|user permissions;least privilege||Access should match job roles and be reviewed.
    `),
  },
  {
    subject: "travel-tourism", topic: "igcse-travel-tourism-destinations-and-sustainability", label: "IGCSE Travel & Tourism: Destinations & Sustainability",
    stage: "IGCSE",
    note: "用于旅游需求、目的地、行业运营、影响、营销和可持续性题。",
    example: "A Travel & Tourism question uses {word}. Apply it to the destination or business, then evaluate who benefits and who bears the cost.",
    translation: "旅游与酒店管理题涉及{meaning}。把它用于目的地或企业，再评价谁受益、谁承担成本。",
    terms: parseTerms(`
tourism|旅游业|travel away from usual surroundings for leisure business or other purposes|tourist activity;visitor economy||Tourism involves visitors destinations businesses and host communities.
tourist|游客|person travelling outside usual environment for a temporary purpose|visitor profile;tourist demand||Tourist needs and spending patterns vary by purpose and market.
destination|旅游目的地|place visited by tourists with attractions services and access|destination management;visitor appeal||A destination combines physical cultural and service features.
attraction|旅游吸引物|feature drawing visitors to a destination|natural attraction;cultural attraction||Attractions may be primary or secondary and need management.
accessibility|可达性|ease with which visitors can reach and move around a destination|transport link;barrier-free access||Accessibility affects market size inclusion and carrying pressure.
amenities|配套设施|services and facilities supporting visitors such as accommodation food and toilets|visitor facilities;tourism service||Amenities affect satisfaction length of stay and spending.
accommodation|住宿设施|place providing overnight stay for visitors|hotel;hostel;resort||Accommodation choice depends on price quality location and market segment.
hospitality|接待服务业|service of welcoming and looking after guests|customer service;guest experience||Hospitality quality influences satisfaction and repeat visits.
inbound tourism|入境旅游|visits to a country by non-residents|international arrivals;foreign visitor||It can bring export earnings and foreign-currency income.
outbound tourism|出境旅游|residents travelling to other countries|overseas travel;resident visitor||It creates spending outflows from the home economy.
domestic tourism|国内旅游|travel by residents within their own country|local holiday;home tourism||Domestic tourism can support regions throughout the year.
seasonality|季节性|predictable variation in visitor numbers across the year|peak season;off season||Seasonality affects staffing prices capacity and local income.
carrying capacity|旅游承载力|maximum visitor use a destination can sustain without unacceptable damage|visitor limit;site capacity||Capacity includes environmental social and infrastructure limits.
sustainable tourism|可持续旅游|tourism managed to meet present needs without harming future destination resources|responsible travel;long-term tourism||It balances visitor experience business viability and community/environment.
ecotourism|生态旅游|responsible travel focused on natural areas conservation and local benefit|nature tourism;conservation tourism||Ecotourism claims need evidence of low impact and local benefit.
cultural tourism|文化旅游|travel motivated by heritage arts traditions food or local ways of life|heritage site;cultural experience||It can support preservation but risk commodification.
mass tourism|大众旅游|large-scale tourism involving high visitor volumes and standardised services|package holiday;resort tourism||It can bring revenue but pressure infrastructure and environments.
independent travel|自助旅行|travel planned and organised by the traveller rather than a package provider|self-guided travel;flexible itinerary||Independent travellers may seek flexibility and local experiences.
package holiday|包价旅游|trip combining services such as transport accommodation and activities for one price|tour operator;inclusive package||Packages can reduce planning risk but limit flexibility.
tour operator|旅行社运营商|business assembling and selling travel products or packages|tourism supplier;package organiser||Operators coordinate suppliers and manage risk.
travel agent|旅行代理商|intermediary advising customers and booking travel products|booking service;travel advice||Agents match products to customer needs and earn commission.
itinerary|行程安排|planned sequence of travel activities transport and accommodation|travel schedule;visitor programme||A good itinerary balances timing interest cost and feasibility.
marketing|市场营销|activities identifying promoting and delivering value to target customers|promotion;market research||Tourism marketing uses image segmentation channels and service quality.
market segment|市场细分|group of customers with similar needs or characteristics|target market;visitor profile||Segmentation supports focused products and communication.
brand image|品牌形象|associations customers hold about a destination or tourism business|destination brand;reputation||Image can be shaped by media experience and word of mouth.
customer service|客户服务|assistance and care provided before during and after purchase|service quality;complaint handling||Consistent service affects loyalty reviews and reputation.
visitor satisfaction|游客满意度|degree to which an experience meets or exceeds visitor expectations|guest feedback;service quality||Satisfaction depends on expectations as well as actual quality.
economic impact|经济影响|effect of tourism on income jobs spending investment and prices|tourism revenue;employment||Impacts can be direct indirect and induced.
multiplier effect|乘数效应|additional economic activity created when tourism spending circulates locally|local spending;income multiplier||Leakage reduces the multiplier retained in the destination.
leakage|收益外流|tourism income leaving a destination through imports foreign ownership or external workers|economic leakage;local benefit||High leakage reduces benefits for host communities.
employment|就业|jobs created or supported by tourism businesses and linked sectors|seasonal work;tourism job||Jobs vary in quality security skills and local access.
social impact|社会影响|effect of tourism on community life values services and relationships|community impact;resident attitude||Impacts can be positive negative and unevenly shared.
environmental impact|环境影响|effect of tourism on ecosystems resources pollution and landscapes|visitor pressure;conservation impact||Impact depends on scale behaviour infrastructure and management.
heritage conservation|遗产保护|protection of cultural or natural heritage for future generations|site management;preservation||Tourism revenue can help conservation but visitor use can cause damage.
stakeholder|利益相关者|person or group affected by or able to influence tourism decisions|local resident;business;government||Evaluation should compare stakeholder interests and power.
visitor management|游客管理|planning and controls that guide visitor numbers behaviour routes and timing at a destination|visitor flow;site management||Good visitor management protects experience safety and sensitive places.
responsible tourism|负责任旅游|tourism choices and operations that reduce harm and increase benefits for host communities and environments|ethical travel;local benefit||Claims should be tested against real labour environmental and community outcomes.
online travel platform|在线旅游平台|digital service enabling users to search compare book and review travel products|digital booking;online review||Platforms improve reach and convenience but can charge commission and shape visibility.
    `),
  },
];

groups.push(...igAlevelFurtherSubjectGroups);

const igAlevelAppliedSubjectGroups = [
  {
    subject: "global-perspectives", topic: "igcse-global-perspectives-research-and-action", label: "IGCSE Global Perspectives: Research & Action",
    stage: "IGCSE",
    note: "用于全球议题、研究问题、证据分析、多元视角和行动项目题。",
    example: "A Global Perspectives question uses {word}. Evaluate the evidence and perspectives, then justify a realistic action.",
    translation: "全球视野题涉及{meaning}。评价证据与不同视角，再论证一个可行行动。",
    terms: parseTerms(`
global issue|全球议题|a problem or development affecting people across countries or requiring international cooperation|global challenge;shared problem||Global issues have local national and international dimensions.
local perspective|地方视角|a viewpoint shaped by experiences needs or evidence within a community|community view;local impact||A local perspective may differ from national or global priorities.
national perspective|国家视角|a viewpoint shaped by a country's interests policies culture or evidence|government policy;national interest||National perspectives can conflict even on shared issues.
global perspective|全球视角|a viewpoint considering interconnected effects across countries and populations|international cooperation;global impact||It should not erase local differences and power imbalances.
stakeholder|利益相关者|a person or group affected by or able to influence an issue or decision|community group;decision-maker||Stakeholders can have unequal power and competing interests.
research question|研究问题|a focused question guiding investigation and evidence collection|enquiry question;research focus||A strong question is specific researchable and open to evidence.
claim|主张|a statement or conclusion requiring evidence and reasoning|argument claim;position||A claim should be precise enough to evaluate.
evidence|证据|information used to support or challenge a claim|data;source evidence||Evidence must be relevant reliable and interpreted.
source|资料来源|a document person dataset image or other origin of information|primary source;secondary source||Source type purpose and date affect evaluation.
primary research|一手研究|information collected directly for a particular investigation|survey;interview;observation||Methods need consent sampling and bias controls.
secondary research|二手研究|information taken from existing publications databases or reports|published report;literature review||Secondary sources should be cross-checked and cited.
reliability|可靠性|the extent to which evidence or a method produces dependable information|reliable source;consistent data||Reliability depends on method provenance and corroboration.
validity|有效性|the extent to which evidence or research measures what it claims to measure|valid conclusion;research design||A reliable measure can still lack validity.
bias|偏差|a systematic tendency favouring a viewpoint or distorting evidence|selection bias;source bias||Bias may arise from funding language sampling or assumptions.
corroboration|相互印证|support for a claim from independent evidence or sources|cross-checking;multiple sources||Sources that copy one another are not independent corroboration.
counterargument|反方论证|a reason or evidence challenging a claim or proposed action|alternative view;objection||Addressing counterarguments strengthens evaluation.
assumption|假设|an idea accepted without sufficient proof in an argument or plan|hidden assumption;research assumption||Assumptions should be made explicit and tested.
causation|因果关系|a relationship in which one factor helps produce another outcome|causal mechanism;cause and effect||Correlation alone does not establish causation.
correlation|相关性|a statistical association between variables without necessarily proving cause|positive correlation;data pattern||A third factor may explain the association.
generalisation|概括推广|a conclusion extended from evidence to a wider group or context|sample population;broader claim||Generalisation depends on sample quality and context.
sampling|抽样|selecting people cases or data from a wider population for research|random sample;sample frame||Sampling choices affect representativeness and bias.
questionnaire|问卷|a written set of questions used to collect standardised responses|survey design;closed question||Question wording and response options can bias answers.
interview|访谈|a method gathering information through spoken questions and responses|structured interview;participant voice||Interviews provide depth but can be influenced by interviewer effects.
observation|观察法|systematic watching and recording of behaviour events or conditions|field observation;observation schedule||Observers need clear criteria and ethical safeguards.
data analysis|数据分析|organising interpreting and evaluating information to answer a question|trend analysis;data interpretation||Analysis should distinguish patterns from unsupported claims.
quantitative data|定量数据|numerical data that can be counted measured or statistically analysed|survey results;statistical data||Quantitative data can show scale but may lack explanations.
qualitative data|定性数据|non-numerical data about meanings experiences or descriptions|interview response;case study||Qualitative data can add depth but may be hard to generalise.
perspective|视角|a way of seeing an issue shaped by values experience position and evidence|contrasting view;worldview||Compare why perspectives differ rather than only listing them.
interdependence|相互依赖|a situation in which people places or systems affect and rely on one another|global connection;supply chain||Interdependence can create benefits vulnerabilities and responsibilities.
sustainability|可持续性|meeting present needs while maintaining resources and opportunities for the future|long-term impact;sustainable solution||Evaluate environmental social and economic dimensions together.
action plan|行动计划|a structured proposal stating what will be done by whom when and how success will be measured|project plan;success criteria||A good plan includes resources risks monitoring and evaluation.
feasibility|可行性|the practical possibility of carrying out a proposal with available time resources and support|realistic action;implementation||A desirable solution may not be feasible at the proposed scale.
impact assessment|影响评估|systematic consideration of likely effects of an action or policy|intended effect;unintended consequence||Assess who benefits who loses and how effects are measured.
reflection|反思|critical review of learning decisions evidence and outcomes|project reflection;learning evaluation||Reflection should identify specific improvements rather than only feelings.
    `),
  },
  {
    subject: "marine-science", topic: "alevel-marine-science-oceans-and-ecosystems", label: "A-Level Marine Science: Oceans & Ecosystems",
    stage: "AS",
    note: "用于海洋物理化学、生态、生产力、污染、渔业和保护题。",
    example: "A Marine Science question uses {word}. Use the measured conditions and biological evidence to explain the marine-system outcome.",
    translation: "海洋科学题涉及{meaning}。利用测得条件与生物证据解释海洋系统结果。",
    terms: parseTerms(`
ocean basin|洋盆|a large low area of Earth's surface filled by ocean water|ocean floor;marine region||Ocean basins differ in depth geology circulation and productivity.
continental shelf|大陆架|shallow submerged edge of a continent extending from the coast|shallow sea;coastal shelf||Shelves are often productive and heavily used by fisheries.
continental slope|大陆坡|steep zone descending from the continental shelf to deep ocean|deep-sea margin;submarine slope||It links shallow shelf environments to the deep ocean.
abyssal plain|深海平原|very flat extensive region of deep ocean floor|deep-sea habitat;seafloor||Abyssal environments are cold dark and high-pressure.
salinity|盐度|concentration of dissolved salts in seawater|salt concentration;practical salinity||Salinity affects density osmoregulation and circulation.
thermocline|温跃层|ocean layer where temperature changes rapidly with depth|temperature gradient;water column||A thermocline can limit vertical mixing of nutrients and oxygen.
halocline|盐跃层|ocean layer where salinity changes rapidly with depth|salinity gradient;water column||A halocline contributes to density stratification.
pycnocline|密度跃层|layer where seawater density changes rapidly with depth|density gradient;stratification||Density changes result from temperature and salinity.
stratification|分层|formation of water layers with different density properties|water column;vertical mixing||Strong stratification can reduce nutrient exchange.
upwelling|上升流|movement of deep nutrient-rich water toward the surface|coastal upwelling;marine productivity||Upwelling can support high phytoplankton productivity.
ocean current|洋流|large-scale movement of seawater driven by wind density or tides|surface current;deep circulation||Currents transport heat nutrients organisms and pollutants.
thermohaline circulation|温盐环流|global ocean circulation driven by temperature and salinity differences|deep-water formation;global conveyor||It redistributes heat and influences climate.
tide|潮汐|regular rise and fall of sea level caused mainly by gravitational forces|high tide;low tide||Tides influence intertidal habitats and coastal activity.
spring tide|大潮|tide with a large range occurring when Sun Moon and Earth align|new moon;full moon||Spring tides are not named for the season.
neap tide|小潮|tide with a small range occurring when Sun and Moon act at right angles|quarter moon;tidal range||Neap tides have weaker combined gravitational effects.
wave refraction|波浪折射|bending of waves as different parts slow in shallow water|coastal erosion;wave energy||It can focus energy on headlands and disperse it in bays.
phytoplankton|浮游植物|microscopic photosynthetic organisms drifting in water|primary producer;chlorophyll||They form the base of many marine food webs.
zooplankton|浮游动物|small drifting animals and animal-like organisms in water|consumer;planktonic larvae||Zooplankton feed on phytoplankton or other plankton.
nekton|游泳生物|actively swimming marine organisms able to move independently of currents|fish;squid;marine mammal||Nekton are distinct from drifting plankton and bottom-dwelling benthos.
benthos|底栖生物|organisms living on or in the seabed|benthic community;seafloor||Benthos are affected by sediment oxygen food and disturbance.
intertidal zone|潮间带|shore area exposed at low tide and submerged at high tide|rocky shore;tidal exposure||Organisms must tolerate changing moisture temperature and salinity.
estuary|河口湾|partly enclosed coastal water body where river freshwater mixes with seawater|brackish water;nursery habitat||Estuaries are productive but sensitive to pollution and development.
coral reef|珊瑚礁|marine ecosystem built by calcium-carbonate-producing corals|reef biodiversity;coral bleaching||Reefs need suitable temperature light salinity and water quality.
coral bleaching|珊瑚白化|loss of symbiotic algae or pigments causing corals to whiten and weaken|thermal stress;zooxanthellae||Bleaching can be triggered by heat stress but does not always mean immediate death.
symbiosis|共生关系|close interaction between organisms of different species|mutualism;coral algae||The interaction may benefit one or both partners or harm one.
primary productivity|初级生产力|rate at which producers convert energy into biomass|photosynthesis;carbon fixation||Productivity depends on light nutrients temperature and grazing.
eutrophication|富营养化|nutrient enrichment causing excessive producer growth and possible oxygen depletion|algal bloom;hypoxia||Nutrients can come from sewage fertiliser or aquaculture.
hypoxia|低氧|condition in which dissolved oxygen concentration is too low for many organisms|oxygen depletion;dead zone||Hypoxia can follow decomposition of algal blooms.
ocean acidification|海洋酸化|decrease in ocean pH caused mainly by absorption of carbon dioxide|carbonate chemistry;pH decline||It can reduce carbonate availability for shells and corals.
microplastic|微塑料|small plastic particles present in marine environments|plastic pollution;ingestion||Microplastics can be transported through food webs and sediments.
bioaccumulation|生物累积|build-up of a substance within an organism over time|persistent pollutant;tissue concentration||It depends on uptake storage metabolism and excretion.
biomagnification|生物放大|increase in concentration of a persistent substance at higher trophic levels|food chain;top predator||It occurs when intake exceeds removal at successive trophic levels.
maximum sustainable yield|最大可持续产量|largest long-term catch that can be taken without reducing a population below sustainable levels|fishery management;stock assessment||It depends on uncertain population growth and environmental conditions.
bycatch|混获|non-target organisms caught during fishing|fishing gear;unwanted catch||Bycatch can threaten protected or slow-reproducing species.
marine protected area|海洋保护区|defined marine area managed for conservation and regulated use|no-take zone;marine reserve||Effectiveness depends on design enforcement and community support.
    `),
  },
  {
    subject: "food-nutrition", topic: "igcse-food-nutrition-health-and-science", label: "IGCSE Food & Nutrition: Health & Science",
    stage: "IGCSE",
    note: "用于营养素、膳食设计、烹饪科学、食品安全和食品标签题。",
    example: "A Food & Nutrition question uses {word}. Explain the nutrient or food-science mechanism, then apply it to a safe realistic diet choice.",
    translation: "食品与营养题涉及{meaning}。解释营养或食品科学机制，再用于安全且实际的膳食选择。",
    terms: parseTerms(`
balanced diet|均衡膳食|diet supplying suitable energy nutrients fibre and fluids for an individual's needs|healthy eating;dietary balance||Balance depends on age activity health culture and access to food.
macronutrient|大量营养素|nutrient needed in relatively large amounts including carbohydrate protein and fat|energy nutrient;major nutrient||Macronutrients provide energy or structural material.
micronutrient|微量营养素|vitamin or mineral needed in small amounts for normal body function|vitamin;mineral||Small required amounts do not mean small importance.
carbohydrate|碳水化合物|nutrient including sugars starches and fibre that provides energy|starch;dietary carbohydrate||Choose sources with fibre and consider release of energy.
starch|淀粉|complex carbohydrate made of glucose units and used for energy storage|wholegrain;starchy food||Starch digestion begins through enzymes and varies by processing.
dietary fibre|膳食纤维|plant material not fully digested that supports digestive health|wholegrain;fibre intake||Fibre can support bowel function and satiety.
protein|蛋白质|nutrient made of amino acids used for growth repair enzymes and hormones|essential amino acid;body building||Protein quality and amount depend on amino-acid composition and needs.
essential amino acid|必需氨基酸|amino acid that must be supplied by diet because the body cannot make enough|complete protein;protein quality||Different food sources can complement one another.
fat|脂肪|lipid nutrient providing concentrated energy and supporting cells hormones and vitamin absorption|unsaturated fat;energy store||Type and amount of fat both matter in diet.
saturated fat|饱和脂肪|fat with no carbon-carbon double bonds in its fatty-acid chains|animal fat;solid fat||High intake can be associated with cardiovascular risk in dietary context.
unsaturated fat|不饱和脂肪|fat with one or more carbon-carbon double bonds|mono-unsaturated;polyunsaturated||Unsaturated fats are often liquid at room temperature.
vitamin|维生素|organic micronutrient needed in small amounts for normal metabolism|water-soluble;fat-soluble||Vitamins have specific functions and deficiency effects.
mineral|矿物质营养素|inorganic element needed for body structure or regulation|iron;calcium;iodine||Minerals are not destroyed by heat but can be lost in cooking water.
calcium|钙|mineral important for bones teeth muscle action and blood clotting|bone health;dairy food||Needs vary with growth life stage and health.
iron|铁|mineral needed for haemoglobin and oxygen transport|iron deficiency;anaemia||Vitamin C can improve absorption of plant iron sources.
vitamin C|维生素C|water-soluble vitamin supporting connective tissue and iron absorption|citrus fruit;antioxidant||It can be lost by prolonged heating or soaking.
vitamin D|维生素D|vitamin supporting calcium absorption and bone health|sunlight;bone mineralisation||Diet and sunlight exposure both affect status.
energy balance|能量平衡|relationship between energy intake and energy expenditure|calorie intake;physical activity||Long-term imbalance can change body mass but health is multifactorial.
basal metabolic rate|基础代谢率|energy used by the body at rest to maintain vital functions|resting energy;metabolism||It varies with body size age sex health and body composition.
glycaemic index|血糖生成指数|measure of how quickly carbohydrate food raises blood glucose compared with a reference|GI value;blood sugar||GI is affected by food processing fibre and meal composition.
food label|食品标签|information on packaging about ingredients nutrition allergens storage and claims|nutrition panel;ingredient list||Labels support choices but serving size and claims require interpretation.
ingredient list|配料表|list of ingredients in a food product usually ordered by weight|food ingredient;allergen||Order can indicate relative amount but not overall dietary quality.
allergen|过敏原|substance capable of triggering an allergic immune response in sensitive people|food allergy;allergen label||Cross-contact control is essential for severe allergies.
food hygiene|食品卫生|practices preventing food contamination and foodborne illness|cleanliness;safe preparation||Hygiene includes hands surfaces equipment and storage.
cross-contamination|交叉污染|transfer of harmful microorganisms or allergens between foods surfaces or equipment|raw food;separate board||Separate raw and ready-to-eat foods and clean equipment.
food poisoning|食物中毒|illness caused by eating food contaminated with harmful microorganisms toxins or chemicals|foodborne illness;safe temperature||Prevention depends on hygiene cooking cooling and storage.
danger zone|危险温度带|temperature range in which many microorganisms multiply quickly in food|temperature control;chilling||Keep food cold enough or hot enough and minimise time in the zone.
pasteurisation|巴氏杀菌|controlled heating reducing harmful microorganisms in food or drink|milk treatment;heat process||It reduces pathogens but does not sterilise all products.
gelatinisation|淀粉糊化|swelling and thickening of starch granules when heated with water|sauce thickening;starch cooking||Temperature liquid and stirring affect the process.
dextrinisation|糊精化|browning and breakdown of starch on dry heating|toasting;browning||It creates colour flavour and surface change.
caramelisation|焦糖化|browning of sugar through heating|sugar browning;flavour development||It differs from Maillard browning involving amino acids and sugars.
Maillard reaction|美拉德反应|browning reaction between amino acids and reducing sugars during heating|roasting;browning flavour||It creates complex flavours and colours under suitable heat conditions.
coagulation|凝固|setting of proteins when heated or otherwise denatured|egg setting;protein change||Overheating can make protein foods tough or dry.
emulsion|乳化体系|mixture of immiscible liquids in which one is dispersed in another|mayonnaise;emulsifier||Emulsifiers help stabilise oil-water mixtures.
shortening|酥松作用|effect of fat reducing gluten development and creating a crumbly texture|pastry fat;short texture||Too much mixing can still make pastry tough.
aeration|充气|incorporating air into food to create lighter texture or volume|whisking;creaming||Air cells need stabilisation during cooking.
sensory evaluation|感官评价|systematic assessment of food using senses such as taste smell texture and appearance|taste panel;hedonic test||Testing should control bias and use suitable descriptors.
special dietary need|特殊膳食需求|nutrition requirement shaped by health allergy religion culture life stage or ethical choice|vegetarian diet;medical diet||Adaptations must still provide adequate nutrients and safe choices.
    `),
  },
  {
    subject: "modern-languages", topic: "igcse-modern-languages-grammar-and-communication", label: "IGCSE Modern Languages: Grammar & Communication",
    stage: "IGCSE",
    note: "用于外语阅读、听力、翻译、写作、口试、语法和语域题。",
    example: "A Modern Languages question uses {word}. Choose a form suitable for the audience, time frame and communicative purpose.",
    translation: "现代外语题涉及{meaning}。选择适合受众、时间和交际目的的表达形式。",
    terms: parseTerms(`
target language|目标语|the language being learned or used for communication in a course|language production;target-language response||Use the target language consistently unless the task asks for translation.
translation|翻译|rendering meaning from one language into another while preserving sense register and accuracy|translation choice;meaning transfer||Good translation avoids word-for-word copying when structures differ.
cognate|同源词|word in two languages with a related form and meaning|similar vocabulary;language family||Cognates can help comprehension but false friends require caution.
false friend|假朋友词|word resembling one in another language but having a different meaning|misleading cognate;translation error||Check meaning in context rather than trusting appearance.
register|语域|language variety selected for situation audience purpose and relationship|formal register;informal register||Register affects vocabulary pronouns greetings and sentence choices.
formality|正式程度|degree of ceremonial professional or casual language in communication|polite form;informal phrase||A correct word may still be unsuitable in the chosen register.
audience|受众|person or group for whom language is produced|intended reader;listener||Audience affects detail tone formality and cultural references.
purpose|交际目的|reason for communicating such as informing persuading requesting or narrating|communicative function;intention||Purpose guides grammar vocabulary and text organisation.
tense|时态|verb form locating an action or state in time|past tense;future tense||Tense choice must match time references and sequence of events.
present tense|现在时|verb form used for current actions habitual events or general statements|present simple;present continuous||Different languages use present forms in different ways.
past tense|过去时|verb form used for actions or states before the present|completed action;past narrative||Choose the correct past form for completed repeated or background action.
future tense|将来时|verb form expressing intended predicted or expected future events|future plan;prediction||Future meaning may use several forms rather than one tense.
conditional mood|条件式|verb form expressing possibility politeness hypothesis or consequence|would;could;if clause||Conditional structures require correct relationship between clauses.
subjunctive|虚拟式|verb form used for wishes doubts commands or hypothetical situations in some languages|wish;necessity;recommendation||The subjunctive is often triggered by specific expressions.
imperative|祈使式|verb form used to give instructions commands or invitations|command form;instruction||Imperatives need appropriate politeness for the audience.
infinitive|不定式|basic verb form often used after another verb or preposition|to form;verb pattern||Languages differ in whether the infinitive is marked or conjugated.
conjugation|动词变位|change of a verb to show person number tense mood or aspect|verb ending;irregular verb||Check subject agreement and irregular forms.
agreement|一致|matching grammatical features such as gender number or person|noun adjective agreement;subject verb agreement||Agreement errors can obscure meaning and lose accuracy marks.
gender|语法性别|grammatical class affecting articles adjectives pronouns or agreement in some languages|masculine;feminine;neuter||Grammatical gender does not always follow biological sex.
number|单复数|grammatical distinction between singular and plural forms|plural noun;agreement||Plural formation and agreement vary across languages.
article|冠词|small word marking a noun as definite indefinite or generic in some languages|definite article;indefinite article||Article choice can depend on gender number and context.
pronoun|代词|word replacing or referring to a noun phrase|subject pronoun;object pronoun||Pronoun position and form may change by language and register.
reflexive verb|反身动词|verb used with a pronoun referring back to its subject|daily routine;self action||The reflexive pronoun must agree with the subject.
word order|词序|arrangement of words in a clause or sentence|sentence structure;verb position||Word order can change in questions negation subordinate clauses or emphasis.
negation|否定|grammatical expression that rejects or reverses a proposition|not;never;no||Languages use different negative particles and positions.
question form|疑问形式|grammatical structure used to request information or confirmation|interrogative;question word||Question form may require inversion or special word order.
connective|连接词|word or phrase linking ideas sentences or paragraphs|because;however;therefore||Connectives improve cohesion and show logic.
opinion phrase|观点表达|language used to state evaluate or qualify a view|in my opinion;I believe||Support opinions with reason example and appropriate hedging.
justification|理由说明|language giving reasons evidence or consequences for a choice or opinion|because;therefore;as a result||Justification makes a response more developed and persuasive.
comparison|比较|language showing similarity difference preference or contrast|more than;less than;as ... as||Comparisons require accurate adjective and adverb forms.
sequencing|顺序表达|language organising events ideas or instructions in order|first;then;finally||Sequencing helps clarity in narratives and presentations.
idiom|习语|fixed expression whose meaning cannot always be predicted word by word|idiomatic expression;natural speech||Use idioms accurately and only when appropriate to register.
paraphrase|释义改写|expressing an idea using different words or structures|reformulation;circumlocution||Paraphrase helps when a specific word is unknown or when avoiding repetition.
fluency|流利度|ability to communicate smoothly and coherently with manageable hesitation|spoken fluency;communication||Fluency should be balanced with accuracy and comprehensibility.
pronunciation|发音|production of speech sounds in a way listeners can understand|sound accuracy;intonation||Clear pronunciation includes stress rhythm and key sound contrasts.
intonation|语调|movement of pitch across an utterance|question intonation;emphasis||Intonation can signal attitude structure and turn-taking.
cultural context|文化语境|social practices values references and expectations shaping language use|target culture;intercultural communication||Cultural awareness prevents inappropriate literal transfer.
    `),
  },
  {
    subject: "enterprise", topic: "igcse-enterprise-opportunity-and-planning", label: "IGCSE Enterprise: Opportunity & Planning",
    stage: "IGCSE",
    note: "用于创业机会、客户、市场、商业计划、成本、融资和风险题。",
    example: "An Enterprise question uses {word}. Use evidence to test the idea, then explain the financial or stakeholder implication.",
    translation: "创业题涉及{meaning}。用证据检验想法，再解释财务或利益相关者影响。",
    terms: parseTerms(`
enterprise|创业活动|identifying and pursuing opportunities by organising resources and taking calculated risks|entrepreneurial activity;business venture||Enterprise creates value through initiative innovation and action.
entrepreneur|创业者|person who starts or develops an enterprise by organising resources and accepting risk|business founder;enterprise owner||Entrepreneurs need ideas but also planning resilience and decision-making.
opportunity|机会|a favourable situation in which a need or gap can be turned into value|market gap;business opportunity||An opportunity must be validated rather than assumed.
market gap|市场空缺|unmet or poorly met customer need in a market|customer problem;new product||A gap can be temporary or already served by indirect competitors.
value proposition|价值主张|clear statement of why customers should choose a product or service|customer benefit;unique value||A proposition should address a real customer problem and differentiation.
customer need|客户需求|problem desire or requirement that customers want a product or service to meet|target customer;consumer insight||Needs should be evidenced through research and feedback.
target market|目标市场|group of customers an enterprise aims to serve|market segment;customer profile||A defined target market helps product and promotion decisions.
market research|市场调研|collection and analysis of information about customers competitors and markets|primary research;secondary research||Research reduces uncertainty but methods can be biased.
primary research|一手市场调研|new information collected directly for a specific business purpose|survey;focus group;observation||Design questions and samples carefully to reduce bias.
secondary research|二手市场调研|existing information collected by other organisations or earlier studies|industry report;government data||Check date source purpose and relevance before relying on it.
competitor|竞争者|business offering a similar or substitute product to the same customers|direct competitor;indirect competitor||Competition includes alternatives solving the same need.
competitive advantage|竞争优势|feature allowing a business to perform better than competitors|unique selling point;cost advantage||Advantages must matter to customers and be hard to copy.
unique selling point|独特卖点|feature distinguishing a product or service from alternatives|USP;differentiation||A USP should be credible relevant and communicated clearly.
business plan|商业计划书|document setting out an enterprise idea market operations finance and risks|start-up plan;business proposal||A plan guides decisions and helps communicate with funders.
business objective|商业目标|specific outcome an enterprise aims to achieve|profit target;growth target||Objectives should be measurable realistic and time-bound.
sales forecast|销售预测|estimate of future sales based on assumptions and evidence|demand forecast;revenue estimate||Forecasts should state assumptions and be revised against results.
start-up cost|创业成本|cost required before a business begins trading|equipment;licence;initial stock||Start-up costs affect funding needs and break-even timing.
fixed cost|固定成本|cost that does not change directly with output in the short run|rent;insurance||Fixed costs must be covered even when sales are low.
variable cost|可变成本|cost changing with output or sales volume|materials;packaging||Variable cost per unit affects contribution and pricing.
revenue|营业收入|money earned from sales before costs are deducted|sales income;turnover|revenue = price x quantity sold|Revenue is not the same as profit or cash.
profit|利润|revenue remaining after costs are deducted|net profit;profit margin|profit = revenue - total cost|Profit can be positive even when cash flow is difficult.
cash flow|现金流|movement of money into and out of a business over time|cash inflow;cash outflow||Cash timing matters because bills may be due before customers pay.
cash-flow forecast|现金流预测|projection of future cash receipts payments and balances|monthly cash flow;cash budget||It identifies possible shortages before they occur.
break-even|盈亏平衡|point at which total revenue equals total cost|break-even output;no profit no loss|break-even output = fixed costs / contribution per unit|Assumptions about price costs and demand need checking.
contribution|单位贡献|amount each sale contributes toward fixed costs and then profit|contribution per unit;variable cost|contribution = selling price - variable cost|Contribution is not total profit.
pricing strategy|定价策略|planned method for setting a selling price|cost-plus;penetration;premium||Price must fit costs demand competition and positioning.
promotion|促销|communication encouraging awareness interest or purchase|advertising;social media;discount||Promotion costs and message should match the target market.
distribution|分销|methods used to make products available to customers|online channel;retailer;delivery||Channels affect cost reach speed and customer experience.
branding|品牌建设|creating a distinctive name image and promise for a product or business|brand identity;reputation||A brand is built through consistent experience not only a logo.
source of finance|融资来源|way a business obtains money for start-up or growth|loan;grant;equity||Finance choices affect risk cost control and repayment.
loan|贷款|borrowed money repaid over time often with interest|bank loan;repayment||Loans can preserve ownership but create fixed obligations.
equity finance|股权融资|funding obtained by selling ownership shares in a business|investor;share capital||Equity avoids loan repayment but can reduce founder control.
grant|补助金|non-repayable funding given for a specified purpose if conditions are met|government grant;start-up support||Grants may be competitive restricted or time-limited.
risk|风险|possibility that an event will harm an enterprise outcome|business risk;uncertainty||Good plans identify likelihood impact and mitigation.
risk assessment|风险评估|systematic process of identifying evaluating and controlling risks|risk matrix;mitigation||Assess both probability and impact and review controls.
contingency plan|应急预案|prepared response for a foreseeable problem or disruption|backup supplier;emergency plan||A plan should state triggers responsibilities and alternative actions.
social enterprise|社会企业|business aiming to achieve social or environmental goals while trading sustainably|social mission;reinvested profit||It must balance mission income and impact measurement.
    `),
  },
  {
    subject: "agriculture", topic: "igcse-agriculture-production-and-sustainability", label: "IGCSE Agriculture: Production & Sustainability",
    stage: "IGCSE",
    note: "用于作物、畜牧、土壤、病虫害、农业投入、粮食安全和可持续管理题。",
    example: "An Agriculture question uses {word}. Explain the biological or environmental mechanism, then evaluate the production trade-off.",
    translation: "农业题涉及{meaning}。解释生物或环境机制，再评价生产取舍。",
    terms: parseTerms(`
agriculture|农业|production of crops animals or other biological resources for food fibre fuel or income|farm system;agricultural production||Agriculture links biology environment technology markets and livelihoods.
arable farming|种植农业|farming focused on growing crops in cultivated land|crop production;field crop||Arable systems depend on soil climate inputs and crop management.
livestock farming|畜牧业|farming focused on rearing animals for food materials or other products|animal husbandry;grazing||Livestock systems require nutrition health breeding and welfare management.
mixed farming|混合农业|farm system combining crop and livestock production|integrated farm;manure recycling||Mixed systems can recycle nutrients and diversify risk.
subsistence farming|自给农业|production mainly for the farmer's household rather than market sale|smallholder;food security||Surplus may be limited and vulnerability to shocks can be high.
commercial farming|商品农业|production mainly for sale and profit in markets|cash crop;market production||It depends on demand prices inputs and market access.
cash crop|经济作物|crop grown mainly for sale rather than direct household consumption|export crop;farm income||Cash crops can raise income but may affect food security and risk.
food security|粮食安全|reliable physical and economic access to sufficient safe nutritious food|food availability;access||Food security includes availability access utilisation and stability.
yield|产量|amount of crop or animal product produced per area animal or input|crop yield;productivity||Yield should be interpreted with input cost environmental impact and quality.
productivity|生产率|output produced per unit of input such as land labour water or feed|farm efficiency;output per input||Higher productivity is not automatically more sustainable.
soil|土壤|mixture of minerals organic matter water air and organisms supporting plant growth|soil profile;soil fertility||Soil condition affects roots nutrients water and ecosystems.
topsoil|表土|upper fertile layer of soil rich in organic matter and biological activity|soil erosion;fertile layer||Loss of topsoil can reduce yield and water retention.
soil texture|土壤质地|relative proportions of sand silt and clay in soil|sandy soil;clay soil||Texture affects drainage aeration nutrient retention and cultivation.
soil structure|土壤结构|arrangement of soil particles into aggregates and pore spaces|soil crumb;compaction||Good structure supports roots water movement and gas exchange.
soil pH|土壤酸碱度|measure of soil acidity or alkalinity affecting nutrient availability|lime application;acidic soil||Different crops and nutrients have different optimum pH ranges.
organic matter|有机质|decomposed plant animal and microbial material in soil|humus;soil fertility||Organic matter improves structure water retention and nutrient cycling.
compost|堆肥|decomposed organic material added to soil to improve fertility and structure|organic fertiliser;composting||Compost releases nutrients gradually and recycles waste.
fertiliser|肥料|substance added to supply plant nutrients|NPK fertiliser;nutrient input||Overuse can cause pollution and soil imbalance.
nitrogen fertiliser|氮肥|fertiliser supplying nitrogen for plant protein and growth|nitrate fertiliser;leaf growth||Excess nitrogen can leach or cause eutrophication.
phosphorus fertiliser|磷肥|fertiliser supplying phosphorus for roots energy transfer and development|phosphate fertiliser;root growth||Phosphate runoff can contribute to eutrophication.
potassium fertiliser|钾肥|fertiliser supplying potassium for plant water regulation and enzyme function|potash;crop quality||Potassium affects crop resilience and quality.
irrigation|灌溉|artificial supply of water to crops or land|drip irrigation;water management||Irrigation can increase yield but risk salinisation and water depletion.
drip irrigation|滴灌|controlled delivery of water directly near plant roots|water efficiency;irrigation line||It reduces evaporation but requires equipment and maintenance.
drainage|排水|removal of excess water from soil or land|field drain;waterlogging||Poor drainage reduces root oxygen and can increase disease.
crop rotation|轮作|planned sequence of different crops on the same land over seasons or years|rotation plan;soil management||Rotation can manage nutrients pests weeds and soil structure.
monoculture|单一种植|growing one crop species over a large area or repeatedly|single crop;genetic uniformity||Monoculture can simplify management but increase pest and disease risk.
intercropping|间作|growing two or more crops together in the same field|mixed crops;companion planting||It can improve land use and reduce some risks.
pest|害虫|organism damaging crops stored products or livestock|crop pest;infestation||Control decisions should consider thresholds and non-target effects.
pathogen|病原体|organism or agent causing disease in plants or animals|plant disease;infection||Disease spread depends on host pathogen environment and management.
weed|杂草|plant growing where it is unwanted and competing with crops|weed control;crop competition||Weeds can reduce yield by competing for resources.
pesticide|农药|substance used to control pests weeds fungi or other harmful organisms|herbicide;insecticide||Use can create resistance residues and non-target impacts.
biological control|生物防治|use of natural enemies organisms or processes to control pests|predator;parasitoid||Controls must be assessed for effectiveness and ecological risk.
integrated pest management|综合害虫管理|combining monitoring biological cultural and limited chemical controls|IPM;threshold level||IPM aims to reduce harm while keeping pests below damaging levels.
selective breeding|选择育种|choosing parents with desired traits to produce improved offspring|breed improvement;desired trait||It can improve yield but reduce genetic diversity.
genetic diversity|遗传多样性|variety of genes within a species or population|resilient crop;gene pool||Diversity can improve resilience to disease and environmental change.
animal welfare|动物福利|physical and mental wellbeing of animals under human care|housing;health;behaviour||Welfare includes nutrition environment health behaviour and humane handling.
stocking density|饲养密度|number of animals kept in a given space|housing space;welfare||High density can affect disease stress and productivity.
greenhouse|温室|structure creating controlled conditions for plant growth|protected cultivation;temperature control||It can extend seasons but requires energy and management.
precision agriculture|精准农业|use of data sensors mapping or automation to manage inputs and crops precisely|GPS farming;variable-rate application||It can reduce waste but needs investment skills and reliable data.
agroforestry|农林复合经营|integrating trees with crops or livestock in a managed system|shade trees;soil conservation||It can provide diversity carbon storage and habitat benefits.
sustainable agriculture|可持续农业|farming meeting current needs while protecting resources and future production capacity|soil conservation;resilient farming||Evaluate yield profitability equity and environmental impact together.
    `),
  },
  {
    subject: "child-development", topic: "igcse-child-development-growth-and-care", label: "IGCSE Child Development: Growth & Care",
    stage: "IGCSE",
    note: "用于婴幼儿成长、游戏学习、依恋、健康、安全、特殊需要和儿童保护题。",
    example: "A Child Development question uses {word}. Apply it to the child's age and context, then justify a supportive safe response.",
    translation: "儿童发展题涉及{meaning}。把它用于儿童的年龄和情境，再论证支持性且安全的做法。",
    terms: parseTerms(`
development|发展|progressive changes in physical cognitive language social and emotional abilities over time|child growth;developmental stage||Development is influenced by maturation experience relationships and culture.
growth|生长|increase in physical size mass or body dimensions|height;weight;physical growth||Growth is one part of development and can be measured physically.
maturation|成熟|biological unfolding of abilities according to genetic and physical development|readiness;biological growth||Maturation interacts with learning and environment.
developmental milestone|发展里程碑|typical skill or behaviour reached within an expected age range|age range;developmental progress||Milestones are guides and individual variation is normal.
individual difference|个体差异|variation between children in rate style strengths needs or experiences|unique child;developmental variation||Avoid treating averages as strict deadlines for every child.
physical development|身体发展|changes in body movement coordination strength and fine or gross motor abilities|motor skill;growth||Physical development depends on health opportunity and maturation.
gross motor skill|大肌肉动作技能|movement using large muscle groups such as walking running or jumping|balance;whole-body movement||Gross skills develop through maturation practice and safe space.
fine motor skill|精细动作技能|controlled movement of small muscles especially hands and fingers|grasping;hand-eye coordination||Fine skills support dressing drawing writing and tool use.
cognitive development|认知发展|changes in thinking memory problem-solving and understanding|reasoning;learning||Cognitive abilities develop through interaction experience and instruction.
language development|语言发展|growth in understanding and use of sounds words grammar and communication|vocabulary;communication||Language develops through interaction exposure and individual differences.
social development|社会性发展|changes in interaction cooperation relationships and understanding of others|peer play;social skill||Social development is shaped by attachment modelling and opportunities.
emotional development|情绪发展|growth in recognising expressing and regulating feelings|self-regulation;empathy||Adults can support emotion language and safe co-regulation.
attachment|依恋|enduring emotional bond between a child and caregiver providing security|secure base;caregiver relationship||Sensitive consistent care can support secure attachment.
secure attachment|安全型依恋|attachment pattern in which a child uses a trusted caregiver for comfort and exploration|secure base;separation reunion||It is a pattern of relationship behaviour not a fixed label for worth.
separation anxiety|分离焦虑|distress a young child may show when separated from a familiar caregiver|caregiver absence;reassurance||It can be developmentally typical and needs sensitive support.
temperament|气质|individual tendency in emotional reactivity activity and self-regulation|easy temperament;behavioural style||Temperament interacts with parenting context and experience.
self-esteem|自尊|sense of personal worth and confidence|positive identity;self-concept||Feedback relationships and success experiences can influence self-esteem.
self-concept|自我概念|a child's understanding and beliefs about who they are|identity;self-description||Self-concept develops through experience language and social feedback.
play|游戏|self-directed enjoyable activity supporting learning exploration and development|free play;learning through play||Play can develop physical cognitive social and emotional skills.
imaginative play|想象游戏|play involving pretend roles stories objects or situations|role play;pretend play||It supports language empathy and symbolic thinking.
parallel play|平行游戏|children playing alongside each other without much direct interaction|toddler play;social development||It can be a normal stage before more cooperative play.
cooperative play|合作游戏|children organising activities with shared goals rules or roles|group play;teamwork||It develops negotiation communication and empathy.
schema|重复行为模式|recurring pattern of exploration such as transporting enclosing or rotating|play schema;learning pattern||Recognising schemas can help adults provide suitable activities.
routine|日常规律|predictable sequence of daily care and activity|bedtime routine;consistency||Routines support security transitions and self-care learning.
positive discipline|积极管教|guidance using clear boundaries teaching and respectful consequences rather than harm|behaviour support;consistent boundary||It aims to build skills and relationships as well as manage behaviour.
behaviour management|行为管理|planned support helping children learn appropriate behaviour and self-regulation|reward system;clear expectation||Strategies should be age-appropriate consistent and fair.
inclusion|包容|ensuring all children can participate and belong regardless of ability background or need|inclusive setting;participation||Inclusion may require adaptations resources and respectful attitudes.
special educational need|特殊教育需要|learning developmental or disability-related need requiring additional support or adaptation|SEN;individual support||Needs should be assessed with strengths family voice and professional input.
differentiation|差异化支持|adapting activity communication or environment to meet different needs|adapted task;individual plan||Differentiation supports access without lowering meaningful expectations.
safeguarding|儿童保护|actions and systems protecting children from harm neglect abuse or exploitation|child protection;reporting concern||Safeguarding requires awareness procedures and timely professional action.
confidentiality|保密|protecting private child and family information while sharing when safety or law requires|privacy;need to know||Confidentiality has limits when a child may be at risk.
risk assessment|风险评估|identifying hazards evaluating likelihood and impact and reducing risk|safe environment;supervision||Risk assessment should balance safety with worthwhile learning.
supervision|看护|active oversight to keep children safe and support appropriate participation|adult-child ratio;safe play||Effective supervision depends on attention positioning and knowledge of children.
nutrition|营养|food and nutrients supporting growth health energy and development|balanced diet;healthy eating||Nutritional needs vary with age health activity and culture.
immunisation|免疫接种|use of vaccines to help protect against infectious disease|vaccination;public health||Immunisation supports individual and community protection.
sleep routine|睡眠规律|consistent practices supporting adequate safe rest for a child|bedtime;rest pattern||Sleep needs and safe routines vary with developmental stage.
toilet training|如厕训练|supporting a child to develop independent toileting skills|readiness;self-care||Training should be patient non-punitive and matched to readiness.
    `),
  },
];

groups.push(...igAlevelAppliedSubjectGroups);

const igAlevelLanguageAndReasoningSubjectGroups = [
  {
    subject: "english-second-language", topic: "igcse-english-second-language-communication", label: "IGCSE English as a Second Language: Communication",
    stage: "IGCSE",
    note: "用于阅读、听力、摘要、邮件、文章、报告、语域和交际效果题。",
    terms: customTerms([
      { word: "register", meaning: "语域", definition: "the level and style of language chosen for a particular audience purpose and situation", collocations: ["formal register", "informal register"], knowledgePoint: "Register depends on audience, purpose, relationship and text type; grammar and vocabulary must work together." },
      { word: "audience", meaning: "受众", definition: "the people for whom a spoken or written text is intended", collocations: ["target audience", "intended reader"], knowledgePoint: "Identify what the audience knows, expects and needs before choosing tone and detail." },
      { word: "purpose", meaning: "目的", definition: "the intended effect or reason for producing a text", collocations: ["informative purpose", "persuasive purpose"], knowledgePoint: "A text may inform, advise, describe, persuade, entertain or request; state the effect using evidence." },
      { word: "tone", meaning: "语气", definition: "the attitude or emotional quality conveyed through a speaker's or writer's language", collocations: ["respectful tone", "critical tone"], knowledgePoint: "Tone is inferred from language choices and context, not from one adjective alone." },
      { word: "formal language", meaning: "正式语体", definition: "language using standard grammar and careful vocabulary for official or distant contexts", collocations: ["formal email", "formal letter"], knowledgePoint: "Formal writing usually avoids slang, contractions and vague conversational fillers." },
      { word: "informal language", meaning: "非正式语体", definition: "relaxed everyday language suitable for familiar personal contexts", collocations: ["informal message", "friendly tone"], knowledgePoint: "Informal does not mean inaccurate: the message still needs clear purpose and organisation." },
      { word: "summary", meaning: "摘要", definition: "a concise account selecting the main relevant points from a longer source", collocations: ["summary task", "main points"], knowledgePoint: "A summary selects and combines relevant ideas in new wording; it does not copy every detail." },
      { word: "paraphrase", meaning: "改述", definition: "restating an idea accurately using different wording and structure", collocations: ["paraphrase information", "own words"], knowledgePoint: "Keep the original meaning and necessary qualification while changing vocabulary and sentence structure." },
      { word: "implicit meaning", meaning: "隐含意义", definition: "an idea suggested by context rather than directly stated", collocations: ["infer meaning", "implied message"], knowledgePoint: "Inference needs textual clues; distinguish a reasonable implication from an invented opinion." },
      { word: "explicit information", meaning: "明确信息", definition: "information stated directly in a text without requiring inference", collocations: ["direct detail", "stated fact"], knowledgePoint: "Quote or accurately locate explicit information before interpreting its significance." },
      { word: "key detail", meaning: "关键信息", definition: "a specific piece of information necessary for understanding or completing a task", collocations: ["supporting detail", "relevant point"], knowledgePoint: "Select details by the question focus, not simply because they look unusual." },
      { word: "main idea", meaning: "主旨", definition: "the central message or most important point developed in a text", collocations: ["central idea", "overall message"], knowledgePoint: "The main idea covers the whole relevant text and is supported by details." },
      { word: "supporting detail", meaning: "支持细节", definition: "a fact example explanation or description that develops a main idea", collocations: ["textual support", "relevant example"], knowledgePoint: "A supporting detail must connect to the main point rather than repeat it." },
      { word: "coherence", meaning: "连贯性", definition: "logical and easy-to-follow connection of ideas across a spoken or written text", collocations: ["coherent paragraph", "logical flow"], knowledgePoint: "Coherence comes from clear ordering, reference words and explicit relationships between ideas." },
      { word: "cohesion", meaning: "衔接性", definition: "the grammatical and lexical links that connect sentences and parts of a text", collocations: ["cohesive device", "linking word"], knowledgePoint: "Use pronouns, repetition, substitution and connectors accurately; overusing connectors can reduce clarity." },
      { word: "topic sentence", meaning: "主题句", definition: "a sentence stating the controlling point of a paragraph", collocations: ["paragraph focus", "controlling idea"], knowledgePoint: "A topic sentence should directly support the task and prepare the evidence or explanation that follows." },
      { word: "linking device", meaning: "衔接手段", definition: "a word phrase or structure used to show a relationship between ideas", collocations: ["however", "as a result"], knowledgePoint: "Choose links for real relationships such as contrast, cause, sequence or example." },
      { word: "connotation", meaning: "隐含色彩", definition: "an association or feeling carried by a word beyond its literal definition", collocations: ["positive connotation", "negative connotation"], knowledgePoint: "Connotation affects tone and may change whether a word suits the intended audience." },
      { word: "denotation", meaning: "字面意义", definition: "the direct dictionary meaning of a word before contextual associations", collocations: ["literal meaning", "dictionary definition"], knowledgePoint: "Compare denotation with connotation when explaining why one word choice is more effective." },
      { word: "fact", meaning: "事实", definition: "a claim that can in principle be checked against reliable evidence", collocations: ["verifiable fact", "factual statement"], knowledgePoint: "A factual-looking sentence still needs a traceable source and may omit relevant context." },
      { word: "opinion", meaning: "观点", definition: "a personal judgement or belief that may be supported but is not proven as a fact", collocations: ["express an opinion", "personal view"], knowledgePoint: "Separate the writer's opinion from facts or evidence used to support it." },
      { word: "bias", meaning: "偏见", definition: "a systematic preference or viewpoint that can shape selection and presentation of information", collocations: ["source bias", "biased language"], knowledgePoint: "Identify the wording, source interest or omitted perspective that may influence the message." },
      { word: "headline", meaning: "标题", definition: "a short title designed to identify and attract attention to a news or article text", collocations: ["news headline", "attention-grabbing"], knowledgePoint: "Headlines can compress information or create a tone, so compare them with the full text." },
      { word: "caption", meaning: "图注", definition: "a short text explaining or contextualising an image diagram or illustration", collocations: ["photo caption", "image context"], knowledgePoint: "A caption guides interpretation and can add information not visible in the image itself." },
      { word: "convention", meaning: "文本惯例", definition: "a usual feature or rule associated with a particular text type or situation", collocations: ["email convention", "genre convention"], knowledgePoint: "Use relevant conventions such as greeting, subject line, paragraphs, sign-off and appropriate tone." },
      { word: "article", meaning: "文章", definition: "a structured piece of writing for a publication or audience on a particular subject", collocations: ["feature article", "online article"], knowledgePoint: "An article needs a clear angle, reader-friendly opening and purposeful paragraph development." },
      { word: "report", meaning: "报告", definition: "a formal organised text presenting findings observations or recommendations", collocations: ["formal report", "report findings"], knowledgePoint: "Reports usually use headings, factual evidence and specific recommendations rather than personal storytelling." },
      { word: "proposal", meaning: "提案", definition: "a planned recommendation explaining what should be done and why", collocations: ["submit a proposal", "practical recommendation"], knowledgePoint: "A proposal needs a feasible action, resources, anticipated benefit and clear audience need." },
      { word: "review", meaning: "评论", definition: "a text evaluating an experience product performance or event for an audience", collocations: ["critical review", "reader recommendation"], knowledgePoint: "A review combines description with justified evaluation and a recommendation suited to its readers." },
      { word: "complaint", meaning: "投诉", definition: "a formal expression of dissatisfaction requesting a response or remedy", collocations: ["complaint letter", "seek redress"], knowledgePoint: "State the problem, evidence, impact and requested solution politely and precisely." },
      { word: "persuasion", meaning: "说服", definition: "the use of reasons language and evidence to influence an audience's view or action", collocations: ["persuasive technique", "call to action"], knowledgePoint: "Effective persuasion balances claim, evidence, audience values and a clear requested action." },
      { word: "rhetorical question", meaning: "反问句", definition: "a question asked for effect rather than to obtain an actual answer", collocations: ["persuasive question", "reader engagement"], knowledgePoint: "A rhetorical question works only when the expected response is clear and appropriate for the audience." },
      { word: "modal verb", meaning: "情态动词", definition: "a verb such as may must should or could expressing possibility obligation or advice", collocations: ["modal certainty", "modal advice"], knowledgePoint: "Choose modal strength carefully: must, should and may communicate different degrees of force." },
      { word: "hedging", meaning: "模糊限制语", definition: "language used to limit certainty or make a claim more cautious", collocations: ["may suggest", "likely to"], knowledgePoint: "Hedging is appropriate when evidence is limited; it should not hide a lack of reasoning." },
      { word: "proofreading", meaning: "校对", definition: "careful final checking of a text for errors clarity and task completion", collocations: ["proofread draft", "final check"], knowledgePoint: "Check task purpose, paragraphing, grammar, spelling, punctuation and word choice before submission." },
    ]),
  },
  {
    subject: "chinese-language", topic: "igcse-alevel-chinese-language-discourse", label: "IG + A-Level Chinese Language: Discourse & Expression",
    stage: "IGCSE",
    note: "用于中文阅读、写作、语体、修辞、语篇结构和表达得体性。",
    terms: customTerms([
      { word: "语体", idSlug: "register", meaning: "语体", definition: "the style of language selected according to audience purpose relationship and communicative setting", collocations: ["书面语体", "口语语体"], knowledgePoint: "语体同时影响词语、句式、语气和篇章组织；不能只替换一两个正式词。" },
      { word: "书面语", idSlug: "written-language", meaning: "书面语", definition: "a planned and relatively formal form of language used in writing and official communication", collocations: ["书面表达", "正式文体"], knowledgePoint: "书面语通常信息更完整、句式更严谨，但仍须适合具体读者和文本类型。" },
      { word: "口语", idSlug: "spoken-language", meaning: "口语", definition: "language used in direct spoken interaction often shaped by immediacy and audience response", collocations: ["口语表达", "日常会话"], knowledgePoint: "分析口语要注意停顿、重复、语气词、回应和互动目的，而不是把它一概视为不规范。" },
      { word: "语境", idSlug: "context", meaning: "语境", definition: "the linguistic social cultural and situational conditions that shape how language is understood", collocations: ["交际语境", "文化语境"], knowledgePoint: "同一句话在不同身份、场合、媒介和文化背景下可能有不同含义和得体性。" },
      { word: "受众", idSlug: "audience", meaning: "受众", definition: "the intended readers listeners or viewers of a text or message", collocations: ["目标受众", "读者定位"], knowledgePoint: "选择材料、称呼、解释程度和语气之前，先判断受众的知识和关系。" },
      { word: "交际目的", idSlug: "communicative-purpose", meaning: "交际目的", definition: "the intended outcome a speaker or writer wants to achieve through communication", collocations: ["说明目的", "劝说目的"], knowledgePoint: "目的决定信息取舍和语气：告知、请求、劝说、反思、批评和致谢的写法不同。" },
      { word: "修辞", idSlug: "rhetoric", meaning: "修辞", definition: "deliberate language choices used to create emphasis imagery rhythm persuasion or other effects", collocations: ["修辞手法", "表达效果"], knowledgePoint: "修辞分析必须指出具体词句、说明效果，并联系语境和交际目的。" },
      { word: "比喻", idSlug: "metaphor-simile", meaning: "比喻", definition: "a comparison using one image or idea to make another idea more vivid or understandable", collocations: ["明喻", "暗喻"], knowledgePoint: "解释比喻时要说清本体、喻体和它突出的特征，不能只写“生动形象”。" },
      { word: "拟人", idSlug: "personification", meaning: "拟人", definition: "a device giving human qualities actions or feelings to non-human things", collocations: ["拟人手法", "情感投射"], knowledgePoint: "拟人常改变叙述语气和读者距离，要结合具体动词或情感词分析。" },
      { word: "排比", idSlug: "parallelism", meaning: "排比", definition: "a sequence of similarly structured phrases or clauses creating rhythm emphasis or accumulation", collocations: ["排比句", "句式整齐"], knowledgePoint: "分析排比要说明重复结构如何加强逻辑、气势或情感，而非只标注术语。" },
      { word: "反问", idSlug: "rhetorical-question", meaning: "反问", definition: "a question form used to assert or intensify a viewpoint rather than seek information", collocations: ["反问语气", "加强语势"], knowledgePoint: "反问的隐含肯定或否定必须结合上下文判断，避免机械翻转句意。" },
      { word: "对比", idSlug: "contrast", meaning: "对比", definition: "placing different ideas images characters or situations together to highlight differences", collocations: ["鲜明对比", "前后对照"], knowledgePoint: "对比要说明比较的两个对象和由此突出的价值、矛盾或变化。" },
      { word: "象征", idSlug: "symbolism", meaning: "象征", definition: "an object image or action representing a broader idea beyond its literal role", collocations: ["象征意义", "意象系统"], knowledgePoint: "象征意义须由文本重复、语境或文化关联支持，不能任意附会。" },
      { word: "意象", idSlug: "imagery", meaning: "意象", definition: "a sensory image in language that contributes to mood meaning or thematic association", collocations: ["视觉意象", "自然意象"], knowledgePoint: "分析意象时联系感官细节、情感氛围和全文结构，不只翻译字面画面。" },
      { word: "叙述视角", idSlug: "narrative-perspective", meaning: "叙述视角", definition: "the position or voice through which events and characters are presented in a narrative", collocations: ["第一人称", "第三人称"], knowledgePoint: "视角会限制信息、建立亲近或距离，并影响读者对人物和事件的判断。" },
      { word: "人物描写", idSlug: "characterisation", meaning: "人物描写", definition: "the methods used to present a character's qualities motives relationships and development", collocations: ["语言描写", "动作描写"], knowledgePoint: "人物描写可来自言行、心理、他人评价和环境细节，要说明证据如何塑造形象。" },
      { word: "环境描写", idSlug: "setting-description", meaning: "环境描写", definition: "description of place time atmosphere or social setting within a text", collocations: ["自然环境", "社会环境"], knowledgePoint: "环境既可交代背景，也可烘托情绪、推动情节或暗示主题。" },
      { word: "段落结构", idSlug: "paragraph-structure", meaning: "段落结构", definition: "the planned ordering of sentences and ideas within a paragraph", collocations: ["总分结构", "递进结构"], knowledgePoint: "段落应有中心、展开和衔接；每一句要服务于同一交际或论证目标。" },
      { word: "衔接", idSlug: "cohesion", meaning: "衔接", definition: "the linguistic links that connect sentences clauses and paragraphs into a unified text", collocations: ["指代衔接", "关联词"], knowledgePoint: "通过代词、重复、同义替换、连接词和省略建立关系，但不要堆砌关联词。" },
      { word: "连贯", idSlug: "coherence", meaning: "连贯", definition: "the logical clarity that makes a text's development easy to follow", collocations: ["逻辑连贯", "行文顺畅"], knowledgePoint: "连贯来自观点顺序和因果关系，而不仅来自表面的连接词。" },
      { word: "中心论点", idSlug: "thesis", meaning: "中心论点", definition: "the main arguable position that a persuasive text sets out to support", collocations: ["明确论点", "立场鲜明"], knowledgePoint: "中心论点应可讨论、可证明，并贯穿全文而非只出现在开头。" },
      { word: "论据", idSlug: "evidence", meaning: "论据", definition: "facts examples quotations data or reasoning used to support a claim", collocations: ["事实论据", "道理论据"], knowledgePoint: "论据必须相关、可靠，并通过解释连接到论点；堆例子不等于论证。" },
      { word: "论证", idSlug: "argumentation", meaning: "论证", definition: "the process of using reasons and evidence to establish or evaluate a claim", collocations: ["论证过程", "严密论证"], knowledgePoint: "完整论证包括主张、依据、推理和必要的回应；不要用结论重复结论。" },
      { word: "引用", idSlug: "quotation", meaning: "引用", definition: "the use of another source's exact words ideas or data with appropriate acknowledgement", collocations: ["引用材料", "直接引用"], knowledgePoint: "引用要服务于自己的分析，说明它如何证明观点，并准确标明来源。" },
      { word: "概括", idSlug: "summary", meaning: "概括", definition: "stating the essential ideas of material concisely without unnecessary detail", collocations: ["概括要点", "归纳内容"], knowledgePoint: "概括要保留核心关系和条件，不能逐句缩短或加入原文没有的评价。" },
      { word: "细节描写", idSlug: "detail", meaning: "细节描写", definition: "specific descriptive information used to make a scene person action or idea precise and vivid", collocations: ["典型细节", "感官细节"], knowledgePoint: "有价值的细节须服务于人物、氛围、主题或论点，不是越多越好。" },
      { word: "语言得体", idSlug: "appropriacy", meaning: "语言得体", definition: "the suitability of language choices for a particular audience relationship purpose and setting", collocations: ["表达得体", "称呼得当"], knowledgePoint: "得体要看对象和场合：正式称谓、请求力度、礼貌策略和信息完整度都要匹配。" },
      { word: "语病", idSlug: "language-error", meaning: "语病", definition: "a problem in grammar logic word choice or sentence structure that reduces clarity or correctness", collocations: ["成分残缺", "搭配不当"], knowledgePoint: "修改语病先找句子主干和逻辑关系，再处理搭配、指代、重复或歧义。" },
      { word: "歧义", idSlug: "ambiguity", meaning: "歧义", definition: "a wording structure or reference that allows more than one plausible interpretation", collocations: ["指代不明", "语义歧义"], knowledgePoint: "消除歧义可补足主语、调整词序、明确指代或拆分过长句子。" },
      { word: "成语", idSlug: "idiom", meaning: "成语", definition: "a fixed Chinese expression whose meaning and usage depend on established convention and context", collocations: ["恰当使用", "望文生义"], knowledgePoint: "使用成语须理解语义色彩、对象、褒贬和搭配，不能只因“高级”而硬套。" },
      { word: "语气", idSlug: "tone", meaning: "语气", definition: "the attitude and interpersonal stance expressed through wording sentence form and punctuation", collocations: ["委婉语气", "批评语气"], knowledgePoint: "语气会影响礼貌、可信度和说服力；分析必须回到具体词句。" },
      { word: "转折", idSlug: "contrast-transition", meaning: "转折", definition: "a discourse relationship marking an unexpected difference qualification or change of direction", collocations: ["但是", "然而"], knowledgePoint: "转折后通常是作者重点或对前文的限制，阅读时要比较前后逻辑。" },
      { word: "因果关系", idSlug: "causation", meaning: "因果关系", definition: "a relationship in which one event condition or action contributes to another outcome", collocations: ["原因分析", "结果影响"], knowledgePoint: "写因果时说明机制和条件，避免把时间先后或相关性直接当因果。" },
      { word: "语义场", idSlug: "semantic-field", meaning: "语义场", definition: "a group of words connected by a shared area of meaning or association", collocations: ["词汇聚集", "主题词群"], knowledgePoint: "同一语义场的重复选择可建立主题、情绪或价值判断，要举出词例证明。" },
      { word: "文体", idSlug: "genre", meaning: "文体", definition: "a recognisable form of text with typical purposes structures and language conventions", collocations: ["应用文", "记叙文"], knowledgePoint: "文体决定组织和语言：书信、演讲、评论、记叙、说明和议论的评分重点不同。" },
    ]),
  },
  {
    subject: "islamic-studies", topic: "igcse-islamic-studies-sources-and-practice", label: "IGCSE Islamic Studies: Sources & Practice",
    stage: "IGCSE",
    note: "用于经文、圣训、早期历史、信仰、实践、伦理和资料解释题。",
    terms: customTerms([
      { word: "Qur'an", meaning: "古兰经", definition: "the central sacred scripture of Islam believed by Muslims to be revelation from God", collocations: ["Qur'anic teaching", "revelation"], knowledgePoint: "Use precise textual context and distinguish Qur'anic evidence from later commentary or historical practice." },
      { word: "Surah", meaning: "章", definition: "a chapter of the Qur'an with its own sequence context and themes", collocations: ["Qur'anic chapter", "Surah theme"], knowledgePoint: "Interpret a Surah using its wording, wider context and relevant theme rather than isolated phrases." },
      { word: "ayah", meaning: "经文节", definition: "a verse or sign within a chapter of the Qur'an", collocations: ["Qur'anic verse", "textual evidence"], knowledgePoint: "Quote or paraphrase an ayah accurately and explain how it supports the specific question." },
      { word: "revelation", meaning: "启示", definition: "divine communication of guidance to a prophet according to Islamic belief", collocations: ["first revelation", "revealed guidance"], knowledgePoint: "Explain the setting and significance of revelation without treating historical context as separate from meaning." },
      { word: "Hadith", meaning: "圣训", definition: "a report concerning the sayings actions approvals or characteristics of the Prophet Muhammad", collocations: ["Hadith collection", "Prophetic practice"], knowledgePoint: "A Hadith report is assessed through its chain and text; distinguish it from Qur'anic revelation." },
      { word: "isnad", meaning: "传述链", definition: "the chain of transmitters through whom a Hadith report is passed", collocations: ["chain of transmission", "Hadith authentication"], knowledgePoint: "Isnad matters because reliability depends on continuity and the trustworthiness of transmitters." },
      { word: "matn", meaning: "正文", definition: "the main text or content of a Hadith report after its chain of transmission", collocations: ["Hadith text", "content analysis"], knowledgePoint: "Assessment considers both matn and isnad; a sound chain alone does not excuse a contradictory text." },
      { word: "Sunnah", meaning: "圣行", definition: "the normative example of the Prophet Muhammad expressed through sayings actions and approvals", collocations: ["Prophetic example", "follow the Sunnah"], knowledgePoint: "Explain how Sunnah guides belief and practice while distinguishing its source forms." },
      { word: "Seerah", meaning: "先知传记", definition: "the biography and historical account of the life of the Prophet Muhammad", collocations: ["Prophetic biography", "historical context"], knowledgePoint: "Use Seerah events chronologically and explain their relevance to the development of the Muslim community." },
      { word: "Tawhid", meaning: "认主独一", definition: "the belief in the absolute oneness and uniqueness of God in Islam", collocations: ["oneness of God", "Islamic belief"], knowledgePoint: "Tawhid underpins worship, ethics and rejection of associating partners with God." },
      { word: "Shirk", meaning: "以物配主", definition: "associating partners with God or giving divine status to something other than God", collocations: ["avoid shirk", "monotheism"], knowledgePoint: "Define Shirk precisely in relation to Tawhid rather than using it as a general label for difference." },
      { word: "Risalah", meaning: "使者使命", definition: "the belief that God sends prophets and messengers to guide humanity", collocations: ["prophetic mission", "messengers"], knowledgePoint: "Link Risalah to the purpose of revelation and the examples provided by prophets." },
      { word: "Akhirah", meaning: "后世", definition: "belief in life after death including accountability judgement and ultimate outcome", collocations: ["Day of Judgement", "afterlife"], knowledgePoint: "Explain how belief in Akhirah can shape moral responsibility and daily choices." },
      { word: "Malaikah", meaning: "天使", definition: "angels in Islamic belief who carry out duties assigned by God", collocations: ["angelic duty", "unseen world"], knowledgePoint: "Describe a named role accurately and connect belief in angels to revelation or accountability where relevant." },
      { word: "Zakah", meaning: "天课", definition: "an obligatory charitable payment intended to purify wealth and support eligible recipients", collocations: ["obligatory charity", "social welfare"], knowledgePoint: "Distinguish Zakah from voluntary charity and explain both spiritual and social purposes." },
      { word: "Salah", meaning: "礼拜", definition: "the prescribed ritual prayer performed by Muslims at set times", collocations: ["daily prayer", "worship practice"], knowledgePoint: "Explain preparation, communal and individual dimensions, and the spiritual purpose without reducing Salah to routine." },
      { word: "Sawm", meaning: "斋戒", definition: "fasting in Ramadan from dawn to sunset as an act of worship and discipline", collocations: ["Ramadan fasting", "self-discipline"], knowledgePoint: "Link Sawm to empathy, self-control, worship and community while recognising exemptions in Islamic practice." },
      { word: "Hajj", meaning: "朝觐", definition: "the pilgrimage to Makkah required once in a lifetime for Muslims who are able", collocations: ["pilgrimage rites", "Makkah"], knowledgePoint: "Explain selected rites and how they express unity, remembrance, obedience and equality." },
      { word: "Jihad", meaning: "奋斗", definition: "striving in the way of God including personal moral effort and in some contexts collective defence", collocations: ["greater jihad", "ethical striving"], knowledgePoint: "Avoid reducing Jihad to one meaning; explain context, ethical limits and the distinction between personal and armed struggle." },
      { word: "ummah", meaning: "穆斯林共同体", definition: "the worldwide community of Muslims connected by shared faith and responsibility", collocations: ["Muslim community", "collective responsibility"], knowledgePoint: "Use Ummah to discuss solidarity and mutual duties without erasing cultural and historical diversity." },
      { word: "Hijrah", meaning: "迁徙", definition: "the migration of the Prophet Muhammad and followers from Makkah to Madinah in 622 CE", collocations: ["migration to Madinah", "Islamic calendar"], knowledgePoint: "Explain Hijrah as a turning point in community formation, not merely a change of location." },
      { word: "Makkah", meaning: "麦加", definition: "the city central to early Islamic history and the destination of the Hajj pilgrimage", collocations: ["Ka'bah", "pilgrimage city"], knowledgePoint: "Place Makkah accurately in historical events and religious practice." },
      { word: "Madinah", meaning: "麦地那", definition: "the city where the early Muslim community developed after the Hijrah", collocations: ["Medinan community", "Constitution of Madinah"], knowledgePoint: "Explain how Madinah introduced community, governance and intergroup responsibilities." },
      { word: "Caliph", meaning: "哈里发", definition: "a leader of the Muslim community succeeding the Prophet Muhammad in temporal leadership", collocations: ["Rightly Guided Caliphs", "leadership"], knowledgePoint: "Distinguish political leadership from prophethood and place each caliph in historical context." },
      { word: "Khilafah", meaning: "哈里发制度", definition: "the institution or period of caliphal leadership in Muslim history", collocations: ["caliphal authority", "community leadership"], knowledgePoint: "Evaluate authority through historical evidence rather than assuming all caliphates were identical." },
      { word: "Shari'ah", meaning: "伊斯兰教法原则", definition: "the broad moral and legal path derived from Islamic sources and interpretive methods", collocations: ["Islamic law", "ethical guidance"], knowledgePoint: "Explain Shari'ah as a framework of sources and principles, not only as individual legal penalties." },
      { word: "fiqh", meaning: "法学理解", definition: "human understanding and interpretation of Islamic law in particular contexts", collocations: ["legal reasoning", "juristic opinion"], knowledgePoint: "Figh may vary across scholars and schools; distinguish interpretation from the divine source itself." },
      { word: "ijma", meaning: "公议", definition: "scholarly consensus used as a source or method in Islamic legal reasoning", collocations: ["scholarly consensus", "legal source"], knowledgePoint: "Explain whose consensus and how it relates to Qur'an and Sunnah evidence." },
      { word: "qiyas", meaning: "类比推理", definition: "reasoning by analogy from an established ruling to a new case with a shared cause", collocations: ["analogical reasoning", "legal method"], knowledgePoint: "A valid analogy identifies the relevant shared cause, not just surface similarity." },
      { word: "adl", meaning: "公正", definition: "justice and fairness in moral social and legal conduct", collocations: ["social justice", "fair dealing"], knowledgePoint: "Use evidence to show how justice applies to rights, responsibilities and treatment of others." },
      { word: "rahmah", meaning: "慈悯", definition: "mercy compassion and care as an important Islamic moral quality", collocations: ["compassion", "merciful conduct"], knowledgePoint: "Relate Rahmah to concrete ethical action and relevant textual or historical evidence." },
      { word: "akhlaq", meaning: "品德伦理", definition: "moral character and ethical conduct in Islamic thought and practice", collocations: ["good character", "moral behaviour"], knowledgePoint: "Explain how belief, intention and actions are connected in ethical conduct." },
      { word: "intention", meaning: "意向", definition: "the inward purpose behind an action which can affect its moral and religious significance", collocations: ["sincere intention", "niyyah"], knowledgePoint: "Do not treat intention as an excuse; connect it to action, responsibility and relevant teachings." },
      { word: "stewardship", meaning: "受托管理", definition: "responsible care for people resources and the environment as a trust", collocations: ["environmental responsibility", "trusteeship"], knowledgePoint: "Apply stewardship to a concrete ethical issue and weigh responsibilities to others and future generations." },
      { word: "authenticity", meaning: "真实性", definition: "the reliability of a report or source based on its transmission content and evidence", collocations: ["authentic Hadith", "source evaluation"], knowledgePoint: "Explain the criteria used to assess authenticity instead of merely labelling a source reliable." },
    ]),
  },
  {
    subject: "biblical-studies", topic: "alevel-biblical-studies-texts-and-interpretation", label: "A-Level Biblical Studies: Texts & Interpretation",
    stage: "AS",
    note: "用于圣经文本、福音书、先知传统、历史语境、文本解释和神学主题题。",
    terms: customTerms([
      { word: "Bible", meaning: "圣经", definition: "the collection of sacred texts forming the Old and New Testaments in Christian tradition", collocations: ["biblical text", "scriptural canon"], knowledgePoint: "Locate a passage by testament, book, genre and historical setting before building an interpretation." },
      { word: "Old Testament", meaning: "旧约", definition: "the collection of texts relating to Israel's history law prophecy poetry and wisdom before the New Testament", collocations: ["Hebrew Bible", "covenant tradition"], knowledgePoint: "Do not treat the Old Testament as one genre or one voice; identify the specific book and context." },
      { word: "New Testament", meaning: "新约", definition: "the collection of early Christian texts including Gospels Acts letters and Revelation", collocations: ["early Christianity", "apostolic writing"], knowledgePoint: "Distinguish Gospel narrative, Acts, epistle and apocalyptic writing because their purposes differ." },
      { word: "Gospel", meaning: "福音书", definition: "a narrative account presenting the life teaching death and significance of Jesus", collocations: ["Synoptic Gospel", "Gospel narrative"], knowledgePoint: "Compare Gospel accounts with attention to audience, selection, structure and theological emphasis." },
      { word: "Synoptic Gospels", meaning: "对观福音", definition: "Matthew Mark and Luke which share substantial material and similar narrative perspectives", collocations: ["Synoptic problem", "shared tradition"], knowledgePoint: "Explain similarities and differences using textual evidence rather than assuming identical accounts." },
      { word: "parable", meaning: "比喻故事", definition: "a short narrative or comparison used to communicate a moral religious or theological insight", collocations: ["kingdom parable", "interpretation"], knowledgePoint: "Identify narrative turn, audience and challenge; a parable should not be reduced to one detached slogan." },
      { word: "miracle", meaning: "神迹", definition: "an extraordinary event in a biblical narrative interpreted as revealing divine power or purpose", collocations: ["healing miracle", "sign"], knowledgePoint: "Analyse how a miracle functions in its narrative and what response it elicits from characters and readers." },
      { word: "covenant", meaning: "盟约", definition: "a binding relationship or agreement between God and people carrying promises responsibilities or signs", collocations: ["Abrahamic covenant", "new covenant"], knowledgePoint: "Compare parties, promises, obligations and context when discussing a covenant." },
      { word: "prophet", meaning: "先知", definition: "a person called to communicate divine message often challenging injustice idolatry or unfaithfulness", collocations: ["prophetic calling", "social justice"], knowledgePoint: "Prophets are not only predictors; explain their message in social and historical context." },
      { word: "prophecy", meaning: "先知宣讲", definition: "a message or proclamation understood as communicating divine will or warning", collocations: ["prophetic oracle", "judgement"], knowledgePoint: "Distinguish historical warning, ethical critique and later interpretation rather than treating all prophecy as prediction." },
      { word: "Messiah", meaning: "弥赛亚", definition: "an anointed figure associated with hope leadership deliverance or salvation in Jewish and Christian traditions", collocations: ["messianic expectation", "anointed one"], knowledgePoint: "Explain which expectations a text uses and avoid merging all Jewish and Christian interpretations." },
      { word: "kingdom of God", meaning: "上帝的国", definition: "the reign or saving rule of God expressed in teaching ethics community and future hope", collocations: ["kingdom teaching", "reign of God"], knowledgePoint: "Analyse whether the text presents the kingdom as present, future or both, using evidence." },
      { word: "discipleship", meaning: "门徒身份", definition: "the practice of following learning from and responding to Jesus' teaching and example", collocations: ["call to discipleship", "faithful response"], knowledgePoint: "在具体经文中分析门徒身份如何通过行动、代价、误解或群体责任表现出来。" },
      { word: "apostle", meaning: "使徒", definition: "an authorised messenger and early leader sent to witness teach or establish communities", collocations: ["apostolic witness", "mission"], knowledgePoint: "Place an apostle in the relevant narrative or letter and distinguish role from later church office." },
      { word: "Gentile", meaning: "外邦人", definition: "a non-Jewish person in biblical and early Christian contexts", collocations: ["Gentile mission", "Jewish-Gentile relations"], knowledgePoint: "Use the term historically and explain tensions around inclusion, law and community identity." },
      { word: "crucifixion", meaning: "钉十字架", definition: "the execution of Jesus by crucifixion as narrated in the Gospels and interpreted theologically", collocations: ["passion narrative", "Roman execution"], knowledgePoint: "Separate historical narrative details from theological interpretations and support both with textual evidence." },
      { word: "resurrection", meaning: "复活", definition: "the belief and narrative claim that Jesus was raised from death after crucifixion", collocations: ["resurrection appearance", "Easter faith"], knowledgePoint: "Compare accounts carefully and explain their role in discipleship, mission and early belief." },
      { word: "salvation", meaning: "救恩", definition: "deliverance restoration or reconciliation associated with God's action in biblical theology", collocations: ["saving faith", "redemption"], knowledgePoint: "Define salvation according to the specific passage or tradition rather than assuming one formula." },
      { word: "grace", meaning: "恩典", definition: "unmerited divine favour or gift in Christian theological language", collocations: ["divine grace", "gift"], knowledgePoint: "Explain how grace relates to faith, action, law or community in the particular text." },
      { word: "sin", meaning: "罪", definition: "a condition or act of failure rebellion or separation in relation to God and moral responsibility", collocations: ["forgiveness of sin", "repentance"], knowledgePoint: "Use the passage's own language and avoid treating sin only as private rule-breaking." },
      { word: "repentance", meaning: "悔改", definition: "turning away from wrongdoing and reorienting life in response to God", collocations: ["call to repentance", "changed life"], knowledgePoint: "Show how repentance involves belief, action and community consequences in context." },
      { word: "redemption", meaning: "救赎", definition: "release restoration or rescue from bondage harm or alienation in biblical language", collocations: ["redeeming action", "deliverance"], knowledgePoint: "Identify what is being redeemed and which imagery or historical background the text uses." },
      { word: "justice", meaning: "公义", definition: "right relationship fair treatment and social responsibility emphasised in biblical ethical teaching", collocations: ["social justice", "righteousness"], knowledgePoint: "用具体经文解释公义如何体现在对弱势群体的对待与文本的历史语境中。" },
      { word: "wisdom literature", meaning: "智慧文学", definition: "biblical writings exploring practical moral and existential questions through sayings poetry or reflection", collocations: ["Proverbs", "Job"], knowledgePoint: "Recognise wisdom genres and avoid reading poetic generalisations as universal legal rules." },
      { word: "psalm", meaning: "诗篇", definition: "a poetic prayer song lament praise or reflection within the biblical Psalter", collocations: ["lament psalm", "praise psalm"], knowledgePoint: "Analyse voice, parallelism, imagery and emotional movement before drawing theological conclusions." },
      { word: "exodus", meaning: "出埃及", definition: "the deliverance narrative of Israel's departure from Egypt and its continuing theological significance", collocations: ["liberation", "wilderness"], knowledgePoint: "Use Exodus as a specific narrative and explain how later texts reinterpret it." },
      { word: "diaspora", meaning: "离散社群", definition: "a community living away from its ancestral homeland while maintaining identity and traditions", collocations: ["Jewish diaspora", "cultural identity"], knowledgePoint: "Explain historical setting and how diaspora affects language practice worship and identity." },
      { word: "exile", meaning: "流放", definition: "forced displacement from homeland that shapes memory identity theology and political experience", collocations: ["Babylonian exile", "restoration"], knowledgePoint: "Distinguish exile from diaspora and link it to the relevant historical period." },
      { word: "canon", meaning: "正典", definition: "the recognised collection of authoritative sacred texts within a religious tradition", collocations: ["canonical text", "scriptural authority"], knowledgePoint: "Use canon to discuss reception and authority, not as proof that every text has the same genre or purpose." },
      { word: "hermeneutics", meaning: "诠释学", definition: "the principles and methods used to interpret texts and their meanings", collocations: ["textual interpretation", "interpretive method"], knowledgePoint: "State the method and evidence used, and separate textual observation from later application." },
      { word: "historical context", meaning: "历史语境", definition: "the political social cultural and religious circumstances surrounding a text or event", collocations: ["first-century context", "historical setting"], knowledgePoint: "Context informs meaning but should not replace close reading of the passage itself." },
      { word: "literary context", meaning: "文学语境", definition: "the surrounding structure genre and narrative position that shape how a passage is read", collocations: ["surrounding passage", "genre"], knowledgePoint: "Read what comes before and after; a sentence may change meaning when detached from its argument or narrative." },
      { word: "redaction", meaning: "编纂", definition: "the selection arrangement and editing of material by a final author or editor", collocations: ["redaction criticism", "editorial emphasis"], knowledgePoint: "Use redaction arguments cautiously and show the textual pattern supporting an editorial emphasis." },
      { word: "source criticism", meaning: "来源批评", definition: "the study of possible written oral or traditional sources behind a biblical text", collocations: ["source theory", "shared material"], knowledgePoint: "Distinguish a scholarly hypothesis from direct textual fact and state its explanatory evidence." },
      { word: "form criticism", meaning: "形式批评", definition: "analysis of literary forms and their possible social settings before final written composition", collocations: ["genre analysis", "oral tradition"], knowledgePoint: "Identify the form and proposed setting, then explain how that affects interpretation." },
      { word: "theology", meaning: "神学", definition: "systematic reflection on God faith scripture and religious belief", collocations: ["theological theme", "doctrinal meaning"], knowledgePoint: "A theological claim must be grounded in the specific text, tradition and reasoning being discussed." },
    ]),
  },
  {
    subject: "thinking-skills", topic: "alevel-thinking-skills-arguments-and-problem-solving", label: "A-Level Thinking Skills: Arguments & Problem Solving",
    stage: "AS",
    note: "用于批判性思维、证据评价、论证分析、数据推理、问题解决和决策题。",
    terms: customTerms([
      { word: "argument", meaning: "论证", definition: "a set of reasons intended to support a conclusion or decision", collocations: ["analyse argument", "reasoned case"], knowledgePoint: "Map conclusion, reasons, evidence and assumptions before deciding whether an argument is strong." },
      { word: "conclusion", meaning: "结论", definition: "the claim an argument is trying to establish from its reasons and evidence", collocations: ["main conclusion", "draw conclusion"], knowledgePoint: "The conclusion may be stated or implied; do not confuse it with an example or background fact." },
      { word: "premise", meaning: "前提", definition: "a statement offered as a reason in support of a conclusion", collocations: ["supporting premise", "stated reason"], knowledgePoint: "Ask whether each premise is relevant, credible and sufficient for the conclusion." },
      { word: "assumption", meaning: "假设", definition: "an unstated idea that must be accepted for an argument to work", collocations: ["hidden assumption", "necessary assumption"], knowledgePoint: "A necessary assumption is not merely related; if false, it would seriously weaken the reasoning." },
      { word: "evidence", meaning: "证据", definition: "information used to justify challenge or assess a claim", collocations: ["reliable evidence", "evidence base"], knowledgePoint: "Evaluate source, method, relevance, date, sample and whether the evidence really supports the stated conclusion." },
      { word: "inference", meaning: "推断", definition: "a conclusion drawn from information that is not directly stated", collocations: ["reasonable inference", "infer from data"], knowledgePoint: "A valid inference must follow from the available evidence without adding an unsupported assumption." },
      { word: "deduction", meaning: "演绎推理", definition: "reasoning in which a conclusion must follow if the premises are true and the form is valid", collocations: ["deductive validity", "logical consequence"], knowledgePoint: "Test the form: a sound deduction needs valid structure and true premises." },
      { word: "induction", meaning: "归纳推理", definition: "reasoning from observations or examples to a probable general conclusion", collocations: ["inductive evidence", "general pattern"], knowledgePoint: "Inductive conclusions are probabilistic; check sample size, representativeness and alternative explanations." },
      { word: "validity", meaning: "有效推理", definition: "the property of a deductive argument whose conclusion follows logically from its premises", collocations: ["valid argument", "logical form"], knowledgePoint: "Validity concerns logical structure, not whether the conclusion is popular or the premises are factually true." },
      { word: "soundness", meaning: "健全性", definition: "the property of a deductively valid argument with true or well-supported premises", collocations: ["sound argument", "true premises"], knowledgePoint: "An argument can be valid but unsound if one premise is false." },
      { word: "relevance", meaning: "相关性", definition: "the degree to which information bears directly on the issue or conclusion being considered", collocations: ["relevant reason", "irrelevant detail"], knowledgePoint: "Relevant information may still be weak; relevance alone does not establish truth." },
      { word: "reliability", meaning: "可靠性", definition: "the dependability of a source method measurement or testimony", collocations: ["reliable source", "consistent result"], knowledgePoint: "Check expertise, interest, method, corroboration and whether the claim can be independently verified." },
      { word: "credibility", meaning: "可信度", definition: "the extent to which a source or claim deserves belief given its evidence and context", collocations: ["credible witness", "credible claim"], knowledgePoint: "Credibility is assessed through evidence, not through confident language or status alone." },
      { word: "bias", meaning: "偏差", definition: "a systematic tendency that can distort selection interpretation or presentation of evidence", collocations: ["confirmation bias", "selection bias"], knowledgePoint: "Identify the specific direction and mechanism of bias; do not label every disagreement as bias." },
      { word: "correlation", meaning: "相关性", definition: "a statistical association between variables that does not by itself establish causation", collocations: ["correlation coefficient", "data relationship"], knowledgePoint: "Consider reverse causation, coincidence and confounding variables before claiming cause." },
      { word: "causation", meaning: "因果关系", definition: "a relationship in which one factor contributes to producing a change in another", collocations: ["causal claim", "cause and effect"], knowledgePoint: "A causal claim needs a plausible mechanism and evidence excluding major alternative explanations." },
      { word: "confounding variable", meaning: "混杂变量", definition: "a factor related to both variables that can create a misleading apparent relationship", collocations: ["third variable", "control variable"], knowledgePoint: "Identify how the third variable could influence both sides of the observed correlation." },
      { word: "counterexample", meaning: "反例", definition: "a case that shows a general claim or rule is not always true", collocations: ["disprove claim", "exception case"], knowledgePoint: "One genuine counterexample can refute a universal claim but may not refute a probabilistic claim." },
      { word: "counterargument", meaning: "反方论证", definition: "a reason or evidence challenging an existing conclusion or proposal", collocations: ["alternative argument", "objection"], knowledgePoint: "A good evaluation states the strongest counterargument and assesses its actual impact on the conclusion." },
      { word: "analogy", meaning: "类比", definition: "a comparison between cases used to support an inference or explanation", collocations: ["relevant similarity", "false analogy"], knowledgePoint: "An analogy is strong only if the shared features are relevant to the conclusion." },
      { word: "false dilemma", meaning: "错误二分", definition: "a fallacy presenting only two options when additional reasonable possibilities exist", collocations: ["either-or fallacy", "missing option"], knowledgePoint: "Show the omitted alternative and explain how it weakens the forced choice." },
      { word: "ad hominem", meaning: "人身攻击谬误", definition: "a fallacy attacking a person rather than addressing the relevance or truth of their claim", collocations: ["personal attack", "fallacious response"], knowledgePoint: "A source's credibility can sometimes matter, but personal criticism is not a substitute for evaluating evidence." },
      { word: "straw man", meaning: "稻草人谬误", definition: "a fallacy misrepresenting an opposing view so that it is easier to attack", collocations: ["misrepresent argument", "weaken opposition"], knowledgePoint: "Compare the response with the opponent's actual claim to identify the distortion." },
      { word: "appeal to authority", meaning: "诉诸权威", definition: "relying on a person's status as evidence without checking relevant expertise or supporting reasons", collocations: ["expert evidence", "authority claim"], knowledgePoint: "Relevant qualified experts can provide evidence, but authority does not remove the need for method and corroboration." },
      { word: "circular reasoning", meaning: "循环论证", definition: "reasoning that assumes the conclusion within one of its own premises", collocations: ["beg the question", "self-supporting claim"], knowledgePoint: "Restating a claim in different words does not provide independent support." },
      { word: "ambiguity", meaning: "歧义", definition: "a word phrase or statement with more than one plausible meaning", collocations: ["ambiguous wording", "clarify meaning"], knowledgePoint: "Test whether a conclusion changes when a key term is read in another reasonable sense." },
      { word: "statistical significance", meaning: "统计显著性", definition: "an indication that an observed result is unlikely under a stated statistical model of chance", collocations: ["significant result", "p-value"], knowledgePoint: "Statistical significance is not the same as practical importance, causal proof or a large effect." },
      { word: "sample", meaning: "样本", definition: "a selected subset of a wider population used to gather data", collocations: ["representative sample", "sample size"], knowledgePoint: "Check who was included, who was excluded and whether the sample supports the generalisation claimed." },
      { word: "representativeness", meaning: "代表性", definition: "the extent to which a sample reflects important characteristics of the wider population", collocations: ["representative survey", "sampling frame"], knowledgePoint: "Large samples can still be unrepresentative if selection is biased." },
      { word: "base rate", meaning: "基础比率", definition: "the underlying frequency of an event in the relevant population before new evidence is considered", collocations: ["base-rate neglect", "prior probability"], knowledgePoint: "Use the base rate with test accuracy and conditional probability; striking cases can be misleading." },
      { word: "conditional probability", meaning: "条件概率", definition: "the probability of an event given that another specified condition is true", collocations: ["given that", "probability tree"], knowledgePoint: "Define the condition clearly and choose the denominator from the restricted group, not the whole population." },
      { word: "expected value", meaning: "期望值", definition: "the weighted average outcome calculated from possible values and their probabilities", collocations: ["expected payoff", "risk decision"], knowledgePoint: "Expected value supports comparison over repeated cases but does not guarantee one individual outcome." },
      { word: "constraint", meaning: "约束条件", definition: "a limit or requirement that restricts possible solutions to a problem", collocations: ["time constraint", "budget constraint"], knowledgePoint: "List constraints explicitly before comparing options; a solution that ignores one is not feasible." },
      { word: "criterion", meaning: "评价标准", definition: "a stated measure used to judge or compare options", collocations: ["decision criterion", "success criterion"], knowledgePoint: "Use criteria consistently and justify weighting where some outcomes matter more than others." },
      { word: "trade-off", meaning: "权衡", definition: "a compromise in which gaining one benefit involves giving up another", collocations: ["weigh trade-offs", "opportunity cost"], knowledgePoint: "State who gains and loses, what evidence supports the trade-off, and whether a better alternative exists." },
      { word: "algorithm", meaning: "算法步骤", definition: "a finite ordered procedure for solving a defined problem or reaching a decision", collocations: ["solution method", "step-by-step procedure"], knowledgePoint: "Check that each step is unambiguous, complete and works for edge cases as well as typical cases." },
      { word: "heuristic", meaning: "启发式策略", definition: "a practical rule of thumb used to simplify a problem or decision", collocations: ["decision shortcut", "rule of thumb"], knowledgePoint: "A heuristic can be useful under time limits but may introduce systematic error; explain its boundary." },
    ]),
  },
  {
    subject: "digital-media-design", topic: "alevel-digital-media-design-production-and-evaluation", label: "A-Level Digital Media & Design: Production & Evaluation",
    stage: "AS",
    note: "用于设计 brief、受众、视觉传播、交互、原型、可访问性、制作与评价题。",
    terms: customTerms([
      { word: "design brief", meaning: "设计简报", definition: "a concise statement defining a design problem client user need purpose and constraints", collocations: ["client brief", "design problem"], knowledgePoint: "A brief is the starting constraint; transform it into testable requirements rather than copying it into the solution." },
      { word: "client", meaning: "客户", definition: "the person organisation or stakeholder commissioning a design outcome", collocations: ["client needs", "client feedback"], knowledgePoint: "Client wishes matter, but reconcile them with user needs, budget, ethics and technical feasibility." },
      { word: "target audience", meaning: "目标受众", definition: "the specific group a media or design product is intended to reach and serve", collocations: ["audience profile", "user research"], knowledgePoint: "Define audience through needs, context, access and goals, not stereotypes or only age." },
      { word: "user persona", meaning: "用户画像", definition: "an evidence-based profile representing a key type of intended user", collocations: ["user needs", "audience scenario"], knowledgePoint: "A persona should be based on research and used to test decisions, not invented decoration." },
      { word: "user journey", meaning: "用户旅程", definition: "the sequence of steps and experiences a user has while trying to complete a goal", collocations: ["user flow", "pain point"], knowledgePoint: "Map entry point, actions, decisions, errors and success so friction can be tested." },
      { word: "information architecture", meaning: "信息架构", definition: "the organisation and labelling of information so users can find and understand content", collocations: ["navigation structure", "content hierarchy"], knowledgePoint: "Group information by user tasks and test whether labels make sense without insider knowledge." },
      { word: "wireframe", meaning: "线框图", definition: "a low-detail layout showing content structure hierarchy and interaction placement", collocations: ["page layout", "screen plan"], knowledgePoint: "Wireframes test structure before visual polish; annotate intended user action and priority." },
      { word: "prototype", meaning: "原型", definition: "an early model used to test how a design looks works or communicates before final production", collocations: ["interactive prototype", "iterative testing"], knowledgePoint: "Match fidelity to the question: test flow early, then test visual and technical details later." },
      { word: "iteration", meaning: "迭代", definition: "a repeated cycle of making testing evaluating and improving a design", collocations: ["design iteration", "refine outcome"], knowledgePoint: "An iteration needs evidence of what changed, why it changed and whether the change improved the criteria." },
      { word: "mood board", meaning: "情绪板", definition: "a visual collection used to communicate intended style atmosphere colour material and reference direction", collocations: ["visual direction", "style reference"], knowledgePoint: "A mood board informs design choices but is not evidence that a solution meets user needs." },
      { word: "visual hierarchy", meaning: "视觉层级", definition: "the arrangement of size contrast position and repetition guiding viewers to important information", collocations: ["focal point", "content priority"], knowledgePoint: "Use hierarchy to direct attention in the order the user needs, then test whether people actually notice it." },
      { word: "contrast", meaning: "对比度", definition: "a visible difference in colour value size shape or type used to distinguish elements", collocations: ["colour contrast", "visual emphasis"], knowledgePoint: "Contrast can improve legibility and hierarchy, but check accessibility rather than relying on taste." },
      { word: "alignment", meaning: "对齐", definition: "the deliberate positioning of elements along shared lines or relationships to create order", collocations: ["grid alignment", "layout consistency"], knowledgePoint: "Consistent alignment supports scanning and reduces visual noise; exceptions should have a clear purpose." },
      { word: "grid system", meaning: "网格系统", definition: "a set of guides used to organise layout spacing columns and alignment consistently", collocations: ["responsive grid", "column layout"], knowledgePoint: "A grid supports consistency across screen sizes but must adapt rather than simply shrink on mobile." },
      { word: "typography", meaning: "字体排印", definition: "the selection and arrangement of type to support legibility hierarchy tone and communication", collocations: ["type scale", "font pairing"], knowledgePoint: "Evaluate size, line length, spacing and contrast in the intended context, not only font style." },
      { word: "legibility", meaning: "易辨识性", definition: "the ease with which individual letters words and symbols can be distinguished", collocations: ["text contrast", "readable type"], knowledgePoint: "Legibility depends on font, size, spacing, contrast and display conditions." },
      { word: "readability", meaning: "易读性", definition: "the ease with which a longer text can be read and understood comfortably", collocations: ["reading flow", "content clarity"], knowledgePoint: "Readability includes language, structure, line length and hierarchy, not just font size." },
      { word: "colour palette", meaning: "配色方案", definition: "a planned set of colours used consistently across a visual or interactive design", collocations: ["brand colours", "accessible palette"], knowledgePoint: "Colour must support meaning and contrast; do not make colour the sole carrier of important information." },
      { word: "branding", meaning: "品牌识别", definition: "the visual verbal and experiential identity distinguishing an organisation product or service", collocations: ["brand identity", "consistent voice"], knowledgePoint: "Branding should be consistent with audience and purpose while remaining usable and accessible." },
      { word: "copyright", meaning: "版权", definition: "legal protection controlling the use of an original creative work", collocations: ["licensed asset", "copyright permission"], knowledgePoint: "Use original, licensed or permitted assets and record source, licence and attribution conditions." },
      { word: "attribution", meaning: "署名标注", definition: "acknowledgement of a creator source or licence when using work or information", collocations: ["credit source", "licence notice"], knowledgePoint: "Attribution does not automatically grant permission; check licence terms as well." },
      { word: "accessibility", meaning: "无障碍性", definition: "the degree to which a product can be used by people with different abilities devices and conditions", collocations: ["accessible design", "inclusive access"], knowledgePoint: "Check text alternatives, keyboard use, contrast, captions, clear labels and responsive layout." },
      { word: "alternative text", meaning: "替代文本", definition: "a concise text description conveying the essential information or function of an image", collocations: ["image description", "screen reader"], knowledgePoint: "Describe the purpose of an informative image; decorative images can be marked so they are ignored." },
      { word: "caption", meaning: "字幕", definition: "synchronised text representing spoken dialogue and relevant sound information in media", collocations: ["video caption", "subtitles"], knowledgePoint: "Captions support access and comprehension; include meaningful sound cues when they affect understanding." },
      { word: "responsive design", meaning: "响应式设计", definition: "design that adapts layout content and interaction appropriately across screen sizes and devices", collocations: ["mobile layout", "breakpoint"], knowledgePoint: "Test actual target dimensions and avoid hiding essential controls or causing horizontal overflow." },
      { word: "interaction design", meaning: "交互设计", definition: "the design of how users act receive feedback and move through a digital product", collocations: ["user interaction", "feedback state"], knowledgePoint: "Every action needs clear affordance, feedback, error recovery and a predictable result." },
      { word: "affordance", meaning: "操作暗示", definition: "a visible cue suggesting how an interface element can be used", collocations: ["clickable cue", "button affordance"], knowledgePoint: "Do not rely on hidden gestures or colour alone; controls should look and behave like controls." },
      { word: "feedback", meaning: "操作反馈", definition: "information shown to users after an action to indicate progress result or error", collocations: ["loading feedback", "success state"], knowledgePoint: "Feedback must be timely, specific and truthful; never show success before the action actually completes." },
      { word: "usability testing", meaning: "可用性测试", definition: "observing representative users attempting tasks to identify design problems", collocations: ["task test", "user observation"], knowledgePoint: "Set realistic tasks, observe behaviour, record evidence and prioritise fixes by impact rather than preference." },
      { word: "success criterion", meaning: "成功标准", definition: "a measurable condition used to judge whether a design outcome meets its intended requirements", collocations: ["evaluation metric", "design requirement"], knowledgePoint: "Write criteria before final evaluation and use evidence from user testing, not only self-description." },
      { word: "asset", meaning: "媒体素材", definition: "a reusable media element such as an image video audio icon font or illustration", collocations: ["media asset", "source file"], knowledgePoint: "Track asset source, format, size, licence and intended purpose to avoid technical or legal mistakes." },
      { word: "resolution", meaning: "分辨率", definition: "the amount of image detail expressed through pixel dimensions or density", collocations: ["image resolution", "pixel density"], knowledgePoint: "Choose resolution for the final display or print size; enlarging low-resolution images reduces quality." },
      { word: "file format", meaning: "文件格式", definition: "a standard way of encoding digital media data with particular capabilities and limitations", collocations: ["lossless format", "web format"], knowledgePoint: "Select format based on transparency, compression, quality, editing needs and delivery platform." },
      { word: "compression", meaning: "压缩", definition: "reducing file size by removing or encoding data more efficiently", collocations: ["lossy compression", "file size"], knowledgePoint: "Balance download speed with visible quality; test the exported asset in its real use context." },
      { word: "storyboard", meaning: "分镜脚本", definition: "a sequence of frames planning visual action timing audio and transitions for media production", collocations: ["video plan", "shot sequence"], knowledgePoint: "Each frame should show purpose, action, audio and transition so production decisions can be checked." },
      { word: "shot composition", meaning: "镜头构图", definition: "the arrangement of people objects space and viewpoint within a camera frame", collocations: ["camera angle", "visual framing"], knowledgePoint: "Composition directs attention and conveys relationships; explain framing evidence rather than saying a shot is simply effective." },
      { word: "ethical design", meaning: "伦理设计", definition: "design practice considering harm fairness privacy consent representation and social consequences", collocations: ["informed consent", "data privacy"], knowledgePoint: "Identify affected groups, foreseeable harms and safeguards; ethical claims require concrete design choices." },
    ]),
  },
  {
    subject: "world-literature", topic: "igcse-world-literature-text-and-context", label: "IGCSE World Literature: Text & Context",
    stage: "IGCSE",
    note: "用于跨文化文本、叙事、诗歌、戏剧、翻译、身份、权力和批评阅读。",
    terms: customTerms([
      { word: "world literature", meaning: "世界文学", definition: "literature read across national linguistic cultural or historical boundaries", collocations: ["cross-cultural reading", "global text"], knowledgePoint: "Analyse a specific text and its context; world literature is not a single uniform tradition." },
      { word: "close reading", meaning: "细读", definition: "careful analysis of precise language structure form and detail within a text", collocations: ["textual evidence", "language analysis"], knowledgePoint: "Start with quotation-level observations, then build an interpretation; avoid broad claims without evidence." },
      { word: "narrator", meaning: "叙述者", definition: "the voice or agency through which a narrative is presented to the reader", collocations: ["first-person narrator", "unreliable narrator"], knowledgePoint: "Distinguish narrator from author and ask what the chosen voice reveals or limits." },
      { word: "focalisation", meaning: "聚焦视角", definition: "the perspective through which narrative information and perception are filtered", collocations: ["internal focalisation", "limited viewpoint"], knowledgePoint: "Focalisation controls what readers know and how they judge events; cite moments of access or exclusion." },
      { word: "point of view", meaning: "视角", definition: "the position from which a story or event is perceived and narrated", collocations: ["narrative viewpoint", "shifting perspective"], knowledgePoint: "Compare whose experience is foregrounded and whose is absent or marginalised." },
      { word: "characterisation", meaning: "人物塑造", definition: "the methods by which a text presents a character's qualities motives relationships and change", collocations: ["direct characterisation", "indirect detail"], knowledgePoint: "Use speech, action, description, structure and other characters' responses as evidence." },
      { word: "setting", meaning: "环境背景", definition: "the time place social world and atmosphere in which a text's events occur", collocations: ["social setting", "historical setting"], knowledgePoint: "Explain how setting shapes conflict, identity, possibility and readers' mood rather than treating it as scenery." },
      { word: "plot", meaning: "情节结构", definition: "the organised sequence of events and causal relationships in a narrative", collocations: ["turning point", "plot development"], knowledgePoint: "Track causation and structure, not only what happens first and next." },
      { word: "conflict", meaning: "冲突", definition: "a significant tension between characters values desires forces or social systems", collocations: ["internal conflict", "social conflict"], knowledgePoint: "Identify what is at stake and how the conflict develops or remains unresolved." },
      { word: "theme", meaning: "主题", definition: "a developed idea or question explored through a text's language form and events", collocations: ["central theme", "thematic development"], knowledgePoint: "State themes as arguable ideas and support them with patterns across the text." },
      { word: "motif", meaning: "母题", definition: "a recurring image idea phrase situation or element that develops significance in a text", collocations: ["recurring motif", "pattern of imagery"], knowledgePoint: "Trace repetition and variation to explain how a motif builds theme or structure." },
      { word: "symbol", meaning: "象征", definition: "an image object action or setting that carries meaning beyond its literal role", collocations: ["symbolic object", "layered meaning"], knowledgePoint: "A symbol needs textual pattern and context; avoid assigning fixed meanings without evidence." },
      { word: "imagery", meaning: "意象", definition: "language that creates sensory pictures and associations for readers", collocations: ["visual imagery", "sensory detail"], knowledgePoint: "Analyse diction, sensory effect and thematic association rather than only identifying the image." },
      { word: "metaphor", meaning: "隐喻", definition: "a comparison that describes one thing in terms of another to generate new meaning", collocations: ["extended metaphor", "figurative language"], knowledgePoint: "Explain the relationship between the compared ideas and how it shapes readers' interpretation." },
      { word: "simile", meaning: "明喻", definition: "an explicit comparison usually using words such as like or as", collocations: ["comparative image", "figurative comparison"], knowledgePoint: "Do not stop at spotting a simile; analyse its qualities, tone and relevance to context." },
      { word: "irony", meaning: "反讽", definition: "a contrast between appearance expectation statement and underlying meaning or outcome", collocations: ["dramatic irony", "verbal irony"], knowledgePoint: "Specify the gap and who recognises it; irony is not simply anything unfortunate." },
      { word: "juxtaposition", meaning: "并置", definition: "placing contrasting or related elements close together to create comparison or tension", collocations: ["contrasting images", "structural contrast"], knowledgePoint: "Explain why these elements are placed together and what idea or emotion the contrast develops." },
      { word: "tone", meaning: "语调", definition: "the attitude or emotional stance created by a text's language and voice", collocations: ["ambivalent tone", "critical tone"], knowledgePoint: "Support tone with precise choices of diction, syntax, imagery or address." },
      { word: "mood", meaning: "氛围", definition: "the emotional atmosphere a text creates for readers through setting language and pace", collocations: ["tense mood", "melancholic atmosphere"], knowledgePoint: "Distinguish mood experienced by readers from tone expressed by the narrator or speaker." },
      { word: "diction", meaning: "用词", definition: "the deliberate selection of words and their associations in a text", collocations: ["formal diction", "loaded language"], knowledgePoint: "Analyse denotation, connotation, register, pattern and contrast in word choice." },
      { word: "syntax", meaning: "句法", definition: "the arrangement of words phrases and clauses into sentences", collocations: ["fragmented syntax", "periodic sentence"], knowledgePoint: "Sentence length, order and punctuation can shape pace, emphasis, voice and uncertainty." },
      { word: "form", meaning: "体裁形式", definition: "the overall genre and structural type through which a literary work is made", collocations: ["poetic form", "dramatic form"], knowledgePoint: "Form shapes what a text can do; link it to specific structural or audience effects." },
      { word: "genre", meaning: "类型", definition: "a category of texts sharing conventions expectations and historical associations", collocations: ["novel genre", "tragic convention"], knowledgePoint: "Use genre conventions as evidence, but recognise that texts can adapt or challenge them." },
      { word: "verse", meaning: "诗行", definition: "poetic writing arranged in lines and often shaped by rhythm sound or pattern", collocations: ["free verse", "verse form"], knowledgePoint: "Read line breaks, rhythm, sound and visual layout as meaning-making choices." },
      { word: "stanza", meaning: "诗节", definition: "a grouped unit of lines in a poem functioning like a paragraph", collocations: ["stanza break", "poetic structure"], knowledgePoint: "Compare stanza structure and transitions to track changes in thought, speaker or mood." },
      { word: "rhyme scheme", meaning: "押韵结构", definition: "the ordered pattern of end sounds in lines of verse", collocations: ["regular rhyme", "slant rhyme"], knowledgePoint: "Describe the pattern accurately and explain its effect on expectation, unity, disruption or tone." },
      { word: "rhythm", meaning: "节奏", definition: "the pattern of stress pace repetition and movement in language or verse", collocations: ["irregular rhythm", "metrical pattern"], knowledgePoint: "Use sound and syntax evidence to explain how rhythm affects voice, emotion or reading speed." },
      { word: "dramatic monologue", meaning: "戏剧独白诗", definition: "a poem spoken by a character to a silent listener revealing personality and situation", collocations: ["speaker persona", "implied listener"], knowledgePoint: "Analyse what the speaker says, avoids and unintentionally reveals; speaker is not identical to poet." },
      { word: "stage direction", meaning: "舞台指示", definition: "a playwright's instruction about movement setting action tone or production", collocations: ["performance choice", "staging"], knowledgePoint: "Explain how a direction shapes performance and audience understanding rather than treating it as background." },
      { word: "dialogue", meaning: "对白", definition: "spoken exchange between characters used to reveal action relationship conflict or ideas", collocations: ["interrupted dialogue", "conversational exchange"], knowledgePoint: "Analyse turns, silence, interruption and contrast between what is said and what is meant." },
      { word: "translation", meaning: "翻译", definition: "the rendering of a text from one language into another through necessary interpretive choices", collocations: ["translator choice", "translated text"], knowledgePoint: "A translation is an interpretation: compare wording, register and cultural nuance without assuming one exact equivalent." },
      { word: "cultural context", meaning: "文化语境", definition: "the shared values practices histories and assumptions shaping a text's production and reception", collocations: ["cultural reference", "social context"], knowledgePoint: "Use context to illuminate a textual detail, not to replace analysis or stereotype a culture." },
      { word: "colonialism", meaning: "殖民主义", definition: "political economic and cultural domination of one people or territory by another power", collocations: ["colonial power", "imperial rule"], knowledgePoint: "Trace specific relations of power, language, land or representation in the text and historical context." },
      { word: "postcolonial reading", meaning: "后殖民阅读", definition: "an interpretation examining colonial power legacy representation identity and resistance in texts", collocations: ["colonial legacy", "cultural power"], knowledgePoint: "Use postcolonial concepts to illuminate textual evidence, not as a label applied without historical specificity." },
      { word: "diaspora", meaning: "离散", definition: "the dispersal of people from an ancestral homeland and the identities formed across places", collocations: ["diasporic identity", "migration"], knowledgePoint: "Analyse tensions between memory, belonging, language, home and host society in the specific text." },
      { word: "identity", meaning: "身份认同", definition: "a person's or group's sense of self shaped by social cultural historical and personal factors", collocations: ["hybrid identity", "social identity"], knowledgePoint: "Avoid treating identity as fixed; explain how it is narrated, contested or changed in the text." },
      { word: "othering", meaning: "他者化", definition: "representing a group as fundamentally different inferior exotic or outside the norm", collocations: ["stereotyped representation", "power relation"], knowledgePoint: "Identify language, narrative position and power that construct the 'other', then assess effects." },
      { word: "intertextuality", meaning: "互文性", definition: "meaning created through a text's relationship with other texts stories genres or cultural references", collocations: ["allusion", "textual echo"], knowledgePoint: "Name the connection and explain how readers' knowledge of it changes interpretation." },
      { word: "critical lens", meaning: "批评视角", definition: "a focused interpretive approach used to examine particular questions or patterns in a text", collocations: ["feminist lens", "Marxist lens"], knowledgePoint: "A lens guides attention but should not force evidence; acknowledge alternative readings where useful." },
    ]),
  },
];

groups.push(...igAlevelLanguageAndReasoningSubjectGroups);

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
  ["to the nearest whole number", "四舍五入到最接近的整数", "Round the final answer to an integer after completing the calculation.", "Give your answer to the nearest whole number.", "将答案四舍五入到最接近的整数。"],
  ["correct to two decimal places", "保留两位小数", "Round only the final answer so that two digits remain after the decimal point.", "Give the probability correct to two decimal places.", "概率答案保留两位小数。"],
  ["taking g to be 9.8", "取 g 为 9.8", "Use the stated gravitational field strength instead of another remembered value.", "Taking g to be 9.8 m s-2, calculate the weight.", "取 g = 9.8 m s^-2，计算重力。"],
  ["show that the expression simplifies to", "证明该表达式可化简为", "Use algebraic steps to reach the given form exactly.", "Show that the expression simplifies to 2x + 3.", "证明该表达式可化简为 2x + 3。"],
  ["find the set of values", "求取值集合", "Solve the inequality or condition and express the solution set clearly.", "Find the set of values of x for which the function is positive.", "求使函数为正的 x 的取值集合。"],
  ["hence find the exact value", "由此求精确值", "Use the previous result and keep fractions, surds or pi exactly.", "Hence find the exact value of sin theta.", "由此求 sin theta 的精确值。"],
  ["write down an expression for", "写出……的表达式", "Give a formula or algebraic expression, often without full derivation.", "Write down an expression for the total cost.", "写出总成本的表达式。"],
  ["in terms of", "用……表示", "Express the answer using the specified variable or parameter.", "Find y in terms of x.", "用 x 表示 y。"],
  ["where k is a constant", "其中 k 为常数", "Treat k as fixed while other variables change.", "The force is kx, where k is a constant.", "力为 kx，其中 k 是常数。"],
  ["assuming the sample is representative", "假设样本具有代表性", "Generalise cautiously from the sample to the population.", "Assuming the sample is representative, estimate the population mean.", "假设样本具有代表性，估计总体平均值。"],
  ["using a suitable approximation", "使用合适的近似", "Choose a valid approximation and state why it is reasonable.", "Using a suitable approximation, estimate the probability.", "使用合适的近似估计该概率。"],
  ["neglect the mass of the string", "忽略绳子的质量", "Treat tension as the same throughout the light string.", "Neglect the mass of the string.", "忽略绳子的质量。"],
  ["air resistance is not negligible", "空气阻力不可忽略", "Include drag or energy loss instead of using the ideal projectile model.", "In this part, air resistance is not negligible.", "在这一问中，空气阻力不可忽略。"],
  ["the object is in limiting equilibrium", "物体处于临界平衡", "Resultant force is zero and friction has reached its limiting value.", "The object is in limiting equilibrium on the rough plane.", "物体在粗糙斜面上处于临界平衡。"],
  ["draw a fully labelled diagram", "画完整标注图", "Include relevant forces, directions, angles, distances or components.", "Draw a fully labelled diagram of the forces.", "画出完整标注的受力图。"],
  ["state one assumption made", "写出一个所作假设", "Name a modelling simplification used in the solution.", "State one assumption made in your model.", "写出模型中的一个假设。"],
  ["explain the significance of", "解释……的重要性", "Link the quantity or result to the conclusion, not just its definition.", "Explain the significance of the p-value.", "解释 p 值的重要性。"],
  ["with reference to the data", "结合数据", "Use a specific figure, trend or comparison from the given material.", "With reference to the data, evaluate the policy.", "结合数据评价该政策。"],
  ["using evidence from the figure", "使用图中证据", "Quote or describe a feature from the figure to support the answer.", "Using evidence from the figure, explain the trend.", "使用图中证据解释该趋势。"],
  ["explain why this is anomalous", "解释为什么这是异常值", "Compare it with the pattern and suggest a plausible reason.", "Explain why this result is anomalous.", "解释为什么该结果是异常值。"],
  ["suggest why the student repeated the experiment", "说明为什么学生重复实验", "Link repeats to random error, reliability or detecting anomalies.", "Suggest why the student repeated the experiment.", "说明为什么学生重复该实验。"],
  ["calculate the mean excluding anomalies", "排除异常值后计算平均值", "Remove only justified anomalies before averaging the remaining values.", "Calculate the mean excluding anomalies.", "排除异常值后计算平均值。"],
  ["state the independent variable", "写出自变量", "Identify the variable deliberately changed by the investigator.", "State the independent variable in this investigation.", "写出该实验中的自变量。"],
  ["state the dependent variable", "写出因变量", "Identify the variable measured as the outcome.", "State the dependent variable in this investigation.", "写出该实验中的因变量。"],
  ["state two control variables", "写出两个控制变量", "Name variables kept constant to make the test fair.", "State two control variables.", "写出两个控制变量。"],
  ["explain how reliability could be improved", "解释如何提高可靠性", "Mention repeats, larger samples or consistent methods and link to reliability.", "Explain how the reliability of the results could be improved.", "解释如何提高结果可靠性。"],
  ["explain how validity could be improved", "解释如何提高有效性", "Mention control of variables or better measurement of the intended quantity.", "Explain how the validity of the investigation could be improved.", "解释如何提高实验有效性。"],
  ["calculate the magnification", "计算放大倍数", "Use image size divided by actual size with consistent units.", "Calculate the magnification of the image.", "计算图像的放大倍数。"],
  ["compare the structures of", "比较……的结构", "Give similarities and differences using precise structural features.", "Compare the structures of arteries and veins.", "比较动脉和静脉的结构。"],
  ["describe the role of", "描述……的作用", "State what the structure or process does in the system.", "Describe the role of haemoglobin.", "描述血红蛋白的作用。"],
  ["explain the advantage of", "解释……的优点", "Link a feature to survival, efficiency, accuracy or business/economic benefit.", "Explain the advantage of a large surface area.", "解释大表面积的优点。"],
  ["evaluate the extent to which", "评价在多大程度上", "Judge how far a claim is true using arguments on both sides.", "Evaluate the extent to which the policy reduces unemployment.", "评价该政策在多大程度上降低失业。"],
  ["analyse the likely impact", "分析可能影响", "Build a cause-and-effect chain and identify affected stakeholders.", "Analyse the likely impact of higher interest rates.", "分析较高利率的可能影响。"],
  ["discuss the advantages and disadvantages", "讨论优缺点", "Present both benefits and costs before reaching a supported judgement.", "Discuss the advantages and disadvantages of globalisation.", "讨论全球化的优点和缺点。"],
  ["recommend a suitable strategy", "推荐合适策略", "Choose an option and justify it using case evidence and constraints.", "Recommend a suitable marketing strategy.", "推荐一个合适的营销策略。"],
  ["justify your recommendation", "说明推荐理由", "Support the chosen option with evidence and compare it with alternatives.", "Justify your recommendation using the information provided.", "使用所给信息说明你推荐的理由。"],
  ["comment on the trend", "评论趋势", "Describe the direction, size and possible meaning of a change.", "Comment on the trend shown in the graph.", "评论图表中显示的趋势。"],
  ["calculate the percentage increase", "计算百分比增长", "Use increase divided by original value then multiply by 100.", "Calculate the percentage increase in revenue.", "计算收入的百分比增长。"],
  ["identify the limiting reagent", "识别限量试剂", "Convert reactants to moles and compare using the balanced equation.", "Identify the limiting reagent in the reaction.", "识别该反应中的限量试剂。"],
  ["write the ionic equation", "写离子方程式", "Remove spectator ions and balance atoms and charges.", "Write the ionic equation for the reaction.", "写出该反应的离子方程式。"],
  ["predict the major organic product", "预测主要有机产物", "Use functional groups, reagents and conditions to draw the product.", "Predict the major organic product.", "预测主要有机产物。"],
  ["assign oxidation numbers", "指定氧化数", "Apply oxidation-number rules and check total charge.", "Assign oxidation numbers to each element.", "给每种元素指定氧化数。"],
  ["interpret the NMR spectrum", "解读核磁共振谱", "Use chemical shifts, integration and splitting to infer structure.", "Interpret the proton NMR spectrum.", "解读质子核磁共振谱。"],
  ["identify the bond from the IR spectrum", "从红外谱识别化学键", "Use characteristic absorption ranges and avoid relying on one weak peak alone.", "Identify the bond responsible for the absorption in the IR spectrum.", "从红外谱中识别造成该吸收峰的化学键。"],
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
    example: "A trolley is acted on by several forces. Draw a complete force diagram, find the resultant force and use Newton's second law to determine the acceleration and its direction.",
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
    example: "Show that the acceleration of the mass is proportional to its displacement from equilibrium and is directed towards equilibrium; hence demonstrate that the motion is simple harmonic.",
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
    example: "A machine produces a defective item with probability 0.04. Model the number of defective items in 20 independent products using a binomial distribution and find the probability of at least two defects.",
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
  if (group.subject === "biology") return formula
    ? `An A-Level Biology question uses ${term.word}. State the biological process and conditions, substitute the measured values into ${formula}, and interpret the result.`
    : `A question describes ${term.definition}. Identify ${term.word}, then explain the biological mechanism, evidence, or consequence that applies.`;
  if (group.subject === "economics") return `A case study may involve ${term.word}, meaning ${term.definition}. Which evidence would establish it, and what causal effect should be analysed?`;
  if (group.subject === "computer-science") return formula
    ? `A ${group.label} question involves ${term.word}. State the inputs, outputs and conditions before applying ${formula}.`
    : `A computing question describes ${term.definition}. Identify ${term.word}, then explain the data, process or security consequence.`;
  if (group.subject === "business") return formula
    ? `A business case asks about ${term.word}. State which figures are needed, apply ${formula}, then interpret the result.`
    : `A business case describes ${term.definition}. Identify ${term.word}, then explain the effect on objectives or stakeholders.`;
  if (group.subject === "geography") return formula
    ? `A geography question uses ${term.word}. Identify the place evidence and conditions before applying ${formula}.`
    : `A geography question describes ${term.definition}. Identify ${term.word}, then explain the process, impact or management response.`;
  if (group.subject === "accounting") return formula
    ? `An accounting question requires ${term.word}. Select the correct statement figures, apply ${formula}, and interpret the result.`
    : `An accounting question describes ${term.definition}. Identify ${term.word}, then explain the effect on the accounts or decision.`;
  if (group.subject === "psychology") return `A psychology question describes ${term.definition}. Identify ${term.word}, then link it to evidence, method or behaviour.`;
  if (group.subject === "law") return `A legal scenario raises ${term.word}, meaning ${term.definition}. State the rule, apply the facts to each requirement, and reach a justified conclusion.`;
  if (group.subject === "sociology") return `A sociology question describes ${term.definition}. Identify ${term.word}, then explain the social mechanism and evaluate it using relevant evidence.`;
  if (group.subject === "politics") return `A politics question concerns ${term.word}, meaning ${term.definition}. Explain the constitutional mechanism, then evaluate its effect on power or representation.`;
  if (group.subject === "history") return `A history question uses ${term.word}. Select precise source evidence, place it in context, and make a supported judgement about the past.`;
  if (group.subject === "environmental-management") return `An environmental-management question describes ${term.definition}. Identify ${term.word}, then explain the system process and evaluate a management response.`;
  if (group.subject === "design-technology") return `A design-and-technology task requires ${term.word}. Relate it to the user need, material or process, then justify the decision with test evidence.`;
  if (group.subject === "english-language") return `An English Language question uses ${term.word}, meaning ${term.definition}. Quote the language evidence and explain its effect in context.`;
  if (group.subject === "english-literature") return `An English Literature question uses ${term.word}, meaning ${term.definition}. Analyse the quoted detail and connect it to form, theme or interpretation.`;
  if (group.subject === "global-perspectives") return `A Global Perspectives project uses ${term.word}, meaning ${term.definition}. Compare credible viewpoints, then justify an evidence-based action or conclusion.`;
  if (group.subject === "marine-science") return `A Marine Science question describes ${term.definition}. Identify ${term.word}, use the depth, season or water-quality evidence, then explain the marine consequence.`;
  if (group.subject === "food-nutrition") return `A Food & Nutrition task involves ${term.word}, meaning ${term.definition}. Apply it to the person's needs, food safety or preparation method, then justify the recommendation.`;
  if (group.subject === "modern-languages") return `A Modern Languages response uses ${term.word}. Choose the form that fits the audience, tense and register, then check that the meaning survives translation.`;
  if (group.subject === "enterprise") return `An Enterprise case involves ${term.word}, meaning ${term.definition}. Use customer and financial evidence to judge whether the idea is feasible and how its risks can be managed.`;
  if (group.subject === "agriculture") return `An Agriculture question involves ${term.word}, meaning ${term.definition}. Explain the biological or environmental mechanism, then evaluate the yield, cost and sustainability trade-off.`;
  if (group.subject === "child-development") return `A Child Development scenario involves ${term.word}. Apply it to the child's age and observed context, then justify a supportive, inclusive and safe response.`;
  if (group.subject === "english-second-language") return `An English as a Second Language task uses ${term.word}, meaning ${term.definition}. Select evidence and language that suit the audience, purpose and required text type.`;
  if (group.subject === "chinese-language") return `中文语文题涉及“${term.word}”。引用准确词句或结构证据，说明它怎样服务于语境、受众和表达目的。`;
  if (group.subject === "islamic-studies") return `An Islamic Studies question uses ${term.word}, meaning ${term.definition}. Explain it with accurate source or historical evidence, then show its significance for belief or practice.`;
  if (group.subject === "biblical-studies") return `A Biblical Studies question uses ${term.word}, meaning ${term.definition}. Analyse the passage in literary and historical context before evaluating an interpretation.`;
  if (group.subject === "thinking-skills") return `A Thinking Skills question involves ${term.word}. Identify the exact claim, evidence or assumption, then explain precisely how it strengthens or weakens the conclusion.`;
  if (group.subject === "digital-media-design") return `A Digital Media & Design project uses ${term.word}, meaning ${term.definition}. Apply it to a specific user need, then test the result against clear evidence and design criteria.`;
  if (group.subject === "world-literature") return `A World Literature question uses ${term.word}, meaning ${term.definition}. Analyse a precise textual detail, then connect it to form, context or a justified interpretation.`;
  if (group.subject === "mathematics") return formula
    ? `A ${group.label} problem requires ${term.word}. State when ${formula} can be used and identify the values needed.`
    : `A problem involves ${term.word}, meaning ${term.definition}. Which mathematical condition or operation must be checked before using it?`;
  if (group.subject === "physics") return formula
    ? `A ${group.label} problem requires ${term.word}. Which measured quantities, directions, and conditions must be identified before using ${formula}?`
    : `A problem describes ${term.definition}. Identify ${term.word}, then state the physical evidence or condition needed to apply it.`;
  return `Use ${term.word} in the context of the question and state the result clearly.`;
}

function stageForTerm(subject, topic) {
  if (subject === "exam-language") return "AS";
  const normalizedTopic = String(topic || "").toLowerCase();
  if (/igcse|foundation|basic|introductory|core/.test(normalizedTopic)) return "IGCSE";
  return /fields|thermal|quantum|nuclear|astronomy|cosmology|capacitance|alternating|medical|organic|macroeconomics|international|further|genetics|evolution|homeostasis|immunity|biotechnology/.test(normalizedTopic)
    ? "A2"
    : "AS";
}

function specificationForStage(stage) {
  return stage === "IGCSE" ? "IGCSE STEM 2026" : "A-Level STEM 2026";
}

function buildStableMetadata(id, subject, topic, examFocus, example, translation, commonMistake, group = {}) {
  const topicId = `${subject}:${topic}`;
  const stage = String(group.stage || stageForTerm(subject, topic)).toUpperCase();
  return {
    termId: id,
    routeId: `${stage === "IGCSE" ? "igcse" : "alevel"}-${slug(subject)}-${slug(topic)}`,
    specificationVersion: group.specificationVersion || specificationForStage(stage),
    stage,
    topicId,
    relatedQuestionPartIds: [],
    aliases: [],
    examUsage: {
      command: "identify | calculate | explain | evaluate",
      focus: examFocus,
      example,
      translation,
    },
    commonMistakes: commonMistake ? [commonMistake] : [],
    reviewState: "new",
  };
}

function buildTermTranslation(group, term, override) {
  if (override?.translation) return override.translation;
  const formula = resolveTermField(term, override, "formula");
  if (group.subject === "chemistry") return formula
    ? `${group.label} 题要求使用“${term.meaning}”。在使用 ${formula} 前，必须检查哪些量和条件？`
    : `题目描述了“${term.definition}”。识别“${term.meaning}”，再写出能够确认它的化学证据或条件。`;
  if (group.subject === "economics") return `材料可能涉及“${term.meaning}”，其含义是“${term.definition}”。需要什么证据确认它，又应分析哪条因果影响？`;
  if (group.subject === "computer-science") return formula
    ? `${group.label} 题涉及“${term.meaning}”。在使用 ${formula} 前，先确认输入、输出、数据类型和边界条件。`
    : `计算机题描述了“${term.definition}”。识别“${term.meaning}”，再解释数据、过程或安全影响。`;
  if (group.subject === "business") return formula
    ? `商务题要求使用“${term.meaning}”。先找出报表或案例数据，再代入 ${formula} 并解释商业意义。`
    : `案例描述了“${term.definition}”。识别“${term.meaning}”，再说明它对目标或利益相关者的影响。`;
  if (group.subject === "geography") return formula
    ? `地理题要求使用“${term.meaning}”。先确认地点、尺度和数据来源，再代入 ${formula} 并解释结果。`
    : `题目描述了“${term.definition}”。识别“${term.meaning}”，再说明过程、影响或管理策略。`;
  if (group.subject === "accounting") return formula
    ? `会计题要求使用“${term.meaning}”。先选对报表数据，再代入 ${formula} 并解释结果。`
    : `题目描述了“${term.definition}”。识别“${term.meaning}”，再说明它如何影响账户或商业决策。`;
  if (group.subject === "psychology") return `心理学题描述了“${term.definition}”。识别“${term.meaning}”，再把它与行为解释、研究方法或证据质量联系起来。`;
  if (group.subject === "law") return `法律情境涉及“${term.meaning}”，其定义是“${term.definition}”。先写出规则或测试，再按构成要件逐项适用事实，最后给出有条件的法律结论。`;
  if (group.subject === "sociology") return `社会学题描述了“${term.definition}”。识别“${term.meaning}”，再解释社会机制，并用理论观点或研究证据评价。`;
  if (group.subject === "politics") return `政治题涉及“${term.meaning}”。先解释制度规则或权力机制，再评价它对代表性、问责或权利保障的实际影响。`;
  if (group.subject === "history") return `历史题涉及“${term.meaning}”。先用具体史料细节和历史语境支持判断，再解释来源的价值、局限或不同解释。`;
  if (group.subject === "environmental-management") return `环境管理题描述了“${term.definition}”。识别“${term.meaning}”，再写出生态过程、人类压力和管理措施的长期权衡。`;
  if (group.subject === "design-technology") return `设计技术题要求使用“${term.meaning}”。先联系用户需求、规格和材料/工艺，再用测试证据说明设计取舍。`;
  if (group.subject === "english-language") return `英语语言题涉及“${term.meaning}”。引用精确语料，再解释该语言特征如何在语境中建构意义、关系或身份。`;
  if (group.subject === "english-literature") return `英语文学题涉及“${term.meaning}”。分析引文中的语言和结构细节，再联系主题、形式、语境或替代解读。`;
  if (group.subject === "global-perspectives") return `全球视野题涉及“${term.meaning}”，其定义是“${term.definition}”。比较可靠来源与不同立场，再用证据论证行动方案或结论。`;
  if (group.subject === "marine-science") return `海洋科学题描述了“${term.definition}”。识别“${term.meaning}”，利用深度、季节或水质证据，再解释对海洋系统的影响。`;
  if (group.subject === "food-nutrition") return `食品与营养题涉及“${term.meaning}”。把它用于个人需要、食品安全或制备方法，并说明推荐理由。`;
  if (group.subject === "modern-languages") return `现代外语题涉及“${term.meaning}”。根据受众、时态和语域选择形式，并检查翻译后意思是否保持准确。`;
  if (group.subject === "enterprise") return `创业题涉及“${term.meaning}”。用客户和财务证据判断方案是否可行，并说明如何管理风险。`;
  if (group.subject === "agriculture") return `农业题涉及“${term.meaning}”。解释生物或环境机制，再评价产量、成本与可持续性之间的取舍。`;
  if (group.subject === "child-development") return `儿童发展情境涉及“${term.meaning}”。联系儿童年龄和观察到的情境，再论证支持性、包容且安全的做法。`;
  if (group.subject === "english-second-language") return `英语作为第二语言题涉及“${term.meaning}”。选择适合受众、目的和文本类型的证据与语言形式。`;
  if (group.subject === "chinese-language") return `中文语文题涉及“${term.meaning}”。引用准确词句或结构证据，说明它如何服务于语境、受众和表达目的。`;
  if (group.subject === "islamic-studies") return `伊斯兰研究题涉及“${term.meaning}”。用准确的经文、圣训或历史证据解释它，再说明其对信仰或实践的意义。`;
  if (group.subject === "biblical-studies") return `圣经研究题涉及“${term.meaning}”。先在文学与历史语境中分析经文，再评价一种有证据支持的解释。`;
  if (group.subject === "thinking-skills") return `思维技能题涉及“${term.meaning}”。明确主张、证据或隐含假设，再精确解释它怎样加强或削弱结论。`;
  if (group.subject === "digital-media-design") return `数字媒体与设计任务涉及“${term.meaning}”。把它用于具体用户需要，再用明确证据和设计标准测试结果。`;
  if (group.subject === "world-literature") return `世界文学题涉及“${term.meaning}”。细读准确的文本细节，再联系形式、语境或有依据的解读。`;
  if (group.subject === "mathematics") return formula
    ? `${group.label} 题要求使用“${term.meaning}”。说明何时可使用 ${formula}，并找出所需数值。`
    : `题目涉及“${term.meaning}”，其含义是“${term.definition}”。应用前必须检查哪个数学条件或运算？`;
  if (group.subject === "physics") return formula
    ? `${group.label} 题要求使用“${term.meaning}”。在使用 ${formula} 前，必须识别哪些测量量、方向和条件？`
    : `题目描述了“${term.definition}”。识别“${term.meaning}”，再写出应用它所需的物理证据或条件。`;
  if (group.subject === "biology") return formula
    ? `生物学题要求使用“${term.meaning}”。先确认过程和条件，再代入 ${formula}，最后解释结果对细胞、个体或生态系统的意义。`
    : `题目涉及“${term.meaning}”，其定义是“${term.definition}”。回答时要写出生物机制，并用题目给出的结构、数据或实验现象支持结论。`;
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
    const id = `${group.subject}-${group.topic}-${slug(term.idSlug || term.word)}`;
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
      ...buildStableMetadata(
        id,
        group.subject,
        group.topic,
        buildExamFocus(group, contentTerm, override),
        buildTermExample(group, contentTerm, override),
        buildTermTranslation(group, contentTerm, override),
        buildCommonMistake(group, contentTerm, override),
        group,
      ),
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
    ...buildStableMetadata(
      `exam-language-command-${slug(word)}`,
      "exam-language",
      "command-words",
      `Use ${word} to select the evidence and response structure the mark scheme requires.`,
      example,
      translation,
      "Treating every command word as if it required the same kind of answer.",
    ),
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
    ...buildStableMetadata(
      `exam-language-question-stem-${slug(word)}`,
      "exam-language",
      "question-stems",
      "Translate the sentence into its quantities, conditions, model and requested conclusion before calculating.",
      example,
      translation,
      "Translating the words but missing the mathematical, physical, chemical or economic constraint.",
    ),
  });
}

const payload = {
  schemaVersion: "alevel-stem-vocabulary.v2",
  catalogVersion: "2026-08-12-ig-alevel-knowledge-v5",
  itemCount: items.length,
  items,
};

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Generated ${items.length} A-Level STEM vocabulary items at ${outputUrl.pathname}`);
