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
  active_config?: Partial<DeployOptions>
  app_container?: string | null
  image_tag?: string | null
  deploy_config?: DeployOptions
}

export interface DeployOptions {
  git_branch: string
  context_dir: string
  dockerfile: string
  app_port: number | null
  health_path: string
  health_timeout: number
  health_interval: number
  health_status: number
  memory_mb: number | null
  cpus: number | null
  pids_limit: number | null
  restart_policy: 'unless-stopped' | 'on-failure' | 'no'
  start_command: string[]
  no_cache: boolean
  pull_base_image: boolean
  database_enabled: boolean
}

export interface Deployment {
  id: number
  status: string
  stage: string
  revision: string | null
  error: string | null
  started_at: string
  finished_at: string | null
}

export interface DeploymentLog {
  id: number
  at: string
  level: string
  stage: string
  message: string
}

export interface DeploymentLogPage {
  deployment: Deployment
  lines: DeploymentLog[]
  next_cursor: number
  has_more: boolean
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
  client?: string
  year?: string
  role?: string
  duration?: string
  challenge?: string
  approach?: string
  outcome?: string
  deliverables?: string[]
  steps?: { title: string; body: string }[]
  gallery_captions?: string[]
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
  warning?: string | null
  last_sample_at?: string | null
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
  warning?: string | null
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
  cpu_percent: number | null
  mem_bytes: number | null
  last_sample_at?: string | null
  state: string | null
  restarts: number
  /** Причина попадания в «требует внимания»; null — стенд в порядке. */
  attention: string | null
}

export interface MetricsOverview {
  warning?: string | null
  at: string
  projects_total: number
  projects_running: number
  cpu_percent_total: number | null
  mem_bytes_total: number | null
  projects: ProjectLoad[]
}
