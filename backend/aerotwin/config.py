import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = "0.3.0"
STATE_ROOT = Path(os.environ.get("AEROTWIN_HOME", ROOT)).expanduser().resolve()
DATA = STATE_ROOT / "data"
MODELS = STATE_ROOT / "models"
AIRPORTS = [
    {"iata": "BCN", "name": "Barcelona", "lat": 41.297, "lon": 2.078, "tz": "Europe/Madrid"},
    {"iata": "LHR", "name": "London", "lat": 51.470, "lon": -0.454, "tz": "Europe/London"},
    {"iata": "AMS", "name": "Amsterdam", "lat": 52.308, "lon": 4.764, "tz": "Europe/Amsterdam"},
    {"iata": "JFK", "name": "New York", "lat": 40.641, "lon": -73.778, "tz": "America/New_York"},
    {"iata": "ATL", "name": "Atlanta", "lat": 33.641, "lon": -84.428, "tz": "America/New_York"},
    {"iata": "ORD", "name": "Chicago", "lat": 41.974, "lon": -87.907, "tz": "America/Chicago"},
    {"iata": "LAX", "name": "Los Angeles", "lat": 33.942, "lon": -118.408, "tz": "America/Los_Angeles"},
    {"iata": "DFW", "name": "Dallas", "lat": 32.899, "lon": -97.040, "tz": "America/Chicago"},
]
