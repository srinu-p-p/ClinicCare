# Smart Doctor Appointment & Clinic Management Platform

Welcome to the **ClinicaCare** Smart Hub, built with a high-performance React (frontend) and Express (full-stack API backend) architecture. This system features fully integrated, atomic database logic with robust safeguards protecting against double-booking, past-date booking, deactivations, and account duplicates.

---

## 🌟 Key Features & Hackathon Requirements

### 🛡️ Administrative Portal
- **Dashboard Stats Grid**: View real-time aggregates for **Total Doctors**, **Registered Patients**, **Today's Bookings**, **Upcoming Visits**, and **Completed Services**.
- **Doctor CRUD Hub**:
  - Register new practitioners with complete fields (Name, specialty, experience, qualification, consult fee, available weekdays, active timeslots).
  - Modify existing doctor entries.
  - Delete retired doctors.
  - **Activate/Deactivate Profiles**: Toggle clinician availability.
- **Appointments Controller**: Monitor all patient reservations. Approve/confirm pending visits, cancel active reservations, or mark sessions completed.

### 🩺 Patient Portal
- **Patient Sign up & Secure Login**: Individual patient sign-up with password encryption and token sessions.
- **Dynamic Search & Specialty taxonomy**: Filter clinicians in real-time by search text, specialty tags, consulting fee range slider, or specific appointment dates.
- **Instant Scheduler**: Select a doctor, pick a date, check available time grids, and book appointments instantly.
- **My Appointments Timeline**: Monitor ongoing or Completed medical histories with cancellation options.

### ⚡ Edge Case Protections
- **Double-booking Prevention (Database Transactions)**: Relational query-level verification locks active timeslots on specific dates. Booking requests that overlap are immediately rejected with a transactional conflict status `409`.
- **Doctor Deactivation Lock**: If a doctor is toggled inactive, their schedule is hidden from patients and new bookings are blocked. Existing appointments remain visible-on-file.
- **Past Date and Time Safeguard**: Restricts bookings on past days or past timeslots for today using real-time sync with database states.
- **Cancellation Lock Rules**: Completed consultations represent historical medical files and cannot be cancelled or altered in the database.
- **Duplicate Registration Shield**: Prevents secondary duplicate accounts using SQL native unique database constraints on registered emails.

### 🌟 Bonus Accomplishments
- **Google Sign-In & Firebase Auth**: Patient portal allows authenticating securely via federated Google login. The backend verifies authentic ID Tokens using `firebase-admin` and automatically provisions corresponding accounts.
- **JWT Authentication Flow**: Robust token-signing securely attached via `Authorization: Bearer <token>` in route requests for standard email/pass and Google-authenticated patients.
- **Doctor Profile Photo Upload**: Fully interactive client-side crop/uploader utilizing `FileReader` to encode images as inline Base64 strings, saved directly into high-capacity text fields in database rows.

---

## 🔑 Quick Access Demo Credentials

To make evaluation simple, use the pre-configured **Fast Access** button triggers on the login screen, or type the following credentials:

*   **Admin Console Login**:
    *   **Email**: `admin@clinic.com`
    *   **Password**: `admin123`
*   **Default Patient Account**:
    *   **Email**: `alex@example.com`
    *   **Password**: `alex123` (or register a fresh account)

---

## 🚀 Local Installation & Run Guide

Follow these steps to run the complete workspace locally on your system:

### 1. Prerequisites
Ensure you have **Node.js (v18 or higher)** and **npm** installed on your machine.

### 2. Extract Project and Install Dependencies
Navigate into the root directory of the project and execute:
```bash
npm install
```

### 3. Setup Environment variables
All defaults are configured out-of-the-box. If desired, configure a `.env` file in the root:
```env
PORT=3000
JWT_SECRET=your_custom_secret_key
```

### 4. Boot Development server
To run both the backend Express controller and the Vite React frontend concurrently, run:
```bash
npm run dev
```
The application will boot and become instantly accessible at: **`http://localhost:3000`**

### 5. Production Compilation and Run
To bundle asset and server files for high-efficiency production deployment, run:
```bash
# Compile and build both client and server targets
npm run build

# Start the compiled self-contained bundle
npm run start
```

---

## 📂 Database Architecture Document
ClinicaCare utilizes **Google Cloud SQL (PostgreSQL)** for secure, durable cloud persistence. The schema is fully managed and queried using **Drizzle ORM** type-safe SQL builders.

### 📊 Relational Database Schema
Our database comprises three primary tables mapped with strict indexes and referential integrity locks:

#### 1. `users` Table
Stores details of standard authenticated patients as well as Google-federated accounts.
- `id` (`text`, Primary Key) — Stores custom IDs (e.g., `pat-abc`, `admin-1`) or Firebase Auth Unique IDs (UIDs).
- `name` (`text`) — Full username.
- `email` (`text`, Unique) — Normalized user address used for lookup and sessions.
- `role` (`text`) — Role coordinates (`'patient'` or `'admin'`).
- `passwordHash` (`text`, Nullable) — Secure `bcryptjs` hash for internal password auth, or NULL for Google-federated OAuth logins.
- `createdAt` (`timestamp`) — Account registration date on the system.

#### 2. `doctors` Table
Maintains medical professional profiles and scheduling rosters.
- `id` (`text`, Primary Key) — Profile ID identifier.
- `name` (`text`) — Doctor display name.
- `specialization` (`text`) — Field of expertise.
- `experience` (`integer`) — Work experience in years.
- `qualification` (`text`) — Degrees and titles.
- `consultationFee` (`integer`) — Pricing of consultations in dollars.
- `availableDays` (`text[]`) — PostgreSQL array of operational days (e.g., `['Monday', 'Wednesday']`).
- `availableTimeSlots` (`text[]`) — PostgreSQL array of hours (e.g., `['10:00 AM', '11:00 AM']`).
- `imageUrl` (`text`) — Base64 photo string or live static preview URL.
- `isActive` (`boolean`) — Operational state. Inactive doctors are hidden from schedulers.

#### 3. `appointments` Table
Records patient sessions booked with corresponding medical professionals.
- `id` (`text`, Primary Key) — Unique reservation code.
- `patientId` (`text`, Foreign Key -> `users.id`) — Links to the patient record.
- `patientName` (`text`) — Snapshot of the patient's name.
- `patientEmail` (`text`) — Snapshot of the patient's email.
- `doctorId` (`text`, Foreign Key -> `doctors.id`) — Links to the assigned doctor.
- `doctorName` (`text`) — Snapshot of doctor's name.
- `doctorSpecialization` (`text`) — Snapshot of doctor's specialization.
- `date` (`text`) — Reservation date formatted as `YYYY-MM-DD`.
- `timeSlot` (`text`) — Selected hours.
- `status` (`text`) — Session status (`'Pending' | 'Confirmed' | 'Cancelled' | 'Completed'`).
- `createdAt` (`text`) — ISO timestamp representing transaction dispatch.
