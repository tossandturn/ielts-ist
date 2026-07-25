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
  singleSeconds: 30 * 60,
  singleTotal: 30 * 60,
  singleTimerId: null,
  recognition: null,
  recording: false,
  autoSpeaking: {},
  speakingSessions: {},
  speakingTimers: {},
  qwenSpeaking: {},
};

const $ = (id) => document.getElementById(id);
const storeKey = "ieltsTrainerUserBank";
const sidebarStoreKey = "ieltsTrainerSidebarCollapsed";

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
  const task = filterValue("singleTaskFilter");
  return items.filter((item) => {
    const bookOk = book === "all" || String(itemBook(item)) === book;
    const testOk = test === "all" || String(itemTest(item)) === test;
    const taskOk = moduleName !== "writing" || task === "all" || String(itemTask(item)) === task;
    return bookOk && testOk && taskOk;
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
  const selectedTest = filterValue("singleTestFilter");
  const taskItems = testItems.filter((item) => selectedTest === "all" || String(itemTest(item)) === selectedTest);
  renderFilterOptions("singleTaskFilter", moduleName === "writing" ? taskItems.map(itemTask) : [], "All tasks");
  $("singleTaskFilter").style.display = moduleName === "writing" ? "" : "none";
}

function mergedItems(moduleName) {
  const user = getBank(moduleName);
  const builtIn =
    moduleName === "listening"
      ? state.data.listeningTests
      : moduleName === "reading"
        ? state.data.readingTests
      : moduleName === "writing"
        ? state.data.writingTasks
          : moduleName === "speaking"
            ? state.data.speakingSets
            : [];
  return [...user, ...builtIn];
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

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Request failed");
  return json;
}

function pdfDownloadLink(json, fallbackName) {
  if (!json?.pdfDataUrl) return "";
  const fileName = escapeHtml(json.pdfFileName || fallbackName || "ielts-report.pdf");
  return `\n\n<a class="report-download" href="${json.pdfDataUrl}" download="${fileName}">Download PDF report</a>`;
}

function feedbackWithPdfHtml(text, json, fallbackName) {
  return `${escapeHtml(text).replace(/\n/g, "<br>")}${pdfDownloadLink(json, fallbackName).replace(/\n/g, "<br>")}`;
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

function renderPageAudioControl(audioUrls, numbers, pageText = "") {
  const sectionIndex = listeningSectionForNumbers(numbers);
  const url = sectionIndex === null ? "" : audioUrls?.[sectionIndex];
  if (!url) return "";
  return `<div class="page-card-audio" title="Section ${sectionIndex + 1} audio">
    <span>S${sectionIndex + 1}</span>
    <audio class="listening-player" controls preload="none" src="${escapeHtml(url)}"></audio>
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

function renderSectionAudio(url, section) {
  if (!url) return "";
  return `<label class="paper-audio-row">
    <span>Section ${section} audio</span>
    <audio class="listening-player" controls preload="none" src="${escapeHtml(url)}"></audio>
  </label>`;
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
    ${renderSectionAudio(group.audioUrl, group.section)}
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
        <img src="${url}" alt="${escapeHtml(label)} page ${escapeHtml(page)}" loading="${index === 0 ? "eager" : "lazy"}" />
      </figure>`;
    })
    .join("")}</div></div>`;
}

function renderPageImagesWithAnswers(images, label, prefix, questions, paper, options = {}) {
  if (!Array.isArray(images) || !images.length) return "";
  const orderedImages = uniqueOrderedImages(images);
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
              </div>
            </figure>`;
          })
          .join("")}</div>
      </section>
      ${answerPanel}
    </div>
  </div>`;
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
  const orderedImages = uniqueOrderedImages(images);
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
  const hasPdfImages = Boolean(item.questionPageImages?.length);
  const playbackActions = hasPdfImages && audioUrls.length
    ? ""
    : audioUrls.length
      ? audioUrls.map((url, index) => `<button class="secondary play-source-audio" data-url="${url}">Play Section ${index + 1}</button>`).join("")
      : audioUrl
        ? `<button class="secondary play-source-audio" data-url="${audioUrl}">Play audio</button>`
        : `<button class="secondary play-audio" data-text="${encodeURIComponent(transcript)}">Play listening</button>`;
  const questionPaper = hasPdfImages
    ? renderPageImagesWithAnswers(item.questionPageImages, "Listening question PDF", prefix, item.questions, item.questionPaper, { audioUrls })
    : item.questionPaper
      ? `<details class="question-paper" open><summary>Listening OCR text</summary><pre>${escapeHtml(item.questionPaper)}</pre></details>`
      : `<div class="notice">This listening set has not been extracted from the PDF yet. Open the local PDF and answer directly.</div>`;
  return `
    <div class="module-meta">${[item.source, item.period || "", `${item.minutes || 30} min`].filter(Boolean).join(" · ")} ${sourceLink}</div>
    <h3>${item.title}</h3>
    ${
      hasPdfImages && audioUrls.length
        ? `<div class="notice compact-notice">The answer sheet is grouped by section on the right. Each section has its matching audio on top, and the PDF scrolls independently on the left.</div>`
        : audioUrls.length
          ? `<div class="audio-list">${audioUrls
              .map((url, index) => `<label>Section ${index + 1}<audio class="listening-player" controls preload="none" src="${url}"></audio></label>`)
            .join("")}</div>`
        : audioUrl
          ? `<audio class="listening-player" controls preload="none" src="${audioUrl}"></audio>`
          : ""
    }
    ${playbackActions ? `<div class="actions">${playbackActions}</div>` : ""}
    ${questionPaper}
    ${item.questionPageImages?.length ? "" : renderQuestionInputs(prefix, item.questions)}
  `;
}

function renderReading(test, prefix = "single", options = {}) {
  const item = normalizeItem(test);
  const sourceLink = item.sourceUrl ? `<a class="source-inline" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Open local PDF</a>` : "";
  const analysisLink = item.analysisUrl ? `<a class="source-inline" href="${item.analysisUrl}" target="_blank" rel="noreferrer">Open local analysis</a>` : "";
  const useSplitLayout = options.splitLayout === true;
  const readingPaper = item.readingPageImages?.length
    ? (useSplitLayout
        ? renderReadingSplitPages(item.readingPageImages, prefix, item.questions, item.readingPaper)
        : renderPageImagesWithAnswers(item.readingPageImages, "Reading question PDF", prefix, item.questions, item.readingPaper))
    : item.readingPaper
      ? `<details class="question-paper" open><summary>Reading OCR text</summary><pre>${escapeHtml(item.readingPaper)}</pre></details>`
      : `<article class="passage">${escapeHtml(item.passage || item.prompt || "")}</article>`;
  return `
    <div class="module-meta">${[item.source, item.period || "", `${item.minutes || 60} min`].filter(Boolean).join(" · ")} ${sourceLink} ${analysisLink}</div>
    <h3>${item.title}</h3>
    ${readingPaper}
    ${item.readingPageImages?.length ? "" : renderQuestionInputs(prefix, item.questions)}
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
  const prompts = tasks.filter(Boolean).map((task, index) => {
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
  const answers = tasks.filter(Boolean).map((task, index) => {
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
  const item = normalizeItem(set);
  return `
    <div class="module-meta">${[item.source, item.period || ""].filter(Boolean).join(" · ")}</div>
    <h3>${item.title}</h3>
    ${renderRealtimeSpeakingPanel(item, prefix, { showTranscript: true })}
  `;
}

function renderSpeakingExamTwoColumn(set, prefix = "exam") {
  const item = normalizeItem(set);
  return `<div class="exam-two-column speaking-two-column">
    <section class="exam-left-pane">
      <div class="module-meta">${[item.source, item.period || ""].filter(Boolean).join(" · ")}</div>
      <h3>${item.title}</h3>
    </section>
    <aside class="exam-right-pane speaking-answer-pane">
      ${renderRealtimeSpeakingPanel(item, prefix, { showTranscript: prefix !== "exam" })}
    </aside>
  </div>`;
}

function renderRealtimeSpeakingPanel(item, prefix, options = {}) {
  const showTranscript = options.showTranscript !== false;
  const transcriptHtml = showTranscript
    ? `<div id="${prefix}-speaking-log" class="dialogue-log"></div>`
    : "";
  return `<div class="qwen-speaking" data-prefix="${prefix}" data-topic="${escapeHtml(item.title)}">
    <textarea id="${prefix}-qwen-prompt" hidden>${escapeHtml(buildIeltsSpeakingPrompt(item))}</textarea>
    <div id="${prefix}-qwen-status" class="voice-state">Not started</div>
    <div class="qwen-meter">
      <span id="${prefix}-qwen-level"></span>
      <strong id="${prefix}-qwen-meter">0.00</strong>
    </div>
    <label class="field-label" for="${prefix}-speaking-score">Speaking band</label>
    <input id="${prefix}-speaking-score" class="text-input band-input" inputmode="decimal" placeholder="Enter band score" />
    <label class="field-label" for="${prefix}-speaking">Speaking notes</label>
    <textarea id="${prefix}-speaking" placeholder="Type or paste your speaking answer here..."></textarea>
    ${transcriptHtml}
    <div id="${prefix}-recording-download" class="recording-download"></div>
    <div class="actions">
      <button class="primary start-qwen-speaking" data-prefix="${prefix}" data-topic="${escapeHtml(item.title)}">Start speaking test</button>
      <button class="secondary qwen-mic-toggle" data-prefix="${prefix}" disabled>Toggle mic</button>
      <button class="secondary qwen-commit-answer" data-prefix="${prefix}" disabled>Submit current answer</button>
      <button class="secondary qwen-finish-score" data-prefix="${prefix}" disabled>End and score</button>
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
    "Throughout the test, ask exactly one question at a time and wait. Never read the whole topic set aloud.",
    "Wait patiently after the student pauses. Do not interrupt unfinished answers, false starts, or thinking pauses. Give the candidate roughly 1 to 1.5 seconds of silence before deciding the answer has ended.",
    "Do not repeat questions or topics the student has already answered. Track what the student said, then extend naturally with a relevant follow-up or move to a new angle.",
    "If the student's answer is short, ask one gentle follow-up such as 'Could you tell me a little more about that?' instead of switching topics too quickly.",
    "Run the IELTS format naturally: Part 1 interview, Part 2 cue card with 1 minute preparation and 1-2 minutes speaking, then Part 3 discussion. Timing is guidance, not a reason to cut the student off.",
    "After the student ends the test, score Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation from 0 to 9. Include a clear line exactly like: Overall Band: 6.5.",
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
    setFeedback(feedbackId, json.feedback, modeId, json.mode);
  } catch (error) {
    setFeedback(feedbackId, `Submission failed: ${error.message}`, modeId, "error");
  }
}

function qwenSession(prefix) {
  if (!state.qwenSpeaking[prefix]) {
    state.qwenSpeaking[prefix] = {
      ws: null,
      transport: "",
      httpSessionId: "",
      pollTimer: null,
      micAudioQueue: [],
      micAudioFlushTimer: null,
      inputContext: null,
      outputContext: null,
      micStream: null,
      sourceNode: null,
      workletNode: null,
      scriptNode: null,
      silentGain: null,
      micActive: false,
      outputUnlocked: false,
      pcmBuffer: [],
      pcmPosition: 0,
      recorder: null,
      recordingChunks: [],
      recordingMime: "",
      recordingReady: null,
      connected: false,
      openingRequested: false,
      turnCommitted: false,
      autoCommitTimer: null,
      voiceStarted: false,
      voiceStartAt: 0,
      voicedMs: 0,
      lastVoiceAt: 0,
      silenceSince: 0,
      awaitingScore: false,
      scoreFilled: false,
      currentAssistantText: "",
      pendingAssistantText: "",
      assistantRenderId: null,
      pendingAudioChunks: [],
      audioRenderId: null,
      responseActive: false,
      playbackTailTimer: null,
      playbackCursor: 0,
      assistantNode: null,
    };
  }
  return state.qwenSpeaking[prefix];
}

function qwenSetStatus(prefix, text, active = false) {
  const node = $(`${prefix}-qwen-status`);
  if (!node) return;
  node.textContent = text;
  node.classList.toggle("active", active);
}

function qwenSetControls(prefix, connected) {
  document.querySelectorAll(`.qwen-speaking [data-prefix="${prefix}"]`).forEach((button) => {
    if (button.classList.contains("start-qwen-speaking")) button.disabled = connected;
    if (button.classList.contains("qwen-mic-toggle")) button.disabled = !connected;
    if (button.classList.contains("qwen-commit-answer")) button.disabled = !connected;
    if (button.classList.contains("qwen-finish-score")) button.disabled = !connected;
    if (button.classList.contains("qwen-disconnect")) button.disabled = !connected;
  });
}

function qwenTranscriptVisible(prefix) {
  return prefix !== "exam";
}

function qwenAssistantTranscriptVisible() {
  return false;
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
  const chunks = session.pendingAudioChunks.splice(0, 8);
  for (const chunk of chunks) {
    playQwenPcm(prefix, chunk);
  }
  if (session.pendingAudioChunks.length) {
    session.audioRenderId = requestAnimationFrame(() => flushQwenAudio(prefix));
  }
  scheduleQwenPlaybackTail(prefix);
}

function mergeQwenAssistantText(session, text) {
  const current = session.currentAssistantText || "";
  const next = String(text || "");
  if (!next || next === current) return current;
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
    merged = overlap ? current + next.slice(overlap) : current + next;
  }
  session.currentAssistantText = merged;
  session.pendingAssistantText = merged;
  return merged;
}

function qwenOutputBusy(prefix) {
  const session = qwenSession(prefix);
  if (session.responseActive || session.pendingAudioChunks.length || session.audioRenderId) return true;
  const contextTime = session.outputContext?.currentTime;
  if (!Number.isFinite(contextTime)) return false;
  return session.playbackCursor > contextTime + 0.25;
}

function scheduleQwenPlaybackTail(prefix) {
  const session = qwenSession(prefix);
  if (session.playbackTailTimer) clearTimeout(session.playbackTailTimer);
  const contextTime = session.outputContext?.currentTime;
  if (!Number.isFinite(contextTime)) return;
  const remainingMs = Math.max(0, (session.playbackCursor - contextTime) * 1000);
  session.playbackTailTimer = setTimeout(() => {
    session.playbackTailTimer = null;
    if (!qwenOutputBusy(prefix)) qwenSetStatus(prefix, "???", true);
  }, remainingMs + 300);
}

function qwenAppendAssistant(prefix, text) {
  if (!text) return;
  const session = qwenSession(prefix);
  const mergedText = mergeQwenAssistantText(session, text);
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

function qwenSendNow(prefix, payload) {
  const session = qwenSession(prefix);
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
  if (session.transport === "ws" && session.ws?.readyState === WebSocket.OPEN) {
    const chunks = session.micAudioQueue.splice(0, session.micAudioQueue.length);
    for (const chunk of chunks) {
      qwenSendNow(prefix, { type: "audio.append", audio: chunk });
    }
    return;
  }
  const chunks = session.micAudioQueue.splice(0, 12);
  const audio = arrayBufferToBase64(combineArrayBufferChunks(chunks));
  if (audio) qwenSendNow(prefix, { type: "audio.append", audio });
  if (session.micAudioQueue.length) {
    session.micAudioFlushTimer = setTimeout(() => flushQwenMicAudio(prefix), 20);
  }
}

function qwenSend(prefix, payload) {
  const session = qwenSession(prefix);
  if (payload.type === "audio.append") {
    if (session.transport === "ws" && session.ws?.readyState === WebSocket.OPEN) {
      qwenSendNow(prefix, payload);
      return;
    }
    session.micAudioQueue.push(payload.audio);
    if (!session.micAudioFlushTimer) {
      session.micAudioFlushTimer = setTimeout(() => flushQwenMicAudio(prefix), 40);
    }
    return;
  }
  flushQwenMicAudio(prefix);
  qwenSendNow(prefix, payload);
}

async function startQwenSpeaking(prefix) {
  const session = qwenSession(prefix);
  if (session.connected || session.ws?.readyState === WebSocket.OPEN) return;
  const prompt = $(`${prefix}-qwen-prompt`)?.value || "";
  const log = $(`${prefix}-speaking-log`);
  if (log) log.textContent = "";
  session.assistantNode = null;
  session.openingRequested = false;
  session.transport = "";
  session.httpSessionId = "";
  if (session.pollTimer) clearTimeout(session.pollTimer);
  session.pollTimer = null;
  session.micAudioQueue = [];
  if (session.micAudioFlushTimer) clearTimeout(session.micAudioFlushTimer);
  session.micAudioFlushTimer = null;
  session.awaitingScore = false;
  session.scoreFilled = false;
  session.turnCommitted = false;
  session.voiceStarted = false;
  session.voiceStartAt = 0;
  session.voicedMs = 0;
  session.lastVoiceAt = 0;
  session.silenceSince = 0;
  if (session.autoCommitTimer) clearTimeout(session.autoCommitTimer);
  session.autoCommitTimer = null;
  session.currentAssistantText = "";
  session.pendingAssistantText = "";
  if (session.assistantRenderId) cancelAnimationFrame(session.assistantRenderId);
  session.assistantRenderId = null;
  session.pendingAudioChunks = [];
  if (session.audioRenderId) cancelAnimationFrame(session.audioRenderId);
  session.audioRenderId = null;
  session.responseActive = false;
  if (session.playbackTailTimer) clearTimeout(session.playbackTailTimer);
  session.playbackTailTimer = null;
  session.recordingChunks = [];
  session.recordingMime = "";
  session.recordingReady = null;
  const recordingNode = $(`${prefix}-recording-download`);
  if (recordingNode) recordingNode.innerHTML = "";
  unlockQwenOutput(prefix);
  qwenSetStatus(prefix, "Connecting...", false);
  qwenSetControls(prefix, false);
  const wsUrl = `${location.origin.replace(/^http/, "ws")}/qwen-client`;
  session.ws = new WebSocket(wsUrl);
  session.ws.addEventListener("open", () => {
    session.transport = "ws";
    qwenSend(prefix, {
      type: "connect",
      instructions: prompt,
      voice: "Ethan",
      turnDetection: "manual",
    });
    qwenAddBubble(prefix, "system", "WebSocket connected.");
  });
  session.ws.addEventListener("message", (event) => handleQwenMessage(prefix, JSON.parse(event.data)));
  session.ws.addEventListener("close", () => {
    if (!session.connected && session.transport !== "http") {
      startQwenHttpFallback(prefix, prompt);
      return;
    }
    session.connected = false;
    stopQwenMic(prefix, false);
    qwenSetStatus(prefix, "Disconnected", false);
    qwenSetControls(prefix, false);
  });
  session.ws.addEventListener("error", () => {
    if (!session.connected && session.transport !== "http") {
      startQwenHttpFallback(prefix, prompt);
      return;
    }
    qwenSetStatus(prefix, "Connection error", false);
    qwenAddBubble(prefix, "system", "Connection error.");
  });
}

async function startQwenHttpFallback(prefix, prompt) {
  const session = qwenSession(prefix);
  if (session.transport === "http" || session.httpSessionId) return;
  try {
    session.transport = "http";
    qwenSetStatus(prefix, "Connecting...", false);
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
    const json = await response.json();
    if (!response.ok || !json.id) throw new Error(json.error || "HTTP session failed");
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
      qwenSetStatus(prefix, "Connection error", false);
      qwenAddBubble(prefix, "system", `Live voice polling failed: ${error.message}`);
    }
  } finally {
    if (session.transport === "http" && session.httpSessionId) {
      session.pollTimer = setTimeout(() => pollQwenHttpEvents(prefix), 60);
    }
  }
}

function handleQwenMessage(prefix, message) {
  const session = qwenSession(prefix);
  if (message.type === "status") {
    if (message.status === "qwen-open") {
      session.connected = true;
      qwenSetStatus(prefix, "Connected", true);
      qwenSetControls(prefix, true);
      initQwenOutput(prefix);
      qwenAddBubble(prefix, "system", "Live speaking session ready.");
      startQwenMic(prefix);
    }
    if (message.status === "qwen-closed") {
      session.connected = false;
      qwenSetControls(prefix, false);
      qwenSetStatus(prefix, "Disconnected", false);
    }
    return;
  }
  if (message.type === "error") {
    qwenSetStatus(prefix, "Error", false);
    qwenSetControls(prefix, false);
    qwenAddBubble(prefix, "system", message.message || "Session stopped.");
    return;
  }
  if (message.type !== "event") return;
  const payload = message.payload || {};
  const type = payload.type || message.eventType || "";
  const delta = payload.delta || payload.audio || payload.text || payload.transcript || "";
  if (type === "session.updated" && !session.openingRequested) {
    session.openingRequested = true;
    qwenSend(prefix, { type: "response.create" });
  }
  if ((type === "response.audio.delta" || type === "response.output_audio.delta") && delta) {
    session.responseActive = true;
    session.pendingAudioChunks.push(delta);
    if (!session.audioRenderId) {
      session.audioRenderId = requestAnimationFrame(() => flushQwenAudio(prefix));
    }
  }
  if (type === "response.audio_transcript.delta" || type === "response.output_text.delta") {
    session.responseActive = true;
    qwenAppendAssistant(prefix, delta);
  }
  if (type === "conversation.item.input_audio_transcription.completed") {
    if (payload.transcript || payload.text) qwenAddBubble(prefix, "user", payload.transcript || payload.text);
  }
  if (type === "input_audio_buffer.speech_started") {
    session.silenceSince = 0;
  }
  if (type === "response.done" || type === "response.audio.done" || type === "response.text.done") {
    session.responseActive = false;
    if (session.awaitingScore && !session.scoreFilled) {
      fillSpeakingBandFromText(prefix, session.currentAssistantText);
    }
    session.turnCommitted = false;
    session.voiceStarted = false;
    session.voiceStartAt = 0;
    session.voicedMs = 0;
    session.lastVoiceAt = 0;
    session.silenceSince = 0;
    if (session.assistantRenderId) cancelAnimationFrame(session.assistantRenderId);
    session.assistantRenderId = null;
    if (session.assistantNode) {
      session.assistantNode.textContent = session.pendingAssistantText || session.currentAssistantText || session.assistantNode.textContent;
    }
    session.pendingAssistantText = "";
    session.assistantNode = null;
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
    session.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    startQwenRecording(prefix);
    if (session.inputContext.state === "suspended") await session.inputContext.resume().catch(() => {});
    session.sourceNode = session.inputContext.createMediaStreamSource(session.micStream);
    session.silentGain = session.inputContext.createGain();
    session.silentGain.gain.value = 0;
    session.silentGain.connect(session.inputContext.destination);
    session.pcmBuffer = [];
    session.pcmPosition = 0;

    const canUseWorklet = session.inputContext.audioWorklet && typeof AudioWorkletNode !== "undefined";
    if (canUseWorklet) {
      try {
        await session.inputContext.audioWorklet.addModule("/pcm-worklet.js");
        session.workletNode = new AudioWorkletNode(session.inputContext, "pcm-worklet");
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
    const button = document.querySelector(`.qwen-mic-toggle[data-prefix="${prefix}"]`);
    if (button) button.textContent = "Stopped";
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
    const ratio = session.inputContext.sampleRate / 16000;
    while (session.pcmPosition < input.length) {
      const index = Math.floor(session.pcmPosition);
      const sample = Math.max(-1, Math.min(1, input[index] || 0));
      session.pcmBuffer.push(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
      session.pcmPosition += ratio;
    }
    session.pcmPosition -= input.length;
    while (session.pcmBuffer.length >= 320) {
      const chunk = new Int16Array(320);
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
  qwenSend(prefix, { type: "audio.append", audio: pcm });
  const normalizedLevel = Math.min(1, level * 14);
  const bar = $(`${prefix}-qwen-level`);
  const meter = $(`${prefix}-qwen-meter`);
  if (bar) bar.style.width = `${Math.round(normalizedLevel * 100)}%`;
  if (meter) meter.textContent = normalizedLevel.toFixed(2);
  scheduleQwenAutoCommit(prefix, level);
}

function scheduleQwenAutoCommit(prefix, level) {
  const session = qwenSession(prefix);
  if (!session.micActive || !session.connected || session.awaitingScore || session.turnCommitted) return;
  if (qwenOutputBusy(prefix)) return;
  const speechLevel = Number(level || 0);
  const now = Date.now();
  const startThreshold = 0.012;
  const silenceThreshold = 0.008;
  if (speechLevel >= startThreshold) {
    if (!session.voiceStarted) {
      session.voiceStarted = true;
      session.voiceStartAt = now;
      session.voicedMs = 0;
    } else {
      session.voicedMs = now - session.voiceStartAt;
    }
    session.lastVoiceAt = now;
    session.silenceSince = 0;
    if (session.autoCommitTimer) clearTimeout(session.autoCommitTimer);
    session.autoCommitTimer = null;
    return;
  }
  if (!session.voiceStarted || session.voicedMs < 500 || !session.lastVoiceAt) return;
  if (speechLevel < silenceThreshold && !session.silenceSince) {
    session.silenceSince = now;
  }
  if (session.autoCommitTimer) return;
  session.autoCommitTimer = setTimeout(() => {
    session.autoCommitTimer = null;
    if (!session.micActive || !session.connected || session.awaitingScore || session.turnCommitted) return;
    if (!session.voiceStarted || session.voicedMs < 500) return;
    const silenceAge = session.silenceSince ? Date.now() - session.silenceSince : 0;
    if (silenceAge < 2600 || Date.now() - session.lastVoiceAt < 2600) return;
    commitQwenAnswer(prefix);
  }, 2650);
}

async function stopQwenMic(prefix, commit = false) {
  const session = qwenSession(prefix);
  const wasActive = session.micActive;
  session.micActive = false;
  const recordingPromise = stopQwenRecording(prefix);
  if (session.scriptNode) session.scriptNode.onaudioprocess = null;
  session.sourceNode?.disconnect();
  session.workletNode?.disconnect();
  session.scriptNode?.disconnect();
  session.silentGain?.disconnect();
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
  if (session.autoCommitTimer) clearTimeout(session.autoCommitTimer);
  session.autoCommitTimer = null;
  const bar = $(`${prefix}-qwen-level`);
  const meter = $(`${prefix}-qwen-meter`);
  if (bar) bar.style.width = "0%";
  if (meter) meter.textContent = "0.00";
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
  session.turnCommitted = true;
  if (session.autoCommitTimer) clearTimeout(session.autoCommitTimer);
  session.autoCommitTimer = null;
  qwenSend(prefix, { type: "audio.commit" });
  qwenSend(prefix, { type: "response.create" });
  qwenAddBubble(prefix, "system", "Answer submitted.");
}

async function finishQwenSpeaking(prefix) {
  await stopQwenMic(prefix, false);
  const prompt = $(`${prefix}-qwen-prompt`)?.value || "";
  const session = qwenSession(prefix);
  session.awaitingScore = true;
  session.scoreFilled = false;
  session.currentAssistantText = "";
  createQwenRecordingDownload(prefix);
  qwenSend(prefix, {
    type: "session.update",
    instructions: `${prompt}\n\nEnd the speaking test now. Score the candidate using FC, LR, GRA and Pronunciation. Give Overall Band rounded to nearest 0.5. Include a clear line exactly like: Overall Band: 6.5. Then give concise English feedback.`,
    voice: "Ethan",
    turnDetection: "manual",
  });
  qwenSend(prefix, { type: "response.create" });
  qwenAddBubble(prefix, "system", "Scoring speaking response...");
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
  if (typeof MediaRecorder === "undefined" || !session.micStream) return;
  try {
    const mimeType = preferredRecordingMime();
    session.recordingChunks = [];
    session.recordingMime = mimeType || "audio/webm";
    session.recordingReady = null;
    session.recorder = new MediaRecorder(session.micStream, mimeType ? { mimeType } : undefined);
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

async function createQwenRecordingDownload(prefix) {
  const session = qwenSession(prefix);
  const target = $(`${prefix}-recording-download`);
  if (!target) return;
  if (!session.recordingChunks.length) {
    target.innerHTML = `<span class="notice-inline">This browser did not produce a recording file.</span>`;
    return;
  }
  target.innerHTML = `<span class="notice-inline">Generating speaking recording MP3...</span>`;
  const blob = new Blob(session.recordingChunks, { type: session.recordingMime || "audio/webm" });
  const dataUrl = await blobToDataUrl(blob);
  try {
    const json = await postJson("/api/speaking/recording", { dataUrl });
    const label = json.mode === "mp3" ? "Download speaking MP3" : "Download speaking recording";
    target.innerHTML = `<a class="download-link" href="${json.dataUrl}" download="${escapeHtml(json.fileName || "ielts-speaking-recording.mp3")}">${label}</a>`;
  } catch (error) {
    const ext = (session.recordingMime || "").includes("mp4") ? "mp4" : (session.recordingMime || "").includes("ogg") ? "ogg" : "webm";
    target.innerHTML = `<a class="download-link" href="${dataUrl}" download="ielts-speaking-recording.${ext}">Download speaking recording</a><span class="notice-inline">MP3 conversion failed: ${escapeHtml(error.message)}</span>`;
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

function disconnectQwenSpeaking(prefix) {
  stopQwenMic(prefix, false);
  flushQwenMicAudio(prefix);
  qwenSend(prefix, { type: "disconnect" });
  const session = qwenSession(prefix);
  if (session.pollTimer) clearTimeout(session.pollTimer);
  session.pollTimer = null;
  session.transport = "";
  session.httpSessionId = "";
  session.ws?.close(1000, "user disconnected");
}

function initQwenOutput(prefix) {
  const session = qwenSession(prefix);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const created = !session.outputContext;
  session.outputContext ||= new AudioContextClass({ latencyHint: "interactive", sampleRate: 24000 });
  if (session.outputContext.state === "suspended") session.outputContext.resume().catch(() => {});
  if (created || !Number.isFinite(session.playbackCursor) || session.playbackCursor < session.outputContext.currentTime) {
    session.playbackCursor = session.outputContext.currentTime + 0.05;
  }
}

function unlockQwenOutput(prefix) {
  const session = qwenSession(prefix);
  try {
    initQwenOutput(prefix);
    if (!session.outputContext || session.outputUnlocked) return;
    const buffer = session.outputContext.createBuffer(1, 1, 24000);
    const source = session.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(session.outputContext.destination);
    source.start(0);
    session.outputUnlocked = true;
  } catch {
    session.outputUnlocked = false;
  }
}

function playQwenPcm(prefix, base64) {
  if (!base64) return;
  const session = qwenSession(prefix);
  initQwenOutput(prefix);
  if (!session.outputContext) return;
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const audioBuffer = session.outputContext.createBuffer(1, sampleCount, 24000);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) channel[i] = view.getInt16(i * 2, true) / 32768;
  const source = session.outputContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(session.outputContext.destination);
  session.playbackCursor = Math.max(session.playbackCursor, session.outputContext.currentTime + 0.03);
  source.start(session.playbackCursor);
  session.playbackCursor += audioBuffer.duration;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function renderSingle() {
  const moduleName = state.activeModule;
  const allOptions = mergedItems(moduleName).map(normalizeItem);
  renderSingleFilters(allOptions, moduleName);
  const options = applySingleFilters(allOptions, moduleName);
  if (!options.length) {
    $("singleTitle").textContent = "No questions available";
    $("singleSelect").innerHTML = "";
    $("singleContent").innerHTML = `<div class="notice">This module has no imported questions yet. Add materials to the user bank first.</div>`;
    return;
  }
  state.activeSingle = state.activeSingle && state.activeSingle.module === moduleName && options.some((item) => item.id === state.activeSingle.id) ? state.activeSingle : options[0];
  $("singleTitle").textContent = { listening: "Listening practice", reading: "Reading practice", writing: "Writing practice", speaking: "Speaking practice" }[moduleName];
  $("singleSelect").innerHTML = options.map((item) => `<option value="${item.id}">${item.title || item.type || "Untitled"} · ${item.source}</option>`).join("");
  $("singleSelect").value = state.activeSingle.id;
  const prefix = "single";
  $("singleContent").innerHTML =
    moduleName === "listening"
      ? renderListening(state.activeSingle, prefix)
      : moduleName === "reading"
        ? renderReading(state.activeSingle, prefix)
        : moduleName === "writing"
          ? renderWriting(state.activeSingle, prefix)
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
  const timerHtml = prefixRoot === "exam"
    ? `<div class="exam-quick-timer timer" aria-label="Stopped">
        <span id="examStickyTimer">02:44:00</span>
        <button id="examStickyTimerToggle" class="icon-btn">Start</button>
        <button id="examStickyTimerReset" class="icon-btn">Reset</button>
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
      </div>
      ${timerHtml}
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
  const candidates = pairs.filter((pair) => {
    const key = examSetKey(pair[0]);
    return !key || !avoidKeys.has(key);
  });
  return pick(candidates.length ? candidates : pairs);
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
  const writingTasks = pickWritingPairAvoidingSet(writingPairs, used).map(normalizeItem);
  return {
    listening,
    reading,
    writingTasks,
    writing: writingTasks[0],
    speaking: normalizeItem(pick(speakingPool)),
  };
}

function buildExam() {
  setImmersivePractice("", "");
  const bundle = buildRandomBundle();
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

function buildSequence() {
  setImmersivePractice("", "");
  renderSequenceFilters();
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
      setFeedback("singleFeedback", "Scoring writing...", "singleMode", "");
      const essay = $("single-writing").value.trim();
      const item = normalizeItem(state.activeSingle);
      const prompt = [item.prompt, item.data].filter(Boolean).join("\n\nData: ");
      const json = await postJson("/api/writing/feedback", { prompt, essay });
      setFeedbackHtml("singleFeedback", feedbackWithPdfHtml(json.feedback, json, "ielts-writing-feedback.pdf"), "singleMode", json.mode);
    } else {
      const text = $("single-speaking")?.value.trim() || "";
      const score = $("single-speaking-score")?.value.trim() || "";
      setFeedback("singleFeedback", text || score ? `Speaking practice recorded.${score ? ` Self-reported band: ${score}.` : ""}` : "Start the speaking test first, then record the band here.", "singleMode", "link");
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
    const json = await postJson("/api/writing/feedback", { prompt, essay });
    setFeedbackHtml("uploadWritingFeedback", feedbackWithPdfHtml(json.feedback, json, "ielts-writing-feedback.pdf"), "uploadWritingMode", json.mode);
  } catch (error) {
    setFeedback("uploadWritingFeedback", `Submission failed: ${error.message}`, "uploadWritingMode", "error");
  }
}

function setImmersivePractice(moduleName, targetId) {
  const shouldFocus = moduleName === "listening" || moduleName === "reading";
  if (shouldFocus) applySidebarState(true);
  document.body.classList.toggle("immersive-mode", shouldFocus);
  document.querySelectorAll(".exam-section").forEach((section) => {
    section.classList.toggle("focused-section", shouldFocus && section.id === targetId);
  });
  document.querySelectorAll(".exam-quick-nav a[data-focus-module]").forEach((link) => {
    link.classList.toggle("active", shouldFocus && link.dataset.focusModule === moduleName);
  });
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

function bindDynamicControls() {
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
    button.onclick = () => playAudioUrl(button.dataset.url);
  });
  document.querySelectorAll(".reveal-transcript").forEach((button) => {
    button.onclick = () => $(button.dataset.target).classList.toggle("show");
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
    button.onclick = () => disconnectQwenSpeaking(button.dataset.prefix);
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

function renderBankList() {
  if (!state.userBank.length) {
    $("bankList").innerHTML = `<div class="notice">No saved user questions yet.</div>`;
    return;
  }
  $("bankList").innerHTML = state.userBank
    .map(
      (item) => `
      <div class="bank-item">
        <div><strong>${item.title}</strong></div>
        <div class="module-meta">${item.module} · ${item.source}</div>
        <button class="link-btn delete-bank" data-id="${item.id}">Delete</button>
      </div>`,
    )
    .join("");
  document.querySelectorAll(".delete-bank").forEach((button) => {
    button.onclick = () => {
      state.userBank = state.userBank.filter((item) => item.id !== button.dataset.id);
      saveBank();
      renderSingle();
    };
  });
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
  if (updateHash) history.replaceState(null, "", "#" + viewId);
}

function applyInitialHash() {
  const hash = location.hash.replace("#", "");
  if (!hash) return;
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
  initSidebarToggle();
  $("globalSidebarToggle")?.addEventListener("click", () => {
    revealSidebarFromCurrentPosition();
  });
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      setImmersivePractice("", "");
      activateView(button.dataset.view, true);
    });
  });
  document.querySelectorAll(".module-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".module-btn").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.activeModule = button.dataset.module;
      state.activeSingle = null;
      resetSingleTimer(state.activeModule);
      renderSingle();
    });
  });
  $("singleSelect").addEventListener("change", (event) => {
    state.activeSingle = applySingleFilters(mergedItems(state.activeModule).map(normalizeItem), state.activeModule).find((item) => item.id === event.target.value);
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
  $("singleTimerToggle").addEventListener("click", () => (state.singleTimerId ? stopSingleTimer() : startSingleTimer()));
  $("singleTimerReset").addEventListener("click", () => resetSingleTimer(state.activeModule));
  $("saveBankItem").addEventListener("click", saveBankItem);
  $("clearBank").addEventListener("click", () => {
    $("bankTitle").value = "";
    $("bankAudioUrl").value = "";
    $("bankSourceUrl").value = "";
    $("bankAudioFile").value = "";
    $("bankPrompt").value = "";
    $("bankAnswers").value = "";
  });
  $("bankAudioFile").addEventListener("change", (event) => {
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
  $("importBulk").addEventListener("click", importBulkBank);
  $("clearBankStore").addEventListener("click", () => {
    if (confirm("Clear the user question bank?")) {
      state.userBank = [];
      saveBank();
      renderSingle();
    }
  });
}

async function init() {
  bindEvents();
  loadBank();
  state.data = await fetch("/api/tasks").then((res) => res.json());
  $("aiStatus").textContent = state.data.aiEnabled
    ? `AI connected · ${state.data.model}${state.data.ttsEnabled ? " · Fish TTS" : " · Browser TTS"}`
    : "Local mode · OPENAI_API_KEY not detected";
  $("sourceLinks").innerHTML = state.data.officialSources
    .map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>`)
    .join("");
  renderBankList();
  renderSingle();
  buildExam();
  buildSequence();
  renderExamTimer();
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
