'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PlacesHttpAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  apiKey?: string;
  minLength?: number;
}

type PlaceSuggestion = {
  id?: string;
  text: string;
};

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';
const FIELD_MASK = 'suggestions.placePrediction.text.text,suggestions.placePrediction.placeId';

function createSessionToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export default function PlacesHttpAutocomplete({
  value,
  onChange,
  placeholder = 'Search location',
  className,
  disabled = false,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '',
  minLength = 2,
}: PlacesHttpAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debug logging for API key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔑 Places API Key Check:', {
        exists: !!apiKey,
        length: apiKey?.length || 0,
        preview: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NONE',
        envVar: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ? 'SET' : 'NOT SET',
        hostname: window.location.hostname
      });
    }
  }, [apiKey]);
  const abortController = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string>(createSessionToken());

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const debouncedValue = useDebounce(inputValue, 250);

  useEffect(() => {
    // If no API key or disabled, just work as a regular input (no autocomplete)
    if (!apiKey || disabled) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      if (!apiKey && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        console.error('⚠️ Google Places API Key is missing in production. Add NEXT_PUBLIC_GOOGLE_PLACES_API_KEY to your Vercel environment variables.');
      }
      setError(null);
      return;
    }

    if (!debouncedValue || debouncedValue.trim().length < minLength) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    const fetchSuggestions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(AUTOCOMPLETE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': FIELD_MASK,
          },
          signal: controller.signal,
          body: JSON.stringify({
            input: debouncedValue,
            sessionToken: sessionTokenRef.current,
            includedPrimaryTypes: ['(cities)'],
            languageCode: 'en',
          }),
        });

        if (!response.ok) {
          // Log detailed error information for debugging
          const errorBody = await response.text();
          console.error('❌ Google Places API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorBody,
            apiKeyExists: !!apiKey,
            apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NONE',
            endpoint: AUTOCOMPLETE_ENDPOINT,
            environment: typeof window !== 'undefined' ? window.location.hostname : 'server'
          });
          setError(`API Error: ${response.status} - ${errorBody.substring(0, 100)}`);
          setSuggestions([]);
          setOpen(false);
          return;
        }

        const data: {
          suggestions?: Array<{
            placePrediction?: {
              placeId?: string;
              text?: {
                text?: string;
              };
            };
          }>;
        } = await response.json();

        const mappedSuggestions =
          data.suggestions
            ?.map((suggestion) => {
              const prediction = suggestion.placePrediction;
              const text = prediction?.text?.text?.trim();
              if (!text) return null;
              return {
                id: prediction?.placeId,
                text,
              } as PlaceSuggestion;
            })
            .filter((suggestion): suggestion is PlaceSuggestion => Boolean(suggestion && suggestion.text)) ?? [];

        setSuggestions(mappedSuggestions);
        setOpen(mappedSuggestions.length > 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        // Silently fail - just work as regular input
        console.warn('Places autocomplete error (working as regular input):', err);
        setSuggestions([]);
        setOpen(false);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      controller.abort();
    };
  }, [apiKey, debouncedValue, disabled, minLength]);

  const handleSelect = (suggestion: PlaceSuggestion) => {
    onChange(suggestion.text);
    setInputValue(suggestion.text);
    setOpen(false);
    setSuggestions([]);
    sessionTokenRef.current = createSessionToken();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    onChange(nextValue);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={loading ? 'Searching...' : placeholder}
        className={[
          'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        autoComplete="off"
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
      />

      {error && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600">
          Autocomplete error: {error}
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id ?? suggestion.text}
              onMouseDown={(event) => {
                event.preventDefault();
                handleSelect(suggestion);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-800"
            >
              {suggestion.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
