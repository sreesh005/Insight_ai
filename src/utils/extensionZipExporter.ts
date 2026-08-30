import JSZip from 'jszip';
import manifestRaw from '../../extension/manifest.json?raw';
import backgroundRaw from '../../extension/background.js?raw';
import contentRaw from '../../extension/content.js?raw';
import sidepanelHtmlRaw from '../../extension/sidepanel.html?raw';
import sidepanelCssRaw from '../../extension/sidepanel.css?raw';
import sidepanelJsRaw from '../../extension/sidepanel.js?raw';

// Helper to generate a PNG blob from canvas for extension icons
function generateIconPngBlob(size: number): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Rounded background gradient
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#4f46e5');
      grad.addColorStop(0.5, '#7c3aed');
      grad.addColorStop(1, '#dc2626');
      ctx.fillStyle = grad;

      const radius = Math.floor(size * 0.22);
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();

      // Play Triangle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const p1x = Math.floor(size * 0.38);
      const p1y = Math.floor(size * 0.30);
      const p2x = Math.floor(size * 0.72);
      const p2y = Math.floor(size * 0.50);
      const p3x = Math.floor(size * 0.38);
      const p3y = Math.floor(size * 0.70);

      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.closePath();
      ctx.fill();

      // Sparkle Dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(Math.floor(size * 0.75), Math.floor(size * 0.28), Math.max(1, Math.floor(size * 0.08)), 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      resolve(blob || new Blob([]));
    }, 'image/png');
  });
}

export const EXTENSION_SOURCE_FILES = {
  manifest: manifestRaw,
  background: backgroundRaw,
  content: contentRaw,
  sidepanelHtml: sidepanelHtmlRaw,
  sidepanelCss: sidepanelCssRaw,
  sidepanelJs: sidepanelJsRaw,
};

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  // Add primary extension files directly from raw sources
  zip.file('manifest.json', EXTENSION_SOURCE_FILES.manifest);
  zip.file('background.js', EXTENSION_SOURCE_FILES.background);
  zip.file('content.js', EXTENSION_SOURCE_FILES.content);
  zip.file('sidepanel.html', EXTENSION_SOURCE_FILES.sidepanelHtml);
  zip.file('sidepanel.css', EXTENSION_SOURCE_FILES.sidepanelCss);
  zip.file('sidepanel.js', EXTENSION_SOURCE_FILES.sidepanelJs);
  zip.file('README.md', `# 🧩 Insight.ai - Chrome Extension (Manifest V3)

## Multi-LLM BYOK Architecture (Bring Your Own Key)
Supports:
- **Google Gemini** (1,500 free queries/day from Google AI Studio - 100% Free)
- **Groq Cloud** (Ultra-fast LPU inference on Llama 3.3 70B & 8B)
- **OpenAI** (GPT-4o, GPT-4o-mini)
- **Anthropic Claude** (Claude 3.5 Sonnet, Claude 3.5 Haiku)
- **DeepSeek** (DeepSeek V3 & Reasoner R1)
- **OpenRouter** (All OpenRouter models & Free Tier)
- **Mistral AI** (Mistral Small, Mistral Large, Codestral)
- **Local / Custom** (Ollama, LM Studio, vLLM, LocalAI via OpenAI-compatible endpoints)

## Quick Installation Instructions:
1. Extract this ZIP archive to a folder (e.g. \`insight-ai-extension\`).
2. Open Google Chrome and navigate to \`chrome://extensions\` in your URL bar.
3. Turn on the **Developer mode** toggle in the top right.
4. Click **Load unpacked** in the top left and select the extracted folder.
5. Pin Insight.ai in your Chrome extensions toolbar.
6. Open any YouTube video (e.g. https://www.youtube.com/watch?v=...) and click the Insight.ai icon or open the Side Panel!
7. If your YouTube tab was already open prior to loading the extension, give the YouTube tab a quick refresh (F5 / Cmd+R) so the video player hooks can attach.
8. Click **Settings (⚙️)** in the side panel header to select your preferred AI provider and enter your API key.
`);

  // Generate PNG icons
  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    const icon16 = await generateIconPngBlob(16);
    const icon32 = await generateIconPngBlob(32);
    const icon48 = await generateIconPngBlob(48);
    const icon128 = await generateIconPngBlob(128);

    iconsFolder.file('icon16.png', icon16);
    iconsFolder.file('icon32.png', icon32);
    iconsFolder.file('icon48.png', icon48);
    iconsFolder.file('icon128.png', icon128);
  }

  // Generate and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'insight-ai-chrome-extension.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
