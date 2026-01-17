import React, { useState, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Autocomplete } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { getGlobalState, setGlobalState } from '../../globalState';
import './Map.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { eatTags, shopTags, entertainmentTags, utilityTags } from './tag';

const containerStyle = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0
};

let center = {
  lat: 35.7033,  // Updated to Kichijōji Station latitude
  lng: 139.5799  // Updated to Kichijōji Station longitude
};

const Map = () => {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocationS, setUserLocationS] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: 35.7033,  // Kichijōji Station latitude (default)
    lng: 139.5799  // Kichijōji Station longitude (default)
  });
  const { t } = useTranslation();
  const [statusBarHeight, setStatusBarHeight] = useState(40);
  const [isStatusBarExpanded, setIsStatusBarExpanded] = useState(false);
  const statusBarRef = useRef(null);
  const navigate = useNavigate();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [nearbyLocations, setNearbyLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const local_url = process.env.REACT_APP_API_URL || window.location.origin;
  const [loadingRatings, setLoadingRatings] = useState({});
  const mapRef = useRef(null);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [selectedRating, setSelectedRating] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedLanguageRating, setSelectedLanguageRating] = useState('All');

  const filterByRating = (location) => {
    const locationTagsAndValues = Object.entries(location.tags || {}).flatMap(([key, value]) => [key, value]);
    const threeStarRestaurants = ['yoshinoya', 'sukiya', 'matsuya'];
    
    switch (selectedRating) {
      case 'All':
        return true;
      case '3 Stars':
        return locationTagsAndValues.some(item => 
          threeStarRestaurants.some(restaurant => 
            item.toLowerCase().includes(restaurant.toLowerCase())
          )
        );
      case 'Unknown':
        return !locationTagsAndValues.some(item => 
          threeStarRestaurants.some(restaurant => 
            item.toLowerCase().includes(restaurant.toLowerCase())
          )
        );
      default:
        return false; // For now, other ratings return false
    }
  };

  const filterLocations = (filter) => {
    setSelectedFilter(filter);
    
    if (filter === 'All' && selectedRating === 'All') {
      setFilteredLocations(nearbyLocations);
      return;
    }

    const tagLists = {
      'Food': eatTags,
      'Shop': shopTags,
      'Entertainment': entertainmentTags,
      'Utility': utilityTags
    };

    const filtered = nearbyLocations.filter(location => {
      const locationTagsAndValues = Object.entries(location.tags || {}).flatMap(([key, value]) => [key, value]);
      
      // Check category filter
      let passesTypeFilter = filter === 'All';
      if (!passesTypeFilter) {
        if (filter === 'Other') {
          passesTypeFilter = !locationTagsAndValues.some(item => 
            eatTags.includes(item) || 
            shopTags.includes(item) || 
            entertainmentTags.includes(item) || 
            utilityTags.includes(item)
          );
        } else {
          passesTypeFilter = locationTagsAndValues.some(item => tagLists[filter]?.includes(item));
        }
      }

      // Check rating filter
      const passesRatingFilter = filterByRating(location);

      // Location must pass both filters
      return passesTypeFilter && passesRatingFilter;
    });

    setFilteredLocations(filtered);
  };

  useEffect(() => {
    filterLocations(selectedFilter);
  }, [nearbyLocations]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapLoad = (map) => {
    mapRef.current = map;
    setIsLoaded(true);
  };

  const onLoad = (autocomplete) => {
    setSearchBox(autocomplete);
  };

  const onPlaceChanged = () => {
    if (searchBox) {
      const place = searchBox.getPlace();
      if (place.geometry) {
        setSelectedPlace({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };


  
  const locateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
          try {
            console.log("this is position")
            console.log(position);
            const { latitude, longitude } = position.coords;
            const newLocation = { lat: latitude, lng: longitude };
            
            // Wrap state updates in a try-catch block
            try {
              setUserLocationS(newLocation);
              setMapCenter(newLocation);
            } catch (error) {
              console.error("Error updating state:", error);
              alert("Unable to update location state");
            }
          } catch (error) {
            console.error("Error processing location data:", error);
            alert("Unable to process your location data");
          }
        },
        // Error callback
        (error) => {
          let errorMessage;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission was denied. Please enable location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
            default:
              errorMessage = "An unknown error occurred while getting location.";
          }
          console.error("Geolocation error:", error);
          alert(errorMessage);
        },
        // Options
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error("Error requesting location:", error);
      alert("Failed to request location. Please try again.");
    }
};

  const handleChatClick = () => {
    navigate('/chat');
  };

  const getMarkerIcon = () => {
    return {
      url: `${process.env.PUBLIC_URL}/map_international_icon_yoohi.png`,
      scaledSize: new window.google.maps.Size(55, 55)
    };
  };

  const darkModeStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ];

  // Define the position constant
  const ZOOM_POSITION = 3; // This is equivalent to google.maps.ControlPosition.RIGHT_TOP

  const handleScriptLoad = () => {
    setIsScriptLoaded(true);
  };

  const handleScriptError = () => {
    console.error('Google Maps script failed to load');
  };

  const handleNearbySearch = () => {
    const zoomToRadius = {
      15: 0.8,
      14: 1.6,
      13: 3.2,
    };
  
    const currentZoom = 15;
    const radius = zoomToRadius[currentZoom] || 1.0;

    axios.post(`${local_url}/api/getNearbyLocationInfo`, {
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      radius: radius
    })
    .then(response => {
      setNearbyLocations(response.data.locations);
      
      const tagLists = {
        'Food': eatTags,
        'Shop': shopTags,
        'Entertainment': entertainmentTags,
        'Utility': utilityTags
      };

      if (selectedFilter === 'All') {
        setFilteredLocations(response.data.locations);
        return;
      }

      const filtered = response.data.locations.filter(location => {
        const locationTagsAndValues = Object.entries(location.tags || {}).flatMap(([key, value]) => [key, value]);
        
        if (selectedFilter === 'Other') {
          return locationTagsAndValues.some(item => 
            !eatTags.includes(item) && 
            !shopTags.includes(item) && 
            !entertainmentTags.includes(item) && 
            !utilityTags.includes(item)
          );
        }
        
        return locationTagsAndValues.some(item => tagLists[selectedFilter]?.includes(item));
      });

      setFilteredLocations(filtered);
    })
    .catch(error => {
      console.error('Error fetching nearby locations:', error);
    });
  };

  const handleGetAIRating = async (location) => {
    setLoadingRatings(prev => ({ ...prev, [location.id]: true }));
    const uiLanguage = getGlobalState('uiLanguage') || 'English';
    
    try {
      const response = await axios.post(`${local_url}/api/get_ai_rating_shop_single`, {
        nodeData: location,
        uiLanguage: uiLanguage
      });
      setSelectedLocation(prev => ({
        ...prev,
        aiRating: response.data.rating
      }));
    } catch (error) {
      console.error('Error getting AI rating:', error);
    } finally {
      setLoadingRatings(prev => ({ ...prev, [location.id]: false }));
    }
  };

  const getMarkerIconByTags = (location) => {
    const locationTagsAndValues = Object.entries(location.tags || {}).flatMap(([key, value]) => [key, value]);
    
    // Check if location has any tags from our defined categories
    if (locationTagsAndValues.some(item => eatTags.includes(item))) {
      return {
        url: `${process.env.PUBLIC_URL}/map_international_icon_red.png`,
        scaledSize: new window.google.maps.Size(35, 35)
      };
    }
    if (locationTagsAndValues.some(item => shopTags.includes(item))) {
      return {
        url: `${process.env.PUBLIC_URL}/map_international_icon_blue.png`,
        scaledSize: new window.google.maps.Size(35, 35)
      };
    }
    if (locationTagsAndValues.some(item => entertainmentTags.includes(item))) {
      return {
        url: `${process.env.PUBLIC_URL}/map_international_icon_purple.png`,
        scaledSize: new window.google.maps.Size(35, 35)
      };
    }
    if (locationTagsAndValues.some(item => utilityTags.includes(item))) {
      return {
        url: `${process.env.PUBLIC_URL}/map_international_icon_black.png`,
        scaledSize: new window.google.maps.Size(35, 35)
      };
    }
    // If location doesn't match any category, it's "Other"
    return {
      url: `${process.env.PUBLIC_URL}/map_international_icon_white.png`,
      scaledSize: new window.google.maps.Size(35, 35)
    };
  };

  const renderNearbyLocations = () => {
    return filteredLocations.map((location, index) => (
      <React.Fragment key={location.id}>
        <MarkerF
          position={{ lat: location.lat, lng: location.lon }}
          onClick={() => setSelectedLocation(location)}
          icon={getMarkerIconByTags(location)}
        />
        {selectedLocation?.id === location.id && (
          <div className="fixed-info-window">
            <button 
              className="fixed-info-window-close"
              onClick={() => setSelectedLocation(null)}
            >
              ×
            </button>
            <div className="info-window-content">


              {Object.entries(location.tags || {}).map(([key, value]) => (
                <p key={key}><strong>{key}:</strong> {value}</p>
              ))}
              
              {/* Google Maps Link */}
              {location.tags?.name && (
                <p>
                  <a 
                    href={`https://www.google.com/maps/search/${encodeURIComponent(location.tags.name)}/@${location.lat},${location.lon},20z`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Map Link
                  </a>
                </p>
              )}
              <div className="info-window-buttons">
                <button className="info-window-button">Review (0)</button>
                <button className="info-window-button">Rating</button>
                <button className="info-window-button">Edit Info</button>
              </div>
              {/* AI Rating Button */}
              <button 
                onClick={() => handleGetAIRating(location)}
                className="ai-rating-button"
              >
                Get AI Rating on this location's translation service
              </button>
              
              {/* AI Rating Result */}
              {loadingRatings[location.id] ? (
                <p>Loading...</p>
              ) : selectedLocation.aiRating ? (
                <div className="ai-rating-result">
                  {selectedLocation.aiRating}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </React.Fragment>
    ));
  };

  const handleCenterChanged = () => {
    if (!mapRef.current || isMapDragging) return;
    
    const newCenter = mapRef.current.getCenter();
    const newLat = newCenter.lat();
    const newLng = newCenter.lng();
    
    // Only update if the change is significant
    if (Math.abs(newLat - mapCenter.lat) > 0.0001 || 
        Math.abs(newLng - mapCenter.lng) > 0.0001) {
      setMapCenter({
        lat: newLat,
        lng: newLng
      });
    }
  };

  const handleDragStart = () => {
    setIsMapDragging(true);
  };

  const handleDragEnd = () => {
    setIsMapDragging(false);
    if (mapRef.current) {
      const newCenter = mapRef.current.getCenter();
      setMapCenter({
        lat: newCenter.lat(),
        lng: newCenter.lng()
      });
    }
  };

  const handleRatingFilterChange = (rating) => {
    setSelectedRating(rating);
    filterLocations(selectedFilter); // Reapply both filters
  };

  return (
    <div className="map-container">
      <div className="floating-filter">
        <div className="filter-label">Type:</div>
        <select 
          value={selectedType}
          onChange={(e) => filterLocations(e.target.value)}
          className="filter-dropdown"
        >
          <option value="All">All</option>
          <option value="Food">Food</option>
          <option value="Shop">Shop</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Utility">Utility</option>
          <option value="Other">Other</option>
        </select>
        
        <div className="filter-label">Language Rating:</div>
        <select 
          value={selectedLanguageRating}
          onChange={(e) => handleRatingFilterChange(e.target.value)}
          className="filter-dropdown rating-filter"
        >
          <option value="All">All Ratings</option>
          <option value="Yoohi Premium">Yoohi Premium</option>
          <option value="5 Stars">5 Stars</option>
          <option value="4 Stars">4 Stars</option>
          <option value="3 Stars">3 Stars</option>
          <option value="2 Stars">2 Stars</option>
          <option value="1 Star">1 Star</option>
          <option value="Unknown">Unknown</option>
        </select>
      </div>

      {/* <div className="floating-add-location">
        <div className="contributor-label">For Contributors:</div>
        <button className="add-location-button">Add Location</button>
      </div> */}

      <div className="map-interaction-container">
        <div className="search-box-container">
          {isLoaded && (
            <Autocomplete
              onLoad={onLoad}
              onPlaceChanged={onPlaceChanged}
              options={{
                fields: ["geometry", "name"],
                strictBounds: false,
              }}
            >
              <input
                type="text"
                placeholder={t('Search location...')}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </Autocomplete>
          )}
        </div>
      </div>
      <div className="floating-locate-button">
        <button className="map-action-button" onClick={locateUser}>
          <img
            src={`${process.env.PUBLIC_URL}/map_my_location.svg`}
            alt={t('My Location')}
            className="map-icon"
          />
        </button>
      </div>

      <div className="map-status-bar">
        <div className="map-header-setting">
          <div className="fixed-button-container left" >
            <button className="map-action-button">
              <img
                src={`${process.env.PUBLIC_URL}/map_hot_icon.svg`}
                alt={t('Fire')}
                className="map-icon"
              />
            </button>
          </div>

          <div className="map-title">
            {t('Map')}
          </div>

          <div className="fixed-button-container right">
            <button className="map-action-button" onClick={handleChatClick}>
              <img
                src={`${process.env.PUBLIC_URL}/map_statusbar_chat.svg`}
                alt={t('Chat')}
                className="map-icon"
              />
            </button>
          </div>
        </div>

        <div 
          className={`map-status-bar-content ${isStatusBarExpanded ? 'expanded' : 'minimized'}`}
          style={{ height: `${statusBarHeight}px` }}
          ref={statusBarRef}
        >

        </div>
      </div>

      <div className="floating-nearby-button">
        <button className="map-action-button" onClick={handleNearbySearch}>
          <img
            src={`${process.env.PUBLIC_URL}/Cut.png`}
            alt={t('Nearby Locations')}
            className="map-icon"
          />
        </button>
      </div>

      <LoadScript
        googleMapsApiKey="AIzaSyC7SqC_ucof71wpddJ9MyyyZaElaTUfQxY"
        libraries={['places', 'marker']}
        language="en"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
        preventGoogleFontsLoading={true}
        loadingElement={<div>Loading...</div>}
      >
        {isScriptLoaded && (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={selectedPlace || userLocationS || mapCenter}
            zoom={15}
            onLoad={handleMapLoad}
            options={{
              clickableIcons: false,
              styles: [
                // ...darkModeStyle,
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }]
                },
                // {
                //   featureType: "poi",
                //   elementType: "geometry",
                //   stylers: [{ visibility: "off" }]
                // },
                // {
                //   featureType: "transit",
                //   elementType: "labels",
                //   stylers: [{ visibility: "off" }]
                // }
              ],
              streetViewControl: false,
              fullscreenControl: false,
              language: "en",
              mapTypeControl: false,
              zoomControl: false,
              zoomControlOptions: {
                position: ZOOM_POSITION // Using the constant instead of the API-dependent value
              },

              gestureHandling: 'greedy', // Forces single-finger panning
              scrollwheel: true,
              draggable: true,
              disableDoubleClickZoom: false,
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {isLoaded && (
              <>
                <MarkerF 
                  position={center}
                  title="Kichijōji Station"
                  onClick={() => setShowInfoWindow(!showInfoWindow)}
                  icon={getMarkerIcon()}
                />
                
                {showInfoWindow && (
                  <>
                    <style>
                      {`
                        .gm-style-iw {
                          background-color: #828282 !important;
                          color: #FFFFFF !important;
                          padding: 0 !important;
                        }
                        .gm-title {
                          background-color: #000000 !important;
                          color: #000000 !important;
                        }
                        .gm-full-width {
                          background-color: #ffffff !important;
                          color: #000000 !important;
                        }
                      `}
                    </style>
                    <InfoWindowF
                      position={center}
                      onCloseClick={() => setShowInfoWindow(false)}
                      options={{
                        pixelOffset: new window.google.maps.Size(0, -30)
                      }}
                    >
                      <div className="info-window-content">
                        <div>Hello World</div>
                      </div>
                    </InfoWindowF>
                  </>
                )}

                {selectedPlace && (
                  <MarkerF 
                    position={selectedPlace}
                    icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                  />
                )}


{userLocationS && (
                  <MarkerF
                    position={userLocationS}
                    icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                  />
                )}

                {isLoaded && renderNearbyLocations()}
              </>
            )}
          </GoogleMap>
        )}
      </LoadScript>
    </div>
  );
};

export default Map;
