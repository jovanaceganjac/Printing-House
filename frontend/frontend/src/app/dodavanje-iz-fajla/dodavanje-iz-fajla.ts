import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { KorisniciServis } from '../services/korisnici.servis';
import { ProizvodiServis } from '../services/proizvodi.servis';

@Component({
  selector: 'app-dodavanje-iz-fajla',
  imports: [RouterLink],
  templateUrl: './dodavanje-iz-fajla.html',
  styleUrl: './dodavanje-iz-fajla.css',
})
export class DodavanjeIzFajla {
  private ruter = inject(Router);
  private korisniciServis = inject(KorisniciServis);
  private proizvodiServis = inject(ProizvodiServis);

  korisnik: Korisnik = new Korisnik();

  zaUvoz: any[] = [];
  porukaUvoz = "";
  porukaUvozUspeh = "";
  preskoceni: any[] = [];

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
  }

  izaberiFajl(dogadjaj: any) {
    this.porukaUvoz = "";
    this.porukaUvozUspeh = "";
    this.zaUvoz = [];

    if (dogadjaj.target.files.length == 0) {
      return;
    }

    const citac = new FileReader();
    citac.onload = () => {
      try {
        const sadrzaj = JSON.parse(String(citac.result));
        const lista = sadrzaj.proizvodi ? sadrzaj.proizvodi : sadrzaj;
        if (Array.isArray(lista) == false) {
          this.porukaUvoz = "Fajl nije ispravan JSON.";
          return;
        }
        this.zaUvoz = lista;
      }
      catch (greska) {
        this.porukaUvoz = "Fajl nije ispravan JSON.";
        this.zaUvoz = [];
      }
    }
    citac.onerror = () => {
      this.porukaUvoz = "Fajl nije moguće pročitati.";
    }
    citac.readAsText(dogadjaj.target.files[0]);
  }

  brojUsluga(stavka: any) {
    return stavka.uslugeStampe ? stavka.uslugeStampe.length : 0;
  }

  posaljiUvoz() {
    if (this.zaUvoz.length == 0) {
      this.porukaUvoz = "Nema proizvoda za slanje.";
      return;
    }

    this.proizvodiServis.dodajViseProizvoda(this.korisnik.kor_ime, this.zaUvoz).subscribe({
      next: (podaci) => {
        if (podaci == null) {
          this.porukaUvoz = "Uvoz nije uspeo.";
          return;
        }
        this.porukaUvoz = "";
        this.porukaUvozUspeh = "Ubačeno: " + podaci.ubaceno + ", preskočeno: " + podaci.preskoceno + ".";
        if (podaci.ubaceno > 0) {
          this.porukaUvozUspeh = this.porukaUvozUspeh + " Sledeci korak: dodajte slike uvezenim proizvodima na strani Moji proizvodi (oznaceni su zutom oznakom).";
        }
        this.preskoceni = podaci.preskoceni ? podaci.preskoceni : [];
        localStorage.setItem("uvezene_sifre", JSON.stringify(podaci.sifre ? podaci.sifre : []));
        this.zaUvoz = [];
        this.ngOnInit();
      },
      error: () => {
        this.porukaUvoz = "Uvoz nije uspeo.";
      }
    })
  }

}
