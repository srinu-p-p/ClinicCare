import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';

// Load our database controller
import { readDb, writeDb, isDateTimeInPast } from './server-db';
import { Doctor, User, Appointment, DashboardStats, SearchFilters } from './src/types';

// Extend express Request definition to include authenticated user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'patient';
  };
}

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clinic-platform-top-secret-2026';

async function startServer() {
  const app = express();
  
  // Increase payload limit significantly to allow Base64 profile photo uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // JWT Middleware validation
  const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Access token required. Please log in.' });
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
      if (err) {
        res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
        return;
      }
      req.user = decoded;
      next();
    });
  };

  // Admin authorization rule
  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin credentials required.' });
      return;
    }
    next();
  };

  // Express API routes:
  
  // 1. Authentication: Register
  app.post('/api/auth/register', (req: Request, res: Response): void => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Please populate name, email, and password.' });
      return;
    }

    const emailNorm = email.toLowerCase().trim();
    const db = readDb();
    
    // Constraint: Prevent duplicate accounts
    const existing = db.users.find(u => u.email.toLowerCase() === emailNorm);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Hash password and save patient
    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = {
      id: 'pat-' + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      email: emailNorm,
      role: 'patient' as const,
    };

    db.users.push({
      ...newUser,
      passwordHash,
    });
    
    writeDb(db);

    const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: newUser });
  });

  // 2. Authentication: Login
  app.post('/api/auth/login', (req: Request, res: Response): void => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both email and password.' });
      return;
    }

    const emailNorm = email.toLowerCase().trim();
    const db = readDb();
    
    const userInDb = db.users.find(u => u.email.toLowerCase() === emailNorm);
    if (!userInDb) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordCorrect = bcrypt.compareSync(password, userInDb.passwordHash);
    if (!passwordCorrect) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const sanitizedUser: User = {
      id: userInDb.id,
      name: userInDb.name,
      email: userInDb.email,
      role: userInDb.role,
    };

    const token = jwt.sign(sanitizedUser, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: sanitizedUser });
  });

  // Get current user check
  app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // 3. Doctors: Search and Retrieve List
  app.get('/api/doctors', (req: Request, res: Response) => {
    const db = readDb();
    let filtered = [...db.doctors];
    
    // Get search/filter params
    const qSearch = req.query.searchTerm ? String(req.query.searchTerm).toLowerCase().trim() : '';
    const qSpecialization = req.query.specialization ? String(req.query.specialization) : '';
    const qMinFee = req.query.minFee ? Number(req.query.minFee) : 0;
    const qMaxFee = req.query.maxFee ? Number(req.query.maxFee) : Infinity;
    const qAvailableDate = req.query.availableDate ? String(req.query.availableDate) : ''; // YYYY-MM-DD
    const qIncludeInactive = req.query.includeInactive === 'true';

    // 1. Filter active only by default (except for admin requests with includeInactive=true)
    if (!qIncludeInactive) {
      filtered = filtered.filter(doc => doc.isActive);
    }

    // 2. Filter by search text (doctor name or specialization mismatch fallback)
    if (qSearch) {
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(qSearch) || 
        doc.specialization.toLowerCase().includes(qSearch) ||
        doc.qualification.toLowerCase().includes(qSearch)
      );
    }

    // 3. Filter by precise high-level specialization category
    if (qSpecialization) {
      filtered = filtered.filter(doc => doc.specialization === qSpecialization);
    }

    // 4. Filter by consultation fee range
    if (qMinFee > 0 || qMaxFee < Infinity) {
      filtered = filtered.filter(doc => doc.consultationFee >= qMinFee && doc.consultationFee <= qMaxFee);
    }

    // 5. Filter by selected Available Date
    // Converts YYYY-MM-DD date to named Day of the week (e.g. Wednesday)
    if (qAvailableDate) {
      try {
        const parts = qAvailableDate.split('-').map(Number);
        const dayIdx = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
        const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = DAYS[dayIdx];
        
        filtered = filtered.filter(doc => doc.availableDays.includes(targetDay));
      } catch (e) {
        console.error('Failed to parse availableDate filter:', e);
      }
    }

    res.json(filtered);
  });

  // Create Doctor Profile
  app.post('/api/doctors', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
    const { name, specialization, experience, qualification, consultationFee, availableDays, availableTimeSlots, imageUrl, isActive } = req.body;
    
    if (!name || !specialization || !qualification || !consultationFee || !availableDays || !availableTimeSlots) {
      res.status(400).json({ error: 'Missing required doctor fields.' });
      return;
    }

    const db = readDb();
    const newDoctor: Doctor = {
      id: 'doc-' + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      specialization: specialization.trim(),
      experience: Number(experience) || 0,
      qualification: qualification.trim(),
      consultationFee: Number(consultationFee) || 0,
      availableDays: Array.isArray(availableDays) ? availableDays : [],
      availableTimeSlots: Array.isArray(availableTimeSlots) ? availableTimeSlots : [],
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    };

    db.doctors.push(newDoctor);
    writeDb(db);
    res.status(201).json(newDoctor);
  });

  // Update Doctor Profile
  app.put('/api/doctors/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
    const { id } = req.params;
    const db = readDb();
    
    const index = db.doctors.findIndex(d => d.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    const { name, specialization, experience, qualification, consultationFee, availableDays, availableTimeSlots, imageUrl, isActive } = req.body;

    db.doctors[index] = {
      ...db.doctors[index],
      name: name !== undefined ? name.trim() : db.doctors[index].name,
      specialization: specialization !== undefined ? specialization.trim() : db.doctors[index].specialization,
      experience: experience !== undefined ? Number(experience) : db.doctors[index].experience,
      qualification: qualification !== undefined ? qualification.trim() : db.doctors[index].qualification,
      consultationFee: consultationFee !== undefined ? Number(consultationFee) : db.doctors[index].consultationFee,
      availableDays: Array.isArray(availableDays) ? availableDays : db.doctors[index].availableDays,
      availableTimeSlots: Array.isArray(availableTimeSlots) ? availableTimeSlots : db.doctors[index].availableTimeSlots,
      imageUrl: imageUrl !== undefined ? imageUrl : db.doctors[index].imageUrl,
      isActive: isActive !== undefined ? Boolean(isActive) : db.doctors[index].isActive,
    };

    writeDb(db);
    res.json(db.doctors[index]);
  });

  // Delete Doctor Profile
  app.delete('/api/doctors/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
    const { id } = req.params;
    const db = readDb();
    
    const initialLength = db.doctors.length;
    db.doctors = db.doctors.filter(d => d.id !== id);
    
    if (db.doctors.length === initialLength) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }

    writeDb(db);
    res.json({ message: 'Doctor deleted successfully.' });
  });

  // 4. Appointments booking & management API

  // Fetch list of appointments
  app.get('/api/appointments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const db = readDb();
    
    // Filter based on user profile
    if (req.user!.role === 'admin') {
      res.json(db.appointments);
    } else {
      // Patients see only their own appointments
      const patientApts = db.appointments.filter(apt => apt.patientId === req.user!.id);
      res.json(patientApts);
    }
  });

  // Book an appointment (Includes strict concurrency protection and double booking validation)
  app.post('/api/appointments', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
    const { doctorId, date, timeSlot } = req.body;
    
    if (!doctorId || !date || !timeSlot) {
      res.status(400).json({ error: 'Please enter doctor, date, and timeslot fields.' });
      return;
    }

    // Synchronously read current DB to ensure atomic write check in standard single-threaded Node request queue
    const db = readDb();
    
    // Check doctor existence and active status
    const doc = db.doctors.find(d => d.id === doctorId);
    if (!doc) {
      res.status(404).json({ error: 'The selected doctor was not found.' });
      return;
    }

    // Constraint: Doctor Deactivation
    if (!doc.isActive) {
      res.status(400).json({ error: `New appointments cannot be booked. Dr. ${doc.name} is currently inactive.` });
      return;
    }

    // Constraint: Past Date Booking Validation
    if (isDateTimeInPast(date, timeSlot)) {
      res.status(400).json({ error: 'You are not allowed to book past days or previous time slots.' });
      return;
    }

    // Verify day selection matching doctor's schedule day
    try {
      const parts = date.split('-').map(Number);
      const dayIdx = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDay = DAYS[dayIdx];
      if (!doc.availableDays.includes(targetDay)) {
        res.status(400).json({ error: `Dr. ${doc.name} is not available on ${targetDay}s (${date}).` });
        return;
      }
    } catch(err) {
      res.status(400).json({ error: 'Invalid booking date format.' });
      return;
    }

    // Constraint: Double-Booking Prevention & Concurrency Check
    const doubleBooked = db.appointments.find(apt => 
      apt.doctorId === doctorId && 
      apt.date === date && 
      apt.timeSlot === timeSlot && 
      apt.status !== 'Cancelled'
    );

    if (doubleBooked) {
      res.status(409).json({ error: 'This time slot is already booked. Please choose another time or medical professional.' });
      return;
    }

    // Book as Confirmed (patients book straight into Confirmed, or Pending based on administrative flow - let's make it Confirmed to immediately fulfill, but allow admins to re-approve/cancel in the flow. Wait! Let's start as "Confirmed" or "Pending". The user spec says "Statuses: Pending, Confirmed, Cancelled, Completed. Admin should be able to: View, Approve, Cancel, Complete".
    // Let's create appointments with a default starting status of 'Confirmed', or if we want admins to explicitly handle approval, we can start them as 'Pending'. To showcase the full power of "Approve appointments", let's default to 'Pending' so the Admin can experience the workflow. In fact, we can support both! If a user books, they show as 'Pending' in both panels, and Admin clicks 'Confirm' to approve it! This fits perfectly.)
    const newApt: Appointment = {
      id: 'apt-' + Math.random().toString(36).substr(2, 9),
      patientId: req.user!.id,
      patientName: req.user!.name,
      patientEmail: req.user!.email,
      doctorId: doc.id,
      doctorName: doc.name,
      doctorSpecialization: doc.specialization,
      date,
      timeSlot,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    db.appointments.push(newApt);
    writeDb(db);
    
    // Simulate Email notification trigger (Bonus Feature)
    console.log(`[EMAIL DISPATCH SUCCESS] Notifying patient ${req.user!.email} and Clinic about appointment ${newApt.id} on ${date} at ${timeSlot}.`);
    
    res.status(201).json(newApt);
  });

  // Patch appointment status (Cancel, Approve/Confirm, Complete)
  app.patch('/api/appointments/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
    const { id } = req.params;
    const { status } = req.body; // 'Confirmed' | 'Cancelled' | 'Completed'
    
    if (!status || !['Confirmed', 'Cancelled', 'Completed'].includes(status)) {
      res.status(400).json({ error: 'Invalid appointment status value.' });
      return;
    }

    const db = readDb();
    const aptIndex = db.appointments.findIndex(apt => apt.id === id);
    
    if (aptIndex === -1) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }

    const targetApt = db.appointments[aptIndex];
    const isUserAdmin = req.user!.role === 'admin';
    const isUserOwner = targetApt.patientId === req.user!.id;

    // Permissions check
    if (!isUserAdmin && !isUserOwner) {
      res.status(403).json({ error: 'Unauthorized to modify this booking.' });
      return;
    }

    // Constraint: Cancellation Rules
    if (status === 'Cancelled') {
      if (targetApt.status === 'Completed') {
        res.status(400).json({ error: 'Cannot cancel a completed appointment.' });
        return;
      }
      
      // Patient can cancel their own if Pending or Confirmed
      if (!isUserAdmin && !['Pending', 'Confirmed'].includes(targetApt.status)) {
        res.status(400).json({ error: 'Only pending or confirmed appointments can be cancelled.' });
        return;
      }
    }

    // Additional status locks (Completed can only be set by Admin)
    if (status === 'Completed' && !isUserAdmin) {
      res.status(403).json({ error: 'Only administrator coordinates can complete appointments.' });
      return;
    }

    // Apply change
    db.appointments[aptIndex].status = status;
    writeDb(db);

    console.log(`[EMAIL DISPATCH SUCCESS] Status update for appointment ${targetApt.id} changed to ${status}. Email alert sent to ${targetApt.patientEmail}.`);

    res.json(db.appointments[aptIndex]);
  });

  // 5. Admin portal dashboard statistics
  app.get('/api/admin/stats', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const db = readDb();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const totalDoctors = db.doctors.length;
    
    // Count unique patients
    const patientIds = new Set(db.users.filter(u => u.role === 'patient').map(u => u.id));
    const totalPatients = patientIds.size;

    // Filter appointments
    const todayAppointmentsCount = db.appointments.filter(apt => apt.date === todayStr).length;
    
    const upcomingAppointmentsCount = db.appointments.filter(apt => {
      // Upcoming are active YYYY-MM-DD counts which is current or in the future
      return apt.date >= todayStr && (apt.status === 'Pending' || apt.status === 'Confirmed');
    }).length;

    const completedAppointmentsCount = db.appointments.filter(apt => apt.status === 'Completed').length;

    const stats: DashboardStats = {
      totalDoctors,
      totalPatients,
      todayAppointmentsCount,
      upcomingAppointmentsCount,
      completedAppointmentsCount,
    };

    res.json(stats);
  });

  // Setup Vite development server or production direct client server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite routing and assets running in Dev Mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production-ready React client from dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express medical backend actively listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Fatal failure launching server:', error);
});
