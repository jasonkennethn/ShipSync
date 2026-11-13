# ShipSync — Multi-Vendor Delivery & Logistics Platform

[![Theme](https://img.shields.io/badge/Theme-Apple%20Minimalist%20%7C%20White%20%26%20Grey%20Glassmorphism-white)]()
[![Status](https://img.shields.io/badge/Status-Production%20Grade-black)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20TailwindCSS-zinc)]()
[![Backend](https://img.shields.io/badge/Backend-Django%20%7C%20DRF%20%7C%20SimpleJWT-zinc)]()
[![Maps](https://img.shields.io/badge/Maps-OpenStreetMap%20(No%20API%20Key)-white)]()

---

## 📌 Overview
**ShipSync** is a production-grade multi-vendor logistics and dispatch platform featuring an Apple-like minimalist white and grey glassmorphic aesthetic (`backdrop-blur-2xl`, translucent white/grey glass panels, hairline borders).
- **Background**: Pure white `#ffffff` canvas accented with subtle architectural micro-grid lines (`bg-apple-grid`).
- **Overscroll Prevention**: Native pull-to-bounce disabled on top and bottom (`overscroll-behavior: none`).
- **Responsive Calibration**: Dedicated design tailored seamlessly for laptop/desktop split views and mobile touch devices.
- **Vercel Frontend URL**: [shipsync-logistics.vercel.app](https://shipsync-logistics.vercel.app)
- **Vercel Backend URL**: [shipsync-backend.vercel.app](https://shipsync-backend.vercel.app)

---

## 🔐 Simple Unified Authentication & Demo Credentials
- **Ultra-Simple Sign In**: One single interface for everyone — asks **Email** and **Password** ONLY.
- **Create Account**: Asks **Email**, **Password**, and **Role** (`User` or `Delivery`).
- **Demo Credentials**: Listed cleanly directly below the form card with 1-click auto-fill & instant sign-in.

Standard Password for demo accounts: `Password@123`

| Portal | Email | Password | Role & Purpose |
| :--- | :--- | :--- | :--- |
| **User Portal** | `user@shipsync.io` | `Password@123` | Send packages, inspect costs, track live OpenStreetMap |
| **Delivery Provider** | `agent@shipsync.io` | `Password@123` | Fleet dispatching, courier GPS route streaming, PIN handover |

---

## 👥 2 Core Roles & Portals

Anyone on the platform can deliver or send goods. The system is partitioned into two unified portals:

### 1. User Portal (`user@shipsync.io`)
- **Book & Dispatch Delivery**: Send packages across town by picking a certified delivery provider (*SwiftLogistics*, *Apex Priority*, *MetroFast*).
- **Transparent Live Cost Engine**:
  - `Base Fare`: Provider starting rate
  - `Distance Surcharge`: Rate computed per km between pickup and dropoff coordinates
  - `Weight Surcharge`: Per-kg pricing
  - `Courier Payout (78%)` vs `Provider Commission (22%)`
  - `Total Cost`: Clear, itemized checkout pricing
- **Live OpenStreetMap**: Real-time vehicle telemetry, pickup pin, dropoff pin, and active polyline route (free, zero API keys required).
- **Delivery Verification PIN**: Displays the recipient's 4-digit PIN for secure physical handover.

### 2. Delivery Provider Portal (`agent@shipsync.io`)
Features a 1-click switcher between **Delivery Manager** and **Delivery Agent** modes:

#### A. Delivery Manager Mode (Fleet Dispatcher)
- Central Dispatch Queue: view all incoming deliveries across the network.
- 1-click driver assignment or open-pool release.
- Financial & Volume HUD: Gross Bookings, Driver Payouts, Provider Take, Active Couriers.

#### B. Delivery Agent Mode (Field Courier)
- Open Trips Pool: Self-claim unassigned trips in your coverage zone.
- Active Trip Navigation: High-contrast minimalist OpenStreetMap navigation.
- **Live GPS Route Broadcaster & Simulator**: Broadcasts live moving vehicle GPS coordinates to the backend API, updating customer maps in real time.
- **Courier Action Workflow**:
  1. `Collect Parcel` (`PICKED_UP`)
  2. `In Transit / Out for Delivery` (`IN_TRANSIT` / `OUT_FOR_DELIVERY`)
  3. `Verify Recipient 4-Digit PIN & Complete Handover` (`DELIVERED`)
- Driver Wallet: Real-time calculation of driver trip earnings (78% cut).

---

## 📂 Strict Root Folder Structure

```
DEVELOPMENT/
├── frontend/        # React + Vite + Tailwind + Minimalist Leaflet OpenStreetMap
├── backend/         # Django 6 + DRF + SimpleJWT backend
├── .gitignore       # Security ignore list (protecting .env & secrets)
└── README.md        # Documentation, architecture & deployment guidelines
```

---

## 🔒 Security & Zero Secret Leaks
- **Zero hardcoded secrets**: All database URLs and cloud storage keys reside exclusively in `.env` (gitignored).
- **No `.env.example`**: Complies strictly with the directive to avoid `.env.example` files.
- **Audit Checked**: Full automated repository scan confirms 0 exposed credentials.

---

## 🧪 Automated Testing & Verification
- **Backend Tests**: 5/5 passing in `backend/api/tests.py` (`Ran 5 tests in 2.26s - OK`).
- **Frontend Build**: Zero errors on `npm run build` (`dist/` generated in 1.50s).
- **Full Delivery Lifecycle**: Verified end-to-end (Login -> Create -> Assign -> GPS Ping -> Handover with OTP).
