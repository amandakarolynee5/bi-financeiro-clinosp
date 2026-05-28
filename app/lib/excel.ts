import * as XLSX from "xlsx";

export async function lerPlanilha(file: File) {
  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data);

  const sheet =
    workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(sheet);
}