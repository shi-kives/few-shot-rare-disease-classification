import { useState, useEffect, useCallback } from 'react';
import { getHealthApi } from '../api/health.js';

export const useHealth = () => {
  const [status, setStatus] = useState('loading'); // 'ok' | 'error' | 'loading'
  const [data, setData] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await getHealthApi();
      setStatus('ok');
      setData(result);
      setLastChecked(new Date());
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('Health check failed:', err.message);
      }
      setStatus('error');
      setData(null);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { status, data, lastChecked, refresh: checkHealth };
};

export default useHealth;
