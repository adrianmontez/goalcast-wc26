const XLSX = require("xlsx");
const fs = require("fs");

const workbook = XLSX.readFile("knockout_seeding.xlsx");
const firstSheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[firstSheetName];

const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

const knockoutSeeding = rows
  .filter((row) => row["Match Number"])
  .map((row) => ({
    matchNumber: row["Match Number"],
    roundType: row["Round Type"],
    teamA: row["Team A"],
    teamB: row["Team B"],
    winner: row["Winner"],
    loser: row["Loser"],
  }));

const output = `export const knockoutSeeding = ${JSON.stringify(
  knockoutSeeding,
  null,
  2
)};
`;

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/knockoutSeeding.js", output);

console.log("Created src/data/knockoutSeeding.js");
console.log(`Knockout matches: ${knockoutSeeding.length}`);