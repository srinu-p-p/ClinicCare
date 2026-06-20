import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Doctor, User, Appointment, DashboardStats } from './src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface DbSchema {
  users: Array<User & { passwordHash: string }>;
  doctors: Doctor[];
  appointments: Appointment[];
}

// Initial Doctor seed data
const SEED_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Jane Smith',
    specialization: 'Cardiology',
    experience: 12,
    qualification: 'MBBS, MD (Cardiology)',
    consultationFee: 150,
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    availableTimeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'],
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    isActive: true,
  },
  {
    id: 'doc-2',
    name: 'Dr. John Doe',
    specialization: 'Pediatrics',
    experience: 8,
    qualification: 'MD (Pediatrics), DCH',
    consultationFee: 90,
    availableDays: ['Tuesday', 'Thursday'],
    availableTimeSlots: ['09:30 AM', '10:30 AM', '11:30 AM', '02:30 PM', '03:30 PM', '04:30 PM'],
    imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    isActive: true,
  },
  {
    id: 'doc-3',
    name: 'Dr. Sarah Lee',
    specialization: 'Dermatology',
    experience: 15,
    qualification: 'MBBS, MD (Dermatology)',
    consultationFee: 120,
    availableDays: ['Monday', 'Tuesday', 'Thursday'],
    availableTimeSlots: ['09:00 AM', '10:30 AM', '11:00 AM', '01:30 PM', '03:00 PM'],
    imageUrl: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=300',
    isActive: true,
  },
  {
    id: 'doc-4',
    name: 'Dr. Alan Vance',
    specialization: 'General Physician',
    experience: 6,
    qualification: 'MBBS, MRCGP',
    consultationFee: 75,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availableTimeSlots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'],
    imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300',
    isActive: true,
  },
  {
    id: 'doc-5',
    name: 'Dr. Robert Carter',
    specialization: 'Orthopedics',
    experience: 10,
    qualification: 'MBBS, MS (Orthopedics)',
    consultationFee: 140,
    availableDays: ['Wednesday', 'Friday'],
    availableTimeSlots: ['10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
    imageUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
    isActive: false, // Seeded as inactive as an admin test case
  }
];

export function readDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Setup initial DB with pre-seeded Admin and Doctors
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      const initialDb: DbSchema = {
        users: [
          {
            id: 'admin-1',
            name: 'System Admin',
            email: 'admin@clinic.com',
            role: 'admin',
            passwordHash: adminPasswordHash,
          }
        ],
        doctors: SEED_DOCTORS,
        appointments: [
          // Pre-seed an appointment for today just to have realistic statistics
          {
            id: 'apt-seed-1',
            patientId: 'patient-seed',
            patientName: 'Alex Mercer',
            patientEmail: 'alex@example.com',
            doctorId: 'doc-1',
            doctorName: 'Dr. Jane Smith',
            doctorSpecialization: 'Cardiology',
            date: new Date().toISOString().split('T')[0],
            timeSlot: '09:00 AM',
            status: 'Confirmed',
            createdAt: new Date().toISOString(),
          }
        ],
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], doctors: [], appointments: [] };
  }
}

export function writeDb(db: DbSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database:', error);
  }
}

// Ensure the db starts or initializes on module loading
readDb();

/**
 * Validates if a chosen Date & Time Slot is in the past
 * Note: input date is "YYYY-MM-DD" style and timeSlot is "HH:MM AM/PM" style.
 */
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
      const originalTimeSlotStr = timeSlotStr;
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
