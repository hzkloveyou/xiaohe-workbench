import { z } from "zod";
import { THEME_IDS, type WorkspaceSnapshot } from "./entities";

const idSchema = z.string().trim().min(1).max(128);
const timestampSchema = z.number().int().nonnegative();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const baseEntitySchema = z.object({
  id: idSchema,
  updatedAt: timestampSchema,
  deletedAt: timestampSchema.optional()
});

export const syncEntitySchema = z.discriminatedUnion("type", [
  baseEntitySchema.extend({
    type: z.literal("bookmark"),
    data: z.object({
      title: z.string().trim().min(1).max(80),
      url: z.url().max(2048),
      groupId: idSchema,
      order: z.number().finite(),
      icon: z.string().max(16).optional(),
      tags: z.array(z.string().trim().min(1).max(24)).max(20).optional(),
      favorite: z.boolean().optional(),
      visitCount: z.number().int().nonnegative().optional(),
      lastVisitedAt: timestampSchema.optional()
    })
  }),
  baseEntitySchema.extend({
    type: z.literal("bookmarkGroup"),
    data: z.object({
      title: z.string().trim().min(1).max(40),
      order: z.number().finite()
    })
  }),
  baseEntitySchema.extend({
    type: z.literal("task"),
    data: z.union([
      z.object({
        title: z.string().trim().min(1).max(300),
        completed: z.boolean(),
        order: z.number().finite(),
        scheduledFor: dateSchema.optional(),
        dueAt: dateSchema.optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        note: z.string().max(2_000).optional(),
        recurrence: z.enum(["daily", "weekly", "monthly"]).optional(),
        seriesId: idSchema.optional(),
        completedAt: timestampSchema.optional()
      }),
      z.object({
        text: z.string().trim().min(1).max(300),
        completed: z.boolean(),
        order: z.number().finite(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      })
    ])
  }),
  baseEntitySchema.extend({
    type: z.literal("note"),
    data: z.union([
      z.object({ content: z.string().max(20_000) }),
      z.object({ text: z.string().max(20_000) })
    ])
  }),
  baseEntitySchema.extend({
    type: z.literal("timer"),
    data: z.union([
      z.object({
        durationMs: z.number().int().positive().max(24 * 60 * 60 * 1000),
        remainingMs: z.number().int().nonnegative(),
        running: z.boolean(),
        startedAt: timestampSchema.optional(),
        completedAt: timestampSchema.optional(),
        updatedAt: timestampSchema.optional()
      }),
      z.object({
        durationMs: z.number().int().positive().max(24 * 60 * 60 * 1000),
        remainingMs: z.number().int().nonnegative(),
        runningSince: timestampSchema.nullable()
      })
    ])
  }),
  baseEntitySchema.extend({
    type: z.literal("inboxItem"),
    data: z.object({
      kind: z.enum(["link", "note", "task"]),
      raw: z.string().trim().min(1).max(20_000),
      status: z.enum(["pending", "archived"]),
      createdAt: timestampSchema,
      title: z.string().trim().min(1).max(300).optional(),
      url: z.url().max(2048).optional(),
      scheduledFor: dateSchema.optional()
    })
  }),
  baseEntitySchema.extend({
    type: z.literal("focusSession"),
    data: z.object({
      plannedMs: z.number().int().positive().max(24 * 60 * 60 * 1000),
      actualMs: z.number().int().nonnegative().max(24 * 60 * 60 * 1000),
      startedAt: timestampSchema,
      endedAt: timestampSchema,
      completed: z.boolean(),
      taskId: idSchema.optional()
    })
  }),
  baseEntitySchema.extend({
    type: z.literal("preference"),
    data: z.record(z.string(), z.unknown())
  })
]);

export const workspaceSnapshotSchema = z.object({
  version: z.literal(1),
  theme: z.enum(THEME_IDS),
  entities: z.array(syncEntitySchema).max(10_000)
});

export function parseWorkspaceSnapshot(value: unknown): WorkspaceSnapshot {
  return workspaceSnapshotSchema.parse(value) as WorkspaceSnapshot;
}
