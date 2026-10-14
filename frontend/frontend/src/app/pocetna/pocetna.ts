import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Proizvod } from '../models/proizvod';
import { KorisniciServis } from '../services/korisnici.servis';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { KategorijeServis } from '../services/kategorije.servis';

@Component({
  selector: 'app-pocetna',
  imports: [FormsModule, RouterLink],
  templateUrl: './pocetna.html',
  styleUrl: './pocetna.css',
})
export class Pocetna {
  private korisniciServis = inject(KorisniciServis);
  private proizvodiServis = inject(ProizvodiServis);
  private kategorijeServis = inject(KategorijeServis);
  private ruter = inject(Router);

  kor_ime = "";
  lozinka = "";

  porukaGreske = "";

  brojStamparija = 0;
  top5: Proizvod[] = [];
  kategorije: string[] = [];

  naziv = "";
  kategorija = "Sve kategorije";
  rezultati: Proizvod[] = [];
  pretragaIzvrsena = false;
  sortirano = false;
  rastuce = true;

  prijavljen() {
    const sacuvan = localStorage.getItem("korisnik");
    return sacuvan == null ? null : JSON.parse(sacuvan);
  }

  ngOnInit(): void {
    this.korisniciServis.brojStamparija().subscribe(podaci => {
      this.brojStamparija = podaci;
    })
    this.proizvodiServis.top5Proizvoda().subscribe(podaci => {
      this.top5 = podaci;
    })
    this.kategorijeServis.dohvatiAktivneKategorije().subscribe(podaci => {
      this.kategorije = podaci;
    })
  }

  pretrazi() {
    this.proizvodiServis.pretraziProizvode(this.naziv, this.kategorija).subscribe(podaci => {
      this.rezultati = podaci;
      this.pretragaIzvrsena = true;
      this.sortirano = false;
      this.rastuce = true;
    })
  }

  sortirajPoNazivu() {
    if (this.sortirano == true) {
      this.rastuce = !this.rastuce;
    }
    this.sortirano = true;
    this.rezultati.sort((a, b) => {
      if (this.rastuce == true) {
        return a.naziv.localeCompare(b.naziv);
      }
      return b.naziv.localeCompare(a.naziv);
    })
  }

  mojaStrana() {
    const korisnik = this.prijavljen();
    if (korisnik.tip == "stampar") {
      this.ruter.navigate(["/stampar"]);
    }
    else if (korisnik.tip == "admin") {
      this.ruter.navigate(["/administrator"]);
    }
    else {
      this.ruter.navigate(["/klijent"]);
    }
  }

  detalji(p: Proizvod) {
    this.ruter.navigate(["proizvod", p.sifra]);
  }

  prijava() {
    if (this.kor_ime == "" || this.lozinka == "") {
      this.porukaGreske = "Unesite korisničko ime i lozinku.";
      return;
    }
    this.korisniciServis.prijava(this.kor_ime, this.lozinka).subscribe(podaci => {
      if (podaci == null) {
        this.porukaGreske = "Pogrešno korisničko ime ili lozinka.";
      }
      else if (podaci.kor_ime == null && podaci.status == "odbijen") {
        this.porukaGreske = "Vaš zahtev za registraciju je odbijen.";
      }
      else if (podaci.kor_ime == null) {
        this.porukaGreske = "Vaš nalog još nije odobren od strane administratora.";
      }
      else if (podaci.tip == "admin") {
        this.porukaGreske = "Pogrešno korisničko ime ili lozinka.";
      }
      else {
        this.porukaGreske = "";
        localStorage.setItem("korisnik", JSON.stringify(podaci));

        if (podaci.tip == "stampar") {
          this.ruter.navigate(["/stampar"]);
        }
        else {
          this.ruter.navigate(["/klijent"]);
        }
      }
    })
  }

}
