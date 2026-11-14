import { expect, test, type Page } from "@playwright/test";

const title = (page: Page, name: string) => page.getByRole("heading", { name, exact: true, level: 1 });
const nav = (page: Page, name: string) => page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: new RegExp(`^${name}`) });
async function sim(page: Page) {
  const panel = page.getByRole("group", { name: "Simulation controls" });
  if (!(await panel.isVisible())) await page.getByRole("button", { name: "Simulation" }).click();
  return panel;
}
async function scenario(page: Page, value: string) {
  await (await sim(page)).getByLabel("Demo scenario").selectOption(value);
  await page.keyboard.press("Escape");
}
async function respond(page: Page) {
  await expect(page.getByRole("button", { name: "Respond now", exact: true })).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(160);
  await page.locator(".response-target").press("Space");
}

test("entry: welcome, profile selection, briefing, workspace; briefing skipped on return; quick demo", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "ASTRAMED", level: 1 })).toBeVisible();
  await expect(page.getByText("Astronaut Health Monitoring System")).toBeVisible();
  await page.getByRole("button", { name: "Enter Mission System" }).click();
  await expect(page.getByRole("heading", { name: "Select crew profile" })).toBeVisible();
  await page.getByRole("button", { name: /Enter as Mohammad Al-Ani/ }).click();
  await expect(page.getByRole("heading", { name: /Mission briefing/ })).toBeVisible();
  await page.getByLabel("Environment").selectOption("moon");
  await expect(page.getByText("About 1.3 s one-way")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-env", "moon");
  await page.getByRole("button", { name: "Open Workspace" }).click();
  await expect(title(page, "Personal Health Overview")).toBeVisible();
  await expect(page.getByText("Mohammad Al-Ani · Commander", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: /Profile: Mohammad Al-Ani/ }).click();
  await page.getByRole("menuitem", { name: "Return to profile selection" }).click();
  await page.getByRole("button", { name: /Enter as Mohammad Al-Ani/ }).click();
  await expect(title(page, "Personal Health Overview")).toBeVisible();
  await page.getByRole("button", { name: /Profile:/ }).click();
  await page.getByRole("menuitem", { name: "Sign out of demo session" }).click();
  await page.getByRole("button", { name: "Quick Demo" }).click();
  await expect(page.getByText("Ali Shahroor · Mission specialist", { exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("direct links open the workspace without blocking", async ({ page }) => {
  await page.goto("./#/countermeasures/cognitive");
  await expect(title(page, "Exercise & Cognitive Assessments")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cognitive assessments", exact: true })).toBeVisible();
  await page.goto("./#/crew");
  await expect(title(page, "Crew Health & Operations")).toBeVisible();
});

test("findings, health card calculation, evidence and scenarios", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./#/health");
  await expect(page.getByRole("heading", { name: "Slower reaction-time responses observed" })).toBeVisible();
  await page.getByRole("button", { name: "Why was this flagged?" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("+23.2% vs baseline");
  await dialog.getByText("Show calculation").click();
  await expect(dialog).toContainText("(351 − 285) ÷ 285 × 100 = 23.2%");
  await dialog.getByRole("button", { name: /Spaceflight Standard Measures/ }).click();
  await expect(dialog).toContainText("NASA collects sleep reports");
  await expect(page.getByRole("link", { name: /Open original NASA source/ })).toHaveAttribute("href", "https://www.nasa.gov/reference/standard-measures/");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await scenario(page, "nominal");
  await expect(page.getByRole("heading", { name: "No active findings" })).toBeVisible();
  await scenario(page, "environment");
  await expect(page.getByRole("heading", { name: "Cabin CO₂ exceeds the reference" })).toBeVisible();
  await page.getByRole("button", { name: "Why was this flagged?" }).click();
  await page.getByRole("dialog").getByText("Show calculation").click();
  await expect(page.getByRole("dialog")).toContainText("4.1 − 3 = 1.1 mmHg");
  expect(errors).toEqual([]);
});

test("logging, persistence, profile switching, environment theme, hazards and day", async ({ page }) => {
  await page.goto("./#/health");
  await page.getByRole("button", { name: "Log reading" }).click();
  await page.getByRole("dialog").getByLabel("Value (ms)").fill("270");
  await page.getByRole("dialog").getByRole("button", { name: "Save reading" }).click();
  await expect(page.locator(".readings")).toContainText("270 ms");
  await page.reload();
  await expect(page.locator(".readings")).toContainText("270 ms");
  await page.getByRole("button", { name: /Profile: Ali Shahroor/ }).click();
  await page.getByRole("menuitemradio", { name: /Mohammad Al-Ani/ }).click();
  await expect(page.getByText("Mohammad Al-Ani · Commander", { exact: false }).first()).toBeVisible();
  await page.getByRole("banner").getByLabel("Environment").selectOption("earth");
  await expect(page.locator("html")).toHaveAttribute("data-env", "earth");
  await expect(page.locator(".mission-panel")).toContainText("1 g");
  await page.getByRole("button", { name: "Space radiation" }).click();
  await expect(page.getByRole("heading", { name: "Career effective radiation dose", exact: true })).toBeVisible();
  const panel = await sim(page);
  await panel.getByLabel("Previous mission day").click();
  await expect(panel.getByLabel("Mission day", { exact: true })).toHaveValue("93");
});

test("crew: queue, detail, privacy, check-in with a concern, crewmate acknowledges", async ({ page }) => {
  await page.goto("./#/crew");
  const queue = page.locator(".queue");
  await expect(queue).toContainText("Check-in requested by the monitoring policy");
  await expect(page.locator(".crew-detail .spark")).toHaveCount(3);
  await expect(page.locator(".crew-detail .strip .cell")).toHaveCount(14);
  await page.locator(".who-btn", { hasText: "Nada Aboubaker" }).click();
  await expect(page.locator(".crew-detail")).toContainText("shares status and check-ins only");
  await expect(page.locator(".crew-detail .spark")).toHaveCount(0);
  await queue.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(page.locator(".crew-detail h2")).toContainText("Ali Shahroor");
  await page.locator(".crew-detail label.choice", { hasText: "I’d like to talk" }).click();
  await page.getByLabel("Note (optional)").fill("Short sleep this week");
  await page.locator(".checkin-form").getByRole("button", { name: "Check in", exact: true }).click();
  await expect(page.locator(".checkin-done")).toContainText("Would like to talk");
  await expect(page.locator(".checkin-done")).toContainText("Short sleep this week");
  await expect(queue).not.toContainText("monitoring policy");
  await expect(page.locator(".log")).toContainText("Ali checked in: Would like to talk");
  await page.getByRole("button", { name: /Profile:/ }).click();
  await page.getByRole("menuitemradio", { name: /Mohammad Al-Ani/ }).click();
  await expect(queue).toContainText("Ali would like to talk");
  await queue.locator("li", { hasText: "would like to talk" }).getByRole("button", { name: "Acknowledge" }).click();
  await expect(queue).not.toContainText("would like to talk");
  await expect(page.locator(".log")).toContainText("Ali’s request was acknowledged");
});

test("cross-profile: Ali asks Mohammad to check in, signs out; Mohammad answers", async ({ page }) => {
  await page.goto("./#/crew");
  await page.locator(".who-btn", { hasText: "Mohammad Al-Ani" }).click();
  await page.getByRole("button", { name: /Ask Mohammad (to check in|for an update)/ }).click();
  await expect(page.locator(".crew-detail .sent")).toContainText("Waiting for Mohammad");
  await page.locator(".crew-detail .sent").getByRole("button", { name: "Withdraw" }).click();
  await page.getByRole("button", { name: /Ask Mohammad (to check in|for an update)/ }).click();
  await expect(page.locator(".roster tr", { hasText: "Mohammad Al-Ani" })).toContainText("Requested by you");
  await page.getByRole("button", { name: /Profile:/ }).click();
  await page.getByRole("menuitem", { name: "Sign out of demo session" }).click();
  await page.getByRole("button", { name: "Enter Mission System" }).click();
  await page.getByRole("button", { name: /Enter as Mohammad Al-Ani/ }).click();
  await page.getByRole("button", { name: "Open Workspace" }).click();
  await nav(page, "Crew").click();
  await expect(page.locator(".queue")).toContainText("Check-in requested by Ali");
  await page.locator(".queue").getByRole("button", { name: "Check in", exact: true }).click();
  await page.locator(".checkin-form").getByRole("button", { name: "Check in", exact: true }).click();
  await expect(page.locator(".queue")).not.toContainText("Check-in requested by Ali");
  await page.getByRole("button", { name: /Profile:/ }).click();
  await page.getByRole("menuitemradio", { name: /Ali Shahroor/ }).click();
  await expect(page.locator(".log")).toContainText("Mohammad answered Ali’s request");
});

test("crew report to ground respects sharing and is logged", async ({ page }) => {
  await page.goto("./#/crew");
  await page.getByRole("button", { name: "Report to ground" }).click();
  const d = page.getByRole("dialog");
  const report = d.getByLabel("Report preview");
  await expect(report).toContainText("Ali Shahroor, Mission specialist");
  await expect(report).toContainText("Findings: not shared by this crew member");
  await expect(report).toContainText("NASA limit 3 mmHg");
  await d.getByLabel("Add a note (optional)").fill("Ali will retest after rest");
  await expect(report).toContainText("Note: Ali will retest after rest");
  await d.getByRole("button", { name: "Queue report" }).click();
  await expect(d).toContainText("Queued at");
  await page.keyboard.press("Escape");
  await expect(page.locator(".log")).toContainText("Ali sent a crew report to ground");
});

test("daily briefing: findings, changes, crew, tasks", async ({ page }) => {
  await page.goto("./#/health");
  await expect(page.locator(".who-name")).toHaveText("Ali Shahroor");
  await page.getByRole("button", { name: "Review today’s briefing" }).click();
  const d = page.getByRole("dialog");
  await expect(d).toContainText("Slower reaction-time responses observed");
  await d.getByRole("button", { name: "Next", exact: true }).click();
  await expect(d).toContainText("Since day 93");
  await d.getByRole("button", { name: "Next", exact: true }).click();
  await expect(d).toContainText("Your check-in for today");
  await d.getByRole("button", { name: "Next", exact: true }).click();
  await expect(d).toContainText("Repeat the reaction-time assessment");
  await d.getByRole("button", { name: "Start first task" }).click();
  await expect(title(page, "Crew Health & Operations")).toBeVisible();
});

test("physical training: video, checklist and session are tracked separately", async ({ page }) => {
  await page.goto("./#/countermeasures/physical");
  await expect(page.getByRole("heading", { name: "Resistance exercise", level: 2 })).toBeVisible();
  await expect(page.locator(".video-credit")).toContainText("NASA Johnson Space Center");
  await page.locator(".training-item", { hasText: "Mobility check" }).click();
  for (const box of await page.locator(".check-row input").all()) await box.check();
  await expect(page.getByText("Checklist complete for today")).toBeVisible();
  await page.getByLabel("Duration (min)").fill("0");
  await page.getByRole("button", { name: "Record session" }).click();
  await expect(page.locator("#sess-err")).toContainText("between 1 and 240");
  await page.getByLabel("Duration (min)").fill("12");
  await page.getByRole("button", { name: "Record session" }).click();
  await expect(page.locator(".training-history")).toContainText("Session · 12 min");
  await expect(page.locator(".training-history")).toContainText("Demonstration checklist completed");
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.locator(".stat-row")).toContainText("Sessions recorded1");
  await expect(page.locator(".stat-row")).toContainText("Exercise minutes12");
});

test("real assessment: early trial excluded, five valid trials saved to health", async ({ page }) => {
  await page.goto("./#/countermeasures/cognitive");
  await page.getByRole("button", { name: "Reaction time only" }).click();
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.getByRole("button", { name: "Wait for the signal…" }).click();
  await expect(page.getByText("Too early.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Next trial", exact: true }).click();
  await respond(page);
  await page.getByRole("button", { name: "Begin recorded assessment" }).click();
  for (let i = 0; i < 5; i++) {
    await respond(page);
    if (i < 4) await page.getByRole("button", { name: "Next trial", exact: true }).click();
  }
  await page.getByRole("button", { name: "Save assessment result" }).click();
  await expect(page.getByRole("button", { name: "Saved to health history" })).toBeVisible();
  await nav(page, "My Health").click();
  await page.locator(".indicator", { hasText: "Reaction time" }).click();
  await page.getByRole("button", { name: "Explain this indicator" }).click();
  await expect(page.getByRole("dialog")).toContainText("Browser assessment");
});

test("cognitive battery: CDD locked until CDS, MTH run and saved with throughput", async ({ page }) => {
  await page.goto("./#/countermeasures/cognitive");
  const row = (t: string) => page.locator(`table.tests tbody tr:has(th .mono:text-is("${t}"))`);
  await expect(row("CDD").getByRole("button", { name: "Start" })).toBeDisabled();
  await row("MTH").getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Skip practice" }).click();
  for (let i = 0; i < 15; i++) {
    await expect(page.getByRole("button", { name: /Less than 5/ })).toBeEnabled({ timeout: 4000 });
    const text = await page.locator(".cog-math").innerText();
    const v = Function(`return ${text.replace(/−/g, "-")}`)() as number;
    await page.keyboard.press(v < 5 ? "f" : "j");
  }
  await expect(page.getByText("15 of 15 correct")).toBeVisible();
  await page.getByRole("button", { name: "Save result" }).click();
  await page.getByRole("button", { name: "All tests" }).click();
  await expect(row("MTH")).toContainText("100% correct");
  await expect(row("MTH")).toContainText("Building: 1 of 3");
  await row("CDS").getByRole("button", { name: "Start" }).click();
  await expect(page.getByLabel("Code key")).toBeHidden();
  await page.getByRole("button", { name: "Skip practice" }).click();
  await expect(page.getByLabel("Code key")).toBeVisible();
  for (let i = 0; i < 18; i++) { await expect(page.getByRole("button", { name: /^Match/ })).toBeEnabled({ timeout: 4000 }); await page.keyboard.press("f"); }
  await page.getByRole("button", { name: "Save result" }).click();
  await page.getByRole("button", { name: "All tests" }).click();
  await expect(row("CDD").getByRole("button", { name: "Start" })).toBeEnabled();
});

test("crew detail opens as a slide-over sheet on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./#/crew");
  await expect(page.locator(".crew-detail")).toBeHidden();
  await page.locator(".who-btn", { hasText: "Mohammad Al-Ani" }).click();
  await expect(page.locator(".crew-detail")).toBeVisible();
  await expect(page.locator(".crew-detail")).toContainText("Mohammad Al-Ani");
  await page.keyboard.press("Escape");
  await expect(page.locator(".crew-detail")).toBeHidden();
});

test("form validation and restart from the profile menu", async ({ page }) => {
  await page.goto("./#/health");
  await page.getByRole("button", { name: "Log reading" }).click();
  await page.getByRole("dialog").getByLabel("Indicator").selectOption("sleep");
  await page.getByLabel("Value (h)").fill("30");
  await page.getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Data-quality" })).toBeVisible();
  await page.keyboard.press("Escape");
  await scenario(page, "nominal");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Profile:/ }).click();
  await page.getByRole("menuitem", { name: "Restart demonstration" }).click();
  await expect((await sim(page)).getByLabel("Demo scenario")).toHaveValue("fatigue");
});

test("responsive layouts at 1440, 1280 and 390 pixels", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width !== 1280) await page.screenshot({ path: `docs/validation/welcome-${width}.png` });
    for (const p of ["health", "crew", "countermeasures/physical"]) {
      await page.goto(`./#/${p}`);
      await expect(page.locator(".topbar h1")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const name = p === "health" ? "overview" : p.split("/")[0];
      if (p === "health" || width !== 1280) await page.screenshot({ path: `docs/validation/${name}-${width}.png`, fullPage: true });
    }
  }
});

test("offline: workspace, evidence and assessment work; uncached video shows unavailable state", async ({ page, context }) => {
  await page.goto("./#/health");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(title(page, "Personal Health Overview")).toBeVisible();
  await scenario(page, "environment");
  await page.getByRole("button", { name: "Why was this flagged?" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /OCHMO/ }).click();
  await expect(page.getByRole("dialog")).toContainText("at most 3 mmHg");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Countermeasures").click();
  await expect(page.getByText("Video unavailable")).toBeVisible();
  await expect(page.getByText("not stored for offline use")).toBeVisible();
  await page.locator(".training-item", { hasText: "Cycle ergometer" }).click();
  await expect(page.locator(".video-credit")).toContainText("available offline");
  await page.getByRole("button", { name: /Play video/ }).click();
  await expect.poll(() => page.evaluate(() => document.querySelector("video")?.readyState ?? 0), { timeout: 10000 }).toBeGreaterThanOrEqual(2);
  await page.getByRole("link", { name: "Cognitive assessment" }).click();
  await page.getByRole("button", { name: "Reaction time only" }).click();
  await page.getByRole("button", { name: "Start practice" }).click();
  await respond(page);
  await expect(page.getByRole("button", { name: "Begin recorded assessment" })).toBeVisible();
  await context.setOffline(false);
});

test("accessibility of entry screens, pages and dialogs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const check = async () => {
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  };
  for (const env of ["mars", "moon", "earth", "orbit"]) {
    await page.goto("./#/health");
    await page.getByRole("banner").getByLabel("Environment").selectOption(env);
    await check();
  }
  for (const h of ["./", "./#/access", "./#/briefing", "./#/crew", "./#/countermeasures/physical", "./#/countermeasures/cognitive", "./#/countermeasures/progress"]) {
    await page.goto(h);
    await expect(page.locator("h1").first()).toBeVisible();
    await check();
  }
  await page.goto("./#/health");
  await page.getByRole("button", { name: "Why was this flagged?" }).click();
  await check();
});
