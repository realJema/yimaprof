import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useExamFormData = () => {
  // Fetch subjects
  const { data: subjects, refetch: refetchSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch establishments
  const { data: establishments, refetch: refetchEstablishments } = useQuery({
    queryKey: ['establishments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch exam types
  const { data: examTypes } = useQuery({
    queryKey: ['exam_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch periods
  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('is_active', true)
        .order('order_number');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch academic years
  const { data: academicYears, refetch: refetchAcademicYears } = useQuery({
    queryKey: ['academic_years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('is_active', true)
        .order('start_year', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch durations
  const { data: durations, refetch: refetchDurations } = useQuery({
    queryKey: ['durations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('durations')
        .select('*')
        .eq('is_active', true)
        .order('minutes');
      
      if (error) throw error;
      return data;
    }
  });

  return {
    subjects,
    establishments,
    examTypes,
    periods,
    academicYears,
    durations,
    refetchSubjects,
    refetchEstablishments,
    refetchAcademicYears,
    refetchDurations,
  };
};
