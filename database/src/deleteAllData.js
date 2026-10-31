import {
  User,
  Profile,
  VaultDoc,
  Case,
  AuditLog,
  deleteDocuments,
  saveDocument,
} from './models/index.js';

/**
 * Cascading delete helper for "delete all my data".
 * Deletes the citizen's records across all 3 data layers:
 *   1. Profile (Layer 1)
 *   2. VaultDoc (Layer 2 - Document Vault)
 *   3. Case (Layer 3 - Applications/Cases)
 * plus the User record, and writes an anonymized AuditLog entry with zero PII.
 */
export async function deleteAllCitizenData(userId) {
  if (!userId) {
    throw new Error('userId is required to execute deleteAllCitizenData');
  }

  const deletedProfiles = await deleteDocuments(Profile, { userId });
  const deletedVaultDocs = await deleteDocuments(VaultDoc, { userId });
  const deletedCases = await deleteDocuments(Case, { userId });
  const deletedUsers = await deleteDocuments(User, { _id: userId });

  const auditEntry = await saveDocument(AuditLog, {
    actor: 'CITIZEN',
    action: 'DELETE_ALL_MY_DATA',
    caseId: null,
    userId: 'ANONYMIZED_DELETED_USER',
    timestamp: new Date(),
    maskedPayload: {
      deletedLayers: {
        profiles: deletedProfiles,
        vaultDocs: deletedVaultDocs,
        cases: deletedCases,
        users: deletedUsers,
      },
    },
  });

  return {
    deleted: true,
    counts: {
      profiles: deletedProfiles,
      vaultDocs: deletedVaultDocs,
      cases: deletedCases,
      users: deletedUsers,
    },
    auditLogId: auditEntry._id,
  };
}

