import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production"
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then(
            (m) => m.default(),
          ),
        ]
      : []),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.png",
        "favicon.svg",
        "apple-touch-icon.png",
        "offline.html",
      ],
      manifest: {
        name: "Syncareer",
        short_name: "Syncareer",
        description:
          "AI-powered career platform for African graduates — assessment, CV builder, interview practice, jobs.",
        theme_color: "#00c4cc",
        background_color: "#f6f5f1",
        display: "standalone",
        orientation: "portrait",
        scope: basePath,
        start_url: basePath,
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: `${basePath.replace(/\/$/, "")}/offline.html`,
        navigateFallbackDenylist: [
          // Match these segments anywhere in the path so they work whether the
          // app is mounted at "/" or under a basePath like "/syncareer/".
          /\/api\//,
          /\/sign-in(\/|$)/,
          /\/sign-up(\/|$)/,
        ],
        // Precache the entire built app shell (HTML/JS/CSS/icons/fonts) so the
        // app boots offline even on first navigation after install.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp,jpg,jpeg}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // App-shell HTML / JS / CSS — NetworkFirst so users see fresh deploys
          // when online but still load instantly from cache when offline.
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin &&
              (request.destination === "document" ||
                request.destination === "script" ||
                request.destination === "style"),
            handler: "NetworkFirst",
            options: {
              cacheName: "app-shell",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Auth & writes — never cache. Catches Supabase auth endpoints
          // (`/auth/v1/...`) so tokens, sessions, and password resets always
          // hit the network.
          {
            urlPattern: ({ url }) => url.pathname.includes("/auth/"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ request }) => request.method !== "GET",
            handler: "NetworkOnly",
          },
          // Supabase REST GETs — NetworkFirst with short cache
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/rest/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts CSS
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          // Google Fonts files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Generic images
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  css: {
    postcss: {
      plugins: [
        (await import("tailwindcss")).default,
        (await import("autoprefixer")).default,
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
