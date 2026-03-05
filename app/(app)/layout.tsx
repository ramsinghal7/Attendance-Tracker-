import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  const userName = profile?.name || user.email?.split('@')[0] || 'Student'

  return (
    <div className="flex min-h-screen min-h-dvh bg-[#060910]">
      <Sidebar userName={userName} />
      <main className="flex-1 min-w-0">
        <div className="gradient-bg min-h-screen min-h-dvh pb-20 lg:pb-0">
          {children}
        </div>
      </main>
    </div>
  )
}