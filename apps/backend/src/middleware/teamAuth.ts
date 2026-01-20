import { Request, Response, NextFunction } from 'express';
import { TeamModel } from '../models/Team';

// Extend Express Request to include team role
declare global {
    namespace Express {
        interface Request {
            teamRole?: 'admin' | 'editor' | 'viewer';
            teamId?: string;
        }
    }
}

/**
 * Role hierarchy for permission checks
 */
const roleHierarchy = {
    viewer: 0,
    editor: 1,
    admin: 2
};

/**
 * Middleware to verify user has required role in team
 * Usage: requireTeamRole('editor') - requires editor or admin
 */
export function requireTeamRole(minRole: 'admin' | 'editor' | 'viewer') {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { teamId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!teamId) {
                return res.status(400).json({ error: 'Team ID required' });
            }

            // Check team membership and role
            const member = await TeamModel.getTeamMember(teamId, userId);

            if (!member) {
                return res.status(403).json({
                    error: 'Not a team member',
                    message: 'You must be a member of this team to access this resource'
                });
            }

            // Check role hierarchy
            const userRoleLevel = roleHierarchy[member.role];
            const requiredRoleLevel = roleHierarchy[minRole];

            if (userRoleLevel < requiredRoleLevel) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    message: `This action requires ${minRole} role or higher`,
                    yourRole: member.role
                });
            }

            // Attach role to request for use in controllers
            req.teamRole = member.role;
            req.teamId = teamId;
            next();
        } catch (error) {
            console.error('Team auth middleware error:', error);
            return res.status(500).json({ error: 'Team authorization failed' });
        }
    };
}

/**
 * Middleware to verify user is team owner
 */
export async function requireTeamOwner(req: Request, res: Response, next: NextFunction) {
    try {
        const { teamId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!teamId) {
            return res.status(400).json({ error: 'Team ID required' });
        }

        const isOwner = await TeamModel.isTeamOwner(teamId, userId);

        if (!isOwner) {
            return res.status(403).json({
                error: 'Owner access required',
                message: 'Only the team owner can perform this action'
            });
        }

        req.teamId = teamId;
        next();
    } catch (error) {
        console.error('Team owner middleware error:', error);
        return res.status(500).json({ error: 'Team owner verification failed' });
    }
}

/**
 * Middleware to check if user has business/enterprise tier
 */
export function requireBusinessTier(req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has business or enterprise subscription
    const allowedTiers = ['business', 'enterprise'];
    if (!user.subscription_tier || !allowedTiers.includes(user.subscription_tier)) {
        return res.status(403).json({
            error: 'Business tier required',
            message: 'This feature requires a Business or Enterprise subscription',
            upgrade_url: '/pricing'
        });
    }

    next();
}
