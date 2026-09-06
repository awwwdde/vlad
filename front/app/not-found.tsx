import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1920px] flex-col justify-center px-5 md:px-[100px]">
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted">404</p>
      <h1 className="mt-6 text-[clamp(40px,7vw,96px)] font-semibold leading-[0.95] tracking-[-0.035em]">
        Страницы нет
      </h1>
      <p className="mt-6 max-w-prose text-[17px] leading-relaxed text-muted">
        Ссылка устарела или в адресе опечатка.
      </p>
      <div className="mt-10 flex gap-6">
        <Link href="/" className="text-[15px] text-accent underline underline-offset-4">
          На главную
        </Link>
        <Link href="/work" className="text-[15px] text-muted underline underline-offset-4">
          К работам
        </Link>
      </div>
    </div>
  )
}
