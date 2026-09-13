import React from 'react';
import { GoogleAppsScriptModal } from './GoogleAppsScriptModal';
import { WardBackupPayload, GoogleSheetsRestoreResult } from '../services/googleSheetsBackupService';

interface GoogleSheetsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  wardPayload?: WardBackupPayload;
  onSyncComplete?: (url: string) => void;
  initialTab?: 'backup' | 'restore';
  onRestoreComplete?: (result: GoogleSheetsRestoreResult) => void;
}

export const GoogleSheetsBackupModal: React.FC<GoogleSheetsBackupModalProps> = ({
  isOpen,
  onClose,
}) => {
  return <GoogleAppsScriptModal isOpen={isOpen} onClose={onClose} />;
};
