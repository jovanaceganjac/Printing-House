import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { KorisniciServis } from '../services/korisnici.servis';
import { API } from '../services/api';

@Component({
  selector: 'app-stampar',
  imports: [FormsModule, RouterLink],
  templateUrl: './stampar.html',
  styleUrl: './stampar.css',
})
export class Stampar {
  private ruter = inject(Router);
  private korisniciServis = inject(KorisniciServis);

  api = API;
  korisnik: Korisnik = new Korisnik();

  izmena = false;
  izmenaKorisnik: Korisnik = new Korisnik();
  novaLozinka = "";
  izabranaProfilna: File | null = null;
  porukaProfil = "";
  porukaProfilUspeh = "";

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
      this.izmenaKorisnik = JSON.parse(JSON.stringify(podaci));
    })
  }

  pocniIzmenu() {
    this.izmena = true;
    this.izmenaKorisnik = JSON.parse(JSON.stringify(this.korisnik));
    this.novaLozinka = "";
    this.izabranaProfilna = null;
    this.porukaProfil = "";
    this.porukaProfilUspeh = "";
  }

  otkaziIzmenu() {
    this.izmena = false;
    this.porukaProfil = "";
  }

  izaberiProfilnu(dogadjaj: any) {
    if (dogadjaj.target.files.length > 0) {
      this.izabranaProfilna = dogadjaj.target.files[0];
    }
    else {
      this.izabranaProfilna = null;
    }
  }

  sacuvajProfil() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const lozinkaRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[A-Za-z].{7,11}$/;

    this.porukaProfilUspeh = "";

    if (this.izmenaKorisnik.ime == "" || this.izmenaKorisnik.prezime == "" || this.izmenaKorisnik.telefon == "") {
      this.porukaProfil = "Ime, prezime i telefon ne smeju biti prazni.";
      return;
    }
    if (/^\+?[0-9][0-9 \/-]{5,18}[0-9]$/.test(this.izmenaKorisnik.telefon.trim()) == false) {
      this.porukaProfil = "Telefon nije ispravan (npr. 0641234567 ili +381 64 123 4567).";
      return;
    }
    if (emailRegex.test(this.izmenaKorisnik.email) == false) {
      this.porukaProfil = "E-mail adresa nije ispravnog formata.";
      return;
    }
    if (this.izmenaKorisnik.naziv_institucije == "" || this.izmenaKorisnik.adresa_sedista == "" || this.izmenaKorisnik.grad == "") {
      this.porukaProfil = "Naziv institucije, adresa sedišta i grad ne smeju biti prazni.";
      return;
    }
    if (this.novaLozinka != "" && lozinkaRegex.test(this.novaLozinka) == false) {
      this.porukaProfil = "Lozinka mora imati 8 do 12 karaktera, bar jedno veliko slovo, jednu cifru i jedan specijalni karakter, i mora počinjati slovom.";
      return;
    }

    if (this.izabranaProfilna == null) {
      this.porukaProfil = "";
      this.posaljiProfil();
      return;
    }

    const slika = new Image();
    slika.onload = () => {
      if (slika.width < 100 || slika.width > 250 || slika.height < 100 || slika.height > 250) {
        this.porukaProfil = "Profilna slika mora biti između 100x100 i 250x250 piksela.";
        return;
      }
      this.porukaProfil = "";
      this.korisniciServis.upload(this.izabranaProfilna!).subscribe(podaci => {
        if (podaci == null) {
          this.porukaProfil = "Slika mora biti JPG, PNG ili GIF, veličine od 100x100 do 250x250 piksela.";
        }
        else {
          this.izmenaKorisnik.slika = podaci.putanja;
          this.posaljiProfil();
        }
      })
    }
    slika.onerror = () => {
      this.porukaProfil = "Izabrani fajl nije slika.";
    }
    slika.src = URL.createObjectURL(this.izabranaProfilna);
  }

  posaljiProfil() {
    const telo: any = JSON.parse(JSON.stringify(this.izmenaKorisnik));
    telo.lozinka = this.novaLozinka;

    this.korisniciServis.azurirajKorisnika(telo).subscribe({
      next: () => {
        this.korisniciServis.dohvatiKorisnika(this.izmenaKorisnik.kor_ime).subscribe(podaci => {
          localStorage.setItem("korisnik", JSON.stringify(podaci));
          this.izmena = false;
          this.porukaProfil = "";
          this.porukaProfilUspeh = "Podaci su sačuvani.";
          this.ngOnInit();
        })
      },
      error: () => {
        this.porukaProfil = "Izmena nije uspela. Proveri e-mail adresu, možda je već zauzeta.";
      }
    })
  }

  odjava() {
    localStorage.removeItem("korisnik");
    this.ruter.navigate([""]);
  }

}
