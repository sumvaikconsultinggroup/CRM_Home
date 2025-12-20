'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Download, Edit, Trash2, Upload, Package, DollarSign, Ruler, Info, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

function getByPath(obj, path) {
  if (!path) return undefined
  const parts = String(path).split('.')
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

function setByPath(obj, path, value) {
  const parts = String(path).split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = value
}

function flattenCategories(tree) {
  const flat = []
  const walk = (nodes, depth = 0) => {
    for (const n of nodes || []) {
      flat.push({ ...n, depth })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(tree)
  return flat
}

function buildDefaultForm(schema) {
  const form = {
    name: '',
    sku: '',
    brand: '',
    collection: '',
    categoryId: '',
    description: '',
    status: 'active',
    pricing: { costPrice: 0, mrp: 0, dealerPrice: 0, sellingPrice: 0 },
    pack: { coverageSqftPerBox: 0, planksPerBox: 0, weightKgPerBox: 0 },
    specs: {},
    installation: {},
    compliance: {},
    tax: { hsnCode: '4418', gstRate: 18 },
    images: []
  }

  // Apply schema defaults if present
  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      if (field.defaultValue === undefined) continue
      const existing = getByPath(form, field.key)
      if (existing === undefined || existing === '' || existing === null) {
        setByPath(form, field.key, field.defaultValue)
      }
    }
  }

  return form
}

export function ImportProductsDialog({ open, onClose, onImport, loading, categories }) {
  const [csvText, setCsvText] = useState('')

  useEffect(() => {
    if (open) setCsvText('')
  }, [open])

  const handleFile = async (file) => {
    const text = await file.text()
    setCsvText(text)
  }

  const flat = useMemo(() => flattenCategories(categories), [categories])

  const downloadTemplate = () => {
    const template = [
      'name,sku,brand,collection,category,pricing.costPrice,pricing.mrp,pricing.dealerPrice,pricing.sellingPrice,pack.coverageSqftPerBox,tax.hsnCode,tax.gstRate,status',
      'Classic Oak,SKU-001,BrandX,Premium,hardwood,120,180,150,200,20,4418,18,active'
    ].join('\n')

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products-import-template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Products (CSV)</DialogTitle>
          <DialogDescription>
            Upload a CSV. If SKU matches an existing product, it will be updated (upsert by SKU).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download Template
            </Button>
            <label className="inline-flex items-center">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
              <Button variant="secondary" type="button" onClick={(e) => e.currentTarget.closest('label')?.querySelector('input')?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Choose CSV
              </Button>
            </label>
          </div>

          <div className="space-y-2">
            <Label>CSV Content</Label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV here or upload a file above"
              rows={10}
            />
          </div>

          <div className="rounded-lg border border-border p-3 bg-muted/30 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Category values</p>
            <p>
              Use <span className="font-mono">category</span> column with category <span className="font-mono">slug</span> (recommended) or UUID.
            </p>
            {flat.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                {flat.slice(0, 12).map(c => (
                  <p key={c.id} className="text-xs">
                    {`${'— '.repeat(c.depth)}${c.name}`} <span className="font-mono text-muted-foreground">({c.slug})</span>
                  </p>
                ))}
              </div>
            )}
            <p className="mt-2">You can also add custom fields using columns like <span className="font-mono">custom.leadTimeDays</span></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onImport(csvText)} disabled={loading || !csvText.trim()}>
            {loading ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CategoryManagerDialog({ open, onClose, categories, onSave, onDelete, loading }) {
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [editing, setEditing] = useState(null)

  const flat = useMemo(() => flattenCategories(categories), [categories])

  useEffect(() => {
    if (open) {
      setName('')
      setParentId('')
      setEditing(null)
    }
  }, [open])

  const submit = () => {
    if (!name.trim()) return
    onSave({ id: editing?.id, name: name.trim(), parentId: parentId || null })
    setName('')
    setParentId('')
    setEditing(null)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>Create parent/child categories for multi-brand catalogues.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Brand A" />
            </div>
            <div className="space-y-2">
              <Label>Parent Category (optional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue placeholder="No parent (top level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No parent</SelectItem>
                  {flat.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {`${'— '.repeat(c.depth)}${c.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={submit} disabled={loading || !name.trim()}>
                {editing ? 'Update Category' : 'Add Category'}
              </Button>
              {editing && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(null)
                    setName('')
                    setParentId('')
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
              Tip: create a parent for each brand, and children for each catalogue/collection.
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-3 border-b bg-muted/30">
              <p className="text-sm font-medium">Existing Categories</p>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {flat.length ? (
                <div className="divide-y">
                  {flat.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{`${'— '.repeat(c.depth)}${c.name}`}</p>
                        <p className="text-xs text-muted-foreground">slug: {c.slug}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(c)
                            setName(c.name)
                            setParentId(c.parentId || '')
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(c.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-sm text-muted-foreground">No categories yet.</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FlooringProductDialog({ open, onClose, product, schema, categories, onSave, loading }) {
  const flat = useMemo(() => flattenCategories(categories), [categories])

  const [form, setForm] = useState(() => buildDefaultForm(schema))
  const [imagesText, setImagesText] = useState('')

  useEffect(() => {
    if (!open) return
    if (product) {
      const merged = { ...buildDefaultForm(schema), ...product }
      // normalize older fields
      if (!merged.categoryId && merged.category) merged.categoryId = merged.category
      if (!merged.tax) merged.tax = { hsnCode: merged.hsnCode || '4418', gstRate: merged.gstRate ?? 18 }
      if (!merged.pricing) merged.pricing = {}
      if (merged.hsnCode && !merged.tax?.hsnCode) merged.tax.hsnCode = merged.hsnCode
      if (merged.gstRate != null && !merged.tax?.gstRate) merged.tax.gstRate = merged.gstRate
      setForm(merged)
      setImagesText((merged.images || []).join(', '))
    } else {
      const base = buildDefaultForm(schema)
      setForm(base)
      setImagesText('')
    }
  }, [open, product, schema])

  const onFieldChange = (field, rawValue) => {
    setForm(prev => {
      const next = { ...prev }
      if (field.key === 'images') {
        // handled separately
        return next
      }
      if (field.type === 'number') {
        const n = rawValue === '' ? '' : Number(rawValue)
        setByPath(next, field.key, Number.isFinite(n) ? n : '')
      } else if (field.type === 'boolean') {
        setByPath(next, field.key, !!rawValue)
      } else {
        setByPath(next, field.key, rawValue)
      }
      return next
    })
  }

  const renderField = (field) => {
    const value = getByPath(form, field.key)

    if (field.type === 'textarea') {
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onFieldChange(field, e.target.value)}
          placeholder={field.hint || ''}
          rows={3}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <Select value={value ?? field.defaultValue ?? ''} onValueChange={(v) => onFieldChange(field, v)}>
          <SelectTrigger><SelectValue placeholder={field.hint || 'Select'} /></SelectTrigger>
          <SelectContent>
            {(field.options || []).map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (field.type === 'category') {
      return (
        <Select value={value || ''} onValueChange={(v) => onFieldChange(field, v)}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {flat.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {`${'— '.repeat(c.depth)}${c.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (field.type === 'boolean') {
      return (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <p className="text-sm text-muted-foreground">{field.hint || 'Enable'}</p>
          <Switch checked={!!value} onCheckedChange={(v) => onFieldChange(field, v)} />
        </div>
      )
    }

    if (field.key === 'images') {
      return (
        <Input
          value={imagesText}
          onChange={(e) => setImagesText(e.target.value)}
          placeholder="https://... , https://..."
        />
      )
    }

    return (
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value ?? ''}
        onChange={(e) => onFieldChange(field, e.target.value)}
        placeholder={field.hint || ''}
      />
    )
  }

  const save = () => {
    const payload = { ...form }
    payload.images = imagesText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    // keep backward compatibility
    payload.hsnCode = payload.tax?.hsnCode
    payload.gstRate = payload.tax?.gstRate

    onSave(payload)
  }

  const requiredMissing = (() => {
    for (const section of schema?.sections || []) {
      for (const field of section.fields || []) {
        if (!field.required) continue
        const v = getByPath(form, field.key)
        if (v === undefined || v === null || v === '') return true
      }
    }
    return false
  })()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>Wooden flooring industry-ready product master (schema driven)</DialogDescription>
        </DialogHeader>

        {!schema?.sections?.length ? (
          <div className="py-6 text-sm text-muted-foreground">Loading schema…</div>
        ) : (
          <div className="space-y-6 py-2">
            {schema.sections.map(section => (
              <div key={section.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{section.title}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(section.fields || []).map(field => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
                      <Label>
                        {field.label}{field.required ? ' *' : ''}
                      </Label>
                      {renderField(field)}
                      {field.hint && field.type !== 'boolean' && field.type !== 'textarea' && (
                        <p className="text-xs text-muted-foreground">{field.hint}</p>
                      )}
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={loading || requiredMissing}>
            {loading ? 'Saving…' : (product ? 'Update' : 'Add')} Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
