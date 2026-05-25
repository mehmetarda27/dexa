import { restaurants } from '../data/restaurants';
import { appEnv } from '../config/env';
import { getDistanceMeters } from '../utils/distance';

export const LOCATION_RADIUS_METERS = appEnv.shiftRadiusMeters;
export const MAX_ALLOWED_ACCURACY_METERS = appEnv.locationAccuracyLimit;

export const gpsPermissionState = {
  status: 'Hazır',
  accuracy: 'Yüksek doğruluk',
};

export function getRestaurantById(id) {
  return restaurants.find((restaurant) => restaurant.id === id);
}

export function calculateDistanceToRestaurant(position, restaurant) {
  if (!position || !restaurant) return Number.POSITIVE_INFINITY;
  return Math.round(getDistanceMeters(position, restaurant));
}

export function validateLocationAccuracy(position) {
  if (!position) {
    throw new Error('Konum alınamadı.');
  }

  if (position.mocked) {
    throw new Error('Sahte GPS veya mock location algılandı. İşlem güvenlik nedeniyle engellendi.');
  }

  if (Number(position.accuracy || 0) > MAX_ALLOWED_ACCURACY_METERS) {
    throw new Error(`GPS doğruluğu düşük. İşlem için doğruluk ${MAX_ALLOWED_ACCURACY_METERS} metreden iyi olmalıdır.`);
  }
}

export function isWithinRestaurantRadius(position, restaurant) {
  validateLocationAccuracy(position);
  const distance = calculateDistanceToRestaurant(position, restaurant);
  const radius = Number(restaurant?.radius || LOCATION_RADIUS_METERS);
  return {
    distance,
    inRange: distance <= radius,
    radius,
  };
}

export function assertWithinRestaurantRadius(position, restaurant, actionName = 'Bu işlem') {
  const result = isWithinRestaurantRadius(position, restaurant);
  if (!result.inRange) {
    throw new Error(`${actionName} yapılamaz. Restoranın ${result.radius} metre menzilinde değilsiniz.`);
  }
  return result;
}

export function getCourierDistanceState(courier) {
  const restaurant = getRestaurantById(courier.restaurantId);
  const currentPosition = {
    lat: restaurant.lat + courier.distanceMeters / 111320,
    lng: restaurant.lng,
    accuracy: 24,
  };
  const range = isWithinRestaurantRadius(currentPosition, restaurant);

  return {
    restaurant,
    distance: range.distance,
    inRange: range.inRange,
    currentPosition,
  };
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!appEnv.enableGps) {
      reject(new Error('GPS özelliği bu ortamda kapalı.'));
      return;
    }

    if (!navigator.geolocation) {
      reject(new Error('Tarayıcı konum servisini desteklemiyor.'));
      return;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      reject(new Error('Konum izni için HTTPS gerekir. Uygulamayı HTTPS üzerinden açın.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          mocked: Boolean(window.DexaAndroid?.isMockLocationEnabled?.()),
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Konum izni reddedildi. Mesai işlemleri için konum izni gerekir.'));
          return;
        }
        reject(new Error('Konum alınamadı.'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  });
}
