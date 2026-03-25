import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './config';
import { isDualFirestoreDataModel } from './firestoreDataModel';

export const USERS_COLLECTION = 'users';

export const getTopLevelCollectionRef = (
  collectionName: string
): CollectionReference<DocumentData> => collection(db, collectionName);

export const getTopLevelDocumentRef = (
  collectionName: string,
  docId: string
): DocumentReference<DocumentData> => doc(db, collectionName, docId);

export const getUserDocumentRef = (
  userId: string
): DocumentReference<DocumentData> => doc(db, USERS_COLLECTION, userId);

export const getUserSubcollectionRef = (
  userId: string,
  collectionName: string
): CollectionReference<DocumentData> =>
  collection(db, USERS_COLLECTION, userId, collectionName);

export const getUserSubcollectionDocumentRef = (
  userId: string,
  collectionName: string,
  docId: string
): DocumentReference<DocumentData> =>
  doc(db, USERS_COLLECTION, userId, collectionName, docId);

export const getUserScopedCollectionRefs = (
  collectionName: string,
  userId: string
) => {
  const primary = getUserSubcollectionRef(userId, collectionName);
  if (!isDualFirestoreDataModel()) {
    return { primary };
  }

  return {
    primary,
    secondary: getTopLevelCollectionRef(collectionName),
  };
};

export const getUserScopedDocumentRefs = (
  collectionName: string,
  userId: string,
  docId: string
) => {
  const primary = getUserSubcollectionDocumentRef(userId, collectionName, docId);
  if (!isDualFirestoreDataModel()) {
    return { primary };
  }

  return {
    primary,
    secondary: getTopLevelDocumentRef(collectionName, docId),
  };
};

export const mergeDocumentsById = <T extends { id: string }>(
  primaryDocuments: T[],
  secondaryDocuments: T[]
): T[] => {
  const merged = new Map<string, T>();

  for (const secondaryDocument of secondaryDocuments) {
    merged.set(secondaryDocument.id, secondaryDocument);
  }

  for (const primaryDocument of primaryDocuments) {
    merged.set(primaryDocument.id, primaryDocument);
  }

  return Array.from(merged.values());
};
