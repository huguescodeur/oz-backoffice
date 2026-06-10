import client from './client'

export const login = (identifier, password) =>
  client.post('/auth/login', { identifier, password }).then((r) => r.data)

export const registerAdmin = (data) =>
  client.post('/auth/register', { ...data, role: 'admin' }).then((r) => r.data)

export const register = (data) =>
  client.post('/auth/register', data).then((r) => r.data)

export const getMyShops = () =>
  client.get('/users/me/shops').then((r) => r.data.shops || [])

export const updateMe = (data) =>
  client.patch('/auth/me', data).then((r) => r.data)

export const resetPassword = (oldPassword, newPassword) =>
  client.patch('/auth/reset-password', { old_password: oldPassword, new_password: newPassword }).then((r) => r.data)

export const forgotPassword = (identifier) =>
  client.post('/auth/forgot-password', { identifier }).then((r) => r.data)

export const validateResetToken = (token) =>
  client.get('/auth/validate-reset-token', { params: { token } }).then((r) => r.data)

export const resetPasswordByToken = (token, newPassword) =>
  client.post('/auth/reset-password-token', { token, new_password: newPassword }).then((r) => r.data)
