import { shiftReports as localReports } from '../data/reports';
import { collections, createDocument, firestoreQuery, listDocuments } from './firestoreService';
import { firebaseEnabled } from './firebase';

export async function getReports(filters = {}) {
  if (!firebaseEnabled) {
    return filters.courierId ? localReports.filter((report) => report.courierId === filters.courierId) : localReports;
  }

  const constraints = [];
  if (filters.courierId) constraints.push(firestoreQuery.where('courierId', '==', filters.courierId));
  return listDocuments(collections.reports, constraints);
}

export async function createReport(payload) {
  if (!firebaseEnabled) return { id: crypto.randomUUID(), ...payload };
  return createDocument(collections.reports, payload);
}
