import re
import base64

def process_svg():
    try:
        with open('world.svg', 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract viewBox
        viewbox_match = re.search(r'viewBox="([^"]+)"', content)
        viewbox = viewbox_match.group(1) if viewbox_match else "0 0 1000 500"

        # Extract all path d attributes
        paths = re.findall(r'<path[^>]*d="([^"]+)"', content)
        all_d = " ".join(paths)

        # Create a clean, optimized SVG for mask use
        # Using a mesh/grid pattern overlaying the solid map
        svg_template = f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='{viewbox}'>
<defs>
<pattern id='p' width='4' height='4' patternUnits='userSpaceOnUse'>
<circle cx='1' cy='1' r='0.8' fill='#fff' />
</pattern>
</defs>
<path d='{all_d}' fill='url(#p)' opacity='0.8'/>
</svg>"""

        # base64 encode it for CSS
        b64 = base64.b64encode(svg_template.encode('utf-8')).decode('utf-8')
        css_url = f'url("data:image/svg+xml;base64,{b64}")'

        # read CSS, replace hero
        with open('src/components/Home.css', 'r', encoding='utf-8') as f:
            css = f.read()

        # Regex replace .home-hero up to /* ── Card System ── */
        pattern = re.compile(r'\.home-hero\s*\{.*?\/\*\s*── Card System ──\s*\*\/', re.DOTALL)

        new_hero_css = f""".home-hero {{
    position: relative;
    padding: 32px 20px 36px;
    margin: 0 -20px 20px;
    overflow: hidden;
    /* SEM BORDAS E SEM FUNDO SÓLIDO */
    border: none;
    background: transparent;
    opacity: var(--hero-opacity, 1);
    transform: translateY(calc(var(--hero-translate, 0px) * 0.5));
    transition: opacity 0.05s linear, transform 0.05s linear;
}}

/* Máscara do Mapa Mundo (Tema Dinâmico) */
.home-hero::before {{
    content: '';
    position: absolute;
    inset: -10% -5% 10% -5%;
    /* Utiliza cor de fonte base (tema dinâmico) */
    background-color: var(--home-text-secondary);
    
    /* Aplica o mapa SVG como uma máscara alfa */
    -webkit-mask-image: {css_url};
    mask-image: {css_url};
    -webkit-mask-size: cover;
    mask-size: cover;
    -webkit-mask-position: center 20%;
    mask-position: center 20%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    
    /* Transparência etérea */
    opacity: 0.15;
    pointer-events: none;
    z-index: 0;
}}

/* Degradê (Fade-out) inferior suave */
.home-hero::after {{
    content: '';
    position: absolute;
    inset: 0;
    /* Fades from clear to the app background color, perfectly blending the bottom */
    background: linear-gradient(to bottom, 
            transparent 0%, 
            transparent 50%, 
            var(--home-bg, #0f172a) 100%);
    pointer-events: none;
    z-index: 1;
}}

.home-hero-content {{
    position: relative;
    z-index: 2;
}}

/* Typography — Premium Elevado */
.home-hero-title {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 2.1rem;
    line-height: 1.15;
    margin: 0 0 6px;
    letter-spacing: -0.5px;
}}

.home-hero-title .greeting {{
    font-weight: 300;
    color: var(--home-text-secondary);
}}

.home-hero-title .name {{
    font-weight: 800;
    /* Theme aware gradient */
    background: linear-gradient(135deg, var(--home-text-primary) 0%, var(--home-text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}}

.home-hero-subtitle {{
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    font-weight: 300;
    color: var(--home-text-tertiary);
    margin: 0;
    letter-spacing: 0.5px;
}}

/* ── Card System ── */"""

        new_css = pattern.sub(new_hero_css, css)

        with open('src/components/Home.css', 'w', encoding='utf-8') as f:
            f.write(new_css)
        print("CSS Updated Successfully!")

    except Exception as e:
        print(f"Error: {{e}}")

if __name__ == '__main__':
    process_svg()
