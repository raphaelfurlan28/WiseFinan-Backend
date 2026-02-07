# opcoes_to_sheets_all.py — Busca TODAS as opções (somente negócios > 0) + Google Sheets
# by Raphael + ChatGPT

import os, sys, argparse
import pandas as pd
import requests
from requests.adapters import HTTPAdapter, Retry
from typing import List

# ==== Google Sheets ====
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from gspread_dataframe import set_with_dataframe

# ---------------------------------------------------------
# >>> CONFIG (edite aqui se precisar) <<<
# ---------------------------------------------------------
basedir = os.path.dirname(os.path.abspath(__file__))
CREDS_JSON   = os.path.join(basedir, "service_account.json")
SPREADSHEET  = "Fundamentos Ações"
WORKSHEET    = "Opcoes"

DEFAULT_TICKERS = [
    "BBAS3","BBDC4","BPAC3","BRSR6","ITSA4","ITUB4","SANB11","FRAS3","POMO4","ROMI3","TGMA3","WEGE3",
    "ABEV3","LEVE3","LREN3","SMTO3","ALUP11","CMIG4","CPFE3","CPLE3","EGIE3","ENGI11","EQTL3","NEOE3",
    "TAEE11","ISAE4","FESA4","GGBR4","CSMG3","SAPR4","SBSP3","BBSE3","CXSE3","PSSA3","WIZC3","TOTS3",
    "INTB3","KLBN11","TIMS3"
]

BASE = "https://opcoes.net.br/listaopcoes/completa"

# ---------- HTTP session ----------
def _session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": "https://opcoes.net.br/",
    })
    retries = Retry(total=5, backoff_factor=0.8, status_forcelist=(429, 500, 502, 503, 504))
    s.mount("https://", HTTPAdapter(max_retries=retries))
    return s

S = _session()

# ---------- API opcoes.net.br ----------
def list_expiries(subjacente: str) -> List[str]:
    subjacente = subjacente.strip().upper()
    url = f"{BASE}?idLista=ML&idAcao={subjacente}&listarVencimentos=true&cotacoes=true"
    r = S.get(url, timeout=25)
    r.raise_for_status()
    j = r.json()
    vencs = j.get("data", {}).get("vencimentos", []) or []
    return [v.get("value") for v in vencs if v.get("value")]

def optionchaindate(subjacente: str, vencimento: str) -> pd.DataFrame:
    subjacente = subjacente.strip().upper()
    vencimento = vencimento.strip()

    url = f"{BASE}?idAcao={subjacente}&listarVencimentos=false&cotacoes=true&vencimentos={vencimento}"
    r = S.get(url, timeout=25)
    r.raise_for_status()
    j = r.json()

    cot = j.get("data", {}).get("cotacoesOpcoes", []) or []
    if not cot:
        return pd.DataFrame(columns=[
            "subjacente","vencimento","ativo","tipo","modelo","strike","preco","negocios","volume"
        ])

    rows = []
    for i in cot:
        try:
            ativo = (i[0] or "").split("_")[0]
            tipo = i[2]
            modelo = i[3]
            strike = i[5]
            preco = i[8]
            negocios = i[9]
            volume = i[10]
        except Exception:
            continue

        rows.append([subjacente, vencimento, ativo, tipo, modelo, strike, preco, negocios, volume])

    df = pd.DataFrame(rows, columns=[
        "subjacente","vencimento","ativo","tipo","modelo","strike","preco","negocios","volume"
    ])

    # Conversões numéricas
    for col in ["strike", "preco", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # negocios: converter e filtrar SOMENTE > 0
    df["negocios"] = pd.to_numeric(df["negocios"], errors="coerce")
    df = df[df["negocios"].notna() & (df["negocios"] > 0)].copy()
    df["negocios"] = df["negocios"].astype("Int64")

    # Normaliza texto
    df["tipo"] = df["tipo"].astype(str).str.upper().str.strip()
    df["modelo"] = df["modelo"].astype(str).str.strip()
    df["ativo"] = df["ativo"].astype(str).str.strip()

    return df

# ---------- Google Sheets ----------
def sheet_client_from_json(path_json: str):
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name(path_json, scope)
    return gspread.authorize(creds)

def write_df_to_sheet(df: pd.DataFrame, spreadsheet_name: str, worksheet_name: str, creds_json: str):
    gc = sheet_client_from_json(creds_json)
    sh = gc.open(spreadsheet_name)
    try:
        ws = sh.worksheet(worksheet_name)
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(
            title=worksheet_name,
            rows=str(max(len(df) + 10, 1000)),
            cols=str(max(len(df.columns) + 2, 20))
        )

    nrows = max(len(df) + 1, 100)
    ws.batch_clear([f"A1:I{nrows}"])
    set_with_dataframe(ws, df, row=1, col=1, include_index=False, include_column_header=True)

    try:
        ws.format(f"A1:{chr(64+len(df.columns))}1", {"textFormat": {"bold": True}})
        ws.freeze(rows=1)
        widths = [max(10, min(280, int(df[col].astype(str).str.len().max() or 10) * 7)) for col in df.columns]
        for i, w in enumerate(widths, start=1):
            ws.set_column_width(i, w)
    except Exception:
        pass

    return True

# ---------- MAIN ----------
def main():
    parser = argparse.ArgumentParser(description="Opções B3 (TODAS, somente negócios > 0) → Google Sheets")
    parser.add_argument("-T", "--tickers", default=",".join(DEFAULT_TICKERS),
                        help="Lista de tickers separada por vírgula (padrão: sua lista)")
    parser.add_argument("-s", "--sheet", default=SPREADSHEET, help="Nome da planilha")
    parser.add_argument("-w", "--tab", default=WORKSHEET, help="Nome da aba")
    parser.add_argument("-c", "--creds", default=CREDS_JSON, help="JSON da Service Account")
    args = parser.parse_args()

    if not os.path.exists(args.creds):
        print(f"[ERRO] Credenciais não encontradas: {args.creds}")
        sys.exit(1)

    tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    frames: List[pd.DataFrame] = []

    for t in tickers:
        print(f"[INFO] {t}: listando vencimentos…")
        try:
            expiries = list_expiries(t)
        except Exception as e:
            print(f"[WARN] {t}: erro ao buscar vencimentos ({e})")
            continue

        if not expiries:
            print(f"[WARN] {t}: nenhum vencimento retornado.")
            continue

        print(f"[INFO] {t}: vencimentos retornados = {len(expiries)}")

        for v in expiries:
            try:
                df = optionchaindate(t, v)
            except Exception as e:
                print(f"[WARN] {t} {v}: erro ao buscar cadeia ({e})")
                continue

            if df.empty:
                continue

            frames.append(df)

    final = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    if final.empty:
        print("[INFO] Resultado vazio (nenhuma opção com negócios > 0).")
        sys.exit(0)

    cols = ["subjacente","vencimento","ativo","tipo","modelo","strike","preco","negocios","volume"]
    final = final[cols].copy().sort_values(
        by=["subjacente","vencimento","tipo","strike"], na_position="last"
    ).reset_index(drop=True)

    print(f"[INFO] Gravando no Sheets: '{args.sheet}' -> '{args.tab}' ({len(final)} linhas)")
    write_df_to_sheet(final, args.sheet, args.tab, args.creds)
    print("[OK] Planilha atualizada.")

if __name__ == "__main__":
    main()
