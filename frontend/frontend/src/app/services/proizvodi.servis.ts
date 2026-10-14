import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Proizvod } from '../models/proizvod';
import { API } from './api';

@Injectable({
  providedIn: 'root',
})
export class ProizvodiServis {

  private http = inject(HttpClient);

  url = `${API}/proizvodi`;

  dohvatiSveProizvode() {
    return this.http.get<Proizvod[]>(`${this.url}/dohvatiSveProizvode`)
  }

  dohvatiProizvod(sifra: string) {
    return this.http.get<Proizvod>(`${this.url}/dohvatiProizvod/${sifra}`)
  }

  top5Proizvoda() {
    return this.http.get<Proizvod[]>(`${this.url}/top5Proizvoda`)
  }

  pretraziProizvode(naziv: string, kategorija: string) {
    const data = { naziv: naziv, kategorija: kategorija }
    return this.http.post<Proizvod[]>(`${this.url}/pretraziProizvode`, data)
  }

  dohvatiProizvodeStampara(kor_ime: string) {
    return this.http.get<Proizvod[]>(`${this.url}/dohvatiProizvodeStampara/${kor_ime}`)
  }

  dodajProizvod(p: any) {
    return this.http.post(`${this.url}/dodajProizvod`, p, { responseType: 'text' as 'json' })
  }

  azurirajKolicinu(sifra: string, kolicina_na_lageru: number, kor_ime: string) {
    const data = { sifra: sifra, kolicina_na_lageru: kolicina_na_lageru, kor_ime: kor_ime }
    return this.http.post(`${this.url}/azurirajKolicinu`, data, { responseType: 'text' as 'json' })
  }

  obrisiProizvod(sifra: string, kor_ime: string) {
    const data = { kor_ime: kor_ime }
    return this.http.post(`${this.url}/obrisiProizvod/${sifra}`, data, { responseType: 'text' as 'json' })
  }

  oceniProizvod(sifra: string, kor_ime: string, vrednost: number) {
    const data = { sifra: sifra, kor_ime: kor_ime, vrednost: vrednost }
    return this.http.post(`${this.url}/oceniProizvod`, data, { responseType: 'text' as 'json' })
  }

  dodajKomentar(sifra: string, kor_ime: string, tekst: string) {
    const data = { sifra: sifra, kor_ime: kor_ime, tekst: tekst }
    return this.http.post(`${this.url}/dodajKomentar`, data, { responseType: 'text' as 'json' })
  }

  dodajViseProizvoda(kor_ime: string, proizvodi: any[]) {
    const data = { kor_ime: kor_ime, proizvodi: proizvodi }
    return this.http.post<any>(`${this.url}/dodajViseProizvoda`, data)
  }

  azurirajSliku(sifra: string, kor_ime: string, slika: string) {
    const data = { sifra: sifra, kor_ime: kor_ime, slika: slika }
    return this.http.post(`${this.url}/azurirajSliku`, data, { responseType: 'text' as 'json' })
  }

  dodajUslugu(sifra: string, kor_ime: string, usluga: any) {
    const data = {
      sifra: sifra, kor_ime: kor_ime, tip_stampe: usluga.tip_stampe,
      dodatna_cena_po_komadu: usluga.dodatna_cena_po_komadu, max_sirina_mm: usluga.max_sirina_mm, max_visina_mm: usluga.max_visina_mm
    }
    return this.http.post(`${this.url}/dodajUslugu`, data, { responseType: 'text' as 'json' })
  }

  dodajDodatnuSliku(sifra: string, kor_ime: string, slika: string) {
    const data = { sifra: sifra, kor_ime: kor_ime, slika: slika }
    return this.http.post(`${this.url}/dodajDodatnuSliku`, data, { responseType: 'text' as 'json' })
  }

  ukloniDodatnuSliku(sifra: string, kor_ime: string, slika: string) {
    const data = { sifra: sifra, kor_ime: kor_ime, slika: slika }
    return this.http.post(`${this.url}/ukloniDodatnuSliku`, data, { responseType: 'text' as 'json' })
  }

  upload(slika: File) {
    const podaci = new FormData()
    podaci.append('slika', slika)
    return this.http.post<any>(`${this.url}/upload`, podaci)
  }
}
