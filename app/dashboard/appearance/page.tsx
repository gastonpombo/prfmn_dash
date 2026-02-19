'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StoreSettings } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ImageIcon, Save, Monitor, Smartphone } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'

export default function AppearancePage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [settings, setSettings] = useState<StoreSettings | null>(null)

    const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null)
    const [desktopPreview, setDesktopPreview] = useState<string>('')

    const [mobileImageFile, setMobileImageFile] = useState<File | null>(null)
    const [mobilePreview, setMobilePreview] = useState<string>('')

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('store_settings')
            .select('*')
            .single()

        if (error) {
            // If not found, we might need to handle initial creation or just show error.
            // Assuming row with id=1 exists as per prompt implies update.
            // But good to be safe.
            console.error('[appearance] Error loading settings:', error)
            if (error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
                toast.error('Error al cargar la configuración')
            }
        } else {
            setSettings(data)
        }
        setLoading(false)
    }

    const handleImageChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setFile: (f: File | null) => void,
        setPreview: (s: string) => void
    ) => {
        const file = e.target.files?.[0]
        if (file) {
            setFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!settings) return

        setError('')
        setSaving(true)

        try {
            let desktopUrl = settings.hero_img_desktop
            let mobileUrl = settings.hero_img_mobile

            // Upload Desktop Image
            if (desktopImageFile) {
                const fileExt = desktopImageFile.name.split('.').pop()
                const fileName = `hero_desktop_${Date.now()}.${fileExt}`
                const filePath = `hero/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('products') // Using 'products' bucket generally or maybe a 'site-assets' if available
                    .upload(filePath, desktopImageFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('products')
                    .getPublicUrl(filePath)

                desktopUrl = publicUrl
            }

            // Upload Mobile Image
            if (mobileImageFile) {
                const fileExt = mobileImageFile.name.split('.').pop()
                const fileName = `hero_mobile_${Date.now()}.${fileExt}`
                const filePath = `hero/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('products')
                    .upload(filePath, mobileImageFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('products')
                    .getPublicUrl(filePath)

                mobileUrl = publicUrl
            }

            // Update Database
            const updateData = {
                hero_img_desktop: desktopUrl,
                hero_img_mobile: mobileUrl,
                hero_overlay_opacity: settings.hero_overlay_opacity,
            }

            // Update Database using UPSERT to handle both create and update
            const { error: upsertError } = await supabase
                .from('store_settings')
                .upsert({ id: 1, ...updateData })

            if (upsertError) throw upsertError

            toast.success('Apariencia actualizada correctamente')

            // Reset file inputs
            setDesktopImageFile(null)
            setDesktopPreview('')
            setMobileImageFile(null)
            setMobilePreview('')
            loadSettings()

        } catch (err: any) {
            console.error('[appearance] Error saving settings:', err)
            setError('Error al guardar la configuración: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-semibold text-neutral-900 mb-2">
                            Apariencia
                        </h1>
                        <p className="text-neutral-600">
                            Personaliza la imagen principal y el estilo de la tienda
                        </p>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving || !settings}
                        className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-500/20 gap-2"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {settings ? (
                    <div className="space-y-8">
                        {/* Desktop Hero */}
                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <Monitor className="h-5 w-5 text-amber-600" />
                                <h2 className="text-lg font-semibold text-neutral-900">Hero Desktop</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors h-64 flex flex-col items-center justify-center">
                                        {desktopPreview || settings.hero_img_desktop ? (
                                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded">
                                                <img
                                                    src={desktopPreview || settings.hero_img_desktop || "/placeholder.svg"}
                                                    alt="Hero Desktop"
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                        ) : (
                                            <ImageIcon className="h-12 w-12 text-neutral-400 mb-2" />
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <Label htmlFor="desktop-hero" className="cursor-pointer inline-flex items-center justify-center w-full px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50">
                                            Cambiar Imagen Desktop
                                        </Label>
                                        <Input
                                            id="desktop-hero"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageChange(e, setDesktopImageFile, setDesktopPreview)}
                                        />
                                    </div>
                                </div>
                                <div className="text-sm text-neutral-600 space-y-2">
                                    <p><strong>Recomendación:</strong> 1920x1080px o superior.</p>
                                    <p>Esta imagen se mostrará en pantallas grandes (laptops, monitores).</p>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Hero */}
                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <Smartphone className="h-5 w-5 text-amber-600" />
                                <h2 className="text-lg font-semibold text-neutral-900">Hero Mobile</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors h-64 flex flex-col items-center justify-center">
                                        {mobilePreview || settings.hero_img_mobile ? (
                                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded">
                                                <img
                                                    src={mobilePreview || settings.hero_img_mobile || "/placeholder.svg"}
                                                    alt="Hero Mobile"
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                        ) : (
                                            <ImageIcon className="h-12 w-12 text-neutral-400 mb-2" />
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <Label htmlFor="mobile-hero" className="cursor-pointer inline-flex items-center justify-center w-full px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50">
                                            Cambiar Imagen Mobile
                                        </Label>
                                        <Input
                                            id="mobile-hero"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageChange(e, setMobileImageFile, setMobilePreview)}
                                        />
                                    </div>
                                </div>
                                <div className="text-sm text-neutral-600 space-y-2">
                                    <p><strong>Recomendación:</strong> 1080x1920px (Vertical/Portrait).</p>
                                    <p>Esta imagen se optimizará para teléfonos móviles.</p>
                                </div>
                            </div>
                        </div>

                        {/* Overlay Opacity */}
                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-neutral-900">Opacidad de la Capa Oscura</h2>
                                <p className="text-sm text-neutral-500">Ajusta qué tan oscura se ve la imagen para mejorar la legibilidad del texto.</p>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <Slider
                                        value={[settings.hero_overlay_opacity]}
                                        max={100}
                                        step={1}
                                        onValueChange={(val) => setSettings({ ...settings, hero_overlay_opacity: val[0] })}
                                    />
                                </div>
                                <div className="w-16 text-right font-mono font-medium text-neutral-900 border border-neutral-200 rounded px-2 py-1">
                                    {settings.hero_overlay_opacity}%
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                        <p>No se encontró la configuración de la tienda. (ID 1)</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setSettings({ id: 1, hero_img_desktop: null, hero_img_mobile: null, hero_overlay_opacity: 50 })}
                        >
                            Inicializar Configuración
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
