import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { Faktura } from '../models/faktura';
import { KorisniciServis } from '../services/korisnici.servis';
import { FaktureServis } from '../services/fakture.servis';

@Component({
  selector: 'app-naruceni-proizvodi',
  imports: [RouterLink],
  templateUrl: './naruceni-proizvodi.html',
  styleUrl: './naruceni-proizvodi.css',
})
export class NaruceniProizvodi {
  private ruter = inject(Router);
  private korisniciServis = inject(KorisniciServis);
  private faktureServis = inject(FaktureServis);

  korisnik: Korisnik = new Korisnik();

  fakture: Faktura[] = [];
  porukaFakture = "";

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
    if (prijavljen.tip != "stampar") {
      this.ruter.navigate([""]);
      return;
    }

    this.korisniciServis.dohvatiKorisnika(prijavljen.kor_ime).subscribe(podaci => {
      if (podaci == null) {
        return;
      }
      this.korisnik = podaci;
    })

    this.faktureServis.dohvatiFaktureStampara(prijavljen.kor_ime).subscribe(podaci => {
      this.fakture = podaci;
    })
  }

  numerisaniProizvodi(f: Faktura) {
    return f.stavke.map((s, i) => (i + 1) + ". " + s.naziv + " (" + s.kolicina + ")").join(", ");
  }

  formatDatum(d: any) {
    return new Date(d).toLocaleDateString("sr-RS");
  }

  sledeciStatus(f: Faktura) {
    if (f.status == "placeno") {
      return "u stampi";
    }
    if (f.status == "u stampi") {
      return "isporuceno";
    }
    return "";
  }

  nazivDugmeta(f: Faktura) {
    if (f.status == "placeno") {
      return "Prebaci u štampu";
    }
    if (f.status == "u stampi") {
      return "Isporuči";
    }
    return "";
  }

  pomeriStatus(f: Faktura) {
    const noviStatus = this.sledeciStatus(f);
    if (noviStatus == "") {
      return;
    }
    this.faktureServis.promeniStatus(f.id_fakture, noviStatus, this.korisnik.kor_ime).subscribe({
      next: () => {
        this.porukaFakture = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaFakture = "Promena statusa nije uspela.";
      }
    })
  }

}
