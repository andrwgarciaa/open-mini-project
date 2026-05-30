/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * 
 * @returns Distance in kilometres (km)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

export interface DetourAnalysis {
  litresNeeded: number;
  grossSavings: number;
  detourCost: number;
  netValue: number;
  isWorthDetour: boolean;
}

/**
 * Evaluates whether a detour to a specific service station is financially worth it.
 * 
 * Math Flow:
 * 1. Litres Needed: tankCapacity - (tankCapacity * (currentFuelLevel / 100))
 * 2. Gross Savings: (Local Average Price - Cheaper Station Price) * Litres Needed
 * 3. Detour Cost: (Extra km to Cheaper Station / Vehicle Efficiency) * Cheaper Station Price
 * 4. Net Value: Gross Savings - Detour Cost
 * 
 * @returns DetourAnalysis object containing full calculation breakdown
 */
export function evaluateDetour(params: {
  stationPrice: number;        // AUD per Litre (e.g. 1.74)
  distanceKm: number;          // Distance to station in km
  tankCapacity: number;        // Capacity in Litres (e.g. 55)
  currentFuelLevel: number;    // Fuel level percentage (0 to 100)
  efficiency: number;          // Fuel efficiency in km per Litre (e.g. 10)
  localAveragePrice: number;   // Local Average Price in AUD per Litre
}): DetourAnalysis {
  const {
    stationPrice,
    distanceKm,
    tankCapacity,
    currentFuelLevel,
    efficiency,
    localAveragePrice
  } = params;

  // 1. Litres Needed
  const litresNeeded = tankCapacity * (1 - currentFuelLevel / 100);

  // 2. Gross Savings
  // If the station is more expensive than average, savings are 0
  const priceDifference = Math.max(0, localAveragePrice - stationPrice);
  const grossSavings = priceDifference * litresNeeded;

  // 3. Detour Cost
  // Detour distance is treated as the extra distance (round-trip, or simple one-way distance to the servo)
  // We use the direct distance in km to the station as 'Extra km to Cheaper Station'
  const fuelConsumedForDetour = distanceKm / efficiency;
  const detourCost = fuelConsumedForDetour * stationPrice;

  // 4. Net Value
  const netValue = grossSavings - detourCost;

  // High-value detour threshold is $2.00 AUD net savings
  const isWorthDetour = netValue > 2.0;

  return {
    litresNeeded: Math.round(litresNeeded * 100) / 100,
    grossSavings: Math.round(grossSavings * 100) / 100,
    detourCost: Math.round(detourCost * 100) / 100,
    netValue: Math.round(netValue * 100) / 100,
    isWorthDetour
  };
}
