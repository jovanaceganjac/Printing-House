import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { KorisniciServis } from '../services/korisnici.servis';
import { API } from '../services/api';

@Component({
  selector: 'app-svi-korisnici',
  imports: [FormsModule, RouterLink],
  templateUrl: './svi-korisnici.html',
  styleUrl: './svi-korisnici.css',
})
export class SviKorisnici {
  private ruter = inject(Router);
  private korisniciServis = inject(KorisniciServis);

  api = API;
  korisnik: Korisnik = new Korisnik();

  korisnici: Korisnik[] = [];
  porukaKorisnici = "";

  izmenaKorIme = "";
  izmenaKorisnik: Korisnik = new Korisnik();
  slikaIzmene: File | null = null;

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

    this.korisniciServis.dohvatiSveKorisnike().subscribe(podaci => {
      this.korisnici = podaci;
    })
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

  pocniIzmenu(k: Korisnik) {
    this.izmenaKorIme = k.kor_ime;
    this.izmenaKorisnik = JSON.parse(JSON.stringify(k));
    this.slikaIzmene = null;
    this.porukaKorisnici = "";
  }

  otkaziIzmenu() {
    this.izmenaKorIme = "";
    this.porukaKorisnici = "";
  }

  jeInstitucija(k: Korisnik) {
    return k.tip == "klijent_pravno" || k.tip == "stampar";
  }

  sacuvajIzmenu() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (this.izmenaKorisnik.ime == "" || this.izmenaKorisnik.prezime == "") {
      this.porukaKorisnici = "Ime i prezime ne smeju biti prazni.";
      return;
    }
    if (emailRegex.test(this.izmenaKorisnik.email) == false) {
      this.porukaKorisnici = "E-mail adresa nije ispravnog formata.";
      return;
    }
    if (/^\+?[0-9][0-9 \/-]{5,18}[0-9]$/.test(String(this.izmenaKorisnik.telefon).trim()) == false) {
      this.porukaKorisnici = "Telefon nije ispravan (npr. 0641234567 ili +381 64 123 4567).";
      return;
    }
    if (this.jeInstitucija(this.izmenaKorisnik) && (this.izmenaKorisnik.naziv_institucije == "" || this.izmenaKorisnik.adresa_sedista == "" || this.izmenaKorisnik.grad == "")) {
      this.porukaKorisnici = "Naziv institucije, adresa i grad ne smeju biti prazni.";
      return;
    }

    if (this.slikaIzmene == null) {
      this.posaljiIzmenu();
      return;
    }

    const slika = new Image();
    slika.onload = () => {
      if (slika.width < 100 || slika.width > 250 || slika.height < 100 || slika.height > 250) {
        this.porukaKorisnici = "Profilna slika mora biti između 100x100 i 250x250 piksela.";
        return;
      }
      this.korisniciServis.upload(this.slikaIzmene!).subscribe(podaci => {
        if (podaci == null) {
          this.porukaKorisnici = "Slika mora biti JPG, PNG ili GIF, veličine od 100x100 do 250x250 piksela.";
          return;
        }
        this.izmenaKorisnik.slika = podaci.putanja;
        this.posaljiIzmenu();
      })
    }
    slika.onerror = () => {
      this.porukaKorisnici = "Izabrani fajl nije slika.";
    }
    slika.src = URL.createObjectURL(this.slikaIzmene);
  }

  izaberiSlikuIzmene(dogadjaj: any) {
    this.slikaIzmene = dogadjaj.target.files.length > 0 ? dogadjaj.target.files[0] : null;
  }

  posaljiIzmenu() {
    const telo: any = JSON.parse(JSON.stringify(this.izmenaKorisnik));
    telo.lozinka = "";

    this.korisniciServis.azurirajKorisnika(telo).subscribe({
      next: () => {
        this.izmenaKorIme = "";
        this.slikaIzmene = null;
        this.porukaKorisnici = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaKorisnici = "Izmena nije uspela. Proverite telefon, e-mail (možda je zauzet) i podatke institucije.";
      }
    })
  }

  nazivTipa(tip: string) {
    const nazivi: any = { "klijent_fizicko": "klijent - fizičko lice", "klijent_pravno": "klijent - pravno lice", "stampar": "štamparija", "admin": "administrator" };
    return nazivi[tip] ? nazivi[tip] : tip;
  }

  obrisi(k: Korisnik) {
    if (confirm("Da li ste sigurni da želite da trajno obrišete nalog " + k.kor_ime + "?") == false) {
      return;
    }
    this.korisniciServis.obrisiKorisnika(k.kor_ime).subscribe({
      next: () => {
        this.porukaKorisnici = "";
        this.ngOnInit();
      },
      error: () => {
        this.porukaKorisnici = "Brisanje naloga nije uspelo.";
      }
    })
  }

}
