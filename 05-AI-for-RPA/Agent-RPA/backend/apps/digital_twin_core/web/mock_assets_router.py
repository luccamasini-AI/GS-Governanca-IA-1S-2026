from fastapi import APIRouter
from typing import List, Dict, Any
from uuid import uuid4

router = APIRouter(prefix="/assets", tags=["Asset Manager Mock"])

MOCK_MOTOR_MODELS = [
    {
        "id": "mock-nasa-turbofan",
        "brand": "NASA",
        "model": "Turbofan C-MAPSS",
        "power_hp": 50000.0,
        "spec_reference": "FD003",
        "default_thresholds": {}
    }
]

MOCK_VARIABLES = [
    {"id": "var-t2", "name": "T2", "unit": "°R", "description": "Total temperature at fan inlet"},
    {"id": "var-t24", "name": "T24", "unit": "°R", "description": "Total temperature at LPC outlet"},
    {"id": "var-t30", "name": "T30", "unit": "°R", "description": "Total temperature at HPC outlet"},
    {"id": "var-t50", "name": "T50", "unit": "°R", "description": "Total temperature at LPT outlet"},
    {"id": "var-p2", "name": "P2", "unit": "psia", "description": "Pressure at fan inlet"},
    {"id": "var-p15", "name": "P15", "unit": "psia", "description": "Total pressure in bypass-duct"},
    {"id": "var-p30", "name": "P30", "unit": "psia", "description": "Total pressure at HPC outlet"},
    {"id": "var-nf", "name": "Nf", "unit": "rpm", "description": "Physical fan speed"},
    {"id": "var-nc", "name": "Nc", "unit": "rpm", "description": "Physical core speed"}
]

MOCK_SENSORS = [
    {
        "id": "sensor-nasa",
        "model_name": "NASA Telemetry Array",
        "manufacturer": "NASA",
        "protocol": "MQTT"
    }
]

# We will maintain an in-memory list of assets to allow the user to "create" and "delete"
# so the UI works exactly as before.
in_memory_assets = [
    {
        "id": "cmapss-fleet-1",
        "name": "Frota FD001 (NASA C-MAPSS)",
        "location": "Dataset 1",
        "status": "operational",
        "motor_model_id": "mock-nasa-turbofan",
        "applied_thresholds": {}
    },
    {
        "id": "cmapss-fleet-2",
        "name": "Frota FD002 (NASA C-MAPSS)",
        "location": "Dataset 2",
        "status": "operational",
        "motor_model_id": "mock-nasa-turbofan",
        "applied_thresholds": {}
    },
    {
        "id": "cmapss-fleet-3",
        "name": "Frota FD003 (NASA C-MAPSS)",
        "location": "Dataset 3",
        "status": "operational",
        "motor_model_id": "mock-nasa-turbofan",
        "applied_thresholds": {}
    },
    {
        "id": "cmapss-fleet-4",
        "name": "Frota FD004 (NASA C-MAPSS)",
        "location": "Dataset 4",
        "status": "operational",
        "motor_model_id": "mock-nasa-turbofan",
        "applied_thresholds": {}
    }
]

@router.get("/models")
async def list_models():
    return MOCK_MOTOR_MODELS

@router.get("/variables")
async def list_variables():
    return MOCK_VARIABLES

@router.get("/sensors")
async def list_sensors():
    return MOCK_SENSORS

@router.get("/dashboard")
async def get_dashboard_data():
    dashboard_assets = []
    for asset in in_memory_assets:
        mapped_sensors = []
        for var in MOCK_VARIABLES:
            var_slug = var["name"].lower().replace(" ", "_")
            asset_slug = asset["name"].lower().replace(" ", "_").replace("-", "").replace("(", "").replace(")", "")
            mapped_sensors.append({
                "variable": var["name"],
                "variable_id": var["id"],
                "unit": var["unit"],
                "topic": f"digitaltwin/telemetry/{asset_slug}/{var_slug}",
                "sensor_model": "NASA Telemetry Array",
                "thresholds": {"nominal": 0, "warning": 80, "critical": 100}
            })
            
        dashboard_assets.append({
            "id": asset["id"],
            "name": asset["name"],
            "location": asset["location"],
            "status": asset["status"],
            "motor_model": MOCK_MOTOR_MODELS[0],
            "applied_thresholds": asset.get("applied_thresholds", {}),
            "sensors": mapped_sensors
        })
        
    return dashboard_assets

@router.post("/active")
async def create_active_asset(asset: Dict[str, Any]):
    new_asset = {
        "id": str(uuid4()),
        "name": asset.get("name", "New Asset"),
        "location": asset.get("location", "Unknown Location"),
        "status": "operational",
        "motor_model_id": asset.get("motor_model_id", "mock-nasa-turbofan"),
        "applied_thresholds": asset.get("applied_thresholds", {})
    }
    in_memory_assets.append(new_asset)
    return new_asset

@router.delete("/active/{id}")
async def delete_active_asset(id: str):
    global in_memory_assets
    in_memory_assets = [a for a in in_memory_assets if a["id"] != id]
    return {"message": "Asset deleted successfully"}

@router.patch("/active/{id}")
async def update_active_asset(id: str, updates: Dict[str, Any]):
    for asset in in_memory_assets:
        if asset["id"] == id:
            for k, v in updates.items():
                asset[k] = v
            return asset
    return {"message": "Not found"}

@router.get("/anomalies")
async def get_anomalies():
    return []

@router.post("/mappings")
async def create_mapping(mapping: Dict[str, Any]):
    return mapping
