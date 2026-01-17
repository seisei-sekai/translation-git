import json
from collections import Counter
from pathlib import Path

def count_osm_nodes():
    try:
        # Read the JSON file
        with open('tokyo_osm_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Get all elements
        elements = data.get('elements', [])
        
        # Count by type
        type_counts = Counter(elem.get('type') for elem in elements)
        
        # Count tags
        tag_counts = Counter()
        for elem in elements:
            if 'tags' in elem:
                tag_counts.update(elem['tags'].keys())
        
        # Print results
        print(f"\nTotal elements: {len(elements)}")
        print("\nCount by type:")
        for type_name, count in type_counts.items():
            print(f"{type_name}: {count}")
        
        print("\nTop 10 most common tags:")
        for tag, count in tag_counts.most_common(10):
            print(f"{tag}: {count}")
            
        return len(elements)
        
    except FileNotFoundError:
        print("Error: tokyo_osm_data.json not found")
        return 0
    except json.JSONDecodeError:
        print("Error: Invalid JSON format")
        return 0

if __name__ == "__main__":
    count_osm_nodes()