import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Calendar, DollarSign, Award, Clock, 
  MapPin, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Clock3, ThumbsUp
} from 'lucide-react';
import { Doctor, Appointment, AuthResponse } from '../types';
import AppointmentCalendar from './AppointmentCalendar';

interface PatientPortalProps {
  auth: AuthResponse;
}

export default function PatientPortal({ auth }: PatientPortalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingApts, setLoadingApts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View toggle: List or Calendar for scheduler & agenda
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [minFee, setMinFee] = useState<string>('');
  const [maxFee, setMaxFee] = useState<string>('');
  const [filterDate, setFilterDate] = useState('');

  // Schedulers State
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Load specialists list
  const fetchDoctors = async () => {
    setLoadingDocs(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('searchTerm', searchTerm);
      if (specialization) params.append('specialization', specialization);
      if (minFee) params.append('minFee', minFee);
      if (maxFee) params.append('maxFee', maxFee);
      if (filterDate) params.append('availableDate', filterDate);

      const res = await fetch(`/api/doctors?${params.toString()}`);
      if (!res.ok) throw new Error('Could not fetch doctor records.');
      const data = await res.json();
      setDoctors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Load patient appointments
  const fetchAppointments = async () => {
    setLoadingApts(true);
    try {
      const res = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (!res.ok) throw new Error('Could not loading appointments list.');
      const data = await res.json();
      
      // Sort: newest booking request first
      data.sort((a: Appointment, b: Appointment) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setAppointments(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingApts(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [searchTerm, specialization, minFee, maxFee, filterDate]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Submit appointment booking
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !bookingDate || !bookingSlot) {
      setBookingError('Please choose doctor, date and slot fully.');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          date: bookingDate,
          timeSlot: bookingSlot
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to book slot.');
      }

      setBookingSuccess(true);
      fetchAppointments();
      // Reset scheduler panel values
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedDoctor(null);
        setBookingDate('');
        setBookingSlot('');
      }, 2500);

    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel own booking
  const handleCancelAppointment = async (aptId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment session?')) return;
    
    try {
      const res = await fetch(`/api/appointments/${aptId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ status: 'Cancelled' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed cancellation request.');
      }

      fetchAppointments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper: check if a timeslot on a specific date is already taken
  const isSlotTaken = (doctorId: string, date: string, slot: string) => {
    return appointments.some(apt => 
      apt.doctorId === doctorId && 
      apt.date === date && 
      apt.timeSlot === slot && 
      apt.status !== 'Cancelled'
    );
  };

  // Helper: evaluates if slot of TODAY is in the past
  const isSlotInPast = (dateStr: string, slotStr: string) => {
    try {
      const today = new Date();
      const parts = dateStr.split('-').map(Number);
      const apptMidnight = new Date(parts[0], parts[1] - 1, parts[2]);
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (apptMidnight < todayMidnight) return true;
      if (apptMidnight.getTime() === todayMidnight.getTime()) {
        const match = slotStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
        if (!match) return false;
        let [_, hStr, mStr, period] = match;
        let hrs = parseInt(hStr, 10);
        const mins = parseInt(mStr, 10);
        if (period.toUpperCase() === 'PM' && hrs !== 12) hrs += 12;
        else if (period.toUpperCase() === 'AM' && hrs === 12) hrs = 0;

        const slotTime = new Date(parts[0], parts[1] - 1, parts[2], hrs, mins);
        return slotTime < today;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // Find weekday of date
  const getWeekday = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-').map(Number);
      const dayIdx = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return DAYS[dayIdx];
    } catch {
      return '';
    }
  };

  const selectedDateWeekday = getWeekday(bookingDate);
  const isDoctorWorkingOnSelectedDay = selectedDoctor && bookingDate ? selectedDoctor.availableDays.includes(selectedDateWeekday) : true;

  // Render Status Badge
  const renderStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Pending':
        return <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200">Pending</span>;
      case 'Confirmed':
        return <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-850 border border-teal-200">Confirmed</span>;
      case 'Completed':
        return <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 border border-indigo-200">Completed</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500 border border-slate-200">Cancelled</span>;
    }
  };

  return (
    <div className="space-y-10 py-8 animate-fade-in">
      
      {/* 1. Personalized Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-800 p-8 text-white shadow-xl shadow-teal-900/10">
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {auth.user.name}!</h1>
        <p className="mt-2.5 max-w-2xl text-teal-100 font-medium">
          Connecting you with premium healthcare. Search verified practitioner timetables, secure instant appointments, and review medical history securely.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* 2. Left 2 Columns: Search & Book doctors */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Filtration card */}
          <div className="rounded-xl border border-slate-250 bg-white p-6 shadow-sm">
            <h2 className="flex items-center space-x-2 text-base font-bold text-slate-900">
              <Filter className="h-4.5 w-4.5 text-teal-600" />
              <span>Search Medical Specialist</span>
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Search input name/text */}
              <div className="relative">
                <Search className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Doctor name or description"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.2 pr-4 pl-10 text-sm text-slate-900 placeholder-slate-450 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2.5 focus:ring-teal-100"
                />
              </div>

              {/* Specialization dropdown */}
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.2 px-3.5 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2.5 focus:ring-teal-100"
              >
                <option value="">All Specialties</option>
                <option value="Cardiology">Cardiology (Heart)</option>
                <option value="Pediatrics">Pediatrics (Children)</option>
                <option value="Dermatology">Dermatology (Skin)</option>
                <option value="General Physician">General Physician (Checkup)</option>
                <option value="Orthopedics">Orthopedics (Bones)</option>
              </select>

              {/* Fee sliders and Date Select */}
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-450 text-xs">$</div>
                  <input
                    type="number"
                    placeholder="Min Fee"
                    value={minFee}
                    onChange={(e) => setMinFee(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.2 pl-7 pr-2.5 text-sm text-slate-900 placeholder-slate-450 focus:border-teal-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-450 text-xs">$</div>
                  <input
                    type="number"
                    placeholder="Max Fee"
                    value={maxFee}
                    onChange={(e) => setMaxFee(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.2 pl-7 pr-2.5 text-sm text-slate-900 placeholder-slate-450 focus:border-teal-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="relative">
                <Calendar className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.2 pr-4 pl-10 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                  title="Search by Available Date"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || specialization || minFee || maxFee || filterDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSpecialization('');
                  setMinFee('');
                  setMaxFee('');
                  setFilterDate('');
                }}
                className="mt-4 text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Clear all active search filters
              </button>
            )}
          </div>

          {/* Portal View Toggle & Main Body */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {viewMode === 'list' ? 'Available Health Practitioners' : 'Interactive Scheduling Calendar'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {viewMode === 'list' 
                    ? `Showing ${doctors.length} qualified health providers matching criteria.` 
                    : 'Analyze clinic schedules, review existing appointments, or pick dates to book visits.'}
                </p>
              </div>

              {/* Toggle controls */}
              <div className="flex items-center self-start sm:self-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  id="btn-toggle-list-view"
                >
                  List View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  id="btn-toggle-calendar-view"
                >
                  Calendar View
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <>
                {loadingDocs ? (
                  <div className="flex h-40 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-350 bg-white p-8 text-center shadow-xs" id="no-doctors-alert">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-450" />
                    <h4 className="mt-3 text-sm font-semibold text-slate-900">No medical doctors match criteria</h4>
                    <p className="mt-1 text-xs text-slate-500">Try loosening your fee parameters or search for a different specialty.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {doctors.map(doc => (
                      <div key={doc.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md" id={`doctor-card-${doc.id}`}>
                        <div className="space-y-3">
                          
                          {/* Flex row metadata */}
                          <div className="flex items-start space-x-3.5">
                            <img 
                              src={doc.imageUrl} 
                              alt={doc.name} 
                              className="h-14 w-14 rounded-lg object-cover border border-slate-100"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <h4 className="text-sm font-bold text-slate-950">{doc.name}</h4>
                              <span className="inline-block rounded-md bg-teal-50 px-2 py-0.5 mt-0.5 text-[11px] font-semibold text-teal-700">
                                {doc.specialization}
                              </span>
                              <p className="mt-1 text-xs font-medium text-slate-400 line-clamp-1">{doc.qualification}</p>
                            </div>
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-600">
                            <div className="flex items-center space-x-1">
                              <Award className="h-3.5 w-3.5 text-slate-400" />
                              <span>{doc.experience} Years Exp</span>
                            </div>
                            <div className="flex items-center space-x-1 font-mono text-teal-700 font-semibold justify-end">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>${doc.consultationFee} consultation</span>
                            </div>
                          </div>

                          {/* Schedule description week */}
                          <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500">
                            <span className="font-semibold block text-slate-700 mb-0.5">Availability:</span>
                            <p>{doc.availableDays.join(', ')}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setBookingDate('');
                            setBookingSlot('');
                            setBookingError(null);
                          }}
                          className="mt-4 w-full rounded-lg bg-teal-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-teal-700 active:scale-99"
                          id={`btn-schedule-${doc.id}`}
                        >
                          Book Free Appointment
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Visual guidance box for patients */}
                <div className="rounded-xl bg-teal-50/40 border border-teal-100 p-4 flex items-start space-x-3 text-xs text-teal-900">
                  <AlertCircle className="h-4.5 w-4.5 text-teal-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Pro-Tip: Interactive Booking Integration</p>
                    <p className="leading-relaxed">
                      Click any date on the calendar below to automatically feed that date into your active Doctor Scheduler profile builder on the right! Your current booked visits are indicated as elegant colored dots inside day cells.
                    </p>
                  </div>
                </div>

                <AppointmentCalendar
                  appointments={appointments}
                  role="patient"
                  onSelectDate={(dateStr) => {
                    setBookingDate(dateStr);
                    setBookingSlot('');
                    setBookingError(null);
                    
                    // Simple notice bubble
                    if (selectedDoctor) {
                      const dayOfWeek = getWeekday(dateStr);
                      if (!selectedDoctor.availableDays.includes(dayOfWeek)) {
                        setBookingError(`Note: Dr. ${selectedDoctor.name} does not consult on ${dayOfWeek}s. Please check active schedules.`);
                      }
                    }
                  }}
                  onCancelAppointment={handleCancelAppointment}
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. Right 1 Column: Scheduler Overlay / Active Bookings Tab */}
        <div className="space-y-6">
          
          {/* Selected Doctor Appointment Drawer */}
          {selectedDoctor ? (
            <div className="rounded-xl border border-teal-200 bg-white p-6 shadow-md transition-all animate-fade-in" id="scheduler-widget-panel">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Calendar className="h-4.5 w-4.5 text-teal-600" />
                  <span>Configure Schedule Slot</span>
                </h3>
                <button 
                  onClick={() => setSelectedDoctor(null)}
                  className="rounded px-2 py-0.5 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              {bookingSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                    <CheckCircle className="h-6 w-6 animate-bounce" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Appointment Registered!</h4>
                  <p className="text-xs text-slate-500">An automatic Email confirmation is being generated and dispatched.</p>
                </div>
              ) : (
                <form onSubmit={handleBook} className="mt-4 space-y-4">
                  
                  {/* Doctor pill */}
                  <div className="flex items-center space-x-3 rounded-lg bg-slate-50 p-3">
                    <img src={selectedDoctor.imageUrl} alt={selectedDoctor.name} className="h-10 w-10 rounded-md object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-950">{selectedDoctor.name}</p>
                      <p className="text-[11px] font-semibold text-slate-500">{selectedDoctor.specialization}</p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Step 1: Choose Appointment Date</label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        setBookingSlot('');
                        setBookingError(null);
                      }}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {bookingDate && (
                    <div className="animate-fade-in space-y-3">
                      {isDoctorWorkingOnSelectedDay ? (
                        <>
                          <label className="block text-xs font-semibold text-slate-600">
                            Step 2: Selected available slot ({selectedDateWeekday})
                          </label>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {selectedDoctor.availableTimeSlots.map(slot => {
                              const alreadyBooked = isSlotTaken(selectedDoctor.id, bookingDate, slot);
                              const pastSlot = isSlotInPast(bookingDate, slot);
                              const disabled = alreadyBooked || pastSlot;

                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => setBookingSlot(slot)}
                                  className={`rounded-lg border py-2 text-center text-xs font-medium transition-all ${
                                    bookingSlot === slot
                                      ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm'
                                      : disabled
                                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                  }`}
                                  title={alreadyBooked ? 'Already booked' : pastSlot ? 'Time slot is past' : 'Available'}
                                  id={`slot-btn-${slot.replace(/\s+/g, '-')}`}
                                >
                                  <div>{slot}</div>
                                  <div className="text-[9px] font-normal leading-tight">
                                    {alreadyBooked ? 'Reserved' : pastSlot ? 'Past slot' : 'Available'}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <p>
                            Dr. {selectedDoctor.name} is not available on {selectedDateWeekday}s. Work days are: {selectedDoctor.availableDays.join(', ')}.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {bookingError && (
                    <div className="rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-600 flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={bookingLoading || !bookingSlot || !isDoctorWorkingOnSelectedDay}
                    className="w-full rounded-lg bg-teal-600 py-3 text-xs font-bold text-white transition-all hover:bg-teal-700 active:scale-99 disabled:opacity-40 disabled:cursor-not-allowed"
                    id="submit-booking-order"
                  >
                    {bookingLoading ? 'Registering Booking...' : 'Process Appointment Registration'}
                  </button>

                </form>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-250 bg-slate-50/50 p-6 text-center">
              <Clock3 className="mx-auto h-7 w-7 text-slate-400" />
              <h4 className="mt-2 text-xs font-bold text-slate-700">No Clinic Slot Selected</h4>
              <p className="mt-1 text-[11px] text-slate-500">Pick a doctor from the available listing to initiate schedule bookings.</p>
            </div>
          )}

          {/* Appointments Timeline console */}
          <div className="rounded-xl border border-slate-250 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Clock className="h-4.5 w-4.5 text-teal-600" />
                <span>My Appointments ({appointments.length})</span>
              </h3>
              <button 
                onClick={fetchAppointments} 
                className="text-slate-450 hover:text-teal-600 p-0.5 rounded transition-all"
                title="Refresh booking logs"
              >
                <RefreshCw className={`h-4 w-4 ${loadingApts ? 'animate-spin text-teal-650' : ''}`} />
              </button>
            </div>

            {appointments.length === 0 ? (
              <p className="mt-4 text-center text-xs text-slate-400 py-6">You have no booked appointments scheduled yet.</p>
            ) : (
              <div className="mt-4 space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                {appointments.map(apt => (
                  <div key={apt.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 space-y-2" id={`appointment-item-${apt.id}`}>
                    
                    {/* Meta row info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-950">{apt.doctorName}</h4>
                        <p className="text-[10px] font-semibold text-slate-400">{apt.doctorSpecialization}</p>
                      </div>
                      {renderStatusBadge(apt.status)}
                    </div>

                    {/* Date badge */}
                    <div className="flex items-center space-x-3 text-[10px] font-medium text-slate-600 font-mono">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{apt.date}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{apt.timeSlot}</span>
                      </span>
                    </div>

                    {/* Cancel action triggers (Cannot cancel Completed) */}
                    {['Pending', 'Confirmed'].includes(apt.status) ? (
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="mt-1.5 block text-[10px] font-bold text-rose-600 hover:text-rose-700 transition"
                        title="Cancel this medical visit"
                        id={`cancel-apt-${apt.id}`}
                      >
                        Cancel Appointment
                      </button>
                    ) : apt.status === 'Completed' ? (
                      <div className="flex items-center space-x-1 ml-0.5 mt-1 text-[10px] text-teal-600 font-bold">
                        <ThumbsUp className="h-3 w-3" />
                        <span>Session finished successfully</span>
                      </div>
                    ) : null}

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
