import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FuelType = "Unleaded 91" | "Premium 95" | "Premium 98" | "Diesel";

export interface CarProfile {
  id: string;
  name: string; // Car nickname
  tankCapacity: number; // in Litres (L)
  efficiency: number; // in Kilometres per Litre (km/L)
  fuelType: FuelType;
}

export interface RefuelLog {
  id: string;
  date: string;
  stationId: string;
  stationName: string;
  brand: string;
  fuelType: FuelType;
  pricePerLitre: number;
  litresFilled: number;
  totalCostAud: number;
}

interface VehicleState {
  cars: CarProfile[];
  activeCarId: string;
  currentFuelLevel: number; // Percentage (0-100), global simulator slider
  history: RefuelLog[];
  
  updateFuelLevel: (level: number) => void;
  addCar: (car: Omit<CarProfile, 'id'>) => void;
  updateCar: (id: string, updates: Partial<CarProfile>) => void;
  removeCar: (id: string) => void;
  setActiveCarId: (id: string) => void;
  logRefuel: (refuel: Omit<RefuelLog, 'id'>) => void;
  clearHistory: () => void;
}

const DEFAULT_CARS: CarProfile[] = [
  { id: 'car-1', name: 'Hyundai i30', tankCapacity: 50, efficiency: 13.5, fuelType: 'Unleaded 91' },
  { id: 'car-2', name: 'Subaru WRX', tankCapacity: 60, efficiency: 9.5, fuelType: 'Premium 98' },
  { id: 'car-3', name: 'Ford Ranger', tankCapacity: 80, efficiency: 8.5, fuelType: 'Diesel' }
];

export const useVehicleStore = create<VehicleState>()(
  persist(
    (set) => ({
      cars: DEFAULT_CARS,
      activeCarId: 'car-1',
      currentFuelLevel: 45,
      history: [],

      updateFuelLevel: (level) =>
        set(() => ({
          currentFuelLevel: Math.max(0, Math.min(100, level))
        })),

      addCar: (car) =>
        set((state) => {
          const newCar: CarProfile = {
            ...car,
            id: 'car-' + Math.random().toString(36).substring(2, 9)
          };
          return {
            cars: [...state.cars, newCar],
            activeCarId: newCar.id // Set newly added car as active
          };
        }),

      updateCar: (id, updates) =>
        set((state) => ({
          cars: state.cars.map((car) =>
            car.id === id ? { ...car, ...updates } : car
          )
        })),

      removeCar: (id) =>
        set((state) => {
          const filteredCars = state.cars.filter((c) => c.id !== id);
          // If active car was removed, fall back to first available or reset
          const nextActiveId = state.activeCarId === id
            ? (filteredCars.length > 0 ? filteredCars[0].id : '')
            : state.activeCarId;
            
          return {
            cars: filteredCars,
            activeCarId: nextActiveId
          };
        }),

      setActiveCarId: (id) =>
        set(() => ({
          activeCarId: id
        })),

      logRefuel: (refuel) =>
        set((state) => {
          const newRefuel: RefuelLog = {
            ...refuel,
            id: Math.random().toString(36).substring(2, 9)
          };
          return {
            history: [newRefuel, ...state.history],
            currentFuelLevel: 100 // resets fuel level to 100% automatically
          };
        }),

      clearHistory: () =>
        set(() => ({
          history: []
        }))
    }),
    {
      name: 'fuelmate-multi-car-storage' // unique name to migrate from previous phase
    }
  )
);
