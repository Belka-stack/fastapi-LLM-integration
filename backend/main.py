import os
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import mysql.connector
from mysql.connector import errorcode
import time
from dotenv import load_dotenv

# Charger les variables du fichier .env
load_dotenv()

app = FastAPI(title="Trafiq GenAI API", version="1.0")

# Autoriser le Frontend (React) à communiquer avec FastAPI (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En dev, on autorise tout
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisation du client Google GenAI
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Fonction utilitaire pour connecter la BDD MySQL


def get_db_connection():
    while True:
        try:
            conn = mysql.connector.connect(
                host=os.getenv("DB_HOST"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                database=os.getenv("DB_NAME")
            )
            return conn
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
                print("Erreur : Identifiants MySQL incorrects.")
                raise err
            elif err.errno == errorcode.ER_BAD_DB_ERROR:
                print("Erreur : la base de données n'existe pas encore.")
                raise err
            else:
                print(
                    f"MySQL n'est pas encore prêt ({err}), nouvelle tentative dans 2 secondes...")
                time.sleep(2)


# Création automatique de la table d'historique au démarrage si elle n'existe pas
@app.on_event("startup")
def startup_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyzed_documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255),
            title VARCHAR(255),
            extracted_amount FLOAT,
            summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()


@app.post("/api/analyze-document")
async def analyze_document(file: UploadFile = File(...)):
    try:
        # 1. Lire les octets du fichier uploadé
        file_bytes = await file.read()

        # 2. Envoyer le fichier et le prompt à Gemini (Modèle multimodal rapide)
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=[
                types.Part.from_bytes(
                    data=file_bytes,
                    mime_type=file.content_type or "application/pdf"
                ),
                """Analyse ce document de manière rigoureuse. 
                Réponds STRICTEMENT au format JSON avec les clés exactes suivantes :
                {
                    "title": "Le titre ou le sujet principal du document",
                    "extracted_amount": 0.0 (uniquement le montant numérique si trouvé, sinon 0.0),
                    "summary": "Un résumé clair et concis en français"
                }"""
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        # Parser le JSON renvoyé par l'IA
        ai_data = json.loads(response.text)

        # 3. Sauvegarder le résultat dans MySQL
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "INSERT INTO analyzed_documents (filename, title, extracted_amount, summary) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (file.filename, ai_data.get(
            "title"), ai_data.get("extracted_amount"), ai_data.get("summary")))
        conn.commit()
        cursor.close()
        conn.close()

        return {
            "status": "success",
            "filename": file.filename,
            "data": ai_data
        }

    except Exception as e:
        import traceback
        print("--- ERREUR DETAILLES ---")
        traceback.print_exc()
        print(f"--- MESSAGE : {str(e)} ---")
        raise HTTPException(status_code=500, detail=str(e))
