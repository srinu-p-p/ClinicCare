import bcrypt from 'bcryptjs';
import { Doctor, User, Appointment, DashboardStats } from './src/types';
import { db } from './src/db/index.ts';
import { users, doctors as doctorsTable, appointments as appointmentsTable } from './src/db/schema.ts';
import { eq, and, gte, lte, sql, ne } from 'drizzle-orm';

// Synchronous helper for date validation (original unaltered)
export function isDateTimeInPast(dateStr: string, timeSlotStr: string): boolean {
  try {
    const today = new Date();
    
    // Check if the date itself is yesterday or earlier
    const [year, month, day] = dateStr.split('-').map(Number);
    const appointmentDateObj = new Date(year, month - 1, day);
    
    // Standardize dates to midnight (00:00:00) for comparisons
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (appointmentDateObj < todayMidnight) {
      return true; // Simple past date
    }
    
    if (appointmentDateObj.getTime() === todayMidnight.getTime()) {
      // If today, check if time has passed
      // Convert "10:30 AM" or "02:00 PM" to 24h hours/minutes
      const match = timeSlotStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!match) return false; // Fail gracefully if format is unexpected
      
      let [_, hoursStr, minutesStr, period] = match;
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      const appSlotTime = new Date(year, month - 1, day, hours, minutes);
      return appSlotTime < today; // Compare with current precise server time
    }
    
    return false;
  } catch (err) {
    console.error('Error checking time in past', err);
    return false;
  }
}

// Robust database query layer helpers with try/catch wrapping

export async function getUserByEmail(email: string) {
  try {
    const list = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));
    return list[0] || null;
  } catch (error) {
    console.error('getUserByEmail query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserById(id: string) {
  try {
    const list = await db.select()
      .from(users)
      .where(eq(users.id, id));
    return list[0] || null;
  } catch (error) {
    console.error('getUserById query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createUser(user: { id: string; name: string; email: string; role: 'admin' | 'patient'; passwordHash?: string }) {
  try {
    const result = await db.insert(users)
      .values({
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase().trim(),
        role: user.role,
        passwordHash: user.passwordHash || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('createUser insert failed:', error);
    throw new Error('Failed to create user account.', { cause: error });
  }
}

export async function getDoctorsList(filters: {
  searchTerm?: string;
  specialization?: string;
  minFee?: number;
  maxFee?: number;
  availableDate?: string;
  includeInactive?: boolean;
} = {}) {
  try {
    let queryConditions: any[] = [];

    // 1. Filter active only unless includeInactive is specified
    if (!filters.includeInactive) {
      queryConditions.push(eq(doctorsTable.isActive, true));
    }

    // 2. Specialty match
    if (filters.specialization) {
      queryConditions.push(eq(doctorsTable.specialization, filters.specialization));
    }

    // 3. Fee bounds
    if (filters.minFee !== undefined && filters.minFee > 0) {
      queryConditions.push(gte(doctorsTable.consultationFee, filters.minFee));
    }
    if (filters.maxFee !== undefined && filters.maxFee < Infinity) {
      queryConditions.push(lte(doctorsTable.consultationFee, filters.maxFee));
    }

    // Run base select
    let list = await db.select().from(doctorsTable);

    // Apply database conditions
    if (queryConditions.length > 0) {
      list = await db.select()
        .from(doctorsTable)
        .where(and(...queryConditions));
    }

    // 4. Manual/SQL filtering for text search and date arrays
    let filtered = [...list];

    if (filters.searchTerm) {
      const q = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(q) || 
        doc.specialization.toLowerCase().includes(q) ||
        doc.qualification.toLowerCase().includes(q)
      );
    }

    if (filters.availableDate) {
      try {
        const parts = filters.availableDate.split('-').map(Number);
        const dayIdx = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
        const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = DAYS[dayIdx];
        filtered = filtered.filter(doc => doc.availableDays.includes(targetDay));
      } catch (e) {
        console.error('Failed to parse availableDate filter:', e);
      }
    }

    return filtered;
  } catch (error) {
    console.error('getDoctorsList query failed:', error);
    throw new Error('Failed to retrieve doctors records.', { cause: error });
  }
}

export async function getDoctorById(id: string) {
  try {
    const list = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, id));
    return list[0] || null;
  } catch (error) {
    console.error('getDoctorById query failed:', error);
    throw new Error('Failed to retrieve doctor details.', { cause: error });
  }
}

export async function createDoctor(doc: Omit<Doctor, 'createdAt'>) {
  try {
    const result = await db.insert(doctorsTable)
      .values({
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        experience: doc.experience,
        qualification: doc.qualification,
        consultationFee: doc.consultationFee,
        availableDays: doc.availableDays,
        availableTimeSlots: doc.availableTimeSlots,
        imageUrl: doc.imageUrl,
        isActive: doc.isActive,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('createDoctor database insertion failed:', error);
    throw new Error('Failed to create doctor profile.', { cause: error });
  }
}

export async function updateDoctor(id: string, updates: Partial<Doctor>) {
  try {
    const cleanUpdates: any = {};
    if (updates.name !== undefined) cleanUpdates.name = updates.name;
    if (updates.specialization !== undefined) cleanUpdates.specialization = updates.specialization;
    if (updates.experience !== undefined) cleanUpdates.experience = updates.experience;
    if (updates.qualification !== undefined) cleanUpdates.qualification = updates.qualification;
    if (updates.consultationFee !== undefined) cleanUpdates.consultationFee = updates.consultationFee;
    if (updates.availableDays !== undefined) cleanUpdates.availableDays = updates.availableDays;
    if (updates.availableTimeSlots !== undefined) cleanUpdates.availableTimeSlots = updates.availableTimeSlots;
    if (updates.imageUrl !== undefined) cleanUpdates.imageUrl = updates.imageUrl;
    if (updates.isActive !== undefined) cleanUpdates.isActive = updates.isActive;

    const result = await db.update(doctorsTable)
      .set(cleanUpdates)
      .where(eq(doctorsTable.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('updateDoctor failed:', error);
    throw new Error('Failed to update doctor profile.', { cause: error });
  }
}

export async function deleteDoctor(id: string) {
  try {
    const result = await db.delete(doctorsTable)
      .where(eq(doctorsTable.id, id))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error('deleteDoctor query failed:', error);
    throw new Error('Failed to delete doctor profile.', { cause: error });
  }
}

export async function getAllAppointments() {
  try {
    return await db.select().from(appointmentsTable);
  } catch (error) {
    console.error('getAllAppointments query failed:', error);
    throw new Error('Failed to retrieve appointments list.', { cause: error });
  }
}

export async function getAppointmentsByPatient(patientId: string) {
  try {
    return await db.select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.patientId, patientId));
  } catch (error) {
    console.error('getAppointmentsByPatient query failed:', error);
    throw new Error('Failed to retrieve user appointments.', { cause: error });
  }
}

export async function checkDoubleBooking(doctorId: string, date: string, timeSlot: string) {
  try {
    const list = await db.select()
      .from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.doctorId, doctorId),
        eq(appointmentsTable.date, date),
        eq(appointmentsTable.timeSlot, timeSlot),
        ne(appointmentsTable.status, 'Cancelled')
      ));
    return list.length > 0;
  } catch (error) {
    console.error('checkDoubleBooking check failed:', error);
    throw new Error('Double booking verification failed.', { cause: error });
  }
}

export async function createAppointment(apt: Appointment) {
  try {
    const result = await db.insert(appointmentsTable)
      .values({
        id: apt.id,
        patientId: apt.patientId,
        patientName: apt.patientName,
        patientEmail: apt.patientEmail,
        doctorId: apt.doctorId,
        doctorName: apt.doctorName,
        doctorSpecialization: apt.doctorSpecialization,
        date: apt.date,
        timeSlot: apt.timeSlot,
        status: apt.status,
        createdAt: apt.createdAt,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('createAppointment database insertion failed:', error);
    throw new Error('Failed to book appointment session.', { cause: error });
  }
}

export async function getAppointmentById(id: string) {
  try {
    const list = await db.select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.id, id));
    return list[0] || null;
  } catch (error) {
    console.error('getAppointmentById query failed:', error);
    throw new Error('Failed to retrieve appointment record.', { cause: error });
  }
}

export async function updateAppointmentStatus(id: string, status: 'Confirmed' | 'Cancelled' | 'Completed') {
  try {
    const result = await db.update(appointmentsTable)
      .set({ status })
      .where(eq(appointmentsTable.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('updateAppointmentStatus database update failed:', error);
    throw new Error('Failed to update appointment status.', { cause: error });
  }
}

export async function getAdminStats(): Promise<DashboardStats> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Total doctors
    const doctorsList = await db.select().from(doctorsTable);
    const totalDoctors = doctorsList.length;

    // Total patients
    const patientsList = await db.select().from(users).where(eq(users.role, 'patient'));
    const totalPatients = patientsList.length;

    // Appointments query for counts
    const allApts = await db.select().from(appointmentsTable);
    
    const todayAppointmentsCount = allApts.filter(apt => apt.date === todayStr).length;
    
    const upcomingAppointmentsCount = allApts.filter(apt => {
      return apt.date >= todayStr && (apt.status === 'Pending' || apt.status === 'Confirmed');
    }).length;

    const completedAppointmentsCount = allApts.filter(apt => apt.status === 'Completed').length;

    return {
      totalDoctors,
      totalPatients,
      todayAppointmentsCount,
      upcomingAppointmentsCount,
      completedAppointmentsCount,
    };
  } catch (error) {
    console.error('getAdminStats computation failed:', error);
    throw new Error('Failed to compile admin metrics.', { cause: error });
  }
}
