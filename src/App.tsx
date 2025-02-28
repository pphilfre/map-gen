import React from 'react';
import MapGenerator from './components/MapGenerator';
import { Compass } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      <header className="bg-amber-800 text-amber-50 p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-center">
          <Compass className="mr-2" size={28} />
          <h1 className="text-2xl font-bold">Fantasy Map Generator</h1>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4">
        <MapGenerator />
      </main>
      
      <footer className="bg-amber-800 text-amber-50 p-4 mt-8">
        <div className="container mx-auto text-center">
          <p>Created with Perlin noise and procedural generation techniques</p>
          <p className="text-sm mt-1">© 2025 Fantasy Map Generator</p>
        </div>
      </footer>
    </div>
  );
}

export default App;