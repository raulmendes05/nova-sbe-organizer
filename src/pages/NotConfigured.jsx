import { useT } from '../i18n/index.jsx'

export default function NotConfigured() {
  const { t } = useT()
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-nova-800 text-white">
      <div className="max-w-sm text-center">
        <div className="text-4xl mb-3">⚙️</div>
        <h1 className="text-xl font-bold mb-2">{t('setup.title')}</h1>
        <p className="text-nova-100 text-sm leading-relaxed">
          {t('setup.body1')}{' '}
          <a href="https://supabase.com" className="underline" target="_blank" rel="noreferrer">Supabase</a>{' '}
          {t('setup.body2')} <code className="bg-white/10 px-1 rounded">.env.local</code>{' '}
          {t('setup.body3')}
        </p>
        <p className="text-nova-200 text-xs mt-4">
          {t('setup.hint')} <b>SETUP.md</b>.
        </p>
      </div>
    </div>
  )
}
