import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Can store 'pat-abc' / 'admin-1' / Firebase UID
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(), // 'admin' | 'patient'
  passwordHash: text('password_hash'), // Nullable for Google Auth users
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const doctors = pgTable('doctors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  specialization: text('specialization').notNull(),
  experience: integer('experience').notNull(),
  qualification: text('qualification').notNull(),
  consultationFee: integer('consultation_fee').notNull(),
  availableDays: text('available_days').array().notNull(), // PostgreSQL text array
  availableTimeSlots: text('available_time_slots').array().notNull(), // PostgreSQL text array
  imageUrl: text('image_url').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').references(() => users.id).notNull(),
  patientName: text('patient_name').notNull(),
  patientEmail: text('patient_email').notNull(),
  doctorId: text('doctor_id').references(() => doctors.id).notNull(),
  doctorName: text('doctor_name').notNull(),
  doctorSpecialization: text('doctor_specialization').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  timeSlot: text('time_slot').notNull(),
  status: text('status').notNull(), // 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed'
  createdAt: text('created_at').notNull(),
});
