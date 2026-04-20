import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { ensureDir, readJsonFile, writeJsonFile } from "../utils/fileStore.js";

const usageFilePath = path.join(env.dataDir, "places-usage.json");
const lockFilePath = `${usageFilePath}.lock`;
const defaultState = {
  monthKey: "",
  monthCalls: 0,
  dayKey: "",
  dayCalls: 0,
  lastUpdatedAt: null
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getKeys(now = new Date()) {
  const iso = now.toISOString();
  return {
    dayKey: iso.slice(0, 10),
    monthKey: iso.slice(0, 7)
  };
}

function normalizeState(state, now = new Date()) {
  const normalized = { ...defaultState, ...(state || {}) };
  const { dayKey, monthKey } = getKeys(now);

  if (normalized.monthKey !== monthKey) {
    normalized.monthKey = monthKey;
    normalized.monthCalls = 0;
  }

  if (normalized.dayKey !== dayKey) {
    normalized.dayKey = dayKey;
    normalized.dayCalls = 0;
  }

  return normalized;
}

async function acquireLock(timeoutMs = 3000) {
  const startedAt = Date.now();
  await ensureDir(path.dirname(lockFilePath));

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const handle = await fs.open(lockFilePath, "wx");
      return handle;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      await sleep(80);
    }
  }

  throw new Error("Unable to acquire places usage lock.");
}

async function withUsageLock(callback) {
  const lockHandle = await acquireLock();

  try {
    const currentState = normalizeState(await readJsonFile(usageFilePath, defaultState));
    const result = await callback(currentState);
    const nextState = normalizeState(result?.state || currentState);
    await writeJsonFile(usageFilePath, nextState);
    return {
      ...result,
      state: nextState
    };
  } finally {
    await lockHandle.close().catch(() => {});
    await fs.unlink(lockFilePath).catch(() => {});
  }
}

export function getPlacesUsageFilePath() {
  return usageFilePath;
}

export async function reserveGooglePlacesCall() {
  const now = new Date();

  return withUsageLock(async (currentState) => {
    const state = normalizeState(currentState, now);

    if (state.dayCalls >= env.googlePlacesDailyCallLimit) {
      return {
        state: {
          ...state,
          lastUpdatedAt: now.toISOString()
        },
        reservationRejected: true,
        rejectionReason: "daily-limit-reached"
      };
    }

    if (state.monthCalls >= env.googlePlacesMonthlyCallLimit) {
      return {
        state: {
          ...state,
          lastUpdatedAt: now.toISOString()
        },
        reservationRejected: true,
        rejectionReason: "monthly-limit-reached"
      };
    }

    return {
      state: {
        ...state,
        dayCalls: state.dayCalls + 1,
        monthCalls: state.monthCalls + 1,
        lastUpdatedAt: now.toISOString()
      },
      reservationRejected: false,
      rejectionReason: null
    };
  });
}

export async function getPlacesUsageSnapshot() {
  return normalizeState(await readJsonFile(usageFilePath, defaultState));
}
