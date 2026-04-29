const XLSX = require("xlsx");
const fs = require("fs");

const workbook = XLSX.readFile("WC2026 Data.xlsx", { cellDates: true });

const teamsSheet = workbook.Sheets["Teams"];
const scheduleSheet = workbook.Sheets["Schedule"];

const teamRows = XLSX.utils.sheet_to_json(teamsSheet, { defval: "" });
const scheduleRows = XLSX.utils.sheet_to_json(scheduleSheet, { defval: "" });

function fixAbbr(abbr) {
  if (abbr === "BOS") return "BIH";
  if (abbr === "MOR") return "MAR";
  if (abbr === "CPT") return "CPV";
  return abbr;
}

function formatDate(value) {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  return value;
}

const groups = teamRows.map((row) => {
  const groupLetter = row.Groups.replace("Group ", "");

  return {
    group: groupLetter,
    teams: [
      { name: row["Team 1"], abbr: fixAbbr(row["Team 1 Abbr."]) },
      { name: row["Team 2"], abbr: fixAbbr(row["Team 2 Abbr."]) },
      { name: row["Team 3"], abbr: fixAbbr(row["Team 3 Abbr."]) },
      { name: row["Team 4"], abbr: fixAbbr(row["Team 4 Abbr."]) },
    ],
  };
});

const teams = groups.flatMap((group) =>
  group.teams.map((team) => ({
    ...team,
    group: group.group,
  }))
);

const teamsByAbbr = Object.fromEntries(
  teams.map((team) => [team.abbr, team])
);

const matches = scheduleRows.map((row, index) => {
  const home = fixAbbr(row["Team 1"]);
  const away = fixAbbr(row["Team 2"]);

  return {
    id: index + 1,
    date: formatDate(row.Date),
    time: row.Time,
    group: row.Group,
    stadium: row.Stadium,
    home,
    away,
    homeName: teamsByAbbr[home]?.name || home,
    awayName: teamsByAbbr[away]?.name || away,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  };
});

const output = `export const groups = ${JSON.stringify(groups, null, 2)};

export const teams = ${JSON.stringify(teams, null, 2)};

export const teamsByAbbr = ${JSON.stringify(teamsByAbbr, null, 2)};

export const matches = ${JSON.stringify(matches, null, 2)};
`;

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/wc2026Data.js", output);

console.log("Created src/data/wc2026Data.js");
console.log(`Groups: ${groups.length}`);
console.log(`Teams: ${teams.length}`);
console.log(`Matches: ${matches.length}`);