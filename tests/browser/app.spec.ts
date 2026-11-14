import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function settings(page: Page) {
  await page.getByRole("button", { name: "About this demonstration" }).click();
  return page.getByRole("dialog");
}
async function configure(page: Page, scenario: string, day?: string) {
  const dialog = await settings(page);
  await dialog.getByLabel("Demo scenario").selectOption(scenario);
  if (day)
    await dialog.getByLabel("Mission day", { exact: true }).selectOption(day);
  await dialog.getByRole("button", { name: "Close dialog" }).click();
}
async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Primary", exact: true })
    .getByRole("link", { name: new RegExp(name) })
    .click();
  const titles: Record<string, string> = {
    "My Health": "Personal Health Overview",
    Crew: "Crew Health & Operations",
    Countermeasures: "Exercise & Cognitive Assessments",
  };
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    titles[name],
  );
}
async function switchProfile(page: Page, name: string) {
  await page.getByRole("button", { name: /^Profile:/ }).click();
  await page
    .getByRole("group", { name: "Profile and session" })
    .getByRole("button", { name: new RegExp(name) })
    .click();
}
async function noOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}
test.beforeEach(async ({ page }) => {
  await page.goto("./#/health");
});

test(
  "overview, dynamic findings, evidence and scenarios",
  { tag: "@core" },
  async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await expect(
      page.getByRole("heading", { name: "Personal Health Overview" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open health card" }).click();
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
    await configure(page, "nominal");
    await expect(
      page.getByRole("heading", { name: "No active findings" }),
    ).toBeVisible();
    await configure(page, "environment");
    await expect(
      page.getByRole("heading", { name: "Cabin CO₂ exceeds the reference" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open health card" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "+1.1 mmHg vs reference",
    );
    expect(errors).toEqual([]);
  },
);
test("manual logging, persistence, selection, context and filtering", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Log reading", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Value (ms)").fill("270");
  await page.getByRole("button", { name: "Save reading", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Reaction time.*270 ms/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Reaction time.*270 ms/ }),
  ).toBeVisible();
  await switchProfile(page, "Maya Chen");
  await expect(page.getByRole("main")).toContainText("Maya Chen · Commander");
  await page.getByLabel("Environment", { exact: true }).selectOption("moon");
  await page
    .getByRole("button", { name: "Mission details", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("0.16 g");
  await page.keyboard.press("Escape");
  await page.getByLabel("NASA hazard lens").selectOption("Space radiation");
  await expect(
    page.getByRole("heading", {
      name: "Career effective radiation dose",
      exact: true,
    }),
  ).toBeVisible();
  await configure(page, "fatigue", "40");
  await expect(page.getByRole("main")).toContainText("Mission day 40");
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await expect(
    page.getByText("7 recorded days · Latest reading per mission day"),
  ).toBeVisible();
});
test("crew acknowledgements, check-ins and activity progress", async ({
  page,
}) => {
  await navigate(page, "Crew");
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Acknowledged", exact: true }),
  ).toBeDisabled();
  // Review status stays independent of acknowledgement.
  await expect(
    page.getByRole("row", { name: /Alex Morgan.*Review/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Record my check-in", exact: true })
    .click();
  await expect(page.getByLabel("Coordination request")).toBeFocused();
  await page.getByLabel("Coordination request").selectOption("support");
  await page.getByRole("button", { name: "Save my check-in" }).click();
  await expect(
    page.getByRole("row", { name: /Alex Morgan.*Support requested/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Crew overview")).toContainText(
    "Pending check-ins3",
  );
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Acknowledged", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Include dismissed").check();
  await expect(
    page.getByRole("button", { name: "Acknowledged", exact: true }),
  ).toBeDisabled();
  await navigate(page, "Countermeasures");
  await page.getByRole("button", { name: "Review Mobility check" }).click();
  await page
    .getByRole("button", { name: "Record simulated completion" })
    .click();
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page.getByText("1 day", { exact: true })).toBeVisible();
  await expect(page.getByText("Mobility check", { exact: true })).toBeVisible();
  await navigate(page, "Crew");
  await expect(
    page.getByText("Mobility check recorded", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("row", { name: /Alex Morgan.*Support requested/ }),
  ).toBeVisible();
});
test("real assessment: early trial excluded, five valid trials saved to health and crew", async ({
  page,
}) => {
  await navigate(page, "Countermeasures");
  await page.getByRole("link", { name: "Cognitive", exact: true }).click();
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
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("astramed-state-v1")!).assessments[0],
  );
  expect(saved.trials).toHaveLength(5);
  expect(saved.falseStarts).toBe(0);
  await navigate(page, "My Health");
  await page
    .getByRole("button", { name: "Explain this indicator", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Browser assessment");
  await expect(page.getByRole("dialog")).toContainText(
    `${((100 * (Number(saved.median.toFixed(1)) - 285)) / 285).toFixed(1)}%`,
  );
  await page.keyboard.press("Escape");
  await navigate(page, "Crew");
  await expect(
    page.getByText("Cognitive assessment completed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Check-in requested by monitoring policy",
    }),
  ).toBeVisible();
});
test("form validation, keyboard dialog and reset", async ({ page }) => {
  await page.getByRole("button", { name: "Log reading", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Indicator", { exact: true })
    .selectOption("sleep");
  await page.getByLabel("Value (h)").fill("30");
  await page.getByRole("button", { name: "Save reading", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Data-quality");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log reading", exact: true }),
  ).toBeFocused();
  await settings(page);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Profile: Alex Morgan" }),
  ).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("astramed-state-v1")!),
  );
  expect(state.scenario).toBe("fatigue");
  expect(state.readings).toEqual([]);
});
test("responsive layouts at 1440, 1280, 768 and 390 pixels", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await switchProfile(page, "Alex Morgan");
    await page
      .getByRole("button", { name: "Dismiss message", exact: true })
      .click();
    for (const name of ["My Health", "Crew", "Countermeasures"]) {
      await navigate(page, name);
      await noOverflow(page);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `docs/validation/redesign/${name.toLowerCase().replaceAll(" ", "-")}-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto("./");
    await noOverflow(page);
    await page.screenshot({
      path: `docs/validation/redesign/welcome-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Enter Mission System" }).click();
    await noOverflow(page);
    await page.getByRole("button", { name: /Enter as Maya Chen/ }).click();
    // On subsequent iterations Maya has been briefed; the first captures the full briefing.
    if (
      await page.getByRole("button", { name: "Open Workspace" }).isVisible()
    ) {
      await noOverflow(page);
      await page.screenshot({
        path: `docs/validation/redesign/briefing-${width}.png`,
        fullPage: true,
      });
      await page.getByLabel(/Skip this briefing next time/).uncheck();
      await page.getByRole("button", { name: "Open Workspace" }).click();
    }
  }
});
test("offline cache, findings, evidence, assessment and manual records", async ({
  page,
  context,
}) => {
  await expect(
    page.getByText("Offline cache ready", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Personal Health Overview" }),
  ).toBeVisible();
  await configure(page, "environment");
  await page.getByRole("button", { name: "Open health card" }).click();
  await expect(page.getByRole("dialog")).toContainText("+1.1 mmHg");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Carbon Dioxide/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("NASA standard");
  await page.keyboard.press("Escape");
  await navigate(page, "Countermeasures");
  await page.getByRole("link", { name: "Cognitive", exact: true }).click();
  await page.getByRole("button", { name: "Start practice" }).click();
  const target = page.getByRole("button", { name: "Respond now", exact: true });
  await expect(target).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(160);
  await target.press("Space");
  await expect(
    page.getByText("Practice response:", { exact: false }),
  ).toBeVisible();
  await navigate(page, "My Health");
  await page.getByRole("button", { name: "Log reading", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Indicator", { exact: true })
    .selectOption("sleep");
  await page.getByLabel("Value (h)").fill("6.9");
  await page.getByRole("button", { name: "Save reading", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Sleep.*6.9 h/ }),
  ).toBeVisible();
  await page.goto("./#/crew");
  await expect(
    page.getByRole("heading", { name: "Crew Health & Operations" }),
  ).toBeVisible();
});
test("accessibility across entry, workspaces, profile menu and dialogs", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const audit = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  };
  for (const name of ["My Health", "Crew", "Countermeasures"]) {
    await navigate(page, name);
    await audit();
  }
  await page.getByRole("button", { name: /^Profile:/ }).click();
  await audit();
  await page.keyboard.press("Escape");
  await navigate(page, "My Health");
  await page.getByRole("button", { name: "Log reading", exact: true }).click();
  await audit();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open health card" }).click();
  await audit();
  await page.keyboard.press("Escape");
  await settings(page);
  await audit();
  await page.keyboard.press("Escape");
  await page.goto("./");
  await audit();
  await page.getByRole("button", { name: "Enter Mission System" }).click();
  await audit();
  await page.getByRole("button", { name: /Enter as Maya Chen/ }).click();
  await audit();
  await page.setViewportSize({ width: 390, height: 844 });
  await audit();
});
test("welcome, all profiles, remembered briefing, sign out and direct links", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Astronaut Health Monitoring System" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter Mission System" }).click();
  for (const name of ["Alex Morgan", "Maya Chen", "Leo Okafor", "Samira Noor"])
    await expect(
      page.getByRole("button", { name: new RegExp(`Enter as ${name}`) }),
    ).toBeVisible();
  await page.getByRole("button", { name: /Enter as Samira Noor/ }).click();
  await expect(page.getByRole("main")).toContainText(
    "Selected profile: Samira Noor",
  );
  await page.getByRole("button", { name: "Open Workspace" }).click();
  await expect(page.getByRole("main")).toContainText(
    "Samira Noor · Crew medical officer",
  );
  await page.getByRole("button", { name: /^Profile:/ }).click();
  await page
    .getByRole("button", { name: "Crew profile selection", exact: true })
    .click();
  await page.getByRole("button", { name: /Enter as Samira Noor/ }).click();
  await expect(
    page.getByRole("heading", { name: "Personal Health Overview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Profile:/ }).click();
  await page.getByRole("button", { name: "Sign out of demo" }).click();
  await expect(page.getByRole("button", { name: /Continue as/ })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Quick Demo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Personal Health Overview" }),
  ).toBeVisible();
  await page.goto("./#/countermeasures/progress");
  await expect(
    page.getByRole("heading", { name: "Your record" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Personal Health Overview" }),
  ).toBeVisible();
});
test("crew detail respects sharing and does not switch identity", async ({
  page,
}) => {
  await navigate(page, "Crew");
  await page
    .getByRole("button", { name: "Review Leo Okafor", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Limited sharing");
  await expect(dialog).not.toContainText("ms");
  await expect(dialog).not.toContainText("bpm");
  await expect(
    dialog.getByRole("button", { name: "Record my check-in" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Profile: Alex Morgan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review Leo Okafor" }),
  ).toBeFocused();
});
test("legacy saved state survives onboarding and persists records", async ({
  page,
}) => {
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("astramed-state-v1")!);
    delete state.session;
    delete state.checkinRequests;
    state.astronautId = "maya";
    state.checkins["fatigue-maya-94"] = "2026-11-14T12:10:00Z";
    state.notifications = state.notifications.map((n: object) => ({
      ...n,
      acknowledged: true,
    }));
    localStorage.setItem("astramed-state-v1", JSON.stringify(state));
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Quick Demo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Profile: Maya Chen" }),
  ).toBeVisible();
  await navigate(page, "Crew");
  await expect(
    page.getByRole("row", { name: /Maya Chen.*Complete for today/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Acknowledged", exact: true }),
  ).toBeDisabled();
});
test("speech controls call browser synthesis and export saved records", async ({
  page,
}) => {
  await page.evaluate(() => {
    const calls: string[] = [];
    Object.assign(window, { speechCalls: calls });
    speechSynthesis.speak = (u) => {
      calls.push(u.text);
    };
    speechSynthesis.cancel = () => {
      calls.push("cancel");
    };
  });
  const dialog = await settings(page);
  await dialog.getByRole("button", { name: "Off", exact: true }).click();
  await dialog.getByRole("button", { name: "Replay top finding" }).click();
  const calls = await page.evaluate(
    () => (window as unknown as { speechCalls: string[] }).speechCalls,
  );
  expect(
    calls.some((text) =>
      text.includes("Slower reaction-time responses observed"),
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Stop speaking" }).click();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "astramed-demo-records.json",
  );
});
