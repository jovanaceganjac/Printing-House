import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from './api';

@Injectable({
  providedIn: 'root',
})
export class KategorijeServis {

  private http = inject(HttpClient);

  url = `${API}/kategorije`;

  dohvatiAktivneKategorije() {
    return this.http.get<string[]>(`${this.url}/dohvatiAktivneKategorije`)
  }

  dohvatiSveKategorije() {
    return this.http.get<any[]>(`${this.url}/dohvatiSveKategorije`)
  }

  dodajKategoriju(naziv: string) {
    const data = { naziv: naziv }
    return this.http.post(`${this.url}/dodajKategoriju`, data, { responseType: 'text' as 'json' })
  }

  dodajPotkategoriju(naziv: string, potkategorija: string) {
    const data = { naziv: naziv, potkategorija: potkategorija }
    return this.http.post(`${this.url}/dodajPotkategoriju`, data, { responseType: 'text' as 'json' })
  }
}
