import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

interface Team {
    id: string;
    name: string;
    owner_id: string;
    plan: 'business' | 'enterprise';
    created_at: Date;
    updated_at: Date;
}

interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role: 'admin' | 'editor' | 'viewer';
    joined_at: Date;
}

export class TeamModel {
    /**
     * Create a new team
     */
    static async createTeam(ownerId: string, name: string, plan: 'business' | 'enterprise' = 'business'): Promise<Team> {
        const query = `
            INSERT INTO teams (owner_id, name, plan)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [ownerId, name, plan]);

        // Automatically add owner as admin
        await this.addMember(result.rows[0].id, ownerId, 'admin');

        return result.rows[0];
    }

    /**
     * Get team by ID
     */
    static async getTeamById(teamId: string): Promise<Team | null> {
        const query = 'SELECT * FROM teams WHERE id = $1';
        const result = await pool.query(query, [teamId]);
        return result.rows[0] || null;
    }

    /**
     * Get all teams for a user
     */
    static async getTeamsByUser(userId: string): Promise<Team[]> {
        const query = `
            SELECT t.* 
            FROM teams t
            INNER JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = $1
            ORDER BY t.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * Update team details
     */
    static async updateTeam(teamId: string, updates: { name?: string; plan?: 'business' | 'enterprise' }): Promise<Team> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (updates.name) {
            fields.push(`name = $${paramCount++}`);
            values.push(updates.name);
        }

        if (updates.plan) {
            fields.push(`plan = $${paramCount++}`);
            values.push(updates.plan);
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(teamId);
        const query = `
            UPDATE teams 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Delete team
     */
    static async deleteTeam(teamId: string): Promise<void> {
        await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
    }

    /**
     * Add member to team
     */
    static async addMember(teamId: string, userId: string, role: 'admin' | 'editor' | 'viewer' = 'viewer'): Promise<TeamMember> {
        const query = `
            INSERT INTO team_members (team_id, user_id, role)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [teamId, userId, role]);
        return result.rows[0];
    }

    /**
     * Remove member from team
     */
    static async removeMember(teamId: string, userId: string): Promise<void> {
        await pool.query(
            'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
    }

    /**
     * Update member role
     */
    static async updateMemberRole(teamId: string, userId: string, newRole: 'admin' | 'editor' | 'viewer'): Promise<TeamMember> {
        const query = `
            UPDATE team_members 
            SET role = $1
            WHERE team_id = $2 AND user_id = $3
            RETURNING *
        `;

        const result = await pool.query(query, [newRole, teamId, userId]);
        return result.rows[0];
    }

    /**
     * Get team member details
     */
    static async getTeamMember(teamId: string, userId: string): Promise<TeamMember | null> {
        const query = `
            SELECT * FROM team_members 
            WHERE team_id = $1 AND user_id = $2
        `;

        const result = await pool.query(query, [teamId, userId]);
        return result.rows[0] || null;
    }

    /**
     * Get all team members
     */
    static async getTeamMembers(teamId: string): Promise<(TeamMember & { email: string; username: string })[]> {
        const query = `
            SELECT tm.*, u.email, u.username
            FROM team_members tm
            INNER JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = $1
            ORDER BY tm.role DESC, tm.joined_at ASC
        `;

        const result = await pool.query(query, [teamId]);
        return result.rows;
    }

    /**
     * Check if user is team owner
     */
    static async isTeamOwner(teamId: string, userId: string): Promise<boolean> {
        const query = 'SELECT 1 FROM teams WHERE id = $1 AND owner_id = $2';
        const result = await pool.query(query, [teamId, userId]);
        return result.rows.length > 0;
    }

    /**
     * Get team member count
     */
    static async getMemberCount(teamId: string): Promise<number> {
        const query = 'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1';
        const result = await pool.query(query, [teamId]);
        return parseInt(result.rows[0].count);
    }
}
