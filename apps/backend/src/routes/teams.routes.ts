import { Router, Request, Response } from 'express';
import { TeamModel } from '../models/Team';
import { authenticate } from '../middleware/auth';
import { requireTeamRole, requireTeamOwner, requireBusinessTier } from '../middleware/teamAuth';
import { body, param, validationResult } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/teams
 * Get all teams for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const teams = await TeamModel.getTeamsByUser(userId);

        res.json({ teams });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});

/**
 * POST /api/teams
 * Create a new team (requires business/enterprise tier)
 */
router.post('/',
    requireBusinessTier,
    [
        body('name').trim().notEmpty().isLength({ min: 1, max: 255 }),
        body('plan').optional().isIn(['business', 'enterprise'])
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user!.id;
            const { name, plan = 'business' } = req.body;

            const team = await TeamModel.createTeam(userId, name, plan);

            res.status(201).json({
                message: 'Team created successfully',
                team
            });
        } catch (error) {
            console.error('Create team error:', error);
            res.status(500).json({ error: 'Failed to create team' });
        }
    }
);

/**
 * GET /api/teams/:teamId
 * Get team details
 */
router.get('/:teamId',
    requireTeamRole('viewer'),
    async (req: Request, res: Response) => {
        try {
            const { teamId } = req.params;
            const team = await TeamModel.getTeamById(teamId);

            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }

            const memberCount = await TeamModel.getMemberCount(teamId);

            res.json({
                team: {
                    ...team,
                    member_count: memberCount
                }
            });
        } catch (error) {
            console.error('Get team error:', error);
            res.status(500).json({ error: 'Failed to fetch team' });
        }
    }
);

/**
 * PATCH /api/teams/:teamId
 * Update team details (owner only)
 */
router.patch('/:teamId',
    requireTeamOwner,
    [
        body('name').optional().trim().notEmpty().isLength({ min: 1, max: 255 }),
        body('plan').optional().isIn(['business', 'enterprise'])
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { teamId } = req.params;
            const updates = req.body;

            const team = await TeamModel.updateTeam(teamId, updates);

            res.json({
                message: 'Team updated successfully',
                team
            });
        } catch (error) {
            console.error('Update team error:', error);
            res.status(500).json({ error: 'Failed to update team' });
        }
    }
);

/**
 * DELETE /api/teams/:teamId
 * Delete team (owner only)
 */
router.delete('/:teamId',
    requireTeamOwner,
    async (req: Request, res: Response) => {
        try {
            const { teamId } = req.params;

            await TeamModel.deleteTeam(teamId);

            res.json({ message: 'Team deleted successfully' });
        } catch (error) {
            console.error('Delete team error:', error);
            res.status(500).json({ error: 'Failed to delete team' });
        }
    }
);

/**
 * GET /api/teams/:teamId/members
 * Get all team members
 */
router.get('/:teamId/members',
    requireTeamRole('viewer'),
    async (req: Request, res: Response) => {
        try {
            const { teamId } = req.params;
            const members = await TeamModel.getTeamMembers(teamId);

            res.json({ members });
        } catch (error) {
            console.error('Get team members error:', error);
            res.status(500).json({ error: 'Failed to fetch team members' });
        }
    }
);

/**
 * POST /api/teams/:teamId/members
 * Add member to team (admin only)
 */
router.post('/:teamId/members',
    requireTeamRole('admin'),
    [
        body('userId').isUUID(),
        body('role').isIn(['admin', 'editor', 'viewer'])
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { teamId } = req.params;
            const { userId, role } = req.body;

            // Check if user is already a member
            const existingMember = await TeamModel.getTeamMember(teamId, userId);
            if (existingMember) {
                return res.status(409).json({ error: 'User is already a team member' });
            }

            const member = await TeamModel.addMember(teamId, userId, role);

            res.status(201).json({
                message: 'Member added successfully',
                member
            });
        } catch (error) {
            console.error('Add team member error:', error);
            res.status(500).json({ error: 'Failed to add team member' });
        }
    }
);

/**
 * PATCH /api/teams/:teamId/members/:userId
 * Update member role (admin only)
 */
router.patch('/:teamId/members/:userId',
    requireTeamRole('admin'),
    [
        body('role').isIn(['admin', 'editor', 'viewer'])
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { teamId, userId } = req.params;
            const { role } = req.body;

            // Prevent owner from changing their own role
            const isOwner = await TeamModel.isTeamOwner(teamId, userId);
            if (isOwner) {
                return res.status(403).json({
                    error: 'Cannot change owner role',
                    message: 'The team owner\'s role cannot be changed'
                });
            }

            const member = await TeamModel.updateMemberRole(teamId, userId, role);

            res.json({
                message: 'Member role updated successfully',
                member
            });
        } catch (error) {
            console.error('Update member role error:', error);
            res.status(500).json({ error: 'Failed to update member role' });
        }
    }
);

/**
 * DELETE /api/teams/:teamId/members/:userId
 * Remove member from team (admin only)
 */
router.delete('/:teamId/members/:userId',
    requireTeamRole('admin'),
    async (req: Request, res: Response) => {
        try {
            const { teamId, userId } = req.params;

            // Prevent owner from being removed
            const isOwner = await TeamModel.isTeamOwner(teamId, userId);
            if (isOwner) {
                return res.status(403).json({
                    error: 'Cannot remove owner',
                    message: 'The team owner cannot be removed. Delete the team instead.'
                });
            }

            await TeamModel.removeMember(teamId, userId);

            res.json({ message: 'Member removed successfully' });
        } catch (error) {
            console.error('Remove team member error:', error);
            res.status(500).json({ error: 'Failed to remove team member' });
        }
    }
);

export default router;
