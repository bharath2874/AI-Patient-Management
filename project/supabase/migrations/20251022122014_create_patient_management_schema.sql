/*
  # AI-Powered Secure Patient Management System Schema

  ## Overview
  This migration creates the complete database schema for a healthcare patient management system
  with AI chatbot capabilities, supporting multiple medical departments.

  ## New Tables
  
  ### 1. `profiles`
  User profiles for doctors and interns
  - `id` (uuid, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text) - 'doctor' or 'intern'
  - `department` (text) - 'cardiology', 'oncology', 'surgery'
  - `created_at` (timestamptz)
  
  ### 2. `patients`
  Core patient information
  - `id` (uuid, primary key)
  - `full_name` (text)
  - `date_of_birth` (date)
  - `gender` (text)
  - `blood_type` (text)
  - `phone` (text)
  - `email` (text)
  - `address` (text)
  - `emergency_contact_name` (text)
  - `emergency_contact_phone` (text)
  - `department` (text) - 'cardiology', 'oncology', 'surgery'
  - `admission_date` (timestamptz)
  - `status` (text) - 'admitted', 'recovering', 'discharged'
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `medical_records`
  Detailed medical history and diagnoses
  - `id` (uuid, primary key)
  - `patient_id` (uuid, references patients)
  - `diagnosis` (text)
  - `treatment_plan` (text)
  - `medications` (text)
  - `allergies` (text)
  - `medical_history` (text)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 4. `surgeries`
  Surgical procedures and treatments
  - `id` (uuid, primary key)
  - `patient_id` (uuid, references patients)
  - `surgery_type` (text)
  - `surgery_date` (timestamptz)
  - `surgeon_name` (text)
  - `duration_minutes` (integer)
  - `notes` (text)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 5. `post_operative_notes`
  Post-surgery observations and notes
  - `id` (uuid, primary key)
  - `patient_id` (uuid, references patients)
  - `surgery_id` (uuid, references surgeries)
  - `day_number` (integer) - Days post-operation
  - `vital_signs` (jsonb) - Blood pressure, heart rate, temperature, etc.
  - `pain_level` (integer) - 1-10 scale
  - `mobility_status` (text)
  - `wound_condition` (text)
  - `complications` (text)
  - `notes` (text)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 6. `recovery_milestones`
  Track recovery progress and milestones
  - `id` (uuid, primary key)
  - `patient_id` (uuid, references patients)
  - `milestone_type` (text) - 'mobility', 'pain_management', 'wound_healing', etc.
  - `milestone_description` (text)
  - `achieved` (boolean)
  - `achieved_date` (timestamptz)
  - `target_date` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 7. `chat_history`
  AI chatbot conversation history
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `patient_id` (uuid, references patients) - Optional, for patient-specific queries
  - `message` (text)
  - `response` (text)
  - `context_data` (jsonb) - Additional context used for the query
  - `created_at` (timestamptz)

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Profiles: Users can read all profiles, but only update their own
  - Patients: Authenticated medical staff can view all patients, create new patients
  - Medical Records: Only authenticated staff can view and create records
  - Surgeries: Only authenticated staff can view and create surgery records
  - Post-operative Notes: Only authenticated staff can view and create notes
  - Recovery Milestones: Only authenticated staff can view and manage milestones
  - Chat History: Users can only view and create their own chat history

  ## Important Notes
  1. All timestamps use timestamptz for timezone awareness
  2. JSONB used for flexible vital signs storage
  3. Foreign keys ensure referential integrity
  4. Indexes added for frequently queried columns
  5. RLS policies restrict access to authenticated medical staff only
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('doctor', 'intern')),
  department text CHECK (department IN ('cardiology', 'oncology', 'surgery')),
  created_at timestamptz DEFAULT now()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_type text,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  department text NOT NULL CHECK (department IN ('cardiology', 'oncology', 'surgery')),
  admission_date timestamptz DEFAULT now(),
  status text DEFAULT 'admitted' CHECK (status IN ('admitted', 'recovering', 'discharged')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  diagnosis text NOT NULL,
  treatment_plan text,
  medications text,
  allergies text,
  medical_history text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create surgeries table
CREATE TABLE IF NOT EXISTS surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  surgery_type text NOT NULL,
  surgery_date timestamptz NOT NULL,
  surgeon_name text NOT NULL,
  duration_minutes integer,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create post_operative_notes table
CREATE TABLE IF NOT EXISTS post_operative_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  surgery_id uuid REFERENCES surgeries(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  vital_signs jsonb DEFAULT '{}',
  pain_level integer CHECK (pain_level >= 0 AND pain_level <= 10),
  mobility_status text,
  wound_condition text,
  complications text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create recovery_milestones table
CREATE TABLE IF NOT EXISTS recovery_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  milestone_type text NOT NULL,
  milestone_description text NOT NULL,
  achieved boolean DEFAULT false,
  achieved_date timestamptz,
  target_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  message text NOT NULL,
  response text NOT NULL,
  context_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_department ON patients(department);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients(created_by);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_patient_id ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_post_operative_notes_patient_id ON post_operative_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_post_operative_notes_surgery_id ON post_operative_notes(surgery_id);
CREATE INDEX IF NOT EXISTS idx_recovery_milestones_patient_id ON recovery_milestones(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_patient_id ON chat_history(patient_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_operative_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for patients
CREATE POLICY "Authenticated staff can view all patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for medical_records
CREATE POLICY "Authenticated staff can view medical records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can create medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for surgeries
CREATE POLICY "Authenticated staff can view surgeries"
  ON surgeries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can create surgeries"
  ON surgeries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update surgeries"
  ON surgeries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for post_operative_notes
CREATE POLICY "Authenticated staff can view post-operative notes"
  ON post_operative_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can create post-operative notes"
  ON post_operative_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update post-operative notes"
  ON post_operative_notes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for recovery_milestones
CREATE POLICY "Authenticated staff can view recovery milestones"
  ON recovery_milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can create recovery milestones"
  ON recovery_milestones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update recovery milestones"
  ON recovery_milestones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for chat_history
CREATE POLICY "Users can view their own chat history"
  ON chat_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat history"
  ON chat_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for patients table
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();