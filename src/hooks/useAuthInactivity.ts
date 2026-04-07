import { useEffect, useRef } from 'react';

/**
 * Hook que monitora a inatividade do usuário e executa um callback (logout).
 * @param onTimeout Função de logout
 * @param timeoutMs Tempo limite em milissegundos (padrão 30 minutos)
 */
export function useAuthInactivity(onTimeout: () => void, timeoutMs: number = 30 * 60 * 1000) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      console.log('Sessão expirada por inatividade');
      onTimeout();
    }, timeoutMs);
  };

  useEffect(() => {
    // Eventos que consideram o usuário 'ativo'
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => resetTimer();

    // Inicia o timer
    resetTimer();

    // Adiciona os ouvintes de evento
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      // Limpeza ao desmontar
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [onTimeout, timeoutMs]);
}
