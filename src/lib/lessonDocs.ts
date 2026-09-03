/**
 * Lesson documents are hosted outside the app (Google Drive, OneDrive, Dropbox...).
 * We only store the shared link and derive a read-only embed URL from it.
 */
export type DocProvider = 'google' | 'onedrive' | 'dropbox' | 'direct' | 'other';

export interface LessonDoc {
  provider: DocProvider;
  embedUrl: string | null;
  /** Normalised raw URL (direct file link when we could build one). */
  rawUrl: string;
}

const officeViewer = (url: string) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveLessonDoc(input: string | null | undefined): LessonDoc | null {
  if (!input) return null;
  const url = input.trim();
  if (!isValidHttpUrl(url)) return null;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  const path = u.pathname;

  // Google Docs / Slides / Sheets
  if (host === 'docs.google.com') {
    const embed = url.replace(/\/(edit|view|preview)(\?[^#]*)?(#.*)?$/, '/preview');
    return { provider: 'google', embedUrl: embed.includes('/preview') ? embed : `${url.replace(/\/$/, '')}/preview`, rawUrl: url };
  }

  // Google Drive file link -> /preview
  if (host === 'drive.google.com') {
    const idMatch = path.match(/\/file\/d\/([^/]+)/) || [null, u.searchParams.get('id')];
    const id = idMatch[1];
    if (id) return { provider: 'google', embedUrl: `https://drive.google.com/file/d/${id}/preview`, rawUrl: url };
    return { provider: 'google', embedUrl: null, rawUrl: url };
  }

  // OneDrive / SharePoint
  if (host.endsWith('sharepoint.com') || host === '1drv.ms' || host === 'onedrive.live.com') {
    const embed = url.includes('action=embedview')
      ? url
      : `${url}${url.includes('?') ? '&' : '?'}action=embedview`;
    return { provider: 'onedrive', embedUrl: embed, rawUrl: url };
  }

  // Dropbox: force the direct-file form, then render through the Office viewer.
  if (host.endsWith('dropbox.com')) {
    const direct = url.replace(/[?&]dl=0/, '').replace(/[?&]raw=1/, '');
    const raw = `${direct}${direct.includes('?') ? '&' : '?'}raw=1`;
    return { provider: 'dropbox', embedUrl: officeViewer(raw), rawUrl: raw };
  }

  // Direct Office file link
  if (/\.(docx?|pptx?|xlsx?)$/i.test(path)) {
    return { provider: 'direct', embedUrl: officeViewer(url), rawUrl: url };
  }

  // PDFs and anything else that a browser can render inline
  if (/\.pdf$/i.test(path)) {
    return { provider: 'direct', embedUrl: `${url}#toolbar=0&navpanes=0`, rawUrl: url };
  }

  return { provider: 'other', embedUrl: officeViewer(url), rawUrl: url };
}

export const providerLabel = (provider: DocProvider, fr: boolean) => {
  switch (provider) {
    case 'google':
      return 'Google Drive';
    case 'onedrive':
      return 'OneDrive';
    case 'dropbox':
      return 'Dropbox';
    case 'direct':
      return fr ? 'Lien direct' : 'Direct link';
    default:
      return fr ? 'Autre source' : 'Other source';
  }
};
