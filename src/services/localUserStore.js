const LOCAL_USERS_KEY = 'dexa.localUsers';

export function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export function upsertLocalUser(user) {
  const users = getLocalUsers();
  const nextUsers = [
    ...users.filter((item) => item.username !== user.username),
    {
      ...user,
      username: user.username.trim().toLowerCase(),
      active: user.active ?? true,
      createdAt: user.createdAt || new Date().toISOString(),
    },
  ];
  saveLocalUsers(nextUsers);
  return user;
}

export function updateLocalUser(username, payload) {
  const normalizedUsername = username.trim().toLowerCase();
  const nextUsers = getLocalUsers().map((user) => (user.username === normalizedUsername ? { ...user, ...payload } : user));
  saveLocalUsers(nextUsers);
}

export function findLocalUser(username, password) {
  const normalizedUsername = username.trim().toLowerCase();
  return getLocalUsers().find((user) => user.username === normalizedUsername && user.password === password);
}
