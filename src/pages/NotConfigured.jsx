export default function NotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-nova-800 text-white">
      <div className="max-w-sm text-center">
        <div className="text-4xl mb-3">⚙️</div>
        <h1 className="text-xl font-bold mb-2">Falta ligar a base de dados</h1>
        <p className="text-nova-100 text-sm leading-relaxed">
          Cria um projeto gratuito no{' '}
          <a href="https://supabase.com" className="underline" target="_blank" rel="noreferrer">Supabase</a>{' '}
          e preenche o ficheiro <code className="bg-white/10 px-1 rounded">.env.local</code> com o
          <code className="bg-white/10 px-1 rounded mx-1">VITE_SUPABASE_URL</code> e a
          <code className="bg-white/10 px-1 rounded mx-1">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <p className="text-nova-200 text-xs mt-4">
          As instrucoes passo-a-passo estao no ficheiro <b>SETUP.md</b>.
        </p>
      </div>
    </div>
  )
}
