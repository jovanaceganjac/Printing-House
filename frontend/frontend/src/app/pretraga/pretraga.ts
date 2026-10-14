import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Proizvod } from '../models/proizvod';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { KategorijeServis } from '../services/kategorije.servis';

@Component({
  selector: 'app-pretraga',
  imports: [FormsModule, RouterLink],
  templateUrl: './pretraga.html',
  styleUrl: './pretraga.css',
})
export class Pretraga {
  private ruter = inject(Router);
  private proizvodiServis = inject(ProizvodiServis);
  private kategorijeServis = inject(KategorijeServis);

  kor_ime = "";
  tip = "";

  kategorije: string[] = [];
  naziv = "";
  kategorija = "Sve kategorije";
  rezultati: Proizvod[] = [];
  pretragaIzvrsena = false;
  sortiranoPretraga = false;
  rastucePretraga = true;

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

    this.kategorijeServis.dohvatiAktivneKategorije().subscribe(podaci => {
      this.kategorije = podaci;
    })
  }

  pretrazi() {
    this.proizvodiServis.pretraziProizvode(this.naziv, this.kategorija).subscribe(podaci => {
      this.rezultati = podaci;
      this.pretragaIzvrsena = true;
      this.sortiranoPretraga = false;
      this.rastucePretraga = true;
    })
  }

  sortirajPoNazivu() {
    if (this.sortiranoPretraga == true) {
      this.rastucePretraga = !this.rastucePretraga;
    }
    this.sortiranoPretraga = true;
    this.rezultati.sort((a, b) => {
      if (this.rastucePretraga == true) {
        return a.naziv.localeCompare(b.naziv);
      }
      return b.naziv.localeCompare(a.naziv);
    })
  }

  detalji(p: Proizvod) {
    this.ruter.navigate(["proizvod-klijent", p.sifra]);
  }

}
