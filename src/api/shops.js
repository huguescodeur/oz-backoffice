import client from './client'

const adapt = (s) => ({
  id:      s.shopID,
  uuid:    s.shopUUID,
  name:    s.shopName,
  address: s.shopAddress,
  phone:   s.shopPhone,
  mail:    s.shopMail,
})

export const getShops = (page = 1, limit = 100) =>
  client.get('/shops', { params: { page, limit } }).then((r) => ({
    ...r.data,
    shops: (r.data.shops || []).map(adapt),
  }))

export const createShop = (data) =>
  client.post('/shops', {
    shop_name:    data.name,
    shop_address: data.address,
    shop_phone:   data.phone || '',
    shop_mail:    data.mail || '',
  }).then((r) => r.data)

export const updateShop = (id, data) =>
  client.put(`/shops/${id}`, {
    shop_name:    data.name,
    shop_address: data.address,
    shop_phone:   data.phone || '',
    shop_mail:    data.mail || '',
  }).then((r) => r.data)

export const deleteShop = (id) =>
  client.delete(`/shops/${id}`).then((r) => r.data)
