import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { KorisniciServis } from '../services/korisnici.servis';
import { API } from '../services/api';

@Component({
  selector: 'app-administrator',
  imports: [FormsModule, RouterLink],
  templateUrl: './administrator.html',
  styleUrl: './administrator.css',
})
export class Administrator {
  private ruter = inject(Router);
  private korisniciServis = inject(KorisniciServis);

  api = API;
  korisnik: Korisnik = new Korisnik();

  zahtevi: Korisnik[] = [];
  porukaKorisnici = "";

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
    if (prijavljen.tip != "admin") {
      this.ruter.navigate([""]);
      return;
    }
    this.korisnik = prijavljen;

    this.korisniciServis.dohvatiNeodobrene().subscribe(podaci => {
      this.zahtevi = podaci;
    })
  }

  nazivTipa(tip: string) {
    const nazivi: any = { "klijent_fizicko": "klijent - fizičko lice", "klijent_pravno": "klijent - pravno lice", "stampar": "štamparija", "admin": "administrator" };
    return nazivi[tip] ? nazivi[tip] : tip;
  }

  odobri(k: Korisnik) {
    this.korisniciServis.odobriKorisnika(k.kor_ime).subscribe({
      next: () => {
        this.porukaKorisnici = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaKorisnici = "Odobravanje naloga nije uspelo.";
      }
    })
  }

  odbij(k: Korisnik) {
    if (confirm(k.status == "odobren" ? "Da li želite da blokirate nalog " + k.kor_ime + "?" : "Da li želite da odbijete zahtev korisnika " + k.kor_ime + "?") == false) {
      return;
    }
    this.korisniciServis.odbijKorisnika(k.kor_ime).subscribe({
      next: () => {
        this.porukaKorisnici = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaKorisnici = "Odbijanje naloga nije uspelo.";
      }
    })
  }

  odjava() {
    localStorage.removeItem("korisnik");
    this.ruter.navigate([""]);
  }

}
