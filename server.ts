import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Helper procedural fallback generator in case API key is missing or model is unreachable
function generateProceduralCrest(teamName: string, style = 'shield'): string {
  const name = teamName.trim() || 'نادي رياضي';
  const colors = [
    { primary: '#059669', secondary: '#047857', accent: '#D4AF37', text: '#FFFFFF' }, // Emerald & Gold
    { primary: '#1D4ED8', secondary: '#1E40AF', accent: '#F59E0B', text: '#FFFFFF' }, // Royal Blue & Amber
    { primary: '#DC2626', secondary: '#991B1B', accent: '#FFFFFF', text: '#FFFFFF' }, // Crimson & White
    { primary: '#7C3AED', secondary: '#5B21B6', accent: '#FBBF24', text: '#FFFFFF' }, // Purple & Gold
    { primary: '#0F172A', secondary: '#020617', accent: '#10B981', text: '#F8FAFC' }, // Carbon & Emerald
  ];
  // Deterministic pick based on string length & char codes
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length];

  const firstLetter = name.charAt(0);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340" width="300" height="340">
  <defs>
    <linearGradient id="shieldGrad_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color.primary}" />
      <stop offset="100%" stop-color="${color.secondary}" />
    </linearGradient>
    <linearGradient id="goldGrad_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF2A3" />
      <stop offset="50%" stop-color="${color.accent}" />
      <stop offset="100%" stop-color="#B48710" />
    </linearGradient>
  </defs>
  <!-- Outer Shield -->
  <path d="M150 15 L265 55 C265 190 220 275 150 325 C80 275 35 190 35 55 Z" fill="url(#goldGrad_${hash})" filter="drop-shadow(0 8px 12px rgba(0,0,0,0.4))" />
  <!-- Inner Shield -->
  <path d="M150 25 L252 61 C252 182 210 260 150 307 C90 260 48 182 48 61 Z" fill="url(#shieldGrad_${hash})" />
  <!-- Accent Border -->
  <path d="M150 35 L240 68 C240 170 205 245 150 288 C95 245 60 170 60 68 Z" fill="none" stroke="${color.accent}" stroke-width="2.5" opacity="0.4" />
  <!-- Top Banner -->
  <path d="M68 62 Q150 78 232 62 L238 98 Q150 114 62 98 Z" fill="url(#goldGrad_${hash})" />
  <text x="150" y="87" font-family="'Cairo', sans-serif" font-weight="900" font-size="16" fill="#042111" text-anchor="middle">${name.slice(0, 16)}</text>
  <!-- Center Mascot / Football Icon -->
  <g transform="translate(150, 162)">
    <circle r="42" fill="#FFFFFF" opacity="0.1" />
    <!-- 5-Pointed Golden Star -->
    <path d="M0 -34 L10 -11 L34 -8 L16 8 L22 32 L0 18 L-22 32 L-16 8 L-34 -8 L-10 -11 Z" fill="url(#goldGrad_${hash})" />
    <!-- Football in center of star -->
    <circle cx="0" cy="1" r="10" fill="#FFFFFF" stroke="#062e19" stroke-width="1.5" />
    <polygon points="0,-4 3,-1 2,3 -2,3 -3,-1" fill="#062e19" />
  </g>
  <!-- Victory Laurel -->
  <g stroke="url(#goldGrad_${hash})" stroke-width="2" fill="none">
    <path d="M85 195 C80 220 100 255 130 270" />
    <path d="M215 195 C220 220 200 255 170 270" />
    <circle cx="82" cy="200" r="3" fill="url(#goldGrad_${hash})" />
    <circle cx="90" cy="225" r="3" fill="url(#goldGrad_${hash})" />
    <circle cx="106" cy="248" r="3" fill="url(#goldGrad_${hash})" />
    <circle cx="218" cy="200" r="3" fill="url(#goldGrad_${hash})" />
    <circle cx="210" cy="225" r="3" fill="url(#goldGrad_${hash})" />
    <circle cx="194" cy="248" r="3" fill="url(#goldGrad_${hash})" />
  </g>
  <text x="150" y="278" font-family="'Cairo', sans-serif" font-weight="700" font-size="13" fill="${color.accent}" text-anchor="middle">نادي كرة قدم • 2026</text>
</svg>
  `.trim();
}

// POST endpoint: /api/generate-team-logo
app.post('/api/generate-team-logo', async (req: Request, res: Response) => {
  const { teamName, style = 'shield' } = req.body;

  if (!teamName || typeof teamName !== 'string') {
    return res.status(400).json({ error: 'يرجى إدخال اسم الفريق أولاً' });
  }

  const cleanName = teamName.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Graceful procedural fallback if no API key is provided
    const fallbackSvg = generateProceduralCrest(cleanName, style);
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}`;
    return res.json({
      success: true,
      dataUrl,
      svg: fallbackSvg,
      source: 'procedural_fallback',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are a world-class sports graphic designer specializing in football club emblems, crests, and athletic badges.
Generate a valid, standalone, visually striking vector SVG football club crest for the team named: "${cleanName}".

Technical requirements:
1. Return ONLY the SVG code starting with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340" width="300" height="340"> and ending with </svg>.
2. Do NOT include markdown text, explanations, or quotes. If you use a code block, put ONLY the SVG inside.
3. Design features:
   - Outer athletic badge / shield shape with sports linear gradients and golden or metallic borders.
   - Central emblem or mascot inspired by the team name: e.g. star, eagle, falcon, horse, lion, flame, crown, waves, or soccer ball.
   - Elegant banner or ribbon featuring the team name: "${cleanName}".
   - Professional athletic sports palette (harmonious emerald green, royal blue, gold, crimson, or dark carbon).
   - Laurel leaves or stars of championship honor.
4. Clean valid XML without broken closing tags.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const rawText = response.text || '';
    // Extract SVG block
    let svgContent = '';
    const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);

    if (svgMatch) {
      svgContent = svgMatch[0];
    } else {
      svgContent = generateProceduralCrest(cleanName, style);
    }

    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;

    return res.json({
      success: true,
      dataUrl,
      svg: svgContent,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini logo generation error:', error);
    // Provide fallback so user never encounters an error break
    const fallbackSvg = generateProceduralCrest(cleanName, style);
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg)}`;
    return res.json({
      success: true,
      dataUrl,
      svg: fallbackSvg,
      source: 'procedural_fallback_after_error',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
