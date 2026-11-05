/**
 * Google Drive AppData Sync Service for PrzerwaPro
 * 
 * Safely saves and restores User Settings and Break History
 * to the user's private, hidden Google Drive application folder (appDataFolder).
 * Completely immune to browser cache/cookie clearing and device changes!
 */

import { getAccessToken } from './googleAuth';
import { BreakRecord, UserSettings } from '../types';

const BACKUP_FILENAME = 'przerwapro_backup.json';

export interface CloudBackupData {
  version: string;
  updatedAt: string;
  settings: Partial<UserSettings>;
  breaks: BreakRecord[];
}

/**
 * Searches for existing backup file in Google Drive's appDataFolder
 */
async function findBackupFileId(accessToken: string): Promise<string | null> {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id, name, modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Błąd wyszukiwania kopii na Dysku Google: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Saves or updates settings and breaks in the user's private Google Drive appDataFolder
 */
export async function saveBackupToGoogleDrive(
  settings: UserSettings,
  breaks: BreakRecord[]
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const existingFileId = await findBackupFileId(token);

    const payload: CloudBackupData = {
      version: '1.4.6',
      updatedAt: new Date().toISOString(),
      settings,
      breaks,
    };

    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
      parents: existingFileId ? undefined : ['appDataFolder'],
    };

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append(
      'file',
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    );

    let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFileId) {
      uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const response = await fetch(uploadUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn('Google Drive backup upload failed:', err);
      return false;
    }

    console.log('✅ Zapisano pomyślnie kopię zapasową w prywatnym folderze Dysku Google!');
    return true;
  } catch (err) {
    console.warn('Błąd zapisu na Dysk Google:', err);
    return false;
  }
}

/**
 * Downloads and restores settings and breaks from Google Drive appDataFolder
 */
export async function loadBackupFromGoogleDrive(): Promise<CloudBackupData | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const fileId = await findBackupFileId(token);
    if (!fileId) {
      console.log('Brak wcześniejszej kopii zapasowej w folderze Dysku Google.');
      return null;
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(`Błąd pobierania kopii z Dysku Google: ${res.statusText}`);
    }

    const data: CloudBackupData = await res.json();
    return data;
  } catch (err) {
    console.warn('Błąd pobierania kopii z Dysku Google:', err);
    return null;
  }
}
