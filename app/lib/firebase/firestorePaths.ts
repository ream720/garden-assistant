import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './config';

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
  return {
    primary: getUserSubcollectionRef(userId, collectionName),
  };
};

export const getUserScopedDocumentRefs = (
  collectionName: string,
  userId: string,
  docId: string
) => {
  return {
    primary: getUserSubcollectionDocumentRef(userId, collectionName, docId),
  };
};
