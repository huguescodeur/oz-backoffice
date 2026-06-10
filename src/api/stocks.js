import client from './client'

export const getStocks = (shopId) =>
  client.get('/stocks', { params: shopId ? { shop_id: shopId } : {} }).then((r) => r.data)

export const getAllStocks = () =>
  client.get('/stocks').then((r) => r.data)

export const getLowStocks = (shopId) =>
  client.get('/stocks/alerts', { params: shopId ? { shop_id: shopId } : {} }).then((r) => r.data)

export const setMinStock = (productId, shopId, minStock) =>
  client.put('/stocks/min', { product_id: productId, shop_id: shopId, min_stock: minStock }).then((r) => r.data)

export const stockIn = (productId, shopId, quantity, comment = '') =>
  client.post('/stocks/in', { product_id: productId, shop_id: shopId, quantity, comment }).then((r) => r.data)

export const adjustStock = (productId, shopId, quantityChange, movementType, comment = '') =>
  client.post('/stocks/adjust', { product_id: productId, shop_id: shopId, quantity_change: quantityChange, movement_type: movementType, comment }).then((r) => r.data)
