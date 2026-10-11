/** Minimal CSV parser: handles quoted fields, escaped quotes and CRLF. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQ = false;
  const pushVal = () => {
    cur.push(val);
    val = "";
  };
  const pushRow = () => {
    if (cur.length > 0 || val !== "") {
      pushVal();
      rows.push(cur);
      cur = [];
    }
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          val += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        val += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      pushVal();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      continue;
    } else {
      val += ch;
    }
  }
  pushRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
