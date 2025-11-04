import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinTopIcon, GlobeIcon } from "@radix-ui/react-icons";

// Declaração global para Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface MapLocationProps {
  latitude: string;
  longitude: string;
  endereco: string;
  bairro: string;
  onLocationChange: (latitude: string, longitude: string) => void;
  onAddressSearch: (query: string) => void;
}

export function MapLocation({ 
  latitude, 
  longitude, 
  endereco, 
  bairro, 
  onLocationChange, 
  onAddressSearch 
}: MapLocationProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isMapLoaded, setIsMapLoaded] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  
  // Coordenadas para Jiquiriçá - BA (centro do município)
  const jiquiricaCenter = {
    lat: -13.2744,
    lng: -39.6383
  };

  // Predefined locations in Jiquiriçá
  const predefinedLocations = [
    { name: "Centro", address: "Centro, Jiquiriçá - BA", lat: "-13.2744", lng: "-39.6383" },
    { name: "Bairro São José", address: "São José, Jiquiriçá - BA", lat: "-13.2780", lng: "-39.6350" },
    { name: "Bairro Nossa Senhora", address: "Nossa Senhora, Jiquiriçá - BA", lat: "-13.2700", lng: "-39.6400" },
    { name: "Distrito de Mutuípe", address: "Mutuípe, Jiquiriçá - BA", lat: "-13.2800", lng: "-39.6200" },
    { name: "Zona Rural Norte", address: "Zona Rural Norte, Jiquiriçá - BA", lat: "-13.2600", lng: "-39.6300" },
    { name: "Zona Rural Sul", address: "Zona Rural Sul, Jiquiriçá - BA", lat: "-13.2900", lng: "-39.6500" },
  ];

  const handlePredefinedLocation = (location: typeof predefinedLocations[0]) => {
    onLocationChange(location.lat, location.lng);
    setSearchQuery(location.address);
  };


  // Carregar Google Maps API
  React.useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        setIsMapLoaded(true);
        return;
      }

      // Buscar a API key do backend
      fetch('/api/config')
        .then(res => res.json())
        .then(config => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${config.GOOGLE_MAPS_API_KEY}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            setIsMapLoaded(true);
          };
          script.onerror = () => {
            console.error('Erro ao carregar Google Maps API');
          };
          document.head.appendChild(script);
        })
        .catch(error => {
          console.error('Erro ao buscar configuração:', error);
        });
    };

    loadGoogleMaps();
  }, []);

  // Inicializar mapa quando carregado
  React.useEffect(() => {
    if (isMapLoaded && mapRef.current && window.google) {
      initializeMap();
    }
  }, [isMapLoaded]);

  // Atualizar marcador quando coordenadas mudarem
  React.useEffect(() => {
    if (mapInstanceRef.current && latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        updateMarker(lat, lng);
      }
    }
  }, [latitude, longitude]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: jiquiricaCenter,
      zoom: 14,
      mapTypeId: 'roadmap',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    mapInstanceRef.current = map;

    // Adicionar listener para cliques no mapa
    map.addListener('click', (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      onLocationChange(lat.toFixed(6), lng.toFixed(6));
      updateMarker(lat, lng);
    });

    // Se já temos coordenadas, adicionar marcador
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        updateMarker(lat, lng);
        map.setCenter({ lat, lng });
      }
    }
  };

  const updateMarker = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    // Remover marcador anterior se existir
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Criar novo marcador
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title: 'Localização selecionada',
      draggable: true
    });

    // Adicionar listener para arrastar o marcador
    marker.addListener('dragend', (event: any) => {
      const newLat = event.latLng.lat();
      const newLng = event.latLng.lng();
      onLocationChange(newLat.toFixed(6), newLng.toFixed(6));
    });

    markerRef.current = marker;
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim() || !window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    const searchQueryWithCity = `${searchQuery}, Jiquiriçá, Bahia, Brasil`;

    geocoder.geocode(
      { 
        address: searchQueryWithCity,
        bounds: new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(-13.3044, -39.6683), // sudoeste
          new window.google.maps.LatLng(-13.2444, -39.6083)  // nordeste
        )
      },
      (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          
          onLocationChange(lat.toFixed(6), lng.toFixed(6));
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng });
            updateMarker(lat, lng);
          }
        }
      }
    );
  };

  const handleMapClick = () => {
    // Esta função agora é tratada pelo listener do Google Maps
    if (!isMapLoaded) {
      // Fallback para quando o mapa não está carregado
      const randomLat = (jiquiricaCenter.lat + (Math.random() - 0.5) * 0.02).toFixed(6);
      const randomLng = (jiquiricaCenter.lng + (Math.random() - 0.5) * 0.02).toFixed(6);
      onLocationChange(randomLat, randomLng);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PinTopIcon className="h-5 w-5" />
          Localização - Jiquiriçá/BA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Field */}
        <div className="space-y-2">
          <Label htmlFor="location-search">Buscar Endereço</Label>
          <div className="flex gap-2">
            <Input
              id="location-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o endereço em Jiquiriçá"
              data-testid="input-location-search"
              className="flex-1 min-w-0"
            />
            <Button 
              type="button" 
              onClick={handleManualSearch}
              variant="outline"
              data-testid="button-search-address"
              className="flex-shrink-0"
            >
              Buscar
            </Button>
          </div>
        </div>

        {/* Predefined Locations */}
        <div className="space-y-2">
          <Label>Localizações Pré-definidas</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {predefinedLocations.map((location) => (
              <Button
                key={location.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePredefinedLocation(location)}
                className="text-left justify-start w-full"
                data-testid={`button-location-${location.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <PinTopIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{location.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Map Visual */}
        <div className="space-y-2">
          <Label>Mapa Interativo - Jiquiriçá/BA</Label>
          {isMapLoaded ? (
            <div 
              ref={mapRef}
              className="h-64 w-full rounded-lg border border-border overflow-hidden"
              data-testid="google-map"
            />
          ) : (
            <div 
              className="relative h-64 bg-gradient-to-b from-blue-100 to-green-100 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-border overflow-hidden cursor-pointer hover:brightness-110 transition-all flex items-center justify-center"
              onClick={handleMapClick}
              data-testid="map-placeholder"
            >
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando Google Maps...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && "API Key do Google Maps necessária"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current Coordinates */}
        {latitude && longitude && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Latitude</Label>
              <Input 
                value={latitude} 
                onChange={(e) => onLocationChange(e.target.value, longitude)}
                placeholder="-13.2744"
                data-testid="input-latitude"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Longitude</Label>
              <Input 
                value={longitude} 
                onChange={(e) => onLocationChange(latitude, e.target.value)}
                placeholder="-39.6383"
                data-testid="input-longitude"
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Address Context */}
        {endereco && bairro && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground">{endereco}</p>
            <p className="text-xs text-muted-foreground">{bairro}, Jiquiriçá - BA</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}