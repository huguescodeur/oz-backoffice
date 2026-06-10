import client from './client'

export const getOrders = (page = 1, limit = 20, shopID, dateFrom, dateTo) => {
  const params = { page, limit }
  if (shopID)   params.shop_id   = shopID
  if (dateFrom) params.date_from = dateFrom
  if (dateTo)   params.date_to   = dateTo
  return client.get('/orders', { params }).then((r) => r.data)
}

export const getOrder = (uuid) =>
  client.get(`/orders/${uuid}`).then((r) => r.data)

export const createOrder = (data) =>
  client.post('/orders', data).then((r) => r.data)

export const confirmOrder = (uuid) =>
  client.patch(`/orders/${uuid}/confirm`).then((r) => r.data)

export const deliverOrder = (uuid) =>
  client.patch(`/orders/${uuid}/deliver`).then((r) => r.data)

export const cancelOrder = (uuid) =>
  client.delete(`/orders/${uuid}`).then((r) => r.data)
