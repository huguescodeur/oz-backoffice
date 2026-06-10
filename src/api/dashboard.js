import client from './client'

export const getNotifications = (shopID) => {
  const params = shopID ? { shop_id: shopID } : {}
  return client.get('/dashboard/notifications', { params }).then((r) => r.data)
}

export const getOnboardingStatus = () =>
  client.get('/dashboard/onboarding').then((r) => r.data)

export const getDashboard = (shopID, dateFrom, dateTo) => {
  const params = {}
  if (shopID)   params.shop_id   = shopID
  if (dateFrom) params.date_from = dateFrom
  if (dateTo)   params.date_to   = dateTo
  return client.get('/dashboard', { params }).then((r) => r.data)
}
