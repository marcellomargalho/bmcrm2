import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
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

function buildBuiltinTemplate(format: Format): string {
  const isStories = format.key === 'stories';
  const isSquare = format.key === 'post';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${format.width}px;
    height: ${format.height}px;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    background: #08151b;
  }
  .bg {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, #08151b 0%, #132026 50%, #1a2f38 100%);
  }
  .grain {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: .15;
  }
  .accent-line {
    position: absolute;
    left: ${isStories ? '80px' : '60px'};
    top: ${isStories ? '180px' : '120px'};
    width: 4px;
    height: ${isStories ? '80px' : '60px'};
    background: #f1bd89;
    border-radius: 4px;
  }
  .accent-circle {
    position: absolute;
    right: -120px;
    top: -120px;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    border: 1px solid rgba(241, 189, 137, 0.08);
    background: transparent;
  }
  .accent-circle2 {
    position: absolute;
    right: -180px;
    top: -180px;
    width: 700px;
    height: 700px;
    border-radius: 50%;
    border: 1px solid rgba(241, 189, 137, 0.04);
    background: transparent;
  }
  .container {
    position: relative;
    z-index: 10;
    padding: ${isStories ? '80px' : '60px'};
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: ${isStories ? 'space-between' : 'center'};
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: ${isStories ? '0' : '40px'};
  }
  .logo-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #f1bd89;
  }
  .logo-text {
    font-family: 'Playfair Display', serif;
    font-size: ${isStories ? '28px' : '22px'};
    font-weight: 700;
    color: #f1bd89;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .main-content {
    flex: ${isStories ? '1' : 'unset'};
    display: flex;
    flex-direction: column;
    justify-content: ${isStories ? 'center' : 'flex-start'};
    padding: ${isStories ? '60px 0' : '0'};
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: ${isStories ? '22px' : '16px'};
    font-weight: 500;
    color: #f1bd89;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: ${isStories ? '32px' : '20px'};
  }
  .tag::before {
    content: '';
    display: block;
    width: ${isStories ? '40px' : '30px'};
    height: 1px;
    background: #f1bd89;
  }
  .titulo {
    font-family: 'Playfair Display', serif;
    font-size: ${isStories ? '88px' : isSquare ? '72px' : '64px'};
    font-weight: 900;
    line-height: 1.05;
    color: #d7e5ed;
    margin-bottom: ${isStories ? '40px' : '24px'};
    word-break: break-word;
  }
  .titulo span { color: #f1bd89; }
  .subtitulo {
    font-size: ${isStories ? '32px' : '24px'};
    font-weight: 300;
    color: rgba(215, 229, 237, 0.7);
    line-height: 1.6;
    max-width: ${isStories ? '100%' : '85%'};
    margin-bottom: ${isStories ? '48px' : '32px'};
  }
  .divider {
    width: ${isStories ? '60px' : '40px'};
    height: 2px;
    background: linear-gradient(to right, #f1bd89, transparent);
    margin-bottom: ${isStories ? '48px' : '32px'};
    border-radius: 2px;
  }
  .cta {
    display: inline-flex;
    align-items: center;
    gap: ${isStories ? '20px' : '14px'};
    background: rgba(241, 189, 137, 0.1);
    border: 1px solid rgba(241, 189, 137, 0.3);
    border-radius: 999px;
    padding: ${isStories ? '24px 48px' : '16px 32px'};
    color: #f1bd89;
    font-size: ${isStories ? '26px' : '18px'};
    font-weight: 500;
    letter-spacing: 1px;
    align-self: flex-start;
  }
  .cta-arrow {
    font-size: ${isStories ? '22px' : '16px'};
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: ${isStories ? '60px' : '40px'};
    border-top: 1px solid rgba(255,255,255,0.06);
    margin-top: auto;
  }
  .footer-info {
    font-size: ${isStories ? '24px' : '16px'};
    color: rgba(215, 229, 237, 0.4);
    letter-spacing: 1px;
  }
  .footer-badge {
    font-size: ${isStories ? '20px' : '13px'};
    color: rgba(241, 189, 137, 0.6);
    border: 1px solid rgba(241, 189, 137, 0.2);
    border-radius: 999px;
    padding: ${isStories ? '10px 24px' : '6px 16px'};
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .photo-frame {
    position: absolute;
    right: ${isStories ? '60px' : '50px'};
    bottom: ${isStories ? '220px' : '120px'};
    width: ${isStories ? '340px' : '220px'};
    height: ${isStories ? '400px' : '260px'};
    border-radius: ${isStories ? '24px' : '16px'};
    overflow: hidden;
    border: 2px solid rgba(241, 189, 137, 0.2);
    box-shadow: 0 40px 80px rgba(0,0,0,0.5);
  }
  .photo-frame img {
    width: 100%; height: 100%;
    object-fit: cover;
  }
  .photo-frame-placeholder {
    width: 100%; height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(19, 32, 38, 0.8);
    gap: 16px;
  }
  .photo-frame-placeholder span:first-child {
    font-size: 60px;
    opacity: 0.3;
  }
  .photo-frame-placeholder span:last-child {
    font-size: 18px;
    color: rgba(215, 229, 237, 0.3);
    text-align: center;
    padding: 0 20px;
  }
</style>
</head>
<body>
<div class="bg"></div>
<div class="grain"></div>
<div class="accent-circle"></div>
<div class="accent-circle2"></div>
<div class="accent-line"></div>

<div class="container">
  <div class="logo-area">
    <div class="logo-dot"></div>
    <div class="logo-text" data-editable="logo" data-label="Nome do Escritório" data-type="text">BM Juris</div>
  </div>

  <div class="main-content">
    <div class="tag" data-editable="tag" data-label="Tag Temática" data-type="text">Direito Digital</div>
    <h1 class="titulo" data-editable="titulo" data-label="Título Principal" data-type="text">Seu Direito,<br><span>Nossa Causa.</span></h1>
    <div class="divider"></div>
    <p class="subtitulo" data-editable="subtitulo" data-label="Subtítulo / Descrição" data-type="textarea">Acompanhamento especializado e personalizado para cada etapa do seu processo.</p>
    <div class="cta">
      <span data-editable="cta" data-label="Texto do Botão" data-type="text">Fale Conosco</span>
      <span class="cta-arrow">→</span>
    </div>
  </div>

  <div class="footer">
    <span class="footer-info" data-editable="contato" data-label="Contato / Site" data-type="text">@bmjuris • bmjuris.com.br</span>
    <span class="footer-badge" data-editable="badge" data-label="Badge / OAB" data-type="text">OAB/SP</span>
  </div>
</div>

<div class="photo-frame">
  <img id="foto-cliente" data-editable="foto" data-label="Foto (opcional)" data-type="image" src="" onerror="this.style.display='none'; document.querySelector('.photo-frame-placeholder') && (document.querySelector('.photo-frame-placeholder').style.display='flex')" style="display:none">
  <div class="photo-frame-placeholder">
    <span>📷</span>
    <span>Adicione uma foto no painel lateral</span>
  </div>
</div>
</body>
</html>`;
}

// ─── Built-in: Informativo Jurídico Template ─────────────────────────────────

function buildInformativoTemplate(format: Format): string {
  const isStories  = format.key === 'stories';
  const isSquare   = format.key === 'post';
  const W = format.width;
  const H = format.height;

  // Responsive scale factors
  const titleSize    = isStories ? 100 : isSquare ? 68  : 84;
  const subSize      = isStories ? 38  : isSquare ? 26  : 32;
  const badgeSize    = isStories ? 22  : isSquare ? 16  : 19;
  const badgePad     = isStories ? '14px 28px' : isSquare ? '10px 20px' : '12px 24px';
  const logoW        = isStories ? 200 : isSquare ? 148 : 174;
  const logoH        = isStories ? 56  : isSquare ? 40  : 50;
  const logoNameSize = isStories ? 26  : isSquare ? 18  : 22;
  const headerPad    = isStories ? 72  : isSquare ? 50  : 62;
  const cardInset    = isStories ? 60  : isSquare ? 40  : 50;
  const badgeRowPad  = isStories ? 64  : isSquare ? 44  : 54;
  const contentPad   = isStories ? 72  : isSquare ? 50  : 62;
  const contentPadB  = isStories ? 56  : isSquare ? 40  : 48;
  const titleMB      = isStories ? 60  : isSquare ? 36  : 48;
  const preLineMB    = isStories ? 40  : isSquare ? 24  : 32;
  const footerPad    = isStories ? '44px 80px' : isSquare ? '32px 56px' : '38px 68px';
  const footerBtnSz  = isStories ? 80  : isSquare ? 60  : 70;
  const footerCtaSz  = isStories ? 34  : isSquare ? 24  : 29;
  const footerSubSz  = isStories ? 22  : isSquare ? 16  : 19;
  const dividerMX    = isStories ? 80  : isSquare ? 56  : 68;
  const preLineW     = isStories ? 48  : isSquare ? 34  : 42;
  const borderRadius = isStories ? 44  : isSquare ? 32  : 38;
  const wmLogoW      = isStories ? 900 : isSquare ? 700 : 800;
  const wmLogoH      = isStories ? 260 : isSquare ? 200 : 230;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informativo Jur\u00eddico \u2014 BM Juris</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800\u0026family=Inter:wght@300;400;500;600;700\u0026display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; font-family: 'Manrope', sans-serif; background: #08151b; position: relative; }

  /* ── Fundo ── */
  .bg {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 120% 55% at 85% -5%, rgba(241,189,137,0.07) 0%, transparent 55%),
      radial-gradient(ellipse 80% 60% at 5% 95%, rgba(19,32,38,0.8) 0%, transparent 60%),
      linear-gradient(160deg, #0d1f27 0%, #08151b 45%, #061018 100%);
  }

  /* Grade sutil no fundo */
  .bg-grid {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
    background-image:
      linear-gradient(rgba(241,189,137,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(241,189,137,0.025) 1px, transparent 1px);
    background-size: ${isStories ? '80px 80px' : isSquare ? '60px 60px' : '70px 70px'};
  }

  /* Acento dourado no topo */
  .top-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 20;
    background: linear-gradient(to right, transparent 5%, #f1bd89 40%, rgba(241,189,137,0.35) 75%, transparent);
  }

  /* Watermark: logo BM de baixa opacidade */
  .wm-logo {
    position: absolute;
    right: -${Math.round(wmLogoW * 0.25)}px;
    bottom: ${isStories ? '120px' : isSquare ? '60px' : '90px'};
    width: ${wmLogoW}px;
    height: ${wmLogoH}px;
    background-color: #f1bd89;
    -webkit-mask-image: url('/logo.png');
    mask-image: url('/logo.png');
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: right center;
    mask-position: right center;
    opacity: 0.045;
    pointer-events: none;
    z-index: 2;
  }

  /* ── Card ── */
  .card {
    position: absolute;
    top: ${cardInset}px; left: ${cardInset}px; right: ${cardInset}px; bottom: ${cardInset}px;
    background: linear-gradient(165deg, #132026 0%, #0d1c23 55%, #08151b 100%);
    border-radius: ${borderRadius}px;
    border: 1px solid rgba(241,189,137,0.11);
    display: flex; flex-direction: column; overflow: hidden; z-index: 10;
    box-shadow: inset 0 1px 0 rgba(241,189,137,0.07), 0 60px 140px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.4);
  }

  /* Cantos decorativos do card */
  .corner { position: absolute; width: ${isStories ? 28 : 20}px; height: ${isStories ? 28 : 20}px; pointer-events: none; z-index: 30; }
  .corner-tl { top: 0; left: 0; border-top: 2px solid rgba(241,189,137,0.4); border-left: 2px solid rgba(241,189,137,0.4); border-radius: ${borderRadius}px 0 0 0; }
  .corner-tr { top: 0; right: 0; border-top: 2px solid rgba(241,189,137,0.2); border-right: 2px solid rgba(241,189,137,0.2); border-radius: 0 ${borderRadius}px 0 0; }
  .corner-bl { bottom: 0; left: 0; border-bottom: 2px solid rgba(241,189,137,0.2); border-left: 2px solid rgba(241,189,137,0.2); border-radius: 0 0 0 ${borderRadius}px; }
  .corner-br { bottom: 0; right: 0; border-bottom: 2px solid rgba(241,189,137,0.1); border-right: 2px solid rgba(241,189,137,0.1); border-radius: 0 0 ${borderRadius}px 0; }

  /* ── Header ── */
  .header {
    padding: ${headerPad}px ${isStories ? 80 : isSquare ? 56 : 68}px 0;
    display: flex; align-items: center; justify-content: space-between;
  }

  /* Logo real (máscara CSS sobre logo.png) */
  .logo-img {
    width: ${logoW}px; height: ${logoH}px;
    background-color: #f1bd89;
    -webkit-mask-image: url('/logo.png');
    mask-image: url('/logo.png');
    -webkit-mask-size: contain; mask-size: contain;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
    -webkit-mask-position: left center; mask-position: left center;
    flex-shrink: 0;
  }

  /* Número da edição / tag da direita */
  .header-tag {
    font-family: 'Inter', sans-serif;
    font-size: ${isStories ? 20 : isSquare ? 14 : 17}px;
    font-weight: 400;
    color: rgba(241,189,137,0.35);
    letter-spacing: ${isStories ? 3 : 2}px;
    text-transform: uppercase;
  }

  /* Linha horizontal sob o header */
  .header-hr {
    margin: ${isStories ? 48 : isSquare ? 32 : 40}px ${isStories ? 80 : isSquare ? 56 : 68}px 0;
    height: 1px;
    background: linear-gradient(to right, rgba(241,189,137,0.18), rgba(241,189,137,0.05), transparent);
  }

  /* ── Badge ── */
  .badge-row {
    padding: ${badgeRowPad}px ${isStories ? 80 : isSquare ? 56 : 68}px 0;
    display: flex; align-items: stretch; align-self: flex-start;
  }
  .badge-filled {
    background: #f1bd89; color: #08151b;
    font-family: 'Manrope', sans-serif; font-size: ${badgeSize}px; font-weight: 800;
    letter-spacing: ${isStories ? 4 : 3}px; text-transform: uppercase;
    padding: ${badgePad}; border-radius: 6px 0 0 6px;
    display: flex; align-items: center;
  }
  .badge-outline {
    color: #f1bd89;
    font-family: 'Manrope', sans-serif; font-size: ${badgeSize}px; font-weight: 700;
    letter-spacing: ${isStories ? 4 : 3}px; text-transform: uppercase;
    padding: ${badgePad}; border: 1.5px solid rgba(241,189,137,0.4); border-left: none;
    border-radius: 0 6px 6px 0; display: flex; align-items: center;
    background: rgba(241,189,137,0.04);
  }

  /* ── Conteúdo ── */
  .content {
    flex: 1;
    padding: ${contentPad}px ${isStories ? 80 : isSquare ? 56 : 68}px ${contentPadB}px;
    display: flex; flex-direction: column; justify-content: flex-start;
  }
  .pre-line {
    width: ${preLineW}px; height: 3px;
    background: linear-gradient(to right, #f1bd89, rgba(241,189,137,0.15));
    border-radius: 2px; margin-bottom: ${preLineMB}px;
  }
  .titulo {
    font-family: 'Manrope', sans-serif;
    font-size: ${titleSize}px; font-weight: 800;
    line-height: 1.07; color: #d7e5ed;
    letter-spacing: ${isStories ? -3 : isSquare ? -2 : -2.5}px;
    margin-bottom: ${titleMB}px;
    word-break: break-word; hyphens: auto;
  }
  .subtitulo {
    font-family: 'Inter', sans-serif;
    font-size: ${subSize}px; font-weight: 400;
    line-height: 1.6; color: rgba(187,201,209,0.6);
    max-width: 95%;
  }

  /* ── Divider e Footer ── */
  .card-divider { margin: 0 ${dividerMX}px; height: 1px; background: linear-gradient(to right, rgba(241,189,137,0.14), transparent); }
  .footer {
    padding: ${footerPad}; display: flex; align-items: center;
    justify-content: space-between; gap: 20px; background: rgba(4,8,11,0.55);
  }
  .footer-left { display: flex; flex-direction: column; gap: ${isStories ? 6 : 4}px; flex: 1; }
  .footer-cta { font-family: 'Manrope', sans-serif; font-size: ${footerCtaSz}px; font-weight: 600; color: #f1bd89; line-height: 1.25; }
  .footer-sub { font-family: 'Inter', sans-serif; font-size: ${footerSubSz}px; font-weight: 400; color: rgba(187,201,209,0.3); letter-spacing: 1px; }
  .footer-btn {
    width: ${footerBtnSz}px; height: ${footerBtnSz}px; border-radius: 50%;
    background: rgba(241,189,137,0.07); border: 1.5px solid rgba(241,189,137,0.28);
    display: flex; align-items: center; justify-content: center;
    color: #f1bd89; font-size: ${Math.round(footerBtnSz * 0.36)}px; flex-shrink: 0;
  }
</style>
</head>
<body>
<div class="bg"></div>
<div class="bg-grid"></div>
<div class="top-accent"></div>

<!-- Watermark: logo BM de fundo -->
<div class="wm-logo"></div>

<div class="card">
  <!-- Cantos decorativos -->
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>

  <!-- Header com logo real -->
  <div class="header">
    <div class="logo-img" title="BM Juris Advocacia"></div>
    <span class="header-tag" data-editable="header-tag" data-label="Tag do Header (ex: Edição, OAB)" data-type="text">OAB/SP</span>
  </div>

  <!-- Linha divisória sous o header -->
  <div class="header-hr"></div>

  <!-- Badge de categoria -->
  <div class="badge-row">
    <span class="badge-filled" data-editable="badge-label" data-label="Badge \u2014 Parte Clara" data-type="text">INFORMATIVO</span>
    <span class="badge-outline" data-editable="badge-tipo" data-label="Badge \u2014 Parte Escura" data-type="text">JUR\u00cdDICO</span>
  </div>

  <!-- Conteúdo -->
  <div class="content">
    <div class="pre-line"></div>
    <h1 class="titulo" data-editable="titulo" data-label="T\u00edtulo Principal" data-type="textarea">Presos no semiaberto podem cumprir pena fora do pres\u00eddio?</h1>
    <p class="subtitulo" data-editable="subtitulo" data-label="Subt\u00edtulo / Descri\u00e7\u00e3o" data-type="textarea">Entenda quando a Justi\u00e7a permite o chamado '\u2018semiaberto harmonizado\u2019 e quem pode ser beneficiado.</p>
  </div>

  <!-- Divider -->
  <div class="card-divider"></div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <span class="footer-cta" data-editable="cta" data-label="Texto do CTA" data-type="text">Veja a mat\u00e9ria completa no site</span>
      <span class="footer-sub" data-editable="site" data-label="Site / @" data-type="text">bmjuris.com.br</span>
    </div>
    <div class="footer-btn">\u2197</div>
  </div>
</div>
</body>
</html>`;
}

// ─── Helper: Read folder files ────────────────────────────────────────────────


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
    const placeholder = iframe.contentDocument.querySelector('.photo-frame-placeholder') as HTMLElement | null;
    if (placeholder) placeholder.style.display = 'none';
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

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (builtinKey === 'informativo') return buildInformativoTemplate(fmt);
    return buildBuiltinTemplate(fmt);
  }, []);

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
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(iframe.contentDocument.body, {
        width: selectedFormat.width,
        height: selectedFormat.height,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#08151b',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `bm-marketing-${selectedFormat.key}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Erro ao exportar:', err);
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
