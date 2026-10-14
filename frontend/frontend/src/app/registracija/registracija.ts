import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { KorisniciServis } from '../services/korisnici.servis';

@Component({
  selector: 'app-registracija',
  imports: [FormsModule, RouterLink],
  templateUrl: './registracija.html',
  styleUrl: './registracija.css',
})
export class Registracija {
  private korisniciServis = inject(KorisniciServis);
  private ruter = inject(Router);

  korisnik: Korisnik = new Korisnik();
  potvrdaLozinke = "";
  izabranaSlika: File | null = null;

  porukaGreske = "";
  porukaUspeha = "";

  izaberiSliku(dogadjaj: any) {
    if (dogadjaj.target.files.length > 0) {
      this.izabranaSlika = dogadjaj.target.files[0];
    }
    else {
      this.izabranaSlika = null;
    }
  }

  registruj() {
    const lozinkaRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[A-Za-z].{7,11}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    this.porukaUspeha = "";

    if (this.korisnik.tip == "") {
      this.porukaGreske = "Izaberite tip korisnika.";
      return;
    }
    if (this.korisnik.kor_ime.trim() == "" || this.korisnik.ime.trim() == "" || this.korisnik.prezime.trim() == "" || this.korisnik.telefon.trim() == "" || this.korisnik.email.trim() == "") {
      this.porukaGreske = "Popunite sva osnovna polja.";
      return;
    }
    if (/^[A-Za-z0-9._-]{3,30}$/.test(this.korisnik.kor_ime.trim()) == false) {
      this.porukaGreske = "Korisničko ime mora imati 3 do 30 znakova: slova bez kvačica, cifre, tačka, crta ili donja crta.";
      return;
    }
    if (/^\+?[0-9][0-9 \/-]{5,18}[0-9]$/.test(this.korisnik.telefon.trim()) == false) {
      this.porukaGreske = "Kontakt telefon nije ispravan (npr. 0641234567 ili +381 64 123 4567).";
      return;
    }
    if (emailRegex.test(this.korisnik.email) == false) {
      this.porukaGreske = "E-mail adresa nije ispravnog formata.";
      return;
    }
    if (lozinkaRegex.test(this.korisnik.lozinka) == false) {
      this.porukaGreske = "Lozinka mora imati 8 do 12 karaktera, bar jedno veliko slovo, jednu cifru i jedan specijalni karakter, i mora počinjati slovom.";
      return;
    }
    if (this.korisnik.lozinka != this.potvrdaLozinke) {
      this.porukaGreske = "Lozinka i potvrda lozinke se ne poklapaju.";
      return;
    }
    if (this.korisnik.tip == "klijent_pravno" || this.korisnik.tip == "stampar") {
      if (this.korisnik.naziv_institucije == "" || this.korisnik.adresa_sedista == "" || this.korisnik.grad == "") {
        this.porukaGreske = "Popunite naziv institucije, adresu sedišta i grad.";
        return;
      }
      if (/^[0-9]{8}$/.test(this.korisnik.maticni_broj) == false) {
        this.porukaGreske = "Matični broj mora imati tačno 8 cifara.";
        return;
      }
      if (/^[1-9][0-9]{8}$/.test(this.korisnik.pib) == false) {
        this.porukaGreske = "PIB mora imati 9 cifara i ne sme početi nulom.";
        return;
      }
    }

    if (this.izabranaSlika == null) {
      this.porukaGreske = "";
      this.posalji();
      return;
    }

    const slika = new Image();
    slika.onload = () => {
      if (slika.width < 100 || slika.width > 250 || slika.height < 100 || slika.height > 250) {
        this.porukaGreske = "Profilna slika mora biti između 100x100 i 250x250 piksela.";
        return;
      }
      this.porukaGreske = "";
      this.korisniciServis.upload(this.izabranaSlika!).subscribe(podaci => {
        if (podaci == null) {
          this.porukaGreske = "Slika mora biti JPG, PNG ili GIF, veličine od 100x100 do 250x250 piksela.";
        }
        else {
          this.korisnik.slika = podaci.putanja;
          this.posalji();
        }
      })
    }
    slika.onerror = () => {
      this.porukaGreske = "Izabrani fajl nije slika.";
    }
    slika.src = URL.createObjectURL(this.izabranaSlika);
  }

  posalji() {
    this.korisniciServis.registracija(this.korisnik).subscribe({
      next: () => {
        this.porukaGreske = "";
        this.porukaUspeha = "Zahtev za registraciju je poslat administratoru na odobrenje";
        setTimeout(() => this.ruter.navigate([""]), 2000);
      },
      error: () => {
        this.porukaUspeha = "";
        this.porukaGreske = "Registracija nije uspela. Korisničko ime, e-mail, matični broj ili PIB su već zauzeti.";
      }
    })
  }

}
