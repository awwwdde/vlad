import Link from 'next/link'
import type { PrivacyDocument } from '@/hooks/usePrivacy'

export function LegalDocument({ kind, document, failed }: { kind: 'policy' | 'consent'; document: PrivacyDocument; failed: boolean }) {
  const email = document.contact_email ?? 'message@awwwdde.art'
  return <article className="mx-auto max-w-[1000px] px-[6.8%] pb-24 pt-16 md:pt-24">
    <p className="mb-5 font-mono text-xs uppercase tracking-widest text-muted">awwwdde / personal data</p>
    <h1 className="text-[clamp(32px,4vw,58px)] font-medium leading-[1.08] tracking-[-.04em]">{kind === 'policy' ? 'Политика обработки персональных данных' : 'Согласие на обработку персональных данных'}</h1>
    {!document?.ready && <div role="status" className="mt-8 border border-warning/40 bg-warning/5 p-5 text-sm leading-relaxed">
      {failed ? 'Показан резервный проект документа: связь с сервером недоступна. Отправка формы приостановлена. По вопросам данных: message@awwwdde.art.' : document ? 'Проект документа. Реквизиты оператора и условия обработки ещё не утверждены. До заполнения сведений форма не принимает заявки.' : 'Загрузка документа…'}
    </div>}
    {document && <>
      <p className="mt-5 break-all font-mono text-[11px] text-muted">Версия: {document.version.slice(0, 16)} · {document.ready ? 'Утверждено оператором' : 'Не утверждено'}</p>
      <div className="mt-10 space-y-9">{document[kind].map(section => <section key={section.title} id={section.id} className="scroll-mt-28">
        <h2 className="mb-3 text-xl font-medium tracking-tight">{section.title}</h2><p className="whitespace-pre-line text-base leading-relaxed text-muted">{section.body}</p>
      </section>)}</div>
    </>}
    <div className="mt-12 flex flex-wrap gap-6 border-t border-line pt-6 text-sm underline underline-offset-4">
      <Link href={kind === 'policy' ? '/consent' : '/privacy'}>{kind === 'policy' ? 'Отдельное согласие' : 'Политика обработки данных'}</Link>
      <a href={`mailto:${email}`}>{email}</a>
    </div>
  </article>
}
