import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JavnaNabavka } from '../models/javnaNabavka';
import { API } from './api';

@Injectable({
  providedIn: 'root',
})
export class NabavkeServis {

  private http = inject(HttpClient);

  url = `${API}/nabavke`;

  raspisiNabavku(klijent: string, stavke: any[]) {
    const data = { klijent: klijent, stavke: stavke }
    return this.http.post(`${this.url}/raspisiNabavku`, data, { responseType: 'text' as 'json' })
  }

  posaljiPonudu(id_nabavke: number, stampar: string, stavke: any[]) {
    const data = { id_nabavke: id_nabavke, stampar: stampar, stavke: stavke }
    return this.http.post(`${this.url}/posaljiPonudu`, data, { responseType: 'text' as 'json' })
  }

  dohvatiOtvorene() {
    return this.http.get<JavnaNabavka[]>(`${this.url}/dohvatiOtvorene`)
  }

  dohvatiNabavkeKlijenta(kor_ime: string) {
    return this.http.get<JavnaNabavka[]>(`${this.url}/dohvatiNabavkeKlijenta/${kor_ime}`)
  }

  putanjaIzvestaja(id_nabavke: number) {
    return `${this.url}/izvestaj/${id_nabavke}`
  }
}
