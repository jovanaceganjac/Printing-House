import { Injectable } from '@angular/core';
import { StavkaKorpe } from '../models/faktura';

@Injectable({
  providedIn: 'root',
})
export class KorpaServis {

  dohvatiKorpu(kor_ime: string): StavkaKorpe[] {
    const sacuvana = localStorage.getItem("korpa_" + kor_ime);
    if (sacuvana == null) {
      return [];
    }
    return JSON.parse(sacuvana);
  }

  dodajUKorpu(kor_ime: string, stavka: StavkaKorpe) {
    const korpa = this.dohvatiKorpu(kor_ime);
    korpa.push(stavka);
    localStorage.setItem("korpa_" + kor_ime, JSON.stringify(korpa));
  }

  promeniKolicinu(kor_ime: string, indeks: number, kolicina: number) {
    const korpa = this.dohvatiKorpu(kor_ime);
    if (indeks < 0 || indeks >= korpa.length) {
      return;
    }
    korpa[indeks].kolicina = kolicina;
    korpa[indeks].ukupno = Number(korpa[indeks].cena_po_komadu) * kolicina;
    localStorage.setItem("korpa_" + kor_ime, JSON.stringify(korpa));
  }

  izbaciIzKorpe(kor_ime: string, indeks: number) {
    const korpa = this.dohvatiKorpu(kor_ime);
    korpa.splice(indeks, 1);
    localStorage.setItem("korpa_" + kor_ime, JSON.stringify(korpa));
  }

  isprazniKorpu(kor_ime: string) {
    localStorage.removeItem("korpa_" + kor_ime);
  }
}
