import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'doctor' | 'intern';
  department: 'cardiology' | 'oncology' | 'surgery';
  created_at: string;
};

export type Patient = {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  department: 'cardiology' | 'oncology' | 'surgery';
  admission_date: string;
  status: 'admitted' | 'recovering' | 'discharged';
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type MedicalRecord = {
  id: string;
  patient_id: string;
  diagnosis: string;
  treatment_plan?: string;
  medications?: string;
  allergies?: string;
  medical_history?: string;
  created_by?: string;
  created_at: string;
};

export type Surgery = {
  id: string;
  patient_id: string;
  surgery_type: string;
  surgery_date: string;
  surgeon_name: string;
  duration_minutes?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
};

export type PostOperativeNote = {
  id: string;
  patient_id: string;
  surgery_id?: string;
  day_number: number;
  vital_signs?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    oxygen_saturation?: number;
  };
  pain_level?: number;
  mobility_status?: string;
  wound_condition?: string;
  complications?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
};

export type RecoveryMilestone = {
  id: string;
  patient_id: string;
  milestone_type: string;
  milestone_description: string;
  achieved: boolean;
  achieved_date?: string;
  target_date?: string;
  notes?: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  patient_id?: string;
  message: string;
  response: string;
  context_data?: any;
  created_at: string;
};
