# =========================== PATCH 1/3: normalize_td ===========================
from __future__ import annotations
import re
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dateutil import parser as dp
from datetime import datetime, timezone
import dateparser
from typing import Any, List, Dict, Optional
import pandas as pd
import gspread
from google.oauth2.service_account import Credentials

# FIX: Monkey Patch para evitar erro OSError [WinError 6] no Windows ao fechar o UC
def _suppress_del(self):
    try:
        self.quit()
    except Exception:
        pass
uc.Chrome.__del__ = _suppress_del

def normalize_td(payload: Any, debug: bool = False) -> pd.DataFrame:
    candidates = [
        ("response", "TrsrBdTradgList"),
        ("TrsrBdTradgList",),
        ("titulos",),
    ]

    titulos = None
    if isinstance(payload, dict):
        for path in candidates:
            node = payload
            try:
                for p in path:
                    node = node[p]
                titulos = node
                break
            except Exception:
                continue

        if titulos is None:
            for v in payload.values():
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    titulos = v
                    break

    if titulos is None and isinstance(payload, list):
        titulos = payload

    if titulos is None:
        raise ValueError("Estrutura inesperada: não encontrei a lista de títulos no payload.")

    data_ref_top = None
    for k in ("IndicativeDate", "refDate", "DataReferencia", "DtPgto", "dateRef"):
        if isinstance(payload, dict) and k in payload:
            data_ref_top = payload[k]
            break

    def parse_date_or_keep(x):
        if not x:
            return None
        try:
            return dateparser.parse(str(x), dayfirst=True).date().isoformat()
        except Exception:
            return x

    def to_float(x):
        if x is None:
            return None
        if isinstance(x, str):
            s = x.strip()
            if s.count(",") == 1 and s.count(".") > 1:
                s = s.replace(".", "").replace(",", ".")
            else:
                s = s.replace(",", ".")
            try:
                return float(s)
            except Exception:
                s2 = re.sub(r"[^\d\.\-eE]", "", s)
                try:
                    return float(s2)
                except Exception:
                    return None
        try:
            return float(x)
        except Exception:
            return None

    rows: List[Dict[str, Any]] = []
    for t in titulos:
        # ✅ agora funciona porque vamos setar no selenium/html
        from_rend = bool(t.get("_from_rendimento"))

        nome      = t.get("TrsrBdNm") or t.get("nome") or t.get("Titulo") or t.get("Bond")
        venc      = t.get("MtrtyDt") or t.get("vencimento") or t.get("MaturityDt")
        taxa_comp = t.get("AnulInvstmtRate") or t.get("taxa_compra") or t.get("TaxaCompra")
        taxa_vend = t.get("AnulRedRate")     or t.get("taxa_venda")  or t.get("TaxaVenda")

        # ✅ investimento mínimo real quando vier da página rendimento
        min_inv = t.get("MinInvstmtAmt") or t.get("InvestMin")

        if from_rend:
            pu_comp = None
            pu_vend = None
        else:
            pu_comp = (t.get("MinInvstmtAmt") or t.get("PUCompra") or t.get("BuyPrice")
                       or t.get("MinInvestmentAmt"))
            pu_vend = (t.get("UnitPrice")     or t.get("PUVenda")  or t.get("SellPrice")
                       or t.get("UnitSalePrice"))

        indexador = t.get("TrsrBdIndx") or t.get("indexador") or t.get("Index")
        tipo      = t.get("Tp")         or t.get("tipo")      or t.get("BondType")
        sit       = t.get("Stt")        or t.get("situacao")  or t.get("Status")

        # ✅ FIX: aceitar os dois nomes (seu antigo e o correto)
        rendimento_raw = (
            t.get("RendAnualRaw")
            or t.get("_rendimento_raw")
            or t.get("rendimento_anual_raw")
        )

        data_ref_item = (t.get("RefDt") or t.get("DataRef") or t.get("IndicativeDate") or data_ref_top)

        rows.append({
            "data_ref": parse_date_or_keep(data_ref_item) or datetime.now(timezone.utc).date().isoformat(),
            "titulo": nome,
            "vencimento": parse_date_or_keep(venc),
            "rendimento_anual_raw": rendimento_raw,
            "taxa_compra_a.a.%": to_float(taxa_comp),
            "taxa_venda_a.a.%": to_float(taxa_vend),
            "min_investimento": to_float(min_inv),
            "pu_compra": to_float(pu_comp),
            "pu_venda": to_float(pu_vend),
            "indexador": indexador,
            "tipo": tipo,
            "situacao": sit
        })

    df = pd.DataFrame(rows).sort_values(["data_ref", "titulo", "vencimento"], na_position="last").reset_index(drop=True)
    if df.empty:
        raise ValueError("Nenhum título encontrado após normalização.")
    if debug:
        log(f"normalize_td: {len(df)} linhas", True, force=True)

    return df

# ================== CONFIG ==================
import re
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dateutil import parser as dp
from datetime import datetime, timezone
import dateparser

SHEET_TITLE = "Fundamentos Ações"   # use este OU SHEET_ID
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HOMEPAGE = "https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm"
# =========================== PATCH 2/3: fetch_td_selenium ===========================
def fetch_td_selenium(debug: bool = False) -> dict:
    # The original code had imports inside the function, which is generally not good practice.
    # Moving them to the top of the file.
    # import re
    # import undetected_chromedriver as uc
    # from selenium.webdriver.common.by import By
    # from selenium.webdriver.support.ui import WebDriverWait
    # from selenium.webdriver.support import expected_conditions as EC
    # from dateutil import parser as dp

    def parse_float_br_local(s: str | None):
        if s is None:
            return None
        s = s.replace("\xa0", " ").strip()
        s = s.replace("R$", "").replace("%", "").replace("a.a.", "").strip()
        if "," in s:
            s = s.replace(".", "").replace(",", ".")
        s = re.sub(r"[^0-9\.\-\+eE]", "", s)
        if s in ("", ".", "-", "+"):
            return None
        try:
            return float(s)
        except Exception:
            return None

    def clean_title(txt: str | None) -> str | None:
        if not txt:
            return None
        t = " ".join((txt or "").split())
        m = re.search(r"(Tesouro\s+(Selic|Prefixado|IPCA\+|Renda\+|Educa\+)(?:\s+com Juros Semestrais)?\s+\d{4})", t, re.I)
        if m:
            return m.group(1)
        m = re.search(r"(Tesouro\s+\S.*?\d{4})", t, re.I)
        return m.group(1).strip() if m else t

    log("Selenium: abrindo Chrome headless…", debug)
    opts = uc.ChromeOptions()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1400,900")
    opts.add_argument(f"--user-agent={UA}")
    # reduz chance de bloqueio
    opts.add_argument("--lang=pt-BR")
    opts.add_argument("--disable-blink-features=AutomationControlled")

    driver = None
    try:
        # Force version 144 to match user's Chrome
        driver = uc.Chrome(options=opts, use_subprocess=True, version_main=144)
        driver.get(HOMEPAGE)

        wait = WebDriverWait(driver, 40)

        # ✅ FIX: não depender do id "rentabilidadeTable"
        # Espera aparecer o texto do cabeçalho e pega a tabela mais próxima.
        wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'rendimento anual')]")))

        table = wait.until(
            EC.presence_of_element_located((
                By.XPATH,
                "//table[.//th[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'rendimento')]"
                " and .//th[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'vencimento')]]"
            ))
        )

        # Espera pelo menos uma linha do tbody renderizada
        wait.until(EC.presence_of_element_located((By.XPATH, ".//tbody//tr",)))

        rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
        bonds = []

        def cell_by_class(tr, cls):
            els = tr.find_elements(By.CSS_SELECTOR, f"td.{cls}")
            if els:
                return (els[0].get_attribute("innerText") or "").strip()
            return None

        for tr in rows:
            # tenta primeiro pelo padrão cdk (quando existe)
            title_txt = cell_by_class(tr, "cdk-column-treasuryBondName")
            inv_txt   = cell_by_class(tr, "cdk-column-formattedInvestmentBondMinimumValue")
            rend_txt  = cell_by_class(tr, "cdk-column-investmentProfitabilityIndexerName")
            venc_txt  = cell_by_class(tr, "cdk-column-formattedMaturityDate")

            # ✅ fallback genérico: pega as colunas por posição se não tiver classes
            tds = tr.find_elements(By.CSS_SELECTOR, "td")
            if (not title_txt) and len(tds) >= 4:
                title_txt = (tds[0].get_attribute("innerText") or "").strip()
                inv_txt   = (tds[-3].get_attribute("innerText") or "").strip()
                rend_txt  = (tds[-2].get_attribute("innerText") or "").strip()
                venc_txt  = (tds[-1].get_attribute("innerText") or "").strip()

            titulo = clean_title(title_txt)
            if not titulo:
                continue

            min_inv = parse_float_br_local(inv_txt)
            rend_raw = (rend_txt or "").strip()

            idxr, spread, taxa_nom = None, None, None
            low = rend_raw.lower()
            if "selic" in low:
                idxr = "Selic"
                m = re.search(r"selic\s*\+\s*([0-9\.,]+)\s*%", low, re.I)
                if m:
                    spread = parse_float_br_local(m.group(1))
            elif "ipca" in low:
                idxr = "IPCA"
                m = re.search(r"ipca\s*\+\s*([0-9\.,]+)\s*%", low, re.I)
                if m:
                    spread = parse_float_br_local(m.group(1))
            else:
                taxa_nom = parse_float_br_local(rend_raw)

            try:
                venc_iso = dp.parse(venc_txt, dayfirst=True).date().isoformat() if venc_txt else None
            except Exception:
                venc_iso = venc_txt

            bonds.append({
                "_from_rendimento": True,     # ✅ FIX
                "RendAnualRaw": rend_raw,     # ✅ FIX (normalizer usa esse)
                "_rendimento_raw": rend_raw,  # mantém compatibilidade com o que você já tinha

                "TrsrBdNm": titulo,
                "MtrtyDt": venc_iso,
                "AnulInvstmtRate": taxa_nom if taxa_nom is not None else spread,
                "AnulRedRate": None,
                "MinInvstmtAmt": min_inv,     # aqui é investimento mínimo (porque _from_rendimento=True)
                "UnitPrice": None,
                "TrsrBdIndx": idxr,
                "Tp": ("LFT" if idxr == "Selic" else ("NTN-B" if idxr == "IPCA" else ("LTN" if "prefixado" in (titulo or "").lower() else None))),
                "Stt": None,
                "RefDt": None,
            })

        if debug:
            log(f"Selenium: linhas extraídas = {len(bonds)}", True, force=True)

        if not bonds:
            raise RuntimeError("Tabela encontrada, mas sem linhas úteis (página mudou ou bloqueou o carregamento).")

        return {"TrsrBdTradgList": bonds}

    finally:
        if driver is not None:
            try:
                # driver.quit()  # Comentado para evitar erro [WinError 6] no Windows com UC
                pass
            except Exception:
                pass


# =========================== PATCH 3/3: priorizar Selenium ===========================
def fetch_td_raw(force_selenium: bool = False, debug: bool = False) -> Dict[str, Any]:
    """
    Hoje o Tesouro costuma bloquear/alterar endpoints JSON.
    Para seu uso (tabela 'Rendimento dos Títulos'), é muito mais estável ir direto no Selenium.
    """
    # ✅ default: selenium primeiro
    if force_selenium or True:
        log("Coleta: usando Selenium (padrao recomendado)...", debug, force=True)
        return fetch_td_selenium(debug=debug)

    # (mantido abaixo apenas se você quiser reativar no futuro)
    try:
        return fetch_td_cloudscraper(debug=debug)
    except Exception as e:
        log(f"Cloudscraper falhou: {e}", debug, force=True)

    try:
        return fetch_td_requests(debug=debug)
    except Exception as e:
        log(f"Requests falhou: {e}", debug, force=True)

    return fetch_td_selenium(debug=debug)


# =========================== MAIN EXECUTION ===========================
import argparse
import sys
import os

def log(msg, debug=False, force=False):
    if debug or force or True:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheet-name", required=True)
    parser.add_argument("--tab-diario", required=True)
    parser.add_argument("--tab-hist", required=False)
    parser.add_argument("--cred-file", required=True)
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--force-selenium", action="store_true")
    args = parser.parse_args()

    log("Iniciando atualização de Renda Fixa...", force=True)

    # 1. Fetch Data
    try:
        raw_data = fetch_td_raw(force_selenium=args.force_selenium, debug=args.debug)
    except Exception as e:
        log(f"Erro no fetch: {e}", force=True)
        sys.exit(1)

    # 2. Normalize
    try:
        df = normalize_td(raw_data, debug=args.debug)
    except Exception as e:
        log(f"Erro na normalização: {e}", force=True)
        sys.exit(1)

    # 3. Save to Sheets
    try:
        from gspread_dataframe import set_with_dataframe
        
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = Credentials.from_service_account_file(args.cred_file, scopes=scope)
        gc = gspread.authorize(creds)
        
        sh = gc.open(args.sheet_name)
        try:
            ws = sh.worksheet(args.tab_diario)
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=args.tab_diario, rows=100, cols=20)
            
        ws.clear()
        set_with_dataframe(ws, df, include_index=False, include_column_header=True)
        log("Planilha (Diário) atualizada com sucesso!", force=True)
        
    except Exception as e:
        log(f"Erro ao salvar no Google Sheets: {e}", force=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
