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
 * O tipo que o SERVIDOR atribui a cada extensao.
 *
 * O ContentType decide como o browser trata o ficheiro ao abri-lo a partir do
 * dominio do bucket, por isso nao pode vir do cliente: um "ficheiro" com
 * Content-Type text/html guardado aqui passava a ser uma pagina servida do
 * nosso dominio de ficheiros. A lista e fechada — extensao que nao esteja
 * aqui nao entra. Acompanha o `accept` dos campos de ficheiro (Exams.jsx).
 */
export const TIPO_POR_EXT = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
}

export function tipoDaExtensao(ext) {
  return TIPO_POR_EXT[String(ext || '').toLowerCase().replace(/^\./, '')] || null
}

const erro = (msg, status) => Object.assign(new Error(msg), { status })

// Os primeiros bytes de um PDF. O `mime` que o browser manda nao prova nada —
// quem diz o que o ficheiro e sao os bytes.
const PDF_MAGIC = Buffer.from('%PDF-')
export const PDF_MAX = 3 * 1024 * 1024

export function exigirPdf(bytes) {
  if (!bytes?.length) throw erro('Ficheiro vazio.', 400)
  if (bytes.length > PDF_MAX) {
    throw erro(`Ficheiro demasiado grande para este caminho (máx. ${Math.round(PDF_MAX / 1048576)} MB).`, 413)
  }
  if (!bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    throw erro('Só se aceitam PDFs — este ficheiro não é um.', 415)
  }
}

/**
 * Guardar um ficheiro no R2 a partir do servidor.
 *
 * O caminho normal é o browser fazer PUT direto para o R2 com um URL assinado,
 * que não tem limite de tamanho. Isso exige que o bucket tenha uma política de
 * CORS a autorizar o domínio da app; enquanto não tiver, os ficheiros pequenos
 * passam por aqui — a Vercel corta o corpo aos ~4,5 MB, e é esse o limite.
 */
export async function guardarNoR2({ token, bytes, env = process.env }) {
  const sb = userClient(token, env)
  await requireUser(sb)
  // Por aqui so passam os PDFs do handbook. A extensao e o tipo sao postos
  // pelo servidor depois de confirmar os bytes — o nome que o cliente manda
  // nao chega a decidir nada.
  exigirPdf(bytes)
  const Key = `${slug('handbook', 32)}/${crypto.randomUUID()}.pdf`
  await r2Client(env).send(new PutObjectCommand({
    Bucket: r2Bucket(env), Key, Body: bytes, ContentType: TIPO_POR_EXT.pdf,
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
    // Aqui o ficheiro vai do browser direto para o R2 — o servidor nunca lhe ve
    // os bytes. O que da para fechar e o tipo com que fica guardado: sai da
    // extensao, por uma lista fechada, e nao do `contentType` que o cliente
    // pediu. Vai de volta porque a assinatura inclui esse cabecalho: o PUT tem
    // de o mandar igual.
    const tipo = tipoDaExtensao(ext)
    if (!tipo) throw erro('Tipo de ficheiro não aceite.', 415)
    const key = `${slug(courseCode, 32)}/${crypto.randomUUID()}.${ext}`
    const url = await getSignedUrl(client, new PutObjectCommand({
      Bucket, Key: key, ContentType: tipo,
    }), { expiresIn: UPLOAD_TTL })
    return { url, path: key, contentType: tipo }
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
