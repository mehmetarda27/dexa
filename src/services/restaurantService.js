import { restaurants as localRestaurants } from '../data/restaurants';
import { collections, createDocument, firestoreQuery, getDocument, listDocuments, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';

export async function getRestaurants() {
  if (!firebaseEnabled) return localRestaurants;
  return listDocuments(collections.restaurants, [firestoreQuery.orderBy('name', 'asc')]);
}

export async function getRestaurant(restaurantId) {
  if (!firebaseEnabled) return localRestaurants.find((restaurant) => restaurant.id === restaurantId) || null;
  return getDocument(collections.restaurants, restaurantId);
}

export async function createRestaurant(payload) {
  const restaurant = {
    name: payload.name,
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    radius: Number(payload.radius || 100),
    active: payload.active ?? true,
  };

  if (!firebaseEnabled) return { id: crypto.randomUUID(), ...restaurant };
  return createDocument(collections.restaurants, restaurant);
}

export async function updateRestaurant(restaurantId, payload) {
  if (!firebaseEnabled) return { id: restaurantId, ...payload };
  return updateDocument(collections.restaurants, restaurantId, payload);
}
