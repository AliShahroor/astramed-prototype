import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("./");
});
test(
  "overview, dynamic findings, evidence and scenarios",
  { tag: "@core" },
  async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await expect(
      page.getByRole("heading", { name: "Your health, in context." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Inspect reasoning" }).click();
    await expect(page.getByRole("dialog")).toContainText("+23.2%");
    await expect(page.getByRole("dialog")).toContainText(
      "3 consecutive recorded mission days",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Spaceflight Standard Measures/ })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "NASA collects sleep reports",
    );
    await expect(
      page.getByRole("link", { name: "Open original NASA source" }),
    ).toHaveAttribute(
      "href",
      "https://www.nasa.gov/reference/standard-measures/",
    );
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.getByLabel("Demo scenario").selectOption("nominal");
    await expect(
      page.getByText("No prototype flags", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Demo scenario").selectOption("environment");
    await expect(
      page.getByRole("heading", { name: "Cabin CO₂ exceeds the reference" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Inspect reasoning" }).click();
    await expect(page.getByRole("dialog")).toContainText("1.1 mmHg difference");
    expect(errors).toEqual([]);
  },
);
test("manual logging, persistence, selection, context and filtering", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Log reading", exact: true }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Value (ms)").fill("270");
  await form.getByRole("button", { name: "Save reading locally" }).click();
  await expect(
    page.getByRole("button", { name: /Reaction time.*270 ms/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Reaction time.*270 ms/ }),
  ).toBeVisible();
  await page.getByLabel("Current astronaut").selectOption("maya");
  await expect(
    page.getByText("Welcome, Maya.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Environment", { exact: true }).selectOption("moon");
  await expect(page.getByText("0.16 g", { exact: false })).toBeVisible();
  await page.getByLabel("NASA hazard lens").selectOption("Space radiation");
  await expect(
    page.getByRole("heading", {
      name: "Career effective radiation dose",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Mission day", { exact: true }).selectOption("40");
  await expect(
    page.getByText("Mission day 040", { exact: false }),
  ).toBeVisible();
});
test("crew acknowledgements, check-ins and activity progress", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Crew", exact: true }).click();
  await expect(
    page.getByText("Check-in requested by monitoring policy"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Acknowledged", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Record my check-in" }).click();
  await expect(
    page.getByText("Check-in recorded for this mission day."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Countermeasures", exact: true })
    .click();
  await page.getByRole("button", { name: "Review activity" }).first().click();
  await page
    .getByRole("button", { name: "Record simulated completion" })
    .click();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.getByText("1 day", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Mobility check", { exact: false }),
  ).toBeVisible();
});
test("real assessment: early trial excluded, five valid trials saved to health and crew", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Countermeasures", exact: true })
    .click();
  await page.getByRole("button", { name: "Cognitive", exact: true }).click();
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.getByRole("button", { name: "Wait for the signal…" }).click();
  await expect(page.getByText("Too early.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Next trial", exact: true }).click();
  const target = page.getByRole("button", { name: "Respond now", exact: true });
  await expect(target).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(160);
  await target.press("Space");
  await page.getByRole("button", { name: "Begin recorded assessment" }).click();
  for (let i = 0; i < 5; i++) {
    await expect(target).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(165);
    await target.press("Space");
    if (i < 4)
      await page
        .getByRole("button", { name: "Next trial", exact: true })
        .click();
  }
  await expect(
    page.getByText("Assessment complete", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save assessment result" }).click();
  await expect(
    page.getByRole("button", { name: "Saved to health history" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "My Health", exact: true }).click();
  await page
    .getByRole("button", { name: "Inspect Reaction-time latency", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Browser assessment");
  const actual = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("astramed-state-v1")!).assessments[0]
        .median as number,
  );
  await expect(page.getByRole("dialog")).toContainText(
    `${((100 * (Number(actual.toFixed(1)) - 285)) / 285).toFixed(1)}%`,
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Crew", exact: true }).click();
  await expect(
    page.getByText("Check-in requested by monitoring policy"),
  ).toBeVisible();
});
test("form validation, keyboard dialog and reset", async ({ page }) => {
  await page.getByRole("button", { name: "Log reading", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Indicator", { exact: true })
    .selectOption("sleep");
  await page.getByLabel("Value (h)").fill("30");
  await page.getByRole("button", { name: "Save reading locally" }).click();
  await expect(page.getByRole("alert")).toContainText("Data-quality");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Demo & preferences" }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.getByLabel("Demo scenario")).toHaveValue("fatigue");
  await expect(page.getByLabel("Current astronaut")).toHaveValue("alex");
});
test("responsive layouts at 1440, 1280 and 390 pixels", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("heading", { name: "Your health, in context." }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `docs/validation/overview-${width}.png`,
      fullPage: true,
    });
    for (const section of ["Crew", "Countermeasures"]) {
      await page.getByRole("button", { name: section, exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      if (width !== 1280)
        await page.screenshot({
          path: `docs/validation/${section.toLowerCase()}-${width}.png`,
          fullPage: true,
        });
    }
    await page.getByRole("button", { name: "My Health", exact: true }).click();
  }
});
test("offline reload preserves shell, scenarios, evidence and navigation", async ({
  page,
  context,
}) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your health, in context." }),
  ).toBeVisible();
  await page.getByLabel("Demo scenario").selectOption("environment");
  await page.getByRole("button", { name: "Inspect reasoning" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /OCHMO/ }).click();
  await expect(page.getByRole("dialog")).toContainText("at most 3 mmHg");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Countermeasures", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily practice" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cognitive", exact: true }).click();
  await page.getByRole("button", { name: "Start practice" }).click();
  const target = page.getByRole("button", { name: "Respond now", exact: true });
  await expect(target).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(160);
  await target.press("Space");
  await expect(
    page.getByRole("button", { name: "Begin recorded assessment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My Health", exact: true }).click();
  await page.getByRole("button", { name: "Log reading", exact: true }).click();
  await page.getByLabel("Indicator", { exact: true }).selectOption("sleep");
  await page.getByLabel("Value (h)").fill("6.9");
  await page.getByRole("button", { name: "Save reading locally" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Sleep.*6.9 h/ }),
  ).toBeVisible();
  await context.setOffline(false);
});
test("basic accessibility of all primary pages and dialogs", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const name of ["My Health", "Crew", "Countermeasures"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "My Health", exact: true }).click();
  await page.getByRole("button", { name: "Log reading", exact: true }).click();
  const dialogReport = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    dialogReport.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
