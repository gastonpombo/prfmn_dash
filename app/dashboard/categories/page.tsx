'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Loader2, Pencil, Trash2, ImageIcon, Tag } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

type Category = {
  id: number
  name: string
  image_url: string | null
  created_at: string
}

export default function CategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    name: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error loading categories:', error)
    } else {
      setCategories(data || [])
    }
    setLoading(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetForm = () => {
    setFormData({ name: '' })
    setImageFile(null)
    setImagePreview('')
    setCurrentImageUrl(null)
    setEditingId(null)
    setError('')
  }

  const openEditDialog = (category: Category) => {
    setEditingId(category.id)
    setFormData({ name: category.name })
    setCurrentImageUrl(category.image_url)
    setImageFile(null)
    setImagePreview('')
    setError('')
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let imageUrl = currentImageUrl

      // Upload new image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('categories')
          .upload(filePath, imageFile)

        if (uploadError) {
          console.error('[v0] Upload error:', uploadError)
          setError('Error al subir la imagen: ' + uploadError.message)
          setSaving(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('categories')
          .getPublicUrl(filePath)

        imageUrl = publicUrl
      }

      const categoryData = {
        name: formData.name,
        image_url: imageUrl,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingId)

        if (updateError) {
          console.error('[v0] Update error:', updateError)
          setError('Error al actualizar: ' + updateError.message)
          setSaving(false)
          return
        }

        toast.success('Categoría actualizada correctamente')
      } else {
        const { error: insertError } = await supabase
          .from('categories')
          .insert([categoryData])

        if (insertError) {
          console.error('[v0] Insert error:', insertError)
          setError('Error al guardar: ' + insertError.message)
          setSaving(false)
          return
        }

        toast.success('Categoría creada correctamente')
      }

      resetForm()
      setDialogOpen(false)
      loadCategories()
    } catch (err) {
      console.error('[v0] Unexpected error:', err)
      setError('Error inesperado al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[v0] Delete error:', error)
        toast.error('Error al eliminar la categoría')
        return
      }

      toast.success('Categoría eliminada correctamente')
      loadCategories()
    } catch (err) {
      console.error('[v0] Unexpected error:', err)
      toast.error('Error inesperado al eliminar')
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-neutral-900 mb-2">
              Categorías
            </h1>
            <p className="text-neutral-600">
              Organiza tus productos por categorías
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm()
                setDialogOpen(true)
              }} className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-500/20 gap-2">
                <Plus className="h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif">
                  {editingId ? 'Editar Categoría' : 'Agregar Nueva Categoría'}
                </DialogTitle>
              </DialogHeader>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-neutral-700 font-medium">
                    Nombre de la Categoría *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Floral, Amaderado, Oriental"
                    required
                    disabled={saving}
                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image" className="text-neutral-700 font-medium">
                    Imagen Representativa
                  </Label>
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                    {imagePreview || currentImageUrl ? (
                      <div className="space-y-4">
                        <div className="relative w-48 h-48 mx-auto rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                          <img
                            src={imagePreview || currentImageUrl || '/placeholder.svg'}
                            alt="Preview"
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setImageFile(null)
                            setImagePreview('')
                          }}
                          disabled={saving}
                        >
                          Cambiar Imagen
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ImageIcon className="h-12 w-12 text-neutral-400 mx-auto" />
                        <div>
                          <label
                            htmlFor="image"
                            className="cursor-pointer text-amber-600 hover:text-amber-700 font-medium"
                          >
                            Seleccionar archivo
                          </label>
                          <p className="text-sm text-neutral-500 mt-1">
                            PNG, JPG hasta 5MB
                          </p>
                        </div>
                      </div>
                    )}
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={saving}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Categoría'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-900 mb-1">
                No hay categorías
              </h3>
              <p className="text-neutral-600 mb-6">
                Comienza creando tu primera categoría
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead className="font-semibold text-neutral-700">Imagen</TableHead>
                  <TableHead className="font-semibold text-neutral-700">Nombre</TableHead>
                  <TableHead className="font-semibold text-neutral-700">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="hover:bg-neutral-50">
                    <TableCell>
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                        {category.image_url ? (
                          <img
                            src={category.image_url || "/placeholder.svg"}
                            alt={category.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Tag className="h-6 w-6 text-neutral-400" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-neutral-900">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => openEditDialog(category)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Editar categoría"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(category.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
