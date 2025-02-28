import React, { useRef, useState, useEffect } from 'react';
import { generateNoiseMap, generateRivers, placeCities } from '../utils/noise';
import { MapPin, Mountain, Waves, RefreshCw, Download } from 'lucide-react';

interface MapSettings {
  seed: number;
  width: number;
  height: number;
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  riverCount: number;
  minRiverLength: number;
  cityCount: number;
}

const defaultSettings: MapSettings = {
  seed: Math.floor(Math.random() * 1000000),
  width: 800,
  height: 600,
  scale: 100,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2,
  riverCount: 5,
  minRiverLength: 20,
  cityCount: 8
};

const terrainColors = [
  { height: 0.2, color: '#0077be' },   // Deep water
  { height: 0.3, color: '#0099cc' },   // Shallow water
  { height: 0.4, color: '#e9d8a6' },   // Beach/sand
  { height: 0.5, color: '#94c973' },   // Lowland
  { height: 0.7, color: '#53a548' },   // Forest/hills
  { height: 0.8, color: '#8b5e34' },   // Mountains
  { height: 1.0, color: '#ffffff' }    // Snow peaks
];

const MapGenerator: React.FC = () => {
  const [settings, setSettings] = useState<MapSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Generate a new map when settings change
  useEffect(() => {
    generateMap();
  }, [settings]);
  
  const generateMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = settings.width;
    canvas.height = settings.height;
    
    // Generate the noise map
    const noiseMap = generateNoiseMap(
      settings.width,
      settings.height,
      settings.seed,
      settings.scale,
      settings.octaves,
      settings.persistence,
      settings.lacunarity
    );
    
    // Draw the terrain
    const imageData = ctx.createImageData(settings.width, settings.height);
    
    for (let y = 0; y < settings.height; y++) {
      for (let x = 0; x < settings.width; x++) {
        const index = (y * settings.width + x) * 4;
        const height = noiseMap[y * settings.width + x];
        
        // Find the appropriate color for this height
        let color = terrainColors[0].color;
        for (let i = 0; i < terrainColors.length; i++) {
          if (height <= terrainColors[i].height) {
            color = terrainColors[i].color;
            break;
          }
        }
        
        // Convert hex color to RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        imageData.data[index] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = 255; // Alpha
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Generate rivers
    const rivers = generateRivers(
      noiseMap,
      settings.width,
      settings.height,
      settings.seed,
      settings.riverCount,
      settings.minRiverLength
    );
    
    // Draw rivers
    ctx.strokeStyle = '#0077be';
    ctx.lineWidth = 2;
    
    for (const river of rivers) {
      ctx.beginPath();
      for (let i = 0; i < river.length; i++) {
        const index = river[i];
        const x = index % settings.width;
        const y = Math.floor(index / settings.width);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    
    // Place cities
    const cities = placeCities(
      noiseMap,
      rivers,
      settings.width,
      settings.height,
      settings.seed,
      settings.cityCount
    );
    
    // Draw cities
    for (const city of cities) {
      // Draw city marker
      ctx.fillStyle = '#d62828';
      ctx.beginPath();
      ctx.arc(city.x, city.y, city.size + 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw city outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(city.x, city.y, city.size + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Add some mountain symbols in high elevation areas
    for (let i = 0; i < 50; i++) {
      const x = Math.floor(Math.random() * settings.width);
      const y = Math.floor(Math.random() * settings.height);
      const height = noiseMap[y * settings.width + x];
      
      if (height > 0.75) {
        // Draw a simple mountain symbol
        ctx.fillStyle = '#8b5e34';
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x - 5, y + 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.closePath();
        ctx.fill();
        
        // Add snow cap
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x - 2, y);
        ctx.lineTo(x + 2, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  };
  
  const regenerateMap = () => {
    setSettings({
      ...settings,
      seed: Math.floor(Math.random() * 1000000)
    });
  };
  
  const downloadMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `fantasy-map-${settings.seed}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  
  const handleSettingChange = (key: keyof MapSettings, value: number) => {
    setSettings({
      ...settings,
      [key]: value
    });
  };
  
  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-4">
      <div className="w-full flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">Fantasy Map Generator</h1>
        <div className="flex gap-2">
          <button 
            onClick={regenerateMap}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            <RefreshCw size={18} />
            New Map
          </button>
          <button 
            onClick={downloadMap}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            <Download size={18} />
            Download
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md transition-colors"
          >
            {showSettings ? 'Hide Settings' : 'Show Settings'}
          </button>
        </div>
      </div>
      
      {showSettings && (
        <div className="w-full bg-gray-100 p-4 rounded-md mb-4">
          <h2 className="text-xl font-semibold mb-2">Map Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Seed</label>
              <input
                type="number"
                value={settings.seed}
                onChange={(e) => handleSettingChange('seed', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Scale</label>
              <input
                type="range"
                min="50"
                max="200"
                value={settings.scale}
                onChange={(e) => handleSettingChange('scale', parseInt(e.target.value))}
                className="mt-1 block w-full"
              />
              <span className="text-xs text-gray-500">{settings.scale}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Octaves</label>
              <input
                type="range"
                min="1"
                max="8"
                value={settings.octaves}
                onChange={(e) => handleSettingChange('octaves', parseInt(e.target.value))}
                className="mt-1 block w-full"
              />
              <span className="text-xs text-gray-500">{settings.octaves}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Persistence</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.persistence}
                onChange={(e) => handleSettingChange('persistence', parseFloat(e.target.value))}
                className="mt-1 block w-full"
              />
              <span className="text-xs text-gray-500">{settings.persistence}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lacunarity</label>
              <input
                type="range"
                min="1"
                max="4"
                step="0.1"
                value={settings.lacunarity}
                onChange={(e) => handleSettingChange('lacunarity', parseFloat(e.target.value))}
                className="mt-1 block w-full"
              />
              <span className="text-xs text-gray-500">{settings.lacunarity}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">River Count</label>
              <input
                type="range"
                min="0"
                max="15"
                value={settings.riverCount}
                onChange={(e) => handleSettingChange('riverCount', parseInt(e.target.value))}
                className="mt-1 block w-full"
              />
              <span className="text-xs text-gray-500">{settings.riverCount}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Min River Length</label>
              <input
                type="range"
                min="10"
                max="50"
                value={settings.minRiverLength}
                onChange={(e) => handleSettingChange('minRiverLength', parseInt(e.target.value))}
                className="mt-1 block w-full"
              />
              <span className="text-xs text-gray-500">{settings.minRiverLength}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">City Count</label>
              <input
                type="range"
                min="0"
                max="20"
                value={settings.cityCount}
                onChange={(e) => handleSettingChange('cityCount', parseInt(e.target.value))}
                className="mt-1 block w-full"
              />
              <span className="text-xs text-gray-500">{settings.cityCount}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative border-4 border-amber-800 rounded-md overflow-hidden shadow-lg">
        <canvas 
          ref={canvasRef} 
          className="bg-blue-100"
          width={settings.width} 
          height={settings.height}
        />
      </div>
      
      <div className="mt-4 flex gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <MapPin size={16} className="text-red-600" />
          <span>Cities</span>
        </div>
        <div className="flex items-center gap-1">
          <Waves size={16} className="text-blue-600" />
          <span>Rivers</span>
        </div>
        <div className="flex items-center gap-1">
          <Mountain size={16} className="text-amber-800" />
          <span>Mountains</span>
        </div>
      </div>
    </div>
  );
};

export default MapGenerator;