// Prescription photos on a customer (SPEC §15): metadata + thumbnail in `prescriptions`, the photo in
// `prescriptionImages` (same id), and the space they use in `stats/usage` — all in one batch.
// Saving works offline like every other write; a photo taken on this device can be opened offline too.
import {
  Bytes,
  doc,
  getDoc,
  getDocsFromServer,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { cleanNote, type Prescription } from '../../domain/prescriptions'
import { SCHEMA_VERSION } from '../../domain/types'
import { toMillis } from '../convert'
import { paths } from '../paths'
import { auditInBatch, commitInBackground, newBatch, writeContext } from '../writer'

function fromDoc(id: string, d: DocumentData): Prescription {
  return {
    id,
    customerId: String(d.customerId ?? ''),
    note: typeof d.note === 'string' ? d.note : '',
    thumb: d.thumb instanceof Bytes ? d.thumb.toUint8Array() : new Uint8Array(),
    width: Number(d.width ?? 0),
    height: Number(d.height ?? 0),
    imageBytes: Number(d.imageBytes ?? 0),
    createdAt: toMillis(d.createdAt) ?? 0,
    createdBy: String(d.createdBy ?? ''),
  }
}

export interface NewPrescription {
  image: Uint8Array
  thumb: Uint8Array
  width: number
  height: number
  note: string
}

export function addPrescription(customerId: string, photo: NewPrescription): Prescription {
  const ctx = writeContext()
  const ref = doc(paths.prescriptions())
  const note = cleanNote(photo.note)
  const batch = newBatch()
  batch.set(ref, {
    customerId,
    note,
    thumb: Bytes.fromUint8Array(photo.thumb),
    width: photo.width,
    height: photo.height,
    imageBytes: photo.image.length,
    createdAt: Timestamp.fromMillis(ctx.now),
    createdBy: ctx.uid,
    deviceId: ctx.deviceId,
    schemaVersion: SCHEMA_VERSION,
  })
  batch.set(paths.prescriptionImage(ref.id), {
    image: Bytes.fromUint8Array(photo.image),
    createdAt: Timestamp.fromMillis(ctx.now),
    createdBy: ctx.uid,
    schemaVersion: SCHEMA_VERSION,
  })
  batch.set(
    paths.usageStats(),
    { prescriptionCount: increment(1), prescriptionBytes: increment(photo.image.length + photo.thumb.length), updatedAt: serverTimestamp() },
    { merge: true },
  )
  auditInBatch(
    batch,
    { action: 'prescription.add', entity: 'customer', entityId: customerId, before: null, after: { id: ref.id, note, bytes: photo.image.length } },
    ctx,
  )
  commitInBackground(batch)
  return {
    id: ref.id,
    customerId,
    note,
    thumb: photo.thumb,
    width: photo.width,
    height: photo.height,
    imageBytes: photo.image.length,
    createdAt: ctx.now,
    createdBy: ctx.uid,
  }
}

export function deletePrescription(p: Prescription): void {
  const ctx = writeContext()
  const batch = newBatch()
  batch.delete(paths.prescription(p.id))
  batch.delete(paths.prescriptionImage(p.id))
  batch.set(
    paths.usageStats(),
    { prescriptionCount: increment(-1), prescriptionBytes: increment(-(p.imageBytes + p.thumb.length)), updatedAt: serverTimestamp() },
    { merge: true },
  )
  auditInBatch(
    batch,
    { action: 'prescription.delete', entity: 'customer', entityId: p.customerId, before: { id: p.id, note: p.note, createdAt: p.createdAt }, after: null },
    ctx,
  )
  commitInBackground(batch)
}

/** A customer's photos, newest first, live (the thumbnails are small; full photos load on demand). */
export function subscribePrescriptions(
  customerId: string,
  onData: (list: Prescription[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(paths.prescriptions(), where('customerId', '==', customerId), orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => fromDoc(d.id, d.data()))),
    onError,
  )
}

/** The full photo; from this device's cache when it is there (offline), else from the server. */
export async function fetchPrescriptionImage(id: string): Promise<Uint8Array | null> {
  const snap = await getDoc(paths.prescriptionImage(id))
  const image = snap.data()?.image
  return image instanceof Bytes ? image.toUint8Array() : null
}

export interface PhotoUsage {
  count: number
  bytes: number
}

export async function fetchPhotoUsage(): Promise<PhotoUsage> {
  const d = (await getDoc(paths.usageStats())).data()
  return { count: Number(d?.prescriptionCount ?? 0), bytes: Number(d?.prescriptionBytes ?? 0) }
}

/** For change-mobile: every photo of the old number (server copy), moved in the caller's batches. */
export async function prescriptionRefsOf(customerId: string) {
  const snap = await getDocsFromServer(query(paths.prescriptions(), where('customerId', '==', customerId)))
  return snap.docs.map((d) => d.ref)
}
