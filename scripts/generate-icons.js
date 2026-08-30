import fs from 'fs';
import path from 'path';

// Simple valid 1-pixel red-purple PNG fallback bytes or basic PNG header
const iconsDir = path.resolve('extension/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// A minimal valid 16x16 / 32x32 / 48x48 / 128x128 RGBA PNG buffer creator
function createSimplePng(size) {
  // SVG copy for each size
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.22)}" fill="#4f46e5"/>
  <polygon points="${Math.floor(size*0.35)},${Math.floor(size*0.28)} ${Math.floor(size*0.75)},${Math.floor(size*0.5)} ${Math.floor(size*0.35)},${Math.floor(size*0.72)}" fill="#ffffff"/>
</svg>`;
  return svgContent;
}

// Write svg files
[16, 32, 48, 128].forEach((size) => {
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), createSimplePng(size));
});

console.log('Icons generated successfully');
