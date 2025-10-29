import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

type Props = {
  patientId: string;
  onClose: () => void;
};

export function AddSurgeryModal({ patientId, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    surgery_type: '',
    surgery_date: '',
    surgeon_name: '',
    duration_minutes: '',
    notes: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('surgeries').insert({
        patient_id: patientId,
        surgery_type: formData.surgery_type,
        surgery_date: formData.surgery_date,
        surgeon_name: formData.surgeon_name,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        notes: formData.notes,
        created_by: user?.id
      });

      if (error) throw error;
      onClose();
    } catch (error) {
      console.error('Error adding surgery:', error);
      alert('Failed to add surgery');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add Surgery</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Surgery Type *</label>
            <input
              type="text"
              required
              value={formData.surgery_type}
              onChange={(e) => setFormData({ ...formData, surgery_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Coronary Artery Bypass"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Surgery Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={formData.surgery_date}
              onChange={(e) => setFormData({ ...formData, surgery_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Surgeon Name *</label>
            <input
              type="text"
              required
              value={formData.surgeon_name}
              onChange={(e) => setFormData({ ...formData, surgeon_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Dr. John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="120"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Surgery notes and observations"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Surgery'}
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
