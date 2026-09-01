# Extrator dos horarios oficiais da Nova SBE.
#
#   pip install pdfplumber
#   python3 scripts/extrair-horarios.py "2627_S1_Bachelor schedules ....pdf" saida.json
#
# Le o PDF "Bachelor schedules Course Units Eco&Man" e devolve, por codigo de
# cadeira, as sessoes { g turno, t S1|T1|T2, d dia, s inicio, e fim, r sala }.
# Serve para regenerar src/data/schedules.js quando a escola publica uma versao
# nova -- foi assim que as salas entraram (v. 31/08/2026).
#
# Como funciona: cada aula e um retangulo colorido na grelha. Identifica-se pelo
# "[Room ...]" que tem dentro (independente da cor, que muda de pagina para
# pagina), e o dia/hora saem da POSICAO do retangulo -- as colunas do cabecalho
# dao o dia, as etiquetas da esquerda dao a linha de meia hora.
import sys, re, json

import pdfplumber

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
HDR_GREEN = (0.36862745, 0.494117647, 0.0)
# Formas validas de turno. Sem isto, nomes de professores entravam por engano.
TURNO = re.compile(r'(P\d{3}[AB]|TX[A-Z]|TP[A-Z]{1,2}(?:pt)?|T[A-Z]{1,2}\d?)\s*\(?\s*(T[12])?\s*\)?')

def linhas_horarias(page, words):
    """Cada linha de meia hora -> (inicio, fim, top, bottom)."""
    porto = {}
    for w in words:
        if w['x0'] < 90 and re.fullmatch(r'\d{2}:\d{2}', w['text']):
            porto.setdefault(round(w['top']), []).append(w)
    out = []
    for top, ws in porto.items():
        ws.sort(key=lambda w: w['x0'])
        if len(ws) == 2:
            out.append((ws[0]['text'], ws[1]['text'], min(x['top'] for x in ws), max(x['bottom'] for x in ws)))
    out.sort(key=lambda r: r[2])
    return out

def colunas_dia(page, words):
    """x-range exato de cada dia, a partir dos retangulos verdes do cabecalho."""
    prox = lambda c: all(abs(a - b) < 0.02 for a, b in zip(c, HDR_GREEN))
    hdr = [r for r in page.rects
           if r.get('non_stroking_color') and len(r['non_stroking_color']) == 3
           and prox(r['non_stroking_color']) and r['x1'] - r['x0'] > 20]
    hdr.sort(key=lambda r: r['x0'])
    if len(hdr) < 6:
        return None
    # o primeiro e a coluna "Hours"
    return [(DAYS[i], hdr[i+1]['x0'], hdr[i+1]['x1']) for i in range(5)]

def extrair(page):
    words = page.extract_words(x_tolerance=1.5, y_tolerance=2)
    linhas = linhas_horarias(page, words)
    cols = colunas_dia(page, words)
    m = re.search(r'Code:\s*(\d{4})', page.extract_text() or '')
    if not (linhas and cols and m):
        return None, []
    code = m.group(1)

    # Bloco de aula = retangulo que contem um "[Room ...]"
    cand = []
    for r in page.rects:
        if r['x1'] - r['x0'] < 8 or r['bottom'] - r['top'] < 8:
            continue
        dentro = [w for w in words
                  if w['x0'] >= r['x0']-1 and w['x1'] <= r['x1']+1
                  and w['top'] >= r['top']-1 and w['bottom'] <= r['bottom']+1]
        txt = ' '.join(w['text'] for w in dentro)
        if 'Room' in txt:
            cand.append((r, txt))
    # Do mais pequeno para o maior: um retangulo que ENGLOBA outro ja aceite e
    # moldura (o fundo da coluna do dia), nao um bloco de aula.
    cand.sort(key=lambda b: (b[0]['x1']-b[0]['x0']) * (b[0]['bottom']-b[0]['top']))
    finais, vistos = [], []
    for r, txt in cand:
        if any(r['x0'] <= f['x0']+1 and r['x1'] >= f['x1']-1
               and r['top'] <= f['top']+1 and r['bottom'] >= f['bottom']-1 for f in vistos):
            continue
        finais.append((r, txt)); vistos.append(r)

    saida = []
    for r, txt in finais:
        sala = re.search(r'\[Room ([^\]]+)\]', txt)
        cauda = txt.split(']')[-1]
        ms = list(TURNO.finditer(cauda))
        if not ms:
            continue
        g, t = ms[-1].group(1), ms[-1].group(2) or 'S1'
        xc = (r['x0'] + r['x1']) / 2
        dia = next((i+1 for i, (n, lo, hi) in enumerate(cols) if lo-1 <= xc <= hi+1), None)
        dentro = [s for s in linhas if s[2] >= r['top']-3 and s[3] <= r['bottom']+3]
        if dia is None or not dentro:
            continue
        saida.append({'g': g, 't': t, 'd': dia, 's': dentro[0][0], 'e': dentro[-1][1],
                      'r': sala.group(1).strip() if sala else None})
    return code, saida

if __name__ == '__main__':
    pdf = pdfplumber.open(sys.argv[1])
    tudo = {}
    for page in pdf.pages:
        code, ses = extrair(page)
        if code and ses:
            tudo.setdefault(code, []).extend(ses)
    json.dump(tudo, open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
    print(len(tudo), 'cadeiras ·', sum(len(v) for v in tudo.values()), 'sessoes ->', sys.argv[2])
