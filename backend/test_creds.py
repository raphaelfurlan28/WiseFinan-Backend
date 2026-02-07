import os
from google.oauth2.service_account import Credentials

def test():
    print("\n--- INICIANDO DIAGNÓSTICO DE CREDENCIAIS ---")
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    
    current_dir = os.getcwd()
    print(f"Diretório de Execução (CWD): {current_dir}")
    
    # Paths to test
    paths = [
        'service_account.json',
        './service_account.json',
        '../service_account.json',
        os.path.join(current_dir, 'service_account.json')
    ]
    
    found_any = False
    valid_any = False
    
    for path in paths:
        exists = os.path.exists(path)
        status = "[ENCONTRADO]" if exists else "[NÃO ENCONTRADO]"
        print(f"\nVerificando: {path} ... {status}")
        
        if exists:
            found_any = True
            try:
                creds = Credentials.from_service_account_file(path, scopes=scopes)
                print(f"  >>> SUCESSO! Credenciais válidas.")
                print(f"  >>> Email: {creds.service_account_email}")
                valid_any = True
                break # Stop on first success
            except Exception as e:
                print(f"  >>> ERRO ao ler arquivo: {e}")
    
    print("\n-------------------------------------------")
    if valid_any:
        print("RESULTADO: ✅ SUCESSO! Credenciais estão funcionando.")
    elif found_any:
        print("RESULTADO: ⚠️ ARQUIVO EXISTE MAS ESTÁ INVÁLIDO/CORROMPIDO.")
    else:
        print("RESULTADO: ❌ ARQUIVO NÃO ENCONTRADO EM NENHUM LUGAR.")
    print("-------------------------------------------\n")

if __name__ == "__main__":
    test()
