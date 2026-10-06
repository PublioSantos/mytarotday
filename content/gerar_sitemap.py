#!/usr/bin/env python3
"""
Gerador de sitemap.xml para mytarot.day

Diferente do site irmão (myzodiac.day), o mytarot.day não tem uma pasta
por idioma com HTML estático: a home é renderizada dinamicamente pelo
server.js (lib/render.js) a partir de views/index.html + data/<locale>.json,
uma URL por idioma (/, /pt/, /es/, ...). Por isso este gerador não faz
crawling de HTML — ele monta a lista de URLs a partir de fontes
conhecidas do próprio projeto:

1. Home + páginas de idioma: uma entrada por arquivo data/<locale>.json
   (exceto cards-structure.json, que não é um idioma), com hreflang
   ligando todas entre si + x-default -> raiz. "en" mora em "/";
   os demais em "/xx/" (mesma regra de lib/render.js:localeHomeHref).
2. Páginas estáticas (só em inglês, sem prefixo de idioma): about.html,
   contact.html, privacy.html, terms.html.
3. Blog (só em inglês): public/blog/index.html + cada public/blog/*.html.

lastmod é a data de modificação do arquivo-fonte mais relevante.

Uso:
    python3 gerar_sitemap.py
"""

import os
import sys
import glob
import datetime
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
VIEWS_DIR = os.path.join(BASE_DIR, "views")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
BLOG_DIR = os.path.join(PUBLIC_DIR, "blog")
OUTPUT_FILE = os.path.join(PUBLIC_DIR, "sitemap.xml")

DOMAIN = "https://mytarot.day"
DEFAULT_LOCALE = "en"
IGNORE_DATA_FILES = {"cards-structure.json"}

STATIC_PAGES = ["about.html", "contact.html", "privacy.html", "terms.html"]

NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"


def locale_codes():
    """Um idioma por data/<code>.json (mesma fonte usada por lib/i18n.js)."""
    codes = []
    for path in sorted(glob.glob(os.path.join(DATA_DIR, "*.json"))):
        name = os.path.basename(path)
        if name in IGNORE_DATA_FILES:
            continue
        codes.append((name[:-5], path))
    return codes


def locale_home_href(code):
    return "/" if code == DEFAULT_LOCALE else f"/{code}/"


def file_mtime(path):
    try:
        return datetime.datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d")
    except OSError:
        return None


def add_url(urlset, loc, lastmod=None, changefreq=None, priority=None, alternates=None):
    url_node = ET.SubElement(urlset, "url")
    loc_node = ET.SubElement(url_node, "loc")
    loc_node.text = loc
    if lastmod:
        ET.SubElement(url_node, "lastmod").text = lastmod
    if changefreq:
        ET.SubElement(url_node, "changefreq").text = changefreq
    if priority:
        ET.SubElement(url_node, "priority").text = priority
    for hreflang, href in alternates or []:
        link = ET.SubElement(url_node, f"{{{XHTML_NS}}}link")
        link.set("rel", "alternate")
        link.set("hreflang", hreflang)
        link.set("href", href)
    return url_node


def generate_sitemap():
    ET.register_namespace("", NS)
    ET.register_namespace("xhtml", XHTML_NS)
    urlset = ET.Element(f"{{{NS}}}urlset")

    view_mtime_path = os.path.join(VIEWS_DIR, "index.html")

    # --- Home + páginas de idioma -------------------------------------------------
    codes = locale_codes()
    alternates = [(code, f"{DOMAIN}{locale_home_href(code)}") for code, _ in codes]
    alternates.append(("x-default", f"{DOMAIN}/"))

    for code, data_path in codes:
        loc = f"{DOMAIN}{locale_home_href(code)}"
        candidates = [m for m in (os.path.getmtime(view_mtime_path), os.path.getmtime(data_path)) if m]
        lastmod = datetime.datetime.fromtimestamp(max(candidates)).strftime("%Y-%m-%d") if candidates else None
        add_url(
            urlset,
            loc,
            lastmod=lastmod,
            changefreq="daily" if code == DEFAULT_LOCALE else "weekly",
            priority="1.0" if code == DEFAULT_LOCALE else "0.9",
            alternates=alternates,
        )
        sys.stdout.write(f"[locale] {loc}\n")

    # --- Páginas estáticas (inglês) -------------------------------------------------
    for name in STATIC_PAGES:
        path = os.path.join(PUBLIC_DIR, name)
        if not os.path.exists(path):
            sys.stdout.write(f"[aviso] pagina estatica ausente: {name}\n")
            continue
        add_url(
            urlset,
            f"{DOMAIN}/{name}",
            lastmod=file_mtime(path),
            changefreq="monthly",
            priority="0.5",
        )
        sys.stdout.write(f"[static] {DOMAIN}/{name}\n")

    # --- Blog (inglês) -------------------------------------------------
    blog_index = os.path.join(BLOG_DIR, "index.html")
    if os.path.exists(blog_index):
        add_url(
            urlset,
            f"{DOMAIN}/blog/",
            lastmod=file_mtime(blog_index),
            changefreq="weekly",
            priority="0.7",
        )
        sys.stdout.write(f"[blog] {DOMAIN}/blog/\n")

        for path in sorted(glob.glob(os.path.join(BLOG_DIR, "*.html"))):
            if os.path.basename(path) == "index.html":
                continue
            slug = os.path.basename(path)
            add_url(
                urlset,
                f"{DOMAIN}/blog/{slug}",
                lastmod=file_mtime(path),
                changefreq="monthly",
                priority="0.6",
            )
            sys.stdout.write(f"[blog] {DOMAIN}/blog/{slug}\n")

    tree = ET.ElementTree(urlset)
    ET.indent(tree, space="  ")
    tree.write(OUTPUT_FILE, encoding="utf-8", xml_declaration=True)
    total = len(list(urlset))
    sys.stdout.write(f"\n[Sucesso] {OUTPUT_FILE} gerado com {total} URLs.\n")


if __name__ == "__main__":
    generate_sitemap()
