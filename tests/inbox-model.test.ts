import { describe, expect, it } from "vitest";
import { classifyCapture, createInboxEntity, parseCaptureDate } from "../src/features/inbox/inbox-model";

const now = new Date("2026-07-16T08:00:00+08:00");

describe("inbox model", () => {
  it("classifies links, tasks and notes deterministically", () => {
    expect(classifyCapture("example.com", undefined, now)).toMatchObject({ kind: "link", url: "https://example.com/" });
    expect(classifyCapture("任务 明天交报告", undefined, now)).toMatchObject({
      kind: "task",
      title: "交报告",
      scheduledFor: "2026-07-17"
    });
    expect(classifyCapture("一个灵感", undefined, now)).toMatchObject({ kind: "note", raw: "一个灵感" });
  });

  it("lets an explicit kind override automatic URL classification", () => {
    expect(classifyCapture("example.com", "note", now).kind).toBe("note");
  });

  it("parses today, tomorrow, the day after tomorrow and ISO dates", () => {
    expect(parseCaptureDate("今天复盘", now)).toEqual({ title: "复盘", scheduledFor: "2026-07-16" });
    expect(parseCaptureDate("明天复盘", now)).toEqual({ title: "复盘", scheduledFor: "2026-07-17" });
    expect(parseCaptureDate("后天复盘", now)).toEqual({ title: "复盘", scheduledFor: "2026-07-18" });
    expect(parseCaptureDate("2026-08-01 复盘", now)).toEqual({ title: "复盘", scheduledFor: "2026-08-01" });
  });

  it("creates a stable synced inbox entity and rejects blank input", () => {
    const entity = createInboxEntity("一个灵感", { id: "inbox-1", now });
    expect(entity).toMatchObject({ id: "inbox-1", type: "inboxItem", updatedAt: now.getTime() });
    expect(() => createInboxEntity("   ", { now })).toThrow("请输入要收集的内容");
  });
});
