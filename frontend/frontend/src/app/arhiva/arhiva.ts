import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FaktureServis } from '../services/fakture.servis';
import { ProizvodiServis } from '../services/proizvodi.servis';

@Component({
  selector: 'app-arhiva',
  imports: [FormsModule, RouterLink],
  templateUrl: './arhiva.html',
  styleUrl: './arhiva.css',
})
export class Arhiva {
  private ruter = inject(Router);
  private faktureServis = inject(FaktureServis);
  private proizvodiServis = inject(ProizvodiServis);

  kor_ime = "";
  tip = "";

  arhiva: any[] = [];
  noviKomentari: any = {};
  porukaArhiva = "";
  porukaArhivaUspeh = "";
  sortiranoArhiva = "datum";
  rastuceArhiva = false;

  nazivStatusa(status: string) {
    const nazivi: any = {
      "naruceno": "naručeno", "placeno": "plaćeno", "u stampi": "u štampi", "isporuceno": "isporučeno", "primljeno": "primljeno",
      "otvorena": "otvorena", "zakljucena": "zaključena", "na cekanju": "na čekanju", "odobren": "odobren", "odbijen": "odbijen"
    };
    return nazivi[status] ? nazivi[status] : status;
  }

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

    this.faktureServis.dohvatiArhivu(prijavljen.kor_ime).subscribe(podaci => {
      this.arhiva = podaci;
      this.noviKomentari = {};
      this.sortiranoArhiva = "datum";
      this.rastuceArhiva = false;
    })
  }

  kljuc(red: any) {
    return red.id_fakture + "_" + red.id_stavke;
  }

  formatDatum(d: any) {
    return new Date(d).toLocaleDateString("sr-RS");
  }

  sortirajArhivu(kolona: string) {
    if (this.sortiranoArhiva == kolona) {
      this.rastuceArhiva = !this.rastuceArhiva;
    }
    else {
      this.sortiranoArhiva = kolona;
      this.rastuceArhiva = true;
    }
    this.arhiva.sort((a, b) => {
      let rezultat = 0;
      if (kolona == "naziv") {
        rezultat = String(a.naziv).localeCompare(String(b.naziv));
      }
      else if (kolona == "kolicina") {
        rezultat = Number(a.kolicina) - Number(b.kolicina);
      }
      else if (kolona == "datum") {
        rezultat = new Date(a.datum).getTime() - new Date(b.datum).getTime();
      }
      else {
        rezultat = String(a.naziv_stamparije).localeCompare(String(b.naziv_stamparije));
      }
      if (this.rastuceArhiva == true) {
        return rezultat;
      }
      return -rezultat;
    })
  }

  primljenoIzArhive(red: any) {
    this.porukaArhivaUspeh = "";
    this.faktureServis.promeniStatus(red.id_fakture, "primljeno", this.kor_ime).subscribe({
      next: () => {
        this.porukaArhiva = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaArhiva = "Promena statusa nije uspela.";
      }
    })
  }

  oceni(red: any, vrednost: number) {
    this.porukaArhivaUspeh = "";
    if (red.moja_ocena == vrednost) {
      this.porukaArhiva = "Već ste ocenili ovaj proizvod na isti način.";
      return;
    }
    this.proizvodiServis.oceniProizvod(red.sifra, this.kor_ime, vrednost).subscribe({
      next: () => {
        this.porukaArhiva = "";
        this.porukaArhivaUspeh = "Ocena je sačuvana.";
        this.ngOnInit();
      },
      error: () => {
        this.porukaArhiva = "Ocena nije sačuvana.";
      }
    })
  }

  posaljiKomentar(red: any) {
    this.porukaArhivaUspeh = "";
    const tekst = this.noviKomentari[this.kljuc(red)];

    if (tekst == null || String(tekst).trim() == "") {
      this.porukaArhiva = "Komentar ne sme biti prazan.";
      return;
    }

    this.proizvodiServis.dodajKomentar(red.sifra, this.kor_ime, String(tekst)).subscribe({
      next: () => {
        this.porukaArhiva = "";
        this.porukaArhivaUspeh = "Komentar je sačuvan i vidi se na strani sa detaljima proizvoda.";
        this.ngOnInit();
      },
      error: () => {
        this.porukaArhiva = "Komentar nije sačuvan.";
      }
    })
  }

  detalji(red: any) {
    this.ruter.navigate(["proizvod-klijent", red.sifra]);
  }

}
