import { describe, it, expect } from "vitest";
import {
  seedWorkspace,
  applyDemoAction,
  askDemo,
  capsuleSchema,
} from "../src/lib/workspace";
describe("explicit demo capsule workflow", () => {
  it("does not expose pending knowledge through a published snapshot", () => {
    const w = seedWorkspace();
    w.knowledge.find((k) => k.id === "k4")!.text =
      "Zirconium unicorns are the secret code.";
    const { answer } = askDemo(
      w,
      "field-notes",
      "What is the zirconium unicorns secret code?",
      "learning",
    );
    expect(answer.abstained).toBe(true);
    expect(answer.citations).toHaveLength(0);
  });
  it("preserves a published version after editing a current insight", () => {
    const initial = seedWorkspace();
    const before = structuredClone(initial.capsules[0].versions[0]);
    const edited = applyDemoAction(initial, {
      type: "edit",
      capsuleId: "field-notes",
      id: "k1",
      data: { text: "A revised expert-approved diagnostic approach." },
    });
    expect(edited.capsules[0].versions[0]).toEqual(before);
    expect(edited.knowledge.find((k) => k.id === "k1")!.status).toBe("PENDING");
  });
  it("requires passing evaluations before publishing", () => {
    expect(() =>
      applyDemoAction(seedWorkspace(), {
        type: "publish",
        capsuleId: "field-notes",
      }),
    ).toThrow("passing evaluation");
  });
  it("invalidates evaluation when the expert changes reviewed knowledge", () => {
    let w = applyDemoAction(seedWorkspace(), {
      type: "evaluate",
      capsuleId: "field-notes",
    });
    expect(w.evaluations).toHaveLength(1);
    w = applyDemoAction(w, {
      type: "approve",
      capsuleId: "field-notes",
      id: "k4",
    });
    expect(w.evaluations).toHaveLength(0);
  });
  it("grounds supported answers and records one unit", () => {
    const { workspace, answer } = askDemo(
      seedWorkspace(),
      "field-notes",
      "How do I troubleshoot a recurring fault?",
      "learning",
    );
    expect(answer.abstained).toBe(false);
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.citations.every((c) => c.source && c.contributor)).toBe(true);
    expect(workspace.usage).toHaveLength(1);
    expect(workspace.licenses[0].used).toBe(1);
  });
  it.each(["revoked", "expired", "limit", "purpose", "recipient"])(
    "blocks a license with %s access",
    (reason) => {
      const w = seedWorkspace();
      if (reason === "revoked") w.licenses[0].status = "REVOKED";
      if (reason === "expired")
        w.licenses[0].expiresAt = "2000-01-01T00:00:00.000Z";
      if (reason === "limit") w.licenses[0].used = 100;
      if (reason === "recipient")
        w.licenses[0].grantee = "someone-else@example.test";
      expect(() =>
        askDemo(
          w,
          "field-notes",
          "recurring fault",
          reason === "purpose" ? "training" : "learning",
        ),
      ).toThrow("active license");
      expect(w.usage).toHaveLength(0);
    },
  );
  it("starts new licenses with AI training permission disabled", () => {
    const w = applyDemoAction(seedWorkspace(), {
      type: "grant",
      capsuleId: "field-notes",
      data: {
        grantee: "new@example.test",
        usageLimit: 10,
        days: 30,
        purposes: "learning",
      },
    });
    expect(w.licenses[0].aiTrainingAllowed).toBe(false);
  });
  it("validates a meaningful capsule scope", () => {
    expect(
      capsuleSchema.safeParse({
        title: "Field notes",
        domain: "Engineering",
        scope: "Short",
        visibility: "PRIVATE",
      }).success,
    ).toBe(false);
  });
});
