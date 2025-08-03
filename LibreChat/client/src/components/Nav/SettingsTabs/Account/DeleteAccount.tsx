import { LockIcon, Trash, AlertTriangle } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import {
  Input,
  Button,
  Spinner,
  OGDialog,
  OGDialogContent,
  OGDialogTrigger,
  OGDialogHeader,
  OGDialogTitle,
} from '~/components';
import { useDeleteUserMutation } from '~/data-provider';
import { authClient } from '~/config/betterAuth';
import { cn } from '~/utils';

const DeleteAccount = ({ disabled = false }: { title?: string; disabled?: boolean }) => {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  
  const { mutate: deleteUser, isLoading: isDeleting } = useDeleteUserMutation({
    onMutate: async () => {
      // Sign out with Better Auth
      try {
        await authClient.signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    },
  });

  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState(true);

  const handleDeleteUser = () => {
    if (!isLocked) {
      deleteUser(undefined);
    }
  };

  const handleInputChange = useCallback(
    (newEmailInput: string) => {
      const isEmailCorrect =
        newEmailInput.trim().toLowerCase() === user?.email?.trim().toLowerCase();
      setIsLocked(!isEmailCorrect);
    },
    [user?.email],
  );

  return (
    <>
      <OGDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Delete Account</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action cannot be undone
            </p>
          </div>
          <OGDialogTrigger asChild>
            <Button
              variant="destructive"
              className="flex items-center justify-center rounded-lg transition-colors duration-200"
              onClick={() => setDialogOpen(true)}
              disabled={disabled}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </OGDialogTrigger>
        </div>
        <OGDialogContent className="w-11/12 max-w-md">
          <OGDialogHeader>
            <OGDialogTitle className="flex items-center text-lg font-medium leading-6">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
              Delete Account
            </OGDialogTitle>
          </OGDialogHeader>
          <div className="mb-8 text-sm text-gray-900 dark:text-white">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <ul className="space-y-2 text-sm text-red-700 dark:text-red-300">
                <li>• This will permanently delete your account</li>
                <li>• All your conversations and data will be lost</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>
          </div>
          <div className="flex-col items-center justify-center">
            <div className="mb-4">
              {renderInput(
                'Type your email to confirm',
                'email-confirm-input',
                user?.email ?? '',
                (e) => handleInputChange(e.target.value),
              )}
            </div>
            {renderDeleteButton(handleDeleteUser, isDeleting, isLocked)}
          </div>
        </OGDialogContent>
      </OGDialog>
    </>
  );
};

const renderInput = (
  label: string,
  id: string,
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
) => (
  <div className="mb-4">
    <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-white" htmlFor={id}>
      {label}
    </label>
    <Input id={id} onChange={onChange} placeholder={value} />
  </div>
);

const renderDeleteButton = (
  handleDeleteUser: () => void,
  isDeleting: boolean,
  isLocked: boolean,
) => (
  <button
    className={cn(
      'mt-4 flex w-full items-center justify-center rounded-lg px-4 py-2 transition-all duration-200',
      isLocked 
        ? 'cursor-not-allowed opacity-50 bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500' 
        : 'bg-red-600 text-white hover:bg-red-700',
    )}
    onClick={handleDeleteUser}
    disabled={isDeleting || isLocked}
  >
    {isDeleting ? (
      <div className="flex h-6 justify-center">
        <Spinner className="h-4 w-4" />
      </div>
    ) : (
      <>
        {isLocked ? (
          <>
            <LockIcon className="mr-2 h-5 w-5" />
            <span>Locked</span>
          </>
        ) : (
          <>
            <Trash className="mr-2 h-5 w-5" />
            <span>Delete Account</span>
          </>
        )}
      </>
    )}
  </button>
);

export default DeleteAccount;
