import { redirect } from 'next/navigation'

/**
 * The Appearance settings were merged into /dashboard/settings
 * under the "Apariencia Visual" tab. Redirect permanently.
 */
export default function AppearancePage() {
    redirect('/dashboard/settings')
}
