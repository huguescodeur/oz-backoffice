import { useState, useCallback } from 'react'

export function useForm(initialValues, rules = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const set = useCallback((field, value) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (touched[field]) validate({ ...values, [field]: value }, field)
  }, [values, touched, rules])

  const touch = useCallback((field) => {
    setTouched((t) => ({ ...t, [field]: true }))
    validate(values, field)
  }, [values, rules])

  const validate = useCallback((vals = values, onlyField = null) => {
    const errs = {}
    for (const [field, ruleFns] of Object.entries(rules)) {
      if (onlyField && field !== onlyField) continue
      for (const ruleFn of ruleFns) {
        const msg = ruleFn(vals[field], vals)
        if (msg) { errs[field] = msg; break }
      }
    }
    setErrors((prev) => onlyField ? { ...prev, ...errs, ...(errs[onlyField] ? {} : { [onlyField]: undefined }) } : errs)
    return errs
  }, [values, rules])

  const validateAll = useCallback(() => {
    const allTouched = Object.fromEntries(Object.keys(rules).map((k) => [k, true]))
    setTouched(allTouched)
    const errs = {}
    for (const [field, ruleFns] of Object.entries(rules)) {
      for (const ruleFn of ruleFns) {
        const msg = ruleFn(values[field], values)
        if (msg) { errs[field] = msg; break }
      }
    }
    setErrors(errs)
    return errs
  }, [values, rules])

  const reset = useCallback((newVals = initialValues) => {
    setValues(newVals)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const field = (name) => ({
    value: values[name] ?? '',
    onChange: (e) => set(name, e.target.value),
    onBlur: () => touch(name),
    'data-error': !!errors[name],
  })

  const hasErrors = Object.values(errors).some(Boolean)

  return { values, errors, touched, set, reset, validateAll, field, hasErrors }
}

// Règles réutilisables
export const rules = {
  required: (label) => (v) => (!v || String(v).trim() === '') ? `${label} est requis` : undefined,
  minLen:   (n) => (v) => v && v.length < n ? `Minimum ${n} caractères` : undefined,
  email:    () => (v) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Email invalide' : undefined,
  phone10:  () => (v) => v && !/^\d{10}$/.test(v) ? '10 chiffres requis' : undefined,
  positive: (label) => (v) => v !== '' && (isNaN(Number(v)) || Number(v) <= 0) ? `${label} doit être > 0` : undefined,
  match:    (field2, label) => (v, all) => v !== all[field2] ? `${label} ne correspondent pas` : undefined,
}
