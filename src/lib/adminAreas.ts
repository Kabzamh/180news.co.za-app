export type AdminArea = 'account' | 'write' | 'tools' | 'team'

export function areaForPath(pathname: string): AdminArea | null {
  const path = pathname.split(/[?#]/)[0]
  if (path === '/admin') return 'account'
  if (path === '/submit') return 'write'
  if (path === '/admin/team') return 'team'
  if (path === '/control' || path.startsWith('/admin/')) return 'tools'
  return null
}

const OWNER_AREAS: AdminArea[] = ['account', 'write', 'tools', 'team']
const EDITOR_AREAS: AdminArea[] = ['write', 'tools']
const REPORTER_AREAS: AdminArea[] = ['write']

export function roleCanArea(role: 'owner' | 'editor' | 'reporter', area: AdminArea): boolean {
  if (role === 'owner') return OWNER_AREAS.includes(area)
  if (role === 'editor') return EDITOR_AREAS.includes(area)
  return REPORTER_AREAS.includes(area)
}
