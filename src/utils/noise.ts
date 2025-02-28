import { createNoise2D } from 'simplex-noise';

// Create a seeded random number generator
export function createRandom(seed = 123456) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Generate noise with multiple octaves for more natural-looking terrain
export function generateNoiseMap(width: number, height: number, seed: number, scale: number, octaves: number, persistence: number, lacunarity: number) {
  const random = createRandom(seed);
  const noise2D = createNoise2D(random);
  
  const noiseMap = new Array(width * height).fill(0);
  
  // Prevent division by zero
  if (scale <= 0) scale = 0.0001;
  
  // Random offsets for each octave to prevent patterns
  const octaveOffsets = Array.from({ length: octaves }, () => ({
    x: random() * 100000,
    y: random() * 100000
  }));
  
  let maxNoiseHeight = Number.MIN_VALUE;
  let minNoiseHeight = Number.MAX_VALUE;
  
  // Generate the noise map
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let amplitude = 1;
      let frequency = 1;
      let noiseHeight = 0;
      
      // Calculate noise value with multiple octaves
      for (let i = 0; i < octaves; i++) {
        const sampleX = (x / scale) * frequency + octaveOffsets[i].x;
        const sampleY = (y / scale) * frequency + octaveOffsets[i].y;
        
        // Get noise value between -1 and 1
        const noiseValue = noise2D(sampleX, sampleY);
        
        // Add to our noise height, scaled by amplitude
        noiseHeight += noiseValue * amplitude;
        
        // Update amplitude and frequency for next octave
        amplitude *= persistence;
        frequency *= lacunarity;
      }
      
      // Track min and max for normalization
      maxNoiseHeight = Math.max(maxNoiseHeight, noiseHeight);
      minNoiseHeight = Math.min(minNoiseHeight, noiseHeight);
      
      noiseMap[y * width + x] = noiseHeight;
    }
  }
  
  // Normalize the noise map to values between 0 and 1
  for (let i = 0; i < noiseMap.length; i++) {
    noiseMap[i] = (noiseMap[i] - minNoiseHeight) / (maxNoiseHeight - minNoiseHeight);
  }
  
  return noiseMap;
}

// Generate rivers based on terrain
export function generateRivers(noiseMap: number[], width: number, height: number, seed: number, riverCount: number, minRiverLength: number) {
  const random = createRandom(seed);
  const rivers: number[][] = [];
  
  // Helper to get index in the noise map
  const getIndex = (x: number, y: number) => y * width + x;
  
  // Helper to get height at position
  const getHeight = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 1; // Treat out of bounds as high elevation
    return noiseMap[getIndex(x, y)];
  };
  
  // Try to create the requested number of rivers
  for (let r = 0; r < riverCount; r++) {
    // Start at a random position with medium-high elevation
    let startX = Math.floor(random() * width);
    let startY = Math.floor(random() * height);
    let attempts = 0;
    
    do {
      startX = Math.floor(random() * width);
      startY = Math.floor(random() * height);
      attempts++;
      // Try to find a suitable starting point (medium-high elevation)
    } while ((getHeight(startX, startY) < 0.6 || getHeight(startX, startY) > 0.8) && attempts < 100);
    
    if (attempts >= 100) continue; // Skip if we couldn't find a good starting point
    
    const river: number[] = [getIndex(startX, startY)];
    let currentX = startX;
    let currentY = startY;
    let terminated = false;
    
    // Flow downhill until we reach a low point or the edge
    while (!terminated && river.length < 1000) { // Prevent infinite loops
      // Check all 8 neighbors to find the lowest point
      let lowestX = currentX;
      let lowestY = currentY;
      let lowestHeight = getHeight(currentX, currentY);
      
      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          if (nx === 0 && ny === 0) continue;
          
          const neighborX = currentX + nx;
          const neighborY = currentY + ny;
          const neighborHeight = getHeight(neighborX, neighborY);
          
          if (neighborHeight < lowestHeight) {
            lowestHeight = neighborHeight;
            lowestX = neighborX;
            lowestY = neighborY;
          }
        }
      }
      
      // If we can't flow downhill anymore, terminate
      if (lowestX === currentX && lowestY === currentY) {
        terminated = true;
      } else {
        currentX = lowestX;
        currentY = lowestY;
        
        // Check if we're out of bounds
        if (currentX < 0 || currentX >= width || currentY < 0 || currentY >= height) {
          terminated = true;
        } else {
          const index = getIndex(currentX, currentY);
          // Check if we've already visited this point (to prevent loops)
          if (river.includes(index)) {
            terminated = true;
          } else {
            river.push(index);
          }
        }
      }
    }
    
    // Only keep rivers that are long enough
    if (river.length >= minRiverLength) {
      rivers.push(river);
    }
  }
  
  return rivers;
}

// Place cities based on terrain and rivers
export function placeCities(noiseMap: number[], rivers: number[][], width: number, height: number, seed: number, cityCount: number) {
  const random = createRandom(seed);
  const cities: { x: number, y: number, size: number }[] = [];
  const riverPoints = new Set(rivers.flat());
  
  // Helper to check if a point is near a river
  const isNearRiver = (x: number, y: number, distance: number) => {
    for (let ny = -distance; ny <= distance; ny++) {
      for (let nx = -distance; nx <= distance; nx++) {
        const checkX = x + nx;
        const checkY = y + ny;
        
        if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= height) continue;
        
        if (riverPoints.has(checkY * width + checkX)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Try to place cities
  let attempts = 0;
  while (cities.length < cityCount && attempts < cityCount * 10) {
    attempts++;
    
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);
    const terrainHeight = noiseMap[y * width + x];
    
    // Cities should be on relatively flat land (not too high or low)
    if (terrainHeight < 0.3 || terrainHeight > 0.7) continue;
    
    // Cities are more likely to be near rivers
    const nearRiver = isNearRiver(x, y, 3);
    if (!nearRiver && random() < 0.7) continue; // 70% chance to skip if not near a river
    
    // Check if too close to another city
    let tooClose = false;
    for (const city of cities) {
      const distance = Math.sqrt(Math.pow(city.x - x, 2) + Math.pow(city.y - y, 2));
      if (distance < width / 10) { // Minimum distance between cities
        tooClose = true;
        break;
      }
    }
    
    if (tooClose) continue;
    
    // Determine city size (larger if near river and on good terrain)
    let size = 1 + random() * 2;
    if (nearRiver) size += 1;
    if (terrainHeight > 0.4 && terrainHeight < 0.6) size += 0.5;
    
    cities.push({ x, y, size });
  }
  
  return cities;
}
