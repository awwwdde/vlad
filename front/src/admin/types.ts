// Зеркало pydantic-схем back/schemas.py — держим вручную (без кодогенерации),
// благо API маленький; при расхождении руками синхронизировать.

export type ProjectStatus =
  | 'created'
  | 'building'
  | 'deploying'
  | 'running'
  | 'stopped'
  | 'failed'

export interface Project {
  id: number
  slug: string
  title: string | null
  source: string | null
  status: ProjectStatus
  last_error: string | null
  domain: string
  created_at: string
  deployed_at: string | null
}

export interface ActionResult {
  ok: boolean
  project: Project
  message: string | null
}

export interface User {
  id: number
  email: string
  is_active: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_at: string
  user: User
}

export interface I18nBundle {
  title: string
  tagline: string
  desc: string
  tags: string[]
}

export interface PortfolioItem {
  id: number
  slug: string
  order_index: number
  link: string | null
  image_url: string | null
  accent: string | null
  ru: I18nBundle
  en: I18nBundle
  created_at: string
  updated_at: string
}

// Поля, которые отправляются на бек в POST/PUT.
export type PortfolioItemPayload = Omit<
  PortfolioItem,
  'id' | 'order_index' | 'created_at' | 'updated_at'
>

export interface ContactMessage {
  id: number
  name: string | null
  email: string
  message: string | null
  budget: string | null
  source: string
  ip: string | null
  user_agent: string | null
  is_read: boolean
  created_at: string
}

