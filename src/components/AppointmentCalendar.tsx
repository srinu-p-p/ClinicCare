import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, User, Clock, AlertCircle } from 'lucide-react';
import { Appointment } from '../types';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  role: 'admin' | 'patient';
  onSelectDate?: (dateStr: string) => void;
  onCancelAppointment?: (aptId: string) => void;
  onUpdateStatus?: (aptId: string, status: 'Confirmed' | 'Cancelled' | 'Completed') => void;
}

export default function AppointmentCalendar({
  appointments,
  role,
  onSelectDate,
  onCancelAppointment,
  onUpdateStatus
}: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayVal, setSelectedDayVal] = useState<string | null>(null); // YYYY-MM-DD

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate days in the current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Calculate first day of the month index (0 = Sun, 1 = Mon, etc.)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Create array for days of previous month padding
  const paddingDays = Array.from({ length: firstDayIndex });
  
  // Create array for actual days
  const actualDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayVal(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayVal(null);
  };

  // Helper to format date key YYYY-MM-DD
  const formatDateKey = (dayNum: number): string => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter appointments for a specific day
  const getDayAppointments = (dayNum: number) => {
    const key = formatDateKey(dayNum);
    return appointments.filter(apt => apt.date === key);
  };

  // Handle day cell click
  const handleDayClick = (dayNum: number) => {
    const key = formatDateKey(dayNum);
    setSelectedDayVal(key);
    if (onSelectDate) {
      onSelectDate(key);
    }
  };

  // Render Status Badge
  const getStatusDotColor = (status: Appointment['status']) => {
    switch (status) {
      case 'Pending': return 'bg-amber-500';
      case 'Confirmed': return 'bg-teal-500';
      case 'Completed': return 'bg-indigo-500';
      case 'Cancelled': return 'bg-slate-300';
    }
  };

  const selectedDayApts = selectedDayVal 
    ? appointments.filter(apt => apt.date === selectedDayVal)
    : [];

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in" id="appointment-calendar-component">
      
      {/* Calendar Header with navigation */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Calendar className="h-4.5 w-4.5 text-teal-600" />
          <span className="font-mono text-xs text-slate-550 mr-1">Interactive Scheduler</span>
          <span className="font-sans font-bold text-slate-800">{MONTH_NAMES[month]} {year}</span>
        </h3>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={prevMonth}
            className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition active:scale-95 text-slate-600"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDayVal(null);
            }}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 transition active:scale-95 text-slate-700"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition active:scale-95 text-slate-600"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-1">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Cells Grid */}
      <div className="grid grid-cols-7 gap-1 border-slate-100 pt-1">
        {/* Padding days from previous month */}
        {paddingDays.map((_, idx) => (
          <div key={`pad-${idx}`} className="h-20 rounded-lg bg-slate-50/50 border border-slate-50 opacity-40" />
        ))}

        {/* Actual days in month */}
        {actualDays.map(day => {
          const key = formatDateKey(day);
          const dayApts = getDayAppointments(day);
          const isToday = key === todayStr;
          const isSelected = key === selectedDayVal;

          return (
            <button
              key={`day-${day}`}
              onClick={() => handleDayClick(day)}
              className={`h-20 rounded-lg p-1.5 text-left flex flex-col justify-between transition-all border outline-none cursor-pointer ${
                isSelected
                  ? 'border-teal-500 bg-teal-50/20 ring-1 ring-teal-500 shadow-xs'
                  : isToday
                  ? 'border-indigo-500 bg-indigo-50/30 font-bold'
                  : 'border-slate-100 hover:border-slate-350 hover:bg-slate-50/80 bg-white'
              }`}
              id={`calendar-cell-${key}`}
            >
              {/* Day Number Label */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isToday ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {day}
                </span>
                {dayApts.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-700">
                    {dayApts.length}
                  </span>
                )}
              </div>

              {/* Minimal dots for appointments in cell */}
              <div className="flex flex-wrap gap-1 max-h-10 overflow-hidden mt-1">
                {dayApts.slice(0, 4).map(apt => (
                  <span
                    key={apt.id}
                    className={`h-2 w-2 rounded-full ${getStatusDotColor(apt.status)}`}
                    title={`${apt.doctorName} - ${apt.timeSlot}`}
                  />
                ))}
                {dayApts.length > 4 && (
                  <span className="text-[8px] text-slate-400 font-bold leading-tight">+</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day details pop-panel */}
      {selectedDayVal && (
        <div className="rounded-lg border border-teal-100 bg-teal-50/15 p-4 mt-3 space-y-3 animate-fade-in" id="calendar-day-details">
          <div className="flex items-center justify-between border-b border-teal-100/50 pb-2">
            <h4 className="text-xs font-bold text-slate-900">
              Selected: <span className="font-mono text-teal-800">{selectedDayVal}</span>
            </h4>
            <button
              onClick={() => setSelectedDayVal(null)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition"
            >
              Clear selection
            </button>
          </div>

          {selectedDayApts.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-slate-500 font-medium">No sessions scheduled on this date.</p>
              {role === 'patient' && onSelectDate && (
                <p className="text-[10px] text-teal-600">
                  Tap "Book Appointment" on any doctor profile above, then choose this date to register your visit.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedDayApts.map(apt => (
                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border border-slate-100 bg-white p-3 space-y-2 sm:space-y-0 shadow-xs">
                  
                  {/* Appointment info */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{apt.doctorName}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 capitalize">
                        {apt.doctorSpecialization}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{apt.timeSlot}</span>
                      </span>
                      <span className="flex items-center space-x-1 font-semibold text-slate-600">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Patient: {apt.patientName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Status controls matching permissions */}
                  <div className="flex items-center justify-end space-x-2">
                    
                    {/* Render status tag */}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      apt.status === 'Confirmed' ? 'bg-teal-50 text-teal-805' :
                      apt.status === 'Pending' ? 'bg-amber-50 text-amber-805' :
                      apt.status === 'Completed' ? 'bg-indigo-50 text-indigo-805' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {apt.status}
                    </span>

                    {/* Actions if relevant */}
                    {role === 'patient' && ['Pending', 'Confirmed'].includes(apt.status) && onCancelAppointment && (
                      <button
                        onClick={() => onCancelAppointment(apt.id)}
                        className="rounded border border-rose-100 bg-rose-50 text-rose-600 px-2 py-1 text-[10px] font-bold hover:bg-rose-100 active:scale-95 transition"
                      >
                        Cancel
                      </button>
                    )}

                    {role === 'admin' && onUpdateStatus && (
                      <div className="flex gap-1">
                        {apt.status === 'Pending' && (
                          <button
                            onClick={() => onUpdateStatus(apt.id, 'Confirmed')}
                            className="rounded bg-emerald-600 text-white px-2 py-1 text-[9px] font-bold hover:bg-emerald-700 hover:shadow-xs"
                          >
                            Approve
                          </button>
                        )}
                        {apt.status === 'Confirmed' && (
                          <button
                            onClick={() => onUpdateStatus(apt.id, 'Completed')}
                            className="rounded bg-indigo-600 text-white px-2 py-1 text-[9px] font-bold hover:bg-indigo-700 hover:shadow-xs"
                          >
                            Complete
                          </button>
                        )}
                        {['Pending', 'Confirmed'].includes(apt.status) && (
                          <button
                            onClick={() => onUpdateStatus(apt.id, 'Cancelled')}
                            className="rounded border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1 text-[9px] font-bold hover:bg-slate-100 hover:border-slate-350"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}

                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
