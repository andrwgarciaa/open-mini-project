"use client";

import { useEffect, useState } from "react";
import {
  useVehicleStore,
  RefuelLog,
  CarProfile,
  FuelType,
} from "@/store/useVehicleStore";
import {
  calculateDistance,
  evaluateDetour,
  DetourAnalysis,
} from "@/utils/predictiveEngine";
import {
  Fuel,
  MapPin,
  TrendingUp,
  Gauge,
  History,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  HelpCircle,
  AlertTriangle,
  Car,
  Navigation,
  Info,
  X,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";

interface StationFuelInfo {
  price: number;
  available: boolean;
}

interface Station {
  id: string;
  brand: string;
  name: string;
  lat: number;
  lng: number;
  fuels: {
    "Unleaded 91": StationFuelInfo;
    "Premium 95": StationFuelInfo;
    "Premium 98": StationFuelInfo;
    Diesel: StationFuelInfo;
  };
  updatedAt: string;
}

interface SimulatedLocation {
  name: string;
  lat: number;
  lng: number;
}

export default function Dashboard() {
  // Zustand store properties
  const {
    cars,
    activeCarId,
    currentFuelLevel,
    history,
    updateFuelLevel,
    addCar,
    removeCar,
    setActiveCarId,
    logRefuel,
    clearHistory,
  } = useVehicleStore();

  // Component local states
  const [isHydrated, setIsHydrated] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  // Simulated phone location state (latitude and longitude)
  const [selectedLocation, setSelectedLocation] = useState<SimulatedLocation>({
    name: "GPS: Locating...",
    lat: -37.8136,
    lng: 144.9631,
  });

  // Refuel modal state
  const [loggingStation, setLoggingStation] = useState<Station | null>(null);
  const [fillLitres, setFillLitres] = useState<number>(0);
  const [fillPrice, setFillPrice] = useState<number>(0);
  const [fillTotalCost, setFillTotalCost] = useState<number>(0);

  // Phase 3 Car Manager states
  const [showAddCar, setShowAddCar] = useState(false);
  const [newCarName, setNewCarName] = useState("");
  const [newCarCapacity, setNewCarCapacity] = useState("55");
  const [newCarEfficiency, setNewCarEfficiency] = useState("10");
  const [newCarFuelType, setNewCarFuelType] = useState<FuelType>("Unleaded 91");

  // Phase 2 Accordion State
  const [showRankingExplainer, setShowRankingExplainer] = useState(true);

  // Phase 4 Live Refresh Timer States
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);

  // Random phone location simulation generator
  const simulateRandomLocation = () => {
    const baseLat = -37.8136;
    const baseLng = 144.9631;
    // We expand the offsets to ± 0.08 degrees (approx. 9km radius spread around Melbourne CBD)
    // This allows the simulated driver to move between Brunswick, Footscray, St Kilda, and Kew.
    const latOffset = Math.random() * 0.16 - 0.08;
    const lngOffset = Math.random() * 0.16 - 0.08;

    const newLat = baseLat + latOffset;
    const newLng = baseLng + lngOffset;

    let suburb = "Melbourne CBD";
    if (latOffset > 0.02 && lngOffset > 0.02) suburb = "Brunswick East";
    else if (latOffset > 0.02 && lngOffset < -0.02) suburb = "Footscray North";
    else if (latOffset < -0.02 && lngOffset > 0.02)
      suburb = "South Yarra / Prahran";
    else if (latOffset < -0.02 && lngOffset < -0.02) suburb = "Port Melbourne";
    else if (latOffset > 0.02) suburb = "Carlton / Fitzroy";
    else if (latOffset < -0.02) suburb = "St Kilda / Elsternwick";
    else if (lngOffset > 0.02) suburb = "Richmond / Hawthorn";
    else if (lngOffset < -0.02) suburb = "Docklands / Footscray";

    setSelectedLocation({
      name: `${suburb} (${newLat.toFixed(3)}, ${newLng.toFixed(3)})`,
      lat: newLat,
      lng: newLng,
    });
  };

  // Handle store hydration to prevent SSR mismatch and set initial simulated GPS
  useEffect(() => {
    setIsHydrated(true);

    const baseLat = -37.8136;
    const baseLng = 144.9631;
    const latOffset = Math.random() * 0.1 - 0.05;
    const lngOffset = Math.random() * 0.1 - 0.05;
    const initialLat = baseLat + latOffset;
    const initialLng = baseLng + lngOffset;

    let suburb = "Melbourne CBD";
    if (latOffset > 0.015 && lngOffset > 0.015) suburb = "Brunswick East";
    else if (latOffset > 0.015 && lngOffset < -0.015)
      suburb = "Footscray North";
    else if (latOffset < -0.015 && lngOffset > 0.015) suburb = "South Yarra";
    else if (latOffset < -0.015 && lngOffset < -0.015)
      suburb = "Port Melbourne";
    else if (latOffset > 0.015) suburb = "Carlton / Fitzroy";
    else if (latOffset < -0.015) suburb = "St Kilda";
    else if (lngOffset > 0.015) suburb = "Richmond";
    else if (lngOffset < -0.015) suburb = "Docklands";

    setSelectedLocation({
      name: `${suburb} (${initialLat.toFixed(3)}, ${initialLng.toFixed(3)})`,
      lat: initialLat,
      lng: initialLng,
    });
  }, []);

  // Fetch stations from API
  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stations?t=${refetchIndex}`);
        const data = await res.json();
        if (data.stations) {
          setStations(data.stations);
          setSecondsSinceRefresh(0);
        }
      } catch (err) {
        console.error("Failed to load petrol prices from API.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStations();
  }, [refetchIndex]);

  // Live ticking timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceRefresh((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-Refresh Every 5 Minutes (300,000 ms)
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      setRefetchIndex((prev) => prev + 1);
    }, 300000);
    return () => clearInterval(autoRefreshInterval);
  }, []);

  // Get active vehicle profile
  const activeCar = cars.find((c) => c.id === activeCarId) ||
    cars[0] || {
      id: "default",
      name: "Standard Sedan",
      tankCapacity: 55,
      efficiency: 10,
      fuelType: "Unleaded 91" as FuelType,
    };

  // Handle logging details calculation when logging modal opens
  useEffect(() => {
    if (loggingStation && activeCar) {
      const needed = activeCar.tankCapacity * (1 - currentFuelLevel / 100);
      const roundedNeeded = Math.round(needed * 10) / 10;
      const fuelInfo = loggingStation.fuels[activeCar.fuelType];
      const price = fuelInfo?.price || 1.8;

      setFillLitres(roundedNeeded);
      setFillPrice(price);
      setFillTotalCost(Math.round(roundedNeeded * price * 100) / 100);
    }
  }, [loggingStation, currentFuelLevel, activeCar]);

  // Live calculation of detour analysis for all stations based on selected fuel type
  const localAveragePrice = stations.length
    ? stations.reduce((sum, s) => {
        const fuelInfo = s.fuels[activeCar.fuelType];
        return sum + (fuelInfo?.price || 1.8);
      }, 0) / stations.length
    : 1.8;

  const analyzedStations = stations.map((station) => {
    const distanceKm = calculateDistance(
      selectedLocation.lat,
      selectedLocation.lng,
      station.lat,
      station.lng,
    );

    const fuelInfo = station.fuels[activeCar.fuelType];
    const stationPrice = fuelInfo?.price || 1.8;
    const isAvailable = fuelInfo?.available ?? true;

    let analysis: DetourAnalysis;

    if (!isAvailable) {
      analysis = {
        litresNeeded: activeCar.tankCapacity * (1 - currentFuelLevel / 100),
        grossSavings: 0,
        detourCost: (distanceKm / activeCar.efficiency) * stationPrice,
        netValue: -999,
        isWorthDetour: false,
      };
    } else {
      analysis = evaluateDetour({
        stationPrice,
        distanceKm,
        tankCapacity: activeCar.tankCapacity,
        currentFuelLevel,
        efficiency: activeCar.efficiency,
        localAveragePrice,
      });
    }

    return {
      ...station,
      distanceKm,
      pricePerLitre: stationPrice, // Bind pricing corresponding to selected fuel type
      isAvailable,
      analysis,
    };
  });

  // Enforced sort behavior: Always sort by best detour savings (netValue) descending.
  const sortedStations = [...analyzedStations].sort((a, b) => {
    if (!a.isAvailable && b.isAvailable) return 1;
    if (a.isAvailable && !b.isAvailable) return -1;
    return b.analysis.netValue - a.analysis.netValue;
  });

  // Find single best recommendation based on HIGHEST Net Savings Value
  const bestDetour = [...analyzedStations]
    .filter((s) => s.isAvailable && s.analysis.netValue > 0)
    .sort((a, b) => b.analysis.netValue - a.analysis.netValue)[0];

  // Refuel Logging handler
  const handleConfirmRefuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingStation) return;

    logRefuel({
      date: new Date().toISOString(),
      stationId: loggingStation.id,
      stationName: loggingStation.name,
      brand: loggingStation.brand,
      fuelType: activeCar.fuelType,
      pricePerLitre: fillPrice,
      litresFilled: fillLitres,
      totalCostAud: fillTotalCost,
    });

    setLoggingStation(null);
  };

  // Add a new custom car
  const handleAddCarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const capacityNum = parseFloat(newCarCapacity);
    const efficiencyNum = parseFloat(newCarEfficiency);

    if (newCarName.trim() && !isNaN(capacityNum) && !isNaN(efficiencyNum)) {
      addCar({
        name: newCarName,
        tankCapacity: capacityNum,
        efficiency: efficiencyNum,
        fuelType: newCarFuelType,
      });

      setNewCarName("");
      setNewCarCapacity("55");
      setNewCarEfficiency("10");
      setShowAddCar(false);
    }
  };



  // Fuel Type visual badges from Figma Primitives Accent & Viz Blue/Purple
  const getFuelTypeColor = (type: FuelType) => {
    switch (type) {
      case "Unleaded 91":
        return "bg-[#5ea8ff]/10 text-[#5ea8ff] border-[#5ea8ff]/25";
      case "Premium 95":
        return "bg-[#8ecaff]/10 text-[#8ecaff] border-[#8ecaff]/25";
      case "Premium 98":
        return "bg-[#a663ed]/10 text-[#a663ed] border-[#a663ed]/25";
      case "Diesel":
        return "bg-[#cda050]/10 text-[#cda050] border-[#cda050]/25";
    }
  };

  const getFuelTypeDot = (type: FuelType) => {
    switch (type) {
      case "Unleaded 91":
        return "bg-[#5ea8ff]";
      case "Premium 95":
        return "bg-[#8ecaff]";
      case "Premium 98":
        return "bg-[#a663ed]";
      case "Diesel":
        return "bg-[#cda050]";
    }
  };

  // Format petrol prices to Australian Cents per Litre (e.g. 182.9 c/L)
  const formatPriceCents = (priceAud: number) => {
    return (priceAud * 100).toFixed(1) + " c/L";
  };

  // Format petrol prices to standard AUD dollars (e.g. $1.829)
  const formatPriceDollars = (priceAud: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 3,
    }).format(priceAud);
  };

  // Format elapsed time for display
  const formatTimeElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s ago`;
  };

  // Calculate accumulated statistics from history
  const totalLitresFilled = history.reduce((sum, h) => sum + h.litresFilled, 0);
  const totalSpent = history.reduce((sum, h) => sum + h.totalCostAud, 0);
  const estimatedSavings = history.reduce((sum, item) => {
    const baseSavings = (1.85 - item.pricePerLitre) * item.litresFilled;
    return sum + (baseSavings > 0 ? baseSavings : 0.05 * item.litresFilled);
  }, 0);

  // SSR Hydration Safeguard
  if (!isHydrated) {
    return (
      <div className="w-full min-h-screen bg-[#19191a] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center animate-pulse">
          <Fuel className="w-12 h-12 text-[#e93c70] shrink-0 mb-4 animate-bounce" />
          <h2 className="text-xl font-light text-zinc-400 font-heading">Initializing Open...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 flex-1 flex flex-col">
      {/* Top Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/Icon.png" alt="Logo" width={80} height={80} />
          </div>
          <p className="text-sm text-[#72777d] mt-2 font-mono hidden sm:block">
            Real-time fuel price monitoring and savings dashboard for drivers.
          </p>
        </div>

        {/* Action controls - Mobile-optimized touch targets */}
        <div className="flex flex-wrap items-center gap-3 font-mono">
          {/* Simulated Phone Location Simulator */}
          <div className="flex items-center gap-3 bg-[#232425] border border-[#47494d] rounded-full px-4 py-2 min-h-[44px] shadow-sm">
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="w-4 h-4 text-[#ff5421] animate-bounce" />
              <span className="text-[#8f949f] font-medium uppercase tracking-wider text-[9px] hidden sm:inline">
                GPS:
              </span>
              <span className="text-zinc-200 font-light tracking-wider text-xs">
                {selectedLocation.name}
              </span>
            </div>
            <button
              onClick={simulateRandomLocation}
              className="bg-[#3e3e3f] hover:bg-[#525c65] active:scale-95 transition-all text-[9px] font-bold uppercase px-3.5 py-1.5 rounded-full text-zinc-200 min-h-[30px] cursor-pointer border border-[#47494d]/40"
              title="Simulate driving to a new GPS coordinate"
            >
              Ping GPS
            </button>
          </div>

          {/* Refresh Timer & Manual Trigger */}
          <div className="flex items-center gap-2 bg-[#232425] border border-[#47494d] rounded-full px-4 py-2 min-h-[44px] shadow-sm text-xs">
            <span className="w-2 h-2 rounded-full bg-[#89c83a] animate-pulse shrink-0" />
            <span className="text-[#8f949f] font-medium uppercase tracking-wider text-[9px]">
              Updated:
            </span>
            <span className="text-zinc-200 font-light">
              {formatTimeElapsed(secondsSinceRefresh)}
            </span>
            <button
              onClick={() => setRefetchIndex((prev) => prev + 1)}
              disabled={loading}
              className="ml-2 bg-[#3e3e3f] hover:bg-[#525c65] active:scale-95 transition-all p-1.5 rounded-full text-[#89c83a] border border-[#47494d]/40 disabled:opacity-50 cursor-pointer flex items-center justify-center min-h-[30px]"
              title="Manual force refresh for development testing"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid - Phase 5 Figma Grid: 6 columns on mobile, 12 columns on desktop with proportional gap */}
      <main className="grid grid-cols-6 lg:grid-cols-12 gap-2 lg:gap-4 items-start">
        {/* LEFT COLUMN: Multi-Car Garage & Fuel Gauge (Mobile: span-6, Desktop: span-5) */}
        <section className="col-span-6 lg:col-span-5 space-y-4 lg:space-y-6">
          {/* Vehicle Garage Card */}
          <div className="figma-card rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#a663ed]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                <Car className="w-5 h-5 text-[#a663ed]" />
                Vehicle Garage
              </h2>

              <button
                onClick={() => setShowAddCar(!showAddCar)}
                className={`flex items-center gap-1.5 transition-all text-[10px] font-bold uppercase rounded-full px-4 py-1.5 min-h-[36px] cursor-pointer ${
                  showAddCar
                    ? "bg-white text-zinc-900 border border-transparent shadow-sm hover:bg-zinc-100"
                    : "border border-[#47494d] text-zinc-300 hover:border-zinc-300 hover:text-white bg-transparent hover:bg-white/5"
                }`}
              >
                {showAddCar ? (
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>{showAddCar ? "Close ✕" : "Add Car +"}</span>
              </button>
            </div>

            {/* Garage listing - Uses Figma Tag selected vs unselected styles with strict 8px spacing */}
            <div className="space-y-2">
              {cars.map((car) => {
                const isActive = car.id === activeCarId;

                return (
                  <div
                    key={car.id}
                    onClick={() => {
                      if (!showAddCar) setActiveCarId(car.id);
                    }}
                    className={`border transition-all relative rounded-3xl p-3.5 flex items-center justify-between ${
                      showAddCar ? "opacity-60" : "cursor-pointer"
                    } ${
                      isActive
                        ? "bg-[#a663ed]/5 border-2 border-[#cda050] shadow-[0_0_15px_rgba(205,160,80,0.1)]"
                        : "bg-[#232425]/40 border border-[#3e3e3f] hover:border-[#47494d]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-2xl border ${
                          isActive
                            ? "bg-[#a663ed]/10 border-[#a663ed]/20 text-[#a663ed]"
                            : "bg-[#232425] border-[#47494d] text-zinc-500"
                        }`}
                      >
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                          {car.name}
                          <span
                            className={`w-2 h-2 rounded-full ${getFuelTypeDot(car.fuelType)}`}
                          />
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-mono uppercase mt-0.5 tracking-wider">
                          {car.tankCapacity}L Tank • {car.efficiency} km/L •{" "}
                          {car.fuelType}
                        </p>
                      </div>
                    </div>

                    {cars.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove ${car.name} from garage?`)) {
                            removeCar(car.id);
                          }
                        }}
                        className="text-zinc-500 hover:text-red-400 p-2 hover:bg-[#232425] rounded-full transition-all min-h-[40px] flex items-center justify-center"
                        title="Remove vehicle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sliding Form: Add Custom Car - Capsule style fields */}
            {showAddCar && (
              <form
                onSubmit={handleAddCarSubmit}
                className="mt-6 border-t border-[#47494d] pt-6 space-y-4 animate-fade-in font-mono"
              >
                <h3 className="text-xs uppercase font-bold tracking-wider text-[#a663ed] mb-2 font-mono">
                  Register New Vehicle
                </h3>

                <div>
                  <label className="text-[10px] text-[#8f949f] font-mono block mb-1.5 uppercase tracking-wider">
                    Vehicle Model Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mazda 3, Toyota Hilux"
                    value={newCarName}
                    onChange={(e) => setNewCarName(e.target.value)}
                    className="w-full bg-[#19191a] border border-[#47494d] rounded-full px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#a663ed] min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#8f949f] block mb-1.5 uppercase tracking-wider">
                      Tank Size (L)
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="150"
                      value={newCarCapacity}
                      onChange={(e) => setNewCarCapacity(e.target.value)}
                      className="w-full bg-[#19191a] border border-[#47494d] rounded-full px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#a663ed] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8f949f] block mb-1.5 uppercase tracking-wider">
                      Efficiency (km/L)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      min="2"
                      max="40"
                      value={newCarEfficiency}
                      onChange={(e) => setNewCarEfficiency(e.target.value)}
                      className="w-full bg-[#19191a] border border-[#47494d] rounded-full px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#a663ed] min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#8f949f] block mb-1.5 uppercase tracking-wider">
                    Fuel Preference
                  </label>
                  <select
                    value={newCarFuelType}
                    onChange={(e) =>
                      setNewCarFuelType(e.target.value as FuelType)
                    }
                    className="w-full bg-[#19191a] border border-[#47494d] rounded-full px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#a663ed] min-h-[44px] font-mono cursor-pointer"
                  >
                    <option value="Unleaded 91" className="bg-[#19191a]">
                      Unleaded 91 (Standard)
                    </option>
                    <option value="Premium 95" className="bg-[#19191a]">
                      Premium 95 (Mid-Grade)
                    </option>
                    <option value="Premium 98" className="bg-[#19191a]">
                      Premium 98 (High-Octane)
                    </option>
                    <option value="Diesel" className="bg-[#19191a]">
                      Diesel
                    </option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="figma-btn-primary flex-1">
                    Register Car
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCar(false)}
                    className="figma-btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Dynamic Fuel Gauge Card - Morphing to Crimson Surface-Alert when fuel <= 20% */}
          <div
            className={`${currentFuelLevel <= 20 ? "figma-card-alert" : "figma-card"} rounded-3xl p-6 relative overflow-hidden transition-all duration-500`}
          >
            {currentFuelLevel > 20 && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#5ea8ff]/5 rounded-full blur-2xl pointer-events-none" />
            )}

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#5ea8ff]" />
                Fuel Level Indicator
              </h2>
              <span
                className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${getFuelTypeColor(activeCar.fuelType)}`}
              >
                {activeCar.fuelType}
              </span>
            </div>

            {/* Premium Animated SVG Tank Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative w-44 h-44 border-4 border-[#3e3e3f] rounded-full flex items-center justify-center overflow-hidden shadow-2xl bg-[#19191a]">
                <div
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t transition-all duration-700 ease-in-out"
                  style={{
                    height: `${currentFuelLevel}%`,
                    backgroundImage:
                      currentFuelLevel > 50
                        ? "linear-gradient(to top, rgba(137, 200, 58, 0.4), rgba(137, 200, 58, 0.15))"
                        : currentFuelLevel > 20
                          ? "linear-gradient(to top, rgba(228, 159, 56, 0.4), rgba(228, 159, 56, 0.15))"
                          : "linear-gradient(to top, rgba(233, 60, 112, 0.5), rgba(233, 60, 112, 0.15))",
                  }}
                >
                  <svg
                    className={`absolute bottom-full left-0 w-[200%] h-4 ${
                      currentFuelLevel > 50
                        ? "text-[#89c83a]/30 fill-[#89c83a]/30"
                        : currentFuelLevel > 20
                          ? "text-[#e49f38]/30 fill-[#e49f38]/30"
                          : "text-[#e93c70]/40 fill-[#e93c70]/40"
                    } animate-wave`}
                    viewBox="0 0 120 28"
                    preserveAspectRatio="none"
                  >
                    <path d="M0 15 Q 30 0, 60 15 T 120 15 T 180 15 T 240 15 L 240 28 L 0 28 Z" />
                  </svg>
                  <svg
                    className={`absolute bottom-full left-0 w-[200%] h-3.5 ${
                      currentFuelLevel > 50
                        ? "text-[#89c83a]/40 fill-[#89c83a]/40"
                        : currentFuelLevel > 20
                          ? "text-[#e49f38]/40 fill-[#e49f38]/40"
                          : "text-[#ef72a2]/40 fill-[#ef72a2]/40"
                    } animate-wave-slow`}
                    style={{ animationDirection: "reverse" }}
                    viewBox="0 0 120 28"
                    preserveAspectRatio="none"
                  >
                    <path d="M0 15 Q 35 5, 70 15 T 140 15 T 210 15 T 280 15 L 280 28 L 0 28 Z" />
                  </svg>
                </div>

                <div className="z-10 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-light text-white font-mono tracking-tight select-none">
                    {currentFuelLevel}%
                  </span>
                  <span className="text-[9px] uppercase font-extrabold text-[#72777d] font-mono tracking-widest mt-1">
                    {currentFuelLevel <= 20
                      ? "Low Fuel"
                      : currentFuelLevel >= 100
                        ? "Full Tank"
                        : "Petrol Left"}
                  </span>
                </div>

                {currentFuelLevel <= 20 && (
                  <div className="absolute inset-0 border border-[#e93c70]/30 rounded-full animate-pulse pointer-events-none" />
                )}
              </div>

              {/* Litres needed counter based on active car's capacity - mt-4 (16px spacing) */}
              <div className="mt-4 text-center font-mono">
                <span className="text-[10px] text-[#8f949f] font-semibold uppercase tracking-wider block">
                  Litres to Fill ({activeCar.name})
                </span>
                <span className="text-2xl font-light text-zinc-100 font-mono tracking-wider">
                  {(
                    activeCar.tankCapacity *
                    (1 - currentFuelLevel / 100)
                  ).toFixed(1)}{" "}
                  L
                </span>
                <span className="text-[10px] text-[#72777d] block mt-1">
                  out of {activeCar.tankCapacity}L capacity
                </span>
              </div>
            </div>

            {/* Slider Simulation Controller */}
            <div className="mt-8 border-t border-[#47494d] pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                  Simulate Running Out of Fuel:
                </span>
                <span
                  className={`text-[10px] font-bold font-mono px-3 py-1 rounded-full border ${
                    currentFuelLevel > 50
                      ? "bg-[#89c83a]/10 text-[#89c83a] border-[#89c83a]/20"
                      : currentFuelLevel > 20
                        ? "bg-[#e49f38]/10 text-[#e49f38] border-[#e49f38]/20"
                        : "bg-[#e93c70]/10 text-[#e93c70] border-[#e93c70]/30 animate-pulse"
                  }`}
                >
                  {currentFuelLevel}%
                </span>
              </div>

              <div className="relative group py-2">
                <input
                  id="fuel-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={currentFuelLevel}
                  onChange={(e) => updateFuelLevel(parseInt(e.target.value))}
                  className="w-full h-3 rounded-lg bg-[#19191a] appearance-none cursor-pointer focus:outline-none min-h-[30px]"
                />
              </div>

              <div className="flex justify-between text-[10px] text-[#72777d] font-bold uppercase mt-2 font-mono">
                <span>Empty (0%)</span>
                <span>Half (50%)</span>
                <span>Full (100%)</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="figma-card rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[#8f949f] tracking-wider">
                Estimated Savings
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-light text-[#89c83a] font-mono tracking-tight">
                  {new Intl.NumberFormat("en-AU", {
                    style: "currency",
                    currency: "AUD",
                  }).format(estimatedSavings)}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#89c83a] animate-pulse" />
              </div>
              <span className="text-[9px] text-[#72777d] mt-2 block uppercase tracking-wider font-mono">
                Using detours
              </span>
            </div>

            <div className="figma-card rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[#8f949f] tracking-wider">
                Refuels Logged
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-light text-[#5ea8ff] font-mono tracking-tight">
                  {history.length}
                </span>
                <span className="text-xs font-bold text-[#72777d]">fills</span>
              </div>
              <span className="text-[9px] text-[#72777d] mt-2 block font-mono tracking-wider uppercase">
                {totalSpent > 0
                  ? `$${totalSpent.toFixed(2)} AUD spent`
                  : `${totalLitresFilled.toFixed(0)}L total filled`}
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Detour recommendation & Market list (Mobile: span-6, Desktop: span-7) */}
        <section className="col-span-6 lg:col-span-7 space-y-4 lg:space-y-6">
          {/* Phase 5 Figma White-Card Detour Hero - Matching Image 4 layout ("Heading / Paragraph / Action →") */}
          {loading ? (
            <div className="figma-card rounded-3xl p-6 animate-pulse">
              <div className="h-6 w-1/3 bg-zinc-800 rounded mb-4" />
              <div className="h-20 bg-zinc-900 rounded mb-4" />
              <div className="h-6 w-2/3 bg-zinc-800 rounded" />
            </div>
          ) : bestDetour && currentFuelLevel < 95 ? (
            <div className="figma-card rounded-3xl p-6 relative overflow-hidden transition-all border-[#89c83a]/45 shadow-[0_0_20px_rgba(137,200,58,0.1)] hover:border-[#89c83a]/75 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <span className="text-[10px] bg-[#89c83a]/10 text-[#89c83a] border border-[#89c83a]/25 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-[#89c83a] animate-pulse" />
                  Recommended Trip Detour
                </span>

                <span className="text-xs text-zinc-300 font-mono">
                  Saves{" "}
                  <strong className="text-[#89c83a] font-bold text-sm font-mono tracking-tight">
                    ${bestDetour.analysis.netValue.toFixed(2)} AUD
                  </strong>{" "}
                  Net
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-3xl font-light tracking-tight text-white font-heading">
                  Detour to {bestDetour.name}
                </h3>
                <p className="text-xs text-[#8f949f] mt-1.5 flex items-center gap-1.5 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-[#ff5421]" />
                  Located {bestDetour.distanceKm.toFixed(1)} km away. Preferred:{" "}
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border font-mono ${getFuelTypeColor(activeCar.fuelType)}`}
                  >
                    {activeCar.fuelType} @{" "}
                    {formatPriceCents(bestDetour.pricePerLitre)}
                  </span>
                </p>
              </div>

              {/* The Detour Math breakdown visual - dark slate inset */}
              <div className="bg-[#19191a] border border-[#3e3e3f] text-[#fafafa] rounded-2xl p-4 space-y-3 font-mono">
                <span className="text-[10px] uppercase font-bold text-[#89c83a] tracking-wider block">
                  Savings Breakdown ({activeCar.name}):
                </span>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#232425]/50 p-2 rounded-xl border border-[#47494d]">
                    <span className="text-[9px] text-[#8f949f] block uppercase font-bold">
                      Litres Needed
                    </span>
                    <span className="text-sm font-bold text-zinc-300">
                      {bestDetour.analysis.litresNeeded} L
                    </span>
                  </div>

                  <div className="bg-[#232425]/50 p-2 rounded-xl border border-[#47494d]">
                    <span className="text-[9px] text-[#8f949f] block uppercase font-bold">
                      Gross Savings
                    </span>
                    <span className="text-sm font-bold text-[#89c83a]">
                      +${bestDetour.analysis.grossSavings.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-[#232425]/50 p-2 rounded-xl border border-[#47494d]">
                    <span className="text-[9px] text-[#8f949f] block uppercase font-bold">
                      Detour Cost
                    </span>
                    <span className="text-sm font-bold text-[#e93c70]">
                      -${bestDetour.analysis.detourCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#232425] flex justify-between items-center text-xs">
                  <span className="text-[#8f949f] font-medium">
                    Net Detour Value:
                  </span>
                  <span className="font-bold text-[#89c83a] text-sm">
                    +${bestDetour.analysis.netValue.toFixed(2)} AUD
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-[#3e3e3f]">
                <p className="text-[10px] text-[#8f949f] max-w-xs italic leading-relaxed">
                  Detouring here yields savings greater than $2.00 AUD
                  (including transit costs).
                </p>
                <div className="flex gap-2.5 font-mono">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${bestDetour.lat},${bestDetour.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-[#47494d] hover:border-[#ff5421]/60 hover:bg-[#ff5421]/5 text-zinc-300 hover:text-white rounded-full pl-5 pr-1.5 py-1.5 flex items-center justify-between gap-3 active:scale-95 transition-all min-h-[44px] cursor-pointer"
                  >
                    <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">
                      Navigate
                    </span>
                    <div className="w-8 h-8 rounded-full border border-zinc-700/50 flex items-center justify-center bg-zinc-900/30 text-zinc-300 shrink-0">
                      <Navigation className="w-3.5 h-3.5 text-[#ff5421]" />
                    </div>
                  </a>
                  <button
                    onClick={() => setLoggingStation(bestDetour)}
                    className="bg-white hover:bg-zinc-100 text-zinc-900 rounded-full pl-5 pr-1.5 py-1.5 flex items-center justify-between gap-3 active:scale-95 transition-all min-h-[44px] cursor-pointer border border-transparent font-sans"
                  >
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-900 font-sans">
                      Log Fill-up
                    </span>
                    <div className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center bg-zinc-100 text-zinc-800 shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="figma-card rounded-3xl p-5 relative overflow-hidden text-center bg-zinc-900/10">
              <AlertTriangle className="w-8 h-8 text-[#e49f38] mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-200">
                {currentFuelLevel >= 95
                  ? "Tank is full!"
                  : "No detours are currently worth it."}
              </h3>
              <p className="text-xs text-[#8f949f] max-w-md mx-auto mt-1">
                {currentFuelLevel >= 95
                  ? "You have plenty of petrol. Safe travels!"
                  : `Even though petrol is cheaper at other servos, the detour fuel cost for ${activeCar.name} outweighs the gross savings. Refuel at your closest local servo.`}
              </p>
            </div>
          )}

          {/* 2. Servo Market List */}
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#5ea8ff]" />
                  Servos Prioritized by Best Savings
                </h2>

                {/* Ranking toggle explanation button */}
                <button
                  onClick={() => setShowRankingExplainer(!showRankingExplainer)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    showRankingExplainer
                      ? "border-[#5ea8ff]/30 bg-[#5ea8ff]/10 text-[#5ea8ff]"
                      : "border-[#47494d] text-[#8f949f]"
                  }`}
                  title="Show prioritizing guide"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* "Smart Filter Explained" Clarifying Component */}
            {showRankingExplainer && (
              <div className="figma-card border-[#5ea8ff]/25 bg-[#5ea8ff]/5 rounded-2xl p-4 relative mb-6 animate-fade-in">
                <button
                  onClick={() => setShowRankingExplainer(false)}
                  className="absolute top-3 right-3 text-[#72777d] hover:text-zinc-300 transition-colors p-1"
                  aria-label="Dismiss explainer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <div className="flex gap-3">
                  <div className="bg-[#5ea8ff]/10 text-[#5ea8ff] p-2.5 rounded-xl h-fit border border-[#5ea8ff]/25">
                    <HelpCircle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase font-bold tracking-wider text-[#5ea8ff] mb-1 font-mono">
                      Detour prioritizing logic
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-[92%]">
                      💡 <strong>How we sort your servos:</strong> We don&apos;t
                      just sort by the lowest price. We subtract the real cost
                      of fuel your vehicle will burn driving out of your way
                      from your gross savings. You&apos;re only seeing
                      recommendations where the detour actively puts money back
                      in your pocket.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="figma-card rounded-2xl h-24 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedStations.map((station) => {
                  const isAvailable = station.isAvailable;
                  const isWorth =
                    isAvailable &&
                    station.analysis.isWorthDetour &&
                    currentFuelLevel < 95;
                  const estimatedSpend =
                    station.analysis.litresNeeded * station.pricePerLitre;
                  const relativeDistance = `GPS • ${station.distanceKm.toFixed(1)} km away`;

                  return (
                    <div
                      key={station.id}
                      className={`figma-card rounded-3xl p-5 sm:p-6 transition-all duration-300 relative group ${
                        !isAvailable
                          ? "border-[#e93c70]/10 opacity-70 bg-[#19191a]/10"
                          : isWorth
                            ? "border-[#89c83a]/45 shadow-[0_0_15px_rgba(137,200,58,0.08)] hover:border-[#89c83a]/75"
                            : "hover:border-[#47494d]"
                      }`}
                    >
                      {/* Card layout header details */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-start gap-3">
                          {/* Brand Indicator */}
                          <div className="bg-[#19191a]/50 border border-[#47494d] rounded-2xl px-3 py-2 flex flex-col items-center justify-center font-heading font-light text-xs text-zinc-300 min-w-[72px]">
                            <span>{station.brand}</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-100 flex flex-wrap items-center gap-2">
                              {station.name}
                              <ArrowRight className="w-3.5 h-3.5 text-[#8f949f] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </h3>

                            <p className="text-xs text-[#8f949f] mt-1 flex items-center gap-1.5 font-mono">
                              <MapPin className="w-3.5 h-3.5 text-[#ff5421]" />
                              {relativeDistance}
                            </p>
                          </div>
                        </div>

                        {/* Localized Price Layout - Cents in DM Mono Light */}
                        <div className="flex sm:flex-col items-baseline sm:items-end justify-between border-t sm:border-t-0 border-[#232425] pt-2 sm:pt-0 font-mono">
                          {isAvailable ? (
                            <>
                              <span className="text-3xl font-light text-white font-mono tracking-tight">
                                {formatPriceCents(station.pricePerLitre)}
                              </span>
                              <span className="text-[10px] text-[#72777d] font-bold block mt-1">
                                Total Fill:{" "}
                                {new Intl.NumberFormat("en-AU", {
                                  style: "currency",
                                  currency: "AUD",
                                }).format(estimatedSpend)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xl font-bold text-[#e93c70]/60 line-through font-mono">
                                {formatPriceCents(station.pricePerLitre)}
                              </span>
                              <span className="text-[10px] text-[#e93c70] font-bold block mt-1 uppercase tracking-wider">
                                Out of Stock
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* detour tags & actions row */}
                      <div className="mt-4 pt-4 border-t border-[#3e3e3f] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Dynamic detour tag pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          {!isAvailable ? (
                            <span className="bg-[#e93c70]/10 border border-[#e93c70]/25 text-[#e93c70] text-[10px] font-bold px-3 py-1.5 rounded-full font-mono uppercase tracking-wider">
                              ⚠️ Out of stock for {activeCar.fuelType}
                            </span>
                          ) : isWorth ? (
                            <span className="bg-[#89c83a]/10 border border-[#89c83a]/25 text-[#89c83a] text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-wider font-mono">
                              🔥 Best Value (Saves $
                              {station.analysis.netValue.toFixed(2)} Net)
                            </span>
                          ) : station.analysis.netValue < 0 ? (
                            <span className="bg-[#232425] border border-[#3e3e3f] text-[#8f949f] text-[10px] font-bold px-3 py-1.5 rounded-full font-mono uppercase tracking-wider">
                              📍 Detour costs $
                              {Math.abs(station.analysis.netValue).toFixed(2)}{" "}
                              more
                            </span>
                          ) : (
                            <span className="bg-[#232425]/60 border border-[#3e3e3f]/80 text-[#8f949f] text-[10px] font-bold px-3 py-1.5 rounded-full font-mono uppercase tracking-wider">
                              📍 Convenience (Saves $
                              {station.analysis.netValue.toFixed(2)} Net)
                            </span>
                          )}
                        </div>

                        {/* Interactive Actions with compliant Touch Targets (min 44px) */}
                        <div className="flex items-center gap-2.5 w-full sm:w-auto font-mono">
                          {/* Map directions link button */}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-[#47494d] hover:border-[#5ea8ff]/60 hover:bg-[#5ea8ff]/5 text-zinc-300 hover:text-[#5ea8ff] rounded-full pl-5 pr-1.5 py-1.5 flex items-center justify-between gap-3 active:scale-95 transition-all min-h-[44px] flex-1 sm:flex-initial cursor-pointer font-sans"
                            title="Open directions in Google Maps"
                          >
                            <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">
                              Directions
                            </span>
                            <div className="w-8 h-8 rounded-full border border-zinc-700/50 flex items-center justify-center bg-zinc-900/30 text-zinc-300 shrink-0">
                              <Navigation className="w-3.5 h-3.5 text-[#5ea8ff]" />
                            </div>
                          </a>

                          {/* Log Refuel Trigger (disabled if out of stock) */}
                          <button
                            onClick={() => setLoggingStation(station)}
                            disabled={!isAvailable}
                            className="bg-[#3e3e3f] hover:bg-[#525c65] disabled:opacity-20 disabled:hover:bg-[#3e3e3f] disabled:text-[#72777d] disabled:cursor-not-allowed text-zinc-200 hover:text-white rounded-full pl-5 pr-1.5 py-1.5 flex items-center justify-between gap-3 active:scale-95 transition-all min-h-[44px] flex-1 sm:flex-initial cursor-pointer border border-[#47494d]/40 font-sans"
                          >
                            <span className="text-[10px] font-extrabold uppercase tracking-wider font-sans">
                              {!isAvailable ? "No Fuel" : "Log Refuel"}
                            </span>
                            <div className="w-8 h-8 rounded-full border border-zinc-700/50 flex items-center justify-center bg-zinc-900/30 text-zinc-300 shrink-0">
                              {isAvailable ? (
                                <ArrowRight className="w-3.5 h-3.5 text-[#fafafa] stroke-[2.5]" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-zinc-600" />
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Refuel history */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-zinc-200 flex items-center gap-2">
                <History className="w-5 h-5 text-[#89c83a]" />
                Refuelling History
              </h2>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to clear your local history?",
                      )
                    ) {
                      clearHistory();
                    }
                  }}
                  className="figma-btn-pink-outline min-h-[36px] px-3.5 py-1.5 text-[10px] font-mono flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="figma-card rounded-2xl p-6 text-center border-dashed border-[#47494d] text-zinc-500">
                <Car className="w-7 h-7 mx-auto mb-2 text-zinc-650" />
                <span className="text-xs font-bold uppercase tracking-wider block font-mono">
                  No refuels logged yet
                </span>
                <p className="text-[11px] text-[#72777d] mt-1 max-w-sm mx-auto">
                  When you refuel your car, click &quot;Log Refuel&quot; next to
                  a station. We will record your fill-up, preferred fuel type,
                  and reset your fuel gauge.
                </p>
              </div>
            ) : (
              <div className="figma-card rounded-2xl overflow-hidden border border-[#47494d]/85">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#232425]/60 border-b border-[#47494d] font-bold uppercase text-[10px] text-[#8f949f] tracking-wider font-mono">
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Servo</th>
                        <th className="p-3.5">Fuel Type</th>
                        <th className="p-3.5 text-right">Price</th>
                        <th className="p-3.5 text-right">Litres</th>
                        <th className="p-3.5 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#19191a] font-mono">
                      {history.slice(0, 6).map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-[#232425]/30 transition-colors"
                        >
                          <td className="p-3.5 text-[#8f949f]">
                            {new Date(log.date).toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-zinc-200 block leading-tight font-sans">
                              {log.stationName}
                            </span>
                            <span className="text-[9px] text-[#72777d] uppercase">
                              {log.brand}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded border inline-block ${getFuelTypeColor(log.fuelType)}`}
                            >
                              {log.fuelType}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-light text-zinc-300">
                            {formatPriceCents(log.pricePerLitre)}
                          </td>
                          <td className="p-3.5 text-right font-light text-zinc-300">
                            {log.litresFilled.toFixed(1)} L
                          </td>
                          <td className="p-3.5 text-right font-light text-[#89c83a]">
                            {new Intl.NumberFormat("en-AU", {
                              style: "currency",
                              currency: "AUD",
                            }).format(log.totalCostAud)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {history.length > 6 && (
                  <div className="bg-[#232425] p-2.5 text-center border-t border-[#47494d] text-[10px] text-[#72777d] font-bold uppercase font-mono tracking-wider">
                    Showing latest 6 of {history.length} logs
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-[#232425] pt-6 pb-4 text-center text-xs text-[#72777d] font-semibold uppercase tracking-widest font-mono">
        <span>
          © {new Date().getFullYear()} Open • Get rid of fuel
          anxiety and save money on your trips!
        </span>
      </footer>

      {/* MODAL: Log Refuel Drawer / Dialog Overlay */}
      {loggingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#19191a]/85 backdrop-blur-sm animate-fade-in">
          <div className="figma-card-active rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <h3 className="text-lg font-light text-white font-heading mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#5ea8ff]" />
              Log Refuel Fill-up
            </h3>
            <p className="text-xs text-[#8f949f] mb-5">
              Logging purchase at <strong>{loggingStation.name}</strong>.
              Filling tank of <strong>{activeCar.name}</strong> with{" "}
              <strong>{activeCar.fuelType}</strong>. Resets gauge to 100%.
            </p>

            <form
              onSubmit={handleConfirmRefuel}
              className="space-y-4 font-mono"
            >
              {/* Litres filled input */}
              <div>
                <label className="text-xs text-[#8f949f] font-mono block mb-1.5 uppercase tracking-wider">
                  Litres Filled (L)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="200"
                    value={fillLitres}
                    onChange={(e) => {
                      const l = parseFloat(e.target.value) || 0;
                      setFillLitres(l);
                      setFillTotalCost(Math.round(l * fillPrice * 100) / 100);
                    }}
                    className="w-full bg-[#19191a] border border-[#47494d] rounded-full px-4 py-3.5 text-sm text-zinc-200 focus:outline-none focus:border-[#5ea8ff] min-h-[44px]"
                    required
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-[#72777d]">
                    L
                  </span>
                </div>
              </div>

              {/* Price per litre input */}
              <div>
                <label className="text-xs text-[#8f949f] font-mono block mb-1.5 uppercase tracking-wider">
                  Price per Litre (AUD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.5"
                    max="5.0"
                    value={fillPrice}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      setFillPrice(p);
                      setFillTotalCost(Math.round(fillLitres * p * 100) / 100);
                    }}
                    className="w-full bg-[#19191a] border border-[#47494d] rounded-full px-4 py-3.5 text-sm text-zinc-200 focus:outline-none focus:border-[#5ea8ff] min-h-[44px]"
                    required
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-[#72777d]">
                    $/L
                  </span>
                </div>
              </div>

              {/* Calculated Total Cost field */}
              <div>
                <label className="text-xs text-[#8f949f] font-mono block mb-1.5 uppercase tracking-wider">
                  Calculated Total Cost
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={fillTotalCost}
                    onChange={(e) =>
                      setFillTotalCost(parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#19191a]/40 border border-[#3e3e3f] rounded-full px-4 py-3.5 text-sm text-[#89c83a] font-bold focus:outline-none min-h-[44px]"
                    required
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-[#72777d]">
                    AUD
                  </span>
                </div>
              </div>

              {/* Action row */}
              <div className="flex gap-3 pt-4 border-t border-[#3e3e3f]">
                <button type="submit" className="figma-btn-primary flex-1">
                  Log & Fill Tank
                </button>
                <button
                  type="button"
                  onClick={() => setLoggingStation(null)}
                  className="figma-btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
