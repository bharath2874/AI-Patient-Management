import React, { useEffect, useState } from 'react';
import { supabase, RecoveryMilestone } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, CheckCircle, Circle, Target, TrendingUp, X } from 'lucide-react';

type Props = {
  patientId: string;
};

export function RecoveryProgress({ patientId }: Props) {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<RecoveryMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [formData, setFormData] = useState({
    milestone_type: '',
    milestone_description: '',
    target_date: '',
    notes: ''
  });

  useEffect(() => {
    loadMilestones();
  }, [patientId]);

  async function loadMilestones() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recovery_milestones')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('recovery_milestones').insert({
        patient_id: patientId,
        ...formData
      });

      if (error) throw error;

      setShowAddMilestone(false);
      setFormData({
        milestone_type: '',
        milestone_description: '',
        target_date: '',
        notes: ''
      });
      loadMilestones();
    } catch (error) {
      console.error('Error adding milestone:', error);
      alert('Failed to add milestone');
    }
  }

  async function toggleMilestone(milestone: RecoveryMilestone) {
    try {
      const { error } = await supabase
        .from('recovery_milestones')
        .update({
          achieved: !milestone.achieved,
          achieved_date: !milestone.achieved ? new Date().toISOString() : null
        })
        .eq('id', milestone.id);

      if (error) throw error;
      loadMilestones();
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  }

  const achievedCount = milestones.filter(m => m.achieved).length;
  const totalCount = milestones.length;
  const progressPercentage = totalCount > 0 ? (achievedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800">Recovery Milestones</h3>
        <button
          onClick={() => setShowAddMilestone(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>Add Milestone</span>
        </button>
      </div>

      {totalCount > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 mb-6 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h4 className="font-bold text-gray-800">Overall Progress</h4>
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {achievedCount}/{totalCount}
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${progressPercentage}%` }}
            >
              {progressPercentage > 20 && (
                <span className="text-xs font-bold text-white">
                  {Math.round(progressPercentage)}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {milestones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No recovery milestones yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`rounded-xl border-2 p-5 transition-all ${
                milestone.achieved
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                <button
                  onClick={() => toggleMilestone(milestone)}
                  className="flex-shrink-0 mt-1 transition-transform hover:scale-110"
                >
                  {milestone.achieved ? (
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  ) : (
                    <Circle className="w-7 h-7 text-gray-400" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mb-2">
                        {milestone.milestone_type}
                      </span>
                      <h4 className={`text-lg font-bold ${
                        milestone.achieved ? 'text-green-800 line-through' : 'text-gray-800'
                      }`}>
                        {milestone.milestone_description}
                      </h4>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-3">
                    {milestone.target_date && (
                      <div>
                        <span className="font-semibold">Target:</span>{' '}
                        {new Date(milestone.target_date).toLocaleDateString()}
                      </div>
                    )}
                    {milestone.achieved && milestone.achieved_date && (
                      <div className="text-green-700 font-semibold">
                        <span>Achieved:</span>{' '}
                        {new Date(milestone.achieved_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {milestone.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-700">{milestone.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddMilestone && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add Recovery Milestone</h2>
              <button
                onClick={() => setShowAddMilestone(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Milestone Type *
                </label>
                <select
                  required
                  value={formData.milestone_type}
                  onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  <option value="mobility">Mobility</option>
                  <option value="pain_management">Pain Management</option>
                  <option value="wound_healing">Wound Healing</option>
                  <option value="medication">Medication</option>
                  <option value="physical_therapy">Physical Therapy</option>
                  <option value="diet">Diet & Nutrition</option>
                  <option value="vital_signs">Vital Signs</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Milestone Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.milestone_description}
                  onChange={(e) => setFormData({ ...formData, milestone_description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Walk 100 meters unassisted"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional details or instructions"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
                >
                  Add Milestone
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
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
