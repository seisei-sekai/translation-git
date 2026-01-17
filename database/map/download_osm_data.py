import requests
import json
import time
from pathlib import Path

def download_tokyo_osm_data():
    # Overpass API endpoint
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Tokyo Station coordinates and radius
    lat = 35.6812
    lon = 139.7671
    radius = 100000  # 50km in meters
    
    # Updated query for circular area around Tokyo Station, only nodes
    query = f"""
    [out:json][timeout:900];
    (
        // Amenities
        node["amenity"](around:{radius},{lat},{lon});
        // Shops
        node["shop"](around:{radius},{lat},{lon});
        // Tourism
        node["tourism"](around:{radius},{lat},{lon});
        // Leisure
        node["leisure"](around:{radius},{lat},{lon});

        // Offices
        node["office"](around:{radius},{lat},{lon});
    );
    out body;
    """
    
    print(f"Starting download of Tokyo OSM data ({radius/1000}km radius from {lat}, {lon})...")
    
    try:
        # Make the request
        response = requests.post(overpass_url, data={"data": query})
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Parse the response
        data = response.json()
        
        # Print summary and actual data
        print(f"Downloaded {len(data['elements'])} elements")
        print("\nDownloaded data sample (first 5 elements):")
        print(json.dumps(data['elements'][:5], indent=2, ensure_ascii=False))
        print("\n... (truncated)")
        
        # Create output directory if it doesn't exist
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        
        # Save to JSON file in current directory (changed from output dir)
        output_file = Path("tokyo_osm_data.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"\nData saved to {output_file}")
        
        return data
        
    except requests.exceptions.RequestException as e:
        print(f"Error downloading data: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        return None

if __name__ == "__main__":
    # Add delay between retries if needed
    max_retries = 3
    retry_delay = 60  # seconds
    
    for attempt in range(max_retries):
        try:
            data = download_tokyo_osm_data()
            if data:
                break
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Waiting {retry_delay} seconds before retrying...")
                time.sleep(retry_delay)
            else:
                print("Max retries reached. Download failed.")
