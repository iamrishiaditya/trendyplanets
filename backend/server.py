import os
import math
import glob
import numpy as np
from pathlib import Path
import rasterio
import h5py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import netCDF4 as nc

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Base Directory logic so it always finds the 'data' folder correctly
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "raw" / "new-delhi"
DELHI_BOUNDS = {"min_lat": 28.0, "max_lat": 29.0, "min_lon": 77.0, "max_lon": 78.0}

def get_elevation_and_slope(lat, lon):
    try:
        # Smart search: finds any .hgt file in the terrain folder!
        terrain_dir = DATA_DIR / "terrain"
        hgt_files = list(terrain_dir.glob("*.hgt"))
        
        if not hgt_files:
            print(f"ERROR: No .hgt file found in {terrain_dir}")
            return "N/A", "N/A"
            
        srtm_path = str(hgt_files[0]) # Use the first .hgt file found
        print(f"Reading Terrain from: {srtm_path}")
        
        with rasterio.open(srtm_path) as dataset:
            row, col = dataset.index(lon, lat)
            window = dataset.read(1, window=((row-1, row+2), (col-1, col+2)))
            
            elevation = float(window[1, 1])
            if elevation < -500: return "N/A", "N/A"
            
            dx = (int(window[1, 2]) - int(window[1, 0])) / 60.0
            dy = (int(window[0, 1]) - int(window[2, 1])) / 60.0
            slope = math.sqrt(dx**2 + dy**2) * 100
            return int(elevation), round(slope, 1)
    except Exception as e:
        print(f"Terrain Parsing Error: {e}")
        return "N/A", "N/A"

def get_extreme_rain(lat, lon):
    try:
        # Smart search: finds the HDF5 precipitation file
        precip_dir = DATA_DIR / "precipitation"
        h5_files = list(precip_dir.glob("*.HDF5"))
        
        if not h5_files:
            print(f"ERROR: No .HDF5 file found in {precip_dir}")
            return "N/A"
            
        imerg_path = str(h5_files[0])
        print(f"Reading Precipitation from: {imerg_path}")
        
        with h5py.File(imerg_path, 'r') as f:
            # Navigate NASA's GPM IMERG internal Grid structure
            lats = f['Grid/lat'][:]
            lons = f['Grid/lon'][:]
            precip = f['Grid/precipitation'][:] 
            
            # Snap to nearest satellite pixel
            lat_idx = (np.abs(lats - lat)).argmin()
            lon_idx = (np.abs(lons - lon)).argmin()
            
            # GPM matrices are typically formatted as [time, lon, lat]
            val = float(precip[0, lon_idx, lat_idx])
            
            if val < 0: return "N/A" # NASA fill values for missing data
            return round(val, 2)
            
    except Exception as e:
        print(f"Precipitation Parsing Error: {e}")
        return "N/A"

def get_groundwater_anomaly(lat, lon):
    try:
        # Smart search: finds the GRACE NetCDF file
        nc_dir = DATA_DIR / "water-storage"
        nc_files = list(nc_dir.glob("*.nc"))
        
        if not nc_files: return "N/A"
        
        ds = nc.Dataset(nc_files[0])
        lats = ds.variables['lat'][:]
        lons = ds.variables['lon'][:]
        
        # 'lwe_thickness' = Liquid Water Equivalent thickness anomaly (cm)
        lwe = ds.variables['lwe_thickness'][:]
        
        # NASA GRACE longitude is 0.5 to 359.5, adjust standard -180/180
        lon_adj = lon if lon >= 0 else 360 + lon
        lat_idx = (np.abs(lats - lat)).argmin()
        lon_idx = (np.abs(lons - lon_adj)).argmin()
        
        # Grab the latest available month of data from the stack
        val = float(lwe[-1, lat_idx, lon_idx])
        if np.isnan(val): return "N/A"
        
        return round(val, 2)
    except Exception as e:
        print(f"GRACE NetCDF Error: {e}")
        return "N/A"
    
@app.get("/api/local-data")
def get_local_data(lat: float, lon: float):
    # Geofence check
    if not (DELHI_BOUNDS["min_lat"] <= lat <= DELHI_BOUNDS["max_lat"] and DELHI_BOUNDS["min_lon"] <= lon <= DELHI_BOUNDS["max_lon"]):
        return {"supported": False, "message": "High-resolution local data not configured for this region."}

    elevation, slope = get_elevation_and_slope(lat, lon)
    rain_intensity = get_extreme_rain(lat, lon)
    groundwater = get_groundwater_anomaly(lat, lon)
    
    return {
        "supported": True,
        "metrics": {
            "elevation_meters": elevation,
            "slope_percentage": slope,
            "rain_mm_hr": rain_intensity,
            "groundwater_anomaly_cm": groundwater
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)