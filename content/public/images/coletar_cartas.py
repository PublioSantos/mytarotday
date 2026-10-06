#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera a lista das 78 cartas do Rider-Waite-Smith a partir dos nomes conhecidos
e pesquisa cada uma no Wikimedia Commons, salvando com o nome esperado pelo
projeto (RWS_Tarot_XX_*.jpg, Wands01.jpg, etc.).

ATENÇÃO: como o Wikimedia muda nomes de arquivos, este script usa busca por
nome da carta. Revise visualmente os resultados.
"""
import time, requests
from pathlib import Path

API="https://commons.wikimedia.org/w/api.php"
HEADERS={"User-Agent":"MyTarot.Day/1.0 (+https://mytarot.day)"}
DELAY=3

majors=[
("The Fool","RWS_Tarot_00_Fool.jpg"),("The Magician","RWS_Tarot_01_Magician.jpg"),
("The High Priestess","RWS_Tarot_02_High_Priestess.jpg"),("The Empress","RWS_Tarot_03_Empress.jpg"),
("The Emperor","RWS_Tarot_04_Emperor.jpg"),("The Hierophant","RWS_Tarot_05_Hierophant.jpg"),
("The Lovers","RWS_Tarot_06_Lovers.jpg"),("The Chariot","RWS_Tarot_07_Chariot.jpg"),
("Strength","RWS_Tarot_08_Strength.jpg"),("The Hermit","RWS_Tarot_09_Hermit.jpg"),
("Wheel of Fortune","RWS_Tarot_10_Wheel_of_Fortune.jpg"),("Justice","RWS_Tarot_11_Justice.jpg"),
("The Hanged Man","RWS_Tarot_12_Hanged_Man.jpg"),("Death","RWS_Tarot_13_Death.jpg"),
("Temperance","RWS_Tarot_14_Temperance.jpg"),("The Devil","RWS_Tarot_15_Devil.jpg"),
("The Tower","RWS_Tarot_16_Tower.jpg"),("The Star","RWS_Tarot_17_Star.jpg"),
("The Moon","RWS_Tarot_18_Moon.jpg"),("The Sun","RWS_Tarot_19_Sun.jpg"),
("Judgement","RWS_Tarot_20_Judgement.jpg"),("The World","RWS_Tarot_21_World.jpg")]
ranks=["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"]
suits=[("Wands","Wands"),("Cups","Cups"),("Swords","Swords"),("Pentacles","Pents")]
cards=majors[:]
for suit,prefix in suits:
    for i,r in enumerate(ranks,1):
        cards.append((f"{r} of {suit}",f"{prefix}{i:02d}.jpg"))

s=requests.Session(); s.headers.update(HEADERS)

def pause():
    print(f"Esperando {DELAY}s...")
    time.sleep(DELAY)

for query,out in cards:
    if Path(out).exists():
        print("OK",out); continue
    print("Buscando",query)
    r=s.get(API,params={"action":"query","generator":"search","gsrsearch":f'"{query}" Rider-Waite',
                        "gsrnamespace":6,"gsrlimit":5,"prop":"imageinfo","iiprop":"url","format":"json"})
    pause()
    pages=r.json().get("query",{}).get("pages",{})
    url=None
    for p in sorted(pages.values(),key=lambda x:x["index"]):
        if "imageinfo" in p:
            url=p["imageinfo"][0]["url"]; break
    if not url:
        print("Não encontrada:",query); continue
    img=s.get(url,timeout=120); pause(); img.raise_for_status()
    Path(out).write_bytes(img.content)
    print("Salva",out)
print("Concluído.")
