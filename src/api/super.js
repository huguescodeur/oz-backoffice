import client from './client'

export const getGlobalStats = () =>
  client.get('/super/stats').then((r) => r.data)

export const getAnalytics = (dateFrom, dateTo) =>
  client.get('/super/analytics', { params: { date_from: dateFrom || '', date_to: dateTo || '' } }).then((r) => r.data)

export const getGlobalLogs = (limit = 50, offset = 0, dateFrom, dateTo, type_) =>
  client.get('/super/logs', { params: { limit, offset, date_from: dateFrom || '', date_to: dateTo || '', type: type_ || '' } }).then((r) => r.data)

export const getAdmins = (limit = 20, offset = 0) =>
  client.get('/super/admins', { params: { limit, offset } }).then((r) => r.data)

export const getSettings = () =>
  client.get('/super/settings').then((r) => r.data)

export const setSetting = (key, value) =>
  client.post('/super/settings', { key, value })
