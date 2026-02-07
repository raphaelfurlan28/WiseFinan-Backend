# Configuração Manual do Firewall para WiseFinan

Para acessar o sistema pelo celular, você precisa liberar a porta **5174** no Windows Firewall. Siga estes passos:

1.  **Abrir o Firewall Avançado**:
    *   Pressione a tecla `Windows + R` no seu teclado.
    *   Digite `wf.msc` e clique em **OK**.

2.  **Criar Nova Regra de Entrada**:
    *   No menu esquerdo, clique em **Regras de Entrada** (Inbound Rules).
    *   No menu direito (Ações), clique em **Nova Regra...** (New Rule).

3.  **Configurar a Regra**:
    *   **Tipo de Regra**: Selecione **Porta** e clique em Avançar.
    *   **Protocolo e Portas**:
        *   Marque **TCP**.
        *   Em "Portas locais específicas", digite: `5174`.
        *   Clique em Avançar.
    *   **Ação**: Selecione **Permitir a conexão**. Clique em Avançar.
    *   **Perfil**: Marque todas as opções (**Domínio, Particular, Público**). Clique em Avançar.
    *   **Nome**: Digite `WiseFinan Frontend` (ou qualquer nome que preferir).
    *   Clique em **Concluir**.

4.  **Após Configurar**:
    *   Vá até o terminal onde o projeto está rodando (`npm run dev`).
    *   Pare o servidor (pressione `Ctrl + C`).
    *   Inicie novamente (`npm run dev`).
    *   No celular, acesse: `http://192.168.0.13:5174`.

_Nota: Verifique se o IP do seu computador ainda é 192.168.0.13 usando o comando `ipconfig` no terminal._
