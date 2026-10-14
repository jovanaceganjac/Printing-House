import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { KategorijeServis } from '../services/kategorije.servis';

@Component({
  selector: 'app-kategorije-proizvoda',
  imports: [FormsModule, RouterLink],
  templateUrl: './kategorije-proizvoda.html',
  styleUrl: './kategorije-proizvoda.css',
})
export class KategorijeProizvoda {
  private ruter = inject(Router);
  private kategorijeServis = inject(KategorijeServis);

  korisnik: Korisnik = new Korisnik();

  kategorije: any[] = [];
  novaKategorija = "";
  izabranaKategorija = "";
  novaPotkategorija = "";
  porukaKategorije = "";
  porukaKategorijeUspeh = "";

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

    this.kategorijeServis.dohvatiSveKategorije().subscribe(podaci => {
      this.kategorije = podaci;
    })
  }

  dodajKategoriju() {
    this.porukaKategorijeUspeh = "";

    if (this.novaKategorija == "") {
      this.porukaKategorije = "Unesite naziv kategorije.";
      return;
    }

    this.kategorijeServis.dodajKategoriju(this.novaKategorija).subscribe({
      next: () => {
        this.novaKategorija = "";
        this.porukaKategorije = "";
        this.porukaKategorijeUspeh = "Kategorija je dodata.";
        this.ngOnInit();
      },
      error: () => {
        this.porukaKategorije = "Kategorija sa tim nazivom već postoji.";
      }
    })
  }

  dodajPotkategoriju() {
    this.porukaKategorijeUspeh = "";

    if (this.izabranaKategorija == "") {
      this.porukaKategorije = "Izaberite kategoriju.";
      return;
    }
    if (this.novaPotkategorija == "") {
      this.porukaKategorije = "Unesite naziv potkategorije.";
      return;
    }

    this.kategorijeServis.dodajPotkategoriju(this.izabranaKategorija, this.novaPotkategorija).subscribe({
      next: () => {
        this.novaPotkategorija = "";
        this.porukaKategorije = "";
        this.porukaKategorijeUspeh = "Potkategorija je dodata.";
        this.ngOnInit();
      },
      error: () => {
        this.porukaKategorije = "Ta potkategorija već postoji u izabranoj kategoriji.";
      }
    })
  }

}
