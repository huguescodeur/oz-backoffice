import client from './client'

const adapt = (u) => ({
  id:         u.id,
  uuid:       u.UUID,
  username:   u.username,
  name:       [u.firstname, u.lastname].filter(Boolean).join(' '),
  firstname:  u.firstname,
  lastname:   u.lastname,
  email:      u.email,
  phone:      u.phone,
  role:       u.role,
  shop_id:    u.shop_id || null,
  shop_name:  u.shop_name || null,
  xp:         u.xp ?? null,
  parent_id:  u.parentID,
  deleted_at: u.deleted_at || null,
})

export const getUsers = (page = 1, limit = 20) =>
  client.get('/users', { params: { page, limit } }).then((r) => ({
    ...r.data,
    users: (r.data.users || []).map(adapt),
  }))

export const getArchivedUsers = (page = 1, limit = 20) =>
  client.get('/users', { params: { page, limit, archived: 'true' } }).then((r) => ({
    ...r.data,
    users: (r.data.users || []).map(adapt),
  }))

export const createUser = (data) =>
  client.post('/users', data).then((r) => r.data)

export const updateUser = (uuid, data) =>
  client.put(`/users/${uuid}`, data).then((r) => r.data)

export const deleteUser = (uuid) =>
  client.delete(`/users/${uuid}`).then((r) => r.data)

export const restoreUser = (uuid) =>
  client.patch(`/users/${uuid}`).then((r) => r.data)

export const assignShops = (uuid, shopIds) =>
  client.put(`/users/${uuid}/shops`, { shop_ids: shopIds }).then((r) => r.data)

export const getUserShops = (uuid) =>
  client.get(`/users/${uuid}/shops`).then((r) => r.data.shops || [])
