import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaktureServis } from '../services/fakture.servis';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { KorpaServis } from '../services/korpa.servis';
import { NabavkeServis } from '../services/nabavke.servis';

@Component({
  selector: 'app-korpa',
  imports: [RouterLink],
  templateUrl: './korpa.html',
  styleUrl: './korpa.css',
})
export class Korpa {
  private ruter = inject(Router);
  private faktureServis = inject(FaktureServis);
  private proizvodiServis = inject(ProizvodiServis);
  private korpaServis = inject(KorpaServis);
  private nabavkeServis = inject(NabavkeServis);

  kor_ime = "";
  tip = "";

  grupeKorpe: any[] = [];
  ukupnoKorpa = 0;
  porukaKorpa = "";
  porukaKorpaUspeh = "";

  ngOnInit(): void {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.ruter.navigate([""]);
      return;
    }
    const prijavljen = JSON.parse(sacuvan);
    if (String(prijavljen.tip).startsWith("klijent") == false) {
      this.ruter.navigate([""]);
      return;
    }
    this.kor_ime = prijavljen.kor_ime;
    this.tip = prijavljen.tip;

    this.ucitajKorpu();
  }

  ucitajKorpu() {
    const stavke = this.korpaServis.dohvatiKorpu(this.kor_ime);
    this.grupeKorpe = [];
    this.ukupnoKorpa = 0;
    for (let i = 0; i < stavke.length; i++) {
      let grupa = this.grupeKorpe.find(g => g.stampar == stavke[i].stampar);
      if (grupa == null) {
        grupa = { stampar: stavke[i].stampar, naziv_stamparije: stavke[i].naziv_stamparije, redovi: [], zbir: 0 };
        this.grupeKorpe.push(grupa);
      }
      grupa.redovi.push({ stavka: stavke[i], indeks: i });
      grupa.zbir = grupa.zbir + Number(stavke[i].ukupno);
      this.ukupnoKorpa = this.ukupnoKorpa + Number(stavke[i].ukupno);
    }
  }

  promeniKolicinu(indeks: number, dogadjaj: any) {
    const kolicina = Number(dogadjaj.target.value);
    const stavke = this.korpaServis.dohvatiKorpu(this.kor_ime);
    const stavka = stavke[indeks];
    this.porukaKorpaUspeh = "";

    if (stavka == null) {
      return;
    }
    if (isNaN(kolicina) || kolicina < 1 || Number.isInteger(kolicina) == false) {
      this.porukaKorpa = "Količina mora biti ceo broj, najmanje 1.";
      dogadjaj.target.value = stavka.kolicina;
      this.ucitajKorpu();
      return;
    }

    this.proizvodiServis.dohvatiProizvod(stavka.sifra).subscribe(podaci => {
      if (podaci == null) {
        this.porukaKorpa = "Proizvod više nije dostupan.";
        dogadjaj.target.value = stavka.kolicina;
        this.ucitajKorpu();
        return;
      }

      let uOstalimStavkama = 0;
      for (let i = 0; i < stavke.length; i++) {
        if (i != indeks && stavke[i].sifra == stavka.sifra) {
          uOstalimStavkama = uOstalimStavkama + Number(stavke[i].kolicina);
        }
      }

      if (kolicina + uOstalimStavkama > Number(podaci.kolicina_na_lageru)) {
        this.porukaKorpa = "Nema dovoljno proizvoda trenutno na stanju";
        dogadjaj.target.value = stavka.kolicina;
        this.ucitajKorpu();
        return;
      }

      this.korpaServis.promeniKolicinu(this.kor_ime, indeks, kolicina);
      this.porukaKorpa = "";
      this.ucitajKorpu();
    })
  }

  izbaci(indeks: number) {
    if (confirm("Da li želite da izbacite ovaj proizvod iz korpe?") == false) {
      return;
    }
    this.korpaServis.izbaciIzKorpe(this.kor_ime, indeks);
    this.porukaKorpa = "";
    this.porukaKorpaUspeh = "";
    this.ucitajKorpu();
  }

  potvrdi() {
    const stavke = this.korpaServis.dohvatiKorpu(this.kor_ime);

    if (stavke.length == 0) {
      this.porukaKorpa = "Korpa je prazna.";
      return;
    }

    if (this.tip == "klijent_pravno") {
      const trazeno = stavke.map(s => {
        return { sifra: s.sifra, kolicina: s.kolicina }
      });
      this.nabavkeServis.raspisiNabavku(this.kor_ime, trazeno).subscribe({
        next: () => {
          this.korpaServis.isprazniKorpu(this.kor_ime);
          this.porukaKorpa = "";
          this.porukaKorpaUspeh = "Javna nabavka je raspisana. Štamparije su obaveštene e-mailom, a licitacija traje 10 minuta.";
          this.ngOnInit();
        },
        error: () => {
          this.porukaKorpaUspeh = "";
          this.porukaKorpa = "Raspisivanje javne nabavke nije uspelo.";
        }
      })
      return;
    }

    this.faktureServis.napraviFakture(this.kor_ime, stavke).subscribe({
      next: (podaci) => {
        this.korpaServis.isprazniKorpu(this.kor_ime);
        this.porukaKorpa = "";
        this.ruter.navigate(["placanje"], { queryParams: { fakture: podaci.join(",") } });
      },
      error: () => {
        this.porukaKorpaUspeh = "";
        this.porukaKorpa = "Nema dovoljno proizvoda trenutno na stanju ili su podaci narudžbine neispravni.";
      }
    })
  }

}
