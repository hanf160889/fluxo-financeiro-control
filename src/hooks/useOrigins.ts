import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Origin {
  id: string;
  name: string;
}

export const useOrigins = () => {
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrigins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('origins')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setOrigins(data || []);
    } catch (error) {
      console.error('Error fetching origins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrigins();
  }, []);

  return { origins, loading, fetchOrigins };
};
