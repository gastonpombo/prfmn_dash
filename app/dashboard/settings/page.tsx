'use client'

import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { SiteConfig } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ImageIcon, Settings, Upload } from 'lucide-react'
import { toast } from 'sonner'

// Schema de validación
const siteConfigSchema = z.object({
    announcement_message: z.string().optional(),
    welcome_title: z.string().min(1, 'El título es requerido'),
    welcome_subtitle: z.string().optional(),
    about_title: z.string().optional(),
    about_description: z.string().optional(),
    about_quote: z.string().optional(),
    about_quote_author: z.string().optional(),
    contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
    contact_whatsapp: z.string().optional(),
    contact_address: z.string().optional(),
})

type SiteConfigFormData = z.infer<typeof siteConfigSchema>

export default function SettingsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingHero, setUploadingHero] = useState(false)
    const [uploadingAbout, setUploadingAbout] = useState(false)

    const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null)
    const [aboutImageUrl, setAboutImageUrl] = useState<string | null>(null)
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
    const [aboutImageFile, setAboutImageFile] = useState<File | null>(null)
    const [heroPreview, setHeroPreview] = useState<string>('')
    const [aboutPreview, setAboutPreview] = useState<string>('')

    // Refs para los inputs de archivo
    const heroImageInputRef = useRef<HTMLInputElement>(null)
    const aboutImageInputRef = useRef<HTMLInputElement>(null)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SiteConfigFormData>({
        resolver: zodResolver(siteConfigSchema),
    })

    useEffect(() => {
        loadSiteConfig()
    }, [])

    const loadSiteConfig = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('site_config')
                .select('*')
                .eq('id', 1)
                .single()

            if (error) {
                console.error('[Settings] Error loading config:', error)
                toast.error('Error al cargar la configuración')
                return
            }

            if (data) {
                // Rellenar el formulario con los datos existentes
                reset({
                    announcement_message: data.announcement_message || '',
                    welcome_title: data.welcome_title || '',
                    welcome_subtitle: data.welcome_subtitle || '',
                    about_title: data.about_title || '',
                    about_description: data.about_description || '',
                    about_quote: data.about_quote || '',
                    about_quote_author: data.about_quote_author || '',
                    contact_email: data.contact_email || '',
                    contact_whatsapp: data.contact_whatsapp || '',
                    contact_address: data.contact_address || '',
                })

                // Guardar las URLs de las imágenes
                setHeroImageUrl(data.hero_image_url)
                setAboutImageUrl(data.about_image_url)
            }
        } catch (err) {
            console.error('[Settings] Unexpected error:', err)
            toast.error('Error inesperado al cargar la configuración')
        } finally {
            setLoading(false)
        }
    }

    const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setHeroImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setHeroPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleAboutImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAboutImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAboutPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const uploadImage = async (file: File, type: 'hero' | 'about'): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('[Settings] Upload error:', uploadError)
                toast.error(`Error al subir la imagen: ${uploadError.message}`)
                return null
            }

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('banners')
                .getPublicUrl(filePath)

            return publicUrl
        } catch (err) {
            console.error('[Settings] Unexpected upload error:', err)
            toast.error('Error inesperado al subir la imagen')
            return null
        }
    }

    const onSubmit = async (data: SiteConfigFormData) => {
        setSaving(true)

        try {
            let finalHeroImageUrl = heroImageUrl
            let finalAboutImageUrl = aboutImageUrl

            // Subir imagen del hero si hay una nueva
            if (heroImageFile) {
                setUploadingHero(true)
                const uploadedUrl = await uploadImage(heroImageFile, 'hero')
                if (uploadedUrl) {
                    finalHeroImageUrl = uploadedUrl
                } else {
                    setSaving(false)
                    setUploadingHero(false)
                    return
                }
                setUploadingHero(false)
            }

            // Subir imagen de about si hay una nueva
            if (aboutImageFile) {
                setUploadingAbout(true)
                const uploadedUrl = await uploadImage(aboutImageFile, 'about')
                if (uploadedUrl) {
                    finalAboutImageUrl = uploadedUrl
                } else {
                    setSaving(false)
                    setUploadingAbout(false)
                    return
                }
                setUploadingAbout(false)
            }

            // Actualizar la configuración en la base de datos
            const { error: updateError } = await supabase
                .from('site_config')
                .update({
                    announcement_message: data.announcement_message || null,
                    welcome_title: data.welcome_title,
                    welcome_subtitle: data.welcome_subtitle || null,
                    about_title: data.about_title || null,
                    about_description: data.about_description || null,
                    about_quote: data.about_quote || null,
                    about_quote_author: data.about_quote_author || null,
                    contact_email: data.contact_email || null,
                    contact_whatsapp: data.contact_whatsapp || null,
                    contact_address: data.contact_address || null,
                    hero_image_url: finalHeroImageUrl,
                    about_image_url: finalAboutImageUrl,
                })
                .eq('id', 1)

            if (updateError) {
                console.error('[Settings] Update error:', updateError)
                toast.error('Error al guardar la configuración')
                setSaving(false)
                return
            }

            // Actualizar el estado local
            setHeroImageUrl(finalHeroImageUrl)
            setAboutImageUrl(finalAboutImageUrl)
            setHeroImageFile(null)
            setAboutImageFile(null)
            setHeroPreview('')
            setAboutPreview('')

            toast.success('Configuración guardada correctamente')
        } catch (err) {
            console.error('[Settings] Unexpected error:', err)
            toast.error('Error inesperado al guardar')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Settings className="h-8 w-8 text-amber-600" />
                        <h1 className="text-3xl font-serif font-semibold text-neutral-900">
                            Configuración del Sitio
                        </h1>
                    </div>
                    <p className="text-neutral-600">
                        Edita los textos e imágenes de la Landing Page sin tocar código
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Sección Hero */}
                    <Card className="border-neutral-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-serif text-neutral-900">
                                Sección Hero (Banner Principal)
                            </CardTitle>
                            <CardDescription>
                                Configura el mensaje de bienvenida y el banner principal
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="announcement_message" className="text-neutral-700 font-medium">
                                    Mensaje de Barra Superior
                                </Label>
                                <Input
                                    id="announcement_message"
                                    {...register('announcement_message')}
                                    placeholder="Ej: ¡Envío gratis en compras mayores a $50!"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.announcement_message && (
                                    <p className="text-sm text-red-600">{errors.announcement_message.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="welcome_title" className="text-neutral-700 font-medium">
                                    Título Principal *
                                </Label>
                                <Input
                                    id="welcome_title"
                                    {...register('welcome_title')}
                                    placeholder="Ej: Descubre tu Fragancia Perfecta"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.welcome_title && (
                                    <p className="text-sm text-red-600">{errors.welcome_title.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="welcome_subtitle" className="text-neutral-700 font-medium">
                                    Subtítulo
                                </Label>
                                <Input
                                    id="welcome_subtitle"
                                    {...register('welcome_subtitle')}
                                    placeholder="Ej: Perfumes de alta calidad para cada ocasión"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.welcome_subtitle && (
                                    <p className="text-sm text-red-600">{errors.welcome_subtitle.message}</p>
                                )}
                            </div>

                            {/* Banner Principal */}
                            <div className="space-y-2">
                                <Label className="text-neutral-700 font-medium">
                                    Banner Principal
                                </Label>
                                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                                    {heroPreview || heroImageUrl ? (
                                        <div className="space-y-4">
                                            <div className="relative w-full h-48 mx-auto rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                                                <img
                                                    src={heroPreview || heroImageUrl || "/placeholder.svg"}
                                                    alt="Hero Preview"
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setHeroImageFile(null)
                                                    setHeroPreview('')
                                                    heroImageInputRef.current?.click()
                                                }}
                                                disabled={saving}
                                            >
                                                Cambiar Imagen
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <Upload className="h-12 w-12 text-neutral-400 mx-auto" />
                                            <div>
                                                <label
                                                    htmlFor="hero_image"
                                                    className="cursor-pointer text-amber-600 hover:text-amber-700 font-medium"
                                                >
                                                    Seleccionar imagen del banner
                                                </label>
                                                <p className="text-sm text-neutral-500 mt-1">
                                                    PNG, JPG hasta 5MB (Recomendado: 1920x600px)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <Input
                                        ref={heroImageInputRef}
                                        id="hero_image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleHeroImageChange}
                                        disabled={saving}
                                        className="hidden"
                                    />
                                </div>
                                {uploadingHero && (
                                    <p className="text-sm text-amber-600 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Subiendo imagen del banner...
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sección Sobre Mí */}
                    <Card className="border-neutral-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-serif text-neutral-900">
                                Sección Sobre Mí
                            </CardTitle>
                            <CardDescription>
                                Cuéntale a tus clientes sobre tu negocio
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="about_title" className="text-neutral-700 font-medium">
                                    Título de la Sección
                                </Label>
                                <Input
                                    id="about_title"
                                    {...register('about_title')}
                                    placeholder="Ej: Sobre Nosotros"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.about_title && (
                                    <p className="text-sm text-red-600">{errors.about_title.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="about_description" className="text-neutral-700 font-medium">
                                    Descripción
                                </Label>
                                <Textarea
                                    id="about_description"
                                    {...register('about_description')}
                                    placeholder="Escribe una descripción detallada sobre tu negocio, tu pasión por los perfumes, tu experiencia..."
                                    rows={6}
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.about_description && (
                                    <p className="text-sm text-red-600">{errors.about_description.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="about_quote" className="text-neutral-700 font-medium">
                                    Frase Inspiradora
                                </Label>
                                <Input
                                    id="about_quote"
                                    {...register('about_quote')}
                                    placeholder="Ej: La elegancia es la única belleza que nunca se desvanece"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.about_quote && (
                                    <p className="text-sm text-red-600">{errors.about_quote.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="about_quote_author" className="text-neutral-700 font-medium">
                                    Autor de la Frase
                                </Label>
                                <Input
                                    id="about_quote_author"
                                    {...register('about_quote_author')}
                                    placeholder="Ej: Coco Chanel"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.about_quote_author && (
                                    <p className="text-sm text-red-600">{errors.about_quote_author.message}</p>
                                )}
                            </div>

                            {/* Foto Sobre Mí */}
                            <div className="space-y-2">
                                <Label className="text-neutral-700 font-medium">
                                    Foto de la Sección
                                </Label>
                                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                                    {aboutPreview || aboutImageUrl ? (
                                        <div className="space-y-4">
                                            <div className="relative w-full h-48 mx-auto rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                                                <img
                                                    src={aboutPreview || aboutImageUrl || "/placeholder.svg"}
                                                    alt="About Preview"
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setAboutImageFile(null)
                                                    setAboutPreview('')
                                                    aboutImageInputRef.current?.click()
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
                                                    htmlFor="about_image"
                                                    className="cursor-pointer text-amber-600 hover:text-amber-700 font-medium"
                                                >
                                                    Seleccionar imagen
                                                </label>
                                                <p className="text-sm text-neutral-500 mt-1">
                                                    PNG, JPG hasta 5MB (Recomendado: 800x600px)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <Input
                                        ref={aboutImageInputRef}
                                        id="about_image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAboutImageChange}
                                        disabled={saving}
                                        className="hidden"
                                    />
                                </div>
                                {uploadingAbout && (
                                    <p className="text-sm text-amber-600 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Subiendo imagen...
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sección Contacto */}
                    <Card className="border-neutral-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-serif text-neutral-900">
                                Información de Contacto
                            </CardTitle>
                            <CardDescription>
                                Datos de contacto que aparecerán en el sitio
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact_email" className="text-neutral-700 font-medium">
                                    Email de Contacto
                                </Label>
                                <Input
                                    id="contact_email"
                                    type="email"
                                    {...register('contact_email')}
                                    placeholder="contacto@tuperfumeria.com"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.contact_email && (
                                    <p className="text-sm text-red-600">{errors.contact_email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact_whatsapp" className="text-neutral-700 font-medium">
                                    WhatsApp
                                </Label>
                                <Input
                                    id="contact_whatsapp"
                                    {...register('contact_whatsapp')}
                                    placeholder="+54 9 11 1234-5678"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.contact_whatsapp && (
                                    <p className="text-sm text-red-600">{errors.contact_whatsapp.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact_address" className="text-neutral-700 font-medium">
                                    Dirección
                                </Label>
                                <Input
                                    id="contact_address"
                                    {...register('contact_address')}
                                    placeholder="Av. Ejemplo 1234, Buenos Aires, Argentina"
                                    className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                                {errors.contact_address && (
                                    <p className="text-sm text-red-600">{errors.contact_address.message}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Botón Guardar */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={saving || uploadingHero || uploadingAbout}
                            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-500/20 px-8"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Configuración'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
