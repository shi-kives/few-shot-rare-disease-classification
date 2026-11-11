import { useEffect } from 'react';

export const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [ref, callback]);
};

export default useOutsideClick;
