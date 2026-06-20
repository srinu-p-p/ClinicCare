export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: number; // in years
  qualification: string;
  consultationFee: number;
  availableDays: string[]; // e.g. ["Monday", "Wednesday"]
  availableTimeSlots: string[]; // e.g. ["09:00 AM", "10:00 AM"]
  imageUrl?: string; // profile photo (base64 string or url)
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'patient';
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:00 AM"
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
  createdAt: string;
}

export interface DashboardStats {
  totalDoctors: number;
  totalPatients: number;
  todayAppointmentsCount: number;
  upcomingAppointmentsCount: number;
  completedAppointmentsCount: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SearchFilters {
  searchTerm: string;
  specialization: string;
  minFee: number;
  maxFee: number;
  availableDate: string; // YYYY-MM-DD
}
