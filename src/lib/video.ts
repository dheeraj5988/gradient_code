export type PlayerSource = { kind: "iframe" | "file"; src: string } | null;

/** Normalises common hosting links (Google Drive, YouTube, Vimeo) into an embeddable source. */
export function toPlayerSource(url: string | null | undefined): PlayerSource {
  if (!url) return null;
  const raw = url.trim();

  const drive = raw.match(/drive\.google\.com\/file\/d\/([-\w]+)/);
  if (drive) return { kind: "iframe", src: `https://drive.google.com/file/d/${drive[1]}/preview` };

  const driveOpen = raw.match(/drive\.google\.com\/open\?id=([-\w]+)/);
  if (driveOpen)
    return { kind: "iframe", src: `https://drive.google.com/file/d/${driveOpen[1]}/preview` };

  const yt = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([-\w]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}?rel=0` };

  const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };

  if (/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(raw)) return { kind: "file", src: raw };

  return { kind: "iframe", src: raw };
}
