// Distance lookup utility for calculating distances between cities
// Based on Distances.csv file

const DISTANCES_CSV = `Austin,Cedar Park,Georgetown,Hutto,Kyle,Leander,Manor,Pflugerville,Round Rock,San Marcos
Austin,1,21,28,28,22,27,15,17,19,32
Cedar Park,21,1,22,24,41,6,24,15,15,51
Georgetown,28,22,1,10,44,20,27,16,10,57
Hutto,28,24,10,1,46,20,25,10,9,64
Kyle,22,41,44,46,1,48,28,38,40,21
Leander,27,6,20,20,48,1,38,22,18,58
Manor,15,24,27,25,28,38,1,10,18,40
Pflugerville,17,15,16,10,38,22,10,1,7,48
Round Rock,19,15,10,9,40,18,18,7,1,55
San Marcos,32,51,57,64,21,58,40,48,55,1`;

// Parse CSV and create distance lookup map
const parseDistances = (): Map<string, Map<string, number>> => {
  const lines = DISTANCES_CSV.trim().split('\n');
  const cities: string[] = [];
  const distanceMap = new Map<string, Map<string, number>>();

  // Parse header row to get city names
  const headerLine = lines[0];
  const headerCities = headerLine.split(',').map(city => normalizeCityName(city));
  cities.push(...headerCities);

  // Parse each data row
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const sourceCity = normalizeCityName(row[0]);
    const cityDistances = new Map<string, number>();

    // Create map of distances from source city to all other cities
    for (let j = 1; j < row.length; j++) {
      const targetCity = cities[j - 1]; // j-1 because header is at index 0
      const distance = parseInt(row[j], 10);
      cityDistances.set(targetCity, distance);
    }

    distanceMap.set(sourceCity, cityDistances);
  }

  return distanceMap;
};

// Normalize city name for lookup (case-insensitive, trim whitespace)
const normalizeCityName = (city: string): string => {
  return city.trim().toLowerCase();
};

// Initialize distance map
const distanceMap = parseDistances();

/**
 * Get distance in miles between two cities
 * @param city1 First city name
 * @param city2 Second city name
 * @returns Distance in miles, or null if either city is not found
 */
export const getDistance = (city1: string | null | undefined, city2: string | null | undefined): number | null => {
  // Handle null/undefined cases
  if (!city1 || !city2) {
    return null;
  }

  const normalizedCity1 = normalizeCityName(city1);
  const normalizedCity2 = normalizeCityName(city2);

  // Same city = 1 mile
  if (normalizedCity1 === normalizedCity2) {
    return 1;
  }

  // Try to get distance from city1 to city2
  const city1Distances = distanceMap.get(normalizedCity1);
  if (city1Distances) {
    const distance = city1Distances.get(normalizedCity2);
    if (distance !== undefined) {
      return distance;
    }
  }

  // Try reverse lookup (distance matrix is symmetric)
  const city2Distances = distanceMap.get(normalizedCity2);
  if (city2Distances) {
    const distance = city2Distances.get(normalizedCity1);
    if (distance !== undefined) {
      return distance;
    }
  }

  // City not found in CSV
  return null;
};

/**
 * Check if a city exists in the distance matrix
 * @param city City name to check
 * @returns True if city exists in the distance matrix
 */
export const cityExists = (city: string | null | undefined): boolean => {
  if (!city) return false;
  return distanceMap.has(normalizeCityName(city));
};


