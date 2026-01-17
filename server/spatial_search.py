import json
from math import radians, cos, sin, asin, sqrt
import collections
import time

# Global variables to store the loaded data and spatial index
_spatial_index = None
_data_loaded = False

class SpatialIndex:
    def __init__(self, grid_size=0.01):  # Approximately 1km grid cells
        self.grid_size = grid_size
        self.grid = collections.defaultdict(list)
        self.nodes = {}
    
    def _get_grid_cell(self, lat, lon):
        # Convert coordinates to grid cell indices
        lat_idx = int(lat / self.grid_size)
        lon_idx = int(lon / self.grid_size)
        return (lat_idx, lon_idx)
    
    def build_index(self, nodes):
        """Build spatial index from nodes data"""
        for node in nodes:
            if 'lat' in node and 'lon' in node:
                lat, lon = node['lat'], node['lon']
                cell = self._get_grid_cell(lat, lon)
                self.grid[cell].append(node['id'])
                self.nodes[node['id']] = node

    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate the distance between two points in kilometers"""
        R = 6371  # Earth's radius in kilometers

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        return R * c

    def search_nearby(self, lat, lon, radius_km=1.0):
        """Search for nodes within radius_km of the given coordinates"""
        # Convert radius to approximate grid cells
        cell_radius = int(radius_km / (self.grid_size * 111)) + 1  # 111km per degree
        center_cell = self._get_grid_cell(lat, lon)
        
        nearby_nodes = []
        
        # Search surrounding grid cells
        for i in range(-cell_radius, cell_radius + 1):
            for j in range(-cell_radius, cell_radius + 1):
                cell = (center_cell[0] + i, center_cell[1] + j)
                
                # Get nodes in this cell
                for node_id in self.grid.get(cell, []):
                    node = self.nodes[node_id]
                    distance = self.haversine_distance(
                        lat, lon, 
                        node['lat'], node['lon']
                    )
                    
                    if distance <= radius_km:
                        nearby_nodes.append({
                            'node': node,
                            'distance': distance
                        })
        
        # Sort by distance
        nearby_nodes.sort(key=lambda x: x['distance'])
        return nearby_nodes

def initialize_data():
    """Load data and initialize spatial index once at server startup"""
    global _spatial_index, _data_loaded
    
    if _data_loaded:
        return _spatial_index
        
    try:
        start_load = time.time()
        
        # Read the JSON file
        with open('map_db/tokyo_osm_data_11042024.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Initialize spatial index and build index
        _spatial_index = SpatialIndex()
        nodes = [elem for elem in data.get('elements', []) if elem.get('type') == 'node']
        _spatial_index.build_index(nodes)
        
        load_time = time.time() - start_load
        print("\nInitial Data Loading Time:", f"{load_time:.3f} seconds")
        
        _data_loaded = True
        return _spatial_index
        
    except Exception as e:
        print(f"Error initializing data: {str(e)}")
        return None

def load_and_search(lat, lon, radius_km=1.0):
    """Perform spatial search using pre-loaded data"""
    global _spatial_index
    
    try:
        # Use existing spatial index or initialize if not loaded
        if not _spatial_index:
            _spatial_index = initialize_data()
            if not _spatial_index:
                return []
        
        # Perform search
        start_search = time.time()
        results = _spatial_index.search_nearby(lat, lon, radius_km)
        search_time = time.time() - start_search
        
        print(f"Search execution: {search_time:.3f} seconds")
        
        return results
        
    except Exception as e:
        print(f"Error in search: {str(e)}")
        return []

if __name__ == "__main__":
    # Example usage
    TEST_LAT = 35.6895
    TEST_LON = 139.6917
    TEST_RADIUS = 0.1 # Search radius in kilometers
    
    results = load_and_search(TEST_LAT, TEST_LON, TEST_RADIUS)
    
    print(f"\nFound {len(results)} nodes within {TEST_RADIUS}km of ({TEST_LAT}, {TEST_LON}):")
    for item in results:  # Show first 5 results
        node = item['node']
        print(f"\nID: {node['id']}")
        print(f"Distance: {item['distance']:.2f}km")
        print(f"Location: ({node['lat']}, {node['lon']})")
        if 'tags' in node:
            print("Tags:", node['tags'])