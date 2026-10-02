"use client";
/**
 * Shared, in-memory bridge between the lesson player and the notes panel (one current player at a time).
 * `seconds` stamps new notes; `seek` jumps the player for the lesson named by `lessonId`.
 */
export const playerClock = {
  lessonId: null as string | null,
  seconds: null as number | null,
  seek: null as ((seconds: number) => void) | null,
};
