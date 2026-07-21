// ============================================================
//  Ficheiros das provas antigas — Cloudflare R2 (partilhado dev + producao)
//  Os PDFs vivem no R2 (10 GB gratis, saida de dados gratis). O Supabase
//  guarda so os metadados (tabela exam_files) e trata da autenticacao.
//  Este modulo devolve URLs assinados de curta duracao; as chaves do R2
//  nunca chegam ao browser.
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const DOWNLOAD_TTL = 120  // segundos
const UPLOAD_TTL = 600

export function r2Client(env = process.env) {
  const account = env.R2_ACCOUNT_ID
  const key = env.R2_ACCESS_KEY_ID
  const secret = env.R2_SECRET_ACCESS_KEY
  if (!account || !key || !secret) {
    throw new Error('R2 não configurado (faltam R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: key, secretAccessKey: secret },
  })
}

export const r2Bucket = (env = process.env) => env.R2_BUCKET || 'exams'

// Cliente Supabase a agir *em nome do utilizador*: as policies de RLS
// aplicam-se na mesma, por isso e o proprio Postgres que autoriza.
function userClient(token, env) {
  if (!token) throw new Error('Sem sessão.')
  const url = env.VITE_SUPABASE_URL
  const anon = env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase não configurado no servidor.')
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireUser(sb) {
  const { data, error } = await sb.auth.getUser()
  if (error || !data?.user) throw new Error('Sessão inválida.')
  return data.user
}

// So se aceitam caminhos com a forma "codigo/ficheiro.ext" — sem ".." nem barras extra.
const SAFE_PATH = /^[A-Za-z0-9._-]{1,64}\/[A-Za-z0-9._-]{1,120}$/

const slug = (s, max) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'x'

/**
 * action 'download' -> { url } para GET (o browser descarrega com o nome dado)
 * action 'upload'   -> { url, path } para PUT (o caminho e gerado pelo servidor)
 * action 'delete'   -> apaga a linha via RLS e, so se isso resultar, o ficheiro
 */
export async function signExamUrl({ token, action, path, courseCode, fileName, contentType, downloadAs, env = process.env }) {
  const sb = userClient(token, env)
  await requireUser(sb)
  const client = r2Client(env)
  const Bucket = r2Bucket(env)

  if (action === 'upload') {
    const ext = slug((fileName || '').split('.').pop(), 8).toLowerCase() || 'pdf'
    const key = `${slug(courseCode, 32)}/${crypto.randomUUID()}.${ext}`
    const url = await getSignedUrl(client, new PutObjectCommand({
      Bucket, Key: key, ContentType: contentType || 'application/octet-stream',
    }), { expiresIn: UPLOAD_TTL })
    return { url, path: key }
  }

  if (action === 'download') {
    if (!SAFE_PATH.test(String(path || ''))) throw new Error('Caminho inválido.')
    const name = slug(downloadAs, 120) || 'prova.pdf'
    const url = await getSignedUrl(client, new GetObjectCommand({
      Bucket, Key: path,
      ResponseContentDisposition: `attachment; filename="${name}"`,
    }), { expiresIn: DOWNLOAD_TTL })
    return { url }
  }

  if (action === 'delete') {
    if (!SAFE_PATH.test(String(path || ''))) throw new Error('Caminho inválido.')
    // A policy "exams_delete_own" so deixa apagar linhas proprias. Se voltar
    // uma linha, a posse ficou provada pelo proprio Postgres — e so entao se
    // apaga o ficheiro. Sem isto, qualquer sessao podia apagar tudo.
    const { data, error } = await sb.from('exam_files')
      .delete().eq('storage_path', path).select('id')
    if (error) throw error
    if (!data?.length) throw new Error('Ficheiro não encontrado ou sem permissão para o apagar.')
    await client.send(new DeleteObjectCommand({ Bucket, Key: path }))
    return { ok: true }
  }

  throw new Error('Ação desconhecida.')
}
