'use client'

import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { SiteConfig, StoreSettings } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
    Loader2, ImageIcon, Settings, Upload, Save, Monitor, Smartphone, Palette, Info,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Schema ──────────────────────────────────────────────────────────────────

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

// ─── Image Dropzone ───────────────────────────────────────────────────────────

function ImageDropzone({
    id,
    label,
    preview,
    existingUrl,
    recommendation,
    disabled,
    onChange,
    onReplace,
}: {
    id: string
    label: string
    preview: string
    existingUrl: string | null | undefined
    recommendation: string
    disabled: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onReplace?: () => void
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const current = preview || existingUrl

    return (
        <div className="space-y-2">
            <Label className="text-neutral-700 font-medium">{label}</Label>
            <div
                className="border-2 border-dashed border-neutral-300 rounded-lg p-5 text-center hover:border-amber-400 transition-colors cursor-pointer"
                onClick={() => !current && inputRef.current?.click()}
            >
                {current ? (
                    <div className="space-y-3">
                        <div className="relative w-full h-44 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                            <img src={current} alt={label} className="object-cover w-full h-full" />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation()
                                onReplace?.()
                                inputRef.current?.click()
                            }}
                            disabled={disabled}
                        >
                            Cambiar imagen
                        </Button>
                    </div>
                ) : (
                    <div className="py-4 space-y-2">
                        <Upload className="h-10 w-10 text-neutral-400 mx-auto" />
                        <p className="text-sm text-amber-600 font-medium cursor-pointer hover:text-amber-700">
                            Seleccionar imagen
                        </p>
                        <p className="text-xs text-neutral-400">{recommendation}</p>
                    </div>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept="image/*"
                    onChange={onChange}
                    disabled={disabled}
                    className="hidden"
                />
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const supabase = createClient()

    // ── Contenido state ──────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true)
    const [savingContent, setSavingContent] = useState(false)
    const [uploadingAbout, setUploadingAbout] = useState(false)
    const [aboutImageUrl, setAboutImageUrl] = useState<string | null>(null)
    const [aboutImageFile, setAboutImageFile] = useState<File | null>(null)
    const [aboutPreview, setAboutPreview] = useState('')

    const { register, handleSubmit, reset, formState: { errors } } = useForm<SiteConfigFormData>({
        resolver: zodResolver(siteConfigSchema),
    })
    const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null)
    const [savingAppearance, setSavingAppearance] = useState(false)
    const [desktopFile, setDesktopFile] = useState<File | null>(null)
    const [desktopPreview, setDesktopPreview] = useState('')
    const [mobileFile, setMobileFile] = useState<File | null>(null)
    const [mobilePreview, setMobilePreview] = useState('')

    // ─────────────────────────────────────────────────────────────────────────
    // Load both on mount
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        Promise.all([loadSiteConfig(), loadStoreSettings()])
            .finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadSiteConfig = async () => {
        const { data, error } = await supabase
            .from('site_config').select('*').eq('id', 1).single()
        if (error) { toast.error('Error al cargar la configuración de contenido'); return }
        if (data) {
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
            setHeroImageUrl(data.hero_image_url)
            setAboutImageUrl(data.about_image_url)
        }
    }

    const loadStoreSettings = async () => {
        const { data, error } = await supabase.from('store_settings').select('*').single()
        if (error && error.code !== 'PGRST116') {
            toast.error('Error al cargar la configuración de apariencia')
        } else if (data) {
            setStoreSettings(data)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    const previewFile = (
        file: File,
        setPreview: (s: string) => void
    ) => {
        const reader = new FileReader()
        reader.onloadend = () => setPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const uploadToStorage = async (
        file: File,
        bucket: string,
        path: string
    ): Promise<string | null> => {
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
        if (error) { toast.error(`Error al subir imagen: ${error.message}`); return null }
        return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Save Contenido (site_config)
    // ─────────────────────────────────────────────────────────────────────────

    const onSubmitContent = async (data: SiteConfigFormData) => {
        setSavingContent(true)
        try {
            let finalHeroUrl = heroImageUrl
            let finalAboutUrl = aboutImageUrl

            if (heroImageFile) {
                setUploadingHero(true)
                const ext = heroImageFile.name.split('.').pop()
                finalHeroUrl = await uploadToStorage(heroImageFile, 'banners', `hero_${Date.now()}.${ext}`)
                setUploadingHero(false)
                if (!finalHeroUrl) { setSavingContent(false); return }
            }

            if (aboutImageFile) {
                setUploadingAbout(true)
                const ext = aboutImageFile.name.split('.').pop()
                finalAboutUrl = await uploadToStorage(aboutImageFile, 'banners', `about_${Date.now()}.${ext}`)
                setUploadingAbout(false)
                if (!finalAboutUrl) { setSavingContent(false); return }
            }

            const { error } = await supabase.from('site_config').update({
                ...data,
                announcement_message: data.announcement_message || null,
                welcome_subtitle: data.welcome_subtitle || null,
                about_title: data.about_title || null,
                about_description: data.about_description || null,
                about_quote: data.about_quote || null,
                about_quote_author: data.about_quote_author || null,
                contact_email: data.contact_email || null,
                contact_whatsapp: data.contact_whatsapp || null,
                contact_address: data.contact_address || null,
                hero_image_url: finalHeroUrl,
                about_image_url: finalAboutUrl,
            }).eq('id', 1)

            if (error) { toast.error('Error al guardar el contenido'); return }

            setHeroImageUrl(finalHeroUrl)
            setAboutImageUrl(finalAboutUrl)
            setHeroImageFile(null); setHeroPreview('')
            setAboutImageFile(null); setAboutPreview('')
            toast.success('Contenido guardado correctamente')
        } catch (err: any) {
            toast.error(`Error inesperado: ${err.message}`)
        } finally {
            setSavingContent(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Save Apariencia (store_settings)
    // ─────────────────────────────────────────────────────────────────────────

    const onSubmitAppearance = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!storeSettings) return
        setSavingAppearance(true)
        try {
            let desktopUrl = storeSettings.hero_img_desktop
            let mobileUrl = storeSettings.hero_img_mobile

            if (desktopFile) {
                const ext = desktopFile.name.split('.').pop()
                desktopUrl = await uploadToStorage(desktopFile, 'products', `hero/desktop_${Date.now()}.${ext}`)
                if (!desktopUrl) { setSavingAppearance(false); return }
            }

            if (mobileFile) {
                const ext = mobileFile.name.split('.').pop()
                mobileUrl = await uploadToStorage(mobileFile, 'products', `hero/mobile_${Date.now()}.${ext}`)
                if (!mobileUrl) { setSavingAppearance(false); return }
            }

            const { error } = await supabase.from('store_settings').upsert({
                id: 1,
                hero_img_desktop: desktopUrl,
                hero_img_mobile: mobileUrl,
                hero_overlay_opacity: storeSettings.hero_overlay_opacity,
            })

            if (error) { toast.error('Error al guardar la apariencia'); return }

            setDesktopFile(null); setDesktopPreview('')
            setMobileFile(null); setMobilePreview('')
            toast.success('Apariencia guardada correctamente')
            loadStoreSettings()
        } catch (err: any) {
            toast.error(`Error inesperado: ${err.message}`)
        } finally {
            setSavingAppearance(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <Settings className="h-7 w-7 text-amber-600" />
                        <h1 className="text-3xl font-serif font-bold text-neutral-900">
                            Configuración
                        </h1>
                    </div>
                    <p className="text-neutral-500 text-sm ml-10">
                        Edita textos, imágenes y apariencia visual de la tienda sin tocar código.
                    </p>
                </div>

                <Tabs defaultValue="content">
                    <TabsList className="mb-6 bg-neutral-100 p-1 rounded-lg">
                        <TabsTrigger
                            value="content"
                            className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                            <Settings className="h-4 w-4" />
                            Contenido
                        </TabsTrigger>
                        <TabsTrigger
                            value="appearance"
                            className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                            <Palette className="h-4 w-4" />
                            Apariencia Visual
                        </TabsTrigger>
                    </TabsList>

                    {/* ── TAB: CONTENIDO ──────────────────────────────────────── */}
                    <TabsContent value="content">
                        <form onSubmit={handleSubmit(onSubmitContent)} className="space-y-6">

                            {/* Hero / Banner */}
                            <Card className="border-neutral-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl font-serif text-neutral-900">
                                        Sección Hero (Banner Principal)
                                    </CardTitle>
                                    <CardDescription>
                                        Barra de anuncio, título y subtítulo del sitio
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
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="welcome_title" className="text-neutral-700 font-medium">
                                                Título Principal *
                                            </Label>
                                            <Input
                                                id="welcome_title"
                                                {...register('welcome_title')}
                                                placeholder="Descubre tu Fragancia Perfecta"
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
                                                placeholder="Perfumes de alta calidad"
                                                className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20"
                                            />
                                        </div>
                                    </div>

                                    {/* Banner image for site_config */}
                                    <ImageDropzone
                                        id="hero_image_content"
                                        label="Imagen de Fondo del Hero (site_config)"
                                        preview={heroPreview}
                                        existingUrl={heroImageUrl}
                                        recommendation="PNG, JPG hasta 5MB · 1920×600px recomendado"
                                        disabled={savingContent}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) { setHeroImageFile(file); previewFile(file, setHeroPreview) }
                                        }}
                                        onReplace={() => { setHeroImageFile(null); setHeroPreview('') }}
                                    />
                                    {uploadingHero && (
                                        <p className="text-sm text-amber-600 flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo banner...
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Sobre Mí */}
                            <Card className="border-neutral-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl font-serif text-neutral-900">Sección Sobre Mí</CardTitle>
                                    <CardDescription>Cuéntale a tus clientes sobre tu negocio</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="about_title" className="text-neutral-700 font-medium">Título</Label>
                                        <Input id="about_title" {...register('about_title')} placeholder="Sobre Nosotros"
                                            className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="about_description" className="text-neutral-700 font-medium">Descripción</Label>
                                        <Textarea id="about_description" {...register('about_description')} rows={5}
                                            placeholder="Tu historia, pasión por los perfumes, experiencia..."
                                            className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="about_quote" className="text-neutral-700 font-medium">Frase Inspiradora</Label>
                                            <Input id="about_quote" {...register('about_quote')}
                                                placeholder="La elegancia es la única belleza que nunca se desvanece"
                                                className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="about_quote_author" className="text-neutral-700 font-medium">Autor</Label>
                                            <Input id="about_quote_author" {...register('about_quote_author')}
                                                placeholder="Coco Chanel"
                                                className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20" />
                                        </div>
                                    </div>
                                    <ImageDropzone
                                        id="about_image"
                                        label="Foto de la Sección"
                                        preview={aboutPreview}
                                        existingUrl={aboutImageUrl}
                                        recommendation="PNG, JPG hasta 5MB · 800×600px recomendado"
                                        disabled={savingContent}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) { setAboutImageFile(file); previewFile(file, setAboutPreview) }
                                        }}
                                        onReplace={() => { setAboutImageFile(null); setAboutPreview('') }}
                                    />
                                    {uploadingAbout && (
                                        <p className="text-sm text-amber-600 flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo imagen...
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Contacto */}
                            <Card className="border-neutral-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl font-serif text-neutral-900">Información de Contacto</CardTitle>
                                    <CardDescription>Datos de contacto que aparecerán en el sitio</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="contact_email" className="text-neutral-700 font-medium">Email</Label>
                                            <Input id="contact_email" type="email" {...register('contact_email')}
                                                placeholder="contacto@tuperfumeria.com"
                                                className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20" />
                                            {errors.contact_email && <p className="text-sm text-red-600">{errors.contact_email.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contact_whatsapp" className="text-neutral-700 font-medium">WhatsApp</Label>
                                            <Input id="contact_whatsapp" {...register('contact_whatsapp')}
                                                placeholder="+54 9 11 1234-5678"
                                                className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contact_address" className="text-neutral-700 font-medium">Dirección</Label>
                                        <Input id="contact_address" {...register('contact_address')}
                                            placeholder="Av. Ejemplo 1234, Buenos Aires, Argentina"
                                            className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20" />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    disabled={savingContent || uploadingHero || uploadingAbout}
                                    className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-500/20 px-8 gap-2"
                                >
                                    {savingContent
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                                        : <><Save className="h-4 w-4" /> Guardar Contenido</>}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* ── TAB: APARIENCIA VISUAL ──────────────────────────────── */}
                    <TabsContent value="appearance">
                        <form onSubmit={onSubmitAppearance} className="space-y-6">
                            {storeSettings ? (
                                <>
                                    {/* Hero Desktop */}
                                    <Card className="border-neutral-200 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-xl font-serif text-neutral-900">
                                                <Monitor className="h-5 w-5 text-amber-600" /> Hero Desktop
                                            </CardTitle>
                                            <CardDescription>
                                                Imagen de fondo del hero en pantallas grandes. Recomendado: 1920×1080px
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ImageDropzone
                                                id="desktop_hero"
                                                label=""
                                                preview={desktopPreview}
                                                existingUrl={storeSettings.hero_img_desktop}
                                                recommendation="PNG, JPG · 1920×1080px o superior"
                                                disabled={savingAppearance}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) { setDesktopFile(file); previewFile(file, setDesktopPreview) }
                                                }}
                                                onReplace={() => { setDesktopFile(null); setDesktopPreview('') }}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Hero Mobile */}
                                    <Card className="border-neutral-200 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-xl font-serif text-neutral-900">
                                                <Smartphone className="h-5 w-5 text-amber-600" /> Hero Mobile
                                            </CardTitle>
                                            <CardDescription>
                                                Imagen optimizada para teléfonos. Recomendado: 1080×1920px (vertical)
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ImageDropzone
                                                id="mobile_hero"
                                                label=""
                                                preview={mobilePreview}
                                                existingUrl={storeSettings.hero_img_mobile}
                                                recommendation="PNG, JPG · 1080×1920px (portrait)"
                                                disabled={savingAppearance}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) { setMobileFile(file); previewFile(file, setMobilePreview) }
                                                }}
                                                onReplace={() => { setMobileFile(null); setMobilePreview('') }}
                                            />
                                        </CardContent>
                                    </Card>

                                    {/* Overlay */}
                                    <Card className="border-neutral-200 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-xl font-serif text-neutral-900">
                                                Opacidad de la Capa Oscura
                                            </CardTitle>
                                            <CardDescription>
                                                Ajusta qué tan oscura se ve la imagen para mejorar la legibilidad del texto.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-6">
                                                <div className="flex-1">
                                                    <Slider
                                                        value={[storeSettings.hero_overlay_opacity]}
                                                        max={100}
                                                        step={1}
                                                        onValueChange={(val) =>
                                                            setStoreSettings({ ...storeSettings, hero_overlay_opacity: val[0] })
                                                        }
                                                    />
                                                </div>
                                                <div className="w-16 text-right font-mono font-medium text-neutral-900 border border-neutral-200 rounded px-2 py-1 text-sm">
                                                    {storeSettings.hero_overlay_opacity}%
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="flex justify-end pt-2">
                                        <Button
                                            type="submit"
                                            disabled={savingAppearance}
                                            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-500/20 px-8 gap-2"
                                        >
                                            {savingAppearance
                                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                                                : <><Save className="h-4 w-4" /> Guardar Apariencia</>}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <Card className="border-neutral-200 shadow-sm">
                                    <CardContent className="text-center py-12 space-y-4">
                                        <ImageIcon className="h-12 w-12 text-neutral-300 mx-auto" />
                                        <p className="text-neutral-500">No se encontró la configuración de apariencia.</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStoreSettings({
                                                id: 1,
                                                hero_img_desktop: null,
                                                hero_img_mobile: null,
                                                hero_overlay_opacity: 50
                                            })}
                                        >
                                            Inicializar configuración
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </form>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
