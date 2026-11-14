import { expect, test, type Page } from "@playwright/test";

const health = (page: Page) => page.getByRole("heading", { name: "My Health", exact: true, level: 1 });
const nav = (page: Page, name: string) => page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: new RegExp(`^${name}`) });

async function runTrials(page: Page) {
  const target = page.locator(".response-target");
  await expect(page.getByRole("button", { name: "Respond now", exact: true })).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(160);
  await target.press("Space");
}

test("entry flow: welcome, demo access, briefing, then My Health; briefing is skippable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Your health\. Your mission\./ })).toBeVisible();
  await page.getByRole("button", { name: "Enter Mission Demo" }).click();
  await expect(page.getByRole("heading", { name: "Choose a crew profile" })).toBeVisible();
  await page.getByRole("button", { name: /Enter as Maya Chen/ }).click();
  await expect(page.getByRole("heading", { name: "Ares I: mission day 94" })).toBeVisible();
  await page.getByLabel("Environment").selectOption("moon");
  await expect(page.getByText("About 1.3 s one-way")).toBeVisible();
  await page.getByRole("button", { name: "Continue to My Health" }).click();
  await expect(health(page)).toBeVisible();
  await expect(page.getByText("Maya Chen · Commander", { exact: false }).first()).toBeVisible();
  // Return to welcome and re-enter the same profile: the briefing is skipped.
  await page.getByRole("button", { name: /Profile: Maya Chen/ }).click();
  await page.getByRole("menuitem", { name: "Return to welcome" }).click();
  await expect(page.getByRole("button", { name: "Continue as Maya Chen" })).toBeVisible();
  await page.getByRole("button", { name: "Enter Mission Demo" }).click();
  await page.getByRole("button", { name: /Enter as Maya Chen/ }).click();
  await expect(health(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test("direct links open the workspace without blocking", async ({ page }) => {
  await page.goto("./#/countermeasures/cognitive");
  await expect(page.getByRole("heading", { name: "Countermeasures", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reaction-time assessment" })).toBeVisible();
  await page.goto("./#/crew");
  await expect(page.getByRole("heading", { name: "Crew", level: 1 })).toBeVisible();
});

test("dynamic findings, health card, evidence and scenarios", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./#/health");
  await expect(page.getByRole("heading", { name: "Slower reaction-time responses observed" })).toBeVisible();
  await page.getByRole("button", { name: "Open health card" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("+23.2% vs baseline");
  await expect(dialog).toContainText("3 consecutive recorded mission days");
  await dialog.getByRole("button", { name: /Spaceflight Standard Measures/ }).click();
  await expect(dialog).toContainText("NASA collects sleep reports");
  await expect(page.getByRole("link", { name: /Open original NASA source/ })).toHaveAttribute("href", "https://www.nasa.gov/reference/standard-measures/");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByLabel("Demo scenario").selectOption("nominal");
  await expect(page.getByRole("heading", { name: "No active findings" })).toBeVisible();
  await page.getByLabel("Demo scenario").selectOption("environment");
  await expect(page.getByRole("heading", { name: "Cabin CO₂ exceeds the reference" })).toBeVisible();
  await expect(page.locator(".finding .facts")).toContainText("+1.1 mmHg vs reference");
  await page.getByRole("button", { name: "Open health card" }).click();
  await expect(page.getByRole("dialog")).toContainText("3 mmHg NASA reference (1 h average)");
  expect(errors).toEqual([]);
});

test("logging, persistence, profile switching, environment, hazards and day", async ({ page }) => {
  await page.goto("./#/health");
  await page.getByRole("button", { name: "Log reading" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Value (ms)").fill("270");
  await form.getByRole("button", { name: "Save reading" }).click();
  await expect(page.locator(".vitals")).toContainText("270 ms");
  await page.reload();
  await expect(page.locator(".vitals")).toContainText("270 ms");
  await page.getByRole("button", { name: /Profile: Alex Morgan/ }).click();
  await page.getByRole("menuitemradio", { name: /Samira Noor/ }).click();
  await expect(page.getByText("Samira Noor · Crew medical officer", { exact: false }).first()).toBeVisible();
  await page.getByRole("banner").getByLabel("Environment").selectOption("moon");
  await expect(page.getByText("0.16 g", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Space radiation" }).click();
  await expect(page.getByRole("heading", { name: "Career effective radiation dose", exact: true })).toBeVisible();
  await page.getByLabel("Previous mission day").click();
  await expect(page.getByLabel("Mission day", { exact: true })).toHaveValue("93");
});

test("crew acknowledgement, check-in, activity and progress", async ({ page }) => {
  await page.goto("./#/crew");
  await expect(page.getByText("Check-in requested by monitoring policy")).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(page.getByRole("button", { name: "Acknowledged" })).toBeDisabled();
  await page.getByRole("button", { name: "Doing okay" }).click();
  await expect(page.getByRole("button", { name: "Doing okay" })).toHaveAttribute("aria-pressed", "true");
  await nav(page, "Countermeasures").click();
  await page.getByRole("button", { name: "Review Mobility check" }).click();
  await page.getByRole("button", { name: "Record simulated completion" }).click();
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page.locator(".stat-row")).toContainText("1 day");
  await expect(page.locator(".record-list").first()).toContainText("Mobility check");
});

test("real assessment: early trial excluded, five valid trials saved to health", async ({ page }) => {
  await page.goto("./#/countermeasures/cognitive");
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.getByRole("button", { name: "Wait for the signal…" }).click();
  await expect(page.getByText("Too early.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Next trial", exact: true }).click();
  await runTrials(page);
  await page.getByRole("button", { name: "Begin recorded assessment" }).click();
  for (let i = 0; i < 5; i++) {
    await runTrials(page);
    if (i < 4) await page.getByRole("button", { name: "Next trial", exact: true }).click();
  }
  await expect(page.getByText("Assessment complete", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Save assessment result" }).click();
  await expect(page.getByRole("button", { name: "Saved to health history" })).toBeVisible();
  await expect(page.locator("table.simple")).toContainText("94");
  await nav(page, "My Health").click();
  await page.locator(".indicator", { hasText: "Reaction time" }).click();
  await page.getByRole("button", { name: "Explain this indicator" }).click();
  await expect(page.getByRole("dialog")).toContainText("Browser assessment");
});

test("form validation and reset from the profile menu", async ({ page }) => {
  await page.goto("./#/health");
  await page.getByRole("button", { name: "Log reading" }).click();
  await page.getByRole("dialog").getByLabel("Indicator").selectOption("sleep");
  await page.getByLabel("Value (h)").fill("30");
  await page.getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByRole("alert")).toContainText("Data-quality");
  await page.keyboard.press("Escape");
  await page.getByLabel("Demo scenario").selectOption("nominal");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Profile:/ }).click();
  await page.getByRole("menuitem", { name: "Reset demo" }).click();
  await expect(page.getByLabel("Demo scenario")).toHaveValue("fatigue");
});

test("responsive layouts at 1440, 1280 and 390 pixels", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width !== 1280) await page.screenshot({ path: `docs/validation/welcome-${width}.png`, fullPage: true });
    for (const p of ["health", "crew", "countermeasures"]) {
      await page.goto(`./#/${p}`);
      await expect(page.locator("main h1")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (p === "health" || width !== 1280) await page.screenshot({ path: `docs/validation/${p === "health" ? "overview" : p}-${width}.png`, fullPage: true });
    }
  }
});

test("offline reload preserves shell, scenarios, evidence and navigation", async ({ page, context }) => {
  await page.goto("./#/health");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(health(page)).toBeVisible();
  await page.getByLabel("Demo scenario").selectOption("environment");
  await page.getByRole("button", { name: "Open health card" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /OCHMO/ }).click();
  await expect(page.getByRole("dialog")).toContainText("at most 3 mmHg");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Countermeasures").click();
  await expect(page.getByRole("heading", { name: "Activity library" })).toBeVisible();
  await page.getByRole("link", { name: "Cognitive" }).click();
  await page.getByRole("button", { name: "Start practice" }).click();
  await runTrials(page);
  await expect(page.getByRole("button", { name: "Begin recorded assessment" })).toBeVisible();
  await context.setOffline(false);
});

test("basic accessibility of entry screens, pages and dialogs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const check = async () => {
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  };
  for (const h of ["./", "./#/access", "./#/briefing", "./#/health", "./#/crew", "./#/countermeasures/cognitive", "./#/countermeasures/progress"]) {
    await page.goto(h);
    await expect(page.locator("h1").first()).toBeVisible();
    await check();
  }
  await page.goto("./#/health");
  await page.getByRole("button", { name: "Open health card" }).click();
  await check();
});
