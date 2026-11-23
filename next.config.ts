import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "/" → "/login" as a real HTTP redirect. app/page.tsx's redirect() was served as a 200
  // shell that switched pages inside the browser, so the root layout's <head> (incl. the
  // ConsentBit banner <script>) was only built by React on the client and never executed.
  // A server redirect makes the browser fully load /login, whose HTML has the banner tag.
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
  async headers() {
    return [
      {
        // Site-wide browser protections. SAMEORIGIN (not DENY): nothing embeds the app
        // today — the Webflow and Framer apps open it in a new tab — but a same-origin
        // iframe should keep working. Stops clickjacking on cancel/upgrade/team pages.
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Prevent CDN/edge/browser from caching any authenticated dashboard page.
        source: "/dashboard/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
