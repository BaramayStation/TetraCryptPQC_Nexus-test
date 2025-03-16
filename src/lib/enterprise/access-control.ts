/**
 * TetraCryptPQC Enterprise Access Control
 * 
 * Implements Role-Based Access Control (RBAC) and Just-In-Time (JIT) access
 * with hardware-backed authentication and AI-powered risk assessment.
 */

import { detectHardwareSecurity, AuthResult } from '../enterprise-security';
import { detectThreats } from '../ai-security';
import { hashWithSHA3 } from '../crypto';
import { toast } from '@/components/ui/use-toast';

// Role definitions
export enum Role {
  USER = 'user',
  AUDITOR = 'auditor',
  ADMIN = 'admin',
  SECURITY_OFFICER = 'security-officer',
  COMPLIANCE_OFFICER = 'compliance-officer',
  SYSTEM_ADMIN = 'system-admin',
  EMERGENCY_ACCESS = 'emergency-access'
}

// Permission definitions
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  AUDIT = 'audit',
  APPROVE = 'approve',
  CONFIGURE = 'configure',
  MANAGE_USERS = 'manage-users',
  MANAGE_ROLES = 'manage-roles',
  MANAGE_KEYS = 'manage-keys',
  EMERGENCY_OVERRIDE = 'emergency-override'
}

// Resource types
export enum ResourceType {
  MESSAGE = 'message',
  KEY = 'key',
  USER = 'user',
  ROLE = 'role',
  AUDIT_LOG = 'audit-log',
  SYSTEM_CONFIG = 'system-config',
  COMPLIANCE_REPORT = 'compliance-report'
}

// Access request
export interface AccessRequest {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  permission: Permission;
  reason?: string;
  duration?: number; // Duration in minutes for JIT access
  emergencyAccess?: boolean;
}

// Access decision
export interface AccessDecision {
  granted: boolean;
  expiresAt?: string;
  requiresApproval?: boolean;
  requiredApprovers?: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  hardwareAuthentication?: boolean;
  reason?: string;
}

// Role assignment
export interface RoleAssignment {
  userId: string;
  role: Role;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
  restrictions?: {
    ipRanges?: string[];
    timeWindows?: string[];
    requiresHardwareAuth?: boolean;
    requiresApproval?: boolean;
  };
}

/**
 * Enterprise Access Control Manager
 */
export class EnterpriseAccessManager {
  private roleAssignments: Map<string, RoleAssignment[]> = new Map();
  private rolePermissions: Map<Role, Set<Permission>> = new Map();
  private pendingRequests: Map<string, AccessRequest> = new Map();
  private activeGrants: Map<string, AccessDecision> = new Map();
  
  constructor() {
    this.initializeRolePermissions();
  }
  
  /**
   * Initialize default role permissions
   */
  private initializeRolePermissions(): void {
    // User role permissions
    this.rolePermissions.set(Role.USER, new Set([
      Permission.READ,
      Permission.WRITE
    ]));
    
    // Auditor role permissions
    this.rolePermissions.set(Role.AUDITOR, new Set([
      Permission.READ,
      Permission.AUDIT
    ]));
    
    // Admin role permissions
    this.rolePermissions.set(Role.ADMIN, new Set([
      Permission.READ,
      Permission.WRITE,
      Permission.DELETE,
      Permission.CONFIGURE,
      Permission.MANAGE_USERS
    ]));
    
    // Security Officer role permissions
    this.rolePermissions.set(Role.SECURITY_OFFICER, new Set([
      Permission.READ,
      Permission.AUDIT,
      Permission.APPROVE,
      Permission.MANAGE_KEYS,
      Permission.EMERGENCY_OVERRIDE
    ]));
    
    // Compliance Officer role permissions
    this.rolePermissions.set(Role.COMPLIANCE_OFFICER, new Set([
      Permission.READ,
      Permission.AUDIT,
      Permission.APPROVE
    ]));
    
    // System Admin role permissions
    this.rolePermissions.set(Role.SYSTEM_ADMIN, new Set([
      Permission.READ,
      Permission.WRITE,
      Permission.DELETE,
      Permission.CONFIGURE,
      Permission.MANAGE_USERS,
      Permission.MANAGE_ROLES
    ]));
    
    // Emergency Access role permissions
    this.rolePermissions.set(Role.EMERGENCY_ACCESS, new Set([
      Permission.READ,
      Permission.WRITE,
      Permission.DELETE,
      Permission.EMERGENCY_OVERRIDE
    ]));
  }
  
  /**
   * Request access to a resource
   */
  async requestAccess(request: AccessRequest): Promise<AccessDecision> {
    console.log(`🔹 Processing access request for ${request.resourceType}:${request.resourceId}`);
    
    try {
      // Check hardware security status
      const hwSecurity = await detectHardwareSecurity();
      
      // Get user's roles
      const userRoles = this.roleAssignments.get(request.userId) || [];
      
      // Check if any role has the required permission
      const hasPermission = userRoles.some(assignment => {
        const rolePermissions = this.rolePermissions.get(assignment.role);
        return rolePermissions?.has(request.permission);
      });
      
      if (!hasPermission && !request.emergencyAccess) {
        return {
          granted: false,
          riskLevel: 'high',
          reason: 'Insufficient permissions'
        };
      }
      
      // Perform AI-powered risk assessment
      const riskAssessment = await detectThreats({
        userId: request.userId,
        action: request.permission,
        resource: request.resourceType,
        context: {
          emergencyAccess: request.emergencyAccess,
          hardwareSecurityAvailable: hwSecurity.available
        }
      });
      
      // Determine if hardware authentication is required
      const requiresHardware = riskAssessment.riskLevel === 'high' || 
                             request.resourceType === ResourceType.KEY ||
                             request.permission === Permission.EMERGENCY_OVERRIDE;
      
      if (requiresHardware && !hwSecurity.available) {
        return {
          granted: false,
          riskLevel: riskAssessment.riskLevel,
          hardwareAuthentication: true,
          reason: 'Hardware security module required but not available'
        };
      }
      
      // Handle emergency access
      if (request.emergencyAccess) {
        const emergencyDecision = await this.handleEmergencyAccess(request, riskAssessment.riskLevel);
        if (!emergencyDecision.granted) {
          return emergencyDecision;
        }
      }
      
      // Calculate expiration for JIT access
      const expiresAt = request.duration 
        ? new Date(Date.now() + request.duration * 60 * 1000).toISOString()
        : undefined;
      
      // Generate access decision
      const decision: AccessDecision = {
        granted: true,
        expiresAt,
        riskLevel: riskAssessment.riskLevel,
        hardwareAuthentication: requiresHardware,
        requiresApproval: riskAssessment.riskLevel === 'high' || request.emergencyAccess
      };
      
      // Store the grant if approved
      if (decision.granted) {
        const grantId = await hashWithSHA3(JSON.stringify(request));
        this.activeGrants.set(grantId, decision);
        
        // Set expiration timeout
        if (expiresAt) {
          setTimeout(() => {
            this.activeGrants.delete(grantId);
          }, request.duration! * 60 * 1000);
        }
      }
      
      return decision;
    } catch (error) {
      console.error('❌ Error processing access request:', error);
      return {
        granted: false,
        riskLevel: 'high',
        reason: error instanceof Error ? error.message : 'Unknown error processing access request'
      };
    }
  }
  
  /**
   * Handle emergency access requests
   */
  private async handleEmergencyAccess(
    request: AccessRequest,
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<AccessDecision> {
    // Require security officer approval for emergency access
    const securityOfficers = Array.from(this.roleAssignments.entries())
      .filter(([_, assignments]) => 
        assignments.some(a => a.role === Role.SECURITY_OFFICER))
      .map(([userId]) => userId);
    
    if (securityOfficers.length === 0) {
      return {
        granted: false,
        riskLevel,
        reason: 'No security officers available for emergency access approval'
      };
    }
    
    // Store pending request
    const requestId = await hashWithSHA3(JSON.stringify(request));
    this.pendingRequests.set(requestId, request);
    
    // Notify security officers
    toast({
      title: 'Emergency Access Request',
      description: `Emergency access requested for ${request.resourceType}:${request.resourceId}`,
      variant: 'destructive'
    });
    
    return {
      granted: false,
      riskLevel,
      requiresApproval: true,
      requiredApprovers: securityOfficers,
      reason: 'Emergency access requires security officer approval'
    };
  }
  
  /**
   * Assign a role to a user
   */
  async assignRole(
    assignment: Omit<RoleAssignment, 'assignedAt'>,
    assignedBy: string
  ): Promise<boolean> {
    try {
      // Verify assigner has permission to manage roles
      const assignerRoles = this.roleAssignments.get(assignedBy) || [];
      const canManageRoles = assignerRoles.some(a => 
        this.rolePermissions.get(a.role)?.has(Permission.MANAGE_ROLES)
      );
      
      if (!canManageRoles) {
        throw new Error('Insufficient permissions to manage roles');
      }
      
      // Create new assignment
      const newAssignment: RoleAssignment = {
        ...assignment,
        assignedBy,
        assignedAt: new Date().toISOString()
      };
      
      // Get existing assignments
      const existingAssignments = this.roleAssignments.get(assignment.userId) || [];
      
      // Add new assignment
      this.roleAssignments.set(
        assignment.userId,
        [...existingAssignments, newAssignment]
      );
      
      return true;
    } catch (error) {
      console.error('❌ Error assigning role:', error);
      return false;
    }
  }
  
  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, role: Role, removedBy: string): Promise<boolean> {
    try {
      // Verify remover has permission to manage roles
      const removerRoles = this.roleAssignments.get(removedBy) || [];
      const canManageRoles = removerRoles.some(a => 
        this.rolePermissions.get(a.role)?.has(Permission.MANAGE_ROLES)
      );
      
      if (!canManageRoles) {
        throw new Error('Insufficient permissions to manage roles');
      }
      
      // Get existing assignments
      const existingAssignments = this.roleAssignments.get(userId) || [];
      
      // Remove the role
      const updatedAssignments = existingAssignments.filter(a => a.role !== role);
      
      if (updatedAssignments.length === existingAssignments.length) {
        throw new Error('Role not found');
      }
      
      // Update assignments
      this.roleAssignments.set(userId, updatedAssignments);
      
      return true;
    } catch (error) {
      console.error('❌ Error removing role:', error);
      return false;
    }
  }
  
  /**
   * Check if a user has a specific permission
   */
  hasPermission(userId: string, permission: Permission): boolean {
    const userRoles = this.roleAssignments.get(userId) || [];
    return userRoles.some(assignment => {
      const rolePermissions = this.rolePermissions.get(assignment.role);
      return rolePermissions?.has(permission);
    });
  }
  
  /**
   * Get all roles assigned to a user
   */
  getUserRoles(userId: string): Role[] {
    const assignments = this.roleAssignments.get(userId) || [];
    return assignments.map(a => a.role);
  }
  
  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string): Permission[] {
    const userRoles = this.roleAssignments.get(userId) || [];
    const permissions = new Set<Permission>();
    
    userRoles.forEach(assignment => {
      const rolePermissions = this.rolePermissions.get(assignment.role);
      rolePermissions?.forEach(p => permissions.add(p));
    });
    
    return Array.from(permissions);
  }
}

// Create and export a default instance
export const enterpriseAccessManager = new EnterpriseAccessManager();
