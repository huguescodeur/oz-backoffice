import client from './client'

const adapt = (c) => ({
  id:   c.id,
  uuid: c.categoryUUID,
  name: c.category,
})

export const getCategories = () =>
  client.get('/categories').then((r) => ({
    categories: (r.data.categories || []).map(adapt),
  }))

export const createCategory = (name) =>
  client.post('/categories', { name }).then((r) => r.data)

export const updateCategory = (id, name) =>
  client.put(`/categories/${id}`, { name }).then((r) => r.data)

export const deleteCategory = (id) =>
  client.delete(`/categories/${id}`).then((r) => r.data)

export const restoreCategory = (id) =>
  client.patch(`/categories/${id}/restore`).then((r) => r.data)
