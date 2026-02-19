'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Brand } from '@/lib/supabase'
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
import { Plus, Loader2, Tag, ImageIcon, Pencil, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

export default function BrandsPage() {
    const supabase = createClient()
    const [brands, setBrands] = useState<Brand[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        is_featured: false,
    })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>('')
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)

    useEffect(() => {
        loadBrands()
    }, [])

    const loadBrands = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            console.error('[brands] Error loading brands:', error)
            toast.error('Error al cargar las marcas')
        } else {
            setBrands(data || [])
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
        setFormData({
            name: '',
            is_featured: false,
        })
        setImageFile(null)
        setImagePreview('')
        setCurrentImageUrl(null)
        setEditingId(null)
        setError('')
    }

    const openEditDialog = (brand: Brand) => {
        setEditingId(brand.id)
        setFormData({
            name: brand.name,
            is_featured: brand.is_featured,
        })
        setCurrentImageUrl(brand.logo_url)
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
                    .from('products') // Using 'products' bucket as per practice, ideally should be 'brands' if exists
                    .upload(filePath, imageFile)

                if (uploadError) {
                    console.error('[brands] Upload error:', uploadError)
                    setError('Error al subir el logo: ' + uploadError.message)
                    setSaving(false)
                    return
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('products')
                    .getPublicUrl(filePath)

                imageUrl = publicUrl
            }

            const brandData = {
                name: formData.name,
                logo_url: imageUrl,
                is_featured: formData.is_featured,
            }

            if (editingId) {
                // Update
                const { error: updateError } = await supabase
                    .from('brands')
                    .update(brandData)
                    .eq('id', editingId)

                if (updateError) {
                    throw updateError
                }
                toast.success('Marca actualizada correctamente')
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('brands')
                    .insert([brandData])

                if (insertError) {
                    throw insertError
                }
                toast.success('Marca creada correctamente')
            }

            resetForm()
            setDialogOpen(false)
            loadBrands()
        } catch (err: any) {
            console.error('[brands] Error saving brand:', err)
            setError('Error al guardar la marca: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta marca?')) return

        try {
            const { error } = await supabase
                .from('brands')
                .delete()
                .eq('id', id)

            if (error) {
                throw error
            }

            toast.success('Marca eliminada correctamente')
            loadBrands()
        } catch (err: any) {
            console.error('[brands] Delete error:', err)
            toast.error('Error al eliminar: ' + err.message)
        }
    }

    return (
        <div className="p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-semibold text-neutral-900 mb-2">
                            Marcas
                        </h1>
                        <p className="text-neutral-600">
                            Gestiona las marcas disponibles en la tienda
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
                                Nueva Marca
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-serif">
                                    {editingId ? 'Editar Marca' : 'Agregar Nueva Marca'}
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
                                        Nombre de la Marca *
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Chanel"
                                        required
                                        disabled={saving}
                                        className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="logo" className="text-neutral-700 font-medium">
                                        Logo de la Marca
                                    </Label>
                                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                                        {imagePreview || currentImageUrl ? (
                                            <div className="space-y-4">
                                                <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden border border-neutral-200 bg-white flex items-center justify-center">
                                                    <img
                                                        src={imagePreview || currentImageUrl || "/placeholder.svg"}
                                                        alt="Preview"
                                                        className="object-contain w-full h-full p-2"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setImageFile(null)
                                                        setImagePreview('')
                                                    }}
                                                    disabled={saving}
                                                >
                                                    Cambiar Logo
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <ImageIcon className="h-10 w-10 text-neutral-400 mx-auto" />
                                                <div>
                                                    <label
                                                        htmlFor="logo"
                                                        className="cursor-pointer text-amber-600 hover:text-amber-700 font-medium"
                                                    >
                                                        Subir logo
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                        <Input
                                            id="logo"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            disabled={saving}
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="is_featured"
                                        checked={formData.is_featured}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                                        disabled={saving}
                                    />
                                    <Label htmlFor="is_featured">Marca Destacada</Label>
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
                                            'Guardar'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Brands Table */}
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                        </div>
                    ) : brands.length === 0 ? (
                        <div className="text-center py-12">
                            <Tag className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-neutral-900 mb-1">
                                No hay marcas
                            </h3>
                            <p className="text-neutral-600 mb-6">
                                Agrega las marcas que vendes en tu tienda
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                                    <TableHead className="font-semibold text-neutral-700 w-24">Logo</TableHead>
                                    <TableHead className="font-semibold text-neutral-700">Nombre</TableHead>
                                    <TableHead className="font-semibold text-neutral-700">Destacada</TableHead>
                                    <TableHead className="font-semibold text-neutral-700 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {brands.map((brand) => (
                                    <TableRow key={brand.id} className="hover:bg-neutral-50">
                                        <TableCell>
                                            <div className="w-12 h-12 rounded-lg bg-white border border-neutral-200 flex items-center justify-center overflow-hidden">
                                                {brand.logo_url ? (
                                                    <img
                                                        src={brand.logo_url}
                                                        alt={brand.name}
                                                        className="object-contain w-full h-full p-1"
                                                    />
                                                ) : (
                                                    <Tag className="h-5 w-5 text-neutral-300" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-neutral-900">
                                            {brand.name}
                                        </TableCell>
                                        <TableCell>
                                            {brand.is_featured ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    Destacada
                                                </span>
                                            ) : (
                                                <span className="text-neutral-500 text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    onClick={() => openEditDialog(brand)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(brand.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
