export interface ImportedResultRow {
  register_number: string;
  secret_code: string;
  student_name: string;
  class: string | null;
  subjects: Array<{ name: string; marks: number }>;
  total: number | null;
  grade: string | null;
  rank: string | null;
  sourceRow: number;
}

export interface ResultImportIssue {
  row: number | null;
  message: string;
}

export interface ResultImportValidation {
  rows: ImportedResultRow[];
  issues: ResultImportIssue[];
}

const FIELD_ALIASES = {
  register_number: ["register_number", "register_no", "reg_no", "reg_number", "registration_number"],
  secret_code: ["secret_code", "access_code"],
  student_name: ["student_name", "name"],
  class: ["class", "category", "standard"],
  total: ["total", "total_marks"],
  grade: ["grade"],
  rank: ["rank"],
} as const;

const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const getFieldValue = (
  row: Record<string, unknown>,
  headers: Map<string, string>,
  aliases: readonly string[],
) => {
  for (const alias of aliases) {
    const originalHeader = headers.get(alias);
    if (originalHeader !== undefined) return row[originalHeader];
  }
  return undefined;
};

const textValue = (value: unknown) => String(value ?? "").trim();

const optionalNumber = (value: unknown): number | null | undefined => {
  if (value === null || value === undefined || textValue(value) === "") return null;
  const number = typeof value === "number" ? value : Number(textValue(value));
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

export function validateResultImport(
  inputRows: Record<string, unknown>[],
  existingRegisterNumbers: string[] = [],
): ResultImportValidation {
  if (inputRows.length === 0) {
    return { rows: [], issues: [{ row: null, message: "The selected sheet has no student rows." }] };
  }

  const originalHeaders = Object.keys(inputRows[0]);
  const headers = new Map(originalHeaders.map((header) => [normalizeHeader(header), header]));
  const requiredFields = ["register_number", "secret_code", "student_name"] as const;
  const missingFields = requiredFields.filter(
    (field) => !FIELD_ALIASES[field].some((alias) => headers.has(alias)),
  );

  if (missingFields.length > 0) {
    return {
      rows: [],
      issues: [{ row: null, message: `Missing required columns: ${missingFields.join(", ")}.` }],
    };
  }

  const reservedHeaders = new Set(Object.values(FIELD_ALIASES).flat());
  const subjectHeaders = originalHeaders.filter((header) => {
    const normalized = normalizeHeader(header);
    return normalized.length > 0 && !reservedHeaders.has(normalized);
  });
  const seenRegisters = new Set(existingRegisterNumbers.map((value) => value.trim().toLowerCase()));
  const rows: ImportedResultRow[] = [];
  const issues: ResultImportIssue[] = [];

  inputRows.forEach((inputRow, index) => {
    const sourceRow = index + 2;
    const registerNumber = textValue(getFieldValue(inputRow, headers, FIELD_ALIASES.register_number));
    const secretCode = textValue(getFieldValue(inputRow, headers, FIELD_ALIASES.secret_code));
    const studentName = textValue(getFieldValue(inputRow, headers, FIELD_ALIASES.student_name));

    if (!registerNumber || !secretCode || !studentName) {
      issues.push({ row: sourceRow, message: "Register number, secret code, and student name are required." });
      return;
    }

    const normalizedRegister = registerNumber.toLowerCase();
    if (seenRegisters.has(normalizedRegister)) {
      issues.push({ row: sourceRow, message: `Register number ${registerNumber} is duplicated.` });
      return;
    }

    const subjects: ImportedResultRow["subjects"] = [];
    for (const header of subjectHeaders) {
      const value = inputRow[header];
      if (value === null || value === undefined || textValue(value) === "") continue;
      const marks = optionalNumber(value);
      if (marks === undefined) {
        issues.push({ row: sourceRow, message: `Marks for ${header} must be a non-negative number.` });
        return;
      }
      subjects.push({ name: header.trim(), marks });
    }

    const totalValue = optionalNumber(getFieldValue(inputRow, headers, FIELD_ALIASES.total));
    if (totalValue === undefined) {
      issues.push({ row: sourceRow, message: "Total marks must be a non-negative number." });
      return;
    }

    seenRegisters.add(normalizedRegister);
    rows.push({
      register_number: registerNumber,
      secret_code: secretCode,
      student_name: studentName,
      class: textValue(getFieldValue(inputRow, headers, FIELD_ALIASES.class)) || null,
      subjects,
      total: totalValue,
      grade: textValue(getFieldValue(inputRow, headers, FIELD_ALIASES.grade)) || null,
      rank: textValue(getFieldValue(inputRow, headers, FIELD_ALIASES.rank)) || null,
      sourceRow,
    });
  });

  return { rows, issues };
}