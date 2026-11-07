import { describe, expect, it } from "vitest";
import { validateResultImport } from "@/lib/resultImport";

describe("validateResultImport", () => {
  it("accepts a valid row and maps subject marks", () => {
    const result = validateResultImport([
      {
        "Register Number": "R-001",
        "Secret Code": "code-1",
        "Student Name": "Amina",
        Class: "8A",
        Mathematics: 82,
        English: "76",
        Total: 158,
      },
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].subjects).toEqual([
      { name: "Mathematics", marks: 82 },
      { name: "English", marks: 76 },
    ]);
    expect(result.rows[0].published).toBeUndefined();
  });

  it("rejects rows missing secret codes and duplicated register numbers", () => {
    const result = validateResultImport(
      [
        { register_number: "R-001", secret_code: "secret", student_name: "Amina", Math: 80 },
        { register_number: "R-002", secret_code: "", student_name: "Bilal", Math: 70 },
        { register_number: "R-003", secret_code: "secret", student_name: "Sara", Math: 60 },
      ],
      ["R-003"],
    );

    expect(result.rows.map((row) => row.register_number)).toEqual(["R-001"]);
    expect(result.issues).toHaveLength(2);
  });

  it("rejects nonnumeric subject marks instead of silently converting them to zero", () => {
    const result = validateResultImport([
      { register_number: "R-001", secret_code: "secret", student_name: "Amina", Math: "absent" },
    ]);

    expect(result.rows).toHaveLength(0);
    expect(result.issues[0].message).toContain("Math");
  });
});