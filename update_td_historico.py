
"""
update_td_historico.py  (rev 4 - robust LFTB11)

Melhorias:
- Para LFTB11, tenta múltiplas combinações de símbolo e queda para diário->semanal.
- Fallback: baixa diário (1y/6mo/3mo), reamostra para semanal (sexta) e usa fechamento.
- Logs claros para entender qual combinação funcionou.

Colunas gravadas (aba TD_Historico):
F: LFTS11 | G: data | H: fechamento | I: LFTB11 | J: data | K: fechamento
"""

from __future__ import annotations
import pandas as pd
import yfinance as yf
import gspread
from google.oauth2.service_account import Credentials

# ================== CONFIG ==================
SHEET_TITLE = "Fundamentos Ações"   # use este OU SHEET_ID
SHEET_ID    = "1L2lfL6h4eoYU_U276e0dYFgENAgGruxiWJWOfgazD74"                    # opcional
TAB_NAME    = "TD_Historico"
SERVICE_JSON = "service_account.json"

# Yahoo symbols (lista de candidatos testados em ordem)
SYMBOL_CANDIDATES = {
    "LFTS11": ["LFTS11.SA", "LFTS11"],
    "LFTB11": ["LFTB11.SA", "LFTB11"],   # tente adicionar outros se souber
}

# Estratégias de download em ordem de tentativa
STRATEGIES = [
    # (period, interval, resample)  resample=None (mantém), "W-FRI" para diário->semanal
    ("1y", "1wk", None),      # ideal
    ("1y", "1d", "W-FRI"),    # diário de 1 ano → semanal
    ("6mo", "1d", "W-FRI"),   # janela menor
    ("3mo", "1d", "W-FRI"),
]

def try_download(symbol: str, period: str, interval: str, resample: str|None) -> pd.DataFrame:
    df = yf.download(symbol, period=period, interval=interval, auto_adjust=False, progress=False, threads=False)
    if df.empty:
        return df
    if resample:
        # reamostra para semanal (sexta) pegando o último valor disponível
        df = df.resample(resample).last().dropna(how="all")
    return df

def fetch_close_series(name: str) -> pd.DataFrame:
    """
    Tenta todas as combinações de símbolo + estratégia até obter dados.
    Retorna DataFrame com colunas: ['data','fechamento'] (datas em dd/mm/yyyy).
    """
    syms = SYMBOL_CANDIDATES.get(name, [name])
    for sym in syms:
        for period, interval, resample in STRATEGIES:
            df = try_download(sym, period, interval, resample)
            if not df.empty and "Close" in df.columns:
                out = df.reset_index()[["Date","Close"]].rename(columns={"Date":"data","Close":"fechamento"})
                out["data"] = pd.to_datetime(out["data"]).dt.strftime("%d/%m/%Y")
                out["fechamento"] = out["fechamento"].round(2)
                print(f"[{name}] OK com símbolo '{sym}' period={period} interval={interval} resample={resample or 'no'} -> {len(out)} pontos")
                return out
    print(f"[{name}] Nenhuma combinação retornou dados do Yahoo.")
    return pd.DataFrame(columns=["data","fechamento"])

def open_sheet():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    creds = Credentials.from_service_account_file(SERVICE_JSON, scopes=scopes)
    gc = gspread.authorize(creds)

    if SHEET_ID.strip():
        sh = gc.open_by_key(SHEET_ID.strip())
    else:
        sh = gc.open(SHEET_TITLE)

    try:
        ws = sh.worksheet(TAB_NAME)
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(title=TAB_NAME, rows=2000, cols=30)
    return ws

def _to_cell_value(x):
    if x is None:
        return ""
    if isinstance(x, (int, float)):
        return float(x)
    try:
        import numpy as np
        if isinstance(x, (np.integer, np.floating)):
            return float(x)
    except Exception:
        pass
    try:
        if hasattr(x, "strftime"):
            return x.strftime("%d/%m/%Y")
    except Exception:
        pass
    try:
        import pandas as pd
        if isinstance(x, pd.Series):
            return _to_cell_value(x.iloc[0] if not x.empty else "")
    except Exception:
        pass
    return str(x)

def write_to_sheet(ws, lfts_df: pd.DataFrame, lftb_df: pd.DataFrame):
    headers = [["LFTS11", "data_LFTS11", "fechamento_LFTS11", "LFTB11", "data_LFTB11", "fechamento_LFTB11"]]
    n = max(len(lfts_df), len(lftb_df), 1)
    lfts_vals = lfts_df.reindex(range(n)).fillna("")
    lftb_vals = lftb_df.reindex(range(n)).fillna("")

    values = []
    for i in range(n):
        d1 = lfts_vals.iloc[i]["data"] if "data" in lfts_vals.columns else ""
        f1 = lfts_vals.iloc[i]["fechamento"] if "fechamento" in lfts_vals.columns else ""
        d2 = lftb_vals.iloc[i]["data"] if "data" in lftb_vals.columns else ""
        f2 = lftb_vals.iloc[i]["fechamento"] if "fechamento" in lftb_vals.columns else ""

        row = [
            "LFTS11" if i == 0 else "",
            _to_cell_value(d1),
            _to_cell_value(f1),
            "LFTB11" if i == 0 else "",
            _to_cell_value(d2),
            _to_cell_value(f2),
        ]
        values.append(row)

    ws.batch_clear(["F1:K10000"])
    ws.update(values=headers, range_name="F1:K1")
    if values:
        ws.update(values=values, range_name=f"F2:K{n+1}")

def main():
    print("Baixando séries do Yahoo Finance (robusto)...")
    lfts = fetch_close_series("LFTS11")
    lftb = fetch_close_series("LFTB11")
    print(f"Resumo: LFTS11={len(lfts)} pts | LFTB11={len(lftb)} pts")

    print("Gravando na planilha...")
    ws = open_sheet()
    write_to_sheet(ws, lfts, lftb)
    print("Concluído! Veja F:K em TD_Historico.")

if __name__ == "__main__":
    main()
