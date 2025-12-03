import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/design-system';
import { CreateUpdateForm } from './CreateUpdateForm';

interface CreateUpdateModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateUpdateModal: React.FC<CreateUpdateModalProps> = ({
  projectId,
  open,
  onOpenChange,
}) => {
  const handleSuccess = () => {
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='2xl'>
        <DialogHeader>
          <DialogTitle>Create Project Update</DialogTitle>
          <DialogDescription>
            Share progress, updates, and media with your team.
          </DialogDescription>
        </DialogHeader>
        <CreateUpdateForm
          projectId={projectId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
};
