import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';
import { ref } from 'vue';
import { db, firebaseConfig } from './firebase';
import { Activity, UserAccount, ActionPlanFolder, StudentOrganization } from '../types';
import { 
  INITIAL_ACTIVITIES, 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_ACTION_PLAN_FOLDERS, 
  ORGANIZATIONS,
  DEFAULT_WORKFLOW_TIMELINE
} from '../data/initialData';

export type DbStatus = 'connecting' | 'connected' | 'syncing' | 'error' | 'offline';

export const dbStatus = ref<DbStatus>('connecting');
export const dbErrorMessage = ref<string>('');
export const lastSyncTime = ref<Date | null>(null);

// Strip undefined recursively to ensure Firestore document safety
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return data;
  }
  return JSON.parse(JSON.stringify(data));
}

// Collection references
const ACTIVITIES_COLLECTION = 'activities';
const USERS_COLLECTION = 'user_accounts';
const FOLDERS_COLLECTION = 'action_plan_folders';
const ORGANIZATIONS_COLLECTION = 'organizations';

/**
 * Initialize and seed initial data if Firestore collections are empty.
 */
export async function initializeDatabaseCollections(): Promise<void> {
  try {
    dbStatus.value = 'syncing';

    // 1. Check activities
    const actSnap = await getDocs(collection(db, ACTIVITIES_COLLECTION));
    if (actSnap.empty) {
      console.log('Seeding initial activities into Firestore...');
      const batch = writeBatch(db);
      for (const act of INITIAL_ACTIVITIES) {
        const docRef = doc(db, ACTIVITIES_COLLECTION, act.id);
        batch.set(docRef, sanitizeForFirestore(act));
      }
      await batch.commit();
    }

    // 2. Check user accounts
    const userSnap = await getDocs(collection(db, USERS_COLLECTION));
    const existingUserIds = new Set<string>();
    userSnap.forEach((docSnap) => existingUserIds.add(docSnap.id));

    const missingUsers = INITIAL_USER_ACCOUNTS.filter((u) => !existingUserIds.has(u.id));
    if (userSnap.empty || missingUsers.length > 0) {
      console.log(`Seeding/syncing user accounts (${missingUsers.length} missing) into Firestore...`);
      const batch = writeBatch(db);
      for (const user of (userSnap.empty ? INITIAL_USER_ACCOUNTS : missingUsers)) {
        const docRef = doc(db, USERS_COLLECTION, user.id);
        batch.set(docRef, sanitizeForFirestore(user), { merge: true });
      }
      // Always guarantee OSD officer accounts exist with latest data
      for (const osdAcc of INITIAL_USER_ACCOUNTS.filter(u => u.role === 'ROLE_OSD' || u.orgId === 'OSD')) {
        batch.set(doc(db, USERS_COLLECTION, osdAcc.id), sanitizeForFirestore(osdAcc), { merge: true });
      }
      await batch.commit();
    }

    // 3. Check action plan folders
    const folderSnap = await getDocs(collection(db, FOLDERS_COLLECTION));
    if (folderSnap.empty) {
      console.log('Seeding initial action plan folders into Firestore...');
      const batch = writeBatch(db);
      for (const folder of INITIAL_ACTION_PLAN_FOLDERS) {
        const docRef = doc(db, FOLDERS_COLLECTION, folder.id);
        batch.set(docRef, sanitizeForFirestore(folder));
      }
      await batch.commit();
    }

    // 4. Check organizations
    const orgSnap = await getDocs(collection(db, ORGANIZATIONS_COLLECTION));
    if (orgSnap.empty) {
      console.log('Seeding initial organizations into Firestore...');
      const batch = writeBatch(db);
      for (const org of ORGANIZATIONS) {
        const docRef = doc(db, ORGANIZATIONS_COLLECTION, org.id);
        batch.set(docRef, sanitizeForFirestore(org));
      }
      await batch.commit();
    }

    dbStatus.value = 'connected';
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error('Failed to initialize or seed database collections:', err);
    dbStatus.value = 'error';
    dbErrorMessage.value = err instanceof Error ? err.message : String(err);
  }
}

/**
 * Real-time subscription to Activities collection
 */
export function subscribeToActivities(
  onData: (activities: Activity[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = collection(db, ACTIVITIES_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Activity[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Activity);
      });
      dbStatus.value = 'connected';
      lastSyncTime.value = new Date();
      onData(list);
    },
    (err) => {
      console.error('Error in activities subscription:', err);
      dbStatus.value = 'error';
      dbErrorMessage.value = err.message;
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to User Accounts collection
 */
export function subscribeToUserAccounts(
  onData: (users: UserAccount[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = collection(db, USERS_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserAccount[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as UserAccount);
      });
      dbStatus.value = 'connected';
      lastSyncTime.value = new Date();
      onData(list);
    },
    (err) => {
      console.error('Error in user accounts subscription:', err);
      dbStatus.value = 'error';
      dbErrorMessage.value = err.message;
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to Action Plan Folders collection
 */
export function subscribeToActionPlanFolders(
  onData: (folders: ActionPlanFolder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = collection(db, FOLDERS_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ActionPlanFolder[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ActionPlanFolder);
      });
      dbStatus.value = 'connected';
      lastSyncTime.value = new Date();
      onData(list);
    },
    (err) => {
      console.error('Error in action plan folders subscription:', err);
      dbStatus.value = 'error';
      dbErrorMessage.value = err.message;
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to Organizations collection
 */
export function subscribeToOrganizations(
  onData: (orgs: StudentOrganization[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = collection(db, ORGANIZATIONS_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StudentOrganization[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentOrganization);
      });
      dbStatus.value = 'connected';
      lastSyncTime.value = new Date();
      onData(list);
    },
    (err) => {
      console.error('Error in organizations subscription:', err);
      dbStatus.value = 'error';
      dbErrorMessage.value = err.message;
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update an Activity in Firestore
 */
export async function saveActivityToDb(activity: Activity): Promise<void> {
  try {
    const docRef = doc(db, ACTIVITIES_COLLECTION, activity.id);
    await setDoc(docRef, sanitizeForFirestore(activity), { merge: true });
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error(`Error saving activity ${activity.id} to Firestore:`, err);
    throw err;
  }
}

/**
 * Delete an Activity from Firestore
 */
export async function deleteActivityFromDb(activityId: string): Promise<void> {
  try {
    const docRef = doc(db, ACTIVITIES_COLLECTION, activityId);
    await deleteDoc(docRef);
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error(`Error deleting activity ${activityId} from Firestore:`, err);
    throw err;
  }
}

/**
 * Save multiple activities in batch (e.g., from Excel import)
 */
export async function batchSaveActivitiesToDb(activities: Activity[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const act of activities) {
      const docRef = doc(db, ACTIVITIES_COLLECTION, act.id);
      batch.set(docRef, sanitizeForFirestore(act), { merge: true });
    }
    await batch.commit();
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error('Error batch saving activities to Firestore:', err);
    throw err;
  }
}

/**
 * Save or update a User Account in Firestore
 */
export async function saveUserAccountToDb(account: UserAccount): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, account.id);
    await setDoc(docRef, sanitizeForFirestore(account), { merge: true });
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error(`Error saving user account ${account.id} to Firestore:`, err);
    throw err;
  }
}

/**
 * Save or update an Action Plan Folder in Firestore
 */
export async function saveActionPlanFolderToDb(folder: ActionPlanFolder): Promise<void> {
  try {
    const docRef = doc(db, FOLDERS_COLLECTION, folder.id);
    await setDoc(docRef, sanitizeForFirestore(folder), { merge: true });
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error(`Error saving action plan folder ${folder.id} to Firestore:`, err);
    throw err;
  }
}

/**
 * Save or update a Student Organization in Firestore
 */
export async function saveOrganizationToDb(org: StudentOrganization): Promise<void> {
  try {
    const docRef = doc(db, ORGANIZATIONS_COLLECTION, org.id);
    await setDoc(docRef, sanitizeForFirestore(org), { merge: true });
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error(`Error saving organization ${org.id} to Firestore:`, err);
    throw err;
  }
}

/**
 * Reset and reseed database back to defaults (for administrative convenience)
 */
export async function resetDatabaseToDefaults(): Promise<void> {
  try {
    dbStatus.value = 'syncing';
    
    // Reseed activities
    const actBatch = writeBatch(db);
    for (const act of INITIAL_ACTIVITIES) {
      actBatch.set(doc(db, ACTIVITIES_COLLECTION, act.id), sanitizeForFirestore(act));
    }
    await actBatch.commit();

    // Reseed user accounts
    const userBatch = writeBatch(db);
    for (const user of INITIAL_USER_ACCOUNTS) {
      userBatch.set(doc(db, USERS_COLLECTION, user.id), sanitizeForFirestore(user));
    }
    await userBatch.commit();

    // Reseed folders
    const folderBatch = writeBatch(db);
    for (const folder of INITIAL_ACTION_PLAN_FOLDERS) {
      folderBatch.set(doc(db, FOLDERS_COLLECTION, folder.id), sanitizeForFirestore(folder));
    }
    await folderBatch.commit();

    // Reseed orgs
    const orgBatch = writeBatch(db);
    for (const org of ORGANIZATIONS) {
      orgBatch.set(doc(db, ORGANIZATIONS_COLLECTION, org.id), sanitizeForFirestore(org));
    }
    await orgBatch.commit();

    dbStatus.value = 'connected';
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error('Error resetting database:', err);
    dbStatus.value = 'error';
    throw err;
  }
}

/**
 * Explicitly reset all activities to Stage 1 and user accounts to the required CBIT & SSC workflow accounts
 */
export async function resetAllActivitiesToStageOne(): Promise<void> {
  try {
    dbStatus.value = 'syncing';
    
    // Reseed activities with Stage 1 status and clean timeline
    const actBatch = writeBatch(db);
    for (const act of INITIAL_ACTIVITIES) {
      const resetAct: Activity = {
        ...act,
        status: 'Pending',
        approvalStage: 'Stage 1: Proposal & Activity Design',
        timeline: JSON.parse(JSON.stringify(DEFAULT_WORKFLOW_TIMELINE))
      };
      delete resetAct.accomplishmentForm;
      actBatch.set(doc(db, ACTIVITIES_COLLECTION, act.id), sanitizeForFirestore(resetAct));
    }
    await actBatch.commit();

    // Reseed user accounts to the required accounts
    const userBatch = writeBatch(db);
    for (const user of INITIAL_USER_ACCOUNTS) {
      userBatch.set(doc(db, USERS_COLLECTION, user.id), sanitizeForFirestore(user));
    }
    await userBatch.commit();

    // Reseed action plan folders
    const folderBatch = writeBatch(db);
    for (const folder of INITIAL_ACTION_PLAN_FOLDERS) {
      folderBatch.set(doc(db, FOLDERS_COLLECTION, folder.id), sanitizeForFirestore(folder));
    }
    await folderBatch.commit();

    dbStatus.value = 'connected';
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.error('Error resetting all activities to Stage 1:', err);
    dbStatus.value = 'error';
    throw err;
  }
}

export function getDatabaseMetadata() {
  return {
    projectId: firebaseConfig.projectId,
    databaseId: (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)',
    status: dbStatus.value
  };
}

/**
 * Explicit helper to ensure OSD accounts exist in Firestore immediately
 */
export async function ensureOsdAccountsInDb(): Promise<UserAccount[]> {
  const osdAccounts = INITIAL_USER_ACCOUNTS.filter(u => u.role === 'ROLE_OSD' || u.orgId === 'OSD');
  try {
    const batch = writeBatch(db);
    for (const acc of osdAccounts) {
      const docRef = doc(db, USERS_COLLECTION, acc.id);
      batch.set(docRef, sanitizeForFirestore(acc), { merge: true });
    }
    await batch.commit();
    lastSyncTime.value = new Date();
  } catch (err: unknown) {
    console.warn('Error saving OSD accounts to Firestore:', err);
  }
  return osdAccounts;
}

