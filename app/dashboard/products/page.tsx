'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Loader2, Package, ImageIcon, Pencil, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Category = {
  id: number
  name: string
  image_url: string | null
}

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    brand: '',
    top_notes: '',
    heart_notes: '',
    base_notes: '',
    season: '',
    time_of_day: '',
    longevity: '',
    sillage: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [transparentImageFile, setTransparentImageFile] = useState<File | null>(null)
  const [transparentImagePreview, setTransparentImagePreview] = useState<string>('')
  const [currentTransparentImageUrl, setCurrentTransparentImageUrl] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[v0] Error loading categories:', error)
    } else {
      setCategories(data || [])
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error loading products:', error)
    } else {
      setProducts(data || [])
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

  const handleTransparentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTransparentImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setTransparentImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      category_id: '',
      top_notes: '',
      heart_notes: '',
      base_notes: '',
      season: '',
      time_of_day: '',
      longevity: '',
      sillage: '',
      brand: '',
    })
    setImageFile(null)
    setImagePreview('')
    setCurrentImageUrl(null)
    setTransparentImageFile(null)
    setTransparentImagePreview('')
    setCurrentTransparentImageUrl(null)
    setEditingId(null)
    setError('')
  }

  const openEditDialog = (product: Product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      category_id: product.category ? categories.find(c => c.name === product.category)?.id.toString() || '' : '',
      brand: product.brand || '',
      top_notes: product.top_notes || '',
      heart_notes: product.heart_notes || '',
      base_notes: product.base_notes || '',
      season: product.season || '',
      time_of_day: product.time_of_day || '',
      longevity: product.longevity || '',
      sillage: product.sillage || '',
    })
    setCurrentImageUrl(product.image_url)
    setCurrentTransparentImageUrl(product.img_transparent_url)
    setImageFile(null)
    setImagePreview('')
    setTransparentImageFile(null)
    setTransparentImagePreview('')
    setError('')
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let imageUrl = currentImageUrl
      let transparentImageUrl = currentTransparentImageUrl

      // Upload new image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile)

        if (uploadError) {
          console.error('[v0] Upload error:', uploadError)
          setError('Error al subir la imagen: ' + uploadError.message)
          setSaving(false)
          return
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        imageUrl = publicUrl
      }

      // Upload new transparent image if selected
      if (transparentImageFile) {
        const fileExt = transparentImageFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_transparent.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, transparentImageFile)

        if (uploadError) {
          console.error('[v0] Upload error:', uploadError)
          setError('Error al subir la imagen transparente: ' + uploadError.message)
          setSaving(false)
          return
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        transparentImageUrl = publicUrl
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category: formData.category_id ? categories.find(c => c.id.toString() === formData.category_id)?.name || null : null,
        brand: formData.brand || null,
        image_url: imageUrl,
        img_transparent_url: transparentImageUrl,
        top_notes: formData.top_notes || null,
        heart_notes: formData.heart_notes || null,
        base_notes: formData.base_notes || null,
        season: formData.season || null,
        time_of_day: formData.time_of_day || null,
        longevity: formData.longevity || null,
        sillage: formData.sillage || null,
      }

      if (editingId) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId)

        if (updateError) {
          console.error('[v0] Update error:', updateError)
          setError('Error al actualizar el producto: ' + updateError.message)
          setSaving(false)
          return
        }

        toast.success('Producto actualizado correctamente')
      } else {
        // Insert new product
        const { error: insertError } = await supabase
          .from('products')
          .insert([productData])

        if (insertError) {
          console.error('[v0] Insert error:', insertError)
          setError('Error al guardar el producto: ' + insertError.message)
          setSaving(false)
          return
        }

        toast.success('Producto creado correctamente')
      }

      resetForm()
      setDialogOpen(false)
      loadProducts()
    } catch (err) {
      console.error('[v0] Unexpected error:', err)
      setError('Error inesperado al guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[v0] Delete error:', error)
        toast.error('Error al eliminar el producto')
        return
      }

      toast.success('Producto eliminado correctamente')
      loadProducts()
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
              Productos
            </h1>
            <p className="text-neutral-600">
              Gestiona el catálogo de perfumes de tu tienda
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
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif">
                  {editingId ? 'Editar Producto' : 'Agregar Nuevo Producto'}
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
                    Nombre del Producto *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Chanel No. 5"
                    required
                    disabled={saving}
                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand" className="text-neutral-700 font-medium">
                    Marca
                  </Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ej: Chanel, Dior..."
                    disabled={saving}
                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-neutral-700 font-medium">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción detallada del perfume..."
                    rows={3}
                    disabled={saving}
                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-neutral-700 font-medium">
                      Precio
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="99.99"
                      required
                      disabled={saving}
                      className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-neutral-700 font-medium">
                      Stock
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="100"
                      required
                      disabled={saving}
                      className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id" className="text-neutral-700 font-medium">
                    Categoría
                  </Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger disabled={saving} className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Perfil Olfativo */}
                <div className="space-y-4 pt-4 border-t border-neutral-200">
                  <h3 className="text-lg font-serif font-semibold text-neutral-900">
                    Perfil Olfativo
                  </h3>

                  {/* Notas - Inputs de Texto Libre */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Notas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="top_notes" className="text-neutral-700 font-medium">
                          Notas de Salida
                        </Label>
                        <Textarea
                          id="top_notes"
                          rows={2}
                          value={formData.top_notes}
                          onChange={(e) => setFormData({ ...formData, top_notes: e.target.value })}
                          placeholder="Ej: Limón, Bergamota..."
                          disabled={saving}
                          className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="heart_notes" className="text-neutral-700 font-medium">
                          Notas de Corazón
                        </Label>
                        <Textarea
                          id="heart_notes"
                          rows={2}
                          value={formData.heart_notes}
                          onChange={(e) => setFormData({ ...formData, heart_notes: e.target.value })}
                          placeholder="Ej: Jazmín, Rosa, Canela..."
                          disabled={saving}
                          className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="base_notes" className="text-neutral-700 font-medium">
                          Notas de Fondo
                        </Label>
                        <Textarea
                          id="base_notes"
                          rows={2}
                          value={formData.base_notes}
                          onChange={(e) => setFormData({ ...formData, base_notes: e.target.value })}
                          placeholder="Ej: Vainilla, Oud, Ámbar..."
                          disabled={saving}
                          className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Características - Selects Controlados */}
                  <div className="space-y-4 pt-4">
                    <h4 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Características</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="season" className="text-neutral-700 font-medium">
                          Estación
                        </Label>
                        <Select value={formData.season} onValueChange={(value) => setFormData({ ...formData, season: value })}>
                          <SelectTrigger disabled={saving} className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20">
                            <SelectValue placeholder="Selecciona una estación" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Todo el año">Todo el año</SelectItem>
                            <SelectItem value="Primavera">Primavera</SelectItem>
                            <SelectItem value="Verano">Verano</SelectItem>
                            <SelectItem value="Otoño">Otoño</SelectItem>
                            <SelectItem value="Invierno">Invierno</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time_of_day" className="text-neutral-700 font-medium">
                          Momento
                        </Label>
                        <Select value={formData.time_of_day} onValueChange={(value) => setFormData({ ...formData, time_of_day: value })}>
                          <SelectTrigger disabled={saving} className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20">
                            <SelectValue placeholder="Selecciona un momento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Versátil">Versátil</SelectItem>
                            <SelectItem value="Día">Día</SelectItem>
                            <SelectItem value="Noche">Noche</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="longevity" className="text-neutral-700 font-medium">
                          Duración
                        </Label>
                        <Select value={formData.longevity} onValueChange={(value) => setFormData({ ...formData, longevity: value })}>
                          <SelectTrigger disabled={saving} className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20">
                            <SelectValue placeholder="Selecciona duración" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Suave">Suave</SelectItem>
                            <SelectItem value="Moderada">Moderada</SelectItem>
                            <SelectItem value="Duradera">Duradera</SelectItem>
                            <SelectItem value="Eterna">Eterna</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sillage" className="text-neutral-700 font-medium">
                          Estela
                        </Label>
                        <Select value={formData.sillage} onValueChange={(value) => setFormData({ ...formData, sillage: value })}>
                          <SelectTrigger disabled={saving} className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20">
                            <SelectValue placeholder="Selecciona estela" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Íntima">Íntima</SelectItem>
                            <SelectItem value="Moderada">Moderada</SelectItem>
                            <SelectItem value="Pesada">Pesada</SelectItem>
                            <SelectItem value="Enorme">Enorme</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image" className="text-neutral-700 font-medium">
                    Imagen del Producto
                  </Label>
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                    {imagePreview || currentImageUrl ? (
                      <div className="space-y-4">
                        <div className="relative w-48 h-48 mx-auto rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                          {imagePreview ? (
                            <img
                              src={imagePreview || "/placeholder.svg"}
                              alt="Preview"
                              className="object-cover w-full h-full"
                            />
                          ) : currentImageUrl ? (
                            <img
                              src={currentImageUrl || "/placeholder.svg"}
                              alt="Current"
                              className="object-cover w-full h-full"
                            />
                          ) : null}
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

                <div className="space-y-2">
                  <Label htmlFor="transparent_image" className="text-neutral-700 font-medium">
                    Imagen sin fondo (PNG)
                  </Label>
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                    {transparentImagePreview || currentTransparentImageUrl ? (
                      <div className="space-y-4">
                        <div className="relative w-48 h-48 mx-auto rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                          <img
                            src={transparentImagePreview || currentTransparentImageUrl || "/placeholder.svg"}
                            alt="Transparent Preview"
                            className="object-contain w-full h-full"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setTransparentImageFile(null)
                            setTransparentImagePreview('')
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
                            htmlFor="transparent_image"
                            className="cursor-pointer text-amber-600 hover:text-amber-700 font-medium"
                          >
                            Seleccionar archivo
                          </label>
                          <p className="text-sm text-neutral-500 mt-1">
                            PNG recomendado
                          </p>
                        </div>
                      </div>
                    )}
                    <Input
                      id="transparent_image"
                      type="file"
                      accept="image/png,image/*"
                      onChange={handleTransparentImageChange}
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
                      'Guardar Producto'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-900 mb-1">
                No hay productos
              </h3>
              <p className="text-neutral-600 mb-6">
                Comienza agregando tu primer producto al catálogo
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead className="font-semibold text-neutral-700">Imagen</TableHead>
                  <TableHead className="font-semibold text-neutral-700">Nombre</TableHead>
                  <TableHead className="font-semibold text-neutral-700">Categoría</TableHead>
                  <TableHead className="font-semibold text-neutral-700">Precio</TableHead>
                  <TableHead className="font-semibold text-neutral-700">Stock</TableHead>
                  <TableHead className="font-semibold text-neutral-700">Estado</TableHead>
                  <TableHead className="font-semibold text-neutral-700">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-neutral-50">
                    <TableCell>
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                        {product.image_url ? (
                          <img
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-6 w-6 text-neutral-400" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-neutral-900">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-neutral-500 truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {product.category || 'Sin categoría'}
                    </TableCell>
                    <TableCell className="font-semibold text-neutral-900">
                      ${Number(product.price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${product.stock < 10
                          ? 'bg-red-100 text-red-700'
                          : product.stock < 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                          }`}
                      >
                        {product.stock} unidades
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${product.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-neutral-100 text-neutral-700'
                          }`}
                      >
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => openEditDialog(product)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Editar producto"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(product.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar producto"
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
