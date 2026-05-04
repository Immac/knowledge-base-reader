// Generate deterministic tag colors from tag text
function generateTagColor(key, value, isDark) {
  // Split influence: key affects hue, value modifies saturation/lightness
  let keyHash = 0;
  for (let i = 0; i < key.length; i++) {
    keyHash = ((keyHash << 5) - keyHash) + key.charCodeAt(i);
  }

  let valueHash = 0;
  for (let i = 0; i < value.length; i++) {
    valueHash = ((valueHash << 5) - valueHash) + value.charCodeAt(i);
  }

  // Key determines start hue, value determines end hue
  let startH = Math.abs(keyHash) % 360;
  let endH = Math.abs(valueHash) % 360;
  const valueMod = Math.abs(valueHash) % 30;

  let s, l;
  if (isDark) {
    // Dark theme: brighter for visibility on dark bg
    s = 55 + (valueMod % 30); // 55-85%
    l = 45 + (valueMod % 25); // 45-70%
  } else {
    // Light theme: softer for readability
    s = 35 + (valueMod % 35); // 35-70%
    l = 30 + (valueMod % 30); // 30-60%
  }

  // Calculate shortest path around wheel (avoid going through 0/360 which is gray)
  let diff = endH - startH;
  if (Math.abs(diff) > 180) {
    // If crossing center (gray), go the other way around
    if (diff > 0) {
      endH -= 360;
    } else {
      endH += 360;
    }
  }
  const midH = startH + (endH - startH) * 0.5; // midpoint on shortest path

  // Normalize all hue values to 0-360 for CSS
  const normalizeHue = h => ((h % 360) + 360) % 360;
  const gradient = `linear-gradient(90deg, hsl(${normalizeHue(startH)}, ${s}%, ${l}%) 0%, hsl(${normalizeHue(midH)}, ${s - 10}%, ${l + 5}%) 50%, hsl(${normalizeHue(endH)}, ${s}%, ${l}%) 100%)`;

  // Calculate contrasting text color
  const avgL = l + 2.5;
  const textColor = avgL > 55 ? '#1a1a1a' : '#ffffff';

  return { bg: gradient, text: textColor };
}

function isDarkStyle(style) {
  return ['calm', 'violet', 'forest'].includes(style);
}