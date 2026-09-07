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
  custom_domains: string[]
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
  /** Галерея, по порядку показа. Первая — обложка карточки на главной. */
  images: string[]
  image_url: string | null
  accent: string | null
  ru: I18nBundle
  en: I18nBundle
  created_at: string
  updated_at: string
}

// Поля, которые отправляются на бек в POST/PUT.
// images в форму не входит: галерея живёт отдельными эндпоинтами, иначе
// сохранение текстов затирало бы загруженные картинки.
export type PortfolioItemPayload = Omit<
  PortfolioItem,
  'id' | 'order_index' | 'created_at' | 'updated_at' | 'images'
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

export interface EnvVar {
  key: string
  value_preview: string
  updated_at: string
}

export interface EnvVarReveal {
  key: string
  value: string
}


// ── Нагрузка гостевых стендов ────────────────────────────────────────────────
// Зеркало схем back/schemas.py: MetricsOut, ProjectHealthOut, OverviewOut.

export type MetricRange = '1h' | '24h' | '7d' | '30d'

export interface MetricPoint {
  t: string
  cpu: number
  /** Пик за корзину. Есть только у часовых срезов: у сырых замеров точка и
   *  есть значение, пику взяться неоткуда. */
  cpu_max: number | null
  mem: number
  mem_limit: number | null
  /** Прирост за интервал, а не показание счётчика. */
  net_rx: number
  net_tx: number
}

export interface MetricSeries {
  /** 'app' или 'db'. */
  container: string
  points: MetricPoint[]
}

export interface Metrics {
  slug: string
  range: MetricRange
  resolution: 'raw' | 'hourly'
  step_seconds: number
  series: MetricSeries[]
}

export interface HealthEvent {
  at: string
  state: string
  restarts: number
}

export interface ProjectHealth {
  slug: string
  state: string | null
  restarts: number
  uptime_percent: number | null
  db_size_bytes: number | null
  events: HealthEvent[]
}

export interface ProjectLoad {
  slug: string
  title: string | null
  status: ProjectStatus
  cpu_percent: number
  mem_bytes: number
  state: string | null
  restarts: number
  /** Причина попадания в «требует внимания»; null — стенд в порядке. */
  attention: string | null
}

export interface MetricsOverview {
  at: string
  projects_total: number
  projects_running: number
  cpu_percent_total: number
  mem_bytes_total: number
  projects: ProjectLoad[]
}
