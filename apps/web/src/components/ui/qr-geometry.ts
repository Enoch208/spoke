import { create } from "qrcode";

const quietZone = 4;

export type QrGeometry = { size: number; viewBox: string; path: string };

export const qrGeometry = (text: string): QrGeometry => {
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  const runs: string[] = [];
  for (let row = 0; row < modules.size; row += 1) {
    let column = 0;
    while (column < modules.size) {
      if (!modules.get(row, column)) {
        column += 1;
        continue;
      }
      const start = column;
      while (column < modules.size && modules.get(row, column)) column += 1;
      const width = column - start;
      runs.push(
        `M${String(start + quietZone)} ${String(row + quietZone)}h${String(width)}v1h-${String(width)}z`,
      );
    }
  }
  const outer = modules.size + quietZone * 2;
  return {
    size: modules.size,
    viewBox: `0 0 ${String(outer)} ${String(outer)}`,
    path: runs.join(""),
  };
};
