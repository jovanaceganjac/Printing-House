import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Proizvod } from '../models/proizvod';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { API } from '../services/api';

@Component({
  selector: 'app-proizvod-detalji',
  imports: [],
  templateUrl: './proizvod-detalji.html',
  styleUrl: './proizvod-detalji.css',
})
export class ProizvodDetalji {
  private proizvodiServis = inject(ProizvodiServis);
  private ruter = inject(Router);
  private ruta = inject(ActivatedRoute);

  api = API;
  proizvod: Proizvod = new Proizvod();
  glavnaSlika = "";

  sveSlike() {
    return [this.proizvod.slika].concat(this.proizvod.dodatne_slike).filter(s => s != null && s != "");
  }

  poslednjiKomentari() {
    return this.proizvod.komentari.slice(-5).reverse();
  }

  formatDatum(d: any) {
    return new Date(d).toLocaleDateString("sr-RS");
  }

  ngOnInit(): void {
    const sifra = this.ruta.snapshot.paramMap.get("sifra")!;
    this.proizvodiServis.dohvatiProizvod(sifra).subscribe(podaci => {
      if (podaci == null) {
        return;
      }
      this.proizvod = podaci;
      const dozvoljene = this.sveSlike();
      const zapamcena = this.procitajKolacic("glavna_slika_" + sifra);
      if (zapamcena != "" && dozvoljene.indexOf(zapamcena) >= 0) {
        this.glavnaSlika = zapamcena;
      }
      else {
        this.glavnaSlika = dozvoljene.length > 0 ? dozvoljene[0] : "";
      }
    })
  }

  postaviGlavnu(slika: string) {
    this.glavnaSlika = slika;
    this.upisiKolacic("glavna_slika_" + this.proizvod.sifra, slika, 7);
  }

  procitajKolacic(kljuc: string) {
    const delovi = document.cookie.split(";");
    for (let i = 0; i < delovi.length; i++) {
      const deo = delovi[i].trim();
      if (deo.indexOf(kljuc + "=") == 0) {
        return decodeURIComponent(deo.substring(kljuc.length + 1));
      }
    }
    return "";
  }

  upisiKolacic(kljuc: string, vrednost: string, dana: number) {
    const istek = new Date(Date.now() + dana * 24 * 60 * 60 * 1000);
    document.cookie = kljuc + "=" + encodeURIComponent(vrednost) + "; expires=" + istek.toUTCString() + "; path=/";
  }

  nazad() {
    this.ruter.navigate([""]);
  }

}
