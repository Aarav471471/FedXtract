from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3, random
import math
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)



class DCA(BaseModel):
    name: str
    cin: str
    stars: int

class Case(BaseModel):
    client: str
    amount: float
    country: str

conn = sqlite3.connect("data.db", check_same_thread=False)

cur = conn.cursor()

cur.execute("""CREATE TABLE IF NOT EXISTS dcas(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT, cin TEXT UNIQUE, stars INTEGER, score REAL DEFAULT 0)""")

cur.execute("""CREATE TABLE IF NOT EXISTS cases(
 id TEXT PRIMARY KEY, client TEXT, amount REAL,
 country TEXT, dca TEXT, status TEXT, days INTEGER)""")
conn.commit()

cur.execute("""
CREATE TABLE IF NOT EXISTS country_stats(
  country TEXT PRIMARY KEY,
  total_days REAL DEFAULT 0,
  total_cases INTEGER DEFAULT 0,
  tavg REAL DEFAULT 30
)
""")
conn.commit()

STAR_MULTIPLIER = {
    1: 0.6,
    2: 0.8,
    3: 1.0,
    4: 1.2,
    5: 1.5
}



@app.post("/register_dca")
def register_dca(d:DCA):
    try:
        cur.execute("INSERT INTO dcas(name,cin,stars) VALUES(?,?,?)",(d.name,d.cin,d.stars))
        conn.commit()
        return {"message":"DCA Registered"}
    except:
        return {"message":"CIN Exists"}

@app.get("/dcas")
def dcas():
    cur.execute("SELECT name,cin,stars,score FROM dcas")
    return [{"name":a,"cin":b,"stars":c,"score":d} for a,b,c,d in cur.fetchall()]

@app.post("/create_case")
def create_case(c:Case):
    cid="FDX"+str(random.randint(1000,9999))
    cur.execute("INSERT INTO cases VALUES(?,?,?,?,?,?,?)",(cid,c.client,c.amount,c.country,"Unassigned","Pending",0))
    conn.commit()
    return {"case_id":cid}

@app.get("/cases")
def cases():
    cur.execute("SELECT id,client,amount,country,dca,status FROM cases")
    return [{"id":a,"client":b,"amount":c,"country":d,"dca":e,"status":f} for a,b,c,d,e,f in cur.fetchall()]
import pandas as pd
import numpy as np
import math, random

def classify_level(amount):
    if amount < 10_000_000:         # < $10M
        return 1
    elif amount < 50_000_000:       # $10M – $50M
        return 2
    elif amount < 100_000_000:      # $50M – $100M
        return 3
    elif amount < 500_000_000:      # $100M – $500M
        return 4
    else:                           # $500M – $1B+
        return 5

@app.post("/assign_case")
def assign_case():
    # Pick unassigned case
    cur.execute("SELECT id, amount FROM cases WHERE dca='Unassigned' AND status='Pending' LIMIT 1")
    row = cur.fetchone()
    if not row:
        return {"message":"No pending cases"}

    case_id, amount = row
    L = classify_level(amount)

    # Get all DCAs
    cur.execute("""
      SELECT d.name, d.stars, d.score,
      (SELECT COUNT(*) FROM cases WHERE dca=d.name AND status='Assigned')
      FROM dcas d
    """)
    dcas = cur.fetchall()

    # Apply your s >= L-1 gating
    allowed = [d for d in dcas if d[1] >= (L - 1)]
    if not allowed:
        return {"message":"No DCA qualifies for Level L-"+str(L)}

    # Probability ML
    names, weights = [], []
    for name, stars, score, load in allowed:
        raw = (stars * 15) + math.log1p(score) - (load * 6)
        
        w = math.exp(raw / 50)
        names.append(name)
        weights.append(w)

    chosen = random.choices(names, weights=weights, k=1)[0]

    # Assign
    cur.execute("UPDATE cases SET dca=?, status='Assigned' WHERE id=?", (chosen, case_id))
    conn.commit()

    return {
        "case": case_id,
        "level": f"L-{L}",
        "assigned_to": chosen,
        "probability_weights": dict(zip(names, weights))
    }






class Recovery(BaseModel):
    case_id: str
    days: int

@app.post("/recover_case")
def recover_case(r: Recovery):

    # Fetch case
    cur.execute("SELECT dca, amount, country FROM cases WHERE id=?", (r.case_id,))
    row = cur.fetchone()
    if not row:
        return {"message":"Case not found"}

    dca, amount, country = row

    # Fetch or init country stats
    cur.execute("SELECT total_days, total_cases, tavg FROM country_stats WHERE country=?", (country,))
    stat = cur.fetchone()

    if not stat:
        total_days, total_cases, tavg = 0, 0, 30
        cur.execute("INSERT INTO country_stats VALUES(?,?,?,?)",(country,0,0,30))
    else:
        total_days, total_cases, tavg = stat

    # --- YOUR FORMULA ---
    λ = 1.0
    ΔS = amount * math.exp(-λ * (r.days / tavg))

    # Update country learning
    total_days += r.days
    total_cases += 1
    new_tavg = total_days / total_cases

    cur.execute("UPDATE country_stats SET total_days=?, total_cases=?, tavg=? WHERE country=?",
                (total_days, total_cases, new_tavg, country))

    # Update DCA trust learning
    cur.execute("UPDATE dcas SET score = score + ? WHERE name=?", (ΔS, dca))

    # Update case
    cur.execute("UPDATE cases SET status='Recovered', days=? WHERE id=?", (r.days, r.case_id))

    conn.commit()

    return {
        "case": r.case_id,
        "country": country,
        "old_tavg": tavg,
        "new_tavg": new_tavg,
        "deltaS": ΔS
    }


@app.post("/autopay")
def autopay(case_id: str):
    # Fetch case
    cur.execute("SELECT amount, dca FROM cases WHERE id=?", (case_id,))
    row = cur.fetchone()
    if not row:
        return {"message":"Case not found"}

    amount, dca = row

    # Fetch DCA stars
    cur.execute("SELECT stars, score FROM dcas WHERE name=?", (dca,))
    stars, score = cur.fetchone()

    # Star multiplier
    m = STAR_MULTIPLIER.get(stars, 1.0)

    # k constant
    k = 0.15

    # Commission AI formula
    commission = k * score * m

    # Mark case paid
    cur.execute("UPDATE cases SET status='Paid' WHERE id=?", (case_id,))
    conn.commit()

    return {
        "case": case_id,
        "dca": dca,
        # "stars": stars,
        # "multiplier_m": m,
        "commission": commission
    }


@app.get("/leaderboard")
def leaderboard():
    cur.execute("""
      SELECT name, stars, score
      FROM dcas
      ORDER BY score DESC
    """)
    rows = cur.fetchall()

    return [
        {"rank": i+1, "name": r[0], "stars": r[1], "score": round(r[2],2)}
        for i,r in enumerate(rows)
    ]


@app.get("/dashboard_stats")
def dashboard_stats():

    # Total Pending (all not paid)
    cur.execute("SELECT IFNULL(SUM(amount),0) FROM cases WHERE status!='Paid'")
    total_pending = cur.fetchone()[0]

    # Active DCAs
    cur.execute("SELECT COUNT(*) FROM dcas")
    active_dcas = cur.fetchone()[0]

    # Recovered This Month
    cur.execute("""
        SELECT IFNULL(SUM(amount),0)
        FROM cases
        WHERE status='Recovered'
        AND strftime('%Y-%m', date('now')) = strftime('%Y-%m', date('now'))
    """)
    recovered_month = cur.fetchone()[0]

    # Top Performer (highest AI score)
    cur.execute("SELECT name FROM dcas ORDER BY score DESC LIMIT 1")
    row = cur.fetchone()
    top_dca = row[0] if row else "—"

    return {
        "total_pending": round(total_pending,2),
        "active_dcas": active_dcas,
        "recovered_month": round(recovered_month,2),
        "top_dca": top_dca
    }

