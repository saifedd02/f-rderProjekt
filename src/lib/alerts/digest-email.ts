import { FDB_ATTRIBUTION } from "@/config/catalog";
import type { CatalogChange, ChangeKind } from "@/types/catalog";

/**
 * Renders the weekly digest.
 *
 * Written as table-based HTML with inline styles on purpose — Outlook and the
 * Gmail web client strip <style> blocks, flexbox and CSS variables, so anything
 * cleverer would arrive as an unstyled column of text.
 *
 * Every entry states WHY it is in the mail. An alert nobody can check is an
 * alert nobody trusts, and the reasons come straight from the deterministic
 * scoring in `topic-match.ts`.
 */

export interface DigestContent {
  subject: string;
  html: string;
  text: string;
}

const KIND_LABEL: Record<ChangeKind, string> = {
  new: "NEU",
  updated: "GEÄNDERT",
  removed: "ENTFALLEN",
};

const KIND_COLOR: Record<ChangeKind, string> = {
  new: "#0f7b34",
  updated: "#8a5a00",
  removed: "#9b1c1c",
};

export const COLORS = {
  ink: "#111827",
  muted: "#4b5563",
  faint: "#6b7280",
  line: "#e5e7eb",
  card: "#ffffff",
  page: "#f4f5f7",
  link: "#1d4ed8",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** ISO week number — the digest is a weekly artefact, so it is labelled as one. */
export function isoWeek(date: Date): number {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  // Thursday of the current week decides which year/week the date belongs to.
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** The one link a reader should click: the funding body's own page. */
export function primaryLink(change: CatalogChange): string | undefined {
  return change.program.officialUrl ?? change.program.detailUrl;
}

function factLine(change: CatalogChange): string {
  return [
    change.program.fundingBody,
    change.program.regions.join(", "),
    change.program.fundingTypes.join(", "),
  ]
    .filter((part) => part && part.length > 0)
    .join(" · ");
}

function renderEntry(change: CatalogChange): string {
  const { program } = change;
  const link = primaryLink(change);
  const facts = factLine(change);

  const topics = change.matches
    .map(
      (match) =>
        `<span style="display:inline-block;background:#eef2ff;color:#3730a3;border-radius:10px;padding:2px 8px;margin:0 6px 4px 0;font-size:12px;">${escapeHtml(
          match.topicLabel
        )} ${match.score}%</span>`
    )
    .join("");

  const reasons = change.matches[0]?.reasons.slice(0, 2).join(" · ");

  const fields = change.fields.length
    ? `<div style="margin-top:8px;font-size:13px;color:${COLORS.muted};">
         ${change.fields
           .map((field) =>
             field.before === undefined
               ? `<div>• ${escapeHtml(field.field)}: geändert</div>`
               : `<div>• ${escapeHtml(field.field)}: ${escapeHtml(
                   field.before
                 )} → <strong>${escapeHtml(field.after ?? "—")}</strong></div>`
           )
           .join("")}
       </div>`
    : "";

  const deadline = program.deadline
    ? `<div style="margin-top:8px;font-size:13px;color:${COLORS.muted};"><strong>Frist:</strong> ${escapeHtml(
        program.deadline
      )}</div>`
    : "";

  const title = escapeHtml(program.name);
  const heading = link
    ? `<a href="${escapeHtml(link)}" style="color:${COLORS.link};text-decoration:none;">${title}</a>`
    : title;

  const secondLink =
    program.officialUrl && program.detailUrl && program.officialUrl !== program.detailUrl
      ? `<a href="${escapeHtml(program.detailUrl)}" style="color:${COLORS.faint};font-size:12px;text-decoration:underline;">Eintrag in der Förderdatenbank</a>`
      : "";

  return `
  <tr><td style="padding:0 0 14px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:8px;">
      <tr><td style="padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:${KIND_COLOR[change.kind]};">
          ${KIND_LABEL[change.kind]}
        </div>
        <div style="margin-top:4px;font-size:16px;font-weight:600;line-height:1.35;color:${COLORS.ink};">
          ${heading}
        </div>
        ${facts ? `<div style="margin-top:6px;font-size:13px;color:${COLORS.faint};">${escapeHtml(facts)}</div>` : ""}
        ${deadline}
        ${fields}
        <div style="margin-top:10px;">${topics}</div>
        ${reasons ? `<div style="margin-top:4px;font-size:12px;color:${COLORS.faint};">${escapeHtml(reasons)}</div>` : ""}
        ${secondLink ? `<div style="margin-top:10px;">${secondLink}</div>` : ""}
      </td></tr>
    </table>
  </td></tr>`;
}

function renderTextEntry(change: CatalogChange): string {
  const lines = [
    `[${KIND_LABEL[change.kind]}] ${change.program.name}`,
    factLine(change),
    change.program.deadline ? `Frist: ${change.program.deadline}` : "",
    change.matches.map((match) => `${match.topicLabel} ${match.score}%`).join(" | "),
    ...change.fields.map((field) =>
      field.before === undefined
        ? `- ${field.field}: geändert`
        : `- ${field.field}: ${field.before} -> ${field.after ?? "—"}`
    ),
    primaryLink(change) ?? "",
  ];

  return lines.filter((line) => line.length > 0).join("\n");
}

/** Summary line: what this mail is, in one sentence. */
function summarize(changes: CatalogChange[]): string {
  const counts = changes.reduce<Record<ChangeKind, number>>(
    (totals, change) => ({ ...totals, [change.kind]: totals[change.kind] + 1 }),
    { new: 0, updated: 0, removed: 0 }
  );

  const parts = [
    counts.new > 0 ? `${counts.new} neu` : "",
    counts.updated > 0 ? `${counts.updated} geändert` : "",
    counts.removed > 0 ? `${counts.removed} entfallen` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

export interface DigestOptions {
  changes: CatalogChange[];
  /** The Monday the digest is sent. */
  date: Date;
  /** Link back to the finder, so a reader can search from the mail. */
  appUrl?: string;
}

export function renderDigest({ changes, date, appUrl }: DigestOptions): DigestContent {
  const week = isoWeek(date);
  const summary = summarize(changes);
  const subject =
    changes.length === 0
      ? `Förderradar KW ${week}: keine neuen Treffer`
      : `Förderradar KW ${week}: ${summary}`;

  const intro =
    changes.length === 0
      ? "In dieser Woche gab es in den mpool-Themen keine neuen, geänderten oder entfallenen Förderprogramme."
      : `In den mpool-Themen hat sich diese Woche etwas getan: ${summary}. Sortiert nach Passgenauigkeit.`;

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
      <tr><td style="padding-bottom:16px;">
        <div style="font-size:20px;font-weight:700;color:${COLORS.ink};">Förderradar · KW ${week}</div>
        <div style="margin-top:6px;font-size:14px;line-height:1.5;color:${COLORS.muted};">${escapeHtml(intro)}</div>
      </td></tr>
      ${changes.map(renderEntry).join("")}
      <tr><td style="padding-top:8px;border-top:1px solid ${COLORS.line};font-size:12px;line-height:1.6;color:${COLORS.faint};">
        ${appUrl ? `<a href="${escapeHtml(appUrl)}" style="color:${COLORS.link};">Im Förderprogramm-Finder weitersuchen</a><br>` : ""}
        Prozentwerte sind Passgenauigkeit zu den mpool-Themen, serverseitig berechnet — keine Zusage über Antragsberechtigung.
        Fristen und Bedingungen bitte immer auf der offiziellen Programmseite prüfen.<br>
        ${escapeHtml(FDB_ATTRIBUTION)}
      </td></tr>
    </table>
  </td></tr>
</table>`.trim();

  const text = [
    `Förderradar · KW ${week}`,
    "",
    intro,
    "",
    ...changes.map(renderTextEntry),
    "",
    appUrl ? `Weitersuchen: ${appUrl}` : "",
    "Prozentwerte sind Passgenauigkeit zu den mpool-Themen. Fristen bitte auf der offiziellen Programmseite prüfen.",
    FDB_ATTRIBUTION,
  ]
    .filter((line) => line !== undefined)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n");

  return { subject, html, text };
}
