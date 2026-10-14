import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Korisnik } from '../models/korisnik';

@Component({
  selector: 'app-zaglavlje',
  imports: [],
  templateUrl: './zaglavlje.html',
  styleUrl: './zaglavlje.css',
})
export class Zaglavlje {
  private ruter = inject(Router);

  korisnik: Korisnik = new Korisnik();
  prijavljen = false;

  ngOnInit(): void {
    this.ucitaj();
    this.ruter.events.subscribe(dogadjaj => {
      if (dogadjaj instanceof NavigationEnd) {
        this.ucitaj();
      }
    })
  }

  ucitaj() {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.prijavljen = false;
      this.korisnik = new Korisnik();
      return;
    }
    this.korisnik = JSON.parse(sacuvan);
    this.prijavljen = true;
  }

  uloga() {
    if (this.korisnik.tip == "klijent_fizicko") {
      return "klijent - fizičko lice";
    }
    if (this.korisnik.tip == "klijent_pravno") {
      return "klijent - pravno lice";
    }
    if (this.korisnik.tip == "stampar") {
      return "štamparija";
    }
    if (this.korisnik.tip == "admin") {
      return "administrator";
    }
    return "";
  }

  pocetna() {
    if (this.korisnik.tip == "klijent_fizicko" || this.korisnik.tip == "klijent_pravno") {
      this.ruter.navigate(["/klijent"]);
      return;
    }
    if (this.korisnik.tip == "stampar") {
      this.ruter.navigate(["/stampar"]);
      return;
    }
    if (this.korisnik.tip == "admin") {
      this.ruter.navigate(["/administrator"]);
      return;
    }
    this.ruter.navigate([""]);
  }

  registracija() {
    this.ruter.navigate(["/registracija"]);
  }

  odjava() {
    localStorage.removeItem("korisnik");
    this.ucitaj();
    this.ruter.navigate([""]);
  }

}
