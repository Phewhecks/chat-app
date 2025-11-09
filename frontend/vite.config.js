import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// If you use the official Tailwind plugin for Vite (optional), import it
// import tailwindcss from 'tailwindcss';

export default defineConfig({
  plugins: [
    react(),
    // tailwindcss(),  // usually not required here if PostCSS is set up properly
  ],
});
