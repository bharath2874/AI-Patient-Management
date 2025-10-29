import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

type Props = {
  patientId: string;
  onClose: () => void;
};

export function AddMedicalRecordModal({ patientId, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: '',
    treatment_plan: '',
    medications: '',
    allergies: '',
    medical_history: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('medical_records').insert({
        patient_id: patientId,
        ...formData,
        created_by: user?.id
      });

      if (error) throw error;
      onClose();
    } catch (error) {
      console.error('Error adding medical record:', error);
      alert('Failed to add medical record');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add Medical Record</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis *</label>
            <input
              type="text"
              required
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter diagnosis"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Treatment Plan</label>
            <textarea
              value={formData.treatment_plan}
              onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Describe the treatment plan"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Medications</label>
            <textarea
              value={formData.medications}
              onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="List medications"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Allergies</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="List any allergies"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Medical History</label>
            <textarea
              value={formData.medical_history}
              onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Previous medical history"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Record'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
