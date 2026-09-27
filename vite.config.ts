import { defineConfig, type Plugin } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import { PNG } from "pngjs";
import fs from "fs";
import path from "path";

function generatePwaIcons(): Plugin {
  return {
    name: "generate-toldo-pro-pwa-icons",
    buildStart() {
      const publicDir = path.resolve(__dirname, "public");
      fs.mkdirSync(publicDir, { recursive: true });
      for (const size of [192, 512]) {
        const png = new PNG({ width: size, height: size });
        const radius = size * 0.2;
        const left = size * 0.18;
        const right = size * 0.82;
        const top = size * 0.18;
        const bottom = size * 0.82;
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const index = (size * y + x) * 4;
            const cornerX = x < left + radius ? left + radius - x : x > right - radius ? x - (right - radius) : 0;
            const cornerY = y < top + radius ? top + radius - y : y > bottom - radius ? y - (bottom - radius) : 0;
            const roundedOrange = x >= left && x <= right && y >= top && y <= bottom && (cornerX === 0 || cornerY === 0 || cornerX * cornerX + cornerY * cornerY <= radius * radius);
            const awning = x > size * 0.3 && x < size * 0.7 && y > size * 0.38 && y < size * 0.58;
            png.data[index] = awning ? 255 : roundedOrange ? 244 : 23;
            png.data[index + 1] = awning ? 255 : roundedOrange ? 123 : 50;
            png.data[index + 2] = awning ? 255 : roundedOrange ? 32 : 77;
            png.data[index + 3] = 255;
          }
        }
        fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), PNG.sync.write(png));
      }
    },
  };
}

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [generatePwaIcons(), dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
