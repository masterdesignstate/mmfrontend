'use client';

import React, { useRef, useEffect } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries: ("places")[] = ['places'];

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  apiKey?: string;
}

export default function PlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Enter city name',
  className = '',
  disabled = false,
  apiKey,
}: PlacesAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  // Handle place selection
  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (place && place.formatted_address) {
        // Extract city and state from address components
        const addressComponents = place.address_components || [];
        let city = '';
        let state = '';
        let country = '';

        addressComponents.forEach((component) => {
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            state = component.short_name;
          }
          if (component.types.includes('country')) {
            country = component.short_name;
          }
        });

        // Format as "City, State" or use full formatted address as fallback
        const formattedLocation = city && state
          ? `${city}, ${state}`
          : place.formatted_address;

        onChange(formattedLocation);
      }
    }
  };

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  // Fallback to regular input if no API key or loading error
  if (!apiKey || loadError) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    );
  }

  // Show loading state
  if (!isLoaded) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Loading..."
        className={className}
        disabled={true}
      />
    );
  }

  // Render autocomplete
  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        types: ['(cities)'], // Restrict to cities only
        fields: ['address_components', 'formatted_address'],
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    </Autocomplete>
  );
}
