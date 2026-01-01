
// Basic Hex to RGB conversion
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Convert Hex to HSL
function hexToHsl(hex: string) {
    let { r, g, b } = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Apply theme dynamically
export function applyOrganizationTheme(primaryHex: string) {
    if (!primaryHex) return;

    // Remove existing style tag if any
    const styleId = 'org-theme-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }

    const { h, s, l } = hexToHsl(primaryHex);

    // Calculate variations
    const primary = primaryHex;
    const { r, g, b } = hexToRgb(primaryHex) || { r: 0, g: 0, b: 0 };
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const primaryForeground = yiq < 128 ? '#ffffff' : '#0f172a';

    // Dark Mode Palette (Tinted with Brand Color)
    // We want a very dark version of the brand color for background
    // e.g. Luminance ~ 5-10%
    const darkBgH = h;
    const darkBgS = Math.min(s, 25); // Desaturate slightly for background ease
    const darkBgL = 4; // Very dark (Deepest background)
    const darkBg = `hsl(${darkBgH}, ${darkBgS}%, ${darkBgL}%)`;

    // Card background slightly lighter than page bg
    const darkCardL = 8;
    const darkCard = `hsl(${darkBgH}, ${darkBgS}%, ${darkCardL}%)`;

    // Border
    const darkBorderL = 15;
    const darkBorder = `hsl(${darkBgH}, ${darkBgS}%, ${darkBorderL}%)`;

    // Muted
    const darkMutedL = 12; // Slightly lighter than card
    const darkMuted = `hsl(${darkBgH}, ${darkBgS}%, ${darkMutedL}%)`;

    // CSS Injection with !important to ensure override of defaults
    styleTag.innerHTML = `
        :root {
            --primary: ${primary} !important;
            --primary-foreground: ${primaryForeground} !important;
            --ring: ${primary} !important;
        }
        
        .dark {
            --primary: ${primary} !important;
            --primary-foreground: ${primaryForeground} !important;
            --ring: ${primary} !important;
            
            /* Tinted Dark Mode Backgrounds */
            --background: ${darkBg} !important;
            --card: ${darkCard} !important;
            --popover: ${darkCard} !important;
            --border: ${darkBorder} !important;
            --input: ${darkBorder} !important;
            
            /* Tint muted to be a low-opacity brand color */
            --muted: ${darkMuted} !important;
            --muted-foreground: hsl(${h}, ${Math.min(s, 20)}%, 70%) !important;
        }
    `;
}
