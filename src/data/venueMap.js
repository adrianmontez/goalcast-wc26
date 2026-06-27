export const venues = [
  {
    city: "Toronto",
    stateProvince: "Ontario",
    country: "Canada",
    fifaName: "Toronto Stadium",
    actualName: "BMO Field",
  },
  {
    city: "Vancouver",
    stateProvince: "British Columbia",
    country: "Canada",
    fifaName: "BC Place Vancouver",
    actualName: "BC Place",
  },
  {
    city: "Mexico City",
    stateProvince: "Mexico City",
    country: "Mexico",
    fifaName: "Mexico City Stadium",
    actualName: "Estadio Azteca",
  },
  {
    city: "Guadalajara",
    stateProvince: "Jalisco",
    country: "Mexico",
    fifaName: "Estadio Guadalajara",
    actualName: "Estadio Akron",
  },
  {
    city: "Monterrey",
    stateProvince: "Nuevo Leon",
    country: "Mexico",
    fifaName: "Estadio Monterrey",
    actualName: "Estadio BBVA",
  },
  {
    city: "Atlanta",
    stateProvince: "Georgia",
    country: "United States",
    fifaName: "Atlanta Stadium",
    actualName: "Mercedes-Benz Stadium",
  },
  {
    city: "Boston",
    stateProvince: "Massachusetts",
    country: "United States",
    fifaName: "Boston Stadium",
    actualName: "Gillette Stadium",
  },
  {
    city: "Dallas",
    stateProvince: "Texas",
    country: "United States",
    fifaName: "Dallas Stadium",
    actualName: "AT&T Stadium",
  },
  {
    city: "Houston",
    stateProvince: "Texas",
    country: "United States",
    fifaName: "Houston Stadium",
    actualName: "NRG Stadium",
  },
  {
    city: "Kansas City",
    stateProvince: "Missouri",
    country: "United States",
    fifaName: "Kansas City Stadium",
    actualName: "Arrowhead Stadium",
  },
  {
    city: "Los Angeles",
    stateProvince: "California",
    country: "United States",
    fifaName: "Los Angeles Stadium",
    actualName: "SoFi Stadium",
  },
  {
    city: "Miami",
    stateProvince: "Florida",
    country: "United States",
    fifaName: "Miami Stadium",
    actualName: "Hard Rock Stadium",
  },
  {
    city: "New York/New Jersey",
    stateProvince: "New Jersey",
    country: "United States",
    fifaName: "New York New Jersey Stadium",
    actualName: "MetLife Stadium",
  },
  {
    city: "Philadelphia",
    stateProvince: "Pennsylvania",
    country: "United States",
    fifaName: "Philadelphia Stadium",
    actualName: "Lincoln Financial Field",
  },
  {
    city: "San Francisco",
    stateProvince: "California",
    country: "United States",
    fifaName: "San Francisco Bay Area Stadium",
    actualName: "Levi's Stadium",
  },
  {
    city: "Seattle",
    stateProvince: "Washington",
    country: "United States",
    fifaName: "Seattle Stadium",
    actualName: "Lumen Field",
  },
];

function normalizeVenueName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getVenueInfo(venueName) {
  const normalizedVenueName = normalizeVenueName(venueName);

  if (!normalizedVenueName) return null;

  return (
    venues.find((venue) => {
      return (
        normalizeVenueName(venue.fifaName) === normalizedVenueName ||
        normalizeVenueName(venue.actualName) === normalizedVenueName
      );
    }) || null
  );
}

export function getVenueCity(venueName) {
  return getVenueInfo(venueName)?.city || "City TBD";
}

export function getActualVenueName(venueName) {
  return getVenueInfo(venueName)?.actualName || venueName || "Stadium TBD";
}

export function getFifaVenueName(venueName) {
  return getVenueInfo(venueName)?.fifaName || venueName || "Stadium TBD";
}