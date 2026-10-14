import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Faktura } from '../models/faktura';
import { API } from './api';

@Injectable({
  providedIn: 'root',
})
export class FaktureServis {

  private http = inject(HttpClient);

  url = `${API}/fakture`;

  dohvatiFaktureKlijenta(kor_ime: string) {
    return this.http.get<Faktura[]>(`${this.url}/dohvatiFaktureKlijenta/${kor_ime}`)
  }

  dohvatiFaktureStampara(kor_ime: string) {
    return this.http.get<Faktura[]>(`${this.url}/dohvatiFaktureStampara/${kor_ime}`)
  }

  putanjaPdf(id_fakture: number) {
    return `${this.url}/pdf/${id_fakture}`
  }

  statistikaPromet() {
    return this.http.get<any[]>(`${this.url}/statistika/promet`)
  }

  statistikaNaruceni() {
    return this.http.get<any[]>(`${this.url}/statistika/naruceni`)
  }

  statistikaOcene() {
    return this.http.get<any[]>(`${this.url}/statistika/ocene`)
  }

  dohvatiArhivu(kor_ime: string) {
    return this.http.get<any[]>(`${this.url}/dohvatiArhivu/${kor_ime}`)
  }

  napraviFakture(klijent: string, stavke: any[]) {
    const data = { klijent: klijent, stavke: stavke }
    return this.http.post<number[]>(`${this.url}/napraviFakture`, data)
  }

  platiFakture(klijent: string, fakture: number[], kartica: any) {
    const data = { klijent: klijent, fakture: fakture, kartica: kartica }
    return this.http.post(`${this.url}/platiFakture`, data, { responseType: 'text' as 'json' })
  }

  promeniStatus(id_fakture: number, status: string, kor_ime: string) {
    const data = { id_fakture: id_fakture, status: status, kor_ime: kor_ime }
    return this.http.post(`${this.url}/promeniStatus`, data, { responseType: 'text' as 'json' })
  }

  otkaziFakturu(id_fakture: number, kor_ime: string) {
    const data = { kor_ime: kor_ime }
    return this.http.post(`${this.url}/otkaziFakturu/${id_fakture}`, data, { responseType: 'text' as 'json' })
  }
}
