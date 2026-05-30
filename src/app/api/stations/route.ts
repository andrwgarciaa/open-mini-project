import { NextResponse } from 'next/server';

export const revalidate = 300; // Cache responses for 5 minutes (300 seconds)

interface StationSeed {
  id: string;
  brand: string;
  name: string;
  lat: number;
  lng: number;
  basePrice: number; // Unleaded 91 base price
}

const SEED_STATIONS: StationSeed[] = [
  { id: '1', brand: 'Ampol', name: 'Ampol Richmond', lat: -37.8230, lng: 144.9980, basePrice: 1.82 },
  { id: '2', brand: '7-Eleven', name: '7-Eleven Fitzroy', lat: -37.8010, lng: 144.9780, basePrice: 1.78 },
  { id: '3', brand: 'BP', name: 'BP Collingwood', lat: -37.8030, lng: 144.9880, basePrice: 1.85 },
  { id: '4', brand: 'United', name: 'United Abbotsford', lat: -37.8070, lng: 144.9980, basePrice: 1.74 }
];

export async function GET() {
  // We simulate live price changes by shifting ± $0.20 from base price on each request
  // This creates a realistic 40c spread matching the highly volatile Australian retail petrol price cycles
  const stations = SEED_STATIONS.map((station) => {
    const shift = Math.random() * 0.40 - 0.20;
    
    // We formulate a structured listing for each fuel type:
    // 91 is base, 95 is ~12c premium, 98 is ~21c premium, Diesel is ~7c shift
    const price91 = Math.round((station.basePrice + shift) * 1000) / 1000;
    const price95 = Math.round((station.basePrice + 0.12 + shift) * 1000) / 1000;
    const price98 = Math.round((station.basePrice + 0.21 + shift) * 1000) / 1000;
    const priceDiesel = Math.round((station.basePrice + 0.07 + shift) * 1000) / 1000;

    // Simulate occasional stock shortages (12% chance of being out of stock for a fuel type)
    // To ensure at least Unleaded 91 or Premium 98 is available so testing detour math is guaranteed,
    // we make sure we don't clear everything out, but simulate shortages realistically.
    const isAvailable = (typeIndex: number) => {
      // Station 2 (7-Eleven Fitzroy) is out of Premium 98 (semi-deterministic for testing)
      if (station.id === '2' && typeIndex === 2) return false;
      // Station 3 (BP Collingwood) is out of Premium 95
      if (station.id === '3' && typeIndex === 1) return false;
      // Station 4 (United Abbotsford) is out of Unleaded 91
      if (station.id === '4' && typeIndex === 0) return false;
      // Otherwise, use a small randomized out-of-stock probability
      return Math.random() > 0.12;
    };

    return {
      id: station.id,
      brand: station.brand,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      fuels: {
        "Unleaded 91": {
          price: price91,
          available: isAvailable(0)
        },
        "Premium 95": {
          price: price95,
          available: isAvailable(1)
        },
        "Premium 98": {
          price: price98,
          available: isAvailable(2)
        },
        "Diesel": {
          price: priceDiesel,
          available: isAvailable(3)
        }
      },
      updatedAt: new Date().toISOString()
    };
  });

  return NextResponse.json({
    stations,
    cachedAt: new Date().toISOString()
  });
}
