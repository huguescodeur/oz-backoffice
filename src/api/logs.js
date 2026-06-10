import client from './client'

export const getLogs = (page = 1, limit = 30, shopID, dateFrom, dateTo) => {
  const params = { page, limit }
  if (shopID)   params.shop_id   = shopID
  if (dateFrom) params.date_from = dateFrom
  if (dateTo)   params.date_to   = dateTo
  return client.get('/logs', { params }).then((r) => r.data)
}
