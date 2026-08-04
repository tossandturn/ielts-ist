import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const baseUrl = process.env.IELTSIST_URL || "http://127.0.0.1:4321";
const sizes = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    const coachRequests = [];
    await page.route("**/api/help/chat", async (route) => {
      coachRequests.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mode: "test",
          answer: "位置：第2段，第3句\nThe evidence is in the matching passage.",
          readingEvidence: {
            question: 1,
            page: 18,
            paragraph: 2,
            sentence: 3,
            quote: "The evidence is in the matching passage.",
            rect: { left: 8, top: 30, width: 80, height: 4 },
            confidence: "high",
          },
        }),
      });
    });
    await page.goto(`${baseUrl}/?visual=reading-evidence#single`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => typeof state !== "undefined" && state.data?.readingTests?.length > 0);
    await page.evaluate(() => {
      localStorage.removeItem("ieltsistPracticeSession");
      state.activeModule = "reading";
      state.activeSingle = state.data.readingTests.find((item) => item.id === "cam15-r-test1");
      state.singleStarted = true;
      state.singlePracticeModes.reading = "full";
      state.readingMobilePane = "passage";
      state.readingPaneScroll = { passage: 0, questionPaper: 0, answers: 0 };
      renderSingle();
      setSingleImmersive("reading");
      window.scrollTo(0, 0);
    });
    await page.locator(".reading-mobile-workspace").waitFor({ state: "visible" });
    await page.locator("#toggleAnnotation").waitFor({ state: "visible" });
    const immersiveLayout = await page.evaluate(() => {
      const toolbar = document.querySelector("#annotationToolbar");
      const header = document.querySelector("#single > .view-head");
      const nav = document.querySelector(".reading-question-nav");
      const split = document.querySelector(".reading-split");
      const first = nav?.querySelector("button");
      const second = first?.nextElementSibling;
      const rect = (node) => {
        const value = node?.getBoundingClientRect();
        return value ? { x: value.x, y: value.y, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
      };
      return {
        accountVisible: Boolean(document.querySelector("#sidebarAccountEntry")?.getClientRects().length),
        toolbarParent: toolbar?.parentElement?.className || "",
        toolbar: rect(toolbar),
        header: rect(header),
        nav: rect(nav),
        split: rect(split),
        first: rect(first),
        second: rect(second),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.equal(immersiveLayout.accountVisible, false, `${size.name}: Account entry is visible during immersive practice`);
    assert.match(immersiveLayout.toolbarParent, /view-head/, `${size.name}: annotation tools are not mounted in the fixed header`);
    assert.ok(immersiveLayout.toolbar.x <= immersiveLayout.header.x + 16, `${size.name}: annotation tools are not at the top-left`);
    assert.ok(immersiveLayout.nav.y < immersiveLayout.split.y, `${size.name}: Reading question navigation is not above the workspace`);
    assert.ok(Math.abs(immersiveLayout.first.y - immersiveLayout.second.y) <= 2, `${size.name}: Reading question navigation is not horizontal`);
    assert.ok(immersiveLayout.second.x > immersiveLayout.first.x, `${size.name}: Reading question order is incorrect`);
    assert.ok(immersiveLayout.overflow <= 1, `${size.name}: immersive Reading overflows by ${immersiveLayout.overflow}px`);
    await page.locator("#toggleAnnotation").click();
    await page.waitForTimeout(180);
    const drawState = await page.locator("#toggleAnnotation").evaluate((button) => ({
      active: button.classList.contains("active"),
      pressed: button.getAttribute("aria-pressed"),
      label: button.textContent.trim(),
      bodyActive: document.body.classList.contains("annotation-enabled"),
      background: getComputedStyle(button).backgroundColor,
      color: getComputedStyle(button).color,
    }));
    assert.deepEqual(
      { active: drawState.active, pressed: drawState.pressed, label: drawState.label, bodyActive: drawState.bodyActive },
      { active: true, pressed: "true", label: "Drawing", bodyActive: true },
      `${size.name}: Draw mode has no persistent selected state`,
    );
    assert.equal(drawState.background, "rgb(37, 99, 235)", `${size.name}: Draw selected background is not visually distinct`);
    assert.equal(drawState.color, "rgb(255, 255, 255)", `${size.name}: Draw selected label is not readable`);
    await page.locator("#toggleEraser").click();
    assert.equal(await page.locator("#toggleAnnotation").getAttribute("aria-pressed"), "false", `${size.name}: Draw stayed selected in Erase mode`);
    assert.equal(await page.locator("#toggleEraser").getAttribute("aria-pressed"), "true", `${size.name}: Erase mode has no selected state`);
    await page.locator("#toggleEraser").click();

    for (const [question, passagePage] of [[1, 18], [14, 22], [27, 26]]) {
      await page.locator(`[data-reading-question-nav="${question}"]`).click();
      await page.waitForTimeout(550);
      const synchronized = await page.evaluate(({ question, passagePage }) => {
        const workspace = document.querySelector(".reading-mobile-workspace");
        const row = workspace?.querySelector(`.paper-answer-row[data-question-number="${question}"]`);
        const questionPaper = workspace?.querySelector(".reading-question-paper");
        const questionPage = row?.dataset.questionPage || "";
        const questionNode = questionPage ? questionPaper?.querySelector(`[data-pdf-page="${questionPage}"]`) : null;
        const answerScroll = row?.closest(".paper-answer-scroll");
        const passagePane = workspace?.querySelector(".reading-passage-pane");
        const passageNode = passagePane?.querySelector(`[data-pdf-page="${passagePage}"]`);
        return {
          current: workspace?.dataset.focusedQuestion,
          mappedPassage: row?.dataset.readingPassagePage,
          hasQuestionPage: Boolean(questionNode),
          questionDelta: questionNode && questionPaper ? Math.abs(questionPaper.scrollTop - Math.max(0, questionNode.offsetTop - 8)) : Infinity,
          answerVisible: row && answerScroll
            ? row.offsetTop >= answerScroll.scrollTop - 16
              && row.offsetTop + row.offsetHeight <= answerScroll.scrollTop + answerScroll.clientHeight + 16
            : false,
          passageStored: state.readingPaneScroll.passage,
          passageExpected: passageNode ? Math.max(0, passageNode.offsetTop - 8) : -1,
          passageMax: passagePane ? Math.max(0, passagePane.scrollHeight - passagePane.clientHeight) : -1,
        };
      }, { question, passagePage });
      assert.equal(synchronized.current, String(question), `${size.name} Q${question}: current question mismatch`);
      assert.equal(synchronized.mappedPassage, String(passagePage), `${size.name} Q${question}: passage mapping mismatch`);
      assert.equal(synchronized.hasQuestionPage, true, `${size.name} Q${question}: question page is missing`);
      assert.ok(synchronized.questionDelta < 40, `${size.name} Q${question}: question paper did not scroll`);
      assert.equal(synchronized.answerVisible, true, `${size.name} Q${question}: answer row is not visible`);
      const expectedPassageTop = Math.min(synchronized.passageExpected, synchronized.passageMax);
      assert.ok(Math.abs(synchronized.passageStored - expectedPassageTop) < 12,
        `${size.name} Q${question}: passage position was not preserved (${synchronized.passageStored} vs ${expectedPassageTop})`);
    }

    if (size.width <= 820 && size.height > size.width) {
      await page.locator('[data-reading-pane-target="passage"]').click();
      await page.waitForTimeout(100);
      const mobilePassage = await page.evaluate(() => {
        const pane = document.querySelector(".reading-passage-pane");
        const node = pane?.querySelector('[data-pdf-page="26"]');
        return node && pane ? Math.abs(pane.scrollTop - Math.max(0, node.offsetTop - 8)) : Infinity;
      });
      assert.ok(mobilePassage < 20, `${size.name}: Passage tab did not restore Q27's passage`);
      await page.locator('[data-reading-pane-target="questions"]').click();
    }

    const hintButton = page.locator('.paper-answer-row[data-question-number="1"] [data-reading-hint]');
    await hintButton.scrollIntoViewIfNeeded();
    const pageScrollBeforeCoach = await page.evaluate(() => window.scrollY);
    const hintRequest = page.waitForRequest((request) => request.url().includes("/api/help/chat"));
    await hintButton.click();
    await hintRequest;
    await page.waitForTimeout(100);
    assert.equal(coachRequests.length, 1, `${size.name}: Hint did not send exactly once`);
    assert.match(coachRequests[0].message, /Hint 1/);
    assert.match(coachRequests[0].message, /位置：第X段，第Y句/);
    assert.equal(coachRequests[0].helpContext.coach.focusedQuestion.number, 1);
    assert.match(coachRequests[0].helpContext.reading.paperText, /dark\s+green\s+oval\s+leaves/i,
      `${size.name}: Hint request did not include the OCR evidence for Q1`);
    assert.ok(await page.locator("#helpChatPanel").isVisible(), `${size.name}: Coach panel is not visible`);
    assert.match(await page.locator("#helpChatLog").innerText(), /第2段，第3句[\s\S]*matching passage/i,
      `${size.name}: Coach response is not visible`);
    const highlightAction = page.locator(".reading-evidence-jump");
    assert.equal(await highlightAction.innerText(), "Open highlight",
      `${size.name}: evidence CTA does not use the exact Open highlight label`);
    assert.equal(await page.locator('.coach-agent-actions button', { hasText: "Open Reading" }).count(), 0,
      `${size.name}: generic Open Reading is duplicated beside structured evidence`);
    if (size.name.startsWith("ipad")) {
      const coachLayout = await page.evaluate(() => {
        const panel = document.querySelector("#helpChatPanel");
        const log = document.querySelector("#helpChatLog");
        const rect = panel?.getBoundingClientRect();
        return {
          scrollY: window.scrollY,
          rect: rect ? { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          bodyOverflow: getComputedStyle(document.body).overflow,
          logScrollable: Boolean(log && log.scrollHeight >= log.clientHeight),
        };
      });
      assert.ok(coachLayout.rect.x >= 0 && coachLayout.rect.y >= 0, `${size.name}: Coach starts outside the viewport`);
      assert.ok(coachLayout.rect.right <= coachLayout.viewport.width + 1, `${size.name}: Coach exceeds viewport width`);
      assert.ok(coachLayout.rect.bottom <= coachLayout.viewport.height + 1, `${size.name}: Coach exceeds viewport height`);
      assert.equal(coachLayout.scrollY, pageScrollBeforeCoach, `${size.name}: opening Coach scrolled the practice page`);
      assert.equal(coachLayout.bodyOverflow, "hidden", `${size.name}: page scrolling is not locked while Coach is open`);
      assert.equal(coachLayout.logScrollable, true, `${size.name}: Coach conversation does not own its scrolling`);
    }
    await highlightAction.click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator("#helpChatPanel").isVisible(), false,
      `${size.name}: Open highlight did not close Coach`);
    assert.equal(await page.locator('[data-pdf-page="18"] [data-reading-evidence-highlight]').count(), 1,
      `${size.name}: Open highlight did not retain exactly one evidence overlay`);
    const openedHighlight = await page.locator('[data-pdf-page="18"] [data-reading-evidence-highlight]').evaluate((node) => ({
      left: node.style.left,
      top: node.style.top,
      width: node.style.width,
      height: node.style.height,
      passageActive: node.closest(".reading-mobile-workspace")?.dataset.readingPane,
    }));
    assert.deepEqual(openedHighlight, {
      left: "8%",
      top: "30%",
      width: "80%",
      height: "4%",
      passageActive: "passage",
    }, `${size.name}: Open highlight did not reopen the structured evidence rectangle`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
      `${size.name}: page has horizontal overflow`);
    console.log(`PASS ${size.name} ${size.width}x${size.height}`);
    await page.close();
  }
} finally {
  await browser.close();
}
