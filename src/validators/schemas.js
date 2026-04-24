import { z } from 'zod';

export const registerSchema = z.object({
  organizationName: z.string().min(2).max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().min(4).max(50).optional(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const busSchema = z.object({
  name: z.string().min(1).max(100),
  plateNumber: z.string().min(1).max(50),
  capacity: z.number().int().min(1).max(200),
});

export const routeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
});

export const stopSchema = z.object({
  name: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  stopOrder: z.number().int().min(0),
  plannedTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
});

export const tripSchema = z.object({
  routeId: z.string().uuid(),
  assignmentId: z.string().uuid().optional(),
});

export const gpsSchema = z.object({
  busId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(300).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).optional(),
  batteryLevel: z.number().int().min(0).max(100).optional(),
});

export const checkinSchema = z.object({
  tripId: z.string().uuid(),
  childId: z.string().uuid(),
  status: z.enum(['boarded', 'left', 'absent']),
  method: z.enum(['manual', 'qr', 'nfc']).default('manual'),
});

export const sosSchema = z.object({
  tripId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const eventSchema = z.object({
  sessionId: z.string().uuid().optional(),
  eventType: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.any()).optional(),
});
