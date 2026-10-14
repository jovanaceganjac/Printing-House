import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Korisnik } from '../models/korisnik';
import { API } from './api';

@Injectable({
  providedIn: 'root',
})
export class KorisniciServis {

  private http = inject(HttpClient);

  url = `${API}/korisnici`;

  prijava(kor_ime: string, lozinka: string) {
    const data = { kor_ime: kor_ime, lozinka: lozinka }
    return this.http.post<any>(`${this.url}/prijava`, data)
  }

  brojStamparija() {
    return this.http.get<number>(`${this.url}/brojStamparija`)
  }

  registracija(k: Korisnik) {
    return this.http.post(`${this.url}/registracija`, k, { responseType: 'text' as 'json' })
  }

  zaboravljenaLozinka(kor_ime_ili_email: string) {
    const data = { kor_ime_ili_email: kor_ime_ili_email }
    return this.http.post<any>(`${this.url}/zaboravljenaLozinka`, data)
  }

  postaviNovuLozinku(token: string, lozinka: string) {
    const data = { token: token, lozinka: lozinka }
    return this.http.post(`${this.url}/postaviNovuLozinku`, data, { responseType: 'text' as 'json' })
  }

  upload(slika: File) {
    const podaci = new FormData()
    podaci.append('slika', slika)
    return this.http.post<any>(`${this.url}/upload`, podaci)
  }

  dohvatiKorisnika(kor_ime: string) {
    return this.http.get<Korisnik>(`${this.url}/dohvatiKorisnika/${kor_ime}`)
  }

  azurirajKorisnika(k: any) {
    return this.http.post(`${this.url}/azurirajKorisnika`, k, { responseType: 'text' as 'json' })
  }

  dohvatiNeodobrene() {
    return this.http.get<Korisnik[]>(`${this.url}/dohvatiNeodobrene`)
  }

  odobriKorisnika(kor_ime: string) {
    return this.http.post(`${this.url}/odobriKorisnika/${kor_ime}`, null, { responseType: 'text' as 'json' })
  }

  odbijKorisnika(kor_ime: string) {
    return this.http.post(`${this.url}/odbijKorisnika/${kor_ime}`, null, { responseType: 'text' as 'json' })
  }

  obrisiKorisnika(kor_ime: string) {
    return this.http.post(`${this.url}/obrisiKorisnika/${kor_ime}`, null, { responseType: 'text' as 'json' })
  }

  dohvatiSveKorisnike() {
    return this.http.get<Korisnik[]>(`${this.url}/dohvatiSveKorisnike`)
  }
}
