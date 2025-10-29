import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Activity, Stethoscope, LogOut, Users, MessageSquare, PlusCircle } from 'lucide-react';
import { PatientList } from './PatientList';
import { PatientDetail } from './PatientDetail';
import { AddPatientModal } from './AddPatientModal';
import { AIChat } from './AIChat';

type Department = 'cardiology' | 'oncology' | 'surgery';

export function Dashboard() {
  const { profile, signOut } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<Department>('cardiology');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const departments = [
    { id: 'cardiology', name: 'Cardiology', icon: Heart, color: 'red', gradient: 'from-red-500 to-pink-500' },
    { id: 'oncology', name: 'Oncology', icon: Activity, color: 'green', gradient: 'from-green-500 to-emerald-500' },
    { id: 'surgery', name: 'Surgery', icon: Stethoscope, color: 'blue', gradient: 'from-blue-500 to-cyan-500' },
  ];

  const currentDept = departments.find(d => d.id === selectedDepartment)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-2 rounded-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  AI Patient Management
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome, {profile?.full_name} ({profile?.role})
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowChat(!showChat)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-semibold">AI Assistant</span>
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Department</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => {
                  setSelectedDepartment(dept.id as Department);
                  setSelectedPatientId(null);
                }}
                className={`p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                  selectedDepartment === dept.id
                    ? `border-${dept.color}-500 bg-gradient-to-br ${dept.gradient} text-white shadow-xl`
                    : 'border-gray-200 bg-white hover:border-gray-300 shadow-md'
                }`}
              >
                <dept.icon className={`w-12 h-12 mb-3 ${selectedDepartment === dept.id ? 'text-white' : `text-${dept.color}-500`}`} />
                <h3 className={`text-xl font-bold ${selectedDepartment === dept.id ? 'text-white' : 'text-gray-800'}`}>
                  {dept.name}
                </h3>
                <p className={`text-sm mt-1 ${selectedDepartment === dept.id ? 'text-white/90' : 'text-gray-500'}`}>
                  View and manage patients
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className={`bg-gradient-to-r ${currentDept.gradient} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <currentDept.icon className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">{currentDept.name} Department</h2>
                  <p className="text-white/90">Patient Management</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddPatient(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-all shadow-lg font-semibold"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Add Patient</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {selectedPatientId ? (
              <PatientDetail
                patientId={selectedPatientId}
                onBack={() => setSelectedPatientId(null)}
              />
            ) : (
              <PatientList
                department={selectedDepartment}
                onSelectPatient={setSelectedPatientId}
              />
            )}
          </div>
        </div>
      </main>

      {showAddPatient && (
        <AddPatientModal
          department={selectedDepartment}
          onClose={() => setShowAddPatient(false)}
        />
      )}

      {showChat && (
        <AIChat
          onClose={() => setShowChat(false)}
          selectedPatientId={selectedPatientId}
        />
      )}
    </div>
  );
}
