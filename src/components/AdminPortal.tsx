import React, { useState, useEffect } from 'react';
import { 
  Building, User, Calendar, CheckSquare, Stethoscope, Award, 
  DollarSign, Activity, Settings, Plus, Edit2, Trash2, 
  ToggleLeft, ToggleRight, X, AlertCircle, RefreshCw, Upload, Image,
  Paperclip, CheckCircle
} from 'lucide-react';
import { Doctor, Appointment, DashboardStats, AuthResponse } from '../types';
import AppointmentCalendar from './AppointmentCalendar';

interface AdminPortalProps {
  auth: AuthResponse;
}

// Preset specialization catalogs
const SPECIALTIES = ['Cardiology', 'Pediatrics', 'Dermatology', 'General Physician', 'Orthopedics'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Preset time ranges
const PRESET_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM'
];

export default function AdminPortal({ auth }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'doctors' | 'appointments'>('stats');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  // Data lists
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Doctor Form Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  
  // Fields for doctor profile
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState(SPECIALTIES[0]);
  const [docExperience, setDocExperience] = useState<number>(5);
  const [docQualification, setDocQualification] = useState('');
  const [docFee, setDocFee] = useState<number>(100);
  const [docDays, setDocDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  const [docSlots, setDocSlots] = useState<string[]>(['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']);
  const [docImage, setDocImage] = useState<string>('');
  const [docIsActive, setDocIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Load stats and doctor listings
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch ALL Doctors (including inactive)
      const docsRes = await fetch('/api/doctors?includeInactive=true');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDoctors(docsData);
      }

      // 3. Fetch ALL Appointments
      const aptsRes = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (aptsRes.ok) {
        const aptsData = await aptsRes.json();
        // Sort: newest first
        aptsData.sort((a: Appointment, b: Appointment) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setAppointments(aptsData);
      }
    } catch (err) {
      console.error('Error loading dashboard properties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  // Handle Photo upload (Convert file directly to base64 string)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject files larger than 4MB
    if (file.size > 4 * 1024 * 1024) {
      alert('Photo exceeds 4MB. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Create or Update Doctor
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!docName || !docQualification || docFee <= 0) {
      setFormError('Please enter invalid fields (Consult fee must be positive).');
      return;
    }

    if (docDays.length === 0) {
      setFormError('Please select at least one working day.');
      return;
    }

    if (docSlots.length === 0) {
      setFormError('Please choose at least one active clinic slot.');
      return;
    }

    const payload = {
      name: docName,
      specialization: docSpecialty,
      experience: Number(docExperience),
      qualification: docQualification,
      consultationFee: Number(docFee),
      availableDays: docDays,
      availableTimeSlots: docSlots,
      imageUrl: docImage || undefined,
      isActive: docIsActive
    };

    try {
      const url = modalMode === 'create' ? '/api/doctors' : `/api/doctors/${editingDoctorId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed saving doctor.');
      }

      // Refresh page list
      setIsModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
      resetDoctorForm();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Open Edit Modals
  const handleOpenEdit = (doctor: Doctor) => {
    setModalMode('edit');
    setEditingDoctorId(doctor.id);
    setDocName(doctor.name);
    setDocSpecialty(doctor.specialization);
    setDocExperience(doctor.experience);
    setDocQualification(doctor.qualification);
    setDocFee(doctor.consultationFee);
    setDocDays(doctor.availableDays);
    setDocSlots(doctor.availableTimeSlots);
    setDocImage(doctor.imageUrl || '');
    setDocIsActive(doctor.isActive);
    setIsModalOpen(true);
  };

  // Delete doctor
  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete Dr. ${doctorName} from the database?`)) return;

    try {
      const res = await fetch(`/api/doctors/${doctorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed deletion.');
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle Doctor Active State (Quick trigger)
  const toggleDoctorActiveState = async (doctor: Doctor) => {
    try {
      const res = await fetch(`/api/doctors/${doctor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ isActive: !doctor.isActive })
      });

      if (!res.ok) throw new Error('Could not toggle status.');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Update Appointment queue status (Approve, Complete, Cancel)
  const handleUpdateStatus = async (apptId: string, targetStatus: 'Confirmed' | 'Cancelled' | 'Completed') => {
    try {
      const res = await fetch(`/api/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed status patch.');
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Form Reset Helper
  const resetDoctorForm = () => {
    setDocName('');
    setDocSpecialty(SPECIALTIES[0]);
    setDocExperience(5);
    setDocQualification('');
    setDocFee(100);
    setDocDays(['Monday', 'Wednesday', 'Friday']);
    setDocSlots(['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM']);
    setDocImage('');
    setDocIsActive(true);
    setFormError(null);
  };

  // Helper selectors checkbox arrays
  const handleToggleDay = (day: string) => {
    if (docDays.includes(day)) {
      setDocDays(docDays.filter(d => d !== day));
    } else {
      setDocDays([...docDays, day]);
    }
  };

  const handleToggleSlot = (slot: string) => {
    if (docSlots.includes(slot)) {
      setDocSlots(docSlots.filter(s => s !== slot));
    } else {
      setDocSlots([...docSlots, slot]);
    }
  };

  const renderStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Pending':
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-805 border border-amber-200">Pending</span>;
      case 'Confirmed':
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-805 border border-emerald-200">Confirmed</span>;
      case 'Completed':
        return <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-805 border border-sky-100">Completed</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-500 border border-rose-100">Cancelled</span>;
    }
  };

  return (
    <div className="space-y-8 py-8 animate-fade-in text-slate-800">
      
      {/* 1. Header segment */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">Clinic Administrator Console</h1>
          <p className="text-xs font-medium text-slate-500">Monitor scheduler performance, edit medical records, and resolve patient queues.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-semibold hover:bg-slate-50 active:scale-97"
            title="Refresh database logs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
          
          <button
            onClick={() => {
              setModalMode('create');
              resetDoctorForm();
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1 border border-indigo-200 rounded-lg bg-indigo-600 hover:bg-indigo-700 py-2 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/10 active:scale-97"
            id="btn-trigger-create-doctor"
          >
            <Plus className="h-4 w-4" />
            <span>Create Doctor Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Tabs bar */}
      <div className="flex space-x-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'stats'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-stats"
        >
          Clinic Dashboard
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'doctors'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-doctors"
        >
          Doctors Directory ({doctors.length})
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'appointments'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-appointments"
        >
          Appointments Queue ({appointments.length})
        </button>
      </div>

      {/* 3. Panel Sections routing */}
      {activeTab === 'stats' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* stats bento row */}
          {stats ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              
              {/* Card 1 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Doctors</p>
                  <p className="text-2xl font-black font-mono mt-0.5 tracking-tight text-slate-900" id="stat-total-doctors">{stats.totalDoctors}</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Patients</p>
                  <p className="text-2xl font-black font-mono mt-0.5 tracking-tight text-slate-900" id="stat-total-patients">{stats.totalPatients}</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Visits</p>
                  <p className="text-2xl font-black font-mono mt-0.5 tracking-tight text-slate-900" id="stat-today-visits">{stats.todayAppointmentsCount}</p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming Active</p>
                  <p className="text-2xl font-black font-mono mt-0.5 tracking-tight text-slate-900" id="stat-upcoming-appointments">{stats.upcomingAppointmentsCount}</p>
                </div>
              </div>

              {/* Card 5 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed Outpatients</p>
                  <p className="text-2xl font-black font-mono mt-0.5 tracking-tight text-slate-900" id="stat-completed-appointments">{stats.completedAppointmentsCount}</p>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}

          {/* Quick Stats overview panel */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* Live activity feed */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Active Scheduling Operations Tracker</span>
              </h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {appointments.slice(0, 6).map(apt => (
                  <div key={apt.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-bold text-slate-950">{apt.patientName}</p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        Booked with <strong className="text-slate-700">{apt.doctorName}</strong> on {apt.date} at {apt.timeSlot}
                      </p>
                    </div>
                    {renderStatusBadge(apt.status)}
                  </div>
                ))}
                {appointments.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">No booking logs present in system history.</p>
                )}
              </div>
            </div>

            {/* Quick action guidelines */}
            <div className="rounded-xl border border-indigo-150 bg-indigo-50/20 p-6 space-y-4">
              <h3 className="text-sm font-bold text-indigo-950">Diagnostic Center Protocols</h3>
              <ul className="text-xs text-indigo-900 space-y-3 leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="font-bold text-indigo-600 mt-px">✔</span>
                  <span><strong>Doctor Status Lock</strong>: Turning off/Deactivating a doctor profile hides the doctor from new patient searches but leaves existing patient reservation dates untouched.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-bold text-indigo-600 mt-px">✔</span>
                  <span><strong>Double Booking Filter</strong>: System automatically blocks registration of duplicate doctor, date, and hour slot tuples.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-bold text-indigo-600 mt-px">✔</span>
                  <span><strong>Cancellation Safeguard</strong>: Appointment sessions flagged as <strong>Completed</strong> represent completed treatments and cannot be cancelled under hospital policy.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* Tab: Doctors List */}
      {activeTab === 'doctors' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map(doc => (
              <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm" id={`admin-doc-${doc.id}`}>
                
                {/* Info block */}
                <div className="flex items-start space-x-4">
                  <img 
                    src={doc.imageUrl} 
                    alt={doc.name} 
                    className="h-14 w-14 rounded-lg object-cover border border-slate-100" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">{doc.name}</h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{doc.specialization}</p>
                    <p className="text-xs text-slate-400 font-medium">{doc.qualification}</p>
                  </div>
                </div>

                {/* Badges block */}
                <div className="grid grid-cols-2 gap-2 border-t border-b border-slate-100 py-3 text-[11px] font-medium text-slate-500">
                  <div>Exp: <strong className="text-slate-800">{doc.experience} Years</strong></div>
                  <div className="text-right">Fee: <strong className="text-indigo-600 font-mono">${doc.consultationFee}</strong></div>
                  
                  <div className="col-span-2 mt-1">
                    <span className="text-slate-400 block font-semibold text-[10px]">Active Schedule Days:</span>
                    <span className="text-slate-700 line-clamp-1 text-[10px] font-normal">{doc.availableDays.join(', ')}</span>
                  </div>
                </div>

                {/* Active Controls Row */}
                <div className="flex items-center justify-between pt-1">
                  
                  {/* Activate / Deactivate control */}
                  <button
                    onClick={() => toggleDoctorActiveState(doc)}
                    className={`flex items-center space-x-1.5 rounded-lg py-1.5 px-3 text-xs font-bold transition-all ${
                      doc.isActive 
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    title={doc.isActive ? 'Deactivate Doctor Profile' : 'Activate Doctor Profile'}
                    id={`toggle-active-${doc.id}`}
                  >
                    {doc.isActive ? <ToggleRight className="h-4.5 w-4.5 text-emerald-600" /> : <ToggleLeft className="h-4.5 w-4.5 text-slate-400" />}
                    <span>{doc.isActive ? 'Active' : 'Inactive'}</span>
                  </button>

                  {/* Actions cabinet */}
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition"
                      title="Edit Doctor Credentials"
                      id={`edit-doc-${doc.id}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition"
                      title="Permanently Delete Doctor"
                      id={`delete-doc-${doc.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Appointments Queue */}
      {activeTab === 'appointments' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Calendar vs List view selections */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-805">Queue Layout Selector</h3>
              <p className="text-[11px] text-slate-500 font-medium">Switch views to track clinic doctor performance on individual dates or overall logs.</p>
            </div>
            
            <div className="flex items-center bg-slate-150 p-1 rounded-lg border border-slate-200 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-850 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="btn-admin-view-list"
              >
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-indigo-850 shadow-xs'
                    : 'text-slate-450 hover:text-slate-700'
                }`}
                id="btn-admin-view-calendar"
              >
                Calendar View
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Session ID</th>
                      <th className="py-3 px-5">Patient Name</th>
                      <th className="py-3 px-5">Specialist / Field</th>
                      <th className="py-3 px-5">Schedule Slot</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 p-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {appointments.map(apt => (
                      <tr key={apt.id} className="hover:bg-slate-50/50" id={`row-apt-${apt.id}`}>
                        
                        {/* id key */}
                        <td className="py-4 px-5 font-mono text-[10px] text-slate-400">
                          {apt.id}
                        </td>

                        {/* Patient info */}
                        <td className="py-4 px-5">
                          <p className="font-bold text-slate-950">{apt.patientName}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{apt.patientEmail}</p>
                        </td>

                        {/* Doctor Info */}
                        <td className="py-4 px-5">
                          <p className="font-semibold text-slate-800">{apt.doctorName}</p>
                          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wide">{apt.doctorSpecialization}</p>
                        </td>

                        {/* Booking Date and hour */}
                        <td className="py-4 px-5 font-medium">
                          <div className="font-mono text-[11px] text-slate-700">
                            {apt.date}
                          </div>
                          <div className="text-[10px] font-normal text-slate-450 mt-0.5">
                            {apt.timeSlot}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-5">
                          {renderStatusBadge(apt.status)}
                        </td>

                        {/* Action Cabinet controllers */}
                        <td className="py-4 p-5 text-right space-x-1.5">
                          {apt.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'Confirmed')}
                                className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 transition active:scale-97"
                                title="Confirm Booking"
                                id={`approve-apt-${apt.id}`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'Cancelled')}
                                className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-100 transition active:scale-97"
                                title="Cancel Booking"
                                id={`cancel-apt-${apt.id}`}
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {apt.status === 'Confirmed' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'Completed')}
                                className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition active:scale-97"
                                title="Mark Session Completed"
                                id={`complete-apt-${apt.id}`}
                              >
                                Complete Visit
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(apt.id, 'Cancelled')}
                                className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-100 transition active:scale-97"
                                title="Cancel Booking"
                                id={`cancel-active-apt-${apt.id}`}
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {['Completed', 'Cancelled'].includes(apt.status) && (
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">Record Locked</span>
                          )}
                        </td>

                      </tr>
                    ))}
                    
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                          No customer appointments are registered on file yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Informative alert badge */}
              <div className="rounded-xl bg-indigo-50/40 border border-indigo-100 p-4 flex items-start space-x-3 text-xs text-slate-700 shadow-xs">
                <AlertCircle className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">Admin Live Roster</p>
                  <p className="leading-relaxed">
                    Select any day in the month grid below to audit full reservations on that day. You can approve pending requests, flag consultations as completed, or cancel slots with live database tracking.
                  </p>
                </div>
              </div>

              <AppointmentCalendar
                appointments={appointments}
                role="admin"
                onUpdateStatus={handleUpdateStatus}
              />
            </div>
          )}

        </div>
      )}

      {/* 4. DOCTOR MUTATIVE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-fade-in h-[90vh] flex flex-col justify-between">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5" id="modal-heading">
                <Settings className="h-4.5 w-4.5 text-indigo-600" />
                <span>{modalMode === 'create' ? 'Register Doctor Profile' : 'Update Doctor Registry'}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-450 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Scroll body */}
            <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-4">
              
              {formError && (
                <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid 2-cols */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Practitioner Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jane Doe"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    id="input-doc-name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Primary Specialization</label>
                  <select
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    id="input-doc-specialty"
                  >
                    {SPECIALTIES.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600">Qualifications</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MBBS, MD (Cardiology)"
                    value={docQualification}
                    onChange={(e) => setDocQualification(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                    id="input-doc-qualification"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Experience (Years)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={docExperience}
                      onChange={(e) => setDocExperience(Number(e.target.value))}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                      id="input-doc-experience"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Fee ($)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={docFee}
                      onChange={(e) => setDocFee(Number(e.target.value))}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                      id="input-doc-fee"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Uploader with Preview (Bonus feature!) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 flex items-center space-x-1">
                  <Image className="h-4 w-4 text-slate-450" />
                  <span>Profile Photo Upload (JPG / PNG)</span>
                </label>
                
                <div className="flex items-center space-x-4 rounded-lg border border-dashed border-slate-200 p-3 bg-slate-50">
                  {docImage ? (
                    <div className="relative">
                      <img src={docImage} alt="Preview" className="h-12 w-12 rounded-md object-cover border border-slate-200" />
                      <button 
                        type="button" 
                        onClick={() => setDocImage('')}
                        className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-500 p-0.5 text-white shadow hover:bg-rose-600 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 border border-slate-200">
                      <Paperclip className="h-5 w-5 text-indigo-600" />
                    </div>
                  )}

                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload}
                      className="hidden" 
                      id="file-photo-selector" 
                    />
                    <label 
                      htmlFor="file-photo-selector"
                      className="inline-flex items-center space-x-1.5 rounded bg-white border border-slate-200 shadow-xs py-1.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{docImage ? 'Replace Photo' : 'Upload File'}</span>
                    </label>
                    <p className="text-[10px] text-slate-450 mt-1">Accepts images up to 4MB.</p>
                  </div>
                </div>
              </div>

              {/* Available Days Checkbox group */}
              <div className="space-y-1.5 text-xs">
                <label className="block text-xs font-semibold text-slate-600">Select consultation days of the week</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map(day => {
                    const isChecked = docDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`rounded-md border py-1.5 px-3 font-medium transition ${
                          isChecked 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots checkbox selection list */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Select active clinic session hours</label>
                <div className="grid grid-cols-3 gap-1.5 h-36 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  {PRESET_SLOTS.map(slot => {
                    const isChecked = docSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleToggleSlot(slot)}
                        className={`rounded py-1 font-mono text-[10px] font-semibold text-center border transition-all ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                            : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center space-x-3 bg-slate-50 rounded-lg p-3">
                <input
                  type="checkbox"
                  id="checkbox-doc-active"
                  checked={docIsActive}
                  onChange={(e) => setDocIsActive(e.target.checked)}
                  className="h-4.5 w-4.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <label htmlFor="checkbox-doc-active" className="text-xs font-bold text-slate-900 cursor-pointer">
                    Enable Profile Booking Slots Immediately
                  </label>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal">
                    When active, customers will see and book appointments. When inactive, doctor is hidden from search directory.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal actions footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4.5 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDoctor}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 hover:shadow-indigo-600/10"
                id="btn-confirm-save-doctor"
              >
                {modalMode === 'create' ? 'Create Doctor Profile' : 'Apply Changes'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
