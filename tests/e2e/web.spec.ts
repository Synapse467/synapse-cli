import { test, expect } from "@playwright/test";
test.beforeEach(async ({page})=>{
  page.on('pageerror',error=>console.error('CLIENT ERROR:',error.message));
  page.on('requestfailed',request=>console.error('REQUEST FAILED:',request.url(),request.failure()?.errorText));
});
test("landing explains the product and respects the viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true", {
    timeout: 60000,
  });
  await expect(
    page.getByText("Turn your expertise into AI others can actually use."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Build your first capsule" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/landing-${test.info().project.name}.png`,
    fullPage: false,
  });
  await page.getByRole("link", { name: "Build your first capsule" }).click();
  await expect(page.getByRole("heading", { name: /Make room/ })).toBeVisible();
});
test("expert can capture, approve, evaluate, publish and license a capsule", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Good to see you, Alex." }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/studio-${test.info().project.name}.png`,
    fullPage: false,
  });
  await page.getByRole("button", { name: "New capsule", exact: true }).click();
  await page.getByLabel("Capsule title").fill("Synthetic handover practice");
  await page.getByLabel("Domain", { exact: true }).fill("Team operations");
  await page
    .getByLabel("What should this capsule help people do?")
    .fill(
      "Help new team members use a decision journal during shift handovers.",
    );
  await page
    .getByRole("button", { name: "Create capsule", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Synthetic handover practice" })
    .click();
  await page.getByRole("link", { name: "Sources", exact: true }).click();
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByLabel("Source title").fill("Handover decision journal");
  await page
    .getByLabel("Source text")
    .fill(
      "Keep a decision journal during handovers. Record the reason for each change and who will follow up.",
    );
  await page
    .getByRole("button", { name: "Add source & extract insights" })
    .click();
  await page.getByRole("link", { name: /^Knowledge/ }).click();
  await page
    .getByRole("button", { name: "Approve", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Approve", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Evaluations", exact: true }).click();
  await page.getByRole("button", { name: "Run evaluation" }).click();
  await expect(page.getByText("Publication checks passed")).toBeVisible();
  await page.getByRole("link", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Publish demo version" }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Publish version", exact: true })
    .click();
  await expect(page.getByText("v1.0.0", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("cited answers, unsupported abstention and revocation behave honestly", async ({
  page,
}) => {
  await page.goto("/demo/ask/field-notes");
  await page
    .getByRole("button", {
      name: "How should I troubleshoot a recurring fault?",
    })
    .click();
  await expect(
    page.getByText(/The capsule’s approved knowledge indicates:/),
  ).toBeVisible();
  await page.getByRole("button", { name: /\[1\] Field experience/ }).click();
  await expect(
    page.getByRole("heading", { name: "Follow the source" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("What is the best chocolate cake recipe?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(
    page.getByText(/This capsule does not contain approved knowledge/),
  ).toBeVisible();
  await page.goto("/demo/licenses");
  await page
    .getByRole("button", { name: "Revoke access", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Revoke access", exact: true })
    .click();
  await expect(page.getByText("revoked", { exact: true })).toBeVisible();
  await page.goto("/demo/ask/field-notes");
  await page
    .getByRole("button", {
      name: "How should I troubleshoot a recurring fault?",
    })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "An active license" }),
  ).toBeVisible();
});
