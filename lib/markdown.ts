import { MeetingSummary } from "@/lib/types";

export function buildMeetingMarkdown(summary: MeetingSummary) {
  const highlights = summary.highlights.map((item) => `- ${item}`).join("\n");

  return [
    `# ${summary.title}`,
    "",
    `- Fecha: ${new Date(summary.createdAt).toLocaleString("es-CO")}`,
    `- Participantes: ${summary.participants.join(", ")}`,
    "",
    "## Puntos clave",
    highlights,
    "",
    "## Registro",
    summary.markdown,
  ].join("\n");
}
