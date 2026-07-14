export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

export function parseCsvText(text: string): Array<Record<string, string>> {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0] ?? "");

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

export function requiredColumnsMissing(
  rows: Array<Record<string, string>>,
  requiredColumns: string[],
): string[] {
  const firstRow = rows[0];

  if (!firstRow) {
    return requiredColumns;
  }

  return requiredColumns.filter(
    (column) => !Object.prototype.hasOwnProperty.call(firstRow, column),
  );
}

export function toFiniteNumber(value: string): number | null {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function isValidTimestamp(value: string): boolean {
  return value.trim().length > 0 && !Number.isNaN(new Date(value).getTime());
}
