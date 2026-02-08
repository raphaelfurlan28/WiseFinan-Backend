from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from services.sheets import get_sheet_data, get_fixed_income_data
from services.indices import get_economic_indices

basedir = os.path.abspath(os.path.dirname(__file__))
# In Cloud Run, .env is in the same dir; locally it may be one level up
dotenv_path = os.path.join(basedir, '.env')
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(basedir, '../.env')
load_dotenv(dotenv_path)

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "🚀 Backend WiseFinan rodando! Acesse /api/home para dados."

@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    try:
        data = get_sheet_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/calendar', methods=['GET'])
def get_calendar():
    try:
        from services.calendar_service import get_calendar_data
        from services.sheets import get_sheet_data
        
        stocks = get_sheet_data()
        tickers = [s['ticker'] for s in stocks if 'ticker' in s]
        data = get_calendar_data(tickers)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stocks/<ticker>/history', methods=['GET'])
def get_stock_history(ticker):
    try:
        from services.sheets import get_history_data
        data = get_history_data(ticker)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stocks/<ticker>/options', methods=['GET'])
def get_stock_options(ticker):
    try:
        from services.sheets import get_options_data
        data = get_options_data(ticker)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stocks/<ticker>/fundamentals', methods=['GET'])
def get_stock_fundamentals(ticker):
    try:
        from services.sheets import get_fundamentals_data
        data = get_fundamentals_data(ticker)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/update/options', methods=['POST'])
def update_options():
    try:
        import subprocess
        import sys
        
        # Script path: scripts/opcoes_to_sheets_rules.py
        script_path = os.path.join(basedir, 'scripts/opcoes_to_sheets_rules.py')
        # Credentials path: ./service_account.json (inside backend)
        cred_file = os.path.join(basedir, 'service_account.json')
        
        # Execute script with credentials argument
        args = [sys.executable, script_path, "--creds", cred_file]
        
        result = subprocess.run(args, capture_output=True, text=True, cwd=basedir)
        
        if result.returncode == 0:
            return jsonify({"status": "success", "output": result.stdout})
        else:
            # Join stdout and stderr for full error visibility
            full_log = result.stdout + "\n[STDERR]\n" + result.stderr
            return jsonify({"status": "error", "output": full_log}), 500
            
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/api/update/rf', methods=['POST'])
def update_rf():
    try:
        import subprocess
        import sys
        
        # Script path: scripts/td_to_sheets.py
        script_path = os.path.join(basedir, 'scripts/td_to_sheets.py')
        cred_file = os.path.join(basedir, 'service_account.json')
        
        # Arguments from bat file
        args = [
            sys.executable, script_path,
            "--force-selenium",
            "--debug",
            "--sheet-name", "Fundamentos Ações",
            "--tab-diario", "TD_Diario",
            "--tab-hist", "Historico",
            "--cred-file", cred_file
        ]
        
        # Execute
        result = subprocess.run(args, capture_output=True, text=True, cwd=basedir)
        
        if result.returncode == 0:
            return jsonify({"status": "success", "output": result.stdout})
        else:
            # Combine stdout and stderr to show logs even on failure
            full_log = result.stdout + "\n[STDERR]\n" + result.stderr
            return jsonify({"status": "error", "output": full_log}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/news/dashboard', methods=['GET'])
def get_news_dashboard():
    try:
        from services.market_data import get_market_indicators, get_rss_news
        indicators = get_market_indicators()
        news = get_rss_news()
        return jsonify({"indicators": indicators, "news": news})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/news/movers', methods=['GET'])
def get_market_movers():
    try:
        data = get_sheet_data()
        
        # Helper to parse percentage string to float
        def parse_pct(val):
            if isinstance(val, (int, float)): return float(val)
            if not val or val == '-': return 0.0
            try:
                clean = str(val).replace('%', '').replace(',', '.').strip()
                return float(clean)
            except:
                return 0.0

        stocks = []
        for s in data:
             stocks.append({
                 **s,
                 "var_val": parse_pct(s.get('variation', '0')),
                 "dy_val": parse_pct(s.get('dy', '0'))
             })

        # Sort
        highs = sorted(stocks, key=lambda x: x['var_val'], reverse=True)[:5]
        lows = sorted(stocks, key=lambda x: x['var_val'])[:5]
        divs = sorted(stocks, key=lambda x: x['dy_val'], reverse=True)[:5]
        
        return jsonify({
            "highs": highs,
            "lows": lows,
            "dividends": divs
        })

    except Exception as e:
        print(f"Error in movers: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/rf', methods=['GET'])
def rf():
    try:
        data = get_fixed_income_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/indices', methods=['GET'])
def indices():
    try:
        data = get_economic_indices()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/indicators/history', methods=['GET'])
def indicators_history():
    try:
        from services.market_data import get_comparative_data
        data = get_comparative_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/etfs/treasury', methods=['GET'])
def get_treasury_etfs_endpoint():
    try:
        from services.market_data import get_treasury_etfs
        data = get_treasury_etfs()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/home', methods=['GET'])
def get_home_data():
    try:
        from services.sheets import get_filtered_opportunities
        data = get_filtered_opportunities()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Chat Store (In-Memory)
chat_messages = []

@app.route('/api/chat', methods=['GET', 'POST', 'DELETE'])
def chat_handler():
    global chat_messages
    from flask import request
    import datetime
    import time
    
    if request.method == 'GET':
        # Return last 50 messages
        return jsonify(chat_messages[-50:])
        
    if request.method == 'POST':
        try:
            data = request.json
            user = data.get('user', 'Anonymous')
            text = data.get('text', '')
            
            if not text:
                return jsonify({"error": "Empty message"}), 400
            
            # Use timestamp based ID to ensure uniqueness even after deletions
            msg_id = int(time.time() * 1000)
            
            msg = {
                "id": msg_id,
                "user": user,
                "text": text,
                "timestamp": datetime.datetime.now().isoformat(),
                "time_display": datetime.datetime.now().strftime("%H:%M")
            }
            
            chat_messages.append(msg)
            # Keep limit
            if len(chat_messages) > 100:
                chat_messages = chat_messages[-100:]
                
            return jsonify(msg)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if request.method == 'DELETE':
        try:
            # We expect an ID in the query params or body. Let's use query param for simplicity or body.
            # Using query param ?id=...
            msg_id = request.args.get('id')
            if not msg_id:
                # Try JSON body
                data = request.json
                if data:
                    msg_id = data.get('id')
            
            if not msg_id:
                return jsonify({"error": "Message ID required"}), 400
                
            msg_id = int(msg_id)
            
            # Filter out the message
            initial_len = len(chat_messages)
            chat_messages = [m for m in chat_messages if m['id'] != msg_id]
            
            if len(chat_messages) < initial_len:
                return jsonify({"status": "deleted"})
            else:
                return jsonify({"error": "Message not found"}), 404
                
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    try:
        from flask import request
        data = request.json
        email = data.get('email')
        name = data.get('name')
        photo = data.get('photo')
        
        if not email:
            return jsonify({"error": "Email required"}), 400
            
        from services.sheets import check_user_allowed
        user = check_user_allowed(email)
        
        if user:
            # User is allowed.
            # Optionally update info if it's their first login or if changed?
            # For now just return success
            return jsonify({
                "authorized": True,
                "user": user
            })
        else:
            return jsonify({
                "authorized": False,
                "error": "User not authorized"
            }), 403
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/api/user/update', methods=['POST'])
def update_user_endpoint():
    try:
        from flask import request
        data = request.json
        email = data.get('email')
        new_name = data.get('name')
        new_photo = data.get('photo')
        
        if not email:
             return jsonify({"error": "Email required"}), 400
             
        from services.sheets import update_user_profile
        res = update_user_profile(email, new_name, new_photo)
        
        if "error" in res:
            return jsonify(res), 500
        return jsonify(res)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/calendar', methods=['GET'])
def get_calendar():
    try:
        # 1. Get List of Tickers (Assets)
        # Should we use 'get_sheet_data'? Yes.
        data = get_sheet_data()
        tickers = [item['ticker'] for item in data if item.get('ticker')]
        
        # 2. Call Calendar Service
        from services.calendar_service import get_calendar_data
        calendar_data = get_calendar_data(tickers)
        
        # 3. Enhance with Company Name/Logo from sheet data?
        # The frontend calls /api/stocks anyway, so it can map Ticker -> Logo.
        # But maybe returns names here for convenience? Not strictly needed.
        
        return jsonify(calendar_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)
