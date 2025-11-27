import { useState, useEffect, useCallback } from 'react';
import { authConfig } from '../config/authConfig';

const STORAGE_KEY = 'studia_login_attempts';
const STORAGE_TIMESTAMP_KEY = 'studia_login_timestamp';

/**
 * Hook para manejar rate limiting y protección contra fuerza bruta
 */
export function useRateLimit() {
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  useEffect(() => {
    // Cargar intentos guardados
    const savedAttempts = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    const savedTimestamp = parseInt(localStorage.getItem(STORAGE_TIMESTAMP_KEY) || '0');
    const now = Date.now();

    // Resetear si pasó el tiempo de reset
    if (savedTimestamp > 0 && now - savedTimestamp > authConfig.rateLimit.resetAfter) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      setAttempts(0);
      setIsLocked(false);
      setLockoutUntil(null);
      return;
    }

    setAttempts(savedAttempts);

    // Verificar si está bloqueado
    if (savedAttempts >= authConfig.rateLimit.maxAttempts) {
      const lockoutEnd = savedTimestamp + authConfig.rateLimit.lockoutDuration;
      if (now < lockoutEnd) {
        setIsLocked(true);
        setLockoutUntil(lockoutEnd);
      } else {
        // Desbloquear
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
        setAttempts(0);
        setIsLocked(false);
        setLockoutUntil(null);
      }
    }
  }, []);

  const recordFailedAttempt = useCallback(() => {
    const newAttempts = attempts + 1;
    const timestamp = Date.now();
    
    setAttempts(newAttempts);
    localStorage.setItem(STORAGE_KEY, newAttempts.toString());
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, timestamp.toString());

    if (newAttempts >= authConfig.rateLimit.maxAttempts) {
      setIsLocked(true);
      setLockoutUntil(timestamp + authConfig.rateLimit.lockoutDuration);
    }
  }, [attempts]);

  const resetAttempts = useCallback(() => {
    setAttempts(0);
    setIsLocked(false);
    setLockoutUntil(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
  }, []);

  const getRemainingTime = useCallback(() => {
    if (!lockoutUntil) return 0;
    const remaining = lockoutUntil - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000 / 60)); // minutos
  }, [lockoutUntil]);

  return {
    attempts,
    isLocked,
    remainingAttempts: Math.max(0, authConfig.rateLimit.maxAttempts - attempts),
    getRemainingTime,
    recordFailedAttempt,
    resetAttempts,
  };
}

