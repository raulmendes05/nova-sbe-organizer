// ============================================================
//  Ficheiros das provas antigas — Cloudflare R2 (partilhado dev + producao)
//  Os PDFs vivem no R2 (10 GB gratis, saida de dados gratis). O Supabase
//  guarda so os metadados (tabela exam_files) e trata da autenticacao.
//  Este modulo devolve URLs assinados de curta duracao; as chaves do R2
//  nunca chegam ao browser.
// ============================================================
import { userClient, requireUser } from './_auth.js'
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

// So se aceitam caminhos com a forma "codigo/ficheiro.ext" — sem ".." nem barras extra.
const SAFE_PATH = /^[A-Za-z0-9._-]{1,64}\/[A-Za-z0-9._-]{1,120}$/

const slug = (s, max) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'x'

/**
 * Guardar um ficheiro no R2 a partir do servidor.
 *
 * O caminho normal é o browser fazer PUT direto para o R2 com um URL assinado,
 * que não tem limite de tamanho. Isso exige que o bucket tenha uma política de
 * CORS a autorizar o domínio da app; enquanto não tiver, os ficheiros pequenos
 * passam por aqui — a Vercel corta o corpo aos ~4,5 MB, e é esse o limite.
 */
export async function guardarNoR2({ token, fileName, contentType, bytes, env = process.env }) {
  const sb = userClient(token, env)
  await requireUser(sb)
  const ext = slug((fileName || '').split('.').pop(), 8).toLowerCase() || 'pdf'
  const Key = `${slug('handbook', 32)}/${crypto.randomUUID()}.${ext}`
  await r2Client(env).send(new PutObjectCommand({
    Bucket: r2Bucket(env), Key, Body: bytes, ContentType: contentType || 'application/pdf',
  }))
  return { path: Key }
}

/** Os bytes de um ficheiro do R2, do lado do servidor (para os mandar ao modelo). */
export async function lerDoR2(path, env = process.env) {
  if (!SAFE_PATH.test(String(path || ''))) throw new Error('Caminho inválido.')
  const out = await r2Client(env).send(new GetObjectCommand({ Bucket: r2Bucket(env), Key: path }))
  return Buffer.from(await out.Body.transformToByteArray())
}

// Os cadernos de exercicios (Handbook) vao para "handbook/<uuid>.<ext>", com
// um nome gerado pelo servidor e impossivel de adivinhar. Nao tem linha em
// exam_files: o caminho fica guardado so nas notas do proprio aluno.
const HANDBOOK_PATH = /^handbook\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/

/**
 * Pode esta sessao ler este ficheiro do R2? So se for:
 *  - uma prova da biblioteca com linha em exam_files visivel para o aluno
 *    (perguntado ao Postgres com o token dele, por isso a RLS aplica-se), ou
 *  - um caderno de exercicios em "handbook/<uuid>" (nome que so o servidor
 *    gera, e so para sessoes validas).
 * Qualquer outro caminho e recusado, mesmo que exista no bucket.
 */
export async function podeLerDoR2(sb, path) {
  const p = String(path || '')
  if (!SAFE_PATH.test(p)) throw new Error('Caminho inválido.')
  if (HANDBOOK_PATH.test(p)) return true
  const { data, error } = await sb.from('exam_files').select('id').eq('storage_path', p).limit(1)
  if (error) throw error
  if (!data?.length) throw new Error('Ficheiro não encontrado ou sem permissão para o ler.')
  return true
}

/** lerDoR2, mas so depois de podeLerDoR2 dizer que sim. */
export async function lerDoR2ComPermissao(sb, path, env = process.env) {
  await podeLerDoR2(sb, path)
  return lerDoR2(path, env)
}

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
