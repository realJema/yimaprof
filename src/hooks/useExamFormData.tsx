import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Subject {
  id: string;
  name: string;
  name_en: string;
  name_fr: string;
  is_active: boolean;
  system: 'francophone' | 'anglophone' | 'shared';
}

interface Establishment {
  id: string;
  name: string;
  type?: string;
  country?: string;
}

interface ExamType {
  id: string;
  name: string;
  name_en: string;
  name_fr: string;
  is_active: boolean;
}

interface Period {
  id: string;
  name: string;
  name_en: string;
  name_fr: string;
  order_number: number;
  is_active: boolean;
}

interface AcademicYear {
  id: string;
  year_label: string;
  start_year: number;
  end_year: number;
  is_active: boolean;
}

interface Duration {
  id: string;
  minutes: number;
  display_label: string;
  is_active: boolean;
}

interface Series {
  id: string;
  code: string;
  name: string;
  name_en: string;
  name_fr: string;
  system: 'francophone' | 'anglophone' | 'general';
  description: string | null;
  order_number: number;
  is_active: boolean;
}

export const useExamFormData = () => {
  // Fetch subjects
  const { data: subjects, refetch: refetchSubjects} = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects' as any)
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as unknown as Subject[];
    }
  });

  // Fetch establishments
  const { data: establishments, refetch: refetchEstablishments } = useQuery<Establishment[]>({
    queryKey: ['establishments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as unknown as Establishment[];
    }
  });

  // Fetch exam types
  const { data: examTypes } = useQuery<ExamType[]>({
    queryKey: ['exam_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_types' as any)
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as unknown as ExamType[];
    }
  });

  // Fetch periods
  const { data: periods } = useQuery<Period[]>({
    queryKey: ['periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periods' as any)
        .select('*')
        .eq('is_active', true)
        .order('order_number');
      
      if (error) throw error;
      return data as unknown as Period[];
    }
  });

  // Fetch academic years
  const { data: academicYears, refetch: refetchAcademicYears } = useQuery<AcademicYear[]>({
    queryKey: ['academic_years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years' as any)
        .select('*')
        .eq('is_active', true)
        .order('start_year', { ascending: false });
      
      if (error) throw error;
      return data as unknown as AcademicYear[];
    }
  });

  // Fetch durations
  const { data: durations, refetch: refetchDurations } = useQuery<Duration[]>({
    queryKey: ['durations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('durations' as any)
        .select('*')
        .eq('is_active', true)
        .order('minutes');
      
      if (error) throw error;
      return data as unknown as Duration[];
    }
  });

  // Fetch series
  const { data: series, refetch: refetchSeries } = useQuery<Series[]>({
    queryKey: ['series'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('series' as any)
        .select('*')
        .eq('is_active', true)
        .order('order_number');
      
      if (error) throw error;
      return data as unknown as Series[];
    }
  });

  return {
    subjects,
    establishments,
    examTypes,
    periods,
    academicYears,
    durations,
    series,
    refetchSubjects,
    refetchEstablishments,
    refetchAcademicYears,
    refetchDurations,
    refetchSeries,
  };
};
