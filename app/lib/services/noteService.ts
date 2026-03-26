import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';
import {
  getUserScopedCollectionRefs,
  getUserScopedDocumentRefs,
} from '../firebase/firestorePaths';
import type { CreateNoteData, Note, NoteFilters, UpdateNoteData } from '../types/note';

export class NoteService {
  private collectionName = 'notes';

  private toDate(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
      return (value as { toDate: () => Date }).toDate();
    }

    return new Date(value as string | number | Date);
  }

  private mapNote(id: string, data: DocumentData, fallbackUserId: string): Note {
    return {
      id,
      ...data,
      userId:
        typeof data.userId === 'string' && data.userId.length > 0
          ? data.userId
          : fallbackUserId,
      timestamp: this.toDate(data.timestamp),
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    } as Note;
  }

  private sortByTimestamp(notes: Note[]): Note[] {
    return [...notes].sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
  }

  private applyClientFilters(notes: Note[], filters?: NoteFilters): Note[] {
    let filtered = [...notes];

    if (filters?.plantId) {
      filtered = filtered.filter((note) => note.plantId === filters.plantId);
    }

    if (filters?.spaceId) {
      filtered = filtered.filter((note) => note.spaceId === filters.spaceId);
    }

    if (filters?.category) {
      filtered = filtered.filter((note) => note.category === filters.category);
    }

    if (filters?.startDate) {
      filtered = filtered.filter((note) => note.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter((note) => note.timestamp <= filters.endDate!);
    }

    if (filters?.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((note) => note.content.toLowerCase().includes(searchTerm));
    }

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  private buildSubscribeConstraints(filters?: NoteFilters): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];

    if (filters?.plantId) {
      constraints.push(where('plantId', '==', filters.plantId));
    }

    if (filters?.spaceId) {
      constraints.push(where('spaceId', '==', filters.spaceId));
    }

    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }

    constraints.push(orderBy('timestamp', 'desc'));

    return constraints;
  }

  async create(data: CreateNoteData, userId: string): Promise<Note> {
    if (!userId) {
      throw new Error('User ID is required to create a note');
    }

    try {
      // Upload photos first if any
      const photoUrls: string[] = [];
      if (data.photos && data.photos.length > 0) {
        for (const photo of data.photos) {
          const photoUrl = await this.uploadPhoto(photo, userId);
          photoUrls.push(photoUrl);
        }
      }

      const noteData = {
        plantId: data.plantId || null,
        spaceId: data.spaceId || null,
        content: data.content,
        category: data.category,
        photos: photoUrls,
        timestamp: data.timestamp ? Timestamp.fromDate(data.timestamp) : Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const { primary } = getUserScopedCollectionRefs(this.collectionName, userId);
      const primaryDocRef = doc(primary);

      await setDoc(primaryDocRef, noteData);

      return this.mapNote(primaryDocRef.id, noteData, userId);
    } catch (error) {
      console.error('Error creating note:', error);
      throw new Error('Failed to create note');
    }
  }

  async getById(id: string, userId: string): Promise<Note | null> {
    if (!userId) {
      throw new Error('User ID is required to fetch a note');
    }

    try {
      const { primary } = getUserScopedDocumentRefs(this.collectionName, userId, id);
      const primarySnapshot = await getDoc(primary);

      if (primarySnapshot.exists()) {
        return this.mapNote(primarySnapshot.id, primarySnapshot.data(), userId);
      }

      return null;
    } catch (error) {
      console.error('Error getting note:', error);
      throw new Error('Failed to get note');
    }
  }

  async update(id: string, updates: UpdateNoteData, userId: string): Promise<Note> {
    if (!userId) {
      throw new Error('User ID is required to update a note');
    }

    try {
      const currentNote = await this.getById(id, userId);
      if (!currentNote) {
        throw new Error('Note not found');
      }

      const { primary } = getUserScopedDocumentRefs(this.collectionName, userId, id);

      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (updates.content !== undefined) {
        updateData.content = updates.content;
      }

      if (updates.category !== undefined) {
        updateData.category = updates.category;
      }

      if (updates.plantId !== undefined) {
        updateData.plantId = updates.plantId ?? null;
      }

      if (updates.spaceId !== undefined) {
        updateData.spaceId = updates.spaceId ?? null;
      }

      if (updates.timestamp !== undefined) {
        updateData.timestamp = updates.timestamp ? Timestamp.fromDate(updates.timestamp) : null;
      }

      await setDoc(primary, updateData, { merge: true });

      const updatedNote = await this.getById(id, userId);
      if (!updatedNote) {
        throw new Error('Note not found after update');
      }

      return updatedNote;
    } catch (error) {
      console.error('Error updating note:', error);
      throw new Error('Failed to update note');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to delete a note');
    }

    try {
      // Get the note first to delete associated photos
      const note = await this.getById(id, userId);
      if (note && note.photos.length > 0) {
        // Delete photos from storage
        for (const photoUrl of note.photos) {
          try {
            const photoRef = this.getPhotoRef(photoUrl);
            await deleteObject(photoRef);
          } catch (photoError) {
            console.warn('Error deleting photo:', photoError);
            // Continue with note deletion even if photo deletion fails
          }
        }
      }

      const { primary } = getUserScopedDocumentRefs(this.collectionName, userId, id);
      await deleteDoc(primary);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw new Error('Failed to delete note');
    }
  }

  async list(userId: string, filters?: NoteFilters): Promise<Note[]> {
    if (!userId) {
      throw new Error('User ID is required to list notes');
    }

    try {
      const { primary } = getUserScopedCollectionRefs(this.collectionName, userId);
      const primarySnapshot = await getDocs(primary);

      const primaryNotes = primarySnapshot.docs.map((noteDoc) =>
        this.mapNote(noteDoc.id, noteDoc.data(), userId)
      );

      const sortedNotes = this.sortByTimestamp(primaryNotes);
      return this.applyClientFilters(sortedNotes, filters);
    } catch (error) {
      console.error('Error listing notes:', error);
      throw new Error('Failed to list notes');
    }
  }

  subscribe(
    userId: string,
    callback: (notes: Note[]) => void,
    filters?: NoteFilters
  ): () => void {
    if (!userId) {
      console.error('User ID is required for notes subscription');
      return () => {};
    }

    try {
      const { primary } = getUserScopedCollectionRefs(this.collectionName, userId);

      const primaryQuery = query(
        primary,
        ...this.buildSubscribeConstraints(filters)
      );

      return onSnapshot(
        primaryQuery,
        (querySnapshot) => {
          const primaryNotes = querySnapshot.docs.map((noteDoc) =>
            this.mapNote(noteDoc.id, noteDoc.data(), userId)
          );
          const sortedNotes = this.sortByTimestamp(primaryNotes);
          callback(this.applyClientFilters(sortedNotes, filters));
        },
        (error) => {
          console.error('Error in notes subscription:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up notes subscription:', error);
      return () => {};
    }
  }

  private getPhotoRef(photoUrl: string) {
    try {
      const parsedUrl = new URL(photoUrl);
      const objectPathMatch = parsedUrl.pathname.match(/\/o\/(.+)$/);

      if (objectPathMatch && objectPathMatch[1]) {
        const decodedPath = decodeURIComponent(objectPathMatch[1]);
        return ref(storage, decodedPath);
      }
    } catch {
      // Not a full URL; fall back to ref path/gs:// handling.
    }

    return ref(storage, photoUrl);
  }

  private async uploadPhoto(file: File, userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const photoRef = ref(storage, `notes/${userId}/${fileName}`);

      const snapshot = await uploadBytes(photoRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw new Error('Failed to upload photo');
    }
  }
}

export const noteService = new NoteService();
