/** Content completeness for a course — used before publishing. Pure & deterministic. */
export type CompletenessInput = {
  title: string;
  description: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  track: string | null;
  level: string | null;
  price: number | null;
  what_you_learn: string[];
  modules: { title: string; lessons: { title: string; is_published: boolean; is_free_preview: boolean; hasMedia: boolean; hasDescription: boolean; type: string }[] }[];
};

export type Check = { key: string; label: string; ok: boolean; required: boolean; detail?: string };

export function courseCompleteness(c: CompletenessInput) {
  const lessons = c.modules.flatMap((m) => m.lessons);
  const published = lessons.filter((l) => l.is_published);
  const videoWithoutMedia = published.filter((l) => l.type === "video" && !l.hasMedia).length;
  const noDesc = published.filter((l) => !l.hasDescription).length;
  const emptyModules = c.modules.filter((m) => !m.lessons.some((l) => l.is_published)).length;
  const checks: Check[] = [
    { key: "title", label: "Title", ok: c.title.trim().length >= 5, required: true },
    { key: "description", label: "Description (80+ characters)", ok: c.description.trim().length >= 80, required: true },
    { key: "category", label: "Category", ok: !!c.track?.trim(), required: true },
    { key: "level", label: "Level", ok: !!c.level, required: true },
    { key: "price", label: "Price configured", ok: c.price != null && c.price >= 0, required: true },
    { key: "curriculum", label: "At least one module with a published lesson", ok: c.modules.length > 0 && published.length > 0, required: true },
    { key: "media", label: "Every published video lesson has a video", ok: videoWithoutMedia === 0, required: true, detail: videoWithoutMedia ? `${videoWithoutMedia} video lesson${videoWithoutMedia > 1 ? "s" : ""} without media` : undefined },
    { key: "subtitle", label: "Short description", ok: !!c.subtitle?.trim(), required: false },
    { key: "thumbnail", label: "Thumbnail image", ok: !!c.thumbnail_url, required: false },
    { key: "outcomes", label: "What you'll learn (3+ points)", ok: c.what_you_learn.length >= 3, required: false },
    { key: "preview", label: "A free preview lesson", ok: published.some((l) => l.is_free_preview), required: false },
    { key: "emptyModules", label: "No empty modules", ok: emptyModules === 0, required: false, detail: emptyModules ? `${emptyModules} module${emptyModules > 1 ? "s" : ""} without published lessons` : undefined },
    { key: "lessonDescriptions", label: "Lesson descriptions", ok: noDesc === 0, required: false, detail: noDesc ? `${noDesc} lesson${noDesc > 1 ? "s" : ""} without a description` : undefined },
  ];
  const percent = Math.round((checks.filter((x) => x.ok).length / checks.length) * 100);
  const blockers = checks.filter((x) => x.required && !x.ok);
  return { checks, percent, blockers, canPublish: blockers.length === 0, stats: { modules: c.modules.length, lessons: lessons.length, published: published.length } };
}
