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
- **Double-booking Prevention (Concurrent Requests)**: The single-threaded Node event loop sequentially locks check-then-write file-based operations. Booking requests that overlap are immediately rejected with conflict status `409`.
- **Doctor Deactivation Lock**: If a doctor is toggled inactive, their schedule is hidden from patients and new bookings are blocked. Existing appointments remain visible-on-file.
- **Past Date and Time Safeguard**: Restricts bookings on past days or past timeslots for today.
- **Cancellation Lock Rules**: Completed consultations represent historical medical files and cannot be cancelled or altered.
- **Duplicate Registration Shield**: Prevents secondary duplicate accounts using registered emails.

### 🌟 Bonus Accomplishments
- **JWT Authentication Flow**: Robust token-signing securely attached via `Authorization: Bearer <token>` in route requests.
- **Doctor Profile Photo Upload**: Fully interactive client-side crop/uploader utilizing `FileReader` to encode images as inline Base64 strings. This allows seamless photo displays without complex multi-part filesystem errors.
- **Simulated Notification Dispatcher**: Visual logs printed directly to the system console simulating background SMS or Email alerts on reservation updates.

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
All states are managed via an atomic JSON store mapped at `./db.json`. Users and Doctors are automatically pre-seeded on first run to provide a rich mock dataset:

```json
{
  "users": [
    {
      "id": "admin-1",
      "name": "System Admin",
      "email": "admin@clinic.com",
      "role": "admin",
      "passwordHash": "$2a$10$..."
    }
  ],
  "doctors": [
    {
      "id": "doc-1",
      "name": "Dr. Jane Smith",
      "specialization": "Cardiology",
      "experience": 12,
      "qualification": "MBBS, MD (Cardiology)",
      "consultationFee": 150,
      "availableDays": ["Monday", "Wednesday", "Friday"],
      "availableTimeSlots": ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"],
      "imageUrl": "...",
      "isActive": true
    }
  ],
  "appointments": []
}
```
