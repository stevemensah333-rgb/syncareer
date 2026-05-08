import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: 'signin' | 'signup';
}

export default function AuthDialog({ open, onOpenChange, defaultMode = 'signin' }: AuthDialogProps) {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (open) {
      onOpenChange(false);
      navigate(defaultMode === 'signup' ? '/sign-up' : '/sign-in');
    }
  }, [open, defaultMode, navigate, onOpenChange]);

  return null;
}
