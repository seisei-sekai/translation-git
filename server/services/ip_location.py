"""
IP Location Service
Provides geolocation lookup for IP addresses using ip-api.com
"""
import requests as http_requests


def get_ip_location(ip_address):
    """
    Get geolocation information for an IP address using ip-api.com (free service)
    
    Args:
        ip_address (str): The IP address to lookup
        
    Returns:
        dict: Location information including country, city, region, etc.
              Returns None if lookup fails or for local/private IPs
    """
    try:
        # Skip lookup for local/private IPs
        if ip_address in ('127.0.0.1', 'localhost') or ip_address.startswith(('192.168.', '10.', '172.')):
            return None
            
        # Call ip-api.com free API
        response = http_requests.get(f'http://ip-api.com/json/{ip_address}', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                # Return dictionary directly for JSON column
                return {
                    'country': data.get('country'),
                    'country_code': data.get('countryCode'),
                    'region': data.get('region'),
                    'region_name': data.get('regionName'),
                    'city': data.get('city'),
                    'zip': data.get('zip'),
                    'lat': data.get('lat'),
                    'lon': data.get('lon'),
                    'timezone': data.get('timezone'),
                    'isp': data.get('isp'),
                    'org': data.get('org')
                }
                
        return None
        
    except Exception as e:
        # Log error if needed: app.logger.error(f"IP location lookup failed: {str(e)}")
        return None

