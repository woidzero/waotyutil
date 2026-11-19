export function formatDate(raw: string | null): string {
  if (!raw) return "";

  const cleaned = String(raw)
    .replace(/\s*\d{2}:\d{2}:\d{2}.*$/i, "")
    .trim();
  const match = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const months: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const day = match[1].padStart(2, "0");
    const monthKey = match[2].toLowerCase().substring(0, 3);
    const month = months[monthKey];
    const year = match[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  if (cleaned.includes("T")) {
    return cleaned.split("T")[0];
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}
