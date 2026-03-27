#!/bin/bash
# ============================================================
# THEME REFACTOR -- Replace hardcoded colors with CSS variables
# Run from ~/Downloads/peachfit-media-hub
# ============================================================

set -e
cd ~/Downloads/peachfit-media-hub

echo "=== Step 1: Update global.css with theme variables ==="

# Replace the :root block and add light theme
cat > /tmp/theme-css-patch.txt << 'CSSEOF'

/* ══════════════════════════════════════════════════════════
   THEME SYSTEM
   ══════════════════════════════════════════════════════════ */

[data-theme="light"] {
  --dark: #F5F5F5;
  --dark-light: #F0F0F0;
  --dark-card: #FFFFFF;
  --dark-border: #E0E0E0;
  --white: #111111;
  --text-primary: #111111;
  --text-secondary: #555555;
  --text-muted: #6B7280;
  --gray-100: #1A1A1A;
  --gray-200: #2A2A2A;
  --gray-300: #444444;
  --gray-400: #666666;
  --gray-500: #999999;
  --gray-600: #CCCCCC;
}

[data-theme="light"] body {
  background-color: #F5F5F5;
  color: #111111;
}

[data-theme="light"] ::-webkit-scrollbar-track {
  background: #F5F5F5;
}

[data-theme="light"] ::-webkit-scrollbar-thumb {
  background: #CCCCCC;
}
CSSEOF

# Remove old light theme CSS (the filter inversion approach)
sed -i '' '/LIGHT THEME/,/hue-rotate.*scrollbar-thumb:hover/d' src/styles/global.css
sed -i '' '/data-theme.*light.*body/,/^$/d' src/styles/global.css
sed -i '' '/data-theme.*light.*img/,/^$/d' src/styles/global.css
sed -i '' '/data-theme.*light.*emoji/,/^$/d' src/styles/global.css
sed -i '' '/data-theme.*light.*scrollbar/,/^$/d' src/styles/global.css

# Append the new theme variables
cat /tmp/theme-css-patch.txt >> src/styles/global.css

echo "CSS updated."

echo ""
echo "=== Step 2: Replace hardcoded colors in JSX files ==="

# Files to process
FILES=(
  src/pages/ContentCalendar.jsx
  src/pages/Dashboard.jsx
  src/pages/MobileCalendar.jsx
  src/pages/MobilePipeline.jsx
  src/pages/MyTasks.jsx
  src/pages/ProfileEdit.jsx
  src/pages/Login.jsx
  src/pages/ResetPassword.jsx
  src/components/NotificationBell.jsx
  src/components/MobileNav.jsx
  src/components/Layout.jsx
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "Processing $f..."
    
    # Replace color constants at top of file
    # BG / background colors
    sed -i '' "s/const BG = '#0C0C0C';/const BG = 'var(--dark)';/" "$f"
    sed -i '' "s/const CARD = '#141414';/const CARD = 'var(--dark-card)';/" "$f"
    sed -i '' "s/const CARD_LIGHT = '#1A1A1A';/const CARD_LIGHT = 'var(--dark-light)';/" "$f"
    sed -i '' "s/const BORDER = '#2A2A2A';/const BORDER = 'var(--dark-border)';/" "$f"
    sed -i '' "s/const WHITE = '#FFFFFF';/const WHITE = 'var(--white)';/" "$f"
    
    # Replace inline hardcoded values that aren't in constants
    # Background colors
    sed -i '' "s/background: '#0C0C0C'/background: 'var(--dark)'/g" "$f"
    sed -i '' "s/background: '#141414'/background: 'var(--dark-card)'/g" "$f"
    sed -i '' "s/background: '#1A1A1A'/background: 'var(--dark-light)'/g" "$f"
    sed -i '' "s/background:'#0C0C0C'/background:'var(--dark)'/g" "$f"
    sed -i '' "s/background:'#141414'/background:'var(--dark-card)'/g" "$f"
    sed -i '' "s/background:'#1A1A1A'/background:'var(--dark-light)'/g" "$f"
    
    # Border colors  
    sed -i '' "s/border: '#2A2A2A'/border: 'var(--dark-border)'/g" "$f"
    sed -i '' "s/'1px solid #2A2A2A'/'1px solid var(--dark-border)'/g" "$f"
    
    # Text colors -- be careful not to replace brand colors
    sed -i '' "s/color: '#FFFFFF'/color: 'var(--white)'/g" "$f"
    sed -i '' "s/color:'#FFFFFF'/color:'var(--white)'/g" "$f"
    sed -i '' "s/color: '#6B7280'/color: 'var(--text-muted)'/g" "$f"
    sed -i '' "s/color:'#6B7280'/color:'var(--text-muted)'/g" "$f"
    sed -i '' "s/color: '#9CA3AF'/color: 'var(--text-secondary)'/g" "$f"
    sed -i '' "s/color:'#9CA3AF'/color:'var(--text-secondary)'/g" "$f"
    sed -i '' "s/color: '#D1D5DB'/color: 'var(--text-light, #D1D5DB)'/g" "$f"
    sed -i '' "s/color:'#D1D5DB'/color:'var(--text-light, #D1D5DB)'/g" "$f"
    
    # Stroke colors in SVGs
    sed -i '' "s/stroke=\"#9CA3AF\"/stroke=\"var(--text-secondary)\"/g" "$f"
    sed -i '' "s/stroke=\"#6B7280\"/stroke=\"var(--text-muted)\"/g" "$f"
    sed -i '' "s/stroke:'#9CA3AF'/stroke:'var(--text-secondary)'/g" "$f"
    sed -i '' "s/stroke:'#6B7280'/stroke:'var(--text-muted)'/g" "$f"
    
    # Specific inline styles
    sed -i '' "s/background: 'rgba(255,255,255,0.02)'/background: 'var(--dark-light)'/g" "$f"
    sed -i '' "s/background: 'rgba(255,255,255,0.06)'/background: 'var(--dark-light)'/g" "$f"
    sed -i '' "s/background:'rgba(255,255,255,0.02)'/background:'var(--dark-light)'/g" "$f"
    sed -i '' "s/background:'rgba(255,255,255,0.06)'/background:'var(--dark-light)'/g" "$f"
    sed -i '' "s/background: 'rgba(255,255,255,0.04)'/background: 'var(--dark-light)'/g" "$f"
    sed -i '' "s/background:'rgba(255,255,255,0.04)'/background:'var(--dark-light)'/g" "$f"
    sed -i '' "s/background:'rgba(255,255,255,0.08)'/background:'var(--dark-light)'/g" "$f"
    
  fi
done

echo ""
echo "=== Step 3: Fix Layout.jsx inline colors ==="
sed -i '' "s/background: '#0C0C0C'/background: 'var(--dark)'/g" src/components/Layout.jsx
sed -i '' "s/borderBottom: '1px solid #2A2A2A'/borderBottom: '1px solid var(--dark-border)'/g" src/components/Layout.jsx
sed -i '' "s/color: '#fff'/color: 'var(--white)'/g" src/components/Layout.jsx
sed -i '' "s/stroke=\"#fff\"/stroke=\"var(--white)\"/g" src/components/Layout.jsx

echo ""
echo "=== Step 4: Fix MobileNav.jsx ==="
sed -i '' "s/const BG = '#0C0C0C';/const BG = 'var(--dark)';/" src/components/MobileNav.jsx
sed -i '' "s/const BORDER = '#2A2A2A';/const BORDER = 'var(--dark-border)';/" src/components/MobileNav.jsx

echo ""
echo "=== Step 5: Fix PipelineBoard.jsx (uses var() already but has some hardcoded) ==="
sed -i '' "s/'#6B7280'/'var(--text-muted)'/g" src/pages/PipelineBoard.jsx
# Don't replace all -- PipelineBoard uses var(--dark-card) etc already

echo ""
echo "=== Verify ==="
echo "Remaining hardcoded #0C0C0C:"
grep -c "#0C0C0C" src/pages/*.jsx src/components/*.jsx 2>/dev/null || echo "None found"
echo "Remaining hardcoded #141414:"
grep -c "#141414" src/pages/*.jsx src/components/*.jsx 2>/dev/null || echo "None found"
echo "Remaining hardcoded #1A1A1A:"
grep -c "#1A1A1A" src/pages/*.jsx src/components/*.jsx 2>/dev/null || echo "None found"

echo ""
echo "=== Done! ==="
echo "Run: git add . && git commit -m 'Theme refactor: CSS variables, proper light mode' && git push"
