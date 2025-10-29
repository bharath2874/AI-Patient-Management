import React, { useEffect, useState } from 'react';
import { supabase, Patient } from '../lib/supabase';
import { User, Calendar, Phone, Mail, Activity } from 'lucide-react';

type Props = {
  department: string;
  onSelectPatient: (patientId: string) => void;
};

export function PatientList({ department, onSelectPatient }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, [department]);

  async function loadPatients() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'admitted': return 'bg-blue-100 text-blue-800';
      case 'recovering': return 'bg-yellow-100 text-yellow-800';
      case 'discharged': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Patients Found</h3>
        <p className="text-gray-500">Add a new patient to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-700">
          Patients ({patients.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((patient) => (
          <button
            key={patient.id}
            onClick={() => onSelectPatient(patient.id)}
            className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all text-left hover:border-blue-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {patient.full_name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {new Date(patient.date_of_birth).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(patient.status)}`}>
                {patient.status}
              </span>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="capitalize">{patient.gender}</span>
                {patient.blood_type && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                    {patient.blood_type}
                  </span>
                )}
              </div>
              {patient.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-600 pt-2 border-t">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Admitted: {new Date(patient.admission_date).toLocaleDateString()}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
