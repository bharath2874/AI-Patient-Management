import React, { useEffect, useState } from 'react';
import { supabase, Patient, MedicalRecord, Surgery, PostOperativeNote, RecoveryMilestone } from '../lib/supabase';
import { ArrowLeft, User, Calendar, Heart, Activity, FileText, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { AddMedicalRecordModal } from './AddMedicalRecordModal';
import { AddSurgeryModal } from './AddSurgeryModal';
import { PostOpNotesView } from './PostOpNotesView';
import { RecoveryProgress } from './RecoveryProgress';

type Props = {
  patientId: string;
  onBack: () => void;
};

export function PatientDetail({ patientId, onBack }: Props) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddSurgery, setShowAddSurgery] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  async function loadPatientData() {
    setLoading(true);
    try {
      const [patientRes, recordsRes, surgeriesRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', patientId).single(),
        supabase.from('medical_records').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('surgeries').select('*').eq('patient_id', patientId).order('surgery_date', { ascending: false })
      ]);

      if (patientRes.error) throw patientRes.error;
      setPatient(patientRes.data);
      setMedicalRecords(recordsRes.data || []);
      setSurgeries(surgeriesRes.data || []);
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return <div className="text-center py-12 text-gray-500">Patient not found</div>;
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: User },
    { id: 'medical', name: 'Medical Records', icon: FileText },
    { id: 'surgery', name: 'Surgeries', icon: Activity },
    { id: 'postop', name: 'Post-Op Notes', icon: Heart },
    { id: 'recovery', name: 'Recovery Progress', icon: TrendingUp },
  ];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-semibold">Back to Patients</span>
      </button>

      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 mb-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-xl">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{patient.full_name}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span className="capitalize">{patient.gender}</span>
                </div>
                {patient.blood_type && (
                  <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                    {patient.blood_type}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-block px-4 py-2 rounded-full font-semibold ${
              patient.status === 'admitted' ? 'bg-blue-100 text-blue-800' :
              patient.status === 'recovering' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {patient.status}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Admitted: {new Date(patient.admission_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {(patient.phone || patient.email || patient.address) && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            {patient.phone && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <p className="font-semibold text-gray-800">{patient.phone}</p>
              </div>
            )}
            {patient.email && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-semibold text-gray-800">{patient.email}</p>
              </div>
            )}
            {patient.address && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <p className="font-semibold text-gray-800">{patient.address}</p>
              </div>
            )}
          </div>
        )}

        {patient.emergency_contact_name && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2 text-orange-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Emergency Contact</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Name</p>
                <p className="font-semibold text-gray-800">{patient.emergency_contact_name}</p>
              </div>
              {patient.emergency_contact_phone && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="font-semibold text-gray-800">{patient.emergency_contact_phone}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-semibold mb-1">Medical Records</p>
                    <p className="text-3xl font-bold text-blue-700">{medicalRecords.length}</p>
                  </div>
                  <FileText className="w-10 h-10 text-blue-400" />
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-semibold mb-1">Surgeries</p>
                    <p className="text-3xl font-bold text-green-700">{surgeries.length}</p>
                  </div>
                  <Activity className="w-10 h-10 text-green-400" />
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-semibold mb-1">Department</p>
                    <p className="text-xl font-bold text-purple-700 capitalize">{patient.department}</p>
                  </div>
                  <Heart className="w-10 h-10 text-purple-400" />
                </div>
              </div>
            </div>

            {medicalRecords.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Latest Medical Record</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Diagnosis</p>
                    <p className="text-gray-800">{medicalRecords[0].diagnosis}</p>
                  </div>
                  {medicalRecords[0].treatment_plan && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Treatment Plan</p>
                      <p className="text-gray-800">{medicalRecords[0].treatment_plan}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'medical' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Medical Records</h3>
              <button
                onClick={() => setShowAddRecord(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Add Record</span>
              </button>
            </div>

            {medicalRecords.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No medical records yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {medicalRecords.map((record) => (
                  <div key={record.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-800">{record.diagnosis}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {record.treatment_plan && (
                        <div>
                          <p className="text-sm font-semibold text-gray-600">Treatment Plan</p>
                          <p className="text-gray-800">{record.treatment_plan}</p>
                        </div>
                      )}
                      {record.medications && (
                        <div>
                          <p className="text-sm font-semibold text-gray-600">Medications</p>
                          <p className="text-gray-800">{record.medications}</p>
                        </div>
                      )}
                      {record.allergies && (
                        <div>
                          <p className="text-sm font-semibold text-gray-600">Allergies</p>
                          <p className="text-red-600 font-semibold">{record.allergies}</p>
                        </div>
                      )}
                      {record.medical_history && (
                        <div>
                          <p className="text-sm font-semibold text-gray-600">Medical History</p>
                          <p className="text-gray-800">{record.medical_history}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'surgery' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Surgeries & Treatments</h3>
              <button
                onClick={() => setShowAddSurgery(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Add Surgery</span>
              </button>
            </div>

            {surgeries.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No surgeries recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {surgeries.map((surgery) => (
                  <div key={surgery.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{surgery.surgery_type}</h4>
                        <p className="text-sm text-gray-500">
                          Surgeon: {surgery.surgeon_name}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(surgery.surgery_date).toLocaleString()}
                      </span>
                    </div>
                    {surgery.duration_minutes && (
                      <p className="text-sm text-gray-600 mb-2">
                        Duration: {surgery.duration_minutes} minutes
                      </p>
                    )}
                    {surgery.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-semibold text-gray-600 mb-1">Notes</p>
                        <p className="text-gray-800">{surgery.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'postop' && (
          <PostOpNotesView patientId={patientId} surgeries={surgeries} />
        )}

        {activeTab === 'recovery' && (
          <RecoveryProgress patientId={patientId} />
        )}
      </div>

      {showAddRecord && (
        <AddMedicalRecordModal
          patientId={patientId}
          onClose={() => {
            setShowAddRecord(false);
            loadPatientData();
          }}
        />
      )}

      {showAddSurgery && (
        <AddSurgeryModal
          patientId={patientId}
          onClose={() => {
            setShowAddSurgery(false);
            loadPatientData();
          }}
        />
      )}
    </div>
  );
}
