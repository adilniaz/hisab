export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    let s = String(v ?? "")
    // Neutralize formula injection: a leading =, +, -, @, tab, or CR makes
    // Excel/Sheets treat the cell as a formula to execute on open.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
