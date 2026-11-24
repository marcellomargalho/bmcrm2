import React from 'react';

const loaders = {
  processDetails: () => import('@/pages/ProcessDetails').then(m => ({ default: m.ProcessDetails })),
  documentos: () => import('@/pages/DocumentManagement').then(m => ({ default: m.DocumentManagement })),
  financeiro: () => import('@/pages/Financeiro').then(m => ({ default: m.Financeiro })),
  intimacoes: () => import('@/pages/Intimacoes').then(m => ({ default: m.Intimacoes })),
  audiencias: () => import('@/pages/Audiencias').then(m => ({ default: m.Audiencias })),
  blog: () => import('@/pages/BlogManagement').then(m => ({ default: m.BlogManagement })),
  atendimento: () => import('@/pages/Atendimento').then(m => ({ default: m.Atendimento })),
  analytics: () => import('@/pages/Analytics').then(m => ({ default: m.Analytics })),
  configuracoes: () => import('@/pages/Settings').then(m => ({ default: m.Settings })),
};

export const LazyProcessDetails = React.lazy(loaders.processDetails);
export const LazyDocumentManagement = React.lazy(loaders.documentos);
export const LazyFinanceiro = React.lazy(loaders.financeiro);
export const LazyIntimacoes = React.lazy(loaders.intimacoes);
export const LazyAudiencias = React.lazy(loaders.audiencias);
export const LazyBlogManagement = React.lazy(loaders.blog);
export const LazyAtendimento = React.lazy(loaders.atendimento);
export const LazyAnalytics = React.lazy(loaders.analytics);
export const LazySettings = React.lazy(loaders.configuracoes);

const pathToLoader: Record<string, () => Promise<any>> = {
  '/documentos': loaders.documentos,
  '/financeiro': loaders.financeiro,
  '/intimacoes': loaders.intimacoes,
  '/audiencias': loaders.audiencias,
  '/blog': loaders.blog,
  '/atendimento': loaders.atendimento,
  '/analytics': loaders.analytics,
  '/configuracoes': loaders.configuracoes,
};

export function preloadRoute(path: string) {
  const loader = pathToLoader[path];
  if (loader) loader();
}
