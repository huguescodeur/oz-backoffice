import client from './client'

const adapt = (p) => ({
  id:            p.productID,
  uuid:          p.productUUID,
  name:          p.productName,
  description:   p.description || '',
  price:         p.unitPrice,
  category_id:   p.category?.id,
  category_name: p.category?.category,
})

export const getProducts = (page = 1, limit = 20) =>
  client.get('/products', { params: { page, limit } }).then((r) => ({
    ...r.data,
    products: (r.data.products || []).map(adapt),
  }))

export const createProduct = (data) =>
  client.post('/products', {
    product_name: data.name,
    description:  data.description || '',
    unit_price:   data.price,
    category_id:  data.category_id,
  }).then((r) => r.data)

export const updateProduct = (id, data) =>
  client.put(`/products/${id}`, {
    product_name: data.name,
    description:  data.description || '',
    unit_price:   data.price,
    category_id:  data.category_id,
  }).then((r) => r.data)

export const deleteProduct = (id) =>
  client.delete(`/products/${id}`).then((r) => r.data)
