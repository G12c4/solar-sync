<div align="center">
<img width="1200" height="475" alt="Solar Sync Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-45b8-adb2-6e31a0763ed6" />
</div>

# Solar Sync

A React/TypeScript app for tracking sun exposure and optimizing circadian rhythms. View sunrise/sunset times, UV index, vitamin D synthesis, and get personalized tips based on your location.

## Features

- **Real-time Sun Tracking** - Interactive arc showing sun position throughout the day
- **7-Day Forecast** - View sunrise/sunset data for the upcoming week
- **UV Index & Vitamin D** - Track UV levels and vitamin D synthesis status
- **Circadian Tips** - Personalized recommendations based on time of day
- **Location Aware** - GPS location or manual city selection
- **Weather Integration** - Current temperature and conditions

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Open-Meteo API (weather & geocoding)

## Run Locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

## Run with Nix

```bash
make dev    # Run dev server
make build  # Build production
make run    # Serve built app
```
