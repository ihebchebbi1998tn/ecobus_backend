/**
 * User management endpoints.
 *
 * All routes require authentication. Mutating endpoints additionally require
 * an admin or school_manager role and are tenant-scoped (organization_id).
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createUserSchema,
  updateUserSchema,
  adminResetPasswordSchema,
} from '../validators/schemas.js';
import * as svc from '../services/userService.js';

const router = Router();

const listQuerySchema = z.object({
  search: z.string().min(1).max(100).optional(),
  role: z.string().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users in the caller's organization
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [admin, school_manager, driver, parent, super_admin] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 */
router.get(
  '/',
  requireAuth,
  requireRole('admin', 'school_manager', 'super_admin'),
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) =>
    res.json(await svc.listUsers(req.user.organizationId, req.query))),
);

/**
 * @openapi
 * /users/roles:
 *   get:
 *     tags: [Users]
 *     summary: List all role names in the system
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 */
router.get(
  '/roles',
  requireAuth,
  asyncHandler(async (_req, res) => res.json(await svc.listRoles())),
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by id (same organization)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       404: { description: Not found }
 */
router.get(
  '/:id',
  requireAuth,
  requireRole('admin', 'school_manager', 'super_admin'),
  validate(idParam, 'params'),
  asyncHandler(async (req, res) =>
    res.json(await svc.getUserById(req.user.organizationId, req.params.id))),
);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user in the caller's organization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateUserInput' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       409: { description: Email already registered }
 */
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'super_admin'),
  validate(createUserSchema),
  asyncHandler(async (req, res) =>
    res.status(201).json(await svc.createUser(req.user.organizationId, req.body))),
);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (profile fields and/or roles)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateUserInput' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'super_admin'),
  validate(idParam, 'params'),
  validate(updateUserSchema),
  asyncHandler(async (req, res) =>
    res.json(await svc.updateUser(req.user.organizationId, req.params.id, req.body))),
);

/**
 * @openapi
 * /users/{id}/deactivate:
 *   post:
 *     tags: [Users]
 *     summary: Deactivate a user (cannot self-deactivate)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  '/:id/deactivate',
  requireAuth,
  requireRole('admin', 'super_admin'),
  validate(idParam, 'params'),
  asyncHandler(async (req, res) =>
    res.json(await svc.deactivateUser(req.user.organizationId, req.params.id, req.user.id))),
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin', 'super_admin'),
  validate(idParam, 'params'),
  asyncHandler(async (req, res) =>
    res.json(await svc.deleteUser(req.user.organizationId, req.params.id, req.user.id))),
);

/**
 * @openapi
 * /users/{id}/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Admin-reset a user's password
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  '/:id/reset-password',
  requireAuth,
  requireRole('admin', 'super_admin'),
  validate(idParam, 'params'),
  validate(adminResetPasswordSchema),
  asyncHandler(async (req, res) =>
    res.json(await svc.adminResetPassword(req.user.organizationId, req.params.id, req.body.newPassword))),
);

export default router;
