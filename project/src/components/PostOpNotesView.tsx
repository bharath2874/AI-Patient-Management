import React, { useEffect, useState } from 'react';
import { supabase, Surgery, PostOperativeNote } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Heart, Activity, Thermometer, Droplet, TrendingUp, X } from 'lucide-react';

type Props = {
  patientId: string;
  surgeries: Surgery[];
};

export function PostOpNotesView({ patientId, surgeries }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<PostOperativeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<string>('');
  const [formData, setFormData] = useState({
    day_number: '',
    blood_pressure: '',
    heart_rate: '',
    temperature: '',
    oxygen_saturation: '',
    pain_level: '',
    mobility_status: '',
    wound_condition: '',
    complications: '',
    notes: ''
  });

  useEffect(() => {
    loadNotes();
  }, [patientId]);

  async function loadNotes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_operative_notes')
        .select('*')
        .eq('patient_id', patientId)
        .order('day_number', { ascending: true });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading post-op notes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('post_operative_notes').insert({
        patient_id: patientId,
        surgery_id: selectedSurgeryId || null,
        day_number: parseInt(formData.day_number),
        vital_signs: {
          blood_pressure: formData.blood_pressure,
          heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
          temperature: formData.temperature ? parseFloat(formData.temperature) : null,
          oxygen_saturation: formData.oxygen_saturation ? parseInt(formData.oxygen_saturation) : null
        },
        pain_level: formData.pain_level ? parseInt(formData.pain_level) : null,
        mobility_status: formData.mobility_status,
        wound_condition: formData.wound_condition,
        complications: formData.complications,
        notes: formData.notes,
        created_by: user?.id
      });

      if (error) throw error;

      setShowAddNote(false);
      setFormData({
        day_number: '',
        blood_pressure: '',
        heart_rate: '',
        temperature: '',
        oxygen_saturation: '',
        pain_level: '',
        mobility_status: '',
        wound_condition: '',
        complications: '',
        notes: ''
      });
      loadNotes();
    } catch (error) {
      console.error('Error adding post-op note:', error);
      alert('Failed to add post-operative note');
    }
  }

  if (surgeries.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No surgeries recorded. Add a surgery first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800">Post-Operative Notes</h3>
        <button
          onClick={() => setShowAddNote(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>Add Note</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No post-operative notes yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                    Day {note.day_number}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                {note.pain_level !== null && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Pain Level:</span>
                    <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                      note.pain_level <= 3 ? 'bg-green-100 text-green-700' :
                      note.pain_level <= 6 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {note.pain_level}/10
                    </span>
                  </div>
                )}
              </div>

              {note.vital_signs && Object.keys(note.vital_signs).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b">
                  {note.vital_signs.blood_pressure && (
                    <div className="flex items-center space-x-2">
                      <Heart className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-xs text-gray-500">BP</p>
                        <p className="font-semibold">{note.vital_signs.blood_pressure}</p>
                      </div>
                    </div>
                  )}
                  {note.vital_signs.heart_rate && (
                    <div className="flex items-center space-x-2">
                      <Activity className="w-5 h-5 text-pink-500" />
                      <div>
                        <p className="text-xs text-gray-500">Heart Rate</p>
                        <p className="font-semibold">{note.vital_signs.heart_rate} bpm</p>
                      </div>
                    </div>
                  )}
                  {note.vital_signs.temperature && (
                    <div className="flex items-center space-x-2">
                      <Thermometer className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-xs text-gray-500">Temperature</p>
                        <p className="font-semibold">{note.vital_signs.temperature}°F</p>
                      </div>
                    </div>
                  )}
                  {note.vital_signs.oxygen_saturation && (
                    <div className="flex items-center space-x-2">
                      <Droplet className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">O2 Sat</p>
                        <p className="font-semibold">{note.vital_signs.oxygen_saturation}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {note.mobility_status && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Mobility Status</p>
                    <p className="text-gray-800">{note.mobility_status}</p>
                  </div>
                )}
                {note.wound_condition && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Wound Condition</p>
                    <p className="text-gray-800">{note.wound_condition}</p>
                  </div>
                )}
                {note.complications && (
                  <div>
                    <p className="text-sm font-semibold text-red-600">Complications</p>
                    <p className="text-red-700 font-semibold">{note.complications}</p>
                  </div>
                )}
                {note.notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Additional Notes</p>
                    <p className="text-gray-800">{note.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add Post-Operative Note</h2>
              <button
                onClick={() => setShowAddNote(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Related Surgery (Optional)
                  </label>
                  <select
                    value={selectedSurgeryId}
                    onChange={(e) => setSelectedSurgeryId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select surgery...</option>
                    {surgeries.map((surgery) => (
                      <option key={surgery.id} value={surgery.id}>
                        {surgery.surgery_type} - {new Date(surgery.surgery_date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Day Post-Operation *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.day_number}
                    onChange={(e) => setFormData({ ...formData, day_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="border rounded-xl p-4 bg-gray-50">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Vital Signs
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Pressure</label>
                    <input
                      type="text"
                      value={formData.blood_pressure}
                      onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="120/80"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={formData.heart_rate}
                      onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="72"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Temperature (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="98.6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Oxygen Saturation (%)</label>
                    <input
                      type="number"
                      value={formData.oxygen_saturation}
                      onChange={(e) => setFormData({ ...formData, oxygen_saturation: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="98"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pain Level (0-10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.pain_level}
                  onChange={(e) => setFormData({ ...formData, pain_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mobility Status</label>
                <input
                  type="text"
                  value={formData.mobility_status}
                  onChange={(e) => setFormData({ ...formData, mobility_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Able to walk with assistance"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Wound Condition</label>
                <input
                  type="text"
                  value={formData.wound_condition}
                  onChange={(e) => setFormData({ ...formData, wound_condition: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Healing well, no signs of infection"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Complications</label>
                <input
                  type="text"
                  value={formData.complications}
                  onChange={(e) => setFormData({ ...formData, complications: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="None or describe any complications"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional observations"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
                >
                  Add Note
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddNote(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
