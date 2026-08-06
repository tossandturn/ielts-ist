import { mkdir, writeFile } from "node:fs/promises";

const outputUrl = new URL("../public/data/alevel-stem-vocabulary.json", import.meta.url);

function parseTerms(value) {
  return String(value || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [word, meaning, definition, collocations = ""] = line.split("|").map((item) => item.trim());
      return { word, meaning, definition, collocations: collocations.split(";").map((item) => item.trim()).filter(Boolean) };
    });
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
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
];

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

const items = [];
for (const group of groups) {
  for (const term of group.terms) {
    items.push({
      id: `${group.subject}-${group.topic}-${slug(term.word)}`,
      subject: group.subject,
      topic: group.topic,
      topicLabel: group.label,
      type: "term",
      word: term.word,
      phonetic: "",
      meaning: term.meaning,
      definition: term.definition,
      cn: group.note,
      example: group.example.replaceAll("{word}", term.word).replaceAll("{meaning}", term.meaning),
      translation: group.translation.replaceAll("{word}", term.word).replaceAll("{meaning}", term.meaning),
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
    cn: "先识别题目动词，再决定答案需要写数值、步骤、证据还是完整解释。",
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
    cn: "A-Level 数学/物理题干理解：先翻译限制条件，再把它转换成方程、模型或答题要求。",
    example,
    translation,
    collocations: [],
  });
}

const payload = {
  schemaVersion: "alevel-stem-vocabulary.v1",
  catalogVersion: "2026-08-06",
  itemCount: items.length,
  items,
};

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Generated ${items.length} A-Level STEM vocabulary items at ${outputUrl.pathname}`);
