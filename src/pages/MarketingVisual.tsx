import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Image,
  Download,
  RefreshCw,
  Eye,
  Palette,
  Smartphone,
  Square,
  RectangleVertical,
  FolderOpen,
  Wand2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type FormatKey = 'stories' | 'post' | 'landscape';
type BuiltinKey = 'classico' | 'informativo';

interface Format {
  key: FormatKey;
  label: string;
  sublabel: string;
  icon: React.FC<any>;
  width: number;
  height: number;
  aspect: string;
  emoji: string;
}

interface EditableField {
  key: string;
  label: string;
  type: 'text' | 'color' | 'image' | 'textarea';
  selector: string;
  currentValue: string;
}

interface TemplateFile {
  name: string;
  content: string;
  blobUrl: string;
  type: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMATS: Format[] = [
  {
    key: 'stories',
    label: 'Stories / Status',
    sublabel: 'WhatsApp, Instagram',
    icon: Smartphone,
    width: 1080,
    height: 1920,
    aspect: '9/16',
    emoji: '📱',
  },
  {
    key: 'post',
    label: 'Post Quadrado',
    sublabel: 'Instagram, LinkedIn',
    icon: Square,
    width: 1080,
    height: 1080,
    aspect: '1/1',
    emoji: '🟥',
  },
  {
    key: 'landscape',
    label: 'Feed / Carrossel',
    sublabel: 'Instagram, Facebook',
    icon: RectangleVertical,
    width: 1080,
    height: 1350,
    aspect: '4/5',
    emoji: '📺',
  },
];

// ─── Built-in BM Juris Template ──────────────────────────────────────────────

function buildBuiltinTemplate(format: Format, logoDataUrl: string = ''): string {
  const isStories = format.key === 'stories';
  const isSquare = format.key === 'post';
  const W = format.width;
  const H = format.height;

  // Tamanhos refinados para um design premium
  const logoW    = isStories ? 240 : isSquare ? 160 : 200;
  const logoH    = isStories ? 64  : isSquare ? 42  : 52;
  const pad      = isStories ? 80  : 60;
  const titleFS  = isStories ? '84px' : isSquare ? '64px' : '72px';
  const subFS    = isStories ? '30px' : '22px';
  const tagFS    = isStories ? '18px' : '13px';
  const ctaFS    = isStories ? '24px' : '16px';
  const footerFS = isStories ? '20px' : '14px';
  const siteBtnSz = isStories ? 56 : isSquare ? 40 : 46;

  // Cores Premium
  const bgDark = '#060a0d';
  const bgLight = '#0d151a';
  const gold = '#f1bd89';
  const goldMuted = 'rgba(241, 189, 137, 0.6)';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    width: ${W}px; height: ${H}px; overflow: hidden; 
    font-family: 'Inter', sans-serif; 
    background: ${bgDark}; position: relative; 
    color: #e2e8f0;
  }
  
  /* Fundos e Texturas */
  .bg-gradient { 
    position: absolute; inset: 0; 
    background: radial-gradient(120% 120% at 50% 0%, ${bgLight} 0%, ${bgDark} 100%); 
  }
  .grain { 
    position: absolute; inset: 0; 
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E"); 
    pointer-events: none;
    mix-blend-mode: overlay;
  }
  
  /* Iluminação sofisticada (Glows) */
  .glow-top-left {
    position: absolute; top: -150px; left: -150px; 
    width: 600px; height: 600px; 
    background: radial-gradient(circle, rgba(241,189,137,0.06) 0%, transparent 70%);
    filter: blur(60px); pointer-events: none;
  }
  .glow-bottom-right {
    position: absolute; bottom: -200px; right: -200px; 
    width: 800px; height: 800px; 
    background: radial-gradient(circle, rgba(241,189,137,0.04) 0%, transparent 70%);
    filter: blur(80px); pointer-events: none;
  }

  /* Moldura fina e elegante */
  .frame {
    position: absolute;
    inset: ${isStories ? '40px' : '30px'};
    border: 1px solid rgba(241,189,137,0.12);
    border-radius: ${isStories ? '16px' : '12px'};
    pointer-events: none;
    z-index: 5;
  }
  .frame::before, .frame::after {
    content: ''; position: absolute; left: 50%; transform: translateX(-50%);
    width: 120px; height: 1px; background: ${bgDark};
  }
  .frame::before { top: -1px; }
  .frame::after { bottom: -1px; }

  /* Layout Base */
  .container { 
    position: relative; z-index: 10; 
    padding: ${isStories ? '100px 80px' : '80px 70px'}; 
    height: 100%; display: flex; flex-direction: column; 
    justify-content: space-between; 
  }

  /* Logo: Usando Mask para colorir de Dourado/Bege automaticamente */
  .logo-area { 
    display: flex; align-items: center; 
    margin-bottom: ${isStories ? '0' : '40px'}; 
  }
  .logo-img { 
    width: ${logoW}px; height: ${logoH}px; 
    background-color: ${gold};
    -webkit-mask-image: url("${logoDataUrl || ''}");
    -webkit-mask-size: contain;
    -webkit-mask-position: left center;
    -webkit-mask-repeat: no-repeat;
    mask-image: url("${logoDataUrl || ''}");
    mask-size: contain;
    mask-position: left center;
    mask-repeat: no-repeat;
    flex-shrink: 0; 
  }
  .logo-fallback { 
    font-family: 'Playfair Display', serif; font-size: ${isStories ? '32px' : '26px'}; 
    font-weight: 500; color: ${gold}; letter-spacing: 3px; text-transform: uppercase; 
  }

  /* Conteúdo Principal */
  .main-content { 
    flex: 1; display: flex; flex-direction: column; 
    justify-content: center; 
  }
  .tag-wrapper {
    display: flex; flex-direction: column; align-items: flex-start;
    margin-bottom: ${isStories ? '40px' : '28px'};
  }
  .tag { 
    font-size: ${tagFS}; font-weight: 400; color: ${gold}; 
    letter-spacing: 6px; text-transform: uppercase; 
  }
  .tag-line {
    width: ${isStories ? '80px' : '50px'}; height: 1px; 
    background: linear-gradient(90deg, ${gold}, transparent);
    margin-top: 16px;
  }

  .titulo { 
    font-family: 'Playfair Display', serif; font-size: ${titleFS}; 
    font-weight: 400; line-height: 1.1; color: #ffffff; 
    margin-bottom: ${isStories ? '32px' : '24px'}; 
    word-break: break-word;
    letter-spacing: -1px;
  }
  .titulo span { 
    color: ${gold}; font-style: italic; 
  }

  .subtitulo { 
    font-size: ${subFS}; font-weight: 300; color: rgba(255,255,255,0.65); 
    line-height: 1.6; max-width: ${isStories ? '95%' : '85%'}; 
    margin-bottom: ${isStories ? '56px' : '40px'}; 
  }

  /* Call to Action Premium */
  .cta { 
    display: inline-flex; align-items: center; justify-content: space-between;
    gap: ${isStories ? '32px' : '24px'}; 
    background: rgba(255,255,255,0.02); 
    border: 1px solid rgba(241,189,137,0.25); 
    border-radius: 100px; 
    padding: ${isStories ? '20px 32px 20px 40px' : '14px 24px 14px 32px'}; 
    color: ${gold}; font-size: ${ctaFS}; font-weight: 400; 
    letter-spacing: 2px; text-transform: uppercase; align-self: flex-start; 
  }
  .cta-icon-wrapper {
    width: ${isStories ? '48px' : '36px'}; height: ${isStories ? '48px' : '36px'};
    background: ${gold}; color: ${bgDark};
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: ${isStories ? '20px' : '16px'}; font-weight: 600;
  }

  /* Rodapé */
  .footer { 
    display: flex; align-items: flex-end; justify-content: space-between; 
    margin-top: auto; 
  }
  .footer-left { 
    display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; 
  }
  .footer-info { 
    font-size: ${footerFS}; color: rgba(255,255,255,0.4); letter-spacing: 2px; 
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 300;
  }
  .footer-site { 
    font-size: ${footerFS}; color: ${goldMuted}; letter-spacing: 2px; font-weight: 400;
  }
  .site-btn { 
    flex-shrink: 0; width: ${siteBtnSz}px; height: ${siteBtnSz}px; 
    border-radius: 50%; border: 1px solid rgba(241,189,137,0.15); 
    display: flex; align-items: center; justify-content: center; 
    color: ${gold}; font-size: ${Math.round(siteBtnSz * 0.4)}px; font-weight: 300;
  }
</style>
</head>
<body>
<div class="bg-gradient"></div>
<div class="glow-top-left"></div>
<div class="glow-bottom-right"></div>
<div class="grain"></div>
<div class="frame"></div>

<div class="container">
  <div class="logo-area">
    ${logoDataUrl
      ? `<div class="logo-img"></div>`
      : `<span class="logo-fallback">BM Juris</span>`
    }
  </div>

  <div class="main-content">
    <div class="tag-wrapper">
      <div class="tag" data-editable="tag" data-label="Tag Temática" data-type="text">Direito Digital</div>
      <div class="tag-line"></div>
    </div>
    
    <h1 class="titulo" data-editable="titulo" data-label="Título Principal" data-type="text">Seu Direito,<br><span>Nossa Causa.</span></h1>
    
    <p class="subtitulo" data-editable="subtitulo" data-label="Subtítulo / Descrição" data-type="textarea">Acompanhamento especializado e personalizado para cada etapa do seu processo.</p>
    
    <div class="cta">
      <span data-editable="cta" data-label="Texto do Botão" data-type="text">Fale Conosco</span>
      <div class="cta-icon-wrapper">&#x2192;</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">
      <span class="footer-info" data-editable="contato" data-label="Contato / Redes" data-type="text">@bmjuris</span>
      <span class="footer-site" data-editable="site" data-label="Site" data-type="text">bmjuris.com.br</span>
    </div>
    <div class="site-btn">&#x2197;</div>
  </div>
</div>
</body>
</html>`;
}


function buildInformativoTemplate(format: Format, logoDataUrl: string = ''): string {
  const isStories = format.key === 'stories';
  const isSquare  = format.key === 'post';
  const W = format.width;
  const H = format.height;

  const titleSize  = isStories ? 88  : isSquare ? 56  : 72;
  const subSize    = isStories ? 34  : isSquare ? 22  : 28;
  const badgeSize  = isStories ? 20  : isSquare ? 14  : 17;
  const tagSize    = isStories ? 18  : isSquare ? 12  : 15;
  const ctaSize    = isStories ? 30  : isSquare ? 20  : 25;
  const subCtaSize = isStories ? 20  : isSquare ? 14  : 17;
  const titleLS    = isStories ? -2.5 : isSquare ? -1.5 : -2;
  const hPad       = isStories ? 80 : isSquare ? 52 : 66;
  const cardInset  = isStories ? 58 : isSquare ? 38 : 48;
  const hVPad      = isStories ? 68 : isSquare ? 46 : 56;
  const hrMT       = isStories ? 44 : isSquare ? 28 : 36;
  const badgePadT  = isStories ? 52 : isSquare ? 34 : 44;
  const bPadI      = isStories ? '12px 26px' : isSquare ? '8px 16px' : '10px 20px';
  const cPadT      = isStories ? 56 : isSquare ? 40 : 48;
  const cPadB      = isStories ? 60 : isSquare ? 40 : 50;
  const titleMB    = isStories ? 44 : isSquare ? 24 : 34;
  const preMB      = isStories ? 44 : isSquare ? 24 : 34;
  const preW       = isStories ? 44 : isSquare ? 28 : 36;
  const btnSz      = isStories ? 74 : isSquare ? 52 : 62;
  const fPadV      = isStories ? 38 : isSquare ? 24 : 30;
  const divMX      = isStories ? 80 : isSquare ? 52 : 66;
  const bRadius    = isStories ? 44 : isSquare ? 30 : 38;
  const logoW      = isStories ? 188 : isSquare ? 132 : 160;
  const logoH      = isStories ? 52  : isSquare ? 36  : 44;
  const cornerSz   = isStories ? 28  : isSquare ? 18  : 22;
  const wmW        = isStories ? 860 : isSquare ? 640 : 750;
  const wmH        = isStories ? 242 : isSquare ? 180 : 212;
  const wmBottom   = isStories ? 110 : isSquare ? 50  : 80;
  const gridSz     = isStories ? 80  : isSquare ? 56  : 68;
  // Distribuicao vertical: Stories = texto no fundo (editorial), Feed = centralizado, Square = do topo
  const cJust      = isStories ? 'flex-end' : isSquare ? 'flex-start' : 'center';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informativo Juridico — BM Juris</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  /* Fontes carregadas via <link> no head para melhor compatibilidade */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; font-family: 'Manrope', sans-serif; background: #08151b; position: relative; }
  .bg { position: absolute; inset: 0; background: radial-gradient(ellipse 110% 50% at 85% -5%, rgba(241,189,137,0.065) 0%, transparent 52%), radial-gradient(ellipse 70% 55% at 5% 95%, rgba(19,32,38,0.75) 0%, transparent 58%), linear-gradient(155deg, #0d1f27 0%, #08151b 42%, #061018 100%); }
  .bg-grid { position: absolute; inset: 0; z-index: 1; pointer-events: none; background-image: linear-gradient(rgba(241,189,137,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(241,189,137,0.022) 1px, transparent 1px); background-size: ${gridSz}px ${gridSz}px; }
  .top-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 20; background: linear-gradient(to right, transparent 5%, #f1bd89 35%, rgba(241,189,137,0.3) 72%, transparent); }
  .wm-logo { position: absolute; right: -${Math.round(wmW * 0.22)}px; bottom: ${wmBottom}px; width: ${wmW}px; height: ${wmH}px; opacity: 0.042; pointer-events: none; z-index: 2; display: flex; align-items: center; justify-content: flex-end; }
  .wm-logo img { width: 100%; height: 100%; object-fit: contain; object-position: right center; }
  .card { position: absolute; top: ${cardInset}px; left: ${cardInset}px; right: ${cardInset}px; bottom: ${cardInset}px; background: linear-gradient(165deg, #132026 0%, #0d1c23 52%, #08151b 100%); border-radius: ${bRadius}px; border: 1px solid rgba(241,189,137,0.10); display: flex; flex-direction: column; overflow: hidden; z-index: 10; box-shadow: inset 0 1px 0 rgba(241,189,137,0.06), 0 50px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4); }
  .corner { position: absolute; width: ${cornerSz}px; height: ${cornerSz}px; pointer-events: none; z-index: 30; }
  .corner-tl { top: 0; left: 0; border-top: 2px solid rgba(241,189,137,0.38); border-left: 2px solid rgba(241,189,137,0.38); border-radius: ${bRadius}px 0 0 0; }
  .corner-tr { top: 0; right: 0; border-top: 2px solid rgba(241,189,137,0.18); border-right: 2px solid rgba(241,189,137,0.18); border-radius: 0 ${bRadius}px 0 0; }
  .corner-bl { bottom: 0; left: 0; border-bottom: 2px solid rgba(241,189,137,0.18); border-left: 2px solid rgba(241,189,137,0.18); border-radius: 0 0 0 ${bRadius}px; }
  .corner-br { bottom: 0; right: 0; border-bottom: 2px solid rgba(241,189,137,0.10); border-right: 2px solid rgba(241,189,137,0.10); border-radius: 0 0 ${bRadius}px 0; }
  .header { padding: ${hVPad}px ${hPad}px 0; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .logo-img { width: ${logoW}px; height: ${logoH}px; flex-shrink: 0; display: block; object-fit: contain; object-position: left center; }
  .header-tag { font-family: 'Inter', sans-serif; font-size: ${tagSize}px; font-weight: 400; color: rgba(241,189,137,0.32); letter-spacing: ${isStories ? 3 : 2}px; text-transform: uppercase; }
  .header-hr { margin: ${hrMT}px ${hPad}px 0; height: 1px; flex-shrink: 0; background: linear-gradient(to right, rgba(241,189,137,0.16), rgba(241,189,137,0.04), transparent); }
  .badge-row { padding: ${badgePadT}px ${hPad}px 0; display: flex; align-items: stretch; align-self: flex-start; flex-shrink: 0; }
  .badge-filled { background: #f1bd89; color: #08151b; font-family: 'Manrope', sans-serif; font-size: ${badgeSize}px; font-weight: 800; letter-spacing: ${isStories ? 3.5 : 2.5}px; text-transform: uppercase; padding: ${bPadI}; border-radius: 5px 0 0 5px; display: flex; align-items: center; }
  .badge-outline { color: #f1bd89; font-family: 'Manrope', sans-serif; font-size: ${badgeSize}px; font-weight: 700; letter-spacing: ${isStories ? 3.5 : 2.5}px; text-transform: uppercase; padding: ${bPadI}; border: 1.5px solid rgba(241,189,137,0.38); border-left: none; border-radius: 0 5px 5px 0; display: flex; align-items: center; background: rgba(241,189,137,0.04); }
  .content { flex: 1; overflow: hidden; padding: ${cPadT}px ${hPad}px ${cPadB}px; display: flex; flex-direction: column; justify-content: ${cJust}; }
  .pre-line { width: ${preW}px; height: 3px; flex-shrink: 0; background: linear-gradient(to right, #f1bd89, rgba(241,189,137,0.12)); border-radius: 2px; margin-bottom: ${preMB}px; }
  .titulo { font-family: 'Manrope', sans-serif; font-size: ${titleSize}px; font-weight: 800; line-height: 1.06; color: #d7e5ed; letter-spacing: ${titleLS}px; margin-bottom: ${titleMB}px; word-break: break-word; hyphens: auto; flex-shrink: 0; }
  .subtitulo { font-family: 'Inter', sans-serif; font-size: ${subSize}px; font-weight: 400; line-height: 1.65; color: rgba(187,201,209,0.58); max-width: 94%; flex-shrink: 0; }
  .card-divider { flex-shrink: 0; margin: 0 ${divMX}px; height: 1px; background: linear-gradient(to right, rgba(241,189,137,0.13), transparent); }
  .footer { flex-shrink: 0; padding: ${fPadV}px ${hPad}px; display: flex; align-items: center; justify-content: space-between; gap: 20px; background: rgba(4,8,11,0.52); }
  .footer-left { display: flex; flex-direction: column; gap: ${isStories ? 5 : 3}px; flex: 1; min-width: 0; }
  .footer-cta { font-family: 'Manrope', sans-serif; font-size: ${ctaSize}px; font-weight: 600; color: #f1bd89; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .footer-sub { font-family: 'Inter', sans-serif; font-size: ${subCtaSize}px; font-weight: 400; color: rgba(187,201,209,0.28); letter-spacing: 1px; }
  .footer-btn { flex-shrink: 0; width: ${btnSz}px; height: ${btnSz}px; border-radius: 50%; background: rgba(241,189,137,0.07); border: 1.5px solid rgba(241,189,137,0.26); display: flex; align-items: center; justify-content: center; color: #f1bd89; font-size: ${Math.round(btnSz * 0.34)}px; }
</style>
</head>
<body>
<div class="bg"></div><div class="bg-grid"></div><div class="top-accent"></div>
<div class="wm-logo"></div>
<div class="card">
  <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div><div class="corner corner-br"></div>
  <div class="header">
    <div class="logo-img" title="BM Juris Advocacia">${logoDataUrl ? `<img src="${logoDataUrl}" style="width:100%;height:100%;object-fit:contain;object-position:left center;display:block;" alt="BM Juris">` : '<span style="font-family:\'Playfair Display\',serif;font-size:' + Math.round(logoH * 0.55) + 'px;font-weight:700;color:#f1bd89;letter-spacing:2px;">BM Juris</span>'}</div>
    <span class="header-tag" data-editable="header-tag" data-label="Tag do Header" data-type="text">OAB/SP</span>
  </div>
  <div class="header-hr"></div>
  <div class="badge-row">
    <span class="badge-filled" data-editable="badge-label" data-label="Badge Parte Clara" data-type="text">INFORMATIVO</span>
    <span class="badge-outline" data-editable="badge-tipo" data-label="Badge Parte Escura" data-type="text">JURIDICO</span>
  </div>
  <div class="content">
    <div class="pre-line"></div>
    <h1 class="titulo" data-editable="titulo" data-label="Titulo Principal" data-type="textarea">Presos no semiaberto podem cumprir pena fora do presidio?</h1>
    <p class="subtitulo" data-editable="subtitulo" data-label="Subtitulo" data-type="textarea">Entenda quando a Justica permite o chamado semiaberto harmonizado e quem pode ser beneficiado.</p>
  </div>
  <div class="card-divider"></div>
  <div class="footer">
    <div class="footer-left">
      <span class="footer-cta" data-editable="cta" data-label="Texto do CTA" data-type="text">Veja a materia completa no site</span>
      <span class="footer-sub" data-editable="site" data-label="Site" data-type="text">bmjuris.com.br</span>
    </div>
    <div class="footer-btn">&#x2197;</div>
  </div>
</div>
</body>
</html>`;
}

// ─── Helper: Fetch Google Fonts CSS + resolve @font-face woff2 as base64 ──────

async function fetchFontsAsBase64(): Promise<string> {
  const googleFontsUrl =
    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap';
  try {
    // Fetch CSS with a Chrome UA so Google returns woff2
    const cssResp = await fetch(googleFontsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
    });
    const css = await cssResp.text();

    // Extract all woff2 URLs from the CSS
    const urlMatches = [...css.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/['",]/g, ''));
    const woff2Urls = urlMatches.filter(u => u.includes('.woff2') || u.includes('fonts.gstatic'));

    // Fetch each font file and encode as base64
    let patchedCss = css;
    await Promise.all(
      woff2Urls.map(async (url) => {
        try {
          const fontResp = await fetch(url);
          const buf = await fontResp.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          bytes.forEach(b => { binary += String.fromCharCode(b); });
          const b64 = btoa(binary);
          const dataUri = `data:font/woff2;base64,${b64}`;
          patchedCss = patchedCss.split(url).join(dataUri);
        } catch (_) {}
      })
    );
    return `<style>${patchedCss}</style>`;
  } catch (_) {
    // Fallback: use Google Fonts via @import (may not work in canvas but at least loads in preview)
    return `<link rel="stylesheet" href="${googleFontsUrl}">`;
  }
}

// ─── Helper: Read folder files ────────────────────────────────────────────────

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Helper: Parse editable fields from HTML ─────────────────────────────────

function parseEditableFields(htmlString: string): EditableField[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const elements = doc.querySelectorAll('[data-editable]');
  const fields: EditableField[] = [];
  const seen = new Set<string>();

  elements.forEach((el) => {
    const key = el.getAttribute('data-editable') || '';
    if (!key || seen.has(key)) return;
    seen.add(key);
    const type = (el.getAttribute('data-type') || 'text') as EditableField['type'];
    const label = el.getAttribute('data-label') || key;

    let currentValue = '';
    if (type === 'color') {
      currentValue = (el as HTMLElement).style.backgroundColor || '#f1bd89';
    } else if (type === 'image') {
      currentValue = (el as HTMLImageElement).src || '';
    } else {
      currentValue = el.textContent?.trim() || '';
    }

    fields.push({
      key,
      label,
      type,
      selector: `[data-editable="${key}"]`,
      currentValue,
    });
  });

  return fields;
}

// ─── Helper: Apply field updates to iframe ───────────────────────────────────

function applyFieldToIframe(
  iframe: HTMLIFrameElement | null,
  field: EditableField,
  value: string
) {
  if (!iframe?.contentDocument) return;
  const el = iframe.contentDocument.querySelector(field.selector) as HTMLElement | null;
  if (!el) return;

  if (field.type === 'color') {
    el.style.backgroundColor = value;
  } else if (field.type === 'image') {
    const img = el as HTMLImageElement;
    img.style.display = 'block';
    img.src = value;
  } else {
    el.textContent = value;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

const BUILTIN_TEMPLATES: { key: BuiltinKey; label: string; sublabel: string; emoji: string }[] = [
  { key: 'classico', label: 'BM Juris Clássico', sublabel: 'Estilo minimalista premium', emoji: '✨' },
  { key: 'informativo', label: 'Informativo Jurídico', sublabel: 'Cards de notícias e artigos', emoji: '📰' },
];

export function MarketingVisual() {
  const [selectedFormat, setSelectedFormat] = useState<Format>(FORMATS[0]);
  const [selectedBuiltin, setSelectedBuiltin] = useState<BuiltinKey>('classico');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [useBuiltin, setUseBuiltin] = useState(true);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [zoom, setZoom] = useState(0.3);
  const [isExporting, setIsExporting] = useState(false);
  const [fileMap, setFileMap] = useState<Record<string, string>>({});
  // Logo carregada como data URL para evitar problemas de CORS no html2canvas
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Carrega logo.png como data URL ao montar ───────────────────────────────
  useEffect(() => {
    fetch('/logo.png')
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.readAsDataURL(blob);
      }))
      .then(setLogoDataUrl)
      .catch(() => {});
  }, []);

  // ── Load template into iframe ──────────────────────────────────────────────

  const loadTemplate = useCallback(
    (html: string, fm: Record<string, string> = {}) => {
      // Replace relative asset paths with data URLs from the file map
      let processed = html;
      Object.entries(fm).forEach(([filename, dataUrl]) => {
        // Replace relative references (src="filename", url('filename'), etc.)
        const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        processed = processed.replace(
          new RegExp(`(src=["'])(?!data:|http|blob:)(${escaped})`, 'gi'),
          `$1${dataUrl}`
        );
        processed = processed.replace(
          new RegExp(`(url\\(["']?)(?!data:|http|blob:)(${escaped})`, 'gi'),
          `$1${dataUrl}`
        );
        // Also try basename matches
        const basename = filename.split('/').pop() || filename;
        if (basename !== filename) {
          const escapedBase = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          processed = processed.replace(
            new RegExp(`(src=["'])(?!data:|http|blob:)(${escapedBase})`, 'gi'),
            `$1${dataUrl}`
          );
          processed = processed.replace(
            new RegExp(`(url\\(["']?)(?!data:|http|blob:)(${escapedBase})`, 'gi'),
            `$1${dataUrl}`
          );
        }
      });

      setHtmlContent(processed);
      const parsedFields = parseEditableFields(processed);
      setFields(parsedFields);

      // Set initial values
      const initialValues: Record<string, string> = {};
      parsedFields.forEach((f) => {
        initialValues[f.key] = f.currentValue;
      });
      setFieldValues(initialValues);
    },
    []
  );

  // ── Write HTML to iframe srcdoc ────────────────────────────────────────────

  useEffect(() => {
    if (!htmlContent || !iframeRef.current) return;
    iframeRef.current.srcdoc = htmlContent;
  }, [htmlContent, selectedFormat]);

  // ── Reapply all field values after iframe loads ────────────────────────────

  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current) return;
    fields.forEach((field) => {
      const val = fieldValues[field.key];
      if (val !== undefined) {
        applyFieldToIframe(iframeRef.current, field, val);
      }
    });
  }, [fields, fieldValues]);

  // ── Switch format ──────────────────────────────────────────────────────────

  const getBuiltinHtml = useCallback((builtinKey: BuiltinKey, fmt: Format): string => {
    if (builtinKey === 'informativo') return buildInformativoTemplate(fmt, logoDataUrl);
    return buildBuiltinTemplate(fmt, logoDataUrl);
  }, [logoDataUrl]);

  useEffect(() => {
    if (useBuiltin) {
      const html = getBuiltinHtml(selectedBuiltin, selectedFormat);
      loadTemplate(html);
    }
  }, [selectedFormat, selectedBuiltin, useBuiltin, loadTemplate, getBuiltinHtml]);

  // ── Handle folder upload ───────────────────────────────────────────────────

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsLoading(true);
    setUploadStatus('idle');

    try {
      const htmlFile = files.find(
        (f) =>
          f.name.endsWith('.html') ||
          f.name.endsWith('.htm')
      );

      if (!htmlFile) {
        setUploadStatus('error');
        setUploadMessage('Nenhum arquivo HTML encontrado na pasta.');
        return;
      }

      // Read all non-HTML files as data URLs
      const newFileMap: Record<string, string> = {};
      await Promise.all(
        files
          .filter((f) => !f.name.endsWith('.html') && !f.name.endsWith('.htm'))
          .map(async (f) => {
            const baseName = f.name.split('/').pop() || f.name;
            const webkitPath = (f as any).webkitRelativePath || f.name;
            const dataUrl = await readFileAsDataURL(f);
            newFileMap[baseName] = dataUrl;
            newFileMap[webkitPath] = dataUrl;
          })
      );

      setFileMap(newFileMap);

      const htmlText = await readFileAsText(htmlFile);
      setUseBuiltin(false);
      loadTemplate(htmlText, newFileMap);
      setUploadStatus('success');
      setUploadMessage(`Template "${htmlFile.name}" carregado com ${files.length} arquivos.`);
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage('Erro ao carregar a pasta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle field change ────────────────────────────────────────────────────

  const handleFieldChange = (field: EditableField, value: string) => {
    setFieldValues((prev) => ({ ...prev, [field.key]: value }));
    applyFieldToIframe(iframeRef.current, field, value);
  };

  // ── Handle image upload for a field ───────────────────────────────────────

  const handleImageFieldUpload = (field: EditableField, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      handleFieldChange(field, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // ── Reset to builtin ───────────────────────────────────────────────────────

  const resetToBuiltin = () => {
    setUseBuiltin(true);
    setUploadStatus('idle');
    setUploadMessage('');
    setFileMap({});
    if (fileInputRef.current) fileInputRef.current.value = '';
    const html = getBuiltinHtml(selectedBuiltin, selectedFormat);
    loadTemplate(html);
  };

  const selectBuiltin = (key: BuiltinKey) => {
    setSelectedBuiltin(key);
    setUseBuiltin(true);
    setUploadStatus('idle');
    setUploadMessage('');
    setFileMap({});
    if (fileInputRef.current) fileInputRef.current.value = '';
    const html = getBuiltinHtml(key, selectedFormat);
    loadTemplate(html);
  };

  // ── Export as PNG ──────────────────────────────────────────────────────────

  const exportAsPNG = async () => {
    if (!htmlContent) return;
    setIsExporting(true);
    try {
      // 1. Monta HTML fiel: aplica valores editados via DOM parser e serializa de volta
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Reaplica valores editados no documento parseado
      fields.forEach((field) => {
        const val = fieldValues[field.key];
        if (val === undefined) return;
        const el = doc.querySelector(field.selector) as HTMLElement | null;
        if (!el) return;
        if (field.type === 'color') {
          el.style.backgroundColor = val;
        } else if (field.type === 'image') {
          (el as HTMLImageElement).src = val;
          (el as HTMLImageElement).style.display = 'block';
        } else {
          el.textContent = val;
        }
      });

      // 2. Busca fontes como base64 para garantir rendering idêntico ao preview
      const fontsStyleTag = await fetchFontsAsBase64();

      // 3. Injeta fontes no <head> do documento e remove links de fontes externas
      const head = doc.querySelector('head')!;
      // Remove links de carregamento de fontes externas (serão substituídos pelo base64)
      head.querySelectorAll('link[href*="fonts.googleapis"], link[href*="fonts.gstatic"]').forEach(l => l.remove());
      head.querySelectorAll('style').forEach(s => {
        s.textContent = (s.textContent || '').replace(/@import url\(['"]?https:\/\/fonts\.googleapis[^)]+\)['"]?;?/gi, '');
      });
      // Injeta as fontes base64 no início do head
      const fontEl = doc.createElement('div');
      fontEl.innerHTML = fontsStyleTag;
      const fontStyleEl = fontEl.firstElementChild;
      if (fontStyleEl) head.insertBefore(fontStyleEl, head.firstChild);

      // 4. Injeta logo como <img> com data URL se disponível
      const logoContainer = doc.querySelector('.logo-img') as HTMLElement | null;
      if (logoContainer && logoDataUrl) {
        logoContainer.innerHTML = '';
        const logoImg = doc.createElement('img');
        logoImg.src = logoDataUrl;
        logoImg.style.cssText = 'width:100%;height:100%;object-fit:contain;object-position:left center;display:block;';
        logoContainer.appendChild(logoImg);
      }

      // 5. Serializa o HTML completo e corrigido
      const serialized = new XMLSerializer().serializeToString(doc);
      const fullHtml = `<!DOCTYPE html>${serialized}`;

      // 6. Cria iframe off-screen para render real
      const wrapper = document.createElement('div');
      Object.assign(wrapper.style, {
        position: 'fixed',
        top: `-${selectedFormat.height * 3}px`,
        left: '0',
        width: `${selectedFormat.width}px`,
        height: `${selectedFormat.height}px`,
        overflow: 'hidden',
        zIndex: '-9999',
        pointerEvents: 'none',
        opacity: '0',
      });
      document.body.appendChild(wrapper);

      const exportFrame = document.createElement('iframe');
      Object.assign(exportFrame.style, {
        width: `${selectedFormat.width}px`,
        height: `${selectedFormat.height}px`,
        border: 'none',
        display: 'block',
      });
      exportFrame.srcdoc = fullHtml;
      wrapper.appendChild(exportFrame);

      // 7. Aguarda iframe carregar e fontes renderizarem
      await new Promise<void>((resolve) => {
        const onLoad = async () => {
          try {
            if (exportFrame.contentDocument?.fonts) {
              await exportFrame.contentDocument.fonts.ready;
            }
          } catch (_) {}
          // Buffer para garantir render completo de gradientes e sombras
          setTimeout(resolve, 2000);
        };
        exportFrame.addEventListener('load', onLoad, { once: true });
        setTimeout(resolve, 8000); // fallback máximo
      });

      // 8. Captura via html2canvas no documento REAL do iframe
      // Importamos dinamicamente para não quebrar o build caso seja removido
      const html2canvas = (await import('html2canvas')).default;
      const iframeDoc = exportFrame.contentDocument;
      if (iframeDoc) {
        const canvas = await html2canvas(iframeDoc.documentElement, {
          width: selectedFormat.width,
          height: selectedFormat.height,
          windowWidth: selectedFormat.width,
          windowHeight: selectedFormat.height,
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#08151b',
          logging: false,
          imageTimeout: 20000,
          foreignObjectRendering: true,
        });

        const link = document.createElement('a');
        link.download = `bm-marketing-${selectedFormat.key}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      }

      // 9. Limpeza
      document.body.removeChild(wrapper);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao exportar. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Zoom helpers ───────────────────────────────────────────────────────────

  const zoomIn = () => setZoom((z) => Math.min(z + 0.05, 0.7));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.05, 0.1));
  const resetZoom = () => {
    const previewArea = 600;
    const naturalZoom = previewArea / Math.max(selectedFormat.width, selectedFormat.height);
    setZoom(naturalZoom);
  };

  useEffect(() => {
    resetZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormat]);

  // ─────────────────────────────────────────────────────────────────────────

  const previewW = selectedFormat.width * zoom;
  const previewH = selectedFormat.height * zoom;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-outline-variant/10 bg-surface-container-low">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
            <Palette className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="font-headline font-bold text-on-surface text-lg leading-none">Marketing Visual</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">Crie artes para redes sociais com templates HTML</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-surface-container rounded-xl px-2 py-1 border border-outline-variant/10">
            <button onClick={zoomOut} className="p-1.5 hover:text-secondary text-on-surface-variant transition-colors rounded-lg hover:bg-surface-container-high">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-on-surface-variant w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} className="p-1.5 hover:text-secondary text-on-surface-variant transition-colors rounded-lg hover:bg-surface-container-high">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetZoom} className="p-1.5 hover:text-secondary text-on-surface-variant transition-colors rounded-lg hover:bg-surface-container-high ml-1">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={exportAsPNG}
            disabled={isExporting || !htmlContent}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
              'bg-secondary text-on-secondary hover:bg-secondary/90 active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isExporting && 'animate-pulse'
            )}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exportando...' : 'Exportar PNG'}
          </button>
        </div>
      </div>

      {/* ── Body: 3 painéis ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Painel Esquerdo ── */}
        <aside className="w-72 shrink-0 border-r border-outline-variant/10 bg-surface-container flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* Formato */}
          <div className="p-5 border-b border-outline-variant/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
              <Layers className="w-3 h-3" /> Formato
            </p>
            <div className="space-y-2">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt.key}
                  onClick={() => setSelectedFormat(fmt)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                    selectedFormat.key === fmt.key
                      ? 'bg-secondary/10 border-secondary/30 text-secondary'
                      : 'border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  )}
                >
                  <span className="text-xl">{fmt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-none">{fmt.label}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{fmt.sublabel}</p>
                  </div>
                  <span className="text-[9px] font-mono opacity-50 shrink-0">
                    {fmt.width}×{fmt.height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Template */}
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
              <FolderOpen className="w-3 h-3" /> Template HTML
            </p>

            {/* Built-in template selector */}
            <p className="text-[10px] text-outline mb-2">Templates prontos:</p>
            <div className="space-y-1.5 mb-4">
              {BUILTIN_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  onClick={() => selectBuiltin(tpl.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                    useBuiltin && selectedBuiltin === tpl.key
                      ? 'bg-secondary/10 border-secondary/30 text-secondary'
                      : 'border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  )}
                >
                  <span className="text-base">{tpl.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-none">{tpl.label}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{tpl.sublabel}</p>
                  </div>
                  {useBuiltin && selectedBuiltin === tpl.key && (
                    <CheckCircle className="w-3.5 h-3.5 text-secondary shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom upload status */}
            {!useBuiltin && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium leading-tight">Template personalizado ativo</span>
              </div>
            )}

            {/* Upload area */}
            <label
              htmlFor="folder-upload"
              className={cn(
                'group flex flex-col items-center justify-center gap-2 px-4 py-6',
                'border-2 border-dashed border-outline-variant/20 rounded-xl',
                'hover:border-secondary/40 hover:bg-secondary/5 transition-all cursor-pointer',
                isLoading && 'opacity-50 pointer-events-none'
              )}
            >
              <Upload className="w-6 h-6 text-on-surface-variant group-hover:text-secondary transition-colors" />
              <p className="text-xs text-on-surface-variant text-center group-hover:text-on-surface transition-colors leading-relaxed">
                <span className="font-semibold text-secondary">Clique aqui</span> para selecionar<br />
                a pasta do template
              </p>
              <p className="text-[10px] text-outline text-center">
                A pasta deve conter um arquivo <span className="font-mono">index.html</span>
              </p>
            </label>
            <input
              id="folder-upload"
              ref={fileInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              multiple
              onChange={handleFolderUpload}
              className="hidden"
            />

            {/* Status message */}
            {uploadStatus !== 'idle' && (
              <div className={cn(
                'mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs',
                uploadStatus === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-error/10 border border-error/20 text-error'
              )}>
                {uploadStatus === 'success'
                  ? <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                }
                <span className="leading-tight">{uploadMessage}</span>
              </div>
            )}

            {/* Reset button */}
            {!useBuiltin && (
              <button
                onClick={resetToBuiltin}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-on-surface-variant hover:text-secondary border border-outline-variant/10 hover:border-secondary/20 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Voltar ao template padrão
              </button>
            )}

            {/* Instructions */}
            <div className="mt-5 p-4 bg-surface-container-high rounded-xl border border-outline-variant/10">
              <p className="text-[10px] font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Como criar um template</p>
              <p className="text-[10px] text-outline leading-relaxed">
                Adicione <code className="text-secondary/80 font-mono bg-secondary/5 px-1 rounded">data-editable="chave"</code> nos elementos HTML que deseja editar. O editor detecta automaticamente os campos.
              </p>
              <div className="mt-3 bg-surface-container-lowest rounded-lg p-3 text-[9px] font-mono text-outline overflow-x-auto">
                <p className="text-secondary/70">&lt;h1</p>
                <p className="pl-2 text-emerald-400/70">data-editable="titulo"</p>
                <p className="pl-2 text-blue-400/70">data-label="Título"</p>
                <p className="pl-2 text-purple-400/70">data-type="text"</p>
                <p className="text-secondary/70">&gt;Texto...&lt;/h1&gt;</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Painel Central: Preview ── */}
        <main className="flex-1 flex flex-col items-center justify-center overflow-auto bg-[#041015] custom-scrollbar p-8">
          {/* Checkerboard hint text */}
          <p className="text-[10px] text-outline/30 mb-4 flex items-center gap-1.5">
            <Eye className="w-3 h-3" />
            Preview ao vivo — {selectedFormat.width}×{selectedFormat.height}px
          </p>

          {/* Canvas area */}
          <div
            className="relative shadow-[0_40px_120px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden"
            style={{ width: previewW, height: previewH }}
          >
            {!htmlContent ? (
              <div
                className="flex flex-col items-center justify-center text-on-surface-variant"
                style={{ width: previewW, height: previewH, background: '#132026' }}
              >
                <Image className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm opacity-40">Carregando template...</p>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                title="preview"
                onLoad={handleIframeLoad}
                sandbox="allow-same-origin allow-scripts"
                scrolling="no"
                className="absolute top-0 left-0 origin-top-left border-0"
                style={{
                  width: selectedFormat.width,
                  height: selectedFormat.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </main>

        {/* ── Painel Direito: Campos Editáveis ── */}
        <aside className="w-80 shrink-0 border-l border-outline-variant/10 bg-surface-container flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-5 border-b border-outline-variant/10 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
              <Wand2 className="w-3 h-3" /> Campos Editáveis
            </p>
            <p className="text-[10px] text-outline mt-1">
              {fields.length > 0
                ? `${fields.length} campo${fields.length !== 1 ? 's' : ''} detectado${fields.length !== 1 ? 's' : ''} no template`
                : 'Nenhum campo detectado'}
            </p>
          </div>

          <div className="flex-1 p-5 space-y-5">
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-outline-variant/10 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-outline" />
                </div>
                <p className="text-xs text-on-surface-variant font-medium">Nenhum campo editável</p>
                <p className="text-[10px] text-outline leading-relaxed max-w-48">
                  Adicione <code className="text-secondary/60">data-editable</code> ao seu template HTML para criar campos de edição aqui.
                </p>
              </div>
            ) : (
              fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    <ChevronRight className="w-3 h-3 text-secondary/50" />
                    {field.label}
                  </label>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={fieldValues[field.key] || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/20 transition-all"
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      value={fieldValues[field.key] || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/20 transition-all resize-none"
                    />
                  )}

                  {field.type === 'color' && (
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={fieldValues[field.key] || '#f1bd89'}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-12 h-10 rounded-xl border border-outline-variant/20 bg-surface-container-high cursor-pointer overflow-hidden p-1"
                      />
                      <input
                        type="text"
                        value={fieldValues[field.key] || '#f1bd89'}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="flex-1 bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface font-mono focus:outline-none focus:border-secondary/50 transition-all"
                      />
                    </div>
                  )}

                  {field.type === 'image' && (
                    <div className="space-y-2">
                      <label className="group flex flex-col items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-outline-variant/20 rounded-xl hover:border-secondary/40 hover:bg-secondary/5 transition-all cursor-pointer">
                        <Upload className="w-5 h-5 text-outline group-hover:text-secondary transition-colors" />
                        <p className="text-xs text-outline group-hover:text-on-surface transition-colors text-center">
                          Clique para enviar uma foto
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageFieldUpload(field, file);
                          }}
                        />
                      </label>
                      {fieldValues[field.key] && (
                        <div className="relative">
                          <img
                            src={fieldValues[field.key]}
                            alt="preview"
                            className="w-full h-24 object-cover rounded-xl border border-outline-variant/10"
                          />
                          <button
                            onClick={() => handleFieldChange(field, '')}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-surface-container-highest/80 rounded-full flex items-center justify-center hover:bg-error/20 hover:text-error transition-all text-on-surface-variant"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Export tip at the bottom */}
          <div className="p-4 border-t border-outline-variant/10 shrink-0">
            <div className="p-3 bg-surface-container-high rounded-xl border border-outline-variant/10">
              <p className="text-[9px] text-outline leading-relaxed">
                💡 <span className="font-semibold text-on-surface-variant">Dica de exportação:</span> Fontes do Google Fonts podem não aparecer no PNG exportado. Para exportação perfeita, use fontes incorporadas no template.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
