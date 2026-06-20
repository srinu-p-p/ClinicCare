import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';

// Import our back-end Firebase Admin validation
import { adminAuth } from './src/lib/firebase-admin.ts';

// Load our database controller using relative ESM pattern (must include extension)
import { 
  isDateTimeInPast,
  getUserByEmail,
  createUser,
  getDoctorsList,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getAllAppointments,
  getAppointmentsByPatient,
  checkDoubleBooking,
  createAppointment,
  getAppointmentById,
  updateAppointmentStatus,
  getAdminStats
} from './server-db.ts';

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

  // Synchronous seed checking for default Admin account on startup
  try {
    const defaultAdmin = await getUserByEmail('admin@clinic.com');
    if (!defaultAdmin) {
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      await createUser({
        id: 'admin-1',
        name: 'System Admin',
        email: 'admin@clinic.com',
        role: 'admin',
        passwordHash: adminPasswordHash
      });
      console.log('Seeded default System Admin account (admin@clinic.com / admin123)');
    }
  } catch (err) {
    console.error('Error checking default admin seed:', err);
  }

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
  
  // 1. Authentication: Register (Email-Password)
  app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Please populate name, email, and password.' });
      return;
    }

    const emailNorm = email.toLowerCase().trim();
    
    try {
      // Constraint: Prevent duplicate accounts
      const existing = await getUserByEmail(emailNorm);
      if (existing) {
        res.status(400).json({ error: 'An account with this email address already exists.' });
        return;
      }

      // Hash password and save patient
      const passwordHash = bcrypt.hashSync(password, 10);
      const randomId = 'pat-' + Math.random().toString(36).substr(2, 9);
      
      const newUserInDb = await createUser({
        id: randomId,
        name: name.trim(),
        email: emailNorm,
        role: 'patient',
        passwordHash,
      });

      const sanitizedUser: User = {
        id: newUserInDb.id,
        name: newUserInDb.name,
        email: newUserInDb.email,
        role: newUserInDb.role as 'admin' | 'patient',
      };

      const token = jwt.sign(sanitizedUser, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, user: sanitizedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Authentication: Login (Email-Password)
  app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both email and password.' });
      return;
    }

    const emailNorm = email.toLowerCase().trim();
    
    try {
      const userInDb = await getUserByEmail(emailNorm);
      if (!userInDb || !userInDb.passwordHash) {
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
        role: userInDb.role as 'admin' | 'patient',
      };

      const token = jwt.sign(sanitizedUser, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: sanitizedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 1b. Authentication: Google Sign-in Verification (Firebase Auth Integration)
  app.post('/api/auth/google', async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'Google ID token is required.' });
      return;
    }
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const { uid, email, name } = decodedToken;
      
      if (!email) {
        res.status(400).json({ error: 'Email address not found in Google credentials.' });
        return;
      }

      // Check if user already exists
      let userInDb = await getUserByEmail(email);
      if (!userInDb) {
        // Register Google user straight into Postgres
        userInDb = await createUser({
          id: uid,
          name: name || email.split('@')[0],
          email: email,
          role: 'patient',
        });
      }

      const tokenUser: User = {
        id: userInDb.id,
        name: userInDb.name,
        email: userInDb.email,
        role: userInDb.role as 'admin' | 'patient',
      };

      const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: tokenUser });
    } catch (error: any) {
      console.error('Google Auth verification failed:', error);
      res.status(401).json({ error: 'Google authentication signature failed. Please login again.' });
    }
  });

  // Get current user check
  app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // 3. Doctors: Search and Retrieve List
  app.get('/api/doctors', async (req: Request, res: Response) => {
    const qSearch = req.query.searchTerm ? String(req.query.searchTerm).toLowerCase().trim() : undefined;
    const qSpecialization = req.query.specialization ? String(req.query.specialization) : undefined;
    const qMinFee = req.query.minFee ? Number(req.query.minFee) : undefined;
    const qMaxFee = req.query.maxFee ? Number(req.query.maxFee) : undefined;
    const qAvailableDate = req.query.availableDate ? String(req.query.availableDate) : undefined; // YYYY-MM-DD
    const qIncludeInactive = req.query.includeInactive === 'true';

    try {
      const list = await getDoctorsList({
        searchTerm: qSearch,
        specialization: qSpecialization,
        minFee: qMinFee,
        maxFee: qMaxFee,
        availableDate: qAvailableDate,
        includeInactive: qIncludeInactive,
      });
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create Doctor Profile
  app.post('/api/doctors', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { name, specialization, experience, qualification, consultationFee, availableDays, availableTimeSlots, imageUrl, isActive } = req.body;
    
    if (!name || !specialization || !qualification || !consultationFee || !availableDays || !availableTimeSlots) {
      res.status(400).json({ error: 'Missing required doctor fields.' });
      return;
    }

    try {
      const docId = 'doc-' + Math.random().toString(36).substr(2, 9);
      const newDoctor = await createDoctor({
        id: docId,
        name: name.trim(),
        specialization: specialization.trim(),
        experience: Number(experience) || 0,
        qualification: qualification.trim(),
        consultationFee: Number(consultationFee) || 0,
        availableDays: Array.isArray(availableDays) ? availableDays : [],
        availableTimeSlots: Array.isArray(availableTimeSlots) ? availableTimeSlots : [],
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });

      res.status(201).json(newDoctor);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Doctor Profile
  app.put('/api/doctors/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    
    try {
      const doc = await getDoctorById(id);
      if (!doc) {
        res.status(404).json({ error: 'Doctor not found.' });
        return;
      }

      const { name, specialization, experience, qualification, consultationFee, availableDays, availableTimeSlots, imageUrl, isActive } = req.body;

      const updated = await updateDoctor(id, {
        name,
        specialization,
        experience,
        qualification,
        consultationFee,
        availableDays,
        availableTimeSlots,
        imageUrl,
        isActive,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Doctor Profile
  app.delete('/api/doctors/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    
    try {
      const deleted = await deleteDoctor(id);
      if (!deleted) {
        res.status(404).json({ error: 'Doctor not found.' });
        return;
      }
      res.json({ message: 'Doctor deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fetch list of appointments
  app.get('/api/appointments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user!.role === 'admin') {
        const list = await getAllAppointments();
        res.json(list);
      } else {
        const list = await getAppointmentsByPatient(req.user!.id);
        res.json(list);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Book an appointment (Includes strict concurrency protection and double booking validation)
  app.post('/api/appointments', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { doctorId, date, timeSlot } = req.body;
    
    if (!doctorId || !date || !timeSlot) {
      res.status(400).json({ error: 'Please enter doctor, date, and timeslot fields.' });
      return;
    }

    try {
      // Check doctor existence and active status
      const doc = await getDoctorById(doctorId);
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
      const doubleBooked = await checkDoubleBooking(doctorId, date, timeSlot);
      if (doubleBooked) {
        res.status(409).json({ error: 'This time slot is already booked. Please choose another time or medical professional.' });
        return;
      }

      const newId = 'apt-' + Math.random().toString(36).substr(2, 9);
      const newApt = await createAppointment({
        id: newId,
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
      });

      console.log(`[EMAIL DISPATCH SUCCESS] Notifying patient ${req.user!.email} and Clinic about appointment ${newApt.id} on ${date} at ${timeSlot}.`);
      res.status(201).json(newApt);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Patch appointment status (Cancel, Approve/Confirm, Complete)
  app.patch('/api/appointments/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body; // 'Confirmed' | 'Cancelled' | 'Completed'
    
    if (!status || !['Confirmed', 'Cancelled', 'Completed'].includes(status)) {
      res.status(400).json({ error: 'Invalid appointment status value.' });
      return;
    }

    try {
      const targetApt = await getAppointmentById(id);
      if (!targetApt) {
        res.status(404).json({ error: 'Appointment not found.' });
        return;
      }

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

      const updated = await updateAppointmentStatus(id, status);
      console.log(`[EMAIL DISPATCH SUCCESS] Status update for appointment ${targetApt.id} changed to ${status}. Email alert sent to ${targetApt.patientEmail}.`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Admin portal dashboard statistics
  app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await getAdminStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
