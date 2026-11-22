/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "out", "index.html");
let html = fs.readFileSync(filePath, "utf8");

// Remove YouTube SDK script if present
const ytScript = '<script src="https://www.youtube.com/game_api/v1"></script>';
if (html.includes(ytScript)) {
  html = html.replace(ytScript, "");
}

// Fix favicon path in HTML <link> attributes
html = html.replace(/href="\/favicon\.ico/g, 'href="./favicon.ico');

// Fix favicon path inside RSC JSON payload embedded in <script> tags.
// Next.js encodes it as \"href\":\"/favicon.ico — absolute, breaks in the portal.
html = html.replace(/(\\"href\\":\\")\/favicon\.ico([^"\\]*)/g, "$1./favicon.ico$2");

// Remove crossorigin="" from font preload <link> tags.
// Next.js adds crossorigin to font preloads, which triggers CORS checks on file:// protocol
// and blocks font loading. Fonts are local static files so crossorigin is unnecessary.
html = html.replace(/(<link\s[^>]*rel="preload"[^>]*as="font"[^>]*)\s+crossorigin=""/g, "$1");

// Also remove crossOrigin from RSC JSON payload font hints.
// In RSC payload, it appears as escaped JSON: \"crossOrigin\":\"\" or \"crossOrigin\":\"$undefined\"
html = html.replace(/,\\\\?"crossOrigin\\\\?":\\\\?"[^"]*\\\\?"/g, "");
html = html.replace(/\\\\?"crossOrigin\\\\?":\\\\?"[^"]*\\\\?",/g, "");

fs.writeFileSync(filePath, html);
 
