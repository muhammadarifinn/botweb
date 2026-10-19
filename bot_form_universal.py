"""
Bot pengisi Google Form universal (data dummy).

Alur:
  1. Membaca halaman form -> mengambil daftar pertanyaan, tipe, opsi, dan ID entry.
  2. Membuat data dummy sesuai tipe pertanyaan (dan tebakan dari judul pertanyaan).
  3. Mengirim ke form (hanya jika memakai --kirim).

Instalasi:
    pip install requests faker

Contoh pemakaian:
    # Hanya lihat struktur form + contoh data (tidak mengirim apa pun)
    python bot_form_universal.py "https://docs.google.com/forms/d/e/XXXX/viewform"

    # Kirim 100 data dengan jeda 1-3 detik
    python bot_form_universal.py "https://docs.google.com/forms/d/e/XXXX/viewform" -n 100 --kirim

    # Dengan aturan jawaban sendiri (opsional)
    python bot_form_universal.py URL -n 100 --kirim --aturan aturan.json

Format aturan.json (opsional), kunci = sebagian teks judul pertanyaan:
    {
      "sleeve": {"Pendek": 65, "Panjang": 35},
      "ukuran": ["S", "M", "L", "XL"],
      "umur":   {"min": 17, "max": 25}
    }
    - dict berisi angka  -> bobot peluang tiap opsi
    - list               -> dipilih acak dari daftar itu
    - {"min":..,"max":..} -> angka acak dalam rentang

BATASAN:
  - Form harus publik (tidak mewajibkan login Google, tidak membatasi 1 respons).
  - Pertanyaan upload file tidak bisa diisi lewat cara ini.
  - Logika percabangan (jawaban A -> loncat ke halaman X) tidak diikuti;
    bot mengisi semua pertanyaan.
  - Gunakan hanya pada form milik Anda sendiri atau yang Anda punya izin mengisinya.
"""

import argparse
import json
import random
import re
import sys
import time
from datetime import date, timedelta

import requests
from faker import Faker

fake = Faker("id_ID")

# Kode tipe pertanyaan Google Form (dari data internal form)
T_SHORT, T_PARAGRAPH, T_CHOICE, T_DROPDOWN, T_CHECKBOX = 0, 1, 2, 3, 4
T_SCALE, T_GRID, T_SECTION, T_DATE, T_TIME, T_FILE = 5, 7, 8, 9, 10, 13

NAMA_TIPE = {
    T_SHORT: "Isian singkat", T_PARAGRAPH: "Paragraf", T_CHOICE: "Pilihan ganda",
    T_DROPDOWN: "Dropdown", T_CHECKBOX: "Kotak centang", T_SCALE: "Skala linear",
    T_GRID: "Grid", T_DATE: "Tanggal", T_TIME: "Waktu", T_FILE: "Upload file",
}

HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}


# ----------------------------------------------------------------------------
# 1. MEMBACA FORM
# ----------------------------------------------------------------------------
class Pertanyaan:
    def __init__(self, judul, tipe, entri):
        self.judul = judul
        self.tipe = tipe
        # entri: list of dict {id, opsi, wajib, baris}
        self.entri = entri

    @property
    def wajib(self):
        return any(e["wajib"] for e in self.entri)


def ambil_form(url):
    """Mengunduh form dan mengurai strukturnya."""
    sesi = requests.Session()
    sesi.headers.update(HEADERS)
    r = sesi.get(url, timeout=20, allow_redirects=True)

    if "accounts.google.com" in r.url or "ServiceLogin" in r.url:
        raise SystemExit("Form ini mewajibkan login Google. Bot ini hanya mendukung form publik.")
    if r.status_code != 200:
        raise SystemExit(f"Gagal membuka form (HTTP {r.status_code}). Periksa kembali URL-nya.")

    m = re.search(r"FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\])\s*;\s*</script>", r.text, re.S)
    if not m:
        raise SystemExit("Struktur form tidak ditemukan. Pastikan URL adalah link form (viewform).")
    data = json.loads(m.group(1))

    judul_form = ""
    try:
        judul_form = data[3] or data[1][8] or ""
    except Exception:
        pass

    daftar = []
    jumlah_halaman = 1
    for item in data[1][1]:
        judul = (item[1] or "").strip()
        tipe = item[3]
        if tipe == T_SECTION:
            jumlah_halaman += 1
            continue
        if not item[4]:  # judul/gambar/video: tidak ada input
            continue

        entri = []
        for blok in item[4]:
            opsi = []
            if len(blok) > 1 and blok[1]:
                opsi = [o[0] for o in blok[1] if o and o[0] not in (None, "")]
            baris = blok[3][0] if len(blok) > 3 and blok[3] else None
            entri.append({
                "id": f"entry.{blok[0]}",
                "opsi": opsi,
                "wajib": bool(len(blok) > 2 and blok[2]),
                "baris": baris,
            })
        daftar.append(Pertanyaan(judul, tipe, entri))

    fbzx = re.search(r'name="fbzx"\s+value="([^"]+)"', r.text)
    url_kirim = r.url.split("?")[0]
    url_kirim = re.sub(r"/(viewform|edit|prefill)$", "", url_kirim) + "/formResponse"

    return {
        "judul": judul_form,
        "pertanyaan": daftar,
        "halaman": jumlah_halaman,
        "fbzx": fbzx.group(1) if fbzx else None,
        "url_kirim": url_kirim,
    }


# ----------------------------------------------------------------------------
# 2. MEMBUAT DATA DUMMY
# ----------------------------------------------------------------------------
def buat_hp():
    prefix = random.choice(["0812", "0813", "0821", "0822", "0852", "0857",
                            "0877", "0878", "0895", "0896"])
    return prefix + "".join(random.choices("0123456789", k=random.randint(7, 8)))


def tebak_teks(judul, paragraf=False):
    """Menebak isi dari judul pertanyaan (Bahasa Indonesia & Inggris)."""
    j = judul.lower()
    if re.search(r"e-?mail|surel", j):
        return fake.email()
    if re.search(r"hp|telepon|telpon|phone|whatsapp|\bwa\b|no\.? ?tlp|kontak|nomor ponsel|nomer", j):
        return buat_hp()
    if re.search(r"nama|name", j):
        return fake.name()
    if re.search(r"alamat|address", j):
        return fake.address().replace("\n", ", ")
    if re.search(r"kota|city|kabupaten", j):
        return fake.city()
    if re.search(r"provinsi|province", j):
        return fake.administrative_unit() if hasattr(fake, "administrative_unit") else "DKI Jakarta"
    if re.search(r"kode ?pos|zip", j):
        return fake.postcode()
    if re.search(r"umur|usia|\bage\b", j):
        return str(random.randint(17, 30))
    if re.search(r"jumlah|qty|banyak|how many|number of|quantity|\bcount\b|berapa", j):
        return str(random.randint(1, 5))
    if re.search(r"alergi|allerg|pantangan|dietary|restrict", j):
        return random.choice(["Tidak ada", "Tidak ada", "Tidak ada", "Kacang", "Seafood", "Susu"])
    if re.search(r"nik|ktp", j):
        return "".join(random.choices("0123456789", k=16))
    if re.search(r"nim|npm", j):
        return "".join(random.choices("0123456789", k=10))
    if re.search(r"pekerjaan|profesi|job", j):
        return fake.job()
    if re.search(r"instansi|perusahaan|kampus|universitas|sekolah|company", j):
        return fake.company()
    if re.search(r"link|url|website", j):
        return fake.url()
    return fake.paragraph(nb_sentences=2) if paragraf else fake.word().capitalize()


def pilih_dengan_aturan(aturan, opsi):
    """Memilih satu nilai berdasarkan aturan pengguna."""
    if isinstance(aturan, dict) and {"min", "max"} <= set(aturan):
        return str(random.randint(int(aturan["min"]), int(aturan["max"])))
    if isinstance(aturan, dict):
        kunci = list(aturan.keys())
        return random.choices(kunci, weights=[float(aturan[k]) for k in kunci])[0]
    if isinstance(aturan, list) and aturan:
        return str(random.choice(aturan))
    return random.choice(opsi) if opsi else ""


def cari_aturan(judul, aturan_pengguna):
    j = judul.lower()
    terbaik, panjang = None, -1
    for kunci, nilai in (aturan_pengguna or {}).items():
        if kunci.lower() in j and len(kunci) > panjang:
            terbaik, panjang = nilai, len(kunci)  # kunci terpanjang (paling spesifik) menang
    return terbaik


def tanggal_acak():
    return date.today() - timedelta(days=random.randint(0, 365))


def buat_jawaban(p, aturan_pengguna):
    """Mengembalikan dict {nama_field: nilai} untuk satu pertanyaan."""
    hasil = {}
    aturan = cari_aturan(p.judul, aturan_pengguna)

    for e in p.entri:
        eid, opsi = e["id"], e["opsi"]

        if p.tipe in (T_SHORT, T_PARAGRAPH):
            if aturan is not None:
                hasil[eid] = pilih_dengan_aturan(aturan, [])
            else:
                hasil[eid] = tebak_teks(p.judul, paragraf=(p.tipe == T_PARAGRAPH))

        elif p.tipe in (T_CHOICE, T_DROPDOWN, T_SCALE):
            hasil[eid] = pilih_dengan_aturan(aturan, opsi)

        elif p.tipe == T_CHECKBOX:
            if isinstance(aturan, list) and aturan:
                pool = [str(a) for a in aturan]
            else:
                pool = opsi
            k = random.randint(1, max(1, min(3, len(pool))))
            hasil[eid] = random.sample(pool, k)  # list -> dikirim sebagai beberapa nilai

        elif p.tipe == T_GRID:
            hasil[eid] = random.choice(opsi) if opsi else ""

        elif p.tipe == T_DATE:
            d = tanggal_acak()
            hasil[f"{eid}_year"] = str(d.year)
            hasil[f"{eid}_month"] = str(d.month)
            hasil[f"{eid}_day"] = str(d.day)

        elif p.tipe == T_TIME:
            hasil[f"{eid}_hour"] = str(random.randint(0, 23))
            hasil[f"{eid}_minute"] = str(random.choice([0, 15, 30, 45]))

    return hasil


def buat_satu_respons(form, aturan_pengguna):
    payload = {}
    for p in form["pertanyaan"]:
        if p.tipe == T_FILE:
            continue
        payload.update(buat_jawaban(p, aturan_pengguna))

    # Dibutuhkan agar form multi-halaman diterima
    if form["halaman"] > 1:
        payload["pageHistory"] = ",".join(str(i) for i in range(form["halaman"]))
    if form["fbzx"]:
        payload["fbzx"] = form["fbzx"]
    return payload


# ----------------------------------------------------------------------------
# 3. TAMPILAN & PENGIRIMAN
# ----------------------------------------------------------------------------
def tampilkan_struktur(form):
    print(f"\nForm   : {form['judul'] or '(tanpa judul)'}")
    print(f"Halaman: {form['halaman']}")
    print(f"Kirim ke: {form['url_kirim']}\n")
    print(f"{'No':<3} {'Tipe':<15} {'Wajib':<6} Pertanyaan")
    print("-" * 70)
    for i, p in enumerate(form["pertanyaan"], 1):
        opsi = p.entri[0]["opsi"]
        info = f"  opsi: {', '.join(opsi[:6])}{'...' if len(opsi) > 6 else ''}" if opsi else ""
        print(f"{i:<3} {NAMA_TIPE.get(p.tipe, f'Tipe {p.tipe}'):<15} "
              f"{'ya' if p.wajib else '-':<6} {p.judul[:45]}{info}")
    print()


def ringkas_error(html):
    """Mengambil pesan error dari halaman balasan Google (jika ada)."""
    pesan = re.findall(r'class="[^"]*(?:ErrorMessage|error-message|RHiWt)[^"]*"[^>]*>(.*?)</', html, re.S)
    pesan = [re.sub(r"<[^>]+>", "", p).strip() for p in pesan]
    pesan = [p for p in pesan if p]
    if pesan:
        return " | ".join(dict.fromkeys(pesan))
    teks = re.sub(r"<(script|style).*?</\1>", " ", html, flags=re.S)
    teks = re.sub(r"<[^>]+>", " ", teks)
    return re.sub(r"\s+", " ", teks).strip()[:300]


def kirim(sesi, url, payload, debug=False):
    try:
        r = sesi.post(url, data=payload, timeout=20)
        ok = r.status_code == 200 and "formResponse" in r.url and "closedform" not in r.url
        if debug and not ok:
            print(f"   HTTP {r.status_code} | URL akhir: {r.url[:90]}")
            print(f"   Isi balasan: {ringkas_error(r.text)}")
            print(f"   Data yang dikirim: {json.dumps(payload, ensure_ascii=False)}")
        return ok
    except requests.RequestException as e:
        print(f"   Error jaringan: {e}")
        return False


def main():
    ap = argparse.ArgumentParser(description="Bot pengisi Google Form universal (data dummy)")
    ap.add_argument("url", help="Link Google Form (viewform / forms.gle)")
    ap.add_argument("-n", "--jumlah", type=int, default=5, help="Jumlah respons (default 5)")
    ap.add_argument("--kirim", action="store_true", help="Benar-benar kirim. Tanpa ini hanya simulasi.")
    ap.add_argument("--jeda-min", type=float, default=1.0)
    ap.add_argument("--jeda-max", type=float, default=3.0)
    ap.add_argument("--aturan", help="File JSON berisi aturan jawaban (opsional)")
    ap.add_argument("--debug", action="store_true", help="Tampilkan alasan penolakan dari Google saat gagal")
    args = ap.parse_args()

    aturan_pengguna = {}
    if args.aturan:
        with open(args.aturan, encoding="utf-8") as f:
            aturan_pengguna = json.load(f)

    form = ambil_form(args.url)
    tampilkan_struktur(form)

    # Pertanyaan upload file yang wajib tidak bisa dilewati
    for p in form["pertanyaan"]:
        if p.tipe == T_FILE:
            if p.wajib:
                raise SystemExit(f"Pertanyaan upload '{p.judul}' wajib diisi dan tidak bisa diisi bot ini. "
                                 "Buat salinan form tanpa upload, atau jadikan tidak wajib.")
            print(f"Catatan: pertanyaan upload '{p.judul}' dilewati.\n")

    if not args.kirim:
        print("MODE SIMULASI (tidak ada yang dikirim). Contoh data:\n")
        for i in range(1, min(args.jumlah, 3) + 1):
            print(f"[{i}]", json.dumps(buat_satu_respons(form, aturan_pengguna), ensure_ascii=False))
        print("\nJika sudah sesuai, tambahkan --kirim untuk mengirim.")
        return

    sesi = requests.Session()
    sesi.headers.update(HEADERS)
    berhasil = 0
    for i in range(1, args.jumlah + 1):
        payload = buat_satu_respons(form, aturan_pengguna)
        ok = kirim(sesi, form["url_kirim"], payload, debug=args.debug)
        berhasil += ok
        print(f"[{i}/{args.jumlah}] {'OK   ' if ok else 'GAGAL'} {list(payload.values())[0] if payload else ''}")
        time.sleep(random.uniform(args.jeda_min, args.jeda_max))

    print(f"\nSelesai: {berhasil}/{args.jumlah} berhasil terkirim.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nDihentikan oleh pengguna.")
