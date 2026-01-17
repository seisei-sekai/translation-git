import json
from math import radians, cos, sin, asin, sqrt
import collections
import time

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

def load_and_search(lat, lon, radius_km=1.0):
    """Load data and perform spatial search"""
    try:
        start_total = time.time()
        
        # Read the JSON file
        start_load = time.time()
        with open('tokyo_osm_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        load_time = time.time() - start_load
        
        # Initialize spatial index and build index
        start_index = time.time()
        spatial_index = SpatialIndex()
        nodes = [elem for elem in data.get('elements', []) if elem.get('type') == 'node']
        spatial_index.build_index(nodes)
        index_time = time.time() - start_index
        
        # Perform search
        start_search = time.time()
        results = spatial_index.search_nearby(lat, lon, radius_km)
        search_time = time.time() - start_search
        
        total_time = time.time() - start_total
        
        # Print timing information
        print("\nTiming Information:")
        print(f"Loading data: {load_time:.3f} seconds")
        print(f"Building index: {index_time:.3f} seconds")
        print(f"Search execution: {search_time:.3f} seconds")
        print(f"Total time: {total_time:.3f} seconds")
        
        return results
        
    except FileNotFoundError:
        print("Error: tokyo_osm_data.json not found")
        return []
    except json.JSONDecodeError:
        print("Error: Invalid JSON format")
        return []

if __name__ == "__main__":
    # Example usage
    TEST_LAT = 35.6895
    TEST_LON = 139.6917
    
    results = load_and_search(TEST_LAT, TEST_LON)
    
    print(f"\nFound {len(results)} nodes within 1km of ({TEST_LAT}, {TEST_LON}):")
    for item in results[:5]:  # Show first 5 results
        node = item['node']
        print(f"\nID: {node['id']}")
        print(f"Distance: {item['distance']:.2f}km")
        print(f"Location: ({node['lat']}, {node['lon']})")
        if 'tags' in node:
            print("Tags:", node['tags'])