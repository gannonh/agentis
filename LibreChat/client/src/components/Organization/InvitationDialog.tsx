/**
 * @fileoverview Invitation dialog for inviting members to organization
 * @module components/Organization/InvitationDialog
 */

import React, { useState } from 'react';
import { UserPlus, Mail } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { OGDialog, OGDialogTrigger } from '~/components';
import OGDialogTemplate from '~/components/ui/OGDialogTemplate';
import { useOrganization } from '~/Providers/OrganizationProvider';
import type { UserRole } from '~/config/betterAuth';

interface InvitationDialogProps {
  trigger?: React.ReactNode;
  onInviteSent?: (email: string) => void;
}

/**
 * Dialog component for inviting members to organization
 */
export const InvitationDialog: React.FC<InvitationDialogProps> = ({
  trigger,
  onInviteSent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { inviteMember } = useOrganization();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await inviteMember(email.trim(), role);
      setSuccessMessage(`Invitation sent to ${email}`);
      onInviteSent?.(email);
      
      // Clear form after successful invite
      setTimeout(() => {
        setEmail('');
        setRole('member');
        setSuccessMessage('');
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      // In a real implementation, we'd show an error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEmail('');
    setRole('member');
    setSuccessMessage('');
  };

  const defaultTrigger = (
    <Button className="bg-blue-600 text-white hover:bg-blue-700">
      <UserPlus className="mr-2 h-4 w-4" />
      Invite Member
    </Button>
  );

  return (
    <OGDialog open={isOpen} onOpenChange={setIsOpen}>
      <OGDialogTrigger asChild>
        {trigger || defaultTrigger}
      </OGDialogTrigger>
      <OGDialogTemplate
        title="Invite Member"
        description="Send an invitation to join your organization"
        showCancelButton={true}
        cancelButtonText="Cancel"
        confirmButtonText={isLoading ? 'Sending...' : 'Send Invitation'}
        onConfirm={handleSubmit}
        onCancel={handleClose}
        confirmButtonProps={{
          disabled: !email.trim() || isLoading,
          'data-testid': 'send-invitation-button',
        }}
        cancelButtonProps={{
          'data-testid': 'cancel-invitation-dialog-button',
        }}
        main={
          <div data-testid="invite-member-dialog">
            {successMessage && (
              <div 
                className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300"
                data-testid="invitation-success"
              >
                {successMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="invite-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  data-testid="invite-email-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="invite-role" className="text-sm font-medium">
                  Role
                </Label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  data-testid="invite-role-select"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Admins can manage members and organization settings
                </p>
              </div>
            </form>
          </div>
        }
      />
    </OGDialog>
  );
};