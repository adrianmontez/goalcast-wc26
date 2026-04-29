const XLSX = require("xlsx");
const fs = require("fs");

const workbook = XLSX.readFile("annexe_c_eight_best_third_placed_teams.xlsx");

const firstSheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[firstSheetName];

const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", range: 4 });

const mapping = {};

rows.forEach((row) => {
  const option = row.Option;
  if (!option) return;

  const slots = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];

  const qualifiedGroups = slots
    .map((slot) => String(row[slot]).replace("3", "").trim())
    .sort()
    .join("");

  mapping[qualifiedGroups] = {
    M74: row["1E"],
    M77: row["1I"],
    M79: row["1A"],
    M80: row["1L"],
    M81: row["1D"],
    M82: row["1G"],
    M85: row["1B"],
    M87: row["1K"],
  };
});

const output = `export const thirdPlaceMapping = ${JSON.stringify(mapping, null, 2)};
`;

fs.writeFileSync("src/data/thirdPlaceMapping.js", output);

console.log("Created src/data/thirdPlaceMapping.js");
console.log(`Combinations: ${Object.keys(mapping).length}`);