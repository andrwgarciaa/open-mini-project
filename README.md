# 🗺️ Open | Smart Petrol Finder

Petrol prices in metropolitan Australia can fluctuate by **15c to 40c per litre** between different suburbs or service stations (servos) on the exact same day. **Open** resolves the driver's dilemma by mathematically calculating if detouring to a cheaper suburban servo is profitable, factoring in transit fuel burn costs against gross capacity savings.

Built with Next.js and Antigravity IDE in 2 days.
---

## 🛠️ Keypoints

### Features
1. **Spherical Distance & Detour Calculations:** Computes distance using the **Haversine formula** and analyzes if travel transit burn cost offsets petrol savings against a **$2.00 AUD high-value detour threshold**.
2. **Multi-Vehicle Garage State:** Supports registering standard and performance vehicles with customized **tank capacities (L)** and **efficiencies (km/L)**, isolating calculations for Unleaded 91, Premium 95, Premium 98, or Diesel.
3. **Interactive Fuel Type Stock Warnings:** Dynamically monitors fuel stock shortfalls. Shortage indicator flags (`⚠️ Out of stock`) with strikethrough prices appear when a station runs out of the active vehicle's preferred fuel.
4. **High-Variance Coordinates & Price Cycle Simulator:** Shifts simulated GPS coords in a **9km radius** (covering Brunswick, Hawthorn, Footscray, Carlton, and St Kilda) and injects highly active **± $0.20 AUD** price fluctuations (a 40c retail spread) to model dynamic market cycles.
5. **Offline Zustand Storage & Logbook:** Persists vehicle garage data and refuelling ledgers locally so drivers can use the app on the go, tracking running logs and **lifetime savings** achieved.

### Limitations
1. **Not real data:** Currently uses only dummy data due to inability of accessing real-time fuel prices data on Australia.
2. **No user auth:** Stores only one data/one account for demo.
3. **Fuel indicator state:** Does not have its own state for different vehicles. As it is currently only used for demo to calculate savings and still does not implement the real calculation with distance traveled.
4. **AI design:** Designs on the app is still very AI. Design references were applied only for a few key parts.
---

## 📐 The Detour Mathematical Engine

To ensure drivers only make detours that actively save them money, the predictive engine executes a 4-step math check on requests:

$$\text{1. Litres Needed} = \text{Active Car Tank Capacity} \times \left(1 - \frac{\text{Current Fuel Slider \%}}{100}\right)$$

$$\text{2. Gross Savings} = \left(\text{Local Average Suburb Price} - \text{Servo Price}\right) \times \text{Litres Needed}$$

$$\text{3. Detour Transit Cost} = \left(\frac{\text{Detour Proximity Distance in km}}{\text{Active Car Fuel Efficiency in km/L}}\right) \times \text{Servo Price}$$

$$\text{4. Net Detour Value} = \text{Gross Savings} - \text{Detour Transit Cost}$$

- **The Decision:** The servo is recommended only if the calculated **Net Detour Value is $> \$2.00\text{ AUD}$**.
- **Out-of-Stock Protection:** Out-of-stock servos default to a negative sentinel net value ($-999$), naturally sorting them to the bottom of the saving prioritizations.

---

## 📂 Project Structure

```bash
src/
├── app/
│   ├── api/
│   │   └── stations/
│   │       └── route.ts       # Seeds Melbourne CBD coordinate servos & ±$0.20 price spreads
│   ├── globals.css            # Defines Figma Neutrals, viz scales, and capsule tag styles
│   ├── layout.tsx             # Optimizes metadata, Inter and DM Mono Light fonts imports
│   └── page.tsx               # High-fidelity dashboard, GPS coordinate hopping & auth gates
├── store/
│   └── useVehicleStore.ts     # Offline Zustand storage, multi-car garage & log history
└── utils/
    └── predictiveEngine.ts    # Distance (Haversine formula) & detour value calculations
```

---

## 🚀 Getting Started

### 1. Installation

Clone the repository and install the standard dependencies:

```bash
npm install
```

### 2. Launch Local Development

Start the local development server on `http://localhost:3000`:

```bash
npm run dev
```

### 3. Production Compilation

Compile the application to generate highly optimized static page bundles and client assets:

```bash
npm run build
```

### 4. Running TypeScript Verification

Run type checking to ensure syntax validity and zero compile warnings:

```bash
npx tsc --noEmit
```
